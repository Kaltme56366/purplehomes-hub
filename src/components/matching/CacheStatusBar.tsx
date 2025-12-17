import { RefreshCw, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMatchingData } from '@/hooks/useCache';

export function CacheStatusBar() {
  const {
    status,
    isStale,
    newPropertiesAvailable,
    newBuyersAvailable,
    propertiesCount,
    buyersCount,
    matchesCount,
    lastSynced,
    syncAll,
    isSyncing,
  } = useMatchingData();

  const formatLastSynced = (date: string | null | undefined) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="bg-muted/50 border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Cache Status Icon */}
          <div className="flex items-center gap-2">
            {isStale ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            <span className="font-medium">
              {isStale ? 'Cache Outdated' : 'Cache Current'}
            </span>
          </div>

          {/* Counts */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span>{propertiesCount} properties</span>
              {newPropertiesAvailable > 0 && (
                <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
                  +{newPropertiesAvailable} new
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span>{buyersCount} buyers</span>
              {newBuyersAvailable > 0 && (
                <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
                  +{newBuyersAvailable} new
                </Badge>
              )}
            </div>

            <div>
              <span>{matchesCount} matches</span>
            </div>
          </div>

          {/* Last Synced */}
          <div className="text-sm text-muted-foreground">
            Last synced: {formatLastSynced(lastSynced)}
          </div>
        </div>

        {/* Sync Button */}
        <Button
          variant={isStale ? 'default' : 'outline'}
          size="sm"
          onClick={() => syncAll()}
          disabled={isSyncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      {/* Stale Warning */}
      {isStale && (
        <div className="mt-3 text-sm text-amber-600 bg-amber-50 rounded p-2">
          {newPropertiesAvailable > 0 && (
            <span>{newPropertiesAvailable} new properties available. </span>
          )}
          {newBuyersAvailable > 0 && (
            <span>{newBuyersAvailable} new buyers available. </span>
          )}
          <span>Click "Sync Now" to update the cache.</span>
        </div>
      )}
    </div>
  );
}
