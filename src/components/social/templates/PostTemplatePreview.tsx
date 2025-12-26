import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Facebook, Instagram, Linkedin, Copy, Download, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { type PostTemplate, fillTemplatePlaceholders } from './postTemplates';
import type { Property } from '@/types';

interface PostTemplatePreviewProps {
  template: PostTemplate | null;
  property: Property | null;
  customImage?: string;
  activePlatform: 'facebook' | 'instagram' | 'linkedin';
  onPlatformChange: (platform: 'facebook' | 'instagram' | 'linkedin') => void;
  onCaptionCopy: (caption: string, platform: string) => void;
}

const platformConfig = {
  facebook: {
    icon: Facebook,
    label: 'Facebook',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    aspectRatio: '1.91 / 1', // 1200x630
  },
  instagram: {
    icon: Instagram,
    label: 'Instagram',
    color: 'text-pink-500',
    bgColor: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500',
    aspectRatio: '4 / 5', // 1080x1350 (recommended 2024)
  },
  linkedin: {
    icon: Linkedin,
    label: 'LinkedIn',
    color: 'text-blue-700',
    bgColor: 'bg-blue-700',
    aspectRatio: '1.91 / 1', // 1200x627
  },
};

export function PostTemplatePreview({
  template,
  property,
  customImage,
  activePlatform,
  onPlatformChange,
  onCaptionCopy,
}: PostTemplatePreviewProps) {
  // Generate caption from template
  const caption = useMemo(() => {
    if (!template || !property) return '';

    const templateCaption = template.captionTemplate[activePlatform];
    return fillTemplatePlaceholders(templateCaption, {
      price: property.price,
      address: property.address,
      city: property.city,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      propertyType: property.propertyType,
      downPayment: property.downPayment,
      monthlyPayment: property.monthlyPayment,
    });
  }, [template, property, activePlatform]);

  // Get image to display
  const displayImage = customImage || property?.heroImage || '/placeholder.svg';

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(caption);
    onCaptionCopy(caption, activePlatform);
    toast.success(`Caption copied for ${activePlatform}!`);
  };

  if (!template) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Select a template to see the preview
          </p>
        </CardContent>
      </Card>
    );
  }

  const config = platformConfig[activePlatform];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Preview</CardTitle>
          <Badge variant="outline" className="gap-1">
            <Icon className={cn('h-3 w-3', config.color)} />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Platform Tabs */}
        <Tabs
          value={activePlatform}
          onValueChange={(v) => onPlatformChange(v as typeof activePlatform)}
        >
          <TabsList className="grid w-full grid-cols-3">
            {(['facebook', 'instagram', 'linkedin'] as const).map((platform) => {
              const pConfig = platformConfig[platform];
              const PIcon = pConfig.icon;
              const isSupported = template.platforms.includes(platform);
              return (
                <TabsTrigger
                  key={platform}
                  value={platform}
                  disabled={!isSupported}
                  className="gap-1"
                >
                  <PIcon className={cn('h-4 w-4', pConfig.color)} />
                  <span className="hidden sm:inline">{pConfig.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(['facebook', 'instagram', 'linkedin'] as const).map((platform) => {
            const pConfig = platformConfig[platform];
            return (
              <TabsContent key={platform} value={platform} className="mt-4">
                {/* Visual Preview */}
                <div
                  className="relative overflow-hidden rounded-lg"
                  style={{ aspectRatio: pConfig.aspectRatio }}
                >
                  {/* Background Image */}
                  <img
                    src={displayImage}
                    alt="Property"
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: template.backgroundColor,
                      opacity: template.overlayOpacity,
                    }}
                  />

                  {/* Content Overlay */}
                  <div
                    className="absolute inset-0 p-4 flex flex-col justify-end"
                    style={{
                      fontFamily: template.fontFamily,
                      color: template.textColor,
                    }}
                  >
                    {/* Category Badge */}
                    <div className="absolute top-4 left-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: template.accentColor,
                          color: template.backgroundColor === 'transparent' ? '#fff' : template.textColor,
                        }}
                      >
                        {template.category.replace('-', ' ')}
                      </span>
                    </div>

                    {/* Property Details */}
                    <div className="space-y-2">
                      {template.showPrice && property?.price && (
                        <p
                          className="text-2xl sm:text-3xl font-bold"
                          style={{ color: template.accentColor }}
                        >
                          ${property.price.toLocaleString()}
                        </p>
                      )}

                      {template.showAddress && property?.address && (
                        <p className="text-sm sm:text-base font-medium opacity-90 line-clamp-2">
                          {property.address}
                          {property.city && `, ${property.city}`}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs sm:text-sm opacity-80">
                        {template.showBedBath && (
                          <>
                            {property?.beds !== undefined && (
                              <span>{property.beds} Beds</span>
                            )}
                            {property?.baths !== undefined && (
                              <span>{property.baths} Baths</span>
                            )}
                          </>
                        )}
                        {template.showSqft && property?.sqft && (
                          <span>{property.sqft.toLocaleString()} sqft</span>
                        )}
                      </div>
                    </div>

                    {/* Logo Placeholder */}
                    {template.showLogo && (
                      <div className="absolute top-4 right-4">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            backgroundColor: template.accentColor,
                            color: '#fff',
                          }}
                        >
                          PH
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Caption Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Caption</p>
            <Button variant="ghost" size="sm" onClick={handleCopyCaption}>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </div>
          <ScrollArea className="h-[150px] rounded-lg border bg-muted/30 p-3">
            <p className="text-sm whitespace-pre-wrap">{caption || 'Select a property to generate caption'}</p>
          </ScrollArea>
        </div>

        {/* Suggested Hashtags */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Suggested Hashtags</p>
          <div className="flex flex-wrap gap-1">
            {template.hashtags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                onClick={() => {
                  navigator.clipboard.writeText(`#${tag}`);
                  toast.success(`Copied #${tag}`);
                }}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
