# Integration Guide - Adding "Email Property" Button

This guide shows exactly where to add the "Email Property" button to your matching page with proper data isolation for bulk emails.

---

## ✅ What's Already Built

1. ✅ **Backend API** - Email sending with PDF attachments ([api/ghl/index.ts](api/ghl/index.ts:1189-1401))
2. ✅ **Frontend Service** - Email helper functions ([src/services/emailApi.ts](src/services/emailApi.ts))
3. ✅ **PDF Generator** - Property PDF generator with data isolation ([src/lib/propertyPdfGenerator.ts](src/lib/propertyPdfGenerator.ts))
4. ✅ **UI Components** - Email buttons for individual and bulk sending ([src/components/EmailPropertyButton.tsx](src/components/EmailPropertyButton.tsx))
5. ✅ **Dependencies** - jsPDF and form-data installed

---

## 🎯 Where to Add the Button

### Option 1: Individual "Email Property" Button (Recommended First Step)

Add an email button to each property match card in the Buyers tab.

**File**: [src/pages/Matching.tsx](src/pages/Matching.tsx)

**Location**: Inside the buyer card where you display matches

```tsx
import { EmailPropertyButton } from '@/components/EmailPropertyButton';

// Inside your buyer card component (around line 400-500)
{buyer.matches?.map((match) => (
  <div key={match.id} className="match-card border rounded-lg p-4">
    {/* Existing match display */}
    <div className="flex justify-between items-center">
      <div>
        <h4>{match.propertyAddress}</h4>
        <p>Score: {match.matchScore}%</p>
      </div>

      {/* ADD THIS: Email button */}
      <EmailPropertyButton
        buyer={{
          id: buyer.id,
          contactId: buyer.contactId, // From HighLevel
          name: buyer.name,
          email: buyer.email
        }}
        property={{
          id: match.propertyId,
          propertyCode: match.propertyCode,
          address: match.propertyAddress,
          city: match.propertyCity,
          state: match.propertyState,
          zip: match.propertyZip,
          price: match.propertyPrice,
          bedrooms: match.propertyBedrooms,
          bathrooms: match.propertyBathrooms,
          sqft: match.propertySqft,
          propertyType: match.propertyType,
          description: match.propertyDescription,
          images: match.propertyImages
        }}
        match={{
          score: match.matchScore,
          isPriority: match.isPriority,
          distance: match.distance,
          budgetMatch: match.budgetMatch,
          bedroomMatch: match.bedroomMatch,
          bathroomMatch: match.bathroomMatch,
          locationMatch: match.locationMatch,
          typeMatch: match.typeMatch
        }}
        variant="outline"
        size="sm"
      />
    </div>
  </div>
))}
```

---

### Option 2: Bulk Email with Selection Checkboxes

Add checkboxes to select multiple buyer-property pairs and send emails in bulk.

**File**: [src/pages/Matching.tsx](src/pages/Matching.tsx)

**Step 1**: Add state for selected matches

```tsx
import { useState } from 'react';
import { BulkEmailButton } from '@/components/EmailPropertyButton';

export function Matching() {
  // ADD THIS: Track selected matches
  const [selectedMatches, setSelectedMatches] = useState<Array<{
    buyer: BuyerData;
    property: PropertyData;
    match: MatchData;
  }>>([]);

  const handleToggleMatch = (buyer, property, match) => {
    const key = `${buyer.id}-${property.id}`;
    const exists = selectedMatches.some(
      m => `${m.buyer.id}-${m.property.id}` === key
    );

    if (exists) {
      setSelectedMatches(prev => prev.filter(
        m => `${m.buyer.id}-${m.property.id}` !== key
      ));
    } else {
      setSelectedMatches(prev => [...prev, { buyer, property, match }]);
    }
  };

  // ... rest of component
}
```

**Step 2**: Add checkboxes to each match

```tsx
{buyer.matches?.map((match) => {
  const isSelected = selectedMatches.some(
    m => m.buyer.id === buyer.id && m.property.id === match.propertyId
  );

  return (
    <div key={match.id} className="match-card border rounded-lg p-4">
      <div className="flex items-start gap-3">
        {/* ADD THIS: Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => handleToggleMatch(
            {
              id: buyer.id,
              contactId: buyer.contactId,
              name: buyer.name,
              email: buyer.email
            },
            {
              id: match.propertyId,
              propertyCode: match.propertyCode,
              address: match.propertyAddress,
              // ... all property fields
            },
            {
              score: match.matchScore,
              isPriority: match.isPriority,
              // ... all match fields
            }
          )}
          className="mt-1"
        />

        {/* Existing match display */}
        <div className="flex-1">
          <h4>{match.propertyAddress}</h4>
          <p>Score: {match.matchScore}%</p>
        </div>
      </div>
    </div>
  );
})}
```

**Step 3**: Add bulk send button (top of page or in toolbar)

```tsx
{/* ADD THIS: Bulk email button */}
{selectedMatches.length > 0 && (
  <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
    <div>
      <span className="text-sm text-gray-600">
        {selectedMatches.length} match{selectedMatches.length !== 1 ? 'es' : ''} selected
      </span>
    </div>

    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSelectedMatches([])}
      >
        Clear Selection
      </Button>

      <BulkEmailButton
        matches={selectedMatches}
        onComplete={() => {
          setSelectedMatches([]);
          toast.success('Bulk email complete!');
        }}
      />
    </div>
  </div>
)}
```

---

### Option 3: Both Individual + Bulk (Recommended for Full Functionality)

Combine both approaches:

```tsx
export function Matching() {
  const [selectedMatches, setSelectedMatches] = useState([]);

  return (
    <div>
      {/* Bulk action bar */}
      {selectedMatches.length > 0 && (
        <BulkEmailActionBar
          selectedMatches={selectedMatches}
          onClear={() => setSelectedMatches([])}
        />
      )}

      {/* Buyers list */}
      {buyers.map((buyer) => (
        <Card key={buyer.id}>
          <CardHeader>
            <h3>{buyer.name}</h3>
          </CardHeader>

          <CardContent>
            {buyer.matches?.map((match) => (
              <div key={match.id} className="match-card">
                {/* Checkbox for bulk selection */}
                <Checkbox
                  checked={isSelected(buyer.id, match.propertyId)}
                  onCheckedChange={() => toggleMatch(buyer, match)}
                />

                {/* Match details */}
                <div className="flex-1">
                  <PropertyDetails property={match.property} />
                  <MatchScore score={match.matchScore} />
                </div>

                {/* Individual email button */}
                <EmailPropertyButton
                  buyer={buyer}
                  property={match.property}
                  match={match}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## 🔒 Data Isolation (Preventing Property Mix-ups)

The PDF generator ensures **each buyer gets the correct property** by:

### 1. Fresh PDF Instance Per Property

```typescript
// ✅ CORRECT: Each call creates a NEW PDF
for (const { buyer, property } of pairs) {
  const pdf = await generatePropertyPdf(property, buyer, match);
  // Each buyer gets their own PDF with correct data
}

// ❌ WRONG: Reusing PDF instance (data will mix)
const pdf = new jsPDF();
for (const { buyer, property } of pairs) {
  pdf.text(property.address); // This WILL mix data!
}
```

### 2. Function-Level Scoping

Each `generatePropertyPdf()` call:
- Creates a **new** `jsPDF` instance
- Uses **local** variables (not shared)
- Returns **immediately** with base64 data
- Has **no side effects** on other PDFs

### 3. Bulk Generation Safety

The `generateBulkPropertyPdfs()` function processes each pair sequentially:

```typescript
for (let i = 0; i < pairs.length; i++) {
  const { buyer, property, match } = pairs[i];

  // Generate FRESH PDF for THIS specific pair
  const pdfData = await generatePropertyPdf(property, buyer, match);

  // Store with correct buyer-property association
  results.push({ buyer, property, pdfData });
}
```

### 4. Email Sending Safety

When sending bulk emails, each email gets the **correct PDF** from the results array:

```typescript
for (let i = 0; i < pdfs.length; i++) {
  const { buyer, property, pdfData } = pdfs[i];

  // pdfData is already associated with the correct buyer-property pair
  await sendPropertyPdfEmail(
    buyer.contactId,
    `Property Match - ${property.address}`,
    htmlContent,
    pdfData, // ✅ This PDF belongs to THIS buyer-property pair
    `property-${property.propertyCode}.pdf`
  );
}
```

---

## 🧪 Testing the Integration

### Test 1: Single Email

1. Go to Matching page
2. Find a buyer with matches
3. Click "Email Property" on one match
4. Check HighLevel conversations for the email
5. Download the PDF and verify:
   - ✅ Correct property address
   - ✅ Correct property details
   - ✅ Buyer name appears on PDF
   - ✅ Match score is correct

### Test 2: Bulk Email (Data Isolation Test)

1. Select 3-5 different buyer-property pairs
2. Note which buyer gets which property
3. Click "Send X Emails"
4. Wait for completion
5. Check HighLevel for each buyer
6. Download each PDF and verify:
   - ✅ Buyer A got Property A PDF (not B or C)
   - ✅ Buyer B got Property B PDF (not A or C)
   - ✅ Buyer C got Property C PDF (not A or B)
   - ✅ No mixing of property data

### Test 3: Error Handling

1. Select a buyer with invalid contactId
2. Try to send email
3. Verify:
   - ✅ Error toast appears
   - ✅ Other emails still send
   - ✅ No data corruption

---

## 🐛 Troubleshooting

### Issue: "contactId is required"

**Cause**: Buyer object doesn't have HighLevel contactId

**Fix**: Ensure you're mapping the contact ID from your data:
```typescript
buyer={{
  contactId: buyer.contactId || buyer.ghlContactId || buyer.contact_id
}}
```

### Issue: PDFs have wrong property data

**Cause**: Reusing PDF instance or incorrect data mapping

**Fix**: Verify you're calling `generatePropertyPdf()` for each property:
```typescript
// ✅ Correct
const pdf1 = await generatePropertyPdf(property1, buyer1, match1);
const pdf2 = await generatePropertyPdf(property2, buyer2, match2);

// ❌ Wrong
const pdf = await generatePropertyPdf(property1);
// ... modifying pdf for property2 (DATA MIXING!)
```

### Issue: Images not loading in PDF

**Cause**: CORS restrictions or invalid image URLs

**Fix**:
1. Ensure images have CORS headers
2. Or host images on same domain
3. Or use base64 encoded images

```typescript
property={{
  images: [
    'https://your-domain.com/property-images/123.jpg' // ✅ Same domain
    // OR
    'data:image/jpeg;base64,/9j/4AAQ...' // ✅ Base64
  ]
}}
```

### Issue: Email sending too slow

**Cause**: Generating PDFs and sending emails synchronously

**Fix**: Already implemented! The bulk email button:
- Generates all PDFs first (parallelizable in future)
- Sends emails with 200ms delay between each
- Shows progress percentage

---

## 🎯 Recommended Implementation Order

1. **Week 1**: Add individual email buttons
   - Easiest to implement
   - Test with real HighLevel contacts
   - Verify PDF generation works

2. **Week 2**: Add bulk selection
   - Add checkboxes
   - Test data isolation with 2-3 properties
   - Ensure no data mixing

3. **Week 3**: Add bulk send button
   - Implement progress indicator
   - Add rate limiting (already built-in)
   - Monitor HighLevel for delivery

4. **Week 4**: Polish & optimize
   - Add email templates for different property types
   - Track open rates via HighLevel webhooks
   - Add scheduling feature

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| [api/ghl/index.ts](api/ghl/index.ts:1189-1401) | Backend API - Upload & send endpoints |
| [src/services/emailApi.ts](src/services/emailApi.ts) | Frontend service - API calls |
| [src/lib/propertyPdfGenerator.ts](src/lib/propertyPdfGenerator.ts) | PDF generation with data isolation |
| [src/components/EmailPropertyButton.tsx](src/components/EmailPropertyButton.tsx) | UI components |
| [docs/EMAIL_API_GUIDE.md](docs/EMAIL_API_GUIDE.md) | Complete API reference |
| [docs/EMAIL_API_QUICK_START.md](docs/EMAIL_API_QUICK_START.md) | Quick reference |

---

**Ready to integrate!** Start with Option 1 (individual buttons) and expand from there.
