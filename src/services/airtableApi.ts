import { useQuery } from '@tanstack/react-query';

// Airtable API Configuration
const AIRTABLE_API_BASE = '/api/airtable';

/**
 * Simple property match structure from Airtable
 * Represents which properties have been matched to which buyers
 */
export interface AirtablePropertyMatch {
  id: string;
  contactId: string; // GHL Contact ID
  contactName: string;
  contactEmail: string;
  matchedPropertyIds: string[]; // IDs of properties that match this buyer
  lastMatchedDate?: string;
}

/**
 * Fetch wrapper for Airtable API
 */
const fetchAirtable = async <T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(`${AIRTABLE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Airtable API Error' }));
    throw new Error(error.message || `Airtable API Error: ${response.status}`);
  }

  return response.json();
};

/**
 * Get property matches for a specific buyer/contact from Airtable
 */
export const useBuyerPropertyMatches = (contactId: string) => {
  return useQuery({
    queryKey: ['airtable-buyer-matches', contactId],
    queryFn: () => fetchAirtable<{ matches: AirtablePropertyMatch | null }>(`?action=get-buyer-matches&contactId=${contactId}`),
    enabled: !!contactId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get matched properties for multiple buyers at once (for bulk send operations)
 */
export const useBulkBuyerMatches = (contactIds: string[]) => {
  return useQuery({
    queryKey: ['airtable-bulk-matches', contactIds.sort().join(',')],
    queryFn: () => fetchAirtable<{ matches: Record<string, AirtablePropertyMatch> }>('?action=bulk-matches', {
      method: 'POST',
      body: JSON.stringify({ contactIds }),
    }),
    enabled: contactIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};
