import React, { useState, useEffect, useRef, useId } from 'react';
import { CreditCard, Smartphone, ShieldCheck, X, Lock, CheckCircle2 } from 'lucide-react';

interface StoreCulqiSandboxDialogProps {
  isOpen: boolean;
  storeTitle: string;
  amountSoles: number;
  customerEmail: string;
  yapeEnabled: boolean;
  accentColor: string;
  autoButtonContrast: boolean;
  onCancel: () => void;
  onApproved: (result: { referenceId: string; methodUsed: 'tarjeta' | 'yape' }) => void;
}

export const StoreCulqiSandboxDialog: React.FC<StoreCulqiSandboxDialogProps> = ({
  isOpen,
  storeTitle,
  amountSoles,
  customerEmail,
  yapeEnabled,
  accentColor,
  autoButtonContrast,
  onCancel,
  onApproved,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [tab, setTab] = useState<'tarjeta' | 'yape'>('tarjeta');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [email, setEmail] = useState(customerEmail || '');
  const [yapePhone, setYapePhone] = useState('');
  const [yapeOtp, setYapeOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setEmail(customerEmail || '');
  }, [customerEmail]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      setErrorMsg(null);
      setIsProcessing(false);
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const formatCardNum = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExp = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (tab === 'tarjeta') {
      const cleanCard = cardNumber.replace(/\D/g, '');
      if (cleanCard.length < 15) {
        setErrorMsg('Ingresa un número de tarjeta válido (15 o 16 dígitos).');
        return;
      }
      if (cardExpiry.length < 5 || cardCvv.length < 3) {
        setErrorMsg('Completa el vencimiento (MM/AA) y CVV.');
        return;
      }
    } else {
      const cleanPhone = yapePhone.replace(/\D/g, '');
      if (cleanPhone.length < 9 || yapeOtp.replace(/\D/g, '').length < 6) {
        setErrorMsg('Ingresa tu celular afiliado a Yape (9 dígitos) y el código de aprobación de 6 dígitos.');
        return;
      }
    }

    setIsProcessing(true);
    window.setTimeout(() => {
      setIsProcessing(false);
      const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
      onApproved({
        referenceId: tab === 'tarjeta' ? `tok_test_${rand}` : `ord_yape_${rand}`,
        methodUsed: tab,
      });
    }, 650);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={e => {
        e.currentTarget.returnValue = '';
        onCancel();
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !isProcessing) {
          e.currentTarget.close('backdrop');
        }
      }}
      className="store-bottom-sheet backdrop:bg-black/80 backdrop:backdrop-blur-xs bg-transparent p-0 sm:p-4 w-full max-w-md"
    >
      {isOpen && (
        <div className="rounded-t-3xl sm:rounded-3xl bg-neutral-950 border border-neutral-800 text-white overflow-hidden shadow-2xl">
          {/* Solid Header */}
          <div
            className="px-5 py-4 flex items-center justify-between gap-3"
            style={{ backgroundColor: accentColor, color: '#ffffff' }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider opacity-90">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Culqi Checkout v4 • Entorno Seguro</span>
              </div>
              <h3 id={titleId} className="text-base font-black truncate mt-0.5">
                {storeTitle}
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-xl bg-black/25 text-sm font-black">
                S/ {amountSoles.toFixed(2)}
              </span>
              <button
                type="button"
                disabled={isProcessing}
                onClick={onCancel}
                aria-label="Cerrar pasarela Culqi"
                className="p-1.5 rounded-full bg-black/25 hover:bg-black/40 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <form onSubmit={handlePaySubmit} className="p-5 space-y-4">
            {/* Method Selector */}
            {yapeEnabled && (
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-neutral-900 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setTab('tarjeta');
                    setErrorMsg(null);
                  }}
                  data-auto-contrast={tab === 'tarjeta' && autoButtonContrast ? 'true' : 'false'}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    tab === 'tarjeta' ? 'store-btn-solid' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Tarjeta Débito/Crédito</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('yape');
                    setErrorMsg(null);
                  }}
                  data-auto-contrast={tab === 'yape' && autoButtonContrast ? 'true' : 'false'}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    tab === 'yape' ? 'store-btn-solid' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Pagar con Yape</span>
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-300">
                {errorMsg}
              </div>
            )}

            {tab === 'tarjeta' ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="culqi-cc-num" className="block text-xs font-bold text-neutral-300 mb-1">
                    Número de Tarjeta (Visa, Mastercard, Amex, Diners)
                  </label>
                  <input
                    id="culqi-cc-num"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="4111 1111 1111 1111"
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCardNum(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="culqi-cc-exp" className="block text-xs font-bold text-neutral-300 mb-1">
                      Vencimiento (MM/AA)
                    </label>
                    <input
                      id="culqi-cc-exp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="12/28"
                      value={cardExpiry}
                      onChange={e => setCardExpiry(formatExp(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="culqi-cc-cvv" className="block text-xs font-bold text-neutral-300 mb-1">
                      CVV
                    </label>
                    <input
                      id="culqi-cc-cvv"
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      maxLength={4}
                      placeholder="123"
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="culqi-email" className="block text-xs font-bold text-neutral-300 mb-1">
                    Correo para constancia Culqi
                  </label>
                  <input
                    id="culqi-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="cliente@correo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-200">
                  Abre tu app <strong>Yape</strong>, entra al menú <strong>Código de aprobación</strong> e ingrésalo aquí para debitar al instante con Culqi.
                </div>
                <div>
                  <label htmlFor="culqi-yape-tel" className="block text-xs font-bold text-neutral-300 mb-1">
                    Celular afiliado a Yape
                  </label>
                  <input
                    id="culqi-yape-tel"
                    type="tel"
                    inputMode="numeric"
                    placeholder="987654321"
                    value={yapePhone}
                    onChange={e => setYapePhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor="culqi-yape-otp" className="block text-xs font-bold text-neutral-300 mb-1">
                    Código de aprobación Yape (6 dígitos)
                  </label>
                  <input
                    id="culqi-yape-otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    value={yapeOtp}
                    onChange={e => setYapeOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm font-mono tracking-widest text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-2.5">
              <button
                type="button"
                disabled={isProcessing}
                onClick={onCancel}
                className="px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs font-bold text-neutral-300 hover:text-white whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                className="store-btn-solid flex-1 py-3 px-5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md whitespace-nowrap shrink-0"
              >
                {isProcessing ? (
                  <span>Procesando en Culqi...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pagar S/ {amountSoles.toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[10px] text-neutral-500 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Transacción tokenizada 256-bit SSL por Culqi Perú</span>
            </div>
          </form>
        </div>
      )}
    </dialog>
  );
};
