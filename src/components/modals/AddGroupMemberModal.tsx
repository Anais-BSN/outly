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
  Loader2
} from 'lucide-react';
import { Group, Friend, UserProfile } from '../../types';
import { api } from '../../services/api';

interface AddGroupMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  currentUser: UserProfile;
  friends: Friend[];
  onMemberAdded: (newMember: any) => void;
}

export const AddGroupMemberModal: React.FC<AddGroupMemberModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUser,
  friends = [],
  onMemberAdded,
}) => {
  if (!isOpen || !group) return null;

  const [activeTab, setActiveTab] = useState<'friends' | 'invite'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const existingMemberIds = new Set(
    (group.members || []).map((m) => m.userId || m.id)
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
      (f.firstName && f.firstName.toLowerCase().includes(q)) ||
      (f.lastName && f.lastName.toLowerCase().includes(q)) ||
      (f.handle && f.handle.toLowerCase().includes(q)) ||
      (f.email && f.email.toLowerCase().includes(q))
    );
  });

  const inviteLink = `${window.location.origin}/join/${group.id}`;

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

  const handleAddFriend = async (friend: Friend) => {
    setAddingFriendId(friend.id);
    setFeedbackMsg(null);
    try {
      await api.addGroupMember(group.id, friend.id, 'member');
      onMemberAdded({
        id: friend.id,
        userId: friend.id,
        firstName: friend.firstName,
        lastName: friend.lastName,
        name: `${friend.firstName} ${friend.lastName}`.trim(),
        handle: friend.handle,
        avatar: friend.avatar,
        shares: friend.shares || 1,
        role: 'member',
      });
      setFeedbackMsg({
        type: 'success',
        text: `${friend.firstName} a été ajouté(e) au groupe "${group.name}" ! 🎉`,
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

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || sendingEmail) return;

    setSendingEmail(true);
    setFeedbackMsg(null);

    try {
      await api.sendInvitationEmail({
        toEmail: emailInput.trim(),
        senderName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        groupName: group.name,
        inviteLink,
      });

      setFeedbackMsg({
        type: 'success',
        text: `Invitation envoyée avec succès à ${emailInput.trim()} via Resend ! ✉️`,
      });
      setEmailInput('');
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || "Impossible d'envoyer l'e-mail d'invitation",
      });
    } finally {
      setSendingEmail(false);
    }
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

        {/* Tab Switcher: Sélectionner des amis vs Lien & E-mail */}
        <div className="flex items-center bg-[#E8D8C4]/60 dark:bg-zinc-800 p-1 rounded-2xl border border-[#C7B7A3]/50">
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
                filteredFriends.map((friend) => {
                  const isAdding = addingFriendId === friend.id;
                  return (
                    <div
                      key={friend.id}
                      className="p-3 rounded-2xl bg-[#E8D8C4]/50 dark:bg-zinc-800/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 flex items-center justify-between gap-3 hover:bg-[#E8D8C4]/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={friend.avatar}
                          alt={friend.firstName}
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-[#6D2932]"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] truncate">
                            {friend.firstName} {friend.lastName}
                          </div>
                          <div className="text-[10px] text-[#6D2932] dark:text-zinc-400 truncate">
                            {friend.handle}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isAdding}
                        onClick={() => handleAddFriend(friend)}
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
                })
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
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB] select-all font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 rounded-xl bg-[#6D2932] text-[#FFF9EB] text-xs font-bold hover:bg-[#541C24] transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
            </div>

            {/* Resend Email Invitation Section */}
            <form onSubmit={handleSendEmailInvite} className="p-3.5 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/60 border border-[#C7B7A3]/60 dark:border-zinc-700 space-y-2.5">
              <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                Inviter par e-mail (via Resend)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="ami@exemple.com"
                    required
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#6D2932]"
                  />
                  <Mail className="w-3.5 h-3.5 text-[#6D2932] absolute left-2.5 top-2.5" />
                </div>
                <button
                  type="submit"
                  disabled={sendingEmail || !emailInput.trim()}
                  className="px-4 py-2 rounded-xl bg-[#6D2932] text-[#FFF9EB] text-xs font-bold hover:bg-[#541C24] transition-all shadow-xs flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {sendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  <span>Inviter</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
