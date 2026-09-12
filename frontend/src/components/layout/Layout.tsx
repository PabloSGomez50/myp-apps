import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { NewTransactionModal } from '@/modules/finanzas/components/NewTransactionModal';

export const Layout: React.FC = () => {
  const [isQuickTxOpen, setIsQuickTxOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <div className="flex-1 flex w-full relative">
        <Sidebar onQuickTxClick={() => setIsQuickTxOpen(true)} />
        <main className="flex-1 min-w-0 p-4 md:p-8 pb-20 md:pb-8 max-w-[1750px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
      <BottomNav onQuickTxClick={() => setIsQuickTxOpen(true)} />
      <NewTransactionModal isOpen={isQuickTxOpen} onClose={() => setIsQuickTxOpen(false)} />
    </div>
  );
};
