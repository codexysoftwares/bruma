import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveProject, uid } from '../lib/store';
import { getSession } from '../lib/session';
import type { Layout, Project } from '../lib/types';
import { DEFAULT_STYLE } from '../lib/types';

const LINK_RE = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be|twitch\.tv|clips\.twitch\.tv|kick\.com)\/\S+/i;
const COLORS = ['#E040FB', '#FF2E7E', '#A855F7', '#5B7CFF', '#F2EEFF'];

async function linkServerAvailable() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1500);
    const r = await fetch('/api/health', { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return false;
    return (await r.json()).ok === true;
  } catch { return false; }
}

export default function NewProject() {
  const nav = useNavigate();
  const [tab, setTab] = useState<'file' | 'link'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const [link, setLink] = useState('');
  const [cutLength, setCutLength] = useState(30);
  const [layout, setLayout] = useState<Layout>('blur');
  const [color, setColor] = useState(DEFAULT_STYLE.color);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [server, setServer] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { linkServerAvailable().then(setServer); }, []);

  const base = (): Omit<Project, 'id' | 'name' | 'source' | 'status'> => ({
    createdAt: Date.now(), cutLength, cuts: [],
  });

  // preferências viram padrão dos cortes (aplicadas na página do projeto)
  const prefs = () => { try { localStorage.setItem('bruma.prefs', JSON.stringify({ layout, color })); } catch { /* */ } };

  const startFile = async (f: File) => {
    setErr(null);
    if (!/^video\//.test(f.type) && !/\.(mp4|mov|webm|mkv|m4v)$/i.test(f.name)) { setErr('Esse arquivo não parece ser um vídeo.'); return; }
    setBusy('Salvando o vídeo neste navegador…');
    prefs();
    const p: Project = { ...base(), id: uid(), name: f.name.replace(/\.[^.]+$/, ''), source: 'file', status: 'queued', file: f, fileName: f.name, fileType: f.type };
    try {
      await saveProject(p);
    } catch {
      // sem espaço para guardar: segue só em memória
      (window as unknown as { __brumaMem?: Record<string, File> }).__brumaMem = { [p.id]: f };
      await saveProject({ ...p, file: undefined }).catch(() => undefined);
    }
    nav(`/app/p/${p.id}`);
  };

  const startLink = async () => {
    setErr(null);
    if (!LINK_RE.test(link.trim())) { setErr('Cola um link do YouTube, Twitch ou Kick.'); return; }
    prefs();
    const url = link.trim().startsWith('http') ? link.trim() : 'https://' + link.trim();
    if (server) {
      setBusy('Baixando a live… (pode levar alguns minutos)');
      try {
        const r = await fetch('/api/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
        if (!r.ok) throw new Error((await r.text()) || 'Falha ao baixar');
        const blob = await r.blob();
        const name = decodeURIComponent(r.headers.get('x-title') || 'live');
        const f = new File([blob], name + '.mp4', { type: blob.type || 'video/mp4' });
        await startFile(f);
        return;
      } catch (e) {
        setBusy(null);
        setErr('Não consegui baixar esse link automaticamente (' + (e instanceof Error ? e.message : '') + '). Enviei para a equipe.');
      }
    }
    // concierge: o pedido vai para a equipe (Netlify Forms) e o projeto fica aguardando
    const s = getSession();
    const body = new URLSearchParams({ 'form-name': 'pedido-link', nome: s?.name ?? '', contato: s?.contact ?? '', link: url, duracao: String(cutLength) });
    await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }).catch(() => undefined);
    const p: Project = { ...base(), id: uid(), name: url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60), source: 'link', link: url, status: 'awaiting-link' };
    await saveProject(p);
    nav(`/app/p/${p.id}`);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Novo corte</h1>
          <p>Sobe o vídeo da gameplay ou cola o link. A gente devolve 3 cortes verticais legendados.</p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'file'} onClick={() => setTab('file')}>Arquivo</button>
        <button role="tab" aria-selected={tab === 'link'} onClick={() => setTab('link')}>Link da live</button>
      </div>

      {tab === 'file' ? (
        <div
          className={`drop ${over ? 'over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
          role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept="video/*,.mkv" hidden data-testid="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          <div className="up" aria-hidden>⬆</div>
          {file ? (
            <>
              <h3>{file.name}</h3>
              <p>{(file.size / 1e6).toFixed(1)} MB · clique para trocar</p>
            </>
          ) : (
            <>
              <h3>Arraste o vídeo aqui</h3>
              <p>ou clique para escolher · MP4, MOV, WebM, MKV · PS5, Xbox, OBS, celular</p>
            </>
          )}
        </div>
      ) : (
        <div className="panel">
          <div className="field">
            <label htmlFor="lk">Link da live ou do vídeo (YouTube, Twitch, Kick)</label>
            <input id="lk" className="input" placeholder="https://www.twitch.tv/videos/…" value={link} onChange={(e) => setLink(e.target.value)} />
          </div>
          <p className="note" style={{ marginTop: 10 }}>
            {server === null ? 'Verificando…' : server
              ? 'A bruma baixa o vídeo sozinha e já começa os cortes.'
              : 'O link vai para a nossa equipe, que gera os cortes e te avisa pelo contato que você deixou. Se tiver o arquivo, a aba Arquivo é instantânea.'}
          </p>
        </div>
      )}

      <div className="settings">
        <div className="panel">
          <h4>Duração de cada corte</h4>
          <div className="seg">
            {[15, 30, 45, 60].map((s) => <button key={s} aria-pressed={cutLength === s} onClick={() => setCutLength(s)}>{s}s</button>)}
          </div>
        </div>
        <div className="panel">
          <h4>Formato</h4>
          <div className="seg">
            <button aria-pressed={layout === 'blur'} onClick={() => setLayout('blur')}>Fundo desfocado</button>
            <button aria-pressed={layout === 'crop'} onClick={() => setLayout('crop')}>Tela cheia</button>
          </div>
        </div>
        <div className="panel">
          <h4>Cor da legenda</h4>
          <div className="swatches">{COLORS.map((c) => <button key={c} className="swatch" style={{ background: c }} aria-label={c} aria-pressed={color === c} onClick={() => setColor(c)} />)}</div>
        </div>
      </div>

      {err && <p className="note err" style={{ marginTop: 18 }}>{err}</p>}
      <div className="row" style={{ marginTop: 26 }}>
        <button className="btn btn-primary" disabled={!!busy || (tab === 'file' ? !file : !link.trim())} onClick={() => (tab === 'file' ? file && startFile(file) : startLink())}>
          {busy ?? (tab === 'file' ? 'Gerar 3 cortes →' : server ? 'Baixar e gerar 3 cortes →' : 'Enviar link para a equipe →')}
        </button>
        <span className="note">O vídeo é processado no seu navegador. Ele não sai do seu computador.</span>
      </div>
    </>
  );
}
