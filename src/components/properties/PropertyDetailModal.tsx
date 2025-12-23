import { useState, useEffect } from 'react';
import { 
  Save, Loader2, Home, Bed, Bath, Square, MapPin, DollarSign, 
  Image as ImageIcon, FileText, Tag, Calendar, RefreshCw 
} from 'lucide-react';
import { PropertyImageGallery } from './PropertyImageGallery';
import { AICaptionGenerator } from '@/components/social/AICaptionGenerator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from 'sonner';
import type { Property, PropertyCondition, PropertyType, PropertyStatus } from '@/types';
import { useProperty, useUpdateProperty, useCustomFields, getApiConfig } from '@/services/ghlApi';
import { useAppStore } from '@/store/useAppStore';

interface PropertyDetailModalProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const PROPERTY_CONDITIONS: PropertyCondition[] = [
  'Excellent', 'Great', 'Good', 'Fair', 'Poor', 'Terrible', 'Needs some Repair'
];

const PROPERTY_TYPES: PropertyType[] = [
  'Single Family', 'Duplex', 'Multi Family', 'Condo', 'Lot', 
  'Mobile Home', 'Town House', 'Commercial', 'Triplex', '4-plex'
];

const STATUS_OPTIONS: PropertyStatus[] = [
  'pending', 'posted', 'scheduled', 'skipped', 'deleted', 'processing'
];

// Custom field mapping for GHL
const PROPERTY_CUSTOM_FIELDS = {
  address: 'property_address',
  city: 'property_city',
  beds: 'property_beds',
  baths: 'property_baths',
  sqft: 'property_sqft',
  condition: 'property_condition',
  propertyType: 'property_type',
  heroImage: 'property_hero_image',
  images: 'property_images',
  description: 'property_description',
  status: 'social_status',
  caption: 'social_caption',
  brandedImage: 'branded_image',
  postedDate: 'posted_date',
  scheduledDate: 'scheduled_date',
  downPayment: '0Wq2qVjwE3Qc5kCvtcAj',
  monthlyPayment: 'U3Ago0WNHeF0jv1lGmi4',
};

export function PropertyDetailModal({
  property: initialProperty,
  open,
  onOpenChange,
  onSaved,
}: PropertyDetailModalProps) {
  const { connectionStatus } = useAppStore();
  const ghlConfig = getApiConfig();
  const isGhlConnected = connectionStatus.highLevel && ghlConfig.apiKey;

  const updateProperty = useUpdateProperty();

  // Fetch custom fields for the dropdown (only if GHL connected)
  const { data: customFieldsData } = useCustomFields('opportunity');

  // Local form state
  const [formData, setFormData] = useState<Partial<Property>>({});
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading] = useState(false);

  // Populate form when property changes
  useEffect(() => {
    if (initialProperty) {
      console.log('[PropertyDetailModal] Loading property:', {
        propertyCode: initialProperty.propertyCode,
        propertyType: initialProperty.propertyType,
        condition: initialProperty.condition,
        price: initialProperty.price,
        monthlyPayment: initialProperty.monthlyPayment,
        downPayment: initialProperty.downPayment,
      });
      setFormData(initialProperty);
      setHasChanges(false);
    }
  }, [initialProperty]);

  const handleFieldChange = (field: keyof Property, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!initialProperty?.ghlOpportunityId || !isGhlConnected) {
      toast.error('Cannot save - property is not synced with GHL');
      return;
    }

    try {
      // Build custom fields update
      const customFieldsUpdate: Record<string, string> = {};
      
      // Map form data to custom fields
      if (formData.address) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.address] = formData.address;
      if (formData.city) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.city] = formData.city;
      if (formData.beds !== undefined) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.beds] = String(formData.beds);
      if (formData.baths !== undefined) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.baths] = String(formData.baths);
      if (formData.sqft !== undefined) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.sqft] = String(formData.sqft);
      if (formData.condition) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.condition] = formData.condition;
      if (formData.propertyType) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.propertyType] = formData.propertyType;
      if (formData.description) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.description] = formData.description;
      if (formData.heroImage) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.heroImage] = formData.heroImage;
      if (formData.caption) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.caption] = formData.caption;
      if (formData.downPayment !== undefined) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.downPayment] = String(formData.downPayment);
      if (formData.monthlyPayment !== undefined) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.monthlyPayment] = String(formData.monthlyPayment);
      
      // Status mapping
      if (formData.status) {
        const statusMap: Record<PropertyStatus, string> = {
          pending: 'SM-Pending',
          posted: 'SM-Posted',
          scheduled: 'SM-Scheduled',
          skipped: 'SM-Skipped',
          deleted: 'SM-Deleted',
          processing: 'SM-Processing',
        };
        customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.status] = statusMap[formData.status];
      }

      // Include any other custom field values
      Object.entries(customFieldValues).forEach(([key, value]) => {
        if (!Object.values(PROPERTY_CUSTOM_FIELDS).includes(key)) {
          customFieldsUpdate[key] = value;
        }
      });

      await updateProperty.mutateAsync({
        id: initialProperty.ghlOpportunityId,
        monetaryValue: formData.price,
        customFields: customFieldsUpdate,
      });

      toast.success('Property saved!');
      setHasChanges(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  // Get additional custom fields that aren't part of the standard property fields
  const additionalCustomFields = customFieldsData?.customFields?.filter(
    cf => !Object.values(PROPERTY_CUSTOM_FIELDS).includes(cf.fieldKey)
  ) || [];

  const property = formData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-bold">
                {property.propertyCode || 'Property Details'}
              </DialogTitle>
              {property.status && <StatusBadge status={property.status} />}
              {property.isDemo && (
                <Badge variant="secondary" className="bg-accent">DEMO</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isGhlConnected && property.isDemo && (
                <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                  Demo Mode
                </Badge>
              )}
              {onSaved && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSaved()}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Image Gallery */}
              <PropertyImageGallery
                images={formData.images || []}
                heroImage={formData.heroImage || '/placeholder.svg'}
                onHeroChange={(url) => handleFieldChange('heroImage', url)}
                onImagesChange={(imgs) => {
                  setFormData(prev => ({ ...prev, images: imgs }));
                  setHasChanges(true);
                }}
                editable={isGhlConnected}
              />

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Property Details</TabsTrigger>
                  <TabsTrigger value="social">Social Media</TabsTrigger>
                  <TabsTrigger value="custom">Custom Fields</TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="address" className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        Address
                      </Label>
                      <Input
                        id="address"
                        value={property.address || ''}
                        onChange={(e) => handleFieldChange('address', e.target.value)}
                        placeholder="123 Main St"
                      />
                    </div>

                    <div>
                      <Label htmlFor="city" className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        City / State / Zip
                      </Label>
                      <Input
                        id="city"
                        value={property.city || ''}
                        onChange={(e) => handleFieldChange('city', e.target.value)}
                        placeholder="Phoenix, AZ 85001"
                      />
                    </div>

                    <div>
                      <Label htmlFor="price" className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        Total Price
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        value={property.price || ''}
                        onChange={(e) => handleFieldChange('price', parseInt(e.target.value) || 0)}
                        placeholder="250000"
                      />
                    </div>

                    <div>
                      <Label htmlFor="downPayment" className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        Down Payment
                      </Label>
                      <Input
                        id="downPayment"
                        type="number"
                        value={property.downPayment || ''}
                        onChange={(e) => handleFieldChange('downPayment', parseInt(e.target.value) || 0)}
                        placeholder="15000"
                      />
                    </div>

                    <div>
                      <Label htmlFor="monthlyPayment" className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        Monthly Payment
                      </Label>
                      <Input
                        id="monthlyPayment"
                        type="number"
                        value={property.monthlyPayment || ''}
                        onChange={(e) => handleFieldChange('monthlyPayment', parseInt(e.target.value) || 0)}
                        placeholder="1850"
                      />
                    </div>

                    <div>
                      <Label htmlFor="beds" className="flex items-center gap-2 mb-2">
                        <Bed className="h-4 w-4 text-muted-foreground" />
                        Beds
                      </Label>
                      <Input
                        id="beds"
                        type="number"
                        value={property.beds || ''}
                        onChange={(e) => handleFieldChange('beds', parseInt(e.target.value) || 0)}
                        placeholder="3"
                      />
                    </div>

                    <div>
                      <Label htmlFor="baths" className="flex items-center gap-2 mb-2">
                        <Bath className="h-4 w-4 text-muted-foreground" />
                        Baths
                      </Label>
                      <Input
                        id="baths"
                        type="number"
                        step="0.5"
                        value={property.baths || ''}
                        onChange={(e) => handleFieldChange('baths', parseFloat(e.target.value) || 0)}
                        placeholder="2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="sqft" className="flex items-center gap-2 mb-2">
                        <Square className="h-4 w-4 text-muted-foreground" />
                        Square Feet
                      </Label>
                      <Input
                        id="sqft"
                        type="number"
                        value={property.sqft || ''}
                        onChange={(e) => handleFieldChange('sqft', parseInt(e.target.value) || 0)}
                        placeholder="1800"
                      />
                    </div>

                    <div>
                      <Label htmlFor="propertyType" className="flex items-center gap-2 mb-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        Property Type
                      </Label>
                      <Select 
                        value={property.propertyType || ''} 
                        onValueChange={(v) => handleFieldChange('propertyType', v as PropertyType)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPERTY_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="condition" className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        Condition
                      </Label>
                      <Select 
                        value={property.condition || ''} 
                        onValueChange={(v) => handleFieldChange('condition', v as PropertyCondition)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPERTY_CONDITIONS.map(cond => (
                            <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="description" className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={property.description || ''}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        placeholder="Property description..."
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Social Media Tab */}
                <TabsContent value="social" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status" className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        Social Status
                      </Label>
                      <Select 
                        value={property.status || 'pending'} 
                        onValueChange={(v) => handleFieldChange('status', v as PropertyStatus)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(status => (
                            <SelectItem key={status} value={status}>
                              <span className="capitalize">{status}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {property.postedDate && (
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          Posted Date
                        </Label>
                        <Input value={property.postedDate} disabled />
                      </div>
                    )}

                    {property.scheduledDate && (
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          Scheduled Date
                        </Label>
                        <Input value={property.scheduledDate} disabled />
                      </div>
                    )}

                    <div className="col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="caption" className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Social Caption
                        </Label>
                        <AICaptionGenerator
                          property={formData}
                          onCaptionGenerated={(platform, caption) => {
                            handleFieldChange('caption', caption);
                          }}
                        />
                      </div>
                      <Textarea
                        id="caption"
                        value={property.caption || ''}
                        onChange={(e) => handleFieldChange('caption', e.target.value)}
                        placeholder="Social media caption..."
                        className="min-h-[120px]"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="heroImage" className="flex items-center gap-2 mb-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        Hero Image URL
                      </Label>
                      <Input
                        id="heroImage"
                        value={property.heroImage || ''}
                        onChange={(e) => handleFieldChange('heroImage', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="brandedImage" className="flex items-center gap-2 mb-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        Branded Image URL
                      </Label>
                      <Input
                        id="brandedImage"
                        value={property.brandedImage || ''}
                        onChange={(e) => handleFieldChange('brandedImage', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Custom Fields Tab */}
                <TabsContent value="custom" className="space-y-4 mt-4">
                  {additionalCustomFields.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {additionalCustomFields.map(field => (
                        <div key={field.id}>
                          <Label htmlFor={field.id} className="mb-2 block">
                            {field.name}
                          </Label>
                          <Input
                            id={field.id}
                            value={customFieldValues[field.id] || ''}
                            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                            placeholder={`Enter ${field.name.toLowerCase()}...`}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Type: {field.dataType}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No additional custom fields found</p>
                      <p className="text-xs mt-1">
                        Custom fields from GHL will appear here
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {hasChanges ? (
              <span className="text-yellow-500">Unsaved changes</span>
            ) : (
              <span>No changes</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || updateProperty.isPending}
            >
              {updateProperty.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}