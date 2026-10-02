export function newId(): string {
  // crypto.randomUUID needs a secure context; fall back for plain-http dev on a LAN address.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
