/**
 * Calculator API Handler
 *
 * Actions:
 * - list: Get all calculations (optionally filtered by property/buyer)
 * - get: Get single calculation by ID
 * - create: Create new calculation
 * - update: Update existing calculation
 * - delete: Delete calculation
 * - get-defaults: Get user's saved defaults
 * - update-defaults: Update user's defaults
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

const CALCULATIONS_TABLE = 'Deal Calculations';
const DEFAULTS_TABLE = 'Calculator Defaults';

/**
 * Fetch with retry on 429 rate limit
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`[Calculator API] Retry attempt ${attempt} after ${delay}ms`);
      }

      const response = await fetch(url, options);

      if (response.status === 429 && attempt < maxRetries) {
        lastError = new Error(`Rate limited: ${response.statusText}`);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) throw error;
    }
  }

  throw lastError || new Error('Failed after retries');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({
      error: 'Airtable credentials not configured',
      details: 'Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID environment variables',
    });
  }

  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const { action } = req.query;

  try {
    switch (action) {
      case 'list':
        return handleList(req, res, headers);
      case 'get':
        return handleGet(req, res, headers);
      case 'create':
        return handleCreate(req, res, headers);
      case 'update':
        return handleUpdate(req, res, headers);
      case 'delete':
        return handleDelete(req, res, headers);
      case 'get-defaults':
        return handleGetDefaults(req, res, headers);
      case 'update-defaults':
        return handleUpdateDefaults(req, res, headers);
      default:
        return res.status(400).json({
          error: 'Unknown action',
          action,
          validActions: ['list', 'get', 'create', 'update', 'delete', 'get-defaults', 'update-defaults'],
        });
    }
  } catch (error) {
    console.error('[Calculator API] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * List calculations with optional filters
 */
async function handleList(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  const { propertyCode, contactId, limit = '50', offset } = req.query;

  const params = new URLSearchParams();
  params.append('maxRecords', limit as string);
  params.append('sort[0][field]', 'Updated At');
  params.append('sort[0][direction]', 'desc');

  if (offset) {
    params.append('offset', offset as string);
  }

  // Build filter formula
  const filters: string[] = [];
  if (propertyCode) {
    filters.push(`{Property Code} = "${propertyCode}"`);
  }
  if (contactId) {
    filters.push(`{Contact ID} = "${contactId}"`);
  }

  if (filters.length > 0) {
    const formula = filters.length === 1
      ? filters[0]
      : `AND(${filters.join(', ')})`;
    params.append('filterByFormula', formula);
  }

  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CALCULATIONS_TABLE)}?${params}`;
  console.log('[Calculator API] List URL:', url);

  const response = await fetchWithRetry(url, { headers });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Calculator API] Airtable error:', error);
    return res.status(response.status).json({
      error: 'Failed to fetch calculations',
      details: error,
    });
  }

  const data = await response.json();

  // Transform records
  const calculations = data.records.map((record: { id: string; fields: Record<string, unknown> }) => ({
    id: record.id,
    name: record.fields['Name'] || 'Unnamed Calculation',
    propertyCode: record.fields['Property Code'],
    contactId: record.fields['Contact ID'],
    inputs: record.fields['Inputs'] ? JSON.parse(record.fields['Inputs'] as string) : null,
    outputs: record.fields['Outputs'] ? JSON.parse(record.fields['Outputs'] as string) : null,
    notes: record.fields['Notes'],
    createdAt: record.fields['Created At'],
    updatedAt: record.fields['Updated At'],
  }));

  return res.status(200).json({
    calculations,
    nextOffset: data.offset,
  });
}

/**
 * Get single calculation by ID
 */
async function handleGet(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  const { recordId } = req.query;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId is required' });
  }

  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CALCULATIONS_TABLE)}/${recordId}`;
  const response = await fetchWithRetry(url, { headers });

  if (!response.ok) {
    const error = await response.json();
    return res.status(response.status).json({
      error: 'Failed to fetch calculation',
      details: error,
    });
  }

  const record = await response.json();

  return res.status(200).json({
    calculation: {
      id: record.id,
      name: record.fields['Name'],
      propertyCode: record.fields['Property Code'],
      contactId: record.fields['Contact ID'],
      inputs: record.fields['Inputs'] ? JSON.parse(record.fields['Inputs']) : null,
      outputs: record.fields['Outputs'] ? JSON.parse(record.fields['Outputs']) : null,
      notes: record.fields['Notes'],
      createdAt: record.fields['Created At'],
      updatedAt: record.fields['Updated At'],
    },
  });
}

/**
 * Create new calculation
 */
async function handleCreate(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { name, propertyCode, contactId, inputs, outputs, notes } = req.body;

  if (!inputs) {
    return res.status(400).json({ error: 'inputs is required' });
  }

  const fields: Record<string, unknown> = {
    'Name': name || 'New Calculation',
    'Inputs': JSON.stringify(inputs),
    'Outputs': outputs ? JSON.stringify(outputs) : null,
    'Created At': new Date().toISOString(),
    'Updated At': new Date().toISOString(),
  };

  if (propertyCode) {
    fields['Property Code'] = propertyCode;
  }
  if (contactId) {
    fields['Contact ID'] = contactId;
  }
  if (notes) {
    fields['Notes'] = notes;
  }

  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CALCULATIONS_TABLE)}`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Calculator API] Create error:', error);
    return res.status(response.status).json({
      error: 'Failed to create calculation',
      details: error,
    });
  }

  const record = await response.json();

  return res.status(201).json({
    success: true,
    calculation: {
      id: record.id,
      name: record.fields['Name'],
      propertyCode: record.fields['Property Code'],
      contactId: record.fields['Contact ID'],
      inputs: record.fields['Inputs'] ? JSON.parse(record.fields['Inputs']) : null,
      outputs: record.fields['Outputs'] ? JSON.parse(record.fields['Outputs']) : null,
      notes: record.fields['Notes'],
      createdAt: record.fields['Created At'],
      updatedAt: record.fields['Updated At'],
    },
  });
}

/**
 * Update existing calculation
 */
async function handleUpdate(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use PUT, PATCH, or POST.' });
  }

  const { recordId } = req.query;
  const { name, inputs, outputs, notes } = req.body;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId is required' });
  }

  const fields: Record<string, unknown> = {
    'Updated At': new Date().toISOString(),
  };

  if (name !== undefined) fields['Name'] = name;
  if (inputs !== undefined) fields['Inputs'] = JSON.stringify(inputs);
  if (outputs !== undefined) fields['Outputs'] = JSON.stringify(outputs);
  if (notes !== undefined) fields['Notes'] = notes;

  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CALCULATIONS_TABLE)}/${recordId}`;
  const response = await fetchWithRetry(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Calculator API] Update error:', error);
    return res.status(response.status).json({
      error: 'Failed to update calculation',
      details: error,
    });
  }

  const record = await response.json();

  return res.status(200).json({
    success: true,
    calculation: {
      id: record.id,
      name: record.fields['Name'],
      propertyCode: record.fields['Property Code'],
      contactId: record.fields['Contact ID'],
      inputs: record.fields['Inputs'] ? JSON.parse(record.fields['Inputs']) : null,
      outputs: record.fields['Outputs'] ? JSON.parse(record.fields['Outputs']) : null,
      notes: record.fields['Notes'],
      updatedAt: record.fields['Updated At'],
    },
  });
}

/**
 * Delete calculation
 */
async function handleDelete(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  const { recordId } = req.query;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId is required' });
  }

  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CALCULATIONS_TABLE)}/${recordId}`;
  const response = await fetchWithRetry(url, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Calculator API] Delete error:', error);
    return res.status(response.status).json({
      error: 'Failed to delete calculation',
      details: error,
    });
  }

  return res.status(200).json({
    success: true,
    deletedId: recordId,
  });
}

/**
 * Get calculator defaults
 */
async function handleGetDefaults(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  // Get the first defaults record (single-user system for now)
  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(DEFAULTS_TABLE)}?maxRecords=1`;

  try {
    const response = await fetchWithRetry(url, { headers });

    if (!response.ok) {
      // If table doesn't exist or other error, return system defaults
      console.log('[Calculator API] Defaults table error, returning system defaults');
      return res.status(200).json({
        defaults: getSystemDefaults(),
      });
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      // No defaults record, return system defaults
      return res.status(200).json({
        defaults: getSystemDefaults(),
      });
    }

    const record = data.records[0];
    return res.status(200).json({
      defaults: {
        id: record.id,
        wholesaleDiscount: record.fields['Wholesale Discount'] ?? 70,
        yourFee: record.fields['Your Fee'] ?? 5000,
        creditToBuyer: record.fields['Credit to Buyer'] ?? 5000,
        maintenancePercent: record.fields['Maintenance Percent'] ?? 5,
        propertyMgmtPercent: record.fields['Property Mgmt Percent'] ?? 10,
        dscrInterestRate: record.fields['DSCR Interest Rate'] ?? 8,
        dscrTermYears: record.fields['DSCR Term Years'] ?? 30,
        dscrBalloonYears: record.fields['DSCR Balloon Years'] ?? 5,
        dscrPoints: record.fields['DSCR Points'] ?? 2,
        dscrFees: record.fields['DSCR Fees'] ?? 1500,
        wrapInterestRate: record.fields['Wrap Interest Rate'] ?? 9,
        wrapTermYears: record.fields['Wrap Term Years'] ?? 30,
        wrapBalloonYears: record.fields['Wrap Balloon Years'] ?? 5,
        wrapServiceFee: record.fields['Wrap Service Fee'] ?? 35,
        closingCosts: record.fields['Closing Costs'] ?? 3000,
        appraisalCost: record.fields['Appraisal Cost'] ?? 500,
        llcCost: record.fields['LLC Cost'] ?? 200,
        servicingFee: record.fields['Servicing Fee'] ?? 100,
        updatedAt: record.fields['Updated At'],
      },
    });
  } catch (error) {
    console.error('[Calculator API] Get defaults error:', error);
    // On any error, return system defaults
    return res.status(200).json({
      defaults: getSystemDefaults(),
    });
  }
}

/**
 * Update calculator defaults
 */
async function handleUpdateDefaults(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use PUT, PATCH, or POST.' });
  }

  const defaults = req.body;

  const fields: Record<string, unknown> = {
    'Updated At': new Date().toISOString(),
  };

  // Map all fields
  if (defaults.wholesaleDiscount !== undefined) fields['Wholesale Discount'] = defaults.wholesaleDiscount;
  if (defaults.yourFee !== undefined) fields['Your Fee'] = defaults.yourFee;
  if (defaults.creditToBuyer !== undefined) fields['Credit to Buyer'] = defaults.creditToBuyer;
  if (defaults.maintenancePercent !== undefined) fields['Maintenance Percent'] = defaults.maintenancePercent;
  if (defaults.propertyMgmtPercent !== undefined) fields['Property Mgmt Percent'] = defaults.propertyMgmtPercent;
  if (defaults.dscrInterestRate !== undefined) fields['DSCR Interest Rate'] = defaults.dscrInterestRate;
  if (defaults.dscrTermYears !== undefined) fields['DSCR Term Years'] = defaults.dscrTermYears;
  if (defaults.dscrBalloonYears !== undefined) fields['DSCR Balloon Years'] = defaults.dscrBalloonYears;
  if (defaults.dscrPoints !== undefined) fields['DSCR Points'] = defaults.dscrPoints;
  if (defaults.dscrFees !== undefined) fields['DSCR Fees'] = defaults.dscrFees;
  if (defaults.wrapInterestRate !== undefined) fields['Wrap Interest Rate'] = defaults.wrapInterestRate;
  if (defaults.wrapTermYears !== undefined) fields['Wrap Term Years'] = defaults.wrapTermYears;
  if (defaults.wrapBalloonYears !== undefined) fields['Wrap Balloon Years'] = defaults.wrapBalloonYears;
  if (defaults.wrapServiceFee !== undefined) fields['Wrap Service Fee'] = defaults.wrapServiceFee;
  if (defaults.closingCosts !== undefined) fields['Closing Costs'] = defaults.closingCosts;
  if (defaults.appraisalCost !== undefined) fields['Appraisal Cost'] = defaults.appraisalCost;
  if (defaults.llcCost !== undefined) fields['LLC Cost'] = defaults.llcCost;
  if (defaults.servicingFee !== undefined) fields['Servicing Fee'] = defaults.servicingFee;

  try {
    // Check if defaults record exists
    const listUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(DEFAULTS_TABLE)}?maxRecords=1`;
    const listResponse = await fetchWithRetry(listUrl, { headers });
    const listData = await listResponse.json();

    let response: Response;

    if (listData.records?.length > 0) {
      // Update existing
      const recordId = listData.records[0].id;
      const updateUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(DEFAULTS_TABLE)}/${recordId}`;
      response = await fetchWithRetry(updateUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields }),
      });
    } else {
      // Create new
      const createUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(DEFAULTS_TABLE)}`;
      response = await fetchWithRetry(createUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fields }),
      });
    }

    if (!response.ok) {
      const error = await response.json();
      console.error('[Calculator API] Update defaults error:', error);
      return res.status(response.status).json({
        error: 'Failed to update defaults',
        details: error,
      });
    }

    return res.status(200).json({
      success: true,
      defaults,
    });
  } catch (error) {
    console.error('[Calculator API] Update defaults error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update defaults',
    });
  }
}

/**
 * Get system default values
 */
function getSystemDefaults() {
  return {
    wholesaleDiscount: 70,
    yourFee: 5000,
    creditToBuyer: 5000,
    maintenancePercent: 5,
    propertyMgmtPercent: 10,
    dscrInterestRate: 8,
    dscrTermYears: 30,
    dscrBalloonYears: 5,
    dscrPoints: 2,
    dscrFees: 1500,
    wrapInterestRate: 9,
    wrapTermYears: 30,
    wrapBalloonYears: 5,
    wrapServiceFee: 35,
    closingCosts: 3000,
    appraisalCost: 500,
    llcCost: 200,
    servicingFee: 100,
  };
}
