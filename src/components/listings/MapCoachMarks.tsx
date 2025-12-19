import { useState, useEffect, useCallback } from 'react';
import { X, HelpCircle, ZoomIn, MousePointerClick, List, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TOUR_DISMISSED_KEY = 'purplehomes_listings_tour_dismissed';

interface MapCoachMarksProps {
  /** Whether the map has loaded and is ready */
  mapLoaded: boolean;
  /** Position class for the tour button */
  className?: string;
}

type TourStep = 0 | 1 | 2 | 3 | 4;

// Tour step definitions with element selectors for highlighting
const TOUR_STEPS: Array<{
  title: string;
  description: string;
  highlightSelector?: string;
  position: 'center' | 'top-right' | 'bottom-center' | 'top-left';
}> = [
  {
    title: 'Welcome to Listings',
    description: 'This page shows all available properties on an interactive map. Let\'s take a quick tour!',
    position: 'center',
  },
  {
    title: 'Property Clusters',
    description: 'Purple circles with numbers are "clusters" - they group nearby properties together. Click one to zoom in and see individual listings.',
    position: 'center',
  },
  {
    title: 'Search by Location',
    description: 'Enter a ZIP code or use the location button to pan the map to a specific area.',
    highlightSelector: '[data-tour="zip-search"]',
    position: 'top-left',
  },
  {
    title: 'Property List',
    description: 'Browse all properties in the sidebar. Use "Move" to zoom the map to any property, or "See More" to view details.',
    highlightSelector: '[data-tour="property-list"]',
    position: 'top-right',
  },
];

export function MapCoachMarks({
  mapLoaded,
  className
}: MapCoachMarksProps) {
  const [tourDismissed, setTourDismissed] = useState<boolean>(() => {
    return localStorage.getItem(TOUR_DISMISSED_KEY) === 'true';
  });
  const [showFirstTimeTooltip, setShowFirstTimeTooltip] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<TourStep>(0);

  // Show first-time tooltip after map loads (only if tour not dismissed)
  useEffect(() => {
    if (mapLoaded && !tourDismissed) {
      const timer = setTimeout(() => {
        setShowFirstTimeTooltip(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mapLoaded, tourDismissed]);

  // Start the tour
  const startTour = useCallback(() => {
    setShowFirstTimeTooltip(false);
    setTourActive(true);
    setCurrentStep(1);
  }, []);

  // Dismiss first-time tooltip (mark as seen)
  const dismissFirstTime = useCallback(() => {
    setShowFirstTimeTooltip(false);
    setTourDismissed(true);
    localStorage.setItem(TOUR_DISMISSED_KEY, 'true');
  }, []);

  // Go to next step
  const nextStep = useCallback(() => {
    if (currentStep >= TOUR_STEPS.length - 1) {
      // Tour complete
      setTourActive(false);
      setCurrentStep(0);
      setTourDismissed(true);
      localStorage.setItem(TOUR_DISMISSED_KEY, 'true');
    } else {
      setCurrentStep((prev) => (prev + 1) as TourStep);
    }
  }, [currentStep]);

  // Skip/exit tour
  const exitTour = useCallback(() => {
    setTourActive(false);
    setCurrentStep(0);
    setTourDismissed(true);
    localStorage.setItem(TOUR_DISMISSED_KEY, 'true');
  }, []);

  // Manually trigger tour (for re-runs)
  const triggerTour = useCallback(() => {
    setTourActive(true);
    setCurrentStep(1);
  }, []);

  // Don't render anything until map is loaded
  if (!mapLoaded) return null;

  const stepData = TOUR_STEPS[currentStep] || TOUR_STEPS[0];

  return (
    <>
      {/* Tour Entry Button - Always visible near map top-left */}
      <div className={cn("absolute z-30", className || "top-4 left-4")}>
        <div className="relative">
          {/* Tour Button with first-time glow */}
          <button
            onClick={tourDismissed ? triggerTour : startTour}
            className={cn(
              "flex items-center gap-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border transition-all duration-300",
              "hover:shadow-xl hover:scale-105",
              !tourDismissed && showFirstTimeTooltip
                ? "border-purple-400 ring-2 ring-purple-400/50 animate-pulse"
                : "border-gray-200 dark:border-gray-700 hover:border-purple-400"
            )}
            aria-label="Take a tour of this page"
          >
            <HelpCircle className={cn(
              "h-4 w-4 transition-colors",
              !tourDismissed && showFirstTimeTooltip
                ? "text-purple-500"
                : "text-purple-600"
            )} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {tourDismissed ? "Page tour" : "How this works"}
            </span>
          </button>

          {/* First-time Tooltip */}
          {!tourDismissed && showFirstTimeTooltip && (
            <div className="absolute top-full left-0 mt-2 z-50 animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-purple-300 dark:border-purple-600 p-4 w-72">
                {/* Arrow pointing up */}
                <div className="absolute -top-2 left-6 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-purple-300 dark:border-purple-600 transform rotate-45" />

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                      New here?
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                      Get a quick tour of how listings and the map work together.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7"
                        onClick={startTour}
                      >
                        Start Tour
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={dismissFirstTime}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                  <button
                    onClick={dismissFirstTime}
                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tour Overlay - Active during tour */}
      {tourActive && (
        <div className="fixed inset-0 z-[100]">
          {/* Dimmed overlay */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity duration-300"
            onClick={exitTour}
          />

          {/* Tour Card */}
          <div
            className={cn(
              "absolute pointer-events-auto animate-fade-in",
              stepData.position === 'center' && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              stepData.position === 'top-left' && "top-24 left-4 md:left-8",
              stepData.position === 'top-right' && "top-24 right-4 md:right-[440px]",
              stepData.position === 'bottom-center' && "bottom-32 left-1/2 -translate-x-1/2"
            )}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-purple-500 p-5 max-w-sm">
              {/* Step indicator and title */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {currentStep}
                </div>
                <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                  {stepData.title}
                </h4>
                <button
                  onClick={exitTour}
                  className="ml-auto p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Exit tour"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">
                {stepData.description}
              </p>

              {/* Visual examples for specific steps */}
              {currentStep === 1 && (
                <div className="flex items-center gap-4 mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    5
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-200">
                    This cluster contains 5 properties
                  </span>
                </div>
              )}

              {currentStep === 2 && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  <span className="text-xs text-gray-700 dark:text-gray-200">
                    Use ZIP or the compass icon
                  </span>
                </div>
              )}

              {currentStep === 3 && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-6 px-2" disabled>
                      <ZoomIn className="h-3 w-3" />
                      Move
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-6 px-2" disabled>
                      See More
                    </Button>
                  </div>
                </div>
              )}

              {/* Progress and navigation */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex gap-1.5">
                  {TOUR_STEPS.slice(1).map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        currentStep >= idx + 1
                          ? "bg-purple-600"
                          : "bg-gray-300 dark:bg-gray-600"
                      )}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={exitTour}
                  >
                    Skip
                  </Button>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7"
                    onClick={nextStep}
                  >
                    {currentStep >= TOUR_STEPS.length - 1 ? "Done" : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
