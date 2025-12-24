import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
import { syncMatchStageToGhl } from '@/services/ghlAssociationsApi';
import { STAGE_ASSOCIATION_IDS } from '@/types/associations';
import type { ScoredProperty, BuyerCriteria, MatchActivity } from '@/types/matching';

const AIRTABLE_API_BASE = '/api/airtable';

interface SendPropertiesModalProps {
  buyer: BuyerCriteria;
  properties: ScoredProperty[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendSuccess?: () => void;
}

/**
 * Update or create match records when properties are sent
 * This is the "trigger" that moves matches into the Deal Pipeline
 */
async function updateMatchStages(
  buyer: BuyerCriteria,
  properties: ScoredProperty[],
  customMessage?: string
): Promise<{ updated: number; created: number; synced: number }> {
  let updated = 0;
  let created = 0;
  let synced = 0;

  for (const sp of properties) {
    try {
      const newActivity: MatchActivity = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'email-sent',
        timestamp: new Date().toISOString(),
        details: `Properties email sent to ${buyer.firstName} ${buyer.lastName}`,
        metadata: {
          recipientEmail: buyer.email,
          propertyCount: properties.length,
          customMessage: customMessage || undefined,
        },
      };

      if (sp.matchId) {
        // Update existing match record
        // First, get current activities
        const getResponse = await fetch(
          `${AIRTABLE_API_BASE}?action=get-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${sp.matchId}`
        );

        let currentActivities: MatchActivity[] = [];
        if (getResponse.ok) {
          const currentMatch = await getResponse.json();
          try {
            currentActivities = currentMatch.record?.fields?.Activities
              ? JSON.parse(currentMatch.record.fields.Activities)
              : [];
          } catch {
            currentActivities = [];
          }
        }

        // Update the match with new stage and activity
        const updateResponse = await fetch(
          `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${sp.matchId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                'Match Stage': 'Sent to Buyer',
                Activities: JSON.stringify([...currentActivities, newActivity]),
              },
            }),
          }
        );

        if (updateResponse.ok) {
          updated++;
        }
      } else {
        // Create new match record
        const createResponse = await fetch(
          `${AIRTABLE_API_BASE}?action=create-record&table=${encodeURIComponent('Property-Buyer Matches')}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                'Contact ID': [buyer.recordId], // Link to buyer record
                'Property Code': [sp.property.recordId], // Link to property record
                'Match Score': sp.score.score,
                'Match Notes': sp.score.reasoning || '',
                'Match Status': 'Active',
                'Match Stage': 'Sent to Buyer',
                'Is Priority': sp.score.isPriority || false,
                'Distance': sp.score.distanceMiles || null,
                Activities: JSON.stringify([newActivity]),
              },
            }),
          }
        );

        if (createResponse.ok) {
          created++;
        }
      }

      // Sync to GHL
      try {
        const relationId = await syncMatchStageToGhl({
          stage: 'Sent to Buyer',
          contactId: buyer.contactId,
          propertyAddress: sp.property.address,
          opportunityId: sp.property.opportunityId,
          stageAssociationIds: STAGE_ASSOCIATION_IDS,
        });

        if (relationId) {
          synced++;
          // Optionally update the match record with GHL relation ID
          // (skipping for now to reduce API calls)
        }
      } catch (ghlError) {
        console.warn('[SendProperties] GHL sync failed for property:', sp.property.address, ghlError);
        // Don't fail the whole operation if GHL sync fails
      }
    } catch (error) {
      console.error('[SendProperties] Failed to update match for property:', sp.property.address, error);
    }
  }

  return { updated, created, synced };
}

export function SendPropertiesModal({
  buyer,
  properties,
  open,
  onOpenChange,
  onSendSuccess,
}: SendPropertiesModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      // Convert properties for email service
      const convertedProperties = properties.map(sp =>
        convertPropertyDetailsToProperty(sp.property)
      );

      // Step 1: Send email with PDF
      await sendPropertyEmail({
        contactId: buyer.contactId,
        contactName: `${buyer.firstName} ${buyer.lastName}`,
        contactEmail: buyer.email,
        properties: convertedProperties,
        subject: `Your ${properties.length} Matched Properties from Purple Homes`,
        customMessage: customMessage || undefined,
      });

      // Step 2: Update match stages (this creates deals in the pipeline)
      const { updated, created, synced } = await updateMatchStages(
        buyer,
        properties,
        customMessage
      );

      console.log(`[SendProperties] Updated ${updated} matches, created ${created} new matches, synced ${synced} to GHL`);

      // Step 3: Invalidate queries so UI updates
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-buyer'] });
      queryClient.invalidateQueries({ queryKey: ['stale-deals'] });
      queryClient.invalidateQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-properties'] });
      queryClient.invalidateQueries({ queryKey: ['cache', 'matches'] });

      // Step 4: Show success toast with View in Pipeline action
      toast.success(
        `Sent ${properties.length} ${properties.length === 1 ? 'property' : 'properties'} to ${buyer.firstName}!`,
        {
          description: synced > 0
            ? `Email sent • ${updated + created} deals added to pipeline • Synced to GHL`
            : `Email sent • ${updated + created} deals added to pipeline`,
          duration: 6000,
          action: {
            label: 'View in Pipeline',
            onClick: () => navigate('/deals'),
          },
        }
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
            <p className="text-xs text-purple-700 mt-1">
              These will be added to your Deal Pipeline after sending
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
