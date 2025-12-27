import React, { useEffect, useRef } from 'react';
import { Info, Upload, AlertTriangle, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import TemplateSelector from '../components/TemplateSelector';
import TemplatePreview from '../components/TemplatePreview';
import { useImejisGenerate } from '../hooks/useImejisGenerate';
import type { WizardState } from '../types';

interface ImageStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

export default function ImageStep({ state, updateState }: ImageStepProps) {
  const { generateImage } = useImejisGenerate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPropertyPost = state.postType === 'property' && state.selectedProperty;
  const hasPropertyDescription = isPropertyPost && state.selectedProperty?.description;

  // Auto-populate context from property description
  useEffect(() => {
    if (isPropertyPost && hasPropertyDescription && !state.postContext) {
      updateState({
        postContext: state.selectedProperty?.description || '',
      });
    }
  }, [isPropertyPost, hasPropertyDescription, state.postContext, state.selectedProperty?.description, updateState]);

  // Handle template selection and image generation
  const handleTemplateSelect = async (templateId: string) => {
    updateState({ selectedTemplateId: templateId });

    if (state.selectedProperty) {
      updateState({ isGeneratingImage: true });

      const result = await generateImage({
        templateId,
        property: state.selectedProperty,
      });

      if (result.success) {
        updateState({
          generatedImageUrl: result.imageUrl || null,
          generatedImageBlob: result.imageBlob || null,
          isGeneratingImage: false,
          // Clear custom image when using template
          customImageFile: null,
          customImagePreview: null,
        });
      } else {
        updateState({
          isGeneratingImage: false,
          errors: { ...state.errors, image: result.error || 'Failed to generate image' }
        });
      }
    }
  };

  // Handle regenerate
  const handleRegenerate = async () => {
    if (state.selectedTemplateId && state.selectedProperty) {
      await handleTemplateSelect(state.selectedTemplateId);
    }
  };

  // Handle custom image upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      updateState({
        customImageFile: file,
        customImagePreview: previewUrl,
        // Clear template selection when uploading custom
        selectedTemplateId: null,
        generatedImageUrl: null,
        generatedImageBlob: null,
      });
    }
  };

  // Clear custom image
  const handleClearCustomImage = () => {
    if (state.customImagePreview) {
      URL.revokeObjectURL(state.customImagePreview);
    }
    updateState({
      customImageFile: null,
      customImagePreview: null,
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">
            {isPropertyPost ? 'Create Branded Image' : 'Add Image'}
          </h2>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              {isPropertyPost
                ? 'Create a professional branded image using our templates'
                : 'Upload an image for your post'}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Template/Upload Selection */}
          <div className="space-y-4">
            {/* Property Post: Show Imejis Templates */}
            {isPropertyPost && (
              <>
                <Label>Choose Template</Label>
                <TemplateSelector
                  selectedTemplateId={state.selectedTemplateId}
                  onSelect={handleTemplateSelect}
                />

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Upload Custom Image */}
            <div>
              <Label className="mb-2 block">
                {isPropertyPost ? 'Upload custom image instead' : 'Upload Image'}
              </Label>

              {state.customImagePreview ? (
                <div className="relative">
                  <img
                    src={state.customImagePreview}
                    alt="Custom upload"
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleClearCustomImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-muted/50 transition-colors"
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Skip option for text-only */}
            {state.postType === 'text-only' && (
              <p className="text-sm text-muted-foreground">
                You can skip this step for a text-only post.
              </p>
            )}
          </div>

          {/* Right Column: Preview + Context */}
          <div className="space-y-4">
            {/* Image Preview */}
            {isPropertyPost && (
              <div>
                <Label className="mb-2 block">Preview</Label>
                <TemplatePreview
                  imageUrl={state.generatedImageUrl}
                  isLoading={state.isGeneratingImage}
                  onRegenerate={handleRegenerate}
                />
              </div>
            )}

            {/* Context for Caption AI */}
            <div>
              <Label className="mb-2 block">Context for Caption AI</Label>

              {/* Warning if property description missing */}
              {isPropertyPost && !hasPropertyDescription && (
                <Alert className="mb-2 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    Property description is missing. Please add context below to help generate a better caption.
                  </AlertDescription>
                </Alert>
              )}

              <Textarea
                placeholder={
                  isPropertyPost
                    ? "Add additional context about this property or what makes it special..."
                    : "What is this post about? This helps AI generate a better caption."
                }
                value={state.postContext}
                onChange={(e) => updateState({ postContext: e.target.value })}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This context will be used to generate your caption in the next step.
              </p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
