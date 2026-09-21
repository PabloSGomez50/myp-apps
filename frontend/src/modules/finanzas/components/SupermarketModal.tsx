import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { finanzasApi } from '@/services/api';
import { Supermarket, SupermarketCreate, SupermarketUpdate } from '@/types';
import { X, Store, Plus, Edit2, Trash2, Tag, Calendar, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_OPTIONS = [
  { label: 'Verde', value: 'emerald', bg: 'bg-emerald-500' },
  { label: 'Rojo', value: 'red', bg: 'bg-red-500' },
  { label: 'Azul', value: 'blue', bg: 'bg-blue-500' },
  { label: 'Naranja', value: 'amber', bg: 'bg-amber-500' },
  { label: 'Violeta', value: 'purple', bg: 'bg-purple-500' },
];

const DAYS_OF_WEEK = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
  'Todos los días',
];

export const SupermarketModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [nombre, setNombre] = useState<string>('');
  const [color, setColor] = useState<string>('emerald');
  const [descuentoHabitual, setDescuentoHabitual] = useState<string>('0');
  const [diaPromocion, setDiaPromocion] = useState<string>('');

  const { data: supermarkets = [], isLoading } = useQuery({
    queryKey: ['supermarkets'],
    queryFn: () => finanzasApi.getSupermarkets(),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data: SupermarketCreate) => finanzasApi.createSupermarket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supermarkets'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SupermarketUpdate }) =>
      finanzasApi.updateSupermarket(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supermarkets'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => finanzasApi.deleteSupermarket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supermarkets'] });
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setNombre('');
    setColor('emerald');
    setDescuentoHabitual('0');
    setDiaPromocion('');
  };

  const startEdit = (sm: Supermarket) => {
    setEditingId(sm.id);
    setNombre(sm.nombre);
    setColor(sm.color || 'emerald');
    setDescuentoHabitual(String(sm.descuento_habitual_porcentaje || 0));
    setDiaPromocion(sm.dia_promocion_habitual || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const payload = {
      nombre: nombre.trim(),
      icono: 'shopping-bag',
      color,
      descuento_habitual_porcentaje: parseFloat(descuentoHabitual) || 0,
      dia_promocion_habitual: diaPromocion.trim() || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Supermercados y Comercios</h2>
              <p className="text-xs text-slate-400">
                Gestiona tus comercios frecuentes, descuentos habituales y días de promoción
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {editingId ? 'Editar Comercio' : 'Nuevo Comercio'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Cancelar Edición
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre Comercio</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Coto, Carrefour, Día..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Descuento Habitual (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={descuentoHabitual}
                    onChange={(e) => setDescuentoHabitual(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <Tag className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Día de Promoción Habitual</label>
                <select
                  value={diaPromocion}
                  onChange={(e) => setDiaPromocion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="">Sin día fijo / Opcional</option>
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Color Identificador</label>
                <div className="flex items-center gap-2 py-1">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center transition-transform ${
                        color === c.value ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {color === c.value && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                {editingId ? (
                  <>
                    <Check className="w-4 h-4" /> Guardar Cambios
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Agregar Comercio
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Supermarkets List */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Comercios Guardados</h3>
            {isLoading ? (
              <div className="text-center py-6 text-slate-400 text-sm">Cargando supermercados...</div>
            ) : supermarkets.length === 0 ? (
              <div className="text-center py-6 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400 text-sm">
                No hay supermercados registrados aún.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {supermarkets.map((sm) => (
                  <div
                    key={sm.id}
                    className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white">{sm.nombre}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          {sm.descuento_habitual_porcentaje > 0 && (
                            <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
                              -{sm.descuento_habitual_porcentaje}%
                            </span>
                          )}
                          {sm.dia_promocion_habitual && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {sm.dia_promocion_habitual}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(sm)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar supermercado ${sm.nombre}?`)) {
                            deleteMutation.mutate(sm.id);
                          }
                        }}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
