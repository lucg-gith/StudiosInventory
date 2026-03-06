import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Reservation } from '../types';

const RESERVATION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const RESERVATION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

export function useReservations(userId: string | undefined) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [wasAutoCleared, setWasAutoCleared] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchReservations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      setReservations(data || []);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime subscription + initial fetch + cleanup of expired rows on mount
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchReservations();

    // Best-effort cleanup of expired rows on mount
    supabase.rpc('cleanup_expired_reservations').then(() => {});

    const channel = supabase
      .channel('reservation-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          fetchReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchReservations]);

  // Heartbeat: extend TTL on current user's reservations while the app is open
  useEffect(() => {
    if (!userId) return;

    const hasMyReservations = reservations.some((r) => r.user_id === userId);
    if (!hasMyReservations) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }

    heartbeatRef.current = setInterval(async () => {
      // Check if oldest reservation exceeds 8-hour max age
      const myRes = reservations.filter((r) => r.user_id === userId);
      const oldestCreatedAt = Math.min(...myRes.map((r) => new Date(r.created_at).getTime()));
      if (Date.now() - oldestCreatedAt > RESERVATION_MAX_AGE_MS) {
        await supabase.from('reservations').delete().eq('user_id', userId);
        await fetchReservations();
        setWasAutoCleared(true);
        return;
      }

      const newExpiry = new Date(Date.now() + RESERVATION_TTL_MS).toISOString();
      await supabase
        .from('reservations')
        .update({ expires_at: newExpiry })
        .eq('user_id', userId);
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [userId, reservations]);

  const upsertReservation = useCallback(
    async (equipmentId: string, quantity: number, startDate?: string, endDate?: string) => {
      if (!userId) return { error: new Error('Not authenticated') };

      const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS).toISOString();

      const { error } = await supabase
        .from('reservations')
        .upsert(
          {
            user_id: userId,
            equipment_id: equipmentId,
            quantity,
            expires_at: expiresAt,
            start_date: startDate || null,
            end_date: endDate || null,
          },
          { onConflict: 'user_id,equipment_id' }
        );

      if (!error) await fetchReservations();
      return { error };
    },
    [userId, fetchReservations]
  );

  const removeReservation = useCallback(
    async (equipmentId: string) => {
      if (!userId) return { error: new Error('Not authenticated') };

      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('user_id', userId)
        .eq('equipment_id', equipmentId);

      if (!error) await fetchReservations();
      return { error };
    },
    [userId, fetchReservations]
  );

  const clearMyReservations = useCallback(async () => {
    if (!userId) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('user_id', userId);

    if (!error) await fetchReservations();
    return { error };
  }, [userId, fetchReservations]);

  const updateReservationDates = useCallback(
    async (startDate: string, endDate: string) => {
      if (!userId) return { error: new Error('Not authenticated') };

      const { error } = await supabase
        .from('reservations')
        .update({ start_date: startDate, end_date: endDate })
        .eq('user_id', userId);

      if (!error) await fetchReservations();
      return { error };
    },
    [userId, fetchReservations]
  );

  const myReservations = reservations.filter((r) => r.user_id === userId);

  return {
    reservations,
    myReservations,
    loading,
    upsertReservation,
    removeReservation,
    clearMyReservations,
    updateReservationDates,
    refreshReservations: fetchReservations,
    wasAutoCleared,
    resetAutoCleared: () => setWasAutoCleared(false),
  };
}
