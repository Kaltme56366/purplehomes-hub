/**
 * DealCard - Draggable card for Kanban board
 *
 * Shows property thumbnail, address, buyer, score, and urgency indicator.
 * Supports HTML5 drag-and-drop.
 */

import { Card } from '@/components/ui/card';
import { MatchScoreBadge } from '@/components/matching/MatchScoreBadge';
import { BuyerAvatar } from '../Shared/BuyerAvatar';
import { UrgencyIndicator, getUrgencyType } from '../Shared/UrgencyIndicator';
import { formatPipelineValue } from '../Overview/MetricCard';
import type { Deal } from '@/types/deals';
import { Home, GripVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface DealCardProps {
  deal: Deal;
  onClick?: () => void;
  isDragging?: boolean;
}

export function DealCard({ deal, onClick, isDragging }: DealCardProps) {
  const urgencyType = getUrgencyType(deal.isStale, deal.daysSinceActivity);

  return (
    <Card
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-all group',
        isDragging && 'opacity-50 rotate-2 shadow-lg'
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('deal', JSON.stringify(deal));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onClick}
    >
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
        <span className="text-xs truncate flex-1">
          {deal.buyer?.firstName} {deal.buyer?.lastName}
        </span>
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
