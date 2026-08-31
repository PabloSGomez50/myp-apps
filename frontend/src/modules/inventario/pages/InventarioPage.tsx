import React from 'react';
import { Boxes, Plus } from 'lucide-react';

export const InventarioPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Inventario del Hogar</h2>
          <p className="text-xs text-slate-400">Control de stock de despensa, limpieza y equipamiento</p>
        </div>
        <button
          onClick={() => alert('Nuevo artículo')}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Artículo</span>
        </button>
      </div>

      <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
          <Boxes className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white">Módulo de Inventario Preparado</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          La estructura de backend y frontend está lista para conectar el esquema de PostgreSQL `inventario`.
        </p>
      </div>
    </div>
  );
};
