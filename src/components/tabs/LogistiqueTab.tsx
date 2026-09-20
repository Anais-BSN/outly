import React, { useState } from 'react';
import {
  Plus,
  Check,
  Package,
  Utensils,
  ClipboardList,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { LogisticsTask, UserProfile, GroupMember, TaskCategory } from '../../types';

interface LogistiqueTabProps {
  tasks?: LogisticsTask[];
  currentUser: UserProfile;
  members?: GroupMember[];
  onOpenAddTask: () => void;
  onToggleComplete: (taskId: string) => void;
  onClaimTask: (taskId: string) => void;
  onUnclaimTask: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onViewAvatar?: (imageUrl: string, title?: string, subtitle?: string) => void;
}

export const LogistiqueTab: React.FC<LogistiqueTabProps> = ({
  tasks = [],
  currentUser,
  members = [],
  onOpenAddTask,
  onToggleComplete,
  onClaimTask,
  onUnclaimTask,
  onDeleteTask,
  onViewAvatar,
}) => {
  const [filter, setFilter] = useState<'all' | 'todo' | 'mine'>('all');

  const safeTasks = tasks || [];
  const safeMembers = members || [];
  const totalCount = safeTasks.length;
  const completedCount = safeTasks.filter((t) => t.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredTasks = safeTasks.filter((task) => {
    if (filter === 'todo' && task.completed) return false;
    if (filter === 'mine' && task.assignedToId !== currentUser.id) return false;
    return true;
  });

  const getCreatorName = (task: LogisticsTask) => {
    if (!task.createdBy) return null;
    if (task.createdBy === currentUser.id || task.createdBy === 'user-me') return 'Moi';
    const found = safeMembers.find(
      (m) => m.id === task.createdBy || m.userId === task.createdBy
    );
    return found ? (found.firstName || found.name) : 'Un membre';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-6 pt-4">
      {/* 1. Header with Clean Title & Subtitle (No decorative box frame or icon) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold mb-1 text-[#6D2932] dark:text-[#FFF9EB]">
            Logistique
          </h3>
          <p className="text-sm opacity-70 text-[#6D2932] dark:text-zinc-300">
            Attribuez les tâches et les objets à ramener pour ne rien oublier.
          </p>
        </div>

        <button
          id="logistique-btn-add-task-top"
          onClick={onOpenAddTask}
          className="px-4 py-2 rounded-full text-xs font-bold bg-[#6D2932] text-[#FFF9EB] hover:bg-[#541C24] transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Ajouter une tâche</span>
        </button>
      </div>

      {/* 2. Progress Bar: Positioned Outside and Below Title Frame */}
      <div className="p-4 rounded-2xl bg-[#E8D8C4] dark:bg-[#27272A] border border-[#C7B7A3] dark:border-zinc-700 shadow-xs">
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#6D2932] dark:text-[#FFF9EB] mb-2">
          <span>Progression de la logistique</span>
          <span>
            {completedCount} / {totalCount} complètes ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-3 bg-[#C7B7A3]/50 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#9FB2AC] transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3. Filter Pills (Category row completely removed) */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          id="logistique-filter-all"
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-[#6D2932] text-[#FFF9EB] shadow-xs'
              : 'border border-[#C7B7A3] text-[#6D2932] dark:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800'
          }`}
        >
          Tous ({safeTasks.length})
        </button>

        <button
          id="logistique-filter-todo"
          onClick={() => setFilter('todo')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            filter === 'todo'
              ? 'bg-[#6D2932] text-[#FFF9EB] shadow-xs'
              : 'border border-[#C7B7A3] text-[#6D2932] dark:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800'
          }`}
        >
          À faire ({safeTasks.filter((t) => !t.completed).length})
        </button>

        <button
          id="logistique-filter-mine"
          onClick={() => setFilter('mine')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            filter === 'mine'
              ? 'bg-[#6D2932] text-[#FFF9EB] shadow-xs'
              : 'border border-[#C7B7A3] text-[#6D2932] dark:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800'
          }`}
        >
          Mes tâches ({safeTasks.filter((t) => t.assignedToId === currentUser.id).length})
        </button>
      </div>

      {/* 4. 2-Column Responsive Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((task) => {
          const isAssignedToMe = task.assignedToId === currentUser.id;
          const creatorName = getCreatorName(task);

          return (
            <div
              key={task.id}
              id={`task-item-${task.id}`}
              className={`p-4 rounded-2xl border border-[#C7B7A3] dark:border-zinc-700 flex items-center justify-between gap-3 shadow-xs transition-all ${
                task.completed
                  ? 'bg-[#E8D8C4] dark:bg-[#27272A]'
                  : 'bg-white dark:bg-zinc-800'
              }`}
            >
              {/* Checkbox + Details */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <button
                  id={`task-checkbox-${task.id}`}
                  onClick={() => onToggleComplete(task.id)}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    task.completed
                      ? 'border border-[#6D2932] bg-[#9FB2AC] text-white shadow-xs'
                      : 'border border-[#C7B7A3] bg-[#FFF9EB]/40 dark:bg-zinc-900 hover:border-[#6D2932]'
                  }`}
                  aria-label="Cocher la tâche"
                >
                  {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#6D2932] dark:text-[#FFF9EB] truncate">
                    {task.title} {task.quantity ? `(${task.quantity})` : ''}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] opacity-75 font-semibold text-[#6D2932] dark:text-zinc-400 mt-0.5 flex-wrap">
                    <span className="uppercase tracking-widest">{task.category}</span>
                    {creatorName && (
                      <>
                        <span>•</span>
                        <span>Créé par {creatorName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action, Assignee Badge & Direct Delete Trash Icon */}
              <div className="shrink-0 flex items-center gap-2">
                {task.completed ? null : task.assignedToId ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 bg-[#FFF9EB] dark:bg-zinc-900 px-2.5 py-1 rounded-full border border-[#C7B7A3] dark:border-zinc-700 shadow-xs">
                      <img
                        src={task.assignedToAvatar || ''}
                        alt={task.assignedToName || ''}
                        title={`${task.assignedToName || ''} (cliquer pour agrandir)`}
                        onClick={() => {
                          if (onViewAvatar && task.assignedToAvatar) {
                            onViewAvatar(task.assignedToAvatar, task.assignedToName || 'Membre');
                          }
                        }}
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-[#6D2932] cursor-pointer hover:scale-110 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[11px] font-bold text-[#6D2932] dark:text-[#FFF9EB]">
                        {isAssignedToMe ? 'Moi' : task.assignedToName}
                      </span>
                    </div>

                    {isAssignedToMe && (
                      <button
                        id={`task-unclaim-btn-${task.id}`}
                        onClick={() => onUnclaimTask(task.id)}
                        className="text-[10px] font-semibold text-red-600 dark:text-red-400 hover:underline px-1 cursor-pointer"
                        title="Se désister"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    id={`task-claim-btn-${task.id}`}
                    onClick={() => onClaimTask(task.id)}
                    className="px-3 py-1 bg-[#6D2932] text-white text-[10px] font-bold rounded-full hover:bg-[#541C24] transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    Je m'en charge
                  </button>
                )}

                {/* Direct delete trash button: Any member can delete any task */}
                {onDeleteTask && (
                  <button
                    id={`task-delete-btn-${task.id}`}
                    onClick={() => {
                      if (window.confirm(`Supprimer la tâche "${task.title}" ?`)) {
                        onDeleteTask(task.id);
                      }
                    }}
                    className="p-1.5 text-red-500/70 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition-colors cursor-pointer"
                    title="Supprimer la tâche"
                    aria-label="Supprimer la tâche"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Task Dashed Card */}
        <div className="p-4 bg-white/50 dark:bg-zinc-800/40 border-2 border-dashed border-[#C7B7A3] dark:border-zinc-700 rounded-2xl flex items-center justify-center min-h-[72px]">
          <button
            id="logistique-btn-add-task-grid"
            onClick={onOpenAddTask}
            className="flex items-center gap-2 text-xs font-bold opacity-70 hover:opacity-100 text-[#6D2932] dark:text-[#FFF9EB] transition-opacity cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Ajouter une tâche</span>
          </button>
        </div>
      </div>
    </div>
  );
};

