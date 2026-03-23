import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RotateCcw } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';

interface TeamKit {
  user_id: string;
  user_name: string;
  user_email: string;
  items: {
    unit_id: string;
    event_id: string;
    equipment_name: string;
    equipment_category: string;
    unit_number: string;
    event_name: string;
  }[];
  total_items: number;
}

interface ProxyReturnModalProps {
  open: boolean;
  onClose: () => void;
  kit: TeamKit | null;
  currentUserId: string;
  currentUserName: string;
  onSuccess: () => void;
}

export function ProxyReturnModal({
  open,
  onClose,
  kit,
  currentUserId,
  currentUserName,
  onSuccess,
}: ProxyReturnModalProps) {
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTimePeriod, setEndTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setEndDate(new Date().toISOString().split('T')[0]);
      setEndTimePeriod('PM');
    }
  }, [open]);

  if (!kit) return null;

  const handleSubmit = async () => {
    // Validate date input with consistent parsing
    const [year, month, day] = endDate.split('-').map(Number);
    if (!endDate || !year || !month || !day || isNaN(new Date(year, month - 1, day).getTime())) {
      toast({
        title: 'Invalid date',
        description: 'Please select a valid return date.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const proxyNotes = JSON.stringify({
        proxy_return: true,
        returned_by_user_id: currentUserId,
        returned_by_name: currentUserName,
      });

      // Group items by event_id to update event end dates
      const eventIds = new Set(kit.items.map((item) => item.event_id));

      // Update event end dates with error handling
      for (const eventId of eventIds) {
        // Parse date with explicit timezone handling
        const [year, month, day] = endDate.split('-').map(Number);
        const endTimestamp = new Date(year, month - 1, day);
        endTimestamp.setHours(endTimePeriod === 'AM' ? 9 : 17, 0, 0, 0);

        const notesJson = JSON.stringify({ end_time_period: endTimePeriod });

        const { error: eventError } = await supabase
          .from('events')
          .update({
            end_date: endTimestamp.toISOString(),
            notes: notesJson,
          })
          .eq('id', eventId);

        if (eventError) {
          console.error('Event update error:', eventError);
          throw new Error(`Failed to update event: ${eventError.message}`);
        }
      }

      // Track failed items for better error reporting
      const failedItems: string[] = [];

      // Process each unit: create CHECK_IN transaction + update status
      for (const item of kit.items) {
        try {
          const { error: txError } = await supabase.from('transactions').insert({
            unit_id: item.unit_id,
            user_id: kit.user_id,
            event_id: item.event_id,
            type: 'CHECK_IN',
            notes: proxyNotes,
          });

          if (txError) {
            console.error('Transaction error:', txError);
            throw new Error(`Transaction failed: ${txError.message}`);
          }

          const { error: statusError } = await supabase
            .from('equipment_units')
            .update({ current_status: 'available' })
            .eq('id', item.unit_id);

          if (statusError) {
            console.error('Status update error:', statusError);
            throw new Error(`Status update failed: ${statusError.message}`);
          }
        } catch (itemError) {
          console.error(`Failed to return ${item.unit_number}:`, itemError);
          failedItems.push(item.unit_number);
        }
      }

      // Check if any items failed
      if (failedItems.length > 0) {
        toast({
          title: 'Partial failure',
          description: `Failed to return: ${failedItems.join(', ')}. Please try again for these items.`,
          variant: 'destructive',
        });
        return; // Don't close modal or call onSuccess
      }

      toast({
        title: 'Equipment returned',
        description: `Returned ${kit.total_items} item${kit.total_items !== 1 ? 's' : ''} on behalf of ${kit.user_name}`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Proxy return error:', error);
      toast({
        title: 'Error',
        description: 'Failed to return equipment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Return {kit.user_name}'s Equipment
          </DialogTitle>
          <DialogDescription>
            Returning {kit.total_items} item{kit.total_items !== 1 ? 's' : ''} on behalf of {kit.user_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Items list */}
          <div className="rounded-md border p-3 space-y-1.5 max-h-48 overflow-y-auto">
            {kit.items.map((item, idx) => (
              <div key={`${item.unit_id}-${idx}`} className="flex items-center gap-2 text-sm">
                <span className="px-1.5 py-0.5 bg-muted text-xs rounded text-muted-foreground flex-shrink-0">
                  {item.unit_number}
                </span>
                <span className="text-foreground truncate">{item.equipment_name}</span>
                <span className="text-xs text-muted-foreground capitalize ml-auto flex-shrink-0">
                  {item.equipment_category}
                </span>
              </div>
            ))}
          </div>

          {/* Return date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="proxy-return-date">Return Date</Label>
              <Input
                id="proxy-return-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proxy-return-time">Time</Label>
              <Select value={endTimePeriod} onValueChange={(v) => setEndTimePeriod(v as 'AM' | 'PM')}>
                <SelectTrigger id="proxy-return-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">Morning (AM)</SelectItem>
                  <SelectItem value="PM">Afternoon (PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info note */}
          <p className="text-xs text-muted-foreground">
            This will be recorded as returned by you ({currentUserName}) on behalf of {kit.user_name}.
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Returning...' : `Return ${kit.total_items} Item${kit.total_items !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
