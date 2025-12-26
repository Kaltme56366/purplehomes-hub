import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Facebook, Instagram, Linkedin, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ScheduledPost {
  id: string;
  date: string;
  time: string;
  property?: { propertyCode: string; address: string };
  platforms: ('facebook' | 'instagram' | 'linkedin')[];
  caption: string;
  status: 'scheduled' | 'posted' | 'failed';
}

interface ScheduleDetailsPanelProps {
  selectedDate: Date | null;
  posts: ScheduledPost[];
  onEdit?: (post: ScheduledPost) => void;
  onDelete?: (post: ScheduledPost) => void;
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

export function ScheduleDetailsPanel({
  selectedDate,
  posts,
  onEdit,
  onDelete,
}: ScheduleDetailsPanelProps) {
  if (!selectedDate) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Select a date to view scheduled posts
          </p>
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {format(selectedDate, 'MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No posts scheduled for this date
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          {format(selectedDate, 'MMMM d, yyyy')}
          <Badge variant="secondary">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{post.time}</span>
                  <div className="flex items-center gap-1">
                    {post.platforms.map((platform) => {
                      const Icon = platformIcons[platform];
                      const colorClass = platformColors[platform];
                      return <Icon key={platform} className={`h-3 w-3 ${colorClass}`} />;
                    })}
                  </div>
                </div>
                {post.property && (
                  <p className="text-xs text-muted-foreground mb-1">
                    {post.property.propertyCode}
                  </p>
                )}
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {post.caption}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(post)}>
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(post)}
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
