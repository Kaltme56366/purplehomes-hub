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
import { UnifiedPipelineBoard, UnifiedPipelineCard, type PipelineColumn } from '@/components/pipeline';
import { useOpportunities, useUpdateOpportunityStage, GHLOpportunity } from '@/services/ghlApi';
import type { SellerAcquisitionStage } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// Map GHL stage IDs to our stage types - USING ACTUAL STAGE IDs FROM ACQUISITION SELLER PIPELINE
const stageIdMap: Record<string, SellerAcquisitionStage> = {
  'ae1ddba7-19d2-4ea9-9a33-58fc37b1c5b2': 'new-lead',
  '54bd52e5-5ae1-4391-bf8b-044a9cc936b6': 'discovery',
  '280a212b-5f9f-45ac-b7bb-17aee00ddbd0': 'booked-call',
  '4ce5e7e4-9ad2-4aad-a0c2-9cf29f4a0aa6': 'follow-up',
  '8d7057d2-c941-4187-bdf2-7925a8cafd0a': 'vetted',
  '1e404ae6-2d40-42d1-b006-0cfa89870ae0': 'underwriting',
  'fe60854c-b236-4dd2-8e54-8e0e9bf4b940': 'offer-made',
  'ad6facf4-2a79-49a6-8a9f-ef368874b6d1': 'offer-follow-up',
  '70a1ab3d-b492-441a-ade9-5cd7e99d556a': 'negotiating',
  '941984e3-bc1f-4744-a27b-0ff3d79a3969': 'long-term-follow-up',
  'c62fba13-2975-4fdf-8fa3-ab0de5c5c912': 'cold-nurture',
  'c07610dc-3293-45f7-b8ba-dd1de4426e24': 'lost', // Won / Lost stage
};

// GHL stage IDs mapped to our stage keys
const stages: { id: SellerAcquisitionStage; label: string; color: string; ghlId: string }[] = [
  { id: 'new-lead', label: 'New Lead', color: 'bg-blue-500', ghlId: 'ae1ddba7-19d2-4ea9-9a33-58fc37b1c5b2' },
  { id: 'discovery', label: 'Discovery', color: 'bg-cyan-500', ghlId: '54bd52e5-5ae1-4391-bf8b-044a9cc936b6' },
  { id: 'booked-call', label: 'Booked Call', color: 'bg-purple-500', ghlId: '280a212b-5f9f-45ac-b7bb-17aee00ddbd0' },
  { id: 'follow-up', label: 'Follow Up', color: 'bg-indigo-500', ghlId: '4ce5e7e4-9ad2-4aad-a0c2-9cf29f4a0aa6' },
  { id: 'vetted', label: 'Vetted', color: 'bg-pink-500', ghlId: '8d7057d2-c941-4187-bdf2-7925a8cafd0a' },
  { id: 'underwriting', label: 'Underwriting', color: 'bg-rose-500', ghlId: '1e404ae6-2d40-42d1-b006-0cfa89870ae0' },
  { id: 'offer-made', label: 'Offer Made', color: 'bg-amber-500', ghlId: 'fe60854c-b236-4dd2-8e54-8e0e9bf4b940' },
  { id: 'offer-follow-up', label: 'Offer Follow Up', color: 'bg-orange-500', ghlId: 'ad6facf4-2a79-49a6-8a9f-ef368874b6d1' },
  { id: 'negotiating', label: 'Negotiating', color: 'bg-teal-500', ghlId: '70a1ab3d-b492-441a-ade9-5cd7e99d556a' },
  { id: 'long-term-follow-up', label: 'Follow Up Long Term Nurture', color: 'bg-emerald-500', ghlId: '941984e3-bc1f-4744-a27b-0ff3d79a3969' },
  { id: 'cold-nurture', label: 'Cold Nurture', color: 'bg-slate-500', ghlId: 'c62fba13-2975-4fdf-8fa3-ab0de5c5c912' },
  { id: 'lost', label: 'Won / Lost', color: 'bg-gray-500', ghlId: 'c07610dc-3293-45f7-b8ba-dd1de4426e24' },
];

interface SellerAcquisition {
  id: string;
  ghlStageId: string;
  stage: SellerAcquisitionStage;
  sellerName: string; // Contact name
  contactPhone?: string; // Contact phone
  contactEmail?: string; // Contact email
  propertyAddress: string; // Opportunity name (property)
  city: string;
  state: string;
  zipCode: string;
  askingPrice?: number;
  propertyType?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Transform GHL opportunity to SellerAcquisition
const transformToSellerAcquisition = (opp: GHLOpportunity): SellerAcquisition => {
  const getCustomField = (fieldKey: string): string => {
    const field = opp.customFields?.find(
      (cf) => cf.id?.includes(fieldKey)
    );
    return typeof field?.fieldValue === 'string' ? field.fieldValue : '';
  };

  // Map the GHL stage ID directly to our stage
  const stage = stageIdMap[opp.pipelineStageId] || 'new-lead';

  return {
    id: opp.id,
    ghlStageId: opp.pipelineStageId,
    stage,
    sellerName: opp.contact?.name || 'Unknown Seller', // Contact name
    contactPhone: opp.contact?.phone || getCustomField('phone'),
    contactEmail: opp.contact?.email || getCustomField('email'),
    propertyAddress: opp.name || getCustomField('address') || '', // Opportunity name is the property
    city: getCustomField('city') || '',
    state: getCustomField('state') || '',
    zipCode: getCustomField('zip') || '',
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

  // Fetch real data from GHL
  const { data: opportunities, isLoading, error, refetch } = useOpportunities('seller-acquisition');
  const updateStageMutation = useUpdateOpportunityStage();

  // Build stage mappings from opportunities
  // Transform opportunities to acquisitions
  const acquisitions = useMemo(() => {
    if (!opportunities) return [];
    return opportunities.map(transformToSellerAcquisition);
  }, [opportunities]);

  const filteredAcquisitions = useMemo(() => {
    if (!search) return acquisitions;
    const searchLower = search.toLowerCase();
    return acquisitions.filter(
      (a) =>
        a.sellerName.toLowerCase().includes(searchLower) ||
        a.propertyAddress.toLowerCase().includes(searchLower) ||
        a.contactEmail?.toLowerCase().includes(searchLower) ||
        a.contactPhone?.includes(search)
    );
  }, [acquisitions, search]);

  const pipelineColumns: PipelineColumn<SellerAcquisition>[] = useMemo(() => {
    return stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      color: stage.color.replace('bg-', ''), // Convert 'bg-blue-500' to 'blue-500' for border
      items: filteredAcquisitions.filter((a) => a.stage === stage.id),
      isHidden: stage.id === 'lost',
    }));
  }, [filteredAcquisitions]);

  const moveToNextStage = async (acquisition: SellerAcquisition) => {
    const currentIndex = stages.findIndex((s) => s.id === acquisition.stage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];

      try {
        await updateStageMutation.mutateAsync({
          opportunityId: acquisition.id,
          stageId: nextStage.ghlId,
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
    if (!lostStage) return;
    
    try {
      await updateStageMutation.mutateAsync({
        opportunityId: acquisition.id,
        stageId: lostStage.ghlId,
        pipelineType: 'seller-acquisition',
      });
      toast.success('Marked as Lost');
    } catch (err) {
      toast.error('Failed to update stage in GHL');
    }
  };

  const renderCard = (acquisition: SellerAcquisition) => (
    <UnifiedPipelineCard
      id={acquisition.id}
      title={acquisition.propertyAddress || 'No Address'}
      subtitle={acquisition.sellerName}
      secondarySubtitle={acquisition.contactPhone}
      location={`${acquisition.city}${acquisition.state ? `, ${acquisition.state}` : ''} ${acquisition.zipCode}`.trim()}
      amount={acquisition.askingPrice}
      type={acquisition.propertyType}
      date={acquisition.createdAt}
      dateFormat="absolute"
      onClick={() => setSelectedAcquisition(acquisition)}
      onAdvance={() => moveToNextStage(acquisition)}
      onMarkLost={() => markAsLost(acquisition)}
      variant="property"
      imageFallbackIcon="building"
    />
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
        <UnifiedPipelineBoard
          columns={pipelineColumns}
          renderCard={renderCard}
          onDrop={(item, columnId) => {
            const targetStageConfig = stages.find(s => s.id === columnId);
            if (!targetStageConfig) {
              toast.error('Unable to find target stage');
              return;
            }
            updateStageMutation.mutateAsync({
              opportunityId: item.id,
              stageId: targetStageConfig.ghlId,
              pipelineType: 'seller-acquisition',
            }).then(() => {
              toast.success(`Moved to ${targetStageConfig.label}`);
            }).catch(() => {
              toast.error('Failed to update stage in GHL');
            });
          }}
          isLoading={isLoading}
          hiddenColumnLabel="Won / Lost"
          emptyStateMessage="No opportunities in this stage"
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
                {selectedAcquisition.contactEmail && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedAcquisition.contactEmail}</p>
                    </div>
                  </div>
                )}
                {selectedAcquisition.contactPhone && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedAcquisition.contactPhone}</p>
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