import { Facebook, Instagram, Linkedin, Check, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SocialAccount {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin';
  accountName: string;
  profilePicture?: string;
  connected: boolean;
  lastPosted?: string;
}

interface SocialAccountSelectorProps {
  accounts: SocialAccount[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading?: boolean;
  className?: string;
}

const platformConfig = {
  facebook: { 
    icon: Facebook, 
    label: 'Facebook', 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  instagram: { 
    icon: Instagram, 
    label: 'Instagram', 
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
  },
  linkedin: { 
    icon: Linkedin, 
    label: 'LinkedIn', 
    color: 'text-blue-700',
    bgColor: 'bg-blue-700/10',
    borderColor: 'border-blue-700/30',
  },
};

export function SocialAccountSelector({
  accounts,
  selectedIds,
  onSelectionChange,
  isLoading,
  className,
}: SocialAccountSelectorProps) {
  const toggleAccount = (accountId: string) => {
    if (selectedIds.includes(accountId)) {
      onSelectionChange(selectedIds.filter(id => id !== accountId));
    } else {
      onSelectionChange([...selectedIds, accountId]);
    }
  };

  const selectAll = () => {
    const connectedIds = accounts.filter(a => a.connected).map(a => a.id);
    onSelectionChange(connectedIds);
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  const connectedAccounts = accounts.filter(a => a.connected);
  const disconnectedAccounts = accounts.filter(a => !a.connected);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">Select Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Select Accounts</CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <button 
              onClick={selectAll}
              className="text-primary hover:underline"
            >
              All
            </button>
            <span className="text-muted-foreground">|</span>
            <button 
              onClick={deselectAll}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              None
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedIds.length} of {connectedAccounts.length} accounts selected
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Connected Accounts */}
        {connectedAccounts.map((account) => {
          const config = platformConfig[account.platform];
          const Icon = config.icon;
          const isSelected = selectedIds.includes(account.id);

          return (
            <div
              key={account.id}
              onClick={() => toggleAccount(account.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                isSelected 
                  ? `${config.bgColor} ${config.borderColor} ring-1 ring-offset-1 ring-offset-background` 
                  : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
              )}
            >
              {/* Checkbox */}
              <Checkbox 
                checked={isSelected}
                className="pointer-events-none"
              />

              {/* Avatar with Platform Icon */}
              <div className="relative">
                <Avatar className="h-10 w-10 border-2 border-background">
                  <AvatarImage src={account.profilePicture} alt={account.accountName} />
                  <AvatarFallback className={config.bgColor}>
                    {account.accountName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "absolute -bottom-1 -right-1 p-0.5 rounded-full bg-background",
                  config.color
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Account Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {account.accountName}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className={config.color}>{config.label}</span>
                  {account.lastPosted && (
                    <>
                      <span>•</span>
                      <span>Last: {account.lastPosted}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className={cn("p-1 rounded-full", config.bgColor)}>
                  <Check className={cn("h-4 w-4", config.color)} />
                </div>
              )}
            </div>
          );
        })}

        {/* Disconnected Accounts */}
        {disconnectedAccounts.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">Disconnected</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            
            {disconnectedAccounts.map((account) => {
              const config = platformConfig[account.platform];
              const Icon = config.icon;

              return (
                <div
                  key={account.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-dashed opacity-50 cursor-not-allowed"
                >
                  <Checkbox disabled />

                  <div className="relative">
                    <Avatar className="h-10 w-10 grayscale">
                      <AvatarImage src={account.profilePicture} alt={account.accountName} />
                      <AvatarFallback className="bg-muted">
                        {account.accountName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-background text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-muted-foreground">
                      {account.accountName}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>Not connected</span>
                    </p>
                  </div>

                  <Badge variant="outline" className="text-xs">
                    Reconnect
                  </Badge>
                </div>
              );
            })}
          </>
        )}

        {accounts.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No social accounts found</p>
            <p className="text-xs mt-1">Connect accounts in HighLevel</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}