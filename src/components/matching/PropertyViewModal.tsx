import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  MapPin,
  Bed,
  Bath,
  Square,
} from 'lucide-react';
import { MatchScoreBadge } from './MatchScoreBadge';
import { SourceBadge } from './SourceBadge';
import { ZillowTypeBadge } from './ZillowTypeBadge';
import type { ScoredProperty } from '@/types/matching';

interface PropertyViewModalProps {
  scoredProperty: ScoredProperty | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PropertyViewModal({
  scoredProperty,
  open,
  onOpenChange,
}: PropertyViewModalProps) {
  if (!scoredProperty) return null;

  const { property, score } = scoredProperty;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Property Details</DialogTitle>
        </DialogHeader>

        {/* Hero Image */}
        <div className="w-full h-64 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
          {property.heroImage ? (
            <img
              src={property.heroImage}
              alt={property.address}
              className="w-full h-full object-cover"
            />
          ) : (
            <Home className="h-24 w-24 text-purple-300" />
          )}
        </div>

        {/* Address & Location */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">{property.address}</h3>
          <p className="text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {property.city}
            {property.state && `, ${property.state}`}
            {property.zipCode && ` ${property.zipCode}`}
          </p>
        </div>

        {/* Price */}
        {property.price && (
          <div className="text-3xl font-bold text-purple-600">
            ${property.price.toLocaleString()}
          </div>
        )}

        {/* Property Stats */}
        <div className="grid grid-cols-3 gap-4 py-4 border-y">
          <div className="text-center">
            <Bed className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <div className="font-semibold">{property.beds}</div>
            <div className="text-sm text-muted-foreground">Bedrooms</div>
          </div>
          <div className="text-center">
            <Bath className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <div className="font-semibold">{property.baths}</div>
            <div className="text-sm text-muted-foreground">Bathrooms</div>
          </div>
          {property.sqft && (
            <div className="text-center">
              <Square className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="font-semibold">{property.sqft.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Sq Ft</div>
            </div>
          )}
        </div>

        {/* Match Score & Distance */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Match Score:</span>
            <MatchScoreBadge score={score.score} size="md" />
          </div>
          {score.distanceMiles !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Distance:</span>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                <MapPin className="h-3 w-3 mr-1" />
                {score.distanceMiles <= 1
                  ? '< 1 mi'
                  : score.distanceMiles < 10
                  ? `${score.distanceMiles.toFixed(1)} mi`
                  : `${Math.round(score.distanceMiles)} mi`}
              </Badge>
            </div>
          )}
        </div>

        {/* Source Badges */}
        <div className="flex gap-2 flex-wrap">
          {property.source && <SourceBadge source={property.source} size="md" />}
          {property.source === 'Zillow' && property.zillowType && (
            <ZillowTypeBadge type={property.zillowType} size="md" />
          )}
        </div>

        {/* Location Reasoning */}
        {score.locationReason && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-1">Location Match:</p>
            <p className="text-sm text-muted-foreground">{score.locationReason}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
