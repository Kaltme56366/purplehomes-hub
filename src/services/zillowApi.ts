/**
 * Zillow API Service
 * React Query hooks for Zillow integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ZillowSearchResponse,
  ZillowListing,
  ZillowSearchType,
  SaveZillowPropertyRequest,
  SaveZillowPropertyResponse,
} from '@/types/zillow';

/**
 * Search Zillow for properties matching a buyer's criteria
 */
export const useZillowSearch = (buyerId: string | null) => {
  return useQuery({
    queryKey: ['zillow-search', buyerId],
    queryFn: async (): Promise<ZillowSearchResponse> => {
      if (!buyerId) throw new Error('Buyer ID required');

      const response = await fetch(`/api/zillow/search?buyerId=${buyerId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search Zillow');
      }

      return response.json();
    },
    enabled: !!buyerId,
    staleTime: 15 * 60 * 1000, // 15 minutes - Zillow data doesn't change frequently
    retry: 1, // Only retry once on failure
  });
};

/**
 * Save a Zillow property to the system (Airtable + GHL)
 */
export const useSaveZillowProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      listing: ZillowListing;
      buyerId: string;
      stage: string;
      notes?: string;
      zillowType: ZillowSearchType;
    }): Promise<SaveZillowPropertyResponse> => {
      const response = await fetch('/api/properties/save-from-zillow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save property');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate buyer properties to show new property
      queryClient.invalidateQueries({ queryKey: ['buyer-properties', variables.buyerId] });

      // Invalidate Zillow search to update "already saved" status
      queryClient.invalidateQueries({ queryKey: ['zillow-search', variables.buyerId] });

      // Invalidate aggregated queries
      queryClient.invalidateQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-matches'] });
    },
  });
};

/**
 * Check if a Zillow property (by ZPID) is already saved in the system
 */
export const useIsZillowPropertySaved = (zpid: string | null) => {
  return useQuery({
    queryKey: ['zillow-property-exists', zpid],
    queryFn: async (): Promise<boolean> => {
      if (!zpid) return false;

      const response = await fetch(`/api/properties/check-zillow?zpid=${zpid}`);

      if (!response.ok) {
        return false; // If check fails, assume not saved
      }

      const data = await response.json();
      return data.exists;
    },
    enabled: !!zpid,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
