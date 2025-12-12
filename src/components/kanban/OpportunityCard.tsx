import { DollarSign, MapPin, Calendar, MoreVertical, ArrowRight, User, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface OpportunityCardProps {
  id: string;
  title: string;
  subtitle?: string;
  location?: string;
  amount?: number;
  type?: string;
  date: string;
  onClick: () => void;
  onMoveNext?: () => void;
  onMarkLost?: () => void;
  variant?: 'seller' | 'buyer';
}

export function OpportunityCard({
  title,
  subtitle,
  location,
  amount,
  type,
  date,
  onClick,
  onMoveNext,
  onMarkLost,
  variant = 'seller',
}: OpportunityCardProps) {
  return (
    <Card
      className="bg-card hover:bg-accent/5 transition-colors border-border/50 hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate text-foreground">{title}</p>
            {subtitle && (
              <div className="flex items-center gap-1 mt-0.5">
                {variant === 'buyer' ? (
                  <User className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                )}
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              </div>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              {onMoveNext && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveNext(); }}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Move to Next Stage
                </DropdownMenuItem>
              )}
              {onMarkLost && (
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onMarkLost(); }}
                  className="text-destructive"
                >
                  Mark as Lost
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {amount && (
            <Badge variant="secondary" className="text-xs font-medium">
              <DollarSign className="h-3 w-3 mr-0.5" />
              {amount.toLocaleString()}
            </Badge>
          )}
          {type && (
            <Badge variant="outline" className="text-xs">
              {type}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(date), 'MMM d, yyyy')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
