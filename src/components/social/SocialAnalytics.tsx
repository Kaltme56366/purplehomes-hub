import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, TrendingUp, Eye, MousePointer, Heart, Share2, MessageCircle,
  Facebook, Instagram, Linkedin, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
}

const MetricCard = ({ title, value, change, icon: Icon }: MetricCardProps) => {
  const isPositive = change >= 0;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            isPositive ? "text-green-500" : "text-red-500"
          )}>
            {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {Math.abs(change)}%
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
};

interface PlatformPerformanceProps {
  platform: 'facebook' | 'instagram' | 'linkedin';
  reach: number;
  engagement: number;
  clicks: number;
  posts: number;
}

const platformConfig = {
  facebook: { icon: Facebook, label: 'Facebook', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'text-blue-700', bgColor: 'bg-blue-700/10' },
};

const PlatformCard = ({ platform, reach, engagement, clicks, posts }: PlatformPerformanceProps) => {
  const config = platformConfig[platform];
  const Icon = config.icon;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg", config.bgColor)}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
          <CardTitle className="text-base">{config.label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xl font-bold">{reach.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Reach</p>
          </div>
          <div>
            <p className="text-xl font-bold">{engagement}%</p>
            <p className="text-xs text-muted-foreground">Engagement</p>
          </div>
          <div>
            <p className="text-xl font-bold">{clicks.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Clicks</p>
          </div>
          <div>
            <p className="text-xl font-bold">{posts}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface TopPostProps {
  image: string;
  caption: string;
  platform: 'facebook' | 'instagram' | 'linkedin';
  likes: number;
  comments: number;
  shares: number;
  date: string;
}

const TopPost = ({ image, caption, platform, likes, comments, shares, date }: TopPostProps) => {
  const config = platformConfig[platform];
  const Icon = config.icon;
  
  return (
    <div className="flex gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <img src={image} alt="" className="h-20 w-20 rounded-lg object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={cn("h-4 w-4", config.color)} />
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
        <p className="text-sm line-clamp-2">{caption}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" /> {likes}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> {comments}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="h-3 w-3" /> {shares}
          </span>
        </div>
      </div>
    </div>
  );
};

// Mock analytics data
const mockMetrics = {
  totalReach: 45600,
  reachChange: 12.5,
  totalEngagement: 3200,
  engagementChange: 8.3,
  totalClicks: 890,
  clicksChange: -2.1,
  totalPosts: 24,
  postsChange: 15.0,
};

const mockPlatformData: PlatformPerformanceProps[] = [
  { platform: 'facebook', reach: 22400, engagement: 4.2, clicks: 450, posts: 12 },
  { platform: 'instagram', reach: 18500, engagement: 6.8, clicks: 320, posts: 8 },
  { platform: 'linkedin', reach: 4700, engagement: 3.1, clicks: 120, posts: 4 },
];

const mockTopPosts: TopPostProps[] = [
  {
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
    caption: '🏠 Hot Deal Alert! 4BR/3BA beauty in Scottsdale with pool and mountain views...',
    platform: 'instagram',
    likes: 245,
    comments: 32,
    shares: 18,
    date: 'Dec 8, 2024',
  },
  {
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400',
    caption: '📍 New Investment Opportunity in Phoenix! Perfect starter home...',
    platform: 'facebook',
    likes: 189,
    comments: 24,
    shares: 45,
    date: 'Dec 6, 2024',
  },
  {
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    caption: 'Looking for your next investment? Check out this turn-key rental...',
    platform: 'linkedin',
    likes: 67,
    comments: 8,
    shares: 12,
    date: 'Dec 5, 2024',
  },
];

export function SocialAnalytics() {
  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Reach"
          value={mockMetrics.totalReach.toLocaleString()}
          change={mockMetrics.reachChange}
          icon={Eye}
        />
        <MetricCard
          title="Engagement"
          value={mockMetrics.totalEngagement.toLocaleString()}
          change={mockMetrics.engagementChange}
          icon={Heart}
        />
        <MetricCard
          title="Link Clicks"
          value={mockMetrics.totalClicks.toLocaleString()}
          change={mockMetrics.clicksChange}
          icon={MousePointer}
        />
        <MetricCard
          title="Posts This Month"
          value={mockMetrics.totalPosts.toString()}
          change={mockMetrics.postsChange}
          icon={BarChart3}
        />
      </div>

      {/* Platform Performance */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Platform Performance</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockPlatformData.map((data) => (
            <PlatformCard key={data.platform} {...data} />
          ))}
        </div>
      </div>

      {/* Top Performing Posts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Posts
            </CardTitle>
            <Badge variant="secondary">Last 30 days</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockTopPosts.map((post, index) => (
            <TopPost key={index} {...post} />
          ))}
        </CardContent>
      </Card>

      {/* Engagement Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Weekly Engagement Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-end justify-between gap-2 px-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const heights = [65, 45, 80, 55, 90, 40, 70];
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-md transition-all hover:opacity-80"
                    style={{ height: `${heights[i]}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{day}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
