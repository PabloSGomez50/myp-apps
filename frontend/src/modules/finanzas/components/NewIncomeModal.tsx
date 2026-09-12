import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { finanzasApi, coreApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { DollarSign, Calendar, User as UserIcon, X, Tag } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewIncomeModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { user, householdMembers } = useAuth();

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [userId, setUserId] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('Sueldo / Ingreso');
  const [fecha, setFecha] = useState<string>(getTodayString());
  const [errorMsg, setErrorMsg] = useState<string>('');

  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => coreApi.getHousehold(),
  });

  const membersList =
    householdData?.members && householdData.members.length > 0
      ? householdData.members.map((m) => m.user)
      : householdMembers;

  // Set default active user when modal opens or members load
  const selectedUserId = userId || user?.id || (membersList[0]?.id ?? '');

  const createIncomeMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      const parsedMonto = parseFloat(monto);
      if (isNaN(parsedMonto) || parsedMonto <= 0) {
        throw new Error('El monto ingresado debe ser mayor a 0.');
      }
      if (!selectedUserId) {
        throw new Error('Selecciona quién recibe el ingreso.');
      }

      return finanzasApi.createTransaction({
        user_id: selectedUserId,
        tipo: 'INCOME',
        monto: parsedMonto,
        descripcion: descripcion || 'Sueldo / Ingreso',
        fecha: new Date(fecha).toISOString(),
        es_compartido: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Error al guardar el ingreso.');
    },
  });

  const resetForm = () => {
    setUserId('');
    setMonto('');
    setDescripcion('Sueldo / Ingreso');
    setFecha(getTodayString());
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createIncomeMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white">Registrar Ingreso / Sueldo</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Member Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-emerald-400" /> ¿Quién percibe este ingreso?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {membersList.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setUserId(m.id)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-xs font-medium ${
                    selectedUserId === m.id
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
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
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Monto Total ($ ARS)
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="Ej. 1200000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Date & Concept Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Fecha
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" /> Concepto
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Sueldo, Bono"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createIncomeMutation.isPending}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {createIncomeMutation.isPending ? 'Guardando...' : 'Guardar Ingreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
