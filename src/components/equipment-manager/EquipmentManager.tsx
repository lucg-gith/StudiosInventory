import { useState, useEffect } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle,
  Package,
  Wrench,
  ExternalLink,
  Camera,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn, formatDate } from '../../lib/utils';
import { useEquipment } from '../../hooks/use-equipment';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';
import type { EquipmentUnit } from '../../types';

// File upload security constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const CATEGORY_ORDER = [
  'Camera',
  'Audio',
  'Lens',
  'Tripod',
  'Light',
  'Extension Cable',
  'Accessories',
  'SD Card',
  'Batteries',
  'Case',
];

function sortCategories(a: string, b: string) {
  const ia = CATEGORY_ORDER.findIndex((c) => c.toLowerCase() === a.toLowerCase());
  const ib = CATEGORY_ORDER.findIndex((c) => c.toLowerCase() === b.toLowerCase());
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
}

// ── Status badge for individual units ──────────────────────────

function UnitStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    available: 'bg-green-950 text-green-400',
    in_use: 'bg-blue-950 text-blue-400',
    maintenance: 'bg-orange-950 text-orange-400',
    broken: 'bg-red-950 text-red-400',
  };
  const labels: Record<string, string> = {
    available: 'Available',
    in_use: 'In Use',
    maintenance: 'Maintenance',
    broken: 'Broken',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', styles[status] || 'bg-muted text-muted-foreground')}>
      {labels[status] || status}
    </span>
  );
}

// ── Maintenance log type for To Repair view ────────────────────

interface MaintenanceItem {
  id: string;
  unit_id: string;
  description: string;
  image_url: string | null;
  location_held: string | null;
  created_at: string;
  unit_number: string;
  equipment_name: string;
  equipment_category: string;
  reporter_name: string | null;
  reporter_email: string;
}

// ── Main Component ─────────────────────────────────────────────

interface EquipmentManagerProps {
  userId: string;
}

export function EquipmentManager({ userId }: EquipmentManagerProps) {
  const {
    equipment,
    loading,
    refreshEquipment,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    addUnits,
    deleteUnit,
    markUnitBroken,
    markUnitRepaired,
  } = useEquipment();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'list' | 'repair'>('list');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Add Equipment dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryCustom, setNewCategoryCustom] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [addLoading, setAddLoading] = useState(false);

  // Edit equipment inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Mark Broken dialog
  const [brokenDialogOpen, setBrokenDialogOpen] = useState(false);
  const [brokenUnitId, setBrokenUnitId] = useState<string | null>(null);
  const [brokenDescription, setBrokenDescription] = useState('');
  const [brokenLocation, setBrokenLocation] = useState('');
  const [brokenImage, setBrokenImage] = useState<File | null>(null);
  const [brokenLoading, setBrokenLoading] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');

  // To Repair data
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [repairLoading, setRepairLoading] = useState(false);

  // Fetch maintenance items for "To Repair" tab
  useEffect(() => {
    if (activeTab === 'repair') {
      fetchMaintenanceItems();
    }
  }, [activeTab]);

  const fetchMaintenanceItems = async () => {
    setRepairLoading(true);
    try {
      // Get all broken units
      const { data: brokenUnits, error: unitsError } = await supabase
        .from('equipment_units')
        .select('*, equipment:equipment_id(*)')
        .eq('current_status', 'broken');

      if (unitsError) throw unitsError;

      const items: MaintenanceItem[] = [];
      for (const unit of brokenUnits || []) {
        const eq = unit.equipment as any;
        // Get the latest pending maintenance log for this unit
        const { data: logs } = await supabase
          .from('maintenance_logs')
          .select('*, reporter:reporter_id(*)')
          .eq('unit_id', unit.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        const log = logs?.[0] as any;
        items.push({
          id: log?.id || unit.id,
          unit_id: unit.id,
          description: log?.description || 'No description',
          image_url: log?.image_url || null,
          location_held: log?.location_held || null,
          created_at: log?.created_at || unit.updated_at,
          unit_number: unit.unit_number,
          equipment_name: eq?.name || 'Unknown',
          equipment_category: eq?.category || '',
          reporter_name: log?.reporter?.full_name || null,
          reporter_email: log?.reporter?.email || '',
        });
      }
      setMaintenanceItems(items);
    } catch (err) {
      console.error('Error fetching maintenance items:', err);
    } finally {
      setRepairLoading(false);
    }
  };

  // ── Handlers ───────────────────────────────────────────────

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddEquipment = async () => {
    const category = newCategory === '__new__' ? newCategoryCustom.trim() : newCategory;
    if (!newName.trim() || !category || newQuantity < 1) return;

    setAddLoading(true);
    const { error } = await addEquipment(newName.trim(), category, newQuantity);
    setAddLoading(false);

    if (error) {
      toast({ title: 'Error', description: 'Failed to add equipment', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `${newName.trim()} added with ${newQuantity} unit(s)` });
      setAddDialogOpen(false);
      setNewName('');
      setNewCategory('');
      setNewCategoryCustom('');
      setNewQuantity(1);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim() || !editCategory.trim()) return;
    const { error } = await updateEquipment(id, editName.trim(), editCategory.trim());
    if (error) {
      toast({ title: 'Error', description: 'Failed to update equipment', variant: 'destructive' });
    } else {
      setEditingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await deleteEquipment(deleteTargetId);
    if (error) {
      toast({
        title: 'Cannot Delete',
        description: (error as any).message || 'Failed to delete equipment',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Deleted', description: `${deleteTargetName} has been removed` });
    }
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  const handleAddUnit = async (equipmentId: string) => {
    const { error } = await addUnits(equipmentId, 1);
    if (error) {
      toast({ title: 'Error', description: 'Failed to add unit', variant: 'destructive' });
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    const { error } = await deleteUnit(unitId);
    if (error) {
      toast({
        title: 'Cannot Delete',
        description: (error as any).message || 'Failed to delete unit',
        variant: 'destructive',
      });
    }
  };

  const openBrokenDialog = (unitId: string) => {
    setBrokenUnitId(unitId);
    setBrokenDescription('');
    setBrokenLocation('');
    setBrokenImage(null);
    setBrokenDialogOpen(true);
  };

  const handleBrokenImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          variant: 'destructive',
        });
        e.target.value = ''; // Clear input
        return;
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Only JPEG, PNG, and WebP images are allowed',
          variant: 'destructive',
        });
        e.target.value = ''; // Clear input
        return;
      }
    }

    setBrokenImage(file);
  };

  const handleMarkBroken = async () => {
    if (!brokenUnitId) return;
    setBrokenLoading(true);
    const { error } = await markUnitBroken(
      brokenUnitId,
      userId,
      brokenDescription.trim() || undefined,
      brokenLocation.trim() || undefined,
      brokenImage || undefined
    );
    setBrokenLoading(false);

    if (error) {
      toast({ title: 'Error', description: 'Failed to mark unit as broken', variant: 'destructive' });
    } else {
      toast({ title: 'Reported', description: 'Unit marked as broken' });
      setBrokenDialogOpen(false);
    }
  };

  const handleMarkRepaired = async (unitId: string) => {
    const { error } = await markUnitRepaired(unitId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to mark as repaired', variant: 'destructive' });
    } else {
      toast({ title: 'Repaired', description: 'Unit is now available' });
      fetchMaintenanceItems();
      refreshEquipment();
    }
  };

  // ── Derived data ───────────────────────────────────────────

  const existingCategories = [...new Set(equipment.map((e) => e.category))].sort((a, b) =>
    sortCategories(a, b)
  );

  const brokenCount = equipment.reduce(
    (sum, eq) => sum + eq.units.filter((u) => u.current_status === 'broken').length,
    0
  );

  // Group by category
  const byCategory = equipment.reduce(
    (acc, item) => {
      const cat = item.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, typeof equipment>
  );

  const categoryEntries = Object.entries(byCategory).sort(([a], [b]) => sortCategories(a, b));

  // ── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading equipment...</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Equipment Manager</h2>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-[#4EB5E8] hover:bg-[#3A94C7]">
          <Plus className="h-4 w-4 mr-1" />
          Add Equipment
        </Button>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('list')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'list' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Equipment List
        </button>
        <button
          onClick={() => setActiveTab('repair')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
            activeTab === 'repair' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          To Repair
          {brokenCount > 0 && (
            <span className="bg-red-950 text-red-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {brokenCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Equipment List Tab ──────────────────────────────── */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {categoryEntries.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No equipment yet. Add your first item!</p>
            </div>
          ) : (
            categoryEntries.map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-foreground">{category}</h3>
                  <span className="text-sm text-muted-foreground">
                    ({items.length} type{items.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="border rounded-lg overflow-hidden bg-card">
                  {items.map((item) => {
                    const isExpanded = expandedIds.has(item.id);
                    const isEditing = editingId === item.id;
                    const availableCount = item.units.filter((u) => u.current_status === 'available').length;
                    const inUseCount = item.units.filter((u) => u.current_status === 'in_use').length;
                    const brokenCount = item.units.filter((u) => u.current_status === 'broken').length;
                    const maintenanceCount = item.units.filter((u) => u.current_status === 'maintenance').length;
                    const hasInUse = inUseCount > 0;

                    return (
                      <div key={item.id} className="border-b last:border-b-0">
                        {/* Equipment header row */}
                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors">
                          <button onClick={() => toggleExpand(item.id)} className="flex-shrink-0 text-muted-foreground">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>

                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-2">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-8 w-48"
                              />
                              <Input
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="h-8 w-32"
                              />
                              <Button size="sm" variant="outline" onClick={() => handleSaveEdit(item.id)}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-950/50"
                                onClick={() => {
                                  if (hasInUse) {
                                    toast({
                                      title: 'Cannot Delete',
                                      description: `${item.name} has ${inUseCount} unit(s) currently in use`,
                                      variant: 'destructive',
                                    });
                                    return;
                                  }
                                  setDeleteTargetId(item.id);
                                  setDeleteTargetName(item.name);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Delete
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-foreground">{item.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  {item.units.length} unit{item.units.length !== 1 ? 's' : ''}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1 text-green-400">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  <span>{availableCount}</span>
                                </div>
                                {inUseCount > 0 && (
                                  <div className="flex items-center gap-1 text-blue-400">
                                    <Package className="h-3.5 w-3.5" />
                                    <span>{inUseCount}</span>
                                  </div>
                                )}
                                {brokenCount > 0 && (
                                  <div className="flex items-center gap-1 text-red-400">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>{brokenCount}</span>
                                  </div>
                                )}
                                {maintenanceCount > 0 && (
                                  <div className="flex items-center gap-1 text-orange-400">
                                    <Wrench className="h-3.5 w-3.5" />
                                    <span>{maintenanceCount}</span>
                                  </div>
                                )}
                              </div>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(item.id);
                                  setEditName(item.name);
                                  setEditCategory(item.category);
                                  setExpandedIds((prev) => new Set(prev).add(item.id));
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>

                        {/* Expanded unit details */}
                        {isExpanded && (
                          <div className="bg-muted/50 px-4 pb-3">
                            <div className="space-y-1 ml-7">
                              {item.units.map((unit: EquipmentUnit) => (
                                <div
                                  key={unit.id}
                                  className="flex items-center gap-3 py-1.5 px-3 rounded hover:bg-accent transition-colors"
                                >
                                  <span className="text-sm text-foreground font-medium w-16">{unit.unit_number}</span>
                                  <UnitStatusBadge status={unit.current_status} />
                                  <div className="ml-auto flex items-center gap-1">
                                    {unit.current_status === 'available' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs text-red-400 border-red-800 hover:bg-red-950/50"
                                        onClick={() => openBrokenDialog(unit.id)}
                                      >
                                        Mark Broken
                                      </Button>
                                    )}
                                    {isEditing && (unit.current_status === 'available' || unit.current_status === 'broken') && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs text-muted-foreground hover:text-red-400"
                                        onClick={() => handleDeleteUnit(unit.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {isEditing && (
                                <button
                                  onClick={() => handleAddUnit(item.id)}
                                  className="flex items-center gap-1 text-sm text-[#4EB5E8] hover:text-[#3A94C7] py-1.5 px-3"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add Unit
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── To Repair Tab ───────────────────────────────────── */}
      {activeTab === 'repair' && (
        <div className="space-y-4">
          {repairLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading repair items...</p>
            </div>
          ) : maintenanceItems.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No items need repair</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {maintenanceItems.length} item{maintenanceItems.length !== 1 ? 's' : ''} need{maintenanceItems.length === 1 ? 's' : ''} repair
              </p>
              <div className="space-y-3">
                {maintenanceItems.map((item) => (
                  <div key={item.id} className="border rounded-lg bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-400" />
                          <span className="font-semibold text-foreground">{item.equipment_name}</span>
                          <span className="text-sm text-muted-foreground">&mdash; {item.unit_number}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Reported by: {item.reporter_name || item.reporter_email} &middot;{' '}
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 flex-shrink-0"
                        onClick={() => handleMarkRepaired(item.unit_id)}
                      >
                        Mark as Repaired
                      </Button>
                    </div>
                    <p className="text-sm text-foreground bg-muted rounded px-3 py-2">
                      "{item.description}"
                    </p>
                    {item.location_held && (
                      <p className="text-sm text-muted-foreground">
                        Location: {item.location_held}
                      </p>
                    )}
                    {item.image_url && (
                      <a
                        href={item.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[#4EB5E8] hover:underline"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        View Photo
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Add Equipment Dialog ────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
            <DialogDescription>Add a new equipment type with initial units.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Sony FX3"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {existingCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__">+ New Category</SelectItem>
                </SelectContent>
              </Select>
              {newCategory === '__new__' && (
                <Input
                  value={newCategoryCustom}
                  onChange={(e) => setNewCategoryCustom(e.target.value)}
                  placeholder="Enter new category name"
                  className="mt-2"
                />
              )}
            </div>
            <div>
              <Label>Number of Units</Label>
              <Input
                type="number"
                min={1}
                value={newQuantity}
                onChange={(e) => setNewQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddEquipment}
              disabled={addLoading || !newName.trim() || (!newCategory || (newCategory === '__new__' && !newCategoryCustom.trim()))}
              className="bg-[#4EB5E8] hover:bg-[#3A94C7]"
            >
              {addLoading ? 'Adding...' : 'Add Equipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mark Broken Dialog ──────────────────────────────── */}
      <Dialog open={brokenDialogOpen} onOpenChange={setBrokenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Broken Equipment</DialogTitle>
            <DialogDescription>Describe the issue so the team knows what needs fixing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Description (optional)</Label>
              <textarea
                value={brokenDescription}
                onChange={(e) => setBrokenDescription(e.target.value)}
                placeholder="What's wrong with this unit?"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4EB5E8] focus-visible:ring-offset-2"
                rows={3}
              />
            </div>
            <div>
              <Label>Location (optional)</Label>
              <Input
                value={brokenLocation}
                onChange={(e) => setBrokenLocation(e.target.value)}
                placeholder="Where is the unit currently?"
              />
            </div>
            <div>
              <Label>Photo (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleBrokenImageChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrokenDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkBroken}
              disabled={brokenLoading}
              className="bg-[#4EB5E8] hover:bg-[#3A94C7]"
            >
              {brokenLoading ? 'Reporting...' : 'Report Broken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Equipment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTargetName}</strong> and all its units? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
