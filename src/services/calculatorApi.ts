/**
 * React Query hooks for Calculator API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CalculatorInputs,
  CalculatorOutputs,
  CalculatorDefaults,
  SavedCalculation,
  CalculationsListResponse,
} from '@/types/calculator';
import { calculateAll, createDefaultInputs } from '@/lib/calculatorEngine';

const CALCULATOR_API_BASE = '/api/calculator';

// ============ API FETCH HELPER ============

async function fetchCalculatorApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${CALCULATOR_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'API Error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============ CALCULATIONS CRUD ============

/**
 * List all calculations, optionally filtered by property or buyer
 */
export const useCalculations = (filters?: {
  propertyCode?: string;
  contactId?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['calculations', filters],
    queryFn: async (): Promise<CalculationsListResponse> => {
      const params = new URLSearchParams({ action: 'list' });

      if (filters?.propertyCode) {
        params.set('propertyCode', filters.propertyCode);
      }
      if (filters?.contactId) {
        params.set('contactId', filters.contactId);
      }
      if (filters?.limit) {
        params.set('limit', filters.limit.toString());
      }

      return fetchCalculatorApi(`?${params}`);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Get calculations for a specific property
 */
export const usePropertyCalculations = (propertyCode: string | undefined) => {
  return useQuery({
    queryKey: ['calculations', 'property', propertyCode],
    queryFn: async (): Promise<CalculationsListResponse> => {
      if (!propertyCode) throw new Error('Property code required');
      return fetchCalculatorApi(`?action=list&propertyCode=${encodeURIComponent(propertyCode)}`);
    },
    enabled: !!propertyCode,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Get calculations for a specific buyer
 */
export const useBuyerCalculations = (contactId: string | undefined) => {
  return useQuery({
    queryKey: ['calculations', 'buyer', contactId],
    queryFn: async (): Promise<CalculationsListResponse> => {
      if (!contactId) throw new Error('Contact ID required');
      return fetchCalculatorApi(`?action=list&contactId=${encodeURIComponent(contactId)}`);
    },
    enabled: !!contactId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Get single calculation by ID
 */
export const useCalculation = (recordId: string | null | undefined) => {
  return useQuery({
    queryKey: ['calculation', recordId],
    queryFn: async (): Promise<{ calculation: SavedCalculation }> => {
      if (!recordId) throw new Error('Record ID required');
      return fetchCalculatorApi(`?action=get&recordId=${recordId}`);
    },
    enabled: !!recordId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create new calculation
 */
export const useCreateCalculation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      propertyCode?: string;
      contactId?: string;
      inputs: CalculatorInputs;
      outputs: CalculatorOutputs;
      notes?: string;
    }): Promise<{ success: boolean; calculation: SavedCalculation }> => {
      return fetchCalculatorApi('?action=create', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['calculations'] });

      if (variables.propertyCode) {
        queryClient.invalidateQueries({
          queryKey: ['calculations', 'property', variables.propertyCode],
        });
      }
      if (variables.contactId) {
        queryClient.invalidateQueries({
          queryKey: ['calculations', 'buyer', variables.contactId],
        });
      }
    },
  });
};

/**
 * Update existing calculation
 */
export const useUpdateCalculation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      recordId: string;
      name?: string;
      inputs?: CalculatorInputs;
      outputs?: CalculatorOutputs;
      notes?: string;
    }): Promise<{ success: boolean; calculation: SavedCalculation }> => {
      const { recordId, ...body } = data;
      return fetchCalculatorApi(`?action=update&recordId=${recordId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate all calculation queries
      queryClient.invalidateQueries({ queryKey: ['calculations'] });
      queryClient.invalidateQueries({ queryKey: ['calculation', variables.recordId] });
    },
  });
};

/**
 * Delete calculation
 */
export const useDeleteCalculation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string): Promise<{ success: boolean; deletedId: string }> => {
      return fetchCalculatorApi(`?action=delete&recordId=${recordId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculations'] });
    },
  });
};

// ============ DEFAULTS ============

/**
 * Get user's saved calculator defaults
 */
export const useCalculatorDefaults = () => {
  return useQuery({
    queryKey: ['calculator-defaults'],
    queryFn: async (): Promise<CalculatorDefaults> => {
      const response = await fetchCalculatorApi<{ defaults: CalculatorDefaults }>(
        '?action=get-defaults'
      );
      return response.defaults;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - defaults rarely change
  });
};

/**
 * Update user's calculator defaults
 */
export const useUpdateCalculatorDefaults = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      defaults: Partial<CalculatorDefaults>
    ): Promise<{ success: boolean; defaults: CalculatorDefaults }> => {
      return fetchCalculatorApi('?action=update-defaults', {
        method: 'PUT',
        body: JSON.stringify(defaults),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculator-defaults'] });
    },
  });
};

// ============ CLIENT-SIDE CALCULATION HELPERS ============

/**
 * Hook for real-time calculation (client-side only)
 * Returns memoized calculate function and helper utilities
 */
export const useCalculateRealtime = () => {
  return {
    /**
     * Calculate all outputs from inputs
     */
    calculate: calculateAll,

    /**
     * Create default inputs, optionally with property data
     */
    createDefaults: createDefaultInputs,

    /**
     * Recalculate and return updated inputs + outputs
     */
    recalculate: (inputs: CalculatorInputs): { inputs: CalculatorInputs; outputs: CalculatorOutputs } => {
      const outputs = calculateAll(inputs);
      return { inputs, outputs };
    },
  };
};

// ============ CALCULATION COUNT HELPERS ============

/**
 * Get count of calculations for a property (for badges)
 */
export const usePropertyCalculationCount = (propertyCode: string | undefined) => {
  const { data } = usePropertyCalculations(propertyCode);
  return data?.calculations?.length ?? 0;
};

/**
 * Get count of calculations for a buyer (for badges)
 */
export const useBuyerCalculationCount = (contactId: string | undefined) => {
  const { data } = useBuyerCalculations(contactId);
  return data?.calculations?.length ?? 0;
};

// ============ BULK OPERATIONS ============

/**
 * Prefetch calculations for multiple properties
 */
export const usePrefetchPropertyCalculations = () => {
  const queryClient = useQueryClient();

  return async (propertyCodes: string[]) => {
    await Promise.all(
      propertyCodes.map((code) =>
        queryClient.prefetchQuery({
          queryKey: ['calculations', 'property', code],
          queryFn: () =>
            fetchCalculatorApi<CalculationsListResponse>(
              `?action=list&propertyCode=${encodeURIComponent(code)}`
            ),
          staleTime: 2 * 60 * 1000,
        })
      )
    );
  };
};
