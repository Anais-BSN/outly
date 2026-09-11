import React from 'react';
import {
  X,
  Bell,
  Calendar,
  Users,
  PlusCircle,
  UserPlus,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { UserProfile, Group, AppNotification } from '../types';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  groups?: Group[];
  activeGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onOpenNotifications: () => void;
  onOpenCalendar: () => void;
  onOpenCreateGroup: () => void;
  onOpenAddFriends: () => void;
  onOpenProfile: () => void;
  notifications?: AppNotification[];
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  groups = [],
  activeGroupId,
  onSelectGroup,
  onOpenNotifications,
  onOpenCalendar,
  onOpenCreateGroup,
  onOpenAddFriends,
  onOpenProfile,
  notifications = [],
}) => {
  if (!isOpen) return null;

  const safeNotifications = notifications || [];
  const unreadCount = safeNotifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        id="drawer-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Drawer content */}
      <div
        id="sidebar-drawer-panel"
        className="relative w-[85%] max-w-sm bg-[#FFF9EB] dark:bg-[#18181B] h-full shadow-2xl border-r border-[#C7B7A3]/50 dark:border-zinc-800 flex flex-col justify-between overflow-y-auto custom-scrollbar z-10 transition-transform"
      >
        <div className="flex-1 flex flex-col">
          {/* Header of Drawer */}
          <div className="relative px-4 py-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800 flex items-center justify-center min-h-[60px]">
            <div className="w-full flex justify-center items-center">
              <img
                src="/Logo_Outly.png"
                alt="Outly"
                className="h-10 sm:h-11 w-auto max-w-[170px] object-contain select-none"
              />
            </div>
            <button
              id="drawer-close-btn"
              onClick={onClose}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-[#6D2932] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Navigation Menu (Order: Notifications & Rappels, Mon calendrier, Mes groupes, Créer un groupe, Ajouter des amis) */}
          <nav className="p-3 space-y-1.5">
            {/* 1. Notifications */}
            <button
              id="drawer-nav-notifications"
              onClick={() => {
                onClose();
                onOpenNotifications();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-left text-sm font-semibold text-[#27272A] dark:text-[#FFF9EB] hover:bg-[#E8D8C4]/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-[#6D2932]/10 dark:bg-zinc-800 text-[#6D2932] dark:text-[#FFF9EB]">
                  <Bell className="w-4 h-4" />
                </div>
                <span>Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* 2. Mon calendrier */}
            <button
              id="drawer-nav-calendar"
              onClick={() => {
                onClose();
                onOpenCalendar();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-left text-sm font-semibold text-[#27272A] dark:text-[#FFF9EB] hover:bg-[#E8D8C4]/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-[#5D0D18]/10 dark:bg-zinc-800 text-[#5D0D18] dark:text-[#FFF9EB]">
                  <Calendar className="w-4 h-4" />
                </div>
                <span>Mon calendrier</span>
              </div>
            </button>

            {/* 3. Ajouter des amis */}
            <button
              id="drawer-nav-add-friends"
              onClick={() => {
                onClose();
                onOpenAddFriends();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-left text-sm font-semibold text-[#27272A] dark:text-[#FFF9EB] hover:bg-[#E8D8C4]/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-[#6D2932]/10 dark:bg-zinc-800 text-[#6D2932] dark:text-[#FFF9EB]">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span>Ajouter des amis</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#C7B7A3] dark:text-zinc-600" />
            </button>

            {/* 4. Créer un groupe */}
            <button
              id="drawer-nav-create-group"
              onClick={() => {
                onClose();
                onOpenCreateGroup();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-left text-sm font-semibold text-[#6D2932] dark:text-amber-200 bg-[#E8D8C4]/50 dark:bg-zinc-800/60 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors border border-[#C7B7A3] dark:border-zinc-700 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-[#6D2932] text-[#FFF9EB]">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <span>Créer un groupe</span>
              </div>
              <span className="text-xs font-bold bg-[#6D2932]/10 dark:bg-zinc-700 px-2.5 py-0.5 rounded-full">
                Nouveau
              </span>
            </button>
          </nav>

          {/* Section: Mes groupes (liste cliquable pour basculer de groupe) */}
          <div className="p-3 border-t border-[#C7B7A3]/40 dark:border-zinc-800 flex-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-[#6D2932] dark:text-zinc-400">
                <Users className="w-3.5 h-3.5" />
                <span>Mes groupes ({groups.length})</span>
              </div>
              <button
                id="drawer-btn-quick-new-group"
                onClick={() => {
                  onClose();
                  onOpenCreateGroup();
                }}
                className="text-xs font-semibold text-[#6D2932] dark:text-amber-300 hover:underline cursor-pointer"
              >
                Créer
              </button>
            </div>

            <div className="space-y-1 max-h-52 overflow-y-auto custom-scrollbar pr-1">
              {groups.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-[#E8D8C4]/40 dark:bg-zinc-800/40 border border-dashed border-[#C7B7A3]/60">
                  <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mb-2">
                    Aucun groupe pour l'instant
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenCreateGroup();
                    }}
                    className="px-3 py-1 bg-[#6D2932] text-[#FFF9EB] rounded-full text-xs font-bold hover:bg-[#541C24] transition-all cursor-pointer"
                  >
                    Créer un groupe
                  </button>
                </div>
              ) : (
                groups.map((group) => {
                  const isActive = group.id === activeGroupId;
                  return (
                    <button
                      key={group.id}
                      id={`drawer-group-item-${group.id}`}
                      onClick={() => {
                        onSelectGroup(group.id);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#6D2932] text-[#FFF9EB] font-bold shadow-sm'
                          : 'text-[#27272A] dark:text-zinc-300 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800/80'
                      }`}
                    >
                      <img
                        src={group.coverImage}
                        alt={group.name}
                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-black/10"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-xs font-semibold">{group.name}</div>
                        <div
                          className={`text-[10px] ${
                            isActive ? 'text-[#FFF9EB]/80' : 'text-[#6D2932]/70 dark:text-zinc-400'
                          }`}
                        >
                          {group.members.length} membres
                        </div>
                      </div>
                      {isActive && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#9FB2AC]" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Mon profil (tout en bas) */}
        <div className="border-t border-[#C7B7A3]/50 dark:border-zinc-800 bg-[#E8D8C4]/40 dark:bg-zinc-900/80 p-3">
          {currentUser ? (
            <div
              id="drawer-profile-banner"
              onClick={() => {
                onClose();
                onOpenProfile();
              }}
              role="button"
              tabIndex={0}
              className="p-3 rounded-2xl bg-[#E8D8C4] dark:bg-[#27272A] border border-[#C7B7A3] dark:border-zinc-700 flex items-center justify-between cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.firstName}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-[#6D2932] dark:ring-[#E8D8C4]"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-[#6D2932] text-[#FFF9EB] text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                    {currentUser.shares} pt{currentUser.shares > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-left min-w-0">
                  <div className="font-bold text-xs text-[#27272A] dark:text-[#FFF9EB] group-hover:text-[#6D2932] dark:group-hover:text-amber-200 transition-colors truncate">
                    {currentUser.firstName} {currentUser.lastName}
                  </div>
                  <div className="text-[11px] text-[#6D2932] dark:text-zinc-400 font-semibold truncate">
                    {currentUser.handle}
                  </div>
                  <div className="text-[10px] text-[#27272A]/70 dark:text-zinc-400">
                    {currentUser.shares} {currentUser.shares > 1 ? 'parts de frais' : 'part'}
                  </div>
                </div>
              </div>
              <div className="p-1.5 rounded-full bg-[#FFF9EB] dark:bg-[#18181B] text-[#6D2932] dark:text-[#FFF9EB] group-hover:translate-x-0.5 transition-transform shadow-xs shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ) : null}

          {/* Version */}
          <div className="mt-2.5 flex items-center justify-between px-1">
            <span className="text-[10px] text-[#27272A]/50 dark:text-zinc-500 font-medium">
              Outly v1.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
