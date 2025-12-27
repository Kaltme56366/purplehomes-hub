/**
 * DealDetailModal - Wrapper for EnhancedMatchDetailModal for Deal Pipeline
 *
 * Integrates with the deals API for stage changes and activity logging.
 */

import { EnhancedMatchDetailModal } from '@/components/matching/EnhancedMatchDetailModal';
import { useUpdateDealStage } from '@/services/dealsApi';
import { useAddMatchActivity } from '@/services/matchingApi';
import type { Deal } from '@/types/deals';
import type { MatchDealStage } from '@/types/associations';
import { toast } from 'sonner';

interface DealDetailModalProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DealDetailModal({
  deal,
  open,
  onOpenChange,
}: DealDetailModalProps) {
  const updateStage = useUpdateDealStage();
  const addActivity = useAddMatchActivity();

  // Handle stage change
  const handleStageChange = async (matchId: string, newStage: MatchDealStage) => {
    if (!deal) return;

    const fromStage = deal.status;

    try {
      console.log('[DealDetailModal] Changing stage:', {
        dealId: matchId,
        fromStage,
        toStage: newStage,
        ghlRelationId: deal.ghlRelationId || '(none)',
        dealObject: deal,
      });

      const result = await updateStage.mutateAsync({
        dealId: matchId,
        fromStage,
        toStage: newStage,
        contactId: deal.buyer?.contactId,
        propertyAddress: deal.property?.address,
        opportunityId: deal.property?.opportunityId,
        syncToGhl: true,
        ghlRelationId: deal.ghlRelationId, // Pass previous relation ID to delete
      });

      toast.success(
        `Stage updated to ${newStage}${result.ghlRelationId ? ' (synced to GHL)' : ''}`,
        {
          duration: 5000,
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                await updateStage.mutateAsync({
                  dealId: matchId,
                  fromStage: newStage,
                  toStage: fromStage,
                  contactId: deal.buyer?.contactId,
                  propertyAddress: deal.property?.address,
                  opportunityId: deal.property?.opportunityId,
                  syncToGhl: true,
                  ghlRelationId: result.ghlRelationId, // Pass new relation ID to delete when undoing
                });
                toast.success('Undone');
              } catch {
                toast.error('Failed to undo');
              }
            },
          },
        }
      );
    } catch (error) {
      toast.error('Failed to update stage');
      throw error;
    }
  };

  // Handle add note
  const handleAddNote = async (matchId: string, note: string) => {
    try {
      await addActivity.mutateAsync({
        matchId,
        activity: {
          type: 'note-added',
          details: note,
          metadata: { note },
        },
      });
      toast.success('Note added');
    } catch (error) {
      toast.error('Failed to add note');
      throw error;
    }
  };

  // Handle send email (placeholder - would open email modal)
  const handleSendEmail = async (matchId: string) => {
    // This would typically open an email composition modal
    // For now, just log the action
    try {
      await addActivity.mutateAsync({
        matchId,
        activity: {
          type: 'email-sent',
          details: 'Follow-up email sent',
        },
      });
      toast.success('Email action logged');
    } catch (error) {
      toast.error('Failed to log email');
      throw error;
    }
  };

  // Convert Deal to MatchWithDetails format
  const matchData = deal
    ? {
        ...deal,
        property: deal.property,
        buyer: deal.buyer,
        activities: deal.activities || [],
      }
    : null;

  return (
    <EnhancedMatchDetailModal
      match={matchData}
      open={open}
      onOpenChange={onOpenChange}
      onStageChange={handleStageChange}
      onAddNote={handleAddNote}
      onSendEmail={handleSendEmail}
    />
  );
}
