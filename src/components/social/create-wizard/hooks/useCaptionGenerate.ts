import { useState, useCallback } from 'react';
import type { Property } from '@/types';
import type { CaptionTone, Platform, PostIntent } from '../types';

interface GenerateCaptionParams {
  property: Property | null;
  context: string;
  tone: CaptionTone;
  platform: Platform | 'all';
  postIntent?: PostIntent;
  templateType?: string;
}

interface GenerateCaptionResult {
  success: boolean;
  caption: string;
  error?: string;
}

export function useCaptionGenerate() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCaption = useCallback(async (params: GenerateCaptionParams): Promise<GenerateCaptionResult> => {
    setIsGenerating(true);

    try {
      // Use the new structured caption API v2
      const response = await fetch('/api/social/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: params.property,
          context: params.context,
          tone: params.tone,
          platform: params.platform,
          postIntent: params.postIntent || 'just-listed',
        }),
      });

      if (!response.ok) {
        // If new API fails, try fallback to old API
        console.warn('[Caption] New API failed, trying GHL API...');
        const fallbackResponse = await fetch('/api/ghl?resource=ai-caption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property: params.property,
            context: params.context,
            tone: params.tone,
            platform: params.platform,
            postIntent: params.postIntent,
          }),
        });

        if (!fallbackResponse.ok) {
          const fallbackCaption = generateFallbackCaption(params);
          return { success: true, caption: fallbackCaption };
        }

        const fallbackData = await fallbackResponse.json();
        return { success: true, caption: fallbackData.caption || generateFallbackCaption(params) };
      }

      const data = await response.json();
      return { success: true, caption: data.caption || generateFallbackCaption(params) };
    } catch (error) {
      console.error('Caption generation error:', error);
      // Return fallback caption instead of failing
      const fallbackCaption = generateFallbackCaption(params);
      return { success: true, caption: fallbackCaption };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateCaption,
    isGenerating,
  };
}

// Generate a structured fallback caption when AI is unavailable
// Uses the same template format as the structured caption API v2
function generateFallbackCaption(params: GenerateCaptionParams): string {
  const { property, tone, postIntent } = params;
  const intent = postIntent || 'just-listed';

  if (!property) {
    return `Check out this amazing opportunity!

Interested? DM us to schedule your private showing.

Purple Homes | Your Trusted Real Estate Partner`;
  }

  const { address, city, beds, baths, sqft, price } = property;

  // Intent-specific headers
  const intentHeaders: Record<PostIntent, string> = {
    'just-listed': `🏠 JUST LISTED in ${city || 'your area'}!`,
    sold: `🎉 SOLD in ${city || 'your area'}!`,
    'under-contract': `📝 UNDER CONTRACT in ${city || 'your area'}!`,
    'price-reduced': `💰 PRICE REDUCED in ${city || 'your area'}!`,
    'open-house': `🚪 OPEN HOUSE in ${city || 'your area'}!`,
    'coming-soon': `👀 COMING SOON in ${city || 'your area'}!`,
    investment: `📈 INVESTMENT OPPORTUNITY in ${city || 'your area'}!`,
    'market-update': `📊 MARKET UPDATE: ${city || 'Your Area'}`,
    general: '🏠 New Opportunity!',
  };

  // Tone-specific body copy
  const toneBodies: Record<CaptionTone, string> = {
    professional:
      'This property offers exceptional value in a sought-after location. An opportunity worth exploring for discerning buyers.',
    casual:
      "Okay, this one's pretty special! Great location, solid bones, and tons of potential. Definitely worth checking out.",
    urgent:
      "Just hit the market and already generating interest. At this price point? It won't last long. Time to move.",
    friendly:
      'Picture yourself here — morning coffee on the patio, neighbors who wave hello, and a place that truly feels like home.',
    luxury:
      'A residence of distinction for those who appreciate refined living. Every detail speaks to quality and craftsmanship.',
    investor:
      'The numbers on this one are solid. Strong fundamentals, good location, and real upside potential. Worth running the analysis.',
  };

  // Intent-specific CTAs
  const intentCTAs: Record<PostIntent, string> = {
    'just-listed': 'Interested? DM us to schedule your private showing.',
    sold: "Thinking of selling? Let's chat about your goals.",
    'under-contract': 'Missed this one? More coming soon. DM to be first.',
    'price-reduced': "Better price, same amazing home. Let's talk.",
    'open-house': 'Stop by — no appointment needed!',
    'coming-soon': 'Want first access? DM to get on the list.',
    investment: 'Serious inquiries only. DM for the full breakdown.',
    'market-update': "Questions about the market? Let's chat.",
    general: 'DM us anytime.',
  };

  const header = intentHeaders[intent] || intentHeaders['just-listed'];
  const bodyCopy = toneBodies[tone] || toneBodies.professional;
  const cta = intentCTAs[intent] || intentCTAs['just-listed'];

  // Build structured caption
  let caption = `${header}\n\n`;

  // Property details
  if (address) caption += `📍 ${address}\n`;
  if (price) caption += `💰 $${price.toLocaleString()}\n`;
  if (beds || baths || sqft) {
    const specs: string[] = [];
    if (beds) specs.push(`${beds} Beds`);
    if (baths) specs.push(`${baths} Baths`);
    if (sqft) specs.push(`${sqft.toLocaleString()} SF`);
    caption += `🏡 ${specs.join(' • ')}\n`;
  }

  // Body copy
  caption += `\n${bodyCopy}\n\n`;

  // CTA
  caption += `${cta}\n\n`;

  // Tagline
  caption += 'Purple Homes | Your Trusted Real Estate Partner';

  return caption;
}
