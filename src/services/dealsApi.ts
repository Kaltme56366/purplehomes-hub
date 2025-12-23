/**
 * React Query hooks for Deal Pipeline
 *
 * These hooks provide deal-centric views of the matching data,
 * with computed properties for the pipeline UI.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Deal,
  DealFilters,
  PipelineStats,
  DealsByBuyer,
  DealsByProperty,
  StageChangeRequest,
} from '@/types/deals';
import type { MatchDealStage } from '@/types/associations';
import { MATCH_DEAL_STAGES, STAGE_ASSOCIATION_IDS } from '@/types/associations';
import type { PropertyMatch, PropertyDetails, BuyerCriteria, MatchActivity } from '@/types/matching';

const MATCHING_API_BASE = '/api/matching';
const AIRTABLE_API_BASE = '/api/airtable';

// Constants
const STALE_THRESHOLD_DAYS = 7;

/**
 * Compute isStale and daysSinceActivity for a deal
 */
function computeDealMetadata(
  activities: MatchActivity[],
  createdAt?: string
): { isStale: boolean; daysSinceActivity: number; lastActivityAt?: string } {
  // Get most recent activity timestamp
  const sortedActivities = [...(activities || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const lastActivity = sortedActivities[0];
  const lastActivityAt = lastActivity?.timestamp;

  // Fall back to createdAt if no activities
  const lastDate = lastActivityAt
    ? new Date(lastActivityAt)
    : createdAt
    ? new Date(createdAt)
    : new Date();

  const daysSinceActivity = Math.floor(
    (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    isStale: daysSinceActivity >= STALE_THRESHOLD_DAYS,
    daysSinceActivity,
    lastActivityAt,
  };
}

/**
 * Transform raw Airtable match record into a Deal object
 */
function transformToDeal(record: {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
}): Deal | null {
  const f = record.fields;

  // Parse activities JSON
  let activities: MatchActivity[] = [];
  try {
    activities = f.Activities ? JSON.parse(f.Activities as string) : [];
  } catch {
    activities = [];
  }

  // Parse highlights/concerns
  let highlights: string[] = [];
  let concerns: string[] = [];
  try {
    highlights = f.Highlights ? JSON.parse(f.Highlights as string) : [];
    concerns = f.Concerns ? JSON.parse(f.Concerns as string) : [];
  } catch {
    // Keep empty arrays
  }

  const metadata = computeDealMetadata(activities, record.createdTime);

  // Construct property details
  const property: PropertyDetails = {
    recordId: (f['Property Record ID'] as string) || (f.PropertyId as string) || '',
    propertyCode: (f['Property Code'] as string) || '',
    opportunityId: (f['Opportunity ID'] as string) || '',
    address: (f['Property Address'] as string) || 'Unknown',
    city: (f['Property City'] as string) || '',
    state: (f['Property State'] as string) || '',
    zipCode: (f['Property Zip'] as string) || '',
    price: (f['Property Price'] as number) || 0,
    beds: (f['Property Beds'] as number) || 0,
    baths: (f['Property Baths'] as number) || 0,
    sqft: (f['Property Sqft'] as number) || 0,
    heroImage: (f['Property Image'] as string) || '',
    source: f['Property Source'] as PropertyDetails['source'],
  };

  // Construct buyer details
  const buyer: BuyerCriteria = {
    contactId: (f['Contact ID'] as string) || '',
    recordId: (f['Buyer Record ID'] as string) || (f.BuyerId as string) || '',
    firstName: (f['Buyer First Name'] as string) || (f['Buyer Name'] as string)?.split(' ')[0] || '',
    lastName: (f['Buyer Last Name'] as string) || (f['Buyer Name'] as string)?.split(' ').slice(1).join(' ') || '',
    email: (f['Buyer Email'] as string) || '',
  };

  // Skip if missing essential data
  if (!property.address || property.address === 'Unknown') {
    return null;
  }

  const deal: Deal = {
    id: record.id,
    buyerRecordId: buyer.recordId || '',
    propertyRecordId: property.recordId,
    contactId: buyer.contactId,
    propertyCode: property.propertyCode,
    score: (f['Match Score'] as number) || 0,
    distance: (f.Distance as number) || undefined,
    reasoning: (f.Reasoning as string) || '',
    highlights,
    concerns,
    isPriority: (f.IsPriority as boolean) || false,
    status: ((f['Match Stage'] as string) || 'Sent to Buyer') as MatchDealStage,
    activities,
    ghlRelationId: (f['GHL Relation ID'] as string) || undefined,
    createdAt: record.createdTime,
    updatedAt: record.createdTime,
    property,
    buyer,
    isStale: metadata.isStale,
    daysSinceActivity: metadata.daysSinceActivity,
    lastActivityAt: metadata.lastActivityAt,
  };

  return deal;
}

/**
 * Fetch all deals with optional filters
 */
export const useDeals = (filters?: DealFilters) => {
  return useQuery({
    queryKey: ['deals', filters],
    queryFn: async (): Promise<Deal[]> => {
      console.log('[Deals API] Fetching deals with filters:', filters);

      // Build filter formula
      let filterFormula = '';
      if (filters?.stage && filters.stage !== 'all') {
        filterFormula = `{Match Stage}="${filters.stage}"`;
      } else if (filters?.stages && filters.stages.length > 0) {
        const stageConditions = filters.stages.map(s => `{Match Stage}="${s}"`);
        filterFormula = `OR(${stageConditions.join(',')})`;
      }

      const params = new URLSearchParams({
        action: 'list',
        table: 'Property-Buyer Matches',
      });

      if (filterFormula) {
        params.set('filterByFormula', filterFormula);
      }

      const response = await fetch(`${AIRTABLE_API_BASE}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();

      // Transform records to deals
      const deals = (data.records || [])
        .map((r: { id: string; fields: Record<string, unknown>; createdTime?: string }) =>
          transformToDeal(r)
        )
        .filter((d: Deal | null): d is Deal => d !== null);

      // Apply client-side filters
      let filtered = deals;

      if (filters?.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.property.address.toLowerCase().includes(search) ||
            d.buyer.firstName.toLowerCase().includes(search) ||
            d.buyer.lastName.toLowerCase().includes(search)
        );
      }

      if (filters?.minScore) {
        filtered = filtered.filter((d) => d.score >= (filters.minScore || 0));
      }

      if (filters?.onlyStale) {
        filtered = filtered.filter((d) => d.isStale);
      }

      if (filters?.onlyUpcoming) {
        filtered = filtered.filter((d) => d.status === 'Showing Scheduled');
      }

      console.log('[Deals API] Deals fetched:', filtered.length);

      return filtered;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Fetch pipeline statistics for the Overview tab
 */
export const usePipelineStats = () => {
  return useQuery({
    queryKey: ['pipeline-stats'],
    queryFn: async (): Promise<PipelineStats> => {
      console.log('[Deals API] Computing pipeline stats');

      const response = await fetch(
        `${AIRTABLE_API_BASE}?action=list&table=${encodeURIComponent('Property-Buyer Matches')}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch deals for stats');
      }

      const data = await response.json();
      const deals = (data.records || [])
        .map((r: { id: string; fields: Record<string, unknown>; createdTime?: string }) =>
          transformToDeal(r)
        )
        .filter((d: Deal | null): d is Deal => d !== null);

      // Initialize stage counts
      const byStage: Record<string, number> = {};
      MATCH_DEAL_STAGES.forEach((stage) => {
        byStage[stage] = 0;
      });
      byStage['Not Interested'] = 0;

      let needsAttention = 0;
      let pipelineValue = 0;
      let newThisWeek = 0;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      deals.forEach((deal) => {
        // Count by stage
        if (byStage[deal.status] !== undefined) {
          byStage[deal.status]++;
        }

        // Needs attention (stale deals, excluding closed/lost)
        if (
          deal.isStale &&
          deal.status !== 'Closed Deal / Won' &&
          deal.status !== 'Not Interested'
        ) {
          needsAttention++;
        }

        // Pipeline value (sum of property prices for active deals)
        if (deal.status !== 'Closed Deal / Won' && deal.status !== 'Not Interested') {
          pipelineValue += deal.property.price || 0;
        }

        // New this week
        if (deal.createdAt && new Date(deal.createdAt) >= weekAgo) {
          newThisWeek++;
        }
      });

      const stats: PipelineStats = {
        totalDeals: deals.length,
        pipelineValue,
        closingSoon: byStage['Under Contract'] || 0,
        needsAttention,
        newThisWeek,
        byStage: byStage as Record<MatchDealStage, number>,
      };

      console.log('[Deals API] Pipeline stats computed:', stats);

      return stats;
    },
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Fetch deals grouped by stage for Kanban view
 */
export const useDealsByStage = () => {
  return useQuery({
    queryKey: ['deals-by-stage'],
    queryFn: async (): Promise<Record<MatchDealStage, Deal[]>> => {
      console.log('[Deals API] Fetching deals by stage');

      const response = await fetch(
        `${AIRTABLE_API_BASE}?action=list&table=${encodeURIComponent('Property-Buyer Matches')}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      const deals = (data.records || [])
        .map((r: { id: string; fields: Record<string, unknown>; createdTime?: string }) =>
          transformToDeal(r)
        )
        .filter((d: Deal | null): d is Deal => d !== null);

      // Initialize all stages
      const byStage: Record<string, Deal[]> = {};
      MATCH_DEAL_STAGES.forEach((stage) => {
        byStage[stage] = [];
      });
      byStage['Not Interested'] = [];

      // Group deals
      deals.forEach((deal) => {
        if (byStage[deal.status]) {
          byStage[deal.status].push(deal);
        }
      });

      // Sort each stage by score descending
      Object.keys(byStage).forEach((stage) => {
        byStage[stage].sort((a, b) => b.score - a.score);
      });

      console.log('[Deals API] Deals by stage:', Object.keys(byStage).map(s => `${s}: ${byStage[s].length}`).join(', '));

      return byStage as Record<MatchDealStage, Deal[]>;
    },
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Fetch deals grouped by buyer
 */
export const useDealsByBuyer = () => {
  return useQuery({
    queryKey: ['deals-by-buyer'],
    queryFn: async (): Promise<DealsByBuyer[]> => {
      console.log('[Deals API] Fetching deals by buyer');

      const response = await fetch(
        `${AIRTABLE_API_BASE}?action=list&table=${encodeURIComponent('Property-Buyer Matches')}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      const deals = (data.records || [])
        .map((r: { id: string; fields: Record<string, unknown>; createdTime?: string }) =>
          transformToDeal(r)
        )
        .filter((d: Deal | null): d is Deal => d !== null);

      // Group by buyer
      const grouped = new Map<string, DealsByBuyer>();

      deals.forEach((deal) => {
        const buyerId = deal.buyer.contactId || deal.buyer.recordId || 'unknown';

        if (!grouped.has(buyerId)) {
          grouped.set(buyerId, {
            buyer: deal.buyer,
            deals: [],
            totalDeals: 0,
            totalValue: 0,
            activeStages: [],
          });
        }

        const group = grouped.get(buyerId)!;
        group.deals.push(deal);
        group.totalDeals++;
        group.totalValue += deal.property.price || 0;

        if (!group.activeStages.includes(deal.status)) {
          group.activeStages.push(deal.status);
        }
      });

      // Sort by total deals descending
      const result = Array.from(grouped.values()).sort(
        (a, b) => b.totalDeals - a.totalDeals
      );

      console.log('[Deals API] Deals by buyer:', result.length, 'buyers');

      return result;
    },
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Fetch deals grouped by property
 */
export const useDealsByProperty = () => {
  return useQuery({
    queryKey: ['deals-by-property'],
    queryFn: async (): Promise<DealsByProperty[]> => {
      console.log('[Deals API] Fetching deals by property');

      const response = await fetch(
        `${AIRTABLE_API_BASE}?action=list&table=${encodeURIComponent('Property-Buyer Matches')}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      const deals = (data.records || [])
        .map((r: { id: string; fields: Record<string, unknown>; createdTime?: string }) =>
          transformToDeal(r)
        )
        .filter((d: Deal | null): d is Deal => d !== null);

      // Group by property
      const grouped = new Map<string, DealsByProperty>();

      // Define stage order for determining "furthest" stage
      const stageOrder: Record<string, number> = {
        'Sent to Buyer': 1,
        'Interested Buyer': 2,
        'Showing Scheduled': 3,
        'Property Viewed': 4,
        'Offer Made': 5,
        'Under Contract': 6,
        'Closed Deal / Won': 7,
        'Not Interested': 0, // Exit stage
      };

      deals.forEach((deal) => {
        const propertyId = deal.property.recordId || deal.property.propertyCode || 'unknown';

        if (!grouped.has(propertyId)) {
          grouped.set(propertyId, {
            property: deal.property,
            deals: [],
            totalBuyers: 0,
            highestScore: 0,
            furthestStage: 'Sent to Buyer',
          });
        }

        const group = grouped.get(propertyId)!;
        group.deals.push(deal);
        group.totalBuyers++;

        if (deal.score > group.highestScore) {
          group.highestScore = deal.score;
        }

        if (stageOrder[deal.status] > stageOrder[group.furthestStage]) {
          group.furthestStage = deal.status;
        }
      });

      // Sort by total buyers descending
      const result = Array.from(grouped.values()).sort(
        (a, b) => b.totalBuyers - a.totalBuyers
      );

      console.log('[Deals API] Deals by property:', result.length, 'properties');

      return result;
    },
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Fetch stale deals (no activity in 7+ days)
 */
export const useStaleDeals = (limit: number = 5) => {
  return useQuery({
    queryKey: ['stale-deals', limit],
    queryFn: async (): Promise<Deal[]> => {
      console.log('[Deals API] Fetching stale deals, limit:', limit);

      const response = await fetch(
        `${AIRTABLE_API_BASE}?action=list&table=${encodeURIComponent('Property-Buyer Matches')}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      const deals = (data.records || [])
        .map((r: { id: string; fields: Record<string, unknown>; createdTime?: string }) =>
          transformToDeal(r)
        )
        .filter((d: Deal | null): d is Deal => d !== null);

      // Filter to stale deals (excluding closed/lost), sort by stalest first
      const staleDeals = deals
        .filter(
          (d) =>
            d.isStale &&
            d.status !== 'Closed Deal / Won' &&
            d.status !== 'Not Interested'
        )
        .sort((a, b) => (b.daysSinceActivity || 0) - (a.daysSinceActivity || 0))
        .slice(0, limit);

      console.log('[Deals API] Stale deals found:', staleDeals.length);

      return staleDeals;
    },
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Fetch upcoming showings (deals in "Showing Scheduled" stage)
 */
export const useUpcomingShowings = (limit: number = 5) => {
  return useQuery({
    queryKey: ['upcoming-showings', limit],
    queryFn: async (): Promise<Deal[]> => {
      console.log('[Deals API] Fetching upcoming showings, limit:', limit);

      const response = await fetch(
        `${AIRTABLE_API_BASE}?action=list&table=${encodeURIComponent('Property-Buyer Matches')}&filterByFormula=${encodeURIComponent('{Match Stage}="Showing Scheduled"')}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      const deals = (data.records || [])
        .map((r: { id: string; fields: Record<string, unknown>; createdTime?: string }) =>
          transformToDeal(r)
        )
        .filter((d: Deal | null): d is Deal => d !== null)
        .slice(0, limit);

      console.log('[Deals API] Upcoming showings found:', deals.length);

      return deals;
    },
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Update deal stage with activity logging and GHL sync
 * Wraps the existing useUpdateMatchStageWithActivity hook
 */
export const useUpdateDealStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      fromStage,
      toStage,
      contactId,
      propertyAddress,
      opportunityId,
      syncToGhl = true,
    }: StageChangeRequest): Promise<{ success: boolean; ghlRelationId?: string }> => {
      console.log('[Deals API] Updating deal stage:', { dealId, fromStage, toStage });

      // 1. Update Airtable first
      const updateResponse = await fetch(
        `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${dealId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              'Match Stage': toStage,
            },
          }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.json().catch(() => ({ error: 'Stage update failed' }));
        throw new Error(error.error || 'Failed to update deal stage');
      }

      // 2. Add activity to track the change
      const getResponse = await fetch(
        `${AIRTABLE_API_BASE}?action=get-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${dealId}`
      );
      if (getResponse.ok) {
        const currentMatch = await getResponse.json();
        const currentActivities: MatchActivity[] = currentMatch.record?.fields?.Activities
          ? JSON.parse(currentMatch.record.fields.Activities)
          : [];

        const newActivity: MatchActivity = {
          id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'stage-change',
          timestamp: new Date().toISOString(),
          details: `Stage changed from "${fromStage}" to "${toStage}"`,
          metadata: { fromStage, toStage },
        };

        await fetch(
          `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${dealId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                Activities: JSON.stringify([...currentActivities, newActivity]),
              },
            }),
          }
        );
      }

      // 3. Sync to GHL if enabled
      let ghlRelationId: string | undefined;

      if (syncToGhl && contactId && propertyAddress) {
        try {
          const { syncMatchStageToGhl } = await import('./ghlAssociationsApi');

          const relationId = await syncMatchStageToGhl({
            stage: toStage,
            contactId,
            propertyAddress,
            opportunityId,
            stageAssociationIds: STAGE_ASSOCIATION_IDS,
          });

          if (relationId) {
            ghlRelationId = relationId;
            console.log('[Deals API] GHL relation created:', relationId);

            // Save GHL Relation ID back to Airtable
            await fetch(
              `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${dealId}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fields: { 'GHL Relation ID': relationId },
                }),
              }
            );
          }
        } catch (ghlError) {
          console.error('[Deals API] GHL sync failed:', ghlError);
          // Don't throw - Airtable update succeeded
        }
      }

      return { success: true, ghlRelationId };
    },
    onSuccess: () => {
      // Invalidate all deal queries
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-buyer'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-property'] });
      queryClient.invalidateQueries({ queryKey: ['stale-deals'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-showings'] });
      // Also invalidate matching queries
      queryClient.invalidateQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-matches'] });
    },
  });
};
