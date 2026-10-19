import React, { useState, useEffect } from 'react';
import {
  Scale,
  ArrowLeft,
  Building2,
  FileText,
  ShieldCheck,
  Server,
  Database,
  Lock,
  Mail,
  Cookie,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { LegalDocType } from './modals/LegalModal';

interface LegalPageProps {
  initialDoc?: LegalDocType;
  onGoHome: () => void;
  isDarkMode?: boolean;
}

export const LegalPage: React.FC<LegalPageProps> = ({
  initialDoc = 'mentions',
  onGoHome,
  isDarkMode,
}) => {
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(initialDoc);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeDoc]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9EB] dark:bg-[#18181B] text-[#27272A] dark:text-[#FFF9EB] font-sans antialiased selection:bg-[#5D0D18] selection:text-[#FFF9EB]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full px-4 sm:px-8 py-3.5 bg-[#FFF9EB]/90 dark:bg-[#18181B]/90 backdrop-blur-md border-b border-[#C7B7A3]/40 dark:border-zinc-800 flex items-center justify-between">
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 text-[#6D2932] dark:text-zinc-200 text-xs font-bold hover:bg-[#E8D8C4] dark:hover:bg-zinc-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'accueil</span>
        </button>

        <div className="flex items-center gap-2">
          <img
            src={isDarkMode ? '/Logo_Outlys_Fonce.png' : '/Logo_Outlys_Clair.png'}
            alt="Logo Outlys"
            className="h-8 w-auto object-contain cursor-pointer"
            onClick={onGoHome}
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-2 py-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6D2932]/10 dark:bg-amber-400/10 text-[#6D2932] dark:text-amber-200 text-xs font-bold uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5" />
            <span>Conformité & Transparence</span>
          </div>
          <h1 className="font-serif font-bold text-2xl sm:text-4xl text-[#6D2932] dark:text-[#FFF9EB]">
            Informations Légales & RGPD
          </h1>
          <p className="text-xs sm:text-sm text-[#27272A]/70 dark:text-zinc-400 max-w-xl mx-auto">
            Retrouvez ici en toute transparence l'ensemble de nos mentions légales, conditions d'utilisation
            et engagements stricts en matière de confidentialité.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-[#E8D8C4]/50 dark:bg-zinc-900 border border-[#C7B7A3]/50 dark:border-zinc-800 max-w-2xl mx-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveDoc('mentions')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeDoc === 'mentions'
                ? 'bg-[#6D2932] text-[#FFF9EB] shadow-xs'
                : 'text-[#27272A]/70 dark:text-zinc-400 hover:text-[#6D2932] hover:bg-[#FFF9EB] dark:hover:bg-zinc-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Mentions légales</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDoc('cgu')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeDoc === 'cgu'
                ? 'bg-[#6D2932] text-[#FFF9EB] shadow-xs'
                : 'text-[#27272A]/70 dark:text-zinc-400 hover:text-[#6D2932] hover:bg-[#FFF9EB] dark:hover:bg-zinc-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Conditions d'utilisation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDoc('confidentialite')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeDoc === 'confidentialite'
                ? 'bg-[#6D2932] text-[#FFF9EB] shadow-xs'
                : 'text-[#27272A]/70 dark:text-zinc-400 hover:text-[#6D2932] hover:bg-[#FFF9EB] dark:hover:bg-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Confidentialité (RGPD)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="bg-white/80 dark:bg-zinc-900/70 rounded-3xl border border-[#C7B7A3]/50 dark:border-zinc-800 p-6 sm:p-10 shadow-sm space-y-6">
          {activeDoc === 'mentions' && (
            <section className="space-y-6 animate-fade-in">
              <div className="border-b border-[#C7B7A3]/30 dark:border-zinc-800 pb-4">
                <h2 className="font-serif font-bold text-xl text-[#6D2932] dark:text-[#FFF9EB]">
                  Mentions Légales
                </h2>
                <p className="text-xs text-[#27272A]/60 dark:text-zinc-400 mt-1">
                  Dernière mise à jour : 19 octobre 2026
                </p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-[#27272A] dark:text-zinc-200">
                <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 space-y-2">
                  <h3 className="font-bold text-[#6D2932] dark:text-amber-200 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>1. Éditeur de l'application</span>
                  </h3>
                  <p>
                    L'application mobile et le site web <strong>Outlys</strong> sont édités par{' '}
                    <strong>l'Entreprise individuelle Outlys</strong>, actuellement en cours d'immatriculation au
                    Registre National des Entreprises (RNE) et au Registre du Commerce et des Sociétés (RCS),
                    dispensée d'immatriculation définitive pendant l'instruction légale du dossier.
                  </p>
                  <p className="flex items-center gap-2 text-xs pt-1">
                    <Mail className="w-3.5 h-3.5 text-[#6D2932] dark:text-amber-300" />
                    <span>
                      <strong>Directeur de la publication :</strong> Contact disponible à l'adresse{' '}
                      <a href="mailto:contact@outlys.fr" className="text-[#6D2932] dark:text-amber-300 font-bold underline">
                        contact@outlys.fr
                      </a>
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 space-y-1.5">
                    <h3 className="font-bold text-[#6D2932] dark:text-amber-200 flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      <span>Hébergement Web & API</span>
                    </h3>
                    <p className="text-xs text-[#27272A]/80 dark:text-zinc-300">
                      <strong>Vercel Inc.</strong>
                      <br />
                      440 N Barranca Ave #4133
                      <br />
                      Covina, CA 91723, États-Unis
                      <br />
                      Téléphone : +1 (951) 383-6898
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 space-y-1.5">
                    <h3 className="font-bold text-[#6D2932] dark:text-amber-200 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      <span>Hébergement Base de Données</span>
                    </h3>
                    <p className="text-xs text-[#27272A]/80 dark:text-zinc-300">
                      <strong>Neon, Inc.</strong>
                      <br />
                      1639 11th Street, Suite 101
                      <br />
                      Santa Monica, CA 90404, États-Unis
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 space-y-2">
                  <h3 className="font-bold text-[#6D2932] dark:text-amber-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>2. Propriété intellectuelle</span>
                  </h3>
                  <p>
                    La marque Outlys, son logo, ses illustrations, sa charte graphique ainsi que l'ensemble de ses
                    codes sources et composants sont la propriété exclusive de l'éditeur. Toute reproduction,
                    représentation, modification ou diffusion sans accord écrit préalable est formellement interdite.
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeDoc === 'cgu' && (
            <section className="space-y-6 animate-fade-in">
              <div className="border-b border-[#C7B7A3]/30 dark:border-zinc-800 pb-4">
                <h2 className="font-serif font-bold text-xl text-[#6D2932] dark:text-[#FFF9EB]">
                  Conditions Générales d'Utilisation (CGU)
                </h2>
                <p className="text-xs text-[#27272A]/60 dark:text-zinc-400 mt-1">
                  En vigueur pour l'ensemble des utilisateurs d'Outlys
                </p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-[#27272A] dark:text-zinc-200">
                <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 space-y-2">
                  <h3 className="font-bold text-[#6D2932] dark:text-amber-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>1. Objet et Présentation du Service</span>
                  </h3>
                  <p>
                    Outlys est un service gratuit permettant aux particuliers d'organiser et coordonner leurs sorties,
                    week-ends et voyages. Le service met à disposition un agenda partagé, des discussions de groupe,
                    des sondages interactifs, un calcul optimisé de partage des dépenses ainsi qu'une galerie média partagée.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
                  <h3 className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>2. Responsabilité de l'utilisateur</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-950 dark:text-amber-200">
                    Chaque utilisateur est légalement et personnellement responsable des éléments qu'il publie au sein
                    des groupes et fils d'échanges.
                  </p>
                  <p className="text-xs text-amber-900/90 dark:text-amber-300 font-semibold">
                    Il est expressément prohibé de diffuser tout contenu illicite, haineux, diffamatoire, violent,
                    pornographique, ou enfreignant le droit à l'image et la vie privée de tiers.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 space-y-2">
                  <h3 className="font-bold text-[#6D2932] dark:text-amber-200 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>3. Modération et Résiliation</span>
                  </h3>
                  <p>
                    L'éditeur se réserve la possibilité d'intervenir à tout instant pour supprimer tout contenu non
                    conforme à la charte d'utilisation ou aux lois applicables. En cas de récidive ou d'atteinte grave,
                    le compte de l'utilisateur concerné pourra être définitivement révoqué sans délai.
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeDoc === 'confidentialite' && (
            <section className="space-y-6 animate-fade-in">
              <div className="border-b border-[#C7B7A3]/30 dark:border-zinc-800 pb-4">
                <h2 className="font-serif font-bold text-xl text-[#6D2932] dark:text-[#FFF9EB]">
                  Politique de Confidentialité & Protection des Données (RGPD)
                </h2>
                <p className="text-xs text-[#27272A]/60 dark:text-zinc-400 mt-1">
                  Conformité stricte au Règlement Général sur la Protection des Données (UE 2016/679)
                </p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-[#27272A] dark:text-zinc-200">
                <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 space-y-2.5">
                  <h3 className="font-bold text-[#6D2932] dark:text-amber-200 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>1. Données personnelles traitées & Finalités</span>
                  </h3>
                  <p>
                    Outlys traite uniquement les données strictement nécessaires au fonctionnement des services de
                    planification collaborative :
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                    <li>
                      <strong>Profil utilisateur :</strong> Nom d'affichage, pseudo unique (@handle) et adresse email.
                    </li>
                    <li>
                      <strong>Authentification sécurisée :</strong> Mot de passe systématiquement haché selon des algorithmes
                      cryptographiques irréversibles. Aucun mot de passe en clair n'est jamais stocké.
                    </li>
                    <li>
                      <strong>Contenus collaboratifs :</strong> Photographies partagées dans la galerie commune, montants
                      des dépenses et répartition des parts de frais entre membres.
                    </li>
                  </ul>
                  <div className="p-2.5 rounded-xl bg-[#6D2932]/10 dark:bg-zinc-700/60 text-xs font-semibold text-[#6D2932] dark:text-amber-200">
                    🛡️ <strong>Principe de non-monétisation :</strong> Vos données ne font l'objet d'aucune revente,
                    d'aucune cession commerciale et d'aucun profilage publicitaire.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 space-y-2">
                  <h3 className="font-bold text-[#6D2932] dark:text-amber-200 flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    <span>2. Sous-traitants techniques accrédités</span>
                  </h3>
                  <ul className="space-y-2 text-xs sm:text-sm">
                    <li>
                      <strong>Vercel Inc. :</strong> Infrastructure de distribution et exécution sécurisée de l'API.
                    </li>
                    <li>
                      <strong>Neon Inc. :</strong> Hébergement managé de la base de données PostgreSQL avec chiffrement au repos.
                    </li>
                    <li>
                      <strong>Pusher Channels :</strong> Passerelle WebSocket sécurisée assurant l'acheminement des flux temps réel.
                    </li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 space-y-1.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#6D2932] dark:text-amber-200">
                      Durée de conservation
                    </h4>
                    <p className="text-xs text-[#27272A]/80 dark:text-zinc-300">
                      Les données sont conservées pendant toute la durée active du compte utilisateur.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 space-y-1.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#6D2932] dark:text-amber-200 flex items-center gap-1.5">
                      <Cookie className="w-3.5 h-3.5" />
                      <span>Cookies & Traceurs</span>
                    </h4>
                    <p className="text-xs text-[#27272A]/80 dark:text-zinc-300">
                      Outlys utilise exclusivement des cookies techniques nécessaires à la persistance de session.
                      Aucun cookie tiers ou traceur publicitaire n'est déposé.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-red-50/80 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-2">
                  <h3 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>3. Vos Droits & Droit à l'Oubli</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-red-900 dark:text-red-200">
                    Vous disposez à tout moment d'un droit d'accès, de rectification et d'effacement intégral de vos
                    données personnelles.
                  </p>
                  <p className="text-xs text-red-800/90 dark:text-red-300">
                    Vous pouvez déclencher vous-même la suppression définitive et irréversible de votre compte et de toutes
                    vos données associées via l'option <strong>« Supprimer mon compte »</strong> dans la modale Profil,
                    ou sur simple demande adressée à{' '}
                    <a href="mailto:contact@outlys.fr" className="font-bold underline">
                      contact@outlys.fr
                    </a>.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="text-center pt-4 pb-8">
          <button
            type="button"
            onClick={onGoHome}
            className="px-6 py-2.5 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] font-bold text-xs hover:bg-[#430810] transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            Revenir à l'application Outlys
          </button>
        </div>
      </main>
    </div>
  );
};
