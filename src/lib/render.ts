import {
  ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, WebMOutputFormat,
  canEncodeAudio, getFirstEncodableVideoCodec, type VideoSample,
} from 'mediabunny';
import type { Cut } from './types';
import { pageAt, toPages } from './captions';
import { CAPTION_PX, OUT_H, OUT_W, layoutBoxes } from './geometry';

export async function ensureFonts() {
  await Promise.all([
    document.fonts.load(`700 ${CAPTION_PX}px "Unbounded"`),
    document.fonts.load(`600 40px "Unbounded"`),
  ]).catch(() => undefined);
}

export function drawCaption(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, cut: Cut, t: number, W: number, H: number) {
  if (!cut.captionsOn || !cut.words.length) return;
  const pages = toPages(cut.words, cut.style);
  const page = pageAt(pages, t);
  if (!page) return;
  const k = W / OUT_W;
  const px = CAPTION_PX * cut.style.size * k;
  const { capY } = layoutBoxes(cut, 16, 9, W, H);
  ctx.save();
  ctx.font = `700 ${px}px "Unbounded", "Arial Black", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const words = page.words.map((w) => ({ ...w, label: cut.style.uppercase ? w.text.toUpperCase() : w.text }));
  const space = px * 0.28;
  const maxW = W * 0.86;
  const lines: (typeof words)[] = [[]];
  let lw = 0;
  for (const w of words) {
    const ww = ctx.measureText(w.label).width;
    if (lw + ww > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; }
    lines[lines.length - 1].push(w);
    lw += ww + space;
  }
  const lh = px * 1.12;
  lines.forEach((line, li) => {
    const widths = line.map((w) => ctx.measureText(w.label).width);
    const total = widths.reduce((a, b) => a + b, 0) + space * (line.length - 1);
    let x = (W - total) / 2;
    const y = capY + (li - (lines.length - 1) / 2) * lh;
    line.forEach((w, i) => {
      const active = t >= w.start && t < Math.max(w.end, w.start + 0.12);
      const pop = active ? 1 + 0.1 * Math.max(0, 1 - (t - w.start) / 0.12) : 1;
      ctx.save();
      ctx.translate(x + widths[i] / 2, y);
      ctx.scale(pop, pop);
      ctx.lineWidth = px * 0.2;
      ctx.strokeStyle = '#000';
      ctx.shadowColor = 'rgba(0,0,0,.55)';
      ctx.shadowBlur = px * 0.25;
      ctx.shadowOffsetY = px * 0.06;
      ctx.strokeText(w.label, -widths[i] / 2, 0);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = active ? cut.style.color : '#FFFFFF';
      ctx.fillText(w.label, -widths[i] / 2, 0);
      ctx.restore();
      x += widths[i] + space;
    });
  });
  ctx.restore();
}

function drawWatermark(ctx: OffscreenCanvasRenderingContext2D, W: number, H: number) {
  const k = W / OUT_W;
  ctx.save();
  ctx.font = `700 ${38 * k}px "Unbounded", sans-serif`;
  ctx.textAlign = 'right';
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#F2EEFF';
  const tx = W - 46 * k, ty = H - 70 * k;
  ctx.fillText('bruma', tx - ctx.measureText('.').width, ty);
  ctx.fillStyle = '#E040FB';
  ctx.fillText('.', tx, ty);
  ctx.restore();
}

export type ExportResult = { blob: Blob; ext: 'mp4' | 'webm' };

export async function exportCut(file: Blob, cut: Cut, onProgress: (p: number) => void, signal?: AbortSignal, scale = 1): Promise<ExportResult> {
  await ensureFonts();
  const W = Math.round((OUT_W * scale) / 2) * 2, H = Math.round((OUT_H * scale) / 2) * 2;
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const vcodec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'vp8'], { width: W, height: H });
  if (!vcodec) throw new Error('Este navegador não consegue gerar vídeo. Use o Chrome ou Edge atualizado.');
  const mp4 = vcodec === 'avc';
  const acodec = mp4 ? ((await canEncodeAudio('aac')) ? 'aac' : 'opus') : 'opus';
  const output = new Output({ format: mp4 ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(), target: new BufferTarget() });

  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext('2d')!;
  const SW = 108, SH = 192;
  const small = new OffscreenCanvas(SW, SH);
  const sctx = small.getContext('2d')!;
  sctx.imageSmoothingQuality = 'low';
  const canFilter = 'filter' in ctx;
  ctx.imageSmoothingQuality = 'high';

  const process = (sample: VideoSample) => {
    const sw = sample.displayWidth, sh = sample.displayHeight;
    const box = layoutBoxes(cut, sw, sh, W, H);
    ctx.fillStyle = '#07060B';
    ctx.fillRect(0, 0, W, H);
    if (box.bg) {
      // fundo desfocado: reduz e amplia (barato e funciona em qualquer navegador)
      const s = Math.max(SW / sw, SH / sh);
      sample.draw(sctx, (SW - sw * s) / 2, (SH - sh * s) / 2, sw * s, sh * s);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      if (canFilter) ctx.filter = `blur(${Math.round(W / 26)}px)`;
      ctx.drawImage(small, -W * 0.12, -H * 0.12, W * 1.24, H * 1.24);
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(7,6,11,.45)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    sample.draw(ctx, box.fg.x, box.fg.y, box.fg.w, box.fg.h);
    drawCaption(ctx, cut, sample.timestamp, W, H);
    if (cut.watermark) drawWatermark(ctx, W, H);
    return canvas;
  };

  const conversion = await Conversion.init({
    input,
    output,
    trim: { start: cut.start, end: cut.start + cut.duration },
    video: { codec: vcodec, forceTranscode: true, frameRate: 30, process, processedWidth: W, processedHeight: H },
    audio: { codec: acodec },
    showWarnings: false,
  });
  if (!conversion.isValid) throw new Error('Não foi possível montar a conversão para esse arquivo.');
  conversion.onProgress = (p) => onProgress(p);
  signal?.addEventListener('abort', () => conversion.cancel());
  await conversion.execute();
  const buf = (output.target as BufferTarget).buffer!;
  return { blob: new Blob([buf], { type: mp4 ? 'video/mp4' : 'video/webm' }), ext: mp4 ? 'mp4' : 'webm' };
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
