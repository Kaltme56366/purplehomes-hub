import { AlertCircle, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useCustomFieldValidation, type FieldValidationResult } from '@/hooks/useCustomFieldValidation';

export function CustomFieldsValidation() {
  const {
    isLoading,
    error,
    validationResults,
    summary,
    missingRequiredFields,
    missingOptionalFields,
    foundFields,
    refetch,s
  } = useCustomFieldValidation('all');

  const [showMissing, setShowMissing] = useState(true);
  const [showFound, setShowFound] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const copyFieldKey = (fieldKey: string) => {
    navigator.clipboard.writeText(fieldKey);
    toast.success(`Copied "${fieldKey}" to clipboard`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Fields Validation</CardTitle>
          <CardDescription>Checking GHL custom fields configuration...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Fields Validation</CardTitle>
          <CardDescription>Unable to validate custom fields</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to fetch custom fields from GHL. Please check your API connection.</span>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const requiredProgress = summary.totalRequired > 0
    ? (summary.foundRequired / summary.totalRequired) * 100
    : 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Custom Fields Validation
              {summary.overallStatus === 'complete' && (
                <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
              {summary.overallStatus === 'partial' && (
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Partial
                </Badge>
              )}
              {summary.overallStatus === 'critical' && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Missing Required Fields
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Verify that all required GHL custom fields are configured correctly
            </CardDescription>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Summary */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Required Fields</span>
              <span className={summary.missingRequired > 0 ? 'text-destructive' : 'text-green-400'}>
                {summary.foundRequired} / {summary.totalRequired}
              </span>
            </div>
            <Progress value={requiredProgress} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-2xl font-bold text-green-400">{foundFields.length}</div>
              <div className="text-xs text-muted-foreground">Found</div>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="text-2xl font-bold text-destructive">{missingRequiredFields.length}</div>
              <div className="text-xs text-muted-foreground">Missing Required</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="text-2xl font-bold text-yellow-400">{missingOptionalFields.length}</div>
              <div className="text-xs text-muted-foreground">Missing Optional</div>
            </div>
          </div>
        </div>

        {/* Missing Required Fields */}
        {missingRequiredFields.length > 0 && (
          <Collapsible open={showMissing} onOpenChange={setShowMissing}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <span className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Missing Required Fields ({missingRequiredFields.length})
                </span>
                {showMissing ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-2">
                {missingRequiredFields.map((field) => (
                  <FieldRow key={field.fieldKey} field={field} onCopy={copyFieldKey} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Missing Optional Fields */}
        {missingOptionalFields.length > 0 && (
          <Collapsible open={showOptional} onOpenChange={setShowOptional}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <span className="flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  Missing Optional Fields ({missingOptionalFields.length})
                </span>
                {showOptional ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-2">
                {missingOptionalFields.map((field) => (
                  <FieldRow key={field.fieldKey} field={field} onCopy={copyFieldKey} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Found Fields */}
        <Collapsible open={showFound} onOpenChange={setShowFound}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <span className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Configured Fields ({foundFields.length})
              </span>
              {showFound ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="space-y-2">
              {foundFields.map((field) => (
                <FieldRow key={field.fieldKey} field={field} onCopy={copyFieldKey} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Link to Setup Guide */}
        <div className="pt-4 border-t border-border">
          <a
            href="/GHL_CUSTOM_FIELDS_SETUP.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View Custom Fields Setup Guide
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldRow({
  field,
  onCopy,
}: {
  field: FieldValidationResult;
  onCopy: (key: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
            {field.fieldKey}
          </code>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onCopy(field.fieldKey)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground mt-1">{field.name}</div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {field.usedIn.map((page) => (
            <Badge key={page} variant="outline" className="text-xs py-0">
              {page}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Badge variant="secondary" className="text-xs">
          {field.expectedType}
        </Badge>
        {field.status === 'found' && (
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        )}
        {field.status === 'missing' && (
          <AlertCircle className="h-4 w-4 text-destructive" />
        )}
        {field.status === 'type_mismatch' && (
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
        )}
      </div>
    </div>
  );
}
