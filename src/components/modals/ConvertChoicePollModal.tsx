import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Poll, PollOption } from '../../types';
import { createIsoFromLocalDateAndTime } from '../../utils/formatters';

interface ConvertChoicePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  poll: Poll;
  winningOption?: PollOption | null;
  onConfirm: (startDateIso: string, endDateIso?: string, location?: string) => void;
}

export const ConvertChoicePollModal: React.FC<ConvertChoicePollModalProps> = ({
  isOpen,
  onClose,
  poll,
  winningOption,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const now = new Date();
  const nextHour = new Date(now.getTime() + 3600000);
  const nextTwoHours = new Date(now.getTime() + 7200000);

  const formatLocalISO = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
  };

  const [startDateTime, setStartDateTime] = useState(formatLocalISO(nextHour));
  const [endDateTime, setEndDateTime] = useState(formatLocalISO(nextTwoHours));
  const [location, setLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDateTime) return;
    const [sDate, sTime] = startDateTime.split('T');
    const startIso = createIsoFromLocalDateAndTime(sDate, sTime);

    let endIso: string | undefined = undefined;
    if (endDateTime) {
      const [eDate, eTime] = endDateTime.split('T');
      endIso = createIsoFromLocalDateAndTime(eDate, eTime);
    }

    onConfirm(startIso, endIso, location.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="convert-choice-poll-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="convert-choice-poll-card"
        className="relative w-full max-w-md bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#5D0D18] dark:text-[#FFF9EB]" />
            <h3 className="text-lg font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
              Convertir en sortie / événement
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Winning Option Highlight */}
        <div className="p-3.5 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/60 border border-[#C7B7A3]/60 dark:border-zinc-700">
          <span className="text-[11px] text-[#27272A]/70 dark:text-zinc-400 block mb-0.5">
            Activité / Option retenue
          </span>
          <h4 className="text-sm font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
            {winningOption ? winningOption.text : poll.title}
          </h4>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Start Date & Time */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
              Date et heure de début *
            </label>
            <input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 text-xs text-[#27272A] dark:text-[#FFF9EB]"
            />
          </div>

          {/* End Date & Time */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
              Date et heure de fin
            </label>
            <input
              type="datetime-local"
              value={endDateTime}
              min={startDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 text-xs text-[#27272A] dark:text-[#FFF9EB]"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
              Lieu (facultatif)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Restaurant Le Bistrot, Paris"
              className="w-full px-3 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 text-xs text-[#27272A] dark:text-[#FFF9EB]"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-bold bg-[#E8D8C4] text-[#27272A] hover:bg-[#C7B7A3] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Créer l'événement dans l'Agenda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
