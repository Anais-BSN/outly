import React, { useState } from 'react';
import {
  X,
  Search,
  UserPlus,
  Check,
  Clock,
  Mail,
  AtSign,
  Users,
  Sparkles,
  UserCheck,
  Trash2
} from 'lucide-react';
import { Friend, UserProfile } from '../../types';

interface AddFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends?: Friend[];
  currentUser: UserProfile;
  onSendFriendRequest: (handleOrEmail: string) => Promise<any>;
  onAcceptFriendRequest: (friendId: string) => void;
  onDeclineFriendRequest: (friendId: string) => void;
  onDeleteFriend?: (friendId: string) => void;
}

export const AddFriendsModal: React.FC<AddFriendsModalProps> = ({
  isOpen,
  onClose,
  friends = [],
  currentUser,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onDeleteFriend,
}) => {
  if (!isOpen) return null;

  const safeFriends = friends || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const acceptedFriends = safeFriends.filter((f) => f && f.status === 'accepted');
  const pendingReceived = safeFriends.filter((f) => f && f.status === 'pending_received');
  const pendingSent = safeFriends.filter((f) => f && f.status === 'pending_sent');

  const filteredFriends = acceptedFriends.filter((f) => {
    if (!f) return false;
    const q = searchQuery.toLowerCase();
    return (
      (f.firstName && f.firstName.toLowerCase().includes(q)) ||
      (f.lastName && f.lastName.toLowerCase().includes(q)) ||
      (f.handle && f.handle.toLowerCase().includes(q)) ||
      (f.email && f.email.toLowerCase().includes(q))
    );
  });

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput.trim()) return;

    setFeedbackMsg(null);
    setErrorMsg(null);
    setIsSending(true);

    try {
      await onSendFriendRequest(inviteInput.trim());
      setFeedbackMsg(`Demande d'ami envoyée avec succès à ${inviteInput.trim()}.`);
      setInviteInput('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Utilisateur introuvable');
    } finally {
      setIsSending(false);
      setTimeout(() => {
        setFeedbackMsg(null);
        setErrorMsg(null);
      }, 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="friends-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="friends-modal-card"
        className="relative w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#5D0D18] dark:text-[#FFF9EB]" />
            <h3 className="text-lg font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
              Rechercher & Ajouter des amis
            </h3>
          </div>
          <button
            id="friends-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invite by @pseudo or email form */}
        <div className="p-4 rounded-2xl bg-[#E8D8C4] dark:bg-[#27272A] border border-[#C7B7A3]/60 dark:border-zinc-700/80 space-y-2.5">
          <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
            Envoyer une demande d'ami (@pseudo ou e-mail)
          </label>

          <form onSubmit={handleSendInvite} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                id="friends-invite-input"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="Ex: @clara_v ou clara@gmail.com"
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FFF9EB] dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB] placeholder:text-[#27272A]/50 focus:ring-2 focus:ring-[#5D0D18]"
              />
              <Search className="w-3.5 h-3.5 text-[#5D0D18] absolute left-2.5 top-2.5" />
            </div>

            <button
              type="submit"
              id="friends-send-invite-btn"
              disabled={!inviteInput.trim()}
              className="px-4 py-2 rounded-xl bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] disabled:opacity-40 transition-all shrink-0 active:scale-95 cursor-pointer"
            >
              Envoyer
            </button>
          </form>

          {feedbackMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5 animate-fade-in">
              <X className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Pending Requests Received */}
        {pendingReceived.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#5D0D18] dark:text-amber-300 uppercase tracking-wider">
              Demandes reçues ({pendingReceived.length})
            </h4>

            <div className="space-y-1.5">
              {pendingReceived.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-800 border border-[#C7B7A3]/50 dark:border-zinc-700 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={req.avatar}
                      alt={req.firstName}
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-[#5D0D18]"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                        {req.firstName} {req.lastName}
                      </div>
                      <div className="text-[11px] text-[#5D0D18] dark:text-zinc-400 font-medium">
                        {req.handle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      id={`accept-friend-btn-${req.id}`}
                      onClick={() => onAcceptFriendRequest(req.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#9FB2AC] text-[#18181B] text-xs font-bold hover:bg-[#8da39c] flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accepter</span>
                    </button>
                    <button
                      id={`decline-friend-btn-${req.id}`}
                      onClick={() => onDeclineFriendRequest(req.id)}
                      className="p-1.5 rounded-xl bg-[#E8D8C4] text-[#27272A] hover:bg-red-100 text-xs font-bold cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search inside existing friends */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] uppercase tracking-wider">
              Mes amis ({acceptedFriends.length})
            </h4>

            {pendingSent.length > 0 && (
              <span className="text-[11px] text-[#27272A]/70 dark:text-zinc-400">
                {pendingSent.length} demande(s) en attente
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              id="friends-search-existing-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer mes amis..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#5D0D18]"
            />
            <Search className="w-3.5 h-3.5 text-[#27272A]/60 absolute left-2.5 top-2.5" />
          </div>

          {/* Friends List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {filteredFriends.length === 0 ? (
              <p className="text-center py-4 text-xs text-[#27272A]/60 dark:text-zinc-400">
                Aucun ami trouvé.
              </p>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  id={`friend-card-${friend.id}`}
                  className="p-2.5 rounded-xl bg-[#E8D8C4]/50 dark:bg-zinc-800/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={friend.avatar}
                      alt={friend.firstName}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-[#C7B7A3]"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                        {friend.firstName} {friend.lastName}
                      </div>
                      <div className="text-[10px] text-[#5D0D18] dark:text-zinc-400">
                        {friend.handle} • {friend.shares} {friend.shares > 1 ? 'parts' : 'part'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-[#FFF9EB] dark:bg-zinc-700 text-[10px] font-bold text-[#9FB2AC]">
                      Ami
                    </span>
                    {onDeleteFriend && (
                      <button
                        id={`delete-friend-btn-${friend.id}`}
                        onClick={() => {
                          if (window.confirm(`Voulez-vous retirer ${friend.firstName} ${friend.lastName || ''} de vos amis ?`)) {
                            onDeleteFriend(friend.id);
                          }
                        }}
                        className="p-1 rounded-lg text-[#27272A]/50 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Retirer de mes amis"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
