import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { finanzasApi, coreApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { SettlementModal } from '../components/SettlementModal';
import { NewAccountModal } from '../components/NewAccountModal';
import { CsvImportModal } from '../components/CsvImportModal';
import { NewIncomeModal } from '../components/NewIncomeModal';
import { CategoryExpensesPieChart } from '../components/CategoryExpensesPieChart';
import { MonthlyCategoryBarChart } from '../components/MonthlyCategoryBarChart';
import { IncomeSummaryCard } from '../components/IncomeSummaryCard';
import { Transaction } from '@/types';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  Plus,
  FileText,
  DollarSign,
  Users,
} from 'lucide-react';

export const FinanzasDashboard: React.FC = () => {
  const { householdMembers: authMembers } = useAuth();

  const [viewScope, setViewScope] = useState<string>('ALL'); // 'ALL' or member.id
  const [isNewTxOpen, setIsNewTxOpen] = useState<boolean>(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState<boolean>(false);
  const [isNewAccountOpen, setIsNewAccountOpen] = useState<boolean>(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState<boolean>(false);
  const [isNewIncomeOpen, setIsNewIncomeOpen] = useState<boolean>(false);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Queries
  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => coreApi.getHousehold(),
  });

  const membersList = useMemo(() => {
    return householdData?.members && householdData.members.length > 0
      ? householdData.members.map((m) => m.user)
      : authMembers;
  }, [householdData, authMembers]);

  const selectedMemberName = useMemo(() => {
    if (viewScope === 'ALL') return null;
    return membersList.find((m) => m.id === viewScope)?.nombre || null;
  }, [viewScope, membersList]);

  const { data: coupleBalance, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['couple-net'],
    queryFn: () => finanzasApi.getCoupleBalance(),
  });

  const { data: emergencyFund } = useQuery({
    queryKey: ['emergency-fund'],
    queryFn: () => finanzasApi.getEmergencyFund(3),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => finanzasApi.getTransactions({ limit: 1000 }),
  });

  // Filter & Impute 50/50 Shared Expenses for Scope (Household ALL vs Individual Member)
  const filteredTransactionsForScope = useMemo(() => {
    if (viewScope === 'ALL') return transactions;

    return transactions
      .map((tx) => {
        if (tx.tipo === 'INCOME') {
          return tx.user_id === viewScope ? tx : null;
        }
        if (tx.tipo === 'EXPENSE') {
          if (!tx.es_compartido) {
            // Personal expense: 100% imputed to paying member
            return tx.user_id === viewScope ? tx : null;
          } else {
            // Shared expense: 50% imputed to member (regardless of who paid)
            return {
              ...tx,
              monto: Number(tx.monto) * 0.5,
            };
          }
        }
        if (tx.tipo === 'SETTLEMENT') {
          return tx.user_id === viewScope || (tx as any).source_user_id === viewScope || (tx as any).target_user_id === viewScope ? tx : null;
        }
        return null;
      })
      .filter((tx): tx is Transaction => tx !== null);
  }, [transactions, viewScope]);

  // Calculate Real-Time Metrics for Current Month based on Scope
  const { totalIncomesMonth, totalExpensesMonth, gastosCompartidosMonth } = useMemo(() => {
    let incTotal = 0;
    let expTotal = 0;
    let sharedTotal = 0;

    filteredTransactionsForScope.forEach((tx) => {
      const d = new Date(tx.fecha);
      if (d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear) {
        const amount = Number(tx.monto) || 0;
        if (tx.tipo === 'INCOME') {
          incTotal += amount;
        } else if (tx.tipo === 'EXPENSE') {
          expTotal += amount;
          if (tx.es_compartido) {
            sharedTotal += amount;
          }
        }
      }
    });

    return {
      totalIncomesMonth: incTotal,
      totalExpensesMonth: expTotal,
      gastosCompartidosMonth: sharedTotal,
    };
  }, [filteredTransactionsForScope, currentMonth, currentYear]);

  // Calculate Reintegros for Individual Member View
  const reintegrosMonth = useMemo(() => {
    if (viewScope === 'ALL') return { paid: 0, received: 0, net: 0 };
    let paid = 0;
    let received = 0;
    transactions.forEach((tx) => {
      if (tx.tipo !== 'SETTLEMENT') return;
      const d = new Date(tx.fecha);
      if (d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear) {
        const amount = Number(tx.monto) || 0;
        if (tx.user_id === viewScope) {
          paid += amount;
        } else {
          received += amount;
        }
      }
    });
    return { paid, received, net: received - paid };
  }, [transactions, viewScope, currentMonth, currentYear]);

  // Flujo Libre del Mes = Total Ingresos - Total Gastos Imputables
  const flujoLibreMonth = totalIncomesMonth - totalExpensesMonth;

  const netBalance = coupleBalance ? coupleBalance.net_balance : 0;
  const summaryText = coupleBalance?.summary_text || 'Calculando balance de pareja...';

  return (
    <div className="space-y-6">
      {/* Header & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Finanzas del Hogar</span>
            {selectedMemberName && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                Solo {selectedMemberName} (Imputación 50/50)
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400">Resumen consolidado, desglose visual de gastos y balance 50/50</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsNewIncomeOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Registrar Ingreso</span>
          </button>

          <button
            onClick={() => setIsSettlementOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <span>Devolución / Reintegros</span>
          </button>

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

      {/* View Scope Selector Bar (Hogar Completo vs Individual Member) */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 w-fit shadow-md">
        <span className="text-xs font-semibold text-slate-400 px-2 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-indigo-400" /> Vista:
        </span>

        <button
          onClick={() => setViewScope('ALL')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            viewScope === 'ALL'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>🏠 Hogar Completo (Consolidado)</span>
        </button>

        {membersList.map((m) => (
          <button
            key={m.id}
            onClick={() => setViewScope(m.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              viewScope === m.id
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] text-white flex-shrink-0"
              style={{ backgroundColor: m.color_avatar || '#16a34a' }}
            >
              {m.nombre[0]}
            </span>
            <span>Solo {m.nombre} (50/50)</span>
          </button>
        ))}
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
            <p className="text-xs text-slate-300 font-medium">{summaryText}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettlementOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Devolución / Reintegro</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards (3 for ALL, 4 for Individual View with Reintegros) */}
      <div className={`grid grid-cols-1 ${viewScope === 'ALL' ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'} gap-4`}>
        {/* Flujo Libre del Mes */}
        <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Flujo Libre del Mes {selectedMemberName ? `(${selectedMemberName})` : ''}</span>
            <TrendingUp className={`w-4 h-4 ${flujoLibreMonth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className={`text-xl font-bold font-mono ${flujoLibreMonth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${flujoLibreMonth.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> Ingresos (${totalIncomesMonth.toLocaleString('es-AR')}) - Gastos Imputados (${totalExpensesMonth.toLocaleString('es-AR')})
          </p>
        </div>

        {/* Gastos Compartidos (Mes) */}
        <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Gastos Compartidos (Mes) {selectedMemberName ? `(50%: $${gastosCompartidosMonth.toLocaleString('es-AR')})` : ''}</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            ${gastosCompartidosMonth.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
          </div>
          <p className="text-[11px] text-slate-400">Cuota parte del 50% en gastos del hogar</p>
        </div>

        {/* Reintegros / Devoluciones (Mes) - Shown in Individual View */}
        {viewScope !== 'ALL' && (
          <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Reintegros / Devoluciones (Mes)</span>
              <RefreshCw className="w-4 h-4 text-indigo-400" />
            </div>
            <div className={`text-xl font-bold font-mono ${reintegrosMonth.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${reintegrosMonth.net.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
            </div>
            <p className="text-[11px] text-slate-400">
              Pagado: ${reintegrosMonth.paid.toLocaleString('es-AR')} | Ingresado: ${reintegrosMonth.received.toLocaleString('es-AR')}
            </p>
          </div>
        )}


        {/* Fondo de Emergencia */}
        <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Fondo de Emergencia</span>
            <Wallet className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            ${emergencyFund ? emergencyFund.ahorro_actual_emergencia.toLocaleString('es-AR') : '0,0'}
          </div>
          <p className="text-[11px] text-emerald-400">
            Cobertura: <strong>{emergencyFund ? Math.round(emergencyFund.meses_cubiertos_reales * 100) / 100 : '0.0'} meses</strong>
          </p>
        </div>
      </div>

      {/* Analytics Section: Pie Chart (%) & Income/Settlement Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CategoryExpensesPieChart transactions={filteredTransactionsForScope} />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <IncomeSummaryCard
            transactions={transactions}
            members={membersList}
            currentMonth={currentMonth}
            currentYear={currentYear}
            onAddIncomeClick={() => setIsNewIncomeOpen(true)}
          />
        </div>
      </div>

      {/* Monthly Evolution Stacked / Grouped Bar Chart */}
      <MonthlyCategoryBarChart transactions={filteredTransactionsForScope} />

      {/* Interactive Modals */}
      <NewTransactionModal isOpen={isNewTxOpen} onClose={() => setIsNewTxOpen(false)} />
      <SettlementModal isOpen={isSettlementOpen} onClose={() => setIsSettlementOpen(false)} />
      <NewAccountModal isOpen={isNewAccountOpen} onClose={() => setIsNewAccountOpen(false)} />
      <CsvImportModal isOpen={isCsvImportOpen} onClose={() => setIsCsvImportOpen(false)} />
      <NewIncomeModal isOpen={isNewIncomeOpen} onClose={() => setIsNewIncomeOpen(false)} />
    </div>
  );
};
