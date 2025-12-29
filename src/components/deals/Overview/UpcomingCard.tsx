/**
 * UpcomingCard - List of upcoming showings
 *
 * Shows deals in "Showing Scheduled" stage, sorted by date.
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ArrowRight } from 'lucide-react';
import { BuyerAvatar } from '../Shared/BuyerAvatar';
import { BuyerName } from '../Shared/BuyerName';
import { NoUpcomingEmptyState } from '../Shared/DealEmptyState';
import type { Deal } from '@/types/deals';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

interface UpcomingCardProps {
  deals: Deal[];
  isLoading?: boolean;
  onViewCalendar?: () => void;
  onViewDeal?: (deal: Deal) => void;
}

/**
 * Format date for display
 * Shows "Today", "Tomorrow", or the date
 */
function formatUpcomingDate(dateStr?: string): string {
  if (!dateStr) return 'TBD';

  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  } catch {
    return 'TBD';
  }
}

export function UpcomingCard({
  deals,
  isLoading,
  onViewCalendar,
  onViewDeal,
}: UpcomingCardProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-500" />
          Upcoming Showings
        </h3>
        {deals.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {deals.length} scheduled
          </span>
        )}
      </div>

      {deals.length === 0 ? (
        <NoUpcomingEmptyState />
      ) : (
        <div className="space-y-2">
          {deals.map((deal) => {
            // Try to get showing date from activities metadata
            const showingActivity = deal.activities?.find(
              (a) => a.type === 'showing-scheduled'
            );
            const showingDate = showingActivity?.metadata?.showingDate;

            return (
              <div
                key={deal.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => onViewDeal?.(deal)}
              >
                <BuyerAvatar
                  firstName={deal.buyer?.firstName}
                  lastName={deal.buyer?.lastName}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {deal.property?.address || 'Unknown Property'}
                  </p>
                  <BuyerName
                    firstName={deal.buyer?.firstName}
                    lastName={deal.buyer?.lastName}
                    qualified={deal.buyer?.qualified}
                    className="text-xs text-muted-foreground truncate"
                  />
                </div>
                <div className="text-sm font-medium text-purple-600 flex-shrink-0">
                  {formatUpcomingDate(showingDate)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onViewCalendar && (
        <Button variant="ghost" className="w-full mt-4" onClick={onViewCalendar}>
          View Calendar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </Card>
  );
}
