import type { CaptionStyle, Word } from './types';

export type Page = { start: number; end: number; words: Word[] };

export function toPages(words: Word[], style: Pick<CaptionStyle, 'wordsPerPage'>): Page[] {
  const pages: Page[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) pages.push({ start: cur[0].start, end: cur[cur.length - 1].end, words: cur });
    cur = [];
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const prev = cur[cur.length - 1];
    if (prev && (w.start - prev.end > 0.7 || cur.length >= style.wordsPerPage)) flush();
    cur.push(w);
    if (/[.!?…]$/.test(w.text)) flush();
  }
  flush();
  // segura a página na tela até a próxima começar (máx. +0.6s)
  for (let i = 0; i < pages.length; i++) {
    const next = pages[i + 1];
    pages[i].end = next ? Math.min(next.start, pages[i].end + 0.6) : pages[i].end + 0.6;
  }
  return pages;
}

export function pageAt(pages: Page[], t: number): Page | null {
  for (const p of pages) if (t >= p.start && t < p.end) return p;
  return null;
}

export function clean(text: string) {
  return text.replace(/^[\s"'“”]+|[\s"'“”,]+$/g, '');
}

/** Converte texto livre em palavras distribuídas no intervalo (usado quando o usuário reescreve a legenda). */
export function spreadText(text: string, start: number, end: number): Word[] {
  const parts = text.split(/\s+/).filter(Boolean);
  if (!parts.length) return [];
  const total = parts.reduce((a, p) => a + p.length + 2, 0);
  let t = start;
  return parts.map((p) => {
    const d = ((end - start) * (p.length + 2)) / total;
    const w = { text: p, start: t, end: t + d };
    t += d;
    return w;
  });
}

export function fmtTime(s: number) {
  s = Math.max(0, s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return (h ? h + ':' : '') + mm + ':' + String(sec).padStart(2, '0');
}

export function toSRT(words: Word[], style: CaptionStyle) {
  const pages = toPages(words, style);
  const ts = (s: number) => {
    const ms = Math.round(s * 1000);
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), r = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(r).padStart(3, '0')}`;
  };
  return pages.map((p, i) => `${i + 1}\n${ts(p.start)} --> ${ts(p.end)}\n${p.words.map((w) => w.text).join(' ')}\n`).join('\n');
}
