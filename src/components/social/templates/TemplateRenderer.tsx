import { forwardRef } from 'react';
import type { Property } from '@/types';
import type { TemplateId, TemplateSettings, CalculatedFields } from './types';
import { FORMAT_DIMENSIONS } from './config';

// Import templates
import {
  JustListedTemplate,
  DealAlertTemplate,
  InvestmentTemplate,
  SoldTemplate,
  UnderContractTemplate,
  PriceReducedTemplate,
} from './designs';

interface Props {
  templateId: TemplateId;
  property: Property;
  settings: TemplateSettings;
  imageUrl: string;
}

const TemplateRenderer = forwardRef<HTMLDivElement, Props>(
  ({ templateId, property, settings, imageUrl }, ref) => {
    // Calculate derived fields
    const calculated: CalculatedFields = {
      potentialProfit: calculateProfit(property),
      equity: calculateEquity(property),
      discountPercent: calculateDiscount(property),
      pricePerSqft: property.sqft ? Math.round(property.price / property.sqft) : undefined,
    };

    // Aspect ratio class
    const aspectClass = {
      '4:5': 'aspect-[4/5]',
      '1:1': 'aspect-square',
      '16:9': 'aspect-video',
    }[settings.format];

    const templateProps = { property, settings, calculated, imageUrl };

    return (
      <div
        ref={ref}
        className={`w-full ${aspectClass} overflow-hidden rounded-lg`}
        style={{ maxWidth: '500px' }}
      >
        {templateId === 'just-listed' && <JustListedTemplate {...templateProps} />}
        {templateId === 'deal-alert' && <DealAlertTemplate {...templateProps} />}
        {templateId === 'investment' && <InvestmentTemplate {...templateProps} />}
        {templateId === 'sold' && <SoldTemplate {...templateProps} />}
        {templateId === 'under-contract' && <UnderContractTemplate {...templateProps} />}
        {templateId === 'price-reduced' && <PriceReducedTemplate {...templateProps} />}
      </div>
    );
  }
);

TemplateRenderer.displayName = 'TemplateRenderer';

export default TemplateRenderer;

// Helper functions
function calculateProfit(property: Property): number | undefined {
  const arv = (property as any).arv;
  const repairCost = (property as any).repairCost || 0;
  if (!arv) return undefined;
  return arv - property.price - repairCost;
}

function calculateEquity(property: Property): number | undefined {
  const arv = (property as any).arv;
  if (!arv) return undefined;
  return arv - property.price;
}

function calculateDiscount(property: Property): number | undefined {
  const arv = (property as any).arv;
  if (!arv) return undefined;
  return Math.round(((arv - property.price) / arv) * 100);
}
