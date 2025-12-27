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
      // Call existing GHL caption generation API
      const response = await fetch('/api/ghl?resource=ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: params.property,
          context: params.context,
          tone: params.tone,
          platform: params.platform,
          postIntent: params.postIntent,
          templateType: params.templateType,
        }),
      });

      if (!response.ok) {
        // If API fails, generate a fallback caption
        const fallbackCaption = generateFallbackCaption(params);
        return { success: true, caption: fallbackCaption };
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

// Generate a reasonable fallback caption when AI is unavailable
function generateFallbackCaption(params: GenerateCaptionParams): string {
  const { property, tone, context } = params;

  if (!property) {
    return context || 'Check out this amazing opportunity!';
  }

  const { address, city, beds, baths, sqft, price } = property;

  const toneIntros: Record<CaptionTone, string> = {
    professional: 'New Listing Alert!',
    casual: 'Hey everyone!',
    urgent: 'Act Fast!',
    friendly: 'Exciting news!',
    luxury: 'Presenting an Exceptional Property',
    investor: 'Investment Opportunity Alert!',
  };

  const intro = toneIntros[tone] || 'New Listing!';

  let caption = `${intro}\n\n`;
  caption += `${address}`;
  if (city) caption += `, ${city}`;
  caption += '\n\n';

  const features: string[] = [];
  if (beds) features.push(`${beds} bed${beds > 1 ? 's' : ''}`);
  if (baths) features.push(`${baths} bath${baths > 1 ? 's' : ''}`);
  if (sqft) features.push(`${sqft.toLocaleString()} sq ft`);

  if (features.length > 0) {
    caption += features.join(' | ') + '\n\n';
  }

  if (price) {
    caption += `Asking: $${price.toLocaleString()}\n\n`;
  }

  if (context) {
    caption += `${context}\n\n`;
  }

  caption += 'DM for more details!';

  return caption;
}
