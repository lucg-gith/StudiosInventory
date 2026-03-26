import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Package, Search, LayoutGrid, List, CheckCircle, AlertCircle, Briefcase } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { EquipmentWithUnits, CaseItem } from '../../types';

type ViewMode = 'grid' | 'list';
type GroupMode = 'category' | 'status';

const STATUS_GROUP_ORDER = ['All Available', 'Partially Available', 'Checked Out'];

function getAvailabilityStatus(item: EquipmentWithUnits): string {
  if (item.available_count === item.total_quantity) return 'All Available';
  if (item.available_count === 0) return 'Checked Out';
  return 'Partially Available';
}

interface EquipmentListProps {
  equipment: EquipmentWithUnits[];
  onCheckOut: (equipmentId: string) => void;
  caseItems?: CaseItem[];
  onAddToCase?: (equipmentId: string) => void;
  onOpenCase?: () => void;
}

export function EquipmentList({ equipment, onCheckOut, caseItems = [], onAddToCase, onOpenCase }: EquipmentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem('equipmentViewMode') as ViewMode) || 'grid'
  );
  const [groupMode, setGroupMode] = useState<GroupMode>(
    () => (localStorage.getItem('equipmentGroupMode') as GroupMode) || 'category'
  );

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('equipmentViewMode', mode);
  };

  const handleGroupModeChange = (mode: GroupMode) => {
    setGroupMode(mode);
    localStorage.setItem('equipmentGroupMode', mode);
  };

  const getCaseQuantity = (equipmentId: string): number => {
    const item = caseItems.find((c) => c.equipmentId === equipmentId);
    return item ? item.quantity : 0;
  };

  const totalCaseItems = caseItems.reduce((sum, c) => sum + c.quantity, 0);

  const handleItemAction = (equipmentId: string) => {
    if (onAddToCase) {
      onAddToCase(equipmentId);
    } else {
      onCheckOut(equipmentId);
    }
  };

  const categories = ['all', ...new Set(equipment.map((e) => e.category))];

  const filteredEquipment = equipment.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedEquipment = filteredEquipment.reduce((acc, item) => {
    const key = groupMode === 'category' ? item.category : getAvailabilityStatus(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, EquipmentWithUnits[]>);

  const sortedGroupEntries =
    groupMode === 'status'
      ? Object.entries(groupedEquipment).sort(
          ([a], [b]) => STATUS_GROUP_ORDER.indexOf(a) - STATUS_GROUP_ORDER.indexOf(b)
        )
      : Object.entries(groupedEquipment);

  return (
    <div className="space-y-6">
      {/* Toolbar row 1: Search + View toggle + Group selector */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex border border-border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleViewModeChange('grid')}
              className={cn(
                'h-11 w-11 sm:h-9 sm:w-9 rounded-none rounded-l-md',
                viewMode === 'grid' && 'bg-accent text-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleViewModeChange('list')}
              className={cn(
                'h-11 w-11 sm:h-9 sm:w-9 rounded-none rounded-r-md',
                viewMode === 'list' && 'bg-accent text-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Group mode selector */}
          <Select value={groupMode} onValueChange={(v) => handleGroupModeChange(v as GroupMode)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category">By Category</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Toolbar row 2: Category filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="capitalize min-h-[44px] sm:min-h-0"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Case trigger badge */}
      {totalCaseItems > 0 && onOpenCase && (
        <div className="flex justify-end">
          <Button
            onClick={onOpenCase}
            variant="outline"
            className="flex items-center gap-2 ring-1 ring-[#4EB5E8]/30 shadow-md hover:shadow-lg hover:ring-[#4EB5E8]/50 transition-all"
          >
            <Briefcase className="h-4 w-4" />
            <span>Equipment Case</span>
            <span className="ml-1 inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-[#4EB5E8] text-white text-xs font-bold">
              {totalCaseItems}
            </span>
          </Button>
        </div>
      )}

      {/* Equipment groups */}
      {sortedGroupEntries.map(([groupLabel, items]) => (
        <div key={groupLabel} className="space-y-4">
          {/* Group header */}
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            {groupMode === 'status' && (
              <span
                className={cn(
                  'inline-flex items-center justify-center h-7 w-7 rounded-full',
                  groupLabel === 'All Available' && 'bg-green-950 text-green-400',
                  groupLabel === 'Partially Available' && 'bg-yellow-950 text-yellow-400',
                  groupLabel === 'Checked Out' && 'bg-red-950 text-red-400'
                )}
              >
                {groupLabel === 'All Available' && <CheckCircle className="h-4 w-4" />}
                {groupLabel === 'Partially Available' && <Package className="h-4 w-4" />}
                {groupLabel === 'Checked Out' && <AlertCircle className="h-4 w-4" />}
              </span>
            )}
            <span className="capitalize">{groupLabel}</span>
            <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
          </h2>

          {/* Grid view */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {items.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-start justify-between">
                      <span className="flex-1">{item.name}</span>
                      <Package className="h-5 w-5 text-[#4EB5E8] flex-shrink-0 ml-2" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Available:</span>
                        <span
                          className={`font-bold ${
                            item.available_count > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {item.available_count} / {item.total_quantity}
                        </span>
                      </div>
                      {item.available_count === 0 ? (
                        <Button disabled className="w-full" size="sm">
                          Out of Stock
                        </Button>
                      ) : getCaseQuantity(item.id) > 0 ? (
                        <Button
                          onClick={() => handleItemAction(item.id)}
                          variant="secondary"
                          className="w-full"
                          size="sm"
                        >
                          In Case ({getCaseQuantity(item.id)}) +
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleItemAction(item.id)}
                          className="w-full"
                          size="sm"
                        >
                          Add to Case
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* List view */}
          {viewMode === 'list' && (
            <div className="border rounded-lg overflow-hidden bg-card">
              {/* Desktop table header — hidden on mobile */}
              <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2 bg-muted border-b text-sm font-medium text-muted-foreground">
                <span className="w-32"></span>
                <span>Name</span>
                <span className="w-28 text-center">Category</span>
                <span className="w-24 text-center">Available</span>
              </div>

              {/* Desktop table rows — hidden on mobile */}
              <div className="hidden md:block">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 border-b last:border-b-0 items-center hover:bg-accent transition-colors"
                  >
                    <span className="w-32">
                      {item.available_count === 0 ? (
                        <Button disabled size="sm" className="w-full">
                          Out of Stock
                        </Button>
                      ) : getCaseQuantity(item.id) > 0 ? (
                        <Button
                          onClick={() => handleItemAction(item.id)}
                          variant="secondary"
                          size="sm"
                          className="w-full"
                        >
                          In Case ({getCaseQuantity(item.id)}) +
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleItemAction(item.id)}
                          size="sm"
                          className="w-full"
                        >
                          Add
                        </Button>
                      )}
                    </span>
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="w-28 text-center text-sm text-muted-foreground capitalize">{item.category}</span>
                    <span className="w-24 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold',
                          item.available_count === item.total_quantity
                            ? 'bg-green-950 text-green-400'
                            : item.available_count === 0
                              ? 'bg-red-950 text-red-400'
                              : 'bg-yellow-950 text-yellow-400'
                        )}
                      >
                        {item.available_count} / {item.total_quantity}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Mobile card layout — hidden on desktop */}
              <div className="md:hidden">
                {items.map((item) => (
                  <div key={item.id} className="border-b last:border-b-0 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0',
                          item.available_count === item.total_quantity
                            ? 'bg-green-950 text-green-400'
                            : item.available_count === 0
                              ? 'bg-red-950 text-red-400'
                              : 'bg-yellow-950 text-yellow-400'
                        )}
                      >
                        {item.available_count} / {item.total_quantity}
                      </span>
                    </div>
                    <div>
                      {item.available_count === 0 ? (
                        <Button disabled size="sm" className="w-full min-h-[44px]">
                          Out of Stock
                        </Button>
                      ) : getCaseQuantity(item.id) > 0 ? (
                        <Button
                          onClick={() => handleItemAction(item.id)}
                          variant="secondary"
                          size="sm"
                          className="w-full min-h-[44px]"
                        >
                          In Case ({getCaseQuantity(item.id)}) +
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleItemAction(item.id)}
                          size="sm"
                          className="w-full min-h-[44px]"
                        >
                          Add to Case
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Empty state */}
      {filteredEquipment.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No equipment found</p>
        </div>
      )}
    </div>
  );
}
