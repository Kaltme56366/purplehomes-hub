/**
 * PurchaseCostsSection - One-time acquisition costs
 */

import { Receipt, DollarSign, FileText, Building, Settings, HandCoins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SliderInput } from '../SliderInput';
import { SLIDER_CONFIGS, type PurchaseCostsInputs } from '@/types/calculator';

interface PurchaseCostsSectionProps {
  inputs: PurchaseCostsInputs;
  onChange: (field: keyof PurchaseCostsInputs, value: number) => void;
}

export function PurchaseCostsSection({ inputs, onChange }: PurchaseCostsSectionProps) {
  const totalCosts =
    inputs.closingCosts +
    inputs.appraisalCost +
    inputs.llcCost +
    inputs.servicingFee +
    inputs.sellerAllowance;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg">Purchase Costs</CardTitle>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">Total: </span>
            <span className="text-lg font-bold text-orange-600">
              ${totalCosts.toLocaleString()}
            </span>
          </div>
        </div>
        <CardDescription>One-time costs to close the purchase</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Purchase Price */}
          <div className="md:col-span-2">
            <SliderInput
              label="Purchase Price"
              value={inputs.purchasePrice}
              onChange={(v) => onChange('purchasePrice', v)}
              config={SLIDER_CONFIGS.purchasePrice}
              icon={<DollarSign className="h-4 w-4" />}
              description="Your negotiated purchase price"
            />
          </div>

          {/* Closing Costs */}
          <SliderInput
            label="Closing Costs"
            value={inputs.closingCosts}
            onChange={(v) => onChange('closingCosts', v)}
            config={SLIDER_CONFIGS.closingCosts}
            icon={<FileText className="h-4 w-4" />}
            description="Title, escrow, recording fees"
          />

          {/* Appraisal Cost */}
          <SliderInput
            label="Appraisal Cost"
            value={inputs.appraisalCost}
            onChange={(v) => onChange('appraisalCost', v)}
            config={SLIDER_CONFIGS.appraisalCost}
            icon={<FileText className="h-4 w-4" />}
            description="Property appraisal fee"
          />

          {/* LLC Cost */}
          <SliderInput
            label="LLC Setup Cost"
            value={inputs.llcCost}
            onChange={(v) => onChange('llcCost', v)}
            config={SLIDER_CONFIGS.llcCost}
            icon={<Building className="h-4 w-4" />}
            description="Entity formation costs"
          />

          {/* Servicing Fee */}
          <SliderInput
            label="Loan Servicing Setup"
            value={inputs.servicingFee}
            onChange={(v) => onChange('servicingFee', v)}
            config={SLIDER_CONFIGS.servicingFee}
            icon={<Settings className="h-4 w-4" />}
            description="Loan servicing company setup"
          />

          {/* Seller Allowance */}
          <SliderInput
            label="Seller Allowance"
            value={inputs.sellerAllowance}
            onChange={(v) => onChange('sellerAllowance', v)}
            config={SLIDER_CONFIGS.sellerAllowance}
            icon={<HandCoins className="h-4 w-4" />}
            description="Credits or concessions from seller"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default PurchaseCostsSection;
