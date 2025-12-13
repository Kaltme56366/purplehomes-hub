import { useState, useMemo } from 'react';
import { Search, Filter, User, Mail, Phone, DollarSign, Building2, Calendar, ArrowRight, LayoutGrid, List, RefreshCw, Loader2, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
import { useOpportunities, useUpdateOpportunityStage, useUpdateOpportunityCustomFields, GHLOpportunity } from '@/services/ghlApi';
import type { BuyerAcquisition, AcquisitionStage, ChecklistItem, BuyerChecklist } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Map GHL stage IDs to our stage types - USING ACTUAL STAGE IDs FROM BUYER ACQUISITION PIPELINE
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

// Default checklist structure - USING REAL GHL CUSTOM FIELDS
const defaultChecklist: BuyerChecklist = {
  bcClosing: [
    { id: 'draft_receipt', label: 'Send them Draft Receipt and E-sign Purchase Agreement', completed: false },
    { id: 'signed_agreement', label: 'Received signed Purchase Agreement', completed: false },
    { id: 'deposit_received', label: 'Deposit Received', completed: false },
    { id: 'open_title', label: 'Open file with title/Send docs', completed: false },
    { id: 'begin_qualification', label: 'If Wrap Buyer, begin Qualification Process', completed: false },
    { id: 'submitted_to_larry', label: 'If Wrap Buyer, submitted all items to Larry', completed: false },
    { id: 'qualification_completed', label: 'If Wrap Buyer, Qualification Completed', completed: false },
    { id: 'servicing_agreement', label: 'Received Servicing Agreement to Buyer', completed: false },
    { id: 'title_clear', label: 'Title clean & clear to close', completed: false },
    { id: 'closing_scheduled', label: 'Closing Scheduled', completed: false },
    { id: 'closing_packet', label: 'Send closing packet to Title', completed: false },
    { id: 'closing_complete', label: 'Closing Complete', completed: false },
  ],
  postClose: [
    { id: 'closing_docs', label: 'Received scanned copy of closing docs from title', completed: false },
    { id: 'buyer_email', label: 'Send buyer email with copy of documents', completed: false },
    { id: 'transmittal_sheet', label: 'Received Transmittal Sheet from Larry', completed: false },
    { id: 'insurance_policy', label: 'Add Buyer to insurance policy', completed: false },
    { id: 'utilities', label: 'Turn off/switch Utilities', completed: false },
  ],
  activeBuyer: [
    { id: 'mls_search', label: 'MLS Search', completed: false },
    { id: 'fb_group_search', label: 'Facebook Group Search', completed: false },
    { id: 'fb_marketplace', label: 'Facebook Marketplace', completed: false },
    { id: 'wholesaler_outreach', label: 'Wholesaler Outreach', completed: false },
    { id: 'agent_outreach', label: 'Agent Outreach', completed: false },
    { id: 'zillow_scrape', label: 'Zillow Scrape', completed: false },
    { id: 'sms_wholesalers', label: 'Send SMS to Wholesalers', completed: false },
    { id: 'send_inventory', label: 'Send Inventory', completed: false },
  ],
};

interface ExtendedBuyerAcquisition extends BuyerAcquisition {
  ghlStageId: string;
  checklist: BuyerChecklist;
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
    name: opp.name || opp.contact?.name || 'Unknown', // Opportunity name first
    email: opp.contact?.email || getCustomField('email') || '',
    phone: opp.contact?.phone || getCustomField('phone') || '',
    propertyId: getCustomField('property_id'),
    propertyAddress: getCustomField('property_address') || '',
    offerAmount: opp.monetaryValue || undefined,
    message: getCustomField('message') || getCustomField('notes'),
    stage,
    checklist: defaultChecklist,
    createdAt: opp.createdAt,
    updatedAt: opp.updatedAt,
  };
};

export default function BuyerAcquisitions() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedAcquisition, setSelectedAcquisition] = useState<ExtendedBuyerAcquisition | null>(null);
  const [draggedItem, setDraggedItem] = useState<ExtendedBuyerAcquisition | null>(null);
  const [localAcquisitions, setLocalAcquisitions] = useState<Record<string, Partial<ExtendedBuyerAcquisition>>>({});
  const [hideEmpty, setHideEmpty] = useState(false);

  // Fetch real data from GHL
  const { data: opportunities, isLoading, isError, refetch } = useOpportunities('buyer-acquisition');
  const updateStageMutation = useUpdateOpportunityStage();
  const updateCustomFieldsMutation = useUpdateOpportunityCustomFields();

  // Transform opportunities to acquisitions and merge with local state
  const acquisitions = useMemo(() => {
    if (!opportunities) return [];
    return opportunities.map(opp => {
      const baseAcquisition = transformToBuyerAcquisition(opp);
      const localUpdates = localAcquisitions[baseAcquisition.id];
      return localUpdates ? { ...baseAcquisition, ...localUpdates } as ExtendedBuyerAcquisition : baseAcquisition;
    });
  }, [opportunities, localAcquisitions]);

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
    if (currentIndex < stages.length - 1) {
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

  const renderChecklistSection = (
    title: string,
    items: ChecklistItem[],
    section: 'bcClosing' | 'postClose' | 'activeBuyer',
    acquisitionId: string
  ) => {
    const displayItems = hideEmpty ? items.filter(item => item.completed) : items;
    const completedCount = items.filter(i => i.completed).length;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">{title}</h4>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{items.length} completed
          </span>
        </div>
        <div className="space-y-2">
          {displayItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <Checkbox
                id={item.id}
                checked={item.completed}
                onCheckedChange={(checked) => 
                  handleUpdateChecklist(acquisitionId, section, item.id, checked as boolean)
                }
              />
              <label
                htmlFor={item.id}
                className={`text-sm cursor-pointer ${
                  item.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}
              >
                {item.label}
              </label>
            </div>
          ))}
          {hideEmpty && displayItems.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No completed items</p>
          )}
        </div>
      </div>
    );
  };

  const handleUpdateChecklist = async (
    acquisitionId: string,
    section: 'bcClosing' | 'postClose' | 'activeBuyer',
    itemId: string,
    completed: boolean
  ) => {
    // Update UI immediately (local state)
    setLocalAcquisitions(prev => {
      const existing = prev[acquisitionId] || {};
      const currentChecklist = existing.checklist || defaultChecklist;
      return {
        ...prev,
        [acquisitionId]: {
          ...existing,
          checklist: {
            ...currentChecklist,
            [section]: currentChecklist[section].map(item =>
              item.id === itemId ? { ...item, completed } : item
            ),
          },
        },
      };
    });
    
    // Update selected acquisition for modal
    setSelectedAcquisition(prev => {
      if (!prev || prev.id !== acquisitionId) return prev;
      return {
        ...prev,
        checklist: {
          ...prev.checklist,
          [section]: prev.checklist[section].map(item =>
            item.id === itemId ? { ...item, completed } : item
          ),
        },
      };
    });

    // Sync to GHL - Map section to GHL custom field name
    const customFieldMap: Record<string, string> = {
      'bcClosing': 'bc_closing_checklist',
      'postClose': 'post_close_actions_checklist',
      'activeBuyer': 'deploy_deal_finder',
    };

    const fieldKey = customFieldMap[section];
    
    try {
      // Get the updated checklist for this section
      const acquisition = acquisitions.find(a => a.id === acquisitionId);
      if (!acquisition) return;

      const updatedSection = acquisition.checklist[section].map(item =>
        item.id === itemId ? { ...item, completed } : item
      );

      // Convert checklist to GHL format (array of completed item labels)
      const completedItems = updatedSection
        .filter(item => item.completed)
        .map(item => item.label);

      // Update in GHL
      await updateCustomFieldsMutation.mutateAsync({
        opportunityId: acquisitionId,
        customFields: {
          [fieldKey]: completedItems,
        },
        pipelineType: 'buyer-acquisition',
      });

      toast.success('Checklist synced to GHL');
    } catch (err) {
      console.error('Failed to sync checklist to GHL:', err);
      toast.error('Failed to sync to GHL');
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
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Buyer Details</DialogTitle>
          </DialogHeader>
          {selectedAcquisition && (
            <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6 pt-4 space-y-6">
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

              <Separator />

              {/* Hide Empty Toggle */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Buyer Closing Checklist</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHideEmpty(!hideEmpty)}
                  className="text-muted-foreground"
                >
                  {hideEmpty ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                  {hideEmpty ? 'Show All' : 'Hide Empty Fields'}
                </Button>
              </div>

              {/* B-C Closing Checklist */}
              {renderChecklistSection('B-C Closing Checklist', selectedAcquisition.checklist.bcClosing, 'bcClosing', selectedAcquisition.id)}

              <Separator />

              {/* Post Close Actions */}
              {renderChecklistSection('Post Close Actions: Checklist', selectedAcquisition.checklist.postClose, 'postClose', selectedAcquisition.id)}

              <Separator />

              {/* Active Buyer Checklist */}
              {renderChecklistSection('Deploy Deal Finder', selectedAcquisition.checklist.activeBuyer, 'activeBuyer', selectedAcquisition.id)}

              <Separator />

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