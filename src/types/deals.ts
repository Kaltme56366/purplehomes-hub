/**
 * Deal Pipeline Types
 *
 * These types extend the matching types for the Deal Pipeline page,
 * providing deal-centric views with computed properties for UI.
 */

import { MatchDealStage } from './associations';
import { PropertyMatch, PropertyDetails, BuyerCriteria, MatchActivity } from './matching';

/**
 * Note entry stored in the Notes JSON field
 */
export interface NoteEntry {
  id: string;
  text: string;
  timestamp: string;
  user?: string;
}

/**
 * Deal - A PropertyMatch with fully resolved property and buyer data
 * plus computed UI properties
 */
export interface Deal extends PropertyMatch {
  property: PropertyDetails;
  buyer: BuyerCriteria;
  activities: MatchActivity[];
  notes?: NoteEntry[];

  // Computed UI properties
  isStale?: boolean;           // No activity in 7+ days
  daysSinceActivity?: number;  // Days since last activity
  lastActivityAt?: string;     // ISO timestamp of last activity
}

/**
 * Pipeline statistics for the Overview tab
 */
export interface PipelineStats {
  totalDeals: number;
  pipelineValue: number;       // Sum of property prices
  closingSoon: number;         // Count in "Under Contract" stage
  needsAttention: number;      // Count of stale deals
  newThisWeek: number;         // Deals created in last 7 days
  byStage: Record<MatchDealStage, number>;
}

/**
 * Deals grouped by buyer for "By Buyer" view
 */
export interface DealsByBuyer {
  buyer: BuyerCriteria;
  deals: Deal[];
  totalDeals: number;
  totalValue: number;          // Sum of property prices
  activeStages: MatchDealStage[]; // Stages represented in deals
}

/**
 * Deals grouped by property for "By Property" view
 */
export interface DealsByProperty {
  property: PropertyDetails;
  deals: Deal[];
  totalBuyers: number;
  highestScore: number;        // Best match score
  furthestStage: MatchDealStage; // Most advanced deal stage
}

/**
 * Filters for deal queries
 */
export interface DealFilters {
  stage?: MatchDealStage | 'all';
  stages?: MatchDealStage[];   // Multiple stage filter
  buyerId?: string;
  propertyId?: string;
  search?: string;             // Search in property address or buyer name
  minScore?: number;
  onlyStale?: boolean;         // Only deals needing attention
  onlyUpcoming?: boolean;      // Only "Showing Scheduled" deals
}

/**
 * Sort options for deal lists
 */
export type DealSortField =
  | 'lastActivity'
  | 'score'
  | 'stage'
  | 'createdAt'
  | 'buyerName'
  | 'propertyAddress'
  | 'price';

export type DealSortDirection = 'asc' | 'desc';

export interface DealSort {
  field: DealSortField;
  direction: DealSortDirection;
}

/**
 * Stage change request for updating deal stage
 */
export interface StageChangeRequest {
  dealId: string;
  fromStage: MatchDealStage;
  toStage: MatchDealStage;
  contactId: string;
  propertyAddress: string;
  opportunityId?: string;
  syncToGhl?: boolean;
  ghlRelationId?: string; // Previous GHL relation ID to delete when changing stages
}
