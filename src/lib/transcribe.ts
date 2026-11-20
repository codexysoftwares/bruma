import type { Word } from './types';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (w: Word[]) => void; reject: (e: Error) => void }>();
const listeners = new Set<(m: { type: string; text?: string; progress?: number }) => void>();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (ev) => {
    const m = ev.data;
    if (m.type === 'result') { pending.get(m.id)?.resolve(m.words); pending.delete(m.id); }
    else if (m.type === 'error') { pending.get(m.id)?.reject(new Error(m.message)); pending.delete(m.id); }
    else listeners.forEach((l) => l(m));
  };
  worker.onerror = (e) => { pending.forEach((p) => p.reject(new Error(e.message || 'Erro no worker'))); pending.clear(); worker = null; };
  return worker;
}

export function onTranscriberStatus(fn: (m: { type: string; text?: string; progress?: number }) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function transcribe(audio: Float32Array, timeoutMs = 10 * 60_000): Promise<Word[]> {
  const w = getWorker();
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const t = setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('Tempo esgotado na transcrição')); } }, timeoutMs);
    pending.set(id, { resolve: (x) => { clearTimeout(t); resolve(x); }, reject: (e) => { clearTimeout(t); reject(e); } });
    w.postMessage({ id, audio }, [audio.buffer]);
  });
}
