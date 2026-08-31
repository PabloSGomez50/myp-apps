import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HeartHandshake, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('pablo@myp.local');
  const [password, setPassword] = useState('password123');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    navigate('/finanzas');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <HeartHandshake className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">myp-apps</h2>
          <p className="text-xs text-slate-400">Gestión de Finanzas e Inventario para la Convivencia</p>
        </div>

        {/* Quick Account Switch for convenience */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setEmail('pablo@myp.local')}
            className={`py-2 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 ${
              email === 'pablo@myp.local'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Pablo
          </button>
          <button
            type="button"
            onClick={() => setEmail('pareja@myp.local')}
            className={`py-2 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 ${
              email === 'pareja@myp.local'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-pink-400"></span> Pareja
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <span>Ingresar al Hogar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 border-t border-slate-800/80 pt-4">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Sesión protegida y datos locales en Raspberry Pi 5</span>
        </div>
      </div>
    </div>
  );
};
