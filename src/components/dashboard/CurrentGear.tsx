import { useState } from 'react';
import { Button } from '../ui/button';
import { Package2, ArrowDownLeft, Pencil } from 'lucide-react';
import { CheckInModal } from './CheckInModal';
import { BulkCheckInModal } from './BulkCheckInModal';
import { InlineDateEditor } from './InlineDateEditor';
import { formatDate, formatDateWithPeriod } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';

interface CheckedOutItem {
  unit_id: string;
  unit_number: string;
  equipment_id: string;
  equipment_name: string;
  equipment_category: string;
  event_id: string;
  event_name: string;
  checkout_date: string;
  return_date: string | null;
  event_notes: string | null;
}

interface CurrentGearProps {
  checkedOutGear: CheckedOutItem[];
  userId: string;
  onCheckIn: () => void;
  onUpdateEventEnd?: (eventId: string, endDate: Date, timePeriod?: 'AM' | 'PM') => Promise<{ data: any; error: any }>;
  onUpdateEventStart?: (eventId: string, startDate: Date, timePeriod?: 'AM' | 'PM') => Promise<{ data: any; error: any }>;
}

export function CurrentGear({ checkedOutGear, userId, onCheckIn, onUpdateEventEnd, onUpdateEventStart }: CurrentGearProps) {
  const [selectedGear, setSelectedGear] = useState<CheckedOutItem | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [bulkReturnModalOpen, setBulkReturnModalOpen] = useState(false);
  const [editingDates, setEditingDates] = useState<{ eventId: string; type: 'start' | 'end' } | null>(null);
  const { toast } = useToast();

  // Flat grouping by equipment+event (needed for BulkCheckInModal compatibility)
  const groupedGear = checkedOutGear.reduce((acc, item) => {
    const key = `${item.equipment_id}-${item.event_id}`;
    if (!acc[key]) {
      acc[key] = {
        equipment_name: item.equipment_name,
        equipment_category: item.equipment_category,
        event_name: item.event_name,
        event_id: item.event_id,
        checkout_date: item.checkout_date,
        event_notes: item.event_notes,
        units: [],
      };
    }
    acc[key].units.push(item);
    return acc;
  }, {} as Record<string, any>);

  // Two-level grouping: by event, then by equipment within each event
  const byEvent = checkedOutGear.reduce((acc, item) => {
    if (!acc[item.event_id]) {
      acc[item.event_id] = {
        event_name: item.event_name,
        event_id: item.event_id,
        checkout_date: item.checkout_date,
        return_date: item.return_date,
        event_notes: item.event_notes,
        equipmentGroups: {} as Record<string, any>,
      };
    }
    const eqKey = `${item.equipment_id}-${item.event_id}`;
    if (!acc[item.event_id].equipmentGroups[eqKey]) {
      acc[item.event_id].equipmentGroups[eqKey] = {
        equipment_name: item.equipment_name,
        equipment_category: item.equipment_category,
        equipment_id: item.equipment_id,
        event_id: item.event_id,
        event_name: item.event_name,
        checkout_date: item.checkout_date,
        event_notes: item.event_notes,
        units: [],
      };
    }
    acc[item.event_id].equipmentGroups[eqKey].units.push(item);
    return acc;
  }, {} as Record<string, any>);

  const toggleGroupSelection = (groupKey: string) => {
    const newSelection = new Set(selectedGroups);
    if (newSelection.has(groupKey)) {
      newSelection.delete(groupKey);
    } else {
      newSelection.add(groupKey);
    }
    setSelectedGroups(newSelection);
  };

  const handleReturnAll = () => {
    const allKeys = new Set(Object.keys(groupedGear));
    setSelectedGroups(allKeys);
    setBulkReturnModalOpen(true);
  };

  const handleReturnSelected = () => {
    if (selectedGroups.size > 0) {
      setBulkReturnModalOpen(true);
    }
  };

  const handleReturnProject = (eventId: string) => {
    const eventData = byEvent[eventId];
    if (!eventData) return;
    const projectKeys = new Set(Object.keys(eventData.equipmentGroups));
    setSelectedGroups(projectKeys);
    setBulkReturnModalOpen(true);
  };

  const handleBulkReturnSuccess = () => {
    setSelectedGroups(new Set());
    onCheckIn();
  };

  // Helper to format event dates (checkout or return) with time period
  const formatEventDate = (date: string, notes: string | null, type: 'start' | 'end') => {
    try {
      const parsed = notes ? JSON.parse(notes) : {};
      const period = type === 'start' ? parsed.start_time_period : parsed.end_time_period;
      return formatDateWithPeriod(date, period);
    } catch {
      return formatDate(date);
    }
  };

  // Helper to extract time period from event notes
  const extractTimePeriod = (notes: string | null, type: 'start' | 'end'): 'AM' | 'PM' => {
    try {
      const parsed = notes ? JSON.parse(notes) : {};
      return parsed[`${type}_time_period`] || 'PM';
    } catch {
      return 'PM';
    }
  };

  // Helper to parse local date (consistent timezone handling)
  const parseLocalDate = (dateString: string, timePeriod: 'AM' | 'PM') => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(timePeriod === 'AM' ? 9 : 17, 0, 0, 0);
    return date;
  };

  const eventEntries = Object.entries(byEvent);
  const hasGear = eventEntries.length > 0;

  return (
    <>
      <div className="min-w-[60vw] max-w-[60vw] flex-shrink-0 snap-start border rounded-lg bg-card shadow-sm flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">My Current Gear</h3>
            <p className="text-xs text-muted-foreground">{checkedOutGear.length} item{checkedOutGear.length !== 1 ? 's' : ''} out</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedGroups.size > 0 && (
              <Button onClick={handleReturnSelected} variant="outline" size="sm" className="h-7 text-xs">
                Return Selected ({selectedGroups.size})
              </Button>
            )}
            {hasGear && (
              <Button onClick={handleReturnAll} className="bg-[#4EB5E8] hover:bg-[#3A94C7] h-7 text-xs" size="sm">
                <ArrowDownLeft className="h-3.5 w-3.5 mr-1" />
                Return All
              </Button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {!hasGear ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5 pb-5 text-center">
            <Package2 className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No equipment checked out</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto max-h-[350px] px-5 pb-4 space-y-3">
            {eventEntries.map(([eventId, eventData]) => {
              const eqEntries = Object.entries(eventData.equipmentGroups);
              return (
                <div key={eventId} className="border rounded-lg overflow-hidden">
                  {/* Project header — shown once */}
                  <div className="bg-muted px-3 py-2 border-b flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{eventData.event_name}</p>
                      {editingDates?.eventId === eventId && editingDates.type === 'start' ? (
                        <InlineDateEditor
                          date={eventData.checkout_date}
                          timePeriod={extractTimePeriod(eventData.event_notes, 'start')}
                          label="Out"
                          onSave={async (date, period) => {
                            if (onUpdateEventStart) {
                              try {
                                const parsedDate = parseLocalDate(date, period);
                                const { error } = await onUpdateEventStart(eventId, parsedDate, period);
                                if (error) {
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to update start date. Please try again.',
                                    variant: 'destructive',
                                  });
                                } else {
                                  setEditingDates(null);
                                  onCheckIn(); // Trigger refresh
                                  toast({
                                    title: 'Date updated',
                                    description: 'Start date has been updated successfully.',
                                  });
                                }
                              } catch (err) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to update start date.',
                                  variant: 'destructive',
                                });
                              }
                            }
                          }}
                          onCancel={() => setEditingDates(null)}
                        />
                      ) : (
                        <div
                          className="flex items-center gap-1.5 cursor-pointer group"
                          onClick={() => setEditingDates({ eventId, type: 'start' })}
                          title="Click to edit start date"
                        >
                          <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                            Out: {formatEventDate(eventData.checkout_date, eventData.event_notes, 'start')}
                          </p>
                          <Pencil className="h-3 w-3 text-muted-foreground group-hover:text-[#4EB5E8] transition-colors flex-shrink-0" />
                        </div>
                      )}

                      {/* Return Date */}
                      {eventData.return_date && (
                        editingDates?.eventId === eventId && editingDates.type === 'end' ? (
                          <InlineDateEditor
                            date={eventData.return_date}
                            timePeriod={extractTimePeriod(eventData.event_notes, 'end')}
                            label="Return"
                            onSave={async (date, period) => {
                              if (onUpdateEventEnd) {
                                try {
                                  const parsedDate = parseLocalDate(date, period);
                                  const { error } = await onUpdateEventEnd(eventId, parsedDate, period);
                                  if (error) {
                                    toast({
                                      title: 'Error',
                                      description: 'Failed to update return date. Please try again.',
                                      variant: 'destructive',
                                    });
                                  } else {
                                    setEditingDates(null);
                                    onCheckIn(); // Trigger refresh
                                    toast({
                                      title: 'Date updated',
                                      description: 'Return date has been updated successfully.',
                                    });
                                  }
                                } catch (err) {
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to update return date.',
                                    variant: 'destructive',
                                  });
                                }
                              }
                            }}
                            onCancel={() => setEditingDates(null)}
                          />
                        ) : (
                          <div
                            className="flex items-center gap-1.5 cursor-pointer group"
                            onClick={() => setEditingDates({ eventId, type: 'end' })}
                            title="Click to edit return date"
                          >
                            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                              Return: {formatEventDate(eventData.return_date, eventData.event_notes, 'end')}
                            </p>
                            <Pencil className="h-3 w-3 text-muted-foreground group-hover:text-[#4EB5E8] transition-colors flex-shrink-0" />
                          </div>
                        )
                      )}
                    </div>
                    {eqEntries.length > 1 && (
                      <Button
                        onClick={() => handleReturnProject(eventId)}
                        variant="outline"
                        size="sm"
                      >
                        Return Project
                      </Button>
                    )}
                  </div>

                  {/* Equipment rows */}
                  {eqEntries.map(([groupKey, group]: [string, any]) => (
                    <div
                      key={groupKey}
                      className={`flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0 hover:bg-accent transition-colors ${
                        selectedGroups.has(groupKey) ? 'bg-red-950/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedGroups.has(groupKey)}
                        onChange={() => toggleGroupSelection(groupKey)}
                        className="h-3.5 w-3.5 rounded border-border text-[#4EB5E8] focus:ring-[#4EB5E8] cursor-pointer flex-shrink-0"
                      />

                      {/* Equipment info */}
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground text-sm">{group.equipment_name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{group.equipment_category}</span>
                        {group.units.map((unit: any) => (
                          <span
                            key={unit.unit_id}
                            className="px-1.5 py-0.5 bg-muted text-xs rounded text-muted-foreground"
                          >
                            {unit.unit_number}
                          </span>
                        ))}
                      </div>

                      {/* Return single item */}
                      <Button
                        onClick={() => setSelectedGear(group.units[0])}
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0 h-7 text-xs"
                      >
                        Return
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CheckInModal
        open={!!selectedGear}
        onClose={() => setSelectedGear(null)}
        gearItem={selectedGear}
        userId={userId}
        onSuccess={onCheckIn}
        onUpdateEventEnd={onUpdateEventEnd}
      />

      <BulkCheckInModal
        open={bulkReturnModalOpen}
        onClose={() => setBulkReturnModalOpen(false)}
        selectedGroups={Array.from(selectedGroups).map((key) => groupedGear[key]).filter(Boolean)}
        userId={userId}
        onSuccess={handleBulkReturnSuccess}
        onUpdateEventEnd={onUpdateEventEnd}
      />
    </>
  );
}
