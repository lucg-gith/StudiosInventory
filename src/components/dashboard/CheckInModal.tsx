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

// File upload security constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  gearItem: any;
  userId: string;
  onSuccess: () => void;
  onUpdateEventEnd?: (eventId: string, endDate: Date, timePeriod?: 'AM' | 'PM') => Promise<{ data: any; error: any }>;
}

export function CheckInModal({ open, onClose, gearItem, userId, onSuccess, onUpdateEventEnd }: CheckInModalProps) {
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTimePeriod, setEndTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [reportMaintenance, setReportMaintenance] = useState(false);
  const [maintenanceDescription, setMaintenanceDescription] = useState('');
  const [maintenanceLocation, setMaintenanceLocation] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setEndDate(new Date().toISOString().split('T')[0]);
      setEndTimePeriod('PM');
      setReportMaintenance(false);
      setMaintenanceDescription('');
      setMaintenanceLocation('');
      setImageFile(null);
    }
  }, [open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          variant: 'destructive',
        });
        e.target.value = ''; // Clear input
        return;
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Only JPEG, PNG, and WebP images are allowed',
          variant: 'destructive',
        });
        e.target.value = ''; // Clear input
        return;
      }
    }

    setImageFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gearItem) return;

    if (reportMaintenance && (!maintenanceDescription.trim() || !maintenanceLocation.trim())) {
      toast({
        title: 'Error',
        description: 'Please provide maintenance description and location',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (onUpdateEventEnd) {
        await onUpdateEventEnd(gearItem.event_id, new Date(endDate), endTimePeriod);
      }

      await supabase.from('transactions').insert({
        unit_id: gearItem.unit_id,
        user_id: userId,
        event_id: gearItem.event_id,
        type: 'CHECK_IN',
      });

      const newStatus = reportMaintenance ? 'maintenance' : 'available';
      await supabase
        .from('equipment_units')
        .update({ current_status: newStatus })
        .eq('id', gearItem.unit_id);

      if (reportMaintenance) {
        let imageUrl = null;

        if (imageFile) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${gearItem.unit_id}-${Date.now()}.${fileExt}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('maintenance-images')
            .upload(fileName, imageFile);

          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage
              .from('maintenance-images')
              .getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
          }
        }

        await supabase.from('maintenance_logs').insert({
          unit_id: gearItem.unit_id,
          reporter_id: userId,
          description: maintenanceDescription,
          location_held: maintenanceLocation,
          image_url: imageUrl,
        });
      }

      toast({
        title: 'Success',
        description: reportMaintenance
          ? 'Equipment checked in and flagged for maintenance'
          : 'Equipment checked in successfully',
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error checking in equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to check in equipment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!gearItem) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Return Equipment</DialogTitle>
          <DialogDescription>
            {gearItem.equipment_name} - {gearItem.unit_number}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="reportMaintenance"
              checked={reportMaintenance}
              onChange={(e) => setReportMaintenance(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#4EB5E8] focus:ring-[#4EB5E8]"
            />
            <Label htmlFor="reportMaintenance" className="cursor-pointer">
              Report maintenance issue
            </Label>
          </div>

          {reportMaintenance && (
            <div className="space-y-4 p-4 bg-muted rounded-md">
              <div className="space-y-2">
                <Label htmlFor="maintenanceDescription">Issue Description</Label>
                <textarea
                  id="maintenanceDescription"
                  value={maintenanceDescription}
                  onChange={(e) => setMaintenanceDescription(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4EB5E8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe the issue..."
                  required={reportMaintenance}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenanceLocation">Current Location</Label>
                <Input
                  id="maintenanceLocation"
                  type="text"
                  placeholder="e.g., Desk 4, Shelf B"
                  value={maintenanceLocation}
                  onChange={(e) => setMaintenanceLocation(e.target.value)}
                  required={reportMaintenance}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUpload">Photo (optional)</Label>
                <Input
                  id="imageUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Return'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
