/**
 * TaxInsuranceSection - Annual property tax and insurance
 */

import { FileSpreadsheet, Building, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SliderInput } from '../SliderInput';
import { SLIDER_CONFIGS, type TaxInsuranceInputs } from '@/types/calculator';

interface TaxInsuranceSectionProps {
  inputs: TaxInsuranceInputs;
  onChange: (field: keyof TaxInsuranceInputs, value: number) => void;
}

export function TaxInsuranceSection({ inputs, onChange }: TaxInsuranceSectionProps) {
  const totalAnnual = inputs.annualTaxes + inputs.annualInsurance;
  const totalMonthly = totalAnnual / 12;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Taxes & Insurance</CardTitle>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">Monthly: </span>
            <span className="text-lg font-bold text-blue-600">
              ${Math.round(totalMonthly).toLocaleString()}/mo
            </span>
          </div>
        </div>
        <CardDescription>Annual property taxes and insurance premiums</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Annual Taxes */}
          <SliderInput
            label="Annual Property Taxes"
            value={inputs.annualTaxes}
            onChange={(v) => onChange('annualTaxes', v)}
            config={SLIDER_CONFIGS.annualTaxes}
            icon={<Building className="h-4 w-4" />}
            description="Yearly property tax amount"
          />

          {/* Annual Insurance */}
          <SliderInput
            label="Annual Insurance"
            value={inputs.annualInsurance}
            onChange={(v) => onChange('annualInsurance', v)}
            config={SLIDER_CONFIGS.annualInsurance}
            icon={<Shield className="h-4 w-4" />}
            description="Yearly insurance premium"
          />
        </div>

        {/* Monthly breakdown */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div>
            <span className="text-xs text-blue-700">Monthly Taxes</span>
            <p className="text-lg font-semibold text-blue-800">
              ${Math.round(inputs.annualTaxes / 12).toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-xs text-blue-700">Monthly Insurance</span>
            <p className="text-lg font-semibold text-blue-800">
              ${Math.round(inputs.annualInsurance / 12).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TaxInsuranceSection;
