import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Database,
  Users,
  Building2,
  Share2,
  FileText,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSyncStore } from '@/store/useSyncStore';
import type { SyncType, SyncLogEntry } from '@/types';
import { cn } from '@/lib/utils';

const SYNC_TYPE_CONFIG: Record<SyncType, { icon: typeof Users; label: string; color: string }> = {
  contacts: { icon: Users, label: 'Contacts', color: 'text-blue-500' },
  properties: { icon: Building2, label: 'Properties', color: 'text-purple-500' },
  opportunities: { icon: Database, label: 'Opportunities', color: 'text-orange-500' },
  'social-accounts': { icon: Share2, label: 'Social Accounts', color: 'text-pink-500' },
  documents: { icon: FileText, label: 'Documents', color: 'text-green-500' },
};

function SyncLogItem({ entry }: { entry: SyncLogEntry }) {
  const [isOpen, setIsOpen] = useState(false);
  const config = SYNC_TYPE_CONFIG[entry.type] || SYNC_TYPE_CONFIG.contacts;
  const Icon = config.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/80 cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-background", config.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{config.label} Sync</span>
                {entry.status === 'success' && (
                  <Badge className="bg-success/20 text-success hover:bg-success/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Success
                  </Badge>
                )}
                {entry.status === 'failed' && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                )}
                {entry.status === 'partial' && (
                  <Badge className="bg-warning/20 text-warning hover:bg-warning/30">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Partial
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{entry.recordsProcessed} records</p>
              <p className="text-xs text-muted-foreground">{entry.duration}ms</p>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 ml-12 p-3 rounded-lg bg-card border border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium text-success">{entry.recordsCreated}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Updated</p>
              <p className="font-medium text-primary">{entry.recordsUpdated}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Failed</p>
              <p className="font-medium text-destructive">{entry.recordsFailed}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Time</p>
              <p className="font-medium">{format(new Date(entry.timestamp), 'HH:mm:ss')}</p>
            </div>
          </div>
          {entry.error && (
            <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive font-mono">{entry.error}</p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SyncHistoryLog() {
  const { 
    syncLog, 
    clearSyncLog, 
    getTotalRecordsSynced, 
    getSuccessRate,
    getRecentSyncLog 
  } = useSyncStore();

  const recentLogs = getRecentSyncLog(50);
  const totalRecords = getTotalRecordsSynced();
  const successRate = getSuccessRate();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sync History
            </CardTitle>
            <CardDescription>
              Track all data synchronizations with GHL
            </CardDescription>
          </div>
          {syncLog.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearSyncLog}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Log
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Database className="h-4 w-4" />
              Total Synced
            </div>
            <p className="text-2xl font-bold">{totalRecords.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <CheckCircle2 className="h-4 w-4" />
              Success Rate
            </div>
            <p className={cn(
              "text-2xl font-bold",
              successRate >= 90 ? "text-success" : successRate >= 70 ? "text-warning" : "text-destructive"
            )}>
              {successRate}%
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="h-4 w-4" />
              Total Syncs
            </div>
            <p className="text-2xl font-bold">{syncLog.length}</p>
          </div>
        </div>

        {/* Log Entries */}
        {recentLogs.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {recentLogs.map((entry) => (
                <SyncLogItem key={entry.id} entry={entry} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No sync history yet</p>
            <p className="text-sm">Sync records will appear here after synchronization</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}