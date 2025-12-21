import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  MapPin,
  Bed,
  Bath,
  Square,
  DollarSign,
  Save,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { ZillowTypeBadge } from './ZillowTypeBadge';
import type { ZillowListing, ZillowSearchType } from '@/types/zillow';

interface ZillowPropertyCardProps {
  listing: ZillowListing;
  searchType: ZillowSearchType;
  onSave: (listing: ZillowListing) => void;
  isSaved?: boolean;
}

/**
 * ZillowPropertyCard - Display external Zillow listing with save action
 *
 * Shows properties from Zillow search that are NOT yet in the system.
 * Allows user to save the property to Airtable.
 */
export function ZillowPropertyCard({
  listing,
  searchType,
  onSave,
  isSaved = false,
}: ZillowPropertyCardProps) {
  return (
    <Card className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex gap-4">
        {/* Property Image */}
        <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center">
          {listing.images && listing.images[0] ? (
            <img
              src={listing.images[0]}
              alt={listing.address}
              className="w-full h-full object-cover"
            />
          ) : (
            <Home className="h-8 w-8 text-teal-300" />
          )}
        </div>

        {/* Property Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{listing.address}</h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {listing.city}, {listing.state} {listing.zipCode}
                </span>
              </p>
            </div>

            <ZillowTypeBadge type={searchType} size="sm" />
          </div>

          {/* Property Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <DollarSign className="h-3 w-3" />
              {listing.price.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3" />
              {listing.beds}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" />
              {listing.baths}
            </span>
            {listing.sqft && (
              <span className="flex items-center gap-1">
                <Square className="h-3 w-3" />
                {listing.sqft.toLocaleString()}
              </span>
            )}
          </div>

          {/* Days on Market (if available) */}
          {listing.daysOnMarket && listing.daysOnMarket > 0 && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {listing.daysOnMarket} days on market
              </Badge>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(listing.zillowUrl, '_blank')}
              className="text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View on Zillow
            </Button>

            {isSaved ? (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Saved
              </Badge>
            ) : (
              <Button
                size="sm"
                onClick={() => onSave(listing)}
                className="text-xs bg-purple-600 hover:bg-purple-700"
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
