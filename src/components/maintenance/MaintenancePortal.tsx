import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';

interface MaintenanceItem {
  id: string;
  description: string;
  image_url: string | null;
  location_held: string | null;
  created_at: string;
  status: string;
  resolved_at: string | null;
  unit: {
    unit_number: string;
    equipment: {
      name: string;
      category: string;
    };
  };
  reporter: {
    full_name: string | null;
    email: string;
  };
}

export function MaintenancePortal() {
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMaintenanceItems();
  }, []);

  const fetchMaintenanceItems = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select(
          `
          *,
          unit:equipment_units!inner(
            unit_number,
            equipment:equipment!inner(
              name,
              category
            )
          ),
          reporter:user_profiles!inner(
            full_name,
            email
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMaintenanceItems((data as any) || []);
    } catch (error) {
      console.error('Error fetching maintenance items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load maintenance items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (itemId: string, unitId: string) => {
    try {
      const { error: logError } = await supabase
        .from('maintenance_logs')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (logError) throw logError;

      const { data: maintenanceLogs } = await supabase
        .from('maintenance_logs')
        .select('id')
        .eq('unit_id', unitId)
        .eq('status', 'pending');

      if (!maintenanceLogs || maintenanceLogs.length === 0) {
        const { error: unitError } = await supabase
          .from('equipment_units')
          .update({ current_status: 'available' })
          .eq('id', unitId);

        if (unitError) throw unitError;
      }

      toast({
        title: 'Success',
        description: 'Maintenance issue marked as resolved',
      });

      fetchMaintenanceItems();
    } catch (error) {
      console.error('Error resolving maintenance:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve maintenance issue',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading maintenance items...</div>;
  }

  const pendingItems = maintenanceItems.filter((item) => item.status === 'pending');
  const resolvedItems = maintenanceItems.filter((item) => item.status === 'resolved');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0A1628] mb-4">Pending Issues</h2>
        {pendingItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No pending maintenance issues</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingItems.map((item) => (
              <Card key={item.id} className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      {(item.unit as any).equipment.name}
                    </span>
                    <span className="text-sm font-normal text-gray-500">
                      {(item.unit as any).unit_number}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Description:</p>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  </div>

                  {item.location_held && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Location:</p>
                      <p className="text-sm text-gray-600">{item.location_held}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-700">Reported by:</p>
                    <p className="text-sm text-gray-600">
                      {(item.reporter as any).full_name || (item.reporter as any).email}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Reported on:</p>
                    <p className="text-sm text-gray-600">{formatDate(item.created_at)}</p>
                  </div>

                  {item.image_url && (
                    <div>
                      <a
                        href={item.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[#4EB5E8] hover:underline"
                      >
                        View Image <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  <Button
                    onClick={() => handleResolve(item.id, (item.unit as any).id)}
                    className="w-full mt-2"
                    size="sm"
                  >
                    Mark as Resolved
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#0A1628] mb-4">Resolved Issues</h2>
        {resolvedItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No resolved issues</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {resolvedItems.map((item) => (
              <Card key={item.id} className="opacity-75">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>{(item.unit as any).equipment.name}</span>
                    <span className="text-sm font-normal text-gray-500">
                      {(item.unit as any).unit_number}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-gray-600">{item.description}</p>
                  <p className="text-sm text-green-600 font-medium">
                    Resolved on {formatDate(item.resolved_at || '')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
