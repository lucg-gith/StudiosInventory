import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Search, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Wrench, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDateTime, cn } from '../../lib/utils';
import type {
  HistoryEntry,
  TransactionHistoryEntry,
  MaintenanceHistoryEntry
} from '../../types';
import { isTransactionEntry, isMaintenanceEntry } from '../../types';

export function TransactionHistory() {
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHistoryEntries();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = historyEntries.filter((entry) => {
        const equipName = entry.unit.equipment.name.toLowerCase();
        const userName = entry.user.full_name?.toLowerCase() || entry.user.email.toLowerCase();

        if (equipName.includes(term) || userName.includes(term)) {
          return true;
        }

        if (isTransactionEntry(entry)) {
          return entry.event.project_name.toLowerCase().includes(term);
        }

        if (isMaintenanceEntry(entry)) {
          const description = entry.description.toLowerCase();
          const location = entry.location_held?.toLowerCase() || '';
          return description.includes(term) || location.includes(term);
        }

        return false;
      });
      setFilteredEntries(filtered);
    } else {
      setFilteredEntries(historyEntries);
    }
  }, [searchTerm, historyEntries]);

  const fetchHistoryEntries = async () => {
    try {
      // Step 1: Fetch both transactions and maintenance logs in parallel
      const [txRes, maintRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50),
        supabase
          .from('maintenance_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (txRes.error) throw txRes.error;
      if (maintRes.error) throw maintRes.error;

      const txData = txRes.data || [];
      const maintData = maintRes.data || [];

      if (txData.length === 0 && maintData.length === 0) {
        setHistoryEntries([]);
        setFilteredEntries([]);
        return;
      }

      // Step 2: Collect unique IDs for batch fetching
      const unitIds = [...new Set([
        ...txData.map((t) => t.unit_id),
        ...maintData.map((m) => m.unit_id)
      ])];
      const userIds = [...new Set([
        ...txData.map((t) => t.user_id),
        ...maintData.map((m) => m.reporter_id)
      ])];
      const eventIds = [...new Set(txData.map((t) => t.event_id))];

      // Step 3: Batch fetch related records in parallel
      const [unitsRes, equipRes, profilesRes, eventsRes] = await Promise.all([
        supabase.from('equipment_units').select('*').in('id', unitIds),
        supabase.from('equipment').select('*'),
        supabase.from('user_profiles').select('*').in('id', userIds),
        supabase.from('events').select('*').in('id', eventIds)
      ]);

      // Step 4: Build lookup maps
      const unitsMap = new Map((unitsRes.data || []).map((u) => [u.id, u]));
      const equipMap = new Map((equipRes.data || []).map((e) => [e.id, e]));
      const profilesMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
      const eventsMap = new Map((eventsRes.data || []).map((e) => [e.id, e]));

      // Step 5: Transform into unified history entries
      const transactionEntries: TransactionHistoryEntry[] = txData.map((tx) => {
        const unit = unitsMap.get(tx.unit_id);
        const equipment = unit ? equipMap.get((unit as any).equipment_id) : null;
        const profile = profilesMap.get(tx.user_id);
        const event = eventsMap.get(tx.event_id);

        return {
          id: tx.id,
          timestamp: tx.timestamp,
          type: tx.type,
          user: {
            full_name: profile?.full_name || null,
            email: profile?.email || 'Unknown'
          },
          unit: {
            unit_number: unit?.unit_number || 'Unknown',
            equipment: {
              name: equipment?.name || 'Unknown',
              category: equipment?.category || 'unknown'
            }
          },
          event: {
            project_name: event?.project_name || 'Unknown'
          },
          notes: tx.notes,
        };
      });

      const maintenanceEntries: MaintenanceHistoryEntry[] = [
        // MARKED_BROKEN entries (always created)
        ...maintData.map((m) => {
          const unit = unitsMap.get(m.unit_id);
          const equipment = unit ? equipMap.get((unit as any).equipment_id) : null;
          const profile = profilesMap.get(m.reporter_id);

          return {
            id: `${m.id}-created`,
            timestamp: m.created_at,
            type: 'MARKED_BROKEN' as const,
            user: {
              full_name: profile?.full_name || null,
              email: profile?.email || 'Unknown'
            },
            unit: {
              unit_number: unit?.unit_number || 'Unknown',
              equipment: {
                name: equipment?.name || 'Unknown',
                category: equipment?.category || 'unknown'
              }
            },
            description: m.description || '',
            location_held: m.location_held,
            image_url: m.image_url
          };
        }),
        // MARKED_REPAIRED entries (only if resolved)
        ...maintData
          .filter((m) => m.resolved_at !== null)
          .map((m) => {
            const unit = unitsMap.get(m.unit_id);
            const equipment = unit ? equipMap.get((unit as any).equipment_id) : null;
            const profile = profilesMap.get(m.reporter_id);

            return {
              id: `${m.id}-resolved`,
              timestamp: m.resolved_at!,
              type: 'MARKED_REPAIRED' as const,
              user: {
                full_name: profile?.full_name || null,
                email: profile?.email || 'Unknown'
              },
              unit: {
                unit_number: unit?.unit_number || 'Unknown',
                equipment: {
                  name: equipment?.name || 'Unknown',
                  category: equipment?.category || 'unknown'
                }
              },
              description: m.description || '',
              location_held: m.location_held,
              image_url: m.image_url
            };
          })
      ];

      // Step 6: Merge and sort by timestamp
      const allEntries = [...transactionEntries, ...maintenanceEntries]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setHistoryEntries(allEntries);
      setFilteredEntries(allEntries);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading transaction history...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Transaction History</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Equipment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Date/Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={cn(
                      "hover:bg-accent transition-colors",
                      isMaintenanceEntry(entry) && "bg-amber-50/20 dark:bg-amber-950/10"
                    )}
                  >
                    {/* Type Column */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {entry.type === 'CHECK_OUT' && (
                          <>
                            <ArrowDownCircle className="h-4 w-4 text-orange-400" />
                            <span className="text-sm font-medium text-orange-400">Check Out</span>
                          </>
                        )}
                        {entry.type === 'CHECK_IN' && (
                          <>
                            <ArrowUpCircle className="h-4 w-4 text-green-400" />
                            <span className="text-sm font-medium text-green-400">Check In</span>
                            {isTransactionEntry(entry) && entry.notes && (() => {
                              try {
                                const parsed = JSON.parse(entry.notes!);
                                if (parsed.proxy_return) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs">
                                      <UserCheck className="h-3 w-3" />
                                      by {parsed.returned_by_name}
                                    </span>
                                  );
                                }
                              } catch { /* not JSON */ }
                              return null;
                            })()}
                          </>
                        )}
                        {entry.type === 'MARKED_BROKEN' && (
                          <>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-red-500">Marked Broken</span>
                          </>
                        )}
                        {entry.type === 'MARKED_REPAIRED' && (
                          <>
                            <Wrench className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">Repaired</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Equipment Column */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {entry.unit.equipment.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {entry.unit.equipment.category}
                        </p>
                      </div>
                    </td>

                    {/* Unit Column */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-muted-foreground">
                        {entry.unit.unit_number}
                      </span>
                    </td>

                    {/* User Column */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-muted-foreground">
                        {entry.user.full_name || entry.user.email}
                      </span>
                    </td>

                    {/* Details Column (Project OR Description) */}
                    <td className="px-4 py-3">
                      {isTransactionEntry(entry) ? (
                        <span className="text-sm text-muted-foreground">
                          {entry.event.project_name}
                        </span>
                      ) : (
                        <div className="max-w-xs">
                          <p className="text-sm text-muted-foreground truncate" title={entry.description}>
                            {entry.description || 'No description'}
                          </p>
                          {entry.location_held && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              📍 {entry.location_held}
                            </p>
                          )}
                          {entry.image_url && (
                            <a
                              href={entry.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#4EB5E8] hover:underline mt-0.5 inline-block"
                            >
                              View Photo
                            </a>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Date/Time Column */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(entry.timestamp)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No history found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
