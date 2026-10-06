import React from 'react';
import {
  Download,
  ArrowLeft,
} from 'lucide-react';

interface DownloadAppPageProps {
  onBack: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const DownloadAppPage: React.FC<DownloadAppPageProps> = ({
  onBack,
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
    <div className="min-h-screen bg-[#FFF9EB] dark:bg-[#121214] text-[#27272A] dark:text-[#FFF9EB] flex flex-col selection:bg-[#5D0D18] selection:text-[#FFF9EB] transition-colors">
      {/* Top Simple Navigation Bar */}
      <header className="w-full px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-start">
          <button
            type="button"
            id="download-page-back-btn"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E8D8C4]/70 dark:bg-zinc-800 hover:bg-[#E8D8C4] dark:hover:bg-zinc-700 text-[#5D0D18] dark:text-amber-200 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full text-center space-y-8">
        {/* Centered Logo */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <img
            src={isDarkMode ? '/Logo_Outlys_Foncé.png' : '/Logo_Outlys_Clair.png'}
            alt="Outlys"
            className="h-16 sm:h-20 w-auto object-contain select-none transition-transform hover:scale-105"
          />
        </div>

        {/* Main APK Download Button */}
        <div className="w-full max-w-sm mx-auto space-y-3">
          <button
            type="button"
            id="btn-download-apk-primary"
            onClick={handleDownloadApk}
            className="w-full px-8 py-4 rounded-2xl bg-gradient-to-r from-[#5D0D18] via-[#7B1120] to-[#5D0D18] text-[#FFF9EB] text-sm sm:text-base font-bold hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-3 shadow-md border border-[#9A1E30]"
          >
            <Download className="w-5 h-5 stroke-[2.5]" />
            <span>Télécharger l'APK Android</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#FFF9EB]/20 text-[#FFF9EB] font-mono">
              .apk
            </span>
          </button>
        </div>

        {/* App Stores Cards (Play Store & App Store Placeholders) */}
        <div className="w-full max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Google Play Store Card */}
          <div className="p-3.5 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/80 border border-[#C7B7A3]/60 dark:border-zinc-700 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-xs border border-black/5 dark:border-zinc-700 shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
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
          <div className="p-3.5 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/80 border border-[#C7B7A3]/60 dark:border-zinc-700 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-xs border border-black/5 dark:border-zinc-700 shrink-0">
                <svg className="w-4 h-4 fill-current text-[#27272A] dark:text-[#FFF9EB]" viewBox="0 0 24 24">
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
      </main>

      {/* Footer */}
      <footer className="py-4 px-4 text-center border-t border-[#C7B7A3]/30 dark:border-zinc-800 text-xs text-[#27272A]/60 dark:text-zinc-500">
        <p>© {new Date().getFullYear()} Outlys</p>
      </footer>
    </div>
  );
};
