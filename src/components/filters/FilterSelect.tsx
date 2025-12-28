/**
 * FilterSelect - Reusable dropdown filter using shadcn/ui Select
 *
 * Props:
 * - label: Display label for the filter
 * - value: Current selected value
 * - options: Array of { value, label } options
 * - onChange: Callback when value changes
 * - placeholder: Placeholder text when no value selected
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label?: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className,
}: FilterSelectProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {label}:
        </span>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
