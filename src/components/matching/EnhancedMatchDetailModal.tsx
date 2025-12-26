/**
 * EnhancedMatchDetailModal - Premium modal for viewing and managing buyer-property matches
 *
 * Features:
 * - Two-column layout on desktop (property left, management right)
 * - Tabbed interface on mobile
 * - Sticky header with key info
 * - Sticky footer with primary actions
 * - Smooth transitions and animations
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Bed,
  Bath,
  Square,
  User,
  MapPin,
  X,
  DollarSign,
  Target,
  Clock,
  Mail,
  Phone,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MatchScoreBadge } from '@/components/matching/MatchScoreBadge';
import { StageBadge } from './StageBadge';
import {
  ScoreBreakdown,
  MatchDetailsList,
  extractReasoningSummary,
} from '@/components/matching/MatchTags';
import { DealProgressKanban } from './DealProgressKanban';
import { MatchActivityTimeline } from './MatchActivityTimeline';
import { MatchQuickActions } from './MatchQuickActions';
import { WinProbability } from '@/components/deals/WinProbability';
import { AIInsightCard } from './AIInsightCard';
import {
  PropertyMatch,
  PropertyDetails,
  BuyerCriteria,
  MatchActivity,
} from '@/types/matching';
import { MatchDealStage } from '@/types/associations';
import type { Deal } from '@/types/deals';

export interface MatchWithDetails extends PropertyMatch {
  property?: PropertyDetails;
  buyer?: BuyerCriteria;
  activities?: MatchActivity[];
}

interface EnhancedMatchDetailModalProps {
  match: MatchWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageChange?: (matchId: string, newStage: MatchDealStage) => Promise<void>;
  onAddNote?: (matchId: string, note: string) => Promise<void>;
  onSendEmail?: (matchId: string) => Promise<void>;
}

export function EnhancedMatchDetailModal({
  match,
  open,
  onOpenChange,
  onStageChange,
  onAddNote,
  onSendEmail,
}: EnhancedMatchDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'property' | 'progress' | 'activity'>('property');
  const navigate = useNavigate();

  if (!match) return null;

  const { property, buyer, activities = [] } = match;
  const currentStage: MatchDealStage = match.status || 'Sent to Buyer';

  // Cross-navigation handlers
  const handleViewInPipeline = () => {
    onOpenChange(false);
    navigate(`/deals?dealId=${match.id}`);
  };

  const handleViewMatchDetails = () => {
    onOpenChange(false);
    navigate(`/matching?buyerId=${buyer?.contactId}`);
  };

  const handleStageChange = async (newStage: MatchDealStage) => {
    if (!onStageChange) return;
    setIsUpdating(true);
    try {
      await onStageChange(match.id, newStage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async (note: string) => {
    if (!onAddNote) return;
    await onAddNote(match.id, note);
  };

  const handleSendEmail = async () => {
    if (!onSendEmail) return;
    await onSendEmail(match.id);
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-[100dvh] sm:h-auto sm:max-w-5xl sm:max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col rounded-none sm:rounded-lg">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-background border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <DialogTitle className="text-xl font-bold truncate">
                  {property?.address || 'Property Details'}
                </DialogTitle>
                <MatchScoreBadge score={match.score} size="md" />
                <StageBadge stage={currentStage} size="md" />
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                {property?.price && (
                  <span className="font-semibold text-foreground">
                    {formatPrice(property.price)}
                  </span>
                )}
                {property?.beds && (
                  <span className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    {property.beds} bed
                  </span>
                )}
                {property?.baths && (
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {property.baths} bath
                  </span>
                )}
                {property?.sqft && (
                  <span className="flex items-center gap-1">
                    <Square className="h-4 w-4" />
                    {property.sqft.toLocaleString()} sqft
                  </span>
                )}
                {match.distance && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {match.distance.toFixed(1)} mi
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Main Content - Two Column on Desktop, Tabs on Mobile */}
        <div className="flex-1 overflow-hidden">
          {/* Desktop: Two Column Layout */}
          <div className="hidden lg:grid lg:grid-cols-2 h-full">
            {/* Left Column - Property Info */}
            <ScrollArea className="h-[calc(95vh-180px)] border-r">
              <div className="p-6 space-y-6">
                {/* Hero Image */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50">
                  {property?.heroImage ? (
                    <img
                      src={property.heroImage}
                      alt={property.address}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="h-16 w-16 text-purple-300" />
                    </div>
                  )}
                  {match.isPriority && (
                    <Badge className="absolute top-3 left-3 bg-purple-600">
                      <Target className="h-3 w-3 mr-1" />
                      Priority Match
                    </Badge>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {property?.city}
                    {property?.state && `, ${property.state}`}
                    {property?.zipCode && ` ${property.zipCode}`}
                  </span>
                </div>

                {/* Match Reasoning */}
                {(match.reasoning || match.highlights?.length || match.concerns?.length) && (
                  <div className="bg-muted/30 rounded-xl p-5 space-y-4">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-600" />
                      Why This Property Matches
                    </h3>

                    {match.reasoning && (
                      <p className="text-sm">
                        {extractReasoningSummary(match.reasoning)}
                      </p>
                    )}

                    <ScoreBreakdown reasoning={match.reasoning} />

                    <MatchDetailsList
                      highlights={match.highlights}
                      concerns={match.concerns}
                    />
                  </div>
                )}

                {/* AI Insight */}
                {buyer && property && match.score && (
                  <AIInsightCard
                    buyerName={`${buyer.firstName} ${buyer.lastName}`}
                    propertyAddress={property.address}
                    score={match.score}
                    highlights={match.highlights}
                    concerns={match.concerns}
                    distanceMiles={match.distance}
                    stage={currentStage}
                    price={property.price}
                    beds={property.beds}
                    baths={property.baths}
                  />
                )}

                {/* Property Notes */}
                {property?.notes && (
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold">Property Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {property.notes}
                    </p>
                  </div>
                )}

                {/* Property Code */}
                {property?.propertyCode && (
                  <div className="text-xs text-muted-foreground pt-4 border-t">
                    Property Code: {property.propertyCode}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Right Column - Management */}
            <ScrollArea className="h-[calc(95vh-180px)]">
              <div className="p-6 space-y-6">
                {/* Buyer Info */}
                {buyer && (
                  <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-600" />
                      Buyer Information
                    </h3>
                    <div className="space-y-2">
                      <p className="font-medium">
                        {buyer.firstName} {buyer.lastName}
                      </p>
                      {buyer.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {buyer.email}
                        </p>
                      )}
                      {buyer.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {buyer.phone}
                        </p>
                      )}
                      {buyer.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {buyer.location}
                        </p>
                      )}
                    </div>
                    {/* Buyer Preferences */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-200">
                      {buyer.desiredBeds && (
                        <Badge variant="secondary" className="text-xs">
                          <Bed className="h-3 w-3 mr-1" />
                          {buyer.desiredBeds} beds
                        </Badge>
                      )}
                      {buyer.desiredBaths && (
                        <Badge variant="secondary" className="text-xs">
                          <Bath className="h-3 w-3 mr-1" />
                          {buyer.desiredBaths} baths
                        </Badge>
                      )}
                      {buyer.downPayment && (
                        <Badge variant="secondary" className="text-xs">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {formatPrice(buyer.downPayment)} budget
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Deal Progress */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    Deal Progress
                  </h3>
                  <DealProgressKanban
                    currentStage={currentStage}
                    onStageChange={handleStageChange}
                    onNotInterested={() => handleStageChange('Not Interested')}
                    isUpdating={isUpdating}
                  />
                </div>

                {/* Win Probability */}
                {match.status && (
                  <div className="bg-muted/30 rounded-xl p-4">
                    <WinProbability
                      deal={match as unknown as Deal}
                      size="md"
                      showFactors={true}
                    />
                  </div>
                )}

                <Separator />

                {/* Activity Timeline */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    Activity History
                  </h3>
                  <MatchActivityTimeline
                    activities={activities}
                    maxVisible={10}
                    showDateGroups={true}
                  />
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Mobile: Tabbed Layout */}
          <div className="lg:hidden h-full flex flex-col">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="flex-1 flex flex-col"
            >
              <TabsList className="grid w-full grid-cols-3 mx-6 mt-2" style={{ width: 'calc(100% - 48px)' }}>
                <TabsTrigger value="property">Property</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 h-[calc(95vh-260px)]">
                <TabsContent value="property" className="p-6 space-y-6 mt-0">
                  {/* Hero Image */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50">
                    {property?.heroImage ? (
                      <img
                        src={property.heroImage}
                        alt={property.address}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="h-16 w-16 text-purple-300" />
                      </div>
                    )}
                  </div>

                  {/* Stats Grid */}
                  {property && (
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                        <Bed className="h-4 w-4 text-purple-600 mb-1" />
                        <span className="text-lg font-bold">{property.beds}</span>
                        <span className="text-xs text-muted-foreground">Beds</span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                        <Bath className="h-4 w-4 text-purple-600 mb-1" />
                        <span className="text-lg font-bold">{property.baths}</span>
                        <span className="text-xs text-muted-foreground">Baths</span>
                      </div>
                      {property.sqft && (
                        <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                          <Square className="h-4 w-4 text-purple-600 mb-1" />
                          <span className="text-lg font-bold">{(property.sqft / 1000).toFixed(1)}k</span>
                          <span className="text-xs text-muted-foreground">Sqft</span>
                        </div>
                      )}
                      {match.distance && (
                        <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                          <MapPin className="h-4 w-4 text-purple-600 mb-1" />
                          <span className="text-lg font-bold">{match.distance.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">Miles</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Match Reasoning */}
                  {match.reasoning && (
                    <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-semibold">Why This Matches</h3>
                      <ScoreBreakdown reasoning={match.reasoning} />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="progress" className="p-6 space-y-6 mt-0">
                  {/* Buyer Info */}
                  {buyer && (
                    <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                      <h3 className="text-sm font-semibold">Buyer</h3>
                      <p className="font-medium">
                        {buyer.firstName} {buyer.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{buyer.email}</p>
                    </div>
                  )}

                  {/* Deal Progress */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Deal Progress</h3>
                    <DealProgressKanban
                      currentStage={currentStage}
                      onStageChange={handleStageChange}
                      onNotInterested={() => handleStageChange('Not Interested')}
                      isUpdating={isUpdating}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="p-6 mt-0">
                  <MatchActivityTimeline
                    activities={activities}
                    maxVisible={20}
                    showDateGroups={true}
                  />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>

        {/* Sticky Footer - Quick Actions + Navigation */}
        <div className="sticky bottom-0 z-20 bg-background border-t px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <MatchQuickActions
              currentStage={currentStage}
              onAdvanceStage={handleStageChange}
              onSendEmail={onSendEmail ? handleSendEmail : undefined}
              onAddNote={onAddNote ? handleAddNote : undefined}
              onMarkNotInterested={() => handleStageChange('Not Interested')}
              isLoading={isUpdating}
              className="justify-center lg:justify-start"
            />

            {/* Cross-navigation links */}
            <div className="flex items-center gap-2 justify-center lg:justify-end">
              {match.status && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewInPipeline}
                  className="gap-1"
                >
                  View in Pipeline
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
              {buyer?.contactId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewMatchDetails}
                  className="gap-1 text-muted-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                  All Matches
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EnhancedMatchDetailModal;
