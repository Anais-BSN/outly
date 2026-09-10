import React, { useState } from 'react';
import {
  X,
  Users,
  Plus,
  Image as ImageIcon,
  Sparkles,
  Check
} from 'lucide-react';
import { Friend, UserProfile, Group } from '../../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[];
  currentUser: UserProfile;
  onCreateGroup: (groupData: Partial<Group>, invitedFriendIds: string[]) => void;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1000&auto=format&fit=crop&q=80',
];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  friends = [],
  currentUser,
  onCreateGroup,
}) => {
  if (!isOpen) return null;

  const safeFriends = friends || [];
  const [name, setName] = useState('');
  const [coverImage, setCoverImage] = useState(PRESET_COVERS[0]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  const acceptedFriends = safeFriends.filter((f) => f && f.status === 'accepted');

  const toggleFriend = (id: string) => {
    if (selectedFriendIds.includes(id)) {
      setSelectedFriendIds(selectedFriendIds.filter((fId) => fId !== id));
    } else {
      setSelectedFriendIds([...selectedFriendIds, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateGroup(
      {
        name: name.trim(),
        description: '',
        coverImage,
      },
      selectedFriendIds
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="create-group-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="create-group-modal-card"
        className="relative w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#5D0D18] dark:text-[#FFF9EB]" />
            <h3 className="text-lg font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-display">
              Créer un nouveau groupe
            </h3>
          </div>
          <button
            id="create-group-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
              Nom du groupe *
            </label>
            <input
              type="text"
              id="new-group-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Escapade Normandie, Soirée Bowling, etc."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#5D0D18]"
            />
          </div>

          {/* Cover Photo Preset Choice */}
          <div>
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1.5">
              Photo de couverture du groupe
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_COVERS.map((url, i) => (
                <div
                  key={i}
                  onClick={() => setCoverImage(url)}
                  className={`relative h-18 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                    coverImage === url
                      ? 'border-[#5D0D18] ring-2 ring-[#5D0D18]'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Couverture ${i}`} className="w-full h-full object-cover" />
                  {coverImage === url && (
                    <div className="absolute inset-0 bg-[#5D0D18]/30 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white stroke-[3]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Select Friends to invite */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
              Inviter des amis ({selectedFriendIds.length} sélectionnés)
            </label>

            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
              {acceptedFriends.map((friend) => {
                const isSelected = selectedFriendIds.includes(friend.id);

                return (
                  <div
                    key={friend.id}
                    onClick={() => toggleFriend(friend.id)}
                    className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#FFF9EB] dark:bg-zinc-800 border-[#5D0D18] shadow-xs'
                        : 'bg-[#E8D8C4]/40 dark:bg-zinc-900 border-[#C7B7A3]/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={friend.avatar}
                        alt={friend.firstName}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-[#C7B7A3]"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                        {friend.firstName} {friend.lastName}
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                        isSelected
                          ? 'bg-[#5D0D18] text-[#FFF9EB]'
                          : 'border border-[#C7B7A3] text-transparent'
                      }`}
                    >
                      ✓
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-[#C7B7A3]/40 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E8D8C4] text-[#27272A] hover:bg-[#C7B7A3] cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              id="submit-create-group-btn"
              disabled={!name.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] disabled:opacity-40 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Créer le groupe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
