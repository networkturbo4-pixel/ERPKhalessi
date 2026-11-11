import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { PermissionGate } from '../common/PermissionGate';
import { getReniecApiConfig, saveReniecApiConfig } from '../../utils/dniLookup';
import { getMapboxSettings, saveMapboxSettings, MapboxSettings } from '../../utils/mapboxConfig';
import { Bot, Key, Eye, EyeOff, Activity, Cpu, Sparkles, CheckCircle2, Save, Fingerprint, MapPin } from 'lucide-react';

export const ConnectionsTab: React.FC = () => {
  const { geminiConfig, updateGeminiConfig, testGeminiConnection, saveAllSettings, isSaving, customization, dispatchToast } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [reniecConfig, setReniecConfig] = useState(() => getReniecApiConfig());
  const [showReniecToken, setShowReniecToken] = useState(false);
  const [mapboxConfig, setMapboxConfig] = useState<MapboxSettings>(() => getMapboxSettings());
  const [showMapboxToken, setShowMapboxToken] = useState(false);
  const [isTestingMapbox, setIsTestingMapbox] = useState(false);

  const handleSaveReniec = () => {
    saveReniecApiConfig(reniecConfig);
    dispatchToast('API DNI RENIEC Guardada', 'Las consultas de DNI en POS y Clientes usarán esta configuración.', 'success');
  };

  const handleSaveMapbox = () => {
    saveMapboxSettings(mapboxConfig);
    dispatchToast('Mapbox GL API Guardada', 'El mapa ultra detallado de tiendas y checkout usará esta configuración.', 'success');
  };

  const handleTestMapbox = async () => {
    const token = mapboxConfig.accessToken.trim();
    if (!token) {
      dispatchToast('Token Vacío', 'Ingresa tu Access Token de Mapbox para probar la conexión.', 'warning');
      return;
    }
    setIsTestingMapbox(true);
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/Lima.json?limit=1&access_token=${token}`);
      if (res.ok) {
        dispatchToast('Mapbox GL Conectado', 'Token de Mapbox verificado exitosamente.', 'success');
      } else {
        dispatchToast('Token Inválido', `Mapbox rechazó la consulta (Status ${res.status}). Revisa los permisos de tu token.`, 'error');
      }
    } catch {
      dispatchToast('Error de Red', 'No se pudo contactar a api.mapbox.com. Revisa tu conexión.', 'error');
    } finally {
      setIsTestingMapbox(false);
    }
  };

  const handleRunDiagnostic = async () => {
    setIsDiagnosing(true);
    await testGeminiConnection();
    setIsDiagnosing(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
            <Bot className="h-5 w-5" style={{ color: customization.primaryColor }} />
            Integraciones e Inteligencia Artificial
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Conecta el motor de Google Gemini para predicción de demanda de ingredientes, recetas y optimización de mermas.
          </p>
        </div>

        <PermissionGate permission="settings:manage" hideInsteadOfBanner>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunDiagnostic}
              disabled={isDiagnosing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl saas-btn-secondary"
            >
              <Activity className={`h-3.5 w-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} style={isDiagnosing ? { color: customization.primaryColor } : undefined} />
              {isDiagnosing ? 'Verificando...' : 'Diagnosticar Conexión'}
            </button>
            <button
              type="button"
              onClick={saveAllSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Guardando...' : 'Guardar Motor IA'}
            </button>
          </div>
        </PermissionGate>
      </div>

      <PermissionGate permission="settings:manage">
        {/* Status card */}
        <div className="saas-card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm text-white"
                style={{ backgroundColor: customization.primaryColor }}
              >
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base text-zinc-950 dark:text-white">Google Gemini Generative AI</h3>
                  {geminiConfig.status === 'connected' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Operativo y Validado
                    </span>
                  ) : geminiConfig.status === 'checking' ? (
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 ring-1 ring-inset ring-amber-500/30 px-2.5 py-0.5 rounded-full">
                      Comprobando Cuota...
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 ring-1 ring-inset ring-rose-500/30 px-2.5 py-0.5 rounded-full">
                      Sin Conexión
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                  Modelo activo:{' '}
                  <span className="font-mono text-zinc-900 dark:text-amber-300 font-semibold">{geminiConfig.defaultModel}</span>
                  {' '}· Cuota: {geminiConfig.quotaRemaining || 'Verificada'}
                </p>
              </div>
            </div>

            <div className="md:text-right">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Último test de salud</span>
              <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                {geminiConfig.lastTestedAt || 'Pendiente de prueba'}
              </span>
            </div>
          </div>
        </div>

        {/* Configuration settings */}
        <div className="saas-card p-6 space-y-6">
          {/* API Key */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-2 flex items-center gap-2">
              <Key className="h-4 w-4" style={{ color: customization.primaryColor }} />
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={geminiConfig.apiKey}
                onChange={e => updateGeminiConfig({ apiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full pl-3.5 pr-10 py-2.5 text-xs font-mono rounded-xl saas-input"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
              Tu clave se almacena cifrada en variables de entorno seguras de PostgreSQL.
            </p>
          </div>

          {/* Model Selector & Temperature */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-2 flex items-center gap-2">
                <Cpu className="h-4 w-4" style={{ color: customization.primaryColor }} />
                Modelo Predeterminado
              </label>
              <select
                value={geminiConfig.defaultModel}
                onChange={e => updateGeminiConfig({ defaultModel: e.target.value as typeof geminiConfig.defaultModel })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl saas-input font-semibold"
              >
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Recomendado - Baja latencia)</option>
                <option value="gemini-3.8-pro">Gemini 3.8 Pro (Máxima capacidad de razonamiento)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                  Temperatura de Inferencia
                </label>
                <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                  {geminiConfig.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={geminiConfig.temperature}
                onChange={e => updateGeminiConfig({ temperature: parseFloat(e.target.value) })}
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                <span>0.0 (Preciso / Cálculos)</span>
                <span>1.0 (Creativo / Marketing)</span>
              </div>
            </div>
          </div>

          {/* AI Features in ERP */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block mb-3">
              Módulos Activos que Usan Gemini AI:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 saas-subcard">
                <span className="font-bold text-xs text-zinc-900 dark:text-white block">📊 Demanda Predictiva</span>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300/90 mt-1 leading-relaxed">
                  Calcula cuántos kilos de harina y queso mozzarella comprar según el clima y fecha.
                </p>
              </div>
              <div className="p-4 saas-subcard">
                <span className="font-bold text-xs text-zinc-900 dark:text-white block">🍕 Sugerencia de Mermas</span>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300/90 mt-1 leading-relaxed">
                  Genera promociones flash para insumos próximos a su fecha de vencimiento.
                </p>
              </div>
              <div className="p-4 saas-subcard">
                <span className="font-bold text-xs text-zinc-900 dark:text-white block">⭐ Respuesta a Reseñas</span>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300/90 mt-1 leading-relaxed">
                  Asistente en tiempo real para contestar feedback en Google Maps y pedidos de delivery.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RENIEC DNI API Integration Card */}
        <div className="saas-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-start gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
                style={{ backgroundColor: customization.primaryColor }}
              >
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-950 dark:text-white">
                  API Consulta DNI Perú (RENIEC / ApisPeru / Decolecta)
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Autocompleta nombres y apellidos al ingresar 8 dígitos en el POS y el módulo Clientes.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveReniec}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm whitespace-nowrap shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Save className="h-3.5 w-3.5" />
              Guardar API DNI
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reniec-endpoint" className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 block mb-1.5">
                Endpoint URL (usa {'{dni}'} como marcador)
              </label>
              <input
                id="reniec-endpoint"
                type="url"
                value={reniecConfig.endpointUrl}
                onChange={e => setReniecConfig(prev => ({ ...prev, endpointUrl: e.target.value }))}
                placeholder="https://api.apis.net.pe/v2/reniec/dni?numero={dni}"
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl saas-input"
              />
            </div>
            <div>
              <label htmlFor="reniec-token" className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 block mb-1.5">
                Bearer Token (Opcional en modo prueba)
              </label>
              <div className="relative">
                <input
                  id="reniec-token"
                  type={showReniecToken ? 'text' : 'password'}
                  value={reniecConfig.apiToken}
                  onChange={e => setReniecConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                  placeholder="apis-token-..."
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs font-mono rounded-xl saas-input"
                />
                <button
                  type="button"
                  aria-label={showReniecToken ? 'Ocultar token DNI' : 'Mostrar token DNI'}
                  onClick={() => setShowReniecToken(!showReniecToken)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  {showReniecToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mapbox GL Integration Card */}
        <div className="saas-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-start gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
                style={{ backgroundColor: customization.primaryColor }}
              >
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-950 dark:text-white flex items-center gap-2">
                  Mapbox GL API (Mapas y Cobertura a Ultra Detalle)
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Vectorial 3D
                  </span>
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Potencia el selector de tiendas, trazado de rutas de delivery con Mapbox Directions y cálculo de tiempos en tiempo real.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleTestMapbox}
                disabled={isTestingMapbox}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl saas-btn-secondary whitespace-nowrap shrink-0"
              >
                <Activity className={`h-3.5 w-3.5 ${isTestingMapbox ? 'animate-spin' : ''}`} />
                {isTestingMapbox ? 'Comprobando...' : 'Probar Token'}
              </button>
              <button
                type="button"
                onClick={handleSaveMapbox}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                <Save className="h-3.5 w-3.5" />
                Guardar Mapbox
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mapbox Access Token */}
            <div>
              <label htmlFor="mapbox-token" className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 block mb-1.5">
                Mapbox Public / Access Token (pk.ey...)
              </label>
              <div className="relative">
                <input
                  id="mapbox-token"
                  type={showMapboxToken ? 'text' : 'password'}
                  value={mapboxConfig.accessToken}
                  onChange={e => setMapboxConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                  placeholder="pk.eyJ1IjoieW91ci11c2VyIiwiYSI6ImNsb..."
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs font-mono rounded-xl saas-input"
                />
                <button
                  type="button"
                  aria-label={showMapboxToken ? 'Ocultar token Mapbox' : 'Mostrar token Mapbox'}
                  onClick={() => setShowMapboxToken(!showMapboxToken)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  {showMapboxToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Obtén tu token público gratis en <a href="https://account.mapbox.com" target="_blank" rel="noreferrer" className="underline font-medium hover:text-zinc-700 dark:hover:text-zinc-300">mapbox.com</a>
              </p>
            </div>

            {/* Mapbox Style URL */}
            <div>
              <label htmlFor="mapbox-style" className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 block mb-1.5">
                Estilo de Mapa (Mapbox Style URL)
              </label>
              <select
                id="mapbox-style"
                value={mapboxConfig.styleUrl}
                onChange={e => setMapboxConfig(prev => ({ ...prev, styleUrl: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl saas-input font-medium"
              >
                <option value="mapbox://styles/mapbox/streets-v12">Streets v12 (Detalle Completo Urbano)</option>
                <option value="mapbox://styles/mapbox/standard">Mapbox Standard 3D (Nueva Generación 3D)</option>
                <option value="mapbox://styles/mapbox/dark-v11">Dark v11 (Modo Oscuro Elegante)</option>
                <option value="mapbox://styles/mapbox/light-v11">Light v11 (Minimalista Claro)</option>
                <option value="mapbox://styles/mapbox/navigation-day-v1">Navigation Day (Optimizado para Tráfico)</option>
                <option value="mapbox://styles/mapbox/outdoors-v12">Outdoors v12 (Topografía y Relieve)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Latitud Centro</label>
              <input
                type="number"
                step="any"
                value={mapboxConfig.defaultLat}
                onChange={e => setMapboxConfig(prev => ({ ...prev, defaultLat: parseFloat(e.target.value) || -11.93605 }))}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl saas-input"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Longitud Centro</label>
              <input
                type="number"
                step="any"
                value={mapboxConfig.defaultLng}
                onChange={e => setMapboxConfig(prev => ({ ...prev, defaultLng: parseFloat(e.target.value) || -77.05432 }))}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl saas-input"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Zoom Inicial</label>
              <input
                type="number"
                min="5"
                max="20"
                step="0.5"
                value={mapboxConfig.defaultZoom}
                onChange={e => setMapboxConfig(prev => ({ ...prev, defaultZoom: parseFloat(e.target.value) || 13 }))}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl saas-input"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Inclinación 3D (Pitch)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={mapboxConfig.pitch3D}
                onChange={e => setMapboxConfig(prev => ({ ...prev, pitch3D: parseInt(e.target.value) || 45 }))}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl saas-input"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="enable-3d"
              checked={mapboxConfig.enable3DBuildings}
              onChange={e => setMapboxConfig(prev => ({ ...prev, enable3DBuildings: e.target.checked }))}
              className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
            />
            <label htmlFor="enable-3d" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Activar extrusión de edificios 3D realistas en mapas urbanos
            </label>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
};
