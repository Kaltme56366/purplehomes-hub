import { useState } from 'react';
import { Search, Filter, Users, Building2, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Matching() {
  const [search, setSearch] = useState('');
  const [matchType, setMatchType] = useState('all');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Property Matching</h1>
          <p className="text-muted-foreground mt-1">
            Match properties with interested buyers
          </p>
        </div>
        <Button>
          <ArrowRight className="h-4 w-4 mr-2" />
          Run Auto-Match
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">45</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Buyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              <div className="text-2xl font-bold">127</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-500" />
              <div className="text-2xl font-bold">312</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search properties or buyers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={matchType} onValueChange={setMatchType}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Match type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Matches</SelectItem>
            <SelectItem value="high">High Confidence</SelectItem>
            <SelectItem value="medium">Medium Confidence</SelectItem>
            <SelectItem value="low">Low Confidence</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Matching Content */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Property Matching Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              This feature will automatically match properties with interested buyers based on their preferences, budget, and location.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

