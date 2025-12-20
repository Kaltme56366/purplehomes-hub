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
} from 'lucide-react';
import { useBuyerProperties, useBuyersList } from '@/services/matchingApi';
import { MatchSectionDivider } from './MatchSectionDivider';
import { MatchScoreBadge } from './MatchScoreBadge';
import type { ScoredProperty, BuyerCriteria } from '@/types/matching';

interface PropertyCardProps {
  scoredProperty: ScoredProperty;
  isExplore?: boolean;
  buyer?: BuyerCriteria;
}

function PropertyCard({ scoredProperty, isExplore = false, buyer }: PropertyCardProps) {
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
    <Card className="p-4 hover:bg-muted/30 transition-colors">
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

          {/* Distance Badge */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
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
    </Card>
  );
}

export function BuyerPropertiesView() {
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);

  const { data: buyersList, isLoading: loadingBuyers } = useBuyersList();
  const { data: buyerProperties, isLoading: loadingProperties, error } = useBuyerProperties(selectedBuyerId);

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
            value={selectedBuyerId || ''}
            onValueChange={(value) => setSelectedBuyerId(value || null)}
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
                {buyerProperties.buyer.desiredBeds && (
                  <div className="flex items-center gap-1">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <span>{buyerProperties.buyer.desiredBeds} bed</span>
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
      {loadingProperties && selectedBuyerId && (
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
      {!selectedBuyerId && !loadingBuyers && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Select a buyer above to see all properties scored for them</p>
        </div>
      )}

      {/* Results */}
      {buyerProperties && !loadingProperties && (
        <>
          {/* Priority Matches Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-semibold">
                Top Matches in Your Area
              </h2>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                {buyerProperties.priorityMatches.length}
              </Badge>
            </div>

            {buyerProperties.priorityMatches.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {buyerProperties.priorityMatches.map((sp) => (
                  <PropertyCard
                    key={sp.property.recordId}
                    scoredProperty={sp}
                    buyer={buyerProperties.buyer}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No properties within 50 miles or in preferred ZIP codes</p>
              </div>
            )}
          </div>

          {/* Section Divider */}
          {buyerProperties.exploreMatches.length > 0 && (
            <MatchSectionDivider
              title="More Properties to Explore"
              subtitle="Properties outside your preferred area that might interest you"
              count={buyerProperties.exploreMatches.length}
            />
          )}

          {/* Explore Matches Section */}
          {buyerProperties.exploreMatches.length > 0 && (
            <div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {buyerProperties.exploreMatches.map((sp) => (
                  <PropertyCard
                    key={sp.property.recordId}
                    scoredProperty={sp}
                    isExplore
                    buyer={buyerProperties.buyer}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stats Footer */}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            Showing {buyerProperties.totalCount} properties
            {buyerProperties.stats.timeMs && ` • Scored in ${buyerProperties.stats.timeMs}ms`}
          </div>
        </>
      )}
    </div>
  );
}
