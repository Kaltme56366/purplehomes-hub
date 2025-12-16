import { useNavigate } from 'react-router-dom';
import { Bed, Bath, Clock, Square } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';
import { format } from 'date-fns';

interface PropertyCardProps {
  property: Property;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onViewDetail?: (property: Property) => void;
}

export function PropertyCard({
  property,
  selected,
  onSelect,
  onViewDetail,
}: PropertyCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (onViewDetail) {
      onViewDetail(property);
    } else {
      navigate(`/properties/${property.id}`);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const showPostedDate = property.status === 'posted' && property.postedDate;
  const showScheduledDate = property.status === 'scheduled' && property.scheduledDate;

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200 hover:border-primary/50 cursor-pointer group",
        selected && "ring-2 ring-primary border-primary",
        property.status === 'deleted' && "opacity-60"
      )}
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={property.heroImage}
          alt={property.address}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Top badges row */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-black/60 backdrop-blur-sm px-2 py-1 text-xs font-medium text-white">
              {property.propertyCode}
            </span>
            {property.isDemo && (
              <span className="inline-flex items-center rounded-md bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                DEMO
              </span>
            )}
          </div>
          
          {/* Selection Checkbox */}
          {onSelect && (
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selected}
                onCheckedChange={() => onSelect(property.id)}
                className={cn(
                  "h-5 w-5 rounded-full border-2 transition-all",
                  selected 
                    ? "bg-primary border-primary" 
                    : "bg-black/40 border-white/60 hover:border-white"
                )}
              />
            </div>
          )}
        </div>

        {/* Bottom info on image */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-end justify-between">
            <div>
              <StatusBadge status={property.status} />
              {showPostedDate && (
                <span className="ml-2 text-xs text-white/80">
                  {format(new Date(property.postedDate!), 'MMM d')}
                </span>
              )}
              {showScheduledDate && (
                <span className="ml-2 text-xs text-white/80 flex items-center gap-1 inline-flex">
                  <Clock className="h-3 w-3" />
                  {format(new Date(property.scheduledDate!), 'MMM d')}
                </span>
              )}
            </div>
            {property.propertyType && (
              <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white text-xs">
                {property.propertyType}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Address */}
        <h3 className="font-semibold text-foreground mb-0.5 truncate">
          {property.address}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">{property.city}</p>

        {/* Price */}
        <div className="mb-3">
          <p className="text-2xl font-bold text-foreground">
            {formatPrice(property.price)}
          </p>
          {property.downPayment !== undefined && (
            <p className="text-sm text-muted-foreground mt-1">
              Down: {formatPrice(property.downPayment)}
            </p>
          )}
        </div>

        {/* Property details row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Bed className="h-4 w-4" />
            {property.beds}
          </span>
          <span className="flex items-center gap-1.5">
            <Bath className="h-4 w-4" />
            {property.baths}
          </span>
          {property.sqft && (
            <span className="flex items-center gap-1.5">
              <Square className="h-4 w-4" />
              {property.sqft.toLocaleString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
