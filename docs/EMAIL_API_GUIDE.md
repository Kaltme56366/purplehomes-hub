# Email API Guide - Sending Property PDFs via HighLevel

This guide explains how to send emails with PDF attachments using the HighLevel (LeadConnector) Conversations API.

---

## Table of Contents
1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Usage](#frontend-usage)
5. [Complete Example](#complete-example)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The email system uses the HighLevel Conversations API to send emails with attachments. The process involves two steps:

1. **Upload the PDF** to HighLevel's servers and get a URL
2. **Send the email** with the attachment URL

### Architecture

```
Frontend (React)
    ↓
    ↓ POST /api/ghl?resource=messages&action=upload
    ↓ { fileData: "base64...", fileName: "property.pdf" }
    ↓
API Route (api/ghl/index.ts)
    ↓
    ↓ POST /conversations/messages/upload
    ↓ FormData with fileAttachment
    ↓
HighLevel API
    ↓
    ↓ Returns: { urls: ["https://..."] }
    ↓
Frontend receives URLs
    ↓
    ↓ POST /api/ghl?resource=messages&action=send
    ↓ { contactId, subject, html, attachments: ["https://..."] }
    ↓
API Route (api/ghl/index.ts)
    ↓
    ↓ POST /conversations/messages
    ↓ { type: "Email", contactId, subject, html, attachments: [...] }
    ↓
HighLevel API
    ↓
Email sent! 📧
```

---

## API Endpoints

### 1. Upload File Attachment

**Endpoint**: `POST /api/ghl?resource=messages&action=upload`

**Request Body**:
```typescript
{
  fileData: string;     // Base64 encoded file (with or without data URL prefix)
  fileName: string;     // e.g., "property-123.pdf"
  fileType?: string;    // e.g., "application/pdf" (optional)
}
```

**Response**:
```typescript
{
  success: true,
  urls: string | string[],  // URL(s) for uploaded file
  data: any                 // Full response from HighLevel
}
```

**Supported File Types**: JPG, JPEG, PNG, MP4, MPEG, ZIP, RAR, PDF, DOC, DOCX, TXT, MP3, WAV

**Example**:
```javascript
const response = await fetch('/api/ghl?resource=messages&action=upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileData: 'JVBERi0xLjQKJeLjz9MK...', // base64 PDF data
    fileName: 'property-details.pdf',
    fileType: 'application/pdf'
  })
});

const { urls } = await response.json();
console.log('Uploaded to:', urls);
```

---

### 2. Send Email with Attachments

**Endpoint**: `POST /api/ghl?resource=messages&action=send`

**Request Body** (based on [HighLevel API schema](https://marketplace.gohighlevel.com/docs/ghl/conversations/send-a-new-message)):
```typescript
{
  // Required fields
  type: 'Email';
  contactId: string;      // HighLevel contact ID

  // Message content (at least one required)
  html?: string;          // HTML email body
  message?: string;       // Plain text message

  // Email-specific fields
  subject?: string;       // Email subject line
  emailFrom?: string;     // Sender email (if not using default)
  emailTo?: string;       // Recipient email (if different from contact)
  emailCc?: string[];     // CC recipients
  emailBcc?: string[];    // BCC recipients
  emailReplyMode?: 'reply' | 'reply_all';

  // Attachments
  attachments?: string[]; // Array of URLs from upload endpoint

  // Optional fields
  appointmentId?: string;
  replyMessageId?: string;
  templateId?: string;
  threadId?: string;
  scheduledTimestamp?: number;
  conversationProviderId?: string;
  mentions?: string[];
}
```

**Response**:
```typescript
{
  success: true,
  message: 'Message sent successfully',
  data: any  // Full response from HighLevel
}
```

**Example**:
```javascript
const response = await fetch('/api/ghl?resource=messages&action=send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'Email',
    contactId: 'abc123def456',
    subject: 'Your Property Match - 123 Main St',
    html: '<h1>New Property Match!</h1><p>We found a property for you...</p>',
    attachments: ['https://storage.gohighlevel.com/files/property.pdf']
  })
});

const result = await response.json();
console.log('Email sent:', result);
```

---

## Backend Implementation

The backend API is implemented in [api/ghl/index.ts](api/ghl/index.ts).

### Upload Handler (Lines 1283-1357)

```typescript
if (method === 'POST' && action === 'upload') {
  const { fileData, fileName, fileType } = body;

  // Convert base64 to buffer
  let fileBuffer: Buffer;
  if (typeof fileData === 'string') {
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    fileBuffer = Buffer.from(base64Data, 'base64');
  }

  // Create multipart form data
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('fileAttachment', fileBuffer, {
    filename: fileName || 'attachment.pdf',
    contentType: fileType || 'application/pdf'
  });

  // Upload to HighLevel
  const response = await fetch(`${GHL_API_URL}/conversations/messages/upload`, {
    method: 'POST',
    headers: {
      'Authorization': headers['Authorization'],
      'Version': headers['Version'],
      ...form.getHeaders()
    },
    body: form
  });

  // Return URLs
  return res.json({ success: true, urls: data.urls || data.url });
}
```

### Send Handler (Lines 1194-1302)

```typescript
if (method === 'POST' && action === 'send') {
  const { type, contactId, message, html, subject, attachments, ... } = body;

  // Build message payload
  const messagePayload = {
    type: type || 'Email',
    contactId,
  };

  if (html) messagePayload.html = html;
  if (message) messagePayload.message = message;
  if (subject) messagePayload.subject = subject;
  if (attachments) messagePayload.attachments = attachments;

  // Send to HighLevel
  const response = await fetch(`${GHL_API_URL}/conversations/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(messagePayload)
  });

  return res.json({ success: true, data });
}
```

---

## Frontend Usage

The frontend service is in [src/services/emailApi.ts](src/services/emailApi.ts).

### Basic Usage

```typescript
import { sendPropertyPdfEmail, generatePropertyEmailHtml } from '@/services/emailApi';

// Generate HTML email content
const htmlContent = generatePropertyEmailHtml({
  buyerName: 'John Doe',
  propertyAddress: '123 Main Street',
  propertyCity: 'San Francisco, CA',
  propertyPrice: 750000,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1800,
  matchScore: 95,
  propertyImages: ['https://example.com/property.jpg']
});

// Send email with PDF attachment
await sendPropertyPdfEmail(
  'contact_id_here',           // HighLevel contact ID
  'New Property Match!',       // Email subject
  htmlContent,                 // HTML body
  'base64_pdf_data_here',      // Base64 encoded PDF
  'property-details.pdf'       // PDF filename
);
```

### Advanced Usage

```typescript
import { uploadAttachment, sendEmail } from '@/services/emailApi';

// Step 1: Upload multiple attachments
const pdf1 = await uploadAttachment({
  fileData: 'base64_pdf_1...',
  fileName: 'property-details.pdf',
  fileType: 'application/pdf'
});

const pdf2 = await uploadAttachment({
  fileData: 'base64_pdf_2...',
  fileName: 'floor-plan.pdf',
  fileType: 'application/pdf'
});

// Step 2: Send email with multiple attachments
await sendEmail({
  contactId: 'abc123',
  subject: 'Property Package - 123 Main St',
  html: '<h1>Your Property Package</h1><p>Attached are the details and floor plan.</p>',
  attachments: [
    ...(Array.isArray(pdf1.urls) ? pdf1.urls : [pdf1.urls]),
    ...(Array.isArray(pdf2.urls) ? pdf2.urls : [pdf2.urls])
  ],
  emailCc: ['agent@company.com'],
  emailReplyMode: 'reply_all'
});
```

---

## Complete Example

Here's a complete example of sending a property match email from a React component:

```typescript
import { useState } from 'react';
import { sendPropertyPdfEmail, generatePropertyEmailHtml } from '@/services/emailApi';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function SendPropertyEmail({ match, buyer, property }: Props) {
  const [sending, setSending] = useState(false);

  const handleSendEmail = async () => {
    try {
      setSending(true);

      // 1. Generate PDF from property data (using a library like jsPDF or react-pdf)
      const pdfData = await generatePropertyPdf(property);

      // 2. Generate HTML email content
      const htmlContent = generatePropertyEmailHtml({
        buyerName: buyer.name,
        propertyAddress: property.address,
        propertyCity: property.city,
        propertyPrice: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        sqft: property.sqft,
        matchScore: match.score,
        propertyImages: property.images
      });

      // 3. Send email with PDF attachment
      await sendPropertyPdfEmail(
        buyer.contactId,
        `New Property Match - ${property.address}`,
        htmlContent,
        pdfData, // Base64 encoded PDF
        `property-${property.id}.pdf`
      );

      toast.success('Email sent successfully! 📧');
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Button onClick={handleSendEmail} disabled={sending}>
      {sending ? 'Sending...' : 'Email Property Details'}
    </Button>
  );
}

// Helper function to generate PDF (example using jsPDF)
async function generatePropertyPdf(property: Property): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  // Add property details to PDF
  doc.setFontSize(20);
  doc.text(property.address, 20, 20);
  doc.setFontSize(12);
  doc.text(`Price: $${property.price.toLocaleString()}`, 20, 40);
  doc.text(`Beds: ${property.bedrooms} | Baths: ${property.bathrooms}`, 20, 50);
  doc.text(`Size: ${property.sqft} sqft`, 20, 60);

  // Add images if available
  if (property.images && property.images.length > 0) {
    // Add image to PDF (requires image to be loaded as base64)
    doc.addImage(property.images[0], 'JPEG', 20, 80, 170, 120);
  }

  // Return as base64
  return doc.output('dataurlstring'); // Returns "data:application/pdf;base64,..."
}
```

---

## Troubleshooting

### Error: "fileData is required"

**Cause**: Missing or empty `fileData` in upload request

**Solution**: Ensure you're passing base64 encoded file data:
```typescript
const base64 = await fileToBase64(file);
await uploadAttachment({ fileData: base64, fileName: file.name });
```

### Error: "contactId is required"

**Cause**: Missing `contactId` in send request

**Solution**: Make sure you have the HighLevel contact ID:
```typescript
const contactId = buyer.contactId; // From HighLevel
await sendEmail({ contactId, subject: '...', html: '...' });
```

### Error: "Failed to upload attachment"

**Possible Causes**:
1. File too large (check HighLevel limits)
2. Unsupported file type
3. Invalid base64 encoding
4. API credentials not configured

**Solution**:
```typescript
// Check file size
if (file.size > 10 * 1024 * 1024) { // 10MB
  throw new Error('File too large. Max 10MB.');
}

// Verify file type
const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
if (!allowedTypes.includes(file.type)) {
  throw new Error('Unsupported file type');
}

// Ensure proper base64 encoding
const reader = new FileReader();
reader.readAsDataURL(file);
reader.onload = () => {
  const base64 = reader.result as string;
  // Use base64...
};
```

### Error: "No attachment URL returned from upload"

**Cause**: Unexpected response format from HighLevel

**Solution**: Check the upload response structure:
```typescript
console.log('Upload response:', uploadResult);

// Handle different response formats
let urls: string[] = [];
if (Array.isArray(uploadResult.urls)) {
  urls = uploadResult.urls;
} else if (typeof uploadResult.urls === 'string') {
  urls = [uploadResult.urls];
} else if (uploadResult.data?.url) {
  urls = [uploadResult.data.url];
}
```

### Emails not sending

**Debugging Steps**:

1. **Check API credentials**:
```bash
# Vercel environment variables
GHL_API_KEY=your_key_here
GHL_LOCATION_ID=your_location_id
```

2. **Check contact exists in HighLevel**:
```typescript
const contact = await fetch(`/api/ghl?resource=contacts&id=${contactId}`);
console.log('Contact:', await contact.json());
```

3. **Verify attachment URLs are accessible**:
```typescript
const testUrl = attachments[0];
const response = await fetch(testUrl);
console.log('Attachment accessible:', response.ok);
```

4. **Check HighLevel logs**:
   - Go to HighLevel dashboard
   - Navigate to Conversations
   - Check for failed messages

---

## API Documentation Sources

- [Send a new message](https://marketplace.gohighlevel.com/docs/ghl/conversations/send-a-new-message) - Official HighLevel API docs
- [Upload file attachments](https://marketplace.gohighlevel.com/docs/ghl/conversations/upload-file-attachments) - File upload documentation
- [HighLevel Stoplight Docs](https://highlevel.stoplight.io/docs/integrations) - Interactive API documentation

---

## Next Steps

1. **Generate PDFs**: Implement PDF generation using [jsPDF](https://github.com/parallax/jsPDF) or [react-pdf](https://github.com/diegomura/react-pdf)
2. **Email Templates**: Create reusable email templates for different property types
3. **Batch Sending**: Implement batch email sending for multiple matches
4. **Email Tracking**: Track open rates and click-through rates using HighLevel webhooks
5. **Scheduling**: Schedule emails to be sent at optimal times using `scheduledTimestamp`

---

**Last Updated**: 2025-12-18
**Version**: 1.0
**Maintained By**: Purple Homes Development Team
