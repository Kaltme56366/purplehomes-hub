import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockActivities } from '@/data/mockData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ActivityType } from '@/types';

const actionTypeOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All Actions' },
  { value: 'posted', label: 'Posted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'caption-generated', label: 'Caption Generated' },
  { value: 'property-added', label: 'Property Added' },
  { value: 'status-changed', label: 'Status Changed' },
  { value: 'inventory-sent', label: 'Inventory Sent' },
];

const statusIcons = {
  success: CheckCircle,
  error: XCircle,
  pending: Clock,
};

const statusColors = {
  success: 'text-success',
  error: 'text-error',
  pending: 'text-warning',
};

const actionLabels: Record<ActivityType, string> = {
  'posted': 'Posted',
  'scheduled': 'Scheduled',
  'caption-generated': 'Caption Generated',
  'property-added': 'Property Added',
  'status-changed': 'Status Changed',
  'buyer-added': 'Buyer Added',
  'inventory-sent': 'Inventory Sent',
};

export default function ActivityLogs() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredActivities = mockActivities.filter((activity) => {
    if (actionFilter !== 'all' && activity.type !== actionFilter) {
      return false;
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        activity.propertyCode?.toLowerCase().includes(searchLower) ||
        activity.details.toLowerCase().includes(searchLower) ||
        activity.user?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const handleExport = () => {
    // Create CSV content
    const headers = ['Timestamp', 'Action', 'Property Code', 'Details', 'User', 'Status'];
    const rows = filteredActivities.map(a => [
      format(new Date(a.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      actionLabels[a.type],
      a.propertyCode || '',
      a.details,
      a.user || '',
      a.status,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Activity Logs</h1>
          <p className="text-muted-foreground mt-1">
            View all system activity and changes
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by property code, details, or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            {actionTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[150px]">Action</TableHead>
              <TableHead className="w-[150px]">Property</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-[120px]">User</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredActivities.map((activity) => {
              const StatusIcon = statusIcons[activity.status];
              
              return (
                <TableRow 
                  key={activity.id}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="text-sm">
                    {format(new Date(activity.timestamp), 'MMM d, yyyy')}
                    <br />
                    <span className="text-muted-foreground">
                      {format(new Date(activity.timestamp), 'h:mm a')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {actionLabels[activity.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {activity.propertyCode ? (
                      <button
                        onClick={() => navigate(`/properties/${activity.propertyId}`)}
                        className="text-primary hover:underline"
                      >
                        {activity.propertyCode}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {activity.details}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {activity.user || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <StatusIcon className={cn("h-4 w-4", statusColors[activity.status])} />
                      <span className={cn("text-sm capitalize", statusColors[activity.status])}>
                        {activity.status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {activity.propertyId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/properties/${activity.propertyId}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filteredActivities.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No activity logs found matching your filters.
        </div>
      )}
    </div>
  );
}
