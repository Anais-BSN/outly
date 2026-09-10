import { Expense, GroupMember, DebtSettlement } from '../types';

export interface DebtBalance {
  userId: string;
  userName: string;
  userAvatar: string;
  paid: number;
  share: number;
  net: number; // positive = should receive, negative = owes
}

/**
 * Computes expense balances and simplified debt settlement list based on pro-rata shares.
 */
export function calculateExpensesAndDebts(
  expenses: Expense[] = [],
  members: GroupMember[] = [],
  settlementsOverride: DebtSettlement[] = []
): {
  totalSpent: number;
  userBalances: Record<string, DebtBalance>;
  calculatedSettlements: DebtSettlement[];
} {
  let totalSpent = 0;
  const userBalances: Record<string, DebtBalance> = {};
  const safeMembers = members || [];
  const safeExpenses = expenses || [];
  const safeSettlements = settlementsOverride || [];

  safeMembers.forEach(m => {
    if (!m) return;
    const memberId = m.id || m.userId || '';
    if (!memberId) return;
    userBalances[memberId] = {
      userId: memberId,
      userName: m.firstName || m.name || 'Membre',
      userAvatar: m.avatar || '',
      paid: 0,
      share: 0,
      net: 0,
    };
  });

  safeExpenses.forEach(exp => {
    if (!exp) return;
    totalSpent += exp.amount || 0;

    // Credit payer
    if (userBalances[exp.paidById]) {
      userBalances[exp.paidById].paid += exp.amount || 0;
    }

    // Determine participants
    const participants = (exp.splitMode === 'all' 
      ? safeMembers 
      : safeMembers.filter(m => m && Array.isArray(exp.participantIds) && (exp.participantIds.includes(m.id) || (m.userId && exp.participantIds.includes(m.userId)))))
      .filter(Boolean);

    const sharesSnapshot = exp.sharesSnapshot || {};

    // Calculate total shares among participants
    const totalShares = participants.reduce((sum, p) => {
      if (!p) return sum;
      const pid = p.id || p.userId || '';
      const shares = sharesSnapshot[pid] ?? p.shares ?? 1;
      return sum + shares;
    }, 0);

    if (totalShares > 0) {
      participants.forEach(p => {
        if (!p) return;
        const pid = p.id || p.userId || '';
        const shares = sharesSnapshot[pid] ?? p.shares ?? 1;
        const participantCost = ((exp.amount || 0) * shares) / totalShares;
        if (userBalances[pid]) {
          userBalances[pid].share += participantCost;
        }
      });
    }
  });

  // Calculate net balances
  Object.values(userBalances).forEach(b => {
    b.net = b.paid - b.share;
  });

  // Calculate simplified debt transactions (Greedy debt simplification)
  const debtors: { id: string; name: string; avatar: string; amount: number }[] = [];
  const creditors: { id: string; name: string; avatar: string; amount: number }[] = [];

  Object.values(userBalances).forEach(b => {
    // Round to 2 decimal places to avoid float precision issues
    const roundedNet = Math.round(b.net * 100) / 100;
    if (roundedNet < -0.01) {
      debtors.push({ id: b.userId, name: b.userName, avatar: b.userAvatar, amount: -roundedNet });
    } else if (roundedNet > 0.01) {
      creditors.push({ id: b.userId, name: b.userName, avatar: b.userAvatar, amount: roundedNet });
    }
  });

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const calculatedSettlements: DebtSettlement[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0.01) {
      const settlementId = `settle-${debtor.id}-${creditor.id}`;
      // Check if there is an existing settlement status (e.g. marked as 'settled')
      const existing = settlementsOverride.find(s => s.fromUserId === debtor.id && s.toUserId === creditor.id);

      calculatedSettlements.push({
        id: settlementId,
        groupId: members[0]?.id ? 'group-current' : '',
        fromUserId: debtor.id,
        fromUserName: debtor.name,
        fromUserAvatar: debtor.avatar,
        toUserId: creditor.id,
        toUserName: creditor.name,
        toUserAvatar: creditor.avatar,
        amount: Math.round(settleAmount * 100) / 100,
        status: existing ? existing.status : 'pending',
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) dIdx++;
    if (creditor.amount < 0.01) cIdx++;
  }

  return {
    totalSpent,
    userBalances,
    calculatedSettlements,
  };
}
