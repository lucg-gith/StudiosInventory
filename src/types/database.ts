export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UnitStatus = "available" | "in_use" | "maintenance" | "broken";
export type TransactionType = "CHECK_OUT" | "CHECK_IN";

export interface Database {
  public: {
    Tables: {
      equipment: {
        Row: {
          id: string;
          name: string;
          category: string;
          total_quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          total_quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          total_quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      equipment_units: {
        Row: {
          id: string;
          equipment_id: string;
          unit_number: string;
          current_status: UnitStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          equipment_id: string;
          unit_number: string;
          current_status?: UnitStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          equipment_id?: string;
          unit_number?: string;
          current_status?: UnitStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          project_name: string;
          start_date: string;
          end_date: string | null;
          created_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_name: string;
          start_date: string;
          end_date?: string | null;
          created_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_name?: string;
          start_date?: string;
          end_date?: string | null;
          created_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          unit_id: string;
          user_id: string;
          event_id: string;
          type: TransactionType;
          timestamp: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          unit_id: string;
          user_id: string;
          event_id: string;
          type: TransactionType;
          timestamp?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          unit_id?: string;
          user_id?: string;
          event_id?: string;
          type?: TransactionType;
          timestamp?: string;
          notes?: string | null;
        };
      };
      maintenance_logs: {
        Row: {
          id: string;
          unit_id: string;
          reporter_id: string;
          description: string;
          image_url: string | null;
          location_held: string | null;
          status: string;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          unit_id: string;
          reporter_id: string;
          description: string;
          image_url?: string | null;
          location_held?: string | null;
          status?: string;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          unit_id?: string;
          reporter_id?: string;
          description?: string;
          image_url?: string | null;
          location_held?: string | null;
          status?: string;
          created_at?: string;
          resolved_at?: string | null;
        };
      };
      reservations: {
        Row: {
          id: string;
          user_id: string;
          equipment_id: string;
          quantity: number;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          equipment_id: string;
          quantity?: number;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          equipment_id?: string;
          quantity?: number;
          created_at?: string;
          expires_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
