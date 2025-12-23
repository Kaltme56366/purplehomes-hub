import { useState, useRef } from 'react';
import { FileText, Send, Printer, Check, Bed, Bath, Maximize2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { demoProperties, mockProperties } from '@/data/mockData.backup';
import type { Buyer, Property } from '@/types';

interface SendInventoryModalProps {
  buyer: Buyer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const allProperties = [...demoProperties, ...mockProperties];

export function SendInventoryModal({ buyer, open, onOpenChange }: SendInventoryModalProps) {
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Filter properties that match buyer preferences
  const matchingProperties = allProperties.filter((property) => {
    if (property.beds < (buyer.preferences.minBeds || 0)) return false;
    if (property.beds > (buyer.preferences.maxBeds || 10)) return false;
    if (property.baths < (buyer.preferences.minBaths || 0)) return false;
    if (property.baths > (buyer.preferences.maxBaths || 10)) return false;
    if (property.price < (buyer.preferences.minPrice || 0)) return false;
    if (property.price > (buyer.preferences.maxPrice || Infinity)) return false;
    return true;
  });

  const toggleProperty = (propertyId: string) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const selectAll = () => {
    setSelectedProperties(matchingProperties.map(p => p.id));
  };

  const clearAll = () => {
    setSelectedProperties([]);
  };

  const selectedPropertyData = allProperties.filter(p => selectedProperties.includes(p.id));

  const handleGenerateDraft = () => {
    if (selectedProperties.length === 0) {
      toast.error('Please select at least one property');
      return;
    }
    setShowPreview(true);
  };

  const handleSend = () => {
    toast.success(`Property list sent to ${buyer.name}!`, {
      description: `${selectedProperties.length} properties included`
    });
    onOpenChange(false);
    setShowPreview(false);
    setSelectedProperties([]);
  };

  const handlePrint = () => {
    window.print();
  };

  if (showPreview) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setShowPreview(false);
        }
        onOpenChange(isOpen);
      }}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Property List Preview - Draft
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(95vh-180px)]">
            {/* PDF Preview Content */}
            <div ref={pdfRef} className="p-6 bg-white text-black print:p-0">
              {/* Purple Homes Header */}
              <div className="text-center mb-8 pb-6 border-b-4 border-purple-600">
                <h1 className="text-4xl font-bold text-purple-600 mb-2">Purple Homes</h1>
                <p className="text-gray-600">Premium Property Investment Opportunities</p>
              </div>

              {/* Buyer Info */}
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <h2 className="text-lg font-semibold text-purple-800 mb-2">Prepared for:</h2>
                <p className="text-xl font-bold">{buyer.name}</p>
                <p className="text-gray-600">{buyer.email}</p>
                <p className="text-gray-600">{buyer.phone}</p>
              </div>

              {/* Property Criteria */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Your Search Criteria:</h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span>Beds: {buyer.preferences.minBeds}-{buyer.preferences.maxBeds}</span>
                  <span>Baths: {buyer.preferences.minBaths}-{buyer.preferences.maxBaths}</span>
                  <span>Price: ${buyer.preferences.minPrice?.toLocaleString()} - ${buyer.preferences.maxPrice?.toLocaleString()}</span>
                </div>
                <div className="mt-2">
                  <span className="text-sm text-gray-600">Zip Codes: {buyer.preferredZipCodes.join(', ')}</span>
                </div>
              </div>

              {/* Properties List */}
              <h3 className="text-xl font-bold text-purple-800 mb-4">
                Available Properties ({selectedPropertyData.length})
              </h3>

              <div className="space-y-6">
                {selectedPropertyData.map((property, index) => (
                  <div key={property.id} className="border rounded-lg overflow-hidden">
                    <div className="flex">
                      <img 
                        src={property.heroImage} 
                        alt={property.address}
                        className="w-48 h-36 object-cover"
                      />
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-purple-600 font-medium">#{index + 1} - {property.propertyCode}</p>
                            <h4 className="text-lg font-bold">{property.address}</h4>
                            <p className="text-gray-600">{property.city}</p>
                          </div>
                          <p className="text-2xl font-bold text-purple-600">
                            ${property.price.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-6 mt-3 text-gray-600">
                          <span className="flex items-center gap-1">
                            <Bed className="h-4 w-4" /> {property.beds} beds
                          </span>
                          <span className="flex items-center gap-1">
                            <Bath className="h-4 w-4" /> {property.baths} baths
                          </span>
                          {property.sqft && (
                            <span className="flex items-center gap-1">
                              <Maximize2 className="h-4 w-4" /> {property.sqft.toLocaleString()} sqft
                            </span>
                          )}
                        </div>
                        {property.description && (
                          <p className="text-sm text-gray-500 mt-2 line-clamp-2">{property.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t text-center text-gray-500 text-sm">
                <p className="text-purple-600 font-semibold mb-1">Purple Homes</p>
                <p>Contact us for more information about these investment opportunities</p>
                <p className="mt-2">Generated on {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="p-6 pt-4 border-t flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowPreview(false)}
              className="flex-1"
            >
              Back to Selection
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button 
              onClick={handleSend}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send to {buyer.name}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Send Property List to {buyer.name}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Select properties that match their criteria to include in the PDF
          </p>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-4">
          {/* Buyer Criteria Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-2">Buyer Preferences:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {buyer.preferences.minBeds}-{buyer.preferences.maxBeds} beds
                </Badge>
                <Badge variant="secondary">
                  {buyer.preferences.minBaths}-{buyer.preferences.maxBaths} baths
                </Badge>
                <Badge variant="secondary">
                  ${buyer.preferences.minPrice?.toLocaleString()} - ${buyer.preferences.maxPrice?.toLocaleString()}
                </Badge>
                {buyer.preferredZipCodes.slice(0, 3).map(zip => (
                  <Badge key={zip} variant="outline">{zip}</Badge>
                ))}
                {buyer.preferredZipCodes.length > 3 && (
                  <Badge variant="outline">+{buyer.preferredZipCodes.length - 3} more</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {matchingProperties.length} matching properties • {selectedProperties.length} selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear
              </Button>
            </div>
          </div>

          <Separator />

          {/* Properties List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {matchingProperties.map((property) => {
                const isSelected = selectedProperties.includes(property.id);
                return (
                  <Card 
                    key={property.id}
                    className={`cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                    onClick={() => toggleProperty(property.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-4">
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => toggleProperty(property.id)}
                        />
                        <img 
                          src={property.heroImage} 
                          alt={property.address}
                          className="w-20 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{property.address}</p>
                            {property.isDemo && (
                              <Badge variant="secondary" className="text-xs">DEMO</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{property.city}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            <span>{property.beds} bed</span>
                            <span>{property.baths} bath</span>
                            {property.sqft && <span>{property.sqft.toLocaleString()} sqft</span>}
                          </div>
                        </div>
                        <p className="font-bold text-primary">${property.price.toLocaleString()}</p>
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {matchingProperties.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No properties match this buyer's criteria
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-0 flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleGenerateDraft}
            disabled={selectedProperties.length === 0}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Draft ({selectedProperties.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}