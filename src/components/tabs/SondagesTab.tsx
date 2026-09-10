import React, { useState } from 'react';
import {
  BarChart2,
  Calendar,
  Check,
  X,
  Plus,
  ArrowRight,
  Sparkles,
  Users,
  CalendarPlus,
  CheckCircle2,
  Award,
  Edit,
  Trash2
} from 'lucide-react';
import { Poll, UserProfile, GroupMember, PollOption } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface SondagesTabProps {
  polls?: Poll[];
  currentUser: UserProfile;
  members?: GroupMember[];
  onOpenCreatePoll: () => void;
  onVoteOption: (pollId: string, optionId: string, status: 'available' | 'unavailable' | 'yes' | 'no') => void;
  onConvertPollToEvent: (poll, winningOption: PollOption, tiedOptions?: PollOption[]) => void;
  onEditPoll?: (poll: Poll) => void;
  onDeletePoll?: (pollId: string) => void;
}

export const SondagesTab: React.FC<SondagesTabProps> = ({
  polls = [],
  currentUser,
  members = [],
  onOpenCreatePoll,
  onVoteOption,
  onConvertPollToEvent,
  onEditPoll,
  onDeletePoll,
}) => {
  const safePolls = polls || [];
  const safeMembers = members || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-6 pt-4">
      {/* Top Header with Serif Typography and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-serif italic mb-1 text-[#6D2932] dark:text-[#FFF9EB]">
            Sondages
          </h3>
          <p className="text-sm opacity-70 text-[#6D2932] dark:text-zinc-300">
            Trouvez la date idéale ou votez pour vos activités et repas favoris.
          </p>
        </div>

        <button
          id="sondages-btn-create-poll"
          onClick={onOpenCreatePoll}
          className="px-4 py-2 rounded-full text-xs font-bold bg-[#6D2932] text-[#FFF9EB] hover:bg-[#541C24] transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Créer un sondage</span>
        </button>
      </div>

      {/* Polls List */}
      {safePolls.length === 0 ? (
        <div className="p-8 text-center bg-[#E8D8C4]/40 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-[#C7B7A3] dark:border-zinc-700">
          <BarChart2 className="w-10 h-10 text-[#6D2932]/50 dark:text-zinc-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-[#6D2932] dark:text-[#FFF9EB] font-serif">
            Aucun sondage trouvé
          </p>
          <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-1">
            Lancez un sondage de dates ou de choix pour décider ensemble !
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {safePolls.map((poll) => {
            const pollOptions = poll.options || [];

            // Calculate positive vote count for each option
            const counts = pollOptions.map((opt) => {
              const optVotes = opt.votes || [];
              const posCount = optVotes.filter(
                (v) => v.status === 'available' || v.status === 'yes'
              ).length;
              return { option: opt, count: posCount };
            });

            const maxCount = counts.reduce((max, c) => Math.max(max, c.count), 0);
            const topCandidates = counts.filter((c) => c.count === maxCount);
            const isTied = topCandidates.length > 1;
            const bestOption = isTied ? null : topCandidates[0]?.option;
            const canManage =
              poll.createdBy === currentUser.id ||
              safeMembers.some(
                (m) =>
                  (m.userId === currentUser.id || m.id === currentUser.id) &&
                  m.role === 'admin'
              );

            return (
              <div
                key={poll.id}
                id={`poll-card-${poll.id}`}
                className="p-5 rounded-2xl bg-[#E8D8C4] dark:bg-[#27272A] border border-[#C7B7A3] dark:border-zinc-700 shadow-xs space-y-4"
              >
                {/* Header of Poll */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          poll.type === 'date'
                            ? 'bg-[#6D2932] text-[#FFF9EB]'
                            : 'bg-purple-800 text-white'
                        }`}
                      >
                        {poll.type === 'date' ? 'Sondage de dates' : 'Décision / Choix'}
                      </span>
                      {poll.isClosed && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#9FB2AC] text-[#18181B]">
                          Terminé & Converti
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg sm:text-xl font-bold font-serif text-[#6D2932] dark:text-[#FFF9EB]">
                      {poll.title}
                    </h4>
                    {poll.description && (
                      <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-0.5">
                        {poll.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-[#27272A]/70 dark:text-zinc-400">
                      <img
                        src={poll.creatorAvatar}
                        alt={poll.creatorName}
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-[#C7B7A3]"
                        referrerPolicy="no-referrer"
                      />
                      <span className="hidden sm:inline">Par {poll.creatorName}</span>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1 ml-1">
                        {onEditPoll && (
                          <button
                            onClick={() => onEditPoll(poll)}
                            title="Modifier le sondage"
                            className="p-1.5 rounded-lg text-[#5D0D18] dark:text-zinc-300 hover:bg-[#FFF9EB]/80 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeletePoll && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Voulez-vous supprimer le sondage "${poll.title}" ?`)) {
                                onDeletePoll(poll.id);
                              }
                            }}
                            title="Supprimer le sondage"
                            className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Options List */}
                <div className="space-y-3">
                  {pollOptions.map((option) => {
                    const optVotes = option.votes || [];
                    const availableVotes = optVotes.filter(
                      (v) => v.status === 'available' || v.status === 'yes'
                    );

                    const myVote = optVotes.find((v) => v.userId === currentUser.id);
                    const totalPossible = safeMembers.length;
                    const percent = Math.round((availableVotes.length / (totalPossible || 1)) * 100);

                    const isWinning = topCandidates.some((c) => c.option.id === option.id) && availableVotes.length > 0;

                    return (
                      <div
                        key={option.id}
                        id={`poll-option-${option.id}`}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isWinning
                            ? 'bg-[#FFF9EB] dark:bg-[#18181B] border-[#6D2932] dark:border-amber-400 shadow-xs'
                            : 'bg-[#FFF9EB]/80 dark:bg-zinc-800/80 border-[#C7B7A3]/60 dark:border-zinc-700'
                        }`}
                      >
                        {/* Option title & vote percentage */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {isWinning && (
                              <Sparkles className="w-4 h-4 text-[#6D2932] dark:text-amber-300 shrink-0" />
                            )}
                            <span className="text-xs sm:text-sm font-bold text-[#6D2932] dark:text-[#FFF9EB] truncate">
                              {option.text}
                            </span>
                          </div>

                          <span className="text-xs font-bold text-[#6D2932] dark:text-amber-200 shrink-0">
                            {availableVotes.length} / {totalPossible} ({percent}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-[#E8D8C4] dark:bg-zinc-700 overflow-hidden mb-2.5">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isWinning ? 'bg-[#6D2932] dark:bg-amber-400' : 'bg-[#9FB2AC]'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        {/* Avatars of Voters + Interactive Vote Buttons */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#C7B7A3]/30 dark:border-zinc-700/60">
                          {/* Avatars who voted positive */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {availableVotes.map((v) => (
                                <img
                                  key={v.userId}
                                  src={v.userAvatar}
                                  alt={v.userName}
                                  title={`${v.userName} est dispo / favorable`}
                                  className="w-5 h-5 rounded-full object-cover ring-1 ring-white"
                                  referrerPolicy="no-referrer"
                                />
                              ))}
                            </div>
                            {availableVotes.length === 0 && (
                              <span className="text-[11px] text-[#27272A]/50 dark:text-zinc-500 italic">
                                Aucun vote pour l'instant
                              </span>
                            )}
                          </div>

                          {/* Voting actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {poll.type === 'date' ? (
                              <>
                                <button
                                  id={`vote-avail-btn-${option.id}`}
                                  onClick={() =>
                                    onVoteOption(
                                      poll.id,
                                      option.id,
                                      myVote?.status === 'available' ? 'unavailable' : 'available'
                                    )
                                  }
                                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                    myVote?.status === 'available'
                                      ? 'bg-[#9FB2AC] text-[#18181B] shadow-xs'
                                      : 'bg-[#E8D8C4] dark:bg-zinc-700 text-[#6D2932] dark:text-zinc-200 hover:bg-[#9FB2AC]/50'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Dispo</span>
                                </button>

                                <button
                                  id={`vote-unavail-btn-${option.id}`}
                                  onClick={() =>
                                    onVoteOption(
                                      poll.id,
                                      option.id,
                                      myVote?.status === 'unavailable' ? 'available' : 'unavailable'
                                    )
                                  }
                                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                    myVote?.status === 'unavailable'
                                      ? 'bg-red-200 text-red-900 shadow-xs'
                                      : 'bg-[#E8D8C4] dark:bg-zinc-700 text-[#6D2932] dark:text-zinc-200 hover:bg-red-100'
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Pas dispo</span>
                                </button>
                              </>
                            ) : (
                              <button
                                id={`vote-choice-btn-${option.id}`}
                                onClick={() =>
                                  onVoteOption(
                                    poll.id,
                                    option.id,
                                    myVote?.status === 'yes' ? 'no' : 'yes'
                                  )
                                }
                                className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                  myVote?.status === 'yes'
                                    ? 'bg-[#6D2932] text-[#FFF9EB] shadow-xs'
                                    : 'bg-[#E8D8C4] dark:bg-zinc-700 text-[#6D2932] dark:text-zinc-200 hover:bg-[#C7B7A3]'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{myVote?.status === 'yes' ? 'Voté !' : 'Voter'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Date poll action: Convertir en événement */}
                {/* Poll action: Convertir en événement (supported for both Date and Choice polls) */}
                <div className="pt-2 border-t border-[#C7B7A3]/40 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs text-[#27272A]/70 dark:text-zinc-400 flex items-center gap-1.5">
                    {isTied ? (
                      <>
                        <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                        <span className="text-amber-800 dark:text-amber-300 font-semibold">
                          Égalité en tête ({topCandidates.length} options à {maxCount} votes)
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#5D0D18] dark:text-amber-300" />
                        <span>
                          {poll.type === 'date' ? 'Date en tête :' : 'Option en tête :'} <strong>{bestOption?.text}</strong>
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    id={`convert-poll-btn-${poll.id}`}
                    onClick={() => {
                      if (isTied) {
                        onConvertPollToEvent(poll, bestOption, topCandidates.map((c) => c.option));
                      } else {
                        onConvertPollToEvent(poll, bestOption);
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>{isTied ? 'Départager et convertir' : 'Convertir en événement'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
