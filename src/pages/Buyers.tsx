import { useState, useMemo } from 'react';
import { Search, Filter, Users, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { OpportunityCard } from '@/components/kanban/OpportunityCard';
import { BuyerDetailModal } from '@/components/buyers/BuyerDetailModal';
import { EmptyState } from '@/components/ui/empty-state';
import { KanbanBoard, type KanbanColumn } from '@/components/kanban/KanbanBoard';
import { useOpportunities, useUpdateOpportunityStage, GHLOpportunity } from '@/services/ghlApi';
import type { Buyer, BuyerStage, BuyerStatus, BuyerChecklist } from '@/types';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
];

// Map GHL stage IDs to our stage types - CORRECT IDs FROM GHL
const stageIdMap: Record<string, BuyerStage> = {
  '105d21a7-28f9-4a92-891a-e7c038ac6acd': 'under-contract',
  'a74f318d-3f91-4c85-8cbf-17b882251d0f': 'escrow-opened',
  'bd11404a-883a-450a-adc3-0c9ff911373e': 'closing-scheduled',
};

const stages: { id: BuyerStage; label: string; color: string; ghlId: string }[] = [
  { id: 'under-contract', label: 'Under Contract', color: 'bg-amber-500', ghlId: '105d21a7-28f9-4a92-891a-e7c038ac6acd' },
  { id: 'escrow-opened', label: 'Escrow Opened', color: 'bg-blue-500', ghlId: 'a74f318d-3f91-4c85-8cbf-17b882251d0f' },
  { id: 'closing-scheduled', label: 'Closing Scheduled', color: 'bg-green-500', ghlId: 'bd11404a-883a-450a-adc3-0c9ff911373e' },
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

interface ExtendedBuyer extends Buyer {
  ghlStageId: string;
  maxBudget?: number;
}

// Transform GHL Opportunity to Buyer
const transformToBuyer = (opp: GHLOpportunity): ExtendedBuyer => {
  // Get CONTACT custom fields
  const getContactField = (fieldKey: string): string => {
    const field = opp.contact?.customFields?.find(
      (cf) => cf.id === fieldKey || cf.id.toLowerCase().includes(fieldKey.toLowerCase())
    );
    return typeof field?.fieldValue === 'string' ? field.fieldValue : '';
  };

  // Get OPPORTUNITY custom fields
  const getOppField = (fieldKey: string): string => {
    const field = opp.customFields?.find(
      (cf) => cf.id === fieldKey || cf.id.toLowerCase().includes(fieldKey.toLowerCase())
    );
    return typeof field?.fieldValue === 'string' ? field.fieldValue : '';
  };

  // Map the GHL stage ID directly to our stage
  const stage = stageIdMap[opp.pipelineStageId] || 'under-contract';

  // Parse status
  const statusField = getContactField('status')?.toLowerCase() || '';
  let status: BuyerStatus = 'active';
  if (statusField.includes('qualified')) status = 'qualified';
  else if (statusField.includes('pending')) status = 'pending';
  else if (statusField.includes('closed')) status = 'closed';

  // Parse zip codes
  const zipCodesField = getContactField('zip_codes') || getContactField('preferred_zip_codes') || '';
  const zipCodes = zipCodesField.split(',').map(z => z.trim()).filter(Boolean);

  return {
    id: opp.id,
    ghlStageId: opp.pipelineStageId,
    name: opp.name || opp.contact?.name || 'Unknown', // Opportunity name first
    email: opp.contact?.email || getContactField('email') || '',
    phone: opp.contact?.phone || getContactField('phone') || '',
    location: getContactField('location') || getContactField('city') || '',
    preferredZipCodes: zipCodes.length > 0 ? zipCodes : ['00000'],
    preferences: {
      minBeds: parseInt(getContactField('min_beds')) || undefined,
      maxBeds: parseInt(getContactField('max_beds')) || undefined,
      minBaths: parseInt(getContactField('min_baths')) || undefined,
      maxBaths: parseInt(getContactField('max_baths')) || undefined,
      minPrice: parseInt(getContactField('min_price')) || undefined,
      maxPrice: parseInt(getContactField('max_price')) || opp.monetaryValue || undefined,
    },
    matches: {
      internal: parseInt(getContactField('internal_matches')) || 0,
      external: parseInt(getContactField('external_matches')) || 0,
    },
    maxBudget: opp.monetaryValue || parseInt(getContactField('max_price')) || undefined,
    dealType: (getOppField('deal_type') as Buyer['dealType']) || 'Traditional Sale', // Use OPPORTUNITY field
    status,
    stage,
    checklist: defaultChecklist,
    propertiesSent: [],
    sentDealsForReview: getContactField('sent_deals') || '0',
    createdAt: opp.createdAt,
  };
};

export default function Buyers() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedBuyer, setSelectedBuyer] = useState<ExtendedBuyer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [localBuyers, setLocalBuyers] = useState<Record<string, Partial<Buyer>>>({});
  const [draggedItem, setDraggedItem] = useState<ExtendedBuyer | null>(null);

  // Fetch real data from GHL
  const { data: opportunities, isLoading, isError, refetch } = useOpportunities('deal-acquisition');
  const updateStageMutation = useUpdateOpportunityStage();

  // Transform opportunities to buyers and merge with local state
  const buyers = useMemo(() => {
    if (!opportunities) return [];
    return opportunities.map(opp => {
      const baseBuyer = transformToBuyer(opp);
      const localUpdates = localBuyers[baseBuyer.id];
      return localUpdates ? { ...baseBuyer, ...localUpdates } as ExtendedBuyer : baseBuyer;
    });
  }, [opportunities, localBuyers]);

  const filteredBuyers = useMemo(() => {
    return buyers.filter((buyer) => {
      if (statusFilter !== 'all' && buyer.status !== statusFilter) {
        return false;
      }
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          buyer.name.toLowerCase().includes(searchLower) ||
          buyer.email.toLowerCase().includes(searchLower) ||
          buyer.location.toLowerCase().includes(searchLower) ||
          buyer.preferredZipCodes.some(zip => zip.includes(search))
        );
      }
      return true;
    });
  }, [buyers, search, statusFilter]);

  const kanbanColumns: KanbanColumn<ExtendedBuyer>[] = useMemo(() => {
    return stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      color: stage.color,
      items: filteredBuyers.filter((b) => b.stage === stage.id),
    }));
  }, [filteredBuyers]);

  const handleDragStart = (e: React.DragEvent, buyer: ExtendedBuyer) => {
    setDraggedItem(buyer);
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
        pipelineType: 'deal-acquisition',
      });
      toast.success(`Moved to ${targetStageConfig.label}`);
    } catch (err) {
      toast.error('Failed to update stage in GHL');
    }
    
    setDraggedItem(null);
  };

  const handleMoveToNextStage = async (buyer: ExtendedBuyer) => {
    const currentIndex = stages.findIndex((s) => s.id === buyer.stage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];

      try {
        await updateStageMutation.mutateAsync({
          opportunityId: buyer.id,
          stageId: nextStage.ghlId,
          pipelineType: 'deal-acquisition',
        });
        toast.success(`Moved to ${nextStage.label}`);
      } catch (err) {
        toast.error('Failed to update stage in GHL');
      }
    }
  };

  const handleBuyerClick = (buyer: ExtendedBuyer) => {
    setSelectedBuyer(buyer);
    setModalOpen(true);
  };

  const handleUpdateChecklist = (
    buyerId: string,
    section: 'bcClosing' | 'postClose' | 'activeBuyer',
    itemId: string,
    completed: boolean
  ) => {
    setLocalBuyers(prev => {
      const existing = prev[buyerId] || {};
      const currentChecklist = existing.checklist || defaultChecklist;
      return {
        ...prev,
        [buyerId]: {
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
    
    // Update selected buyer for modal
    setSelectedBuyer(prev => {
      if (!prev || prev.id !== buyerId) return prev;
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
  };

  const renderKanbanCard = (buyer: ExtendedBuyer) => (
    <div className="group">
      <OpportunityCard
        id={buyer.id}
        title={buyer.name}
        subtitle={buyer.email || buyer.phone}
        location={buyer.location}
        amount={buyer.maxBudget}
        type={buyer.dealType}
        date={buyer.createdAt}
        onClick={() => handleBuyerClick(buyer)}
        onMoveNext={() => handleMoveToNextStage(buyer)}
        onMarkLost={() => {
          // Mark as closed for buyers pipeline
          toast.info('Mark as closed functionality coming soon');
        }}
        variant="buyer"
      />
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-500';
      case 'qualified': return 'bg-blue-500/20 text-blue-500';
      case 'pending': return 'bg-amber-500/20 text-amber-500';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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
          icon={Users}
          title="Failed to load buyers"
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
          <h1 className="text-2xl font-bold">Buyers Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filteredBuyers.length} qualified buyers
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, zip code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredBuyers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No buyers found"
          description="No buyers match your search criteria, or no data is available from HighLevel."
        />
      ) : (
        <>
          {/* Kanban View */}
          {viewMode === 'kanban' && (
            <KanbanBoard
              columns={kanbanColumns}
              renderCard={renderKanbanCard}
              onDragStart={(e, buyer) => handleDragStart(e, buyer as ExtendedBuyer)}
              onDrop={handleDrop}
              emptyMessage="No buyers in this stage"
              maxVisibleColumns={3}
            />
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Preferences</TableHead>
                    <TableHead>Zip Codes</TableHead>
                    <TableHead>Matches</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBuyers.map((buyer) => {
                    const stage = stages.find((s) => s.id === buyer.stage);
                    return (
                      <TableRow 
                        key={buyer.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleBuyerClick(buyer)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{buyer.name}</p>
                            <p className="text-xs text-muted-foreground">{buyer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${stage?.color} text-white`}>
                            {stage?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(buyer.status)}>
                            {buyer.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {buyer.preferences.minBeds || '?'}-{buyer.preferences.maxBeds || '?'} beds, {buyer.preferences.minBaths || '?'}-{buyer.preferences.maxBaths || '?'} baths
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {buyer.preferredZipCodes.slice(0, 2).map((zip) => (
                              <Badge key={zip} variant="secondary" className="text-xs">
                                {zip}
                              </Badge>
                            ))}
                            {buyer.preferredZipCodes.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{buyer.preferredZipCodes.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-primary font-medium">{buyer.matches.internal}</span>
                          <span className="text-muted-foreground"> / </span>
                          <span className="text-blue-500 font-medium">{buyer.matches.external}</span>
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

      {/* Buyer Detail Modal */}
      <BuyerDetailModal
        buyer={selectedBuyer}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdateChecklist={handleUpdateChecklist}
      />
    </div>
  );
}