import { useEffect, useRef } from 'react';
import { B_CELLS, B_DOT } from '../brand/logo';

/** Pixels que se desfazem na névoa. Reage ao mouse. Se `logo`, forma o "b" pixel e o dissolve. */
export function MistCanvas({ density = 1, logo = false, className = 'mist' }: { density?: number; logo?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true;
    const mouse = { x: -9999, y: -9999 };
    type P = { x: number; y: number; s: number; vx: number; vy: number; life: number; max: number; col: string; hx?: number; hy?: number };
    let ps: P[] = [];
    const cols = ['#7B3FF2', '#7B3FF2', '#E040FB', '#5B7CFF', '#F2EEFF'];
    const spawn = (p?: Partial<P>): P => ({
      x: Math.random() * w, y: h + 20 + Math.random() * h * 0.2, s: 2 + Math.random() * 6, vx: (Math.random() - 0.5) * 0.2, vy: -0.15 - Math.random() * 0.45,
      life: 0, max: 400 + Math.random() * 600, col: cols[(Math.random() * cols.length) | 0], ...p,
    });
    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      const r = c.getBoundingClientRect();
      w = r.width; h = r.height;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(((w * h) / 9000) * density);
      ps = Array.from({ length: n }, () => { const p = spawn(); p.y = Math.random() * h; p.life = Math.random() * p.max; return p; });
      if (logo) {
        const cell = Math.min(w, h) / 16;
        const ox = w * 0.5 - cell * 5, oy = h * 0.42 - cell * 5;
        [...B_CELLS, B_DOT].forEach(([gx, gy], i) => {
          for (let k = 0; k < 4; k++) {
            ps.push(spawn({ x: Math.random() * w, y: Math.random() * h, hx: ox + gx * cell + (k % 2) * cell / 2, hy: oy + gy * cell + Math.floor(k / 2) * cell / 2, s: cell / 2 - 1,
              col: i === B_CELLS.length ? '#E040FB' : gy < 4 ? '#7B3FF2' : gy < 6 ? '#A855F7' : '#E040FB', max: 1e9 }));
          }
        });
      }
    };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.life++;
        if (p.hx !== undefined) {
          // pixel do logo: volta pra casa, se espalha perto do mouse
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 140 * 140) { const f = (1 - Math.sqrt(d2) / 140) * 3; p.vx += (dx / Math.sqrt(d2 + 1)) * f; p.vy += (dy / Math.sqrt(d2 + 1)) * f; }
          p.vx += (p.hx - p.x) * 0.012; p.vy += (p.hy! - p.y) * 0.012;
          p.vx *= 0.86; p.vy *= 0.86;
          p.x += p.vx; p.y += p.vy;
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = p.col;
          ctx.fillRect(p.x, p.y, p.s, p.s);
          continue;
        }
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 160 * 160) { const f = (1 - Math.sqrt(d2) / 160) * 0.35; p.vx += (dx / Math.sqrt(d2 + 1)) * f; p.vy += (dy / Math.sqrt(d2 + 1)) * f; }
        p.vx *= 0.97; p.vy = p.vy * 0.97 + (-0.3 - p.vy) * 0.01;
        p.x += p.vx + Math.sin((p.life + p.s * 50) / 90) * 0.15; p.y += p.vy;
        const k = p.life / p.max;
        const a = Math.sin(Math.min(1, k) * Math.PI) * 0.55;
        // quanto mais sobe, mais vira névoa (maior e mais transparente)
        const fog = 1 + k * 2.5;
        ctx.globalAlpha = a / fog;
        ctx.fillStyle = p.col;
        ctx.fillRect(p.x, p.y, p.s * fog, p.s * fog);
        if (p.life > p.max || p.y < -40) Object.assign(p, spawn());
      }
      ctx.globalAlpha = 1;
    };
    resize();
    if (reduce) { tick(); cancelAnimationFrame(raf); } else tick();
    const onMove = (e: PointerEvent) => { const r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const onLeave = () => { mouse.x = mouse.y = -9999; };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(c);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); };
  }, [density, logo]);
  return <canvas ref={ref} className={className} aria-hidden />;
}
