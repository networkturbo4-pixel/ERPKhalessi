import React, { useId, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { PermissionGate } from '../common/PermissionGate';
import { Sparkles, RotateCcw, Upload, Image as ImageIcon, Save, Store, Trash2 } from 'lucide-react';

type LogoField = 'logoLight' | 'logoDark' | 'storeHeaderLogo' | 'favicon';

function compressImageFile(file: File, maxWidth = 800, maxHeight = 800, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        reject(new Error('Archivo vacío'));
        return;
      }

      // Preserve vector SVGs and .ico favicons losslessly without rasterizing onto a canvas
      const lowerName = file.name.toLowerCase();
      if (
        file.type === 'image/svg+xml' ||
        file.type === 'image/x-icon' ||
        file.type === 'image/vnd.microsoft.icon' ||
        lowerName.endsWith('.svg') ||
        lowerName.endsWith('.ico')
      ) {
        resolve(rawDataUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => {
        // Fallback to raw data URL if browser can display it or reject if unreadable
        if (rawDataUrl.startsWith('data:image/')) {
          resolve(rawDataUrl);
        } else {
          reject(new Error('Error al decodificar la imagen'));
        }
      };
      img.onload = () => {
        let width = img.naturalWidth || img.width || maxWidth;
        let height = img.naturalHeight || img.height || maxHeight;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.max(1, Math.round((height * maxWidth) / width));
            width = maxWidth;
          } else {
            width = Math.max(1, Math.round((width * maxHeight) / height));
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Preserve alpha transparency for PNG/WebP/GIF using compact WebP (with PNG fallback)
        const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
        if (isJpeg) {
          resolve(canvas.toDataURL('image/jpeg', quality));
          return;
        }

        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        if (webpDataUrl.startsWith('data:image/webp')) {
          resolve(webpDataUrl);
          return;
        }

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const IdentityTab: React.FC = () => {
  const {
    customization,
    updateCustomization,
    resetCustomizationToDefaults,
    saveAllSettings,
    isSaving,
    dispatchToast,
  } = useSettings();
  const baseId = useId();
  const [dragField, setDragField] = useState<LogoField | null>(null);

  const processLogoFile = async (file: File, field: LogoField) => {
    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|svg|gif|ico|avif)$/i.test(file.name)) {
      dispatchToast('Formato no soportado', 'Selecciona una imagen PNG, JPG, WebP, SVG o ICO.', 'error');
      return;
    }
    try {
      const maxDim = field === 'favicon' ? 256 : 800;
      const compressed = await compressImageFile(file, maxDim, maxDim, 0.88);
      updateCustomization({ [field]: compressed });
      dispatchToast(
        'Logo aplicado y guardado',
        'La imagen ya se encuentra activa en la plataforma y sincronizada.',
        'success'
      );
    } catch {
      dispatchToast('Error de archivo', 'No se pudo procesar la imagen seleccionada.', 'error');
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: LogoField
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      await processLogoFile(file, field);
    }
    e.target.value = '';
  };

  const handleDropFile = async (e: React.DragEvent<HTMLElement>, field: LogoField) => {
    e.preventDefault();
    e.stopPropagation();
    setDragField(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processLogoFile(file, field);
    }
  };

  const handleSaveWithToast = async () => {
    await saveAllSettings();
    dispatchToast(
      '¡Cambios Guardados!',
      'Logos, nombre comercial e identidad corporativa persistidos correctamente.',
      'success'
    );
  };

  const storeLogoInputId = `${baseId}-store-logo`;
  const lightLogoInputId = `${baseId}-light-logo`;
  const darkLogoInputId = `${baseId}-dark-logo`;
  const faviconInputId = `${baseId}-favicon-logo`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: customization.primaryColor }} />
            Identidad y Marca
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Personaliza el nombre de la plataforma, eslogan comercial y logotipos corporativos para todos los locales.
          </p>
        </div>

        <PermissionGate permission="settings:manage" hideInsteadOfBanner>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetCustomizationToDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl saas-btn-secondary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar
            </button>
            <button
              type="button"
              onClick={handleSaveWithToast}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </PermissionGate>
      </div>

      <PermissionGate permission="settings:manage">
        {/* Nombres y Eslogan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 saas-card p-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-2">
              Nombre de la Plataforma ERP
            </label>
            <input
              type="text"
              value={customization.appName}
              onChange={e => updateCustomization({ appName: e.target.value })}
              placeholder="Ej. Khalessi Pizza ERP"
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-sm"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
              Se mostrará en la barra de navegación, tickets de venta y títulos de pestañas.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-2">
              Eslogan Comercial
            </label>
            <input
              type="text"
              value={customization.slogan || ''}
              onChange={e => updateCustomization({ slogan: e.target.value })}
              placeholder="Ej. El auténtico sabor de masa madre al horno de leña"
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-sm"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
              Aparece en reportes de caja, cotizaciones y la pantalla de bienvenida.
            </p>
          </div>
        </div>

        {/* Gestor de Logos e Imágenes */}
        <div className="saas-card p-6 space-y-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
            <ImageIcon className="h-4 w-4" style={{ color: customization.primaryColor }} />
            Recursos Gráficos y Logotipos
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* Logo Cabecera Tienda Virtual */}
            <div className="saas-subcard p-4 flex flex-col justify-between ring-1 ring-amber-500/30">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5 mb-1">
                  <Store className="h-3.5 w-3.5" style={{ color: customization.primaryColor }} />
                  Logo Cabecera Tienda Virtual
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">
                  Se muestra en el encabezado principal de la tienda online.
                </p>
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setDragField('storeHeaderLogo');
                  }}
                  onDragLeave={() => setDragField(prev => (prev === 'storeHeaderLogo' ? null : prev))}
                  onDrop={e => handleDropFile(e, 'storeHeaderLogo')}
                  className={`h-32 bg-zinc-900 rounded-lg border border-dashed flex items-center justify-center p-3 overflow-hidden relative transition-colors ${
                    dragField === 'storeHeaderLogo'
                      ? 'border-amber-400 ring-2 ring-amber-400/30'
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {customization.storeHeaderLogo ? (
                    <>
                      <label
                        htmlFor={storeLogoInputId}
                        title="Haz clic para cambiar el logo de cabecera"
                        className="w-full h-full flex items-center justify-center cursor-pointer"
                      >
                        <img
                          src={customization.storeHeaderLogo}
                          alt="Logo Cabecera Tienda"
                          className="max-h-full max-w-full object-contain"
                        />
                      </label>
                      <button
                        type="button"
                        title="Quitar logo de cabecera"
                        onClick={() => updateCustomization({ storeHeaderLogo: '' })}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/75 text-zinc-300 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <label
                      htmlFor={storeLogoInputId}
                      className="w-full h-full flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center px-2"
                    >
                      <Upload className="h-4 w-4 text-zinc-400" />
                      <span className="text-xs text-zinc-300 font-medium">
                        Haz clic o arrastra tu logo aquí
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        Sin logo subido (usará isotipo sólido)
                      </span>
                    </label>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={
                    customization.storeHeaderLogo?.startsWith('data:')
                      ? '✓ Imagen subida (pega URL para cambiar)'
                      : 'URL o sube logo tienda'
                  }
                  value={
                    customization.storeHeaderLogo?.startsWith('data:')
                      ? ''
                      : customization.storeHeaderLogo || ''
                  }
                  onChange={e => updateCustomization({ storeHeaderLogo: e.target.value })}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg saas-input"
                />
                <label
                  htmlFor={storeLogoInputId}
                  title="Subir imagen de logo para cabecera de tienda"
                  className="cursor-pointer px-2.5 py-1.5 saas-btn-secondary rounded-lg flex items-center justify-center shrink-0 focus-within:ring-2 focus-within:ring-brand-500"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <input
                    id={storeLogoInputId}
                    type="file"
                    accept="image/*,.svg,.ico,.webp"
                    className="sr-only"
                    onChange={e => handleFileUpload(e, 'storeHeaderLogo')}
                  />
                </label>
              </div>
            </div>

            {/* Logo Modo Claro */}
            <div className="saas-subcard p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block mb-1">
                  Logo Principal (Modo Claro)
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">
                  Fondo claro o transparente (PNG/SVG).
                </p>
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setDragField('logoLight');
                  }}
                  onDragLeave={() => setDragField(prev => (prev === 'logoLight' ? null : prev))}
                  onDrop={e => handleDropFile(e, 'logoLight')}
                  className={`h-32 bg-white rounded-lg border border-dashed flex items-center justify-center p-3 overflow-hidden relative transition-colors ${
                    dragField === 'logoLight'
                      ? 'border-amber-500 ring-2 ring-amber-500/30'
                      : 'border-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  {customization.logoLight ? (
                    <>
                      <label
                        htmlFor={lightLogoInputId}
                        title="Haz clic para cambiar el logo modo claro"
                        className="w-full h-full flex items-center justify-center cursor-pointer"
                      >
                        <img
                          src={customization.logoLight}
                          alt="Logo Claro"
                          className="max-h-full max-w-full object-contain"
                        />
                      </label>
                      <button
                        type="button"
                        title="Quitar logo modo claro"
                        onClick={() => updateCustomization({ logoLight: '' })}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900/80 text-white hover:text-rose-300 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <label
                      htmlFor={lightLogoInputId}
                      className="w-full h-full flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center px-2"
                    >
                      <Upload className="h-4 w-4 text-zinc-400" />
                      <span className="text-xs text-zinc-500 font-medium">
                        Haz clic o arrastra imagen
                      </span>
                    </label>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={
                    customization.logoLight?.startsWith('data:')
                      ? '✓ Imagen subida (pega URL para cambiar)'
                      : 'URL o sube imagen'
                  }
                  value={
                    customization.logoLight?.startsWith('data:')
                      ? ''
                      : customization.logoLight || ''
                  }
                  onChange={e => updateCustomization({ logoLight: e.target.value })}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg saas-input"
                />
                <label
                  htmlFor={lightLogoInputId}
                  title="Subir logo modo claro"
                  className="cursor-pointer px-2.5 py-1.5 saas-btn-secondary rounded-lg flex items-center justify-center shrink-0 focus-within:ring-2 focus-within:ring-brand-500"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <input
                    id={lightLogoInputId}
                    type="file"
                    accept="image/*,.svg,.ico,.webp"
                    className="sr-only"
                    onChange={e => handleFileUpload(e, 'logoLight')}
                  />
                </label>
              </div>
            </div>

            {/* Logo Modo Oscuro */}
            <div className="saas-subcard p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block mb-1">
                  Logo Principal (Modo Oscuro)
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">
                  Optimizado para superficies oscuras.
                </p>
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setDragField('logoDark');
                  }}
                  onDragLeave={() => setDragField(prev => (prev === 'logoDark' ? null : prev))}
                  onDrop={e => handleDropFile(e, 'logoDark')}
                  className={`h-32 bg-[#09090b] rounded-lg border border-dashed flex items-center justify-center p-3 overflow-hidden relative transition-colors ${
                    dragField === 'logoDark'
                      ? 'border-amber-400 ring-2 ring-amber-400/30'
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {customization.logoDark ? (
                    <>
                      <label
                        htmlFor={darkLogoInputId}
                        title="Haz clic para cambiar el logo modo oscuro"
                        className="w-full h-full flex items-center justify-center cursor-pointer"
                      >
                        <img
                          src={customization.logoDark}
                          alt="Logo Oscuro"
                          className="max-h-full max-w-full object-contain"
                        />
                      </label>
                      <button
                        type="button"
                        title="Quitar logo modo oscuro"
                        onClick={() => updateCustomization({ logoDark: '' })}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/75 text-zinc-300 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <label
                      htmlFor={darkLogoInputId}
                      className="w-full h-full flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center px-2"
                    >
                      <Upload className="h-4 w-4 text-zinc-400" />
                      <span className="text-xs text-zinc-400 font-medium">
                        Haz clic o arrastra imagen
                      </span>
                    </label>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={
                    customization.logoDark?.startsWith('data:')
                      ? '✓ Imagen subida (pega URL para cambiar)'
                      : 'URL o sube imagen'
                  }
                  value={
                    customization.logoDark?.startsWith('data:')
                      ? ''
                      : customization.logoDark || ''
                  }
                  onChange={e => updateCustomization({ logoDark: e.target.value })}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg saas-input"
                />
                <label
                  htmlFor={darkLogoInputId}
                  title="Subir logo modo oscuro"
                  className="cursor-pointer px-2.5 py-1.5 saas-btn-secondary rounded-lg flex items-center justify-center shrink-0 focus-within:ring-2 focus-within:ring-brand-500"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <input
                    id={darkLogoInputId}
                    type="file"
                    accept="image/*,.svg,.ico,.webp"
                    className="sr-only"
                    onChange={e => handleFileUpload(e, 'logoDark')}
                  />
                </label>
              </div>
            </div>

            {/* Favicon & Collapsed Nav Icon */}
            <div className="saas-subcard p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block mb-1">
                  Favicon & Isotipo Colapsado
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">
                  Ícono para pestaña y menú minimizado.
                </p>
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setDragField('favicon');
                  }}
                  onDragLeave={() => setDragField(prev => (prev === 'favicon' ? null : prev))}
                  onDrop={e => handleDropFile(e, 'favicon')}
                  className={`h-32 bg-zinc-100 dark:bg-[#141418] rounded-lg border border-dashed flex items-center justify-center gap-6 p-3 relative transition-colors ${
                    dragField === 'favicon'
                      ? 'border-amber-500 ring-2 ring-amber-500/30'
                      : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  <label
                    htmlFor={faviconInputId}
                    title="Haz clic para subir un Favicon"
                    className="flex flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 flex items-center justify-center">
                      {customization.favicon ? (
                        <img src={customization.favicon} alt="Favicon" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg">🍕</span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Pestaña</span>
                  </label>

                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: customization.primaryColor }}
                    >
                      {customization.collapsedLogo || '🍕'}
                    </div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Sidebar</span>
                  </div>

                  {customization.favicon && (
                    <button
                      type="button"
                      title="Quitar Favicon"
                      onClick={() => updateCustomization({ favicon: '' })}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900/75 text-white hover:text-rose-300 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="🍕"
                  value={customization.collapsedLogo || ''}
                  onChange={e => updateCustomization({ collapsedLogo: e.target.value })}
                  maxLength={4}
                  className="w-16 px-2 py-1.5 text-xs text-center rounded-lg saas-input shrink-0"
                />
                <input
                  type="text"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={
                    customization.favicon?.startsWith('data:')
                      ? '✓ Favicon subido'
                      : 'URL del Favicon'
                  }
                  value={
                    customization.favicon?.startsWith('data:')
                      ? ''
                      : customization.favicon || ''
                  }
                  onChange={e => updateCustomization({ favicon: e.target.value })}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg saas-input"
                />
                <label
                  htmlFor={faviconInputId}
                  title="Subir archivo de Favicon"
                  className="cursor-pointer px-2.5 py-1.5 saas-btn-secondary rounded-lg flex items-center justify-center shrink-0 focus-within:ring-2 focus-within:ring-brand-500"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <input
                    id={faviconInputId}
                    type="file"
                    accept="image/*,.svg,.ico,.webp"
                    className="sr-only"
                    onChange={e => handleFileUpload(e, 'favicon')}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
};
