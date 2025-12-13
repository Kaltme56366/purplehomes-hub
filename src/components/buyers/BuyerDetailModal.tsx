import { useState } from 'react';
import { Mail, Phone, MapPin, Eye, EyeOff, Bed, Bath, DollarSign, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { SendInventoryModal } from './SendInventoryModal';
import type { Buyer, ChecklistItem } from '@/types';

interface BuyerDetailModalProps {
  buyer: Buyer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateChecklist: (buyerId: string, section: 'bcClosing' | 'postClose' | 'activeBuyer', itemId: string, completed: boolean) => void;
}

export function BuyerDetailModal({ buyer, open, onOpenChange, onUpdateChecklist }: BuyerDetailModalProps) {
  const [hideEmpty, setHideEmpty] = useState(false);
  const [sendInventoryOpen, setSendInventoryOpen] = useState(false);

  if (!buyer) return null;

  const renderChecklistSection = (
    title: string,
    items: ChecklistItem[],
    section: 'bcClosing' | 'postClose' | 'activeBuyer'
  ) => {
    const displayItems = hideEmpty ? items.filter(item => item.completed) : items;
    const completedCount = items.filter(i => i.completed).length;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">{title}</h4>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{items.length} completed
          </span>
        </div>
        <div className="space-y-2">
          {displayItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <Checkbox
                id={item.id}
                checked={item.completed}
                onCheckedChange={(checked) => 
                  onUpdateChecklist(buyer.id, section, item.id, checked as boolean)
                }
              />
              <label
                htmlFor={item.id}
                className={`text-sm cursor-pointer ${
                  item.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}
              >
                {item.label}
              </label>
            </div>
          ))}
          {hideEmpty && displayItems.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No completed items</p>
          )}
        </div>
      </div>
    );
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'under-contract': return 'Under Contract';
      case 'escrow-opened': return 'Escrow Opened';
      case 'closing-scheduled': return 'Closing Scheduled';
      default: return stage;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-status-posted/20 text-status-posted';
      case 'qualified': return 'bg-status-scheduled/20 text-status-scheduled';
      case 'pending': return 'bg-status-pending/20 text-status-pending';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl">{buyer.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getStatusColor(buyer.status)}>
                    {buyer.status}
                  </Badge>
                  <Badge variant="outline">{buyer.dealType}</Badge>
                  <Badge variant="secondary">{getStageLabel(buyer.stage)}</Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{buyer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{buyer.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{buyer.location}</span>
                </div>
              </div>

              <Separator />

              {/* Buyer Preferences Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Buyer Preferences</h3>
                
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 space-y-4">
                    {/* Beds & Baths */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Bed className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Bedrooms</p>
                          <p className="font-semibold">
                            {(buyer as any).contactPropertyPreferences?.bedCount 
                              ? `${(buyer as any).contactPropertyPreferences.bedCount} beds`
                              : buyer.preferences.minBeds && buyer.preferences.maxBeds
                                ? `${buyer.preferences.minBeds} - ${buyer.preferences.maxBeds} beds`
                                : '- beds'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Bath className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Bathrooms</p>
                          <p className="font-semibold">
                            {(buyer as any).contactPropertyPreferences?.bathCount 
                              ? `${(buyer as any).contactPropertyPreferences.bathCount} baths`
                              : buyer.preferences.minBaths && buyer.preferences.maxBaths
                                ? `${buyer.preferences.minBaths} - ${buyer.preferences.maxBaths} baths`
                                : '- baths'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Price Range */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Price Range</p>
                        <p className="font-semibold">
                          ${buyer.preferences.minPrice?.toLocaleString()} - ${buyer.preferences.maxPrice?.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Property Type & Square Feet (from contact) */}
                    {(buyer as any).contactPropertyPreferences && (
                      (buyer as any).contactPropertyPreferences.bedCount ||
                      (buyer as any).contactPropertyPreferences.bathCount ||
                      (buyer as any).contactPropertyPreferences.squareFeet ||
                      (buyer as any).contactPropertyPreferences.propertyType
                    ) && (
                      <div className="space-y-3 pt-3 border-t border-primary/20">
                        <p className="text-xs text-muted-foreground font-semibold uppercase">From Contact Profile</p>
                        <div className="grid grid-cols-2 gap-4">
                          {(buyer as any).contactPropertyPreferences.bedCount && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Beds</p>
                              <p className="font-semibold">{(buyer as any).contactPropertyPreferences.bedCount} beds</p>
                            </div>
                          )}
                          {(buyer as any).contactPropertyPreferences.bathCount && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Baths</p>
                              <p className="font-semibold">{(buyer as any).contactPropertyPreferences.bathCount} baths</p>
                            </div>
                          )}
                          {(buyer as any).contactPropertyPreferences.squareFeet && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Square Feet</p>
                              <p className="font-semibold">{(buyer as any).contactPropertyPreferences.squareFeet.toLocaleString()} sqft</p>
                            </div>
                          )}
                          {(buyer as any).contactPropertyPreferences.propertyType && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Property Type</p>
                              <Badge variant="outline" className="text-sm">
                                {(buyer as any).contactPropertyPreferences.propertyType}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Zip Codes */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Preferred Zip Codes</p>
                      <div className="flex flex-wrap gap-2">
                        {buyer.preferredZipCodes.map((zip) => (
                          <Badge key={zip} variant="secondary" className="text-sm">
                            {zip}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Matches */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 bg-background rounded-lg border">
                        <p className="text-2xl font-bold text-primary">{buyer.matches.internal}</p>
                        <p className="text-xs text-muted-foreground">Internal Matches</p>
                      </div>
                      <div className="text-center p-3 bg-background rounded-lg border">
                        <p className="text-2xl font-bold text-status-scheduled">{buyer.matches.external}</p>
                        <p className="text-xs text-muted-foreground">Zillow Matches</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Send Property List Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setSendInventoryOpen(true)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Property List
                </Button>
              </div>

              <Separator />

              {/* Deal Type Selector - FROM GHL contact.deal_type */}
              <div className="space-y-2">
                <Label>Deal Type</Label>
                <Select defaultValue={buyer.dealType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Deal Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lease Option">Lease Option</SelectItem>
                    <SelectItem value="Bond for Deed">Bond for Deed</SelectItem>
                    <SelectItem value="Assignment">Assignment</SelectItem>
                    <SelectItem value="Traditional Sale">Traditional Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Hide Empty Toggle */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Buyer Closing Checklist</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHideEmpty(!hideEmpty)}
                  className="text-muted-foreground"
                >
                  {hideEmpty ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                  {hideEmpty ? 'Show All' : 'Hide Empty Fields'}
                </Button>
              </div>

              {/* B-C Closing Checklist */}
              {renderChecklistSection('B-C Closing Checklist', buyer.checklist.bcClosing, 'bcClosing')}

              <Separator />

              {/* Post Close Actions */}
              {renderChecklistSection('Post Close Actions: Checklist', buyer.checklist.postClose, 'postClose')}

              <Separator />

              {/* Active Buyer Checklist */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Active Buyer Checklist</h3>
                
                {renderChecklistSection('Deploy Deal Finder', buyer.checklist.activeBuyer, 'activeBuyer')}

                {/* Sent Buyer Deals for Review */}
                <div className="space-y-2 mt-4">
                  <Label>Sent Buyer Deals for Review</Label>
                  <Textarea
                    placeholder="Sent Buyer Deals for Review"
                    defaultValue={buyer.sentDealsForReview}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Send Inventory Modals */}
      <SendInventoryModal
        buyer={buyer}
        open={sendInventoryOpen}
        onOpenChange={setSendInventoryOpen}
      />
    </>
  );
}