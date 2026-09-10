import React, { useState } from 'react';
import {
  X,
  Calendar,
  List,
  Grid,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  ExternalLink,
  Users,
  Sparkles
} from 'lucide-react';
import { EventItem, Group, UserProfile } from '../../types';
import { formatDateTime, formatDateOnly, formatTimeOnly, parseIsoToLocalDate } from '../../utils/formatters';

interface CalendarViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  allEvents?: EventItem[];
  groups?: Group[];
  currentUser: UserProfile;
  onSelectGroupFromEvent: (groupId: string) => void;
}

export const CalendarViewModal: React.FC<CalendarViewModalProps> = ({
  isOpen,
  onClose,
  allEvents = [],
  groups = [],
  currentUser,
  onSelectGroupFromEvent,
}) => {
  if (!isOpen) return null;

  const safeEvents = allEvents || [];
  const safeGroups = groups || [];

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterTime, setFilterTime] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dayNum: number; dateStr: string; events: EventItem[] } | null>(null);

  const now = new Date().toISOString();

  // Filter events
  const filteredEvents = safeEvents.filter((event) => {
    // Group filter
    if (selectedGroupId !== 'all' && event.groupId !== selectedGroupId) return false;

    // Time filter
    if (filterTime === 'upcoming' && event.startDateTime < now) return false;
    if (filterTime === 'past' && event.startDateTime >= now) return false;

    return true;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) =>
    a.startDateTime.localeCompare(b.startDateTime)
  );

  // Calendar month math
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday
  const startingDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
    setSelectedDayEvents(null);
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
    setSelectedDayEvents(null);
  };

  const getEventsForDay = (dayNum: number) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return safeEvents.filter((e) => {
      if (selectedGroupId !== 'all' && e.groupId !== selectedGroupId) return false;
      const { date } = parseIsoToLocalDate(e.startDateTime);
      return date === dayStr;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="calendar-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="calendar-modal-card"
        className="relative w-full max-w-2xl bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-4 sm:p-6 z-10 max-h-[94vh] overflow-y-auto custom-scrollbar animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#5D0D18] dark:text-[#FFF9EB]" />
            <h3 className="text-lg font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
              Mon calendrier
            </h3>
          </div>
          <button
            id="calendar-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Toolbar */}
        <div className="py-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Group Filter Dropdown */}
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] whitespace-nowrap">
                Groupe :
              </label>
              <select
                id="calendar-group-select"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#5D0D18]"
              >
                <option value="all">Tous mes groupes ({groups.length})</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle: Grid vs List (Text only, no icons) */}
            <div className="flex items-center gap-1 bg-[#E8D8C4]/60 dark:bg-zinc-800 p-1 rounded-xl border border-[#C7B7A3]/50 dark:border-zinc-700 self-end sm:self-auto">
              <button
                id="calendar-view-grid-btn"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                    : 'text-[#27272A] dark:text-zinc-300 hover:text-[#5D0D18]'
                }`}
              >
                Grille
              </button>

              <button
                id="calendar-view-list-btn"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                    : 'text-[#27272A] dark:text-zinc-300 hover:text-[#5D0D18]'
                }`}
              >
                Liste
              </button>
            </div>
          </div>

          {/* Time Filter Pills: À venir / Passé / Tout (affiché uniquement en vue Liste) */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-1.5 pt-1">
              <button
                id="cal-filter-upcoming"
                onClick={() => setFilterTime('upcoming')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTime === 'upcoming'
                    ? 'bg-[#5D0D18] text-[#FFF9EB]'
                    : 'bg-[#E8D8C4]/50 dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300'
                }`}
              >
                À venir
              </button>
              <button
                id="cal-filter-past"
                onClick={() => setFilterTime('past')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTime === 'past'
                    ? 'bg-[#5D0D18] text-[#FFF9EB]'
                    : 'bg-[#E8D8C4]/50 dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300'
                }`}
              >
                Passé
              </button>
              <button
                id="cal-filter-all"
                onClick={() => setFilterTime('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTime === 'all'
                    ? 'bg-[#5D0D18] text-[#FFF9EB]'
                    : 'bg-[#E8D8C4]/50 dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300'
                }`}
              >
                Tout
              </button>
            </div>
          )}
        </div>

        {/* View Mode 1: Grille mensuelle responsive avec pastilles bordeaux (#5D0D18) */}
        {viewMode === 'grid' && (
          <div className="space-y-3 pt-2">
            {/* Month Navigation */}
            <div className="flex items-center justify-between px-2 py-1 bg-[#E8D8C4]/50 dark:bg-zinc-800/60 rounded-xl border border-[#C7B7A3]/40 dark:border-zinc-700">
              <button
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-[#E8D8C4] text-[#5D0D18] dark:text-[#FFF9EB] cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="font-bold text-sm text-[#27272A] dark:text-[#FFF9EB]">
                {monthNames[month]} {year}
              </div>
              <button
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-[#E8D8C4] text-[#5D0D18] dark:text-[#FFF9EB] cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-[#E8D8C4]/30 dark:bg-zinc-900 p-2 sm:p-3 rounded-2xl border border-[#C7B7A3]/50 dark:border-zinc-800">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-[11px] font-bold text-[#5D0D18] dark:text-zinc-400 mb-2">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells before month start */}
                {Array.from({ length: startingDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[56px] sm:min-h-[72px] rounded-xl bg-transparent" />
                ))}

                {/* Days of current month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayEvents = getEventsForDay(dayNum);
                  const realToday = new Date();
                  const isToday =
                    year === realToday.getFullYear() &&
                    month === realToday.getMonth() &&
                    dayNum === realToday.getDate();
                  const isSelected = selectedDayEvents?.dayNum === dayNum;

                  return (
                    <div
                      key={`day-${dayNum}`}
                      onClick={() => {
                        if (dayEvents.length > 0) {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                          setSelectedDayEvents({ dayNum, dateStr, events: dayEvents });
                        } else {
                          setSelectedDayEvents(null);
                        }
                      }}
                      className={`min-h-[58px] sm:min-h-[76px] p-1 sm:p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-[#5D0D18] bg-[#E8D8C4] dark:bg-zinc-700'
                          : isToday
                          ? 'bg-[#FFF9EB] dark:bg-zinc-800 border-[#5D0D18] ring-2 ring-[#5D0D18]'
                          : 'bg-[#FFF9EB]/80 dark:bg-zinc-800/50 border-[#C7B7A3]/40 dark:border-zinc-800 hover:bg-[#FFF9EB]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] sm:text-[11px] font-bold px-1 rounded-md ${
                            isToday
                              ? 'bg-[#5D0D18] text-[#FFF9EB]'
                              : 'text-[#27272A] dark:text-zinc-300'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5D0D18] dark:bg-amber-400 shrink-0" />
                        )}
                      </div>

                      {/* Pastilles bordeaux (#5D0D18) */}
                      <div className="space-y-0.5 overflow-hidden mt-1">
                        {dayEvents.slice(0, 2).map((evt) => (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectGroupFromEvent(evt.groupId);
                              onClose();
                            }}
                            className="px-1 py-0.5 rounded-md bg-[#5D0D18] text-[#FFF9EB] text-[8px] sm:text-[9px] font-bold truncate cursor-pointer hover:bg-[#450912] shadow-xs"
                            title={evt.title}
                          >
                            {evt.title.length > 14 ? `${evt.title.substring(0, 12)}…` : evt.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[8px] font-bold text-[#5D0D18] dark:text-amber-300 text-center">
                            +{dayEvents.length - 2} autre{dayEvents.length - 2 > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Tap Popover / Accordion when a day is tapped */}
            {selectedDayEvents && (
              <div className="p-3.5 rounded-2xl bg-[#E8D8C4] dark:bg-[#27272A] border border-[#C7B7A3] dark:border-zinc-700 shadow-md space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#C7B7A3]/50">
                  <span className="text-xs font-bold font-serif text-[#5D0D18] dark:text-[#FFF9EB]">
                    Sorties du {formatDateOnly(selectedDayEvents.dateStr)}
                  </span>
                  <button
                    onClick={() => setSelectedDayEvents(null)}
                    className="p-1 rounded-lg text-xs hover:bg-[#C7B7A3]/40 text-[#27272A] dark:text-zinc-300"
                  >
                    Fermer
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedDayEvents.events.map((evt) => {
                    const group = groups.find((g) => g.id === evt.groupId);
                    return (
                      <div
                        key={evt.id}
                        className="p-2.5 rounded-xl bg-[#FFF9EB] dark:bg-zinc-800 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#5D0D18] text-[#FFF9EB] text-[9px] font-bold">
                              {group?.name || 'Groupe'}
                            </span>
                            <span className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                              {evt.title}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#27272A]/70 dark:text-zinc-400 block mt-0.5">
                            ⏰ {formatTimeOnly(evt.startDateTime)} {evt.location ? `• 📍 ${evt.location}` : ''}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            onSelectGroupFromEvent(evt.groupId);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] shrink-0 cursor-pointer"
                        >
                          Voir
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Mode 2: Liste chronologique (inline) */}
        {viewMode === 'list' && (
          <div className="space-y-3 pt-2">
            {sortedEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#27272A]/70 dark:text-zinc-400 bg-[#E8D8C4]/40 rounded-xl">
                Aucun événement trouvé pour ces critères.
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedEvents.map((event) => {
                  const group = groups.find((g) => g.id === event.groupId);

                  return (
                    <div
                      key={event.id}
                      id={`cal-list-event-${event.id}`}
                      className="p-3.5 rounded-2xl bg-[#E8D8C4] dark:bg-[#27272A] border border-[#C7B7A3]/60 dark:border-zinc-700/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[#5D0D18] text-[#FFF9EB] text-[10px] font-bold">
                            {group?.name || 'Groupe'}
                          </span>
                          <span className="text-xs font-bold font-serif text-[#5D0D18] dark:text-[#FFF9EB]">
                            {event.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#27272A]/80 dark:text-zinc-300">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#5D0D18]" />
                            <span>{formatDateTime(event.startDateTime)}</span>
                          </div>

                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#5D0D18]" />
                              <span className="truncate max-w-[150px]">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onSelectGroupFromEvent(event.groupId);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#FFF9EB] dark:bg-zinc-800 text-xs font-bold text-[#5D0D18] dark:text-amber-200 hover:bg-[#E8D8C4] border border-[#C7B7A3]/50 transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
                      >
                        Ouvrir dans le groupe
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
