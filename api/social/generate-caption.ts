/**
 * Structured Caption Generation API v2
 *
 * Generates real estate social media captions using a structured format.
 * - Structure is FIXED per post intent
 * - Tone affects only the body copy
 * - Intent-specific CTAs
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface Property {
  address?: string;
  city?: string;
  state?: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  description?: string;
  arv?: number;
  repairCost?: number;
  condition?: string;
}

interface CaptionRequest {
  property: Property | null;
  context: string;
  postIntent: string;
  tone: string;
  platform: string;
}

interface CaptionResponse {
  caption: string;
  platform: string;
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

  const { property, context, postIntent, tone, platform }: CaptionRequest = req.body;

  if (!postIntent || !tone || !platform) {
    return res.status(400).json({ error: 'Missing required fields: postIntent, tone, platform' });
  }

  if (!OPENAI_API_KEY) {
    console.error('[Caption API] OpenAI API key not configured');
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({ property, context, postIntent, tone, platform });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Caption API] OpenAI error:', errorText);
      return res.status(500).json({ error: 'Failed to generate caption' });
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content?.trim() || '';

    if (!caption) {
      return res.status(500).json({ error: 'Empty response from OpenAI' });
    }

    const result: CaptionResponse = { caption, platform };
    return res.status(200).json(result);
  } catch (error) {
    console.error('[Caption API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function buildSystemPrompt(): string {
  return `You are a real estate social media copywriter. You create structured, scannable captions.

YOUR RULES:
1. ALWAYS follow the exact structure template provided
2. Fill in placeholders with actual property data
3. Write body copy that matches the specified TONE (2-4 sentences only)
4. Choose ONE CTA from the provided options
5. Never change the structure or add extra sections
6. Never copy-paste context verbatim
7. Never include hashtags

OUTPUT: Only the caption text. No explanations.`;
}

function buildUserPrompt(params: CaptionRequest): string {
  const { property, context, postIntent, tone, platform } = params;

  const structureTemplate = getStructureTemplate(postIntent, property);
  const toneInstructions = getToneInstructions(tone);
  const ctaOptions = getCTAOptions(postIntent);

  const propertyContext = property
    ? `
PROPERTY DATA:
- Address: ${property.address || 'TBD'}
- City: ${property.city || 'TBD'}
- Price: $${property.price?.toLocaleString() || 'TBD'}
- Beds: ${property.beds || 'TBD'}
- Baths: ${property.baths || 'TBD'}
- SqFt: ${property.sqft?.toLocaleString() || 'TBD'}
- Type: ${property.propertyType || 'Single Family'}
${property.description ? `- Description: ${property.description}` : ''}
${property.arv ? `- ARV: $${property.arv.toLocaleString()}` : ''}
${property.repairCost ? `- Repair Estimate: $${property.repairCost.toLocaleString()}` : ''}`
    : '';

  const additionalContext = context
    ? `
ADDITIONAL CONTEXT (inform body copy, don't copy):
${context}`
    : '';

  return `Generate a ${platform} caption using this EXACT structure:

═══════════════════════════════════════════════════════════════
STRUCTURE TEMPLATE:
═══════════════════════════════════════════════════════════════
${structureTemplate}
═══════════════════════════════════════════════════════════════

${propertyContext}
${additionalContext}

═══════════════════════════════════════════════════════════════
BODY COPY TONE: ${tone.toUpperCase()}
${toneInstructions}
═══════════════════════════════════════════════════════════════

CTA OPTIONS (choose one):
${ctaOptions.map((cta) => `- "${cta}"`).join('\n')}

RULES:
1. Replace {placeholders} with property data
2. Body copy = 2-4 sentences in ${tone} tone
3. Pick ONE CTA
4. Keep exact structure and emojis
5. NO hashtags

Generate now:`;
}

function getStructureTemplate(intent: string, property: Property | null): string {
  const city = property?.city || '{city}';

  const templates: Record<string, string> = {
    'just-listed': `🏠 JUST LISTED in ${city}!

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    sold: `🎉 SOLD in ${city}!

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'under-contract': `📝 UNDER CONTRACT in ${city}!

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'price-reduced': `💰 PRICE REDUCED in ${city}!

📍 {address}
💰 NOW {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'open-house': `🚪 OPEN HOUSE in ${city}!

📅 {date} | ⏰ {time}
📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'coming-soon': `👀 COMING SOON in ${city}!

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    investment: `📈 INVESTMENT OPPORTUNITY in ${city}!

📍 {address}
💰 Asking: {price}
📊 ARV: {arv} | Potential Profit: {profit}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'market-update': `📊 MARKET UPDATE: ${city}

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    general: `{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,
  };

  return templates[intent] || templates['just-listed'];
}

function getToneInstructions(tone: string): string {
  const instructions: Record<string, string> = {
    professional: `Professional tone: Polished, authoritative, value-focused. Words: exceptional, premier, ideal, distinguished.`,
    casual: `Casual tone: Conversational, friendly, relatable. Words: honestly, love this, pretty amazing, check this out.`,
    urgent: `Urgent tone: Time-sensitive, action-oriented, punchy sentences. Words: just listed, won't last, moving fast, act now.`,
    friendly: `Friendly tone: Warm, welcoming, lifestyle-focused. Words: imagine, picture this, your next chapter, home sweet home.`,
    luxury: `Luxury tone: Sophisticated, understated elegance. Words: exquisite, curated, bespoke, refined, residence.`,
    investor: `Investor tone: Numbers-focused, analytical, ROI-driven. Words: cap rate, cash flow, ARV, upside, deal.`,
  };
  return instructions[tone] || instructions.professional;
}

function getCTAOptions(intent: string): string[] {
  const ctas: Record<string, string[]> = {
    'just-listed': [
      'Interested? DM us to schedule your private showing.',
      'Want to see it first? Send us a message.',
      "Comment 'INFO' for all the details.",
    ],
    sold: [
      "Thinking of selling? Let's chat about your goals.",
      "Want results like this? Let's talk.",
    ],
    'under-contract': [
      'Missed this one? More coming soon. DM to be first.',
      'Want first access to the next one? Follow for updates.',
    ],
    'price-reduced': [
      "Better price, same amazing home. Let's talk.",
      "Now's your chance. DM before someone else does.",
    ],
    'open-house': ['Stop by — no appointment needed!', "We'd love to see you there!"],
    'coming-soon': [
      'Want first access? DM to get on the list.',
      "Comment 'NOTIFY' to be the first to know.",
    ],
    investment: [
      'Serious inquiries only. DM for the full breakdown.',
      'Want the numbers? Send us a message.',
    ],
    'market-update': [
      "Questions about the market? Let's chat.",
      'Want personalized advice? DM us.',
    ],
    general: ["Questions? We're here to help.", 'DM us anytime.'],
  };
  return ctas[intent] || ctas['just-listed'];
}
