import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { EquipmentWithUnits } from '../types';

export function useEquipment() {
  const [equipment, setEquipment] = useState<EquipmentWithUnits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEquipment();

    const channel = supabase
      .channel('equipment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment',
        },
        () => {
          fetchEquipment();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment_units',
        },
        () => {
          fetchEquipment();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEquipment = async () => {
    try {
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (equipmentError) throw equipmentError;

      const { data: unitsData, error: unitsError } = await supabase
        .from('equipment_units')
        .select('*');

      if (unitsError) throw unitsError;

      const equipmentWithUnits: EquipmentWithUnits[] = (equipmentData || []).map((eq) => {
        const units = (unitsData || []).filter((u) => u.equipment_id === eq.id);
        const available_count = units.filter((u) => u.current_status === 'available').length;
        return {
          ...eq,
          units,
          available_count,
        };
      });

      setEquipment(equipmentWithUnits);
      setError(null);
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setError('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const addEquipment = async (name: string, category: string, quantity: number) => {
    const { data: eq, error: eqError } = await supabase
      .from('equipment')
      .insert({ name, category, total_quantity: quantity })
      .select()
      .single();

    if (eqError) return { error: eqError };

    const units = Array.from({ length: quantity }, (_, i) => ({
      equipment_id: eq.id,
      unit_number: `Unit ${i + 1}`,
    }));

    const { error: unitsError } = await supabase
      .from('equipment_units')
      .insert(units);

    if (unitsError) return { error: unitsError };
    return { error: null };
  };

  const updateEquipment = async (id: string, name: string, category: string) => {
    const { error } = await supabase
      .from('equipment')
      .update({ name, category })
      .eq('id', id);

    return { error };
  };

  const deleteEquipment = async (id: string) => {
    // Check if any unit is currently in_use
    const { data: inUseUnits } = await supabase
      .from('equipment_units')
      .select('id')
      .eq('equipment_id', id)
      .eq('current_status', 'in_use')
      .limit(1);

    if (inUseUnits && inUseUnits.length > 0) {
      return { error: { message: 'Cannot delete equipment with units currently in use' } };
    }

    // CASCADE handles equipment_units, transactions, maintenance_logs
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id);

    return { error };
  };

  const addUnits = async (equipmentId: string, count: number) => {
    // Find the highest existing unit number
    const { data: existingUnits } = await supabase
      .from('equipment_units')
      .select('unit_number')
      .eq('equipment_id', equipmentId);

    const maxNum = (existingUnits || []).reduce((max, u) => {
      const match = u.unit_number.match(/^Unit (\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);

    const units = Array.from({ length: count }, (_, i) => ({
      equipment_id: equipmentId,
      unit_number: `Unit ${maxNum + i + 1}`,
    }));

    const { error: unitsError } = await supabase
      .from('equipment_units')
      .insert(units);

    if (unitsError) return { error: unitsError };

    // Update total_quantity
    const { error: eqError } = await supabase
      .from('equipment')
      .update({ total_quantity: (existingUnits?.length || 0) + count })
      .eq('id', equipmentId);

    return { error: eqError };
  };

  const deleteUnit = async (unitId: string) => {
    // Get the unit to find its equipment_id
    const { data: unit } = await supabase
      .from('equipment_units')
      .select('equipment_id, current_status')
      .eq('id', unitId)
      .single();

    if (!unit) return { error: { message: 'Unit not found' } };
    if (unit.current_status === 'in_use') {
      return { error: { message: 'Cannot delete a unit that is currently in use' } };
    }

    const { error: delError } = await supabase
      .from('equipment_units')
      .delete()
      .eq('id', unitId);

    if (delError) return { error: delError };

    // Decrement total_quantity
    const { data: remaining } = await supabase
      .from('equipment_units')
      .select('id')
      .eq('equipment_id', unit.equipment_id);

    const { error: eqError } = await supabase
      .from('equipment')
      .update({ total_quantity: remaining?.length || 0 })
      .eq('id', unit.equipment_id);

    return { error: eqError };
  };

  const markUnitBroken = async (
    unitId: string,
    reporterId: string,
    description?: string,
    location?: string,
    imageFile?: File
  ) => {
    // Update unit status
    const { error: unitError } = await supabase
      .from('equipment_units')
      .update({ current_status: 'broken' })
      .eq('id', unitId);

    if (unitError) return { error: unitError };

    // Upload image if provided
    let imageUrl: string | null = null;
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${unitId}-${Date.now()}.${fileExt}`;
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

    // Create maintenance log
    const { error: logError } = await supabase
      .from('maintenance_logs')
      .insert({
        unit_id: unitId,
        reporter_id: reporterId,
        description: description || null,
        location_held: location || null,
        image_url: imageUrl,
      });

    return { error: logError };
  };

  const markUnitRepaired = async (unitId: string) => {
    // Set unit back to available
    const { error: unitError } = await supabase
      .from('equipment_units')
      .update({ current_status: 'available' })
      .eq('id', unitId);

    if (unitError) return { error: unitError };

    // Resolve all pending maintenance logs for this unit
    const { error: logError } = await supabase
      .from('maintenance_logs')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('unit_id', unitId)
      .eq('status', 'pending');

    return { error: logError };
  };

  return {
    equipment,
    loading,
    error,
    refreshEquipment: fetchEquipment,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    addUnits,
    deleteUnit,
    markUnitBroken,
    markUnitRepaired,
  };
}
