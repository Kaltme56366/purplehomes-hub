import { buildCaptionSystemPrompt, buildCaptionUserPrompt, type CaptionGenerationParams } from './prompts';
import type { Platform } from '@/components/social/create-wizard/types';

export interface GeneratedCaption {
  success: boolean;
  caption: string;
  platform: string;
  error?: string;
}

/**
 * Generate a caption using the API
 */
export async function generateCaption(params: CaptionGenerationParams): Promise<GeneratedCaption> {
  try {
    // Use the local API endpoint which handles OpenAI calls
    const response = await fetch('/api/ghl?resource=ai-caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property: params.property,
        context: params.context,
        tone: params.tone,
        platform: params.platform,
        templateType: params.templateType,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const caption = data.caption?.trim() || '';

    return {
      success: true,
      caption,
      platform: params.platform,
    };
  } catch (error) {
    console.error('Caption generation error:', error);
    return {
      success: false,
      caption: '',
      platform: params.platform,
      error: error instanceof Error ? error.message : 'Failed to generate caption',
    };
  }
}

/**
 * Generate captions for all platforms at once
 */
export async function generateAllCaptions(
  baseParams: Omit<CaptionGenerationParams, 'platform'>
): Promise<Record<Platform, GeneratedCaption>> {
  const platforms: Platform[] = ['facebook', 'instagram', 'linkedin'];

  const results = await Promise.all(
    platforms.map((platform) => generateCaption({ ...baseParams, platform }))
  );

  return {
    facebook: results[0],
    instagram: results[1],
    linkedin: results[2],
  };
}

// Re-export prompt builders for API usage
export { buildCaptionSystemPrompt, buildCaptionUserPrompt };
