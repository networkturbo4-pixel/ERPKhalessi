import React, { useState } from 'react';
import {
  StoreBlock,
  StoreBlockType,
  ColumnsBlockConfig,
  SpacerBlockConfig,
  FaqBlockConfig,
  CountdownBlockConfig,
  LeadFormBlockConfig,
  BuilderViewport,
  BlockAdvancedOptions,
  TextAlignOption,
} from '../../types/storeBuilder';
import { createDefaultBlock } from '../../context/StoreBuilderContext';
import { Plus, Trash2, Monitor, Tablet, Smartphone } from 'lucide-react';

interface AdvancedInspectorProps {
  block: StoreBlock;
  viewport: BuilderViewport;
  onChangeViewport: (vp: BuilderViewport) => void;
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

export const ElementorAdvancedWidgetsInspector: React.FC<AdvancedInspectorProps> = ({
  block,
  viewport,
  onChangeViewport,
  onPatch,
  renderAdvanced,
}) => {
  const [addingWidgetToCol, setAddingWidgetToCol] = useState<string | null>(null);
  const vpSuffix = viewport === 'mobile' ? 'Mobile' : viewport === 'tablet' ? 'Tablet' : 'Desktop';

  if (block.type === 'columns') {
    const blk = block as ColumnsBlockConfig;
    const setColumnCount = (desktopCount: 2 | 3 | 4) => {
      const nextCols = [...blk.columns];
      while (nextCols.length < desktopCount) {
        nextCols.push({
          id: `col-${Date.now()}-${nextCols.length + 1}`,
          blocks: [createDefaultBlock('paragraph')],
        });
      }
      if (nextCols.length > desktopCount) {
        nextCols.length = desktopCount;
      }
      onPatch({ columnsDesktop: desktopCount, columns: nextCols });
    };

    const addChildToCol = (colId: string, type: StoreBlockType) => {
      const child = createDefaultBlock(type);
      onPatch({
        columns: blk.columns.map(c =>
          c.id === colId ? { ...c, blocks: [...c.blocks, child] } : c
        ),
      });
      setAddingWidgetToCol(null);
    };

    const removeChildFromCol = (colId: string, childId: string) => {
      onPatch({
        columns: blk.columns.map(c =>
          c.id === colId ? { ...c, blocks: c.blocks.filter(b => b.id !== childId) } : c
        ),
      });
    };

    return (
      <>
        <ViewportTabs viewport={viewport} onChange={onChangeViewport} />
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              Título de Sección (Opcional)
            </label>
            <input
              type="text"
              value={blk.title || ''}
              onChange={e => onPatch({ title: e.target.value })}
              placeholder="Ej: Nuestros Beneficios"
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Cols PC</label>
              <select
                value={blk.columnsDesktop}
                onChange={e => setColumnCount(Number(e.target.value) as 2 | 3 | 4)}
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value={2}>2 Columnas</option>
                <option value={3}>3 Columnas</option>
                <option value={4}>4 Columnas</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Cols Tablet</label>
              <select
                value={blk.columnsTablet}
                onChange={e =>
                  onPatch({ columnsTablet: Number(e.target.value) as 1 | 2 | 3 })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value={1}>1 Columna</option>
                <option value={2}>2 Columnas</option>
                <option value={3}>3 Columnas</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Cols Móvil</label>
              <select
                value={blk.columnsMobile}
                onChange={e => onPatch({ columnsMobile: Number(e.target.value) as 1 | 2 })}
                className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value={1}>1 Columna</option>
                <option value={2}>2 Columnas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Espacio entre cols (px)</label>
              <input
                type="number"
                min={0}
                max={64}
                value={blk.gapPx}
                onChange={e => onPatch({ gapPx: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Alineación Vertical</label>
              <select
                value={blk.verticalAlign}
                onChange={e =>
                  onPatch({
                    verticalAlign: e.target.value as ColumnsBlockConfig['verticalAlign'],
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              >
                <option value="start">Arriba</option>
                <option value="center">Centrado</option>
                <option value="stretch">Estirado</option>
              </select>
            </div>
          </div>

          {/* Manage each column's child widgets */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Contenido por Columna
            </span>
            {blk.columns.map((col, idx) => (
              <div
                key={col.id}
                className="p-2.5 rounded-xl bg-[#161821] border border-[#262938] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Columna {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAddingWidgetToCol(addingWidgetToCol === col.id ? null : col.id)
                    }
                    className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>

                {addingWidgetToCol === col.id && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(
                      [
                        ['text', 'Texto'],
                        ['paragraph', 'Párrafo'],
                        ['image', 'Imagen'],
                        ['video', 'Video'],
                        ['button', 'Botón'],
                        ['lead_form', 'Formulario'],
                      ] as const
                    ).map(([type, lbl]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addChildToCol(col.id, type)}
                        className="px-2 py-1 rounded-lg bg-[#0d0f15] hover:bg-rose-600 text-[10px] font-semibold text-zinc-200 border border-[#282c3a]"
                      >
                        + {lbl}
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-1">
                  {col.blocks.map(child => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0d0f15] border border-[#252836] text-[11px]"
                    >
                      <span className="truncate text-zinc-300 font-medium">
                        {child.type.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeChildFromCol(col.id, child.id)}
                        className="text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {renderAdvanced(blk.advanced, advanced => onPatch({ advanced }))}
      </>
    );
  }

  if (block.type === 'spacer') {
    const blk = block as SpacerBlockConfig;
    const heightKey = `height${vpSuffix}` as 'heightMobile' | 'heightTablet' | 'heightDesktop';
    return (
      <>
        <ViewportTabs viewport={viewport} onChange={onChangeViewport} />
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase text-zinc-400">
                Altura ({viewport})
              </label>
              <span className="text-[10px] font-mono text-zinc-300">{blk[heightKey]}px</span>
            </div>
            <input
              type="range"
              min={4}
              max={160}
              value={blk[heightKey]}
              onChange={e => onPatch({ [heightKey]: Number(e.target.value) || 16 })}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] cursor-pointer text-xs text-zinc-200">
            <input
              type="checkbox"
              checked={blk.showDivider}
              onChange={e => onPatch({ showDivider: e.target.checked })}
              className="w-4 h-4 accent-rose-500"
            />
            <span>Mostrar línea divisoria</span>
          </label>

          {blk.showDivider && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Estilo</label>
                <select
                  value={blk.dividerStyle}
                  onChange={e =>
                    onPatch({
                      dividerStyle: e.target.value as SpacerBlockConfig['dividerStyle'],
                    })
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
                >
                  <option value="solid">Sólida</option>
                  <option value="dashed">Guiones</option>
                  <option value="dotted">Puntos</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Ancho</label>
                <select
                  value={blk.dividerWidth}
                  onChange={e =>
                    onPatch({
                      dividerWidth: e.target.value as SpacerBlockConfig['dividerWidth'],
                    })
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
                >
                  <option value="100%">100%</option>
                  <option value="75%">75%</option>
                  <option value="50%">50%</option>
                  <option value="25%">25%</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Grosor (px)</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={blk.dividerThickness}
                  onChange={e =>
                    onPatch({ dividerThickness: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
                />
              </div>
            </div>
          )}
        </div>
        {renderAdvanced(blk.advanced, advanced => onPatch({ advanced }))}
      </>
    );
  }

  if (block.type === 'faq') {
    const blk = block as FaqBlockConfig;
    const addFaq = () => {
      onPatch({
        items: [
          ...blk.items,
          {
            id: `faq-${Date.now()}`,
            question: 'Nueva pregunta frecuente',
            answer: 'Escribe aquí la respuesta clara para tus clientes.',
          },
        ],
      });
    };
    const updateFaq = (id: string, field: 'question' | 'answer', val: string) => {
      onPatch({
        items: blk.items.map(it => (it.id === id ? { ...it, [field]: val } : it)),
      });
    };
    const removeFaq = (id: string) => {
      onPatch({ items: blk.items.filter(it => it.id !== id) });
    };

    return (
      <>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Título</label>
              <input
                type="text"
                value={blk.title || ''}
                onChange={e => onPatch({ title: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Radio (px)</label>
              <input
                type="number"
                min={0}
                max={32}
                value={blk.borderRadiusPx}
                onChange={e =>
                  onPatch({ borderRadiusPx: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-zinc-400">
              Preguntas ({blk.items.length})
            </span>
            <button
              type="button"
              onClick={addFaq}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>

          <div className="space-y-2.5">
            {blk.items.map(item => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-[#161821] border border-[#262938] space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.question}
                    onChange={e => updateFaq(item.id, 'question', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs font-semibold text-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeFaq(item.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={item.answer}
                  onChange={e => updateFaq(item.id, 'answer', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-zinc-300 resize-y"
                />
              </div>
            ))}
          </div>
        </div>
        {renderAdvanced(blk.advanced, advanced => onPatch({ advanced }))}
      </>
    );
  }

  if (block.type === 'countdown') {
    const blk = block as CountdownBlockConfig;
    const alignKey = `align${vpSuffix}` as 'alignMobile' | 'alignTablet' | 'alignDesktop';
    return (
      <>
        <ViewportTabs viewport={viewport} onChange={onChangeViewport} />
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              Título de Campaña
            </label>
            <input
              type="text"
              value={blk.title}
              onChange={e => onPatch({ title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              Subtítulo
            </label>
            <input
              type="text"
              value={blk.subtitle || ''}
              onChange={e => onPatch({ subtitle: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              Fecha y Hora Límite
            </label>
            <input
              type="datetime-local"
              value={blk.targetDateIso}
              onChange={e => onPatch({ targetDateIso: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Texto Botón</label>
              <input
                type="text"
                value={blk.ctaLabel || ''}
                onChange={e => onPatch({ ctaLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">URL Botón</label>
              <input
                type="text"
                value={blk.ctaUrl || ''}
                onChange={e => onPatch({ ctaUrl: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">
              Alineación ({viewport})
            </label>
            <select
              value={blk[alignKey]}
              onChange={e => onPatch({ [alignKey]: e.target.value as TextAlignOption })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
            >
              <option value="left">Izquierda</option>
              <option value="center">Centro</option>
              <option value="right">Derecha</option>
            </select>
          </div>
        </div>
        {renderAdvanced(blk.advanced, advanced => onPatch({ advanced }))}
      </>
    );
  }

  if (block.type === 'lead_form') {
    const blk = block as LeadFormBlockConfig;
    return (
      <>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              Título del Formulario
            </label>
            <input
              type="text"
              value={blk.title}
              onChange={e => onPatch({ title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              Subtítulo
            </label>
            <input
              type="text"
              value={blk.subtitle || ''}
              onChange={e => onPatch({ subtitle: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Texto Botón</label>
              <input
                type="text"
                value={blk.submitLabel}
                onChange={e => onPatch({ submitLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Radio (px)</label>
              <input
                type="number"
                min={0}
                max={32}
                value={blk.borderRadiusPx}
                onChange={e =>
                  onPatch({ borderRadiusPx: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#161821] border border-[#262938] text-xs text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              Mensaje de Éxito
            </label>
            <input
              type="text"
              value={blk.successMessage}
              onChange={e => onPatch({ successMessage: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
            />
          </div>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              checked={blk.showEmail}
              onChange={e => onPatch({ showEmail: e.target.checked })}
              className="w-4 h-4 accent-rose-500"
            />
            <span>Pedir correo electrónico</span>
          </label>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              checked={blk.showMessage}
              onChange={e => onPatch({ showMessage: e.target.checked })}
              className="w-4 h-4 accent-rose-500"
            />
            <span>Incluir campo de mensaje</span>
          </label>
        </div>
        {renderAdvanced(blk.advanced, advanced => onPatch({ advanced }))}
      </>
    );
  }

  return null;
};
