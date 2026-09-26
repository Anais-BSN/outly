import { Expense, GroupMember, DebtSettlement } from '../types';

export interface DebtBalance {
  userId: string;
  userName: string;
  userAvatar: string;
  paidExpenses: number; // Sommes avancées par l'utilisateur
  share: number;        // Part dans toutes les dépenses
  reimbursedPaid: number; // Remboursements déjà versés par l'utilisateur (+)
  reimbursedReceived: number; // Remboursements déjà perçus par l'utilisateur (-)
  paid: number;         // Total payé (dépenses avancées)
  net: number;          // Équilibre dynamique = (paidExpenses - share) + reimbursedPaid - reimbursedReceived
}

/**
 * Computes expense balances and simplified debt settlement list based on pro-rata shares.
 */
export function calculateExpensesAndDebts(
  expenses: Expense[] = [],
  members: GroupMember[] = [],
  settlementsOverride: DebtSettlement[] = [],
  groupId?: string
): {
  totalSpent: number;
  userBalances: Record<string, DebtBalance>;
  calculatedSettlements: DebtSettlement[];
} {
  let totalSpent = 0;
  const userBalances: Record<string, DebtBalance> = {};
  const safeMembers = members || [];
  const safeExpenses = expenses || [];
  const safeSettlements = (settlementsOverride || []).filter(
    (s) => !groupId || !s.groupId || s.groupId === groupId
  );

  // Helper pour trouver ou créer une balance utilisateur de manière robuste
  const getOrCreateBalance = (userKey?: string, fallbackName?: string, fallbackAvatar?: string): DebtBalance | null => {
    if (!userKey) return null;
    if (userBalances[userKey]) return userBalances[userKey];

    // Recherche par userId existant
    const existing = Object.values(userBalances).find(b => b.userId === userKey);
    if (existing) {
      userBalances[userKey] = existing;
      return existing;
    }

    const member = safeMembers.find(m => m && (m.id === userKey || m.userId === userKey));
    const finalUserId = member?.userId || member?.id || userKey;

    if (userBalances[finalUserId]) {
      userBalances[userKey] = userBalances[finalUserId];
      return userBalances[finalUserId];
    }

    const newBal: DebtBalance = {
      userId: finalUserId,
      userName: member?.firstName || member?.name || fallbackName || 'Membre',
      userAvatar: member?.avatar || fallbackAvatar || '',
      paidExpenses: 0,
      share: 0,
      reimbursedPaid: 0,
      reimbursedReceived: 0,
      paid: 0,
      net: 0,
    };

    userBalances[finalUserId] = newBal;
    if (userKey !== finalUserId) {
      userBalances[userKey] = newBal;
    }
    return newBal;
  };

  // 1. Initialisation des balances pour tous les membres du groupe
  safeMembers.forEach(m => {
    if (!m) return;
    const uid = m.userId || m.id;
    if (uid) {
      const bal = getOrCreateBalance(uid, m.firstName || m.name, m.avatar);
      if (bal) {
        if (m.id) userBalances[m.id] = bal;
        if (m.userId) userBalances[m.userId] = bal;
      }
    }
  });

  // 2. Calcul des dépenses et répartition des parts
  safeExpenses.forEach(exp => {
    if (!exp) return;
    const expAmount = typeof exp.amount === 'string' ? parseFloat(exp.amount) : (Number(exp.amount) || 0);
    totalSpent += expAmount;

    // Créditer celui qui a avancé les fonds (créancier initial)
    const payerBal = getOrCreateBalance(exp.paidById, exp.paidByName, exp.paidByAvatar);
    if (payerBal) {
      payerBal.paidExpenses += expAmount;
      payerBal.paid += expAmount;
    }

    // Déterminer les participants
    const participants = (exp.splitMode === 'all' 
      ? safeMembers 
      : safeMembers.filter(m => m && Array.isArray(exp.participantIds) && (exp.participantIds.includes(m.id) || (m.userId && exp.participantIds.includes(m.userId)))))
      .filter(Boolean);

    const sharesSnapshot = exp.sharesSnapshot || {};

    // Calcul du total des parts des participants
    const totalShares = participants.reduce((sum, p) => {
      if (!p) return sum;
      const pid = p.userId || p.id || '';
      const shares = sharesSnapshot[pid] ?? sharesSnapshot[p.id] ?? p.shares ?? 1;
      return sum + (Number(shares) || 1);
    }, 0);

    if (totalShares > 0) {
      participants.forEach(p => {
        if (!p) return;
        const pid = p.userId || p.id || '';
        const shares = sharesSnapshot[pid] ?? sharesSnapshot[p.id] ?? p.shares ?? 1;
        const participantCost = (expAmount * (Number(shares) || 1)) / totalShares;
        const partBal = getOrCreateBalance(pid, p.firstName || p.name, p.avatar);
        if (partBal) {
          partBal.share += participantCost;
        }
      });
    }
  });

  // 3. Application stricte des remboursements soldés :
  // Débiteur (fromUserId) a remboursé -> reimbursedPaid augmente (+)
  // Créancier (toUserId) a perçu son dû -> reimbursedReceived augmente (-)
  safeSettlements.forEach(s => {
    const numAmount = typeof s?.amount === 'string' ? parseFloat(s.amount) : (Number(s?.amount) || 0);
    if (s && s.status === 'settled' && numAmount > 0) {
      const debtorBal = getOrCreateBalance(s.fromUserId, s.fromUserFirstName || s.fromUserName, s.fromUserAvatar);
      const creditorBal = getOrCreateBalance(s.toUserId, s.toUserFirstName || s.toUserName, s.toUserAvatar);

      if (debtorBal) {
        debtorBal.reimbursedPaid += numAmount;
      }
      if (creditorBal) {
        creditorBal.reimbursedReceived += numAmount;
      }
    }
  });

  // 4. Calcul du solde net dynamique unique par utilisateur
  // Formule : total des sommes avancées - part dans toutes les dépenses + remboursements versés - remboursements perçus
  const uniqueBalances = Array.from(new Set(Object.values(userBalances)));
  uniqueBalances.forEach(b => {
    b.net = (b.paidExpenses - b.share) + b.reimbursedPaid - b.reimbursedReceived;
  });

  // 5. Calcul des transactions d'équilibrage restantes (Greedy Debt Simplification)
  const debtors: { id: string; name: string; avatar: string; amount: number }[] = [];
  const creditors: { id: string; name: string; avatar: string; amount: number }[] = [];

  uniqueBalances.forEach(b => {
    const roundedNet = Math.round(b.net * 100) / 100;
    if (roundedNet < -0.01) {
      debtors.push({ id: b.userId, name: b.userName, avatar: b.userAvatar, amount: -roundedNet });
    } else if (roundedNet > 0.01) {
      creditors.push({ id: b.userId, name: b.userName, avatar: b.userAvatar, amount: roundedNet });
    }
  });

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
      calculatedSettlements.push({
        id: settlementId,
        groupId: groupId || safeExpenses[0]?.groupId || '',
        fromUserId: debtor.id,
        fromUserName: debtor.name,
        fromUserAvatar: debtor.avatar,
        toUserId: creditor.id,
        toUserName: creditor.name,
        toUserAvatar: creditor.avatar,
        amount: Math.round(settleAmount * 100) / 100,
        status: 'pending',
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
