/**
 * AI Property Matching Types
 */

export interface BuyerCriteria {
  contactId: string;
  recordId?: string;
  firstName: string;
  lastName: string;
  email: string;
  monthlyIncome?: number;
  monthlyLiabilities?: number;
  downPayment?: number;
  desiredBeds?: number;
  desiredBaths?: number;
  location?: string;
  city?: string;
  state?: string;
  buyerType?: string;
  lat?: number;
  lng?: number;
  preferredLocation?: string;
  preferredZipCodes?: string[];
}

export interface PropertyDetails {
  recordId: string;
  propertyCode: string;
  opportunityId?: string;
  address: string;
  city: string;
  state?: string;
  price?: number;
  beds: number;
  baths: number;
  sqft?: number;
  stage?: string;
}

export interface MatchScore {
  score: number; // 0-100
  distance?: number; // Distance in miles
  locationScore: number; // 0-40 points
  bedsScore: number; // 0-25 points
  bathsScore: number; // 0-15 points
  budgetScore: number; // 0-20 points
  reasoning: string;
  highlights: string[];
  concerns: string[];
  isPriority: boolean; // Within 50 miles OR in preferred ZIP
}

export interface PropertyMatch {
  id: string; // Match record ID
  buyerRecordId: string;
  propertyRecordId: string;
  contactId: string;
  propertyCode: string;
  score: number;
  distance?: number; // Distance in miles
  reasoning: string;
  highlights: string[];
  concerns?: string[];
  isPriority?: boolean; // Within 50 miles OR in preferred ZIP
  status: 'Active' | 'Sent' | 'Viewed' | 'Closed';
  createdAt?: string;
  updatedAt?: string;
}

export interface BuyerWithMatches extends BuyerCriteria {
  matches: Array<PropertyMatch & { property?: PropertyDetails }>;
  totalMatches: number;
}

export interface PropertyWithMatches extends PropertyDetails {
  matches: Array<PropertyMatch & { buyer?: BuyerCriteria }>;
  totalMatches: number;
}

export interface MatchingJobStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  progress?: number;
  totalBuyers?: number;
  totalProperties?: number;
  processedBuyers?: number;
  createdMatches?: number;
  error?: string;
}

export interface RunMatchingRequest {
  buyerContactId?: string; // For single buyer
  propertyCode?: string; // For single property
  minScore?: number; // Minimum score threshold (default: 60)
  refreshAll?: boolean; // Re-match everything
}

export interface RunMatchingResponse {
  success: boolean;
  message: string;
  stats: {
    buyersProcessed: number;
    propertiesProcessed: number;
    matchesCreated: number;
    matchesUpdated: number;
    duplicatesSkipped?: number;
    withinRadius?: number; // Priority matches count
  };
}

export interface MatchFilters {
  matchStatus?: 'Active' | 'Sent' | 'Viewed' | 'Closed';
  minScore?: number;
  priorityOnly?: boolean;
  matchLimit?: number;
  dateRange?: '7days' | '30days' | 'all';
}
