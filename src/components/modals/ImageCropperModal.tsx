import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [cropBoxSize, setCropBoxSize] = useState<{ width: number; height: number }>({ width: 450, height: 150 });

  const cropBoxRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef<number>(1.0);

  // Exact target aspect ratio definition:
  // Banner: Exact wide panoramic format (3:1)
  // Event: Wide card format (2:1)
  const isBanner = aspectRatioType === 'banner';
  const targetAspect = isBanner ? 3.0 : 2.0;
  const canvasWidth = 1200;
  const canvasHeight = Math.round(canvasWidth / targetAspect); // 400 for banner (3:1), 600 for event (2:1)

  // Measure crop box DOM dimensions accurately
  const updateCropBoxDimensions = useCallback(() => {
    if (cropBoxRef.current) {
      const rect = cropBoxRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCropBoxSize({
          width: rect.width,
          height: rect.height,
        });
      }
    }
  }, []);

  // Calculate base dimensions in "cover" mode at zoom = 1.0 (fills crop box completely with 0 empty bands)
  const getBaseCoverDimensions = useCallback(
    (boxW: number, boxH: number, natW: number, natH: number) => {
      if (!natW || !natH || !boxW || !boxH) {
        return { baseWidth: boxW, baseHeight: boxH };
      }
      const imgAspect = natW / natH;
      let baseWidth = boxW;
      let baseHeight = boxH;

      if (imgAspect >= targetAspect) {
        // Image is wider than crop box: match height to box, width overflows
        baseHeight = boxH;
        baseWidth = boxH * imgAspect;
      } else {
        // Image is taller than crop box: match width to box, height overflows
        baseWidth = boxW;
        baseHeight = boxW / imgAspect;
      }

      return { baseWidth, baseHeight };
    },
    [targetAspect]
  );

  const { baseWidth, baseHeight } = getBaseCoverDimensions(
    cropBoxSize.width,
    cropBoxSize.height,
    naturalSize.width,
    naturalSize.height
  );

  // Max pan calculations ensuring image always fully covers the crop box
  const getMaxPan = useCallback(
    (currentZoom: number) => {
      const currentW = baseWidth * currentZoom;
      const currentH = baseHeight * currentZoom;
      const maxPanX = Math.max(0, (currentW - cropBoxSize.width) / 2);
      const maxPanY = Math.max(0, (currentH - cropBoxSize.height) / 2);
      return { maxPanX, maxPanY };
    },
    [baseWidth, baseHeight, cropBoxSize]
  );

  // Clamp pan within permissible bounds
  const clampPan = useCallback(
    (x: number, y: number, currentZoom: number) => {
      const { maxPanX, maxPanY } = getMaxPan(currentZoom);
      return {
        x: Math.min(Math.max(x, -maxPanX), maxPanX),
        y: Math.min(Math.max(y, -maxPanY), maxPanY),
      };
    },
    [getMaxPan]
  );

  // Handle zoom changes and adjust pan accordingly
  const handleZoomChange = useCallback(
    (newZoomVal: number) => {
      const clampedZoom = Math.min(Math.max(1.0, newZoomVal), 3.5);
      setZoom(clampedZoom);
      setPan((prevPan) => clampPan(prevPan.x, prevPan.y, clampedZoom));
    },
    [clampPan]
  );

  // Reset & load image on source change / modal opening
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);

      const img = new Image();
      img.onload = () => {
        setNaturalSize({
          width: img.naturalWidth || img.width || 800,
          height: img.naturalHeight || img.height || 600,
        });
        setTimeout(updateCropBoxDimensions, 50);
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc, updateCropBoxDimensions]);

  // Handle resize
  useEffect(() => {
    if (!isOpen) return;
    updateCropBoxDimensions();
    window.addEventListener('resize', updateCropBoxDimensions);
    return () => window.removeEventListener('resize', updateCropBoxDimensions);
  }, [isOpen, updateCropBoxDimensions]);

  if (!isOpen || !imageSrc) return null;

  // Mouse Drag Events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    panStartPos.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    const nextX = panStartPos.current.x + dx;
    const nextY = panStartPos.current.y + dy;
    setPan(clampPan(nextX, nextY, zoom));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Events (1-finger pan, 2-finger pinch zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartPos.current = { ...pan };
      pinchStartDist.current = null;
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDist.current = dist;
      pinchStartZoom.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartPos.current.x;
      const dy = e.touches[0].clientY - dragStartPos.current.y;
      const nextX = panStartPos.current.x + dx;
      const nextY = panStartPos.current.y + dy;
      setPan(clampPan(nextX, nextY, zoom));
    } else if (e.touches.length === 2 && pinchStartDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / pinchStartDist.current;
      handleZoomChange(pinchStartZoom.current * scaleFactor);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartDist.current = null;
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0015;
    handleZoomChange(zoom + zoomDelta);
  };

  // Pixel-perfect High-Res Canvas Export (1:1 with DOM representation)
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

      // Background fill
      ctx.fillStyle = '#18181B';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Sizing ratio from DOM crop box to Canvas target resolution
      const scaleToCanvas = canvasWidth / cropBoxSize.width;

      // Image rendered dimensions at high canvas resolution
      const renderCanvasWidth = baseWidth * zoom * scaleToCanvas;
      const renderCanvasHeight = baseHeight * zoom * scaleToCanvas;

      // Image center in Canvas coordinate space
      const canvasCenterX = canvasWidth / 2 + pan.x * scaleToCanvas;
      const canvasCenterY = canvasHeight / 2 + pan.y * scaleToCanvas;

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw exactly what was seen inside the crop box
      ctx.drawImage(
        img,
        canvasCenterX - renderCanvasWidth / 2,
        canvasCenterY - renderCanvasHeight / 2,
        renderCanvasWidth,
        renderCanvasHeight
      );

      ctx.restore();

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.94);
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
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E8D8C4] dark:bg-zinc-800 text-[#5D0D18] dark:text-amber-200">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#5D0D18] dark:text-[#FFF9EB] font-serif">
                {title}
              </h3>
              <p className="text-xs text-[#27272A]/70 dark:text-zinc-400">
                {subtitle || (isBanner ? 'Format 3:1 exact de la bannière Outlys' : 'Format 2:1 adapté aux événements')}
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
              Glissez l'image pour cadrer la portion souhaitée
            </span>
            <span className="font-semibold text-[#5D0D18] dark:text-amber-200">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Viewport Box Container */}
          <div
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-full h-64 sm:h-72 bg-zinc-950 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none flex items-center justify-center border border-zinc-800 touch-none"
          >
            {/* Exact Crop Mask Box Overlay */}
            <div
              ref={cropBoxRef}
              className={`relative overflow-hidden pointer-events-none rounded-xl border-2 border-[#FFF9EB] ring-2 ring-[#5D0D18]/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] ${
                isBanner
                  ? 'w-[94%] max-w-[500px] aspect-[3/1]'
                  : 'w-[88%] max-w-[440px] aspect-[2/1]'
              }`}
            >
              {/* Scalable & Positioned Image inside Crop Box Frame */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src={imageSrc}
                  alt="Aperçu recadrage"
                  style={{
                    width: `${baseWidth * zoom}px`,
                    height: `${baseHeight * zoom}px`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    transform: `translate(${pan.x}px, ${pan.y}px)`,
                    transformOrigin: 'center center',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                  draggable={false}
                />
              </div>

              {/* Rule of Thirds Grid Overlay */}
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
              onClick={() => handleZoomChange(zoom - 0.15)}
              className="p-1.5 rounded-lg hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 text-[#5D0D18] dark:text-amber-300 cursor-pointer"
              title="Dézoomer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1.0"
              max="3.5"
              step="0.01"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="flex-1 accent-[#5D0D18] h-1.5 bg-[#C7B7A3]/50 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.15)}
              className="p-1.5 rounded-lg hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 text-[#5D0D18] dark:text-amber-300 cursor-pointer"
              title="Zoomer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
            className="px-3 py-1.5 rounded-xl bg-[#E8D8C4]/60 dark:bg-zinc-800 text-xs font-bold text-[#5D0D18] dark:text-[#FFF9EB] hover:bg-[#E8D8C4] dark:hover:bg-zinc-700 flex items-center gap-1.5 cursor-pointer border border-[#C7B7A3]/50 dark:border-zinc-700 transition-colors shrink-0"
            title="Recentrer et réinitialiser le zoom"
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
