/**
 * MatchSectionDivider - Divider component for separating match sections
 * Used between "Top Matches" and "More to Explore" sections
 */

import { MapPin } from 'lucide-react';

interface MatchSectionDividerProps {
  title: string;
  subtitle?: string;
  count?: number;
}

export function MatchSectionDivider({ title, subtitle, count }: MatchSectionDividerProps) {
  return (
    <div className="relative my-8">
      {/* Decorative line */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>

      {/* Center content */}
      <div className="relative flex justify-center">
        <div className="bg-background px-4 py-2 flex flex-col items-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wide">
              {title}
            </span>
            {count !== undefined && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-md">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
