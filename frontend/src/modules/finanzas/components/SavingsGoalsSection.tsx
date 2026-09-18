import React from 'react';
import { SavingsGoal } from '@/types';
import { Target, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

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

interface SavingsGoalsSectionProps {
  goals: SavingsGoal[];
  isLoadingGoals: boolean;
  expandedGoalId: string | null;
  onToggleExpandGoal: (id: string) => void;
  onOpenNewGoal: () => void;
  onEditGoal: (goal: SavingsGoal) => void;
  onContributeGoal: (goal: SavingsGoal) => void;
  onRequestDeleteGoal: (goal: SavingsGoal) => void;
}

export const SavingsGoalsSection: React.FC<SavingsGoalsSectionProps> = ({
  goals,
  isLoadingGoals,
  expandedGoalId,
  onToggleExpandGoal,
  onOpenNewGoal,
  onEditGoal,
  onContributeGoal,
  onRequestDeleteGoal,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          <span>Metas de Ahorro del Hogar</span>
        </h3>
        <div className="flex items-center gap-2">
          {/* <span className="text-xs text-slate-400 font-mono">{goals.length} activas</span> */}
          <button
            onClick={onOpenNewGoal}
            className="px-2.5 py-1 rounded-xl text-cyan-400 hover:text-cyan-200 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nueva Meta</span>
          </button>
        </div>
      </div>

      {isLoadingGoals ? (
        <div className="p-8 text-center text-slate-500 rounded-3xl bg-slate-900 border border-slate-800 text-xs">
          Cargando metas de ahorro...
        </div>
      ) : goals.length === 0 ? (
        <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
          <p className="text-xs text-slate-400">No hay metas de ahorro registradas aún.</p>
          <button
            onClick={onOpenNewGoal}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" /> Crear mi primera meta
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const isExpanded = expandedGoalId === goal.id;
            const contributions = goal.contributions || [];

            return (
              <div
                key={goal.id}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-white">{goal.nombre}</h4>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onContributeGoal(goal)}
                        className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Aportar</span>
                      </button>
                      <button
                        onClick={() => onEditGoal(goal)}
                        className="p-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                        title="Editar meta"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onRequestDeleteGoal(goal)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Eliminar meta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {goal.fecha_limite && (
                    <p className="text-xs text-slate-400">
                      Fecha Límite: {new Date(goal.fecha_limite).toLocaleDateString('es-AR')}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-slate-400">Progreso</span>
                    <span className="text-sm font-bold font-mono text-cyan-400">
                      ${formatCurrency(goal.monto_acumulado)} / ${formatCurrency(goal.monto_objetivo)} {goal.moneda}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, toNumber(goal.porcentaje_avance))}%` }}
                  />
                </div>

                {/* Contributions Toggle & Breakdown */}
                {contributions.length > 0 && (
                  <div className="pt-1">
                    <button
                      onClick={() => onToggleExpandGoal(goal.id)}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>Histórico de Aportes ({contributions.length})</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 border-t border-slate-800/80 pt-3">
                        {contributions.map((contrib) => (
                          <div
                            key={contrib.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 text-xs border border-slate-800/50"
                          >
                            <div className="space-y-0.5">
                              <span className="text-slate-300 font-medium">Aporte de ahorro</span>
                              <span className="text-[10px] text-slate-500 block">
                                {new Date(contrib.fecha).toLocaleDateString('es-AR')}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-cyan-400">
                              +${formatCurrency(contrib.monto)} {goal.moneda}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
