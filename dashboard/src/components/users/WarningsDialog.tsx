'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Trash2, XCircle } from 'lucide-react';

interface Warning {
  id: string;
  issuedBy: string;
  issuedByAlias: string;
  reason: string | null;
  timestamp: string;
}

interface WarningsData {
  userId: string;
  alias: string;
  totalWarnings: number;
  warnings: Warning[];
}

interface WarningsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  alias: string | null;
  onWarningsUpdated?: () => void;
}

export function WarningsDialog({
  open,
  onOpenChange,
  userId,
  alias,
  onWarningsUpdated,
}: WarningsDialogProps) {
  const [warnings, setWarnings] = useState<WarningsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteWarningId, setDeleteWarningId] = useState<string | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && userId) {
      fetchWarnings();
    }
  }, [open, userId]);

  const fetchWarnings = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await apiClient.get<WarningsData>(`/moderation/warnings/${userId}`);
      if (response.success && response.data) {
        setWarnings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch warnings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch warnings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveWarning = async (warningId: string) => {
    try {
      const response = await apiClient.delete(`/moderation/warnings/${warningId}`);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Warning removed successfully',
        });
        fetchWarnings();
        onWarningsUpdated?.();
      }
    } catch (error) {
      console.error('Failed to remove warning:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove warning',
        variant: 'destructive',
      });
    } finally {
      setDeleteWarningId(null);
    }
  };

  const handleClearAllWarnings = async () => {
    if (!userId) return;

    try {
      const response = await apiClient.delete(`/moderation/warnings/user/${userId}`);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'All warnings cleared successfully',
        });
        fetchWarnings();
        onWarningsUpdated?.();
      }
    } catch (error) {
      console.error('Failed to clear warnings:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear warnings',
        variant: 'destructive',
      });
    } finally {
      setClearAllConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Warnings for {alias}
            </DialogTitle>
            <DialogDescription>
              View and manage warnings issued to this user
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="text-center py-8">Loading warnings...</div>
          ) : warnings && warnings.warnings.length > 0 ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total warnings: <Badge variant="destructive">{warnings.totalWarnings}</Badge>
                    </p>
                  </div>
                  {warnings.warnings.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setClearAllConfirm(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Clear All Warnings
                    </Button>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Issued By</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warnings.warnings.map((warning) => (
                      <TableRow key={warning.id}>
                        <TableCell className="font-mono text-xs">
                          {formatDate(warning.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{warning.issuedByAlias}</Badge>
                        </TableCell>
                        <TableCell>
                          {warning.reason ? (
                            <span className="text-sm">{warning.reason}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">
                              No reason provided
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteWarningId(warning.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>This user has no warnings</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Single Warning */}
      <Dialog open={!!deleteWarningId} onOpenChange={(open) => !open && setDeleteWarningId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Warning</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this warning? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteWarningId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteWarningId && handleRemoveWarning(deleteWarningId)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Clear All Warnings */}
      <Dialog open={clearAllConfirm} onOpenChange={setClearAllConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Warnings</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all warnings for {alias}? This will remove{' '}
              {warnings?.totalWarnings} warning(s). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearAllConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearAllWarnings}>
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
