import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Broker } from '@/types';
import { PieChart as PieIcon } from 'lucide-react';

interface Props {
  brokers: Broker[];
  usdBlueRate: number;
}

const BROKER_COLORS = [
  '#c084fc', // purple-400
  '#38bdf8', // sky-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#f87171', // rose-400
  '#a78bfa', // violet-400
];

const toNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : parsed;
};

export const BrokerDistributionPieChart: React.FC<Props> = ({ brokers, usdBlueRate }) => {
  const pieData = useMemo(() => {
    const rate = usdBlueRate || 1350;

    const list = brokers
      .map((b, idx) => {
        const ars = toNumber(b.saldo_total_ars);
        const usd = toNumber(b.saldo_total_usd);
        const crypto = toNumber(b.saldo_total_crypto);

        // Convert all balances to ARS equivalent for pie distribution
        const totalArsVal = ars + (usd + crypto) * rate;

        return {
          name: b.nombre,
          value: totalArsVal,
          color: BROKER_COLORS[idx % BROKER_COLORS.length],
        };
      })
      .filter((b) => b.value > 0)
      .sort((a, b) => b.value - a.value);

    const grandTotal = list.reduce((acc, curr) => acc + curr.value, 0);

    return list.map((item) => ({
      ...item,
      percentage: grandTotal > 0 ? ((item.value / grandTotal) * 100).toFixed(1) : '0',
    }));
  }, [brokers, usdBlueRate]);

  const grandTotalARS = useMemo(() => {
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
          <p className="font-mono text-purple-400 font-bold">
            ${data.value.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
          </p>
          <p className="text-[11px] text-slate-400 font-medium">{data.percentage}% del total de portafolio</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 shadow-xl col-span-1">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <PieIcon className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">Distribución por Broker (%)</h4>
          <p className="text-[11px] text-slate-400">Total: ${grandTotalARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS</p>
        </div>
      </div>

      {pieData.length > 0 ? (
        <div className="space-y-4">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
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

          {/* Broker Percentage Breakdown List */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {pieData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/40 border border-slate-800/60"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-slate-200 truncate">{item.name}</span>
                </div>
                <div className="text-right font-mono flex-shrink-0 pl-2">
                  <span className="font-bold text-white">${item.value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                  <span className="text-[10px] text-slate-400 ml-1.5 font-sans">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 text-xs">
          No hay saldos registrados en tus plataformas para armar la distribución.
        </div>
      )}
    </div>
  );
};
