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
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';

interface BulkCheckInModalProps {
  open: boolean;
  onClose: () => void;
  selectedGroups: any[];
  userId: string;
  onSuccess: () => void;
  onUpdateEventEnd?: (eventId: string, endDate: Date, timePeriod?: 'AM' | 'PM') => Promise<{ data: any; error: any }>;
}

export function BulkCheckInModal({
  open,
  onClose,
  selectedGroups,
  userId,
  onSuccess,
  onUpdateEventEnd,
}: BulkCheckInModalProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroups.length === 0) return;

    setLoading(true);

    try {
      // Process each selected group
      for (const group of selectedGroups) {
        // Update event end time
        if (onUpdateEventEnd) {
          await onUpdateEventEnd(group.event_id, new Date(endDate), endTimePeriod);
        }

        // Check in all units in this group
        for (const unit of group.units) {
          await supabase.from('transactions').insert({
            unit_id: unit.unit_id,
            user_id: userId,
            event_id: group.event_id,
            type: 'CHECK_IN',
          });

          await supabase
            .from('equipment_units')
            .update({ current_status: 'available' })
            .eq('id', unit.unit_id);
        }
      }

      toast({
        title: 'Success',
        description: `Checked in ${selectedGroups.length} equipment group(s) successfully`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error bulk checking in equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to check in equipment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (selectedGroups.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Return Multiple Items</DialogTitle>
          <DialogDescription>
            Returning {selectedGroups.length} equipment group(s)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Selected Equipment</Label>
            <div className="bg-muted rounded-md p-3 space-y-1 max-h-48 overflow-y-auto">
              {selectedGroups.map((group, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">{group.equipment_name}</span>
                  <span className="text-muted-foreground"> - {group.units.length} unit(s)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Return Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTimePeriod">Return Time</Label>
            <Select value={endTimePeriod} onValueChange={(v) => setEndTimePeriod(v as 'AM' | 'PM')}>
              <SelectTrigger id="endTimePeriod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">Morning (AM)</SelectItem>
                <SelectItem value="PM">Afternoon (PM)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Return All'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
