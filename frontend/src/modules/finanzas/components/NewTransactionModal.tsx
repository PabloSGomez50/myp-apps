import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { finanzasApi, coreApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { X, Plus, Calendar, UserCheck, Tag, Check, DollarSign, Sparkles } from 'lucide-react';
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [esCompartido, setEsCompartido] = useState<boolean>(true);

  // Quick New Category Inline Form State
  const [showAddCatInline, setShowAddCatInline] = useState<boolean>(false);
  const [catNombre, setCatNombre] = useState<string>('');
  const [catTipoGasto, setCatTipoGasto] = useState<ExpenseType>('VARIABLE_HOUSEHOLD');
  const [catColor, setCatColor] = useState<string>('#16a34a');

  // Queries
  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => coreApi.getHousehold(),
  });

  const membersList =
    householdData?.members && householdData.members.length > 0
      ? householdData.members.map((m) => m.user)
      : householdMembers;

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => finanzasApi.getCategories(),
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['category-mappings'],
    queryFn: () => finanzasApi.getCategoryMappings(),
  });

  // Default selected user to logged in user when modal opens
  useEffect(() => {
    if (isOpen && !selectedUserId && (user?.id || membersList[0]?.id)) {
      setSelectedUserId(user?.id || membersList[0]?.id);
    }
  }, [isOpen, selectedUserId, user, membersList]);

  // Auto-set esCompartido to false for personal expense categories (FIXED_PERSONAL, VARIABLE_PERSONAL)
  useEffect(() => {
    if (selectedCategoryId && categories.length > 0) {
      const selectedCat = categories.find((c) => c.id === selectedCategoryId);
      if (selectedCat) {
        if (selectedCat.tipo_gasto === 'FIXED_PERSONAL' || selectedCat.tipo_gasto === 'VARIABLE_PERSONAL') {
          setEsCompartido(false);
        } else {
          setEsCompartido(true);
        }
      }
    }
  }, [selectedCategoryId, categories]);

  // Suggestions based on selected Category and Automappings
  const categorySuggestions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return mappings
      .filter((m) => m.category_id === selectedCategoryId)
      .map((m) => m.patron);
  }, [selectedCategoryId, mappings]);

  // Auto-match category when typing description if category not set yet
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDescripcion(val);

    if (val.length >= 2) {
      const lower = val.toLowerCase().trim();
      const match = mappings.find((m) => lower.includes(m.patron.toLowerCase()));
      if (match && match.category_id) {
        setSelectedCategoryId(match.category_id);
      }
    }
  };

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
      const activeUser = selectedUserId || user?.id || membersList[0]?.id;
      if (!activeUser) {
        throw new Error('Selecciona el usuario que realizó el pago');
      }

      const isoFecha = new Date(fecha).toISOString();

      if (esCompartido) {
        return finanzasApi.createSplitTransaction({
          user_id: activeUser,
          category_id: selectedCategoryId,
          monto: montoNum,
          descripcion,
          fecha: isoFecha,
        });
      } else {
        return finanzasApi.createTransaction({
          user_id: activeUser,
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
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
          {/* Fila 1: Menú de Categorías de Gastos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
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
                    className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between gap-1.5 transition ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className="w-3.5 h-3.5 rounded-md border border-slate-700"
                        style={{ backgroundColor: cat.color || '#16a34a' }}
                      />
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold truncate text-white">{cat.nombre}</p>
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                        {cat.tipo_gasto === 'LEISURE_COUPLE'
                          ? 'Ocio'
                          : cat.tipo_gasto.includes('HOUSEHOLD')
                          ? 'Hogar'
                          : 'Personal'}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Inline Add Category Button */}
              <button
                type="button"
                onClick={() => setShowAddCatInline(!showAddCatInline)}
                className="p-2.5 rounded-2xl border border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/60 text-emerald-400 flex flex-col items-center justify-center gap-1 transition text-xs font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva</span>
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
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-10 h-7 p-0.5 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-24 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white"
                  />
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

          {/* Fila 2: Descripción con Sugerencias de Automapeo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Descripción / Concepto</span>
              {categorySuggestions.length > 0 && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3 h-3" /> Sugerencias de automapeo disponibles
                </span>
              )}
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Coto, Rapanui, Edesur, Nafta"
              value={descripcion}
              onChange={handleDescriptionChange}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />

            {/* Suggestion Pills */}
            {categorySuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Sugerencias:</span>
                {categorySuggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setDescripcion(sug.charAt(0).toUpperCase() + sug.slice(1))}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-[11px] font-mono font-medium transition"
                  >
                    "{sug}"
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fila 3: Fecha & Monto */}
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
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Monto ($ ARS)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Fila 4: ¿Quién realizó el pago? (User Selector identical to NewIncomeModal) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> ¿Quién realizó el pago?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {membersList.map((m) => {
                const isSelected = selectedUserId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedUserId(m.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-xs font-medium ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0"
                      style={{ backgroundColor: m.color_avatar || '#16a34a' }}
                    >
                      {m.nombre[0]}
                    </div>
                    <span className="truncate">{m.nombre}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
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
