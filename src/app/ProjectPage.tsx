import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Player, type PlayerRef } from '@remotion/player';
import { deleteProject, getProject, onProjectsChange, patchProject, saveProject } from '../lib/store';
import { isRunning, projectFile, retranscribeCut, runPipeline, subscribeProgress, type Progress } from '../lib/pipeline';
import { onTranscriberStatus } from '../lib/transcribe';
import { downloadBlob, exportCut } from '../lib/render';
import { fmtTime, spreadText, toSRT } from '../lib/captions';
import type { Cut, Project } from '../lib/types';
import { CutPreview } from '../remotion/CutPreview';
import { StatusPill } from './Dashboard';

const COLORS = ['#E040FB', '#FF2E7E', '#A855F7', '#5B7CFF', '#F2EEFF'];
const STEP_NAMES = ['Lendo o vídeo', 'Achando os momentos', 'Legendando', 'Pronto'];
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'bruma';

export default function ProjectPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [model, setModel] = useState<{ text?: string; progress?: number } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const saveT = useRef<number>(0);
  const readyRef = useRef(false);

  const load = useCallback(() => getProject(id).then((p) => {
    // com o projeto pronto, a fonte da verdade passa a ser o estado local (edições)
    if (readyRef.current && p?.status === 'ready') return;
    readyRef.current = p?.status === 'ready';
    setProject(p ?? null);
  }), [id]);

  useEffect(() => { readyRef.current = false; load(); return onProjectsChange(load); }, [load]);
  useEffect(() => onTranscriberStatus((m) => setModel((x) => ({ ...x, ...(m.type === 'download' ? { progress: m.progress } : { text: m.text }) }))), []);

  // dispara o processamento
  useEffect(() => {
    if (!project) return;
    const working = ['queued', 'analyzing', 'transcribing'].includes(project.status);
    if (working && projectFile(project)) {
      if (!isRunning(project.id)) runPipeline(project.id, setProgress);
      else return subscribeProgress(project.id, setProgress);
    }
  }, [project?.id, project?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const src = useMemo(() => { const f = projectFile(project ?? undefined); return f ? URL.createObjectURL(f) : null; }, [project?.id, !!projectFile(project ?? undefined)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  const updateCut = (cutId: string, patch: Partial<Cut>) => {
    setProject((p) => {
      if (!p) return p;
      const next = { ...p, cuts: p.cuts.map((c) => (c.id === cutId ? { ...c, ...patch } : c)) };
      clearTimeout(saveT.current);
      saveT.current = window.setTimeout(() => saveProject(next).catch(() => undefined), 350);
      return next;
    });
  };

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3200); };

  if (project === undefined) return <p className="muted">Carregando…</p>;
  if (project === null) return <div className="empty"><h3>Projeto não encontrado</h3><p><Link className="neon" to="/app">Voltar</Link></p></div>;

  const working = ['queued', 'analyzing', 'transcribing'].includes(project.status);
  const file = projectFile(project);

  return (
    <>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <Link to="/app" className="muted" style={{ fontSize: 13 }}>← Meus cortes</Link>
          <h1 style={{ marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</h1>
          <p className="row"><StatusPill p={project} /> {project.duration ? <span>{fmtTime(project.duration)} de vídeo · cortes de {project.cutLength}s</span> : null}</p>
        </div>
        <div className="row">
          {project.status === 'ready' && file && <DownloadAll project={project} file={file} onDone={() => flash('Os 3 cortes foram baixados.')} />}
          <button className="btn btn-ghost btn-sm" onClick={async () => { if (confirm('Apagar este projeto e os cortes?')) { await deleteProject(project.id); nav('/app'); } }}>Apagar</button>
        </div>
      </div>

      {project.status === 'awaiting-link' && (
        <AwaitingLink project={project} />
      )}

      {project.status === 'error' && (
        <div className="panel" style={{ borderColor: 'rgba(255,92,122,.4)' }}>
          <p className="note err" style={{ marginTop: 0 }}>{project.error}</p>
          <div className="row">
            {file && <button className="btn btn-violet btn-sm" onClick={async () => { await patchProject(project.id, { status: 'queued', cuts: [] }); }}>Tentar de novo</button>}
            <Link className="btn btn-ghost btn-sm" to="/app/novo">Subir outro vídeo</Link>
          </div>
        </div>
      )}

      {working && !file && (
        <div className="panel"><p className="note err" style={{ marginTop: 0 }}>O vídeo deste projeto não está neste navegador (a aba foi fechada antes de terminar). Suba de novo.</p><Link className="btn btn-primary btn-sm" to="/app/novo">Subir de novo</Link></div>
      )}

      {working && file && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="stepper">
            {STEP_NAMES.map((n, i) => {
              const step = progress?.step ?? 0;
              return <div key={n} className={i === step ? 'on' : i < step ? 'done' : ''}><b>{i < step ? '✓' : `0${i + 1}`}</b>{n}</div>;
            })}
          </div>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>{progress?.label ?? 'Preparando…'}</div>
          <div className={`progress ${progress?.step === 2 && !progress.value ? 'indet' : ''}`}><div style={{ width: `${Math.round((progress?.value ?? 0) * 100)}%` }} /></div>
          {progress?.detail && <p className="note">{progress.detail}</p>}
          {progress?.step === 2 && model && (
            <p className="note">{model.text}{model.progress !== undefined && model.progress < 1 ? ` · baixando ${Math.round(model.progress * 100)}%` : ''}</p>
          )}
          <p className="note">Pode deixar esta aba aberta. Tudo roda no seu computador.</p>
        </div>
      )}

      {project.cuts.length > 0 && project.energy && project.duration && (
        <div>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="eyebrow">Energia da gameplay</span>
            <span className="note">clique num corte para ir até ele</span>
          </div>
          <div className="timeline" aria-label="Energia do áudio e posição dos cortes">
            {project.energy.map((v, i) => <div key={i} className="b" style={{ height: `${Math.max(3, v * 100)}%` }} />)}
            {project.cuts.map((c, i) => (
              <div key={c.id} className="win" title={c.title}
                style={{ left: `${(c.start / project.duration!) * 100}%`, width: `max(10px, ${(c.duration / project.duration!) * 100}%)` }}
                onClick={() => { setSel(c.id); document.getElementById('cut-' + c.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                <span>C{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {project.cuts.length > 0 && src && (
        <div className="cuts">
          {project.cuts.map((c, i) => (
            <CutCard key={c.id} index={i} cut={c} project={project} src={src} file={file!} selected={sel === c.id} onSelect={() => setSel(c.id)}
              onChange={(patch) => updateCut(c.id, patch)} busy={working} flash={flash} />
          ))}
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}

function AwaitingLink({ project }: { project: Project }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="panel">
      <h4>Link recebido</h4>
      <p style={{ margin: '0 0 6px', wordBreak: 'break-all' }}><a className="neon" href={project.link} target="_blank" rel="noreferrer">{project.link}</a></p>
      <p className="note">A equipe baixa a live, gera os 3 cortes e te avisa pelo contato que você deixou. Em troca, a gente só pede a sua opinião sobre os cortes.</p>
      <p className="note">Já tem o arquivo? Sobe aqui e os cortes saem na hora:</p>
      <input ref={inputRef} type="file" accept="video/*,.mkv" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        await patchProject(project.id, { file: f, fileName: f.name, fileType: f.type, status: 'queued', source: 'file' });
      }} />
      <button className="btn btn-violet btn-sm" onClick={() => inputRef.current?.click()}>Subir o arquivo</button>
    </div>
  );
}

function DownloadAll({ project, file, onDone }: { project: Project; file: Blob; onDone: () => void }) {
  const [p, setP] = useState<number | null>(null);
  return (
    <button className="btn btn-primary btn-sm" disabled={p !== null} onClick={async () => {
      try {
        for (let i = 0; i < project.cuts.length; i++) {
          const r = await exportCut(file, project.cuts[i], (v) => setP((i + v) / project.cuts.length));
          downloadBlob(r.blob, `${slug(project.name)}_corte${i + 1}.${r.ext}`);
        }
        onDone();
      } catch (e) { alert(e instanceof Error ? e.message : String(e)); } finally { setP(null); }
    }}>{p === null ? '↓ Baixar os 3' : `Gerando ${Math.round(p * 100)}%`}</button>
  );
}

function CutCard({ cut, index, project, src, file, selected, onSelect, onChange, busy, flash }: {
  cut: Cut; index: number; project: Project; src: string; file: Blob; selected: boolean; onSelect: () => void;
  onChange: (p: Partial<Cut>) => void; busy: boolean; flash: (t: string) => void;
}) {
  const player = useRef<PlayerRef>(null);
  const [t, setT] = useState(0);
  const [exp, setExp] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [rewrite, setRewrite] = useState('');
  const abort = useRef<AbortController | null>(null);
  const fps = 30;
  const frames = Math.max(1, Math.round(cut.duration * fps));
  const srcW = project.width ?? 1920, srcH = project.height ?? 1080;
  const total = project.duration ?? cut.start + cut.duration;

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const on = (e: { detail: { frame: number } }) => setT(e.detail.frame / fps);
    p.addEventListener('frameupdate', on);
    return () => p.removeEventListener('frameupdate', on);
  }, []);

  const shift = (delta: number) => {
    const start = Math.max(0, Math.min(total - cut.duration, cut.start + delta));
    const d = start - cut.start;
    if (!d) return;
    const words = cut.words.map((w) => ({ ...w, start: w.start - d, end: w.end - d })).filter((w) => w.start >= 0 && w.end <= cut.duration);
    onChange({ start: Math.round(start * 10) / 10, words });
  };
  const setDuration = (duration: number) => {
    const d = Math.min(duration, total);
    const start = Math.min(cut.start, Math.max(0, total - d));
    onChange({ duration: d, start, words: cut.words.filter((w) => w.end <= d) });
  };
  const retry = async () => {
    setRetrying(true);
    try { onChange({ transcribed: 'pending' }); const p = await retranscribeCut(project.id, cut.id); const c = p?.cuts.find((x) => x.id === cut.id); if (c) onChange({ words: c.words, transcribed: c.transcribed }); }
    catch { onChange({ transcribed: 'failed' }); } finally { setRetrying(false); }
  };
  const download = async () => {
    abort.current = new AbortController();
    setExp(0);
    try {
      const r = await exportCut(file, cut, setExp, abort.current.signal);
      downloadBlob(r.blob, `${slug(project.name)}_corte${index + 1}.${r.ext}`);
      flash(`Corte ${index + 1} baixado (${r.ext.toUpperCase()}, ${(r.blob.size / 1e6).toFixed(1)} MB).`);
    } catch (e) {
      if (!abort.current.signal.aborted) alert(e instanceof Error ? e.message : String(e));
    } finally { setExp(null); }
  };

  const transcribing = cut.transcribed === 'pending' && (busy || retrying);

  return (
    <article id={'cut-' + cut.id} className={`cut ${selected ? 'sel' : ''}`} onClick={onSelect}>
      <div className="cut-player">
        <Player ref={player} component={CutPreview} inputProps={{ src, cut, srcW, srcH }} durationInFrames={frames} compositionWidth={1080} compositionHeight={1920} fps={fps}
          controls loop acknowledgeRemotionLicense style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="cut-body">
        <div className="cut-title">
          <h3>Corte {index + 1}</h3>
          <span className="score" title="Força do momento (energia do áudio)">{cut.score}</span>
        </div>
        <div className="note" style={{ marginTop: -6 }}>Começa em {fmtTime(cut.start)} · pico em {fmtTime(cut.peakAt)}</div>

        <div className="row">
          <span className="note" style={{ width: 52 }}>Início</span>
          {[-5, -1, 1, 5].map((d) => <button key={d} className="btn btn-ghost btn-sm" style={{ padding: '6px 10px' }} onClick={() => shift(d)}>{d > 0 ? '+' : ''}{d}s</button>)}
        </div>
        <div className="row">
          <span className="note" style={{ width: 52 }}>Duração</span>
          <div className="seg">{[15, 30, 45, 60].map((s) => <button key={s} aria-pressed={Math.round(cut.duration) === s} onClick={() => setDuration(s)}>{s}s</button>)}</div>
        </div>
        <div className="row">
          <span className="note" style={{ width: 52 }}>Formato</span>
          <div className="seg">
            <button aria-pressed={cut.layout === 'blur'} onClick={() => onChange({ layout: 'blur' })}>Desfocado</button>
            <button aria-pressed={cut.layout === 'crop'} onClick={() => onChange({ layout: 'crop' })}>Tela cheia</button>
          </div>
        </div>
        {cut.layout === 'crop' && (
          <div className="row"><span className="note" style={{ width: 52 }}>Foco</span>
            <input className="grow" type="range" min={0} max={1} step={0.01} value={cut.focusX} aria-label="Foco horizontal" onChange={(e) => onChange({ focusX: Number(e.target.value) })} />
          </div>
        )}

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <label className="toggle"><input type="checkbox" checked={cut.captionsOn} onChange={(e) => onChange({ captionsOn: e.target.checked })} /> Legenda</label>
          <div className="swatches">{COLORS.map((c) => <button key={c} className="swatch" style={{ background: c, width: 24, height: 24 }} aria-label={c} aria-pressed={cut.style.color === c} onClick={() => onChange({ style: { ...cut.style, color: c } })} />)}</div>
        </div>
        {cut.captionsOn && (
          <div className="row">
            <div className="seg">
              <button aria-pressed={cut.style.position === 'middle'} onClick={() => onChange({ style: { ...cut.style, position: 'middle' } })}>Meio</button>
              <button aria-pressed={cut.style.position === 'bottom'} onClick={() => onChange({ style: { ...cut.style, position: 'bottom' } })}>Embaixo</button>
            </div>
            <div className="seg">
              {[1, 2, 3].map((n) => <button key={n} aria-pressed={cut.style.wordsPerPage === n} onClick={() => onChange({ style: { ...cut.style, wordsPerPage: n } })} title="palavras por vez">{n}</button>)}
            </div>
            <input type="range" min={0.6} max={1.4} step={0.05} value={cut.style.size} aria-label="Tamanho da legenda" style={{ width: 80 }} onChange={(e) => onChange({ style: { ...cut.style, size: Number(e.target.value) } })} />
          </div>
        )}

        {cut.captionsOn && (transcribing ? (
          <div><div className="progress indet"><div /></div><p className="note">Legendando este corte…</p></div>
        ) : cut.words.length ? (
          <div>
            <div className="note" style={{ marginBottom: 6 }}>Clique numa palavra para corrigir (apague para remover)</div>
            <div className="words">
              {cut.words.map((w, i) => (
                <input key={i} value={w.text} size={Math.max(2, w.text.length)} className={t >= w.start && t < w.end ? 'cur' : ''}
                  onFocus={() => { player.current?.pause(); player.current?.seekTo(Math.round(w.start * fps)); }}
                  onChange={(e) => onChange({ words: cut.words.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                  onBlur={(e) => { if (!e.target.value.trim()) onChange({ words: cut.words.filter((_, j) => j !== i) }); }} />
              ))}
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={retry} disabled={retrying}>Legendar de novo</button>
              <button className="btn btn-ghost btn-sm" onClick={() => downloadBlob(new Blob([toSRT(cut.words, cut.style)], { type: 'text/plain' }), `${slug(project.name)}_corte${index + 1}.srt`)}>.srt</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="note">{cut.transcribed === 'failed' ? 'Não consegui legendar automaticamente (o modelo de legenda não carregou).' : 'Não ouvi fala neste trecho.'} Escreva a legenda e ela é distribuída no corte:</p>
            <textarea className="input" placeholder="ex.: não acredito que eu fiz isso" value={rewrite} onChange={(e) => setRewrite(e.target.value)} />
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn btn-violet btn-sm" disabled={!rewrite.trim()} onClick={() => onChange({ words: spreadText(rewrite, 0.3, Math.min(cut.duration - 0.3, 0.3 + rewrite.split(/\s+/).length * 0.45)), transcribed: 'ok' })}>Aplicar legenda</button>
              <button className="btn btn-ghost btn-sm" onClick={retry} disabled={retrying}>Tentar legendar de novo</button>
            </div>
          </div>
        ))}

        <label className="toggle"><input type="checkbox" checked={cut.watermark} onChange={(e) => onChange({ watermark: e.target.checked })} /> Marca “bruma.” no canto</label>

        {exp === null ? (
          <button className="btn btn-primary" onClick={download} disabled={busy || transcribing}>↓ Baixar corte {index + 1}</button>
        ) : (
          <div>
            <div className="progress"><div style={{ width: `${Math.round(exp * 100)}%` }} /></div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <span className="note">Gerando 1080×1920… {Math.round(exp * 100)}%</span>
              <button className="btn btn-ghost btn-sm" onClick={() => abort.current?.abort()}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
