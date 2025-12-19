import { cn } from '@/lib/utils';

interface MatchScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showProgress?: boolean;
}

export function MatchScoreBadge({ score, size = 'md', showLabel = true, showProgress = true }: MatchScoreBadgeProps) {
  const getScoreColors = (score: number) => {
    if (score >= 80) return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      ring: 'stroke-emerald-500',
      ringBg: 'stroke-emerald-100',
    };
    if (score >= 60) return {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
      ring: 'stroke-sky-500',
      ringBg: 'stroke-sky-100',
    };
    if (score >= 40) return {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      ring: 'stroke-amber-500',
      ringBg: 'stroke-amber-100',
    };
    return {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      border: 'border-gray-200',
      ring: 'stroke-gray-400',
      ringBg: 'stroke-gray-100',
    };
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Low';
  };

  const colors = getScoreColors(score);

  const sizeConfig = {
    sm: { text: 'text-xs', padding: 'px-2 py-0.5', ring: 16, stroke: 2 },
    md: { text: 'text-sm', padding: 'px-2.5 py-1', ring: 20, stroke: 2.5 },
    lg: { text: 'text-base', padding: 'px-3 py-1.5', ring: 24, stroke: 3 },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * (config.ring / 2 - config.stroke);
  const progress = ((100 - score) / 100) * circumference;

  return (
    <div className={cn(
      'inline-flex items-center gap-2 rounded-full border font-medium',
      colors.bg,
      colors.text,
      colors.border,
      config.padding
    )}>
      {showProgress && (
        <svg
          width={config.ring}
          height={config.ring}
          className="transform -rotate-90"
        >
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={config.ring / 2 - config.stroke}
            fill="none"
            strokeWidth={config.stroke}
            className={colors.ringBg}
          />
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={config.ring / 2 - config.stroke}
            fill="none"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            className={colors.ring}
            strokeDasharray={circumference}
            strokeDashoffset={progress}
          />
        </svg>
      )}
      <span className="font-semibold">{score}</span>
      {showLabel && <span className="font-normal opacity-75">{getScoreLabel(score)}</span>}
    </div>
  );
}
