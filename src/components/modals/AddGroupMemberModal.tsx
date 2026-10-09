import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Link,
  Mail,
  Copy,
  Check,
  Search,
  Users,
  Sparkles,
  AlertCircle,
  Loader2,
  Share2
} from 'lucide-react';
import { Group, Friend, UserProfile } from '../../types';
import { api } from '../../services/api';
import { MultiEmailInput } from '../ui/MultiEmailInput';
import { shareGroupInvite, isNativePlatform } from '../../services/nativeService';

interface AddGroupMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  currentUser: UserProfile;
  friends: Friend[];
  onMemberAdded: (newMember: any) => void;
  onMergeMember?: (groupId: string, virtualUserId: string, targetUserId: string) => Promise<any>;
}

interface EligibleFriendRowProps {
  friend: Friend;
  isAdding: boolean;
  onAdd: (friend: Friend) => void;
}

const EligibleFriendRow = React.memo<EligibleFriendRowProps>(({ friend, isAdding, onAdd }) => {
  return (
    <div
      className="p-3 rounded-2xl bg-[#E8D8C4]/50 dark:bg-zinc-800/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 flex items-center justify-between gap-3 hover:bg-[#E8D8C4]/80 transition-colors"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src={friend.avatar || '/Avatar_Herisson.jpg'}
          alt={friend.name || friend.firstName || 'Ami'}
          className="w-9 h-9 rounded-full object-cover ring-1 ring-[#6D2932]"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0">
          <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] truncate">
            {friend.name || friend.firstName}
          </div>
          <div className="text-[10px] text-[#6D2932] dark:text-zinc-400 truncate">
            {friend.handle}
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={isAdding}
        onClick={() => onAdd(friend)}
        className="px-3 py-1.5 rounded-xl bg-[#6D2932] text-[#FFF9EB] text-xs font-bold hover:bg-[#541C24] transition-all shadow-xs shrink-0 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
      >
        {isAdding ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <UserPlus className="w-3.5 h-3.5" />
        )}
        <span>Ajouter</span>
      </button>
    </div>
  );
});
EligibleFriendRow.displayName = 'EligibleFriendRow';

export const AddGroupMemberModal: React.FC<AddGroupMemberModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUser,
  friends = [],
  onMemberAdded,
  onMergeMember,
}) => {
  if (!isOpen || !group) return null;

  const [activeTab, setActiveTab] = useState<'friends' | 'invite'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);
  const [reconcileCandidate, setReconcileCandidate] = useState<Friend | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const existingMemberIds = new Set(
    (group.members || []).map((m) => m.userId || m.id)
  );

  // Participants sans compte existant dans ce groupe (hors comptes supprimés)
  const virtualMembers = (group.members || []).filter(
    (m) =>
      (m.isVirtual || (m.id && m.id.startsWith('user-virt-')) || (m.userId && m.userId.startsWith('user-virt-'))) &&
      !m.isDeleted &&
      m.status !== 'deleted' &&
      !m.name?.toLowerCase().includes('utilisateur supprimé') &&
      !m.firstName?.toLowerCase().includes('utilisateur supprimé')
  );

  const acceptedFriends = (friends || []).filter(
    (f) => f && f.status === 'accepted'
  );

  // Friends not yet in this group
  const eligibleFriends = acceptedFriends.filter(
    (f) => !existingMemberIds.has(f.id)
  );

  const filteredFriends = eligibleFriends.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.firstName && f.firstName.toLowerCase().includes(q)) ||
      (f.lastName && f.lastName.toLowerCase().includes(q)) ||
      (f.handle && f.handle.toLowerCase().includes(q)) ||
      (f.email && f.email.toLowerCase().includes(q))
    );
  });

  const cleanGroupId = group.id.startsWith('group-') ? group.id : `group-${group.id}`;
  const inviteLink = `https://www.outlys.fr/join/${cleanGroupId}`;

  const handleShareLink = async () => {
    const result = await shareGroupInvite({
      title: `Rejoins le groupe ${group.name} sur Outlys !`,
      text: `Rejoins notre groupe "${group.name}" sur Outlys pour planifier nos sorties et partager nos dépenses !`,
      url: inviteLink,
      dialogTitle: 'Inviter des amis sur Outlys',
    });

    if (result.method === 'clipboard' || !isNativePlatform()) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleInitiateAddFriend = (friend: Friend) => {
    // Si des participants sans compte existent, proposer le rapprochement Tricount
    if (virtualMembers.length > 0 && onMergeMember) {
      setReconcileCandidate(friend);
      setFeedbackMsg(null);
    } else {
      handleAddFriend(friend);
    }
  };

  const handleAddFriend = async (friend: Friend) => {
    setAddingFriendId(friend.id);
    setFeedbackMsg(null);
    try {
      await api.addGroupMember(group.id, friend.id, 'member', currentUser?.id);
      const friendDisplayName = friend.name || `${friend.firstName || ''} ${friend.lastName || ''}`.trim() || 'Ami';
      onMemberAdded({
        id: friend.id,
        userId: friend.id,
        firstName: friend.name || friend.firstName,
        lastName: '',
        name: friendDisplayName,
        handle: friend.handle,
        avatar: friend.avatar,
        shares: friend.shares || 1,
        role: 'member',
        isVirtual: false,
      });
      setFeedbackMsg({
        type: 'success',
        text: `${friendDisplayName} a été ajouté(e) au groupe "${group.name}" ! 🎉`,
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || "Erreur lors de l'ajout du membre au groupe",
      });
    } finally {
      setAddingFriendId(null);
    }
  };

  const handleConfirmMerge = async (virtualMember: any) => {
    if (!reconcileCandidate || !onMergeMember) return;
    const vUserId = virtualMember.userId || virtualMember.id;
    setIsMerging(true);
    setFeedbackMsg(null);
    try {
      await onMergeMember(group.id, vUserId, reconcileCandidate.id);
      const candidateDisplayName = reconcileCandidate.name || reconcileCandidate.firstName || 'Ami';
      setFeedbackMsg({
        type: 'success',
        text: `${candidateDisplayName} a été lié(e) à "${virtualMember.name || virtualMember.firstName}". Toutes les dépenses et dettes ont été fusionnées ! 🎉`,
      });
      setReconcileCandidate(null);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || "Erreur lors de la fusion du participant sans compte",
      });
    } finally {
      setIsMerging(false);
    }
  };

  const handleConfirmNewMember = async () => {
    if (!reconcileCandidate) return;
    const friend = reconcileCandidate;
    setReconcileCandidate(null);
    await handleAddFriend(friend);
  };

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emails.length === 0 || sendingEmail) return;

    setSendingEmail(true);
    setFeedbackMsg(null);
    setEmailError(null);

    try {
      const result = await api.inviteGroupMembers(group.id, {
        emails,
        senderName: currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Utilisateur',
        senderId: currentUser.id,
      });

      const count = result.count || emails.length;
      setFeedbackMsg({
        type: 'success',
        text: `${count} invitation${count > 1 ? 's ont été envoyées' : ' a été envoyée'} avec succès ! ✉️`,
      });
      setEmails([]);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || "Impossible d'envoyer les e-mails d'invitation",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const getInviteButtonText = () => {
    if (sendingEmail) {
      return `Envoi de ${emails.length} invitation${emails.length > 1 ? 's' : ''}...`;
    }
    if (emails.length === 0) {
      return 'Envoyer les invitations';
    }
    if (emails.length === 1) {
      return 'Envoyer 1 invitation';
    }
    return `Envoyer ${emails.length} invitations`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="add-group-member-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="add-group-member-card"
        className="relative w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#6D2932] text-white flex items-center justify-center font-serif text-sm">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#6D2932] dark:text-[#FFF9EB] font-serif">
                Ajouter un membre
              </h3>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
                Groupe : <strong>{group.name}</strong>
              </p>
            </div>
          </div>

          <button
            id="close-add-group-member-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB SWITCHER & CONTENT OR RECONCILIATION VIEW */}
        {reconcileCandidate ? (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-xs space-y-2">
              <div>
                <span className="font-bold text-sm text-[#6D2932] dark:text-amber-300">
                  Rapprochement de compte
                </span>
              </div>
              <p className="text-xs text-[#27272A] dark:text-zinc-200 leading-relaxed">
                Ce membre correspond-il à un participant sans compte déjà présent dans le groupe ?
              </p>

              {/* Carte du nouvel utilisateur réel */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-amber-500/20">
                <img
                  src={reconcileCandidate.avatar || '/Avatar_Herisson.jpg'}
                  alt={reconcileCandidate.name || reconcileCandidate.firstName || 'Ami'}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-[#6D2932]"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] truncate">
                    {reconcileCandidate.name || reconcileCandidate.firstName}
                  </div>
                  <div className="text-[10px] text-[#6D2932] dark:text-amber-300 truncate font-semibold">
                    {reconcileCandidate.handle}
                  </div>
                </div>
              </div>
            </div>

            {/* Choix 1 : Liste des participants sans compte existants */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-[#6D2932] dark:text-zinc-300 uppercase tracking-wider">
                Associer à un participant sans compte existant :
              </label>

              {virtualMembers.map((vMember) => {
                const vName = vMember.name || vMember.firstName || 'Invité';
                return (
                  <button
                    key={vMember.userId || vMember.id}
                    type="button"
                    disabled={isMerging}
                    onClick={() => handleConfirmMerge(vMember)}
                    className="w-full p-3 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-amber-400/80 dark:border-amber-600/70 hover:border-[#6D2932] dark:hover:border-amber-400 flex items-center justify-between gap-3 text-left transition-all hover:shadow-md cursor-pointer group active:scale-98 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={vMember.avatar || '/Avatar_Lapin.jpg'}
                        alt={vName}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-400 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] block truncate">
                          {vName}
                        </span>
                        <p className="text-[10px] text-[#27272A]/70 dark:text-zinc-400 truncate mt-0.5">
                          Fusionner toutes les dépenses
                        </p>
                      </div>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-bold group-hover:bg-[#6D2932] group-hover:text-white transition-colors shrink-0">
                      {isMerging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fusionner toutes les dépenses'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Choix 2 : Option Nouveau membre */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-bold text-[#6D2932] dark:text-zinc-300 uppercase tracking-wider">
                Ajouter sans lier :
              </label>

              <button
                type="button"
                disabled={isMerging}
                onClick={handleConfirmNewMember}
                className="w-full p-3 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/70 border border-[#C7B7A3] dark:border-zinc-700 hover:border-[#6D2932] flex items-center justify-between gap-3 text-left transition-all hover:shadow-xs cursor-pointer group active:scale-98 disabled:opacity-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#6D2932] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                      Nouveau membre
                    </div>
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] group-hover:bg-[#6D2932] group-hover:text-white transition-colors shrink-0">
                  Ajouter
                </div>
              </button>
            </div>

            {/* Bouton Annuler */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isMerging}
                onClick={() => setReconcileCandidate(null)}
                className="w-full py-2 rounded-xl text-xs font-semibold text-[#27272A]/70 dark:text-zinc-400 hover:bg-[#E8D8C4]/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Switcher: Sélectionner des amis vs Lien & E-mail */}
            <div className="flex items-center bg-[#E8D8C4]/60 dark:bg-zinc-800 p-1 rounded-2xl border border-[#C7B7A3]/50 gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('friends');
                  setFeedbackMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  activeTab === 'friends'
                    ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                    : 'text-[#27272A] dark:text-zinc-300'
                }`}
              >
                <span>Mes amis ({eligibleFriends.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('invite');
                  setFeedbackMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  activeTab === 'invite'
                    ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                    : 'text-[#27272A] dark:text-zinc-300'
                }`}
              >
                <span>Lien & E-mail</span>
              </button>
            </div>

            {/* Feedback Alert */}
            {feedbackMsg && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-fade-in ${
                  feedbackMsg.type === 'success'
                    ? 'bg-[#9FB2AC]/30 border-[#9FB2AC] text-[#18181B] dark:text-emerald-300'
                    : 'bg-red-100 border-red-300 text-red-700 dark:bg-red-950/50 dark:border-red-900 dark:text-red-300'
                }`}
              >
                {feedbackMsg.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            {/* TAB 1: FRIENDS SELECTION */}
            {activeTab === 'friends' && (
              <div className="space-y-3">
                {eligibleFriends.length > 0 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher parmi mes amis..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#6D2932]"
                    />
                    <Search className="w-3.5 h-3.5 text-[#27272A]/60 absolute left-2.5 top-2.5" />
                  </div>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                  {eligibleFriends.length === 0 ? (
                    <div className="text-center py-6 px-4 bg-[#E8D8C4]/30 dark:bg-zinc-800/30 rounded-2xl border border-dashed border-[#C7B7A3]/60">
                      <Users className="w-8 h-8 text-[#6D2932]/40 dark:text-zinc-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-[#6D2932] dark:text-[#FFF9EB]">
                        {acceptedFriends.length === 0
                          ? "Vous n'avez pas encore d'amis dans votre répertoire."
                          : "Tous vos amis font déjà partie de ce groupe !"}
                      </p>
                      <p className="text-[11px] text-[#27272A]/70 dark:text-zinc-400 mt-1">
                        Utilisez l'onglet « Lien & E-mail » pour inviter de nouvelles personnes.
                      </p>
                    </div>
                  ) : filteredFriends.length === 0 ? (
                    <p className="text-center py-4 text-xs text-[#27272A]/60 dark:text-zinc-400">
                      Aucun ami correspondant à votre recherche.
                    </p>
                  ) : (
                    filteredFriends.map((friend) => (
                      <EligibleFriendRow
                        key={friend.id}
                        friend={friend}
                        isAdding={addingFriendId === friend.id}
                        onAdd={handleInitiateAddFriend}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: LINK & EMAIL INVITATION */}
            {activeTab === 'invite' && (
              <div className="space-y-4">
                {/* Copy Link Section */}
                <div className="p-3.5 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/60 border border-[#C7B7A3]/60 dark:border-zinc-700 space-y-2">
                  <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                    Lien d'invitation direct
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB] select-all font-mono"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleShareLink}
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Partager</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-3 py-2 rounded-xl bg-[#E8D8C4] dark:bg-zinc-800 text-[#27272A] dark:text-[#FFF9EB] text-xs font-bold hover:bg-[#D9C4AC] dark:hover:bg-zinc-700 transition-all shadow-xs border border-[#C7B7A3]/60 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Email Invitation Section Multi-Destinataires */}
                <form onSubmit={handleSendEmailInvite} className="p-3.5 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/60 border border-[#C7B7A3]/60 dark:border-zinc-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                      Inviter par e-mail
                    </label>
                    {emails.length > 0 && (
                      <span className="text-[11px] font-bold text-[#6D2932] dark:text-amber-300">
                        {emails.length} destinataire{emails.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <MultiEmailInput
                    id="group-invite-emails-input"
                    values={emails}
                    onChange={setEmails}
                    error={emailError}
                    onErrorChange={setEmailError}
                    disabled={sendingEmail}
                    placeholder="ami1@exemple.com, ami2@exemple.com..."
                  />

                  <button
                    type="submit"
                    id="send-group-invites-btn"
                    disabled={sendingEmail || emails.length === 0}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#6D2932] text-[#FFF9EB] text-xs font-bold hover:bg-[#541C24] transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
                  >
                    {sendingEmail ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    <span>{getInviteButtonText()}</span>
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
