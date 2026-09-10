import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Check,
  UserCheck,
  User,
  Package,
  Utensils,
  ClipboardList,
  Sparkles
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
}

export const LogistiqueTab: React.FC<LogistiqueTabProps> = ({
  tasks = [],
  currentUser,
  members = [],
  onOpenAddTask,
  onToggleComplete,
  onClaimTask,
  onUnclaimTask,
}) => {
  const [filter, setFilter] = useState<'all' | 'todo' | 'mine'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const safeTasks = tasks || [];
  const totalCount = safeTasks.length;
  const completedCount = safeTasks.filter((t) => t.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredTasks = safeTasks.filter((task) => {
    // Status filter
    if (filter === 'todo' && task.completed) return false;
    if (filter === 'mine' && task.assignedToId !== currentUser.id) return false;

    // Category filter
    if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;

    return true;
  });

  const getCategoryIcon = (category: TaskCategory) => {
    switch (category) {
      case 'Matériel': return <Package className="w-3.5 h-3.5" />;
      case 'Nourriture': return <Utensils className="w-3.5 h-3.5" />;
      case 'Organisation': return <ClipboardList className="w-3.5 h-3.5" />;
      default: return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-6 pt-4">
      {/* Top Section with Title, Subtitle, and Progress Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/60 border border-[#C7B7A3]/60 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#6D2932] dark:text-amber-200" />
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#6D2932] dark:text-[#FFF9EB]">
              Logistique
            </h3>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#27272A]/80 dark:text-zinc-300 mt-1 max-w-xl">
            Matériel, Nourriture & Organisation, Attribuez les tâches et les objets à ramener pour ne rien oublier.
          </p>
        </div>

        <div className="flex flex-col sm:items-end shrink-0 bg-[#FFF9EB] dark:bg-zinc-900 p-3 rounded-xl border border-[#C7B7A3]/50 dark:border-zinc-700 shadow-xs">
          <div className="text-xs sm:text-sm font-bold mb-1.5 text-[#6D2932] dark:text-[#FFF9EB]">
            {completedCount} / {totalCount} complètes ({progressPercent}%)
          </div>
          <div className="w-44 sm:w-52 h-2.5 bg-[#C7B7A3]/50 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#9FB2AC] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', 'Matériel', 'Nourriture', 'Organisation', 'Transport'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#6D2932] text-[#FFF9EB] dark:bg-[#FFF9EB] dark:text-[#18181B]'
                  : 'border border-[#C7B7A3]/70 text-[#6D2932]/80 dark:text-zinc-400 hover:bg-white/40'
              }`}
            >
              {cat === 'all' ? 'Toutes' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2-Column Responsive Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((task) => {
          const isAssignedToMe = task.assignedToId === currentUser.id;

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
                    {task.title} {task.quantity && task.quantity !== '1' && `(${task.quantity})`}
                  </div>
                  <div className="text-[10px] opacity-60 uppercase tracking-widest font-semibold text-[#6D2932] dark:text-zinc-400 mt-0.5">
                    {task.category}
                  </div>
                </div>
              </div>

              {/* Action or Assignee Badge */}
              <div className="shrink-0 flex items-center gap-2">
                {task.completed ? (
                  <div className="flex flex-col items-end">
                    {task.assignedToAvatar ? (
                      <img
                        src={task.assignedToAvatar}
                        alt={task.assignedToName || 'Assigné'}
                        title={task.assignedToName || ''}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-[#6D2932] shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#9FB2AC] flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
                        ✓
                      </div>
                    )}
                    <span className="text-[9px] font-bold text-[#6D2932] dark:text-zinc-400 mt-0.5">
                      Fait
                    </span>
                  </div>
                ) : task.assignedToId ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 bg-[#FFF9EB] dark:bg-zinc-900 px-2.5 py-1 rounded-full border border-[#C7B7A3] dark:border-zinc-700 shadow-xs">
                      <img
                        src={task.assignedToAvatar || ''}
                        alt={task.assignedToName || ''}
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-[#6D2932]"
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
            <span>Ajouter une tâche / objet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
