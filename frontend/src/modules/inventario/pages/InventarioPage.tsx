import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventarioApi } from '@/services/api';
import { Package, Plus, Search, AlertTriangle, Minus, MapPin, X, CheckCircle2 } from 'lucide-react';

export const InventarioPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [isAddItemOpen, setIsAddItemOpen] = useState<boolean>(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState<boolean>(false);

  // New Item State
  const [nombreItem, setNombreItem] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [stockActual, setStockActual] = useState<string>('1.00');
  const [stockMinimo, setStockMinimo] = useState<string>('1.00');
  const [unidadMedida, setUnidadMedida] = useState<string>('unidades');

  // New Location State
  const [nombreLocation, setNombreLocation] = useState<string>('');
  const [descripcionLocation, setDescripcionLocation] = useState<string>('');

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => inventarioApi.getLocations(),
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory-items', selectedLocation],
    queryFn: () => inventarioApi.getItems(selectedLocation || undefined),
  });

  const adjustStockMutation = useMutation({
    mutationFn: ({ id, cambio }: { id: string; cambio: number }) =>
      inventarioApi.adjustStock(id, cambio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: () =>
      inventarioApi.createLocation({ nombre: nombreLocation, descripcion: descripcionLocation }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setIsAddLocationOpen(false);
      setNombreLocation('');
      setDescripcionLocation('');
    },
  });

  const createItemMutation = useMutation({
    mutationFn: () => {
      const current = parseFloat(stockActual) || 0;
      const min = parseFloat(stockMinimo) || 0;
      return inventarioApi.createItem({
        nombre: nombreItem,
        location_id: locationId || undefined,
        stock_actual: current,
        stock_minimo: min,
        unidad_medida: unidadMedida,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setIsAddItemOpen(false);
      setNombreItem('');
      setStockActual('1.00');
      setStockMinimo('1.00');
    },
  });

  const filteredItems = items.filter((item) =>
    item.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-400" /> Control de Inventario del Hogar
          </h2>
          <p className="text-xs text-slate-400">Despensa, artículos de limpieza y stock mínimo en tiempo real</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddLocationOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Ubicación</span>
          </button>
          <button
            onClick={() => setIsAddItemOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Producto</span>
          </button>
        </div>
      </div>

      {/* Search & Location Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre (ej. Detergente, Arroz, Leche)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">-- Todas las Ubicaciones --</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                📍 {loc.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Cargando inventario...</div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isLow = item.stock_actual <= item.stock_minimo;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-3xl border transition space-y-3 ${
                  isLow
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">{item.nombre}</h4>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {item.location?.nombre || 'Sin ubicación'}
                    </span>
                  </div>

                  {isLow ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-bold border border-rose-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Stock Bajo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30">
                      OK
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <div>
                    <div className="text-lg font-black font-mono text-white">
                      {item.stock_actual}{' '}
                      <span className="text-xs font-normal text-slate-400">{item.unidad_medida}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Mínimo: {item.stock_minimo}</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => adjustStockMutation.mutate({ id: item.id, cambio: -1 })}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => adjustStockMutation.mutate({ id: item.id, cambio: 1 })}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
          <Package className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">No hay productos en el inventario.</p>
          <button
            onClick={() => setIsAddItemOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            + Crear primer producto
          </button>
        </div>
      )}

      {/* Modal Add Location */}
      {isAddLocationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Nueva Ubicación Física</h3>
              <button onClick={() => setIsAddLocationOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createLocationMutation.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Despensa Cocina, Bajo Mesada"
                  value={nombreLocation}
                  onChange={(e) => setNombreLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder="Ej. Estante de alimentos secos"
                  value={descripcionLocation}
                  onChange={(e) => setDescripcionLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddLocationOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLocationMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Item */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Agregar Producto a Inventario</h3>
              <button onClick={() => setIsAddItemOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createItemMutation.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Detergente Ala 750ml, Arroz Lucchetti 1kg"
                  value={nombreItem}
                  onChange={(e) => setNombreItem(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ubicación Física</label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="">-- Sin Ubicación Asignada --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      📍 {loc.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stock Actual</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={stockActual}
                    onChange={(e) => setStockActual(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Unidad</label>
                  <input
                    type="text"
                    required
                    value={unidadMedida}
                    onChange={(e) => setUnidadMedida(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createItemMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
