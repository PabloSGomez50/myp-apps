import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { finanzasApi, coreApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { ExpenseType } from '@/types';
import { X, Sliders, Sparkles, RotateCcw, Check, AlertCircle, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const MonthlySplitModal: React.FC<Props> = ({ isOpen, onClose, year, month }) => {
  const queryClient = useQueryClient();
  const { householdMembers } = useAuth();

  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [applicableTypes, setApplicableTypes] = useState<ExpenseType[]>(['FIXED_HOUSEHOLD']);
  const [nota, setNota] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const initializedKeyRef = useRef<string | null>(null);

  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => coreApi.getHousehold(),
    enabled: isOpen,
  });

  const { data: effectiveSplit } = useQuery({
    queryKey: ['effective-split', year, month],
    queryFn: () => finanzasApi.getEffectiveSplitRule(year, month),
    enabled: isOpen,
  });

  const { data: suggestedSplit } = useQuery({
    queryKey: ['suggested-split', year, month],
    queryFn: () => finanzasApi.suggestMonthlySplit(year, month),
    enabled: isOpen,
  });

  const { data: existingRules } = useQuery({
    queryKey: ['split-rules'],
    queryFn: () => finanzasApi.getMonthlySplitRules(),
    enabled: isOpen,
  });

  const currentRule = existingRules?.find((r) => r.year === year && r.month === month);

  const members = useMemo(() => {
    return householdData?.members && householdData.members.length > 0
      ? householdData.members.map((m) => m.user)
      : householdMembers;
  }, [householdData?.members, householdMembers]);

  // Initialize ratios ONCE per modal open / month session
  useEffect(() => {
    if (!isOpen) {
      initializedKeyRef.current = null;
      return;
    }

    const currentKey = `${year}-${month}`;
    const sourceRatios = currentRule?.user_ratios || effectiveSplit?.user_ratios;

    if (initializedKeyRef.current !== currentKey && sourceRatios && members.length > 0) {
      const initial: Record<string, number> = {};
      members.forEach((m) => {
        const raw = sourceRatios[m.id] ?? 0.5;
        initial[m.id] = Math.round(raw * 100);
      });
      setRatios(initial);
      setNota(currentRule?.nota || '');
      setApplicableTypes(currentRule?.applicable_expense_types || ['FIXED_HOUSEHOLD']);
      setErrorMsg('');
      initializedKeyRef.current = currentKey;
    }
  }, [isOpen, year, month, effectiveSplit, currentRule, members]);

  const toggleExpenseType = (type: ExpenseType) => {
    setApplicableTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) {
          setErrorMsg('Debes seleccionar al menos un tipo de gasto para la regla.');
          return prev;
        }
        setErrorMsg('');
        return prev.filter((t) => t !== type);
      } else {
        setErrorMsg('');
        return [...prev, type];
      }
    });
  };

  const handleRatioChange = (userId: string, val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    const otherMember = members.find((m) => m.id !== userId);

    if (otherMember && members.length === 2) {
      setRatios({
        [userId]: clamped,
        [otherMember.id]: 100 - clamped,
      });
    } else {
      setRatios((prev) => ({
        ...prev,
        [userId]: clamped,
      }));
    }
  };

  const applyPreset = (ratio1: number, ratio2: number) => {
    if (members.length >= 2) {
      setRatios({
        [members[0].id]: ratio1,
        [members[1].id]: ratio2,
      });
    }
  };

  const applyHouseholdDefault = () => {
    const defaultRatios = householdData?.default_split_ratios;
    if (defaultRatios && members.length > 0) {
      const next: Record<string, number> = {};
      members.forEach((m) => {
        const raw = defaultRatios[m.id] ?? 0.5;
        next[m.id] = Math.round(raw * 100);
      });
      setRatios(next);
      setNota('Predeterminado del hogar');
    } else {
      applyPreset(50, 50);
    }
  };

  const applySuggested = () => {
    if (suggestedSplit?.suggested_ratios) {
      const next: Record<string, number> = {};
      members.forEach((m) => {
        const raw = suggestedSplit.suggested_ratios[m.id] ?? 0.5;
        next[m.id] = Math.round(raw * 100);
      });
      setRatios(next);
      setNota(`Proporcional a ingresos de ${MONTH_NAMES[month - 1]}`);
    }
  };

  const totalPercentage = Object.values(ratios).reduce((acc, curr) => acc + curr, 0);
  const isValidTotal = Math.abs(totalPercentage - 100) < 0.01;

  const saveMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      if (!isValidTotal) {
        throw new Error('La suma de los porcentajes debe ser exactamente 100%.');
      }

      // Convert percentages to decimals 0.0 - 1.0
      const decimalRatios: Record<string, number> = {};
      for (const [uid, pct] of Object.entries(ratios)) {
        decimalRatios[uid] = Number((pct / 100).toFixed(4));
      }

      if (applicableTypes.length === 0) {
        throw new Error('Selecciona al menos un tipo de gasto para la regla.');
      }

      return finanzasApi.createOrUpdateMonthlySplitRule({
        year,
        month,
        user_ratios: decimalRatios,
        applicable_expense_types: applicableTypes,
        nota: nota.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['effective-split'] });
      queryClient.invalidateQueries({ queryKey: ['split-rules'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Error al guardar la regla.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!currentRule) return;
      return finanzasApi.deleteMonthlySplitRule(currentRule.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['effective-split'] });
      queryClient.invalidateQueries({ queryKey: ['split-rules'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Error al restablecer al predeterminado.');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                División de Gastos - {MONTH_NAMES[month - 1]} {year}
              </h2>
              <p className="text-xs text-slate-400">
                Regla para repartir gastos compartidos de este mes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Status Badge */}
          <div className="flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl text-xs">
            <div className="flex items-center gap-1">
              <span className="text-slate-400">División activa:</span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${
                effectiveSplit?.source === 'MONTHLY_RULE'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : effectiveSplit?.source === 'HOUSEHOLD_DEFAULT'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {effectiveSplit?.source === 'MONTHLY_RULE' && '✨ Regla específica del mes'}
                {effectiveSplit?.source === 'HOUSEHOLD_DEFAULT' && '🏠 Predeterminado del hogar'}
                {effectiveSplit?.source === 'EQUAL_SPLIT' && '⚖️ 50% / 50% Parejo'}
              </span>
            </div>
            {currentRule && (
              <span className="text-slate-500 text-xs">Guardada anteriormente</span>
            )}
          </div>

          {/* Suggested Split Banner */}
          {suggestedSplit && (
            <div className={`p-4 rounded-xl border transition-all ${
              suggestedSplit.is_sufficient
                ? 'bg-indigo-950/20 border-indigo-500/30'
                : 'bg-slate-800/30 border-slate-800'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Sugerencia proporcional por sueldos cargados</span>
                  </div>
                  {suggestedSplit.is_sufficient ? (
                    <div className="text-xs text-slate-300 space-y-0.5">
                      <p>
                        Total ingresos: <span className="font-semibold text-white">
                        ${suggestedSplit?.total_incomes ? Array.from(Object.values(suggestedSplit.total_incomes)).reduce((acc, curr) => acc + curr, 0).toLocaleString('es-AR') : 'ERR'}
                        </span>
                      </p>
                      <div className="flex gap-3 text-[11px] text-slate-400 pt-0.5">
                        {members.map((m) => {
                          const inc = suggestedSplit.total_incomes[m.id] || 0;
                          const ratio = Math.round((suggestedSplit.suggested_ratios[m.id] || 0) * 100);
                          return (
                            <span key={m.id}>
                              {m.nombre}: ${inc.toLocaleString('es-AR')} ({ratio}%)
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 flex items-center gap-1 pt-0.5">
                      <Info className="w-3.5 h-3.5 text-slate-500" />
                      No hay ingresos de ambos miembros para {MONTH_NAMES[month - 1]} para calcular automáticamente.
                    </p>
                  )}
                </div>

                {suggestedSplit.is_sufficient && (
                  <button
                    type="button"
                    onClick={applySuggested}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shrink-0 shadow-sm transition-all"
                  >
                    Aplicar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Split Ratio Controller */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Distribución de Gastos
            </label>

            {members.length === 2 && (
              <div className="space-y-2">
                {/* Member Input Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {members.map((m, idx) => {
                    const pct = ratios[m.id] ?? 50;
                    return (
                      <div
                        key={m.id}
                        className="p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0"
                            style={{ backgroundColor: m.color_avatar || (idx === 0 ? '#6366f1' : '#ec4899') }}
                          >
                            {m.nombre.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {m.nombre}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={pct}
                            onChange={(e) => handleRatioChange(m.id, parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-right font-bold text-base text-white focus:outline-none focus:border-indigo-500"
                          />
                          <span className="text-sm font-bold text-slate-400">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Slider (controlling user 0 vs user 1) */}
                <div className="px-1 pt-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={ratios[members[0].id] ?? 50}
                    onChange={(e) => handleRatioChange(members[0].id, parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 pt-1 font-mono">
                    <span>100% {members[1].nombre}</span>
                    <span>50% / 50%</span>
                    <span>100% {members[0].nombre}</span>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[11px] text-slate-500 mr-1">Rápidos:</span>
                  {householdData?.default_split_ratios && (
                    <button
                      type="button"
                      onClick={applyHouseholdDefault}
                      className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-md text-[11px] font-medium border border-amber-500/30 transition-colors"
                      title="Usar división configurada por defecto en el hogar"
                    >
                      🏠 Hogar
                    </button>
                  )}
                  {[
                    [50, 50],
                    [60, 40],
                    [65, 35],
                    [70, 30],
                    [40, 60],
                    [35, 65],
                    [30, 70],
                  ].map(([r1, r2]) => (
                    <button
                      key={`${r1}-${r2}`}
                      type="button"
                      onClick={() => applyPreset(r1, r2)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-mono border border-slate-700/60 transition-colors"
                    >
                      {r1}/{r2}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sum Validation Indicator */}
            {/* <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">Total asignado:</span>
              <span className={`font-bold font-mono ${isValidTotal ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPercentage}% {isValidTotal ? '✓' : '(debe ser 100%)'}
              </span>
            </div> */}
          </div>

          {/* Selective Expense Types */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tipos de gastos incluidos en esta regla
              </label>
              <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                {applicableTypes.length} de 3 activos
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Solo los tipos seleccionados usarán el porcentaje de arriba. Los demás se dividirán según la regla predeterminada del hogar (50% / 50%).
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1">
              {[
                {
                  id: 'FIXED_HOUSEHOLD' as ExpenseType,
                  title: 'Fijos del Hogar',
                  desc: 'Alquiler, expensas, luz, gas, internet, seguros',
                  icon: '🏠',
                },
                {
                  id: 'VARIABLE_HOUSEHOLD' as ExpenseType,
                  title: 'Variables del Hogar',
                  desc: 'Supermercado, farmacia, artículos de limpieza, compras compartidas',
                  icon: '🛒',
                },
                {
                  id: 'LEISURE_COUPLE' as ExpenseType,
                  title: 'Ocio en Pareja',
                  desc: 'Salidas a comer, delivery, cine, vacaciones, citas',
                  icon: '🍕',
                },
              ].map((item) => {
                const isChecked = applicableTypes.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleExpenseType(item.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      isChecked
                        ? 'bg-indigo-950/30 border-indigo-500/40 text-white shadow-sm'
                        : 'bg-slate-800/30 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="text-lg leading-none mt-0.5">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isChecked ? 'text-indigo-200' : 'text-slate-300'}`}>
                          {item.title}
                        </span>
                        <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${
                          isChecked
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-slate-800/80 text-slate-500 border border-slate-700/50'
                        }`}>
                          {isChecked ? '✨ Aplica regla' : '🏠 Predeterminado (50/50)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Nota o motivo (opcional)
            </label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Mes con sueldos proporcionales, bono extraordinario..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Retroactive notice */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300/90 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              <strong>Recálculo automático:</strong> Al guardar esta regla, los movimientos compartidos de los tipos seleccionados se recalcularán inmediatamente con esta nueva proporción, mientras que los tipos no seleccionados usarán la regla predeterminada del hogar.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900/80">
          <div>
            {currentRule ? (
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer a Predeterminado</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500">Usando regla del hogar</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !isValidTotal}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{saveMutation.isPending ? 'Guardando...' : 'Guardar Regla'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
