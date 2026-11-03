/*
  A 3D relief from one product photo (no 3D file, no server):

  1. Background: its colour is read from the photo's border, then a flood fill
     from the border takes every pixel of that colour it can reach. Edges in
     the photo (strong colour changes) stop the fill, so a white tank on a
     white background keeps its outline.
  2. Volume: every product pixel gets its distance to the outline, shaped as
     a round cross-section ("inflated"), which is how tanks, drums and most
     moulded parts look from the front.
  3. Detail: a little of the photo's own shading (ribs, lids, outlets) is
     added as relief.

  The photo is never sent anywhere. Plain functions on RGBA arrays, so this
  file also runs in Node (tests) and could run in a worker.
*/

const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;
}

/* Box blur, `passes` times (≈ Gaussian), in place on a copy */
export function blur(source, width, height, radius = 1, passes = 2) {
  let current = Float32Array.from(source);
  const next = new Float32Array(current.length);
  const size = radius * 2 + 1;

  for (let pass = 0; pass < passes; pass += 1) {
    // Horizontal
    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      for (let x = -radius; x <= radius; x += 1) sum += current[y * width + Math.min(width - 1, Math.max(0, x))];
      for (let x = 0; x < width; x += 1) {
        next[y * width + x] = sum / size;
        const add = Math.min(width - 1, x + radius + 1);
        const remove = Math.max(0, x - radius);
        sum += current[y * width + add] - current[y * width + remove];
      }
    }
    // Vertical
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let y = -radius; y <= radius; y += 1) sum += next[Math.min(height - 1, Math.max(0, y)) * width + x];
      for (let y = 0; y < height; y += 1) {
        current[y * width + x] = sum / size;
        const add = Math.min(height - 1, y + radius + 1);
        const remove = Math.max(0, y - radius);
        sum += next[add * width + x] - next[remove * width + x];
      }
    }
  }

  return current;
}

/* Exact squared Euclidean distance transform (Felzenszwalb & Huttenlocher), 1D pass */
function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q += 1) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k -= 1;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k += 1;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q += 1) {
    while (z[k + 1] < q) k += 1;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/* Distance of every inside pixel to the nearest outside pixel (pixels) */
export function distanceInside(inside, width, height) {
  const INF = 1e12;
  const grid = new Float64Array(width * height);
  for (let i = 0; i < grid.length; i += 1) grid[i] = inside[i] ? INF : 0;

  const n = Math.max(width, height);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) f[y] = grid[y * width + x];
    edt1d(f, height, d, v, z);
    for (let y = 0; y < height; y += 1) grid[y * width + x] = d[y];
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) f[x] = grid[y * width + x];
    edt1d(f, width, d, v, z);
    for (let x = 0; x < width; x += 1) grid[y * width + x] = d[x];
  }

  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i += 1) out[i] = Math.sqrt(grid[i]);
  return out;
}

/*
  Background mask: 1 = background, 0 = product.
  Returns { background, found } where `found` is false when no clear
  background could be told apart (product fills the photo, busy scene).
*/
export function findBackground(rgba, width, height) {
  const count = width * height;
  const lum = new Float32Array(count);
  for (let i = 0; i < count; i += 1) lum[i] = luminance(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);

  // Border ring: background colour and how much it varies
  const ring = [];
  const ringWidth = Math.max(1, Math.round(Math.min(width, height) * 0.015));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x < ringWidth || y < ringWidth || x >= width - ringWidth || y >= height - ringWidth) ring.push(y * width + x);
    }
  }

  const transparentBorder = ring.filter((i) => rgba[i * 4 + 3] < 24).length / ring.length > 0.5;
  const bg = [0, 1, 2].map((c) => median(ring.map((i) => rgba[i * 4 + c])));
  const difference = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const dr = rgba[i * 4] - bg[0];
    const dg = rgba[i * 4 + 1] - bg[1];
    const db = rgba[i * 4 + 2] - bg[2];
    difference[i] = rgba[i * 4 + 3] < 24 ? 0 : Math.sqrt(dr * dr + dg * dg + db * db);
  }

  const ringSpread = percentile(ring.map((i) => difference[i]), 0.9);
  const threshold = Math.min(72, Math.max(22, ringSpread * 1.6 + 12));

  // Edges (Sobel on luminance) stop the fill
  const edge = new Float32Array(count);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx = lum[i - width + 1] + 2 * lum[i + 1] + lum[i + width + 1] - lum[i - width - 1] - 2 * lum[i - 1] - lum[i + width - 1];
      const gy = lum[i + width - 1] + 2 * lum[i + width] + lum[i + width + 1] - lum[i - width - 1] - 2 * lum[i - width] - lum[i - width + 1];
      edge[i] = Math.sqrt(gx * gx + gy * gy) / 4;
    }
  }
  const edgeLimit = 34;

  const background = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  // Floor shadows: the background's own colour, only darker (same hue, low saturation change)
  const bgLum = luminance(bg[0], bg[1], bg[2]) || 1;
  const bgChroma = [bg[0] - bgLum, bg[1] - bgLum, bg[2] - bgLum];
  const shadowLike = (i) => {
    const ratio = lum[i] / bgLum;
    if (ratio < 0.6 || ratio > 1.04) return false;
    const r = rgba[i * 4] - lum[i];
    const g = rgba[i * 4 + 1] - lum[i];
    const b = rgba[i * 4 + 2] - lum[i];
    return Math.hypot(r - bgChroma[0], g - bgChroma[1], b - bgChroma[2]) < 12;
  };

  const open = (i) => (transparentBorder
    ? rgba[i * 4 + 3] < 24
    : (difference[i] < threshold || shadowLike(i)) && edge[i] < edgeLimit);

  ring.forEach((i) => {
    if (!background[i] && open(i)) {
      background[i] = 1;
      queue[tail] = i;
      tail += 1;
    }
  });

  while (head < tail) {
    const i = queue[head];
    head += 1;
    const x = i % width;
    const y = (i - x) / width;
    const neighbours = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1];
    for (const j of neighbours) {
      if (j >= 0 && !background[j] && open(j)) {
        background[j] = 1;
        queue[tail] = j;
        tail += 1;
      }
    }
  }

  const share = tail / count;
  return { background, found: share > 0.04 && share < 0.96, lum };
}

/* Keeps the largest product parts: specks smaller than `minShare` of the product go to the background */
function dropSpecks(background, width, height, minShare = 0.02) {
  const count = width * height;
  const label = new Int32Array(count).fill(-1);
  const sizes = [];
  const queue = new Int32Array(count);

  for (let start = 0; start < count; start += 1) {
    if (background[start] || label[start] >= 0) continue;
    const id = sizes.length;
    let head = 0;
    let tail = 1;
    queue[0] = start;
    label[start] = id;
    while (head < tail) {
      const i = queue[head];
      head += 1;
      const x = i % width;
      const y = (i - x) / width;
      const neighbours = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1];
      for (const j of neighbours) {
        if (j >= 0 && !background[j] && label[j] < 0) {
          label[j] = id;
          queue[tail] = j;
          tail += 1;
        }
      }
    }
    sizes.push(tail);
  }

  const total = sizes.reduce((sum, size) => sum + size, 0);
  const keep = sizes.map((size) => size >= total * minShare);
  for (let i = 0; i < count; i += 1) {
    if (!background[i] && !keep[label[i]]) background[i] = 1;
  }
}

/*
  rgba: Uint8ClampedArray of width × height pixels.
  Returns:
    alpha  Float32Array 0..1  soft product mask (1 = product)
    depth  Float32Array 0..1  relief, 1 = closest to the viewer
    bounds { top, bottom, left, right } of the product (pixels)
    cutout true when a background was removed
*/
export function buildRelief(rgba, width, height, { detail = 0.06 } = {}) {
  const count = width * height;
  const { background, found, lum } = findBackground(rgba, width, height);

  // No clear background: the whole photo becomes a softly domed panel
  if (!found) background.fill(0);
  else dropSpecks(background, width, height);

  const inside = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) inside[i] = background[i] ? 0 : 1;

  // Soft, slightly eroded edge so no background halo shows
  const alpha = blur(Float32Array.from(inside), width, height, 1, 2);
  for (let i = 0; i < count; i += 1) alpha[i] = Math.min(1, Math.max(0, (alpha[i] - 0.35) / 0.5));

  // Round cross-section from the distance to the outline
  let depth;
  if (found) {
    const distance = distanceInside(inside, width, height);
    let radius = 0;
    for (let i = 0; i < count; i += 1) radius = Math.max(radius, distance[i]);
    depth = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const t = radius ? Math.min(1, distance[i] / radius) : 0;
      depth[i] = Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
    }
  } else {
    depth = new Float32Array(count);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const dx = (x / (width - 1)) * 2 - 1;
        const dy = (y / (height - 1)) * 2 - 1;
        depth[y * width + x] = 0.35 * Math.max(0, 1 - 0.5 * (dx * dx + dy * dy));
      }
    }
  }
  depth = blur(depth, width, height, 2, 2);

  // Surface detail from the photo's own shading (ribs, lids, outlets)
  if (detail > 0) {
    const coarse = blur(lum, width, height, 4, 2);
    for (let i = 0; i < count; i += 1) {
      if (!inside[i]) continue;
      depth[i] += ((lum[i] - coarse[i]) / 255) * detail;
    }
    depth = blur(depth, width, height, 1, 1);
  }

  for (let i = 0; i < count; i += 1) depth[i] = inside[i] ? Math.max(0, Math.min(1, depth[i])) : 0;

  const bounds = { top: height, bottom: 0, left: width, right: 0 };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!inside[y * width + x]) continue;
      if (y < bounds.top) bounds.top = y;
      if (y > bounds.bottom) bounds.bottom = y;
      if (x < bounds.left) bounds.left = x;
      if (x > bounds.right) bounds.right = x;
    }
  }

  return { alpha, depth, bounds, cutout: found };
}
