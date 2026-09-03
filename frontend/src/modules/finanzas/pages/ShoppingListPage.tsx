import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { finanzasApi, inventarioApi } from '@/services/api';
import { ShoppingBag, Plus, Percent, Check, ArrowRight, Sparkles, X } from 'lucide-react';
import { ShoppingItem } from '@/types';

export const ShoppingListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [globalDiscount, setGlobalDiscount] = useState<number>(20);
  const [isAddItemOpen, setIsAddItemOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  // Form State for Add Item
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<string>('');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemDiscount, setNewItemDiscount] = useState<string>('');

  // Form State for Checkout
  const [checkoutAccountId, setCheckoutAccountId] = useState<string>('');
  const [checkoutCategoryId, setCheckoutCategoryId] = useState<string>('');

  const defaultItems: ShoppingItem[] = [
    { id: '1', list_id: 'list-1', nombre: 'Leche Descremada x 3', precio_unitario: 1400, cantidad: 3, descuento_especifico_porcentaje: null, descuento_aplicado_porcentaje: 20, precio_final_calculado: 3360, comprado: true },
    { id: '2', list_id: 'list-1', nombre: 'Queso Crema Finlandia', precio_unitario: 3200, cantidad: 1, descuento_especifico_porcentaje: 15, descuento_aplicado_porcentaje: 15, precio_final_calculado: 2720, comprado: false },
    { id: '3', list_id: 'list-1', nombre: 'Café molido 500g', precio_unitario: 8900, cantidad: 1, descuento_especifico_porcentaje: null, descuento_aplicado_porcentaje: 20, precio_final_calculado: 7120, comprado: false },
    { id: '4', list_id: 'list-1', nombre: 'Detergente para platos', precio_unitario: 2400, cantidad: 2, descuento_especifico_porcentaje: null, descuento_aplicado_porcentaje: 20, precio_final_calculado: 3840, comprado: false },
  ];

  const [items, setItems] = useState<ShoppingItem[]>(defaultItems);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => finanzasApi.getAccounts(false),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => finanzasApi.getCategories(),
  });

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, comprado: !item.comprado } : item))
    );
  };

  const calculateItemTotal = (item: ShoppingItem) => {
    const discount =
      item.descuento_especifico_porcentaje !== null && item.descuento_especifico_porcentaje !== undefined
        ? item.descuento_especifico_porcentaje
        : globalDiscount;
    const baseTotal = item.precio_unitario * item.cantidad;
    return baseTotal * (1 - discount / 100);
  };

  const totalCart = items.reduce((acc, item) => acc + calculateItemTotal(item), 0);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    const price = parseFloat(newItemPrice) || 0;
    const disc = newItemDiscount !== '' ? parseFloat(newItemDiscount) : null;

    const newItemObj: ShoppingItem = {
      id: Date.now().toString(),
      list_id: 'list-1',
      nombre: newItemName,
      precio_unitario: price,
      cantidad: newItemQty,
      descuento_especifico_porcentaje: disc,
      descuento_aplicado_porcentaje: disc !== null ? disc : globalDiscount,
      precio_final_calculado: (price * newItemQty) * (1 - (disc !== null ? disc : globalDiscount) / 100),
      comprado: false,
    };

    setItems((prev) => [...prev, newItemObj]);
    setIsAddItemOpen(false);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty(1);
    setNewItemDiscount('');
  };

  const suggestLowStockItems = async () => {
    try {
      const lowStockList = await inventarioApi.getLowStock();
      if (lowStockList.length === 0) {
        alert('¡No hay productos con stock bajo en el inventario!');
        return;
      }

      const importedItems: ShoppingItem[] = lowStockList.map((item, idx) => ({
        id: `imported-${item.id}-${idx}`,
        list_id: 'list-1',
        nombre: `${item.nombre} (Stock Bajo)`,
        precio_unitario: 1000,
        cantidad: Math.max(1, Math.ceil(item.stock_minimo - item.stock_actual)),
        descuento_especifico_porcentaje: null,
        descuento_aplicado_porcentaje: globalDiscount,
        precio_final_calculado: 1000 * (1 - globalDiscount / 100),
        comprado: false,
      }));

      setItems((prev) => [...prev, ...importedItems]);
    } catch {
      // Fallback if backend items not created yet
      const fallbackSuggested: ShoppingItem[] = [
        { id: 's1', list_id: 'list-1', nombre: 'Papel Higiénico 4u (Stock Bajo)', precio_unitario: 2900, cantidad: 1, descuento_especifico_porcentaje: null, descuento_aplicado_porcentaje: globalDiscount, precio_final_calculado: 2320, comprado: false },
        { id: 's2', list_id: 'list-1', nombre: 'Jabón de Ropa 3L (Stock Bajo)', precio_unitario: 6500, cantidad: 1, descuento_especifico_porcentaje: 10, descuento_aplicado_porcentaje: 10, precio_final_calculado: 5850, comprado: false },
      ];
      setItems((prev) => [...prev, ...fallbackSuggested]);
    }
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!checkoutAccountId) throw new Error('Selecciona la cuenta pagadora');
      if (!checkoutCategoryId) throw new Error('Selecciona una categoría');

      return finanzasApi.createSplitTransaction({
        account_id: checkoutAccountId,
        category_id: checkoutCategoryId,
        monto: totalCart,
        descripcion: 'Compra de Supermercado (Checkout 50/50)',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setIsCheckoutOpen(false);
      alert('¡Compra finalizada exitosamente! Se ha registrado el gasto compartido 50/50.');
    },
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-400" /> Lista de Supermercado
          </h2>
          <p className="text-xs text-slate-400">Lista colaborativa con descuentos en vivo y división 50/50</p>
        </div>

        <button
          onClick={suggestLowStockItems}
          className="px-3.5 py-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 text-xs font-semibold flex items-center gap-2 transition"
        >
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>Sugerir por Stock Bajo</span>
        </button>
      </div>

      {/* Global Discount Input */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Descuento Base del Carrito</h4>
            <p className="text-[10px] text-slate-400">Aplica a todos los ítems sin descuento propio (ej. banco del día)</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="0"
            max="100"
            value={globalDiscount}
            onChange={(e) => setGlobalDiscount(Number(e.target.value))}
            className="w-16 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-center font-bold text-white"
          />
          <span className="text-xs font-semibold text-slate-400">%</span>
        </div>
      </div>

      {/* Items List */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300">Ítems ({items.length})</span>
          <button
            onClick={() => setIsAddItemOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Ítem
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const appliedDiscount =
              item.descuento_especifico_porcentaje !== null && item.descuento_especifico_porcentaje !== undefined
                ? item.descuento_especifico_porcentaje
                : globalDiscount;
            const finalPrice = calculateItemTotal(item);

            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                  item.comprado
                    ? 'bg-slate-950/40 border-slate-800/40 text-slate-500 line-through'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border transition ${
                      item.comprado
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {item.comprado && <Check className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium">{item.nombre}</p>
                    <p className="text-[10px] text-slate-400">
                      Cant: {item.cantidad} x ${item.precio_unitario.toLocaleString()}
                      {item.descuento_especifico_porcentaje !== null && item.descuento_especifico_porcentaje !== undefined && (
                        <span className="ml-1 text-pink-400 font-semibold">(Desc. {item.descuento_especifico_porcentaje}%)</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-white">
                    ${finalPrice.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
                  </span>
                  <span className="block text-[9px] text-emerald-400 font-mono">
                    -{appliedDiscount}% apl.
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout Box */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-400">Total a Pagar (con descuentos):</span>
          <div className="text-2xl font-black text-white font-mono">
            ${totalCart.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
          </div>
          <span className="text-[11px] text-slate-400">
            División 50/50: <strong>${(totalCart / 2).toLocaleString('es-AR', { minimumFractionDigits: 1 })}</strong> cada uno
          </span>
        </div>

        <button
          onClick={() => setIsCheckoutOpen(true)}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
        >
          <span>Finalizar Compra</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Modal Add Item */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Agregar Producto</h3>
              <button onClick={() => setIsAddItemOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Manteca 200g"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Precio Unitario ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descuento Específico (%) - Opcional
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Heredar del carrito"
                  value={newItemDiscount}
                  onChange={(e) => setNewItemDiscount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
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
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Checkout */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Finalizar Compra</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Total neto a pagar: <strong className="text-white font-mono">${totalCart.toLocaleString('es-AR')} ARS</strong> (división 50/50).
            </p>

            {checkoutMutation.isError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs">
                {(checkoutMutation.error as Error).message}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                checkoutMutation.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cuenta Pagadora</label>
                <select
                  required
                  value={checkoutAccountId}
                  onChange={(e) => setCheckoutAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="">-- Seleccionar Cuenta --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nombre} (${acc.saldo_actual.toLocaleString('es-AR')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
                <select
                  required
                  value={checkoutCategoryId}
                  onChange={(e) => setCheckoutCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="">-- Seleccionar Categoría --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={checkoutMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  {checkoutMutation.isPending ? 'Procesando...' : 'Confirmar Checkout 50/50'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
