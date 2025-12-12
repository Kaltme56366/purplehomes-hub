import { useState } from 'react';
import { Sparkles, Loader2, Facebook, Instagram, Linkedin, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Property } from '@/types';

export type CaptionStyle = 'professional' | 'witty' | 'powerful' | 'friendly' | 'luxury' | 'casual';
export type Platform = 'facebook' | 'instagram' | 'linkedin';

interface AICaptionGeneratorProps {
  property: Partial<Property>;
  onCaptionGenerated: (platform: Platform, caption: string) => void;
  className?: string;
}

const CAPTION_STYLES: { value: CaptionStyle; label: string; description: string; emoji: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Trustworthy and polished', emoji: '💼' },
  { value: 'witty', label: 'Witty', description: 'Clever wordplay and humor', emoji: '😄' },
  { value: 'powerful', label: 'Powerful', description: 'Urgent and action-oriented', emoji: '⚡' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable', emoji: '👋' },
  { value: 'luxury', label: 'Luxury', description: 'Elegant and sophisticated', emoji: '✨' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational', emoji: '🏠' },
];

const PLATFORMS: { value: Platform; label: string; icon: typeof Facebook }[] = [
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
];

export function AICaptionGenerator({
  property,
  onCaptionGenerated,
  className,
}: AICaptionGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<CaptionStyle>('professional');
  const [generatingPlatform, setGeneratingPlatform] = useState<Platform | null>(null);

  const generateCaption = async (platform: Platform) => {
    if (!property.address && !property.price) {
      toast.error('Please add property details first');
      return;
    }

    setIsGenerating(true);
    setGeneratingPlatform(platform);

    try {
      const response = await fetch('/api/ghl?resource=ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property,
          platform,
          style: selectedStyle,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate caption');
      }

      const data = await response.json();
      onCaptionGenerated(platform, data.caption);
      toast.success(`${platform} caption generated!`);
    } catch (error) {
      console.error('Caption generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate caption');
    } finally {
      setIsGenerating(false);
      setGeneratingPlatform(null);
    }
  };

  const generateAllCaptions = async () => {
    for (const platform of PLATFORMS) {
      await generateCaption(platform.value);
    }
  };

  const selectedStyleInfo = CAPTION_STYLES.find(s => s.value === selectedStyle);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Style Selector */}
        <Select value={selectedStyle} onValueChange={(v) => setSelectedStyle(v as CaptionStyle)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue>
              <span className="flex items-center gap-2">
                <span>{selectedStyleInfo?.emoji}</span>
                <span>{selectedStyleInfo?.label}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CAPTION_STYLES.map((style) => (
              <SelectItem key={style.value} value={style.value}>
                <div className="flex items-center gap-2">
                  <span>{style.emoji}</span>
                  <div>
                    <p className="font-medium">{style.label}</p>
                    <p className="text-xs text-muted-foreground">{style.description}</p>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Generate Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Caption
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Generate for Platform</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              return (
                <DropdownMenuItem
                  key={platform.value}
                  onClick={() => generateCaption(platform.value)}
                  disabled={isGenerating}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {platform.label}
                  {generatingPlatform === platform.value && (
                    <Loader2 className="h-3 w-3 ml-auto animate-spin" />
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={generateAllCaptions} disabled={isGenerating}>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate All
              <Badge variant="secondary" className="ml-auto text-xs">3 calls</Badge>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}