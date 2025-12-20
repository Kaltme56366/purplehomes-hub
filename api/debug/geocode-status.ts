/**
 * Debug endpoint to check geocoding configuration
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isMapboxConfigured, geocode } from '../lib/mapbox';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const mapboxConfigured = isMapboxConfigured();
  const mapboxTokenLength = process.env.MAPBOX_ACCESS_TOKEN?.length || 0;

  // Test geocoding with a known location
  let geocodeTest = null;
  if (mapboxConfigured) {
    try {
      geocodeTest = await geocode('New Orleans, LA');
    } catch (error: any) {
      geocodeTest = { error: error.message };
    }
  }

  // Check a sample buyer and property for Lat/Lng
  let sampleData = null;
  if (AIRTABLE_API_KEY && AIRTABLE_BASE_ID) {
    try {
      const headers = {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      };

      const [buyersRes, propertiesRes] = await Promise.all([
        fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?maxRecords=1`, { headers }),
        fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?maxRecords=1`, { headers }),
      ]);

      const buyersData = await buyersRes.json();
      const propertiesData = await propertiesRes.json();

      const buyer = buyersData.records?.[0];
      const property = propertiesData.records?.[0];

      sampleData = {
        buyer: buyer ? {
          id: buyer.id,
          name: `${buyer.fields['First Name']} ${buyer.fields['Last Name']}`,
          preferredLocation: buyer.fields['Preferred Location'],
          city: buyer.fields['City'],
          state: buyer.fields['State'],
          lat: buyer.fields['Lat'],
          lng: buyer.fields['Lng'],
          hasCoordinates: !!(buyer.fields['Lat'] && buyer.fields['Lng']),
        } : null,
        property: property ? {
          id: property.id,
          address: property.fields['Address'],
          city: property.fields['City'],
          state: property.fields['State'],
          lat: property.fields['Lat'],
          lng: property.fields['Lng'],
          hasCoordinates: !!(property.fields['Lat'] && property.fields['Lng']),
        } : null,
      };
    } catch (error: any) {
      sampleData = { error: error.message };
    }
  }

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    configuration: {
      mapboxConfigured,
      mapboxTokenLength,
      mapboxTokenPrefix: process.env.MAPBOX_ACCESS_TOKEN?.substring(0, 10) + '...',
      airtableConfigured: !!(AIRTABLE_API_KEY && AIRTABLE_BASE_ID),
    },
    geocodeTest,
    sampleData,
    diagnosis: !mapboxConfigured
      ? '❌ MAPBOX_ACCESS_TOKEN is not set in Vercel environment variables'
      : geocodeTest && 'error' in geocodeTest
      ? '❌ Mapbox token is invalid or API error'
      : '✅ Geocoding is working',
  });
}
