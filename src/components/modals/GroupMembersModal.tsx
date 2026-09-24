import React, { useState } from 'react';
import {
  X,
  Users,
  Shield,
  UserX,
  UserPlus,
  Trash2,
  Sparkles,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Group, GroupMember, UserProfile } from '../../types';

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  currentUser: UserProfile;
  onRemoveMember: (userId: string) => Promise<void> | void;
  onOpenAddMember?: () => void;
  onViewAvatar?: (imageUrl: string, title?: string, subtitle?: string) => void;
}

export const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUser,
  onRemoveMember,
  onOpenAddMember,
  onViewAvatar,
}) => {
  if (!isOpen || !group) return null;

  const members = group.members || [];
  const currentMember = members.find(
    (m) => m.id === currentUser.id || m.userId === currentUser.id
  );
  const isCurrentUserAdmin = currentMember?.role === 'admin';

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmMember, setConfirmMember] = useState<GroupMember | null>(null);

  const handleConfirmExclude = async () => {
    if (!confirmMember) return;
    const targetUserId = confirmMember.userId || confirmMember.id;
    try {
      setRemovingId(targetUserId);
      await onRemoveMember(targetUserId);
      setConfirmMember(null);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="group-members-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="group-members-modal-card"
        className="relative w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#5D0D18] dark:text-[#FFF9EB]" />
            <h3 className="text-lg font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-display">
              Membres du groupe ({members.length})
            </h3>
          </div>
          <button
            id="group-members-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Info Banner */}
        <div className="p-3 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/60 border border-[#C7B7A3]/50 dark:border-zinc-700/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#5D0D18] dark:text-amber-200 font-medium">
            <Shield className="w-4 h-4 text-[#5D0D18] dark:text-amber-300 shrink-0" />
            <span>
              {isCurrentUserAdmin
                ? 'Vous êtes administrateur de ce groupe.'
                : 'Seul l\'administrateur peut gérer et retirer des participants.'}
            </span>
          </div>

          {onOpenAddMember && (
            <button
              onClick={() => {
                onClose();
                onOpenAddMember();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#5D0D18] text-white hover:bg-[#450912] transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Inviter</span>
            </button>
          )}
        </div>

        {/* Members List */}
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
          {members.map((member) => {
            const memberUserId = member.userId || member.id;
            const isMe = memberUserId === currentUser.id;
            const isAdmin = member.role === 'admin';
            const memberName =
              `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
              member.name ||
              'Membre';

            return (
              <div
                key={memberUserId}
                id={`member-row-${memberUserId}`}
                className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-[#C7B7A3]/40 dark:border-zinc-800 flex items-center justify-between gap-3 shadow-xs hover:border-[#C7B7A3] transition-all"
              >
                {/* Member Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={member.avatar || '/Avatar_Herisson.jpg'}
                    alt={memberName}
                    title={`${memberName} (cliquer pour agrandir)`}
                    onClick={() => {
                      if (onViewAvatar && member.avatar) {
                        onViewAvatar(member.avatar, memberName, member.handle);
                      }
                    }}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-[#C7B7A3]/60 cursor-pointer hover:scale-105 transition-transform shrink-0"
                    referrerPolicy="no-referrer"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-[#27272A] dark:text-[#FFF9EB] truncate">
                        {memberName}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#E8D8C4] text-[#5D0D18] dark:bg-zinc-800 dark:text-zinc-300">
                          Moi
                        </span>
                      )}
                      {member.isVirtual && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          Sans compte
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#27272A]/70 dark:text-zinc-400">
                      <span>{member.handle}</span>
                      <span>•</span>
                      <span className="font-semibold">{member.shares || 1} {((member.shares || 1) > 1) ? 'parts' : 'part'}</span>
                    </div>
                  </div>
                </div>

                {/* Role Badge & Admin Exclusion Action */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                      isAdmin
                        ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                        : 'bg-[#E8D8C4]/60 text-[#27272A] dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {isAdmin && <Shield className="w-3 h-3" />}
                    <span>{isAdmin ? 'Administrateur' : 'Membre'}</span>
                  </span>

                  {/* Explicit Exclusion button reserved for the Administrator */}
                  {isCurrentUserAdmin && !isAdmin && !isMe && (
                    <button
                      id={`btn-exclude-member-${memberUserId}`}
                      onClick={() => setConfirmMember(member)}
                      title={`Retirer ${memberName} du groupe`}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Exclure</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Confirmation modal for member exclusion */}
        {confirmMember && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 space-y-3 animate-fade-in">
            <div className="flex items-start gap-2.5 text-xs text-red-800 dark:text-red-300">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  Confirmer l'exclusion de {confirmMember.firstName || confirmMember.name} ?
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Ce participant sera retiré du groupe "{group.name}". Ses dépenses et historiques resteront conservés dans les comptes.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmMember(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8D8C4] text-[#27272A] hover:bg-[#C7B7A3] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmExclude}
                disabled={Boolean(removingId)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{removingId ? 'Exclusion...' : 'Confirmer l\'exclusion'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Close */}
        <div className="pt-2 border-t border-[#C7B7A3]/40 dark:border-zinc-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#E8D8C4] dark:bg-zinc-800 text-[#27272A] dark:text-[#FFF9EB] hover:bg-[#C7B7A3] dark:hover:bg-zinc-700 cursor-pointer transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
