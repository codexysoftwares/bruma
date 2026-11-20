import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Player, type PlayerRef } from '@remotion/player';
import { Logo, LogoMark } from '../brand/Logo';
import { HeroComp, HERO, type HeroProps } from '../remotion/HeroComp';
import { HowComp, HOW } from '../remotion/HowComp';
import { tiltHandlers, useReveal } from './hooks';
import { getSession } from '../lib/session';
import { Scene3D } from './three/Scene3D';
import { contourBlob, glossyRings, ribbons } from './three/shapes';

const SWATCHES = [
  { c: '#E040FB', n: 'Magenta' }, { c: '#FF2E7E', n: 'Rosa' }, { c: '#A855F7', n: 'Roxo' }, { c: '#5B7CFF', n: 'Azul' }, { c: '#F2EEFF', n: 'Branco' },
];

// builders estáveis (fora do componente) para o three.js não remontar
const heroBlob = (c: Parameters<typeof contourBlob>[0]) => contourBlob(c, { scale: 1.25, y: 0.1 });
const finalBlob = (c: Parameters<typeof contourBlob>[0]) => contourBlob(c, { scale: 1.1, lines: 80 });
const ribbonScene = (c: Parameters<typeof ribbons>[0]) => ribbons(c, 8);

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const logged = !!getSession();
  useEffect(() => {
    const on = () => setScrolled(scrollY > 20);
    on();
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="wrap nav-in">
        <Link to="/" aria-label="bruma. início"><Logo size={32} /></Link>
        <nav className="nav-links">
          <a href="#demo">Demo</a>
          <a href="#como">Como funciona</a>
          <a href="#ps5">PS5</a>
          <a href="#faq">Dúvidas</a>
        </nav>
        <div className="nav-cta">
          <Link className="btn btn-ghost btn-sm" to={logged ? '/app' : '/entrar'}>{logged ? 'Meus cortes' : 'Entrar'}</Link>
          <Link className="btn btn-primary btn-sm" to={logged ? '/app/novo' : '/entrar?next=/app/novo'}>Testar grátis</Link>
        </div>
      </div>
    </header>
  );
}

function DemoSection() {
  const ref = useRef<PlayerRef>(null);
  const [props, setProps] = useState<HeroProps>({ caption: 'não acredito que eu fiz isso um contra três', color: '#E040FB', layout: 'blur', handle: 'seu_canal' });
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const onF = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true), onPause = () => setPlaying(false);
    p.addEventListener('frameupdate', onF);
    p.addEventListener('play', onPlay);
    p.addEventListener('pause', onPause);
    return () => { p.removeEventListener('frameupdate', onF); p.removeEventListener('play', onPlay); p.removeEventListener('pause', onPause); };
  }, []);
  const set = (patch: Partial<HeroProps>) => {
    setProps((p) => ({ ...p, ...patch }));
    // pula para a parte dos celulares para o usuário ver a mudança
    if ((patch.caption !== undefined || patch.color || patch.layout || patch.handle !== undefined) && (ref.current?.getCurrentFrame() ?? 0) < 200) ref.current?.seekTo(205);
  };
  const controls = (
    <div className="controls rv">
      <div className="field">
        <label htmlFor="cap">Sua legenda (muda ao vivo)</label>
        <input id="cap" className="input" value={props.caption} maxLength={80} onChange={(e) => set({ caption: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="handle">Seu @</label>
        <input id="handle" className="input" value={props.handle} maxLength={20} onChange={(e) => set({ handle: e.target.value.replace(/[^\w.]/g, '') })} />
      </div>
      <div className="row" style={{ gap: 24 }}>
        <div className="field">
          <label>Cor da palavra ativa</label>
          <div className="swatches">
            {SWATCHES.map((s) => <button key={s.c} className="swatch" style={{ background: s.c, color: s.c }} aria-label={s.n} aria-pressed={props.color === s.c} onClick={() => set({ color: s.c })} />)}
          </div>
        </div>
        <div className="field">
          <label>Formato</label>
          <div className="seg">
            <button aria-pressed={props.layout === 'blur'} onClick={() => set({ layout: 'blur' })}>Desfocado</button>
            <button aria-pressed={props.layout === 'crop'} onClick={() => set({ layout: 'crop' })}>Tela cheia</button>
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <section className="block" id="demo">
      <div className="glow-spot" style={{ right: '-10%', top: '10%' }} />
      <div className="wrap demo-grid">
        <div>
          <div className="sec-head rv" style={{ marginBottom: 30 }}>
            <span className="eyebrow">Teste ao vivo</span>
            <h2>Mexe e vê o <span className="grad-text">corte</span> mudar</h2>
            <p>Demo renderizada em tempo real com Remotion. Escreve a legenda, troca a cor e o formato: os três celulares atualizam na hora.</p>
            <div className="bar-accent" />
          </div>
          {controls}
        </div>
        <div className="stage rv">
          <div className="stage-player">
            <Player ref={ref} component={HeroComp} inputProps={props} durationInFrames={HERO.durationInFrames} compositionWidth={HERO.width} compositionHeight={HERO.height}
              fps={HERO.fps} loop autoPlay muted controls={false} clickToPlay acknowledgeRemotionLicense style={{ width: '100%', aspectRatio: `${HERO.width}/${HERO.height}` }} />
          </div>
          <div className="stage-bar">
            <button className="icon-btn" aria-label={playing ? 'Pausar' : 'Tocar'} onClick={() => (playing ? ref.current?.pause() : ref.current?.play())}>{playing ? '❚❚' : '▶'}</button>
            <input type="range" aria-label="Linha do tempo da demo" min={0} max={HERO.durationInFrames - 1} value={frame}
              onChange={(e) => { ref.current?.pause(); ref.current?.seekTo(Number(e.target.value)); }} />
            <span className="muted" style={{ fontSize: 11, fontFamily: 'var(--display)', width: 44, textAlign: 'right' }}>{(frame / 30).toFixed(1)}s</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { t: 'Sobe o vídeo', d: 'Arquivo do PC, do celular ou o link da live. Live de 2 horas, gameplay de 10 minutos ou clipe de 3: tanto faz.' },
  { t: 'A bruma acha 3 momentos', d: 'A gente ouve a gameplay inteira atrás dos picos: grito, tiro, reação, risada. Onde a energia sobe, nasce um corte vertical 9:16.' },
  { t: 'Legenda automática', d: 'Cada corte ganha legenda palavra por palavra, em português, no estilo que prende no TikTok. Você corrige o que quiser.' },
  { t: 'Revisa e baixa', d: 'Ajusta o início, troca o formato, escolhe a cor. Baixa em 1080×1920 pronto para TikTok, Reels e Shorts.' },
];

function HowSection() {
  const sec = useRef<HTMLDivElement>(null);
  const player = useRef<PlayerRef>(null);
  const [prog, setProg] = useState(0);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sec.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const total = r.height - innerHeight * 0.6;
        const p = Math.max(0, Math.min(1, (innerHeight * 0.45 - r.top) / total));
        setProg(p);
        player.current?.seekTo(Math.round(p * (HOW.durationInFrames - 1)));
      });
    };
    on();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); };
  }, []);
  const active = Math.min(3, Math.floor(prog * 4));
  const goTo = (i: number) => {
    const el = sec.current!;
    const total = el.getBoundingClientRect().height - innerHeight * 0.6;
    const top = el.getBoundingClientRect().top + scrollY - innerHeight * 0.45 + total * ((i + 0.5) / 4);
    scrollTo({ top, behavior: 'smooth' });
  };
  return (
    <section className="block" id="como">
      <div className="wrap">
        <div className="sec-head rv">
          <span className="eyebrow">Como funciona</span>
          <h2>Da live ao<br /><span className="grad-text">corte pronto</span></h2>
          <p>Role a página: a animação acompanha você.</p>
          <div className="bar-accent" />
        </div>
        <div className="how" ref={sec}>
          <div className="how-steps">
            {STEPS.map((s, i) => (
              <div key={i} className={`how-step ${i === active ? 'active' : ''}`} onClick={() => goTo(i)}>
                <span className="n"><b>[0{i + 1}]</b> / 04</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
          <div className="how-sticky">
            <div className="stage">
              <div className="stage-player" style={{ height: '100%' }}>
                <Player ref={player} component={HowComp} durationInFrames={HOW.durationInFrames} compositionWidth={HOW.width} compositionHeight={HOW.height}
                  fps={HOW.fps} controls={false} acknowledgeRemotionLicense style={{ width: '100%', height: '100%' }} />
              </div>
              <div className="how-progress"><div style={{ width: `${prog * 100}%` }} /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniBars() {
  const [hot, setHot] = useState<number[]>([8, 19, 31]);
  const heights = useRef(Array.from({ length: 40 }, (_, i) => 18 + ((i * 53) % 40)));
  return (
    <div className="mini-bars" onPointerMove={(e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const i = Math.floor(((e.clientX - r.left) / r.width) * 40);
      setHot([Math.max(0, i - 13), i, Math.min(39, i + 13)]);
    }}>
      {heights.current.map((h, i) => <div key={i} className={hot.includes(i) ? 'hot' : ''} style={{ height: hot.includes(i) ? '100%' : `${h}%` }} />)}
    </div>
  );
}

function PopDemo() {
  const words = ['QUE', 'JOGADA', 'ABSURDA'];
  const [k, setK] = useState(0);
  useEffect(() => { const t = setInterval(() => setK((x) => (x + 1) % 3), 420); return () => clearInterval(t); }, []);
  return <div className="pop-demo">{words.map((w, i) => <span key={w} className={i === k ? 'on' : ''}>{w}</span>)}</div>;
}

const FAQ = [
  ['Quanto custa?', 'Nada, por enquanto. Estamos testando o editor: você recebe 3 cortes de graça e, em troca, a gente só pede a sua opinião sincera.'],
  ['Meu vídeo vai para algum servidor?', 'Não quando você sobe o arquivo. O corte e a legenda rodam no seu próprio navegador, então o vídeo não sai do seu computador. Só o link de live (quando você escolhe essa opção) passa pela nossa equipe.'],
  ['Gravo no PS5. Como mando?', 'Do mais fácil ao menos: 1) o link da live na Twitch ou YouTube; 2) pelo app PlayStation no celular, que recebe suas capturas sozinho; 3) pendrive: copia da Galeria do PS5 e sobe pelo PC.'],
  ['Quais formatos de vídeo aceita?', 'MP4, MOV, WebM e MKV, os formatos que PS5, Xbox, OBS e celulares gravam. Para gerar o arquivo final use Chrome ou Edge atualizados.'],
  ['A legenda erra?', 'Às vezes, principalmente com gíria e muito barulho de jogo. Por isso todo corte passa pela sua revisão: você clica na palavra e corrige antes de baixar.'],
  ['Posta sozinho nas redes?', 'Ainda não: por enquanto você baixa e posta. Agenda e postagem automática estão a caminho.'],
];

const FEATS = [
  ['◎', 'Acha o momento sozinha', 'Lê a energia do áudio da gameplay inteira e escolhe os picos que seguram a atenção: grito, tiro, reação.'],
  ['Aa', 'Legenda que prende', 'Palavra por palavra, em português, com destaque na cor que você escolher. Corrige com um clique.'],
  ['▯', 'Dois formatos 9:16', 'Fundo desfocado (mostra a tela toda) ou tela cheia com foco ajustável. 1080×1920, pronto para postar.'],
  ['⌁', 'Seu arquivo fica com você', 'Corte e legenda rodam no seu navegador. O vídeo não sobe para servidor nenhum.'],
];

export default function Landing() {
  useReveal();
  const logged = !!getSession();
  const start = logged ? '/app/novo' : '/entrar?next=/app/novo';
  return (
    <>
      <Nav />
      <main>
        <section className="hero">
          <Scene3D build={heroBlob} className="hero-3d" />
          <div className="wrap hero-center">
            <span className="chip rv"><i /> Grátis: seus 3 primeiros cortes por nossa conta</span>
            <h1 className="rv">
              <span className="l">Sua live</span>
              <span className="l">vira cortes</span>
              <span className="l grad-text">que se espalham</span>
            </h1>
            <div className="hero-row rv">
              <div className="stat"><b className="grad-text">3</b><span>cortes verticais<br />legendados</span></div>
              <p>Sobe a gameplay ou cola o link da live. A bruma acha os 3 melhores momentos e devolve cortes para TikTok, Reels e Shorts. Você revisa e baixa.</p>
              <div className="go">
                <Link className="btn btn-primary" to={start}>Quero meus cortes</Link>
              </div>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden>
          <div className="marquee-track">
            {[0, 1].map((k) => ['TikTok', 'Reels', 'Shorts', 'Live da Twitch', 'YouTube', 'PS5', 'Xbox', 'PC', 'Celular'].map((t) => <span key={k + t}>{t}</span>))}
          </div>
        </div>

        <DemoSection />

        <section className="block" id="recursos" style={{ paddingTop: 40 }}>
          <div className="wrap split">
            <div>
              <div className="sec-head rv" style={{ marginBottom: 30 }}>
                <span className="eyebrow">O que você recebe</span>
                <h2>bruma<span className="accent">.</span><br /><span className="grad-text">editor</span></h2>
              </div>
              <div className="feat-list">
                {FEATS.map(([ic, t, d], i) => (
                  <div className="feat rv" key={t}>
                    <div><div className="ic">{ic}</div><small>0{i + 1}</small></div>
                    <div><h3>{t}</h3><p>{d}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rv"><Scene3D build={glossyRings} className="obj3d" /></div>
          </div>
        </section>

        <HowSection />

        <section className="block" id="ps5">
          <div className="wrap">
            <div className="sec-head rv">
              <span className="eyebrow">Grava no PS5?</span>
              <h2>Grava como <span className="grad-text">já faz</span></h2>
              <p>Botão Create no controle salva o clipe ou a gameplay recente. Ou faz live na Twitch/YouTube direto do PS5. Depois, escolhe um jeito de mandar, do mais fácil ao menos:</p>
            </div>
            <div className="letters">
              {[
                { l: 'A', t: 'Link da live ou do vídeo', d: 'Cola o link da Twitch ou do YouTube. Zero atrito: a bruma baixa sozinha e te devolve os cortes.', g: 'Mais fácil' },
                { l: 'B', t: 'App PlayStation no celular', d: 'Suas capturas sobem sozinhas para o app. Baixa no celular e sobe direto na tela de upload da bruma.', g: 'Pelo celular' },
                { l: 'C', t: 'Pendrive', d: 'Copia da Galeria do PS5 para o pendrive, pluga no PC e arrasta o arquivo para a bruma.', g: 'Pelo PC' },
              ].map((w, i) => (
                <article key={w.l} className="letter rv" {...tiltHandlers()}>
                  <span className="num">0{i + 1}</span>
                  <div className="big">{w.l}</div>
                  <h3>{w.t}</h3>
                  <p>{w.d}</p>
                  <span className="tag">✦ {w.g}</span>
                </article>
              ))}
            </div>
            <div className="ps5-flow rv"><b>Grava</b> → <b>Manda</b> → <b>Recebe 3 cortes legendados</b> → <b>Baixa e posta</b></div>
          </div>
        </section>

        <section className="block who">
          <Scene3D build={ribbonScene} className="who-3d" />
          <div className="wrap">
            <div className="sec-head rv"><span className="eyebrow">Pra quem é</span><h2>Feito pra quem <span className="grad-text">joga</span></h2></div>
            <div className="who-cards">
              {[
                ['✦', 'Começando agora', 'Grava as partidas mas não tem tempo nem paciência para editar. Sobe e recebe os cortes prontos.'],
                ['✦✦', 'Já faz live, mas não cresce', 'Horas de live viram 3 cortes por dia para levar gente nova até o seu canal.'],
                ['✦✦✦', 'Editores de games', 'Pula a parte chata (achar o momento, legendar) e gasta tempo só no acabamento.'],
              ].map(([s, t, d]) => (
                <div key={t} className="who-card rv"><div className="stars">{s}</div><h3>{t}</h3><p>{d}</p></div>
              ))}
            </div>
          </div>
        </section>

        <div className="wrap">
          <div className="nums rv">
            <div><b className="grad-text">3</b><span>cortes</span></div>
            <div><b>9:16</b><span>vertical</span></div>
            <div><b>1080p</b><span>legendado</span></div>
            <div><b className="grad-text">0</b><span>upload p/ servidor</span></div>
          </div>
        </div>

        <section className="block">
          <div className="wrap">
            <div className="cta-band rv">
              <LogoMark size={56} />
              <h2 style={{ marginTop: 18 }}>As vagas são limitadas,<br />então se inscreva <span className="rosa">agora!</span></h2>
              <p>Manda o link da sua última live (ou o arquivo) e recebe 3 cortes de graça. Sem promessa de prazo: a gente só pede a sua opinião em troca.</p>
              <Link className="btn btn-primary" to={start}>Quero me inscrever</Link>
            </div>
          </div>
        </section>

        <section className="block" id="faq" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="sec-head rv"><span className="eyebrow">Dúvidas</span><h2>Perguntas rápidas</h2></div>
            <div className="faq rv">
              {FAQ.map(([q, a], i) => <details key={q}><summary><span><span className="ix">[0{i + 1}]</span>{q}</span></summary><p>{a}</p></details>)}
            </div>
          </div>
        </section>

        <section className="final">
          <Scene3D build={finalBlob} className="hero-3d" />
          <div className="wrap">
            <h2 className="rv">Menos ruído.<br /><span className="grad-text">Mais presença.</span></h2>
            <p className="rv">Você grava horas: essa é a névoa. A bruma tira dela os momentos que valem.</p>
            <Link className="btn btn-ghost rv" to={start}>Começar agora</Link>
          </div>
        </section>
      </main>
      <footer className="foot">
        <div className="wrap">
          <Logo size={26} />
          <span>bruma. cortes que se espalham · gestão digital</span>
          <span>© 2026</span>
        </div>
      </footer>
    </>
  );
}
