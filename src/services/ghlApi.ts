import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Contact, Property, PropertyStatus, PropertyCondition, PropertyType, SyncType } from '@/types';
import { useSyncStore } from '@/store/useSyncStore';

// API Base URL - uses Vercel API routes in production
const API_BASE = '/api/ghl';

// Pipeline IDs
export const SELLER_ACQUISITION_PIPELINE_ID = 'U4FANAMaB1gGddRaaD9x';
export const BUYER_ACQUISITION_PIPELINE_ID = 'FRw9XPyTSnPv8ct0cWcm';
export const DEAL_ACQUISITION_PIPELINE_ID = '2NeLTlKaeMyWOnLXdTCS';

// For backwards compatibility
export const ACQUISITION_PIPELINE_ID = SELLER_ACQUISITION_PIPELINE_ID;

// Types for GHL API responses
export interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  customFields: Record<string, string>;
  dateAdded: string;
  lastActivity: string;
}

export interface GHLCustomField {
  id: string;
  fieldValue: string | string[] | Record<string, unknown>;
}

export interface GHLOpportunity {
  id: string;
  name: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  pipelineId: string;
  pipelineStageId: string;
  monetaryValue: number;
  contactId: string;
  locationId: string;
  assignedTo?: string;
  source?: string;
  lastStatusChangeAt?: string;
  lastStageChangeAt?: string;
  createdAt: string;
  updatedAt: string;
  customFields: GHLCustomField[];
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface GHLMedia {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
}

export interface GHLSocialAccount {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'gmb';
  accountName: string;
  avatar?: string;
  isActive: boolean;
}

export interface GHLSocialPost {
  id: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'in_progress';
  summary: string;
  media: { url: string; type: string; caption?: string }[];
  accountIds: string[];
  scheduleDate?: string;
  createdAt: string;
}

export interface GHLDocument {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface GHLMessage {
  id: string;
  type: 'email' | 'sms';
  contactId: string;
  body: string;
  subject?: string;
  status: string;
}

// API Configuration stored in localStorage for now (will use env vars in Vercel)
export const getApiConfig = () => {
  const stored = localStorage.getItem('ghl_config');
  return stored ? JSON.parse(stored) : { apiKey: '', locationId: '' };
};

export const setApiConfig = (config: { apiKey: string; locationId: string }) => {
  localStorage.setItem('ghl_config', JSON.stringify(config));
};

// Generic fetch wrapper with error handling
// Uses consolidated /api/ghl endpoint with resource query param
const fetchGHL = async <T>(
  resource: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> => {
  const config = getApiConfig();
  
  // Build query string from resource path and additional params
  const [resourcePath, queryString] = resource.split('?');
  const params = new URLSearchParams(queryString || '');
  
  // Parse resource path (e.g., 'opportunities/123' -> resource=opportunities, id=123)
  const pathParts = resourcePath.split('/');
  const resourceName = pathParts[0];
  const resourceId = pathParts[1];
  
  params.set('resource', resourceName);
  if (resourceId) params.set('id', resourceId);
  
  // Add any additional params
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      params.set(key, value);
    });
  }
  
  const response = await fetch(`${API_BASE}?${params.toString()}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-GHL-API-Key': config.apiKey,
      'X-GHL-Location-ID': config.locationId,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Error' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
};

// ============ CONTACTS ============

export const useContacts = (params?: {
  query?: string;
  type?: string;
  tags?: string[];
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['ghl-contacts', params],
    queryFn: () => fetchGHL<{ contacts: GHLContact[] }>(`contacts?${new URLSearchParams({
      ...(params?.query && { query: params.query }),
      ...(params?.type && { type: params.type }),
      ...(params?.limit && { limit: params.limit.toString() }),
    })}`),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000,
  });
};

export const useContact = (contactId: string) => {
  return useQuery({
    queryKey: ['ghl-contact', contactId],
    queryFn: () => fetchGHL<GHLContact>(`contacts/${contactId}`),
    enabled: !!contactId && !!getApiConfig().apiKey,
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (contact: Partial<GHLContact>) =>
      fetchGHL<GHLContact>('contacts', {
        method: 'POST',
        body: JSON.stringify(contact),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...contact }: Partial<GHLContact> & { id: string }) =>
      fetchGHL<GHLContact>(`contacts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(contact),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['ghl-contact', variables.id] });
    },
  });
};

export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (contactId: string) =>
      fetchGHL<void>(`contacts/${contactId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
    },
  });
};

// ============ OPPORTUNITIES (Properties) ============

// Custom field mapping for properties
const PROPERTY_CUSTOM_FIELDS = {
  address: 'property_address',
  city: 'property_city',
  beds: 'property_beds',
  baths: 'property_baths',
  sqft: 'property_sqft',
  condition: 'property_condition',
  propertyType: 'property_type',
  heroImage: 'property_hero_image',
  images: 'property_images',
  description: 'property_description',
  status: 'social_status', // SM-Pending, SM-Posted, etc.
  caption: 'social_caption',
  brandedImage: 'branded_image',
  postedDate: 'posted_date',
  scheduledDate: 'scheduled_date',
};

// Transform GHL Opportunity to Property
export const transformOpportunityToProperty = (opp: GHLOpportunity): Property => {
  const getCustomField = (fieldKey: string): string => {
    const field = opp.customFields?.find(
      (cf) => cf.id === fieldKey || cf.id.includes(fieldKey)
    );
    return typeof field?.fieldValue === 'string' ? field.fieldValue : '';
  };

  const heroImage = getCustomField(PROPERTY_CUSTOM_FIELDS.heroImage);
  const imagesField = getCustomField(PROPERTY_CUSTOM_FIELDS.images);
  const images = imagesField ? imagesField.split(',').map(url => url.trim()).filter(Boolean) : [];
  
  // Parse status from custom field (SM-Pending, SM-Posted, etc.)
  const socialStatus = getCustomField(PROPERTY_CUSTOM_FIELDS.status);
  let status: PropertyStatus = 'pending';
  if (socialStatus.includes('Posted')) status = 'posted';
  else if (socialStatus.includes('Scheduled')) status = 'scheduled';
  else if (socialStatus.includes('Skipped')) status = 'skipped';
  else if (socialStatus.includes('Deleted')) status = 'deleted';
  else if (socialStatus.includes('Processing')) status = 'processing';

  return {
    id: opp.id,
    ghlOpportunityId: opp.id,
    propertyCode: opp.name.split(' ')[0] || opp.id.slice(0, 8),
    address: getCustomField(PROPERTY_CUSTOM_FIELDS.address) || opp.name,
    city: getCustomField(PROPERTY_CUSTOM_FIELDS.city) || '',
    price: opp.monetaryValue || 0,
    beds: parseInt(getCustomField(PROPERTY_CUSTOM_FIELDS.beds)) || 0,
    baths: parseFloat(getCustomField(PROPERTY_CUSTOM_FIELDS.baths)) || 0,
    sqft: parseInt(getCustomField(PROPERTY_CUSTOM_FIELDS.sqft)) || undefined,
    condition: (getCustomField(PROPERTY_CUSTOM_FIELDS.condition) as PropertyCondition) || undefined,
    propertyType: (getCustomField(PROPERTY_CUSTOM_FIELDS.propertyType) as PropertyType) || undefined,
    description: getCustomField(PROPERTY_CUSTOM_FIELDS.description),
    heroImage: heroImage || '/placeholder.svg',
    images: images.length > 0 ? images : [heroImage || '/placeholder.svg'],
    status,
    caption: getCustomField(PROPERTY_CUSTOM_FIELDS.caption),
    brandedImage: getCustomField(PROPERTY_CUSTOM_FIELDS.brandedImage),
    postedDate: getCustomField(PROPERTY_CUSTOM_FIELDS.postedDate),
    scheduledDate: getCustomField(PROPERTY_CUSTOM_FIELDS.scheduledDate),
    createdAt: opp.createdAt,
    isDemo: false,
  };
};

export type PipelineType = 'seller-acquisition' | 'buyer-acquisition' | 'deal-acquisition';

export const useOpportunities = (pipelineType: PipelineType = 'seller-acquisition') => {
  return useQuery({
    queryKey: ['ghl-opportunities', pipelineType],
    queryFn: async () => {
      const data = await fetchGHL<{ opportunities: GHLOpportunity[] }>(
        `opportunities?pipelineType=${pipelineType}`
      );
      return data.opportunities;
    },
    // Removed enabled check - API key should be in environment variables
    // If API key is missing, the fetch will fail and retry logic will handle it
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useUpdateOpportunityStage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      opportunityId, 
      stageId, 
      pipelineType 
    }: { 
      opportunityId: string; 
      stageId: string; 
      pipelineType: PipelineType;
    }) => {
      return fetchGHL<GHLOpportunity>(`opportunities/${opportunityId}`, {
        method: 'PUT',
        body: JSON.stringify({ pipelineStageId: stageId }),
        params: { action: 'update-stage' }
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ghl-opportunities', variables.pipelineType] });
    },
  });
};

export const useProperties = (pipelineId: string = SELLER_ACQUISITION_PIPELINE_ID) => {
  return useQuery({
    queryKey: ['ghl-properties', pipelineId],
    queryFn: async () => {
      const data = await fetchGHL<{ opportunities: GHLOpportunity[] }>(
        `opportunities?pipeline=${pipelineId}`
      );
      return {
        opportunities: data.opportunities,
        properties: data.opportunities.map(transformOpportunityToProperty),
      };
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000,
  });
};

export const useProperty = (opportunityId: string) => {
  return useQuery({
    queryKey: ['ghl-property', opportunityId],
    queryFn: async () => {
      const opp = await fetchGHL<{ opportunity: GHLOpportunity }>(
        `opportunities/${opportunityId}`
      );
      return {
        opportunity: opp.opportunity,
        property: transformOpportunityToProperty(opp.opportunity),
      };
    },
    enabled: !!opportunityId && !!getApiConfig().apiKey,
  });
};

export const useUpdateProperty = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (update: { id: string; customFields?: Record<string, string>; status?: string; monetaryValue?: number }) =>
      fetchGHL<GHLOpportunity>(`opportunities?id=${update.id}`, {
        method: 'PUT',
        body: JSON.stringify(update),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ghl-properties'] });
      queryClient.invalidateQueries({ queryKey: ['ghl-property', variables.id] });
    },
  });
};

export const useSyncProperties = () => {
  const queryClient = useQueryClient();
  const addSyncEntry = useSyncStore((state) => state.addSyncEntry);
  
  return useMutation({
    mutationFn: async () => {
      const startTime = Date.now();
      try {
        const result = await fetchGHL<{ opportunities: GHLOpportunity[]; synced: number }>(
          `opportunities/sync?pipeline=${SELLER_ACQUISITION_PIPELINE_ID}`,
          { method: 'POST' }
        );
        
        // Log successful sync
        addSyncEntry({
          type: 'properties',
          status: 'success',
          recordsProcessed: result.synced || result.opportunities?.length || 0,
          recordsCreated: 0,
          recordsUpdated: result.synced || result.opportunities?.length || 0,
          recordsFailed: 0,
          duration: Date.now() - startTime,
        });
        
        return result;
      } catch (error) {
        // Log failed sync
        addSyncEntry({
          type: 'properties',
          status: 'failed',
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsFailed: 0,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-properties'] });
    },
  });
};

// ============ MEDIA ============

export const useMedia = (folderId?: string) => {
  return useQuery({
    queryKey: ['ghl-media', folderId],
    queryFn: () => fetchGHL<{ files: GHLMedia[] }>(
      `media${folderId ? `?folderId=${folderId}` : ''}`
    ),
    enabled: !!getApiConfig().apiKey,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUploadMedia = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (upload: { file?: File; fileUrl?: string; name: string }) =>
      fetchGHL<GHLMedia>('media/upload', {
        method: 'POST',
        body: JSON.stringify(upload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-media'] });
    },
  });
};

// ============ SOCIAL PLANNER ============

export const useSocialAccounts = () => {
  return useQuery({
    queryKey: ['ghl-social-accounts'],
    queryFn: () => fetchGHL<{ accounts: GHLSocialAccount[] }>('social/accounts'),
    enabled: !!getApiConfig().apiKey,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useSocialPosts = (status?: string) => {
  return useQuery({
    queryKey: ['ghl-social-posts', status],
    queryFn: () => fetchGHL<{ posts: GHLSocialPost[] }>(
      `social/posts${status ? `?status=${status}` : ''}`
    ),
    enabled: !!getApiConfig().apiKey,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateSocialPost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (post: {
      accountIds: string[];
      summary: string;
      media?: { url: string; type?: string; caption?: string }[];
      scheduleDate?: string;
      status?: 'draft' | 'scheduled' | 'published';
      type?: 'post' | 'story' | 'reel';
      followUpComment?: string;
    }) =>
      fetchGHL<GHLSocialPost>('social/posts', {
        method: 'POST',
        body: JSON.stringify(post),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-social-posts'] });
    },
  });
};

export const useUpdateSocialPost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...post }: Partial<GHLSocialPost> & { id: string }) =>
      fetchGHL<GHLSocialPost>(`social/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(post),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-social-posts'] });
    },
  });
};

export const useDeleteSocialPost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postId: string) =>
      fetchGHL<void>(`social/posts/${postId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-social-posts'] });
    },
  });
};

// ============ CUSTOM FIELDS ============

export const useCustomFields = (model: 'contact' | 'opportunity' | 'all' = 'opportunity') => {
  return useQuery({
    queryKey: ['ghl-custom-fields', model],
    queryFn: () => fetchGHL<{ customFields: { id: string; name: string; fieldKey: string; dataType: string }[] }>(
      `custom-fields?model=${model}`
    ),
    enabled: !!getApiConfig().apiKey,
    staleTime: 30 * 60 * 1000, // 30 minutes - these rarely change
  });
};

// ============ DOCUMENTS ============

export const useDocuments = () => {
  return useQuery({
    queryKey: ['ghl-documents'],
    queryFn: () => fetchGHL<{ documents: GHLDocument[] }>('documents'),
    enabled: !!getApiConfig().apiKey,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (document: {
      name: string;
      type: string;
      contactId?: string;
      templateId?: string;
      customValues?: Record<string, string>;
    }) =>
      fetchGHL<GHLDocument>('documents', {
        method: 'POST',
        body: JSON.stringify(document),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-documents'] });
    },
  });
};

export const useSendDocument = () => {
  return useMutation({
    mutationFn: ({ documentId, contactId }: { documentId: string; contactId: string }) =>
      fetchGHL<{ success: boolean }>(`documents/${documentId}/send`, {
        method: 'POST',
        body: JSON.stringify({ contactId }),
      }),
  });
};

// ============ MESSAGES ============

export const useSendEmail = () => {
  return useMutation({
    mutationFn: (email: {
      contactIds: string[];
      subject: string;
      body: string;
      customFields?: Record<string, string>;
    }) =>
      fetchGHL<{ success: boolean; messageIds: string[] }>('messages/email', {
        method: 'POST',
        body: JSON.stringify(email),
      }),
  });
};

export const useSendSMS = () => {
  return useMutation({
    mutationFn: (sms: {
      contactIds: string[];
      body: string;
      customFields?: Record<string, string>;
    }) =>
      fetchGHL<{ success: boolean; messageIds: string[] }>('messages/sms', {
        method: 'POST',
        body: JSON.stringify(sms),
      }),
  });
};

// ============ CONNECTION TEST ============

export const useTestConnection = () => {
  return useMutation({
    mutationFn: async () => {
      const config = getApiConfig();
      if (!config.apiKey || !config.locationId) {
        throw new Error('API Key and Location ID are required');
      }
      
      // Try to fetch contacts as a connection test
      const response = await fetch(`${API_BASE}/contacts?limit=1`, {
        headers: {
          'Content-Type': 'application/json',
          'X-GHL-API-Key': config.apiKey,
          'X-GHL-Location-ID': config.locationId,
        },
      });

      if (!response.ok) {
        throw new Error('Connection failed - check your API credentials');
      }

      return { success: true };
    },
  });
};

// ============ SYNC UTILITIES ============

export const useSyncContacts = () => {
  const queryClient = useQueryClient();
  const addSyncEntry = useSyncStore((state) => state.addSyncEntry);
  
  return useMutation({
    mutationFn: async () => {
      const startTime = Date.now();
      try {
        const result = await fetchGHL<{ contacts: GHLContact[]; synced: number }>('contacts/sync', {
          method: 'POST',
        });
        
        // Log successful sync
        addSyncEntry({
          type: 'contacts',
          status: 'success',
          recordsProcessed: result.synced || result.contacts?.length || 0,
          recordsCreated: 0,
          recordsUpdated: result.synced || result.contacts?.length || 0,
          recordsFailed: 0,
          duration: Date.now() - startTime,
        });
        
        return result;
      } catch (error) {
        // Log failed sync
        addSyncEntry({
          type: 'contacts',
          status: 'failed',
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsFailed: 0,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
    },
  });
};