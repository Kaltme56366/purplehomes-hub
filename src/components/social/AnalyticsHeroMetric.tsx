import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Facebook, Instagram, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';

type Platform = 'facebook' | 'instagram' | 'linkedin';

interface PlatformBreakdown {
  platform: Platform;
  value: number;
  percentage: number;
}

interface AnalyticsHeroMetricProps {
  title: string;
  value: number;
  change: number; // Percentage change from previous period
  changeLabel?: string; // e.g., "vs last period"
  platformBreakdown?: PlatformBreakdown[];
  formatValue?: (value: number) => string;
}

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
};

const platformColors = {
  facebook: 'text-blue-500',
  instagram: 'text-pink-500',
  linkedin: 'text-blue-700',
};

export function AnalyticsHeroMetric({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  platformBreakdown,
  formatValue = (v) => v.toLocaleString(),
}: AnalyticsHeroMetricProps) {
  const isPositive = change >= 0;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Title */}
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </h3>

          {/* Value */}
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold">{formatValue(value)}</span>
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-md',
                isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{Math.abs(change)}%</span>
            </div>
          </div>

          {/* Change Label */}
          <p className="text-xs text-muted-foreground">{changeLabel}</p>

          {/* Platform Breakdown */}
          {platformBreakdown && platformBreakdown.length > 0 && (
            <div className="pt-4 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">By Platform</p>
              <div className="grid grid-cols-3 gap-3">
                {platformBreakdown.map(({ platform, value: platformValue, percentage }) => {
                  const Icon = platformIcons[platform];
                  const colorClass = platformColors[platform];
                  return (
                    <div key={platform} className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn('h-4 w-4', colorClass)} />
                        <span className="text-xs text-muted-foreground capitalize">
                          {platform}
                        </span>
                      </div>
                      <p className="text-lg font-bold">{formatValue(platformValue)}</p>
                      <p className="text-xs text-muted-foreground">{percentage}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
