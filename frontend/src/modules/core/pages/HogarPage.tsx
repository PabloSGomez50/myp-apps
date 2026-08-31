import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Home, Users } from 'lucide-react';

export const HogarPage: React.FC = () => {
  const { household, householdMembers } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Configuración del Hogar</h2>
        <p className="text-xs text-slate-400">Gestión de miembros, moneda principal y seguridad</p>
      </div>

      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{household?.nombre || 'Casa Pablo & Pareja'}</h3>
            <p className="text-xs text-slate-400">Moneda Base: {household?.moneda_principal || 'ARS'}</p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" /> Miembros de la Convivencia
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {householdMembers.map((member) => (
            <div key={member.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                style={{ backgroundColor: member.color_avatar }}
              >
                {member.nombre[0]}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{member.nombre}</p>
                <p className="text-[10px] text-slate-400">{member.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
