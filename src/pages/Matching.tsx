import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Play, Loader2, Users, Home, Send } from 'lucide-react';
import { useBuyersWithMatches, usePropertiesWithMatches, useRunMatching } from '@/services/matchingApi';
import { MatchScoreBadge } from '@/components/matching/MatchScoreBadge';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { useProperties } from '@/services/ghlApi';
import { sendPropertyEmail } from '@/services/emailService';
import { SELLER_ACQUISITION_PIPELINE_ID } from '@/services/ghlApi';

export default function Matching() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'buyers' | 'properties'>('buyers');
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());

  const { data: buyers, isLoading: loadingBuyers } = useBuyersWithMatches();
  const { data: properties, isLoading: loadingProperties } = usePropertiesWithMatches();
  const { data: ghlProperties } = useProperties(SELLER_ACQUISITION_PIPELINE_ID);
  const runMatchingMutation = useRunMatching();

  const handleRunMatching = async () => {
    try {
      const result = await runMatchingMutation.mutateAsync({ minScore: 60 });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to run matching');
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

  // Filter buyers based on search
  const filteredBuyers = buyers?.filter(buyer => {
    const fullName = `${buyer.firstName} ${buyer.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || buyer.email.toLowerCase().includes(query);
  });

  // Filter properties based on search
  const filteredProperties = properties?.filter(property => {
    const query = searchQuery.toLowerCase();
    return (
      property.propertyCode.toLowerCase().includes(query) ||
      property.address.toLowerCase().includes(query) ||
      property.city.toLowerCase().includes(query)
    );
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">AI Property Matching</h1>
          <p className="text-muted-foreground mt-1">
            Intelligent matching between buyers and properties
          </p>
        </div>
        <Button
          onClick={handleRunMatching}
          disabled={runMatchingMutation.isPending}
          size="lg"
          className="bg-purple-600 hover:bg-purple-700"
        >
          {runMatchingMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Matching...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Matching for All
            </>
          )}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'buyers' ? 'Search buyers by name or email...' : 'Search properties by code, address, or city...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
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
                            <div className="font-medium">Property {match.propertyRecordId.slice(-6)}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
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
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{property.propertyCode}</h3>
                        {property.stage && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {property.stage}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        📍 {property.address}, {property.city}
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
                            <div className="font-medium">Buyer {match.buyerRecordId.slice(-6)}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
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
