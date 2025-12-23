/**
 * Zillow Integration Types
 * Types for external Zillow property search and integration
 */

export type PropertySource = 'Inventory' | 'Lead' | 'Zillow';

export type ZillowSearchType = 'Creative Financing' | '90+ Days' | 'Affordability';

/**
 * Listing agent details from Zillow
 */
export interface ListingAgent {
  name: string;
  phone: string;
  brokerName?: string;
}

/**
 * Zillow property listing from Apify scraper
 * Represents an external property not yet in the system
 */
export interface ZillowListing {
  zpid: string;                    // Zillow property ID (unique identifier)
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  beds: number;
  baths: number;
  sqft?: number;
  propertyType: string;            // e.g., "SINGLE_FAMILY", "CONDO"
  description?: string;
  images: string[];                // Array of image URLs
  zillowUrl: string;               // Link to Zillow listing
  daysOnMarket?: number;
  lat: number;
  lng: number;
  scrapedAt: string;               // ISO timestamp when data was scraped
  listingAgent?: ListingAgent;     // Listing agent information
}

/**
 * Response from Zillow search API endpoint
 */
export interface ZillowSearchResponse {
  results: ZillowListing[];
  searchType: ZillowSearchType;
  buyerCriteria: {
    location: string;
    beds: number | null;
    maxPrice: number | null;
  };
  apifyRunId?: string;             // Apify actor run ID for tracking
  totalResults: number;
  cached?: boolean;                // Whether results came from cache
  cachedAt?: string;               // When results were cached (ISO timestamp)
  searchAge?: number;              // Hours since search was performed
  error?: string;                  // Error message if search failed
}

/**
 * Request body for saving a Zillow property to the system
 */
export interface SaveZillowPropertyRequest {
  listing: ZillowListing;
  buyerId: string;                 // Buyer to associate with
  stage: string;                   // Initial property stage
  notes?: string;                  // Optional notes about the property
  opportunityId?: string;          // Optional GHL opportunity ID
  zillowType: ZillowSearchType;    // How this property was found
}

/**
 * Zillow search cache entry from Airtable
 */
export interface ZillowSearchCache {
  recordId: string;
  searchId: string;                // UUID for this search
  buyerRecordId: string;           // Link to Buyers table
  searchType: ZillowSearchType;
  location: string;
  beds: number | null;
  maxPrice: number | null;
  resultsCount: number;
  resultsJSON: string;             // Stringified ZillowListing[]
  searchedAt: string;              // ISO timestamp
  apifyRunId?: string;
}

/**
 * Request to Zillow search API with specific search type
 */
export interface ZillowSearchRequest {
  buyerId: string;
  searchType: ZillowSearchType;
}

/**
 * Response from save-from-zillow API endpoint
 */
export interface SaveZillowPropertyResponse {
  success: boolean;
  property: any;                   // Created Airtable property record
  ghlOpportunityId?: string;       // GHL opportunity ID if created
  matchCreated: boolean;           // Whether initial match was created
  message: string;
}
