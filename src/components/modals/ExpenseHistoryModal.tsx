import React from 'react';
import {
  X,
  Receipt,
  Clock,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { Expense, GroupMember, UserProfile } from '../../types';
import { formatCurrency, formatDateOnly } from '../../utils/formatters';

interface ExpenseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses?: Expense[];
  members?: GroupMember[];
  currentUser?: UserProfile;
  currency?: string;
  onSelectExpense?: (expense: Expense) => void;
  onViewAvatar?: (imageUrl: string, title?: string, subtitle?: string) => void;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onClose?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ExpenseHistoryErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState;
  setState: any;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ExpenseHistoryModal error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl p-6 shadow-2xl border border-[#C7B7A3] text-center space-y-4">
            <h4 className="text-lg font-bold text-[#5D0D18] dark:text-[#FFF9EB]">
              Impossible d'afficher l'historique
            </h4>
            <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
              Une erreur inattendue est survenue lors du chargement de la liste des dépenses.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                if (this.props.onClose) this.props.onClose();
              }}
              className="px-5 py-2 rounded-full text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] cursor-pointer transition-colors"
            >
              Retour à l'onglet Frais
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ExpenseHistoryModalContent: React.FC<ExpenseHistoryModalProps> = ({
  isOpen,
  onClose,
  expenses = [],
  members = [],
  currentUser,
  currency = 'EUR',
  onSelectExpense,
  onViewAvatar,
}) => {
  if (!isOpen) return null;

  // Safe members list
  const safeMembers = Array.isArray(members) ? members.filter(Boolean) : [];

  // Sort expenses chronologically descending (mirroring DebtHistoryModal)
  const sortedExpenses = (expenses || [])
    .filter(Boolean)
    .sort((a, b) => {
      const timeA = new Date(a?.date || a?.createdAt || 0).getTime();
      const timeB = new Date(b?.date || b?.createdAt || 0).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

  const getPayerInfo = (expense: Expense) => {
    if (!expense) return { name: 'Membre', avatar: '/Avatar_Herisson.jpg', isMe: false };
    const paidById = expense.paidById;

    const isMe = Boolean(
      (currentUser?.id && paidById === currentUser.id) ||
      ((currentUser as any)?.userId && paidById === (currentUser as any).userId)
    );

    if (isMe) {
      const myName = currentUser?.name || currentUser?.firstName;
      return {
        name: myName ? `${myName} (Moi)` : 'Moi',
        avatar: currentUser?.avatar || expense.paidByAvatar || '/Avatar_Herisson.jpg',
        isMe: true,
      };
    }

    const member = safeMembers.find((m) => m && (m.id === paidById || m.userId === paidById));
    return {
      name: member
        ? (member.name || member.firstName || 'Membre')
        : (expense.paidByName && expense.paidByName !== 'Membre' ? expense.paidByName : 'Utilisateur supprimé'),
      avatar: member?.avatar || expense.paidByAvatar || '/Avatar_Herisson.jpg',
      isMe: false,
    };
  };

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
        className="relative w-full max-w-xl bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[85vh] flex flex-col animate-scale-in"
      >
        {/* Header - Croix de fermeture uniquement */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#C7B7A3]/40 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E8D8C4] dark:bg-zinc-800 text-[#5D0D18] dark:text-amber-300">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-serif text-[#5D0D18] dark:text-[#FFF9EB]">
                Historique des dépenses
              </h3>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
                Liste chronologique de toutes les dépenses du groupe
              </p>
            </div>
          </div>
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

        {/* Content List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar pr-1">
          {sortedExpenses.length === 0 ? (
            <div className="p-8 text-center bg-[#E8D8C4]/40 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-[#C7B7A3] dark:border-zinc-700 my-4">
              <Receipt className="w-10 h-10 text-[#6D2932]/50 dark:text-zinc-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
                Aucune dépense enregistrée
              </p>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-1">
                Les dépenses ajoutées dans ce groupe apparaîtront ici de manière chronologique.
              </p>
            </div>
          ) : (
            sortedExpenses.map((expense) => {
              const payerInfo = getPayerInfo(expense);
              const participantCount = Array.isArray(expense.participantIds)
                ? expense.participantIds.length
                : 0;

              return (
                <div
                  key={expense.id}
                  id={`expense-history-item-${expense.id}`}
                  onClick={() => onSelectExpense && onSelectExpense(expense)}
                  className="p-4 rounded-2xl bg-[#E8D8C4]/60 dark:bg-[#27272A] border border-[#C7B7A3]/60 dark:border-zinc-700 shadow-xs space-y-2.5 transition-all hover:border-[#6D2932]/60 dark:hover:border-amber-400/60 cursor-pointer active:scale-[0.99] group"
                  title="Cliquer pour voir le détail de cette dépense"
                >
                  {/* Date & Category Header */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#27272A]/60 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#5D0D18] dark:text-amber-300" />
                      <span>{expense.date ? formatDateOnly(expense.date) : 'Date non renseignée'}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF9EB] dark:bg-zinc-800 text-[#5D0D18] dark:text-amber-200 border border-[#C7B7A3]/40 dark:border-zinc-700">
                      <Tag className="w-3 h-3 text-[#5D0D18] dark:text-amber-300" />
                      {expense.category || 'Autre'}
                    </span>
                  </div>

                  {/* Transaction Flow */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    {/* Payer Avatar & Title */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={payerInfo.avatar}
                        alt={payerInfo.name}
                        title={`${payerInfo.name} (cliquer pour agrandir)`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onViewAvatar && payerInfo.avatar) {
                            onViewAvatar(payerInfo.avatar, payerInfo.name);
                          }
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/Avatar_Herisson.jpg';
                        }}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-[#6D2932] dark:ring-amber-400/80 cursor-pointer hover:scale-110 transition-transform shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <h5 className="text-xs sm:text-sm font-bold text-[#5D0D18] dark:text-[#FFF9EB] truncate group-hover:text-[#450912] dark:group-hover:text-amber-200 transition-colors">
                          {expense.title || 'Dépense'}
                        </h5>
                        <span className="block text-[10px] sm:text-[11px] text-[#27272A]/70 dark:text-zinc-400 truncate">
                          Payé par <strong>{payerInfo.name}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Amount & Arrow */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-sm sm:text-base font-extrabold text-[#5D0D18] dark:text-amber-300 font-serif block">
                          {formatCurrency(expense.amount, currency)}
                        </span>
                        <span className="block text-[10px] text-[#27272A]/60 dark:text-zinc-400">
                          {expense.splitMode === 'all'
                            ? 'Tout le groupe'
                            : `${participantCount} pers.`}
                        </span>
                      </div>

                      <ChevronRight className="w-4 h-4 text-[#6D2932]/40 dark:text-zinc-500 group-hover:text-[#6D2932] dark:group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#C7B7A3]/40 dark:border-zinc-800 flex items-center justify-between text-xs text-[#27272A]/70 dark:text-zinc-400 shrink-0">
          <span>
            {sortedExpenses.length} dépense{sortedExpenses.length > 1 ? 's' : ''} au total
          </span>
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

export const ExpenseHistoryModal: React.FC<ExpenseHistoryModalProps> = (props) => {
  return (
    <ExpenseHistoryErrorBoundary onClose={props.onClose}>
      <ExpenseHistoryModalContent {...props} />
    </ExpenseHistoryErrorBoundary>
  );
};
