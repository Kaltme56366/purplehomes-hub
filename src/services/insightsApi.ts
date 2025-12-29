/**
 * AI Insights API - React Query hooks
 *
 * Provides hooks for fetching AI-generated match insights.
 * Insights are persisted to Airtable's "AI Insight" field for caching.
 */

import { useQuery } from '@tanstack/react-query';
import type { InsightRequest, AIInsight } from '@/lib/aiInsights';
import { generateFallbackInsight } from '@/lib/aiInsights';

const INSIGHTS_API_BASE = '/api/insights';
const AIRTABLE_API_BASE = '/api/airtable';

/**
 * Fetch saved insight from Airtable
 */
async function fetchSavedInsight(matchId: string): Promise<AIInsight | null> {
  try {
    const response = await fetch(
      `${AIRTABLE_API_BASE}?action=get-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${matchId}`
    );

    if (!response.ok) {
      console.warn('[Insights API] Failed to fetch saved insight from Airtable');
      return null;
    }

    const result = await response.json();
    const savedInsight = result.record?.fields?.['AI Insight'];

    if (savedInsight) {
      try {
        const parsed = typeof savedInsight === 'string' ? JSON.parse(savedInsight) : savedInsight;
        console.log('[Insights API] Found saved insight in Airtable');
        return {
          summary: parsed.summary,
          keyStrength: parsed.keyStrength,
          potentialConcern: parsed.potentialConcern,
          suggestedAction: parsed.suggestedAction,
          confidence: parsed.confidence,
          source: 'ai',
        };
      } catch (parseError) {
        console.warn('[Insights API] Failed to parse saved insight:', parseError);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.warn('[Insights API] Error fetching saved insight:', error);
    return null;
  }
}

/**
 * Save insight to Airtable
 */
async function saveInsightToAirtable(matchId: string, insight: AIInsight): Promise<void> {
  try {
    const insightData = {
      summary: insight.summary,
      keyStrength: insight.keyStrength,
      potentialConcern: insight.potentialConcern,
      suggestedAction: insight.suggestedAction,
      confidence: insight.confidence,
      generatedAt: new Date().toISOString(),
    };

    const response = await fetch(
      `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${matchId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            'AI Insight': JSON.stringify(insightData),
          },
        }),
      }
    );

    if (response.ok) {
      console.log('[Insights API] Saved insight to Airtable');
    } else {
      console.warn('[Insights API] Failed to save insight to Airtable');
    }
  } catch (error) {
    console.warn('[Insights API] Error saving insight to Airtable:', error);
  }
}

/**
 * Fetch AI insight for a property-buyer match
 * If matchId is provided, checks Airtable first and saves new insights
 */
async function fetchInsight(input: InsightRequest, matchId?: string): Promise<AIInsight> {
  // If matchId is provided, check Airtable first
  if (matchId) {
    const savedInsight = await fetchSavedInsight(matchId);
    if (savedInsight) {
      return savedInsight;
    }
  }

  try {
    const response = await fetch(INSIGHTS_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      console.warn('[Insights API] Request failed, using fallback');
      return { ...generateFallbackInsight(input), source: 'rules' };
    }

    const data = await response.json();
    const insight: AIInsight = {
      summary: data.summary,
      keyStrength: data.keyStrength,
      potentialConcern: data.potentialConcern,
      suggestedAction: data.suggestedAction,
      confidence: data.confidence,
      source: 'ai',
    };

    // Save to Airtable if matchId is provided
    if (matchId) {
      saveInsightToAirtable(matchId, insight);
    }

    return insight;
  } catch (error) {
    console.warn('[Insights API] Error fetching insight, using fallback:', error);
    return { ...generateFallbackInsight(input), source: 'rules' };
  }
}

/**
 * Hook to fetch AI insight for a match
 *
 * @param input - Match data for insight generation
 * @param matchId - Optional Airtable match record ID for persistence
 * @param enabled - Whether to enable the query (default: true)
 */
export function useMatchInsight(
  input: InsightRequest | null,
  matchId?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['match-insight', matchId, input?.buyerName, input?.propertyAddress, input?.score],
    queryFn: () => fetchInsight(input!, matchId),
    enabled: enabled && !!input?.buyerName && !!input?.propertyAddress,
    staleTime: matchId ? Infinity : 5 * 60 * 1000, // Never re-fetch if saved to Airtable
    gcTime: 10 * 60 * 1000, // Keep in garbage collection for 10 minutes
    retry: 1, // Only retry once
  });
}

/**
 * Build insight request from match data
 */
export function buildInsightRequest(
  buyerName: string,
  propertyAddress: string,
  score: number,
  options: {
    highlights?: string[];
    concerns?: string[];
    distanceMiles?: number;
    stage?: string;
    price?: number;
    beds?: number;
    baths?: number;
  } = {}
): InsightRequest {
  return {
    score,
    highlights: options.highlights || [],
    concerns: options.concerns || [],
    buyerName,
    propertyAddress,
    distanceMiles: options.distanceMiles,
    stage: options.stage,
    price: options.price,
    beds: options.beds,
    baths: options.baths,
  };
}
