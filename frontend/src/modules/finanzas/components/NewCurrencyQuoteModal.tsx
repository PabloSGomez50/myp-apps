import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import { RefreshCw, Calendar, DollarSign, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewCurrencyQuoteModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [monedaOrigen, setMonedaOrigen] = useState('USD_BLUE');
  const [monedaDestino] = useState('ARS');
  const [cotizacion, setCotizacion] = useState('');
  const [fecha, setFecha] = useState(getTodayString());
  const [errorMsg, setErrorMsg] = useState('');

  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      const parsedCotizacion = parseFloat(cotizacion);
      if (isNaN(parsedCotizacion) || parsedCotizacion <= 0) {
        throw new Error('La cotización debe ser mayor a 0.');
      }

      return finanzasApi.createCurrencyQuote({
        moneda_origen: monedaOrigen,
        moneda_destino: monedaDestino,
        cotizacion: parsedCotizacion,
        fecha: new Date(fecha).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['latest-currency-quotes'] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Error al guardar la cotización.');
    },
  });

  const resetForm = () => {
    setMonedaOrigen('USD_BLUE');
    setCotizacion('');
    setFecha(getTodayString());
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createQuoteMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white">Actualizar Cotización de Moneda</h3>
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
              Moneda / Tipo de Cambio
            </label>
            <select
              value={monedaOrigen}
              onChange={(e) => setMonedaOrigen(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="USD_BLUE">Dólar Blue (USD_BLUE)</option>
              <option value="USD_MEP">Dólar MEP (USD_MEP)</option>
              <option value="USDT">USDT (Crypto Dollar)</option>
              <option value="BTC">Bitcoin (BTC)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Cotización en ARS ($)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                step="0.01"
                value={cotizacion}
                onChange={(e) => setCotizacion(e.target.value)}
                placeholder="Ej: 1350.50"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Fecha de Cotización
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
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
              disabled={createQuoteMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
            >
              {createQuoteMutation.isPending ? 'Guardando...' : 'Guardar Cotización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
