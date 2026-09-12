import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { finanzasApi, coreApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { X, Calendar, UserCheck, Tag, Edit3 } from 'lucide-react';
import { Transaction } from '@/types';

interface Props {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditTransactionModal: React.FC<Props> = ({ transaction, isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { householdMembers: authMembers } = useAuth();

  const [fecha, setFecha] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [esCompartido, setEsCompartido] = useState<boolean>(true);

  // Fetch household to ensure complete user list
  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => coreApi.getHousehold(),
  });

  const membersList =
    householdData?.members && householdData.members.length > 0
      ? householdData.members.map((m) => m.user)
      : authMembers;

  useEffect(() => {
    if (transaction) {
      setFecha(transaction.fecha ? transaction.fecha.split('T')[0] : new Date().toISOString().split('T')[0]);
      setDescripcion(transaction.descripcion || '');
      setMonto(transaction.monto ? transaction.monto.toString() : '');
      setSelectedUserId(transaction.user_id || '');
      setSelectedCategoryId(transaction.category_id || '');
      setEsCompartido(transaction.es_compartido ?? true);
    }
  }, [transaction]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => finanzasApi.getCategories(),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) return;
      const montoNum = parseFloat(monto);
      if (isNaN(montoNum) || montoNum <= 0) {
        throw new Error('Ingresa un monto válido mayor a 0');
      }

      return finanzasApi.updateTransaction(transaction.id, {
        fecha: new Date(fecha).toISOString(),
        descripcion,
        monto: montoNum,
        user_id: selectedUserId,
        category_id: selectedCategoryId || null,
        es_compartido: esCompartido,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      onClose();
    },
  });

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Editar Movimiento</h3>
              <p className="text-xs text-slate-400">Modificar datos y actualizar balance 50/50</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {updateMutation.isError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {(updateMutation.error as Error).message}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="space-y-4"
        >
          {/* Row 1: Fecha & Monto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Fecha
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
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* User Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Pagado Por (Usuario)
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Seleccionar Usuario Pagador --</option>
              {membersList.map((m) => (
                <option key={m.id} value={m.id}>
                  👤 {m.nombre} ({m.email})
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-emerald-400" /> Categoría
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Sin Categoría --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  🏷️ {cat.nombre} ({cat.tipo_gasto})
                </option>
              ))}
            </select>
          </div>

          {/* Split 50/50 Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Gasto Compartido 50/50</span>
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

          {/* Actions */}
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
              disabled={updateMutation.isPending}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
