import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { finanzasApi, coreApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { X, ArrowRightLeft, UserCheck, Calendar, DollarSign, Tag } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettlementModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { user, householdMembers: authMembers } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState<string>(todayStr);
  const [monto, setMonto] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('Devolución / Reintegro de pareja');
  const [sourceUserId, setSourceUserId] = useState<string>(user?.id || '');
  const [targetUserId, setTargetUserId] = useState<string>('');

  // Fetch household members
  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => coreApi.getHousehold(),
  });

  const membersList =
    householdData?.members && householdData.members.length > 0
      ? householdData.members.map((m) => m.user)
      : authMembers;

  // Auto-set initial source and target ONCE when modal opens
  useEffect(() => {
    if (isOpen) {
      const activeUser = user?.id || membersList[0]?.id || '';
      setSourceUserId(activeUser);
      const other = membersList.find((m) => m.id !== activeUser);
      setTargetUserId(other?.id || '');
    }
  }, [isOpen]);

  const settlementMutation = useMutation({
    mutationFn: async () => {
      const numMonto = parseFloat(monto);
      if (isNaN(numMonto) || numMonto <= 0) throw new Error('Ingresa un monto válido mayor a 0');
      if (!sourceUserId || !targetUserId) throw new Error('Selecciona el usuario emisor y el destinatario');
      if (sourceUserId === targetUserId) throw new Error('El usuario emisor y el destinatario deben ser distintos');

      const isoFecha = new Date(fecha).toISOString();

      return finanzasApi.createSettlement({
        source_user_id: sourceUserId,
        target_user_id: targetUserId,
        monto: numMonto,
        descripcion,
        fecha: isoFecha,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      onClose();
      resetForm();
    },
  });

  const resetForm = () => {
    setFecha(todayStr);
    setMonto('');
    setDescripcion('Devolución / Reintegro de pareja');
    setSourceUserId(user?.id || '');
    if (membersList.length >= 2 && user?.id) {
      const other = membersList.find((m) => m.id !== user.id);
      setTargetUserId(other?.id || '');
    } else {
      setTargetUserId('');
    }
  };

  const handleSelectSource = (id: string) => {
    setSourceUserId(id);
    if (membersList.length === 2) {
      const other = membersList.find((m) => m.id !== id);
      if (other) setTargetUserId(other.id);
    } else if (id === targetUserId) {
      const other = membersList.find((m) => m.id !== id);
      setTargetUserId(other ? other.id : '');
    }
  };

  const handleSelectTarget = (id: string) => {
    setTargetUserId(id);
    if (membersList.length === 2) {
      const other = membersList.find((m) => m.id !== id);
      if (other) setSourceUserId(other.id);
    } else if (id === sourceUserId) {
      const other = membersList.find((m) => m.id !== id);
      setSourceUserId(other ? other.id : '');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-white">Devolución / Reintegro</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            settlementMutation.mutate();
          }}
          className="space-y-4"
        >
          {settlementMutation.isError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {(settlementMutation.error as Error).message}
            </div>
          )}

          {/* Date & Concept Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Fecha
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" /> Concepto
              </label>
              <input
                type="text"
                required
                placeholder="Devolución / Reintegro"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Emisor Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> ¿Quién envía la devolución? (Emisor)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {membersList.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => handleSelectSource(m.id)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-xs font-medium ${
                    sourceUserId === m.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
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

          {/* Destinatario Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> ¿Quién recibe la devolución? (Destinatario)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {membersList.map((m) => {
                const isSelected = targetUserId === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => handleSelectTarget(m.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-xs font-medium ${
                      isSelected
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
                );
              })}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-indigo-400" /> Monto Total ($ ARS)
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="Ej. 50000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
            />
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
              disabled={settlementMutation.isPending}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {settlementMutation.isPending ? 'Guardando...' : 'Registrar Devolución'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
