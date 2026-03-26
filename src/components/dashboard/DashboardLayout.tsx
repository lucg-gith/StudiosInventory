import { ReactNode } from 'react';
import { LogOut, Package, History, Wrench, BarChart3, Camera, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import type { UserProfile } from '../../types';

interface DashboardLayoutProps {
  children: ReactNode;
  profile: UserProfile | null;
  currentView: 'inventory' | 'history' | 'maintenance' | 'status' | 'metrics';
  onViewChange: (view: 'inventory' | 'history' | 'maintenance' | 'status' | 'metrics') => void;
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
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4EB5E8] rounded-lg flex items-center justify-center">
                <Camera className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-bold">Citywire Studios</h1>
                <p className="text-xs md:text-sm text-gray-300">Equipment Inventory</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="text-right hidden sm:block">
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
        <div className="container mx-auto px-2 md:px-4">
          <div className="flex space-x-1 sm:space-x-4 md:space-x-8 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => onViewChange('inventory')}
              className={`flex items-center space-x-1.5 sm:space-x-2 py-3 md:py-4 px-1.5 sm:px-2 border-b-2 transition-colors min-w-fit ${
                currentView === 'inventory'
                  ? 'border-[#4EB5E8] text-[#4EB5E8]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-sm md:text-base whitespace-nowrap">Inventory</span>
            </button>
            <button
              onClick={() => onViewChange('status')}
              className={`flex items-center space-x-1.5 sm:space-x-2 py-3 md:py-4 px-1.5 sm:px-2 border-b-2 transition-colors min-w-fit ${
                currentView === 'status'
                  ? 'border-[#4EB5E8] text-[#4EB5E8]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-sm md:text-base whitespace-nowrap">Status</span>
            </button>
            <button
              onClick={() => onViewChange('history')}
              className={`flex items-center space-x-1.5 sm:space-x-2 py-3 md:py-4 px-1.5 sm:px-2 border-b-2 transition-colors min-w-fit ${
                currentView === 'history'
                  ? 'border-[#4EB5E8] text-[#4EB5E8]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-sm md:text-base whitespace-nowrap">History</span>
            </button>
            <button
              onClick={() => onViewChange('maintenance')}
              className={`flex items-center space-x-1.5 sm:space-x-2 py-3 md:py-4 px-1.5 sm:px-2 border-b-2 transition-colors min-w-fit ${
                currentView === 'maintenance'
                  ? 'border-[#4EB5E8] text-[#4EB5E8]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wrench className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-sm md:text-base whitespace-nowrap">
                <span className="hidden sm:inline">Equipment </span>Management
              </span>
            </button>
            <button
              onClick={() => onViewChange('metrics')}
              className={`flex items-center space-x-1.5 sm:space-x-2 py-3 md:py-4 px-1.5 sm:px-2 border-b-2 transition-colors min-w-fit ${
                currentView === 'metrics'
                  ? 'border-[#4EB5E8] text-[#4EB5E8]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-sm md:text-base whitespace-nowrap">Metrics</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8">{children}</main>
    </div>
  );
}
