'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Permission {
  id: string;
  key: string;
  action: string;
  description: string;
}

interface PermissionsByCategory {
  [category: string]: Permission[];
}

interface PermissionGridProps {
  permissions: PermissionsByCategory;
  selectedPermissions: string[];
  onPermissionToggle: (permissionId: string) => void;
}

export function PermissionGrid({
  permissions,
  selectedPermissions,
  onPermissionToggle
}: PermissionGridProps) {
  const handleToggle = (permissionId: string) => {
    onPermissionToggle(permissionId);
  };

  const isSelected = (permissionId: string) => {
    return selectedPermissions.includes(permissionId);
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      dashboard: '🖥️',
      stats: '📊',
      users: '👥',
      settings: '⚙️',
      content: '📝',
      moderation: '🔨',
      permissions: '🔐',
    };
    return icons[category] || '📋';
  };

  const getCategoryDescription = (category: string, count: number) => {
    const descriptions: { [key: string]: string } = {
      dashboard: 'Access to dashboard interface',
      stats: 'View statistics and analytics',
      users: 'Manage users and roles',
      settings: 'Configure bot settings',
      content: 'Manage filters, invites, and pins',
      moderation: 'Handle reports and audit logs',
      permissions: 'Manage roles and permissions',
    };
    return `${descriptions[category] || 'Various permissions'} (${count})`;
  };

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {Object.entries(permissions).map(([category, perms]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{getCategoryIcon(category)}</span>
                <span className="capitalize">{category}</span>
              </CardTitle>
              <CardDescription className="text-xs">
                {getCategoryDescription(category, perms.length)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {perms.map((perm) => (
                <div key={perm.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={perm.id}
                    checked={isSelected(perm.id)}
                    onCheckedChange={() => handleToggle(perm.id)}
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={perm.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {perm.id}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {perm.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
