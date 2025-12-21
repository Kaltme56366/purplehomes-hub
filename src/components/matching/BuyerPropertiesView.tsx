/**
 * BuyerPropertiesView - Two-section property view for a selected buyer
 *
 * Shows ALL properties scored for a buyer, split into:
 * - Top Matches (within 50mi or ZIP match)
 * - More Properties to Explore (beyond 50mi)
 */

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Home,
  MapPin,
  Bed,
  Bath,
  Square,
  Target,
  Loader2,
  DollarSign,
  Users,
  Search,
  Eye,
  Check,
} from 'lucide-react';
import { useBuyerProperties, useBuyersList } from '@/services/matchingApi';
import { useZillowSearch } from '@/services/zillowApi';
import { MatchSectionDivider } from './MatchSectionDivider';
import { MatchScoreBadge } from './MatchScoreBadge';
import { SourceBadge } from './SourceBadge';
import { ZillowTypeBadge } from './ZillowTypeBadge';
import { ZillowPropertyCard } from './ZillowPropertyCard';
import { SaveZillowModal } from './SaveZillowModal';
import { PropertyViewModal } from './PropertyViewModal';
import { PropertySelectionBar } from './PropertySelectionBar';
import { SendPropertiesModal } from './SendPropertiesModal';
import type { ScoredProperty, BuyerCriteria } from '@/types/matching';
import type { ZillowListing } from '@/types/zillow';

interface PropertyCardProps {
  scoredProperty: ScoredProperty;
  isExplore?: boolean;
  buyer?: BuyerCriteria;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onViewDetails?: () => void;
}

function PropertyCard({
  scoredProperty,
  isExplore = false,
  buyer,
  isSelected = false,
  onToggleSelect,
  onViewDetails,
}: PropertyCardProps) {
  const { property, score } = scoredProperty;

  // Generate highlight tags for explore section
  const getExploreHighlights = () => {
    const highlights: string[] = [];

    // Budget advantage
    if (buyer?.downPayment && property.price) {
      const ratio = (buyer.downPayment / property.price) * 100;
      if (ratio >= 25) {
        highlights.push('Strong budget fit');
      }
    }

    // Extra bedroom
    if (buyer?.desiredBeds && property.beds > (buyer.desiredBeds || 0)) {
      highlights.push(`+${property.beds - buyer.desiredBeds} bedroom${property.beds - buyer.desiredBeds > 1 ? 's' : ''}`);
    }

    return highlights;
  };

  const exploreHighlights = isExplore ? getExploreHighlights() : [];

  return (
    <Card
      className={cn(
        "p-4 transition-all relative group",
        onToggleSelect && "cursor-pointer",
        isSelected
          ? "border-2 border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20"
          : "border hover:bg-muted/30 hover:border-purple-300"
      )}
      onClick={(e) => {
        // Only toggle if not clicking on View button and toggle is enabled
        if (onToggleSelect && !(e.target as HTMLElement).closest('[data-view-button]')) {
          onToggleSelect();
        }
      }}
    >
      {/* Selection Checkbox - Top Left */}
      {onToggleSelect && (
        <div
          className="absolute top-3 left-3 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
        >
          <Checkbox
            checked={isSelected}
            className={cn(
              "h-5 w-5 border-2 transition-all",
              isSelected
                ? "border-purple-500 bg-purple-500"
                : "border-gray-400 bg-white hover:border-purple-400"
            )}
            aria-label={`Select ${property.address}`}
          />
        </div>
      )}

      {/* Selected Indicator - Top Right */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-10 bg-purple-500 rounded-full p-1">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}

      <div className="flex gap-4">
        {/* Property Image */}
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

        {/* Property Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-sm truncate">{property.address}</h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {property.city}
                {property.state && `, ${property.state}`}
                {property.zipCode && ` ${property.zipCode}`}
              </p>
            </div>

            {/* Score Badge */}
            <MatchScoreBadge score={score.score} size="sm" showLabel={false} />
          </div>

          {/* Property Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3" />
              {property.beds}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" />
              {property.baths}
            </span>
            {property.sqft && (
              <span className="flex items-center gap-1">
                <Square className="h-3 w-3" />
                {property.sqft.toLocaleString()}
              </span>
            )}
            {property.price && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DollarSign className="h-3 w-3" />
                {property.price.toLocaleString()}
              </span>
            )}
          </div>

          {/* Badges Row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Distance Badge */}
            {score.distanceMiles !== null && (
              <Badge
                variant={score.isPriority ? 'default' : 'secondary'}
                className={`text-xs ${
                  score.isPriority
                    ? 'bg-purple-500 hover:bg-purple-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <MapPin className="h-3 w-3 mr-1" />
                {score.distanceMiles <= 1
                  ? '< 1 mi'
                  : score.distanceMiles < 10
                  ? `${score.distanceMiles.toFixed(1)} mi`
                  : `${Math.round(score.distanceMiles)} mi`}
              </Badge>
            )}

            {/* Priority match indicator */}
            {score.isPriority && !score.distanceMiles && (
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                <Target className="h-3 w-3 mr-1" />
                In Preferred ZIP
              </Badge>
            )}

            {/* Source Badge */}
            {property.source && (
              <SourceBadge source={property.source} size="sm" />
            )}

            {/* Zillow Type Badge (only for Zillow properties) */}
            {property.source === 'Zillow' && property.zillowType && (
              <ZillowTypeBadge type={property.zillowType} size="sm" />
            )}

            {/* Explore highlights */}
            {isExplore && exploreHighlights.map((highlight, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {highlight}
              </Badge>
            ))}
          </div>

          {/* Location Reason */}
          {score.locationReason && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {score.locationReason}
            </p>
          )}
        </div>
      </div>

      {/* View Details Button */}
      {onViewDetails && (
        <div
          className="absolute bottom-3 right-3"
          data-view-button
        >
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs bg-white hover:bg-purple-50 hover:border-purple-500"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
        </div>
      )}
    </Card>
  );
}

interface BuyerPropertiesViewProps {
  selectedBuyerId?: string | null;
  onBuyerSelect?: (buyerId: string | null) => void;
}

export function BuyerPropertiesView({
  selectedBuyerId: externalBuyerId,
  onBuyerSelect,
}: BuyerPropertiesViewProps = {}) {
  // Use internal state as fallback when no external state is provided
  const [internalBuyerId, setInternalBuyerId] = useState<string | null>(null);

  // Use external state if provided, otherwise use internal state
  const buyerId = externalBuyerId !== undefined ? externalBuyerId : internalBuyerId;

  // Use external handler if provided, otherwise use internal setter
  const handleBuyerSelect = (newBuyerId: string | null) => {
    if (onBuyerSelect) {
      onBuyerSelect(newBuyerId);
    } else {
      setInternalBuyerId(newBuyerId);
    }
  };

  const { data: buyersList, isLoading: loadingBuyers } = useBuyersList();
  const { data: buyerProperties, isLoading: loadingProperties, error } = useBuyerProperties(buyerId);
  const { data: zillowData, isLoading: loadingZillow } = useZillowSearch(buyerId);

  // State for Zillow save modal
  const [zillowModalOpen, setZillowModalOpen] = useState(false);
  const [selectedZillowListing, setSelectedZillowListing] = useState<ZillowListing | null>(null);

  // State for property selection
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [selectedPropertyForView, setSelectedPropertyForView] = useState<ScoredProperty | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  // Selection handlers
  const togglePropertySelection = (recordId: string) => {
    setSelectedPropertyIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedPropertyIds(new Set());
  };

  const selectAll = () => {
    if (!buyerProperties) return;
    const allIds = [...buyerProperties.priorityMatches, ...buyerProperties.exploreMatches]
      .map(sp => sp.property.recordId);
    setSelectedPropertyIds(new Set(allIds));
  };

  return (
    <div className="space-y-6">
      {/* Buyer Selector */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-purple-500" />
            <span>Select Buyer:</span>
          </div>
          <Select
            value={buyerId || ''}
            onValueChange={(value) => handleBuyerSelect(value || null)}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Choose a buyer to see their matches..." />
            </SelectTrigger>
            <SelectContent>
              {loadingBuyers ? (
                <div className="p-2 text-sm text-muted-foreground">Loading buyers...</div>
              ) : (
                buyersList?.map((buyer) => (
                  <SelectItem key={buyer.recordId || buyer.contactId} value={buyer.recordId || buyer.contactId}>
                    {buyer.firstName} {buyer.lastName}
                    <span className="text-muted-foreground ml-2 text-xs">{buyer.email}</span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Selected buyer summary */}
        {buyerProperties?.buyer && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  {buyerProperties.buyer.firstName} {buyerProperties.buyer.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">{buyerProperties.buyer.email}</p>
              </div>
              <div className="flex gap-4 text-sm">
                {(buyerProperties.buyer.desiredBeds || buyerProperties.buyer.desiredBaths) && (
                  <div className="flex items-center gap-1">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <span>{buyerProperties.buyer.desiredBeds || '?'} bed</span>
                    {buyerProperties.buyer.desiredBaths && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <Bath className="h-4 w-4 text-muted-foreground" />
                        <span>{buyerProperties.buyer.desiredBaths} bath</span>
                      </>
                    )}
                  </div>
                )}
                {buyerProperties.buyer.downPayment && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${buyerProperties.buyer.downPayment.toLocaleString()} down</span>
                  </div>
                )}
                {(buyerProperties.buyer.city || buyerProperties.buyer.preferredLocation) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{buyerProperties.buyer.city || buyerProperties.buyer.preferredLocation}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loadingProperties && buyerId && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <span className="ml-2 text-muted-foreground">Loading properties...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12 text-red-500">
          <p>Error loading properties: {error.message}</p>
        </div>
      )}

      {/* No Buyer Selected */}
      {!buyerId && !loadingBuyers && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Select a buyer above to see all properties scored for them</p>
        </div>
      )}

      {/* Results */}
      {buyerProperties && !loadingProperties && (
        <>
          {/* Unified "In Your System" Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-semibold">
                In Your System
              </h2>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                {buyerProperties.totalCount}
              </Badge>
            </div>

            {buyerProperties.totalCount > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...buyerProperties.priorityMatches, ...buyerProperties.exploreMatches]
                  .sort((a, b) => b.score.score - a.score.score)
                  .map((sp) => (
                    <PropertyCard
                      key={sp.property.recordId}
                      scoredProperty={sp}
                      buyer={buyerProperties.buyer}
                      isSelected={selectedPropertyIds.has(sp.property.recordId)}
                      onToggleSelect={() => togglePropertySelection(sp.property.recordId)}
                      onViewDetails={() => {
                        setSelectedPropertyForView(sp);
                        setViewModalOpen(true);
                      }}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                <Home className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No properties in system yet</p>
              </div>
            )}
          </div>

          {/* Zillow Section */}
          {zillowData?.results && zillowData.results.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-5 w-5 text-teal-500" />
                <h2 className="text-lg font-semibold">
                  Find More on Zillow
                </h2>
                <Badge variant="secondary" className="bg-teal-100 text-teal-700">
                  {zillowData.results.length}
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {zillowData.results.map((listing) => (
                  <ZillowPropertyCard
                    key={listing.zpid}
                    listing={listing}
                    searchType={zillowData.searchType}
                    onSave={(listing) => {
                      setSelectedZillowListing(listing);
                      setZillowModalOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Zillow Loading State */}
          {loadingZillow && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Searching Zillow...</span>
            </div>
          )}

          {/* Stats Footer */}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            Showing {buyerProperties.totalCount} properties in system
            {zillowData?.results && ` + ${zillowData.results.length} from Zillow`}
            {buyerProperties.stats.timeMs && ` • Scored in ${buyerProperties.stats.timeMs}ms`}
          </div>
        </>
      )}

      {/* Save Zillow Modal */}
      <SaveZillowModal
        listing={selectedZillowListing}
        buyerId={buyerId || ''}
        zillowType={zillowData?.searchType || 'Keywords'}
        open={zillowModalOpen}
        onOpenChange={setZillowModalOpen}
      />

      {/* Property View Modal */}
      <PropertyViewModal
        scoredProperty={selectedPropertyForView}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
      />

      {/* Send Properties Modal */}
      {buyerProperties && (
        <SendPropertiesModal
          buyer={buyerProperties.buyer}
          properties={[...buyerProperties.priorityMatches, ...buyerProperties.exploreMatches]
            .filter(sp => selectedPropertyIds.has(sp.property.recordId))}
          open={sendModalOpen}
          onOpenChange={setSendModalOpen}
          onSendSuccess={() => {
            clearSelection();
          }}
        />
      )}

      {/* Floating Selection Bar */}
      {buyerProperties && (
        <PropertySelectionBar
          selectedCount={selectedPropertyIds.size}
          totalCount={buyerProperties.totalCount}
          allSelected={selectedPropertyIds.size === buyerProperties.totalCount && buyerProperties.totalCount > 0}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onSendSelected={() => setSendModalOpen(true)}
        />
      )}
    </div>
  );
}
