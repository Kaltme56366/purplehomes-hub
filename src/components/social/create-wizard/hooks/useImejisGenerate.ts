import { useState, useCallback } from 'react';
import { generateImejisImage } from '@/services/imejis/api';
import type { GenerateImageParams, GenerateImageResult } from '@/services/imejis/types';

export function useImejisGenerate() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = useCallback(async (params: GenerateImageParams): Promise<GenerateImageResult> => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateImejisImage(params);

      if (!result.success) {
        setError(result.error || 'Failed to generate image');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate image';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateImage,
    isGenerating,
    error,
  };
}
