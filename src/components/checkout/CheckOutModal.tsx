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
import { Trash2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';
import type { EquipmentWithUnits, Event } from '../../types';

interface CheckOutModalProps {
  open: boolean;
  onClose: () => void;
  equipment: EquipmentWithUnits | null;
  events: Event[];
  userId: string;
  onSuccess: () => void;
  onCreateEvent: (projectName: string, startDate: Date, timePeriod?: 'AM' | 'PM', endDate?: Date, endTimePeriod?: 'AM' | 'PM') => Promise<{ data: Event | null; error: any }>;
  onDeleteEvent: (eventId: string) => Promise<{ error: any }>;
}

export function CheckOutModal({
  open,
  onClose,
  equipment,
  events,
  userId,
  onSuccess,
  onCreateEvent,
  onDeleteEvent,
}: CheckOutModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<string>('new');
  const [newEventName, setNewEventName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTimePeriod, setStartTimePeriod] = useState<'AM' | 'PM'>('AM');
  const [returnDate, setReturnDate] = useState('');
  const [returnTimePeriod, setReturnTimePeriod] = useState<'AM' | 'PM'>('AM');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSelectedEventId('new');
      setNewEventName('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setStartTimePeriod('AM');
      setReturnDate('');
      setReturnTimePeriod('AM');
    }
  }, [open]);

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this project? Associated checkout history will also be removed.')) return;
    const { error } = await onDeleteEvent(eventId);
    if (!error) {
      setSelectedEventId('new');
      toast({ title: 'Project deleted' });
    } else {
      toast({ title: 'Error', description: 'Failed to delete project', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment) return;

    setLoading(true);

    try {
      let eventId = selectedEventId;

      if (selectedEventId === 'new') {
        if (!newEventName.trim()) {
          toast({
            title: 'Error',
            description: 'Please enter a project name',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const { data: newEvent, error: eventError } = await onCreateEvent(
          newEventName,
          new Date(startDate),
          startTimePeriod,
          returnDate ? new Date(returnDate) : undefined,
          returnDate ? returnTimePeriod : undefined
        );

        if (eventError || !newEvent) {
          throw new Error('Failed to create event');
        }

        eventId = newEvent.id;
      }

      const availableUnits = equipment.units
        .filter((u) => u.current_status === 'available')
        .slice(0, quantity);

      if (availableUnits.length < quantity) {
        toast({
          title: 'Error',
          description: 'Not enough available units',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      for (const unit of availableUnits) {
        await supabase.from('equipment_units').update({ current_status: 'in_use' }).eq('id', unit.id);

        await supabase.from('transactions').insert({
          unit_id: unit.id,
          user_id: userId,
          event_id: eventId,
          type: 'CHECK_OUT',
        });
      }

      // Save return date directly to the event
      if (returnDate) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ end_date: new Date(returnDate).toISOString() })
          .eq('id', eventId)
          .select()
          .single();

        if (updateError) {
          console.error('Failed to save return date:', updateError);
        }
      }

      toast({
        title: 'Success',
        description: `Checked out ${quantity} ${equipment.name} unit(s)`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error checking out equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to check out equipment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check Out Equipment</DialogTitle>
          <DialogDescription>{equipment.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={equipment.available_count}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              required
            />
            <p className="text-sm text-muted-foreground">Available: {equipment.available_count}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event">Project/Event</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ Create New Project</SelectItem>
                {events.map((event) => (
                  <SelectItem
                    key={event.id}
                    value={event.id}
                    action={
                      <Trash2
                        className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400 cursor-pointer"
                        onClick={() => handleDeleteEvent(event.id)}
                      />
                    }
                  >
                    {event.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEventId === 'new' && (
            <div className="space-y-2">
              <Label htmlFor="newEventName">New Project Name</Label>
              <Input
                id="newEventName"
                type="text"
                placeholder="e.g., Interview with CEO"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timePeriod">Time</Label>
            <Select value={startTimePeriod} onValueChange={(v) => setStartTimePeriod(v as 'AM' | 'PM')}>
              <SelectTrigger id="timePeriod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">Morning (AM)</SelectItem>
                <SelectItem value="PM">Afternoon (PM)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnDate">Expected Return Date *</Label>
            <Input
              id="returnDate"
              type="date"
              value={returnDate}
              min={startDate}
              onChange={(e) => setReturnDate(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">When will the equipment be back?</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnTimePeriod">Expected Return Time</Label>
            <Select value={returnTimePeriod} onValueChange={(v) => setReturnTimePeriod(v as 'AM' | 'PM')}>
              <SelectTrigger id="returnTimePeriod">
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
              {loading ? 'Processing...' : 'Select'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
