import React, { useMemo } from 'react';
import { Transaction } from '@/types';
import { RefreshCw, ArrowUpRight, ArrowDownLeft, Scale } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  memberId: string;
  memberName: string;
  currentMonth: number;
  currentYear: number;
}

export const SettlementSummaryCard: React.FC<Props> = ({
  transactions,
  memberId,
  memberName,
  currentMonth,
  currentYear,
}) => {
  const { totalPaid, totalReceived, netResult } = useMemo(() => {
    let paid = 0;
    let received = 0;

    transactions.forEach((tx) => {
      if (tx.tipo !== 'SETTLEMENT') return;
      const d = new Date(tx.fecha);
      if (d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear) {
        const amount = Number(tx.monto) || 0;
        // In settlement transactions, user_id is payer (who sent money)
        if (tx.user_id === memberId) {
          paid += amount;
        } else {
          received += amount;
        }
      }
    });

    return {
      totalPaid: paid,
      totalReceived: received,
      netResult: paid - received,
    };
  }, [transactions, memberId, currentMonth, currentYear]);

  return (
    <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 shadow-xl">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">Reintegros / Devoluciones ({memberName})</h4>
          <p className="text-[11px] text-slate-400">Balance de liquidaciones del mes</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Total Pagado */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase flex items-center justify-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-indigo-400" /> Pagado
          </span>
          <div className="text-sm font-bold text-white font-mono">
            ${totalPaid.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
          </div>
        </div>

        {/* Total Ingresado */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase flex items-center justify-center gap-1">
            <ArrowDownLeft className="w-3 h-3 text-emerald-400" /> Ingresado
          </span>
          <div className="text-sm font-bold text-white font-mono">
            ${totalReceived.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
          </div>
        </div>

        {/* Resultado Neto */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase flex items-center justify-center gap-1">
            <Scale className="w-3 h-3 text-sky-400" /> Neto
          </span>
          <div className={`text-sm font-bold font-mono ${netResult >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${netResult.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
          </div>
        </div>
      </div>
    </div>
  );
};
