import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppNavigation } from './AppNavigation';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/plan': 'Plan treningowy',
  '/day': 'Plan dnia',
  '/measurements': 'Pomiary',
  '/achievements': 'Osiągnięcia',
};

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  const title = pageTitles[location.pathname] || 'FitTracker';

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppNavigation isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader title={title} onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
