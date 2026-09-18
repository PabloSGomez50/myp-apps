import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Briefcase, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewBrokerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { householdMembers, user } = useAuth();

  const [nombre, setNombre] = useState('');
  const [saldoArs, setSaldoArs] = useState('');
  const [saldoUsd, setSaldoUsd] = useState('');
  const [saldoCrypto, setSaldoCrypto] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const activeUser = selectedUserId || user?.id || (householdMembers[0]?.id ?? '');

  const createBrokerMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      if (!nombre.trim()) {
        throw new Error('El nombre de la entidad o broker es obligatorio.');
      }

      return finanzasApi.createBroker({
        nombre: nombre.trim(),
        saldo_total_ars: parseFloat(saldoArs) || 0,
        saldo_total_usd: parseFloat(saldoUsd) || 0,
        saldo_total_crypto: parseFloat(saldoCrypto) || 0,
        user_id: activeUser || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Error al agregar la plataforma.');
    },
  });

  const resetForm = () => {
    setNombre('');
    setSaldoArs('');
    setSaldoUsd('');
    setSaldoCrypto('');
    setSelectedUserId('');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBrokerMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-purple-400">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-base font-bold text-white">Nueva Plataforma / Broker</h3>
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
              Nombre de la Plataforma
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: IOL InvertirOnline, Balanz, Binance, Lemon..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {householdMembers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Titular / Usuario
              </label>
              <select
                value={activeUser}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                {householdMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Saldo ARS
              </label>
              <input
                type="number"
                step="0.01"
                value={saldoArs}
                onChange={(e) => setSaldoArs(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Saldo USD
              </label>
              <input
                type="number"
                step="0.01"
                value={saldoUsd}
                onChange={(e) => setSaldoUsd(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Saldo Crypto
              </label>
              <input
                type="number"
                step="0.01"
                value={saldoCrypto}
                onChange={(e) => setSaldoCrypto(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
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
              disabled={createBrokerMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl shadow-lg shadow-purple-600/20 transition-colors"
            >
              {createBrokerMutation.isPending ? 'Guardando...' : 'Crear Plataforma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
