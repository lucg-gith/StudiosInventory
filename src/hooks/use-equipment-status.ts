import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export interface CheckedOutUnit {
  unit_id: string;
  unit_number: string;
  user_id: string;
  user_name: string;
  user_email: string;
  event_id: string;
  event_name: string;
  checkout_date: string;
  start_date: string;
  return_date: string | null;
}

export interface EquipmentStatus {
  equipment_id: string;
  equipment_name: string;
  equipment_category: string;
  total_units: number;
  available_count: number;
  in_use_count: number;
  maintenance_count: number;
  broken_count: number;
  checked_out_units: CheckedOutUnit[];
}

export function useEquipmentStatus() {
  const [equipmentStatus, setEquipmentStatus] = useState<EquipmentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEquipmentStatus();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel("equipment_status_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_units" },
        () => {
          fetchEquipmentStatus();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          fetchEquipmentStatus();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          fetchEquipmentStatus();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchEquipmentStatus = async () => {
    try {
      // Fetch all equipment
      const { data: equipmentData, error: equipmentError } = await supabase
        .from("equipment")
        .select("id, name, category")
        .order("name");

      if (equipmentError) throw equipmentError;

      const statusList: EquipmentStatus[] = [];

      for (const equipment of equipmentData || []) {
        // Get all units for this equipment
        const { data: units, error: unitsError } = await supabase
          .from("equipment_units")
          .select("id, unit_number, current_status")
          .eq("equipment_id", equipment.id);

        if (unitsError) {
          console.error("Error fetching units:", unitsError);
          continue;
        }

        const totalUnits = units?.length || 0;
        const availableCount =
          units?.filter((u) => u.current_status === "available").length || 0;
        const inUseCount =
          units?.filter((u) => u.current_status === "in_use").length || 0;
        const maintenanceCount =
          units?.filter((u) => u.current_status === "maintenance").length || 0;
        const brokenCount =
          units?.filter((u) => u.current_status === "broken").length || 0;

        // Get detailed info for each checked-out unit
        const inUseUnits =
          units?.filter((u) => u.current_status === "in_use") || [];
        const checkedOutUnits: CheckedOutUnit[] = [];

        for (const unit of inUseUnits) {
          // Fetch latest CHECK_OUT transaction (no joins — PostgREST can't resolve user_profiles FK)
          const { data: transactions, error: txError } = await supabase
            .from("transactions")
            .select("*")
            .eq("unit_id", unit.id)
            .eq("type", "CHECK_OUT")
            .order("timestamp", { ascending: false })
            .limit(1);

          if (txError || !transactions || transactions.length === 0) continue;

          const tx = transactions[0] as any;

          // Fetch user profile and event separately (parallel)
          const [profileRes, eventRes] = await Promise.all([
            supabase
              .from("user_profiles")
              .select("*")
              .eq("id", tx.user_id)
              .single(),
            supabase.from("events").select("*").eq("id", tx.event_id).single(),
          ]);

          const userProfile = profileRes.data;
          const event = eventRes.data;

          if (userProfile) {
            checkedOutUnits.push({
              unit_id: unit.id,
              unit_number: unit.unit_number,
              user_id: userProfile.id,
              user_name: userProfile.full_name,
              user_email: userProfile.email || "",
              event_id: tx.event_id,
              event_name: event?.project_name || "Unknown project",
              checkout_date: tx.timestamp,
              start_date: event?.start_date || tx.timestamp,
              return_date: event?.end_date,
            });
          }
        }

        statusList.push({
          equipment_id: equipment.id,
          equipment_name: equipment.name,
          equipment_category: equipment.category,
          total_units: totalUnits,
          available_count: availableCount,
          in_use_count: inUseCount,
          maintenance_count: maintenanceCount,
          broken_count: brokenCount,
          checked_out_units: checkedOutUnits,
        });
      }

      setEquipmentStatus(statusList);
    } catch (error) {
      console.error("Error fetching equipment status:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    equipmentStatus,
    loading,
    refreshStatus: fetchEquipmentStatus,
  };
}
