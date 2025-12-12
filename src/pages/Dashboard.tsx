import { useNavigate } from 'react-router-dom';
import { Building2, Send, Clock, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { ActivityItem } from '@/components/activity/ActivityItem';
import { demoProperties, mockProperties, mockActivities, mockScheduledPosts } from '@/data/mockData';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const allProperties = [...demoProperties, ...mockProperties];

  // Calculate stats
  const pendingCount = allProperties.filter(p => p.status === 'pending').length;
  const postedTodayCount = allProperties.filter(p => {
    if (p.status !== 'posted' || !p.postedDate) return false;
    const postedDate = new Date(p.postedDate);
    const today = new Date();
    return postedDate.toDateString() === today.toDateString();
  }).length;
  const scheduledCount = allProperties.filter(p => p.status === 'scheduled').length;
  const totalCount = allProperties.length;

  const upcomingPosts = mockScheduledPosts.filter(p => p.status === 'scheduled').slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's an overview of your property portfolio.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Properties Pending"
          value={pendingCount}
          icon={Building2}
          variant="warning"
          onClick={() => navigate('/properties?status=pending')}
        />
        <StatCard
          title="Posted Today"
          value={postedTodayCount}
          icon={Send}
          variant="success"
        />
        <StatCard
          title="Scheduled"
          value={scheduledCount}
          icon={Clock}
          variant="info"
          onClick={() => navigate('/schedule')}
        />
        <StatCard
          title="Total Properties"
          value={totalCount}
          icon={Home}
          variant="muted"
          onClick={() => navigate('/properties')}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/activity')}>
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {mockActivities.slice(0, 5).map((activity) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity}
                onClick={activity.propertyId ? () => navigate(`/properties/${activity.propertyId}`) : undefined}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Scheduled Posts */}
      {upcomingPosts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Scheduled Posts</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/schedule')}>
              View Calendar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingPosts.map((post) => (
                <div 
                  key={post.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => post.propertyId && navigate(`/properties/${post.propertyId}`)}
                >
                  <img
                    src={post.image}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {post.property?.address || 'Value Post'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {post.caption.substring(0, 60)}...
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(post.scheduledDate), 'MMM d')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(post.scheduledDate), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
