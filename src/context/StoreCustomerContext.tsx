import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Order, OrderStatus } from '../types/catalog';
import {
  StoreCustomerAccount,
  SavedCustomerAddress,
  SavedRecurringPayment,
  CardBrand,
} from '../types/storeCustomer';
import { useOrderCatalog } from './OrderCatalogContext';
import { useSettings } from './SettingsContext';
import { soundSynth } from '../utils/audio';

const ACCOUNTS_KEY = 'kh_store_customer_accounts_v1';
const ACTIVE_ACCOUNT_ID_KEY = 'kh_store_active_customer_id_v1';
const GUEST_ORDER_IDS_KEY = 'kh_store_device_order_ids_v1';

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '').slice(-9);
}

export function detectCardBrand(cardNumber: string): CardBrand {
  const clean = cardNumber.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
  if (/^3[47]/.test(clean)) return 'Amex';
  if (/^3(?:0[0-5]|[68])/.test(clean)) return 'Diners';
  return 'Tarjeta';
}

function loadAccounts(): StoreCustomerAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadActiveCustomerId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_ACCOUNT_ID_KEY) || null;
  } catch {
    return null;
  }
}

function loadGuestOrderIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_ORDER_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

const OWN_ORDERS_SNAPSHOT_KEY = 'kh_store_device_orders_v1';

function loadOwnSnapshots(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OWN_ORDERS_SNAPSHOT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Order[]) : [];
  } catch {
    return [];
  }
}

interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  dni?: string;
  password: string;
}

interface UpdateProfilePayload {
  fullName: string;
  email: string;
  phone: string;
  dni: string;
}

interface StoreCustomerContextType {
  currentCustomer: StoreCustomerAccount | null;
  allCustomerAccounts: StoreCustomerAccount[];
  customerOrders: Order[];
  activeCustomerOrdersCount: number;
  registerCustomer: (data: RegisterPayload) => { ok: boolean; error?: string };
  loginCustomer: (identifier: string, password: string) => { ok: boolean; error?: string };
  logoutCustomer: () => void;
  updateCustomerProfile: (data: UpdateProfilePayload) => { ok: boolean; error?: string };
  addCustomerAddress: (addr: Omit<SavedCustomerAddress, 'id'>) => SavedCustomerAddress;
  removeCustomerAddress: (addressId: string) => void;
  setDefaultCustomerAddress: (addressId: string) => void;
  addRecurringPayment: (pm: Omit<SavedRecurringPayment, 'id'>) => SavedRecurringPayment;
  removeRecurringPayment: (paymentId: string) => void;
  setDefaultRecurringPayment: (paymentId: string) => void;
  recordStoreOrder: (orderId: string) => void;
  awardCustomerPoints: (pointsDelta: number, reason: string, orderNumber?: string) => void;
  redeemCustomerPoints: (pointsCost: number, rewardTitle: string, orderNumber?: string) => boolean;
  adjustAccountPointsById: (accountId: string, delta: number, reason: string) => void;
}

const StoreCustomerContext = createContext<StoreCustomerContextType | undefined>(undefined);

export const StoreCustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { orders, customers, upsertCustomer } = useOrderCatalog();
  const { activeTenant, dispatchToast } = useSettings();

  const [accounts, setAccounts] = useState<StoreCustomerAccount[]>(loadAccounts);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(loadActiveCustomerId);
  const [guestOrderIds, setGuestOrderIds] = useState<string[]>(loadGuestOrderIds);

  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch {
      // ignore quota errors
    }
  }, [accounts]);

  useEffect(() => {
    try {
      if (activeCustomerId) {
        localStorage.setItem(ACTIVE_ACCOUNT_ID_KEY, activeCustomerId);
      } else {
        localStorage.removeItem(ACTIVE_ACCOUNT_ID_KEY);
      }
    } catch {
      // ignore
    }
  }, [activeCustomerId]);

  useEffect(() => {
    try {
      localStorage.setItem(GUEST_ORDER_IDS_KEY, JSON.stringify(guestOrderIds));
    } catch {
      // ignore
    }
  }, [guestOrderIds]);

  // Cross-tab sync for customer profile & orders
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACCOUNTS_KEY) setAccounts(loadAccounts());
      if (e.key === ACTIVE_ACCOUNT_ID_KEY) setActiveCustomerId(loadActiveCustomerId());
      if (e.key === GUEST_ORDER_IDS_KEY) setGuestOrderIds(loadGuestOrderIds());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const currentCustomer = useMemo(
    () => accounts.find(a => a.id === activeCustomerId) || null,
    [accounts, activeCustomerId]
  );

  const syncAccountToErpCrm = useCallback(
    (acc: StoreCustomerAccount): string => {
      const defaultAddr = acc.addresses.find(a => a.isDefault) || acc.addresses[0];
      const synced = upsertCustomer(
        {
          id: acc.crmCustomerId,
          dni: acc.dni || '',
          fullName: acc.fullName,
          email: acc.email,
          whatsapp: acc.phone,
          address: defaultAddr?.streetAddress || '',
          reference: defaultAddr?.reference || '',
          loyaltyPoints: acc.points || 0,
          tenantId: activeTenant.id,
        },
        true
      );
      return synced.id;
    },
    [activeTenant.id, upsertCustomer]
  );

  // Sincronización bidireccional segura entre cuentas de Tienda Virtual y CRM/MySQL (sin pisar puntos más recientes)
  const hasSyncedAccountsRef = useRef(false);
  useEffect(() => {
    if (accounts.length === 0) return;

    let changed = false;
    const nextAccounts = accounts.map(acc => {
      const emailClean = (acc.email || '').trim().toLowerCase();
      const phoneDigits = normalizeDigits(acc.phone || '');
      const dniClean = (acc.dni || '').replace(/\D/g, '');

      const crmMatch = customers.find(
        c =>
          (acc.crmCustomerId && c.id === acc.crmCustomerId) ||
          (emailClean && c.email?.trim().toLowerCase() === emailClean) ||
          (phoneDigits.length >= 7 && normalizeDigits(c.whatsapp || '') === phoneDigits) ||
          (dniClean.length >= 8 && c.dni === dniClean)
      );

      if (crmMatch && typeof crmMatch.loyaltyPoints === 'number') {
        const crmTime = new Date(crmMatch.updatedAt || 0).getTime();
        const accTime = new Date(acc.updatedAt || 0).getTime();
        if (crmTime > accTime && crmMatch.loyaltyPoints !== acc.points) {
          changed = true;
          return {
            ...acc,
            crmCustomerId: crmMatch.id,
            points: crmMatch.loyaltyPoints,
            updatedAt: crmMatch.updatedAt,
          };
        }
      }

      if (!hasSyncedAccountsRef.current && (!crmMatch || new Date(acc.updatedAt || 0).getTime() > new Date(crmMatch.updatedAt || 0).getTime())) {
        syncAccountToErpCrm(acc);
      }

      return acc;
    });

    hasSyncedAccountsRef.current = true;
    if (changed) {
      setAccounts(nextAccounts);
    }
  }, [accounts, customers, syncAccountToErpCrm]);

  const registerCustomer = useCallback(
    (data: RegisterPayload): { ok: boolean; error?: string } => {
      const emailClean = data.email.trim().toLowerCase();
      const phoneClean = data.phone.trim();
      const phoneDigits = normalizeDigits(phoneClean);

      if (!data.fullName.trim() || !emailClean || !phoneClean || !data.password) {
        return { ok: false, error: 'Completa todos los campos obligatorios.' };
      }

      const duplicate = accounts.find(
        a =>
          a.email.toLowerCase() === emailClean ||
          (phoneDigits.length >= 7 && normalizeDigits(a.phone) === phoneDigits)
      );

      if (duplicate) {
        return {
          ok: false,
          error: 'Ya existe una cuenta registrada con ese correo o número celular.',
        };
      }

      const now = new Date().toISOString();
      let awardOnRegister = true;
      let welcomeAmount = 1;
      try {
        const rawBenefits = localStorage.getItem('kh_erp_benefits_v1');
        if (rawBenefits) {
          const parsedB = JSON.parse(rawBenefits);
          if (parsedB.pointsConfig) {
            if (typeof parsedB.pointsConfig.awardPointOnRegister === 'boolean') {
              awardOnRegister = parsedB.pointsConfig.awardPointOnRegister;
            }
            if (typeof parsedB.pointsConfig.welcomePointsAmount === 'number' && parsedB.pointsConfig.welcomePointsAmount > 0) {
              welcomeAmount = Math.round(parsedB.pointsConfig.welcomePointsAmount);
            }
          }
        }
      } catch {
        // ignore
      }

      const initialPoints = awardOnRegister ? welcomeAmount : 0;
      const initialHistory = awardOnRegister
        ? [
            {
              id: `pt-init-${Date.now()}`,
              date: now,
              delta: welcomeAmount,
              reason: 'Bono de Bienvenida Club Khalessi',
            },
          ]
        : [];

      const newAccount: StoreCustomerAccount = {
        id: `cust-acc-${Date.now()}`,
        fullName: data.fullName.trim(),
        dni: (data.dni || '').trim(),
        phone: phoneClean,
        email: emailClean,
        password: data.password,
        addresses: [],
        paymentMethods: [],
        orderIds: [...guestOrderIds],
        points: initialPoints,
        pointsHistory: initialHistory,
        createdAt: now,
        updatedAt: now,
      };

      const crmId = syncAccountToErpCrm(newAccount);
      newAccount.crmCustomerId = crmId;

      setAccounts(prev => [newAccount, ...prev]);
      setActiveCustomerId(newAccount.id);
      dispatchToast(
        '¡Bienvenido a Khalessi!',
        `Tu cuenta de cliente ha sido creada, ${newAccount.fullName.split(' ')[0]}.`,
        'success'
      );
      return { ok: true };
    },
    [accounts, dispatchToast, guestOrderIds, syncAccountToErpCrm]
  );

  const loginCustomer = useCallback(
    (identifier: string, password: string): { ok: boolean; error?: string } => {
      const cleanId = identifier.trim().toLowerCase();
      const idDigits = normalizeDigits(cleanId);

      const found = accounts.find(a => {
        const emailMatch = a.email.toLowerCase() === cleanId;
        const phoneMatch = idDigits.length >= 7 && normalizeDigits(a.phone) === idDigits;
        return (emailMatch || phoneMatch) && a.password === password;
      });

      if (!found) {
        return {
          ok: false,
          error: 'Correo/celular o contraseña incorrectos. Verifica tus datos.',
        };
      }

      // Attach any guest orders made on this browser right before signing in
      if (guestOrderIds.length > 0) {
        setAccounts(prev =>
          prev.map(a =>
            a.id === found.id
              ? {
                  ...a,
                  orderIds: Array.from(new Set([...a.orderIds, ...guestOrderIds])),
                }
              : a
          )
        );
      }

      setActiveCustomerId(found.id);
      dispatchToast(
        'Sesión Iniciada',
        `Hola de nuevo, ${found.fullName.split(' ')[0]}.`,
        'success'
      );
      return { ok: true };
    },
    [accounts, dispatchToast, guestOrderIds]
  );

  const logoutCustomer = useCallback(() => {
    setActiveCustomerId(null);
    dispatchToast('Sesión Cerrada', 'Has cerrado sesión en tu perfil de cliente.', 'info');
  }, [dispatchToast]);

  const updateCustomerProfile = useCallback(
    (data: UpdateProfilePayload): { ok: boolean; error?: string } => {
      if (!currentCustomer) return { ok: false, error: 'No hay sesión activa.' };
      const emailClean = data.email.trim().toLowerCase();
      const phoneClean = data.phone.trim();
      if (!data.fullName.trim() || !emailClean || !phoneClean) {
        return { ok: false, error: 'Nombre, correo y celular son obligatorios.' };
      }

      const updated: StoreCustomerAccount = {
        ...currentCustomer,
        fullName: data.fullName.trim(),
        email: emailClean,
        phone: phoneClean,
        dni: data.dni.trim(),
        updatedAt: new Date().toISOString(),
      };
      updated.crmCustomerId = syncAccountToErpCrm(updated);

      setAccounts(prev => prev.map(a => (a.id === updated.id ? updated : a)));
      dispatchToast('Datos Actualizados', 'Tu perfil se guardó correctamente.', 'success');
      return { ok: true };
    },
    [currentCustomer, dispatchToast, syncAccountToErpCrm]
  );

  const addCustomerAddress = useCallback(
    (addr: Omit<SavedCustomerAddress, 'id'>): SavedCustomerAddress => {
      const created: SavedCustomerAddress = {
        ...addr,
        id: `addr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };

      if (currentCustomer) {
        let updatedAcc: StoreCustomerAccount | null = null;
        setAccounts(prev =>
          prev.map(a => {
            if (a.id !== currentCustomer.id) return a;
            const shouldBeDefault = created.isDefault || a.addresses.length === 0;
            const nextList = [
              { ...created, isDefault: shouldBeDefault },
              ...a.addresses.map(existing =>
                shouldBeDefault ? { ...existing, isDefault: false } : existing
              ),
            ];
            const nextAcc = {
              ...a,
              addresses: nextList,
              updatedAt: new Date().toISOString(),
            };
            updatedAcc = nextAcc;
            return nextAcc;
          })
        );
        if (updatedAcc) {
          syncAccountToErpCrm(updatedAcc);
        }
        dispatchToast('Dirección Guardada', 'Se añadió a tus direcciones frecuentes.', 'success');
      }
      return created;
    },
    [currentCustomer, dispatchToast, syncAccountToErpCrm]
  );

  const removeCustomerAddress = useCallback(
    (addressId: string) => {
      if (!currentCustomer) return;
      setAccounts(prev =>
        prev.map(a => {
          if (a.id !== currentCustomer.id) return a;
          const filtered = a.addresses.filter(x => x.id !== addressId);
          if (filtered.length > 0 && !filtered.some(x => x.isDefault)) {
            filtered[0] = { ...filtered[0], isDefault: true };
          }
          return { ...a, addresses: filtered, updatedAt: new Date().toISOString() };
        })
      );
      dispatchToast('Dirección Eliminada', 'Se quitó la dirección de tu perfil.', 'info');
    },
    [currentCustomer, dispatchToast]
  );

  const setDefaultCustomerAddress = useCallback(
    (addressId: string) => {
      if (!currentCustomer) return;
      let updatedAcc: StoreCustomerAccount | null = null;
      setAccounts(prev =>
        prev.map(a => {
          if (a.id !== currentCustomer.id) return a;
          const nextAddresses = a.addresses.map(x => ({
            ...x,
            isDefault: x.id === addressId,
          }));
          const nextAcc = {
            ...a,
            addresses: nextAddresses,
            updatedAt: new Date().toISOString(),
          };
          updatedAcc = nextAcc;
          return nextAcc;
        })
      );
      if (updatedAcc) {
        syncAccountToErpCrm(updatedAcc);
      }
    },
    [currentCustomer, syncAccountToErpCrm]
  );

  const addRecurringPayment = useCallback(
    (pm: Omit<SavedRecurringPayment, 'id'>): SavedRecurringPayment => {
      const created: SavedRecurringPayment = {
        ...pm,
        id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };

      if (currentCustomer) {
        setAccounts(prev =>
          prev.map(a => {
            if (a.id !== currentCustomer.id) return a;
            const shouldBeDefault = created.isDefault || a.paymentMethods.length === 0;
            const nextMethods = [
              { ...created, isDefault: shouldBeDefault },
              ...a.paymentMethods.map(existing =>
                shouldBeDefault ? { ...existing, isDefault: false } : existing
              ),
            ];
            return {
              ...a,
              paymentMethods: nextMethods,
              updatedAt: new Date().toISOString(),
            };
          })
        );
        dispatchToast(
          'Método Recurrente Guardado',
          `${created.alias} quedó listo para tus próximos pedidos.`,
          'success'
        );
      }

      return created;
    },
    [currentCustomer, dispatchToast]
  );

  const removeRecurringPayment = useCallback(
    (paymentId: string) => {
      if (!currentCustomer) return;
      setAccounts(prev =>
        prev.map(a => {
          if (a.id !== currentCustomer.id) return a;
          const filtered = a.paymentMethods.filter(x => x.id !== paymentId);
          if (filtered.length > 0 && !filtered.some(x => x.isDefault)) {
            filtered[0] = { ...filtered[0], isDefault: true };
          }
          return { ...a, paymentMethods: filtered, updatedAt: new Date().toISOString() };
        })
      );
      dispatchToast('Método Eliminado', 'Se retiró el método de pago recurrente.', 'info');
    },
    [currentCustomer, dispatchToast]
  );

  const setDefaultRecurringPayment = useCallback(
    (paymentId: string) => {
      if (!currentCustomer) return;
      setAccounts(prev =>
        prev.map(a => {
          if (a.id !== currentCustomer.id) return a;
          return {
            ...a,
            paymentMethods: a.paymentMethods.map(x => ({
              ...x,
              isDefault: x.id === paymentId,
            })),
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    [currentCustomer]
  );

  const recordStoreOrder = useCallback(
    (orderId: string) => {
      setGuestOrderIds(prev => (prev.includes(orderId) ? prev : [orderId, ...prev]));
      if (currentCustomer) {
        setAccounts(prev =>
          prev.map(a =>
            a.id === currentCustomer.id && !a.orderIds.includes(orderId)
              ? { ...a, orderIds: [orderId, ...a.orderIds], updatedAt: new Date().toISOString() }
              : a
          )
        );
      }
    },
    [currentCustomer]
  );

  const awardCustomerPoints = useCallback(
    (pointsDelta: number, reason: string, orderNumber?: string) => {
      if (!currentCustomer || pointsDelta <= 0) return;
      const now = new Date().toISOString();
      const nextPoints = Math.max(0, (currentCustomer.points || 0) + pointsDelta);
      const updated: StoreCustomerAccount = {
        ...currentCustomer,
        points: nextPoints,
        pointsHistory: [
          {
            id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: now,
            delta: pointsDelta,
            reason,
            orderNumber,
          },
          ...(currentCustomer.pointsHistory || []),
        ],
        updatedAt: now,
      };
      setAccounts(prev => prev.map(a => (a.id === currentCustomer.id ? updated : a)));
      syncAccountToErpCrm(updated);
    },
    [currentCustomer, syncAccountToErpCrm]
  );

  const redeemCustomerPoints = useCallback(
    (pointsCost: number, rewardTitle: string, orderNumber?: string): boolean => {
      if (!currentCustomer || pointsCost <= 0) return false;
      if ((currentCustomer.points || 0) < pointsCost) return false;
      const now = new Date().toISOString();
      const nextPoints = Math.max(0, (currentCustomer.points || 0) - pointsCost);
      const updated: StoreCustomerAccount = {
        ...currentCustomer,
        points: nextPoints,
        pointsHistory: [
          {
            id: `pt-red-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: now,
            delta: -pointsCost,
            reason: `Canje Premio: ${rewardTitle}`,
            orderNumber,
          },
          ...(currentCustomer.pointsHistory || []),
        ],
        updatedAt: now,
      };
      setAccounts(prev => prev.map(a => (a.id === currentCustomer.id ? updated : a)));
      syncAccountToErpCrm(updated);
      return true;
    },
    [currentCustomer, syncAccountToErpCrm]
  );

  const adjustAccountPointsById = useCallback(
    (accountId: string, delta: number, reason: string) => {
      if (delta === 0) return;
      const target = accounts.find(a => a.id === accountId);
      if (!target) return;
      const now = new Date().toISOString();
      const nextPoints = Math.max(0, (target.points || 0) + delta);
      const updated: StoreCustomerAccount = {
        ...target,
        points: nextPoints,
        pointsHistory: [
          {
            id: `pt-adm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: now,
            delta,
            reason,
          },
          ...(target.pointsHistory || []),
        ],
        updatedAt: now,
      };
      setAccounts(prev => prev.map(a => (a.id === accountId ? updated : a)));
      syncAccountToErpCrm(updated);
    },
    [accounts, syncAccountToErpCrm]
  );

  // Live Real-Time Customer Orders matched from OrderCatalogContext.orders
  const liveCustomerOrders = useMemo(() => {
    if (currentCustomer) {
      const custPhoneDigits = normalizeDigits(currentCustomer.phone);
      const custEmail = currentCustomer.email.toLowerCase();
      const idSet = new Set(currentCustomer.orderIds);

      return orders.filter(o => {
        if (idSet.has(o.id)) return true;
        if (currentCustomer.crmCustomerId && o.customerId === currentCustomer.crmCustomerId) {
          return true;
        }
        if (o.customerEmail && o.customerEmail.toLowerCase() === custEmail) return true;
        if (
          custPhoneDigits.length >= 7 &&
          o.customerPhone &&
          normalizeDigits(o.customerPhone) === custPhoneDigits
        ) {
          return true;
        }
        return false;
      });
    }

    const guestSet = new Set(guestOrderIds);
    return orders.filter(o => guestSet.has(o.id));
  }, [currentCustomer, guestOrderIds, orders]);

  // Respaldo local por dispositivo: si el servidor tarda o la lista compartida se reemplaza,
  // el pedido del cliente (con o sin cuenta) NUNCA desaparece de "Mis pedidos".
  const [ownSnapshots, setOwnSnapshots] = useState<Order[]>(loadOwnSnapshots);

  useEffect(() => {
    if (liveCustomerOrders.length === 0) return;
    setOwnSnapshots(prev => {
      const byId = new Map(prev.map(o => [o.id, o]));
      let changed = false;
      for (const o of liveCustomerOrders) {
        const old = byId.get(o.id);
        if (!old || old.status !== o.status || old.updatedAt !== o.updatedAt) {
          byId.set(o.id, o);
          changed = true;
        }
      }
      if (!changed) return prev;
      const next = Array.from(byId.values())
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 30);
      try {
        localStorage.setItem(OWN_ORDERS_SNAPSHOT_KEY, JSON.stringify(next));
      } catch {
        // ignore quota
      }
      return next;
    });
  }, [liveCustomerOrders]);

  const customerOrders = useMemo(() => {
    const liveIds = new Set(liveCustomerOrders.map(o => o.id));
    const ownIds = new Set<string>([...guestOrderIds, ...(currentCustomer?.orderIds || [])]);
    const missing = ownSnapshots.filter(o => ownIds.has(o.id) && !liveIds.has(o.id));
    if (missing.length === 0) return liveCustomerOrders;
    return [...liveCustomerOrders, ...missing].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    );
  }, [liveCustomerOrders, ownSnapshots, guestOrderIds, currentCustomer]);

  const activeCustomerOrdersCount = useMemo(
    () =>
      customerOrders.filter(
        o =>
          o.status === 'recibido' ||
          o.status === 'en_cocina' ||
          o.status === 'en_horno' ||
          o.status === 'listo' ||
          o.status === 'en_ruta'
      ).length,
    [customerOrders]
  );

  // Real-time live toast & audio alert for the Storefront Customer whenever Kitchen / Delivery updates their order status
  const prevOrderStatusesRef = useRef<Map<string, OrderStatus> | null>(null);
  useEffect(() => {
    const nextMap = new Map<string, OrderStatus>();
    customerOrders.forEach(o => nextMap.set(o.id, o.status));

    const prevMap = prevOrderStatusesRef.current;
    prevOrderStatusesRef.current = nextMap;
    if (!prevMap) return;

    const isStorefront =
      typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin');
    if (!isStorefront) return;

    const statusCopy: Record<
      OrderStatus,
      { title: string; message: string; tone: 'info' | 'success' | 'warning' | 'error' }
    > = {
      recibido: {
        title: 'Pedido Recibido',
        message: 'Tu orden ya está en cola de preparación.',
        tone: 'info',
      },
      en_cocina: {
        title: 'Preparando tu Masa 👨‍🍳',
        message: 'Nuestro maestro pizzero está armando tu pedido ahora mismo.',
        tone: 'info',
      },
      en_horno: {
        title: '¡Al Horno a la Leña! 🔥',
        message: 'Tu pizza acaba de entrar al horno de piedra a 430 °C.',
        tone: 'info',
      },
      listo: {
        title: '¡Tu Pedido está Listo! ✅',
        message: 'Empacado caliente y listo para entrega o recojo en tienda.',
        tone: 'success',
      },
      en_ruta: {
        title: 'Motorizado en Camino 🛵',
        message: 'Tu pedido salió de tienda rumbo a tu ubicación.',
        tone: 'success',
      },
      entregado: {
        title: '¡Pedido Entregado! 🍕🎉',
        message: 'Gracias por pedir en Khalessi Pizza. ¡Buen provecho!',
        tone: 'success',
      },
      cancelado: {
        title: 'Pedido Anulado',
        message: 'El estado de tu orden cambió a cancelado.',
        tone: 'error',
      },
    };

    customerOrders.forEach(order => {
      const prevStatus = prevMap.get(order.id);
      if (prevStatus && prevStatus !== order.status) {
        const meta = statusCopy[order.status];
        soundSynth.play('modern');
        dispatchToast(
          `${order.orderNumber} · ${meta.title}`,
          order.status === 'en_ruta' && order.assignedDriverName
            ? `Motorizado asignado: ${order.assignedDriverName}. ${meta.message}`
            : meta.message,
          meta.tone
        );
      }
    });
  }, [customerOrders, dispatchToast]);

  return (
    <StoreCustomerContext.Provider
      value={{
        currentCustomer,
        allCustomerAccounts: accounts,
        customerOrders,
        activeCustomerOrdersCount,
        registerCustomer,
        loginCustomer,
        logoutCustomer,
        updateCustomerProfile,
        addCustomerAddress,
        removeCustomerAddress,
        setDefaultCustomerAddress,
        addRecurringPayment,
        removeRecurringPayment,
        setDefaultRecurringPayment,
        recordStoreOrder,
        awardCustomerPoints,
        redeemCustomerPoints,
        adjustAccountPointsById,
      }}
    >
      {children}
    </StoreCustomerContext.Provider>
  );
};

export const useStoreCustomer = () => {
  const ctx = useContext(StoreCustomerContext);
  if (!ctx) {
    throw new Error('useStoreCustomer must be used within a StoreCustomerProvider');
  }
  return ctx;
};
