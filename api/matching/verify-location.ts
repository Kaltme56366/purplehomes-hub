/**
 * Location Verification Endpoint
 * Shows geocoding details for a buyer-property pair to verify accuracy
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateDistance } from './distanceCalculator';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Airtable credentials not configured' });
  }

  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // Fetch a sample of buyers and properties with coordinates
    const [buyersRes, propertiesRes] = await Promise.all([
      fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?maxRecords=10`, { headers }),
      fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties?maxRecords=10`, { headers }),
    ]);

    if (!buyersRes.ok || !propertiesRes.ok) {
      throw new Error('Failed to fetch data from Airtable');
    }

    const buyersData = await buyersRes.json();
    const propertiesData = await propertiesRes.json();

    const buyers = buyersData.records || [];
    const properties = propertiesData.records || [];

    // Find buyers and properties with coordinates
    const buyersWithCoords = buyers.filter((b: any) =>
      b.fields['Lat'] && b.fields['Lng']
    );
    const propertiesWithCoords = properties.filter((p: any) =>
      p.fields['Lat'] && p.fields['Lng']
    );

    // Build verification examples
    const examples: any[] = [];

    // Take first buyer with coords and first few properties
    if (buyersWithCoords.length > 0) {
      const buyer = buyersWithCoords[0];
      const buyerLat = buyer.fields['Lat'];
      const buyerLng = buyer.fields['Lng'];
      const buyerCity = buyer.fields['City'] || buyer.fields['Preferred Location'] || 'Unknown';
      const buyerName = `${buyer.fields['First Name'] || ''} ${buyer.fields['Last Name'] || ''}`.trim();

      for (const property of propertiesWithCoords.slice(0, 5)) {
        const propLat = property.fields['Lat'];
        const propLng = property.fields['Lng'];
        const distance = calculateDistance(buyerLat, buyerLng, propLat, propLng);

        examples.push({
          buyer: {
            name: buyerName,
            preferredLocation: buyerCity,
            preferredZipCodes: buyer.fields['Preferred Zip Codes'],
            coordinates: { lat: buyerLat, lng: buyerLng },
            googleMapsLink: `https://www.google.com/maps?q=${buyerLat},${buyerLng}`,
          },
          property: {
            address: property.fields['Address'],
            city: property.fields['City'],
            state: property.fields['State'],
            zipCode: property.fields['Zip Code'] || property.fields['ZIP Code'],
            coordinates: { lat: propLat, lng: propLng },
            googleMapsLink: `https://www.google.com/maps?q=${propLat},${propLng}`,
          },
          calculatedDistance: {
            miles: Math.round(distance * 10) / 10,
            km: Math.round(distance * 1.60934 * 10) / 10,
          },
          verifyOnGoogleMaps: `https://www.google.com/maps/dir/${buyerLat},${buyerLng}/${propLat},${propLng}`,
        });
      }
    }

    // Also show all buyers/properties with their coordinates for reference
    const allBuyersLocations = buyers.map((b: any) => ({
      name: `${b.fields['First Name'] || ''} ${b.fields['Last Name'] || ''}`.trim(),
      preferredLocation: b.fields['City'] || b.fields['Preferred Location'],
      preferredZipCodes: b.fields['Preferred Zip Codes'],
      hasCoordinates: !!(b.fields['Lat'] && b.fields['Lng']),
      coordinates: b.fields['Lat'] && b.fields['Lng']
        ? { lat: b.fields['Lat'], lng: b.fields['Lng'] }
        : null,
    }));

    const allPropertiesLocations = properties.map((p: any) => ({
      address: p.fields['Address'],
      city: p.fields['City'],
      zipCode: p.fields['Zip Code'] || p.fields['ZIP Code'],
      hasCoordinates: !!(p.fields['Lat'] && p.fields['Lng']),
      coordinates: p.fields['Lat'] && p.fields['Lng']
        ? { lat: p.fields['Lat'], lng: p.fields['Lng'] }
        : null,
    }));

    return res.status(200).json({
      summary: {
        totalBuyers: buyers.length,
        buyersWithCoordinates: buyersWithCoords.length,
        totalProperties: properties.length,
        propertiesWithCoordinates: propertiesWithCoords.length,
      },
      verificationExamples: examples,
      allBuyersLocations,
      allPropertiesLocations,
      howToVerify: [
        '1. Click the "verifyOnGoogleMaps" link to see driving directions between buyer and property',
        '2. Compare our calculated distance with Google Maps distance',
        '3. Click individual "googleMapsLink" to verify each coordinate is in the correct location',
        '4. The buyer location should be near their "Preferred Location" city',
        '5. The property location should match its address',
      ],
    });
  } catch (error: any) {
    console.error('[Verify Location] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
