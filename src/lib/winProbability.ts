/**
 * Win Probability Calculator
 *
 * Calculates the likelihood of a deal closing based on:
 * - Current stage in the pipeline
 * - Match score
 * - Activity recency
 */

import type { Deal } from '@/types/deals';
import type { MatchDealStage } from '@/types/associations';

export interface ProbabilityFactor {
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description?: string;
}

export interface WinProbabilityResult {
  probability: number;
  trend: 'up' | 'down' | 'stable';
  factors: ProbabilityFactor[];
  label: string;
  color: 'green' | 'amber' | 'red';
}

/**
 * Stage weights - How far along the deal is in the pipeline
 */
const STAGE_WEIGHTS: Record<MatchDealStage, number> = {
  'Sent to Buyer': 10,
  'Buyer Responded': 20,
  'Showing Scheduled': 30,
  'Property Viewed': 40,
  'Offer Made': 60,
  'Under Contract': 80,
  'Qualified': 85,
  'Closed Deal / Won': 100,
  'Not Interested': 0,
};

/**
 * Calculate win probability for a deal
 */
export function calculateWinProbability(deal: Deal): WinProbabilityResult {
  const factors: ProbabilityFactor[] = [];
  let probability = 0;

  // 1. Stage progression (0-50 points)
  const stageWeight = STAGE_WEIGHTS[deal.status] || 0;
  const stagePoints = Math.round(stageWeight * 0.5); // Scale to 0-50

  if (stageWeight >= 60) {
    factors.push({
      label: 'Advanced stage',
      impact: 'positive',
      weight: stagePoints,
      description: `Deal is at "${deal.status}" - strong momentum`,
    });
  } else if (stageWeight >= 30) {
    factors.push({
      label: 'Good progress',
      impact: 'positive',
      weight: stagePoints,
      description: `Deal is at "${deal.status}" stage`,
    });
  } else if (stageWeight > 0) {
    factors.push({
      label: 'Early stage',
      impact: 'neutral',
      weight: stagePoints,
      description: `Deal is at "${deal.status}" stage`,
    });
  } else {
    factors.push({
      label: 'Not interested',
      impact: 'negative',
      weight: 0,
      description: 'Buyer marked as not interested',
    });
  }
  probability += stagePoints;

  // 2. Match score factor (0-30 points)
  const scorePoints = Math.round(deal.score * 0.3);
  if (deal.score >= 85) {
    factors.push({
      label: 'Excellent match',
      impact: 'positive',
      weight: scorePoints,
      description: `${deal.score}% match score - highly aligned with buyer needs`,
    });
  } else if (deal.score >= 70) {
    factors.push({
      label: 'Strong match',
      impact: 'positive',
      weight: scorePoints,
      description: `${deal.score}% match score`,
    });
  } else if (deal.score >= 50) {
    factors.push({
      label: 'Moderate match',
      impact: 'neutral',
      weight: scorePoints,
      description: `${deal.score}% match score`,
    });
  } else {
    factors.push({
      label: 'Low match',
      impact: 'negative',
      weight: scorePoints,
      description: `${deal.score}% match score - may not fully meet buyer needs`,
    });
  }
  probability += scorePoints;

  // 3. Activity recency factor (0-20 points)
  const daysSinceActivity = deal.daysSinceActivity ?? 0;
  let recencyPoints = 0;

  if (daysSinceActivity <= 1) {
    recencyPoints = 20;
    factors.push({
      label: 'Very active',
      impact: 'positive',
      weight: recencyPoints,
      description: 'Activity within the last day',
    });
  } else if (daysSinceActivity <= 3) {
    recencyPoints = 15;
    factors.push({
      label: 'Recent activity',
      impact: 'positive',
      weight: recencyPoints,
      description: 'Activity within the last 3 days',
    });
  } else if (daysSinceActivity <= 7) {
    recencyPoints = 10;
    factors.push({
      label: 'Some activity',
      impact: 'neutral',
      weight: recencyPoints,
      description: `Last activity ${daysSinceActivity} days ago`,
    });
  } else if (daysSinceActivity <= 14) {
    recencyPoints = 5;
    factors.push({
      label: 'Stale deal',
      impact: 'negative',
      weight: recencyPoints,
      description: `No activity in ${daysSinceActivity} days - follow up needed`,
    });
  } else {
    recencyPoints = 0;
    factors.push({
      label: 'Very stale',
      impact: 'negative',
      weight: recencyPoints,
      description: `No activity in ${daysSinceActivity}+ days - at risk`,
    });
  }
  probability += recencyPoints;

  // Ensure probability is in valid range
  probability = Math.max(0, Math.min(100, probability));

  // Determine trend
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (daysSinceActivity <= 2 && stageWeight >= 30) {
    trend = 'up';
  } else if (daysSinceActivity >= 7 || stageWeight === 0) {
    trend = 'down';
  }

  // Determine color and label
  let color: 'green' | 'amber' | 'red' = 'amber';
  let label = 'Fair';

  if (probability >= 70) {
    color = 'green';
    label = 'Strong';
  } else if (probability >= 40) {
    color = 'amber';
    label = 'Fair';
  } else {
    color = 'red';
    label = 'At Risk';
  }

  return {
    probability,
    trend,
    factors,
    label,
    color,
  };
}

/**
 * Get a simple probability label for compact display
 */
export function getWinProbabilityLabel(probability: number): string {
  if (probability >= 80) return 'Very High';
  if (probability >= 60) return 'High';
  if (probability >= 40) return 'Medium';
  if (probability >= 20) return 'Low';
  return 'Very Low';
}
