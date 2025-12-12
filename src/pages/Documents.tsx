import { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Send, 
  Eye,
  Folder,
  Clock,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  X,
  ChevronDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCustomFields, getApiConfig } from '@/services/ghlApi';
import { useAppStore } from '@/store/useAppStore';

// Available custom fields for documents
const DOCUMENT_CUSTOM_FIELDS = [
  { key: 'property_address', label: 'Property Address', placeholder: '123 Main St' },
  { key: 'property_city', label: 'Property City', placeholder: 'Phoenix' },
  { key: 'property_price', label: 'Property Price', placeholder: '$250,000' },
  { key: 'property_beds', label: 'Beds', placeholder: '3' },
  { key: 'property_baths', label: 'Baths', placeholder: '2' },
  { key: 'property_sqft', label: 'Square Footage', placeholder: '1,500' },
  { key: 'property_condition', label: 'Property Condition', placeholder: 'Good' },
  { key: 'buyer_name', label: 'Buyer Name', placeholder: 'John Doe' },
  { key: 'buyer_email', label: 'Buyer Email', placeholder: 'john@example.com' },
  { key: 'buyer_phone', label: 'Buyer Phone', placeholder: '(555) 123-4567' },
  { key: 'offer_amount', label: 'Offer Amount', placeholder: '$245,000' },
  { key: 'closing_date', label: 'Closing Date', placeholder: '2024-02-15' },
  { key: 'earnest_money', label: 'Earnest Money', placeholder: '$5,000' },
  { key: 'assignment_fee', label: 'Assignment Fee', placeholder: '$10,000' },
];

// Mock document templates (GHL API-ready)
const mockTemplates = [
  { id: 'tpl-1', name: 'Property Inventory PDF', type: 'pdf', category: 'inventory' },
  { id: 'tpl-2', name: 'Purchase Agreement', type: 'contract', category: 'contracts' },
  { id: 'tpl-3', name: 'Assignment Contract', type: 'contract', category: 'contracts' },
  { id: 'tpl-4', name: 'Buyer Information Sheet', type: 'pdf', category: 'inventory' },
];

const mockDocuments = [
  {
    id: 'doc-1',
    name: 'Property List - Marcus Johnson',
    template: 'Property Inventory PDF',
    recipient: 'Marcus Johnson',
    recipientEmail: 'marcus@investcorp.com',
    status: 'sent',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    sentAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'doc-2',
    name: 'Purchase Agreement - 123 Demo Street',
    template: 'Purchase Agreement',
    recipient: 'Sarah Williams',
    recipientEmail: 'sarah@flippersinc.com',
    status: 'viewed',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    sentAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    viewedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'doc-3',
    name: 'Assignment Contract - 456 Example Lane',
    template: 'Assignment Contract',
    recipient: 'Robert Garcia',
    recipientEmail: 'rgarcia@investments.net',
    status: 'signed',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    sentAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    signedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'doc-4',
    name: 'Buyer Info - David Chen',
    template: 'Buyer Information Sheet',
    recipient: 'David Chen',
    recipientEmail: 'david@rentalking.com',
    status: 'draft',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export default function Documents() {
  const { connectionStatus } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [selectedCustomFields, setSelectedCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [newDocument, setNewDocument] = useState({
    template: '',
    recipientName: '',
    recipientEmail: '',
  });

  // Check GHL connection
  const ghlConfig = getApiConfig();
  const isGhlConnected = connectionStatus.highLevel && ghlConfig.apiKey;

  // Get custom fields from GHL
  const { data: ghlCustomFields } = useCustomFields('opportunity');

  // Merge GHL custom fields with predefined ones
  const availableCustomFields = ghlCustomFields?.customFields 
    ? [...DOCUMENT_CUSTOM_FIELDS, ...ghlCustomFields.customFields.map(f => ({
        key: f.fieldKey || f.id,
        label: f.name,
        placeholder: ''
      }))]
    : DOCUMENT_CUSTOM_FIELDS;

  const addCustomField = (fieldKey: string) => {
    const field = availableCustomFields.find(f => f.key === fieldKey);
    if (field && !selectedCustomFields.find(f => f.key === fieldKey)) {
      setSelectedCustomFields(prev => [...prev, { key: fieldKey, value: '' }]);
    }
    setCustomFieldsOpen(false);
  };

  const updateCustomFieldValue = (key: string, value: string) => {
    setSelectedCustomFields(prev => 
      prev.map(f => f.key === key ? { ...f, value } : f)
    );
  };

  const removeCustomField = (key: string) => {
    setSelectedCustomFields(prev => prev.filter(f => f.key !== key));
  };

  const filteredDocuments = mockDocuments.filter((doc) => {
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        doc.name.toLowerCase().includes(searchLower) ||
        doc.recipient.toLowerCase().includes(searchLower) ||
        doc.template.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-gray-500/10 text-gray-500"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'sent':
        return <Badge className="bg-blue-500/10 text-blue-500"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'viewed':
        return <Badge className="bg-yellow-500/10 text-yellow-500"><Eye className="h-3 w-3 mr-1" />Viewed</Badge>;
      case 'signed':
        return <Badge className="bg-emerald-500/10 text-emerald-500"><CheckCircle className="h-3 w-3 mr-1" />Signed</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/10 text-red-500"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build custom fields object
    const customFieldsObj = selectedCustomFields.reduce((acc, field) => {
      if (field.value) acc[field.key] = field.value;
      return acc;
    }, {} as Record<string, string>);

    console.log('Creating document (GHL API-ready):', {
      ...newDocument,
      customFields: customFieldsObj
    });
    
    toast.success('Document created! Ready to send via GHL API.');
    setNewDocument({ template: '', recipientName: '', recipientEmail: '' });
    setSelectedCustomFields([]);
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Connection Banner */}
      {!isGhlConnected && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">Demo Mode</p>
            <p className="text-xs text-muted-foreground">
              Configure GHL API in Settings to create documents via HighLevel
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Documents & Contracts
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
            Create, send, and track documents via HighLevel
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Document
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockDocuments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {mockDocuments.filter(d => d.status === 'sent' || d.status === 'viewed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Signed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {mockDocuments.filter(d => d.status === 'signed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTemplates.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Folder className="h-5 w-5 text-muted-foreground" />
          Document Templates
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {mockTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => {
                setNewDocument(prev => ({ ...prev, template: template.id }));
                setShowCreateModal(true);
              }}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{template.type}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="signed">Signed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents Table */}
      {filteredDocuments.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Document Name</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell className="text-muted-foreground">{doc.template}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{doc.recipient}</div>
                      <div className="text-xs text-muted-foreground">{doc.recipientEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(doc.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => toast.info('Preview (GHL API pending)')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toast.info('Download (GHL API pending)')}>
                        <Download className="h-4 w-4" />
                      </Button>
                      {doc.status === 'draft' && (
                        <Button size="sm" variant="ghost" onClick={() => toast.info('Send (GHL API pending)')}>
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No documents found"
          description="Create a new document or adjust your filters."
        />
      )}

      {/* Create Document Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Create Document
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDocument} className="space-y-4">
            <div className="space-y-2">
              <Label>Template *</Label>
              <Select value={newDocument.template} onValueChange={(v) => setNewDocument(prev => ({ ...prev, template: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {mockTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recipient Name *</Label>
                <Input
                  required
                  value={newDocument.recipientName}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, recipientName: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Recipient Email *</Label>
                <Input
                  required
                  type="email"
                  value={newDocument.recipientEmail}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, recipientEmail: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom Fields</Label>
                <Popover open={customFieldsOpen} onOpenChange={setCustomFieldsOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Field
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search fields..." />
                      <CommandList>
                        <CommandEmpty>No fields found.</CommandEmpty>
                        <CommandGroup heading="Available Fields">
                          {availableCustomFields
                            .filter(f => !selectedCustomFields.find(sf => sf.key === f.key))
                            .map((field) => (
                              <CommandItem
                                key={field.key}
                                value={field.key}
                                onSelect={() => addCustomField(field.key)}
                              >
                                {field.label}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              {selectedCustomFields.length > 0 ? (
                <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                  {selectedCustomFields.map((field) => {
                    const fieldDef = availableCustomFields.find(f => f.key === field.key);
                    return (
                      <div key={field.key} className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">{fieldDef?.label || field.key}</Label>
                          <Input
                            value={field.value}
                            onChange={(e) => updateCustomFieldValue(field.key, e.target.value)}
                            placeholder={fieldDef?.placeholder || `Enter ${fieldDef?.label}`}
                            className="h-8 text-sm"
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 mt-5"
                          onClick={() => removeCustomField(field.key)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground p-3 rounded-lg border border-dashed border-border text-center">
                  Click "Add Field" to include custom data in your document
                </p>
              )}
              
              <p className="text-xs text-muted-foreground">
                {isGhlConnected 
                  ? 'Custom fields will be merged with GHL contact data.'
                  : 'Connect GHL API to sync custom fields automatically.'
                }
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Create Document
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
