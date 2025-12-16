# Property Matching & Email System

## Overview
This feature enables automated property matching and email delivery to buyers with professionally designed PDF attachments.

## Components Implemented

### 1. PDF Generator ([src/lib/pdfGenerator.ts](src/lib/pdfGenerator.ts))
- Generates professional property listing PDFs using jsPDF
- Purple Homes branded design with company colors
- Includes property details: address, price, down payment, monthly payment, beds, baths, sqft
- Multi-page support with automatic page breaks
- Contact information footer

### 2. Airtable Integration ([src/services/airtableApi.ts](src/services/airtableApi.ts))
- React Query hooks for fetching buyer property matches
- `useBuyerPropertyMatches(contactId)` - Get matches for a single buyer
- `useBulkBuyerMatches(contactIds[])` - Get matches for multiple buyers
- Integrates with Airtable "Buyer Property Matches" table

### 3. Email Service ([src/services/emailService.ts](src/services/emailService.ts))
- `sendPropertyEmail()` - Send properties to a single buyer
- `bulkSendPropertyEmails()` - Send to multiple buyers in batches
- `sendMatchedProperties()` - Send based on Airtable matches
- Beautiful HTML email templates with property previews
- PDF attachment support via base64 encoding
- Rate limiting with batch processing (5 emails per batch)

### 4. Airtable API Handler ([api/airtable/index.ts](api/airtable/index.ts))
Serverless function for Airtable operations:
- `GET /api/airtable?action=test` - Test connection
- `GET /api/airtable?action=get-buyer-matches&contactId=X` - Get buyer matches
- `POST /api/airtable?action=bulk-matches` - Get multiple buyer matches
- `GET /api/airtable?action=list-tables` - List all tables
- `GET /api/airtable?action=list-records&table=X` - List table records

### 5. UI Integration ([src/components/contacts/ContactDetailModal.tsx](src/components/contacts/ContactDetailModal.tsx))
- "Send Property Matches" button for buyers with matched properties
- Shows match count dynamically
- Loading states and error handling
- Only visible for contacts with type="buyer"
- Automatically fetches matches from Airtable on modal open

### 6. Enhanced Property Features
- **Down Payment & Monthly Payment Fields** added to:
  - Property detail modal ([PropertyDetailModal.tsx](src/components/properties/PropertyDetailModal.tsx))
  - Property cards ([PropertyCard.tsx](src/components/properties/PropertyCard.tsx))
  - Public listings page with filter ([PublicListings.tsx](src/pages/PublicListings.tsx))
  - Type definitions ([types/index.ts](src/types/index.ts))

## How It Works

### Workflow
1. **Airtable Setup**: Admin creates buyer property matches in Airtable
   - Each record contains: Contact ID, Name, Email, Matched Property IDs
2. **Contact Modal**: User opens a buyer's contact detail modal
3. **Fetch Matches**: App queries Airtable for property matches
4. **Display Button**: "Send X Matches" button appears if matches exist
5. **Send Email**: Clicking button generates PDF and sends email via GHL
6. **Email Delivery**: Buyer receives branded email with PDF attachment

### Email Content
- Subject: "Your X Matched Properties from Purple Homes"
- HTML email with:
  - Purple Homes gradient header
  - Personalized greeting
  - Property count highlight
  - Preview of first 3 properties
  - Call-to-action button
  - Professional footer with agent contact info
- PDF attachment with all matched properties

## Environment Variables Required

```bash
# Airtable API
AIRTABLE_API_KEY=your_airtable_personal_access_token
AIRTABLE_BASE_ID=your_base_id_starting_with_app

# GHL API (already configured)
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_location_id
```

## Airtable Table Structure

The system uses a **relational structure** with three tables:

### 1. Buyers Table
| Field Name | Type | Description |
|------------|------|-------------|
| Contact ID | Single line text | GHL Contact ID |
| First Name | Single line text | Buyer's first name |
| Last Name | Single line text | Buyer's last name |
| Email | Single line text | Buyer's email address |
| Property-Buyer Matches | Link to records | Links to matched properties |

### 2. Properties Table
| Field Name | Type | Description |
|------------|------|-------------|
| Property Code | Single line text | Unique property code |
| Opportunity ID | Single line text | GHL Opportunity ID |
| Address | Single line text | Property address |
| City | Single line text | City |
| Beds | Number | Number of bedrooms |
| Baths | Number | Number of bathrooms |
| Property-Buyer Matches | Link to records | Links to buyer matches |

### 3. Property-Buyer Matches Table (Junction Table)
| Field Name | Type | Description |
|------------|------|-------------|
| Property Code | Link to records | Links to Properties table |
| Contact ID | Link to records | Links to Buyers table |
| Match Status | Single select | Active, Closed, etc. |
| Match Score | Number | Match confidence score |
| Match Notes | Long text | Additional notes about the match |

## Testing

### Manual Testing Steps
1. Set up Airtable base with "Buyer Property Matches" table
2. Add environment variables to Vercel
3. Create a test match record in Airtable:
   ```
   Contact ID: <GHL_CONTACT_ID>
   Contact Name: John Doe
   Contact Email: john@example.com
   Matched Property IDs: PROP001,PROP002,PROP003
   Last Matched: 2024-01-15
   ```
4. Open the Contact Detail Modal for a buyer
5. Click "Send X Matches" button
6. Check buyer's email for PDF

### Testing Endpoints
```bash
# Test Airtable connection
curl https://your-app.vercel.app/api/airtable?action=test

# Get buyer matches
curl https://your-app.vercel.app/api/airtable?action=get-buyer-matches&contactId=CONTACT_ID
```

## Future Enhancements
- [ ] Bulk send from Contacts page (select multiple buyers)
- [ ] Schedule automated sends (daily/weekly digest)
- [ ] Track email opens and PDF downloads
- [ ] Buyer feedback on properties (like/dislike)
- [ ] AI-powered property matching based on preferences
- [ ] Property comparison view in email
- [ ] Custom email templates per agent

## Dependencies Added
- `jspdf@3.0.4` - PDF generation library

## Files Modified
- `package.json` - Added jspdf dependency
- `src/types/index.ts` - Added downPayment and monthlyPayment fields
- `src/data/mockData.ts` - Added payment data to mock properties
- `src/components/contacts/ContactDetailModal.tsx` - Added send button
- `src/components/properties/PropertyCard.tsx` - Display down payment
- `src/components/properties/PropertyDetailModal.tsx` - Edit payment fields
- `src/pages/PublicListings.tsx` - Filter by down payment
- `api/README.md` - Updated documentation

## Files Created
- `src/lib/pdfGenerator.ts` - PDF generation logic
- `src/services/airtableApi.ts` - Airtable API client
- `src/services/emailService.ts` - Email sending logic
- `api/airtable/index.ts` - Airtable API handler
- `PROPERTY_MATCHING_FEATURE.md` - This document
