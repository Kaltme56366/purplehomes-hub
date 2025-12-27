/**
 * Step 2: Batch Image Generation
 *
 * Choose ONE template for all properties.
 * Generate images for all selected properties.
 * Option to skip properties that already have images.
 */

import { useState } from 'react';
import { Image, Check, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';
import type { BatchWizardState, PropertyPostState } from '../types';

// Template options (same as create wizard)
const TEMPLATES = [
  { id: 'just-listed', name: 'Just Listed', emoji: '🏷️', color: 'bg-blue-500' },
  { id: 'sold', name: 'Sold', emoji: '🎉', color: 'bg-green-500' },
  { id: 'under-contract', name: 'Under Contract', emoji: '📝', color: 'bg-yellow-500' },
  { id: 'price-reduced', name: 'Price Reduced', emoji: '💰', color: 'bg-red-500' },
  { id: 'investment', name: 'Investment', emoji: '📈', color: 'bg-purple-500' },
  { id: 'open-house', name: 'Open House', emoji: '🚪', color: 'bg-orange-500' },
];

interface BatchImageStepProps {
  properties: Property[];
  state: BatchWizardState;
  updateState: (updates: Partial<BatchWizardState>) => void;
  updatePropertyState: (propertyId: string, updates: Partial<PropertyPostState>) => void;
}

export default function BatchImageStep({
  properties,
  state,
  updateState,
  updatePropertyState,
}: BatchImageStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGeneratingId, setCurrentGeneratingId] = useState<string | null>(null);

  const selectedProperties = properties.filter((p) =>
    state.selectedPropertyIds.includes(p.id)
  );

  // Count properties by image status
  const withExistingImage = selectedProperties.filter((p) => p.heroImage).length;
  const withoutImage = selectedProperties.length - withExistingImage;
  const needsGeneration = state.skipExistingImages ? withoutImage : selectedProperties.length;

  // Check generation status
  const generatedCount = Object.values(state.propertyStates).filter(
    (ps) => ps.generatedImageUrl
  ).length;

  const handleGenerateAll = async () => {
    if (!state.selectedTemplateId) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    updateState({ isGeneratingImages: true });

    const propertiesToGenerate = state.skipExistingImages
      ? selectedProperties.filter((p) => !p.heroImage)
      : selectedProperties;

    let completed = 0;

    for (const property of propertiesToGenerate) {
      setCurrentGeneratingId(property.id);
      updateState({
        imageGenerationStatus: {
          ...state.imageGenerationStatus,
          [property.id]: 'generating',
        },
      });

      try {
        // Call Imejis API to generate image
        const response = await fetch('/api/ghl?resource=imejis-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: state.selectedTemplateId,
            property: {
              address: property.address,
              city: property.city,
              price: property.price,
              beds: property.beds,
              baths: property.baths,
              sqft: property.sqft,
              heroImage: property.heroImage,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          updatePropertyState(property.id, {
            generatedImageUrl: data.imageUrl || data.url,
            status: 'ready',
          });
          updateState({
            imageGenerationStatus: {
              ...state.imageGenerationStatus,
              [property.id]: 'complete',
            },
          });
        } else {
          throw new Error('Failed to generate image');
        }
      } catch (error) {
        console.error(`Failed to generate image for ${property.id}:`, error);
        updateState({
          imageGenerationStatus: {
            ...state.imageGenerationStatus,
            [property.id]: 'failed',
          },
        });
        updatePropertyState(property.id, {
          status: 'failed',
          error: 'Image generation failed',
        });
      }

      completed++;
      setGenerationProgress((completed / propertiesToGenerate.length) * 100);
    }

    setIsGenerating(false);
    setCurrentGeneratingId(null);
    updateState({ isGeneratingImages: false });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Generate Images</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a template and generate branded images for your {selectedProperties.length}{' '}
          properties
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-muted/50 rounded-lg text-center">
          <p className="text-2xl font-bold">{selectedProperties.length}</p>
          <p className="text-xs text-muted-foreground">Selected</p>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{withExistingImage}</p>
          <p className="text-xs text-muted-foreground">Have Images</p>
        </div>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-600">{withoutImage}</p>
          <p className="text-xs text-muted-foreground">Need Images</p>
        </div>
      </div>

      {/* Template Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Choose Template</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => updateState({ selectedTemplateId: template.id })}
              className={cn(
                'p-4 rounded-lg border-2 transition-all text-left',
                state.selectedTemplateId === template.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{template.emoji}</span>
                <span className="font-medium">{template.name}</span>
              </div>
              {state.selectedTemplateId === template.id && (
                <Check className="h-4 w-4 text-purple-600 mt-2" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Skip Existing Toggle */}
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
        <Checkbox
          id="skip-existing"
          checked={state.skipExistingImages}
          onCheckedChange={(checked) => updateState({ skipExistingImages: !!checked })}
        />
        <div>
          <Label htmlFor="skip-existing" className="cursor-pointer font-medium">
            Skip properties that already have images
          </Label>
          <p className="text-xs text-muted-foreground">
            {state.skipExistingImages
              ? `Will generate for ${withoutImage} properties`
              : `Will generate for all ${selectedProperties.length} properties (overwrite existing)`}
          </p>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerateAll}
        disabled={!state.selectedTemplateId || isGenerating || needsGeneration === 0}
        className="w-full gap-2"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Images... ({Math.round(generationProgress)}%)
          </>
        ) : (
          <>
            <Image className="h-4 w-4" />
            Generate {needsGeneration} Images
          </>
        )}
      </Button>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="space-y-2">
          <Progress value={generationProgress} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">
            {currentGeneratingId
              ? `Generating image for ${properties.find((p) => p.id === currentGeneratingId)?.address}...`
              : 'Preparing...'}
          </p>
        </div>
      )}

      {/* Preview Grid */}
      {generatedCount > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Generated Preview</Label>
            <Badge variant="secondary">{generatedCount} generated</Badge>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {selectedProperties.map((property) => {
                const propertyState = state.propertyStates[property.id];
                const imageUrl = propertyState?.generatedImageUrl || property.heroImage;
                const status = state.imageGenerationStatus[property.id];

                return (
                  <div
                    key={property.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                  >
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

                    {/* Status Overlay */}
                    {status === 'generating' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      </div>
                    )}
                    {status === 'complete' && (
                      <div className="absolute top-1 right-1">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                    {status === 'failed' && (
                      <div className="absolute top-1 right-1">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <AlertCircle className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
