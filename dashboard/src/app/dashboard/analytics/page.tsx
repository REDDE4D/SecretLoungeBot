'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, Users, MessageSquare, Activity } from 'lucide-react';

interface AnalyticsData {
  messageVolume: Array<{ date: string; messages: number; media: number }>;
  userGrowth: Array<{ date: string; total: number; active: number }>;
  activityTrends: Array<{ hour: number; messages: number }>;
  summary: {
    totalMessages: number;
    totalUsers: number;
    avgMessagesPerDay: number;
    peakHour: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<AnalyticsData>(`/stats/activity?period=${timeRange}`);
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4 animate-in">
          <div className="mb-4 text-6xl animate-pulse">📊</div>
          <p className="text-lg text-gradient font-semibold">Loading analytics...</p>
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
          <h2 className="text-4xl font-bold tracking-tight text-gradient">Analytics</h2>
          <p className="text-muted-foreground text-base">
            Insights into lobby activity and user engagement
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40 border-primary/30 hover:border-primary/50 transition-colors">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Last 24 Hours</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="gradient-card hover-lift border-blue-500/20 transition-all duration-300 hover:shadow-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-400">
              {data.summary.totalMessages.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Avg <span className="font-semibold text-blue-600 dark:text-blue-400">{data.summary.avgMessagesPerDay.toFixed(0)}</span>/day
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card hover-lift border-purple-500/20 transition-all duration-300 hover:shadow-glow-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient">
              {data.summary.totalUsers.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Registered users</p>
          </CardContent>
        </Card>

        <Card className="gradient-card hover-lift border-orange-500/20 transition-all duration-300 hover:shadow-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
            <div className="rounded-lg bg-orange-500/10 p-2">
              <Activity className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent dark:from-orange-400 dark:to-amber-400">
              {data.summary.peakHour}:00
            </div>
            <p className="text-sm text-muted-foreground mt-2">Most active time</p>
          </CardContent>
        </Card>

        <Card className="gradient-card hover-lift border-green-500/20 transition-all duration-300 hover:shadow-glow-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
            <div className="rounded-lg bg-green-500/10 p-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent dark:from-green-400 dark:to-emerald-400">
              +{data.userGrowth.length > 0 ? (data.userGrowth[data.userGrowth.length - 1].total - data.userGrowth[0].total) : 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2">New users this period</p>
          </CardContent>
        </Card>
      </div>

      {/* Message Volume Chart */}
      <Card className="gradient-card hover-lift border-primary/20 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Message Volume
          </CardTitle>
          <CardDescription>Text and media messages over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.messageVolume}>
              <defs>
                <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMedia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 76% 45%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(142 76% 45%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" stroke="hsl(var(--muted-foreground))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="messages"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                name="Text Messages"
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                activeDot={{ r: 6 }}
                fill="url(#colorMessages)"
              />
              <Line
                type="monotone"
                dataKey="media"
                stroke="hsl(142 76% 45%)"
                strokeWidth={3}
                name="Media Messages"
                dot={{ fill: 'hsl(142 76% 45%)', r: 4 }}
                activeDot={{ r: 6 }}
                fill="url(#colorMedia)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Growth Chart */}
        <Card className="gradient-card hover-lift border-purple-500/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              User Growth
            </CardTitle>
            <CardDescription>Total and active users over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.userGrowth}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 76% 45%)" stopOpacity={1}/>
                    <stop offset="95%" stopColor="hsl(142 76% 45%)" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" stroke="hsl(var(--muted-foreground))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="total" fill="url(#colorTotal)" name="Total Users" radius={[8, 8, 0, 0]} />
                <Bar dataKey="active" fill="url(#colorActive)" name="Active Users" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Heatmap */}
        <Card className="gradient-card hover-lift border-orange-500/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              Activity by Hour
            </CardTitle>
            <CardDescription>Message distribution throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.activityTrends}>
                <defs>
                  <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent-vibrant))" stopOpacity={1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" stroke="hsl(var(--muted-foreground))" />
                <XAxis
                  dataKey="hour"
                  label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  label={{ value: 'Messages', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="messages" fill="url(#colorHourly)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
