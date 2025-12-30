/**
 * WrapLoanSection - Wrap (seller financing) loan configuration
 */

import { Gift, Percent, Calendar, Clock, CreditCard, DollarSign, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SliderInput } from '../SliderInput';
import { SLIDER_CONFIGS, type WrapLoanInputs } from '@/types/calculator';
import { cn } from '@/lib/utils';

interface WrapLoanSectionProps {
  inputs: WrapLoanInputs;
  onChange: (field: keyof WrapLoanInputs, value: number | boolean | string) => void;
}

const LOAN_TYPES = ['Amortized', 'Interest Only'] as const;

export function WrapLoanSection({ inputs, onChange }: WrapLoanSectionProps) {
  return (
    <Card className={cn(!inputs.useWrap && 'opacity-75')}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Wrap Loan Terms</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="use-wrap" className="text-sm text-muted-foreground">
              {inputs.useWrap ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id="use-wrap"
              checked={inputs.useWrap}
              onCheckedChange={(checked) => onChange('useWrap', checked)}
            />
          </div>
        </div>
        <CardDescription>Seller financing terms offered to your buyer</CardDescription>
      </CardHeader>

      {inputs.useWrap && (
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Loan Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Type</Label>
              <Select
                value={inputs.wrapLoanType}
                onValueChange={(v) => onChange('wrapLoanType', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                type="date"
                value={inputs.wrapStartDate}
                onChange={(e) => onChange('wrapStartDate', e.target.value)}
              />
            </div>

            {/* Interest Rate */}
            <SliderInput
              label="Interest Rate to Buyer"
              value={inputs.wrapInterestRate}
              onChange={(v) => onChange('wrapInterestRate', v)}
              config={SLIDER_CONFIGS.wrapInterestRate}
              icon={<Percent className="h-4 w-4" />}
              description="Rate charged to buyer"
            />

            {/* Term Years */}
            <SliderInput
              label="Loan Term"
              value={inputs.wrapTermYears}
              onChange={(v) => onChange('wrapTermYears', v)}
              config={SLIDER_CONFIGS.wrapTermYears}
              icon={<Clock className="h-4 w-4" />}
              description="Amortization period"
            />

            {/* Balloon Years */}
            <SliderInput
              label="Balloon Due"
              value={inputs.wrapBalloonYears}
              onChange={(v) => onChange('wrapBalloonYears', v)}
              config={SLIDER_CONFIGS.wrapBalloonYears}
              icon={<Calendar className="h-4 w-4" />}
              description="Years until balloon"
            />

            {/* Service Fee */}
            <SliderInput
              label="Monthly Service Fee"
              value={inputs.wrapServiceFee}
              onChange={(v) => onChange('wrapServiceFee', v)}
              config={SLIDER_CONFIGS.wrapServiceFee}
              icon={<Settings className="h-4 w-4" />}
              description="Loan servicing cost"
            />

            {/* Points */}
            <SliderInput
              label="Points (if any)"
              value={inputs.wrapPoints}
              onChange={(v) => onChange('wrapPoints', v)}
              config={SLIDER_CONFIGS.wrapPoints}
              icon={<CreditCard className="h-4 w-4" />}
              description="Charged to buyer"
            />

            {/* Fees */}
            <SliderInput
              label="Setup Fees"
              value={inputs.wrapFees}
              onChange={(v) => onChange('wrapFees', v)}
              config={SLIDER_CONFIGS.wrapFees}
              icon={<DollarSign className="h-4 w-4" />}
              description="One-time setup costs"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default WrapLoanSection;
