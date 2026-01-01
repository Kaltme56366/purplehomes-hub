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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  useSocialAccounts,
  useSocialStatistics,
  type GHLStatisticsResponse,
} from '@/services/ghlApi';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths } from 'date-fns';

// Platform icons and colors with hex values for charts
const platformConfig: Record<string, { icon: typeof Facebook; color: string; hex: string; label: string }> = {
  facebook: { icon: Facebook, label: 'Facebook', color: 'text-blue-600', hex: '#1877F2' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'text-pink-600', hex: '#E4405F' },
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'text-blue-700', hex: '#0A66C2' },
  google: { icon: BarChart3, label: 'Google', color: 'text-blue-500', hex: '#4285F4' },
  tiktok: { icon: BarChart3, label: 'TikTok', color: 'text-black', hex: '#000000' },
  youtube: { icon: BarChart3, label: 'YouTube', color: 'text-red-600', hex: '#FF0000' },
  pinterest: { icon: BarChart3, label: 'Pinterest', color: 'text-red-500', hex: '#E60023' },
  threads: { icon: BarChart3, label: 'Threads', color: 'text-gray-800', hex: '#000000' },
  twitter: { icon: BarChart3, label: 'Twitter/X', color: 'text-gray-800', hex: '#1DA1F2' },
  gmb: { icon: BarChart3, label: 'Google Business', color: 'text-green-600', hex: '#4285F4' },
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

// Format number with K/M suffix
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

// DonutChart component for platform breakdown visualization
function DonutChart({ data, total, label }: { data: { platform: string; value: number }[]; total: number; label: string }) {
  const radius = 50;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
          {data.filter(d => d.value > 0).map((item) => {
            const pct = total > 0 ? item.value / total : 0;
            const len = pct * circumference;
            const currentOffset = offset;
            offset += len;
            const hex = platformConfig[item.platform]?.hex || '#888';
            return (
              <circle
                key={item.platform}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={hex}
                strokeWidth={strokeWidth}
                strokeDasharray={`${len} ${circumference - len}`}
                strokeDashoffset={-currentOffset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold">{formatNumber(total)}</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
        {data.filter(d => d.value > 0).map((item) => (
          <div key={item.platform} className="flex items-center gap-1 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: platformConfig[item.platform]?.hex || '#888' }} />
            <span>{platformConfig[item.platform]?.label}: {formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  // Use real data or empty state - extract from rawData structure
  const raw = statisticsData?.rawData?.results || {};
  const tot = raw?.totals || {};
  const brk = raw?.breakdowns || {};

  const statistics: GHLStatisticsResponse = statisticsData ? {
    kpis: {
      posts: { value: tot?.posts || 0, change: 0 },
      likes: { value: tot?.likes || 0, change: 0 },
      comments: { value: tot?.comments || 0, change: 0 },
      followers: { value: tot?.followers || 0, change: 0 },
      impressions: { value: brk?.impressions?.total || 0, change: 0 },
      reach: { value: brk?.reach?.total || 0, change: 0 },
      engagement: { value: brk?.engagement?.total || 0, change: 0 },
    },
    platformBreakdown: Object.keys(brk?.posts?.platforms || {}).reduce((acc, platform) => {
      acc[platform] = {
        posts: brk?.posts?.platforms?.[platform]?.value || 0,
        postsChange: parseFloat(brk?.posts?.platforms?.[platform]?.change) || 0,
        likes: brk?.engagement?.[platform]?.likes || 0,
        likesChange: 0,
        comments: brk?.engagement?.[platform]?.comments || 0,
        commentsChange: 0,
        reach: brk?.reach?.platforms?.[platform]?.value || 0,
        reachChange: parseFloat(brk?.reach?.platforms?.[platform]?.change) || 0,
        impressions: brk?.impressions?.platforms?.[platform]?.value || 0,
        impressionsChange: parseFloat(brk?.impressions?.platforms?.[platform]?.change) || 0,
        followers: 0,
        followersChange: 0,
        engagement: (brk?.engagement?.[platform]?.likes || 0) + (brk?.engagement?.[platform]?.comments || 0) + (brk?.engagement?.[platform]?.shares || 0),
        engagementChange: 0,
      };
      return acc;
    }, {} as Record<string, any>),
    weeklyData: (raw?.dayRange || []).map((date: string, i: number) => {
      // Sum posts across all platforms for this day
      const postsPerDay = Object.values(raw?.postPerformance?.posts || {}).reduce((sum: number, platformPosts: any) => {
        return sum + (platformPosts?.[i] || 0);
      }, 0);
      return {
        date: date,
        posts: postsPerDay,
        engagement: (raw?.postPerformance?.likes?.[i] || 0),
        impressions: 0,
      };
    }),
    topPosts: [],
  } : emptyStatistics;

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
          {/* Top KPI Row - 5 compact cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <BarChart3 className="h-3.5 w-3.5" /> Posts
              </div>
              <p className="text-2xl font-bold">{formatNumber(statistics.kpis.posts.value)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Heart className="h-3.5 w-3.5" /> Likes
              </div>
              <p className="text-2xl font-bold">{formatNumber(statistics.kpis.likes.value)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Users className="h-3.5 w-3.5" /> Followers
              </div>
              <p className="text-2xl font-bold">{formatNumber(statistics.kpis.followers.value)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Eye className="h-3.5 w-3.5" /> Impressions
              </div>
              <p className="text-2xl font-bold">{formatNumber(statistics.kpis.impressions.value)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <MessageCircle className="h-3.5 w-3.5" /> Comments
              </div>
              <p className="text-2xl font-bold">{formatNumber(statistics.kpis.comments.value)}</p>
            </Card>
          </div>

          {/* 4 Donut Charts Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Number of Posts</CardTitle></CardHeader>
              <CardContent>
                <DonutChart
                  data={Object.entries(brk?.posts?.platforms || {}).map(([p, d]: [string, any]) => ({ platform: p, value: d?.value || 0 }))}
                  total={statistics.kpis.posts.value}
                  label="Total Posts"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Engagement</CardTitle></CardHeader>
              <CardContent>
                <DonutChart
                  data={Object.entries(brk?.engagement || {}).filter(([k]) => k !== 'total').map(([p, d]: [string, any]) => ({ platform: p, value: (d?.likes || 0) + (d?.comments || 0) + (d?.shares || 0) }))}
                  total={Object.values(brk?.engagement || {}).reduce((sum: number, d: any) => sum + (d?.likes || 0) + (d?.comments || 0) + (d?.shares || 0), 0)}
                  label="Total Engagement"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Impressions</CardTitle></CardHeader>
              <CardContent>
                <DonutChart
                  data={Object.entries(brk?.impressions?.platforms || {}).map(([p, d]: [string, any]) => ({ platform: p, value: d?.value || 0 }))}
                  total={statistics.kpis.impressions.value}
                  label="Total Impressions"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Post Reach</CardTitle></CardHeader>
              <CardContent>
                <DonutChart
                  data={Object.entries(brk?.reach?.platforms || {}).map(([p, d]: [string, any]) => ({ platform: p, value: d?.value || 0 }))}
                  total={statistics.kpis.reach.value}
                  label="Total Reach"
                />
              </CardContent>
            </Card>
          </div>

          {/* Engagement Stats with Platform Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Engagement Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  {Object.keys(brk?.engagement || {}).filter(k => k !== 'total').map(p => (
                    <TabsTrigger key={p} value={p}>{platformConfig[p]?.label || p}</TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="all">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(brk?.engagement || {}).filter(([k]) => k !== 'total').map(([platform, data]: [string, any]) => {
                      const Icon = platformConfig[platform]?.icon || BarChart3;
                      return (
                        <div key={platform} className="p-4 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-2 mb-3">
                            <Icon className="h-4 w-4" style={{ color: platformConfig[platform]?.hex }} />
                            <span className="font-medium text-sm">{platformConfig[platform]?.label}</span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Likes</span><span className="font-semibold">{formatNumber(data?.likes || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Comments</span><span className="font-semibold">{formatNumber(data?.comments || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Shares</span><span className="font-semibold">{formatNumber(data?.shares || 0)}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                {Object.entries(brk?.engagement || {}).filter(([k]) => k !== 'total').map(([platform, data]: [string, any]) => {
                  const Icon = platformConfig[platform]?.icon || BarChart3;
                  return (
                    <TabsContent key={platform} value={platform}>
                      <div className="flex flex-col items-center py-6">
                        <Icon className="h-10 w-10 mb-4" style={{ color: platformConfig[platform]?.hex }} />
                        <h3 className="text-lg font-semibold mb-6">{platformConfig[platform]?.label} Engagement</h3>
                        <div className="grid grid-cols-3 gap-12 text-center">
                          <div><p className="text-3xl font-bold">{formatNumber(data?.likes || 0)}</p><p className="text-sm text-muted-foreground">Likes</p></div>
                          <div><p className="text-3xl font-bold">{formatNumber(data?.comments || 0)}</p><p className="text-sm text-muted-foreground">Comments</p></div>
                          <div><p className="text-3xl font-bold">{formatNumber(data?.shares || 0)}</p><p className="text-sm text-muted-foreground">Shares</p></div>
                        </div>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>

          {/* Weekly Performance - updated styling */}
          {statistics.weeklyData && statistics.weeklyData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Social Post Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-1">
                  {statistics.weeklyData.map((day, index) => {
                    const maxVal = Math.max(...statistics.weeklyData!.map(d => d.posts + d.engagement));
                    const height = maxVal > 0 ? ((day.posts + day.engagement) / maxVal) * 100 : 0;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-primary rounded-t" style={{ height: `${Math.max(height, 4)}%` }} title={`Posts: ${day.posts}, Engagement: ${day.engagement}`} />
                        <span className="text-[10px] text-muted-foreground">{day.date.split('-').slice(1).join('/')}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
