import React, { useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Plus,
  Maximize2,
  Calendar,
  User,
  Sparkles,
  Check,
  Download,
  X,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';
import { GalleryItem, UserProfile, GroupMember } from '../../types';
import { compressImage } from '../../utils/imageCompressor';

interface GalerieTabProps {
  galleryItems?: GalleryItem[];
  currentUser: UserProfile;
  members?: GroupMember[];
  onUploadImage: (imageUrl: string, caption?: string) => Promise<void> | void;
  onViewImage: (item: GalleryItem) => void;
}

interface PhotoCardProps {
  item: GalleryItem;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onStartSelectionMode: (id: string) => void;
  onViewImage: (item: GalleryItem) => void;
}

const PhotoCard = React.memo<PhotoCardProps>(({
  item,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  onStartSelectionMode,
  onViewImage,
}) => {
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

  const handleTouchStart = () => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      onStartSelectionMode(item.id);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressTriggeredRef.current) {
      e.preventDefault();
      return;
    }
    if (isSelectionMode) {
      onToggleSelect(item.id);
    } else {
      onViewImage(item);
    }
  };

  return (
    <div
      id={`gallery-item-thumb-${item.id}`}
      onClick={handleClick}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => {
        if (!isSelectionMode) {
          e.preventDefault();
          onStartSelectionMode(item.id);
        }
      }}
      className={`group relative aspect-square rounded-2xl overflow-hidden bg-black/5 border transition-all cursor-pointer shadow-xs select-none ${
        isSelected
          ? 'border-[#5D0D18] ring-3 ring-[#5D0D18] scale-[0.97]'
          : isSelectionMode
          ? 'border-[#C7B7A3]/70 hover:border-[#5D0D18]'
          : 'border-[#C7B7A3]/50 dark:border-zinc-800 hover:shadow-md hover:scale-[1.02]'
      }`}
    >
      <img
        src={item.imageUrl}
        alt="Photo galerie"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
        loading="lazy"
      />

      {/* Selection Mode Checkbox Badge */}
      {isSelectionMode && (
        <div className="absolute top-2 right-2 z-10">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-[#5D0D18] text-white shadow-md'
                : 'bg-black/40 text-white/80 backdrop-blur-xs border border-white/60'
            }`}
          >
            {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
          </div>
        </div>
      )}

      {/* Subtle hover overlay with zoom icon (only when not in selection mode) */}
      {!isSelectionMode && (
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="p-2 rounded-full bg-[#FFF9EB]/90 text-[#5D0D18] shadow-sm backdrop-blur-xs">
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
    </div>
  );
});
PhotoCard.displayName = 'PhotoCard';

export const GalerieTab: React.FC<GalerieTabProps> = ({
  galleryItems = [],
  currentUser,
  members = [],
  onUploadImage,
  onViewImage,
}) => {
  const safeItems = galleryItems || [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-upload state
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Selection mode for batch download
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsCompressing(true);
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressImage(file, 1280, 1280, 0.82);
        compressedList.push(compressed);
      }
      setPendingImages(compressedList);
    } catch (err) {
      console.error('Erreur lors de la compression des images:', err);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmUpload = async () => {
    if (pendingImages.length === 0 || isUploading) return;
    setIsUploading(true);
    setUploadProgress({ current: 0, total: pendingImages.length });

    try {
      for (let i = 0; i < pendingImages.length; i++) {
        setUploadProgress({ current: i + 1, total: pendingImages.length });
        await onUploadImage(pendingImages[i]);
      }
      setPendingImages([]);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleStartSelectionMode = (initialId?: string) => {
    setIsSelectionMode(true);
    if (initialId) {
      setSelectedIds(new Set([initialId]));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === safeItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(safeItems.map((i) => i.id)));
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);

  // Convert Data URL to Blob reliably in pure JavaScript
  const dataUrlToBlob = (dataUrl: string): Blob => {
    try {
      const parts = dataUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch {
      return new Blob([], { type: 'image/jpeg' });
    }
  };

  const triggerDownload = (blobOrUrl: Blob | string, filename: string) => {
    let blobUrl: string;
    if (typeof blobOrUrl === 'string') {
      if (blobOrUrl.startsWith('data:')) {
        const blob = dataUrlToBlob(blobOrUrl);
        blobUrl = URL.createObjectURL(blob);
      } else {
        blobUrl = blobOrUrl;
      }
    } else {
      blobUrl = URL.createObjectURL(blobOrUrl);
    }

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (blobUrl.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    }
  };

  const handleBatchDownload = async () => {
    const itemsToDownload = safeItems.filter((i) => selectedIds.has(i.id));
    if (itemsToDownload.length === 0) return;

    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: itemsToDownload.length });

    try {
      for (let idx = 0; idx < itemsToDownload.length; idx++) {
        const item = itemsToDownload[idx];
        setDownloadProgress({ current: idx + 1, total: itemsToDownload.length });
        const filename = `outly_photo_${idx + 1}.jpg`;

        if (item.imageUrl.startsWith('data:')) {
          triggerDownload(item.imageUrl, filename);
        } else {
          try {
            const response = await fetch(item.imageUrl, { mode: 'cors' });
            if (!response.ok) throw new Error('Fetch failed');
            const blob = await response.blob();
            triggerDownload(blob, filename);
          } catch {
            triggerDownload(item.imageUrl, filename);
          }
        }
        // Small delay between downloads so the browser handles each cleanly
        await new Promise((res) => setTimeout(res, 350));
      }
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 px-4 sm:px-6 pt-4">
      {/* Top Header with Bold Typography and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold mb-1 text-[#5D0D18] dark:text-[#FFF9EB]">
            Galerie
          </h3>
          <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
            {isSelectionMode
              ? 'Sélectionnez les photos à télécharger simultanément.'
              : 'Cliquez longuement sur une photo pour activer la sélection multiple.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {safeItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (isSelectionMode) {
                  handleCancelSelection();
                } else {
                  handleStartSelectionMode();
                }
              }}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelectionMode
                  ? 'bg-[#E8D8C4] text-[#27272A] hover:bg-[#C7B7A3]'
                  : 'bg-[#FFF9EB] dark:bg-zinc-800 border border-[#C7B7A3]/60 dark:border-zinc-700 text-[#5D0D18] dark:text-amber-300 hover:bg-[#E8D8C4]'
              }`}
            >
              {isSelectionMode ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
              <span>{isSelectionMode ? 'Annuler la sélection' : 'Sélectionner'}</span>
            </button>
          )}

          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFilesChange}
            accept="image/*"
            className="hidden"
            id="gallery-file-input"
          />

          <button
            id="gallery-btn-import"
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing}
            className="px-4 py-2 rounded-full text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            {isCompressing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>{isCompressing ? 'Préparation...' : 'Importer des photos'}</span>
          </button>
        </div>
      </div>

      {/* Pending Multiple Upload Quick Confirmation */}
      {pendingImages.length > 0 && (
        <div className="p-4 rounded-3xl bg-[#FFF9EB] dark:bg-[#18181B] border border-[#C7B7A3] dark:border-zinc-700 shadow-lg space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5D0D18] dark:text-[#FFF9EB]">
              {pendingImages.length} photo{pendingImages.length > 1 ? 's prêtes' : ' prête'} à être publiée{pendingImages.length > 1 ? 's' : ''} dans la galerie
            </span>
            <span className="text-[11px] opacity-70">
              {uploadProgress ? `Envoi de ${uploadProgress.current} / ${uploadProgress.total}...` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
            {pendingImages.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Aperçu ${i + 1}`}
                className="w-16 h-16 object-cover rounded-2xl ring-2 ring-[#5D0D18] shrink-0"
              />
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#C7B7A3]/40 dark:border-zinc-800">
            <button
              onClick={() => setPendingImages([])}
              disabled={isUploading}
              className="px-3.5 py-1.5 rounded-full bg-[#E8D8C4] text-[#27272A] text-xs font-bold hover:bg-[#C7B7A3] cursor-pointer disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              id="gallery-confirm-upload-btn"
              onClick={handleConfirmUpload}
              disabled={isUploading}
              className="px-5 py-1.5 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{isUploading ? 'Publication en cours...' : `Publier ${pendingImages.length} photo${pendingImages.length > 1 ? 's' : ''}`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid of photos */}
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
            Importer des photos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-2.5">
          {safeItems.map((item) => (
            <PhotoCard
              key={item.id}
              item={item}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={handleToggleSelect}
              onStartSelectionMode={handleStartSelectionMode}
              onViewImage={onViewImage}
            />
          ))}
        </div>
      )}

      {/* Floating Batch Download Action Bar (appears at the bottom when in selection mode) */}
      {isSelectionMode && (
        <div className="fixed bottom-20 sm:bottom-8 left-4 right-4 max-w-xl mx-auto z-40 animate-slide-up">
          <div className="p-3 sm:p-4 rounded-3xl bg-[#5D0D18] text-[#FFF9EB] shadow-2xl border border-white/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={handleSelectAll}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1 shrink-0"
              >
                {selectedIds.size === safeItems.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {selectedIds.size === safeItems.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </span>
              </button>

              <span className="text-xs font-bold truncate">
                {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCancelSelection}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold transition-all cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                id="gallery-btn-batch-download"
                disabled={selectedIds.size === 0 || isDownloading}
                onClick={handleBatchDownload}
                className="px-4 py-1.5 rounded-full bg-[#FFF9EB] text-[#5D0D18] text-xs font-bold hover:bg-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>
                  {isDownloading
                    ? downloadProgress
                      ? `Téléchargement (${downloadProgress.current}/${downloadProgress.total})...`
                      : 'Téléchargement...'
                    : 'Télécharger'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
