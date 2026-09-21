import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventarioApi } from '@/services/api';
import { Location } from '@/types';
import { X, MapPin, CheckCircle2 } from 'lucide-react';

interface LocationModalProps {
  location?: Location | null;
  onClose: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ location, onClose }) => {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');

  useEffect(() => {
    if (location) {
      setNombre(location.nombre);
      setDescripcion(location.descripcion || '');
    } else {
      setNombre('');
      setDescripcion('');
    }
  }, [location]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (location) {
        return inventarioApi.updateLocation(location.id, {
          nombre,
          descripcion: descripcion || undefined,
        });
      } else {
        return inventarioApi.createLocation({
          nombre,
          descripcion: descripcion || undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            {location ? 'Editar Ubicación Física' : 'Nueva Ubicación Física'}
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
              placeholder="Ej. Despensa Cocina, Bajo Mesada, Freezer"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción</label>
            <input
              type="text"
              placeholder="Ej. Estante superior de víveres secos"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
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
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition"
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
