'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

interface ImageZoomModalProps {
  onClose: () => void;
  imageUrl: string;
  altText: string;
}

export default function ImageZoomModal({ onClose, imageUrl, altText }: ImageZoomModalProps) {
  // Parent conditionally renders this component and uses key={} to force remount
  // on each open, so all state starts fresh — no reset logic needed.
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasTransition, setHasTransition] = useState(true);
  const [showHint, setShowHint] = useState(true);

  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Pinch-to-zoom refs
  const initialPinchDistance = useRef(0);
  const scaleAtPinchStart = useRef(1);

  // Interaction tracking — prevents close after zoom/pan/pinch gestures
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const interactionCooldown = useRef(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Drag-ready flags — set on pointer down, cleared on up
  const mouseDownReady = useRef(false);
  const touchDownReady = useRef(false);

  // Refs mirroring state for native event listeners (avoid stale closures)
  const isDraggingRef = useRef(false);
  const scaleRef = useRef(1);

  // Set a cooldown that blocks close for a short period after zoom/pan activity
  const startCooldown = useCallback(() => {
    interactionCooldown.current = true;
    clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => {
      interactionCooldown.current = false;
    }, 300);
  }, []);

  // Keep refs in sync with state for native event listeners
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // Auto-hide hint after 5 seconds
  useEffect(() => {
    if (!showHint) return;
    const hideTimer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(hideTimer);
  }, [showHint]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(cooldownTimer.current);
  }, []);

  // Lock body scroll (component only mounts when open)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Desktop: wheel zoom — native listener for passive:false
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      startCooldown();
      setHasTransition(true);
      setScale(prev => {
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        const newScale = Math.min(Math.max(prev + delta, 1), 4);
        if (newScale <= 1) {
          setTranslate({ x: 0, y: 0 });
        }
        return newScale;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [startCooldown]);

  // Mobile: touchmove — native listener for passive:false (preventDefault required)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        // Pinch zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const pinchScale = distance / initialPinchDistance.current;
        const newScale = Math.min(Math.max(scaleAtPinchStart.current * pinchScale, 1), 4);
        setScale(newScale);
        startCooldown();
        if (newScale <= 1) {
          setTranslate({ x: 0, y: 0 });
        }
      } else if (e.touches.length === 1) {
        // Start drag only once finger actually moves
        if (touchDownReady.current && !isDraggingRef.current) {
          const dx = e.touches[0].clientX - dragStart.current.x;
          const dy = e.touches[0].clientY - dragStart.current.y;
          if (Math.sqrt(dx * dx + dy * dy) >= 3) {
            setIsDragging(true);
            isDraggingRef.current = true;
            setHasTransition(false);
            startCooldown();
          }
          return;
        }
        if (!isDraggingRef.current) return;
        const dx = e.touches[0].clientX - dragStart.current.x;
        const dy = e.touches[0].clientY - dragStart.current.y;
        setTranslate({
          x: translateStart.current.x + dx / scaleRef.current,
          y: translateStart.current.y + dy / scaleRef.current,
        });
      }
    };

    container.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    return () => container.removeEventListener('touchmove', handleNativeTouchMove);
  }, [startCooldown]);

  // --- Pointer down: record position for all interactions ---
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  // --- Pointer up: close only on clean tap (no drag, no zoom, no cooldown) ---
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Don't close during cooldown (just finished zooming/pinching)
    if (interactionCooldown.current) return;
    // Don't close if currently dragging
    if (isDragging) return;
    // Don't close if pointer moved significantly (was a drag)
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) >= 5) return;
    // Clean tap — close the modal
    onClose();
  }, [isDragging, onClose]);

  // --- Mouse handlers (desktop drag-to-pan) ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    mouseDownReady.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
  }, [scale, translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Start dragging only once mouse actually moves (not on click)
    if (mouseDownReady.current && !isDragging) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.sqrt(dx * dx + dy * dy) >= 3) {
        setIsDragging(true);
        setHasTransition(false);
        startCooldown();
      }
      return;
    }
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTranslate({
      x: translateStart.current.x + dx / scale,
      y: translateStart.current.y + dy / scale,
    });
  }, [isDragging, scale, startCooldown]);

  const handleMouseUp = useCallback(() => {
    mouseDownReady.current = false;
    if (isDragging) {
      setIsDragging(false);
      setHasTransition(true);
      startCooldown();
    }
  }, [isDragging, startCooldown]);

  // --- Touch handlers (mobile drag + pinch-to-zoom) ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      touchDownReady.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
      scaleAtPinchStart.current = scale;
      setHasTransition(false);
      startCooldown();
    } else if (e.touches.length === 1 && scale > 1) {
      // Ready to drag — but don't start until actual movement
      touchDownReady.current = true;
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      translateStart.current = { ...translate };
    }
  }, [scale, translate, startCooldown]);

  const handleTouchEnd = useCallback(() => {
    touchDownReady.current = false;
    if (isDragging) {
      setIsDragging(false);
      isDraggingRef.current = false;
      setHasTransition(true);
      startCooldown();
    }
    initialPinchDistance.current = 0;
  }, [isDragging, startCooldown]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] animate-backdrop-fade"
      role="dialog"
      aria-modal="true"
      aria-label="Zoomed image view"
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-[101] w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-colors"
        aria-label="Close"
      >
        <X size={22} />
      </button>

      {/* Zoomable image container — fills entire modal */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center p-4 sm:p-8"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Entrance animation wrapper — separate from zoom transform
            so CSS animation doesn't override inline transform */}
        <div className="relative w-full h-full max-w-6xl animate-zoom-modal-enter">
          {/* Zoom/pan transform div */}
          <div
            className={`relative w-full h-full ${
              scale > 1
                ? isDragging ? 'cursor-grabbing' : 'cursor-grab'
                : 'cursor-default'
            }`}
            style={{
              transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`,
              willChange: 'transform',
              transition: hasTransition ? 'transform 0.15s ease-out' : 'none',
            }}
          >
            <Image
              src={imageUrl}
              alt={altText}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        </div>
      </div>

      {/* Usage hint — shows briefly on first few opens */}
      {showHint && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[101] pointer-events-none animate-zoom-hint">
          <div className="bg-black/60 backdrop-blur-sm text-white/80 text-xs px-4 py-2 rounded-full whitespace-nowrap">
            <span className="hidden sm:inline">Scroll to zoom &middot; Drag to pan</span>
            <span className="sm:hidden">Pinch to zoom &middot; Drag to pan</span>
          </div>
        </div>
      )}
    </div>
  );
}
