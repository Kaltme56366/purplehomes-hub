import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Users, Home, Send, ChevronDown, DollarSign, MapPin, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, CheckCircle, Database, Trash2 } from 'lucide-react';
import { useBuyersWithMatches, usePropertiesWithMatches, useRunMatching, useRunBuyerMatching, useRunPropertyMatching, useClearMatches } from '@/services/matchingApi';
import { MatchScoreBadge } from '@/components/matching/MatchScoreBadge';
import { useMatchingData } from '@/hooks/useCache';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { useProperties } from '@/services/ghlApi';
import { sendPropertyEmail } from '@/services/emailService';
import { SELLER_ACQUISITION_PIPELINE_ID } from '@/services/ghlApi';
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
  const [sortBy, setSortBy] = useState<SortOption>('matches-high');
  const [forceRematch, setForceRematch] = useState(false);

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
    console.log('[Matching UI] handleRunMatchingAll called', { forceRematch });
    try {
      const result = await runMatchingMutation.mutateAsync({ minScore: 30, refreshAll: forceRematch });
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

      {/* Search/Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center px-6 py-3 bg-muted/30 rounded-lg">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'buyers' ? 'Search buyers by name or email...' : 'Search properties by code, address, or city...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background"
          />
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
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
          <SelectTrigger className="w-full sm:w-[140px] bg-background">
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
          <SelectTrigger className="w-full sm:w-[140px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Score: Any</SelectItem>
            <SelectItem value="30">Score: 30+</SelectItem>
            <SelectItem value="50">Score: 50+</SelectItem>
            <SelectItem value="70">Score: 70+</SelectItem>
            <SelectItem value="80">Score: 80+</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.matchLimit.toString()}
          onValueChange={(v) => handleFilterChange({ ...filters, matchLimit: parseInt(v) })}
        >
          <SelectTrigger className="w-full sm:w-[160px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Top 5 Matches</SelectItem>
            <SelectItem value="10">Top 10 Matches</SelectItem>
            <SelectItem value="25">Top 25 Matches</SelectItem>
            <SelectItem value="50">Top 50 Matches</SelectItem>
            <SelectItem value="100">All Matches</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-2 whitespace-nowrap">
          <Checkbox
            id="force-rematch"
            checked={forceRematch}
            onCheckedChange={(checked) => setForceRematch(checked as boolean)}
          />
          <Label htmlFor="force-rematch" className="text-sm cursor-pointer">
            Force re-match
          </Label>
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : filteredBuyers && filteredBuyers.length > 0 ? (
            <div className="grid gap-4">
              {filteredBuyers.map((buyer) => (
                <Card key={buyer.recordId} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">
                        {buyer.firstName} {buyer.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">{buyer.email}</p>
                      {buyer.city && (
                        <p className="text-sm text-muted-foreground mt-1">
                          📍 {buyer.city}
                        </p>
                      )}
                      {(buyer.desiredBeds || buyer.desiredBaths) && (
                        <p className="text-sm text-muted-foreground">
                          Looking for: {buyer.desiredBeds && `${buyer.desiredBeds} bed`}{buyer.desiredBeds && buyer.desiredBaths && ' • '}{buyer.desiredBaths && `${buyer.desiredBaths} bath`}
                        </p>
                      )}
                      {buyer.downPayment && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Down payment: ${buyer.downPayment.toLocaleString()}
                        </p>
                      )}
                      {buyer.preferredLocation && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Preferred: {buyer.preferredLocation}
                        </p>
                      )}
                      {buyer.preferredZipCodes && buyer.preferredZipCodes.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          <span className="text-sm text-muted-foreground">ZIP codes:</span>
                          {buyer.preferredZipCodes.slice(0, 5).map((zip) => (
                            <Badge key={zip} variant="secondary" className="text-xs">
                              {zip}
                            </Badge>
                          ))}
                          {buyer.preferredZipCodes.length > 5 && (
                            <span className="text-xs text-muted-foreground">+{buyer.preferredZipCodes.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-3">
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {buyer.totalMatches}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {buyer.totalMatches === 1 ? 'Match' : 'Matches'}
                        </div>
                      </div>
                      {buyer.totalMatches > 0 && (
                        <Button
                          onClick={() => handleSendPropertyMatches(buyer)}
                          disabled={sendingEmails.has(buyer.contactId)}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {sendingEmails.has(buyer.contactId) ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3 mr-2" />
                              Send {buyer.totalMatches} {buyer.totalMatches === 1 ? 'Match' : 'Matches'}
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
                      {buyer.matches.slice(0, 3).map((match) => (
                        <div
                          key={match.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {match.property ? (
                                <>
                                  <div className="font-medium">
                                    {match.property.address}
                                    {match.property.city && `, ${match.property.city}`}
                                    {match.property.state && `, ${match.property.state}`}
                                  </div>
                                  {match.isPriority && (
                                    <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-700 border-purple-500/30">
                                      Priority
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="font-medium">Property {match.propertyRecordId.slice(-6)}</div>
                                  {match.isPriority && (
                                    <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-700 border-purple-500/30">
                                      Priority
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                            {match.property && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {match.property.beds} bed • {match.property.baths} bath
                                {match.property.sqft && ` • ${match.property.sqft.toLocaleString()} sqft`}
                                {match.property.price && ` • $${match.property.price.toLocaleString()}`}
                              </div>
                            )}
                            {match.distance && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {match.distance.toFixed(1)} miles away
                              </div>
                            )}
                            <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {match.reasoning}
                            </div>
                          </div>
                          <MatchScoreBadge score={match.score} size="sm" />
                        </div>
                      ))}
                      {buyer.matches.length > 3 && (
                        <p className="text-sm text-muted-foreground text-center">
                          + {buyer.matches.length - 3} more {buyer.matches.length - 3 === 1 ? 'match' : 'matches'}
                        </p>
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : filteredProperties && filteredProperties.length > 0 ? (
            <div className="grid gap-4">
              {filteredProperties.map((property) => (
                <Card key={property.recordId} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{property.address}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        📍 {property.city}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {property.beds} bed • {property.baths} bath
                        {property.sqft && ` • ${property.sqft.toLocaleString()} sqft`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {property.totalMatches}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {property.totalMatches === 1 ? 'Match' : 'Matches'}
                      </div>
                    </div>
                  </div>

                  {property.matches.length > 0 && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        Matched Buyers:
                      </h4>
                      {property.matches.slice(0, 3).map((match) => (
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
                            <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {match.reasoning}
                            </div>
                          </div>
                          <MatchScoreBadge score={match.score} size="sm" />
                        </div>
                      ))}
                      {property.matches.length > 3 && (
                        <p className="text-sm text-muted-foreground text-center">
                          + {property.matches.length - 3} more {property.matches.length - 3 === 1 ? 'match' : 'matches'}
                        </p>
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
    </div>
  );
}
