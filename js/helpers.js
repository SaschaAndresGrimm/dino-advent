'use strict';
// Drawing helpers and UI kit. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// =====================================================================
// Helpers
// =====================================================================
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function circle(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function ell(x, y, rx, ry, rot, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); }
function setFont(size, weight = 'bold') { ctx.font = `${weight} ${size}px ${FONT}`; }
function txt(s, x, y, size, color, align = 'center', weight = 'bold') { setFont(size, weight); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); }
function otxt(s, x, y, size, color, stroke = 'rgba(0,0,0,.75)', lw = 6, align = 'center') { setFont(size); ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeText(s, x, y); ctx.fillStyle = color; ctx.fillText(s, x, y); }
function wrapLines(s, maxW, size) { setFont(size); const out = []; let cur = ''; for (const w of s.split(' ')) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }
function fmt(s) { return s.replace(/\{oli\}/g, save.oliName || 'Oli').replace(/\{fabio\}/g, save.fabioName || 'Fabio').replace(/\{rex\}/g, save.rexName || 'Rexi').replace(/\{baby\}/g, save.babyName || 'Baby'); }
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

// immediate-mode buttons (rebuilt every frame)
let buttons = [];
// ---------- UI kit: bevelled buttons, carved-wood + parchment panels, icons ----------
function button(label, x, y, w, h, cb, o = {}) {
  buttons.push({ x, y, w, h, cb, silent: o.silent, label });
  const base = o.disabled ? '#cfc6b0' : (o.color || '#f4b400'), r = Math.min(h / 2.2, 28);
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.32)'; rr(x, y + 5, w, h, r); ctx.fill(); ctx.restore();
  rr(x, y, w, h, r); ctx.fillStyle = vgrad(y, y + h, shade(base, 1.18), base, shade(base, 0.8)); ctx.fill();
  ctx.save(); rr(x, y, w, h, r); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x, y, w, h * 0.45); ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(x, y + h * 0.88, w, h * 0.12); ctx.restore();
  rr(x, y, w, h, r); ctx.lineWidth = 3; ctx.strokeStyle = shade(base, 0.5); ctx.stroke();
  rr(x + 2.5, y + 2.5, w - 5, h - 5, Math.max(2, r - 2)); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
  let tx = x + w / 2;
  if (o.icon) { setFont(o.size || 26); const tw = ctx.measureText(label).width, is = Math.min(h * 0.62, 38), gw = is + 10 + tw; o.icon(x + w / 2 - gw / 2 + is / 2, y + h / 2 + 1, is); tx = x + w / 2 - gw / 2 + is + 10 + tw / 2; }
  txt(label, tx, y + h / 2 + 1, o.size || 26, o.disabled ? '#8a826e' : (o.textColor || '#2b1a00'));
}
function ico(kind, cx, cy, s) { // UI icons: ink outline, gradient fill and a glossy highlight, drawn in a 30-unit box
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s / 30, s / 30); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const INK = '#2b1a0c', fillOut = (c0, c1, lw = 2.4) => { ctx.fillStyle = vgrad(-15, 15, c0, c1); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); };
  if (kind === 'book') {
    rr(-13, -15, 27, 30, 4); fillOut('#b0502a', '#6e2a14'); ctx.fillStyle = '#fff3d0'; ctx.fillRect(11, -12, 5, 25); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.strokeRect(11, -12, 5, 25); ctx.beginPath(); ctx.moveTo(11, -7); ctx.lineTo(16, -7); ctx.moveTo(11, 0); ctx.lineTo(16, 0); ctx.moveTo(11, 7); ctx.lineTo(16, 7); ctx.stroke();
    rr(-13, -15, 6, 30, 3); ctx.fillStyle = '#5a1c0a'; ctx.fill(); ctx.lineWidth = 1.6; ctx.stroke(); ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(1, 2, 5, 6, 0, 0, 7); ctx.fill(); ctx.stroke(); for (const [tx, ty] of [[-3, -6], [1, -8], [5, -6]]) circle(tx, ty, 1.7, '#ffd34d'); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(-5, -13, 12, 3);
  } else if (kind === 'amber') { drawAmber(0, 0, 13); }
  else if (kind === 'loop') { const p = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(6, -12, 16, -12, 16, 0); ctx.bezierCurveTo(16, 12, 6, 12, 0, 0); ctx.bezierCurveTo(-6, -12, -16, -12, -16, 0); ctx.bezierCurveTo(-16, 12, -6, 12, 0, 0); }; p(); ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke(); p(); ctx.lineWidth = 6; ctx.strokeStyle = '#2a78c8'; ctx.stroke(); p(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(190,230,255,.85)'; ctx.stroke(); }
  else if (kind === 'trophy') {
    ctx.strokeStyle = INK; ctx.lineWidth = 6.5; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 10, -10); ctx.bezierCurveTo(sd * 19, -12, sd * 19, 3, sd * 8, 3); ctx.stroke(); } ctx.strokeStyle = '#f0b020'; ctx.lineWidth = 3.4; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 10, -10); ctx.bezierCurveTo(sd * 19, -12, sd * 19, 3, sd * 8, 3); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-11, -14); ctx.lineTo(11, -14); ctx.quadraticCurveTo(11, 6, 0, 8); ctx.quadraticCurveTo(-11, 6, -11, -14); ctx.closePath(); fillOut('#ffe27a', '#e09a10'); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(-7, -11); ctx.lineTo(-4, -11); ctx.quadraticCurveTo(-5, 1, -7, 3); ctx.closePath(); ctx.fill();
    drawStar(1, -4, 5, '#fff3b0'); rr(-3, 8, 6, 5, 1); fillOut('#f0b020', '#b87808', 1.8); rr(-9, 12, 18, 5, 2); fillOut('#6a5a4a', '#3a2e24', 1.8);
  } else if (kind === 'scroll') {
    rr(-12, -13, 24, 26, 3); ctx.fillStyle = vgrad(-13, 13, '#f8e8c0', '#dcc088'); ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-12, 8); ctx.quadraticCurveTo(-6, 4, -2, 13); ctx.lineTo(-12, 13); ctx.closePath(); ctx.fillStyle = '#c9a060'; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = '#b06a28'; ctx.lineWidth = 1.8; ctx.setLineDash([2.5, 2.5]); ctx.beginPath(); ctx.moveTo(-8, 4); ctx.quadraticCurveTo(-3, -6, 2, 0); ctx.lineTo(7, -6); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = '#c0302a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(10, -5); ctx.moveTo(10, -10); ctx.lineTo(5, -5); ctx.stroke();
  } else if (kind === 'star') { drawStar(0, 1, 15, INK); drawStar(0, 1, 12.4, '#ffd34d'); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(0, -13); ctx.lineTo(1.5, -8); ctx.closePath(); ctx.fill(); }
  else if (kind === 'back') { ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.moveTo(8, -11); ctx.lineTo(-7, 0); ctx.lineTo(8, 11); ctx.stroke(); ctx.lineWidth = 5.6; ctx.strokeStyle = '#2b1a00'; ctx.stroke(); }
  else if (kind === 'lock') { ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, -5, 7, Math.PI, 0); ctx.lineTo(7, -2); ctx.moveTo(-7, -5); ctx.lineTo(-7, -2); ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#d8dce6'; ctx.beginPath(); ctx.arc(0, -5, 7, Math.PI, 0); ctx.lineTo(7, -2); ctx.moveTo(-7, -5); ctx.lineTo(-7, -2); ctx.stroke(); rr(-11, -4, 22, 18, 4); fillOut('#ffe27a', '#d89a18'); circle(0, 4, 3, INK); ctx.fillStyle = INK; ctx.fillRect(-1.2, 4, 2.4, 6); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-8, -2, 9, 2.2); }
  else if (kind === 'check') { ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(-9, 1); ctx.lineTo(-3, 8); ctx.lineTo(10, -8); ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = '#2e9a3a'; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(190,255,190,.8)'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-3, 6); ctx.stroke(); }
  else if (kind === 'play') { ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(12, 0); ctx.lineTo(-8, 12); ctx.closePath(); fillOut('#5a3a10', '#2b1a00', 2); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(4, -4); ctx.lineTo(-6, -4); ctx.closePath(); ctx.fill(); }
  else if (kind === 'gear') { ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 10 : 14; const a2 = a + Math.PI / 16; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r); } ctx.closePath(); fillOut('#c8d0dc', '#7a8698'); circle(0, 0, 5, '#4a5568'); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); circle(0, 0, 2, '#e8edf4'); }
  else if (kind === 'sound' || kind === 'mute') { ctx.beginPath(); ctx.moveTo(-13, -5); ctx.lineTo(-7, -5); ctx.lineTo(0, -12); ctx.lineTo(0, 12); ctx.lineTo(-7, 5); ctx.lineTo(-13, 5); ctx.closePath(); fillOut('#f4d27a', '#c88a28', 2.2); if (kind === 'sound') { ctx.strokeStyle = INK; ctx.lineWidth = 5; for (const r of [6, 11]) { ctx.beginPath(); ctx.arc(1, 0, r, -0.9, 0.9); ctx.stroke(); } ctx.strokeStyle = '#4a9aea'; ctx.lineWidth = 2.6; for (const r of [6, 11]) { ctx.beginPath(); ctx.arc(1, 0, r, -0.9, 0.9); ctx.stroke(); } } else { ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(5, -6); ctx.lineTo(14, 6); ctx.moveTo(14, -6); ctx.lineTo(5, 6); ctx.stroke(); ctx.strokeStyle = '#e04a3a'; ctx.lineWidth = 3; ctx.stroke(); } }
  else if (kind === 'pause') { for (const sx of [-8, 3]) { rr(sx, -11, 6.5, 22, 2.5); fillOut('#ffffff', '#c8d0dc', 2); } }
  // action-button glyphs: white with a dark outline so they read on any colour
  else if (kind === 'duck') { for (const [yy, a] of [[-7, 1], [3, 0.8]]) { ctx.beginPath(); ctx.moveTo(-11, yy - 5); ctx.lineTo(0, yy + 6); ctx.lineTo(11, yy - 5); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 4.4; ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.stroke(); } }
  else if (kind === 'stomp') { ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(6, -14); ctx.lineTo(6, -1); ctx.lineTo(12, -1); ctx.lineTo(0, 11); ctx.lineTo(-12, -1); ctx.lineTo(-6, -1); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 3.4; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(-13, 14); ctx.lineTo(13, 14); ctx.stroke(); ctx.lineWidth = 1.8; ctx.strokeStyle = '#ffe08a'; ctx.stroke(); ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 15, 9); ctx.lineTo(sd * 19, 5); ctx.stroke(); } }
  else if (kind === 'dash') { ctx.strokeStyle = INK; ctx.lineWidth = 6.4; for (const [yy, x0, x1] of [[-9, -14, -2], [0, -14, 4], [9, -14, -2]]) { ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); } ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; for (const [yy, x0, x1] of [[-9, -14, -2], [0, -14, 4], [9, -14, -2]]) { ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(3, -12); ctx.lineTo(15, 0); ctx.lineTo(3, 12); ctx.lineTo(6, 0); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke(); }
  else if (kind === 'roar') { // T-Rex head, mouth wide open: dark throat, upper and lower teeth, brow, sound waves
    ctx.beginPath(); ctx.moveTo(-3, 1); ctx.lineTo(15, -2); ctx.lineTo(13, 12); ctx.lineTo(-2, 11); ctx.closePath(); ctx.fillStyle = '#8a1c22'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); ctx.beginPath(); ctx.ellipse(6, 8, 5, 2.4, 0, 0, 7); ctx.fillStyle = '#e8606a'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, 3); ctx.lineTo(14, 9); ctx.quadraticCurveTo(16, 13, 11, 13.5); ctx.lineTo(-3, 12); ctx.quadraticCurveTo(-9, 10, -5, 3); ctx.closePath(); ctx.fillStyle = '#eef1f6'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14, 4); ctx.quadraticCurveTo(-16, -9, -5, -12); ctx.quadraticCurveTo(6, -15, 13, -9); ctx.quadraticCurveTo(17, -7, 16, -3); ctx.lineTo(15, -1.5); ctx.lineTo(-3, 2); ctx.quadraticCurveTo(-10, 5, -14, 4); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.lineWidth = 1.2; ctx.strokeStyle = INK; for (const tx of [3, 7.5, 12]) { ctx.beginPath(); ctx.moveTo(tx - 2, 0.2 - (tx - 3) * 0.1); ctx.lineTo(tx, 5 - (tx - 3) * 0.1); ctx.lineTo(tx + 2, -0.3 - (tx - 3) * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); } for (const tx of [3, 8, 12.5]) { ctx.beginPath(); ctx.moveTo(tx - 1.8, 4.6 + (tx - 3) * 0.55); ctx.lineTo(tx, 0.6 + (tx - 3) * 0.55); ctx.lineTo(tx + 1.8, 4.9 + (tx - 3) * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    circle(-3, -5.5, 3.4, '#fff'); ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(-3, -5.5, 3.4, 0, 7); ctx.stroke(); circle(-2.4, -5.3, 1.7, INK); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-9, -9.5); ctx.lineTo(1, -8.2); ctx.stroke(); circle(11, -6.6, 1.1, INK);
    ctx.strokeStyle = INK; ctx.lineWidth = 4.8; for (const r of [6, 10.5]) { ctx.beginPath(); ctx.arc(9, 2, r + 8, -0.6, 0.6); ctx.stroke(); } ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2.2; for (const r of [6, 10.5]) { ctx.beginPath(); ctx.arc(9, 2, r + 8, -0.6, 0.6); ctx.stroke(); } }
  else if (kind === 'fire') { ctx.beginPath(); ctx.moveTo(0, -15); ctx.bezierCurveTo(10, -6, 14, 2, 9, 10); ctx.bezierCurveTo(5, 16, -5, 16, -9, 10); ctx.bezierCurveTo(-14, 2, -6, -4, -3, -10); ctx.bezierCurveTo(-2, -5, 1, -6, 0, -15); ctx.closePath(); ctx.fillStyle = vgrad(-15, 15, '#ffe27a', '#ff4a10'); ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke(); ctx.beginPath(); ctx.moveTo(1, -2); ctx.bezierCurveTo(6, 3, 6, 9, 0, 11); ctx.bezierCurveTo(-5, 9, -4, 4, 1, -2); ctx.fillStyle = '#fff6c0'; ctx.fill(); }
  ctx.restore();
}
const icon = k => (cx, cy, s) => ico(k, cx, cy, s);
function hitButtons(x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { if (!b.silent) SFX.click(); b.cb(); return true; }
  }
  return false;
}

// particles (world coordinates)
let parts = [];
function burst(x, y, n, colors, spd = 300, grav = 900, size = 6, life = 0.8) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random() * 0.7), l = life * (0.6 + Math.random() * 0.6);
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.3, g: grav, s: size * (0.5 + Math.random() * 0.8), life: l, max: l, c: colors[i % colors.length] });
  }
}
function updateParts(dt) { for (const p of parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } parts = parts.filter(p => p.life > 0); }
function drawParts(cam = 0) { // round sparks to match the vector look; squares in low-power mode
  for (const p of parts) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.c;
    if (LOWFX) ctx.fillRect(p.x - cam - p.s / 2, p.y - p.s / 2, p.s, p.s);
    else { ctx.beginPath(); ctx.arc(p.x - cam, p.y, p.s * 0.6, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}

const flakes = []; for (let i = 0; i < 110; i++) flakes.push({ x: Math.random() * W, y: Math.random() * H, s: 1.5 + Math.random() * 3, v: 30 + Math.random() * 60, ph: Math.random() * 6 });
function drawSnow(amount = 1) {
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  const n = Math.floor(flakes.length * amount);
  for (let i = 0; i < n; i++) { const f = flakes[i]; f.y += f.v * DT; f.ph += DT; if (f.y > H + 5) { f.y = -5; f.x = Math.random() * W; } circle(f.x + Math.sin(f.ph) * 14, f.y, f.s, 'rgba(255,255,255,.85)'); }
}
function drawEmbers() {
  for (let i = 0; i < 50; i++) { const f = flakes[i]; const y = (H - ((T * f.v * 1.3 + f.y * 3) % (H + 20))); const x = f.x + Math.sin(T + f.ph) * 20; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 5 + i); circle(x, y, f.s * 0.8, i % 2 ? '#ff9a3c' : '#ffd166'); }
  ctx.globalAlpha = 1;
}

// toasts & tips
let toasts = [];
const BOSS_QUIET = /Fähnchen|Helfer kommen|Noch \d Mal|erschöpft|Boss selbst/; // the boss bar and the roar prompt already say this
function toast(text, color = '#fff') { const inBoss = scene === 'play' && G && G.boss; if (scene === 'play' && G && G.L && G.L.bossX && G.p.wx >= G.L.bossX - 5 && BOSS_QUIET.test(text)) return; if (inBoss) toasts.length = 0; const ex = toasts.find(q => q.text === text); if (ex) { ex.t = 2.6; return; } toasts.push({ text, color, t: 2.6 }); if (toasts.length > 3) toasts.shift(); }
function drawToasts() {
  const inBoss = scene === 'play' && G && G.boss, ty = inBoss ? 78 : 196;
  toasts.forEach((t, i) => { t.t -= DT; const a = clamp(t.t * 2, 0, 1); ctx.globalAlpha = a; const fs = inBoss ? 19 : 24, bh = inBoss ? 32 : 40, sp = inBoss ? 38 : 46; setFont(fs); const w = ctx.measureText(t.text).width + 36; rr(W / 2 - w / 2, ty + i * sp, w, bh, bh / 2); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill(); txt(t.text, W / 2, ty + bh / 2 + 1 + i * sp, fs, t.color); ctx.globalAlpha = 1; });
  toasts = toasts.filter(t => t.t > 0);
}
