import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, Clock } from 'lucide-react';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  label: string;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

interface PresetOption {
  label: string;
  getRange: () => { startDate: Date | null; endDate: Date | null };
}

const getPresets = (): PresetOption[] => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Este Mes
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Mes Anterior
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  return [
    { label: 'Historial Completo', getRange: () => ({ startDate: null, endDate: null }) },
    { label: 'Este Mes', getRange: () => ({ startDate: firstDayThisMonth, endDate: lastDayThisMonth }) },
    { label: 'Mes Anterior', getRange: () => ({ startDate: firstDayLastMonth, endDate: lastDayLastMonth }) },
    {
      label: 'Últimos 7 días',
      getRange: () => {
        const start = new Date(todayStart);
        start.setDate(start.getDate() - 6);
        return { startDate: start, endDate: todayEnd };
      },
    },
    {
      label: 'Últimos 30 días',
      getRange: () => {
        const start = new Date(todayStart);
        start.setDate(start.getDate() - 29);
        return { startDate: start, endDate: todayEnd };
      },
    },
    {
      label: 'Últimos 90 días',
      getRange: () => {
        const start = new Date(todayStart);
        start.setDate(start.getDate() - 89);
        return { startDate: start, endDate: todayEnd };
      },
    },
  ];
};

export const FinanzasDateRangePicker: React.FC<Props> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');

  const presets = getPresets();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPreset = (preset: PresetOption) => {
    const { startDate, endDate } = preset.getRange();
    onChange({ startDate, endDate, label: preset.label });
    setIsOpen(false);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFrom || !customTo) {
      alert('Ingresa ambas fechas (Desde y Hasta).');
      return;
    }

    const start = new Date(customFrom + 'T00:00:00');
    const end = new Date(customTo + 'T23:59:59');

    if (start > end) {
      alert('La fecha "Desde" debe ser anterior o igual a la fecha "Hasta".');
      return;
    }

    onChange({
      startDate: start,
      endDate: end,
      label: `Del ${customFrom} al ${customTo}`,
    });
    setIsOpen(false);
  };

  return (
    <div className="relative z-30 inline-block" ref={popoverRef}>
      {/* Active Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer select-none"
      >
        <Calendar className="w-4 h-4 text-emerald-400" />
        <span>{value.label || 'Historial Completo'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 space-y-4 z-50 text-xs animate-in fade-in">
          {/* Quick Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-bold text-slate-300 pb-1 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Opciones Rápidas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
              {presets.map((preset) => {
                const isSelected = value.label === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl font-medium text-left transition ${
                      isSelected
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Form */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="font-bold text-slate-300 block">Rango Personalizado</span>
            <form onSubmit={handleApplyCustom} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Desde:</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Hasta:</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition"
              >
                Aplicar Rango
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
