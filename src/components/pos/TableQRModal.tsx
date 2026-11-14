import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Printer, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { RestaurantTable } from '../../types/catalog';
import { Tenant } from '../../types/settings';
import { useSettings } from '../../context/SettingsContext';

interface TableQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  tables: RestaurantTable[];
  initialTableId?: string | null;
}

export function buildTableQrUrl(tenantId: string, tableId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({
    sucursal: tenantId,
    mesa: tableId,
  });
  return `${origin}/?${params.toString()}`;
}

export const TableQRModal: React.FC<TableQRModalProps> = ({
  isOpen,
  onClose,
  tenant,
  tables,
  initialTableId = null,
}) => {
  const { dispatchToast, companyInfo } = useSettings();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [selectedTableId, setSelectedTableId] = useState<string>('all');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedTableId(initialTableId || 'all');
    }
  }, [isOpen, initialTableId]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (isOpen && !dlg.open) {
      dlg.showModal();
    } else if (!isOpen && dlg.open) {
      dlg.close();
    }
  }, [isOpen]);

  const displayedTables = useMemo(() => {
    if (selectedTableId === 'all') return tables;
    return tables.filter((t) => t.id === selectedTableId);
  }, [tables, selectedTableId]);

  useEffect(() => {
    if (!isOpen || tables.length === 0) return;
    let cancelled = false;
    setIsGenerating(true);

    Promise.all(
      tables.map(async (tbl) => {
        const url = buildTableQrUrl(tenant.id, tbl.id);
        const dataUrl = await QRCode.toDataURL(url, {
          width: 420,
          margin: 2,
          color: {
            dark: '#09090b',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });
        return [tbl.id, dataUrl] as const;
      })
    )
      .then((entries) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        entries.forEach(([id, dataUrl]) => {
          next[id] = dataUrl;
        });
        setQrMap(next);
      })
      .catch(() => {
        if (!cancelled) {
          dispatchToast('Error QR', 'No se pudieron generar los códigos QR.', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setIsGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, tables, tenant.id, dispatchToast]);

  const handleCopyLink = async (tbl: RestaurantTable) => {
    const url = buildTableQrUrl(tenant.id, tbl.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(tbl.id);
      dispatchToast('Enlace Copiado', `URL directa de ${tbl.name} copiada al portapapeles.`, 'success');
      setTimeout(() => setCopiedId((prev) => (prev === tbl.id ? null : prev)), 2000);
    } catch {
      dispatchToast('No se pudo copiar', 'Copia el enlace manualmente desde la barra.', 'warning');
    }
  };

  const handleDownloadPng = (tbl: RestaurantTable) => {
    const dataUrl = qrMap[tbl.id];
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR-${tenant.name.replace(/\s+/g, '-')}-${tbl.name.replace(/\s+/g, '-')}.png`;
    link.click();
  };

  const handlePrintCards = (targetTables: RestaurantTable[]) => {
    if (targetTables.length === 0) return;
    const brandName = companyInfo.commercialName || 'Khalessi Pizza';

    const cardsHtml = targetTables
      .map((tbl) => {
        const qrSrc = qrMap[tbl.id] || '';
        return `
          <div class="qr-card">
            <div class="brand">${brandName}</div>
            <div class="branch">${tenant.name}</div>
            <div class="qr-box">
              <img src="${qrSrc}" alt="QR ${tbl.name}" />
            </div>
            <div class="table-name">${tbl.name}</div>
            <div class="zone">${tbl.zone} · Cap. ${tbl.capacity} pers.</div>
            <div class="cta">Escanea para pedir y pagar directo desde tu mesa</div>
          </div>
        `;
      })
      .join('');

    const html = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>QRs de Mesas - ${tenant.name}</title>
          <style>
            * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
            body { margin: 0; padding: 16px; background: #fff; color: #09090b; }
            .grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
              gap: 16px;
            }
            .qr-card {
              border: 2px dashed #d4d4d8;
              border-radius: 16px;
              padding: 18px 14px;
              text-align: center;
              page-break-inside: avoid;
              break-inside: avoid;
              background: #fff;
            }
            .brand {
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #d97706;
            }
            .branch {
              font-size: 11px;
              font-weight: 700;
              color: #52525b;
              margin-top: 2px;
            }
            .qr-box {
              margin: 12px auto;
              width: 170px;
              height: 170px;
              padding: 6px;
              border: 1px solid #e4e4e7;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .table-name {
              font-size: 20px;
              font-weight: 900;
              margin-top: 4px;
              color: #09090b;
            }
            .zone {
              font-size: 11px;
              font-weight: 600;
              color: #71717a;
              margin-top: 2px;
            }
            .cta {
              margin-top: 10px;
              font-size: 11px;
              font-weight: 700;
              background: #fef3c7;
              color: #92400e;
              padding: 6px 10px;
              border-radius: 999px;
              display: inline-block;
            }
            @media print {
              body { padding: 6mm; }
              .qr-card { border-color: #a1a1aa; }
            }
          </style>
        </head>
        <body>
          <div class="grid">${cardsHtml}</div>
          <script>
            window.onload = () => {
              setTimeout(() => { window.print(); }, 250);
            };
          </script>
        </body>
      </html>
    `;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        if (printFrame.parentNode) {
          printFrame.parentNode.removeChild(printFrame);
        }
      }, 60000);
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="backdrop:bg-black/70 backdrop:backdrop-blur-sm bg-transparent p-4 m-auto max-w-4xl w-full rounded-2xl"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-zinc-900 dark:text-white truncate">
                Códigos QR de Mesas — {tenant.name}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                Al escanear, el cliente entra directo a esta sucursal y mesa con pago exclusivo vía Culqi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal QR"
            className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Print Bar */}
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setSelectedTableId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                selectedTableId === 'all'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              Todas ({tables.length})
            </button>
            {tables.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTableId(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                  selectedTableId === t.id
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={isGenerating || displayedTables.length === 0}
            onClick={() => handlePrintCards(displayedTables)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>
              {selectedTableId === 'all'
                ? `Imprimir Todos (${displayedTables.length})`
                : 'Imprimir Tarjeta QR'}
            </span>
          </button>
        </div>

        {/* Cards Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedTables.map((tbl) => {
            const url = buildTableQrUrl(tenant.id, tbl.id);
            const qrSrc = qrMap[tbl.id];
            const isCopied = copiedId === tbl.id;

            return (
              <div
                key={tbl.id}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4 flex flex-col items-center text-center"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {tenant.name}
                </span>
                <h4 className="text-base font-black text-zinc-900 dark:text-white mt-0.5">
                  {tbl.name}
                </h4>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {tbl.zone} · Cap. {tbl.capacity}
                </span>

                <div className="my-3 w-40 h-40 rounded-2xl bg-white p-2 border border-zinc-200 shadow-sm flex items-center justify-center">
                  {qrSrc ? (
                    <img
                      src={qrSrc}
                      alt={`QR ${tbl.name}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                <div className="w-full flex items-center justify-center gap-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(tbl)}
                    className="flex-1 px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-amber-500/60 text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap shrink-0"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPng(tbl)}
                    title="Descargar PNG"
                    className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-amber-500/60 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    title="Probar enlace de mesa"
                    className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-amber-500/60 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-bold whitespace-nowrap shrink-0"
          >
            Cerrar
          </button>
        </div>
      </div>
    </dialog>
  );
};
