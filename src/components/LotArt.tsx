import { useEffect, useRef } from 'react';
import { mulberry32, type Rng } from '../lib/rng';
import type { ArtVariant, Palette } from '../auction/types';

/**
 * Generative lot artwork. Each lot gets a deterministic composition derived
 * from its seed, drawn once to a canvas and cached by size — no image
 * requests, no layout thrash, no re-draw on re-render.
 */

const cache = new Map<string, HTMLCanvasElement>();
const CACHE_LIMIT = 60;

interface Spec {
  palette: Palette;
  variant: ArtVariant;
  seed: number;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/* ————————————————————— painters ————————————————————— */

function paintGround(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, rng: Rng) {
  const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
  g.addColorStop(0, p.bg);
  g.addColorStop(1, shade(p.bg, -0.12));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // soft light falling from the upper left, as in a saleroom vitrine
  const spot = ctx.createRadialGradient(w * 0.28, h * 0.12, 0, w * 0.28, h * 0.12, w * 0.95);
  spot.addColorStop(0, alpha(p.ink, 0.12));
  spot.addColorStop(0.5, alpha(p.ink, 0.03));
  spot.addColorStop(1, alpha(p.ink, 0));
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, w, h);

  // fine tooth
  ctx.globalAlpha = 0.055;
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = rng() > 0.5 ? p.ink : '#ffffff';
    const x = rng() * w;
    const y = rng() * h;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function paintOrbital(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, rng: Rng) {
  const cx = w * (0.38 + rng() * 0.24);
  const cy = h * (0.42 + rng() * 0.18);
  const rings = 4 + Math.floor(rng() * 3);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rng() - 0.5) * 0.5);

  for (let i = rings; i > 0; i--) {
    const r = (Math.min(w, h) * 0.42 * i) / rings;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * (0.42 + i * 0.05), 0, 0, Math.PI * 2);
    ctx.strokeStyle = alpha(p.ink, 0.16 + 0.1 * (1 - i / rings));
    ctx.lineWidth = Math.max(1, w * 0.0022);
    ctx.stroke();
  }
  // graduated degree marks
  ctx.strokeStyle = alpha(p.a, 0.85);
  ctx.lineWidth = Math.max(1, w * 0.0035);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const long = i % 4 === 0;
    const r1 = Math.min(w, h) * 0.44;
    const r2 = r1 + (long ? w * 0.035 : w * 0.017);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.stroke();
  }
  // rete / rete-like star pointers
  ctx.fillStyle = alpha(p.b, 0.9);
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.min(w, h) * (0.1 + rng() * 0.3);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, Math.max(1.6, w * 0.006), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // gilded disc
  const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.12);
  disc.addColorStop(0, alpha(p.c, 0.9));
  disc.addColorStop(1, alpha(p.c, 0));
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function paintStrata(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, rng: Rng) {
  const bands = 9 + Math.floor(rng() * 5);
  let y = h * 0.06;
  for (let i = 0; i < bands; i++) {
    const bh = (h * 0.84) / bands * (0.6 + rng() * 1.1);
    const inset = w * (0.04 + rng() * 0.13);
    const tone = i % 3 === 0 ? p.a : i % 3 === 1 ? p.b : p.ink;
    ctx.fillStyle = alpha(tone, 0.1 + rng() * 0.3);
    roundRect(ctx, inset, y, w - inset * 2, bh, bh * 0.2);
    ctx.fill();
    // grain lines
    ctx.strokeStyle = alpha(p.ink, 0.08);
    ctx.lineWidth = 1;
    for (let g = 0; g < 4; g++) {
      const gy = y + rng() * bh;
      ctx.beginPath();
      ctx.moveTo(inset, gy);
      ctx.bezierCurveTo(w * 0.35, gy + (rng() - 0.5) * bh * 0.4, w * 0.65, gy + (rng() - 0.5) * bh * 0.4, w - inset, gy);
      ctx.stroke();
    }
    y += bh * (0.72 + rng() * 0.3);
    if (y > h * 0.94) break;
  }
}

function paintArch(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, rng: Rng) {
  const arches = 3 + Math.floor(rng() * 3);
  const baseY = h * 0.88;
  for (let i = 0; i < arches; i++) {
    const inset = w * (0.16 + i * 0.07);
    const aw = w - inset * 2;
    const ah = h * (0.74 - i * 0.12);
    const x = inset;
    const y = baseY - ah;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, y + aw / 2);
    ctx.arc(x + aw / 2, y + aw / 2, aw / 2, Math.PI, 0);
    ctx.lineTo(x + aw, baseY);
    ctx.strokeStyle = alpha(i % 2 === 0 ? p.a : p.b, 0.75 - i * 0.1);
    ctx.lineWidth = Math.max(1.4, w * 0.004);
    ctx.stroke();
    if (i === 0) {
      const fill = ctx.createLinearGradient(0, y, 0, baseY);
      fill.addColorStop(0, alpha(p.c, 0.28));
      fill.addColorStop(1, alpha(p.a, 0.02));
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }
  // keystones
  ctx.fillStyle = alpha(p.c, 0.75);
  for (let i = 0; i < 7; i++) {
    const x = w * 0.22 + i * (w * 0.093);
    const height = h * (0.03 + rng() * 0.05);
    ctx.fillRect(x, baseY - height, Math.max(2, w * 0.008), height);
  }
  ctx.strokeStyle = alpha(p.ink, 0.22);
  ctx.lineWidth = Math.max(1, w * 0.002);
  ctx.beginPath();
  ctx.moveTo(w * 0.06, baseY);
  ctx.lineTo(w * 0.94, baseY);
  ctx.stroke();
}

function paintBloom(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, rng: Rng) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const petals = 7 + Math.floor(rng() * 5);
  for (let ring = 3; ring >= 1; ring--) {
    const radius = Math.min(w, h) * 0.1 * ring;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + ring * 0.22;
      const px = cx + Math.cos(a) * radius * 1.35;
      const py = cy + Math.sin(a) * radius;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a);
      const grad = ctx.createLinearGradient(0, 0, radius, 0);
      grad.addColorStop(0, alpha(ring === 2 ? p.a : p.b, 0.72));
      grad.addColorStop(1, alpha(p.c, 0.06));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.92, radius * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = alpha(p.ink, 0.2);
      ctx.lineWidth = Math.max(0.8, w * 0.0018);
      ctx.stroke();
      ctx.restore();
    }
  }
  // gilt core
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.17);
  core.addColorStop(0, alpha(p.c, 0.98));
  core.addColorStop(0.55, alpha(p.c, 0.65));
  core.addColorStop(1, alpha(p.c, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.17, 0, Math.PI * 2);
  ctx.fill();
  // vine scroll base
  ctx.strokeStyle = alpha(p.ink, 0.25);
  ctx.lineWidth = Math.max(1, w * 0.0025);
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.9);
  for (let x = 0; x <= 1.001; x += 0.1) {
    ctx.lineTo(w * (0.08 + x * 0.84), h * 0.9 - Math.sin(x * Math.PI * 3) * h * 0.03);
  }
  ctx.stroke();
}

function paintGrid(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, rng: Rng) {
  const cols = 6 + Math.floor(rng() * 4);
  const rows = Math.round(cols * (h / w)) + 1;
  const cw = w / cols;
  const ch = h / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const d = Math.hypot(x - cols * 0.5, y - rows * 0.42) / Math.hypot(cols * 0.5, rows * 0.5);
      const tone = rng() > 0.82 ? (rng() > 0.5 ? p.a : p.b) : p.c;
      ctx.fillStyle = alpha(tone, Math.max(0, 0.62 - d * 0.55));
      const pad = Math.min(cw, ch) * 0.13;
      roundRect(ctx, x * cw + pad, y * ch + pad, cw - pad * 2, ch - pad * 2, Math.min(cw, ch) * 0.1);
      ctx.fill();
    }
  }
  ctx.strokeStyle = alpha(p.ink, 0.16);
  ctx.lineWidth = Math.max(1, w * 0.0022);
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.42, Math.min(w, h) * 0.34, 0, Math.PI * 2);
  ctx.stroke();
}

function paintWave(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, rng: Rng) {
  const layers = 6;
  for (let l = 0; l < layers; l++) {
    const baseY = h * (0.52 + l * 0.075);
    const amp = h * (0.03 + l * 0.012);
    const grad = ctx.createLinearGradient(0, baseY - amp, 0, h);
    grad.addColorStop(0, alpha(l % 2 === 0 ? p.a : p.b, 0.35 - l * 0.035));
    grad.addColorStop(1, alpha(p.bg, 0.9));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += Math.max(4, w / 90)) {
      const y =
        baseY +
        Math.sin((x / w) * Math.PI * (2 + l * 0.4) + l * 1.7 + rng() * 0.03) * amp +
        Math.sin((x / w) * Math.PI * 7 + l) * amp * 0.3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  // the campanile
  const tx = w * 0.72;
  const th = h * 0.42;
  ctx.fillStyle = alpha(p.ink, 0.82);
  ctx.fillRect(tx, h * 0.5 - th, Math.max(3, w * 0.012), th);
  ctx.beginPath();
  ctx.moveTo(tx - w * 0.018, h * 0.5 - th);
  ctx.lineTo(tx + w * 0.006 + w * 0.006, h * 0.5 - th - w * 0.03);
  ctx.lineTo(tx + w * 0.03, h * 0.5 - th);
  ctx.closePath();
  ctx.fill();
  // setting sun
  const sun = ctx.createRadialGradient(w * 0.3, h * 0.34, 0, w * 0.3, h * 0.34, w * 0.22);
  sun.addColorStop(0, alpha(p.c, 0.95));
  sun.addColorStop(1, alpha(p.c, 0));
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
}

function paintPrism(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, rng: Rng) {
  const cx = w * 0.5;
  const cy = h * 0.48;
  const spikes = 5 + Math.floor(rng() * 3);
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2 - Math.PI / 2;
    const len = Math.min(w, h) * (0.26 + rng() * 0.15);
    const tone = i % 3 === 0 ? p.a : i % 3 === 1 ? p.b : p.c;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.lineTo(Math.cos(a + 0.16) * len * 0.22, Math.sin(a + 0.16) * len * 0.22);
    ctx.lineTo(Math.cos(a - 0.16) * len * 0.22, Math.sin(a - 0.16) * len * 0.22);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    g.addColorStop(0, alpha(tone, 0.15));
    g.addColorStop(1, alpha(tone, 0.92));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = alpha(p.ink, 0.45);
    ctx.lineWidth = Math.max(0.7, w * 0.0016);
    ctx.stroke();
  }
  // centre stone
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const r = Math.min(w, h) * 0.075;
    i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = alpha(p.c, 0.95);
  ctx.fill();
  ctx.strokeStyle = alpha(p.ink, 0.6);
  ctx.stroke();
  ctx.restore();
}

function paintPlume(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, rng: Rng) {
  // porcelain silhouette
  const cx = w * 0.5;
  const top = h * 0.18;
  const bottom = h * 0.86;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.045, top);
  ctx.bezierCurveTo(cx - w * 0.2, h * 0.3, cx - w * 0.26, h * 0.62, cx - w * 0.13, bottom);
  ctx.bezierCurveTo(cx - w * 0.05, bottom + h * 0.03, cx + w * 0.05, bottom + h * 0.03, cx + w * 0.13, bottom);
  ctx.bezierCurveTo(cx + w * 0.26, h * 0.62, cx + w * 0.2, h * 0.3, cx + w * 0.045, top);
  ctx.closePath();
  const body = ctx.createLinearGradient(cx - w * 0.26, 0, cx + w * 0.26, 0);
  body.addColorStop(0, alpha(p.c, 0.1));
  body.addColorStop(0.35, alpha('#ffffff', 0.5));
  body.addColorStop(0.62, alpha(p.a, 0.18));
  body.addColorStop(1, alpha(p.c, 0.22));
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = alpha(p.ink, 0.35);
  ctx.lineWidth = Math.max(1, w * 0.0025);
  ctx.stroke();

  // painted pheasant-ish flurry
  for (let i = 0; i < 26; i++) {
    const x = cx + (rng() - 0.5) * w * 0.3;
    const y = top + rng() * (bottom - top);
    const r = w * (0.008 + rng() * 0.02);
    ctx.fillStyle = alpha(rng() > 0.55 ? p.a : rng() > 0.5 ? p.b : p.c, 0.55);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.62, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // rim band
  ctx.strokeStyle = alpha(p.a, 0.8);
  ctx.lineWidth = Math.max(1.5, w * 0.005);
  ctx.beginPath();
  ctx.ellipse(cx, top + h * 0.02, w * 0.046, h * 0.012, 0, 0, Math.PI * 2);
  ctx.stroke();
  // foot shadow
  const shadow = ctx.createRadialGradient(cx, bottom + h * 0.05, 0, cx, bottom + h * 0.05, w * 0.3);
  shadow.addColorStop(0, alpha(p.ink, 0.3));
  shadow.addColorStop(1, alpha(p.ink, 0));
  ctx.fillStyle = shadow;
  ctx.fillRect(0, bottom, w, h - bottom);
}

function paintSeal(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, rng: Rng) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const r = Math.min(w, h) * 0.3;
  // filigree collar
  ctx.strokeStyle = alpha(p.b, 0.85);
  ctx.lineWidth = Math.max(1, w * 0.0018);
  for (let i = 0; i < 54; i++) {
    const a = (i / 54) * Math.PI * 2;
    const r1 = r * 1.1;
    const r2 = r * (1.18 + rng() * 0.16);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.quadraticCurveTo(
      cx + Math.cos(a + 0.1) * r2,
      cy + Math.sin(a + 0.1) * r2,
      cx + Math.cos(a + 0.2) * r1,
      cy + Math.sin(a + 0.2) * r1,
    );
    ctx.stroke();
  }
  // gold cabochon
  const g = ctx.createRadialGradient(cx - r * 0.6, cy - r * 0.7, r * 0.1, cx, cy, r * 1.15);
  g.addColorStop(0, alpha(p.c, 1));
  g.addColorStop(0.45, alpha(p.b, 0.95));
  g.addColorStop(1, alpha(shade(p.b, -0.4), 1));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.98, r * 1.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // garnet heart
  const heart = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.3, 0, cx, cy, r * 0.72);
  heart.addColorStop(0, alpha(p.a, 0.98));
  heart.addColorStop(1, alpha(shade(p.a, -0.55), 0.98));
  ctx.fillStyle = heart;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.52, r * 0.66, 0, 0, Math.PI * 2);
  ctx.fill();
  // glint
  ctx.fillStyle = alpha('#ffffff', 0.5);
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.24, cy - r * 0.34, r * 0.1, r * 0.19, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function paintWeft(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, rng: Rng) {
  const rows = 16;
  const rh = h / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = -1; x < 12; x++) {
      const cx = (x + 0.5 + (y % 2) * 0.5) * (w / 11);
      const tone = rng() > 0.86 ? p.a : rng() > 0.74 ? p.c : p.b;
      ctx.fillStyle = alpha(tone, 0.16 + rng() * 0.4);
      ctx.beginPath();
      ctx.moveTo(cx, y * rh);
      ctx.lineTo(cx + w / 13, (y + 0.5) * rh);
      ctx.lineTo(cx, (y + 1) * rh);
      ctx.lineTo(cx - w / 13, (y + 0.5) * rh);
      ctx.closePath();
      ctx.fill();
    }
  }
  // border
  ctx.strokeStyle = alpha(p.c, 0.75);
  ctx.lineWidth = Math.max(2, w * 0.008);
  ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
  ctx.strokeStyle = alpha(p.a, 0.6);
  ctx.lineWidth = Math.max(1, w * 0.003);
  ctx.strokeRect(w * 0.09, h * 0.09, w * 0.82, h * 0.82);
}

const PAINTERS: Record<
  ArtVariant,
  (ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, rng: Rng) => void
> = {
  orbital: paintOrbital,
  strata: paintStrata,
  arch: paintArch,
  bloom: paintBloom,
  grid: paintGrid,
  wave: paintWave,
  prism: paintPrism,
  plume: paintPlume,
  seal: paintSeal,
  weft: paintWeft,
};

/* ————————————————————— colour maths ————————————————————— */

export function alpha(hex: string, a: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}

export function shade(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  const mix = (v: number) => Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const int = parseInt(h, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

/** Render (or fetch from cache) the artwork for a lot at a given pixel size. */
export function renderArt(spec: Spec, width: number, height: number, dpr = 1): HTMLCanvasElement {
  const key = `${spec.variant}|${spec.palette.bg}|${spec.seed}|${Math.round(width)}x${Math.round(height)}|${dpr}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);

  const rng = mulberry32(spec.seed);
  paintGround(ctx, width, height, spec.palette, rng);
  PAINTERS[spec.variant](ctx, width, height, spec.palette, rng);

  // vignette — the vitrine. Key on luminance, not on a guessed hex prefix.
  const groundIsLight = luminance(spec.palette.bg) > 0.6;
  const vg = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.25,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.78,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, alpha(groundIsLight ? '#1a1a1c' : '#000000', groundIsLight ? 0.26 : 0.42));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, width, height);

  // a mint rim-light, so every plate reads as part of the room
  const rim = ctx.createLinearGradient(0, 0, width, height);
  rim.addColorStop(0, alpha(spec.palette.c, 0.14));
  rim.addColorStop(0.45, alpha(spec.palette.c, 0));
  rim.addColorStop(1, alpha(spec.palette.a, 0.12));
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, width, height);

  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, canvas);
  return canvas;
}

/* ————————————————————— component ————————————————————— */

interface Props {
  spec: Spec;
  /** aspect ratio width/height */
  ratio?: number;
  className?: string;
  /** live auction light sweep */
  glow?: boolean;
  alt?: string;
}

export function LotArt({ spec, ratio = 4 / 5, className = '', glow = false, alt = '' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let frame = 0;
    const draw = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const height = rect.width / ratio;
      const source = renderArt(spec, rect.width, height, dpr);
      canvas.width = source.width;
      canvas.height = source.height;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(source, 0, 0);
    };

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    });
    ro.observe(wrap);
    draw();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [spec, ratio]);

  return (
    <div
      ref={wrapRef}
      className={`lot-art ${glow ? 'lot-art--live' : ''} ${className}`}
      style={{ aspectRatio: String(ratio) }}
      role={alt ? 'img' : 'presentation'}
      aria-label={alt || undefined}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="lot-art__gloss" aria-hidden="true" />
      <span className="lot-art__frame" aria-hidden="true" />
      {glow && <span className="lot-art__pulse" aria-hidden="true" />}
    </div>
  );
}
