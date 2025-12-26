import { Rocket, Calendar, Sparkles, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BatchActionBarProps {
  selectedCount: number;
  onPostAll: () => void;
  onSchedule: () => void;
  onGenerateCaptions: () => void;
  onSkip: () => void;
  isProcessing: boolean;
}

export function BatchActionBar({
  selectedCount,
  onPostAll,
  onSchedule,
  onGenerateCaptions,
  onSkip,
  isProcessing,
}: BatchActionBarProps) {
  // Don't show if no selection
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "bg-muted/80 backdrop-blur border-t border-b py-3 px-4",
        "animate-in slide-in-from-bottom-2 duration-200"
      )}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium">
          With {selectedCount} {selectedCount === 1 ? 'property' : 'properties'}:
        </span>

        <Button
          variant="default"
          size="sm"
          onClick={onPostAll}
          disabled={isProcessing}
          className="h-8"
        >
          <Rocket className="h-4 w-4 mr-2" />
          Post All
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onSchedule}
          disabled={isProcessing}
          className="h-8"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Schedule
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onGenerateCaptions}
          disabled={isProcessing}
          className="h-8"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          AI Captions
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          disabled={isProcessing}
          className="h-8 text-muted-foreground"
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Skip
        </Button>
      </div>
    </div>
  );
}
