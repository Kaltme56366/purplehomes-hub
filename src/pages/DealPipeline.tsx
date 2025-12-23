/**
 * DealPipeline - Main page for deal management
 *
 * Navigation:
 * - Overview (default): Stats, needs attention, upcoming showings
 * - All Deals: List view, By Buyer, By Property
 * - Pipeline Board: Kanban with drag-drop
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard,
  List,
  Columns,
  Search,
  Users,
  Home,
} from 'lucide-react';

// Deal components
import {
  PipelineOverview,
  DealsListView,
  DealsByBuyerView,
  DealsByPropertyView,
  PipelineBoard,
  DealDetailModal,
} from '@/components/deals';

// Types
import type { Deal } from '@/types/deals';

type MainView = 'overview' | 'deals' | 'pipeline';
type DealsSubView = 'list' | 'by-buyer' | 'by-property';

export default function DealPipeline() {
  // Navigation state
  const [mainView, setMainView] = useState<MainView>('overview');
  const [dealsSubView, setDealsSubView] = useState<DealsSubView>('list');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Selected deal for modal
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleViewDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setDetailModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setDetailModalOpen(open);
    if (!open) {
      // Clear selected deal after modal close animation
      setTimeout(() => setSelectedDeal(null), 200);
    }
  };

  // Handle viewing stale deals from overview
  const handleViewStaleDeals = () => {
    setMainView('deals');
    setDealsSubView('list');
    // Could add a filter for stale deals here
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deal Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Manage your buyer-property deals through the sales funnel
          </p>
        </div>

        {/* Search - visible on deals and pipeline tabs */}
        {mainView !== 'overview' && (
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <Tabs
        value={mainView}
        onValueChange={(v) => setMainView(v as MainView)}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="deals" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">All Deals</span>
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            <Columns className="h-4 w-4" />
            <span className="hidden sm:inline">Pipeline Board</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <PipelineOverview
            onViewDeal={handleViewDeal}
            onViewStaleDeals={handleViewStaleDeals}
          />
        </TabsContent>

        {/* All Deals Tab */}
        <TabsContent value="deals" className="mt-6 space-y-4">
          {/* Sub-navigation for deals view */}
          <Tabs
            value={dealsSubView}
            onValueChange={(v) => setDealsSubView(v as DealsSubView)}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">View:</span>
              <TabsList className="h-9">
                <TabsTrigger value="list" className="text-xs px-3">
                  <List className="h-3 w-3 mr-1" />
                  List
                </TabsTrigger>
                <TabsTrigger value="by-buyer" className="text-xs px-3">
                  <Users className="h-3 w-3 mr-1" />
                  By Buyer
                </TabsTrigger>
                <TabsTrigger value="by-property" className="text-xs px-3">
                  <Home className="h-3 w-3 mr-1" />
                  By Property
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="mt-4">
              <DealsListView
                search={searchQuery}
                onSearchChange={setSearchQuery}
                onViewDeal={handleViewDeal}
              />
            </TabsContent>

            <TabsContent value="by-buyer" className="mt-4">
              <DealsByBuyerView
                search={searchQuery}
                onViewDeal={handleViewDeal}
              />
            </TabsContent>

            <TabsContent value="by-property" className="mt-4">
              <DealsByPropertyView
                search={searchQuery}
                onViewDeal={handleViewDeal}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Pipeline Board Tab */}
        <TabsContent value="pipeline" className="mt-6">
          <PipelineBoard search={searchQuery} onViewDeal={handleViewDeal} />
        </TabsContent>
      </Tabs>

      {/* Deal Detail Modal */}
      <DealDetailModal
        deal={selectedDeal}
        open={detailModalOpen}
        onOpenChange={handleCloseModal}
      />
    </div>
  );
}
