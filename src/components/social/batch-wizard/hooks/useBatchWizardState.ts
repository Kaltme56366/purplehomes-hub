/**
 * Batch Wizard State Management Hook
 */

import { useState, useCallback, useMemo } from 'react';
import type { Property } from '@/types';
import {
  BatchWizardState,
  BatchWizardStep,
  BATCH_WIZARD_STEPS,
  INITIAL_BATCH_WIZARD_STATE,
  PropertyPostState,
} from '../types';
import type { Platform } from '../../create-wizard/types';

export function useBatchWizardState(properties: Property[]) {
  const [state, setState] = useState<BatchWizardState>(INITIAL_BATCH_WIZARD_STATE);

  // Update state partially
  const updateState = useCallback((updates: Partial<BatchWizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Get selected properties
  const selectedProperties = useMemo(() => {
    return properties.filter((p) => state.selectedPropertyIds.includes(p.id));
  }, [properties, state.selectedPropertyIds]);

  // Toggle property selection
  const toggleProperty = useCallback((propertyId: string) => {
    setState((prev) => {
      const newIds = prev.selectedPropertyIds.includes(propertyId)
        ? prev.selectedPropertyIds.filter((id) => id !== propertyId)
        : [...prev.selectedPropertyIds, propertyId];

      // Initialize property state if selecting
      const newPropertyStates = { ...prev.propertyStates };
      if (!prev.selectedPropertyIds.includes(propertyId)) {
        const property = properties.find((p) => p.id === propertyId);
        newPropertyStates[propertyId] = {
          propertyId,
          hasExistingImage: !!property?.heroImage,
          generatedImageUrl: null,
          useExistingImage: !!property?.heroImage,
          captions: { facebook: '', instagram: '', linkedin: '' },
          status: 'pending',
        };
      }

      return {
        ...prev,
        selectedPropertyIds: newIds,
        propertyStates: newPropertyStates,
      };
    });
  }, [properties]);

  // Select all properties
  const selectAll = useCallback(() => {
    const allIds = properties.map((p) => p.id);
    const newPropertyStates: Record<string, PropertyPostState> = {};

    properties.forEach((property) => {
      newPropertyStates[property.id] = {
        propertyId: property.id,
        hasExistingImage: !!property.heroImage,
        generatedImageUrl: null,
        useExistingImage: !!property.heroImage,
        captions: { facebook: '', instagram: '', linkedin: '' },
        status: 'pending',
      };
    });

    updateState({
      selectedPropertyIds: allIds,
      propertyStates: newPropertyStates,
    });
  }, [properties, updateState]);

  // Deselect all
  const deselectAll = useCallback(() => {
    updateState({
      selectedPropertyIds: [],
      propertyStates: {},
    });
  }, [updateState]);

  // Update a single property's state
  const updatePropertyState = useCallback(
    (propertyId: string, updates: Partial<PropertyPostState>) => {
      setState((prev) => ({
        ...prev,
        propertyStates: {
          ...prev.propertyStates,
          [propertyId]: {
            ...prev.propertyStates[propertyId],
            ...updates,
          },
        },
      }));
    },
    []
  );

  // Update caption for a property
  const updatePropertyCaption = useCallback(
    (propertyId: string, platform: Platform, caption: string) => {
      setState((prev) => ({
        ...prev,
        propertyStates: {
          ...prev.propertyStates,
          [propertyId]: {
            ...prev.propertyStates[propertyId],
            captions: {
              ...prev.propertyStates[propertyId]?.captions,
              [platform]: caption,
            },
          },
        },
      }));
    },
    []
  );

  // Navigation
  const currentStepIndex = BATCH_WIZARD_STEPS.indexOf(state.currentStep);

  const goToStep = useCallback((step: BatchWizardStep) => {
    const targetIndex = BATCH_WIZARD_STEPS.indexOf(step);
    const currentIndex = BATCH_WIZARD_STEPS.indexOf(state.currentStep);
    // Only allow going to completed steps or next step
    if (targetIndex <= currentIndex) {
      updateState({ currentStep: step });
    }
  }, [state.currentStep, updateState]);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < BATCH_WIZARD_STEPS.length) {
      updateState({ currentStep: BATCH_WIZARD_STEPS[nextIndex] });
    }
  }, [currentStepIndex, updateState]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      updateState({ currentStep: BATCH_WIZARD_STEPS[prevIndex] });
    }
  }, [currentStepIndex, updateState]);

  // Validation
  const canGoNext = useMemo(() => {
    switch (state.currentStep) {
      case 'select':
        return state.selectedPropertyIds.length > 0;
      case 'image':
        // Can proceed even if images aren't generated (optional step)
        return true;
      case 'caption':
        // Can proceed even if captions aren't generated (optional step)
        return true;
      case 'hashtags':
        return true;
      case 'schedule':
        if (state.scheduleType === 'staggered') {
          return !!state.staggerSettings.startDate && !!state.staggerSettings.startTime;
        }
        return state.selectedAccounts.length > 0;
      case 'review':
        return state.selectedAccounts.length > 0;
      default:
        return true;
    }
  }, [state]);

  const canGoBack = currentStepIndex > 0;

  // Reset wizard
  const resetWizard = useCallback(() => {
    setState(INITIAL_BATCH_WIZARD_STATE);
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = state.selectedPropertyIds.length;
    const withImages = Object.values(state.propertyStates).filter(
      (ps) => ps.generatedImageUrl || (ps.hasExistingImage && ps.useExistingImage)
    ).length;
    const withCaptions = Object.values(state.propertyStates).filter(
      (ps) => ps.captions.facebook || ps.captions.instagram || ps.captions.linkedin
    ).length;
    const ready = Object.values(state.propertyStates).filter((ps) => ps.status === 'ready').length;

    return { total, withImages, withCaptions, ready };
  }, [state.selectedPropertyIds, state.propertyStates]);

  return {
    state,
    updateState,
    selectedProperties,
    toggleProperty,
    selectAll,
    deselectAll,
    updatePropertyState,
    updatePropertyCaption,
    goToStep,
    goNext,
    goBack,
    canGoNext,
    canGoBack,
    resetWizard,
    stats,
    currentStepIndex,
  };
}
