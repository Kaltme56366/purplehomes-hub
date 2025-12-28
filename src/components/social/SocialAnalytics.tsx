import { useState, useMemo, useEffect } from 'react';
import {
  Eye, Heart, MessageCircle, Users, BarChart3, Loader2,
  TrendingUp, TrendingDown, Facebook, Instagram, Linkedin,
  RefreshCw, Calendar, ChevronDown, Image as ImageIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useSocialAccounts,
  useSocialStatistics,
  type GHLStatisticsResponse,
} from '@/services/ghlApi';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths } from 'date-fns';

// Platform icons and colors
const platformConfig: Record<string, { icon: typeof Facebook; color: string; label: string }> = {
  facebook: { icon: Facebook, label: 'Facebook', color: 'text-blue-600' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'text-pink-600' },
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'text-blue-700' },
  twitter: { icon: BarChart3, label: 'Twitter/X', color: 'text-gray-800' },
  tiktok: { icon: BarChart3, label: 'TikTok', color: 'text-black' },
  gmb: { icon: BarChart3, label: 'Google Business', color: 'text-green-600' },
  youtube: { icon: BarChart3, label: 'YouTube', color: 'text-red-600' },
  pinterest: { icon: BarChart3, label: 'Pinterest', color: 'text-red-500' },
  threads: { icon: BarChart3, label: 'Threads', color: 'text-gray-800' },
};

// Empty state for when no data is available
const emptyStatistics: GHLStatisticsResponse = {
  kpis: {
    posts: { value: 0, change: 0 },
    likes: { value: 0, change: 0 },
    comments: { value: 0, change: 0 },
    followers: { value: 0, change: 0 },
    impressions: { value: 0, change: 0 },
    reach: { value: 0, change: 0 },
    engagement: { value: 0, change: 0 },
  },
  platformBreakdown: {},
  weeklyData: [],
  topPosts: [],
};

type DatePreset = 'last7' | 'last30' | 'last90';

export function SocialAnalytics() {
  const [datePreset, setDatePreset] = useState<DatePreset>('last7');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Fetch accounts from GHL
  const { data: accountsData, isLoading: isLoadingAccounts } = useSocialAccounts();
  const accounts = accountsData?.accounts || [];

  // Auto-select all accounts when loaded
  useEffect(() => {
    if (accounts.length > 0 && selectedAccountIds.length === 0) {
      setSelectedAccountIds(accounts.filter(a => a.isActive).map(a => a.id));
    }
  }, [accounts, selectedAccountIds.length]);

  // Calculate date range
  const dateRange = useMemo(() => {
    const toDate = new Date();
    let fromDate: Date;

    switch (datePreset) {
      case 'last7':
        fromDate = subDays(toDate, 7);
        break;
      case 'last30':
        fromDate = subDays(toDate, 30);
        break;
      case 'last90':
        fromDate = subMonths(toDate, 3);
        break;
    }

    return {
      fromDate: format(fromDate, 'yyyy-MM-dd'),
      toDate: format(toDate, 'yyyy-MM-dd'),
    };
  }, [datePreset]);

  // Map selected account IDs to profileIds for statistics API
  const selectedProfileIds = useMemo(() => {
    return selectedAccountIds
      .map(id => accounts.find(a => a.id === id)?.profileId)
      .filter((id): id is string => !!id);
  }, [selectedAccountIds, accounts]);

  // Fetch statistics using profileIds
  const {
    data: statisticsData,
    isLoading: isLoadingStats,
    refetch: refetchStats,
    isRefetching,
  } = useSocialStatistics(
    selectedProfileIds,
    dateRange.fromDate,
    dateRange.toDate
  );

  // Use real data or empty state
  const statistics: GHLStatisticsResponse = statisticsData || emptyStatistics;

  const isLoading = isLoadingAccounts || isLoadingStats;
  const isRefreshing = isRefetching;

  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  // Select all / none
  const selectAllAccounts = () => {
    setSelectedAccountIds(accounts.filter(a => a.isActive).map(a => a.id));
  };

  const clearAccountSelection = () => {
    setSelectedAccountIds([]);
  };

  // Format number with K/M suffix
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Render change indicator
  const ChangeIndicator = ({ change }: { change: number }) => {
    if (change === 0) return null;
    const isPositive = change > 0;
    return (
      <span className={cn(
        "flex items-center gap-0.5 text-xs font-medium",
        isPositive ? "text-green-600" : "text-red-500"
      )}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Tracking {selectedAccountIds.length} of {accounts.length} accounts
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Account Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                Accounts ({selectedAccountIds.length})
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Select Accounts</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={selectAllAccounts}>
                    All
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={clearAccountSelection}>
                    None
                  </Button>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {accounts.map((account) => {
                const config = platformConfig[account.platform] || platformConfig.facebook;
                const Icon = config.icon;
                return (
                  <DropdownMenuCheckboxItem
                    key={account.id}
                    checked={selectedAccountIds.includes(account.id)}
                    onCheckedChange={() => toggleAccount(account.id)}
                    disabled={!account.isActive}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", config.color)} />
                      <span className="truncate">{account.accountName}</span>
                      {!account.isActive && (
                        <Badge variant="outline" className="text-[10px] h-4">Inactive</Badge>
                      )}
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date Range Selector */}
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7">Last 7 days</SelectItem>
              <SelectItem value="last30">Last 30 days</SelectItem>
              <SelectItem value="last90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetchStats()}
            disabled={isRefreshing || selectedAccountIds.length === 0}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* No Accounts Selected */}
      {!isLoading && selectedAccountIds.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No Accounts Selected</h3>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Select at least one account to view analytics
            </p>
            <Button className="mt-4" onClick={selectAllAccounts}>
              Select All Accounts
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Analytics Content */}
      {!isLoading && selectedAccountIds.length > 0 && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {/* Posts */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Posts</span>
                  </div>
                  <ChangeIndicator change={statistics.kpis.posts.change} />
                </div>
                <p className="text-2xl font-bold mt-3">
                  {formatNumber(statistics.kpis.posts.value)}
                </p>
              </CardContent>
            </Card>

            {/* Reach */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Eye className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Reach</span>
                  </div>
                  <ChangeIndicator change={statistics.kpis.reach.change} />
                </div>
                <p className="text-2xl font-bold mt-3">
                  {formatNumber(statistics.kpis.reach.value)}
                </p>
              </CardContent>
            </Card>

            {/* Engagement */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <Heart className="h-4 w-4 text-red-500" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Engagement</span>
                  </div>
                  <ChangeIndicator change={statistics.kpis.engagement.change} />
                </div>
                <p className="text-2xl font-bold mt-3">
                  {formatNumber(statistics.kpis.engagement.value)}
                </p>
              </CardContent>
            </Card>

            {/* Followers */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Followers</span>
                  </div>
                  <ChangeIndicator change={statistics.kpis.followers.change} />
                </div>
                <p className="text-2xl font-bold mt-3">
                  {formatNumber(statistics.kpis.followers.value)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Platform Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(statistics.platformBreakdown || {}).map(([platform, metrics]) => {
                  if (!metrics) return null;
                  const config = platformConfig[platform] || platformConfig.facebook;
                  const Icon = config.icon;

                  return (
                    <Card key={platform} className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Icon className={cn("h-5 w-5", config.color)} />
                          <span className="font-medium">{config.label}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Posts</p>
                            <p className="font-semibold flex items-center gap-1">
                              {metrics.posts}
                              <ChangeIndicator change={metrics.postsChange} />
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Likes</p>
                            <p className="font-semibold flex items-center gap-1">
                              {formatNumber(metrics.likes)}
                              <ChangeIndicator change={metrics.likesChange} />
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Comments</p>
                            <p className="font-semibold flex items-center gap-1">
                              {formatNumber(metrics.comments)}
                              <ChangeIndicator change={metrics.commentsChange} />
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reach</p>
                            <p className="font-semibold flex items-center gap-1">
                              {formatNumber(metrics.reach)}
                              <ChangeIndicator change={metrics.reachChange} />
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {Object.keys(statistics.platformBreakdown || {}).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No platform data available for the selected accounts
                </p>
              )}
            </CardContent>
          </Card>

          {/* Weekly Performance Chart */}
          {statistics.weeklyData && statistics.weeklyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-2">
                  {statistics.weeklyData.map((day, index) => {
                    const maxEngagement = Math.max(...statistics.weeklyData!.map(d => d.engagement));
                    const height = maxEngagement > 0 ? (day.engagement / maxEngagement) * 100 : 0;

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex flex-col items-center">
                          <span className="text-xs text-muted-foreground mb-1">
                            {formatNumber(day.engagement)}
                          </span>
                          <div
                            className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                            style={{ height: `${Math.max(height, 4)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {day.date}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Daily engagement (likes + comments + shares)
                </p>
              </CardContent>
            </Card>
          )}

          {/* Top Performing Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Performing Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {statistics.topPosts && statistics.topPosts.length > 0 ? (
                <div className="space-y-4">
                  {statistics.topPosts.map((post) => {
                    const config = platformConfig[post.platform] || platformConfig.facebook;
                    const Icon = config.icon;

                    return (
                      <div
                        key={post.id}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        {/* Post Image */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {post.media?.[0]?.url ? (
                            <img
                              src={post.media[0].url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Post Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={cn("h-4 w-4", config.color)} />
                            <Badge variant="outline" className="text-xs">
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{post.summary}</p>

                          {/* Metrics */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {formatNumber(post.likes)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {formatNumber(post.comments)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {formatNumber(post.impressions)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No published posts found for the selected period
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
