/**
 * Email Property Button Component
 *
 * Allows sending property PDFs via email with proper data isolation
 * Supports both individual and bulk email sending
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { sendPropertyPdfEmail, generatePropertyEmailHtml } from '@/services/emailApi';
import { generatePropertyPdf, generateBulkPropertyPdfs } from '@/lib/propertyPdfGenerator';
import type { PropertyData, BuyerData, MatchData } from '@/lib/propertyPdfGenerator';
import { Mail, Loader2 } from 'lucide-react';

interface EmailPropertyButtonProps {
  buyer: BuyerData;
  property: PropertyData;
  match: MatchData;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

/**
 * Single Property Email Button
 * Use this for individual property-buyer pairs
 */
export function EmailPropertyButton({
  buyer,
  property,
  match,
  variant = 'outline',
  size = 'sm'
}: EmailPropertyButtonProps) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    try {
      setSending(true);

      console.log(`[Email] Sending property ${property.propertyCode} to ${buyer.name}...`);

      // Step 1: Generate PDF for this specific buyer-property pair
      const pdfData = await generatePropertyPdf(property, buyer, match);

      console.log('[Email] PDF generated, size:', pdfData.length, 'bytes');

      // Step 2: Generate HTML email content
      const htmlContent = generatePropertyEmailHtml({
        buyerName: buyer.name,
        propertyAddress: property.address,
        propertyCity: `${property.city}, ${property.state}`,
        propertyPrice: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        sqft: property.sqft,
        matchScore: match.score,
        propertyImages: property.images
      });

      // Step 3: Send email with PDF attachment
      await sendPropertyPdfEmail(
        buyer.contactId,
        `New Property Match - ${property.address}`,
        htmlContent,
        pdfData,
        `property-${property.propertyCode}.pdf`
      );

      toast.success(`Email sent to ${buyer.name}! 📧`);
      console.log('[Email] ✓ Email sent successfully');
    } catch (error) {
      console.error('[Email] ✗ Failed to send email:', error);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      onClick={handleSend}
      disabled={sending}
      variant={variant}
      size={size}
    >
      {sending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Email Property
        </>
      )}
    </Button>
  );
}

interface BulkEmailButtonProps {
  matches: Array<{ buyer: BuyerData; property: PropertyData; match: MatchData }>;
  onComplete?: () => void;
}

/**
 * Bulk Email Button
 * Use this for sending multiple properties to multiple buyers
 *
 * IMPORTANT: Each buyer-property pair gets a unique PDF to prevent data mixing
 */
export function BulkEmailButton({ matches, onComplete }: BulkEmailButtonProps) {
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleBulkSend = async () => {
    if (matches.length === 0) {
      toast.error('No matches selected');
      return;
    }

    try {
      setSending(true);
      setProgress(0);

      console.log(`[Bulk Email] Sending ${matches.length} emails...`);

      // Step 1: Generate PDFs for all buyer-property pairs
      toast.info(`Generating ${matches.length} PDFs...`);

      const pdfs = await generateBulkPropertyPdfs(matches);

      console.log(`[Bulk Email] Generated ${pdfs.length} PDFs`);

      if (pdfs.length === 0) {
        throw new Error('Failed to generate any PDFs');
      }

      setProgress(33);

      // Step 2: Send emails one by one (with proper data isolation)
      toast.info(`Sending ${pdfs.length} emails...`);

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < pdfs.length; i++) {
        const { buyer, property, pdfData } = pdfs[i];

        try {
          console.log(`[Bulk Email] Sending ${i + 1}/${pdfs.length} to ${buyer.name}...`);

          // Generate HTML for this specific buyer
          const htmlContent = generatePropertyEmailHtml({
            buyerName: buyer.name,
            propertyAddress: property.address,
            propertyCity: `${property.city}, ${property.state}`,
            propertyPrice: property.price,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            sqft: property.sqft,
            matchScore: pdfs[i].match?.score || 0,
            propertyImages: property.images
          });

          // Send email with this buyer's specific PDF
          await sendPropertyPdfEmail(
            buyer.contactId,
            `New Property Match - ${property.address}`,
            htmlContent,
            pdfData, // UNIQUE PDF for this buyer-property pair
            `property-${property.propertyCode}.pdf`
          );

          successCount++;
          console.log(`[Bulk Email] ✓ Email ${i + 1}/${pdfs.length} sent to ${buyer.name}`);

          // Update progress
          setProgress(33 + ((i + 1) / pdfs.length) * 67);

          // Add small delay to avoid rate limiting (200ms between emails)
          if (i < pdfs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          failCount++;
          console.error(`[Bulk Email] ✗ Failed to send to ${buyer.name}:`, error);
          // Continue with remaining emails
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`Sent ${successCount} email${successCount > 1 ? 's' : ''} successfully! 📧`);
      }

      if (failCount > 0) {
        toast.error(`${failCount} email${failCount > 1 ? 's' : ''} failed to send`);
      }

      console.log(`[Bulk Email] Complete: ${successCount} success, ${failCount} failed`);

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('[Bulk Email] ✗ Bulk send failed:', error);
      toast.error('Failed to send bulk emails. Please try again.');
    } finally {
      setSending(false);
      setProgress(0);
    }
  };

  return (
    <Button
      onClick={handleBulkSend}
      disabled={sending || matches.length === 0}
      variant="default"
    >
      {sending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending ({Math.round(progress)}%)...
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Send {matches.length} Email{matches.length !== 1 ? 's' : ''}
        </>
      )}
    </Button>
  );
}

/**
 * Example usage in Matching page:
 *
 * // Individual button per match
 * <EmailPropertyButton
 *   buyer={{ id: '...', contactId: '...', name: 'John Doe', email: '...' }}
 *   property={{ id: '...', propertyCode: 'ABC123', address: '123 Main St', ... }}
 *   match={{ score: 95, isPriority: true, distance: 5, ... }}
 * />
 *
 * // Bulk send selected matches
 * const [selectedMatches, setSelectedMatches] = useState([]);
 *
 * <BulkEmailButton
 *   matches={selectedMatches}
 *   onComplete={() => setSelectedMatches([])}
 * />
 */
