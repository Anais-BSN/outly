import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  AtSign,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { UserProfile } from '../../types';
import { api } from '../../services/api';
import { CARTOON_AVATARS } from '../../constants/avatars';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  canClose?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  canClose = true,
}) => {
  if (!isOpen) return null;

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [emailOrHandle, setEmailOrHandle] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [handle, setHandle] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(CARTOON_AVATARS[0].url);

  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Debounced check for handle availability
  useEffect(() => {
    if (!handle.trim()) {
      setHandleAvailable(null);
      return;
    }
    const clean = handle.startsWith('@') ? handle.trim() : `@${handle.trim()}`;
    if (clean.length < 3) {
      setHandleAvailable(null);
      return;
    }

    setCheckingHandle(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkHandle(clean);
        setHandleAvailable(res.available);
        if (!res.available) {
          setErrorMsg('Ce pseudo est déjà utilisé, veuillez en choisir un autre.');
        } else if (errorMsg === 'Ce pseudo est déjà utilisé, veuillez en choisir un autre.') {
          setErrorMsg(null);
        }
      } catch {
        // Ignorer les erreurs réseau temporaires
      } finally {
        setCheckingHandle(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [handle]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrHandle.trim()) {
      setErrorMsg('Veuillez saisir votre e-mail ou pseudo');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Veuillez saisir votre mot de passe');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const user = await api.login(emailOrHandle.trim(), password.trim());
      onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Identifiants invalides ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !registerEmail.trim()) {
      setErrorMsg('Le prénom et l’e-mail sont requis');
      return;
    }

    if (!handle.trim()) {
      setErrorMsg('Le pseudo est obligatoire');
      return;
    }

    const cleanHandle = handle.startsWith('@') ? handle.trim() : `@${handle.trim()}`;

    // Vérifier la disponibilité avant de soumettre
    try {
      setLoading(true);
      setErrorMsg(null);
      const check = await api.checkHandle(cleanHandle);
      if (!check.available) {
        setErrorMsg('Ce pseudo est déjà utilisé, veuillez en choisir un autre.');
        setLoading(false);
        return;
      }
    } catch {
      // Continuer
    }

    if (!registerPassword || registerPassword.length < 4) {
      setErrorMsg('Le mot de passe doit comporter au moins 4 caractères');
      setLoading(false);
      return;
    }

    try {
      const user = await api.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        handle: cleanHandle,
        email: registerEmail.trim(),
        password: registerPassword,
        avatar: selectedAvatar,
      });
      onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="auth-modal-backdrop"
        onClick={() => {
          if (canClose) onClose();
        }}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="auth-modal-card"
        className="relative w-full max-w-md bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-2 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#5D0D18] dark:text-[#FFF9EB]" />
            <h3 className="text-xl font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
              Bienvenue sur Outly
            </h3>
          </div>
          {canClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Switcher: Connexion / Inscription */}
        <div className="flex items-center bg-[#E8D8C4]/60 dark:bg-zinc-800 p-1 rounded-2xl border border-[#C7B7A3]/50">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              authMode === 'login'
                ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                : 'text-[#27272A] dark:text-zinc-300'
            }`}
          >
            Se connecter
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              authMode === 'register'
                ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                : 'text-[#27272A] dark:text-zinc-300'
            }`}
          >
            Créer un compte
          </button>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* FORM 1: LOGIN */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                E-mail ou @pseudo
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={emailOrHandle}
                  onChange={(e) => setEmailOrHandle(e.target.value)}
                  placeholder="thomas.dubois@outly.app ou @thomas"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#5D0D18]"
                />
                <User className="w-4 h-4 text-[#5D0D18] absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#5D0D18]"
                />
                <Lock className="w-4 h-4 text-[#5D0D18] absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !emailOrHandle.trim()}
              className="w-full py-2.5 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* FORM 2: REGISTER */}
        {authMode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            {/* First and Last Name */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Thomas"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 text-xs text-[#27272A] dark:text-[#FFF9EB]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dubois"
                  className="w-full px-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 text-xs text-[#27272A] dark:text-[#FFF9EB]"
                />
              </div>
            </div>

            {/* Pseudo @handle (Mandatory) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB]">
                  Pseudo (@handle) *
                </label>
                {handle.trim().length >= 3 && (
                  <span className="text-[10px] font-semibold">
                    {checkingHandle ? (
                      <span className="text-[#27272A]/70 dark:text-zinc-400">Vérification...</span>
                    ) : handleAvailable === true ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 inline" /> Disponible
                      </span>
                    ) : handleAvailable === false ? (
                      <span className="text-red-600 dark:text-red-400">Déjà pris</span>
                    ) : null}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@thomas"
                  required
                  className={`w-full pl-8 pr-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border text-xs text-[#27272A] dark:text-[#FFF9EB] ${
                    handleAvailable === false
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-[#C7B7A3]/60'
                  }`}
                />
                <AtSign className="w-3.5 h-3.5 text-[#5D0D18] absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                E-mail *
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="thomas@exemple.com"
                  required
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 text-xs text-[#27272A] dark:text-[#FFF9EB]"
                />
                <Mail className="w-3.5 h-3.5 text-[#5D0D18] absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                Mot de passe (au moins 4 caractères) *
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 text-xs text-[#27272A] dark:text-[#FFF9EB]"
                />
                <Lock className="w-3.5 h-3.5 text-[#5D0D18] absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Avatar choice */}
            <div>
              <label className="block text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                Avatar
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-[#E8D8C4]/40 dark:bg-zinc-800/40 border border-[#C7B7A3]/40">
                {CARTOON_AVATARS.slice(0, 4).map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av.url)}
                    className={`p-1 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      selectedAvatar === av.url
                        ? 'ring-2 ring-[#5D0D18] bg-[#FFF9EB] dark:bg-zinc-700'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={av.url} alt={av.name} className="w-8 h-8 rounded-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !firstName.trim() || !handle.trim() || !registerEmail.trim() || handleAvailable === false}
              className="w-full py-2.5 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? 'Création en cours...' : 'Créer mon compte'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
