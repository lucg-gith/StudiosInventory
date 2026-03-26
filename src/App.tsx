import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AuthForm } from './components/auth/AuthForm';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { EquipmentList } from './components/dashboard/EquipmentList';
import { CurrentGear } from './components/dashboard/CurrentGear';
import { TeamKitCard, groupByUser } from './components/dashboard/TeamKitsCarousel';
import { ProxyReturnModal } from './components/dashboard/ProxyReturnModal';
import { EquipmentStatusDashboard } from './components/dashboard/EquipmentStatusDashboard';
import { CheckOutModal } from './components/checkout/CheckOutModal';
import { EquipmentCase } from './components/checkout/EquipmentCase';
import { EquipmentManager } from './components/equipment-manager/EquipmentManager';
import { TransactionHistory } from './components/history/TransactionHistory';
import { MetricsDashboard } from './components/metrics/MetricsDashboard';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/toaster';
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from './hooks/use-auth';
import { useEquipment } from './hooks/use-equipment';
import { useEvents } from './hooks/use-events';
import { useTransactions } from './hooks/use-transactions';
import { useEquipmentStatus } from './hooks/use-equipment-status';
import { useReservations } from './hooks/use-reservations';
import { useDateAvailability } from './hooks/use-date-availability';
import { useToast } from './hooks/use-toast';
import type { EquipmentWithUnits, CaseItem } from './types';

function App() {
  const { user, profile, loading: authLoading, signIn, signUp, signOut, resetPassword } = useAuth();
  const { equipment, loading: equipmentLoading, refreshEquipment } = useEquipment();
  const { events, createEvent, updateEventEnd, updateEventStart, deleteEvent } = useEvents();
  const { checkedOutGear, refreshCheckedOutGear } = useTransactions(user?.id);
  const { equipmentStatus, refreshStatus } = useEquipmentStatus();
  const { reservations, myReservations, upsertReservation, removeReservation, clearMyReservations, updateReservationDates, wasAutoCleared, resetAutoCleared } = useReservations(user?.id);
  const { getOverlaps, reservationAffectsToday } = useDateAvailability(equipment, reservations, equipmentStatus);
  const { toast } = useToast();

  // Re-fetch equipment status after user authenticates (RLS requires auth)
  useEffect(() => {
    if (user) {
      refreshStatus();
    }
  }, [user]);

  // Auto-clear notification when reservations expire after 8 hours
  useEffect(() => {
    if (wasAutoCleared) {
      toast({
        title: 'Case cleared',
        description: 'Your equipment case was automatically cleared after 8 hours.',
      });
      setCaseOpen(false);
      resetAutoCleared();
    }
  }, [wasAutoCleared]);

  const [currentView, setCurrentView] = useState<'inventory' | 'history' | 'maintenance' | 'status' | 'metrics'>('inventory');
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentWithUnits | null>(null);
  const [caseOpen, setCaseOpen] = useState(false);
  const [proxyReturnKit, setProxyReturnKit] = useState<any>(null);

  // Kits carousel scroll logic
  const kitsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const teamKits = groupByUser(equipmentStatus, user?.id ?? '');

  const updateKitsScroll = useCallback(() => {
    const el = kitsScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateKitsScroll();
    window.addEventListener('resize', updateKitsScroll);
    return () => window.removeEventListener('resize', updateKitsScroll);
  }, [teamKits, checkedOutGear, updateKitsScroll]);

  const scrollKits = (direction: 'left' | 'right') => {
    const el = kitsScrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.getBoundingClientRect().width ?? 480;
    const gap = 16;
    el.scrollBy({
      left: direction === 'left' ? -(cardWidth + gap) : cardWidth + gap,
      behavior: 'smooth',
    });
  };

  // Equipment with availability adjusted by reservations that affect TODAY
  const adjustedEquipment = useMemo(() => {
    return equipment.map((eq) => {
      const totalReserved = reservations
        .filter((r) => r.equipment_id === eq.id && reservationAffectsToday(r))
        .reduce((sum, r) => sum + r.quantity, 0);
      return { ...eq, available_count: Math.max(0, eq.available_count - totalReserved) };
    });
  }, [equipment, reservations, reservationAffectsToday]);

  // Derive caseItems from DB reservations + equipment data (date-overlap-aware)
  const caseItems: CaseItem[] = useMemo(() => {
    return myReservations
      .map((res) => {
        const eq = equipment.find((e) => e.id === res.equipment_id);
        if (!eq) return null;
        // Only count other users' reservations that overlap MY dates (or all if no dates)
        const othersReserved = reservations
          .filter((r) => {
            if (r.equipment_id !== res.equipment_id || r.user_id === user?.id) return false;
            if (res.start_date && res.end_date && r.start_date && r.end_date) {
              return res.start_date.split('T')[0] <= r.end_date.split('T')[0] &&
                     res.end_date.split('T')[0] >= r.start_date.split('T')[0];
            }
            return true; // no dates on either side = assume conflict
          })
          .reduce((sum, r) => sum + r.quantity, 0);
        const maxForMe = Math.max(0, eq.available_count - othersReserved);
        return {
          equipmentId: eq.id,
          name: eq.name,
          category: eq.category,
          quantity: Math.min(res.quantity, maxForMe),
          maxAvailable: maxForMe,
        };
      })
      .filter(Boolean) as CaseItem[];
  }, [myReservations, equipment, reservations, user?.id]);

  // Compute overlap warnings for items in the user's case
  const caseOverlaps = useMemo(() => {
    if (!user || myReservations.length === 0) return [];
    const firstWithDates = myReservations.find((r) => r.start_date && r.end_date);
    if (!firstWithDates) return [];
    return myReservations.flatMap((res) =>
      getOverlaps(res.equipment_id, firstWithDates.start_date!, firstWithDates.end_date!, user.id)
    );
  }, [myReservations, getOverlaps, user]);

  // Close drawer when navigating away from Inventory
  useEffect(() => {
    if (currentView !== 'inventory') {
      setCaseOpen(false);
    }
  }, [currentView]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    }
  };

  const handleCheckOut = (equipmentId: string) => {
    const selectedItem = equipment.find((e) => e.id === equipmentId);
    if (selectedItem) {
      setSelectedEquipment(selectedItem);
      setCheckOutModalOpen(true);
    }
  };

  const handleCheckOutSuccess = () => {
    refreshEquipment();
    refreshCheckedOutGear();
  };

  const handleCheckInSuccess = () => {
    refreshEquipment();
    refreshCheckedOutGear();
  };

  const handleAddToCase = async (equipmentId: string) => {
    const eq = equipment.find((e) => e.id === equipmentId);
    if (!eq || eq.available_count === 0) return;

    const existing = myReservations.find((r) => r.equipment_id === equipmentId);
    const currentQty = existing ? existing.quantity : 0;

    const othersReserved = reservations
      .filter((r) => r.equipment_id === equipmentId && r.user_id !== user?.id)
      .reduce((sum, r) => sum + r.quantity, 0);
    const maxForMe = eq.available_count - othersReserved;

    if (currentQty >= maxForMe) return;

    const { error } = await upsertReservation(equipmentId, currentQty + 1);
    if (error) {
      toast({ title: 'Error', description: 'Failed to reserve equipment', variant: 'destructive' });
    }
    setCaseOpen(true);
  };

  const handleRemoveFromCase = async (equipmentId: string) => {
    const { error } = await removeReservation(equipmentId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to remove reservation', variant: 'destructive' });
    }
  };

  const handleUpdateCaseQuantity = async (equipmentId: string, quantity: number) => {
    const eq = equipment.find((e) => e.id === equipmentId);
    if (!eq) return;

    const othersReserved = reservations
      .filter((r) => r.equipment_id === equipmentId && r.user_id !== user?.id)
      .reduce((sum, r) => sum + r.quantity, 0);
    const maxForMe = eq.available_count - othersReserved;
    const clampedQty = Math.max(1, Math.min(quantity, maxForMe));

    const { error } = await upsertReservation(equipmentId, clampedQty);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update reservation', variant: 'destructive' });
    }
  };

  const handleClearCase = async () => {
    const { error } = await clearMyReservations();
    if (error) {
      toast({ title: 'Error', description: 'Failed to clear case', variant: 'destructive' });
    }
    setCaseOpen(false);
  };

  const handleCaseCheckOutSuccess = async () => {
    await clearMyReservations();
    setCaseOpen(false);
    refreshEquipment();
    refreshCheckedOutGear();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#4EB5E8] rounded-lg flex items-center justify-center mx-auto mb-4">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthForm onSignIn={signIn} onSignUp={signUp} onResetPassword={resetPassword} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <DashboardLayout
        profile={profile}
        currentView={currentView}
        onViewChange={setCurrentView}
        onSignOut={handleSignOut}
      >
        {currentView === 'inventory' && (
          <div className="space-y-8">
            {/* Kits carousel — My Gear + Team Kits side by side */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Kits</h2>
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scrollKits('left')}
                    disabled={!canScrollLeft}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scrollKits('right')}
                    disabled={!canScrollRight}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div
                ref={kitsScrollRef}
                onScroll={updateKitsScroll}
                className="flex flex-col md:flex-row gap-4 md:overflow-x-auto md:scroll-smooth md:snap-x md:snap-mandatory pb-2 hide-scrollbar"
                style={{ scrollbarWidth: 'none' }}
              >
                <CurrentGear
                  checkedOutGear={checkedOutGear}
                  userId={user.id}
                  onCheckIn={handleCheckInSuccess}
                  onUpdateEventEnd={updateEventEnd}
                  onUpdateEventStart={updateEventStart}
                />
                {teamKits.map((kit) => (
                  <TeamKitCard key={kit.user_id} kit={kit} onReturnKit={setProxyReturnKit} />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">All Equipment</h2>
              {equipmentLoading ? (
                <div className="text-center py-12">Loading equipment...</div>
              ) : (
                <EquipmentList
                  equipment={adjustedEquipment}
                  onCheckOut={handleCheckOut}
                  caseItems={caseItems}
                  onAddToCase={handleAddToCase}
                  onOpenCase={() => setCaseOpen(true)}
                />
              )}
            </div>
          </div>
        )}

        {currentView === 'status' && <EquipmentStatusDashboard />}

        {currentView === 'history' && <TransactionHistory />}

        {currentView === 'maintenance' && <EquipmentManager userId={user.id} />}

        {currentView === 'metrics' && <MetricsDashboard />}
      </DashboardLayout>

      <CheckOutModal
        open={checkOutModalOpen}
        onClose={() => setCheckOutModalOpen(false)}
        equipment={selectedEquipment}
        events={events}
        userId={user.id}
        onSuccess={handleCheckOutSuccess}
        onCreateEvent={createEvent}
        onDeleteEvent={deleteEvent}
        getOverlaps={getOverlaps}
      />

      <EquipmentCase
        open={caseOpen}
        onClose={() => setCaseOpen(false)}
        caseItems={caseItems}
        equipment={equipment}
        events={events}
        userId={user.id}
        onRemoveItem={handleRemoveFromCase}
        onUpdateQuantity={handleUpdateCaseQuantity}
        onClearCase={handleClearCase}
        onSuccess={handleCaseCheckOutSuccess}
        onCreateEvent={createEvent}
        onDeleteEvent={deleteEvent}
        onUpdateReservationDates={updateReservationDates}
        overlaps={caseOverlaps}
      />

      <ProxyReturnModal
        open={!!proxyReturnKit}
        onClose={() => setProxyReturnKit(null)}
        kit={proxyReturnKit}
        currentUserId={user?.id || ''}
        currentUserName={profile?.full_name || profile?.email || 'Unknown'}
        onSuccess={() => {
          refreshEquipment();
          refreshStatus();
          refreshCheckedOutGear();
        }}
      />

      <Toaster />
    </>
  );
}

export default App;
