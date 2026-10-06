import React from 'react';
import {
  Smartphone,
  Download,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Share2,
  Calendar,
  Receipt,
  MessageSquare,
  Vote,
  ExternalLink,
  ChevronRight,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';

interface DownloadAppPageProps {
  onBack: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const DownloadAppPage: React.FC<DownloadAppPageProps> = ({
  onBack,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const handleDownloadApk = () => {
    // Création d'un lien de téléchargement direct vers le fichier APK
    const link = document.createElement('a');
    link.href = '/outlys.apk';
    link.setAttribute('download', 'outlys.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#FFF9EB] dark:bg-[#121214] text-[#27272A] dark:text-[#FFF9EB] flex flex-col selection:bg-[#5D0D18] selection:text-[#FFF9EB] transition-colors">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#FFF9EB]/90 dark:bg-[#121214]/90 backdrop-blur-md border-b border-[#C7B7A3]/40 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="download-page-back-btn"
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E8D8C4]/60 dark:bg-zinc-800 hover:bg-[#E8D8C4] dark:hover:bg-zinc-700 text-[#5D0D18] dark:text-amber-200 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour</span>
            </button>

            <div className="flex items-center gap-2">
              <img
                src={isDarkMode ? '/Logo_Outlys_Foncé.png' : '/Logo_Outlys_Clair.png'}
                alt="Outlys"
                className="h-8 sm:h-9 w-auto object-contain select-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="p-2 rounded-full text-[#5D0D18] dark:text-[#FFF9EB] hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
                aria-label="Changer de thème"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={onBack}
              className="hidden sm:inline-flex px-4 py-2 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Accéder à l'application web
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12 sm:space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5D0D18]/10 dark:bg-zinc-800 border border-[#5D0D18]/20 dark:border-zinc-700 text-[#5D0D18] dark:text-amber-300 text-xs font-bold shadow-2xs animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Application mobile officielle</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-extrabold text-[#5D0D18] dark:text-[#FFF9EB] tracking-tight">
            Emportez Outlys dans toutes vos aventures
          </h1>

          <p className="text-sm sm:text-base text-[#27272A]/80 dark:text-zinc-300 leading-relaxed font-normal">
            Retrouvez vos groupes d'amis, vos agendas partagés, vos sondages et vos comptes en temps réel, partout avec vous, même en déplacement.
          </p>

          {/* Primary Download Button (.apk) */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              id="btn-download-apk-primary"
              onClick={handleDownloadApk}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#5D0D18] via-[#7B1120] to-[#5D0D18] text-[#FFF9EB] text-sm sm:text-base font-bold hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-3 shadow-md border border-[#9A1E30]"
            >
              <Download className="w-5 h-5 stroke-[2.5]" />
              <span>Télécharger l'APK Android</span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#FFF9EB]/20 text-[#FFF9EB] font-mono">
                .apk
              </span>
            </button>
          </div>

          <p className="text-[11px] text-[#27272A]/60 dark:text-zinc-400">
            Version 1.0.0 • Compatible Android 8.0 et supérieur • Gratuit
          </p>
        </section>

        {/* App Stores Cards (Play Store & App Store Placeholders) */}
        <section className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold font-serif text-[#5D0D18] dark:text-[#FFF9EB]">
              Disponibilité sur les stores
            </h2>
            <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
              Les versions officielles certifiées arrivent très bientôt sur vos boutiques d'applications préférées.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            {/* Google Play Store Card */}
            <div className="p-4 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/80 border border-[#C7B7A3]/60 dark:border-zinc-700 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-xs border border-black/5 dark:border-zinc-700">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M3.6 2.4L13.8 12 3.6 21.6c-.4-.3-.6-.8-.6-1.5V3.9c0-.7.2-1.2.6-1.5z" fill="#00D2FF" />
                    <path d="M17.3 8.7L13.8 12l3.5 3.3 2.1-1.2c.8-.5.8-1.4 0-1.9l-2.1-1.2z" fill="#FFC800" />
                    <path d="M3.6 2.4l10.2 9.6 3.5-3.3L6.1 1.7c-.8-.5-1.8-.2-2.5.7z" fill="#00F076" />
                    <path d="M3.6 21.6c.7.9 1.7 1.2 2.5.7l11.2-7-3.5-3.3-10.2 9.6z" fill="#FF3A44" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                    Google Play Store
                  </div>
                  <div className="text-[10px] text-[#27272A]/60 dark:text-zinc-400">
                    Pour téléphones & tablettes Android
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#5D0D18]/10 dark:bg-zinc-700 text-[#5D0D18] dark:text-amber-200 border border-[#5D0D18]/20 dark:border-zinc-600 shrink-0">
                Bientôt disponible
              </span>
            </div>

            {/* Apple App Store Card */}
            <div className="p-4 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/80 border border-[#C7B7A3]/60 dark:border-zinc-700 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-xs border border-black/5 dark:border-zinc-700">
                  <svg className="w-5 h-5 fill-current text-[#27272A] dark:text-[#FFF9EB]" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.86c.62-.75 1.04-1.8 0.93-2.86-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.76 1 .08 2.02-.5 2.64-1.25z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                    Apple App Store
                  </div>
                  <div className="text-[10px] text-[#27272A]/60 dark:text-zinc-400">
                    Pour iPhone & iPad
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#5D0D18]/10 dark:bg-zinc-700 text-[#5D0D18] dark:text-amber-200 border border-[#5D0D18]/20 dark:border-zinc-600 shrink-0">
                Bientôt disponible
              </span>
            </div>
          </div>
        </section>

        {/* Key Features Grid */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-[#5D0D18] dark:text-[#FFF9EB]">
              Pourquoi installer l'application mobile ?
            </h2>
            <p className="text-xs sm:text-sm text-[#27272A]/70 dark:text-zinc-400">
              Une expérience fluide conçue spécialement pour vos smartphones.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Feature 1: Push Notifications */}
            <div className="p-5 rounded-3xl bg-[#E8D8C4]/50 dark:bg-zinc-800/60 border border-[#C7B7A3]/50 dark:border-zinc-700/80 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5 text-amber-200" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#5D0D18] dark:text-[#FFF9EB]">
                Notifications Push & Alertes
              </h3>
              <p className="text-xs text-[#27272A]/75 dark:text-zinc-400 leading-relaxed">
                Soyez prévenu immédiatement lorsqu'un nouvel événement est programmé, qu'un sondage est lancé ou qu'un remboursement est effectué.
              </p>
            </div>

            {/* Feature 2: Connexion Permanente */}
            <div className="p-5 rounded-3xl bg-[#E8D8C4]/50 dark:bg-zinc-800/60 border border-[#C7B7A3]/50 dark:border-zinc-700/80 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5 text-amber-200" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#5D0D18] dark:text-[#FFF9EB]">
                Connexion Permanente
              </h3>
              <p className="text-xs text-[#27272A]/75 dark:text-zinc-400 leading-relaxed">
                Accédez directement à vos sorties sans jamais avoir à retaper vos identifiants ou votre mot de passe.
              </p>
            </div>

            {/* Feature 3: Partage des Frais & Soldes */}
            <div className="p-5 rounded-3xl bg-[#E8D8C4]/50 dark:bg-zinc-800/60 border border-[#C7B7A3]/50 dark:border-zinc-700/80 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] flex items-center justify-center shadow-xs">
                <Receipt className="w-5 h-5 text-amber-200" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#5D0D18] dark:text-[#FFF9EB]">
                Comptes & Dépenses en direct
              </h3>
              <p className="text-xs text-[#27272A]/75 dark:text-zinc-400 leading-relaxed">
                Ajoutez un ticket de restaurant ou une course en quelques secondes avec calcul automatique et équilibrage des dettes.
              </p>
            </div>

            {/* Feature 4: Agenda & Synchronisation */}
            <div className="p-5 rounded-3xl bg-[#E8D8C4]/50 dark:bg-zinc-800/60 border border-[#C7B7A3]/50 dark:border-zinc-700/80 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] flex items-center justify-center shadow-xs">
                <Calendar className="w-5 h-5 text-amber-200" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#5D0D18] dark:text-[#FFF9EB]">
                Agenda partagé & Exports
              </h3>
              <p className="text-xs text-[#27272A]/75 dark:text-zinc-400 leading-relaxed">
                Visualisez le calendrier de toutes vos sorties et synchronisez facilement avec Google Calendar ou Apple Calendar.
              </p>
            </div>

            {/* Feature 5: Sondages & Votes */}
            <div className="p-5 rounded-3xl bg-[#E8D8C4]/50 dark:bg-zinc-800/60 border border-[#C7B7A3]/50 dark:border-zinc-700/80 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] flex items-center justify-center shadow-xs">
                <Vote className="w-5 h-5 text-amber-200" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#5D0D18] dark:text-[#FFF9EB]">
                Sondages interactifs
              </h3>
              <p className="text-xs text-[#27272A]/75 dark:text-zinc-400 leading-relaxed">
                Trouvez facilement le meilleur créneau pour un week-end ou départagez les activités avec vos amis en un clic.
              </p>
            </div>

            {/* Feature 6: Rapidité & Zéro publicité */}
            <div className="p-5 rounded-3xl bg-[#E8D8C4]/50 dark:bg-zinc-800/60 border border-[#C7B7A3]/50 dark:border-zinc-700/80 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] flex items-center justify-center shadow-xs">
                <Zap className="w-5 h-5 text-amber-200" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#5D0D18] dark:text-[#FFF9EB]">
                100% Fluide & Sans Publicité
              </h3>
              <p className="text-xs text-[#27272A]/75 dark:text-zinc-400 leading-relaxed">
                Une application légère, ultra réactive, respectueuse de votre vie privée et totalement gratuite.
              </p>
            </div>
          </div>
        </section>

        {/* 3-Step Installation Guide */}
        <section className="p-6 sm:p-8 rounded-3xl bg-[#E8D8C4]/60 dark:bg-zinc-800/80 border border-[#C7B7A3]/60 dark:border-zinc-700 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold font-serif text-[#5D0D18] dark:text-[#FFF9EB]">
              Comment installer le fichier APK sur Android ?
            </h2>
            <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
              L'installation manuelle ne prend que quelques secondes :
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
              <div className="w-7 h-7 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-extrabold flex items-center justify-center">
                1
              </div>
              <h4 className="font-bold text-xs text-[#5D0D18] dark:text-[#FFF9EB]">
                Téléchargez l'APK
              </h4>
              <p className="text-[11px] text-[#27272A]/70 dark:text-zinc-400">
                Appuyez sur le bouton de téléchargement ci-dessus pour enregistrer le fichier <strong>outlys.apk</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
              <div className="w-7 h-7 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-extrabold flex items-center justify-center">
                2
              </div>
              <h4 className="font-bold text-xs text-[#5D0D18] dark:text-[#FFF9EB]">
                Autorisez l'installation
              </h4>
              <p className="text-[11px] text-[#27272A]/70 dark:text-zinc-400">
                Ouvrez le fichier téléchargé et acceptez l'autorisation d'installation depuis votre navigateur si demandé.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
              <div className="w-7 h-7 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-extrabold flex items-center justify-center">
                3
              </div>
              <h4 className="font-bold text-xs text-[#5D0D18] dark:text-[#FFF9EB]">
                Ouvrez Outlys
              </h4>
              <p className="text-[11px] text-[#27272A]/70 dark:text-zinc-400">
                Lancez l'application, connectez-vous et retrouvez instantanément tous vos groupes !
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleDownloadApk}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Lancer le téléchargement maintenant</span>
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center border-t border-[#C7B7A3]/30 dark:border-zinc-800 text-xs text-[#27272A]/60 dark:text-zinc-500">
        <p>© {new Date().getFullYear()} Outlys — Organisez vos sorties entre amis en toute simplicité.</p>
      </footer>
    </div>
  );
};
