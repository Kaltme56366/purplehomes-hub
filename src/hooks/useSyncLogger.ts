import { useSyncStore } from '@/store/useSyncStore';
import type { SyncType, SyncStatus } from '@/types';

interface UseSyncLoggerOptions {
  type: SyncType;
}

export function useSyncLogger({ type }: UseSyncLoggerOptions) {
  const { addSyncEntry } = useSyncStore();

  const logSync = (params: {
    status: SyncStatus;
    recordsProcessed: number;
    recordsCreated?: number;
    recordsUpdated?: number;
    recordsFailed?: number;
    duration: number;
    error?: string;
  }) => {
    addSyncEntry({
      type,
      status: params.status,
      recordsProcessed: params.recordsProcessed,
      recordsCreated: params.recordsCreated || 0,
      recordsUpdated: params.recordsUpdated || 0,
      recordsFailed: params.recordsFailed || 0,
      duration: params.duration,
      error: params.error,
    });
  };

  const withSyncLogging = async <T>(
    operation: () => Promise<T>,
    getRecordCounts?: (result: T) => {
      recordsProcessed: number;
      recordsCreated?: number;
      recordsUpdated?: number;
      recordsFailed?: number;
    }
  ): Promise<T> => {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      const counts = getRecordCounts?.(result) || { recordsProcessed: 1 };
      
      logSync({
        status: counts.recordsFailed ? 'partial' : 'success',
        duration,
        ...counts,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logSync({
        status: 'failed',
        recordsProcessed: 0,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  };

  return {
    logSync,
    withSyncLogging,
  };
}