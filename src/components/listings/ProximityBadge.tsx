/**
 * Proximity Badge Component
 *
 * Displays distance and proximity tier for properties
 * Zillow-style visual indicators
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getProximityTierInfo,
  formatDistance,
  estimateCommute,
  type ProximityTier
} from '@/lib/proximityCalculator';

export interface ProximityBadgeProps {
  distance: number;
  className?: string;
  showCommute?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

/**
 * Proximity Badge Component
 *
 * Usage:
 * ```tsx
 * <ProximityBadge distance={15.3} showCommute />
 * ```
 */
export function ProximityBadge({
  distance,
  className,
  showCommute = false,
  variant = 'default'
}: ProximityBadgeProps) {
  const tier = getProximityTierInfo(distance);

  // Color mapping
  const colorClasses = {
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  const badgeColor = colorClasses[tier.color as keyof typeof colorClasses] || colorClasses.gray;

  // Compact variant
  if (variant === 'compact') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'flex items-center gap-1 text-xs font-medium',
          badgeColor,
          className
        )}
      >
        <span>{tier.icon}</span>
        <span>{formatDistance(distance)}</span>
      </Badge>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <Badge
          variant="outline"
          className={cn(
            'flex items-center gap-2 text-sm font-medium w-fit',
            badgeColor
          )}
        >
          <span className="text-base">{tier.icon}</span>
          <span>{tier.name}</span>
        </Badge>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDistance(distance)} away</span>
          {showCommute && distance > 0 && (
            <>
              <span>•</span>
              <span>~{estimateCommute(distance)} min commute</span>
            </>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-2 text-sm font-medium',
        badgeColor,
        className
      )}
    >
      <span className="text-base">{tier.icon}</span>
      <span>{formatDistance(distance)}</span>
      {showCommute && distance > 0 && (
        <>
          <span className="mx-1">•</span>
          <span className="text-xs">~{estimateCommute(distance)} min</span>
        </>
      )}
    </Badge>
  );
}

/**
 * Section Divider Component
 * Shows when proximity tier changes in a list
 */
export interface ProximitySectionDividerProps {
  tier: ProximityTier;
  count: number;
  className?: string;
}

export function ProximitySectionDivider({
  tier,
  count,
  className
}: ProximitySectionDividerProps) {
  const colorClasses = {
    purple: 'text-purple-600 border-purple-200',
    green: 'text-green-600 border-green-200',
    blue: 'text-blue-600 border-blue-200',
    orange: 'text-orange-600 border-orange-200',
    gray: 'text-gray-600 border-gray-200'
  };

  const dividerColor = colorClasses[tier.color as keyof typeof colorClasses] || colorClasses.gray;

  return (
    <div className={cn('flex items-center gap-4 my-6', className)}>
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-2xl">{tier.icon}</span>
        <div>
          <h3 className={cn('text-sm font-semibold', dividerColor)}>
            {tier.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {tier.description} • {count} {count === 1 ? 'property' : 'properties'}
          </p>
        </div>
      </div>
      <div className={cn('flex-1 h-px', dividerColor.replace('text-', 'bg-'))} />
    </div>
  );
}

/**
 * Proximity Filter Chip
 * Used in filter panels
 */
export interface ProximityFilterChipProps {
  tier: string;
  count: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ProximityFilterChip({
  tier,
  count,
  selected = false,
  onClick,
  className
}: ProximityFilterChipProps) {
  const tierInfo = getProximityTierInfo(tier === 'exact' ? 0 : tier === 'nearby' ? 10 : tier === 'close' ? 25 : tier === 'moderate' ? 50 : 100);

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
        selected
          ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium'
          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300',
        className
      )}
    >
      <span className="text-lg">{tierInfo.icon}</span>
      <div className="text-left">
        <div className="text-sm font-medium">{tierInfo.name}</div>
        <div className="text-xs text-muted-foreground">{count}</div>
      </div>
    </button>
  );
}
