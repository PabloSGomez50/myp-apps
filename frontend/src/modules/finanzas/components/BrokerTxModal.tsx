import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import { Broker, BrokerTxType } from '@/types';
import { ArrowLeftRight, Calendar, DollarSign, X } from 'lucide-react';

interface Props {
  broker: Broker | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BrokerTxModal: React.FC<Props> = ({ broker, isOpen, onClose }) => {
  const queryClient = useQueryClient();

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [tipo, setTipo] = useState<BrokerTxType>('DEPOSIT');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState<'ARS' | 'USD' | 'CRYPTO'>('ARS');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(getTodayString());
  const [errorMsg, setErrorMsg] = useState('');

  const recordTxMutation = useMutation({
    mutationFn: async () => {
      if (!broker) return;
      setErrorMsg('');
      const parsedMonto = parseFloat(monto);
      if (isNaN(parsedMonto) || parsedMonto <= 0) {
        throw new Error('El monto de la transacción debe ser mayor a 0.');
      }
      if (!descripcion.trim()) {
        throw new Error('Especifica el concepto o detalle de la operación.');
      }

      return finanzasApi.recordBrokerTransaction(broker.id, {
        tipo,
        monto: parsedMonto,
        moneda,
        descripcion: descripcion.trim(),
        fecha: new Date(fecha).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Error al registrar la transacción.');
    },
  });

  const resetForm = () => {
    setTipo('DEPOSIT');
    setMonto('');
    setMoneda('ARS');
    setDescripcion('');
    setFecha(getTodayString());
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordTxMutation.mutate();
  };

  if (!isOpen || !broker) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-purple-400">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Movimiento en Broker</h3>
              <p className="text-xs text-slate-400">{broker.nombre}</p>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Tipo de Operación
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as BrokerTxType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="DEPOSIT">Depósito / Fondeo (+)</option>
                <option value="WITHDRAW">Retiro / Extracción (-)</option>
                <option value="BUY_SIMPLE">Compra Simple Título / CEDEAR (- Saldo)</option>
                <option value="SELL_SIMPLE">Venta Simple Título / CEDEAR (+ Saldo)</option>
                <option value="FCI_SUBSCRIBE">Suscripción FCI (- Saldo)</option>
                <option value="FCI_REDEEM">Rescate FCI (+ Saldo)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Moneda
              </label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as 'ARS' | 'USD' | 'CRYPTO')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
                <option value="CRYPTO">Crypto</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Monto
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Concepto / Ticker / Detalle
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Fondeo desde MP, Compra SPY, Venta Apple..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Fecha de la Operación
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
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
              disabled={recordTxMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl shadow-lg shadow-purple-600/20 transition-colors"
            >
              {recordTxMutation.isPending ? 'Guardando...' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
