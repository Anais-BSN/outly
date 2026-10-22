import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  Building2,
  Server,
  Database,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Trash2,
  Cookie,
  Mail,
  UserCheck,
  DollarSign,
  Compass,
  Clock,
} from 'lucide-react';

export type LegalDocType = 'mentions' | 'cgu' | 'confidentialite';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoc?: LegalDocType;
  isDarkMode?: boolean;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialDoc = 'mentions',
}) => {
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(initialDoc);

  useEffect(() => {
    if (isOpen) {
      setActiveDoc(initialDoc);
    }
  }, [isOpen, initialDoc]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl border border-[#C7B7A3]/60 dark:border-zinc-800 shadow-2xl overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-[#C7B7A3]/40 dark:border-zinc-800 flex items-center justify-between bg-[#E8D8C4]/40 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#6D2932] text-[#FFF9EB] shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="legal-modal-title"
                className="font-serif font-bold text-lg sm:text-xl text-[#6D2932] dark:text-[#FFF9EB]"
              >
                Informations légales & Conformité
              </h2>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
                Transparence, sécurité et protection de vos données
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre légale"
            className="p-2 rounded-full text-[#6D2932] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-2 px-4 sm:px-6 border-b border-[#C7B7A3]/30 dark:border-zinc-800 bg-[#FFF9EB]/90 dark:bg-[#18181B] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveDoc('mentions')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeDoc === 'mentions'
                ? 'bg-[#6D2932] text-[#FFF9EB] shadow-xs'
                : 'text-[#27272A]/70 dark:text-zinc-400 hover:text-[#6D2932] hover:bg-[#E8D8C4]/60 dark:hover:bg-zinc-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Mentions légales</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDoc('cgu')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeDoc === 'cgu'
                ? 'bg-[#6D2932] text-[#FFF9EB] shadow-xs'
                : 'text-[#27272A]/70 dark:text-zinc-400 hover:text-[#6D2932] hover:bg-[#E8D8C4]/60 dark:hover:bg-zinc-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Conditions d'utilisation (CGU)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDoc('confidentialite')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeDoc === 'confidentialite'
                ? 'bg-[#6D2932] text-[#FFF9EB] shadow-xs'
                : 'text-[#27272A]/70 dark:text-zinc-400 hover:text-[#6D2932] hover:bg-[#E8D8C4]/60 dark:hover:bg-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Politique de confidentialité (RGPD)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6 text-sm text-[#27272A] dark:text-zinc-200 leading-relaxed font-sans">
          {/* 1. MENTIONS LÉGALES */}
          {activeDoc === 'mentions' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#E8D8C4]/50 dark:bg-zinc-900/80 border border-[#C7B7A3]/50 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <Building2 className="w-4 h-4" />
                  <span>1. Éditeur de la plateforme</span>
                </div>
                <p className="text-xs sm:text-sm">
                  L'application et le service en ligne <strong>Outlys</strong> sont édités par{' '}
                  <strong>l'Entreprise individuelle Outlys</strong>, actuellement en cours d'immatriculation au Registre National des Entreprises (RNE) et au Registre du Commerce et des Sociétés (RCS), dispensée d'immatriculation définitive pendant la phase d'instruction du dossier.
                </p>
                <div className="pt-1 space-y-1 text-xs sm:text-sm">
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#6D2932] dark:text-amber-300 shrink-0" />
                    <span>
                      <strong>Contact officiel :</strong>{' '}
                      <a
                        href="mailto:contact@outlys.fr"
                        className="text-[#6D2932] dark:text-amber-300 font-semibold underline underline-offset-2 hover:opacity-80"
                      >
                        contact@outlys.fr
                      </a>
                    </span>
                  </p>
                  <p>
                    <strong>Directeur de la publication :</strong> Fondateur et responsable de la plateforme Outlys, joignable directement par voie électronique à l'adresse ci-dessus.
                  </p>
                </div>
              </div>

              {/* Hébergement Vercel & Neon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                    <Server className="w-4 h-4" />
                    <span>Hébergement Web & Fonctions API</span>
                  </div>
                  <p className="text-xs text-[#27272A]/90 dark:text-zinc-300">
                    <strong>Vercel Inc.</strong>
                    <br />
                    440 N Barranca Ave #4133
                    <br />
                    Covina, CA 91723, États-Unis
                    <br />
                    Téléphone : +1 (951) 383-6898
                    <br />
                    Site web : vercel.com
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                    <Database className="w-4 h-4" />
                    <span>Hébergement Base de Données</span>
                  </div>
                  <p className="text-xs text-[#27272A]/90 dark:text-zinc-300">
                    <strong>Neon, Inc.</strong>
                    <br />
                    1639 11th Street, Suite 101
                    <br />
                    Santa Monica, CA 90404, États-Unis
                    <br />
                    Infrastructure PostgreSQL serverless gérée et sécurisée
                    <br />
                    Site web : neon.tech
                  </p>
                </div>
              </div>

              {/* Propriété Intellectuelle Complète */}
              <div className="p-4 rounded-2xl bg-[#E8D8C4]/30 dark:bg-zinc-900/40 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>2. Propriété intellectuelle intégrale</span>
                </div>
                <p className="text-xs sm:text-sm">
                  L'ensemble des composants constituant l'application <strong>Outlys</strong> — comprenant sans limitation le code source logiciel, les algorithmes de répartition de frais, les architectures de bases de données, la marque nominale et figurative « Outlys », le nom de domaine <em>outlys.fr</em>, les chartes graphiques, maquettes, logos, interfaces UI/UX, typographies, icônes et textes originaux — sont la propriété exclusive de l'éditeur ou font l'objet d'autorisations d'exploitation.
                </p>
                <p className="text-xs sm:text-sm text-[#27272A]/80 dark:text-zinc-400">
                  Toute reproduction, représentation, adaptation, ingénierie inverse, décompilation, extraction non autorisée ou diffusion totale ou partielle, par quelque procédé que ce soit, est formellement interdite sans accord écrit préalable de l'éditeur et constitue une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.
                </p>
              </div>
            </div>
          )}

          {/* 2. CONDITIONS GÉNÉRALES D'UTILISATION (CGU) */}
          {activeDoc === 'cgu' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#E8D8C4]/50 dark:bg-zinc-900/80 border border-[#C7B7A3]/50 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. Définition et objet du service</span>
                </div>
                <p className="text-xs sm:text-sm">
                  <strong>Outlys</strong> est une application collaborative destinée à simplifier l'organisation d'événements, week-ends, voyages et sorties entre amis. Elle intègre un agenda partagé interactif, une messagerie instantanée de groupe, un module de sondages de dates et d'options, un système de logistique partagée, une galerie de photos collaborative et un outil de calcul de partage des frais.
                </p>
              </div>

              {/* Conditions d'accès & Majorité numérique */}
              <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>2. Conditions d'accès et majorité numérique (Mineurs)</span>
                </div>
                <p className="text-xs sm:text-sm">
                  Conformément à la législation relative à la majorité numérique (Loi n° 2023-566 du 7 juillet 2023 et RGPD) :
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                  <li>
                    <strong>Utilisateurs de 15 ans et plus :</strong> L'accès et la création d'un compte personnel sont autorisés en toute autonomie.
                  </li>
                  <li>
                    <strong>Utilisateurs âgés de 13 et 14 ans inclus :</strong> La création de compte est subordonnée au recueil obligatoire d'une confirmation expresse d'accord des parents ou représentants légaux lors de l'inscription.
                  </li>
                  <li>
                    <strong>Mineurs de moins de 13 ans :</strong> L'inscription et l'utilisation de l'application sont strictement interdites. Tout compte créé en violation de cette règle sera immédiatement clôturé et purgé dès détection.
                  </li>
                </ul>
              </div>

              {/* Règles de conduite & Modération */}
              <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>3. Règles de conduite & Modération (Tolérance Zéro)</span>
                </div>
                <p className="text-xs sm:text-sm">
                  Outlys applique une politique stricte de tolérance zéro envers les comportements malveillants. Il est formellement interdit de publier, transmettre ou stocker :
                </p>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <p>
                    • Tout propos ou contenu constitutif de cyberharcèlement, intimidation, menaces, diffamation, injures ou incitation à la haine et à la violence.
                  </p>
                  <p>
                    • Tout contenu à caractère pédopornographique, sexuellement explicite, violent, illicite ou faisant l'apologie de crimes.
                  </p>
                  <p>
                    • Tout téléversement dans les galeries de photographies prises sans le consentement des personnes représentées ou portant atteinte au droit à l'image et à la vie privée.
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-[#27272A]/80 dark:text-zinc-400">
                  L'éditeur se réserve le droit souverain de masquer, supprimer sans préavis tout contenu contrevenant et de suspendre ou bannir définitivement tout compte en infraction, sans préjudice de poursuites judiciaires.
                </p>
              </div>

              {/* Licence accordée par l'utilisateur sur ses contenus */}
              <div className="p-4 rounded-2xl bg-[#E8D8C4]/30 dark:bg-zinc-900/40 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>4. Propriété et licence sur vos contenus (Photos & Messages)</span>
                </div>
                <p className="text-xs sm:text-sm">
                  Les utilisateurs demeurent les uniques et exclusifs propriétaires des photographies, textes et contenus qu'ils publient sur la plateforme.
                </p>
                <p className="text-xs sm:text-sm text-[#27272A]/85 dark:text-zinc-300">
                  En téléversant un contenu sur Outlys, vous concédez à l'éditeur une licence mondiale, gratuite, non exclusive et limitée dans le temps, strictement restreinte aux opérations techniques indispensables à l'hébergement, la duplication de sauvegarde, le transcodage et l'affichage des contenus aux seuls membres des groupes d'amis auxquels vous participez. Vos photos et médias ne sont en aucun cas cédés, vendus ou utilisés à des fins commerciales par Outlys.
                </p>
              </div>

              {/* Limitations de responsabilité */}
              <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>5. Limitations et exonérations de responsabilité</span>
                </div>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li>
                    <strong>Litiges financiers entre utilisateurs :</strong> Le module de partage de frais n'est qu'un outil de calcul arithmétique indicatif. Outlys n'est ni un établissement bancaire, ni un prestataire de services de paiement, ni un garant des dettes. La plateforme décline toute responsabilité quant à l'exécution effective des remboursements, solvabilité des participants ou litiges survenus entre utilisateurs.
                  </li>
                  <li>
                    <strong>Organisation physique des événements :</strong> Outlys fournit un cadre technique de coordination. L'éditeur ne peut en aucun cas être tenu responsable du déroulement effectif, de la sécurité physique, des accidents, intempéries, annulations, pertes matérielles ou dommages corporels survenus à l'occasion de sorties ou de voyages physiques organisés par les utilisateurs.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* 3. POLITIQUE DE CONFIDENTIALITÉ (RGPD) */}
          {activeDoc === 'confidentialite' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#E8D8C4]/50 dark:bg-zinc-900/80 border border-[#C7B7A3]/50 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <Lock className="w-4 h-4" />
                  <span>1. Données collectées point par point</span>
                </div>
                <p className="text-xs sm:text-sm">
                  Dans le respect du principe de minimisation des données (Article 5 du RGPD), nous collectons exclusivement les informations strictement nécessaires au fonctionnement de l'application :
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                  <li>
                    <strong>Identité du compte :</strong> nom d'affichage, prénom optionnel, pseudo unique (@handle) et adresse e-mail de contact.
                  </li>
                  <li>
                    <strong>Date de naissance :</strong> collectée obligatoirement lors de l'inscription pour vérifier le respect de la majorité numérique légale (15 ans) ou recueillir l'accord parental requis (13-14 ans).
                  </li>
                  <li>
                    <strong>Sécurité :</strong> mot de passe chiffré de façon robuste et irréversible via hachage sécurisé (aucun mot de passe n'est stocké en clair).
                  </li>
                  <li>
                    <strong>Données d'activité :</strong> horodatage de dernière activité (<em>last_active_at</em>) pour la sécurité des sessions et les métriques d'engagement anonymisées.
                  </li>
                  <li>
                    <strong>Contenus collaboratifs :</strong> photos téléversées dans les galeries de groupe, messages et réactions échangés dans les fils de discussion, montants et parts des dépenses partagées.
                  </li>
                </ul>
              </div>

              {/* Durées de conservation précises */}
              <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <Clock className="w-4 h-4" />
                  <span>2. Durées de conservation précises</span>
                </div>
                <ul className="space-y-1.5 text-xs sm:text-sm">
                  <li>
                    <strong>Données du compte actif :</strong> Vos informations sont conservées pendant toute la durée de vie de votre compte.
                  </li>
                  <li>
                    <strong>Suppression de compte :</strong> En cas de suppression du compte par l'utilisateur, l'ensemble des données personnelles, profils et identifiants sont immédiatement et définitivement effacés de la base de données de production.
                  </li>
                  <li>
                    <strong>Purge des événements inactifs :</strong> Les sorties, groupes et événements ne présentant aucune activité pendant une durée continue de 24 mois font l'objet d'un archivage sécurisé puis d'une purge automatique afin d'éviter la conservation superflue de données obsolètes.
                  </li>
                </ul>
              </div>

              {/* Non-partage publicitaire absolu */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/50 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>3. Engagement solennel : Non-partage publicitaire absolu</span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                  Outlys applique une règle intangible : <strong>vos données personnelles ne sont jamais vendues, louées, cédées ni monétisées auprès d'aucun annonceur, régie publicitaire ou courtier de données (data broker).</strong>
                </p>
                <p className="text-xs text-emerald-800/90 dark:text-emerald-300">
                  La plateforme ne pratique aucun profilage commercial, aucune publicité ciblée et n'intègre aucun traceur publicitaire tiers. Seuls nos prestataires techniques d'infrastructure strictement nécessaires (Vercel, Neon, Pusher) hébergent et transmettent les flux de données de manière chiffrée.
                </p>
              </div>

              {/* Droits des utilisateurs & Exercice direct */}
              <div className="p-4 rounded-2xl bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-2">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                  <Trash2 className="w-4 h-4" />
                  <span>4. Droits des utilisateurs & Exercice direct dans l'application</span>
                </div>
                <p className="text-xs sm:text-sm text-red-900 dark:text-red-200">
                  Conformément aux articles 15 à 22 du RGPD, vous disposez d'un droit permanent d'accès, de rectification, de portabilité, de limitation et d'effacement complet (« droit à l'oubli ») de vos données personnelles.
                </p>
                <p className="text-xs text-red-800/90 dark:text-red-300">
                  Vous pouvez exercer ces droits en totale autonomie :
                  <br />
                  • <strong>Suppression immédiate :</strong> via le bouton <strong>« Supprimer mon compte »</strong> accessible directement dans vos paramètres de profil.
                  <br />
                  • <strong>Contact RGPD :</strong> pour toute demande d'export ou de rectification complémentaire, écrivez à{' '}
                  <a href="mailto:contact@outlys.fr" className="underline font-bold">
                    contact@outlys.fr
                  </a>
                  . Nous traitons chaque demande dans un délai légal maximal de 30 jours.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Burgundy Close Button */}
        <div className="p-4 px-5 sm:px-6 border-t border-[#C7B7A3]/40 dark:border-zinc-800 bg-[#E8D8C4]/30 dark:bg-zinc-900/80 flex items-center justify-between">
          <span className="text-[11px] text-[#27272A]/60 dark:text-zinc-400 font-medium">
            Outlys — Conformité RGPD & Sécurité des données
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#430810] active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
