import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SyncLogEntry, SyncType, SyncStatus, ConnectionFailureNotification } from '@/types';

const MAX_LOG_ENTRIES = 100;
const FAILURE_NOTIFICATION_THRESHOLD = 5 * 60 * 1000; // 5 minutes

interface SyncState {
  // Sync History
  syncLog: SyncLogEntry[];
  addSyncEntry: (entry: Omit<SyncLogEntry, 'id' | 'timestamp'>) => void;
  clearSyncLog: () => void;
  getSyncLogByType: (type: SyncType) => SyncLogEntry[];
  getRecentSyncLog: (limit?: number) => SyncLogEntry[];
  
  // Connection Failure Tracking
  connectionFailedSince: string | null;
  setConnectionFailed: (failed: boolean) => void;
  shouldSendFailureNotification: () => boolean;
  
  // Failure Notifications
  failureNotifications: ConnectionFailureNotification[];
  addFailureNotification: (notification: Omit<ConnectionFailureNotification, 'id'>) => void;
  acknowledgeNotification: (id: string) => void;
  
  // Stats
  getTotalRecordsSynced: () => number;
  getSuccessRate: () => number;
  getLastSyncByType: (type: SyncType) => SyncLogEntry | undefined;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      syncLog: [],
      connectionFailedSince: null,
      failureNotifications: [],

      addSyncEntry: (entry) => {
        const newEntry: SyncLogEntry = {
          ...entry,
          id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: new Date().toISOString(),
        };
        
        set((state) => ({
          syncLog: [newEntry, ...state.syncLog].slice(0, MAX_LOG_ENTRIES),
        }));
      },

      clearSyncLog: () => set({ syncLog: [] }),

      getSyncLogByType: (type) => {
        return get().syncLog.filter((entry) => entry.type === type);
      },

      getRecentSyncLog: (limit = 20) => {
        return get().syncLog.slice(0, limit);
      },

      setConnectionFailed: (failed) => {
        const currentFailedSince = get().connectionFailedSince;
        
        if (failed && !currentFailedSince) {
          // Connection just failed, start tracking
          set({ connectionFailedSince: new Date().toISOString() });
        } else if (!failed && currentFailedSince) {
          // Connection restored
          set({ connectionFailedSince: null });
        }
      },

      shouldSendFailureNotification: () => {
        const { connectionFailedSince, failureNotifications } = get();
        
        if (!connectionFailedSince) return false;
        
        const failedDuration = Date.now() - new Date(connectionFailedSince).getTime();
        
        if (failedDuration < FAILURE_NOTIFICATION_THRESHOLD) return false;
        
        // Check if we already sent a notification for this failure period
        const recentNotification = failureNotifications.find(
          (n) => n.failedSince === connectionFailedSince && !n.acknowledged
        );
        
        return !recentNotification;
      },

      addFailureNotification: (notification) => {
        const newNotification: ConnectionFailureNotification = {
          ...notification,
          id: `notif-${Date.now()}`,
        };
        
        set((state) => ({
          failureNotifications: [newNotification, ...state.failureNotifications].slice(0, 50),
        }));
      },

      acknowledgeNotification: (id) => {
        set((state) => ({
          failureNotifications: state.failureNotifications.map((n) =>
            n.id === id ? { ...n, acknowledged: true } : n
          ),
        }));
      },

      getTotalRecordsSynced: () => {
        return get().syncLog.reduce((total, entry) => total + entry.recordsProcessed, 0);
      },

      getSuccessRate: () => {
        const log = get().syncLog;
        if (log.length === 0) return 100;
        
        const successCount = log.filter((entry) => entry.status === 'success').length;
        return Math.round((successCount / log.length) * 100);
      },

      getLastSyncByType: (type) => {
        return get().syncLog.find((entry) => entry.type === type);
      },
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        syncLog: state.syncLog,
        failureNotifications: state.failureNotifications,
      }),
    }
  )
);