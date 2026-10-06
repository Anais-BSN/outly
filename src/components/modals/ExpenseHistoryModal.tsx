import React, { useState, useMemo } from 'react';
import {
  X,
  Receipt,
  Search,
  ArrowUpDown,
  Filter,
  ChevronRight,
  Plus,
  Calendar,
} from 'lucide-react';
import { Expense, GroupMember, UserProfile, ExpenseCategory } from '../../types';
import { formatCurrency, formatDateOnly } from '../../utils/formatters';

interface ExpenseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  members?: GroupMember[];
  currentUser: UserProfile;
  onSelectExpense: (expense: Expense) => void;
  onOpenAddExpense?: () => void;
  onViewAvatar?: (imageUrl: string, title?: string, subtitle?: string) => void;
}

const CATEGORIES: Array<ExpenseCategory | 'Tout'> = [
  'Tout',
  'Restaurant',
  'Courses',
  'Transport',
  'Logement',
  'Activités',
  'Autre',
];

export const ExpenseHistoryModal: React.FC<ExpenseHistoryModalProps> = ({
  isOpen,
  onClose,
  expenses = [],
  members = [],
  currentUser,
  onSelectExpense,
  onOpenAddExpense,
  onViewAvatar,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'Tout'>('Tout');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  if (!isOpen) return null;

  // Filter and sort expenses
  const filteredAndSortedExpenses = useMemo(() => {
    let list = [...expenses];

    // Search query filter (title or payer name)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((exp) => {
        const titleMatch = exp.title?.toLowerCase().includes(q);
        const payerMatch = exp.paidByName?.toLowerCase().includes(q);
        const categoryMatch = exp.category?.toLowerCase().includes(q);
        return titleMatch || payerMatch || categoryMatch;
      });
    }

    // Category filter
    if (selectedCategory !== 'Tout') {
      list = list.filter((exp) => exp.category === selectedCategory);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        const timeA = new Date(a.date || a.createdAt || 0).getTime();
        const timeB = new Date(b.date || b.createdAt || 0).getTime();
        return timeB - timeA;
      }
      if (sortBy === 'date_asc') {
        const timeA = new Date(a.date || a.createdAt || 0).getTime();
        const timeB = new Date(b.date || b.createdAt || 0).getTime();
        return timeA - timeB;
      }
      if (sortBy === 'amount_desc') {
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      }
      if (sortBy === 'amount_asc') {
        return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      }
      return 0;
    });

    return list;
  }, [expenses, searchQuery, selectedCategory, sortBy]);

  const totalFilteredAmount = useMemo(() => {
    return filteredAndSortedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [filteredAndSortedExpenses]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="expense-history-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="expense-history-modal-card"
        className="relative w-full max-w-2xl bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] flex flex-col animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#C7B7A3]/40 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-serif text-[#5D0D18] dark:text-[#FFF9EB]">
                Historique des dépenses
              </h3>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
                {expenses.length} dépense{expenses.length > 1 ? 's' : ''} au total • {formatCurrency(totalFilteredAmount)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAddExpense && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddExpense();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Ajouter</span>
              </button>
            )}
            <button
              id="expense-history-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="py-3 space-y-2.5 border-b border-[#C7B7A3]/40 dark:border-zinc-800 shrink-0">
          {/* Search Input & Sort Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6D2932]/60 dark:text-zinc-400" />
              <input
                type="text"
                id="expense-history-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une dépense ou un payeur..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#E8D8C4]/50 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#5D0D18] outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6D2932] dark:text-zinc-400 hover:text-[#27272A]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <select
                  id="expense-history-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#E8D8C4]/50 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB] cursor-pointer outline-none"
                >
                  <option value="date_desc">Date (plus récentes)</option>
                  <option value="date_asc">Date (plus anciennes)</option>
                  <option value="amount_desc">Montant (plus élevés)</option>
                  <option value="amount_asc">Montant (plus faibles)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Quick Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                      : 'bg-[#E8D8C4]/50 dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300 hover:bg-[#E8D8C4] dark:hover:bg-zinc-700 border border-[#C7B7A3]/40 dark:border-zinc-700'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Expenses List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 custom-scrollbar pr-1">
          {filteredAndSortedExpenses.length === 0 ? (
            <div className="p-8 text-center bg-[#E8D8C4]/40 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-[#C7B7A3] dark:border-zinc-700 my-4">
              <Receipt className="w-10 h-10 text-[#6D2932]/50 dark:text-zinc-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
                Aucune dépense trouvée
              </p>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-1">
                {searchQuery || selectedCategory !== 'Tout'
                  ? 'Essayez de modifier votre recherche ou vos filtres.'
                  : 'Aucune dépense n\'a encore été enregistrée dans ce groupe.'}
              </p>
            </div>
          ) : (
            filteredAndSortedExpenses.map((expense) => {
              const isPayerMe = expense.paidById === currentUser.id;

              return (
                <div
                  key={expense.id}
                  id={`history-expense-item-${expense.id}`}
                  onClick={() => onSelectExpense(expense)}
                  className="relative p-3.5 sm:p-4 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/70 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 shadow-2xs hover:shadow-md hover:border-[#6D2932]/60 dark:hover:border-amber-400/60 active:scale-[0.99] transition-all cursor-pointer group flex items-center justify-between gap-3"
                  title="Cliquer pour voir le détail et la répartition de cette dépense"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={expense.paidByAvatar || '/Avatar_Herisson.jpg'}
                      alt={expense.paidByName || 'Utilisateur supprimé'}
                      title={`${expense.paidByName || 'Utilisateur supprimé'} (cliquer pour agrandir)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onViewAvatar && expense.paidByAvatar) {
                          onViewAvatar(expense.paidByAvatar, expense.paidByName || 'Utilisateur supprimé');
                        }
                      }}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#6D2932] shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      referrerPolicy="no-referrer"
                    />

                    <div className="min-w-0">
                      <h5 className="text-xs sm:text-sm font-bold text-[#6D2932] dark:text-[#FFF9EB] truncate group-hover:text-[#450912] dark:group-hover:text-amber-200 transition-colors">
                        {expense.title}
                      </h5>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#27272A]/70 dark:text-zinc-400 flex-wrap">
                        <span>
                          Payé par <strong>{isPayerMe ? 'Moi' : (expense.paidByName && expense.paidByName !== 'Membre' ? expense.paidByName : 'Utilisateur supprimé')}</strong>
                        </span>
                        <span>•</span>
                        <span className="bg-[#FFF9EB] dark:bg-zinc-900 px-2 py-0.5 rounded-full font-semibold text-[#6D2932] dark:text-amber-200 border border-[#C7B7A3]/40 dark:border-zinc-700">
                          {expense.category}
                        </span>
                        <span>{formatDateOnly(expense.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-extrabold text-[#6D2932] dark:text-[#FFF9EB] font-serif">
                        {formatCurrency(expense.amount)}
                      </div>
                      <div className="text-[10px] text-[#27272A]/60 dark:text-zinc-400">
                        {expense.splitMode === 'all'
                          ? 'Tout le groupe'
                          : `${expense.participantIds?.length || 0} personnes`}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#6D2932]/40 dark:text-zinc-500 group-hover:text-[#6D2932] dark:group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#C7B7A3]/40 dark:border-zinc-800 flex items-center justify-between text-xs text-[#27272A]/70 dark:text-zinc-400 shrink-0">
          <span>{filteredAndSortedExpenses.length} dépense{filteredAndSortedExpenses.length > 1 ? 's' : ''} affichée{filteredAndSortedExpenses.length > 1 ? 's' : ''}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-[#E8D8C4] dark:bg-zinc-800 text-[#27272A] dark:text-[#FFF9EB] font-bold hover:bg-[#C7B7A3] transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
