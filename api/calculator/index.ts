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
 *
 * Stores inputs/outputs as JSON fields for simplicity
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
 * Parse JSON field safely
 */
function parseJSON(value: unknown, fallback: unknown = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value as string);
  } catch {
    return fallback;
  }
}

/**
 * Transform Airtable record to API response
 */
function recordToCalculation(record: { id: string; fields: Record<string, unknown> }) {
  const { fields } = record;
  return {
    id: record.id,
    name: fields['Name'] || 'Unnamed Calculation',
    propertyCode: fields['Property Code'],
    contactId: fields['Contact ID'],
    inputs: parseJSON(fields['Inputs'], {}),
    outputs: parseJSON(fields['Outputs'], {}),
    notes: fields['Notes'],
    createdAt: fields['Created At'],
    updatedAt: fields['Updated At'],
  };
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
  const calculations = data.records.map(recordToCalculation);

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
    calculation: recordToCalculation(record),
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

  const now = new Date().toISOString();
  const fields: Record<string, unknown> = {
    'Name': name || inputs.name || 'New Calculation',
    'Inputs': JSON.stringify(inputs),
    'Outputs': JSON.stringify(outputs || {}),
    'Created At': now,
    'Updated At': now,
  };

  if (propertyCode || inputs.propertyCode) {
    fields['Property Code'] = propertyCode || inputs.propertyCode;
  }
  if (contactId || inputs.contactId) {
    fields['Contact ID'] = contactId || inputs.contactId;
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
    calculation: recordToCalculation(record),
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
  const { name, propertyCode, contactId, inputs, outputs, notes } = req.body;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId is required' });
  }

  const fields: Record<string, unknown> = {
    'Updated At': new Date().toISOString(),
  };

  if (name !== undefined) fields['Name'] = name;
  if (inputs !== undefined) fields['Inputs'] = JSON.stringify(inputs);
  if (outputs !== undefined) fields['Outputs'] = JSON.stringify(outputs);
  if (propertyCode !== undefined) fields['Property Code'] = propertyCode;
  if (contactId !== undefined) fields['Contact ID'] = contactId;
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
    calculation: recordToCalculation(record),
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

// ============ CALCULATOR DEFAULTS ============

const SYSTEM_DEFAULTS = {
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

/**
 * Get calculator defaults
 */
async function handleGetDefaults(
  _req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(DEFAULTS_TABLE)}?maxRecords=1`;

  try {
    const response = await fetchWithRetry(url, { headers });

    if (!response.ok) {
      return res.status(200).json({ defaults: SYSTEM_DEFAULTS });
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(200).json({ defaults: SYSTEM_DEFAULTS });
    }

    const record = data.records[0];
    const defaults = parseJSON(record.fields['Defaults'], SYSTEM_DEFAULTS);

    return res.status(200).json({
      defaults: { ...SYSTEM_DEFAULTS, ...defaults },
      recordId: record.id,
    });
  } catch (error) {
    console.error('[Calculator API] Get defaults error:', error);
    return res.status(200).json({ defaults: SYSTEM_DEFAULTS });
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

  const newDefaults = req.body;

  try {
    // Check for existing record
    const listUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(DEFAULTS_TABLE)}?maxRecords=1`;
    const listResponse = await fetchWithRetry(listUrl, { headers });
    const listData = await listResponse.json();

    const fields = {
      'Defaults': JSON.stringify(newDefaults),
      'Updated At': new Date().toISOString(),
    };

    let url: string;
    let method: string;

    if (listData.records && listData.records.length > 0) {
      // Update existing
      url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(DEFAULTS_TABLE)}/${listData.records[0].id}`;
      method = 'PATCH';
    } else {
      // Create new
      url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(DEFAULTS_TABLE)}`;
      method = 'POST';
    }

    const response = await fetchWithRetry(url, {
      method,
      headers,
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({
        error: 'Failed to update defaults',
        details: error,
      });
    }

    return res.status(200).json({
      success: true,
      defaults: newDefaults,
    });
  } catch (error) {
    console.error('[Calculator API] Update defaults error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update defaults',
    });
  }
}
