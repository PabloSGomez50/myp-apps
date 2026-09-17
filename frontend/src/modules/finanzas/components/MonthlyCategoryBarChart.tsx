import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Transaction } from '@/types';
import { BarChart3, Filter, Layers, BarChart2 } from 'lucide-react';

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

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const MonthlyCategoryBarChart: React.FC<Props> = ({ transactions }) => {
  const [monthsCount, setMonthsCount] = useState<3 | 6 | 12>(3);
  const [chartType, setChartType] = useState<'stacked' | 'grouped'>('grouped');

  // Extract & sort category names from highest to lowest total expense
  const categoryNames = useMemo(() => {
    const totals: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.tipo === 'EXPENSE') {
        const catName = tx.category?.nombre || 'Sin Categoría';
        const amount = Number(tx.monto) || 0;
        totals[catName] = (totals[catName] || 0) + amount;
      }
    });

    return Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  }, [transactions]);

  // Build month slots for the requested months range
  const chartData = useMemo(() => {
    const now = new Date();
    const result: any[] = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const monthLabel = `${MONTH_NAMES[monthIdx]} ${year.toString().slice(2)}`;

      const slot: Record<string, any> = {
        monthKey: `${year}-${(monthIdx + 1).toString().padStart(2, '0')}`,
        label: monthLabel,
        totalMonthExpense: 0,
      };

      // Initialize all categories with 0
      categoryNames.forEach((catName) => {
        slot[catName] = 0;
      });

      result.push(slot);
    }

    // Populate data from transactions
    transactions.forEach((tx) => {
      if (tx.tipo !== 'EXPENSE') return;
      const txDate = new Date(tx.fecha);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();
      const txMonthKey = `${txYear}-${(txMonth + 1).toString().padStart(2, '0')}`;

      const slot = result.find((s) => s.monthKey === txMonthKey);
      if (slot) {
        const catName = tx.category?.nombre || 'Sin Categoría';
        const amount = Number(tx.monto) || 0;
        slot[catName] = (slot[catName] || 0) + amount;
        slot.totalMonthExpense += amount;
      }
    });

    return result;
  }, [transactions, categoryNames, monthsCount]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0);
      return (
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs shadow-2xl space-y-2 min-w-[160px]">
          <p className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between items-center">
            <span>{label}</span>
            <span className="font-mono text-emerald-400 font-extrabold">${total.toLocaleString('es-AR')}</span>
          </p>
          <div className="space-y-1">
            {payload
              .filter((item: any) => Number(item.value) > 0)
              .sort((a: any, b: any) => (Number(b.value) || 0) - (Number(a.value) || 0))
              .map((item: any) => (
                <div key={item.name} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="font-mono font-semibold text-white pl-2">
                    ${Number(item.value).toLocaleString('es-AR')}
                  </span>
                </div>
              ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Evolución de Gastos Mensuales por Categoría (ARS)</h4>
            <p className="text-[11px] text-slate-400">
              Categorías ordenadas de mayor a menor gasto • {chartType === 'stacked' ? 'Apiladas' : 'Agrupadas'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selector: Stacked vs Grouped */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              onClick={() => setChartType('stacked')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                chartType === 'stacked' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Barras Apiladas"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Apiladas</span>
            </button>
            <button
              onClick={() => setChartType('grouped')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                chartType === 'grouped' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Barras Agrupadas por Categoría"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Agrupadas</span>
            </button>
          </div>

          {/* Range Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <button
              onClick={() => setMonthsCount(3)}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                monthsCount === 3 ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3M
            </button>
            <button
              onClick={() => setMonthsCount(6)}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                monthsCount === 6 ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              6M
            </button>
            <button
              onClick={() => setMonthsCount(12)}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                monthsCount === 12 ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              12M
            </button>
          </div>
        </div>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip content={<CustomTooltip />} />
            {categoryNames.map((catName, idx) => (
              <Bar
                key={catName}
                dataKey={catName}
                stackId={chartType === 'stacked' ? 'a' : undefined}
                fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                radius={chartType === 'stacked' ? (idx === categoryNames.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]) : [4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
