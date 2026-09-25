import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Edit,
  Image as ImageIcon,
  Check,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crop
} from 'lucide-react';
import { Group } from '../../types';

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
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(group.name || '');
      setDescription(group.description || '');
      setCoverImage(group.coverImage || PRESET_COVERS[0]);
      setCroppingImage(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, group]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCroppingImage(reader.result);
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleApplyCrop = () => {
    if (!croppingImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 600;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      // Apply crop transformations
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(pan.x * (size / 260), pan.y * (size / 260));

      const aspect = img.width / img.height;
      let drawW = size;
      let drawH = size;
      if (aspect > 1) {
        drawW = size * aspect;
      } else {
        drawH = size / aspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCoverImage(croppedDataUrl);
      setCroppingImage(null);
    };
    img.src = croppingImage;
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

        {/* Interactive Image Cropper Overlay if a new photo is uploaded */}
        {croppingImage ? (
          <div className="p-4 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/60 border border-[#C7B7A3] dark:border-zinc-700 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#5D0D18] dark:text-amber-200">
                <Crop className="w-4 h-4" />
                <span>Ajuster & Recadrer la photo du groupe</span>
              </div>
              <button
                type="button"
                onClick={() => setCroppingImage(null)}
                className="text-xs text-[#27272A]/70 dark:text-zinc-400 hover:underline cursor-pointer"
              >
                Annuler
              </button>
            </div>

            <p className="text-[11px] text-[#27272A]/70 dark:text-zinc-400">
              Glissez pour déplacer l'image et ajustez le zoom pour un rendu centré et net.
            </p>

            {/* Interactive Crop Viewport with Circular Mask */}
            <div className="relative w-full h-64 bg-black rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none flex items-center justify-center">
              <div
                className="absolute inset-0 flex items-center justify-center"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                <img
                  src={croppingImage}
                  alt="Ajustement de l'image"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                  draggable={false}
                />
              </div>

              {/* Viewport Circular & Square Guide Mask */}
              <div className="absolute inset-0 pointer-events-none border-[3px] border-[#FFF9EB]/80 rounded-full w-48 h-48 m-auto shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
            </div>

            {/* Zoom Slider & Reset */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-1">
                <ZoomOut className="w-4 h-4 text-[#5D0D18] dark:text-amber-300" />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-[#5D0D18]"
                />
                <ZoomIn className="w-4 h-4 text-[#5D0D18] dark:text-amber-300" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="p-1.5 rounded-lg bg-[#FFF9EB] dark:bg-zinc-700 text-xs font-bold text-[#5D0D18] dark:text-[#FFF9EB] hover:bg-white flex items-center gap-1 cursor-pointer"
                title="Réinitialiser le centrage"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Centrer</span>
              </button>
            </div>

            {/* Crop Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#C7B7A3]/40">
              <button
                type="button"
                onClick={() => setCroppingImage(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#E8D8C4] text-[#27272A] hover:bg-[#C7B7A3] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-5 py-1.5 rounded-xl text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Valider le cadrage</span>
              </button>
            </div>
          </div>
        ) : (
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
                  Photo du groupe
                </label>
                <label
                  htmlFor="edit-group-file-upload"
                  className="text-xs font-bold text-[#5D0D18] dark:text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importer & recadrer</span>
                </label>
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
              <div className="mb-2 relative h-32 rounded-2xl overflow-hidden border-2 border-[#5D0D18] shadow-sm bg-black/5">
                <img src={coverImage} alt="Aperçu de l'illustration" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                  Aperçu actuel
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
        )}
      </div>
    </div>
  );
};
