import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Link2,
  Bell,
  Trash2,
  Check
} from 'lucide-react';
import { EventItem, UserProfile } from '../../types';
import { compressImage } from '../../utils/imageCompressor';
import {
  parseIsoToLocalDate,
  getLocalDateString,
  createIsoFromLocalDateAndTime,
} from '../../utils/formatters';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  groupId: string;
  onCreateEvent: (eventData: Partial<EventItem>) => void;
  initialEvent?: EventItem | null;
  initialDate?: string;
  onDeleteEvent?: (eventId: string) => void;
}

const PRESET_EVENT_BANNERS = [
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
];

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  groupId,
  onCreateEvent,
  initialEvent,
  initialDate,
  onDeleteEvent,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(initialEvent);

  const getTodayDateStr = () => {
    if (initialDate) return initialDate;
    return getLocalDateString(new Date());
  };

  const initialParsedStart = parseIsoToLocalDate(initialEvent?.startDateTime);
  const initialParsedEnd = parseIsoToLocalDate(initialEvent?.endDateTime);

  const [title, setTitle] = useState(initialEvent?.title || '');
  const [startDate, setStartDate] = useState(
    initialEvent ? initialParsedStart.date : getTodayDateStr()
  );
  const [startTime, setStartTime] = useState(
    initialEvent ? initialParsedStart.time : '10:00'
  );
  const [endDate, setEndDate] = useState(
    initialEvent?.endDateTime ? initialParsedEnd.date : (initialDate || getTodayDateStr())
  );
  const [endTime, setEndTime] = useState(
    initialEvent?.endDateTime ? initialParsedEnd.time : '18:00'
  );
  const [location, setLocation] = useState(initialEvent?.location || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [bannerImage, setBannerImage] = useState(initialEvent?.bannerImage || PRESET_EVENT_BANNERS[0]);
  const [reminder24h, setReminder24h] = useState(initialEvent?.reminder24h ?? true);
  const [isCompressing, setIsCompressing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialEvent) {
      const parsedStart = parseIsoToLocalDate(initialEvent.startDateTime);
      const parsedEnd = parseIsoToLocalDate(initialEvent.endDateTime);
      setTitle(initialEvent.title);
      setStartDate(parsedStart.date);
      setStartTime(parsedStart.time);
      if (initialEvent.endDateTime) {
        setEndDate(parsedEnd.date);
        setEndTime(parsedEnd.time);
      } else {
        setEndDate(parsedStart.date);
        setEndTime('18:00');
      }
      setLocation(initialEvent.location || '');
      setDescription(initialEvent.description || '');
      setBannerImage(initialEvent.bannerImage || PRESET_EVENT_BANNERS[0]);
      setReminder24h(initialEvent.reminder24h ?? true);
    } else if (initialDate) {
      setStartDate(initialDate);
      setEndDate(initialDate);
      setLocation('');
    } else {
      setLocation('');
    }
  }, [initialEvent, initialDate]);

  // Validation chronologique stricte : date_fin >= date_debut
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (endDate && newStart > endDate) {
      setEndDate(newStart);
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    if (newEnd < startDate) {
      setEndDate(startDate);
    } else {
      setEndDate(newEnd);
    }
  };

  const handleStartTimeChange = (newTime: string) => {
    setStartTime(newTime);
    if (startDate === endDate && endTime && newTime > endTime) {
      setEndTime(newTime);
    }
  };

  const handleEndTimeChange = (newTime: string) => {
    if (startDate === endDate && newTime < startTime) {
      setEndTime(startTime);
    } else {
      setEndTime(newTime);
    }
  };

  // Upload d'image locale avec compression Canvas
  const handleLocalImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressedDataUrl = await compressImage(file, 1280, 1280, 0.82);
      setBannerImage(compressedDataUrl);
    } catch (err) {
      console.error('Erreur lors de la compression de l\'image:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !startTime || !endDate || !endTime) return;

    // Calculer les ISO strings exacts en heure locale du navigateur
    const startDateTime = createIsoFromLocalDateAndTime(startDate, startTime);
    const endDateTime = createIsoFromLocalDateAndTime(endDate, endTime);

    onCreateEvent({
      ...(initialEvent ? { id: initialEvent.id } : {}),
      groupId: initialEvent?.groupId || groupId,
      title: title.trim(),
      startDateTime,
      endDateTime,
      location: location.trim(),
      gpsUrl: location.trim() ? `https://maps.google.com/?q=${encodeURIComponent(location.trim())}` : undefined,
      description: description.trim(),
      bannerImage,
      organizerId: initialEvent?.organizerId || currentUser.id,
      organizerName: initialEvent?.organizerName || currentUser.firstName,
      organizerAvatar: initialEvent?.organizerAvatar || currentUser.avatar,
      reminder24h,
      rsvp: initialEvent?.rsvp || {
        [currentUser.id]: 'going',
      },
    });
    onClose();
  };

  const handleDelete = () => {
    if (initialEvent && onDeleteEvent) {
      if (window.confirm('Voulez-vous vraiment supprimer cet événement ?')) {
        onDeleteEvent(initialEvent.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="create-event-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="create-event-modal-card"
        className="relative w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#5D0D18] dark:text-[#FFF9EB]" />
            <h3 className="text-lg font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-display">
              {isEditing ? 'Modifier l\'événement' : 'Nouvel événement'}
            </h3>
          </div>
          <button
            id="create-event-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
              Titre de l'événement *
            </label>
            <input
              type="text"
              id="event-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Randonnée Crêtes du Jura & Pique-Nique"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#5D0D18]"
            />
          </div>

          {/* Start Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                Date de début *
              </label>
              <input
                type="date"
                id="event-start-date-input"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                Heure de début *
              </label>
              <input
                type="time"
                id="event-start-time-input"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB]"
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                Date de fin *
              </label>
              <input
                type="date"
                id="event-end-date-input"
                value={endDate}
                min={startDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                Heure de fin *
              </label>
              <input
                type="time"
                id="event-end-time-input"
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB]"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
              Lieu
            </label>
            <div className="relative">
              <input
                type="text"
                id="event-location-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Col de la Faucille, 01170 Gex"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB]"
              />
              <MapPin className="w-4 h-4 text-[#5D0D18] absolute left-3 top-3" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
              Description
            </label>
            <textarea
              id="event-description-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Prévoir chaussures de marche, gourde 1.5L et pique-nique..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] resize-none"
            />
          </div>

          {/* 24h Reminder Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#E8D8C4]/40 dark:bg-zinc-800/40 border border-[#C7B7A3]/50 dark:border-zinc-700">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#5D0D18] dark:text-amber-300" />
              <div>
                <span className="text-xs font-bold text-[#5D0D18] dark:text-[#FFF9EB] block">
                  Rappel automatique 24 h avant
                </span>
                <span className="text-[11px] text-[#27272A]/70 dark:text-zinc-400">
                  Envoie un e-mail Resend et une notification aux participants
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              id="event-reminder-checkbox"
              checked={reminder24h}
              onChange={(e) => setReminder24h(e.target.checked)}
              className="w-4 h-4 rounded text-[#5D0D18] focus:ring-[#5D0D18]"
            />
          </div>

          {/* Image de l'événement (avec sélection de fichier local depuis la galerie du téléphone) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                Image de l'événement
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="px-2.5 py-1 rounded-lg bg-[#5D0D18] text-[#FFF9EB] text-[11px] font-bold hover:bg-[#450912] transition-all flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>{isCompressing ? 'Compression...' : 'Galerie du téléphone'}</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLocalImageSelect}
              accept="image/*"
              className="hidden"
            />

            {/* Current Selected Banner Preview */}
            <div className="relative h-28 rounded-2xl overflow-hidden border border-[#C7B7A3] shadow-xs">
              <img src={bannerImage} alt="Bannière sélectionnée" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-2.5">
                <span className="text-[11px] font-bold text-white flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Image active
                </span>
              </div>
            </div>

            {/* Choose from Preset Photos */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {PRESET_EVENT_BANNERS.map((imgUrl, i) => (
                <div
                  key={i}
                  onClick={() => setBannerImage(imgUrl)}
                  className={`relative h-12 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                    bannerImage === imgUrl
                      ? 'border-[#5D0D18] ring-2 ring-[#5D0D18]/40 scale-105'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            {isEditing && onDeleteEvent ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-full bg-[#E8D8C4] text-[#27272A] text-xs font-bold hover:bg-[#C7B7A3] transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="submit"
                id="create-event-submit-btn"
                className="px-6 py-2.5 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {isEditing ? 'Enregistrer les modifications' : 'Créer l\'événement'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
