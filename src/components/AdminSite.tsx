import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Calendar,
  Layers,
  Image as ImageIcon,
  RefreshCw,
  ArrowLeft,
  Lock,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Server,
  Database,
} from 'lucide-react';
import { UserProfile } from '../types';
import { api } from '../services/api';

interface AdminSiteProps {
  currentUser: UserProfile | null;
  onGoHome: () => void;
  isDarkMode?: boolean;
}

interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  activeGroups: number;
  totalPhotos: number;
}

export const AdminSite: React.FC<AdminSiteProps> = ({
  currentUser,
  onGoHome,
  isDarkMode,
}) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);

  const fetchStats = useCallback(async () => {
    if (!currentUser || !currentUser.id) {
      setIsForbidden(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.getAdminStats(currentUser.id);
      if (res && res.stats) {
        setStats(res.stats);
        setAdminEmail(res.adminEmail || currentUser.email);
        setLastUpdated(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setIsForbidden(false);
      } else {
        throw new Error('Données statistiques invalides reçues du serveur.');
      }
    } catch (err: any) {
      console.error('[AdminSite] Erreur chargement statistiques:', err);
      if (err.status === 403 || (err.message && err.message.toLowerCase().includes('réservé'))) {
        setIsForbidden(true);
      } else {
        setErrorMsg(err.message || 'Impossible de récupérer les statistiques administratives.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Écran d'accès refusé (Sécurité stricte)
  if (!currentUser || isForbidden) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-[#FFF9EB] dark:bg-[#18181B] text-[#27272A] dark:text-[#FFF9EB] font-sans">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#E8D8C4]/60 dark:bg-zinc-900/80 border border-red-300 dark:border-red-900/60 shadow-xl text-center space-y-5 animate-scale-in">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shadow-inner">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
              Sécurité stricte • Accès 403
            </span>
            <h1 className="font-serif font-bold text-2xl text-[#6D2932] dark:text-red-200">
              Espace Administrateur Réservé
            </h1>
            <p className="text-xs sm:text-sm text-[#27272A]/75 dark:text-zinc-400 leading-relaxed">
              Cet écran analytique est strictement réservé à l'administrateur système officiel d'Outlys.
              Votre compte actuel n'est pas habilité à consulter ces métriques.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onGoHome}
              className="w-full py-2.5 px-4 rounded-xl bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#430810] transition-colors cursor-pointer shadow-xs"
            >
              Retourner à l'application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9EB] dark:bg-[#18181B] text-[#27272A] dark:text-[#FFF9EB] font-sans antialiased selection:bg-[#5D0D18] selection:text-[#FFF9EB]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full px-4 sm:px-8 py-3.5 bg-[#FFF9EB]/90 dark:bg-[#18181B]/90 backdrop-blur-md border-b border-[#C7B7A3]/40 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 text-[#6D2932] dark:text-zinc-200 text-xs font-bold hover:bg-[#E8D8C4] dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quitter l'administration</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-300 dark:border-emerald-800/50">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Session Administrateur vérifiée ({adminEmail || currentUser.email})</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6D2932] text-[#FFF9EB] text-xs font-bold hover:bg-[#541C24] transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Title & Overview Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#E8D8C4]/80 via-[#FFF9EB] to-[#E8D8C4]/50 dark:from-zinc-900 dark:via-zinc-900/80 dark:to-zinc-800/50 border border-[#C7B7A3]/50 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#6D2932]/10 dark:bg-amber-400/10 text-[#6D2932] dark:text-amber-200 text-xs font-bold uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5" />
              <span>Tableau de bord analytique</span>
            </div>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#6D2932] dark:text-[#FFF9EB]">
              Outlys AdminSite
            </h1>
            <p className="text-xs sm:text-sm text-[#27272A]/70 dark:text-zinc-400">
              Indicateurs de croissance, d'engagement et santé de l'infrastructure en temps réel.
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1 text-xs text-[#27272A]/60 dark:text-zinc-400">
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#6D2932] dark:text-amber-300" />
              <span>Dernier relevé : {lastUpdated || 'En cours...'}</span>
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              API & Base de données en ligne
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-100 dark:bg-red-950/40 border border-red-300 text-red-700 dark:text-red-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* 4 KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Utilisateurs Inscrits */}
          <div className="p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/70 border border-[#C7B7A3]/50 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6D2932] dark:text-amber-200">
                Utilisateurs inscrits
              </span>
              <div className="p-2.5 rounded-2xl bg-[#6D2932]/10 dark:bg-amber-400/10 text-[#6D2932] dark:text-amber-200">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="font-serif font-bold text-3xl sm:text-4xl text-[#27272A] dark:text-[#FFF9EB]">
                {loading ? '...' : (stats?.totalUsers ?? 0)}
              </div>
              <p className="text-[11px] text-[#27272A]/60 dark:text-zinc-400 mt-1">
                Comptes utilisateurs actifs
              </p>
            </div>
          </div>

          {/* 2. Événements Créés */}
          <div className="p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/70 border border-[#C7B7A3]/50 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6D2932] dark:text-amber-200">
                Événements créés
              </span>
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="font-serif font-bold text-3xl sm:text-4xl text-[#27272A] dark:text-[#FFF9EB]">
                {loading ? '...' : (stats?.totalEvents ?? 0)}
              </div>
              <p className="text-[11px] text-[#27272A]/60 dark:text-zinc-400 mt-1">
                Sorties et événements planifiés
              </p>
            </div>
          </div>

          {/* 3. Groupes Actifs */}
          <div className="p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/70 border border-[#C7B7A3]/50 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6D2932] dark:text-amber-200">
                Groupes actifs
              </span>
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="font-serif font-bold text-3xl sm:text-4xl text-[#27272A] dark:text-[#FFF9EB]">
                {loading ? '...' : (stats?.activeGroups ?? 0)}
              </div>
              <p className="text-[11px] text-[#27272A]/60 dark:text-zinc-400 mt-1">
                Espaces de partage collaboratifs
              </p>
            </div>
          </div>

          {/* 4. Photos Partagées */}
          <div className="p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/70 border border-[#C7B7A3]/50 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6D2932] dark:text-amber-200">
                Photos partagées
              </span>
              <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-700 dark:text-purple-300">
                <ImageIcon className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="font-serif font-bold text-3xl sm:text-4xl text-[#27272A] dark:text-[#FFF9EB]">
                {loading ? '...' : (stats?.totalPhotos ?? 0)}
              </div>
              <p className="text-[11px] text-[#27272A]/60 dark:text-zinc-400 mt-1">
                Médias hébergés dans les galeries
              </p>
            </div>
          </div>
        </div>

        {/* Infrastructure & Security Card */}
        <div className="p-6 rounded-3xl bg-white/60 dark:bg-zinc-900/50 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-4">
          <h2 className="font-serif font-bold text-lg text-[#6D2932] dark:text-[#FFF9EB] flex items-center gap-2">
            <Server className="w-4 h-4" />
            <span>Infrastructure & Tiers Techniques</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/60 border border-[#C7B7A3]/30 dark:border-zinc-700/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#6D2932] dark:text-amber-200">Hébergement Vercel</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                  Opérationnel
                </span>
              </div>
              <p className="text-[#27272A]/70 dark:text-zinc-400">
                Serveur Node.js & Edge Network mondial.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/60 border border-[#C7B7A3]/30 dark:border-zinc-700/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#6D2932] dark:text-amber-200">Base Neon PostgreSQL</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                  Connecté
                </span>
              </div>
              <p className="text-[#27272A]/70 dark:text-zinc-400">
                Autoscaling serverless & sauvegardes automatiques.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/60 border border-[#C7B7A3]/30 dark:border-zinc-700/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#6D2932] dark:text-amber-200">Temps Réel Pusher</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                  Actif
                </span>
              </div>
              <p className="text-[#27272A]/70 dark:text-zinc-400">
                Canaux chiffrés pour notifications & messagerie.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
