import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { PermissionGate } from '../common/PermissionGate';
import { getMapboxSettings, saveMapboxSettings, MapboxSettings } from '../../utils/mapboxConfig';
import {
  getFacturaloConfig,
  saveFacturaloConfig,
  lookupDniFacturalo,
  lookupRucFacturalo,
  FacturaloDniResponse,
  FacturaloRucResponse,
} from '../../utils/facturaloApi';
import { FacturaloConfig } from '../../types/settings';
import {
  Bot,
  Key,
  Eye,
  EyeOff,
  Activity,
  Cpu,
  Sparkles,
  CheckCircle2,
  Save,
  MapPin,
  Receipt,
  Building2,
  Search,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

export const ConnectionsTab: React.FC = () => {
  const {
    geminiConfig,
    updateGeminiConfig,
    testGeminiConnection,
    saveAllSettings,
    isSaving,
    customization,
    dispatchToast,
    companyInfo,
    updateCompanyInfo,
  } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [mapboxConfig, setMapboxConfig] = useState<MapboxSettings>(() => getMapboxSettings());
  const [showMapboxToken, setShowMapboxToken] = useState(false);
  const [isTestingMapbox, setIsTestingMapbox] = useState(false);

  // Facturalo PRO state (Unifica Facturacion, RENIEC DNI y SUNAT RUC)
  const [facturaloConfig, setFacturaloConfig] = useState<FacturaloConfig>(() => ({
    ...getFacturaloConfig(),
    ...(companyInfo.facturaloConfig || {}),
  }));
  const [showFacturaloToken, setShowFacturaloToken] = useState(false);
  const [showTestToken, setShowTestToken] = useState(false);
  const [showLiveToken, setShowLiveToken] = useState(false);
  const [showMultiToken, setShowMultiToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyText = (text: string, keyName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    dispatchToast('Copiado', 'Texto copiado al portapapeles.', 'info');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const [testDni, setTestDni] = useState('');
  const [isTestingFacturaloDni, setIsTestingFacturaloDni] = useState(false);
  const [dniTestResult, setDniTestResult] = useState<FacturaloDniResponse | null>(null);
  const [testRuc, setTestRuc] = useState('');
  const [isTestingFacturaloRuc, setIsTestingFacturaloRuc] = useState(false);
  const [rucTestResult, setRucTestResult] = useState<FacturaloRucResponse | null>(null);

  const handleSaveFacturalo = () => {
    saveFacturaloConfig(facturaloConfig);
    updateCompanyInfo({ facturaloConfig });
    dispatchToast(
      'Factúralo PRO Guardado',
      'La configuración de API y consultas DNI/RUC ha sido sincronizada.',
      'success'
    );
  };

  const handleTestFacturaloDni = async () => {
    const cleanDni = testDni.replace(/\D/g, '');
    if (cleanDni.length !== 8) {
      dispatchToast('DNI Inválido', 'Ingresa un DNI de 8 dígitos para realizar la prueba.', 'warning');
      return;
    }
    setIsTestingFacturaloDni(true);
    setDniTestResult(null);
    try {
      saveFacturaloConfig(facturaloConfig);
      const res = await lookupDniFacturalo(cleanDni);
      setDniTestResult(res);
      if (res && res.success) {
        dispatchToast('DNI Encontrado', `Titular: ${res.fullName}`, 'success');
      } else {
        dispatchToast('Consulta Fallida', res?.message || 'No se obtuvieron datos para el DNI ingresado.', 'error');
      }
    } catch {
      dispatchToast('Error de Conexión', 'No se pudo contactar con la API de Factúralo.', 'error');
    } finally {
      setIsTestingFacturaloDni(false);
    }
  };

  const handleTestFacturaloRuc = async () => {
    const cleanRuc = testRuc.replace(/\D/g, '');
    if (cleanRuc.length !== 11) {
      dispatchToast('RUC Inválido', 'Ingresa un RUC de 11 dígitos para realizar la prueba.', 'warning');
      return;
    }
    setIsTestingFacturaloRuc(true);
    setRucTestResult(null);
    try {
      saveFacturaloConfig(facturaloConfig);
      const res = await lookupRucFacturalo(cleanRuc);
      setRucTestResult(res);
      if (res && res.success) {
        dispatchToast('RUC Verificado', `${res.razonSocial} (${res.estado})`, 'success');
      } else {
        dispatchToast('Consulta Fallida', res?.message || 'No se obtuvieron datos para el RUC ingresado.', 'error');
      }
    } catch {
      dispatchToast('Error de Conexión', 'No se pudo contactar con la API de Factúralo.', 'error');
    } finally {
      setIsTestingFacturaloRuc(false);
    }
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

        {/* Facturalo PRO API Integration Card (docs.facturalo.pe) */}
        <div className="saas-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-start gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
                style={{ backgroundColor: customization.primaryColor }}
              >
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base text-zinc-950 dark:text-white">
                    Facturación Electrónica SUNAT & APIs (docs.facturalo.pe)
                  </h3>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      facturaloConfig.enabled
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                    }`}
                  >
                    {facturaloConfig.enabled ? 'Módulo Activo' : 'Desactivado'}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {facturaloConfig.environment === 'production' ? 'Producción SUNAT' : 'Sandbox / Demo'}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Conexión oficial UBL 2.1 con Factúralo PRO para emisión de Boletas, Facturas y consulta de DNI (RENIEC) y RUC (SUNAT).{' '}
                  <a
                    href="https://docs.facturalo.pe"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 font-semibold underline text-amber-600 dark:text-amber-400 hover:opacity-80"
                  >
                    Ver Documentación Oficial <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveFacturalo}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm whitespace-nowrap shrink-0 transition-opacity hover:opacity-95"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Save className="h-3.5 w-3.5" />
              Guardar Factúralo
            </button>
          </div>

          {/* Switch & Environment Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Activar Integración Factúralo
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Habilita emisión y consultas DNI/RUC
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={facturaloConfig.enabled}
                  onChange={e =>
                    setFacturaloConfig(prev => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 block mb-1.5">
                Entorno de Operación
              </label>
              <select
                value={facturaloConfig.environment}
                onChange={e =>
                  setFacturaloConfig(prev => ({
                    ...prev,
                    environment: e.target.value as 'demo' | 'production',
                  }))
                }
                className="w-full px-3.5 py-2.5 text-xs rounded-xl saas-input font-medium"
              >
                <option value="demo">🧪 Modo Demo / Pruebas (Beta SUNAT)</option>
                <option value="production">🚀 Producción Oficial (Validez Fiscal SUNAT)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Auto-emisión en Tienda
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Emitir comprobante tras pago confirmado
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(facturaloConfig.autoEmitOnPaid)}
                  onChange={e =>
                    setFacturaloConfig(prev => ({ ...prev, autoEmitOnPaid: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
          </div>

          {/* Endpoint URL Base */}
          <div>
            <label htmlFor="facturalo-endpoint" className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 block mb-1.5">
              Endpoint URL Base de Factúralo PRO
            </label>
            <input
              id="facturalo-endpoint"
              type="url"
              value={facturaloConfig.apiUrl}
              onChange={e =>
                setFacturaloConfig(prev => ({ ...prev, apiUrl: e.target.value }))
              }
              placeholder="https://api.facturalo.pe/api/v3 o tu subdominio"
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl saas-input"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Servidor de tu instancia Factúralo PRO (ej. https://api.facturalo.pe/api/v3)
            </p>
          </div>

          {/* API Keys Layout Fiel al Panel de Facturalo.pe */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">API keys</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tokens para emitir con la API REST. El token decide el entorno: <code className="font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">sk_test_</code> va a Demo y <code className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">sk_live_</code> a SUNAT.
              </p>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Tokens de
                </span>
                <input
                  type="text"
                  value={facturaloConfig.companyName || 'THE ROMA AGENCY CORPORACION S.A.C.'}
                  onChange={e => setFacturaloConfig(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Razón Social Emisor"
                  className="text-xs font-bold text-zinc-900 dark:text-white bg-transparent border-b border-dashed border-zinc-300 dark:border-zinc-700 px-1 py-0.5 focus:outline-none focus:border-amber-500"
                />
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Uno por entorno. Envíalo en el header <code className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">Authorization</code> tal cual (sin la palabra Bearer).
              </p>
            </div>

            {/* Side-by-side: Demo & Live Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Demo Card */}
              <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 uppercase tracking-wide">
                    Demo
                  </span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Pruebas. Los comprobantes no tienen validez ante SUNAT.
                  </span>
                </div>

                <div className="relative">
                  <input
                    type={showTestToken ? 'text' : 'password'}
                    value={facturaloConfig.testSecretKey || ''}
                    onChange={e => setFacturaloConfig(prev => ({ ...prev, testSecretKey: e.target.value }))}
                    placeholder="sk_test_..."
                    className="w-full pl-3.5 pr-20 py-2 text-xs font-mono rounded-xl saas-input"
                  />
                  <div className="absolute right-2 top-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={showTestToken ? 'Ocultar token' : 'Mostrar token'}
                      onClick={() => setShowTestToken(!showTestToken)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      {showTestToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      aria-label="Copiar token demo"
                      onClick={() => handleCopyText(facturaloConfig.testSecretKey || '', 'test-token')}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      {copiedKey === 'test-token' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900 text-zinc-200 rounded-xl font-mono text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-800">
                    <span>Ejemplo</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          `curl -X POST ${facturaloConfig.apiUrl || 'https://api.facturalo.pe/api/v3'}/documentos/enviar \\\n  -H "Authorization: ${facturaloConfig.testSecretKey || 'sk_test_...'}" \\\n  -H "Content-Type: application/json" \\\n  -d @factura.json`,
                          'curl-demo'
                        )
                      }
                      className="inline-flex items-center gap-1 text-[10px] text-zinc-300 hover:text-white"
                    >
                      {copiedKey === 'curl-demo' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="text-zinc-300 whitespace-pre overflow-x-auto text-[10.5px]">
{`curl -X POST ${facturaloConfig.apiUrl || 'https://api.facturalo.pe/api/v3'}/documentos/enviar \\
  -H "Authorization: ${facturaloConfig.testSecretKey ? facturaloConfig.testSecretKey.slice(0, 14) + '...' : 'sk_test_m1cA...'}" \\
  -H "Content-Type: application/json" \\
  -d @factura.json`}
                  </pre>
                </div>
              </div>

              {/* Live Card */}
              <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                    Live
                  </span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Producción. Los comprobantes se envían a SUNAT.
                  </span>
                </div>

                <div className="relative">
                  <input
                    type={showLiveToken ? 'text' : 'password'}
                    value={facturaloConfig.liveSecretKey || ''}
                    onChange={e => setFacturaloConfig(prev => ({ ...prev, liveSecretKey: e.target.value }))}
                    placeholder="sk_live_..."
                    className="w-full pl-3.5 pr-20 py-2 text-xs font-mono rounded-xl saas-input"
                  />
                  <div className="absolute right-2 top-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={showLiveToken ? 'Ocultar token' : 'Mostrar token'}
                      onClick={() => setShowLiveToken(!showLiveToken)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      {showLiveToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      aria-label="Copiar token live"
                      onClick={() => handleCopyText(facturaloConfig.liveSecretKey || '', 'live-token')}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      {copiedKey === 'live-token' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900 text-zinc-200 rounded-xl font-mono text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-800">
                    <span>Ejemplo</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          `curl -X POST ${facturaloConfig.apiUrl || 'https://api.facturalo.pe/api/v3'}/documentos/enviar \\\n  -H "Authorization: ${facturaloConfig.liveSecretKey || 'sk_live_...'}" \\\n  -H "Content-Type: application/json" \\\n  -d @factura.json`,
                          'curl-live'
                        )
                      }
                      className="inline-flex items-center gap-1 text-[10px] text-zinc-300 hover:text-white"
                    >
                      {copiedKey === 'curl-live' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="text-zinc-300 whitespace-pre overflow-x-auto text-[10.5px]">
{`curl -X POST ${facturaloConfig.apiUrl || 'https://api.facturalo.pe/api/v3'}/documentos/enviar \\
  -H "Authorization: ${facturaloConfig.liveSecretKey ? facturaloConfig.liveSecretKey.slice(0, 14) + '...' : 'sk_live_8zDt...'}" \\
  -H "Content-Type: application/json" \\
  -d @factura.json`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Token de cuenta (multiempresa) */}
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Token de cuenta (multiempresa)</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Para software y SaaS que facturan por varias empresas: con este token creas y administras empresas por API (POST /empresas). Cada empresa recibe sus propios tokens para emitir.
                </p>
              </div>

              <div className="relative">
                <input
                  type={showMultiToken ? 'text' : 'password'}
                  value={facturaloConfig.multiCompanyToken || ''}
                  onChange={e => setFacturaloConfig(prev => ({ ...prev, multiCompanyToken: e.target.value }))}
                  placeholder="user_sk_..."
                  className="w-full pl-3.5 pr-20 py-2 text-xs font-mono rounded-xl saas-input"
                />
                <div className="absolute right-2 top-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={showMultiToken ? 'Ocultar token' : 'Mostrar token'}
                    onClick={() => setShowMultiToken(!showMultiToken)}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    {showMultiToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    aria-label="Copiar token multiempresa"
                    onClick={() => handleCopyText(facturaloConfig.multiCompanyToken || '', 'multi-token')}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    {copiedKey === 'multi-token' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-zinc-900 text-zinc-200 rounded-xl font-mono text-[11px] space-y-1.5">
                <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-800">
                  <span>Ejemplo</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        `curl -X POST ${facturaloConfig.apiUrl || 'https://api.facturalo.pe/api/v3'}/empresas \\\n  -H "Authorization: ${facturaloConfig.multiCompanyToken || 'user_sk_...'}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"empresa": {"ruc": "20123456789", "nombre": "MI CLIENTE S.A.C.", "direccion": "-"}}'`,
                        'curl-multi'
                      )
                    }
                    className="inline-flex items-center gap-1 text-[10px] text-zinc-300 hover:text-white"
                  >
                    {copiedKey === 'curl-multi' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <pre className="text-zinc-300 whitespace-pre overflow-x-auto text-[10.5px]">
{`curl -X POST ${facturaloConfig.apiUrl || 'https://api.facturalo.pe/api/v3'}/empresas \\
  -H "Authorization: ${facturaloConfig.multiCompanyToken ? facturaloConfig.multiCompanyToken.slice(0, 14) + '...' : 'user_sk_...'}" \\
  -H "Content-Type: application/json" \\
  -d '{"empresa": {"ruc": "20123456789", "nombre": "MI CLIENTE S.A.C.", "direccion": "-"}}'`}
                </pre>
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                No sirve para emitir comprobantes: para eso usa el token de cada empresa.
              </p>
            </div>
          </div>

          {/* Series configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="series-boleta" className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 block mb-1.5">
                Serie por Defecto para Boletas
              </label>
              <input
                id="series-boleta"
                type="text"
                maxLength={4}
                value={facturaloConfig.defaultSeriesBoleta || 'B001'}
                onChange={e =>
                  setFacturaloConfig(prev => ({
                    ...prev,
                    defaultSeriesBoleta: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="B001"
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl saas-input uppercase"
              />
            </div>
            <div>
              <label htmlFor="series-factura" className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 block mb-1.5">
                Serie por Defecto para Facturas
              </label>
              <input
                id="series-factura"
                type="text"
                maxLength={4}
                value={facturaloConfig.defaultSeriesFactura || 'F001'}
                onChange={e =>
                  setFacturaloConfig(prev => ({
                    ...prev,
                    defaultSeriesFactura: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="F001"
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl saas-input uppercase"
              />
            </div>
          </div>

          {/* Live Tester for DNI and RUC */}
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Search className="h-4 w-4" style={{ color: customization.primaryColor }} />
              Banco de Pruebas en Vivo (Consultas RENIEC y SUNAT)
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Test DNI */}
              <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                  Probar Consulta DNI (RENIEC / Factúralo)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={8}
                    value={testDni}
                    onChange={e => setTestDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej. 45678901"
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-xl saas-input"
                  />
                  <button
                    type="button"
                    onClick={handleTestFacturaloDni}
                    disabled={isTestingFacturaloDni || testDni.length !== 8}
                    className="px-3 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50 whitespace-nowrap shrink-0"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    {isTestingFacturaloDni ? 'Buscando...' : 'Consultar DNI'}
                  </button>
                </div>
                {dniTestResult && (
                  <div
                    className={`p-2.5 rounded-lg text-xs border ${
                      dniTestResult.success
                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/20'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {dniTestResult.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <span>⚠️</span>
                      )}
                      <span>{dniTestResult.message}</span>
                    </div>
                    {dniTestResult.success && (
                      <div className="mt-1 text-[11px] space-y-0.5">
                        <p>
                          <span className="font-semibold">Titular:</span> {dniTestResult.fullName}
                        </p>
                        {dniTestResult.direccion && (
                          <p>
                            <span className="font-semibold">Dirección:</span> {dniTestResult.direccion}
                          </p>
                        )}
                        <p className="text-[10px] opacity-75">
                          Fuente: {dniTestResult.source === 'facturalo' ? 'API Factúralo PRO (RENIEC)' : 'Padrón de Respaldo'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Test RUC */}
              <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                  Probar Consulta RUC (SUNAT / Factúralo)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={11}
                    value={testRuc}
                    onChange={e => setTestRuc(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej. 20601234567"
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-xl saas-input"
                  />
                  <button
                    type="button"
                    onClick={handleTestFacturaloRuc}
                    disabled={isTestingFacturaloRuc || testRuc.length !== 11}
                    className="px-3 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50 whitespace-nowrap shrink-0"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    {isTestingFacturaloRuc ? 'Buscando...' : 'Consultar RUC'}
                  </button>
                </div>
                {rucTestResult && (
                  <div
                    className={`p-2.5 rounded-lg text-xs border ${
                      rucTestResult.success
                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/20'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {rucTestResult.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <span>⚠️</span>
                      )}
                      <span>{rucTestResult.message}</span>
                    </div>
                    {rucTestResult.success && (
                      <div className="mt-1 text-[11px] space-y-0.5">
                        <p>
                          <span className="font-semibold">Razón Social:</span> {rucTestResult.razonSocial}
                        </p>
                        <p>
                          <span className="font-semibold">Estado / Condición:</span>{' '}
                          <span className="text-emerald-600 font-bold">{rucTestResult.estado}</span> - {rucTestResult.condicion}
                        </p>
                        <p>
                          <span className="font-semibold">Dirección Fiscal:</span> {rucTestResult.direccion}
                        </p>
                        <p className="text-[10px] opacity-75">
                          Fuente: {rucTestResult.source === 'facturalo' ? 'API Factúralo PRO (SUNAT)' : 'Padrón de Respaldo SUNAT'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
