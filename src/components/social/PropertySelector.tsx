import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Home, Search, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';

interface PropertySelectorProps {
  properties: Property[];
  selectedProperty: Property | null;
  onSelect: (property: Property | null) => void;
}

export function PropertySelector({ properties, selectedProperty, onSelect }: PropertySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProperties = useMemo(() => {
    if (!searchQuery) return properties;
    const query = searchQuery.toLowerCase();
    return properties.filter(p => 
      p.address.toLowerCase().includes(query) ||
      p.propertyCode?.toLowerCase().includes(query) ||
      p.city.toLowerCase().includes(query)
    );
  }, [properties, searchQuery]);

  const handleSelect = (property: Property) => {
    onSelect(property);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelect(null);
    setSearchQuery('');
  };

  if (selectedProperty) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Home className="h-4 w-4" />
              Selected Property
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <img 
              src={selectedProperty.heroImage} 
              alt="" 
              className="h-16 w-16 rounded-lg object-cover flex-shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{selectedProperty.propertyCode}</span>
                {selectedProperty.isDemo && (
                  <Badge variant="secondary" className="text-xs">DEMO</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{selectedProperty.address}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{selectedProperty.beds} bd</span>
                <span>•</span>
                <span>{selectedProperty.baths} ba</span>
                <span>•</span>
                <span>${selectedProperty.price?.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-xs text-green-500 flex items-center gap-1">
              <Check className="h-3 w-3" />
              AI captions will use this property's details
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Home className="h-4 w-4" />
          Select Property for Caption
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isOpen ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by address or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-[250px] overflow-y-auto space-y-2">
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  onClick={() => handleSelect(property)}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                    "hover:bg-muted border border-transparent hover:border-primary/30"
                  )}
                >
                  <img 
                    src={property.heroImage} 
                    alt="" 
                    className="h-10 w-10 rounded object-cover flex-shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{property.propertyCode}</span>
                      {property.isDemo && (
                        <Badge variant="secondary" className="text-xs">DEMO</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ${property.price?.toLocaleString()}
                  </span>
                </div>
              ))}
              {filteredProperties.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No properties found
                </p>
              )}
            </div>
            <Button variant="outline" className="w-full" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => setIsOpen(true)}
          >
            <Search className="h-4 w-4" />
            Choose a property to auto-fill captions...
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
