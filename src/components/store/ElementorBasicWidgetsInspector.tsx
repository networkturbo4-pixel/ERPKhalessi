import React, { useState } from 'react';
import {
  StoreBlock,
  TextBlockConfig,
  ParagraphBlockConfig,
  VideoBlockConfig,
  ImageBlockConfig,
  ButtonBlockConfig,
  BuilderViewport,
  BlockAdvancedOptions,
  BlockShadowSize,
  TextAlignOption,
  ParagraphAlignOption,
  ButtonIconOption,
} from '../../types/storeBuilder';
import { Product } from '../../types/catalog';
import { MediaGalleryModal } from '../media/MediaGalleryModal';
import { Monitor, Tablet, Smartphone, Image as ImageIcon, RotateCcw } from 'lucide-react';

interface BasicInspectorProps {
  block: StoreBlock;
  viewport: BuilderViewport;
  onChangeViewport: (vp: BuilderViewport) => void;
  products: Product[];
  onPatch: (partial: Partial<StoreBlock>) => void;
  renderAdvanced: (
    value: BlockAdvancedOptions,
    onChange: (next: BlockAdvancedOptions) => void
  ) => React.ReactNode;
}

const ViewportTabs: React.FC<{
  viewport: BuilderViewport;
  onChange: (vp: BuilderViewport) => void;
}> = ({ viewport, onChange }) => (
  <div className="flex items-center justify-between gap-2 p-1 rounded-xl bg-[#0d0f15] border border-[#252836]">
    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 pl-2">
      Vista
    </span>
    <div className="flex items-center gap-1">
      {(
        [
          ['desktop', 'PC', Monitor],
          ['tablet', 'Tablet', Tablet],
          ['mobile', 'Móvil', Smartphone],
        ] as const
      ).map(([vp, label, Icon]) => {
        const active = viewport === vp;
        return (
          <button
            key={vp}
            type="button"
            onClick={() => onChange(vp)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
              active
                ? 'bg-rose-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-[#1a1d28]'
            }`}
          >
            <Icon className="w-3 h-3" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

const ColorField: React.FC<{
  label: string;
  value?: string;
  fallback: string;
  onChange: (val: string) => void;
}> = ({ label, value, fallback, onChange }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="text-[10px] font-bold uppercase text-zinc-400">{label}</label>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          title="Restablecer automático"
          className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-0.5"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Auto
        </button>
      )}
    </div>
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value || fallback}
        onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded-lg bg-[#0d0f15] border border-[#282c3a] cursor-pointer p-0.5 shrink-0"
      />
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Auto"
        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-[11px] font-mono text-white focus:outline-none focus:border-rose-500"
      />
    </div>
  </div>
);

export const ElementorBasicWidgetsInspector: React.FC<BasicInspectorProps> = ({
  block,
  viewport,
  onChangeViewport,
  products,
  onPatch,
  renderAdvanced,
}) => {
  const [mediaTargetField, setMediaTargetField] = useState<
    null | 'src' | 'srcTablet' | 'srcMobile' | 'posterUrl'
  >(null);

  const vpSuffix = viewport === 'mobile' ? 'Mobile' : viewport === 'tablet' ? 'Tablet' : 'Desktop';

  if (block.type === 'text') {
    const blk = block as TextBlockConfig;
    const fontSizeKey = `fontSize${vpSuffix}` as 'fontSizeMobile' | 'fontSizeTablet' | 'fontSizeDesktop';
    const alignKey = `align${vpSuffix}` as 'alignMobile' | 'alignTablet' | 'alignDesktop';
    const maxWKey = `maxWidth${vpSuffix}` as 'maxWidthMobile' | 'maxWidthTablet' | 'maxWidthDesktop';

    return (
      <>
        <ViewportTabs viewport={viewport} onChange={onChangeViewport} />

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Antetítulo / Eyebrow (Opcional)
            </label>
            <input
              type="text"
              value={blk.eyebrow || ''}
              onChange={e => onPatch({ eyebrow: e.target.value })}
              placeholder="Ej: NUEVO LANZAMIENTO"
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Texto del Título
            </label>
            <textarea
              rows={2}
              value={blk.text}
              onChange={e => onPatch({ text: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white focus:outline-none focus:border-rose-500 resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Etiqueta HTML
              </label>
              <select
                value={blk.tag}
                onChange={e => onPatch({ tag: e.target.value as TextBlockConfig['tag'] })}
                className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="h1">H1 (Principal)</option>
                <option value="h2">H2 (Sección)</option>
                <option value="h3">H3 (Subtítulo)</option>
                <option value="h4">H4 (Compacto)</option>
                <option value="p">Texto normal</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Peso
              </label>
              <select
                value={blk.fontWeight}
                onChange={e =>
                  onPatch({ fontWeight: Number(e.target.value) as TextBlockConfig['fontWeight'] })
                }
                className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value={500}>Medium (500)</option>
                <option value={600}>SemiBold (600)</option>
                <option value={700}>Bold (700)</option>
                <option value={800}>ExtraBold (800)</option>
                <option value={900}>Black (900)</option>
              </select>
            </div>
          </div>

          {/* Responsive per-viewport controls */}
          <div className="p-3 rounded-xl bg-[#161821] border border-[#262938] space-y-2.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Ajustes en {viewport === 'mobile' ? 'Móvil' : viewport === 'tablet' ? 'Tablet' : 'PC'}
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-zinc-400">Tamaño</label>
                  <span className="text-[10px] font-mono text-zinc-300">{blk[fontSizeKey]}px</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={72}
                  value={blk[fontSizeKey]}
                  onChange={e => onPatch({ [fontSizeKey]: Number(e.target.value) || 16 })}
                  className="w-full accent-rose-500 cursor-pointer mb-1"
                />
                <input
                  type="number"
                  min={12}
                  max={96}
                  value={blk[fontSizeKey]}
                  onChange={e =>
                    onPatch({ [fontSizeKey]: Math.max(12, Number(e.target.value) || 16) })
                  }
                  className="w-full px-2 py-1 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Alineación</label>
                <select
                  value={blk[alignKey]}
                  onChange={e => onPatch({ [alignKey]: e.target.value as TextAlignOption })}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Ancho Máx</label>
                <select
                  value={blk[maxWKey]}
                  onChange={e => onPatch({ [maxWKey]: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                >
                  <option value="100%">100%</option>
                  <option value="85%">85%</option>
                  <option value="70%">70%</option>
                  <option value="50%">50%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Colors & Container */}
          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="Color Texto"
              value={blk.textColor}
              fallback="#ffffff"
              onChange={textColor => onPatch({ textColor })}
            />
            <ColorField
              label="Fondo"
              value={blk.bgColor}
              fallback="#18181b"
              onChange={bgColor => onPatch({ bgColor })}
            />
            <ColorField
              label="Color Borde"
              value={blk.borderColor}
              fallback="#3f3f46"
              onChange={borderColor => onPatch({ borderColor })}
            />
            <ColorField
              label="Color Acento"
              value={blk.accentColor}
              fallback="#e11d48"
              onChange={accentColor => onPatch({ accentColor })}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Acento</label>
              <select
                value={blk.accentPosition}
                onChange={e =>
                  onPatch({ accentPosition: e.target.value as TextBlockConfig['accentPosition'] })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="none">Ninguno</option>
                <option value="left">Barra Izq.</option>
                <option value="bottom">Línea Inf.</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Borde (px)</label>
              <input
                type="number"
                min={0}
                max={8}
                value={blk.borderWidth}
                onChange={e =>
                  onPatch({ borderWidth: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Radio (px)</label>
              <input
                type="number"
                min={0}
                max={48}
                value={blk.borderRadiusPx}
                onChange={e =>
                  onPatch({ borderRadiusPx: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Padding Horiz. (px)</label>
              <input
                type="number"
                min={0}
                max={64}
                value={blk.paddingX}
                onChange={e => onPatch({ paddingX: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Padding Vert. (px)</label>
              <input
                type="number"
                min={0}
                max={64}
                value={blk.paddingY}
                onChange={e => onPatch({ paddingY: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
          </div>
        </div>

        {renderAdvanced(blk.advanced, advanced => onPatch({ advanced }))}
      </>
    );
  }

  if (block.type === 'paragraph') {
    const blk = block as ParagraphBlockConfig;
    const fontSizeKey = `fontSize${vpSuffix}` as 'fontSizeMobile' | 'fontSizeTablet' | 'fontSizeDesktop';
    const alignKey = `align${vpSuffix}` as 'alignMobile' | 'alignTablet' | 'alignDesktop';
    const maxWKey = `maxWidth${vpSuffix}` as 'maxWidthMobile' | 'maxWidthTablet' | 'maxWidthDesktop';

    return (
      <>
        <ViewportTabs viewport={viewport} onChange={onChangeViewport} />

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Frase Introductoria (Opcional)
            </label>
            <input
              type="text"
              value={blk.leadText || ''}
              onChange={e => onPatch({ leadText: e.target.value })}
              placeholder="Ej: Calidad artesanal desde 2020"
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Contenido del Párrafo
            </label>
            <textarea
              rows={5}
              value={blk.text}
              onChange={e => onPatch({ text: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white resize-y"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#161821] border border-[#262938] space-y-2.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Ajustes en {viewport === 'mobile' ? 'Móvil' : viewport === 'tablet' ? 'Tablet' : 'PC'}
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Tamaño (px)</label>
                <input
                  type="number"
                  min={11}
                  max={36}
                  value={blk[fontSizeKey]}
                  onChange={e =>
                    onPatch({ [fontSizeKey]: Math.max(11, Number(e.target.value) || 14) })
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Alineación</label>
                <select
                  value={blk[alignKey]}
                  onChange={e => onPatch({ [alignKey]: e.target.value as ParagraphAlignOption })}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                  <option value="justify">Justificado</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Ancho Máx</label>
                <select
                  value={blk[maxWKey]}
                  onChange={e => onPatch({ [maxWKey]: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                >
                  <option value="100%">100%</option>
                  <option value="85%">85%</option>
                  <option value="70%">70%</option>
                  <option value="60%">60%</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Interlineado
              </label>
              <select
                value={blk.lineHeight}
                onChange={e =>
                  onPatch({ lineHeight: e.target.value as ParagraphBlockConfig['lineHeight'] })
                }
                className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="snug">Compacto</option>
                <option value="relaxed">Relajado</option>
                <option value="loose">Amplio</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Peso
              </label>
              <select
                value={blk.fontWeight}
                onChange={e =>
                  onPatch({
                    fontWeight: Number(e.target.value) as ParagraphBlockConfig['fontWeight'],
                  })
                }
                className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value={400}>Normal (400)</option>
                <option value={500}>Medium (500)</option>
                <option value={600}>SemiBold (600)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="Color Texto"
              value={blk.textColor}
              fallback="#d4d4d8"
              onChange={textColor => onPatch({ textColor })}
            />
            <ColorField
              label="Fondo"
              value={blk.bgColor}
              fallback="#18181b"
              onChange={bgColor => onPatch({ bgColor })}
            />
          </div>

          <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] cursor-pointer">
            <input
              type="checkbox"
              checked={blk.leftBorderAccent}
              onChange={e => onPatch({ leftBorderAccent: e.target.checked })}
              className="w-4 h-4 accent-rose-500"
            />
            <span className="text-xs font-semibold text-zinc-200">
              Mostrar barra de acento lateral (cita)
            </span>
          </label>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Pad. X (px)</label>
              <input
                type="number"
                min={0}
                max={64}
                value={blk.paddingX}
                onChange={e => onPatch({ paddingX: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Pad. Y (px)</label>
              <input
                type="number"
                min={0}
                max={64}
                value={blk.paddingY}
                onChange={e => onPatch({ paddingY: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Radio (px)</label>
              <input
                type="number"
                min={0}
                max={48}
                value={blk.borderRadiusPx}
                onChange={e =>
                  onPatch({ borderRadiusPx: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
          </div>
        </div>

        {renderAdvanced(blk.advanced, advanced => onPatch({ advanced }))}
      </>
    );
  }

  if (block.type === 'video') {
    const blk = block as VideoBlockConfig;
    const widthKey = `width${vpSuffix}` as 'widthMobile' | 'widthTablet' | 'widthDesktop';
    const heightKey = `height${vpSuffix}` as 'heightMobile' | 'heightTablet' | 'heightDesktop';
    const alignKey = `align${vpSuffix}` as 'alignMobile' | 'alignTablet' | 'alignDesktop';

    return (
      <>
        <ViewportTabs viewport={viewport} onChange={onChangeViewport} />

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              URL del Video (YouTube, Vimeo o MP4)
            </label>
            <input
              type="url"
              value={blk.videoUrl}
              onChange={e => onPatch({ videoUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Relación Aspecto
              </label>
              <select
                value={blk.aspectRatio}
                onChange={e =>
                  onPatch({ aspectRatio: e.target.value as VideoBlockConfig['aspectRatio'] })
                }
                className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="16:9">16:9 (Panorámico)</option>
                <option value="4:3">4:3 (Clásico)</option>
                <option value="1:1">1:1 (Cuadrado)</option>
                <option value="9:16">9:16 (Vertical/Reels)</option>
                <option value="21:9">21:9 (Cine)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Sombra
              </label>
              <select
                value={blk.shadow}
                onChange={e => onPatch({ shadow: e.target.value as BlockShadowSize })}
                className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="none">Sin sombra</option>
                <option value="sm">Suave</option>
                <option value="md">Media</option>
                <option value="lg">Intensa</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#161821] border border-[#262938] space-y-2.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Tamaño en {viewport === 'mobile' ? 'Móvil' : viewport === 'tablet' ? 'Tablet' : 'PC'}
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Ancho</label>
                <select
                  value={blk[widthKey]}
                  onChange={e => onPatch({ [widthKey]: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                >
                  <option value="100%">100%</option>
                  <option value="85%">85%</option>
                  <option value="70%">70%</option>
                  <option value="50%">50%</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Alto (0=Auto)</label>
                <input
                  type="number"
                  min={0}
                  max={900}
                  value={blk[heightKey]}
                  onChange={e =>
                    onPatch({ [heightKey]: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Alineación</label>
                <select
                  value={blk[alignKey]}
                  onChange={e => onPatch({ [alignKey]: e.target.value as TextAlignOption })}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['controls', 'Mostrar controles'],
                ['autoplay', 'Auto-reproducir'],
                ['muted', 'Silenciado (Mute)'],
                ['loop', 'Repetir (Loop)'],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] cursor-pointer text-xs text-zinc-200"
              >
                <input
                  type="checkbox"
                  checked={blk[key]}
                  onChange={e => onPatch({ [key]: e.target.checked })}
                  className="w-3.5 h-3.5 accent-rose-500"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Radio (px)</label>
              <input
                type="number"
                min={0}
                max={48}
                value={blk.borderRadiusPx}
                onChange={e =>
                  onPatch({ borderRadiusPx: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Borde (px)</label>
              <input
                type="number"
                min={0}
                max={8}
                value={blk.borderWidth}
                onChange={e =>
                  onPatch({ borderWidth: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Pie de video (Opcional)</label>
            <input
              type="text"
              value={blk.caption || ''}
              onChange={e => onPatch({ caption: e.target.value })}
              placeholder="Descripción breve debajo del video"
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
            />
          </div>
        </div>

        {renderAdvanced(blk.advanced, advanced => onPatch({ advanced }))}
      </>
    );
  }

  if (block.type === 'image') {
    const blk = block as ImageBlockConfig;
    const widthKey = `width${vpSuffix}` as 'widthMobile' | 'widthTablet' | 'widthDesktop';
    const heightKey = `height${vpSuffix}` as 'heightMobile' | 'heightTablet' | 'heightDesktop';
    const alignKey = `align${vpSuffix}` as 'alignMobile' | 'alignTablet' | 'alignDesktop';

    return (
      <>
        <ViewportTabs viewport={viewport} onChange={onChangeViewport} />

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Imagen Principal (PC / General)
              </label>
              <button
                type="button"
                onClick={() => setMediaTargetField('src')}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <ImageIcon className="w-3 h-3" />
                Galería
              </button>
            </div>
            <input
              type="url"
              value={blk.src}
              onChange={e => onPatch({ src: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400">
                  Imagen Tablet
                </label>
                <button
                  type="button"
                  onClick={() => setMediaTargetField('srcTablet')}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300"
                >
                  Galería
                </button>
              </div>
              <input
                type="url"
                value={blk.srcTablet || ''}
                onChange={e => onPatch({ srcTablet: e.target.value })}
                placeholder="Igual que PC"
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400">
                  Imagen Móvil
                </label>
                <button
                  type="button"
                  onClick={() => setMediaTargetField('srcMobile')}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300"
                >
                  Galería
                </button>
              </div>
              <input
                type="url"
                value={blk.srcMobile || ''}
                onChange={e => onPatch({ srcMobile: e.target.value })}
                placeholder="Igual que PC"
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Texto Alt (SEO)</label>
              <input
                type="text"
                value={blk.alt}
                onChange={e => onPatch({ alt: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Pie de foto</label>
              <input
                type="text"
                value={blk.caption || ''}
                onChange={e => onPatch({ caption: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#161821] border border-[#262938] space-y-2.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Ajustes en {viewport === 'mobile' ? 'Móvil' : viewport === 'tablet' ? 'Tablet' : 'PC'}
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Ancho</label>
                <select
                  value={blk[widthKey]}
                  onChange={e => onPatch({ [widthKey]: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                >
                  <option value="100%">100%</option>
                  <option value="85%">85%</option>
                  <option value="70%">70%</option>
                  <option value="50%">50%</option>
                  <option value="33%">33%</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Alto (0=Auto)</label>
                <input
                  type="number"
                  min={0}
                  max={900}
                  value={blk[heightKey]}
                  onChange={e =>
                    onPatch({ [heightKey]: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Alineación</label>
                <select
                  value={blk[alignKey]}
                  onChange={e => onPatch({ [alignKey]: e.target.value as TextAlignOption })}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Proporción</label>
              <select
                value={blk.aspectRatio}
                onChange={e =>
                  onPatch({ aspectRatio: e.target.value as ImageBlockConfig['aspectRatio'] })
                }
                className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="auto">Original</option>
                <option value="16:9">16:9</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1 (Cuadrada)</option>
                <option value="3:4">3:4 (Vertical)</option>
                <option value="21:9">21:9 (Banner)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Encuadre</label>
              <select
                value={blk.objectFit}
                onChange={e =>
                  onPatch({ objectFit: e.target.value as ImageBlockConfig['objectFit'] })
                }
                className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="cover">Cubrir (Cover)</option>
                <option value="contain">Completa (Contain)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Radio (px)</label>
              <input
                type="number"
                min={0}
                max={64}
                value={blk.borderRadiusPx}
                onChange={e =>
                  onPatch({ borderRadiusPx: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Borde (px)</label>
              <input
                type="number"
                min={0}
                max={8}
                value={blk.borderWidth}
                onChange={e =>
                  onPatch({ borderWidth: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Sombra</label>
              <select
                value={blk.shadow}
                onChange={e => onPatch({ shadow: e.target.value as BlockShadowSize })}
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="none">Ninguna</option>
                <option value="sm">Suave</option>
                <option value="md">Media</option>
                <option value="lg">Intensa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              Acción al hacer clic
            </label>
            <select
              value={blk.actionType}
              onChange={e =>
                onPatch({ actionType: e.target.value as ImageBlockConfig['actionType'] })
              }
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
            >
              <option value="none">Sin acción</option>
              <option value="url">Abrir URL</option>
              <option value="product">Abrir Producto</option>
            </select>
            {blk.actionType === 'url' && (
              <input
                type="url"
                value={blk.linkUrl || ''}
                onChange={e => onPatch({ linkUrl: e.target.value })}
                placeholder="https://..."
                className="mt-2 w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              />
            )}
            {blk.actionType === 'product' && (
              <select
                value={blk.productId || ''}
                onChange={e => onPatch({ productId: e.target.value })}
                className="mt-2 w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="">Selecciona producto...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {renderAdvanced(blk.advanced, advanced => onPatch({ advanced }))}

        <MediaGalleryModal
          isOpen={mediaTargetField !== null}
          onClose={() => setMediaTargetField(null)}
          onSelect={url => {
            if (mediaTargetField) {
              onPatch({ [mediaTargetField]: url });
            }
            setMediaTargetField(null);
          }}
        />
      </>
    );
  }

  if (block.type === 'button') {
    const blk = block as ButtonBlockConfig;
    const alignKey = `align${vpSuffix}` as 'alignMobile' | 'alignTablet' | 'alignDesktop';
    const sizeKey = `size${vpSuffix}` as 'sizeMobile' | 'sizeTablet' | 'sizeDesktop';

    return (
      <>
        <ViewportTabs viewport={viewport} onChange={onChangeViewport} />

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Texto del Botón
              </label>
              <input
                type="text"
                value={blk.label}
                onChange={e => onPatch({ label: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Subtítulo (Opcional)
              </label>
              <input
                type="text"
                value={blk.sublabel || ''}
                onChange={e => onPatch({ sublabel: e.target.value })}
                placeholder="Ej: Envío gratis"
                className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Estilo
              </label>
              <select
                value={blk.variant}
                onChange={e =>
                  onPatch({ variant: e.target.value as ButtonBlockConfig['variant'] })
                }
                className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="solid">Sólido</option>
                <option value="outline">Contorno (Outline)</option>
                <option value="soft">Suave (Soft)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Ícono
              </label>
              <select
                value={blk.icon}
                onChange={e => onPatch({ icon: e.target.value as ButtonIconOption })}
                className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="none">Sin ícono</option>
                <option value="arrow">Flecha →</option>
                <option value="cart">Carrito / Pedido</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Teléfono</option>
                <option value="external">Enlace externo</option>
                <option value="sparkles">Destacado</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#161821] border border-[#262938] space-y-2.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Ajustes en {viewport === 'mobile' ? 'Móvil' : viewport === 'tablet' ? 'Tablet' : 'PC'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Alineación / Ancho</label>
                <select
                  value={blk[alignKey]}
                  onChange={e =>
                    onPatch({ [alignKey]: e.target.value as ButtonBlockConfig['alignDesktop'] })
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                  <option value="full">Ancho completo (100%)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Tamaño</label>
                <select
                  value={blk[sizeKey]}
                  onChange={e =>
                    onPatch({ [sizeKey]: e.target.value as ButtonBlockConfig['sizeDesktop'] })
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                >
                  <option value="sm">Pequeño</option>
                  <option value="md">Mediano</option>
                  <option value="lg">Grande</option>
                  <option value="xl">Extra Grande</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="Color Botón"
              value={blk.bgColor}
              fallback="#e11d48"
              onChange={bgColor => onPatch({ bgColor })}
            />
            <ColorField
              label="Color Texto"
              value={blk.textColor}
              fallback="#ffffff"
              onChange={textColor => onPatch({ textColor })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Radio Borde (px)</label>
              <input
                type="number"
                min={0}
                max={999}
                value={blk.borderRadiusPx}
                onChange={e =>
                  onPatch({ borderRadiusPx: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Sombra</label>
              <select
                value={blk.shadow}
                onChange={e => onPatch({ shadow: e.target.value as BlockShadowSize })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="none">Ninguna</option>
                <option value="sm">Suave</option>
                <option value="md">Media</option>
                <option value="lg">Intensa</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase text-zinc-400">
              Acción del Botón
            </label>
            <select
              value={blk.actionType}
              onChange={e =>
                onPatch({ actionType: e.target.value as ButtonBlockConfig['actionType'] })
              }
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
            >
              <option value="url">Ir a URL / Página</option>
              <option value="product">Abrir Producto</option>
              <option value="whatsapp">Enviar WhatsApp</option>
              <option value="scroll_top">Subir al inicio</option>
            </select>

            {blk.actionType === 'url' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={blk.linkUrl || ''}
                  onChange={e => onPatch({ linkUrl: e.target.value })}
                  placeholder="/p/mi-pagina o https://..."
                  className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
                />
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(blk.openInNewTab)}
                    onChange={e => onPatch({ openInNewTab: e.target.checked })}
                    className="w-3.5 h-3.5 accent-rose-500"
                  />
                  <span>Abrir en nueva pestaña</span>
                </label>
              </div>
            )}

            {blk.actionType === 'product' && (
              <select
                value={blk.productId || ''}
                onChange={e => onPatch({ productId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="">Selecciona producto...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {blk.actionType === 'whatsapp' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={blk.whatsappNumber || ''}
                  onChange={e => onPatch({ whatsappNumber: e.target.value })}
                  placeholder="Ej: 51999888777"
                  className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
                />
                <input
                  type="text"
                  value={blk.whatsappMessage || ''}
                  onChange={e => onPatch({ whatsappMessage: e.target.value })}
                  placeholder="Mensaje predeterminado..."
                  className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
                />
              </div>
            )}
          </div>
        </div>

        {renderAdvanced(blk.advanced, advanced => onPatch({ advanced }))}
      </>
    );
  }

  return null;
};
