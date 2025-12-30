import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const AUTH_API_BASE = '/api/auth';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthResponse {
  success: boolean;
  user: User;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupData {
  email: string;
  password: string;
  name: string;
  role?: string;
}

const AUTH_STORAGE_KEY = 'purplehomes_auth_user';

/**
 * Fetch wrapper for Auth API
 */
const fetchAuth = async <T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(`${AUTH_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Auth API Error' }));
    throw new Error(error.error || `Auth API Error: ${response.status}`);
  }

  return response.json();
};

/**
 * Get stored user from localStorage
 */
export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

/**
 * Store user in localStorage
 */
const storeUser = (user: User | null) => {
  if (typeof window === 'undefined') return;

  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

/**
 * Hook to get the current authenticated user
 */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['auth-user'],
    queryFn: () => getStoredUser(),
    staleTime: Infinity,
  });
};

/**
 * Hook for user login
 */
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      return fetchAuth('?action=login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
    onSuccess: (data) => {
      storeUser(data.user);
      queryClient.setQueryData(['auth-user'], data.user);
    },
  });
};

/**
 * Hook for user signup
 */
export const useSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SignupData): Promise<AuthResponse> => {
      return fetchAuth('?action=signup', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      storeUser(data.user);
      queryClient.setQueryData(['auth-user'], data.user);
    },
  });
};

/**
 * Hook for user logout
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      storeUser(null);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth-user'], null);
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
    },
  });
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return getStoredUser() !== null;
};

/**
 * Check if user has a specific role
 */
export const hasRole = (role: string): boolean => {
  const user = getStoredUser();
  return user?.role === role;
};
