import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Event } from '../types';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (projectName: string, startDate: Date, timePeriod?: 'AM' | 'PM', endDate?: Date, endTimePeriod?: 'AM' | 'PM') => {
    try {
      const notesObj: Record<string, string> = {};
      if (timePeriod) notesObj.start_time_period = timePeriod;
      if (endTimePeriod) notesObj.end_time_period = endTimePeriod;
      const notes = Object.keys(notesObj).length > 0 ? JSON.stringify(notesObj) : null;

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('events')
        .insert([
          {
            project_name: projectName,
            start_date: startDate.toISOString(),
            end_date: endDate ? endDate.toISOString() : null,
            created_by: currentUser?.id,
            notes: notes,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      fetchEvents();
      return { data, error: null };
    } catch (error) {
      console.error('Error creating event:', error);
      return { data: null, error };
    }
  };

  const updateEventEnd = async (eventId: string, endDate: Date, timePeriod?: 'AM' | 'PM') => {
    try {
      const { data: existingEvent } = await supabase
        .from('events')
        .select('notes')
        .eq('id', eventId)
        .single();

      let notes: Record<string, string> = {};
      if (existingEvent?.notes) {
        try {
          notes = JSON.parse(existingEvent.notes);
        } catch (parseError) {
          console.error('Failed to parse event notes:', parseError);
          // Continue with empty notes object
          notes = {};
        }
      }

      if (timePeriod) {
        notes.end_time_period = timePeriod;
      }

      const { data, error } = await supabase
        .from('events')
        .update({
          end_date: endDate.toISOString(),
          notes: JSON.stringify(notes),
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      fetchEvents();
      return { data, error: null };
    } catch (error) {
      console.error('Error updating event:', error);
      return { data: null, error };
    }
  };

  const updateEventStart = async (eventId: string, startDate: Date, timePeriod?: 'AM' | 'PM') => {
    try {
      const { data: existingEvent } = await supabase
        .from('events')
        .select('notes')
        .eq('id', eventId)
        .single();

      let notes: Record<string, string> = {};
      if (existingEvent?.notes) {
        try {
          notes = JSON.parse(existingEvent.notes);
        } catch (parseError) {
          console.error('Failed to parse event notes:', parseError);
          notes = {};
        }
      }

      if (timePeriod) {
        notes.start_time_period = timePeriod;
      }

      const { data, error } = await supabase
        .from('events')
        .update({
          start_date: startDate.toISOString(),
          notes: JSON.stringify(notes),
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      fetchEvents();
      return { data, error: null };
    } catch (error) {
      console.error('Error updating event start date:', error);
      return { data: null, error };
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      fetchEvents();
      return { error: null };
    } catch (error) {
      console.error('Error deleting event:', error);
      return { error };
    }
  };

  return {
    events,
    loading,
    createEvent,
    updateEventEnd,
    updateEventStart,
    deleteEvent,
    refreshEvents: fetchEvents,
  };
}
