import { Mail, Phone, MapPin, Bed, Bath, Home, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Buyer } from '@/types';

interface BuyerKanbanCardProps {
  buyer: Buyer;
  onClick: () => void;
}

export function BuyerKanbanCard({ buyer, onClick }: BuyerKanbanCardProps) {
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
      className="cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-foreground truncate">{buyer.name}</h4>
          <Badge className={`text-xs ${getStatusColor(buyer.status)}`}>
            {buyer.status}
          </Badge>
        </div>
        
        <Badge variant="outline" className="text-xs mb-3">
          {buyer.dealType}
        </Badge>

        {/* Preferences */}
        <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Bed className="h-3 w-3" />
            <span>{buyer.preferences.minBeds}-{buyer.preferences.maxBeds}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-3 w-3" />
            <span>{buyer.preferences.minBaths}-{buyer.preferences.maxBaths}</span>
          </div>
        </div>

        {/* Zip Codes */}
        <div className="flex flex-wrap gap-1 mb-3">
          {buyer.preferredZipCodes.slice(0, 2).map((zip) => (
            <Badge key={zip} variant="secondary" className="text-[10px]">
              {zip}
            </Badge>
          ))}
          {buyer.preferredZipCodes.length > 2 && (
            <Badge variant="secondary" className="text-[10px]">
              +{buyer.preferredZipCodes.length - 2}
            </Badge>
          )}
        </div>

        {/* Matches */}
        <div className="flex gap-2 mb-3">
          <div className="flex items-center gap-1 text-xs">
            <Home className="h-3 w-3 text-primary" />
            <span className="font-medium text-primary">{buyer.matches.internal}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <ExternalLink className="h-3 w-3 text-status-scheduled" />
            <span className="font-medium text-status-scheduled">{buyer.matches.external}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{buyer.location}</span>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedItems}/{totalItems}</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}