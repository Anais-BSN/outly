import React from 'react';
import { X, Download, Trash2 } from 'lucide-react';
import { GalleryItem, UserProfile, GroupMember } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface ImageViewerModalProps {
  item: GalleryItem | null;
  onClose: () => void;
  onDeleteImage?: (item: GalleryItem) => void;
  currentUser?: UserProfile;
  members?: GroupMember[];
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  item,
  onClose,
  onDeleteImage,
  currentUser,
  members = [],
}) => {
  if (!item) return null;

  const canDelete =
    Boolean(currentUser) &&
    (item.uploaderId === currentUser?.id ||
      members.some(
        (m) =>
          (m.userId === currentUser?.id || m.id === currentUser?.id) &&
          m.role === 'admin'
      ));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative max-w-4xl w-full flex flex-col items-center">
        {/* Close Button */}
        <button
          id="image-viewer-close-btn"
          onClick={onClose}
          className="absolute -top-10 right-0 sm:right-2 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Main Image */}
        <div className="w-full max-h-[75vh] flex items-center justify-center rounded-2xl overflow-hidden bg-black/40 shadow-2xl">
          <img
            src={item.imageUrl}
            alt={item.caption || 'Image'}
            className="max-h-[75vh] w-auto object-contain rounded-xl"
          />
        </div>

        {/* Footer info banner */}
        <div className="w-full mt-3 p-3.5 rounded-2xl bg-[#FFF9EB] dark:bg-[#27272A] border border-[#C7B7A3]/60 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div>
            {item.caption && (
              <p className="text-sm font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                {item.caption}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-[#27272A]/70 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <img
                  src={item.uploaderAvatar}
                  alt={item.uploaderName}
                  className="w-4 h-4 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span>Ajouté par <strong>{item.uploaderName}</strong></span>
              </div>
              <span>•</span>
              <span>{formatDateTime(item.timestamp)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {canDelete && onDeleteImage && (
              <button
                id="image-viewer-delete-btn"
                onClick={() => {
                  if (window.confirm('Voulez-vous vraiment supprimer cette photo de la galerie ?')) {
                    onDeleteImage(item);
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Supprimer la photo"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer</span>
              </button>
            )}

            <a
              href={item.imageUrl}
              download={`outly-photo-${item.id}.jpg`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-[#6D2932] text-[#FFF9EB] text-xs font-bold hover:bg-[#541C24] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

