import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full">
          {/* Subtle pattern overlay */}
          <div className="fixed inset-0 pointer-events-none opacity-[0.015] pattern-dots" />
          
          {/* Content */}
          <div className="relative container py-4 sm:py-6 md:py-8 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
