import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import { X, CheckCircle2, ArrowRightLeft } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettlementModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('Liquidación de saldo de pareja');
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [targetAccountId, setTargetAccountId] = useState<string>('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => finanzasApi.getAccounts(false),
  });

  const settlementMutation = useMutation({
    mutationFn: async () => {
      const numMonto = parseFloat(monto);
      if (isNaN(numMonto) || numMonto <= 0) throw new Error('Monto inválido');
      if (!sourceAccountId || !targetAccountId) throw new Error('Selecciona ambas cuentas');
      if (sourceAccountId === targetAccountId) throw new Error('Las cuentas origen y destino deben ser distintas');

      return finanzasApi.createSettlement({
        source_account_id: sourceAccountId,
        target_account_id: targetAccountId,
        monto: numMonto,
        descripcion,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      onClose();
      resetForm();
    },
  });

  const resetForm = () => {
    setMonto('');
    setDescripcion('Liquidación de saldo de pareja');
    setSourceAccountId('');
    setTargetAccountId('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Liquidar Saldo de Pareja</h3>
              <p className="text-xs text-slate-400">Transferencia para saldar o reducir la deuda neta acumulada</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {settlementMutation.isError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {(settlementMutation.error as Error).message || 'Error al procesar la liquidación'}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            settlementMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Monto a Liquidar (ARS)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-lg font-bold font-mono text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Cuenta Origen (Quien Transfiere)</label>
            <select
              required
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Seleccionar Cuenta Origen --</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nombre} (${acc.saldo_actual.toLocaleString('es-AR')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Cuenta Destino (Quien Recibe)</label>
            <select
              required
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Seleccionar Cuenta Destino --</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nombre} (${acc.saldo_actual.toLocaleString('es-AR')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción / Nota</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={settlementMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{settlementMutation.isPending ? 'Procesando...' : 'Confirmar Liquidación'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
