import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { coreApi, finanzasApi } from '@/services/api';
import {
  Home,
  Users,
  Plus,
  Tag,
  UserPlus,
  X,
  Edit2,
  Trash2,
  ShieldCheck,
  Layers,
  Search,
  Filter,
  ArrowUpDown,
  Lock,
} from 'lucide-react';
import { User, Category, CategoryMapping, ExpenseType } from '@/types';

const EXPENSE_TYPES_INFO: { key: ExpenseType; label: string; desc: string; isShared: boolean; badgeColor: string }[] = [
  {
    key: 'FIXED_HOUSEHOLD',
    label: 'Gasto Fijo del Hogar',
    desc: 'Servicios básicos obligatorios y recurrentes (Expensas, Luz, Agua, Gas, Internet, Alquiler). Imputación 50/50.',
    isShared: true,
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  {
    key: 'VARIABLE_HOUSEHOLD',
    label: 'Gasto Variable del Hogar',
    desc: 'Consumos comunes del hogar (Supermercado, Almacén, Artículos de Limpieza, Verdulería, Farmacia). Imputación 50/50.',
    isShared: true,
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
  {
    key: 'LEISURE_COUPLE',
    label: 'Ocio y Salidas en Pareja',
    desc: 'Entretenimiento y salidas compartidas (Restaurantes, Delivery, Cine, Viajes en pareja). Imputación 50/50.',
    isShared: true,
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  {
    key: 'FIXED_PERSONAL',
    label: 'Gasto Fijo Personal',
    desc: 'Gastos obligatorios individuales de cada integrante (Celular personal, Gimnasio, Seguro personal). 100% individual.',
    isShared: false,
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  {
    key: 'VARIABLE_PERSONAL',
    label: 'Gasto Variable Personal',
    desc: 'Consumos y gustos personales individuales (Ropa, Hobbies, Cursos personales). 100% individual.',
    isShared: false,
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
];

export const HogarPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { household: authHousehold, householdMembers: authMembers } = useAuth();

  // Add Member State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState<boolean>(false);
  const [memberNombre, setMemberNombre] = useState<string>('');
  const [memberEmail, setMemberEmail] = useState<string>('');

  // Category CRUD State
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catNombre, setCatNombre] = useState<string>('');
  const [catTipoGasto, setCatTipoGasto] = useState<ExpenseType>('VARIABLE_HOUSEHOLD');
  const [catColor, setCatColor] = useState<string>('#16a34a');
  const [catIcono, setCatIcono] = useState<string>('🏷️');

  // Category Mapping State (Create & Edit)
  const [isAddMappingOpen, setIsAddMappingOpen] = useState<boolean>(false);
  const [editingMapping, setEditingMapping] = useState<CategoryMapping | null>(null);
  const [patron, setPatron] = useState<string>('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');

  // Mapping View Filters & Sorting State
  const [mappingSearch, setMappingSearch] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterExpenseType, setFilterExpenseType] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'patron' | 'category' | 'tipo' | 'recent'>('patron');

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

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      finanzasApi.createCategory({
        nombre: catNombre,
        tipo_gasto: catTipoGasto,
        color: catColor,
        icono: catIcono,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsNewCategoryOpen(false);
      resetCatForm();
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: () => {
      if (!editingCategory) return Promise.reject();
      return finanzasApi.updateCategory(editingCategory.id, {
        nombre: catNombre,
        tipo_gasto: catTipoGasto,
        color: catColor,
        icono: catIcono,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingCategory(null);
      resetCatForm();
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => finanzasApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const addMappingMutation = useMutation({
    mutationFn: () => finanzasApi.createCategoryMapping({ patron, category_id: selectedCatId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-mappings'] });
      setIsAddMappingOpen(false);
      resetMappingForm();
    },
  });

  const updateMappingMutation = useMutation({
    mutationFn: () => {
      if (!editingMapping) return Promise.reject();
      return finanzasApi.updateCategoryMapping(editingMapping.id, {
        patron,
        category_id: selectedCatId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-mappings'] });
      setEditingMapping(null);
      resetMappingForm();
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: (id: string) => finanzasApi.deleteCategoryMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-mappings'] });
    },
  });

  const resetCatForm = () => {
    setCatNombre('');
    setCatTipoGasto('VARIABLE_HOUSEHOLD');
    setCatColor('#16a34a');
    setCatIcono('🏷️');
  };

  const resetMappingForm = () => {
    setPatron('');
    setSelectedCatId('');
  };

  const handleOpenEditCat = (cat: Category) => {
    setEditingCategory(cat);
    setCatNombre(cat.nombre);
    setCatTipoGasto(cat.tipo_gasto);
    setCatColor(cat.color || '#16a34a');
    setCatIcono(cat.icono || '🏷️');
  };

  const handleOpenEditMapping = (mapping: CategoryMapping) => {
    setEditingMapping(mapping);
    setPatron(mapping.patron);
    setSelectedCatId(mapping.category_id);
  };

  // Filter & Sort Category Mappings
  const filteredAndSortedMappings = useMemo(() => {
    let result = [...mappings];

    // Search filter
    if (mappingSearch.trim()) {
      const q = mappingSearch.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.patron.toLowerCase().includes(q) ||
          m.category?.nombre.toLowerCase().includes(q) ||
          m.category?.tipo_gasto.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (filterCategory !== 'ALL') {
      result = result.filter((m) => m.category_id === filterCategory);
    }

    // Expense Type filter
    if (filterExpenseType !== 'ALL') {
      result = result.filter((m) => m.category?.tipo_gasto === filterExpenseType);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'patron') {
        return a.patron.localeCompare(b.patron);
      }
      if (sortBy === 'category') {
        const catA = a.category?.nombre || '';
        const catB = b.category?.nombre || '';
        return catA.localeCompare(catB);
      }
      if (sortBy === 'tipo') {
        const tipoA = a.category?.tipo_gasto || '';
        const tipoB = b.category?.tipo_gasto || '';
        return tipoA.localeCompare(tipoB);
      }
      if (sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

    return result;
  }, [mappings, mappingSearch, filterCategory, filterExpenseType, sortBy]);

  return (
    <div className="space-y-6 max-w-[1750px] mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Configuración del Hogar, Categorías & Reglas</h2>
        <p className="text-xs text-slate-400">Gestión de miembros de la convivencia, tipos de gastos y reglas de automapeo inteligente</p>
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
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-5 shadow-xl">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

      {/* Section 2: Category Management (List, Edit, Delete, Create) */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" /> Categorías de Gastos ({categories.length})
            </h4>
            <p className="text-xs text-slate-400">Listado de categorías del hogar, su clasificación y opciones de edición/baja</p>
          </div>

          <button
            onClick={() => {
              resetCatForm();
              setIsNewCategoryOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nueva Categoría</span>
          </button>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {categories.map((cat) => (
              <div key={cat.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: `${cat.color || '#16a34a'}20`, color: cat.color || '#16a34a' }}
                  >
                    {cat.icono || '🏷️'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{cat.nombre}</p>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">{cat.tipo_gasto}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleOpenEditCat(cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Editar Categoría"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Seguro que deseas eliminar la categoría "${cat.nombre}"?`)) {
                        deleteCategoryMutation.mutate(cat.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Eliminar Categoría"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center space-y-2">
            <p className="text-xs text-slate-400">No hay categorías creadas aún.</p>
          </div>
        )}
      </div>

      {/* Section 3: Expense Types Explanation & System Rules */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" /> Tipos de Gastos del Dominio Financiero (Reglas de Convivencia 50/50)
            </h4>
            <p className="text-xs text-slate-400">
              Los 5 tipos de gastos son reglas de sistema fijas (no editables ni eliminables) que definen la imputación automática
            </p>
          </div>

          <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 w-fit">
            <Lock className="w-3.5 h-3.5 text-amber-400" /> Reglas de Sistema Fijas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {EXPENSE_TYPES_INFO.map((info) => {
            const count = categories.filter((c) => c.tipo_gasto === info.key).length;
            return (
              <div key={info.key} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${info.badgeColor}`}>
                      {info.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">{count} cat</span>
                  </div>
                  <p className="text-xs font-semibold text-white font-mono">{info.key}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{info.desc}</p>
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Imputación:</span>
                  <span className={`font-bold ${info.isShared ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {info.isShared ? '50/50 Compartido' : '100% Personal'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Advanced Intelligent Category Mappings Table (Search, Filter, Sort, Edit, Delete) */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Reglas de Automapeo ({filteredAndSortedMappings.length} de {mappings.length})
            </h4>
            <p className="text-xs text-slate-400">Patrones por palabras clave que asignan automáticamente la categoría al importar CSVs</p>
          </div>

          <button
            onClick={() => {
              resetMappingForm();
              setIsAddMappingOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition self-start md:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nueva Regla</span>
          </button>
        </div>

        {/* Filters & Search Control Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
          {/* Search text */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar patrón o categoría..."
              value={mappingSearch}
              onChange={(e) => setMappingSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  🏷️ {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Expense Type Filter */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={filterExpenseType}
              onChange={(e) => setFilterExpenseType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value="ALL">Todos los Tipos de Gasto</option>
              {EXPENSE_TYPES_INFO.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-medium"
            >
              <option value="patron">Ordenar por Patrón (A-Z)</option>
              <option value="category">Ordenar por Categoría (A-Z)</option>
              <option value="tipo">Ordenar por Tipo de Gasto</option>
              <option value="recent">Más recientes primero</option>
            </select>
          </div>
        </div>

        {/* Mappings Table */}
        {filteredAndSortedMappings.length > 0 ? (
          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="p-3">Patrón / Palabras Clave</th>
                  <th className="p-3">Categoría Asignada</th>
                  <th className="p-3">Tipo de Gasto</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                {filteredAndSortedMappings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-900/40 transition">
                    <td className="p-3 font-mono text-emerald-400 font-semibold">"{m.patron}"</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{
                            backgroundColor: `${m.category?.color || '#16a34a'}20`,
                            color: m.category?.color || '#16a34a',
                          }}
                        >
                          {m.category?.icono || '🏷️'}
                        </span>
                        <span className="font-bold text-white">{m.category?.nombre || 'Categoría no asignada'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-400 uppercase text-[10px] font-semibold">
                      {m.category?.tipo_gasto || '-'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditMapping(m)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Editar Regla"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar la regla para "${m.patron}"?`)) {
                              deleteMappingMutation.mutate(m.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Eliminar Regla"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center space-y-2">
            <p className="text-xs text-slate-400">No se encontraron reglas con los filtros aplicados.</p>
            <p className="text-[11px] text-slate-500">
              Prueba cambiando el patrón de búsqueda o selecciona "Todas las categorías".
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

      {/* Modal Create / Edit Category */}
      {(isNewCategoryOpen || editingCategory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button
                onClick={() => {
                  setIsNewCategoryOpen(false);
                  setEditingCategory(null);
                  resetCatForm();
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingCategory) {
                  updateCategoryMutation.mutate();
                } else {
                  createCategoryMutation.mutate();
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Categoría</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Supermercado, Gimnasio, Farmacia"
                  value={catNombre}
                  onChange={(e) => setCatNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Gasto (Dominio)</label>
                <select
                  required
                  value={catTipoGasto}
                  onChange={(e) => setCatTipoGasto(e.target.value as ExpenseType)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {EXPENSE_TYPES_INFO.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label} ({t.isShared ? '50/50' : 'Personal'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Icono / Emoji</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 🛒, 🏋️, 💊"
                    value={catIcono}
                    onChange={(e) => setCatIcono(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Color (Hex)</label>
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-full h-9 p-1 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewCategoryOpen(false);
                    setEditingCategory(null);
                    resetCatForm();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  {createCategoryMutation.isPending || updateCategoryMutation.isPending ? 'Guardando...' : 'Guardar Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Create / Edit Category Mapping Rule */}
      {(isAddMappingOpen || editingMapping) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingMapping ? 'Editar Regla de Automapeo' : 'Nueva Regla de Mapeo de Categoría'}
              </h3>
              <button
                onClick={() => {
                  setIsAddMappingOpen(false);
                  setEditingMapping(null);
                  resetMappingForm();
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingMapping) {
                  updateMappingMutation.mutate();
                } else {
                  addMappingMutation.mutate();
                }
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
                  onClick={() => {
                    setIsAddMappingOpen(false);
                    setEditingMapping(null);
                    resetMappingForm();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addMappingMutation.isPending || updateMappingMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  {addMappingMutation.isPending || updateMappingMutation.isPending ? 'Guardando...' : 'Guardar Regla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
