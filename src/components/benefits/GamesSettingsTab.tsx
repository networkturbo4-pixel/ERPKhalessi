import React, { useState, useRef } from 'react';
import {
  Gamepad2,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  RotateCw,
  Trophy,
  Palette,
  Sliders,
  Settings,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useBenefits } from '../../context/BenefitsContext';
import { useSettings } from '../../context/SettingsContext';
import {
  GamePrizeItem,
  GameType,
  GameFrequency,
  GameWinAnimation,
  GameLoseAnimation,
} from '../../types/benefits';

export const GamesSettingsTab: React.FC = () => {
  const { gameSettings, updateGameSettings } = useBenefits();
  const { dispatchToast } = useSettings();

  // Test spin preview state
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinResult, setSpinResult] = useState<GamePrizeItem | null>(null);

  // Modal para agregar o editar premio
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null);
  const [przLabel, setPrzLabel] = useState('');
  const [przType, setPrzType] = useState<GamePrizeItem['rewardType']>('discount_percent');
  const [przDiscountValue, setPrzDiscountValue] = useState(10);
  const [przFreeProduct, setPrzFreeProduct] = useState('Gaseosa 1.5L');
  const [przPoints, setPrzPoints] = useState(2);
  const [przColor, setPrzColor] = useState('#f59e0b');
  const [przWeight, setPrzWeight] = useState(5);
  const [przIsWinning, setPrzIsWinning] = useState(true);

  const openAddPrizeModal = () => {
    setEditingPrizeId(null);
    setPrzLabel('');
    setPrzType('discount_percent');
    setPrzDiscountValue(10);
    setPrzFreeProduct('');
    setPrzPoints(2);
    setPrzColor('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
    setPrzWeight(5);
    setPrzIsWinning(true);
    setIsPrizeModalOpen(true);
  };

  const openEditPrizeModal = (prize: GamePrizeItem) => {
    setEditingPrizeId(prize.id);
    setPrzLabel(prize.label);
    setPrzType(prize.rewardType);
    setPrzDiscountValue(prize.discountValue || 10);
    setPrzFreeProduct(prize.freeProductName || '');
    setPrzPoints(prize.pointsValue || 2);
    setPrzColor(prize.color);
    setPrzWeight(prize.weight);
    setPrzIsWinning(prize.isWinning);
    setIsPrizeModalOpen(true);
  };

  const handleSavePrize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!przLabel.trim()) {
      dispatchToast('Etiqueta Requerida', 'Ingresa el nombre del premio.', 'warning');
      return;
    }

    const payload: GamePrizeItem = {
      id: editingPrizeId || `prz-${Date.now()}`,
      label: przLabel.trim(),
      rewardType: przType,
      discountValue:
        przType === 'discount_fixed' || przType === 'discount_percent' ? Number(przDiscountValue) : undefined,
      freeProductName: przType === 'free_product' ? przFreeProduct.trim() : undefined,
      pointsValue: przType === 'points' ? Number(przPoints) : undefined,
      color: przColor,
      weight: Math.max(1, Number(przWeight)),
      isWinning: przType === 'no_prize' ? false : przIsWinning,
    };

    if (editingPrizeId) {
      updateGameSettings({
        prizes: gameSettings.prizes.map((p) => (p.id === editingPrizeId ? payload : p)),
      });
      dispatchToast('Premio Actualizado', `Se guardó el premio "${payload.label}".`, 'success');
    } else {
      updateGameSettings({
        prizes: [...gameSettings.prizes, payload],
      });
      dispatchToast('Premio Creado', `Se añadió el nuevo premio "${payload.label}".`, 'success');
    }
    setIsPrizeModalOpen(false);
  };

  const handleDeletePrize = (prizeId: string) => {
    if (gameSettings.prizes.length <= 2) {
      dispatchToast('Mínimo 2 Premios', 'La ruleta debe tener al menos dos segmentos para girar.', 'warning');
      return;
    }
    updateGameSettings({
      prizes: gameSettings.prizes.filter((p) => p.id !== prizeId),
    });
    dispatchToast('Premio Eliminado', 'Se quitó el premio de la ruleta.', 'info');
  };

  // Simulación de Giro con Cálculo Ponderado por Peso (Weight)
  const handleTestSpin = () => {
    if (isSpinning || gameSettings.prizes.length === 0) return;
    setIsSpinning(true);
    setSpinResult(null);

    // Selección ponderada basada en peso
    const totalWeight = gameSettings.prizes.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < gameSettings.prizes.length; i++) {
      if (rand < gameSettings.prizes[i].weight) {
        selectedIndex = i;
        break;
      }
      rand -= gameSettings.prizes[i].weight;
    }

    const segmentAngle = 360 / gameSettings.prizes.length;
    // Ángulo necesario para que el segmento seleccionado quede arriba (apuntador a 270 deg)
    const targetSegmentOffset = 360 - selectedIndex * segmentAngle - segmentAngle / 2;
    const extraSpins = 360 * 6; // 6 vueltas completas
    const finalAngle = extraSpins + targetSegmentOffset;

    setWheelRotation(finalAngle);

    setTimeout(() => {
      setIsSpinning(false);
      setSpinResult(gameSettings.prizes[selectedIndex]);
    }, 3800);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Cabecera */}
      <div className="p-5 rounded-3xl bg-linear-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500 text-zinc-950 font-black text-sm">
              <Gamepad2 className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-zinc-950 dark:text-white">
              Gamificación & Juegos de Fidelización (Ruleta & Rompecabezas)
            </h2>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Configura juegos interactivos para tus clientes en la tienda virtual: ajusta la dificultad, probabilidad de ganar según pesos, colores, premios asignados automáticamente y frecuencia de juego.
          </p>
        </div>

        {/* Switch Principal de Activación */}
        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl shrink-0">
          <div>
            <span className="text-xs font-bold text-zinc-900 dark:text-white block">
              Juego en Tienda Virtual
            </span>
            <span className="text-[11px] text-zinc-500 block">
              {gameSettings.enabled ? '🟢 Activo para clientes' : '🔴 Pausado'}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={gameSettings.enabled}
              onChange={(e) => updateGameSettings({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>
      </div>

      {/* Grid Principal: Configuración de Parámetros + Simulador Visual en Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Parámetros del Juego (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <Sliders className="w-4 h-4 text-amber-500" />
              1. Dinámica y Lógica del Juego
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Tipo de Juego */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Modalidad de Juego
                </label>
                <select
                  value={gameSettings.gameType}
                  onChange={(e) => updateGameSettings({ gameType: e.target.value as GameType })}
                  className="w-full px-3 py-2 text-xs rounded-xl saas-input font-bold"
                >
                  <option value="ruleta">🎡 Ruleta de la Fortuna</option>
                  <option value="rompecabezas">🧩 Rompecabezas Contrarreloj</option>
                </select>
              </div>

              {/* Frecuencia de Giros */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Frecuencia de Giros por Cliente
                </label>
                <select
                  value={gameSettings.frequency}
                  onChange={(e) => updateGameSettings({ frequency: e.target.value as GameFrequency })}
                  className="w-full px-3 py-2 text-xs rounded-xl saas-input font-semibold"
                >
                  <option value="daily">1 Giro por Día</option>
                  <option value="weekly">1 Giro por Semana</option>
                  <option value="monthly">1 Giro al Mes</option>
                  <option value="on_register_only">Único Giro al Registrarse</option>
                  <option value="unlimited">Ilimitado (Modo Promo)</option>
                </select>
              </div>

              {/* Dificultad / Algoritmo */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Dificultad (Probabilidad Global)
                </label>
                <select
                  value={gameSettings.difficultyLevel}
                  onChange={(e) => updateGameSettings({ difficultyLevel: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl saas-input font-semibold"
                >
                  <option value="facil">🟢 Fácil (Muchos ganadores)</option>
                  <option value="medio">🟡 Media (Equilibrado rentable)</option>
                  <option value="dificil">🟠 Difícil (Premios grandes raros)</option>
                  <option value="experto">🔴 Experto (Baja frecuencia ganadora)</option>
                </select>
              </div>

              {/* Color Temático */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Color Temático de la Ruleta
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={gameSettings.themeColor}
                    onChange={(e) => updateGameSettings({ themeColor: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={gameSettings.themeColor}
                    onChange={(e) => updateGameSettings({ themeColor: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs rounded-xl saas-input font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Títulos y Textos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Título de la Ruleta en Tienda
                </label>
                <input
                  type="text"
                  value={gameSettings.title}
                  onChange={(e) => updateGameSettings({ title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl saas-input font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Subtítulo / Instrucción
                </label>
                <input
                  type="text"
                  value={gameSettings.subtitle}
                  onChange={(e) => updateGameSettings({ subtitle: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl saas-input"
                />
              </div>
            </div>

            {/* Animaciones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Animación al Ganar
                </label>
                <select
                  value={gameSettings.winAnimation}
                  onChange={(e) => updateGameSettings({ winAnimation: e.target.value as GameWinAnimation })}
                  className="w-full px-3 py-2 text-xs rounded-xl saas-input"
                >
                  <option value="confetti">🎉 Lluvia de Confeti 3D</option>
                  <option value="fireworks">🎆 Fuegos Artificiales</option>
                  <option value="pulse">✨ Pulso Dorado</option>
                  <option value="glow">🌟 Resplandor Neón</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Animación al No Ganar
                </label>
                <select
                  value={gameSettings.loseAnimation}
                  onChange={(e) => updateGameSettings({ loseAnimation: e.target.value as GameLoseAnimation })}
                  className="w-full px-3 py-2 text-xs rounded-xl saas-input"
                >
                  <option value="shake">💥 Sacudida de Ruleta (Shake)</option>
                  <option value="fade">💨 Desvanecimiento Suave</option>
                  <option value="sad_emoji">🥺 Carita Triste Animada</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Simulador Visual en Vivo de la Ruleta (5 cols) */}
        <div className="lg:col-span-5">
          <div className="p-5 rounded-3xl bg-zinc-950 text-white border border-zinc-800 space-y-4 shadow-xl flex flex-col items-center text-center">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                <Sparkles className="w-3 h-3" /> Simulador de Ruleta en Vivo
              </span>
              <h3 className="text-base font-black text-white mt-1.5">{gameSettings.title}</h3>
              <p className="text-xs text-zinc-400">{gameSettings.subtitle}</p>
            </div>

            {/* Visual Wheel Representation */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 my-2 flex items-center justify-center">
              {/* Apuntador / Flecha Superior */}
              <div className="absolute -top-3 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 drop-shadow-md" />

              {/* Rueda giratoria con CSS Conic Gradient de los premios configurados */}
              <div
                className="w-full h-full rounded-full border-4 border-amber-400 shadow-2xl relative overflow-hidden transition-transform duration-[3800ms] ease-out flex items-center justify-center"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  background:
                    gameSettings.prizes.length > 0
                      ? `conic-gradient(${gameSettings.prizes
                          .map((p, idx, arr) => {
                            const step = 100 / arr.length;
                            return `${p.color} ${idx * step}% ${(idx + 1) * step}%`;
                          })
                          .join(', ')})`
                      : '#3f3f46',
                }}
              >
                {/* Centro con Logo o Ícono */}
                <div className="w-16 h-16 rounded-full bg-zinc-950 border-2 border-amber-400 shadow-inner flex items-center justify-center z-10">
                  <Gamepad2 className="w-7 h-7 text-amber-400" />
                </div>
              </div>
            </div>

            {/* Resultado del Giro */}
            {spinResult && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold border w-full animate-bounce ${
                  spinResult.isWinning
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                {spinResult.isWinning ? (
                  <div>
                    🎉 ¡GANASTE:{' '}
                    <strong className="text-white underline">{spinResult.label}</strong>!
                  </div>
                ) : (
                  <div>🥺 Sigue intentando: {spinResult.label}</div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleTestSpin}
              disabled={isSpinning}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
            >
              <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'Girando la Ruleta...' : 'Probar Giro de Prueba'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Catálogo de Premios de la Ruleta (Premios, Pesos de Probabilidad y Colores) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h3 className="text-base font-black text-zinc-950 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Gajos y Premios Asignados a la Ruleta ({gameSettings.prizes.length})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Configura cada segmento con su color, valor canjeable y peso de probabilidad (a mayor peso, más fácil sale el premio).
            </p>
          </div>

          <button
            type="button"
            onClick={openAddPrizeModal}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Premio al Juego</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {gameSettings.prizes.map((p, index) => (
            <div
              key={p.id}
              className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/60 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-6 h-6 rounded-lg border border-black/10 shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <div>
                    <h4 className="text-xs font-black text-zinc-900 dark:text-white">
                      #{index + 1} {p.label}
                    </h4>
                    <span className="text-[10px] text-zinc-500">
                      {p.rewardType === 'discount_percent'
                        ? `${p.discountValue}% Descuento`
                        : p.rewardType === 'discount_fixed'
                        ? `S/ ${p.discountValue?.toFixed(2)} Descuento`
                        : p.rewardType === 'free_product'
                        ? `Gratis: ${p.freeProductName}`
                        : p.rewardType === 'points'
                        ? `+${p.pointsValue} Puntos`
                        : 'Sin Premio'}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    p.isWinning
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {p.isWinning ? 'Ganador' : 'Vacio'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                <span className="text-[11px] text-zinc-500">
                  Peso de Probabilidad:{' '}
                  <strong className="text-zinc-900 dark:text-zinc-100">{p.weight}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditPrizeModal(p)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePrize(p.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal para Agregar / Editar Premio en la Ruleta */}
      {isPrizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleSavePrize}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-black text-zinc-950 dark:text-white">
                {editingPrizeId ? 'Editar Premio de la Ruleta' : 'Nuevo Premio de la Ruleta'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPrizeModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nombre / Texto Visible en el Gajo *
                </label>
                <input
                  type="text"
                  required
                  value={przLabel}
                  onChange={(e) => setPrzLabel(e.target.value)}
                  placeholder="Ej. 15% Descuento, Gaseosa Gratis, o Sigue Intentando"
                  className="w-full px-3 py-2 text-xs rounded-xl saas-input font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tipo de Beneficio
                  </label>
                  <select
                    value={przType}
                    onChange={(e) => setPrzType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl saas-input font-semibold"
                  >
                    <option value="discount_percent">% Descuento</option>
                    <option value="discount_fixed">Monto S/ Descuento</option>
                    <option value="free_product">Producto Gratis</option>
                    <option value="points">Puntos Extra</option>
                    <option value="no_prize">No Gana (Intenta otra vez)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Color del Gajo
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={przColor}
                      onChange={(e) => setPrzColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={przColor}
                      onChange={(e) => setPrzColor(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-xl saas-input font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {przType === 'discount_percent' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Porcentaje de Descuento (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={przDiscountValue}
                    onChange={(e) => setPrzDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl saas-input font-black"
                  />
                </div>
              )}

              {przType === 'discount_fixed' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Monto Directo de Descuento (S/)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    value={przDiscountValue}
                    onChange={(e) => setPrzDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl saas-input font-black"
                  />
                </div>
              )}

              {przType === 'free_product' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nombre del Producto Gratis
                  </label>
                  <input
                    type="text"
                    value={przFreeProduct}
                    onChange={(e) => setPrzFreeProduct(e.target.value)}
                    placeholder="Ej. Pizza Personal Artesanal o Gaseosa 1.5L"
                    className="w-full px-3 py-2 text-xs rounded-xl saas-input"
                  />
                </div>
              )}

              {przType === 'points' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Cantidad de Puntos Asignados
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={przPoints}
                    onChange={(e) => setPrzPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl saas-input font-black"
                  />
                </div>
              )}

              {/* Peso de Probabilidad */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Peso / Frecuencia de Salida: {przWeight}
                  </label>
                  <span className="text-[10px] text-zinc-500">
                    (1 = Raro / Difícil, 10 = Muy Frecuente)
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={przWeight}
                  onChange={(e) => setPrzWeight(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsPrizeModalOpen(false)}
                className="whitespace-nowrap shrink-0 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="whitespace-nowrap shrink-0 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-md shadow-amber-500/20"
              >
                {editingPrizeId ? 'Guardar Cambios' : 'Añadir a la Ruleta'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
