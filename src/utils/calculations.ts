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
 * Alloue le montant total d'une dépense en centimes entiers entre les participants.
 * Règle comptable :
 * Lorsque la division du montant d'une dépense par le nombre de participants produit un nombre décimal non fini,
 * chaque part est systématiquement arrondie au centime supérieur :
 * part = Math.ceil((montantTotal / nbParticipants) * 100) / 100
 * Exemple : 50 € divisés entre 3 personnes donne 16,67 € (1667 centimes) par personne.
 */
export function allocateExpenseSharesInCents(
  amount: number,
  participants: { userId: string; shares?: number }[]
): Map<string, number> {
  const result = new Map<string, number>();
  if (!participants || participants.length === 0) return result;

  const numAmount = Number(amount) || 0;
  if (numAmount <= 0) {
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

  validParticipants.forEach((p) => {
    const shares = Math.max(1, Number(p.shares) || 1);
    // Règle comptable : Arrondi systématique de chaque part au centime supérieur
    const shareCents = Math.ceil(((numAmount * shares) / totalShares) * 100);
    result.set(p.userId, shareCents);
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
    (s) => !groupId || !s.groupId || s.groupId === groupId || s.groupId === 'group-current' || groupId === 'group-current'
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
      userName: member?.firstName || member?.name || (fallbackName && fallbackName !== 'Membre' ? fallbackName : 'Utilisateur supprimé'),
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

    // Déterminer les participants et parts
    const sharesSnapshot = exp.sharesSnapshot || {};
    let participantShareDefs: { userId: string; shares: number; member?: GroupMember }[] = [];

    if (Array.isArray(exp.participantIds) && exp.participantIds.length > 0) {
      participantShareDefs = exp.participantIds.map((pid) => {
        const member = safeMembers.find((m) => m && (m.id === pid || m.userId === pid));
        const shares = sharesSnapshot[pid] ?? member?.shares ?? 1;
        return {
          userId: pid,
          shares: Math.max(1, Number(shares) || 1),
          member,
        };
      });
    } else if (Object.keys(sharesSnapshot).length > 0) {
      participantShareDefs = Object.keys(sharesSnapshot).map((pid) => {
        const member = safeMembers.find((m) => m && (m.id === pid || m.userId === pid));
        const shares = sharesSnapshot[pid] ?? member?.shares ?? 1;
        return {
          userId: pid,
          shares: Math.max(1, Number(shares) || 1),
          member,
        };
      });
    } else {
      participantShareDefs = safeMembers
        .map((p) => {
          const pid = p.userId || p.id || '';
          return {
            userId: pid,
            shares: Math.max(1, Number(p.shares) || 1),
            member: p,
          };
        })
        .filter((p) => Boolean(p.userId));
    }

    const allocatedMap = allocateExpenseSharesInCents(expAmountNum, participantShareDefs);

    // Règle comptable : Le montant total effectif de la dépense est la somme exacte des parts arrondies
    let totalExpenseSharesCents = 0;
    participantShareDefs.forEach(({ userId, member }) => {
      const partCents = allocatedMap.get(userId) || 0;
      totalExpenseSharesCents += partCents;
      const partBal = getOrCreateInternalBalance(userId, member?.firstName || member?.name, member?.avatar);
      if (partBal) {
        partBal.shareCents += partCents;
      }
    });

    const effectiveExpCents = totalExpenseSharesCents > 0 ? totalExpenseSharesCents : expCents;
    totalSpentCents += effectiveExpCents;

    // Créditer le payeur (créancier initial) du montant total effectif (somme exacte des parts)
    const payerBal = getOrCreateInternalBalance(exp.paidById, exp.paidByName, exp.paidByAvatar);
    if (payerBal) {
      payerBal.paidExpensesCents += effectiveExpCents;
    }
  });

  // 3. Application stricte des remboursements déjà soldés en centimes entiers
  // Déduplication stricte par paire (fromUserId, toUserId) pour éviter tout double-comptage intermédiaire
  const uniqueSettledMap = new Map<string, DebtSettlement>();
  safeSettlements.forEach((s) => {
    if (!s || s.status !== 'settled') return;
    const numAmount = typeof s.amount === 'string' ? parseFloat(s.amount) : (Number(s.amount) || 0);
    if (numAmount <= 0) return;

    const pairKey = `${s.fromUserId}_${s.toUserId}`;
    const existing = uniqueSettledMap.get(pairKey);
    if (!existing) {
      uniqueSettledMap.set(pairKey, s);
    } else {
      const existingTime = new Date(existing.settledAt || existing.updatedAt || existing.createdAt || 0).getTime();
      const sTime = new Date(s.settledAt || s.updatedAt || s.createdAt || 0).getTime();
      const safeExistingTime = isNaN(existingTime) ? 0 : existingTime;
      const safeSTime = isNaN(sTime) ? 0 : sTime;
      if (safeSTime >= safeExistingTime) {
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
    const isLastCreditor = cIdx === creditorList.length - 1;

    // Règle comptable : la part de chaque débiteur (arrondie au centime supérieur) est strictement préservée
    // sans ajustement résiduel négatif qui retirerait 1 centime au dernier participant
    const settleCents = isLastCreditor
      ? debtor.remainingCents
      : Math.min(debtor.remainingCents, creditor.remainingCents);

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
      creditor.remainingCents = Math.max(0, creditor.remainingCents - settleCents);
    }

    if (debtor.remainingCents <= 0) dIdx++;
    if (creditor.remainingCents <= 0 && !isLastCreditor) cIdx++;
    if (isLastCreditor && debtor.remainingCents <= 0 && dIdx >= debtorList.length) cIdx++;
  }

  return {
    totalSpent: totalSpentCents / 100,
    userBalances,
    calculatedSettlements,
  };
}
