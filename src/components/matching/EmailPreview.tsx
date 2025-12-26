/**
 * EmailPreview - Collapsible email preview component
 *
 * Shows a preview of what the email will look like before sending.
 */

import { useState } from 'react';
import { ChevronDown, Mail, Paperclip, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ScoredProperty, BuyerCriteria } from '@/types/matching';

interface EmailPreviewProps {
  buyer: BuyerCriteria;
  properties: ScoredProperty[];
  customMessage?: string;
  className?: string;
}

export function EmailPreview({
  buyer,
  properties,
  customMessage,
  className,
}: EmailPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  const subject = `Your ${properties.length} Matched Properties from Purple Homes`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Preview Email</span>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 rounded-lg border bg-card overflow-hidden">
          {/* Email Header */}
          <div className="border-b bg-muted/30 p-3 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <span className="font-medium text-muted-foreground w-12">To:</span>
              <span>
                {buyer.firstName} {buyer.lastName} &lt;{buyer.email}&gt;
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="font-medium text-muted-foreground w-12">Subject:</span>
              <span className="font-medium">{subject}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              <span>Property-Details.pdf ({properties.length} properties)</span>
            </div>
          </div>

          {/* Email Body Preview */}
          <div className="p-4 space-y-4 text-sm">
            <p>Hello {buyer.firstName},</p>

            {customMessage ? (
              <p className="italic text-muted-foreground border-l-2 border-purple-300 pl-3">
                {customMessage}
              </p>
            ) : (
              <p>
                We've found some properties that match your criteria! Please find the
                details below and in the attached PDF.
              </p>
            )}

            {/* Property Cards Preview */}
            <div className="space-y-2">
              {properties.slice(0, 3).map((sp, i) => (
                <div
                  key={sp.property.code || i}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className="p-2 rounded bg-purple-100">
                    <Home className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">
                      {sp.property.address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sp.property.price
                        ? `$${sp.property.price.toLocaleString()}`
                        : 'Price TBD'}{' '}
                      • {sp.score.score}% match
                    </p>
                  </div>
                </div>
              ))}
              {properties.length > 3 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  +{properties.length - 3} more{' '}
                  {properties.length - 3 === 1 ? 'property' : 'properties'}
                </p>
              )}
            </div>

            <p className="text-muted-foreground">
              Best regards,
              <br />
              The Purple Homes Team
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default EmailPreview;
