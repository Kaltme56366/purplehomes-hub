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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Aggregated API] Request:', {
    method: req.method,
    type: req.query.type,
    limit: req.query.limit,
    offset: req.query.offset,
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

  const { type, limit = '50', offset = '' } = req.query;

  try {
    if (type === 'buyers') {
      return await handleBuyersAggregated(req, res, headers, parseInt(limit as string), offset as string);
    } else if (type === 'properties') {
      return await handlePropertiesAggregated(req, res, headers, parseInt(limit as string), offset as string);
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
  offset: string
) {
  const startTime = Date.now();

  // Step 1: Fetch buyers (paginated)
  console.log(`[Aggregated] Fetching buyers with limit=${limit}, offset=${offset}`);

  const buyersUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?maxRecords=${limit}${offset ? `&offset=${offset}` : ''}`;

  const buyersRes = await fetch(buyersUrl, { headers });
  if (!buyersRes.ok) {
    throw new Error(`Failed to fetch buyers: ${buyersRes.status} ${buyersRes.statusText}`);
  }

  const buyersData = await buyersRes.json();
  const buyers = buyersData.records || [];

  console.log(`[Aggregated] Fetched ${buyers.length} buyers in ${Date.now() - startTime}ms`);

  if (buyers.length === 0) {
    return res.status(200).json({
      data: [],
      nextOffset: null,
      stats: { buyers: 0, matches: 0, properties: 0, timeMs: Date.now() - startTime },
    });
  }

  // Step 2: Fetch ALL matches for these buyers in ONE call using filterByFormula
  const buyerIds = buyers.map((b: any) => b.id);
  const matchesFormula = `OR(${buyerIds.map(id => `FIND("${id}", ARRAYJOIN({Contact ID}))`).join(',')})`;

  console.log(`[Aggregated] Fetching matches for ${buyerIds.length} buyers with formula`);

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
    const buyerMatches = allMatches
      .filter((m: any) => {
        const contactIds = m.fields['Contact ID'] || [];
        const matches = contactIds.includes(buyer.id);
        // Debug first buyer's matches
        if (buyer.id === buyers[0].id && allMatches.indexOf(m) < 3) {
          console.log(`[Aggregated] Checking match ${m.id}: contactIds=${JSON.stringify(contactIds)}, buyerId=${buyer.id}, matches=${matches}`);
        }
        return matches;
      })
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
  offset: string
) {
  const startTime = Date.now();

  // Step 1: Fetch properties (paginated)
  console.log(`[Aggregated] Fetching properties with limit=${limit}, offset=${offset}`);

  const propertiesUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?maxRecords=${limit}${offset ? `&offset=${offset}` : ''}`;

  const propertiesRes = await fetch(propertiesUrl, { headers });
  if (!propertiesRes.ok) {
    throw new Error(`Failed to fetch properties: ${propertiesRes.status} ${propertiesRes.statusText}`);
  }

  const propertiesData = await propertiesRes.json();
  const properties = propertiesData.records || [];

  console.log(`[Aggregated] Fetched ${properties.length} properties in ${Date.now() - startTime}ms`);

  if (properties.length === 0) {
    return res.status(200).json({
      data: [],
      nextOffset: null,
      stats: { properties: 0, matches: 0, buyers: 0, timeMs: Date.now() - startTime },
    });
  }

  // Step 2: Fetch ALL matches for these properties in ONE call
  const propertyIds = properties.map((p: any) => p.id);
  const matchesFormula = `OR(${propertyIds.map(id => `FIND("${id}", ARRAYJOIN({Property Code}))`).join(',')})`;

  console.log(`[Aggregated] Fetching matches for ${propertyIds.length} properties`);

  const matchesUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches?filterByFormula=${encodeURIComponent(matchesFormula)}`;

  const matchesRes = await fetch(matchesUrl, { headers });
  if (!matchesRes.ok) {
    console.warn(`[Aggregated] Failed to fetch matches: ${matchesRes.status}`);
  }

  const matchesData = matchesRes.ok ? await matchesRes.json() : { records: [] };
  const allMatches = matchesData.records || [];

  console.log(`[Aggregated] Fetched ${allMatches.length} matches in ${Date.now() - startTime}ms`);

  // Step 3: Get unique buyer IDs and batch fetch buyers
  const buyerIds = [
    ...new Set(
      allMatches.flatMap((m: any) => m.fields['Contact ID'] || [])
    ),
  ];

  let buyersMap: Record<string, any> = {};

  if (buyerIds.length > 0) {
    console.log(`[Aggregated] Batch fetching ${buyerIds.length} buyers`);

    // Use filterByFormula with RECORD_ID() to fetch multiple buyers at once
    const buyersFormula = `OR(${buyerIds.map(id => `RECORD_ID()="${id}"`).join(',')})`;
    const buyersUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?filterByFormula=${encodeURIComponent(buyersFormula)}`;

    const buyersRes = await fetch(buyersUrl, { headers });
    if (buyersRes.ok) {
      const buyersData = await buyersRes.json();
      buyersMap = Object.fromEntries(
        (buyersData.records || []).map((b: any) => [b.id, b])
      );
    } else {
      console.warn(`[Aggregated] Failed to fetch buyers: ${buyersRes.status}`);
    }
  }

  console.log(`[Aggregated] Fetched ${Object.keys(buyersMap).length} buyers in ${Date.now() - startTime}ms`);

  // Step 4: Assemble the response
  const propertiesWithMatches = properties.map((property: any) => {
    const propertyMatches = allMatches
      .filter((m: any) => (m.fields['Property Code'] || []).includes(property.id))
      .map((match: any) => {
        const buyerRecordId = match.fields['Contact ID']?.[0];
        const buyer = buyersMap[buyerRecordId];

        return {
          id: match.id,
          buyerRecordId: buyerRecordId || '',
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
