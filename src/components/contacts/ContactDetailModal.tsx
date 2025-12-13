import { Mail, Phone, MapPin, Building2, Bed, Bath, Maximize2, Tag, Calendar, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Contact } from '@/types';
import { format } from 'date-fns';

interface ContactDetailModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailModal({ contact, open, onOpenChange }: ContactDetailModalProps) {
  if (!contact) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'seller': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'buyer': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'agent': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'wholesaler': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500';
      case 'inactive': return 'bg-gray-500/10 text-gray-500';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'closed': return 'bg-blue-500/10 text-blue-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const hasPropertyPreferences = contact.propertyPreferences && (
    contact.propertyPreferences.bedCount ||
    contact.propertyPreferences.bathCount ||
    contact.propertyPreferences.squareFeet ||
    contact.propertyPreferences.propertyType
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className={`text-lg ${getTypeColor(contact.type)}`}>
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl">{contact.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={`capitalize ${getTypeColor(contact.type)}`}>
                    {contact.type}
                  </Badge>
                  <Badge className={`capitalize ${getStatusColor(contact.status)}`}>
                    {contact.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h3>
            <div className="grid gap-3">
              {contact.email && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{contact.email}</p>
                  </div>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{contact.phone}</p>
                  </div>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="font-medium">{contact.company}</p>
                  </div>
                </div>
              )}
              {contact.zipCodes && contact.zipCodes.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-2">Zip Codes</p>
                    <div className="flex flex-wrap gap-2">
                      {contact.zipCodes.map((zip) => (
                        <Badge key={zip} variant="secondary" className="text-xs">
                          {zip}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Property Preferences - SHOW FOR ALL CONTACTS IF DATA EXISTS */}
          {hasPropertyPreferences && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Property Preferences</h3>
                <div className="grid grid-cols-2 gap-3">
                  {contact.propertyPreferences?.bedCount && (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <Bed className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Bedrooms</p>
                        <p className="text-lg font-semibold">{contact.propertyPreferences.bedCount}</p>
                      </div>
                    </div>
                  )}
                  {contact.propertyPreferences?.bathCount && (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <Bath className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Bathrooms</p>
                        <p className="text-lg font-semibold">{contact.propertyPreferences.bathCount}</p>
                      </div>
                    </div>
                  )}
                  {contact.propertyPreferences?.squareFeet && (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <Maximize2 className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Square Feet</p>
                        <p className="text-lg font-semibold">{contact.propertyPreferences.squareFeet.toLocaleString()} sqft</p>
                      </div>
                    </div>
                  )}
                  {contact.propertyPreferences?.propertyType && (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <Building2 className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Property Type</p>
                        <p className="text-lg font-semibold">{contact.propertyPreferences.propertyType}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Activity & Stats */}
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Activity & Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
                <p className="text-2xl font-bold text-emerald-500">{contact.dealsClosed}</p>
                <p className="text-xs text-muted-foreground mt-1">Deals Closed</p>
              </div>
              {contact.transactionValue && contact.transactionValue > 0 && (
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 text-center">
                  <p className="text-2xl font-bold text-blue-500">${(contact.transactionValue / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-muted-foreground mt-1">Transaction Value</p>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium text-sm">{format(new Date(contact.createdAt), 'MMM d, yyyy')}</p>
                </div>
              </div>
              {contact.lastActivityAt && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last Activity</p>
                    <p className="font-medium text-sm">{format(new Date(contact.lastActivityAt), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {contact.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Notes</h3>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">{contact.notes}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button>
            Edit Contact
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}