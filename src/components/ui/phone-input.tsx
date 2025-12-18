/**
 * International Phone Input Component
 *
 * Provides a phone number input with country picker
 * Uses react-phone-number-input for validation and formatting
 */

import { forwardRef } from 'react';
import PhoneInputWithCountry from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';

export interface PhoneInputProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  defaultCountry?: string;
  className?: string;
}

/**
 * Phone Input with Country Picker
 *
 * Usage:
 * ```tsx
 * const [phone, setPhone] = useState('');
 *
 * <PhoneInput
 *   value={phone}
 *   onChange={setPhone}
 *   defaultCountry="US"
 *   placeholder="Enter phone number"
 * />
 * ```
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({
    value,
    onChange,
    placeholder = 'Enter phone number',
    disabled = false,
    required = false,
    defaultCountry = 'US',
    className,
    ...props
  }, ref) => {
    return (
      <PhoneInputWithCountry
        value={value}
        onChange={onChange}
        defaultCountry={defaultCountry as any}
        placeholder={placeholder}
        disabled={disabled}
        international
        countryCallingCodeEditable={false}
        className={cn(
          'phone-input-wrapper',
          className
        )}
        numberInputProps={{
          className: cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50'
          ),
          required,
        }}
        style={{
          // Override default styles to match shadcn/ui
          '--PhoneInputCountryFlag-height': '1em',
          '--PhoneInput-color--focus': 'hsl(var(--ring))',
        } as any}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
