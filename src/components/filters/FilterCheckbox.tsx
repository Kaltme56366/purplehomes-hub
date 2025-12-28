/**
 * FilterCheckbox - Reusable checkbox toggle using shadcn/ui Checkbox
 *
 * Props:
 * - label: Display label for the checkbox
 * - checked: Current checked state
 * - onChange: Callback when checked state changes
 */

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface FilterCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function FilterCheckbox({
  label,
  checked,
  onChange,
  className,
}: FilterCheckboxProps) {
  return (
    <label
      className={cn(
        'flex items-center gap-2 cursor-pointer text-sm',
        className
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        className="h-4 w-4"
      />
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
    </label>
  );
}
