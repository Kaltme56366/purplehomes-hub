import { ReactNode, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface KanbanColumn<T> {
  id: string;
  label: string;
  color: string;
  items: T[];
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[];
  renderCard: (item: T) => ReactNode;
  onDragStart?: (e: React.DragEvent, item: T) => void;
  onDrop?: (e: React.DragEvent, columnId: string) => void;
  emptyMessage?: string;
  maxVisibleColumns?: number;
}

const ITEMS_PER_PAGE = 10;

export function KanbanBoard<T extends { id: string }>({
  columns,
  renderCard,
  onDragStart,
  onDrop,
  emptyMessage = 'Drop here',
  maxVisibleColumns = 5,
}: KanbanBoardProps<T>) {
  const [columnOffset, setColumnOffset] = useState(0);
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const visibleColumns = columns.slice(columnOffset, columnOffset + maxVisibleColumns);
  const canScrollLeft = columnOffset > 0;
  const canScrollRight = columnOffset + maxVisibleColumns < columns.length;

  const scrollLeft = () => setColumnOffset((prev) => Math.max(0, prev - 1));
  const scrollRight = () => setColumnOffset((prev) => Math.min(columns.length - maxVisibleColumns, prev + 1));

  return (
    <div className="relative">
      {/* Column Navigation */}
      {columns.length > maxVisibleColumns && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {columnOffset + 1}-{Math.min(columnOffset + maxVisibleColumns, columns.length)} of {columns.length} stages
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={scrollLeft}
              disabled={!canScrollLeft}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={scrollRight}
              disabled={!canScrollRight}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Kanban Columns */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))` }}>
        {visibleColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            renderCard={renderCard}
            onDragOver={handleDragOver}
            onDrop={(e) => onDrop?.(e, column.id)}
            onDragStart={onDragStart}
            emptyMessage={emptyMessage}
            isExpanded={expandedColumn === column.id}
            onToggleExpand={() => setExpandedColumn(expandedColumn === column.id ? null : column.id)}
          />
        ))}
      </div>

      {/* Stage indicator dots for mobile/narrow screens */}
      {columns.length > maxVisibleColumns && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {columns.map((column, index) => (
            <button
              key={column.id}
              onClick={() => setColumnOffset(Math.min(index, columns.length - maxVisibleColumns))}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index >= columnOffset && index < columnOffset + maxVisibleColumns
                  ? "bg-primary w-4"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              title={column.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface KanbanColumnProps<T> {
  column: KanbanColumn<T>;
  renderCard: (item: T) => ReactNode;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragStart?: (e: React.DragEvent, item: T) => void;
  emptyMessage: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function KanbanColumn<T extends { id: string }>({
  column,
  renderCard,
  onDragOver,
  onDrop,
  onDragStart,
  emptyMessage,
  isExpanded,
  onToggleExpand,
}: KanbanColumnProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(column.items.length / ITEMS_PER_PAGE);
  
  const visibleItems = isExpanded 
    ? column.items 
    : column.items.slice(0, currentPage * ITEMS_PER_PAGE);
  
  const hasMoreItems = column.items.length > currentPage * ITEMS_PER_PAGE && !isExpanded;

  return (
    <Card 
      className="bg-muted/20 border-border/50 flex flex-col h-fit max-h-[calc(100vh-280px)]"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CardHeader className="p-3 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full", column.color)} />
            <CardTitle className="text-sm font-medium truncate">{column.label}</CardTitle>
          </div>
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs font-medium",
              column.items.length > 0 && "bg-primary/10 text-primary"
            )}
          >
            {column.items.length}
          </Badge>
        </div>
      </CardHeader>
      
      <ScrollArea className="flex-1 min-h-0">
        <CardContent className="p-2 pt-0">
          <div className="space-y-2 min-h-[120px]">
            {visibleItems.length > 0 ? (
              <>
                {visibleItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => onDragStart?.(e, item)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    {renderCard(item)}
                  </div>
                ))}
                
                {/* Load more button */}
                {hasMoreItems && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Show {Math.min(ITEMS_PER_PAGE, column.items.length - visibleItems.length)} more
                  </Button>
                )}
                
                {/* Expand/Collapse for large lists */}
                {column.items.length > ITEMS_PER_PAGE && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                    onClick={onToggleExpand}
                  >
                    {isExpanded ? 'Collapse' : `View all ${column.items.length}`}
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
                {emptyMessage}
              </div>
            )}
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
