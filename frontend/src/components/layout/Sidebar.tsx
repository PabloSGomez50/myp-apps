import React from 'react';
import { NavLink } from 'react-router-dom';
import { Wallet, ShoppingBag, Boxes, Settings, Sparkles } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/finanzas', label: 'Finanzas', icon: Wallet, badge: '50/50' },
    { to: '/finanzas/shopping', label: 'Lista de Compras', icon: ShoppingBag },
    { to: '/inventario', label: 'Inventario', icon: Boxes },
    { to: '/hogar', label: 'Configuración Hogar', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/50 hidden md:flex flex-col justify-between p-4">
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Módulos</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-semibold">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900 border border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" /> Convivencia
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          Gastos compartidos divididos 50/50 y saldo continuo en tiempo real.
        </p>
      </div>
    </aside>
  );
};
