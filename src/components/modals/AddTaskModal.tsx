import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  Package,
  Utensils,
  ClipboardList,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { GroupMember, LogisticsTask, TaskCategory, UserProfile } from '../../types';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  members: GroupMember[];
  groupId: string;
  onAddTask: (taskData: Partial<LogisticsTask>) => void;
}

const CATEGORIES: TaskCategory[] = ['Matériel', 'Nourriture', 'Organisation', 'Autre'];

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  members,
  groupId,
  onAddTask,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState<TaskCategory>('Matériel');
  const [assignedToId, setAssignedToId] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const assignedMember = members.find((m) => m.userId === assignedToId);

    onAddTask({
      groupId,
      title: title.trim(),
      quantity: quantity.trim() || '1',
      category,
      completed: false,
      assignedToId: assignedToId || undefined,
      assignedToName: assignedMember?.name,
      assignedToAvatar: assignedMember?.avatar,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="add-task-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="add-task-modal-card"
        className="relative w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#6D2932] dark:text-[#FFF9EB]" />
            <h3 className="text-lg font-bold text-[#6D2932] dark:text-[#FFF9EB] font-display">
              Ajouter un objet ou une mission
            </h3>
          </div>
          <button
            id="add-task-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
              Objet ou tâche à prévoir *
            </label>
            <input
              type="text"
              id="task-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Tente 4 places, Pack d'eau, Jeux de société..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#6D2932]"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
              Quantité / Précision
            </label>
            <input
              type="text"
              id="task-quantity-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ex: 2 packs, 1 grande table, etc."
              className="w-full px-3.5 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB]"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1.5">
              Catégorie
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center ${
                    category === cat
                      ? 'bg-[#6D2932] text-[#FFF9EB]'
                      : 'bg-[#E8D8C4]/60 dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300 hover:bg-[#E8D8C4]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
              Assigner à un membre (optionnel)
            </label>
            <select
              id="task-assignee-select"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm font-semibold text-[#27272A] dark:text-[#FFF9EB]"
            >
              <option value="">Non assigné (n'importe qui peut s'en charger)</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} {m.userId === currentUser.id ? '(Moi)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-[#C7B7A3]/40 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E8D8C4] text-[#27272A] hover:bg-[#C7B7A3]"
            >
              Annuler
            </button>

            <button
              type="submit"
              id="submit-add-task-btn"
              disabled={!title.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#6D2932] text-[#FFF9EB] hover:bg-[#541C24] disabled:opacity-40 transition-all shadow-md active:scale-95"
            >
              Ajouter l'élément
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
