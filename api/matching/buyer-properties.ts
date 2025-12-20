/**
 * Buyer Properties API
 * Returns ALL properties scored for a specific buyer (Zillow-style)
 *
 * Unlike the regular matching endpoint that only shows matches above a threshold,
 * this endpoint scores every property and returns them sorted by relevance,
 * split into priority (within 50mi/ZIP match) and explore (beyond 50mi) sections.
 *
 * GET /api/matching/buyer-properties?buyerId=XXX
 * Returns: {
 *   buyer: BuyerRecord,
 *   priorityMatches: ScoredProperty[],   // <= 50 mi or ZIP match
 *   exploreMatches: ScoredProperty[],    // > 50 mi
 *   totalCount: number
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateMatchScoreAsync } from './scorer';
import type { MatchScore } from './scorer';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

// In-memory cache with TTL
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface ScoredProperty {
  property: {
    recordId: string;
    propertyCode: string;
    opportunityId?: string;
    address: string;
    city: string;
    state?: string;
    zipCode?: string;
    price?: number;
    beds: number;
    baths: number;
    sqft?: number;
    stage?: string;
    heroImage?: string;
    notes?: string;
  };
  score: MatchScore;
}

interface BuyerRecord {
  recordId: string;
  contactId: string;
  firstName: string;
  lastName: string;
  email: string;
  monthlyIncome?: number;
  monthlyLiabilities?: number;
  downPayment?: number;
  desiredBeds?: number;
  desiredBaths?: number;
  city?: string;
  location?: string;
  preferredLocation?: string;
  preferredZipCodes?: string[];
  buyerType?: string;
  locationLat?: number;
  locationLng?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Buyer Properties API] Request:', {
    method: req.method,
    buyerId: req.query.buyerId,
  });

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Airtable credentials not configured' });
  }

  const { buyerId } = req.query;

  if (!buyerId || typeof buyerId !== 'string') {
    return res.status(400).json({ error: 'buyerId is required' });
  }

  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    const startTime = Date.now();

    // Fetch buyer
    const buyer = await fetchBuyer(buyerId, headers);
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    // Fetch all properties
    const properties = await fetchAllProperties(headers);
    console.log(`[Buyer Properties] Fetched ${properties.length} properties`);

    // Score every property with async geocoding fallback
    const scoredProperties: ScoredProperty[] = [];
    const buyerRecord = { id: buyer.recordId, fields: buyerToFields(buyer) };

    // Process properties in batches for better performance
    const BATCH_SIZE = 10;
    for (let i = 0; i < properties.length; i += BATCH_SIZE) {
      const batch = properties.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (property) => {
          const score = await generateMatchScoreAsync(buyerRecord, property);
          return {
            property: {
              recordId: property.id,
              propertyCode: property.fields['Property Code'] || '',
              opportunityId: property.fields['Opportunity ID'],
              address: property.fields['Address'] || '',
              city: property.fields['City'] || '',
              state: property.fields['State'],
              zipCode: property.fields['Zip Code'] || property.fields['ZIP Code'],
              price: property.fields['Property Total Price'] || property.fields['Price'],
              beds: property.fields['Beds'] || 0,
              baths: property.fields['Baths'] || 0,
              sqft: property.fields['Sqft'],
              stage: property.fields['Stage'],
              heroImage: property.fields['Hero Image']?.[0]?.url || property.fields['Hero Image'],
              notes: property.fields['Notes'] || property.fields['Description'] || '',
            },
            score,
          };
        })
      );

      scoredProperties.push(...batchResults);
    }

    // Sort by score descending
    scoredProperties.sort((a, b) => b.score.score - a.score.score);

    // Split into priority and explore
    const priorityMatches = scoredProperties.filter(p => p.score.isPriority);
    const exploreMatches = scoredProperties.filter(p => !p.score.isPriority);

    const timeMs = Date.now() - startTime;
    console.log(`[Buyer Properties] Complete in ${timeMs}ms: ${priorityMatches.length} priority, ${exploreMatches.length} explore`);

    return res.status(200).json({
      buyer,
      priorityMatches,
      exploreMatches,
      totalCount: scoredProperties.length,
      stats: {
        priorityCount: priorityMatches.length,
        exploreCount: exploreMatches.length,
        timeMs,
      },
    });
  } catch (error: any) {
    console.error('[Buyer Properties API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Fetch a single buyer by ID (recordId or contactId)
 */
async function fetchBuyer(buyerId: string, headers: any): Promise<BuyerRecord | null> {
  // Check cache first
  const cacheKey = `buyer:${buyerId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[Buyer Properties] Using cached buyer');
    return cached.data;
  }

  try {
    // Try to fetch by record ID first
    let response = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers/${buyerId}`,
      { headers }
    );

    if (!response.ok) {
      // Try by Contact ID
      const formula = encodeURIComponent(`{Contact ID} = "${buyerId}"`);
      response = await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?filterByFormula=${formula}`,
        { headers }
      );

      if (!response.ok) {
        console.error('[Buyer Properties] Failed to fetch buyer:', response.status);
        return null;
      }

      const data = await response.json();
      if (!data.records || data.records.length === 0) {
        return null;
      }

      const record = data.records[0];
      const buyer = recordToBuyer(record);
      cache.set(cacheKey, { data: buyer, timestamp: Date.now() });
      return buyer;
    }

    const record = await response.json();
    const buyer = recordToBuyer(record);
    cache.set(cacheKey, { data: buyer, timestamp: Date.now() });
    return buyer;
  } catch (error) {
    console.error('[Buyer Properties] Error fetching buyer:', error);
    return null;
  }
}

/**
 * Fetch all properties with caching
 */
async function fetchAllProperties(headers: any): Promise<any[]> {
  const cacheKey = 'all-properties';
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[Buyer Properties] Using cached properties');
    return cached.data;
  }

  try {
    const allRecords: any[] = [];
    let offset: string | undefined;

    do {
      const url = offset
        ? `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?offset=${offset}`
        : `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`;

      const response = await fetch(url, { headers });

      if (!response.ok) {
        console.error('[Buyer Properties] Failed to fetch properties:', response.status);
        break;
      }

      const data = await response.json();
      allRecords.push(...(data.records || []));
      offset = data.offset;
    } while (offset);

    cache.set(cacheKey, { data: allRecords, timestamp: Date.now() });
    return allRecords;
  } catch (error) {
    console.error('[Buyer Properties] Error fetching properties:', error);
    return [];
  }
}

/**
 * Convert Airtable record to BuyerRecord
 */
function recordToBuyer(record: any): BuyerRecord {
  const fields = record.fields;

  // Parse preferred zip codes
  let preferredZipCodes: string[] = [];
  const zipCodesRaw = fields['Preferred Zip Codes'] || '';
  if (typeof zipCodesRaw === 'string') {
    preferredZipCodes = zipCodesRaw.split(',').map((z: string) => z.trim()).filter(Boolean);
  } else if (Array.isArray(zipCodesRaw)) {
    preferredZipCodes = zipCodesRaw;
  }

  return {
    recordId: record.id,
    contactId: fields['Contact ID'] || '',
    firstName: fields['First Name'] || '',
    lastName: fields['Last Name'] || '',
    email: fields['Email'] || '',
    monthlyIncome: fields['Monthly Income'],
    monthlyLiabilities: fields['Monthly Liabilities'],
    downPayment: fields['Downpayment'],
    desiredBeds: fields['No. of Bedrooms'],
    desiredBaths: fields['No. of Bath'],
    city: fields['City'],
    location: fields['Location'],
    preferredLocation: fields['Preferred Location'],
    preferredZipCodes,
    buyerType: fields['Buyer Type'],
    // Coordinates - try multiple field name variations for compatibility
    locationLat: fields['Lat'] ?? fields['Location Lat'],
    locationLng: fields['Lng'] ?? fields['Location Lng'],
  };
}

/**
 * Convert BuyerRecord back to Airtable fields format (for scoring)
 */
function buyerToFields(buyer: BuyerRecord): Record<string, any> {
  return {
    'Contact ID': buyer.contactId,
    'First Name': buyer.firstName,
    'Last Name': buyer.lastName,
    'Email': buyer.email,
    'Monthly Income': buyer.monthlyIncome,
    'Monthly Liabilities': buyer.monthlyLiabilities,
    'Downpayment': buyer.downPayment,
    'No. of Bedrooms': buyer.desiredBeds,
    'No. of Bath': buyer.desiredBaths,
    'City': buyer.city,
    'Location': buyer.location,
    'Preferred Location': buyer.preferredLocation,
    'Preferred Zip Codes': buyer.preferredZipCodes?.join(', '),
    'Buyer Type': buyer.buyerType,
    // Use 'Lat'/'Lng' to match scorer.ts expectations
    'Lat': buyer.locationLat,
    'Lng': buyer.locationLng,
  };
}
