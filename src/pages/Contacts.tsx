import { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Mail, 
  MessageSquare, 
  Tag, 
  Download, 
  X, 
  ChevronDown,
  ChevronUp,
  Star,
  Phone,
  MapPin,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2,
  CloudDownload,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { mockContacts } from '@/data/mockData';
import type { Contact, ContactType, ContactStatus } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  useContacts, 
  useSendEmail, 
  useSendSMS,
  useCreateContact,
  getApiConfig,
  type GHLContact 
} from '@/services/ghlApi';
import { useAppStore } from '@/store/useAppStore';

const SMART_LISTS: { value: ContactType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Contacts' },
  { value: 'seller', label: 'Sellers' },
  { value: 'buyer', label: 'Buyers' },
  { value: 'agent', label: 'Agents' },
  { value: 'wholesaler', label: 'Wholesalers' },
];

const STATUS_OPTIONS: ContactStatus[] = ['active', 'inactive', 'pending', 'closed'];

type SortField = 'name' | 'createdAt' | 'lastActivityAt' | 'dealsClosed';
type SortOrder = 'asc' | 'desc';

export default function Contacts() {
  const { connectionStatus } = useAppStore();
  const [smartList, setSmartList] = useState<ContactType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newContact, setNewContact] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    type: 'buyer' as ContactType,
    company: '',
    zipCodes: '',
    notes: ''
  });

  // Check if GHL is configured
  const ghlConfig = getApiConfig();
  const hasLocalConfig = !!(ghlConfig.apiKey && ghlConfig.locationId);

  // GHL API hooks - backend fetches ALL contacts automatically
  const { 
    data: ghlContactsData, 
    isLoading: isLoadingContacts, 
    isError: isContactsError,
    refetch: refetchContacts 
  } = useContacts();
  
  // If data loads successfully from GHL, we're connected (even if no local config)
  const isGhlConnected = hasLocalConfig || (!isLoadingContacts && !isContactsError && ghlContactsData?.contacts);
  
  const sendEmail = useSendEmail();
  const sendSMS = useSendSMS();
  const createContact = useCreateContact();

  // Transform GHL contacts to local format or use mock data
  const ghlContacts: Contact[] = useMemo(() => {
    if (!isGhlConnected || !ghlContactsData?.contacts) return [];
    
    // Log first contact to see actual structure
    if (ghlContactsData.contacts.length > 0) {
      console.log('🔍 FIRST CONTACT RAW DATA:', {
        fullContact: ghlContactsData.contacts[0],
        customFieldsKeys: Object.keys(ghlContactsData.contacts[0].customFields || {}),
        customFieldsSample: ghlContactsData.contacts[0].customFields
      });
    }
    
    const transformed = ghlContactsData.contacts
      .map((c: GHLContact, index: number): Contact | null => {
        const firstName = c.firstName || '';
        const lastName = c.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Unknown';
        
        // Get lead type from custom field - try multiple possible field names
        const leadTypeValue = 
          c.customFields?.['contact.lead_type'] || 
          c.customFields?.lead_type ||
          c.customFields?.['Lead Type'] ||
          c.customFields?.leadType;
        
        // Debug first few contacts
        if (index < 5) {
          console.log(`Contact ${index + 1} (${fullName}):`, {
            customFields: c.customFields,
            leadTypeValue,
            hasLeadType: !!leadTypeValue
          });
        }
        
        // Skip contacts without lead_type - these are not relevant
        if (!leadTypeValue || typeof leadTypeValue !== 'string') {
          return null;
        }
        
        // Map exact GHL lead type values to contact type
        let contactType: ContactType;
        const lowerType = leadTypeValue.toLowerCase();
        
        // Map all picklist options
        switch (lowerType) {
          case 'seller':
            contactType = 'seller';
            break;
          case 'buyer':
            contactType = 'buyer';
            break;
          case 'buyer representative':
            contactType = 'buyer-representative';
            break;
          case 'wholesalers':
            contactType = 'wholesaler';
            break;
          case 'real estate agent':
            contactType = 'agent';
            break;
          case 'owner':
            contactType = 'owner';
            break;
          case 'contractor':
            contactType = 'contractor';
            break;
          case 'private money lender':
            contactType = 'private-money-lender';
            break;
          case 'institutional lender':
            contactType = 'institutional-lender';
            break;
          case 'unknown':
            contactType = 'unknown';
            break;
          case 'other':
            contactType = 'other';
            break;
          default:
            // If it doesn't match any known type, skip it
            console.warn(`Unknown lead type: "${leadTypeValue}" for contact ${fullName}`);
            return null;
        }
        
        // Helper function to get custom field value
        const getCustomField = (fieldKey: string): string | undefined => {
          const value = c.customFields?.[fieldKey] || c.customFields?.[fieldKey.replace('contact.', '')];
          return typeof value === 'string' ? value : undefined;
        };
        
        return {
          id: c.id,
          ghlContactId: c.id,
          name: fullName,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          type: contactType,
          status: (getCustomField('contact.status') as ContactStatus) || 'active',
          tags: c.tags || [],
          zipCodes: getCustomField('contact.zip_codes')?.split(',').map((z: string) => z.trim()) || [],
          dealsClosed: parseInt(getCustomField('contact.deals_closed') || '0') || 0,
          transactionValue: parseFloat(getCustomField('contact.transaction_value') || '0') || 0,
          createdAt: c.dateAdded,
          lastActivityAt: c.lastActivity,
          company: getCustomField('contact.company'),
          isFavorite: getCustomField('contact.is_favorite') === 'true',
          markets: getCustomField('contact.markets')?.split(',').map((m: string) => m.trim()) || [],
          updatedAt: c.lastActivity || c.dateAdded
        };
      })
      .filter((c): c is Contact => c !== null); // Remove null entries
    
    console.log('✅ CONTACTS TRANSFORM COMPLETE:', {
      total: ghlContactsData.contacts.length,
      filtered: transformed.length,
      skipped: ghlContactsData.contacts.length - transformed.length
    });
    
    return transformed;
  }, [ghlContactsData, isGhlConnected]);

  // Use GHL contacts if connected, otherwise fall back to mock data
  const baseContacts = isGhlConnected ? ghlContacts : mockContacts;

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let result = [...baseContacts];
    
    console.log('[Contacts Filter] Starting with:', {
      total: result.length,
      smartList,
      types: result.reduce((acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    
    // Smart list filter
    if (smartList !== 'all') {
      result = result.filter(c => c.type === smartList);
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }
    
    // Zip code filter
    if (zipCode) {
      result = result.filter(c => 
        c.zipCodes.some(z => z.includes(zipCode))
      );
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(search) ||
        c.company?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'lastActivityAt':
          const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
          const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
          comparison = aTime - bTime;
          break;
        case 'dealsClosed':
          comparison = a.dealsClosed - b.dealsClosed;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    console.log('[Contacts Filter] After filtering:', {
      total: result.length,
      smartList,
      statusFilter,
      search
    });
    
    return result;
  }, [baseContacts, smartList, statusFilter, zipCode, search, sortField, sortOrder]);

  // Sync contacts from GHL - just refetch since backend already fetches all contacts
  const handleSyncContacts = async () => {
    if (!isGhlConnected) {
      toast.error('Please configure GHL API in Settings first');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      // Just refetch contacts - backend handles fetching all contacts automatically
      await refetchContacts();
      setSyncProgress(100);
      toast.success('Contacts synced successfully from HighLevel!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
      }, 500);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleBulkAction = async (action: string) => {
    const count = selectedIds.size;
    const contactIds = Array.from(selectedIds);

    switch (action) {
      case 'email':
        if (isGhlConnected) {
          try {
            await sendEmail.mutateAsync({
              contactIds,
              subject: 'Message from Purple Homes',
              body: 'Hello {{contact.first_name}},\n\nThank you for your interest.',
            });
            toast.success(`Email sent to ${count} contacts via HighLevel!`);
          } catch (error) {
            toast.error('Failed to send emails');
          }
        } else {
          toast.info(`Email to ${count} contacts requires GHL API connection`);
        }
        break;
      case 'sms':
        if (isGhlConnected) {
          try {
            await sendSMS.mutateAsync({
              contactIds,
              body: 'Hello {{contact.first_name}}, this is Purple Homes.',
            });
            toast.success(`SMS sent to ${count} contacts via HighLevel!`);
          } catch (error) {
            toast.error('Failed to send SMS');
          }
        } else {
          toast.info(`SMS to ${count} contacts requires GHL API connection`);
        }
        break;
      case 'tag':
        toast.info(`Managing tags for ${count} contacts... (Modal coming soon)`);
        break;
      case 'export':
        // Export to CSV
        const contacts = filteredContacts.filter(c => selectedIds.has(c.id));
        const csv = [
          ['Name', 'Email', 'Phone', 'Type', 'Status', 'Deals', 'Transactions'].join(','),
          ...contacts.map(c => [
            c.name,
            c.email || '',
            c.phone || '',
            c.type,
            c.status,
            c.dealsClosed,
            c.transactionValue || 0
          ].join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contacts-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${count} contacts to CSV`);
        break;
    }
    setSelectedIds(new Set());
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isGhlConnected) {
      try {
        await createContact.mutateAsync({
          firstName: newContact.firstName,
          lastName: newContact.lastName,
          email: newContact.email,
          phone: newContact.phone,
          tags: [newContact.type],
          customFields: {
            contactType: newContact.type,
            company: newContact.company,
            zipCodes: newContact.zipCodes,
            notes: newContact.notes
          }
        });
        toast.success('Contact created in HighLevel!');
        refetchContacts();
      } catch (error) {
        toast.error('Failed to create contact in GHL');
        return;
      }
    } else {
      console.log('New contact (GHL API-ready):', newContact);
      toast.success('Contact added locally (connect GHL to sync)');
    }
    
    setNewContact({ firstName: '', lastName: '', email: '', phone: '', type: 'buyer', company: '', zipCodes: '', notes: '' });
    setShowAddModal(false);
  };

  const getTypeColor = (type: ContactType) => {
    switch (type) {
      case 'seller': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'buyer': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'agent': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'wholesaler': return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  const getStatusColor = (status: ContactStatus) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500';
      case 'inactive': return 'bg-gray-500/10 text-gray-500';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'closed': return 'bg-blue-500/10 text-blue-500';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-4 w-4 opacity-30" />;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Connection Status Banner */}
      {!isGhlConnected && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">Using demo data</p>
            <p className="text-xs text-muted-foreground">
              Configure GHL API in Settings to sync real contacts from HighLevel
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings'}>
            Go to Settings
          </Button>
        </div>
      )}

      {/* Sync Progress */}
      {isSyncing && (
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Syncing contacts from HighLevel...</span>
          </div>
          <Progress value={syncProgress} className="h-2" />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Contacts
            {isGhlConnected ? (
              <Badge className="bg-success flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                GHL Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" />
                Demo Mode
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isLoadingContacts ? 'Loading...' : `${filteredContacts.length} contacts`}
            {smartList !== 'all' && ` in ${SMART_LISTS.find(s => s.value === smartList)?.label}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSyncContacts}
            disabled={isSyncing || !isGhlConnected}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CloudDownload className="h-4 w-4 mr-2" />
            )}
            Sync from GHL
          </Button>
          <Button 
            variant="outline" 
            onClick={() => refetchContacts()}
            disabled={isLoadingContacts}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingContacts ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Smart Lists Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {SMART_LISTS.map((list) => (
          <Button
            key={list.value}
            variant={smartList === list.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSmartList(list.value)}
            className={smartList === list.value ? '' : 'text-muted-foreground'}
          >
            {list.label}
            {list.value !== 'all' && (
              <span className="ml-2 text-xs opacity-70">
                ({baseContacts.filter(c => c.type === list.value).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ChevronDown className="h-4 w-4 mr-2" />
                Sort ({sortField})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleSort('name')}>Name</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('createdAt')}>Created Date</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('lastActivityAt')}>Last Activity</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('dealsClosed')}>Deals Closed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex gap-2 flex-wrap">
          <div className="relative w-48">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zip code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              className="pl-10"
              maxLength={5}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ContactStatus | 'all')}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <Card className="border-primary/20 animate-slide-in">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Deals Range</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="number" placeholder="Min" className="w-20" />
                  <span className="flex items-center">to</span>
                  <Input type="number" placeholder="Max" className="w-20" />
                </div>
              </div>
              <div>
                <Label>Transaction Value</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="number" placeholder="Min $" />
                  <span className="flex items-center">to</span>
                  <Input type="number" placeholder="Max $" />
                </div>
              </div>
              <div>
                <Label>Created Date Range</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="date" />
                  <span className="flex items-center">to</span>
                  <Input type="date" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAdvancedFilters(false);
                  toast.info('Filters cleared');
                }}
              >
                Clear Filters
              </Button>
              <Button onClick={() => toast.info('Advanced filters applied')}>
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-primary/10 rounded-lg animate-slide-in">
          <span className="font-medium">{selectedIds.size} contacts selected</span>
          <div className="flex-1" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('email')}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('sms')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              SMS
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('tag')}>
              <Tag className="h-4 w-4 mr-2" />
              Tags
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('export')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Contacts List */}
      {filteredContacts.length > 0 ? (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredContacts.map((contact) => (
              <div 
                key={contact.id}
                className="p-4 border rounded-lg bg-card hover:border-primary/50 transition-colors"
                onClick={() => handleSelect(contact.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox 
                    checked={selectedIds.has(contact.id)}
                    onCheckedChange={() => handleSelect(contact.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={getTypeColor(contact.type)}>
                      {getInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{contact.name}</span>
                      {contact.isFavorite && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                      <Badge variant="outline" className={`capitalize text-xs ${getTypeColor(contact.type)}`}>
                        {contact.type}
                      </Badge>
                    </div>
                    {contact.company && (
                      <p className="text-xs text-muted-foreground mb-2">{contact.company}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </span>
                      )}
                      {contact.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`capitalize text-xs ${getStatusColor(contact.status)}`}>
                        {contact.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {contact.dealsClosed} deals
                      </span>
                      {contact.transactionValue > 0 && (
                        <span className="text-xs text-emerald-500">
                          ${contact.transactionValue.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block border rounded-lg overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                      Contact Name
                      <SortIcon field="name" />
                    </div>
                  </TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('dealsClosed')}>
                    <div className="flex items-center gap-1">
                      Deals
                      <SortIcon field="dealsClosed" />
                    </div>
                  </TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-1">
                      Created
                      <SortIcon field="createdAt" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('lastActivityAt')}>
                    <div className="flex items-center gap-1">
                      Last Activity
                      <SortIcon field="lastActivityAt" />
                    </div>
                  </TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.has(contact.id)}
                        onCheckedChange={() => handleSelect(contact.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={getTypeColor(contact.type)}>
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            {contact.name}
                            {contact.isFavorite && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                          </div>
                          {contact.company && (
                            <div className="text-xs text-muted-foreground">{contact.company}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {contact.phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[180px]">{contact.email}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${getTypeColor(contact.type)}`}>
                        {contact.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{contact.dealsClosed}</span>
                    </TableCell>
                    <TableCell>
                      {contact.transactionValue ? (
                        <span className="font-medium text-emerald-500">
                          ${contact.transactionValue.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`capitalize ${getStatusColor(contact.status)}`}>
                        {contact.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(contact.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contact.lastActivityAt 
                        ? format(new Date(contact.lastActivityAt), 'MMM d, yyyy')
                        : '—'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {contact.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{contact.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Search}
          title="No contacts found"
          description="Try adjusting your filters or add a new contact."
        />
      )}

      {/* Add Contact Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add New Contact
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  required
                  value={newContact.firstName}
                  onChange={(e) => setNewContact(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  required
                  value={newContact.lastName}
                  onChange={(e) => setNewContact(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Type *</Label>
                <Select value={newContact.type} onValueChange={(v) => setNewContact(prev => ({ ...prev, type: v as ContactType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="wholesaler">Wholesaler</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  value={newContact.company}
                  onChange={(e) => setNewContact(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="ACME Corp"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Zip Codes (comma-separated)</Label>
              <Input
                value={newContact.zipCodes}
                onChange={(e) => setNewContact(prev => ({ ...prev, zipCodes: e.target.value }))}
                placeholder="85001, 85002, 85003"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newContact.notes}
                onChange={(e) => setNewContact(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Contact
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}