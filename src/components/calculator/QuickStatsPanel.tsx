/**
 * QuickStatsPanel - Displays key calculation metrics at a glance
 * Shows MAO, cashflows, CoC returns, entry fees
 */

import { TrendingUp, TrendingDown, DollarSign, Percent, Home, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CalculatorOutputs } from '@/types/calculator';
import { formatCurrency, formatPercentage } from '@/lib/calculatorEngine';

interface QuickStatsPanelProps {
  outputs: CalculatorOutputs;
  className?: string;
}

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: 'positive' | 'negative' | 'neutral';
  highlight?: boolean;
  className?: string;
}

function StatCard({ label, value, subValue, icon, trend, highlight, className }: StatCardProps) {
  const trendColor =
    trend === 'positive'
      ? 'text-green-600'
      : trend === 'negative'
      ? 'text-red-600'
      : 'text-muted-foreground';

  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-card transition-all',
        highlight && 'border-primary/50 bg-primary/5',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className={cn('text-xl font-bold', trendColor)}>{value}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground">{subValue}</p>
          )}
        </div>
        {icon && (
          <div className={cn('p-2 rounded-full bg-muted', highlight && 'bg-primary/10')}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function QuickStatsPanel({ outputs, className }: QuickStatsPanelProps) {
  const { quickStats, dealChecklist } = outputs;

  // Determine trends based on values
  const cashflowTrend = quickStats.monthlyCashflow >= 400 ? 'positive' : quickStats.monthlyCashflow < 0 ? 'negative' : 'neutral';
  const wrapTrend = quickStats.wrapCashflow >= 300 ? 'positive' : quickStats.wrapCashflow < 0 ? 'negative' : 'neutral';
  const flipTrend = quickStats.flipProfit >= 30000 ? 'positive' : quickStats.flipProfit < 0 ? 'negative' : 'neutral';
  const entryFeeTrend = quickStats.totalEntryFee <= 25000 ? 'positive' : quickStats.totalEntryFee > 50000 ? 'negative' : 'neutral';
  const cocHoldTrend = quickStats.cashOnCashHold >= 15 ? 'positive' : quickStats.cashOnCashHold < 8 ? 'negative' : 'neutral';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Deal Decision Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quick Stats</h3>
        <Badge
          variant={
            dealChecklist.dealDecision === 'DEAL'
              ? 'default'
              : dealChecklist.dealDecision === 'NEEDS REVIEW'
              ? 'secondary'
              : 'destructive'
          }
          className={cn(
            'text-sm px-3 py-1',
            dealChecklist.dealDecision === 'DEAL' && 'bg-green-600 hover:bg-green-700',
            dealChecklist.dealDecision === 'NEEDS REVIEW' && 'bg-yellow-500 hover:bg-yellow-600 text-black'
          )}
        >
          {dealChecklist.dealDecision}
        </Badge>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* MAO */}
        <StatCard
          label="MAO"
          value={formatCurrency(quickStats.mao)}
          subValue="Max Allowable Offer"
          icon={<Home className="h-4 w-4 text-primary" />}
          highlight
        />

        {/* Monthly Cashflow */}
        <StatCard
          label="Monthly Cashflow"
          value={formatCurrency(quickStats.monthlyCashflow)}
          subValue="Hold Strategy"
          icon={
            quickStats.monthlyCashflow >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )
          }
          trend={cashflowTrend}
        />

        {/* Entry Fee */}
        <StatCard
          label="Entry Fee"
          value={formatCurrency(quickStats.totalEntryFee)}
          subValue="Upfront Costs"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          trend={entryFeeTrend}
        />

        {/* Funding Gap */}
        <StatCard
          label="Funding Gap"
          value={formatCurrency(quickStats.fundingGap)}
          subValue="Cash Needed"
          icon={<ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
          trend={quickStats.fundingGap <= 30000 ? 'positive' : 'negative'}
        />
      </div>

      {/* Strategy Returns */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">
            Strategy Returns
          </h4>
          <div className="grid grid-cols-3 gap-4">
            {/* Hold */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium">HOLD</span>
              </div>
              <p className={cn(
                'text-lg font-bold',
                cocHoldTrend === 'positive' ? 'text-green-600' : cocHoldTrend === 'negative' ? 'text-red-600' : ''
              )}>
                {formatPercentage(quickStats.cashOnCashHold)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(quickStats.monthlyCashflow)}/mo
              </p>
            </div>

            {/* Flip */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-xs font-medium">FLIP</span>
              </div>
              <p className={cn(
                'text-lg font-bold',
                flipTrend === 'positive' ? 'text-green-600' : flipTrend === 'negative' ? 'text-red-600' : ''
              )}>
                {formatPercentage(quickStats.cashOnCashFlip)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(quickStats.flipProfit)} profit
              </p>
            </div>

            {/* Wrap */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs font-medium">WRAP</span>
              </div>
              <p className={cn(
                'text-lg font-bold',
                wrapTrend === 'positive' ? 'text-green-600' : wrapTrend === 'negative' ? 'text-red-600' : ''
              )}>
                {formatPercentage(quickStats.cashOnCashWrap)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(quickStats.wrapCashflow)}/mo
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default QuickStatsPanel;
