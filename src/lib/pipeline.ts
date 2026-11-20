import { audioClip16k, downsample, energyEnvelope, pickMoments, probe } from './analyze';
import { getProject, patchProject, uid } from './store';
import { transcribe } from './transcribe';
import type { Layout, Project } from './types';

function readPrefs(): { layout?: Layout; color?: string } {
  try { return JSON.parse(localStorage.getItem('bruma.prefs') || '{}'); } catch { return {}; }
}

/** Arquivo do projeto: IndexedDB ou, se o navegador não teve espaço, memória da aba. */
export function projectFile(p?: Project): Blob | undefined {
  return p?.file ?? (window as unknown as { __brumaMem?: Record<string, Blob> }).__brumaMem?.[p?.id ?? ''];
}

/** Legenda de novo um corte (ex.: depois de mudar o início). */
export async function retranscribeCut(projectId: string, cutId: string) {
  const p = await getProject(projectId);
  const file = projectFile(p);
  const cut = p?.cuts.find((c) => c.id === cutId);
  if (!p || !file || !cut) return;
  const { ALL_FORMATS, BlobSource, Input } = await import('mediabunny');
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const audio = await audioClip16k(input, cut.start, cut.start + cut.duration);
  const words = audio ? await transcribe(audio) : [];
  return patchProject(projectId, (q) => ({ cuts: q.cuts.map((c) => (c.id === cutId ? { ...c, words, transcribed: words.length ? 'ok' : 'empty' } : c)) }));
}

export type Progress = { step: 0 | 1 | 2 | 3; label: string; value: number; detail?: string };
type Listener = (p: Progress) => void;

const running = new Map<string, { listeners: Set<Listener>; last: Progress }>();

export function subscribeProgress(id: string, fn: Listener) {
  const r = running.get(id);
  if (r) { r.listeners.add(fn); fn(r.last); }
  return () => { running.get(id)?.listeners.delete(fn); };
}
export const isRunning = (id: string) => running.has(id);

/** Roda o fluxo completo: analisa → escolhe 3 momentos → transcreve. Tudo no navegador. */
export async function runPipeline(id: string, extraListener?: Listener) {
  if (running.has(id)) { if (extraListener) subscribeProgress(id, extraListener); return; }
  const entry = { listeners: new Set<Listener>(extraListener ? [extraListener] : []), last: { step: 0, label: 'Preparando', value: 0 } as Progress };
  running.set(id, entry);
  const report = (p: Progress) => { entry.last = p; entry.listeners.forEach((l) => l(p)); };

  try {
    let project = (await getProject(id)) as Project;
    const file = projectFile(project);
    if (!file) throw new Error('O arquivo deste projeto não está mais neste navegador. Suba o vídeo de novo.');

    if (project.status === 'queued' || project.status === 'analyzing' || !project.cuts.length) {
      await patchProject(id, { status: 'analyzing', error: undefined });
      report({ step: 0, label: 'Lendo o vídeo', value: 0 });
      const info = await probe(file);
      const prefs = readPrefs();
      report({ step: 1, label: 'Ouvindo a gameplay atrás dos picos', value: 0, detail: 'Gritos, tiros e reação viram sinal de momento bom.' });
      const env = info.hasAudio
        ? await energyEnvelope(info.input, info.duration, (v) => report({ step: 1, label: 'Ouvindo a gameplay atrás dos picos', value: v }))
        : new Float32Array(Math.ceil(info.duration / 0.5)).map((_, i) => Math.sin(i / 7) * 3 - 30);
      const moments = pickMoments(env, info.duration, project.cutLength, 3).map((m) => ({ ...m, id: uid(), layout: prefs.layout ?? m.layout, style: { ...m.style, color: prefs.color ?? m.style.color }, transcribed: info.hasAudio ? m.transcribed : ('empty' as const) }));
      project = (await patchProject(id, { status: 'transcribing', duration: info.duration, width: info.width, height: info.height, energy: downsample(env), cuts: moments }))!;
      info.input.dispose?.();
    }

    const { ALL_FORMATS, BlobSource, Input } = await import('mediabunny');
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    const todo = project.cuts.filter((c) => c.transcribed === 'pending');
    let done = 0;
    for (const cut of todo) {
      report({ step: 2, label: `Legendando ${cut.title.split(' ·')[0].toLowerCase()}`, value: done / todo.length, detail: 'Na primeira vez o modelo de legenda é baixado (~80 MB) e fica salvo no navegador.' });
      let patch: Partial<typeof cut>;
      try {
        const audio = await audioClip16k(input, cut.start, cut.start + cut.duration);
        const words = audio ? await transcribe(audio) : [];
        patch = { words, transcribed: words.length ? 'ok' : 'empty' };
      } catch (e) {
        console.warn('transcrição falhou', e);
        patch = { transcribed: 'failed' };
      }
      await patchProject(id, (p) => ({ cuts: p.cuts.map((c) => (c.id === cut.id ? { ...c, ...patch } : c)) }));
      done++;
    }
    await patchProject(id, { status: 'ready' });
    report({ step: 3, label: 'Cortes prontos', value: 1 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await patchProject(id, { status: 'error', error: msg });
    report({ step: 0, label: 'Erro: ' + msg, value: 0 });
  } finally {
    running.delete(id);
  }
}

