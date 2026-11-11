/**
 * Estándar RFC 6238 (TOTP) / RFC 4226 (HOTP) compatible al 100% con
 * Google Authenticator, Microsoft Authenticator, Authy y 1Password.
 * Implementado nativamente con Web Crypto API (HMAC-SHA1) sin dependencias externas.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(length = 16): string {
  const randomBytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let secret = '';
  for (let i = 0; i < length; i += 1) {
    secret += BASE32_ALPHABET[randomBytes[i] % 32];
  }
  return secret;
}

export function formatBase32Secret(secret: string): string {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

export function base32ToBytes(base32: string): Uint8Array {
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  if (!cleaned.length) {
    return new Uint8Array(0);
  }

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleaned.length; i += 1) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

export async function generateHotpCode(
  secret: string,
  counter: number,
  digits = 6
): Promise<string> {
  const keyBytes = base32ToBytes(secret);
  if (keyBytes.length === 0) return '000000';

  const counterBytes = new Uint8Array(8);
  let temp = Math.floor(counter);
  for (let i = 7; i >= 0; i -= 1) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  const keyBuffer = keyBytes.buffer.slice(
    keyBytes.byteOffset,
    keyBytes.byteOffset + keyBytes.byteLength
  ) as ArrayBuffer;

  const counterBuffer = counterBytes.buffer.slice(
    counterBytes.byteOffset,
    counterBytes.byteOffset + counterBytes.byteLength
  ) as ArrayBuffer;

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
  const hmac = new Uint8Array(signature);
  const offset = hmac[hmac.length - 1] & 0x0f;

  const binaryCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const modulo = 10 ** digits;
  return String(binaryCode % modulo).padStart(digits, '0');
}

export async function generateCurrentTotp(
  secret: string,
  timestampMs = Date.now(),
  stepSeconds = 30
): Promise<string> {
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  return generateHotpCode(secret, counter, 6);
}

function timingSafeDigitsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyTotpCode(
  secret: string,
  candidateCode: string,
  windowSteps = 1,
  timestampMs = Date.now(),
  stepSeconds = 30
): Promise<{ valid: boolean; driftSteps: number }> {
  const cleanCode = candidateCode.replace(/\D/g, '');
  if (cleanCode.length !== 6 || !secret.trim()) {
    return { valid: false, driftSteps: 0 };
  }

  const baseCounter = Math.floor(timestampMs / 1000 / stepSeconds);
  for (let offset = -windowSteps; offset <= windowSteps; offset += 1) {
    const expected = await generateHotpCode(secret, baseCounter + offset, 6);
    if (timingSafeDigitsEqual(expected, cleanCode)) {
      return { valid: true, driftSteps: offset };
    }
  }

  return { valid: false, driftSteps: 0 };
}

export function getTotpRemainingSeconds(timestampMs = Date.now(), stepSeconds = 30): number {
  const elapsed = Math.floor(timestampMs / 1000) % stepSeconds;
  return stepSeconds - elapsed;
}

export function buildOtpAuthUri(params: {
  secret: string;
  accountLabel: string;
  issuer: string;
}): string {
  const cleanSecret = params.secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const safeIssuer = params.issuer.trim() || 'Khalessi Pizza ERP';
  const safeAccount = params.accountLabel.trim() || 'ControlAcceso';
  const label = `${encodeURIComponent(safeIssuer)}:${encodeURIComponent(safeAccount)}`;
  const query = new URLSearchParams({
    secret: cleanSecret,
    issuer: safeIssuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}
