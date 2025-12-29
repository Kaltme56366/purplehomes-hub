/**
 * DealCard - Draggable card for Kanban board
 *
 * Shows property thumbnail, address, buyer, score, and urgency indicator.
 * Supports HTML5 drag-and-drop with quick actions menu.
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MatchScoreBadge } from '@/components/matching/MatchScoreBadge';
import { BuyerAvatar } from '../Shared/BuyerAvatar';
import { BuyerName } from '../Shared/BuyerName';
import { UrgencyIndicator, getUrgencyType } from '../Shared/UrgencyIndicator';
import { formatPipelineValue } from '../Overview/MetricCard';
import { useUpdateDealStage } from '@/services/dealsApi';
import type { Deal } from '@/types/deals';
import { getNextStage, getStageConfig } from '@/types/associations';
import {
  Home,
  GripVertical,
  MoreHorizontal,
  ArrowRight,
  Mail,
  FileText,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface DealCardProps {
  deal: Deal;
  onClick?: () => void;
  isDragging?: boolean;
  onAddNote?: (deal: Deal) => void;
  onSendFollowup?: (deal: Deal) => void;
}

export function DealCard({ deal, onClick, isDragging, onAddNote, onSendFollowup }: DealCardProps) {
  const urgencyType = getUrgencyType(deal.isStale, deal.daysSinceActivity);
  const updateStage = useUpdateDealStage();
  const navigate = useNavigate();

  const nextStage = getNextStage(deal.status);
  const nextStageConfig = nextStage ? getStageConfig(nextStage) : null;

  const handleAdvanceStage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nextStage) return;

    const toastId = toast.loading(`Moving to ${nextStageConfig?.shortLabel || nextStage}...`);

    try {
      const result = await updateStage.mutateAsync({
        dealId: deal.id,
        fromStage: deal.status,
        toStage: nextStage,
        contactId: deal.buyer?.contactId,
        propertyAddress: deal.property?.address,
        opportunityId: deal.property?.opportunityId,
        ghlRelationId: deal.ghlRelationId, // Pass previous relation ID to delete
      });

      toast.success(`Moved to ${nextStageConfig?.shortLabel || nextStage}`, {
        id: toastId,
        action: {
          label: 'Undo',
          onClick: () => {
            updateStage.mutate({
              dealId: deal.id,
              fromStage: nextStage,
              toStage: deal.status,
              contactId: deal.buyer?.contactId,
              propertyAddress: deal.property?.address,
              opportunityId: deal.property?.opportunityId,
              ghlRelationId: result.ghlRelationId, // Pass new relation ID to delete when undoing
            });
          },
        },
      });
    } catch (error) {
      toast.error('Failed to update stage', { id: toastId });
    }
  };

  const handleMarkNotInterested = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const toastId = toast.loading('Marking as not interested...');

    try {
      const result = await updateStage.mutateAsync({
        dealId: deal.id,
        fromStage: deal.status,
        toStage: 'Not Interested',
        contactId: deal.buyer?.contactId,
        propertyAddress: deal.property?.address,
        opportunityId: deal.property?.opportunityId,
        ghlRelationId: deal.ghlRelationId, // Pass previous relation ID to delete
      });

      toast.success('Marked as not interested', {
        id: toastId,
        action: {
          label: 'Undo',
          onClick: () => {
            updateStage.mutate({
              dealId: deal.id,
              fromStage: 'Not Interested',
              toStage: deal.status,
              contactId: deal.buyer?.contactId,
              propertyAddress: deal.property?.address,
              opportunityId: deal.property?.opportunityId,
              ghlRelationId: result.ghlRelationId, // Pass new relation ID to delete when undoing
            });
          },
        },
      });
    } catch (error) {
      toast.error('Failed to update', { id: toastId });
    }
  };

  const handleViewMatchDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/matching?buyerId=${deal.buyer?.contactId}`);
  };

  return (
    <Card
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-all group relative',
        isDragging && 'opacity-50 rotate-2 shadow-lg'
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('deal', JSON.stringify(deal));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onClick}
    >
      {/* Quick Actions Menu */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 bg-background/80 hover:bg-background shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {nextStage && (
              <DropdownMenuItem onClick={handleAdvanceStage}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Advance to {nextStageConfig?.shortLabel || nextStage}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onSendFollowup?.(deal);
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Follow-up
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAddNote?.(deal);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Add Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleViewMatchDetails}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Match Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleMarkNotInterested}
              className="text-red-600 focus:text-red-600"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Not Interested
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Drag handle + Urgency indicator */}
      <div className="flex items-center justify-between mb-2">
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
        <UrgencyIndicator type={urgencyType} />
      </div>

      {/* Property image */}
      {deal.property?.heroImage ? (
        <img
          src={deal.property.heroImage}
          alt=""
          className="w-full h-24 object-cover rounded mb-2"
        />
      ) : (
        <div className="w-full h-24 bg-muted rounded mb-2 flex items-center justify-center">
          <Home className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {/* Property info */}
      <p className="font-medium text-sm truncate">
        {deal.property?.address || 'Unknown Property'}
      </p>
      <p className="text-xs text-muted-foreground truncate mb-2">
        {deal.property?.city}, {deal.property?.state}
        {deal.property?.price && (
          <> &bull; {formatPipelineValue(deal.property.price)}</>
        )}
      </p>

      {/* Buyer info */}
      <div className="flex items-center gap-2 mb-2">
        <BuyerAvatar
          firstName={deal.buyer?.firstName}
          lastName={deal.buyer?.lastName}
          size="sm"
        />
        <BuyerName
          firstName={deal.buyer?.firstName}
          lastName={deal.buyer?.lastName}
          qualified={deal.buyer?.qualified}
          className="text-xs truncate flex-1"
        />
      </div>

      {/* Score and activity */}
      <div className="flex items-center justify-between">
        <MatchScoreBadge score={deal.score} size="sm" />
        <span className="text-xs text-muted-foreground">
          {deal.lastActivityAt
            ? formatDistanceToNow(new Date(deal.lastActivityAt), {
                addSuffix: true,
              })
            : ''}
        </span>
      </div>
    </Card>
  );
}
