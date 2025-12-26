// Re-export everything from types.ts for consistency
export { TEMPLATES, FORMAT_DIMENSIONS, DEFAULT_SETTINGS } from './types';
export type {
  TemplateId,
  TemplateConfig,
  TemplateSettings,
  ImageFormat,
  PropertyData,
  CanvasDimensions,
  CalculatedFields,
  AccentColor,
} from './types';

// Legacy color palette (kept for backward compatibility with old templates)
export const ACCENT_COLORS: Record<
  string,
  {
    name: string;
    primary: string;
    secondary: string;
    gradient: string;
  }
> = {
  purple: {
    name: 'Purple',
    primary: '#7C3AED',
    secondary: '#A78BFA',
    gradient: 'from-purple-600 to-violet-500',
  },
  blue: {
    name: 'Blue',
    primary: '#2563EB',
    secondary: '#60A5FA',
    gradient: 'from-blue-600 to-cyan-500',
  },
  green: {
    name: 'Green',
    primary: '#059669',
    secondary: '#34D399',
    gradient: 'from-emerald-600 to-teal-500',
  },
  orange: {
    name: 'Orange',
    primary: '#EA580C',
    secondary: '#FB923C',
    gradient: 'from-orange-600 to-amber-500',
  },
  dark: {
    name: 'Dark',
    primary: '#1F2937',
    secondary: '#4B5563',
    gradient: 'from-gray-800 to-gray-700',
  },
  gold: {
    name: 'Gold',
    primary: '#CA8A04',
    secondary: '#FACC15',
    gradient: 'from-yellow-600 to-amber-400',
  },
};

// Legacy field toggles (kept for backward compatibility)
export const AVAILABLE_FIELDS = [
  { key: 'price', label: 'Price' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'beds', label: 'Bedrooms' },
  { key: 'baths', label: 'Bathrooms' },
  { key: 'sqft', label: 'Square Feet' },
  { key: 'arv', label: 'ARV' },
  { key: 'repairCost', label: 'Repair Cost' },
  { key: 'profit', label: 'Potential Profit' },
  { key: 'propertyType', label: 'Property Type' },
];
