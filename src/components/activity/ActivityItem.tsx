import { 
  Send, 
  Calendar, 
  Sparkles, 
  Plus, 
  RefreshCw, 
  Users,
  Mail,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Activity, ActivityType } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityItemProps {
  activity: Activity;
  onClick?: () => void;
}

const activityIcons: Record<ActivityType, typeof Send> = {
  'posted': Send,
  'scheduled': Calendar,
  'caption-generated': Sparkles,
  'property-added': Plus,
  'status-changed': RefreshCw,
  'buyer-added': Users,
  'inventory-sent': Mail,
};

const activityColors: Record<ActivityType, string> = {
  'posted': 'bg-success/10 text-success',
  'scheduled': 'bg-info/10 text-info',
  'caption-generated': 'bg-accent/10 text-accent',
  'property-added': 'bg-primary/10 text-primary',
  'status-changed': 'bg-warning/10 text-warning',
  'buyer-added': 'bg-primary/10 text-primary',
  'inventory-sent': 'bg-success/10 text-success',
};

const statusIcons = {
  success: CheckCircle,
  error: XCircle,
  pending: Clock,
};

const statusColors = {
  success: 'text-success',
  error: 'text-error',
  pending: 'text-warning',
};

export function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const Icon = activityIcons[activity.type];
  const StatusIcon = statusIcons[activity.status];

  return (
    <div 
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg transition-colors",
        onClick && "hover:bg-muted/50 cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={cn("rounded-full p-2", activityColors[activity.type])}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {activity.propertyCode && (
            <span className="font-medium text-sm text-primary">
              {activity.propertyCode}
            </span>
          )}
          <StatusIcon className={cn("h-4 w-4", statusColors[activity.status])} />
        </div>
        <p className="text-sm text-foreground">{activity.details}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
          {activity.user && (
            <>
              <span>•</span>
              <span>{activity.user}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
