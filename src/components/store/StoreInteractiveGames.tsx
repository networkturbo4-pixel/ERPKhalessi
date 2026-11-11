import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Trophy,
  Gift,
  RotateCcw,
  CheckCircle2,
  Volume2,
  VolumeX,
  Puzzle,
  Play,
  ArrowRight,
} from 'lucide-react';
import { useBenefits } from '../../context/BenefitsContext';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import { useSettings } from '../../context/SettingsContext';

interface StoreInteractiveGamesProps {
  isLightTheme: boolean;
  accentColor: string;
  autoButtonContrast?: boolean;
}

interface RoulettePrize {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  textColor: string;
  type: 'points' | 'coupon' | 'reward' | 'try_again';
  value: number | string;
  icon: string;
}

const ROULETTE_PRIZES: RoulettePrize[] = [
  {
    id: 'p1',
    label: '+2 PUNTOS',
    sublabel: 'Club Fidelidad',
    color: '#ea580c',
    textColor: '#ffffff',
    type: 'points',
    value: 2,
    icon: '⭐',
  },
  {
    id: 'p2',
    label: '15% DSCTO',
    sublabel: 'Cupón: KHALESSI15',
    color: '#0284c7',
    textColor: '#ffffff',
    type: 'coupon',
    value: 'KHALESSI15',
    icon: '🎟️',
  },
  {
    id: 'p3',
    label: 'BEBIDA GRATIS',
    sublabel: '1.5L Familiar',
    color: '#16a34a',
    textColor: '#ffffff',
    type: 'reward',
    value: 'Bebida 1.5L Gratis',
    icon: '🥤',
  },
  {
    id: 'p4',
    label: '+1 PUNTO',
    sublabel: 'Tarjeta Sellos',
    color: '#d97706',
    textColor: '#ffffff',
    type: 'points',
    value: 1,
    icon: '✨',
  },
  {
    id: 'p5',
    label: 'S/ 10 DSCTO',
    sublabel: 'Cupón: PIZZA10',
    color: '#9333ea',
    textColor: '#ffffff',
    type: 'coupon',
    value: 'PIZZA10',
    icon: '🔥',
  },
  {
    id: 'p6',
    label: 'GARLIC BREAD',
    sublabel: 'Pan al Ajo',
    color: '#e11d48',
    textColor: '#ffffff',
    type: 'reward',
    value: 'Porción Pan al Ajo',
    icon: '🥖',
  },
  {
    id: 'p7',
    label: '+3 PUNTOS',
    sublabel: 'Super Bonus',
    color: '#2563eb',
    textColor: '#ffffff',
    type: 'points',
    value: 3,
    icon: '👑',
  },
  {
    id: 'p8',
    label: 'POSTRE DULCE',
    sublabel: 'Volcán Manjar',
    color: '#059669',
    textColor: '#ffffff',
    type: 'reward',
    value: 'Volcán Dulce',
    icon: '🍰',
  },
];

const PUZZLE_IMAGE =
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80';

export const StoreInteractiveGames: React.FC<StoreInteractiveGamesProps> = ({
  isLightTheme,
  accentColor,
  autoButtonContrast = false,
}) => {
  const { currentCustomer, awardCustomerPoints } = useStoreCustomer();
  const { dispatchToast } = useSettings();

  const [activeGame, setActiveGame] = useState<'roulette' | 'puzzle'>('roulette');

  // ==========================================
  // 1. ROULETTE STATE & LOGIC (Temu-style)
  // ==========================================
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [wonPrize, setWonPrize] = useState<RoulettePrize | null>(null);
  const [spinsLeft, setSpinsLeft] = useState(() => {
    if (typeof window === 'undefined') return 3;
    const saved = localStorage.getItem('kh_game_spins_today');
    return saved !== null ? parseInt(saved, 10) : 3;
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw Roulette wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numPrizes = ROULETTE_PRIZES.length;
    const arc = (2 * Math.PI) / numPrizes;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = centerX - 12;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Slices
    ROULETTE_PRIZES.forEach((prize, i) => {
      const angle = i * arc;
      ctx.beginPath();
      ctx.fillStyle = prize.color;
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + arc);
      ctx.lineTo(centerX, centerY);
      ctx.fill();

      // Golden separator border
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Text & Icon
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = prize.textColor;
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${prize.icon} ${prize.label}`, radius - 20, 5);
      ctx.restore();
    });

    // Outer golden ring with lights
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 4, 0, 2 * Math.PI);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Center Hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.stroke();
  }, []);

  const handleSpinRoulette = () => {
    if (isSpinning) return;
    if (spinsLeft <= 0) {
      dispatchToast(
        '¡Vuelve Mañana!',
        'Has usado tus 3 giros diarios de la Ruleta de Premios.',
        'info'
      );
      return;
    }

    setIsSpinning(true);
    setWonPrize(null);

    // Pick winning index
    const prizeIndex = Math.floor(Math.random() * ROULETTE_PRIZES.length);
    const numPrizes = ROULETTE_PRIZES.length;
    const degreesPerSlice = 360 / numPrizes;

    // Additional spins for suspense (5 to 8 full spins)
    const extraSpins = 6 * 360;
    // Align slice to top indicator (pointer is at top: 270 deg or -90 deg)
    const targetOffset = 360 - (prizeIndex * degreesPerSlice + degreesPerSlice / 2) + 270;
    const finalAngle = rotationDegrees + extraSpins + (targetOffset % 360);

    setRotationDegrees(finalAngle);

    setTimeout(() => {
      setIsSpinning(false);
      const selected = ROULETTE_PRIZES[prizeIndex];
      setWonPrize(selected);
      const nextSpins = Math.max(0, spinsLeft - 1);
      setSpinsLeft(nextSpins);
      localStorage.setItem('kh_game_spins_today', String(nextSpins));

      // Award points if logged in
      if (selected.type === 'points' && currentCustomer) {
        awardCustomerPoints(Number(selected.value), 'Premio Ruleta de la Fortuna');
        dispatchToast(
          '🎉 ¡Premio Ganado!',
          `Sumaste ${selected.value} puntos a tu cuenta de cliente.`,
          'success'
        );
      } else {
        dispatchToast('🎉 ¡Felicidades!', `Ganaste: ${selected.label} (${selected.sublabel})`, 'success');
      }
    }, 4200);
  };

  // ==========================================
  // 2. PUZZLE 3x3 SLIDING LOGIC
  // ==========================================
  const GOAL_TILES = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const [tiles, setTiles] = useState<number[]>([1, 2, 0, 3, 4, 5, 6, 7, 8]); // 8 is blank
  const [puzzleMoves, setPuzzleMoves] = useState(0);
  const [isPuzzleSolved, setIsPuzzleSolved] = useState(false);
  const [puzzleClaimed, setPuzzleClaimed] = useState(false);

  const shufflePuzzle = () => {
    // Generates a simple solvable configuration
    const solvablePresets = [
      [1, 2, 5, 0, 4, 8, 3, 6, 7],
      [0, 1, 2, 4, 5, 8, 3, 6, 7],
      [3, 1, 2, 0, 4, 5, 6, 7, 8],
      [1, 4, 2, 0, 8, 5, 3, 6, 7],
    ];
    const picked = solvablePresets[Math.floor(Math.random() * solvablePresets.length)];
    setTiles(picked);
    setPuzzleMoves(0);
    setIsPuzzleSolved(false);
    setPuzzleClaimed(false);
  };

  const handleTileClick = (index: number) => {
    if (isPuzzleSolved) return;
    const blankIndex = tiles.indexOf(8);
    const row = Math.floor(index / 3);
    const col = index % 3;
    const blankRow = Math.floor(blankIndex / 3);
    const blankCol = blankIndex % 3;

    // Check adjacent
    const isAdjacent =
      (Math.abs(row - blankRow) === 1 && col === blankCol) ||
      (Math.abs(col - blankCol) === 1 && row === blankRow);

    if (isAdjacent) {
      const next = [...tiles];
      next[blankIndex] = tiles[index];
      next[index] = 8;
      setTiles(next);
      setPuzzleMoves(m => m + 1);

      // Check win condition
      const won = next.every((val, i) => val === GOAL_TILES[i]);
      if (won) {
        setIsPuzzleSolved(true);
        if (currentCustomer && !puzzleClaimed) {
          awardCustomerPoints(5, 'Rompecabezas Pizza Completado');
          setPuzzleClaimed(true);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Header Tabs */}
      <div
        className={`p-1.5 rounded-2xl border flex items-center gap-2 max-w-md mx-auto overflow-x-auto no-scrollbar scroll-smooth touch-pan-x flex-nowrap ${
          isLightTheme ? 'bg-zinc-100 border-zinc-200' : 'bg-neutral-900 border-neutral-800'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveGame('roulette')}
          data-auto-contrast={activeGame === 'roulette' && autoButtonContrast ? 'true' : 'false'}
          className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
            activeGame === 'roulette'
              ? 'store-btn-solid shadow-sm'
              : isLightTheme
              ? 'text-zinc-600 hover:text-zinc-900'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Ruleta de la Fortuna</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveGame('puzzle')}
          data-auto-contrast={activeGame === 'puzzle' && autoButtonContrast ? 'true' : 'false'}
          className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
            activeGame === 'puzzle'
              ? 'store-btn-solid shadow-sm'
              : isLightTheme
              ? 'text-zinc-600 hover:text-zinc-900'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Puzzle className="w-4 h-4" />
          <span>Rompecabezas Pizza</span>
        </button>
      </div>

      {/* GAME 1: ROULETTE (Temu Style Interactive) */}
      {activeGame === 'roulette' && (
        <div
          className={`p-5 sm:p-8 rounded-3xl border text-center space-y-6 max-w-lg mx-auto shadow-xl ${
            isLightTheme
              ? 'bg-white border-zinc-200/90 text-zinc-950'
              : 'bg-neutral-900 border-neutral-800 text-white'
          }`}
        >
          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 border ${
                isLightTheme
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Gira y Gana Premios Inmediatos</span>
            </div>
            <h3 className={`text-xl sm:text-2xl font-black ${isLightTheme ? 'text-zinc-950' : 'text-white'}`}>
              Ruleta Mágica Khalessi
            </h3>
            <p className={`text-xs sm:text-sm mt-1 ${isLightTheme ? 'text-zinc-600' : 'text-neutral-400'}`}>
              Gana cupones, bebidas gratis o puntos directos para tu cuenta de cliente.
            </p>
          </div>

          {/* Interactive Wheel Container */}
          <div className="relative w-[300px] h-[300px] sm:w-[320px] sm:h-[320px] mx-auto flex items-center justify-center">
            {/* Top Pointer Arrow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]" />

            {/* Spinning SVG Wheel */}
            <div
              style={{
                transform: `rotate(${rotationDegrees}deg)`,
                transition: isSpinning
                  ? 'transform 4.2s cubic-bezier(0.15, 0.9, 0.25, 1)'
                  : 'none',
              }}
              className="w-full h-full rounded-full shadow-2xl overflow-hidden"
            >
              <svg viewBox="0 0 320 320" className="w-full h-full select-none">
                <defs>
                  <filter id="roulette-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.65" />
                  </filter>
                </defs>
                {ROULETTE_PRIZES.map((prize, i) => {
                  const num = ROULETTE_PRIZES.length;
                  const anglePer = 360 / num;
                  const startAngle = (i * anglePer * Math.PI) / 180;
                  const endAngle = ((i + 1) * anglePer * Math.PI) / 180;
                  const midAngleDeg = (i + 0.5) * anglePer;
                  const r = 148;
                  const cx = 160;
                  const cy = 160;
                  const x1 = cx + r * Math.cos(startAngle);
                  const y1 = cy + r * Math.sin(startAngle);
                  const x2 = cx + r * Math.cos(endAngle);
                  const y2 = cy + r * Math.sin(endAngle);
                  const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

                  return (
                    <g key={prize.id}>
                      <path d={pathData} fill={prize.color} stroke="#fef08a" strokeWidth="2.5" />
                      <g transform={`rotate(${midAngleDeg}, ${cx}, ${cy})`}>
                        <text
                          x={cx + r - 18}
                          y={cy + 4}
                          fill={prize.textColor}
                          fontSize="11"
                          fontWeight="900"
                          textAnchor="end"
                          filter="url(#roulette-shadow)"
                          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                        >
                          {prize.icon} {prize.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
                {/* Outer Golden Ring */}
                <circle cx="160" cy="160" r="154" fill="none" stroke="#f59e0b" strokeWidth="8" />
                {/* Decorative Lights */}
                {Array.from({ length: 16 }).map((_, li) => {
                  const la = (li * (360 / 16) * Math.PI) / 180;
                  const lx = 160 + 154 * Math.cos(la);
                  const ly = 160 + 154 * Math.sin(la);
                  return <circle key={li} cx={lx} cy={ly} r="2.5" fill="#fef08a" />;
                })}
                {/* Center Hub */}
                <circle cx="160" cy="160" r="30" fill="#ffffff" stroke="#f59e0b" strokeWidth="4" />
              </svg>
            </div>

            {/* Center SPIN Button */}
            <button
              type="button"
              disabled={isSpinning || spinsLeft <= 0}
              onClick={handleSpinRoulette}
              data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
              className="store-btn-solid absolute z-10 w-16 h-16 rounded-full font-black text-xs shadow-2xl flex flex-col items-center justify-center active:scale-95 transition-transform disabled:opacity-60 ring-4 ring-amber-400"
            >
              <span>{isSpinning ? '...' : 'GIRAR'}</span>
              <span className="text-[9px] font-bold opacity-90">({spinsLeft})</span>
            </button>
          </div>

          {/* Prize Announcement Card */}
          {wonPrize && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-center animate-fadeIn space-y-1">
              <span className="text-2xl">{wonPrize.icon}</span>
              <h4 className="text-base font-black text-amber-500">
                ¡Felicidades! Ganaste {wonPrize.label}
              </h4>
              <p className={`text-xs ${isLightTheme ? 'text-zinc-700' : 'text-neutral-300'}`}>{wonPrize.sublabel}</p>
            </div>
          )}

          {/* Spins Remaining & Rules Card */}
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 text-left ${
              isLightTheme
                ? 'bg-zinc-100/90 border-zinc-200 text-zinc-900'
                : 'bg-neutral-950/60 border-neutral-800/80 text-white'
            }`}
          >
            <div>
              <span className={`font-bold block ${isLightTheme ? 'text-zinc-950' : 'text-neutral-200'}`}>
                Giros disponibles hoy:
              </span>
              <span className={`text-[11px] ${isLightTheme ? 'text-zinc-600' : 'text-neutral-400'}`}>
                {spinsLeft > 0 ? `${spinsLeft} giros restantes` : 'Vuelve mañana para más giros'}
              </span>
            </div>
            <button
              type="button"
              disabled={isSpinning || spinsLeft <= 0}
              onClick={handleSpinRoulette}
              data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
              className="store-btn-solid px-4 py-2 rounded-xl text-xs font-black disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isSpinning ? 'Girando...' : 'Girar Ruleta'}
            </button>
          </div>
        </div>
      )}

      {/* GAME 2: PUZZLE DE PIZZA (Sliding 3x3) */}
      {activeGame === 'puzzle' && (
        <div
          className={`p-5 sm:p-8 rounded-3xl border text-center space-y-6 max-w-lg mx-auto shadow-xl ${
            isLightTheme
              ? 'bg-white border-zinc-200/90 text-zinc-950'
              : 'bg-neutral-900 border-neutral-800 text-white'
          }`}
        >
          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 border ${
                isLightTheme
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              }`}
            >
              <Puzzle className="w-3.5 h-3.5" />
              <span>Desafío de la Cocina</span>
            </div>
            <h3 className={`text-xl sm:text-2xl font-black ${isLightTheme ? 'text-zinc-950' : 'text-white'}`}>
              Arma la Pizza Artesanal
            </h3>
            <p className={`text-xs sm:text-sm mt-1 ${isLightTheme ? 'text-zinc-600' : 'text-neutral-400'}`}>
              Desliza las fichas adyacentes para completar la imagen y gana +5 puntos.
            </p>
          </div>

          {/* Puzzle Board 3x3 */}
          <div className="relative w-[280px] h-[280px] sm:w-[300px] sm:h-[300px] mx-auto grid grid-cols-3 gap-1.5 bg-neutral-950 p-2 rounded-2xl border-2 border-neutral-800 shadow-inner">
            {tiles.map((tileIndex, pos) => {
              if (tileIndex === 8) {
                return (
                  <div
                    key="blank"
                    className="w-full h-full rounded-xl bg-neutral-900/60 border border-neutral-800/50 flex items-center justify-center text-neutral-600 font-bold text-xs"
                  >
                    Vacío
                  </div>
                );
              }

              const row = Math.floor(tileIndex / 3);
              const col = tileIndex % 3;

              return (
                <button
                  key={tileIndex}
                  type="button"
                  onClick={() => handleTileClick(pos)}
                  style={{
                    backgroundImage: `url(${PUZZLE_IMAGE})`,
                    backgroundSize: '300% 300%',
                    backgroundPosition: `${(col / 2) * 100}% ${(row / 2) * 100}%`,
                  }}
                  className="w-full h-full rounded-xl shadow-md border border-black/40 hover:scale-[1.02] active:scale-95 transition-transform relative overflow-hidden focus:outline-none"
                >
                  <span className="absolute bottom-1 right-1 px-1 rounded bg-black/70 text-[9px] font-mono text-white font-bold">
                    {tileIndex + 1}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Solved celebration banner */}
          {isPuzzleSolved && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 text-center animate-fadeIn space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-base font-black text-emerald-400">
                ¡Excelente! ¡Armaste la Pizza en {puzzleMoves} movimientos!
              </h4>
              <p className="text-xs text-neutral-300">
                {currentCustomer
                  ? '🎉 Se acreditaron +5 Puntos a tu Tarjeta de Fidelidad.'
                  : 'Inicia sesión para reclamar tus 5 puntos gratis.'}
              </p>
            </div>
          )}

          <div
            className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border ${
              isLightTheme
                ? 'bg-zinc-100/90 border-zinc-200 text-zinc-900'
                : 'bg-neutral-950/60 border-neutral-800 text-white'
            }`}
          >
            <span className={`text-xs font-bold ${isLightTheme ? 'text-zinc-600' : 'text-neutral-400'}`}>
              Movimientos: <strong className={isLightTheme ? 'text-zinc-950' : 'text-white'}>{puzzleMoves}</strong>
            </span>
            <button
              type="button"
              onClick={shufflePuzzle}
              data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
              className="store-btn-solid px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Mezclar de Nuevo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
