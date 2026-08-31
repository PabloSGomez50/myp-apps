import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Users, LogOut, Check, KeyRound } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, household, householdMembers, switchProfileWithPin, logout } = useAuth();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [selectedTargetUser, setSelectedTargetUser] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectUser = (targetUserId: string) => {
    if (targetUserId === user?.id) {
      setShowSwitchModal(false);
      return;
    }
    setSelectedTargetUser(targetUserId);
    setPin('');
    setErrorMsg('');
  };

  const handleConfirmPin = async () => {
    if (!selectedTargetUser) return;
    const success = await switchProfileWithPin(selectedTargetUser, pin);
    if (success) {
      setShowSwitchModal(false);
      setSelectedTargetUser(null);
      setPin('');
    } else {
      setErrorMsg('PIN incorrecto (usa 4 dígitos)');
    }
  };

  return (
    <>
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400">
            myp
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-wide">
              {household?.nombre || 'myp-apps'}
            </h1>
            <span className="text-xs text-slate-400 block">Moneda: {household?.moneda_principal || 'ARS'}</span>
          </div>
        </div>

        {/* Quick Profile Switcher */}
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={() => setShowSwitchModal(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition text-xs font-medium text-slate-200"
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: user.color_avatar || '#16a34a' }}
              >
                {user.nombre[0]}
              </span>
              <span>{user.nombre}</span>
              <Users className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>
          )}

          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Switch Profile Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1">Cambiar de Perfil</h3>
            <p className="text-xs text-slate-400 mb-4">Selecciona quién está utilizando la app en este momento.</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {householdMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleSelectUser(member.id)}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${
                    selectedTargetUser === member.id || (!selectedTargetUser && user?.id === member.id)
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
                    style={{ backgroundColor: member.color_avatar }}
                  >
                    {member.nombre[0]}
                  </div>
                  <span className="text-xs font-medium">{member.nombre}</span>
                  {user?.id === member.id && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Activo
                    </span>
                  )}
                </button>
              ))}
            </div>

            {selectedTargetUser && selectedTargetUser !== user?.id && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="text-xs text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" /> Ingresa tu PIN de 4 dígitos:
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center tracking-widest text-lg font-mono py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
                {errorMsg && <p className="text-xs text-rose-400 text-center">{errorMsg}</p>}
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedTargetUser(null);
                      setPin('');
                    }}
                    className="flex-1 py-2 text-xs text-slate-400 hover:bg-slate-800 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmPin}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}

            {!selectedTargetUser && (
              <button
                onClick={() => setShowSwitchModal(false)}
                className="w-full py-2 mt-2 text-xs text-slate-400 hover:bg-slate-800 rounded-lg"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
