import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { finanzasApi, coreApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { FinanzasDateRangePicker, DateRange } from '../components/FinanzasDateRangePicker';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { CsvImportModal } from '../components/CsvImportModal';
import { SettlementModal } from '../components/SettlementModal';
import { Receipt, Search, Plus, FileText, Edit3, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Transaction } from '@/types';

export const MovimientosPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { householdMembers: authMembers } = useAuth();

  const [search, setSearch] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
    label: 'Historial Completo',
  });

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [isNewTxOpen, setIsNewTxOpen] = useState<boolean>(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState<boolean>(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState<boolean>(false);
  const [isDeleteFilteredModalOpen, setIsDeleteFilteredModalOpen] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Queries
  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => coreApi.getHousehold(),
  });

  const membersList =
    householdData?.members && householdData.members.length > 0
      ? householdData.members.map((m) => m.user)
      : authMembers;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', filterUser, filterCategory],
    queryFn: () =>
      finanzasApi.getTransactions({
        user_id: filterUser || undefined,
        category_id: filterCategory || undefined,
        limit: 500,
      }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => finanzasApi.getCategories(),
  });

  // Delete Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => finanzasApi.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const deleteFilteredMutation = useMutation({
    mutationFn: () =>
      finanzasApi.deleteFilteredTransactions({
        ids: filteredTransactions.map((tx) => tx.id),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setIsDeleteFilteredModalOpen(false);
    },
  });

  const handleDelete = (tx: Transaction) => {
    if (confirm(`¿Deseas eliminar el movimiento "${tx.descripcion}" por $${tx.monto}?`)) {
      deleteMutation.mutate(tx.id);
    }
  };

  // Filter Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.descripcion.toLowerCase().includes(search.toLowerCase()) ||
        (tx.category?.nombre || '').toLowerCase().includes(search.toLowerCase());

      const matchesType =
        !filterType ||
        (filterType === 'SHARED' && tx.es_compartido) ||
        (filterType === 'PERSONAL' && !tx.es_compartido) ||
        (filterType === 'SETTLEMENT' && tx.tipo === 'SETTLEMENT');

      // Date Range Filter
      let matchesDate = true;
      if (dateRange.startDate || dateRange.endDate) {
        const txDate = new Date(tx.fecha);
        if (dateRange.startDate && txDate < dateRange.startDate) matchesDate = false;
        if (dateRange.endDate && txDate > dateRange.endDate) matchesDate = false;
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }, [transactions, search, filterType, dateRange]);

  // Fix Suma Acumulada: Convert all amounts strictly to Number to prevent string concatenation
  const totalFilteredSum = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => acc + (Number(tx.monto) || 0), 0);
  }, [filteredTransactions]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, startIndex, pageSize]);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Centro de Movimientos</h2>
          <p className="text-xs text-slate-400">Historial completo, filtros por fecha e importación de compras</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSettlementOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <span>Devolución / Reintegros</span>
          </button>

          <button
            onClick={() => setIsCsvImportOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Cargar CSV</span>
          </button>

          <button
            onClick={() => setIsDeleteFilteredModalOpen(true)}
            disabled={filteredTransactions.length === 0 || deleteFilteredMutation.isPending}
            title={
              filteredTransactions.length > 0
                ? `Eliminar los ${filteredTransactions.length} movimientos filtrados`
                : 'No hay movimientos filtrados para eliminar'
            }
            className="px-3.5 py-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Eliminar Filtrados</span>
          </button>

          <button
            onClick={() => setIsNewTxOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>

      {/* <FinanzasNavTabs /> */}

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Text */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar concepto o categoría..."
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Date Range Picker */}
          <FinanzasDateRangePicker
            value={dateRange}
            onChange={(range) => handleFilterChange(setDateRange, range)}
          />

          {/* Filter User */}
          <select
            value={filterUser}
            onChange={(e) => handleFilterChange(setFilterUser, e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="">👤 Todos los Pagadores</option>
            {membersList.map((m) => (
              <option key={m.id} value={m.id}>
                👤 {m.nombre}
              </option>
            ))}
          </select>

          {/* Filter Category */}
          <select
            value={filterCategory}
            onChange={(e) => handleFilterChange(setFilterCategory, e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="">🏷️ Todas las Categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                🏷️ {c.nombre}
              </option>
            ))}
          </select>

          {/* Filter Type */}
          <select
            value={filterType}
            onChange={(e) => handleFilterChange(setFilterType, e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="">⚖️ Todos los Tipos</option>
            <option value="SHARED">🤝 Compartidos 50/50</option>
            <option value="PERSONAL">👤 Personales</option>
            <option value="SETTLEMENT">💸 Devoluciones / Reintegros</option>
          </select>
        </div>

        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80 gap-2">
          <span>
            Mostrando <strong className="text-white">{filteredTransactions.length}</strong> movimientos
          </span>
          <span>
            Suma acumulada: <strong className="text-emerald-400 font-mono">${totalFilteredSum.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="border border-slate-800 rounded-3xl bg-slate-900 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Cargando movimientos...</div>
        ) : filteredTransactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="p-3.5">Fecha</th>
                    <th className="p-3.5">Concepto</th>
                    <th className="p-3.5">Pagador</th>
                    <th className="p-3.5">Categoría</th>
                    <th className="p-3.5">Tipo</th>
                    <th className="p-3.5 text-right">Monto ($ ARS)</th>
                    <th className="p-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                  {paginatedTransactions.map((tx) => {
                    const payerUser = membersList.find((m) => m.id === tx.user_id);
                    const isSettlement = tx.tipo === 'SETTLEMENT';
                    const numMonto = Number(tx.monto) || 0;

                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3.5 font-mono text-slate-400">
                          {tx.fecha ? tx.fecha.split('T')[0] : 'Sin fecha'}
                        </td>
                        <td className="p-3.5 font-semibold text-white">
                          {tx.descripcion}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[10px]"
                              style={{ backgroundColor: payerUser?.color_avatar || '#16a34a' }}
                            >
                              {payerUser?.nombre ? payerUser.nombre[0] : 'U'}
                            </div>
                            <span>{payerUser?.nombre || 'Usuario'}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-300">
                          {tx.category?.nombre || (isSettlement ? 'Devolución de Pareja' : 'Sin categoría')}
                        </td>
                        <td className="p-3.5">
                          {isSettlement ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold border border-indigo-500/30">
                              Devolución
                            </span>
                          ) : tx.es_compartido ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                              50/50
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                              Personal
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                          ${numMonto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingTx(tx)}
                              title="Editar Movimiento"
                              className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(tx)}
                              title="Eliminar Movimiento"
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">Mostrar por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-semibold focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-slate-400">
                  Mostrando {startIndex + 1} - {Math.min(startIndex + pageSize, filteredTransactions.length)} de {filteredTransactions.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-slate-300 font-semibold px-2">
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center space-y-3">
            <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No se encontraron movimientos registrados con los filtros aplicados.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewTransactionModal isOpen={isNewTxOpen} onClose={() => setIsNewTxOpen(false)} />
      <EditTransactionModal transaction={editingTx} isOpen={!!editingTx} onClose={() => setEditingTx(null)} />
      <SettlementModal isOpen={isSettlementOpen} onClose={() => setIsSettlementOpen(false)} />
      <CsvImportModal isOpen={isCsvImportOpen} onClose={() => setIsCsvImportOpen(false)} />

      {/* Delete Filtered Transactions Confirmation Modal */}
      {isDeleteFilteredModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Eliminar movimientos filtrados?</h3>
                <p className="text-xs text-slate-400">Se aplicará el borrado sobre los resultados actuales.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 leading-relaxed">
              Se eliminarán <span className="font-bold text-rose-400">{filteredTransactions.length} registros</span> de movimientos que coinciden con los filtros aplicados. Esta operación no se puede deshacer.
            </p>

            {/* Active Filters Summary Badges */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Filtros Aplicados:</p>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {search && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                    Búsqueda: <strong className="text-white">"{search}"</strong>
                  </span>
                )}
                {filterUser && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                    Usuario: <strong className="text-white">{membersList.find((m) => m.id === filterUser)?.nombre || 'Seleccionado'}</strong>
                  </span>
                )}
                {filterCategory && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                    Categoría: <strong className="text-white">{categories.find((c) => c.id === filterCategory)?.nombre || 'Seleccionada'}</strong>
                  </span>
                )}
                {filterType && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                    Tipo: <strong className="text-white">{filterType === 'SHARED' ? '50/50 Compartido' : filterType === 'PERSONAL' ? 'Personal' : 'Devolución'}</strong>
                  </span>
                )}
                {dateRange.label && dateRange.label !== 'Historial Completo' && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                    Rango: <strong className="text-white">{dateRange.label}</strong>
                  </span>
                )}
                {!search && !filterUser && !filterCategory && !filterType && (!dateRange.label || dateRange.label === 'Historial Completo') && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
                    Sin filtros (Se eliminarán todos los movimientos)
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteFilteredModalOpen(false)}
                disabled={deleteFilteredMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => deleteFilteredMutation.mutate()}
                disabled={deleteFilteredMutation.isPending || filteredTransactions.length === 0}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 flex items-center gap-2 transition disabled:opacity-50"
              >
                {deleteFilteredMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Eliminar {filteredTransactions.length} Movimiento(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
