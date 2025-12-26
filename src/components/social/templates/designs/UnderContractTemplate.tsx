import type { Property } from '@/types';
import type { TemplateSettings, CalculatedFields } from '../types';
import { ACCENT_COLORS } from '../config';

interface Props {
  property: Property;
  settings: TemplateSettings;
  calculated: CalculatedFields;
  imageUrl: string;
}

function formatCurrency(value?: number): string {
  if (!value) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function getLogoPosition(position: string): string {
  const positions: Record<string, string> = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };
  return positions[position] || positions['bottom-right'];
}

export default function UnderContractTemplate({
  property,
  settings,
  calculated,
  imageUrl,
}: Props) {
  const colors = ACCENT_COLORS[settings.accentColor];
  const show = (field: string) => settings.visibleFields.includes(field);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"
        style={{ opacity: settings.overlayOpacity / 100 }}
      />

      {/* Diagonal Banner */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="px-20 py-4 text-center font-black text-3xl uppercase tracking-widest text-white transform -rotate-12"
          style={{ backgroundColor: colors.primary }}
        >
          UNDER CONTRACT
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="p-4">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-bold uppercase tracking-wider"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          >
            <span>PENDING</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Property Info */}
        <div className="p-6 space-y-3">
          {/* Address */}
          {show('address') && (
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              {property.address}
            </h2>
          )}
          {show('city') && (
            <p className="text-white/70 text-lg">
              {property.city}
              {property.state ? `, ${property.state}` : ''}
            </p>
          )}

          {/* Price */}
          {show('price') && (
            <div
              className="text-3xl md:text-4xl font-black"
              style={{ color: colors.secondary }}
            >
              {formatCurrency(property.price)}
            </div>
          )}

          {/* Specs */}
          <div className="flex items-center gap-6 text-white pt-2">
            {show('beds') && property.beds && (
              <div className="text-center">
                <span className="block text-xl font-bold">{property.beds}</span>
                <span className="text-xs text-white/60 uppercase">Beds</span>
              </div>
            )}
            {show('baths') && property.baths && (
              <div className="text-center">
                <span className="block text-xl font-bold">{property.baths}</span>
                <span className="text-xs text-white/60 uppercase">Baths</span>
              </div>
            )}
            {show('sqft') && property.sqft && (
              <div className="text-center">
                <span className="block text-xl font-bold">
                  {property.sqft.toLocaleString()}
                </span>
                <span className="text-xs text-white/60 uppercase">Sq Ft</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logo */}
      {settings.showLogo && (
        <div className={`absolute z-20 ${getLogoPosition(settings.logoPosition)}`}>
          <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded">
            <span className="text-sm font-bold" style={{ color: colors.primary }}>
              Purple Homes
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
