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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';
import { PermissionGrid } from './PermissionGrid';
import { Loader2 } from 'lucide-react';

interface Permission {
  id: string;
  key: string;
  action: string;
  description: string;
}

interface PermissionsByCategory {
  [category: string]: Permission[];
}

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: PermissionsByCategory;
  onRoleCreated: () => void;
}

const COLOR_OPTIONS = [
  { value: '#EF4444', label: 'Red', class: 'bg-red-500' },
  { value: '#3B82F6', label: 'Blue', class: 'bg-blue-500' },
  { value: '#10B981', label: 'Green', class: 'bg-green-500' },
  { value: '#F59E0B', label: 'Amber', class: 'bg-amber-500' },
  { value: '#8B5CF6', label: 'Purple', class: 'bg-purple-500' },
  { value: '#EC4899', label: 'Pink', class: 'bg-pink-500' },
  { value: '#6B7280', label: 'Gray', class: 'bg-gray-500' },
];

export function CreateRoleDialog({
  open,
  onOpenChange,
  permissions,
  onRoleCreated
}: CreateRoleDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [icon, setIcon] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor('#3B82F6');
    setIcon('');
    setSelectedPermissions([]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const validateForm = () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Role name is required',
        variant: 'destructive',
      });
      return false;
    }

    if (name.length < 2 || name.length > 32) {
      toast({
        title: 'Validation Error',
        description: 'Role name must be between 2 and 32 characters',
        variant: 'destructive',
      });
      return false;
    }

    if (!description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Role description is required',
        variant: 'destructive',
      });
      return false;
    }

    if (selectedPermissions.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one permission',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const response = await apiClient.post('/permissions/roles', {
        name: name.trim(),
        description: description.trim(),
        color,
        icon: icon.trim() || undefined,
        permissions: selectedPermissions,
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: `Role "${name}" created successfully`,
        });
        resetForm();
        onRoleCreated();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create role',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Role</DialogTitle>
          <DialogDescription>
            Create a new custom role with specific permissions. Users can be assigned multiple custom roles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Role Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Role Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Support Team, Content Manager"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
            />
            <p className="text-xs text-muted-foreground">
              2-32 characters. This will be displayed to users.
            </p>
          </div>

          {/* Role Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the purpose and responsibilities of this role..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Icon (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="icon">Icon (Optional)</Label>
            <Input
              id="icon"
              placeholder="🛠️"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={2}
              className="w-20"
            />
            <p className="text-xs text-muted-foreground">
              Single emoji to represent this role
            </p>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={`w-8 h-8 rounded-full ${colorOption.class} ${
                    color === colorOption.value
                      ? 'ring-2 ring-offset-2 ring-gray-900'
                      : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-400'
                  }`}
                  title={colorOption.label}
                />
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Permissions *</Label>
              <span className="text-xs text-muted-foreground">
                {selectedPermissions.length} selected
              </span>
            </div>
            <PermissionGrid
              permissions={permissions}
              selectedPermissions={selectedPermissions}
              onPermissionToggle={handlePermissionToggle}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
