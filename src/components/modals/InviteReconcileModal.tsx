import React from 'react';
import { UserCheck, Sparkles, X, ArrowRight, UserPlus } from 'lucide-react';
import { GroupMember, UserProfile } from '../../types';

interface InviteReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  virtualMembers: GroupMember[];
  currentUser: UserProfile;
  onConfirmMerge: (virtualMember: GroupMember) => Promise<void>;
  onContinueAsNew: () => void;
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
  if (!isOpen || virtualMembers.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#FFF9EB] dark:bg-[#1C1C1E] rounded-3xl max-w-md w-full p-6 text-[#27272A] dark:text-[#FFF9EB] border border-[#C7B7A3]/60 dark:border-zinc-700 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la fenêtre */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] flex items-center justify-center shadow-md">
              <UserCheck className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#5D0D18] dark:text-[#FFF9EB]">
                Êtes-vous déjà présent dans ce groupe ?
              </h3>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
                Groupe « {groupName} »
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message explicatif */}
        <div className="p-3.5 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/80 border border-[#C7B7A3]/50 text-xs sm:text-sm leading-relaxed text-[#27272A] dark:text-zinc-200 space-y-1.5">
          <p className="font-semibold flex items-center gap-1.5 text-[#5D0D18] dark:text-amber-200">
            <Sparkles className="w-4 h-4 shrink-0" />
            Participants sans compte détectés
          </p>
          <p className="text-xs text-[#27272A]/80 dark:text-zinc-300">
            Des participants sans compte existent dans ce groupe. Si vos amis vous avaient déjà ajouté(e) pour partager des frais, sélectionnez votre profil ci-dessous (« C'est moi ») pour récupérer l'historique complet de vos dépenses et dettes :
          </p>
        </div>

        {/* Liste des participants sans compte */}
        <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
          {virtualMembers.map((vm) => {
            const memberName = vm.name || vm.firstName || 'Participant';
            return (
              <button
                key={vm.id || vm.userId}
                type="button"
                onClick={() => onConfirmMerge(vm)}
                className="w-full p-3 rounded-2xl bg-[#E8D8C4] dark:bg-zinc-800 hover:bg-[#D9C4AC] dark:hover:bg-zinc-700/80 border border-[#C7B7A3]/60 dark:border-zinc-700 flex items-center justify-between transition-all group/item cursor-pointer text-left shadow-xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={vm.avatar || '/Avatar_Herisson.jpg'}
                    alt={memberName}
                    className="w-9 h-9 rounded-full object-cover border border-white/40 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#5D0D18] dark:text-[#FFF9EB] truncate">
                      {memberName}
                    </p>
                    <p className="text-[10.5px] text-[#27272A]/60 dark:text-zinc-400">
                      Participant sans compte
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-[#5D0D18] dark:text-amber-300 group-hover/item:translate-x-0.5 transition-transform shrink-0 flex items-center gap-1 bg-[#FFF9EB]/80 dark:bg-zinc-900/80 px-2.5 py-1 rounded-xl shadow-xs">
                  C'est moi <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>

        {/* Choix alternatif : Non, je suis un nouveau membre */}
        <div className="pt-2 border-t border-[#C7B7A3]/40 dark:border-zinc-700">
          <button
            type="button"
            onClick={onContinueAsNew}
            className="w-full py-2.5 rounded-full bg-transparent hover:bg-black/5 dark:hover:bg-white/5 border border-[#C7B7A3] dark:border-zinc-700 text-[#27272A] dark:text-[#FFF9EB] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <UserPlus className="w-4 h-4 text-[#5D0D18] dark:text-amber-200" />
            <span>Non, je suis un nouveau membre</span>
          </button>
        </div>
      </div>
    </div>
  );
};
