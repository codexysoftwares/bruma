import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../brand/Logo';
import { MistCanvas } from '../lp/MistCanvas';
import { setSession } from '../lib/session';

export default function Login() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [agree, setAgree] = useState(true);
  const valid = name.trim().length > 1 && contact.trim().length > 3;
  return (
    <div className="auth">
      <div className="auth-art">
        <MistCanvas logo density={0.6} />
        <div>
          <h2 style={{ fontSize: 'clamp(32px,4vw,52px)', textTransform: 'uppercase', lineHeight: 1 }}>Menos ruído<span className="neon">.</span><br />Mais presença<span className="neon">.</span></h2>
          <p className="muted" style={{ maxWidth: 420, lineHeight: 1.6 }}>Passa o mouse no logo: os pixels viram névoa e voltam.</p>
        </div>
      </div>
      <form className="auth-form" onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        setSession({ name: name.trim(), contact: contact.trim(), since: Date.now() });
        nav(sp.get('next') || '/app');
      }}>
        <Link to="/"><Logo size={40} /></Link>
        <div>
          <h1 style={{ fontSize: 34, textTransform: 'uppercase', margin: '18px 0 8px' }}>Entrar no teste</h1>
          <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>3 cortes de graça. Sem senha: seus projetos ficam salvos neste navegador.</p>
        </div>
        <div className="field">
          <label htmlFor="n">Seu nome</label>
          <input id="n" className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Como te chamamos?" />
        </div>
        <div className="field">
          <label htmlFor="c">WhatsApp ou @ do canal</label>
          <input id="c" className="input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="(11) 9 9999-9999 ou @seucanal" />
        </div>
        <label className="toggle"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> Topo dar minha opinião sobre os cortes</label>
        <button className="btn btn-primary" disabled={!valid} type="submit">Entrar e criar meus cortes →</button>
        <p className="note">O contato é só para a equipe falar com você sobre o teste.</p>
      </form>
    </div>
  );
}
