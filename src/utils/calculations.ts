import { Expense, GroupMember, DebtSettlement } from '../types';

export interface DebtBalance {
  userId: string;
  userName: string;
  userAvatar: string;
  paidExpenses: number; // Sommes avancées par l'utilisateur (en euros)
  share: number;        // Part dans toutes les dépenses (en euros)
  reimbursedPaid: number; // Remboursements déjà versés par l'utilisateur (+) (en euros)
  reimbursedReceived: number; // Remboursements déjà perçus par l'utilisateur (-) (en euros)
  paid: number;         // Total payé (dépenses avancées) (en euros)
  net: number;          // Équilibre dynamique = (paidExpenses - share) + reimbursedPaid - reimbursedReceived (en euros)
}

interface InternalDebtBalance {
  userId: string;
  userName: string;
  userAvatar: string;
  paidExpensesCents: number;
  shareCents: number;
  reimbursedPaidCents: number;
  reimbursedReceivedCents: number;
}

/**
 * Alloue le montant total d'une dépense en centimes entiers de façon équitable et stricte
 * entre les participants selon leurs parts / poids respectifs (Largest Remainder Method / Hare-Niemeyer).
 *
 * Garantit:
 * 1. sum(allocatedCents) === totalCents
 * 2. Si totalCents se divise exactement, chaque participant ayant le même nombre de parts reçoit exactement la même part au centime près.
 */
export function allocateExpenseSharesInCents(
  amount: number,
  participants: { userId: string; shares?: number }[]
): Map<string, number> {
  const result = new Map<string, number>();
  if (!participants || participants.length === 0) return result;

  const totalCents = Math.round((Number(amount) || 0) * 100);
  if (totalCents <= 0) {
    participants.forEach((p) => {
      if (p?.userId) result.set(p.userId, 0);
    });
    return result;
  }

  const validParticipants = participants.filter((p) => p && p.userId);
  if (validParticipants.length === 0) return result;

  const totalShares = validParticipants.reduce(
    (sum, p) => sum + Math.max(1, Number(p.shares) || 1),
    0
  );

  if (totalShares <= 0) {
    validParticipants.forEach((p) => result.set(p.userId, 0));
    return result;
  }

  let allocatedSum = 0;
  const allocations = validParticipants.map((p, index) => {
    const shares = Math.max(1, Number(p.shares) || 1);
    const idealCents = (totalCents * shares) / totalShares;
    const baseCents = Math.floor(idealCents);
    const remainder = idealCents - baseCents;
    allocatedSum += baseCents;
    return {
      userId: p.userId,
      baseCents,
      remainder,
      index,
    };
  });

  const centsToDistribute = totalCents - allocatedSum;

  // Si des centimes résiduels doivent être répartis, on les attribue aux plus grands restes décimaux
  // (avec ordre stable par index en cas d'égalité stricte)
  if (centsToDistribute > 0) {
    const sorted = [...allocations].sort((a, b) => {
      if (Math.abs(b.remainder - a.remainder) > 1e-9) {
        return b.remainder - a.remainder;
      }
      return a.index - b.index;
    });

    for (let i = 0; i < centsToDistribute && i < sorted.length; i++) {
      sorted[i].baseCents += 1;
    }
  }

  allocations.forEach((item) => {
    result.set(item.userId, item.baseCents);
  });

  return result;
}

/**
 * Calcule les soldes et la liste des transactions d'équilibrage simplifiées (Debt Simplification)
 * en effectuant tous les calculs internes en centimes entiers pour une précision stricte sans dérive flottante.
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
  let totalSpentCents = 0;
  const internalBalances: Record<string, InternalDebtBalance> = {};
  const safeMembers = members || [];
  const safeExpenses = expenses || [];
  const safeSettlements = (settlementsOverride || []).filter(
    (s) => !groupId || !s.groupId || s.groupId === groupId
  );

  // Helper pour trouver ou créer une balance utilisateur de manière robuste
  const getOrCreateInternalBalance = (
    userKey?: string,
    fallbackName?: string,
    fallbackAvatar?: string
  ): InternalDebtBalance | null => {
    if (!userKey) return null;
    if (internalBalances[userKey]) return internalBalances[userKey];

    // Recherche par userId existant
    const existing = Object.values(internalBalances).find((b) => b.userId === userKey);
    if (existing) {
      internalBalances[userKey] = existing;
      return existing;
    }

    const member = safeMembers.find((m) => m && (m.id === userKey || m.userId === userKey));
    const finalUserId = member?.userId || member?.id || userKey;

    if (internalBalances[finalUserId]) {
      internalBalances[userKey] = internalBalances[finalUserId];
      return internalBalances[finalUserId];
    }

    const newBal: InternalDebtBalance = {
      userId: finalUserId,
      userName: member?.firstName || member?.name || fallbackName || 'Membre',
      userAvatar: member?.avatar || fallbackAvatar || '',
      paidExpensesCents: 0,
      shareCents: 0,
      reimbursedPaidCents: 0,
      reimbursedReceivedCents: 0,
    };

    internalBalances[finalUserId] = newBal;
    if (userKey !== finalUserId) {
      internalBalances[userKey] = newBal;
    }
    return newBal;
  };

  // 1. Initialisation des balances pour tous les membres du groupe
  safeMembers.forEach((m) => {
    if (!m) return;
    const uid = m.userId || m.id;
    if (uid) {
      const bal = getOrCreateInternalBalance(uid, m.firstName || m.name, m.avatar);
      if (bal) {
        if (m.id) internalBalances[m.id] = bal;
        if (m.userId) internalBalances[m.userId] = bal;
      }
    }
  });

  // 2. Calcul des dépenses et répartition stricte des parts en centimes entiers
  safeExpenses.forEach((exp) => {
    if (!exp) return;
    const expAmountNum = typeof exp.amount === 'string' ? parseFloat(exp.amount) : (Number(exp.amount) || 0);
    const expCents = Math.round(expAmountNum * 100);
    if (expCents <= 0) return;

    totalSpentCents += expCents;

    // Créditer le payeur (créancier initial)
    const payerBal = getOrCreateInternalBalance(exp.paidById, exp.paidByName, exp.paidByAvatar);
    if (payerBal) {
      payerBal.paidExpensesCents += expCents;
    }

    // Déterminer les participants
    const participants = (
      exp.splitMode === 'all'
        ? safeMembers
        : safeMembers.filter(
            (m) =>
              m &&
              Array.isArray(exp.participantIds) &&
              (exp.participantIds.includes(m.id) || (m.userId && exp.participantIds.includes(m.userId)))
          )
    ).filter(Boolean);

    const sharesSnapshot = exp.sharesSnapshot || {};

    const participantShareDefs = participants.map((p) => {
      const pid = p.userId || p.id || '';
      const shares = sharesSnapshot[pid] ?? sharesSnapshot[p.id] ?? p.shares ?? 1;
      return {
        userId: pid,
        shares: Number(shares) || 1,
        member: p,
      };
    });

    const allocatedMap = allocateExpenseSharesInCents(expAmountNum, participantShareDefs);

    participantShareDefs.forEach(({ userId, member }) => {
      const partCents = allocatedMap.get(userId) || 0;
      const partBal = getOrCreateInternalBalance(userId, member.firstName || member.name, member.avatar);
      if (partBal) {
        partBal.shareCents += partCents;
      }
    });
  });

  // 3. Application stricte des remboursements déjà soldés en centimes entiers
  // Déduplication stricte par identifiant et par paire (groupId, fromUserId, toUserId)
  // pour éviter tout double-comptage intermédiaire lors des mises à jour optimistes
  const uniqueSettledMap = new Map<string, DebtSettlement>();
  safeSettlements.forEach((s) => {
    if (!s || s.status !== 'settled') return;
    const numAmount = typeof s.amount === 'string' ? parseFloat(s.amount) : (Number(s.amount) || 0);
    if (numAmount <= 0) return;

    const gId = s.groupId || groupId || 'group-current';
    const pairKey = `${gId}_${s.fromUserId}_${s.toUserId}`;
    const existing = uniqueSettledMap.get(pairKey);
    if (!existing) {
      uniqueSettledMap.set(pairKey, s);
    } else {
      const existingTime = new Date(existing.settledAt || existing.updatedAt || existing.createdAt || 0).getTime();
      const sTime = new Date(s.settledAt || s.updatedAt || s.createdAt || 0).getTime();
      if (sTime >= existingTime) {
        uniqueSettledMap.set(pairKey, s);
      }
    }
  });

  uniqueSettledMap.forEach((s) => {
    const numAmount = typeof s.amount === 'string' ? parseFloat(s.amount) : (Number(s.amount) || 0);
    const settlementCents = Math.round(numAmount * 100);
    if (settlementCents > 0) {
      const debtorBal = getOrCreateInternalBalance(s.fromUserId, s.fromUserFirstName || s.fromUserName, s.fromUserAvatar);
      const creditorBal = getOrCreateInternalBalance(s.toUserId, s.toUserFirstName || s.toUserName, s.toUserAvatar);

      if (debtorBal) {
        debtorBal.reimbursedPaidCents += settlementCents;
      }
      if (creditorBal) {
        creditorBal.reimbursedReceivedCents += settlementCents;
      }
    }
  });

  // 4. Conversion et calcul du solde net dynamique en centimes entiers
  const uniqueInternalBalances = Array.from(new Set(Object.values(internalBalances)));
  const userBalances: Record<string, DebtBalance> = {};

  const debtorList: { id: string; name: string; avatar: string; remainingCents: number }[] = [];
  const creditorList: { id: string; name: string; avatar: string; remainingCents: number }[] = [];

  uniqueInternalBalances.forEach((ib) => {
    const netCents = (ib.paidExpensesCents - ib.shareCents) + ib.reimbursedPaidCents - ib.reimbursedReceivedCents;

    const publicBalance: DebtBalance = {
      userId: ib.userId,
      userName: ib.userName,
      userAvatar: ib.userAvatar,
      paidExpenses: ib.paidExpensesCents / 100,
      share: ib.shareCents / 100,
      reimbursedPaid: ib.reimbursedPaidCents / 100,
      reimbursedReceived: ib.reimbursedReceivedCents / 100,
      paid: ib.paidExpensesCents / 100,
      net: netCents / 100,
    };

    userBalances[ib.userId] = publicBalance;

    if (netCents < 0) {
      debtorList.push({
        id: ib.userId,
        name: ib.userName,
        avatar: ib.userAvatar,
        remainingCents: -netCents,
      });
    } else if (netCents > 0) {
      creditorList.push({
        id: ib.userId,
        name: ib.userName,
        avatar: ib.userAvatar,
        remainingCents: netCents,
      });
    }
  });

  // Synchroniser les alias de clés (id vs userId)
  Object.keys(internalBalances).forEach((key) => {
    const targetUserId = internalBalances[key]?.userId;
    if (targetUserId && userBalances[targetUserId]) {
      userBalances[key] = userBalances[targetUserId];
    }
  });

  // 5. Algorithme de simplification des dettes (Debt Simplification en centimes entiers)
  // Tri décroissant par montant restant (avec bris d'égalité stable)
  debtorList.sort((a, b) => b.remainingCents - a.remainingCents || a.id.localeCompare(b.id));
  creditorList.sort((a, b) => b.remainingCents - a.remainingCents || a.id.localeCompare(b.id));

  const calculatedSettlements: DebtSettlement[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtorList.length && cIdx < creditorList.length) {
    const debtor = debtorList[dIdx];
    const creditor = creditorList[cIdx];
    const settleCents = Math.min(debtor.remainingCents, creditor.remainingCents);

    if (settleCents > 0) {
      calculatedSettlements.push({
        id: `settle-${debtor.id}-${creditor.id}`,
        groupId: groupId || safeExpenses[0]?.groupId || '',
        fromUserId: debtor.id,
        fromUserName: debtor.name,
        fromUserAvatar: debtor.avatar,
        toUserId: creditor.id,
        toUserName: creditor.name,
        toUserAvatar: creditor.avatar,
        amount: settleCents / 100,
        status: 'pending',
      });

      debtor.remainingCents -= settleCents;
      creditor.remainingCents -= settleCents;
    }

    if (debtor.remainingCents === 0) dIdx++;
    if (creditor.remainingCents === 0) cIdx++;
  }

  return {
    totalSpent: totalSpentCents / 100,
    userBalances,
    calculatedSettlements,
  };
}
