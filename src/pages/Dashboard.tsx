import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Target,
  UserPlus,
  Calendar,
  Home,
  ArrowRight,
  RefreshCcw,
  Activity,
  TrendingUp,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatWidget } from '@/components/dashboard/StatWidget';
import { useDashboardData, useDashboardActivity } from '@/hooks/useDashboardData';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, quickActions, isLoading, isError, refetch } = useDashboardData();
  const { data: activityData, isLoading: activityLoading } = useDashboardActivity(5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
            Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time overview of your property management operations.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCcw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {isError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Connection Issue</p>
              <p className="text-sm text-muted-foreground">
                Some data couldn't be loaded. Check your GHL connection in Settings.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => navigate('/settings')}
            >
              Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Primary Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatWidget
          title="Total Properties"
          value={stats.totalProperties}
          icon={Building2}
          variant="purple"
          href="/properties"
          description={`${stats.newPropertiesThisWeek} new this week`}
          isLoading={isLoading}
        />
        <StatWidget
          title="Active Buyers"
          value={stats.totalBuyers}
          icon={Users}
          variant="info"
          href="/buyers"
          description={`${stats.newBuyersThisWeek} new this week`}
          isLoading={isLoading}
        />
        <StatWidget
          title="Property Matches"
          value={stats.totalMatches}
          icon={Target}
          variant="success"
          href="/matching"
          description={`${stats.highScoreMatches} high score`}
          isLoading={isLoading}
        />
        <StatWidget
          title="Open Pipeline"
          value={stats.openOpportunities}
          icon={TrendingUp}
          variant="warning"
          href="/acquisitions"
          description="Active opportunities"
          isLoading={isLoading}
        />
      </div>

      {/* Quick Actions & Activity Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Jump to items that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => {
                const IconMap: Record<string, typeof Building2> = {
                  Building2,
                  UserPlus,
                  Target,
                  Calendar,
                  Home,
                  Users,
                };
                const ActionIcon = IconMap[action.icon] || Building2;

                return (
                  <button
                    key={action.id}
                    onClick={() => navigate(action.href)}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-lg border transition-all duration-200',
                      'hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-purple-950/20',
                      'text-left group'
                    )}
                  >
                    <div
                      className={cn(
                        'p-2.5 rounded-lg',
                        action.variant === 'warning' && 'bg-amber-100 dark:bg-amber-900/30',
                        action.variant === 'success' && 'bg-emerald-100 dark:bg-emerald-900/30',
                        action.variant === 'primary' && 'bg-purple-100 dark:bg-purple-900/30',
                        action.variant === 'default' && 'bg-muted'
                      )}
                    >
                      <ActionIcon
                        className={cn(
                          'h-5 w-5',
                          action.variant === 'warning' && 'text-amber-600 dark:text-amber-400',
                          action.variant === 'success' && 'text-emerald-600 dark:text-emerald-400',
                          action.variant === 'primary' && 'text-purple-600 dark:text-purple-400',
                          action.variant === 'default' && 'text-muted-foreground'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{action.label}</span>
                        {action.count !== undefined && action.count > 0 && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs',
                              action.variant === 'warning' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                              action.variant === 'success' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                              action.variant === 'primary' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            )}
                          >
                            {action.count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">System Status</CardTitle>
              <div className={cn(
                'h-2 w-2 rounded-full',
                stats.isConnected ? 'bg-emerald-500' : 'bg-red-500'
              )} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">GHL Connection</span>
              <Badge variant={stats.isConnected ? 'default' : 'destructive'}>
                {stats.isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            {/* Last Sync */}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Last Sync</span>
              <span className="text-sm font-medium">
                {stats.lastSyncTime
                  ? formatDistanceToNow(new Date(stats.lastSyncTime), { addSuffix: true })
                  : 'Never'}
              </span>
            </div>

            {/* Sync Success Rate */}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Sync Success</span>
              <span
                className={cn(
                  'text-sm font-medium',
                  stats.syncSuccessRate >= 90
                    ? 'text-emerald-600'
                    : stats.syncSuccessRate >= 70
                    ? 'text-amber-600'
                    : 'text-red-600'
                )}
              >
                {stats.syncSuccessRate}%
              </span>
            </div>

            {/* Scheduled Posts */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Scheduled Posts</span>
              <span className="text-sm font-medium">{stats.scheduledPosts}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => navigate('/activity')}
            >
              <Activity className="h-4 w-4 mr-2" />
              View Activity Logs
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Recent Sync Activity</CardTitle>
            <CardDescription>Latest system synchronization events</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/activity')}>
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activityData && activityData.length > 0 ? (
            <div className="space-y-3">
              {activityData.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      activity.status === 'success'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : activity.status === 'failed'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-amber-100 dark:bg-amber-900/30'
                    )}
                  >
                    <Activity
                      className={cn(
                        'h-4 w-4',
                        activity.status === 'success'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : activity.status === 'failed'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{activity.type} Sync</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.recordsProcessed} records in {activity.duration}ms
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={activity.status === 'success' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {activity.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No sync activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Activity will appear here after your first data sync
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NavigationCard
          title="Properties"
          description="Manage listings and inventory"
          icon={Building2}
          href="/properties"
          stats={[
            { label: 'Total', value: stats.totalProperties },
            { label: 'Active', value: stats.activeProperties },
          ]}
        />
        <NavigationCard
          title="Buyers"
          description="Track buyer pipeline"
          icon={Users}
          href="/buyers"
          stats={[
            { label: 'Total', value: stats.totalBuyers },
            { label: 'New', value: stats.newBuyersThisWeek },
          ]}
        />
        <NavigationCard
          title="Matching"
          description="AI property matching"
          icon={Target}
          href="/matching"
          stats={[
            { label: 'Matches', value: stats.totalMatches },
            { label: 'High Score', value: stats.highScoreMatches },
          ]}
        />
        <NavigationCard
          title="Social Hub"
          description="Content & scheduling"
          icon={Calendar}
          href="/social"
          stats={[
            { label: 'Scheduled', value: stats.scheduledPosts },
            { label: 'Drafts', value: stats.draftPosts },
          ]}
        />
      </div>
    </div>
  );
}

// Navigation Card Component
interface NavigationCardProps {
  title: string;
  description: string;
  icon: typeof Building2;
  href: string;
  stats: Array<{ label: string; value: number }>;
}

function NavigationCard({ title, description, icon: Icon, href, stats }: NavigationCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:border-purple-500/50 hover:shadow-md group"
      onClick={() => navigate(href)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
        </div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-4">{description}</p>
        <div className="flex items-center gap-4">
          {stats.map((stat, idx) => (
            <div key={idx}>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
