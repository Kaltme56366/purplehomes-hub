import { Tag, Calculator, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type ZillowSearchType = 'Keywords' | 'Formula' | 'DOM';

interface ZillowTypeBadgeProps {
  type: ZillowSearchType;
  size?: 'sm' | 'md';
}

/**
 * ZillowTypeBadge - Display Zillow search type as a colored badge
 *
 * Shows how a Zillow property was discovered:
 * - Keywords (amber): Found via keyword-based search (e.g., "seller finance")
 * - Formula (cyan): Found via formula-based search (beds + price + location)
 * - DOM (rose): Found via days-on-market search (90+ days listings)
 */
export function ZillowTypeBadge({ type, size = 'sm' }: ZillowTypeBadgeProps) {
  const config = {
    Keywords: {
      icon: Tag,
      label: 'Keywords',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    Formula: {
      icon: Calculator,
      label: 'Formula Match',
      className: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
    DOM: {
      icon: Clock,
      label: 'Days on Market',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  };

  const typeConfig = config[type] || config.Keywords;
  const Icon = typeConfig.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Badge
      variant="outline"
      className={`${typeConfig.className} ${textSize}`}
    >
      <Icon className={`${iconSize} mr-1`} />
      {typeConfig.label}
    </Badge>
  );
}
