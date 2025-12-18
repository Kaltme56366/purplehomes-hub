/**
 * React Query hooks for AI Property Matching API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BuyerWithMatches, PropertyWithMatches, RunMatchingResponse } from '@/types/matching';

const MATCHING_API_BASE = '/api/matching';
const AIRTABLE_API_BASE = '/api/airtable';

/**
 * Fetch all buyers with their matches using optimized aggregated endpoint
 * This solves the N+1 query problem by doing server-side aggregation
 */
export const useBuyersWithMatches = () => {
  return useQuery({
    queryKey: ['buyers-with-matches'],
    queryFn: async (): Promise<BuyerWithMatches[]> => {
      console.log('[Matching API] Fetching buyers with matches (aggregated)');

      const response = await fetch(`${MATCHING_API_BASE}/aggregated?type=buyers&limit=100`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch buyers' }));
        throw new Error(error.error || 'Failed to fetch buyers with matches');
      }

      const result = await response.json();

      console.log('[Matching API] Buyers fetched:', {
        count: result.data?.length || 0,
        stats: result.stats,
      });

      // Sort by match count (highest first)
      return (result.data || []).sort((a: BuyerWithMatches, b: BuyerWithMatches) =>
        b.totalMatches - a.totalMatches
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (increased from 2 minutes due to server-side caching)
  });
};

/**
 * Fetch all properties with their matches using optimized aggregated endpoint
 * This solves the N+1 query problem by doing server-side aggregation
 */
export const usePropertiesWithMatches = () => {
  return useQuery({
    queryKey: ['properties-with-matches'],
    queryFn: async (): Promise<PropertyWithMatches[]> => {
      console.log('[Matching API] Fetching properties with matches (aggregated)');

      const response = await fetch(`${MATCHING_API_BASE}/aggregated?type=properties&limit=100`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch properties' }));
        throw new Error(error.error || 'Failed to fetch properties with matches');
      }

      const result = await response.json();

      console.log('[Matching API] Properties fetched:', {
        count: result.data?.length || 0,
        stats: result.stats,
      });

      // Sort by match count (highest first)
      return (result.data || []).sort((a: PropertyWithMatches, b: PropertyWithMatches) =>
        b.totalMatches - a.totalMatches
      );
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
