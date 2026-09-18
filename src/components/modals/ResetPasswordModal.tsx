import React, { useState, useEffect } from 'react';
import {
  Lock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  X
} from 'lucide-react';
import { api } from '../../services/api';

interface ResetPasswordModalProps {
  isOpen: boolean;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  token,
  onClose,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !token) return;

    let isMounted = true;
    setVerifying(true);
    setErrorMsg(null);

    api.verifyResetToken(token)
      .then((res) => {
        if (isMounted) {
          if (res.valid) {
            setTokenValid(true);
            setUserEmail(res.email || null);
          } else {
            setTokenValid(false);
            setErrorMsg(res.error || 'Ce lien de réinitialisation est invalide ou a expiré.');
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setTokenValid(false);
          setErrorMsg(err.message || 'Lien de réinitialisation invalide ou expiré.');
        }
      })
      .finally(() => {
        if (isMounted) setVerifying(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('Le nouveau mot de passe doit comporter au moins 4 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Les deux mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.resetPassword(token, newPassword);
      setSuccessMsg(res.message || 'Votre mot de passe a été mis à jour avec succès !');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de réinitialiser le mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="reset-password-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="reset-password-modal-card"
        className="relative w-full max-w-md bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#5D0D18] dark:text-[#FFF9EB]" />
            <h3 className="text-xl font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
              Nouveau mot de passe
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {verifying ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#5D0D18] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
              Vérification de la validité du lien...
            </p>
          </div>
        ) : !tokenValid ? (
          <div className="py-4 space-y-4 text-center">
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg || 'Ce lien de réinitialisation est invalide ou a expiré.'}</span>
            </div>
            <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
              Pour des raisons de sécurité, les liens de réinitialisation expirent au bout d'une heure.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-all cursor-pointer shadow-md"
            >
              Retourner à l'accueil
            </button>
          </div>
        ) : successMsg ? (
          <div className="py-4 space-y-4 text-center">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
              Redirection automatique vers la connexion...
            </p>
            <button
              type="button"
              onClick={onSuccess}
              className="w-full py-2.5 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-all cursor-pointer shadow-md"
            >
              Se connecter maintenant
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {userEmail && (
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
                Définissez un nouveau mot de passe pour le compte <strong>{userEmail}</strong>.
              </p>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Nouveau mot de passe */}
            <div>
              <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                Nouveau mot de passe (au moins 4 caractères) *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#5D0D18]"
                />
                <Lock className="w-4 h-4 text-[#5D0D18] absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#27272A]/60 dark:text-zinc-400 hover:text-[#5D0D18] dark:hover:text-[#FFF9EB] transition-colors cursor-pointer p-0.5"
                  title={showNewPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-label={showNewPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmer le mot de passe */}
            <div>
              <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                Confirmer le mot de passe *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#5D0D18]"
                />
                <Lock className="w-4 h-4 text-[#5D0D18] absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#27272A]/60 dark:text-zinc-400 hover:text-[#5D0D18] dark:hover:text-[#FFF9EB] transition-colors cursor-pointer p-0.5"
                  title={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full py-2.5 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? 'Mise à jour...' : 'Enregistrer le nouveau mot de passe'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
