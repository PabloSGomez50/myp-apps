import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventarioApi } from '@/services/api';
import { InventoryCategory } from '@/types';
import { X, Tag, CheckCircle2 } from 'lucide-react';

interface InventoryCategoryModalProps {
  category?: InventoryCategory | null;
  onClose: () => void;
}

const COLOR_OPTIONS = [
  { id: 'emerald', bg: 'bg-emerald-500', name: 'Esmeralda' },
  { id: 'blue', bg: 'bg-blue-500', name: 'Azul' },
  { id: 'purple', bg: 'bg-purple-500', name: 'Púrpura' },
  { id: 'rose', bg: 'bg-rose-500', name: 'Rosa' },
  { id: 'amber', bg: 'bg-amber-500', name: 'Ámbar' },
  { id: 'indigo', bg: 'bg-indigo-500', name: 'Índigo' },
  { id: 'teal', bg: 'bg-teal-500', name: 'Teal' },
  { id: 'cyan', bg: 'bg-cyan-500', name: 'Cian' },
];

export const InventoryCategoryModal: React.FC<InventoryCategoryModalProps> = ({
  category,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState<string>('');
  const [icono, setIcono] = useState<string>('package');
  const [color, setColor] = useState<string>('emerald');

  useEffect(() => {
    if (category) {
      setNombre(category.nombre);
      setIcono(category.icono || 'package');
      setColor(category.color || 'emerald');
    } else {
      setNombre('');
      setIcono('package');
      setColor('emerald');
    }
  }, [category]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (category) {
        return inventarioApi.updateCategory(category.id, {
          nombre,
          icono,
          color,
        });
      } else {
        return inventarioApi.createCategory({
          nombre,
          icono,
          color,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-categories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            {category ? 'Editar Categoría de Inventario' : 'Nueva Categoría de Inventario'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre</label>
            <input
              type="text"
              required
              placeholder="Ej. Alimentos Secos, Limpieza, Congelados, Bebidas"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Color Identificador</label>
            <div className="flex items-center gap-2 pt-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-6 h-6 rounded-full ${c.bg} transition transform ${
                    color === c.id ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-60 hover:opacity-100'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveMutation.isPending ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
