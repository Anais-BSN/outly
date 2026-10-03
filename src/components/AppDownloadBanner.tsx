import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, QrCode, Sparkles, Apple, ShieldCheck } from 'lucide-react';
import { isNativePlatform } from '../services/nativeService';

export const AppDownloadBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isNative, setIsNative] = useState(true); // Default true until mounted to avoid flicker

  useEffect(() => {
    setIsNative(isNativePlatform());
    const dismissed = localStorage.getItem('outly_app_banner_dismissed') === 'true';
    setIsDismissed(dismissed);
  }, []);

  // Rigoureusement masqué sur application native Capacitor ou si l'utilisateur a fermé la bannière
  if (isNative || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('outly_app_banner_dismissed', 'true');
  };

  return (
    <>
      <aside
        aria-label="Promotion application mobile Outlys"
        className="relative z-10 w-full bg-gradient-to-r from-[#5D0D18] via-[#7B1120] to-[#5D0D18] text-[#FFF9EB] py-2.5 px-3 sm:px-6 shadow-md border-y border-[#3d0810] animate-fade-in"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Côté gauche : Icône + Message promotionnel */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#FFF9EB]/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-[#FFF9EB]/20 shadow-xs">
              <Smartphone className="w-4 h-4 text-amber-200" />
            </div>

            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold tracking-tight text-[#FFF9EB] truncate">
                Téléchargez l'application Outlys
              </p>
            </div>
          </div>

          {/* Côté droit : Bouton d'action + Fermeture */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-[#FFF9EB] text-[#5D0D18] text-xs font-bold hover:bg-white hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Installer</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title="Masquer la bannière"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Modal d'installation et présentation de l'application native */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[#FFF9EB] dark:bg-[#1C1C1E] rounded-3xl max-w-md w-full p-6 text-[#27272A] dark:text-[#FFF9EB] border border-[#C7B7A3]/60 dark:border-zinc-700 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] flex items-center justify-center shadow-md">
                  <Smartphone className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#5D0D18] dark:text-[#FFF9EB]">
                    Application Outlys
                  </h3>
                  <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
                    L'expérience complète sur votre mobile
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 py-1 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-[#E8D8C4]/50 dark:bg-zinc-800/60 border border-[#C7B7A3]/40">
                <ShieldCheck className="w-4 h-4 text-[#5D0D18] dark:text-amber-300 mt-0.5 shrink-0" />
                <span><strong>Connexion permanente :</strong> Restez connecté sans jamais avoir à ressaisir votre mot de passe.</span>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-[#E8D8C4]/50 dark:bg-zinc-800/60 border border-[#C7B7A3]/40">
                <Sparkles className="w-4 h-4 text-[#5D0D18] dark:text-amber-300 mt-0.5 shrink-0" />
                <span><strong>Notifications Push & Vibrations :</strong> Soyez alerté instantanément des nouveaux messages, sondages et frais.</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#E8D8C4]/70 dark:bg-zinc-800 text-center space-y-2 border border-[#C7B7A3]/50">
              <p className="text-xs font-bold text-[#5D0D18] dark:text-amber-200">
                Disponible sur iPhone & Android
              </p>
              <p className="text-[11px] text-[#27272A]/70 dark:text-zinc-400">
                Ouvrez Outlys depuis le navigateur de votre smartphone et appuyez sur « Ajouter à l'écran d'accueil » ou synchronisez via l'application native.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Compris !
            </button>
          </div>
        </div>
      )}
    </>
  );
};
