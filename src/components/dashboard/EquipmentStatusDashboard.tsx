import { useState } from 'react';
import { Package, CheckCircle, AlertCircle, Wrench, User, Loader2 } from 'lucide-react';
import { cn, formatDateTime } from '../../lib/utils';
import { useEquipmentStatus } from '../../hooks/use-equipment-status';
import type { EquipmentStatus } from '../../hooks/use-equipment-status';

type StatusView = 'all' | 'available' | 'in_use';

const CATEGORY_ORDER = ['camera', 'audio', 'lens', 'tripod', 'light', 'extension cable', 'accessories', 'sd card', 'batteries', 'case'];

function sortCategories(a: string, b: string) {
  const ia = CATEGORY_ORDER.indexOf(a.toLowerCase());
  const ib = CATEGORY_ORDER.indexOf(b.toLowerCase());
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
}

function StatusPill({ available, total }: { available: number; total: number }) {
  const allAvailable = available === total;
  const noneAvailable = available === 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        allAvailable && 'bg-green-950 text-green-400',
        noneAvailable && 'bg-red-950 text-red-400',
        !allAvailable && !noneAvailable && 'bg-yellow-950 text-yellow-400'
      )}
    >
      {allAvailable && <CheckCircle className="h-3 w-3" />}
      {noneAvailable && <AlertCircle className="h-3 w-3" />}
      {!allAvailable && !noneAvailable && <Package className="h-3 w-3" />}
      {available} / {total}
    </span>
  );
}

function EquipmentRow({ item, showCheckoutDetails }: { item: EquipmentStatus; showCheckoutDetails: boolean }) {
  const hasCheckouts = showCheckoutDetails && item.checked_out_units.length > 0;
  const hasMaintenance = item.maintenance_count > 0;
  const hasBroken = item.broken_count > 0;

  return (
    <div className="border-b last:border-b-0">
      {/* Main row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between w-full sm:w-auto sm:flex-1 min-w-0">
          <span className="font-medium text-foreground">{item.equipment_name}</span>
          {/* StatusPill next to name on mobile, at far right on desktop */}
          <span className="sm:hidden">
            <StatusPill available={item.available_count} total={item.total_units} />
          </span>
        </div>

        {/* Status counts */}
        <div className="flex items-center gap-3 sm:gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-1.5 text-green-400">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>{item.available_count}</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-400">
            <Package className="h-3.5 w-3.5" />
            <span>{item.in_use_count}</span>
            {item.checked_out_units.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal truncate hidden md:inline max-w-[350px]">
                — {item.checked_out_units.map((u) =>
                  u.return_date
                    ? `${u.user_name} (return ${formatDateTime(u.return_date)})`
                    : u.user_name
                ).join(', ')}
              </span>
            )}
          </div>
          {hasBroken && (
            <div className="flex items-center gap-1.5 text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{item.broken_count}</span>
            </div>
          )}
          {hasMaintenance && (
            <div className="flex items-center gap-1.5 text-orange-400">
              <Wrench className="h-3.5 w-3.5" />
              <span>{item.maintenance_count}</span>
            </div>
          )}
        </div>

        <span className="hidden sm:inline-flex">
          <StatusPill available={item.available_count} total={item.total_units} />
        </span>
      </div>

      {/* Checked-out unit details */}
      {hasCheckouts && (
        <div className="px-3 sm:px-4 pb-3">
          <div className="space-y-1.5">
            {item.checked_out_units.map((unit) => (
              <div
                key={unit.unit_id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-sm bg-red-950/30 rounded px-2 sm:px-3 py-2 sm:py-1.5"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <User className="h-3.5 w-3.5 text-[#4EB5E8] flex-shrink-0" />
                  <span className="font-medium text-foreground">{unit.user_name}</span>
                  {unit.user_email && (
                    <>
                      <span className="text-muted-foreground hidden sm:inline">&middot;</span>
                      <span
                        className="text-muted-foreground text-xs truncate max-w-[180px]"
                        title={unit.user_email}
                      >
                        ({unit.user_email})
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap pl-5 sm:pl-0">
                  <span className="text-muted-foreground hidden sm:inline">&middot;</span>
                  <span className="text-muted-foreground truncate">{unit.event_name}</span>
                  <span className="text-muted-foreground hidden sm:inline">&middot;</span>
                  <span className={`text-xs whitespace-nowrap ${unit.return_date ? 'text-orange-400' : 'text-muted-foreground'}`}>
                    {unit.return_date ? `Return ${formatDateTime(unit.return_date)}` : 'No return date'}
                  </span>
                </div>
                <span className="ml-0 sm:ml-auto mt-1 sm:mt-0 px-1.5 py-0.5 bg-muted text-xs rounded text-muted-foreground flex-shrink-0">
                  {unit.unit_number}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EquipmentStatusDashboard() {
  const { equipmentStatus, loading } = useEquipmentStatus();
  const [activeView, setActiveView] = useState<StatusView>('all');

  const toggleView = (view: StatusView) => {
    setActiveView((prev) => (prev === view ? 'all' : view));
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#4EB5E8] mx-auto mb-4" />
        <p className="text-muted-foreground">Loading equipment status...</p>
      </div>
    );
  }

  // Summary counts (always from full data)
  const totalUnits = equipmentStatus.reduce((s, e) => s + e.total_units, 0);
  const totalAvailable = equipmentStatus.reduce((s, e) => s + e.available_count, 0);
  const totalInUse = equipmentStatus.reduce((s, e) => s + e.in_use_count, 0);
  const totalMaintenance = equipmentStatus.reduce((s, e) => s + e.maintenance_count, 0);
  const totalBroken = equipmentStatus.reduce((s, e) => s + e.broken_count, 0);

  // Filter based on active view
  const filteredStatus =
    activeView === 'available'
      ? equipmentStatus.filter((e) => e.available_count > 0)
      : activeView === 'in_use'
        ? equipmentStatus.filter((e) => e.in_use_count > 0)
        : equipmentStatus;

  // Group filtered results by category
  const byCategory = filteredStatus.reduce((acc, item) => {
    const cat = item.equipment_category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, EquipmentStatus[]>);

  const categoryEntries = Object.entries(byCategory).sort(([a], [b]) => sortCategories(a, b));

  // Show checkout details in "all" and "in_use" views
  const showCheckoutDetails = activeView !== 'available';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Equipment Status</h2>
        <span className="text-sm text-muted-foreground">
          {equipmentStatus.length} types &middot; {totalUnits} units
        </span>
      </div>

      {/* Summary bar — interactive toggle buttons */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 px-3 sm:px-4 py-3 bg-muted rounded-lg border">
        {/* Available toggle */}
        <button
          onClick={() => toggleView('available')}
          className={cn(
            'flex items-center gap-2 px-2 sm:px-3 py-3 sm:py-2 rounded-lg transition-all cursor-pointer min-h-[44px] sm:min-h-0',
            activeView === 'available'
              ? 'bg-green-950 ring-2 ring-green-500'
              : 'hover:bg-green-950/50'
          )}
        >
          <div className="h-7 w-7 rounded-full bg-green-950 flex items-center justify-center">
            <CheckCircle className="h-3.5 w-3.5 text-green-400" />
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-sm font-bold text-foreground">{totalAvailable}</p>
          </div>
        </button>

        {/* In Use toggle */}
        <button
          onClick={() => toggleView('in_use')}
          className={cn(
            'flex items-center gap-2 px-2 sm:px-3 py-3 sm:py-2 rounded-lg transition-all cursor-pointer min-h-[44px] sm:min-h-0',
            activeView === 'in_use'
              ? 'bg-blue-950 ring-2 ring-blue-500'
              : 'hover:bg-blue-950/50'
          )}
        >
          <div className="h-7 w-7 rounded-full bg-blue-950 flex items-center justify-center">
            <Package className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">In Use</p>
            <p className="text-sm font-bold text-foreground">{totalInUse}</p>
          </div>
        </button>

        {/* Broken — static (no toggle) */}
        {totalBroken > 0 && (
          <div className="flex items-center gap-2 px-2 sm:px-3 py-3 sm:py-2">
            <div className="h-7 w-7 rounded-full bg-red-950 flex items-center justify-center">
              <AlertCircle className="h-3.5 w-3.5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Broken</p>
              <p className="text-sm font-bold text-foreground">{totalBroken}</p>
            </div>
          </div>
        )}

        {/* Maintenance — static (no toggle) */}
        {totalMaintenance > 0 && (
          <div className="flex items-center gap-2 px-2 sm:px-3 py-3 sm:py-2">
            <div className="h-7 w-7 rounded-full bg-orange-950 flex items-center justify-center">
              <Wrench className="h-3.5 w-3.5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Maintenance</p>
              <p className="text-sm font-bold text-foreground">{totalMaintenance}</p>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {filteredStatus.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {activeView === 'available'
              ? 'No equipment available'
              : activeView === 'in_use'
                ? 'No equipment currently in use'
                : 'No equipment found'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {categoryEntries.map(([category, items]) => (
            <div key={category}>
              {/* Category header */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-foreground capitalize">{category}</h3>
                <span className="text-sm text-muted-foreground">
                  ({items.length} type{items.length !== 1 ? 's' : ''})
                </span>
              </div>

              {/* Equipment list for this category */}
              <div className="border rounded-lg overflow-hidden bg-card">
                {items.map((item) => (
                  <EquipmentRow
                    key={item.equipment_id}
                    item={item}
                    showCheckoutDetails={showCheckoutDetails}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
