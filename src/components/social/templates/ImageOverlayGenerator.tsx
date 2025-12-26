/**
 * Image Overlay Generator - Purple Homes Branded
 * Creates professional social media images with text overlays
 *
 * Design Philosophy (2025 Trends):
 * - Consistent Purple Homes brand identity (deep purple + gold accents)
 * - Clean, minimal layouts with property photos as hero
 * - Bold typography with clear hierarchy
 * - Platform-optimized (1080x1080 for Instagram, 1200x630 for Facebook/LinkedIn)
 *
 * Brand Colors:
 * - Primary: Deep Purple (#7C3AED) - Luxury, creativity, distinction
 * - Secondary: Soft Violet (#A78BFA) - Balance, approachability
 * - Accent: Gold (#D4AF37) - Premium, success
 * - Neutral: Charcoal (#1F2937) - Modern, professional
 * - Light: Off-White (#F9FAFB) - Clean, spacious
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Purple Homes Brand Colors
const BRAND = {
  primary: '#7C3AED',      // Deep Purple
  primaryDark: '#5B21B6',  // Darker Purple
  secondary: '#A78BFA',    // Soft Violet
  accent: '#D4AF37',       // Gold
  neutral: '#1F2937',      // Charcoal
  neutralLight: '#374151', // Light Charcoal
  light: '#F9FAFB',        // Off-White
  white: '#FFFFFF',
  black: '#000000',
};

export type OverlayTemplate = {
  id: string;
  name: string;
  category: 'just-listed' | 'open-house' | 'price-drop' | 'sold' | 'coming-soon' | 'investment';
  thumbnail: string;
  description: string;
  layout: {
    bannerPosition: 'top' | 'bottom' | 'diagonal' | 'corner' | 'side';
    bannerText: string;
    bannerColor: string;
    bannerTextColor: string;
    showPrice: boolean;
    pricePosition: 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'banner';
    priceBackground: string;
    priceTextColor: string;
    showAddress: boolean;
    addressPosition: 'bottom' | 'top';
    addressBackground: string;
    addressTextColor: string;
    showDetails: boolean;
    detailsPosition: 'bottom' | 'overlay' | 'side';
    showLogo: boolean;
    logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    overlayOpacity: number;
    overlayGradient?: string;
    fontFamily: string;
    bannerFontSize: number;
    priceFontSize: number;
    addressFontSize: number;
  };
};

interface PropertyData {
  price?: number;
  address?: string;
  city?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyCode?: string;
  heroImage?: string;
}

interface ImageOverlayGeneratorProps {
  template: OverlayTemplate;
  property: PropertyData;
  customImage?: string;
  width?: number;
  height?: number;
  onImageGenerated?: (dataUrl: string) => void;
}

// Purple Homes branded overlay templates
export const overlayTemplates: OverlayTemplate[] = [
  // ========== JUST LISTED ==========
  {
    id: 'ph-just-listed-classic',
    name: 'Just Listed - Classic',
    category: 'just-listed',
    thumbnail: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)`,
    description: 'Clean top banner with price badge',
    layout: {
      bannerPosition: 'top',
      bannerText: 'JUST LISTED',
      bannerColor: BRAND.primary,
      bannerTextColor: BRAND.white,
      showPrice: true,
      pricePosition: 'bottom-right',
      priceBackground: BRAND.accent,
      priceTextColor: BRAND.neutral,
      showAddress: true,
      addressPosition: 'bottom',
      addressBackground: `rgba(31, 41, 55, 0.9)`,
      addressTextColor: BRAND.white,
      showDetails: true,
      detailsPosition: 'bottom',
      showLogo: true,
      logoPosition: 'top-left',
      overlayOpacity: 0.2,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      bannerFontSize: 48,
      priceFontSize: 36,
      addressFontSize: 24,
    },
  },
  {
    id: 'ph-just-listed-modern',
    name: 'Just Listed - Modern',
    category: 'just-listed',
    thumbnail: `linear-gradient(180deg, transparent 0%, ${BRAND.neutral} 100%)`,
    description: 'Gradient overlay with centered text',
    layout: {
      bannerPosition: 'bottom',
      bannerText: 'JUST LISTED',
      bannerColor: 'transparent',
      bannerTextColor: BRAND.secondary,
      showPrice: true,
      pricePosition: 'center',
      priceBackground: BRAND.primary,
      priceTextColor: BRAND.white,
      showAddress: true,
      addressPosition: 'bottom',
      addressBackground: 'transparent',
      addressTextColor: BRAND.white,
      showDetails: true,
      detailsPosition: 'bottom',
      showLogo: true,
      logoPosition: 'top-right',
      overlayOpacity: 0,
      overlayGradient: `linear-gradient(180deg, transparent 30%, rgba(31, 41, 55, 0.95) 100%)`,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      bannerFontSize: 32,
      priceFontSize: 48,
      addressFontSize: 22,
    },
  },
  {
    id: 'ph-just-listed-luxury',
    name: 'Just Listed - Luxury',
    category: 'just-listed',
    thumbnail: `linear-gradient(135deg, ${BRAND.neutral} 0%, #000 100%)`,
    description: 'Dark elegant with gold accents',
    layout: {
      bannerPosition: 'top',
      bannerText: 'EXCLUSIVE LISTING',
      bannerColor: BRAND.accent,
      bannerTextColor: BRAND.neutral,
      showPrice: true,
      pricePosition: 'bottom-right',
      priceBackground: `rgba(212, 175, 55, 0.95)`,
      priceTextColor: BRAND.neutral,
      showAddress: true,
      addressPosition: 'bottom',
      addressBackground: `rgba(0, 0, 0, 0.85)`,
      addressTextColor: BRAND.accent,
      showDetails: true,
      detailsPosition: 'bottom',
      showLogo: true,
      logoPosition: 'top-left',
      overlayOpacity: 0.4,
      fontFamily: 'Georgia, serif',
      bannerFontSize: 40,
      priceFontSize: 34,
      addressFontSize: 22,
    },
  },

  // ========== OPEN HOUSE ==========
  {
    id: 'ph-open-house-vibrant',
    name: 'Open House - Vibrant',
    category: 'open-house',
    thumbnail: `linear-gradient(135deg, ${BRAND.secondary} 0%, ${BRAND.primary} 100%)`,
    description: 'Eye-catching purple gradient banner',
    layout: {
      bannerPosition: 'diagonal',
      bannerText: 'OPEN HOUSE',
      bannerColor: BRAND.primary,
      bannerTextColor: BRAND.white,
      showPrice: true,
      pricePosition: 'bottom-left',
      priceBackground: BRAND.white,
      priceTextColor: BRAND.primary,
      showAddress: true,
      addressPosition: 'bottom',
      addressBackground: BRAND.neutral,
      addressTextColor: BRAND.white,
      showDetails: true,
      detailsPosition: 'bottom',
      showLogo: true,
      logoPosition: 'top-right',
      overlayOpacity: 0.15,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      bannerFontSize: 44,
      priceFontSize: 32,
      addressFontSize: 22,
    },
  },
  {
    id: 'ph-open-house-minimal',
    name: 'Open House - Minimal',
    category: 'open-house',
    thumbnail: `linear-gradient(0deg, ${BRAND.white}88 0%, transparent 50%)`,
    description: 'Clean white overlay at bottom',
    layout: {
      bannerPosition: 'corner',
      bannerText: 'OPEN HOUSE',
      bannerColor: BRAND.primary,
      bannerTextColor: BRAND.white,
      showPrice: true,
      pricePosition: 'bottom-right',
      priceBackground: BRAND.primary,
      priceTextColor: BRAND.white,
      showAddress: true,
      addressPosition: 'bottom',
      addressBackground: `rgba(255, 255, 255, 0.95)`,
      addressTextColor: BRAND.neutral,
      showDetails: true,
      detailsPosition: 'bottom',
      showLogo: true,
      logoPosition: 'bottom-left',
      overlayOpacity: 0.1,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      bannerFontSize: 28,
      priceFontSize: 28,
      addressFontSize: 20,
    },
  },

  // ========== PRICE DROP ==========
  {
    id: 'ph-price-drop-urgent',
    name: 'Price Reduced - Urgent',
    category: 'price-drop',
    thumbnail: `linear-gradient(135deg, #DC2626 0%, #991B1B 100%)`,
    description: 'Bold red diagonal for urgency',
    layout: {
      bannerPosition: 'diagonal',
      bannerText: 'PRICE REDUCED',
      bannerColor: '#DC2626',
      bannerTextColor: BRAND.white,
      showPrice: true,
      pricePosition: 'center',
      priceBackground: BRAND.white,
      priceTextColor: '#DC2626',
      showAddress: true,
      addressPosition: 'bottom',
      addressBackground: BRAND.neutral,
      addressTextColor: BRAND.white,
      showDetails: false,
      detailsPosition: 'bottom',
      showLogo: true,
      logoPosition: 'top-left',
      overlayOpacity: 0.25,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      bannerFontSize: 42,
      priceFontSize: 52,
      addressFontSize: 24,
    },
  },
  {
    id: 'ph-price-drop-deal',
    name: 'Price Reduced - Deal',
    category: 'price-drop',
    thumbnail: `linear-gradient(135deg, ${BRAND.primary} 0%, #DC2626 100%)`,
    description: 'Purple to red gradient',
    layout: {
      bannerPosition: 'top',
      bannerText: 'NEW PRICE',
      bannerColor: '#DC2626',
      bannerTextColor: BRAND.white,
      showPrice: true,
      pricePosition: 'bottom-left',
      priceBackground: BRAND.accent,
      priceTextColor: BRAND.neutral,
      showAddress: true,
      addressPosition: 'bottom',
      addressBackground: `rgba(31, 41, 55, 0.9)`,
      addressTextColor: BRAND.white,
      showDetails: true,
      detailsPosition: 'bottom',
      showLogo: true,
      logoPosition: 'top-right',
      overlayOpacity: 0.2,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      bannerFontSize: 44,
      priceFontSize: 36,
      addressFontSize: 22,
    },
  },

  // ========== SOLD ==========
  {
    id: 'ph-sold-celebration',
    name: 'Sold - Celebration',
    category: 'sold',
    thumbnail: `linear-gradient(135deg, ${BRAND.accent} 0%, #B8860B 100%)`,
    description: 'Gold celebration banner',
    layout: {
      bannerPosition: 'diagonal',
      bannerText: 'SOLD',
      bannerColor: BRAND.accent,
      bannerTextColor: BRAND.neutral,
      showPrice: false,
      pricePosition: 'bottom-right',
      priceBackground: 'transparent',
      priceTextColor: BRAND.white,
      showAddress: true,
      addressPosition: 'bottom',
      addressBackground: BRAND.neutral,
      addressTextColor: BRAND.accent,
      showDetails: false,
      detailsPosition: 'bottom',
      showLogo: true,
      logoPosition: 'bottom-right',
      overlayOpacity: 0.2,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      bannerFontSize: 72,
      priceFontSize: 32,
      addressFontSize: 24,
    },
  },
  {
    id: 'ph-sold-elegant',
    name: 'Sold - Elegant',
    category: 'sold',
    thumbnail: `linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.neutral} 100%)`,
    description: 'Sophisticated purple overlay',
    layout: {
      bannerPosition: 'top',
      bannerText: 'SOLD',
      bannerColor: BRAND.primary,
      bannerTextColor: BRAND.white,
      showPrice: false,
      pricePosition: 'bottom-right',
      priceBackground: 'transparent',
      priceTextColor: BRAND.white,
      showAddress: true,
      addressPosition: 'bottom',
      addressBackground: `rgba(124, 58, 237, 0.9)`,
      addressTextColor: BRAND.white,
      showDetails: false,
      detailsPosition: 'bottom',
      showLogo: true,
      logoPosition: 'top-left',
      overlayOpacity: 0.3,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      bannerFontSize: 64,
      priceFontSize: 32,
      addressFontSize: 22,
    },
  },

  // ========== COMING SOON ==========
  {
    id: 'ph-coming-soon-teaser',
    name: 'Coming Soon - Teaser',
    category: 'coming-soon',
    thumbnail: `linear-gradient(135deg, ${BRAND.neutral} 0%, ${BRAND.primaryDark} 100%)`,
    description: 'Mysterious dark gradient',
    layout: {
      bannerPosition: 'top',
      bannerText: 'COMING SOON',
      bannerColor: BRAND.secondary,
      bannerTextColor: BRAND.neutral,
      showPrice: false,
      pricePosition: 'bottom-right',
      priceBackground: 'transparent',
      priceTextColor: BRAND.white,
      showAddress: false,
      addressPosition: 'bottom',
      addressBackground: 'transparent',
      addressTextColor: BRAND.white,
      showDetails: true,
      detailsPosition: 'overlay',
      showLogo: true,
      logoPosition: 'top-left',
      overlayOpacity: 0.5,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      bannerFontSize: 52,
      priceFontSize: 28,
      addressFontSize: 22,
    },
  },

  // ========== INVESTMENT ==========
  {
    id: 'ph-investment-pro',
    name: 'Investment - Professional',
    category: 'investment',
    thumbnail: `linear-gradient(135deg, #059669 0%, #047857 100%)`,
    description: 'Green for growth and ROI focus',
    layout: {
      bannerPosition: 'corner',
      bannerText: 'INVESTMENT',
      bannerColor: '#059669',
      bannerTextColor: BRAND.white,
      showPrice: true,
      pricePosition: 'bottom-left',
      priceBackground: BRAND.neutral,
      priceTextColor: '#10B981',
      showAddress: true,
      addressPosition: 'bottom',
      addressBackground: `rgba(31, 41, 55, 0.95)`,
      addressTextColor: BRAND.white,
      showDetails: true,
      detailsPosition: 'bottom',
      showLogo: true,
      logoPosition: 'top-right',
      overlayOpacity: 0.3,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      bannerFontSize: 28,
      priceFontSize: 36,
      addressFontSize: 20,
    },
  },
  {
    id: 'ph-investment-opportunity',
    name: 'Investment - Opportunity',
    category: 'investment',
    thumbnail: `linear-gradient(135deg, ${BRAND.primary} 0%, #059669 100%)`,
    description: 'Purple to green gradient',
    layout: {
      bannerPosition: 'top',
      bannerText: 'INVESTMENT OPPORTUNITY',
      bannerColor: BRAND.primary,
      bannerTextColor: BRAND.white,
      showPrice: true,
      pricePosition: 'bottom-right',
      priceBackground: '#059669',
      priceTextColor: BRAND.white,
      showAddress: true,
      addressPosition: 'bottom',
      addressBackground: BRAND.neutral,
      addressTextColor: BRAND.white,
      showDetails: true,
      detailsPosition: 'bottom',
      showLogo: true,
      logoPosition: 'top-left',
      overlayOpacity: 0.25,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      bannerFontSize: 36,
      priceFontSize: 32,
      addressFontSize: 22,
    },
  },
];

export function ImageOverlayGenerator({
  template,
  property,
  customImage,
  width = 1080,
  height = 1080,
  onImageGenerated,
}: ImageOverlayGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const imageUrl = customImage || property.heroImage || '/placeholder.svg';

  const formatPrice = (price?: number) =>
    price ? `$${price.toLocaleString()}` : '';

  const generateImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Track blob URL for cleanup
    let blobUrlToCleanup: string | null = null;

    try {
      // Helper to load an image with a promise
      const loadImageFromUrl = (url: string, useCors = true): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          if (useCors) {
            img.crossOrigin = 'anonymous';
          }
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load: ${url.substring(0, 50)}...`));
          img.src = url;
        });
      };

      let img: HTMLImageElement | null = null;

      // For external URLs, fetch via API proxy to avoid CORS
      if (imageUrl && imageUrl.startsWith('http')) {
        try {
          console.log('[ImageOverlay] Fetching via proxy:', imageUrl.substring(0, 60));
          const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);

          if (response.ok) {
            const blob = await response.blob();
            console.log('[ImageOverlay] Got blob:', blob.type, blob.size, 'bytes');

            const blobUrl = URL.createObjectURL(blob);
            blobUrlToCleanup = blobUrl;

            // Load image from blob URL (no CORS needed for blob URLs)
            img = await loadImageFromUrl(blobUrl, false);
            console.log('[ImageOverlay] Loaded from proxy:', img.width, 'x', img.height);
          } else {
            console.log('[ImageOverlay] Proxy failed:', response.status, response.statusText);
          }
        } catch (e) {
          console.log('[ImageOverlay] Proxy error:', e);
        }
      }

      // Fallback: Try direct load with crossOrigin
      if (!img && imageUrl) {
        try {
          console.log('[ImageOverlay] Trying direct load...');
          img = await loadImageFromUrl(imageUrl, true);
          console.log('[ImageOverlay] Direct load success:', img.width, 'x', img.height);
        } catch (e) {
          console.log('[ImageOverlay] Direct load with CORS failed, trying without...');
          try {
            img = await loadImageFromUrl(imageUrl, false);
            console.log('[ImageOverlay] Direct load (no CORS):', img.width, 'x', img.height);
          } catch (e2) {
            console.error('[ImageOverlay] All load methods failed');
          }
        }
      }

      // Draw the image if loaded successfully
      if (img && img.width > 0 && img.height > 0) {
        // Draw the image (cover fit)
        const imgRatio = img.width / img.height;
      const canvasRatio = width / height;
      let drawWidth = width;
      let drawHeight = height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > canvasRatio) {
        drawWidth = height * imgRatio;
        offsetX = -(drawWidth - width) / 2;
      } else {
        drawHeight = width / imgRatio;
        offsetY = -(drawHeight - height) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      const { layout } = template;

      // Apply overlay gradient if specified
      if (layout.overlayGradient) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        // Parse gradient - simplified for common case
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, 'transparent');
        gradient.addColorStop(1, `rgba(31, 41, 55, 0.95)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      } else if (layout.overlayOpacity > 0) {
        // Apply solid dark overlay
        ctx.fillStyle = `rgba(0, 0, 0, ${layout.overlayOpacity})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw banner based on position
      ctx.font = `bold ${layout.bannerFontSize}px ${layout.fontFamily}`;

      if (layout.bannerPosition === 'top') {
        const bannerHeight = layout.bannerFontSize * 2.2;
        ctx.fillStyle = layout.bannerColor;
        ctx.fillRect(0, 0, width, bannerHeight);
        ctx.fillStyle = layout.bannerTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layout.bannerText, width / 2, bannerHeight / 2);
      } else if (layout.bannerPosition === 'diagonal') {
        ctx.save();
        ctx.translate(width / 2, 0);
        ctx.rotate(-Math.PI / 12);
        ctx.fillStyle = layout.bannerColor;
        const bannerWidth = width * 1.5;
        const bannerHeight = layout.bannerFontSize * 2;
        ctx.fillRect(-bannerWidth / 2, -10, bannerWidth, bannerHeight);
        ctx.fillStyle = layout.bannerTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layout.bannerText, 0, bannerHeight / 2 - 10);
        ctx.restore();
      } else if (layout.bannerPosition === 'corner') {
        const ribbonSize = 180;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(ribbonSize * 1.5, 0);
        ctx.lineTo(0, ribbonSize * 1.5);
        ctx.closePath();
        ctx.fillStyle = layout.bannerColor;
        ctx.fill();
        ctx.translate(ribbonSize / 3, ribbonSize / 3);
        ctx.rotate(-Math.PI / 4);
        ctx.font = `bold ${layout.bannerFontSize * 0.7}px ${layout.fontFamily}`;
        ctx.fillStyle = layout.bannerTextColor;
        ctx.textAlign = 'center';
        ctx.fillText(layout.bannerText, 0, 0);
        ctx.restore();
      } else if (layout.bannerPosition === 'bottom') {
        // Bottom banner with label above price
        ctx.fillStyle = layout.bannerTextColor;
        ctx.textAlign = 'center';
        ctx.font = `bold ${layout.bannerFontSize}px ${layout.fontFamily}`;
        ctx.fillText(layout.bannerText, width / 2, height - 200);
      }

      // Draw price
      if (layout.showPrice && property.price) {
        const priceText = formatPrice(property.price);
        ctx.font = `bold ${layout.priceFontSize}px ${layout.fontFamily}`;
        const priceMetrics = ctx.measureText(priceText);
        const pricePadding = 24;
        const priceBoxWidth = priceMetrics.width + pricePadding * 2;
        const priceBoxHeight = layout.priceFontSize * 1.6;

        let priceX = 0;
        let priceY = 0;

        const topOffset = layout.bannerPosition === 'top' ? layout.bannerFontSize * 2.2 + 20 : 30;

        switch (layout.pricePosition) {
          case 'top-right':
            priceX = width - priceBoxWidth - 30;
            priceY = topOffset;
            break;
          case 'bottom-left':
            priceX = 30;
            priceY = height - priceBoxHeight - 120;
            break;
          case 'bottom-right':
            priceX = width - priceBoxWidth - 30;
            priceY = height - priceBoxHeight - 120;
            break;
          case 'center':
            priceX = (width - priceBoxWidth) / 2;
            priceY = (height - priceBoxHeight) / 2;
            break;
        }

        // Draw price box with rounded corners
        ctx.fillStyle = layout.priceBackground;
        ctx.beginPath();
        const radius = 8;
        ctx.roundRect(priceX, priceY, priceBoxWidth, priceBoxHeight, radius);
        ctx.fill();

        ctx.fillStyle = layout.priceTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(priceText, priceX + priceBoxWidth / 2, priceY + priceBoxHeight / 2);
      }

      // Draw address bar
      if (layout.showAddress && property.address) {
        const addressBarHeight = 85;
        const addressY = height - addressBarHeight;

        ctx.fillStyle = layout.addressBackground;
        ctx.fillRect(0, addressY, width, addressBarHeight);

        ctx.font = `600 ${layout.addressFontSize}px ${layout.fontFamily}`;
        ctx.fillStyle = layout.addressTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const addressText = property.city
          ? `${property.address}, ${property.city}`
          : property.address;

        // Truncate if too long
        let displayAddress = addressText;
        const maxWidth = width - 60;
        while (ctx.measureText(displayAddress).width > maxWidth && displayAddress.length > 0) {
          displayAddress = displayAddress.slice(0, -1);
        }
        if (displayAddress !== addressText) displayAddress += '...';

        ctx.fillText(displayAddress, width / 2, addressY + 35);

        // Draw property details below address
        if (layout.showDetails && (property.beds || property.baths || property.sqft)) {
          const detailsText = [
            property.beds ? `${property.beds} BD` : '',
            property.baths ? `${property.baths} BA` : '',
            property.sqft ? `${property.sqft.toLocaleString()} SF` : '',
          ].filter(Boolean).join('   •   ');

          ctx.font = `500 ${layout.addressFontSize * 0.75}px ${layout.fontFamily}`;
          ctx.fillStyle = layout.addressTextColor;
          ctx.globalAlpha = 0.85;
          ctx.fillText(detailsText, width / 2, addressY + 62);
          ctx.globalAlpha = 1;
        }
      } else if (layout.showDetails && layout.detailsPosition === 'overlay') {
        // Overlay details in center
        const detailsText = [
          property.beds ? `${property.beds} Beds` : '',
          property.baths ? `${property.baths} Baths` : '',
          property.sqft ? `${property.sqft.toLocaleString()} SF` : '',
        ].filter(Boolean).join('   •   ');

        if (detailsText) {
          ctx.font = `600 ${layout.addressFontSize}px ${layout.fontFamily}`;
          const detailsMetrics = ctx.measureText(detailsText);
          const boxPadding = 20;
          const boxWidth = detailsMetrics.width + boxPadding * 2;
          const boxHeight = layout.addressFontSize * 2;
          const boxX = (width - boxWidth) / 2;
          const boxY = height / 2 + 80;

          ctx.fillStyle = 'rgba(31, 41, 55, 0.85)';
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
          ctx.fill();

          ctx.fillStyle = BRAND.white;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(detailsText, width / 2, boxY + boxHeight / 2);
        }
      }

      // Draw Purple Homes logo/branding
      if (layout.showLogo) {
        const logoText = 'PURPLE HOMES';
        ctx.font = `bold 20px ${layout.fontFamily}`;

        // Add subtle shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillStyle = BRAND.white;

        let logoX = 0;
        let logoY = 0;
        const topOffset = layout.bannerPosition === 'top' ? layout.bannerFontSize * 2.2 + 25 : 35;
        const bottomOffset = layout.showAddress ? 110 : 35;

        switch (layout.logoPosition) {
          case 'top-left':
            logoX = 25;
            logoY = topOffset;
            ctx.textAlign = 'left';
            break;
          case 'top-right':
            logoX = width - 25;
            logoY = topOffset;
            ctx.textAlign = 'right';
            break;
          case 'bottom-left':
            logoX = 25;
            logoY = height - bottomOffset;
            ctx.textAlign = 'left';
            break;
          case 'bottom-right':
            logoX = width - 25;
            logoY = height - bottomOffset;
            ctx.textAlign = 'right';
            break;
        }

        // Draw purple accent bar before logo
        const logoMetrics = ctx.measureText(logoText);
        ctx.shadowBlur = 0;
        ctx.fillStyle = BRAND.primary;
        if (ctx.textAlign === 'left') {
          ctx.fillRect(logoX - 3, logoY - 10, 3, 20);
        } else {
          ctx.fillRect(logoX - logoMetrics.width - 3, logoY - 10, 3, 20);
        }

        ctx.fillStyle = BRAND.white;
        ctx.shadowBlur = 4;
        ctx.fillText(logoText, logoX, logoY);

        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
      } else {
        // Image failed to load - draw a placeholder
        console.error('[ImageOverlay] Image failed to load, drawing placeholder');
        ctx.fillStyle = BRAND.neutral;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = BRAND.white;
        ctx.font = 'bold 24px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Image unavailable', width / 2, height / 2);
      }

      // Generate data URL
      const dataUrl = canvas.toDataURL('image/png');
      setGeneratedImage(dataUrl);
      onImageGenerated?.(dataUrl);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      // Cleanup blob URL if created
      if (blobUrlToCleanup) {
        URL.revokeObjectURL(blobUrlToCleanup);
      }
      setIsGenerating(false);
    }
  }, [template, property, imageUrl, width, height, onImageGenerated]);

  useEffect(() => {
    generateImage();
  }, [generateImage]);

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.download = `${property.propertyCode || 'property'}-${template.id}.png`;
    link.href = generatedImage;
    link.click();
  };

  // Calculate aspect ratio style
  const aspectRatioStyle = {
    paddingBottom: `${(height / width) * 100}%`,
  };

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      <div
        className="relative rounded-lg overflow-hidden bg-muted border"
        style={{ width: '100%', paddingBottom: `${Math.min((height / width) * 100, 177.78)}%` }}
      >
        <div className="absolute inset-0">
          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          {generatedImage ? (
            <img
              src={generatedImage}
              alt="Generated social media image"
              className="w-full h-full object-contain bg-black/20"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Generating preview...</p>
            </div>
          )}
        </div>
      </div>

      {/* Size indicator */}
      <p className="text-xs text-muted-foreground text-center">
        {width} × {height} px
      </p>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={generateImage}
          disabled={isGenerating}
          className="flex-1"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isGenerating && "animate-spin")} />
          Regenerate
        </Button>
        <Button
          size="sm"
          onClick={handleDownload}
          disabled={!generatedImage || isGenerating}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  );
}

// Template selector component
interface OverlayTemplateSelectorProps {
  selectedTemplate: OverlayTemplate | null;
  onSelectTemplate: (template: OverlayTemplate) => void;
  category?: OverlayTemplate['category'];
}

export function OverlayTemplateSelector({
  selectedTemplate,
  onSelectTemplate,
  category,
}: OverlayTemplateSelectorProps) {
  const filteredTemplates = category
    ? overlayTemplates.filter(t => t.category === category)
    : overlayTemplates;

  // Group by category for better organization
  const categories = [
    { id: 'just-listed', label: 'Just Listed', icon: '🏠' },
    { id: 'open-house', label: 'Open House', icon: '🚪' },
    { id: 'price-drop', label: 'Price Reduced', icon: '📉' },
    { id: 'sold', label: 'Sold', icon: '🎉' },
    { id: 'coming-soon', label: 'Coming Soon', icon: '👀' },
    { id: 'investment', label: 'Investment', icon: '💰' },
  ];

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const templates = filteredTemplates.filter(t => t.category === cat.id);
        if (templates.length === 0) return null;

        return (
          <div key={cat.id}>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span>{cat.icon}</span>
              {cat.label}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  className={cn(
                    'relative cursor-pointer rounded-lg border-2 p-2 transition-all hover:shadow-md',
                    selectedTemplate?.id === template.id
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-transparent bg-muted/30 hover:border-primary/30'
                  )}
                >
                  {/* Thumbnail */}
                  <div
                    className="aspect-square rounded-md mb-2"
                    style={{ background: template.thumbnail }}
                  />

                  {/* Name */}
                  <p className="font-medium text-xs truncate">{template.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{template.description}</p>

                  {/* Selected indicator */}
                  {selectedTemplate?.id === template.id && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Platform size presets
export type PlatformSize = {
  id: string;
  name: string;
  platform: 'instagram' | 'facebook' | 'linkedin' | 'all';
  width: number;
  height: number;
  aspectRatio: string;
  description: string;
};

export const platformSizes: PlatformSize[] = [
  {
    id: 'instagram-square',
    name: 'Instagram Square',
    platform: 'instagram',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    description: 'Feed posts, best engagement',
  },
  {
    id: 'instagram-portrait',
    name: 'Instagram Portrait',
    platform: 'instagram',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    description: 'Takes more feed space',
  },
  {
    id: 'instagram-story',
    name: 'Instagram Story',
    platform: 'instagram',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    description: 'Stories & Reels',
  },
  {
    id: 'facebook-landscape',
    name: 'Facebook Post',
    platform: 'facebook',
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    description: 'Optimal for link shares',
  },
  {
    id: 'facebook-square',
    name: 'Facebook Square',
    platform: 'facebook',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    description: 'Feed posts',
  },
  {
    id: 'linkedin-landscape',
    name: 'LinkedIn Post',
    platform: 'linkedin',
    width: 1200,
    height: 627,
    aspectRatio: '1.91:1',
    description: 'Professional posts',
  },
];

interface PlatformSizeSelectorProps {
  selectedSize: PlatformSize;
  onSelectSize: (size: PlatformSize) => void;
}

export function PlatformSizeSelector({
  selectedSize,
  onSelectSize,
}: PlatformSizeSelectorProps) {
  // Group by platform
  const platforms = [
    { id: 'instagram', label: 'Instagram', icon: '📸' },
    { id: 'facebook', label: 'Facebook', icon: '📘' },
    { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Image Size</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {platformSizes.map((size) => (
          <button
            key={size.id}
            onClick={() => onSelectSize(size)}
            className={cn(
              'p-2 rounded-lg border-2 text-left transition-all',
              selectedSize.id === size.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs">
                {platforms.find(p => p.id === size.platform)?.icon}
              </span>
              <span className="text-xs font-medium truncate">{size.name}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {size.width}×{size.height} ({size.aspectRatio})
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
