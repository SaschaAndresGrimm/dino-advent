'use strict';
// Scenery, themes and render effects. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// =====================================================================
// Scenery (layered, cached parallax + live details)
// =====================================================================
const GFX = [
  { sky: ['#0c3440', '#3e8f86', '#d8efc0'], far1: '#7fb3a0', far2: '#5c977f', mid: '#2f6b4a', midHi: '#4f9a5a', near: '#173d2c', haze: '210,245,215', sun: [800, 105], sunCol: '255,250,215', cloud: ['#ffffff', '#cfe6dc'], g: ['#5a3a22', '#2a1a10'], stone: '#8a6a4a' },
  { sky: ['#3d6fb3', '#f0a868', '#ffe0a8'], far1: '#e0a27a', far2: '#cc8358', mid: '#a5532f', midHi: '#d27a45', near: '#6e2f17', haze: '255,220,175', sun: [200, 125], sunCol: '255,245,205', cloud: ['#fff4e4', '#f2c6a0'], g: ['#c0703f', '#6e3418'], stone: '#e0a070' },
  { sky: ['#06142c', '#1f4677', '#86aed6'], far1: '#b4cbe4', far2: '#8eaacc', mid: '#5a7aa2', midHi: '#e8f1fb', near: '#14313f', haze: '205,228,255', sun: null, cloud: ['#dce9fb', '#9fb6d6'], g: ['#5f7591', '#2c3b52'], stone: '#8fa3bb' },
  { sky: ['#0d0202', '#4a1206', '#c2410f'], far1: '#4a1810', far2: '#33100b', mid: '#200706', midHi: '#3a120c', near: '#120303', haze: '255,110,40', sun: null, cloud: ['#5a3632', '#2a1614'], g: ['#2e1c18', '#100806'], stone: '#4a3a36' },
  { sky: ['#06142c', '#1f4677', '#86aed6'], far1: '#b4cbe4', far2: '#8eaacc', mid: '#5a7aa2', midHi: '#e8f1fb', near: '#14313f', haze: '205,228,255', sun: null, cloud: ['#dce9fb', '#9fb6d6'], g: ['#5f7591', '#2c3b52'], stone: '#8fa3bb' }, // 4 christmas night uses the ice art (ART), this entry only keeps the indexes aligned
  { sky: ['#2e9fe0', '#8fd8f5', '#e8f8ff'], far1: '#6fc3d8', far2: '#4aa8c8', mid: '#2f8f6a', midHi: '#52b98a', near: '#1d5a44', haze: '220,245,255', sun: [780, 95], sunCol: '255,246,200', cloud: ['#ffffff', '#d8eefc'], g: ['#ecd49a', '#b8935a'], stone: '#d0b27a' }, // 5 beach
  { sky: ['#0b3a6a', '#1f86b0', '#58d0d8'], far1: '#1b6a98', far2: '#14587e', mid: '#1a8aa0', midHi: '#35b8c0', near: '#0e4a62', haze: '120,220,235', sun: null, cloud: ['#9fe8f0', '#5fc0d0'], g: ['#d8c48a', '#8a7a48'], stone: '#b8a468' }, // 6 underwater
  { sky: ['#2f5fa8', '#8fbde8', '#e8f3ff'], far1: '#a9c2de', far2: '#8aa8cc', mid: '#5c7ea6', midHi: '#dfeaf7', near: '#2a4a40', haze: '225,238,255', sun: [220, 100], sunCol: '255,248,220', cloud: ['#ffffff', '#d4e2f4'], g: ['#8a8f98', '#4a4f58'], stone: '#a0a6b0' }, // 7 mountains
];
const LP = 1920;
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255;
  if (f >= 1) { const k = f - 1; r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= f; g *= f; b *= f; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function vgrad(y0, y1, c0, c1, c2) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); if (c2) { g.addColorStop(0.5, c1); g.addColorStop(1, c2); } else g.addColorStop(1, c1); return g; }
function hgrad(x0, x1, c0, c1, c2) { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, c0); if (c2) { g.addColorStop(0.5, c1); g.addColorStop(1, c2); } else g.addColorStop(1, c1); return g; }
function shadow(x, y, w, a = 0.3) { ell(x, y, w, w * 0.18, 0, `rgba(0,0,0,${a})`); }
function mod(a, n) { return ((a % n) + n) % n; }
// a leaf / frond: from (x,y), length len, angle ang, droop curves it
function leaf(x, y, len, ang, droop, w, c1, c2, rib) {
  if (Math.cos(ang) < 0) droop = -droop;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, droop * len * 0.5 - w, len, droop * len);
  ctx.quadraticCurveTo(len * 0.5, droop * len * 0.5 + w, 0, 0);
  ctx.fillStyle = c2 ? hgrad(0, len, c1, c2) : c1; ctx.fill();
  if (rib) { ctx.strokeStyle = rib; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, droop * len * 0.5, len, droop * len); ctx.stroke(); }
  ctx.restore();
}
// periodic ridge (period LP) so cached layers tile seamlessly
function ridge(x, seed, f = [2, 5, 11, 23], a = [0.5, 0.26, 0.15, 0.09]) {
  let v = 0; for (let i = 0; i < f.length; i++) v += a[i] * Math.sin(x / LP * Math.PI * 2 * f[i] + seed * (i + 1.7));
  return v;
}
function ridgePath(y0, amp, seed, step = 8, quant = 0, f, a) {
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= LP; x += step) { let v = ridge(x, seed, f, a); if (quant) v = Math.round(v * quant) / quant; ctx.lineTo(x, y0 - amp * v); }
  ctx.lineTo(LP, H); ctx.closePath();
}

// ---------- cached layer canvases ----------
let layerCache = { wi: -1, rs: 0, far: null, mid: null };
function layerCanvas(y0, y1, rs, fn) {
  const c = document.createElement('canvas'); c.width = Math.ceil(LP * rs); c.height = Math.ceil((y1 - y0) * rs);
  const old = ctx; ctx = c.getContext('2d'); ctx.setTransform(rs, 0, 0, rs, 0, -y0 * rs);
  try { fn(); } finally { ctx = old; }
  return { c, y0, y1 };
}
function getLayers(wi) {
  const rs = Math.min(1.5, Math.max(0.75, DPR * SC));
  if (layerCache.wi !== wi || Math.abs(layerCache.rs - rs) > 0.01) {
    layerCache = { wi, rs, far: layerCanvas(60, 445, rs, () => paintFar(wi)), mid: layerCanvas(96, 445, rs, () => paintMid(wi)) };
  }
  return layerCache;
}
function drawLayer(l, off) {
  const o = mod(off, LP), h = l.y1 - l.y0;
  ctx.drawImage(l.c, -o, l.y0, LP, h);
  if (LP - o < W) ctx.drawImage(l.c, LP - o, l.y0, LP, h);
}
function hazeBand(y0, y1, rgb, a) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},${a})`); ctx.fillStyle = g; ctx.fillRect(0, y0, LP, y1 - y0); }

function paintFar(wi) {
  if (wi >= 5) return paintFarNew(wi);
  const gx = GFX[wi], R = rng(91 + wi * 7);
  if (wi === 0) { // misty jungle mountains with waterfalls
    ridgePath(250, 110, 1.3, 8, 0, [3, 7, 13, 29], [0.55, 0.25, 0.14, 0.06]); ctx.fillStyle = vgrad(130, 360, shade(gx.far1, 1.15), gx.far1); ctx.fill();
    hazeBand(230, 370, gx.haze, 0.55);
    ridgePath(310, 80, 4.1, 8, 0, [2, 6, 15, 31], [0.5, 0.3, 0.13, 0.07]); ctx.fillStyle = vgrad(220, 400, gx.far2, shade(gx.far2, 0.8)); ctx.fill();
    for (let i = 0; i < 4; i++) { // waterfalls
      const x = 200 + i * 470 + R() * 120, top = 310 - 80 * ridge(x, 4.1, [2, 6, 15, 31], [0.5, 0.3, 0.13, 0.07]) + 8;
      ctx.fillStyle = vgrad(top, top + 90, 'rgba(235,255,250,.85)', 'rgba(235,255,250,.15)'); ctx.fillRect(x, top, 7, 90);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x + 2, top, 2, 90);
      ell(x + 3, top + 88, 16, 5, 0, 'rgba(255,255,255,.35)');
    }
    // canopy bumps on the ridge
    for (let x = 0; x < LP; x += 14) { const y = 310 - 80 * ridge(x, 4.1, [2, 6, 15, 31], [0.5, 0.3, 0.13, 0.07]); circle(x, y + 6, 9 + hash(x) * 6, shade(gx.far2, 0.92)); }
    hazeBand(300, 445, gx.haze, 0.5);
  } else if (wi === 1) { // layered mesas with strata
    ridgePath(255, 70, 2.2, 6, 3, [2, 5, 9, 17], [0.55, 0.25, 0.12, 0.08]); ctx.fillStyle = vgrad(160, 330, shade(gx.far1, 1.12), gx.far1); ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(120,50,30,.18)'; ctx.lineWidth = 3;
    for (let y = 200; y < 445; y += 14) { ctx.beginPath(); for (let x = 0; x <= LP; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.01 + y) * 2); ctx.stroke(); }
    ctx.restore();
    hazeBand(230, 360, gx.haze, 0.45);
    ridgePath(320, 60, 5.7, 6, 3, [3, 7, 11, 19], [0.5, 0.28, 0.14, 0.08]); ctx.fillStyle = vgrad(240, 400, gx.far2, shade(gx.far2, 0.78)); ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(255,230,190,.18)'; ctx.lineWidth = 4;
    for (let y = 260; y < 445; y += 18) { ctx.beginPath(); for (let x = 0; x <= LP; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.007 + y) * 3); ctx.stroke(); }
    ctx.restore();
    hazeBand(320, 445, gx.haze, 0.45);
  } else if (wi === 2) { // snowy peaks
    const pk = [4, 9, 17, 37], pa = [0.45, 0.3, 0.17, 0.08];
    ridgePath(250, 130, 3.3, 6, 0, pk, pa); ctx.fillStyle = vgrad(100, 380, shade(gx.far1, 1.05), shade(gx.far1, 0.85)); ctx.fill();
    // snow caps: band below the ridge line
    ctx.beginPath();
    for (let x = 0; x <= LP; x += 6) ctx.lineTo(x, 250 - 130 * ridge(x, 3.3, pk, pa));
    for (let x = LP; x >= 0; x -= 6) { const y = 250 - 130 * ridge(x, 3.3, pk, pa); ctx.lineTo(x, Math.min(y + 22 + 16 * Math.sin(x * 0.05), Math.max(y + 4, 225 + 10 * Math.sin(x * 0.03)))); }
    ctx.closePath(); ctx.fillStyle = 'rgba(250,253,255,.95)'; ctx.fill();
    // shaded side of peaks
    ctx.fillStyle = 'rgba(40,70,120,.18)';
    for (let x = 0; x < LP; x += 6) { const y0 = 250 - 130 * ridge(x, 3.3, pk, pa), y1 = 250 - 130 * ridge(x + 6, 3.3, pk, pa); if (y1 > y0) ctx.fillRect(x, y0, 6, 445 - y0); }
    hazeBand(240, 380, gx.haze, 0.5);
    ridgePath(320, 70, 6.1, 8, 0, [2, 5, 13, 27], [0.5, 0.3, 0.14, 0.06]); ctx.fillStyle = vgrad(240, 420, gx.far2, shade(gx.far2, 0.8)); ctx.fill();
    for (let x = 0; x < LP; x += 9) { const y = 320 - 70 * ridge(x, 6.1, [2, 5, 13, 27], [0.5, 0.3, 0.14, 0.06]); if (hash(x * 3) < 0.6) { const h = 14 + hash(x) * 16; ctx.fillStyle = shade(gx.far2, 0.72); ctx.beginPath(); ctx.moveTo(x - 5, y + 4); ctx.lineTo(x, y - h); ctx.lineTo(x + 5, y + 4); ctx.fill(); } }
    hazeBand(320, 445, gx.haze, 0.45);
  } else { // jagged dark mountains with glowing lava streaks
    ridgePath(255, 110, 2.7, 5, 0, [3, 8, 19, 41], [0.45, 0.3, 0.17, 0.1]); ctx.fillStyle = vgrad(140, 380, shade(gx.far1, 1.1), gx.far2); ctx.fill();
    ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const x = R() * LP, y = 255 - 110 * ridge(x, 2.7, [3, 8, 19, 41], [0.45, 0.3, 0.17, 0.1]);
      ctx.strokeStyle = 'rgba(255,90,20,.55)'; ctx.lineWidth = 3; ctx.shadowColor = '#ff5a00'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(x, y);
      let px = x, py = y; for (let k = 0; k < 8; k++) { px += (R() - 0.5) * 18; py += 14; ctx.lineTo(px, py); } ctx.stroke();
    }
    ctx.restore(); ctx.shadowBlur = 0;
    hazeBand(240, 400, gx.haze, 0.22);
    ridgePath(330, 70, 7.3, 5, 0, [2, 7, 17, 37], [0.5, 0.28, 0.15, 0.08]); ctx.fillStyle = vgrad(250, 440, shade(gx.far2, 0.9), shade(gx.far2, 0.6)); ctx.fill();
    hazeBand(340, 445, gx.haze, 0.25);
  }
}

function paintMid(wi) {
  if (wi >= 5) return paintMidNew(wi);
  const gx = GFX[wi], R = rng(333 + wi * 11);
  if (wi === 0) { // jungle canopy hills with emergent trees
    const f = [3, 8, 17], a = [0.55, 0.3, 0.15], ry = x => 380 - 45 * ridge(x, 2.9, f, a);
    for (let i = 0; i < 7; i++) { // emergent trees behind canopy
      const x = 120 + i * 270 + R() * 90, b = ry(x), h = 120 + R() * 60;
      ctx.strokeStyle = shade(gx.mid, 0.6); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, b); ctx.quadraticCurveTo(x + 10, b - h * 0.5, x - 4, b - h); ctx.stroke();
      for (let k = 0; k < 9; k++) circle(x - 4 + (R() - 0.5) * 70, b - h + (R() - 0.6) * 30, 18 + R() * 14, k % 3 ? shade(gx.mid, 0.95) : shade(gx.mid, 1.15));
    }
    ctx.beginPath(); ctx.moveTo(0, 445); for (let x = 0; x <= LP; x += 8) ctx.lineTo(x, ry(x)); ctx.lineTo(LP, 445); ctx.closePath();
    ctx.fillStyle = vgrad(300, 445, gx.mid, shade(gx.mid, 0.6)); ctx.fill();
    for (let x = 0; x < LP; x += 11) { // canopy crowns
      const y = ry(x), r = 12 + hash(x) * 14;
      circle(x, y + 4, r, shade(gx.mid, 0.85 + hash(x + 3) * 0.3));
      circle(x - r * 0.25, y + 4 - r * 0.35, r * 0.55, 'rgba(160,230,140,.18)');
    }
  } else if (wi === 1) { // mesas, hoodoos and an arch
    const f = [2, 5, 13], a = [0.5, 0.32, 0.18];
    for (let i = 0; i < 8; i++) { // hoodoos
      const x = 80 + i * 240 + R() * 80, h = 60 + R() * 70, w = 18 + R() * 10;
      ctx.fillStyle = hgrad(x - w, x + w, gx.midHi, gx.mid, shade(gx.mid, 0.7)); rr(x - w / 2, 420 - h, w, h + 30, 6); ctx.fill();
      ell(x, 420 - h, w * 0.9, 9, 0, shade(gx.mid, 0.75));
    }
    ctx.beginPath(); ctx.moveTo(0, 445);
    for (let x = 0; x <= LP; x += 6) { let v = ridge(x, 3.7, f, a); v = Math.round(v * 2.5) / 2.5; ctx.lineTo(x, 385 - 55 * v); }
    ctx.lineTo(LP, 445); ctx.closePath(); ctx.fillStyle = vgrad(280, 445, gx.midHi, gx.mid, shade(gx.mid, 0.65)); ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(90,30,10,.22)'; ctx.lineWidth = 2;
    for (let y = 300; y < 445; y += 11) { ctx.beginPath(); for (let x = 0; x <= LP; x += 24) ctx.lineTo(x, y + Math.sin(x * 0.02 + y) * 1.5); ctx.stroke(); }
    ctx.restore();
    // natural arch
    const ax = 1350, ab = 425; ctx.fillStyle = hgrad(ax - 110, ax + 110, gx.midHi, gx.mid, shade(gx.mid, 0.7));
    ctx.beginPath(); ctx.moveTo(ax - 110, ab); ctx.lineTo(ax - 100, ab - 120); ctx.quadraticCurveTo(ax, ab - 175, ax + 100, ab - 120); ctx.lineTo(ax + 110, ab);
    ctx.lineTo(ax + 60, ab); ctx.lineTo(ax + 55, ab - 70); ctx.quadraticCurveTo(ax, ab - 120, ax - 55, ab - 70); ctx.lineTo(ax - 60, ab); ctx.closePath(); ctx.fill();
  } else if (wi === 2) { // snowy hills with pine forest
    const f = [2, 7, 15], a = [0.55, 0.3, 0.15], ry = x => 385 - 40 * ridge(x, 1.9, f, a);
    for (let x = 0; x < LP; x += 13) { // tree line
      if (hash(x * 1.7) < 0.25) continue;
      const b = ry(x) + 6, h = 38 + hash(x) * 40, w = h * 0.3;
      ctx.fillStyle = shade(gx.mid, 0.62 + hash(x + 1) * 0.15);
      for (let t = 0; t < 3; t++) { const bb = b - t * h * 0.28, ww = w * (1 - t * 0.25); ctx.beginPath(); ctx.moveTo(x - ww, bb); ctx.lineTo(x, bb - h * 0.45); ctx.lineTo(x + ww, bb); ctx.fill(); }
      ctx.fillStyle = 'rgba(245,250,255,.8)'; ctx.beginPath(); ctx.moveTo(x - w * 0.3, b - h * 0.62); ctx.lineTo(x, b - h * 0.86); ctx.lineTo(x + w * 0.3, b - h * 0.62); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(0, 445); for (let x = 0; x <= LP; x += 8) ctx.lineTo(x, ry(x)); ctx.lineTo(LP, 445); ctx.closePath();
    ctx.fillStyle = vgrad(330, 445, '#f4f8ff', '#b8cde6'); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = 0; x <= LP; x += 8) ctx.lineTo(x, ry(x)); ctx.stroke();
  } else { // dark rock hills with lava rivers
    const f = [3, 7, 19], a = [0.5, 0.33, 0.17], ry = x => 382 - 50 * ridge(x, 5.3, f, a);
    ctx.beginPath(); ctx.moveTo(0, 445); for (let x = 0; x <= LP; x += 6) ctx.lineTo(x, ry(x) + (hash(x) - 0.5) * 6); ctx.lineTo(LP, 445); ctx.closePath();
    ctx.fillStyle = vgrad(300, 445, gx.midHi, gx.mid); ctx.fill();
    ctx.save(); ctx.clip();
    for (let i = 0; i < 6; i++) {
      let x = 150 + i * 320 + R() * 100, y = ry(x) + 4;
      ctx.lineCap = 'round'; ctx.shadowColor = '#ff4a00'; ctx.shadowBlur = 14;
      const pts = [[x, y]]; while (y < 445) { x += (R() - 0.5) * 30; y += 12; pts.push([x, y]); }
      for (const [lw, col] of [[7, '#c2300a'], [3.5, '#ffb030']]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([px, py], k) => k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke(); }
    }
    ctx.restore(); ctx.shadowBlur = 0;
  }
}

// ---------- live sky elements ----------
const cloudSprites = {};
const CLOUD_STYLE = { // per art set: lit face, shadow, darker base, highlight, optional underglow
  0: { lit: '#ffffff', shade: '#c4dfd3', base: 'rgba(110,160,145,.55)', rim: '#ffffff', rimA: 0.7 },
  1: { lit: '#fff7ea', shade: '#f2c29c', base: 'rgba(205,120,90,.5)', rim: '#ffffff', rimA: 0.6 },
  2: { lit: '#9fb6da', shade: '#3e5884', base: 'rgba(20,36,70,.6)', rim: '#e8f0ff', rimA: 0.35 },
  3: { lit: '#5c3a34', shade: '#2a1614', base: 'rgba(10,3,2,.5)', glow: 'rgba(255,90,20,.55)', rim: '#8a5a4e', rimA: 0.4 },
  5: { lit: '#ffffff', shade: '#cfe6f6', base: 'rgba(120,170,210,.5)', rim: '#ffffff', rimA: 0.7 },
  7: { lit: '#ffffff', shade: '#d2deef', base: 'rgba(120,140,185,.5)', rim: '#ffffff', rimA: 0.7 },
};
function cloudSprite(wi, v) {
  const key = wi + ':' + v; if (cloudSprites[key]) return cloudSprites[key];
  // a cumulus with a flat base: puffs along a dome, lit from the upper left, a shaded crescent on the lower right,
  // a darker base and (per world) a tinted underside: moonlight at night, lava glow over the volcano
  const st = CLOUD_STYLE[wi] || CLOUD_STYLE[0], rs = 1.5, w = 220, h = 120, c = document.createElement('canvas'); c.width = w * rs; c.height = h * rs;
  const old = ctx; ctx = c.getContext('2d'); ctx.scale(rs, rs);
  const R = rng(17 + v * 5 + wi * 31), base = 98, puffs = [], n = 6 + (v % 3);
  const x0 = 22 + R() * 14, x1 = 198 - R() * 14, peak = 0.35 + R() * 0.3;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), x = x0 + (x1 - x0) * t, dome = Math.sin(Math.PI * Math.min(1, t < peak ? t / peak * 0.5 : 0.5 + (t - peak) / (1 - peak) * 0.5));
    const r = (14 + 26 * dome) * (0.85 + R() * 0.3); puffs.push([x, base - r * 0.7 - dome * 10, r]);
  }
  puffs.push([x0 + (x1 - x0) * (peak + (R() - 0.5) * 0.15), base - 52 - R() * 8, 24 + R() * 6]); // the crown
  const shape = (dx, dy, k) => { ctx.beginPath(); for (const [x, y, r] of puffs) { ctx.moveTo(x + dx + r * k, y + dy); ctx.arc(x + dx, y + dy, r * k, 0, Math.PI * 2); } ctx.rect(x0 + dx, base - 16 + dy, x1 - x0, 16); };
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, base); ctx.clip();
  shape(0, 0, 1); ctx.fillStyle = st.shade; ctx.fill();
  ctx.globalCompositeOperation = 'source-atop';
  shape(-4, -6, 0.9); ctx.fillStyle = vgrad(base - 70, base, st.lit, shade(st.lit, 0.96)); ctx.fill(); // lit faces
  ctx.fillStyle = vgrad(base - 26, base, 'rgba(0,0,0,0)', st.base); ctx.fillRect(0, base - 26, w, 26); // shaded base
  if (st.glow) { ctx.fillStyle = vgrad(base - 34, base, 'rgba(0,0,0,0)', st.glow); ctx.fillRect(0, base - 34, w, 34); }
  ctx.globalAlpha = st.rimA; for (const [x, y, r] of puffs) if (r > 22) circle(x - r * 0.35, y - r * 0.42, r * 0.38, st.rim); ctx.globalAlpha = 1; // soft highlights on the big puffs
  ctx.restore();
  ctx = old; return (cloudSprites[key] = c);
}
function silLongneck(x, y, s, col) { // a far-away herd member, pure silhouette
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(0, -50, 46, 24, 0, 0, 7); ctx.fill();
  const nb = Math.sin(T * 0.6 + x * 0.01) * 4;
  ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(34, -58); ctx.quadraticCurveTo(70, -70, 72 + nb, -118); ctx.stroke();
  ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(72 + nb, -118); ctx.lineTo(86 + nb, -123); ctx.stroke();
  ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-40, -52); ctx.quadraticCurveTo(-90, -48, -122, -18); ctx.stroke();
  ctx.lineWidth = 11; for (const lx of [-28, -10, 16, 32]) { ctx.beginPath(); ctx.moveTo(lx, -40); ctx.lineTo(lx + Math.sin(T * 0.8 + lx) * 3, 6); ctx.stroke(); }
  ctx.restore();
}
function swimPlesio(x, y, s, ph, col) { // a plesiosaur wading in the bay: back, neck and head above the water, flipper and tail tip paddling
  const dark = shade(col, 0.68), bob = Math.sin(ph) * 3;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.rect(-130, -180, 280, 180); ctx.clip();
  ctx.lineCap = 'round';
  ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-36, -1); ctx.quadraticCurveTo(-70, -16, -96, -6 + Math.sin(ph + 1) * 4); ctx.stroke();
  ctx.fillStyle = vgrad(-30, 0, shade(col, 1.35), col); ctx.beginPath(); ctx.ellipse(0, 2, 46, 27, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.ellipse(-6, -12, 28, 6, -0.1, 0, 7); ctx.fill(); ctx.fillStyle = dark; for (const [qx, qy, qr] of [[-18, -14, 4], [-4, -20, 3.4], [12, -16, 3], [-30, -8, 3]]) { ctx.globalAlpha = 0.45; circle(qx, qy, qr, dark); ctx.globalAlpha = 1; }
  ctx.strokeStyle = col; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(30, -10); ctx.quadraticCurveTo(64, -34, 56 + bob, -84); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(32, -14); ctx.quadraticCurveTo(64, -38, 58 + bob, -80); ctx.stroke();
  ell(62 + bob, -90, 14, 9, 0.2, col); circle(66 + bob, -93, 3.4, '#fff'); circle(67 + bob, -93, 1.8, '#111'); ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(70 + bob, -88, 4, 0.2, 1.4); ctx.stroke(); ell(70 + bob, -98 + 2, 5, 1.6, 0.2, 'rgba(255,255,255,.2)');
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(-4 + Math.sin(ph) * 5, 0, 18, 5, 0.35 + Math.sin(ph) * 0.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(26 - Math.sin(ph) * 5, 0, 15, 4.5, -0.3, 0, 7); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 2, 52 * s, 4.5 * s, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke();
  for (let k = 0; k < 2; k++) { const u = (T * 0.35 + k * 0.5) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - u)})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y + 3, (52 + u * 44) * s, (5 + u * 6) * s, 0, 0, Math.PI * 2); ctx.stroke(); }
}
function jumpIchthyo(cyc) { // every few seconds an ichthyosaur leaps out of the sea in an arc
  const u = (T % cyc) / 1.9; if (u >= 1) return;
  const idx = Math.floor(T / cyc), x0 = 120 + (idx * 313) % 520, X = x0 + u * 170, Y = 330 - Math.sin(u * Math.PI) * 78, ang = Math.atan2(-Math.cos(u * Math.PI) * 78 * Math.PI, 170);
  for (const e of [0, 1]) { const k = e ? (u - 0.86) / 0.14 : u / 0.14; if (k < 0 || k > 1) continue; const px = x0 + e * 170; ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; for (let i = 0; i < 5; i++) { const a = -Math.PI * (0.15 + i * 0.175); ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * 6, 330 + Math.sin(a) * 3); ctx.lineTo(px + Math.cos(a) * (14 + k * 16), 330 + Math.sin(a) * (14 + k * 16)); ctx.stroke(); } }
  ctx.save(); ctx.translate(X, Y); ctx.rotate(ang); ctx.scale(0.85, 0.85); ctx.lineJoin = 'round';
  ctx.fillStyle = vgrad(-12, 12, '#6f9ad0', '#3e6aa6', '#2a4a80'); ctx.beginPath(); ctx.moveTo(40, 0); ctx.quadraticCurveTo(16, -13, -18, -7); ctx.lineTo(-34, -16); ctx.lineTo(-30, -2); ctx.lineTo(-34, 14); ctx.lineTo(-18, 7); ctx.quadraticCurveTo(16, 13, 40, 0); ctx.fill(); ctx.strokeStyle = '#1b2f55'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#dce8f6'; ctx.beginPath(); ctx.ellipse(8, 5, 22, 4.5, 0.05, 0, 7); ctx.fill(); ctx.fillStyle = '#2a4a80'; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(-10, -24); ctx.lineTo(-14, -8); ctx.fill(); ctx.beginPath(); ctx.moveTo(12, 6); ctx.lineTo(2, 20); ctx.lineTo(0, 7); ctx.fill();
  ctx.strokeStyle = '#1b2f55'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(54, -1); ctx.stroke(); circle(30, -3, 3.4, '#fff'); circle(31, -3, 1.8, '#111');
  ctx.restore();
}
function swimIchthyo(x, y, s, ph) { // an ichthyosaur cruising through the blue
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; const wag = Math.sin(ph) * 4;
  ctx.fillStyle = vgrad(-14, 14, '#6f9ad0', '#3e6aa6', '#2a4a80'); ctx.beginPath(); ctx.moveTo(42, 0); ctx.quadraticCurveTo(16, -14, -18, -7 + wag * 0.3); ctx.lineTo(-34, -16 + wag); ctx.lineTo(-30, -2 + wag * 0.6); ctx.lineTo(-34, 14 + wag); ctx.lineTo(-18, 7 + wag * 0.3); ctx.quadraticCurveTo(16, 14, 42, 0); ctx.fill(); ctx.strokeStyle = '#1b2f55'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#dce8f6'; ctx.beginPath(); ctx.ellipse(8, 6, 22, 4.5, 0.05, 0, 7); ctx.fill(); ctx.fillStyle = '#2a4a80'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-10, -26); ctx.lineTo(-14, -9); ctx.fill(); ctx.beginPath(); ctx.moveTo(12, 7); ctx.lineTo(2, 22 + wag * 0.5); ctx.lineTo(0, 8); ctx.fill();
  ctx.strokeStyle = '#1b2f55'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(42, 0); ctx.lineTo(58, -1); ctx.stroke(); circle(31, -3, 3.6, '#fff'); circle(32, -3, 1.9, '#111');
  ctx.restore();
}
function swimPlesioFull(x, y, s, ph, col) { // plesiosaur under water: four paddle flippers, long neck, small head
  const dark = shade(col, 0.66), nb = Math.sin(ph) * 5;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round';
  ctx.strokeStyle = col; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(-40, 2); ctx.quadraticCurveTo(-72, 14, -100, 2 + Math.sin(ph + 1) * 5); ctx.stroke();
  ctx.fillStyle = dark; for (const [fx, fy, a] of [[-18, 18, 0.9], [26, 18, 0.6]]) { ctx.save(); ctx.translate(fx, fy); ctx.rotate(a + Math.sin(ph * 1.6 + fx) * 0.3); ctx.beginPath(); ctx.ellipse(0, 14, 7, 22, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = vgrad(-22, 22, shade(col, 1.3), col, dark); ctx.beginPath(); ctx.ellipse(0, 0, 46, 24, 0, 0, 7); ctx.fill(); ell(4, 10, 32, 8, 0, 'rgba(255,255,255,.2)');
  ctx.strokeStyle = col; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(34, -8); ctx.quadraticCurveTo(70, -30, 64 + nb, -70); ctx.stroke();
  ell(70 + nb, -76, 14, 8.5, 0.3, col); circle(75 + nb, -79, 3.4, '#fff'); circle(76 + nb, -79, 1.8, '#111'); ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(79 + nb, -74, 4, 0.2, 1.4); ctx.stroke();
  ctx.fillStyle = dark; for (const [fx, fy, a] of [[-22, -6, -0.8], [22, -8, -0.5]]) { ctx.save(); ctx.translate(fx, fy); ctx.rotate(a + Math.sin(ph * 1.6 + fx + 2) * 0.3); ctx.beginPath(); ctx.ellipse(0, -14, 6, 20, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.restore();
}
function swimTurtle(x, y, s, ph) { // Archelon, a giant sea turtle
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const fl = Math.sin(ph) * 0.35;
  ctx.fillStyle = '#5a8f6a'; for (const sd of [-1, 1]) { ctx.save(); ctx.translate(18, sd * 6); ctx.rotate(sd * (-0.7 + fl)); ctx.beginPath(); ctx.ellipse(-4, sd * 20, 9, 26, 0, 0, 7); ctx.fill(); ctx.restore(); ctx.save(); ctx.translate(-26, sd * 8); ctx.rotate(sd * (0.6 - fl)); ctx.beginPath(); ctx.ellipse(-2, sd * 11, 6, 14, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = vgrad(-30, 30, '#8ab070', '#5a8a50', '#3a5a38'); ctx.beginPath(); ctx.ellipse(0, 0, 50, 32, 0, 0, 7); ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = '#2a4028'; ctx.stroke();
  ctx.strokeStyle = 'rgba(42,64,40,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); for (const px of [-18, 0, 18]) { ctx.moveTo(px, -29); ctx.lineTo(px, 29); } ctx.stroke();
  ell(58, -2, 14, 10, 0, '#a8c888'); circle(62, -6, 3.2, '#fff'); circle(63, -6, 1.7, '#111'); ctx.strokeStyle = '#2a4028'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(66, 0, 4, 0.1, 1.5); ctx.stroke();
  ctx.restore();
}
function ammoDrift(x, y, s, ph) { // a small ammonite drifting by, tentacles trailing
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = '#e8785a'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 3, 12); ctx.quadraticCurveTo(-8 + i * 4 + Math.sin(ph + i) * 4, 26, -10 + i * 5 + Math.sin(ph * 1.2 + i) * 6, 38); ctx.stroke(); }
  ctx.fillStyle = vgrad(-18, 14, '#f2d6a2', '#b8804a'); ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fill(); ctx.strokeStyle = '#6a4220'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1.8; ctx.beginPath(); for (let a = 0; a < Math.PI * 4; a += 0.2) { const r = 1.5 + a * 1.1; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); circle(9, 9, 3.6, '#fff'); circle(10, 9.4, 1.8, '#111');
  ctx.restore();
}
function drawFarLife(wi, cam) {
  if (wi === 6) { // an age-of-dinosaurs reef: ichthyosaurs, a plesiosaur, a giant sea turtle and ammonites
    ctx.globalAlpha = 0.9;
    swimPlesioFull(mod(T * 9 + 420 - cam * 0.05, W + 520) - 260, 232 + Math.sin(T * 0.7) * 6, 0.85, T * 1.1, '#5f9a8c');
    swimTurtle(mod(T * 6 + 120 - cam * 0.045, W + 400) - 200, 300 + Math.sin(T * 0.6) * 8, 0.8, T * 1.5);
    for (let i = 0; i < 4; i++) swimIchthyo(mod(i * 270 + T * 42 - cam * 0.06, W + 420) - 210, 120 + i * 34 + Math.sin(T * 1.3 + i) * 9, 0.8 - i * 0.07, T * 5 + i);
    for (let i = 0; i < 3; i++) ammoDrift(mod(i * 380 + T * (5 + i * 2) - cam * 0.04, W + 200) - 100, 150 + i * 62 + Math.sin(T * 0.8 + i) * 12, 0.9 - i * 0.12, T * 2 + i);
    ctx.globalAlpha = 1;
  }
  if (wi === 5) { // a sunny bay with swimming dinosaurs, wave crests and a leaping ichthyosaur
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let i = 0; i < 20; i++) { const x = mod(i * 97 + T * (8 + (i % 3) * 5) - cam * 0.03, W + 120) - 60, y = 300 + (i * 7) % 34; ctx.beginPath(); ctx.moveTo(x - 9, y + 1); ctx.quadraticCurveTo(x, y - 3, x + 9, y + 1); ctx.stroke(); }
    jumpIchthyo(11);
    for (let i = 0; i < 3; i++) { const x = mod(i * 420 + 140 + T * 9 - cam * 0.045, W + 520) - 260; swimPlesio(x, 324 + i * 9, 0.68 + i * 0.1, T * 1.3 + i * 2, ['#4aa08c', '#5a8fc0', '#7aa86a'][i]); }
  } // distant herd + a flock of pterosaurs: a little life in the backdrop
  if (wi === 0 || wi === 1) {
    const col = wi === 0 ? 'rgba(28,66,58,.5)' : wi === 1 ? 'rgba(130,64,40,.42)' : 'rgba(40,110,120,.32)';
    for (let i = 0; i < 3; i++) { const span = W + 520, x = mod(i * 470 + 300 - T * 4 - cam * 0.07, span) - 260; silLongneck(x, 352 + i * 4, 0.42 + i * 0.07, col); }
  }
  if (wi === 0 || wi === 1 || wi === 3 || wi === 7) {
    ctx.strokeStyle = wi === 3 ? 'rgba(20,6,4,.6)' : 'rgba(25,35,35,.45)'; ctx.fillStyle = ctx.strokeStyle; ctx.lineCap = 'round'; ctx.lineWidth = 2.6;
    for (let i = 0; i < 5; i++) {
      const x = mod(i * 85 + T * 24 + 200 - cam * 0.05, W + 260) - 130, y = 105 + (i % 3) * 22 + Math.abs(i - 2) * 9 + Math.sin(T * 0.9 + i) * 6, f = Math.sin(T * 3.6 + i * 0.9) * 8, sz = 0.8 + (i % 2) * 0.25;
      ctx.beginPath(); ctx.moveTo(x - 24 * sz, y + f); ctx.quadraticCurveTo(x - 9 * sz, y - 7 - f * 0.4, x, y); ctx.quadraticCurveTo(x + 9 * sz, y - 7 - f * 0.4, x + 24 * sz, y + f); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + 12 * sz, y + 3); ctx.lineTo(x + 2, y + 4); ctx.fill();
    }
  }
}
function drawClouds(wi, cam) {
  if (wi === 6) return;
  ctx.globalAlpha = wi === 3 ? 0.85 : wi === 2 ? 0.8 : 0.95;
  for (let i = 0; i < 5; i++) {
    const span = W + 320, x = mod(hash(i + wi * 9) * span - T * (6 + i * 2) - cam * 0.03 * (1 + i * 0.2), span) - 240, y = 40 + hash(i + 20) * 120, s = 0.6 + hash(i + 40) * 0.6;
    ctx.drawImage(cloudSprite(wi, i % 3), x, y, 220 * s, 120 * s);
  }
  ctx.globalAlpha = 1;
}

// =====================================================================
// Art for the three new themes: 5 beach, 6 underwater, 7 mountains
// =====================================================================
function paintFarNew(wi) {
  const gx = GFX[wi], R = rng(91 + wi * 7);
  if (wi === 5) { // a bright sea to the horizon, an island, sailboats
    ctx.fillStyle = vgrad(290, 400, '#5fcbe6', '#2e93cc'); ctx.fillRect(0, 290, LP, 130);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, 289, LP, 2);
    for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.25 + 0.3 * hash(i); ctx.fillStyle = '#fff'; ctx.fillRect(R() * LP, 296 + R() * 90, 10 + R() * 24, 2); } ctx.globalAlpha = 1;
    for (const x0 of [380, 1180]) { ctx.fillStyle = '#3a8a5a'; ctx.beginPath(); ctx.ellipse(x0, 292, 110, 26, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#e8d29a'; ctx.beginPath(); ctx.ellipse(x0, 292, 130, 6, 0, 0, 7); ctx.fill(); palm(x0 - 30, 286, 40, '#2a6a44'); palm(x0 + 20, 288, 30, '#2a6a44'); }
    hazeBand(330, 420, gx.haze, 0.35);
  } else if (wi === 6) { // deep blue: rock arches, a far reef and a whale
    ridgePath(330, 120, 2.2, 8, 0, [2, 5, 11, 23], [0.5, 0.28, 0.14, 0.08]); ctx.fillStyle = vgrad(180, 420, shade(gx.far1, 1.1), shade(gx.far1, 0.7)); ctx.fill();
    ctx.fillStyle = 'rgba(10,50,90,.5)'; ctx.strokeStyle = 'rgba(10,50,90,.5)'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(700, 215, 95, 26, 0, 0, 7); ctx.fill(); ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(775, 205); ctx.quadraticCurveTo(840, 175, 826, 122); ctx.stroke(); ctx.beginPath(); ctx.ellipse(832, 112, 19, 10, 0.3, 0, 7); ctx.fill(); ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(615, 215); ctx.quadraticCurveTo(560, 232, 520, 205); ctx.stroke(); ctx.beginPath(); ctx.ellipse(668, 246, 40, 9, 0.6, 0, 7); ctx.ellipse(748, 246, 36, 8, -0.5, 0, 7); ctx.fill();
    for (let i = 0; i < 14; i++) { const x = R() * LP, h = 40 + R() * 90; ctx.strokeStyle = 'rgba(20,110,120,.55)'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, 420); ctx.quadraticCurveTo(x + 14, 420 - h * 0.5, x - 6, 420 - h); ctx.stroke(); }
    hazeBand(240, 440, gx.haze, 0.55);
  } else { // huge snowy peaks
    ridgePath(260, 150, 1.7, 8, 0, [2, 5, 9, 19], [0.6, 0.26, 0.1, 0.04]); ctx.fillStyle = vgrad(100, 340, '#ffffff', shade(gx.far1, 1.05), gx.far1); ctx.fill();
    { // light from the sun on the left: shade every slope that faces right, then rock crevices running down from each peak
      const pf = [2, 5, 9, 19], pa = [0.6, 0.26, 0.1, 0.04], py = x => 260 - 150 * ridge(x, 1.7, pf, pa);
      for (let x = 0; x < LP; x += 4) { const a = py(x), b = py(x + 4); const al = clamp((b - a) * 0.12, 0, 0.24); if (al > 0.01) { ctx.fillStyle = vgrad(a, a + 150, `rgba(70,95,145,${al})`, 'rgba(70,95,145,0)'); ctx.fillRect(x, a, 4, 150); } }
      ctx.lineCap = 'round';
      for (let x = 8; x < LP; x += 4) {
        if (!(py(x) < py(x - 8) && py(x) <= py(x + 8))) continue;
        const top = py(x), Rc = rng(x);
        for (let k = 0; k < 3; k++) { // tapered gullies: thin at the peak, widening as they run down the slope
          const dir = k === 1 ? -1 : 1, len = 50 + Rc() * 60, sx = x + dir * (3 + k * 10), sy = top + 4 + k * 12, ex = sx + dir * (14 + Rc() * 18), ey = sy + len, wd = 5 + Rc() * 4;
          ctx.fillStyle = `rgba(80,105,150,${0.16 + Rc() * 0.1})`; ctx.beginPath(); ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(sx + dir * 2, sy + len * 0.5, ex, ey); ctx.lineTo(ex + dir * wd, ey - 3);
          ctx.quadraticCurveTo(sx + dir * (4 + wd * 0.5), sy + len * 0.45, sx + dir * 1.5, sy); ctx.closePath(); ctx.fill();
        }
      }
    }
    hazeBand(230, 380, gx.haze, 0.5);
    ridgePath(330, 90, 5.3, 8, 0, [3, 7, 13, 27], [0.5, 0.28, 0.14, 0.08]); ctx.fillStyle = vgrad(220, 420, gx.far2, shade(gx.far2, 0.75)); ctx.fill(); hazeBand(330, 445, gx.haze, 0.45);
  }
}
function paintMidNew(wi) {
  const gx = GFX[wi], R = rng(333 + wi * 11);
  if (wi === 5) { // sand dunes with palm groves
    const f = [2, 6, 13], a = [0.6, 0.28, 0.12], ry = x => 392 - 30 * ridge(x, 3.3, f, a);
    ctx.beginPath(); ctx.moveTo(0, 445); for (let x = 0; x <= LP; x += 8) ctx.lineTo(x, ry(x)); ctx.lineTo(LP, 445); ctx.closePath(); ctx.fillStyle = vgrad(340, 445, '#f3dfa6', '#d8b878'); ctx.fill();
    for (let i = 0; i < 9; i++) { const x = 80 + i * 205 + R() * 80, b = ry(x); palm(x, b + 4, 100 + R() * 40, '#2a7a4a'); if (R() < 0.6) palm(x + 40, ry(x + 40) + 4, 70 + R() * 30, '#34925a'); }
    ctx.strokeStyle = 'rgba(190,150,80,.35)'; ctx.lineWidth = 2; for (let x = 0; x < LP; x += 26) { ctx.beginPath(); ctx.arc(x, ry(x) + 16, 14, 0.2, 2.9); ctx.stroke(); }
    hazeBand(340, 445, gx.haze, 0.3);
  } else if (wi === 6) { // kelp forests and coral
    ctx.fillStyle = vgrad(300, 445, 'rgba(10,80,100,0)', 'rgba(10,80,100,.7)'); ctx.fillRect(0, 300, LP, 145);
    for (let i = 0; i < 26; i++) { const x = R() * LP, h = 90 + R() * 130, c = i % 3 ? '#1f8a5a' : '#2fa870'; ctx.strokeStyle = c; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, 445); for (let k = 1; k <= 8; k++) ctx.lineTo(x + Math.sin(k * 0.9 + i) * 14, 445 - h * k / 8); ctx.stroke(); }
    for (let i = 0; i < 12; i++) { const x = 60 + i * 150 + R() * 80, c = ['#e0605a', '#e89a3a', '#b86ad0', '#f0c84a'][i % 4]; for (let k = 0; k < 5; k++) { ctx.strokeStyle = c; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + k * 9, 445); ctx.quadraticCurveTo(x + k * 12 - 10, 445 - 40, x + k * 14 - 18, 445 - 60 - R() * 40); ctx.stroke(); } }
    hazeBand(330, 445, gx.haze, 0.35);
  } else { // pine slopes
    const f = [3, 8, 17], a = [0.55, 0.3, 0.15], ry = x => 372 - 60 * ridge(x, 2.1, f, a);
    ctx.beginPath(); ctx.moveTo(0, 445); for (let x = 0; x <= LP; x += 8) ctx.lineTo(x, ry(x)); ctx.lineTo(LP, 445); ctx.closePath(); ctx.fillStyle = vgrad(300, 445, '#7d93b0', '#4a617f'); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.moveTo(0, 445); for (let x = 0; x <= LP; x += 8) ctx.lineTo(x, ry(x) + 14 + 8 * Math.sin(x * 0.05)); for (let x = LP; x >= 0; x -= 8) ctx.lineTo(x, ry(x)); ctx.fill();
    for (let i = 0; i < 40; i++) { const x = R() * LP; pine(x, ry(x) + 14, 60 + R() * 60, '#1f4a40', false); }
    hazeBand(320, 445, gx.haze, 0.3);
  }
}
function decorNew(wi, x, hv, b, k) {
  const th = WORLDS[wi];
  if (wi === 5) {
    if (hv < 0.4) palm(x, b, 110 + hv * 80, th.deco);
    else if (hv < 0.6) { ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, b); ctx.lineTo(x + 6, b - 78); ctx.stroke(); ctx.fillStyle = ['#e5483a', '#3a8ae0', '#ffd34d'][k % 3]; ctx.beginPath(); ctx.moveTo(x - 40, b - 70); ctx.quadraticCurveTo(x + 6, b - 112, x + 52, b - 70); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 14, b - 90); ctx.quadraticCurveTo(x + 6, b - 100, x + 26, b - 90); ctx.lineTo(x + 6, b - 72); ctx.fill(); }
    else if (hv < 0.8) { ctx.fillStyle = '#e8c97a'; rr(x - 26, b - 34, 52, 34, 3); ctx.fill(); ctx.strokeStyle = '#b89a52'; ctx.lineWidth = 1.5; ctx.stroke(); for (let q = -2; q <= 2; q++) { ctx.fillStyle = '#e8c97a'; ctx.fillRect(x + q * 10 - 3, b - 42, 6, 8); } rr(x - 9, b - 66, 18, 32, 2); ctx.fillStyle = '#e8c97a'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(x - 1, b - 66); ctx.lineTo(x - 1, b - 82); ctx.lineTo(x + 10, b - 77); ctx.lineTo(x - 1, b - 72); ctx.fill(); }
    else { bush(x, b, 0.9, '#3a9a5a', '#66c080'); drawStar(x + 22, b - 6, 7, '#ff8a5a'); }
  } else if (wi === 6) {
    if (hv < 0.45) { for (let i = 0; i < 4; i++) { ctx.strokeStyle = ['#2fa870', '#1f8a5a'][i % 2]; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + i * 10, b); for (let q = 1; q <= 7; q++) ctx.lineTo(x + i * 10 + Math.sin(T * 1.4 + q * 0.8 + i) * 8, b - (60 + hv * 120) * q / 7); ctx.stroke(); } }
    else if (hv < 0.75) { const c = ['#e0605a', '#e89a3a', '#b86ad0', '#f0c84a'][k % 4]; for (let q = 0; q < 6; q++) { ctx.strokeStyle = c; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + q * 8, b); ctx.quadraticCurveTo(x + q * 10 - 14, b - 40, x + q * 12 - 22, b - 56 - hash(k + q) * 30); ctx.stroke(); } }
    else { ell(x, b - 12, 34, 14, 0, '#8a7a5a'); ell(x - 6, b - 18, 22, 9, 0, '#a89868'); circle(x + 16, b - 8, 7, '#e8b04a'); }
  } else {
    if (hv < 0.55) pine(x, b, 100 + hv * 100, '#1f5a4a', false);
    else if (hv < 0.8) { ell(x, b - 10, 30, 12, 0, '#9aa0aa'); ell(x - 8, b - 17, 20, 8, 0, '#fff'); }
    else { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 3, b - 54, 6, 54); rr(x - 24, b - 64, 48, 22, 4); ctx.fillStyle = '#c0883a'; ctx.fill(); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 14, b - 60); ctx.lineTo(x - 6, b - 46); ctx.lineTo(x + 2, b - 60); ctx.fill(); }
  }
}
function groundTopNew(wi, cam) {
  if (wi === 5) { // sand with foam-edged wet strip and shells
    ctx.fillStyle = vgrad(GROUND - 4, GROUND + 14, '#f6e3ad', '#e2c486'); ctx.fillRect(0, GROUND - 4, W, 18);
    ctx.fillStyle = 'rgba(160,120,60,.25)'; ctx.fillRect(0, GROUND + 12, W, 3);
    for (let k = Math.floor(cam / 61) - 1; k < (cam + W) / 61 + 1; k++) { const x = k * 61 - cam + hash(k) * 30, q = hash(k + 5); if (q < 0.35) { ctx.fillStyle = ['#ffd0c0', '#fff', '#f0b8d0'][k % 3]; ctx.beginPath(); ctx.arc(x, GROUND - 1, 5, Math.PI, 0); ctx.fill(); ctx.strokeStyle = 'rgba(120,70,60,.5)'; ctx.lineWidth = 1; for (let i = -3; i <= 3; i += 2) { ctx.beginPath(); ctx.moveTo(x, GROUND - 1); ctx.lineTo(x + i * 1.4, GROUND - 6); ctx.stroke(); } } else if (q < 0.55) drawStar(x, GROUND - 3, 6, '#ff9a6a'); else if (q < 0.7) { ctx.strokeStyle = '#3a8a4a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x - 4, GROUND - 14); ctx.moveTo(x, GROUND); ctx.lineTo(x + 5, GROUND - 16); ctx.stroke(); } }
  } else if (wi === 6) { // seabed with ripples, pebbles and little plants
    ctx.fillStyle = vgrad(GROUND - 4, GROUND + 14, '#e6d296', '#b8a468'); ctx.fillRect(0, GROUND - 4, W, 18);
    ctx.strokeStyle = 'rgba(120,100,50,.35)'; ctx.lineWidth = 2; for (let k = Math.floor(cam / 48) - 1; k < (cam + W) / 48 + 1; k++) { const x = k * 48 - cam; ctx.beginPath(); ctx.arc(x + 20, GROUND + 4, 18, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    for (let k = Math.floor(cam / 53) - 1; k < (cam + W) / 53 + 1; k++) { const x = k * 53 - cam + hash(k) * 30, q = hash(k + 7); if (q < 0.35) ell(x, GROUND - 1, 4 + q * 8, 3, 0, '#9a8a58'); else if (q < 0.65) { ctx.strokeStyle = '#2fa870'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.quadraticCurveTo(x + Math.sin(T * 2 + k) * 4, GROUND - 14, x + 3, GROUND - 26); ctx.stroke(); } }
  } else { // rocky mountain path with snow patches and grass tufts
    // alpine turf over grey rock, short grass, snow drifts that keep their shape, gentians and edelweiss
    ctx.fillStyle = vgrad(GROUND + 6, GROUND + 18, '#8a909a', '#5a606a'); ctx.fillRect(0, GROUND + 6, W, 12);
    ctx.fillStyle = vgrad(GROUND - 5, GROUND + 10, '#8db872', '#527d4c'); ctx.fillRect(0, GROUND - 5, W, 14);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, GROUND + 8, W, 3);
    for (let k = Math.floor(cam / 11) - 1; k < (cam + W) / 11 + 1; k++) {
      const x = k * 11 - cam + hash(k + 3) * 5, hh = 5 + hash(k) * 7; ctx.fillStyle = hash(k + 9) < 0.5 ? '#6f9e5c' : '#a2c884';
      ctx.beginPath(); ctx.moveTo(x, GROUND - 3); ctx.quadraticCurveTo(x + 1.5, GROUND - 3 - hh * 0.6, x + 3 + hash(k + 1) * 3, GROUND - 3 - hh); ctx.lineTo(x + 5, GROUND - 3); ctx.fill();
    }
    for (let k = Math.floor(cam / 97) - 1; k < (cam + W) / 97 + 1; k++) {
      const x = k * 97 - cam + hash(k) * 40, q = hash(k + 4);
      if (q < 0.4) { // snow drift: lumpy mound, lit on top, blue in the shade
        const dw = 26 + hash(k + 8) * 26, dh = 7 + hash(k + 6) * 5;
        ell(x + 3, GROUND + 4, dw, 3, 0, 'rgba(40,60,100,.18)');
        ctx.fillStyle = vgrad(GROUND - dh - 4, GROUND + 4, '#ffffff', '#cddbee'); ctx.beginPath(); ctx.moveTo(x - dw, GROUND + 4);
        ctx.quadraticCurveTo(x - dw * 0.6, GROUND - dh, x - dw * 0.1, GROUND - dh * 0.8); ctx.quadraticCurveTo(x + dw * 0.3, GROUND - dh * 1.3, x + dw, GROUND + 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - dw * 0.6, GROUND - dh * 0.6); ctx.quadraticCurveTo(x - dw * 0.3, GROUND - dh * 0.95, x - dw * 0.1, GROUND - dh * 0.8); ctx.stroke();
      } else if (q < 0.6) { // gentians: deep blue bells
        for (const dx of [-5, 3, 9]) { ctx.strokeStyle = '#4f7a4a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + dx, GROUND - 2); ctx.lineTo(x + dx, GROUND - 9); ctx.stroke(); ctx.fillStyle = '#2f4fc8'; ctx.beginPath(); ctx.moveTo(x + dx - 3, GROUND - 16); ctx.lineTo(x + dx + 3, GROUND - 16); ctx.lineTo(x + dx + 1.6, GROUND - 9); ctx.lineTo(x + dx - 1.6, GROUND - 9); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#6a8af0'; ctx.fillRect(x + dx - 1, GROUND - 16, 1.2, 5); }
      } else if (q < 0.72) { // edelweiss
        ctx.strokeStyle = '#6f9e5c'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, GROUND - 2); ctx.lineTo(x, GROUND - 10); ctx.stroke();
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ell(x + Math.cos(a) * 3.4, GROUND - 13 + Math.sin(a) * 3.4, 2.8, 1.4, a, '#f6f4ea'); } circle(x, GROUND - 13, 1.8, '#e8c84a');
      }
    }
  }
}
function pitNew(wi, sx, p) {
  if (wi === 5) { // tide pool: bright water with ripples
    const wg = ctx.createLinearGradient(0, GROUND - 6, 0, GROUND + 70); wg.addColorStop(0, '#5fd0ea'); wg.addColorStop(1, '#1d6aa8'); ctx.fillStyle = wg; ctx.fillRect(sx, GROUND - 6, p.w, H);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = 0; x <= p.w; x += 8) ctx.lineTo(sx + x, GROUND + 1 + Math.sin(x * 0.12 + T * 4) * 3); ctx.stroke();
  } else if (wi === 7) { // chasm with mist
    const mg = ctx.createLinearGradient(0, GROUND, 0, H); mg.addColorStop(0, 'rgba(225,238,255,.0)'); mg.addColorStop(0.5, 'rgba(225,238,255,.35)'); mg.addColorStop(1, 'rgba(225,238,255,.6)'); ctx.fillStyle = mg; ctx.fillRect(sx, GROUND, p.w, H - GROUND);
  }
}
function platformNew(wi, pl, x, y, w) {
  if (wi === 5) { // driftwood with rope and shells
    rr(x, y, w, 20, 9); ctx.fillStyle = vgrad(y, y + 20, '#c9a46a', '#8a6a3a'); ctx.fill(); ctx.strokeStyle = 'rgba(60,40,20,.5)'; ctx.lineWidth = 1.5; for (let i = 0; i < w / 24; i++) { ctx.beginPath(); ctx.moveTo(x + 12 + i * 24, y + 6); ctx.lineTo(x + 24 + i * 24, y + 8); ctx.stroke(); }
    ctx.strokeStyle = '#d8c090'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 18, y); ctx.lineTo(x + 18, y + 20); ctx.moveTo(x + w - 18, y); ctx.lineTo(x + w - 18, y + 20); ctx.stroke(); drawStar(x + w * 0.5, y - 4, 6, '#ff8a6a');
  } else if (wi === 6) { // coral ledge
    rr(x, y, w, 24, 10); ctx.fillStyle = vgrad(y, y + 24, '#f09a8a', '#c0584a'); ctx.fill(); for (let i = 0; i < w / 20; i++) circle(x + 10 + i * 20, y + 4 + (i % 2) * 3, 5, '#ffc0b0'); for (let i = 0; i < 3; i++) { ctx.strokeStyle = ['#2fa870', '#b86ad0', '#f0c84a'][i]; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 20 + i * (w - 40) / 2, y); ctx.quadraticCurveTo(x + 24 + i * (w - 40) / 2, y - 14, x + 18 + i * (w - 40) / 2, y - 24); ctx.stroke(); }
  } else { // snowy stone slab
    ctx.fillStyle = vgrad(y, y + 26, '#b0b6c0', '#6a707a'); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 6, y + 22); ctx.lineTo(x + 6, y + 24); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(40,50,70,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + 3); ctx.lineTo(x + w * 0.35, y + 20); ctx.moveTo(x + w * 0.7, y + 3); ctx.lineTo(x + w * 0.66, y + 22); ctx.stroke(); rr(x - 3, y - 6, w + 6, 10, 5); ctx.fillStyle = '#fff'; ctx.fill();
  }
}
function foregroundNew(wi, x, b, hv, k) {
  if (wi === 5) { for (let i = 0; i < 5; i++) { ctx.strokeStyle = i % 2 ? '#2a7a4a' : '#3a9a5a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + i * 6, b); ctx.quadraticCurveTo(x + i * 10 - 12, b - 40, x + i * 18 - 34, b - 70 - hv * 20); ctx.stroke(); } }
  else if (wi === 6) { for (let i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(15,100,70,.85)'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + i * 18, b); for (let q = 1; q <= 6; q++) ctx.lineTo(x + i * 18 + Math.sin(T * 1.3 + q * 0.8 + i) * 12, b - (90 + hv * 80) * q / 6); ctx.stroke(); } }
  else { ell(x, b, 90, 34, 0, '#6a707a'); ell(x - 14, b - 14, 56, 16, 0, '#f4f8ff'); }
}
function backdropNew(wi, cam) { // extras behind the parallax layers
  if (wi === 6) { // light shafts from the surface
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const x0 = (i * 190 - cam * 0.05 + 40) % (W + 200) - 60, a = 0.06 + 0.03 * Math.sin(T * 0.7 + i); ctx.fillStyle = `rgba(190,250,255,${a})`; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 50, 0); ctx.lineTo(x0 + 150, 440); ctx.lineTo(x0 + 70, 440); ctx.closePath(); ctx.fill(); } ctx.restore();
  }
}
function ambientNew(wi) {
  if (wi === 5) { // gulls and sparkling sea
    for (let i = 0; i < 3; i++) { const gx = mod(T * (30 + i * 12) + i * 330, W + 80) - 40, gy = 90 + i * 40 + Math.sin(T * 1.3 + i) * 10, fl = Math.sin(T * 7 + i * 2) * 5; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx - 10, gy + fl); ctx.quadraticCurveTo(gx - 4, gy - 6 - fl, gx, gy); ctx.quadraticCurveTo(gx + 4, gy - 6 - fl, gx + 10, gy + fl); ctx.stroke(); }
    for (let i = 0; i < 14; i++) { const m = motes[i]; ctx.globalAlpha = 0.5 * Math.max(0, Math.sin(T * 2 + m.ph * 3)); drawStar(mod(m.x + T * 6, W), 300 + m.r * 80, 3, '#fff'); } ctx.globalAlpha = 1;
  } else if (wi === 6) { // rising bubbles and a school of fish
    for (let i = 0; i < 22; i++) { const m = motes[i], y = H - mod(T * (20 + m.v) + m.y, H + 20), x = m.x + Math.sin(T + m.ph) * 14; ctx.strokeStyle = 'rgba(220,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 2 + m.r * 4, 0, 7); ctx.stroke(); }
    for (let i = 0; i < 7; i++) { const fx = mod(T * 26 + i * 52, W + 120) - 60, fy = 120 + (i % 3) * 22 + Math.sin(T + i) * 8; ctx.fillStyle = 'rgba(255,190,90,.5)'; ctx.beginPath(); ctx.ellipse(fx, fy, 9, 4, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(fx - 8, fy); ctx.lineTo(fx - 15, fy - 4); ctx.lineTo(fx - 15, fy + 4); ctx.fill(); }
  } else { // drifting snow and wind streaks
    for (let i = 0; i < 18; i++) { const m = motes[i]; circle(mod(m.x - T * 40, W + 20), mod(m.y + T * 24, H), 1.4 + m.r * 1.6, 'rgba(255,255,255,.75)'); }
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { const wy = 120 + i * 60, wx = mod(-T * 160 + i * 250, W + 200) - 100; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 40, wy - 8, wx + 80, wy); ctx.stroke(); }
  }
}

function drawSun(gx) {
  if (!gx.sun) return;
  const sx = gx.sun[0], sy = gx.sun[1] + TOD * 70, c0 = gx.sunCol.split(',').map(Number), c = [0, 1, 2].map(i => Math.round(c0[i] + ([255, 120, 60][i] - c0[i]) * TOD * 0.8)).join(',');
  const g = ctx.createRadialGradient(sx, sy, 10, sx, sy, 230); g.addColorStop(0, `rgba(${c},.55)`); g.addColorStop(0.3, `rgba(${c},.18)`); g.addColorStop(1, `rgba(${c},0)`);
  ctx.fillStyle = g; ctx.fillRect(sx - 230, sy - 230, 460, 460);
  circle(sx, sy, 42, `rgba(${c},.95)`); circle(sx, sy, 50, `rgba(${c},.25)`);
}
function godRays(gx) {
  if (!gx.sun) return;
  const [sx, sy] = gx.sun;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const a = 1.75 + (i - 2.5) * 0.17 + Math.sin(T * 0.2 + i) * 0.02 + (sx < W / 2 ? -0.8 : 0.2), w = 0.035 + hash(i) * 0.04;
    const al = 0.05 + 0.03 * Math.sin(T * 0.7 + i * 1.7);
    const g = ctx.createRadialGradient(sx, sy, 20, sx, sy, 520); g.addColorStop(0, `rgba(${gx.sunCol},${al * 2})`); g.addColorStop(1, `rgba(${gx.sunCol},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, 520, a - w, a + w); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function drawVolcano(cx, base, s, col, erupt) {
  const hgt = 230 * s, wid = 300 * s, top = base - hgt;
  const sh = col[0] === '#' && col.length === 7;
  ctx.fillStyle = sh ? hgrad(cx - wid, cx + wid, shade(col, 1.25), col, shade(col, 0.6)) : col; ctx.beginPath(); ctx.moveTo(cx - wid, base);
  ctx.quadraticCurveTo(cx - wid * 0.35, base - hgt * 0.55, cx - wid * 0.16, top); ctx.lineTo(cx + wid * 0.16, top);
  ctx.quadraticCurveTo(cx + wid * 0.35, base - hgt * 0.55, cx + wid, base); ctx.closePath(); ctx.fill();
  if (sh && s > 0.3) { // gullies
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(cx + i * wid * 0.05, top + 10 * s); ctx.quadraticCurveTo(cx + i * wid * 0.16, base - hgt * 0.45, cx + i * wid * 0.3, base); ctx.stroke(); }
    ctx.restore();
  }
  const g = ctx.createRadialGradient(cx, top, 2, cx, top, wid * 0.45);
  g.addColorStop(0, `rgba(255,150,40,${0.45 + 0.35 * erupt})`); g.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, top, wid * 0.45, 0, Math.PI * 2); ctx.fill();
  if (erupt > 0) {
    // molten lakes and lava streams that follow the gullies, with bright blobs flowing down
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx - wid, base); ctx.quadraticCurveTo(cx - wid * 0.35, base - hgt * 0.55, cx - wid * 0.16, top); ctx.lineTo(cx + wid * 0.16, top); ctx.quadraticCurveTo(cx + wid * 0.35, base - hgt * 0.55, cx + wid, base); ctx.closePath(); ctx.clip();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = -2; i <= 2; i++) {
      const x0 = cx + i * wid * 0.05, y0 = top + 6 * s, qx = cx + i * wid * 0.16, qy = base - hgt * 0.45, x1 = cx + i * wid * 0.3, y1 = base, len = hgt * (1.05 + 0.1 * Math.abs(i)) * (0.55 + 0.4 * hash(i + 11)) * (0.6 + 0.4 * Math.min(1, erupt + 0.4));
      const path = () => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(qx, qy, x1, y1); };
      ctx.setLineDash([len, 9999]);
      if (!LOWFX && s > 0.5) { ctx.shadowColor = '#ff5a00'; ctx.shadowBlur = 16 * s; }
      path(); ctx.strokeStyle = 'rgba(110,18,0,.95)'; ctx.lineWidth = (11 - Math.abs(i)) * s; ctx.stroke();
      ctx.shadowBlur = 0; path(); ctx.strokeStyle = '#ff5a14'; ctx.lineWidth = (7 - Math.abs(i) * 0.6) * s; ctx.stroke();
      path(); ctx.strokeStyle = '#ffb030'; ctx.lineWidth = 3.4 * s; ctx.stroke();
      ctx.setLineDash([5 * s, 46 * s]); ctx.lineDashOffset = -T * 46 * s + i * 9; path(); ctx.strokeStyle = 'rgba(255,250,200,.95)'; ctx.lineWidth = 2.6 * s; ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
    ctx.restore();
    // crater: glowing lava lake with bubbles
    const lg = ctx.createRadialGradient(cx, top + 2 * s, 1, cx, top + 2 * s, wid * 0.2); lg.addColorStop(0, '#fff3a0'); lg.addColorStop(0.45, '#ffb030'); lg.addColorStop(1, '#ff4a10');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(cx, top + 2 * s, wid * 0.17, 8 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2 * s; ctx.strokeStyle = '#7a1c00'; ctx.stroke();
    for (let i = 0; i < 4; i++) { const u = (T * 0.8 + i * 0.27) % 1; ctx.globalAlpha = 1 - u; circle(cx + (i - 1.5) * wid * 0.07, top + (1 - u * 0.5) * 3 * s, (1 + u * 4) * s, '#fff0a0'); } ctx.globalAlpha = 1;
    // lava fountain: sparks and glowing bombs arching out of the crater
    for (let i = 0; i < 14; i++) {
      const age = (T * 0.55 + i * 0.173) % 1, dir = hash(i + 3) * 2 - 1, spread = wid * (0.12 + 0.3 * hash(i + 7)), px = cx + dir * spread * age, py = top - Math.sin(age * Math.PI) * (70 + 80 * hash(i + 9)) * s * (0.5 + erupt * 0.5) + age * age * 40 * s;
      ctx.globalAlpha = Math.min(1, (1 - age) * 1.6); circle(px, py, (i % 4 === 0 ? 3.4 : 1.8) * s, i % 3 ? '#ffd24a' : '#ff7a20'); if (i % 4 === 0) circle(px, py, 6 * s, 'rgba(255,120,30,.3)');
    }
    ctx.globalAlpha = 1;
  } else ell(cx, top + 2 * s, wid * 0.16, 6 * s, 0, 'rgba(255,140,60,.6)');
  for (let i = 0; i < 9; i++) {
    const k = ((T * 22 + i * 27) % 240), r = (14 + k * 0.24) * s, a = 0.45 * (1 - k / 240);
    const x = cx + Math.sin(T * 0.7 + i) * 14 * s + k * 0.3 * s, y = top - k * s;
    circle(x, y, r, erupt > 0.3 ? `rgba(58,36,34,${a})` : `rgba(120,120,130,${a})`);
    if (erupt > 0.3 && k < 90) circle(x, y + r * 0.35, r * 0.7, `rgba(255,120,40,${a * 0.35 * (1 - k / 90)})`);
    circle(x - r * 0.3, y - r * 0.3, r * 0.6, erupt > 0.5 ? `rgba(90,60,55,${a * 0.6})` : `rgba(200,200,210,${a * 0.5})`);
  }
}
function drawHills(off, color, base, amp, seed, mesa) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 20; x += mesa ? 10 : 20) {
    const wx = x + off;
    let v = 0.5 * Math.sin(wx * 0.004 + seed) + 0.3 * Math.sin(wx * 0.011 + seed * 2) + 0.2 * Math.sin(wx * 0.023 + seed * 3);
    if (mesa) v = Math.round(v * 3) / 3;
    ctx.lineTo(x, base - amp * v);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

// ---------- near decor (live, parallax 0.5) ----------
function palm(x, b, h, col) {
  const sway = Math.sin(T * 1.2 + x * 0.01) * 0.05, tx = x + 6, ty = b - h;
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) { // segmented trunk
    const u0 = i / 9, u1 = (i + 1) / 9, p = u => [x + 18 * 2 * u * (1 - u) + (6 - 0) * u * u, b - h * u];
    const [x0, y0] = p(u0), [x1, y1] = p(u1);
    ctx.strokeStyle = i % 2 ? shade(col, 1.25) : shade(col, 1.1); ctx.lineWidth = 10 - u0 * 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  const fr = [[-2.9, 0.35], [-2.4, 0.5], [-1.9, 0.2], [-1.25, 0.2], [-0.7, 0.5], [-0.25, 0.35], [-1.57, -0.05]];
  for (const [a, d] of fr) leaf(tx, ty, h * 0.42, a + sway, d, 9, shade(col, 1.35), col, shade(col, 0.7));
  circle(tx - 3, ty + 4, 4, shade(col, 0.7)); circle(tx + 4, ty + 5, 4, shade(col, 0.7));
}
function pine(x, b, h, col, lights) {
  ctx.fillStyle = '#3a2a1e'; ctx.fillRect(x - 5, b - h * 0.18, 10, h * 0.18);
  const sh = col[0] === '#' && col.length === 7;
  for (let i = 0; i < 3; i++) {
    const base = b - h * 0.15 - i * h * 0.24, w = h * 0.42 * (1 - i * 0.22), top = base - h * 0.4;
    ctx.fillStyle = sh ? hgrad(x - w, x + w, shade(col, 1.3), col, shade(col, 0.7)) : col; ctx.beginPath(); ctx.moveTo(x - w, base);
    for (let k = 1; k <= 4; k++) ctx.lineTo(x - w + k * w * 0.5, base + (k % 2 ? -5 : 0)); // scalloped bottom
    ctx.lineTo(x + w, base); ctx.lineTo(x, top); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.moveTo(x - w * 0.42, top + h * 0.17); ctx.lineTo(x, top); ctx.lineTo(x + w * 0.42, top + h * 0.17); ctx.quadraticCurveTo(x, top + h * 0.1, x - w * 0.42, top + h * 0.17); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(x - w * 0.5, base - 3, w * 0.4, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    if (lights) for (let k = 0; k < 4; k++) { const u = (k + 0.5) / 4; const on = Math.sin(T * 3 + k * 2 + i + x) > -0.3, lx = x - w * 0.8 + u * w * 1.6, ly = base - 4 - Math.abs(u - 0.5) * 8; const c = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff'][k]; if (on) circle(lx, ly, 6, c.replace('#', '#') + '55'); circle(lx, ly, 3, on ? c : '#555'); }
  }
  if (lights) { ctx.fillStyle = '#ffd740'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rad = i % 2 ? 4 : 9; ctx.lineTo(x + Math.cos(a) * rad, b - h * 0.87 + Math.sin(a) * rad); } ctx.fill(); }
}
function cactus(x, b, h, col, seed = 0) {
  const sh = col[0] === '#' && col.length === 7;
  const fill = (x0, w) => sh ? hgrad(x0, x0 + w, shade(col, 1.35), col, shade(col, 0.7)) : col;
  rr(x - 28, b - h * 0.75, 12, h * 0.35, 6); ctx.fillStyle = fill(x - 28, 12); ctx.fill(); rr(x - 28, b - h * 0.45, 28, 11, 5); ctx.fill();
  rr(x + 16, b - h * 0.6, 12, h * 0.3, 6); ctx.fillStyle = fill(x + 16, 12); ctx.fill(); rr(x, b - h * 0.34, 28, 11, 5); ctx.fill();
  rr(x - 9, b - h, 18, h, 9); ctx.fillStyle = fill(x - 9, 18); ctx.fill();
  if (sh) {
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 3, b - h + 6); ctx.lineTo(x - 3, b); ctx.moveTo(x + 3, b - h + 6); ctx.lineTo(x + 3, b); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,230,.7)'; for (let k = 0; k < 6; k++) ctx.fillRect(x - 8 + (k % 2) * 15, b - h + 10 + k * h * 0.14, 2, 2);
    if (hash(seed * 7.31 + h) > 0.5) { circle(x, b - h - 1, 5, '#ff6f91'); circle(x, b - h - 1, 2, '#ffd166'); }
  }
}
function deadTree(x, b, h, col) {
  ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(x - 6, b); ctx.quadraticCurveTo(x + 6, b - h * 0.5, x + 4, b - h); ctx.stroke(); ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x + 2, b - h * 0.55); ctx.quadraticCurveTo(x - 12, b - h * 0.62, x - 24, b - h * 0.8); ctx.moveTo(x + 3, b - h * 0.7); ctx.quadraticCurveTo(x + 16, b - h * 0.75, x + 26, b - h * 0.95); ctx.moveTo(x + 4, b - h); ctx.lineTo(x - 8, b - h * 1.15); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 24, b - h * 0.8); ctx.lineTo(x - 34, b - h * 0.84); ctx.moveTo(x + 26, b - h * 0.95); ctx.lineTo(x + 32, b - h * 1.05); ctx.stroke();
  ctx.strokeStyle = `rgba(255,110,30,${0.25 + 0.2 * Math.sin(T * 2 + x)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 2, b - 4); ctx.lineTo(x + 1, b - h * 0.3); ctx.stroke();
}
function bush(x, b, s, c1, c2) {
  for (let i = 0; i < 5; i++) { const px = x + (i - 2) * 14 * s, r = (16 + (i % 2) * 6) * s; circle(px, b - r * 0.7, r, i % 2 ? c1 : c2); }
  for (let i = 0; i < 3; i++) leaf(x + (i - 1) * 16 * s, b - 20 * s, 26 * s, -1.57 + (i - 1) * 0.7, 0.3, 6 * s, c2, c1);
}
function snowman(x, b) {
  circle(x, b - 18, 20, '#f4f8ff'); circle(x, b - 48, 15, '#f4f8ff'); circle(x, b - 72, 11, '#f4f8ff');
  circle(x + 4, b - 22, 20, 'rgba(120,150,200,.0)');
  ell(x + 5, b - 14, 14, 10, 0, 'rgba(120,150,200,.22)');
  circle(x - 3, b - 74, 1.8, '#222'); circle(x + 4, b - 74, 1.8, '#222');
  ctx.fillStyle = '#ff8f3a'; ctx.beginPath(); ctx.moveTo(x, b - 71); ctx.lineTo(x + 14, b - 69); ctx.lineTo(x, b - 67); ctx.fill();
  rr(x - 14, b - 62, 28, 6, 3); ctx.fillStyle = '#d63a3a'; ctx.fill(); ctx.fillRect(x + 6, b - 60, 6, 14);
  ctx.fillStyle = '#222'; ctx.fillRect(x - 10, b - 86, 20, 6); ctx.fillRect(x - 7, b - 100, 14, 15);
  ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 13, b - 50); ctx.lineTo(x - 32, b - 64); ctx.moveTo(x + 13, b - 50); ctx.lineTo(x + 30, b - 62); ctx.stroke();
}
function fossil(x, b) {
  ctx.strokeStyle = 'rgba(250,235,210,.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, b - 4, 30, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  for (let i = 0; i < 6; i++) { const a = Math.PI * 1.2 + i * 0.12; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 30, b - 4 + Math.sin(a) * 30); ctx.lineTo(x + Math.cos(a) * 18, b - 4 + Math.sin(a) * 18 + 6); ctx.stroke(); }
  ell(x + 30, b - 14, 10, 6, 0.3, 'rgba(250,235,210,.75)'); circle(x + 32, b - 15, 2, 'rgba(90,40,20,.8)');
}
function vent(x, b, k) {
  ell(x, b - 6, 22, 10, 0, '#241614'); ell(x, b - 9, 10, 4, 0, `rgba(255,120,30,${0.6 + 0.4 * Math.sin(T * 3 + k)})`);
  for (let i = 0; i < 4; i++) { const u = (T * 0.6 + i / 4 + hash(k)) % 1; circle(x + Math.sin(u * 6 + k) * 8, b - 12 - u * 70, 6 + u * 14, `rgba(80,60,60,${0.35 * (1 - u)})`); }
}
function drawDecor(wi, off) {
  const th = WORLDS[wi], gx = GFX[wi], sp = 210;
  for (let k = Math.floor(off / sp) - 1; k < (off + W) / sp + 1; k++) {
    const x = k * sp - off + hash(k) * 110, hv = hash(k + 50), b = 430;
    if (wi >= 5) { decorNew(wi, x, hv, b, k); continue; }
    if (wi === 0) { if (hv < 0.55) palm(x, b, 110 + hv * 90, th.deco); else { bush(x, b, 1, shade(th.deco, 1.2), shade(th.deco, 1.5)); if (hv > 0.85) { circle(x - 12, b - 30, 4, '#ff5a8a'); circle(x + 10, b - 36, 4, '#ffd166'); } } }
    else if (wi === 1) { if (hv < 0.5) cactus(x, b, 60 + hv * 60, '#5f7a2a', k); else if (hv < 0.8) { const h = 90 + hv * 60; ctx.fillStyle = hgrad(x - 20, x + 20, gx.midHi, th.deco, shade(th.deco, 0.7)); rr(x - 18, b - h, 36, h + 10, 8); ctx.fill(); ell(x, b - h, 22, 7, 0, shade(th.deco, 0.8)); ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 2; for (let y = b - h + 14; y < b; y += 16) { ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y); ctx.stroke(); } } else { ell(x, b - 8, 34, 16, 0, shade(th.deco, 1.2)); fossil(x, b - 4); } }
    else if (wi === 2) { if (hv > 0.88) snowman(x, b); else pine(x, b, 120 + hv * 80, th.deco, hv < 0.35); }
    else { if (hv < 0.55) deadTree(x, b, 80 + hv * 70, '#1a0808'); else vent(x, b, k); }
  }
}
const LMARKS = { 0: ['fall', 'ribs'], 1: ['skull', 'ruin'], 2: ['mammoth', 'icecave'], 3: ['lavafall', 'ribs'], 5: ['nest', 'seaarch'], 6: ['ammonite', 'clam', 'coralarch'], 7: ['temple', 'tower'] };
function drawLandmarks(wi, off) { // one-off set pieces that make a level feel like a place
  const list = LMARKS[wi]; if (!list) return; const sp = 2800;
  for (let k = Math.floor(off / sp) - 1; k < (off + W) / sp + 1; k++) {
    const hv = hash(k + 700 + wi * 13); if (hv < 0.2) continue;
    const x = k * sp + 500 + hash(k + 701) * 900 - off; if (x < -260 || x > W + 260) continue;
    ctx.save(); ctx.globalAlpha = 0.93; landmark(list[Math.min(list.length - 1, Math.floor((hv - 0.2) / 0.8 * list.length))], wi, x, 432); ctx.restore();
  }
}
function landmark(t, wi, x, b) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const bone = wi === 3 ? '#7a5e54' : '#efe4c8', bd = wi === 3 ? '#2a1a16' : '#a89878';
  if (t === 'fall' || t === 'lavafall') {
    const lava = t === 'lavafall';
    ctx.fillStyle = vgrad(b - 230, b, lava ? '#3a2622' : '#6f8a7a', lava ? '#150c0a' : '#3f5a50'); ctx.beginPath(); ctx.moveTo(x - 90, b); ctx.lineTo(x - 72, b - 190); ctx.quadraticCurveTo(x - 40, b - 240, x, b - 232); ctx.quadraticCurveTo(x + 50, b - 236, x + 82, b - 200); ctx.lineTo(x + 100, b); ctx.closePath(); ctx.fill();
    ell(x, b - 230, 62, 10, 0, lava ? '#2a1a16' : '#4a9a4a');
    const wg = ctx.createLinearGradient(0, b - 226, 0, b); if (lava) { wg.addColorStop(0, '#fff3a0'); wg.addColorStop(0.4, '#ffa020'); wg.addColorStop(1, '#ff4a00'); } else { wg.addColorStop(0, 'rgba(210,244,255,.95)'); wg.addColorStop(1, 'rgba(120,200,232,.75)'); }
    ctx.save(); if (lava) { ctx.shadowColor = '#ff5a00'; ctx.shadowBlur = 18; } ctx.fillStyle = wg; ctx.fillRect(x - 16, b - 226, 32, 226); ctx.restore();
    ctx.strokeStyle = lava ? 'rgba(255,255,200,.7)' : 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5; for (let i = 0; i < 5; i++) { const q = (T * 0.7 + i / 5) % 1, x2 = x - 11 + i * 5.5, y2 = b - 226 + q * 190; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2, y2 + 30); ctx.stroke(); }
    ell(x, b + 1, 64, 8, 0, lava ? 'rgba(255,100,20,.7)' : 'rgba(130,205,235,.7)'); for (let i = 0; i < 4; i++) circle(x - 32 + i * 21 + Math.sin(T * 2 + i) * 4, b - 6 - Math.abs(Math.sin(T * 3 + i)) * 4, 12 - (i % 2) * 4, lava ? 'rgba(255,170,80,.4)' : 'rgba(255,255,255,.5)');
  } else if (t === 'ribs') {
    ctx.strokeStyle = bone; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - 110, b - 14); ctx.quadraticCurveTo(x, b - 84, x + 100, b - 20); ctx.stroke();
    for (let i = 0; i < 7; i++) { const u = (i + 0.5) / 7.5, sx = x - 110 + u * 210, sy = (1 - u) * (1 - u) * (b - 14) + 2 * u * (1 - u) * (b - 84) + u * u * (b - 20); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + (i - 3) * 2 - 16, sy + 22, sx + (i - 3) * 3 - 4, b - 2); ctx.stroke(); }
    ell(x + 120, b - 20, 24, 14, -0.2, bone); ell(x + 128, b - 10, 22, 6, 0, bone); circle(x + 124, b - 25, 4.5, bd); ctx.fillStyle = bone; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 118 + i * 6, b - 12); ctx.lineTo(x + 121 + i * 6, b - 4); ctx.lineTo(x + 124 + i * 6, b - 12); ctx.fill(); }
  } else if (t === 'skull') {
    ell(x + 10, b + 2, 112, 13, 0, '#c98a55'); ctx.fillStyle = vgrad(b - 84, b, '#fff6dc', bone, '#c8b898'); ctx.beginPath(); ctx.moveTo(x - 70, b); ctx.bezierCurveTo(x - 76, b - 60, x - 30, b - 86, x + 20, b - 72); ctx.bezierCurveTo(x + 60, b - 64, x + 100, b - 42, x + 106, b); ctx.closePath(); ctx.fill(); ctx.strokeStyle = bd; ctx.lineWidth = 2.5; ctx.stroke();
    ell(x - 8, b - 46, 15, 17, 0, '#2a1e14'); circle(x + 88, b - 34, 4, bd); ctx.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(x - 6 + i * 13, b); ctx.lineTo(x + i * 13, b - 15); ctx.lineTo(x + 6 + i * 13, b); ctx.fill(); }
  } else if (t === 'ruin') {
    for (const [dx, h] of [[-52, 120], [0, 172], [54, 88]]) { ctx.fillStyle = hgrad(x + dx - 14, x + dx + 14, '#e8b080', '#c98558', '#8e5836'); ctx.beginPath(); ctx.moveTo(x + dx - 14, b); ctx.lineTo(x + dx - 14, b - h + 10); ctx.lineTo(x + dx - 4, b - h); ctx.lineTo(x + dx + 3, b - h + 12); ctx.lineTo(x + dx + 14, b - h + 4); ctx.lineTo(x + dx + 14, b); ctx.fill(); ctx.strokeStyle = 'rgba(90,40,15,.35)'; ctx.lineWidth = 2; for (let y = b - h + 26; y < b; y += 30) { ctx.beginPath(); ctx.moveTo(x + dx - 14, y); ctx.lineTo(x + dx + 14, y); ctx.stroke(); } }
    ctx.fillStyle = '#d9a070'; ctx.fillRect(x - 70, b - 190, 90, 16); ctx.strokeStyle = 'rgba(90,40,15,.4)'; ctx.lineWidth = 2; ctx.strokeRect(x - 70, b - 190, 90, 16); ell(x + 90, b - 4, 26, 8, 0, '#c98558');
  } else if (t === 'mammoth') {
    rr(x - 92, b - 150, 184, 150, 18); ctx.fillStyle = vgrad(b - 150, b, 'rgba(215,242,255,.95)', 'rgba(120,170,222,.95)'); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(80,52,36,.78)'; ctx.beginPath(); ctx.ellipse(x - 6, b - 70, 52, 34, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 48, b - 82, 22, 24, 0, 0, 7); ctx.fill(); for (const lx of [-30, -10, 16, 34]) ctx.fillRect(x + lx - 6, b - 46, 12, 36);
    ctx.strokeStyle = 'rgba(80,52,36,.78)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x + 62, b - 70); ctx.quadraticCurveTo(x + 74, b - 40, x + 62, b - 28); ctx.stroke(); ctx.strokeStyle = 'rgba(255,250,230,.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 56, b - 64); ctx.quadraticCurveTo(x + 80, b - 60, x + 80, b - 84); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 70, b - 130); ctx.lineTo(x - 50, b - 100); ctx.moveTo(x + 60, b - 136); ctx.lineTo(x + 76, b - 112); ctx.stroke();
  } else if (t === 'icecave') {
    ctx.fillStyle = vgrad(b - 200, b, '#e4f6ff', '#9ccaf0', '#5c8ec4'); ctx.beginPath(); ctx.moveTo(x - 112, b); ctx.lineTo(x - 100, b - 112); ctx.quadraticCurveTo(x, b - 212, x + 100, b - 112); ctx.lineTo(x + 112, b); ctx.lineTo(x + 62, b); ctx.lineTo(x + 62, b - 80); ctx.quadraticCurveTo(x, b - 142, x - 62, b - 80); ctx.lineTo(x - 62, b); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, b - 50, 4, x, b - 50, 70); g.addColorStop(0, `rgba(120,230,255,${0.5 + 0.15 * Math.sin(T * 2)})`); g.addColorStop(1, 'rgba(120,230,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - 70, b - 130, 140, 140); ctx.restore();
    ctx.fillStyle = 'rgba(220,244,255,.95)'; for (let i = 0; i < 6; i++) { const ix = x - 48 + i * 19, top = b - 96 - Math.sin((i + 0.5) / 6 * Math.PI) * 38 + 26; ctx.beginPath(); ctx.moveTo(ix - 4, top); ctx.lineTo(ix + 4, top); ctx.lineTo(ix, top + 14 + (i % 2) * 8); ctx.fill(); }
  } else if (t === 'nest') { // a giant dinosaur nest on the dunes, one egg hatching
    ell(x, b - 4, 96, 17, 0, '#7a5230'); ell(x, b - 10, 84, 12, 0, '#9a6a3a'); ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = 3; for (let i = 0; i < 24; i++) { const a = Math.PI * (0.02 + i / 24 * 0.96); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 80, b - 10 + Math.sin(a) * 11); ctx.lineTo(x + Math.cos(a + 0.5) * 96, b - 4 + Math.sin(a + 0.5) * 16); ctx.stroke(); }
    drawEgg(x - 44, b - 38, 27, '#f6e7b0', '#6aa84f', 0, -0.2); drawEgg(x - 4, b - 42, 29, '#f2e0a8', '#c0883a', 0, 0.1);
    ctx.fillStyle = '#f6e7b0'; ctx.strokeStyle = '#8a7a50'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 22, b - 30); for (let i = 0; i <= 6; i++) ctx.lineTo(x + 22 + i * 8, b - 30 - (i % 2 ? 10 : 0)); ctx.quadraticCurveTo(x + 76, b - 8, x + 46, b - 4); ctx.quadraticCurveTo(x + 22, b - 8, x + 22, b - 30); ctx.fill(); ctx.stroke();
    const bob = Math.sin(T * 2) * 2; circle(x + 46, b - 40 + bob, 14, '#7fd08a'); circle(x + 39, b - 43 + bob, 4.6, '#fff'); circle(x + 52, b - 43 + bob, 4.6, '#fff'); circle(x + 40, b - 43 + bob, 2.2, '#222'); circle(x + 53, b - 43 + bob, 2.2, '#222'); ctx.strokeStyle = '#2d6b36'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x + 46, b - 36 + bob, 5, 0.2, 2.9); ctx.stroke();
  } else if (t === 'seaarch') { // a sandstone arch on the shore
    ctx.fillStyle = vgrad(b - 190, b, '#e6b078', '#c98558', '#9a5a38'); ctx.beginPath(); ctx.moveTo(x - 118, b); ctx.lineTo(x - 108, b - 100); ctx.quadraticCurveTo(x - 80, b - 190, x, b - 186); ctx.quadraticCurveTo(x + 82, b - 190, x + 108, b - 96); ctx.lineTo(x + 120, b); ctx.lineTo(x + 66, b); ctx.lineTo(x + 62, b - 84); ctx.quadraticCurveTo(x, b - 138, x - 62, b - 84); ctx.lineTo(x - 66, b); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(90,40,15,.4)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(90,40,15,.25)'; ctx.lineWidth = 2; for (const yy of [-150, -120, -92]) { ctx.beginPath(); ctx.moveTo(x - 100, b + yy + 40); ctx.quadraticCurveTo(x, b + yy - 10, x + 100, b + yy + 40); ctx.stroke(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, b - 50, 4, x, b - 50, 60); g.addColorStop(0, 'rgba(255,240,180,.4)'); g.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = g; ctx.fillRect(x - 60, b - 110, 120, 110); ctx.restore(); ell(x, b + 1, 130, 9, 0, 'rgba(255,255,255,.35)'); palm(x - 70, b - 160, 44, '#2a7a4a');
  } else if (t === 'ammonite') { // a giant spiral shell standing on the sea floor, its owner peeking out
    const cx = x, cy = b - 70; ctx.fillStyle = vgrad(cy - 66, cy + 66, '#f2d6a2', '#d6a468', '#a8703c'); ctx.beginPath(); ctx.arc(cx, cy, 66, 0, 7); ctx.fill(); ctx.strokeStyle = '#6a4220'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(106,66,32,.55)'; ctx.lineWidth = 2.6; for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44); ctx.lineTo(cx + Math.cos(a + 0.08) * 64, cy + Math.sin(a + 0.08) * 64); ctx.stroke(); }
    ctx.strokeStyle = '#7a4a24'; ctx.lineWidth = 3.4; ctx.beginPath(); for (let a = 0; a < Math.PI * 5.2; a += 0.12) { const r = 4 + a * 3.6; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.stroke(); ell(cx - 18, cy - 28, 20, 8, -0.6, 'rgba(255,255,255,.25)');
    ctx.fillStyle = '#e8785a'; ctx.beginPath(); ctx.ellipse(cx + 54, cy + 38, 20, 15, 0.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#8a3a22'; ctx.lineWidth = 2.4; ctx.stroke(); circle(cx + 58, cy + 33, 5, '#fff'); circle(cx + 59.5, cy + 33, 2.6, '#111'); ctx.strokeStyle = '#e8785a'; ctx.lineWidth = 4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx + 62 + i * 3, cy + 46); ctx.quadraticCurveTo(cx + 70 + i * 6 + Math.sin(T * 2 + i) * 5, cy + 62, cx + 66 + i * 8 + Math.sin(T * 2.4 + i) * 6, b - 4); ctx.stroke(); }
  } else if (t === 'coralarch') { // a living arch of colourful coral
    for (const [c1, c2, off] of [['#c0584a', '#f09a8a', 0], ['#a04a90', '#d68ad0', 9]]) { ctx.strokeStyle = c1; ctx.lineWidth = 30 - off; ctx.beginPath(); ctx.moveTo(x - 86 + off, b); ctx.bezierCurveTo(x - 94 + off, b - 150, x + 94 - off, b - 150, x + 86 - off, b); ctx.stroke(); ctx.strokeStyle = c2; ctx.lineWidth = 8; ctx.stroke(); }
    for (let i = 0; i < 16; i++) { const u = i / 15, px = (1 - u) * (1 - u) * (1 - u) * (x - 86) + 3 * (1 - u) * (1 - u) * u * (x - 94) + 3 * (1 - u) * u * u * (x + 94) + u * u * u * (x + 86), py = (1 - u) * (1 - u) * (1 - u) * b + 3 * (1 - u) * (1 - u) * u * (b - 150) + 3 * (1 - u) * u * u * (b - 150) + u * u * u * b; ctx.strokeStyle = ['#ffc94a', '#ff8a5a', '#8ad0f0', '#f0a0d0'][i % 4]; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px, py - 12); ctx.quadraticCurveTo(px + Math.sin(T * 1.6 + i) * 4, py - 24, px + (i % 2 ? 8 : -8), py - 30 - (i % 3) * 6); ctx.stroke(); circle(px + (i % 2 ? 8 : -8), py - 31 - (i % 3) * 6, 3, ctx.strokeStyle); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, b - 60, 4, x, b - 60, 70); g.addColorStop(0, 'rgba(190,250,255,.35)'); g.addColorStop(1, 'rgba(190,250,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - 70, b - 130, 140, 140); ctx.restore();
  } else if (t === 'ship') {
    const sea = wi === 6; ctx.save(); ctx.translate(x, b); ctx.rotate(-0.12);
    ctx.fillStyle = vgrad(-60, 0, '#8a6238', '#4e3420'); ctx.beginPath(); ctx.moveTo(-96, -54); ctx.quadraticCurveTo(-84, 0, -30, 2); ctx.lineTo(54, 2); ctx.quadraticCurveTo(104, -12, 104, -66); ctx.lineTo(60, -50); ctx.lineTo(-60, -48); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2a190c'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.6; for (const yy of [-38, -24, -10]) { ctx.beginPath(); ctx.moveTo(-80 + (yy + 38) * 0.4, yy); ctx.lineTo(96 - (yy + 38) * 0.2, yy); ctx.stroke(); }
    for (const px of [-40, -8, 24]) { circle(px, -30, 6, '#2a190c'); circle(px, -30, 4, sea ? '#5ad0e0' : '#9ad8ee'); }
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(-5, -176, 9, 130); ctx.fillStyle = 'rgba(244,236,214,.92)'; ctx.beginPath(); ctx.moveTo(4, -170); ctx.lineTo(54, -150 + Math.sin(T * 1.6) * 3); ctx.lineTo(44, -118); ctx.lineTo(54, -92 + Math.sin(T * 1.6) * 3); ctx.lineTo(4, -80); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.stroke();
    if (sea) { ctx.strokeStyle = '#2fa870'; ctx.lineWidth = 4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-70 + i * 40, -48); ctx.lineTo(-70 + i * 40 + Math.sin(T * 1.4 + i) * 6, -70 - i % 2 * 12); ctx.stroke(); } }
    ctx.restore();
  } else if (t === 'lighthouse') {
    ell(x, b - 2, 50, 12, 0, '#8a8a80'); ctx.beginPath(); ctx.moveTo(x - 26, b - 6); ctx.lineTo(x - 15, b - 170); ctx.lineTo(x + 15, b - 170); ctx.lineTo(x + 26, b - 6); ctx.closePath(); ctx.fillStyle = '#fafafa'; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = '#e53935'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 40, b - 150 + i * 56 - 20, 80, 24); ctx.restore(); ctx.beginPath(); ctx.moveTo(x - 26, b - 6); ctx.lineTo(x - 15, b - 170); ctx.lineTo(x + 15, b - 170); ctx.lineTo(x + 26, b - 6); ctx.closePath(); ctx.strokeStyle = '#7a1f1f'; ctx.lineWidth = 2; ctx.stroke();
    rr(x - 17, b - 192, 34, 24, 4); ctx.fillStyle = '#ffe27a'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(x - 22, b - 192); ctx.lineTo(x, b - 214); ctx.lineTo(x + 22, b - 192); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const dir = Math.sin(T * 0.8) > 0 ? 1 : -1, lw = Math.abs(Math.sin(T * 0.8)); ctx.fillStyle = `rgba(255,240,170,${0.22 * lw})`; ctx.beginPath(); ctx.moveTo(x, b - 180); ctx.lineTo(x + dir * 300, b - 214); ctx.lineTo(x + dir * 300, b - 150); ctx.fill(); ctx.restore();
  } else if (t === 'clam') {
    ell(x, b - 12, 70, 20, 0, '#e8b4c4'); ell(x, b - 8, 62, 14, 0, '#f6d6de'); const op = 0.55 + Math.sin(T * 0.8) * 0.06;
    ctx.save(); ctx.translate(x - 62, b - 22); ctx.rotate(-op); ctx.fillStyle = vgrad(-70, 0, '#f4c4d0', '#d68aa0'); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(10, -90, 130, -90, 132, 0); ctx.quadraticCurveTo(66, 12, 0, 0); ctx.fill(); ctx.strokeStyle = '#9a4a64'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.beginPath(); for (let i = 1; i < 6; i++) { ctx.moveTo(66, 6); ctx.lineTo(i * 22 + 2, -60 + Math.abs(i - 3) * 14); } ctx.strokeStyle = 'rgba(154,74,100,.5)'; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, b - 36, 2, x, b - 36, 54); g.addColorStop(0, `rgba(255,255,255,${0.7 + 0.2 * Math.sin(T * 3)})`); g.addColorStop(1, 'rgba(255,200,240,0)'); ctx.fillStyle = g; ctx.fillRect(x - 54, b - 92, 108, 108); ctx.restore(); circle(x, b - 34, 11, '#fff'); circle(x - 3, b - 37, 3.4, 'rgba(255,255,255,.95)');
  } else if (t === 'temple') {
    for (let i = 0; i < 4; i++) { const w2 = 210 - i * 44, y2 = b - (i + 1) * 36; rr(x - w2 / 2, y2, w2, 38, 3); ctx.fillStyle = vgrad(y2, y2 + 38, '#aeb6c4', '#79829a'); ctx.fill(); ctx.strokeStyle = 'rgba(30,40,60,.45)'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x - w2 / 2 + 4, y2, w2 - 8, 5); }
    ctx.fillStyle = '#17141e'; ctx.beginPath(); ctx.moveTo(x - 16, b); ctx.lineTo(x - 16, b - 36); ctx.quadraticCurveTo(x, b - 54, x + 16, b - 36); ctx.lineTo(x + 16, b); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, b - 158, 2, x, b - 158, 36); g.addColorStop(0, `rgba(120,240,255,${0.6 + 0.2 * Math.sin(T * 2.4)})`); g.addColorStop(1, 'rgba(120,240,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - 36, b - 194, 72, 72); ctx.restore(); circle(x, b - 158, 6, '#bff8ff');
    ctx.strokeStyle = '#3f8a4a'; ctx.lineWidth = 3; for (const vx of [-86, -40, 62]) { ctx.beginPath(); ctx.moveTo(x + vx, b - 70); ctx.quadraticCurveTo(x + vx + 6, b - 50, x + vx - 2, b - 30); ctx.stroke(); }
  } else if (t === 'tower') {
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 7; for (const dx of [-34, 34]) { ctx.beginPath(); ctx.moveTo(x + dx, b); ctx.lineTo(x + dx * 0.6, b - 130); ctx.stroke(); } ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 34, b); ctx.lineTo(x + 20, b - 100); ctx.moveTo(x + 34, b); ctx.lineTo(x - 20, b - 100); for (const yy of [b - 50, b - 100]) { ctx.moveTo(x - 30 + (b - yy) * 0.1, yy); ctx.lineTo(x + 30 - (b - yy) * 0.1, yy); } ctx.stroke();
    rr(x - 34, b - 142, 68, 14, 3); ctx.fillStyle = '#8a6038'; ctx.fill(); ctx.strokeStyle = '#3e2a17'; ctx.lineWidth = 2; ctx.stroke(); rr(x - 26, b - 184, 52, 44, 3); ctx.fillStyle = '#b98a54'; ctx.fill(); ctx.stroke(); rr(x - 8, b - 172, 16, 18, 2); ctx.fillStyle = '#ffe27a'; ctx.fill();
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(x - 36, b - 182); ctx.lineTo(x, b - 214); ctx.lineTo(x + 36, b - 182); ctx.fill(); ctx.strokeStyle = '#6b1d14'; ctx.stroke(); ctx.fillStyle = '#ffd34d'; ctx.fillRect(x - 1.5, b - 236, 3, 24); ctx.beginPath(); ctx.moveTo(x + 1, b - 236); ctx.lineTo(x + 20 + Math.sin(T * 5) * 3, b - 230); ctx.lineTo(x + 1, b - 222); ctx.fill();
  }
}
function drawBackground(wi, cam) {
  const th = WORLDS[wi], gx = GFX[wi];
  ctx.fillStyle = vgrad(0, 445, gx.sky[0], gx.sky[1], gx.sky[2]); ctx.fillRect(0, 0, W, H);
  if (th.stars || wi === 3) { for (let i = 0; i < 80; i++) { ctx.globalAlpha = (wi === 3 ? 0.25 : 0.4) + 0.6 * Math.abs(Math.sin(T * 1.5 + i)); circle(hash(i) * W, hash(i + 99) * 240, hash(i + 5) < 0.15 ? 1.8 : 1.1, '#fff'); } ctx.globalAlpha = 1; }
  if (wi === 2) {
    const g = ctx.createRadialGradient(150, 90, 20, 150, 90, 120); g.addColorStop(0, 'rgba(240,240,220,.35)'); g.addColorStop(1, 'rgba(240,240,220,0)'); ctx.fillStyle = g; ctx.fillRect(30, 0, 240, 210);
    circle(150, 90, 30, '#f4f1de'); circle(141, 84, 5, 'rgba(0,0,0,.08)'); circle(156, 99, 4, 'rgba(0,0,0,.08)'); circle(162, 82, 26, gx.sky[0]);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let b = 0; b < 3; b++) { ctx.strokeStyle = `rgba(${b ? '90,255,170' : '90,190,255'},${0.12 + 0.07 * Math.sin(T + b)})`; ctx.lineWidth = 34 - b * 8; ctx.beginPath(); for (let x = -20; x <= W + 20; x += 24) ctx.lineTo(x, 80 + b * 26 + Math.sin(x * 0.01 + T * 0.6 + b) * 25); ctx.stroke(); }
    ctx.restore();
  }
  drawSun(gx);
  drawClouds(wi, cam);
  if (wi >= 5) backdropNew(wi, cam); else if (wi === 0 || wi === 3) drawVolcano(740, 345, th.volcS, th.volcCol, wi === 3 ? 1 : 0); // the volcano belongs to the jungle and its own world only
  const Ls = getLayers(wi);
  drawLayer(Ls.far, cam * 0.1);
  drawFarLife(wi, cam);
  if (wi <= 1) godRays(gx);
  drawLayer(Ls.mid, cam * 0.25);
  ctx.fillStyle = vgrad(330, 440, `rgba(${gx.haze},0)`, `rgba(${gx.haze},${wi === 3 ? 0.12 : 0.22})`); ctx.fillRect(0, 330, W, 110);
  drawLandmarks(wi, cam * 0.5);
  drawDecor(wi, cam * 0.5);
}
function supported(L, x) { for (const p of L.pits) if (x - 35 > p.x && x + 35 < p.x + p.w) return false; return true; }
function drawGround(wi, L, cam) {
  const th = WORLDS[wi], gx = GFX[wi];
  ctx.fillStyle = vgrad(GROUND, H, gx.g[0], gx.g[1]); ctx.fillRect(0, GROUND, W, H - GROUND);
  // strata
  ctx.lineWidth = 3;
  for (let s = 0; s < 3; s++) {
    const y0 = GROUND + 34 + s * 26; ctx.strokeStyle = s % 2 ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.06)'; ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 20) { const wx = x + cam; ctx.lineTo(x, y0 + Math.sin(wx * 0.013 + s * 2) * 4 + Math.sin(wx * 0.041 + s) * 2); }
    ctx.stroke();
  }
  // stones / embedded bits
  for (let k = Math.floor(cam / 46) - 1; k < (cam + W) / 46 + 1; k++) {
    const h1 = hash(k), x = k * 46 - cam + h1 * 30, y = GROUND + 26 + hash(k + 7) * 66, r = 4 + h1 * 7;
    if (th.lava) { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(T * 2 + k); ctx.strokeStyle = '#ff5a1f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - r * 2, y); ctx.lineTo(x - r * 0.5, y - 3); ctx.lineTo(x + r, y + 2); ctx.lineTo(x + r * 2.5, y - 1); ctx.stroke(); ctx.globalAlpha = 1; }
    else pebble(x, y, r * 1.3, r, k, shade(gx.stone, 0.8));
    if (wi === 1 && h1 > 0.8) fossilBone(x + 12, y + 8);
  }
  groundDepth(wi, cam, gx);
  // top surface
  if (wi >= 5) groundTopNew(wi, cam);
  else if (wi === 0) {
    ctx.fillStyle = vgrad(GROUND - 4, GROUND + 14, '#5cc94a', '#2f7a2c'); ctx.fillRect(0, GROUND - 4, W, 16);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0, GROUND + 12, W, 4);
    for (let k = Math.floor(cam / 13) - 1; k < (cam + W) / 13 + 1; k++) {
      const x = k * 13 - cam + hash(k + 3) * 6, hh = 8 + hash(k) * 12, c = hash(k + 9) < 0.5 ? '#3f9b3a' : '#6ad155';
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.quadraticCurveTo(x + 2, GROUND - hh * 0.6, x + 4 + hash(k + 1) * 4, GROUND - hh); ctx.lineTo(x + 6, GROUND); ctx.fill();
      if (hash(k + 17) < 0.06) { circle(x + 4, GROUND - hh - 2, 3.5, ['#ff5a8a', '#ffd166', '#fff'][k & 1 ? 0 : (k & 2 ? 1 : 2)]); circle(x + 4, GROUND - hh - 2, 1.4, '#ffeb6b'); }
    }
    for (let k = Math.floor(cam / 61) - 1; k < (cam + W) / 61 + 1; k++) { // roots, leaf litter and moss drips on the soil
      const q = hash(k + 71), x = k * 61 - cam + hash(k + 72) * 40;
      if (q < 0.25) { ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 16, GROUND + 14); ctx.quadraticCurveTo(x, GROUND + 22 + q * 20, x + 18, GROUND + 15); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; ctx.stroke(); }
      else if (q < 0.5) { ctx.fillStyle = q < 0.37 ? '#d98a2b' : '#c0562a'; ctx.beginPath(); ctx.ellipse(x, GROUND + 20 + hash(k + 73) * 12, 5, 2.6, q * 6, 0, 7); ctx.fill(); }
      else if (q < 0.65) { ctx.fillStyle = '#3f9b3a'; ctx.beginPath(); ctx.moveTo(x - 5, GROUND + 12); ctx.quadraticCurveTo(x, GROUND + 28 + q * 12, x + 5, GROUND + 12); ctx.fill(); }
    }
    for (let k = Math.floor(cam / 173) - 1; k < (cam + W) / 173 + 1; k++) { // mushrooms and ferns along the path
      const q = hash(k + 31), x = k * 173 - cam + hash(k + 32) * 90;
      if (q < 0.3) { ctx.fillStyle = '#f1e6c8'; ctx.fillRect(x - 2, GROUND - 9, 4, 9); ctx.fillStyle = q < 0.15 ? '#e5483a' : '#e9a23a'; ctx.beginPath(); ctx.ellipse(x, GROUND - 9, 9, 6.5, 0, Math.PI, 0); ctx.fill(); circle(x - 3, GROUND - 12, 1.5, '#fff'); circle(x + 3, GROUND - 11, 1.2, '#fff'); circle(x + 6, GROUND - 28 + 20, 0.01, '#fff'); }
      else if (q < 0.6) { ctx.lineCap = 'round'; ctx.lineWidth = 2.2; for (let i = -3; i <= 3; i++) { ctx.strokeStyle = i % 2 ? '#2f8a3a' : '#43a84a'; ctx.beginPath(); ctx.moveTo(x, GROUND + 1); ctx.quadraticCurveTo(x + i * 5, GROUND - 14 - (3 - Math.abs(i)) * 2, x + i * 9, GROUND - 6 + Math.abs(i) * 2.5); ctx.stroke(); } }
    }
  } else if (wi === 1) {
    ctx.fillStyle = vgrad(GROUND - 4, GROUND + 12, '#f2c088', '#cf8650'); ctx.fillRect(0, GROUND - 4, W, 14);
    for (let k = Math.floor(cam / 151) - 1; k < (cam + W) / 151 + 1; k++) { // dry tufts, tiny cacti, cracked earth
      const q = hash(k + 41), x = k * 151 - cam + hash(k + 42) * 80;
      if (q < 0.35) { ctx.strokeStyle = '#b8863e'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x, GROUND + 1); ctx.quadraticCurveTo(x + i * 3, GROUND - 8, x + i * 6, GROUND - 13 + Math.abs(i) * 2); ctx.stroke(); } }
      else if (q < 0.6) { rr(x - 3, GROUND - 16, 6, 17, 3); ctx.fillStyle = '#4f7a2a'; ctx.fill(); rr(x + 2, GROUND - 11, 7, 3.4, 1.7); ctx.fill(); rr(x + 6.4, GROUND - 16, 3.4, 7, 1.7); ctx.fill(); circle(x, GROUND - 17, 2.2, '#ff7aa8'); }
      else if (q < 0.75) { ctx.strokeStyle = 'rgba(110,50,20,.45)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 12, GROUND + 3); ctx.lineTo(x - 2, GROUND + 7); ctx.lineTo(x + 4, GROUND + 4); ctx.lineTo(x + 14, GROUND + 9); ctx.moveTo(x - 2, GROUND + 7); ctx.lineTo(x - 4, GROUND + 12); ctx.stroke(); }
    }
    ctx.strokeStyle = 'rgba(160,80,30,.3)'; ctx.lineWidth = 1.5;
    for (let k = Math.floor(cam / 70) - 1; k < (cam + W) / 70 + 1; k++) { const x = k * 70 - cam; ctx.beginPath(); ctx.arc(x + 30, GROUND + 14, 22, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    for (let k = Math.floor(cam / 37) - 1; k < (cam + W) / 37 + 1; k++) { const x = k * 37 - cam + hash(k) * 20; ell(x, GROUND - 2, 3 + hash(k + 2) * 3, 2.5, 0, '#a5623a'); }
  } else if (wi === 2) {
    ctx.fillStyle = vgrad(GROUND - 6, GROUND + 16, '#ffffff', '#cfe0f5'); ctx.fillRect(0, GROUND - 6, W, 22);
    for (let k = Math.floor(cam / 60) - 1; k < (cam + W) / 60 + 1; k++) { const x = k * 60 - cam; ell(x, GROUND - 4, 34, 8, 0, '#fff'); ell(x + 6, GROUND + 14, 30, 6, 0, 'rgba(120,150,200,.25)'); }
    for (let k = Math.floor(cam / 167) - 1; k < (cam + W) / 167 + 1; k++) { // little ice crystals and paw prints
      const q = hash(k + 51), x = k * 167 - cam + hash(k + 52) * 90;
      if (q < 0.35) { for (const [dx, h2] of [[-6, 11], [0, 17], [6, 9]]) { ctx.fillStyle = 'rgba(170,215,255,.9)'; ctx.beginPath(); ctx.moveTo(x + dx - 3, GROUND); ctx.lineTo(x + dx, GROUND - h2); ctx.lineTo(x + dx + 3, GROUND); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.moveTo(x + dx - 3, GROUND); ctx.lineTo(x + dx, GROUND - h2); ctx.lineTo(x + dx - 0.5, GROUND); ctx.fill(); } }
      else if (q < 0.6) { ctx.fillStyle = 'rgba(110,140,190,.4)'; for (let i = 0; i < 3; i++) { circle(x + i * 10, GROUND + 6 + (i % 2) * 3, 2.2, ctx.fillStyle); circle(x + i * 10 - 3, GROUND + 3 + (i % 2) * 3, 1.1, ctx.fillStyle); circle(x + i * 10 + 3, GROUND + 3 + (i % 2) * 3, 1.1, ctx.fillStyle); } }
    }
    for (let k = Math.floor(cam / 29) - 1; k < (cam + W) / 29 + 1; k++) { const tw = Math.sin(T * 3 + k * 1.7); if (tw > 0.75) { const x = k * 29 - cam + hash(k) * 20, y = GROUND - 2 + hash(k + 4) * 12, s = (tw - 0.75) * 16; ctx.fillStyle = '#fff'; ctx.fillRect(x - s / 2, y - 0.6, s, 1.2); ctx.fillRect(x - 0.6, y - s / 2, 1.2, s); } }
  } else {
    ctx.fillStyle = vgrad(GROUND - 4, GROUND + 12, '#4a2c24', '#2a1814'); ctx.fillRect(0, GROUND - 4, W, 14);
    ctx.strokeStyle = `rgba(255,110,30,${0.55 + 0.25 * Math.sin(T * 2.5)})`; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 16) { const wx = x + cam; ctx.lineTo(x, GROUND + 9 + Math.sin(wx * 0.09) * 2); } ctx.stroke();
    for (let k = Math.floor(cam / 131) - 1; k < (cam + W) / 131 + 1; k++) { // embers and tiny flames
      const q = hash(k + 61), x = k * 131 - cam + hash(k + 62) * 70, fl = 0.6 + 0.4 * Math.sin(T * 7 + k * 2);
      if (q < 0.4) { ell(x, GROUND - 1, 8, 5, 0, '#2a1612'); ctx.save(); ctx.shadowColor = '#ff6a10'; ctx.shadowBlur = 8; ctx.strokeStyle = `rgba(255,${120 + 60 * fl | 0},30,.9)`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 5, GROUND - 2); ctx.lineTo(x - 1, GROUND - 5); ctx.lineTo(x + 2, GROUND - 2); ctx.lineTo(x + 6, GROUND - 4); ctx.stroke(); ctx.restore(); }
      else if (q < 0.6) { ctx.save(); ctx.shadowColor = '#ff8a20'; ctx.shadowBlur = 10; ctx.fillStyle = `rgba(255,${150 + 60 * fl | 0},40,.9)`; ctx.beginPath(); ctx.moveTo(x - 4, GROUND); ctx.quadraticCurveTo(x - 5, GROUND - 8 * fl - 4, x, GROUND - 12 * fl - 6); ctx.quadraticCurveTo(x + 5, GROUND - 8, x + 4, GROUND); ctx.fill(); ctx.fillStyle = '#fff0a0'; ctx.beginPath(); ctx.ellipse(x, GROUND - 3, 1.6, 3.4 * fl, 0, 0, 7); ctx.fill(); ctx.restore(); }
    }
    for (let k = Math.floor(cam / 50) - 1; k < (cam + W) / 50 + 1; k++) { const x = k * 50 - cam + hash(k) * 20; ctx.fillStyle = '#1a0e0b'; ctx.beginPath(); ctx.moveTo(x - 8, GROUND); ctx.lineTo(x - 2, GROUND - 6 - hash(k + 1) * 6); ctx.lineTo(x + 6, GROUND); ctx.fill(); }
  }
  // pits
  for (const p of L.pits) {
    const sx = p.x - cam; if (sx > W + 20 || sx + p.w < -20) continue;
    const pg = ctx.createLinearGradient(0, GROUND, 0, H); pg.addColorStop(0, th.lava ? '#200a06' : '#120a05'); pg.addColorStop(1, '#000');
    ctx.fillStyle = pg; ctx.fillRect(sx, GROUND - 6, p.w, H - GROUND + 6);
    if (wi >= 5) pitNew(wi, sx, p);
    // receding inner walls
    ctx.fillStyle = hgrad(sx, sx + 26, shade(gx.g[1], 1.25), 'rgba(0,0,0,0)'); ctx.fillRect(sx, GROUND - 6, 26, H);
    ctx.fillStyle = hgrad(sx + p.w - 26, sx + p.w, 'rgba(0,0,0,0)', 'rgba(0,0,0,.5)'); ctx.fillRect(sx + p.w - 26, GROUND - 6, 26, H);
    if (th.lava) {
      const gl = ctx.createLinearGradient(0, GROUND, 0, H); gl.addColorStop(0, 'rgba(255,120,0,0)'); gl.addColorStop(1, `rgba(255,120,0,${0.45 + 0.1 * Math.sin(T * 3)})`); ctx.fillStyle = gl; ctx.fillRect(sx, GROUND, p.w, H - GROUND);
      const lg = ctx.createLinearGradient(0, GROUND + 40, 0, H); lg.addColorStop(0, '#fff0a0'); lg.addColorStop(0.3, '#ffb020'); lg.addColorStop(1, '#ff3a00');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(sx, H);
      for (let x = 0; x <= p.w; x += 8) ctx.lineTo(sx + x, GROUND + 48 + Math.sin(x * 0.08 + T * 4) * 5);
      ctx.lineTo(sx + p.w, H); ctx.fill();
      for (let i = 0; i < 3; i++) { const u = (T * 0.8 + i / 3) % 1, bx = sx + p.w * (0.2 + 0.3 * i) + Math.sin(i * 9) * 10; ctx.globalAlpha = 1 - u; circle(bx, GROUND + 52 - u * 6, 3 + u * 6, '#ffe07a'); } ctx.globalAlpha = 1;
    } else if (wi === 0) { // hanging roots
      ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) { const rx = sx + 10 + i * (p.w - 20) / 4, len = 20 + hash(p.x + i) * 34; ctx.beginPath(); ctx.moveTo(rx, GROUND); ctx.quadraticCurveTo(rx + Math.sin(T + i) * 4, GROUND + len * 0.5, rx + 3, GROUND + len); ctx.stroke(); }
    } else if (wi === 2) { // icicles
      ctx.fillStyle = 'rgba(210,235,255,.9)';
      for (let i = 0; i < 8; i++) { const ix = sx + 6 + i * (p.w - 12) / 7, len = 10 + hash(p.x + i * 3) * 22; ctx.beginPath(); ctx.moveTo(ix - 4, GROUND + 8); ctx.lineTo(ix + 4, GROUND + 8); ctx.lineTo(ix, GROUND + 8 + len); ctx.fill(); }
    }
    // lips
    for (const [ex, dir] of [[sx, 1], [sx + p.w, -1]]) {
      ctx.fillStyle = hgrad(ex - 8 * dir, ex + 8 * dir, shade(gx.g[0], 0.75), shade(gx.g[0], 0.45)); ctx.fillRect(Math.min(ex, ex - 6 * dir) - (dir < 0 ? 0 : 0), GROUND - 4, 6, H);
      ctx.fillStyle = { 0: '#4fb53f', 1: '#e0a46a', 2: '#ffffff', 5: '#ecd49a', 6: '#d8c48a', 7: '#7aa862' }[wi] || '#4a2c24';
      rr(ex - (dir > 0 ? 10 : 2), GROUND - 7, 12, 16, 6); ctx.fill();
    }
  }
}
function groundDepth(wi, cam, gx) { // soil bands, big dark rocks near the viewer, a contact shadow under the surface and a fade to the front edge
  const bands = { 0: ['rgba(120,70,30,.28)', 'rgba(20,12,6,.3)'], 1: ['rgba(255,205,150,.22)', 'rgba(130,40,20,.26)'], 2: ['rgba(190,225,255,.24)', 'rgba(40,70,130,.26)'], 3: ['rgba(255,90,20,.14)', 'rgba(0,0,0,.32)'], 5: ['rgba(255,235,180,.24)', 'rgba(130,85,30,.26)'], 6: ['rgba(90,70,25,.2)', 'rgba(0,25,45,.3)'], 7: ['rgba(205,215,235,.2)', 'rgba(30,40,60,.28)'] }[wi] || ['rgba(255,255,255,.1)', 'rgba(0,0,0,.2)'];
  for (let s2 = 0; s2 < 2; s2++) {
    const y0 = GROUND + 28 + s2 * 34, th2 = 13 + s2 * 4; ctx.fillStyle = bands[s2]; ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 16) { const wx = x + cam; ctx.lineTo(x, y0 + Math.sin(wx * 0.017 + s2 * 3) * 5 + Math.sin(wx * 0.05 + s2) * 2); }
    for (let x = W + 10; x >= -10; x -= 16) { const wx = x + cam; ctx.lineTo(x, y0 + th2 + Math.sin(wx * 0.021 + s2 * 2) * 5 + Math.sin(wx * 0.06 + s2) * 2); }
    ctx.closePath(); ctx.fill();
  }
  for (let k = Math.floor(cam / 131) - 1; k < (cam + W) / 131 + 1; k++) { // big dark rocks in the front of the soil
    const h1 = hash(k + 90), x = k * 131 - cam + h1 * 70, y = GROUND + 74 + hash(k + 91) * 22, rx = 16 + h1 * 22, ry = 8 + h1 * 8, c = shade(gx.stone, 0.72);
    ell(x, y + 3, rx * 1.1, ry, 0, 'rgba(0,0,0,.25)'); pebble(x, y, rx, ry, k + 500, c);
  }
  ctx.fillStyle = vgrad(GROUND + 6, GROUND + 28, 'rgba(0,0,0,.3)', 'rgba(0,0,0,0)'); ctx.fillRect(0, GROUND + 6, W, 22);
  ctx.fillStyle = vgrad(GROUND + 40, H, 'rgba(0,0,0,0)', 'rgba(0,0,0,.42)'); ctx.fillRect(0, GROUND + 40, W, H - GROUND - 40);
}
function meteorRock(x, y, s, glow) { // a lumpy space rock: dark crust, lit facets, craters and glowing cracks; glow 0..1
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const pts = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, k = 0.86 + hash(i * 1.7) * 0.2; pts.push([Math.cos(a) * 31 * k, Math.sin(a) * 25 * k]); }
  const poly = () => { ctx.beginPath(); for (const [px, py] of pts) ctx.lineTo(px, py); ctx.closePath(); };
  poly(); ctx.fillStyle = vgrad(-26, 26, '#5a4a44', '#2e2420'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#140c0a'; ctx.stroke();
  ctx.save(); poly(); ctx.clip();
  ctx.fillStyle = 'rgba(255,230,200,.12)'; ctx.beginPath(); ctx.ellipse(-10, -12, 18, 10, -0.4, 0, 7); ctx.fill(); // lit upper facet
  for (const [cx, cy, r] of [[-12, 4, 6], [10, -10, 4.5], [14, 10, 5]]) { circle(cx, cy, r, 'rgba(0,0,0,.35)'); circle(cx - 1, cy - 1.2, r * 0.7, '#4a3c36'); } // craters
  ctx.fillStyle = vgrad(4, 26, 'rgba(255,90,20,0)', `rgba(255,110,30,${0.55 * glow})`); ctx.fillRect(-34, 4, 68, 24); // molten underside
  ctx.restore();
  ctx.save(); if (!LOWFX) { ctx.shadowColor = '#ff6a10'; ctx.shadowBlur = 8 * glow; }
  ctx.strokeStyle = `rgba(255,${130 + 80 * glow | 0},40,${0.4 + 0.6 * glow})`; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-18, -14); ctx.lineTo(-6, -4); ctx.lineTo(-12, 8); ctx.moveTo(-6, -4); ctx.lineTo(6, 0); ctx.lineTo(16, -8); ctx.moveTo(6, 0); ctx.lineTo(4, 14); ctx.stroke();
  ctx.restore(); ctx.restore();
}
function pebble(x, y, rx, ry, seed, c) { // a rough stone: an irregular outline, a lit upper facet and a dark lower edge
  const n = 7, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + hash(seed + i * 0.37) * 0.4, k = 0.8 + hash(seed * 3 + i) * 0.25; pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
  const poly = (dx, dy, s) => { ctx.beginPath(); for (const [px, py] of pts) ctx.lineTo(x + (px - x) * s + dx, y + (py - y) * s + dy); ctx.closePath(); };
  poly(0, 0, 1); ctx.fillStyle = shade(c, 0.7); ctx.fill();
  poly(-rx * 0.12, -ry * 0.2, 0.78); ctx.fillStyle = c; ctx.fill();
  poly(-rx * 0.28, -ry * 0.42, 0.38); ctx.fillStyle = shade(c, 1.3); ctx.fill();
}
function fossilBone(x, y) { ctx.strokeStyle = 'rgba(255,240,215,.45)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y - 3); ctx.stroke(); circle(x - 8, y - 2, 2.5, 'rgba(255,240,215,.45)'); circle(x - 8, y + 2, 2.5, 'rgba(255,240,215,.45)'); circle(x + 8, y - 5, 2.5, 'rgba(255,240,215,.45)'); circle(x + 8, y - 1, 2.5, 'rgba(255,240,215,.45)'); }

function critterCol() { return { 0: '#55b84a', 1: '#e0873a', 2: '#7ac8e8', 3: '#e0503a', 5: '#e8644f', 7: '#8aa0d0' }[ART(G.wi)] || '#55b84a'; }
function drawCrumble(pl, cam) {
  const x = pl.x - cam + (pl.t != null && !pl.gone ? Math.sin(T * 70) * 2.5 : 0), y = pl.y, w = pl.w;
  if (x > W + 20 || x + w < -20 || y > H + 40) return;
  const c = ART(G.wi) === 2 ? '#9fb4cc' : ART(G.wi) === 3 ? '#4a3a36' : '#a8967a';
  ctx.save(); if (pl.gone) ctx.globalAlpha = clamp(1 - (pl.y - pl.y0) / 260, 0, 1);
  if (!pl.gone) ell(x + w / 2, GROUND + 2, w * 0.4, 6, 0, 'rgba(0,0,0,.18)');
  rr(x, y, w, 34, 10); ctx.fillStyle = vgrad(y, y + 34, shade(c, 1.25), c, shade(c, 0.65)); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + 3); ctx.lineTo(x + w * 0.36, y + 14); ctx.lineTo(x + w * 0.28, y + 24); ctx.moveTo(x + w * 0.7, y + 4); ctx.lineTo(x + w * 0.62, y + 16); ctx.lineTo(x + w * 0.7, y + 30); ctx.stroke();
  if (pl.t != null && !pl.gone) { ctx.fillStyle = `rgba(255,120,60,${0.25 + 0.2 * Math.sin(T * 40)})`; rr(x, y, w, 34, 10); ctx.fill(); }
  ctx.restore();
}
function drawPlatform(pl, cam, wi) {
  if (pl.crumble) return drawCrumble(pl, cam);
  const x = pl.x - cam, y = pl.y, w = pl.w;
  if (x > W + 20 || x + w < -20) return;
  ell(x + w / 2, GROUND + 2, w * 0.4, 6, 0, 'rgba(0,0,0,.18)');
  if (wi >= 5) platformNew(wi, pl, x, y, w);
  else if (wi === 0) { // mossy log with vines
    rr(x, y, w, 26, 13); ctx.fillStyle = vgrad(y, y + 26, '#8a6038', '#6b4a2b', '#3e2a17'); ctx.fill();
    ctx.strokeStyle = 'rgba(40,25,10,.45)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < w / 22; i++) { ctx.beginPath(); ctx.moveTo(x + 14 + i * 22, y + 8 + (i % 2) * 4); ctx.lineTo(x + 30 + i * 22, y + 10 + (i % 2) * 4); ctx.stroke(); }
    ell(x + w - 7, y + 13, 7, 12, 0, '#b88a55'); ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x + w - 7, y + 13, 4, 7, 0, 0, Math.PI * 2); ctx.stroke();
    rr(x + 4, y - 4, w - 8, 9, 5); ctx.fillStyle = vgrad(y - 4, y + 5, '#7fdc5f', '#3f9b3a'); ctx.fill();
    for (let i = 0; i < w / 16; i++) { const vx = x + 10 + i * 16 + hash(pl.x + i) * 6; if (hash(pl.x + i * 7) < 0.45) { ctx.strokeStyle = '#2f7a2c'; ctx.lineWidth = 2; const len = 14 + hash(pl.x + i) * 30; ctx.beginPath(); ctx.moveTo(vx, y + 20); ctx.quadraticCurveTo(vx + Math.sin(T * 1.5 + i) * 4, y + 20 + len * 0.5, vx, y + 20 + len); ctx.stroke(); leaf(vx, y + 20 + len, 7, 0.6, 0.2, 3, '#4caf50'); } else ell(vx, y + 3, 6, 4, 0, '#5cc94a'); }
  } else if (wi === 1) { // sandstone slab
    ctx.fillStyle = vgrad(y, y + 30, '#f0b47a', '#c97a45', '#8b4a2b'); ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + w, y); ctx.lineTo(x + w - 4, y + 20); for (let i = 8; i >= 0; i--) ctx.lineTo(x + 4 + i * (w - 8) / 8, y + 22 + hash(pl.x + i) * 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,50,20,.35)'; ctx.lineWidth = 1.5; for (const sy of [y + 8, y + 15]) { ctx.beginPath(); ctx.moveTo(x + 2, sy); ctx.lineTo(x + w - 3, sy + 1); ctx.stroke(); }
    rr(x - 2, y - 3, w + 4, 7, 3); ctx.fillStyle = '#f7d09a'; ctx.fill();
  } else if (wi === 2) { // ice block
    rr(x, y, w, 24, 6); ctx.fillStyle = vgrad(y, y + 24, '#e4f3ff', '#9fc3e6', '#6d97c4'); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w * 0.25, y + 4); ctx.lineTo(x + w * 0.15, y + 20); ctx.moveTo(x + w * 0.65, y + 4); ctx.lineTo(x + w * 0.55, y + 20); ctx.stroke();
    ctx.fillStyle = 'rgba(200,230,255,.95)';
    for (let i = 0; i < w / 18; i++) { const ix = x + 9 + i * 18, len = 8 + hash(pl.x + i) * 16; ctx.beginPath(); ctx.moveTo(ix - 4, y + 22); ctx.lineTo(ix + 4, y + 22); ctx.lineTo(ix, y + 22 + len); ctx.fill(); }
    rr(x - 3, y - 6, w + 6, 10, 5); ctx.fillStyle = '#fff'; ctx.fill();
  } else { // basalt with glowing seam
    rr(x, y, w, 26, 6); ctx.fillStyle = vgrad(y, y + 26, '#4a3530', '#2a1c18', '#140c0a'); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5; for (let i = 1; i < w / 26; i++) { ctx.beginPath(); ctx.moveTo(x + i * 26, y + 4); ctx.lineTo(x + i * 26 + 3, y + 24); ctx.stroke(); }
    ctx.save(); ctx.shadowColor = '#ff5a00'; ctx.shadowBlur = 12; rr(x + 2, y - 3, w - 4, 6, 3); ctx.fillStyle = `rgb(255,${110 + 40 * Math.sin(T * 3) | 0},40)`; ctx.fill(); ctx.restore();
  }
}

// ---------- foreground + atmosphere (screen space) ----------
function drawForeground(wi, cam) {
  const off = cam * 1.35, sp = 380;
  for (let k = Math.floor(off / sp) - 1; k < (off + W) / sp + 1; k++) {
    const x = k * sp - off + hash(k + 300) * 160, hv = hash(k + 301);
    if (hv < 0.35) continue;
    const b = H + 6;
    if (wi >= 5) { foregroundNew(wi, x, b, hv, k); continue; }
    if (wi === 0) { for (let i = 0; i < 6; i++) leaf(x, b, 70 + hv * 30, -1.57 + (i - 2.5) * 0.38, 0.35, 12, '#0d2a1d', '#174a30'); }
    else if (wi === 1) { ell(x, b - 6, 70, 34, 0, '#4a1e0e'); ell(x - 20, b - 24, 30, 14, -0.2, 'rgba(255,200,150,.15)'); }
    else if (wi === 2) { ell(x, b, 90, 40, 0, '#e6f0fb'); ell(x - 20, b - 22, 50, 14, 0, '#ffffff'); }
    else { ctx.fillStyle = '#0a0302'; ctx.beginPath(); ctx.moveTo(x - 70, b); ctx.lineTo(x - 30, b - 50 - hv * 20); ctx.lineTo(x + 10, b - 36); ctx.lineTo(x + 60, b); ctx.fill(); ctx.strokeStyle = `rgba(255,90,20,${0.4 + 0.3 * Math.sin(T * 2 + k)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 30, b - 40); ctx.lineTo(x - 10, b - 10); ctx.stroke(); }
  }
}
const motes = []; for (let i = 0; i < 26; i++) motes.push({ x: Math.random() * W, y: Math.random() * H, v: 20 + Math.random() * 30, ph: Math.random() * 6, r: Math.random() });
function drawAmbient(wi) {
  if (wi >= 5) { ambientNew(wi); return; }
  if (wi === 0) { // falling leaves + fireflies
    for (let i = 0; i < 10; i++) { const m = motes[i]; const y = mod(m.y + T * m.v, H + 40) - 20, x = mod(m.x - T * 30 + Math.sin(T + m.ph) * 30, W + 40) - 20; leaf(x, y, 10, T * 2 + m.ph, 0.3, 4, '#7bc96a', '#3f9b3a'); }
    for (let i = 10; i < 22; i++) { const m = motes[i], a = 0.4 + 0.6 * Math.max(0, Math.sin(T * 2 + m.ph * 3)); ctx.globalAlpha = a; circle(m.x + Math.sin(T * 0.7 + m.ph) * 20, 260 + m.r * 160 + Math.cos(T * 0.9 + m.ph) * 12, 2.2, '#f4ffb0'); ctx.globalAlpha = a * 0.3; circle(m.x + Math.sin(T * 0.7 + m.ph) * 20, 260 + m.r * 160 + Math.cos(T * 0.9 + m.ph) * 12, 7, '#f4ffb0'); }
    ctx.globalAlpha = 1;
  } else if (wi === 1) { // drifting dust + heat shimmer
    for (let i = 0; i < 22; i++) { const m = motes[i]; ctx.globalAlpha = 0.25 + 0.25 * Math.sin(T + m.ph); circle(mod(m.x - T * m.v * 2, W + 20) - 10, 300 + m.r * 220 + Math.sin(T * 2 + m.ph) * 8, 1.5 + m.r * 1.5, '#fff0d0'); }
    ctx.globalAlpha = 1;
  } else if (wi === 3) { // ash
    for (let i = 0; i < 22; i++) { const m = motes[i]; ctx.globalAlpha = 0.5; circle(mod(m.x - T * 15 + Math.sin(T + m.ph) * 25, W), mod(m.y + T * m.v * 0.8, H), 1.6 + m.r, '#8a7a78'); }
    ctx.globalAlpha = 1;
  }
}
// soft additive glow from a cached sprite (cheap enough for dozens of amber); off in low-power mode
const glowCache = {};
function glow(x, y, r, rgb, a) {
  if (LOWFX || a <= 0) return;
  let c = glowCache[rgb];
  if (!c) { c = glowCache[rgb] = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.4, `rgba(${rgb},.35)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.drawImage(c, x - r, y - r, r * 2, r * 2); ctx.restore();
}
const REX_LIGHT = ['255,220,140', '255,190,120', '190,225,255', '255,230,170', '255,210,140', '255,230,170', '170,240,255', '255,225,170'], DESAT = [0.3, 0.22, 0.2, 0.12, 0.2, 0.28, 0.2, 0.24];
function desatBackdrop(wi) { // the backdrop loses colour so Rex, enemies and pickups are the most saturated things on screen
  if (LOWFX) return; ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = DESAT[wi] || 0.2; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, GROUND); ctx.restore();
}
// boss arena: while a boss fight runs the backdrop darkens and the ground becomes a lit stone slab floor
function arenaBack(u) { if (u <= 0) return; ctx.fillStyle = `rgba(10,0,20,${0.34 * u})`; ctx.fillRect(0, 0, W, GROUND); const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, H * 0.9); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.35 * u})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function arenaFloor(u, cam) {
  if (u <= 0) return; ctx.save(); ctx.globalAlpha = u; ctx.fillStyle = 'rgba(46,24,36,.55)'; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3; const sp = 130, off = mod(cam, sp); for (let x = -off; x < W + sp; x += sp) { ctx.beginPath(); ctx.moveTo(x, GROUND + 2); ctx.lineTo(x - 18, H); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, GROUND + 38); ctx.lineTo(W, GROUND + 38); ctx.stroke();
  const lg = ctx.createLinearGradient(0, GROUND - 2, 0, GROUND + 14); lg.addColorStop(0, 'rgba(255,200,140,.55)'); lg.addColorStop(1, 'rgba(255,200,140,0)'); ctx.fillStyle = lg; ctx.fillRect(0, GROUND - 2, W, 16); ctx.restore();
}
// second, faster foreground layer: soft out-of-focus silhouettes hanging from the top edge (depth without hiding the play lane)
const FAR_COL = ['4,22,14', '48,14,6', '235,244,255', '14,4,2', '8,12,34', '30,90,60', '120,230,240', '70,80,100'], FAR_A = [0.5, 0.5, 0.55, 0.55, 0.5, 0.4, 0.3, 0.45];
function drawFarForeground(wi, cam) {
  if (LOWFX) return;
  const off = cam * 1.9, sp = 640, C = FAR_COL[wi] || FAR_COL[0], A = FAR_A[wi] || 0.45;
  for (let k = Math.floor(off / sp) - 1; k < (off + W) / sp + 1; k++) {
    const hv = hash(k + 500); if (hv < 0.35) continue;
    const x = k * sp - off + hash(k + 501) * 300, r = 90 + hash(k + 502) * 90;
    ctx.save(); ctx.translate(x, -14); ctx.rotate((hash(k + 503) - 0.5) * 0.9); ctx.scale(1, 0.55);
    const g = ctx.createRadialGradient(0, r * 0.35, r * 0.1, 0, r * 0.35, r); g.addColorStop(0, `rgba(${C},${A})`); g.addColorStop(0.6, `rgba(${C},${A * 0.55})`); g.addColorStop(1, `rgba(${C},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, r * 0.35, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}
// per-world colour grade (cool sky, warm ground), a little stronger towards the end of the level
const GRADE = [['0,60,70,.07', '70,30,0,.07'], ['40,40,90,.06', '120,40,0,.10'], ['90,140,255,.10', '170,120,255,.08'], ['60,0,40,.12', '255,70,0,.12'], ['10,20,90,.14', '255,150,60,.06'], ['0,90,130,.06', '255,170,60,.08'], ['0,120,150,.12', '0,30,110,.16'], ['60,90,160,.08', '120,80,60,.08']];
function colorGrade(wi, u) {
  const gr = GRADE[wi]; if (!gr) return; const k = 0.75 + 0.5 * u, c = s => { const a = s.split(','); return `rgba(${a[0]},${a[1]},${a[2]},${(+a[3] * k).toFixed(3)})`; };
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c(gr[0])); g.addColorStop(1, c(gr[1])); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
let vignetteG = null;
function vignette(wi) {
  if (!vignetteG) { vignetteG = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.45, W / 2, H * 0.55, H * 1.05); vignetteG.addColorStop(0, 'rgba(0,0,0,0)'); vignetteG.addColorStop(1, 'rgba(0,0,0,.42)'); }
  ctx.fillStyle = vignetteG; ctx.fillRect(0, 0, W, H);
  if (wi === 3) { const g = ctx.createLinearGradient(0, H - 120, 0, H); g.addColorStop(0, 'rgba(255,80,0,0)'); g.addColorStop(1, `rgba(255,80,0,${0.12 + 0.05 * Math.sin(T * 2)})`); ctx.fillStyle = g; ctx.fillRect(0, H - 120, W, 120); }
}

// ---------- cartoon outlines via offscreen silhouette ----------
let LOWFX = false; const perf = { avg: 1 / 60, bad: 0, good: 0, drops: 0 };
function perfWatch() {
  if (DT <= 0 || DT > 0.25) return;
  perf.avg += (DT - perf.avg) * 0.05;
  if (!LOWFX) {
    perf.bad = perf.avg > 1 / 36 ? perf.bad + DT : 0;
    if (perf.bad > 4) { LOWFX = true; perf.bad = 0; perf.good = 0; perf.drops++; toast('Spar-Modus: weniger Glanz, mehr Tempo', '#9fe3ff'); }
  } else if (perf.drops < 3) { // recover after a long smooth stretch (a one-off hiccup should not cost the effects for good)
    perf.good = perf.avg < 1 / 50 ? perf.good + DT : 0;
    if (perf.good > 12) { LOWFX = false; perf.good = 0; perf.bad = 0; }
  }
}
const outlinePool = {};
function outlined(key, x, y, bx, by, bw, bh, fn, alpha = 1, lw = 2.6, rim = null) { // rim: colour of a thin light edge on the upper left (Rex warm, hazards red-orange)
  if (alpha <= 0) return;
  const m = ctx.getTransform(), k = Math.min(3, Math.hypot(m.a, m.b) || 1);
  if (LOWFX || k * bw > 1600) { ctx.globalAlpha = alpha; fn(); ctx.globalAlpha = 1; return; }
  const pad = lw + 2, X = x + bx - pad, Y = y + by - pad, Wd = bw + pad * 2, Ht = bh + pad * 2;
  const cw = Math.ceil(Wd * k), ch = Math.ceil(Ht * k);
  let P = outlinePool[key];
  if (!P) P = outlinePool[key] = { a: document.createElement('canvas'), b: document.createElement('canvas') };
  for (const c of [P.a, P.b]) if (c.width < cw || c.height < ch) { c.width = Math.max(c.width, cw); c.height = Math.max(c.height, ch); }
  const ca = P.a.getContext('2d'), cb = P.b.getContext('2d');
  ca.setTransform(1, 0, 0, 1, 0, 0); ca.clearRect(0, 0, cw + 2, ch + 2);
  const old = ctx; ctx = ca; ctx.setTransform(k, 0, 0, k, -X * k, -Y * k); ctx.globalAlpha = 1;
  try { fn(); } finally { ctx = old; }
  cb.setTransform(1, 0, 0, 1, 0, 0); cb.globalCompositeOperation = 'source-over'; cb.clearRect(0, 0, cw + 2, ch + 2);
  cb.drawImage(P.a, 0, 0); cb.globalCompositeOperation = 'source-in'; cb.fillStyle = '#1b120c'; cb.fillRect(0, 0, cw, ch); cb.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = alpha;
  const nO = bw * bh * k * k > 60000 ? 4 : 8, rO = nO === 4 ? lw * 1.2 : lw; // big sprites (the bosses) use fewer outline stamps: it is the costliest draw in a fight
  for (let i = 0; i < nO; i++) { const a = i / nO * Math.PI * 2 + (nO === 4 ? Math.PI / 4 : 0); ctx.drawImage(P.b, 0, 0, cw, ch, X + Math.cos(a) * rO, Y + Math.sin(a) * rO, cw / k, ch / k); }
  ctx.drawImage(P.a, 0, 0, cw, ch, X, Y, cw / k, ch / k);
  if (rim) { // sprite minus itself shifted down-right = a lit edge strip, tinted and laid over the sprite
    const C = P.c || (P.c = document.createElement('canvas')); if (C.width < cw || C.height < ch) { C.width = Math.max(C.width, cw); C.height = Math.max(C.height, ch); }
    const cc = C.getContext('2d'); cc.setTransform(1, 0, 0, 1, 0, 0); cc.globalCompositeOperation = 'source-over'; cc.clearRect(0, 0, cw + 2, ch + 2);
    cc.drawImage(P.a, 0, 0, cw, ch, 0, 0, cw, ch); cc.globalCompositeOperation = 'destination-out'; cc.drawImage(P.a, 0, 0, cw, ch, 2.4 * k, 2.4 * k, cw, ch);
    cc.globalCompositeOperation = 'source-in'; cc.fillStyle = rim; cc.fillRect(0, 0, cw, ch); cc.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.75; ctx.drawImage(C, 0, 0, cw, ch, X, Y, cw / k, ch / k);
  }
  ctx.restore();
}
// bounding boxes are in unscaled character units; flip mirrors x
function obox(s, flip, x0, x1, y0, y1) { return flip ? [-x1 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s] : [x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s]; }
function oRex(x, y, s, ph, jaw, o = {}) { const [bx, by, bw, bh] = obox(s, o.flip, -134, o.fire ? 152 : 132, o.rider ? (o.hat || o.hat2 ? -214 : -186) : -142, 14); const a = o.alpha == null ? 1 : o.alpha; outlined('rex', x, y, bx, by, bw, bh, () => drawRex(x, y, s, ph, jaw, Object.assign({}, o, { alpha: null })), a, 2.6, '#fff0b8'); }
function oRaptor(x, y, s, ph, flip, o = {}) { const [bx, by, bw, bh] = obox(s, flip, -118, 90, o.crown ? -128 : -128, 6); const a = o.alpha == null ? 1 : Math.max(0, o.alpha); outlined(o.crown ? 'boss' : 'raptor', x, y, bx, by, bw, bh, () => drawRaptor(x, y, s, ph, flip, Object.assign({}, o, { alpha: null })), a, 2.6, '#ff7a4a'); }
function oPtero(x, y, s, ph, flip, o = {}) { const [bx, by, bw, bh] = obox(s, flip, -52, 68, -64, 56); const a = o.alpha == null ? 1 : Math.max(0, o.alpha); outlined('ptero', x, y, bx, by, bw, bh, () => drawPtero(x, y, s, ph, flip, {}), a, 2.6, '#ff7a4a'); }
function oCompy(x, y, s, ph, flip, o = {}) { const [bx, by, bw, bh] = obox(s, flip, -46, 38, -56, 4); const a = o.alpha == null ? 1 : Math.max(0, o.alpha); outlined('compy', x, y, bx, by, bw, bh, () => drawCompy(x, y, s, ph, flip, { flat: o.flat, tone: o.tone }), a, 2.6, '#ff7a4a'); }
function oChili(x, y, s, ph, flip) { const [bx, by, bw, bh] = chiliFx.dive ? obox(s, flip, -34, 50, -78, 10) : obox(s, flip, -32, 46, -72, 10); outlined('chili', x, y, bx, by, bw, bh, () => drawChili(x, y, s, ph, flip)); }
function oBaby(x, y, s, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -38, 32, -78, 4); outlined('baby', x, y, bx, by, bw, bh, () => drawBaby(x, y, s, ph, flip)); }
function oKiwi(x, y, s, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -22, 44, -34, 4); outlined('kiwi', x, y, bx, by, bw, bh, () => drawKiwi(x, y, s, ph, flip)); }
function oLong(x, y, s, col, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -120, 100, -165, 4); outlined('long', x, y, bx, by, bw, bh, () => drawLongneck(x, y, s, col, ph, flip)); }
function oTrike(x, y, s, col, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -60, 62, -64, 4); outlined('trike', x, y, bx, by, bw, bh, () => drawTrike(x, y, s, col, ph, flip)); }
function oGoetti(x, y, s, wave) { const [bx, by, bw, bh] = obox(s, false, -36, 64, -166, 4); outlined('goetti', x, y, bx, by, bw, bh, () => drawGoetti(x, y, s, wave)); }
