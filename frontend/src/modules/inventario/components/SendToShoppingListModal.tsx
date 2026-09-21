import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventarioApi } from '@/services/api';
import { InventoryItem } from '@/types';
import { X, ShoppingCart, CheckCircle2, AlertCircle, Plus, Minus } from 'lucide-react';

interface SendToShoppingListModalProps {
  items: InventoryItem[];
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemSelectionState {
  [itemId: string]: {
    selected: boolean;
    nombre: string;
    cantidad: number;
    stock_actual: number;
    stock_minimo: number;
    unidad_medida: string;
  };
}

export const SendToShoppingListModal: React.FC<SendToShoppingListModalProps> = ({
  items,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Initialize selection state: pre-select items with low stock or all low-stock items if passed
  const [selection, setSelection] = useState<ItemSelectionState>(() => {
    const initialState: ItemSelectionState = {};
    items.forEach((item) => {
      // Quantity defaults to stock_minimo (at least 1)
      const qty = Math.max(1, Math.ceil(item.stock_minimo));
      initialState[item.id] = {
        selected: item.stock_actual <= item.stock_minimo,
        nombre: item.nombre,
        cantidad: qty,
        stock_actual: item.stock_actual,
        stock_minimo: item.stock_minimo,
        unidad_medida: item.unidad_medida,
      };
    });
    return initialState;
  });

  const [shoppingListName, setShoppingListName] = useState<string>('Lista de Compras Automática');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelection((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        selected: !prev[id].selected,
      },
    }));
  };

  const updateQuantity = (id: string, delta: number) => {
    setSelection((prev) => {
      const current = prev[id].cantidad;
      const next = Math.max(1, current + delta);
      return {
        ...prev,
        [id]: {
          ...prev[id],
          cantidad: next,
        },
      };
    });
  };

  const setExactQuantity = (id: string, value: number) => {
    const next = Math.max(1, value || 1);
    setSelection((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        cantidad: next,
      },
    }));
  };

  const sendMutation = useMutation({
    mutationFn: () => {
      const selectedItems = Object.entries(selection)
        .filter(([, val]) => val.selected)
        .map(([id, val]) => ({
          item_id: id,
          nombre: val.nombre,
          cantidad: val.cantidad,
        }));

      if (selectedItems.length === 0) {
        throw new Error('Debe seleccionar al menos un producto para enviar.');
      }

      return inventarioApi.sendToShoppingList({
        shopping_list_name: shoppingListName || undefined,
        items: selectedItems,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Error al enviar faltantes a la lista de compras.');
    },
  });

  const selectedCount = Object.values(selection).filter((s) => s.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" /> Enviar Faltantes a Lista de Compras
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Selecciona los productos y ajusta la cantidad a comprar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Shopping list target input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Nombre de la Lista de Compras</label>
          <input
            type="text"
            value={shoppingListName}
            onChange={(e) => setShoppingListName(e.target.value)}
            placeholder="Ej. Supermercado Semana 3"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {items.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No hay productos con stock bajo o disponibles.
            </div>
          ) : (
            items.map((item) => {
              const sel = selection[item.id];
              if (!sel) return null;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    sel.selected
                      ? 'bg-slate-950 border-emerald-500/40'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={sel.selected}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-900 cursor-pointer"
                    />
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-white truncate">{item.nombre}</h4>
                      <p className="text-[10px] text-slate-400">
                        Stock: <span className="text-slate-200 font-mono">{item.stock_actual}</span> / Mín:{' '}
                        <span className="text-slate-200 font-mono">{item.stock_minimo}</span>{' '}
                        {item.unidad_medida}
                      </p>
                    </div>
                  </div>

                  {sel.selected && (
                    <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={sel.cantidad}
                        onChange={(e) => setExactQuantity(item.id, parseInt(e.target.value))}
                        className="w-12 text-center bg-slate-950 border border-slate-800 text-xs text-white font-mono font-bold rounded py-0.5"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            <strong className="text-white font-mono">{selectedCount}</strong> productos seleccionados
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => sendMutation.mutate()}
              disabled={selectedCount === 0 || sendMutation.isPending}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{sendMutation.isPending ? 'Enviando...' : 'Agregar a Lista'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
