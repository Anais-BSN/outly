import React, { useState } from 'react';
import {
  X,
  Receipt,
  Euro,
  Users,
  Check,
  Tag,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Expense, ExpenseCategory, GroupMember, UserProfile } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  members: GroupMember[];
  groupId: string;
  onAddExpense: (expenseData: Partial<Expense>) => void;
}

const CATEGORIES: ExpenseCategory[] = [
  'Restaurant',
  'Courses',
  'Transport',
  'Logement',
  'Activités',
  'Autre',
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  members,
  groupId,
  onAddExpense,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Courses');
  const [paidById, setPaidById] = useState<string>(currentUser.id);
  const [participantIds, setParticipantIds] = useState<string[]>(members.map((m) => m.userId));

  const parsedAmount = parseFloat(amount) || 0;

  const toggleParticipant = (userId: string) => {
    if (participantIds.includes(userId)) {
      if (participantIds.length > 1) {
        setParticipantIds(participantIds.filter((id) => id !== userId));
      }
    } else {
      setParticipantIds([...participantIds, userId]);
    }
  };

  // Compute live breakdown preview with individual shares
  const activeParticipants = members.filter((m) => participantIds.includes(m.userId));
  const totalShares = activeParticipants.reduce((acc, m) => acc + (m.shares || 1), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || parsedAmount <= 0 || participantIds.length === 0) return;

    const payer = members.find((m) => m.userId === paidById);

    onAddExpense({
      groupId,
      title: title.trim(),
      amount: parsedAmount,
      date: new Date().toISOString().split('T')[0],
      category,
      paidById,
      paidByName: payer?.name || currentUser.firstName,
      paidByAvatar: payer?.avatar || currentUser.avatar,
      splitMode: 'custom',
      participantIds,
      sharesSnapshot: activeParticipants.reduce((acc, m) => {
        acc[m.userId] = m.shares || 1;
        return acc;
      }, {} as { [userId: string]: number }),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="add-expense-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="add-expense-modal-card"
        className="relative w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#6D2932] dark:text-[#FFF9EB]" />
            <h3 className="text-lg font-bold text-[#6D2932] dark:text-[#FFF9EB] font-display">
              Ajouter une dépense
            </h3>
          </div>
          <button
            id="add-expense-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title and Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                Description de la dépense *
              </label>
              <input
                type="text"
                id="expense-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Courses supermarché, Resto pizza..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#6D2932]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                Montant (€) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  id="expense-amount-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm font-extrabold text-[#6D2932] dark:text-amber-300 focus:ring-2 focus:ring-[#6D2932]"
                />
                <span className="absolute left-2.5 top-2.5 text-xs font-bold text-[#6D2932]">
                  €
                </span>
              </div>
            </div>
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1.5">
              Catégorie
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    category === cat
                      ? 'bg-[#6D2932] text-[#FFF9EB]'
                      : 'bg-[#E8D8C4]/60 dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300 hover:bg-[#E8D8C4]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Payer selection */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
              Qui a payé ?
            </label>
            <select
              id="expense-payer-select"
              value={paidById}
              onChange={(e) => setPaidById(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm font-semibold text-[#27272A] dark:text-[#FFF9EB]"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} {m.userId === currentUser.id ? '(Moi)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Participant Selection with Individual Checkboxes Only */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                Participants concernés ({participantIds.length}/{members.length})
              </label>
              <span className="text-[11px] text-[#27272A]/70 dark:text-zinc-400 font-medium">
                Cochez ou décochez individuellement
              </span>
            </div>

            {/* Individual Checkbox List */}
            <div className="p-3 bg-[#E8D8C4]/40 dark:bg-zinc-800/40 rounded-2xl border border-[#C7B7A3]/50 dark:border-zinc-700 max-h-44 overflow-y-auto space-y-1.5 custom-scrollbar">
              {members.map((member) => {
                const isSelected = participantIds.includes(member.userId);
                const memberShare =
                  parsedAmount > 0 && totalShares > 0 && isSelected
                    ? (parsedAmount * (member.shares || 1)) / totalShares
                    : 0;

                return (
                  <div
                    key={member.userId}
                    onClick={() => toggleParticipant(member.userId)}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFF9EB] dark:bg-zinc-800 border-[#6D2932]/40 shadow-xs'
                        : 'bg-transparent border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-[#6D2932] border-[#6D2932] text-[#FFF9EB]'
                            : 'border-[#C7B7A3] bg-[#FFF9EB] dark:bg-zinc-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-[#C7B7A3]"
                        referrerPolicy="no-referrer"
                      />

                      <span className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                        {member.name} {member.userId === currentUser.id ? '(Moi)' : ''}
                      </span>

                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#6D2932]/10 dark:bg-amber-900/40 text-[#6D2932] dark:text-amber-300 font-bold">
                        {member.shares} {member.shares > 1 ? 'parts' : 'part'}
                      </span>
                    </div>

                    {parsedAmount > 0 && isSelected && (
                      <span className="text-xs font-bold text-[#6D2932] dark:text-amber-300">
                        {formatCurrency(memberShare)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Breakdown Summary */}
          {parsedAmount > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#E8D8C4] dark:bg-zinc-800/80 border border-[#C7B7A3]/60 dark:border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6D2932] dark:text-amber-300" />
                <span className="text-xs font-bold text-[#6D2932] dark:text-amber-200">
                  Total réparti : {formatCurrency(parsedAmount)}
                </span>
              </div>
              <span className="text-xs text-[#27272A]/70 dark:text-zinc-300 font-semibold">
                {activeParticipants.length} participant{activeParticipants.length > 1 ? 's' : ''} ({totalShares} parts)
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full bg-[#E8D8C4] text-[#27272A] text-xs font-bold hover:bg-[#C7B7A3] transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              id="add-expense-submit-btn"
              disabled={parsedAmount <= 0 || !title.trim() || participantIds.length === 0}
              className="px-6 py-2.5 rounded-full bg-[#6D2932] text-[#FFF9EB] text-xs font-bold hover:bg-[#541C24] transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Enregistrer la dépense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
