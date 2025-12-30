/**
 * SubjectToSection - Subject-to existing loan inputs
 */

import { KeyRound, DollarSign, Percent, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { SliderInput } from '../SliderInput';
import { SLIDER_CONFIGS, type SubjectToInputs } from '@/types/calculator';
import { cn } from '@/lib/utils';

interface SubjectToSectionProps {
  inputs: SubjectToInputs;
  onChange: (field: keyof SubjectToInputs, value: number | boolean | string) => void;
}

const LOAN_TYPES = ['Conventional', 'FHA', 'VA', 'USDA', 'Other'] as const;

export function SubjectToSection({ inputs, onChange }: SubjectToSectionProps) {
  return (
    <Card className={cn(!inputs.useSubjectTo && 'opacity-75')}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Subject-To Loan</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="use-subto" className="text-sm text-muted-foreground">
              {inputs.useSubjectTo ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id="use-subto"
              checked={inputs.useSubjectTo}
              onCheckedChange={(checked) => onChange('useSubjectTo', checked)}
            />
          </div>
        </div>
        <CardDescription>Take over seller's existing mortgage payments</CardDescription>
      </CardHeader>

      {inputs.useSubjectTo && (
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Loan Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Loan Type</Label>
              <Select
                value={inputs.subToLoanType}
                onValueChange={(v) => onChange('subToLoanType', v)}
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
                Loan Start Date
              </Label>
              <Input
                type="date"
                value={inputs.subToStartDate}
                onChange={(e) => onChange('subToStartDate', e.target.value)}
              />
            </div>

            {/* Principal */}
            <SliderInput
              label="Original Principal"
              value={inputs.subToPrincipal}
              onChange={(v) => onChange('subToPrincipal', v)}
              config={SLIDER_CONFIGS.subToPrincipal}
              icon={<DollarSign className="h-4 w-4" />}
              description="Original loan amount"
            />

            {/* Interest Rate */}
            <SliderInput
              label="Interest Rate"
              value={inputs.subToInterestRate}
              onChange={(v) => onChange('subToInterestRate', v)}
              config={SLIDER_CONFIGS.subToInterestRate}
              icon={<Percent className="h-4 w-4" />}
              description="Annual interest rate"
            />

            {/* Term Years */}
            <SliderInput
              label="Loan Term"
              value={inputs.subToTermYears}
              onChange={(v) => onChange('subToTermYears', v)}
              config={SLIDER_CONFIGS.subToTermYears}
              icon={<Clock className="h-4 w-4" />}
              description="Original loan term"
            />

            {/* Balloon Years */}
            <SliderInput
              label="Balloon (if any)"
              value={inputs.subToBalloonYears}
              onChange={(v) => onChange('subToBalloonYears', v)}
              config={SLIDER_CONFIGS.subToBalloonYears}
              icon={<Calendar className="h-4 w-4" />}
              description="Years until balloon due (0 = none)"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default SubjectToSection;
