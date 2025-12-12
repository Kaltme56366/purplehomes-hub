import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionExpiry: number | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  checkSession: () => boolean;
}

const API_BASE = import.meta.env.PROD ? '/api/ghl' : '/api/ghl';

// Session durations
const SESSION_DURATION_SHORT = 24 * 60 * 60 * 1000; // 1 day
const SESSION_DURATION_LONG = 30 * 24 * 60 * 60 * 1000; // 30 days

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      sessionExpiry: null,

      login: async (email: string, password: string, rememberMe: boolean = false) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_BASE}?resource=auth&action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            set({ isLoading: false });
            return false;
          }

          const data = await response.json();
          if (data.authenticated && data.user) {
            const sessionDuration = rememberMe ? SESSION_DURATION_LONG : SESSION_DURATION_SHORT;
            const expiry = Date.now() + sessionDuration;
            
            set({
              user: data.user,
              isAuthenticated: true,
              isLoading: false,
              sessionExpiry: expiry,
            });
            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error) {
          console.error('Login error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, sessionExpiry: null });
      },

      checkSession: () => {
        const { sessionExpiry, isAuthenticated } = get();
        if (!isAuthenticated || !sessionExpiry) {
          return false;
        }
        
        if (Date.now() > sessionExpiry) {
          // Session expired
          set({ user: null, isAuthenticated: false, sessionExpiry: null });
          return false;
        }
        
        return true;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionExpiry: state.sessionExpiry,
      }),
    }
  )
);