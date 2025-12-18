# International Phone Input Implementation

This document describes the international phone input component with country picker.

---

## Changes Made

### 1. Fixed listing_message Custom Field

**File**: [api/ghl/index.ts](api/ghl/index.ts:829)

**Issue**: The `listing_message` field was being saved to the wrong custom field key (`notes` instead of `contact.listing_message`).

**Fix**:
```typescript
// BEFORE (Line 829):
customFields.push({ key: 'notes', field_value: body.listing_message || body.message });

// AFTER (Line 829):
customFields.push({ key: 'contact.listing_message', field_value: body.listing_message || body.message });
```

**Result**: The listing_message now correctly appears in HighLevel workflows as `{{contact.listing_message}}`.

---

### 2. Added International Phone Input Component

**Library**: `react-phone-number-input` (installed)

**Files Created**:
- [src/components/ui/phone-input.tsx](src/components/ui/phone-input.tsx) - Phone input component
- [src/styles/phone-input.css](src/styles/phone-input.css) - Custom styles

**Files Modified**:
- [src/index.css](src/index.css) - Added phone-input.css import
- [src/pages/PublicListings.tsx](src/pages/PublicListings.tsx) - Updated offer form
- [src/pages/Contacts.tsx](src/pages/Contacts.tsx) - Updated contact creation form

---

## Features

### Country Picker
- 🌍 **Automatic country detection**: Defaults to US but supports all countries
- 🎨 **Country flags**: Visual flags for each country
- 📱 **Country codes**: Automatic country code prefix (+1, +44, etc.)
- ✅ **Validation**: Built-in phone number validation per country
- 🔒 **Format enforcement**: Numbers formatted according to country standards

### UI Integration
- Matches shadcn/ui design system
- Supports light/dark themes
- Responsive on mobile and desktop
- Consistent with existing input components

---

## Usage

### Basic Usage

```tsx
import { PhoneInput } from '@/components/ui/phone-input';

function MyForm() {
  const [phone, setPhone] = useState('');

  return (
    <PhoneInput
      value={phone}
      onChange={setPhone}
      defaultCountry="US"
      placeholder="Enter phone number"
      required
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Current phone number value |
| `onChange` | `(value: string \| undefined) => void` | - | Called when value changes |
| `placeholder` | `string` | `"Enter phone number"` | Input placeholder |
| `defaultCountry` | `string` | `"US"` | Default country code (ISO 2-letter) |
| `required` | `boolean` | `false` | Mark as required field |
| `disabled` | `boolean` | `false` | Disable the input |
| `className` | `string` | - | Additional CSS classes |

### Supported Countries

All countries are supported via the `react-phone-number-input` library:
- **US** - United States (+1)
- **CA** - Canada (+1)
- **GB** - United Kingdom (+44)
- **AU** - Australia (+61)
- **PH** - Philippines (+63)
- **IN** - India (+91)
- **MX** - Mexico (+52)
- ... and 200+ more countries

---

## Example Outputs

### US Number
```
Input: (555) 123-4567
Output: +15551234567
```

### Philippines Number
```
Input: 0915 123 4567
Output: +639151234567
```

### UK Number
```
Input: 020 7946 0958
Output: +442079460958
```

---

## Validation

The component provides automatic validation:

```tsx
import { isPossiblePhoneNumber, isValidPhoneNumber } from 'react-phone-number-input';

// Check if phone is valid
const isValid = isValidPhoneNumber(phone); // true/false

// Check if phone is possible (lenient check)
const isPossible = isPossiblePhoneNumber(phone); // true/false
```

### Form Validation Example

```tsx
function OfferForm() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isValidPhoneNumber(phone)) {
      setError('Please enter a valid phone number');
      return;
    }

    // Submit form...
  };

  return (
    <form onSubmit={handleSubmit}>
      <PhoneInput
        value={phone}
        onChange={setPhone}
        required
      />
      {error && <span className="text-red-500 text-sm">{error}</span>}
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

---

## Styling

The component uses CSS custom properties for theming:

```css
/* Override default styles */
.phone-input-wrapper {
  /* Matches shadcn/ui inputs */
}

.PhoneInputCountry {
  /* Country selector button */
  border: 1px solid hsl(var(--input));
  background: hsl(var(--background));
}

.PhoneInputCountrySelect {
  /* Dropdown menu */
  background: hsl(var(--popover));
  border: 1px solid hsl(var(--border));
}
```

---

## Accessibility

The component is fully accessible:
- ✅ **Keyboard navigation**: Tab through country selector and input
- ✅ **Screen readers**: Proper ARIA labels
- ✅ **Focus management**: Clear focus indicators
- ✅ **Error states**: Announces validation errors

---

## Testing

### Test Scenarios

1. **US Number Entry**
   - Select US flag
   - Enter: 555-123-4567
   - Output: +15551234567

2. **International Number Entry**
   - Click country selector
   - Search for "Philippines"
   - Select Philippines (+63)
   - Enter: 0915 123 4567
   - Output: +639151234567

3. **Invalid Number**
   - Enter: 123
   - Validation should fail (too short)

4. **Form Submission**
   - Fill out all fields
   - Submit form
   - Check HighLevel contact has correct phone format

---

## Browser Support

Supports all modern browsers:
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Migration Guide

### Updating Existing Forms

**Before**:
```tsx
<Input
  type="tel"
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
  placeholder="(555) 123-4567"
/>
```

**After**:
```tsx
<PhoneInput
  value={phone}
  onChange={setPhone}
  defaultCountry="US"
  placeholder="Enter phone number"
/>
```

### Data Format Changes

**Before**: US-only format
```
(555) 123-4567
```

**After**: International E.164 format
```
+15551234567
```

This format is preferred for:
- ✅ Database storage
- ✅ API communication
- ✅ SMS/calling services
- ✅ International consistency

---

## Troubleshooting

### Issue: Country flags not showing

**Cause**: CDN blocked or slow network

**Fix**: Use local flag images (optional)
```tsx
import flags from 'react-phone-number-input/flags';

<PhoneInput flags={flags} />
```

### Issue: Validation not working

**Cause**: Missing country metadata

**Fix**: Ensure `react-phone-number-input` is properly installed:
```bash
npm install react-phone-number-input
```

### Issue: Styling looks wrong

**Cause**: CSS not imported

**Fix**: Ensure [src/index.css](src/index.css) includes:
```css
@import './styles/phone-input.css';
```

---

## Related Files

| File | Purpose |
|------|---------|
| [src/components/ui/phone-input.tsx](src/components/ui/phone-input.tsx) | Phone input component |
| [src/styles/phone-input.css](src/styles/phone-input.css) | Custom styles |
| [src/index.css](src/index.css) | CSS imports |
| [src/pages/PublicListings.tsx](src/pages/PublicListings.tsx:781-788) | Offer form implementation |
| [src/pages/Contacts.tsx](src/pages/Contacts.tsx:942-947) | Contact form implementation |
| [api/ghl/index.ts](api/ghl/index.ts:829) | Fixed listing_message field |

---

**Last Updated**: 2025-12-18
**Status**: Implemented and Ready for Testing
**Breaking Changes**: Phone numbers now stored in E.164 format (+15551234567)
