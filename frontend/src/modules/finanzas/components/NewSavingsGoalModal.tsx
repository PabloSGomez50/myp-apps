import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { SavingsGoal } from '@/types';
import { Target, Calendar, DollarSign, X, Users, User as UserIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: SavingsGoal | null;
}

export const NewSavingsGoalModal: React.FC<Props> = ({ isOpen, onClose, goalToEdit }) => {
  const queryClient = useQueryClient();
  const { user: currentUser, householdMembers } = useAuth();

  const [nombre, setNombre] = useState('');
  const [montoObjetivo, setMontoObjetivo] = useState('');
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [fechaLimite, setFechaLimite] = useState('');
  const [esPersonal, setEsPersonal] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (goalToEdit) {
      setNombre(goalToEdit.nombre || '');
      setMontoObjetivo(goalToEdit.monto_objetivo ? goalToEdit.monto_objetivo.toString() : '');
      setMoneda((goalToEdit.moneda as 'ARS' | 'USD') || 'ARS');
      setFechaLimite(goalToEdit.fecha_limite ? goalToEdit.fecha_limite.split('T')[0] : '');
      setEsPersonal(!!goalToEdit.es_personal);
      setTargetUserId(goalToEdit.user_id || currentUser?.id || '');
    } else {
      resetForm();
    }
  }, [goalToEdit, isOpen, currentUser]);

  const saveGoalMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      const parsedMonto = parseFloat(montoObjetivo);
      if (!nombre.trim()) {
        throw new Error('El nombre de la meta es obligatorio.');
      }
      if (isNaN(parsedMonto) || parsedMonto <= 0) {
        throw new Error('El monto objetivo debe ser mayor a 0.');
      }

      const payload = {
        nombre: nombre.trim(),
        monto_objetivo: parsedMonto,
        moneda,
        fecha_limite: fechaLimite ? fechaLimite : null,
        es_personal: esPersonal,
        user_id: esPersonal ? (targetUserId || currentUser?.id || null) : null,
      };

      if (goalToEdit) {
        return finanzasApi.updateSavingsGoal(goalToEdit.id, payload);
      }

      return finanzasApi.createSavingsGoal(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-fund'] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Error al guardar la meta de ahorro.');
    },
  });

  const resetForm = () => {
    setNombre('');
    setMontoObjetivo('');
    setMoneda('ARS');
    setFechaLimite('');
    setEsPersonal(false);
    setTargetUserId(currentUser?.id || '');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveGoalMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-cyan-400">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-base font-bold text-white">
              {goalToEdit ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* Scope Selector: Shared vs Personal */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Titularidad de la Meta
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEsPersonal(false)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  !esPersonal
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>👥 Compartida</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEsPersonal(true);
                  if (!targetUserId && currentUser) setTargetUserId(currentUser.id);
                }}
                className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  esPersonal
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>👤 Personal</span>
              </button>
            </div>
          </div>

          {/* Target user selector if personal */}
          {esPersonal && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Asignada a:
              </label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {householdMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    👤 {member.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Nombre de la Meta
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Fondo de Emergencia, Vacaciones, Auto..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Monto Objetivo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <DollarSign className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={montoObjetivo}
                  onChange={(e) => setMontoObjetivo(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Moneda
              </label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as 'ARS' | 'USD')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Fecha Límite (Opcional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveGoalMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-xl shadow-lg shadow-cyan-600/20 transition-colors"
            >
              {saveGoalMutation.isPending ? 'Guardando...' : goalToEdit ? 'Guardar Cambios' : 'Crear Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
