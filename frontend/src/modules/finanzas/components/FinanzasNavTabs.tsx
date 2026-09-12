import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, TrendingUp } from 'lucide-react';

export const FinanzasNavTabs: React.FC = () => {
  const tabs = [
    { to: '/finanzas', label: 'Resumen & Balance', icon: LayoutDashboard, end: true },
    { to: '/finanzas/movimientos', label: 'Movimientos & CSV', icon: Receipt },
    { to: '/finanzas/inversiones', label: 'Inversiones & Ahorro', icon: TrendingUp },
  ];

  return (
    <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 w-fit">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};
