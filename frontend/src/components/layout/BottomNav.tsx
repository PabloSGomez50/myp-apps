import React from 'react';
import { NavLink } from 'react-router-dom';
import { Wallet, ShoppingCart, PlusCircle, Boxes, Settings } from 'lucide-react';

interface Props {
  onQuickTxClick?: () => void;
}

export const BottomNav: React.FC<Props> = ({ onQuickTxClick }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2 flex items-center justify-around z-40">
      <NavLink
        to="/finanzas"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 text-[11px] font-medium transition ${
            isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`
        }
      >
        <Wallet className="w-5 h-5" />
        <span>Finanzas</span>
      </NavLink>

      <NavLink
        to="/finanzas/shopping"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 text-[11px] font-medium transition ${
            isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`
        }
      >
        <ShoppingCart className="w-5 h-5" />
        <span>Compras</span>
      </NavLink>

      {/* Floating Action Button for Quick Expense (< 3s) */}
      <button
        onClick={onQuickTxClick}
        title="Registrar Gasto Rápido"
        className="w-12 h-12 -mt-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition transform active:scale-95 cursor-pointer"
      >
        <PlusCircle className="w-7 h-7" />
      </button>

      <NavLink
        to="/inventario"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 text-[11px] font-medium transition ${
            isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`
        }
      >
        <Boxes className="w-5 h-5" />
        <span>Stock</span>
      </NavLink>

      <NavLink
        to="/hogar"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 text-[11px] font-medium transition ${
            isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`
        }
      >
        <Settings className="w-5 h-5" />
        <span>Hogar</span>
      </NavLink>
    </nav>
  );
};
