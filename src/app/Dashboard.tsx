import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProjects, onProjectsChange } from '../lib/store';
import type { Project } from '../lib/types';
import { fmtTime } from '../lib/captions';
import { getSession } from '../lib/session';

export function StatusPill({ p }: { p: Project }) {
  const map: Record<Project['status'], [string, string]> = {
    queued: ['Na fila', 'work'], analyzing: ['Analisando', 'work'], transcribing: ['Legendando', 'work'],
    ready: ['Pronto', 'ready'], error: ['Erro', 'error'], 'awaiting-link': ['Link com a equipe', 'work'],
  };
  const [t, c] = map[p.status];
  return <span className={`status ${c}`}>● {t}</span>;
}

export default function Dashboard() {
  const [items, setItems] = useState<Project[] | null>(null);
  useEffect(() => {
    const load = () => listProjects().then(setItems).catch(() => setItems([]));
    load();
    return onProjectsChange(load);
  }, []);
  const s = getSession();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Fala, {s?.name.split(' ')[0]}<span className="neon">.</span></h1>
          <p>Seus vídeos e cortes ficam aqui, salvos neste navegador.</p>
        </div>
        <Link className="btn btn-primary" to="/app/novo">＋ Novo corte</Link>
      </div>
      {items === null ? <p className="muted">Carregando…</p> : items.length === 0 ? (
        <div className="empty">
          <h3 style={{ color: 'var(--nevoa)', fontSize: 24, marginBottom: 8 }}>Nenhum corte ainda</h3>
          <p style={{ margin: '0 0 20px' }}>Sobe uma gameplay ou cola o link da sua última live.</p>
          <Link className="btn btn-primary" to="/app/novo">Criar os 3 primeiros cortes</Link>
        </div>
      ) : (
        <div className="proj-grid">
          {items.map((p) => (
            <Link key={p.id} to={`/app/p/${p.id}`} className="proj">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <StatusPill p={p} />
                <span className="muted" style={{ fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="spark">
                {(p.energy ?? Array.from({ length: 60 }, (_, i) => 0.2 + ((i * 37) % 10) / 30)).filter((_, i) => i % 3 === 0).map((v, i) => <div key={i} style={{ height: `${Math.max(4, v * 100)}%` }} />)}
              </div>
              <div>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {p.source === 'link' && !p.file ? 'Link enviado' : `${p.duration ? fmtTime(p.duration) : '—'} · ${p.cuts.length} cortes de ${p.cutLength}s`}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
