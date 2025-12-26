import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Home,
  Sparkles,
  DollarSign,
  Calendar,
  TrendingDown,
  CheckCircle,
  Clock,
  Heart,
  Search,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  postTemplates,
  type PostTemplate,
  type TemplateCategory,
} from './postTemplates';

interface PostTemplateSelectorProps {
  selectedTemplate: PostTemplate | null;
  onSelectTemplate: (template: PostTemplate) => void;
  platform?: 'facebook' | 'instagram' | 'linkedin';
}

const categoryConfig: Record<
  TemplateCategory,
  { icon: React.ElementType; label: string; color: string }
> = {
  listing: { icon: Home, label: 'Listing', color: 'text-blue-500' },
  'just-listed': { icon: Sparkles, label: 'Just Listed', color: 'text-purple-500' },
  'open-house': { icon: Calendar, label: 'Open House', color: 'text-pink-500' },
  'price-drop': { icon: TrendingDown, label: 'Price Drop', color: 'text-red-500' },
  sold: { icon: CheckCircle, label: 'Sold', color: 'text-green-500' },
  'coming-soon': { icon: Clock, label: 'Coming Soon', color: 'text-cyan-500' },
  investment: { icon: DollarSign, label: 'Investment', color: 'text-emerald-500' },
  lifestyle: { icon: Heart, label: 'Lifestyle', color: 'text-rose-500' },
};

export function PostTemplateSelector({
  selectedTemplate,
  onSelectTemplate,
  platform,
}: PostTemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter templates based on category, platform, and search
  const filteredTemplates = postTemplates.filter((template) => {
    // Category filter
    if (activeCategory !== 'all' && template.category !== activeCategory) {
      return false;
    }

    // Platform filter
    if (platform && !template.platforms.includes(platform)) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const categories: (TemplateCategory | 'all')[] = [
    'all',
    'just-listed',
    'open-house',
    'price-drop',
    'sold',
    'coming-soon',
    'investment',
    'lifestyle',
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
            2
          </span>
          Choose Template
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Tabs */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {categories.map((category) => {
              const isAll = category === 'all';
              const config = isAll ? null : categoryConfig[category];
              const Icon = config?.icon;
              const isActive = activeCategory === category;

              return (
                <Button
                  key={category}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    'flex-shrink-0',
                    isActive && 'shadow-sm'
                  )}
                >
                  {Icon && <Icon className={cn('h-4 w-4 mr-1', !isActive && config?.color)} />}
                  {isAll ? 'All' : config?.label}
                </Button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Template Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredTemplates.map((template) => {
            const config = categoryConfig[template.category];
            const isSelected = selectedTemplate?.id === template.id;

            return (
              <div
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className={cn(
                  'relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-transparent bg-muted/30 hover:border-primary/30'
                )}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}

                {/* Thumbnail */}
                <div
                  className="h-20 rounded-md mb-2"
                  style={{ background: template.thumbnail }}
                />

                {/* Template Name */}
                <p className="font-medium text-sm truncate">{template.name}</p>

                {/* Category Badge */}
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    <config.icon className={cn('h-3 w-3 mr-1', config.color)} />
                    {config.label}
                  </Badge>
                </div>

                {/* Platform badges */}
                <div className="flex gap-1 mt-2">
                  {template.platforms.map((p) => (
                    <span
                      key={p}
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        p === 'facebook' && 'bg-blue-500/10 text-blue-500',
                        p === 'instagram' && 'bg-pink-500/10 text-pink-500',
                        p === 'linkedin' && 'bg-blue-700/10 text-blue-700'
                      )}
                    >
                      {p.charAt(0).toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No templates found matching your criteria
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
