import { useEffect } from 'react';

export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.rv');
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

export function tiltHandlers() {
  return {
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const el = e.currentTarget, r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 8}deg) rotateY(${(x - 0.5) * 10}deg)`;
      el.style.setProperty('--mx', `${x * 100}%`);
      el.style.setProperty('--my', `${y * 100}%`);
    },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => { e.currentTarget.style.transform = ''; },
  };
}
