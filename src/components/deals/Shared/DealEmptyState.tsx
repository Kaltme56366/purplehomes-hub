/**
 * DealEmptyState - Friendly empty states with illustrations
 *
 * Provides consistent empty state messaging across the Deal Pipeline.
 */

import { LucideIcon, Inbox, Search, Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface DealEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function DealEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: DealEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * No deals in the pipeline
 */
export function NoDealsEmptyState() {
  const navigate = useNavigate();

  return (
    <DealEmptyState
      icon={Inbox}
      title="No deals yet"
      description="Deals will appear here when you match buyers with properties and start managing them through the pipeline."
      action={{
        label: 'Go to Matching',
        onClick: () => navigate('/matching'),
      }}
    />
  );
}

/**
 * No search results
 */
export function NoResultsEmptyState({ onClear }: { onClear?: () => void }) {
  return (
    <DealEmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your filters or search terms."
      action={
        onClear
          ? {
              label: 'Clear Filters',
              onClick: onClear,
            }
          : undefined
      }
    />
  );
}

/**
 * No upcoming showings
 */
export function NoUpcomingEmptyState() {
  return (
    <DealEmptyState
      icon={Calendar}
      title="No upcoming showings"
      description="Schedule showings with interested buyers to see them here."
    />
  );
}

/**
 * All caught up - no stale deals
 */
export function AllCaughtUpEmptyState() {
  return (
    <DealEmptyState
      icon={AlertTriangle}
      title="All caught up!"
      description="No deals need attention right now. Great job staying on top of your pipeline."
    />
  );
}

/**
 * No deals in a specific stage (for Kanban columns)
 */
export function EmptyStageState({ stageName }: { stageName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-2 text-center">
      <p className="text-xs text-muted-foreground">
        No deals in {stageName}
      </p>
    </div>
  );
}
