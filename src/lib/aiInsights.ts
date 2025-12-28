/**
 * AI Insights - Client-side types and utilities
 *
 * Provides types for AI-generated match insights and a
 * fallback function for when the API is unavailable.
 */

export interface InsightRequest {
  score: number;
  highlights: string[];
  concerns: string[];
  buyerName: string;
  propertyAddress: string;
  distanceMiles?: number;
  stage?: string;
  price?: number;
  beds?: number;
  baths?: number;
}

export interface AIInsight {
  summary: string;
  keyStrength: string;
  potentialConcern: string | null;
  suggestedAction: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'ai' | 'rules';
}

/**
 * Client-side rule-based fallback for when API is unavailable
 * Mirrors the server-side logic
 */
export function generateFallbackInsight(input: InsightRequest): AIInsight {
  const { score, highlights, concerns, buyerName, stage, distanceMiles } = input;

  // Determine confidence based on score
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (score >= 80) confidence = 'high';
  else if (score < 50) confidence = 'low';

  // Build summary
  let summary = '';
  if (score >= 80) {
    summary = `Excellent match for ${buyerName}. The property aligns well with their requirements.`;
  } else if (score >= 60) {
    summary = `Strong match for ${buyerName}. Most key criteria are met.`;
  } else if (score >= 40) {
    summary = `Moderate match for ${buyerName}. Some criteria align, but there are gaps.`;
  } else {
    summary = `Low match for ${buyerName}. Consider discussing flexibility on requirements.`;
  }

  // Add distance context
  if (distanceMiles !== undefined && distanceMiles > 20) {
    summary += ` Note: ${distanceMiles.toFixed(0)} miles from preferred location.`;
  }

  // Key strength
  let keyStrength = 'Good overall property match.';
  if (highlights && highlights.length > 0) {
    keyStrength = highlights[0];
  }

  // Potential concern
  let potentialConcern: string | null = null;
  if (concerns && concerns.length > 0) {
    potentialConcern = concerns[0];
  } else if (distanceMiles && distanceMiles > 30) {
    potentialConcern = 'Property is outside typical search radius.';
  }

  // Suggested action
  let suggestedAction = 'Send this property to the buyer for review.';
  if (stage === 'Sent to Buyer') {
    suggestedAction = 'Follow up to gauge interest.';
  } else if (stage === 'Buyer Responded') {
    suggestedAction = 'Schedule a showing.';
  } else if (stage === 'Showing Scheduled' || stage === 'Property Viewed') {
    suggestedAction = 'Discuss making an offer.';
  } else if (stage === 'Underwriting') {
    suggestedAction = 'Monitor underwriting progress.';
  } else if (score >= 85) {
    suggestedAction = 'Prioritize sending immediately.';
  }

  return {
    summary,
    keyStrength,
    potentialConcern,
    suggestedAction,
    confidence,
    source: 'rules',
  };
}

/**
 * Confidence level styling helpers
 */
export const CONFIDENCE_CONFIG = {
  high: {
    label: 'High Confidence',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
  },
  medium: {
    label: 'Medium Confidence',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
  },
  low: {
    label: 'Low Confidence',
    dotClass: 'bg-red-500',
    textClass: 'text-red-700',
    bgClass: 'bg-red-50',
  },
} as const;
