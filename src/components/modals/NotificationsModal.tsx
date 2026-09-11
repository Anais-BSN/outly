import React from 'react';
import {
  X,
  Bell,
  BellRing,
  CheckCheck,
  Calendar,
  BarChart2,
  Receipt,
  UserPlus,
  Trash2,
  Sparkles
} from 'lucide-react';
import { AppNotification, Group } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: AppNotification[];
  groups?: Group[];
  onMarkAllAsRead: () => void;
  onMarkAsRead?: (id: string) => void;
  onDismissNotification: (id: string) => void;
  onSelectGroupFromNotif: (groupId: string) => void;
  onOpenAddFriends?: () => void;
}

interface NotificationItemProps {
  notif: AppNotification;
  group?: Group | null;
  onMarkAsRead?: (id: string) => void;
  onDismissNotification: (id: string) => void;
  onSelectGroupFromNotif: (groupId: string) => void;
  onOpenAddFriends?: () => void;
  onClose: () => void;
}

const NotificationItem = React.memo<NotificationItemProps>(({
  notif,
  group,
  onMarkAsRead,
  onDismissNotification,
  onSelectGroupFromNotif,
  onOpenAddFriends,
  onClose,
}) => {
  const isFriendRequest =
    notif.type === 'invite' ||
    notif.type === 'friend' ||
    notif.message.toLowerCase().includes("demande d'ami") ||
    notif.title.toLowerCase().includes("ami");

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-300 stroke-[2.5]" />;
      case 'invite':
      case 'friend':
        return <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'poll':
        return <BarChart2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'expense':
        return <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Bell className="w-5 h-5 text-[#6D2932] dark:text-[#FFF9EB]" />;
    }
  };

  return (
    <div
      id={`notif-item-${notif.id}`}
      onClick={() => {
        if (!notif.read && onMarkAsRead) {
          onMarkAsRead(notif.id);
        }
        if (isFriendRequest && onOpenAddFriends) {
          onClose();
          onOpenAddFriends();
        } else if (notif.groupId) {
          onSelectGroupFromNotif(notif.groupId);
          onClose();
        }
      }}
      className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
        notif.read
          ? 'bg-[#E8D8C4]/40 dark:bg-zinc-800/40 border-[#C7B7A3]/30 dark:border-zinc-800 opacity-80'
          : 'bg-[#E8D8C4] dark:bg-[#27272A] border-[#C7B7A3]/70 dark:border-zinc-700 shadow-xs'
      }`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-xl bg-[#FFF9EB] dark:bg-zinc-800 shadow-xs shrink-0">
          {getNotifIcon(notif.type)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-[#27272A] dark:text-[#FFF9EB]">
              {notif.title}
            </span>
            {group && (
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-[#6D2932] text-[#FFF9EB]">
                {group.name}
              </span>
            )}
          </div>

          <p className="text-xs text-[#27272A]/85 dark:text-zinc-300 mt-0.5 leading-relaxed">
            {notif.message}
          </p>

          <div className="text-[10px] text-[#27272A]/60 dark:text-zinc-400 mt-1">
            {formatRelativeTime(notif.timestamp)}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {notif.groupId ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!notif.read && onMarkAsRead) {
                onMarkAsRead(notif.id);
              }
              onSelectGroupFromNotif(notif.groupId!);
              onClose();
            }}
            className="px-2.5 py-1 rounded-lg bg-[#6D2932] text-[#FFF9EB] text-[11px] font-bold hover:bg-[#541C24] cursor-pointer"
          >
            Voir
          </button>
        ) : null}

        <button
          id={`dismiss-notif-btn-${notif.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onDismissNotification(notif.id);
          }}
          className="p-1 rounded-lg text-[#27272A]/50 dark:text-zinc-500 hover:text-red-600 cursor-pointer"
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications = [],
  groups = [],
  onMarkAllAsRead,
  onMarkAsRead,
  onDismissNotification,
  onSelectGroupFromNotif,
  onOpenAddFriends,
}) => {
  if (!isOpen) return null;

  const safeNotifications = notifications || [];
  const safeGroups = groups || [];
  const unreadCount = safeNotifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="notif-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="notif-modal-card"
        className="relative w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#6D2932] dark:text-[#FFF9EB]" />
            <h3 className="text-lg font-bold text-[#6D2932] dark:text-[#FFF9EB] font-serif">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full shadow-xs">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                id="notif-mark-all-read-btn"
                onClick={onMarkAllAsRead}
                className="text-xs font-semibold text-[#6D2932] dark:text-amber-200 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Tout marquer comme lu</span>
              </button>
            )}
            <button
              id="notif-modal-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 24h Reminder Spotlight Banner */}
        {notifications.some((n) => n.type === 'reminder') && (
          <div className="p-3.5 rounded-2xl bg-amber-100/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-start gap-3">
            <BellRing className="w-5 h-5 text-amber-800 dark:text-amber-300 shrink-0 mt-0.5 animate-bounce" />
            <div className="text-xs text-amber-950 dark:text-amber-200">
              <strong className="font-bold block">Rappels d'événements à 24 h actifs</strong>
              Outly vérifie automatiquement vos sorties et vous notifie la veille pour ne rien oublier.
            </div>
          </div>
        )}

        {/* Notifications List */}
        {safeNotifications.length === 0 ? (
          <div className="p-8 text-center bg-[#E8D8C4]/40 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-[#C7B7A3] dark:border-zinc-700">
            <Bell className="w-10 h-10 text-[#6D2932]/50 dark:text-zinc-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#27272A] dark:text-[#FFF9EB]">
              Aucune notification
            </p>
            <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-1">
              Vous êtes complètement à jour dans tous vos groupes !
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {safeNotifications.map((notif) => {
              const group = notif.groupId ? safeGroups.find((g) => g.id === notif.groupId) : null;
              return (
                <NotificationItem
                  key={notif.id}
                  notif={notif}
                  group={group}
                  onMarkAsRead={onMarkAsRead}
                  onDismissNotification={onDismissNotification}
                  onSelectGroupFromNotif={onSelectGroupFromNotif}
                  onOpenAddFriends={onOpenAddFriends}
                  onClose={onClose}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
