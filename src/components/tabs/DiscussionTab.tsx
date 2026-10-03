import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Image as ImageIcon,
  Smile,
  SmilePlus,
  Plus,
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
  Loader2,
  FileText
} from 'lucide-react';
import { ChatMessage, UserProfile, GroupMember } from '../../types';
import { formatDateTime, formatTimeOnly } from '../../utils/formatters';
import { triggerHaptic } from '../../services/nativeService';
import { QUICK_REACTIONS } from '../../data/emojis';
import { UniversalEmojiPicker } from '../ui/UniversalEmojiPicker';

interface DiscussionTabProps {
  messages?: ChatMessage[];
  currentUser: UserProfile;
  members?: GroupMember[];
  onSendMessage: (text: string, imageUrl?: string, imageUrls?: string[]) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onViewAvatar?: (url: string, title?: string, subtitle?: string) => void;
}

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
  const [pickerAnchorRect, setPickerAnchorRect] = useState<DOMRect | null>(null);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>('top');
  const [menuAlign, setMenuAlign] = useState<'left' | 'right'>('right');

  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState(message.text || '');
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pickerBtnRef = useRef<HTMLButtonElement>(null);

  const isMe = message.senderId === currentUser.id;

  // Positionnement intelligent adaptatif pour ne jamais déborder du viewport
  const updateAdaptivePosition = useCallback(() => {
    if (!bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Si le haut de la bulle est trop près du haut de l'écran ou de l'en-tête, ouvrir en-dessous
    if (rect.top < 65) {
      setMenuPlacement('bottom');
    } else {
      setMenuPlacement('top');
    }

    // Gestion du débordement horizontal
    if (rect.left < 16) {
      setMenuAlign('left');
    } else if (viewportWidth - rect.right < 16) {
      setMenuAlign('right');
    } else {
      setMenuAlign(isMe ? 'right' : 'left');
    }
  }, [isMe]);

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

  // Détection appui long sur smartphone avec maintien permanent de la barre (>2s ou relâchement)
  const isTouchingRef = useRef(false);
  const touchStartTimeRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchStartTimeRef.current = Date.now();
    isTouchingRef.current = true;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      updateAdaptivePosition();
      setIsMenuOpen(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch (_) {}
      }
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current || !longPressTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 12 || dy > 12) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    const elapsed = Date.now() - touchStartTimeRef.current;
    if (elapsed >= 450) {
      updateAdaptivePosition();
      setIsMenuOpen(true);
    }
    touchStartPos.current = null;
    isTouchingRef.current = false;
  };

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    const elapsed = Date.now() - touchStartTimeRef.current;
    if (elapsed >= 450) {
      updateAdaptivePosition();
      setIsMenuOpen(true);
    }
    touchStartPos.current = null;
    isTouchingRef.current = false;
  };

  // Fermeture au clic / tap strictement en dehors de la barre d'action
  useEffect(() => {
    if (!isMenuOpen && !isPickerOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleOutsideClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [isMenuOpen, isPickerOpen]);

  const handleOpenPicker = () => {
    triggerHaptic('light');
    if (pickerBtnRef.current) {
      setPickerAnchorRect(pickerBtnRef.current.getBoundingClientRect());
    } else if (menuRef.current) {
      setPickerAnchorRect(menuRef.current.getBoundingClientRect());
    }
    setIsPickerOpen(true);
  };

  const handleSelectFullEmoji = (emoji: string) => {
    onAddReaction(message.id, emoji);
    setIsPickerOpen(false);
    setIsMenuOpen(false);
  };

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
      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${
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
        ref={bubbleRef}
        className="relative group/bubble w-fit max-w-[85%] sm:max-w-md select-none touch-manipulation"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onMouseEnter={updateAdaptivePosition}
        onContextMenu={(e) => {
          e.preventDefault();
          updateAdaptivePosition();
          setIsMenuOpen((prev) => !prev);
        }}
      >
        {/* Barre d'action contextuelle avec positionnement adaptatif anti-débordement */}
        <div
          ref={menuRef}
          className={`absolute ${
            menuPlacement === 'top' ? '-top-4' : 'top-full mt-1.5'
          } ${
            menuAlign === 'right' ? 'right-1' : 'left-1'
          } z-20 flex items-center gap-0.5 px-2 py-1 bg-[#FFF9EB] dark:bg-zinc-900 rounded-full border border-[#C7B7A3] dark:border-zinc-700 shadow-lg ${
            isMenuOpen
              ? 'opacity-100 pointer-events-auto scale-100 ring-2 ring-[#6D2932]/30'
              : 'opacity-0 pointer-events-none group-hover/bubble:opacity-100 group-hover/bubble:pointer-events-auto scale-95 group-hover/bubble:scale-100'
          } transition-all duration-150`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Réactions émojis rapides */}
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onAddReaction(message.id, emoji);
                setIsMenuOpen(false);
                setIsPickerOpen(false);
              }}
              className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs sm:text-sm hover:scale-130 active:scale-95 transition-transform rounded-full hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 cursor-pointer"
              title={`Réagir avec ${emoji}`}
            >
              {emoji}
            </button>
          ))}

          {/* Bouton d'extension universel ouvrant le sélecteur complet */}
          <button
            ref={pickerBtnRef}
            type="button"
            onClick={handleOpenPicker}
            className="p-1 sm:p-1.5 rounded-full text-zinc-600 dark:text-zinc-300 hover:text-[#6D2932] dark:hover:text-amber-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center group/btn"
            title="Tous les émojis..."
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] group-hover/btn:rotate-90 transition-transform duration-200" />
          </button>

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

        {/* Sélecteur d'émojis universel et adaptatif (Popover intelligent ou Bottom Sheet sur mobile) */}
        <UniversalEmojiPicker
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelectEmoji={handleSelectFullEmoji}
          anchorRect={pickerAnchorRect}
          title="Ajouter une réaction"
        />

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
          {/* Fichier / Image(s) joint(s) sous forme de mosaïque Teams / WhatsApp */}
          {(() => {
            const allImages: string[] = (() => {
              if (message.imageUrls && Array.isArray(message.imageUrls) && message.imageUrls.length > 0) {
                return message.imageUrls;
              }
              if (message.imageUrl) {
                if (typeof message.imageUrl === 'string' && message.imageUrl.startsWith('[') && message.imageUrl.endsWith(']')) {
                  try {
                    const parsed = JSON.parse(message.imageUrl);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                  } catch (_) {}
                }
                const isImg =
                  message.imageUrl.startsWith('data:image/') ||
                  message.imageUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) ||
                  (!message.imageUrl.startsWith('data:application/') &&
                    !message.imageUrl.startsWith('data:text/') &&
                    !message.imageUrl.startsWith('data:'));
                if (isImg) return [message.imageUrl];
              }
              return [];
            })();

            if (allImages.length === 1) {
              return (
                <div className="mb-2 rounded-2xl overflow-hidden max-h-72 shadow-xs">
                  <img
                    src={allImages[0]}
                    alt="Image partagée"
                    className="w-full h-full max-h-72 object-cover hover:scale-[1.02] transition-transform cursor-pointer"
                    onClick={() => {
                      if (onViewAvatar) {
                        onViewAvatar(allImages[0], 'Photo partagée');
                      } else {
                        window.open(allImages[0], '_blank');
                      }
                    }}
                    loading="lazy"
                  />
                </div>
              );
            }

            if (allImages.length === 2) {
              return (
                <div className="mb-2 grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden max-w-sm shadow-xs">
                  {allImages.map((imgUrl, idx) => (
                    <div key={idx} className="relative aspect-square sm:aspect-[4/3] bg-black/10 overflow-hidden group/img">
                      <img
                        src={imgUrl}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200 cursor-pointer"
                        onClick={() => {
                          if (onViewAvatar) {
                            onViewAvatar(imgUrl, `Photo ${idx + 1} sur ${allImages.length}`);
                          } else {
                            window.open(imgUrl, '_blank');
                          }
                        }}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              );
            }

            if (allImages.length === 3) {
              return (
                <div className="mb-2 grid grid-cols-2 grid-rows-2 gap-1.5 h-48 sm:h-56 rounded-2xl overflow-hidden max-w-sm shadow-xs">
                  <div className="relative row-span-2 bg-black/10 overflow-hidden group/img">
                    <img
                      src={allImages[0]}
                      alt="Photo 1"
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200 cursor-pointer"
                      onClick={() => {
                        if (onViewAvatar) {
                          onViewAvatar(allImages[0], 'Photo 1 sur 3');
                        } else {
                          window.open(allImages[0], '_blank');
                        }
                      }}
                      loading="lazy"
                    />
                  </div>
                  <div className="relative bg-black/10 overflow-hidden group/img">
                    <img
                      src={allImages[1]}
                      alt="Photo 2"
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200 cursor-pointer"
                      onClick={() => {
                        if (onViewAvatar) {
                          onViewAvatar(allImages[1], 'Photo 2 sur 3');
                        } else {
                          window.open(allImages[1], '_blank');
                        }
                      }}
                      loading="lazy"
                    />
                  </div>
                  <div className="relative bg-black/10 overflow-hidden group/img">
                    <img
                      src={allImages[2]}
                      alt="Photo 3"
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200 cursor-pointer"
                      onClick={() => {
                        if (onViewAvatar) {
                          onViewAvatar(allImages[2], 'Photo 3 sur 3');
                        } else {
                          window.open(allImages[2], '_blank');
                        }
                      }}
                      loading="lazy"
                    />
                  </div>
                </div>
              );
            }

            if (allImages.length >= 4) {
              const extra = allImages.length - 4;
              return (
                <div className="mb-2 grid grid-cols-2 grid-rows-2 gap-1.5 h-48 sm:h-56 rounded-2xl overflow-hidden max-w-sm shadow-xs">
                  {allImages.slice(0, 4).map((imgUrl, idx) => {
                    const isFourth = idx === 3;
                    return (
                      <div
                        key={idx}
                        className="relative bg-black/10 overflow-hidden group/img cursor-pointer"
                        onClick={() => {
                          if (onViewAvatar) {
                            onViewAvatar(imgUrl, `Photo ${idx + 1} sur ${allImages.length}`);
                          } else {
                            window.open(imgUrl, '_blank');
                          }
                        }}
                      >
                        <img
                          src={imgUrl}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                        {isFourth && extra > 0 && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-white font-extrabold text-base sm:text-lg group-hover/img:bg-black/70 transition-colors">
                            +{extra + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }

            if (message.imageUrl) {
              return (
                <div className="mb-2 p-2.5 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                    <span className="text-xs font-semibold truncate">Document joint</span>
                  </div>
                  <a
                    href={message.imageUrl}
                    download="document"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold underline px-2.5 py-1 rounded bg-[#FFF9EB] text-[#6D2932] dark:bg-zinc-800 dark:text-zinc-200 hover:opacity-90 transition-opacity shrink-0"
                  >
                    Télécharger
                  </a>
                </div>
              );
            }

            return null;
          })()}

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

          {/* Badges de réactions avec fort contraste et bordeaux sombre en mode sombre */}
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
                          ? 'bg-[#FFF9EB] text-[#5D0D18] dark:bg-[#450912] dark:text-[#FFF9EB] dark:border dark:border-[#5D0D18] dark:ring-1 dark:ring-[#5D0D18] font-bold shadow-xs'
                          : 'bg-[#450912]/30 text-[#FFF9EB] hover:bg-[#450912]/50 dark:bg-[#35070E] dark:text-[#FFF9EB] border border-white/20 dark:border-[#5D0D18]/60 font-semibold'
                        : hasReacted
                        ? 'bg-[#5D0D18] text-[#FFF9EB] dark:bg-[#450912] dark:text-[#FFF9EB] dark:border dark:border-[#5D0D18] font-bold shadow-xs'
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
  interface PendingAttachment {
    id: string;
    name: string;
    size: number;
    type: string;
    dataUrl: string;
    isImage: boolean;
  }

  const [selectedFiles, setSelectedFiles] = useState<PendingAttachment[]>([]);
  const [isInputEmojiPickerOpen, setIsInputEmojiPickerOpen] = useState(false);
  const [inputEmojiAnchorRect, setInputEmojiAnchorRect] = useState<DOMRect | null>(null);
  const inputEmojiBtnRef = useRef<HTMLButtonElement>(null);

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

  const handleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from(files);
    const newItems: Promise<PendingAttachment>[] = fileList.map((file: File) => {
      return new Promise((resolve) => {
        const isImage = file.type.startsWith('image/');
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: reader.result as string,
            isImage,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newItems).then((loaded) => {
      setSelectedFiles((prev) => [...prev, ...loaded]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    });
  };

  const handleRemoveFile = (fileId: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && selectedFiles.length === 0) return;

    const trimmedText = inputText.trim();

    const imageAttachments = selectedFiles.filter((f) => f.isImage);
    const docAttachments = selectedFiles.filter((f) => !f.isImage);

    if (imageAttachments.length > 0) {
      // Regrouper toutes les images dans un seul message (Style Teams / WhatsApp)
      const imgUrls = imageAttachments.map((f) => f.dataUrl);
      onSendMessage(trimmedText, imgUrls[0], imgUrls);
    } else if (trimmedText) {
      onSendMessage(trimmedText);
    }

    // Documents joints éventuels
    docAttachments.forEach((doc) => {
      onSendMessage(`📄 ${doc.name}`, doc.dataUrl);
    });

    setInputText('');
    setSelectedFiles([]);
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

      {/* Prévisualisation des fichiers et médias sélectionnés avant envoi */}
      {selectedFiles.length > 0 && (
        <div className="px-3 sm:px-4 py-2.5 bg-[#E8D8C4]/70 dark:bg-zinc-800/90 border-t border-[#C7B7A3]/50 dark:border-zinc-700 animate-fade-in">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-[#6D2932] dark:text-[#FFF9EB] flex items-center gap-1.5">
              <span>Fichiers prêts à être envoyés ({selectedFiles.length})</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedFiles([])}
              className="text-[11px] text-red-600 dark:text-red-400 hover:underline font-semibold cursor-pointer"
            >
              Tout effacer
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
            {selectedFiles.map((item) => (
              <div
                key={item.id}
                className="relative group shrink-0 rounded-xl overflow-hidden border border-[#C7B7A3] dark:border-zinc-700 bg-[#FFF9EB] dark:bg-zinc-900 shadow-xs flex items-center"
              >
                {item.isImage ? (
                  <div className="relative w-16 h-16 sm:w-18 sm:h-18">
                    <img
                      src={item.dataUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  <div className="w-32 h-16 sm:h-18 p-2 flex flex-col justify-center bg-amber-50 dark:bg-zinc-800 text-[#27272A] dark:text-[#FFF9EB]">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#6D2932] dark:text-amber-300 shrink-0" />
                      <span className="text-[11px] font-bold truncate">{item.name}</span>
                    </div>
                    <span className="text-[9px] text-[#27272A]/60 dark:text-zinc-400 mt-1">
                      {(item.size / 1024).toFixed(0)} Ko
                    </span>
                  </div>
                )}

                {/* Bouton pour retirer la miniature */}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(item.id)}
                  title="Retirer ce fichier"
                  className="absolute top-1 right-1 p-1 rounded-full bg-red-600/90 text-white hover:bg-red-700 shadow-md cursor-pointer transition-transform hover:scale-110 active:scale-95 z-10"
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barre de saisie de message */}
      <div className="p-3 sm:p-4 bg-[#FFF9EB] dark:bg-[#18181B] border-t border-[#C7B7A3]/50 dark:border-zinc-800">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFilesUpload}
            multiple
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
            className="hidden"
            id="chat-file-input"
          />

          <button
            type="button"
            id="chat-upload-img-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Joindre photos ou documents (sélection multiple)"
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
            ref={inputEmojiBtnRef}
            type="button"
            id="chat-emoji-btn"
            onClick={() => {
              triggerHaptic('light');
              if (inputEmojiBtnRef.current) {
                setInputEmojiAnchorRect(inputEmojiBtnRef.current.getBoundingClientRect());
              }
              setIsInputEmojiPickerOpen(true);
            }}
            title="Insérer un émoji"
            className="p-2.5 rounded-full bg-[#E8D8C4] dark:bg-zinc-800 text-[#6D2932] dark:text-[#FFF9EB] hover:bg-[#C7B7A3]/60 transition-colors shrink-0 cursor-pointer"
          >
            <Smile className="w-5 h-5" />
          </button>

          <button
            type="submit"
            id="chat-send-btn"
            disabled={!inputText.trim() && selectedFiles.length === 0}
            className="p-2.5 rounded-full bg-[#6D2932] text-[#FFF9EB] hover:bg-[#541C24] disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer"
          >
            <Send className="w-5 h-5 stroke-[2.2]" />
          </button>
        </form>

        {/* Sélecteur d'émojis universel pour la saisie de message */}
        <UniversalEmojiPicker
          isOpen={isInputEmojiPickerOpen}
          onClose={() => setIsInputEmojiPickerOpen(false)}
          onSelectEmoji={(emoji) => {
            setInputText((prev) => prev + emoji);
          }}
          anchorRect={inputEmojiAnchorRect}
          title="Insérer un émoji"
        />
      </div>
    </div>
  );
};
