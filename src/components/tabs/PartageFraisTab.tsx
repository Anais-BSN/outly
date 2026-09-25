import React, { useState } from 'react';
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
  History
} from 'lucide-react';
import { Expense, UserProfile, GroupMember, DebtSettlement } from '../../types';
import { calculateExpensesAndDebts } from '../../utils/calculations';
import { formatCurrency, formatDateOnly } from '../../utils/formatters';
import { DebtHistoryModal } from '../modals/DebtHistoryModal';

interface PartageFraisTabProps {
  expenses?: Expense[];
  currentUser: UserProfile;
  members?: GroupMember[];
  settlements?: DebtSettlement[];
  groupId?: string;
  onOpenAddExpense: () => void;
  onToggleSettlementStatus: (settlement: DebtSettlement) => void;
  onViewAvatar?: (imageUrl: string, title?: string, subtitle?: string) => void;
}

export const PartageFraisTab: React.FC<PartageFraisTabProps> = ({
  expenses = [],
  currentUser,
  members = [],
  settlements = [],
  groupId,
  onOpenAddExpense,
  onToggleSettlementStatus,
  onViewAvatar,
}) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const safeExpenses = expenses || [];
  const safeMembers = members || [];
  const safeSettlements = (settlements || []).filter(
    (s) => !groupId || !s.groupId || s.groupId === groupId
  );

  const { totalSpent, userBalances, calculatedSettlements } = calculateExpensesAndDebts(
    safeExpenses,
    safeMembers,
    safeSettlements,
    groupId
  );

  const myBalObj = userBalances[currentUser.id] || (currentUser.userId ? userBalances[currentUser.userId] : null);
  const myBalance = myBalObj?.net || 0;
  const isPositive = myBalance >= 0.01;
  const isNeutral = Math.abs(myBalance) < 0.01;

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
              {safeExpenses.length} dépenses enregistrées
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
          const activeSettlements = calculatedSettlements.filter((s) => s.status !== 'settled');
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
                      onClick={() => onToggleSettlementStatus(settle)}
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

      {/* Expenses History List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#5D0D18] dark:text-[#FFF9EB]" />
            <h4 className="font-bold font-serif text-base text-[#5D0D18] dark:text-[#FFF9EB]">
              Historique des dépenses
            </h4>
          </div>
        </div>

        {expenses.length === 0 ? (
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
            {expenses.map((expense) => {
              const isPayerMe = expense.paidById === currentUser.id;

              return (
                <div
                  key={expense.id}
                  id={`expense-card-${expense.id}`}
                  className="p-4 rounded-2xl bg-[#E8D8C4] dark:bg-[#27272A] border border-[#C7B7A3] dark:border-zinc-700 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={expense.paidByAvatar}
                      alt={expense.paidByName}
                      title={`${expense.paidByName} (cliquer pour agrandir)`}
                      onClick={() => {
                        if (onViewAvatar && expense.paidByAvatar) {
                          onViewAvatar(expense.paidByAvatar, expense.paidByName);
                        }
                      }}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#6D2932] shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      referrerPolicy="no-referrer"
                    />

                    <div className="min-w-0">
                      <h5 className="text-xs sm:text-sm font-bold text-[#6D2932] dark:text-[#FFF9EB] truncate">
                        {expense.title}
                      </h5>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#27272A]/70 dark:text-zinc-400 flex-wrap">
                        <span>
                          Payé par <strong>{isPayerMe ? 'Moi' : expense.paidByName}</strong>
                        </span>
                        <span>•</span>
                        <span className="bg-[#FFF9EB] dark:bg-zinc-800 px-2 py-0.5 rounded-full font-semibold text-[#6D2932] dark:text-amber-200">
                          {expense.category}
                        </span>
                        <span>{formatDateOnly(expense.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base sm:text-lg font-extrabold text-[#6D2932] dark:text-[#FFF9EB] font-serif">
                      {formatCurrency(expense.amount)}
                    </div>
                    <div className="text-[10px] text-[#27272A]/60 dark:text-zinc-400">
                      {expense.splitMode === 'all'
                        ? 'Tout le groupe'
                        : `${expense.participantIds.length} personnes`}
                    </div>
                  </div>
                </div>
              );
            })}
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
    </div>
  );
};
