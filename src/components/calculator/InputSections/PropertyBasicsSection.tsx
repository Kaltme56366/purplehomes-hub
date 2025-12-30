/**
 * PropertyBasicsSection - Core property information inputs
 */

import { Home, DollarSign, Wrench, Percent, Gift, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SliderInput } from '../SliderInput';
import { SLIDER_CONFIGS, type PropertyBasicsInputs } from '@/types/calculator';

interface PropertyBasicsSectionProps {
  inputs: PropertyBasicsInputs;
  onChange: (field: keyof PropertyBasicsInputs, value: number) => void;
}

export function PropertyBasicsSection({ inputs, onChange }: PropertyBasicsSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Property Basics</CardTitle>
        </div>
        <CardDescription>Enter property values and acquisition details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Asking Price */}
          <SliderInput
            label="Asking Price"
            value={inputs.askingPrice}
            onChange={(v) => onChange('askingPrice', v)}
            config={SLIDER_CONFIGS.askingPrice}
            icon={<DollarSign className="h-4 w-4" />}
            description="Seller's listing price"
          />

          {/* ARV */}
          <SliderInput
            label="After Repair Value (ARV)"
            value={inputs.arv}
            onChange={(v) => onChange('arv', v)}
            config={SLIDER_CONFIGS.arv}
            icon={<Target className="h-4 w-4" />}
            description="Estimated value after repairs"
          />

          {/* Repairs */}
          <SliderInput
            label="Repairs Needed"
            value={inputs.repairs}
            onChange={(v) => onChange('repairs', v)}
            config={SLIDER_CONFIGS.repairs}
            icon={<Wrench className="h-4 w-4" />}
            description="Estimated repair costs"
          />

          {/* Your Fee */}
          <SliderInput
            label="Your Fee / Assignment"
            value={inputs.yourFee}
            onChange={(v) => onChange('yourFee', v)}
            config={SLIDER_CONFIGS.yourFee}
            icon={<DollarSign className="h-4 w-4" />}
            description="Your profit or assignment fee"
          />

          {/* Credit to Buyer */}
          <SliderInput
            label="Credit to Buyer"
            value={inputs.creditToBuyer}
            onChange={(v) => onChange('creditToBuyer', v)}
            config={SLIDER_CONFIGS.creditToBuyer}
            icon={<Gift className="h-4 w-4" />}
            description="Closing cost credits to buyer"
          />

          {/* Wholesale Discount */}
          <SliderInput
            label="Wholesale Discount"
            value={inputs.wholesaleDiscount}
            onChange={(v) => onChange('wholesaleDiscount', v)}
            config={SLIDER_CONFIGS.wholesaleDiscount}
            icon={<Percent className="h-4 w-4" />}
            description="% of ARV for MAO calculation"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default PropertyBasicsSection;
