import { Check, Loader2, AlertCircle, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';

type OperationStatus = 'pending' | 'processing' | 'complete' | 'failed' | null;
type ReadinessStatus = 'ready' | 'needs-caption' | 'needs-image' | 'demo';

interface BatchPropertyRowProps {
  property: Property;
  isSelected: boolean;
  onToggle: () => void;
  status: OperationStatus;
  readiness: ReadinessStatus;
  disabled?: boolean;
}

export function BatchPropertyRow({
  property,
  isSelected,
  onToggle,
  status,
  readiness,
  disabled = false,
}: BatchPropertyRowProps) {
  // Determine border and background based on status
  const getStatusStyles = () => {
    if (status === 'processing') {
      return 'border-yellow-500 bg-yellow-500/5';
    }
    if (status === 'complete') {
      return 'border-green-500 bg-green-500/5';
    }
    if (status === 'failed') {
      return 'border-red-500 bg-red-500/5';
    }
    if (isSelected) {
      return 'border-primary bg-primary/5';
    }
    return 'border-border hover:border-primary/50';
  };

  // Get readiness badge
  const getReadinessBadge = () => {
    if (status === 'complete') {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <Check className="h-3 w-3 mr-1" />
          Posted
        </Badge>
      );
    }

    if (status === 'failed') {
      return (
        <Badge variant="destructive">
          <X className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }

    switch (readiness) {
      case 'ready':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            Ready
          </Badge>
        );
      case 'needs-caption':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            No caption
          </Badge>
        );
      case 'needs-image':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            No image
          </Badge>
        );
      case 'demo':
        return (
          <Badge variant="secondary">
            Demo
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border-2 transition-all",
        getStatusStyles(),
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        disabled={disabled || property.isDemo || status === 'processing'}
        id={`property-${property.id}`}
      />

      {/* Thumbnail */}
      {property.heroImage && (
        <img
          src={property.heroImage}
          alt={property.propertyCode}
          className="w-16 h-16 rounded object-cover flex-shrink-0"
        />
      )}

      {/* Property Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{property.propertyCode}</span>
          {property.isDemo && (
            <Badge variant="secondary" className="text-xs">
              Demo
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground truncate">
          {property.address}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {property.beds} bed • {property.baths} bath • ${property.price.toLocaleString()}
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {status === 'processing' && (
          <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
        )}
        {getReadinessBadge()}
      </div>
    </div>
  );
}
