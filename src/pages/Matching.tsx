import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Users, Home, Send, ChevronDown, DollarSign, MapPin } from 'lucide-react';
import { useBuyersWithMatches, usePropertiesWithMatches, useRunMatching, useRunBuyerMatching, useRunPropertyMatching } from '@/services/matchingApi';
import { MatchScoreBadge } from '@/components/matching/MatchScoreBadge';
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

  const { data: buyers, isLoading: loadingBuyers } = useBuyersWithMatches();
  const { data: properties, isLoading: loadingProperties } = usePropertiesWithMatches();
  const { data: ghlProperties } = useProperties(SELLER_ACQUISITION_PIPELINE_ID);
  const runMatchingMutation = useRunMatching();
  const runBuyerMatchingMutation = useRunBuyerMatching();
  const runPropertyMatchingMutation = useRunPropertyMatching();

  const handleRunMatchingAll = async () => {
    try {
      const result = await runMatchingMutation.mutateAsync({ minScore: 30, refreshAll: forceRematch });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to run matching');
    }
  };

  const handleRunMatchingBuyers = async () => {
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
      toast.error(error instanceof Error ? error.message : 'Failed to match buyers');
    }
  };

  const handleRunMatchingProperties = async () => {
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
      toast.error(error instanceof Error ? error.message : 'Failed to match properties');
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

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">AI Property Matching</h1>
          <p className="text-muted-foreground mt-1">
            Distance-based matching with 50-mile radius priority
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="force-rematch"
              checked={forceRematch}
              onCheckedChange={(checked) => setForceRematch(checked as boolean)}
            />
            <Label htmlFor="force-rematch" className="text-sm cursor-pointer">
              Force re-match all
            </Label>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isMatching}
                size="lg"
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'buyers' ? 'Search buyers by name or email...' : 'Search properties by code, address, or city...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="matches-high">Most Matches</SelectItem>
            <SelectItem value="matches-low">Least Matches</SelectItem>
            <SelectItem value="name-az">Name (A-Z)</SelectItem>
            <SelectItem value="name-za">Name (Z-A)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
