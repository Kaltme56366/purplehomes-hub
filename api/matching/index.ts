/**
 * AI Property Matching API
 * Handles running AI matching between buyers and properties
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Matching API] Request:', {
    method: req.method,
    action: req.query.action,
  });

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

  const { action } = req.query;

  try {
    switch (action) {
      case 'run':
        return await handleRunMatching(req, res, headers);

      case 'run-buyer':
        return await handleRunBuyerMatching(req, res, headers);

      case 'run-property':
        return await handleRunPropertyMatching(req, res, headers);

      default:
        return res.status(400).json({ error: 'Unknown action', action });
    }
  } catch (error: any) {
    console.error('[Matching API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Run matching for all buyers against all properties
 */
async function handleRunMatching(req: VercelRequest, res: VercelResponse, headers: any) {
  const { minScore = 60 } = req.body || {};

  console.log('[Matching] Running full matching with minScore:', minScore);

  // Fetch all buyers
  const buyersRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers`, { headers });
  if (!buyersRes.ok) throw new Error('Failed to fetch buyers');
  const buyersData = await buyersRes.json();
  const buyers = buyersData.records;

  // Fetch all properties
  const propertiesRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`, { headers });
  if (!propertiesRes.ok) throw new Error('Failed to fetch properties');
  const propertiesData = await propertiesRes.json();
  const properties = propertiesData.records;

  console.log(`[Matching] Found ${buyers.length} buyers and ${properties.length} properties`);

  let matchesCreated = 0;
  let matchesUpdated = 0;

  // Process each buyer
  for (const buyer of buyers) {
    for (const property of properties) {
      const score = await generateMatchScore(buyer, property);

      if (score.score >= minScore) {
        // Create or update match
        const matchResult = await createOrUpdateMatch(buyer, property, score, headers);
        if (matchResult.created) {
          matchesCreated++;
        } else {
          matchesUpdated++;
        }
      }
    }
  }

  return res.status(200).json({
    success: true,
    message: `Matching complete! Created ${matchesCreated} new matches, updated ${matchesUpdated}.`,
    stats: {
      buyersProcessed: buyers.length,
      propertiesProcessed: properties.length,
      matchesCreated,
      matchesUpdated,
    },
  });
}

/**
 * Run matching for a single buyer
 */
async function handleRunBuyerMatching(req: VercelRequest, res: VercelResponse, headers: any) {
  const { contactId } = req.query;
  const { minScore = 60 } = req.body || {};

  if (!contactId) {
    return res.status(400).json({ error: 'contactId is required' });
  }

  console.log('[Matching] Running matching for buyer:', contactId);

  // Fetch buyer
  const buyerFormula = encodeURIComponent(`{Contact ID} = "${contactId}"`);
  const buyerRes = await fetch(
    `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?filterByFormula=${buyerFormula}`,
    { headers }
  );
  if (!buyerRes.ok) throw new Error('Failed to fetch buyer');
  const buyerData = await buyerRes.json();

  if (!buyerData.records || buyerData.records.length === 0) {
    return res.status(404).json({ error: 'Buyer not found' });
  }

  const buyer = buyerData.records[0];

  // Fetch all properties
  const propertiesRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties`, { headers });
  if (!propertiesRes.ok) throw new Error('Failed to fetch properties');
  const propertiesData = await propertiesRes.json();
  const properties = propertiesData.records;

  let matchesCreated = 0;
  let matchesUpdated = 0;

  // Match against all properties
  for (const property of properties) {
    const score = await generateMatchScore(buyer, property);

    if (score.score >= minScore) {
      const matchResult = await createOrUpdateMatch(buyer, property, score, headers);
      if (matchResult.created) {
        matchesCreated++;
      } else {
        matchesUpdated++;
      }
    }
  }

  return res.status(200).json({
    success: true,
    message: `Found ${matchesCreated + matchesUpdated} matches for ${buyer.fields['First Name']} ${buyer.fields['Last Name']}`,
    stats: {
      buyersProcessed: 1,
      propertiesProcessed: properties.length,
      matchesCreated,
      matchesUpdated,
    },
  });
}

/**
 * Run matching for a single property
 */
async function handleRunPropertyMatching(req: VercelRequest, res: VercelResponse, headers: any) {
  const { propertyCode } = req.query;
  const { minScore = 60 } = req.body || {};

  if (!propertyCode) {
    return res.status(400).json({ error: 'propertyCode is required' });
  }

  console.log('[Matching] Running matching for property:', propertyCode);

  // Fetch property
  const propertyFormula = encodeURIComponent(`{Property Code} = "${propertyCode}"`);
  const propertyRes = await fetch(
    `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?filterByFormula=${propertyFormula}`,
    { headers }
  );
  if (!propertyRes.ok) throw new Error('Failed to fetch property');
  const propertyData = await propertyRes.json();

  if (!propertyData.records || propertyData.records.length === 0) {
    return res.status(404).json({ error: 'Property not found' });
  }

  const property = propertyData.records[0];

  // Fetch all buyers
  const buyersRes = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers`, { headers });
  if (!buyersRes.ok) throw new Error('Failed to fetch buyers');
  const buyersData = await buyersRes.json();
  const buyers = buyersData.records;

  let matchesCreated = 0;
  let matchesUpdated = 0;

  // Match against all buyers
  for (const buyer of buyers) {
    const score = await generateMatchScore(buyer, property);

    if (score.score >= minScore) {
      const matchResult = await createOrUpdateMatch(buyer, property, score, headers);
      if (matchResult.created) {
        matchesCreated++;
      } else {
        matchesUpdated++;
      }
    }
  }

  return res.status(200).json({
    success: true,
    message: `Found ${matchesCreated + matchesUpdated} buyer matches for property ${propertyCode}`,
    stats: {
      buyersProcessed: buyers.length,
      propertiesProcessed: 1,
      matchesCreated,
      matchesUpdated,
    },
  });
}

/**
 * Generate match score using OpenAI or rule-based fallback
 */
async function generateMatchScore(buyer: any, property: any): Promise<{score: number; reasoning: string; highlights: string[]}> {
  const buyerFields = buyer.fields;
  const propertyFields = property.fields;

  // Build criteria
  const buyerCriteria = {
    firstName: buyerFields['First Name'] || '',
    lastName: buyerFields['Last Name'] || '',
    monthlyIncome: buyerFields['Monthly Income'],
    monthlyLiabilities: buyerFields['Monthly Liabilities'],
    downPayment: buyerFields['Downpayment'],
    desiredBeds: buyerFields['No. of Bedrooms'],
    desiredBaths: buyerFields['No. of Bath'],
    city: buyerFields['City'],
    location: buyerFields['Location'],
    buyerType: buyerFields['Buyer Type'],
  };

  const propertyDetails = {
    propertyCode: propertyFields['Property Code'],
    address: propertyFields['Address'],
    city: propertyFields['City'],
    beds: propertyFields['Beds'],
    baths: propertyFields['Baths'],
    sqft: propertyFields['Sqft'],
  };

  // Use rule-based matching for now (OpenAI optional)
  return generateRuleBasedScore(buyerCriteria, propertyDetails);
}

/**
 * Rule-based matching
 */
function generateRuleBasedScore(buyer: any, property: any): {score: number; reasoning: string; highlights: string[]} {
  let score = 0;
  const highlights: string[] = [];

  // Bedroom match (30 points)
  if (buyer.desiredBeds) {
    if (property.beds === buyer.desiredBeds) {
      score += 30;
      highlights.push(`Perfect match: ${property.beds} bedrooms`);
    } else if (Math.abs(property.beds - buyer.desiredBeds) === 1) {
      score += 20;
      highlights.push(`Close: ${property.beds} bedrooms`);
    } else if (property.beds > buyer.desiredBeds) {
      score += 10;
    }
  } else {
    score += 15;
  }

  // Bathroom match (20 points)
  if (buyer.desiredBaths) {
    if (property.baths >= buyer.desiredBaths) {
      score += 20;
      highlights.push(`${property.baths} bathrooms`);
    } else {
      score += 5;
    }
  } else {
    score += 10;
  }

  // Location match (30 points)
  if (buyer.city || buyer.location) {
    const buyerLoc = (buyer.city || buyer.location || '').toLowerCase();
    const propCity = (property.city || '').toLowerCase();
    if (propCity.includes(buyerLoc) || buyerLoc.includes(propCity)) {
      score += 30;
      highlights.push(`Location: ${property.city}`);
    } else {
      score += 5;
    }
  } else {
    score += 15;
  }

  // Budget match (20 points)
  if (buyer.downPayment) {
    score += 20;
    highlights.push('Budget considered');
  } else {
    score += 10;
  }

  score = Math.min(100, score);

  const reasoning = score >= 70
    ? `Strong match based on buyer preferences and property features.`
    : score >= 50
    ? `Good match with reasonable alignment on key criteria.`
    : `Fair match with some differences in preferences.`;

  return { score, reasoning, highlights };
}

/**
 * Create or update match in Airtable
 */
async function createOrUpdateMatch(buyer: any, property: any, score: any, headers: any): Promise<{created: boolean}> {
  // Check if match already exists
  const formula = encodeURIComponent(
    `AND(SEARCH("${buyer.id}", ARRAYJOIN({Contact ID})), SEARCH("${property.id}", ARRAYJOIN({Property Code})))`
  );

  const existingRes = await fetch(
    `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches?filterByFormula=${formula}`,
    { headers }
  );

  if (existingRes.ok) {
    const existingData = await existingRes.json();

    if (existingData.records && existingData.records.length > 0) {
      // Update existing
      const matchId = existingData.records[0].id;
      await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches/${matchId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fields: {
            'Match Score': score.score,
            'Match Notes': `${score.reasoning}\n\nHighlights: ${score.highlights.join(', ')}`,
            'Match Status': 'Active',
          },
        }),
      });
      return { created: false };
    }
  }

  // Create new match
  await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fields: {
        'Property Code': [property.id],
        'Contact ID': [buyer.id],
        'Match Score': score.score,
        'Match Notes': `${score.reasoning}\n\nHighlights: ${score.highlights.join(', ')}`,
        'Match Status': 'Active',
      },
    }),
  });

  return { created: true };
}
