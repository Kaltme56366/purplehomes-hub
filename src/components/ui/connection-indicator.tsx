import { useState } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Button } from './button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

interface ConnectionIndicatorProps {
  connected: boolean;
  collapsed?: boolean;
  lastChecked?: string;
  onReconnect?: () => Promise<boolean>;
  showReconnectButton?: boolean;
}

export function ConnectionIndicator({ 
  connected, 
  collapsed,
  lastChecked,
  onReconnect,
  showReconnectButton = true
}: ConnectionIndicatorProps) {
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async () => {
    if (!onReconnect || isReconnecting) return;
    
    setIsReconnecting(true);
    try {
      await onReconnect();
    } finally {
      setIsReconnecting(false);
    }
  };

  const formatLastChecked = () => {
    if (!lastChecked) return '';
    const date = new Date(lastChecked);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const indicator = (
    <div className={cn(
      "flex items-center gap-2",
      collapsed && "justify-center"
    )}>
      <div className="relative">
        <div
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-colors",
            connected 
              ? "bg-success" 
              : "bg-error",
            connected && "animate-pulse"
          )}
        />
        {!connected && (
          <AlertCircle className="absolute -top-1 -right-1 h-2 w-2 text-error" />
        )}
      </div>
      
      {!collapsed && (
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="h-3.5 w-3.5 text-success" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-error" />
          )}
          <span className={cn(
            "text-xs font-medium",
            connected ? "text-success" : "text-error"
          )}>
            {connected ? "GHL Connected" : "Disconnected"}
          </span>
        </div>
      )}
    </div>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-pointer">
              {indicator}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {connected ? (
                <Wifi className="h-4 w-4 text-success" />
              ) : (
                <WifiOff className="h-4 w-4 text-error" />
              )}
              <span className="font-medium">
                {connected ? "GHL Connected" : "GHL Disconnected"}
              </span>
            </div>
            {lastChecked && (
              <span className="text-xs text-muted-foreground">
                Last checked: {formatLastChecked()}
              </span>
            )}
            {!connected && showReconnectButton && onReconnect && (
              <Button
                size="sm"
                variant="outline"
                className="mt-1 h-7 text-xs"
                onClick={handleReconnect}
                disabled={isReconnecting}
              >
                {isReconnecting ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Reconnect
              </Button>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      {indicator}
      {lastChecked && (
        <span className="text-[10px] text-muted-foreground block">
          Checked: {formatLastChecked()}
        </span>
      )}
      {!connected && showReconnectButton && onReconnect && (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs"
          onClick={handleReconnect}
          disabled={isReconnecting}
        >
          {isReconnecting ? (
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Reconnect
        </Button>
      )}
    </div>
  );
}