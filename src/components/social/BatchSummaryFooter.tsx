import { Rocket, Loader2, Facebook, Instagram, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';

type Platform = 'facebook' | 'instagram' | 'linkedin';

interface SocialAccount {
  id: string;
  platform: Platform;
  accountName: string;
  profilePicture?: string;
  connected: boolean;
}

interface BatchSummaryFooterProps {
  selectedProperties: Property[];
  selectedAccounts: SocialAccount[];
  readyCount: number;
  needsCaptionCount: number;
  onPost: () => void;
  isPosting: boolean;
}

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
};

const platformColors = {
  facebook: 'text-blue-500',
  instagram: 'text-pink-500',
  linkedin: 'text-blue-700',
};

export function BatchSummaryFooter({
  selectedProperties,
  selectedAccounts,
  readyCount,
  needsCaptionCount,
  onPost,
  isPosting,
}: BatchSummaryFooterProps) {
  // Don't show if no properties selected
  if (selectedProperties.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-50",
        "animate-in slide-in-from-bottom-2 duration-200"
      )}
    >
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Summary Line */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="font-medium">
            {selectedProperties.length} {selectedProperties.length === 1 ? 'property' : 'properties'}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-green-500">{readyCount} ready</span>
          {needsCaptionCount > 0 && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-yellow-500">{needsCaptionCount} need{needsCaptionCount === 1 ? 's' : ''} caption</span>
            </>
          )}
        </div>

        {/* Account Preview */}
        {selectedAccounts.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Posting to:</span>
            <div className="flex items-center gap-1.5">
              {selectedAccounts.map((account) => {
                const Icon = platformIcons[account.platform];
                const colorClass = platformColors[account.platform];
                return (
                  <Icon key={account.id} className={cn("h-4 w-4", colorClass)} />
                );
              })}
            </div>
          </div>
        )}

        {/* Post Button */}
        <Button
          onClick={onPost}
          disabled={isPosting || selectedProperties.length === 0 || selectedAccounts.length === 0}
          className="h-12 w-full max-w-md mx-auto block text-lg font-semibold"
          size="lg"
        >
          {isPosting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Rocket className="h-5 w-5 mr-2" />
              Post {selectedProperties.length} {selectedProperties.length === 1 ? 'Property' : 'Properties'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
