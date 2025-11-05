'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Power, Copy } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

interface Filter {
  _id: string;
  pattern: string;
  isRegex: boolean;
  createdBy: string;
  action: string;
  active: boolean;
  notes?: string;
}

interface Invite {
  code: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  notes: string;
  state: string;
  createdAt: string;
}

interface Pin {
  _id: string;
  type: string;
  message?: string;
  createdAt: string;
}

export default function ContentPage() {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDialog, setFilterDialog] = useState(false);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [pinDialog, setPinDialog] = useState(false);
  const [newFilter, setNewFilter] = useState({
    pattern: '',
    isRegex: false,
    notes: '',
  });
  const [newInvite, setNewInvite] = useState({
    maxUses: '',
    expiry: '',
    notes: '',
  });
  const [newPin, setNewPin] = useState({ message: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchAllContent();
  }, []);

  const fetchAllContent = async () => {
    try {
      setLoading(true);
      const [filtersRes, invitesRes, pinsRes] = await Promise.all([
        apiClient.get<{ filters: Filter[] }>('/content/filters'),
        apiClient.get<{ invites: Invite[] }>('/content/invites'),
        apiClient.get<{ pins: Pin[] }>('/content/pins'),
      ]);

      if (filtersRes.success && filtersRes.data) setFilters(filtersRes.data.filters);
      if (invitesRes.success && invitesRes.data) setInvites(invitesRes.data.invites);
      if (pinsRes.success && pinsRes.data) setPins(pinsRes.data.pins);
    } catch (error) {
      console.error('Failed to fetch content:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch content',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createFilter = async () => {
    try {
      const response = await apiClient.post('/content/filters', newFilter);
      if (response.success) {
        toast({ title: 'Success', description: 'Filter created successfully' });
        setFilterDialog(false);
        setNewFilter({ pattern: '', isRegex: false, notes: '' });
        fetchAllContent();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create filter', variant: 'destructive' });
    }
  };

  const deleteFilter = async (id: string) => {
    try {
      const response = await apiClient.delete(`/content/filters/${id}`);
      if (response.success) {
        toast({ title: 'Success', description: 'Filter deleted successfully' });
        fetchAllContent();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete filter', variant: 'destructive' });
    }
  };

  const toggleFilter = async (id: string, active: boolean) => {
    try {
      const response = await apiClient.put(`/content/filters/${id}`, { active });
      if (response.success) {
        toast({ title: 'Success', description: 'Filter updated successfully' });
        fetchAllContent();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update filter', variant: 'destructive' });
    }
  };

  const createInvite = async () => {
    try {
      // Prepare invite data with proper types and field names
      const inviteData: any = {};

      // Convert maxUses to number if provided
      if (newInvite.maxUses && newInvite.maxUses.trim() !== '') {
        inviteData.maxUses = parseInt(newInvite.maxUses);
      }

      // Rename expiry to expiresAt
      if (newInvite.expiry && newInvite.expiry.trim() !== '') {
        inviteData.expiresAt = newInvite.expiry.trim();
      }

      // Include notes if provided
      if (newInvite.notes && newInvite.notes.trim() !== '') {
        inviteData.notes = newInvite.notes.trim();
      }

      const response = await apiClient.post('/content/invites', inviteData);
      if (response.success) {
        toast({ title: 'Success', description: 'Invite created successfully' });
        setInviteDialog(false);
        setNewInvite({ maxUses: '', expiry: '', notes: '' });
        fetchAllContent();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create invite', variant: 'destructive' });
    }
  };

  const deleteInvite = async (code: string) => {
    try {
      const response = await apiClient.delete(`/content/invites/${code}`);
      if (response.success) {
        toast({ title: 'Success', description: 'Invite deleted successfully' });
        fetchAllContent();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete invite', variant: 'destructive' });
    }
  };

  const toggleInvite = async (code: string, currentState: string) => {
    try {
      const newState = currentState === 'active' ? 'revoked' : 'active';
      const response = await apiClient.put(`/content/invites/${code}`, { state: newState });
      if (response.success) {
        toast({ title: 'Success', description: `Invite ${newState}` });
        fetchAllContent();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update invite', variant: 'destructive' });
    }
  };

  const createPin = async () => {
    try {
      const response = await apiClient.post('/content/pins', { message: newPin.message });
      if (response.success) {
        toast({ title: 'Success', description: 'Pin created successfully' });
        setPinDialog(false);
        setNewPin({ message: '' });
        fetchAllContent();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create pin', variant: 'destructive' });
    }
  };

  const deletePin = async (id: string) => {
    try {
      const response = await apiClient.delete(`/content/pins/${id}`);
      if (response.success) {
        toast({ title: 'Success', description: 'Pin deleted successfully' });
        fetchAllContent();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete pin', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Invite code copied to clipboard' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Content Management</h2>
        <p className="text-muted-foreground">
          Manage content filters, invite codes, and pinned messages
        </p>
      </div>

      <Tabs defaultValue="filters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="filters">Content Filters</TabsTrigger>
          <TabsTrigger value="invites">Invite Codes</TabsTrigger>
          <TabsTrigger value="pins">Pinned Messages</TabsTrigger>
        </TabsList>

        {/* Content Filters */}
        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Content Filters</CardTitle>
                  <CardDescription>Block messages matching specific patterns</CardDescription>
                </div>
                <Button onClick={() => setFilterDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading filters...</div>
              ) : filters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No filters found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pattern</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filters.map((filter) => (
                      <TableRow key={filter._id}>
                        <TableCell className="font-mono">{filter.pattern}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{filter.isRegex ? 'Regex' : 'Keyword'}</Badge>
                        </TableCell>
                        <TableCell>
                          {filter.active ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{filter.notes}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleFilter(filter._id, !filter.active)}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteFilter(filter._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invite Codes */}
        <TabsContent value="invites" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invite Codes</CardTitle>
                  <CardDescription>Manage lobby invite codes</CardDescription>
                </div>
                <Button onClick={() => setInviteDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Invite
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading invites...</div>
              ) : invites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No invites found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.code}>
                        <TableCell className="font-mono flex items-center gap-2">
                          <span>{invite.code}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(invite.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          {invite.usedCount} / {invite.maxUses || '∞'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              invite.state === 'active'
                                ? 'bg-green-500'
                                : invite.state === 'revoked'
                                ? 'bg-red-500'
                                : 'bg-gray-500'
                            }
                          >
                            {invite.state}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invite.expiresAt ? formatDate(invite.expiresAt) : 'Never'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{invite.notes}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleInvite(invite.code, invite.state)}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteInvite(invite.code)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pinned Messages */}
        <TabsContent value="pins" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pinned Messages</CardTitle>
                  <CardDescription>Manage announcements pinned in all chats</CardDescription>
                </div>
                <Button onClick={() => setPinDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Pin
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading pins...</div>
              ) : pins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No pins found</div>
              ) : (
                <div className="space-y-3">
                  {pins.map((pin) => (
                    <Card key={pin._id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Badge variant="outline" className="mb-2">
                              {pin.type}
                            </Badge>
                            {pin.message && <p className="text-sm">{pin.message}</p>}
                            <p className="text-xs text-muted-foreground mt-2">
                              Created: {formatDateTime(pin.createdAt)}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deletePin(pin._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Filter Dialog */}
      <Dialog open={filterDialog} onOpenChange={setFilterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Content Filter</DialogTitle>
            <DialogDescription>Block messages matching a pattern</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pattern</Label>
              <Input
                value={newFilter.pattern}
                onChange={(e) => setNewFilter({ ...newFilter, pattern: e.target.value })}
                placeholder="spam|scam"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="regex"
                checked={newFilter.isRegex}
                onCheckedChange={(checked) =>
                  setNewFilter({ ...newFilter, isRegex: checked as boolean })
                }
              />
              <Label htmlFor="regex">Use as regex pattern</Label>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={newFilter.notes}
                onChange={(e) => setNewFilter({ ...newFilter, notes: e.target.value })}
                placeholder="Description of this filter..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFilterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createFilter}>Create Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invite Dialog */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invite Code</DialogTitle>
            <DialogDescription>Generate a new lobby invite code</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Max Uses (leave empty for unlimited)</Label>
              <Input
                type="number"
                value={newInvite.maxUses}
                onChange={(e) => setNewInvite({ ...newInvite, maxUses: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry (e.g., 7d, 24h, 2025-12-31)</Label>
              <Input
                value={newInvite.expiry}
                onChange={(e) => setNewInvite({ ...newInvite, expiry: e.target.value })}
                placeholder="Never"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newInvite.notes}
                onChange={(e) => setNewInvite({ ...newInvite, notes: e.target.value })}
                placeholder="Description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createInvite}>Create Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Pin Dialog */}
      <Dialog open={pinDialog} onOpenChange={setPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Pinned Announcement</DialogTitle>
            <DialogDescription>Pin a message in all user chats</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={newPin.message}
                onChange={(e) => setNewPin({ message: e.target.value })}
                placeholder="Important announcement..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createPin}>Create Pin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
