import { Check, AlertCircle, Image as ImageIcon, Type, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Platform = 'facebook' | 'instagram' | 'linkedin';

interface PostReadinessCardProps {
  hasImage: boolean;
  captionLength: number;
  selectedPlatforms: Platform[];
  selectedAccountCount: number;
  postType: 'now' | 'schedule';
  hasSchedule: boolean;
}

interface ChecklistItem {
  label: string;
  status: 'complete' | 'incomplete' | 'warning';
  detail?: string;
}

export function PostReadinessCard({
  hasImage,
  captionLength,
  selectedPlatforms,
  selectedAccountCount,
  postType,
  hasSchedule,
}: PostReadinessCardProps) {
  // Build checklist items
  const items: ChecklistItem[] = [
    {
      label: 'Image',
      status: hasImage ? 'complete' : 'incomplete',
      detail: hasImage ? 'Ready' : 'Upload an image',
    },
    {
      label: 'Caption',
      status: captionLength > 0 ? 'complete' : 'incomplete',
      detail: captionLength > 0
        ? `${captionLength} character${captionLength !== 1 ? 's' : ''}`
        : 'Write a caption',
    },
    {
      label: 'Accounts',
      status: selectedAccountCount > 0 ? 'complete' : 'incomplete',
      detail: selectedAccountCount > 0
        ? `${selectedAccountCount} account${selectedAccountCount !== 1 ? 's' : ''} selected`
        : 'Select accounts',
    },
  ];

  // Add schedule item if scheduling
  if (postType === 'schedule') {
    items.push({
      label: 'Schedule',
      status: hasSchedule ? 'complete' : 'incomplete',
      detail: hasSchedule ? 'Date & time set' : 'Set date & time',
    });
  }

  const completeCount = items.filter(item => item.status === 'complete').length;
  const isFullyReady = completeCount === items.length;
  const progressPercentage = (completeCount / items.length) * 100;

  return (
    <Card className="bg-gradient-to-br from-muted/30 to-muted/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Post Readiness</span>
          <span className={cn(
            "text-xs",
            isFullyReady ? "text-green-500" : "text-muted-foreground"
          )}>
            {completeCount}/{items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                isFullyReady ? "bg-green-500" : "bg-primary"
              )}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Checklist Items */}
        <div className="space-y-2">
          {items.map((item, index) => {
            const Icon = item.status === 'complete' ? Check : AlertCircle;
            const iconColor = item.status === 'complete'
              ? 'text-green-500'
              : item.status === 'warning'
              ? 'text-yellow-500'
              : 'text-muted-foreground';

            return (
              <div
                key={index}
                className="flex items-center gap-2 text-xs"
              >
                <Icon className={cn("h-4 w-4 flex-shrink-0", iconColor)} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.label}</div>
                  {item.detail && (
                    <div className="text-muted-foreground truncate">
                      {item.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Message */}
        <div className={cn(
          "pt-2 text-center text-xs font-medium border-t",
          isFullyReady ? "text-green-500" : "text-muted-foreground"
        )}>
          {isFullyReady ? (
            "✓ Ready to post!"
          ) : (
            `${items.length - completeCount} item${items.length - completeCount !== 1 ? 's' : ''} remaining`
          )}
        </div>
      </CardContent>
    </Card>
  );
}
