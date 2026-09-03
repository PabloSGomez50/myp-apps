import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import { X, Wallet } from 'lucide-react';
import { AccountType } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewAccountModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState<string>('');
  const [tipo, setTipo] = useState<AccountType>('BANK');
  const [moneda, setMoneda] = useState<string>('ARS');
  const [saldoInicial, setSaldoInicial] = useState<string>('0.00');

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const saldo = parseFloat(saldoInicial) || 0;
      if (!nombre) throw new Error('El nombre de la cuenta es requerido');

      return finanzasApi.createAccount({
        nombre,
        tipo,
        moneda,
        saldo_actual: saldo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      onClose();
      setNombre('');
      setSaldoInicial('0.00');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Nueva Cuenta Personal</h3>
              <p className="text-xs text-slate-400">Banco, Fintech, Efectivo o Crypto Wallet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createAccountMutation.isError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {(createAccountMutation.error as Error).message}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createAccountMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Cuenta</label>
            <input
              type="text"
              required
              placeholder="Ej. Galicia Débito, MercadoPago, Efectivo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Cuenta</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as AccountType)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="BANK">Banco (Bancaria)</option>
                <option value="FINTECH">Fintech (MercadoPago/Ualá)</option>
                <option value="CASH">Efectivo</option>
                <option value="CRYPTO_WALLET">Crypto Wallet</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Moneda Base</label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ARS">ARS ($)</option>
                <option value="USD">USD ($)</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Saldo Inicial ($)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createAccountMutation.isPending}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20"
            >
              {createAccountMutation.isPending ? 'Guardando...' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
