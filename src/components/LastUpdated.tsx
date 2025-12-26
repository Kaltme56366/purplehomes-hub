/**
 * LastUpdated - Display component for showing when data was last refreshed
 *
 * Shows relative time (e.g., "Updated 2 min ago") with optional refresh button.
 */

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LastUpdatedProps {
  /** Timestamp when data was last updated (from React Query's dataUpdatedAt) */
  dataUpdatedAt: number;
  /** Optional callback to trigger refresh */
  onRefresh?: () => void;
  /** Whether a refresh is currently in progress */
  isRefreshing?: boolean;
  /** Additional class names */
  className?: string;
  /** Show the refresh button */
  showRefreshButton?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
}

export function LastUpdated({
  dataUpdatedAt,
  onRefresh,
  isRefreshing = false,
  className,
  showRefreshButton = true,
  size = 'sm',
}: LastUpdatedProps) {
  const [, setTick] = useState(0);

  // Re-render every minute to update the relative time
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Don't show if no timestamp
  if (!dataUpdatedAt) return null;

  const timeAgo = formatDistanceToNow(dataUpdatedAt, { addSuffix: true });

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-muted-foreground',
        sizeClasses[size],
        className
      )}
    >
      <span>Updated {timeAgo}</span>
      {showRefreshButton && onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-6 w-6',
            size === 'md' && 'h-7 w-7'
          )}
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn(
              'h-3 w-3',
              size === 'md' && 'h-4 w-4',
              isRefreshing && 'animate-spin'
            )}
          />
          <span className="sr-only">Refresh data</span>
        </Button>
      )}
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function LastUpdatedInline({
  dataUpdatedAt,
  className,
}: {
  dataUpdatedAt: number;
  className?: string;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!dataUpdatedAt) return null;

  const timeAgo = formatDistanceToNow(dataUpdatedAt, { addSuffix: true });

  return (
    <span className={cn('text-xs text-muted-foreground', className)}>
      {timeAgo}
    </span>
  );
}

export default LastUpdated;
