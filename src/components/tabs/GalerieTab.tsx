import React, { useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Plus,
  Maximize2,
  Calendar,
  User,
  Sparkles
} from 'lucide-react';
import { GalleryItem, UserProfile, GroupMember } from '../../types';
import { compressImage } from '../../utils/imageCompressor';

interface GalerieTabProps {
  galleryItems?: GalleryItem[];
  currentUser: UserProfile;
  members?: GroupMember[];
  onUploadImage: (imageUrl: string, caption?: string) => void;
  onViewImage: (item: GalleryItem) => void;
}

interface PhotoCardProps {
  item: GalleryItem;
  onViewImage: (item: GalleryItem) => void;
}

const PhotoCard = React.memo<PhotoCardProps>(({ item, onViewImage }) => {
  return (
    <div
      id={`gallery-item-thumb-${item.id}`}
      onClick={() => onViewImage(item)}
      className="group relative aspect-square rounded-xl overflow-hidden bg-black/5 border border-[#C7B7A3]/50 dark:border-zinc-800 cursor-pointer shadow-xs hover:shadow-md transition-all hover:scale-[1.02]"
    >
      <img
        src={item.imageUrl}
        alt="Photo galerie"
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        loading="lazy"
      />
      {/* Subtle hover overlay with zoom icon */}
      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="p-2 rounded-full bg-[#FFF9EB]/90 text-[#6D2932] shadow-sm backdrop-blur-xs">
          <Maximize2 className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
});

export const GalerieTab: React.FC<GalerieTabProps> = ({
  galleryItems = [],
  currentUser,
  members = [],
  onUploadImage,
  onViewImage,
}) => {
  const safeItems = galleryItems || [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressing(true);
        const compressed = await compressImage(file, 1280, 1280, 0.82);
        setPendingImage(compressed);
      } catch (err) {
        console.error('Erreur lors de la compression de l\'image:', err);
      } finally {
        setIsCompressing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleConfirmUpload = async () => {
    if (pendingImage && !isUploading) {
      setIsUploading(true);
      try {
        await onUploadImage(pendingImage);
        setPendingImage(null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-6 pt-4">
      {/* Top Header with Serif Typography and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold italic mb-1 text-[#5D0D18] dark:text-[#FFF9EB]">
            Galerie médias
          </h3>
          <p className="text-sm opacity-70 text-[#27272A] dark:text-zinc-300">
            Grille compacte et épurée de tous les souvenirs partagés par le groupe.
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            id="gallery-file-input"
          />

          <button
            id="gallery-btn-import"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-full text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <Upload className="w-4 h-4 stroke-[2.5]" />
            <span>Importer une photo</span>
          </button>
        </div>
      </div>

      {/* Pending Upload Quick Confirmation */}
      {pendingImage && (
        <div className="p-4 rounded-2xl bg-[#FFF9EB] dark:bg-[#18181B] border border-[#C7B7A3] dark:border-zinc-700 shadow-lg flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <img
              src={pendingImage}
              alt="Aperçu"
              className="w-14 h-14 object-cover rounded-xl ring-2 ring-[#5D0D18]"
            />
            <span className="text-xs font-bold text-[#5D0D18] dark:text-[#FFF9EB]">
              Prêt à publier cette photo dans la galerie ?
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="gallery-confirm-upload-btn"
              onClick={handleConfirmUpload}
              disabled={isUploading}
              className="px-4 py-2 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] cursor-pointer disabled:opacity-50"
            >
              {isUploading ? 'Publication...' : 'Publier'}
            </button>
            <button
              onClick={() => setPendingImage(null)}
              className="px-3.5 py-2 rounded-full bg-[#E8D8C4] text-[#27272A] text-xs font-bold hover:bg-[#C7B7A3] cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Compact Square Thumbnail Grid (Without text or description for minimalist look) */}
      {safeItems.length === 0 ? (
        <div className="p-8 text-center bg-[#E8D8C4]/40 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-[#C7B7A3] dark:border-zinc-700">
          <ImageIcon className="w-10 h-10 text-[#6D2932]/50 dark:text-zinc-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-[#6D2932] dark:text-[#FFF9EB] font-serif">
            Aucun média pour le moment
          </p>
          <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-1">
            Partagez vos photos dans le chat ou importez-les directement ici !
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 px-4 py-2 rounded-full text-xs font-bold bg-[#6D2932] text-[#FFF9EB] hover:bg-[#541C24] cursor-pointer"
          >
            Importer une photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-2.5">
          {safeItems.map((item) => (
            <PhotoCard
              key={item.id}
              item={item}
              onViewImage={onViewImage}
            />
          ))}
        </div>
      )}
    </div>
  );
};
