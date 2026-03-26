import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Equipment, EquipmentUnit, Transaction, MaintenanceLog } from '../types';

export type DateRange = '7d' | '30d' | '90d' | 'all';

export interface EquipmentCheckoutCount {
  equipment_id: string;
  equipment_name: string;
  category: string;
  checkout_count: number;
}

export interface UtilizationRate {
  equipment_id: string;
  equipment_name: string;
  category: string;
  total_units: number;
  in_use_units: number;
  utilization_pct: number;
}

export interface MaintenanceFrequency {
  equipment_id: string;
  equipment_name: string;
  incident_count: number;
}

export interface CheckoutTrend {
  period: string;
  checkout_count: number;
}

export interface EquipmentMetrics {
  topEquipment: EquipmentCheckoutCount[];
  utilization: UtilizationRate[];
  maintenanceFrequency: MaintenanceFrequency[];
  checkoutTrends: CheckoutTrend[];
  totalCheckouts: number;
  totalCheckIns: number;
  totalEquipmentTypes: number;
}

interface RawData {
  transactions: Transaction[];
  equipment: Equipment[];
  units: EquipmentUnit[];
  maintenanceLogs: MaintenanceLog[];
}

function getDateCutoff(range: DateRange): Date | null {
  if (range === 'all') return null;
  const now = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function formatPeriod(date: Date, range: DateRange): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  if (range === '7d' || range === '30d') {
    // Group by day
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // Group by month for 90d and all
  return `${y}-${m}`;
}

function computeMetrics(raw: RawData, dateRange: DateRange): EquipmentMetrics {
  const { transactions, equipment, units, maintenanceLogs } = raw;

  const unitsMap = new Map(units.map(u => [u.id, u]));
  const equipMap = new Map(equipment.map(e => [e.id, e]));

  // Filter transactions by date range
  const cutoff = getDateCutoff(dateRange);
  const filtered = cutoff
    ? transactions.filter(tx => new Date(tx.timestamp) >= cutoff)
    : transactions;

  const checkouts = filtered.filter(tx => tx.type === 'CHECK_OUT');
  const checkins = filtered.filter(tx => tx.type === 'CHECK_IN');

  // 1. Most checked-out equipment
  const equipCounts = new Map<string, number>();
  for (const tx of checkouts) {
    const unit = unitsMap.get(tx.unit_id);
    if (!unit) continue;
    equipCounts.set(unit.equipment_id, (equipCounts.get(unit.equipment_id) || 0) + 1);
  }
  const topEquipment: EquipmentCheckoutCount[] = Array.from(equipCounts.entries())
    .map(([eqId, count]) => {
      const eq = equipMap.get(eqId);
      return {
        equipment_id: eqId,
        equipment_name: eq?.name || 'Unknown',
        category: eq?.category || 'unknown',
        checkout_count: count,
      };
    })
    .sort((a, b) => b.checkout_count - a.checkout_count)
    .slice(0, 10);

  // 2. Current utilization (live snapshot, not date-filtered)
  const unitsByEquip = new Map<string, EquipmentUnit[]>();
  for (const unit of units) {
    const list = unitsByEquip.get(unit.equipment_id) || [];
    list.push(unit);
    unitsByEquip.set(unit.equipment_id, list);
  }

  const utilization: UtilizationRate[] = Array.from(unitsByEquip.entries())
    .map(([eqId, eqUnits]) => {
      const eq = equipMap.get(eqId);
      const inUse = eqUnits.filter(u => u.current_status === 'in_use').length;
      return {
        equipment_id: eqId,
        equipment_name: eq?.name || 'Unknown',
        category: eq?.category || 'unknown',
        total_units: eqUnits.length,
        in_use_units: inUse,
        utilization_pct: eqUnits.length > 0 ? Math.round((inUse / eqUnits.length) * 100) : 0,
      };
    })
    .filter(u => u.utilization_pct > 0)
    .sort((a, b) => b.utilization_pct - a.utilization_pct);

  // 3. Maintenance frequency
  const filteredMaint = cutoff
    ? maintenanceLogs.filter(m => new Date(m.created_at) >= cutoff)
    : maintenanceLogs;

  const maintCounts = new Map<string, number>();
  for (const log of filteredMaint) {
    const unit = unitsMap.get(log.unit_id);
    if (!unit) continue;
    maintCounts.set(unit.equipment_id, (maintCounts.get(unit.equipment_id) || 0) + 1);
  }
  const maintenanceFrequency: MaintenanceFrequency[] = Array.from(maintCounts.entries())
    .map(([eqId, count]) => ({
      equipment_id: eqId,
      equipment_name: equipMap.get(eqId)?.name || 'Unknown',
      incident_count: count,
    }))
    .sort((a, b) => b.incident_count - a.incident_count);

  // 4. Checkout trends over time
  const trendMap = new Map<string, number>();
  for (const tx of checkouts) {
    const period = formatPeriod(new Date(tx.timestamp), dateRange);
    trendMap.set(period, (trendMap.get(period) || 0) + 1);
  }
  const checkoutTrends: CheckoutTrend[] = Array.from(trendMap.entries())
    .map(([period, checkout_count]) => ({ period, checkout_count }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return {
    topEquipment,
    utilization,
    maintenanceFrequency,
    checkoutTrends,
    totalCheckouts: checkouts.length,
    totalCheckIns: checkins.length,
    totalEquipmentTypes: equipment.length,
  };
}

export function useEquipmentMetrics(dateRange: DateRange) {
  const [rawData, setRawData] = useState<RawData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      const [txRes, equipRes, unitsRes, maintRes] = await Promise.all([
        supabase.from('transactions').select('*').order('timestamp', { ascending: true }),
        supabase.from('equipment').select('*'),
        supabase.from('equipment_units').select('*'),
        supabase.from('maintenance_logs').select('*'),
      ]);

      if (cancelled) return;

      if (txRes.error || equipRes.error || unitsRes.error || maintRes.error) {
        console.error('Error fetching metrics data:', txRes.error || equipRes.error || unitsRes.error || maintRes.error);
        setLoading(false);
        return;
      }

      setRawData({
        transactions: txRes.data || [],
        equipment: equipRes.data || [],
        units: unitsRes.data || [],
        maintenanceLogs: maintRes.data || [],
      });
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const metrics = useMemo(() => {
    if (!rawData) return null;
    return computeMetrics(rawData, dateRange);
  }, [rawData, dateRange]);

  return { metrics, loading };
}
