/**
 * MatchActivityTimeline - Activity history for a buyer-property match
 *
 * Displays chronological history of activities for a specific match,
 * including stage changes, emails sent, showings, and notes.
 */

import { useState } from 'react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import {
  ArrowRight,
  Mail,
  Calendar,
  CheckCircle,
  MessageSquare,
  FileText,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MatchActivity, MatchActivityType } from '@/types/matching';

// Activity icon mapping
const activityIcons: Record<MatchActivityType, React.ComponentType<{ className?: string }>> = {
  'stage-change': ArrowRight,
  'email-sent': Mail,
  'showing-scheduled': Calendar,
  'showing-completed': CheckCircle,
  'note-added': MessageSquare,
  'offer-submitted': FileText,
  'match-created': Sparkles,
};

// Activity color mapping
const activityColors: Record<MatchActivityType, { bg: string; text: string; icon: string }> = {
  'stage-change': { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-600' },
  'email-sent': { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'text-purple-600' },
  'showing-scheduled': { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'text-amber-600' },
  'showing-completed': { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-600' },
  'note-added': { bg: 'bg-gray-100', text: 'text-gray-700', icon: 'text-gray-600' },
  'offer-submitted': { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'text-orange-600' },
  'match-created': { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: 'text-indigo-600' },
};

// Format date for grouping
const formatDateGroup = (dateStr: string): string => {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

// Format time for display
const formatTime = (dateStr: string): string => {
  const date = parseISO(dateStr);
  return format(date, 'h:mm a');
};

// Group activities by date
const groupByDate = (activities: MatchActivity[]): Record<string, MatchActivity[]> => {
  return activities.reduce(
    (groups, activity) => {
      const dateKey = formatDateGroup(activity.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
      return groups;
    },
    {} as Record<string, MatchActivity[]>
  );
};

interface MatchActivityTimelineProps {
  activities: MatchActivity[];
  maxVisible?: number;
  showDateGroups?: boolean;
  className?: string;
}

export function MatchActivityTimeline({
  activities,
  maxVisible = 5,
  showDateGroups = true,
  className,
}: MatchActivityTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort activities by timestamp (newest first)
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Determine which activities to show
  const visibleActivities = isExpanded
    ? sortedActivities
    : sortedActivities.slice(0, maxVisible);

  const hasMore = sortedActivities.length > maxVisible;

  // Group by date if enabled
  const groupedActivities = showDateGroups ? groupByDate(visibleActivities) : null;

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-6 text-muted-foreground', className)}>
        <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity recorded yet</p>
      </div>
    );
  }

  const renderActivity = (activity: MatchActivity, isLast: boolean) => {
    const Icon = activityIcons[activity.type] || RefreshCw;
    const colors = activityColors[activity.type] || activityColors['stage-change'];

    return (
      <div key={activity.id} className="relative flex gap-3">
        {/* Timeline connector */}
        {!isLast && (
          <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border" />
        )}

        {/* Icon circle */}
        <div
          className={cn(
            'relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0',
            colors.bg
          )}
        >
          <Icon className={cn('h-4 w-4', colors.icon)} />
        </div>

        {/* Content */}
        <div className="flex-1 pb-4">
          <p className={cn('text-sm font-medium', colors.text)}>{activity.details}</p>

          {/* Metadata display */}
          {activity.metadata && (
            <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
              {activity.metadata.fromStage && activity.metadata.toStage && (
                <p>
                  {activity.metadata.fromStage} → {activity.metadata.toStage}
                </p>
              )}
              {activity.metadata.showingDate && (
                <p>Showing: {format(parseISO(activity.metadata.showingDate), 'MMM d, h:mm a')}</p>
              )}
              {activity.metadata.emailSubject && (
                <p>Subject: {activity.metadata.emailSubject}</p>
              )}
              {activity.metadata.offerAmount && (
                <p>Amount: ${activity.metadata.offerAmount.toLocaleString()}</p>
              )}
              {activity.metadata.note && (
                <p className="italic">"{activity.metadata.note}"</p>
              )}
            </div>
          )}

          {/* Time and user */}
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatTime(activity.timestamp)}</span>
            {activity.user && (
              <>
                <span>•</span>
                <span>{activity.user}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {showDateGroups && groupedActivities ? (
        // Grouped by date
        Object.entries(groupedActivities).map(([dateGroup, dateActivities]) => (
          <div key={dateGroup}>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {dateGroup}
            </h4>
            <div className="space-y-0">
              {dateActivities.map((activity, index) =>
                renderActivity(activity, index === dateActivities.length - 1)
              )}
            </div>
          </div>
        ))
      ) : (
        // Flat list
        <div className="space-y-0">
          {visibleActivities.map((activity, index) =>
            renderActivity(activity, index === visibleActivities.length - 1)
          )}
        </div>
      )}

      {/* Show more/less button */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show {sortedActivities.length - maxVisible} More
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export default MatchActivityTimeline;
