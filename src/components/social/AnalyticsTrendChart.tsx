import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DataPoint {
  date: string; // e.g., "Jan 1" or "Mon"
  value: number;
}

interface AnalyticsTrendChartProps {
  title: string;
  data: DataPoint[];
  color?: string;
  formatValue?: (value: number) => string;
}

export function AnalyticsTrendChart({
  title,
  data,
  color = 'bg-primary',
  formatValue = (v) => v.toLocaleString(),
}: AnalyticsTrendChartProps) {
  // Calculate max value for scaling
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Simple Bar Chart */}
          <div className="flex items-end justify-between gap-2 h-[200px] pb-6">
            {data.map((point, index) => {
              const heightPercent = (point.value / maxValue) * 100;
              return (
                <div key={index} className="flex flex-col items-center flex-1 gap-2">
                  {/* Bar */}
                  <div className="relative flex-1 w-full flex items-end">
                    <div
                      className={cn(
                        'w-full rounded-t-sm transition-all hover:opacity-80 cursor-pointer relative group',
                        color
                      )}
                      style={{ height: `${heightPercent}%` }}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border shadow-sm">
                        {formatValue(point.value)}
                      </div>
                    </div>
                  </div>

                  {/* Label */}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {point.date}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="text-sm font-medium">
                {formatValue(Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peak</p>
              <p className="text-sm font-medium">
                {formatValue(maxValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-medium">
                {formatValue(data.reduce((sum, d) => sum + d.value, 0))}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
