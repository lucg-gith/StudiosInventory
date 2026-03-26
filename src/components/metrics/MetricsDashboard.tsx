import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';
import { TrendingUp, Loader2, ArrowDownCircle, ArrowUpCircle, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';
import { useEquipmentMetrics, type DateRange } from '../../hooks/use-equipment-metrics';

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

const CATEGORY_COLORS: Record<string, string> = {
  camera: '#4EB5E8',
  audio: '#A7001E',
  lens: '#22c55e',
  tripod: '#f59e0b',
  light: '#8b5cf6',
  'extension cable': '#ec4899',
  accessories: '#06b6d4',
  'sd card': '#f97316',
  batteries: '#14b8a6',
  case: '#6366f1',
};

const PIE_COLORS = ['#4EB5E8', '#A7001E', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'];

function formatDuration(hours: number): string {
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = Math.floor(hours / 24);
  const remaining = Math.round(hours % 24);
  return remaining > 0 ? `${days}d ${remaining}h` : `${days}d`;
}

function formatPeriodLabel(period: string): string {
  // "2026-03-25" → "Mar 25" or "2026-03" → "Mar 2026"
  const parts = period.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
  if (parts.length === 3) {
    return `${month} ${parseInt(parts[2], 10)}`;
  }
  return `${month} ${parts[0]}`;
}

export function MetricsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const { metrics, loading } = useEquipmentMetrics(dateRange);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#4EB5E8] mx-auto mb-4" />
        <p className="text-muted-foreground">Loading metrics...</p>
      </div>
    );
  }

  if (!metrics || (metrics.totalCheckouts === 0 && metrics.totalCheckIns === 0)) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium text-foreground mb-1">No usage data yet</p>
        <p className="text-muted-foreground">Check out some equipment to see metrics here.</p>
      </div>
    );
  }

  const trendData = metrics.checkoutTrends.map(t => ({
    ...t,
    label: formatPeriodLabel(t.period),
  }));

  return (
    <div className="space-y-6">
      {/* Header + date range filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-foreground">Equipment Metrics</h2>
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
          {DATE_RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDateRange(value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                dateRange === value
                  ? 'bg-card shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <ArrowUpCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Checkouts</p>
              <p className="text-2xl font-bold text-foreground">{metrics.totalCheckouts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <ArrowDownCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Check-ins</p>
              <p className="text-2xl font-bold text-foreground">{metrics.totalCheckIns}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Layers className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Equipment Types</p>
              <p className="text-2xl font-bold text-foreground">{metrics.totalEquipmentTypes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checkout trends - full width */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Checkout Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 26%)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222 47% 11%)',
                    border: '1px solid hsl(220 13% 26%)',
                    borderRadius: '8px',
                    color: '#f3f4f6',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="checkout_count"
                  stroke="#4EB5E8"
                  fill="#4EB5E8"
                  fillOpacity={0.2}
                  name="Checkouts"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Two-column charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most used equipment */}
        {metrics.topEquipment.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Most Used Equipment</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(200, metrics.topEquipment.length * 36)}>
                <BarChart data={metrics.topEquipment} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 26%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" allowDecimals={false} />
                  <YAxis
                    dataKey="equipment_name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    stroke="#6b7280"
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222 47% 11%)',
                      border: '1px solid hsl(220 13% 26%)',
                      borderRadius: '8px',
                      color: '#f3f4f6',
                    }}
                  />
                  <Bar dataKey="checkout_count" fill="#4EB5E8" radius={[0, 4, 4, 0]} name="Checkouts" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Category breakdown */}
        {metrics.categoryUsage.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={metrics.categoryUsage}
                    dataKey="checkout_count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: '#6b7280' }}
                  >
                    {metrics.categoryUsage.map((entry, i) => (
                      <Cell
                        key={entry.category}
                        fill={CATEGORY_COLORS[entry.category] || PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222 47% 11%)',
                      border: '1px solid hsl(220 13% 26%)',
                      borderRadius: '8px',
                      color: '#f3f4f6',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Second two-column row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Average checkout duration */}
        {metrics.avgDurations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Avg Checkout Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(200, metrics.avgDurations.length * 36)}>
                <BarChart data={metrics.avgDurations} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 26%)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    tickFormatter={(v: number) => formatDuration(v)}
                  />
                  <YAxis
                    dataKey="equipment_name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    stroke="#6b7280"
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222 47% 11%)',
                      border: '1px solid hsl(220 13% 26%)',
                      borderRadius: '8px',
                      color: '#f3f4f6',
                    }}
                    formatter={(value: unknown) => [formatDuration(Number(value)), 'Avg Duration']}
                  />
                  <Bar dataKey="avg_duration_hours" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Avg Duration" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Current utilization */}
        {metrics.utilization.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Current Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.utilization.map((item) => (
                  <div key={item.equipment_id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate mr-2">{item.equipment_name}</span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {item.in_use_units}/{item.total_units} ({item.utilization_pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${item.utilization_pct}%`,
                          backgroundColor: item.utilization_pct >= 80 ? '#ef4444' : item.utilization_pct >= 50 ? '#f59e0b' : '#22c55e',
                        }}
                      />
                    </div>
                  </div>
                ))}
                {metrics.utilization.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">All equipment available</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Maintenance frequency - full width */}
      {metrics.maintenanceFrequency.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Maintenance Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.maintenanceFrequency.map((item, i) => (
                <div
                  key={item.equipment_id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                    <span className="text-sm text-foreground">{item.equipment_name}</span>
                  </div>
                  <span className="text-sm font-medium text-red-400">
                    {item.incident_count} {item.incident_count === 1 ? 'incident' : 'incidents'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
