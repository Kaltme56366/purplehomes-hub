/**
 * Geocoding API Endpoint
 *
 * Provides geocoding services for converting addresses and cities
 * to lat/lng coordinates using Mapbox.
 *
 * Routes:
 *   POST /api/geocode - Geocode a single location
 *   POST /api/geocode?action=batch - Batch geocode multiple locations
 *   POST /api/geocode?action=buyer - Geocode buyer location
 *   POST /api/geocode?action=property - Geocode property location
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  geocode,
  geocodeAddress,
  geocodeCity,
  geocodeZip,
  geocodeBuyerLocation,
  geocodePropertyLocation,
  batchGeocode,
  isMapboxConfigured,
  type GeocodeResult,
} from '../lib/mapbox';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Geocode API] Request:', {
    method: req.method,
    action: req.query.action,
    timestamp: new Date().toISOString(),
  });

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isMapboxConfigured()) {
    return res.status(500).json({
      error: 'Mapbox not configured',
      message: 'MAPBOX_ACCESS_TOKEN environment variable is not set',
    });
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'batch':
        return handleBatchGeocode(req, res);

      case 'buyer':
        return handleBuyerGeocode(req, res);

      case 'property':
        return handlePropertyGeocode(req, res);

      default:
        return handleSingleGeocode(req, res);
    }
  } catch (error: any) {
    console.error('[Geocode API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Handle single geocode request
 * POST /api/geocode
 * Body: { address?, city?, state?, zip?, query? }
 */
async function handleSingleGeocode(req: VercelRequest, res: VercelResponse) {
  const { address, city, state, zip, query } = req.body;

  let result: GeocodeResult | null = null;

  if (query) {
    // Raw query string
    result = await geocode(query);
  } else if (address) {
    // Full address
    result = await geocodeAddress(address, city, state, zip);
  } else if (city && state) {
    // City and state
    result = await geocodeCity(city, state);
  } else if (zip) {
    // ZIP code
    result = await geocodeZip(zip, state);
  } else {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Provide query, address, city+state, or zip',
    });
  }

  if (!result) {
    return res.status(404).json({
      error: 'Geocoding failed',
      message: 'Could not find coordinates for the provided location',
    });
  }

  return res.status(200).json(result);
}

/**
 * Handle batch geocode request
 * POST /api/geocode?action=batch
 * Body: { queries: string[] }
 */
async function handleBatchGeocode(req: VercelRequest, res: VercelResponse) {
  const { queries } = req.body;

  if (!Array.isArray(queries) || queries.length === 0) {
    return res.status(400).json({
      error: 'Missing queries array',
      message: 'Provide an array of query strings to geocode',
    });
  }

  // Limit batch size to prevent abuse
  if (queries.length > 50) {
    return res.status(400).json({
      error: 'Batch too large',
      message: 'Maximum 50 queries per batch',
    });
  }

  const results = await batchGeocode(queries);

  return res.status(200).json({
    results,
    successful: results.filter(r => r !== null).length,
    failed: results.filter(r => r === null).length,
    total: results.length,
  });
}

/**
 * Handle buyer location geocode
 * POST /api/geocode?action=buyer
 * Body: { city?, preferredLocation?, state?, preferredZipCodes?: string[] }
 */
async function handleBuyerGeocode(req: VercelRequest, res: VercelResponse) {
  const { city, preferredLocation, state, preferredZipCodes } = req.body;

  const result = await geocodeBuyerLocation({
    city,
    preferredLocation,
    state,
    preferredZipCodes,
  });

  if (!result) {
    return res.status(404).json({
      error: 'Geocoding failed',
      message: 'Could not geocode buyer location from available data',
      attempted: { city, preferredLocation, state, preferredZipCodes },
    });
  }

  return res.status(200).json(result);
}

/**
 * Handle property location geocode
 * POST /api/geocode?action=property
 * Body: { address?, city?, state?, zipCode? }
 */
async function handlePropertyGeocode(req: VercelRequest, res: VercelResponse) {
  const { address, city, state, zipCode } = req.body;

  const result = await geocodePropertyLocation({
    address,
    city,
    state,
    zipCode,
  });

  if (!result) {
    return res.status(404).json({
      error: 'Geocoding failed',
      message: 'Could not geocode property location from available data',
      attempted: { address, city, state, zipCode },
    });
  }

  return res.status(200).json(result);
}
