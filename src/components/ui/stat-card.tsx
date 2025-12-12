import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'success' | 'info' | 'muted';
  onClick?: () => void;
  className?: string;
}

const variantStyles = {
  default: 'text-foreground',
  warning: 'text-warning',
  success: 'text-success',
  info: 'text-info',
  muted: 'text-muted-foreground',
};

const iconBgStyles = {
  default: 'bg-muted',
  warning: 'bg-warning/10',
  success: 'bg-success/10',
  info: 'bg-info/10',
  muted: 'bg-muted',
};

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = 'default',
  onClick,
  className 
}: StatCardProps) {
  return (
    <Card 
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-lg",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className={cn("text-3xl font-bold", variantStyles[variant])}>
              {value}
            </p>
          </div>
          <div className={cn("rounded-full p-3", iconBgStyles[variant])}>
            <Icon className={cn("h-6 w-6", variantStyles[variant])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
