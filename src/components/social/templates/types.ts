import type { Property } from '@/types';

// Template IDs for Fabric.js templates
export type TemplateId =
  | 'modern-frame'
  | 'diagonal-bold'
  | 'luxury-showcase'
  | 'clean-minimal';

export type ImageFormat = '4:5' | '1:1' | '16:9';

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  icon: string;
  description: string;
  supportedFormats: ImageFormat[];
  previewImage?: string;
}

export interface TemplateSettings {
  format: ImageFormat;
  showAddress: boolean;
  showPrice: boolean;
  showSpecs: boolean;
  showLogo: boolean;
  customTagline?: string;
}

export interface PropertyData {
  address: string;
  city: string;
  state?: string;
  price: number;
  beds: number;
  baths: number;
  sqft?: number;
  propertyType?: string;
  heroImage: string;
  additionalImages?: string[];
  arv?: number;
  repairCost?: number;
  propertyCode?: string;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export const FORMAT_DIMENSIONS: Record<ImageFormat, CanvasDimensions & { label: string }> = {
  '4:5': { width: 1080, height: 1350, label: '4:5' },
  '1:1': { width: 1080, height: 1080, label: '1:1' },
  '16:9': { width: 1200, height: 675, label: '16:9' },
};

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'modern-frame',
    name: 'Modern Frame',
    icon: '🖼️',
    description: 'Clean white border with address header and thumbnail strip',
    supportedFormats: ['4:5', '1:1'],
  },
  {
    id: 'diagonal-bold',
    name: 'Diagonal Bold',
    icon: '📐',
    description: 'Dynamic angled shapes with specs checklist',
    supportedFormats: ['4:5', '1:1'],
  },
  {
    id: 'luxury-showcase',
    name: 'Luxury Showcase',
    icon: '✨',
    description: 'Elegant design with gold accents',
    supportedFormats: ['1:1', '4:5'],
  },
  {
    id: 'clean-minimal',
    name: 'Clean Minimal',
    icon: '📱',
    description: 'Full-bleed image with info bar overlay',
    supportedFormats: ['4:5', '1:1', '16:9'],
  },
];

// Default settings
export const DEFAULT_SETTINGS: TemplateSettings = {
  format: '4:5',
  showAddress: true,
  showPrice: true,
  showSpecs: true,
  showLogo: true,
};

// Calculated from property data (kept for compatibility)
export interface CalculatedFields {
  potentialProfit?: number;
  equity?: number;
  discountPercent?: number;
  pricePerSqft?: number;
}

// Legacy types for backward compatibility with old templates
export type AccentColor = 'purple' | 'blue' | 'green' | 'orange' | 'dark' | 'gold';
