import { useState, useEffect } from 'react';
import { convertHeicToJpeg, isHeicUrl } from '@/lib/heicConverter';

interface UseHeicImageResult {
  src: string;
  isConverting: boolean;
  isHeic: boolean;
  error: boolean;
}

/**
 * Hook to handle HEIC image conversion
 * Automatically converts HEIC images to JPEG for browser display
 */
export function useHeicImage(originalUrl: string): UseHeicImageResult {
  const [src, setSrc] = useState(originalUrl);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(false);

  const isHeic = isHeicUrl(originalUrl);

  useEffect(() => {
    if (!originalUrl) {
      setSrc('/placeholder.svg');
      return;
    }

    if (!isHeic) {
      setSrc(originalUrl);
      return;
    }

    // Convert HEIC image
    setIsConverting(true);
    setError(false);

    convertHeicToJpeg(originalUrl)
      .then((convertedUrl) => {
        setSrc(convertedUrl);
        setIsConverting(false);
      })
      .catch(() => {
        setError(true);
        setIsConverting(false);
        setSrc('/placeholder.svg');
      });
  }, [originalUrl, isHeic]);

  return { src, isConverting, isHeic, error };
}

/**
 * Hook to handle multiple HEIC images
 */
export function useHeicImages(originalUrls: string[]): {
  images: string[];
  isConverting: boolean;
  convertedCount: number;
} {
  const [images, setImages] = useState<string[]>(originalUrls);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedCount, setConvertedCount] = useState(0);

  useEffect(() => {
    if (!originalUrls.length) {
      setImages([]);
      return;
    }

    const heicUrls = originalUrls.filter(isHeicUrl);

    if (heicUrls.length === 0) {
      setImages(originalUrls);
      return;
    }

    setIsConverting(true);
    setConvertedCount(0);

    // Convert all HEIC images in parallel
    Promise.all(
      originalUrls.map(async (url) => {
        if (isHeicUrl(url)) {
          const converted = await convertHeicToJpeg(url);
          setConvertedCount((prev) => prev + 1);
          return converted;
        }
        return url;
      })
    )
      .then((convertedUrls) => {
        setImages(convertedUrls);
        setIsConverting(false);
      })
      .catch(() => {
        // On error, use original URLs (browser will show placeholders for HEIC)
        setImages(originalUrls);
        setIsConverting(false);
      });
  }, [originalUrls.join(',')]); // Stringify for dependency comparison

  return { images, isConverting, convertedCount };
}
