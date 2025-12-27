/**
 * Step 6: Review & Publish
 *
 * Final review of all posts before publishing.
 * Shows preview of each post with image, caption, hashtags.
 */

import { useMemo } from 'react';
import {
  Image,
  MessageSquare,
  Hash,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Facebook,
  Instagram,
  Linkedin,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format, addHours, setHours, setMinutes } from 'date-fns';
import type { Property } from '@/types';
import type { BatchWizardState } from '../types';
import { POST_INTENTS, TONE_PRESETS } from '../../create-wizard/types';

interface BatchReviewStepProps {
  properties: Property[];
  state: BatchWizardState;
  isPublishing: boolean;
  publishProgress: number;
}

export default function BatchReviewStep({
  properties,
  state,
  isPublishing,
  publishProgress,
}: BatchReviewStepProps) {
  const selectedProperties = properties.filter((p) =>
    state.selectedPropertyIds.includes(p.id)
  );

  const selectedIntent = POST_INTENTS.find((i) => i.id === state.postIntent);
  const selectedTone = TONE_PRESETS.find((t) => t.id === state.tone);

  // Calculate scheduled times for staggered posts
  const scheduledTimes = useMemo(() => {
    if (state.scheduleType !== 'staggered' || !state.staggerSettings.startDate) {
      return {};
    }

    const startDate = new Date(state.staggerSettings.startDate);
    const [hours, minutes] = state.staggerSettings.startTime.split(':').map(Number);
    let currentTime = setMinutes(setHours(startDate, hours), minutes);

    const times: Record<string, Date> = {};
    selectedProperties.forEach((property, index) => {
      times[property.id] = addHours(currentTime, index * state.staggerSettings.intervalHours);
    });
    return times;
  }, [selectedProperties, state.scheduleType, state.staggerSettings]);

  // Count ready posts
  const stats = useMemo(() => {
    let withImage = 0;
    let withCaption = 0;

    selectedProperties.forEach((property) => {
      const ps = state.propertyStates[property.id];
      if (ps?.generatedImageUrl || property.heroImage) withImage++;
      if (ps?.captions?.facebook) withCaption++;
    });

    return {
      total: selectedProperties.length,
      withImage,
      withCaption,
      ready: Math.min(withImage, withCaption),
    };
  }, [selectedProperties, state.propertyStates]);

  const allHashtags = [...state.selectedHashtags, ...state.customHashtags];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Review & Publish</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review your {selectedProperties.length} posts before publishing
        </p>
      </div>

      {/* Publishing Progress */}
      {isPublishing && (
        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Publishing posts...</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(publishProgress)}%
            </span>
          </div>
          <Progress value={publishProgress} className="h-2" />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Posts</p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{stats.withImage}</p>
          <p className="text-xs text-muted-foreground">With Images</p>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.withCaption}</p>
          <p className="text-xs text-muted-foreground">With Captions</p>
        </div>
        <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.ready}</p>
          <p className="text-xs text-muted-foreground">Ready</p>
        </div>
      </div>

      {/* Settings Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Post Settings
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-lg">{selectedIntent?.icon}</span>
            <span className="font-medium">{selectedIntent?.label}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-lg">{selectedTone?.icon}</span>
            <span>{selectedTone?.label}</span>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Schedule
          </Label>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {state.scheduleType === 'now' ? (
              <span className="font-medium">Post Immediately</span>
            ) : (
              <span>
                Starting{' '}
                {state.staggerSettings.startDate
                  ? format(state.staggerSettings.startDate, 'MMM d')
                  : 'TBD'}{' '}
                at {state.staggerSettings.startTime}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Accounts */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
          Posting To
        </Label>
        <div className="flex items-center gap-3 mt-2">
          {state.selectedAccounts.length === 0 ? (
            <span className="text-sm text-red-500">No accounts selected</span>
          ) : (
            state.selectedAccounts.map((id, i) => (
              <Badge key={id} variant="outline">
                Account {i + 1}
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* Hashtags */}
      {allHashtags.length > 0 && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Hashtags ({allHashtags.length})
          </Label>
          <div className="flex flex-wrap gap-1 mt-2">
            {allHashtags.slice(0, 10).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {allHashtags.length > 10 && (
              <Badge variant="outline" className="text-xs">
                +{allHashtags.length - 10} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Posts Preview */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Posts Preview</Label>
        <ScrollArea className="h-[300px] border rounded-lg">
          <div className="p-3 space-y-3">
            {selectedProperties.map((property, index) => {
              const ps = state.propertyStates[property.id];
              const imageUrl = ps?.generatedImageUrl || property.heroImage;
              const caption = ps?.captions?.facebook || '';
              const hasImage = !!imageUrl;
              const hasCaption = !!caption;
              const scheduledTime = scheduledTimes[property.id];

              return (
                <div
                  key={property.id}
                  className="flex gap-4 p-3 rounded-lg border bg-background"
                >
                  {/* Index */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* Image Preview */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-medium text-sm truncate">{property.address}</p>
                    <p className="text-xs text-muted-foreground">{property.city}</p>
                    {caption && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {caption}
                      </p>
                    )}
                    {scheduledTime && (
                      <p className="text-xs text-blue-600">
                        {format(scheduledTime, 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>

                  {/* Status Indicators */}
                  <div className="flex flex-col gap-1 items-end flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Image
                        className={cn(
                          'h-3.5 w-3.5',
                          hasImage ? 'text-green-600' : 'text-muted-foreground'
                        )}
                      />
                      <MessageSquare
                        className={cn(
                          'h-3.5 w-3.5',
                          hasCaption ? 'text-green-600' : 'text-muted-foreground'
                        )}
                      />
                    </div>
                    {hasImage && hasCaption ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-green-50 text-green-700 border-green-200"
                      >
                        Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Incomplete
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Validation Warnings */}
      {stats.ready < stats.total && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              Some posts are incomplete
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {stats.total - stats.ready} posts are missing images or captions. They will still be
              published but may appear incomplete.
            </p>
          </div>
        </div>
      )}

      {state.selectedAccounts.length === 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">
              No accounts selected
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              Please go back to the Schedule step and select at least one social media account.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
