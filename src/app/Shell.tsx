import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../brand/Logo';
import { clearSession, getSession } from '../lib/session';

export function RequireAuth() {
  const loc = useLocation();
  if (!getSession()) return <Navigate to={`/entrar?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return <Shell />;
}

function Shell() {
  const s = getSession()!;
  const nav = useNavigate();
  return (
    <div className="app">
      <aside className="side">
        <NavLink to="/" className="brand"><Logo size={30} /></NavLink>
        <NavLink end to="/app" className={({ isActive }) => `item ${isActive ? 'active' : ''}`}>▦ Meus cortes</NavLink>
        <NavLink to="/app/novo" className={({ isActive }) => `item ${isActive ? 'active' : ''}`}>＋ Novo corte</NavLink>
        <NavLink to="/" className="item">↗ Página inicial</NavLink>
        <div className="side-foot">
          <div style={{ color: 'var(--nevoa)', fontWeight: 600 }}>{s.name}</div>
          <div style={{ marginBottom: 10 }}>{s.contact}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => { clearSession(); nav('/'); }}>Sair</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
