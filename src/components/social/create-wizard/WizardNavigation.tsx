import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Rocket } from 'lucide-react';
import type { WizardStep } from './types';
import { STEP_CONFIG } from './types';

interface WizardNavigationProps {
  currentStep: WizardStep;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  isLastStep: boolean;
  isPublishing?: boolean;
}

export default function WizardNavigation({
  currentStep,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  isLastStep,
  isPublishing = false,
}: WizardNavigationProps) {
  const stepKeys = Object.keys(STEP_CONFIG) as WizardStep[];
  const nextStepIndex = stepKeys.indexOf(currentStep) + 1;
  const nextStep = stepKeys[nextStepIndex] as WizardStep | undefined;
  const nextConfig = nextStep ? STEP_CONFIG[nextStep] : null;

  return (
    <div className="flex items-center justify-between mt-6">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={!canGoBack}
        className="gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Button>

      {!isLastStep ? (
        <Button
          onClick={onNext}
          disabled={!canGoNext}
          className="gap-2 bg-purple-600 hover:bg-purple-700"
        >
          Next: {nextConfig?.title}
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!canGoNext || isPublishing}
          className="gap-2 bg-purple-600 hover:bg-purple-700"
        >
          <Rocket className="h-4 w-4" />
          {isPublishing ? 'Publishing...' : 'Publish Now'}
        </Button>
      )}
    </div>
  );
}
