/**
 * Activity API hooks
 *
 * Provides aggregated activity data across all deals for the global activity feed.
 */

import { useQuery } from '@tanstack/react-query';
import { useDeals } from './dealsApi';
import type { MatchActivity } from '@/types/matching';
import type { Deal } from '@/types/deals';

export interface EnrichedActivity extends MatchActivity {
  dealId: string;
  buyerName: string;
  propertyAddress: string;
  propertyCode?: string;
}

/**
 * Fetch recent activities across all deals
 */
export const useRecentActivities = (limit: number = 15) => {
  const { data: deals, isLoading: dealsLoading, error: dealsError } = useDeals();

  return useQuery({
    queryKey: ['recent-activities', limit, deals?.length],
    queryFn: async (): Promise<EnrichedActivity[]> => {
      if (!deals || deals.length === 0) {
        return [];
      }

      // Collect all activities from all deals
      const allActivities: EnrichedActivity[] = [];

      for (const deal of deals) {
        const activities = deal.activities || [];
        const buyerName = `${deal.buyer?.firstName || ''} ${deal.buyer?.lastName || ''}`.trim() || 'Unknown Buyer';
        const propertyAddress = deal.property?.address || 'Unknown Property';

        for (const activity of activities) {
          allActivities.push({
            ...activity,
            dealId: deal.id,
            buyerName,
            propertyAddress,
            propertyCode: deal.property?.propertyCode,
          });
        }
      }

      // Sort by timestamp (newest first)
      allActivities.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Return limited results
      return allActivities.slice(0, limit);
    },
    enabled: !dealsLoading && !dealsError && !!deals,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
};

/**
 * Get activity statistics
 */
export const useActivityStats = () => {
  const { data: activities } = useRecentActivities(100);

  const stats = {
    total: activities?.length || 0,
    today: 0,
    thisWeek: 0,
    byType: {} as Record<string, number>,
  };

  if (activities) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    for (const activity of activities) {
      const activityDate = new Date(activity.timestamp);

      if (activityDate >= todayStart) {
        stats.today++;
      }
      if (activityDate >= weekStart) {
        stats.thisWeek++;
      }

      stats.byType[activity.type] = (stats.byType[activity.type] || 0) + 1;
    }
  }

  return stats;
};
