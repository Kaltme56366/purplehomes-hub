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

          // Fetch property details for each match
          const matchesWithProperties = await Promise.all(
            matches.map(async (match: any) => {
              const propertyRecordId = match.fields['Property Code']?.[0] || '';
              let propertyDetails = null;

              if (propertyRecordId) {
                try {
                  const propertyRes = await fetch(
                    `${AIRTABLE_API_BASE}?action=get-record&table=Properties&recordId=${propertyRecordId}`
                  );
                  if (propertyRes.ok) {
                    const propertyData = await propertyRes.json();
                    const property = propertyData.record;
                    if (property) {
                      propertyDetails = {
                        recordId: property.id,
                        propertyCode: property.fields['Property Code'] || '',
                        opportunityId: property.fields['Opportunity ID'],
                        address: property.fields['Address'] || '',
                        city: property.fields['City'] || '',
                        state: property.fields['State'],
                        price: property.fields['Price'],
                        beds: property.fields['Beds'] || 0,
                        baths: property.fields['Baths'] || 0,
                        sqft: property.fields['Sqft'],
                        stage: property.fields['Stage'],
                      };
                    }
                  }
                } catch (error) {
                  console.error('Failed to fetch property details:', error);
                }
              }

              return {
                id: match.id,
                buyerRecordId: buyerRecordId,
                propertyRecordId: propertyRecordId,
                contactId: buyer.fields['Contact ID'] || '',
                propertyCode: propertyDetails?.propertyCode || '',
                score: match.fields['Match Score'] || 0,
                distance: match.fields['Distance (miles)'],
                reasoning: match.fields['Match Notes'] || '',
                highlights: [],
                isPriority: match.fields['Is Priority'],
                status: match.fields['Match Status'] || 'Active',
                property: propertyDetails,
              };
            })
          );

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
            matches: matchesWithProperties,
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

          // Fetch buyer details for each match
          const matchesWithBuyers = await Promise.all(
            matches.map(async (match: any) => {
              const buyerRecordId = match.fields['Contact ID']?.[0] || '';
              let buyerDetails = null;

              if (buyerRecordId) {
                try {
                  const buyerRes = await fetch(
                    `${AIRTABLE_API_BASE}?action=get-record&table=Buyers&recordId=${buyerRecordId}`
                  );
                  if (buyerRes.ok) {
                    const buyerData = await buyerRes.json();
                    const buyer = buyerData.record;
                    if (buyer) {
                      buyerDetails = {
                        contactId: buyer.fields['Contact ID'] || '',
                        recordId: buyer.id,
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
                      };
                    }
                  }
                } catch (error) {
                  console.error('Failed to fetch buyer details:', error);
                }
              }

              return {
                id: match.id,
                buyerRecordId: buyerRecordId,
                propertyRecordId: propertyRecordId,
                contactId: buyerDetails?.contactId || '',
                propertyCode: property.fields['Property Code'] || '',
                score: match.fields['Match Score'] || 0,
                distance: match.fields['Distance (miles)'],
                reasoning: match.fields['Match Notes'] || '',
                highlights: [],
                isPriority: match.fields['Is Priority'],
                status: match.fields['Match Status'] || 'Active',
                buyer: buyerDetails,
              };
            })
          );

          return {
            recordId: propertyRecordId,
            propertyCode: property.fields['Property Code'] || '',
            opportunityId: property.fields['Opportunity ID'],
            address: property.fields['Address'] || '',
            city: property.fields['City'] || '',
            state: property.fields['State'],
            price: property.fields['Price'],
            beds: property.fields['Beds'] || 0,
            baths: property.fields['Baths'] || 0,
            sqft: property.fields['Sqft'],
            stage: property.fields['Stage'],
            matches: matchesWithBuyers,
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
