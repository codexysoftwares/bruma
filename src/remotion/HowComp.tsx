import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from 'remotion';
import { GameScene } from './GameScene';

export const HOW = { width: 1000, height: 1000, fps: 30, durationInFrames: 400 };
const cl = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const E = Easing.bezier(0.2, 0.8, 0.2, 1);

function Panel({ children, opacity, y }: { children: React.ReactNode; opacity: number; y: number }) {
  return <AbsoluteFill style={{ opacity, transform: `translateY(${y}px)` }}>{children}</AbsoluteFill>;
}

export function HowComp() {
  const f = useCurrentFrame();
  const vis = (a: number, b: number) => Math.min(interpolate(f, [a - 20, a + 5], [0, 1], cl), interpolate(f, [b - 5, b + 20], [1, 0], cl));
  const font = { fontFamily: '"Unbounded", sans-serif', color: '#F2EEFF' };
  return (
    <AbsoluteFill style={font}>
      {/* 1. sobe o vídeo */}
      <Panel opacity={f < 100 ? 1 : vis(0, 100)} y={0}>
        <div style={{ position: 'absolute', left: 150, top: 300, width: 700, height: 420, borderRadius: 28, border: '3px dashed rgba(123,63,242,.6)', background: 'rgba(123,63,242,.06)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', fontSize: 30, opacity: 0.7 }}>arraste o vídeo ou cole o link da live</div>
        {(() => {
          const d = interpolate(f, [5, 45], [0, 1], { ...cl, easing: E });
          const p = interpolate(f, [45, 92], [0, 1], cl);
          return (
            <div style={{ position: 'absolute', left: 300, top: interpolate(d, [0, 1], [40, 380]), width: 400, transform: `rotate(${(1 - d) * -8}deg)` }}>
              <div style={{ background: '#1b1c27', borderRadius: 18, padding: 22, boxShadow: '0 30px 60px rgba(0,0,0,.5)', border: '1px solid rgba(242,238,255,.12)' }}>
                <div style={{ height: 160, borderRadius: 10, overflow: 'hidden' }}><GameScene frame={f} /></div>
                <div style={{ marginTop: 14, fontSize: 26, fontWeight: 700 }}>live_ps5_sexta.mp4</div>
                <div style={{ fontSize: 20, opacity: 0.6 }}>2h 14min · 3,8 GB</div>
                <div style={{ marginTop: 14, height: 10, borderRadius: 9, background: 'rgba(242,238,255,.1)' }}>
                  <div style={{ width: `${p * 100}%`, height: '100%', borderRadius: 9, background: 'linear-gradient(90deg,#7B3FF2,#E040FB)' }} />
                </div>
              </div>
            </div>
          );
        })()}
      </Panel>

      {/* 2. acha 3 momentos */}
      <Panel opacity={vis(100, 200)} y={0}>
        <div style={{ position: 'absolute', left: 80, right: 80, top: 330, height: 300, display: 'flex', alignItems: 'center', gap: 3 }}>
          {Array.from({ length: 120 }, (_, i) => {
            const peak = [22, 61, 97].find((p) => Math.abs(p - i) < 4);
            const h = peak !== undefined ? 0.75 + random('p' + i) * 0.25 : 0.1 + random('h' + i) * 0.35;
            const lit = peak !== undefined && f > 140 + [22, 61, 97].indexOf(peak) * 12;
            const grow = interpolate(f, [100 + i * 0.3, 118 + i * 0.3], [0, 1], cl);
            return <div key={i} style={{ flex: 1, height: `${h * 100 * grow}%`, borderRadius: 3, background: lit ? '#E040FB' : 'rgba(123,63,242,.6)', boxShadow: lit ? '0 0 20px #E040FB' : 'none' }} />;
          })}
        </div>
        {[22, 61, 97].map((p, i) => {
          const o = interpolate(f, [140 + i * 12, 152 + i * 12], [0, 1], cl);
          return (
            <div key={i} style={{ position: 'absolute', left: 80 + ((p - 9) / 120) * 840, top: 300, width: (18 / 120) * 840, height: 360, opacity: o,
              border: '3px solid #E040FB', borderRadius: 14, transform: `scale(${0.9 + 0.1 * o})` }}>
              <span style={{ position: 'absolute', top: -46, left: 0, fontSize: 24, fontWeight: 700, color: '#E040FB' }}>CORTE {i + 1}</span>
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 720, textAlign: 'center', fontSize: 30, opacity: 0.7 }}>grito, tiro, reação: onde a energia sobe, tem corte</div>
      </Panel>

      {/* 3. legenda automática */}
      <Panel opacity={vis(200, 300)} y={0}>
        <div style={{ position: 'absolute', left: 340, top: 120, width: 320, height: 568, borderRadius: 36, overflow: 'hidden', border: '8px solid #08090D', boxShadow: '0 0 0 2px rgba(242,238,255,.15), 0 40px 100px rgba(123,63,242,.35)', background: '#07060B' }}>
          <div style={{ position: 'absolute', inset: '-10%', filter: 'blur(16px) brightness(.5)', transform: 'scale(1.6)' }}><GameScene frame={f} hud={false} /></div>
          <div style={{ position: 'absolute', left: 0, width: '100%', top: 160, height: 172 }}><GameScene frame={f} /></div>
          {(() => {
            const words = ['NÃO', 'ACREDITO', 'QUE', 'EU', 'FIZ', 'ISSO', 'UM', 'CONTRA', 'TRÊS'];
            const k = Math.max(0, Math.floor((f - 210) / 8));
            const page = Math.floor(Math.min(k, 8) / 3);
            return (
              <div style={{ position: 'absolute', left: 8, right: 8, top: 380, textAlign: 'center', fontWeight: 700, fontSize: 36, lineHeight: 1.1, WebkitTextStroke: '7px #000', paintOrder: 'stroke fill' }}>
                {words.slice(page * 3, page * 3 + 3).map((w, j) => (
                  <span key={j} style={{ display: 'inline-block', margin: '0 6px', color: page * 3 + j === Math.min(k, 8) ? '#E040FB' : '#fff' }}>{w}</span>
                ))}
              </div>
            );
          })()}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center', fontSize: 30, opacity: 0.7 }}>legenda palavra por palavra, em português, editável</div>
      </Panel>

      {/* 4. revisa e baixa */}
      <Panel opacity={vis(300, 420)} y={0}>
        {[0, 1, 2].map((i) => {
          const a = interpolate(f, [305 + i * 10, 330 + i * 10], [0, 1], { ...cl, easing: E });
          const ok = f > 345 + i * 12;
          return (
            <div key={i} style={{ position: 'absolute', left: 170, width: 660, top: 260 + i * 140, height: 110, borderRadius: 20, background: '#1b1c27', border: '1px solid rgba(242,238,255,.12)',
              opacity: a, transform: `translateX(${(1 - a) * 80}px)`, display: 'flex', alignItems: 'center', gap: 22, padding: '0 22px' }}>
              <div style={{ width: 52, height: 92, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}><div style={{ width: 164, height: 92, marginLeft: -40 - i * 20 }}><GameScene frame={f + i * 40} hud={false} /></div></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>corte_{i + 1}_vertical.mp4</div>
                <div style={{ fontSize: 20, opacity: 0.6 }}>1080×1920 · 30s · legendado</div>
              </div>
              <div style={{ width: 60, height: 60, borderRadius: 30, display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 700,
                background: ok ? '#E040FB' : 'rgba(242,238,255,.08)', color: ok ? '#07060B' : '#F2EEFF' }}>{ok ? '✓' : '↓'}</div>
            </div>
          );
        })}
      </Panel>
    </AbsoluteFill>
  );
}
