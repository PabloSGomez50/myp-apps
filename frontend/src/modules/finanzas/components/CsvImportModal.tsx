import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { finanzasApi, coreApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { X, UploadCloud, FileText, CheckCircle2, AlertTriangle, Tag } from 'lucide-react';
import { CsvPreviewRow } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvImportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { householdMembers } = useAuth();

  const [previewRows, setPreviewRows] = useState<CsvPreviewRow[]>([]);
  const [newMappings, setNewMappings] = useState<{ patron: string; category_id: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => coreApi.getHousehold(),
  });

  const membersList =
    householdData?.members && householdData.members.length > 0
      ? householdData.members.map((m) => m.user)
      : householdMembers;

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => finanzasApi.getCategories(),
  });

  const parseCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      setErrorMsg('');
      return finanzasApi.parseCsv(file);
    },
    onSuccess: (res) => {
      setPreviewRows(res.rows);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Error al procesar el archivo CSV.');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async () => {
      // Validate that all rows have a user_id assigned
      const unassignedUser = previewRows.find((r) => !r.user_id);
      if (unassignedUser) {
        throw new Error(`Asigna quién realizó el pago en la fila ${unassignedUser.row_index} ("${unassignedUser.concepto}")`);
      }

      const rowsToImport = previewRows.map((r) => ({
        fecha: new Date(r.fecha).toISOString(),
        concepto: r.concepto,
        monto: r.monto,
        user_id: r.user_id!,
        category_id: r.category_id || undefined,
        es_compartido: true,
      }));

      return finanzasApi.bulkImport({
        rows: rowsToImport,
        new_mappings: newMappings,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['couple-net'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['category-mappings'] });
      alert(`¡Se importaron ${res.imported_count} movimientos correctamente!`);
      onClose();
      resetState();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    },
  });

  const resetState = () => {
    setPreviewRows([]);
    setNewMappings([]);
    setErrorMsg('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseCsvMutation.mutate(file);
    }
  };

  const updateUserForRow = (rowIndex: number, userId: string) => {
    setPreviewRows((prev) =>
      prev.map((r) =>
        r.row_index === rowIndex
          ? {
              ...r,
              user_id: userId,
              user_matched: true,
              user_name: membersList.find((m) => m.id === userId)?.nombre || '',
            }
          : r
      )
    );
  };

  const updateCategoryForRow = (rowIndex: number, categoryId: string, concepto: string) => {
    const catObj = categories.find((c) => c.id === categoryId);
    setPreviewRows((prev) =>
      prev.map((r) =>
        r.row_index === rowIndex
          ? {
              ...r,
              category_id: categoryId,
              category_matched: true,
              category_name: catObj?.nombre || '',
            }
          : r
      )
    );

    // Save auto-mapping rule for future CSV uploads
    const cleanPattern = concepto.trim().toLowerCase();
    setNewMappings((prev) => {
      const filtered = prev.filter((m) => m.patron !== cleanPattern);
      return [...filtered, { patron: cleanPattern, category_id: categoryId }];
    });
  };

  if (!isOpen) return null;

  const totalAmount = previewRows.reduce((acc, r) => acc + r.monto, 0);
  const unmatchedUsersCount = previewRows.filter((r) => !r.user_id).length;
  const unmatchedCategoriesCount = previewRows.filter((r) => !r.category_id).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Importar Compras desde CSV</h3>
              <p className="text-xs text-slate-400">Cargar gastos de convivencia en lote con detección inteligente</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              resetState();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Step 1: Upload File */}
        {previewRows.length === 0 ? (
          <div className="p-10 border-2 border-dashed border-slate-800 hover:border-emerald-500/60 rounded-3xl text-center space-y-4 bg-slate-950/40 transition">
            <UploadCloud className="w-12 h-12 text-slate-500 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-white">Selecciona tu archivo .csv de compras</p>
              <p className="text-[11px] text-slate-400">
                Formato esperado: <code className="font-mono text-emerald-400">Fecha, Concepto, Monto, Quien Pago</code>
              </p>
            </div>
            <label className="inline-block px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-emerald-600/20 transition">
              <span>Seleccionar Archivo CSV</span>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        ) : (
          /* Step 2: Interactive Preview Table */
          <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
            {/* Status Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-4">
                <span className="text-slate-300 font-semibold">
                  Filas a importar: <strong className="text-white font-mono">{previewRows.length}</strong>
                </span>
                <span className="text-slate-300 font-semibold">
                  Total acumulado: <strong className="text-emerald-400 font-mono">${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {unmatchedUsersCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-semibold border border-rose-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {unmatchedUsersCount} sin asignación de usuario
                  </span>
                )}
                {unmatchedCategoriesCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold border border-amber-500/30 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {unmatchedCategoriesCount} sin categoría
                  </span>
                )}
              </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider sticky top-0 backdrop-blur-md">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Concepto</th>
                    <th className="p-3 text-right">Monto ($)</th>
                    <th className="p-3">Pagado Por (Usuario)</th>
                    <th className="p-3">Categoría Vinculada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                  {previewRows.map((row) => (
                    <tr key={row.row_index} className="hover:bg-slate-900/40 transition">
                      <td className="p-3 text-center text-slate-500 font-mono">{row.row_index}</td>
                      <td className="p-3 font-mono text-slate-300">{row.fecha}</td>
                      <td className="p-3 font-medium text-white">{row.concepto}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-100">
                        ${row.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* User Dropdown */}
                      <td className="p-3">
                        <select
                          value={row.user_id || ''}
                          onChange={(e) => updateUserForRow(row.row_index, e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                            row.user_matched
                              ? 'bg-slate-900 border-slate-800 text-white'
                              : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                          }`}
                        >
                          <option value="">-- Seleccionar Usuario --</option>
                          {membersList.map((m) => (
                            <option key={m.id} value={m.id}>
                              👤 {m.nombre}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Category Dropdown */}
                      <td className="p-3">
                        <select
                          value={row.category_id || ''}
                          onChange={(e) => updateCategoryForRow(row.row_index, e.target.value, row.concepto)}
                          className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                            row.category_matched
                              ? 'bg-slate-900 border-slate-800 text-white'
                              : 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                          }`}
                        >
                          <option value="">-- Sin Categoría --</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              🏷️ {cat.nombre}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={resetState}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cambiar Archivo CSV
              </button>

              <button
                type="button"
                disabled={bulkImportMutation.isPending || unmatchedUsersCount > 0}
                onClick={() => bulkImportMutation.mutate()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                {bulkImportMutation.isPending ? (
                  <span>Guardando en BD...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar e Importar ({previewRows.length} Movimientos)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
