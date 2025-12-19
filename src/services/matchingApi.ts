/**
 * React Query hooks for AI Property Matching API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BuyerWithMatches, PropertyWithMatches, RunMatchingResponse, MatchFilters, MatchActivity, PropertyMatch } from '@/types/matching';
import type { MatchDealStage } from '@/types/associations';

const MATCHING_API_BASE = '/api/matching';
const AIRTABLE_API_BASE = '/api/airtable';

/**
 * Fetch all buyers with their matches using optimized aggregated endpoint
 * This solves the N+1 query problem by doing server-side aggregation
 */
export const useBuyersWithMatches = (filters?: MatchFilters, pageSize: number = 20, offset?: string) => {
  return useQuery({
    queryKey: ['buyers-with-matches', filters, pageSize, offset],
    queryFn: async (): Promise<{ data: BuyerWithMatches[], nextOffset?: string }> => {
      console.log('[Matching API] Fetching buyers with matches (aggregated)', filters, 'pageSize:', pageSize, 'offset:', offset);

      const params = new URLSearchParams({
        type: 'buyers',
        limit: pageSize.toString(),
      });

      // Add offset if provided (for pagination)
      if (offset) params.set('offset', offset);

      // Add filter parameters if provided
      if (filters?.matchStatus) params.set('matchStatus', filters.matchStatus);
      if (filters?.minScore !== undefined) params.set('minScore', filters.minScore.toString());
      if (filters?.priorityOnly) params.set('priorityOnly', 'true');
      if (filters?.matchLimit !== undefined) params.set('matchLimit', filters.matchLimit.toString());
      if (filters?.dateRange) params.set('dateRange', filters.dateRange);

      const response = await fetch(`${MATCHING_API_BASE}/aggregated?${params}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch buyers' }));
        throw new Error(error.error || 'Failed to fetch buyers with matches');
      }

      const result = await response.json();

      console.log('[Matching API] Buyers fetched:', {
        count: result.data?.length || 0,
        stats: result.stats,
        nextOffset: result.nextOffset,
      });

      // Sort by match count (highest first)
      const sortedData = (result.data || []).sort((a: BuyerWithMatches, b: BuyerWithMatches) =>
        b.totalMatches - a.totalMatches
      );

      return {
        data: sortedData,
        nextOffset: result.nextOffset,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (increased from 2 minutes due to server-side caching)
  });
};

/**
 * Fetch all properties with their matches using optimized aggregated endpoint
 * This solves the N+1 query problem by doing server-side aggregation
 */
export const usePropertiesWithMatches = (filters?: MatchFilters, pageSize: number = 20, offset?: string) => {
  return useQuery({
    queryKey: ['properties-with-matches', filters, pageSize, offset],
    queryFn: async (): Promise<{ data: PropertyWithMatches[], nextOffset?: string }> => {
      console.log('[Matching API] Fetching properties with matches (aggregated)', filters, 'pageSize:', pageSize, 'offset:', offset);

      const params = new URLSearchParams({
        type: 'properties',
        limit: pageSize.toString(),
      });

      // Add offset if provided (for pagination)
      if (offset) params.set('offset', offset);

      // Add filter parameters if provided
      if (filters?.matchStatus) params.set('matchStatus', filters.matchStatus);
      if (filters?.minScore !== undefined) params.set('minScore', filters.minScore.toString());
      if (filters?.priorityOnly) params.set('priorityOnly', 'true');
      if (filters?.matchLimit !== undefined) params.set('matchLimit', filters.matchLimit.toString());
      if (filters?.dateRange) params.set('dateRange', filters.dateRange);

      const response = await fetch(`${MATCHING_API_BASE}/aggregated?${params}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch properties' }));
        throw new Error(error.error || 'Failed to fetch properties with matches');
      }

      const result = await response.json();

      console.log('[Matching API] Properties fetched:', {
        count: result.data?.length || 0,
        stats: result.stats,
        nextOffset: result.nextOffset,
      });

      // Sort by match count (highest first)
      const sortedData = (result.data || []).sort((a: PropertyWithMatches, b: PropertyWithMatches) =>
        b.totalMatches - a.totalMatches
      );

      return {
        data: sortedData,
        nextOffset: result.nextOffset,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (increased from 2 minutes due to server-side caching)
  });
};

/**
 * Run matching for all buyers
 */
export const useRunMatching = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { minScore?: number; refreshAll?: boolean }): Promise<RunMatchingResponse> => {
      console.log('[Matching API] Calling run matching with params:', params);
      const response = await fetch(`${MATCHING_API_BASE}?action=run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {}),
      });

      console.log('[Matching API] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Matching failed' }));
        console.error('[Matching API] Error response:', error);
        throw new Error(error.error || 'Failed to run matching');
      }

      const result = await response.json();
      console.log('[Matching API] Success response:', result);
      return result;
    },
    onSuccess: () => {
      // Force immediate refetch of all matching queries
      queryClient.refetchQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['properties-with-matches'] });
    },
  });
};

/**
 * Run matching for a single buyer
 */
export const useRunBuyerMatching = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { contactId: string; minScore?: number }): Promise<RunMatchingResponse> => {
      const { contactId, ...body } = params;
      const response = await fetch(`${MATCHING_API_BASE}?action=run-buyer&contactId=${contactId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Matching failed' }));
        throw new Error(error.error || 'Failed to run buyer matching');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['airtable-buyer-matches'] });
    },
  });
};

/**
 * Run matching for a single property
 */
export const useRunPropertyMatching = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { propertyCode: string; minScore?: number }): Promise<RunMatchingResponse> => {
      const { propertyCode, ...body } = params;
      const response = await fetch(`${MATCHING_API_BASE}?action=run-property&propertyCode=${propertyCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Matching failed' }));
        throw new Error(error.error || 'Failed to run property matching');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['properties-with-matches'] });
    },
  });
};

/**
 * Clear all matches (deletes all records from Property-Buyer Matches table)
 * Use this to clean up matches with incorrect IDs
 */
export const useClearMatches = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; deletedCount: number; message: string }> => {
      console.log('[Matching API] Clearing all matches...');
      const response = await fetch(`${MATCHING_API_BASE}/clear`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to clear matches' }));
        throw new Error(error.error || 'Failed to clear matches');
      }

      const result = await response.json();
      console.log('[Matching API] Clear matches result:', result);
      return result;
    },
    onSuccess: () => {
      // Refresh all matching queries after clearing
      queryClient.refetchQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['properties-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['cache-status'] });
      queryClient.refetchQueries({ queryKey: ['cache', 'matches'] });
    },
  });
};

/**
 * Update match stage (deal status)
 * Updates the match status in Airtable and optionally syncs to GHL
 */
export const useUpdateMatchStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      stage,
      syncToGhl = true,
      // Required params for GHL sync
      contactId,
      propertyAddress,
      opportunityId,
    }: {
      matchId: string;
      stage: MatchDealStage;
      syncToGhl?: boolean;
      /** GHL Contact ID of the buyer - required for GHL sync */
      contactId?: string;
      /** Property address for searching in GHL - required for GHL sync */
      propertyAddress?: string;
      /** GHL Opportunity ID for fallback search */
      opportunityId?: string;
    }): Promise<{ success: boolean; match: PropertyMatch; ghlRelationId?: string }> => {
      console.log('[Matching API] Updating match stage:', matchId, stage, { syncToGhl, contactId, propertyAddress });

      // 1. Update Airtable first (source of truth)
      const response = await fetch(
        `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${matchId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              'Match Stage': stage,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Stage update failed' }));
        throw new Error(error.error || 'Failed to update match stage');
      }

      const result = await response.json();
      console.log('[Matching API] Airtable stage update result:', result);

      let ghlRelationId: string | undefined;

      // 2. Sync to GHL if enabled and we have required data
      if (syncToGhl && contactId && (propertyAddress || opportunityId)) {
        try {
          // Dynamic import to avoid circular dependencies
          const { syncMatchStageToGhl } = await import('./ghlAssociationsApi');
          const { STAGE_ASSOCIATION_IDS } = await import('@/types/associations');

          console.log('[Matching API] Syncing to GHL...');

          const relationId = await syncMatchStageToGhl({
            stage,
            contactId,
            propertyAddress: propertyAddress || '',
            opportunityId,
            stageAssociationIds: STAGE_ASSOCIATION_IDS,
          });

          if (relationId) {
            ghlRelationId = relationId;
            console.log('[Matching API] GHL relation created:', relationId);

            // 3. Store GHL Relation ID back to Airtable for reference
            try {
              await fetch(
                `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${matchId}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    fields: {
                      'GHL Relation ID': relationId,
                    },
                  }),
                }
              );
              console.log('[Matching API] GHL Relation ID saved to Airtable');
            } catch (airtableError) {
              // Log but don't fail - the main sync succeeded
              console.warn('[Matching API] Failed to save GHL Relation ID to Airtable:', airtableError);
            }
          } else {
            console.warn('[Matching API] GHL sync did not return a relation ID');
          }
        } catch (ghlError) {
          // Log but don't fail - Airtable update succeeded
          console.error('[Matching API] GHL sync failed:', ghlError);
        }
      } else if (syncToGhl) {
        console.warn('[Matching API] GHL sync skipped - missing required params:', {
          hasContactId: !!contactId,
          hasPropertyAddress: !!propertyAddress,
          hasOpportunityId: !!opportunityId,
        });
      }

      return { success: true, match: result.record as PropertyMatch, ghlRelationId };
    },
    onSuccess: () => {
      // Refresh all matching queries
      queryClient.refetchQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['properties-with-matches'] });
      // Also invalidate the server-side cache queries so counts/status update
      queryClient.invalidateQueries({ queryKey: ['cache', 'matches'] });
      queryClient.invalidateQueries({ queryKey: ['cache-status'] });
    },
  });
};

/**
 * Add activity to a match
 * Stores activity in the match's activities JSON field in Airtable
 */
export const useAddMatchActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      activity,
    }: {
      matchId: string;
      activity: Omit<MatchActivity, 'id' | 'timestamp'>;
    }): Promise<{ success: boolean; activity: MatchActivity }> => {
      console.log('[Matching API] Adding activity to match:', matchId, activity);

      // First, fetch the current activities
      const getResponse = await fetch(`${AIRTABLE_API_BASE}?table=Property-Buyer Matches&id=${matchId}`);
      if (!getResponse.ok) {
        throw new Error('Failed to fetch current match data');
      }

      const currentMatch = await getResponse.json();
      const currentActivities: MatchActivity[] = currentMatch.record?.fields?.Activities
        ? JSON.parse(currentMatch.record.fields.Activities)
        : [];

      // Create new activity with ID and timestamp
      const newActivity: MatchActivity = {
        ...activity,
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };

      // Append new activity
      const updatedActivities = [...currentActivities, newActivity];

      // Update Airtable
      const response = await fetch(`${AIRTABLE_API_BASE}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'Property-Buyer Matches',
          id: matchId,
          fields: {
            Activities: JSON.stringify(updatedActivities),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Activity add failed' }));
        throw new Error(error.error || 'Failed to add activity');
      }

      console.log('[Matching API] Activity added successfully');

      return { success: true, activity: newActivity };
    },
    onSuccess: () => {
      // Refresh matching queries to get updated activities
      queryClient.refetchQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.refetchQueries({ queryKey: ['properties-with-matches'] });
    },
  });
};

/**
 * Combined hook to update stage and add activity in one operation
 * This is the primary hook for stage changes as it logs the change
 */
export const useUpdateMatchStageWithActivity = () => {
  const updateStage = useUpdateMatchStage();
  const addActivity = useAddMatchActivity();

  return useMutation({
    mutationFn: async ({
      matchId,
      fromStage,
      toStage,
      // GHL sync params - passed through to useUpdateMatchStage
      syncToGhl = true,
      contactId,
      propertyAddress,
      opportunityId,
    }: {
      matchId: string;
      fromStage: MatchDealStage;
      toStage: MatchDealStage;
      /** Whether to sync to GHL (default: true) */
      syncToGhl?: boolean;
      /** GHL Contact ID of the buyer - required for GHL sync */
      contactId?: string;
      /** Property address for searching in GHL - required for GHL sync */
      propertyAddress?: string;
      /** GHL Opportunity ID for fallback search */
      opportunityId?: string;
    }): Promise<{ success: boolean; ghlRelationId?: string }> => {
      // Update the stage first (includes GHL sync)
      const stageResult = await updateStage.mutateAsync({
        matchId,
        stage: toStage,
        syncToGhl,
        contactId,
        propertyAddress,
        opportunityId,
      });

      // Then log the activity
      await addActivity.mutateAsync({
        matchId,
        activity: {
          type: 'stage-change',
          details: `Stage changed from "${fromStage}" to "${toStage}"`,
          metadata: {
            fromStage,
            toStage,
          },
        },
      });

      return { success: true, ghlRelationId: stageResult.ghlRelationId };
    },
  });
};
