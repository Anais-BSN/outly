import React from 'react';
import {
  X,
  History,
  CheckCircle2,
  ArrowRight,
  Receipt,
  Clock,
  Calendar,
  Sparkles
} from 'lucide-react';
import { DebtSettlement, GroupMember, UserProfile } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface DebtHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlements?: DebtSettlement[];
  members?: GroupMember[];
  currentUser: UserProfile;
  onViewAvatar?: (imageUrl: string, title?: string, subtitle?: string) => void;
}

export const DebtHistoryModal: React.FC<DebtHistoryModalProps> = ({
  isOpen,
  onClose,
  settlements = [],
  members = [],
  currentUser,
  onViewAvatar,
}) => {
  if (!isOpen) return null;

  // Filter only settled debts and sort chronologically descending
  const settledList = (settlements || [])
    .filter((s) => s.status === 'settled')
    .sort((a, b) => {
      const timeA = new Date(a.settledAt || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.settledAt || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  const getMemberInfo = (userId: string, defaultName: string, defaultAvatar: string) => {
    const member = members.find((m) => m.id === userId || m.userId === userId);
    return {
      name: member ? (member.firstName || member.name) : defaultName || 'Membre',
      avatar: member?.avatar || defaultAvatar || '',
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="debt-history-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="debt-history-modal-card"
        className="relative w-full max-w-xl bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[85vh] flex flex-col animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#C7B7A3]/40 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E8D8C4] dark:bg-zinc-800 text-[#5D0D18] dark:text-amber-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-serif text-[#5D0D18] dark:text-[#FFF9EB]">
                Historique des remboursements
              </h3>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
                Liste chronologique des dettes soldées du groupe
              </p>
            </div>
          </div>
          <button
            id="debt-history-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar pr-1">
          {settledList.length === 0 ? (
            <div className="p-8 text-center bg-[#E8D8C4]/40 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-[#C7B7A3] dark:border-zinc-700 my-4">
              <Receipt className="w-10 h-10 text-[#6D2932]/50 dark:text-zinc-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
                Aucun remboursement soldé
              </p>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-1">
                Lorsqu'une dette est marquée comme réglée, elle apparaîtra ici avec l'heure exacte.
              </p>
            </div>
          ) : (
            settledList.map((settle) => {
              const fromInfo = getMemberInfo(
                settle.fromUserId,
                settle.fromUserFirstName || settle.fromUserName,
                settle.fromUserAvatar
              );
              const toInfo = getMemberInfo(
                settle.toUserId,
                settle.toUserFirstName || settle.toUserName,
                settle.toUserAvatar
              );

              const isFromMe = settle.fromUserId === currentUser.id;
              const isToMe = settle.toUserId === currentUser.id;
              const formattedDate = settle.settledAt || settle.updatedAt || settle.createdAt;

              return (
                <div
                  key={settle.id}
                  id={`debt-history-item-${settle.id}`}
                  className="p-4 rounded-2xl bg-[#E8D8C4]/60 dark:bg-[#27272A] border border-[#C7B7A3]/60 dark:border-zinc-700 shadow-xs space-y-2.5 transition-all hover:border-[#9FB2AC]"
                >
                  {/* Date & Time Header */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#27272A]/60 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#5D0D18] dark:text-amber-300" />
                      <span>{formattedDate ? formatDateTime(formattedDate) : 'Date non renseignée'}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#9FB2AC]/30 text-[#18181B] dark:text-[#9FB2AC]">
                      <CheckCircle2 className="w-3 h-3 text-[#9FB2AC]" />
                      Soldé
                    </span>
                  </div>

                  {/* Transaction Flow */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    {/* From User */}
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={fromInfo.avatar}
                        alt={fromInfo.name}
                        title={`${fromInfo.name} (cliquer pour agrandir)`}
                        onClick={() => {
                          if (onViewAvatar && fromInfo.avatar) {
                            onViewAvatar(fromInfo.avatar, fromInfo.name);
                          }
                        }}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-[#C7B7A3] cursor-pointer hover:scale-110 transition-transform shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-[#5D0D18] dark:text-[#FFF9EB] truncate">
                          {isFromMe ? 'Toi' : fromInfo.name}
                        </span>
                        <span className="block text-[10px] text-[#27272A]/60 dark:text-zinc-400">
                          A remboursé
                        </span>
                      </div>
                    </div>

                    {/* Amount & Arrow */}
                    <div className="flex flex-col items-center shrink-0 px-2">
                      <span className="text-sm sm:text-base font-extrabold text-[#5D0D18] dark:text-amber-300 font-serif">
                        {formatCurrency(settle.amount)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#9FB2AC] mt-0.5" />
                    </div>

                    {/* To User */}
                    <div className="flex items-center gap-2 min-w-0 justify-end text-right">
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-[#5D0D18] dark:text-[#FFF9EB] truncate">
                          {isToMe ? 'Toi' : toInfo.name}
                        </span>
                        <span className="block text-[10px] text-[#27272A]/60 dark:text-zinc-400">
                          Bénéficiaire
                        </span>
                      </div>
                      <img
                        src={toInfo.avatar}
                        alt={toInfo.name}
                        title={`${toInfo.name} (cliquer pour agrandir)`}
                        onClick={() => {
                          if (onViewAvatar && toInfo.avatar) {
                            onViewAvatar(toInfo.avatar, toInfo.name);
                          }
                        }}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-[#C7B7A3] cursor-pointer hover:scale-110 transition-transform shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#C7B7A3]/40 dark:border-zinc-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
