import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { GameScene } from './GameScene';

export type HeroProps = { caption: string; color: string; layout: 'blur' | 'crop'; handle: string };
export const HERO = { width: 1200, height: 1000, fps: 30, durationInFrames: 330 };

const SCREEN = { x: 100, y: 120, w: 1000, h: 562 };
const CROP_W = (SCREEN.h * 9) / 16;
const CROP_X = [70, (SCREEN.w - CROP_W) / 2, SCREEN.w - CROP_W - 70];
const PHONE = { w: 300, h: 533, y: 250 };
const PHONE_X = [70, 450, 830];
const NETS = ['TikTok', 'Reels', 'Shorts'];
const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + ' mil' : String(Math.round(n));
}

export function HeroComp({ caption, color, layout, handle }: HeroProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fly = interpolate(frame, [150, 190], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const screenOpacity = interpolate(frame, [160, 195], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pick = (i: number) => interpolate(frame, [95 + i * 12, 110 + i * 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const words = (caption.trim() || 'clutch insano no final').split(/\s+/).slice(0, 24);
  const pages: string[][] = [];
  for (let i = 0; i < words.length; i += 3) pages.push(words.slice(i, i + 3));
  const intro = spring({ frame, fps, config: { damping: 18 } });
  const clock = 2 * 3600 + 41 * 60 + 17 + Math.floor(frame / fps);
  const clockStr = `${Math.floor(clock / 3600)}:${String(Math.floor((clock % 3600) / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`;

  return (
    <AbsoluteFill style={{ fontFamily: '"Unbounded", sans-serif', color: '#F2EEFF' }}>
      {/* tela da live */}
      <div style={{ position: 'absolute', left: SCREEN.x, top: SCREEN.y, width: SCREEN.w, height: SCREEN.h, borderRadius: 18, overflow: 'hidden',
        opacity: screenOpacity, transform: `scale(${0.94 + 0.06 * intro})`, boxShadow: '0 40px 120px rgba(123,63,242,.35)', border: '2px solid rgba(242,238,255,.12)' }}>
        <GameScene frame={frame} />
        <div style={{ position: 'absolute', left: 22, top: 18, display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700, fontSize: 24 }}>
          <span style={{ background: '#ff3b6b', padding: '4px 12px', borderRadius: 6 }}>● AO VIVO</span>
          <span style={{ background: 'rgba(0,0,0,.55)', padding: '4px 12px', borderRadius: 6 }}>{clockStr}</span>
        </div>
        {CROP_X.map((x, i) => (
          <div key={i} style={{ position: 'absolute', left: x, top: 0, width: CROP_W, height: SCREEN.h, opacity: pick(i),
            boxShadow: `0 0 0 3px ${color} inset, 0 0 0 9999px rgba(7,6,11,${0.18 * pick(i)})` }}>
            <span style={{ position: 'absolute', left: 10, bottom: 12, background: color, color: '#fff', fontWeight: 700, fontSize: 18, padding: '2px 10px', borderRadius: 4 }}>
              CORTE {i + 1}
            </span>
          </div>
        ))}
      </div>

      {/* onda de energia do áudio */}
      <div style={{ position: 'absolute', left: SCREEN.x, top: SCREEN.y + SCREEN.h + 40, width: SCREEN.w, height: 120, opacity: screenOpacity, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        {Array.from({ length: 80 }, (_, i) => {
          const peak = [18, 41, 64].indexOf(i) >= 0;
          const reveal = interpolate(frame, [i * 1.1, i * 1.1 + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const h = peak ? 1 : 0.15 + random('w' + i) * 0.45;
          const lit = peak && frame > 90;
          return <div key={i} style={{ flex: 1, height: `${h * 100 * reveal}%`, borderRadius: 3, background: lit ? color : 'rgba(123,63,242,.55)', boxShadow: lit ? `0 0 18px ${color}` : 'none' }} />;
        })}
        <div style={{ position: 'absolute', left: 0, top: -34, fontSize: 22, fontWeight: 600, opacity: 0.7, letterSpacing: 2 }}>
          {frame < 90 ? 'OUVINDO A GAMEPLAY…' : '3 PICOS ENCONTRADOS'}
        </div>
      </div>

      {/* névoa de pixels na transição */}
      {frame > 140 && frame < 230 && Array.from({ length: 70 }, (_, i) => {
        const life = (frame - 140 - random('d' + i) * 30) / 60;
        if (life < 0 || life > 1) return null;
        const sx = SCREEN.x + CROP_X[i % 3] + random('x' + i) * CROP_W;
        const sy = SCREEN.y + random('y' + i) * SCREEN.h;
        const s = 6 + random('s' + i) * 14;
        return <div key={i} style={{ position: 'absolute', left: sx + (random('vx' + i) - 0.5) * 160 * life, top: sy - 140 * life, width: s, height: s,
          background: i % 3 === 0 ? '#E040FB' : i % 3 === 1 ? '#7B3FF2' : '#5B7CFF', opacity: (1 - life) * 0.8, filter: `blur(${life * 4}px)` }} />;
      })}

      {/* celulares */}
      {fly > 0 && [0, 1, 2].map((i) => {
        const fromX = SCREEN.x + CROP_X[i], fromY = SCREEN.y, fromW = CROP_W, fromH = SCREEN.h;
        const x = interpolate(fly, [0, 1], [fromX, PHONE_X[i]]);
        const y = interpolate(fly, [0, 1], [fromY, PHONE.y + (i === 1 ? -30 : 20)]);
        const w = interpolate(fly, [0, 1], [fromW, PHONE.w]);
        const h = interpolate(fly, [0, 1], [fromH, PHONE.h]);
        const local = frame - 195 - i * 6;
        const pageIdx = Math.max(0, Math.floor(local / 27) + i) % pages.length;
        const wordIdx = Math.floor((Math.max(0, local) % 27) / 9);
        const views = local > 0 ? interpolate(local, [0, 130], [120, [12400, 48100, 9800][i]], { extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) }) : 0;
        const gameH = layout === 'crop' ? h : (w * 9) / 16;
        const gameW = layout === 'crop' ? (h * 16) / 9 : w;
        const offset = layout === 'crop' ? -(CROP_X[i] / SCREEN.w) * gameW : 0;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: w, height: h, transform: `scale(${i === 1 ? 1 + 0.08 * fly : 1})`, transformOrigin: 'center' }}>
            <div style={{ position: 'absolute', inset: -10 * fly, borderRadius: 34 * fly + 4, background: '#08090D', border: `2px solid rgba(242,238,255,${0.18 * fly})`, boxShadow: `0 30px 80px rgba(0,0,0,${0.6 * fly})` }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: 26 * fly + 2, overflow: 'hidden', background: '#07060B' }}>
              {layout === 'blur' && fly > 0.5 && (
                <div style={{ position: 'absolute', inset: '-10%', filter: 'blur(18px) brightness(.5)', transform: 'scale(1.6)' }}>
                  <GameScene frame={frame} hud={false} />
                </div>
              )}
              <div style={{ position: 'absolute', width: gameW, height: gameH, left: offset, top: layout === 'crop' ? 0 : h * 0.42 - gameH / 2 }}>
                <GameScene frame={frame} hud={layout !== 'crop'} />
              </div>
              {local > 0 && (
                <div style={{ position: 'absolute', left: 10, right: 10, top: layout === 'crop' ? h * 0.62 : h * 0.42 + gameH / 2 + 46, textAlign: 'center',
                  fontWeight: 700, fontSize: 30, lineHeight: 1.1, textTransform: 'uppercase', WebkitTextStroke: '6px #000', paintOrder: 'stroke fill' }}>
                  {pages[pageIdx].map((wd, j) => (
                    <span key={j} style={{ display: 'inline-block', margin: '0 5px', color: j === wordIdx ? color : '#fff', transform: `scale(${j === wordIdx ? 1.08 : 1})` }}>{wd}</span>
                  ))}
                </div>
              )}
              <div style={{ position: 'absolute', left: 14, bottom: 16, fontSize: 15, fontWeight: 600, opacity: fly }}>@{handle || 'seu_canal'}</div>
              <div style={{ position: 'absolute', right: 14, bottom: 16, fontSize: 15, fontWeight: 700, opacity: fly }}>bruma<span style={{ color: '#E040FB' }}>.</span></div>
            </div>
            <div style={{ position: 'absolute', top: -58, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: fly }}>
              <span style={{ fontSize: 20, fontWeight: 700, padding: '4px 12px', borderRadius: 999, border: '1.5px solid rgba(242,238,255,.3)' }}>{NETS[i]}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color }}>{local > 0 ? '▶ ' + fmt(views) : ''}</span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
