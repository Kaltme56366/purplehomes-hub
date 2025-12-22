/**
 * ZillowOpportunities - Agent tool for finding external opportunities
 *
 * Provides three search types:
 * 1. Creative Financing - Properties with seller/owner finance keywords
 * 2. 90+ Days - Properties on market 90+ days (sorted by DOM)
 * 3. Affordability - Properties within calculated max price
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Lock,
  ChevronDown,
  Loader2,
  MapPin,
  Bed,
  DollarSign,
  Tag,
  Calendar,
  Wallet,
  Phone,
  ExternalLink,
  Bath,
  Square,
  Home,
} from 'lucide-react';
import { useZillowSearchByType } from '@/services/zillowApi';
import { calculateMaxAffordablePrice } from '@/lib/affordability';
import type { BuyerCriteria } from '@/types/matching';
import type { ZillowSearchType, ZillowListing } from '@/types/zillow';

interface ZillowOpportunitiesProps {
  buyer: BuyerCriteria;
}

export function ZillowOpportunities({ buyer }: ZillowOpportunitiesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSearchType, setSelectedSearchType] = useState<ZillowSearchType | null>(null);

  // Query for selected search type
  const { data, isLoading, error } = useZillowSearchByType(
    buyer.recordId || null,
    selectedSearchType
  );

  // Calculate max price for display
  const maxPrice = buyer.downPayment && buyer.downPayment > 10300
    ? calculateMaxAffordablePrice(buyer.downPayment)
    : null;

  // Check if buyer has required data for each search type
  const canSearchCreative = !!(buyer.preferredLocation || buyer.city);
  const canSearch90Days = !!(buyer.preferredLocation || buyer.city);
  const canSearchAffordability = !!(buyer.preferredLocation || buyer.city) && !!maxPrice;

  const handleSearchTypeClick = (type: ZillowSearchType) => {
    // If clicking same type, toggle off; otherwise switch to new type
    setSelectedSearchType(prev => prev === type ? null : type);
  };

  const getSearchAge = () => {
    if (!data?.searchAge) return '';
    const hours = data.searchAge;
    if (hours < 1) return 'just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2 border-purple-200 bg-purple-50/30">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 hover:bg-purple-100/50"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900">
                Agent Tools: Zillow Opportunities
              </h3>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-purple-600 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            {/* Buyer Criteria Summary */}
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <h4 className="text-xs font-semibold text-purple-900 mb-2">Buyer Criteria:</h4>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {buyer.preferredLocation || buyer.city || 'No location'}
                </span>
                {buyer.desiredBeds && (
                  <span className="flex items-center gap-1">
                    <Bed className="h-3 w-3" />
                    {buyer.desiredBeds}+ beds
                  </span>
                )}
                {maxPrice && (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <DollarSign className="h-3 w-3" />
                    Max: ${maxPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Search Type Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={selectedSearchType === 'Creative Financing' ? 'default' : 'outline'}
                className={`h-auto py-3 px-2 flex flex-col items-center gap-1 ${
                  selectedSearchType === 'Creative Financing'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'hover:bg-purple-50 hover:border-purple-300'
                }`}
                onClick={() => handleSearchTypeClick('Creative Financing')}
                disabled={!canSearchCreative || isLoading}
              >
                <Tag className="h-4 w-4" />
                <span className="text-xs font-medium">Creative Financing</span>
              </Button>

              <Button
                variant={selectedSearchType === '90+ Days' ? 'default' : 'outline'}
                className={`h-auto py-3 px-2 flex flex-col items-center gap-1 ${
                  selectedSearchType === '90+ Days'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'hover:bg-purple-50 hover:border-purple-300'
                }`}
                onClick={() => handleSearchTypeClick('90+ Days')}
                disabled={!canSearch90Days || isLoading}
              >
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">90+ Days</span>
              </Button>

              <Button
                variant={selectedSearchType === 'Affordability' ? 'default' : 'outline'}
                className={`h-auto py-3 px-2 flex flex-col items-center gap-1 ${
                  selectedSearchType === 'Affordability'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'hover:bg-purple-50 hover:border-purple-300'
                }`}
                onClick={() => handleSearchTypeClick('Affordability')}
                disabled={!canSearchAffordability || isLoading}
              >
                <Wallet className="h-4 w-4" />
                <span className="text-xs font-medium">Affordable Range</span>
              </Button>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12 bg-white rounded-lg border">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500 mr-2" />
                <span className="text-sm text-muted-foreground">
                  Searching Zillow (30-60 seconds)...
                </span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  {error instanceof Error ? error.message : 'Failed to search Zillow'}
                </p>
              </div>
            )}

            {/* Results */}
            {data && !isLoading && (
              <div className="space-y-3">
                {/* Results Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">
                      {selectedSearchType} Results
                    </h4>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      {data.results.length}
                    </Badge>
                    {data.cached && (
                      <Badge variant="outline" className="text-xs">
                        Cached
                      </Badge>
                    )}
                  </div>
                  {data.searchAge !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      Last searched: {getSearchAge()}
                    </span>
                  )}
                </div>

                {/* Results List */}
                {data.results.length > 0 ? (
                  <div className="space-y-2">
                    {data.results.map((listing) => (
                      <ZillowOpportunityCard
                        key={listing.zpid}
                        listing={listing}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white rounded-lg border">
                    <p className="text-sm text-muted-foreground">
                      No properties found for this search
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Help Text */}
            {!selectedSearchType && !isLoading && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Select a search type above to find opportunities on Zillow
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/**
 * Individual opportunity card component
 */
function ZillowOpportunityCard({ listing }: { listing: ZillowListing }) {
  return (
    <Card className="p-3 hover:bg-purple-50/30 transition-colors">
      <div className="flex gap-3">
        {/* Property Image */}
        <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50">
          {listing.images && listing.images[0] ? (
            <img
              src={listing.images[0]}
              alt={listing.address}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home className="h-6 w-6 text-purple-300" />
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-sm truncate">{listing.address}</h5>
          <p className="text-xs text-muted-foreground truncate">
            {listing.city}, {listing.state} {listing.zipCode}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <DollarSign className="h-3 w-3" />
              {listing.price.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3" />
              {listing.beds}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" />
              {listing.baths}
            </span>
            {listing.sqft && (
              <span className="flex items-center gap-1">
                <Square className="h-3 w-3" />
                {listing.sqft.toLocaleString()}
              </span>
            )}
          </div>

          {/* Days on Market Badge */}
          {listing.daysOnMarket && listing.daysOnMarket > 0 && (
            <div className="mt-2">
              <Badge
                variant={listing.daysOnMarket >= 90 ? 'default' : 'secondary'}
                className={`text-xs ${
                  listing.daysOnMarket >= 90
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {listing.daysOnMarket} days on market
              </Badge>
            </div>
          )}

          {/* Listing Agent */}
          {listing.listingAgent && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-foreground">
                {listing.listingAgent.name}
              </p>
              {listing.listingAgent.phone && (
                <p className="text-xs text-muted-foreground">
                  {listing.listingAgent.phone}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            {listing.listingAgent?.phone && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => window.open(`tel:${listing.listingAgent!.phone}`, '_self')}
              >
                <Phone className="h-3 w-3 mr-1" />
                Call
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => window.open(listing.zillowUrl, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View on Zillow
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
