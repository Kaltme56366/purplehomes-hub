import { useState } from 'react';
import { Upload, X, Search, Building2, Loader2, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';

interface ContentSourceCardProps {
  properties: Property[];
  selectedProperty: Property | null;
  onSelectProperty: (property: Property | null) => void;
  image: string | null;
  onImageChange: (image: string | null) => void;
  isLoading?: boolean;
}

export function ContentSourceCard({
  properties,
  selectedProperty,
  onSelectProperty,
  image,
  onImageChange,
  isLoading = false,
}: ContentSourceCardProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get recent properties (non-demo, with images prioritized)
  const recentProperties = properties
    .filter(p => !p.isDemo)
    .sort((a, b) => {
      // Prioritize properties with images
      if (a.heroImage && !b.heroImage) return -1;
      if (!a.heroImage && b.heroImage) return 1;
      return 0;
    })
    .slice(0, 3);

  // Filter properties based on search
  const filteredProperties = properties.filter(p =>
    p.propertyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onImageChange(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePropertySelect = (property: Property) => {
    onSelectProperty(property);
    // Auto-fill image from property if available
    if (property.heroImage && !image) {
      onImageChange(property.heroImage);
    }
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleCustomPost = () => {
    onSelectProperty(null);
    setShowSearch(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
            1
          </span>
          Content Source
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Image Upload Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Image</label>
            {image ? (
              <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-border group">
                <img
                  src={image}
                  alt="Post"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label htmlFor="image-upload">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="cursor-pointer"
                      asChild
                    >
                      <span>Change</span>
                    </Button>
                  </label>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onImageChange(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors"
              >
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Click to upload
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  or drag and drop
                </span>
              </label>
            )}
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* Property Selection Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Property (Optional)</label>

            {isLoading ? (
              /* Loading State */
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-lg border-2 border-border">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-12 h-12 rounded flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-center py-2">
                  <span className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading properties...
                  </span>
                </div>
              </div>
            ) : properties.length === 0 ? (
              /* Empty State */
              <div className="p-6 rounded-lg border-2 border-dashed border-border text-center">
                <Home className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No properties found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Properties will appear here once synced from Airtable
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCustomPost}
                  className="mt-3"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Create custom post
                </Button>
              </div>
            ) : !showSearch ? (
              <div className="space-y-2">
                {/* Recent Properties */}
                {recentProperties.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => handlePropertySelect(property)}
                    className={cn(
                      "w-full p-3 rounded-lg border-2 transition-all text-left hover:border-primary/50",
                      selectedProperty?.id === property.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {property.heroImage && (
                        <img
                          src={property.heroImage}
                          alt={property.propertyCode}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {property.propertyCode}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {property.address}
                        </div>
                      </div>
                      {selectedProperty?.id === property.id && (
                        <div className="flex-shrink-0">
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <svg className="w-3 h-3 text-primary-foreground" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSearch(true)}
                    className="w-full"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search more...
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCustomPost}
                    className={cn(
                      "w-full",
                      selectedProperty === null && "border-primary bg-primary/5"
                    )}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Custom post
                  </Button>
                </div>

                {selectedProperty && (
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {selectedProperty.propertyCode}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedProperty.address}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {selectedProperty.beds} bed • {selectedProperty.baths} bath • ${selectedProperty.price.toLocaleString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCustomPost}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Search Interface */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by code or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Search Results */}
                <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-2">
                  {filteredProperties.length > 0 ? (
                    filteredProperties.map((property) => (
                      <button
                        key={property.id}
                        onClick={() => handlePropertySelect(property)}
                        className="w-full p-2 rounded hover:bg-muted transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          {property.heroImage && (
                            <img
                              src={property.heroImage}
                              alt={property.propertyCode}
                              className="w-10 h-10 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium flex items-center gap-2">
                              {property.propertyCode}
                              {property.isDemo && (
                                <Badge variant="secondary" className="text-xs">
                                  Demo
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {property.address}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No properties found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
