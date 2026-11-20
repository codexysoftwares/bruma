/// <reference lib="webworker" />
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

type Req = { id: number; audio: Float32Array };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let asr: any = null;
let loading: Promise<void> | null = null;

const MODELS = ['onnx-community/whisper-base_timestamped', 'onnx-community/whisper-tiny_timestamped'];

async function load() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasGPU = !!(self.navigator as any).gpu && !!(await (self.navigator as any).gpu.requestAdapter().catch(() => null));
  const attempts: { model: string; device: 'webgpu' | 'wasm'; dtype: unknown }[] = [];
  for (const model of MODELS) {
    if (hasGPU) attempts.push({ model, device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' } });
    attempts.push({ model, device: 'wasm', dtype: 'q8' });
  }
  let lastErr: unknown;
  for (const a of attempts) {
    try {
      postMessage({ type: 'status', text: `Carregando modelo de legenda (${a.model.split('/')[1].split('_')[0]}, ${a.device})` });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      asr = await (pipeline as any)('automatic-speech-recognition', a.model, {
        device: a.device,
        dtype: a.dtype,
        progress_callback: (p: { status: string; progress?: number; file?: string }) => {
          if (p.status === 'progress' && p.file?.endsWith('.onnx')) postMessage({ type: 'download', progress: (p.progress ?? 0) / 100 });
        },
      });
      postMessage({ type: 'status', text: 'Modelo pronto' });
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('Falha ao carregar o modelo');
}

self.onmessage = async (ev: MessageEvent<Req>) => {
  const { id, audio } = ev.data;
  try {
    if (!asr) { loading ??= load(); await loading; }
    const out = await asr(audio, { language: 'portuguese', task: 'transcribe', return_timestamps: 'word', chunk_length_s: 30, stride_length_s: 5 });
    const chunks = (out.chunks ?? []) as { text: string; timestamp: [number, number | null] }[];
    const words = chunks
      .map((c) => ({ text: c.text.trim(), start: c.timestamp[0], end: c.timestamp[1] ?? c.timestamp[0] + 0.3 }))
      .filter((w) => w.text && !/^\[.*\]$/.test(w.text));
    postMessage({ type: 'result', id, words });
  } catch (e) {
    loading = null;
    postMessage({ type: 'error', id, message: e instanceof Error ? e.message : String(e) });
  }
};
