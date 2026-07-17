const CUSTOMER_TOKEN_BASE_KEY = 'token';
const ADMIN_TOKEN_BASE_KEY = 'adminToken';

const rawNamespace = String(import.meta.env.VITE_AUTH_NAMESPACE || import.meta.env.MODE || 'default').trim();
const AUTH_NAMESPACE = rawNamespace.length > 0 ? rawNamespace : 'default';

function scopedKey(baseKey: string): string {
  return `${baseKey}:${AUTH_NAMESPACE}`;
}

function getWithLegacyFallback(baseKey: string): string | null {
  const scoped = localStorage.getItem(scopedKey(baseKey));
  const legacy = localStorage.getItem(baseKey);

  // Si ambas claves existen y difieren, priorizamos legacy porque puede venir
  // de un login reciente hecho por contextos aun no migrados a namespaced keys.
  if (scoped && legacy && scoped !== legacy) {
    localStorage.setItem(scopedKey(baseKey), legacy);
    return legacy;
  }

  if (scoped) return scoped;

  if (legacy) {
    // Migracion silenciosa: promovemos la sesion previa a la clave namespaced.
    localStorage.setItem(scopedKey(baseKey), legacy);
  }
  return legacy;
}

export function getCustomerToken(): string | null {
  return getWithLegacyFallback(CUSTOMER_TOKEN_BASE_KEY);
}

export function setCustomerToken(token: string): void {
  localStorage.setItem(scopedKey(CUSTOMER_TOKEN_BASE_KEY), token);
}

export function clearCustomerToken(): void {
  localStorage.removeItem(scopedKey(CUSTOMER_TOKEN_BASE_KEY));
  localStorage.removeItem(CUSTOMER_TOKEN_BASE_KEY);
}

export function getAdminToken(): string | null {
  return getWithLegacyFallback(ADMIN_TOKEN_BASE_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(scopedKey(ADMIN_TOKEN_BASE_KEY), token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(scopedKey(ADMIN_TOKEN_BASE_KEY));
  localStorage.removeItem(ADMIN_TOKEN_BASE_KEY);
}

export function getAnyAuthToken(): string | null {
  return getAdminToken() || getCustomerToken();
}
