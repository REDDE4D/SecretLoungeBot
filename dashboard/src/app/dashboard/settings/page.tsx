'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2 } from 'lucide-react';
import { WelcomeMessageEditor } from '@/components/WelcomeMessageEditor';
import { TelegramPreview } from '@/components/TelegramPreview';

interface Settings {
  inviteOnly: boolean;
  slowmode: {
    enabled: boolean;
    seconds: number;
  };
  maintenance: {
    enabled: boolean;
    message: string;
  };
  welcome: {
    enabled: boolean;
    message: string;
  };
  rules: Array<{ emoji: string; text: string }>;
  spam: {
    flood: { enabled: boolean; maxIdentical: number };
    linkSpam: { enabled: boolean; maxLinks: number };
    rapidFire: { enabled: boolean; maxMessages: number };
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Settings>('/settings');
      if (response.success && response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (endpoint: string, data: any) => {
    try {
      setSaving(true);
      const response = await apiClient.put(`/settings/${endpoint}`, data);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Settings updated successfully',
        });
        fetchSettings();
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure bot settings and behavior
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="spam">Anti-Spam</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invite Mode</CardTitle>
              <CardDescription>Control who can join the lobby</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Invite-Only Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Require an invite code to join the lobby
                  </p>
                </div>
                <Switch
                  checked={settings.inviteOnly}
                  onCheckedChange={(checked) => updateSetting('invite-mode', { enabled: checked })}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
              <CardDescription>Temporarily disable bot access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Block all non-admin users from using the bot
                  </p>
                </div>
                <Switch
                  checked={settings.maintenance.enabled}
                  onCheckedChange={(checked) => {
                    setSettings({
                      ...settings,
                      maintenance: { ...settings.maintenance, enabled: checked },
                    });
                  }}
                  disabled={saving}
                />
              </div>
              {settings.maintenance.enabled && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Maintenance Message</Label>
                    <Textarea
                      value={settings.maintenance.message}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          maintenance: { ...settings.maintenance, message: e.target.value },
                        })
                      }
                      placeholder="The bot is currently under maintenance..."
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={() => updateSetting('maintenance', settings.maintenance)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Maintenance Settings
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Moderation Settings */}
        <TabsContent value="moderation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Slowmode</CardTitle>
              <CardDescription>Rate limit messages from users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Slowmode</Label>
                  <p className="text-sm text-muted-foreground">
                    Limit how often users can send messages
                  </p>
                </div>
                <Switch
                  checked={settings.slowmode.enabled}
                  onCheckedChange={(checked) => {
                    setSettings({
                      ...settings,
                      slowmode: { ...settings.slowmode, enabled: checked },
                    });
                  }}
                  disabled={saving}
                />
              </div>
              {settings.slowmode.enabled && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Delay (seconds)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="3600"
                      value={settings.slowmode.seconds}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          slowmode: { ...settings.slowmode, seconds: parseInt(e.target.value) || 0 },
                        })
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      Minimum seconds between messages (1-3600)
                    </p>
                  </div>
                  <Button
                    onClick={() => updateSetting('slowmode', settings.slowmode)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Slowmode Settings
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Settings */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Welcome Message</CardTitle>
              <CardDescription>Customize the welcome message for new users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Welcome Message</Label>
                  <p className="text-sm text-muted-foreground">
                    Send a welcome message when users join the lobby
                  </p>
                </div>
                <Switch
                  checked={settings.welcome.enabled}
                  onCheckedChange={(checked) => {
                    setSettings({
                      ...settings,
                      welcome: { ...settings.welcome, enabled: checked },
                    });
                  }}
                  disabled={saving}
                />
              </div>
              {settings.welcome.enabled && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Welcome Message</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Use the editor below to format your welcome message. The preview shows how it will appear in Telegram.
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Editor</Label>
                        <WelcomeMessageEditor
                          content={settings.welcome.message}
                          onChange={(html) =>
                            setSettings({
                              ...settings,
                              welcome: { ...settings.welcome, message: html },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Preview</Label>
                        <TelegramPreview html={settings.welcome.message} />
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => updateSetting('welcome', settings.welcome)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Welcome Message
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anti-Spam Settings */}
        <TabsContent value="spam" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flood Protection</CardTitle>
              <CardDescription>Prevent users from spamming identical messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Flood Protection</Label>
                  <p className="text-sm text-muted-foreground">
                    Detect and prevent identical message spam
                  </p>
                </div>
                <Switch
                  checked={settings.spam.flood.enabled}
                  onCheckedChange={(checked) => {
                    setSettings({
                      ...settings,
                      spam: {
                        ...settings.spam,
                        flood: { ...settings.spam.flood, enabled: checked },
                      },
                    });
                  }}
                  disabled={saving}
                />
              </div>
              {settings.spam.flood.enabled && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Max Identical Messages</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.spam.flood.maxIdentical}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          spam: {
                            ...settings.spam,
                            flood: {
                              ...settings.spam.flood,
                              maxIdentical: parseInt(e.target.value) || 1,
                            },
                          },
                        })
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Link Spam Protection</CardTitle>
              <CardDescription>Limit the number of links in messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Link Spam Protection</Label>
                  <p className="text-sm text-muted-foreground">
                    Limit URLs in messages
                  </p>
                </div>
                <Switch
                  checked={settings.spam.linkSpam.enabled}
                  onCheckedChange={(checked) => {
                    setSettings({
                      ...settings,
                      spam: {
                        ...settings.spam,
                        linkSpam: { ...settings.spam.linkSpam, enabled: checked },
                      },
                    });
                  }}
                  disabled={saving}
                />
              </div>
              {settings.spam.linkSpam.enabled && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Max Links Per Message</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={settings.spam.linkSpam.maxLinks}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          spam: {
                            ...settings.spam,
                            linkSpam: {
                              ...settings.spam.linkSpam,
                              maxLinks: parseInt(e.target.value) || 0,
                            },
                          },
                        })
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Button onClick={() => updateSetting('spam', settings.spam)} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Anti-Spam Settings
          </Button>
        </TabsContent>

        {/* Rules Settings */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lobby Rules</CardTitle>
              <CardDescription>Configure the rules displayed to users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.rules.map((rule, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={rule.emoji}
                    onChange={(e) => {
                      const newRules = [...settings.rules];
                      newRules[index].emoji = e.target.value;
                      setSettings({ ...settings, rules: newRules });
                    }}
                    className="w-20"
                    placeholder="📝"
                  />
                  <Input
                    value={rule.text}
                    onChange={(e) => {
                      const newRules = [...settings.rules];
                      newRules[index].text = e.target.value;
                      setSettings({ ...settings, rules: newRules });
                    }}
                    placeholder="Rule text..."
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const newRules = settings.rules.filter((_, i) => i !== index);
                      setSettings({ ...settings, rules: newRules });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  setSettings({
                    ...settings,
                    rules: [...settings.rules, { emoji: '📝', text: '' }],
                  });
                }}
              >
                Add Rule
              </Button>
              <Separator />
              <Button onClick={() => updateSetting('rules', { rules: settings.rules })} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Rules
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
