'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Check, X, Plus, Edit, Trash2 } from 'lucide-react';
import { CreateRoleDialog } from '@/components/permissions/CreateRoleDialog';
import { EditRoleDialog } from '@/components/permissions/EditRoleDialog';
import { DeleteRoleDialog } from '@/components/permissions/DeleteRoleDialog';
import SystemRoleEditDialog from '@/components/permissions/SystemRoleEditDialog';

interface Permission {
  id: string;
  key: string;
  action: string;
  description: string;
}

interface PermissionsByCategory {
  [category: string]: Permission[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
  isSystemRole: boolean;
  isEditable?: boolean;
  color: string;
  emoji?: string;
}

interface User {
  id: string;
  alias: string;
  icon: { fallback: string };
  role: string;
  inLobby: boolean;
  joinedAt: string;
}

interface UsersByRoleResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionsByCategory>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleUsers, setRoleUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSystemRoleEditDialog, setShowSystemRoleEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentTab, setCurrentTab] = useState('roles');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [permissionsRes, rolesRes] = await Promise.all([
        apiClient.get('/permissions'),
        apiClient.get('/permissions/roles'),
      ]);

      const permissionsData = permissionsRes as any;
      const rolesData = rolesRes as any;

      if (permissionsData.success) {
        setPermissions(permissionsData.data.permissions);
      }

      if (rolesData.success) {
        setRoles(rolesData.data.roles);
      }
    } catch (error) {
      console.error('Error fetching permissions data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permissions data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleUsers = async (role: Role) => {
    try {
      setLoadingUsers(true);
      setSelectedRole(role);
      setShowUsersDialog(true);

      const response = await apiClient.get(`/permissions/roles/${role.id}/users`);
      const data = response as any;

      if (data.success) {
        setRoleUsers(data.data.users);
      }
    } catch (error) {
      console.error('Error fetching role users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users for this role',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const hasPermission = (role: Role, permissionId: string): boolean => {
    return role.permissions.includes(permissionId);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    if (role.isSystemRole) {
      setShowSystemRoleEditDialog(true);
    } else {
      setShowEditDialog(true);
    }
  };

  const handleDeleteRole = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteDialog(true);
  };

  const handleRoleChange = () => {
    // Refresh data after create/edit/delete
    fetchData();
  };

  const handleSystemRoleSave = async (updates: any) => {
    if (!selectedRole) return;

    try {
      const response = await apiClient.put(`/permissions/roles/${selectedRole.id}`, updates);
      const data = response as any;

      if (data.success) {
        toast({
          title: 'Success',
          description: 'System role updated successfully',
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error updating system role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update system role',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getRoleBadgeColor = (color: string) => {
    const colors: { [key: string]: string } = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      gray: 'bg-gray-500',
    };
    return colors[color] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permissions Management</h1>
          <p className="text-muted-foreground mt-2">Manage roles and their permissions</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Role
        </Button>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">Roles Overview</TabsTrigger>
          <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
          <TabsTrigger value="permissions">All Permissions</TabsTrigger>
        </TabsList>

        {/* Roles Overview Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {role.emoji && <span>{role.emoji}</span>}
                      {role.name}
                    </CardTitle>
                    <Shield className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Users</span>
                    <span className="font-semibold">{role.userCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Permissions</span>
                    <span className="font-semibold">{role.permissions.length}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fetchRoleUsers(role)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Users
                  </Button>
                  {/* Show edit button for custom roles and editable system roles (not Owner) */}
                  {(!role.isSystemRole || (role.isEditable && role.id !== 'owner')) && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditRole(role)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      {!role.isSystemRole && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDeleteRole(role)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                  {role.isSystemRole && (
                    <div className="text-xs text-center text-muted-foreground">
                      System Role
                      {role.id === 'owner' && ' (Protected)'}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Permission Matrix Tab */}
        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>
                View which permissions are assigned to each role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Permission</TableHead>
                      {roles.map((role) => (
                        <TableHead key={role.id} className="text-center">
                          <div className="flex flex-col items-center">
                            {role.emoji && (
                              <span className="text-xl mb-1">{role.emoji}</span>
                            )}
                            <Badge className={getRoleBadgeColor(role.color) + ' mb-1'}>
                              {role.name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{role.userCount} users</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(permissions).map(([category, perms]) => (
                      <>
                        <TableRow key={`category-${category}`} className="bg-muted/50 dark:bg-muted/30">
                          <TableCell colSpan={roles.length + 1} className="font-semibold text-foreground">
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </TableCell>
                        </TableRow>
                        {perms.map((perm) => (
                          <TableRow key={perm.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{perm.id}</div>
                                <div className="text-sm text-muted-foreground">{perm.description}</div>
                              </div>
                            </TableCell>
                            {roles.map((role) => (
                              <TableCell key={`${perm.id}-${role.id}`} className="text-center">
                                {hasPermission(role, perm.id) ? (
                                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Permissions Tab */}
        <TabsContent value="permissions">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(permissions).map(([category, perms]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">{category}</CardTitle>
                  <CardDescription>{perms.length} permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {perms.map((perm) => (
                      <div
                        key={perm.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors"
                      >
                        <div className="font-medium text-sm">{perm.id}</div>
                        <div className="text-xs text-muted-foreground mt-1">{perm.description}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Users Dialog */}
      <Dialog open={showUsersDialog} onOpenChange={setShowUsersDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRole?.name} Users
              <Badge className={`ml-2 ${getRoleBadgeColor(selectedRole?.color || 'gray')}`}>
                {roleUsers.length} total
              </Badge>
            </DialogTitle>
            <DialogDescription>Users with the {selectedRole?.name} role</DialogDescription>
          </DialogHeader>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : roleUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users with this role
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{user.icon.fallback}</span>
                        <span className="font-medium">{user.alias}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.inLobby ? 'default' : 'secondary'}>
                        {user.inLobby ? 'In Lobby' : 'Left'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.joinedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <CreateRoleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        permissions={permissions}
        onRoleCreated={handleRoleChange}
      />

      {/* Edit Role Dialog */}
      <EditRoleDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        role={selectedRole}
        permissions={permissions}
        onRoleUpdated={handleRoleChange}
      />

      {/* Delete Role Dialog */}
      <DeleteRoleDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        role={selectedRole}
        onRoleDeleted={handleRoleChange}
      />

      {/* System Role Edit Dialog */}
      {showSystemRoleEditDialog && selectedRole && (
        <SystemRoleEditDialog
          role={selectedRole}
          allPermissions={permissions}
          onClose={() => setShowSystemRoleEditDialog(false)}
          onSave={handleSystemRoleSave}
        />
      )}
    </div>
  );
}
