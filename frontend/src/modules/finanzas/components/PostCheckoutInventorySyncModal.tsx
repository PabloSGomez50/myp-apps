import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { finanzasApi, inventarioApi } from '@/services/api';
import { ShoppingItem, PostCheckoutSyncItem } from '@/types';
import { X, PackageCheck, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shoppingItems: ShoppingItem[];
}

export const PostCheckoutInventorySyncModal: React.FC<Props> = ({
  isOpen,
  onClose,
  shoppingItems,
}) => {
  const queryClient = useQueryClient();

  // Queries for locations and existing inventory items
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => inventarioApi.getLocations(),
    enabled: isOpen,
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => inventarioApi.getItems(),
    enabled: isOpen,
  });

  // Local state mapping item.id -> sync config
  const [syncConfig, setSyncConfig] = useState<
    Record<
      string,
      {
        selected: boolean;
        inventory_item_id: string | null;
        create_new: boolean;
        nombre_item: string;
        cantidad: number;
        ubicacion_id: string | null;
        stock_minimo: number;
      }
    >
  >({});

  // Initialize syncConfig whenever shoppingItems change
  useEffect(() => {
    if (!isOpen || shoppingItems.length === 0) return;

    const initialMap: typeof syncConfig = {};

    shoppingItems.forEach((item) => {
      // Check if there is an existing inventory item matching by name or inventory_item_id
      const match = inventoryItems.find(
        (inv) =>
          inv.id === item.inventory_item_id ||
          inv.nombre.toLowerCase().trim() === item.nombre.toLowerCase().trim()
      );

      initialMap[item.id] = {
        selected: true,
        inventory_item_id: match ? match.id : null,
        create_new: !match,
        nombre_item: item.nombre,
        cantidad: item.cantidad || 1,
        ubicacion_id: match?.location_id || (locations[0]?.id ?? null),
        stock_minimo: match ? Number(match.stock_minimo) : 1,
      };
    });

    setSyncConfig(initialMap);
  }, [isOpen, shoppingItems, inventoryItems, locations]);

  const syncMutation = useMutation({
    mutationFn: (payload: { items: PostCheckoutSyncItem[] }) =>
      finanzasApi.postCheckoutSyncInventory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
      onClose();
    },
  });

  const toggleSelect = (itemId: string) => {
    setSyncConfig((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId]?.selected },
    }));
  };

  const updateItemConfig = (
    itemId: string,
    field: string,
    value: any
  ) => {
    setSyncConfig((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const handleSyncSubmit = () => {
    const selectedItems = Object.entries(syncConfig)
      .filter(([_, conf]) => conf.selected)
      .map(([shopping_item_id, conf]) => ({
        shopping_item_id,
        inventory_item_id: conf.create_new ? null : conf.inventory_item_id,
        create_new: conf.create_new,
        nombre_item: conf.nombre_item,
        cantidad: conf.cantidad,
        ubicacion_id: conf.ubicacion_id,
        stock_minimo: conf.stock_minimo,
      }));

    if (selectedItems.length === 0) {
      onClose();
      return;
    }

    syncMutation.mutate({ items: selectedItems });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">¡Compra Finalizada! Sincronizar Stock</h2>
              <p className="text-xs text-slate-400">
                Selecciona qué productos comprados deseas ingresar al stock del hogar
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

        {/* Content Items List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-6">
          {shoppingItems.map((item) => {
            const conf = syncConfig[item.id] || {
              selected: true,
              inventory_item_id: null,
              create_new: true,
              nombre_item: item.nombre,
              cantidad: item.cantidad,
              ubicacion_id: locations[0]?.id ?? null,
              stock_minimo: 1,
            };

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-colors ${
                  conf.selected
                    ? 'bg-slate-950/80 border-slate-700'
                    : 'bg-slate-950/30 border-slate-800/50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conf.selected}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-white text-base">{item.nombre}</span>
                  </label>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Comprado: <strong className="text-slate-200">{item.cantidad} un.</strong></span>
                  </div>
                </div>

                {conf.selected && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60 text-xs">
                    {/* Action Mode Toggle: Match vs Create */}
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Destino de Stock</label>
                      <select
                        value={conf.create_new ? 'CREATE_NEW' : conf.inventory_item_id || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'CREATE_NEW') {
                            updateItemConfig(item.id, 'create_new', true);
                            updateItemConfig(item.id, 'inventory_item_id', null);
                          } else {
                            updateItemConfig(item.id, 'create_new', false);
                            updateItemConfig(item.id, 'inventory_item_id', val);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="CREATE_NEW">➕ Crear producto nuevo</option>
                        {inventoryItems.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            📦 {inv.nombre} (Stock: {inv.stock_actual})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity to Add */}
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Sumar a Stock (Cant)</label>
                      <input
                        type="number"
                        min="1"
                        value={conf.cantidad}
                        onChange={(e) =>
                          updateItemConfig(item.id, 'cantidad', parseInt(e.target.value) || 1)
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                      />
                    </div>

                    {/* Location Selection if creating new or editing */}
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Ubicación Física</label>
                      <select
                        value={conf.ubicacion_id || ''}
                        onChange={(e) =>
                          updateItemConfig(item.id, 'ubicacion_id', e.target.value || null)
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="">Sin ubicación</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-sm transition-colors cursor-pointer"
          >
            Omitir Sincronización
          </button>

          <button
            type="button"
            onClick={handleSyncSubmit}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition-colors shadow-lg disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Sincronizar Stock en Inventario
          </button>
        </div>
      </div>
    </div>
  );
};
