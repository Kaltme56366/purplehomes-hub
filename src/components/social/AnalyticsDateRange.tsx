import { CalendarIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DateRangePreset = 'last7' | 'last30' | 'last90' | 'custom';

interface AnalyticsDateRangeProps {
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  startDate?: string;
  endDate?: string;
  onDateChange?: (start: string, end: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function AnalyticsDateRange({
  preset,
  onPresetChange,
  startDate,
  endDate,
  onDateChange,
  onRefresh,
  isLoading = false,
}: AnalyticsDateRangeProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={preset} onValueChange={(value) => onPresetChange(value as DateRangePreset)}>
        <SelectTrigger className="w-[160px]">
          <CalendarIcon className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="last7">Last 7 Days</SelectItem>
          <SelectItem value="last30">Last 30 Days</SelectItem>
          <SelectItem value="last90">Last 90 Days</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {preset === 'custom' && onDateChange && (
        <>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onDateChange(e.target.value, endDate || '')}
            className="w-[150px]"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onDateChange(startDate || '', e.target.value)}
            className="w-[150px]"
          />
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
        className="ml-auto"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}
