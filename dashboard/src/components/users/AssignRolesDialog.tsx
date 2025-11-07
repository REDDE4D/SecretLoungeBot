'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';
import { Loader2, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CustomRole {
  id: string;
  roleId: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  isSystemRole: boolean;
}

interface User {
  id: string;
  alias: string;
  role: string | null;
  customRoles?: string[];
}

interface AssignRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onRolesUpdated: () => void;
}

export function AssignRolesDialog({
  open,
  onOpenChange,
  user,
  onRolesUpdated
}: AssignRolesDialogProps) {
  const [systemRole, setSystemRole] = useState<string | null>(null);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [availableCustomRoles, setAvailableCustomRoles] = useState<CustomRole[]>([]);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const { toast } = useToast();

  // Load user data and available roles when dialog opens
  useEffect(() => {
    if (user && open) {
      setSystemRole(user.role);
      setCustomRoles(user.customRoles || []);
      loadAvailableRoles();
    }
  }, [user, open]);

  const loadAvailableRoles = async () => {
    setLoadingRoles(true);
    try {
      const response = await apiClient.get('/permissions/roles') as any;
      if (response.data.success) {
        // Filter out system roles (owner, admin, mod, whitelist)
        const customRolesOnly = response.data.data.filter(
          (role: CustomRole) => !role.isSystemRole
        );
        setAvailableCustomRoles(customRolesOnly);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading roles',
        description: error.response?.data?.error || 'Failed to load available roles',
        variant: 'destructive',
      });
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleClose = () => {
    setSelectedRoleToAdd('');
    onOpenChange(false);
  };

  const handleAddCustomRole = () => {
    if (!selectedRoleToAdd) return;

    if (customRoles.includes(selectedRoleToAdd)) {
      toast({
        title: 'Role already assigned',
        description: 'This role is already assigned to the user',
        variant: 'destructive',
      });
      return;
    }

    setCustomRoles(prev => [...prev, selectedRoleToAdd]);
    setSelectedRoleToAdd('');
  };

  const handleRemoveCustomRole = (roleId: string) => {
    setCustomRoles(prev => prev.filter(r => r !== roleId));
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update system role if changed
      if (systemRole !== user.role) {
        await apiClient.put(`/users/${user.id}/role`, { role: systemRole });
      }

      // Add new custom roles
      const rolesToAdd = customRoles.filter(r => !user.customRoles?.includes(r));
      for (const roleId of rolesToAdd) {
        await apiClient.post(`/users/${user.id}/roles`, { roleId });
      }

      // Remove custom roles that were removed
      const rolesToRemove = (user.customRoles || []).filter(r => !customRoles.includes(r));
      for (const roleId of rolesToRemove) {
        await apiClient.delete(`/users/${user.id}/roles/${roleId}`);
      }

      toast({
        title: 'Roles updated',
        description: 'User roles have been updated successfully',
      });

      onRolesUpdated();
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Error updating roles',
        description: error.response?.data?.error || 'Failed to update user roles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleDetails = (roleId: string) => {
    return availableCustomRoles.find(r => r.roleId === roleId);
  };

  const availableRolesToAdd = availableCustomRoles.filter(
    r => !customRoles.includes(r.roleId)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Roles - {user?.alias}</DialogTitle>
          <DialogDescription>
            Assign system roles and custom roles to this user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* System Role */}
          <div className="space-y-2">
            <Label>System Role</Label>
            <Select
              value={systemRole || 'none'}
              onValueChange={(value) => setSystemRole(value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select system role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="mod">Moderator</SelectItem>
                <SelectItem value="whitelist">Whitelist</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              System roles grant predefined permission sets
            </p>
          </div>

          {/* Custom Roles */}
          <div className="space-y-2">
            <Label>Custom Roles</Label>

            {/* Current custom roles */}
            {customRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {customRoles.map((roleId) => {
                  const roleDetails = getRoleDetails(roleId);
                  return (
                    <div
                      key={roleId}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-sm text-white"
                      style={{ backgroundColor: roleDetails?.color || '#6B7280' }}
                    >
                      {roleDetails?.icon && <span>{roleDetails.icon}</span>}
                      <span>{roleDetails?.name || roleId}</span>
                      <button
                        onClick={() => handleRemoveCustomRole(roleId)}
                        className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-3">No custom roles assigned</p>
            )}

            {/* Add new custom role */}
            <div className="flex gap-2">
              <Select
                value={selectedRoleToAdd}
                onValueChange={setSelectedRoleToAdd}
                disabled={loadingRoles || availableRolesToAdd.length === 0}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={
                    loadingRoles
                      ? "Loading roles..."
                      : availableRolesToAdd.length === 0
                        ? "No roles available"
                        : "Select role to add"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableRolesToAdd.map((role) => (
                    <SelectItem key={role.roleId} value={role.roleId}>
                      <div className="flex items-center gap-2">
                        {role.icon && <span>{role.icon}</span>}
                        <span>{role.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddCustomRole}
                disabled={!selectedRoleToAdd || loading}
                variant="outline"
              >
                Add
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Users can have multiple custom roles with combined permissions
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
