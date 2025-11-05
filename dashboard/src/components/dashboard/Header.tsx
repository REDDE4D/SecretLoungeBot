'use client';

import { useSocket } from '@/contexts/SocketContext';
import { Wifi, WifiOff } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function Header() {
  const { connected } = useSocket();

  return (
    <header className="flex h-16 items-center border-b bg-card px-6 backdrop-blur-sm">
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            {connected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-muted-foreground">Disconnected</span>
              </>
            )}
          </div>

          <ThemeToggle />
          <NotificationCenter />
        </div>
      </div>
    </header>
  );
}
