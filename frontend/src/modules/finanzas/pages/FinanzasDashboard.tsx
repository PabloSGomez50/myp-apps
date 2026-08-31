import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  Plus
} from 'lucide-react';

export const FinanzasDashboard: React.FC = () => {
  const { user } = useAuth();
  const [netBalance] = useState<number>(34500.5); // Positive: Partner owes Pablo $34.500,50
  const isPablo = user?.nombre === 'Pablo';

  const accounts = [
    { id: '1', nombre: 'MercadoPago Pablo', saldo: 145200.0, moneda: 'ARS', tipo: 'FINTECH', user: 'Pablo' },
    { id: '2', nombre: 'Galicia Débito Pablo', saldo: 320800.5, moneda: 'ARS', tipo: 'BANK', user: 'Pablo' },
    { id: '3', nombre: 'Ualá Pareja', saldo: 98400.0, moneda: 'ARS', tipo: 'FINTECH', user: 'Pareja' },
    { id: '4', nombre: 'BBVA Pareja', saldo: 210500.0, moneda: 'ARS', tipo: 'BANK', user: 'Pareja' },
  ];

  const budgets = [
    { categoria: 'Supermercado & Hogar', gastado: 210000, limite: 300000, color: 'bg-emerald-500', porcentaje: 70 },
    { categoria: 'Servicios & Alquiler', gastado: 450000, limite: 450000, color: 'bg-indigo-500', porcentaje: 100 },
    { categoria: 'Salidas & Cenas Pareja', gastado: 72000, limite: 80000, color: 'bg-rose-500', porcentaje: 90 },
  ];

  const recentTransactions = [
    { id: 't1', desc: 'Compra Semanal Coto', monto: 64200.0, pagadoPor: 'Pablo', compartido: true, fecha: 'Hoy, 18:30' },
    { id: 't2', desc: 'Pago Factura Edesur', monto: 28400.0, pagadoPor: 'Pareja', compartido: true, fecha: 'Ayer' },
    { id: 't3', desc: 'Cena Sushi Pareja', monto: 35000.0, pagadoPor: 'Pablo', compartido: true, fecha: 'Sábado' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Finanzas del Hogar</h2>
          <p className="text-xs text-slate-400">Resumen consolidado, gastos compartidos 50/50 y presupuestos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Modal para registrar gasto compartido o individual')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>

      {/* Hero: Splitwise Net Balance Banner */}
      <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Balance Continuo de Pareja (50/50)
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                ${Math.abs(netBalance).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              </h3>
              <span className="text-xs text-slate-400">ARS</span>
            </div>
            <p className="text-xs text-slate-300">
              {isPablo ? (
                <span>
                  <strong className="text-emerald-400 font-semibold">Pareja te adeuda</strong> por gastos compartidos pagados por ti.
                </span>
              ) : (
                <span>
                  <strong className="text-amber-400 font-semibold">Le debes a Pablo</strong> por gastos compartidos pagados por él.
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Registrar transferencia de liquidación (Settlement)')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-medium transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Liquidar Saldo</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Flujo Libre del Mes</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white">$185.200,0</div>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Disponible tras fijos y ahorros
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Gastos Compartidos (Mes)</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white">$732.000,0</div>
          <p className="text-[11px] text-slate-400">
            $366.000,0 correspondientes a cada uno
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Fondo de Emergencia</span>
            <Wallet className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-white">$950.000,0</div>
          <p className="text-[11px] text-emerald-400">
            Cobertura: <strong>2.1 meses</strong> de gastos fijos
          </p>
        </div>
      </div>

      {/* Main Grid: Cuentas Personales & Presupuestos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Presupuestos del Mes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Presupuestos Mensuales</h4>
              <span className="text-xs text-slate-400">Agosto 2026</span>
            </div>

            <div className="space-y-4">
              {budgets.map((b) => (
                <div key={b.categoria} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{b.categoria}</span>
                    <span className="text-slate-400 font-mono">
                      ${b.gastado.toLocaleString()} / ${b.limite.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${b.color} transition-all duration-500`}
                      style={{ width: `${Math.min(b.porcentaje, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Últimos Movimientos */}
          <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Últimos Movimientos</h4>
              <span className="text-xs text-emerald-400 cursor-pointer hover:underline">Ver todos</span>
            </div>

            <div className="divide-y divide-slate-800/60">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                      {tx.pagadoPor[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{tx.desc}</p>
                      <p className="text-[10px] text-slate-400">
                        {tx.fecha} • Pagó {tx.pagadoPor} {tx.compartido && '• 50/50'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white font-mono">-${tx.monto.toLocaleString('es-AR')}</span>
                    {tx.compartido && (
                      <span className="block text-[10px] text-slate-400 font-mono">
                        (Tu parte: -${(tx.monto / 2).toLocaleString('es-AR')})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Billeteras y Cuentas Personales */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Cuentas Personales</h4>
              <button
                onClick={() => alert('Crear nueva cuenta')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                + Agregar
              </button>
            </div>

            <div className="space-y-2.5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                      <span>{acc.nombre}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                        {acc.user}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase">{acc.tipo}</span>
                  </div>
                  <span className="text-xs font-bold text-white font-mono">
                    ${acc.saldo.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
