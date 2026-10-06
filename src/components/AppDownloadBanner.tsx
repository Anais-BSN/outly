import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, QrCode, Sparkles, Apple, ShieldCheck } from 'lucide-react';
import { isNativePlatform } from '../services/nativeService';

interface AppDownloadBannerProps {
  onNavigateToDownload?: () => void;
}

export const AppDownloadBanner: React.FC<AppDownloadBannerProps> = ({
  onNavigateToDownload,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
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

  const handleInstallClick = () => {
    if (onNavigateToDownload) {
      onNavigateToDownload();
    } else {
      window.history.pushState({}, '', '/telecharger');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
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
              id="banner-btn-install"
              onClick={handleInstallClick}
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
    </>
  );
};
