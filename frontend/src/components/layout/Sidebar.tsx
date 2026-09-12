import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Wallet,
  Receipt,
  TrendingUp,
  ShoppingBag,
  Boxes,
  Settings,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Props {
  onQuickTxClick?: () => void;
}

export const Sidebar: React.FC<Props> = ({ onQuickTxClick }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const navItems = [
    { to: '/finanzas', label: 'Resumen & Balance', icon: Wallet, end: true },
    { to: '/finanzas/movimientos', label: 'Movimientos & CSV', icon: Receipt },
    { to: '/finanzas/inversiones', label: 'Inversiones & Ahorro', icon: TrendingUp },
    { to: '/finanzas/shopping', label: 'Lista de Compras', icon: ShoppingBag },
    { to: '/inventario', label: 'Inventario & Stock', icon: Boxes },
    { to: '/hogar', label: 'Configuración Hogar', icon: Settings },
  ];

  return (
    <aside
      className={`sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-slate-800 bg-slate-900/60 backdrop-blur-md hidden md:flex flex-col justify-between p-3 transition-all duration-300 z-30 flex-shrink-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="space-y-4">
        {/* Toggle Collapse Button Header */}
        <div className="flex items-center justify-between px-1">
          {!isCollapsed && (
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Módulos</p>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition mx-auto md:mx-0"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Express Action Button */}
        <button
          onClick={onQuickTxClick}
          title="+ Cargar Gasto Rápido"
          className={`w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-95 ${
            isCollapsed ? 'px-0' : 'px-4'
          }`}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">Cargar Gasto Rápido</span>}
        </button>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                    isCollapsed ? 'justify-center' : 'justify-start'
                  } ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Banner */}
      {!isCollapsed && (
        <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900 border border-slate-800 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Convivencia 50/50
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Gastos divididos por igual y devoluciones en tiempo real entre miembros del hogar.
          </p>
        </div>
      )}
    </aside>
  );
};
