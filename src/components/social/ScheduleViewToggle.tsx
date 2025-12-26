import { Calendar, List } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type ViewType = 'month' | 'list';

interface ScheduleViewToggleProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ScheduleViewToggle({ view, onViewChange }: ScheduleViewToggleProps) {
  return (
    <ToggleGroup type="single" value={view} onValueChange={(value) => value && onViewChange(value as ViewType)}>
      <ToggleGroupItem value="month" aria-label="Month view">
        <Calendar className="h-4 w-4 mr-2" />
        Month
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label="List view">
        <List className="h-4 w-4 mr-2" />
        List
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
