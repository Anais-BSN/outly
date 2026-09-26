import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Crop,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Sparkles,
} from 'lucide-react';

export type CropAspectRatio = 'banner' | 'event';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  aspectRatioType?: CropAspectRatio; // 'banner' (3:1) or 'event' (2:1)
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onApplyCrop: (croppedDataUrl: string) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  aspectRatioType = 'banner',
  title = 'Ajuster et recadrer la photo',
  subtitle,
  onClose,
  onApplyCrop,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cropBoxRef = useRef<HTMLDivElement>(null);

  // Ratio definitions:
  // Banner: Exact wide panoramic format (3:1)
  // Event: Wide card format (2:1)
  const isBanner = aspectRatioType === 'banner';
  const targetAspect = isBanner ? 3.0 : 2.0;
  const canvasWidth = 1200;
  const canvasHeight = Math.round(canvasWidth / targetAspect); // 400 for banner, 600 for event

  // Load natural image size on source change
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);

      const img = new Image();
      img.onload = () => {
        setImgNaturalSize({
          width: img.naturalWidth || img.width || 800,
          height: img.naturalHeight || img.height || 600,
        });
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
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

  // Touch drag handlers
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

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(0.6, prev + zoomDelta), 4));
  };

  const handleApply = () => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill background
      ctx.fillStyle = '#18181B';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Measure exact crop box in DOM
      const boxRect = cropBoxRef.current?.getBoundingClientRect();
      const domBoxW = boxRect?.width || 450;
      const domBoxH = boxRect?.height || (domBoxW / targetAspect);

      // Scale factor from DOM crop box to target high-res Canvas
      const scaleToCanvas = canvasWidth / domBoxW;

      // Calculate the base displayed dimensions of the image in the DOM viewport
      const natW = img.naturalWidth || img.width;
      const natH = img.naturalHeight || img.height;
      const natAspect = natW / natH;

      // Image size at zoom=1 in DOM: fits without distortion
      let baseW = domBoxW;
      let baseH = domBoxH;
      if (natAspect > targetAspect) {
        // Image is wider than crop box
        baseW = domBoxW;
        baseH = domBoxW / natAspect;
      } else {
        // Image is taller than crop box
        baseH = domBoxH;
        baseW = domBoxH * natAspect;
      }

      // Draw onto canvas with identical transform
      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.translate(pan.x * scaleToCanvas, pan.y * scaleToCanvas);
      ctx.scale(zoom, zoom);

      const renderW = baseW * scaleToCanvas;
      const renderH = baseH * scaleToCanvas;

      ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
      ctx.restore();

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      onApplyCrop(croppedDataUrl);
      onClose();
    };
    img.src = imageSrc;
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="image-cropper-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="image-cropper-modal-card"
        className="relative w-full max-w-xl bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[95vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#E8D8C4] dark:bg-zinc-800 text-[#5D0D18] dark:text-amber-200">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
                {title}
              </h3>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
                {subtitle || (isBanner ? 'Format panoramique étiré exact de la bannière' : 'Format adapté aux événements')}
              </p>
            </div>
          </div>
          <button
            id="image-cropper-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Cropping Viewport */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#27272A]/70 dark:text-zinc-400">
            <span className="flex items-center gap-1 font-medium">
              <Move className="w-3.5 h-3.5 text-[#5D0D18] dark:text-amber-300" />
              Déplacez l'image librement pour cadrer la portion voulue
            </span>
            <span className="font-semibold text-[#5D0D18] dark:text-amber-200">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Canvas Viewport Container */}
          <div
            onWheel={handleWheel}
            className="relative w-full h-64 sm:h-72 bg-zinc-950 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none flex items-center justify-center border border-zinc-800"
          >
            {/* Movable & Scalable Image Layer */}
            <div
              className="absolute inset-0 flex items-center justify-center touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              <img
                src={imageSrc}
                alt="Image source"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  maxWidth: isBanner ? '90%' : '85%',
                  maxHeight: '85%',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
                draggable={false}
              />
            </div>

            {/* Exact Crop Mask Box Overlay */}
            <div
              ref={cropBoxRef}
              className={`absolute pointer-events-none border-2 border-[#FFF9EB] rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] ring-2 ring-[#5D0D18]/80 m-auto ${
                isBanner
                  ? 'w-[92%] max-w-[480px] aspect-[3/1]'
                  : 'w-[88%] max-w-[420px] aspect-[2/1]'
              }`}
            >
              {/* Rule of Thirds Grid */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>
            </div>
          </div>
        </div>

        {/* Zoom & Adjustment Controls */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(0.6, prev - 0.15))}
              className="p-1 rounded-lg hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 text-[#5D0D18] dark:text-amber-300 cursor-pointer"
              title="Dézoomer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.6"
              max="3.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#5D0D18] h-1.5 bg-[#C7B7A3]/50 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3.5, prev + 0.15))}
              className="p-1 rounded-lg hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 text-[#5D0D18] dark:text-amber-300 cursor-pointer"
              title="Zoomer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="px-2.5 py-1.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 text-xs font-bold text-[#5D0D18] dark:text-[#FFF9EB] hover:bg-[#E8D8C4] dark:hover:bg-zinc-700 flex items-center gap-1.5 cursor-pointer border border-[#C7B7A3]/50 dark:border-zinc-700 transition-colors"
            title="Recentrer et afficher sans zoom forcé"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#C7B7A3]/40 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-bold bg-[#E8D8C4] dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300 hover:bg-[#C7B7A3] dark:hover:bg-zinc-700 transition-all cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            id="image-cropper-confirm-btn"
            onClick={handleApply}
            className="px-5 py-2 rounded-full text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Valider le cadrage</span>
          </button>
        </div>
      </div>
    </div>
  );
};
