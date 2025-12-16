/**
 * React Query hooks for AI Property Matching API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BuyerWithMatches, PropertyWithMatches, RunMatchingResponse } from '@/types/matching';

const MATCHING_API_BASE = '/api/matching';
const AIRTABLE_API_BASE = '/api/airtable';

/**
 * Fetch all buyers with their matches
 */
export const useBuyersWithMatches = () => {
  return useQuery({
    queryKey: ['buyers-with-matches'],
    queryFn: async (): Promise<BuyerWithMatches[]> => {
      // Fetch buyers from Airtable
      const buyersRes = await fetch(`${AIRTABLE_API_BASE}?action=list-records&table=Buyers`);
      if (!buyersRes.ok) throw new Error('Failed to fetch buyers');
      const buyersData = await buyersRes.json();

      // For each buyer, fetch their matches
      const buyersWithMatches: BuyerWithMatches[] = await Promise.all(
        (buyersData.records || []).map(async (buyer: any) => {
          const buyerRecordId = buyer.id;

          // Get matches for this buyer
          const matchesFormula = encodeURIComponent(`SEARCH("${buyerRecordId}", ARRAYJOIN({Contact ID}))`);
          const matchesRes = await fetch(
            `${AIRTABLE_API_BASE}?action=list-records&table=Property-Buyer%20Matches`
          );

          let matches: any[] = [];
          if (matchesRes.ok) {
            const matchesData = await matchesRes.json();
            // Filter matches for this buyer
            matches = (matchesData.records || []).filter((match: any) => {
              const contactIds = match.fields['Contact ID'] || [];
              return contactIds.includes(buyerRecordId);
            });
          }

          return {
            contactId: buyer.fields['Contact ID'] || '',
            recordId: buyerRecordId,
            firstName: buyer.fields['First Name'] || '',
            lastName: buyer.fields['Last Name'] || '',
            email: buyer.fields['Email'] || '',
            monthlyIncome: buyer.fields['Monthly Income'],
            monthlyLiabilities: buyer.fields['Monthly Liabilities'],
            downPayment: buyer.fields['Downpayment'],
            desiredBeds: buyer.fields['No. of Bedrooms'],
            desiredBaths: buyer.fields['No. of Bath'],
            city: buyer.fields['City'],
            location: buyer.fields['Location'],
            buyerType: buyer.fields['Buyer Type'],
            matches: matches.map((match: any) => ({
              id: match.id,
              buyerRecordId: buyerRecordId,
              propertyRecordId: match.fields['Property Code']?.[0] || '',
              contactId: buyer.fields['Contact ID'] || '',
              propertyCode: '', // Will be populated from property details
              score: match.fields['Match Score'] || 0,
              reasoning: match.fields['Match Notes'] || '',
              highlights: [],
              status: match.fields['Match Status'] || 'Active',
            })),
            totalMatches: matches.length,
          };
        })
      );

      // Sort by match count (highest first)
      return buyersWithMatches.sort((a, b) => b.totalMatches - a.totalMatches);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Fetch all properties with their matches
 */
export const usePropertiesWithMatches = () => {
  return useQuery({
    queryKey: ['properties-with-matches'],
    queryFn: async (): Promise<PropertyWithMatches[]> => {
      // Fetch properties from Airtable
      const propertiesRes = await fetch(`${AIRTABLE_API_BASE}?action=list-records&table=Properties`);
      if (!propertiesRes.ok) throw new Error('Failed to fetch properties');
      const propertiesData = await propertiesRes.json();

      // For each property, fetch its matches
      const propertiesWithMatches: PropertyWithMatches[] = await Promise.all(
        (propertiesData.records || []).map(async (property: any) => {
          const propertyRecordId = property.id;

          // Get matches for this property
          const matchesRes = await fetch(
            `${AIRTABLE_API_BASE}?action=list-records&table=Property-Buyer%20Matches`
          );

          let matches: any[] = [];
          if (matchesRes.ok) {
            const matchesData = await matchesRes.json();
            // Filter matches for this property
            matches = (matchesData.records || []).filter((match: any) => {
              const propertyIds = match.fields['Property Code'] || [];
              return propertyIds.includes(propertyRecordId);
            });
          }

          return {
            recordId: propertyRecordId,
            propertyCode: property.fields['Property Code'] || '',
            opportunityId: property.fields['Opportunity ID'],
            address: property.fields['Address'] || '',
            city: property.fields['City'] || '',
            state: property.fields['State'],
            beds: property.fields['Beds'] || 0,
            baths: property.fields['Baths'] || 0,
            sqft: property.fields['Sqft'],
            stage: property.fields['Stage'],
            matches: matches.map((match: any) => ({
              id: match.id,
              buyerRecordId: match.fields['Contact ID']?.[0] || '',
              propertyRecordId: propertyRecordId,
              contactId: '', // Will be populated from buyer details
              propertyCode: property.fields['Property Code'] || '',
              score: match.fields['Match Score'] || 0,
              reasoning: match.fields['Match Notes'] || '',
              highlights: [],
              status: match.fields['Match Status'] || 'Active',
            })),
            totalMatches: matches.length,
          };
        })
      );

      // Sort by match count (highest first)
      return propertiesWithMatches.sort((a, b) => b.totalMatches - a.totalMatches);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Run matching for all buyers
 */
export const useRunMatching = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { minScore?: number }): Promise<RunMatchingResponse> => {
      const response = await fetch(`${MATCHING_API_BASE}?action=run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {}),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Matching failed' }));
        throw new Error(error.error || 'Failed to run matching');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all matching queries to refetch
      queryClient.invalidateQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-matches'] });
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
      queryClient.invalidateQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['airtable-buyer-matches'] });
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
      queryClient.invalidateQueries({ queryKey: ['properties-with-matches'] });
    },
  });
};
