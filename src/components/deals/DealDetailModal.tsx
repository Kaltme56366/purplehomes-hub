/**
 * DealDetailModal - Wrapper for EnhancedMatchDetailModal for Deal Pipeline
 *
 * Integrates with the deals API for stage changes and activity logging.
 */

import React from 'react';
import { EnhancedMatchDetailModal } from '@/components/matching/EnhancedMatchDetailModal';
import { useUpdateDealStage } from '@/services/dealsApi';
import { useAddMatchActivity, useEditMatchNote, useDeleteMatchNote } from '@/services/matchingApi';
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
  const editNote = useEditMatchNote();
  const deleteNote = useDeleteMatchNote();

  // Track the current GHL relation ID locally
  // This is needed because the deal prop may not update between stage changes
  const currentGhlRelationIdRef = React.useRef<string | undefined>(deal?.ghlRelationId);

  // Update ref when deal changes (e.g., when modal reopens with different deal)
  React.useEffect(() => {
    currentGhlRelationIdRef.current = deal?.ghlRelationId;
  }, [deal?.id, deal?.ghlRelationId]);

  // Handle stage change
  const handleStageChange = async (matchId: string, newStage: MatchDealStage) => {
    if (!deal) return;

    const fromStage = deal.status;
    const previousRelationId = currentGhlRelationIdRef.current;

    try {
      console.log('[DealDetailModal] Changing stage:', {
        dealId: matchId,
        fromStage,
        toStage: newStage,
        ghlRelationId: previousRelationId || '(none)',
      });

      const result = await updateStage.mutateAsync({
        dealId: matchId,
        fromStage,
        toStage: newStage,
        contactId: deal.buyer?.contactId,
        propertyAddress: deal.property?.address,
        opportunityId: deal.property?.opportunityId,
        syncToGhl: true,
        ghlRelationId: previousRelationId, // Pass previous relation ID to delete
      });

      // Update the ref with the new relation ID for subsequent changes
      if (result.ghlRelationId) {
        console.log('[DealDetailModal] Updated local ghlRelationId:', result.ghlRelationId);
        currentGhlRelationIdRef.current = result.ghlRelationId;
      }

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

  // Handle add note - saves to Airtable activities and syncs to GHL contact notes
  const handleAddNote = async (matchId: string, note: string) => {
    if (!deal) return;

    try {
      // 1. Add activity to Airtable
      await addActivity.mutateAsync({
        matchId,
        activity: {
          type: 'note-added',
          details: note,
          metadata: { note },
        },
      });

      // 2. Sync note to GHL if we have a contact ID
      const contactId = deal.buyer?.contactId;
      if (contactId) {
        const propertyAddress = deal.property?.address || 'Unknown Property';
        const noteBody = `Property: ${propertyAddress}\n\n${note}`;

        try {
          const response = await fetch('/api/ghl?resource=notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contactId,
              body: noteBody,
            }),
          });

          if (response.ok) {
            console.log('[DealDetailModal] Note synced to GHL');
            toast.success('Note added & synced to GHL');
          } else {
            console.warn('[DealDetailModal] Failed to sync note to GHL:', await response.text());
            toast.success('Note added (GHL sync failed)');
          }
        } catch (ghlError) {
          console.error('[DealDetailModal] GHL note sync error:', ghlError);
          toast.success('Note added (GHL sync failed)');
        }
      } else {
        toast.success('Note added');
      }
    } catch (error) {
      toast.error('Failed to add note');
      throw error;
    }
  };

  // Handle edit note
  const handleEditNote = async (matchId: string, noteId: string, newText: string) => {
    try {
      await editNote.mutateAsync({
        matchId,
        noteId,
        newText,
      });
      toast.success('Note updated');
    } catch (error) {
      toast.error('Failed to update note');
      throw error;
    }
  };

  // Handle delete note
  const handleDeleteNote = async (matchId: string, noteId: string) => {
    try {
      await deleteNote.mutateAsync({
        matchId,
        noteId,
      });
      toast.success('Note deleted');
    } catch (error) {
      toast.error('Failed to delete note');
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
        notes: deal.notes || [],
      }
    : null;

  return (
    <EnhancedMatchDetailModal
      match={matchData}
      open={open}
      onOpenChange={onOpenChange}
      onStageChange={handleStageChange}
      onAddNote={handleAddNote}
      onEditNote={handleEditNote}
      onDeleteNote={handleDeleteNote}
      onSendEmail={handleSendEmail}
    />
  );
}
