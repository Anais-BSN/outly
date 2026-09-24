import React from 'react';
import { Menu, Search, Bell, Sparkles } from 'lucide-react';
import { UserProfile, AppNotification } from '../types';

interface HeaderProps {
  onOpenDrawer: () => void;
  onOpenSearchFriends: () => void;
  onOpenNotifications: () => void;
  onGoHome?: () => void;
  notifications?: AppNotification[];
  unreadNotificationsCount?: number;
  currentUser?: UserProfile;
  isDarkMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDrawer,
  onOpenSearchFriends,
  onOpenNotifications,
  onGoHome,
  notifications = [],
  unreadNotificationsCount,
  currentUser,
  isDarkMode = false,
}) => {
  const unreadCount =
    typeof unreadNotificationsCount === 'number'
      ? unreadNotificationsCount
      : (notifications || []).filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 w-full bg-[#E8D8C4] dark:bg-[#18181B] border-b border-[#C7B7A3] dark:border-zinc-800 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Burger Menu */}
        <div className="flex items-center gap-4">
          <button
            id="header-burger-btn"
            onClick={onOpenDrawer}
            aria-label="Ouvrir le menu"
            className="p-2 rounded-full text-[#6D2932] dark:text-[#FFF9EB] hover:bg-[#FFF9EB]/60 dark:hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
          >
            <Menu className="w-6 h-6 stroke-[2.2]" />
          </button>
        </div>

        {/* Center: Brand Logo (Clickable to return Home/Dashboard) */}
        <div className="flex items-center justify-center h-full select-none">
          <button
            id="header-logo-btn"
            onClick={onGoHome}
            aria-label="Retour à l'accueil"
            title="Retour à l'accueil"
            className="h-full py-1.5 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 bg-transparent border-none p-0 focus:outline-none"
          >
            <img
              src={isDarkMode ? '/Logo_Outlys_Foncé.png' : '/Logo_Outlys_Clair.png'}
              alt="Logo Outlys"
              className="h-full max-h-12 w-auto object-contain select-none"
            />
          </button>
        </div>

        {/* Right: Search Friends + Notifications */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            id="header-search-btn"
            onClick={onOpenSearchFriends}
            aria-label="Rechercher ou ajouter des amis"
            title="Rechercher par @pseudo ou e-mail"
            className="p-2 rounded-full text-[#6D2932] dark:text-[#FFF9EB] hover:bg-[#FFF9EB]/60 dark:hover:bg-zinc-800 transition-all active:scale-95 relative cursor-pointer"
          >
            <Search className="w-5 h-5 stroke-[2.2]" />
          </button>

          <button
            id="header-notifications-btn"
            onClick={onOpenNotifications}
            aria-label="Notifications"
            title="Notifications"
            className="p-2 rounded-full text-[#6D2932] dark:text-[#FFF9EB] hover:bg-[#FFF9EB]/60 dark:hover:bg-zinc-800 transition-all active:scale-95 relative cursor-pointer"
          >
            <Bell className="w-5 h-5 stroke-[2.2]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-[#E8D8C4] dark:ring-[#18181B] shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Quick Profile Avatar Shortcut */}
          {currentUser && (
            <button
              id="header-profile-avatar-btn"
              onClick={onOpenDrawer}
              className="hidden sm:block ml-1 p-0.5 rounded-full ring-2 ring-[#C7B7A3] hover:ring-[#6D2932] transition-all cursor-pointer"
              title={currentUser.firstName || 'Profil'}
            >
              <img
                src={currentUser.avatar || '/Avatar_Herisson.jpg'}
                alt={currentUser.firstName || 'Avatar'}
                className="w-7 h-7 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
