import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { finanzasApi, coreApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { SavingsGoal, Broker, InvestmentAsset } from '@/types';
import {
  Plus,
  DollarSign,
  Briefcase,
  RefreshCw,
  TrendingUp,
  Trash2,
  Pencil,
  Users,
} from 'lucide-react';
import { NewSavingsGoalModal } from '../components/NewSavingsGoalModal';
import { AddContributionModal } from '../components/AddContributionModal';
import { NewBrokerModal } from '../components/NewBrokerModal';
import { BrokerTxModal } from '../components/BrokerTxModal';
import { NewCurrencyQuoteModal } from '../components/NewCurrencyQuoteModal';
import { NewInvestmentAssetModal } from '../components/NewInvestmentAssetModal';
import { BrokerDistributionPieChart } from '../components/BrokerDistributionPieChart';
import { SavingsGoalsSection } from '../components/SavingsGoalsSection';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';

const toNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : parsed;
};

const formatCurrency = (val: any, decimals: number = 2): string => {
  const num = toNumber(val);
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const InversionesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { householdMembers: authMembers } = useAuth();

  const [viewScope, setViewScope] = useState<string>('ALL'); // 'ALL' or member.id

  // Modals state
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<SavingsGoal | null>(null);
  const [selectedGoalForContribution, setSelectedGoalForContribution] = useState<SavingsGoal | null>(null);
  const [isNewBrokerOpen, setIsNewBrokerOpen] = useState(false);
  const [selectedBrokerForTx, setSelectedBrokerForTx] = useState<Broker | null>(null);
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const [isNewAssetOpen, setIsNewAssetOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<InvestmentAsset | null>(null);

  // Generic Delete Confirmation Modal state
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'GOAL' | 'ASSET';
    id: string;
    name: string;
  } | null>(null);

  // Expanded goal contributions state
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  // React Query calls
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

  const { data: goals = [], isLoading: isLoadingGoals } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: () => finanzasApi.getSavingsGoals(),
  });

  const { data: brokers = [], isLoading: isLoadingBrokers } = useQuery({
    queryKey: ['brokers'],
    queryFn: () => finanzasApi.getBrokers(),
  });

  const { data: latestQuotes = {} } = useQuery({
    queryKey: ['latest-currency-quotes'],
    queryFn: () => finanzasApi.getLatestCurrencyQuotes(),
  });

  const { data: assets = [], isLoading: isLoadingAssets } = useQuery({
    queryKey: ['investment-assets'],
    queryFn: () => finanzasApi.getInvestmentAssets(),
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => finanzasApi.deleteInvestmentAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-assets'] });
      setItemToDelete(null);
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => finanzasApi.deleteSavingsGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-fund'] });
      setItemToDelete(null);
    },
  });

  // Filter Brokers by scope
  const filteredBrokers = useMemo(() => {
    if (viewScope === 'ALL') return brokers;
    return brokers.filter((b) => b.user_id === viewScope);
  }, [brokers, viewScope]);

  // Filter Assets by scope (belonging to filtered brokers)
  const filteredAssets = useMemo(() => {
    if (viewScope === 'ALL') return assets;
    return assets.filter((a) => a.broker && a.broker.user_id === viewScope);
  }, [assets, viewScope]);

  // Filter Goals by scope
  const filteredGoals = useMemo(() => {
    if (viewScope === 'ALL') return goals;
    return goals.filter((g) => {
      if (g.es_personal) {
        return g.user_id === viewScope;
      }
      const hasContrib = (g.contributions || []).some((c) => c.user_id === viewScope);
      return hasContrib || !g.user_id;
    });
  }, [goals, viewScope]);

  // Recalculate metrics for filtered scope
  const {
    portfolioEstimatedARS,
    portfolioEstimatedUSD,
    totalBrokersARS,
    totalBrokersUSDNominal,
    externalSavingsARS,
    externalSavingsUSD,
    usdBlueRate,
  } = useMemo(() => {
    const usdBlueRate = toNumber(latestQuotes['USD_BLUE']) || 1350;

    let extARS = 0;
    let extUSD = 0;

    filteredGoals.forEach((g) => {
      const contributions = g.contributions || [];
      const relevantContribs =
        viewScope === 'ALL'
          ? contributions
          : contributions.filter((c) => c.user_id === viewScope);

      const brokerContribs = relevantContribs.filter((c) => c.broker_id);
      const brokerContribsSum = brokerContribs.reduce((sum, c) => sum + toNumber(c.monto), 0);

      const totalAccumulated =
        viewScope === 'ALL'
          ? toNumber(g.monto_acumulado)
          : relevantContribs.reduce((sum, c) => sum + toNumber(c.monto), 0);

      const externalAmount = Math.max(0, totalAccumulated - brokerContribsSum);

      if (g.moneda === 'ARS') {
        extARS += externalAmount;
      } else {
        extUSD += externalAmount;
      }
    });

    const bARS = filteredBrokers.reduce((sum, b) => sum + toNumber(b.saldo_total_ars), 0);
    const bUSD = filteredBrokers.reduce(
      (sum, b) => sum + toNumber(b.saldo_total_usd) + toNumber(b.saldo_total_crypto),
      0
    );

    const portfolioARS = bARS + bUSD * usdBlueRate + extARS + extUSD * usdBlueRate;
    const portfolioUSD = portfolioARS / (usdBlueRate || 1);

    return {
      portfolioEstimatedARS: portfolioARS,
      portfolioEstimatedUSD: portfolioUSD,
      totalBrokersARS: bARS,
      totalBrokersUSDNominal: bUSD,
      externalSavingsARS: extARS,
      externalSavingsUSD: extUSD,
      usdBlueRate,
    };
  }, [filteredGoals, filteredBrokers, latestQuotes, viewScope]);

  const toggleExpandGoal = (id: string) => {
    setExpandedGoalId((prev) => (prev === id ? null : id));
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'GOAL') {
      deleteGoalMutation.mutate(itemToDelete.id);
    } else if (itemToDelete.type === 'ASSET') {
      deleteAssetMutation.mutate(itemToDelete.id);
    }
  };

  const quoteEntries = Object.entries(latestQuotes);

  return (
    <div className="space-y-6 max-w-[1750px] mx-auto pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Inversiones & Metas de Ahorro</span>
            {selectedMemberName && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                Solo {selectedMemberName}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400">
            Plataformas/Brokers, Títulos & Fondos (FCI), Metas de Ahorro e Histórico de Cotizaciones
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsNewQuoteOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cotizaciones</span>
          </button>

          <button
            onClick={() => setIsNewAssetOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Registrar Título / FCI</span>
          </button>

          <button
            onClick={() => setIsNewBrokerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>Nueva Plataforma</span>
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
            <span>Solo {m.nombre}</span>
          </button>
        ))}
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Patrimonio Total Consolidado */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/30 border border-emerald-500/20 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              Patrimonio Total Consolidado
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[10px] font-mono border border-emerald-500/20">
              USD Blue: ${formatCurrency(usdBlueRate, 0)}
            </span>
          </div>

          <div>
            <div className="text-2xl md:text-3xl font-black font-mono text-white tracking-tight">
              ${formatCurrency(portfolioEstimatedUSD)} USD
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              ≈ ${formatCurrency(portfolioEstimatedARS)} ARS
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>En Brokers: ${formatCurrency(totalBrokersUSDNominal)} USD</span>
            <span>Ahorros Ext.: ${formatCurrency(externalSavingsUSD)} USD (${formatCurrency(externalSavingsARS)} ARS)</span>
          </div>
        </div>

        {/* Card 2: Fondos en Brokers / Plataformas */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              Fondos en Brokers / Plataformas
            </span>
            <span className="text-xs text-slate-400 font-mono">{filteredBrokers.length} brokers</span>
          </div>

          <div>
            <div className="text-2xl md:text-3xl font-black font-mono text-white tracking-tight">
              ${formatCurrency(totalBrokersUSDNominal)} USD
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              ${formatCurrency(totalBrokersARS)} ARS
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Saldo ARS: ${formatCurrency(totalBrokersARS)}
            </span>
            <span>
              Saldo USD/Crypto: ${formatCurrency(totalBrokersUSDNominal)}
            </span>
          </div>
        </div>

        {/* Card 3: Últimas Cotizaciones */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" />
              Últimas Cotizaciones
            </span>
            <button
              onClick={() => setIsNewQuoteOpen(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            >
              + Actualizar
            </button>
          </div>

          {quoteEntries.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {quoteEntries.map(([currencyKey, val]) => (
                <div
                  key={currencyKey}
                  className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                >
                  <span className="text-xs text-slate-400 font-semibold">{currencyKey}</span>
                  <span className="text-xs font-mono font-bold text-white">
                    ${formatCurrency(val, 0)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-slate-500">
              No hay cotizaciones registradas aún.
            </div>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Brokers & Holdings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brokers Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-400" />
                <span>Plataformas & Brokers ({filteredBrokers.length})</span>
              </h3>
              <button
                onClick={() => setIsNewBrokerOpen(true)}
                className="px-2.5 py-1 rounded-xl text-purple-400 hover:text-purple-200 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-purple-400" />
                <span>Agregar Broker</span>
              </button>
            </div>

            {isLoadingBrokers ? (
              <div className="p-8 text-center text-slate-500 rounded-3xl bg-slate-900 border border-slate-800 text-xs">
                Cargando plataformas...
              </div>
            ) : filteredBrokers.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <p className="text-xs text-slate-400">
                  {viewScope !== 'ALL'
                    ? `No hay brokers registrados para ${selectedMemberName}.`
                    : 'No hay brokers o plataformas registradas aún.'}
                </p>
                <button
                  onClick={() => setIsNewBrokerOpen(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Registrar primera plataforma
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBrokers.map((broker) => {
                  const brokerGoalsContribs = goals
                    .flatMap((g) => g.contributions || [])
                    .filter((c) => c.broker_id === broker.id);

                  const totalAllocatedUSD = brokerGoalsContribs.reduce(
                    (sum, c) => sum + toNumber(c.monto),
                    0
                  );

                  const brokerTotalUSD =
                    toNumber(broker.saldo_total_usd) + toNumber(broker.saldo_total_crypto);
                  const availableUnallocatedUSD = Math.max(0, brokerTotalUSD - totalAllocatedUSD);

                  const brokerOwner = membersList.find((m) => m.id === broker.user_id);

                  return (
                    <div
                      key={broker.id}
                      className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                            <span>{broker.nombre}</span>
                            {brokerOwner && (
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] text-white"
                                style={{ backgroundColor: brokerOwner.color_avatar || '#16a34a' }}
                                title={`Owner: ${brokerOwner.nombre}`}
                              >
                                {brokerOwner.nombre[0]}
                              </span>
                            )}
                          </h4>
                          <span className="text-[10px] text-purple-400 font-mono">
                            Broker / Cuenta de Inversión
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedBrokerForTx(broker)}
                          className="px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-purple-400" />
                          <span>Operar</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                        <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/60">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                            Saldo ARS
                          </span>
                          <span className="text-sm font-mono font-bold text-white">
                            ${formatCurrency(broker.saldo_total_ars)}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/60">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                            Saldo USD / Crypto
                          </span>
                          <span className="text-sm font-mono font-bold text-emerald-400">
                            ${formatCurrency(brokerTotalUSD)} USD
                          </span>
                        </div>
                      </div>

                      {/* Goal Allocations breakdown */}
                      <div className="pt-2 border-t border-slate-800/60 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Asignado a Metas:</span>
                          <span className="font-mono font-semibold text-cyan-400">
                            ${formatCurrency(totalAllocatedUSD)} USD
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Disponible Sin Asignar:</span>
                          <span className="font-mono font-semibold text-emerald-400">
                            ${formatCurrency(availableUnallocatedUSD)} USD
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Broker Distribution Pie Chart */}
          <BrokerDistributionPieChart brokers={filteredBrokers} usdBlueRate={usdBlueRate} />

          {/* Investment Assets Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Títulos, CEDEARs, Acciones & FCI ({filteredAssets.length})</span>
              </h3>
              <button
                onClick={() => setIsNewAssetOpen(true)}
                className="px-2.5 py-1 rounded-xl text-emerald-400 hover:text-emerald-200 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Agregar Título</span>
              </button>
            </div>

            {isLoadingAssets ? (
              <div className="p-8 text-center text-slate-500 rounded-3xl bg-slate-900 border border-slate-800 text-xs">
                Cargando activos...
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <p className="text-xs text-slate-400">No hay activos o títulos registrados aún.</p>
                <button
                  onClick={() => setIsNewAssetOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Registrar primer título
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-slate-800/80 bg-slate-900/60 shadow-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Ticker / Nombre</th>
                      <th className="px-4 py-3">Broker</th>
                      <th className="px-4 py-3 text-right">Cantidad</th>
                      <th className="px-4 py-3 text-right">Precio Actual</th>
                      <th className="px-4 py-3 text-right">Valor Total</th>
                      <th className="px-4 py-3 text-right">Rent. Anual</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAssets.map((asset) => {
                      const totalVal = toNumber(asset.cantidad) * toNumber(asset.precio_actual);
                      const gananciaAnual =
                        totalVal * (toNumber(asset.rentabilidad_esperada_anual) / 100);
                      const gananciaMensual = gananciaAnual / 12;

                      return (
                        <tr key={asset.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-semibold text-white">
                            <div>
                              <span className="font-mono text-emerald-400 font-bold mr-1.5">
                                {asset.ticker}
                              </span>
                              {asset.nombre}
                              <span className="text-[10px] text-slate-500 block">
                                {asset.tipo} ({asset.moneda})
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px]">
                              {asset.broker?.nombre || 'Sin broker'}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right font-mono">
                            {formatCurrency(asset.cantidad, 4)}
                          </td>

                          <td className="px-4 py-3 text-right font-mono">
                            ${formatCurrency(asset.precio_actual)}
                          </td>

                          <td className="px-4 py-3 text-right font-mono font-bold text-white">
                            ${formatCurrency(totalVal)} {asset.moneda}
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-emerald-400">
                            +{formatCurrency(asset.rentabilidad_esperada_anual)}%
                            <span className="text-[10px] text-slate-500 block">
                              +${formatCurrency(gananciaMensual)}/mes
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setAssetToEdit(asset);
                                  setIsNewAssetOpen(true);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                                title="Editar título"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  setItemToDelete({
                                    type: 'ASSET',
                                    id: asset.id,
                                    name: `${asset.ticker} - ${asset.nombre}`,
                                  })
                                }
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                title="Eliminar título"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Savings Goals Section */}
        <div>
          <SavingsGoalsSection
            goals={filteredGoals}
            isLoadingGoals={isLoadingGoals}
            expandedGoalId={expandedGoalId}
            onToggleExpandGoal={toggleExpandGoal}
            onOpenNewGoal={() => {
              setGoalToEdit(null);
              setIsNewGoalOpen(true);
            }}
            onEditGoal={(goal) => {
              setGoalToEdit(goal);
              setIsNewGoalOpen(true);
            }}
            onContributeGoal={(goal) => setSelectedGoalForContribution(goal)}
            onRequestDeleteGoal={(goal) =>
              setItemToDelete({
                type: 'GOAL',
                id: goal.id,
                name: goal.nombre,
              })
            }
          />
        </div>
      </div>

      {/* MODALS */}
      {isNewGoalOpen && (
        <NewSavingsGoalModal
          isOpen={isNewGoalOpen}
          onClose={() => {
            setIsNewGoalOpen(false);
            setGoalToEdit(null);
          }}
          goalToEdit={goalToEdit}
        />
      )}

      {selectedGoalForContribution && (
        <AddContributionModal
          isOpen={!!selectedGoalForContribution}
          onClose={() => setSelectedGoalForContribution(null)}
          goal={selectedGoalForContribution}
        />
      )}

      {isNewBrokerOpen && (
        <NewBrokerModal isOpen={isNewBrokerOpen} onClose={() => setIsNewBrokerOpen(false)} />
      )}

      {selectedBrokerForTx && (
        <BrokerTxModal
          isOpen={!!selectedBrokerForTx}
          onClose={() => setSelectedBrokerForTx(null)}
          broker={selectedBrokerForTx}
        />
      )}

      {isNewQuoteOpen && (
        <NewCurrencyQuoteModal isOpen={isNewQuoteOpen} onClose={() => setIsNewQuoteOpen(false)} />
      )}

      {isNewAssetOpen && (
        <NewInvestmentAssetModal
          isOpen={isNewAssetOpen}
          onClose={() => {
            setIsNewAssetOpen(false);
            setAssetToEdit(null);
          }}
          assetToEdit={assetToEdit}
        />
      )}

      {itemToDelete && (
        <ConfirmDeleteModal
          isOpen={!!itemToDelete}
          title={`Eliminar ${itemToDelete.type === 'GOAL' ? 'Meta de Ahorro' : 'Título de Inversión'}`}
          description={`¿Estás seguro de que deseas eliminar "${itemToDelete.name}"? Esta acción no se puede deshacer.`}
          isDeleting={deleteGoalMutation.isPending || deleteAssetMutation.isPending}
          onConfirm={handleConfirmDelete}
          onClose={() => setItemToDelete(null)}
        />
      )}
    </div>
  );
};
