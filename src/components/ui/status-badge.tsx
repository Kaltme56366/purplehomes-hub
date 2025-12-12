import { cn } from '@/lib/utils';
import type { PropertyStatus, BuyerStatus } from '@/types';

interface StatusBadgeProps {
  status: PropertyStatus | BuyerStatus;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'status-pending' },
  posted: { label: 'Posted', className: 'status-posted' },
  scheduled: { label: 'Scheduled', className: 'status-scheduled' },
  skipped: { label: 'Skipped', className: 'status-skipped' },
  deleted: { label: 'Deleted', className: 'status-deleted' },
  processing: { label: 'Processing', className: 'status-processing' },
  active: { label: 'Active', className: 'status-posted' },
  qualified: { label: 'Qualified', className: 'status-scheduled' },
  closed: { label: 'Closed', className: 'status-skipped' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-muted text-foreground' };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
