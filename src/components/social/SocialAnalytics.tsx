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
  getApiConfig,
  type GHLSocialAccount,
  type GHLStatisticsResponse,
  type GHLTopPost
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

// Mock data for demo mode
const mockStatistics: GHLStatisticsResponse = {
  kpis: {
    posts: { value: 24, change: 12.5 },
    likes: { value: 1845, change: 8.3 },
    comments: { value: 312, change: 15.2 },
    followers: { value: 4520, change: 2.1 },
    impressions: { value: 45600, change: -3.5 },
    reach: { value: 32400, change: 5.8 },
    engagement: { value: 2157, change: 10.2 },
  },
  platformBreakdown: {
    facebook: {
      posts: 10, postsChange: 5,
      likes: 720, likesChange: 12,
      comments: 145, commentsChange: 8,
      followers: 2100, followersChange: 1.5,
      impressions: 18500, impressionsChange: -2,
      reach: 12400, reachChange: 4,
      engagement: 865, engagementChange: 10,
    },
    instagram: {
      posts: 12, postsChange: 20,
      likes: 980, likesChange: 15,
      comments: 134, commentsChange: 22,
      followers: 1850, followersChange: 3.2,
      impressions: 22100, impressionsChange: -5,
      reach: 16200, reachChange: 8,
      engagement: 1114, engagementChange: 18,
    },
    linkedin: {
      posts: 2, postsChange: -10,
      likes: 145, likesChange: -5,
      comments: 33, commentsChange: 10,
      followers: 570, followersChange: 1.8,
      impressions: 5000, impressionsChange: 2,
      reach: 3800, reachChange: 3,
      engagement: 178, engagementChange: 5,
    },
  },
  weeklyData: [
    { date: 'Mon', posts: 4, engagement: 320, impressions: 6500 },
    { date: 'Tue', posts: 3, engagement: 280, impressions: 5800 },
    { date: 'Wed', posts: 5, engagement: 410, impressions: 7200 },
    { date: 'Thu', posts: 4, engagement: 350, impressions: 6800 },
    { date: 'Fri', posts: 6, engagement: 520, impressions: 8100 },
    { date: 'Sat', posts: 1, engagement: 180, impressions: 4200 },
    { date: 'Sun', posts: 1, engagement: 97, impressions: 3000 },
  ],
  topPosts: [
    {
      id: '1',
      accountId: 'acc1',
      platform: 'instagram',
      summary: 'Hot Deal Alert! 4BR/3BA beauty in Scottsdale with pool and mountain views...',
      media: [{ url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400', type: 'image' }],
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 245,
      comments: 32,
      shares: 18,
      impressions: 5420,
      reach: 4100,
    },
    {
      id: '2',
      accountId: 'acc2',
      platform: 'facebook',
      summary: 'New Investment Opportunity in Phoenix! Perfect starter home with great ROI...',
      media: [{ url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400', type: 'image' }],
      publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 189,
      comments: 24,
      shares: 45,
      impressions: 4320,
      reach: 3200,
    },
    {
      id: '3',
      accountId: 'acc3',
      platform: 'linkedin',
      summary: 'Looking for your next investment? Check out this turn-key rental property...',
      media: [{ url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400', type: 'image' }],
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 67,
      comments: 8,
      shares: 12,
      impressions: 1890,
      reach: 1450,
    },
  ],
};

// Mock accounts for demo mode
const mockAccounts: GHLSocialAccount[] = [
  { id: 'fb-1', platform: 'facebook', accountName: 'Purple Homes AZ', isActive: true },
  { id: 'ig-1', platform: 'instagram', accountName: '@purplehomes_az', isActive: true },
  { id: 'li-1', platform: 'linkedin', accountName: 'Purple Homes Company', isActive: true },
];

type DatePreset = 'last7' | 'last30' | 'last90';

export function SocialAnalytics() {
  const [datePreset, setDatePreset] = useState<DatePreset>('last7');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Check GHL connection
  const ghlConfig = getApiConfig();
  const isGhlConnected = !!ghlConfig.apiKey;

  // Fetch accounts
  const { data: accountsData, isLoading: isLoadingAccounts } = useSocialAccounts();
  const accounts = isGhlConnected ? (accountsData?.accounts || []) : mockAccounts;

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

  // Fetch statistics
  const {
    data: statisticsData,
    isLoading: isLoadingStats,
    refetch: refetchStats,
    isRefetching,
  } = useSocialStatistics(
    selectedAccountIds,
    dateRange.fromDate,
    dateRange.toDate
  );

  // Use real data or mock
  const statistics: GHLStatisticsResponse = isGhlConnected && statisticsData
    ? statisticsData
    : mockStatistics;

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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Analytics
            {!isGhlConnected && (
              <Badge variant="secondary" className="text-xs">Demo Mode</Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isGhlConnected
              ? `Tracking ${selectedAccountIds.length} of ${accounts.length} accounts`
              : 'Connect GHL to see real data'}
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
