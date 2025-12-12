import { useState, useMemo } from 'react';
import { Search, Filter, User, Mail, Phone, DollarSign, Building2, Calendar, ArrowRight, LayoutGrid, List, RefreshCw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { KanbanBoard, type KanbanColumn } from '@/components/kanban/KanbanBoard';
import { OpportunityCard } from '@/components/kanban/OpportunityCard';
import { useOpportunities, useUpdateOpportunityStage, GHLOpportunity } from '@/services/ghlApi';
import type { BuyerAcquisition, AcquisitionStage } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Map GHL stage IDs to our stage types
const stageIdMap: Record<string, AcquisitionStage> = {
  'inventory-discussions': 'inventory-discussions',
  'property-sourcing': 'property-sourcing',
  'buyer-review': 'buyer-review',
  'underwriting-checklist': 'underwriting-checklist',
  'offer-submitted': 'offer-submitted',
  'buyer-contract-signed': 'buyer-contract-signed',
  'qualification-phase': 'qualification-phase',
  'closing-scheduled': 'closing-scheduled',
  'closed-won': 'closed-won',
  'lost': 'lost',
};

const stages: { id: AcquisitionStage; label: string; color: string }[] = [
  { id: 'inventory-discussions', label: 'Inventory Discussions', color: 'bg-blue-500' },
  { id: 'property-sourcing', label: 'Property Sourcing', color: 'bg-cyan-500' },
  { id: 'buyer-review', label: 'Buyer Review', color: 'bg-purple-500' },
  { id: 'underwriting-checklist', label: 'Underwriting / Checklist', color: 'bg-indigo-500' },
  { id: 'offer-submitted', label: 'Offer Submitted', color: 'bg-amber-500' },
  { id: 'buyer-contract-signed', label: 'Buyer Contract Signed', color: 'bg-orange-500' },
  { id: 'qualification-phase', label: 'Qualification Phase', color: 'bg-pink-500' },
  { id: 'closing-scheduled', label: 'Closing Scheduled', color: 'bg-teal-500' },
  { id: 'closed-won', label: 'Closed = Won', color: 'bg-green-500' },
  { id: 'lost', label: 'Lost', color: 'bg-gray-500' },
];

interface ExtendedBuyerAcquisition extends BuyerAcquisition {
  ghlStageId: string;
}

// Transform GHL Opportunity to BuyerAcquisition
const transformToBuyerAcquisition = (opp: GHLOpportunity): ExtendedBuyerAcquisition => {
  const getCustomField = (fieldKey: string): string => {
    const field = opp.customFields?.find(
      (cf) => cf.id === fieldKey || cf.id.toLowerCase().includes(fieldKey.toLowerCase())
    );
    return typeof field?.fieldValue === 'string' ? field.fieldValue : '';
  };

  // Try to determine stage from pipelineStageId or custom field
  const stageName = getCustomField('stage') || opp.pipelineStageId || '';
  const matchedStage = Object.entries(stageIdMap).find(([key]) => 
    stageName.toLowerCase().includes(key.replace('-', ' ')) ||
    stageName.toLowerCase().includes(key)
  );

  return {
    id: opp.id,
    ghlStageId: opp.pipelineStageId,
    name: opp.name || opp.contact?.name || 'Unknown', // Opportunity name first
    email: opp.contact?.email || getCustomField('email') || '',
    phone: opp.contact?.phone || getCustomField('phone') || '',
    propertyId: getCustomField('property_id'),
    propertyAddress: getCustomField('property_address') || '',
    offerAmount: opp.monetaryValue || undefined,
    message: getCustomField('message') || getCustomField('notes'),
    stage: matchedStage ? matchedStage[1] : 'inventory-discussions',
    createdAt: opp.createdAt,
    updatedAt: opp.updatedAt,
  };
};

export default function BuyerAcquisitions() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedAcquisition, setSelectedAcquisition] = useState<ExtendedBuyerAcquisition | null>(null);
  const [draggedItem, setDraggedItem] = useState<ExtendedBuyerAcquisition | null>(null);

  // Fetch real data from GHL
  const { data: opportunities, isLoading, isError, refetch } = useOpportunities('buyer-acquisition');
  const updateStageMutation = useUpdateOpportunityStage();

  // Build stage mappings from opportunities
  const stageMapping = useMemo(() => {
    if (!opportunities?.length) return { idToKey: {}, keyToId: {} };
    
    const uniqueStageIds = [...new Set(opportunities.map(o => o.pipelineStageId))];
    const idToKey: Record<string, AcquisitionStage> = {};
    const keyToId: Record<string, string> = {};
    
    uniqueStageIds.forEach((stageId, index) => {
      const stageKey = stages[Math.min(index, stages.length - 1)]?.id || 'inventory-discussions';
      idToKey[stageId] = stageKey;
      keyToId[stageKey] = stageId;
    });
    
    return { idToKey, keyToId };
  }, [opportunities]);

  // Transform opportunities to acquisitions
  const acquisitions = useMemo(() => {
    if (!opportunities) return [];
    return opportunities.map(transformToBuyerAcquisition);
  }, [opportunities]);

  const filteredAcquisitions = useMemo(() => {
    if (!search) return acquisitions;
    const searchLower = search.toLowerCase();
    return acquisitions.filter(
      (a) =>
        a.name.toLowerCase().includes(searchLower) ||
        a.email.toLowerCase().includes(searchLower) ||
        a.propertyAddress?.toLowerCase().includes(searchLower)
    );
  }, [acquisitions, search]);

  const kanbanColumns: KanbanColumn<ExtendedBuyerAcquisition>[] = useMemo(() => {
    return stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      color: stage.color,
      items: filteredAcquisitions.filter((a) => a.stage === stage.id),
    }));
  }, [filteredAcquisitions]);

  const handleDragStart = (e: React.DragEvent, acquisition: ExtendedBuyerAcquisition) => {
    setDraggedItem(acquisition);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    const targetStageId = stageMapping.keyToId[targetStage as AcquisitionStage];
    if (!targetStageId) {
      toast.error('Unable to find target stage');
      setDraggedItem(null);
      return;
    }
    
    const stageLabel = stages.find((s) => s.id === targetStage)?.label;
    
    try {
      await updateStageMutation.mutateAsync({
        opportunityId: draggedItem.id,
        stageId: targetStageId,
        pipelineType: 'buyer-acquisition',
      });
      toast.success(`Moved to ${stageLabel}`);
    } catch (err) {
      toast.error('Failed to update stage in GHL');
    }
    
    setDraggedItem(null);
  };

  const moveToNextStage = async (acquisition: ExtendedBuyerAcquisition) => {
    const currentIndex = stages.findIndex((s) => s.id === acquisition.stage);
    if (currentIndex < stages.length - 2) {
      const nextStage = stages[currentIndex + 1];
      const nextStageId = stageMapping.keyToId[nextStage.id];
      
      if (!nextStageId) {
        toast.error('Unable to find next stage');
        return;
      }

      try {
        await updateStageMutation.mutateAsync({
          opportunityId: acquisition.id,
          stageId: nextStageId,
          pipelineType: 'buyer-acquisition',
        });
        toast.success(`Moved to ${nextStage.label}`);
      } catch (err) {
        toast.error('Failed to update stage in GHL');
      }
    }
  };

  const markAsLost = async (acquisition: ExtendedBuyerAcquisition) => {
    const lostStageId = stageMapping.keyToId['lost'];
    
    if (!lostStageId) {
      toast.error('Unable to find lost stage');
      return;
    }

    try {
      await updateStageMutation.mutateAsync({
        opportunityId: acquisition.id,
        stageId: lostStageId,
        pipelineType: 'buyer-acquisition',
      });
      toast.info('Marked as Lost');
    } catch (err) {
      toast.error('Failed to update stage in GHL');
    }
  };

  const renderCard = (acquisition: ExtendedBuyerAcquisition) => (
    <div className="group">
      <OpportunityCard
        id={acquisition.id}
        title={acquisition.name}
        subtitle={acquisition.email}
        location={acquisition.propertyAddress}
        amount={acquisition.offerAmount}
        date={acquisition.createdAt}
        onClick={() => setSelectedAcquisition(acquisition)}
        onMoveNext={() => moveToNextStage(acquisition)}
        onMarkLost={() => markAsLost(acquisition)}
        variant="buyer"
      />
    </div>
  );

  const activeCount = filteredAcquisitions.filter((a) => a.stage !== 'lost' && a.stage !== 'closed-won').length;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <EmptyState
          icon={User}
          title="Failed to load acquisitions"
          description="Could not connect to HighLevel API. Please check your connection settings."
          action={
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Buyer Home Acquisitions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {activeCount} active · {filteredAcquisitions.length} total opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {filteredAcquisitions.length === 0 ? (
        <EmptyState
          icon={User}
          title="No acquisitions found"
          description="No buyer acquisitions match your search criteria."
        />
      ) : (
        <>
          {/* Kanban View */}
          {viewMode === 'kanban' && (
            <KanbanBoard
              columns={kanbanColumns}
              renderCard={renderCard}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              emptyMessage="Drop here"
              maxVisibleColumns={5}
            />
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Offer Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAcquisitions.map((acq) => {
                    const stage = stages.find((s) => s.id === acq.stage);
                    return (
                      <TableRow 
                        key={acq.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedAcquisition(acq)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{acq.name}</p>
                            <p className="text-xs text-muted-foreground">{acq.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{acq.propertyAddress || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`${stage?.color} text-white`}>
                            {stage?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {acq.offerAmount ? `$${acq.offerAmount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(acq.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedAcquisition} onOpenChange={() => setSelectedAcquisition(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buyer Details</DialogTitle>
          </DialogHeader>
          {selectedAcquisition && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedAcquisition.name}</h3>
                  <Badge className={`${stages.find(s => s.id === selectedAcquisition.stage)?.color} text-white`}>
                    {stages.find(s => s.id === selectedAcquisition.stage)?.label}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedAcquisition.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedAcquisition.phone || '-'}</p>
                  </div>
                </div>
                {selectedAcquisition.propertyAddress && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Interested Property</p>
                      <p className="font-medium">{selectedAcquisition.propertyAddress}</p>
                    </div>
                  </div>
                )}
                {selectedAcquisition.offerAmount && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Offer Amount</p>
                      <p className="font-medium">${selectedAcquisition.offerAmount.toLocaleString()}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium">{format(new Date(selectedAcquisition.createdAt), 'MMMM d, yyyy')}</p>
                  </div>
                </div>
              </div>

              {selectedAcquisition.message && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Message</p>
                  <p className="text-sm">{selectedAcquisition.message}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    moveToNextStage(selectedAcquisition);
                    setSelectedAcquisition(null);
                  }}
                  disabled={updateStageMutation.isPending}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Move to Next Stage
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    markAsLost(selectedAcquisition);
                    setSelectedAcquisition(null);
                  }}
                  disabled={updateStageMutation.isPending}
                >
                  Mark as Lost
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}