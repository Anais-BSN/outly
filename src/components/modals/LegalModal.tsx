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
  ExternalLink,
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
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl border border-[#C7B7A3]/60 dark:border-zinc-800 shadow-2xl overflow-hidden animate-scale-in"
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
                  L'application et le service <strong>Outlys</strong> sont édités par{' '}
                  <strong>l'Entreprise individuelle Outlys</strong> (en cours d'immatriculation au RNE / RCS),
                  dispensée d'immatriculation définitive pendant l'instruction du dossier.
                </p>
                <p className="text-xs sm:text-sm flex items-center gap-1.5 pt-1">
                  <Mail className="w-3.5 h-3.5 text-[#6D2932] dark:text-amber-300 shrink-0" />
                  <span>
                    <strong>Directeur de la publication :</strong> Contact disponible à l'adresse{' '}
                    <a
                      href="mailto:contact@outlys.fr"
                      className="text-[#6D2932] dark:text-amber-300 font-semibold underline underline-offset-2 hover:opacity-80"
                    >
                      contact@outlys.fr
                    </a>
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                    <Server className="w-4 h-4" />
                    <span>Hébergeur de l'application & API</span>
                  </div>
                  <p className="text-xs text-[#27272A]/90 dark:text-zinc-300">
                    <strong>Vercel Inc.</strong>
                    <br />
                    440 N Barranca Ave #4133
                    <br />
                    Covina, CA 91723, États-Unis
                    <br />
                    Téléphone : +1 (951) 383-6898
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                    <Database className="w-4 h-4" />
                    <span>Hébergeur de la base de données</span>
                  </div>
                  <p className="text-xs text-[#27272A]/90 dark:text-zinc-300">
                    <strong>Neon, Inc.</strong>
                    <br />
                    1639 11th Street, Suite 101
                    <br />
                    Santa Monica, CA 90404, États-Unis
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#E8D8C4]/30 dark:bg-zinc-900/40 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>2. Propriété intellectuelle</span>
                </div>
                <p className="text-xs sm:text-sm">
                  L'ensemble des éléments constituant l'application <strong>Outlys</strong> (la marque, le nom, le logo,
                  les illustrations, chartes graphiques, polices et logiciels) sont protégés par le droit de la
                  propriété intellectuelle.
                </p>
                <p className="text-xs sm:text-sm text-[#27272A]/80 dark:text-zinc-400">
                  Toute reproduction, représentation, diffusion ou exploitation totale ou partielle sans autorisation
                  écrite préalable de l'éditeur est strictement interdite.
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
                  <span>1. Définition du service</span>
                </div>
                <p className="text-xs sm:text-sm">
                  <strong>Outlys</strong> est une plateforme gratuite dédiée à l'organisation simplifiée d'événements,
                  week-ends et voyages entre amis. Elle intègre un agenda interactif, une messagerie collaborative,
                  un outil de sondages de dates et d'options, un module de répartition équitable des dépenses
                  (partage de frais), une liste de logistique ainsi qu'une galerie de photos partagée.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>2. Responsabilité de l'utilisateur sur les contenus</span>
                </div>
                <p className="text-xs sm:text-sm">
                  L'utilisateur est seul et exclusivement responsable des propos, photographies, médias et contenus qu'il
                  publie ou transmet sur la plateforme.
                </p>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                  <strong>Interdictions formelles :</strong> Il est strictement interdit de téléverser des images, propos
                  ou fichiers illicites, haineux, violents, diffamatoires, discriminatoires ou portant atteinte aux
                  droits d'autrui ou à la vie privée.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#E8D8C4]/30 dark:bg-zinc-900/40 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <Trash2 className="w-4 h-4" />
                  <span>3. Modalités de modération et de résiliation</span>
                </div>
                <p className="text-xs sm:text-sm">
                  L'éditeur se réserve le droit de modérer, masquer ou supprimer sans préavis tout contenu contrevenant
                  aux présentes CGU ou aux dispositions légales en vigueur.
                </p>
                <p className="text-xs sm:text-sm text-[#27272A]/80 dark:text-zinc-400">
                  En cas d'abus caractérisé ou de manquement répété, l'accès au compte de l'utilisateur pourra être
                  suspendu ou résilié immédiatement, sans préjudice de poursuites éventuelles.
                </p>
              </div>
            </div>
          )}

          {/* 3. POLITIQUE DE CONFIDENTIALITÉ (RGPD) */}
          {activeDoc === 'confidentialite' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#E8D8C4]/50 dark:bg-zinc-900/80 border border-[#C7B7A3]/50 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <Lock className="w-4 h-4" />
                  <span>1. Données collectées & Finalités</span>
                </div>
                <p className="text-xs sm:text-sm">
                  Dans le cadre de votre utilisation d'Outlys, nous collectons strictement les données nécessaires au bon
                  fonctionnement du service :
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                  <li>
                    <strong>Identité du compte :</strong> nom d'affichage, pseudo unique (@handle) et adresse email.
                  </li>
                  <li>
                    <strong>Sécurité :</strong> mot de passe haché de manière irréversible (aucun mot de passe en clair).
                  </li>
                  <li>
                    <strong>Contenus collaboratifs :</strong> photos partagées dans la galerie et fil de groupe, montants
                    et répartitions des dépenses.
                  </li>
                </ul>
                <div className="mt-2 p-2.5 rounded-xl bg-[#6D2932]/10 dark:bg-zinc-800 text-xs font-semibold text-[#6D2932] dark:text-amber-200">
                  🔒 <strong>Finalité exclusive :</strong> Les données sont collectées pour le fonctionnement de
                  l'application. <em>Aucune revente de données à des tiers ni utilisation à des fins publicitaires.</em>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-[#6D2932] dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <Server className="w-4 h-4" />
                  <span>2. Sous-traitants techniques de confiance</span>
                </div>
                <ul className="space-y-1.5 text-xs sm:text-sm">
                  <li>
                    <strong>Vercel Inc. :</strong> Hébergement web et infrastructure d'exécution de l'API.
                  </li>
                  <li>
                    <strong>Neon Inc. :</strong> Stockage sécurisé et résilient de la base de données PostgreSQL.
                  </li>
                  <li>
                    <strong>Pusher Channels :</strong> Transmission chiffrée et instantanée des événements temps réel
                    (notifications, messages, actualisation des sorties).
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-[#E8D8C4]/30 dark:bg-zinc-900/40 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-1.5">
                  <div className="font-bold text-xs uppercase tracking-wider text-[#6D2932] dark:text-amber-200">
                    Durée de conservation
                  </div>
                  <p className="text-xs text-[#27272A]/80 dark:text-zinc-300">
                    Vos données sont conservées tant que votre compte est actif sur Outlys.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#E8D8C4]/30 dark:bg-zinc-900/40 border border-[#C7B7A3]/40 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-1 font-bold text-xs uppercase tracking-wider text-[#6D2932] dark:text-amber-200">
                    <Cookie className="w-3.5 h-3.5" />
                    <span>Cookies & Traceurs</span>
                  </div>
                  <p className="text-xs text-[#27272A]/80 dark:text-zinc-300">
                    Le site n'utilise que des cookies techniques indispensables à la session et aucun traceur
                    publicitaire ou commercial.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-2">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                  <Trash2 className="w-4 h-4" />
                  <span>3. Droits RGPD & Suppression complète</span>
                </div>
                <p className="text-xs sm:text-sm text-red-900 dark:text-red-200">
                  Conformément au RGPD, vous disposez d'un droit permanent d'accès, de rectification et d'effacement
                  complet de vos données personnelles.
                </p>
                <p className="text-xs text-red-800/90 dark:text-red-300">
                  Vous pouvez exercer ce droit à tout moment directement depuis l'application via le bouton de{' '}
                  <strong>« Suppression du compte »</strong> accessible dans les réglages de votre profil, ou en
                  écrivant à <a href="mailto:contact@outlys.fr" className="underline font-bold">contact@outlys.fr</a>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Burgundy Close Button */}
        <div className="p-4 px-5 sm:px-6 border-t border-[#C7B7A3]/40 dark:border-zinc-800 bg-[#E8D8C4]/30 dark:bg-zinc-900/80 flex items-center justify-between">
          <span className="text-[11px] text-[#27272A]/60 dark:text-zinc-400 font-medium">
            Outlys — Conformité & Sécurité
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
