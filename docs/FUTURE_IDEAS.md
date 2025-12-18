# Future Ideas & Scalability Options

This document contains ideas and potential enhancements for future consideration. These are NOT currently implemented but documented for planning purposes.

---

## 💡 Cost Optimization: Free Geocoding Fallback

**Status:** Idea Only (Not Implemented)
**Priority:** Low (only needed at massive scale)
**Estimated Savings:** $100-500/month at 100K+ properties

### The Idea

Implement a hybrid geocoding system that uses Mapbox's free tier first, then falls back to free alternatives if quota is exceeded.

### Why Not Now?

- Mapbox free tier: 100,000 geocodes/month
- Our current scale: ~100-1000 properties
- Cost at current scale: $0/month
- **We won't need this for years**

### When to Consider

Implement this when:
- Approaching 100K geocodes/month
- Mapbox costs exceed $100/month
- Budget constraints become critical

### Technical Approach

```typescript
// FUTURE IDEA - NOT IMPLEMENTED
// Smart hybrid geocoding with free fallback

import { geocodeAddress as geocodeMapbox } from './geocoding'; // Current Mapbox implementation

/**
 * Free geocoding alternative using Nominatim (OpenStreetMap)
 *
 * Limitations:
 * - 1 request/second limit (vs Mapbox: 600/min)
 * - Less accurate for complex addresses
 * - No commercial support
 * - Requires User-Agent header
 *
 * Benefits:
 * - 100% free, unlimited usage
 * - No API key required
 * - Global coverage
 */
async function geocodeAddressNominatim(address: string): Promise<Coordinates | null> {
  const url = `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PurpleHomes/1.0 (contact@purplehomes.com)' // Required by Nominatim
      }
    });

    if (!response.ok) {
      console.error('Nominatim geocoding failed:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn('No Nominatim results found for:', address);
      return null;
    }

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon)
    };
  } catch (error) {
    console.error('Error with Nominatim geocoding:', error);
    return null;
  }
}

/**
 * Smart hybrid geocoding with automatic fallback
 *
 * Strategy:
 * 1. Check database cache first (fastest, free)
 * 2. Try Mapbox (fast, accurate, free up to 100K/month)
 * 3. Fallback to Nominatim (free, slower) if Mapbox quota exceeded
 * 4. Final fallback to ZIP code coordinates
 */
async function smartHybridGeocode(address: string): Promise<Coordinates | null> {
  // Step 1: Check cache (geocode once, use forever)
  const cached = await db.geocodeCache.get(address);
  if (cached) {
    console.log('✅ Using cached coordinates');
    return cached;
  }

  // Step 2: Try Mapbox (primary, best quality)
  try {
    const coords = await geocodeMapbox(address);
    if (coords) {
      console.log('✅ Geocoded via Mapbox');
      await db.geocodeCache.set(address, coords);
      return coords;
    }
  } catch (error: any) {
    // Check if quota exceeded
    if (error.message?.includes('quota') || error.status === 429) {
      console.warn('⚠️ Mapbox quota exceeded, falling back to Nominatim');
    } else {
      console.error('❌ Mapbox geocoding error:', error);
    }
  }

  // Step 3: Fallback to Nominatim (free alternative)
  console.log('🔄 Trying Nominatim fallback...');

  // Rate limit: 1 request per second
  await rateLimiter.wait('nominatim', 1000);

  const coords = await geocodeAddressNominatim(address);
  if (coords) {
    console.log('✅ Geocoded via Nominatim (free)');
    await db.geocodeCache.set(address, coords);
    return coords;
  }

  // Step 4: Final fallback to ZIP code
  console.log('🔄 Falling back to ZIP code coordinates');
  const zip = extractZipCode(address);
  if (zip) {
    const zipCoords = getZIPCoordinates(zip);
    if (zipCoords) {
      console.log('✅ Using ZIP code coordinates');
      return zipCoords;
    }
  }

  console.error('❌ All geocoding methods failed for:', address);
  return null;
}

/**
 * Batch geocoding with intelligent routing
 *
 * Automatically splits requests between Mapbox and Nominatim
 * based on quota availability
 */
async function smartBatchGeocode(
  addresses: string[],
  options = { preferMapbox: true }
): Promise<(Coordinates | null)[]> {
  const results: (Coordinates | null)[] = [];

  // Check Mapbox quota
  const mapboxQuotaRemaining = await checkMapboxQuota();
  const useMapboxCount = Math.min(addresses.length, mapboxQuotaRemaining);

  console.log(`📊 Quota: ${mapboxQuotaRemaining} Mapbox, unlimited Nominatim`);
  console.log(`📍 Plan: ${useMapboxCount} via Mapbox, ${addresses.length - useMapboxCount} via Nominatim`);

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];

    if (i < useMapboxCount && options.preferMapbox) {
      // Use Mapbox (faster, better quality)
      const coords = await geocodeMapbox(address);
      results.push(coords);
      await delay(100); // Mapbox rate limit: 600/min = 100ms delay
    } else {
      // Use Nominatim (free, slower)
      const coords = await geocodeAddressNominatim(address);
      results.push(coords);
      await delay(1000); // Nominatim rate limit: 1/sec = 1000ms delay
    }
  }

  return results;
}

/**
 * Rate limiter helper
 */
const rateLimiter = {
  lastRequest: {} as Record<string, number>,

  async wait(service: string, minDelay: number) {
    const now = Date.now();
    const last = this.lastRequest[service] || 0;
    const elapsed = now - last;

    if (elapsed < minDelay) {
      await delay(minDelay - elapsed);
    }

    this.lastRequest[service] = Date.now();
  }
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Implementation Checklist (When Ready)

- [ ] Add Nominatim geocoding function
- [ ] Implement database caching layer
- [ ] Build smart fallback logic
- [ ] Add Mapbox quota monitoring
- [ ] Create rate limiter for Nominatim (1 req/sec)
- [ ] Add telemetry to track which service is used
- [ ] Update documentation
- [ ] Test with real addresses
- [ ] Monitor cost savings

### Cost Comparison

**Current (Mapbox Only):**
- 0-100K geocodes/month: $0
- 100K-500K: ~$100-500/month
- 500K+: ~$500-1000/month

**With Hybrid System:**
- 0-100K Mapbox (free) + unlimited Nominatim: $0
- Use Mapbox for critical/new properties
- Use Nominatim for bulk/historical data
- Estimated savings: 50-80% at scale

### Trade-offs

**Pros:**
- ✅ Massive cost savings at scale
- ✅ Never locked into one provider
- ✅ Redundancy if Mapbox has issues
- ✅ Can prioritize quality vs. cost per request

**Cons:**
- ❌ More complex code
- ❌ Nominatim slower (1 req/sec vs 600/min)
- ❌ Slightly less accurate with Nominatim
- ❌ Need to maintain two integrations

### Recommended Trigger Points

| Properties | Visitors/Month | Geocodes/Month | Action |
|-----------|----------------|----------------|--------|
| 0-1,000 | 0-10K | <10K | ✅ Mapbox only (current) |
| 1K-10K | 10K-50K | 10K-50K | ✅ Mapbox only |
| 10K-50K | 50K-200K | 50K-150K | ⚠️ Consider hybrid |
| 50K+ | 200K+ | 150K+ | 🔄 Implement hybrid |

---

## 🗺️ Alternative Map Providers (Future Consideration)

### OpenStreetMap + Leaflet.js

**Idea:** Replace Mapbox tiles with free OpenStreetMap tiles

**Cost:** $0 forever

**Implementation:**
```typescript
// Replace Mapbox GL JS
import L from 'leaflet';

const map = L.map('map').setView([33.4484, -112.0740], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);
```

**Trade-offs:**
- ✅ 100% free, no limits
- ✅ Used by Wikipedia, Craigslist
- ❌ Less polished appearance
- ❌ No satellite imagery
- ❌ Fewer customization options

**When to Consider:**
- Map view costs exceed $200/month
- Need complete control over infrastructure
- Budget constraints critical

---

## 🎯 Distance Calculation Optimization (Already Implemented!)

**Status:** ✅ Already Done

Our Haversine formula calculates distances 100% client-side with zero API costs.

**Current Implementation:**
- ZIP code database: 50+ Phoenix metro ZIP codes
- Haversine distance calculation (±50ft accuracy)
- Works with coordinates OR ZIP codes
- Zero API calls needed
- Handles millions of calculations/month: $0

**This is already saving us thousands compared to using Google Distance Matrix API or similar.**

---

## 📊 Cost Monitoring Dashboard (Future)

**Idea:** Build internal dashboard to monitor API usage and costs

**Features:**
- Real-time Mapbox quota tracking
- Cost projections
- Alert when approaching limits
- Switch to Nominatim automatically

**When to Build:**
- When approaching paid tier
- When costs exceed $50/month

---

## Summary

**Current Strategy:** ✅ Mapbox free tier (recommended, already implemented)

**Future Options:**
1. Hybrid Mapbox + Nominatim (cost savings at scale)
2. OpenStreetMap tiles (free maps)
3. Cost monitoring dashboard

**Timeline:**
- Next 6-12 months: Stay with Mapbox free tier
- 12-24 months: Monitor usage, consider hybrid if needed
- 24+ months: Evaluate based on actual costs vs. revenue

**Key Insight:** By the time Mapbox costs become significant, Purple Homes will have revenue that makes $100-500/month trivial. Building complex fallback systems now is premature optimization.

---

**Last Updated:** 2025-12-18
**Revisit:** When Mapbox costs exceed $100/month or approaching 100K geocodes/month
