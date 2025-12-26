/**
 * ActivityFeed - Global activity feed component
 *
 * Displays recent activities across all deals with icons and relative timestamps.
 */

import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  ArrowRight,
  Mail,
  Calendar,
  CheckCircle,
  MessageSquare,
  FileText,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useRecentActivities, type EnrichedActivity } from '@/services/activityApi';
import type { MatchActivity } from '@/types/matching';

interface ActivityFeedProps {
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
}

type ActivityType = MatchActivity['type'];

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  'stage-change': ArrowRight,
  'email-sent': Mail,
  'showing-scheduled': Calendar,
  'showing-completed': CheckCircle,
  'note-added': MessageSquare,
  'offer-submitted': FileText,
  'match-created': Sparkles,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  'stage-change': 'bg-blue-100 text-blue-600',
  'email-sent': 'bg-purple-100 text-purple-600',
  'showing-scheduled': 'bg-amber-100 text-amber-600',
  'showing-completed': 'bg-emerald-100 text-emerald-600',
  'note-added': 'bg-gray-100 text-gray-600',
  'offer-submitted': 'bg-orange-100 text-orange-600',
  'match-created': 'bg-indigo-100 text-indigo-600',
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  'stage-change': 'Stage Updated',
  'email-sent': 'Email Sent',
  'showing-scheduled': 'Showing Scheduled',
  'showing-completed': 'Showing Completed',
  'note-added': 'Note Added',
  'offer-submitted': 'Offer Submitted',
  'match-created': 'Match Created',
};

function formatActivityDescription(activity: EnrichedActivity): string {
  const { buyerName, propertyAddress, type, metadata, details } = activity;

  switch (type) {
    case 'stage-change':
      if (metadata?.fromStage && metadata?.toStage) {
        return `${buyerName} → ${propertyAddress} moved to ${metadata.toStage}`;
      }
      return details || `${buyerName} stage updated`;

    case 'email-sent':
      return `Sent properties to ${buyerName}`;

    case 'showing-scheduled':
      return `Showing scheduled: ${buyerName} → ${propertyAddress}`;

    case 'showing-completed':
      return `${buyerName} viewed ${propertyAddress}`;

    case 'note-added':
      return `Note added on ${buyerName}'s deal`;

    case 'offer-submitted':
      const amount = metadata?.offerAmount
        ? ` ($${metadata.offerAmount.toLocaleString()})`
        : '';
      return `${buyerName} submitted offer${amount}`;

    case 'match-created':
      return `New match: ${buyerName} ↔ ${propertyAddress}`;

    default:
      return details || 'Activity recorded';
  }
}

function ActivityItem({ activity }: { activity: EnrichedActivity }) {
  const Icon = ACTIVITY_ICONS[activity.type] || Activity;
  const colorClass = ACTIVITY_COLORS[activity.type] || 'bg-gray-100 text-gray-600';
  const isHot = activity.type === 'stage-change' || activity.type === 'offer-submitted';

  return (
    <div className="flex items-start gap-3 py-3 px-1 hover:bg-muted/30 rounded-lg transition-colors">
      <div className={cn('p-2 rounded-lg shrink-0', colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          {formatActivityDescription(activity)}
          {isHot && <span className="ml-1">🔥</span>}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Activity className="h-10 w-10 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">No recent activity</p>
      <p className="text-xs text-muted-foreground mt-1">
        Activities will appear as you work with deals
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function ActivityFeed({
  maxItems = 15,
  showHeader = true,
  className,
}: ActivityFeedProps) {
  const { data: activities, isLoading, error } = useRecentActivities(maxItems);

  return (
    <Card className={cn('', className)}>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(!showHeader && 'pt-4')}>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <p className="text-sm text-red-500">Failed to load activities</p>
        ) : !activities || activities.length === 0 ? (
          <EmptyState />
        ) : (
          <ScrollArea className="max-h-80">
            <div className="space-y-1 divide-y divide-border/50">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact inline version for sidebars
 */
export function ActivityFeedCompact({
  maxItems = 5,
  className,
}: {
  maxItems?: number;
  className?: string;
}) {
  const { data: activities, isLoading } = useRecentActivities(maxItems);

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICONS[activity.type] || Activity;
        return (
          <div key={activity.id} className="flex items-center gap-2 text-xs">
            <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate flex-1">
              {formatActivityDescription(activity)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default ActivityFeed;
