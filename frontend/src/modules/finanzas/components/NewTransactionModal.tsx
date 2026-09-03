import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { X, Plus, Calendar, UserCheck, Tag, Check, DollarSign } from 'lucide-react';
import { ExpenseType } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewTransactionModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { user, householdMembers } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState<string>(todayStr);
  const [selectedUserId, setSelectedUserId] = useState<string>(user?.id || '');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [esCompartido, setEsCompartido] = useState<boolean>(true);

  // Quick New Category Inline Form State
  const [showAddCatInline, setShowAddCatInline] = useState<boolean>(false);
  const [catNombre, setCatNombre] = useState<string>('');
  const [catTipoGasto, setCatTipoGasto] = useState<ExpenseType>('VARIABLE_HOUSEHOLD');
  const [catColor, setCatColor] = useState<string>('emerald');

  // Queries
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => finanzasApi.getAccounts(false),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => finanzasApi.getCategories(),
  });

  // Mutations
  const createTxMutation = useMutation({
    mutationFn: async () => {
      const montoNum = parseFloat(monto);
      if (isNaN(montoNum) || montoNum <= 0) {
        throw new Error('Ingresa un monto válido mayor a 0');
      }
      if (!selectedCategoryId) {
        throw new Error('Selecciona una categoría para el gasto');
      }

      const isoFecha = new Date(fecha).toISOString();

      if (esCompartido) {
        return finanzasApi.createSplitTransaction({
          user_id: selectedUserId || user?.id,
          account_id: selectedAccountId || undefined,
          category_id: selectedCategoryId,
          monto: montoNum,
          descripcion,
          fecha: isoFecha,
        });
      } else {
        return finanzasApi.createTransaction({
          user_id: selectedUserId || user?.id,
          account_id: selectedAccountId || undefined,
          category_id: selectedCategoryId,
          monto: montoNum,
          es_compartido: false,
          descripcion,
          fecha: isoFecha,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      onClose();
      resetForm();
    },
  });

  const createCatMutation = useMutation({
    mutationFn: async () => {
      if (!catNombre) throw new Error('Ingresa el nombre de la categoría');
      return finanzasApi.createCategory({
        nombre: catNombre,
        tipo_gasto: catTipoGasto,
        color: catColor,
      });
    },
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setSelectedCategoryId(newCat.id);
      setShowAddCatInline(false);
      setCatNombre('');
    },
  });

  const resetForm = () => {
    setFecha(todayStr);
    setSelectedUserId(user?.id || '');
    setSelectedAccountId('');
    setSelectedCategoryId('');
    setMonto('');
    setDescripcion('');
    setEsCompartido(true);
    setShowAddCatInline(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Nuevo Movimiento</h3>
              <p className="text-xs text-slate-400">Registrar gasto compartido 50/50 o personal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createTxMutation.isError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {(createTxMutation.error as Error).message}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTxMutation.mutate();
          }}
          className="space-y-4"
        >
          {/* Row 1: Fecha & Monto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Fecha del Gasto
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Monto ($ ARS)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Row 2: Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción / Concepto</label>
            <input
              type="text"
              required
              placeholder="Ej. Coto, Rapanui, Edesur, Nafta"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Section: ¿Quién realizó el pago? (User Selector Grid) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> ¿Quién realizó el pago?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {householdMembers.map((m) => {
                const isSelected = selectedUserId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(m.id);
                      setSelectedAccountId('');
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs"
                      style={{ backgroundColor: m.color_avatar }}
                    >
                      {m.nombre[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{m.nombre}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                  </button>
                );
              })}
            </div>

            {/* Optional Account Selector Dropdown */}
            {accounts.length > 0 && (
              <div className="mt-2">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 focus:outline-none"
                >
                  <option value="">-- Opcional: Seleccionar cuenta bancaria o billetera --</option>
                  {accounts
                    .filter((a) => !selectedUserId || a.user_id === selectedUserId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        💳 {a.nombre} (${a.saldo_actual.toLocaleString('es-AR')})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Section: Categorías (Grid Responsive + Inline Create) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-emerald-400" /> Categoría de Gasto
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between gap-1 transition ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {cat.tipo_gasto === 'LEISURE_COUPLE' ? 'Ocio' : cat.tipo_gasto.includes('HOUSEHOLD') ? 'Hogar' : 'Personal'}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-xs font-semibold truncate">{cat.nombre}</p>
                  </button>
                );
              })}

              {/* Inline Add Category Pill Button */}
              <button
                type="button"
                onClick={() => setShowAddCatInline(!showAddCatInline)}
                className="p-2.5 rounded-2xl border border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/60 text-emerald-400 flex flex-col items-center justify-center gap-1 transition text-xs font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nueva</span>
              </button>
            </div>

            {/* Inline Add Category Form */}
            {showAddCatInline && (
              <div className="mt-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">Crear Nueva Categoría</h4>
                  <button type="button" onClick={() => setShowAddCatInline(false)} className="text-slate-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre (ej. Delivery, Farmacia)"
                    value={catNombre}
                    onChange={(e) => setCatNombre(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />

                  <select
                    value={catTipoGasto}
                    onChange={(e) => setCatTipoGasto(e.target.value as ExpenseType)}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="VARIABLE_HOUSEHOLD">Hogar Variable (Comida/Insumos)</option>
                    <option value="LEISURE_COUPLE">Ocio y Salidas de Pareja</option>
                    <option value="FIXED_HOUSEHOLD">Hogar Fijo (Servicios/Alquiler)</option>
                    <option value="VARIABLE_PERSONAL">Personal Variable</option>
                    <option value="FIXED_PERSONAL">Personal Fijo</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium">Color:</span>
                  {['emerald', 'indigo', 'rose', 'amber', 'sky'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatColor(c)}
                      className={`w-5 h-5 rounded-full border transition ${
                        catColor === c ? 'border-white scale-110' : 'border-transparent opacity-60'
                      }`}
                      style={{
                        backgroundColor:
                          c === 'emerald'
                            ? '#10b981'
                            : c === 'indigo'
                            ? '#6366f1'
                            : c === 'rose'
                            ? '#f43f5e'
                            : c === 'amber'
                            ? '#f59e0b'
                            : '#0ea5e9',
                      }}
                    />
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCatInline(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={createCatMutation.isPending}
                    onClick={() => createCatMutation.mutate()}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                  >
                    {createCatMutation.isPending ? 'Guardando...' : 'Crear y Seleccionar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section: Split 50/50 Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-white">Gasto Compartido 50/50</span>
              <p className="text-[10px] text-slate-400">Dividir por mitad y actualizar balance neto de pareja</p>
            </div>
            <button
              type="button"
              onClick={() => setEsCompartido(!esCompartido)}
              className={`w-12 h-6 rounded-full transition p-1 flex items-center ${
                esCompartido ? 'bg-emerald-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createTxMutation.isPending}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20"
            >
              {createTxMutation.isPending ? 'Guardando...' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
