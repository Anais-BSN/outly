import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Scale,
  Users,
  Wallet,
  Sparkles,
  History,
  ChevronLeft,
  ChevronRight,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { Expense, UserProfile, GroupMember, DebtSettlement, ExpenseCategory } from '../../types';
import { calculateExpensesAndDebts, allocateExpenseSharesInCents } from '../../utils/calculations';
import { formatCurrency, formatDateOnly } from '../../utils/formatters';
import { DebtHistoryModal } from '../modals/DebtHistoryModal';
import { ExpenseDetailModal } from '../modals/ExpenseDetailModal';
import { ExpenseHistoryModal } from '../modals/ExpenseHistoryModal';
import { triggerHapticNotification } from '../../services/nativeService';

interface PartageFraisTabProps {
  expenses?: Expense[];
  currentUser: UserProfile;
  members?: GroupMember[];
  settlements?: DebtSettlement[];
  groupId?: string;
  onOpenAddExpense: () => void;
  onEditExpense?: (expense: Expense) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onToggleSettlementStatus: (settlement: DebtSettlement) => void;
  onViewAvatar?: (imageUrl: string, title?: string, subtitle?: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  Restaurant: { bg: 'bg-[#C28B38]', text: 'text-[#C28B38]', hex: '#C28B38' }, // Warm Caramel Gold
  Courses: { bg: 'bg-[#5E7A68]', text: 'text-[#5E7A68]', hex: '#5E7A68' },       // Sage Green
  Transport: { bg: 'bg-[#485665]', text: 'text-[#485665]', hex: '#485665' },     // Indigo Slate
  Logement: { bg: 'bg-[#5D0D18]', text: 'text-[#5D0D18]', hex: '#5D0D18' },       // Outlys Burgundy
  Activités: { bg: 'bg-[#8E4A5B]', text: 'text-[#8E4A5B]', hex: '#8E4A5B' },     // Dusty Rose
  Autre: { bg: 'bg-[#8C7D70]', text: 'text-[#8C7D70]', hex: '#8C7D70' },         // Warm Taupe
};

export const PartageFraisTab: React.FC<PartageFraisTabProps> = ({
  expenses = [],
  currentUser,
  members = [],
  settlements = [],
  groupId,
  onOpenAddExpense,
  onEditExpense,
  onDeleteExpense,
  onToggleSettlementStatus,
  onViewAvatar,
}) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExpenseHistoryOpen, setIsExpenseHistoryOpen] = useState(false);
  const [selectedExpenseForDetail, setSelectedExpenseForDetail] = useState<Expense | null>(null);
  const [localSettlements, setLocalSettlements] = useState<DebtSettlement[]>(settlements || []);
  const [hiddenDebtKeys, setHiddenDebtKeys] = useState<Set<string>>(new Set());

  // Budget Diagram Filters: Time (Mois, Année, Tout) and Scope (Tout / Mes dépenses)
  const [timeFilter, setTimeFilter] = useState<'month' | 'year' | 'all'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'me'>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const handlePrevPeriod = () => {
    setSelectedDate((prev) => {
      if (timeFilter === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      } else if (timeFilter === 'year') {
        return new Date(prev.getFullYear() - 1, prev.getMonth(), 1);
      }
      return prev;
    });
  };

  const handleNextPeriod = () => {
    setSelectedDate((prev) => {
      if (timeFilter === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      } else if (timeFilter === 'year') {
        return new Date(prev.getFullYear() + 1, prev.getMonth(), 1);
      }
      return prev;
    });
  };

  const formattedPeriodLabel = useMemo(() => {
    if (timeFilter === 'month') {
      const monthStr = selectedDate.toLocaleDateString('fr-FR', { month: 'short' });
      const capitalizedMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
      const yearStr = selectedDate.getFullYear();
      return `${capitalizedMonth} ${yearStr}`;
    }
    if (timeFilter === 'year') {
      return selectedDate.getFullYear().toString();
    }
    return 'Tout';
  }, [selectedDate, timeFilter]);

  // Synchronize local state with props when parent or backend updates
  useEffect(() => {
    setLocalSettlements(settlements || []);
    setHiddenDebtKeys((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      (settlements || []).forEach((s) => {
        if (s.status === 'settled') {
          next.delete(`${s.fromUserId}_${s.toUserId}`);
        }
      });
      return next;
    });
  }, [settlements]);

  const safeExpenses = expenses || [];

  // Deduplicate members list
  const safeMembers = useMemo(() => {
    const map = new Map<string, GroupMember>();
    (members || []).forEach((m) => {
      const uid = m.userId || m.id;
      if (uid && !map.has(uid)) {
        map.set(uid, m);
      }
    });
    return Array.from(map.values());
  }, [members]);

  const safeSettlements = (localSettlements || []).filter(
    (s) => !groupId || !s.groupId || s.groupId === groupId || s.groupId === 'group-current'
  );

  // Instant calculation of balances and simplified debts matrix
  const { totalSpent, userBalances, calculatedSettlements } = calculateExpensesAndDebts(
    safeExpenses,
    safeMembers,
    safeSettlements,
    groupId
  );

  const myBalObj = userBalances[currentUser?.id || ''] || (Boolean((currentUser as any)?.userId) ? userBalances[(currentUser as any).userId] : null);
  const myBalance = myBalObj?.net || 0;
  const isPositive = myBalance >= 0.01;
  const isNeutral = Math.abs(myBalance) < 0.01;

  // Immediate optimistic toggle on "Marquer comme soldé"
  const handleSettleClick = (settle: DebtSettlement) => {
    try {
      triggerHapticNotification('success');
      const fromUserId = settle.fromUserId;
      const toUserId = settle.toUserId;
      if (!fromUserId || !toUserId) return;

      const isNowSettled = settle.status !== 'settled';
      const newStatus: 'settled' | 'pending' = isNowSettled ? 'settled' : 'pending';
      const targetGroupId = groupId || settle.groupId || 'group-current';
      const numericAmount = typeof settle.amount === 'string' ? parseFloat(settle.amount) : (Number(settle.amount) || 0);
      const pairKey = `${fromUserId}_${toUserId}`;

      if (newStatus === 'settled') {
        setHiddenDebtKeys((prev) => new Set(prev).add(pairKey));
      } else {
        setHiddenDebtKeys((prev) => {
          const next = new Set(prev);
          next.delete(pairKey);
          return next;
        });
      }

      const settlementId = settle.id && !settle.id.startsWith('settle-user-') && !settle.id.startsWith('settle-')
        ? settle.id
        : `settle_${targetGroupId}_${fromUserId}_${toUserId}`;

      const optimisticSettlement: DebtSettlement = {
        ...settle,
        id: settlementId,
        groupId: targetGroupId,
        fromUserId,
        toUserId,
        amount: numericAmount,
        status: newStatus,
        settledAt: newStatus === 'settled' ? new Date().toISOString() : undefined,
      };

      setLocalSettlements((prev) => {
        const filtered = prev.filter(
          (s) =>
            s.id !== settle.id &&
            s.id !== settlementId &&
            !(
              (!s.groupId || s.groupId === targetGroupId || s.groupId === 'group-current') &&
              s.fromUserId === fromUserId &&
              s.toUserId === toUserId
            )
        );
        return [optimisticSettlement, ...filtered];
      });

      if (onToggleSettlementStatus) {
        onToggleSettlementStatus(optimisticSettlement);
      }
    } catch (err) {
      console.error('Erreur lors du règlement de la dette:', err);
    }
  };


  // Category Breakdown Aggregation for Diagram with dynamic temporal and scope filtering
  const { categoryBreakdown, filteredTotalSpent } = useMemo(() => {
    const targetYear = selectedDate.getFullYear();
    const targetMonth = selectedDate.getMonth();

    const map = new Map<string, { total: number; count: number }>();
    let totalCalculated = 0;

    safeExpenses.forEach((exp) => {
      // 1. Filter by Time (Mois, Année, Tout)
      if (timeFilter !== 'all') {
        const expDateStr = exp.date || exp.createdAt;
        if (expDateStr) {
          const expDate = new Date(expDateStr);
          if (!isNaN(expDate.getTime())) {
            if (expDate.getFullYear() !== targetYear) return;
            if (timeFilter === 'month' && expDate.getMonth() !== targetMonth) return;
          }
        }
      }

      // 2. Filter by Scope (Tout le groupe / Mes dépenses)
      let expenseAmount = exp.amount || 0;
      if (scopeFilter === 'me') {
        const participantIds = exp.participantIds || [];
        const sharesSnapshot = exp.sharesSnapshot || {};
        const participantDefs = participantIds.map((uid) => ({
          userId: uid,
          shares: exp.splitMode === 'custom' && sharesSnapshot[uid] ? sharesSnapshot[uid] : 1,
        }));
        const allocatedMap = allocateExpenseSharesInCents(expenseAmount, participantDefs);
        const myShareCents = allocatedMap.get(currentUser.id) || (currentUser.userId ? allocatedMap.get(currentUser.userId) : 0) || 0;
        expenseAmount = myShareCents / 100;
        if (expenseAmount <= 0) return;
      }

      const cat = exp.category || 'Autre';
      const current = map.get(cat) || { total: 0, count: 0 };
      current.total += expenseAmount;
      current.count += 1;
      map.set(cat, current);
      totalCalculated += expenseAmount;
    });

    const categoriesArray = Array.from(map.entries()).map(([category, data]) => {
      const percentage = totalCalculated > 0 ? (data.total / totalCalculated) * 100 : 0;
      const colorMeta = CATEGORY_COLORS[category] || CATEGORY_COLORS['Autre'];
      return {
        category,
        total: data.total,
        count: data.count,
        percentage,
        colorHex: colorMeta.hex,
        colorBg: colorMeta.bg,
        colorText: colorMeta.text,
      };
    });

    // Sort by total descending
    categoriesArray.sort((a, b) => b.total - a.total);
    return { categoryBreakdown: categoriesArray, filteredTotalSpent: totalCalculated };
  }, [safeExpenses, timeFilter, scopeFilter, selectedDate, currentUser.id, currentUser.userId]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-6 pt-4">
      {/* Top Header with Bold Typography and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold mb-1 text-[#6D2932] dark:text-[#FFF9EB]">
            Partage des frais
          </h3>
          <p className="text-sm opacity-70 text-[#6D2932] dark:text-zinc-300">
            Équilibre des comptes.
          </p>
        </div>

        <button
          id="frais-btn-add-expense-top"
          onClick={onOpenAddExpense}
          className="px-4 py-2 rounded-full text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nouvelle dépense</span>
        </button>
      </div>

      {/* Top Financial Recap Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Total Dépensé */}
        <div className="p-5 rounded-2xl bg-[#E8D8C4] dark:bg-[#27272A] border border-[#C7B7A3] dark:border-zinc-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5D0D18] dark:text-zinc-400 uppercase tracking-wider">
              <Wallet className="w-4 h-4" />
              <span>Total dépensé par le groupe</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#5D0D18] dark:text-[#FFF9EB] font-serif mt-1">
              {formatCurrency(totalSpent)}
            </div>
            <div className="text-[11px] text-[#27272A]/70 dark:text-zinc-400 mt-0.5">
              {safeExpenses.length} dépense{safeExpenses.length > 1 ? 's' : ''} enregistrée{safeExpenses.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Card 2: Mon Équilibre */}
        <div className="p-5 rounded-2xl bg-[#E8D8C4] dark:bg-[#27272A] border border-[#C7B7A3] dark:border-zinc-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5D0D18] dark:text-zinc-400 uppercase tracking-wider">
              <Scale className="w-4 h-4" />
              <span>Mon équilibre ({currentUser.shares} {currentUser.shares > 1 ? 'parts' : 'part'})</span>
            </div>

            <span
              className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                isNeutral
                  ? 'bg-zinc-200 text-zinc-800'
                  : isPositive
                  ? 'bg-[#9FB2AC] text-[#18181B]'
                  : 'bg-red-200 text-red-900'
              }`}
            >
              {isNeutral
                ? 'Équilibré'
                : isPositive
                ? 'On me doit'
                : 'Je dois rembourser'}
            </span>
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-serif ${
                isNeutral
                  ? 'text-[#5D0D18] dark:text-[#FFF9EB]'
                  : isPositive
                  ? 'text-[#18181B] dark:text-[#9FB2AC]'
                  : 'text-[#5D0D18] dark:text-red-400'
              }`}
            >
              {isPositive ? `+${formatCurrency(myBalance)}` : formatCurrency(myBalance)}
            </span>
          </div>

          <div className="text-[11px] text-[#27272A]/70 dark:text-zinc-400 mt-0.5">
            Payé : {formatCurrency(myBalObj?.paidExpenses ?? myBalObj?.paid ?? 0)} • Ma part :{' '}
            {formatCurrency(myBalObj?.share || 0)}
          </div>
        </div>
      </div>

      {/* Simplified Debts Matrix Section */}
      <div className="p-5 rounded-2xl bg-[#E8D8C4] dark:bg-[#27272A] border border-[#C7B7A3] dark:border-zinc-700 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#5D0D18] dark:text-[#FFF9EB]" />
            <h4 className="font-bold text-base font-serif text-[#5D0D18] dark:text-[#FFF9EB]">
              Équilibrage des dettes
            </h4>
          </div>

          <button
            id="frais-btn-history"
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#FFF9EB] dark:bg-zinc-800 text-[#5D0D18] dark:text-amber-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-700 border border-[#C7B7A3]/60 dark:border-zinc-700 shadow-xs transition-all cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>Historique</span>
          </button>
        </div>

        {(() => {
          const activeSettlements = calculatedSettlements.filter(
            (s) => s.status !== 'settled' && !hiddenDebtKeys.has(`${s.fromUserId}_${s.toUserId}`)
          );
          if (activeSettlements.length === 0) {
            return (
              <div className="p-4 text-center bg-[#FFF9EB] dark:bg-[#18181B] rounded-2xl border border-[#C7B7A3]/50 dark:border-zinc-800 text-xs font-semibold text-[#27272A]/80 dark:text-zinc-300">
                Tous les comptes sont parfaits ! Aucune dette en suspens.
              </div>
            );
          }

          return (
            <div className="space-y-2">
              {activeSettlements.map((settle) => {
                return (
                  <div
                    key={settle.id}
                    id={`debt-settlement-${settle.id}`}
                    className="p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFF9EB] dark:bg-[#18181B] border-[#C7B7A3]/60 dark:border-zinc-800 shadow-xs"
                  >
                    {/* From -> To statement */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <img
                        src={settle.fromUserAvatar}
                        alt={settle.fromUserName}
                        title={`${settle.fromUserName} (cliquer pour agrandir)`}
                        onClick={() => {
                          if (onViewAvatar && settle.fromUserAvatar) {
                            onViewAvatar(settle.fromUserAvatar, settle.fromUserName);
                          }
                        }}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-[#C7B7A3] cursor-pointer hover:scale-110 transition-transform"
                        referrerPolicy="no-referrer"
                      />

                      <div className="min-w-0 text-xs sm:text-sm">
                        <span className="font-bold text-[#27272A] dark:text-[#FFF9EB]">
                          {settle.fromUserId === currentUser.id ? 'Tu dois' : `${settle.fromUserName} doit`}
                        </span>{' '}
                        <strong className="text-[#5D0D18] dark:text-amber-300 font-extrabold text-sm sm:text-base">
                          {formatCurrency(settle.amount)}
                        </strong>{' '}
                        <span className="text-[#27272A] dark:text-[#FFF9EB]">
                          à {settle.toUserId === currentUser.id ? 'toi' : settle.toUserName}
                        </span>
                      </div>

                      <img
                        src={settle.toUserAvatar}
                        alt={settle.toUserName}
                        title={`${settle.toUserName} (cliquer pour agrandir)`}
                        onClick={() => {
                          if (onViewAvatar && settle.toUserAvatar) {
                            onViewAvatar(settle.toUserAvatar, settle.toUserName);
                          }
                        }}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-[#C7B7A3] cursor-pointer hover:scale-110 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Status Toggle Button */}
                    <button
                      id={`toggle-settle-btn-${settle.id}`}
                      onClick={() => handleSettleClick(settle)}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer bg-[#E8D8C4] dark:bg-zinc-800 text-[#5D0D18] dark:text-amber-200 hover:bg-[#C7B7A3] active:scale-95"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Marquer comme soldé</span>
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Expenses History List (Affichage réduit aux 3 dépenses les plus récentes + Bouton Tout voir) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#5D0D18] dark:text-[#FFF9EB]" />
            <h4 className="font-bold font-serif text-base text-[#5D0D18] dark:text-[#FFF9EB]">
              Historique des dépenses
            </h4>
          </div>

          {safeExpenses.length > 0 && (
            <button
              type="button"
              id="frais-header-btn-view-all"
              onClick={() => setIsExpenseHistoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#FFF9EB] dark:bg-zinc-800 text-[#5D0D18] dark:text-amber-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-700 border border-[#C7B7A3]/60 dark:border-zinc-700 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Tout voir</span>
            </button>
          )}
        </div>

        {safeExpenses.length === 0 ? (
          <div className="p-8 text-center bg-[#E8D8C4]/40 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-[#C7B7A3] dark:border-zinc-700">
            <Receipt className="w-10 h-10 text-[#6D2932]/50 dark:text-zinc-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#6D2932] dark:text-[#FFF9EB] font-serif">
              Aucune dépense pour l'instant
            </p>
            <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-1">
              Partagez l'addition du restaurant, les courses ou l'essence en quelques clics.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {safeExpenses.slice(0, 3).map((expense) => {
              const isPayerMe = expense.paidById === currentUser?.id || (Boolean((currentUser as any)?.userId) && expense.paidById === (currentUser as any)?.userId);

              return (
                <div
                  key={expense.id}
                  id={`expense-card-${expense.id}`}
                  onClick={() => setSelectedExpenseForDetail(expense)}
                  className="relative p-4 rounded-2xl bg-[#E8D8C4] dark:bg-[#27272A] border border-[#C7B7A3] dark:border-zinc-700 shadow-xs hover:shadow-md hover:border-[#6D2932]/60 dark:hover:border-amber-400/60 active:scale-[0.99] transition-all cursor-pointer group/card flex items-center justify-between gap-3"
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
                      <h5 className="text-xs sm:text-sm font-bold text-[#6D2932] dark:text-[#FFF9EB] truncate group-hover/card:text-[#450912] dark:group-hover/card:text-amber-200 transition-colors">
                        {expense.title}
                      </h5>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#27272A]/70 dark:text-zinc-400 flex-wrap">
                        <span>
                          Payé par <strong>{isPayerMe ? 'Moi' : (expense.paidByName && expense.paidByName !== 'Membre' ? expense.paidByName : 'Utilisateur supprimé')}</strong>
                        </span>
                        <span>•</span>
                        <span className="bg-[#FFF9EB] dark:bg-zinc-800 px-2 py-0.5 rounded-full font-semibold text-[#6D2932] dark:text-amber-200">
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

                    <ChevronRight className="w-4 h-4 text-[#6D2932]/40 dark:text-zinc-500 group-hover/card:text-[#6D2932] dark:group-hover/card:text-amber-300 group-hover/card:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Budget Category Breakdown Section (Diagramme de budget) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#E8D8C4] dark:bg-[#27272A] border border-[#C7B7A3] dark:border-zinc-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-[#5D0D18] dark:text-[#FFF9EB]" />
            <h4 className="font-bold text-base font-serif text-[#5D0D18] dark:text-[#FFF9EB]">
              Budget
            </h4>
          </div>

          <span className="text-xs font-bold text-[#5D0D18] dark:text-amber-300">
            Total : {formatCurrency(filteredTotalSpent)}
          </span>
        </div>

        {/* Filter Controls: Scope Switch (Tout / Mes dépenses) + Centered Time Filters (« Tout », « Année », « Mois ») & Centered Stepper */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-2 border-y border-[#C7B7A3]/40 dark:border-zinc-700/60">
          {/* 1. Scope Switch (Tout / Mes dépenses) */}
          <div className="flex items-center justify-center gap-1 bg-[#FFF9EB]/70 dark:bg-zinc-900/60 p-1 rounded-xl border border-[#C7B7A3]/40 dark:border-zinc-700/60">
            <button
              type="button"
              id="budget-scope-all-btn"
              onClick={() => setScopeFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === 'all'
                  ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                  : 'text-[#27272A] dark:text-zinc-300 hover:text-[#5D0D18] dark:hover:text-white'
              }`}
            >
              Tout
            </button>
            <button
              type="button"
              id="budget-scope-me-btn"
              onClick={() => setScopeFilter('me')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === 'me'
                  ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                  : 'text-[#27272A] dark:text-zinc-300 hover:text-[#5D0D18] dark:hover:text-white'
              }`}
            >
              Mes dépenses
            </button>
          </div>

          {/* 2. Centered Time Filters Block (« Tout », « Année », « Mois ») */}
          <div className="flex items-center justify-center w-full">
            <div className="flex items-center justify-center gap-1 bg-[#FFF9EB]/70 dark:bg-zinc-900/60 p-1 rounded-xl border border-[#C7B7A3]/40 dark:border-zinc-700/60">
              <button
                type="button"
                id="budget-filter-all-time-btn"
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeFilter === 'all'
                    ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                    : 'text-[#27272A] dark:text-zinc-300 hover:text-[#5D0D18] dark:hover:text-white'
                }`}
              >
                Tout
              </button>
              <button
                type="button"
                id="budget-filter-year-btn"
                onClick={() => setTimeFilter('year')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeFilter === 'year'
                    ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                    : 'text-[#27272A] dark:text-zinc-300 hover:text-[#5D0D18] dark:hover:text-white'
                }`}
              >
                Année
              </button>
              <button
                type="button"
                id="budget-filter-month-btn"
                onClick={() => setTimeFilter('month')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeFilter === 'month'
                    ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                    : 'text-[#27272A] dark:text-zinc-300 hover:text-[#5D0D18] dark:hover:text-white'
                }`}
              >
                Mois
              </button>
            </div>
          </div>

          {/* 3. Centered Period Stepper with arrows (‹ Mois › / ‹ Année ›) */}
          {timeFilter !== 'all' && (
            <div className="flex items-center justify-center w-full">
              <div className="flex items-center justify-center gap-1 bg-[#FFF9EB]/90 dark:bg-zinc-900/80 px-2 py-1 rounded-xl border border-[#C7B7A3]/50 dark:border-zinc-700/80 shadow-2xs">
                <button
                  type="button"
                  id="budget-stepper-prev-btn"
                  onClick={handlePrevPeriod}
                  aria-label="Période précédente"
                  title="Période précédente"
                  className="p-1 rounded-lg hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 text-[#5D0D18] dark:text-amber-200 transition-colors cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <span className="text-xs font-bold font-serif text-[#5D0D18] dark:text-[#FFF9EB] px-2 min-w-[85px] text-center select-none">
                  {formattedPeriodLabel}
                </span>
                <button
                  type="button"
                  id="budget-stepper-next-btn"
                  onClick={handleNextPeriod}
                  aria-label="Période suivante"
                  title="Période suivante"
                  className="p-1 rounded-lg hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 text-[#5D0D18] dark:text-amber-200 transition-colors cursor-pointer active:scale-95"
                >
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="p-6 text-center bg-[#FFF9EB] dark:bg-[#18181B] rounded-2xl border border-[#C7B7A3]/50 dark:border-zinc-800 text-xs text-[#27272A]/70 dark:text-zinc-400">
            Aucune dépense enregistrée pour ce filtre de budget.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual Horizontal Segmented Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-4 rounded-full bg-[#FFF9EB] dark:bg-zinc-800 overflow-hidden flex shadow-inner border border-[#C7B7A3]/40 dark:border-zinc-700">
                {categoryBreakdown.map((item) => (
                  <div
                    key={item.category}
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.colorHex,
                    }}
                    title={`${item.category}: ${formatCurrency(item.total)} (${item.percentage.toFixed(1)}%)`}
                    className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full hover:opacity-90 cursor-pointer"
                  />
                ))}
              </div>
            </div>

            {/* Category Cards & Legends Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {categoryBreakdown.map((item) => (
                <div
                  key={item.category}
                  className="p-3 rounded-2xl bg-[#FFF9EB] dark:bg-[#18181B] border border-[#C7B7A3]/50 dark:border-zinc-800 flex items-center justify-between gap-2.5 shadow-2xs hover:border-[#5D0D18]/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.colorHex }}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] truncate block">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-[#27272A]/60 dark:text-zinc-400">
                        {item.count} dépense{item.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-[#5D0D18] dark:text-amber-300 font-serif block">
                      {formatCurrency(item.total)}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#5D0D18]/10 dark:bg-zinc-800 text-[#5D0D18] dark:text-amber-200">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Historique des dettes & remboursements */}
      <DebtHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        settlements={safeSettlements}
        members={safeMembers}
        currentUser={currentUser}
        onViewAvatar={onViewAvatar}
      />

      {/* Modal Vue dédiée : Historique complet des dépenses */}
      <ExpenseHistoryModal
        isOpen={isExpenseHistoryOpen}
        onClose={() => setIsExpenseHistoryOpen(false)}
        expenses={safeExpenses}
        members={safeMembers}
        currentUser={currentUser}
        currency="EUR"
        onSelectExpense={(exp) => setSelectedExpenseForDetail(exp)}
        onViewAvatar={onViewAvatar}
      />

      {/* Modal Détail interactif d'une dépense */}
      <ExpenseDetailModal
        isOpen={Boolean(selectedExpenseForDetail)}
        onClose={() => setSelectedExpenseForDetail(null)}
        expense={selectedExpenseForDetail}
        members={safeMembers}
        currentUser={currentUser}
        onEditExpense={onEditExpense}
        onDeleteExpense={onDeleteExpense}
        onViewAvatar={onViewAvatar}
      />
    </div>
  );
};
