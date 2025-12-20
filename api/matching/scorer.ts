/**
 * Property Match Scoring Module
 * Implements hybrid location matching: ZIP codes + distance-based scoring
 */

import { matchPropertyZip } from './zipMatcher';
import { calculateDistance } from './distanceCalculator';

export interface MatchScore {
  score: number;
  locationScore: number;
  bedsScore: number;
  bathsScore: number;
  budgetScore: number;
  reasoning: string;
  highlights: string[];
  concerns: string[];
  isPriority: boolean; // In preferred ZIP code OR within 50 miles
  distanceMiles: number | null;
  locationReason: string;
}

/**
 * Generates a comprehensive match score between a buyer and property
 * Uses hybrid location matching: ZIP codes + distance-based scoring
 *
 * Location Scoring (0-40 points):
 * - ZIP match:      40 pts (isPriority = true)
 * - Within 5 mi:    38 pts (isPriority = true)
 * - Within 10 mi:   35 pts (isPriority = true)
 * - Within 25 mi:   28 pts (isPriority = true)
 * - Within 50 mi:   20 pts (isPriority = true)
 * - Beyond 50 mi:   5-15 pts (isPriority = false)
 * - No location:    20 pts (neutral)
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

  // Handle both string and array formats from Airtable
  let preferredZipCodes = buyerFields['Preferred Zip Codes'] || [];
  if (typeof preferredZipCodes === 'string') {
    // Split by comma and trim, or wrap single value in array
    preferredZipCodes = preferredZipCodes.includes(',')
      ? preferredZipCodes.split(',').map(z => z.trim())
      : [preferredZipCodes.trim()];
  }

  const desiredBeds = buyerFields['No. of Bedrooms'];
  const desiredBaths = buyerFields['No. of Bath'];
  const downPayment = buyerFields['Downpayment'];
  const buyerCity = buyerFields['City'] || buyerFields['Preferred Location'] || '';

  // Buyer coordinates (from Airtable, pre-geocoded)
  const buyerLat = buyerFields['Location Lat'];
  const buyerLng = buyerFields['Location Lng'];

  // Extract property data
  const propertyFields = property.fields;
  const propertyAddress = propertyFields['Address'] || '';
  const propertyCity = propertyFields['City'] || '';
  const propertyPrice = propertyFields['Property Total Price'] || propertyFields['Price'];
  const propertyBeds = propertyFields['Beds'];
  const propertyBaths = propertyFields['Baths'];
  const propertyZipCode = propertyFields['Zip Code'] || propertyFields['ZIP Code'];

  // Property coordinates (from Airtable, pre-geocoded)
  const propertyLat = propertyFields['Property Lat'];
  const propertyLng = propertyFields['Property Lng'];

  // ====================
  // HYBRID LOCATION SCORE (0-40 points)
  // Priority: ZIP match > Distance-based > No location data
  // ====================

  let locationScore = 0;
  let isPriority = false;
  let distanceMiles: number | null = null;
  let locationReason = '';

  const hasZipCodes = Array.isArray(preferredZipCodes) && preferredZipCodes.length > 0;
  const hasCoordinates = isValidCoordinate(buyerLat) && isValidCoordinate(buyerLng) &&
                         isValidCoordinate(propertyLat) && isValidCoordinate(propertyLng);

  // Check ZIP match - Use dedicated Zip Code field first, fallback to extracting from Address
  const inPreferredZip = hasZipCodes && matchPropertyZip(propertyZipCode, propertyAddress, preferredZipCodes);

  // Calculate distance if coordinates are available
  if (hasCoordinates) {
    distanceMiles = calculateDistance(buyerLat, buyerLng, propertyLat, propertyLng);
  }

  if (inPreferredZip) {
    // HIGHEST PRIORITY - Exact ZIP code match
    locationScore = 40;
    isPriority = true;
    locationReason = `In preferred ZIP ${propertyZipCode}`;
    highlights.push('In preferred ZIP code');
  } else if (distanceMiles !== null) {
    // Distance-based scoring
    const { score, reason, priority } = calculateDistanceScore(distanceMiles, buyerCity);
    locationScore = score;
    isPriority = priority;
    locationReason = reason;

    if (priority) {
      highlights.push(reason);
    } else {
      concerns.push(reason);
    }
  } else if (hasZipCodes) {
    // Has ZIP preference but no match and no coordinates
    locationScore = 10;
    isPriority = false;
    locationReason = 'Not in preferred ZIP codes';
    concerns.push('Not in preferred ZIP codes');
  } else {
    // No location preference specified
    locationScore = 20; // Neutral score
    locationReason = 'No location preference specified';
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
  // REASONING - Explain the score
  // ====================

  // Determine match quality label
  let matchQuality = '';
  if (totalScore >= 80) {
    matchQuality = 'Excellent Match';
  } else if (totalScore >= 60) {
    matchQuality = 'Good Match';
  } else if (totalScore >= 40) {
    matchQuality = 'Fair Match';
  } else {
    matchQuality = 'Limited Match';
  }

  // Build score explanation
  const scoreBreakdown: string[] = [];

  // Location explanation
  if (distanceMiles !== null) {
    scoreBreakdown.push(`Location: ${locationScore}/40 pts (${locationReason})`);
  } else if (isPriority) {
    scoreBreakdown.push(`Location: ${locationScore}/40 pts (in preferred ZIP)`);
  } else if (hasZipCodes) {
    scoreBreakdown.push(`Location: ${locationScore}/40 pts (outside preferred ZIPs)`);
  } else {
    scoreBreakdown.push(`Location: ${locationScore}/40 pts (no location preference set)`);
  }

  // Beds explanation
  if (desiredBeds && propertyBeds) {
    if (propertyBeds === desiredBeds) {
      scoreBreakdown.push(`Beds: ${bedsScore}/25 pts (exact match: ${propertyBeds} beds)`);
    } else {
      const diff = propertyBeds - desiredBeds;
      scoreBreakdown.push(`Beds: ${bedsScore}/25 pts (${propertyBeds} beds, ${diff > 0 ? '+' : ''}${diff} vs desired)`);
    }
  } else {
    scoreBreakdown.push(`Beds: ${bedsScore}/25 pts`);
  }

  // Baths explanation
  if (desiredBaths && propertyBaths) {
    if (propertyBaths >= desiredBaths) {
      scoreBreakdown.push(`Baths: ${bathsScore}/15 pts (meets requirement: ${propertyBaths} baths)`);
    } else {
      scoreBreakdown.push(`Baths: ${bathsScore}/15 pts (${propertyBaths} baths, needs ${desiredBaths})`);
    }
  } else {
    scoreBreakdown.push(`Baths: ${bathsScore}/15 pts`);
  }

  // Budget explanation
  if (downPayment && propertyPrice) {
    const ratio = ((downPayment / propertyPrice) * 100).toFixed(0);
    scoreBreakdown.push(`Budget: ${budgetScore}/20 pts (${ratio}% down payment ratio)`);
  } else {
    scoreBreakdown.push(`Budget: ${budgetScore}/20 pts`);
  }

  // Compose full reasoning
  let reasoning = `${matchQuality} (Score: ${Math.round(totalScore)}/100)\n\n`;
  reasoning += `Score Breakdown:\n${scoreBreakdown.map(s => `• ${s}`).join('\n')}`;

  // Add priority flag
  if (isPriority) {
    reasoning = `[PRIORITY] ${reasoning}`;
  }

  return {
    score: Math.round(totalScore),
    locationScore,
    bedsScore,
    bathsScore,
    budgetScore,
    reasoning,
    highlights,
    concerns,
    isPriority,
    distanceMiles,
    locationReason,
  };
}

/**
 * Score breakdown helper for debugging
 */
export function getScoreBreakdown(score: MatchScore): string {
  return `
Total Score: ${score.score}/100 ${score.isPriority ? '(PRIORITY)' : ''}
  - ZIP Code: ${score.locationScore}/40
  - Beds: ${score.bedsScore}/25
  - Baths: ${score.bathsScore}/15
  - Budget: ${score.budgetScore}/20

Highlights: ${score.highlights.join(', ')}
${score.concerns.length > 0 ? `Concerns: ${score.concerns.join(', ')}` : ''}
`.trim();
}

/**
 * Check if a coordinate value is valid
 */
function isValidCoordinate(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Calculate location score based on distance
 * Returns score, reason string, and priority flag
 */
function calculateDistanceScore(distanceMiles: number, buyerCity: string): {
  score: number;
  reason: string;
  priority: boolean;
} {
  const locationLabel = buyerCity || 'preferred area';

  if (distanceMiles <= 5) {
    return {
      score: 38,
      reason: `${distanceMiles.toFixed(1)} mi from ${locationLabel}`,
      priority: true,
    };
  }

  if (distanceMiles <= 10) {
    return {
      score: 35,
      reason: `${distanceMiles.toFixed(1)} mi from ${locationLabel}`,
      priority: true,
    };
  }

  if (distanceMiles <= 25) {
    return {
      score: 28,
      reason: `${distanceMiles.toFixed(1)} mi from ${locationLabel}`,
      priority: true,
    };
  }

  if (distanceMiles <= 50) {
    return {
      score: 20,
      reason: `${distanceMiles.toFixed(1)} mi from ${locationLabel}`,
      priority: true,
    };
  }

  // Beyond 50 miles - lower score, not priority
  // Score decreases as distance increases: 15 at 50mi, down to 5 at 200+ mi
  const score = Math.max(5, 15 - Math.floor(distanceMiles / 20));

  return {
    score,
    reason: `${distanceMiles.toFixed(0)} mi away`,
    priority: false,
  };
}
