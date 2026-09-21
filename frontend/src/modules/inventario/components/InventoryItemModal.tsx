import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventarioApi } from '@/services/api';
import { InventoryItem, Location, InventoryCategory } from '@/types';
import { X, Package, CheckCircle2 } from 'lucide-react';

interface InventoryItemModalProps {
  item?: InventoryItem | null;
  locations: Location[];
  categories: InventoryCategory[];
  onClose: () => void;
}

export const InventoryItemModal: React.FC<InventoryItemModalProps> = ({
  item,
  locations,
  categories,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [stockActual, setStockActual] = useState<string>('1.00');
  const [stockMinimo, setStockMinimo] = useState<string>('1.00');
  const [unidadMedida, setUnidadMedida] = useState<string>('unidades');
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('');

  useEffect(() => {
    if (item) {
      setNombre(item.nombre);
      setLocationId(item.location_id || '');
      setCategoryId(item.category_id || '');
      setStockActual(String(item.stock_actual));
      setStockMinimo(String(item.stock_minimo));
      setUnidadMedida(item.unidad_medida || 'unidades');
      setFechaVencimiento(item.fecha_vencimiento || '');
    } else {
      setNombre('');
      setLocationId('');
      setCategoryId('');
      setStockActual('1.00');
      setStockMinimo('1.00');
      setUnidadMedida('unidades');
      setFechaVencimiento('');
    }
  }, [item]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const cur = parseFloat(stockActual) || 0;
      const min = parseFloat(stockMinimo) || 0;

      if (item) {
        return inventarioApi.updateItem(item.id, {
          nombre,
          location_id: locationId || null,
          category_id: categoryId || null,
          stock_actual: cur,
          stock_minimo: min,
          unidad_medida: unidadMedida,
          fecha_vencimiento: fechaVencimiento || null,
        });
      } else {
        return inventarioApi.createItem({
          nombre,
          location_id: locationId || undefined,
          category_id: categoryId || undefined,
          stock_actual: cur,
          stock_minimo: min,
          unidad_medida: unidadMedida,
          fecha_vencimiento: fechaVencimiento || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            {item ? 'Editar Producto de Inventario' : 'Agregar Producto a Inventario'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Producto</label>
            <input
              type="text"
              required
              placeholder="Ej. Detergente Ala 750ml, Arroz Lucchetti 1kg"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Ubicación Física</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Sin Ubicación --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    📍 {loc.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Sin Categoría --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    🏷️ {cat.nombre}
                  </option>
                ))}
              </select>
            </div>
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unidad</label>
              <input
                type="text"
                required
                placeholder="unidades, kg, l"
                value={unidadMedida}
                onChange={(e) => setUnidadMedida(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Fecha de Vencimiento (Opcional)
            </label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveMutation.isPending ? 'Guardando...' : 'Guardar Producto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
