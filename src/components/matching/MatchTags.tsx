import { useState } from 'react';
import { Info, Check, AlertTriangle, MapPin, Bed, Bath, DollarSign, BarChart3 } from 'lucide-react';
import { MatchTag, type TagVariant } from './MatchTag';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ParsedTag {
  label: string;
  variant: TagVariant;
  originalText: string;
}

/**
 * Parse highlight strings into concise tag labels
 */
function parseHighlightToTag(highlight: string): ParsedTag {
  const lower = highlight.toLowerCase();

  // Bedroom matches
  if (lower.includes('exact match') && lower.includes('bedroom')) {
    return { label: 'Exact Beds', variant: 'positive', originalText: highlight };
  }
  if (lower.includes('close match') && lower.includes('bedroom')) {
    return { label: 'Close Beds', variant: 'warning', originalText: highlight };
  }
  if (lower.includes('bedroom') && lower.includes('as requested')) {
    return { label: 'Beds Match', variant: 'positive', originalText: highlight };
  }

  // Bathroom matches
  if (lower.includes('bathroom') && (lower.includes('as requested') || lower.includes('exact'))) {
    return { label: 'Baths Match', variant: 'positive', originalText: highlight };
  }

  // Location matches
  if (lower.includes('located in preferred') || lower.includes('preferred area')) {
    return { label: 'ZIP Match', variant: 'positive', originalText: highlight };
  }
  if (lower.includes('preferred zip')) {
    return { label: 'ZIP Match', variant: 'positive', originalText: highlight };
  }

  // Budget/Payment matches
  if (lower.includes('strong down payment')) {
    return { label: 'Strong Payment', variant: 'positive', originalText: highlight };
  }
  if (lower.includes('adequate down payment')) {
    return { label: 'Under Budget', variant: 'positive', originalText: highlight };
  }
  if (lower.includes('monthly payment') && lower.includes('affordable')) {
    return { label: 'Affordable', variant: 'positive', originalText: highlight };
  }
  if (lower.includes('budget match') || lower.includes('within budget')) {
    return { label: 'Under Budget', variant: 'positive', originalText: highlight };
  }

  // Generic positive indicators
  if (lower.includes('excellent') || lower.includes('perfect')) {
    return { label: 'Great Fit', variant: 'positive', originalText: highlight };
  }
  if (lower.includes('good match') || lower.includes('meets')) {
    return { label: 'Good Fit', variant: 'positive', originalText: highlight };
  }

  // Default: extract key info or use shortened version
  const shortened = highlight.length > 20 ? highlight.substring(0, 17) + '...' : highlight;
  return { label: shortened, variant: 'positive', originalText: highlight };
}

/**
 * Parse concern strings into warning/negative tags
 */
function parseConcernToTag(concern: string): ParsedTag {
  const lower = concern.toLowerCase();

  // Bedroom concerns
  if (lower.includes('fewer bedroom') || lower.includes('less bedroom')) {
    return { label: 'Fewer Beds', variant: 'warning', originalText: concern };
  }
  if (lower.includes('more bedroom')) {
    return { label: 'Extra Beds', variant: 'warning', originalText: concern };
  }

  // Bathroom concerns
  if (lower.includes('fewer bathroom') || lower.includes('less bathroom')) {
    return { label: 'Fewer Baths', variant: 'warning', originalText: concern };
  }

  // Location concerns
  if (lower.includes('different location') || lower.includes('not in preferred')) {
    return { label: 'Other ZIP', variant: 'warning', originalText: concern };
  }
  if (lower.includes('not in preferred zip')) {
    return { label: 'Other ZIP', variant: 'warning', originalText: concern };
  }

  // Budget concerns
  if (lower.includes('low down payment') || lower.includes('down payment may be insufficient')) {
    return { label: 'Tight Budget', variant: 'warning', originalText: concern };
  }
  if (lower.includes('higher monthly') || lower.includes('monthly payment may')) {
    return { label: 'High Payment', variant: 'warning', originalText: concern };
  }
  if (lower.includes('price') || lower.includes('expensive') || lower.includes('higher price')) {
    return { label: 'Price', variant: 'warning', originalText: concern };
  }

  // Generic concerns
  if (lower.includes('challenging') || lower.includes('significant')) {
    return { label: 'Review Needed', variant: 'negative', originalText: concern };
  }

  // Default: use shortened version
  const shortened = concern.length > 15 ? concern.substring(0, 12) + '...' : concern;
  return { label: shortened, variant: 'warning', originalText: concern };
}

/**
 * Extract just the summary portion from reasoning text
 * Now handles the new multi-line format with score breakdown
 */
export function extractReasoningSummary(reasoning: string | undefined): string {
  if (!reasoning) return '';

  // Remove [PRIORITY] prefix if present
  let cleaned = reasoning.replace(/^\[PRIORITY\]\s*/i, '');

  // New format: first line is "Good Match (Score: 75/100)"
  // Extract just this first line for the summary
  const firstLine = cleaned.split('\n')[0].trim();

  // Check if it's the new format (contains "Score:")
  if (firstLine.includes('Score:')) {
    return firstLine;
  }

  // Fallback for old format - find where "Highlights:" or "Concerns:" starts
  const highlightsIndex = cleaned.toLowerCase().indexOf('highlights:');
  const concernsIndex = cleaned.toLowerCase().indexOf('concerns:');
  const breakdownIndex = cleaned.toLowerCase().indexOf('score breakdown:');

  // Get the earliest cutoff point
  let cutoffIndex = cleaned.length;
  if (highlightsIndex > 0) cutoffIndex = Math.min(cutoffIndex, highlightsIndex);
  if (concernsIndex > 0) cutoffIndex = Math.min(cutoffIndex, concernsIndex);
  if (breakdownIndex > 0) cutoffIndex = Math.min(cutoffIndex, breakdownIndex);

  // Extract just the summary
  return cleaned.substring(0, cutoffIndex).trim();
}

/**
 * Parse score breakdown from reasoning text
 */
export interface ScoreBreakdownItem {
  category: string;
  points: number;
  maxPoints: number;
  explanation: string;
}

export function parseScoreBreakdown(reasoning: string | undefined): ScoreBreakdownItem[] {
  if (!reasoning) return [];

  const items: ScoreBreakdownItem[] = [];
  const lines = reasoning.split('\n');

  for (const line of lines) {
    // Match pattern like "• Location: 40/40 pts (in preferred ZIP)"
    const match = line.match(/[•\-]\s*(\w+):\s*(\d+)\/(\d+)\s*pts?\s*\(([^)]+)\)/i);
    if (match) {
      items.push({
        category: match[1],
        points: parseInt(match[2]),
        maxPoints: parseInt(match[3]),
        explanation: match[4]
      });
    }
  }

  return items;
}

/**
 * Visual score breakdown component for modals
 */
export interface ScoreBreakdownProps {
  reasoning?: string;
  className?: string;
}

export function ScoreBreakdown({ reasoning, className }: ScoreBreakdownProps) {
  const items = parseScoreBreakdown(reasoning);

  if (items.length === 0) return null;

  const getCategoryIcon = (category: string) => {
    const iconClass = "h-4 w-4 text-muted-foreground";
    switch (category.toLowerCase()) {
      case 'location':
        return <MapPin className={iconClass} />;
      case 'beds':
        return <Bed className={iconClass} />;
      case 'baths':
        return <Bath className={iconClass} />;
      case 'budget':
        return <DollarSign className={iconClass} />;
      default:
        return <BarChart3 className={iconClass} />;
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center text-sm gap-3">
          <span className="flex-shrink-0">{getCategoryIcon(item.category)}</span>
          <span className="font-medium w-16 flex-shrink-0">{item.category}</span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
            {item.points}/{item.maxPoints}
          </span>
          <span className="text-muted-foreground text-sm">{item.explanation}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Detailed list view of highlights and concerns
 * Shows full text with icons for use in modals/expanded views
 */
export interface MatchDetailsListProps {
  highlights?: string[];
  concerns?: string[];
  className?: string;
}

export function MatchDetailsList({
  highlights = [],
  concerns = [],
  className
}: MatchDetailsListProps) {
  const hasHighlights = highlights.length > 0;
  const hasConcerns = concerns.length > 0;

  if (!hasHighlights && !hasConcerns) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Highlights Section */}
      {hasHighlights && (
        <div>
          <h4 className="text-sm font-medium text-emerald-700 mb-2">Highlights</h4>
          <ul className="space-y-1.5">
            {highlights.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Concerns Section */}
      {hasConcerns && (
        <div>
          <h4 className="text-sm font-medium text-amber-700 mb-2">Considerations</h4>
          <ul className="space-y-1.5">
            {concerns.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export interface MatchTagsProps {
  highlights?: string[];
  concerns?: string[];
  reasoning?: string;
  maxVisible?: number;
  className?: string;
}

export function MatchTags({
  highlights = [],
  concerns = [],
  reasoning,
  maxVisible = 4,
  className
}: MatchTagsProps) {
  const [showAll, setShowAll] = useState(false);

  // Parse all highlights and concerns into tags
  const highlightTags = highlights.map(parseHighlightToTag);
  const concernTags = concerns.map(parseConcernToTag);

  // Combine and deduplicate by label
  const allTags: ParsedTag[] = [];
  const seenLabels = new Set<string>();

  // Add highlights first (positive tags)
  for (const tag of highlightTags) {
    if (!seenLabels.has(tag.label)) {
      seenLabels.add(tag.label);
      allTags.push(tag);
    }
  }

  // Then add concerns (warning/negative tags)
  for (const tag of concernTags) {
    if (!seenLabels.has(tag.label)) {
      seenLabels.add(tag.label);
      allTags.push(tag);
    }
  }

  // If no tags could be parsed, don't render anything
  if (allTags.length === 0) {
    return null;
  }

  const visibleTags = showAll ? allTags : allTags.slice(0, maxVisible);
  const hiddenCount = allTags.length - maxVisible;
  const hasOverflow = hiddenCount > 0 && !showAll;

  // Build tooltip text with cleaned summary
  const summary = extractReasoningSummary(reasoning);
  const tooltipText = summary || [
    ...highlights.map(h => `+ ${h}`),
    ...concerns.map(c => `- ${c}`)
  ].join('\n');

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {visibleTags.map((tag, index) => (
        <MatchTag
          key={`${tag.label}-${index}`}
          label={tag.label}
          variant={tag.variant}
        />
      ))}

      {hasOverflow && (
        <button
          onClick={() => setShowAll(true)}
          className="px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-full transition-colors"
        >
          +{hiddenCount} more
        </button>
      )}

      {showAll && allTags.length > maxVisible && (
        <button
          onClick={() => setShowAll(false)}
          className="px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-full transition-colors"
        >
          less
        </button>
      )}

      {/* Info icon with full details tooltip */}
      {tooltipText && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs whitespace-pre-wrap">{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
