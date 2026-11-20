export type Word = { text: string; start: number; end: number };
export type Layout = 'blur' | 'crop';
export type CaptionColor = '#E040FB' | '#5B7CFF' | '#7B3FF2' | '#F2EEFF' | '#FF2E7E';
export type CaptionStyle = { color: string; position: 'middle' | 'bottom'; size: number; uppercase: boolean; wordsPerPage: number };

export type Cut = {
  id: string;
  title: string;
  start: number; // segundos no vídeo original
  duration: number;
  peakAt: number;
  score: number;
  layout: Layout;
  focusX: number; // 0..1 (só no layout crop)
  words: Word[];
  captionsOn: boolean;
  style: CaptionStyle;
  transcribed: 'pending' | 'ok' | 'failed' | 'empty';
  watermark: boolean;
};

export type ProjectStatus = 'queued' | 'analyzing' | 'transcribing' | 'ready' | 'error' | 'awaiting-link';

export type Project = {
  id: string;
  name: string;
  createdAt: number;
  status: ProjectStatus;
  source: 'file' | 'link';
  link?: string;
  file?: Blob;
  fileName?: string;
  fileType?: string;
  duration?: number;
  width?: number;
  height?: number;
  cutLength: number;
  energy?: number[]; // envelope normalizado (para a timeline)
  cuts: Cut[];
  error?: string;
};

export const DEFAULT_STYLE: CaptionStyle = { color: '#E040FB', position: 'middle', size: 1, uppercase: true, wordsPerPage: 3 };
