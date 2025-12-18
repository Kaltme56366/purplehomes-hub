import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Loader2, Users, Home, Send, ChevronDown, MapPin, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, CheckCircle, Trash2, Bed, Bath, Square, Building } from 'lucide-react';
import { useBuyersWithMatches, usePropertiesWithMatches, useRunMatching, useRunBuyerMatching, useRunPropertyMatching, useClearMatches } from '@/services/matchingApi';
import { MatchScoreBadge } from '@/components/matching/MatchScoreBadge';
import { MatchTags, extractReasoningSummary } from '@/components/matching/MatchTags';
import { useMatchingData } from '@/hooks/useCache';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { useProperties } from '@/services/ghlApi';
import { sendPropertyEmail } from '@/services/emailService';
import { SELLER_ACQUISITION_PIPELINE_ID } from '@/services/ghlApi';
import type { PropertyDetails } from '@/types/matching';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SortOption = 'matches-high' | 'matches-low' | 'name-az' | 'name-za';

export default function Matching() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'buyers' | 'properties'>('buyers');
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());
  const [sendingSingleProperty, setSendingSingleProperty] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('matches-high');
  const [expandedBuyers, setExpandedBuyers] = useState<Set<string>>(new Set());
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [selectedMatch, setSelectedMatch] = useState<{
    property: PropertyDetails;
    reasoning?: string;
    highlights?: string[];
    concerns?: string[];
    score?: number;
  } | null>(null);

  // Filter state - start with no filters to show all matches
  const [filters, setFilters] = useState({
    matchStatus: undefined as 'Active' | 'Sent' | 'Viewed' | 'Closed' | undefined,
    minScore: 0,
    priorityOnly: false,
    matchLimit: 25,
    dateRange: 'all' as const,
  });

  // Pagination state - track offset tokens for cursor-based pagination
  const [buyersOffset, setBuyersOffset] = useState<string | undefined>(undefined);
  const [propertiesOffset, setPropertiesOffset] = useState<string | undefined>(undefined);
  const [buyersOffsetHistory, setBuyersOffsetHistory] = useState<string[]>([]);
  const [propertiesOffsetHistory, setPropertiesOffsetHistory] = useState<string[]>([]);
  const pageSize = 20;

  // Cache data hook
  const {
    isStale,
    newPropertiesAvailable,
    newBuyersAvailable,
    propertiesCount,
    buyersCount,
    matchesCount,
    lastSynced,
    syncAll,
    isSyncing,
  } = useMatchingData();

  const { data: buyersData, isLoading: loadingBuyers } = useBuyersWithMatches(filters, pageSize, buyersOffset);
  const { data: propertiesData, isLoading: loadingProperties } = usePropertiesWithMatches(filters, pageSize, propertiesOffset);

  const buyers = buyersData?.data;
  const properties = propertiesData?.data;
  const hasNextBuyersPage = !!buyersData?.nextOffset;
  const hasNextPropertiesPage = !!propertiesData?.nextOffset;
  const { data: ghlProperties } = useProperties(SELLER_ACQUISITION_PIPELINE_ID);
  const runMatchingMutation = useRunMatching();
  const runBuyerMatchingMutation = useRunBuyerMatching();
  const runPropertyMatchingMutation = useRunPropertyMatching();
  const clearMatchesMutation = useClearMatches();

  const handleRunMatchingAll = async () => {
    console.log('[Matching UI] handleRunMatchingAll called');
    try {
      const result = await runMatchingMutation.mutateAsync({ minScore: 30, refreshAll: false });
      console.log('[Matching UI] Result:', result);
      toast.success(result.message);
    } catch (error) {
      console.error('[Matching UI] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to run matching');
    }
  };

  const handleRunMatchingBuyers = async () => {
    console.log('[Matching UI] handleRunMatchingBuyers called', { buyerCount: buyers?.length });
    if (!buyers || buyers.length === 0) {
      toast.error('No buyers found');
      return;
    }
    try {
      toast.info(`Matching ${buyers.length} buyers...`);
      for (const buyer of buyers) {
        await runBuyerMatchingMutation.mutateAsync({ contactId: buyer.contactId, minScore: 30 });
      }
      toast.success(`Matched ${buyers.length} buyers successfully`);
    } catch (error) {
      console.error('[Matching UI] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to match buyers');
    }
  };

  const handleRunMatchingProperties = async () => {
    console.log('[Matching UI] handleRunMatchingProperties called', { propertyCount: properties?.length });
    if (!properties || properties.length === 0) {
      toast.error('No properties found');
      return;
    }
    try {
      toast.info(`Matching ${properties.length} properties...`);
      for (const property of properties) {
        await runPropertyMatchingMutation.mutateAsync({ propertyCode: property.propertyCode, minScore: 30 });
      }
      toast.success(`Matched ${properties.length} properties successfully`);
    } catch (error) {
      console.error('[Matching UI] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to match properties');
    }
  };

  const handleClearMatches = async () => {
    if (!confirm('Are you sure you want to delete ALL matches? This will remove all records from the Property-Buyer Matches table. You will need to run matching again to recreate them.')) {
      return;
    }
    console.log('[Matching UI] handleClearMatches called');
    try {
      toast.info('Clearing all matches...');
      const result = await clearMatchesMutation.mutateAsync();
      toast.success(result.message || `Deleted ${result.deletedCount} matches`);
    } catch (error) {
      console.error('[Matching UI] Clear error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to clear matches');
    }
  };

  const handleSendPropertyMatches = async (buyer: any) => {
    if (!buyer.contactId || !buyer.email) {
      toast.error('Buyer contact information is missing');
      return;
    }

    if (!buyer.matches || buyer.matches.length === 0) {
      toast.error('No property matches found for this buyer');
      return;
    }

    setSendingEmails((prev) => new Set(prev).add(buyer.contactId));

    try {
      // Get property IDs from matches (using propertyRecordId from Airtable)
      const matchedPropertyRecordIds = buyer.matches.map((match: any) => match.propertyRecordId);

      // Find corresponding GHL properties using the record IDs
      // Note: We need to map Airtable record IDs to GHL opportunity IDs
      // For now, we'll try to match using property codes if available
      const matchedProperties = ghlProperties?.properties.filter((prop) => {
        // Try to match by opportunity ID or property code
        return matchedPropertyRecordIds.some((recordId: string) => {
          const match = buyer.matches.find((m: any) => m.propertyRecordId === recordId);
          return match && (prop.id === recordId || prop.ghlOpportunityId === recordId);
        });
      }) || [];

      if (matchedProperties.length === 0) {
        toast.error('Could not find property details from GHL. Please ensure properties are synced.');
        setSendingEmails((prev) => {
          const next = new Set(prev);
          next.delete(buyer.contactId);
          return next;
        });
        return;
      }

      // Send email with PDF
      await sendPropertyEmail({
        contactId: buyer.contactId,
        contactName: `${buyer.firstName} ${buyer.lastName}`,
        contactEmail: buyer.email,
        properties: matchedProperties,
        subject: `Your ${matchedProperties.length} Matched ${matchedProperties.length === 1 ? 'Property' : 'Properties'} from Purple Homes`,
        customMessage: 'Based on your investment criteria, we found these properties that match your preferences.',
      });

      toast.success(`Successfully sent ${matchedProperties.length} ${matchedProperties.length === 1 ? 'property' : 'properties'} to ${buyer.firstName} ${buyer.lastName}`);
    } catch (error) {
      console.error('Failed to send property matches:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send property matches');
    } finally {
      setSendingEmails((prev) => {
        const next = new Set(prev);
        next.delete(buyer.contactId);
        return next;
      });
    }
  };

  const handleSendSingleProperty = async (buyer: any, match: any) => {
    if (!buyer.contactId || !buyer.email) {
      toast.error('Buyer contact information is missing');
      return;
    }

    if (!match.property) {
      toast.error('Property details not available');
      return;
    }

    const sendKey = `${buyer.contactId}-${match.propertyRecordId}`;
    setSendingSingleProperty((prev) => new Set(prev).add(sendKey));

    try {
      // Find the GHL property
      const matchedProperty = ghlProperties?.properties.find((prop) =>
        prop.id === match.propertyRecordId || prop.ghlOpportunityId === match.propertyRecordId
      );

      if (!matchedProperty) {
        toast.error('Could not find property details from GHL');
        return;
      }

      await sendPropertyEmail({
        contactId: buyer.contactId,
        contactName: `${buyer.firstName} ${buyer.lastName}`,
        contactEmail: buyer.email,
        properties: [matchedProperty],
        subject: `Property Match: ${match.property.address} from Purple Homes`,
        customMessage: 'We found a property that matches your preferences.',
      });

      toast.success(`Sent ${match.property.address} to ${buyer.firstName} ${buyer.lastName}`);
    } catch (error) {
      console.error('Failed to send property:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send property');
    } finally {
      setSendingSingleProperty((prev) => {
        const next = new Set(prev);
        next.delete(sendKey);
        return next;
      });
    }
  };

  // Filter and sort buyers
  const filteredBuyers = useMemo(() => {
    let filtered = buyers?.filter(buyer => {
      const fullName = `${buyer.firstName} ${buyer.lastName}`.toLowerCase();
      const query = searchQuery.toLowerCase();
      return fullName.includes(query) || buyer.email.toLowerCase().includes(query);
    }) || [];

    // Sort
    switch (sortBy) {
      case 'matches-high':
        return filtered.sort((a, b) => b.totalMatches - a.totalMatches);
      case 'matches-low':
        return filtered.sort((a, b) => a.totalMatches - b.totalMatches);
      case 'name-az':
        return filtered.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
      case 'name-za':
        return filtered.sort((a, b) => `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`));
      default:
        return filtered;
    }
  }, [buyers, searchQuery, sortBy]);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let filtered = properties?.filter(property => {
      const query = searchQuery.toLowerCase();
      return (
        property.propertyCode.toLowerCase().includes(query) ||
        property.address.toLowerCase().includes(query) ||
        property.city.toLowerCase().includes(query)
      );
    }) || [];

    // Sort
    switch (sortBy) {
      case 'matches-high':
        return filtered.sort((a, b) => b.totalMatches - a.totalMatches);
      case 'matches-low':
        return filtered.sort((a, b) => a.totalMatches - b.totalMatches);
      case 'name-az':
        return filtered.sort((a, b) => a.address.localeCompare(b.address));
      case 'name-za':
        return filtered.sort((a, b) => b.address.localeCompare(a.address));
      default:
        return filtered;
    }
  }, [properties, searchQuery, sortBy]);

  const isMatching = runMatchingMutation.isPending || runBuyerMatchingMutation.isPending || runPropertyMatchingMutation.isPending;
  const isClearing = clearMatchesMutation.isPending;

  // Format last synced timestamp
  const formatLastSynced = (date: string | null | undefined) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  // Pagination handlers for buyers
  const handleBuyersNextPage = () => {
    if (buyersData?.nextOffset) {
      setBuyersOffsetHistory(prev => [...prev, buyersOffset || '']);
      setBuyersOffset(buyersData.nextOffset);
    }
  };

  const handleBuyersPrevPage = () => {
    if (buyersOffsetHistory.length > 0) {
      const newHistory = [...buyersOffsetHistory];
      const prevOffset = newHistory.pop();
      setBuyersOffsetHistory(newHistory);
      setBuyersOffset(prevOffset || undefined);
    }
  };

  // Pagination handlers for properties
  const handlePropertiesNextPage = () => {
    if (propertiesData?.nextOffset) {
      setPropertiesOffsetHistory(prev => [...prev, propertiesOffset || '']);
      setPropertiesOffset(propertiesData.nextOffset);
    }
  };

  const handlePropertiesPrevPage = () => {
    if (propertiesOffsetHistory.length > 0) {
      const newHistory = [...propertiesOffsetHistory];
      const prevOffset = newHistory.pop();
      setPropertiesOffsetHistory(newHistory);
      setPropertiesOffset(prevOffset || undefined);
    }
  };

  // Reset pagination when filters change
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setBuyersOffset(undefined);
    setPropertiesOffset(undefined);
    setBuyersOffsetHistory([]);
    setPropertiesOffsetHistory([]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between px-6 py-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">AI Property Matching</h1>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
              {matchesCount} {matchesCount === 1 ? 'Match' : 'Matches'}
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
              {buyersCount} {buyersCount === 1 ? 'Buyer' : 'Buyers'}
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
              {propertiesCount} {propertiesCount === 1 ? 'Property' : 'Properties'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {isStale ? (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-amber-600">Cache outdated</span>
                {(newPropertiesAvailable > 0 || newBuyersAvailable > 0) && (
                  <span>
                    • {newPropertiesAvailable > 0 && `${newPropertiesAvailable} new properties`}
                    {newPropertiesAvailable > 0 && newBuyersAvailable > 0 && ', '}
                    {newBuyersAvailable > 0 && `${newBuyersAvailable} new buyers`}
                  </span>
                )}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Cache current</span>
              </>
            )}
            <span>• Last synced: {formatLastSynced(lastSynced)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isStale ? 'default' : 'outline'}
            size="sm"
            onClick={() => syncAll()}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isMatching}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isMatching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Matching...
                  </>
                ) : (
                  <>
                    Run Matching
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRunMatchingAll}>
                Match All (Buyers + Properties)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRunMatchingBuyers}>
                Match All Buyers
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRunMatchingProperties}>
                Match All Properties
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleClearMatches}
                disabled={isClearing}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isClearing ? 'Clearing...' : 'Clear All Matches'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search/Filter Row - Sticky on scroll */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center px-6 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'buyers' ? 'Search buyers...' : 'Search properties...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matches-high">Most Matches</SelectItem>
                <SelectItem value="matches-low">Least Matches</SelectItem>
                <SelectItem value="name-az">Name (A-Z)</SelectItem>
                <SelectItem value="name-za">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.matchStatus || 'all'}
              onValueChange={(v) => handleFilterChange({ ...filters, matchStatus: v === 'all' ? undefined : v as 'Active' | 'Sent' | 'Viewed' | 'Closed' })}
            >
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Viewed">Viewed</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.minScore.toString()}
              onValueChange={(v) => handleFilterChange({ ...filters, minScore: parseInt(v) })}
            >
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any Score</SelectItem>
                <SelectItem value="30">30+</SelectItem>
                <SelectItem value="50">50+</SelectItem>
                <SelectItem value="70">70+</SelectItem>
                <SelectItem value="80">80+</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.matchLimit.toString()}
              onValueChange={(v) => handleFilterChange({ ...filters, matchLimit: parseInt(v) })}
            >
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="25">Top 25</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
                <SelectItem value="100">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'buyers' | 'properties')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="buyers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Buyers ({buyers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Properties ({properties?.length || 0})
            </TabsTrigger>
          </TabsList>

        {/* Buyer View */}
        <TabsContent value="buyers" className="mt-6">
          {loadingBuyers ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <Skeleton className="h-4 w-48" />
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <Skeleton className="h-4 w-32" />
                    {[1, 2].map((j) => (
                      <div key={j} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                        <Skeleton className="h-16 w-16 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredBuyers && filteredBuyers.length > 0 ? (
            <div className="grid gap-4">
              {filteredBuyers.map((buyer) => (
                <Card key={buyer.recordId} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold truncate">
                          {buyer.firstName} {buyer.lastName}
                        </h3>
                        {buyer.buyerType && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {buyer.buyerType}
                          </Badge>
                        )}
                        {buyer.matches.some(m => m.isPriority) && (
                          <Badge className="text-xs bg-purple-500 text-white flex-shrink-0">
                            Has Priority Matches
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{buyer.email}</p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                        {(buyer.desiredBeds || buyer.desiredBaths) && (
                          <span className="flex items-center gap-1">
                            <Bed className="h-3 w-3 flex-shrink-0" />
                            {buyer.desiredBeds && `${buyer.desiredBeds} bed`}
                            {buyer.desiredBeds && buyer.desiredBaths && ' / '}
                            {buyer.desiredBaths && `${buyer.desiredBaths} bath`}
                          </span>
                        )}
                        {buyer.downPayment && (
                          <span className="flex items-center gap-1">
                            Down payment: ${buyer.downPayment.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {(buyer.preferredLocation || buyer.city || (buyer.preferredZipCodes && buyer.preferredZipCodes.length > 0)) && (
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          {(buyer.preferredLocation || buyer.city) && (
                            <Badge variant="secondary" className="text-xs">
                              <MapPin className="h-2.5 w-2.5 mr-1" />
                              {buyer.preferredLocation || buyer.city}
                            </Badge>
                          )}
                          {buyer.preferredZipCodes && buyer.preferredZipCodes.slice(0, 3).map((zip) => (
                            <Badge key={zip} variant="outline" className="text-xs">
                              {zip}
                            </Badge>
                          ))}
                          {buyer.preferredZipCodes && buyer.preferredZipCodes.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{buyer.preferredZipCodes.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                          {buyer.totalMatches}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                          {buyer.totalMatches === 1 ? 'Match' : 'Matches'}
                        </div>
                      </div>
                      {buyer.totalMatches > 0 && (
                        <Button
                          onClick={() => handleSendPropertyMatches(buyer)}
                          disabled={sendingEmails.has(buyer.contactId)}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 gap-2"
                        >
                          {sendingEmails.has(buyer.contactId) ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Email All Matches
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {buyer.matches.length > 0 && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        Matched Properties:
                      </h4>
                      {(expandedBuyers.has(buyer.recordId) ? buyer.matches : buyer.matches.slice(0, 3)).map((match) => (
                        <div
                          key={match.id}
                          className="flex gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          {/* Property Thumbnail */}
                          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                            {match.property?.heroImage ? (
                              <img
                                src={match.property.heroImage}
                                alt={match.property.address}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Home className="h-6 w-6 text-purple-300" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {match.property ? (
                                <>
                                  <button
                                    onClick={() => setSelectedMatch({
                                      property: match.property!,
                                      reasoning: match.reasoning,
                                      highlights: match.highlights,
                                      concerns: match.concerns,
                                      score: match.score,
                                    })}
                                    className="font-medium text-left text-purple-600 hover:text-purple-700 underline underline-offset-2 decoration-purple-300 hover:decoration-purple-500 transition-colors truncate max-w-[200px] sm:max-w-none"
                                    title="Click to view property details"
                                  >
                                    {match.property.address}
                                  </button>
                                  {match.isPriority && (
                                    <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-700 border-purple-500/30 flex-shrink-0">
                                      Priority
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <div className="font-medium">Property {match.propertyRecordId.slice(-6)}</div>
                              )}
                            </div>

                            {match.property && (
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                                <span className="flex items-center gap-1">
                                  <Bed className="h-3 w-3" />
                                  {match.property.beds}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Bath className="h-3 w-3" />
                                  {match.property.baths}
                                </span>
                                {match.property.sqft && (
                                  <span className="flex items-center gap-1">
                                    <Square className="h-3 w-3" />
                                    {match.property.sqft.toLocaleString()}
                                  </span>
                                )}
                                {match.property.zipCode && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                                    {match.property.zipCode}
                                  </Badge>
                                )}
                                {match.property.price && (
                                  <span className="font-medium text-foreground">
                                    ${match.property.price.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            )}

                            {match.distance && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {match.distance.toFixed(1)} mi
                              </div>
                            )}

                            <MatchTags
                              highlights={match.highlights}
                              concerns={match.concerns}
                              reasoning={match.reasoning}
                              maxVisible={4}
                              className="mt-1.5"
                            />
                          </div>

                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <MatchScoreBadge score={match.score} size="sm" showLabel={false} />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendSingleProperty(buyer, match)}
                              disabled={sendingSingleProperty.has(`${buyer.contactId}-${match.propertyRecordId}`)}
                              className="h-7 px-2 text-xs gap-1"
                            >
                              {sendingSingleProperty.has(`${buyer.contactId}-${match.propertyRecordId}`) ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-3 w-3" />
                                  Email
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {buyer.matches.length > 3 && (
                        <button
                          onClick={() => {
                            setExpandedBuyers(prev => {
                              const next = new Set(prev);
                              if (next.has(buyer.recordId)) {
                                next.delete(buyer.recordId);
                              } else {
                                next.add(buyer.recordId);
                              }
                              return next;
                            });
                          }}
                          className="w-full text-sm text-purple-600 hover:text-purple-700 font-medium text-center py-2 hover:bg-purple-50 rounded-md transition-colors"
                        >
                          {expandedBuyers.has(buyer.recordId)
                            ? 'Show less'
                            : `+ ${buyer.matches.length - 3} more ${buyer.matches.length - 3 === 1 ? 'match' : 'matches'}`}
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No buyers found matching your search.' : 'No buyers found. Click "Run Matching" to find matches.'}
              </p>
            </div>
          )}

          {/* Buyers Pagination */}
          {buyers && buyers.length > 0 && (buyersOffsetHistory.length > 0 || hasNextBuyersPage) && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBuyersPrevPage}
                disabled={buyersOffsetHistory.length === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {buyersOffsetHistory.length + 1} • {buyers.length} buyers
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBuyersNextPage}
                disabled={!hasNextBuyersPage}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Property View */}
        <TabsContent value="properties" className="mt-6">
          {loadingProperties ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-56" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <Skeleton className="h-4 w-28" />
                    {[1, 2].map((j) => (
                      <div key={j} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredProperties && filteredProperties.length > 0 ? (
            <div className="grid gap-4">
              {filteredProperties.map((property) => (
                <Card key={property.recordId} className="p-6">
                  <div className="flex gap-4">
                    {/* Property Thumbnail */}
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                      {property.heroImage ? (
                        <img
                          src={property.heroImage}
                          alt={property.address}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Home className="h-8 w-8 text-purple-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold truncate">{property.address}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              <MapPin className="h-2.5 w-2.5 mr-1" />
                              {property.city}
                            </Badge>
                            {property.zipCode && (
                              <Badge variant="outline" className="text-xs">
                                {property.zipCode}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                            <span className="flex items-center gap-1">
                              <Bed className="h-3.5 w-3.5" />
                              {property.beds} bed
                            </span>
                            <span className="flex items-center gap-1">
                              <Bath className="h-3.5 w-3.5" />
                              {property.baths} bath
                            </span>
                            {property.sqft && (
                              <span className="flex items-center gap-1">
                                <Square className="h-3.5 w-3.5" />
                                {property.sqft.toLocaleString()} sqft
                              </span>
                            )}
                          </div>
                          {property.price && (
                            <div className="text-lg font-semibold text-purple-600 mt-1">
                              ${property.price.toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600">
                              {property.totalMatches}
                            </div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">
                              {property.totalMatches === 1 ? 'Match' : 'Matches'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {property.matches.length > 0 && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        Matched Buyers:
                      </h4>
                      {(expandedProperties.has(property.recordId) ? property.matches : property.matches.slice(0, 3)).map((match) => (
                        <div
                          key={match.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {match.buyer ? (
                                <>
                                  <div className="font-medium">
                                    {match.buyer.firstName} {match.buyer.lastName}
                                  </div>
                                  {match.isPriority && (
                                    <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-700 border-purple-500/30">
                                      Priority
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="font-medium">Buyer {match.buyerRecordId.slice(-6)}</div>
                                  {match.isPriority && (
                                    <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-700 border-purple-500/30">
                                      Priority
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                            {match.buyer && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {match.buyer.email}
                                {match.buyer.desiredBeds && ` • Looking for ${match.buyer.desiredBeds} bed`}
                                {match.buyer.desiredBaths && `, ${match.buyer.desiredBaths} bath`}
                              </div>
                            )}
                            {match.distance && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {match.distance.toFixed(1)} miles from buyer
                              </div>
                            )}
                            <MatchTags
                              highlights={match.highlights}
                              concerns={match.concerns}
                              reasoning={match.reasoning}
                              maxVisible={3}
                              className="mt-1.5"
                            />
                          </div>
                          <MatchScoreBadge score={match.score} size="sm" />
                        </div>
                      ))}
                      {property.matches.length > 3 && (
                        <button
                          onClick={() => {
                            setExpandedProperties(prev => {
                              const next = new Set(prev);
                              if (next.has(property.recordId)) {
                                next.delete(property.recordId);
                              } else {
                                next.add(property.recordId);
                              }
                              return next;
                            });
                          }}
                          className="w-full text-sm text-purple-600 hover:text-purple-700 font-medium text-center py-2 hover:bg-purple-50 rounded-md transition-colors"
                        >
                          {expandedProperties.has(property.recordId)
                            ? 'Show less'
                            : `+ ${property.matches.length - 3} more ${property.matches.length - 3 === 1 ? 'match' : 'matches'}`}
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Home className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No properties found matching your search.' : 'No properties found. Click "Run Matching" to find matches.'}
              </p>
            </div>
          )}

          {/* Properties Pagination */}
          {properties && properties.length > 0 && (propertiesOffsetHistory.length > 0 || hasNextPropertiesPage) && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePropertiesPrevPage}
                disabled={propertiesOffsetHistory.length === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {propertiesOffsetHistory.length + 1} • {properties.length} properties
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePropertiesNextPage}
                disabled={!hasNextPropertiesPage}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </TabsContent>
        </Tabs>
      </div>

      {/* Property Detail Modal */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {selectedMatch && (
            <div>
              {/* Hero Image with Overlay */}
              <div className="relative h-64 sm:h-80 bg-gradient-to-br from-purple-100 to-purple-50">
                {selectedMatch.property.heroImage ? (
                  <img
                    src={selectedMatch.property.heroImage}
                    alt={selectedMatch.property.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Home className="h-20 w-20 text-purple-200" />
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Price and Match Score on image */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      {selectedMatch.property.price && (
                        <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                          ${selectedMatch.property.price.toLocaleString()}
                        </div>
                      )}
                      <h2 className="text-xl sm:text-2xl font-semibold text-white">{selectedMatch.property.address}</h2>
                      <p className="text-white/80">
                        {selectedMatch.property.city}
                        {selectedMatch.property.state && `, ${selectedMatch.property.state}`}
                        {selectedMatch.property.zipCode && ` ${selectedMatch.property.zipCode}`}
                      </p>
                    </div>
                    {selectedMatch.score && (
                      <MatchScoreBadge score={selectedMatch.score} size="lg" />
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Property Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center p-4 bg-purple-50 rounded-xl">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-2">
                      <Bed className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold">{selectedMatch.property.beds}</p>
                    <p className="text-xs text-muted-foreground">Bedrooms</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-purple-50 rounded-xl">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-2">
                      <Bath className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold">{selectedMatch.property.baths}</p>
                    <p className="text-xs text-muted-foreground">Bathrooms</p>
                  </div>
                  {selectedMatch.property.sqft && (
                    <div className="flex flex-col items-center p-4 bg-purple-50 rounded-xl">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-2">
                        <Square className="h-5 w-5 text-purple-600" />
                      </div>
                      <p className="text-2xl font-bold">{selectedMatch.property.sqft.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Sqft</p>
                    </div>
                  )}
                  {selectedMatch.property.stage && (
                    <div className="flex flex-col items-center p-4 bg-purple-50 rounded-xl">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-2">
                        <Building className="h-5 w-5 text-purple-600" />
                      </div>
                      <p className="text-lg font-bold">{selectedMatch.property.stage}</p>
                      <p className="text-xs text-muted-foreground">Stage</p>
                    </div>
                  )}
                </div>

                {/* Match Reasoning Section */}
                {selectedMatch.reasoning && (
                  <div className="bg-muted/30 rounded-xl p-5">
                    <h3 className="text-base font-semibold mb-3">Why This Property Matches</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {extractReasoningSummary(selectedMatch.reasoning)}
                    </p>

                    {/* Match Tags */}
                    <MatchTags
                      highlights={selectedMatch.highlights}
                      concerns={selectedMatch.concerns}
                      maxVisible={10}
                    />
                  </div>
                )}

                {/* Property Notes */}
                {selectedMatch.property.notes && (
                  <div>
                    <h3 className="text-base font-semibold mb-2">Property Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedMatch.property.notes}</p>
                  </div>
                )}

                {/* Footer Info */}
                {selectedMatch.property.propertyCode && (
                  <div className="text-xs text-muted-foreground pt-4 border-t">
                    Property Code: {selectedMatch.property.propertyCode}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
