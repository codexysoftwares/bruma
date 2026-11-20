export type Session = { name: string; contact: string; since: number };
const KEY = 'bruma.session';

export function getSession(): Session | null {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
export function setSession(s: Session) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* modo privado */ }
}
export function clearSession() {
  try { localStorage.removeItem(KEY); } catch { /* */ }
}
