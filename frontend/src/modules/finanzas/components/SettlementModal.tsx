import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { finanzasApi, coreApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { X, ArrowRightLeft, UserCheck, Calendar } from 'lucide-react';

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

  // Fetch household members to ensure target user list is complete
  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => coreApi.getHousehold(),
  });

  const membersList =
    householdData?.members && householdData.members.length > 0
      ? householdData.members.map((m) => m.user)
      : authMembers;

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
    setTargetUserId('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Devolución / Reintegro</h3>
              <p className="text-xs text-slate-400">Registrar pago parcial o saldo de cuenta entre miembros</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {settlementMutation.isError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {(settlementMutation.error as Error).message}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            settlementMutation.mutate();
          }}
          className="space-y-4"
        >
          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Fecha del Reintegro
            </label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Emisor (Quien devuelve/paga) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Quien realiza la devolución (Emisor)
            </label>
            <select
              value={sourceUserId}
              onChange={(e) => setSourceUserId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Seleccionar Emisor --</option>
              {membersList.map((m) => (
                <option key={m.id} value={m.id}>
                  👤 {m.nombre} ({m.email})
                </option>
              ))}
            </select>
          </div>

          {/* Destinatario (Quien recibe) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Quien recibe el pago (Destinatario)
            </label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Seleccionar Destinatario --</option>
              {membersList
                .filter((m) => m.id !== sourceUserId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    👤 {m.nombre} ({m.email})
                  </option>
                ))}
            </select>
          </div>

          {/* Monto & Descripción */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Monto ($ ARS)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Concepto / Nota</label>
              <input
                type="text"
                required
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
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
              disabled={settlementMutation.isPending}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
            >
              {settlementMutation.isPending ? 'Guardando...' : 'Registrar Devolución'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
