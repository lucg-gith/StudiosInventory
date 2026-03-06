import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { X, Minus, Plus, Trash2, Briefcase, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';
import type { CaseItem, EquipmentWithUnits, Event, DateOverlap } from '../../types';

interface EquipmentCaseProps {
  open: boolean;
  onClose: () => void;
  caseItems: CaseItem[];
  equipment: EquipmentWithUnits[];
  events: Event[];
  userId: string;
  onRemoveItem: (equipmentId: string) => void;
  onUpdateQuantity: (equipmentId: string, quantity: number) => void;
  onClearCase: () => void;
  onSuccess: () => void;
  onCreateEvent: (
    projectName: string,
    startDate: Date,
    timePeriod?: 'AM' | 'PM',
    endDate?: Date,
    endTimePeriod?: 'AM' | 'PM'
  ) => Promise<{ data: Event | null; error: any }>;
  onDeleteEvent: (eventId: string) => Promise<{ error: any }>;
  onUpdateReservationDates?: (startDate: string, endDate: string) => Promise<{ error: any }>;
  overlaps?: DateOverlap[];
}

export function EquipmentCase({
  open,
  onClose,
  caseItems,
  equipment,
  events,
  userId,
  onRemoveItem,
  onUpdateQuantity,
  onClearCase,
  onSuccess,
  onCreateEvent,
  onDeleteEvent,
  onUpdateReservationDates,
  overlaps,
}: EquipmentCaseProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>('new');
  const [newEventName, setNewEventName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTimePeriod, setStartTimePeriod] = useState<'AM' | 'PM'>('AM');
  const [returnDate, setReturnDate] = useState('');
  const [returnTimePeriod, setReturnTimePeriod] = useState<'AM' | 'PM'>('AM');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setSelectedEventId('new');
      setNewEventName('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setStartTimePeriod('AM');
      setReturnDate('');
      setReturnTimePeriod('AM');
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Propagate dates to reservation rows so other users see date-aware availability
  useEffect(() => {
    if (startDate && returnDate && onUpdateReservationDates) {
      onUpdateReservationDates(startDate, returnDate);
    }
  }, [startDate, returnDate]);

  const totalItems = caseItems.reduce((sum, c) => sum + c.quantity, 0);

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
    if (caseItems.length === 0) return;

    setLoading(true);

    try {
      let eventId = selectedEventId;

      if (selectedEventId === 'new') {
        if (!newEventName.trim()) {
          toast({ title: 'Error', description: 'Please enter a project name', variant: 'destructive' });
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

      for (const caseItem of caseItems) {
        const liveEquipment = equipment.find((e) => e.id === caseItem.equipmentId);
        if (!liveEquipment) {
          throw new Error(`Equipment "${caseItem.name}" no longer exists`);
        }

        const availableUnits = liveEquipment.units
          .filter((u) => u.current_status === 'available')
          .slice(0, caseItem.quantity);

        if (availableUnits.length < caseItem.quantity) {
          throw new Error(
            `Not enough units for "${caseItem.name}". Requested ${caseItem.quantity}, only ${availableUnits.length} available.`
          );
        }

        for (const unit of availableUnits) {
          await supabase
            .from('equipment_units')
            .update({ current_status: 'in_use' })
            .eq('id', unit.id);

          await supabase.from('transactions').insert({
            unit_id: unit.id,
            user_id: userId,
            event_id: eventId,
            type: 'CHECK_OUT',
          });
        }
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
        description: `Checked out ${totalItems} item${totalItems !== 1 ? 's' : ''} across ${caseItems.length} equipment type${caseItems.length !== 1 ? 's' : ''}`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error checking out equipment case:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to check out equipment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-full max-w-md bg-card shadow-2xl',
          'flex flex-col',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-[#4EB5E8]" />
            <h2 className="text-lg font-bold text-foreground">Equipment Case</h2>
            {totalItems > 0 && (
              <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-full bg-[#4EB5E8] text-white text-xs font-bold">
                {totalItems}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {caseItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Briefcase className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-foreground font-medium">Your case is empty</p>
              <p className="text-sm text-muted-foreground mt-1">
                Browse equipment and click "Add to Case" to get started
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Items list */}
              <div className="px-6 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Items ({caseItems.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearCase}
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/50 h-7 text-xs"
                  >
                    Clear All
                  </Button>
                </div>

                {caseItems.map((item) => (
                  <div
                    key={item.equipmentId}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onUpdateQuantity(item.equipmentId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onUpdateQuantity(item.equipmentId, item.quantity + 1)}
                        disabled={item.quantity >= item.maxAvailable}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-400"
                      onClick={() => onRemoveItem(item.equipmentId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Checkout form */}
              <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Checkout Details
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="case-event">Project/Event</Label>
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger id="case-event">
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
                    <Label htmlFor="case-newEventName">New Project Name</Label>
                    <Input
                      id="case-newEventName"
                      type="text"
                      placeholder="e.g., Interview with CEO"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="case-startDate">Start Date</Label>
                  <Input
                    id="case-startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="case-timePeriod">Time</Label>
                  <Select value={startTimePeriod} onValueChange={(v) => setStartTimePeriod(v as 'AM' | 'PM')}>
                    <SelectTrigger id="case-timePeriod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">Morning (AM)</SelectItem>
                      <SelectItem value="PM">Afternoon (PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="case-returnDate">Expected Return Date *</Label>
                  <Input
                    id="case-returnDate"
                    type="date"
                    value={returnDate}
                    min={startDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">When will the equipment be back?</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="case-returnTimePeriod">Expected Return Time</Label>
                  <Select value={returnTimePeriod} onValueChange={(v) => setReturnTimePeriod(v as 'AM' | 'PM')}>
                    <SelectTrigger id="case-returnTimePeriod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">Morning (AM)</SelectItem>
                      <SelectItem value="PM">Afternoon (PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {overlaps && overlaps.length > 0 && (
                  <div className="rounded-lg border border-orange-500/50 bg-orange-950/30 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0" />
                      <span className="font-semibold text-orange-400 text-sm">Scheduling Conflicts</span>
                    </div>
                    {overlaps.map((overlap, i) => (
                      <p key={i} className="text-sm text-orange-300">
                        <strong>{overlap.equipmentName}</strong> overlaps with{' '}
                        <strong>{overlap.conflictingUserName}</strong>'s{' '}
                        {overlap.source === 'checkout' ? 'checkout' : 'reservation'} from{' '}
                        {overlap.startDate} to {overlap.endDate}
                      </p>
                    ))}
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading || caseItems.length === 0}
                    className="w-full"
                  >
                    {loading
                      ? 'Processing...'
                      : `Check Out ${totalItems} Item${totalItems !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
