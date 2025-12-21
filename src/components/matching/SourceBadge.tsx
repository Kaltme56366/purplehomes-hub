import { Home, FileText, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type PropertySource = 'Inventory' | 'Lead' | 'Zillow';

interface SourceBadgeProps {
  source: PropertySource;
  size?: 'sm' | 'md';
}

/**
 * SourceBadge - Display property source as a colored badge
 *
 * Shows where a property came from:
 * - Inventory (blue): Properties from internal inventory
 * - Lead (green): Properties from acquisition pipeline/leads
 * - Zillow (purple): Properties saved from Zillow search
 */
export function SourceBadge({ source, size = 'sm' }: SourceBadgeProps) {
  const config = {
    Inventory: {
      icon: Home,
      className: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    Lead: {
      icon: FileText,
      className: 'bg-green-100 text-green-700 border-green-200',
    },
    Zillow: {
      icon: Search,
      className: 'bg-purple-100 text-purple-700 border-purple-200',
    },
  };

  const Icon = config[source].icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Badge
      variant="outline"
      className={`${config[source].className} ${textSize}`}
    >
      <Icon className={`${iconSize} mr-1`} />
      {source}
    </Badge>
  );
}
