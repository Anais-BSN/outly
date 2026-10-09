import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  CheckCircle2,
  HelpCircle,
  XCircle,
  ExternalLink,
  History,
} from 'lucide-react';
import { EventItem, GroupMember, UserProfile } from '../../types';
import { formatEventCardDate } from '../../utils/formatters';

interface EventHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  events?: EventItem[];
  members?: GroupMember[];
  currentUser: UserProfile;
  onRsvp?: (eventId: string, status: 'going' | 'maybe' | 'declined') => void;
  onViewAttendees?: (event: EventItem) => void;
}

export const EventHistoryModal: React.FC<EventHistoryModalProps> = ({
  isOpen,
  onClose,
  events = [],
  members = [],
  currentUser,
  onRsvp,
  onViewAttendees,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = useMemo(() => {
    if (!searchTerm.trim()) return events;
    const term = searchTerm.toLowerCase();
    return events.filter(
      (ev) =>
        ev.title.toLowerCase().includes(term) ||
        (ev.location && ev.location.toLowerCase().includes(term)) ||
        (ev.description && ev.description.toLowerCase().includes(term)) ||
        (ev.organizerName && ev.organizerName.toLowerCase().includes(term))
    );
  }, [events, searchTerm]);

  if (!isOpen) return null;

  return (
    <div
      id="event-history-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/70 dark:border-zinc-800 p-4 sm:p-6 z-10 max-h-[92vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#5D0D18]/10 dark:bg-zinc-800 text-[#5D0D18] dark:text-amber-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-serif text-[#5D0D18] dark:text-[#FFF9EB]">
                Historique des événements
              </h3>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
                {events.length} sortie{events.length > 1 ? 's' : ''} archivée{events.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            id="event-history-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        {events.length > 3 && (
          <div className="pt-3 pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#27272A]/50 dark:text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher une sortie passée (titre, lieu...)"
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB] placeholder-[#27272A]/50 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#5D0D18]"
              />
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pt-2 space-y-3 pr-1">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center bg-[#E8D8C4]/40 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-[#C7B7A3] dark:border-zinc-700 my-4">
              <Calendar className="w-10 h-10 text-[#5D0D18]/50 dark:text-zinc-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
                {searchTerm ? 'Aucun événement ne correspond à votre recherche' : 'Aucun événement passé pour l\'instant'}
              </p>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-1">
                Toutes les sorties passées du groupe s'archiveront automatiquement ici.
              </p>
            </div>
          ) : (
            filteredEvents.map((event) => {
              const userRsvp = event.rsvp?.[currentUser.id] || 'pending';
              const goingCount = Object.values(event.rsvp || {}).filter((s) => s === 'going').length;

              return (
                <div
                  key={event.id}
                  className="p-4 rounded-2xl bg-[#E8D8C4]/80 dark:bg-[#27272A] border border-[#C7B7A3] dark:border-zinc-700 shadow-xs flex flex-col space-y-2.5 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {event.bannerImage ? (
                        <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-[#C7B7A3]/80 shadow-xs shrink-0 bg-[#5D0D18]">
                          <img
                            src={event.bannerImage}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#5D0D18] text-white flex items-center justify-center text-xs font-serif font-bold shadow-xs shrink-0">
                          {event.title.charAt(0) || 'E'}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-base font-bold font-serif text-[#5D0D18] dark:text-[#FFF9EB] leading-snug truncate">
                          {event.title}
                        </h4>
                        <span className="text-[10px] text-[#27272A]/70 dark:text-zinc-400">
                          Par {event.organizerName || 'Organisateur'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center gap-1.5 text-xs text-[#27272A]/80 dark:text-zinc-300 font-semibold bg-[#FFF9EB]/60 dark:bg-zinc-800/60 p-2 rounded-xl border border-[#C7B7A3]/40 dark:border-zinc-700/60">
                    <Clock className="w-3.5 h-3.5 text-[#5D0D18] dark:text-amber-300 shrink-0" />
                    <span>{formatEventCardDate(event.startDateTime, event.endDateTime)}</span>
                  </div>

                  {/* Location */}
                  {event.location && (
                    <div className="flex items-center gap-1.5 text-xs text-[#27272A]/80 dark:text-zinc-300">
                      <MapPin className="w-3.5 h-3.5 text-[#6D2932] dark:text-amber-300 shrink-0" />
                      <span className="truncate">{event.location}</span>
                      {event.gpsUrl && (
                        <a
                          href={event.gpsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#6D2932] dark:text-amber-300 hover:underline shrink-0"
                        >
                          <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Footer Attendance - Clickable participant count */}
                  <div className="pt-2 border-t border-[#C7B7A3]/40 dark:border-zinc-700 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => onViewAttendees && onViewAttendees(event)}
                      className="flex items-center gap-1.5 font-bold text-[#6D2932] dark:text-amber-200 hover:underline cursor-pointer"
                      title="Voir la liste détaillée des participants"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{goingCount} participant{goingCount > 1 ? 's' : ''} (voir le détail)</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {userRsvp === 'going' && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Inscrit</span>
                        </span>
                      )}
                      {userRsvp === 'maybe' && (
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Peut-être</span>
                        </span>
                      )}
                      {userRsvp === 'declined' && (
                        <span className="text-[11px] font-bold text-zinc-500 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Décliné</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#C7B7A3]/40 dark:border-zinc-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#E8D8C4] dark:bg-zinc-800 text-[#27272A] dark:text-[#FFF9EB] hover:bg-[#C7B7A3] cursor-pointer transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
