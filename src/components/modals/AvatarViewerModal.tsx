import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface AvatarViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
}

export const AvatarViewerModal: React.FC<AvatarViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      id="avatar-viewer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full flex flex-col items-center bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl p-5 border border-[#C7B7A3]/60 dark:border-zinc-700 shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="avatar-viewer-close-btn"
          onClick={onClose}
          aria-label="Fermer l'aperçu"
          className="absolute top-4 right-4 p-2 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-[#27272A] dark:text-[#FFF9EB] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Title / Subtitle if present */}
        {(title || subtitle) && (
          <div className="text-center mb-4 pr-8 pl-8">
            {title && (
              <h3 className="text-lg font-serif font-bold text-[#6D2932] dark:text-[#FFF9EB] truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Enlarged Photo */}
        <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-2xl overflow-hidden ring-4 ring-[#6D2932]/20 dark:ring-amber-500/20 shadow-xl bg-black/5 flex items-center justify-center">
          <img
            src={imageUrl}
            alt={title || 'Photo agrandie'}
            className="w-full h-full object-cover select-none"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Dismiss helper text */}
        <p className="text-[11px] text-[#27272A]/50 dark:text-zinc-500 mt-4">
          Cliquez en dehors ou appuyez sur Échap pour fermer
        </p>
      </div>
    </div>
  );
};
