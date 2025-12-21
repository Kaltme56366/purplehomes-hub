import { useState } from 'react';
import { Send, FileText, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { sendPropertyEmail } from '@/services/emailService';
import { convertPropertyDetailsToProperty } from '@/lib/propertyTypeAdapter';
import type { ScoredProperty, BuyerCriteria } from '@/types/matching';

interface SendPropertiesModalProps {
  buyer: BuyerCriteria;
  properties: ScoredProperty[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendSuccess?: () => void;
}

export function SendPropertiesModal({
  buyer,
  properties,
  open,
  onOpenChange,
  onSendSuccess,
}: SendPropertiesModalProps) {
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      // Convert properties for email service
      const convertedProperties = properties.map(sp =>
        convertPropertyDetailsToProperty(sp.property)
      );

      // Send email with PDF
      await sendPropertyEmail({
        contactId: buyer.contactId,
        contactName: `${buyer.firstName} ${buyer.lastName}`,
        contactEmail: buyer.email,
        properties: convertedProperties,
        subject: `Your ${properties.length} Matched Properties from Purple Homes`,
        customMessage: customMessage || undefined,
      });

      toast.success(
        `Successfully sent ${properties.length} ${properties.length === 1 ? 'property' : 'properties'} to ${buyer.firstName} ${buyer.lastName}!`,
        { description: `Email sent to ${buyer.email}` }
      );

      // Call success callback
      onSendSuccess?.();

      // Close modal
      onOpenChange(false);

      // Reset form
      setCustomMessage('');
    } catch (error) {
      console.error('Failed to send properties:', error);
      toast.error('Failed to send properties', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Properties to {buyer.firstName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recipient Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium">Recipient:</p>
            <p className="text-sm text-muted-foreground">
              {buyer.firstName} {buyer.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{buyer.email}</p>
          </div>

          {/* Properties Count */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm font-medium text-purple-900">
              <FileText className="h-4 w-4 inline mr-1" />
              {properties.length} {properties.length === 1 ? 'Property' : 'Properties'} Selected
            </p>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="custom-message">
              Custom Message (Optional)
            </Label>
            <Textarea
              id="custom-message"
              placeholder="Add a personal note to include in the email..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground">
            A PDF with property details will be automatically generated and attached to the email.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
