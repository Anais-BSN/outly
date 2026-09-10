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
  Sparkles
} from 'lucide-react';
import { ChatMessage, UserProfile, GroupMember, EmojiReaction } from '../../types';
import { formatDateTime, formatTimeOnly } from '../../utils/formatters';

interface DiscussionTabProps {
  messages?: ChatMessage[];
  currentUser: UserProfile;
  members?: GroupMember[];
  onSendMessage: (text: string, imageUrl?: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🤤', '👏', '🙌'];

export const DiscussionTab: React.FC<DiscussionTabProps> = ({
  messages = [],
  currentUser,
  members = [],
  onSendMessage,
  onAddReaction,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
  };

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
    <div className="flex flex-col h-[calc(100dvh-125px)] sm:h-[calc(100dvh-135px)] max-w-4xl mx-auto">
      {/* Messages Stream */}
      <div
        id="discussion-messages-container"
        className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-4"
      >
        {messages.map((message) => {
          const isMe = message.senderId === currentUser.id;

          // System messages
          if (message.isSystem) {
            return (
              <div
                key={message.id}
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

          // User chat message bubble
          return (
            <div
              key={message.id}
              id={`chat-msg-${message.id}`}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
            >
              {/* Bubble header with avatar, name, date and time */}
              <div className="flex items-center gap-2 mb-1 px-1">
                {!isMe && (
                  <img
                    src={message.senderAvatar}
                    alt={message.senderName}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-[#C7B7A3]"
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
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-[#6D2932]"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* Message Bubble Container */}
              <div
                className={`relative max-w-[85%] sm:max-w-md p-3.5 rounded-2xl shadow-xs transition-all ${
                  isMe
                    ? 'bg-[#6D2932] text-[#FFF9EB] rounded-tr-xs'
                    : 'bg-[#E8D8C4] dark:bg-[#27272A] text-[#27272A] dark:text-[#FFF9EB] border border-[#C7B7A3] dark:border-zinc-700/80 rounded-tl-xs'
                }`}
              >
                {/* Optional attached image */}
                {message.imageUrl && (
                  <div className="mb-2 rounded-2xl overflow-hidden max-h-60">
                    <img
                      src={message.imageUrl}
                      alt="Attachment"
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(message.imageUrl, '_blank')}
                    />
                  </div>
                )}

                {/* Message text */}
                {message.text && (
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.text}
                  </p>
                )}

                {/* Reactions badge display */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 pt-1 border-t border-black/10 dark:border-white/10">
                    {message.reactions.map((r, i) => {
                      const hasReacted = r.users.includes(currentUser.id);
                      return (
                        <button
                          key={i}
                          onClick={() => onAddReaction(message.id, r.emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all cursor-pointer ${
                            hasReacted
                              ? 'bg-[#FFF9EB] text-[#6D2932] font-bold shadow-xs ring-1 ring-[#6D2932]'
                              : 'bg-black/10 dark:bg-zinc-800 text-current'
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span className="text-[10px]">{r.users.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Read Receipts & Quick Reaction button */}
              <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-[#27272A]/60 dark:text-zinc-400">
                {/* Quick reaction trigger */}
                <div className="relative">
                  <button
                    id={`btn-react-${message.id}`}
                    onClick={() =>
                      setActiveReactionMenu(
                        activeReactionMenu === message.id ? null : message.id
                      )
                    }
                    className="opacity-80 hover:opacity-100 hover:text-[#6D2932] dark:hover:text-amber-200 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Smile className="w-3.5 h-3.5" />
                    <span>Réagir</span>
                  </button>

                  {/* Reaction Popup */}
                  {activeReactionMenu === message.id && (
                    <div
                      id={`reaction-picker-${message.id}`}
                      className={`absolute bottom-full mb-1 z-30 flex items-center gap-1 p-1 bg-[#FFF9EB] dark:bg-zinc-900 rounded-full shadow-lg border border-[#C7B7A3] dark:border-zinc-700 animate-fade-in ${
                        isMe ? 'right-0' : 'left-0'
                      }`}
                    >
                      {COMMON_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            onAddReaction(message.id, emoji);
                            setActiveReactionMenu(null);
                          }}
                          className="w-7 h-7 flex items-center justify-center text-base hover:scale-125 transition-transform cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Read indicator (Vu par) */}
                {isMe && message.readBy && message.readBy.length > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5 text-[#9FB2AC]" />
                    <span>
                      Vu par{' '}
                      {message.readBy
                        .map((id) => members.find((m) => m.id === id)?.firstName || 'Un ami')
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview attachment box before sending */}
      {selectedImage && (
        <div className="px-4 py-2 bg-[#E8D8C4]/60 dark:bg-zinc-800 border-t border-[#C7B7A3]/50 flex items-center justify-between">
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
            onClick={() => setSelectedImage(null)}
            className="p-1.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Message Bar */}
      <div className="p-3 sm:p-4 bg-[#FFF9EB] dark:bg-[#18181B] border-t border-[#C7B7A3]/50 dark:border-zinc-800">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* File Image Upload Trigger */}
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

          {/* Text input */}
          <input
            type="text"
            id="chat-text-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 px-4 py-2.5 rounded-full bg-[#E8D8C4]/60 dark:bg-zinc-800/80 border border-[#C7B7A3] dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] placeholder:text-[#27272A]/50 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#6D2932]"
          />

          {/* Submit button */}
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
