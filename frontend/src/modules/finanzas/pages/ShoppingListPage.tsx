import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { finanzasApi, inventarioApi, coreApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  ShoppingBag,
  Plus,
  Check,
  ArrowRight,
  Sparkles,
  X,
  Store,
  TrendingDown,
  Trash2,
  List,
  Edit2,
  User as UserIcon,
} from 'lucide-react';
import { ShoppingItem, InventoryItem } from '@/types';
import { SupermarketModal } from '../components/SupermarketModal';
import { PriceHistoryModal } from '../components/PriceHistoryModal';
import { PostCheckoutInventorySyncModal } from '../components/PostCheckoutInventorySyncModal';

export const ShoppingListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, householdMembers } = useAuth();

  // Tab & List selection
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED' | 'ALL'>('ACTIVE');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Modals state
  const [isSupermarketModalOpen, setIsSupermarketModalOpen] = useState<boolean>(false);
  const [isPriceHistoryModalOpen, setIsPriceHistoryModalOpen] = useState<boolean>(false);
  const [isCreateListOpen, setIsCreateListOpen] = useState<boolean>(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState<boolean>(false);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // Edit Item State
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [editItemName, setEditItemName] = useState<string>('');
  const [editItemPrice, setEditItemPrice] = useState<string>('');
  const [editItemQty, setEditItemQty] = useState<number>(1);
  const [editItemDiscount, setEditItemDiscount] = useState<string>('');

  // Form State - Create List
  const [newListName, setNewListName] = useState<string>('');
  const [newListSupermarketId, setNewListSupermarketId] = useState<string>('');
  const [newListDiscount, setNewListDiscount] = useState<string>('0');

  // Form State - Add Item
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<string>('');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemDiscount, setNewItemDiscount] = useState<string>('');

  // Form State - Checkout (user_id instead of account_id)
  const [checkoutUserId, setCheckoutUserId] = useState<string>('');
  const [checkoutCategoryId, setCheckoutCategoryId] = useState<string>('');

  // State for Low Stock selection modal
  const [selectedLowStockItems, setSelectedLowStockItems] = useState<
    Record<string, { selected: boolean; cantidad: number; item: InventoryItem }>
  >({});

  // Last completed shopping items to pass to sync modal
  const [lastCheckoutItems, setLastCheckoutItems] = useState<ShoppingItem[]>([]);

  // Queries
  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => coreApi.getHousehold(),
  });

  const membersList =
    householdData?.members && householdData.members.length > 0
      ? householdData.members.map((m) => m.user)
      : householdMembers;

  const selectedPayerUserId = checkoutUserId || user?.id || (membersList[0]?.id ?? '');

  const { data: supermarkets = [] } = useQuery({
    queryKey: ['supermarkets'],
    queryFn: () => finanzasApi.getSupermarkets(),
  });

  const { data: shoppingLists = [], isLoading: isLoadingLists } = useQuery({
    queryKey: ['shopping-lists', activeTab],
    queryFn: () => finanzasApi.getShoppingLists(activeTab === 'ALL' ? undefined : activeTab),
  });

  // Current selected list object
  const currentList = useMemo(() => {
    if (!shoppingLists || shoppingLists.length === 0) return null;
    if (!selectedListId) return shoppingLists[0];
    return shoppingLists.find((l) => l.id === selectedListId) || shoppingLists[0];
  }, [shoppingLists, selectedListId]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => finanzasApi.getCategories(),
  });

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['low-stock-items'],
    queryFn: () => inventarioApi.getLowStock(),
  });

  // Mutations
  const createListMutation = useMutation({
    mutationFn: (data: { nombre: string; descuento_general_porcentaje?: number; supermarket_id?: string | null }) =>
      finanzasApi.createShoppingList(data),
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      setSelectedListId(newList.id);
      setIsCreateListOpen(false);
      setNewListName('');
      setNewListSupermarketId('');
      setNewListDiscount('0');
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: string) => finanzasApi.deleteShoppingList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      setSelectedListId(null);
    },
  });

  const addItemMutation = useMutation({
    mutationFn: ({ listId, item }: { listId: string; item: any }) =>
      finanzasApi.addShoppingItem(listId, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      setIsAddItemOpen(false);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemQty(1);
      setNewItemDiscount('');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) =>
      finanzasApi.updateShoppingItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => finanzasApi.deleteShoppingItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!currentList) throw new Error('No hay lista seleccionada');
      if (!selectedPayerUserId) throw new Error('Selecciona quién realizó la compra');
      if (!checkoutCategoryId) throw new Error('Selecciona una categoría');

      return finanzasApi.checkoutShoppingList(currentList.id, {
        user_id: selectedPayerUserId,
        category_id: checkoutCategoryId,
        descripcion: `Compra ${currentList.nombre}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsCheckoutOpen(false);

      if (currentList) {
        setLastCheckoutItems(currentList.items);
        setIsSyncModalOpen(true);
      }
    },
  });

  // Handle supermarket selection in Create List Modal
  const handleSupermarketChangeInModal = (smId: string) => {
    setNewListSupermarketId(smId);
    const sm = supermarkets.find((s) => s.id === smId);
    if (sm) {
      setNewListDiscount(String(sm.descuento_habitual_porcentaje || 0));
    }
  };

  const handleCreateListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    createListMutation.mutate({
      nombre: newListName.trim(),
      supermarket_id: newListSupermarketId || null,
      descuento_general_porcentaje: parseFloat(newListDiscount) || 0,
    });
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentList || !newItemName.trim()) return;

    addItemMutation.mutate({
      listId: currentList.id,
      item: {
        nombre: newItemName.trim(),
        precio_unitario: parseFloat(newItemPrice) || 0,
        cantidad: newItemQty,
        descuento_especifico_porcentaje: newItemDiscount !== '' ? parseFloat(newItemDiscount) : undefined,
      },
    });
  };

  // Open Edit Item Modal
  const openEditItemModal = (item: ShoppingItem) => {
    setEditingItem(item);
    setEditItemName(item.nombre);
    setEditItemPrice(item.precio_unitario ? String(item.precio_unitario) : '');
    setEditItemQty(item.cantidad || 1);
    setEditItemDiscount(
      item.descuento_especifico_porcentaje !== null && item.descuento_especifico_porcentaje !== undefined
        ? String(item.descuento_especifico_porcentaje)
        : ''
    );
  };

  const handleEditItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const price = parseFloat(editItemPrice) || 0;
    const discountVal = editItemDiscount !== '' ? parseFloat(editItemDiscount) : null;

    updateItemMutation.mutate({
      itemId: editingItem.id,
      data: {
        nombre: editItemName.trim(),
        precio_unitario: price,
        cantidad: editItemQty,
        descuento_especifico_porcentaje: discountVal,
      },
    });

    setEditingItem(null);
  };

  // Open Low Stock Modal & Populate State
  const openLowStockModal = () => {
    if (lowStockItems.length === 0) {
      alert('¡No hay productos con stock bajo en el inventario actualmente!');
      return;
    }

    const initial: typeof selectedLowStockItems = {};
    lowStockItems.forEach((it) => {
      const neededQty = Math.max(1, Math.ceil(Number(it.stock_minimo) - Number(it.stock_actual)));
      initial[it.id] = { selected: true, cantidad: neededQty, item: it };
    });

    setSelectedLowStockItems(initial);
    setIsLowStockModalOpen(true);
  };

  const handleAddLowStockItemsToList = async () => {
    if (!currentList) return;

    const toAdd = Object.values(selectedLowStockItems).filter((val) => val.selected);

    for (const entry of toAdd) {
      await finanzasApi.addShoppingItem(currentList.id, {
        nombre: entry.item.nombre,
        precio_unitario: 0,
        cantidad: entry.cantidad,
        inventory_item_id: entry.item.id,
      });
    }

    queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    setIsLowStockModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-400" /> Lista de Compras Inteligente
          </h2>
          <p className="text-xs text-slate-400">
            Orquestación de compras con supermercados, descuentos jerárquicos e integración con Inventario
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSupermarketModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Supermercados</span>
          </button>

          <button
            onClick={() => setIsPriceHistoryModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <TrendingDown className="w-4 h-4 text-blue-400" />
            <span>Histórico Precios</span>
          </button>

          <button
            onClick={openLowStockModal}
            className="px-3 py-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>Importar Faltantes</span>
          </button>
        </div>
      </div>

      {/* Multi-list Selector Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          {/* Tabs Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 self-start">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Activas
            </button>
            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'COMPLETED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Finalizadas
            </button>
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'ALL' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas
            </button>
          </div>

          {/* New List Button */}
          <button
            onClick={() => setIsCreateListOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition cursor-pointer self-end sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Nueva Lista
          </button>
        </div>

        {/* List Selectors Grid */}
        {isLoadingLists ? (
          <div className="text-xs text-slate-400 py-2 text-center">Cargando listas de compras...</div>
        ) : shoppingLists.length === 0 ? (
          <div className="text-xs text-slate-400 py-4 text-center">
            No hay listas de compras en esta sección. ¡Crea una nueva lista arriba!
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {shoppingLists.map((list) => {
              const isSelected = currentList?.id === list.id;
              return (
                <button
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <List className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{list.nombre}</span>
                  {list.is_completed && (
                    <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[10px]">
                      Finalizada
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected List Active Details */}
      {currentList && (
        <div className="space-y-6">
          {/* List Metadata Card */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {currentList.nombre}
                  {currentList.is_completed && (
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      ✓ Finalizada
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  {currentList.supermarket ? (
                    <span className="text-slate-300 font-medium">
                      Comercio: <strong>{currentList.supermarket.nombre}</strong>
                    </span>
                  ) : (
                    <span>Sin comercio asignado</span>
                  )}
                  <span>•</span>
                  <span>Desc. Base: <strong className="text-emerald-400">-{currentList.descuento_general_porcentaje}%</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {!currentList.is_completed && (
                <button
                  onClick={() => setIsAddItemOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Agregar Producto
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar la lista ${currentList.nombre}?`)) {
                    deleteListMutation.mutate(currentList.id);
                  }
                }}
                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                title="Eliminar Lista"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">
                Ítems de la Lista ({currentList.items.length})
              </span>
            </div>

            {currentList.items.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800/80">
                Esta lista no tiene productos cargados todavía.
              </div>
            ) : (
              <div className="space-y-2">
                {currentList.items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      item.comprado
                        ? 'bg-slate-950/40 border-slate-800/40 text-slate-500'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          updateItemMutation.mutate({
                            itemId: item.id,
                            data: { comprado: !item.comprado },
                          })
                        }
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition cursor-pointer ${
                          item.comprado
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-slate-700 bg-slate-900 hover:border-emerald-500'
                        }`}
                      >
                        {item.comprado && <Check className="w-4 h-4" />}
                      </button>
                      <div>
                        <p className={`text-xs font-semibold ${item.comprado ? 'line-through text-slate-500' : 'text-white'}`}>
                          {item.nombre}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>Precio: <strong className="text-slate-200">${Number(item.precio_unitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></span>
                          <span>•</span>
                          {item.descuento_especifico_porcentaje !== null && item.descuento_especifico_porcentaje !== undefined ? (
                            <span className="text-amber-400 font-medium">
                              Desc. específico: {item.descuento_especifico_porcentaje}%
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Desc. lista: {item.descuento_aplicado_porcentaje}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                      {/* Quick Quantity Counter */}
                      {!currentList.is_completed && (
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.cantidad > 1) {
                                updateItemMutation.mutate({
                                  itemId: item.id,
                                  data: { cantidad: item.cantidad - 1 },
                                });
                              }
                            }}
                            disabled={item.cantidad <= 1}
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer text-xs font-bold"
                            title="Disminuir cantidad"
                          >
                            -
                          </button>
                          <span className="w-7 text-center text-xs font-bold font-mono text-white">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateItemMutation.mutate({
                                itemId: item.id,
                                data: { cantidad: item.cantidad + 1 },
                              })
                            }
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer text-xs font-bold"
                            title="Aumentar cantidad"
                          >
                            +
                          </button>
                        </div>
                      )}

                      {/* Final Total */}
                      <div className="text-right min-w-[90px]">
                        <span className="text-xs font-bold font-mono text-white">
                          ${Number(item.precio_final_calculado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="block text-[10px] text-emerald-400 font-mono">
                          -{item.descuento_aplicado_porcentaje}% apl.
                        </span>
                      </div>

                      {/* Actions: Edit & Delete */}
                      {!currentList.is_completed && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditItemModal(item)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Modificar precio, cantidad o descuento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                            title="Borrar producto"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout Bar */}
          {!currentList.is_completed && (
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400">Total a Pagar (con descuentos):</span>
                <div className="text-2xl font-black text-white font-mono">
                  ${Number(currentList.total_con_descuentos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-slate-400">
                  División 50/50: <strong>${Number(currentList.division_50_50).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong> cada uno
                </span>
              </div>

              <button
                onClick={() => setIsCheckoutOpen(true)}
                disabled={currentList.items.length === 0}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
              >
                <span>Finalizar Compra y Registrar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Supermarkets Management */}
      <SupermarketModal
        isOpen={isSupermarketModalOpen}
        onClose={() => setIsSupermarketModalOpen(false)}
      />

      {/* Modal: Food Price History */}
      <PriceHistoryModal
        isOpen={isPriceHistoryModalOpen}
        onClose={() => setIsPriceHistoryModalOpen(false)}
      />

      {/* Modal: Post Checkout Inventory Sync */}
      <PostCheckoutInventorySyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        shoppingItems={lastCheckoutItems}
      />

      {/* Modal: Create Shopping List */}
      {isCreateListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Nueva Lista de Compras</h3>
              <button onClick={() => setIsCreateListOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateListSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Lista</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Compra Semanal Coto"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Supermercado / Comercio</label>
                <select
                  value={newListSupermarketId}
                  onChange={(e) => handleSupermarketChangeInModal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="">Sin comercio específico</option>
                  {supermarkets.map((sm) => (
                    <option key={sm.id} value={sm.id}>
                      {sm.nombre} {sm.descuento_habitual_porcentaje > 0 ? `(-${sm.descuento_habitual_porcentaje}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descuento General Base (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={newListDiscount}
                  onChange={(e) => setNewListDiscount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateListOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createListMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Crear Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Item */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Agregar Producto a Lista</h3>
              <button onClick={() => setIsAddItemOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Arroz 1kg, Leche..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Precio Unitario ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descuento Específico del Producto (%) - Opcional
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Heredar descuento de la lista"
                  value={newItemDiscount}
                  onChange={(e) => setNewItemDiscount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addItemMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Item */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Modificar Producto</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditItemSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Precio Unitario ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editItemPrice}
                    onChange={(e) => setEditItemPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={editItemQty}
                    onChange={(e) => setEditItemQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descuento Específico del Producto (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="Dejar vacío para heredar descuento de la lista"
                  value={editItemDiscount}
                  onChange={(e) => setEditItemDiscount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Si se deja en blanco, heredará el descuento general ({currentList?.descuento_general_porcentaje || 0}%) de la lista.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateItemMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Low Stock Import Picker */}
      {isLowStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Importar Faltantes de Inventario
              </h3>
              <button onClick={() => setIsLowStockModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Selecciona qué productos con stock bajo deseas agregar a la lista actual y la cantidad deseada.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {lowStockItems.map((item) => {
                const conf = selectedLowStockItems[item.id] || {
                  selected: true,
                  cantidad: 1,
                  item,
                };

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={conf.selected}
                        onChange={() =>
                          setSelectedLowStockItems((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], selected: !prev[item.id]?.selected },
                          }))
                        }
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-semibold text-white">{item.nombre}</span>
                        <div className="text-[10px] text-slate-400">
                          Stock Actual: <span className="text-rose-400 font-bold">{item.stock_actual}</span> / Mín: {item.stock_minimo}
                        </div>
                      </div>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Cant:</span>
                      <input
                        type="number"
                        min="1"
                        value={conf.cantidad}
                        onChange={(e) =>
                          setSelectedLowStockItems((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              cantidad: parseInt(e.target.value) || 1,
                            },
                          }))
                        }
                        className="w-14 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-white font-bold"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsLowStockModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddLowStockItemsToList}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Agregar Seleccionados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Checkout */}
      {isCheckoutOpen && currentList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Finalizar Compra (Checkout 50/50)</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Total neto a pagar: <strong className="text-white font-mono">${Number(currentList.total_con_descuentos).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS</strong> (división 50/50).
            </p>

            {checkoutMutation.isError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs">
                {(checkoutMutation.error as Error).message}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                checkoutMutation.mutate();
              }}
              className="space-y-4"
            >
              {/* Member Selection (Who paid) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-400" /> ¿Quién realizó esta compra?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {membersList.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setCheckoutUserId(m.id)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-xs font-medium cursor-pointer ${
                        selectedPayerUserId === m.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-white'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0"
                        style={{ backgroundColor: m.color_avatar || '#16a34a' }}
                      >
                        {m.nombre[0]}
                      </div>
                      <span className="truncate">{m.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría del Gasto</label>
                <select
                  required
                  value={checkoutCategoryId}
                  onChange={(e) => setCheckoutCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="">-- Seleccionar Categoría --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={checkoutMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  {checkoutMutation.isPending ? 'Procesando...' : 'Confirmar Checkout 50/50'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
