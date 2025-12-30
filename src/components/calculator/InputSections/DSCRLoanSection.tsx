/**
 * DSCRLoanSection - DSCR (Debt Service Coverage Ratio) loan inputs
 */

import { Landmark, DollarSign, Percent, Calendar, Clock, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SliderInput } from '../SliderInput';
import { SLIDER_CONFIGS, type DSCRLoanInputs } from '@/types/calculator';
import { cn } from '@/lib/utils';

interface DSCRLoanSectionProps {
  inputs: DSCRLoanInputs;
  purchasePrice: number;
  onChange: (field: keyof DSCRLoanInputs, value: number | boolean | string) => void;
}

export function DSCRLoanSection({ inputs, purchasePrice, onChange }: DSCRLoanSectionProps) {
  const loanAmount = purchasePrice * 0.8;
  const downPayment = purchasePrice * 0.2;
  const pointsCost = loanAmount * (inputs.dscrPoints / 100);
  const totalUpfront = downPayment + pointsCost + inputs.dscrFees;

  return (
    <Card className={cn(!inputs.useDSCRLoan && 'opacity-75')}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">DSCR Loan</CardTitle>
            <Badge variant="secondary" className="text-xs">80% LTV</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="use-dscr" className="text-sm text-muted-foreground">
              {inputs.useDSCRLoan ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id="use-dscr"
              checked={inputs.useDSCRLoan}
              onCheckedChange={(checked) => onChange('useDSCRLoan', checked)}
            />
          </div>
        </div>
        <CardDescription>Investment property loan based on rental income</CardDescription>
      </CardHeader>

      {inputs.useDSCRLoan && (
        <CardContent className="space-y-6">
          {/* Calculated amounts */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div>
              <span className="text-xs text-blue-700">Loan Amount</span>
              <p className="text-lg font-bold text-blue-800">
                ${loanAmount.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-blue-700">Down Payment</span>
              <p className="text-lg font-bold text-blue-800">
                ${downPayment.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-blue-700">Total Upfront</span>
              <p className="text-lg font-bold text-blue-800">
                ${Math.round(totalUpfront).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Interest Rate */}
            <SliderInput
              label="Interest Rate"
              value={inputs.dscrInterestRate}
              onChange={(v) => onChange('dscrInterestRate', v)}
              config={SLIDER_CONFIGS.dscrInterestRate}
              icon={<Percent className="h-4 w-4" />}
              description="Annual interest rate"
            />

            {/* Term Years */}
            <SliderInput
              label="Loan Term"
              value={inputs.dscrTermYears}
              onChange={(v) => onChange('dscrTermYears', v)}
              config={SLIDER_CONFIGS.dscrTermYears}
              icon={<Clock className="h-4 w-4" />}
              description="Amortization period"
            />

            {/* Start Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                type="date"
                value={inputs.dscrStartDate}
                onChange={(e) => onChange('dscrStartDate', e.target.value)}
              />
            </div>

            {/* Balloon Years */}
            <SliderInput
              label="Balloon"
              value={inputs.dscrBalloonYears}
              onChange={(v) => onChange('dscrBalloonYears', v)}
              config={SLIDER_CONFIGS.dscrBalloonYears}
              icon={<Calendar className="h-4 w-4" />}
              description="Years until balloon (0 = none)"
            />

            {/* Points */}
            <SliderInput
              label="Points"
              value={inputs.dscrPoints}
              onChange={(v) => onChange('dscrPoints', v)}
              config={SLIDER_CONFIGS.dscrPoints}
              icon={<CreditCard className="h-4 w-4" />}
              description={`= $${Math.round(pointsCost).toLocaleString()}`}
            />

            {/* Fees */}
            <SliderInput
              label="Lender Fees"
              value={inputs.dscrFees}
              onChange={(v) => onChange('dscrFees', v)}
              config={SLIDER_CONFIGS.dscrFees}
              icon={<DollarSign className="h-4 w-4" />}
              description="Origination & other fees"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default DSCRLoanSection;
