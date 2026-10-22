import React, { useEffect } from 'react';
import { Home } from 'lucide-react';

interface NotFoundPageProps {
  onGoHome: () => void;
  isDarkMode?: boolean;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome, isDarkMode }) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Cette page n'existe pas ! | Outlys — Simplifiez vos sorties";

    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute('content') : null;
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Outlys — Simplifiez vos sorties');
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) {
        metaDesc.setAttribute('content', prevDesc);
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-[#FFF9EB] dark:bg-[#18181B] text-[#27272A] dark:text-[#FFF9EB] font-sans antialiased selection:bg-[#5D0D18] selection:text-[#FFF9EB]">
      <div className="w-full max-w-lg text-center space-y-6 animate-scale-in">
        {/* 404 Card avec Logo Outlys agrandi et centré */}
        <div className="p-8 sm:p-10 rounded-3xl bg-[#E8D8C4]/50 dark:bg-zinc-900/80 border border-[#C7B7A3]/60 dark:border-zinc-800 shadow-2xl space-y-6">
          {/* Logo d'Outlys grand format centré (Boussole supprimée) */}
          <div className="flex justify-center pt-2">
            <img
              src={isDarkMode ? '/Logo_Outlys_Fonce.png' : '/Logo_Outlys_Clair.png'}
              alt="Logo Outlys — Simplifiez vos sorties"
              className="h-20 sm:h-24 w-auto object-contain cursor-pointer transition-transform hover:scale-105 active:scale-95"
              onClick={onGoHome}
            />
          </div>

          <div className="space-y-3">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-[#6D2932]/10 dark:bg-amber-400/10 text-[#6D2932] dark:text-amber-300 border border-[#6D2932]/20 dark:border-amber-400/20">
              Erreur 404 • Page introuvable
            </span>

            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#6D2932] dark:text-[#FFF9EB]">
              Cette page n'existe pas !
            </h1>

            <p className="text-xs sm:text-sm text-[#27272A]/80 dark:text-zinc-300 leading-relaxed max-w-md mx-auto">
              Le chemin que vous tentez d'emprunter n'existe pas, il semble que vous vous soyez égaré dans la nature. Ne restez pas isolé, rejoignez le groupe !
            </p>
          </div>

          <div className="pt-2 max-w-sm mx-auto">
            <button
              type="button"
              onClick={onGoHome}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] text-sm font-bold hover:bg-[#430810] active:scale-95 transition-all cursor-pointer shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
            >
              <Home className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              <span>Revenir à Outlys</span>
            </button>
          </div>
        </div>

        {/* Footer avec slogan officiel */}
        <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 font-semibold tracking-wide">
          Outlys — Simplifiez vos sorties
        </p>
      </div>
    </div>
  );
};
