import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { coreApi, finanzasApi } from '@/services/api';
import { Home, Users, Plus, Tag, UserPlus, X } from 'lucide-react';
import { User } from '@/types';

export const HogarPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { household: authHousehold, householdMembers: authMembers } = useAuth();

  // Add Member State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState<boolean>(false);
  const [memberNombre, setMemberNombre] = useState<string>('');
  const [memberEmail, setMemberEmail] = useState<string>('');

  // Category Mapping State
  const [isAddMappingOpen, setIsAddMappingOpen] = useState<boolean>(false);
  const [patron, setPatron] = useState<string>('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');

  // Queries
  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => coreApi.getHousehold(),
  });

  const household = householdData || authHousehold;
  const members = householdData?.members && householdData.members.length > 0
    ? householdData.members
    : authMembers.map((u: User) => ({ id: u.id, user: u, rol: 'MEMBER' as const, activo: true }));

  const { data: mappings = [] } = useQuery({
    queryKey: ['category-mappings'],
    queryFn: () => finanzasApi.getCategoryMappings(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => finanzasApi.getCategories(),
  });

  // Mutations
  const addMemberMutation = useMutation({
    mutationFn: () => coreApi.addHouseholdMember({ email: memberEmail, nombre: memberNombre }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household'] });
      setIsAddMemberOpen(false);
      setMemberNombre('');
      setMemberEmail('');
    },
  });

  const addMappingMutation = useMutation({
    mutationFn: () => finanzasApi.createCategoryMapping({ patron, category_id: selectedCatId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-mappings'] });
      setIsAddMappingOpen(false);
      setPatron('');
      setSelectedCatId('');
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Configuración del Hogar & Reglas</h2>
        <p className="text-xs text-slate-400">Gestión de miembros de la convivencia y reglas de categorización automática</p>
      </div>

      {/* Hero Household Banner */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{household?.nombre || 'Casa Pablo & Martu'}</h3>
            <p className="text-xs text-slate-400">Moneda Base: <strong className="text-emerald-400">{household?.moneda_principal || 'ARS'}</strong></p>
          </div>
        </div>
      </div>

      {/* Section 1: Household Members */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Miembros de la Convivencia
            </h4>
            <p className="text-xs text-slate-400">Agrega o pre-registra miembros para asignar pagos e importar CSVs</p>
          </div>

          <button
            onClick={() => setIsAddMemberOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Agregar Miembro</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {members.map((member) => (
            <div key={member.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md"
                style={{ backgroundColor: member.user?.color_avatar || '#16a34a' }}
              >
                {member.user?.nombre ? member.user.nombre[0] : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-white truncate">{member.user?.nombre || 'Usuario'}</p>
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[9px] uppercase font-bold">
                    {member.rol}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">{member.user?.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Intelligent Category Mappings */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" /> Reglas de Automapeo (Conceptos ➔ Categorías)
            </h4>
            <p className="text-xs text-slate-400">Vínculos que asignan automáticamente la categoría al cargar CSVs o movimientos</p>
          </div>

          <button
            onClick={() => setIsAddMappingOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nueva Regla</span>
          </button>
        </div>

        {mappings.length > 0 ? (
          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="p-3">Patrón / Palabras Clave</th>
                  <th className="p-3">Categoría Asignada</th>
                  <th className="p-3 text-right">Tipo de Gasto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-900/40 transition">
                    <td className="p-3 font-mono text-emerald-400 font-semibold">"{m.patron}"</td>
                    <td className="p-3 font-bold text-white">{m.category?.nombre || 'Categoría'}</td>
                    <td className="p-3 text-right text-slate-400 uppercase text-[10px]">
                      {m.category?.tipo_gasto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center space-y-2">
            <p className="text-xs text-slate-400">No hay reglas de mapeo configuradas manualmente.</p>
            <p className="text-[11px] text-slate-500">
              El sistema utiliza reglas por palabras clave predeterminadas (ej: Coto, Rapanui, Edesur) y guardará automáticamente tus correcciones al importar CSVs.
            </p>
          </div>
        )}
      </div>

      {/* Modal Add Member */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Agregar Miembro al Hogar</h3>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addMemberMutation.isError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {(addMemberMutation.error as Error).message}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMemberMutation.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Martu"
                  value={memberNombre}
                  onChange={(e) => setMemberNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="Ej. martu@mypapps.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Si la persona aún no tiene cuenta registrada, se guardará como pendiente y al crear su contraseña se vinculará a este hogar.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  {addMemberMutation.isPending ? 'Guardando...' : 'Agregar Miembro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Category Mapping */}
      {isAddMappingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Nueva Regla de Mapeo de Categoría</h3>
              <button onClick={() => setIsAddMappingOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMappingMutation.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Patrón / Palabra Clave</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. coto, rapani, sushi pop, edesur"
                  value={patron}
                  onChange={(e) => setPatron(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría a Asignar</label>
                <select
                  required
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="">-- Seleccionar Categoría --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏷️ {c.nombre} ({c.tipo_gasto})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMappingOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addMappingMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  {addMappingMutation.isPending ? 'Guardando...' : 'Guardar Regla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
