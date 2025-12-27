import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCreateSocialPost } from '@/services/ghlApi';
import WizardProgress from './WizardProgress';
import WizardNavigation from './WizardNavigation';
import { ContentSourceStep, ImageStep, CaptionStep, HashtagsStep, PublishStep } from './steps';
import { useWizardState } from './hooks/useWizardState';
import { WIZARD_STEPS } from './types';

export default function CreateWizard() {
  const { toast } = useToast();
  const createPost = useCreateSocialPost();
  const [isPublishing, setIsPublishing] = useState(false);

  const {
    state,
    updateState,
    goToStep,
    goNext,
    goBack,
    canGoNext,
    canGoBack,
    resetWizard,
  } = useWizardState();

  const renderStep = () => {
    switch (state.currentStep) {
      case 'source':
        return (
          <ContentSourceStep
            state={state}
            updateState={updateState}
          />
        );
      case 'image':
        return (
          <ImageStep
            state={state}
            updateState={updateState}
          />
        );
      case 'caption':
        return (
          <CaptionStep
            state={state}
            updateState={updateState}
          />
        );
      case 'hashtags':
        return (
          <HashtagsStep
            state={state}
            updateState={updateState}
          />
        );
      case 'publish':
        return (
          <PublishStep
            state={state}
            updateState={updateState}
            onPublish={handlePublish}
            onReset={resetWizard}
          />
        );
      default:
        return null;
    }
  };

  const handlePublish = async () => {
    if (state.selectedAccounts.length === 0) {
      toast({
        title: 'No accounts selected',
        description: 'Please select at least one social media account to post to.',
        variant: 'destructive',
      });
      return;
    }

    setIsPublishing(true);

    try {
      // Get image URL (either generated or custom)
      const imageUrl = state.generatedImageUrl || state.customImagePreview;

      // Build full caption with hashtags per platform
      const buildCaption = (platform: 'facebook' | 'instagram' | 'linkedin') => {
        let caption = state.captions[platform];
        if (state.platformHashtagSettings[platform].enabled && state.selectedHashtags.length > 0) {
          const limit = state.platformHashtagSettings[platform].limit;
          const hashtags = limit
            ? state.selectedHashtags.slice(0, limit)
            : state.selectedHashtags;
          caption += '\n\n' + hashtags.join(' ');
        }
        return caption;
      };

      // Use primary caption (facebook) for the summary
      const primaryCaption = buildCaption('facebook');

      // Build schedule date if scheduling for later
      let scheduleDate: string | undefined;
      if (state.scheduleType === 'later' && state.scheduledDate) {
        const date = new Date(state.scheduledDate);
        if (state.scheduledTime) {
          const [hours, minutes] = state.scheduledTime.split(':');
          date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        }
        scheduleDate = date.toISOString();
      }

      // Create the post via GHL API
      await createPost.mutateAsync({
        accountIds: state.selectedAccounts,
        summary: primaryCaption,
        media: imageUrl ? [{ url: imageUrl, type: 'image/png' }] : undefined,
        scheduleDate,
        status: state.scheduleType === 'now' ? 'published' : 'scheduled',
      });

      toast({
        title: state.scheduleType === 'now' ? 'Post published!' : 'Post scheduled!',
        description: state.scheduleType === 'now'
          ? 'Your post has been published to the selected accounts.'
          : `Your post has been scheduled for ${state.scheduledDate?.toLocaleDateString()}.`,
      });

      // Reset wizard after successful publish
      resetWizard();
    } catch (error) {
      console.error('Failed to publish post:', error);
      toast({
        title: 'Failed to publish',
        description: error instanceof Error ? error.message : 'An error occurred while publishing your post.',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleNext = () => {
    if (state.currentStep === 'publish') {
      handlePublish();
    } else {
      goNext();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <WizardProgress
        currentStep={state.currentStep}
        steps={WIZARD_STEPS}
        onStepClick={goToStep}
      />

      {/* Step Content */}
      <Card className="mt-6">
        <CardContent className="p-6">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <WizardNavigation
        currentStep={state.currentStep}
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        onBack={goBack}
        onNext={handleNext}
        isLastStep={state.currentStep === 'publish'}
        isPublishing={isPublishing}
      />
    </div>
  );
}
