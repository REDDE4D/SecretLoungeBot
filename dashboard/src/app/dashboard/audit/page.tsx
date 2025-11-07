'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/contexts/SocketContext';
import { formatDateTime } from '@/lib/utils';
import { Search, Download } from 'lucide-react';

interface AuditLog {
  _id: string;
  action: string;
  performedBy: string;
  performedByAlias: string;
  targetUserId?: string;
  targetAlias?: string;
  reason?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const { toast } = useToast();
  const { subscribe, unsubscribe } = useSocket();

  useEffect(() => {
    fetchAuditLogs();
  }, [pagination.page, searchTerm, actionFilter]);

  useEffect(() => {
    if (realtimeEnabled) {
      const handleNewLog = (data: unknown) => {
        setLogs((prev) => [data as AuditLog, ...prev].slice(0, pagination.limit));
      };

      subscribe('audit:new', handleNewLog);

      return () => {
        unsubscribe('audit:new', handleNewLog);
      };
    }
  }, [realtimeEnabled, subscribe, unsubscribe, pagination.limit]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (actionFilter !== 'all') params.append('action', actionFilter);

      const response = await apiClient.get<AuditLogsResponse>(`/moderation/audit-logs?${params.toString()}`);
      if (response.success && response.data) {
        setLogs(response.data.logs);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (actionFilter !== 'all') params.append('action', actionFilter);

      const response = await apiClient.get(`/moderation/audit-logs/export?${params.toString()}`);
      if (response.success) {
        // Create a blob and download
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-logs-${new Date().toISOString()}.json`;
        link.click();
        URL.revokeObjectURL(url);

        toast({
          title: 'Success',
          description: 'Audit logs exported successfully',
        });
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to export audit logs',
        variant: 'destructive',
      });
    }
  };

  const getActionBadge = (action: string) => {
    const colorMap: Record<string, string> = {
      ban: 'bg-red-500',
      mute: 'bg-orange-500',
      kick: 'bg-yellow-500',
      warn: 'bg-blue-500',
      unban: 'bg-green-500',
      unmute: 'bg-green-500',
      role_change: 'bg-purple-500',
      setting_change: 'bg-gray-500',
    };

    return (
      <Badge className={colorMap[action] || 'bg-gray-500'}>
        {action.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>
          <p className="text-muted-foreground">
            Complete history of administrative actions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="realtime"
              checked={realtimeEnabled}
              onCheckedChange={setRealtimeEnabled}
            />
            <Label htmlFor="realtime">Real-time</Label>
          </div>
          <Button onClick={exportLogs}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter audit logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by alias or action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="ban">Ban</SelectItem>
                <SelectItem value="mute">Mute</SelectItem>
                <SelectItem value="kick">Kick</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="unban">Unban</SelectItem>
                <SelectItem value="unmute">Unmute</SelectItem>
                <SelectItem value="role_change">Role Change</SelectItem>
                <SelectItem value="setting_change">Setting Change</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log Entries ({pagination.total})</CardTitle>
          {realtimeEnabled && (
            <Badge className="bg-green-500 animate-pulse">Live Updates</Badge>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="font-medium">
                        {log.performedByAlias || 'System'}
                      </TableCell>
                      <TableCell>
                        {log.targetAlias ? (
                          <span className="font-medium">{log.targetAlias}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm space-y-2">
                          {log.reason && (
                            <div className="text-muted-foreground">{log.reason}</div>
                          )}
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="space-y-1">
                              {Object.entries(log.details).slice(0, 3).map(([key, value]) => (
                                <div key={key} className="flex gap-2 text-xs">
                                  <span className="text-muted-foreground font-medium">{key}:</span>
                                  <span className="font-mono">
                                    {typeof value === 'object'
                                      ? JSON.stringify(value)
                                      : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {!log.reason && (!log.details || Object.keys(log.details).length === 0) && (
                            <span className="text-muted-foreground">No details</span>
                          )}
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
    </div>
  );
}
