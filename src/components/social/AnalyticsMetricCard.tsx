import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsMetricCardProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  value: number;
  change?: number; // Percentage change from previous period
  formatValue?: (value: number) => string;
  subtitle?: string;
}

export function AnalyticsMetricCard({
  icon: Icon,
  iconColor = 'text-primary',
  title,
  value,
  change,
  formatValue = (v) => v.toLocaleString(),
  subtitle,
}: AnalyticsMetricCardProps) {
  const hasChange = change !== undefined;
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10', iconColor)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{title}</p>
                <p className="text-2xl font-bold">{formatValue(value)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasChange && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    isPositive ? 'text-green-500' : 'text-red-500'
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(change)}%</span>
                </div>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
