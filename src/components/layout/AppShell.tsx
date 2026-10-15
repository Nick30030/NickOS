import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNavBar } from './MobileNavBar';
import { TaskModal } from '../modals/TaskModal';
import { GoalModal } from '../modals/GoalModal';
import { ProjectModal } from '../modals/ProjectModal';
import { TimeBlockModal } from '../modals/TimeBlockModal';
import { QuickCaptureModal } from '../modals/QuickCaptureModal';
import { PlanDayModal } from '../modals/PlanDayModal';
import { SupabaseSetupModal } from '../modals/SupabaseSetupModal';
import { InAppAlertModal } from '../modals/InAppAlertModal';
import { MorningLockModal } from '../common/MorningLockModal';
import { X } from 'lucide-react';

export const AppShell: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen h-[100dvh] w-full max-w-full overflow-hidden bg-neutral-950 text-neutral-100 antialiased selection:bg-emerald-400 selection:text-neutral-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 h-full bg-neutral-900 border-r border-neutral-800 shadow-2xl flex flex-col">
            <div className="flex justify-end p-2 border-b border-neutral-800">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Main Execution Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <TopBar onOpenMobile={() => setIsMobileMenuOpen(true)} />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 pb-28 sm:pb-28 lg:pb-16 bg-neutral-950">
          <div className="max-w-6xl mx-auto w-full overflow-hidden">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile-first bottom tab navigation */}
      <MobileNavBar />

      {/* Global Modals & High-Priority Alerts */}
      <TaskModal />
      <GoalModal />
      <ProjectModal />
      <TimeBlockModal />
      <QuickCaptureModal />
      <PlanDayModal />
      <SupabaseSetupModal />
      <InAppAlertModal />
      <MorningLockModal />
    </div>
  );
};
