import { useId } from 'react';
import { B_CELLS, B_DOT, B_MIST, COLORS } from './logo';

export function LogoMark({ size = 36, tile = true, animated = false }: { size?: number; tile?: boolean; animated?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden className={animated ? 'logo-anim' : undefined}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLORS.azul} />
          <stop offset="0.5" stopColor={COLORS.roxo} />
          <stop offset="1" stopColor={COLORS.magenta} />
        </linearGradient>
      </defs>
      {tile && <rect x="0.3" y="0.3" width="11.4" height="11.4" rx="2.6" fill="#0c0a14" stroke="#2a1f45" strokeWidth="0.25" />}
      <g transform="translate(1,1)">
        {B_CELLS.map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="1.02" height="1.02" fill={`url(#g${id})`} />
        ))}
        {B_CELLS.filter((_, i) => i % 2 === 0).map(([x, y], i) => (
          <rect key={'s' + i} x={x} y={y + 0.55} width="1.02" height="0.2" fill="#fff" opacity="0.12" />
        ))}
        <rect x={B_DOT[0]} y={B_DOT[1]} width="1" height="1" fill={COLORS.rosa} />
        {B_MIST.map(([x, y, o], i) => (
          <rect key={'m' + i} className="mist-px" style={{ animationDelay: `${i * 0.4}s` }} x={x + 0.2} y={y + 0.2} width="0.6" height="0.6" fill={i % 2 ? COLORS.violeta : COLORS.magenta} opacity={o} />
        ))}
      </g>
    </svg>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      bruma<span className="dot">.</span>
    </span>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <Wordmark size={size * 0.68} />
    </span>
  );
}
