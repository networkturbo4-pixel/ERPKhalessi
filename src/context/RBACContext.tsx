import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ErpModuleKey, Permission, Role, User } from '../types/settings';

export interface ErpModuleMeta {
  key: ErpModuleKey;
  label: string;
  shortDesc: string;
  category: 'operaciones' | 'inventario' | 'comercial' | 'administracion';
}

export const ERP_MODULES_CATALOG: ErpModuleMeta[] = [
  { key: 'dashboard', label: 'Dashboard & BI Ejecutivo', shortDesc: 'KPIs en vivo, ventas por hora y comparativa multisucursal', category: 'operaciones' },
  { key: 'pos', label: 'Punto de Venta (POS) & Caja', shortDesc: 'Toma de pedidos mostrador, cobros QR/tarjeta y arqueos', category: 'operaciones' },
  { key: 'kds', label: 'Cocina KDS & Hornos', shortDesc: 'Pantallas de horneado, tiempos de cocción y despacho', category: 'operaciones' },
  { key: 'delivery', label: 'Delivery & Flota Motorizados', shortDesc: 'Rutas propias, integración Rappi/PedidosYa y tracking', category: 'operaciones' },
  { key: 'tables', label: 'Salón, Mesas & Comandas', shortDesc: 'Mapa de mesas por piso, cuentas divididas y reservas', category: 'operaciones' },
  { key: 'services', label: 'Catálogo, Recetas & Masas', shortDesc: 'Tamaños de pizza, bordes, ingredientes y escandallos BOM', category: 'inventario' },
  { key: 'inventory', label: 'Almacén, Stock & Mermas', shortDesc: 'Control de harinas, quesos, lotes de caducidad y kardex', category: 'inventario' },
  { key: 'purchases', label: 'Compras & Proveedores', shortDesc: 'Órdenes de compra consolidadas, guías y recepción', category: 'inventario' },
  { key: 'quotes', label: 'Cotizaciones & Eventos', shortDesc: 'Paquetes corporativos, catering y descuentos especiales', category: 'comercial' },
  { key: 'clients', label: 'Clientes CRM & Fidelización', shortDesc: 'Historial de pedidos, cartera y perfiles de clientes', category: 'comercial' },
  { key: 'benefits', label: 'Beneficios, Cupones & Puntos', shortDesc: 'Gestor de cupones promocionales, tarjetas de puntos y premios canjeables', category: 'comercial' },
  { key: 'finances', label: 'Finanzas, Bancos & SUNAT', shortDesc: 'Facturación electrónica, cuentas bancarias y billeteras QR', category: 'comercial' },
  { key: 'hr', label: 'Recursos Humanos & Biométrico', shortDesc: 'Legajos sanitarios, reloj de asistencia, turnos, pre-planilla y TOTP', category: 'administracion' },
  { key: 'workspace', label: 'Multisucursal & Transferencias', shortDesc: 'Gestión de locales físicos y envíos entre tiendas', category: 'administracion' },
  { key: 'settings', label: 'Configuración Global & Seguridad', shortDesc: 'Identidad, Design System, usuarios, matriz RBAC y DevOps', category: 'administracion' },
];

export const SYSTEM_PERMISSIONS: Permission[] = [
  // 1. Dashboard
  { id: 'd1', code: 'dashboard:view', name: 'Ver KPIs de Sede', description: 'Visualizar métricas operativas del local asignado', module: 'dashboard', action: 'view' },
  { id: 'd2', code: 'dashboard:export', name: 'Exportar Reportes BI', description: 'Descargar cierres en Excel / PDF', module: 'dashboard', action: 'special' },

  // 2. POS
  { id: 'pos1', code: 'pos:view', name: 'Abrir Terminal POS', description: 'Ingresar a pantalla táctil de punto de venta', module: 'pos', action: 'view' },
  { id: 'pos2', code: 'pos:create', name: 'Emitir Comandas y Boletas', description: 'Registrar ventas rápidas en mostrador', module: 'pos', action: 'create' },
  { id: 'pos3', code: 'pos:edit', name: 'Modificar Pedido Abierto', description: 'Cambiar ingredientes o mitad/mitad antes de horno', module: 'pos', action: 'edit' },
  { id: 'pos4', code: 'pos:delete', name: 'Anular Ticket / Nota Crédito', description: 'Cancelar ventas con registro de auditoría', module: 'pos', action: 'delete' },
  { id: 'pos5', code: 'pos:cash_close', name: 'Cierre Ciego de Caja', description: 'Cuadrar efectivo, Yape/Plin y POS bancario', module: 'pos', action: 'special' },

  // 3. KDS Cocina
  { id: 'kds1', code: 'kds:view', name: 'Ver Monitor Cocina KDS', description: 'Visualizar cola de pizzas en preparación y horno', module: 'kds', action: 'view' },
  { id: 'kds2', code: 'kds:edit', name: 'Marcar Estados de Horno', description: 'Avanzar comanda a En Horno / Lista para corte', module: 'kds', action: 'edit' },
  { id: 'kds3', code: 'kds:priority', name: 'Priorizar Orden Rush', description: 'Mover comanda urgente al tope de pantalla', module: 'kds', action: 'special' },

  // 4. Delivery
  { id: 'del1', code: 'delivery:view', name: 'Ver Panel Despacho', description: 'Consultar pedidos en ruta y tiempos de entrega', module: 'delivery', action: 'view' },
  { id: 'del2', code: 'delivery:create', name: 'Asignar Motorizado', description: 'Vincular repartidor y zona de reparto', module: 'delivery', action: 'create' },
  { id: 'del3', code: 'delivery:edit', name: 'Reasignar / Incidencias', description: 'Gestionar direcciones o reprogramaciones', module: 'delivery', action: 'edit' },

  // 5. Salón & Mesas
  { id: 'tab1', code: 'tables:view', name: 'Ver Mapa de Salón', description: 'Ver ocupación de mesas y terrazas en vivo', module: 'tables', action: 'view' },
  { id: 'tab2', code: 'tables:create', name: 'Abrir Mesa / Reserva', description: 'Asignar comensales y mozo responsable', module: 'tables', action: 'create' },
  { id: 'tab3', code: 'tables:edit', name: 'Unir Mesas / Dividir Cuenta', description: 'Separar precuentas por comensal', module: 'tables', action: 'edit' },

  // 6. Catálogo y Recetas (services)
  { id: 'p8', code: 'services:view', name: 'Ver Catálogo y Recetas', description: 'Visualizar pizzas, tamaños e ingredientes', module: 'services', action: 'view' },
  { id: 'srv2', code: 'services:create', name: 'Crear Productos / Combos', description: 'Añadir nuevas pizzas o promociones al menú', module: 'services', action: 'create' },
  { id: 'p9', code: 'services:manage', name: 'Editar Escandallos y Precios', description: 'Modificar gramajes BOM y precios por sede', module: 'services', action: 'edit' },
  { id: 'srv4', code: 'services:delete', name: 'Retirar Producto del Menú', description: 'Desactivar o eliminar ítems del catálogo', module: 'services', action: 'delete' },

  // 7. Inventario
  { id: 'inv1', code: 'inventory:view', name: 'Ver Stock por Almacén', description: 'Consultar existencias de masa, queso e insumos', module: 'inventory', action: 'view' },
  { id: 'inv2', code: 'inventory:create', name: 'Registrar Ingreso / Merma', description: 'Cargar conteo físico o mermas de cocina', module: 'inventory', action: 'create' },
  { id: 'inv3', code: 'inventory:edit', name: 'Ajustar Kardex', description: 'Corregir stock mínimo y puntos de reorden', module: 'inventory', action: 'edit' },
  { id: 'inv4', code: 'inventory:audit', name: 'Aprobar Auditoría Stock', description: 'Cerrar inventario mensual valorizado', module: 'inventory', action: 'special' },

  // 8. Compras
  { id: 'pur1', code: 'purchases:view', name: 'Ver Proveedores y OC', description: 'Consultar órdenes de compra e historial', module: 'purchases', action: 'view' },
  { id: 'pur2', code: 'purchases:create', name: 'Emitir Orden de Compra', description: 'Solicitar insumos a proveedores homologados', module: 'purchases', action: 'create' },
  { id: 'pur3', code: 'purchases:approve', name: 'Aprobar Compra Mayor', description: 'Autorizar órdenes superiores al límite de tienda', module: 'purchases', action: 'special' },

  // 9. Cotizaciones (quotes)
  { id: 'p5', code: 'quotes:view', name: 'Ver Cotizaciones y Pedidos', description: 'Consultar historial de pedidos corporativos', module: 'quotes', action: 'view' },
  { id: 'p6', code: 'quotes:create', name: 'Crear Cotización Evento', description: 'Generar propuestas para eventos y cumpleaños', module: 'quotes', action: 'create' },
  { id: 'q3', code: 'quotes:edit', name: 'Editar Cotización', description: 'Actualizar cantidades y condiciones comerciales', module: 'quotes', action: 'edit' },
  { id: 'p7', code: 'quotes:approve', name: 'Aprobar Cortesías / Descuentos', description: 'Autorizar descuentos > 15% y cortesías', module: 'quotes', action: 'special' },

  // 10. Clientes CRM
  { id: 'p1', code: 'clients:view', name: 'Ver Cartera Clientes', description: 'Acceso al directorio y preferencias de clientes', module: 'clients', action: 'view' },
  { id: 'p2', code: 'clients:create', name: 'Registrar Clientes', description: 'Dar de alta clientes RUC/DNI en mostrador', module: 'clients', action: 'create' },
  { id: 'p3', code: 'clients:edit', name: 'Editar Datos y Puntos', description: 'Modificar direcciones de reparto y fidelización', module: 'clients', action: 'edit' },
  { id: 'p4', code: 'clients:delete', name: 'Eliminar Clientes', description: 'Depurar o anonimizar registros inactivos', module: 'clients', action: 'delete' },

  // 10B. Beneficios, Cupones & Tarjetas de Puntos
  { id: 'ben1', code: 'benefits:view', name: 'Ver Módulo Beneficios', description: 'Consultar cupones activos, tarjetas de puntos y premios', module: 'benefits', action: 'view' },
  { id: 'ben2', code: 'benefits:manage', name: 'Gestionar Cupones y Premios', description: 'Crear/editar cupones, configurar puntos por compra y premios', module: 'benefits', action: 'edit' },

  // 11. Finanzas
  { id: 'p10', code: 'finances:view', name: 'Ver Flujo de Caja y Ventas', description: 'Consultar ingresos consolidados y márgenes', module: 'finances', action: 'view' },
  { id: 'fin2', code: 'finances:create', name: 'Registrar Egreso / Gasto Chica', description: 'Cargar pagos menores de tienda con sustento', module: 'finances', action: 'create' },
  { id: 'p11', code: 'finances:manage_banks', name: 'Gestionar Bancos y QR Yape/Plin', description: 'Configurar cuentas recaudadoras y QRs oficiales', module: 'finances', action: 'edit' },
  { id: 'fin4', code: 'finances:sunat', name: 'Reenvío Resumen SUNAT/OSE', description: 'Gestionar facturación electrónica y bajas', module: 'finances', action: 'special' },

  // 12. Recursos Humanos & Asistencia (hr)
  { id: 'hr1', code: 'hr:view', name: 'Ver Legajos y Asistencia', description: 'Consultar personal de sede, carnets sanitarios y marcaciones del día', module: 'hr', action: 'view' },
  { id: 'hr2', code: 'hr:attendance', name: 'Registrar Marcación / Biométrico', description: 'Operar reloj de entrada, refrigerio, salida y sincronización biométrica', module: 'hr', action: 'create' },
  { id: 'hr3', code: 'hr:schedules', name: 'Planificar Turnos y Legajos', description: 'Editar horarios semanales, apoyo entre sedes, contratos y carnets', module: 'hr', action: 'edit' },
  { id: 'hr4', code: 'hr:payroll', name: 'Gestionar Adelantos y Pre-Planilla', description: 'Registrar adelantos, horas extra, bonos y consumos de personal', module: 'hr', action: 'delete' },
  { id: 'hr5', code: 'hr:totp_security', name: 'Autorizar Google Authenticator', description: 'Configurar política de bloqueo sin asistencia y llaves TOTP de desbloqueo', module: 'hr', action: 'special' },

  // 13. Multisucursal (workspace)
  { id: 'p12', code: 'workspace:access', name: 'Operar en Sede Asignada', description: 'Acceso operativo a terminales de sucursal', module: 'workspace', action: 'view' },
  { id: 'ws2', code: 'workspace:transfer', name: 'Transferir Stock entre Sedes', description: 'Enviar insumos de Matriz a otros locales', module: 'workspace', action: 'create' },
  { id: 'p13', code: 'workspace:manage_branch', name: 'Crear y Editar Sucursales', description: 'Configurar nuevos locales, aforos y hornos', module: 'workspace', action: 'edit' },
  { id: 'ws4', code: 'workspace:consolidated', name: 'Vista Consolidada Corporativa', description: 'Supervisar todas las pizzerías simultáneamente', module: 'workspace', action: 'special' },

  // 13. Configuración Global (settings)
  { id: 'p14', code: 'settings:view', name: 'Ver Panel Configuración', description: 'Visualizar secciones de ajustes del ERP', module: 'settings', action: 'view' },
  { id: 'p16', code: 'settings:users', name: 'Crear y Gestionar Usuarios', description: 'Administrar personal, PINs POS y suspensiones', module: 'settings', action: 'create' },
  { id: 'p15', code: 'settings:manage', name: 'Editar Marca y Design System', description: 'Modificar colores, temas, modales e integraciones', module: 'settings', action: 'edit' },
  { id: 'p17', code: 'settings:roles', name: 'Administrar Matriz RBAC', description: 'Crear roles y asignar privilegios granulares', module: 'settings', action: 'delete' },
  { id: 'p18', code: 'settings:system_update', name: 'DevOps, Backups y Servidor', description: 'Ejecutar respaldos PostgreSQL y despliegues', module: 'settings', action: 'special' },
];

export const INITIAL_ROLES: Role[] = [
  {
    id: 'role-admin',
    name: 'Super Administrador',
    description: 'Control corporativo total sobre todas las sucursales, finanzas, Design System y seguridad RBAC.',
    isSystem: true,
    permissions: SYSTEM_PERMISSIONS.map(p => p.code),
  },
  {
    id: 'role-manager',
    name: 'Gerente de Sucursal',
    description: 'Dirige la operación integral de su local: turnos, inventario, compras menores, caja y KDS.',
    isSystem: false,
    permissions: [
      'dashboard:view', 'dashboard:export',
      'pos:view', 'pos:create', 'pos:edit', 'pos:delete', 'pos:cash_close',
      'kds:view', 'kds:edit', 'kds:priority',
      'delivery:view', 'delivery:create', 'delivery:edit',
      'tables:view', 'tables:create', 'tables:edit',
      'services:view',
      'inventory:view', 'inventory:create', 'inventory:edit',
      'purchases:view', 'purchases:create',
      'quotes:view', 'quotes:create', 'quotes:edit', 'quotes:approve',
      'clients:view', 'clients:create', 'clients:edit',
      'benefits:view', 'benefits:manage',
      'finances:view', 'finances:create',
      'hr:view', 'hr:attendance', 'hr:schedules', 'hr:payroll',
      'workspace:access', 'workspace:transfer',
      'settings:view', 'settings:users',
    ],
  },
  {
    id: 'role-cashier',
    name: 'Cajero POS & Mostrador',
    description: 'Atención ágil en mostrador, cobros Yape/Plin/Tarjeta, salón y despacho delivery.',
    isSystem: false,
    permissions: [
      'dashboard:view',
      'pos:view', 'pos:create', 'pos:edit', 'pos:cash_close',
      'delivery:view', 'delivery:create',
      'tables:view', 'tables:create', 'tables:edit',
      'services:view',
      'quotes:view', 'quotes:create',
      'clients:view', 'clients:create',
      'workspace:access',
    ],
  },
  {
    id: 'role-kitchen',
    name: 'Maestro Pizzero / Jefe KDS',
    description: 'Gestión de hornos de piedra, pantallas KDS, control de masa madre y registro de mermas.',
    isSystem: false,
    permissions: [
      'kds:view', 'kds:edit', 'kds:priority',
      'services:view',
      'inventory:view', 'inventory:create',
      'workspace:access',
    ],
  },
  {
    id: 'role-delivery',
    name: 'Motorizado & Despacho Delivery',
    description: 'Recepción de pedidos listos de cocina, ruta en vivo, contacto WhatsApp/Maps y confirmación de entrega.',
    isSystem: false,
    permissions: [
      'delivery:view', 'delivery:create', 'delivery:edit',
      'workspace:access',
    ],
  },
];

export const MOCK_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'César Augusto (Tú)',
    email: 'cesar@khalessipizza.com',
    phone: '+51 987 654 321',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    roleId: 'role-admin',
    roleName: 'Super Administrador',
    status: 'active',
    pin: '230825',
    documentType: 'Código (6d)',
    branchIds: ['all'],
    createdAt: '2024-01-15',
    lastLogin: 'En línea ahora',
  },
  {
    id: 'usr-2',
    name: 'Valeria Mendoza',
    email: 'valeria.surco@khalessipizza.com',
    phone: '+51 912 345 678',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    roleId: 'role-manager',
    roleName: 'Gerente de Sucursal',
    status: 'active',
    pin: '46918205',
    documentType: 'DNI (8d)',
    branchIds: ['tenant-1'],
    createdAt: '2024-02-10',
    lastLogin: 'Hace 12 min',
  },
  {
    id: 'usr-3',
    name: 'Mateo Rossi',
    email: 'mateo.miraflores@khalessipizza.com',
    phone: '+51 978 112 233',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    roleId: 'role-manager',
    roleName: 'Gerente de Sucursal',
    status: 'active',
    pin: '00482916',
    documentType: 'CE (8d)',
    branchIds: ['tenant-2'],
    createdAt: '2024-03-01',
    lastLogin: 'Hoy, 13:15',
  },
  {
    id: 'usr-4',
    name: 'Lucía Santillán',
    email: 'lucia.sanisidro@khalessipizza.com',
    phone: '+51 945 881 029',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
    roleId: 'role-cashier',
    roleName: 'Cajero POS & Mostrador',
    status: 'active',
    pin: '559012',
    documentType: 'Código (6d)',
    branchIds: ['tenant-3'],
    createdAt: '2024-04-18',
    lastLogin: 'Hoy, 14:40',
  },
  {
    id: 'usr-5',
    name: 'Marco Bellini',
    email: 'marco.horno@khalessipizza.com',
    phone: '+51 966 320 410',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    roleId: 'role-kitchen',
    roleName: 'Maestro Pizzero / Jefe KDS',
    status: 'active',
    pin: '8820',
    documentType: 'PIN (4d)',
    branchIds: ['tenant-1', 'tenant-2'],
    createdAt: '2024-05-04',
    lastLogin: 'Hoy, 15:10',
  },
  {
    id: 'usr-6',
    name: 'Diego Vargas',
    email: 'diego.ruta@khalessipizza.com',
    phone: '+51 951 774 320',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
    roleId: 'role-delivery',
    roleName: 'Motorizado & Despacho Delivery',
    status: 'active',
    pin: '48127635',
    documentType: 'DNI (8d)',
    branchIds: ['all'],
    createdAt: '2024-06-12',
    lastLogin: 'En ruta activa',
  },
];

const RBAC_STORAGE_KEY = 'khalessi_erp_rbac_v3';

function loadSavedRBAC(): { roles: Role[]; currentUser: User } {
  try {
    const raw = localStorage.getItem(RBAC_STORAGE_KEY);
    if (!raw) return { roles: INITIAL_ROLES, currentUser: MOCK_USERS[0] };
    const parsed = JSON.parse(raw);
    let savedRoles: Role[] = Array.isArray(parsed.roles) && parsed.roles.length > 0
      ? parsed.roles.map((r: Role) => {
          if (r.id === 'role-admin') {
            return { ...r, permissions: SYSTEM_PERMISSIONS.map(p => p.code) };
          }
          if (r.id === 'role-manager') {
            let nextPerms = [...r.permissions];
            if (!nextPerms.some(p => p.startsWith('hr:'))) {
              nextPerms = [...nextPerms, 'hr:view', 'hr:attendance', 'hr:schedules', 'hr:payroll'];
            }
            if (!nextPerms.some(p => p.startsWith('benefits:'))) {
              nextPerms = [...nextPerms, 'benefits:view', 'benefits:manage'];
            }
            return { ...r, permissions: nextPerms };
          }
          return r;
        })
      : INITIAL_ROLES;
    const deliveryDefault = INITIAL_ROLES.find(r => r.id === 'role-delivery');
    if (deliveryDefault && !savedRoles.some(r => r.id === 'role-delivery')) {
      savedRoles = [...savedRoles, deliveryDefault];
    }
    const savedUser: User = parsed.currentUser?.id ? parsed.currentUser : MOCK_USERS[0];
    return { roles: savedRoles, currentUser: savedUser };
  } catch {
    return { roles: INITIAL_ROLES, currentUser: MOCK_USERS[0] };
  }
}

interface RBACContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  roles: Role[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  permissions: Permission[];
  modulesCatalog: ErpModuleMeta[];
  hasPermission: (permissionCode: string) => boolean;
  canEditRole: (targetRoleId: string) => { allowed: boolean; reason?: string };
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export const RBACProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initial = loadSavedRBAC();
  const [currentUser, setCurrentUser] = useState<User>(initial.currentUser);
  const [roles, setRoles] = useState<Role[]>(initial.roles);

  // Persist RBAC state across reloads immediately
  useEffect(() => {
    try {
      localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify({ roles, currentUser }));
    } catch {
      // Ignore storage quota errors
    }
  }, [roles, currentUser]);

  // Sync RBAC role matrix updates live across tabs & devices without hijacking each device's operator session
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== RBAC_STORAGE_KEY) return;
      const fresh = loadSavedRBAC();
      setRoles(fresh.roles);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const currentRole = roles.find(r => r.id === currentUser.roleId);

  const hasPermission = (permissionCode: string): boolean => {
    if (!currentRole) return false;
    if (currentRole.id === 'role-admin') return true;
    return currentRole.permissions.includes(permissionCode);
  };

  const canEditRole = (targetRoleId: string): { allowed: boolean; reason?: string } => {
    if (!hasPermission('settings:roles')) {
      return { allowed: false, reason: 'No tienes el permiso "settings:roles" para modificar roles.' };
    }
    if (targetRoleId === currentUser.roleId && currentRole?.id !== 'role-admin') {
      return { allowed: false, reason: 'Por seguridad, no puedes alterar tu propio rol actual.' };
    }
    return { allowed: true };
  };

  return (
    <RBACContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        roles,
        setRoles,
        permissions: SYSTEM_PERMISSIONS,
        modulesCatalog: ERP_MODULES_CATALOG,
        hasPermission,
        canEditRole,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
};

export const useRBAC = () => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};
