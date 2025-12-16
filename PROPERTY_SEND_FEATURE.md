# Property Matching & Send Feature - Architecture

## Overview
This document explains the consolidated architecture for property matching and sending emails to buyers.

## Key Principle: Single Source of Truth
**Property Matching page (`/matching`) is THE ONLY place to send properties to buyers.**

This eliminates redundancy and creates a clean, centralized workflow.

## Architecture Flow

```
1. GHL (HighLevel) → Webhooks → Airtable
   - Contact data (Contact ID, name, email, preferences)
   - Property data (Opportunity ID, property details)

2. Airtable stores:
   - Buyers table (with Contact IDs from GHL)
   - Properties table (with Opportunity IDs from GHL)
   - Property-Buyer Matches table (junction table with scores)

3. Property Matching page (`/matching`):
   - Fetches match data FROM Airtable
   - Pulls live buyer details FROM GHL (using Contact ID)
   - Pulls live property details FROM GHL (using Opportunity ID)
   - Shows buyers with match counts
   - **"Send X Matches" button** sends properties via email with PDF

4. Email Service:
   - Generates PDF using jsPDF
   - Sends via HighLevel API with dedicated header
   - Includes all property details (price, down payment, monthly payment, etc.)
```

## What Each Page Does

### `/matching` - Property Matching Hub ✅ (Send Properties HERE)
- **Purpose**: AI-powered property matching and sending
- **Features**:
  - View all buyers with their match counts
  - View all properties with their match counts
  - Run AI matching algorithm (rule-based scoring)
  - **Send matched properties to buyers via email with PDF**
- **Data Source**: Airtable + GHL
- **Actions**: "Run Matching for All", "Send X Matches" per buyer

### `/contacts` - Contact Management
- **Purpose**: Manage contacts and their details
- **Features**:
  - View all contacts (buyers and sellers)
  - Edit contact information
  - Manage tags
  - **"Find Matches" button** - Runs AI matching for this buyer (stores in Airtable)
- **Data Source**: GHL only
- **NO SEND FUNCTIONALITY** - Users go to `/matching` to send

### `/acquisitions` - Buyer Acquisitions Pipeline
- **Purpose**: Buyer pipeline management
- **Features**:
  - View buyers in different pipeline stages
  - Move buyers through stages
  - Triggers GHL automations and checklists
- **Data Source**: GHL pipeline
- **NO MATCHING OR SEND FUNCTIONALITY** - Pure pipeline management

### `/seller-acquisitions` - Seller Acquisitions Pipeline
- **Purpose**: Seller pipeline management
- **Features**:
  - View sellers in different pipeline stages
  - Move sellers through stages
  - Triggers GHL automations and checklists
- **Data Source**: GHL pipeline
- **Untouched by matching system**

### `/buyers` - Deal Acquisition Pipeline
- **Purpose**: Deal acquisition pipeline management
- **Features**:
  - View deals in different pipeline stages
  - Triggers GHL automations and checklists
- **Data Source**: GHL pipeline
- **Untouched by matching system**

### `/properties` - Social Media Properties
- **Purpose**: Property management for social media
- **Features**:
  - Batch posting to Social Hub
  - Property editing for Imejis
  - Connected with social media workflows
- **Data Source**: GHL opportunities
- **Untouched by matching system**

### `/listings` - Public Property Listings
- **Purpose**: Public-facing property browsing
- **Features**:
  - Filter properties by price, beds, baths, down payment
  - View property details in modal
  - Embeddable in website (no sidebar)
- **Data Source**: GHL opportunities
- **Untouched by matching system**

## Why This Architecture?

### ✅ Benefits
1. **No Redundancy**: One place to send properties, not scattered across 3+ pages
2. **Clear User Flow**: Users know exactly where to go to send properties
3. **Single Source of Truth**: Airtable stores matches, GHL stores live data
4. **Clean Separation**: Pipelines stay focused on pipeline management
5. **Scalable**: Easy to add bulk send, scheduling, tracking in one place

### ❌ What We Avoid
- Duplicate "Send" buttons in Contacts, BuyerAcquisitions, and Matching
- Confusion about which page to use for sending
- Breaking pipeline automations and checklists
- Mixing matching logic with pipeline logic

## How Matching Works

### AI Matching Algorithm (Rule-Based)
Located in: `api/matching/index.ts`

**Scoring System (0-100 points)**:
- **Bedrooms (30 pts)**: Exact match = 30, ±1 = 20, more = 10
- **Bathrooms (20 pts)**: Meets requirement = 20, less = 5
- **Location (30 pts)**: City match = 30, no match = 5
- **Budget (20 pts)**: Has down payment = 20, none = 10

**Match Threshold**: 60+ points stored in Airtable

### Running Matching
1. **Run Matching for All** (button in `/matching` header)
   - Matches all buyers against all properties
   - Creates/updates records in Airtable Property-Buyer Matches table

2. **Find Matches** (button in Contact Detail Modal)
   - Runs matching for single buyer
   - Creates/updates their matches in Airtable
   - User then goes to `/matching` to send

## Sending Properties Flow

### User Journey
1. User opens **Property Matching page** (`/matching`)
2. Views list of buyers with match counts
3. Clicks **"Send X Matches"** button on a buyer card
4. System:
   - Fetches matches from Airtable (property record IDs)
   - Pulls live property details from GHL (using Opportunity IDs)
   - Generates PDF with Purple Homes branding
   - Sends email via HighLevel API
5. Buyer receives email with:
   - Personalized greeting
   - Property summary
   - PDF attachment with all details
   - Agent contact info

### Technical Implementation
```typescript
// In Matching.tsx
const handleSendPropertyMatches = async (buyer) => {
  // 1. Get matched property record IDs from Airtable
  const matchedPropertyRecordIds = buyer.matches.map(m => m.propertyRecordId);

  // 2. Find corresponding GHL properties
  const matchedProperties = ghlProperties.filter(prop =>
    matchedPropertyRecordIds.includes(prop.ghlOpportunityId)
  );

  // 3. Send email with PDF
  await sendPropertyEmail({
    contactId: buyer.contactId,
    contactName: `${buyer.firstName} ${buyer.lastName}`,
    contactEmail: buyer.email,
    properties: matchedProperties,
    subject: `Your ${matchedProperties.length} Matched Properties...`,
    customMessage: 'Based on your investment criteria...',
  });
};
```

## Files Modified

### Enhanced Files
- `src/pages/Matching.tsx` - Added "Send X Matches" button and email functionality
- `src/components/contacts/ContactDetailModal.tsx` - Removed send button, kept "Find Matches"

### Unchanged Files (Pipelines)
- `src/pages/BuyerAcquisitions.tsx` ✅ No changes
- `src/pages/SellerAcquisitions.tsx` ✅ No changes
- `src/pages/Buyers.tsx` ✅ No changes

### Core Services (Already Implemented)
- `src/services/matchingApi.ts` - React Query hooks for matching
- `src/services/airtableApi.ts` - Airtable integration
- `src/services/emailService.ts` - Email sending with PDF
- `src/lib/pdfGenerator.ts` - PDF generation
- `api/matching/index.ts` - AI matching engine
- `api/airtable/index.ts` - Airtable API handler

## Environment Variables Required

```bash
# Airtable (for matching)
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id

# GHL (already configured)
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_location_id
GHL_ACQUISITION_PIPELINE_ID=zL3H2M1BdEKlVDa2YWao
```

## Testing Checklist

- [ ] Run test-airtable.js to verify Airtable connection
- [ ] Verify buyers and properties exist in Airtable
- [ ] Open `/matching` page and run "Run Matching for All"
- [ ] Verify matches appear on buyer cards
- [ ] Click "Send X Matches" on a buyer with matches
- [ ] Verify email is received with PDF attachment
- [ ] Check PDF contains correct property details
- [ ] Verify pipeline pages still work (no breaking changes)

## Future Enhancements (Optional)

- [ ] Bulk send to multiple buyers at once
- [ ] Schedule automated sends (daily/weekly digests)
- [ ] Track email opens and PDF downloads
- [ ] Buyer feedback on properties (like/dislike)
- [ ] Custom email templates per agent
- [ ] Property comparison view in email
- [ ] SMS notifications for high-score matches

---

**Last Updated**: December 2024
**Status**: ✅ Implemented and Ready
