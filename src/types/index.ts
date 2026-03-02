import type { Database } from './database';

export type Equipment = Database['public']['Tables']['equipment']['Row'];
export type EquipmentUnit = Database['public']['Tables']['equipment_units']['Row'];
export type Event = Database['public']['Tables']['events']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type MaintenanceLog = Database['public']['Tables']['maintenance_logs']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type Reservation = Database['public']['Tables']['reservations']['Row'];

export type UnitStatus = 'available' | 'in_use' | 'maintenance' | 'broken';
export type TransactionType = 'CHECK_OUT' | 'CHECK_IN';

// History entry types for unified timeline (transactions + maintenance logs)
export type HistoryEntryType = 'CHECK_OUT' | 'CHECK_IN' | 'MARKED_BROKEN' | 'MARKED_REPAIRED';

interface BaseHistoryEntry {
  id: string;
  timestamp: string;
  type: HistoryEntryType;
  user: {
    full_name: string | null;
    email: string;
  };
  unit: {
    unit_number: string;
    equipment: {
      name: string;
      category: string;
    };
  };
}

export interface TransactionHistoryEntry extends BaseHistoryEntry {
  type: 'CHECK_OUT' | 'CHECK_IN';
  event: {
    project_name: string;
  };
}

export interface MaintenanceHistoryEntry extends BaseHistoryEntry {
  type: 'MARKED_BROKEN' | 'MARKED_REPAIRED';
  description: string;
  location_held: string | null;
  image_url: string | null;
}

export type HistoryEntry = TransactionHistoryEntry | MaintenanceHistoryEntry;

// Type guards
export function isTransactionEntry(entry: HistoryEntry): entry is TransactionHistoryEntry {
  return entry.type === 'CHECK_OUT' || entry.type === 'CHECK_IN';
}

export function isMaintenanceEntry(entry: HistoryEntry): entry is MaintenanceHistoryEntry {
  return entry.type === 'MARKED_BROKEN' || entry.type === 'MARKED_REPAIRED';
}

export interface EquipmentWithUnits extends Equipment {
  units: EquipmentUnit[];
  available_count: number;
}

export interface TransactionWithDetails extends Transaction {
  equipment_unit: EquipmentUnit & {
    equipment: Equipment;
  };
  user_profile: UserProfile;
  event: Event;
}

export interface MaintenanceLogWithDetails extends MaintenanceLog {
  equipment_unit: EquipmentUnit & {
    equipment: Equipment;
  };
  reporter: UserProfile;
}

export interface CheckOutFormData {
  equipmentId: string;
  quantity: number;
  eventId: string;
  newEventName?: string;
  startDate: Date;
}

export interface CaseItem {
  equipmentId: string;
  name: string;
  category: string;
  quantity: number;
  maxAvailable: number;
}

export interface CheckInFormData {
  unitIds: string[];
  eventId: string;
  endDate: Date;
  reportMaintenance?: boolean;
  maintenanceDescription?: string;
  maintenanceLocation?: string;
}
