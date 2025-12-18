# Geocoding Integration for Real Addresses

## Overview

This document explains how the Purple Homes system handles real addresses from Airtable and converts them to coordinates for Mapbox integration and proximity-based discovery.

---

## How It Works

### Current System (Mock Data)
Currently using ZIP code-based distance calculation:
- Properties have ZIP codes in the `city` field (e.g., "Phoenix, AZ 85001")
- Distance calculated using ZIP code coordinate lookups
- Works for testing and demonstration

### Future System (Real Airtable Data)
When you sync real properties from Airtable, the system will:
1. **Receive properties** with real street addresses
2. **Geocode addresses** to get precise latitude/longitude coordinates
3. **Store coordinates** in the `lat` and `lng` fields
4. **Calculate distances** using the more accurate coordinate-based method

---

## System Architecture

```
┌─────────────────┐
│ Airtable        │
│ Properties      │
│ - Address       │
│ - City          │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Sync Process                │
│ 1. Fetch property from      │
│    Airtable                 │
│ 2. Geocode address →        │
│    lat/lng                  │
│ 3. Save to database         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Property Object             │
│ {                           │
│   address: "123 Main St"    │
│   city: "Phoenix, AZ 85001" │
│   lat: 33.4484              │
│   lng: -112.0740            │
│   ...                       │
│ }                           │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Distance Calculation        │
│ calculatePropertyDistance() │
│ - Uses lat/lng if available │
│ - Falls back to ZIP         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Mapbox Display              │
│ - Show on map               │
│ - Proximity badges          │
│ - Distance sorting          │
└─────────────────────────────┘
```

---

## Implementation Guide

### 1. Set Up Mapbox Access Token

Add to your `.env` file:

```bash
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

Get a free token at: https://account.mapbox.com/

### 2. Geocoding During Airtable Sync

When syncing properties from Airtable, geocode each property:

```typescript
import { geocodeProperty } from '@/lib/geocoding';
import { Property } from '@/types';

// Example: During Airtable sync
async function syncPropertyFromAirtable(airtableRecord: any): Promise<Property> {
  const property = {
    id: airtableRecord.id,
    propertyCode: airtableRecord.fields['Property Code'],
    address: airtableRecord.fields['Address'],
    city: airtableRecord.fields['City'], // e.g., "Phoenix, AZ 85001"
    price: airtableRecord.fields['Price'],
    // ... other fields
  };

  // Geocode the property (adds lat/lng)
  const propertyWithCoords = await geocodeProperty(property);

  return propertyWithCoords;
}
```

### 3. Batch Geocoding (Recommended)

For syncing multiple properties:

```typescript
import { batchGeocodeAddresses } from '@/lib/geocoding';

async function syncAllProperties(airtableRecords: any[]) {
  // Extract all addresses
  const addresses = airtableRecords.map(record =>
    `${record.fields['Address']}, ${record.fields['City']}`
  );

  // Batch geocode (rate-limited automatically)
  const coordinates = await batchGeocodeAddresses(addresses);

  // Combine results
  const properties = airtableRecords.map((record, index) => ({
    id: record.id,
    propertyCode: record.fields['Property Code'],
    address: record.fields['Address'],
    city: record.fields['City'],
    lat: coordinates[index]?.latitude,
    lng: coordinates[index]?.longitude,
    // ... other fields
  }));

  return properties;
}
```

### 4. Fallback Strategy

If geocoding fails, the system falls back to ZIP code coordinates:

```typescript
import { geocodeProperty } from '@/lib/geocoding';
import { fallbackToZipCoordinates } from '@/lib/geocoding';
import { ZIP_COORDINATES } from '@/lib/proximityCalculator';

async function syncPropertyWithFallback(airtableRecord: any): Promise<Property> {
  const property = { /* ... property data ... */ };

  // Try geocoding
  const propertyWithCoords = await geocodeProperty(property);

  // If geocoding failed, fall back to ZIP coordinates
  if (!propertyWithCoords.lat || !propertyWithCoords.lng) {
    const zipFallback = fallbackToZipCoordinates(property, ZIP_COORDINATES);
    return { ...property, ...zipFallback };
  }

  return propertyWithCoords;
}
```

---

## Distance Calculation Flow

The `calculatePropertyDistance()` function automatically handles both types:

```typescript
import { calculatePropertyDistance } from '@/lib/proximityCalculator';

const property = {
  address: "123 Main St",
  city: "Phoenix, AZ 85001",
  lat: 33.4484,    // ← From geocoding
  lng: -112.0740   // ← From geocoding
};

const userZip = "85251"; // User searching from Scottsdale

// Calculates distance using lat/lng (more accurate!)
const distance = calculatePropertyDistance(property, userZip);
// Returns: 12.5 miles
```

**Automatic Fallback:**
```typescript
const propertyNoCoords = {
  address: "123 Main St",
  city: "Phoenix, AZ 85001"
  // No lat/lng - will use ZIP code instead
};

// Falls back to ZIP-to-ZIP calculation
const distance = calculatePropertyDistance(propertyNoCoords, "85251");
// Returns: ~12 miles (less accurate)
```

---

## Mapbox Integration

### Display Property on Map

```typescript
import { PropertyMap } from '@/components/listings/PropertyMap';

function PropertyPage({ property }: { property: Property }) {
  return (
    <div>
      {property.lat && property.lng && (
        <PropertyMap
          latitude={property.lat}
          longitude={property.lng}
          zoom={15}
          markers={[
            {
              latitude: property.lat,
              longitude: property.lng,
              label: property.address
            }
          ]}
        />
      )}
    </div>
  );
}
```

### Multiple Properties on Map

```typescript
function PropertiesMapView({ properties, userZip }: Props) {
  const markers = properties
    .filter(p => p.lat && p.lng)
    .map(p => ({
      latitude: p.lat!,
      longitude: p.lng!,
      label: p.address,
      color: getProximityTierColor(
        calculatePropertyDistance(p, userZip) || 0
      )
    }));

  return <PropertyMap markers={markers} />;
}
```

---

## Testing the System

### 1. Test with Mock Data (Current)

Mock properties already have `lat` and `lng` coordinates:

```typescript
// From mockData.ts
{
  id: 'prop-exact-1',
  address: '100 Downtown Circle',
  city: 'Phoenix, AZ 85001',
  lat: 33.4484,    // ← Already geocoded
  lng: -112.0740,  // ← Already geocoded
  // ...
}
```

**To test:**
1. Go to `/properties`
2. Enter ZIP code: `85001`
3. You'll see proximity badges on each property
4. Click a property to see it on the map

### 2. Test with Real Addresses

When you have real Airtable data:

```typescript
// Example Airtable record
{
  "Property Code": "PHX-2025-001",
  "Address": "1234 East Camelback Road",
  "City": "Phoenix, AZ 85018",
  "Price": 450000,
  "Beds": 4,
  "Baths": 3
}

// After sync + geocoding →
{
  id: 'airtable-rec123',
  propertyCode: 'PHX-2025-001',
  address: '1234 East Camelback Road',
  city: 'Phoenix, AZ 85018',
  lat: 33.5095,    // ← From Mapbox Geocoding API
  lng: -112.0448,  // ← From Mapbox Geocoding API
  price: 450000,
  beds: 4,
  baths: 3
}
```

---

## API Rate Limits

### Mapbox Geocoding API Limits

**Free Tier:**
- 100,000 requests/month
- ~3,333 requests/day
- Rate limited to 600 requests/minute

**Best Practices:**
1. **Cache coordinates** - Store lat/lng in database, don't re-geocode
2. **Batch requests** - Use `batchGeocodeAddresses()` with rate limiting
3. **Geocode only new properties** - Check if property already has coordinates
4. **Use ZIP fallback** - If geocoding quota exceeded, use ZIP coordinates

### Implementation Example

```typescript
async function syncNewProperties(newRecords: any[]) {
  // Only geocode properties without coordinates
  const needsGeocoding = newRecords.filter(record => {
    const existing = await getExistingProperty(record.id);
    return !existing?.lat || !existing?.lng;
  });

  console.log(`Geocoding ${needsGeocoding.length} new properties...`);

  // Batch geocode with rate limiting
  const addresses = needsGeocoding.map(r =>
    `${r.fields['Address']}, ${r.fields['City']}`
  );

  const coordinates = await batchGeocodeAddresses(addresses);

  // Save to database
  for (let i = 0; i < needsGeocoding.length; i++) {
    await saveProperty({
      ...needsGeocoding[i],
      lat: coordinates[i]?.latitude,
      lng: coordinates[i]?.longitude
    });
  }
}
```

---

## Error Handling

### Geocoding Failures

The system gracefully handles geocoding failures:

```typescript
// Scenario 1: Invalid address
const coords = await geocodeAddress("Invalid Address XYZ");
// Returns: null
// Fallback: Uses ZIP coordinates

// Scenario 2: API error
const coords = await geocodeAddress("123 Main St, Phoenix, AZ");
// If API fails: returns null, logs error
// Fallback: Uses ZIP coordinates

// Scenario 3: No Mapbox token
const coords = await geocodeAddress("123 Main St, Phoenix, AZ");
// Returns: null with warning
// Fallback: Uses ZIP coordinates
```

### Validation

```typescript
import { hasValidCoordinates } from '@/lib/geocoding';

const property = await geocodeProperty(airtableRecord);

if (hasValidCoordinates(property)) {
  console.log('✅ Property has valid coordinates');
  // Can display on map
} else {
  console.log('⚠️ Property missing coordinates, using ZIP fallback');
  // Can still calculate approximate distance
}
```

---

## Summary

### ✅ What's Implemented

1. **Geocoding utilities** (`src/lib/geocoding.ts`)
   - `geocodeAddress()` - Convert address → lat/lng
   - `geocodeProperty()` - Geocode full property object
   - `batchGeocodeAddresses()` - Bulk geocoding with rate limiting
   - Error handling and validation

2. **Distance calculations** (`src/lib/proximityCalculator.ts`)
   - `calculatePropertyDistance()` - Smart distance calculation
   - Automatic fallback: lat/lng → ZIP code
   - Works with both geocoded and ZIP-based properties

3. **UI Integration** (`src/pages/PublicListings.tsx`)
   - Uses `calculatePropertyDistance()` for proximity badges
   - Automatically works with real coordinates when available

4. **Mapbox support** (`src/components/listings/PropertyMap.tsx`)
   - Ready to display properties with lat/lng
   - Marker clustering and custom icons

### 🔄 What You Need to Do

1. **Add Mapbox token** to `.env`:
   ```bash
   VITE_MAPBOX_ACCESS_TOKEN=pk.your_token_here
   ```

2. **Modify Airtable sync** to geocode properties:
   ```typescript
   import { geocodeProperty } from '@/lib/geocoding';

   // In your sync function
   const propertyWithCoords = await geocodeProperty(property);
   ```

3. **Test with real data** - The system will automatically use coordinates for better accuracy

### 📊 Benefits

- **More accurate distances** - Street address precision vs ZIP code approximation
- **Map integration ready** - Properties can be displayed on Mapbox
- **Automatic fallback** - Graceful degradation if geocoding fails
- **Cost-effective** - Free tier supports 100K geocodes/month
- **Future-proof** - Ready for advanced features (radius search, map filters)

---

## Questions?

Check these files:
- [src/lib/geocoding.ts](../src/lib/geocoding.ts) - Geocoding implementation
- [src/lib/proximityCalculator.ts](../src/lib/proximityCalculator.ts) - Distance calculations
- [src/pages/PublicListings.tsx](../src/pages/PublicListings.tsx) - UI integration
- [docs/UI_UX_IMPLEMENTATION.md](./UI_UX_IMPLEMENTATION.md) - Proximity system overview
