import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface InlineDateEditorProps {
  date: string;              // ISO date string
  timePeriod: 'AM' | 'PM';   // Current time period
  onSave: (date: string, timePeriod: 'AM' | 'PM') => Promise<void>;
  onCancel: () => void;
  label: string;             // "Out" or "Return"
}

export function InlineDateEditor({
  date,
  timePeriod,
  onSave,
  onCancel,
  label,
}: InlineDateEditorProps) {
  const [editDate, setEditDate] = useState(date.split('T')[0]);
  const [editTimePeriod, setEditTimePeriod] = useState<'AM' | 'PM'>(timePeriod);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editDate, editTimePeriod);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="flex items-center gap-2" onKeyDown={handleKeyDown}>
      <span className="text-sm text-muted-foreground">{label}:</span>
      <Input
        type="date"
        value={editDate}
        onChange={(e) => setEditDate(e.target.value)}
        className="h-7 text-xs w-[140px]"
        autoFocus
      />
      <Select value={editTimePeriod} onValueChange={(v) => setEditTimePeriod(v as 'AM' | 'PM')}>
        <SelectTrigger className="h-7 text-xs w-[80px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving}
        className="h-7 text-xs px-2"
      >
        {saving ? 'Saving...' : 'Save'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onCancel}
        disabled={saving}
        className="h-7 text-xs px-2"
      >
        Cancel
      </Button>
    </div>
  );
}
