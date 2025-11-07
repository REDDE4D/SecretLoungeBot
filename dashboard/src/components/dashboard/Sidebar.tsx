'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  Shield,
  BarChart3,
  FileBox,
  Lock,
  LogOut,
  Link as LinkIcon,
  ScrollText,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { label: 'Users', href: '/dashboard/users', icon: Users, permission: 'users.view' },
  { label: 'Moderation', href: '/dashboard/moderation', icon: Shield, permission: 'moderation.view_reports' },
  { label: 'Content', href: '/dashboard/content', icon: FileText, permission: 'content.view_filters' },
  { label: 'Links', href: '/dashboard/links', icon: LinkIcon, permission: 'links.view' },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, permission: 'stats.view_overview' },
  { label: 'Audit Log', href: '/dashboard/audit', icon: FileBox, permission: 'moderation.view_audit' },
  { label: 'Bot Logs', href: '/dashboard/logs', icon: ScrollText, permission: 'logs.view_bot' },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, permission: 'settings.view' },
  { label: 'Permissions', href: '/dashboard/permissions', icon: Lock, permission: 'permissions.view' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Determine display name: firstName + lastName > username > alias > 'User'
  const getDisplayName = () => {
    if (user?.firstName) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
      return fullName;
    }
    if (user?.username) {
      return `@${user.username}`;
    }
    return user?.alias || 'User';
  };

  // Get initials for avatar
  const getInitials = () => {
    if (user?.firstName) {
      const firstInitial = user.firstName[0]?.toUpperCase() || '';
      const lastInitial = user.lastName?.[0]?.toUpperCase() || '';
      return firstInitial + lastInitial || firstInitial || 'U';
    }
    if (user?.username) {
      return user.username[0]?.toUpperCase() || 'U';
    }
    return user?.alias?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card/50 backdrop-blur-xl">
      <div className="flex h-16 items-center border-b px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold transition-all duration-300 hover:scale-105"
        >
          <span className="text-2xl">🤖</span>
          <span className="text-lg text-gradient">
            SecretLounge-Bot
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const canAccess = !item.permission || hasPermission(item.permission);

          if (!canAccess) return null;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300',
                isActive
                  ? 'bg-primary/90 text-primary-foreground shadow-md scale-[1.02]'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground hover:scale-[1.01] hover:shadow-sm'
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-all duration-300",
                isActive ? "scale-110" : "group-hover:scale-110"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4 space-y-3">
        <div className="rounded-xl bg-gradient-to-br from-muted/80 to-accent/20 p-3 backdrop-blur-sm border border-border/50 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold shadow-md">
              {getInitials()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold">{getDisplayName()}</p>
              <p className="truncate text-xs text-muted-foreground capitalize">
                <span className="inline-flex items-center gap-1">
                  {user?.role === 'admin' && '👑'} {user?.role || 'user'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full transition-all duration-300 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
