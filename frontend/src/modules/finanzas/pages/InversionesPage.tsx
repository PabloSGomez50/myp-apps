import React, { useState } from 'react';
import { Plus, DollarSign, PieChart, ShieldCheck, Layers, ArrowUpRight } from 'lucide-react';
import { InvestmentAsset, InvestmentType } from '@/types';

export const InversionesPage: React.FC = () => {
  // Sample initial investment assets for demonstration
  const [assets, setAssets] = useState<InvestmentAsset[]>([]);

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [ticker, setTicker] = useState<string>('');
  const [nombre, setNombre] = useState<string>('');
  const [tipo, setTipo] = useState<InvestmentType>('CEDEAR_ETF');
  const [cantidad, setCantidad] = useState<string>('');
  const [precioCompra, setPrecioCompra] = useState<string>('');
  const [precioActual, setPrecioActual] = useState<string>('');
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const newAsset: InvestmentAsset = {
      id: Date.now().toString(),
      ticker: ticker.toUpperCase(),
      nombre,
      tipo,
      cantidad: parseFloat(cantidad) || 0,
      precio_promedio_compra: parseFloat(precioCompra) || 0,
      precio_actual: parseFloat(precioActual) || parseFloat(precioCompra) || 0,
      moneda,
    };
    setAssets([...assets, newAsset]);
    setIsAddOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTicker('');
    setNombre('');
    setTipo('CEDEAR_ETF');
    setCantidad('');
    setPrecioCompra('');
    setPrecioActual('');
    setMoneda('ARS');
  };

  const totalValueARS = assets
    .filter((a) => a.moneda === 'ARS')
    .reduce((acc, a) => acc + a.cantidad * a.precio_actual, 0);

  const totalValueUSD = assets
    .filter((a) => a.moneda === 'USD')
    .reduce((acc, a) => acc + a.cantidad * a.precio_actual, 0);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Portafolio de Inversiones & Ahorro</h2>
          <p className="text-xs text-slate-400">CEDEARs, Fondos Comunes de Inversión (FCI), Dólar MEP y Criptoactivo del hogar</p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Activo / Inversión</span>
        </button>
      </div>

      {/* <FinanzasNavTabs /> */}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Invertido (Pesos ARS)</span>
            <PieChart className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">
            ${totalValueARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" /> CEDEARs & FCIs en Pesos
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Invertido (Dólares USD)</span>
            <DollarSign className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">
            ${totalValueUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })} USD
          </p>
          <p className="text-[11px] text-sky-400 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> Dólar MEP & Cobertura
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Diversificación de Activos</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{assets.length} Instrumentos</p>
          <p className="text-[11px] text-slate-400">CEDEARs ETFs, Acciones y FCIs</p>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="border border-slate-800 rounded-3xl bg-slate-900 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Mis Activos & Tenencias Registradas</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="p-3.5">Ticker / Activo</th>
                <th className="p-3.5">Nombre / Instrumento</th>
                <th className="p-3.5">Tipo de Activo</th>
                <th className="p-3.5 text-right">Cantidad</th>
                <th className="p-3.5 text-right">Precio Actual</th>
                <th className="p-3.5 text-right">Valor Total Estimado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No hay activos registrados en tu portafolio. Haz clic en "+ Registrar Activo / Inversión" para agregar uno.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const totalAssetVal = asset.cantidad * asset.precio_actual;
                  return (
                    <tr key={asset.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5 font-mono font-bold text-emerald-400">{asset.ticker}</td>
                      <td className="p-3.5 font-semibold text-white">{asset.nombre}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold">
                          {asset.tipo.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono">{asset.cantidad}</td>
                      <td className="p-3.5 text-right font-mono text-slate-300">
                        ${asset.precio_actual.toLocaleString('es-AR')} {asset.moneda}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                        ${totalAssetVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {asset.moneda}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Registrar Activo de Inversión</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ticker / Código</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. SPY, NVDA"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Moneda</label>
                  <select
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value as 'ARS' | 'USD')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="ARS">ARS ($)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Instrumento</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. S&P 500 ETF CEDEAR, FCI Money Market"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Inversión</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as InvestmentType)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="CEDEAR_ETF">CEDEAR ETF (ej. SPY, QQQ)</option>
                  <option value="CEDEAR_STOCK">CEDEAR Acción (ej. AAPL, NVDA)</option>
                  <option value="FCI_ARS">FCI Pesos (Money Market / T+1)</option>
                  <option value="FCI_USD">FCI Dólares</option>
                  <option value="CRYPTO">Criptoactivo (ej. BTC, USDT)</option>
                  <option value="SAVINGS_USD">Dólar Ahorro / MEP</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cantidad</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="10"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Precio Actual ($)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="42000"
                    value={precioActual}
                    onChange={(e) => setPrecioActual(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                >
                  Guardar Activo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
