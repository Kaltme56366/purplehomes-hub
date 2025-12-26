import { useState, useMemo } from 'react';
import { Eye, MousePointer, Heart, BarChart3, Loader2 } from 'lucide-react';
import { AnalyticsDateRange } from './AnalyticsDateRange';
import { AnalyticsHeroMetric } from './AnalyticsHeroMetric';
import { AnalyticsMetricCard } from './AnalyticsMetricCard';
import { AnalyticsTrendChart } from './AnalyticsTrendChart';
import { AnalyticsTopPosts } from './AnalyticsTopPosts';
import { useSocialStats, useSocialPostStats, getApiConfig } from '@/services/ghlApi';
import { toast } from 'sonner';

// Mock analytics data (fallback when GHL not connected)
const mockAnalyticsData = {
  totalReach: {
    value: 45600,
    change: 12.5,
    platformBreakdown: [
      { platform: 'facebook' as const, value: 22400, percentage: 49 },
      { platform: 'instagram' as const, value: 18500, percentage: 41 },
      { platform: 'linkedin' as const, value: 4700, percentage: 10 },
    ],
  },
  engagement: {
    value: 3200,
    change: 8.3,
  },
  clicks: {
    value: 890,
    change: -2.1,
  },
  posts: {
    value: 24,
    change: 15.0,
  },
  weeklyEngagement: [
    { date: 'Mon', value: 420 },
    { date: 'Tue', value: 380 },
    { date: 'Wed', value: 540 },
    { date: 'Thu', value: 460 },
    { date: 'Fri', value: 620 },
    { date: 'Sat', value: 340 },
    { date: 'Sun', value: 480 },
  ],
  topPosts: [
    {
      id: '1',
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
      caption: '🏠 Hot Deal Alert! 4BR/3BA beauty in Scottsdale with pool and mountain views...',
      platform: 'instagram' as const,
      property: {
        propertyCode: 'PH-2401',
        address: '1234 Desert Vista Dr, Scottsdale, AZ',
      },
      metrics: {
        likes: 245,
        comments: 32,
        shares: 18,
        impressions: 5420,
      },
      postedDate: 'Dec 8, 2024',
    },
    {
      id: '2',
      image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400',
      caption: '📍 New Investment Opportunity in Phoenix! Perfect starter home...',
      platform: 'facebook' as const,
      property: {
        propertyCode: 'PH-2398',
        address: '5678 Phoenix Ln, Phoenix, AZ',
      },
      metrics: {
        likes: 189,
        comments: 24,
        shares: 45,
        impressions: 4320,
      },
      postedDate: 'Dec 6, 2024',
    },
    {
      id: '3',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
      caption: 'Looking for your next investment? Check out this turn-key rental property with strong ROI potential.',
      platform: 'linkedin' as const,
      property: {
        propertyCode: 'PH-2395',
        address: '910 Investment Ave, Tempe, AZ',
      },
      metrics: {
        likes: 67,
        comments: 8,
        shares: 12,
        impressions: 1890,
      },
      postedDate: 'Dec 5, 2024',
    },
  ],
};

export function SocialAnalytics() {
  const [datePreset, setDatePreset] = useState<'last7' | 'last30' | 'last90' | 'custom'>('last30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Check GHL connection
  const ghlConfig = getApiConfig();
  const isGhlConnected = !!ghlConfig.apiKey;

  // GHL API hooks
  const {
    data: statsData,
    isLoading: isLoadingStats,
    refetch: refetchStats
  } = useSocialStats(datePreset, startDate, endDate);

  const {
    data: postStatsData,
    isLoading: isLoadingPostStats,
    refetch: refetchPostStats
  } = useSocialPostStats('published', 10);

  const isRefreshing = isLoadingStats || isLoadingPostStats;

  // Transform GHL stats or use mock data
  const analyticsData = useMemo(() => {
    const ghlStats = statsData?.stats;

    if (isGhlConnected && ghlStats) {
      // Use GHL data
      const platformBreakdown: { platform: 'facebook' | 'instagram' | 'linkedin'; value: number; percentage: number }[] = [];
      const totalReach = ghlStats.totalReach || 0;

      if (ghlStats.platformBreakdown?.facebook) {
        platformBreakdown.push({
          platform: 'facebook',
          value: ghlStats.platformBreakdown.facebook.reach || 0,
          percentage: totalReach > 0 ? Math.round((ghlStats.platformBreakdown.facebook.reach / totalReach) * 100) : 0,
        });
      }
      if (ghlStats.platformBreakdown?.instagram) {
        platformBreakdown.push({
          platform: 'instagram',
          value: ghlStats.platformBreakdown.instagram.reach || 0,
          percentage: totalReach > 0 ? Math.round((ghlStats.platformBreakdown.instagram.reach / totalReach) * 100) : 0,
        });
      }
      if (ghlStats.platformBreakdown?.linkedin) {
        platformBreakdown.push({
          platform: 'linkedin',
          value: ghlStats.platformBreakdown.linkedin.reach || 0,
          percentage: totalReach > 0 ? Math.round((ghlStats.platformBreakdown.linkedin.reach / totalReach) * 100) : 0,
        });
      }

      return {
        totalReach: {
          value: ghlStats.totalReach || 0,
          change: 0, // GHL doesn't provide change data directly
          platformBreakdown,
        },
        engagement: {
          value: ghlStats.totalEngagement || 0,
          change: 0,
        },
        clicks: {
          value: ghlStats.totalClicks || 0,
          change: 0,
        },
        posts: {
          value: ghlStats.totalPosts || 0,
          change: 0,
        },
        weeklyEngagement: mockAnalyticsData.weeklyEngagement, // Would need GHL time-series data
        topPosts: mockAnalyticsData.topPosts, // Will be replaced with postStatsData
      };
    }

    // Fallback to mock data
    return mockAnalyticsData;
  }, [isGhlConnected, statsData]);

  // Transform top posts from GHL or use mock
  const topPosts = useMemo(() => {
    const ghlPosts = postStatsData?.posts;

    if (isGhlConnected && ghlPosts && ghlPosts.length > 0) {
      return ghlPosts.slice(0, 5).map((post, index) => ({
        id: post.id,
        image: post.media?.[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
        caption: post.summary || '',
        platform: (post.platforms?.[0] || 'facebook') as 'facebook' | 'instagram' | 'linkedin',
        property: undefined, // GHL doesn't link to properties by default
        metrics: {
          likes: post.stats?.likes || 0,
          comments: post.stats?.comments || 0,
          shares: post.stats?.shares || 0,
          impressions: post.stats?.impressions || 0,
        },
        postedDate: post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'N/A',
      }));
    }

    return mockAnalyticsData.topPosts;
  }, [isGhlConnected, postStatsData]);

  const handleRefresh = async () => {
    toast.info('Refreshing analytics data...');
    await Promise.all([refetchStats(), refetchPostStats()]);
    toast.success('Analytics data refreshed');
  };

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Range */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            {isGhlConnected ? 'Connected to GoHighLevel' : 'Showing demo data'}
          </p>
        </div>
        <AnalyticsDateRange
          preset={datePreset}
          onPresetChange={setDatePreset}
          startDate={startDate}
          endDate={endDate}
          onDateChange={handleDateChange}
          onRefresh={handleRefresh}
          isLoading={isRefreshing}
        />
      </div>

      {/* Loading State */}
      {isRefreshing && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isRefreshing && (
        <>
          {/* Hero Metric - Total Reach */}
          <AnalyticsHeroMetric
            title="Total Reach"
            value={analyticsData.totalReach.value}
            change={analyticsData.totalReach.change}
            changeLabel={`vs ${datePreset === 'last7' ? 'previous 7 days' : datePreset === 'last30' ? 'previous 30 days' : 'previous 90 days'}`}
            platformBreakdown={analyticsData.totalReach.platformBreakdown}
          />

          {/* Secondary Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnalyticsMetricCard
              icon={Heart}
              iconColor="text-red-500"
              title="Total Engagement"
              value={analyticsData.engagement.value}
              change={analyticsData.engagement.change}
              subtitle="likes, comments, shares"
            />
            <AnalyticsMetricCard
              icon={MousePointer}
              iconColor="text-blue-500"
              title="Link Clicks"
              value={analyticsData.clicks.value}
              change={analyticsData.clicks.change}
              subtitle="property page visits"
            />
            <AnalyticsMetricCard
              icon={BarChart3}
              iconColor="text-purple-500"
              title="Posts Published"
              value={analyticsData.posts.value}
              change={analyticsData.posts.change}
              subtitle="this period"
            />
          </div>

          {/* Trend Chart */}
          <AnalyticsTrendChart
            title="Weekly Engagement"
            data={analyticsData.weeklyEngagement}
            color="bg-primary"
          />

          {/* Top Posts */}
          <AnalyticsTopPosts
            posts={topPosts}
            onPostClick={(post) => {
              toast.info(`Viewing details for ${post.property?.propertyCode || 'post'}`);
            }}
          />
        </>
      )}
    </div>
  );
}
