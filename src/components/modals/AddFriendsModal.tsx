import React, { useState, useEffect, useRef } from 'react';
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
  Trash2,
  Loader2
} from 'lucide-react';
import { Friend, UserProfile } from '../../types';
import { api } from '../../services/api';

interface AddFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends?: Friend[];
  currentUser: UserProfile;
  onSendFriendRequest: (handleOrEmail: string | string[]) => Promise<any>;
  onAcceptFriendRequest: (friendId: string) => void;
  onDeclineFriendRequest: (friendId: string) => void;
  onDeleteFriend?: (friendId: string) => void;
}

interface FriendItemProps {
  friend: Friend;
  onDeleteFriend?: (friendId: string) => void;
}

const FriendItem = React.memo<FriendItemProps>(({ friend, onDeleteFriend }) => {
  return (
    <div
      id={`friend-card-${friend.id}`}
      className="p-3 rounded-2xl bg-[#E8D8C4] dark:bg-[#27272A] border border-[#C7B7A3]/70 dark:border-zinc-700 shadow-xs flex items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2.5">
        <img
          src={friend.avatar}
          alt={friend.name || friend.firstName || 'Ami'}
          className="w-8 h-8 rounded-full object-cover ring-1 ring-[#C7B7A3]"
          referrerPolicy="no-referrer"
        />
        <div>
          <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
            {friend.name || friend.firstName}
          </div>
          <div className="text-[10px] text-[#6D2932] dark:text-zinc-400">
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
              if (window.confirm(`Voulez-vous retirer ${friend.name || friend.firstName} de vos amis ?`)) {
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
  );
});
FriendItem.displayName = 'FriendItem';

interface PendingFriendItemProps {
  req: Friend;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

const PendingFriendItem = React.memo<PendingFriendItemProps>(({ req, onAccept, onDecline }) => {
  return (
    <div
      className="p-3 rounded-2xl bg-[#FFF9EB] dark:bg-[#27272A] border border-[#C7B7A3]/70 dark:border-zinc-700 shadow-xs flex items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2.5">
        <img
          src={req.avatar}
          alt={req.name || req.firstName || 'Ami'}
          className="w-9 h-9 rounded-full object-cover ring-1 ring-[#6D2932]"
          referrerPolicy="no-referrer"
        />
        <div>
          <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
            {req.name || req.firstName}
          </div>
          <div className="text-[11px] text-[#6D2932] dark:text-zinc-400 font-medium">
            {req.handle}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          id={`accept-friend-btn-${req.id}`}
          onClick={() => onAccept(req.id)}
          className="px-3 py-1.5 rounded-xl bg-[#9FB2AC] text-[#18181B] text-xs font-bold hover:bg-[#8da39c] flex items-center gap-1 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Accepter</span>
        </button>
        <button
          id={`decline-friend-btn-${req.id}`}
          onClick={() => onDecline(req.id)}
          className="p-1.5 rounded-xl bg-[#E8D8C4] text-[#27272A] hover:bg-red-100 text-xs font-bold cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
PendingFriendItem.displayName = 'PendingFriendItem';

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
  const [inviteMode, setInviteMode] = useState<'pseudo' | 'email'>('pseudo');
  const [pseudoInput, setPseudoInput] = useState('');
  const [email, setEmail] = useState('');
  const [pseudoSearchResults, setPseudoSearchResults] = useState<UserProfile[]>([]);
  const [isSearchingPseudo, setIsSearchingPseudo] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  const acceptedFriends = safeFriends.filter((f) => f && f.status === 'accepted');
  const pendingReceived = safeFriends.filter((f) => f && f.status === 'pending_received');
  const pendingSent = safeFriends.filter((f) => f && f.status === 'pending_sent');

  // Recherche en direct par pseudo (insensible à la casse, espaces & émojis gérés)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const clean = pseudoInput.trim();
    if (!clean || clean.length < 1) {
      setPseudoSearchResults([]);
      setIsSearchingPseudo(false);
      return;
    }

    setIsSearchingPseudo(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await api.searchUsers(clean, currentUser.id);
        setPseudoSearchResults(results || []);
      } catch (err) {
        setPseudoSearchResults([]);
      } finally {
        setIsSearchingPseudo(false);
      }
    }, 280);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [pseudoInput, currentUser.id]);

  const filteredFriends = (Array.isArray(acceptedFriends) ? acceptedFriends : []).filter((f) => {
    if (!f || typeof f !== 'object') return false;
    const q = typeof searchQuery === 'string' ? searchQuery.toLowerCase() : '';
    if (!q) return true;
    return (
      (typeof f.name === 'string' && f.name.toLowerCase().includes(q)) ||
      (typeof f.firstName === 'string' && f.firstName.toLowerCase().includes(q)) ||
      (typeof f.lastName === 'string' && f.lastName.toLowerCase().includes(q)) ||
      (typeof f.handle === 'string' && f.handle.toLowerCase().includes(q)) ||
      (typeof f.email === 'string' && f.email.toLowerCase().includes(q))
    );
  });

  const handleSendInviteByPseudo = async (targetPseudoOrHandle?: string) => {
    const target = (targetPseudoOrHandle || pseudoInput).trim();
    if (!target || isSending) return;

    setFeedbackMsg(null);
    setErrorMsg(null);
    setIsSending(true);

    try {
      await onSendFriendRequest(target);
      setFeedbackMsg(`Demande d'ami envoyée avec succès à "${target}" ! 🎉`);
      setPseudoInput('');
      setPseudoSearchResults([]);
    } catch (err: any) {
      const safeMsg = typeof err?.message === 'string' ? err.message : (typeof err?.error === 'string' ? err.error : 'Impossible d\'envoyer la demande d\'ami.');
      setErrorMsg(safeMsg);
    } finally {
      setIsSending(false);
      setTimeout(() => {
        setFeedbackMsg(null);
        setErrorMsg(null);
      }, 5000);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteMode === 'pseudo') {
      await handleSendInviteByPseudo();
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || isSending) return;

    setFeedbackMsg(null);
    setErrorMsg(null);
    setIsSending(true);

    try {
      await onSendFriendRequest(cleanEmail);
      setFeedbackMsg(`Invitation envoyée avec succès à ${cleanEmail} ! 🎉`);
      setEmail('');
    } catch (err: any) {
      const safeMsg = typeof err?.message === 'string' ? err.message : (typeof err?.error === 'string' ? err.error : 'Impossible d\'envoyer l\'invitation.');
      setErrorMsg(safeMsg);
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
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#6D2932] dark:text-[#FFF9EB]" />
              <h3 className="text-lg font-bold text-[#6D2932] dark:text-[#FFF9EB] font-serif">
                Mes amis & invitations
              </h3>
            </div>
            <p className="text-sm opacity-70 text-[#6D2932] dark:text-zinc-300 pl-7">
              Recherchez ou invitez de nouvelles personnes
            </p>
          </div>
          <button
            id="close-friends-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 text-[#27272A] dark:text-zinc-400 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs: Par Pseudo vs Par Mail */}
        <div className="p-1 bg-[#E8D8C4]/50 dark:bg-zinc-800/80 rounded-2xl flex gap-1 border border-[#C7B7A3]/40 dark:border-zinc-700">
          <button
            type="button"
            id="tab-invite-pseudo-btn"
            onClick={() => {
              setInviteMode('pseudo');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              inviteMode === 'pseudo'
                ? 'bg-[#6D2932] text-[#FFF9EB] shadow-xs'
                : 'text-[#27272A] dark:text-zinc-300 hover:bg-[#E8D8C4]/80 dark:hover:bg-zinc-700'
            }`}
          >
            <AtSign className="w-3.5 h-3.5" />
            <span>Rechercher un pseudo</span>
          </button>
          <button
            type="button"
            id="tab-invite-email-btn"
            onClick={() => {
              setInviteMode('email');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              inviteMode === 'email'
                ? 'bg-[#6D2932] text-[#FFF9EB] shadow-xs'
                : 'text-[#27272A] dark:text-zinc-300 hover:bg-[#E8D8C4]/80 dark:hover:bg-zinc-700'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Invitation par mail</span>
          </button>
        </div>

        {/* Section 1: Ajout par Pseudo */}
        {inviteMode === 'pseudo' ? (
          <div className="p-3.5 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/60 border border-[#C7B7A3]/60 dark:border-zinc-700 space-y-3">
            <div>
              <label htmlFor="friend-pseudo-input" className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                Rechercher un pseudo
              </label>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-2.5">
              <div className="relative">
                <input
                  id="friend-pseudo-input"
                  type="text"
                  value={pseudoInput}
                  onChange={(e) => {
                    // Retirer les espaces éventuels pour garantir un pseudo unique valide
                    const val = e.target.value.replace(/\s+/g, '');
                    setPseudoInput(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Ex : @nom.exemple"
                  required
                  disabled={isSending}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] placeholder:text-[#27272A]/40 dark:placeholder:text-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-[#6D2932] disabled:opacity-50"
                />
                <AtSign className="w-4 h-4 text-[#6D2932] dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                {isSearchingPseudo && (
                  <Loader2 className="w-4 h-4 text-[#6D2932] dark:text-amber-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
                )}
              </div>

              <button
                type="submit"
                id="friends-send-pseudo-btn"
                disabled={isSending || !pseudoInput.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-[#6D2932] text-[#FFF9EB] text-xs font-bold hover:bg-[#541C24] transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recherche et envoi...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Ajouter cet ami</span>
                  </>
                )}
              </button>
            </form>

            {/* Suggestions / Résultats instantanés de recherche par pseudo */}
            {pseudoSearchResults.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-[#C7B7A3]/40 dark:border-zinc-700 animate-fade-in">
                <span className="text-[10px] font-bold text-[#6D2932] dark:text-amber-300 uppercase tracking-wider">
                  Utilisateurs trouvés ({pseudoSearchResults.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {pseudoSearchResults.map((user) => {
                    const isAlreadyFriend = acceptedFriends.some((f) => f.id === user.id);
                    const isPending = pendingSent.some((f) => f.id === user.id);
                    const displayName = user.name || user.firstName || 'Utilisateur';

                    return (
                      <div
                        key={user.id}
                        id={`user-search-item-${user.id}`}
                        className="p-2.5 rounded-xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/50 dark:border-zinc-700 flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={user.avatar || '/Avatar_Herisson.jpg'}
                            alt={displayName}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-[#C7B7A3] shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] truncate">
                              {displayName}
                            </div>
                            <div className="text-[10px] text-[#6D2932] dark:text-zinc-400 truncate">
                              {user.handle || (user.email ? user.email : '@pseudo')}
                            </div>
                          </div>
                        </div>

                        {isAlreadyFriend ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                            <UserCheck className="w-3 h-3" />
                            <span>Ami</span>
                          </span>
                        ) : isPending ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            <span>En attente</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isSending}
                            onClick={() => handleSendInviteByPseudo(user.name || user.handle || user.id)}
                            className="px-3 py-1.5 rounded-xl bg-[#6D2932] text-[#FFF9EB] text-xs font-bold hover:bg-[#541C24] flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Ajouter</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {feedbackMsg ? (
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 animate-fade-in">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{typeof feedbackMsg === 'string' ? feedbackMsg : ((feedbackMsg as any)?.message || '')}</span>
              </div>
            ) : null}

            {errorMsg ? (
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5 animate-fade-in">
                <X className="w-4 h-4 shrink-0" />
                <span>{typeof errorMsg === 'string' ? errorMsg : ((errorMsg as any)?.message || (errorMsg as any)?.error || 'Une erreur est survenue')}</span>
              </div>
            ) : null}
          </div>
        ) : (
          /* Section 2: Invitation par Mail */
          <div className="p-3.5 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/60 border border-[#C7B7A3]/60 dark:border-zinc-700 space-y-3">
            <label htmlFor="friend-email-input" className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
              Inviter un ami par mail
            </label>

            <form onSubmit={handleSendInvite} className="space-y-2.5">
              <div className="relative">
                <input
                  id="friend-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="nom@exemple.com"
                  required
                  disabled={isSending}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] placeholder:text-[#27272A]/40 dark:placeholder:text-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-[#6D2932] disabled:opacity-50"
                />
                <Mail className="w-4 h-4 text-[#6D2932] dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <button
                type="submit"
                id="friends-send-invite-btn"
                disabled={isSending || !email.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-[#6D2932] text-[#FFF9EB] text-xs font-bold hover:bg-[#541C24] transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Envoyer l'invitation</span>
                  </>
                )}
              </button>
            </form>

            {feedbackMsg ? (
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 animate-fade-in">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{typeof feedbackMsg === 'string' ? feedbackMsg : ((feedbackMsg as any)?.message || '')}</span>
              </div>
            ) : null}

            {errorMsg ? (
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5 animate-fade-in">
                <X className="w-4 h-4 shrink-0" />
                <span>{typeof errorMsg === 'string' ? errorMsg : ((errorMsg as any)?.message || (errorMsg as any)?.error || 'Une erreur est survenue')}</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Pending Requests Received */}
        {pendingReceived.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#6D2932] dark:text-amber-300 uppercase tracking-wider">
              Demandes reçues ({pendingReceived.length})
            </h4>

            <div className="space-y-1.5">
              {pendingReceived.map((req) => (
                <PendingFriendItem
                  key={req.id}
                  req={req}
                  onAccept={onAcceptFriendRequest}
                  onDecline={onDeclineFriendRequest}
                />
              ))}
            </div>
          </div>
        )}

        {/* Search inside existing friends */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#6D2932] dark:text-[#FFF9EB]" />
              <h4 className="text-lg font-bold text-[#6D2932] dark:text-[#FFF9EB] font-serif">
                Mes amis ({acceptedFriends.length})
              </h4>
            </div>

            {pendingSent.length > 0 && (
              <span className="text-xs opacity-70 text-[#6D2932] dark:text-zinc-300">
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
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#6D2932]"
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
                <FriendItem
                  key={friend.id}
                  friend={friend}
                  onDeleteFriend={onDeleteFriend}
                />
              ))
            )}
          </div>

          {/* Footer Close */}
          <div className="pt-3 border-t border-[#C7B7A3]/40 dark:border-zinc-800 flex justify-end shrink-0">
            <button
              type="button"
              id="add-friends-footer-close-btn"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-[#6D2932] text-[#FFF9EB] hover:bg-[#541C24] active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Fermer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
