import type { Project } from './types';

const DB = 'bruma';
const STORE = 'projects';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

const subs = new Set<() => void>();
export const onProjectsChange = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };
const emit = () => subs.forEach((f) => f());

export const listProjects = async () => (await tx<Project[]>('readonly', (s) => s.getAll())).sort((a, b) => b.createdAt - a.createdAt);
export const getProject = (id: string) => tx<Project | undefined>('readonly', (s) => s.get(id));
export async function saveProject(p: Project) { await tx('readwrite', (s) => s.put(p)); emit(); }
export async function deleteProject(id: string) { await tx('readwrite', (s) => s.delete(id)); emit(); }
export async function patchProject(id: string, patch: Partial<Project> | ((p: Project) => Partial<Project>)) {
  const p = await getProject(id);
  if (!p) return;
  const next = { ...p, ...(typeof patch === 'function' ? patch(p) : patch) };
  await saveProject(next);
  return next;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
