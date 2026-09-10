import React, { useState, useRef, useEffect } from 'react';
import {
  UserPlus,
  MoreVertical,
  LogOut,
  Trash2,
  Edit,
  Users
} from 'lucide-react';
import { Group, UserProfile } from '../types';

interface GroupBannerProps {
  group: Group;
  currentUser?: UserProfile;
  onInviteMember?: () => void;
  onOpenInviteModal?: () => void;
  onLeaveGroup?: () => void;
  onDeleteGroup?: () => void;
  onEditGroup?: () => void;
}

export const GroupBanner: React.FC<GroupBannerProps> = ({
  group,
  currentUser,
  onInviteMember,
  onOpenInviteModal,
  onLeaveGroup,
  onDeleteGroup,
  onEditGroup,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleInvite = onInviteMember || onOpenInviteModal || (() => {});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!group) return null;

  const safeMembers = group.members || [];
  const isAdmin = safeMembers.some(
    (m) => (m.userId === currentUser?.id || m.id === currentUser?.id) && m.role === 'admin'
  );

  return (
    <div className="relative w-full border-b border-[#C7B7A3]/50 bg-gradient-to-r from-[#E8D8C4] via-[#F6ECE0] to-[#FFF9EB] dark:from-[#27272A] dark:via-[#202023] dark:to-[#18181B] transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Group Visual (Circular Thumbnail next to title) + Stacked Avatars */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* Circular Thumbnail right next to group title */}
          {group.coverImage ? (
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden ring-2 ring-[#C7B7A3] shadow-sm shrink-0">
              <img
                src={group.coverImage}
                alt={group.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#6D2932] flex items-center justify-center text-white text-lg font-serif shadow-sm shrink-0">
              {group.name?.charAt(0) || 'G'}
            </div>
          )}

          {/* Group Name & Member count */}
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold font-serif text-[#5D0D18] dark:text-[#FFF9EB] tracking-tight truncate">
              {group.name}
            </h2>

            {/* Member avatars stack + count */}
            <div className="flex items-center mt-1 gap-2">
              <div className="flex -space-x-2 overflow-hidden">
                {safeMembers.slice(0, 5).map((member) => (
                  <img
                    key={member?.id || member?.userId || Math.random()}
                    src={member?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt={`${member?.firstName || ''} ${member?.lastName || ''}`.trim() || 'Membre'}
                    title={`${member?.firstName || 'Membre'}`}
                    className="w-6 h-6 rounded-full border-2 border-[#FFF9EB] dark:border-[#18181B] object-cover ring-1 ring-[#C7B7A3]/50"
                    referrerPolicy="no-referrer"
                  />
                ))}
                {safeMembers.length > 5 && (
                  <div className="w-6 h-6 rounded-full bg-[#5D0D18] border-2 border-[#FFF9EB] dark:border-[#18181B] flex items-center justify-center text-[9px] text-white font-bold">
                    +{safeMembers.length - 5}
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-[#5D0D18]/80 dark:text-zinc-300">
                {safeMembers.length} {safeMembers.length > 1 ? 'membres' : 'membre'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: 3-dots Menu (Member addition is exclusively here) */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            id="banner-btn-context-menu"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Options du groupe"
            className="p-2 border border-[#C7B7A3] bg-[#FFF9EB]/90 dark:bg-zinc-800 text-[#5D0D18] dark:text-[#FFF9EB] rounded-full hover:bg-white dark:hover:bg-zinc-700 transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              id="banner-context-menu-dropdown"
              className="absolute right-0 mt-2 top-full w-56 bg-[#FFF9EB] dark:bg-[#18181B] rounded-2xl shadow-xl border border-[#C7B7A3] dark:border-zinc-700 py-1.5 z-40 animate-fade-in"
            >
              {/* + Ajouter un membre */}
              <button
                id="menu-item-add-member"
                onClick={() => {
                  setShowMenu(false);
                  handleInvite();
                }}
                className="w-full px-4 py-2.5 text-left text-xs font-bold text-[#5D0D18] dark:text-amber-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#5D0D18] dark:text-amber-300" />
                <span>+ Ajouter un membre</span>
              </button>

              {onEditGroup && (
                <button
                  id="menu-item-edit-group"
                  onClick={() => {
                    setShowMenu(false);
                    onEditGroup();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-[#27272A] dark:text-zinc-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <Edit className="w-4 h-4 text-[#5D0D18] dark:text-zinc-400" />
                  <span>Modifier le groupe</span>
                </button>
              )}

              {onLeaveGroup && (
                <button
                  id="menu-item-leave-group"
                  onClick={() => {
                    setShowMenu(false);
                    onLeaveGroup();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Quitter le groupe</span>
                </button>
              )}

              {isAdmin && onDeleteGroup && (
                <>
                  <div className="my-1 border-t border-[#C7B7A3]/50 dark:border-zinc-800" />
                  <button
                    id="menu-item-delete-group"
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteGroup();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer le groupe</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
