/**
 * GHL Custom Objects & Associations API Service
 *
 * Handles API calls for GHL Custom Objects and Associations,
 * used for buyer-property matching with many-to-many relationships.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GHLAssociation,
  GHLAssociationLabel,
  GHLRelation,
  GHLAssociationsResponse,
  GHLRelationsResponse,
  AssociationLabelMap,
  CachedAssociationData,
  CreateRelationRequest,
  UpdateRelationLabelRequest,
} from '@/types/associations';

// API Base URL - uses Vercel API routes
const API_BASE = '/api/ghl';

// Cache configuration
const ASSOCIATION_CACHE_KEY = 'ghl_association_labels';
const ASSOCIATION_CACHE_TTL = 60 * 60 * 1000; // 60 minutes

/**
 * Get cached label map from localStorage (synchronous)
 */
export const getCachedLabelMap = (): AssociationLabelMap | null => {
  try {
    const cached = localStorage.getItem(ASSOCIATION_CACHE_KEY);
    if (!cached) return null;

    const data: CachedAssociationData = JSON.parse(cached);
    if (new Date(data.expiresAt) < new Date()) {
      localStorage.removeItem(ASSOCIATION_CACHE_KEY);
      return null;
    }

    return data.labelMap;
  } catch {
    return null;
  }
};

/**
 * Get label ID by name from cache (synchronous helper)
 */
export const getLabelIdByName = (labelName: string): string | null => {
  const labelMap = getCachedLabelMap();
  return labelMap?.[labelName] || null;
};

/**
 * Store associations data in localStorage cache
 */
const cacheAssociationData = (
  associations: GHLAssociation[],
  labels: GHLAssociationLabel[],
  locationId: string
): void => {
  const labelMap: AssociationLabelMap = {};
  labels.forEach(label => {
    labelMap[label.name] = label.id;
  });

  const cacheData: CachedAssociationData = {
    associations,
    labels,
    labelMap,
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ASSOCIATION_CACHE_TTL).toISOString(),
    locationId,
  };

  try {
    localStorage.setItem(ASSOCIATION_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache association data:', error);
  }
};

/**
 * Fetch associations from API
 */
const fetchAssociations = async (): Promise<GHLAssociationsResponse> => {
  const response = await fetch(`${API_BASE}?resource=associations`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Error' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  const data = await response.json();

  // Cache the response
  if (data.associations && data.labels) {
    cacheAssociationData(data.associations, data.labels, data.meta?.locationId || '');
  }

  return data;
};

/**
 * Fetch relations for an object
 */
const fetchRelations = async (
  objectKey: string,
  recordId?: string
): Promise<GHLRelationsResponse> => {
  const params = new URLSearchParams({
    resource: 'objects',
    objectKey,
    action: 'relations',
  });
  if (recordId) params.set('recordId', recordId);

  const response = await fetch(`${API_BASE}?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Error' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
};

/**
 * Create a new relation
 */
const createRelation = async (
  objectKey: string,
  data: CreateRelationRequest
): Promise<GHLRelation> => {
  const params = new URLSearchParams({
    resource: 'objects',
    objectKey,
    action: 'relations',
  });

  const response = await fetch(`${API_BASE}?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Error' }));
    throw new Error(error.message || `Failed to create relation`);
  }

  return response.json();
};

/**
 * Update relation label
 */
const updateRelationLabel = async (
  objectKey: string,
  relationId: string,
  data: UpdateRelationLabelRequest
): Promise<GHLRelation> => {
  const params = new URLSearchParams({
    resource: 'objects',
    objectKey,
    action: 'relations',
    id: relationId,
  });

  const response = await fetch(`${API_BASE}?${params}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Error' }));
    throw new Error(error.message || `Failed to update relation`);
  }

  return response.json();
};

/**
 * Delete a relation
 */
const deleteRelation = async (objectKey: string, relationId: string): Promise<void> => {
  const params = new URLSearchParams({
    resource: 'objects',
    objectKey,
    action: 'relations',
    id: relationId,
  });

  const response = await fetch(`${API_BASE}?${params}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({ message: 'API Error' }));
    throw new Error(error.message || `Failed to delete relation`);
  }
};

// ============ REACT QUERY HOOKS ============

/**
 * Hook to fetch all associations and labels for the location
 */
export const useAssociations = () => {
  return useQuery({
    queryKey: ['ghl-associations'],
    queryFn: fetchAssociations,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    retryDelay: 1000,
  });
};

/**
 * Hook that provides just the label data with helper functions
 */
export const useAssociationLabels = () => {
  const { data, ...rest } = useAssociations();

  const labels = data?.labels || [];
  const labelMap: AssociationLabelMap = {};
  labels.forEach(label => {
    labelMap[label.name] = label.id;
  });

  return {
    ...rest,
    labels,
    labelMap,
    getLabelId: (name: string) => labelMap[name] || null,
    associations: data?.associations || [],
  };
};

/**
 * Hook to fetch relations for a specific object
 */
export const useObjectRelations = (
  objectKey: string,
  recordId?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['ghl-relations', objectKey, recordId],
    queryFn: () => fetchRelations(objectKey, recordId),
    enabled: options?.enabled !== false && !!objectKey,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to create a new relation
 */
export const useCreateRelation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      objectKey,
      ...data
    }: CreateRelationRequest & { objectKey: string }) => createRelation(objectKey, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ghl-relations', variables.objectKey],
      });
    },
  });
};

/**
 * Hook to update a relation's label
 */
export const useUpdateRelationLabel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      objectKey,
      relationId,
      labelId,
    }: {
      objectKey: string;
      relationId: string;
      labelId: string;
    }) => updateRelationLabel(objectKey, relationId, { labelId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ghl-relations', variables.objectKey],
      });
    },
  });
};

/**
 * Hook to delete a relation
 */
export const useDeleteRelation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      objectKey,
      relationId,
    }: {
      objectKey: string;
      relationId: string;
    }) => deleteRelation(objectKey, relationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ghl-relations', variables.objectKey],
      });
    },
  });
};

/**
 * Hook to force refresh the association cache
 */
export const useRefreshAssociations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem(ASSOCIATION_CACHE_KEY);
      await queryClient.invalidateQueries({ queryKey: ['ghl-associations'] });
      return queryClient.refetchQueries({ queryKey: ['ghl-associations'] });
    },
  });
};

/**
 * Hook to test the associations API (for Settings page)
 */
export const useTestAssociationsApi = () => {
  return useMutation({
    mutationFn: async () => {
      console.log('[TestAssociationsAPI] Fetching associations...');
      const data = await fetchAssociations();
      console.log('[TestAssociationsAPI] Response:', data);
      return data;
    },
  });
};
