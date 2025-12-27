/**
 * BatchWizardNavigation - Back/Next navigation for batch wizard
 */

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Rocket } from 'lucide-react';
import { BatchWizardStep } from '../types';

interface BatchWizardNavigationProps {
  currentStep: BatchWizardStep;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  isPublishing?: boolean;
  selectedCount?: number;
}

export function BatchWizardNavigation({
  currentStep,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  isPublishing = false,
  selectedCount = 0,
}: BatchWizardNavigationProps) {
  const isLastStep = currentStep === 'review';

  const getNextLabel = () => {
    switch (currentStep) {
      case 'select':
        return `Continue with ${selectedCount} Properties`;
      case 'image':
        return 'Continue to Captions';
      case 'caption':
        return 'Continue to Hashtags';
      case 'hashtags':
        return 'Continue to Schedule';
      case 'schedule':
        return 'Review Posts';
      case 'review':
        return `Publish ${selectedCount} Posts`;
      default:
        return 'Continue';
    }
  };

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={!canGoBack || isPublishing}
        className="gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Button>

      <Button
        onClick={onNext}
        disabled={!canGoNext || isPublishing}
        className="gap-2"
      >
        {isPublishing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Publishing...
          </>
        ) : isLastStep ? (
          <>
            <Rocket className="h-4 w-4" />
            {getNextLabel()}
          </>
        ) : (
          <>
            {getNextLabel()}
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
