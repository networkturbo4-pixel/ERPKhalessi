import { Customer } from '../types/catalog';
import { lookupDniFacturalo, lookupRucFacturalo, FacturaloRucResponse } from './facturaloApi';

export interface ReniecApiConfig {
  endpointUrl: string;
  apiToken: string;
}

export interface DniLookupResult {
  found: boolean;
  source: 'crm' | 'facturalo' | 'api' | 'padron_demo' | 'manual';
  dni: string;
  fullName: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  reference?: string;
  existingCustomer?: Customer;
  message: string;
}

export { lookupRucFacturalo };
export type { FacturaloRucResponse };

const RENIEC_CONFIG_KEY = 'kh_reniec_api_config';

export function getReniecApiConfig(): ReniecApiConfig {
  try {
    const raw = localStorage.getItem(RENIEC_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        endpointUrl: parsed.endpointUrl || 'https://api.apis.net.pe/v2/reniec/dni?numero={dni}',
        apiToken: parsed.apiToken || '',
      };
    }
  } catch {
    // ignore
  }
  return {
    endpointUrl: 'https://api.apis.net.pe/v2/reniec/dni?numero={dni}',
    apiToken: '',
  };
}

export function saveReniecApiConfig(config: ReniecApiConfig): void {
  try {
    localStorage.setItem(RENIEC_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

// Padrón de respaldo local para pruebas instantáneas sin token externo o modo offline
const LOCAL_PADRON_DEMO: Record<string, string> = {
  '72849103': 'César Augusto Quispe Rojas',
  '45891234': 'Rodrigo Alejandro Mendoza Salazar',
  '71234567': 'Camila Fernanda Paredes Torres',
  '46918205': 'Valeria Sofía Mendoza Luna',
  '43219876': 'Jorge Luis Huamán Castillo',
  '74859612': 'Andrea Carolina Chávez Ríos',
  '48127635': 'Diego Sebastián Vargas Alarcón',
  '70192837': 'Lucía Mariana Santillán Gómez',
  '10293847': 'Carlos Alberto Benavides Flores',
  '76543210': 'Fiorella Ximena Delgado Paz',
};

function titleCaseName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
}

export async function lookupPersonByDni(
  rawDni: string,
  existingCustomers: Customer[]
): Promise<DniLookupResult> {
  const dni = rawDni.replace(/\D/g, '').slice(0, 8);
  if (dni.length !== 8) {
    return {
      found: false,
      source: 'manual',
      dni,
      fullName: '',
      message: 'Ingresa un número de DNI válido de 8 dígitos.',
    };
  }

  // 1. Buscar primero en la cartera de Clientes CRM local
  const crmMatch = existingCustomers.find((c) => c.dni === dni);
  if (crmMatch) {
    return {
      found: true,
      source: 'crm',
      dni,
      fullName: crmMatch.fullName,
      email: crmMatch.email,
      whatsapp: crmMatch.whatsapp,
      address: crmMatch.address,
      reference: crmMatch.reference,
      existingCustomer: crmMatch,
      message: 'Cliente recurrente encontrado en el módulo Clientes.',
    };
  }

  // 2. Consultar API Factúralo PRO (docs.facturalo.pe)
  try {
    const facturaloRes = await lookupDniFacturalo(dni);
    if (facturaloRes.success && facturaloRes.fullName) {
      return {
        found: true,
        source: facturaloRes.source === 'facturalo' ? 'facturalo' : 'padron_demo',
        dni,
        fullName: facturaloRes.fullName,
        address: facturaloRes.direccion,
        message: facturaloRes.message,
      };
    }
  } catch {
    // Continuar a fallback de API RENIEC secundaria
  }

  // 3. Consultar API RENIEC secundaria configurada (si tiene token o endpoint público accesible)
  const config = getReniecApiConfig();
  if (config.endpointUrl) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3500);

    try {
      const targetUrl = config.endpointUrl.includes('{dni}')
        ? config.endpointUrl.replace('{dni}', dni)
        : `${config.endpointUrl}${config.endpointUrl.includes('?') ? '&' : '?'}numero=${dni}`;

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (config.apiToken.trim()) {
        headers.Authorization = `Bearer ${config.apiToken.trim()}`;
      }

      const res = await fetch(targetUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const payload = json?.data || json;
        const nombres = payload?.nombres || payload?.first_name || '';
        const apPaterno = payload?.apellidoPaterno || payload?.first_last_name || '';
        const apMaterno = payload?.apellidoMaterno || payload?.second_last_name || '';
        const composed = [nombres, apPaterno, apMaterno].filter(Boolean).join(' ');
        const directFull =
          payload?.nombreCompleto || payload?.nombre_completo || payload?.full_name || composed;

        if (directFull && typeof directFull === 'string' && directFull.trim().length > 2) {
          return {
            found: true,
            source: 'api',
            dni,
            fullName: titleCaseName(directFull),
            message: 'Identidad validada mediante API DNI RENIEC.',
          };
        }
      }
    } catch {
      window.clearTimeout(timeoutId);
      // Fallback silencioso a padrón local / registro manual
    }
  }

  // 3. Padrón de prueba rápida o pase limpio a registro manual
  if (LOCAL_PADRON_DEMO[dni]) {
    return {
      found: true,
      source: 'padron_demo',
      dni,
      fullName: LOCAL_PADRON_DEMO[dni],
      message: 'Nombres obtenidos del padrón rápido. Completa WhatsApp o dirección.',
    };
  }

  return {
    found: false,
    source: 'manual',
    dni,
    fullName: '',
    message: 'DNI listo para registro manual (puedes configurar tu Token RENIEC en Integraciones).',
  };
}
