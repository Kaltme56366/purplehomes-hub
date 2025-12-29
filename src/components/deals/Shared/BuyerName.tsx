/**
 * BuyerName - Displays buyer name with optional qualified badge
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BuyerNameProps {
  firstName?: string;
  lastName?: string;
  qualified?: boolean;
  className?: string;
  badgeSize?: 'sm' | 'md';
}

export function BuyerName({
  firstName,
  lastName,
  qualified,
  className,
  badgeSize = 'sm',
}: BuyerNameProps) {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span>{fullName}</span>
      {qualified && (
        <Badge
          variant="default"
          className={cn(
            'bg-green-600 hover:bg-green-600',
            badgeSize === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
          )}
        >
          Qualified
        </Badge>
      )}
    </span>
  );
}

export default BuyerName;
