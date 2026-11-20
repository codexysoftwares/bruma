import type { Cut } from './types';

export const OUT_W = 1080;
export const OUT_H = 1920;

/** Geometria compartilhada entre o preview (Remotion) e a exportação (canvas), para o arquivo baixado bater com o que se vê. */
export function layoutBoxes(cut: Pick<Cut, 'layout' | 'focusX' | 'style'>, srcW: number, srcH: number, W = OUT_W, H = OUT_H) {
  if (cut.layout === 'crop') {
    const scale = Math.max(W / srcW, H / srcH);
    const dw = srcW * scale, dh = srcH * scale;
    const dx = -(dw - W) * cut.focusX, dy = -(dh - H) / 2;
    const capY = cut.style.position === 'bottom' ? H * 0.78 : H * 0.64;
    return { fg: { x: dx, y: dy, w: dw, h: dh }, bg: null, capY };
  }
  const scale = W / srcW;
  const dh = Math.min(srcH * scale, H * 0.7);
  const dw = (dh / srcH) * srcW;
  const y = H * 0.44 - dh / 2;
  const fg = { x: (W - dw) / 2, y, w: dw, h: dh };
  const capY = cut.style.position === 'bottom' ? H * 0.8 : y + dh + H * 0.085;
  return { fg, bg: true, capY };
}

export const CAPTION_PX = 70; // tamanho base em px numa saída 1080x1920
