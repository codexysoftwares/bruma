import { AbsoluteFill, Html5Video, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Cut } from '../lib/types';
import { layoutBoxes } from '../lib/geometry';
import { CaptionDom } from './CaptionDom';

export type CutPreviewProps = { src: string; cut: Cut; srcW: number; srcH: number };

/** Preview ao vivo do corte (Remotion). A exportação usa a mesma geometria em canvas. */
export function CutPreview({ src, cut, srcW, srcH }: CutPreviewProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const box = layoutBoxes(cut, srcW, srcH);
  const trim = Math.round(cut.start * fps);
  return (
    <AbsoluteFill style={{ background: '#07060B', overflow: 'hidden' }}>
      {box.bg && (
        <Html5Video src={src} trimBefore={trim} muted pauseWhenBuffering={false}
          style={{ position: 'absolute', inset: '-8%', width: '116%', height: '116%', objectFit: 'cover', filter: 'blur(42px) brightness(.55)' }} />
      )}
      <Html5Video src={src} trimBefore={trim} pauseWhenBuffering
        style={{ position: 'absolute', left: box.fg.x, top: box.fg.y, width: box.fg.w, height: box.fg.h, objectFit: 'fill' }} />
      {cut.captionsOn && <CaptionDom words={cut.words} t={t} style={cut.style} y={box.capY} />}
      {cut.watermark && (
        <div style={{ position: 'absolute', right: 46, bottom: 50, font: '700 38px "Unbounded", sans-serif', color: '#F2EEFF', opacity: 0.85 }}>
          bruma<span style={{ color: '#E040FB' }}>.</span>
        </div>
      )}
    </AbsoluteFill>
  );
}
