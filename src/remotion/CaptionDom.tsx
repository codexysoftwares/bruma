import type { CSSProperties } from 'react';
import { pageAt, toPages } from '../lib/captions';
import type { CaptionStyle, Word } from '../lib/types';
import { CAPTION_PX } from '../lib/geometry';

export function CaptionDom({ words, t, style, y, width = 1080 }: { words: Word[]; t: number; style: CaptionStyle; y: number; width?: number }) {
  const page = pageAt(toPages(words, style), t);
  if (!page) return null;
  const px = CAPTION_PX * style.size * (width / 1080);
  const base: CSSProperties = {
    fontFamily: '"Unbounded", "Arial Black", sans-serif',
    fontWeight: 700,
    fontSize: px,
    lineHeight: 1.12,
    WebkitTextStroke: `${px * 0.2}px #000`,
    paintOrder: 'stroke fill',
    textShadow: `0 ${px * 0.06}px ${px * 0.25}px rgba(0,0,0,.55)`,
    textTransform: style.uppercase ? 'uppercase' : 'none',
  };
  return (
    <div style={{ position: 'absolute', left: width * 0.07, right: width * 0.07, top: y, transform: 'translateY(-50%)', textAlign: 'center', ...base }}>
      {page.words.map((w, i) => {
        const active = t >= w.start && t < Math.max(w.end, w.start + 0.12);
        const pop = active ? 1 + 0.1 * Math.max(0, 1 - (t - w.start) / 0.12) : 1;
        return (
          <span key={i} style={{ display: 'inline-block', margin: `0 ${px * 0.14}px`, color: active ? style.color : '#fff', transform: `scale(${pop})` }}>
            {w.text}
          </span>
        );
      })}
    </div>
  );
}
