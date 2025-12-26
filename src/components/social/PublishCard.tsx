import { Send, Loader2, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type Platform = 'facebook' | 'instagram' | 'linkedin';

interface SocialAccount {
  id: string;
  platform: Platform;
  accountName: string;
  profilePicture?: string;
  connected: boolean;
}

interface PublishCardProps {
  accounts: SocialAccount[];
  selectedAccountIds: string[];
  onAccountToggle: (id: string) => void;
  postType: 'now' | 'schedule';
  onPostTypeChange: (type: 'now' | 'schedule') => void;
  scheduledDate: string;
  scheduledTime: string;
  onScheduleChange: (date: string, time: string) => void;
  onPost: () => void;
  onClear: () => void;
  isPosting: boolean;
  isValid: boolean;
}

const platformIcons: Record<Platform, React.ElementType> = {
  facebook: ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  instagram: ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  linkedin: ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
};

export function PublishCard({
  accounts,
  selectedAccountIds,
  onAccountToggle,
  postType,
  onPostTypeChange,
  scheduledDate,
  scheduledTime,
  onScheduleChange,
  onPost,
  onClear,
  isPosting,
  isValid,
}: PublishCardProps) {
  const connectedAccounts = accounts.filter(a => a.connected);
  const hasSelectedAccounts = selectedAccountIds.length > 0;

  // Group accounts by platform
  const accountsByPlatform = connectedAccounts.reduce((acc, account) => {
    if (!acc[account.platform]) {
      acc[account.platform] = [];
    }
    acc[account.platform].push(account);
    return acc;
  }, {} as Record<Platform, SocialAccount[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
            3
          </span>
          Publish
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Post to</Label>

          {connectedAccounts.length > 0 ? (
            <div className="space-y-3">
              {Object.entries(accountsByPlatform).map(([platform, platformAccounts]) => {
                const Icon = platformIcons[platform as Platform];
                return (
                  <div key={platform} className="space-y-2">
                    {platformAccounts.map((account) => (
                      <label
                        key={account.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                          selectedAccountIds.includes(account.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <Checkbox
                          checked={selectedAccountIds.includes(account.id)}
                          onCheckedChange={() => onAccountToggle(account.id)}
                        />
                        <div className={cn(
                          "w-5 h-5 flex-shrink-0",
                          platform === 'facebook' && "text-blue-500",
                          platform === 'instagram' && "text-pink-500",
                          platform === 'linkedin' && "text-blue-700"
                        )}>
                          <Icon className="w-full h-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {account.accountName}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed text-center">
              <p className="text-sm text-muted-foreground">
                No social accounts connected
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Configure in Settings to post
              </p>
            </div>
          )}
        </div>

        {/* When to Post */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">When</Label>
          <RadioGroup value={postType} onValueChange={(value) => onPostTypeChange(value as 'now' | 'schedule')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="now" id="now" />
              <Label htmlFor="now" className="font-normal cursor-pointer">
                Post now
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="schedule" id="schedule" />
              <Label htmlFor="schedule" className="font-normal cursor-pointer">
                Schedule for later
              </Label>
            </div>
          </RadioGroup>

          {/* Schedule Date/Time Pickers */}
          {postType === 'schedule' && (
            <div className="grid grid-cols-2 gap-3 pl-6 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <Label htmlFor="schedule-date" className="text-xs text-muted-foreground">
                  Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="schedule-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => onScheduleChange(e.target.value, scheduledTime)}
                    className="pl-10"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-time" className="text-xs text-muted-foreground">
                  Time
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="schedule-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => onScheduleChange(scheduledDate, e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Post Button */}
        <div className="space-y-2">
          <Button
            onClick={onPost}
            disabled={!isValid || isPosting || !hasSelectedAccounts}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {isPosting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {postType === 'schedule' ? 'Scheduling...' : 'Posting...'}
              </>
            ) : (
              <>
                {postType === 'schedule' ? (
                  <>
                    <Calendar className="h-5 w-5 mr-2" />
                    Schedule Post
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Post Now
                  </>
                )}
              </>
            )}
          </Button>

          {/* Helper Text */}
          {!isValid && (
            <p className="text-xs text-center text-muted-foreground">
              Complete all fields to post
            </p>
          )}
          {!hasSelectedAccounts && isValid && (
            <p className="text-xs text-center text-yellow-500">
              Select at least one account
            </p>
          )}

          {/* Clear Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="w-full text-muted-foreground"
            disabled={isPosting}
          >
            Clear form
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
