/**
 * DealsListView - Sortable table view of all deals
 *
 * Features:
 * - Search by property address or buyer name
 * - Filter by stage
 * - Sortable columns
 * - Click row to open deal detail
 */

import { useState, useMemo } from 'react';
import { useDeals } from '@/services/dealsApi';
import { Card } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { StageBadge } from '@/components/matching/StageBadge';
import { MatchScoreBadge } from '@/components/matching/MatchScoreBadge';
import { BuyerAvatar } from '../Shared/BuyerAvatar';
import { UrgencyIndicator, getUrgencyType } from '../Shared/UrgencyIndicator';
import { NoDealsEmptyState, NoResultsEmptyState } from '../Shared/DealEmptyState';
import { MATCH_DEAL_STAGES } from '@/types/associations';
import type { Deal, DealSortField, DealSortDirection } from '@/types/deals';
import { formatDistanceToNow } from 'date-fns';

interface DealsListViewProps {
  search?: string;
  onSearchChange?: (search: string) => void;
  onViewDeal?: (deal: Deal) => void;
}

export function DealsListView({
  search: externalSearch,
  onSearchChange,
  onViewDeal,
}: DealsListViewProps) {
  // Local state for search if not controlled
  const [localSearch, setLocalSearch] = useState('');
  const search = externalSearch ?? localSearch;
  const handleSearchChange = onSearchChange ?? setLocalSearch;

  // Filter and sort state
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<DealSortField>('lastActivity');
  const [sortDirection, setSortDirection] = useState<DealSortDirection>('desc');

  // Fetch deals
  const { data: deals, isLoading, error } = useDeals({
    stage: stageFilter === 'all' ? undefined : (stageFilter as any),
    search: search || undefined,
  });

  // Sort deals
  const sortedDeals = useMemo(() => {
    if (!deals) return [];

    return [...deals].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'lastActivity':
          const aDate = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
          const bDate = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'stage':
          const stageOrder = MATCH_DEAL_STAGES.indexOf(a.status as any) -
            MATCH_DEAL_STAGES.indexOf(b.status as any);
          comparison = stageOrder;
          break;
        case 'createdAt':
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = aCreated - bCreated;
          break;
        case 'buyerName':
          comparison = `${a.buyer?.firstName} ${a.buyer?.lastName}`.localeCompare(
            `${b.buyer?.firstName} ${b.buyer?.lastName}`
          );
          break;
        case 'propertyAddress':
          comparison = (a.property?.address || '').localeCompare(
            b.property?.address || ''
          );
          break;
        case 'price':
          comparison = (a.property?.price || 0) - (b.property?.price || 0);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [deals, sortField, sortDirection]);

  // Handle sort click
  const handleSort = (field: DealSortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: DealSortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1" />
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-500">Failed to load deals: {(error as Error).message}</p>
      </Card>
    );
  }

  // No deals at all
  if (!deals || deals.length === 0) {
    if (!search && stageFilter === 'all') {
      return <NoDealsEmptyState />;
    }
    return (
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {MATCH_DEAL_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
              <SelectItem value="Not Interested">Not Interested</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <NoResultsEmptyState
          onClear={() => {
            handleSearchChange('');
            setStageFilter('all');
          }}
        />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {MATCH_DEAL_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
            <SelectItem value="Not Interested">Not Interested</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        {sortedDeals.length} deal{sortedDeals.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort('propertyAddress')}
                >
                  Property
                  <SortIndicator field="propertyAddress" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort('buyerName')}
                >
                  Buyer
                  <SortIndicator field="buyerName" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort('stage')}
                >
                  Stage
                  <SortIndicator field="stage" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort('score')}
                >
                  Score
                  <SortIndicator field="score" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort('lastActivity')}
                >
                  Last Activity
                  <SortIndicator field="lastActivity" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDeals.map((deal) => (
              <TableRow
                key={deal.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onViewDeal?.(deal)}
              >
                <TableCell>
                  <UrgencyIndicator
                    type={getUrgencyType(deal.isStale, deal.daysSinceActivity)}
                  />
                </TableCell>
                <TableCell>
                  <div className="min-w-0">
                    <p className="font-medium truncate max-w-xs">
                      {deal.property?.address || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {deal.property?.city}, {deal.property?.state}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <BuyerAvatar
                      firstName={deal.buyer?.firstName}
                      lastName={deal.buyer?.lastName}
                      size="sm"
                    />
                    <span className="truncate max-w-32">
                      {deal.buyer?.firstName} {deal.buyer?.lastName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <StageBadge stage={deal.status} size="sm" />
                </TableCell>
                <TableCell>
                  <MatchScoreBadge score={deal.score} size="sm" />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {deal.lastActivityAt
                    ? formatDistanceToNow(new Date(deal.lastActivityAt), {
                        addSuffix: true,
                      })
                    : 'No activity'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
