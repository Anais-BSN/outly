import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  BarChart2,
  Calendar,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Poll, UserProfile } from '../../types';
import {
  parseIsoToLocalDate,
  getLocalDateString,
  createIsoFromLocalDateAndTime,
} from '../../utils/formatters';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  groupId: string;
  onCreatePoll: (pollData: Partial<Poll>) => void;
  initialPoll?: Poll | null;
  onUpdatePoll?: (pollId: string, pollData: Partial<Poll>) => void;
}

interface DateOptionItem {
  id: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  groupId,
  onCreatePoll,
  initialPoll,
  onUpdatePoll,
}) => {
  const getTomorrowDateStr = (daysAhead: number = 1) => {
    try {
      const d = new Date();
      d.setDate(d.getDate() + daysAhead);
      return getLocalDateString(d);
    } catch {
      return '2026-10-09';
    }
  };

  const isEditing = Boolean(initialPoll);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<'date' | 'choice'>(initialPoll?.type || 'date');
  const [title, setTitle] = useState(initialPoll?.title || '');
  const [description, setDescription] = useState(initialPoll?.description || '');

  const getDefaultDateOptions = (): DateOptionItem[] => [
    {
      id: `dopt-1`,
      startDate: getTomorrowDateStr(1),
      startTime: '09:00',
      endDate: getTomorrowDateStr(1),
      endTime: '18:00',
    },
    {
      id: `dopt-2`,
      startDate: getTomorrowDateStr(6),
      startTime: '09:00',
      endDate: getTomorrowDateStr(7),
      endTime: '18:00',
    },
    {
      id: `dopt-3`,
      startDate: getTomorrowDateStr(13),
      startTime: '09:00',
      endDate: getTomorrowDateStr(14),
      endTime: '18:00',
    },
  ];

  // Options pour sondage de type "date" (date de début ET date de fin obligatoires)
  const [dateOptions, setDateOptions] = useState<DateOptionItem[]>(() => {
    if (initialPoll?.type === 'date' && initialPoll.options && initialPoll.options.length > 0) {
      return initialPoll.options.map((opt, i) => {
        const parsedStart = parseIsoToLocalDate(opt.startDate || opt.dateValue);
        const parsedEnd = parseIsoToLocalDate(opt.endDate || opt.endDateValue || opt.startDate || opt.dateValue);
        return {
          id: opt.id || `dopt-${i}`,
          startDate: parsedStart.date || getTomorrowDateStr(i + 1),
          startTime: parsedStart.time || '09:00',
          endDate: parsedEnd.date || parsedStart.date || getTomorrowDateStr(i + 1),
          endTime: parsedEnd.time || '18:00',
        };
      });
    }
    return getDefaultDateOptions();
  });

  // Options pour sondage de type "choice"
  const [choiceOptions, setChoiceOptions] = useState<string[]>(() => {
    if (initialPoll?.type === 'choice' && initialPoll.options && initialPoll.options.length > 0) {
      return initialPoll.options.map((opt) => opt?.text || '');
    }
    return ['', ''];
  });
  const [newChoiceInput, setNewChoiceInput] = useState('');

  const isSubmittingRef = useRef(false);

  // Réinitialisation sécurisée à chaque ouverture de la modale
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      setType(initialPoll?.type || 'date');
      setTitle(initialPoll?.title || '');
      setDescription(initialPoll?.description || '');
      setNewChoiceInput('');

      if (initialPoll?.type === 'date' && initialPoll.options && initialPoll.options.length > 0) {
        setDateOptions(
          initialPoll.options.map((opt, i) => {
            const parsedStart = parseIsoToLocalDate(opt.startDate || opt.dateValue);
            const parsedEnd = parseIsoToLocalDate(opt.endDate || opt.endDateValue || opt.startDate || opt.dateValue);
            return {
              id: opt.id || `dopt-${i}`,
              startDate: parsedStart.date || getTomorrowDateStr(i + 1),
              startTime: parsedStart.time || '09:00',
              endDate: parsedEnd.date || parsedStart.date || getTomorrowDateStr(i + 1),
              endTime: parsedEnd.time || '18:00',
            };
          })
        );
      } else if (!initialPoll) {
        setDateOptions(getDefaultDateOptions());
      }

      if (initialPoll?.type === 'choice' && initialPoll.options && initialPoll.options.length > 0) {
        setChoiceOptions(initialPoll.options.map((opt) => opt?.text || ''));
      } else if (!initialPoll) {
        setChoiceOptions(['', '']);
      }
    }
  }, [isOpen, initialPoll]);

  if (!isOpen) return null;

  // Mise à jour d'une option de date avec validation chronologique stricte
  const handleDateOptionChange = (
    index: number,
    field: 'startDate' | 'startTime' | 'endDate' | 'endTime',
    value: string
  ) => {
    setDateOptions((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      const opt = { ...updated[index], [field]: value };

      // Validation chronologique : si date début > date fin
      if (opt.startDate && opt.endDate && opt.startDate > opt.endDate) {
        opt.endDate = opt.startDate;
      }

      // Si même jour et heure début > heure fin
      if (opt.startDate === opt.endDate && opt.startTime && opt.endTime && opt.startTime > opt.endTime) {
        opt.endTime = opt.startTime;
      }

      updated[index] = opt;
      return updated;
    });
  };

  const addDateOption = () => {
    const last = dateOptions[dateOptions.length - 1];
    const nextDays = dateOptions.length + 7;
    setDateOptions([
      ...dateOptions,
      {
        id: `dopt-${Date.now()}`,
        startDate: getTomorrowDateStr(nextDays),
        startTime: last?.startTime || '09:00',
        endDate: getTomorrowDateStr(nextDays + 1),
        endTime: last?.endTime || '18:00',
      },
    ]);
  };

  const removeDateOption = (index: number) => {
    if (dateOptions.length > 2) {
      setDateOptions(dateOptions.filter((_, i) => i !== index));
    }
  };

  const addChoiceOption = () => {
    if (newChoiceInput.trim()) {
      setChoiceOptions([...choiceOptions, newChoiceInput.trim()]);
      setNewChoiceInput('');
    }
  };

  const removeChoiceOption = (index: number) => {
    if (choiceOptions.length > 2) {
      setChoiceOptions(choiceOptions.filter((_, i) => i !== index));
    }
  };

  const formatDateDisplay = (opt: DateOptionItem) => {
    if (!opt || !opt.startDate) return '';
    try {
      const [sYear, sMonth, sDay] = (opt.startDate || '').split('-').map(Number);
      const [sHour, sMin] = (opt.startTime || '00:00').split(':').map(Number);
      const startD = new Date(sYear, sMonth - 1, sDay, sHour || 0, sMin || 0);

      const [eYear, eMonth, eDay] = (opt.endDate || opt.startDate || '').split('-').map(Number);
      const [eHour, eMin] = (opt.endTime || '00:00').split(':').map(Number);
      const endD = new Date(eYear, eMonth - 1, eDay, eHour || 0, eMin || 0);

      if (isNaN(startD.getTime()) || isNaN(endD.getTime())) {
        return opt.startDate || '';
      }

      const startFmt = startD.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      const endFmt = endD.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });

      if (opt.startDate === opt.endDate) {
        return `${startFmt} (${opt.startTime || '09:00'} - ${opt.endTime || '18:00'})`;
      }
      return `Du ${startFmt} (${opt.startTime || '09:00'}) au ${endFmt} (${opt.endTime || '18:00'})`;
    } catch {
      return opt.startDate || '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting || !title.trim()) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const safeUserId = currentUser?.id || 'user-current';
    const safeUserName = currentUser?.firstName || 'Moi';
    const safeUserAvatar = currentUser?.avatar || '/Avatar_Herisson.jpg';
    const targetGroupId = initialPoll?.groupId || groupId || 'default';

    if (type === 'date') {
      if (dateOptions.length < 2) {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const formattedOptions = dateOptions.map((opt, i) => {
        const startIso = createIsoFromLocalDateAndTime(opt.startDate, opt.startTime);
        const endIso = createIsoFromLocalDateAndTime(opt.endDate, opt.endTime);
        const label = formatDateDisplay(opt);
        const existingVotes = initialPoll?.options?.[i]?.votes || [];

        return {
          id: opt.id || `opt-date-${Date.now()}-${i}`,
          text: label,
          dateValue: startIso,
          endDateValue: endIso,
          startDate: startIso,
          endDate: endIso,
          votes: existingVotes,
        };
      });

      const pollData: Partial<Poll> = {
        groupId: targetGroupId,
        title: title.trim(),
        type: 'date',
        description: description.trim(),
        options: formattedOptions,
      };

      if (isEditing && initialPoll && onUpdatePoll) {
        onUpdatePoll(initialPoll.id, pollData);
      } else {
        onCreatePoll({
          ...pollData,
          createdBy: safeUserId,
          creatorName: safeUserName,
          creatorAvatar: safeUserAvatar,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      // Inclure les options existantes + la saisie en cours si non vide (avec déduplication)
      const allChoices = [...choiceOptions];
      if (newChoiceInput.trim() && !allChoices.includes(newChoiceInput.trim())) {
        allChoices.push(newChoiceInput.trim());
      }
      const validChoices = Array.from(new Set(allChoices.map(c => c.trim()).filter(Boolean)));
      if (validChoices.length < 2) {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const pollData: Partial<Poll> = {
        groupId: targetGroupId,
        title: title.trim(),
        type: 'choice',
        description: description.trim(),
        options: validChoices.map((opt, i) => ({
          id: initialPoll?.options?.[i]?.id || `opt-choice-${Date.now()}-${i}`,
          text: opt,
          votes: initialPoll?.options?.[i]?.votes || [],
        })),
      };

      if (isEditing && initialPoll && onUpdatePoll) {
        onUpdatePoll(initialPoll.id, pollData);
      } else {
        onCreatePoll({
          ...pollData,
          createdBy: safeUserId,
          creatorName: safeUserName,
          creatorAvatar: safeUserAvatar,
          createdAt: new Date().toISOString(),
        });
      }
    }

    onClose();
    setTimeout(() => {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="create-poll-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="create-poll-modal-card"
        className="relative w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#6D2932] dark:text-[#FFF9EB]" />
            <h3 className="text-lg font-bold text-[#6D2932] dark:text-[#FFF9EB] font-display">
              {isEditing ? 'Modifier le sondage' : 'Créer un sondage'}
            </h3>
          </div>
          <button
            id="create-poll-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector: Dates vs Choices */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1.5">
              Type de sondage
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="poll-type-date-btn"
                onClick={() => setType('date')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  type === 'date'
                    ? 'bg-[#5D0D18] text-[#FFF9EB] border-[#5D0D18] shadow-sm'
                    : 'bg-[#E8D8C4]/50 dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300 border-[#C7B7A3]/60 dark:border-zinc-700 hover:bg-[#E8D8C4] dark:hover:bg-zinc-700 dark:hover:text-white'
                }`}
              >
                <Calendar className={`w-4 h-4 ${type === 'date' ? 'text-[#FFF9EB]' : 'text-[#5D0D18] dark:text-amber-300'}`} />
                <div className="font-bold text-xs text-center">
                  Sondage de date
                </div>
              </button>

              <button
                type="button"
                id="poll-type-choice-btn"
                onClick={() => setType('choice')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  type === 'choice'
                    ? 'bg-[#5D0D18] text-[#FFF9EB] border-[#5D0D18] shadow-sm'
                    : 'bg-[#E8D8C4]/50 dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300 border-[#C7B7A3]/60 dark:border-zinc-700 hover:bg-[#E8D8C4] dark:hover:bg-zinc-700 dark:hover:text-white'
                }`}
              >
                <BarChart2 className={`w-4 h-4 ${type === 'choice' ? 'text-[#FFF9EB]' : 'text-[#5D0D18] dark:text-amber-300'}`} />
                <div className="font-bold text-xs text-center">
                  Autres sondages
                </div>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
              Titre *
            </label>
            <input
              type="text"
              id="poll-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'date' ? "Quel créneau pour notre prochain week-end ?" : "Quel menu pour samedi soir ?"}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#5D0D18]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
              Description
            </label>
            <input
              type="text"
              id="poll-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Votez vos disponibilités pour qu'on puisse réserver le refuge..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB]"
            />
          </div>

          {/* Type DATE: Strict start & end fields for each option */}
          {type === 'date' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                  Propositions *
                </label>
              </div>

              <div className="space-y-3">
                {dateOptions.map((opt, idx) => (
                  <div
                    key={opt.id}
                    className="p-3 rounded-2xl bg-[#E8D8C4]/40 dark:bg-zinc-800/60 border border-[#C7B7A3]/50 dark:border-zinc-700 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5D0D18] dark:text-amber-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#5D0D18] dark:text-amber-300 shrink-0" />
                        <span>Option {idx + 1} : {formatDateDisplay(opt)}</span>
                      </span>
                      {dateOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeDateOption(idx)}
                          className="p-1 text-red-600 dark:text-rose-400 hover:bg-red-100 dark:hover:bg-rose-950/50 rounded-lg text-xs cursor-pointer transition-colors"
                          title="Supprimer ce créneau"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[#27272A]/80 dark:text-zinc-300 mb-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#5D0D18] dark:text-amber-300" />
                          <span>Début *</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={`${opt.startDate}T${opt.startTime}`}
                          onChange={(e) => {
                            const [d, t] = e.target.value.split('T');
                            handleDateOptionChange(idx, 'startDate', d);
                            handleDateOptionChange(idx, 'startTime', t);
                          }}
                          required
                          className="w-full px-2.5 py-1.5 rounded-xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB] [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#27272A]/80 dark:text-zinc-300 mb-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#5D0D18] dark:text-amber-300" />
                          <span>Fin *</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={`${opt.endDate}T${opt.endTime}`}
                          onChange={(e) => {
                            const [d, t] = e.target.value.split('T');
                            handleDateOptionChange(idx, 'endDate', d);
                            handleDateOptionChange(idx, 'endTime', t);
                          }}
                          required
                          className="w-full px-2.5 py-1.5 rounded-xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB] [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addDateOption}
                className="w-full py-2 rounded-xl bg-[#E8D8C4] dark:bg-zinc-800 text-[#27272A] dark:text-[#FFF9EB] text-xs font-bold hover:bg-[#C7B7A3] dark:hover:bg-zinc-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-[#C7B7A3]/50 dark:border-zinc-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une proposition</span>
              </button>
            </div>
          ) : (
            /* Type CHOICE: Standard textual choice options */
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                Options *
              </label>

              <div className="space-y-1.5">
                {choiceOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 text-center text-xs font-bold text-[#5D0D18] dark:text-amber-300">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={opt}
                      placeholder={`Ex: Option ${idx + 1}...`}
                      onChange={(e) => {
                        const updated = [...choiceOptions];
                        updated[idx] = e.target.value;
                        setChoiceOptions(updated);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-[#E8D8C4]/50 dark:bg-zinc-800 border border-[#C7B7A3]/50 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB] placeholder:text-[#27272A]/40 dark:placeholder:text-zinc-500"
                    />
                    {choiceOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeChoiceOption(idx)}
                        className="p-1.5 text-red-600 dark:text-rose-400 hover:bg-red-100 dark:hover:bg-rose-950/50 rounded-lg text-xs cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new choice option */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newChoiceInput}
                  onChange={(e) => setNewChoiceInput(e.target.value)}
                  placeholder="Ajouter une autre option..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#FFF9EB] dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB] placeholder:text-[#27272A]/40 dark:placeholder:text-zinc-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addChoiceOption();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addChoiceOption}
                  className="px-3 py-1.5 rounded-xl bg-[#E8D8C4] dark:bg-zinc-800 text-[#27272A] dark:text-[#FFF9EB] text-xs font-bold hover:bg-[#C7B7A3] dark:hover:bg-zinc-700 border border-[#C7B7A3]/50 dark:border-zinc-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-3 border-t border-[#C7B7A3]/40 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-bold bg-[#E8D8C4] dark:bg-zinc-800 text-[#27272A] dark:text-[#FFF9EB] hover:bg-[#C7B7A3] dark:hover:bg-zinc-700 cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              id="submit-create-poll-btn"
              disabled={
                isSubmitting ||
                !title.trim() ||
                (type === 'date' ? dateOptions.length < 2 : choiceOptions.length < 2)
              }
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] disabled:opacity-40 transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isEditing ? 'Modification...' : 'Création...'}</span>
                </>
              ) : (
                <span>{isEditing ? 'Enregistrer' : 'Envoyer'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
