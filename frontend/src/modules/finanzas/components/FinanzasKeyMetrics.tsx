import React from 'react';
import { Wallet, TrendingUp, CreditCard, ArrowUpRight, RefreshCw } from 'lucide-react';

export interface FinanzasKeyMetricsProps {
  viewScope: string;
  selectedMemberName: string | null;
  flujoLibreMonth: number;
  totalIncomesMonth: number;
  totalExpensesMonth: number;
  gastosCompartidosMonth: number;
  reintegrosMonth: { paid: number; received: number; net: number };
  emergencyFund?: {
    ahorro_actual_emergencia: number;
    meses_cubiertos_reales: number;
  } | null;
  selectedMonthName: string;
}

export const FinanzasKeyMetrics: React.FC<FinanzasKeyMetricsProps> = ({
  viewScope,
  selectedMemberName,
  flujoLibreMonth,
  totalIncomesMonth,
  totalExpensesMonth,
  gastosCompartidosMonth,
  reintegrosMonth,
  emergencyFund,
  selectedMonthName,
}) => {
  const isIndividual = viewScope !== 'ALL';

  return (
    <div className={`grid grid-cols-1 ${!isIndividual ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'} gap-4`}>
      {/* 1. Flujo Libre del Mes */}
      <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2 shadow-xl">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span className="truncate">
            Flujo Libre ({selectedMonthName}) {selectedMemberName ? `(${selectedMemberName})` : ''}
          </span>
          <TrendingUp className={`w-4 h-4 flex-shrink-0 ${flujoLibreMonth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
        </div>
        <div className={`text-xl font-bold font-mono ${flujoLibreMonth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          ${flujoLibreMonth.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
        </div>
        <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>
            Ingresos (${totalIncomesMonth.toLocaleString('es-AR')}) - Gastos (${totalExpensesMonth.toLocaleString('es-AR')})
          </span>
        </p>
      </div>

      {/* 2. Gastos Compartidos (Mes) */}
      <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2 shadow-xl">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span className="truncate">
            Gastos Compartidos ({selectedMonthName}) {selectedMemberName ? `(50%: $${gastosCompartidosMonth.toLocaleString('es-AR')})` : ''}
          </span>
          <CreditCard className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        </div>
        <div className="text-xl font-bold text-white font-mono">
          ${gastosCompartidosMonth.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
        </div>
        <p className="text-[11px] text-slate-400">Cuota parte del 50% en gastos del hogar</p>
      </div>

      {/* 3. Reintegros / Devoluciones (Mes) - Vista Individual */}
      {isIndividual && (
        <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="truncate">Reintegros ({selectedMonthName})</span>
            <RefreshCw className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          </div>
          <div className={`text-xl font-bold font-mono ${reintegrosMonth.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${reintegrosMonth.net.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            Pagado: ${reintegrosMonth.paid.toLocaleString('es-AR')} | Ingresado: ${reintegrosMonth.received.toLocaleString('es-AR')}
          </p>
        </div>
      )}

      {/* 4. Fondo de Emergencia */}
      <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2 shadow-xl">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Fondo de Emergencia</span>
          <Wallet className="w-4 h-4 text-rose-400 flex-shrink-0" />
        </div>
        <div className="text-xl font-bold text-white font-mono">
          ${emergencyFund ? emergencyFund.ahorro_actual_emergencia.toLocaleString('es-AR') : '0,0'}
        </div>
        <p className="text-[11px] text-emerald-400">
          Cobertura: <strong>{emergencyFund ? Math.round(emergencyFund.meses_cubiertos_reales * 100) / 100 : '0.0'} meses</strong>
        </p>
      </div>
    </div>
  );
};
