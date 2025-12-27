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

// ============ GHL STAGE SYNC HELPER FUNCTIONS ============

/** Property Custom Object key in GHL */
const PROPERTY_OBJECT_KEY = 'custom_objects.properties';

/** Response type for property record search */
interface PropertyRecordSearchResult {
  id: string;
  objectKey: string;
  properties?: Record<string, unknown>;
}

/**
 * Search for a property record in GHL by address, with fallback to Opportunity ID
 *
 * @param propertyAddress - Property address for search (primary method)
 * @param opportunityId - GHL Opportunity ID for fallback search (unique identifier)
 * @returns Property record object with id, or null if not found
 */
export const searchPropertyRecord = async (
  propertyAddress: string,
  opportunityId?: string
): Promise<PropertyRecordSearchResult | null> => {
  // First try: Search by property address (searchable field)
  if (propertyAddress) {
    console.log('[GHL Sync] Searching property by address:', propertyAddress);

    try {
      const queryResponse = await fetch(
        `${API_BASE}?resource=objects&objectKey=${PROPERTY_OBJECT_KEY}&action=records-search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: 1,
            pageLimit: 10,
            query: propertyAddress,
          }),
        }
      );

      if (queryResponse.ok) {
        const data = await queryResponse.json();
        if (data.records?.length > 0) {
          console.log('[GHL Sync] Found property by address:', data.records[0].id);
          return data.records[0];
        }
      }
    } catch (error) {
      console.error('[GHL Sync] Error searching by address:', error);
    }
  }

  // Fallback: Search by Opportunity ID if provided (unique field)
  if (opportunityId) {
    console.log('[GHL Sync] Property not found by address, trying Opportunity ID:', opportunityId);

    try {
      const filterResponse = await fetch(
        `${API_BASE}?resource=objects&objectKey=${PROPERTY_OBJECT_KEY}&action=records-search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: 1,
            pageLimit: 10,
            filters: [
              {
                field: 'custom_objects.properties.opportunity_id',
                operator: 'eq',
                value: opportunityId,
              },
            ],
          }),
        }
      );

      if (filterResponse.ok) {
        const data = await filterResponse.json();
        if (data.records?.length > 0) {
          console.log('[GHL Sync] Found property by Opportunity ID:', data.records[0].id);
          return data.records[0];
        }
      }
    } catch (error) {
      console.error('[GHL Sync] Error searching by Opportunity ID:', error);
    }
  }

  console.warn(
    `[GHL Sync] Property not found in GHL: ${propertyAddress} (opportunityId: ${opportunityId || 'N/A'})`
  );
  return null;
};

/** Response type for creating a relation */
interface CreateRelationResult {
  id: string;
  firstObjectKey: string;
  firstRecordId: string;
  secondObjectKey: string;
  secondRecordId: string;
  associationId: string;
  locationId: string;
}

/**
 * Create a relation between a Contact and a Property Custom Object
 * using a specific association ID (corresponding to the deal stage)
 *
 * @param contactId - GHL Contact ID of the buyer (firstRecordId)
 * @param propertyRecordId - GHL Property Custom Object record ID (secondRecordId)
 * @param associationId - The association ID for the specific stage
 * @returns Created relation object, or null if creation failed
 */
export const createContactPropertyRelation = async (params: {
  contactId: string;
  propertyRecordId: string;
  associationId: string;
}): Promise<CreateRelationResult | null> => {
  const { contactId, propertyRecordId, associationId } = params;

  console.log('[GHL Sync] Creating relation:', {
    contactId,
    propertyRecordId,
    associationId,
  });

  try {
    const response = await fetch(`${API_BASE}?resource=associations&action=relations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        associationId,
        firstRecordId: contactId,
        secondRecordId: propertyRecordId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[GHL Sync] Failed to create relation:', errorData);
      return null;
    }

    const data = await response.json();
    console.log('[GHL Sync] Relation created successfully:', data.id);
    return data;
  } catch (error) {
    console.error('[GHL Sync] Exception creating relation:', error);
    return null;
  }
};

/**
 * Delete a GHL association relation by its ID
 *
 * @param relationId - The GHL relation ID to delete
 * @returns True if deletion was successful, false otherwise
 */
export const deleteAssociationRelation = async (relationId: string): Promise<boolean> => {
  console.log('[GHL Sync] Deleting previous relation:', relationId);

  try {
    // Use the associations API endpoint: DELETE /associations/relations/:relationId
    const response = await fetch(
      `${API_BASE}?resource=associations&action=relations&id=${relationId}`,
      { method: 'DELETE' }
    );

    if (response.ok || response.status === 204) {
      console.log('[GHL Sync] Previous relation deleted successfully');
      return true;
    }

    const errorData = await response.json().catch(() => ({}));
    console.error('[GHL Sync] Failed to delete previous relation:', errorData);
    return false;
  } catch (error) {
    console.error('[GHL Sync] Exception deleting previous relation:', error);
    return false;
  }
};

/**
 * Sync a match stage change to GHL by creating a relation
 *
 * This function orchestrates the full GHL sync process:
 * 1. Deletes the previous relation if provided (stage change)
 * 2. Gets the association ID for the stage
 * 3. Searches for the property record in GHL
 * 4. Creates the relation between contact and property
 *
 * @param params - Parameters for syncing to GHL
 * @returns The GHL relation ID if successful, or null if sync failed
 */
export const syncMatchStageToGhl = async (params: {
  stage: string;
  contactId: string;
  propertyAddress: string;
  opportunityId?: string;
  stageAssociationIds: Record<string, string>;
  previousRelationId?: string; // Previous GHL relation ID to delete when changing stages
}): Promise<string | null> => {
  const { stage, contactId, propertyAddress, opportunityId, stageAssociationIds, previousRelationId } = params;

  console.log('[GHL Sync] syncMatchStageToGhl called with:', {
    stage,
    contactId,
    propertyAddress,
    opportunityId,
    previousRelationId: previousRelationId || '(none - will not delete)',
    hasStageAssociationIds: !!stageAssociationIds,
  });

  // 1. Delete previous relation if provided (stage change scenario)
  if (previousRelationId) {
    console.log('[GHL Sync] Deleting previous relation:', previousRelationId);
    await deleteAssociationRelation(previousRelationId);
  } else {
    console.log('[GHL Sync] No previous relation ID provided, skipping deletion');
  }

  // 2. Get association ID for this stage
  const associationId = stageAssociationIds[stage];
  if (!associationId) {
    console.warn(`[GHL Sync] No association ID found for stage: ${stage}`);
    return null;
  }

  // 3. Search for property record in GHL
  const propertyRecord = await searchPropertyRecord(propertyAddress, opportunityId);
  if (!propertyRecord) {
    console.warn(
      `[GHL Sync] Property not found in GHL, skipping sync: ${propertyAddress}`
    );
    return null;
  }

  // 4. Create relation
  const relation = await createContactPropertyRelation({
    contactId,
    propertyRecordId: propertyRecord.id,
    associationId,
  });

  if (relation) {
    console.log('[GHL Sync] Successfully synced to GHL, relation ID:', relation.id);
    return relation.id;
  }

  return null;
};
