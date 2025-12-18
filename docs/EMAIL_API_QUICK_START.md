# Email API Quick Start - Send Property PDFs

Quick reference for sending emails with PDF attachments via the consolidated GHL API.

---

## 🚀 Quick Usage

### Step 1: Upload PDF

```javascript
const uploadResponse = await fetch('/api/ghl?resource=messages&action=upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileData: 'base64_encoded_pdf_data',
    fileName: 'property-details.pdf',
    fileType: 'application/pdf'
  })
});

const { urls } = await uploadResponse.json();
```

### Step 2: Send Email

```javascript
const sendResponse = await fetch('/api/ghl?resource=messages&action=send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'Email',
    contactId: 'abc123', // HighLevel contact ID
    subject: 'Your Property Match',
    html: '<h1>New Property!</h1><p>See attached PDF...</p>',
    attachments: urls // Array of URLs from step 1
  })
});

const result = await sendResponse.json();
```

---

## 📦 Using the Service Helper

```javascript
import { sendPropertyPdfEmail, generatePropertyEmailHtml } from '@/services/emailApi';

// Generate email HTML
const html = generatePropertyEmailHtml({
  buyerName: 'John Doe',
  propertyAddress: '123 Main St',
  propertyCity: 'San Francisco, CA',
  propertyPrice: 750000,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1800,
  matchScore: 95
});

// Send email with PDF
await sendPropertyPdfEmail(
  'contact_id',      // HighLevel contact ID
  'New Match!',      // Subject
  html,              // HTML body
  pdfBase64Data,     // PDF as base64
  'property.pdf'     // Filename
);
```

---

## 🏗️ API Architecture (Consolidated)

All GHL API operations go through **one** serverless function:

```
/api/ghl/index.ts
├── ?resource=contacts         → Contact CRUD
├── ?resource=opportunities    → Opportunities CRUD
├── ?resource=messages         → Email/SMS (NEW!)
│   ├── &action=upload         → Upload file attachment
│   ├── &action=send           → Send message with attachments
│   └── &id={id}               → Get conversation messages
├── ?resource=documents        → Document templates
├── ?resource=media            → Media management
└── ...12+ resources total
```

**Why consolidated?** Vercel free tier limits you to 12 serverless functions. By routing all GHL operations through one function with query parameters, we only use 1 function slot!

---

## 🔑 Key Endpoints

### Upload File
- **URL**: `/api/ghl?resource=messages&action=upload`
- **Method**: POST
- **Body**: `{ fileData, fileName, fileType }`
- **Returns**: `{ success, urls, data }`

### Send Email
- **URL**: `/api/ghl?resource=messages&action=send`
- **Method**: POST
- **Body**: `{ type: 'Email', contactId, subject, html, attachments }`
- **Returns**: `{ success, message, data }`

---

## 📄 Supported File Types

JPG, JPEG, PNG, MP4, MPEG, ZIP, RAR, **PDF**, DOC, DOCX, TXT, MP3, WAV

---

## 🔍 Code Locations

| File | Purpose |
|------|---------|
| [api/ghl/index.ts](api/ghl/index.ts) | **Backend API** - Consolidated GHL endpoint (lines 1189-1401) |
| [src/services/emailApi.ts](src/services/emailApi.ts) | **Frontend Service** - Helper functions for sending emails |
| [docs/EMAIL_API_GUIDE.md](docs/EMAIL_API_GUIDE.md) | **Full Documentation** - Complete guide with examples |

---

## ⚡ React Component Example

```tsx
import { useState } from 'react';
import { sendPropertyPdfEmail } from '@/services/emailApi';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function EmailPropertyButton({ contact, property, pdfData }) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await sendPropertyPdfEmail(
        contact.id,
        `New Match - ${property.address}`,
        generateHtml(property),
        pdfData,
        'property.pdf'
      );
      toast.success('Email sent! 📧');
    } catch (error) {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Button onClick={handleSend} disabled={sending}>
      {sending ? 'Sending...' : 'Email PDF'}
    </Button>
  );
}
```

---

## 🐛 Common Issues

### "fileData is required"
✅ Pass base64 encoded file: `{ fileData: 'JVBERi0...' }`

### "contactId is required"
✅ Get contactId from HighLevel: `buyer.contactId`

### "No attachment URL returned"
✅ Check upload response structure, handle multiple formats

---

## 📚 Full Documentation

For complete API reference, troubleshooting, and advanced examples, see:
- [EMAIL_API_GUIDE.md](EMAIL_API_GUIDE.md) - Complete guide

---

## 🎯 Next Steps

1. **Generate PDFs** - Use jsPDF or react-pdf to create property PDFs
2. **Test Sending** - Try sending a test email with PDF attachment
3. **Add to Matching** - Integrate email sending into matching workflow
4. **Track Emails** - Monitor open rates via HighLevel dashboard

---

**API Base URL**: `/api/ghl` (consolidated endpoint)
**Resource**: `messages`
**Actions**: `upload`, `send`
