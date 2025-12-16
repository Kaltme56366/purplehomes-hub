/**
 * AI Property Matching Service
 * Uses OpenAI to match buyers with properties based on criteria
 */

import type { BuyerCriteria, PropertyDetails, MatchScore } from '@/types/matching';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

/**
 * Generate match score using OpenAI
 */
export async function generateMatchScore(
  buyer: BuyerCriteria,
  property: PropertyDetails
): Promise<MatchScore> {
  if (!OPENAI_API_KEY) {
    // Fallback to rule-based matching if no OpenAI key
    return generateRuleBasedScore(buyer, property);
  }

  try {
    const prompt = buildMatchingPrompt(buyer, property);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a real estate matching expert. Analyze the compatibility between a buyer and a property based on budget, preferences, and location. Return ONLY valid JSON with this exact structure: {"score": <number 0-100>, "reasoning": "<string>", "highlights": ["<string>"], "concerns": ["<string>"]}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[AI Matching] OpenAI API error:', error);
      // Fallback to rule-based
      return generateRuleBasedScore(buyer, property);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const matchScore: MatchScore = JSON.parse(content);

    // Validate response
    if (typeof matchScore.score !== 'number' || matchScore.score < 0 || matchScore.score > 100) {
      throw new Error('Invalid score format');
    }

    return matchScore;
  } catch (error) {
    console.error('[AI Matching] Error generating score:', error);
    // Fallback to rule-based matching
    return generateRuleBasedScore(buyer, property);
  }
}

/**
 * Build OpenAI prompt for matching
 */
function buildMatchingPrompt(buyer: BuyerCriteria, property: PropertyDetails): string {
  const buyerName = `${buyer.firstName} ${buyer.lastName}`.trim();

  return `
Analyze the compatibility between this buyer and property:

BUYER PROFILE:
- Name: ${buyerName}
- Monthly Income: ${buyer.monthlyIncome ? `$${buyer.monthlyIncome.toLocaleString()}` : 'Not specified'}
- Monthly Liabilities: ${buyer.monthlyLiabilities ? `$${buyer.monthlyLiabilities.toLocaleString()}` : 'Not specified'}
- Down Payment Available: ${buyer.downPayment ? `$${buyer.downPayment.toLocaleString()}` : 'Not specified'}
- Desired Bedrooms: ${buyer.desiredBeds || 'Any'}
- Desired Bathrooms: ${buyer.desiredBaths || 'Any'}
- Preferred Location: ${buyer.city || buyer.location || 'Any'}
- Buyer Type: ${buyer.buyerType || 'Not specified'}

PROPERTY:
- Address: ${property.address}
- City: ${property.city}
- Price: ${property.price ? `$${property.price.toLocaleString()}` : 'Not listed'}
- Bedrooms: ${property.beds}
- Bathrooms: ${property.baths}
- Square Feet: ${property.sqft ? property.sqft.toLocaleString() : 'Not specified'}
- Status: ${property.stage || 'Available'}

Calculate a match score (0-100) based on:
1. Affordability - Can the buyer afford this property based on income/down payment?
2. Bedroom/Bathroom Requirements - Does it meet their needs?
3. Location Preferences - Is it in their desired area?
4. Overall Investment Fit - Is this a good match for their buyer type?

Return JSON with:
- score: Number from 0-100 (0=poor match, 100=perfect match)
- reasoning: 2-3 sentences explaining the score
- highlights: Array of positive match points (e.g., ["Budget match", "Exact bedroom count"])
- concerns: Array of potential issues (e.g., ["Higher price range"]) or empty array if none
`.trim();
}

/**
 * Rule-based matching fallback (when OpenAI is unavailable)
 */
function generateRuleBasedScore(
  buyer: BuyerCriteria,
  property: PropertyDetails
): MatchScore {
  let score = 0;
  const highlights: string[] = [];
  const concerns: string[] = [];

  // Bedroom match (30 points)
  if (buyer.desiredBeds) {
    if (property.beds === buyer.desiredBeds) {
      score += 30;
      highlights.push(`Exact match: ${property.beds} bedrooms`);
    } else if (Math.abs(property.beds - buyer.desiredBeds) === 1) {
      score += 20;
      highlights.push(`Close match: ${property.beds} bedrooms`);
    } else if (property.beds > buyer.desiredBeds) {
      score += 10;
      concerns.push(`More bedrooms than requested (${property.beds} vs ${buyer.desiredBeds})`);
    } else {
      concerns.push(`Fewer bedrooms (${property.beds} vs ${buyer.desiredBeds} desired)`);
    }
  } else {
    score += 15; // Default partial score if no preference
  }

  // Bathroom match (20 points)
  if (buyer.desiredBaths) {
    if (property.baths === buyer.desiredBaths) {
      score += 20;
      highlights.push(`${property.baths} bathrooms as requested`);
    } else if (property.baths >= buyer.desiredBaths) {
      score += 15;
    } else {
      score += 5;
      concerns.push(`Fewer bathrooms than desired`);
    }
  } else {
    score += 10;
  }

  // Location match (25 points)
  if (buyer.city || buyer.location) {
    const buyerLocation = (buyer.city || buyer.location || '').toLowerCase();
    const propertyCity = property.city.toLowerCase();

    if (propertyCity.includes(buyerLocation) || buyerLocation.includes(propertyCity)) {
      score += 25;
      highlights.push(`Located in preferred area: ${property.city}`);
    } else {
      score += 5;
      concerns.push(`Different location (${property.city})`);
    }
  } else {
    score += 12;
  }

  // Affordability (25 points)
  if (buyer.downPayment && property.price) {
    const downPaymentRatio = (buyer.downPayment / property.price) * 100;

    if (downPaymentRatio >= 20) {
      score += 25;
      highlights.push('Strong down payment coverage');
    } else if (downPaymentRatio >= 10) {
      score += 20;
      highlights.push('Adequate down payment');
    } else if (downPaymentRatio >= 5) {
      score += 10;
      concerns.push('Low down payment ratio');
    } else {
      concerns.push('Down payment may be insufficient');
    }

    // Monthly payment check
    if (buyer.monthlyIncome && buyer.monthlyLiabilities) {
      const netIncome = buyer.monthlyIncome - buyer.monthlyLiabilities;
      // Rough estimate: assume 1% of home price per month for mortgage
      const estimatedMonthly = property.price * 0.01;

      if (estimatedMonthly <= netIncome * 0.3) {
        // Within 30% debt-to-income ratio
        highlights.push('Monthly payment appears affordable');
      } else if (estimatedMonthly <= netIncome * 0.43) {
        concerns.push('Higher monthly payment (but within limits)');
      } else {
        concerns.push('Monthly payment may be challenging');
        score -= 10;
      }
    }
  } else {
    score += 12; // Default partial score
  }

  // Cap score at 100
  score = Math.min(100, Math.max(0, score));

  let reasoning = '';
  if (score >= 80) {
    reasoning = `Excellent match! This property aligns well with the buyer's preferences and budget. ${highlights.slice(0, 2).join('. ')}.`;
  } else if (score >= 60) {
    reasoning = `Good match. The property meets most of the buyer's requirements with some minor considerations. ${highlights[0] || 'Reasonable fit for investment criteria'}.`;
  } else if (score >= 40) {
    reasoning = `Fair match. While there are some alignments, several factors should be considered. ${concerns[0] || 'May require further evaluation'}.`;
  } else {
    reasoning = `Limited match. This property has significant differences from the buyer's stated preferences. ${concerns.slice(0, 2).join('. ')}.`;
  }

  return {
    score: Math.round(score),
    reasoning,
    highlights,
    concerns: concerns.length > 0 ? concerns : undefined,
  };
}

/**
 * Batch generate scores for multiple buyer-property pairs
 */
export async function batchGenerateScores(
  buyers: BuyerCriteria[],
  properties: PropertyDetails[],
  minScore: number = 60,
  onProgress?: (progress: { current: number; total: number; buyer: string }) => void
): Promise<Array<{ buyer: BuyerCriteria; property: PropertyDetails; score: MatchScore }>> {
  const matches: Array<{ buyer: BuyerCriteria; property: PropertyDetails; score: MatchScore }> = [];
  const total = buyers.length * properties.length;
  let current = 0;

  for (const buyer of buyers) {
    for (const property of properties) {
      current++;

      if (onProgress) {
        onProgress({
          current,
          total,
          buyer: `${buyer.firstName} ${buyer.lastName}`,
        });
      }

      const score = await generateMatchScore(buyer, property);

      // Only keep matches above threshold
      if (score.score >= minScore) {
        matches.push({ buyer, property, score });
      }

      // Small delay to avoid rate limiting (if using OpenAI)
      if (OPENAI_API_KEY) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  return matches;
}
