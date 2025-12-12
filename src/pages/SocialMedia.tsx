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
import { demoProperties, mockProperties, mockSocialAccounts, mockScheduledPosts } from '@/data/mockData';
import { toast } from 'sonner';
import { useSocialAccounts, useCreateSocialPost, getApiConfig, useProperties, ACQUISITION_PIPELINE_ID } from '@/services/ghlApi';
import { useAppStore } from '@/store/useAppStore';
import { SocialAccountSelector } from '@/components/social/SocialAccountSelector';
import { SocialPostPreview } from '@/components/social/SocialPostPreview';
import { AICaptionGenerator, type Platform as AIPlatform, type CaptionStyle } from '@/components/social/AICaptionGenerator';
import { SocialAnalytics } from '@/components/social/SocialAnalytics';
import { PropertySelector } from '@/components/social/PropertySelector';
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

  // Schedule state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Property selection for captions
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Check GHL connection
  const ghlConfig = getApiConfig();
  const isGhlConnected = connectionStatus.highLevel && ghlConfig.apiKey;

  // GHL API hooks
  const { data: socialAccountsData, isLoading: isLoadingAccounts } = useSocialAccounts();
  const { data: propertiesData } = useProperties(ACQUISITION_PIPELINE_ID);
  const createPost = useCreateSocialPost();

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

  // Get properties
  const allProperties = useMemo(() => {
    const ghlProperties = propertiesData?.properties || [];
    const liveProperties = isGhlConnected && ghlProperties.length > 0 ? ghlProperties : mockProperties;
    return [...demoProperties, ...liveProperties];
  }, [isGhlConnected, propertiesData]);

  const pendingProperties = allProperties.filter(p => p.status === 'pending');

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

  const getPostsForDay = (day: Date) => {
    return mockScheduledPosts.filter(post => isSameDay(new Date(post.scheduledDate), day));
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleTodayClick = () => setCurrentDate(new Date());

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const connectedAccounts = accounts.filter(a => a.connected);

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

        {/* CREATE TAB */}
        <TabsContent value="create" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Editor Column */}
            <div className="space-y-6">
              {/* Property Selector */}
              <PropertySelector
                properties={allProperties}
                selectedProperty={selectedProperty}
                onSelect={setSelectedProperty}
              />

              {/* Image Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {image ? (
                    <div className="relative">
                      <img src={image} alt="Upload preview" className="w-full aspect-video object-cover rounded-lg" />
                      <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={handleRemoveImage}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : selectedProperty?.heroImage ? (
                    <div className="relative">
                      <img src={selectedProperty.heroImage} alt="Property" className="w-full aspect-video object-cover rounded-lg" />
                      <Badge className="absolute top-2 left-2 bg-primary/90">From Property</Badge>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click or drag to upload image</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </CardContent>
              </Card>

              {/* Platform-Specific Captions */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent" />
                      Captions by Platform
                    </CardTitle>
                    <AICaptionGenerator
                      property={selectedProperty || {}}
                      onCaptionGenerated={(platform, caption) => updateCaption(platform, caption)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Platform)}>
                    <TabsList className="grid w-full grid-cols-3">
                      {(['facebook', 'instagram', 'linkedin'] as Platform[]).map((p) => {
                        const Icon = platformConfig[p].icon;
                        return (
                          <TabsTrigger key={p} value={p} className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{platformConfig[p].label}</span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {(['facebook', 'instagram', 'linkedin'] as Platform[]).map((platform) => (
                      <TabsContent key={platform} value={platform} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">{platformConfig[platform].tips}</p>
                          <Button variant="ghost" size="sm" onClick={() => copyToAllPlatforms(platform)} disabled={!captions[platform]}>
                            {copiedFrom === platform ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                            Copy to All
                          </Button>
                        </div>
                        <Textarea
                          value={captions[platform]}
                          onChange={(e) => updateCaption(platform, e.target.value)}
                          placeholder={`Write your ${platformConfig[platform].label} caption...`}
                          className="min-h-[150px]"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{captions[platform].length}/{platformConfig[platform].maxLength}</span>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              {/* Account Selection & Scheduling */}
              <div className="grid gap-4 sm:grid-cols-2">
                <SocialAccountSelector
                  accounts={connectedAccounts}
                  selectedIds={selectedAccountIds}
                  onSelectionChange={setSelectedAccountIds}
                  isLoading={isLoadingAccounts}
                />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">When to Post</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup value={postType} onValueChange={(v) => setPostType(v as 'now' | 'schedule')}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="now" id="now" />
                        <Label htmlFor="now">Post Now</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="schedule" id="schedule" />
                        <Label htmlFor="schedule">Schedule</Label>
                      </div>
                    </RadioGroup>

                    {postType === 'schedule' && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                        <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Post Button */}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handlePost} disabled={isPosting}>
                  {isPosting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 
                    postType === 'now' ? <Send className="h-4 w-4 mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                  {postType === 'now' ? 'Post' : 'Schedule Post'}
                </Button>
                <Button variant="outline" onClick={handleClear}>Clear</Button>
              </div>
            </div>

            {/* Preview Column */}
            <div className="space-y-6">
              <SocialPostPreview 
                captions={captions} 
                image={image || selectedProperty?.heroImage || undefined} 
                accountName="Purple Homes" 
              />
            </div>
          </div>
        </TabsContent>

        {/* BATCH TAB */}
        <TabsContent value="batch" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Property Selection */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Select Properties ({selectedPropertyIds.size})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAllProperties}>Select All Pending</Button>
                    {selectedPropertyIds.size > 0 && (
                      <Button variant="ghost" size="sm" onClick={handleClearPropertySelection}>Clear</Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {pendingProperties.map((property) => {
                      const status = propertyStatuses[property.id];
                      const isSelected = selectedPropertyIds.has(property.id);
                      
                      return (
                        <div 
                          key={property.id}
                          className={cn(
                            "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                            isSelected && !status && "border-primary bg-primary/5",
                            status === 'complete' && "border-green-500 bg-green-500/5",
                            status === 'failed' && "border-red-500 bg-red-500/5",
                            status === 'processing' && "border-yellow-500 bg-yellow-500/5",
                            !isSelected && !status && "border-border hover:border-primary/50"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => togglePropertySelection(property.id)}
                            disabled={operationStatus === 'running' || property.isDemo}
                          />
                          <img src={property.heroImage} alt="" className="h-12 w-12 rounded object-cover" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{property.propertyCode}</span>
                              {property.isDemo && <Badge variant="secondary" className="text-xs">DEMO</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                          </div>
                          {status === 'processing' && <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />}
                          {status === 'complete' && <Check className="h-5 w-5 text-green-500" />}
                          {status === 'failed' && <X className="h-5 w-5 text-red-500" />}
                        </div>
                      );
                    })}
                    {pendingProperties.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No pending properties</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Batch Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" onClick={() => startBatchOperation('post')} disabled={selectedPropertyIds.size === 0 || operationStatus === 'running'}>
                    <Rocket className="h-4 w-4 mr-2" />
                    Post All ({selectedPropertyIds.size})
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => startBatchOperation('schedule')} disabled={selectedPropertyIds.size === 0 || operationStatus === 'running'}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Selected
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => startBatchOperation('captions')} disabled={selectedPropertyIds.size === 0 || operationStatus === 'running'}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate AI Captions
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => startBatchOperation('skip')} disabled={selectedPropertyIds.size === 0 || operationStatus === 'running'}>
                    <SkipForward className="h-4 w-4 mr-2" />
                    Skip Selected
                  </Button>
                </CardContent>
              </Card>

              {operationStatus !== 'idle' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={batchProgress} className="h-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{batchCompletedCount + batchFailedCount} / {selectedPropertyIds.size}</span>
                      <span className="font-medium">{Math.round(batchProgress)}%</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{batchCompletedCount} done</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <X className="h-4 w-4 text-red-500" />
                        <span>{batchFailedCount} failed</span>
                      </div>
                    </div>
                    {operationStatus === 'complete' && (
                      <Button variant="outline" className="w-full" onClick={resetBatchOperation}>Start New</Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* SCHEDULE TAB */}
        <TabsContent value="schedule" className="mt-6">
          <div className="space-y-6">
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
                    return (
                      <div
                        key={index}
                        className={cn(
                          "min-h-[80px] p-2 rounded-lg border border-transparent transition-colors",
                          isCurrentMonth ? "bg-muted/30" : "bg-transparent",
                          isToday(day) && "border-primary",
                          "hover:border-primary/50 cursor-pointer"
                        )}
                      >
                        <span className={cn("text-sm", !isCurrentMonth && "text-muted-foreground", isToday(day) && "font-bold text-primary")}>
                          {format(day, 'd')}
                        </span>
                        <div className="mt-1 space-y-1">
                          {posts.slice(0, 2).map((post) => (
                            <div
                              key={post.id}
                              onClick={() => post.propertyId && navigate(`/properties/${post.propertyId}`, { state: { from: '/social#schedule' } })}
                              className={cn(
                                "text-xs p-1 rounded truncate cursor-pointer",
                                post.status === 'scheduled' && "bg-blue-500/20 text-blue-400",
                                post.status === 'posted' && "bg-green-500/20 text-green-400",
                                post.status === 'failed' && "bg-red-500/20 text-red-400"
                              )}
                            >
                              {format(new Date(post.scheduledDate), 'h:mm a')}
                            </div>
                          ))}
                          {posts.length > 2 && <span className="text-xs text-muted-foreground">+{posts.length - 2}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Posts */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockScheduledPosts.filter(p => p.status === 'scheduled').slice(0, 5).map((post) => (
                    <div 
                      key={post.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => post.propertyId && navigate(`/properties/${post.propertyId}`, { state: { from: '/social#schedule' } })}
                    >
                      <img src={post.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{post.property?.address || 'Value Post'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {post.platforms.map((platform) => (
                            <Badge key={platform} variant="outline" className="text-xs capitalize">{platform}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{format(new Date(post.scheduledDate), 'MMM d')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(post.scheduledDate), 'h:mm a')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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