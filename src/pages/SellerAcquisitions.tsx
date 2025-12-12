import { useState, useMemo } from 'react';
import { Search, Filter, User, Mail, Phone, DollarSign, Building2, Calendar, ArrowRight, LayoutGrid, List, RefreshCw, AlertCircle } from 'lucide-react';
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
import { KanbanBoard, type KanbanColumn } from '@/components/kanban/KanbanBoard';
import { OpportunityCard } from '@/components/kanban/OpportunityCard';
import { useOpportunities, useUpdateOpportunityStage, GHLOpportunity } from '@/services/ghlApi';
import type { SellerAcquisitionStage } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// GHL stage IDs mapped to our stage keys
const stages: { id: SellerAcquisitionStage; label: string; color: string; ghlStageId?: string }[] = [
  { id: 'new-lead', label: 'New Lead', color: 'bg-blue-500' },
  { id: 'discovery', label: 'Discovery', color: 'bg-cyan-500' },
  { id: 'booked-call', label: 'Booked Call', color: 'bg-purple-500' },
  { id: 'follow-up', label: 'Follow Up', color: 'bg-indigo-500' },
  { id: 'active-conversation', label: 'Active Conversation', color: 'bg-violet-500' },
  { id: 'vetted', label: 'Vetted', color: 'bg-pink-500' },
  { id: 'underwriting', label: 'Underwriting', color: 'bg-rose-500' },
  { id: 'offer-made', label: 'Offer Made', color: 'bg-amber-500' },
  { id: 'offer-follow-up', label: 'Offer Follow Up', color: 'bg-orange-500' },
  { id: 'automated-nurture', label: 'Automated Nurture', color: 'bg-lime-500' },
  { id: 'negotiating', label: 'Negotiating', color: 'bg-teal-500' },
  { id: 'long-term-follow-up', label: 'Long-term Follow Up', color: 'bg-emerald-500' },
  { id: 'cold-nurture', label: 'Cold Nurture', color: 'bg-slate-500' },
  { id: 'closed-acquired', label: 'Closed - Acquired', color: 'bg-green-500' },
  { id: 'lost', label: 'Lost', color: 'bg-gray-500' },
];

// Map GHL stage IDs to our stage keys (will be populated from API response)
const stageIdToKey: Record<string, SellerAcquisitionStage> = {};
const stageKeyToId: Record<SellerAcquisitionStage, string> = {} as Record<SellerAcquisitionStage, string>;

interface SellerAcquisition {
  id: string;
  ghlStageId: string;
  stage: SellerAcquisitionStage;
  sellerName: string;
  propertyAddress: string;
  city: string;
  state: string;
  zipCode: string;
  email?: string;
  phone?: string;
  askingPrice?: number;
  propertyType?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Transform GHL opportunity to SellerAcquisition
const transformToSellerAcquisition = (opp: GHLOpportunity, stageIndex: number): SellerAcquisition => {
  const getCustomField = (fieldKey: string): string => {
    const field = opp.customFields?.find(
      (cf) => cf.id?.includes(fieldKey)
    );
    return typeof field?.fieldValue === 'string' ? field.fieldValue : '';
  };

  // Map stage index to our stage key
  const stageKey = stages[Math.min(stageIndex, stages.length - 1)]?.id || 'new-lead';
  
  return {
    id: opp.id,
    ghlStageId: opp.pipelineStageId,
    stage: stageKey,
    sellerName: opp.name || opp.contact?.name || 'Unknown Seller', // Opportunity name first
    propertyAddress: getCustomField('address') || '',
    city: getCustomField('city') || '',
    state: getCustomField('state') || '',
    zipCode: getCustomField('zip') || '',
    email: opp.contact?.email || getCustomField('email'),
    phone: opp.contact?.phone || getCustomField('phone'),
    askingPrice: opp.monetaryValue || undefined,
    propertyType: getCustomField('property_type'),
    notes: getCustomField('notes'),
    createdAt: opp.createdAt,
    updatedAt: opp.updatedAt,
  };
};

export default function SellerAcquisitions() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedAcquisition, setSelectedAcquisition] = useState<SellerAcquisition | null>(null);
  const [draggedItem, setDraggedItem] = useState<SellerAcquisition | null>(null);

  // Fetch real data from GHL
  const { data: opportunities, isLoading, error, refetch } = useOpportunities('seller-acquisition');
  const updateStageMutation = useUpdateOpportunityStage();

  // Build stage mappings from opportunities
  const stageMapping = useMemo(() => {
    if (!opportunities?.length) return { idToKey: {}, keyToId: {} };
    
    const uniqueStageIds = [...new Set(opportunities.map(o => o.pipelineStageId))];
    const idToKey: Record<string, SellerAcquisitionStage> = {};
    const keyToId: Record<string, string> = {};
    
    uniqueStageIds.forEach((stageId, index) => {
      const stageKey = stages[Math.min(index, stages.length - 1)]?.id || 'new-lead';
      idToKey[stageId] = stageKey;
      keyToId[stageKey] = stageId;
    });
    
    return { idToKey, keyToId };
  }, [opportunities]);

  // Transform opportunities to acquisitions
  const acquisitions = useMemo(() => {
    if (!opportunities) return [];
    
    return opportunities.map(opp => {
      const stageKey = stageMapping.idToKey[opp.pipelineStageId] || 'new-lead';
      const stageIndex = stages.findIndex(s => s.id === stageKey);
      return transformToSellerAcquisition(opp, stageIndex >= 0 ? stageIndex : 0);
    });
  }, [opportunities, stageMapping]);

  const filteredAcquisitions = useMemo(() => {
    if (!search) return acquisitions;
    const searchLower = search.toLowerCase();
    return acquisitions.filter(
      (a) =>
        a.sellerName.toLowerCase().includes(searchLower) ||
        a.propertyAddress.toLowerCase().includes(searchLower) ||
        a.email?.toLowerCase().includes(searchLower)
    );
  }, [acquisitions, search]);

  const kanbanColumns: KanbanColumn<SellerAcquisition>[] = useMemo(() => {
    return stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      color: stage.color,
      items: filteredAcquisitions.filter((a) => a.stage === stage.id),
    }));
  }, [filteredAcquisitions]);

  const handleDragStart = (e: React.DragEvent, acquisition: SellerAcquisition) => {
    setDraggedItem(acquisition);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    const targetStageId = stageMapping.keyToId[targetStage as SellerAcquisitionStage];
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
        pipelineType: 'seller-acquisition',
      });
      toast.success(`Moved to ${stageLabel}`);
    } catch (err) {
      toast.error('Failed to update stage in GHL');
    }
    
    setDraggedItem(null);
  };

  const moveToNextStage = async (acquisition: SellerAcquisition) => {
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
          pipelineType: 'seller-acquisition',
        });
        toast.success(`Moved to ${nextStage.label}`);
      } catch (err) {
        toast.error('Failed to update stage in GHL');
      }
    }
  };

  const markAsLost = async (acquisition: SellerAcquisition) => {
    const lostStage = stages.find(s => s.id === 'lost');
    const lostStageId = stageMapping.keyToId['lost'];
    
    if (!lostStageId) {
      toast.error('Unable to find lost stage');
      return;
    }

    try {
      await updateStageMutation.mutateAsync({
        opportunityId: acquisition.id,
        stageId: lostStageId,
        pipelineType: 'seller-acquisition',
      });
      toast.info('Marked as Lost');
    } catch (err) {
      toast.error('Failed to update stage in GHL');
    }
  };

  const renderCard = (acquisition: SellerAcquisition) => (
    <div className="group">
      <OpportunityCard
        id={acquisition.id}
        title={acquisition.propertyAddress || acquisition.sellerName}
        subtitle={acquisition.sellerName}
        location={`${acquisition.city}${acquisition.state ? `, ${acquisition.state}` : ''} ${acquisition.zipCode}`.trim()}
        amount={acquisition.askingPrice}
        type={acquisition.propertyType}
        date={acquisition.createdAt}
        onClick={() => setSelectedAcquisition(acquisition)}
        onMoveNext={() => moveToNextStage(acquisition)}
        onMarkLost={() => markAsLost(acquisition)}
        variant="seller"
      />
    </div>
  );

  const activeCount = filteredAcquisitions.filter((a) => a.stage !== 'lost' && a.stage !== 'closed-acquired').length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load seller acquisitions</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Seller Acquisitions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isLoading ? 'Loading...' : `${activeCount} active · ${filteredAcquisitions.length} total opportunities`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
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
            placeholder="Search by address, seller, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Kanban View */}
      {!isLoading && viewMode === 'kanban' && (
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
      {!isLoading && viewMode === 'list' && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Asking Price</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAcquisitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No seller acquisitions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAcquisitions.map((acq) => {
                  const stage = stages.find((s) => s.id === acq.stage);
                  return (
                    <TableRow 
                      key={acq.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedAcquisition(acq)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{acq.propertyAddress || 'No address'}</p>
                          <p className="text-xs text-muted-foreground">{acq.city}{acq.state && `, ${acq.state}`}</p>
                        </div>
                      </TableCell>
                      <TableCell>{acq.sellerName}</TableCell>
                      <TableCell>
                        <Badge className={`${stage?.color} text-white`}>
                          {stage?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {acq.askingPrice ? `$${acq.askingPrice.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>{acq.propertyType || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(acq.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedAcquisition} onOpenChange={() => setSelectedAcquisition(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Property Acquisition Details</DialogTitle>
          </DialogHeader>
          {selectedAcquisition && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{selectedAcquisition.propertyAddress || selectedAcquisition.sellerName}</h3>
                <p className="text-muted-foreground">
                  {selectedAcquisition.city}{selectedAcquisition.state && `, ${selectedAcquisition.state}`} {selectedAcquisition.zipCode}
                </p>
                <Badge className={`mt-2 ${stages.find(s => s.id === selectedAcquisition.stage)?.color} text-white`}>
                  {stages.find(s => s.id === selectedAcquisition.stage)?.label}
                </Badge>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Seller</p>
                    <p className="font-medium">{selectedAcquisition.sellerName}</p>
                  </div>
                </div>
                {selectedAcquisition.email && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedAcquisition.email}</p>
                    </div>
                  </div>
                )}
                {selectedAcquisition.phone && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedAcquisition.phone}</p>
                    </div>
                  </div>
                )}
                {selectedAcquisition.askingPrice && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Asking Price</p>
                      <p className="font-medium">${selectedAcquisition.askingPrice.toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {selectedAcquisition.propertyType && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Property Type</p>
                      <p className="font-medium">{selectedAcquisition.propertyType}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Lead Created</p>
                    <p className="font-medium">{format(new Date(selectedAcquisition.createdAt), 'MMMM d, yyyy')}</p>
                  </div>
                </div>
              </div>

              {selectedAcquisition.notes && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedAcquisition.notes}</p>
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