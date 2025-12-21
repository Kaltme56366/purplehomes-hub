import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CacheStatus, CacheEntry, PropertiesCacheData, BuyersCacheData, MatchesCacheData, CacheKey } from '@/types/cache';

const CACHE_API_BASE = '/api/cache';

/**
 * Get cache status - shows what's cached vs what's available
 */
export const useCacheStatus = () => {
  return useQuery({
    queryKey: ['cache-status'],
    queryFn: async (): Promise<CacheStatus> => {
      const response = await fetch(`${CACHE_API_BASE}?action=status`);
      if (!response.ok) throw new Error('Failed to fetch cache status');
      return response.json();
    },
    staleTime: 30 * 1000, // Check every 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
};

/**
 * Get cached properties data
 */
export const useCachedProperties = () => {
  return useQuery({
    queryKey: ['cache', 'properties'],
    queryFn: async (): Promise<CacheEntry<PropertiesCacheData>> => {
      const response = await fetch(`${CACHE_API_BASE}?action=get&cacheKey=properties`);
      if (!response.ok) throw new Error('Failed to fetch properties cache');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get cached buyers data
 */
export const useCachedBuyers = () => {
  return useQuery({
    queryKey: ['cache', 'buyers'],
    queryFn: async (): Promise<CacheEntry<BuyersCacheData>> => {
      const response = await fetch(`${CACHE_API_BASE}?action=get&cacheKey=buyers`);
      if (!response.ok) throw new Error('Failed to fetch buyers cache');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get cached matches data
 */
export const useCachedMatches = () => {
  return useQuery({
    queryKey: ['cache', 'matches'],
    queryFn: async (): Promise<CacheEntry<MatchesCacheData>> => {
      const response = await fetch(`${CACHE_API_BASE}?action=get&cacheKey=matches`);
      if (!response.ok) throw new Error('Failed to fetch matches cache');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Sync cache from Airtable
 */
export const useSyncCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cacheKey: CacheKey | 'all' = 'all') => {
      const response = await fetch(`${CACHE_API_BASE}?action=sync&cacheKey=${cacheKey}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Sync failed');
      return response.json();
    },
    onSuccess: (_, cacheKey) => {
      // Invalidate relevant queries
      if (cacheKey === 'all') {
        queryClient.invalidateQueries({ queryKey: ['cache'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['cache', cacheKey] });
      }
      queryClient.invalidateQueries({ queryKey: ['cache-status'] });
    },
  });
};

/**
 * Combined hook for matching page - returns cached data with status
 */
export const useMatchingData = () => {
  const status = useCacheStatus();
  const properties = useCachedProperties();
  const buyers = useCachedBuyers();
  const matches = useCachedMatches();
  const sync = useSyncCache();

  const isLoading = properties.isLoading || buyers.isLoading || matches.isLoading;
  const error = properties.error || buyers.error || matches.error;

  // Helper to get matches for a specific buyer
  const getMatchesForBuyer = (buyerId: string) => {
    if (!matches.data?.data) return [];
    const matchIds = matches.data.data.buyerIndex[buyerId] || [];
    return matchIds
      .map(id => matches.data!.data.records.find(m => m.id === id))
      .filter(Boolean);
  };

  // Helper to get matches for a specific property
  const getMatchesForProperty = (propertyId: string) => {
    if (!matches.data?.data) return [];
    const matchIds = matches.data.data.propertyIndex[propertyId] || [];
    return matchIds
      .map(id => matches.data!.data.records.find(m => m.id === id))
      .filter(Boolean);
  };

  return {
    // Status
    status: status.data,
    isStale: status.data?.isStale || false,
    newPropertiesAvailable: status.data?.newPropertiesAvailable || 0,
    newBuyersAvailable: status.data?.newBuyersAvailable || 0,

    // Data
    properties: properties.data?.data?.records || [],
    buyers: buyers.data?.data?.records || [],
    matches: matches.data?.data?.records || [],

    // Metadata
    propertiesCount: properties.data?.recordCount || 0,
    buyersCount: buyers.data?.recordCount || 0,
    matchesCount: matches.data?.recordCount || 0,
    lastSynced: properties.data?.lastSynced,

    // Helpers
    getMatchesForBuyer,
    getMatchesForProperty,

    // Actions
    syncAll: () => sync.mutate('all'),
    syncProperties: () => sync.mutate('properties'),
    syncBuyers: () => sync.mutate('buyers'),
    syncMatches: () => sync.mutate('matches'),
    isSyncing: sync.isPending,

    // State
    isLoading,
    error,
  };
};
