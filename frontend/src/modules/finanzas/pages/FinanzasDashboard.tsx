import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { SettlementModal } from '../components/SettlementModal';
import { NewAccountModal } from '../components/NewAccountModal';
import { CsvImportModal } from '../components/CsvImportModal';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  Plus,
  FileText
} from 'lucide-react';

export const FinanzasDashboard: React.FC = () => {
  const [isNewTxOpen, setIsNewTxOpen] = useState<boolean>(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState<boolean>(false);
  const [isNewAccountOpen, setIsNewAccountOpen] = useState<boolean>(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState<boolean>(false);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Queries
  const { data: coupleBalance, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['couple-net'],
    queryFn: () => finanzasApi.getCoupleBalance(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => finanzasApi.getAccounts(false),
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', currentMonth, currentYear],
    queryFn: () => finanzasApi.getBudgets(currentMonth, currentYear),
  });

  const { data: emergencyFund } = useQuery({
    queryKey: ['emergency-fund'],
    queryFn: () => finanzasApi.getEmergencyFund(3),
  });

  const netBalance = coupleBalance ? coupleBalance.net_balance : 0;
  const summaryText = coupleBalance?.summary_text || 'Calculando balance de pareja...';

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
            onClick={() => setIsCsvImportOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Cargar CSV</span>
          </button>
          <button
            onClick={() => setIsNewTxOpen(true)}
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
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalance ? 'animate-spin' : ''}`} /> Balance Continuo de Pareja (50/50)
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl md:text-3xl font-extrabold text-white font-mono">
                ${Math.abs(netBalance).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              </h3>
              <span className="text-xs text-slate-400">ARS</span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {summaryText}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettlementOpen(true)}
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
          <div className="text-xl font-bold text-white font-mono">$0,0</div>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Disponible tras fijos y ahorros
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Gastos Compartidos (Mes)</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">$0,0</div>
          <p className="text-[11px] text-slate-400">
            Dividido 50/50 automáticamente
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Fondo de Emergencia</span>
            <Wallet className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            ${emergencyFund ? emergencyFund.ahorro_actual_emergencia.toLocaleString('es-AR') : '0,0'}
          </div>
          <p className="text-[11px] text-emerald-400">
            Cobertura: <strong>{emergencyFund ? emergencyFund.meses_cubiertos_reales : '0.0'} meses</strong>
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
              <span className="text-xs text-slate-400">Mes {currentMonth} / {currentYear}</span>
            </div>

            {budgets.length > 0 ? (
              <div className="space-y-4">
                {budgets.map((b) => (
                  <div key={b.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{b.category?.nombre || 'Categoría'}</span>
                      <span className="text-slate-400 font-mono">
                        ${b.gastado.toLocaleString('es-AR')} / ${b.monto_limite.toLocaleString('es-AR')}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${b.porcentaje_consumido >= 100 ? 'bg-rose-500' : 'bg-emerald-500'} transition-all duration-500`}
                        style={{ width: `${Math.min(b.porcentaje_consumido, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center space-y-2">
                <p className="text-xs text-slate-400">No hay presupuestos configurados para este mes.</p>
                <p className="text-[11px] text-slate-500">
                  Las categorías automáticas ya se han generado en la base de datos al registrar tu hogar.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Billeteras y Cuentas Personales */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Cuentas Personales</h4>
              <button
                onClick={() => setIsNewAccountOpen(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                + Agregar
              </button>
            </div>

            {accounts.length > 0 ? (
              <div className="space-y-2.5">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                        <span>{acc.nombre}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase">{acc.tipo}</span>
                    </div>
                    <span className="text-xs font-bold text-white font-mono">
                      ${acc.saldo_actual.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center space-y-3">
                <p className="text-xs text-slate-400">No posees cuentas registradas en la base de datos.</p>
                <button
                  onClick={() => setIsNewAccountOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  + Crear primera cuenta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Modals */}
      <NewTransactionModal isOpen={isNewTxOpen} onClose={() => setIsNewTxOpen(false)} />
      <SettlementModal isOpen={isSettlementOpen} onClose={() => setIsSettlementOpen(false)} />
      <NewAccountModal isOpen={isNewAccountOpen} onClose={() => setIsNewAccountOpen(false)} />
      <CsvImportModal isOpen={isCsvImportOpen} onClose={() => setIsCsvImportOpen(false)} />
    </div>
  );
};
