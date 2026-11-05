import test from 'node:test';
import assert from 'node:assert/strict';

// The 3D relief runs in the browser; its background removal is plain code, tested here
const { buildRelief, checkerTones } = await import('../../client/src/components/product3d/photoDepth.js');

const W = 160;
const H = 200;

/* A blue tank with a dark lid in the middle of a background drawn by `paint` */
function photo(paint, { alpha = false } = {}) {
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      const tank = x >= 50 && x < 110 && y >= 50 && y < 170;
      const lid = x >= 54 && x < 106 && y >= 40 && y < 50;
      if (tank || lid) {
        const shade = tank ? 1 - Math.abs(x - 80) / 90 : 0.3;
        rgba.set(tank ? [20 * shade, 60 * shade, 190 * shade, 255] : [30, 30, 30, 255], i);
      } else {
        rgba.set(alpha ? [0, 0, 0, 0] : paint(x, y), i);
      }
    }
  }
  return rgba;
}

const productShare = (relief) => relief.alpha.reduce((sum, a) => sum + (a > 0.5 ? 1 : 0), 0) / (W * H);
const tankShare = (60 * 120 + 52 * 10) / (W * H);

test('a checkerboard background ("fake transparency") is removed completely', () => {
  const checker = (x, y) => ((Math.floor(x / 10) + Math.floor(y / 10)) % 2 ? [204, 204, 204, 255] : [255, 255, 255, 255]);
  const relief = buildRelief(photo(checker), W, H);
  assert.equal(relief.cutout, true);
  assert.ok(Math.abs(productShare(relief) - tankShare) < 0.02, `product share ${productShare(relief)}`);
  // No square of the board is left anywhere
  assert.equal(relief.alpha[5 * W + 5], 0);
  assert.equal(relief.alpha[(H - 5) * W + (W - 5)], 0);
  assert.equal(relief.alpha[100 * W + 20], 0);
});

test('checkerTones recognises two light neutral tones only', () => {
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const ringOf = (paint) => {
    const rgba = new Uint8ClampedArray(W * H * 4);
    const ring = [];
    const lums = new Float32Array(W * H);
    for (let x = 0; x < W; x += 1) {
      const i = x;
      rgba.set(paint(x, 0), i * 4);
      lums[i] = lum(...paint(x, 0));
      ring.push(i);
    }
    return checkerTones(rgba, ring, lums);
  };
  assert.ok(ringOf((x) => (Math.floor(x / 10) % 2 ? [204, 204, 204, 255] : [255, 255, 255, 255])));
  assert.equal(ringOf(() => [240, 240, 240, 255]), null);
  assert.equal(ringOf((x) => (Math.floor(x / 10) % 2 ? [200, 40, 40, 255] : [255, 255, 255, 255])), null);
});

test('a transparent PNG uses its own alpha', () => {
  const relief = buildRelief(photo(null, { alpha: true }), W, H);
  assert.equal(relief.cutout, true);
  assert.ok(Math.abs(productShare(relief) - tankShare) < 0.02);
});

test('a plain grey studio background with a floor shadow is removed', () => {
  const studio = (x, y) => {
    const shadow = y > 165 && y < 178 && x > 40 && x < 120 ? 30 : 0;
    return [236 - shadow, 236 - shadow, 238 - shadow, 255];
  };
  const relief = buildRelief(photo(studio), W, H);
  assert.equal(relief.cutout, true);
  assert.ok(Math.abs(productShare(relief) - tankShare) < 0.03, `product share ${productShare(relief)}`);
  assert.equal(relief.alpha[172 * W + 45], 0, 'the floor shadow is background');
});

test('a white tank on a white background keeps its body (narrow leaks are sealed)', () => {
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      const inside = x >= 50 && x < 110 && y >= 40 && y < 170;
      const outline = inside && (x < 52 || x >= 108 || y < 42 || y >= 168);
      // A one-pixel gap in the outline, as soft photo edges have
      const gap = outline && x >= 108 && y >= 100 && y < 102;
      const value = outline && !gap ? 170 : inside ? 247 : 250;
      rgba.set([value, value, value - 2, 255], i);
    }
  }
  const relief = buildRelief(rgba, W, H);
  assert.equal(relief.cutout, true);
  assert.ok(relief.alpha[100 * W + 80] > 0.5, 'the middle of the white body is product');
  assert.equal(relief.alpha[100 * W + 10], 0);
});

test('an upright tank becomes a straight-walled cylinder, as deep as it is wide', () => {
  const relief = buildRelief(photo((x, y) => [236, 236, 238, 255]), W, H);
  assert.equal(relief.axis, 'rows');
  // Same depth all the way down a vertical line (no pillow shape)
  const column = [80, 100, 120, 140].map((y) => relief.depth[y * W + 70]);
  column.forEach((value) => assert.ok(Math.abs(value - column[0]) < 0.03, `depth ${column}`));
  // Round section: centre deepest, sides falling to the outline
  assert.ok(relief.depth[100 * W + 80] > 0.95);
  assert.ok(relief.depth[100 * W + 52] < 0.45);
  // Radius in pixels = half the tank width (60 px)
  assert.ok(Math.abs(relief.radius - 30) <= 2, `radius ${relief.radius}`);
});
