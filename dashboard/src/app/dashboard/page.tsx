'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';
import { Users, MessageSquare, AlertCircle, Shield, Activity } from 'lucide-react';
import type { OverviewStats } from '@/types/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { subscribe, unsubscribe, connected } = useSocket();

  useEffect(() => {
    fetchStats();

    // Subscribe to real-time stats updates
    const handleStatsUpdate = (data: unknown) => {
      setStats((prev) => {
        if (!prev) return prev;
        return { ...prev, ...(data as Partial<OverviewStats>) };
      });
      setLastUpdate(new Date());
    };

    subscribe('stats:update', handleStatsUpdate);

    return () => {
      unsubscribe('stats:update', handleStatsUpdate);
    };
  }, [subscribe, unsubscribe]);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get<OverviewStats>('/stats/overview');
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4 animate-in">
          <div className="mb-4 text-6xl animate-pulse">⏳</div>
          <p className="text-lg text-gradient font-semibold">Loading statistics...</p>
          <div className="flex justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-4xl font-bold tracking-tight text-gradient">Overview</h2>
          <p className="text-muted-foreground text-base">
            Real-time statistics and insights for your Telegram lobby bot
          </p>
        </div>
        {connected && (
          <Badge variant="outline" className="gap-2 border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400 shadow-glow">
            <Activity className="h-3 w-3 animate-pulse" />
            <span className="font-semibold">Live</span>
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="gradient-card hover-lift border-primary/20 transition-all duration-300 hover:shadow-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient">{stats?.users.total || 0}</div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-semibold text-primary">{stats?.users.inLobby || 0}</span> in lobby
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card hover-lift border-green-500/20 transition-all duration-300 hover:shadow-glow-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Users</CardTitle>
            <div className="rounded-lg bg-green-500/10 p-2">
              <Users className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent dark:from-green-400 dark:to-emerald-400">
              {stats?.users.online || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-semibold text-green-600 dark:text-green-400">+{stats?.users.newToday || 0}</span> new today
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card hover-lift border-blue-500/20 transition-all duration-300 hover:shadow-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-400">
              {stats?.messages.today || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-semibold">{stats?.messages.total || 0}</span> total
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card hover-lift border-orange-500/20 transition-all duration-300 hover:shadow-glow-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <div className="rounded-lg bg-orange-500/10 p-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent dark:from-orange-400 dark:to-amber-400">
              {stats?.moderation.pendingReports || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-semibold text-orange-600 dark:text-orange-400">{stats?.moderation.actionsToday || 0}</span> actions today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="gradient-card hover-lift border-red-500/20 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Moderation Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-2">
                  <Shield className="h-5 w-5 text-red-500" />
                </div>
                <span className="text-sm font-semibold">Active Bans</span>
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-500 bg-clip-text text-transparent dark:from-red-400 dark:to-pink-400">
                {stats?.moderation.activeBans || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-500/10 p-2">
                  <Shield className="h-5 w-5 text-orange-500" />
                </div>
                <span className="text-sm font-semibold">Active Mutes</span>
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent dark:from-orange-400 dark:to-amber-400">
                {stats?.moderation.activeMutes || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card hover-lift border-purple-500/20 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-purple-500" />
              Spam Detection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <span className="text-sm font-medium">Tracked Users</span>
              <span className="text-2xl font-bold text-gradient">{stats?.spam.trackedUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <span className="text-sm font-medium">Auto Muted</span>
              <span className="text-2xl font-bold text-gradient">{stats?.spam.autoMuted || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <span className="text-sm font-medium">Total Violations</span>
              <span className="text-2xl font-bold text-gradient">{stats?.spam.totalViolations || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
