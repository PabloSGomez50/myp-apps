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
  Palette,
  Sliders,
  Calendar,
} from 'lucide-react';
import { User, Category, CategoryMapping, ExpenseType } from '@/types';
import { MonthlySplitModal } from '@/modules/finanzas/components/MonthlySplitModal';
import { formatMonthYear } from '@/utils/date';

const PRESET_AVATAR_COLORS = [
  '#10b981', // Emerald (Pablo default)
  '#8b5cf6', // Purple (Martu default)
  '#6366f1', // Indigo
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#0ea5e9', // Sky
  '#14b8a6', // Teal
  '#ec4899', // Pink
];

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

  // Editing User Color State
  const [editingUserColorId, setEditingUserColorId] = useState<string | null>(null);

  // Category CRUD State
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catNombre, setCatNombre] = useState<string>('');
  const [catTipoGasto, setCatTipoGasto] = useState<ExpenseType>('VARIABLE_HOUSEHOLD');
  const [catColor, setCatColor] = useState<string>('#16a34a');

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

  // Monthly Split State & Default Split
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);
  const [splitModalYear, setSplitModalYear] = useState<number>(new Date().getFullYear());
  const [splitModalMonth, setSplitModalMonth] = useState<number>(new Date().getMonth() + 1);
  const [isEditingDefaultSplit, setIsEditingDefaultSplit] = useState<boolean>(false);
  const [defaultSplitRatios, setDefaultSplitRatios] = useState<Record<string, number>>({});

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

  const { data: splitRules = [] } = useQuery({
    queryKey: ['split-rules'],
    queryFn: () => finanzasApi.getMonthlySplitRules(),
  });

  // Split Rules Mutations & Handlers
  const updateDefaultSplitMutation = useMutation({
    mutationFn: (ratios: Record<string, number>) =>
      finanzasApi.updateHouseholdDefaultSplit(ratios),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household'] });
      queryClient.invalidateQueries({ queryKey: ['effective-split'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      setIsEditingDefaultSplit(false);
    },
  });

  const deleteSplitRuleMutation = useMutation({
    mutationFn: (id: string) => finanzasApi.deleteMonthlySplitRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['split-rules'] });
      queryClient.invalidateQueries({ queryKey: ['effective-split'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
    },
  });

  const handleStartEditingDefault = () => {
    const initial: Record<string, number> = {};
    members.forEach((m) => {
      const raw = household?.default_split_ratios?.[m.user.id] ?? 0.5;
      initial[m.user.id] = Math.round(raw * 100);
    });
    setDefaultSplitRatios(initial);
    setIsEditingDefaultSplit(true);
  };

  const handleDefaultRatioChange = (userId: string, val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    const otherMember = members.find((m) => m.user.id !== userId);
    if (otherMember && members.length === 2) {
      setDefaultSplitRatios({
        [userId]: clamped,
        [otherMember.user.id]: 100 - clamped,
      });
    } else {
      setDefaultSplitRatios((prev) => ({
        ...prev,
        [userId]: clamped,
      }));
    }
  };

  const handleSaveDefaultSplit = () => {
    const total = Object.values(defaultSplitRatios).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 100) > 0.01) {
      alert('La suma de los porcentajes debe ser exactamente 100%');
      return;
    }
    const decimalRatios: Record<string, number> = {};
    for (const [uid, pct] of Object.entries(defaultSplitRatios)) {
      decimalRatios[uid] = Number((pct / 100).toFixed(4));
    }
    updateDefaultSplitMutation.mutate(decimalRatios);
  };

  const handleOpenNewSplitRule = () => {
    const now = new Date();
    setSplitModalYear(now.getFullYear());
    setSplitModalMonth(now.getMonth() + 1);
    setIsSplitModalOpen(true);
  };

  const handleOpenEditSplitRule = (rule: { year: number; month: number }) => {
    setSplitModalYear(rule.year);
    setSplitModalMonth(rule.month);
    setIsSplitModalOpen(true);
  };

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

  const updateUserColorMutation = useMutation({
    mutationFn: ({ userId, color }: { userId: string; color: string }) =>
      coreApi.updateUser(userId, { color_avatar: color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household'] });
      setEditingUserColorId(null);
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      finanzasApi.createCategory({
        nombre: catNombre,
        tipo_gasto: catTipoGasto,
        color: catColor,
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
        <p className="text-xs text-slate-400">Gestión de miembros de la convivencia, colores de avatar, tipos de gastos y reglas de automapeo</p>
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

      {/* Section 1: Household Members & Avatar Colors */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Miembros de la Convivencia
            </h4>
            <p className="text-xs text-slate-400">Configura el color identificador de avatar con iniciales (P, M) para cada integrante</p>
          </div>

          <button
            onClick={() => setIsAddMemberOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Agregar Miembro</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {members.map((member) => {
            const initialLetter = member.user?.nombre ? member.user.nombre[0].toUpperCase() : 'U';
            const isEditingColor = editingUserColorId === member.user?.id;

            return (
              <div key={member.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-white text-base shadow-lg transition-transform hover:scale-105"
                      style={{ backgroundColor: member.user?.color_avatar || '#16a34a' }}
                    >
                      {initialLetter}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white truncate">{member.user?.nombre || 'Usuario'}</p>
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[9px] uppercase font-bold">
                          {member.rol}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{member.user?.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingUserColorId(isEditingColor ? null : member.user.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Configurar Color de Avatar"
                  >
                    <Palette className="w-4 h-4 text-indigo-400" />
                  </button>
                </div>

                {/* Inline Color Palette Picker */}
                {isEditingColor && (
                  <div className="pt-2 border-t border-slate-900 space-y-2 animate-in fade-in">
                    <span className="text-[10px] text-slate-400 font-semibold block">Seleccionar Color Identificador:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {PRESET_AVATAR_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateUserColorMutation.mutate({ userId: member.user.id, color })}
                          className={`w-6 h-6 rounded-full border transition-transform ${
                            member.user.color_avatar === color ? 'border-white scale-125 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <input
                        type="color"
                        value={member.user.color_avatar || '#16a34a'}
                        onChange={(e) => updateUserColorMutation.mutate({ userId: member.user.id, color: e.target.value })}
                        className="w-6 h-6 p-0 rounded-full bg-transparent border-0 cursor-pointer"
                        title="Color Personalizado"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: Dynamic Shared Expense Splitting (Household Default & Monthly Rules) */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" /> División de Gastos Compartidos
            </h4>
            <p className="text-xs text-slate-400">
              Configura la proporción por defecto de la pareja y gestiona reglas mensuales para repartir proporcional a sueldos
            </p>
          </div>

          <button
            onClick={handleOpenNewSplitRule}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Regla Mensual</span>
          </button>
        </div>

        {/* Sub-card 1: Household Default Split Ratio */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Regla Predeterminada del Hogar</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Base por defecto
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Esta división se aplicará automáticamente a cualquier mes que no posea una regla específica sobreescrita.
              </p>
            </div>

            {!isEditingDefaultSplit && (
              <button
                onClick={handleStartEditingDefault}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
              >
                <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Modificar Predeterminado</span>
              </button>
            )}
          </div>

          {!isEditingDefaultSplit ? (
            <div className="space-y-2">
              {/* Visual Bar */}
              <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
                {members.map((m, idx) => {
                  const raw = household?.default_split_ratios?.[m.user.id] ?? 0.5;
                  const pct = Math.round(raw * 100);
                  return (
                    <div
                      key={m.id}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: m.user?.color_avatar || (idx === 0 ? '#10b981' : '#8b5cf6'),
                      }}
                      className="transition-all"
                    />
                  );
                })}
              </div>

              {/* Badges per member */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {members.map((m, idx) => {
                  const raw = household?.default_split_ratios?.[m.user.id] ?? 0.5;
                  const pct = Math.round(raw * 100);
                  return (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white"
                        style={{ backgroundColor: m.user?.color_avatar || (idx === 0 ? '#10b981' : '#8b5cf6') }}
                      >
                        {m.user?.nombre?.[0] || 'U'}
                      </div>
                      <span className="text-slate-300 font-semibold">{m.user?.nombre}:</span>
                      <span className="font-mono font-bold text-white">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2 border-t border-slate-900 animate-in fade-in">
              {/* Member input cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                {members.map((m, idx) => {
                  const pct = defaultSplitRatios[m.user.id] ?? 50;
                  return (
                    <div
                      key={m.id}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white"
                          style={{ backgroundColor: m.user?.color_avatar || (idx === 0 ? '#10b981' : '#8b5cf6') }}
                        >
                          {m.user?.nombre?.[0] || 'U'}
                        </div>
                        <span className="text-xs font-semibold text-slate-200 truncate">{m.user?.nombre}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={pct}
                          onChange={(e) => handleDefaultRatioChange(m.user.id, parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-right font-bold text-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
                        />
                        <span className="text-xs font-bold text-slate-400">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Slider (controlling user 0 vs user 1) */}
              {members.length === 2 && (
                <div className="max-w-md px-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={defaultSplitRatios[members[0].user.id] ?? 50}
                    onChange={(e) => handleDefaultRatioChange(members[0].user.id, parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-2 bg-slate-900 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1 font-mono">
                    <span>100% {members[0].user?.nombre}</span>
                    <span>50% / 50%</span>
                    <span>100% {members[1].user?.nombre}</span>
                  </div>
                </div>
              )}

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 mr-1">Rápidos:</span>
                {[
                  [50, 50],
                  [60, 40],
                  [65, 35],
                  [70, 30],
                  [40, 60],
                  [35, 65],
                  [30, 70],
                ].map(([r1, r2]) => (
                  <button
                    key={`${r1}-${r2}`}
                    type="button"
                    onClick={() => {
                      if (members.length >= 2) {
                        setDefaultSplitRatios({
                          [members[0].user.id]: r1,
                          [members[1].user.id]: r2,
                        });
                      }
                    }}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[11px] font-mono border border-slate-800 transition-colors"
                  >
                    {r1}/{r2}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between max-w-md pt-2">
                <span className="text-xs text-slate-400">
                  Total: <strong className="text-white font-mono">{Object.values(defaultSplitRatios).reduce((a, b) => a + b, 0)}%</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingDefaultSplit(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDefaultSplit}
                    disabled={updateDefaultSplitMutation.isPending}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
                  >
                    {updateDefaultSplitMutation.isPending ? 'Guardando...' : 'Guardar Predeterminado'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sub-card 2: Monthly Split Rules History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Historial de Reglas Mensuales Específicas ({splitRules.length})
              </h5>
              <p className="text-[11px] text-slate-400">
                Meses que tienen una regla propia para repartir gastos proporcionales o personalizados
              </p>
            </div>
          </div>

          {splitRules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {splitRules.map((rule) => {
                const monthName = formatMonthYear(rule.month, rule.year);
                return (
                  <div
                    key={rule.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          {monthName}
                        </span>
                        {rule.nota && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 italic">
                            "{rule.nota}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditSplitRule(rule)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Editar Regla Mensual"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar la regla mensual de ${monthName}? Se recalcularán los movimientos con la regla predeterminada.`)) {
                              deleteSplitRuleMutation.mutate(rule.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Eliminar Regla Mensual"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Member split badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-900">
                      {members.map((m, idx) => {
                        const raw = rule.user_ratios[m.user.id] ?? 0.5;
                        const pct = Math.round(raw * 100);
                        return (
                          <span
                            key={m.id}
                            className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold text-white flex items-center gap-1 shadow-sm"
                            style={{ backgroundColor: m.user?.color_avatar || (idx === 0 ? '#10b981' : '#8b5cf6') }}
                          >
                            {m.user?.nombre?.[0]} {pct}%
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center space-y-1">
              <p className="text-xs text-slate-400">
                No hay reglas mensuales específicas registradas todavía.
              </p>
              <p className="text-[11px] text-slate-500">
                Todos los meses aplican la proporción predeterminada del hogar.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Category Management (List, Edit, Delete, Create) */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" /> Categorías de Gastos ({categories.length})
            </h4>
            <p className="text-xs text-slate-400">Listado de categorías del hogar con su indicador de color y opciones de edición/baja</p>
          </div>

          <button
            onClick={() => {
              resetCatForm();
              setIsNewCategoryOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Categoría</span>
          </button>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {categories.map((cat) => (
              <div key={cat.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-5 h-5 rounded-lg flex-shrink-0 border border-slate-700 shadow-sm"
                    style={{ backgroundColor: cat.color || '#16a34a' }}
                  />
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
            <span>Nueva Regla</span>
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
                  {c.nombre}
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
                        <div
                          className="w-3.5 h-3.5 rounded-md flex-shrink-0 border border-slate-700 shadow-sm"
                          style={{ backgroundColor: m.category?.color || '#16a34a' }}
                        />
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Color Identificador</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-12 h-9 p-1 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white"
                    placeholder="#16a34a"
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
                      {c.nombre} ({c.tipo_gasto})
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

      {/* Monthly Split Modal */}
      <MonthlySplitModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        year={splitModalYear}
        month={splitModalMonth}
      />
    </div>
  );
};
