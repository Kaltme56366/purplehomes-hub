/**
 * WrapSalesSection - Buyer's wrap purchase terms
 */

import { UserCheck, DollarSign, Wallet, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SliderInput } from '../SliderInput';
import { SLIDER_CONFIGS, type WrapSalesInputs } from '@/types/calculator';
import { cn } from '@/lib/utils';

interface WrapSalesSectionProps {
  inputs: WrapSalesInputs;
  useWrap: boolean;
  onChange: (field: keyof WrapSalesInputs, value: number) => void;
}

export function WrapSalesSection({ inputs, useWrap, onChange }: WrapSalesSectionProps) {
  const wrapPrincipal = inputs.wrapSalesPrice - inputs.buyerDownPayment;
  const netDownPayment = inputs.buyerDownPayment - inputs.buyerClosingCosts;

  return (
    <Card className={cn(!useWrap && 'opacity-50 pointer-events-none')}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Buyer's Terms</CardTitle>
          </div>
        </div>
        <CardDescription>
          {useWrap
            ? "Your buyer's purchase price and down payment"
            : 'Enable Wrap Loan to configure buyer terms'}
        </CardDescription>
      </CardHeader>

      {useWrap && (
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Wrap Sales Price */}
            <div className="md:col-span-2">
              <SliderInput
                label="Sales Price to Buyer"
                value={inputs.wrapSalesPrice}
                onChange={(v) => onChange('wrapSalesPrice', v)}
                config={SLIDER_CONFIGS.wrapSalesPrice}
                icon={<DollarSign className="h-4 w-4" />}
                description="Price buyer pays for the property"
              />
            </div>

            {/* Buyer Down Payment */}
            <SliderInput
              label="Buyer Down Payment"
              value={inputs.buyerDownPayment}
              onChange={(v) => onChange('buyerDownPayment', v)}
              config={SLIDER_CONFIGS.buyerDownPayment}
              icon={<Wallet className="h-4 w-4" />}
              description="Cash at closing from buyer"
            />

            {/* Buyer Closing Costs */}
            <SliderInput
              label="Buyer Closing Costs"
              value={inputs.buyerClosingCosts}
              onChange={(v) => onChange('buyerClosingCosts', v)}
              config={SLIDER_CONFIGS.buyerClosingCosts}
              icon={<Receipt className="h-4 w-4" />}
              description="Costs paid by buyer at close"
            />
          </div>

          {/* Summary calculations */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-purple-50 border border-purple-200">
            <div>
              <span className="text-xs text-purple-700">Wrap Principal</span>
              <p className="text-lg font-bold text-purple-800">
                ${wrapPrincipal.toLocaleString()}
              </p>
              <p className="text-xs text-purple-600">
                Sales Price - Down Payment
              </p>
            </div>
            <div>
              <span className="text-xs text-purple-700">Net Cash at Close</span>
              <p className="text-lg font-bold text-purple-800">
                ${netDownPayment.toLocaleString()}
              </p>
              <p className="text-xs text-purple-600">
                Down Payment - Closing Costs
              </p>
            </div>
          </div>

          {/* Down payment percentage */}
          {inputs.wrapSalesPrice > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Down Payment: {((inputs.buyerDownPayment / inputs.wrapSalesPrice) * 100).toFixed(1)}% of sales price
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default WrapSalesSection;
