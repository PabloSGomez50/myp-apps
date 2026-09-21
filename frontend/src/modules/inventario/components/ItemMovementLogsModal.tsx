import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventarioApi } from '@/services/api';
import { InventoryItem } from '@/types';
import { X, History, TrendingUp, TrendingDown, RefreshCw, Calendar, FileText } from 'lucide-react';

interface ItemMovementLogsModalProps {
  item: InventoryItem;
  onClose: () => void;
}

export const ItemMovementLogsModal: React.FC<ItemMovementLogsModalProps> = ({ item, onClose }) => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['inventory-item-logs', item.id],
    queryFn: () => inventarioApi.getItemLogs(item.id),
  });

  const getMovementBadge = (tipo: string) => {
    switch (tipo) {
      case 'REPLENISHMENT':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Reposición
          </span>
        );
      case 'CONSUMPTION':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-medium flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Consumo
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Ajuste
          </span>
        );
    }
  };

  const getAvatarColorClass = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'blue':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'purple':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'rose':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'amber':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'indigo':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      default:
        return 'bg-slate-700 text-slate-200 border-slate-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" /> Historial de Movimientos
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Producto: <span className="text-slate-200 font-semibold">{item.nombre}</span> ({item.unidad_medida})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">Cargando movimientos...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No hay movimientos registrados para este producto.
            </div>
          ) : (
            logs.map((log) => {
              const userName = log.user?.nombre || 'Usuario';
              const initial = userName.charAt(0).toUpperCase();
              const changeVal = Number(log.cantidad_cambio);
              const isPositive = changeVal > 0;

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      {/* User avatar badge */}
                      <span
                        className={`w-6 h-6 rounded-full border text-[10px] font-bold flex items-center justify-center shrink-0 ${getAvatarColorClass(
                          log.user?.color_avatar
                        )}`}
                        title={userName}
                      >
                        {initial}
                      </span>
                      <span className="text-slate-300 font-semibold">{userName}</span>
                      {getMovementBadge(log.tipo_movimiento)}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(log.fecha).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {log.nota && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800">
                        <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{log.nota}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <span
                      className={`text-sm font-bold ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? `+${changeVal}` : changeVal} {item.unidad_medida}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
