import React, { useState } from 'react';
import { X, Calendar, Check, Award } from 'lucide-react';
import { Poll, PollOption } from '../../types';
import { formatDateOnly } from '../../utils/formatters';

interface PollTieBreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  poll: Poll | null;
  tiedOptions: PollOption[];
  onConfirmSelection: (selectedOption: PollOption) => void;
}

export const PollTieBreakModal: React.FC<PollTieBreakModalProps> = ({
  isOpen,
  onClose,
  poll,
  tiedOptions,
  onConfirmSelection,
}) => {
  if (!isOpen || !poll || tiedOptions.length === 0) return null;

  const [selectedOptionId, setSelectedOptionId] = useState<string>(tiedOptions[0]?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = tiedOptions.find((opt) => opt.id === selectedOptionId);
    if (chosen) {
      onConfirmSelection(chosen);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="poll-tiebreak-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="poll-tiebreak-modal-card"
        className="relative w-full max-w-md bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#6D2932] dark:text-amber-300" />
            <h3 className="text-lg font-bold text-[#6D2932] dark:text-[#FFF9EB] font-display">
              Égalité des votes !
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <p className="text-xs text-[#27272A]/80 dark:text-zinc-300 leading-relaxed">
            Plusieurs options sont arrivées en tête avec le même nombre maximal de votes (
            <strong>{tiedOptions[0]?.votes?.length || 0} votes</strong>).
          </p>
          <p className="text-xs font-semibold text-[#6D2932] dark:text-amber-200 mt-1">
            Veuillez choisir la date finale à valider pour créer l'événement :
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            {tiedOptions.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              const formattedDate = opt.dateValue ? formatDateOnly(opt.dateValue) : opt.text;

              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#6D2932] text-[#FFF9EB] border-[#6D2932] shadow-md scale-[1.01]'
                      : 'bg-[#E8D8C4]/60 dark:bg-zinc-800/60 text-[#27272A] dark:text-[#FFF9EB] border-[#C7B7A3]/50 hover:bg-[#E8D8C4]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className={`w-4 h-4 ${isSelected ? 'text-[#FFF9EB]' : 'text-[#6D2932] dark:text-amber-300'}`} />
                    <div>
                      <span className="text-xs font-bold block">{formattedDate}</span>
                      {opt.dateValue && opt.text && opt.text !== opt.dateValue && (
                        <span className={`text-[10px] block opacity-80`}>
                          {opt.text}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-[#6D2932]/15 text-[#6D2932] dark:text-amber-200'}`}>
                      {opt.votes?.length || 0} votes
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#FFF9EB] text-[#6D2932] flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full bg-[#E8D8C4] text-[#27272A] text-xs font-bold hover:bg-[#C7B7A3] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-[#6D2932] text-[#FFF9EB] text-xs font-bold hover:bg-[#541C24] transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Valider cette date et créer l'événement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
