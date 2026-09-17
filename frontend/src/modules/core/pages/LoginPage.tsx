import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, UserPlus, LogIn, KeyRound, ShieldCheck, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Login Form State
  const initialSavedEmail = localStorage.getItem('myp_remembered_email') || '';
  const [loginEmail, setLoginEmail] = useState(initialSavedEmail);
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(() => !!initialSavedEmail);
  const [isChangingUser, setIsChangingUser] = useState(false);

  // Register Form State
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regHouseholdName, setRegHouseholdName] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      if (rememberEmail) {
        localStorage.setItem('myp_remembered_email', loginEmail);
      } else {
        localStorage.removeItem('myp_remembered_email');
      }
      await login(loginEmail, loginPassword);
      navigate('/finanzas');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrorMsg(msg || 'Error de autenticación. Verifica tu correo y contraseña.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (regPin && !/^\d{4}$/.test(regPin)) {
      setErrorMsg('El PIN de conmutación debe ser de exactamente 4 dígitos numéricos.');
      return;
    }

    try {
      await register({
        nombre: regNombre,
        email: regEmail,
        password: regPassword,
        pin: regPin || undefined,
        household_name: regHouseholdName || undefined,
      });
      navigate('/finanzas');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrorMsg(msg || 'Error al registrar el usuario u hogar.');
    }
  };

  const hasSavedUser = !!initialSavedEmail && !isChangingUser;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <img
            src="/logo-myp-v1.png"
            alt="myp-apps logo"
            className="w-16 h-16 mx-auto object-contain rounded-2xl shadow-md border border-emerald-500/20"
          />
          <h2 className="text-2xl font-bold text-white tracking-tight">myp-apps</h2>
          <p className="text-xs text-slate-400">Gestión de Finanzas e Inventario para la Convivencia</p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === 'login'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === 'register'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear Hogar / Cuenta</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {hasSavedUser ? (
              /* Saved User Preview Card */
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-sm shadow-md flex-shrink-0">
                    {loginEmail[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{loginEmail}</p>
                    <span className="text-[10px] text-emerald-400 font-semibold block">Usuario Recordado</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingUser(true);
                    setLoginEmail('');
                  }}
                  className="text-[11px] font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition flex-shrink-0"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              /* Standard Email Input */
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@myp.local"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            )}

            {/* Remember Email Toggle (Before Password Field) */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                    rememberEmail ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Recordar mi usuario</span>
                  <span className="text-[10px] text-slate-400 block">Guardar acceso directo en este equipo</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRememberEmail(!rememberEmail)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  rememberEmail ? 'bg-emerald-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    rememberEmail ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Password Input */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Contraseña</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <span>Ingresar al Hogar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                placeholder="Ej. Pablo Gómez"
                value={regNombre}
                onChange={(e) => setRegNombre(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                placeholder="pablo@myp.local"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PIN (4 dígitos)</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="1234"
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Nombre del Hogar Compartido</label>
              <input
                type="text"
                placeholder="Ej. Casa Pablo & Martu"
                value={regHouseholdName}
                onChange={(e) => setRegHouseholdName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Cuenta y Registrar Hogar</span>
            </button>
          </form>
        )}

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 border-t border-slate-800/80 pt-4">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Autenticación en tiempo real con PostgreSQL y JWT</span>
        </div>
      </div>
    </div>
  );
};
