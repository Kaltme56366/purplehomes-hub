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
  reasoning: string;
  highlights: string[];
  concerns?: string[];
}

export interface PropertyMatch {
  id: string; // Match record ID
  buyerRecordId: string;
  propertyRecordId: string;
  contactId: string;
  propertyCode: string;
  score: number;
  reasoning: string;
  highlights: string[];
  concerns?: string[];
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
  };
}
