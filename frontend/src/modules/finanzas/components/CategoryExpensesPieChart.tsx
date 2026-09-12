import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Transaction } from '@/types';
import { PieChart as PieIcon, Calendar } from 'lucide-react';

interface Props {
  transactions: Transaction[];
}

const CATEGORY_COLORS = [
  '#10b981', // emerald-500
  '#6366f1', // indigo-500
  '#3b82f6', // blue-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#8b5cf6', // purple-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#06b6d4', // cyan-500
  '#e11d48', // rose-600
];

export const CategoryExpensesPieChart: React.FC<Props> = ({ transactions }) => {
  const [timePreset, setTimePreset] = useState<'current_month' | 'last_month' | 'all'>('current_month');

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter((tx) => {
      if (tx.tipo !== 'EXPENSE') return false;
      const txDate = new Date(tx.fecha);

      if (timePreset === 'current_month') {
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      }
      if (timePreset === 'last_month') {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return txDate.getMonth() === lastMonthDate.getMonth() && txDate.getFullYear() === lastMonthDate.getFullYear();
      }
      return true; // 'all'
    });
  }, [transactions, timePreset]);

  // Aggregate total amount by category
  const pieData = useMemo(() => {
    const categoryTotals: Record<string, { name: string; value: number }> = {};

    filteredExpenses.forEach((tx) => {
      const catName = tx.category?.nombre || 'Sin Categoría';
      const amount = Number(tx.monto) || 0;

      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { name: catName, value: 0 };
      }
      categoryTotals[catName].value += amount;
    });

    const result = Object.values(categoryTotals).sort((a, b) => b.value - a.value);
    const grandTotal = result.reduce((acc, curr) => acc + curr.value, 0);

    return result.map((item, idx) => ({
      ...item,
      percentage: grandTotal > 0 ? ((item.value / grandTotal) * 100).toFixed(1) : '0',
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [filteredExpenses]);

  const totalExpenseAmount = useMemo(() => {
    return pieData.reduce((acc, curr) => acc + curr.value, 0);
  }, [pieData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs shadow-xl space-y-1">
          <p className="font-bold text-white flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            {data.name}
          </p>
          <p className="font-mono text-emerald-400 font-bold">
            ${data.value.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
          </p>
          <p className="text-[11px] text-slate-400 font-medium">{data.percentage}% del total de gastos</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <PieIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Distribución de Gastos por Categoría (%)</h4>
            <p className="text-[11px] text-slate-400">Total: ${totalExpenseAmount.toLocaleString('es-AR')}</p>
          </div>
        </div>

        {/* Time Filter Select */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          <button
            onClick={() => setTimePreset('current_month')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              timePreset === 'current_month' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Este Mes
          </button>
          <button
            onClick={() => setTimePreset('last_month')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              timePreset === 'last_month' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mes Anterior
          </button>
          <button
            onClick={() => setTimePreset('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              timePreset === 'all' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todo
          </button>
        </div>
      </div>

      {pieData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Percentage List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-slate-200 truncate">{item.name}</span>
                </div>
                <div className="text-right font-mono flex-shrink-0 pl-2">
                  <span className="font-bold text-white">${item.value.toLocaleString('es-AR')}</span>
                  <span className="text-[10px] text-slate-400 ml-1.5 font-sans">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 text-xs">
          No hay gastos registrados en el período seleccionado.
        </div>
      )}
    </div>
  );
};
