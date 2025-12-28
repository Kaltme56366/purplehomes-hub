/**
 * MorningBriefing - Personalized daily summary dashboard
 *
 * Shows:
 * - Time-based greeting
 * - Today's priorities (hot leads, stale deals)
 * - Quick pipeline health summary
 * - Dismissable for the current day
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sunrise,
  Sun,
  Moon,
  X,
  Flame,
  Clock,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Mail,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeals, usePipelineStats } from '@/services/dealsApi';
import { calculateWinProbability } from '@/lib/winProbability';
import type { Deal } from '@/types/deals';

interface MorningBriefingProps {
  onViewDeal?: (deal: Deal) => void;
  onFollowUp?: (deal: Deal) => void;
  className?: string;
}

// Storage key for dismissed state
const DISMISS_KEY = 'purplehomes_briefing_dismissed';

function getDismissKey(): string {
  const today = new Date().toISOString().split('T')[0];
  return `${DISMISS_KEY}_${today}`;
}

function isDismissedToday(): boolean {
  try {
    return localStorage.getItem(getDismissKey()) === 'true';
  } catch {
    return false;
  }
}

function dismissForToday(): void {
  try {
    localStorage.setItem(getDismissKey(), 'true');
    // Clean up old dismiss keys
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DISMISS_KEY) && !key.includes(today)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

function getGreeting(): { text: string; icon: React.ElementType } {
  const hour = new Date().getHours();

  if (hour < 12) {
    return { text: 'Good morning', icon: Sunrise };
  } else if (hour < 17) {
    return { text: 'Good afternoon', icon: Sun };
  } else {
    return { text: 'Good evening', icon: Moon };
  }
}

interface PriorityDeal {
  deal: Deal;
  reason: string;
  type: 'hot' | 'stale' | 'closing';
  priority: number;
}

function PriorityItem({
  item,
  onView,
  onFollowUp,
}: {
  item: PriorityDeal;
  onView?: () => void;
  onFollowUp?: () => void;
}) {
  const typeConfig = {
    hot: {
      icon: Flame,
      badgeClass: 'bg-red-100 text-red-700 border-red-200',
      label: 'Hot Lead',
    },
    stale: {
      icon: Clock,
      badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
      label: 'Needs Follow-up',
    },
    closing: {
      icon: TrendingUp,
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      label: 'Closing Soon',
    },
  };

  const config = typeConfig[item.type] || typeConfig.hot;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div
        className={cn(
          'p-2 rounded-lg shrink-0',
          item.type === 'hot' && 'bg-red-100',
          item.type === 'stale' && 'bg-amber-100',
          item.type === 'closing' && 'bg-emerald-100'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4',
            item.type === 'hot' && 'text-red-600',
            item.type === 'stale' && 'text-amber-600',
            item.type === 'closing' && 'text-emerald-600'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">
            {item.deal.buyer.firstName} {item.deal.buyer.lastName}
          </p>
          <Badge variant="outline" className={cn('text-xs', config.badgeClass)}>
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {item.deal.property.address}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {item.type === 'stale' && onFollowUp && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
            onClick={(e) => {
              e.stopPropagation();
              onFollowUp();
            }}
          >
            <Mail className="h-4 w-4 mr-1" />
            Follow Up
          </Button>
        )}
        {onView && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        )}
      </div>
    </div>
  );
}

function HealthIndicator({
  label,
  value,
  isGood,
}: {
  label: string;
  value: number | string;
  isGood: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">{value}</span>
        {isGood ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-500" />
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

export function MorningBriefing({
  onViewDeal,
  onFollowUp,
  className,
}: MorningBriefingProps) {
  const [isDismissed, setIsDismissed] = useState(isDismissedToday);
  const { data: deals, isLoading: loadingDeals } = useDeals();
  const { data: stats, isLoading: loadingStats } = usePipelineStats();

  const isLoading = loadingDeals || loadingStats;

  // Calculate priority deals
  const priorityDeals = useMemo(() => {
    if (!deals) return [];

    const priorities: PriorityDeal[] = [];

    for (const deal of deals) {
      // Skip closed or not interested
      if (deal.status === 'Closed Deal / Won' || deal.status === 'Not Interested') {
        continue;
      }

      const winProb = calculateWinProbability(deal);

      // Hot leads: High probability + recent activity
      if (winProb.probability >= 70 && winProb.trend === 'up') {
        priorities.push({
          deal,
          reason: `${winProb.probability}% win probability, trending up`,
          type: 'hot',
          priority: 100 + winProb.probability,
        });
      }
      // Closing soon: Contracts or Qualified
      else if (deal.status === 'Contracts' || deal.status === 'Qualified') {
        priorities.push({
          deal,
          reason: `${deal.status} - ready to close`,
          type: 'closing',
          priority: 90,
        });
      }
      // Stale deals: Need follow-up
      else if (deal.isStale && deal.daysSinceActivity && deal.daysSinceActivity >= 5) {
        priorities.push({
          deal,
          reason: `No activity in ${deal.daysSinceActivity} days`,
          type: 'stale',
          priority: 50 - deal.daysSinceActivity, // More stale = lower priority
        });
      }
    }

    // Sort by priority (descending) and take top 5
    return priorities
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);
  }, [deals]);

  // Pipeline health indicators
  const healthIndicators = useMemo(() => {
    if (!stats) return [];

    const hotDeals = (stats.byStage?.['Underwriting'] || 0) +
                     (stats.byStage?.['Contracts'] || 0) +
                     (stats.byStage?.['Qualified'] || 0);
    const staleCount = stats.needsAttention || 0;
    const totalActive = stats.totalDeals || 0;

    return [
      {
        label: 'Active Deals',
        value: totalActive,
        isGood: totalActive > 0,
      },
      {
        label: 'Hot Leads',
        value: hotDeals,
        isGood: hotDeals > 0,
      },
      {
        label: 'Needs Follow-up',
        value: staleCount,
        isGood: staleCount <= 3,
      },
    ];
  }, [stats]);

  const handleDismiss = () => {
    dismissForToday();
    setIsDismissed(true);
  };

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 opacity-50" />

      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <GreetingIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                {greeting.text}!
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Here's what needs your attention today
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            aria-label="Dismiss briefing"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative pt-0">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Today's Priorities */}
            {priorityDeals.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Today's Priorities
                </h3>
                <div className="space-y-2">
                  {priorityDeals.map((item) => (
                    <PriorityItem
                      key={item.deal.id}
                      item={item}
                      onView={onViewDeal ? () => onViewDeal(item.deal) : undefined}
                      onFollowUp={
                        onFollowUp && item.type === 'stale'
                          ? () => onFollowUp(item.deal)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {priorityDeals.length === 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-medium text-emerald-800">All caught up!</p>
                  <p className="text-sm text-emerald-600">
                    No urgent items need your attention right now
                  </p>
                </div>
              </div>
            )}

            {/* Pipeline Health */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Pipeline Health
              </h3>
              <div className="rounded-lg border bg-card p-3 divide-y">
                {healthIndicators.map((indicator, i) => (
                  <HealthIndicator key={i} {...indicator} />
                ))}
              </div>
            </div>

            {/* View All Link */}
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => {
                // This would navigate to the pipeline board
                // For now, just dismiss
                handleDismiss();
              }}
            >
              View Full Pipeline
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MorningBriefing;
