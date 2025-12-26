import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type FilterType = 'all' | 'pending' | 'ready' | 'needs-caption';

interface BatchToolbarProps {
  totalCount: number;
  selectedCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function BatchToolbar({
  totalCount,
  selectedCount,
  allSelected,
  onSelectAll,
  onDeselectAll,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: BatchToolbarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Select All Checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => {
            if (checked) {
              onSelectAll();
            } else {
              onDeselectAll();
            }
          }}
          id="select-all"
        />
        <label
          htmlFor="select-all"
          className="text-sm font-medium cursor-pointer"
        >
          All
        </label>
      </div>

      {/* Filter Dropdown */}
      <Select value={filter} onValueChange={(value) => onFilterChange(value as FilterType)}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Properties</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="ready">Ready to Post</SelectItem>
          <SelectItem value="needs-caption">Needs Caption</SelectItem>
        </SelectContent>
      </Select>

      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by code or address..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Selection Count Badge */}
      {selectedCount > 0 && (
        <Badge variant="secondary" className="ml-auto">
          {selectedCount} selected
        </Badge>
      )}
    </div>
  );
}
