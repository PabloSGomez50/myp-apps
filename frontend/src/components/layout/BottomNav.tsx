import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Wallet,
  Receipt,
  TrendingUp,
  PlusCircle,
  MoreHorizontal,
  ShoppingBag,
  Boxes,
  Settings,
  X,
} from 'lucide-react';

interface Props {
  onQuickTxClick?: () => void;
}

export const BottomNav: React.FC<Props> = ({ onQuickTxClick }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <>
      {/* Popover Menu for Additional Modules */}
      {showMoreMenu && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-30"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="absolute bottom-20 right-3 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl space-y-2 w-56 animate-in slide-in-from-bottom-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 px-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Más Módulos
              </span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <NavLink
              to="/finanzas/shopping"
              onClick={() => setShowMoreMenu(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>Lista de Compras</span>
            </NavLink>

            <NavLink
              to="/inventario"
              onClick={() => setShowMoreMenu(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <Boxes className="w-4 h-4 text-indigo-400" />
              <span>Inventario & Stock</span>
            </NavLink>

            <NavLink
              to="/hogar"
              onClick={() => setShowMoreMenu(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Configuración Hogar</span>
            </NavLink>
          </div>
        </div>
      )}

      {/* Main Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2 flex items-center justify-around z-40">
        {/* Resumen */}
        <NavLink
          to="/finanzas"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <Wallet className="w-5 h-5" />
          <span>Resumen</span>
        </NavLink>

        {/* Movimientos & CSV */}
        <NavLink
          to="/finanzas/movimientos"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <Receipt className="w-5 h-5" />
          <span>Movimientos</span>
        </NavLink>

        {/* Floating Action Button for Quick Expense */}
        <button
          onClick={onQuickTxClick}
          title="Registrar Gasto Rápido"
          className="w-12 h-12 -mt-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition transform active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-7 h-7" />
        </button>

        {/* Inversiones & Ahorro */}
        <NavLink
          to="/finanzas/inversiones"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <TrendingUp className="w-5 h-5" />
          <span>Inversiones</span>
        </NavLink>

        {/* Más (Menu popover) */}
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
            showMoreMenu ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>Más</span>
        </button>
      </nav>
    </>
  );
};
