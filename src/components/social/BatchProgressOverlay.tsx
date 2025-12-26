import { Check, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Property } from '@/types';

interface BatchProgressOverlayProps {
  isOpen: boolean;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  currentProperty?: Property;
  log: Array<{ property: Property; status: 'complete' | 'failed'; message?: string }>;
  onCancel?: () => void;
  onComplete: () => void;
  canCancel?: boolean;
}

export function BatchProgressOverlay({
  isOpen,
  totalCount,
  completedCount,
  failedCount,
  currentProperty,
  log,
  onCancel,
  onComplete,
  canCancel = false,
}: BatchProgressOverlayProps) {
  const processedCount = completedCount + failedCount;
  const progressPercentage = (processedCount / totalCount) * 100;
  const isComplete = processedCount === totalCount;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && isComplete && onComplete()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isComplete ? 'Batch Operation Complete' : 'Processing Properties'}
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? `${completedCount} succeeded, ${failedCount} failed`
              : `${processedCount} of ${totalCount} processed`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {Math.round(progressPercentage)}%
              </span>
              <span className="text-muted-foreground">
                {processedCount} / {totalCount}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Current Property */}
          {!isComplete && currentProperty && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{currentProperty.propertyCode}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {currentProperty.address}
                </div>
              </div>
            </div>
          )}

          {/* Log */}
          {log.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Activity Log</h4>
              <ScrollArea className="h-[200px] rounded-lg border">
                <div className="p-3 space-y-2">
                  {log.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-xs"
                    >
                      {entry.status === 'complete' ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{entry.property.propertyCode}</span>
                        <span className="text-muted-foreground">
                          {' '}
                          {entry.status === 'complete' ? 'posted successfully' : 'failed'}
                        </span>
                        {entry.message && (
                          <div className="text-muted-foreground mt-0.5">
                            {entry.message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          {!isComplete && canCancel && onCancel ? (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : isComplete ? (
            <Button onClick={onComplete}>Done</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
