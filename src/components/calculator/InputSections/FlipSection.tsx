/**
 * FlipSection - Fix and flip scenario inputs
 */

import { Hammer, Calendar, Receipt, Megaphone, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SliderInput } from '../SliderInput';
import { SLIDER_CONFIGS, type FlipInputs } from '@/types/calculator';

interface FlipSectionProps {
  inputs: FlipInputs;
  onChange: (field: keyof FlipInputs, value: number) => void;
}

export function FlipSection({ inputs, onChange }: FlipSectionProps) {
  const totalResaleCosts =
    inputs.resaleClosingCosts +
    inputs.resaleMarketing +
    inputs.contingency;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg">Flip Scenario</CardTitle>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">Resale Costs: </span>
            <span className="text-lg font-bold text-orange-600">
              ${totalResaleCosts.toLocaleString()}
            </span>
          </div>
        </div>
        <CardDescription>Costs and timeline for fix and flip exit strategy</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Duration */}
          <div className="md:col-span-2">
            <SliderInput
              label="Project Duration"
              value={inputs.projectMonths}
              onChange={(v) => onChange('projectMonths', v)}
              config={SLIDER_CONFIGS.projectMonths}
              icon={<Calendar className="h-4 w-4" />}
              description="Months from purchase to resale"
            />
          </div>

          {/* Resale Closing Costs */}
          <SliderInput
            label="Resale Closing Costs"
            value={inputs.resaleClosingCosts}
            onChange={(v) => onChange('resaleClosingCosts', v)}
            config={SLIDER_CONFIGS.resaleClosingCosts}
            icon={<Receipt className="h-4 w-4" />}
            description="Title, escrow, commissions"
          />

          {/* Marketing */}
          <SliderInput
            label="Marketing & Staging"
            value={inputs.resaleMarketing}
            onChange={(v) => onChange('resaleMarketing', v)}
            config={SLIDER_CONFIGS.resaleMarketing}
            icon={<Megaphone className="h-4 w-4" />}
            description="Photos, staging, advertising"
          />

          {/* Contingency */}
          <SliderInput
            label="Contingency Reserve"
            value={inputs.contingency}
            onChange={(v) => onChange('contingency', v)}
            config={SLIDER_CONFIGS.contingency}
            icon={<ShieldAlert className="h-4 w-4" />}
            description="Buffer for unexpected costs"
          />
        </div>

        {/* Cost breakdown */}
        <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
          <h4 className="text-sm font-medium text-orange-800 mb-3">Flip Cost Summary</h4>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xs text-orange-600">Closing</p>
              <p className="font-semibold text-orange-800">
                ${inputs.resaleClosingCosts.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-orange-600">Marketing</p>
              <p className="font-semibold text-orange-800">
                ${inputs.resaleMarketing.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-orange-600">Contingency</p>
              <p className="font-semibold text-orange-800">
                ${inputs.contingency.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-orange-600">Total</p>
              <p className="font-bold text-orange-800">
                ${totalResaleCosts.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline note */}
        <div className="text-center text-sm text-muted-foreground">
          Project timeline: {inputs.projectMonths} months = {(inputs.projectMonths / 12).toFixed(1)} years
        </div>
      </CardContent>
    </Card>
  );
}

export default FlipSection;
