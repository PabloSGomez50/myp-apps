import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import { X, TrendingDown, Search, Store } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PriceHistoryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { data: priceHistory = [], isLoading } = useQuery({
    queryKey: ['food-price-history', searchTerm],
    queryFn: () => finanzasApi.getFoodPriceHistory(searchTerm || undefined),
    enabled: isOpen,
  });

  // Filtered and sorted data
  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) return priceHistory;
    return priceHistory.filter((item) =>
      item.item_nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [priceHistory, searchTerm]);

  // Calculated Stats if searching for a specific item
  const stats = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const prices = filteredHistory.map((h) => Number(h.precio_efectivo));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const latest = prices[0];
    return { min, max, avg, latest };
  }, [filteredHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Histórico de Precios de Alimentos</h2>
              <p className="text-xs text-slate-400">
                Registro evolutivo de precios pagados por producto en compras anteriores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por producto (ej. Arroz, Aceite, Leche...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Summary Stats Cards if search term has results */}
        {searchTerm.trim() && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Último Precio</span>
              <div className="text-lg font-bold text-white mt-0.5">
                ${stats.latest.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-emerald-400 font-medium">Mínimo Histórico</span>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">
                ${stats.min.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-amber-400 font-medium">Máximo Histórico</span>
              <div className="text-lg font-bold text-amber-400 mt-0.5">
                ${stats.max.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-blue-400 font-medium">Promedio Registrado</span>
              <div className="text-lg font-bold text-blue-400 mt-0.5">
                ${stats.avg.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}

        {/* Price History Table */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60">
          {isLoading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Cargando histórico de precios...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No se encontraron registros de precios para esta búsqueda.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/80 sticky top-0 backdrop-blur-xs">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Comercio</th>
                  <th className="px-4 py-3 text-right">Precio Lista</th>
                  <th className="px-4 py-3 text-center">Descuento</th>
                  <th className="px-4 py-3 text-right">Precio Efectivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(item.fecha).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{item.item_nombre}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {item.supermarket ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                          <Store className="w-3.5 h-3.5 text-emerald-400" />
                          {item.supermarket.nombre}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Sin comercio</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 font-mono text-xs">
                      ${Number(item.precio_unitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {Number(item.descuento_aplicado) > 0 ? (
                        <span className="inline-block bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded border border-emerald-500/20">
                          -{Number(item.descuento_aplicado)}%
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-400 font-mono">
                      ${Number(item.precio_efectivo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
