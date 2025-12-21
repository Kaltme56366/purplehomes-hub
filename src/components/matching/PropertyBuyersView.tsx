/**
 * PropertyBuyersView - Two-section buyer view for a selected property
 *
 * Shows ALL buyers scored for a property, split into:
 * - Top Interested Buyers (high scores >= 60)
 * - Other Potential Buyers (scores 30-59)
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
  User,
  Mail,
} from 'lucide-react';
import { usePropertyBuyers, usePropertiesWithMatches } from '@/services/matchingApi';
import { MatchSectionDivider } from './MatchSectionDivider';
import { MatchScoreBadge } from './MatchScoreBadge';
import type { ScoredBuyer, PropertyDetails } from '@/types/matching';

interface BuyerCardProps {
  scoredBuyer: ScoredBuyer;
  property?: PropertyDetails;
}

function BuyerCard({ scoredBuyer, property }: BuyerCardProps) {
  const { buyer, score } = scoredBuyer;

  // Calculate budget ratio if available
  const getBudgetInfo = () => {
    if (!buyer.downPayment || !property?.price) return null;

    const ratio = (buyer.downPayment / property.price) * 100;
    if (ratio >= 20) {
      return { label: 'Strong budget', variant: 'success' as const };
    } else if (ratio >= 10) {
      return { label: 'Good budget', variant: 'default' as const };
    } else {
      return { label: 'Limited budget', variant: 'warning' as const };
    }
  };

  const budgetInfo = getBudgetInfo();

  return (
    <Card className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex gap-4">
        {/* Buyer Avatar */}
        <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
          <User className="h-8 w-8 text-purple-400" />
        </div>

        {/* Buyer Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-sm">
                {buyer.firstName} {buyer.lastName}
              </h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Mail className="h-3 w-3" />
                {buyer.email}
              </p>
            </div>

            {/* Score Badge */}
            <MatchScoreBadge score={score.score} size="sm" showLabel={false} />
          </div>

          {/* Buyer Preferences */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {buyer.desiredBeds && (
              <span className="flex items-center gap-1">
                <Bed className="h-3 w-3" />
                {buyer.desiredBeds} beds
              </span>
            )}
            {buyer.desiredBaths && (
              <span className="flex items-center gap-1">
                <Bath className="h-3 w-3" />
                {buyer.desiredBaths} baths
              </span>
            )}
            {buyer.downPayment && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DollarSign className="h-3 w-3" />
                {buyer.downPayment.toLocaleString()} down
              </span>
            )}
          </div>

          {/* Distance and Location Info */}
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
                  ? '< 1 mi away'
                  : score.distanceMiles < 10
                  ? `${score.distanceMiles.toFixed(1)} mi away`
                  : `${Math.round(score.distanceMiles)} mi away`}
              </Badge>
            )}

            {/* Priority match indicator */}
            {score.isPriority && !score.distanceMiles && (
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                <Target className="h-3 w-3 mr-1" />
                In Preferred ZIP
              </Badge>
            )}

            {/* Budget info */}
            {budgetInfo && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  budgetInfo.variant === 'success' ? 'border-green-200 text-green-700 bg-green-50' :
                  budgetInfo.variant === 'warning' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                  ''
                }`}
              >
                {budgetInfo.label}
              </Badge>
            )}
          </div>

          {/* Location info from buyer */}
          {buyer.preferredLocation && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Looking in: {buyer.preferredLocation}
            </p>
          )}

          {/* Location Reason */}
          {score.locationReason && (
            <p className="text-xs text-muted-foreground mt-1">
              {score.locationReason}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

interface PropertyBuyersViewProps {
  selectedPropertyCode?: string | null;
  onPropertySelect?: (propertyCode: string | null) => void;
}

export function PropertyBuyersView({
  selectedPropertyCode: externalPropertyCode,
  onPropertySelect,
}: PropertyBuyersViewProps = {}) {
  // Use internal state as fallback when no external state is provided
  const [internalPropertyCode, setInternalPropertyCode] = useState<string | null>(null);

  // Use external state if provided, otherwise use internal state
  const propertyCode = externalPropertyCode !== undefined ? externalPropertyCode : internalPropertyCode;

  // Use external handler if provided, otherwise use internal setter
  const handlePropertySelect = (newPropertyCode: string | null) => {
    if (onPropertySelect) {
      onPropertySelect(newPropertyCode);
    } else {
      setInternalPropertyCode(newPropertyCode);
    }
  };

  // Fetch properties list for dropdown (just get first 100)
  const { data: propertiesData, isLoading: loadingProperties } = usePropertiesWithMatches({}, 100);
  const propertiesList = propertiesData?.data || [];

  // Fetch buyers for selected property
  const { data: propertyBuyersData, isLoading: loadingBuyers, error } = usePropertyBuyers(propertyCode);

  // Split buyers into interested (score >= 60) and potential (30-59)
  const interestedBuyers = propertyBuyersData?.buyers.filter((sb) => sb.score.score >= 60) || [];
  const potentialBuyers = propertyBuyersData?.buyers.filter((sb) => sb.score.score < 60) || [];

  return (
    <div className="space-y-6">
      {/* Property Selector */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Home className="h-4 w-4 text-purple-500" />
            <span>Select Property:</span>
          </div>
          <Select
            value={propertyCode || ''}
            onValueChange={(value) => handlePropertySelect(value || null)}
          >
            <SelectTrigger className="w-[400px]">
              <SelectValue placeholder="Choose a property to see interested buyers..." />
            </SelectTrigger>
            <SelectContent>
              {loadingProperties ? (
                <div className="p-2 text-sm text-muted-foreground">Loading properties...</div>
              ) : (
                propertiesList.map((property) => (
                  <SelectItem key={property.recordId} value={property.recordId}>
                    {property.address}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {property.city}{property.state && `, ${property.state}`}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Property Summary (when selected) */}
        {propertyBuyersData && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-start gap-4">
              {/* Property Image */}
              <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                {propertyBuyersData.property.heroImage ? (
                  <img
                    src={propertyBuyersData.property.heroImage}
                    alt={propertyBuyersData.property.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Home className="h-8 w-8 text-purple-300" />
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-base">{propertyBuyersData.property.address}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {propertyBuyersData.property.city}
                  {propertyBuyersData.property.state && `, ${propertyBuyersData.property.state}`}
                  {propertyBuyersData.property.zipCode && ` ${propertyBuyersData.property.zipCode}`}
                </p>

                {/* Property Stats */}
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Bed className="h-4 w-4" />
                    {propertyBuyersData.property.beds}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Bath className="h-4 w-4" />
                    {propertyBuyersData.property.baths}
                  </span>
                  {propertyBuyersData.property.sqft && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Square className="h-4 w-4" />
                      {propertyBuyersData.property.sqft.toLocaleString()}
                    </span>
                  )}
                  {propertyBuyersData.property.price && (
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <DollarSign className="h-4 w-4" />
                      {propertyBuyersData.property.price.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loadingBuyers && propertyCode && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-sm text-muted-foreground">Scoring buyers for this property...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          Failed to load buyers. Please try again.
        </div>
      )}

      {/* Empty State */}
      {!propertyCode && !loadingBuyers && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-purple-100 p-4 mb-4">
            <Home className="h-8 w-8 text-purple-500" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Select a Property</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Choose a property from the dropdown above to see all buyers who match its criteria.
          </p>
        </div>
      )}

      {/* Buyers List */}
      {propertyBuyersData && !loadingBuyers && (
        <div className="space-y-6">
          {/* Top Interested Buyers */}
          {interestedBuyers.length > 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-500" />
                    Top Interested Buyers
                  </h3>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    {interestedBuyers.length} {interestedBuyers.length === 1 ? 'buyer' : 'buyers'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {interestedBuyers.map((scoredBuyer) => (
                    <BuyerCard
                      key={scoredBuyer.buyer.recordId || scoredBuyer.buyer.contactId}
                      scoredBuyer={scoredBuyer}
                      property={propertyBuyersData.property}
                    />
                  ))}
                </div>
              </div>

              {/* Divider */}
              {potentialBuyers.length > 0 && (
                <MatchSectionDivider
                  title="Other Potential Buyers"
                  subtitle="Lower scores but still a potential match"
                  count={potentialBuyers.length}
                />
              )}
            </>
          )}

          {/* Other Potential Buyers */}
          {potentialBuyers.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {potentialBuyers.map((scoredBuyer) => (
                <BuyerCard
                  key={scoredBuyer.buyer.recordId || scoredBuyer.buyer.contactId}
                  scoredBuyer={scoredBuyer}
                  property={propertyBuyersData.property}
                />
              ))}
            </div>
          )}

          {/* No Buyers State */}
          {interestedBuyers.length === 0 && potentialBuyers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-gray-100 p-4 mb-4">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No Matching Buyers</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                No buyers currently match this property's criteria. Try running the matching algorithm to find potential buyers.
              </p>
            </div>
          )}

          {/* Stats Footer */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground text-center">
              Showing {propertyBuyersData.totalCount} total {propertyBuyersData.totalCount === 1 ? 'buyer' : 'buyers'} •
              Scored in {propertyBuyersData.stats.timeMs}ms
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
