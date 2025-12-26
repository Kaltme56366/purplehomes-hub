/**
 * usePollingConfig - Centralized polling configuration
 *
 * Provides consistent polling intervals for React Query hooks
 * with visibility-aware polling (pause when tab is inactive).
 */

import { useState, useEffect, useCallback } from 'react';

export interface PollingConfig {
  /** Polling interval in milliseconds (default: 60000 = 1 minute) */
  interval: number;
  /** Whether polling is enabled (default: true) */
  enabled: boolean;
  /** Whether to poll when tab is in background (default: false) */
  pollInBackground: boolean;
}

const DEFAULT_POLLING_CONFIG: PollingConfig = {
  interval: 60 * 1000, // 1 minute
  enabled: true,
  pollInBackground: false,
};

// Storage key for user preferences
const STORAGE_KEY = 'purplehomes_polling_config';

/**
 * Hook for managing polling configuration
 */
export function usePollingConfig() {
  const [config, setConfig] = useState<PollingConfig>(() => {
    // Load from localStorage if available
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_POLLING_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_POLLING_CONFIG;
  });

  const [isTabVisible, setIsTabVisible] = useState(true);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Save config to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignore storage errors
    }
  }, [config]);

  // Update a specific config value
  const updateConfig = useCallback((updates: Partial<PollingConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  // Reset to defaults
  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_POLLING_CONFIG);
  }, []);

  // Calculate effective polling interval (0 = disabled)
  const effectiveInterval = config.enabled
    ? config.pollInBackground || isTabVisible
      ? config.interval
      : 0
    : 0;

  return {
    config,
    updateConfig,
    resetConfig,
    isTabVisible,
    effectiveInterval,
    // Convenience getters for React Query
    refetchInterval: effectiveInterval,
    refetchIntervalInBackground: config.pollInBackground,
  };
}

/**
 * Preset polling intervals
 */
export const POLLING_INTERVALS = {
  FAST: 30 * 1000,    // 30 seconds - for critical data
  NORMAL: 60 * 1000,  // 1 minute - default
  SLOW: 5 * 60 * 1000, // 5 minutes - for less critical data
  OFF: 0,             // No polling
} as const;

export type PollingIntervalPreset = keyof typeof POLLING_INTERVALS;
