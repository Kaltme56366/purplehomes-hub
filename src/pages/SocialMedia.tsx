import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Upload, Sparkles, Image as ImageIcon, Send, Clock, X, Facebook, Instagram, Linkedin, 
  Copy, Check, Wifi, WifiOff, AlertCircle, Loader2, Rocket, Calendar, SkipForward,
  ChevronLeft, ChevronRight, Layers, ArrowLeft, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mockSocialAccounts, mockScheduledPosts } from '@/data/mockData.backup';
import { toast } from 'sonner';
import { useSocialAccounts, useCreateSocialPost, getApiConfig, useScheduledPosts } from '@/services/ghlApi';
import { useAirtableProperties } from '@/services/matchingApi';
import { useAppStore } from '@/store/useAppStore';
import { SocialAccountSelector } from '@/components/social/SocialAccountSelector';
import { SocialAnalytics } from '@/components/social/SocialAnalytics';
import { BatchToolbar } from '@/components/social/BatchToolbar';
import { BatchActionBar } from '@/components/social/BatchActionBar';
import { BatchPropertyRow } from '@/components/social/BatchPropertyRow';
import { BatchSummaryFooter } from '@/components/social/BatchSummaryFooter';
import { BatchProgressOverlay } from '@/components/social/BatchProgressOverlay';
import { ScheduleViewToggle } from '@/components/social/ScheduleViewToggle';
import { ScheduleQuickStats } from '@/components/social/ScheduleQuickStats';
import { ScheduleDetailsPanel } from '@/components/social/ScheduleDetailsPanel';
import { CreateWizard } from '@/components/social/create-wizard';
import { cn } from '@/lib/utils';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay,
  addMonths, subMonths, startOfWeek, endOfWeek, isToday
} from 'date-fns';
import type { Property } from '@/types';

type Platform = 'facebook' | 'instagram' | 'linkedin';
type MainTab = 'create' | 'batch' | 'schedule' | 'analytics';
type OperationStatus = 'idle' | 'running' | 'complete';
type PropertyOpStatus = 'pending' | 'processing' | 'complete' | 'failed';

interface PlatformCaptions {
  facebook: string;
  instagram: string;
  linkedin: string;
}

const platformConfig = {
  facebook: { 
    icon: Facebook, 
    label: 'Facebook', 
    color: 'text-blue-500',
    maxLength: 63206,
    tips: 'Best with 40-80 characters for engagement. Use emojis and questions.'
  },
  instagram: { 
    icon: Instagram, 
    label: 'Instagram', 
    color: 'text-pink-500',
    maxLength: 2200,
    tips: 'Use up to 30 hashtags. First line is most important.'
  },
  linkedin: { 
    icon: Linkedin, 
    label: 'LinkedIn', 
    color: 'text-blue-700',
    maxLength: 3000,
    tips: 'Professional tone. Use line breaks for readability.'
  },
};

export default function SocialMedia() {
  const navigate = useNavigate();
  const location = useLocation();
  const { connectionStatus } = useAppStore();
  
  // Determine initial tab based on URL hash or query
  const getInitialTab = (): MainTab => {
    const hash = location.hash.replace('#', '');
    if (hash === 'batch' || hash === 'schedule' || hash === 'analytics') return hash;
    return 'create';
  };
  
  const [mainTab, setMainTab] = useState<MainTab>(getInitialTab());
  const [image, setImage] = useState<string | null>(null);
  const [captions, setCaptions] = useState<PlatformCaptions>({
    facebook: '',
    instagram: '',
    linkedin: '',
  });
  const [activeTab, setActiveTab] = useState<Platform>('facebook');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['facebook', 'instagram']);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [postType, setPostType] = useState<'now' | 'schedule'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [copiedFrom, setCopiedFrom] = useState<Platform | null>(null);

  // Batch state
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [operationStatus, setOperationStatus] = useState<OperationStatus>('idle');
  const [propertyStatuses, setPropertyStatuses] = useState<Record<string, PropertyOpStatus>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<'post' | 'schedule' | 'skip' | 'captions' | null>(null);
  const [batchScheduleDate, setBatchScheduleDate] = useState('');
  const [batchScheduleTime, setBatchScheduleTime] = useState('');
  const [batchScheduleInterval, setBatchScheduleInterval] = useState('2');
  const [batchCaptionStyle, setBatchCaptionStyle] = useState<CaptionStyle>('professional');
  const [batchFilter, setBatchFilter] = useState<'all' | 'pending' | 'ready' | 'needs-caption'>('all');
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [batchOperationLog, setBatchOperationLog] = useState<Array<{ property: Property; status: 'complete' | 'failed'; message?: string }>>([]);
  const [currentBatchProperty, setCurrentBatchProperty] = useState<Property | undefined>();

  // Schedule state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleView, setScheduleView] = useState<'month' | 'list'>('month');
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date | null>(null);

  // Property selection for captions
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null);

  // Caption mode state
  const [captionMode, setCaptionMode] = useState<'visual' | 'caption' | 'manual'>('visual'); // visual = image overlay, caption = text templates, manual = write your own

  // Check GHL connection
  const ghlConfig = getApiConfig();
  const isGhlConnected = connectionStatus.highLevel && ghlConfig.apiKey;

  // GHL API hooks
  const { data: socialAccountsData, isLoading: isLoadingAccounts } = useSocialAccounts();
  const { data: scheduledPostsData, isLoading: isLoadingScheduled } = useScheduledPosts();
  const createPost = useCreateSocialPost();

  // Airtable properties hook
  const { data: airtableData, isLoading: isLoadingProperties } = useAirtableProperties(200);

  // Get accounts from GHL or fallback to mock
  const ghlAccounts = socialAccountsData?.accounts || [];
  const accounts = isGhlConnected && ghlAccounts.length > 0
    ? ghlAccounts.map(a => ({
        id: a.id,
        platform: a.platform as Platform,
        accountName: a.accountName,
        profilePicture: a.avatar,
        connected: a.isActive,
      }))
    : mockSocialAccounts;

  const connectedAccounts = accounts.filter(a => a.connected);

  // Get properties from Airtable - transform to Property type
  const allProperties: Property[] = useMemo(() => {
    if (isLoadingProperties || !airtableData?.properties) return [];

    return airtableData.properties.map(p => ({
      id: p.recordId || p.opportunityId || '',
      ghlOpportunityId: p.opportunityId,
      propertyCode: p.propertyCode || 'N/A',
      address: p.address || '',
      city: p.city || '',
      price: p.price || 0,
      beds: p.beds || 0,
      baths: p.baths || 0,
      sqft: p.sqft,
      condition: p.condition,
      propertyType: p.propertyType,
      description: p.notes,
      heroImage: p.heroImage || '/placeholder.svg',
      images: p.images || [p.heroImage || '/placeholder.svg'],
      status: 'pending' as const, // Default to pending for social posting
      caption: '', // Captions managed per-post
      downPayment: p.downPayment,
      monthlyPayment: p.monthlyPayment,
      lat: p.propertyLat,
      lng: p.propertyLng,
      createdAt: p.createdAt || new Date().toISOString(),
      isDemo: false,
    }));
  }, [airtableData, isLoadingProperties]);

  const pendingProperties = allProperties.filter(p => p.status === 'pending');

  // Filtered and searched batch properties
  const filteredBatchProperties = useMemo(() => {
    let filtered = pendingProperties;

    // Apply filter
    if (batchFilter !== 'all') {
      filtered = filtered.filter(p => {
        if (batchFilter === 'pending') return p.status === 'pending';
        if (batchFilter === 'ready') return p.heroImage && p.caption;
        if (batchFilter === 'needs-caption') return !p.caption;
        return true;
      });
    }

    // Apply search
    if (batchSearchQuery) {
      const query = batchSearchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.propertyCode.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [pendingProperties, batchFilter, batchSearchQuery]);

  // Compute readiness for each property
  const getPropertyReadiness = (property: Property): 'ready' | 'needs-caption' | 'needs-image' | 'demo' => {
    if (property.isDemo) return 'demo';
    if (!property.heroImage) return 'needs-image';
    if (!property.caption) return 'needs-caption';
    return 'ready';
  };

  // Count ready/needs caption
  const readyPropertiesCount = Array.from(selectedPropertyIds)
    .map(id => allProperties.find(p => p.id === id))
    .filter(p => p && getPropertyReadiness(p) === 'ready').length;

  const needsCaptionCount = Array.from(selectedPropertyIds)
    .map(id => allProperties.find(p => p.id === id))
    .filter(p => p && getPropertyReadiness(p) === 'needs-caption').length;

  // Auto-select first account per platform when accounts load
  useEffect(() => {
    if (accounts.length > 0 && selectedAccountIds.length === 0) {
      const defaultIds = selectedPlatforms
        .map(p => accounts.find(a => a.platform === p && a.connected)?.id)
        .filter(Boolean) as string[];
      setSelectedAccountIds(defaultIds);
    }
  }, [accounts, selectedPlatforms]);

  // Update URL when tab changes
  useEffect(() => {
    const newHash = mainTab === 'create' ? '' : `#${mainTab}`;
    if (location.hash !== newHash) {
      navigate(`/social${newHash}`, { replace: true });
    }
  }, [mainTab]);

  // ============ CREATE TAB HANDLERS ============
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => setImage(null);

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const updateCaption = (platform: Platform, value: string) => {
    setCaptions(prev => ({ ...prev, [platform]: value }));
  };

  const copyToAllPlatforms = (sourcePlatform: Platform) => {
    const sourceCaption = captions[sourcePlatform];
    setCaptions({ facebook: sourceCaption, instagram: sourceCaption, linkedin: sourceCaption });
    setCopiedFrom(sourcePlatform);
    setTimeout(() => setCopiedFrom(null), 2000);
    toast.success('Caption copied to all platforms');
  };

  const handlePost = async () => {
    const hasCaption = selectedPlatforms.some(p => captions[p].trim());
    if (!hasCaption) return toast.error('Please add at least one caption');
    if (selectedPlatforms.length === 0) return toast.error('Please select at least one platform');
    if (selectedAccountIds.length === 0) return toast.error('Please select at least one account');
    if (postType === 'schedule' && (!scheduledDate || !scheduledTime)) {
      return toast.error('Please select a date and time');
    }

    setIsPosting(true);
    try {
      if (isGhlConnected) {
        const scheduleDateTime = postType === 'schedule' 
          ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : undefined;

        await createPost.mutateAsync({
          accountIds: selectedAccountIds,
          summary: captions[activeTab] || captions.facebook || captions.instagram || captions.linkedin,
          media: image ? [{ url: image, type: 'image/jpeg' }] : undefined,
          scheduleDate: scheduleDateTime,
          status: postType === 'schedule' ? 'scheduled' : 'published',
          type: 'post',
        });

        toast.success(postType === 'now' ? 'Posted via HighLevel!' : 'Scheduled via HighLevel!');
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success(`Demo: Post ${postType === 'now' ? 'created' : 'scheduled'}!`);
      }

      setCaptions({ facebook: '', instagram: '', linkedin: '' });
      setImage(null);
      setScheduledDate('');
      setScheduledTime('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleClear = () => {
    setCaptions({ facebook: '', instagram: '', linkedin: '' });
    setImage(null);
    setScheduledDate('');
    setScheduledTime('');
    setSelectedProperty(null);
  };

  const handleGenerateCaption = async (platform: Platform, style: CaptionStyle) => {
    if (!selectedProperty) {
      toast.error('Please select a property first');
      return;
    }

    try {
      const response = await fetch('/api/ghl?resource=ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: selectedProperty,
          platform,
          style,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate caption');

      const data = await response.json();
      if (data.caption) {
        updateCaption(platform, data.caption);
        toast.success(`${platformConfig[platform].label} caption generated!`);
      }
    } catch (error) {
      // Fallback to demo caption
      const demoCaption = `✨ ${selectedProperty.propertyCode} | ${selectedProperty.address}\n\n🏡 ${selectedProperty.beds} bed, ${selectedProperty.baths} bath\n💰 $${selectedProperty.price.toLocaleString()}\n\nInterested? Contact us today!`;
      updateCaption(platform, demoCaption);
      toast.success(`Demo caption generated for ${platformConfig[platform].label}`);
    }
  };

  // ============ BATCH TAB HANDLERS ============
  const handleSelectAllProperties = () => {
    const nonDemoIds = pendingProperties.filter(p => !p.isDemo).map(p => p.id);
    setSelectedPropertyIds(new Set(nonDemoIds));
  };

  const handleClearPropertySelection = () => setSelectedPropertyIds(new Set());

  const togglePropertySelection = (id: string) => {
    const property = allProperties.find(p => p.id === id);
    if (property?.isDemo) return toast.error('Cannot select demo properties');
    
    const newSelected = new Set(selectedPropertyIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedPropertyIds(newSelected);
  };

  const startBatchOperation = (operation: 'post' | 'schedule' | 'skip' | 'captions') => {
    if (selectedPropertyIds.size === 0) return toast.error('Please select properties first');
    setCurrentOperation(operation);
    setShowConfirmDialog(true);
  };

  const executeBatchOperation = async () => {
    setShowConfirmDialog(false);
    setOperationStatus('running');
    
    const ids = Array.from(selectedPropertyIds);
    let completed = 0, failed = 0;

    for (const id of ids) {
      setPropertyStatuses(prev => ({ ...prev, [id]: 'processing' }));
      
      try {
        if (currentOperation === 'captions') {
          // Generate AI captions for each property
          const property = allProperties.find(p => p.id === id);
          if (property) {
            const response = await fetch('/api/ghl?resource=ai-caption', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                property,
                platform: 'facebook',
                style: batchCaptionStyle,
              }),
            });
            if (!response.ok) throw new Error('Caption generation failed');
          }
        } else {
          // Simulate other operations
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        
        setPropertyStatuses(prev => ({ ...prev, [id]: 'complete' }));
        completed++;
      } catch {
        setPropertyStatuses(prev => ({ ...prev, [id]: 'failed' }));
        failed++;
      }
    }

    setOperationStatus('complete');
    toast.success(`Operation complete: ${completed} successful, ${failed} failed`);
  };

  const resetBatchOperation = () => {
    setOperationStatus('idle');
    setPropertyStatuses({});
    setSelectedPropertyIds(new Set());
    setCurrentOperation(null);
  };

  const batchCompletedCount = Object.values(propertyStatuses).filter(s => s === 'complete').length;
  const batchFailedCount = Object.values(propertyStatuses).filter(s => s === 'failed').length;
  const batchProgress = selectedPropertyIds.size > 0 
    ? ((batchCompletedCount + batchFailedCount) / selectedPropertyIds.size) * 100 : 0;

  // ============ SCHEDULE TAB HANDLERS ============
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Combine GHL scheduled posts with mock data as fallback
  const scheduledPosts = useMemo(() => {
    const ghlPosts = scheduledPostsData?.posts || [];
    if (ghlPosts.length > 0) {
      // Transform GHL posts to match our format
      return ghlPosts.map(post => ({
        id: post.id,
        scheduledDate: post.scheduleDate || post.createdAt,
        caption: post.summary,
        image: post.media?.[0]?.url || '/placeholder.svg',
        platforms: post.accountIds, // Note: would need to map account IDs to platforms
        status: post.status,
        property: null, // GHL posts don't have property linkage by default
        propertyId: null,
      }));
    }
    // Fallback to mock data
    return mockScheduledPosts;
  }, [scheduledPostsData]);

  const getPostsForDay = (day: Date) => {
    return scheduledPosts.filter(post => isSameDay(new Date(post.scheduledDate), day));
  };

  // Transform posts for ScheduleDetailsPanel
  const getFormattedPostsForDate = (date: Date | null) => {
    if (!date) return [];
    const posts = getPostsForDay(date);
    return posts.map(post => ({
      id: post.id,
      date: format(new Date(post.scheduledDate), 'yyyy-MM-dd'),
      time: format(new Date(post.scheduledDate), 'h:mm a'),
      property: post.property ? {
        propertyCode: post.property.code || 'N/A',
        address: post.property.address
      } : undefined,
      platforms: post.platforms as ('facebook' | 'instagram' | 'linkedin')[],
      caption: post.caption || '',
      status: post.status as 'scheduled' | 'posted' | 'failed'
    }));
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleTodayClick = () => setCurrentDate(new Date());

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Compute post validity for Create tab
  const hasValidCaption = Object.values(captions).some(c => c.trim().length > 0);
  const hasValidSchedule = postType === 'now' || (scheduledDate && scheduledTime);
  const isPostValid = hasValidCaption && selectedAccountIds.length > 0 && hasValidSchedule;

  // Compute actual display image (uploaded or from property)
  const displayImage = image || selectedProperty?.heroImage || null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Connection Banner */}
      {!isGhlConnected && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">Demo Mode</p>
            <p className="text-xs text-muted-foreground">
              Configure GHL API in Settings to post via HighLevel Social Planner
            </p>
          </div>
        </div>
      )}

      {/* Header with Tab Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Social Hub
            {isGhlConnected ? (
              <Badge className="bg-success flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" />
                Demo
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Create posts, batch operations & schedule
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="create" className="gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Create</span>
          </TabsTrigger>
          <TabsTrigger value="batch" className="gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Batch</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* CREATE TAB - New Step-by-Step Wizard */}
        <TabsContent value="create" className="mt-6">
          <CreateWizard />
        </TabsContent>

        {/* BATCH TAB */}
        <TabsContent value="batch" className="mt-6">
          <div className="space-y-6 pb-24">
            {/* Toolbar */}
            <BatchToolbar
              totalCount={pendingProperties.length}
              selectedCount={selectedPropertyIds.size}
              allSelected={selectedPropertyIds.size === filteredBatchProperties.filter(p => !p.isDemo).length && filteredBatchProperties.length > 0}
              onSelectAll={handleSelectAllProperties}
              onDeselectAll={handleClearPropertySelection}
              filter={batchFilter}
              onFilterChange={setBatchFilter}
              searchQuery={batchSearchQuery}
              onSearchChange={setBatchSearchQuery}
            />

            {/* Contextual Action Bar */}
            <BatchActionBar
              selectedCount={selectedPropertyIds.size}
              onPostAll={() => startBatchOperation('post')}
              onSchedule={() => startBatchOperation('schedule')}
              onGenerateCaptions={() => startBatchOperation('captions')}
              onSkip={() => startBatchOperation('skip')}
              isProcessing={operationStatus === 'running'}
            />

            {/* Property List */}
            <div className="space-y-3">
              {filteredBatchProperties.map((property) => (
                <BatchPropertyRow
                  key={property.id}
                  property={property}
                  isSelected={selectedPropertyIds.has(property.id)}
                  onToggle={() => togglePropertySelection(property.id)}
                  status={propertyStatuses[property.id] || null}
                  readiness={getPropertyReadiness(property)}
                  disabled={operationStatus === 'running'}
                />
              ))}

              {filteredBatchProperties.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No properties found</p>
                  {batchSearchQuery && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setBatchSearchQuery('')}
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Summary Footer */}
          <BatchSummaryFooter
            selectedProperties={Array.from(selectedPropertyIds)
              .map(id => allProperties.find(p => p.id === id))
              .filter((p): p is Property => p !== undefined)}
            selectedAccounts={connectedAccounts.filter(a =>
              selectedAccountIds.includes(a.id)
            )}
            readyCount={readyPropertiesCount}
            needsCaptionCount={needsCaptionCount}
            onPost={() => startBatchOperation('post')}
            isPosting={operationStatus === 'running'}
          />

          {/* Progress Overlay */}
          <BatchProgressOverlay
            isOpen={operationStatus === 'running' || operationStatus === 'complete'}
            totalCount={selectedPropertyIds.size}
            completedCount={batchCompletedCount}
            failedCount={batchFailedCount}
            currentProperty={currentBatchProperty}
            log={batchOperationLog}
            onComplete={resetBatchOperation}
            canCancel={false}
          />
        </TabsContent>

        {/* SCHEDULE TAB */}
        <TabsContent value="schedule" className="mt-6">
          <div className="space-y-6">
            {/* Header with View Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Schedule</h2>
                <p className="text-sm text-muted-foreground">Manage your scheduled posts</p>
              </div>
              <ScheduleViewToggle view={scheduleView} onViewChange={setScheduleView} />
            </div>

            {/* Quick Stats */}
            <ScheduleQuickStats
              posts={scheduledPosts.map(post => ({
                id: post.id,
                date: new Date(post.scheduledDate).toISOString()
              }))}
            />

            {/* Month View */}
            {scheduleView === 'month' && (
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr,400px]">
                {/* Calendar */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {format(currentDate, 'MMMM yyyy')}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleTodayClick}>Today</Button>
                      <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {weekDays.map((day) => (
                        <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((day, index) => {
                        const posts = getPostsForDay(day);
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isSelected = selectedScheduleDate && isSameDay(day, selectedScheduleDate);
                        return (
                          <div
                            key={index}
                            onClick={() => setSelectedScheduleDate(day)}
                            className={cn(
                              "min-h-[80px] p-2 rounded-lg border transition-colors cursor-pointer",
                              isCurrentMonth ? "bg-muted/30" : "bg-transparent",
                              isToday(day) && "border-primary",
                              isSelected && "bg-primary/10 border-primary",
                              !isSelected && !isToday(day) && "border-transparent hover:border-primary/50"
                            )}
                          >
                            <span className={cn(
                              "text-sm",
                              !isCurrentMonth && "text-muted-foreground",
                              isToday(day) && "font-bold text-primary"
                            )}>
                              {format(day, 'd')}
                            </span>
                            {posts.length > 0 && (
                              <div className="mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {posts.length}
                                </Badge>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Details Panel - Sticky */}
                <div className="lg:sticky lg:top-6 lg:self-start">
                  <ScheduleDetailsPanel
                    selectedDate={selectedScheduleDate}
                    posts={getFormattedPostsForDate(selectedScheduleDate)}
                    onEdit={(post) => {
                      toast.info('Edit functionality coming soon');
                    }}
                    onDelete={(post) => {
                      toast.info('Delete functionality coming soon');
                    }}
                  />
                </div>
              </div>
            )}

            {/* List View */}
            {scheduleView === 'list' && (
              <Card>
                <CardHeader>
                  <CardTitle>All Scheduled Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {scheduledPosts
                      .filter(p => p.status === 'scheduled')
                      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                      .map((post) => (
                        <div
                          key={post.id}
                          className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => post.propertyId && navigate(`/properties/${post.propertyId}`, { state: { from: '/social#schedule' } })}
                        >
                          <img src={post.image} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{post.property?.address || 'Value Post'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {post.platforms.map((platform) => (
                                <Badge key={platform} variant="outline" className="text-xs capitalize">{platform}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-medium">{format(new Date(post.scheduledDate), 'MMM d, yyyy')}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(post.scheduledDate), 'h:mm a')}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="mt-6">
          <SocialAnalytics />
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentOperation === 'post' && 'Post All Selected Properties'}
              {currentOperation === 'schedule' && 'Schedule Selected Properties'}
              {currentOperation === 'skip' && 'Skip Selected Properties'}
              {currentOperation === 'captions' && 'Generate AI Captions'}
            </DialogTitle>
            <DialogDescription>
              This will process {selectedPropertyIds.size} properties.
            </DialogDescription>
          </DialogHeader>

          {currentOperation === 'schedule' && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={batchScheduleDate} onChange={(e) => setBatchScheduleDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" value={batchScheduleTime} onChange={(e) => setBatchScheduleTime(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Hours Between Posts</Label>
                <Input type="number" min="1" max="24" value={batchScheduleInterval} onChange={(e) => setBatchScheduleInterval(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}

          {currentOperation === 'captions' && (
            <div className="py-4">
              <Label>Caption Style</Label>
              <select
                value={batchCaptionStyle}
                onChange={(e) => setBatchCaptionStyle(e.target.value as CaptionStyle)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="professional">💼 Professional</option>
                <option value="witty">😄 Witty</option>
                <option value="powerful">⚡ Powerful</option>
                <option value="friendly">👋 Friendly</option>
                <option value="luxury">✨ Luxury</option>
                <option value="casual">🏠 Casual</option>
              </select>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button onClick={executeBatchOperation}>
              {currentOperation === 'post' && 'Post All'}
              {currentOperation === 'schedule' && 'Schedule All'}
              {currentOperation === 'skip' && 'Skip All'}
              {currentOperation === 'captions' && 'Generate Captions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}