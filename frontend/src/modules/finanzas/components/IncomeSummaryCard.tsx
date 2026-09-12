import React, { useMemo } from 'react';
import { Transaction, User } from '@/types';
import { DollarSign, Plus, Wallet } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  members: User[];
  currentMonth: number;
  currentYear: number;
  onAddIncomeClick: () => void;
}

export const IncomeSummaryCard: React.FC<Props> = ({
  transactions,
  members,
  currentMonth,
  currentYear,
  onAddIncomeClick,
}) => {
  // Aggregate current month incomes by member
  const memberIncomes = useMemo(() => {
    const map: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.tipo !== 'INCOME') return;
      const txDate = new Date(tx.fecha);
      if (txDate.getMonth() + 1 === currentMonth && txDate.getFullYear() === currentYear) {
        const userId = tx.user_id;
        map[userId] = (map[userId] || 0) + (Number(tx.monto) || 0);
      }
    });

    return members.map((member) => ({
      member,
      totalIncome: map[member.id] || 0,
    }));
  }, [transactions, members, currentMonth, currentYear]);

  const totalHouseholdIncome = useMemo(() => {
    return memberIncomes.reduce((acc, curr) => acc + curr.totalIncome, 0);
  }, [memberIncomes]);

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-emerald-500/20 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Ingresos / Sueldos del Mes</h4>
            <p className="text-[11px] text-slate-400">Total acumulado del hogar</p>
          </div>
        </div>

        <button
          onClick={onAddIncomeClick}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Cargar Ingreso</span>
        </button>
      </div>

      {/* Total Household Income Header */}
      <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Total del Hogar</span>
          <div className="text-2xl font-extrabold text-white font-mono">
            ${totalHouseholdIncome.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
          <Wallet className="w-5 h-5" />
        </div>
      </div>

      {/* Member Breakdown */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Desglose por Integrante:</p>
        {memberIncomes.length > 0 ? (
          memberIncomes.map(({ member, totalIncome }) => (
            <div
              key={member.id}
              className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
                  style={{ backgroundColor: member.color_avatar || '#16a34a' }}
                >
                  {member.nombre[0]}
                </div>
                <span className="text-xs font-medium text-slate-200">{member.nombre}</span>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-400">
                  ${totalIncome.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500 text-center py-2">No hay miembros registrados.</p>
        )}
      </div>
    </div>
  );
};
