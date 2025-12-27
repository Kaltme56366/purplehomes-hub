import type { ImejisTemplate } from './types';

export const IMEJIS_TEMPLATES: ImejisTemplate[] = [
  {
    id: 'just-listed',
    templateId: 'OAK-8CUhVb0vh67VE7m_8',
    name: 'Just Listed',
    description: 'Professional listing announcement',
    previewImage: '/templates/just-listed-preview.png',
    category: 'listing',
    fieldMap: {
      heroImage: "image_comp_1766579487937_2ecao894x",
      image2: "image_comp_1766579497425_79lrxvcc6",
      image3: "image_comp_1766579557993_7q6b7whfd",
      image4: "image_comp_1766579561178_4dfcjwv1g",
      header: "text_comp_1766579570266_lf8grv8x4",
      streetAddress: "text_comp_1766579622707_xotx39jot",
      city: "text_comp_1766579810412_9igrodhhg",
      stateZip: "text_comp_1766579816013_rnrp4d1sy",
      bedCount: "text_comp_1766579827041_74rbu9zpq",
      bathCount: "text_comp_1766579834532_gdt9dc14h",
      sqft: "text_comp_1766579839141_03b8tgeh4",
    },
  },
  // MORE TEMPLATES WILL BE ADDED HERE
  // When Krista sends template images, add new entries with their Imejis IDs
];

export function getTemplateById(id: string): ImejisTemplate | undefined {
  return IMEJIS_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: ImejisTemplate['category']): ImejisTemplate[] {
  return IMEJIS_TEMPLATES.filter(t => t.category === category);
}
