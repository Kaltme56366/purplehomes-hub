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
    'top-left': 'top-16 left-4',
    'top-right': 'top-16 right-4',
    'bottom-left': 'bottom-16 left-4',
    'bottom-right': 'bottom-16 right-4',
  };
  return positions[position] || positions['bottom-right'];
}

export default function DealAlertTemplate({
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

      {/* Dark Overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: settings.overlayOpacity / 100 }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header Banner */}
        <div className="py-4 text-center" style={{ backgroundColor: colors.primary }}>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black tracking-wider uppercase text-white">
              DEAL ALERT
            </h1>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Property Card */}
        <div className="mx-4 mb-4 p-4 rounded-xl bg-black/80 backdrop-blur-sm border border-white/10">
          {/* Address */}
          {show('address') && (
            <div className="mb-3">
              <h2 className="text-xl font-bold text-white leading-tight">
                {property.address}
              </h2>
              {show('city') && (
                <p className="text-white/60 text-sm">
                  {property.city}
                  {property.state ? `, ${property.state}` : ''}
                </p>
              )}
            </div>
          )}

          {/* Price */}
          {show('price') && (
            <div
              className="text-3xl md:text-4xl font-black mb-3"
              style={{ color: colors.secondary }}
            >
              {formatCurrency(property.price)}
            </div>
          )}

          {/* Specs Row */}
          <div className="flex items-center gap-3 text-white/80 text-sm mb-3">
            {show('beds') && property.beds && (
              <span>
                <strong>{property.beds}</strong> BD
              </span>
            )}
            {show('baths') && property.baths && (
              <span>
                <strong>{property.baths}</strong> BA
              </span>
            )}
            {show('sqft') && property.sqft && (
              <span>
                <strong>{property.sqft.toLocaleString()}</strong> SF
              </span>
            )}
          </div>

          {/* ARV & Profit */}
          {(show('arv') || show('profit')) &&
            (calculated.potentialProfit || (property as any).arv) && (
              <div className="flex items-center gap-4 pt-3 border-t border-white/20">
                {show('arv') && (property as any).arv && (
                  <div>
                    <p className="text-[10px] text-white/50 uppercase">ARV</p>
                    <p className="text-lg font-bold text-white">
                      {formatCurrency((property as any).arv)}
                    </p>
                  </div>
                )}
                {show('profit') &&
                  calculated.potentialProfit &&
                  calculated.potentialProfit > 0 && (
                    <div>
                      <p className="text-[10px] text-white/50 uppercase">
                        Potential Profit
                      </p>
                      <p className="text-lg font-bold text-green-400">
                        {formatCurrency(calculated.potentialProfit)}
                      </p>
                    </div>
                  )}
              </div>
            )}
        </div>

        {/* CTA Footer */}
        <div className="py-3 text-center" style={{ backgroundColor: colors.primary }}>
          <p className="text-sm font-semibold text-white uppercase tracking-wide">
            DM for Details
          </p>
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
