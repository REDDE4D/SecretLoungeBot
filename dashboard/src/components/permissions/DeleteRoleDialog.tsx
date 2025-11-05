'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  isSystemRole: boolean;
}

interface DeleteRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  onRoleDeleted: () => void;
}

export function DeleteRoleDialog({
  open,
  onOpenChange,
  role,
  onRoleDeleted
}: DeleteRoleDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!role) {
      return;
    }

    try {
      setLoading(true);

      const response = await apiClient.delete(`/permissions/roles/${role.id}`);

      if (response.success) {
        toast({
          title: 'Success',
          description: `Role "${role.name}" deleted successfully`,
        });
        onRoleDeleted();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete role',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return null;
  }

  // Prevent deleting system roles
  if (role.isSystemRole) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Delete System Role</DialogTitle>
            <DialogDescription>
              System roles (admin, mod, whitelist) cannot be deleted. They are built into the bot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Role
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this role? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Role Info */}
          <div className="rounded-lg border p-4 space-y-2">
            <div>
              <span className="text-sm font-semibold">Role Name:</span>
              <p className="text-sm text-muted-foreground">{role.name}</p>
            </div>
            <div>
              <span className="text-sm font-semibold">Description:</span>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </div>
            <div>
              <span className="text-sm font-semibold">Users Assigned:</span>
              <p className="text-sm text-muted-foreground">{role.userCount}</p>
            </div>
          </div>

          {/* Warning */}
          {role.userCount > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This role is currently assigned to <strong>{role.userCount}</strong> user{role.userCount !== 1 ? 's' : ''}.
                Deleting it will remove this role from all assigned users.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
