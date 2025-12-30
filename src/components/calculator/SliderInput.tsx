/**
 * SliderInput - Reusable slider + number input combo
 * Used throughout the calculator for adjusting values
 */

import { useState, useEffect, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { SliderFieldConfig } from '@/types/calculator';

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  config?: SliderFieldConfig;
  min?: number;
  max?: number;
  step?: number;
  format?: 'currency' | 'percentage' | 'number' | 'months' | 'years';
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Format a number based on the specified format type
 */
function formatValue(value: number, format?: string): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
    case 'months':
      return `${value} mo`;
    case 'years':
      return `${value} yr${value !== 1 ? 's' : ''}`;
    default:
      return value.toLocaleString();
  }
}

/**
 * Parse a formatted string back to a number
 */
function parseValue(value: string): number {
  const cleaned = value.replace(/[$,%\s]/g, '').replace(/mo|yr|yrs/gi, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function SliderInput({
  label,
  value,
  onChange,
  config,
  min: propMin,
  max: propMax,
  step: propStep,
  format: propFormat,
  prefix,
  suffix,
  icon,
  description,
  disabled = false,
  className,
}: SliderInputProps) {
  // Use config values if provided, otherwise use props
  const min = config?.min ?? propMin ?? 0;
  const max = config?.max ?? propMax ?? 100;
  const step = config?.step ?? propStep ?? 1;
  const format = config?.format ?? propFormat ?? 'number';
  const displayPrefix = config?.prefix ?? prefix ?? '';
  const displaySuffix = config?.suffix ?? suffix ?? '';

  // Local state for input field (allows typing)
  const [inputValue, setInputValue] = useState(formatValue(value, format));
  const [isFocused, setIsFocused] = useState(false);

  // Update input value when external value changes (and not focused)
  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatValue(value, format));
    }
  }, [value, format, isFocused]);

  // Handle slider change
  const handleSliderChange = useCallback(
    (newValue: number[]) => {
      const val = newValue[0];
      onChange(val);
      setInputValue(formatValue(val, format));
    },
    [onChange, format]
  );

  // Handle input change (while typing)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Handle input blur (commit value)
  const handleInputBlur = () => {
    setIsFocused(false);
    const parsed = parseValue(inputValue);
    const clamped = Math.max(min, Math.min(max, parsed));
    // Round to step
    const rounded = Math.round(clamped / step) * step;
    onChange(rounded);
    setInputValue(formatValue(rounded, format));
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsFocused(true);
    // Show raw number when focused for easier editing
    setInputValue(value.toString());
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {label}
        </Label>
        <div className="flex items-center gap-1">
          {displayPrefix && (
            <span className="text-sm text-muted-foreground">{displayPrefix}</span>
          )}
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-28 h-8 text-right text-sm font-medium"
          />
          {displaySuffix && (
            <span className="text-sm text-muted-foreground">{displaySuffix}</span>
          )}
        </div>
      </div>

      {/* Slider */}
      <Slider
        value={[value]}
        onValueChange={handleSliderChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(
          'w-full',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />

      {/* Range labels and description */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatValue(min, format)}</span>
        {description && <span className="text-center">{description}</span>}
        <span>{formatValue(max, format)}</span>
      </div>
    </div>
  );
}

/**
 * Compact version of SliderInput for tighter layouts
 */
export function SliderInputCompact({
  label,
  value,
  onChange,
  config,
  min: propMin,
  max: propMax,
  step: propStep,
  format: propFormat,
  disabled = false,
  className,
}: Omit<SliderInputProps, 'icon' | 'description' | 'prefix' | 'suffix'>) {
  const min = config?.min ?? propMin ?? 0;
  const max = config?.max ?? propMax ?? 100;
  const step = config?.step ?? propStep ?? 1;
  const format = config?.format ?? propFormat ?? 'number';

  const [inputValue, setInputValue] = useState(formatValue(value, format));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatValue(value, format));
    }
  }, [value, format, isFocused]);

  const handleSliderChange = useCallback(
    (newValue: number[]) => {
      const val = newValue[0];
      onChange(val);
      setInputValue(formatValue(val, format));
    },
    [onChange, format]
  );

  const handleInputBlur = () => {
    setIsFocused(false);
    const parsed = parseValue(inputValue);
    const clamped = Math.max(min, Math.min(max, parsed));
    const rounded = Math.round(clamped / step) * step;
    onChange(rounded);
    setInputValue(formatValue(rounded, format));
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium truncate">{label}</Label>
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleInputBlur}
          onFocus={() => {
            setIsFocused(true);
            setInputValue(value.toString());
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleInputBlur();
              (e.target as HTMLInputElement).blur();
            }
          }}
          disabled={disabled}
          className="w-24 h-7 text-right text-xs"
        />
      </div>
      <Slider
        value={[value]}
        onValueChange={handleSliderChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );
}

export default SliderInput;
