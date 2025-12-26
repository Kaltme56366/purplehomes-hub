/**
 * AI Insights API - React Query hooks
 *
 * Provides hooks for fetching AI-generated match insights.
 */

import { useQuery } from '@tanstack/react-query';
import type { InsightRequest, AIInsight } from '@/lib/aiInsights';
import { generateFallbackInsight } from '@/lib/aiInsights';

const INSIGHTS_API_BASE = '/api/insights';

/**
 * Fetch AI insight for a property-buyer match
 */
async function fetchInsight(input: InsightRequest): Promise<AIInsight> {
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
    return {
      summary: data.summary,
      keyStrength: data.keyStrength,
      potentialConcern: data.potentialConcern,
      suggestedAction: data.suggestedAction,
      confidence: data.confidence,
      source: 'ai',
    };
  } catch (error) {
    console.warn('[Insights API] Error fetching insight, using fallback:', error);
    return { ...generateFallbackInsight(input), source: 'rules' };
  }
}

/**
 * Hook to fetch AI insight for a match
 *
 * @param input - Match data for insight generation
 * @param enabled - Whether to enable the query (default: true)
 */
export function useMatchInsight(
  input: InsightRequest | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['match-insight', input?.buyerName, input?.propertyAddress, input?.score],
    queryFn: () => fetchInsight(input!),
    enabled: enabled && !!input?.buyerName && !!input?.propertyAddress,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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
