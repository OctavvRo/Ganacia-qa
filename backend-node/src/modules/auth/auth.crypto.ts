import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const ITERACIONES = 210_000;
const LONGITUD_CLAVE = 32;
const DIGEST = 'sha256';

/**
 * Genera un hash PBKDF2 para guardar contrasenas sin persistir el valor real.
 */
export function crearPasswordHash(contrasena: string): string {
  const salt = randomBytes(16).toString('base64url');
  const hash = pbkdf2Sync(contrasena, salt, ITERACIONES, LONGITUD_CLAVE, DIGEST).toString('base64url');
  return `pbkdf2$${ITERACIONES}$${salt}$${hash}`;
}

/**
 * Verifica una contrasena contra el hash guardado.
 */
export function verificarPassword(contrasena: string, passwordHash: string): boolean {
  const [algoritmo, iteracionesTexto, salt, hashEsperado] = passwordHash.split('$');
  if (algoritmo !== 'pbkdf2' || !iteracionesTexto || !salt || !hashEsperado) return false;

  const iteraciones = Number(iteracionesTexto);
  if (!Number.isInteger(iteraciones) || iteraciones <= 0) return false;

  const calculado = pbkdf2Sync(contrasena, salt, iteraciones, LONGITUD_CLAVE, DIGEST);
  const esperado = Buffer.from(hashEsperado, 'base64url');

  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

/**
 * Firma datos de sesion con HMAC-SHA256.
 */
export function firmarSesion(payload: Record<string, unknown>, secreto: string): string {
  const encabezado = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const cuerpo = base64UrlJson(payload);
  const firma = createHmac('sha256', secreto).update(`${encabezado}.${cuerpo}`).digest('base64url');
  return `${encabezado}.${cuerpo}.${firma}`;
}

/**
 * Verifica firma y devuelve el payload de sesion.
 */
export function verificarSesion(token: string, secreto: string): Record<string, unknown> | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;

  const [encabezado, cuerpo, firma] = partes;
  const firmaEsperada = createHmac('sha256', secreto).update(`${encabezado}.${cuerpo}`).digest('base64url');
  const firmaBuffer = Buffer.from(firma);
  const esperadaBuffer = Buffer.from(firmaEsperada);

  if (firmaBuffer.length !== esperadaBuffer.length || !timingSafeEqual(firmaBuffer, esperadaBuffer)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function base64UrlJson(valor: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(valor)).toString('base64url');
}
