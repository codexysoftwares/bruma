import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

type Ctx = { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer };
type Built = { update: (t: number, mouse: { x: number; y: number }, scroll: number) => void; dispose?: () => void };

/** Monta uma cena three.js num canvas, pausa fora da tela e segue o mouse/scroll. */
export function Scene3D({ build, className, style }: { build: (c: Ctx) => Built; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch { return; } // sem WebGL: a página segue sem 3D
    renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = new RoomEnvironment();
    scene.environment = pmrem.fromScene(env, 0.04).texture;
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 8);
    const built = build({ scene, camera, renderer });
    const mouse = { x: 0, y: 0 }, target = { x: 0, y: 0 };
    let visible = true, raf = 0;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    };
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      mouse.x += (target.x - mouse.x) * 0.05;
      mouse.y += (target.y - mouse.y) * 0.05;
      const r = canvas.getBoundingClientRect();
      const scroll = 1 - (r.top + r.height) / (innerHeight + r.height);
      built.update(reduce ? 0 : clock.getElapsedTime(), mouse, scroll);
      renderer.render(scene, camera);
    };
    const onMove = (e: PointerEvent) => { target.x = (e.clientX / innerWidth) * 2 - 1; target.y = (e.clientY / innerHeight) * 2 - 1; };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' });
    io.observe(canvas);
    addEventListener('pointermove', onMove);
    resize();
    loop();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); removeEventListener('pointermove', onMove);
      built.dispose?.();
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x?.dispose()); });
      pmrem.dispose(); renderer.dispose();
    };
  }, [build]);
  return <canvas ref={ref} className={className} style={style} aria-hidden />;
}
