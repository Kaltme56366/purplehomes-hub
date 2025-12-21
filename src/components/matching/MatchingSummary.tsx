/**
 * MatchingSummary - Dashboard summary for the Matching page
 *
 * Shows immediate value on page load:
 * - 3 key stats: Total Matches, New Today, Need Follow-up
 * - Top 5 buyers by match count
 * - Top 5 properties by match count
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Target,
  TrendingUp,
  Bell,
  Users,
  Home,
  ArrowRight,
  MapPin,
  Mail,
} from 'lucide-react';
import { useBuyersWithMatches, usePropertiesWithMatches } from '@/services/matchingApi';
import { useMatchingData } from '@/hooks/useCache';

interface MatchingSummaryProps {
  onSelectBuyer: (buyerId: string) => void;
  onViewProperty: (propertyCode: string) => void;
}

export function MatchingSummary({ onSelectBuyer, onViewProperty }: MatchingSummaryProps) {
  // Get cache data for accurate total counts
  const { matchesCount, isLoading: loadingCache } = useMatchingData();

  // Get top 5 buyers and properties
  const { data: topBuyersData, isLoading: loadingBuyers } = useBuyersWithMatches({}, 5);
  const { data: topPropertiesData, isLoading: loadingProperties } = usePropertiesWithMatches({}, 5);

  const topBuyers = topBuyersData?.data || [];
  const topProperties = topPropertiesData?.data || [];

  // Calculate approximate "New Today" and "Need Follow-up" from visible data
  // Note: This is approximate as we only fetch top 5 buyers/properties
  const calculateApproximateStats = () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let newToday = 0;
    let needFollowUp = 0;

    topBuyers.forEach((buyer) => {
      buyer.matches.forEach((match) => {
        if (match.createdAt && new Date(match.createdAt) >= yesterday) {
          newToday++;
        }
        if (match.status === 'Sent to Buyer') {
          needFollowUp++;
        }
      });
    });

    return { newToday, needFollowUp };
  };

  const { newToday, needFollowUp } = calculateApproximateStats();

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Matches */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5" />
          <div className="relative p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-100">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Matches</p>
                {loadingCache ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">{matchesCount}</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* New Today */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5" />
          <div className="relative p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">New Today</p>
                {loadingBuyers ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-foreground">{newToday}</p>
                    <p className="text-xs text-muted-foreground">~</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Need Follow-up */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5" />
          <div className="relative p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-100">
                <Bell className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Need Follow-up</p>
                {loadingBuyers ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-foreground">{needFollowUp}</p>
                    <p className="text-xs text-muted-foreground">~</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Disclaimer for approximate stats */}
      {(newToday > 0 || needFollowUp > 0) && (
        <p className="text-xs text-muted-foreground text-center -mt-2">
          ~ Approximate counts based on top buyers
        </p>
      )}

      {/* Top Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Buyers */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Top Buyers by Matches
              </h3>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                Top 5
              </Badge>
            </div>

            {loadingBuyers ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : topBuyers.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No buyers with matches yet
              </div>
            ) : (
              <div className="space-y-2">
                {topBuyers.map((buyer, index) => (
                  <div
                    key={buyer.recordId || buyer.contactId}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-semibold text-purple-700">
                      {index + 1}
                    </div>

                    {/* Buyer Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {buyer.firstName} {buyer.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {buyer.email}
                      </p>
                    </div>

                    {/* Match Count */}
                    <Badge variant="secondary" className="flex-shrink-0">
                      {buyer.totalMatches} {buyer.totalMatches === 1 ? 'match' : 'matches'}
                    </Badge>

                    {/* View Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onSelectBuyer(buyer.recordId || buyer.contactId)}
                    >
                      View
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Top Properties */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Home className="h-5 w-5 text-purple-500" />
                Top Properties by Interest
              </h3>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                Top 5
              </Badge>
            </div>

            {loadingProperties ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : topProperties.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No properties with matches yet
              </div>
            ) : (
              <div className="space-y-2">
                {topProperties.map((property, index) => (
                  <div
                    key={property.recordId}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-semibold text-purple-700">
                      {index + 1}
                    </div>

                    {/* Property Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{property.address}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {property.city}
                        {property.state && `, ${property.state}`}
                      </p>
                    </div>

                    {/* Buyer Count */}
                    <Badge variant="secondary" className="flex-shrink-0">
                      {property.totalMatches} {property.totalMatches === 1 ? 'buyer' : 'buyers'}
                    </Badge>

                    {/* View Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onViewProperty(property.recordId)}
                    >
                      View
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Manual Selection CTA */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Or select manually from the dropdown below
        </p>
      </div>
    </div>
  );
}
