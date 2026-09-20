import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Image as ImageIcon,
  Smile,
  X,
  CheckCheck,
  Calendar,
  BarChart2,
  CheckSquare,
  Receipt,
  UserPlus,
  LogOut,
  Sparkles,
  Pencil,
  Trash2,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { ChatMessage, UserProfile, GroupMember } from '../../types';
import { formatDateTime, formatTimeOnly } from '../../utils/formatters';

interface DiscussionTabProps {
  messages?: ChatMessage[];
  currentUser: UserProfile;
  members?: GroupMember[];
  onSendMessage: (text: string, imageUrl?: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onViewAvatar?: (url: string, title?: string, subtitle?: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🤤', '👏', '🙌'];

interface MessageItemProps {
  message: ChatMessage;
  currentUser: UserProfile;
  isConsecutive: boolean;
  members: GroupMember[];
  onAddReaction: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onViewAvatar?: (url: string, title?: string, subtitle?: string) => void;
}

const MessageItem = React.memo<MessageItemProps>(({
  message,
  currentUser,
  isConsecutive,
  members,
  onAddReaction,
  onEditMessage,
  onDeleteMessage,
  onViewAvatar,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState(message.text || '');
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMe = message.senderId === currentUser.id;

  // Tous les autres membres du groupe en dehors de l'expéditeur
  const otherGroupMembers = members.filter(
    (m) => (m.userId || m.id) !== message.senderId
  );

  // Les autres membres qui ont lu ce message
  const readOtherMembers = otherGroupMembers.filter((m) => {
    const mId = m.userId || m.id;
    return (message.readBy || []).includes(mId);
  });

  const isReadByEveryone =
    otherGroupMembers.length > 0 && readOtherMembers.length >= otherGroupMembers.length;

  // Détection appui long sur smartphone (~500ms) avec maintien stable du menu
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setIsMenuOpen(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch (_) {}
      }
    }, 480);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current || !longPressTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPos.current = null;
  };

  // Fermeture automatique au clic / tap en dehors de la barre d'action
  useEffect(() => {
    if (!isMenuOpen && !isPickerOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [isMenuOpen, isPickerOpen]);

  const handleSaveEdit = () => {
    if (editingText.trim() && onEditMessage) {
      onEditMessage(message.id, editingText.trim());
    }
    setIsEditing(false);
  };

  // System message
  if (message.isSystem) {
    const getSystemIcon = (type?: string) => {
      switch (type) {
        case 'event': return <Calendar className="w-4 h-4 text-[#6D2932] dark:text-amber-300 shrink-0" />;
        case 'poll': return <BarChart2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />;
        case 'task': return <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
        case 'settlement': return <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
        case 'member_joined': return <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />;
        case 'member_left': return <LogOut className="w-4 h-4 text-amber-700 shrink-0" />;
        default: return <Sparkles className="w-4 h-4 text-[#6D2932] shrink-0" />;
      }
    };

    return (
      <div
        id={`chat-system-msg-${message.id}`}
        className="flex items-center justify-center my-3"
      >
        <div className="flex items-center gap-2 max-w-lg px-4 py-1.5 rounded-full bg-[#E8D8C4] dark:bg-zinc-800 border border-[#C7B7A3] dark:border-zinc-700 text-xs text-[#6D2932] dark:text-zinc-300 shadow-xs">
          {getSystemIcon(message.systemType)}
          <span className="font-medium text-center">{message.text}</span>
          <span className="text-[10px] opacity-60">
            {formatTimeOnly(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`chat-msg-${message.id}`}
      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group ${
        isConsecutive ? 'mt-0.5' : 'mt-2.5'
      }`}
    >
      {/* En-tête de bulle : Masqué si message consécutif du même auteur dans la même minute */}
      {!isConsecutive && (
        <div className="flex items-center gap-2 mb-1 px-1">
          {!isMe && (
            <img
              src={message.senderAvatar}
              alt={message.senderName}
              title={`${message.senderName} (cliquer pour agrandir)`}
              onClick={() => {
                if (onViewAvatar && message.senderAvatar) {
                  onViewAvatar(message.senderAvatar, message.senderName);
                }
              }}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-[#C7B7A3] cursor-pointer hover:scale-110 transition-transform"
              referrerPolicy="no-referrer"
            />
          )}
          <span className="text-xs font-bold text-[#6D2932] dark:text-[#FFF9EB]">
            {isMe ? 'Moi' : message.senderName}
          </span>
          <span className="text-[10px] text-[#27272A]/60 dark:text-zinc-400 font-normal">
            {formatDateTime(message.timestamp)}
          </span>
          {isMe && (
            <img
              src={currentUser.avatar}
              alt="Moi"
              title="Moi (cliquer pour agrandir)"
              onClick={() => {
                if (onViewAvatar && currentUser.avatar) {
                  onViewAvatar(currentUser.avatar, `${currentUser.firstName} ${currentUser.lastName}`.trim(), currentUser.handle);
                }
              }}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-[#6D2932] cursor-pointer hover:scale-110 transition-transform"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      )}

      {/* Conteneur principal de la bulle (w-fit pour épouser strictement le texte du message) */}
      <div
        className="relative w-fit max-w-[85%] sm:max-w-md"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsMenuOpen((prev) => !prev);
        }}
      >
        {/* Barre d'action contextuelle */}
        <div
          ref={menuRef}
          className={`absolute -top-3.5 ${
            isMe ? 'right-2' : 'left-2'
          } z-20 flex items-center gap-0.5 px-1.5 py-1 bg-[#FFF9EB] dark:bg-zinc-900 rounded-full border border-[#C7B7A3] dark:border-zinc-700 shadow-md ${
            isMenuOpen
              ? 'opacity-100 pointer-events-auto scale-100 ring-2 ring-[#6D2932]/30'
              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto scale-95 group-hover:scale-100'
          } transition-all duration-150`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Réactions émojis rapides */}
          {COMMON_EMOJIS.slice(0, 4).map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onAddReaction(message.id, emoji);
                setIsMenuOpen(false);
                setIsPickerOpen(false);
              }}
              className="w-6 h-6 flex items-center justify-center text-xs hover:scale-125 transition-transform rounded-full hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 cursor-pointer"
              title={`Réagir avec ${emoji}`}
            >
              {emoji}
            </button>
          ))}

          {/* Bouton pour ouvrir le sélecteur complet d'émojis */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPickerOpen((prev) => !prev)}
              className="p-1 rounded-full text-zinc-600 dark:text-zinc-300 hover:text-[#6D2932] dark:hover:text-amber-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Plus d'émojis"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {isPickerOpen && (
              <div
                className="absolute left-0 bottom-full mb-1.5 p-2 bg-[#FFF9EB] dark:bg-zinc-900 rounded-2xl border border-[#C7B7A3] dark:border-zinc-700 shadow-xl grid grid-cols-4 gap-1 z-30 animate-fade-in w-36"
                onClick={(e) => e.stopPropagation()}
              >
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onAddReaction(message.id, emoji);
                      setIsPickerOpen(false);
                      setIsMenuOpen(false);
                    }}
                    className="w-7 h-7 flex items-center justify-center text-sm hover:scale-125 transition-transform rounded-lg hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Séparateur si auteur */}
          {isMe && !message.isSystem && (onEditMessage || onDeleteMessage) && (
            <div className="w-[1px] h-3.5 bg-black/15 dark:bg-white/20 mx-0.5" />
          )}

          {/* Bouton Modifier */}
          {isMe && !message.isSystem && onEditMessage && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setEditingText(message.text || '');
                setIsMenuOpen(false);
                setIsPickerOpen(false);
              }}
              className="p-1 text-zinc-600 dark:text-zinc-300 hover:text-[#6D2932] dark:hover:text-amber-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
              title="Modifier le message"
            >
              <Pencil className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          )}

          {/* Bouton Supprimer */}
          {isMe && !message.isSystem && onDeleteMessage && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Voulez-vous vraiment supprimer ce message ?')) {
                  onDeleteMessage(message.id);
                }
                setIsMenuOpen(false);
                setIsPickerOpen(false);
              }}
              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-full transition-colors cursor-pointer"
              title="Supprimer le message"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          )}
        </div>

        {/* Bulle de message */}
        <div
          className={`p-3 sm:p-3.5 rounded-2xl shadow-xs transition-all ${
            isMe
              ? `bg-[#6D2932] text-[#FFF9EB] ${isConsecutive ? 'rounded-tr-md' : 'rounded-tr-xs'}`
              : `bg-[#E8D8C4] dark:bg-[#27272A] text-[#27272A] dark:text-[#FFF9EB] border border-[#C7B7A3] dark:border-zinc-700/80 ${
                  isConsecutive ? 'rounded-tl-md' : 'rounded-tl-xs'
                }`
          }`}
        >
          {/* Image jointe */}
          {message.imageUrl && (
            <div className="mb-2 rounded-xl overflow-hidden max-h-60">
              <img
                src={message.imageUrl}
                alt="Attachment"
                className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                onClick={() => {
                  if (onViewAvatar && message.imageUrl) {
                    onViewAvatar(message.imageUrl, 'Image partagée');
                  } else {
                    window.open(message.imageUrl, '_blank');
                  }
                }}
                loading="lazy"
              />
            </div>
          )}

          {/* Mode édition inline ou affichage texte */}
          {isEditing ? (
            <div className="space-y-2 w-full min-w-[200px]" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                  }
                }}
                autoFocus
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg bg-white/90 dark:bg-zinc-900 border border-current/30 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="flex items-center justify-end gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 font-medium cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-2.5 py-1 rounded font-bold bg-[#FFF9EB] text-[#6D2932] hover:bg-white shadow-xs cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            message.text && (
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.text}
              </p>
            )
          )}

          {/* Badges de réactions avec fort contraste */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 pt-1 border-t border-black/10 dark:border-white/10">
              {message.reactions.map((r, i) => {
                const hasReacted = r.users.includes(currentUser.id);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onAddReaction(message.id, r.emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all cursor-pointer ${
                      isMe
                        ? hasReacted
                          ? 'bg-[#FFF9EB] text-[#5D0D18] ring-1 ring-amber-400 font-extrabold shadow-xs'
                          : 'bg-black/30 text-[#FFF9EB] hover:bg-black/45 border border-white/20 font-semibold'
                        : hasReacted
                        ? 'bg-[#5D0D18] text-[#FFF9EB] dark:bg-amber-400 dark:text-zinc-950 font-bold shadow-xs'
                        : 'bg-[#FFF9EB] text-[#27272A] dark:bg-zinc-800 dark:text-zinc-200 hover:bg-[#E8D8C4] border border-[#C7B7A3]/60 dark:border-zinc-700 font-semibold'
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span className="text-[11px] font-extrabold tracking-tight">{r.users.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Accusé de lecture positionné SOUS la bulle de message (sans étirer la bulle) */}
      {isMe && readOtherMembers.length > 0 && (
        <div className="flex items-center justify-end gap-1 mt-1 px-1 text-[9.5px] text-[#27272A]/60 dark:text-zinc-400 font-medium select-none max-w-[85%] sm:max-w-md">
          <CheckCheck className="w-3 h-3 text-[#9FB2AC] shrink-0" />
          <span className="truncate">
            {isReadByEveryone
              ? 'Vu par tout le monde'
              : `Vu par ${readOtherMembers
                  .map((m) => m.firstName || m.name?.split(' ')[0] || 'Un membre')
                  .join(', ')}`}
          </span>
        </div>
      )}
    </div>
  );
});

export const DiscussionTab: React.FC<DiscussionTabProps> = ({
  messages = [],
  currentUser,
  members = [],
  onSendMessage,
  onAddReaction,
  onEditMessage,
  onDeleteMessage,
  onViewAvatar,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Pagination des messages : 15 messages par défaut
  const [displayedLimit, setDisplayedLimit] = useState(15);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialScrollDoneRef = useRef(false);

  // Messages découpés selon la limite
  const hasOlderMessages = messages.length > displayedLimit;
  const displayedMessages = messages.slice(Math.max(0, messages.length - displayedLimit));

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Reset pagination limit on group switch
  const currentGroupId = messages[0]?.groupId;
  const prevGroupIdRef = useRef(currentGroupId);
  useEffect(() => {
    if (currentGroupId && currentGroupId !== prevGroupIdRef.current) {
      setDisplayedLimit(15);
      isInitialScrollDoneRef.current = false;
      prevGroupIdRef.current = currentGroupId;
    }
  }, [currentGroupId]);

  // Scroll initial tout en bas au montage / changement de groupe
  useEffect(() => {
    if (!isInitialScrollDoneRef.current && displayedMessages.length > 0) {
      scrollToBottom('auto');
      isInitialScrollDoneRef.current = true;
    }
  }, [displayedMessages.length]);

  // Scroll automatique en bas si un nouveau message arrive et qu'on était proche du bas
  const prevMessagesLengthRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const container = messagesContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 180;
        if (isNearBottom) {
          scrollToBottom('smooth');
        }
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  const handleLoadOlder = () => {
    if (isLoadingOlder || !hasOlderMessages) return;
    setIsLoadingOlder(true);

    const container = messagesContainerRef.current;
    const previousScrollHeight = container?.scrollHeight || 0;
    const previousScrollTop = container?.scrollTop || 0;

    setTimeout(() => {
      setDisplayedLimit((prev) => Math.min(prev + 15, messages.length));
      setIsLoadingOlder(false);

      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
        }
      });
    }, 120);
  };

  const handleContainerScroll = () => {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop < 40 && hasOlderMessages && !isLoadingOlder) {
      handleLoadOlder();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    onSendMessage(inputText.trim(), selectedImage || undefined);
    setInputText('');
    setSelectedImage(null);
    setTimeout(() => scrollToBottom('smooth'), 50);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-125px)] sm:h-[calc(100dvh-135px)] max-w-4xl mx-auto">
      {/* Messages Stream Container */}
      <div
        ref={messagesContainerRef}
        id="discussion-messages-container"
        onScroll={handleContainerScroll}
        className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-1 sm:space-y-1.5"
      >
        {/* Bouton de chargement des messages plus anciens */}
        {hasOlderMessages && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              id="load-older-messages-btn"
              onClick={handleLoadOlder}
              disabled={isLoadingOlder}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E8D8C4] dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs font-semibold text-[#6D2932] dark:text-zinc-200 hover:bg-[#C7B7A3]/60 shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-60"
            >
              {isLoadingOlder ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Chargement des messages anciens...</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Afficher les messages précédents ({messages.length - displayedLimit})</span>
                </>
              )}
            </button>
          </div>
        )}

        {displayedMessages.map((message, index) => {
          // Regroupement des messages consécutifs : même auteur dans la même minute
          const prevMessage = index > 0 ? displayedMessages[index - 1] : undefined;
          const isConsecutive = (() => {
            if (!prevMessage || prevMessage.isSystem || message.isSystem) return false;
            if (prevMessage.senderId !== message.senderId) return false;
            const d1 = new Date(message.timestamp);
            const d2 = new Date(prevMessage.timestamp);
            return (
              d1.getFullYear() === d2.getFullYear() &&
              d1.getMonth() === d2.getMonth() &&
              d1.getDate() === d2.getDate() &&
              d1.getHours() === d2.getHours() &&
              d1.getMinutes() === d2.getMinutes()
            );
          })();

          return (
            <MessageItem
              key={message.id}
              message={message}
              currentUser={currentUser}
              isConsecutive={isConsecutive}
              members={members}
              onAddReaction={onAddReaction}
              onEditMessage={onEditMessage}
              onDeleteMessage={onDeleteMessage}
              onViewAvatar={onViewAvatar}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Prévisualisation d'image avant envoi */}
      {selectedImage && (
        <div className="px-4 py-2 bg-[#E8D8C4]/60 dark:bg-zinc-800 border-t border-[#C7B7A3]/50 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <img
              src={selectedImage}
              alt="Prévisualisation"
              className="w-12 h-12 object-cover rounded-2xl ring-1 ring-[#6D2932]"
            />
            <span className="text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB]">
              Image prête à être envoyée
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="p-1.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barre de saisie de message */}
      <div className="p-3 sm:p-4 bg-[#FFF9EB] dark:bg-[#18181B] border-t border-[#C7B7A3]/50 dark:border-zinc-800">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
            id="chat-file-input"
          />

          <button
            type="button"
            id="chat-upload-img-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Ajouter une photo"
            className="p-2.5 rounded-full bg-[#E8D8C4] dark:bg-zinc-800 text-[#6D2932] dark:text-[#FFF9EB] hover:bg-[#C7B7A3]/60 transition-colors shrink-0 cursor-pointer"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <input
            type="text"
            id="chat-text-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 px-4 py-2.5 rounded-full bg-[#E8D8C4]/60 dark:bg-zinc-800/80 border border-[#C7B7A3] dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] placeholder:text-[#27272A]/50 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#6D2932]"
          />

          <button
            type="submit"
            id="chat-send-btn"
            disabled={!inputText.trim() && !selectedImage}
            className="p-2.5 rounded-full bg-[#6D2932] text-[#FFF9EB] hover:bg-[#541C24] disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer"
          >
            <Send className="w-5 h-5 stroke-[2.2]" />
          </button>
        </form>
      </div>
    </div>
  );
};
