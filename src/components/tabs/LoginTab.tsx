import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { PermissionGate } from '../common/PermissionGate';
import { WelcomeSlide } from '../../types/settings';
import { LogIn, SplitSquareVertical, MoveUp, MoveDown, Plus, Trash2, Eye, Check, Layers, ExternalLink } from 'lucide-react';

export const LoginTab: React.FC = () => {
  const { customization, updateCustomization, saveAllSettings, isSaving, logoutSession } = useSettings();
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const { loginConfig } = customization;

  const updateLogin = (partial: Partial<typeof loginConfig>) => {
    updateCustomization({
      loginConfig: {
        ...loginConfig,
        ...partial,
      },
    });
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const slides = [...loginConfig.slides];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const temp = slides[index];
    slides[index] = slides[targetIndex];
    slides[targetIndex] = temp;

    updateLogin({ slides });
    setActiveSlideIndex(targetIndex);
  };

  const handleAddSlide = () => {
    const newSlide: WelcomeSlide = {
      id: `slide-${Date.now()}`,
      title: 'Nueva Sede en Expansión',
      subtitle: 'Conectando las mejores cocinas con entrega en tiempo récord.',
      imageUrl: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1200&q=80',
    };
    updateLogin({ slides: [...loginConfig.slides, newSlide] });
    setActiveSlideIndex(loginConfig.slides.length);
  };

  const handleDeleteSlide = (id: string) => {
    if (loginConfig.slides.length <= 1) return;
    const filtered = loginConfig.slides.filter(s => s.id !== id);
    updateLogin({ slides: filtered });
    setActiveSlideIndex(0);
  };

  const handleUpdateSlide = (index: number, partial: Partial<WelcomeSlide>) => {
    const slides = [...loginConfig.slides];
    slides[index] = { ...slides[index], ...partial };
    updateLogin({ slides });
  };

  const currentPreviewSlide = loginConfig.slides[activeSlideIndex] || loginConfig.slides[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
            <LogIn className="h-5 w-5" style={{ color: customization.primaryColor }} />
            Experiencia de Inicio de Sesión
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Diseña la primera impresión de los colaboradores: carrusel publicitario, efectos glassmorphism y marca.
          </p>
        </div>

        <PermissionGate permission="settings:manage" hideInsteadOfBanner>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={logoutSession}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl saas-btn-secondary whitespace-nowrap shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Probar Login Real
            </button>
            <button
              type="button"
              onClick={saveAllSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-95 disabled:opacity-50 whitespace-nowrap shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Check className="h-3.5 w-3.5" />
              {isSaving ? 'Guardando...' : 'Guardar Pantalla de Login'}
            </button>
          </div>
        </PermissionGate>
      </div>

      <PermissionGate permission="settings:manage">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Controls */}
          <div className="xl:col-span-7 space-y-6">
            {/* Layout selector */}
            <div className="saas-card p-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-3">
                Distribución de la Pantalla (Layout)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => updateLogin({ layout: 'split' })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl text-xs text-center ${
                    loginConfig.layout === 'split' ? 'saas-option-active' : 'saas-option'
                  }`}
                >
                  <SplitSquareVertical
                    className="h-6 w-6"
                    style={loginConfig.layout === 'split' ? { color: customization.primaryColor } : undefined}
                  />
                  <span className="font-semibold text-zinc-900 dark:text-white">Pantalla Dividida con Carrusel</span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-300/90 font-normal">
                    Ideal para pantallas anchas y branding visual
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => updateLogin({ layout: 'centered' })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl text-xs text-center ${
                    loginConfig.layout === 'centered' ? 'saas-option-active' : 'saas-option'
                  }`}
                >
                  <Layers
                    className="h-6 w-6"
                    style={loginConfig.layout === 'centered' ? { color: customization.primaryColor } : undefined}
                  />
                  <span className="font-semibold text-zinc-900 dark:text-white">Caja Centrada con Fondo</span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-300/90 font-normal">
                    Enfoque minimalista y directo al formulario
                  </span>
                </button>
              </div>

              {/* Glassmorphism & Button Color */}
              <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3.5 saas-subcard cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Efecto Glassmorphism</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Difuminado y translucidez</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={loginConfig.glassmorphism}
                    onChange={e => updateLogin({ glassmorphism: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                </label>

                <div className="flex items-center justify-between p-3.5 saas-subcard">
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Color Botón de Ingreso</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Botón 'Iniciar Sesión'</span>
                  </div>
                  <input
                    type="color"
                    value={loginConfig.buttonColor}
                    onChange={e => updateLogin({ buttonColor: e.target.value })}
                    className="h-8 w-10 cursor-pointer rounded saas-input p-0.5"
                  />
                </div>
              </div>
            </div>

            {/* Slides Manager */}
            <div className="saas-card p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                    Diapositivas de Bienvenida ({loginConfig.slides.length})
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Rotan en el panel lateral inspirando al equipo de cocina y sala.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSlide}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:opacity-90 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Nueva Diapositiva
                </button>
              </div>

              <div className="space-y-3">
                {loginConfig.slides.map((slide, idx) => {
                  const active = activeSlideIndex === idx;
                  return (
                    <div
                      key={slide.id}
                      className={`p-4 rounded-xl ${active ? 'saas-option-active' : 'saas-subcard'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {slide.title || 'Sin Título'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSlide(idx, 'up')}
                            className="p-1 text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30"
                            title="Subir orden"
                          >
                            <MoveUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === loginConfig.slides.length - 1}
                            onClick={() => handleMoveSlide(idx, 'down')}
                            className="p-1 text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30"
                            title="Bajar orden"
                          >
                            <MoveDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveSlideIndex(idx)}
                            className="p-1 text-brand-600 dark:text-brand-400 hover:opacity-80"
                            title="Previsualizar"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={loginConfig.slides.length <= 1}
                            onClick={() => handleDeleteSlide(slide.id)}
                            className="p-1 text-rose-500 dark:text-rose-400 hover:text-rose-600 disabled:opacity-30"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          placeholder="Título de la diapositiva"
                          value={slide.title}
                          onChange={e => handleUpdateSlide(idx, { title: e.target.value })}
                          className="px-2.5 py-1.5 text-xs rounded-lg saas-input"
                        />
                        <input
                          type="text"
                          placeholder="URL de imagen de fondo"
                          value={slide.imageUrl}
                          onChange={e => handleUpdateSlide(idx, { imageUrl: e.target.value })}
                          className="px-2.5 py-1.5 text-xs rounded-lg saas-input"
                        />
                      </div>
                      <div className="mt-2.5">
                        <input
                          type="text"
                          placeholder="Subtítulo o frase inspiradora"
                          value={slide.subtitle}
                          onChange={e => handleUpdateSlide(idx, { subtitle: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg saas-input"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Login Preview */}
          <div className="xl:col-span-5 xl:sticky xl:top-6">
            <div className="saas-card p-5">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                  Previsualización Login
                </span>
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  Slide {activeSlideIndex + 1} / {loginConfig.slides.length}
                </span>
              </div>

              {/* Login Simulator Frame (Left Numeric Keypad + Right Full-Bleed Slider) */}
              <div className="w-full h-[460px] rounded-xl overflow-hidden shadow-xl relative flex flex-col bg-[#09090b] border border-zinc-700">
                {loginConfig.layout === 'split' ? (
                  <div className="w-full h-full flex flex-col sm:flex-row">
                    {/* Left Numeric Keypad Side */}
                    <div className="sm:w-[46%] h-full p-4 bg-[#121216] border-r border-zinc-800 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                          {customization.appName}
                        </span>
                        <h5 className="text-xs font-bold text-white mt-0.5">DNI / PIN (8, 6 o 4 dígitos)</h5>
                        <div className="grid grid-cols-8 gap-1 mt-2">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div
                              key={i}
                              className="h-5 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[9px] font-mono text-white"
                              style={i < 4 ? { borderColor: customization.primaryColor } : undefined}
                            >
                              {i < 4 ? '•' : ''}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 my-2">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(k => (
                          <div
                            key={k}
                            className="h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[11px] font-mono font-bold text-zinc-100"
                          >
                            {k}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={logoutSession}
                        className="w-full py-1.5 text-[11px] font-bold text-white rounded-lg shadow-sm"
                        style={{ backgroundColor: loginConfig.buttonColor }}
                      >
                        Iniciar Turno en ERP
                      </button>
                    </div>

                    {/* Right Full-Width Slider Side */}
                    <div className="relative sm:w-[54%] hidden sm:flex h-full overflow-hidden flex-col justify-end p-5 text-white">
                      <img
                        src={currentPreviewSlide?.imageUrl}
                        alt="Slide Background"
                        className="absolute inset-0 w-full h-full object-cover opacity-75"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                      <div
                        className={`relative z-10 ${
                          loginConfig.glassmorphism
                            ? 'p-3.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/15'
                            : ''
                        }`}
                      >
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white"
                          style={{ backgroundColor: customization.primaryColor }}
                        >
                          Slider Full-Width
                        </span>
                        <h4 className="text-sm font-bold mt-1.5 line-clamp-2">{currentPreviewSlide?.title}</h4>
                        <p className="text-[11px] text-zinc-200 mt-1 line-clamp-2">{currentPreviewSlide?.subtitle}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Centered Layout
                  <div className="w-full h-full relative flex items-center justify-center p-6">
                    <img
                      src={currentPreviewSlide?.imageUrl}
                      alt="Background"
                      className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm"
                    />
                    <div className="relative z-10 w-full max-w-xs p-5 rounded-2xl bg-zinc-900/95 backdrop-blur-md border border-zinc-700 text-center">
                      <span className="text-2xl mb-1 block">🍕</span>
                      <h4 className="text-sm font-bold text-white">{customization.appName}</h4>
                      <p className="text-[11px] text-zinc-300 mb-4">{customization.slogan}</p>
                      <button
                        type="button"
                        className="w-full py-2 text-xs font-bold text-white rounded-lg"
                        style={{ backgroundColor: loginConfig.buttonColor }}
                      >
                        Iniciar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
};
