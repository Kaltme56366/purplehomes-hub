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

// Map GHL stage IDs to our stage types - USING ACTUAL STAGE IDs FROM YOUR PIPELINE
const stageIdMap: Record<string, AcquisitionStage> = {
  '82b1d31b-4807-44a4-a2e5-aa2fe17a74b0': 'inventory-discussions',
  'aa7fdb9c-425f-4f09-8345-7d999ec65dce': 'property-sourcing',
  '75bf05cb-0f78-48ec-962a-708b8d13a6ab': 'buyer-review',
  '305be21b-3c52-4fae-abdf-23c5477d05a5': 'underwriting-checklist',
  '1e7c6dc4-9a41-47ff-9445-497f1081774c': 'offer-submitted',
  '4377ef1f-a103-42e9-adfa-c7a78d22723a': 'buyer-contract-signed',
  'bc8d6c4b-4da3-4c5d-8aa0-eeb7feed3859': 'qualification-phase',
  '6f3f0a41-3c31-4f33-aa41-47e4d61fdc51': 'closing-scheduled',
  '1caa0fe9-608d-4f55-82f9-d43f35bb5123': 'closed-won',
  '9b88275f-ae74-44f9-85be-f9c8ae78a0c4': 'lost',
};

const stages: { id: AcquisitionStage; label: string; color: string; ghlId: string }[] = [
  { id: 'inventory-discussions', label: 'Inventory Discussions', color: 'bg-blue-500', ghlId: '82b1d31b-4807-44a4-a2e5-aa2fe17a74b0' },
  { id: 'property-sourcing', label: 'Property Sourcing', color: 'bg-cyan-500', ghlId: 'aa7fdb9c-425f-4f09-8345-7d999ec65dce' },
  { id: 'buyer-review', label: 'Buyer Review', color: 'bg-purple-500', ghlId: '75bf05cb-0f78-48ec-962a-708b8d13a6ab' },
  { id: 'underwriting-checklist', label: 'Underwriting / Checklist', color: 'bg-indigo-500', ghlId: '305be21b-3c52-4fae-abdf-23c5477d05a5' },
  { id: 'offer-submitted', label: 'Offer Submitted', color: 'bg-amber-500', ghlId: '1e7c6dc4-9a41-47ff-9445-497f1081774c' },
  { id: 'buyer-contract-signed', label: 'Buyer Contract Signed', color: 'bg-orange-500', ghlId: '4377ef1f-a103-42e9-adfa-c7a78d22723a' },
  { id: 'qualification-phase', label: 'Qualification Phase', color: 'bg-pink-500', ghlId: 'bc8d6c4b-4da3-4c5d-8aa0-eeb7feed3859' },
  { id: 'closing-scheduled', label: 'Closing Scheduled', color: 'bg-teal-500', ghlId: '6f3f0a41-3c31-4f33-aa41-47e4d61fdc51' },
  { id: 'closed-won', label: 'Closed = Won', color: 'bg-green-500', ghlId: '1caa0fe9-608d-4f55-82f9-d43f35bb5123' },
  { id: 'lost', label: 'Lost', color: 'bg-gray-500', ghlId: '9b88275f-ae74-44f9-85be-f9c8ae78a0c4' },
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

  // Map the GHL stage ID directly to our stage
  const stage = stageIdMap[opp.pipelineStageId] || 'inventory-discussions';

  return {
    id: opp.id,
    ghlStageId: opp.pipelineStageId,
    name: opp.contact?.name || opp.name || 'Unknown',
    email: opp.contact?.email || getCustomField('email') || '',
    phone: opp.contact?.phone || getCustomField('phone') || '',
    propertyId: getCustomField('property_id'),
    propertyAddress: getCustomField('property_address') || opp.name,
    offerAmount: opp.monetaryValue || undefined,
    message: getCustomField('message') || getCustomField('notes'),
    stage,
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
    
    const targetStageConfig = stages.find(s => s.id === targetStage);
    if (!targetStageConfig) {
      toast.error('Unable to find target stage');
      setDraggedItem(null);
      return;
    }
    
    try {
      await updateStageMutation.mutateAsync({
        opportunityId: draggedItem.id,
        stageId: targetStageConfig.ghlId,
        pipelineType: 'buyer-acquisition',
      });
      toast.success(`Moved to ${targetStageConfig.label}`);
    } catch (err) {
      toast.error('Failed to update stage in GHL');
    }
    
    setDraggedItem(null);
  };

  const moveToNextStage = async (acquisition: ExtendedBuyerAcquisition) => {
    const currentIndex = stages.findIndex((s) => s.id === acquisition.stage);
    if (currentIndex < stages.length - 2) {
      const nextStage = stages[currentIndex + 1];

      try {
        await updateStageMutation.mutateAsync({
          opportunityId: acquisition.id,
          stageId: nextStage.ghlId,
          pipelineType: 'buyer-acquisition',
        });
        toast.success(`Moved to ${nextStage.label}`);
      } catch (err) {
        toast.error('Failed to update stage in GHL');
      }
    }
  };

  const markAsLost = async (acquisition: ExtendedBuyerAcquisition) => {
    const lostStage = stages.find(s => s.id === 'lost');
    if (!lostStage) return;
    
    try {
      await updateStageMutation.mutateAsync({
        opportunityId: acquisition.id,
        stageId: lostStage.ghlId,
        pipelineType: 'buyer-acquisition',
      });
      toast.success('Marked as Lost');
    } catch (err) {
      toast.error('Failed to update stage in GHL');
    }
  };

  const renderCard = (acquisition: ExtendedBuyerAcquisition) => (
    <OpportunityCard
      id={acquisition.id}
      title={acquisition.name}
      subtitle={acquisition.email}
      location={acquisition.propertyAddress || ''}
      amount={acquisition.offerAmount}
      type="Buyer"
      date={acquisition.createdAt}
      onClick={() => setSelectedAcquisition(acquisition)}
      onMoveNext={() => moveToNextStage(acquisition)}
      variant="buyer"
    />
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
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
            {acquisitions.length} active · {filteredAcquisitions.length} total opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
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