/**
 * PriorityInbox - AI-sorted buyer queue
 *
 * Shows the most important buyers to focus on based on:
 * - Hot: Active deals in progress, recent engagement
 * - Warm: Multiple unsent matches waiting
 * - Normal: Fewer pending matches
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Flame,
  Sun,
  User,
  Mail,
  Eye,
  Send,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuyersWithMatches } from '@/services/matchingApi';
import {
  calculateBuyerPriority,
  sortBuyersByPriority,
  type PriorityLevel,
} from '@/lib/priorityScoring';
import type { BuyerWithMatches } from '@/types/matching';

interface PriorityInboxProps {
  onSelectBuyer: (buyerId: string) => void;
  onQuickSend?: (buyerId: string) => void;
  maxItems?: number;
  className?: string;
}

const PRIORITY_CONFIG: Record<
  PriorityLevel,
  {
    icon: React.ElementType;
    label: string;
    dotClass: string;
    bgClass: string;
  }
> = {
  hot: {
    icon: Flame,
    label: 'Hot',
    dotClass: 'bg-red-500 animate-pulse',
    bgClass: 'bg-red-50 border-red-200',
  },
  warm: {
    icon: Sun,
    label: 'Warm',
    dotClass: 'bg-amber-500',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  normal: {
    icon: User,
    label: 'Normal',
    dotClass: 'bg-gray-400',
    bgClass: '',
  },
};

function BuyerRow({
  buyer,
  onSelect,
  onQuickSend,
}: {
  buyer: BuyerWithMatches;
  onSelect: () => void;
  onQuickSend?: () => void;
}) {
  const priority = calculateBuyerPriority(buyer);
  const config = PRIORITY_CONFIG[priority.level];

  // Count unsent matches
  const unsentCount = (buyer.matches || []).filter((m) => !m.stage).length;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50',
        config.bgClass
      )}
    >
      {/* Priority Indicator */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
        <span
          className={cn(
            'absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
            config.dotClass
          )}
        />
      </div>

      {/* Buyer Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">
            {buyer.firstName} {buyer.lastName}
          </p>
          {unsentCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unsentCount} new
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {buyer.email}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{priority.reason}</p>
      </div>

      {/* Actions - larger touch targets on mobile */}
      <div className="flex items-center gap-1 shrink-0">
        {onQuickSend && unsentCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 sm:h-8 sm:w-auto sm:px-2 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
            onClick={(e) => {
              e.stopPropagation();
              onQuickSend();
            }}
          >
            <Send className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 sm:h-8 sm:w-auto sm:px-2 p-0"
          onClick={onSelect}
        >
          <Eye className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">View</span>
        </Button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onViewAll }: { onViewAll?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Inbox className="h-12 w-12 text-muted-foreground/50 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">No priority buyers</p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        All buyers are up to date
      </p>
      {onViewAll && (
        <Button variant="outline" size="sm" onClick={onViewAll}>
          View All Buyers
        </Button>
      )}
    </div>
  );
}

export function PriorityInbox({
  onSelectBuyer,
  onQuickSend,
  maxItems = 10,
  className,
}: PriorityInboxProps) {
  const { data, isLoading, error } = useBuyersWithMatches();

  // Sort and filter buyers by priority
  const prioritizedBuyers = useMemo(() => {
    if (!data?.data) return [];

    const sorted = sortBuyersByPriority(data.data);
    // Filter to only show buyers with some priority (score > 0)
    return sorted.filter((b) => {
      const priority = calculateBuyerPriority(b);
      return priority.score > 0;
    }).slice(0, maxItems);
  }, [data?.data, maxItems]);

  // Count by priority level
  const counts = useMemo(() => {
    const result = { hot: 0, warm: 0, normal: 0 };
    for (const buyer of prioritizedBuyers) {
      const priority = calculateBuyerPriority(buyer);
      result[priority.level]++;
    }
    return result;
  }, [prioritizedBuyers]);

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Inbox className="h-4 w-4 text-purple-600" />
            Priority Inbox
          </CardTitle>
          <div className="flex items-center gap-2">
            {counts.hot > 0 && (
              <Badge variant="outline" className="text-xs bg-red-50 border-red-200 text-red-700">
                <Flame className="h-3 w-3 mr-1" />
                {counts.hot} Hot
              </Badge>
            )}
            {counts.warm > 0 && (
              <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                <Sun className="h-3 w-3 mr-1" />
                {counts.warm} Warm
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Buyers that need your attention, sorted by priority
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <p className="text-sm text-red-500">Failed to load buyers</p>
        ) : prioritizedBuyers.length === 0 ? (
          <EmptyState onViewAll={() => onSelectBuyer('')} />
        ) : (
          <div className="space-y-2">
            {prioritizedBuyers.map((buyer) => (
              <BuyerRow
                key={buyer.contactId || buyer.recordId}
                buyer={buyer}
                onSelect={() => onSelectBuyer(buyer.contactId || buyer.recordId || '')}
                onQuickSend={
                  onQuickSend
                    ? () => onQuickSend(buyer.contactId || buyer.recordId || '')
                    : undefined
                }
              />
            ))}

            {/* View All Link */}
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground mt-2"
              onClick={() => onSelectBuyer('')}
            >
              View All Buyers
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PriorityInbox;
