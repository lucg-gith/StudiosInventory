import { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Users, User, CalendarClock } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import type { EquipmentStatus } from '../../hooks/use-equipment-status';

// ── Types ────────────────────────────────────────

interface TeamKitItem {
  equipment_name: string;
  equipment_category: string;
  unit_number: string;
  event_name: string;
  checkout_date: string;
  return_date: string | null;
}

interface TeamKit {
  user_id: string;
  user_name: string;
  user_email: string;
  items: TeamKitItem[];
  events: string[];
  total_items: number;
}

// ── Category ordering (matches dashboard) ────────

const CATEGORY_ORDER = [
  'camera', 'audio', 'lens', 'tripod', 'light',
  'extension cable', 'accessories', 'sd card', 'batteries', 'case',
];

// ── Data transformation ──────────────────────────

export function groupByUser(
  equipmentStatus: EquipmentStatus[],
  currentUserId: string
): TeamKit[] {
  const userMap = new Map<string, TeamKit>();

  for (const equipment of equipmentStatus) {
    for (const unit of equipment.checked_out_units) {
      if (unit.user_id === currentUserId) continue;

      if (!userMap.has(unit.user_id)) {
        userMap.set(unit.user_id, {
          user_id: unit.user_id,
          user_name: unit.user_name,
          user_email: unit.user_email,
          items: [],
          events: [],
          total_items: 0,
        });
      }

      const kit = userMap.get(unit.user_id)!;
      kit.items.push({
        equipment_name: equipment.equipment_name,
        equipment_category: equipment.equipment_category,
        unit_number: unit.unit_number,
        event_name: unit.event_name,
        checkout_date: unit.checkout_date,
        return_date: unit.return_date,
      });
      kit.total_items++;

      if (!kit.events.includes(unit.event_name)) {
        kit.events.push(unit.event_name);
      }
    }
  }

  // Sort items within each kit by category order, then name
  for (const kit of userMap.values()) {
    kit.items.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a.equipment_category.toLowerCase());
      const ib = CATEGORY_ORDER.indexOf(b.equipment_category.toLowerCase());
      const catA = ia === -1 ? 999 : ia;
      const catB = ib === -1 ? 999 : ib;
      if (catA !== catB) return catA - catB;
      return a.equipment_name.localeCompare(b.equipment_name);
    });
  }

  return Array.from(userMap.values()).sort((a, b) =>
    a.user_name.localeCompare(b.user_name)
  );
}

// ── Card sub-component ───────────────────────────

export function TeamKitCard({ kit }: { kit: TeamKit }) {
  return (
    <Card className="min-w-[300px] max-w-[340px] flex-shrink-0 snap-start">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[#4EB5E8]/20 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-[#4EB5E8]" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{kit.user_name}</CardTitle>
            <p className="text-xs text-muted-foreground truncate">
              {kit.events.join(' / ')}
            </p>
          </div>
          <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
            {kit.total_items} item{kit.total_items !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5">
          {kit.items.map((item, idx) => (
            <div
              key={`${item.unit_number}-${idx}`}
              className="flex items-center gap-2 text-sm"
            >
              <span className="px-1.5 py-0.5 bg-muted text-xs rounded text-muted-foreground flex-shrink-0">
                {item.unit_number}
              </span>
              <span className="text-foreground truncate">{item.equipment_name}</span>
              <span className="text-xs text-muted-foreground capitalize ml-auto flex-shrink-0">
                {item.equipment_category}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 flex-shrink-0" />
          {kit.items.some((i) => i.return_date) ? (
            <span>
              Expected return: <span className="text-foreground font-medium">{formatDate(
                kit.items
                  .filter((i) => i.return_date)
                  .map((i) => i.return_date!)
                  .sort()
                  .pop()!
              )}</span>
            </span>
          ) : (
            <span>No return date set</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main carousel component ──────────────────────

interface TeamKitsCarouselProps {
  equipmentStatus: EquipmentStatus[];
  currentUserId: string;
  loading: boolean;
}

export function TeamKitsCarousel({
  equipmentStatus,
  currentUserId,
  loading,
}: TeamKitsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const teamKits = groupByUser(equipmentStatus, currentUserId);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [teamKits, updateScrollButtons]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.getBoundingClientRect().width ?? 320;
    const gap = 16;
    el.scrollBy({
      left: direction === 'left' ? -(cardWidth + gap) : cardWidth + gap,
      behavior: 'smooth',
    });
  };

  if (loading || teamKits.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#4EB5E8]" />
          <h2 className="text-2xl font-bold text-foreground">Team Kits</h2>
          <span className="text-sm text-muted-foreground">
            {teamKits.length} teammate{teamKits.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={updateScrollButtons}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 hide-scrollbar"
        style={{ scrollbarWidth: 'none' }}
      >
        {teamKits.map((kit) => (
          <TeamKitCard key={kit.user_id} kit={kit} />
        ))}
      </div>
    </div>
  );
}
