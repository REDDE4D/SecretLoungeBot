'use client';

import { useState, useEffect } from 'react';
import { Bell, Volume2, Monitor, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api';

interface NotificationPreferences {
  soundEnabled: boolean;
  desktopPushEnabled: boolean;
  enabledTypes: string[];
}

const notificationTypes = [
  {
    type: 'report',
    label: 'New Reports',
    description: 'Get notified when users submit reports',
    icon: '🚨',
    color: 'text-red-500',
  },
  {
    type: 'moderation',
    label: 'Moderation Actions',
    description: 'Notifications for bans, mutes, kicks, and warnings',
    icon: '🔨',
    color: 'text-orange-500',
  },
  {
    type: 'spam',
    label: 'Spam Alerts',
    description: 'Automatic spam detection triggers',
    icon: '⚠️',
    color: 'text-yellow-500',
  },
  {
    type: 'user_joined',
    label: 'Users Joining',
    description: 'When users join the lobby',
    icon: '👋',
    color: 'text-green-500',
  },
  {
    type: 'user_left',
    label: 'Users Leaving',
    description: 'When users leave the lobby',
    icon: '👋',
    color: 'text-gray-500',
  },
  {
    type: 'user_status',
    label: 'User Status Changes',
    description: 'Online, idle, and offline status updates',
    icon: '📊',
    color: 'text-blue-500',
  },
  {
    type: 'settings',
    label: 'Settings Changes',
    description: 'Bot configuration updates',
    icon: '⚙️',
    color: 'text-gray-500',
  },
  {
    type: 'audit',
    label: 'Audit Logs',
    description: 'Critical security and administrative actions',
    icon: '🔒',
    color: 'text-purple-500',
  },
  {
    type: 'bot_log',
    label: 'Bot Logs',
    description: 'Bot errors, warnings, and system events',
    icon: '📝',
    color: 'text-cyan-500',
  },
];

export default function NotificationsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    soundEnabled: true,
    desktopPushEnabled: false,
    enabledTypes: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Load preferences
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await apiClient.get<{ preferences: NotificationPreferences }>('/notifications/preferences');

      if (response.success && response.data) {
        setPreferences(response.data.preferences);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await apiClient.patch('/notifications/preferences', preferences);

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Notification preferences saved',
        });
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSoundToggle = (enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, soundEnabled: enabled }));
  };

  const handleDesktopPushToggle = async (enabled: boolean) => {
    if (enabled && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({
          title: 'Permission Denied',
          description: 'Please enable desktop notifications in your browser settings',
          variant: 'destructive',
        });
        return;
      }
    }
    setPreferences((prev) => ({ ...prev, desktopPushEnabled: enabled }));
  };

  const handleTypeToggle = (type: string, enabled: boolean) => {
    setPreferences((prev) => {
      const enabledTypes = enabled
        ? [...prev.enabledTypes, type]
        : prev.enabledTypes.filter((t) => t !== type);
      return { ...prev, enabledTypes };
    });
  };

  const handleSelectAll = () => {
    setPreferences((prev) => ({
      ...prev,
      enabledTypes: notificationTypes.map((t) => t.type),
    }));
  };

  const handleDeselectAll = () => {
    setPreferences((prev) => ({
      ...prev,
      enabledTypes: [],
    }));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Preferences</h1>
        <p className="text-muted-foreground">
          Customize which notifications you want to receive and how you want to be notified.
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>Configure sound and desktop notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Sound Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Play a sound when you receive a notification
              </p>
            </div>
            <Switch
              checked={preferences.soundEnabled}
              onCheckedChange={handleSoundToggle}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Desktop Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Show browser notifications even when dashboard is not focused
              </p>
            </div>
            <Switch
              checked={preferences.desktopPushEnabled}
              onCheckedChange={handleDesktopPushToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Event Types</CardTitle>
              <CardDescription>
                Choose which types of events trigger notifications
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">
                {preferences.enabledTypes.length} / {notificationTypes.length} enabled
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={preferences.enabledTypes.length === notificationTypes.length}
              >
                <Check className="mr-1 h-4 w-4" />
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                disabled={preferences.enabledTypes.length === 0}
              >
                <X className="mr-1 h-4 w-4" />
                Deselect All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationTypes.map((notifType, index) => (
            <div key={notifType.type}>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <span className={`text-2xl ${notifType.color}`}>{notifType.icon}</span>
                  <div>
                    <Label className="text-base">{notifType.label}</Label>
                    <p className="text-sm text-muted-foreground">
                      {notifType.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.enabledTypes.includes(notifType.type)}
                  onCheckedChange={(enabled) => handleTypeToggle(notifType.type, enabled)}
                />
              </div>
              {index < notificationTypes.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={loadPreferences}
          disabled={saving}
        >
          Reset
        </Button>
        <Button
          onClick={savePreferences}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
