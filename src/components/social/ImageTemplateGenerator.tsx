import { useState, useRef, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Wand2, Download, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import type { Property } from '@/types';
import type {
  TemplateId,
  ImageFormat,
  TemplateSettings,
  PropertyData,
  CanvasDimensions,
} from './templates/types';
import { TEMPLATES, FORMAT_DIMENSIONS, DEFAULT_SETTINGS } from './templates/types';
import { downloadCanvas, exportCanvas } from './templates/fabricUtils';

// Import template renderers
import {
  renderModernFrameTemplate,
  renderDiagonalBoldTemplate,
  renderLuxuryShowcaseTemplate,
  renderCleanMinimalTemplate,
} from './templates/fabric-designs';

interface Props {
  properties: Property[];
  selectedProperty?: Property | null;
  onImageGenerated?: (imageUrl: string) => void;
  trigger?: React.ReactNode;
}

// Map template ID to render function
const TEMPLATE_RENDERERS: Record<
  TemplateId,
  (
    canvas: fabric.Canvas,
    property: PropertyData,
    dimensions: CanvasDimensions,
    settings: TemplateSettings
  ) => Promise<void>
> = {
  'modern-frame': renderModernFrameTemplate,
  'diagonal-bold': renderDiagonalBoldTemplate,
  'luxury-showcase': renderLuxuryShowcaseTemplate,
  'clean-minimal': renderCleanMinimalTemplate,
};

export default function ImageTemplateGenerator({
  properties,
  selectedProperty: externalProperty,
  onImageGenerated,
  trigger,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('clean-minimal');
  const [settings, setSettings] = useState<TemplateSettings>(DEFAULT_SETTINGS);
  const [isRendering, setIsRendering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // Get the selected property
  const selectedProperty =
    externalProperty || properties.find((p) => p.id === selectedPropertyId) || null;

  // Convert Property to PropertyData
  const propertyData: PropertyData | null = selectedProperty
    ? {
        address: selectedProperty.address,
        city: selectedProperty.city,
        price: selectedProperty.price,
        beds: selectedProperty.beds,
        baths: selectedProperty.baths,
        sqft: selectedProperty.sqft,
        propertyType: selectedProperty.propertyType,
        heroImage: selectedProperty.heroImage || '/placeholder.svg',
        arv: (selectedProperty as any).arv,
        repairCost: (selectedProperty as any).repairCost,
        propertyCode: selectedProperty.propertyCode,
      }
    : null;

  // Set initial property when dialog opens with external property
  useEffect(() => {
    if (isOpen && externalProperty) {
      setSelectedPropertyId(externalProperty.id);
    }
  }, [isOpen, externalProperty]);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || !isOpen) return;

    const dimensions = FORMAT_DIMENSIONS[settings.format];

    // Create or resize canvas
    if (!fabricCanvasRef.current) {
      fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
        width: dimensions.width,
        height: dimensions.height,
        selection: false,
      });
    } else {
      fabricCanvasRef.current.setDimensions({
        width: dimensions.width,
        height: dimensions.height,
      });
    }

    return () => {
      // Don't dispose on every render, only on unmount
    };
  }, [isOpen, settings.format]);

  // Dispose canvas on unmount or when dialog closes
  useEffect(() => {
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  // Render template when dependencies change
  useEffect(() => {
    if (!fabricCanvasRef.current || !propertyData || !isOpen) return;

    const renderTemplate = async () => {
      setIsRendering(true);
      try {
        const dimensions = FORMAT_DIMENSIONS[settings.format];
        const renderer = TEMPLATE_RENDERERS[selectedTemplate];

        if (renderer && fabricCanvasRef.current) {
          await renderer(fabricCanvasRef.current, propertyData, dimensions, settings);
        }
      } catch (error) {
        console.error('Error rendering template:', error);
        toast.error('Failed to render template');
      } finally {
        setIsRendering(false);
      }
    };

    renderTemplate();
  }, [selectedTemplate, propertyData, settings, isOpen]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedProperty) return;

    setIsExporting(true);
    try {
      downloadCanvas(
        fabricCanvasRef.current,
        `${selectedProperty.propertyCode || 'property'}-${selectedTemplate}`
      );
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Failed to download image');
    } finally {
      setIsExporting(false);
    }
  }, [selectedProperty, selectedTemplate]);

  // Handle use in post
  const handleUseInPost = useCallback(() => {
    if (!fabricCanvasRef.current || !onImageGenerated) return;

    setIsExporting(true);
    try {
      const dataUrl = exportCanvas(fabricCanvasRef.current);
      onImageGenerated(dataUrl);
      setIsOpen(false);
      toast.success('Image ready for posting!');
    } catch (error) {
      toast.error('Failed to generate image');
    } finally {
      setIsExporting(false);
    }
  }, [onImageGenerated]);

  // Get current template config
  const currentTemplate = TEMPLATES.find((t) => t.id === selectedTemplate);
  const dimensions = FORMAT_DIMENSIONS[settings.format];

  // Calculate preview scale to fit in UI
  const previewScale = Math.min(400 / dimensions.width, 500 / dimensions.height);

  // Filter properties to those with images
  const propertiesWithImages = properties.filter((p) => p.heroImage);

  // Update settings helper
  const updateSettings = (partial: Partial<TemplateSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Generate Image
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-500" />
            Generate Branded Image
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6 h-full">
            {/* LEFT: Controls */}
            <div className="space-y-4 overflow-y-auto pr-2">
              {/* Property Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Property</Label>
                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property..." />
                  </SelectTrigger>
                  <SelectContent>
                    {propertiesWithImages.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{property.propertyCode}</span>
                          <span className="text-muted-foreground text-xs truncate">
                            {property.address}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                    {propertiesWithImages.length === 0 && (
                      <SelectItem value="" disabled>
                        No properties with images
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Template Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Template</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={(v) => setSelectedTemplate(v as TemplateId)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <span className="flex items-center gap-2">
                          <span>{template.icon}</span>
                          <span>{template.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentTemplate && (
                  <p className="text-xs text-muted-foreground">{currentTemplate.description}</p>
                )}
              </div>

              {/* Format Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Size</Label>
                <div className="flex gap-2">
                  {(Object.keys(FORMAT_DIMENSIONS) as ImageFormat[]).map((format) => (
                    <Button
                      key={format}
                      variant={settings.format === format ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSettings({ format })}
                      className="flex-1"
                      disabled={
                        currentTemplate && !currentTemplate.supportedFormats.includes(format)
                      }
                    >
                      {FORMAT_DIMENSIONS[format].label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Display Options */}
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <Label className="text-xs font-medium text-muted-foreground">
                  Display Options
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showAddress"
                      checked={settings.showAddress}
                      onCheckedChange={(v) => updateSettings({ showAddress: !!v })}
                    />
                    <Label htmlFor="showAddress" className="text-sm cursor-pointer">
                      Show Address
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showPrice"
                      checked={settings.showPrice}
                      onCheckedChange={(v) => updateSettings({ showPrice: !!v })}
                    />
                    <Label htmlFor="showPrice" className="text-sm cursor-pointer">
                      Show Price
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showSpecs"
                      checked={settings.showSpecs}
                      onCheckedChange={(v) => updateSettings({ showSpecs: !!v })}
                    />
                    <Label htmlFor="showSpecs" className="text-sm cursor-pointer">
                      Show Specs (Beds/Baths/SqFt)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showLogo"
                      checked={settings.showLogo}
                      onCheckedChange={(v) => updateSettings({ showLogo: !!v })}
                    />
                    <Label htmlFor="showLogo" className="text-sm cursor-pointer">
                      Show Logo
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Preview */}
            <div className="flex flex-col items-center justify-center bg-muted/20 rounded-lg p-4 min-h-[400px]">
              {selectedProperty ? (
                <>
                  {/* Canvas Preview */}
                  <div
                    className="relative border rounded-lg overflow-hidden shadow-lg bg-white"
                    style={{
                      width: dimensions.width * previewScale,
                      height: dimensions.height * previewScale,
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      style={{
                        transform: `scale(${previewScale})`,
                        transformOrigin: 'top left',
                      }}
                    />

                    {isRendering && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-4 w-full max-w-sm">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleDownload}
                      disabled={isRendering || isExporting}
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download
                    </Button>
                    {onImageGenerated && (
                      <Button
                        className="flex-1"
                        onClick={handleUseInPost}
                        disabled={isRendering || isExporting}
                      >
                        {isExporting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Use in Post
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a property to preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
