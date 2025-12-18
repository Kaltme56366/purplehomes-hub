import { useState } from 'react';
import { Info } from 'lucide-react';
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
 * Removes redundant "Highlights:" and "Concerns:" sections
 */
export function extractReasoningSummary(reasoning: string | undefined): string {
  if (!reasoning) return '';

  // Remove [PRIORITY] prefix if present
  let cleaned = reasoning.replace(/^\[PRIORITY\]\s*/i, '');

  // Find where "Highlights:" or "Concerns:" starts and cut there
  const highlightsIndex = cleaned.toLowerCase().indexOf('highlights:');
  const concernsIndex = cleaned.toLowerCase().indexOf('concerns:');

  // Get the earliest cutoff point
  let cutoffIndex = cleaned.length;
  if (highlightsIndex > 0) cutoffIndex = Math.min(cutoffIndex, highlightsIndex);
  if (concernsIndex > 0) cutoffIndex = Math.min(cutoffIndex, concernsIndex);

  // Extract just the summary
  return cleaned.substring(0, cutoffIndex).trim();
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
