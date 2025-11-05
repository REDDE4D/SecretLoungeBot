'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/contexts/SocketContext';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Report {
  _id: string;
  reporterId: string;
  reportedAlias: string;
  messagePreview: string;
  messageType: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedBy?: string;
  resolutionAction?: string;
  resolutionNotes?: string;
}

interface ReportListResponse {
  reports: Report[];
  total: number;
}

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [resolutionAction, setResolutionAction] = useState<string>('none');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const { toast } = useToast();
  const { subscribe, unsubscribe } = useSocket();

  useEffect(() => {
    fetchReports();

    // Subscribe to real-time report updates
    const handleNewReport = (data: any) => {
      toast({
        title: 'New Report',
        description: `New report from ${data.reportedAlias}`,
      });
      if (statusFilter === 'pending') {
        fetchReports();
      }
    };

    subscribe('report:new', handleNewReport);

    return () => {
      unsubscribe('report:new', handleNewReport);
    };
  }, [statusFilter, subscribe, unsubscribe]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await apiClient.get<ReportListResponse>(`/moderation/reports?${params.toString()}`);
      if (response.success && response.data) {
        setReports(response.data.reports);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async () => {
    if (!selectedReport) return;

    try {
      const response = await apiClient.put(`/moderation/reports/${selectedReport._id}/resolve`, {
        action: resolutionAction,
        notes: resolutionNotes,
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Report resolved successfully',
        });
        setResolveDialog(false);
        setSelectedReport(null);
        setResolutionAction('none');
        setResolutionNotes('');
        fetchReports();
      }
    } catch (error) {
      console.error('Failed to resolve report:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve report',
        variant: 'destructive',
      });
    }
  };

  const openResolveDialog = (report: Report) => {
    setSelectedReport(report);
    setResolveDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'default', icon: AlertCircle },
      resolved: { variant: 'default', icon: CheckCircle },
      dismissed: { variant: 'outline', icon: XCircle },
    };
    const config = colors[status] || colors.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      none: 'No Action',
      warned: 'Warning Issued',
      muted: 'User Muted',
      banned: 'User Banned',
      kicked: 'User Kicked',
      media_restricted: 'Media Restricted',
    };
    return labels[action] || action;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Moderation Center</h2>
        <p className="text-muted-foreground">
          Review and resolve user reports
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.status === 'resolved').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reports Queue</CardTitle>
              <CardDescription>Review and take action on user reports</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reports</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reports found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reported User</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report._id}>
                    <TableCell className="font-medium">{report.reportedAlias}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {report.messageType}
                        </Badge>
                        <p className="text-sm truncate">{report.messagePreview}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{report.reason}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(report.createdAt)}
                    </TableCell>
                    <TableCell>
                      {report.status === 'pending' ? (
                        <Button
                          size="sm"
                          onClick={() => openResolveDialog(report)}
                        >
                          Resolve
                        </Button>
                      ) : (
                        <div className="text-sm">
                          {report.resolutionAction && (
                            <Badge variant="outline">
                              {getActionLabel(report.resolutionAction)}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolve Report Dialog */}
      <Dialog open={resolveDialog} onOpenChange={setResolveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Take action on the reported message
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Reported User:</span>
                  <span className="font-semibold">{selectedReport.reportedAlias}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Message Type:</span>
                  <Badge variant="outline">{selectedReport.messageType}</Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium">Message Preview:</span>
                  <p className="text-sm text-muted-foreground">{selectedReport.messagePreview}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium">Reason:</span>
                  <p className="text-sm text-muted-foreground">{selectedReport.reason}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={resolutionAction} onValueChange={setResolutionAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Action (Dismiss)</SelectItem>
                    <SelectItem value="warned">Issue Warning</SelectItem>
                    <SelectItem value="muted">Mute User</SelectItem>
                    <SelectItem value="banned">Ban User</SelectItem>
                    <SelectItem value="kicked">Kick from Lobby</SelectItem>
                    <SelectItem value="media_restricted">Restrict Media</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add any additional notes about this resolution..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResolveDialog(false);
                setResolutionAction('none');
                setResolutionNotes('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleResolveReport}>
              Resolve Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
