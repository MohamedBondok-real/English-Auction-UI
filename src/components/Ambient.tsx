import { useEffect, useRef } from 'react';
import { useTheme } from '../state/theme';
import { useRaf } from '../state/hooks';

/**
 * Two ambient layers, both cheap:
 *  · Aurora — CSS-only drifting radial washes behind the page.
 *  · GiltDust — canvas of ~44 slow motes, paused when the tab is hidden
 *    or the pointer is idle for a long while. Single rAF, no React churn.
 */
export function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient__aurora" />
      <div className="ambient__aurora ambient__aurora--b" />
      <GiltDust />
      <div className="ambient__grain" />
    </div>
  );
}

function GiltDust() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const state = useRef({
    particles: [] as { x: number; y: number; r: number; vx: number; vy: number; a: number; tw: number }[],
    w: 0,
    h: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.current.w = w;
      state.current.h = h;

      const density = Math.min(56, Math.round((w * h) / 34_000));
      const particles = [];
      for (let i = 0; i < density; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.5 + Math.random() * 1.7,
          vx: (Math.random() - 0.5) * 7,
          vy: -3 - Math.random() * 9,
          a: 0.12 + Math.random() * 0.4,
          tw: Math.random() * Math.PI * 2,
        });
      }
      state.current.particles = particles;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    return () => window.removeEventListener('resize', resize);
  }, []);

  const hidden = useRef(false);
  useEffect(() => {
    const onVis = () => {
      hidden.current = document.hidden;
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useRaf((t, dt) => {
    const canvas = canvasRef.current;
    if (!canvas || hidden.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { particles, w, h } = state.current;
    ctx.clearRect(0, 0, w, h);
    const isDark = theme === 'dark';
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += (p.vx + Math.sin(t * 0.32 + p.tw) * 6) * dt;
      p.y += p.vy * dt;
      if (p.y < -12) {
        p.y = h + 8;
        p.x = Math.random() * w;
      }
      if (p.x < -12) p.x = w + 8;
      if (p.x > w + 12) p.x = -8;
      const alpha = p.a * (0.65 + Math.sin(t * 1.6 + p.tw) * 0.35);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = isDark
        ? `rgba(232, 205, 153, ${alpha})`
        : `rgba(154, 117, 38, ${alpha * 0.55})`;
      ctx.fill();
    }
  });

  return <canvas ref={canvasRef} className="ambient__dust" />;
}
