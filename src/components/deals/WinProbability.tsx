/**
 * WinProbability - Display component for deal win probability
 *
 * Shows probability as a percentage with color coding and trend indicator.
 * Optionally shows the factors that contribute to the probability.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  calculateWinProbability,
  type WinProbabilityResult,
  type ProbabilityFactor,
} from '@/lib/winProbability';
import type { Deal } from '@/types/deals';

interface WinProbabilityProps {
  deal: Deal;
  size?: 'sm' | 'md' | 'lg';
  showFactors?: boolean;
  className?: string;
}

/**
 * Compact badge for DealCard
 */
export function WinProbabilityBadge({
  deal,
  className,
}: {
  deal: Deal;
  className?: string;
}) {
  const result = calculateWinProbability(deal);

  const TrendIcon =
    result.trend === 'up'
      ? TrendingUp
      : result.trend === 'down'
      ? TrendingDown
      : Minus;

  const colorClasses = {
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    red: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-medium gap-1',
              colorClasses[result.color],
              className
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {result.probability}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Win Probability: {result.label}</p>
          <p className="text-xs text-muted-foreground">
            {result.trend === 'up' && 'Trending up'}
            {result.trend === 'down' && 'Needs attention'}
            {result.trend === 'stable' && 'Stable'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Full probability display with optional factors breakdown
 */
export function WinProbability({
  deal,
  size = 'md',
  showFactors = false,
  className,
}: WinProbabilityProps) {
  const [isOpen, setIsOpen] = useState(false);
  const result = calculateWinProbability(deal);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const progressHeight = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const progressColor = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  const TrendIcon =
    result.trend === 'up'
      ? TrendingUp
      : result.trend === 'down'
      ? TrendingDown
      : Minus;

  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-red-600',
    stable: 'text-muted-foreground',
  };

  const content = (
    <div className={cn('space-y-2', sizeClasses[size], className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-medium">Win Probability</span>
        <div className="flex items-center gap-2">
          <span className={cn('font-bold', sizeClasses[size])}>
            {result.probability}%
          </span>
          <TrendIcon className={cn('h-4 w-4', trendColors[result.trend])} />
        </div>
      </div>

      {/* Progress Bar */}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', progressHeight[size])}>
        <div
          className={cn('h-full transition-all duration-500', progressColor[result.color])}
          style={{ width: `${result.probability}%` }}
        />
      </div>

      {/* Label */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {result.label}
          {result.trend === 'up' && ' - Trending up'}
          {result.trend === 'down' && ' - Needs attention'}
        </span>
      </div>
    </div>
  );

  if (!showFactors) {
    return content;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between">
          {content}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform ml-2',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <FactorsBreakdown factors={result.factors} className="mt-4" />
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Factors breakdown component
 */
function FactorsBreakdown({
  factors,
  className,
}: {
  factors: ProbabilityFactor[];
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <h4 className="text-sm font-medium text-muted-foreground">
        Contributing Factors
      </h4>
      <div className="space-y-2">
        {factors.map((factor, index) => (
          <div
            key={index}
            className="flex items-start gap-3 text-sm p-2 rounded-lg bg-muted/30"
          >
            <div
              className={cn(
                'w-2 h-2 rounded-full mt-1.5 shrink-0',
                factor.impact === 'positive' && 'bg-emerald-500',
                factor.impact === 'negative' && 'bg-red-500',
                factor.impact === 'neutral' && 'bg-amber-500'
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{factor.label}</span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    factor.impact === 'positive' && 'text-emerald-600',
                    factor.impact === 'negative' && 'text-red-600',
                    factor.impact === 'neutral' && 'text-amber-600'
                  )}
                >
                  {factor.impact === 'positive' && '+'}
                  {factor.weight} pts
                </span>
              </div>
              {factor.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {factor.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WinProbability;
