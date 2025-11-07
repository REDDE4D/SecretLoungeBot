'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Search, MoreVertical, Ban, Volume2, UserX, AlertTriangle, Image, Shield } from 'lucide-react';
import { AssignRolesDialog } from '@/components/users/AssignRolesDialog';

interface User {
  id: string;
  alias: string;
  icon: { fallback: string };
  role: string | null;
  customRoles?: string[];
  inLobby: boolean;
  status: string;
  joinDate: string;
  totalMessages: number;
  warnings: number;
  isBanned: boolean;
  isMuted: boolean;
  mediaRestricted: boolean;
}

interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [lobbyFilter, setLobbyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'ban' | 'mute' | 'kick' | 'warn' | 'media' | null;
    duration?: number;
    reason?: string;
  }>({ open: false, type: null });
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchTerm, roleFilter, lobbyFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (lobbyFilter !== 'all') params.append('inLobby', lobbyFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await apiClient.get<UserListResponse>(`/users?${params.toString()}`);
      if (response.success && response.data) {
        setUsers(response.data.users);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async () => {
    if (!selectedUser || !actionDialog.type) return;

    try {
      let endpoint = '';
      let body: any = {
        reason: actionDialog.reason || '',
      };

      switch (actionDialog.type) {
        case 'ban':
          endpoint = `/users/${selectedUser.id}/ban`;
          body.duration = actionDialog.duration || null;
          break;
        case 'mute':
          endpoint = `/users/${selectedUser.id}/mute`;
          body.duration = actionDialog.duration || 3600;
          break;
        case 'kick':
          endpoint = `/users/${selectedUser.id}/kick`;
          break;
        case 'warn':
          endpoint = `/users/${selectedUser.id}/warn`;
          break;
        case 'media':
          endpoint = `/users/${selectedUser.id}/media-restriction`;
          body = { restricted: !selectedUser.mediaRestricted };
          break;
      }

      // Use PUT for media restriction, POST for all other actions
      const response = actionDialog.type === 'media'
        ? await apiClient.put(endpoint, body)
        : await apiClient.post(endpoint, body);

      if (response.success) {
        toast({
          title: 'Success',
          description: `User ${actionDialog.type} action completed`,
        });
        setActionDialog({ open: false, type: null });
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error('Action failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform action',
        variant: 'destructive',
      });
    }
  };

  const openActionDialog = (user: User, type: 'ban' | 'mute' | 'kick' | 'warn' | 'media') => {
    setSelectedUser(user);
    setActionDialog({ open: true, type, duration: 0, reason: '' });
  };

  const openRolesDialog = (user: User) => {
    setSelectedUser(user);
    setRolesDialogOpen(true);
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) return null;
    const roleConfig: Record<string, { color: string; emoji: string }> = {
      owner: { color: 'bg-purple-500 text-white', emoji: '🔱' },
      admin: { color: 'bg-red-500 text-white', emoji: '👑' },
      mod: { color: 'bg-blue-500 text-white', emoji: '🛡️' },
      whitelist: { color: 'bg-green-500 text-white', emoji: '⭐' },
    };
    const config = roleConfig[role] || { color: 'bg-gray-500 text-white', emoji: '' };
    return (
      <Badge className={config.color}>
        {config.emoji && <span className="mr-1">{config.emoji}</span>}
        {role}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      online: 'bg-green-500',
      idle: 'bg-yellow-500',
      offline: 'bg-gray-500',
    };
    return (
      <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-gray-500'}`} />
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">
          Manage all registered users, their roles, and moderation actions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search alias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="mod">Moderator</SelectItem>
                <SelectItem value="whitelist">Whitelist</SelectItem>
                <SelectItem value="null">Regular</SelectItem>
              </SelectContent>
            </Select>
            <Select value={lobbyFilter} onValueChange={setLobbyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by lobby" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="true">In Lobby</SelectItem>
                <SelectItem value="false">Not in Lobby</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alias</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lobby</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Warnings</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{user.icon.fallback}</span>
                          <span>{user.alias}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getRoleBadge(user.role)}
                          {user.customRoles && user.customRoles.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.customRoles.length} custom
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(user.status)}
                          <span className="text-sm">{user.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.inLobby ? (
                          <Badge variant="outline">In Lobby</Badge>
                        ) : (
                          <Badge variant="outline" className="opacity-50">
                            Not in Lobby
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{user.totalMessages}</TableCell>
                      <TableCell>
                        {user.warnings > 0 && (
                          <Badge variant="destructive">{user.warnings}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.isBanned && <Badge variant="destructive">Banned</Badge>}
                          {user.isMuted && <Badge variant="destructive">Muted</Badge>}
                          {user.mediaRestricted && <Badge variant="destructive">Media Restricted</Badge>}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openRolesDialog(user)}>
                                <Shield className="mr-2 h-4 w-4" />
                                Manage Roles
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openActionDialog(user, 'ban')}>
                                <Ban className="mr-2 h-4 w-4" />
                                Ban User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openActionDialog(user, 'mute')}>
                                <Volume2 className="mr-2 h-4 w-4" />
                                Mute User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openActionDialog(user, 'kick')}>
                                <UserX className="mr-2 h-4 w-4" />
                                Kick from Lobby
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openActionDialog(user, 'warn')}>
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Issue Warning
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openActionDialog(user, 'media')}>
                                <Image className="mr-2 h-4 w-4" />
                                Toggle Media Restriction
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Roles Dialog */}
      <AssignRolesDialog
        open={rolesDialogOpen}
        onOpenChange={setRolesDialogOpen}
        user={selectedUser}
        onRolesUpdated={fetchUsers}
      />

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'ban' && 'Ban User'}
              {actionDialog.type === 'mute' && 'Mute User'}
              {actionDialog.type === 'kick' && 'Kick User'}
              {actionDialog.type === 'warn' && 'Issue Warning'}
              {actionDialog.type === 'media' && 'Toggle Media Restriction'}
            </DialogTitle>
            <DialogDescription>
              User: {selectedUser?.alias}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {(actionDialog.type === 'ban' || actionDialog.type === 'mute') && (
              <div>
                <Label>Duration (seconds, 0 for permanent)</Label>
                <Input
                  type="number"
                  value={actionDialog.duration || 0}
                  onChange={(e) =>
                    setActionDialog({ ...actionDialog, duration: parseInt(e.target.value) })
                  }
                  placeholder="0 for permanent"
                />
              </div>
            )}

            {actionDialog.type !== 'media' && (
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={actionDialog.reason || ''}
                  onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
                  placeholder="Enter reason for this action..."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, type: null })}>
              Cancel
            </Button>
            <Button onClick={handleUserAction}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
