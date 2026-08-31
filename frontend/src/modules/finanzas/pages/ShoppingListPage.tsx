import React, { useState } from 'react';
import { ShoppingBag, Plus, Percent, Check, ArrowRight } from 'lucide-react';

interface ShoppingItem {
  id: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  descuentoEspecifico?: number;
  comprado: boolean;
}

export const ShoppingListPage: React.FC = () => {
  const [globalDiscount, setGlobalDiscount] = useState<number>(20); // 20% default discount for the whole cart
  const [items, setItems] = useState<ShoppingItem[]>([
    { id: '1', nombre: 'Leche Descremada x 3', precioUnitario: 1400, cantidad: 3, comprado: true },
    { id: '2', nombre: 'Queso Crema Finlandia', precioUnitario: 3200, cantidad: 1, descuentoEspecifico: 15, comprado: false },
    { id: '3', nombre: 'Café molido 500g', precioUnitario: 8900, cantidad: 1, comprado: false },
    { id: '4', nombre: 'Detergente para platos', precioUnitario: 2400, cantidad: 2, comprado: false },
  ]);

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, comprado: !item.comprado } : item)));
  };

  const calculateItemTotal = (item: ShoppingItem) => {
    const discount = item.descuentoEspecifico !== undefined ? item.descuentoEspecifico : globalDiscount;
    const baseTotal = item.precioUnitario * item.cantidad;
    return baseTotal * (1 - discount / 100);
  };

  const totalCart = items.reduce((acc, item) => acc + calculateItemTotal(item), 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-400" /> Lista de Supermercado
          </h2>
          <p className="text-xs text-slate-400">Lista colaborativa con descuentos en vivo y división 50/50</p>
        </div>
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
            onClick={() => alert('Modal para agregar ítem')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Ítem
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const appliedDiscount = item.descuentoEspecifico !== undefined ? item.descuentoEspecifico : globalDiscount;
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
                      Cant: {item.cantidad} x ${item.precioUnitario.toLocaleString()}
                      {item.descuentoEspecifico !== undefined && (
                        <span className="ml-1 text-pink-400 font-semibold">(Desc. {item.descuentoEspecifico}%)</span>
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
          onClick={() => alert('Compra finalizada: Gasto 50/50 creado en Finanzas')}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
        >
          <span>Finalizar Compra</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
