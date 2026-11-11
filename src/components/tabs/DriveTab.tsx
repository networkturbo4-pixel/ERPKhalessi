import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { PermissionGate } from '../common/PermissionGate';
import { Cloud, Folder, CheckCircle2, RefreshCw, Key, ShieldCheck, Save, X } from 'lucide-react';

export const DriveTab: React.FC = () => {
  const { driveConfig, updateDriveConfig, testDriveConnection, saveAllSettings, isSaving, customization } = useSettings();
  const [isTesting, setIsTesting] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);

  const mockDriveFolders = [
    { id: '1AbC_D98zX_khalessi_cloud_root', name: '📁 Khalessi_ERP_Cloud_Storage (Principal)' },
    { id: '2BcD_E87yW_facturas_pdf', name: '📁 Comprobantes_Facturacion_SUNAT' },
    { id: '3CdE_F76xV_recetas_fotos', name: '📁 Fotos_Platos_y_Pizzas' },
    { id: '4DeF_G65uT_backups_db', name: '📁 Copias_Seguridad_ERP' },
  ];

  const handleTestConnection = async () => {
    setIsTesting(true);
    await testDriveConnection();
    setIsTesting(false);
  };

  const storagePercent = Math.round((driveConfig.usedStorageGb / driveConfig.totalStorageGb) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
            <Cloud className="h-5 w-5" style={{ color: customization.primaryColor }} />
            Almacenamiento Cloud - Google Drive
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Conecta la cuenta de Google Drive corporativa para guardar facturas PDF, imágenes de comandas y backups.
          </p>
        </div>

        <PermissionGate permission="settings:manage" hideInsteadOfBanner>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl saas-btn-secondary"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} style={isTesting ? { color: customization.primaryColor } : undefined} />
              {isTesting ? 'Midiendo Latencia...' : 'Probar Conexión'}
            </button>
            <button
              type="button"
              onClick={saveAllSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Guardando...' : 'Guardar Credenciales'}
            </button>
          </div>
        </PermissionGate>
      </div>

      <PermissionGate permission="settings:manage">
        {/* Status card */}
        <div className="saas-card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-sky-500/15 ring-1 ring-sky-500/30 flex items-center justify-center shrink-0">
                <Cloud className="h-6 w-6 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base text-zinc-950 dark:text-white">Google Drive API v3</h3>
                  {driveConfig.isConnected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Conectado ({driveConfig.latencyMs} ms)
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 ring-1 ring-inset ring-rose-500/30 px-2.5 py-0.5 rounded-full">
                      Desconectado
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                  Carpeta de destino vinculada:{' '}
                  <span className="font-mono text-zinc-900 dark:text-amber-300 font-semibold">{driveConfig.rootFolderName}</span>
                </p>
              </div>
            </div>

            {/* Storage Quota */}
            <div className="w-full md:w-64 space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-300">
                <span>Capacidad Workspace</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                  {driveConfig.usedStorageGb} / {driveConfig.totalStorageGb} GB
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block text-right">
                {storagePercent}% en uso ({driveConfig.totalStorageGb - driveConfig.usedStorageGb} GB libres)
              </span>
            </div>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="saas-card p-6 space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-3">
              Método de Autenticación de Google Cloud
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => updateDriveConfig({ authMethod: 'service_account' })}
                className={`p-4 rounded-xl text-left text-xs ${
                  driveConfig.authMethod === 'service_account' ? 'saas-option-active' : 'saas-option'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4" style={{ color: customization.primaryColor }} />
                  <span className="font-bold text-zinc-900 dark:text-white">Service Account JSON (Recomendado)</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300/90 font-normal">
                  Ideal para procesos en segundo plano de sincronización y emisión de comprobantes.
                </p>
              </button>

              <button
                type="button"
                onClick={() => updateDriveConfig({ authMethod: 'oauth2' })}
                className={`p-4 rounded-xl text-left text-xs ${
                  driveConfig.authMethod === 'oauth2' ? 'saas-option-active' : 'saas-option'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Key className="h-4 w-4" style={{ color: customization.primaryColor }} />
                  <span className="font-bold text-zinc-900 dark:text-white">Credenciales OAuth 2.0</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300/90 font-normal">
                  Requiere consentimiento manual y refresco continuo de tokens de acceso.
                </p>
              </button>
            </div>
          </div>

          {driveConfig.authMethod === 'service_account' ? (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-1.5">
                  Client Email de la Cuenta de Servicio
                </label>
                <input
                  type="email"
                  value={driveConfig.serviceAccountEmail || ''}
                  onChange={e => updateDriveConfig({ serviceAccountEmail: e.target.value })}
                  placeholder="ejemplo@proyecto-gcp.iam.gserviceaccount.com"
                  className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-1.5">
                  Clave Privada RSA (Private Key PEM)
                </label>
                <textarea
                  rows={4}
                  value={driveConfig.privateKey || ''}
                  onChange={e => updateDriveConfig({ privateKey: e.target.value })}
                  placeholder="-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----"
                  className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs font-mono"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-1.5">
                  Client ID de OAuth
                </label>
                <input
                  type="text"
                  value={driveConfig.clientId || ''}
                  onChange={e => updateDriveConfig({ clientId: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl saas-input font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-1.5">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={driveConfig.clientSecret || ''}
                  onChange={e => updateDriveConfig({ clientSecret: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl saas-input font-mono"
                />
              </div>
            </div>
          )}

          {/* Root Folder Explorer */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-2">
              Carpeta Raíz en Google Drive (rootFolderId)
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Folder className="absolute left-3 top-2.5 h-4 w-4 text-amber-500" />
                <input
                  type="text"
                  value={driveConfig.rootFolderId}
                  onChange={e => updateDriveConfig({ rootFolderId: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl saas-input font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFolderModal(true)}
                className="px-4 py-2 text-xs font-semibold saas-btn-secondary rounded-xl shrink-0"
              >
                Explorar Carpetas
              </button>
            </div>
          </div>
        </div>

        {/* Modal Explorador de Carpetas */}
        {showFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-white dark:bg-[#18181c] rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Folder className="h-4 w-4 text-amber-500" />
                  Selecciona la Carpeta Raíz de Drive
                </h3>
                <button onClick={() => setShowFolderModal(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {mockDriveFolders.map(folder => {
                  const active = driveConfig.rootFolderId === folder.id;
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => {
                        updateDriveConfig({ rootFolderId: folder.id, rootFolderName: folder.name });
                        setShowFolderModal(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs flex items-center justify-between ${
                        active ? 'saas-option-active font-semibold' : 'saas-option'
                      }`}
                    >
                      <span className="truncate">{folder.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0 ml-2">
                        {folder.id.substring(0, 10)}...
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg saas-btn-secondary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </PermissionGate>
    </div>
  );
};
