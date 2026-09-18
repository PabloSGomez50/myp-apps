import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import { InvestmentAsset } from '@/types';
import { TrendingUp, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assetToEdit?: InvestmentAsset | null;
}

export const NewInvestmentAssetModal: React.FC<Props> = ({ isOpen, onClose, assetToEdit }) => {
  const queryClient = useQueryClient();

  const [ticker, setTicker] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('FCI_ARS');
  const [cantidad, setCantidad] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [precioActual, setPrecioActual] = useState('');
  const [rentabilidadAnual, setRentabilidadAnual] = useState('');
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [brokerId, setBrokerId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (assetToEdit) {
      setTicker(assetToEdit.ticker || '');
      setNombre(assetToEdit.nombre || '');
      setTipo(assetToEdit.tipo || 'FCI_ARS');
      setCantidad(assetToEdit.cantidad !== undefined ? assetToEdit.cantidad.toString() : '');
      setPrecioCompra(assetToEdit.precio_compra !== undefined ? assetToEdit.precio_compra.toString() : '');
      setPrecioActual(assetToEdit.precio_actual !== undefined ? assetToEdit.precio_actual.toString() : '');
      setRentabilidadAnual(assetToEdit.rentabilidad_esperada_anual !== undefined ? assetToEdit.rentabilidad_esperada_anual.toString() : '');
      setMoneda((assetToEdit.moneda as 'ARS' | 'USD') || 'ARS');
      setBrokerId(assetToEdit.broker?.id || '');
    } else {
      resetForm();
    }
  }, [assetToEdit, isOpen]);

  const { data: brokers = [] } = useQuery({
    queryKey: ['brokers'],
    queryFn: () => finanzasApi.getBrokers(),
    enabled: isOpen,
  });

  const saveAssetMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      if (!ticker.trim()) {
        throw new Error('El ticker o código es obligatorio (ej. SPY, COCOS_MM).');
      }
      if (!nombre.trim()) {
        throw new Error('El nombre del título/fondo es obligatorio (ej. Cocos Pesos Plus).');
      }

      const parsedCantidad = parseFloat(cantidad) || 0;
      const parsedPrecioCompra = parseFloat(precioCompra) || 0;
      const parsedPrecioActual = parseFloat(precioActual) || parsedPrecioCompra || 0;
      const parsedRentabilidad = parseFloat(rentabilidadAnual) || 0;

      if (assetToEdit) {
        return finanzasApi.updateInvestmentAsset(assetToEdit.id, {
          ticker: ticker.trim().toUpperCase(),
          nombre: nombre.trim(),
          tipo,
          cantidad: parsedCantidad,
          precio_compra: parsedPrecioCompra,
          precio_actual: parsedPrecioActual,
          rentabilidad_esperada_anual: parsedRentabilidad,
          moneda,
          broker_id: brokerId ? brokerId : null,
        });
      }

      return finanzasApi.createInvestmentAsset({
        ticker: ticker.trim().toUpperCase(),
        nombre: nombre.trim(),
        tipo,
        cantidad: parsedCantidad,
        precio_compra: parsedPrecioCompra,
        precio_actual: parsedPrecioActual,
        rentabilidad_esperada_anual: parsedRentabilidad,
        moneda,
        broker_id: brokerId ? brokerId : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-assets'] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Error al guardar el título/fondo.');
    },
  });

  const resetForm = () => {
    setTicker('');
    setNombre('');
    setTipo('FCI_ARS');
    setCantidad('');
    setPrecioCompra('');
    setPrecioActual('');
    setRentabilidadAnual('');
    setMoneda('ARS');
    setBrokerId('');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveAssetMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white">
              {assetToEdit ? 'Editar Título / Fondo' : 'Registrar Título / Fondo (FCI)'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Ticker / Código
              </label>
              <input
                type="text"
                required
                placeholder="Ej: SPY, COCOS_MM"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Moneda
              </label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as 'ARS' | 'USD')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="ARS">ARS ($)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Nombre del Título / Fondo FCI
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Cocos Pesos Plus, S&P 500 ETF, Galicia FIMA"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Tipo de Instrumento
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="FCI_ARS">FCI Pesos (Money Market / T+1)</option>
                <option value="FCI_USD">FCI Dólares</option>
                <option value="CEDEAR">CEDEAR (ETF / Acción)</option>
                <option value="ACCION">Acción Local</option>
                <option value="CRYPTO">Criptoactivo (Staking / Yield)</option>
                <option value="BONO">Bono / Título Público</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Plataforma (Opcional)
              </label>
              <select
                value={brokerId}
                onChange={(e) => setBrokerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="">-- Sin Vincular --</option>
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Cantidad / Cuotapartes
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="1000"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Precio Actual ($)
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="1.50"
                value={precioActual}
                onChange={(e) => setPrecioActual(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Expected Return % Field (Requirement 4) */}
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
            <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Rentabilidad Esperada / TNA / TEA (%)
            </label>
            <p className="text-[11px] text-slate-400">
              Ingresa la tasa estimada anual esperada para calcular las ganancias futuras proyectadas.
            </p>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="Ej: 35.0 (para 35% TNA)"
                value={rentabilidadAnual}
                onChange={(e) => setRentabilidadAnual(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
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
              disabled={saveAssetMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
            >
              {saveAssetMutation.isPending ? 'Guardando...' : assetToEdit ? 'Guardar Cambios' : 'Guardar Título'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
