import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  Loader2,
  MapPin,
  Bed,
  Bath,
  Square,
  DollarSign,
  User,
  Mail,
  Download,
} from 'lucide-react';
import { sendPropertyFlyer } from '@/services/emailService';
import { generatePropertyFlyerPDF, downloadPDF } from '@/lib/pdfGenerator';
import type { ZillowListing } from '@/types/zillow';
import type { BuyerCriteria } from '@/types/matching';
import { toast } from 'sonner';

interface SendFlyerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: ZillowListing;
  buyer: BuyerCriteria;
  onSuccess?: () => void;
}

/**
 * SendFlyerModal - Modal for sending property flyers with underwriting data
 *
 * Allows the agent to:
 * - Preview the Zillow property
 * - Set underwriting numbers (purchase price, down payment, monthly payment)
 * - Add a personal note
 * - Send a PDF flyer to the buyer via email
 */
export function SendFlyerModal({
  listing,
  buyer,
  open,
  onOpenChange,
  onSuccess,
}: SendFlyerModalProps) {
  // Underwriting form state
  const [purchasePrice, setPurchasePrice] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Validation state
  const [errors, setErrors] = useState<{
    purchasePrice?: string;
    downPayment?: string;
    monthlyPayment?: string;
  }>({});

  // Reset form when modal opens with new listing
  useEffect(() => {
    if (open && listing) {
      // Pre-fill with Zillow price
      setPurchasePrice(listing.price.toString());
      // Pre-fill with buyer's down payment if available
      setDownPayment(buyer.downPayment ? buyer.downPayment.toString() : '');
      // Auto-calculate monthly payment
      const price = listing.price;
      const down = buyer.downPayment || 0;
      if (price > down) {
        const monthly = Math.round((price - down) * 0.007);
        setMonthlyPayment(monthly.toString());
      } else {
        setMonthlyPayment('');
      }
      setPersonalNote('');
      setErrors({});
    }
  }, [open, listing, buyer.downPayment]);

  // Auto-calculate monthly payment when price or down payment changes
  const handlePriceChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setPurchasePrice(numericValue);

    if (numericValue && downPayment) {
      const price = parseInt(numericValue, 10);
      const down = parseInt(downPayment.replace(/[^0-9]/g, ''), 10);
      if (price > down) {
        const monthly = Math.round((price - down) * 0.007);
        setMonthlyPayment(monthly.toString());
      }
    }
  };

  const handleDownPaymentChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setDownPayment(numericValue);

    if (purchasePrice && numericValue) {
      const price = parseInt(purchasePrice.replace(/[^0-9]/g, ''), 10);
      const down = parseInt(numericValue, 10);
      if (price > down) {
        const monthly = Math.round((price - down) * 0.007);
        setMonthlyPayment(monthly.toString());
      }
    }
  };

  const handleMonthlyPaymentChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setMonthlyPayment(numericValue);
  };

  // Format number with commas for display
  const formatCurrency = (value: string): string => {
    const num = value.replace(/[^0-9]/g, '');
    if (!num) return '';
    return parseInt(num, 10).toLocaleString();
  };

  // Parse formatted currency back to number
  const parseNumber = (value: string): number => {
    return parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!purchasePrice || parseNumber(purchasePrice) === 0) {
      newErrors.purchasePrice = 'Purchase price is required';
    }
    if (!downPayment || parseNumber(downPayment) === 0) {
      newErrors.downPayment = 'Down payment is required';
    }
    if (!monthlyPayment || parseNumber(monthlyPayment) === 0) {
      newErrors.monthlyPayment = 'Monthly payment is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if form is valid (for disabling buttons)
  const isFormValid =
    purchasePrice &&
    parseNumber(purchasePrice) > 0 &&
    downPayment &&
    parseNumber(downPayment) > 0 &&
    monthlyPayment &&
    parseNumber(monthlyPayment) > 0;

  const handleDownload = async () => {
    if (!validate()) return;

    setIsDownloading(true);

    try {
      const pdfBlob = await generatePropertyFlyerPDF({
        property: {
          address: listing.address,
          city: listing.city,
          state: listing.state,
          price: parseNumber(purchasePrice),
          zillowPrice: listing.price,
          downPayment: parseNumber(downPayment),
          monthlyPayment: parseNumber(monthlyPayment),
          beds: listing.beds,
          baths: listing.baths,
          sqft: listing.sqft,
          images: listing.images,
          zillowUrl: listing.zillowUrl,
        },
        buyerName: `${buyer.firstName} ${buyer.lastName}`,
      });

      const filename = `Purple-Homes-${listing.address.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPDF(pdfBlob, filename);

      toast.success('Flyer downloaded! Ready to share via text or email.');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate flyer'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!validate()) return;

    setIsSending(true);

    try {
      await sendPropertyFlyer({
        contactId: buyer.contactId,
        contactName: `${buyer.firstName} ${buyer.lastName}`,
        contactEmail: buyer.email,
        property: {
          address: listing.address,
          city: listing.city,
          state: listing.state,
          price: parseNumber(purchasePrice),
          downPayment: parseNumber(downPayment),
          monthlyPayment: parseNumber(monthlyPayment),
          beds: listing.beds,
          baths: listing.baths,
          sqft: listing.sqft,
          images: listing.images,
          zillowUrl: listing.zillowUrl,
        },
        personalNote: personalNote || undefined,
      });

      toast.success(`Flyer sent to ${buyer.firstName}!`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to send flyer'
      );
    } finally {
      setIsSending(false);
    }
  };

  const buyerFullName = `${buyer.firstName} ${buyer.lastName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Property Flyer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property Preview Card */}
          <div className="p-4 bg-muted rounded-lg border">
            <div className="flex gap-4">
              {/* Property Image */}
              {listing.images[0] && (
                <div className="flex-shrink-0">
                  <img
                    src={listing.images[0]}
                    alt={listing.address}
                    className="w-24 h-24 rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Property Details */}
              <div className="flex-1">
                <h4 className="font-medium text-lg">{listing.address}</h4>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {listing.city}, {listing.state} {listing.zipCode}
                </p>

                {/* Property Stats */}
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="flex items-center gap-1 font-semibold text-purple-600">
                    <DollarSign className="h-4 w-4" />
                    {listing.price.toLocaleString()}
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      Zillow
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    {listing.beds}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {listing.baths}
                  </span>
                  {listing.sqft && (
                    <span className="flex items-center gap-1">
                      <Square className="h-4 w-4" />
                      {listing.sqft.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Underwriting Section */}
          <div className="space-y-4">
            <h5 className="font-medium text-sm text-purple-900">
              Underwriting Numbers
            </h5>

            {/* Purchase Price */}
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="purchasePrice"
                  value={formatCurrency(purchasePrice)}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder="0"
                  className={`pl-7 ${errors.purchasePrice ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.purchasePrice && (
                <p className="text-xs text-red-500">{errors.purchasePrice}</p>
              )}
            </div>

            {/* Down Payment */}
            <div className="space-y-2">
              <Label htmlFor="downPayment">Down Payment *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="downPayment"
                  value={formatCurrency(downPayment)}
                  onChange={(e) => handleDownPaymentChange(e.target.value)}
                  placeholder="0"
                  className={`pl-7 ${errors.downPayment ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.downPayment && (
                <p className="text-xs text-red-500">{errors.downPayment}</p>
              )}
            </div>

            {/* Monthly Payment */}
            <div className="space-y-2">
              <Label htmlFor="monthlyPayment">Monthly Payment *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="monthlyPayment"
                  value={formatCurrency(monthlyPayment)}
                  onChange={(e) => handleMonthlyPaymentChange(e.target.value)}
                  placeholder="0"
                  className={`pl-7 ${errors.monthlyPayment ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.monthlyPayment && (
                <p className="text-xs text-red-500">{errors.monthlyPayment}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Auto-calculated based on price and down payment (7% interest)
              </p>
            </div>
          </div>

          {/* Personal Note */}
          <div className="space-y-2">
            <Label htmlFor="personalNote">Personal Note (Optional)</Label>
            <Textarea
              id="personalNote"
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder={`Hi ${buyer.firstName}, I found this property that matches your criteria...`}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Email Recipient Info */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <Mail className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              Email will be sent to: <span className="font-medium text-foreground">{buyerFullName}</span> ({buyer.email})
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending || isDownloading}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleDownload}
            disabled={!isFormValid || isDownloading || isSending}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={!isFormValid || isDownloading || isSending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
