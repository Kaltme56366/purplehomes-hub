import { useState } from 'react';
import { Sparkles, Copy, Check, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';
import type { CaptionStyle } from './AICaptionGenerator';

type Platform = 'facebook' | 'instagram' | 'linkedin';

interface PlatformCaptions {
  facebook: string;
  instagram: string;
  linkedin: string;
}

const platformConfig = {
  facebook: {
    label: 'Facebook',
    maxLength: 63206,
    tip: 'Best with 40-80 characters for engagement. Use emojis and questions.',
    recommended: 80,
  },
  instagram: {
    label: 'Instagram',
    maxLength: 2200,
    tip: 'Use up to 30 hashtags. First line is most important.',
    recommended: 150,
  },
  linkedin: {
    label: 'LinkedIn',
    maxLength: 3000,
    tip: 'Professional tone. Use line breaks for readability.',
    recommended: 200,
  },
};

interface CaptionsCardProps {
  captions: PlatformCaptions;
  onCaptionChange: (platform: Platform, value: string) => void;
  activePlatform: Platform;
  onPlatformChange: (platform: Platform) => void;
  selectedProperty: Property | null;
  onGenerateCaption: (platform: Platform, style: CaptionStyle) => void;
  isGenerating?: boolean;
}

export function CaptionsCard({
  captions,
  onCaptionChange,
  activePlatform,
  onPlatformChange,
  selectedProperty,
  onGenerateCaption,
  isGenerating = false,
}: CaptionsCardProps) {
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('professional');
  const [copiedToAll, setCopiedToAll] = useState(false);

  const currentPlatform = platformConfig[activePlatform];
  const currentCaption = captions[activePlatform];
  const charCount = currentCaption.length;
  const isNearLimit = charCount > currentPlatform.maxLength * 0.9;
  const isOverLimit = charCount > currentPlatform.maxLength;
  const progressPercentage = (charCount / currentPlatform.recommended) * 100;

  const handleCopyToAll = () => {
    const sourceCaption = captions[activePlatform];
    onCaptionChange('facebook', sourceCaption);
    onCaptionChange('instagram', sourceCaption);
    onCaptionChange('linkedin', sourceCaption);
    setCopiedToAll(true);
    setTimeout(() => setCopiedToAll(false), 2000);
  };

  const handleGenerateForPlatform = (platform: Platform) => {
    onGenerateCaption(platform, captionStyle);
  };

  const handleGenerateAll = () => {
    (['facebook', 'instagram', 'linkedin'] as Platform[]).forEach(platform => {
      onGenerateCaption(platform, captionStyle);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
            2
          </span>
          Captions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Style Selector */}
          <Select
            value={captionStyle}
            onValueChange={(value) => setCaptionStyle(value as CaptionStyle)}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="luxury">Luxury</SelectItem>
              <SelectItem value="investor-focused">Investor</SelectItem>
            </SelectContent>
          </Select>

          {/* Generate Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="h-9"
                disabled={!selectedProperty || isGenerating}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Generate for</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleGenerateForPlatform(activePlatform)}>
                Current ({currentPlatform.label})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleGenerateForPlatform('facebook')}>
                Facebook only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleGenerateForPlatform('instagram')}>
                Instagram only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleGenerateForPlatform('linkedin')}>
                LinkedIn only
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleGenerateAll}>
                <Sparkles className="h-4 w-4 mr-2" />
                All platforms
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Copy to All Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 ml-auto"
            onClick={handleCopyToAll}
            disabled={!currentCaption}
          >
            {copiedToAll ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to All
              </>
            )}
          </Button>
        </div>

        {/* Platform Tabs */}
        <Tabs value={activePlatform} onValueChange={(value) => onPlatformChange(value as Platform)}>
          <TabsList className="w-full h-9">
            <TabsTrigger value="facebook" className="flex-1">
              Facebook
            </TabsTrigger>
            <TabsTrigger value="instagram" className="flex-1">
              Instagram
            </TabsTrigger>
            <TabsTrigger value="linkedin" className="flex-1">
              LinkedIn
            </TabsTrigger>
          </TabsList>

          <TabsContent value="facebook" className="mt-4 space-y-2">
            <Textarea
              placeholder="Write your Facebook caption..."
              value={captions.facebook}
              onChange={(e) => onCaptionChange('facebook', e.target.value)}
              className="min-h-[180px] resize-y"
            />
          </TabsContent>

          <TabsContent value="instagram" className="mt-4 space-y-2">
            <Textarea
              placeholder="Write your Instagram caption..."
              value={captions.instagram}
              onChange={(e) => onCaptionChange('instagram', e.target.value)}
              className="min-h-[180px] resize-y"
            />
          </TabsContent>

          <TabsContent value="linkedin" className="mt-4 space-y-2">
            <Textarea
              placeholder="Write your LinkedIn caption..."
              value={captions.linkedin}
              onChange={(e) => onCaptionChange('linkedin', e.target.value)}
              className="min-h-[180px] resize-y"
            />
          </TabsContent>
        </Tabs>

        {/* Footer: Character Count + Tips */}
        <div className="space-y-2">
          {/* Character Count Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={cn(
                "font-medium",
                isOverLimit ? "text-destructive" : isNearLimit ? "text-yellow-500" : "text-muted-foreground"
              )}>
                {charCount.toLocaleString()} / {currentPlatform.maxLength.toLocaleString()} characters
              </span>
              <span className="text-muted-foreground">
                Recommended: {currentPlatform.recommended}
              </span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  isOverLimit ? "bg-destructive" : isNearLimit ? "bg-yellow-500" : "bg-primary"
                )}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Platform-specific Tips */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
            <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">{currentPlatform.label} tip:</span>{' '}
              {currentPlatform.tip}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
