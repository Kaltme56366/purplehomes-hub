import type { Property } from '@/types';

export interface ImejisTemplate {
  id: string;
  templateId: string;  // Imejis template ID
  name: string;
  description: string;
  previewImage: string;  // Static preview thumbnail
  category: 'listing' | 'status' | 'engagement';
  fieldMap: Record<string, string>;
}

export interface GenerateImageParams {
  templateId: string;
  property: Property;
}

export interface GenerateImageResult {
  success: boolean;
  imageBlob?: Blob;
  imageUrl?: string;
  error?: string;
}
