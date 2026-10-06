import React from 'react';
import {
  Download,
  ArrowLeft,
  Menu,
  Sparkles,
  Calendar,
  Wallet,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile } from '../types';

interface DownloadAppPageProps {
  onBack: () => void;
  onOpenDrawer?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  currentUser?: UserProfile;
}

export const DownloadAppPage: React.FC<DownloadAppPageProps> = ({
  onBack,
  onOpenDrawer,
  isDarkMode = false,
}) => {
  const handleDownloadApk = () => {
    const link = document.createElement('a');
    link.href = '/outlys.apk';
    link.setAttribute('download', 'outlys.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#FFF9EB] dark:bg-[#121214] text-[#27272A] dark:text-[#FFF9EB] flex flex-col selection:bg-[#5D0D18] selection:text-[#FFF9EB] transition-colors relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-gradient-to-b from-[#5D0D18]/15 via-amber-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute -bottom-32 left-1/4 w-[400px] h-[400px] bg-gradient-to-t from-[#5D0D18]/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Top Unified Navigation Bar */}
      <header className="sticky top-0 z-30 w-full bg-[#E8D8C4] dark:bg-[#18181B] border-b border-[#C7B7A3] dark:border-zinc-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Burger Menu */}
          <div className="flex items-center gap-3">
            {onOpenDrawer ? (
              <button
                type="button"
                id="download-page-burger-btn"
                onClick={onOpenDrawer}
                aria-label="Ouvrir le menu"
                className="p-2 rounded-full text-[#6D2932] dark:text-[#FFF9EB] hover:bg-[#FFF9EB]/60 dark:hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
              >
                <Menu className="w-6 h-6 stroke-[2.2]" />
              </button>
            ) : (
              <button
                type="button"
                id="download-page-back-btn"
                onClick={onBack}
                aria-label="Retour"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF9EB]/80 dark:bg-zinc-800 hover:bg-[#FFF9EB] text-[#5D0D18] dark:text-amber-200 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Retour</span>
              </button>
            )}
          </div>

          {/* Center: Brand Logo */}
          <div className="flex items-center justify-center h-full select-none">
            <button
              type="button"
              id="download-page-logo-btn"
              onClick={onBack}
              aria-label="Retour à l'accueil"
              title="Retour à l'accueil"
              className="h-full py-1.5 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 bg-transparent border-none p-0 focus:outline-none"
            >
              <img
                src={isDarkMode ? '/Logo_Outlys_Foncé.png' : '/Logo_Outlys_Clair.png'}
                alt="Outlys"
                className="h-full max-h-12 w-auto object-contain select-none"
              />
            </button>
          </div>

          {/* Right: Return action button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="download-page-return-btn"
              onClick={onBack}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#5D0D18]/10 dark:bg-zinc-800 hover:bg-[#5D0D18]/20 dark:hover:bg-zinc-700 text-[#5D0D18] dark:text-amber-200 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Centered Content: Product Card Presentation */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full z-10">
        <div className="w-full max-w-md bg-[#FFF9EB]/90 dark:bg-[#18181B]/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#C7B7A3]/60 dark:border-zinc-800 shadow-xl space-y-6 text-center">
          {/* Smartphone Mockup */}
          <div className="flex justify-center pt-1">
            <div className="w-44 sm:w-48 bg-zinc-900 dark:bg-zinc-950 rounded-[32px] p-2.5 shadow-2xl border-4 border-zinc-800 dark:border-zinc-700/80 transition-transform hover:scale-[1.02] duration-300">
              {/* Dynamic Island / Speaker Notch */}
              <div className="flex justify-center mb-1.5">
                <div className="w-14 h-3 bg-black rounded-full flex items-center justify-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                  <div className="w-1 h-1 rounded-full bg-blue-900/60" />
                </div>
              </div>

              {/* Mockup Screen Content */}
              <div className="bg-[#FFF9EB] dark:bg-[#18181B] rounded-[22px] p-2.5 space-y-2 border border-[#C7B7A3]/40 dark:border-zinc-800 text-left overflow-hidden">
                {/* Mockup Mini Header */}
                <div className="flex items-center justify-between pb-1 border-b border-[#C7B7A3]/30 dark:border-zinc-800">
                  <div className="flex items-center gap-1">
                    <img
                      src={isDarkMode ? '/Logo_Outlys_Foncé.png' : '/Logo_Outlys_Clair.png'}
                      alt="Logo"
                      className="h-3.5 w-auto object-contain"
                    />
                  </div>
                  <div className="w-4 h-4 rounded-full bg-[#5D0D18] flex items-center justify-center">
                    <span className="text-[7px] text-white font-bold">O</span>
                  </div>
                </div>

                {/* Mockup Group Pill */}
                <div className="p-1.5 rounded-lg bg-[#E8D8C4]/60 dark:bg-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-1 min-w-0">
                    <div className="w-4 h-4 rounded-md bg-[#5D0D18] text-[#FFF9EB] flex items-center justify-center shrink-0">
                      <Users className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-[9px] font-bold text-[#27272A] dark:text-[#FFF9EB] truncate">
                      Week-end Alpes
                    </span>
                  </div>
                  <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-[#5D0D18]/10 text-[#5D0D18] dark:text-amber-200">
                    6 pers.
                  </span>
                </div>

                {/* Mockup Mini Event Card */}
                <div className="p-1.5 rounded-lg bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-0.5">
                  <div className="flex items-center gap-1 text-[8px] font-bold text-[#5D0D18] dark:text-amber-300">
                    <Calendar className="w-2.5 h-2.5" />
                    <span>Départ Chalet</span>
                  </div>
                  <div className="text-[7px] text-[#27272A]/70 dark:text-zinc-400">
                    Vendredi 18:00 • 5 participants
                  </div>
                </div>

                {/* Mockup Mini Expense Breakdown */}
                <div className="p-1.5 rounded-lg bg-[#E8D8C4]/40 dark:bg-zinc-900 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between text-[8px] font-bold">
                    <span className="text-[#5D0D18] dark:text-white flex items-center gap-0.5">
                      <Wallet className="w-2 h-2" />
                      <span>Budget</span>
                    </span>
                    <span className="text-[#5D0D18] dark:text-amber-300">340,00 €</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#C7B7A3]/40 dark:bg-zinc-800 overflow-hidden flex">
                    <div className="w-[45%] h-full bg-[#C28B38]" />
                    <div className="w-[30%] h-full bg-[#5E7A68]" />
                    <div className="w-[25%] h-full bg-[#5D0D18]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary APK Download Action */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              id="btn-download-apk-primary"
              onClick={handleDownloadApk}
              className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-[#5D0D18] via-[#7B1120] to-[#5D0D18] text-[#FFF9EB] text-sm sm:text-base font-bold hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-3 shadow-md border border-[#9A1E30]"
            >
              <Download className="w-5 h-5 stroke-[2.5]" />
              <span>Télécharger l'APK Android</span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#FFF9EB]/20 text-[#FFF9EB] font-mono">
                .apk
              </span>
            </button>
          </div>

          {/* App Stores Cards (Play Store & App Store) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Google Play Store Card */}
            <div className="p-3 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/80 border border-[#C7B7A3]/60 dark:border-zinc-700 flex items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-xs border border-black/5 dark:border-zinc-700 shrink-0">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <path d="M3.6 2.4L13.8 12 3.6 21.6c-.4-.3-.6-.8-.6-1.5V3.9c0-.7.2-1.2.6-1.5z" fill="#00D2FF" />
                    <path d="M17.3 8.7L13.8 12l3.5 3.3 2.1-1.2c.8-.5.8-1.4 0-1.9l-2.1-1.2z" fill="#FFC800" />
                    <path d="M3.6 2.4l10.2 9.6 3.5-3.3L6.1 1.7c-.8-.5-1.8-.2-2.5.7z" fill="#00F076" />
                    <path d="M3.6 21.6c.7.9 1.7 1.2 2.5.7l11.2-7-3.5-3.3-10.2 9.6z" fill="#FF3A44" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                    Google Play
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5D0D18]/10 dark:bg-zinc-700 text-[#5D0D18] dark:text-amber-200 border border-[#5D0D18]/20 dark:border-zinc-600 shrink-0">
                Bientôt
              </span>
            </div>

            {/* Apple App Store Card */}
            <div className="p-3 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/80 border border-[#C7B7A3]/60 dark:border-zinc-700 flex items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-xs border border-black/5 dark:border-zinc-700 shrink-0">
                  <svg className="w-3.5 h-3.5 fill-current text-[#27272A] dark:text-[#FFF9EB]" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.86c.62-.75 1.04-1.8 0.93-2.86-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.76 1 .08 2.02-.5 2.64-1.25z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                    App Store
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5D0D18]/10 dark:bg-zinc-700 text-[#5D0D18] dark:text-amber-200 border border-[#5D0D18]/20 dark:border-zinc-600 shrink-0">
                Bientôt
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-4 text-center border-t border-[#C7B7A3]/30 dark:border-zinc-800 text-xs text-[#27272A]/60 dark:text-zinc-500 z-10">
        <p>© {new Date().getFullYear()} Outlys</p>
      </footer>
    </div>
  );
};
