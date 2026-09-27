import React from 'react';
import {
  X,
  Receipt,
  Users,
  Calendar,
  Sparkles,
  Tag,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { Expense, GroupMember, UserProfile } from '../../types';
import { formatCurrency, formatDateOnly } from '../../utils/formatters';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  members?: GroupMember[];
  currentUser: UserProfile;
  onViewAvatar?: (imageUrl: string, title?: string, subtitle?: string) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  members = [],
  currentUser,
  onViewAvatar,
}) => {
  if (!isOpen || !expense) return null;

  const isPayerMe = expense.paidById === currentUser.id;

  // Deduplicate members list
  const memberMap = new Map<string, GroupMember>();
  members.forEach((m) => {
    const uid = m.userId || m.id;
    if (uid && !memberMap.has(uid)) {
      memberMap.set(uid, m);
    }
  });

  // Calculate participant shares breakdown
  const participantIds = expense.participantIds || [];
  const sharesSnapshot = expense.sharesSnapshot || {};

  const totalShares = participantIds.reduce((acc, uid) => {
    const userShares = expense.splitMode === 'custom' && sharesSnapshot[uid] ? sharesSnapshot[uid] : 1;
    return acc + userShares;
  }, 0);

  const breakdownList = participantIds.map((uid) => {
    const member = memberMap.get(uid);
    const shares = expense.splitMode === 'custom' && sharesSnapshot[uid] ? sharesSnapshot[uid] : 1;
    const shareAmount = totalShares > 0 ? (expense.amount * shares) / totalShares : expense.amount / Math.max(1, participantIds.length);
    const isMe = uid === currentUser.id;
    const isVirtual = member?.isVirtual || uid.startsWith('user-virt-');

    const displayName = member
      ? member.name || member.firstName || (isMe ? 'Moi' : 'Membre')
      : isMe
      ? 'Moi'
      : 'Membre';

    const avatar = member?.avatar || '/Avatar_Herisson.jpg';

    return {
      uid,
      displayName,
      avatar,
      isMe,
      isVirtual,
      shares,
      shareAmount,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="expense-detail-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="expense-detail-modal-card"
        className="relative w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] flex flex-col animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#C7B7A3]/40 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2.5 rounded-2xl bg-[#6D2932] text-[#FFF9EB] shadow-xs shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-[#6D2932] dark:text-[#FFF9EB] font-serif truncate">
                  {expense.title}
                </h3>
                <span className="bg-[#E8D8C4] dark:bg-zinc-800 text-[#6D2932] dark:text-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#C7B7A3]/50">
                  {expense.category}
                </span>
              </div>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-0.5">
                Détail de la dépense
              </p>
            </div>
          </div>

          <button
            id="expense-detail-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
          {/* Main Total Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#6D2932] to-[#450912] text-[#FFF9EB] shadow-md flex items-center justify-between">
            <div>
              <span className="text-xs text-[#FFF9EB]/80 font-medium">Montant total réglé</span>
              <div className="text-2xl sm:text-3xl font-extrabold font-serif mt-0.5 tracking-tight">
                {formatCurrency(expense.amount)}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20">
              <PieChart className="w-6 h-6 text-[#FFF9EB]" />
            </div>
          </div>

          {/* Qui a payé & Date */}
          <div className="p-3.5 rounded-2xl bg-[#E8D8C4]/70 dark:bg-zinc-800/80 border border-[#C7B7A3]/60 dark:border-zinc-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={expense.paidByAvatar || '/Avatar_Herisson.jpg'}
                alt={expense.paidByName}
                title={`${expense.paidByName} (cliquer pour agrandir)`}
                onClick={() => {
                  if (onViewAvatar && expense.paidByAvatar) {
                    onViewAvatar(expense.paidByAvatar, expense.paidByName);
                  }
                }}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#6D2932] shrink-0 cursor-pointer hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <span className="text-[11px] text-[#27272A]/70 dark:text-zinc-400 block font-medium">
                  Réglé par
                </span>
                <span className="text-sm font-bold text-[#6D2932] dark:text-[#FFF9EB] truncate block">
                  {isPayerMe ? `${currentUser.firstName} (Moi)` : expense.paidByName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#27272A]/80 dark:text-zinc-300 font-semibold px-3 py-1.5 rounded-xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/40">
              <Calendar className="w-3.5 h-3.5 text-[#6D2932] dark:text-amber-300 shrink-0" />
              <span>{formatDateOnly(expense.date)}</span>
            </div>
          </div>

          {/* Breakdown / Répartition par participant */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#6D2932] dark:text-[#FFF9EB] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Pour qui était cette dépense ({breakdownList.length})</span>
              </span>
              <span className="text-[11px] text-[#27272A]/70 dark:text-zinc-400 font-medium">
                {totalShares} part{totalShares > 1 ? 's' : ''} au total
              </span>
            </div>

            <div className="space-y-2">
              {breakdownList.map((item) => (
                <div
                  key={item.uid}
                  className="p-3 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/90 border border-[#C7B7A3]/50 dark:border-zinc-700/80 flex items-center justify-between gap-3 shadow-2xs hover:border-[#6D2932]/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={item.avatar}
                      alt={item.displayName}
                      title={`${item.displayName} (cliquer pour agrandir)`}
                      onClick={() => {
                        if (onViewAvatar && item.avatar) {
                          onViewAvatar(item.avatar, item.displayName);
                        }
                      }}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-[#C7B7A3] shrink-0 cursor-pointer hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] truncate">
                          {item.displayName}
                        </span>
                        {item.isMe && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#6D2932]/10 dark:bg-amber-900/40 text-[#6D2932] dark:text-amber-300 font-bold">
                            Moi
                          </span>
                        )}
                        {item.isVirtual && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold border border-amber-300/60 dark:border-amber-800">
                            Sans compte
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#27272A]/60 dark:text-zinc-400 font-medium">
                        {item.shares} {item.shares > 1 ? 'parts' : 'part'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs sm:text-sm font-extrabold text-[#6D2932] dark:text-amber-300 font-serif">
                      {formatCurrency(item.shareAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-[#C7B7A3]/30 dark:border-zinc-800 flex items-center justify-end shrink-0">
          <button
            type="button"
            id="expense-detail-dismiss-btn"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-[#E8D8C4] text-[#27272A] text-xs font-bold hover:bg-[#C7B7A3] transition-colors cursor-pointer shadow-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
