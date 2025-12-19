import { useState, useEffect, useCallback } from 'react';
import { X, Lightbulb, ZoomIn, MousePointer, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TOUR_SEEN_KEY = 'purplehomes_map_tour_seen';

interface MapCoachMarksProps {
  /** Whether the map has loaded and is ready */
  mapLoaded: boolean;
  /** Whether a ZIP code search was just performed */
  hasSearchedZip: boolean;
  /** Current zoom level of the map (to detect cluster view) */
  currentZoom?: number;
  /** Whether there are clusters visible (zoom < 14) */
  showingClusters: boolean;
  /** Callback when user clicks "Show me" to demonstrate zoom */
  onShowMeClick?: () => void;
  /** Position class for the tip pill */
  className?: string;
}

type CoachMarkLayer = 'tip' | 'contextual' | 'spotlight' | 'none';

export function MapCoachMarks({
  mapLoaded,
  hasSearchedZip,
  showingClusters,
  onShowMeClick,
  className
}: MapCoachMarksProps) {
  const [activeLayer, setActiveLayer] = useState<CoachMarkLayer>('none');
  const [tourSeen, setTourSeen] = useState<boolean>(() => {
    return localStorage.getItem(TOUR_SEEN_KEY) === 'true';
  });
  const [showHelp, setShowHelp] = useState(false);
  const [contextualTimerId, setContextualTimerId] = useState<NodeJS.Timeout | null>(null);
  const [spotlightStep, setSpotlightStep] = useState(0);

  // Layer 1: Always-on tip pill - show after map loads
  useEffect(() => {
    if (mapLoaded && !tourSeen && activeLayer === 'none') {
      // Small delay to let map render first
      const timer = setTimeout(() => {
        setActiveLayer('tip');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [mapLoaded, tourSeen, activeLayer]);

  // Layer 2: Contextual tooltip - trigger after ZIP search when showing clusters
  useEffect(() => {
    if (hasSearchedZip && showingClusters && !tourSeen) {
      // Clear any existing timer
      if (contextualTimerId) {
        clearTimeout(contextualTimerId);
      }

      // Show contextual tooltip after 3-5 seconds
      const timer = setTimeout(() => {
        setActiveLayer('contextual');
      }, 4000);

      setContextualTimerId(timer);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [hasSearchedZip, showingClusters, tourSeen]);

  // Dismiss tip pill
  const dismissTip = useCallback(() => {
    setActiveLayer('none');
  }, []);

  // Handle "Show me" click - trigger spotlight
  const handleShowMe = useCallback(() => {
    setActiveLayer('spotlight');
    setSpotlightStep(1);
    onShowMeClick?.();
  }, [onShowMeClick]);

  // Complete the tour
  const completeTour = useCallback(() => {
    setActiveLayer('none');
    setTourSeen(true);
    localStorage.setItem(TOUR_SEEN_KEY, 'true');
  }, []);

  // Reset tour (for help button)
  const resetTour = useCallback(() => {
    setTourSeen(false);
    localStorage.removeItem(TOUR_SEEN_KEY);
    setShowHelp(false);
    setActiveLayer('tip');
  }, []);

  // Advance spotlight step
  const advanceSpotlight = useCallback(() => {
    if (spotlightStep >= 3) {
      completeTour();
    } else {
      setSpotlightStep(prev => prev + 1);
    }
  }, [spotlightStep, completeTour]);

  // Skip spotlight
  const skipSpotlight = useCallback(() => {
    completeTour();
  }, [completeTour]);

  // Don't render anything until map is loaded
  if (!mapLoaded) return null;

  return (
    <>
      {/* Layer 1: Always-on Tip Pill */}
      {activeLayer === 'tip' && (
        <div
          className={cn(
            "absolute z-30 animate-fade-in",
            className || "top-4 left-4"
          )}
        >
          <div className="flex items-center gap-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-purple-200 dark:border-purple-700">
            <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-200">
              Tip: Zoom in to see more pins
            </span>
            <button
              onClick={dismissTip}
              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Dismiss tip"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Layer 2: Contextual Tooltip (appears after ZIP search) */}
      {activeLayer === 'contextual' && (
        <div className="absolute z-40 inset-0 pointer-events-none">
          {/* Semi-transparent overlay */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Tooltip positioned near center-bottom */}
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-purple-300 dark:border-purple-600 p-4 max-w-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <ZoomIn className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    See Individual Listings
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    The purple circles show grouped properties. Zoom in or click them to see individual listings!
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={handleShowMe}
                    >
                      <MousePointer className="h-3.5 w-3.5 mr-1" />
                      Show me
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={completeTour}
                    >
                      Got it
                    </Button>
                  </div>
                </div>
                <button
                  onClick={completeTour}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
            {/* Arrow pointing up */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-purple-300 dark:border-purple-600 transform rotate-45" />
          </div>
        </div>
      )}

      {/* Layer 3: Spotlight Coach Mark */}
      {activeLayer === 'spotlight' && (
        <div className="absolute z-50 inset-0">
          {/* Dark overlay with spotlight hole */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Spotlight instruction card */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-purple-500 p-5 max-w-md">
              {spotlightStep === 1 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      1
                    </div>
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                      Click on a Cluster
                    </h4>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Those purple circles with numbers are "clusters" - they group nearby properties together. Click one to zoom in and see what's inside!
                  </p>
                  <div className="flex items-center gap-4 mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      5
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-200">← This means 5 properties are grouped here</span>
                  </div>
                </>
              )}

              {spotlightStep === 2 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      2
                    </div>
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                      Zoom Reveals Individual Pins
                    </h4>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    As you zoom in, clusters break apart into individual property pins showing their prices. Each pin is a single listing you can click to learn more.
                  </p>
                  <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">$285K</span>
                      <div className="w-5 h-5 bg-purple-600 rounded-full" />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">$320K</span>
                      <div className="w-5 h-5 bg-purple-600 rounded-full" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-200">← Individual property pins with prices</span>
                  </div>
                </>
              )}

              {spotlightStep === 3 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      3
                    </div>
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                      Quick Actions
                    </h4>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Use the "Move" button on any property card to instantly zoom the map to that location, or hover over pins to preview property details.
                  </p>
                  <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <Button size="sm" variant="outline" className="gap-1 text-xs" disabled>
                      <ZoomIn className="h-3 w-3" />
                      Move
                    </Button>
                    <span className="text-sm text-gray-700 dark:text-gray-200">← Zooms map to property</span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        spotlightStep >= step
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
                    onClick={skipSpotlight}
                  >
                    Skip
                  </Button>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={advanceSpotlight}
                  >
                    {spotlightStep >= 3 ? "Done" : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Button (shows after tour is completed) */}
      {tourSeen && activeLayer === 'none' && (
        <div className={cn("absolute z-20", className || "top-4 left-4")}>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-md hover:bg-white dark:hover:bg-gray-800"
            onClick={() => setShowHelp(!showHelp)}
            aria-label="Map help"
          >
            <HelpCircle className="h-4 w-4 text-purple-600" />
          </Button>

          {showHelp && (
            <div className="absolute top-10 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[200px] animate-fade-in">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Need help navigating the map?
              </p>
              <Button
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                onClick={resetTour}
              >
                Replay Tour
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
