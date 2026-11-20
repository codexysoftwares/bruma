import { interpolate } from 'remotion';

/** Cena de gameplay sintética (sem assets de terceiros), desenhada em SVG. 16:9 em 1600x900. */
export function GameScene({ frame, hud = true }: { frame: number; hud?: boolean }) {
  const t = frame / 30;
  const lines = Array.from({ length: 14 }, (_, i) => i);
  const scroll = (frame * 6) % 60;
  const enemies = [0, 1, 2, 3].map((i) => {
    const phase = t * (0.6 + i * 0.17) + i * 1.7;
    return { x: 800 + Math.sin(phase) * (260 + i * 90), y: 380 + Math.cos(phase * 1.3) * 40 + i * 22, s: 1 - i * 0.16, hit: Math.sin(phase * 3) > 0.96 };
  });
  const muzzle = frame % 22 < 3;
  return (
    <svg viewBox="0 0 1600 900" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#140b2e" />
          <stop offset="0.55" stopColor="#3b1a7a" />
          <stop offset="0.56" stopColor="#0c0a18" />
          <stop offset="1" stopColor="#07060c" />
        </linearGradient>
        <radialGradient id="sun" cx="0.5" cy="0.55" r="0.3">
          <stop offset="0" stopColor="#ff4fd8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#7B3FF2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#sky)" />
      <circle cx="800" cy="500" r="260" fill="url(#sun)" />
      {/* skyline pixelada */}
      {Array.from({ length: 40 }, (_, i) => (
        <rect key={i} x={i * 40} y={495 - ((i * 37) % 7) * 18 - 30} width="38" height={((i * 37) % 7) * 18 + 30} fill="#1a1238" />
      ))}
      {/* chão em grade neon */}
      {lines.map((i) => {
        const y = 500 + Math.pow((i * 60 + scroll) / 840, 2) * 400;
        return <line key={'h' + i} x1="0" x2="1600" y1={y} y2={y} stroke="#7B3FF2" strokeOpacity={interpolate(y, [500, 900], [0.15, 0.7])} strokeWidth="2" />;
      })}
      {Array.from({ length: 25 }, (_, i) => (
        <line key={'v' + i} x1={800 + (i - 12) * 18} y1="500" x2={800 + (i - 12) * 220} y2="900" stroke="#5B7CFF" strokeOpacity="0.28" strokeWidth="2" />
      ))}
      {/* inimigos */}
      {enemies.map((e, i) => (
        <g key={i} transform={`translate(${e.x},${e.y}) scale(${e.s})`}>
          <rect x="-40" y="-40" width="80" height="80" fill={e.hit ? '#E040FB' : '#ff3b6b'} opacity="0.9" />
          <rect x="-24" y="-20" width="14" height="14" fill="#07060B" />
          <rect x="10" y="-20" width="14" height="14" fill="#07060B" />
          <rect x="-40" y="40" width="20" height="20" fill={e.hit ? '#E040FB' : '#ff3b6b'} />
          <rect x="20" y="40" width="20" height="20" fill={e.hit ? '#E040FB' : '#ff3b6b'} />
        </g>
      ))}
      {/* arma */}
      <g transform={`translate(${1020 + Math.sin(t * 2) * 8},${700 + Math.abs(Math.sin(t * 4)) * 10})`}>
        {muzzle && <circle cx="-120" cy="-90" r="46" fill="#E040FB" opacity="0.85" />}
        <polygon points="-150,-60 120,-10 160,200 -40,200" fill="#22203a" />
        <polygon points="-150,-60 -100,-80 150,-30 120,-10" fill="#7B3FF2" />
        <rect x="-60" y="20" width="120" height="16" fill="#5B7CFF" opacity="0.7" />
      </g>
      {/* mira */}
      <g stroke="#F2EEFF" strokeWidth="4" opacity="0.9">
        <line x1="800" y1="420" x2="800" y2="440" /><line x1="800" y1="460" x2="800" y2="480" />
        <line x1="770" y1="450" x2="790" y2="450" /><line x1="810" y1="450" x2="830" y2="450" />
      </g>
      {hud && (
        <g fontFamily="Unbounded, sans-serif" fontWeight="700">
          <rect x="40" y="820" width="360" height="22" fill="#000" opacity="0.5" />
          <rect x="40" y="820" width={360 * (0.55 + 0.4 * Math.abs(Math.sin(t / 3)))} height="22" fill="#E040FB" />
          <text x="40" y="808" fill="#F2EEFF" fontSize="24">HP</text>
          <text x="1560" y="840" fill="#F2EEFF" fontSize="56" textAnchor="end">{30 - (Math.floor(frame / 22) % 30)}<tspan fontSize="28" fill="#7B3FF2"> /90</tspan></text>
          {[0, 1, 2].map((i) => {
            const k = Math.floor(frame / 40) - i;
            if (k < 0) return null;
            return (
              <text key={i} x="1560" y={70 + i * 36} fill="#F2EEFF" fontSize="24" textAnchor="end" opacity={1 - i * 0.3}>
                {['voce', 'kaike_gg', 'lucas.ps5', 'noob_master'][k % 4]} <tspan fill="#E040FB">⌖</tspan> {['bot_42', 'xX_sniper', 'player_77', 'ghost'][k % 4]}
              </text>
            );
          })}
        </g>
      )}
    </svg>
  );
}
