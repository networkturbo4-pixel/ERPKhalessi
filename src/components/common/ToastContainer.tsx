import React, { useState, useRef, useEffect } from 'react';
import { useSettings, ToastItem } from '../../context/SettingsContext';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Flame,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  Pin,
} from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const {
    toasts,
    removeToast,
    clearAllToasts,
    customization,
    noticeModal,
    showUnsavedModal,
  } = useSettings();

  const [isExpanded, setIsExpanded] = useState(false);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const pointerStartX = useRef<number | null>(null);

  // Auto-collapse stack when 1 or 0 toasts remain
  useEffect(() => {
    if (toasts.length <= 1) {
      setIsExpanded(false);
    }
  }, [toasts.length]);

  const latestAnnouncement = toasts[0]
    ? `${toasts[0].title}. ${toasts[0].message}`
    : '';

  // Per modern-web-guidance: suppress background toast clutter while a modal dialog is open
  const isModalBlocking = Boolean(noticeModal || showUnsavedModal);

  const getPositionClasses = () => {
    switch (customization.toastPosition) {
      case 'top-center':
        return 'top-3 sm:top-5 left-1/2 -translate-x-1/2 items-center';
      case 'bottom-right':
        return 'bottom-[calc(5.75rem+env(safe-area-inset-bottom))] sm:bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 sm:items-end items-center';
      case 'bottom-center':
        return 'bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:bottom-5 left-1/2 -translate-x-1/2 items-center';
      case 'top-right':
      default:
        return 'top-3 sm:top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 sm:items-end items-center';
    }
  };

  const isBottom =
    customization.toastPosition === 'bottom-right' ||
    customization.toastPosition === 'bottom-center';

  const getToneVisuals = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return {
          halo: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.22)]',
          bar: 'bg-emerald-400',
          borderLeft: 'border-l-emerald-500',
          icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
        };
      case 'critical':
        return {
          halo: 'border-rose-500/50 bg-rose-500/20 text-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.32)]',
          bar: 'bg-rose-400',
          borderLeft: 'border-l-rose-500',
          icon: <Flame className="h-4 w-4 shrink-0" />,
        };
      case 'error':
        return {
          halo: 'border-rose-500/40 bg-rose-500/15 text-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.22)]',
          bar: 'bg-rose-400',
          borderLeft: 'border-l-rose-500',
          icon: <XCircle className="h-4 w-4 shrink-0" />,
        };
      case 'warning':
        return {
          halo: 'border-amber-500/40 bg-amber-500/15 text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.22)]',
          bar: 'bg-amber-400',
          borderLeft: 'border-l-amber-500',
          icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
        };
      case 'info':
      default:
        return {
          halo: 'border-sky-500/40 bg-sky-500/15 text-sky-400 shadow-[0_0_16px_rgba(14,165,233,0.22)]',
          bar: 'bg-sky-400',
          borderLeft: 'border-l-sky-500',
          icon: <Info className="h-4 w-4 shrink-0" />,
        };
    }
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if ((e.target as HTMLElement).closest('button')) return;
    pointerStartX.current = e.clientX;
    setSwipingId(id);
    setSwipeX(0);
  };

  const handlePointerMove = (e: React.PointerEvent, id: string) => {
    if (swipingId !== id || pointerStartX.current === null) return;
    const delta = e.clientX - pointerStartX.current;
    setSwipeX(delta);
  };

  const handlePointerUp = (id: string) => {
    if (swipingId !== id) return;
    if (Math.abs(swipeX) > 75) {
      removeToast(id);
    }
    pointerStartX.current = null;
    setSwipingId(null);
    setSwipeX(0);
  };

  const stackingEnabled = customization.toastStacking !== false;
  const visibleToasts = stackingEnabled && !isExpanded ? toasts.slice(0, 3) : toasts.slice(0, 5);
  const extraCount = Math.max(0, toasts.length - 1);

  const renderSingleToastBody = (toast: ToastItem, idx: number) => {
    const tone = getToneVisuals(toast.type);
    const variant = customization.toastVariant || 'island';
    const isFront = idx === 0;
    const activeSwipeOffset = swipingId === toast.id ? swipeX : 0;

    // 3D Stacking transform when collapsed
    let stackStyle: React.CSSProperties = {
      transform: `translateX(${activeSwipeOffset}px)`,
      opacity: activeSwipeOffset !== 0 ? Math.max(0.25, 1 - Math.abs(activeSwipeOffset) / 180) : 1,
    };

    if (stackingEnabled && !isExpanded && idx > 0) {
      const ySign = isBottom ? -1 : 1;
      const translateY = idx * 14 * ySign;
      const scale = 1 - idx * 0.055;
      const opacity = idx === 1 ? 0.68 : 0.38;
      stackStyle = {
        position: 'absolute',
        top: isBottom ? undefined : 0,
        bottom: isBottom ? 0 : undefined,
        left: 0,
        right: 0,
        zIndex: 30 - idx,
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity,
        pointerEvents: 'none',
        filter: 'blur(0.4px)',
      };
    } else {
      stackStyle.zIndex = 30 - idx;
    }

    // Variant 1 (Default): Dynamic Island / Pila 3D (matches Image 1)
    if (variant === 'island' || variant === 'pill') {
      return (
        <div
          key={toast.id}
          style={stackStyle}
          onPointerDown={e => handlePointerDown(e, toast.id)}
          onPointerMove={e => handlePointerMove(e, toast.id)}
          onPointerUp={() => handlePointerUp(toast.id)}
          onPointerCancel={() => handlePointerUp(toast.id)}
          className={`pointer-events-auto w-full max-w-[430px] rounded-[28px] bg-[#0d0e12]/95 dark:bg-[#0b0c10]/95 text-white px-3.5 py-2.5 shadow-[0_18px_42px_rgba(0,0,0,0.45)] ring-1 ${
            toast.type === 'critical'
              ? 'ring-rose-500/50'
              : 'ring-white/12'
          } backdrop-blur-xl transition-all duration-300 ease-out select-none cursor-grab active:cursor-grabbing flex items-center justify-between gap-3`}
        >
          {/* Left Halo Status Icon + Text */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`h-9 w-9 rounded-full border flex items-center justify-center shrink-0 ${tone.halo}`}
            >
              {tone.icon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-bold text-white leading-snug truncate">
                  {toast.title}
                </p>
                {toast.pinned && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-500/25 text-rose-300 border border-rose-500/40 shrink-0">
                    <Pin className="h-2.5 w-2.5" /> Fijada
                  </span>
                )}
              </div>
              {toast.message && (
                <p className="text-[11px] text-zinc-300/90 leading-tight truncate mt-0.5">
                  {toast.message}
                </p>
              )}
            </div>
          </div>

          {/* Right Sensory Equalizer + 3D Stack Counter Pill + Close */}
          <div className="flex items-center gap-2 shrink-0">
            {customization.toastAudioTheme !== 'silent' && isFront && (
              <div
                className="flex items-center gap-[2.5px] h-3.5 px-1"
                aria-hidden="true"
              >
                <span className={`w-[2px] h-3 rounded-full ${tone.bar} animate-eq-1`} />
                <span className={`w-[2px] h-3.5 rounded-full ${tone.bar} animate-eq-2`} />
                <span className={`w-[2px] h-2.5 rounded-full ${tone.bar} animate-eq-3`} />
              </div>
            )}

            {stackingEnabled && isFront && extraCount > 0 && (
              <button
                type="button"
                onClick={() => setIsExpanded(prev => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/12 hover:bg-white/20 text-[11px] font-bold text-white transition-colors whitespace-nowrap"
                title={isExpanded ? 'Contraer pila 3D' : `Expandir ${extraCount} alertas más`}
              >
                <Layers className="h-3 w-3 text-zinc-300" />
                <span>+{extraCount}</span>
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3 text-zinc-300" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-zinc-300" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Cerrar notificación"
              className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      );
    }

    // Variant 2: Bordered / Card / Minimal (also stacked cleanly in 3D!)
    const isBordered = variant === 'bordered';
    const isMinimal = variant === 'minimal';

    return (
      <div
        key={toast.id}
        style={stackStyle}
        onPointerDown={e => handlePointerDown(e, toast.id)}
        onPointerMove={e => handlePointerMove(e, toast.id)}
        onPointerUp={() => handlePointerUp(toast.id)}
        onPointerCancel={() => handlePointerUp(toast.id)}
        className={`pointer-events-auto w-full max-w-[420px] bg-white/95 dark:bg-[#1a1b20]/95 backdrop-blur-xl rounded-2xl ${
          isMinimal ? 'px-3.5 py-2.5' : 'p-3.5'
        } shadow-2xl border border-zinc-200 dark:border-zinc-700 ${
          isBordered ? `border-l-4 ${tone.borderLeft}` : ''
        } flex items-center justify-between gap-3 transition-all duration-300 select-none cursor-grab active:cursor-grabbing`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`h-8 w-8 rounded-full border flex items-center justify-center shrink-0 ${tone.halo}`}>
            {tone.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
              {toast.title}
            </p>
            {!isMinimal && toast.message && (
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate mt-0.5">
                {toast.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {stackingEnabled && isFront && extraCount > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 whitespace-nowrap"
            >
              <Layers className="h-3 w-3" /> +{extraCount}
            </button>
          )}
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            aria-label="Cerrar notificación"
            className="h-6 w-6 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-800 dark:hover:text-white flex items-center justify-center"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Pre-populated screen reader live region (per modern-web-guidance) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {latestAnnouncement ? `Notificación del sistema: ${latestAnnouncement}` : ''}
      </div>

      {toasts.length > 0 && !isModalBlocking && (
        <div
          role="region"
          aria-label="Notificaciones del sistema"
          className={`fixed z-50 flex flex-col w-[calc(100%-1.75rem)] sm:w-full max-w-[430px] pointer-events-none transition-all duration-300 ${getPositionClasses()}`}
        >
          <div
            className={`relative w-full flex flex-col ${
              isExpanded || !stackingEnabled ? 'gap-2.5' : 'pb-7'
            }`}
          >
            {visibleToasts.map((toast, idx) => renderSingleToastBody(toast, idx))}
          </div>

          {/* Quick Collapse / Clear Action Bar when stack is expanded */}
          {stackingEnabled && isExpanded && toasts.length > 1 && (
            <div className="pointer-events-auto mt-1.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 text-zinc-200 text-[11px] font-medium border border-white/10 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="hover:text-white transition-colors whitespace-nowrap"
              >
                Apilar en 3D
              </button>
              <span className="text-zinc-600">•</span>
              <button
                type="button"
                onClick={clearAllToasts}
                className="text-rose-400 hover:text-rose-300 font-semibold transition-colors whitespace-nowrap"
              >
                Descartar todas ({toasts.length})
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
