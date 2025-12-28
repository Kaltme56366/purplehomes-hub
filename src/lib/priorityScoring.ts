/**
 * Priority Scoring for Buyer Queue
 *
 * Calculates priority level for buyers based on their engagement,
 * match status, and activity recency.
 */

import type { BuyerWithMatches } from '@/types/matching';
import type { MatchDealStage } from '@/types/associations';

export type PriorityLevel = 'hot' | 'warm' | 'normal';

export interface BuyerPriority {
  level: PriorityLevel;
  score: number;
  reason: string;
  reasons: string[];
}

// Hot stages - buyer is actively engaged
const HOT_STAGES: MatchDealStage[] = [
  'Buyer Responded',
  'Showing Scheduled',
  'Property Viewed',
  'Underwriting',
];

// Stages that indicate the match is in the pipeline
const PIPELINE_STAGES: MatchDealStage[] = [
  'Sent to Buyer',
  'Buyer Responded',
  'Showing Scheduled',
  'Property Viewed',
  'Underwriting',
  'Contracts',
  'Qualified',
];

/**
 * Calculate priority for a buyer based on their matches
 */
export function calculateBuyerPriority(buyer: BuyerWithMatches): BuyerPriority {
  const reasons: string[] = [];
  let score = 0;

  // Count matches by status
  let unsentCount = 0;
  let hotStageCount = 0;
  let recentActivityCount = 0;

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

  for (const match of buyer.matches || []) {
    // Count unsent matches (no stage means not in pipeline yet)
    if (!match.stage) {
      unsentCount++;
    }

    // Count hot stage matches
    if (match.stage && HOT_STAGES.includes(match.stage as MatchDealStage)) {
      hotStageCount++;
    }

    // Check for recent activity
    if (match.updatedAt) {
      const updatedTime = new Date(match.updatedAt).getTime();
      if (updatedTime > oneDayAgo) {
        recentActivityCount++;
      }
    }
  }

  // Scoring logic

  // Hot: Has matches in hot stages OR very recent activity
  if (hotStageCount > 0) {
    score += 100;
    reasons.push(`${hotStageCount} active deal${hotStageCount > 1 ? 's' : ''} in progress`);
  }

  if (recentActivityCount > 0) {
    score += 50;
    reasons.push('Engaged in last 24 hours');
  }

  // Warm: Has 5+ unsent matches waiting
  if (unsentCount >= 5) {
    score += 30;
    reasons.push(`${unsentCount} new matches waiting`);
  } else if (unsentCount >= 1) {
    score += 10;
    reasons.push(`${unsentCount} match${unsentCount > 1 ? 'es' : ''} to review`);
  }

  // Determine priority level
  let level: PriorityLevel = 'normal';
  let reason = '';

  if (hotStageCount > 0 || recentActivityCount > 0) {
    level = 'hot';
    reason = reasons[0]; // Use most important reason
  } else if (unsentCount >= 5) {
    level = 'warm';
    reason = reasons[0];
  } else {
    level = 'normal';
    reason = reasons[0] || 'No urgent action needed';
  }

  return {
    level,
    score,
    reason,
    reasons,
  };
}

/**
 * Sort buyers by priority
 */
export function sortBuyersByPriority(buyers: BuyerWithMatches[]): BuyerWithMatches[] {
  return [...buyers].sort((a, b) => {
    const priorityA = calculateBuyerPriority(a);
    const priorityB = calculateBuyerPriority(b);

    // First sort by score (descending)
    if (priorityB.score !== priorityA.score) {
      return priorityB.score - priorityA.score;
    }

    // Then by total matches (descending)
    return (b.totalMatches || 0) - (a.totalMatches || 0);
  });
}

/**
 * Get buyers grouped by priority level
 */
export function getBuyersByPriorityLevel(buyers: BuyerWithMatches[]): {
  hot: BuyerWithMatches[];
  warm: BuyerWithMatches[];
  normal: BuyerWithMatches[];
} {
  const result = {
    hot: [] as BuyerWithMatches[],
    warm: [] as BuyerWithMatches[],
    normal: [] as BuyerWithMatches[],
  };

  for (const buyer of buyers) {
    const priority = calculateBuyerPriority(buyer);
    result[priority.level].push(buyer);
  }

  // Sort each group by score
  result.hot = sortBuyersByPriority(result.hot);
  result.warm = sortBuyersByPriority(result.warm);
  result.normal = sortBuyersByPriority(result.normal);

  return result;
}
