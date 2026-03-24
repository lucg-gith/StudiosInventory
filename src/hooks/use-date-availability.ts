import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { EquipmentWithUnits, Reservation, DateOverlap } from '../types';
import type { EquipmentStatus, CheckedOutUnit } from './use-equipment-status';

/**
 * Check if two date ranges overlap.
 * Ranges [aStart, aEnd] and [bStart, bEnd] overlap when aStart <= bEnd AND aEnd >= bStart.
 */
function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string | null
): boolean {
  const aS = aStart.split('T')[0];
  const aE = aEnd.split('T')[0];
  const bS = bStart.split('T')[0];
  const bE = bEnd ? bEnd.split('T')[0] : '9999-12-31'; // no end = indefinite
  return aS <= bE && aE >= bS;
}

/**
 * Resolves user_id → display name from user_profiles.
 * Caches results to avoid repeated queries.
 */
const profileCache = new Map<string, string>();

async function resolveUserName(userId: string): Promise<string> {
  if (profileCache.has(userId)) return profileCache.get(userId)!;

  const { data } = await supabase
    .from('user_profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single();

  const name = data?.full_name || data?.email || 'Unknown user';
  profileCache.set(userId, name);
  return name;
}

export function useDateAvailability(
  equipment: EquipmentWithUnits[],
  reservations: Reservation[],
  equipmentStatus: EquipmentStatus[]
) {
  // Cache for user names resolved from reservation user_ids
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  // Resolve user names for all reservation user_ids we don't have yet
  useEffect(() => {
    const unknownIds = reservations
      .map((r) => r.user_id)
      .filter((id, i, arr) => arr.indexOf(id) === i && !userNames[id]);

    if (unknownIds.length === 0) return;

    Promise.all(unknownIds.map((id) => resolveUserName(id))).then((names) => {
      const newEntries: Record<string, string> = {};
      unknownIds.forEach((id, i) => {
        newEntries[id] = names[i];
      });
      setUserNames((prev) => ({ ...prev, ...newEntries }));
    });
  }, [reservations]);

  /**
   * Get all checked-out units for a given equipment ID.
   * Returns units with their booking start/end dates from equipmentStatus.
   */
  const getCheckedOutUnits = useCallback(
    (equipmentId: string): CheckedOutUnit[] => {
      const status = equipmentStatus.find((s) => s.equipment_id === equipmentId);
      return status?.checked_out_units || [];
    },
    [equipmentStatus]
  );

  /**
   * Get overlaps for an equipment item against a given date range.
   * Returns structured DateOverlap[] for display in the UI.
   */
  const getOverlaps = useCallback(
    (equipmentId: string, startDate: string, endDate: string, currentUserId: string): DateOverlap[] => {
      const eq = equipment.find((e) => e.id === equipmentId);
      if (!eq) return [];

      const totalUnits = eq.units.length;
      const overlaps: DateOverlap[] = [];

      // 1. Count checked-out units that overlap (by other users)
      const checkedOut = getCheckedOutUnits(equipmentId);
      let overlappingCheckoutCount = 0;

      for (const unit of checkedOut) {
        if (unit.user_id === currentUserId) continue;
        if (rangesOverlap(startDate, endDate, unit.start_date, unit.return_date)) {
          overlappingCheckoutCount++;
          // Collect overlap info for display (will filter at the end)
          const alreadyExists = overlaps.some(
            (o) =>
              o.conflictingUserName === unit.user_name &&
              o.startDate === unit.start_date.split('T')[0] &&
              o.source === 'checkout'
          );
          if (!alreadyExists) {
            overlaps.push({
              equipmentId,
              equipmentName: eq.name,
              conflictingUserName: unit.user_name,
              startDate: unit.start_date.split('T')[0],
              endDate: (unit.return_date || 'indefinite').split('T')[0],
              source: 'checkout',
            });
          }
        }
      }

      // 2. Count overlapping reservation quantities (by other users)
      const othersReservations = reservations.filter(
        (r) =>
          r.equipment_id === equipmentId &&
          r.user_id !== currentUserId &&
          r.start_date &&
          r.end_date
      );

      let overlappingReservationQty = 0;

      for (const res of othersReservations) {
        if (rangesOverlap(startDate, endDate, res.start_date!, res.end_date!)) {
          overlappingReservationQty += res.quantity || 1;
          const name = userNames[res.user_id] || 'Another user';
          overlaps.push({
            equipmentId,
            equipmentName: eq.name,
            conflictingUserName: name,
            startDate: res.start_date!.split('T')[0],
            endDate: res.end_date!.split('T')[0],
            source: 'reservation',
          });
        }
      }

      // 3. Only warn if ALL units are taken during the overlap period
      const totalInUse = overlappingCheckoutCount + overlappingReservationQty;
      if (totalInUse >= totalUnits) {
        return overlaps;
      }

      return []; // Units still available — no conflict
    },
    [equipment, reservations, equipmentStatus, getCheckedOutUnits, userNames]
  );

  /**
   * Check if a reservation (with or without dates) blocks availability today.
   */
  const reservationAffectsToday = useCallback((reservation: Reservation): boolean => {
    // No dates = always blocks (item just added to case)
    if (!reservation.start_date || !reservation.end_date) return true;

    const today = new Date().toISOString().split('T')[0];
    const rStart = reservation.start_date.split('T')[0];
    const rEnd = reservation.end_date.split('T')[0];
    return today >= rStart && today <= rEnd;
  }, []);

  return {
    getOverlaps,
    getCheckedOutUnits,
    reservationAffectsToday,
  };
}
