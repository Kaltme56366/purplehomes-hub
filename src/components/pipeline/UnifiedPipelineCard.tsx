/**
 * UnifiedPipelineCard - Unified card for all pipeline boards
 *
 * Based on Deal Pipeline's DealCard design:
 * - Optional image/thumbnail
 * - Drag handle on hover
 * - Quick actions dropdown menu
 * - Consistent layout and styling
 */

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GripVertical,
  MoreHorizontal,
  ArrowRight,
  XCircle,
  MapPin,
  DollarSign,
  Calendar,
  User,
  Building2,
  Home,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface UnifiedPipelineCardProps {
  // Core data
  id: string;
  title: string;
  subtitle?: string;

  // Optional image
  imageUrl?: string;
  imageFallbackIcon?: 'home' | 'user' | 'building';

  // Location
  location?: string;

  // Money/Value
  amount?: number;
  amountLabel?: string;

  // Type/Category badge
  type?: string;
  typeBadgeVariant?: 'default' | 'secondary' | 'outline';

  // Date
  date?: string;
  dateFormat?: 'relative' | 'absolute';

  // Status/Urgency indicator
  statusBadge?: ReactNode;

  // Additional badges
  extraBadges?: ReactNode;

  // Actions
  onClick?: () => void;
  onAdvance?: () => void;
  advanceLabel?: string;
  onMarkLost?: () => void;
  lostLabel?: string;
  customActions?: Array<{
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    destructive?: boolean;
  }>;

  // Styling
  isDragging?: boolean;
  variant?: 'property' | 'contact' | 'default';
}

export function UnifiedPipelineCard({
  id,
  title,
  subtitle,
  imageUrl,
  imageFallbackIcon = 'home',
  location,
  amount,
  amountLabel,
  type,
  typeBadgeVariant = 'outline',
  date,
  dateFormat = 'relative',
  statusBadge,
  extraBadges,
  onClick,
  onAdvance,
  advanceLabel = 'Move to Next Stage',
  onMarkLost,
  lostLabel = 'Mark as Lost',
  customActions = [],
  isDragging = false,
  variant = 'default',
}: UnifiedPipelineCardProps) {
  const FallbackIcon = {
    home: Home,
    user: User,
    building: Building2,
  }[imageFallbackIcon];

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (dateFormat === 'relative') {
        return formatDistanceToNow(d, { addSuffix: true });
      }
      return format(d, 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const hasActions = onAdvance || onMarkLost || customActions.length > 0;

  return (
    <Card
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-all group relative',
        isDragging && 'opacity-50 rotate-2 shadow-lg'
      )}
      onClick={onClick}
    >
      {/* Quick Actions Menu */}
      {hasActions && (
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
              {onAdvance && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvance();
                  }}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {advanceLabel}
                </DropdownMenuItem>
              )}

              {customActions.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  className={cn(action.destructive && 'text-red-600 focus:text-red-600')}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}

              {onMarkLost && (
                <>
                  {(onAdvance || customActions.length > 0) && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkLost();
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {lostLabel}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Drag handle + Status indicator */}
      <div className="flex items-center justify-between mb-2">
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
        {statusBadge}
      </div>

      {/* Image (optional - for property-based cards) */}
      {variant === 'property' && (
        <>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="w-full h-24 object-cover rounded mb-2"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-24 bg-muted rounded mb-2 flex items-center justify-center">
              <FallbackIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </>
      )}

      {/* Title */}
      <p className="font-medium text-sm truncate">{title}</p>

      {/* Subtitle with icon */}
      {subtitle && (
        <div className="flex items-center gap-1 mt-0.5">
          {variant === 'contact' ? (
            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          ) : variant === 'property' ? (
            <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          ) : null}
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
      )}

      {/* Location */}
      {location && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      )}

      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap mt-2">
        {amount !== undefined && (
          <Badge variant="secondary" className="text-xs font-medium">
            <DollarSign className="h-3 w-3 mr-0.5" />
            {formatAmount(amount)}
            {amountLabel && <span className="ml-1 text-muted-foreground">{amountLabel}</span>}
          </Badge>
        )}
        {type && (
          <Badge variant={typeBadgeVariant} className="text-xs">
            {type}
          </Badge>
        )}
        {extraBadges}
      </div>

      {/* Date */}
      {date && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(date)}</span>
        </div>
      )}
    </Card>
  );
}

export default UnifiedPipelineCard;
