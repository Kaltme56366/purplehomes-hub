import { useState } from 'react';
import { Bell, Mail, Save, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useSyncStore } from '@/store/useSyncStore';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function NotificationSettings() {
  const { failureNotifications, acknowledgeNotification } = useSyncStore();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Save to localStorage for now
    localStorage.setItem('notification_settings', JSON.stringify({
      enabled: notificationsEnabled,
      email: notificationEmail,
    }));
    setSaved(true);
    toast.success('Notification settings saved');
    setTimeout(() => setSaved(false), 2000);
  };

  // Load settings on mount
  useState(() => {
    const stored = localStorage.getItem('notification_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      setNotificationsEnabled(settings.enabled);
      setNotificationEmail(settings.email || '');
    }
  });

  const unacknowledgedNotifications = failureNotifications.filter(n => !n.acknowledged);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
          {unacknowledgedNotifications.length > 0 && (
            <Badge variant="destructive">{unacknowledgedNotifications.length} new</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure alerts for connection failures and sync issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Connection Failure Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Receive email when GHL connection fails for more than 5 minutes
            </p>
          </div>
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={setNotificationsEnabled}
          />
        </div>

        {/* Email Input */}
        {notificationsEnabled && (
          <div className="space-y-2">
            <Label htmlFor="notification-email">Notification Email</Label>
            <div className="flex gap-2">
              <Input
                id="notification-email"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="alerts@yourcompany.com"
                className="flex-1"
              />
              <Button onClick={handleSave} disabled={!notificationEmail}>
                <Save className="h-4 w-4 mr-2" />
                {saved ? 'Saved!' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Requires RESEND_API_KEY in Vercel environment variables
            </p>
          </div>
        )}

        {/* Recent Notifications */}
        {failureNotifications.length > 0 && (
          <div className="space-y-3">
            <Label>Recent Failure Notifications</Label>
            <div className="space-y-2">
              {failureNotifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={notification.acknowledged ? "h-4 w-4 text-muted-foreground" : "h-4 w-4 text-warning"} />
                    <div>
                      <p className="text-sm font-medium">
                        Connection failure alert sent
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sent to {notification.recipientEmail} • {format(new Date(notification.sentAt), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                  {!notification.acknowledged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => acknowledgeNotification(notification.id)}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Email Notification Setup</p>
              <p className="text-xs text-muted-foreground mt-1">
                To enable email notifications, add <code className="bg-muted px-1 rounded">RESEND_API_KEY</code> to 
                your Vercel environment variables. Sign up at{' '}
                <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  resend.com
                </a>{' '}
                to get your API key.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}