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
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };
  return positions[position] || positions['bottom-right'];
}

export default function InvestmentTemplate({
  property,
  settings,
  calculated,
  imageUrl,
}: Props) {
  const colors = ACCENT_COLORS[settings.accentColor];
  const show = (field: string) => settings.visibleFields.includes(field);

  // Investment metrics
  const arv = (property as any).arv || property.price * 1.3;
  const repairCost = (property as any).repairCost || 0;
  const profit = arv - property.price - repairCost;
  const roi = Math.round((profit / property.price) * 100);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />

      {/* Heavy Overlay for readability */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: (settings.overlayOpacity + 10) / 100 }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header Banner */}
        <div className="py-4 text-center" style={{ backgroundColor: colors.primary }}>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl md:text-2xl font-black tracking-wider uppercase text-white">
              INVESTMENT OPPORTUNITY
            </h1>
          </div>
        </div>

        {/* Address Section */}
        <div className="p-4 text-center">
          {show('address') && (
            <h2 className="text-xl font-bold text-white leading-tight">
              {property.address}
            </h2>
          )}
          {show('city') && (
            <p className="text-white/70 text-sm">
              {property.city}
              {property.state ? `, ${property.state}` : ''}
            </p>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="grid grid-cols-2 gap-3 w-full max-w-md">
            {/* Price */}
            {show('price') && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <p className="text-xs text-white/60 uppercase mb-1">Price</p>
                <p className="text-2xl font-black text-white">
                  {formatCurrency(property.price)}
                </p>
              </div>
            )}

            {/* ARV */}
            {show('arv') && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <p className="text-xs text-white/60 uppercase mb-1">ARV</p>
                <p className="text-2xl font-black" style={{ color: colors.secondary }}>
                  {formatCurrency(arv)}
                </p>
              </div>
            )}

            {/* Repairs */}
            {show('repairCost') && repairCost > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <p className="text-xs text-white/60 uppercase mb-1">Est. Repairs</p>
                <p className="text-2xl font-black text-orange-400">
                  {formatCurrency(repairCost)}
                </p>
              </div>
            )}

            {/* Profit */}
            {show('profit') && (
              <div
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center"
                style={{ borderColor: colors.primary, borderWidth: 2 }}
              >
                <p className="text-xs text-white/60 uppercase mb-1">Potential Profit</p>
                <p className="text-2xl font-black text-green-400">
                  {formatCurrency(profit)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Specs Row */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-center gap-6 text-white bg-black/50 rounded-lg py-3">
            {show('beds') && property.beds && (
              <div className="text-center">
                <span className="block text-lg font-bold">{property.beds}</span>
                <span className="text-xs text-white/60 uppercase">Beds</span>
              </div>
            )}
            {show('baths') && property.baths && (
              <div className="text-center">
                <span className="block text-lg font-bold">{property.baths}</span>
                <span className="text-xs text-white/60 uppercase">Baths</span>
              </div>
            )}
            {show('sqft') && property.sqft && (
              <div className="text-center">
                <span className="block text-lg font-bold">
                  {property.sqft.toLocaleString()}
                </span>
                <span className="text-xs text-white/60 uppercase">Sq Ft</span>
              </div>
            )}
            {roi > 0 && (
              <div className="text-center">
                <span className="block text-lg font-bold text-green-400">{roi}%</span>
                <span className="text-xs text-white/60 uppercase">ROI</span>
              </div>
            )}
          </div>
        </div>

        {/* CTA Footer */}
        <div className="py-3 text-center" style={{ backgroundColor: colors.primary }}>
          <p className="text-sm font-semibold text-white uppercase tracking-wide">
            Serious Investors Only
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
