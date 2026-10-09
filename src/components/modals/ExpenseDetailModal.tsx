import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Receipt,
  Users,
  Calendar,
  Sparkles,
  Tag,
  CheckCircle2,
  PieChart,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react';
import { Expense, GroupMember, UserProfile } from '../../types';
import { formatCurrency, formatDateOnly } from '../../utils/formatters';
import { allocateExpenseSharesInCents } from '../../utils/calculations';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  members?: GroupMember[];
  currentUser: UserProfile;
  onEditExpense?: (expense: Expense) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onViewAvatar?: (imageUrl: string, title?: string, subtitle?: string) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  members = [],
  currentUser,
  onEditExpense,
  onDeleteExpense,
  onViewAvatar,
}) => {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
    };
    if (showActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionMenu]);

  if (!isOpen || !expense) return null;

  const isPayerMe =
    Boolean(currentUser && (expense.paidById === currentUser.id || (Boolean((currentUser as any).userId) && expense.paidById === (currentUser as any).userId)));

  // Deduplicate members list
  const memberMap = new Map<string, GroupMember>();
  (members || []).forEach((m) => {
    if (!m) return;
    const uid = m.userId || m.id;
    if (uid && !memberMap.has(uid)) {
      memberMap.set(uid, m);
    }
  });

  // Calculate participant shares breakdown with exact integer cents
  const participantIds = Array.isArray(expense.participantIds) ? expense.participantIds : [];
  const sharesSnapshot = expense.sharesSnapshot || {};

  const participantDefs = participantIds.map((uid) => {
    const shares = expense.splitMode === 'custom' && sharesSnapshot[uid] ? sharesSnapshot[uid] : 1;
    return {
      userId: uid,
      shares: Number(shares) || 1,
    };
  });

  const totalShares = participantDefs.reduce((acc, p) => acc + p.shares, 0);
  const allocatedCentsMap = allocateExpenseSharesInCents(Number(expense.amount) || 0, participantDefs);

  const breakdownList = participantIds.map((uid) => {
    const member = memberMap.get(uid);
    const shares = expense.splitMode === 'custom' && sharesSnapshot[uid] ? sharesSnapshot[uid] : 1;
    const shareCents = allocatedCentsMap.get(uid) || 0;
    const shareAmount = shareCents / 100;
    const isMe =
      uid === safeCurrentUser.id ||
      (Boolean((safeCurrentUser as any).userId) && uid === (safeCurrentUser as any).userId);
    const isVirtual = member?.isVirtual || (typeof uid === 'string' && uid.startsWith('user-virt-'));

    const displayName = member
      ? member.name || member.firstName || (isMe ? 'Moi' : 'Utilisateur supprimé')
      : isMe
      ? 'Moi'
      : (expense.paidById === uid && expense.paidByName && expense.paidByName !== 'Membre' ? expense.paidByName : 'Utilisateur supprimé');

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

  const handleDelete = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cette dépense ? Les dettes et soldes du groupe seront automatiquement recalculés.')) {
      setShowActionMenu(false);
      onClose();
      if (onDeleteExpense) {
        onDeleteExpense(expense.id);
      }
    }
  };

  const handleEdit = () => {
    setShowActionMenu(false);
    onClose();
    if (onEditExpense) {
      onEditExpense(expense);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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
            <div className="p-2.5 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] shadow-xs shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif truncate">
                  {expense.title}
                </h3>
                <span className="bg-[#E8D8C4] dark:bg-zinc-800 text-[#5D0D18] dark:text-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#C7B7A3]/50">
                  {expense.category}
                </span>
              </div>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-0.5">
                Détail de la dépense
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 3-dots Context Menu */}
            {(onEditExpense || onDeleteExpense) && (
              <div className="relative" ref={actionMenuRef}>
                <button
                  type="button"
                  id="expense-detail-menu-btn"
                  onClick={() => setShowActionMenu(!showActionMenu)}
                  className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-300 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Options de la dépense"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showActionMenu && (
                  <div className="absolute right-0 mt-1 top-full w-44 bg-[#FFF9EB] dark:bg-[#18181B] rounded-2xl shadow-xl border border-[#C7B7A3] dark:border-zinc-700 py-1.5 z-50 animate-fade-in">
                    {onEditExpense && (
                      <button
                        type="button"
                        id="expense-detail-edit-btn"
                        onClick={handleEdit}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#27272A] dark:text-zinc-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                      >
                        <Edit className="w-4 h-4 text-[#5D0D18] dark:text-zinc-400" />
                        <span>Modifier</span>
                      </button>
                    )}
                    {onDeleteExpense && (
                      <button
                        type="button"
                        id="expense-detail-delete-btn"
                        onClick={handleDelete}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              id="expense-detail-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
          {/* Main Total Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#5D0D18] via-[#6D2932] to-[#450912] text-[#FFF9EB] shadow-md border border-[#8B3D48]/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#FFF9EB]/90 font-semibold tracking-wide uppercase block">
                Montant total réglé
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold font-serif mt-1 tracking-tight text-[#FFF9EB]">
                {formatCurrency(expense.amount)}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/25 text-[#FFF9EB]">
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
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#5D0D18] shrink-0 cursor-pointer hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <span className="text-[11px] text-[#27272A]/70 dark:text-zinc-400 block font-semibold">
                  Réglé par
                </span>
                <span className="text-sm font-bold text-[#5D0D18] dark:text-[#FFF9EB] truncate block">
                  {isPayerMe ? `${safeCurrentUser.name || safeCurrentUser.firstName} (Moi)` : (expense.paidByName && expense.paidByName !== 'Membre' ? expense.paidByName : 'Utilisateur supprimé')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#27272A] dark:text-[#FFF9EB] font-bold px-3 py-1.5 rounded-xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/50">
              <Calendar className="w-3.5 h-3.5 text-[#5D0D18] dark:text-amber-300 shrink-0" />
              <span>{formatDateOnly(expense.date)}</span>
            </div>
          </div>

          {/* Breakdown / Répartition par participant */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#5D0D18] dark:text-[#FFF9EB] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Pour qui était cette dépense</span>
              </span>
              <span className="text-[11px] text-[#27272A]/70 dark:text-zinc-400 font-semibold">
                {totalShares} part{totalShares > 1 ? 's' : ''} au total
              </span>
            </div>

            <div className="space-y-2">
              {breakdownList.map((item) => (
                <div
                  key={item.uid}
                  className="p-3 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800/90 border border-[#C7B7A3]/50 dark:border-zinc-700/80 flex items-center justify-between gap-3 shadow-2xs hover:border-[#5D0D18]/40 transition-colors"
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
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#5D0D18] text-[#FFF9EB] font-bold">
                            Moi
                          </span>
                        )}
                        {item.isVirtual && !item.displayName?.toLowerCase().includes('utilisateur supprimé') && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-semibold border border-amber-300/60 dark:border-amber-800">
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
                    <span className="text-xs sm:text-sm font-extrabold text-[#5D0D18] dark:text-amber-300 font-serif">
                      {formatCurrency(item.shareAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
