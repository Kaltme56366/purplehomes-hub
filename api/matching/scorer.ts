/**
 * Property Match Scoring Module
 * Implements field-based and ZIP code matching (no geocoding)
 */

import { matchPropertyZip } from './zipMatcher';

export interface MatchScore {
  score: number;
  locationScore: number;
  bedsScore: number;
  bathsScore: number;
  budgetScore: number;
  reasoning: string;
  highlights: string[];
  concerns: string[];
  isPriority: boolean; // In preferred ZIP code
}

/**
 * Generates a comprehensive match score between a buyer and property
 * Uses field-based matching with ZIP code priority (no geocoding)
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

  // Extract property data
  const propertyFields = property.fields;
  const propertyAddress = propertyFields['Address'] || '';
  const propertyPrice = propertyFields['Property Total Price'] || propertyFields['Price'];
  const propertyBeds = propertyFields['Beds'];
  const propertyBaths = propertyFields['Baths'];
  const propertyZipCode = propertyFields['Zip Code'] || propertyFields['ZIP Code'];

  // ====================
  // ZIP CODE PRIORITY SCORE (0-40 points)
  // ====================

  let locationScore = 0;
  let isPriority = false;

  const hasZipCodes = Array.isArray(preferredZipCodes) && preferredZipCodes.length > 0;

  // Check ZIP match - Use dedicated Zip Code field first, fallback to extracting from Address
  const inPreferredZip = hasZipCodes && matchPropertyZip(propertyZipCode, propertyAddress, preferredZipCodes);

  if (inPreferredZip) {
    // PRIORITY MATCH - in preferred ZIP code
    locationScore = 40;
    isPriority = true;
    highlights.push('In preferred ZIP code');
  } else if (hasZipCodes) {
    // Has ZIP preference but doesn't match
    locationScore = 10;
    concerns.push('Not in preferred ZIP codes');
  } else {
    // No ZIP preference specified
    locationScore = 20; // Neutral score
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
  if (isPriority) {
    scoreBreakdown.push(`Location: ${locationScore}/40 pts (in preferred ZIP)`);
  } else if (hasZipCodes) {
    scoreBreakdown.push(`Location: ${locationScore}/40 pts (outside preferred ZIPs)`);
  } else {
    scoreBreakdown.push(`Location: ${locationScore}/40 pts (no ZIP preference set)`);
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
