import React from 'react';

export const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🍕', '😊', '🙏', '🛵', '✅', '🎉', '👌', '😋', '⏱️'];
export const MESSAGE_REACTIONS = ['👍', '❤️', '🔥', '🍕', '🙏'];

/**
 * Renderiza formato nativo de WhatsApp (*negrita*, _cursiva_, ~tachado~, `código` y URLs clicables)
 * de forma segura en React sin dangerouslySetInnerHTML.
 */
export const FormattedWhatsAppText: React.FC<{ text: string; isLightBubble?: boolean }> = ({
  text,
  isLightBubble = false,
}) => {
  if (!text) return null;
  const tokenRegex = /(https?:\/\/[^\s]+|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`)/g;
  const parts = text.split(tokenRegex);

  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;
        if (/^https?:\/\/[^\s]+$/.test(part)) {
          return (
            <a
              key={idx}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline underline-offset-2 break-all ${
                isLightBubble ? 'text-sky-600 dark:text-sky-400' : 'text-white/95'
              }`}
            >
              {part}
            </a>
          );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return (
            <strong key={idx} className="font-bold">
              {part.slice(1, -1)}
            </strong>
          );
        }
        if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
          return (
            <em key={idx} className="italic">
              {part.slice(1, -1)}
            </em>
          );
        }
        if (part.startsWith('~') && part.endsWith('~') && part.length > 2) {
          return (
            <del key={idx} className="line-through opacity-80">
              {part.slice(1, -1)}
            </del>
          );
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code
              key={idx}
              className="px-1 py-0.5 rounded bg-black/15 font-mono text-[12px]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
};

export function getDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function formatDateSeparator(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const todayKey = getDateKey(now.toISOString());
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const yestKey = getDateKey(yest.toISOString());
  const targetKey = getDateKey(iso);
  if (targetKey === todayKey) return 'Hoy';
  if (targetKey === yestKey) return 'Ayer';
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getMeta24hWindowStatus(lastCustomerIso?: string): {
  isOpen: boolean;
  label: string;
} {
  if (!lastCustomerIso) {
    return { isOpen: false, label: 'Sin mensaje del cliente (usar plantilla)' };
  }
  const diffMs = 24 * 60 * 60 * 1000 - (Date.now() - Date.parse(lastCustomerIso));
  if (diffMs <= 0) {
    return { isOpen: false, label: 'Ventana 24h expirada (usar plantilla)' };
  }
  const hrs = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  return {
    isOpen: true,
    label: hrs > 0 ? `${hrs}h ${mins}m ventana 24h` : `${mins}m ventana 24h`,
  };
}

export function playSubtleInboxChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch {
    // ignore autoplay restriction
  }
}

export function detectMediaTypeFromFile(file: File): 'image' | 'video' | 'audio' | 'document' {
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}
