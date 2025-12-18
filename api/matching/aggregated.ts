/**
 * Aggregated Matching API - Scalable Data Fetching
 *
 * This endpoint solves the N+1 query problem by:
 * 1. Fetching data in batches with pagination
 * 2. Using server-side filtering with Airtable formulas
 * 3. Pre-joining related data before sending to client
 *
 * Performance: ~3-5 API calls instead of 1000+ for 100 buyers
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

// In-memory cache for buyers and properties (semi-static data)
const buyersCache = new Map<string, { data: any[], timestamp: number }>();
const propertiesCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Aggregated API] *** NEW CODE VERSION *** Request:', {
    method: req.method,
    type: req.query.type,
    limit: req.query.limit,
    offset: req.query.offset,
    filters: {
      matchStatus: req.query.matchStatus,
      minScore: req.query.minScore,
      priorityOnly: req.query.priorityOnly,
      matchLimit: req.query.matchLimit,
    },
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
    return res.status(500).json({
      error: 'Airtable credentials not configured',
    });
  }

  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const {
    type,
    limit = '50',
    offset = '',
    matchStatus,
    minScore = '30',
    priorityOnly = 'false',
    matchLimit = '25',
    dateRange = 'all',
  } = req.query;

  const filters = {
    matchStatus: matchStatus as string | undefined,
    minScore: parseInt(minScore as string),
    priorityOnly: priorityOnly === 'true',
    matchLimit: parseInt(matchLimit as string),
    dateRange: dateRange as string,
  };

  try {
    if (type === 'buyers') {
      return await handleBuyersAggregated(req, res, headers, parseInt(limit as string), offset as string, filters);
    } else if (type === 'properties') {
      return await handlePropertiesAggregated(req, res, headers, parseInt(limit as string), offset as string, filters);
    } else {
      return res.status(400).json({ error: 'type parameter must be "buyers" or "properties"' });
    }
  } catch (error: any) {
    console.error('[Aggregated API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      stack: error.stack,
    });
  }
}

/**
 * Fetch buyers with their matches in an optimized way
 */
async function handleBuyersAggregated(
  req: VercelRequest,
  res: VercelResponse,
  headers: any,
  limit: number,
  offset: string,
  filters: {
    matchStatus?: string;
    minScore: number;
    priorityOnly: boolean;
    matchLimit: number;
    dateRange: string;
  }
) {
  const startTime = Date.now();

  // Step 1: Fetch buyers (paginated) with caching
  console.log(`[Aggregated] Fetching buyers with limit=${limit}, offset=${offset}`);

  const buyersCacheKey = `buyers-${limit}-${offset}`;
  const cachedBuyers = buyersCache.get(buyersCacheKey);

  let buyers: any[];
  let buyersData: any;

  if (cachedBuyers && Date.now() - cachedBuyers.timestamp < CACHE_TTL) {
    console.log(`[Aggregated] Using cached buyers (age: ${Math.floor((Date.now() - cachedBuyers.timestamp) / 1000)}s)`);
    buyers = cachedBuyers.data;
    buyersData = { records: buyers, offset: undefined }; // Cached data doesn't have offset
  } else {
    const buyersUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?maxRecords=${limit}${offset ? `&offset=${offset}` : ''}`;

    const buyersRes = await fetch(buyersUrl, { headers });
    if (!buyersRes.ok) {
      throw new Error(`Failed to fetch buyers: ${buyersRes.status} ${buyersRes.statusText}`);
    }

    buyersData = await buyersRes.json();
    buyers = buyersData.records || [];

    // Cache the buyers data
    buyersCache.set(buyersCacheKey, { data: buyers, timestamp: Date.now() });
    console.log(`[Aggregated] Cached buyers data`);
  }

  console.log(`[Aggregated] Fetched ${buyers.length} buyers in ${Date.now() - startTime}ms`);

  if (buyers.length === 0) {
    return res.status(200).json({
      data: [],
      nextOffset: null,
      stats: { buyers: 0, matches: 0, properties: 0, timeMs: Date.now() - startTime },
    });
  }

  // Step 2: Fetch ALL matches for these buyers in ONE call using filterByFormula
  // Use the text field 'Contact ID (for GHL)' which stores the GHL Contact ID
  const buyerContactIds = buyers.map((b: any) => b.fields['Contact ID']).filter(id => id);
  const matchesFormula = `OR(${buyerContactIds.map(id => `{Contact ID (for GHL)} = "${id}"`).join(',')})`;

  console.log(`[Aggregated] Fetching matches for ${buyerContactIds.length} buyers using Contact IDs:`, buyerContactIds.slice(0, 3));

  const matchesUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches?filterByFormula=${encodeURIComponent(matchesFormula)}`;

  const matchesRes = await fetch(matchesUrl, { headers });
  if (!matchesRes.ok) {
    console.warn(`[Aggregated] Failed to fetch matches: ${matchesRes.status}`);
  }

  const matchesData = matchesRes.ok ? await matchesRes.json() : { records: [] };
  const allMatches = matchesData.records || [];

  console.log(`[Aggregated] Fetched ${allMatches.length} matches in ${Date.now() - startTime}ms`);

  // Step 3: Get unique property IDs and batch fetch properties
  const propertyIds = [
    ...new Set(
      allMatches.flatMap((m: any) => m.fields['Property Code'] || [])
    ),
  ];

  let propertiesMap: Record<string, any> = {};

  if (propertyIds.length > 0) {
    console.log(`[Aggregated] Batch fetching ${propertyIds.length} properties`);

    // Use filterByFormula with RECORD_ID() to fetch multiple properties at once
    const propertiesFormula = `OR(${propertyIds.map(id => `RECORD_ID()="${id}"`).join(',')})`;
    const propertiesUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?filterByFormula=${encodeURIComponent(propertiesFormula)}`;

    const propertiesRes = await fetch(propertiesUrl, { headers });
    if (propertiesRes.ok) {
      const propertiesData = await propertiesRes.json();
      propertiesMap = Object.fromEntries(
        (propertiesData.records || []).map((p: any) => [p.id, p])
      );
    } else {
      console.warn(`[Aggregated] Failed to fetch properties: ${propertiesRes.status}`);
    }
  }

  console.log(`[Aggregated] Fetched ${Object.keys(propertiesMap).length} properties in ${Date.now() - startTime}ms`);

  // Step 4: Assemble the response with pre-joined data
  const buyersWithMatches = buyers.map((buyer: any) => {
    const buyerContactId = buyer.fields['Contact ID'];

    // Debug: Log first buyer's matching process
    if (buyers.indexOf(buyer) === 0) {
      console.log(`[Aggregated] Matching for first buyer (Contact ID: ${buyerContactId})`);
    }

    const buyerMatches = allMatches
      .filter((m: any) => {
        // Use the GHL text field for matching
        const matchContactId = m.fields['Contact ID (for GHL)'] || '';
        const matchesContact = matchContactId === buyerContactId;

        if (!matchesContact) return false;

        // Score filter
        const score = m.fields['Match Score'] || 0;
        if (score < filters.minScore) return false;

        // Status filter
        if (filters.matchStatus && m.fields['Match Status'] !== filters.matchStatus) return false;

        // Priority filter
        if (filters.priorityOnly && !m.fields['Is Priority']) return false;

        // Date range filter
        if (filters.dateRange && filters.dateRange !== 'all') {
          const createdTime = new Date(m.createdTime);
          const now = new Date();
          const daysAgo = filters.dateRange === '7days' ? 7 : 30;
          const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
          if (createdTime < cutoffDate) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => (b.fields['Match Score'] || 0) - (a.fields['Match Score'] || 0))
      .slice(0, filters.matchLimit)
      .map((match: any) => {
        const propertyRecordId = match.fields['Property Code']?.[0];
        const property = propertiesMap[propertyRecordId];

        return {
          id: match.id,
          buyerRecordId: buyer.id,
          propertyRecordId: propertyRecordId || '',
          contactId: buyer.fields['Contact ID'] || '',
          propertyCode: property?.fields['Property Code'] || '',
          score: match.fields['Match Score'] || 0,
          distance: match.fields['Distance (miles)'],
          reasoning: match.fields['Match Notes'] || '',
          highlights: [],
          isPriority: match.fields['Is Priority'],
          status: match.fields['Match Status'] || 'Active',
          property: property ? {
            recordId: property.id,
            propertyCode: property.fields['Property Code'] || '',
            opportunityId: property.fields['Opportunity ID'],
            address: property.fields['Address'] || '',
            city: property.fields['City'] || '',
            state: property.fields['State'],
            price: property.fields['Price'],
            beds: property.fields['Beds'] || 0,
            baths: property.fields['Baths'] || 0,
            sqft: property.fields['Sqft'],
            stage: property.fields['Stage'],
          } : null,
        };
      });

    // Debug: Log first buyer's match count
    if (buyers.indexOf(buyer) === 0) {
      console.log(`[Aggregated] First buyer has ${buyerMatches.length} matches after filtering`);
    }

    // Parse preferred zip codes from comma-separated string
    const zipCodesRaw = buyer.fields['Preferred Zip Codes'] || buyer.fields['Zip Codes'] || '';
    const preferredZipCodes = typeof zipCodesRaw === 'string'
      ? zipCodesRaw.split(',').map((z: string) => z.trim()).filter(Boolean)
      : Array.isArray(zipCodesRaw) ? zipCodesRaw : [];

    return {
      contactId: buyer.fields['Contact ID'] || '',
      recordId: buyer.id,
      firstName: buyer.fields['First Name'] || '',
      lastName: buyer.fields['Last Name'] || '',
      email: buyer.fields['Email'] || '',
      monthlyIncome: buyer.fields['Monthly Income'],
      monthlyLiabilities: buyer.fields['Monthly Liabilities'],
      downPayment: buyer.fields['Downpayment'],
      desiredBeds: buyer.fields['No. of Bedrooms'],
      desiredBaths: buyer.fields['No. of Bath'],
      city: buyer.fields['City'],
      location: buyer.fields['Location'],
      preferredLocation: buyer.fields['Preferred Location'] || buyer.fields['Location'],
      preferredZipCodes,
      buyerType: buyer.fields['Buyer Type'],
      matches: buyerMatches,
      totalMatches: buyerMatches.length,
    };
  });

  const totalTime = Date.now() - startTime;
  console.log(`[Aggregated] Completed buyers aggregation in ${totalTime}ms`);

  return res.status(200).json({
    data: buyersWithMatches,
    nextOffset: buyersData.offset || null,
    stats: {
      buyers: buyers.length,
      matches: allMatches.length,
      properties: Object.keys(propertiesMap).length,
      timeMs: totalTime,
    },
  });
}

/**
 * Fetch properties with their matches in an optimized way
 */
async function handlePropertiesAggregated(
  req: VercelRequest,
  res: VercelResponse,
  headers: any,
  limit: number,
  offset: string,
  filters: {
    matchStatus?: string;
    minScore: number;
    priorityOnly: boolean;
    matchLimit: number;
    dateRange: string;
  }
) {
  const startTime = Date.now();

  // Step 1: Fetch properties (paginated) with caching
  console.log(`[Aggregated] Fetching properties with limit=${limit}, offset=${offset}`);

  const propertiesCacheKey = `properties-${limit}-${offset}`;
  const cachedProperties = propertiesCache.get(propertiesCacheKey);

  let properties: any[];
  let propertiesData: any;

  if (cachedProperties && Date.now() - cachedProperties.timestamp < CACHE_TTL) {
    console.log(`[Aggregated] Using cached properties (age: ${Math.floor((Date.now() - cachedProperties.timestamp) / 1000)}s)`);
    properties = cachedProperties.data;
    propertiesData = { records: properties, offset: undefined }; // Cached data doesn't have offset
  } else {
    const propertiesUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?maxRecords=${limit}${offset ? `&offset=${offset}` : ''}`;

    const propertiesRes = await fetch(propertiesUrl, { headers });
    if (!propertiesRes.ok) {
      throw new Error(`Failed to fetch properties: ${propertiesRes.status} ${propertiesRes.statusText}`);
    }

    propertiesData = await propertiesRes.json();
    properties = propertiesData.records || [];

    // Cache the properties data
    propertiesCache.set(propertiesCacheKey, { data: properties, timestamp: Date.now() });
    console.log(`[Aggregated] Cached properties data`);
  }

  console.log(`[Aggregated] Fetched ${properties.length} properties in ${Date.now() - startTime}ms`);

  if (properties.length === 0) {
    return res.status(200).json({
      data: [],
      nextOffset: null,
      stats: { properties: 0, matches: 0, buyers: 0, timeMs: Date.now() - startTime },
    });
  }

  // Step 2: Fetch ALL matches for these properties in ONE call
  // Use the text field 'Opportunity ID (for GHL) ' which stores the Property Code
  const propertyCodes = properties.map((p: any) => p.fields['Property Code']).filter(code => code);
  const matchesFormula = `OR(${propertyCodes.map(code => `{Opportunity ID (for GHL) } = "${code}"`).join(',')})`;

  console.log(`[Aggregated] Fetching matches for ${propertyCodes.length} properties using Property Codes:`, propertyCodes.slice(0, 3));

  const matchesUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches?filterByFormula=${encodeURIComponent(matchesFormula)}`;

  const matchesRes = await fetch(matchesUrl, { headers });
  if (!matchesRes.ok) {
    console.warn(`[Aggregated] Failed to fetch matches: ${matchesRes.status}`);
  }

  const matchesData = matchesRes.ok ? await matchesRes.json() : { records: [] };
  const allMatches = matchesData.records || [];

  console.log(`[Aggregated] Fetched ${allMatches.length} matches in ${Date.now() - startTime}ms`);

  // Step 3: Get unique buyer Contact IDs (GHL IDs) from text field and batch fetch buyers
  const buyerContactIds = [
    ...new Set(
      allMatches.map((m: any) => m.fields['Contact ID (for GHL)']).filter(Boolean)
    ),
  ];

  let buyersMap: Record<string, any> = {};

  if (buyerContactIds.length > 0) {
    console.log(`[Aggregated] Batch fetching ${buyerContactIds.length} buyers`);
    console.log(`[Aggregated] Buyer Contact IDs to search:`, buyerContactIds);

    // Use FIND() syntax for Contact ID field (similar to properties)
    const buyersFormula = `OR(${buyerContactIds.map(id => `FIND("${id}", {Contact ID})`).join(',')})`;
    console.log(`[Aggregated] Buyer lookup formula:`, buyersFormula);

    const buyersUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?filterByFormula=${encodeURIComponent(buyersFormula)}`;

    const buyersRes = await fetch(buyersUrl, { headers });
    if (buyersRes.ok) {
      const buyersData = await buyersRes.json();
      console.log(`[Aggregated] Buyer API response: ${buyersData.records?.length || 0} records found`);

      // Map by Contact ID (GHL ID) instead of Airtable record ID
      buyersMap = Object.fromEntries(
        (buyersData.records || []).map((b: any) => [b.fields['Contact ID'], b])
      );
    } else {
      console.warn(`[Aggregated] Failed to fetch buyers: ${buyersRes.status}`);
      const errorText = await buyersRes.text();
      console.warn(`[Aggregated] Error details:`, errorText);
    }
  }

  console.log(`[Aggregated] Fetched ${Object.keys(buyersMap).length} buyers in ${Date.now() - startTime}ms`);

  // Step 4: Assemble the response
  const propertiesWithMatches = properties.map((property: any) => {
    const propertyCode = property.fields['Property Code'];

    // Debug: Log first property's matching process
    if (properties.indexOf(property) === 0) {
      console.log(`[Aggregated] Matching for first property (Property Code: ${propertyCode})`);
    }

    const propertyMatches = allMatches
      .filter((m: any) => {
        // Use the GHL text field for matching
        const matchPropertyCode = m.fields['Opportunity ID (for GHL) '] || '';
        const matchesProperty = matchPropertyCode === propertyCode;

        if (!matchesProperty) return false;

        // Score filter
        const score = m.fields['Match Score'] || 0;
        if (score < filters.minScore) return false;

        // Status filter
        if (filters.matchStatus && m.fields['Match Status'] !== filters.matchStatus) return false;

        // Priority filter
        if (filters.priorityOnly && !m.fields['Is Priority']) return false;

        // Date range filter
        if (filters.dateRange && filters.dateRange !== 'all') {
          const createdTime = new Date(m.createdTime);
          const now = new Date();
          const daysAgo = filters.dateRange === '7days' ? 7 : 30;
          const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
          if (createdTime < cutoffDate) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => (b.fields['Match Score'] || 0) - (a.fields['Match Score'] || 0))
      .slice(0, filters.matchLimit)
      .map((match: any) => {
        // Use GHL Contact ID from text field to lookup buyer
        const buyerContactId = match.fields['Contact ID (for GHL)'] || '';
        const buyer = buyersMap[buyerContactId];

        return {
          id: match.id,
          buyerRecordId: buyer?.id || '',
          propertyRecordId: property.id,
          contactId: buyer?.fields['Contact ID'] || '',
          propertyCode: property.fields['Property Code'] || '',
          score: match.fields['Match Score'] || 0,
          distance: match.fields['Distance (miles)'],
          reasoning: match.fields['Match Notes'] || '',
          highlights: [],
          isPriority: match.fields['Is Priority'],
          status: match.fields['Match Status'] || 'Active',
          buyer: buyer ? {
            contactId: buyer.fields['Contact ID'] || '',
            recordId: buyer.id,
            firstName: buyer.fields['First Name'] || '',
            lastName: buyer.fields['Last Name'] || '',
            email: buyer.fields['Email'] || '',
            monthlyIncome: buyer.fields['Monthly Income'],
            monthlyLiabilities: buyer.fields['Monthly Liabilities'],
            downPayment: buyer.fields['Downpayment'],
            desiredBeds: buyer.fields['No. of Bedrooms'],
            desiredBaths: buyer.fields['No. of Bath'],
            city: buyer.fields['City'],
            location: buyer.fields['Location'],
            buyerType: buyer.fields['Buyer Type'],
          } : null,
        };
      });

    // Debug: Log first property's match count
    if (properties.indexOf(property) === 0) {
      console.log(`[Aggregated] First property has ${propertyMatches.length} matches after filtering`);
    }

    return {
      recordId: property.id,
      propertyCode: property.fields['Property Code'] || '',
      opportunityId: property.fields['Opportunity ID'],
      address: property.fields['Address'] || '',
      city: property.fields['City'] || '',
      state: property.fields['State'],
      price: property.fields['Price'],
      beds: property.fields['Beds'] || 0,
      baths: property.fields['Baths'] || 0,
      sqft: property.fields['Sqft'],
      stage: property.fields['Stage'],
      matches: propertyMatches,
      totalMatches: propertyMatches.length,
    };
  });

  const totalTime = Date.now() - startTime;
  console.log(`[Aggregated] Completed properties aggregation in ${totalTime}ms`);

  return res.status(200).json({
    data: propertiesWithMatches,
    nextOffset: propertiesData.offset || null,
    stats: {
      properties: properties.length,
      matches: allMatches.length,
      buyers: Object.keys(buyersMap).length,
      timeMs: totalTime,
    },
  });
}
