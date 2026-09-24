import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Plus,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Share2,
  Download,
  Package,
  Check,
  UserCheck,
  X
} from 'lucide-react';
import { EventItem, UserProfile, GroupMember, LogisticsTask } from '../../types';
import { formatEventCardDate, getLocalDateString } from '../../utils/formatters';
import { exportToGoogleCalendar, downloadIcsFile } from '../../utils/calendarExport';

interface AgendaTabProps {
  events: EventItem[];
  currentUser: UserProfile;
  members: GroupMember[];
  groupId: string;
  tasks?: LogisticsTask[];
  onOpenCreateEvent: (date?: string) => void;
  onOpenCalendarView: () => void;
  onRsvp: (eventId: string, status: 'going' | 'maybe' | 'declined') => void;
  onEditEvent?: (event: EventItem) => void;
  onDeleteEvent?: (eventId: string) => void;
  onOpenAddTask?: (eventId?: string) => void;
  onToggleCompleteTask?: (taskId: string) => void;
  onClaimTask?: (taskId: string) => void;
  onUnclaimTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onViewAvatar?: (imageUrl: string, title?: string, subtitle?: string) => void;
}

export const AgendaTab: React.FC<AgendaTabProps> = ({
  events,
  currentUser,
  members,
  groupId,
  tasks = [],
  onOpenCreateEvent,
  onOpenCalendarView,
  onRsvp,
  onEditEvent,
  onDeleteEvent,
  onOpenAddTask,
  onToggleCompleteTask,
  onClaimTask,
  onUnclaimTask,
  onDeleteTask,
  onViewAvatar,
}) => {
  const safeEvents = events || [];
  const safeMembers = members || [];
  const [activeSubView, setActiveSubView] = useState<'events' | 'teams_scheduler'>('events');
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(new Date()));
  const [availabilityData, setAvailabilityData] = useState<any>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Modal / State for Attendee Details
  const [viewingAttendeesEvent, setViewingAttendeesEvent] = useState<EventItem | null>(null);

  // State for Export Menu per event
  const [openExportMenuId, setOpenExportMenuId] = useState<string | null>(null);

  // State for expanded event Organisation sub-module
  const [expandedOrganisationEventId, setExpandedOrganisationEventId] = useState<string | null>(null);

  // Charger les disponibilités style Assistant de planification
  useEffect(() => {
    if (activeSubView === 'teams_scheduler' && groupId) {
      setLoadingAvailability(true);
      try {
        computeLocalAvailability();
      } finally {
        setLoadingAvailability(false);
      }
    }
  }, [activeSubView, selectedDate, groupId, safeEvents, members]);

  const computeLocalAvailability = () => {
    const timeSlots = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

    const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);
    const dayStartLocal = new Date(selYear, selMonth - 1, selDay, 0, 0, 0).getTime();
    const dayEndLocal = new Date(selYear, selMonth - 1, selDay, 23, 59, 59, 999).getTime();

    const targetEvents = safeEvents.filter((ev) => {
      const start = new Date(ev.startDateTime).getTime();
      const end = ev.endDateTime ? new Date(ev.endDateTime).getTime() : start + 3600000;
      return start <= dayEndLocal && end >= dayStartLocal;
    });

    const membersAvailability = safeMembers.map((m) => {
      const slots = timeSlots.map((slot) => {
        const [hour] = slot.split(':').map(Number);
        const slotStart = new Date(selYear, selMonth - 1, selDay, hour, 0, 0).getTime();
        const slotEnd = new Date(selYear, selMonth - 1, selDay, hour + 1, 0, 0).getTime();

        const isBusy = targetEvents.some((ev) => {
          if (ev.rsvp?.[m.userId] !== 'going') return false;
          const evStart = new Date(ev.startDateTime).getTime();
          const evEnd = ev.endDateTime ? new Date(ev.endDateTime).getTime() : evStart + 3600000;
          return slotStart < evEnd && slotEnd > evStart;
        });

        return {
          time: slot,
          status: isBusy ? ('busy' as const) : ('free' as const),
          label: isBusy ? 'Occupé(e)' : 'Libre',
        };
      });

      return {
        memberId: m.userId,
        memberName: m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Membre',
        memberAvatar: m.avatar,
        slots,
      };
    });

    setAvailabilityData({
      date: selectedDate,
      timeSlots,
      members: membersAvailability,
    });
  };

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d - 1);
    setSelectedDate(getLocalDateString(dateObj));
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + 1);
    setSelectedDate(getLocalDateString(dateObj));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-6 pt-4">
      {/* Top Header with Serifs and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold italic mb-1 text-[#5D0D18] dark:text-[#FFF9EB]">
            Agenda du groupe
          </h3>
          <p className="text-sm opacity-70 text-[#27272A] dark:text-zinc-300">
            Organisez vos prochaines aventures et trouvez le créneau idéal pour tous.
          </p>
        </div>

        {/* View Switcher & Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-view switcher */}
          <div className="flex items-center bg-[#E8D8C4]/60 dark:bg-zinc-800 p-1 rounded-full border border-[#C7B7A3]/50">
            <button
              onClick={() => setActiveSubView('events')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeSubView === 'events'
                  ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                  : 'text-[#27272A] dark:text-zinc-300 hover:text-[#5D0D18]'
              }`}
            >
              Événements ({safeEvents.length})
            </button>
            <button
              id="btn-teams-scheduler"
              onClick={() => setActiveSubView('teams_scheduler')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeSubView === 'teams_scheduler'
                  ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                  : 'text-[#27272A] dark:text-zinc-300 hover:text-[#5D0D18]'
              }`}
            >
              Assistant de planification
            </button>
          </div>

          <button
            id="agenda-btn-calendar-view"
            onClick={onOpenCalendarView}
            className="p-2 border border-[#C7B7A3] bg-[#E8D8C4]/70 dark:bg-zinc-800 text-[#6D2932] dark:text-[#FFF9EB] rounded-full hover:bg-[#E8D8C4] transition-all cursor-pointer"
            title="Vue Calendrier Mensuel"
          >
            <Calendar className="w-4 h-4" />
          </button>

          <button
            id="agenda-btn-create-event"
            onClick={() => onOpenCreateEvent()}
            className="px-4 py-2 rounded-full text-xs font-bold bg-[#6D2932] text-[#FFF9EB] hover:bg-[#541C24] transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nouvel événement</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: TEAMS-STYLE COLLECTIVE SCHEDULING ASSISTANT */}
      {activeSubView === 'teams_scheduler' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#FFF9EB] dark:bg-[#18181B] border border-[#C7B7A3]/70 dark:border-zinc-800 shadow-md space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#6D2932] dark:text-amber-300" />
                <h4 className="text-base font-bold font-serif text-[#6D2932] dark:text-[#FFF9EB]">
                  Assistant de planification
                </h4>
              </div>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-0.5">
                Visualisez les disponibilités de chaque membre.
              </p>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center gap-2 bg-[#E8D8C4]/60 dark:bg-zinc-800 p-1.5 rounded-2xl border border-[#C7B7A3]/50">
              <button
                onClick={handlePrevDay}
                className="p-1 rounded-lg hover:bg-[#E8D8C4] text-[#6D2932] dark:text-[#FFF9EB] cursor-pointer"
                title="Jour précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#6D2932] dark:text-[#FFF9EB] border-none focus:outline-none cursor-pointer"
              />
              <button
                onClick={handleNextDay}
                className="p-1 rounded-lg hover:bg-[#E8D8C4] text-[#6D2932] dark:text-[#FFF9EB] cursor-pointer"
                title="Jour suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-500/80 border border-emerald-600" />
              <span className="text-[#27272A] dark:text-zinc-300">Libre</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-[#6D2932] dark:bg-red-900 border border-[#541C24]" />
              <span className="text-[#27272A] dark:text-zinc-300">Occupé(e)</span>
            </div>
          </div>

          {/* Schedule Grid */}
          {loadingAvailability ? (
            <div className="py-12 text-center text-xs font-semibold text-[#6D2932] dark:text-amber-200">
              Chargement des disponibilités en temps réel...
            </div>
          ) : availabilityData?.members?.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar pb-2">
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-xs font-bold text-[#6D2932] dark:text-zinc-300 w-44">
                      Membre
                    </th>
                    {availabilityData.timeSlots.map((slot: string) => (
                      <th
                        key={slot}
                        className="p-1 text-center text-[10px] font-bold text-[#27272A]/70 dark:text-zinc-400 border-l border-[#C7B7A3]/30"
                      >
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {availabilityData.members.map((member: any) => (
                    <tr key={member.memberId} className="border-t border-[#C7B7A3]/40 dark:border-zinc-800">
                      <td className="p-2 flex items-center gap-2">
                        <img
                          src={member.memberAvatar || '/Avatar_Herisson.jpg'}
                          alt={member.memberName}
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-[#C7B7A3]"
                        />
                        <span className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] truncate">
                          {member.memberName}
                        </span>
                      </td>

                      {member.slots.map((slot: any, idx: number) => {
                        const isFree = slot.status === 'free';
                        return (
                          <td key={idx} className="p-1 border-l border-[#C7B7A3]/30 text-center">
                            <div
                              title={`${member.memberName} : ${slot.label} à ${slot.time}`}
                              className={`h-7 rounded-lg transition-transform hover:scale-105 flex items-center justify-center text-[9px] font-bold ${
                                isFree
                                  ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                                  : 'bg-[#6D2932]/20 dark:bg-red-900/40 text-[#6D2932] dark:text-red-300 border border-[#6D2932]/40'
                              }`}
                            >
                              {slot.label}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#27272A]/70 dark:text-zinc-400">
              Aucun membre dans ce groupe.
            </div>
          )}

          <div className="pt-2 flex items-center justify-end">
            <button
              onClick={() => onOpenCreateEvent(selectedDate)}
              className="px-4 py-2 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Créer une sortie</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: STANDARD EVENTS LIST */}
      {activeSubView === 'events' && (
        <div className="space-y-4">
          {safeEvents.length === 0 ? (
            <div className="p-8 text-center bg-[#E8D8C4]/40 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-[#C7B7A3] dark:border-zinc-700">
              <Calendar className="w-10 h-10 text-[#5D0D18]/50 dark:text-zinc-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
                Aucun événement prévu pour le moment
              </p>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-1">
                Soyez le premier à proposer une sortie ou un week-end !
              </p>
              <button
                onClick={() => onOpenCreateEvent()}
                className="mt-3 px-4 py-2 rounded-full text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] cursor-pointer"
              >
                Créer un événement
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {safeEvents.map((event) => {
                const userRsvp = event.rsvp?.[currentUser.id] || 'pending';
                const goingCount = Object.values(event.rsvp || {}).filter((s) => s === 'going').length;
                const eventTasks = tasks.filter((t) => t.eventId === event.id || (!t.eventId && t.groupId === event.groupId));
                const isOrgExpanded = expandedOrganisationEventId === event.id;

                return (
                  <div
                    key={event.id}
                    id={`event-card-${event.id}`}
                    className="bg-[#E8D8C4] dark:bg-[#27272A] rounded-2xl p-4 border border-[#C7B7A3] dark:border-zinc-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-3">
                      {/* Title, Circular Thumbnail & Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {event.bannerImage ? (
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-2 ring-[#C7B7A3]/80 shadow-xs shrink-0 bg-[#5D0D18]">
                              <img
                                src={event.bannerImage}
                                alt={event.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#5D0D18] text-white flex items-center justify-center text-xs font-serif font-bold shadow-xs shrink-0">
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

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {onEditEvent && (
                            <button
                              onClick={() => onEditEvent(event)}
                              title="Modifier l'événement"
                              className="p-1.5 rounded-lg text-[#5D0D18] dark:text-zinc-300 hover:bg-[#FFF9EB]/80 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteEvent && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Voulez-vous supprimer l'événement "${event.title}" ?`)) {
                                  onDeleteEvent(event.id);
                                }
                              }}
                              title="Supprimer l'événement"
                              className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

                      {/* Description */}
                      {event.description && (
                        <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* Footer: RSVPs & Attendance Action & Organisation */}
                    <div className="pt-3 border-t border-[#C7B7A3]/50 dark:border-zinc-700 space-y-2.5">
                      {/* Clickable Attendee Count */}
                      <div className="flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => setViewingAttendeesEvent(event)}
                          className="font-bold text-[#6D2932] dark:text-amber-200 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Voir la liste détaillée des présences"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {goingCount} participant{goingCount > 1 ? 's' : ''} confirmé{goingCount > 1 ? 's' : ''} (voir le détail)
                          </span>
                        </button>
                      </div>

                      {/* RSVP Buttons */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => onRsvp(event.id, 'going')}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            userRsvp === 'going'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-[#FFF9EB] dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300 hover:bg-emerald-50'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>J'y vais</span>
                        </button>

                        <button
                          onClick={() => onRsvp(event.id, 'maybe')}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            userRsvp === 'maybe'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-[#FFF9EB] dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300 hover:bg-amber-50'
                          }`}
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Peut-être</span>
                        </button>

                        <button
                          onClick={() => onRsvp(event.id, 'declined')}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            userRsvp === 'declined'
                              ? 'bg-zinc-600 text-white shadow-xs'
                              : 'bg-[#FFF9EB] dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300 hover:bg-zinc-200'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Non</span>
                        </button>
                      </div>

                      {/* Export to Personal Calendar Button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenExportMenuId(openExportMenuId === event.id ? null : event.id)}
                          className="w-full py-1.5 px-3 rounded-xl bg-[#FFF9EB]/80 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB] hover:bg-[#FFF9EB] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5 text-[#5D0D18] dark:text-amber-300" />
                          <span>Exporter vers mon agenda personnel</span>
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </button>

                        {/* Export Dropdown Popover */}
                        {openExportMenuId === event.id && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 p-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-[#C7B7A3] dark:border-zinc-700 z-20 space-y-1 animate-scale-in">
                            <button
                              type="button"
                              onClick={() => {
                                exportToGoogleCalendar(event);
                                setOpenExportMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#E8D8C4]/60 dark:hover:bg-zinc-800 text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] flex items-center gap-2 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                              <span>Ajouter dans Google Agenda</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                downloadIcsFile(event);
                                setOpenExportMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#E8D8C4]/60 dark:hover:bg-zinc-800 text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] flex items-center gap-2 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-[#5D0D18] dark:text-amber-300" />
                              <span>Télécharger le fichier calendrier (.ics pour Apple & Outlook)</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Organisation & Items Sub-Module Button */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOrganisationEventId(isOrgExpanded ? null : event.id)
                          }
                          className="w-full py-2 px-3 rounded-xl bg-[#5D0D18]/10 dark:bg-zinc-800/80 border border-[#5D0D18]/30 dark:border-zinc-700 text-xs font-bold text-[#5D0D18] dark:text-amber-300 hover:bg-[#5D0D18]/20 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span>Organisation & Matériel ({eventTasks.length} éléments)</span>
                          </div>
                          {isOrgExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {/* Expandable Event Tasks List */}
                        {isOrgExpanded && (
                          <div className="mt-2 p-3 bg-[#FFF9EB]/90 dark:bg-zinc-900 rounded-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 space-y-2.5 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-[#5D0D18] dark:text-amber-300">
                                Tâches et objets spécifiques à cet événement
                              </span>
                              {onOpenAddTask && (
                                <button
                                  type="button"
                                  onClick={() => onOpenAddTask(event.id)}
                                  className="px-2.5 py-1 rounded-lg bg-[#5D0D18] text-white text-[10px] font-bold hover:bg-[#450912] flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Ajouter</span>
                                </button>
                              )}
                            </div>

                            {eventTasks.length === 0 ? (
                              <p className="text-[11px] text-[#27272A]/70 dark:text-zinc-400 py-2 text-center italic">
                                Aucun objet ou tâche assigné pour l'instant. Cliquez sur "Ajouter" pour vous organiser !
                              </p>
                            ) : (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {eventTasks.map((t) => {
                                  const isAssignedToMe = t.assignedToId === currentUser.id;
                                  return (
                                    <div
                                      key={t.id}
                                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                                        t.completed
                                          ? 'bg-[#E8D8C4]/40 dark:bg-zinc-800/40 border-[#C7B7A3]/40 line-through opacity-75'
                                          : 'bg-white dark:bg-zinc-800 border-[#C7B7A3]/60 dark:border-zinc-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        {onToggleCompleteTask && (
                                          <button
                                            type="button"
                                            onClick={() => onToggleCompleteTask(t.id)}
                                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 cursor-pointer ${
                                              t.completed
                                                ? 'bg-emerald-600 text-white'
                                                : 'border border-[#C7B7A3] bg-[#FFF9EB] dark:bg-zinc-900'
                                            }`}
                                          >
                                            {t.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                          </button>
                                        )}
                                        <span className="truncate font-semibold text-[#27272A] dark:text-[#FFF9EB]">
                                          {t.title} {t.quantity ? `(${t.quantity})` : ''}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {t.assignedToId ? (
                                          <div className="flex items-center gap-1 bg-[#E8D8C4]/60 dark:bg-zinc-700 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#5D0D18] dark:text-amber-200">
                                            <span>{isAssignedToMe ? 'Moi' : t.assignedToName}</span>
                                            {isAssignedToMe && onUnclaimTask && (
                                              <button
                                                type="button"
                                                onClick={() => onUnclaimTask(t.id)}
                                                className="text-red-600 dark:text-red-400 hover:underline ml-1 cursor-pointer"
                                              >
                                                ✕
                                              </button>
                                            )}
                                          </div>
                                        ) : (
                                          onClaimTask && (
                                            <button
                                              type="button"
                                              onClick={() => onClaimTask(t.id)}
                                              className="px-2 py-0.5 rounded-full bg-[#5D0D18] text-white text-[10px] font-bold hover:bg-[#450912] cursor-pointer"
                                            >
                                              Je prends
                                            </button>
                                          )
                                        )}

                                        {onDeleteTask && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (window.confirm(`Supprimer "${t.title}" ?`)) {
                                                onDeleteTask(t.id);
                                              }
                                            }}
                                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                                            title="Supprimer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ATTENDEES BREAKDOWN MODAL */}
      {viewingAttendeesEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
            onClick={() => setViewingAttendeesEvent(null)}
          />

          <div className="relative w-full max-w-md bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#5D0D18] dark:text-[#FFF9EB]" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
                    Présences : {viewingAttendeesEvent.title}
                  </h3>
                  <p className="text-[11px] text-[#27272A]/70 dark:text-zinc-400">
                    {formatEventCardDate(viewingAttendeesEvent.startDateTime, viewingAttendeesEvent.endDateTime)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewingAttendeesEvent(null)}
                className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Breakdown into 3 Categories: Going / Declined / Pending */}
            {(() => {
              const rsvps = viewingAttendeesEvent.rsvp || {};
              const goingMembers = safeMembers.filter((m) => rsvps[m.userId || m.id] === 'going');
              const declinedMembers = safeMembers.filter((m) => rsvps[m.userId || m.id] === 'declined');
              const pendingMembers = safeMembers.filter(
                (m) =>
                  !rsvps[m.userId || m.id] ||
                  rsvps[m.userId || m.id] === 'pending' ||
                  rsvps[m.userId || m.id] === 'maybe'
              );

              return (
                <div className="space-y-4 text-xs">
                  {/* Category 1: Présents */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Présents (« J'y vais »)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[10px]">
                        {goingMembers.length}
                      </span>
                    </div>

                    {goingMembers.length === 0 ? (
                      <p className="text-[11px] text-[#27272A]/60 dark:text-zinc-400 pl-5 italic">
                        Aucun participant confirmé pour le moment.
                      </p>
                    ) : (
                      <div className="space-y-1.5 pl-2">
                        {goingMembers.map((m) => (
                          <div
                            key={m.userId || m.id}
                            className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={m.avatar || '/Avatar_Herisson.jpg'}
                                alt={m.name}
                                className="w-6 h-6 rounded-full object-cover ring-1 ring-emerald-500"
                              />
                              <span className="font-bold text-[#27272A] dark:text-[#FFF9EB]">
                                {m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim()}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                              Confirmé
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category 2: Décliné (Non) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-red-800 dark:text-red-300 font-bold">
                      <div className="flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        <span>Absents (« Non »)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-[10px]">
                        {declinedMembers.length}
                      </span>
                    </div>

                    {declinedMembers.length === 0 ? (
                      <p className="text-[11px] text-[#27272A]/60 dark:text-zinc-400 pl-5 italic">
                        Personne n'a décliné l'invitation.
                      </p>
                    ) : (
                      <div className="space-y-1.5 pl-2">
                        {declinedMembers.map((m) => (
                          <div
                            key={m.userId || m.id}
                            className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={m.avatar || '/Avatar_Herisson.jpg'}
                                alt={m.name}
                                className="w-6 h-6 rounded-full object-cover ring-1 ring-red-400 opacity-80"
                              />
                              <span className="font-bold text-[#27272A] dark:text-[#FFF9EB]">
                                {m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim()}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                              Absent
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category 3: En attente ou Peut-être */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[#5D0D18] dark:text-zinc-300 font-bold">
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4" />
                        <span>En attente de réponse</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#E8D8C4] dark:bg-zinc-800 text-[10px]">
                        {pendingMembers.length}
                      </span>
                    </div>

                    {pendingMembers.length === 0 ? (
                      <p className="text-[11px] text-[#27272A]/60 dark:text-zinc-400 pl-5 italic">
                        Tous les membres ont répondu !
                      </p>
                    ) : (
                      <div className="space-y-1.5 pl-2">
                        {pendingMembers.map((m) => {
                          const status = rsvps[m.userId || m.id];
                          return (
                            <div
                              key={m.userId || m.id}
                              className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-[#C7B7A3]/40 dark:border-zinc-700 flex items-center justify-between opacity-85"
                            >
                              <div className="flex items-center gap-2">
                                <img
                                  src={m.avatar || '/Avatar_Herisson.jpg'}
                                  alt={m.name}
                                  className="w-6 h-6 rounded-full object-cover ring-1 ring-[#C7B7A3]"
                                />
                                <span className="font-bold text-[#27272A] dark:text-[#FFF9EB]">
                                  {m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim()}
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-[#5D0D18] dark:text-amber-300">
                                {status === 'maybe' ? 'Peut-être' : 'Sans réponse'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="pt-2 border-t border-[#C7B7A3]/40 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingAttendeesEvent(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E8D8C4] dark:bg-zinc-800 text-[#27272A] dark:text-[#FFF9EB] hover:bg-[#C7B7A3]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

