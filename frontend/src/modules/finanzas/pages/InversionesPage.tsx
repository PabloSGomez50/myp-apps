import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import { SavingsGoal, Broker, InvestmentAsset } from '@/types';
import {
  Plus,
  DollarSign,
  Briefcase,
  RefreshCw,
  TrendingUp,
  Trash2,
  Pencil,
  PieChart as PieChartIcon,
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

  const { data: quotesHistory = [] } = useQuery({
    queryKey: ['currency-quotes'],
    queryFn: () => finanzasApi.getCurrencyQuotes(),
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

  // Flatten all goal contributions to compute broker allocations
  const allContributions = goals.flatMap((g) =>
    (g.contributions || []).map((c) => ({
      ...c,
      goalMoneda: g.moneda,
      goalNombre: g.nombre,
    }))
  );

  // Calculate external (non-broker) savings to avoid double-counting funds already in brokers
  let externalSavingsARS = 0;
  let externalSavingsUSD = 0;

  goals.forEach((g) => {
    const contributions = g.contributions || [];
    const brokerContribs = contributions.filter((c) => c.broker_id);
    const brokerContribsSum = brokerContribs.reduce((sum, c) => sum + toNumber(c.monto), 0);
    const externalAmount = Math.max(0, toNumber(g.monto_acumulado) - brokerContribsSum);

    if (g.moneda === 'ARS') {
      externalSavingsARS += externalAmount;
    } else {
      externalSavingsUSD += externalAmount;
    }
  });

  const totalBrokersARS = brokers.reduce((sum, b) => sum + toNumber(b.saldo_total_ars), 0);
  const totalBrokersUSDNominal = brokers.reduce(
    (sum, b) => sum + toNumber(b.saldo_total_usd) + toNumber(b.saldo_total_crypto),
    0
  );

  const usdBlueRate = toNumber(latestQuotes['USD_BLUE']) || 1350;
  const totalBrokersCombinedUSD = totalBrokersUSDNominal + totalBrokersARS / (usdBlueRate || 1);

  // Consolidated portfolio = All Broker funds + External savings (not held in brokers)
  const portfolioEstimatedARS =
    totalBrokersARS +
    totalBrokersUSDNominal * usdBlueRate +
    externalSavingsARS +
    externalSavingsUSD * usdBlueRate;

  const portfolioEstimatedUSD = portfolioEstimatedARS / (usdBlueRate || 1);

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
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Inversiones & Metas de Ahorro
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

          <button
            onClick={() => setIsNewGoalOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Meta</span>
          </button>
        </div>
      </div>

      {/* Top Cards Grid (3 Consolidated Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Patrimonio Total Consolidado */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2.5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Patrimonio Total Consolidado</span>
            <PieChartIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-white">
              ${formatCurrency(portfolioEstimatedARS, 0)} ARS
            </p>
            <p className="text-xs font-mono text-cyan-400 font-semibold mt-0.5">
              ≈ ${formatCurrency(portfolioEstimatedUSD, 2)} USD
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>En Brokers: ${formatCurrency(totalBrokersARS + totalBrokersUSDNominal * usdBlueRate, 0)}</span>
            <span>Ahorros Ext.: ${formatCurrency(externalSavingsARS + externalSavingsUSD * usdBlueRate, 0)}</span>
          </div>
        </div>

        {/* Card 2: Plataformas / Brokers */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Plataformas & Brokers</span>
            <Briefcase className="w-4 h-4 text-purple-400" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold font-mono text-white">
              ARS: ${formatCurrency(totalBrokersARS)}
            </p>
            <p className="font-mono text-purple-400 font-semibold">
              USD: ${formatCurrency(totalBrokersUSDNominal)} 
            </p>
            <p className="font-mono text-emerald-400 font-bold pt-1 border-t border-slate-800/80">
              USD: ${formatCurrency(totalBrokersCombinedUSD)}
            </p>
          </div>
        </div>

        {/* Card 3: Cotizaciones Actuales (Dinámico) */}
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Cotizaciones Actuales</span>
            <button
              onClick={() => setIsNewQuoteOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px] font-medium"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Cargar Cotizacion</span>
            </button>
          </div>

          <p className="text-slate-400 text-xs">
            Dólar Blue Ref:{' '}
            <span className="font-mono font-semibold text-white">
              ${formatCurrency(usdBlueRate)} ARS
            </span>
          </p>

          {quoteEntries.length === 0 ? (
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center text-xs text-slate-400">
              No hay cotizaciones registradas.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs max-h-24 overflow-y-auto custom-scrollbar">
              {quoteEntries.map(([currencyKey, quoteVal]) => (
                <div key={currencyKey} className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-semibold truncate uppercase">
                    {currencyKey.replace('_', ' ')}
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    ${formatCurrency(quoteVal)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid: Left 2 Cols (Brokers, Pie Chart & Assets) vs Right 1 Col (Savings Goals Component) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Plataformas, Pie Chart & Títulos/Fondos FCI */}
        <div className="lg:col-span-2 space-y-6">
          {/* Row 1: Brokers & Plataformas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-400" />
                <span>Plataformas & Brokers</span>
              </h3>
              <button
                onClick={() => setIsNewBrokerOpen(true)}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                + Agregar Plataforma
              </button>
            </div>

            {isLoadingBrokers ? (
              <div className="p-6 text-center text-slate-500 rounded-3xl bg-slate-900 border border-slate-800 text-xs">
                Cargando plataformas...
              </div>
            ) : brokers.length === 0 ? (
              <div className="p-6 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <p className="text-xs text-slate-400">No hay brokers o billeteras de inversión registradas.</p>
                <button
                  onClick={() => setIsNewBrokerOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
                >
                  <Plus className="w-3.5 h-3.5" /> Crear Broker
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {brokers.map((broker) => {
                  const brokerContribs = allContributions.filter((c) => c.broker_id === broker.id);
                  const assignedARS = brokerContribs
                    .filter((c) => c.goalMoneda === 'ARS')
                    .reduce((sum, c) => sum + toNumber(c.monto), 0);
                  const assignedUSD = brokerContribs
                    .filter((c) => c.goalMoneda === 'USD')
                    .reduce((sum, c) => sum + toNumber(c.monto), 0);

                  const totalBrokerUSDVal =
                    toNumber(broker.saldo_total_usd) +
                    toNumber(broker.saldo_total_crypto) +
                    toNumber(broker.saldo_total_ars) / (usdBlueRate || 1);

                  const totalAssignedUSD = assignedUSD + assignedARS / (usdBlueRate || 1);
                  const unassignedUSD = Math.max(0, totalBrokerUSDVal - totalAssignedUSD);

                  return (
                    <div
                      key={broker.id}
                      className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg hover:border-slate-700 transition-colors flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-bold text-white">{broker.nombre}</h4>
                          <p className="text-xs text-slate-400">Plataforma de inversión</p>
                        </div>

                        <button
                          onClick={() => setSelectedBrokerForTx(broker)}
                          className="px-3 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-purple-400" />
                          <span>Operar</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">ARS</span>
                          <span className="font-mono font-bold text-white">${formatCurrency(broker.saldo_total_ars)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">USD</span>
                          <span className="font-mono font-bold text-purple-400">${formatCurrency(broker.saldo_total_usd)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Crypto (USD)</span>
                          <span className="font-mono font-bold text-emerald-400">${formatCurrency(broker.saldo_total_crypto, 2)}</span>
                        </div>
                      </div>

                      {/* Goal Allocation Breakdown */}
                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                          <span>Asignado a Metas</span>
                          <span className="font-mono text-cyan-400 font-bold">
                            ${formatCurrency(totalAssignedUSD)} USD
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                          <span>Disponible Sin Asignar</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            ${formatCurrency(unassignedUSD)} USD
                          </span>
                        </div>
                        {/* {brokerContribs.length > 0 && (
                          <div className="pt-1 text-[10px] text-slate-500 truncate">
                            Metas vinculadas:{' '}
                            {Array.from(new Set(brokerContribs.map((c) => c.goalNombre))).join(', ')}
                          </div>
                        )} */}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Row 2: Grid of 2 equal columns: Col 1 (Pie Chart 1 col) & Col 2 (Títulos, CEDEARs & Fondos FCI) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Col 1: Reusable Pie Chart Component (1 col) */}
            <BrokerDistributionPieChart brokers={brokers} usdBlueRate={usdBlueRate} />

            {/* Col 2: Títulos, CEDEARs, Acciones & Fondos FCI with Expected Returns Calculation */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl col-span-1 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Títulos, CEDEARs & Fondos (FCI)</h4>
                    <p className="text-[11px] text-slate-400">{assets.length} instrumentos activos</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsNewAssetOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Añadir</span>
                </button>
              </div>

              {isLoadingAssets ? (
                <div className="p-6 text-center text-slate-500 text-xs">Cargando títulos...</div>
              ) : assets.length === 0 ? (
                <div className="p-6 text-center space-y-2 border border-dashed border-slate-800 rounded-2xl">
                  <p className="text-xs text-slate-400">No hay títulos ni fondos FCI registrados aún.</p>
                  <button
                    onClick={() => setIsNewAssetOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Registrar mi primer FCI / CEDEAR
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {assets.map((asset) => {
                    const capital = toNumber(asset.cantidad) * toNumber(asset.precio_actual);
                    const rentabilidadPct = toNumber(asset.rentabilidad_esperada_anual);
                    const gananciaAnual = capital * (rentabilidadPct / 100);
                    const gananciaMensual = gananciaAnual / 12;

                    return (
                      <div
                        key={asset.id}
                        className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                              {asset.ticker}
                            </span>
                            <div>
                              <h5 className="text-xs font-bold text-white truncate max-w-[140px]">
                                {asset.nombre}
                              </h5>
                              <span className="text-[10px] text-slate-500">
                                {asset.tipo.replace('_', ' ')} {asset.broker?.nombre ? `• ${asset.broker.nombre}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setAssetToEdit(asset);
                                setIsNewAssetOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-emerald-400 transition-colors"
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
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Eliminar título"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/60">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Tenencia Actual</span>
                            <span className="font-mono font-bold text-white">
                              ${formatCurrency(capital)} {asset.moneda}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">Rentabilidad Esperada</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {rentabilidadPct}% TNA/TEA
                            </span>
                          </div>
                        </div>

                        {/* Future Gain Projections */}
                        {rentabilidadPct > 0 && (
                          <div className="flex items-center justify-between text-[10px] bg-emerald-500/10 p-1.5 rounded-xl border border-emerald-500/20">
                            <span className="text-emerald-300 font-semibold">Ganancia Proyectada:</span>
                            <span className="font-mono font-bold text-emerald-300">
                              +${formatCurrency(gananciaMensual)} {asset.moneda}/mes (${formatCurrency(gananciaAnual)}/año)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Savings Goals Component */}
        <SavingsGoalsSection
          goals={goals}
          isLoadingGoals={isLoadingGoals}
          expandedGoalId={expandedGoalId}
          onToggleExpandGoal={toggleExpandGoal}
          onOpenNewGoal={() => setIsNewGoalOpen(true)}
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

      {/* Historical Exchange Rates Section */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span>Histórico de Cotizaciones de Divisas</span>
            </h3>
            <p className="text-xs text-slate-400">
              Registro continuo de tipos de cambio para la valuación de activos y dólar MEP / Blue / USDT
            </p>
          </div>

          <button
            onClick={() => setIsNewQuoteOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Agregar Cotización</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="p-3">Moneda Origen</th>
                <th className="p-3">Moneda Destino</th>
                <th className="p-3 text-right">Cotización</th>
                <th className="p-3 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
              {quotesHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    No hay cotizaciones registradas en el historial. Haz clic en "Agregar Cotización" para cargar una.
                  </td>
                </tr>
              ) : (
                quotesHistory.slice(0, 10).map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-semibold text-emerald-400">{quote.moneda_origen}</td>
                    <td className="p-3 text-slate-400">{quote.moneda_destino}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      ${formatCurrency(quote.cotizacion)} ARS
                    </td>
                    <td className="p-3 text-right font-mono text-slate-400">
                      {new Date(quote.fecha).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generic Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!itemToDelete}
        title={`¿Eliminar ${itemToDelete?.type === 'GOAL' ? 'Meta de Ahorro' : 'Título / FCI'}?`}
        description={`¿Estás seguro de que deseas eliminar "${itemToDelete?.name}"? Esta acción no se puede deshacer.`}
        isDeleting={deleteGoalMutation.isPending || deleteAssetMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setItemToDelete(null)}
      />

      {/* Action Modals */}
      <NewSavingsGoalModal
        isOpen={isNewGoalOpen}
        onClose={() => {
          setIsNewGoalOpen(false);
          setGoalToEdit(null);
        }}
        goalToEdit={goalToEdit}
      />
      <AddContributionModal
        goal={selectedGoalForContribution}
        isOpen={!!selectedGoalForContribution}
        onClose={() => setSelectedGoalForContribution(null)}
      />
      <NewBrokerModal isOpen={isNewBrokerOpen} onClose={() => setIsNewBrokerOpen(false)} />
      <BrokerTxModal
        broker={selectedBrokerForTx}
        isOpen={!!selectedBrokerForTx}
        onClose={() => setSelectedBrokerForTx(null)}
      />
      <NewCurrencyQuoteModal isOpen={isNewQuoteOpen} onClose={() => setIsNewQuoteOpen(false)} />
      <NewInvestmentAssetModal
        isOpen={isNewAssetOpen}
        onClose={() => {
          setIsNewAssetOpen(false);
          setAssetToEdit(null);
        }}
        assetToEdit={assetToEdit}
      />
    </div>
  );
};
