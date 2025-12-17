export interface CacheMetadata {
  cacheKey: string;
  recordCount: number;
  sourceCount: number;
  lastSynced: string | null;
  version: number;
  isValid: boolean;
}

export interface CacheEntry<T> extends CacheMetadata {
  data: T;
}

export interface PropertiesCacheData {
  records: Array<{
    id: string;
    propertyCode: string;
    address: string;
    city: string;
    state: string;
    price: number;
    beds: number;
    baths: number;
    sqft?: number;
    stage?: string;
  }>;
}

export interface BuyersCacheData {
  records: Array<{
    id: string;
    contactId: string;
    firstName: string;
    lastName: string;
    email: string;
    city?: string;
    location?: string;
    monthlyIncome?: number;
    downPayment?: number;
    desiredBeds?: number;
    desiredBaths?: number;
  }>;
}

export interface MatchesCacheData {
  records: Array<{
    id: string;
    buyerRecordId: string;
    propertyRecordId: string;
    score: number;
    distance?: number;
    reasoning?: string;
    status: string;
  }>;
  // Indexes for fast lookup
  buyerIndex: Record<string, string[]>;    // buyerId -> matchIds[]
  propertyIndex: Record<string, string[]>; // propertyId -> matchIds[]
}

export interface CacheStatus {
  properties: CacheMetadata;
  buyers: CacheMetadata;
  matches: CacheMetadata;
  newPropertiesAvailable: number;
  newBuyersAvailable: number;
  isStale: boolean;
  lastChecked: string;
}

export type CacheKey = 'properties' | 'buyers' | 'matches';
