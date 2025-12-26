/**
 * PipelineHealthChart - Horizontal bar chart showing deals by stage
 *
 * Displays the distribution of deals across pipeline stages
 * with color-coded bars.
 */

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MATCH_DEAL_STAGES, STAGE_CONFIGS } from '@/types/associations';
import type { PipelineStats } from '@/types/deals';
import { cn } from '@/lib/utils';

// Color mapping for stage bars
const STAGE_COLORS: Record<string, string> = {
  'Sent to Buyer': 'bg-blue-500',
  'Buyer Responded': 'bg-cyan-500',
  'Showing Scheduled': 'bg-amber-500',
  'Property Viewed': 'bg-purple-500',
  'Offer Made': 'bg-orange-500',
  'Under Contract': 'bg-indigo-500',
  'Closed Deal / Won': 'bg-emerald-500',
  'Not Interested': 'bg-red-400',
};

interface PipelineHealthChartProps {
  stats?: PipelineStats;
  isLoading?: boolean;
}

export function PipelineHealthChart({ stats, isLoading }: PipelineHealthChartProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 flex-1" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Get max count for scaling bars
  const stageCounts = stats?.byStage || {};
  const maxCount = Math.max(...Object.values(stageCounts), 1);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Pipeline Health</h3>
      <div className="space-y-3">
        {MATCH_DEAL_STAGES.map((stage) => {
          const count = stageCounts[stage] || 0;
          const percentage = (count / maxCount) * 100;
          const config = STAGE_CONFIGS.find((c) => c.id === stage);

          return (
            <div key={stage} className="flex items-center gap-4">
              <div
                className="w-28 text-sm text-muted-foreground truncate flex-shrink-0"
                title={stage}
              >
                {config?.shortLabel || stage}
              </div>
              <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500 ease-out',
                    STAGE_COLORS[stage] || 'bg-gray-400'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-8 text-sm font-medium text-right flex-shrink-0">
                {count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional: Show total at bottom */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Total Active Deals</span>
        <span className="font-semibold">
          {stats?.totalDeals || 0}
        </span>
      </div>
    </Card>
  );
}
