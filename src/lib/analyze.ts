import { ALL_FORMATS, AudioBufferSink, BlobSource, Input } from 'mediabunny';
import { DEFAULT_STYLE, type Cut } from './types';
import { fmtTime } from './captions';

export const BUCKET = 0.5; // segundos por amostra de energia

export async function probe(file: Blob) {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const duration = await input.computeDuration();
  const v = await input.getPrimaryVideoTrack();
  const a = await input.getPrimaryAudioTrack();
  if (!v) throw new Error('Não achei uma faixa de vídeo nesse arquivo.');
  if (!(await v.canDecode())) throw new Error('Seu navegador não decodifica o vídeo desse arquivo. Tente MP4 (H.264) ou use o Chrome.');
  return {
    input,
    duration,
    width: v.displayWidth,
    height: v.displayHeight,
    hasAudio: !!a && (await a.canDecode()),
  };
}

/** Envelope de energia do áudio (RMS em dB) a cada BUCKET segundos. */
export async function energyEnvelope(input: Input, duration: number, onProgress: (p: number) => void): Promise<Float32Array> {
  const n = Math.max(1, Math.ceil(duration / BUCKET));
  const sum = new Float64Array(n);
  const cnt = new Float64Array(n);
  const track = await input.getPrimaryAudioTrack();
  if (!track) return new Float32Array(n);
  const sink = new AudioBufferSink(track);
  let last = 0;
  for await (const { buffer, timestamp } of sink.buffers()) {
    const ch = buffer.getChannelData(0);
    const sr = buffer.sampleRate;
    const step = Math.max(1, Math.floor(sr / 2000)); // subamostra p/ velocidade
    for (let i = 0; i < ch.length; i += step) {
      const b = Math.floor((timestamp + i / sr) / BUCKET);
      if (b >= 0 && b < n) { sum[b] += ch[i] * ch[i]; cnt[b]++; }
    }
    if (timestamp - last > 5) { last = timestamp; onProgress(Math.min(1, timestamp / duration)); }
  }
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) env[i] = cnt[i] ? 10 * Math.log10(sum[i] / cnt[i] + 1e-9) : -90;
  onProgress(1);
  return env;
}

function smooth(x: Float32Array, radius: number) {
  const out = new Float32Array(x.length);
  let acc = 0;
  const q: number[] = [];
  for (let i = 0; i < x.length + radius; i++) {
    if (i < x.length) { acc += x[i]; q.push(x[i]); }
    if (q.length > 2 * radius + 1) acc -= q.shift()!;
    const c = i - radius;
    if (c >= 0 && c < x.length) out[c] = acc / q.length;
  }
  return out;
}

/** Escolhe os N melhores momentos (picos sustentados de energia), sem sobreposição. */
export function pickMoments(env: Float32Array, duration: number, cutLength: number, count = 3): Omit<Cut, 'id'>[] {
  const len = Math.min(cutLength, duration);
  const short = smooth(env, Math.round(1.5 / BUCKET)); // ~3s
  const long = smooth(env, Math.round(len / 2 / BUCKET));
  // pontuação: pico curto + energia sustentada da janela
  const score = new Float32Array(env.length);
  for (let i = 0; i < env.length; i++) score[i] = short[i] * 0.6 + long[i] * 0.4;
  const picks: { start: number; peak: number; score: number }[] = [];
  const maxCount = Math.max(1, Math.min(count, Math.floor(duration / Math.max(len, 1)) || 1));
  const order = Array.from(score.keys()).sort((a, b) => score[b] - score[a]);
  const gap = 1;
  const fits = (st: number) => picks.every((q) => st + len + gap <= q.start || st >= q.start + len + gap);
  for (const i of order) {
    if (picks.length >= maxCount) break;
    const peak = i * BUCKET;
    if (picks.some((q) => peak >= q.start - gap && peak <= q.start + len + gap)) continue;
    // o pico entra cedo no corte (gancho nos primeiros segundos); se bater em outro corte, desliza a janela
    const clampS = (x: number) => Math.max(0, Math.min(x, duration - len));
    const ideal = clampS(peak - len * 0.3);
    const candidates = [ideal, ...picks.flatMap((q) => [clampS(q.start + len + gap), clampS(q.start - len - gap)])].sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal));
    const st = candidates.find((c) => fits(c) && peak >= c + 1 && peak <= c + len - 1);
    if (st === undefined) continue;
    picks.push({ start: st, peak, score: score[i] });
  }
  if (!picks.length) picks.push({ start: 0, peak: (order[0] ?? 0) * BUCKET, score: score[order[0] ?? 0] ?? 0 });
  const max = Math.max(...picks.map((p) => p.score)), min = Math.min(...env.filter((v) => v > -89));
  return picks.map((p, i): Omit<Cut, 'id'> => ({
    title: `Momento ${i + 1}`,
    start: Math.round(p.start * 10) / 10,
    duration: len,
    peakAt: p.peak,
    score: Math.round(70 + 29 * ((p.score - min) / Math.max(1e-6, max - min))),
    layout: 'blur' as const,
    focusX: 0.5,
    words: [],
    captionsOn: true,
    style: { ...DEFAULT_STYLE },
    transcribed: 'pending' as const,
    watermark: true,
  })).map((c) => ({ ...c, title: `${c.title} · pico em ${fmtTime(c.peakAt)}` }));
}

export function downsample(env: Float32Array, points = 240): number[] {
  const out: number[] = [];
  const floor = -60;
  const valid = Array.from(env).filter((v) => v > -89);
  const max = valid.length ? Math.max(...valid) : 0;
  for (let i = 0; i < points; i++) {
    const a = Math.floor((i / points) * env.length), b = Math.max(a + 1, Math.floor(((i + 1) / points) * env.length));
    let m = -90;
    for (let j = a; j < b && j < env.length; j++) m = Math.max(m, env[j]);
    out.push(Math.max(0, Math.min(1, (m - floor) / Math.max(1, max - floor))));
  }
  return out;
}

/** Áudio mono 16 kHz de um trecho (para a transcrição). */
export async function audioClip16k(input: Input, start: number, end: number): Promise<Float32Array | null> {
  const track = await input.getPrimaryAudioTrack();
  if (!track) return null;
  const sink = new AudioBufferSink(track);
  const sr = await track.getSampleRate();
  const total = Math.ceil((end - start) * sr);
  const mono = new Float32Array(total);
  for await (const { buffer, timestamp } of sink.buffers(start, end)) {
    const chs = buffer.numberOfChannels;
    const off = Math.round((timestamp - start) * buffer.sampleRate);
    const data = Array.from({ length: chs }, (_, c) => buffer.getChannelData(c));
    for (let i = 0; i < buffer.length; i++) {
      const j = off + i;
      if (j < 0 || j >= total) continue;
      let s = 0;
      for (let c = 0; c < chs; c++) s += data[c][i];
      mono[j] = s / chs;
    }
  }
  const outLen = Math.ceil((end - start) * 16000);
  const ctx = new OfflineAudioContext(1, outLen, 16000);
  const buf = ctx.createBuffer(1, total, sr);
  buf.copyToChannel(mono, 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
  const rendered = await ctx.startRendering();
  return rendered.getChannelData(0);
}
