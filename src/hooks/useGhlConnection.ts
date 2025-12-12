import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSyncStore } from '@/store/useSyncStore';
import { getApiConfig } from '@/services/ghlApi';
import { toast } from 'sonner';

const API_BASE = '/api/ghl';
const CHECK_INTERVAL = 60000; // Check every 60 seconds
const RETRY_DELAY = 5000; // Retry after 5 seconds on failure
const MAX_RETRIES = 3;

interface UseGhlConnectionOptions {
  autoConnect?: boolean;
  checkInterval?: number;
  notifyOnFailure?: boolean;
  notificationEmail?: string;
}

export function useGhlConnection(options: UseGhlConnectionOptions = {}) {
  const { 
    autoConnect = true, 
    checkInterval = CHECK_INTERVAL,
    notifyOnFailure = true,
    notificationEmail
  } = options;
  
  const { connectionStatus, setConnectionStatus } = useAppStore();
  const { 
    setConnectionFailed, 
    shouldSendFailureNotification, 
    addFailureNotification,
    connectionFailedSince 
  } = useSyncStore();
  
  const retryCount = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);
  const notificationSentRef = useRef(false);

  const sendFailureNotification = useCallback(async (email: string, failedSince: string) => {
    if (notificationSentRef.current) return;
    
    try {
      const response = await fetch(`${API_BASE}?resource=notifications&action=connection-failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          failedSince,
          message: `GHL connection has been down since ${new Date(failedSince).toLocaleString()}`,
        }),
      });

      if (response.ok) {
        addFailureNotification({
          sentAt: new Date().toISOString(),
          failedSince,
          recipientEmail: email,
          acknowledged: false,
        });
        notificationSentRef.current = true;
        console.log('Connection failure notification sent to:', email);
      }
    } catch (error) {
      console.error('Failed to send connection failure notification:', error);
    }
  }, [addFailureNotification]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (isCheckingRef.current) return connectionStatus.highLevel;
    
    isCheckingRef.current = true;
    const config = getApiConfig();
    
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (config.apiKey && config.locationId) {
        headers['X-GHL-API-Key'] = config.apiKey;
        headers['X-GHL-Location-ID'] = config.locationId;
      }
      
      const response = await fetch(`${API_BASE}?resource=contacts&limit=1`, {
        method: 'GET',
        headers,
      });

      const isConnected = response.ok;
      
      setConnectionStatus({ 
        highLevel: isConnected, 
        lastChecked: new Date().toISOString(),
        failedSince: isConnected ? undefined : (connectionStatus.failedSince || new Date().toISOString()),
      });
      
      // Track connection failure state
      setConnectionFailed(!isConnected);
      
      if (isConnected) {
        retryCount.current = 0;
        notificationSentRef.current = false; // Reset notification flag on reconnect
        
        // Show toast if we were previously disconnected
        if (!connectionStatus.highLevel) {
          toast.success('GHL connection restored');
        }
      } else {
        // Check if we should send failure notification
        if (notifyOnFailure && notificationEmail && shouldSendFailureNotification()) {
          const failedSince = connectionFailedSince || new Date().toISOString();
          sendFailureNotification(notificationEmail, failedSince);
        }
      }
      
      isCheckingRef.current = false;
      return isConnected;
    } catch (error) {
      console.error('GHL connection check failed:', error);
      
      setConnectionStatus({ 
        highLevel: false, 
        lastChecked: new Date().toISOString(),
        failedSince: connectionStatus.failedSince || new Date().toISOString(),
      });
      
      setConnectionFailed(true);
      isCheckingRef.current = false;
      return false;
    }
  }, [
    connectionStatus.highLevel, 
    connectionStatus.failedSince,
    setConnectionStatus, 
    setConnectionFailed,
    notifyOnFailure,
    notificationEmail,
    shouldSendFailureNotification,
    connectionFailedSince,
    sendFailureNotification,
  ]);

  const attemptReconnect = useCallback(async () => {
    if (retryCount.current >= MAX_RETRIES) {
      console.log('Max reconnection attempts reached');
      return false;
    }

    retryCount.current += 1;
    console.log(`Attempting reconnection (${retryCount.current}/${MAX_RETRIES})...`);
    
    const success = await checkConnection();
    
    if (!success && retryCount.current < MAX_RETRIES) {
      setTimeout(attemptReconnect, RETRY_DELAY);
    }
    
    return success;
  }, [checkConnection]);

  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(async () => {
      const isConnected = await checkConnection();
      
      if (!isConnected && autoConnect) {
        attemptReconnect();
      }
    }, checkInterval);
  }, [checkConnection, attemptReconnect, autoConnect, checkInterval]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const manualReconnect = useCallback(async () => {
    retryCount.current = 0;
    return checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    // Initial check
    checkConnection();
    
    // Start monitoring
    if (autoConnect) {
      startMonitoring();
    }
    
    return () => {
      stopMonitoring();
    };
  }, [autoConnect, checkConnection, startMonitoring, stopMonitoring]);

  return {
    isConnected: connectionStatus.highLevel,
    lastChecked: connectionStatus.lastChecked,
    failedSince: connectionFailedSince,
    checkConnection,
    manualReconnect,
    startMonitoring,
    stopMonitoring,
    retryCount: retryCount.current,
  };
}