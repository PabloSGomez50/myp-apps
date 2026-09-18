import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import { SavingsGoal } from '@/types';
import { DollarSign, Calendar, CreditCard, Briefcase, X, TrendingUp } from 'lucide-react';

interface Props {
  goal: SavingsGoal | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AddContributionModal: React.FC<Props> = ({ goal, isOpen, onClose }) => {
  const queryClient = useQueryClient();

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [monto, setMonto] = useState('');
  const [sourceType, setSourceType] = useState<'ACCOUNT' | 'BROKER' | 'NONE'>('NONE');
  const [sourceId, setSourceId] = useState<string>('');
  const [fecha, setFecha] = useState(getTodayString());
  const [errorMsg, setErrorMsg] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => finanzasApi.getAccounts(),
    enabled: isOpen,
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ['brokers'],
    queryFn: () => finanzasApi.getBrokers(),
    enabled: isOpen,
  });

  const contributeMutation = useMutation({
    mutationFn: async () => {
      if (!goal) return;
      setErrorMsg('');
      const parsedMonto = parseFloat(monto);
      if (isNaN(parsedMonto) || parsedMonto <= 0) {
        throw new Error('El monto del aporte debe ser mayor a 0.');
      }

      const accountId = sourceType === 'ACCOUNT' && sourceId ? sourceId : null;
      const brokerId = sourceType === 'BROKER' && sourceId ? sourceId : null;

      return finanzasApi.contributeToGoal(goal.id, {
        monto: parsedMonto,
        account_id: accountId,
        broker_id: brokerId,
        fecha: new Date(fecha).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-fund'] });
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Error al agregar el aporte.');
    },
  });

  const resetForm = () => {
    setMonto('');
    setSourceType('NONE');
    setSourceId('');
    setFecha(getTodayString());
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    contributeMutation.mutate();
  };

  if (!isOpen || !goal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-cyan-400">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Agregar Ahorro</h3>
              <p className="text-xs text-slate-400">{goal.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Monto a Aportar ({goal.moneda})
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Origen de los Fondos (Opcional)
            </label>
            <div className="space-y-2">
              <select
                value={sourceType}
                onChange={(e) => {
                  const val = e.target.value as 'ACCOUNT' | 'BROKER' | 'NONE';
                  setSourceType(val);
                  setSourceId('');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="NONE">-- Sin Vincular (Descontar de flujo disponible) --</option>
                <option value="BROKER">Plataforma / Broker de Inversión</option>
                <option value="ACCOUNT">Cuenta Bancaria / Billetera Virtual</option>
              </select>

              {sourceType === 'BROKER' && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Briefcase className="w-4 h-4 text-purple-400" />
                  </div>
                  <select
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    <option value="">-- Seleccionar Plataforma --</option>
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre} (ARS: ${b.saldo_total_ars} | USD: ${b.saldo_total_usd} | Crypto: ${b.saldo_total_crypto})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sourceType === 'ACCOUNT' && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <CreditCard className="w-4 h-4 text-cyan-400" />
                  </div>
                  <select
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="">-- Seleccionar Cuenta --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.nombre} ({acc.moneda})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Fecha del Aporte
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={contributeMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-xl shadow-lg shadow-cyan-600/20 transition-colors"
            >
              {contributeMutation.isPending ? 'Guardando...' : 'Registrar Aporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
