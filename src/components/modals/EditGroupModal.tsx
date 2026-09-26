import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Edit,
  Image as ImageIcon,
  Check,
  Upload,
  Crop,
} from 'lucide-react';
import { Group } from '../../types';
import { ImageCropperModal } from './ImageCropperModal';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onUpdateGroup: (data: Partial<Group>) => Promise<void> | void;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1000&auto=format&fit=crop&q=80',
];

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
  isOpen,
  onClose,
  group,
  onUpdateGroup,
}) => {
  if (!isOpen || !group) return null;

  const [name, setName] = useState(group.name || '');
  const [description, setDescription] = useState(group.description || '');
  const [coverImage, setCoverImage] = useState(group.coverImage || PRESET_COVERS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Interactive Image Cropping State
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(group.name || '');
      setDescription(group.description || '');
      setCoverImage(group.coverImage || PRESET_COVERS[0]);
      setIsCropperOpen(false);
      setImageToCrop(null);
    }
  }, [isOpen, group]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageToCrop(reader.result);
          setIsCropperOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onUpdateGroup({
        name: name.trim(),
        description: description.trim(),
        coverImage,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <div
          id="edit-group-modal-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
        />

        {/* Modal Card */}
        <div
          id="edit-group-modal-card"
          className="relative w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-[#5D0D18] dark:text-[#FFF9EB]" />
              <h3 className="text-lg font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-display">
                Modifier le groupe
              </h3>
            </div>
            <button
              id="edit-group-close-btn"
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
                id="edit-group-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Escapade Normandie..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#5D0D18]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                Description
              </label>
              <textarea
                id="edit-group-desc-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description ou thème du groupe..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-xs text-[#27272A] dark:text-[#FFF9EB] focus:ring-2 focus:ring-[#5D0D18]"
              />
            </div>

            {/* Cover Photo Preset Choice or Upload */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                  Bannière du groupe
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImageToCrop(coverImage);
                      setIsCropperOpen(true);
                    }}
                    className="text-xs font-bold text-[#5D0D18] dark:text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>Recadrer</span>
                  </button>
                  <label
                    htmlFor="edit-group-file-upload"
                    className="text-xs font-bold text-[#5D0D18] dark:text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importer & recadrer</span>
                  </label>
                </div>
                <input
                  type="file"
                  id="edit-group-file-upload"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Current / Custom cover preview */}
              <div className="mb-2 relative w-full aspect-[3/1] rounded-2xl overflow-hidden border-2 border-[#5D0D18] shadow-sm bg-black/5">
                <img src={coverImage} alt="Aperçu de l'illustration" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-between p-2.5">
                  <span className="text-[11px] font-bold text-white flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Bannière active
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setImageToCrop(coverImage);
                      setIsCropperOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold hover:bg-black/80 flex items-center gap-1 cursor-pointer"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>Ajuster</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {PRESET_COVERS.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setCoverImage(url)}
                    className={`relative h-16 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
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
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Interactive Crop Modal Calibrated to Exact Banner Format */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageSrc={imageToCrop}
        aspectRatioType="banner"
        title="Recadrer la bannière du groupe"
        subtitle="Format rectangulaire étiré exact de la bannière Outlys"
        onClose={() => {
          setIsCropperOpen(false);
          setImageToCrop(null);
        }}
        onApplyCrop={(croppedDataUrl) => {
          setCoverImage(croppedDataUrl);
          setIsCropperOpen(false);
          setImageToCrop(null);
        }}
      />
    </>
  );
};
