import { useState, useMemo, useEffect } from 'react';
import { Search, Bed, Bath, Maximize2, Phone, MapPin, X, Wrench, Heart, ChevronDown, SlidersHorizontal, ChevronUp, List as ListIcon, DollarSign, Home } from 'lucide-react';
import type { PropertyCondition, PropertyType, Property } from '@/types';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { demoProperties, mockProperties } from '@/data/mockData';
import { toast } from 'sonner';
import { PropertyMap } from '@/components/listings/PropertyMap';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubmitForm } from '@/services/ghlApi';

const PROPERTY_TYPES: PropertyType[] = [
  'Single Family', 'Duplex', 'Multi Family', 'Condo', 'Lot', 
  'Mobile Home', 'Town House', 'Commercial', 'Triplex', '4-plex'
];

const CONDITION_OPTIONS: PropertyCondition[] = [
  'Excellent', 'Great', 'Good', 'Fair', 'Poor', 'Terrible', 'Needs some Repair'
];

const allProperties = [...demoProperties, ...mockProperties];

type SortOption = 'price-high' | 'price-low' | 'newest' | 'beds' | 'sqft';

export default function PublicListings() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [downPaymentRange, setDownPaymentRange] = useState<[number, number]>([0, 1000000]);
  const [beds, setBeds] = useState('any');
  const [baths, setBaths] = useState('any');
  const [condition, setCondition] = useState('any');
  const [propertyType, setPropertyType] = useState('any');
  const [sortBy, setSortBy] = useState<SortOption>('price-high');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [savedProperties, setSavedProperties] = useState<Set<string>>(new Set());
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // Forms
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerForm, setOfferForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    offerAmount: '',
    message: ''
  });
  
  // GHL Form submission
  const submitForm = useSubmitForm();

  const filteredProperties = useMemo(() => {
    let results = allProperties.filter((property) => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (!property.address.toLowerCase().includes(searchLower) &&
            !property.city.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      if (zipCode) {
        const zip = property.city.match(/\d{5}/)?.[0] || '';
        if (!zip.includes(zipCode)) return false;
      }
      if (property.price < priceRange[0] || property.price > priceRange[1]) return false;
      if (property.downPayment !== undefined &&
          (property.downPayment < downPaymentRange[0] || property.downPayment > downPaymentRange[1])) return false;
      if (beds !== 'any' && property.beds < parseInt(beds)) return false;
      if (baths !== 'any' && property.baths < parseInt(baths)) return false;
      if (condition !== 'any' && property.condition !== condition) return false;
      if (propertyType !== 'any' && property.propertyType !== propertyType) return false;
      return true;
    });

    switch (sortBy) {
      case 'price-high':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'price-low':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'beds':
        results.sort((a, b) => b.beds - a.beds);
        break;
      case 'sqft':
        results.sort((a, b) => (b.sqft || 0) - (a.sqft || 0));
        break;
      case 'newest':
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return results;
  }, [search, zipCode, priceRange, beds, baths, condition, propertyType, sortBy]);

  const toggleSaved = (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedProperties(prev => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
        toast.success('Removed from saved');
      } else {
        next.add(propertyId);
        toast.success('Saved to favorites');
      }
      return next;
    });
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;
    
    try {
      // Submit to GHL Form API (Form ID: NrB0CMNYIpR8JpVDqpsE)
      await submitForm.mutateAsync({
        formId: 'NrB0CMNYIpR8JpVDqpsE',
        data: {
          first_name: offerForm.firstName,
          last_name: offerForm.lastName,
          email: offerForm.email,
          phone: offerForm.phone,
          offer_amount: offerForm.offerAmount,
          listing_message: offerForm.message,
          // Include property details for context
          property_address: selectedProperty.address,
          property_city: selectedProperty.city,
          property_price: selectedProperty.price.toString(),
        }
      });
      
      toast.success('Your offer has been submitted! We\'ll contact you within 24 hours.');
      setOfferForm({ firstName: '', lastName: '', email: '', phone: '', offerAmount: '', message: '' });
      setShowOfferForm(false);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to submit offer. Please try again or call us directly.');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setZipCode('');
    setBeds('any');
    setBaths('any');
    setCondition('any');
    setPropertyType('any');
    setPriceRange([0, 1000000]);
    setDownPaymentRange([0, 1000000]);
  };

  const activeFilterCount = [
    beds !== 'any',
    baths !== 'any',
    condition !== 'any',
    propertyType !== 'any',
    priceRange[0] > 0 || priceRange[1] < 1000000,
    downPaymentRange[0] > 0 || downPaymentRange[1] < 1000000,
  ].filter(Boolean).length;

  const formatPrice = (value: number | '') => {
    if (value === '') return '';
    return value.toLocaleString();
  };

  const parsePrice = (value: string): number | '' => {
    const num = parseInt(value.replace(/\D/g, ''));
    return isNaN(num) ? '' : num;
  };

  const PropertyCard = ({ property, compact = false }: { property: Property; compact?: boolean }) => {
    const isHovered = hoveredPropertyId === property.id;
    const isSaved = savedProperties.has(property.id);

    return (
      <div 
        className={cn(
          "group relative bg-card rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
          "border border-border/50 hover:border-purple-500/50",
          isHovered && "ring-2 ring-purple-500 shadow-lg shadow-purple-500/20",
          compact && "flex"
        )}
        onClick={() => {
          setSelectedProperty(property);
          if (isMobile) setMobileDrawerOpen(false);
        }}
        onMouseEnter={() => setHoveredPropertyId(property.id)}
        onMouseLeave={() => setHoveredPropertyId(null)}
      >
        <div className={cn(
          "relative overflow-hidden",
          compact ? "w-28 h-28 flex-shrink-0" : "aspect-[4/3]"
        )}>
          <img 
            src={property.heroImage} 
            alt={property.address}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {!compact && (
            <>
              <button
                onClick={(e) => toggleSaved(property.id, e)}
                className={cn(
                  "absolute top-3 right-3 p-2 rounded-full transition-all duration-200",
                  isSaved
                    ? "bg-purple-500 text-white"
                    : "bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                )}
              >
                <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
              </button>
              <div className="absolute bottom-3 left-3 space-y-1">
                <span className="block text-2xl font-bold text-white drop-shadow-lg">
                  ${property.price.toLocaleString()}
                </span>
                {property.downPayment !== undefined && (
                  <span className="block text-sm font-medium text-purple-200 drop-shadow-md bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
                    Down: ${property.downPayment.toLocaleString()}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className={cn("p-4", compact && "py-3 flex-1 min-w-0")}>
          {compact && (
            <p className="text-lg font-bold text-purple-400 mb-0.5">
              ${property.price.toLocaleString()}
            </p>
          )}
          <div className={cn(
            "flex items-center gap-3 text-sm text-muted-foreground mb-2",
            compact && "gap-2 text-xs mb-1"
          )}>
            <span className="flex items-center gap-1 font-medium">
              <Bed className="h-4 w-4" /> {property.beds}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Bath className="h-4 w-4" /> {property.baths}
            </span>
            {property.sqft && (
              <span className="flex items-center gap-1 font-medium">
                {property.sqft.toLocaleString()} sqft
              </span>
            )}
          </div>
          
          <h3 className={cn(
            "font-semibold text-foreground truncate",
            compact && "text-sm"
          )}>{property.address}</h3>
          <p className={cn(
            "text-sm text-muted-foreground truncate",
            compact && "text-xs"
          )}>{property.city}</p>
        </div>
      </div>
    );
  };

  const PropertyListPanel = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50">
        <div>
          <h2 className="font-semibold">{filteredProperties.length} Properties</h2>
          <p className="text-xs text-muted-foreground">Investment opportunities</p>
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[140px] text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="beds">Most Bedrooms</SelectItem>
            <SelectItem value="sqft">Largest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} compact={isMobile} />
          ))}

          {filteredProperties.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No properties match your criteria</p>
              <Button variant="link" onClick={clearFilters} className="text-purple-500">
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-card/95 backdrop-blur-md border-b border-border/50 z-50">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                Purple Homes
              </h1>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search address, city, zip..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-muted/50 border-0 focus-visible:ring-purple-500"
              />
            </div>
          </div>

          {/* Desktop Filters */}
          <div className="hidden lg:flex items-center gap-2">
            <Select value={beds} onValueChange={setBeds}>
              <SelectTrigger className="w-24 bg-muted/50 border-0">
                <SelectValue placeholder="Beds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Beds</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
              </SelectContent>
            </Select>

            <Select value={baths} onValueChange={setBaths}>
              <SelectTrigger className="w-24 bg-muted/50 border-0">
                <SelectValue placeholder="Baths" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Baths</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="gap-2 bg-muted/50 hover:bg-muted">
                  ${(priceRange[0]/1000).toFixed(0)}K - ${priceRange[1] >= 1000000 ? '1M+' : (priceRange[1]/1000).toFixed(0) + 'K'}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <Label>Price Range</Label>
                  <Slider
                    value={priceRange}
                    min={0}
                    max={1000000}
                    step={25000}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>${priceRange[0].toLocaleString()}</span>
                    <span>{priceRange[1] >= 1000000 ? '$1M+' : `$${priceRange[1].toLocaleString()}`}</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* More Filters */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 relative">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">All Filters</h4>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Property Type</Label>
                    <Select value={propertyType} onValueChange={setPropertyType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Type</SelectItem>
                        {PROPERTY_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Condition</Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Condition</SelectItem>
                        {CONDITION_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Zip Code</Label>
                    <Input
                      placeholder="Enter zip code"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      className="mt-1"
                      maxLength={5}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Down Payment Range</Label>
                    <Slider
                      value={downPaymentRange}
                      min={0}
                      max={1000000}
                      step={5000}
                      onValueChange={(value) => setDownPaymentRange(value as [number, number])}
                      className="mt-3"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>${downPaymentRange[0].toLocaleString()}</span>
                      <span>{downPaymentRange[1] >= 1000000 ? '$1M+' : `$${downPaymentRange[1].toLocaleString()}`}</span>
                    </div>
                  </div>

                  {/* Mobile-only filters */}
                  <div className="lg:hidden space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Price Range</Label>
                      <Slider
                        value={priceRange}
                        min={0}
                        max={1000000}
                        step={25000}
                        onValueChange={(value) => setPriceRange(value as [number, number])}
                        className="mt-3"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>${priceRange[0].toLocaleString()}</span>
                        <span>{priceRange[1] >= 1000000 ? '$1M+' : `$${priceRange[1].toLocaleString()}`}</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Bedrooms</Label>
                      <Select value={beds} onValueChange={setBeds}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="1">1+</SelectItem>
                          <SelectItem value="2">2+</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Bathrooms</Label>
                      <Select value={baths} onValueChange={setBaths}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="1">1+</SelectItem>
                          <SelectItem value="2">2+</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Contact */}
          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            <a href="tel:+1234567890" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Phone className="h-4 w-4" />
              <span className="hidden xl:inline">(123) 456-7890</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map - Full screen on mobile */}
        <div className="flex-1 relative">
          <PropertyMap 
            properties={filteredProperties}
            onPropertySelect={setSelectedProperty}
            hoveredPropertyId={hoveredPropertyId}
          />
        </div>

        {/* Desktop Side Panel */}
        <div className="hidden md:flex w-[420px] lg:w-[480px] flex-shrink-0 border-l border-border/50 bg-background flex-col">
          <PropertyListPanel />
        </div>

        {/* Mobile Drawer */}
        {isMobile && (
          <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <DrawerTrigger asChild>
              <Button 
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 shadow-xl bg-purple-600 hover:bg-purple-700 text-white gap-2 px-6"
                size="lg"
              >
                <ListIcon className="h-5 w-5" />
                {filteredProperties.length} Properties
                <ChevronUp className="h-4 w-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="h-[85vh]">
              <DrawerHeader className="sr-only">
                <DrawerTitle>Property Listings</DrawerTitle>
              </DrawerHeader>
              <PropertyListPanel />
            </DrawerContent>
          </Drawer>
        )}
      </div>

      {/* Property Detail Modal */}
      <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {selectedProperty && (
            <>
              <div className="relative h-72 sm:h-96">
                <img 
                  src={selectedProperty.heroImage} 
                  alt={selectedProperty.address}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => toggleSaved(selectedProperty.id, e)}
                  className={cn(
                    "absolute top-4 right-14 p-2 rounded-full transition-colors",
                    savedProperties.has(selectedProperty.id)
                      ? "bg-purple-500 text-white"
                      : "bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                  )}
                >
                  <Heart className={cn("h-5 w-5", savedProperties.has(selectedProperty.id) && "fill-current")} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-baseline gap-3 mb-2">
                    <p className="text-3xl sm:text-4xl font-bold text-white">
                      ${selectedProperty.price.toLocaleString()}
                    </p>
                    {selectedProperty.monthlyPayment !== undefined && (
                      <p className="text-lg sm:text-xl font-semibold text-purple-200">
                        ${selectedProperty.monthlyPayment.toLocaleString()}/mo
                      </p>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-white">{selectedProperty.address}</h2>
                  <p className="text-purple-200 flex items-center gap-1 mt-1">
                    <MapPin className="h-4 w-4" />
                    {selectedProperty.city}
                  </p>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <Bed className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedProperty.beds}</p>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <Bath className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedProperty.baths}</p>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                    </div>
                  </div>
                  {selectedProperty.sqft && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <Maximize2 className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{selectedProperty.sqft.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Sq Ft</p>
                      </div>
                    </div>
                  )}
                  {selectedProperty.condition && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <Wrench className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{selectedProperty.condition}</p>
                        <p className="text-sm text-muted-foreground">Condition</p>
                      </div>
                    </div>
                  )}
                  {selectedProperty.propertyType && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <Home className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{selectedProperty.propertyType}</p>
                        <p className="text-sm text-muted-foreground">Type</p>
                      </div>
                    </div>
                  )}
                  {selectedProperty.downPayment !== undefined && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">${selectedProperty.downPayment.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Down Payment</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedProperty.description && (
                  <div>
                    <h3 className="font-semibold mb-2">About This Property</h3>
                    <p className="text-muted-foreground">{selectedProperty.description}</p>
                  </div>
                )}

                {!showOfferForm ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      size="lg"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/20"
                      onClick={() => setShowOfferForm(true)}
                    >
                      Make an Offer
                    </Button>
                    <Button variant="outline" size="lg" className="flex-1" asChild>
                      <a href="tel:+1234567890">
                        <Phone className="h-4 w-4 mr-2" />
                        Call Us
                      </a>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleOfferSubmit} className="space-y-4 animate-fade-in">
                    <h3 className="font-semibold">Submit Your Offer</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>First Name *</Label>
                        <Input
                          value={offerForm.firstName}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, firstName: e.target.value }))}
                          required
                          placeholder="John"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Last Name *</Label>
                        <Input
                          value={offerForm.lastName}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, lastName: e.target.value }))}
                          required
                          placeholder="Doe"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={offerForm.email}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                          placeholder="john@example.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Phone *</Label>
                        <PhoneInput
                          value={offerForm.phone}
                          onChange={(value) => setOfferForm(prev => ({ ...prev, phone: value || '' }))}
                          required
                          placeholder="Enter phone number"
                          defaultCountry="US"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Your Offer Amount</Label>
                      <Input
                        placeholder="$250,000"
                        value={offerForm.offerAmount}
                        onChange={(e) => setOfferForm(prev => ({ ...prev, offerAmount: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Message (Optional)</Label>
                      <Textarea
                        value={offerForm.message}
                        onChange={(e) => setOfferForm(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Tell us about your investment goals..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                        Submit Offer
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowOfferForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}