/**
 * Generates Kongsi's brand images from code (no design tool needed).
 *
 *   node scripts/gen-logo.mjs
 *
 * The mark: a rounded square in Kongsi yellow holding a dark ring that's split
 * down the middle into two offset halves — "one pot, split fairly". Rendered
 * 4× supersampled with signed-distance coverage, then box-downsampled for
 * clean anti-aliased edges. Uses only `pngjs` (already in the dependency tree).
 */
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'assets/images');

const YELLOW = [0xfa, 0xcc, 0x15];
const INK = [0x1a, 0x1a, 0x1a];
const SS = 4;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

/** signed distance to a rounded rectangle, negative outside */
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const out =
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    r;
  return -out;
}

/** coverage of a ring (annulus) centred at (cx,cy) at pixel (px,py) */
function ringCoverage(px, py, cx, cy, rOuter, rInner) {
  const d = Math.hypot(px - cx, py - cy);
  const outer = clamp01(rOuter - d + 0.5);
  const inner = clamp01(d - rInner + 0.5);
  return Math.min(outer, inner);
}

function renderMark(n, { bg, mark = 0.28, inkColor = INK }) {
  const img = new PNG({ width: n, height: n });
  const cx = n / 2;
  const cy = n / 2;

  const squareHalf = n * 0.5;
  const squareRadius = n * 0.23;

  const rOuter = n * mark;
  const rInner = rOuter * 0.5;
  const gapHalf = rOuter * 0.096; // half-width of the vertical split
  const offset = rOuter * 0.17; // left half sits a touch higher, right a touch lower

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const idx = (y * n + x) << 2;
      const px = x + 0.5;
      const py = y + 0.5;

      let col = null;
      let alpha = 0;

      if (bg) {
        const cov = clamp01(
          sdRoundRect(px, py, cx, cy, squareHalf, squareHalf, squareRadius) + 0.5,
        );
        if (cov > 0) {
          col = YELLOW;
          alpha = cov;
        }
      }

      // left half of the ring, lifted; right half, dropped
      const left = Math.min(
        ringCoverage(px, py, cx, cy - offset, rOuter, rInner),
        clamp01(cx - gapHalf - px + 0.5),
      );
      const right = Math.min(
        ringCoverage(px, py, cx, cy + offset, rOuter, rInner),
        clamp01(px - (cx + gapHalf) + 0.5),
      );
      const ink = Math.max(left, right);

      if (ink > 0) {
        alpha = Math.max(alpha, ink);
        col = bg ? mix(YELLOW, inkColor, ink) : inkColor;
      }

      if (col) {
        img.data[idx] = col[0];
        img.data[idx + 1] = col[1];
        img.data[idx + 2] = col[2];
        img.data[idx + 3] = Math.round(clamp01(alpha) * 255);
      } else {
        img.data[idx + 3] = 0;
      }
    }
  }
  return img;
}

function downsample(src, size) {
  const out = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * src.width + (x * SS + sx)) << 2;
          const sa = src.data[i + 3] / 255;
          r += src.data[i] * sa;
          g += src.data[i + 1] * sa;
          b += src.data[i + 2] * sa;
          a += sa;
        }
      }
      const o = (y * size + x) << 2;
      const norm = a > 0 ? a : 1;
      out.data[o] = Math.round(r / norm);
      out.data[o + 1] = Math.round(g / norm);
      out.data[o + 2] = Math.round(b / norm);
      out.data[o + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }
  return out;
}

function write(name, size, opts) {
  const small = downsample(renderMark(size * SS, opts), size);
  mkdirSync(OUT, { recursive: true });
  const p = resolve(OUT, name);
  writeFileSync(p, PNG.sync.write(small));
  console.log('wrote', name, `${size}x${size}`);
}

function writeSolid(name, size, rgb) {
  const img = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size; i++) {
    const o = i << 2;
    img.data[o] = rgb[0];
    img.data[o + 1] = rgb[1];
    img.data[o + 2] = rgb[2];
    img.data[o + 3] = 255;
  }
  writeFileSync(resolve(OUT, name), PNG.sync.write(img));
  console.log('wrote', name, `${size}x${size} solid`);
}

write('icon.png', 1024, { bg: true, mark: 0.28 });
write('splash-icon.png', 512, { bg: false, mark: 0.34 });
write('android-icon-foreground.png', 1024, { bg: false, mark: 0.2 });
write('android-icon-monochrome.png', 1024, {
  bg: false,
  mark: 0.2,
  inkColor: [0xff, 0xff, 0xff],
});
write('favicon.png', 64, { bg: true, mark: 0.3 });
writeSolid('android-icon-background.png', 1024, YELLOW);
console.log('done');
