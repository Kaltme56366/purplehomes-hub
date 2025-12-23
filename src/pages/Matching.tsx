import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Home, ChevronDown, ChevronLeft, RefreshCw, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { useRunMatching, useClearMatches } from '@/services/matchingApi';
import { BuyerPropertiesView } from '@/components/matching/BuyerPropertiesView';
import { PropertyBuyersView } from '@/components/matching/PropertyBuyersView';
import { MatchingSummary } from '@/components/matching/MatchingSummary';
import { useMatchingData } from '@/hooks/useCache';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Matching() {
  // Core tab and selection state
  const [activeTab, setActiveTab] = useState<'by-buyer' | 'by-property'>('by-buyer');
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [selectedPropertyCode, setSelectedPropertyCode] = useState<string | null>(null);

  // Cross-tab navigation helpers
  const handleSelectBuyer = (buyerId: string) => {
    setSelectedBuyerId(buyerId);
    setActiveTab('by-buyer');
  };

  const handleSelectProperty = (propertyCode: string) => {
    setSelectedPropertyCode(propertyCode);
    setActiveTab('by-property');
  };

  // Cache data hook (for header stats and sync functionality)
  const {
    isStale,
    newPropertiesAvailable,
    newBuyersAvailable,
    propertiesCount,
    buyersCount,
    matchesCount,
    lastSynced,
    syncAll,
    isSyncing,
  } = useMatchingData();

  // Matching mutation hooks
  const runMatchingMutation = useRunMatching();
  const clearMatchesMutation = useClearMatches();

  const handleRunMatchingAll = async () => {
    console.log('[Matching UI] handleRunMatchingAll called');
    try {
      const result = await runMatchingMutation.mutateAsync({ minScore: 30, refreshAll: false });
      console.log('[Matching UI] Result:', result);
      toast.success(result.message);
    } catch (error) {
      console.error('[Matching UI] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to run matching');
    }
  };

  const handleClearMatches = async () => {
    if (!confirm('Are you sure you want to delete ALL matches? This will remove all records from the Property-Buyer Matches table. You will need to run matching again to recreate them.')) {
      return;
    }
    console.log('[Matching UI] handleClearMatches called');
    try {
      toast.info('Clearing all matches...');
      const result = await clearMatchesMutation.mutateAsync();
      toast.success(result.message || `Deleted ${result.deletedCount} matches`);
    } catch (error) {
      console.error('[Matching UI] Clear error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to clear matches');
    }
  };

  // Helper for formatting last synced time
  const formatLastSynced = (date: string | null | undefined) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  const isMatching = runMatchingMutation.isPending;
  const isClearing = clearMatchesMutation.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between px-6 py-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">AI Property Matching</h1>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
              {matchesCount} {matchesCount === 1 ? 'Match' : 'Matches'}
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
              {buyersCount} {buyersCount === 1 ? 'Buyer' : 'Buyers'}
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
              {propertiesCount} {propertiesCount === 1 ? 'Property' : 'Properties'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {isStale ? (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-amber-600">Cache outdated</span>
                {(newPropertiesAvailable > 0 || newBuyersAvailable > 0) && (
                  <span>
                    • {newPropertiesAvailable > 0 && `${newPropertiesAvailable} new properties`}
                    {newPropertiesAvailable > 0 && newBuyersAvailable > 0 && ', '}
                    {newBuyersAvailable > 0 && `${newBuyersAvailable} new buyers`}
                  </span>
                )}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Cache current</span>
              </>
            )}
            <span>• Last synced: {formatLastSynced(lastSynced)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isStale ? 'default' : 'outline'}
            size="sm"
            onClick={() => syncAll()}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isMatching}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isMatching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Matching...
                  </>
                ) : (
                  <>
                    Run Matching
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRunMatchingAll}>
                Run Matching (All Buyers + Properties)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleClearMatches}
                disabled={isClearing}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isClearing ? 'Clearing...' : 'Clear All Matches'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'by-buyer' | 'by-property')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="by-buyer" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              By Buyer
            </TabsTrigger>
            <TabsTrigger value="by-property" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              By Property
            </TabsTrigger>
          </TabsList>

          {/* By Buyer Tab */}
          <TabsContent value="by-buyer" className="mt-6">
            {!selectedBuyerId ? (
              <div className="space-y-6">
                <MatchingSummary
                  onSelectBuyer={handleSelectBuyer}
                  onViewProperty={handleSelectProperty}
                />
                
                {/* Manual Selection Section */}
                <div className="border-t pt-6">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Or select a buyer manually:
                  </p>
                  <BuyerPropertiesView
                    selectedBuyerId={selectedBuyerId}
                    onBuyerSelect={setSelectedBuyerId}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBuyerId(null)}
                  className="mb-2"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Summary
                </Button>
                <BuyerPropertiesView
                  selectedBuyerId={selectedBuyerId}
                  onBuyerSelect={setSelectedBuyerId}
                />
              </div>
            )}
          </TabsContent>

          {/* By Property Tab */}
          <TabsContent value="by-property" className="mt-6">
            <PropertyBuyersView
              selectedPropertyCode={selectedPropertyCode}
              onPropertySelect={setSelectedPropertyCode}
            />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
