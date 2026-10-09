import React, { useState } from 'react';
import { UserCheck, Sparkles, X, ArrowRight, UserPlus, Loader2, Users } from 'lucide-react';
import { GroupMember, UserProfile } from '../../types';

interface InviteReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  virtualMembers: GroupMember[];
  currentUser: UserProfile;
  onConfirmMerge: (virtualMember: GroupMember) => Promise<void>;
  onContinueAsNew: () => void | Promise<void>;
}

export const InviteReconcileModal: React.FC<InviteReconcileModalProps> = ({
  isOpen,
  onClose,
  groupName,
  virtualMembers,
  currentUser,
  onConfirmMerge,
  onContinueAsNew,
}) => {
  const [mergingId, setMergingId] = useState<string | null>(null);
  const [isJoiningAsNew, setIsJoiningAsNew] = useState(false);

  if (!isOpen || virtualMembers.length === 0) return null;

  const handleMergeClick = async (vm: GroupMember) => {
    const vId = vm.userId || vm.id;
    setMergingId(vId);
    try {
      await onConfirmMerge(vm);
    } finally {
      setMergingId(null);
    }
  };

  const handleNewClick = async () => {
    setIsJoiningAsNew(true);
    try {
      await onContinueAsNew();
    } finally {
      setIsJoiningAsNew(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Card - Calqué sur le design de l'interface Rapprochement de Ajouter un membre */}
      <div
        className="relative w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4 text-[#27272A] dark:text-[#FFF9EB]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] flex items-center justify-center shadow-md shrink-0">
              <UserCheck className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
                Rapprochement de compte
              </h3>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
                Invitation au groupe : <strong>{groupName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bannière explicative & Profil de l'utilisateur connecté */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-xs space-y-2.5">
          <div className="flex items-center gap-1.5 font-bold text-[#5D0D18] dark:text-amber-300">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
            <span>Ce groupe compte des participants ajoutés sans compte. Correspondiez-vous à l'un d'eux ?</span>
          </div>
          <p className="text-xs text-[#27272A] dark:text-zinc-200 leading-relaxed">
            Si vous correspondiez à l'un des participants sans compte listés ci-dessous, sélectionnez votre profil pour récupérer vos dépenses, dettes et parts passées.
          </p>

          {/* Carte du compte utilisateur connecté */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-amber-500/20 shadow-2xs">
            <img
              src={currentUser.avatar || '/Avatar_Herisson.jpg'}
              alt={currentUser.name || currentUser.firstName || 'Vous'}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-[#5D0D18] shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] truncate">
                {currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Utilisateur'} (Vous)
              </div>
              <div className="text-[10.5px] text-[#5D0D18] dark:text-amber-300 truncate font-semibold">
                {currentUser.handle || currentUser.email}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1 : Liste des participants sans compte avec action « C'est moi » */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-[#5D0D18] dark:text-zinc-300 uppercase tracking-wider">
            Associer à un participant sans compte existant :
          </label>

          <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {virtualMembers.map((vm) => {
              const vId = vm.userId || vm.id;
              const vName = vm.name || vm.firstName || 'Participant';
              const isThisMerging = mergingId === vId;

              return (
                <button
                  key={vId}
                  type="button"
                  disabled={Boolean(mergingId) || isJoiningAsNew}
                  onClick={() => handleMergeClick(vm)}
                  className="w-full p-3 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-amber-400/80 dark:border-amber-600/70 hover:border-[#5D0D18] dark:hover:border-amber-400 flex items-center justify-between gap-3 text-left transition-all hover:shadow-md cursor-pointer group active:scale-98 disabled:opacity-50 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={vm.avatar || '/Avatar_Lapin.jpg'}
                      alt={vName}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-400 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-[#27272A] dark:text-[#FFF9EB] block truncate">
                        {vName}
                      </span>
                      <p className="text-[10px] text-[#27272A]/70 dark:text-zinc-400 truncate mt-0.5">
                        Fusionner l'historique des dépenses et dettes
                      </p>
                    </div>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-bold group-hover:bg-[#5D0D18] group-hover:text-white transition-colors shrink-0 flex items-center gap-1 shadow-2xs">
                    {isThisMerging ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Fusion...</span>
                      </>
                    ) : (
                      <>
                        <span>C'est moi</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2 : Option « Je suis un nouveau membre » */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-[11px] font-bold text-[#5D0D18] dark:text-zinc-300 uppercase tracking-wider">
            Rejoindre sans lier :
          </label>

          <button
            type="button"
            disabled={Boolean(mergingId) || isJoiningAsNew}
            onClick={handleNewClick}
            className="w-full p-3 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/70 border border-[#C7B7A3] dark:border-zinc-700 hover:border-[#5D0D18] flex items-center justify-between gap-3 text-left transition-all hover:shadow-xs cursor-pointer group active:scale-98 disabled:opacity-50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#5D0D18] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-[#27272A] dark:text-[#FFF9EB]">
                  Je suis un nouveau membre
                </div>
                <p className="text-[10px] text-[#27272A]/70 dark:text-zinc-400">
                  Créer une nouvelle place de participant distincte dans le groupe
                </p>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] group-hover:bg-[#5D0D18] group-hover:text-white transition-colors shrink-0 flex items-center gap-1">
              {isJoiningAsNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Rejoindre</span>}
            </div>
          </button>
        </div>

        {/* Bouton Annuler */}
        <div className="pt-2 border-t border-[#C7B7A3]/30 dark:border-zinc-800">
          <button
            type="button"
            disabled={Boolean(mergingId) || isJoiningAsNew}
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-[#27272A]/70 dark:text-zinc-400 hover:bg-[#E8D8C4]/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-center"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};
