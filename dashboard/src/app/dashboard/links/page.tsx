'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Link, Shield, Trash2, Plus, Search, Globe, Link2 } from 'lucide-react';

interface WhitelistEntry {
  _id: string;
  pattern: string;
  type: 'domain' | 'full_url';
  notes: string;
  addedBy: string;
  active: boolean;
  createdAt: string;
}

interface UserPermission {
  _id: string;
  alias: string;
  icon: { fallback: string };
  role: string;
  inLobby: boolean;
  canPostLinks: boolean;
}

interface Stats {
  whitelist: {
    total: number;
    active: number;
    domains: number;
    urls: number;
  };
  permissions: {
    usersWithPermission: number;
  };
}

export default function LinksManagement() {
  const { toast } = useToast();
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('whitelist');

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPattern, setNewPattern] = useState('');
  const [newType, setNewType] = useState<'domain' | 'full_url'>('domain');
  const [newNotes, setNewNotes] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [whitelistRes, permissionsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/links/whitelist`, { credentials: 'include' }),
        fetch(`${API_BASE}/links/permissions`, { credentials: 'include' }),
        fetch(`${API_BASE}/links/stats`, { credentials: 'include' }),
      ]);

      if (whitelistRes.ok) {
        const data = await whitelistRes.json();
        setWhitelistEntries(data.data || []);
      }

      if (permissionsRes.ok) {
        const data = await permissionsRes.json();
        setUserPermissions(data.data || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch link management data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addWhitelist = async () => {
    if (!newPattern.trim()) {
      toast({
        title: 'Error',
        description: 'Pattern is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/links/whitelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pattern: newPattern,
          type: newType,
          notes: newNotes,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Pattern whitelisted successfully',
        });
        setAddDialogOpen(false);
        setNewPattern('');
        setNewNotes('');
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to add whitelist entry',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding whitelist:', error);
      toast({
        title: 'Error',
        description: 'Failed to add whitelist entry',
        variant: 'destructive',
      });
    }
  };

  const deleteWhitelist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this whitelist entry?')) return;

    try {
      const response = await fetch(`${API_BASE}/links/whitelist/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Whitelist entry deleted',
        });
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete whitelist entry',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting whitelist:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete whitelist entry',
        variant: 'destructive',
      });
    }
  };

  const toggleWhitelistActive = async (id: string, active: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/links/whitelist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Whitelist entry ${active ? 'enabled' : 'disabled'}`,
        });
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update whitelist entry',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating whitelist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update whitelist entry',
        variant: 'destructive',
      });
    }
  };

  const toggleUserPermission = async (userId: string, canPostLinks: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/links/permissions/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ canPostLinks }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Link permission ${canPostLinks ? 'granted' : 'revoked'}`,
        });
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update user permission',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user permission',
        variant: 'destructive',
      });
    }
  };

  const filteredWhitelist = whitelistEntries.filter((entry) =>
    entry.pattern.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPermissions = userPermissions.filter((user) =>
    user.alias.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Link Management</h1>
          <p className="text-muted-foreground">
            Manage whitelisted links and user permissions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Whitelisted</CardTitle>
              <Link className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.whitelist.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.whitelist.active} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Domains</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.whitelist.domains}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Full URLs</CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.whitelist.urls}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users with Permission</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.permissions.usersWithPermission}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="whitelist">Whitelist</TabsTrigger>
          <TabsTrigger value="permissions">User Permissions</TabsTrigger>
        </TabsList>

        {/* Whitelist Tab */}
        <TabsContent value="whitelist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Link Whitelist</CardTitle>
                  <CardDescription>
                    Manage whitelisted domains and URLs that users can post
                  </CardDescription>
                </div>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Whitelist
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Whitelisted Pattern</DialogTitle>
                      <DialogDescription>
                        Add a domain or URL that users can post in the lobby
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="pattern">Pattern</Label>
                        <Input
                          id="pattern"
                          placeholder="example.com or https://example.com/page"
                          value={newPattern}
                          onChange={(e) => setNewPattern(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={newType}
                          onValueChange={(value: 'domain' | 'full_url') =>
                            setNewType(value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="domain">Domain</SelectItem>
                            <SelectItem value="full_url">Full URL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Textarea
                          id="notes"
                          placeholder="Add any notes about this whitelist entry"
                          value={newNotes}
                          onChange={(e) => setNewNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={addWhitelist}>Add Whitelist</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patterns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWhitelist.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No whitelisted patterns found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWhitelist.map((entry) => (
                      <TableRow key={entry._id}>
                        <TableCell className="font-mono">{entry.pattern}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {entry.type === 'domain' ? (
                              <>
                                <Globe className="mr-1 h-3 w-3" />
                                Domain
                              </>
                            ) : (
                              <>
                                <Link2 className="mr-1 h-3 w-3" />
                                Full URL
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {entry.notes || '-'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={entry.active}
                            onCheckedChange={(checked) =>
                              toggleWhitelistActive(entry._id, checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteWhitelist(entry._id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Link Permissions</CardTitle>
              <CardDescription>
                Manage which users can post any links (admins and mods can always post
                links)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Can Post Links</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPermissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No users with link permission found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPermissions.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{user.icon?.fallback || '👤'}</span>
                            <span>{user.alias}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.role ? (
                            <Badge>{user.role}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.inLobby ? (
                            <Badge variant="outline" className="bg-green-50">
                              Online
                            </Badge>
                          ) : (
                            <Badge variant="outline">Offline</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={user.canPostLinks}
                            onCheckedChange={(checked) =>
                              toggleUserPermission(user._id, checked)
                            }
                            disabled={user.role === 'admin' || user.role === 'mod'}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
