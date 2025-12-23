/**
 * UrgencyIndicator - Red/yellow/green dot showing deal urgency
 *
 * Types:
 * - urgent: Red pulsing dot (needs immediate attention)
 * - warning: Amber dot (follow up soon)
 * - new: Green pulsing dot (new deal)
 * - normal: Hidden (no indicator needed)
 */

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type UrgencyType = 'urgent' | 'warning' | 'new' | 'normal';

interface UrgencyIndicatorProps {
  type: UrgencyType;
  label?: string;
  className?: string;
}

const CONFIG: Record<
  UrgencyType,
  { color: string; pulse: boolean; defaultLabel: string }
> = {
  urgent: {
    color: 'bg-red-500',
    pulse: true,
    defaultLabel: 'Needs attention',
  },
  warning: {
    color: 'bg-amber-500',
    pulse: false,
    defaultLabel: 'Follow up soon',
  },
  new: {
    color: 'bg-green-500',
    pulse: true,
    defaultLabel: 'New',
  },
  normal: {
    color: 'bg-gray-300',
    pulse: false,
    defaultLabel: '',
  },
};

export function UrgencyIndicator({
  type,
  label,
  className,
}: UrgencyIndicatorProps) {
  // Don't render anything for normal type
  if (type === 'normal') return null;

  const config = CONFIG[type];
  const displayLabel = label || config.defaultLabel;

  const dot = (
    <span className={cn('relative flex h-2.5 w-2.5 flex-shrink-0', className)}>
      {config.pulse && (
        <span
          className={cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            config.color
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full h-2.5 w-2.5',
          config.color
        )}
      />
    </span>
  );

  // If no label, just return the dot
  if (!displayLabel) return dot;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{dot}</TooltipTrigger>
        <TooltipContent>
          <p>{displayLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Helper to determine urgency type from deal data
 */
export function getUrgencyType(isStale?: boolean, daysSinceActivity?: number): UrgencyType {
  if (isStale) return 'urgent';
  if (daysSinceActivity !== undefined && daysSinceActivity >= 5) return 'warning';
  if (daysSinceActivity !== undefined && daysSinceActivity <= 1) return 'new';
  return 'normal';
}
