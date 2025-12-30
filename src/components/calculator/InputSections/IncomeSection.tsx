/**
 * IncomeSection - Rental income inputs
 */

import { Wallet, Home, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SliderInput } from '../SliderInput';
import { SLIDER_CONFIGS, type IncomeInputs } from '@/types/calculator';

interface IncomeSectionProps {
  inputs: IncomeInputs;
  onChange: (field: keyof IncomeInputs, value: number) => void;
}

export function IncomeSection({ inputs, onChange }: IncomeSectionProps) {
  const totalMonthly = inputs.monthlyRent + inputs.otherIncome;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Monthly Income</CardTitle>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">Total: </span>
            <span className="text-lg font-bold text-green-600">
              ${totalMonthly.toLocaleString()}/mo
            </span>
          </div>
        </div>
        <CardDescription>Expected rental income from the property</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Rent */}
          <SliderInput
            label="Monthly Rent"
            value={inputs.monthlyRent}
            onChange={(v) => onChange('monthlyRent', v)}
            config={SLIDER_CONFIGS.monthlyRent}
            icon={<Home className="h-4 w-4" />}
            description="Expected monthly rent"
          />

          {/* Other Income */}
          <SliderInput
            label="Other Income"
            value={inputs.otherIncome}
            onChange={(v) => onChange('otherIncome', v)}
            config={SLIDER_CONFIGS.otherIncome}
            icon={<Plus className="h-4 w-4" />}
            description="Pet fees, storage, parking, etc."
          />
        </div>

        {/* Annual projection */}
        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-800">Annual Income Projection</span>
            <span className="text-lg font-bold text-green-700">
              ${(totalMonthly * 12).toLocaleString()}/year
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default IncomeSection;
