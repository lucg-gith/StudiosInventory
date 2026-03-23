import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

export function useTransactions(userId: string | undefined) {
  const [checkedOutGear, setCheckedOutGear] = useState<CheckedOutItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchCheckedOutGear();
    }
  }, [userId]);

  const fetchCheckedOutGear = async () => {
    if (!userId) return;

    try {
      const { data: units, error } = await supabase
        .from('equipment_units')
        .select(
          `
          id,
          unit_number,
          equipment_id,
          equipment:equipment_id (
            id,
            name,
            category
          )
        `
        )
        .eq('current_status', 'in_use');

      if (error) throw error;

      const checkedOutItems: CheckedOutItem[] = [];

      for (const unit of units || []) {
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('*, events(*)')
          .eq('unit_id', unit.id)
          .eq('user_id', userId)
          .eq('type', 'CHECK_OUT')
          .order('timestamp', { ascending: false })
          .limit(1);

        if (txError) {
          console.error('Error fetching transaction:', txError);
          continue;
        }

        if (transactions && transactions.length > 0) {
          const tx = transactions[0];
          const hasCheckIn = await supabase
            .from('transactions')
            .select('id')
            .eq('unit_id', unit.id)
            .eq('type', 'CHECK_IN')
            .gt('timestamp', tx.timestamp)
            .limit(1);

          if (!hasCheckIn.data || hasCheckIn.data.length === 0) {
            checkedOutItems.push({
              unit_id: unit.id,
              unit_number: unit.unit_number,
              equipment_id: (unit.equipment as any).id,
              equipment_name: (unit.equipment as any).name,
              equipment_category: (unit.equipment as any).category,
              event_id: tx.event_id,
              event_name: (tx.events as any).project_name,
              checkout_date: (tx.events as any).start_date,
              return_date: (tx.events as any).end_date,
              event_notes: (tx.events as any).notes,
            });
          }
        }
      }

      setCheckedOutGear(checkedOutItems);
    } catch (error) {
      console.error('Error fetching checked out gear:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkInGear = async (
    unitIds: string[],
    eventId: string,
    userId: string,
    reportMaintenance?: {
      unitId: string;
      description: string;
      location: string;
      imageFile?: File;
    }
  ) => {
    try {
      for (const unitId of unitIds) {
        await supabase.from('transactions').insert({
          unit_id: unitId,
          user_id: userId,
          event_id: eventId,
          type: 'CHECK_IN',
        });

        const newStatus = reportMaintenance && reportMaintenance.unitId === unitId ? 'maintenance' : 'available';

        await supabase.from('equipment_units').update({ current_status: newStatus }).eq('id', unitId);

        if (reportMaintenance && reportMaintenance.unitId === unitId) {
          let imageUrl = null;

          if (reportMaintenance.imageFile) {
            const fileExt = reportMaintenance.imageFile.name.split('.').pop();
            const fileName = `${unitId}-${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('maintenance-images')
              .upload(fileName, reportMaintenance.imageFile);

            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage
                .from('maintenance-images')
                .getPublicUrl(fileName);
              imageUrl = urlData.publicUrl;
            }
          }

          await supabase.from('maintenance_logs').insert({
            unit_id: unitId,
            reporter_id: userId,
            description: reportMaintenance.description,
            location_held: reportMaintenance.location,
            image_url: imageUrl,
          });
        }
      }

      await fetchCheckedOutGear();
      return { error: null };
    } catch (error) {
      console.error('Error checking in gear:', error);
      return { error };
    }
  };

  return {
    checkedOutGear,
    loading,
    checkInGear,
    refreshCheckedOutGear: fetchCheckedOutGear,
  };
}
