/**
 * Property Match Scoring Module
 * Implements distance-based scoring with Either/Or logic (50 miles OR preferred ZIP)
 */

import { calculateDistance } from './distanceCalculator';
import { isInPreferredZip } from './zipMatcher';

export interface MatchScore {
  score: number;
  distance?: number;
  locationScore: number;
  bedsScore: number;
  bathsScore: number;
  budgetScore: number;
  reasoning: string;
  highlights: string[];
  concerns: string[];
  isPriority: boolean; // Within 50 miles OR in preferred ZIP
}

/**
 * Generates a comprehensive match score between a buyer and property
 * Implements Zillow-style ranking: Priority matches (35-100) appear first, others (5-65) below
 *
 * @param buyer - Buyer record from Airtable
 * @param property - Property record from Airtable
 * @returns MatchScore object with detailed scoring breakdown
 */
export function generateMatchScore(buyer: any, property: any): MatchScore {
  const highlights: string[] = [];
  const concerns: string[] = [];

  // Extract buyer data
  const buyerFields = buyer.fields;
  const buyerLat = buyerFields.Latitude;
  const buyerLng = buyerFields.Longitude;
  const preferredZipCodes = buyerFields['Preferred Zip Codes'] || [];
  const desiredBeds = buyerFields['No. of Bedrooms'];
  const desiredBaths = buyerFields['No. of Bath'];
  const downPayment = buyerFields['Downpayment'];

  // Extract property data
  const propertyFields = property.fields;
  const propertyLat = propertyFields.lat;
  const propertyLng = propertyFields.lng;
  const propertyAddress = propertyFields['Address'] || '';
  const propertyPrice = propertyFields['Price'];
  const propertyBeds = propertyFields['Beds'];
  const propertyBaths = propertyFields['Baths'];

  // ====================
  // LOCATION/ZIP PRIORITY SCORE (0-40 points)
  // ====================

  let distance: number | undefined;
  let locationScore = 0;
  let isPriority = false;

  const hasLocation = buyerLat && buyerLng && propertyLat && propertyLng;
  const hasZipCodes = Array.isArray(preferredZipCodes) && preferredZipCodes.length > 0;

  // Calculate distance if coordinates available
  if (hasLocation) {
    distance = calculateDistance(buyerLat, buyerLng, propertyLat, propertyLng);
  }

  // Check ZIP match
  const inPreferredZip = hasZipCodes && isInPreferredZip(propertyAddress, preferredZipCodes);

  // EITHER/OR LOGIC: Priority if within 50 miles OR in preferred ZIP
  const withinRadius = hasLocation && distance! <= 50;
  isPriority = withinRadius || inPreferredZip;

  if (isPriority) {
    // PRIORITY MATCH - appears first
    if (hasLocation && distance! <= 25) {
      locationScore = 40;
      highlights.push(`Very close: ${distance!.toFixed(1)} miles away`);
    } else if (hasLocation && distance! <= 50) {
      locationScore = 35;
      highlights.push(`Within 50 miles: ${distance!.toFixed(1)} miles`);
    } else if (inPreferredZip) {
      locationScore = 35;
      highlights.push('In preferred ZIP code');
      if (hasLocation && distance) {
        highlights.push(`${distance.toFixed(1)} miles away`);
      }
    }
  } else {
    // NOT PRIORITY - still score it (Zillow-style: show all properties)
    if (hasLocation && distance) {
      if (distance <= 100) {
        locationScore = 15;
        concerns.push(`Outside 50-mile radius: ${distance.toFixed(1)} miles`);
      } else if (distance <= 200) {
        locationScore = 10;
        concerns.push(`Far from preferred area: ${distance.toFixed(1)} miles`);
      } else {
        locationScore = 5;
        concerns.push(`Very far: ${distance.toFixed(1)} miles`);
      }
    } else if (hasZipCodes) {
      locationScore = 10;
      concerns.push('Not in preferred ZIP codes');
    } else {
      locationScore = 10; // No location preference
    }
  }

  // ====================
  // BEDS MATCH (0-25 points)
  // ====================

  let bedsScore = 0;

  if (desiredBeds && propertyBeds) {
    if (propertyBeds === desiredBeds) {
      bedsScore = 25;
      highlights.push(`Exact bed count: ${propertyBeds} beds`);
    } else if (Math.abs(propertyBeds - desiredBeds) === 1) {
      bedsScore = 15;
      highlights.push(`Close bed count: ${propertyBeds} beds`);
    } else if (propertyBeds > desiredBeds) {
      bedsScore = 10;
      highlights.push(`${propertyBeds} beds (more than desired)`);
    } else {
      bedsScore = 5;
      concerns.push(`Fewer bedrooms: ${propertyBeds} vs ${desiredBeds} desired`);
    }
  } else if (propertyBeds) {
    bedsScore = 12; // No preference specified
    highlights.push(`${propertyBeds} beds`);
  } else {
    bedsScore = 12; // No data
  }

  // ====================
  // BATHS MATCH (0-15 points)
  // ====================

  let bathsScore = 0;

  if (desiredBaths && propertyBaths) {
    if (propertyBaths >= desiredBaths) {
      bathsScore = 15;
      highlights.push(`${propertyBaths} baths`);
    } else {
      bathsScore = 5;
      concerns.push(`Fewer bathrooms: ${propertyBaths} vs ${desiredBaths} desired`);
    }
  } else if (propertyBaths) {
    bathsScore = 8; // No preference specified
    highlights.push(`${propertyBaths} baths`);
  } else {
    bathsScore = 8; // No data
  }

  // ====================
  // BUDGET MATCH (0-20 points)
  // ====================

  let budgetScore = 0;

  if (downPayment && propertyPrice) {
    const downPaymentRatio = (downPayment / propertyPrice) * 100;

    if (downPaymentRatio >= 20) {
      budgetScore = 20;
      highlights.push(`Strong down payment: ${downPaymentRatio.toFixed(0)}% of price`);
    } else if (downPaymentRatio >= 10) {
      budgetScore = 15;
      highlights.push(`Adequate down payment: ${downPaymentRatio.toFixed(0)}%`);
    } else if (downPaymentRatio >= 5) {
      budgetScore = 10;
      highlights.push(`Down payment: ${downPaymentRatio.toFixed(0)}%`);
    } else {
      budgetScore = 5;
      concerns.push(`Low down payment ratio: ${downPaymentRatio.toFixed(0)}%`);
    }
  } else if (downPayment) {
    budgetScore = 10; // Has budget but no property price
  } else {
    budgetScore = 10; // No budget data
  }

  // ====================
  // TOTAL SCORE (0-100)
  // ====================

  const totalScore = Math.min(100, locationScore + bedsScore + bathsScore + budgetScore);

  // ====================
  // REASONING
  // ====================

  let reasoning = '';

  if (totalScore >= 80) {
    reasoning = `Excellent match! ${highlights.slice(0, 2).join('. ')}.`;
  } else if (totalScore >= 60) {
    reasoning = `Good match. ${highlights[0] || 'Meets most criteria'}.`;
  } else if (totalScore >= 40) {
    reasoning = `Fair match with some considerations. ${concerns[0] || 'Worth reviewing'}.`;
  } else {
    reasoning = `Limited match. ${concerns.slice(0, 2).join('. ') || 'May not meet key criteria'}.`;
  }

  // Add score range context
  if (isPriority) {
    reasoning = `[PRIORITY] ${reasoning}`;
  }

  return {
    score: Math.round(totalScore),
    distance,
    locationScore,
    bedsScore,
    bathsScore,
    budgetScore,
    reasoning,
    highlights,
    concerns,
    isPriority,
  };
}

/**
 * Score breakdown helper for debugging
 */
export function getScoreBreakdown(score: MatchScore): string {
  return `
Total Score: ${score.score}/100 ${score.isPriority ? '(PRIORITY)' : ''}
  - Location/ZIP: ${score.locationScore}/40 ${score.distance ? `(${score.distance.toFixed(1)} mi)` : ''}
  - Beds: ${score.bedsScore}/25
  - Baths: ${score.bathsScore}/15
  - Budget: ${score.budgetScore}/20

Highlights: ${score.highlights.join(', ')}
${score.concerns.length > 0 ? `Concerns: ${score.concerns.join(', ')}` : ''}
`.trim();
}
