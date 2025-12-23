/**
 * BuyerAvatar - Consistent initials avatar for buyers
 *
 * Generates a colored circle with the buyer's initials.
 * Color is deterministic based on the buyer's name.
 */

import { cn } from '@/lib/utils';

// Color palette for avatars
const COLORS = [
  'bg-purple-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-pink-500',
];

/**
 * Generate a consistent color from a name string
 */
function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface BuyerAvatarProps {
  firstName?: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BuyerAvatar({
  firstName = '',
  lastName = '',
  size = 'md',
  className,
}: BuyerAvatarProps) {
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
  const fullName = `${firstName} ${lastName}`.trim();
  const bgColor = getColorFromName(fullName || 'Unknown');

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0',
        bgColor,
        sizeClasses[size],
        className
      )}
      title={fullName || 'Unknown Buyer'}
    >
      {initials}
    </div>
  );
}
