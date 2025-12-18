import { Check, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TagVariant = 'positive' | 'warning' | 'negative';

export interface MatchTagProps {
  label: string;
  variant: TagVariant;
  className?: string;
}

const variantStyles: Record<TagVariant, { bg: string; text: string; icon: React.ElementType }> = {
  positive: {
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: Check,
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    icon: AlertTriangle,
  },
  negative: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-600',
    icon: X,
  },
};

export function MatchTag({ label, variant, className }: MatchTagProps) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border',
        styles.bg,
        styles.text,
        className
      )}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}
