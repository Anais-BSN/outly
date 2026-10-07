import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Receipt,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Users,
} from 'lucide-react';
import { Expense, GroupMember, UserProfile, ExpenseCategory } from '../../types';
import { formatCurrency, formatDateOnly } from '../../utils/formatters';

interface ExpenseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses?: Expense[];
  members?: GroupMember[];
  currentUser?: UserProfile;
  currency?: string;
  onSelectExpense: (expense: Expense) => void;
  onOpenAddExpense?: () => void;
  onEditExpense?: (expense: Expense) => void;
  onDeleteExpense?: (expenseId: string) => void;
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
  currency = 'EUR',
  onSelectExpense,
  onOpenAddExpense,
  onEditExpense,
  onDeleteExpense,
  onViewAvatar,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'Tout'>('Tout');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [activeMenuExpenseId, setActiveMenuExpenseId] = useState<string | null>(null);

  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setActiveMenuExpenseId(null);
      }
    };
    if (activeMenuExpenseId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuExpenseId]);

  // Reset filters when closing/opening
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedCategory('Tout');
      setActiveMenuExpenseId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const safeCurrentUser: UserProfile = currentUser || {
    id: 'user-me',
    firstName: 'Moi',
    lastName: '',
    email: '',
    handle: 'moi',
    avatar: '/Avatar_Herisson.jpg',
  };

  const safeExpenses = Array.isArray(expenses) ? expenses.filter(Boolean) : [];
  const safeMembers = Array.isArray(members) ? members.filter(Boolean) : [];

  // Member map for quick lookup
  const memberMap = new Map<string, GroupMember>();
  safeMembers.forEach((m) => {
    const uid = m?.userId || m?.id;
    if (uid && !memberMap.has(uid)) {
      memberMap.set(uid, m);
    }
  });

  const getSafeTimestamp = (exp: Expense): number => {
    if (!exp) return 0;
    const dateStr = exp.date || exp.createdAt;
    if (!dateStr) return 0;
    const time = new Date(dateStr).getTime();
    return isNaN(time) ? 0 : time;
  };

  // Filter and sort expenses safely
  const filteredAndSortedExpenses = useMemo(() => {
    let list = [...safeExpenses];

    // Search query filter (title or payer name or category)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((exp) => {
        if (!exp) return false;
        const titleMatch = (exp.title || '').toLowerCase().includes(q);
        const payerMatch = (exp.paidByName || '').toLowerCase().includes(q);
        const categoryMatch = (exp.category || '').toLowerCase().includes(q);
        return titleMatch || payerMatch || categoryMatch;
      });
    }

    // Category filter
    if (selectedCategory !== 'Tout') {
      list = list.filter((exp) => exp && exp.category === selectedCategory);
    }

    // Sorting
    list.sort((a, b) => {
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;

      if (sortBy === 'date_desc') {
        return getSafeTimestamp(b) - getSafeTimestamp(a);
      }
      if (sortBy === 'date_asc') {
        return getSafeTimestamp(a) - getSafeTimestamp(b);
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
  }, [safeExpenses, searchQuery, selectedCategory, sortBy]);

  const totalFilteredAmount = useMemo(() => {
    return filteredAndSortedExpenses.reduce((sum, exp) => sum + (Number(exp?.amount) || 0), 0);
  }, [filteredAndSortedExpenses]);

  const handleEditClick = (e: React.MouseEvent, expense: Expense) => {
    e.stopPropagation();
    setActiveMenuExpenseId(null);
    onClose();
    if (onEditExpense) {
      onEditExpense(expense);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, expense: Expense) => {
    e.stopPropagation();
    setActiveMenuExpenseId(null);
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la dépense "${expense.title || 'Dépense'}" ? Les dettes et soldes du groupe seront automatiquement recalculés.`)) {
      if (onDeleteExpense) {
        onDeleteExpense(expense.id);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="expense-history-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="expense-history-modal-card"
        ref={menuContainerRef}
        className="relative w-full max-w-2xl bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-4 sm:p-6 z-10 max-h-[92vh] flex flex-col animate-scale-in"
      >
        {/* Header with Clear Back Button */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#C7B7A3]/40 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Clear Back Button (« ‹ Retour ») */}
            <button
              type="button"
              id="expense-history-back-btn"
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#E8D8C4] dark:bg-zinc-800 text-[#5D0D18] dark:text-amber-200 hover:bg-[#C7B7A3]/60 dark:hover:bg-zinc-700 font-bold text-xs shadow-2xs cursor-pointer active:scale-95 transition-all shrink-0"
              title="Retourner à l'onglet Frais"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Retour</span>
            </button>

            <div className="p-2 rounded-2xl bg-[#5D0D18] text-[#FFF9EB] shadow-xs shrink-0 hidden xs:flex">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>

            <div className="min-w-0">
              <h3 className="text-base sm:text-lg md:text-xl font-bold font-serif text-[#5D0D18] dark:text-[#FFF9EB] truncate">
                Historique des dépenses
              </h3>
              <p className="text-[11px] sm:text-xs text-[#27272A]/70 dark:text-zinc-400 truncate">
                {safeExpenses.length} dépense{safeExpenses.length > 1 ? 's' : ''} au total • {formatCurrency(totalFilteredAmount, currency)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenAddExpense && (
              <button
                type="button"
                id="expense-history-add-btn"
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
              type="button"
              id="expense-history-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Fermer"
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
                placeholder="Rechercher par titre, payeur ou catégorie..."
                className="w-full pl-9 pr-7 py-2 rounded-xl bg-[#E8D8C4]/50 dark:bg-zinc-800/80 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB] placeholder:text-[#27272A]/50 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-[#5D0D18] outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6D2932] dark:text-zinc-400 hover:text-[#27272A] cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                id="expense-history-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-[#E8D8C4]/50 dark:bg-zinc-800/80 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB] cursor-pointer outline-none"
              >
                <option value="date_desc">Date (plus récentes)</option>
                <option value="date_asc">Date (plus anciennes)</option>
                <option value="amount_desc">Montant (plus élevés)</option>
                <option value="amount_asc">Montant (plus faibles)</option>
              </select>
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
                      : 'bg-[#E8D8C4]/50 dark:bg-zinc-800/80 text-[#27272A] dark:text-zinc-300 hover:bg-[#E8D8C4] dark:hover:bg-zinc-700 border border-[#C7B7A3]/40 dark:border-zinc-700'
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
            <div className="p-8 text-center bg-[#E8D8C4]/30 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-[#C7B7A3] dark:border-zinc-700 my-4">
              <Receipt className="w-10 h-10 text-[#6D2932]/50 dark:text-zinc-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
                Aucune dépense trouvée
              </p>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-1">
                {searchQuery || selectedCategory !== 'Tout'
                  ? 'Essayez de modifier votre recherche ou vos filtres.'
                  : "Aucune dépense n'a encore été enregistrée dans ce groupe."}
              </p>
            </div>
          ) : (
            filteredAndSortedExpenses.map((expense) => {
              if (!expense) return null;

              const isPayerMe =
                expense.paidById === safeCurrentUser.id ||
                (Boolean((safeCurrentUser as any).userId) && expense.paidById === (safeCurrentUser as any).userId);

              const payerMember = expense.paidById ? memberMap.get(expense.paidById) : null;
              const payerDisplayName = isPayerMe
                ? 'Moi'
                : expense.paidByName && expense.paidByName !== 'Membre'
                ? expense.paidByName
                : payerMember?.name || payerMember?.firstName || 'Utilisateur supprimé';

              const payerAvatar =
                expense.paidByAvatar ||
                payerMember?.avatar ||
                '/Avatar_Herisson.jpg';

              const isMenuOpen = activeMenuExpenseId === expense.id;
              const participantCount = Array.isArray(expense.participantIds)
                ? expense.participantIds.length
                : 0;

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
                      src={payerAvatar}
                      alt={payerDisplayName}
                      title={`${payerDisplayName} (cliquer pour agrandir)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onViewAvatar && payerAvatar) {
                          onViewAvatar(payerAvatar, payerDisplayName);
                        }
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/Avatar_Herisson.jpg';
                      }}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#6D2932] dark:ring-amber-400/80 shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      referrerPolicy="no-referrer"
                    />

                    <div className="min-w-0">
                      <h5 className="text-xs sm:text-sm font-bold text-[#6D2932] dark:text-[#FFF9EB] truncate group-hover:text-[#450912] dark:group-hover:text-amber-200 transition-colors">
                        {expense.title || 'Dépense'}
                      </h5>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#27272A]/70 dark:text-zinc-400 flex-wrap">
                        <span>
                          Payé par <strong>{payerDisplayName}</strong>
                        </span>
                        <span>•</span>
                        <span className="bg-[#FFF9EB] dark:bg-zinc-900 px-2 py-0.5 rounded-full font-semibold text-[#6D2932] dark:text-amber-200 border border-[#C7B7A3]/40 dark:border-zinc-700">
                          {expense.category || 'Autre'}
                        </span>
                        <span>{formatDateOnly(expense.date || expense.createdAt || '')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-extrabold text-[#6D2932] dark:text-[#FFF9EB] font-serif">
                        {formatCurrency(expense.amount, currency)}
                      </div>
                      <div className="text-[10px] text-[#27272A]/60 dark:text-zinc-400">
                        {expense.splitMode === 'all'
                          ? 'Tout le groupe'
                          : `${participantCount} personne${participantCount > 1 ? 's' : ''}`}
                      </div>
                    </div>

                    {/* 3-dots Context Menu on Each Item */}
                    {(onEditExpense || onDeleteExpense) && (
                      <div className="relative">
                        <button
                          type="button"
                          id={`history-expense-menu-btn-${expense.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuExpenseId(isMenuOpen ? null : expense.id);
                          }}
                          className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#FFF9EB] dark:hover:bg-zinc-700 border border-transparent hover:border-[#C7B7A3]/50 transition-colors cursor-pointer"
                          title="Options de la dépense"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div
                            className="absolute right-0 mt-1 top-full w-40 bg-[#FFF9EB] dark:bg-[#18181B] rounded-2xl shadow-xl border border-[#C7B7A3] dark:border-zinc-700 py-1.5 z-50 animate-fade-in"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {onEditExpense && (
                              <button
                                type="button"
                                id={`history-expense-edit-btn-${expense.id}`}
                                onClick={(e) => handleEditClick(e, expense)}
                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#27272A] dark:text-zinc-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5 text-[#5D0D18] dark:text-zinc-400" />
                                <span>Modifier</span>
                              </button>
                            )}
                            {onDeleteExpense && (
                              <button
                                type="button"
                                id={`history-expense-delete-btn-${expense.id}`}
                                onClick={(e) => handleDeleteClick(e, expense)}
                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Supprimer</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <ChevronRight className="w-4 h-4 text-[#6D2932]/40 dark:text-zinc-500 group-hover:text-[#6D2932] dark:group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all hidden xs:block" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with summary and Close button */}
        <div className="pt-3 border-t border-[#C7B7A3]/40 dark:border-zinc-800 flex items-center justify-between text-xs text-[#27272A]/70 dark:text-zinc-400 shrink-0">
          <span>
            {filteredAndSortedExpenses.length} dépense{filteredAndSortedExpenses.length > 1 ? 's' : ''} affichée{filteredAndSortedExpenses.length > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-[#E8D8C4] dark:bg-zinc-800 text-[#27272A] dark:text-[#FFF9EB] font-bold hover:bg-[#C7B7A3] dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
