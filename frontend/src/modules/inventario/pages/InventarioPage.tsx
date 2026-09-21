import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventarioApi } from '@/services/api';
import { InventoryItem, Location, InventoryCategory } from '@/types';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { LocationModal } from '../components/LocationModal';
import { InventoryCategoryModal } from '../components/InventoryCategoryModal';
import { InventoryItemModal } from '../components/InventoryItemModal';
import { ItemMovementLogsModal } from '../components/ItemMovementLogsModal';
import { SendToShoppingListModal } from '../components/SendToShoppingListModal';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Minus,
  MapPin,
  Tag,
  LayoutGrid,
  Table,
  ShoppingCart,
  History,
  Edit2,
  Trash2,
  Calendar,
} from 'lucide-react';

export const InventarioPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Dual view mode stored in localStorage
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    const saved = localStorage.getItem('inventory_view_mode');
    return saved === 'table' ? 'table' : 'grid';
  });

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('inventory_view_mode', mode);
  };

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);

  // Modals state
  const [locationModal, setLocationModal] = useState<{ isOpen: boolean; location: Location | null }>({
    isOpen: false,
    location: null,
  });

  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    category: InventoryCategory | null;
  }>({
    isOpen: false,
    category: null,
  });

  const [itemModal, setItemModal] = useState<{ isOpen: boolean; item: InventoryItem | null }>({
    isOpen: false,
    item: null,
  });

  const [logsModalItem, setLogsModalItem] = useState<InventoryItem | null>(null);
  const [isSendToShoppingListOpen, setIsSendToShoppingListOpen] = useState<boolean>(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'location' | 'category' | 'item' | null;
    id: string | null;
    name: string | null;
  }>({
    type: null,
    id: null,
    name: null,
  });

  // Queries
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => inventarioApi.getLocations(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: () => inventarioApi.getCategories(),
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory-items', selectedLocation, selectedCategory],
    queryFn: () =>
      inventarioApi.getItems(
        selectedLocation || undefined,
        selectedCategory || undefined
      ),
  });

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['inventory-low-stock'],
    queryFn: () => inventarioApi.getLowStock(),
  });

  // Mutations
  const adjustStockMutation = useMutation({
    mutationFn: ({ id, cambio }: { id: string; cambio: number }) =>
      inventarioApi.adjustStock(id, cambio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (id: string) => inventarioApi.deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setDeleteConfirm({ type: null, id: null, name: null });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => inventarioApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-categories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setDeleteConfirm({ type: null, id: null, name: null });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => inventarioApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      setDeleteConfirm({ type: null, id: null, name: null });
    },
  });

  const handleConfirmDelete = () => {
    if (!deleteConfirm.id) return;
    if (deleteConfirm.type === 'location') {
      deleteLocationMutation.mutate(deleteConfirm.id);
    } else if (deleteConfirm.type === 'category') {
      deleteCategoryMutation.mutate(deleteConfirm.id);
    } else if (deleteConfirm.type === 'item') {
      deleteItemMutation.mutate(deleteConfirm.id);
    }
  };

  // Filter items based on search and low stock toggle
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.nombre.toLowerCase().includes(search.toLowerCase());
    const matchesLowStock = lowStockOnly ? item.stock_actual <= item.stock_minimo : true;
    return matchesSearch && matchesLowStock;
  });

  const getCategoryColorClass = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'blue':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'purple':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'rose':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'amber':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'indigo':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'teal':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'cyan':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-[1750px] mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-400" /> Control de Inventario del Hogar
          </h2>
          <p className="text-xs text-slate-400">Despensa, artículos de limpieza, stock mínimo e historial en tiempo real</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Send Low Stock to Shopping List button */}
          <button
            onClick={() => setIsSendToShoppingListOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <ShoppingCart className="w-4 h-4 text-amber-400" />
            <span>Enviar Faltantes ({lowStockItems.length})</span>
          </button>

          <button
            onClick={() => setLocationModal({ isOpen: true, location: null })}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Ubicación</span>
          </button>

          <button
            onClick={() => setCategoryModal({ isOpen: true, category: null })}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Categoría</span>
          </button>

          <button
            onClick={() => setItemModal({ isOpen: true, item: null })}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Producto</span>
          </button>
        </div>
      </div>

      {/* Locations & Categories Chips Bar */}
      <div className="space-y-2">
        {locations.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Ubicaciones:
            </span>
            <button
              onClick={() => setSelectedLocation('')}
              className={`px-2.5 py-1 rounded-xl text-xs transition shrink-0 ${
                selectedLocation === ''
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Todas ({items.length})
            </button>
            {locations.map((loc) => (
              <div
                key={loc.id}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs shrink-0 transition ${
                  selectedLocation === loc.id
                    ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50 font-bold'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <button onClick={() => setSelectedLocation(selectedLocation === loc.id ? '' : loc.id)}>
                  📍 {loc.nombre} {loc.item_count !== undefined && <span className="opacity-75 font-mono">({loc.item_count})</span>}
                </button>
                <button
                  onClick={() => setLocationModal({ isOpen: true, location: loc })}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-300 transition"
                  title="Editar ubicación"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() =>
                    setDeleteConfirm({ type: 'location', id: loc.id, name: loc.nombre })
                  }
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition"
                  title="Eliminar ubicación"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-emerald-400" /> Categorías:
            </span>
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-2.5 py-1 rounded-xl text-xs transition shrink-0 ${
                selectedCategory === ''
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs shrink-0 transition ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500/50 font-bold'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <button onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}>
                  🏷️ {cat.nombre}
                </button>
                <button
                  onClick={() => setCategoryModal({ isOpen: true, category: cat })}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-300 transition"
                  title="Editar categoría"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() =>
                    setDeleteConfirm({ type: 'category', id: cat.id, name: cat.nombre })
                  }
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition"
                  title="Eliminar categoría"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls Bar: Search, Filters & View Mode */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre de producto (ej. Detergente, Leche)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Low Stock Only Toggle */}
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
              lowStockOnly
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Sólo Stock Bajo</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'grid'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vista en Cuadrícula"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vista en Tabla Condensada"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Cargando inventario...</div>
      ) : filteredItems.length === 0 ? (
        <div className="p-10 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
          <Package className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">
            {search || lowStockOnly || selectedLocation || selectedCategory
              ? 'No se encontraron productos con los filtros seleccionados.'
              : 'No hay productos en el inventario.'}
          </p>
          <button
            onClick={() => setItemModal({ isOpen: true, item: null })}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            + Crear primer producto
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const isLow = item.stock_actual <= item.stock_minimo;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-3xl border transition space-y-3 flex flex-col justify-between ${
                  isLow
                    ? 'bg-rose-950/20 border-rose-500/30 shadow-lg shadow-rose-950/10'
                    : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white tracking-tight">{item.nombre}</h4>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.location && (
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-indigo-400" />
                            {item.location.nombre}
                          </span>
                        )}
                        {item.category && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${getCategoryColorClass(
                              item.category.color
                            )}`}
                          >
                            <Tag className="w-3 h-3" />
                            {item.category.nombre}
                          </span>
                        )}
                      </div>
                    </div>

                    {isLow ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-bold border border-rose-500/30 flex items-center gap-1 shrink-0">
                        <AlertTriangle className="w-3 h-3" /> Stock Bajo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30 shrink-0">
                        OK
                      </span>
                    )}
                  </div>

                  {item.fecha_vencimiento && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>Vence: {new Date(item.fecha_vencimiento).toLocaleDateString('es-AR')}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                  <div>
                    <div className="text-lg font-black font-mono text-white">
                      {item.stock_actual}{' '}
                      <span className="text-xs font-normal text-slate-400">{item.unidad_medida}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Mínimo: {item.stock_minimo}</span>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => adjustStockMutation.mutate({ id: item.id, cambio: -1 })}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                      title="Restar 1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => adjustStockMutation.mutate({ id: item.id, cambio: 1 })}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition"
                      title="Sumar 1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setLogsModalItem(item)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 rounded-lg transition ml-1 border-l border-slate-800"
                      title="Historial de movimientos"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setItemModal({ isOpen: true, item })}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition"
                      title="Editar producto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm({ type: 'item', id: item.id, name: item.nombre })
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CONDENSED TABLE VIEW */
        <div className="overflow-x-auto rounded-3xl border border-slate-800/80 bg-slate-900/60 shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-center">Stock Actual / Mínimo</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((item) => {
                const isLow = item.stock_actual <= item.stock_minimo;
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-800/40 transition ${
                      isLow ? 'bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-white">
                      <div>
                        {item.nombre}
                        {item.fecha_vencimiento && (
                          <div className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-400" /> Vence:{' '}
                            {new Date(item.fecha_vencimiento).toLocaleDateString('es-AR')}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {item.location ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px]">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          {item.location.nombre}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {item.category ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] ${getCategoryColorClass(
                            item.category.color
                          )}`}
                        >
                          <Tag className="w-3 h-3" />
                          {item.category.nombre}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center font-mono font-bold">
                      <span className="text-white text-sm">{item.stock_actual}</span>{' '}
                      <span className="text-slate-500 text-xs">/ {item.stock_minimo}</span>{' '}
                      <span className="text-[10px] text-slate-400 font-normal">{item.unidad_medida}</span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" /> Bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                          OK
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => adjustStockMutation.mutate({ id: item.id, cambio: -1 })}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                          title="Restar 1"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => adjustStockMutation.mutate({ id: item.id, cambio: 1 })}
                          className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                          title="Sumar 1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setLogsModalItem(item)}
                          className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition ml-1 border-l border-slate-800 pl-2"
                          title="Historial"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setItemModal({ isOpen: true, item })}
                          className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({ type: 'item', id: item.id, name: item.nombre })
                          }
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODALS */}
      {locationModal.isOpen && (
        <LocationModal
          location={locationModal.location}
          onClose={() => setLocationModal({ isOpen: false, location: null })}
        />
      )}

      {categoryModal.isOpen && (
        <InventoryCategoryModal
          category={categoryModal.category}
          onClose={() => setCategoryModal({ isOpen: false, category: null })}
        />
      )}

      {itemModal.isOpen && (
        <InventoryItemModal
          item={itemModal.item}
          locations={locations}
          categories={categories}
          onClose={() => setItemModal({ isOpen: false, item: null })}
        />
      )}

      {logsModalItem && (
        <ItemMovementLogsModal
          item={logsModalItem}
          onClose={() => setLogsModalItem(null)}
        />
      )}

      {isSendToShoppingListOpen && (
        <SendToShoppingListModal
          items={lowStockItems.length > 0 ? lowStockItems : items}
          onClose={() => setIsSendToShoppingListOpen(false)}
          onSuccess={() => setIsSendToShoppingListOpen(false)}
        />
      )}

      {/* Confirm Delete Generic Modal */}
      <ConfirmDeleteModal
        isOpen={deleteConfirm.type !== null}
        title={`Eliminar ${
          deleteConfirm.type === 'location'
            ? 'Ubicación'
            : deleteConfirm.type === 'category'
            ? 'Categoría'
            : 'Producto'
        }`}
        description={`¿Estás seguro de que deseas eliminar "${deleteConfirm.name}"? Esta acción no se puede deshacer.`}
        isDeleting={
          deleteLocationMutation.isPending ||
          deleteCategoryMutation.isPending ||
          deleteItemMutation.isPending
        }
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteConfirm({ type: null, id: null, name: null })}
      />
    </div>
  );
};
