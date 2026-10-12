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
import { FinanzasKeyMetrics } from '../components/FinanzasKeyMetrics';
import { MonthlySplitModal } from '../components/MonthlySplitModal';
import { isSameMonthAndYear, formatMonthYear } from '@/utils/date';
import { Transaction } from '@/types';
import {
  CheckCircle2,
  RefreshCw,
  Plus,
  FileText,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sliders,
} from 'lucide-react';

export const FinanzasDashboard: React.FC = () => {
  const { householdMembers: authMembers } = useAuth();

  const [viewScope, setViewScope] = useState<string>('ALL'); // 'ALL' or member.id
  const [isNewTxOpen, setIsNewTxOpen] = useState<boolean>(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState<boolean>(false);
  const [isNewAccountOpen, setIsNewAccountOpen] = useState<boolean>(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState<boolean>(false);
  const [isNewIncomeOpen, setIsNewIncomeOpen] = useState<boolean>(false);
  const [isMonthlySplitOpen, setIsMonthlySplitOpen] = useState<boolean>(false);

  const currentDate = new Date();
  const currentActualMonth = currentDate.getMonth() + 1;
  const currentActualYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentActualMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentActualYear);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedYear > currentActualYear || (selectedYear === currentActualYear && selectedMonth >= currentActualMonth)) {
      return; // Prevent navigating to future months
    }
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(currentActualMonth);
    setSelectedYear(currentActualYear);
  };

  const isViewingCurrentMonth = selectedMonth === currentActualMonth && selectedYear === currentActualYear;
  const selectedMonthName = formatMonthYear(selectedMonth, selectedYear);

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

  const { data: effectiveSplit } = useQuery({
    queryKey: ['effective-split', selectedYear, selectedMonth],
    queryFn: () => finanzasApi.getEffectiveSplitRule(selectedYear, selectedMonth),
  });

  const currentScopeRatio = useMemo(() => {
    if (viewScope === 'ALL') return null;
    return Math.round((effectiveSplit?.user_ratios?.[viewScope] ?? 0.5) * 100);
  }, [viewScope, effectiveSplit]);

  const splitScopeBadgeText = useMemo(() => {
    if (effectiveSplit?.source !== 'MONTHLY_RULE') return null;
    const types = effectiveSplit.applicable_expense_types;
    if (!types || types.length === 0) return 'Solo Fijos';
    if (types.length === 1 && types.includes('FIXED_HOUSEHOLD')) return 'Solo Fijos';
    if (
      types.length === 2 &&
      types.includes('FIXED_HOUSEHOLD') &&
      types.includes('VARIABLE_HOUSEHOLD')
    )
      return 'Fijos + Var.';
    if (types.length === 3) return 'Todos';
    return `${types.length} tipos`;
  }, [effectiveSplit]);

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

  // Filter & Impute Shared Expenses for Scope based on Dynamic Split Ratio
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
            // Shared expense: imputed to member according to tx.split_ratio
            // Payer share is (1 - split_ratio); Counterpart share is split_ratio
            const splitVal = tx.split_ratio != null ? Number(tx.split_ratio) : 0.5;
            const ratio = tx.user_id === viewScope ? (1 - splitVal) : splitVal;
            return {
              ...tx,
              monto: Number(tx.monto) * ratio,
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

  // Calculate Real-Time Metrics for Selected Month based on Scope
  const { totalIncomesMonth, totalExpensesMonth, gastosCompartidosMonth } = useMemo(() => {
    let incTotal = 0;
    let expTotal = 0;
    let sharedTotal = 0;

    filteredTransactionsForScope.forEach((tx) => {
      if (isSameMonthAndYear(tx.fecha, selectedMonth, selectedYear)) {
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
  }, [filteredTransactionsForScope, selectedMonth, selectedYear]);

  // Calculate Reintegros for Individual Member View
  const reintegrosMonth = useMemo(() => {
    if (viewScope === 'ALL') return { paid: 0, received: 0, net: 0 };
    let paid = 0;
    let received = 0;
    transactions.forEach((tx) => {
      if (tx.tipo !== 'SETTLEMENT') return;
      if (isSameMonthAndYear(tx.fecha, selectedMonth, selectedYear)) {
        const amount = Number(tx.monto) || 0;
        if (tx.user_id === viewScope) {
          paid += amount;
        } else {
          received += amount;
        }
      }
    });
    return { paid, received, net: received - paid };
  }, [transactions, viewScope, selectedMonth, selectedYear]);

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
                Solo {selectedMemberName} (Imputación {currentScopeRatio}%)
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400">Resumen consolidado, desglose visual de gastos y balance de pareja</p>
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

      {/* Controls Bar: View Scope (Hogar vs Individual) & Global Month Selector with Split Rule */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View Scope Selector Bar */}
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

          {membersList.map((m) => {
            const memberRatio = Math.round((effectiveSplit?.user_ratios?.[m.id] ?? 0.5) * 100);
            return (
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
                <span>Solo {m.nombre} ({memberRatio}%)</span>
              </button>
            );
          })}
        </div>

        {/* Right side: Monthly Split Config & Global Month Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Monthly Split Config Button */}
          <button
            onClick={() => setIsMonthlySplitOpen(true)}
            className="flex items-center gap-2 p-1.5 px-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-xs font-semibold text-slate-300 hover:text-white transition shadow-md group"
            title="Configurar división de gastos compartidos para este mes"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">División:</span>
            <div className="flex items-center gap-1.5">
              {membersList.map((m) => {
                const pct = Math.round((effectiveSplit?.user_ratios?.[m.id] ?? 0.5) * 100);
                return (
                  <span
                    key={m.id}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-white flex items-center gap-1 shadow-sm"
                    style={{ backgroundColor: m.color_avatar || '#6366f1' }}
                  >
                    {m.nombre.charAt(0).toUpperCase()} {pct}%
                  </span>
                );
              })}
            </div>
            {splitScopeBadgeText && (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {splitScopeBadgeText}
              </span>
            )}
          </button>

          {/* Global Month Selector Bar */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            {!isViewingCurrentMonth && (
              <button
                onClick={handleResetToCurrentMonth}
                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 rounded-xl hover:bg-emerald-500/10 border border-emerald-500/20 transition ml-1"
              >
                Mes Actual
              </button>
            )}
            <button
              onClick={handlePrevMonth}
              title="Mes Anterior"
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs font-bold text-white font-mono">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{selectedMonthName}</span>
            </div>

            <button
              onClick={handleNextMonth}
              title="Mes Siguiente"
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={selectedYear > currentActualYear || (selectedYear === currentActualYear && selectedMonth >= currentActualMonth)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero: Splitwise Net Balance Banner */}
      <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalance ? 'animate-spin' : ''}`} /> Balance Continuo de Pareja (Gastos Compartidos)
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

      {/* Key Metrics Cards Component */}
      <FinanzasKeyMetrics
        viewScope={viewScope}
        selectedMemberName={selectedMemberName}
        flujoLibreMonth={flujoLibreMonth}
        totalIncomesMonth={totalIncomesMonth}
        totalExpensesMonth={totalExpensesMonth}
        gastosCompartidosMonth={gastosCompartidosMonth}
        reintegrosMonth={reintegrosMonth}
        emergencyFund={emergencyFund}
        selectedMonthName={selectedMonthName}
      />

      {/* Analytics Section: Pie Chart (%) & Income/Settlement Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CategoryExpensesPieChart
            transactions={filteredTransactionsForScope}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <IncomeSummaryCard
            transactions={transactions}
            members={membersList}
            currentMonth={selectedMonth}
            currentYear={selectedYear}
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
      <MonthlySplitModal
        isOpen={isMonthlySplitOpen}
        onClose={() => setIsMonthlySplitOpen(false)}
        year={selectedYear}
        month={selectedMonth}
      />
    </div>
  );
};
