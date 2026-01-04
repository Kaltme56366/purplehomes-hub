import heic2any from 'heic2any';

// Cache for converted images to avoid re-converting
const convertedImageCache = new Map<string, string>();

/**
 * Check if a URL points to a HEIC image
 */
export function isHeicUrl(url: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.heic') || lowerUrl.includes('.heif');
}

/**
 * Convert a HEIC image URL to a displayable blob URL
 * Returns the original URL if not HEIC or if conversion fails
 */
export async function convertHeicToJpeg(imageUrl: string): Promise<string> {
  if (!imageUrl) return imageUrl;

  // Check cache first
  if (convertedImageCache.has(imageUrl)) {
    return convertedImageCache.get(imageUrl)!;
  }

  // If not HEIC, return original
  if (!isHeicUrl(imageUrl)) {
    return imageUrl;
  }

  try {
    console.log('[HEIC Converter] Converting:', imageUrl);

    // Fetch the HEIC image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const heicBlob = await response.blob();

    // Convert to JPEG
    const jpegBlob = await heic2any({
      blob: heicBlob,
      toType: 'image/jpeg',
      quality: 0.85,
    });

    // Handle both single blob and array of blobs
    const resultBlob = Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob;

    // Create blob URL
    const blobUrl = URL.createObjectURL(resultBlob);

    // Cache it
    convertedImageCache.set(imageUrl, blobUrl);

    console.log('[HEIC Converter] Converted successfully:', imageUrl);
    return blobUrl;
  } catch (error) {
    console.error('[HEIC Converter] Failed to convert:', imageUrl, error);
    // Return original URL on failure - browser will show error/placeholder
    return imageUrl;
  }
}

/**
 * Clean up blob URLs when component unmounts
 */
export function revokeConvertedUrl(blobUrl: string): void {
  if (blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Clear the conversion cache (useful for memory management)
 */
export function clearConversionCache(): void {
  convertedImageCache.forEach((blobUrl) => {
    URL.revokeObjectURL(blobUrl);
  });
  convertedImageCache.clear();
}
