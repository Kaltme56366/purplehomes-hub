/**
 * Email API Service
 *
 * Handles sending emails via HighLevel Conversations API with PDF attachments
 */

const GHL_API_BASE = '/api/ghl';

export interface SendEmailParams {
  contactId: string;
  subject: string;
  html?: string;
  message?: string;
  attachments?: string[]; // Array of file URLs
  emailFrom?: string;
  emailTo?: string;
  emailCc?: string[];
  emailBcc?: string[];
  emailReplyMode?: 'reply' | 'reply_all';
}

export interface UploadFileParams {
  fileData: string; // base64 encoded file
  fileName: string;
  fileType?: string;
}

/**
 * Upload a file attachment to HighLevel
 * Returns URL(s) that can be used in email attachments
 */
export async function uploadAttachment(params: UploadFileParams): Promise<{ success: boolean; urls: string[] | string; data: any }> {
  const response = await fetch(`${GHL_API_BASE}?resource=messages&action=upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload attachment');
  }

  return response.json();
}

/**
 * Send an email via HighLevel Conversations API
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; message: string; data: any }> {
  const response = await fetch(`${GHL_API_BASE}?resource=messages&action=send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'Email',
      ...params,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send email');
  }

  return response.json();
}

/**
 * Send property match email with PDF attachment
 *
 * @param contactId - HighLevel contact ID
 * @param subject - Email subject
 * @param htmlContent - HTML email body
 * @param pdfData - Base64 encoded PDF data (with or without data URL prefix)
 * @param pdfFileName - Name for the PDF file
 */
export async function sendPropertyPdfEmail(
  contactId: string,
  subject: string,
  htmlContent: string,
  pdfData: string,
  pdfFileName: string = 'property.pdf'
): Promise<{ success: boolean; message: string }> {
  try {
    // Step 1: Upload the PDF attachment
    console.log('[Email API] Uploading PDF attachment...');
    const uploadResult = await uploadAttachment({
      fileData: pdfData,
      fileName: pdfFileName,
      fileType: 'application/pdf',
    });

    console.log('[Email API] Upload result:', uploadResult);

    // Extract URLs from upload response
    let attachmentUrls: string[] = [];
    if (Array.isArray(uploadResult.urls)) {
      attachmentUrls = uploadResult.urls;
    } else if (typeof uploadResult.urls === 'string') {
      attachmentUrls = [uploadResult.urls];
    } else if (uploadResult.data?.urls) {
      attachmentUrls = Array.isArray(uploadResult.data.urls)
        ? uploadResult.data.urls
        : [uploadResult.data.urls];
    } else if (uploadResult.data?.url) {
      attachmentUrls = [uploadResult.data.url];
    }

    if (attachmentUrls.length === 0) {
      throw new Error('No attachment URL returned from upload');
    }

    console.log('[Email API] Attachment URLs:', attachmentUrls);

    // Step 2: Send the email with the attachment
    console.log('[Email API] Sending email with attachment...');
    const sendResult = await sendEmail({
      contactId,
      subject,
      html: htmlContent,
      attachments: attachmentUrls,
    });

    console.log('[Email API] Email sent successfully');
    return {
      success: true,
      message: 'Email sent successfully with PDF attachment',
    };
  } catch (error) {
    console.error('[Email API] Error:', error);
    throw error;
  }
}

/**
 * Generate property match email HTML template
 */
export function generatePropertyEmailHtml(params: {
  buyerName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyPrice: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  matchScore: number;
  propertyImages?: string[];
}): string {
  const {
    buyerName,
    propertyAddress,
    propertyCity,
    propertyPrice,
    bedrooms,
    bathrooms,
    sqft,
    matchScore,
    propertyImages = [],
  } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Property Match</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">🏠 New Property Match!</h1>
    <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">We found a property that matches your preferences</p>
  </div>

  <div style="background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">

    <p style="font-size: 18px; margin: 0 0 20px;">Hi ${buyerName},</p>

    <p style="font-size: 16px; margin: 0 0 20px;">
      Great news! We found a property that's a <strong style="color: #667eea;">${matchScore}% match</strong> for your preferences.
    </p>

    ${propertyImages.length > 0 ? `
    <div style="margin: 20px 0; border-radius: 8px; overflow: hidden;">
      <img src="${propertyImages[0]}" alt="Property" style="width: 100%; height: auto; display: block;">
    </div>
    ` : ''}

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h2 style="margin: 0 0 15px; font-size: 22px; color: #111827;">${propertyAddress}</h2>
      <p style="margin: 0 0 15px; color: #6b7280; font-size: 16px;">${propertyCity}</p>

      <div style="display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 6px;">
        <div style="text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #667eea;">🛏️ ${bedrooms}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Bedrooms</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #667eea;">🚿 ${bathrooms}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Bathrooms</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #667eea;">📏 ${sqft.toLocaleString()}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Sq Ft</div>
        </div>
      </div>

      <div style="margin: 20px 0; padding: 15px; background: #667eea; color: white; border-radius: 6px; text-align: center;">
        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Price</div>
        <div style="font-size: 32px; font-weight: bold;">$${propertyPrice.toLocaleString()}</div>
      </div>
    </div>

    <p style="font-size: 16px; margin: 20px 0;">
      📎 <strong>Attached:</strong> Complete property details and photos in PDF format
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background: #667eea; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
        Schedule a Viewing
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 14px; color: #6b7280; margin: 0;">
      Have questions? Reply to this email or give us a call. We're here to help!
    </p>

    <p style="font-size: 14px; color: #6b7280; margin: 15px 0 0;">
      Best regards,<br>
      <strong>Purple Homes Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;">
    <p style="margin: 0;">You're receiving this email because you're looking for properties in your area.</p>
    <p style="margin: 5px 0 0;">© ${new Date().getFullYear()} Purple Homes. All rights reserved.</p>
  </div>

</body>
</html>
  `.trim();
}
