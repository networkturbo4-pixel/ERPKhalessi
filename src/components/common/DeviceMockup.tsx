import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { Monitor, Tablet, Smartphone, Pizza, ShoppingBag, Flame, TrendingUp, Users } from 'lucide-react';

export const DeviceMockup: React.FC = () => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const { customization, activeTenant } = useSettings();

  const getRadiusClass = () => {
    switch (customization.borderRadius) {
      case 'sm': return 'rounded-sm';
      case 'md': return 'rounded-md';
      case 'lg': return 'rounded-xl';
      case 'full': return 'rounded-2xl';
      default: return 'rounded-xl';
    }
  };

  const getContainerWidth = () => {
    switch (device) {
      case 'mobile':
        return 'w-[320px] max-w-full h-[540px]';
      case 'tablet':
        return 'w-[480px] max-w-full h-[480px]';
      case 'desktop':
      default:
        return 'w-full h-[460px]';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 saas-card p-5">
      <div className="flex items-center justify-between w-full border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            Simulador en Tiempo Real
          </span>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
          {[
            { id: 'desktop', label: 'PC', icon: Monitor },
            { id: 'tablet', label: 'Tablet', icon: Tablet },
            { id: 'mobile', label: 'Móvil', icon: Smartphone },
          ].map(item => {
            const Icon = item.icon;
            const active = device === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setDevice(item.id as typeof device)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  active
                    ? 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulator Device Frame */}
      <div className="w-full flex justify-center py-1 overflow-x-auto">
        <div
          className={`${getContainerWidth()} transition-all duration-300 bg-white dark:bg-[#111114] border-2 border-zinc-300 dark:border-zinc-700 rounded-2xl shadow-xl flex flex-col overflow-hidden relative`}
          style={{ fontFamily: customization.fontFamily }}
        >
          {/* Mock Navigation Bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181c]">
            <div className="flex items-center gap-2 min-w-0">
              {customization.logoLight ? (
                <img
                  src={customization.logoLight}
                  alt="Logo"
                  className="h-6 w-6 rounded object-cover shrink-0"
                />
              ) : (
                <div
                  className="h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: customization.primaryColor }}
                >
                  {customization.collapsedLogo || '🍕'}
                </div>
              )}
              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                {customization.appName || 'Pizza ERP'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-mono">
                {activeTenant.name.replace('Khalessi Pizza - ', '')}
              </span>
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: customization.primaryColor }}
              />
            </div>
          </div>

          {/* Mock Content Dashboard */}
          <div className="flex-1 p-3 overflow-y-auto bg-zinc-50/60 dark:bg-[#111114] flex flex-col gap-2.5">
            {/* Banner with slogan */}
            <div
              className={`p-3 text-white flex items-center justify-between shadow-sm ${getRadiusClass()}`}
              style={{ backgroundColor: customization.primaryColor }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold opacity-90">
                  Panel Operativo
                </p>
                <h4 className="text-xs font-bold">{customization.slogan || 'Pizzería Artesanal'}</h4>
              </div>
              <Flame className="h-5 w-5 opacity-90 shrink-0" />
            </div>

            {/* Quick KPI stats */}
            <div className={`grid gap-2 ${device === 'mobile' ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <div className={`bg-white dark:bg-[#18181c] p-2.5 border border-zinc-200 dark:border-zinc-700/80 ${getRadiusClass()}`}>
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <span className="text-[10px] font-medium">Ventas Hoy</span>
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white mt-1">S/ 3,450.00</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">+14% vs ayer</span>
              </div>

              <div className={`bg-white dark:bg-[#18181c] p-2.5 border border-zinc-200 dark:border-zinc-700/80 ${getRadiusClass()}`}>
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <span className="text-[10px] font-medium">Horno / KDS</span>
                  <Pizza className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white mt-1">8 pizzas</p>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">Prom: 11 min</span>
              </div>

              <div className={`bg-white dark:bg-[#18181c] p-2.5 border border-zinc-200 dark:border-zinc-700/80 ${device === 'mobile' ? 'col-span-2' : ''} ${getRadiusClass()}`}>
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <span className="text-[10px] font-medium">Personal</span>
                  <Users className="h-3.5 w-3.5 text-sky-500" />
                </div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white mt-1">5 en turno</p>
                <span className="text-[10px] text-sky-600 dark:text-sky-400">Cajas activas</span>
              </div>
            </div>

            {/* Mock Comanda list */}
            <div className={`bg-white dark:bg-[#18181c] p-3 border border-zinc-200 dark:border-zinc-700/80 flex-1 ${getRadiusClass()}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3" style={{ color: customization.primaryColor }} />
                  Comandas en Marcha
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Hace 1m</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-[#202026] border border-zinc-200/70 dark:border-zinc-700/70 text-xs">
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-100">#104 - Mesa 4</span>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">1× Familiar Americana · Mozzarella</p>
                  </div>
                  <span
                    className="px-2 py-0.5 text-[9px] font-bold text-white rounded"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    En Horno
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-[#202026] border border-zinc-200/70 dark:border-zinc-700/70 text-xs">
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-100">#105 - Delivery Yape</span>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">2× Mediana Pepperoni + 1.5L</p>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500 text-white rounded">
                    Preparación
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
