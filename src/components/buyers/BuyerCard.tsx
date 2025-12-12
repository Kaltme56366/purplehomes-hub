import { Mail, Phone, MapPin, Send, Bed, Bath, Home, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Buyer } from '@/types';

interface BuyerCardProps {
  buyer: Buyer;
  onClick?: () => void;
  onSendInventory?: (buyer: Buyer) => void;
}

export function BuyerCard({ buyer, onClick, onSendInventory }: BuyerCardProps) {
  const completedItems = buyer.checklist.bcClosing.filter(i => i.completed).length;
  const totalItems = buyer.checklist.bcClosing.length;
  const progressPercent = (completedItems / totalItems) * 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-status-posted/20 text-status-posted';
      case 'qualified': return 'bg-status-scheduled/20 text-status-scheduled';
      case 'pending': return 'bg-status-pending/20 text-status-pending';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card 
      className="transition-all duration-200 hover:border-primary/50 cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg text-foreground">{buyer.name}</h3>
            <Badge className={`mt-1 ${getStatusColor(buyer.status)}`}>
              {buyer.status}
            </Badge>
          </div>
          <Badge variant="secondary" className="text-xs">
            {buyer.dealType}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span className="truncate">{buyer.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{buyer.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{buyer.location}</span>
          </div>
        </div>

        {/* Preferences */}
        <div className="mb-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Looking For</p>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1 text-xs text-foreground">
              <Bed className="h-3 w-3" />
              <span>{buyer.preferences.minBeds}-{buyer.preferences.maxBeds} beds</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-foreground">
              <Bath className="h-3 w-3" />
              <span>{buyer.preferences.minBaths}-{buyer.preferences.maxBaths} baths</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            ${buyer.preferences.minPrice?.toLocaleString()} - ${buyer.preferences.maxPrice?.toLocaleString()}
          </div>
        </div>

        {/* Preferred Zip Codes */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1">Preferred Zip Codes</p>
          <div className="flex flex-wrap gap-1">
            {buyer.preferredZipCodes.slice(0, 3).map((zip) => (
              <Badge key={zip} variant="outline" className="text-xs">
                {zip}
              </Badge>
            ))}
            {buyer.preferredZipCodes.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{buyer.preferredZipCodes.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Matches */}
        <div className="mb-4 flex gap-3">
          <div className="flex-1 p-2 bg-primary/10 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 text-primary">
              <Home className="h-3 w-3" />
              <span className="text-lg font-bold">{buyer.matches.internal}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Internal</p>
          </div>
          <div className="flex-1 p-2 bg-status-scheduled/10 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 text-status-scheduled">
              <ExternalLink className="h-3 w-3" />
              <span className="text-lg font-bold">{buyer.matches.external}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Zillow</p>
          </div>
        </div>

        {/* Closing Checklist Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Closing Checklist</span>
            <span className="font-medium">
              {completedItems}/{totalItems}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Action Button */}
        <Button 
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onSendInventory?.(buyer);
          }}
        >
          <Send className="h-4 w-4 mr-2" />
          Send Inventory
        </Button>
      </CardContent>
    </Card>
  );
}