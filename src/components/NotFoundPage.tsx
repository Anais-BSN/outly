import React from 'react';
import { Compass, Home, ArrowLeft } from 'lucide-react';

interface NotFoundPageProps {
  onGoHome: () => void;
  isDarkMode?: boolean;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome, isDarkMode }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-[#FFF9EB] dark:bg-[#18181B] text-[#27272A] dark:text-[#FFF9EB] font-sans antialiased selection:bg-[#5D0D18] selection:text-[#FFF9EB]">
      <div className="w-full max-w-md text-center space-y-6 animate-scale-in">
        {/* Logo Outlys */}
        <div className="flex justify-center">
          <img
            src={isDarkMode ? '/Logo_Outlys_Fonce.png' : '/Logo_Outlys_Clair.png'}
            alt="Logo Outlys - Sorties entre amis"
            className="h-12 w-auto object-contain cursor-pointer"
            onClick={onGoHome}
          />
        </div>

        {/* 404 Card */}
        <div className="p-8 rounded-3xl bg-[#E8D8C4]/50 dark:bg-zinc-900/80 border border-[#C7B7A3]/60 dark:border-zinc-800 shadow-xl space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#6D2932]/10 dark:bg-amber-400/10 flex items-center justify-center text-[#6D2932] dark:text-amber-200 shadow-inner">
            <Compass className="w-9 h-9 animate-spin-slow" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#6D2932] dark:text-amber-300">
              Erreur 404 • Page introuvable
            </span>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#6D2932] dark:text-[#FFF9EB]">
              Cette sortie n'existe pas !
            </h1>
            <p className="text-xs sm:text-sm text-[#27272A]/75 dark:text-zinc-400 leading-relaxed">
              Le chemin que vous tentez d'emprunter semble s'être égaré dans la nature. Ne restez pas isolé, rejoignez le groupe !
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onGoHome}
              className="w-full py-3 px-6 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] text-sm font-bold hover:bg-[#430810] active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 group"
            >
              <Home className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              <span>Revenir à l'accueil d'Outlys</span>
            </button>
          </div>
        </div>

        {/* Subtle footer notice */}
        <p className="text-[11px] text-[#27272A]/50 dark:text-zinc-500 font-medium">
          Outlys — Vos sorties et voyages entre amis en toute sérénité
        </p>
      </div>
    </div>
  );
};
