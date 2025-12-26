import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Share2, Eye, Facebook, Instagram, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';

type Platform = 'facebook' | 'instagram' | 'linkedin';

interface TopPost {
  id: string;
  image: string;
  caption: string;
  platform: Platform;
  property?: {
    propertyCode: string;
    address: string;
  };
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
  };
  postedDate: string;
}

interface AnalyticsTopPostsProps {
  posts: TopPost[];
  onPostClick?: (post: TopPost) => void;
}

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
};

const platformColors = {
  facebook: 'text-blue-500',
  instagram: 'text-pink-500',
  linkedin: 'text-blue-700',
};

export function AnalyticsTopPosts({ posts, onPostClick }: AnalyticsTopPostsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Performing Posts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {posts.map((post, index) => {
            const Icon = platformIcons[post.platform];
            const colorClass = platformColors[post.platform];
            const totalEngagement = post.metrics.likes + post.metrics.comments + post.metrics.shares;

            return (
              <div
                key={post.id}
                className="flex items-start gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onPostClick?.(post)}
              >
                {/* Rank Badge */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                  #{index + 1}
                </div>

                {/* Image */}
                <img
                  src={post.image}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn('h-4 w-4', colorClass)} />
                    {post.property && (
                      <span className="text-xs font-medium text-muted-foreground">
                        {post.property.propertyCode}
                      </span>
                    )}
                  </div>

                  <p className="text-sm line-clamp-2 mb-2">{post.caption}</p>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span>{post.metrics.likes.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      <span>{post.metrics.comments.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="h-3 w-3" />
                      <span>{post.metrics.shares.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{post.metrics.impressions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Total Engagement */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground mb-1">Engagement</p>
                  <Badge variant="secondary" className="font-bold">
                    {totalEngagement.toLocaleString()}
                  </Badge>
                </div>
              </div>
            );
          })}

          {posts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No posts to display for the selected period
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
