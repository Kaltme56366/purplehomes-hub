/**
 * AI Insights API
 *
 * Generates natural language insights about property-buyer matches
 * using OpenAI to explain why a match is good and suggest next actions.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface InsightRequest {
  score: number;
  highlights: string[];
  concerns: string[];
  buyerName: string;
  propertyAddress: string;
  distanceMiles?: number;
  stage?: string;
  price?: number;
  beds?: number;
  baths?: number;
}

interface InsightResponse {
  summary: string;
  keyStrength: string;
  potentialConcern: string | null;
  suggestedAction: string;
  confidence: 'high' | 'medium' | 'low';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const input: InsightRequest = req.body;

  if (!input || !input.buyerName || !input.propertyAddress) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // If OpenAI is not configured, return rule-based insights
  if (!OPENAI_API_KEY) {
    console.log('[Insights API] OpenAI not configured, using rule-based fallback');
    return res.status(200).json(generateRuleBasedInsight(input));
  }

  try {
    const insight = await generateOpenAIInsight(input);
    return res.status(200).json(insight);
  } catch (error) {
    console.error('[Insights API] OpenAI error, falling back to rules:', error);
    // Fallback to rule-based if OpenAI fails
    return res.status(200).json(generateRuleBasedInsight(input));
  }
}

/**
 * Generate insights using OpenAI
 */
async function generateOpenAIInsight(input: InsightRequest): Promise<InsightResponse> {
  const prompt = buildPrompt(input);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a real estate matching assistant. Generate brief, actionable insights about property-buyer matches. Be concise and practical. Always respond in valid JSON format with these fields:
- summary: 2-3 sentences explaining why this is a good or poor match
- keyStrength: The single most important positive factor (1 sentence)
- potentialConcern: The main concern to address, or null if none (1 sentence or null)
- suggestedAction: A specific next step for the agent (1 sentence)
- confidence: "high", "medium", or "low" based on match quality`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  // Parse JSON from response
  try {
    // Handle potential markdown code blocks
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || [null, content];
    const jsonStr = jsonMatch[1] || content;
    const parsed = JSON.parse(jsonStr.trim());

    return {
      summary: parsed.summary || 'Match analysis complete.',
      keyStrength: parsed.keyStrength || 'Good property match.',
      potentialConcern: parsed.potentialConcern || null,
      suggestedAction: parsed.suggestedAction || 'Review match details.',
      confidence: validateConfidence(parsed.confidence),
    };
  } catch (parseError) {
    console.error('[Insights API] Failed to parse OpenAI response:', content);
    throw new Error('Failed to parse OpenAI response');
  }
}

function buildPrompt(input: InsightRequest): string {
  const parts = [
    `Property Match Analysis for ${input.buyerName}:`,
    '',
    `Property: ${input.propertyAddress}`,
    `Match Score: ${input.score}/100`,
  ];

  if (input.price) {
    parts.push(`Price: $${input.price.toLocaleString()}`);
  }
  if (input.beds) {
    parts.push(`Beds: ${input.beds}`);
  }
  if (input.baths) {
    parts.push(`Baths: ${input.baths}`);
  }
  if (input.distanceMiles !== undefined) {
    parts.push(`Distance: ${input.distanceMiles.toFixed(1)} miles from preferred location`);
  }
  if (input.stage) {
    parts.push(`Current Stage: ${input.stage}`);
  }

  if (input.highlights && input.highlights.length > 0) {
    parts.push('', 'Highlights:');
    input.highlights.forEach((h) => parts.push(`- ${h}`));
  }

  if (input.concerns && input.concerns.length > 0) {
    parts.push('', 'Concerns:');
    input.concerns.forEach((c) => parts.push(`- ${c}`));
  }

  parts.push('', 'Generate a brief insight about this match.');

  return parts.join('\n');
}

function validateConfidence(value: any): 'high' | 'medium' | 'low' {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'medium';
}

/**
 * Rule-based fallback when OpenAI is unavailable
 */
function generateRuleBasedInsight(input: InsightRequest): InsightResponse {
  const { score, highlights, concerns, buyerName, stage, distanceMiles } = input;

  // Determine confidence based on score
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (score >= 80) confidence = 'high';
  else if (score < 50) confidence = 'low';

  // Build summary
  let summary = '';
  if (score >= 80) {
    summary = `This is an excellent match for ${buyerName}. The property aligns well with their requirements and preferences.`;
  } else if (score >= 60) {
    summary = `This is a strong match for ${buyerName}. Most key criteria are met, making this worth pursuing.`;
  } else if (score >= 40) {
    summary = `This is a moderate match for ${buyerName}. Some criteria align, but there are areas of concern.`;
  } else {
    summary = `This match has significant gaps from ${buyerName}'s preferences. Consider discussing flexibility on requirements.`;
  }

  // Add distance context
  if (distanceMiles !== undefined) {
    if (distanceMiles <= 5) {
      summary += ' The property is conveniently located within their preferred area.';
    } else if (distanceMiles <= 20) {
      summary += ` The property is ${distanceMiles.toFixed(0)} miles from their preferred location.`;
    } else if (distanceMiles > 50) {
      summary += ` Note: The property is ${distanceMiles.toFixed(0)} miles away, outside their typical search area.`;
    }
  }

  // Key strength
  let keyStrength = 'Good overall property match.';
  if (highlights && highlights.length > 0) {
    keyStrength = highlights[0];
  } else if (score >= 70) {
    keyStrength = 'Strong alignment with buyer preferences.';
  }

  // Potential concern
  let potentialConcern: string | null = null;
  if (concerns && concerns.length > 0) {
    potentialConcern = concerns[0];
  } else if (distanceMiles && distanceMiles > 30) {
    potentialConcern = 'Property is outside the buyer\'s typical search radius.';
  } else if (score < 50) {
    potentialConcern = 'Low match score suggests significant preference gaps.';
  }

  // Suggested action based on stage and score
  let suggestedAction = 'Send this property to the buyer for their review.';
  if (stage === 'Sent to Buyer') {
    suggestedAction = 'Follow up to gauge interest and answer any questions.';
  } else if (stage === 'Buyer Responded') {
    suggestedAction = 'Schedule a showing to move this deal forward.';
  } else if (stage === 'Showing Scheduled' || stage === 'Property Viewed') {
    suggestedAction = 'Discuss the property and explore making an offer.';
  } else if (stage === 'Offer Made') {
    suggestedAction = 'Monitor offer status and prepare for negotiations.';
  } else if (score >= 85) {
    suggestedAction = 'This is a top match - prioritize sending immediately.';
  } else if (score < 40 && !stage) {
    suggestedAction = 'Consider this property only if buyer is flexible on requirements.';
  }

  return {
    summary,
    keyStrength,
    potentialConcern,
    suggestedAction,
    confidence,
  };
}
