import { ReactNode } from 'react';
import { LogOut, Package, History, Wrench, BarChart3, Camera } from 'lucide-react';
import { Button } from '../ui/button';
import type { UserProfile } from '../../types';

interface DashboardLayoutProps {
  children: ReactNode;
  profile: UserProfile | null;
  currentView: 'inventory' | 'history' | 'maintenance' | 'status';
  onViewChange: (view: 'inventory' | 'history' | 'maintenance' | 'status') => void;
  onSignOut: () => void;
}

export function DashboardLayout({
  children,
  profile,
  currentView,
  onViewChange,
  onSignOut,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#0A1628] text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#4EB5E8] rounded-lg flex items-center justify-center">
                <Camera className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Citywire Studios</h1>
                <p className="text-sm text-gray-300">Equipment Inventory</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">{profile?.full_name || profile?.email}</p>
                <p className="text-xs text-gray-300 capitalize">{profile?.role || 'User'}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSignOut}
                className="text-white hover:bg-white/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-muted border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => onViewChange('inventory')}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                currentView === 'inventory'
                  ? 'border-[#4EB5E8] text-[#4EB5E8]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="h-5 w-5" />
              <span className="font-medium">Inventory</span>
            </button>
            <button
              onClick={() => onViewChange('status')}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                currentView === 'status'
                  ? 'border-[#4EB5E8] text-[#4EB5E8]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="font-medium">Status</span>
            </button>
            <button
              onClick={() => onViewChange('history')}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                currentView === 'history'
                  ? 'border-[#4EB5E8] text-[#4EB5E8]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="h-5 w-5" />
              <span className="font-medium">History</span>
            </button>
            <button
              onClick={() => onViewChange('maintenance')}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                currentView === 'maintenance'
                  ? 'border-[#4EB5E8] text-[#4EB5E8]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wrench className="h-5 w-5" />
              <span className="font-medium">Equipment Management</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
