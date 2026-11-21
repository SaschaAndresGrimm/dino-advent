'use strict';
/* Olis Dino-Rettung – ein Weihnachtsgeschenk von Goetti */
(() => {
// =====================================================================
// Setup
// =====================================================================
const W = 960, H = 540, GROUND = 440, GRAV = 2300;
const FONT = '"Trebuchet MS","Segoe UI",system-ui,sans-serif';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let DPR = 1, SC = 1, OX = 0, OY = 0, T = 0, DT = 0;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  SC = Math.min(w / W, h / H); OX = (w - W * SC) / 2; OY = (h - H * SC) / 2;
}
window.addEventListener('resize', resize); resize();

// =====================================================================
// Save game
// =====================================================================
const SAVE_KEY = 'olisDinoRettung.v1';
let save = { rexName: '', babyName: '', unlocked: 0, eggs: [[0,0,0],[0,0,0],[0,0,0],[0,0,0]], amber: 0, finished: false, muted: false, tutorialDone: false };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) save = Object.assign(save, s); } catch (e) {}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// =====================================================================
// Sound (synthesised, no files needed)
// =====================================================================
let AC = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
  if (save.muted || !AC) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol = 0.3, freq = 800, delay = 0) {
  if (save.muted || !AC) return;
  const t = AC.currentTime + delay, n = Math.floor(AC.sampleRate * dur);
  const buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = AC.createBufferSource(); src.buffer = buf;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(AC.destination); src.start(t);
}
const SFX = {
  jump() { tone(330, 0.16, 'square', 0.07, 660); },
  jump2() { tone(500, 0.16, 'square', 0.07, 950); },
  roar() { noise(0.7, 0.45, 450); tone(120, 0.65, 'sawtooth', 0.16, 50); tone(180, 0.5, 'sawtooth', 0.09, 70); },
  amber() { tone(1250, 0.07, 'sine', 0.08); tone(1680, 0.1, 'sine', 0.07, null, 0.05); },
  egg() { [660, 880, 1100, 1320, 1760].forEach((f, i) => tone(f, 0.28, 'triangle', 0.14, null, i * 0.07)); },
  hurt() { tone(320, 0.35, 'sawtooth', 0.14, 90); },
  wrong() { tone(220, 0.2, 'square', 0.09, 160); tone(160, 0.25, 'square', 0.09, 120, 0.15); },
  right() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.14, null, i * 0.1)); },
  dig() { noise(0.18, 0.15, 1800); noise(0.18, 0.15, 1800, 0.25); noise(0.18, 0.15, 1800, 0.5); },
  smash() { noise(0.35, 0.4, 350); tone(90, 0.3, 'square', 0.12, 40); },
  click() { tone(720, 0.05, 'square', 0.05); },
  crack() { noise(0.12, 0.35, 3500); tone(900, 0.08, 'triangle', 0.08, 500); },
  flag() { tone(660, 0.12, 'triangle', 0.12); tone(990, 0.2, 'triangle', 0.12, null, 0.12); },
  pop() { tone(400, 0.2, 'sine', 0.15, 1200); },
};
function jingle() { // "Jingle Bells" refrain (public domain)
  const E = 659, D = 587, C = 523, G = 784, F = 698;
  const notes = [[E,1],[E,1],[E,2],[E,1],[E,1],[E,2],[E,1],[G,1],[C,1.5],[D,.5],[E,4],
    [F,1],[F,1],[F,1.5],[F,.5],[F,1],[E,1],[E,1],[E,.5],[E,.5],[E,1],[D,1],[D,1],[E,1],[D,2],[G,2],
    [E,1],[E,1],[E,2],[E,1],[E,1],[E,2],[E,1],[G,1],[C,1.5],[D,.5],[E,4],
    [F,1],[F,1],[F,1.5],[F,.5],[F,1],[E,1],[E,1],[E,.5],[E,.5],[G,1],[G,1],[F,1],[D,1],[C,4]];
  let t = 0; const beat = 0.21;
  for (const [f, d] of notes) {
    tone(f, d * beat * 0.95, 'triangle', 0.11, null, t);
    tone(f / 2, d * beat * 0.9, 'sine', 0.05, null, t);
    if (d >= 2) tone(f * 2, 0.15, 'sine', 0.03, null, t);
    t += d * beat;
  }
}

// Background music: tiny step sequencer, one cheerful loop per world (pentatonic, kid-friendly)
const MUSIC = {
  map: { bpm: 92, root: 261.6, wave: 'triangle', bass: [0,null,7,null, 5,null,7,null, 0,null,7,null, 9,null,7,null], lead: [12,null,16,null, 19,null,16,null, 14,null,17,null, 21,null,19,null] },
  0: { bpm: 118, root: 220, wave: 'triangle', bass: [0,null,0,12, 5,null,5,17, 7,null,7,19, 5,null,4,null], lead: [12,null,16,19, null,16,14,null, 12,null,9,12, 14,null,null,null] },
  1: { bpm: 112, root: 196, wave: 'square', bass: [0,null,7,null, 0,null,7,null, 5,null,12,null, 7,null,2,null], lead: [12,14,16,null, 19,null,16,14, 12,null,null,9, 7,null,9,null] },
  2: { bpm: 104, root: 329.6, wave: 'sine', bass: [0,null,null,7, null,null,5,null, 0,null,null,7, null,null,9,null], lead: [24,null,19,null, 21,null,16,null, 19,null,14,null, 16,null,12,null] },
  3: { bpm: 136, root: 174.6, wave: 'square', bass: [0,0,12,0, 0,0,10,0, 0,0,12,0, 7,7,10,12], lead: [null,null,15,null, 17,null,15,12, null,null,10,null, 12,null,null,null] },
};
const mus = { key: null, step: 0, next: 0 };
function musicTick(key) {
  if (!AC || !key) { mus.key = null; return; }
  if (mus.key !== key) { mus.key = key; mus.step = 0; mus.next = AC.currentTime + 0.1; }
  if (mus.next < AC.currentTime - 0.05) mus.next = AC.currentTime + 0.05; // after a background pause
  const m = MUSIC[key], st = 60 / m.bpm / 4;
  while (mus.next < AC.currentTime + 0.15) {
    const i = mus.step % 16, b = m.bass[i], l = m.lead[i], d = mus.next - AC.currentTime;
    if (b != null) tone(m.root / 2 * Math.pow(2, b / 12), st * 1.7, 'triangle', 0.055, null, d);
    if (l != null) tone(m.root * Math.pow(2, l / 12), st * 0.9, m.wave, m.wave === 'square' ? 0.018 : 0.03, null, d);
    mus.next += st; mus.step++;
  }
}
function speak(text) {
  try { if (!('speechSynthesis' in window) || save.muted) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'de-DE'; u.rate = 0.95; speechSynthesis.speak(u); } catch (e) {}
}

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
function fmt(s) { return s.replace(/\{rex\}/g, save.rexName || 'Rexi').replace(/\{baby\}/g, save.babyName || 'Baby'); }
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

// immediate-mode buttons (rebuilt every frame)
let buttons = [];
function button(label, x, y, w, h, cb, o = {}) {
  buttons.push({ x, y, w, h, cb, silent: o.silent });
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(x, y + 5, w, h, h / 2.4); ctx.fill(); ctx.restore();
  rr(x, y, w, h, h / 2.4); ctx.fillStyle = o.color || '#f4b400'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();
  txt(label, x + w / 2, y + h / 2 + 1, o.size || 26, o.textColor || '#2b1a00');
}
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
function drawParts(cam = 0) { for (const p of parts) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(p.x - cam - p.s / 2, p.y - p.s / 2, p.s, p.s); } ctx.globalAlpha = 1; }

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
function toast(text, color = '#fff') { toasts.push({ text, color, t: 2.6 }); if (toasts.length > 3) toasts.shift(); }
function drawToasts() {
  toasts.forEach((t, i) => { t.t -= DT; const a = clamp(t.t * 2, 0, 1); ctx.globalAlpha = a; setFont(24); const w = ctx.measureText(t.text).width + 40; rr(W / 2 - w / 2, 196 + i * 46, w, 40, 20); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill(); txt(t.text, W / 2, 217 + i * 46, 24, t.color); ctx.globalAlpha = 1; });
  toasts = toasts.filter(t => t.t > 0);
}

// =====================================================================
// Game data
// =====================================================================
const WORLDS = [
  { name: 'Dschungel', speed: 270, segs: 24, patterns: ['rock', 'rock', 'pit', 'pit', 'amber', 'raptor', 'plat', 'boulder'],
    startTip: 'Willkommen im Dschungel! Sammle Bernstein und finde die 3 Dino-Eier.',
    riddle: { q: 'Ich habe drei Hörner und einen grossen Knochenschild am Nacken. Wer bin ich?', a: ['Triceratops', 'T-Rex', 'Stegosaurus'], ok: 0 },
    sky: ['#0f3b3a', '#8cc49b'], far: '#2f6a50', mid: '#1f4a38', ground: '#4a3020', top: '#3f9b3a', dots: '#3a2416', edge: '#2e1d12', plat: '#6b4a2b', platTop: '#4caf50',
    rock: '#7b6b5a', deco: '#173d2c', volcS: 0.45, volcCol: '#35544a', egg: '#f6e7b0', eggSpot: '#6aa84f' },
  { name: 'Canyon', speed: 295, segs: 30, patterns: ['rock', 'rock2', 'pit', 'pit', 'raptor', 'ptero', 'ptero', 'boulder', 'plat', 'amber'],
    startTip: 'Der heisse Canyon! Hier fliegen Flugsaurier herum.',
    riddle: { q: 'Ich kann fliegen, bin aber gar kein Dinosaurier. Wer bin ich?', a: ['Pteranodon', 'Velociraptor', 'Stegosaurus'], ok: 0 },
    sky: ['#d9702e', '#f7d08a'], far: '#c0643a', mid: '#9a4a2a', ground: '#b5603a', top: '#d98b4e', dots: '#8e4526', edge: '#6e2f17', plat: '#8b4a2b', platTop: '#e0a060',
    rock: '#8d5a3b', deco: '#7a3a1e', volcS: 0.65, volcCol: '#9c5a3c', mesa: true, egg: '#cfe8ff', eggSpot: '#e07b39' },
  { name: 'Eiszeit', speed: 315, segs: 34, patterns: ['rock', 'rock2', 'pit', 'icicle', 'icicle', 'raptor', 'ptero', 'boulder', 'plat', 'amber'],
    startTip: 'Brrr, die Eiszeit! Hier riecht es schon ein bisschen nach Weihnachten…',
    riddle: { q: 'Chili findet 7 Karotten und knabbert 3 davon auf. Wie viele Karotten sind noch übrig?', a: ['4', '3', '5'], ok: 0 },
    sky: ['#0b1f3f', '#5d86b8'], far: '#c9dcf0', mid: '#8fb0d6', ground: '#5f7591', top: '#f4f8ff', dots: '#4b5f7a', edge: '#3c4f68', plat: '#9fc3e6', platTop: '#ffffff',
    rock: '#7f93ab', deco: '#1d3b4f', volcS: 0.85, volcCol: '#3a4f6e', stars: true, snow: true, egg: '#e8f4ff', eggSpot: '#5aa0e0' },
  { name: 'Vulkan', speed: 335, segs: 36, patterns: ['pit', 'pit', 'geyser', 'geyser', 'raptor', 'ptero', 'boulder', 'rock2', 'plat'],
    startTip: 'Der Vulkan! Irgendwo hier ist das goldene Ei…',
    riddle: { q: 'Welches Tier von heute ist ein Verwandter der Dinosaurier?', a: ['Huhn', 'Hase', 'Goldfisch'], ok: 0, wrongMsg: { 1: 'Chili: Hey! Ich bin doch kein Dino!' } },
    sky: ['#1a0505', '#8a2a10'], far: '#3a0f0a', mid: '#250807', ground: '#2a1a16', top: '#4a2a20', dots: '#ff5a1f', edge: '#170c0a', plat: '#3a2722', platTop: '#ff7a2a',
    rock: '#4a3a36', deco: '#140404', volcS: 1.25, volcCol: '#1c0807', lava: true, egg: '#ffd9c2', eggSpot: '#c0392b' },
];

const FACTS = [
  { name: 'T-Rex', text: 'Der Tyrannosaurus rex hatte rund 60 Zähne. Die grössten waren mit Wurzel so lang wie eine Banane!' },
  { name: 'Triceratops', text: 'Der Triceratops hatte drei Hörner und einen riesigen Knochenschild am Nacken. Er frass nur Pflanzen.' },
  { name: 'Brachiosaurus', text: 'Der Brachiosaurus war so hoch wie ein vierstöckiges Haus. Mit seinem langen Hals frass er Blätter ganz oben in den Bäumen.' },
  { name: 'Velociraptor', text: 'Der Velociraptor war nur etwa so gross wie ein Truthahn – und er hatte Federn!' },
  { name: 'Pteranodon', text: 'Der Pteranodon war gar kein Dinosaurier, sondern ein Flugsaurier. Seine Flügel waren breiter als ein Auto lang ist!' },
  { name: 'Stegosaurus', text: 'Der Stegosaurus hatte grosse Platten auf dem Rücken und Stacheln am Schwanz. Sein Gehirn war nur so gross wie eine Walnuss!' },
  { name: 'Wollhaarmammut', text: 'Das Wollhaarmammut lebte in der Eiszeit – viele Millionen Jahre nach den Dinosauriern. Sein dickes Fell hielt es warm.' },
  { name: 'Ankylosaurus', text: 'Der Ankylosaurus war gepanzert wie ein Ritter und hatte eine schwere Knochenkeule am Schwanz.' },
  { name: 'Dino-Eier', text: 'Alle Dinosaurier schlüpften aus Eiern. Die grössten Dino-Eier waren fast so gross wie ein Fussball!' },
  { name: 'Spinosaurus', text: 'Der Spinosaurus hatte ein riesiges Segel auf dem Rücken. Er konnte schwimmen und frass am liebsten Fische.' },
  { name: 'Huhn', text: 'Vögel stammen von Dinosauriern ab. Ein Huhn ist also ein entfernter Verwandter vom T-Rex!' },
  { name: 'Meteorit', text: 'Vor etwa 66 Millionen Jahren schlug ein riesiger Meteorit auf der Erde ein. Danach starben die meisten Dinosaurier aus.' },
];

const WHO = { goetti: 'Goetti', chili: 'Chili', rex: () => save.rexName || 'T-Rex', mami: 'Mami', papi: 'Papi', fabio: 'Fabio' };

// =====================================================================
// Character drawing
// =====================================================================
function drawOli(x, y, ph, hat) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2f5aa8'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 10, y + 12); ctx.stroke();
  rr(x - 10, y - 28, 20, 28, 7); ctx.fillStyle = '#e0473c'; ctx.fill();
  ctx.fillStyle = '#2e9e5b'; ctx.fillRect(x - 9, y - 30, 18, 5);
  const hy = y - 14 + Math.sin(ph) * 2;
  ctx.strokeStyle = '#e0473c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + 4, y - 21); ctx.lineTo(x + 18, hy); ctx.stroke();
  circle(x + 19, hy, 3.5, '#f2c9a0');
  circle(x + 2, y - 40, 11, '#f2c9a0');
  ctx.fillStyle = '#6b4226'; ctx.beginPath(); ctx.arc(x + 1, y - 43, 11, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
  circle(x + 7, y - 41, 1.7, '#222');
  ctx.strokeStyle = '#8a3b2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + 6, y - 37, 3, 0.2, Math.PI * 0.8); ctx.stroke();
  if (hat) {
    ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.arc(x + 1, y - 45, 11, Math.PI, Math.PI * 2); ctx.fill();
    rr(x - 11, y - 47, 24, 6, 3); ctx.fillStyle = '#fff'; ctx.fill();
    circle(x + 1, y - 58, 5, '#fff');
  }
}

function rexLeg(x, ph, col, dark, air) {
  const sw = air ? 0.7 : Math.sin(ph), lift = air ? 6 : Math.max(0, Math.cos(ph)) * 10;
  ell(x - 4, -48, 17, 24, 0.25, col);
  const ax = x + sw * 14, ay = -10 - lift;
  ctx.lineCap = 'round';
  ctx.strokeStyle = col; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x + 4, -32); ctx.lineTo(ax, ay); ctx.stroke();
  ctx.strokeStyle = dark; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 16, ay + 8); ctx.stroke();
}
function drawRex(x, y, s, ph, jaw, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(o.flip ? -s : s, s);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  const body = o.body || '#2e8b57', dark = o.dark || '#1d6a40', belly = o.belly || '#b7d98b';
  ctx.translate(0, o.air ? 0 : -Math.abs(Math.sin(ph)) * 3);
  rexLeg(-6, ph + Math.PI, dark, '#0f4528', o.air);
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-15, -84); ctx.quadraticCurveTo(-70, -82, -120, -62 + Math.sin(ph * 0.5) * 5); ctx.quadraticCurveTo(-70, -56, -15, -46); ctx.closePath(); ctx.fill();
  ell(5, -66, 46, 28, -0.18, body);
  ell(14, -53, 32, 13, -0.25, belly);
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(22, -88); ctx.quadraticCurveTo(42, -102, 52, -96); ctx.lineTo(52, -72); ctx.quadraticCurveTo(38, -60, 28, -58); ctx.closePath(); ctx.fill();
  // lower jaw
  ctx.save(); ctx.translate(46, -92); ctx.rotate(jaw * 0.5);
  if (jaw > 0.05) { ctx.fillStyle = '#8b1e1e'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(46, -2); ctx.lineTo(40, 8); ctx.lineTo(0, 8); ctx.fill(); }
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(44, 2); ctx.quadraticCurveTo(47, 10, 38, 12); ctx.lineTo(0, 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(12 + i * 7, 2); ctx.lineTo(15 + i * 7, -4); ctx.lineTo(18 + i * 7, 2); ctx.fill(); }
  ctx.restore();
  // upper head
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(38, -86); ctx.lineTo(40, -108); ctx.quadraticCurveTo(52, -125, 80, -119); ctx.quadraticCurveTo(99, -113, 97, -100); ctx.lineTo(95, -92); ctx.lineTo(46, -89); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(56 + i * 6.5, -91); ctx.lineTo(59 + i * 6.5, -84); ctx.lineTo(62 + i * 6.5, -91); ctx.fill(); }
  ell(65, -114, 11, 4, -0.2, dark);
  circle(66, -107, 5, '#fff'); circle(68, -107, 2.6, '#222');
  circle(91, -108, 1.8, dark);
  ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-34 + i * 15, -90 + i); ctx.lineTo(-28 + i * 15, -78); ctx.stroke(); }
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(33, -62); ctx.lineTo(44, -54 + Math.sin(ph) * 2); ctx.lineTo(50, -58); ctx.stroke();
  rexLeg(6, ph, body, dark, o.air);
  if (o.rider) drawOli(-4, -90, ph, o.hat);
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawRaptor(x, y, s, ph, flip, o = {}) {
  const col = o.col || '#a0522d', dark = o.dark || '#5a2d12';
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  if (o.alpha != null) ctx.globalAlpha = Math.max(0, o.alpha);
  const leg = (p, c) => { const sw = Math.sin(p); ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-4, -36); ctx.lineTo(-2 + sw * 10, -18); ctx.lineTo(-6 + sw * 12, -2 - Math.max(0, Math.cos(p)) * 5); ctx.lineTo(5 + sw * 12, 0); ctx.stroke(); };
  leg(ph + Math.PI, dark);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-12, -50); ctx.quadraticCurveTo(-50, -56, -80, -64 + Math.sin(ph) * 3); ctx.quadraticCurveTo(-50, -44, -12, -36); ctx.closePath(); ctx.fill();
  ell(0, -44, 26, 13, -0.25, col);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(10, -54); ctx.quadraticCurveTo(22, -70, 30, -73); ctx.lineTo(54, -68); ctx.quadraticCurveTo(57, -62, 50, -60); ctx.lineTo(32, -60); ctx.quadraticCurveTo(24, -48, 16, -38); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f39c34'; ctx.beginPath(); ctx.moveTo(26, -72); ctx.lineTo(16, -82); ctx.lineTo(32, -74); ctx.fill(); ctx.beginPath(); ctx.moveTo(22, -70); ctx.lineTo(10, -76); ctx.lineTo(26, -71); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-18 + i * 9, -55); ctx.lineTo(-14 + i * 9, -46); ctx.stroke(); }
  circle(38, -67, 3.3, '#ffde59'); circle(39, -67, 1.6, '#111');
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(40, -61); ctx.lineTo(52, -62); ctx.stroke();
  ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(14, -44); ctx.lineTo(24, -36); ctx.stroke();
  ctx.fillStyle = '#f39c34'; ctx.beginPath(); ctx.moveTo(12, -46); ctx.lineTo(28, -38); ctx.lineTo(16, -33); ctx.fill();
  leg(ph, col);
  if (o.crown) { ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(26, -74); ctx.lineTo(27, -88); ctx.lineTo(32, -80); ctx.lineTo(37, -92); ctx.lineTo(41, -80); ctx.lineTo(46, -88); ctx.lineTo(46, -72); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawPtero(x, y, s, ph, flip, o = {}) {
  const col = '#8e5aa8', dark = '#5d3470';
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  if (o.alpha != null) ctx.globalAlpha = Math.max(0, o.alpha);
  const tip = -48 * Math.cos(ph);
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(4 + tip * 0.2, tip * 0.9 - 4); ctx.lineTo(12, -2); ctx.fill();
  ell(0, 0, 24, 8, 0, col);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(14, -6); ctx.lineTo(50, 0); ctx.lineTo(16, 3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(18, -5); ctx.lineTo(-6, -18); ctx.lineTo(14, -9); ctx.fill();
  circle(21, -3, 2.5, '#ffde59');
  ctx.fillStyle = '#b07cc6'; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-2 + tip * 0.3, tip); ctx.lineTo(14, 0); ctx.fill();
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawChili(x, y, s, ph, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const col = '#c8814a', light = '#f3dcc4';
  ell(-4, -26, 5, 15, -0.35 + Math.sin(ph) * 0.1, '#a8693a');
  ell(-16, -17, 7, 7, 0, '#fff');
  ell(0, -15, 18, 13, 0, col);
  ell(8, -3, 9, 4, 0, light);
  circle(15, -24, 11, col);
  ell(10, -42, 5, 15, -0.15 + Math.sin(ph * 1.3) * 0.08, col);
  ell(10, -42, 2.5, 11, -0.15 + Math.sin(ph * 1.3) * 0.08, '#f4a6b8');
  ell(4, -11, 9, 6, 0, light);
  circle(19, -26, 2.6, '#222'); circle(20, -27, 0.9, '#fff');
  circle(26, -21, 2.2, '#f48fb1');
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(26, -20); ctx.lineTo(34, -22); ctx.moveTo(26, -20); ctx.lineTo(33, -17); ctx.stroke();
  ctx.restore();
}

function drawLongneck(x, y, s, col, ph, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const dark = 'rgba(0,0,0,.22)';
  for (const lx of [-38, -14, 14, 36]) { rr(lx - 7, -45, 15, 45, 6); ctx.fillStyle = col; ctx.fill(); rr(lx - 7, -45, 15, 45, 6); ctx.fillStyle = (lx === -14 || lx === 36) ? dark : 'rgba(0,0,0,0)'; ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-45, -60); ctx.quadraticCurveTo(-90, -50, -115, -28); ctx.quadraticCurveTo(-80, -40, -45, -40); ctx.fill();
  ell(0, -56, 55, 30, 0, col);
  ctx.strokeStyle = col; ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(35, -66); ctx.quadraticCurveTo(58, -110, 62 + Math.sin(ph) * 3, -140); ctx.stroke();
  ell(72 + Math.sin(ph) * 3, -146, 20, 12, 0.1, col);
  circle(76 + Math.sin(ph) * 3, -151, 3, '#222');
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(80 + Math.sin(ph) * 3, -144, 5, 0.3, 1.6); ctx.stroke();
  for (let i = 0; i < 4; i++) ell(-25 + i * 16, -70 + (i % 2) * 8, 6, 4, 0, dark);
  ctx.restore();
}

function drawTrike(x, y, s, col, ph, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  for (const lx of [-18, 14]) { rr(lx - 6, -22, 12, 22, 5); ctx.fillStyle = col; ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-28, -30); ctx.quadraticCurveTo(-50, -24, -56, -12); ctx.quadraticCurveTo(-40, -18, -26, -18); ctx.fill();
  ell(0, -30, 32, 19, 0, col);
  ctx.fillStyle = '#ffc86b'; ctx.beginPath(); ctx.arc(26, -40, 20, Math.PI * 0.75, Math.PI * 1.95); ctx.fill();
  ell(38, -32, 15, 11, 0, col);
  ctx.strokeStyle = '#fff4dc'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(38, -40); ctx.lineTo(54, -52); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(46, -34); ctx.lineTo(56, -38); ctx.stroke();
  circle(42, -35, 2.4, '#222');
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(46, -28, 4, 0.2, 1.5); ctx.stroke();
  ctx.restore();
}

function drawBaby(x, y, s, ph, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const col = '#7fd08a', dark = '#4ea35b';
  ctx.strokeStyle = dark; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(-4 + Math.sin(ph) * 5, 0); ctx.moveTo(6, -12); ctx.lineTo(6 - Math.sin(ph) * 5, 0); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-10, -22); ctx.quadraticCurveTo(-28, -20, -34, -10); ctx.quadraticCurveTo(-22, -12, -8, -12); ctx.fill();
  ell(0, -20, 16, 13, 0, col);
  ell(14, -38, 15, 13, 0, col);
  circle(19, -41, 4, '#fff'); circle(20, -41, 2.2, '#222');
  ctx.strokeStyle = '#2d6b36'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(20, -34, 5, 0.2, 1.4); ctx.stroke();
  // santa hat
  ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(2, -48); ctx.quadraticCurveTo(10, -72, -8, -70); ctx.lineTo(26, -48); ctx.closePath(); ctx.fill();
  rr(0, -52, 28, 7, 3.5); ctx.fillStyle = '#fff'; ctx.fill();
  circle(-8, -70, 5, '#fff');
  ctx.restore();
}

function drawGoettiHead(cx, cy, r) {
  circle(cx - r * 0.95, cy + 2, r * 0.22, '#e8b48a'); circle(cx + r * 0.95, cy + 2, r * 0.22, '#e8b48a');
  circle(cx, cy, r, '#f0c49b');
  ctx.strokeStyle = '#333'; ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath(); ctx.arc(cx - r * 0.38, cy - r * 0.05, r * 0.26, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + r * 0.38, cy - r * 0.05, r * 0.26, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r * 0.12, cy - r * 0.08); ctx.lineTo(cx + r * 0.12, cy - r * 0.08); ctx.stroke();
  circle(cx - r * 0.38, cy - r * 0.05, r * 0.08, '#222'); circle(cx + r * 0.38, cy - r * 0.05, r * 0.08, '#222');
  ctx.strokeStyle = '#8a3b2a'; ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.beginPath(); ctx.arc(cx, cy + r * 0.3, r * 0.3, 0.25, Math.PI - 0.25); ctx.stroke();
  // safari hat
  ell(cx, cy - r * 0.62, r * 1.4, r * 0.28, 0, '#b8955a');
  ctx.fillStyle = '#d4b06e'; ctx.beginPath(); ctx.moveTo(cx - r * 0.85, cy - r * 0.62); ctx.quadraticCurveTo(cx - r * 0.8, cy - r * 1.5, cx, cy - r * 1.5); ctx.quadraticCurveTo(cx + r * 0.8, cy - r * 1.5, cx + r * 0.85, cy - r * 0.62); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6b4a2b'; ctx.fillRect(cx - r * 0.85, cy - r * 0.86, r * 1.7, r * 0.2);
}
function drawGoetti(x, y, s, wave) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#5b4636'; rr(-16, -50, 13, 50, 5); ctx.fill(); rr(3, -50, 13, 50, 5); ctx.fill();
  ctx.fillStyle = '#3b2a1e'; rr(-20, -8, 20, 8, 4); ctx.fill(); rr(1, -8, 20, 8, 4); ctx.fill();
  rr(-22, -105, 44, 60, 14); ctx.fillStyle = '#7a8f4a'; ctx.fill();
  ctx.fillStyle = '#5e7036'; ctx.fillRect(-2, -100, 4, 52);
  ctx.strokeStyle = '#7a8f4a'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-18, -95); ctx.lineTo(-26, -58); ctx.stroke();
  const a = wave ? Math.sin(T * 6) * 0.4 : 0;
  ctx.beginPath(); ctx.moveTo(18, -95); ctx.lineTo(18 + Math.cos(-1.1 + a) * 36, -95 + Math.sin(-1.1 + a) * 36); ctx.stroke();
  circle(18 + Math.cos(-1.1 + a) * 40, -95 + Math.sin(-1.1 + a) * 40, 6, '#f0c49b');
  circle(-26, -54, 6, '#f0c49b');
  drawGoettiHead(0, -128, 22);
  ctx.restore();
}

function drawEgg(x, y, r, col, spot, glow = 0, rot = 0, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
  if (glow > 0) { const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.2); g.addColorStop(0, `rgba(255,240,150,${0.55 * glow})`); g.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.62, -r, r * 0.85, -r * 0.1, r * 0.8, r * 0.3);
  ctx.bezierCurveTo(r * 0.72, r * 0.85, r * 0.3, r, 0, r);
  ctx.bezierCurveTo(-r * 0.3, r, -r * 0.72, r * 0.85, -r * 0.8, r * 0.3);
  ctx.bezierCurveTo(-r * 0.85, -r * 0.1, -r * 0.62, -r, 0, -r);
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.stroke();
  circle(-r * 0.3, -r * 0.15, r * 0.16, spot); circle(r * 0.3, r * 0.2, r * 0.2, spot); circle(-r * 0.12, r * 0.55, r * 0.12, spot);
  ctx.globalAlpha = alpha * 0.5; ell(-r * 0.3, -r * 0.5, r * 0.13, r * 0.24, 0.3, '#fff');
  ctx.restore();
}
function drawAmber(x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  g.addColorStop(0, '#ffe08a'); g.addColorStop(0.6, '#ffa520'); g.addColorStop(1, '#c0601a');
  ctx.fillStyle = g; ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(120,50,0,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  circle(x - r * 0.3, y - r * 0.3, r * 0.2, 'rgba(255,255,255,.7)');
}
function drawHeart(x, y, s, full) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath();
  ctx.moveTo(0, 8); ctx.bezierCurveTo(-2, 6, -14, -1, -14, -8); ctx.bezierCurveTo(-14, -15, -5, -17, 0, -10);
  ctx.bezierCurveTo(5, -17, 14, -15, 14, -8); ctx.bezierCurveTo(14, -1, 2, 6, 0, 8);
  ctx.fillStyle = full ? '#ff4d5e' : 'rgba(0,0,0,.35)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore();
}

function drawPortrait(who, cx, cy, r) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const bg = { goetti: '#cfe3b0', chili: '#ffe0c2', rex: '#bfe6cf', mami: '#ead7f5', papi: '#d3e6fb', fabio: '#ffe6c4' }[who] || '#eee';
  ctx.fillStyle = bg; ctx.fill(); ctx.clip();
  if (who === 'goetti') { drawGoettiHead(cx, cy + r * 0.25, r * 0.55); }
  else if (who === 'chili') { const s = r / 26; drawChili(cx - 10 * s, cy + 30 * s, s, T * 3); }
  else if (who === 'rex') { const s = r / 42; drawRex(cx - 68 * s, cy + 104 * s, s, 0, 0.3 + 0.2 * Math.sin(T * 8)); }
  else if (who === 'mami' || who === 'papi') { const s = r / 34; drawLongneck(cx - 72 * s, cy + 146 * s, s, who === 'mami' ? '#b07cc6' : '#4f8fd6', T * 2); }
  else if (who === 'fabio') { const s = r / 26; drawTrike(cx - 36 * s, cy + 36 * s, s, '#f39c34', 0); }
  ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = '#6b4a2b'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}

// =====================================================================
// Scenery
// =====================================================================
function drawVolcano(cx, base, s, col, erupt) {
  const hgt = 230 * s, wid = 300 * s;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx - wid, base);
  ctx.quadraticCurveTo(cx - wid * 0.35, base - hgt * 0.55, cx - wid * 0.16, base - hgt); ctx.lineTo(cx + wid * 0.16, base - hgt);
  ctx.quadraticCurveTo(cx + wid * 0.35, base - hgt * 0.55, cx + wid, base); ctx.closePath(); ctx.fill();
  const g = ctx.createRadialGradient(cx, base - hgt, 2, cx, base - hgt, wid * 0.45);
  g.addColorStop(0, `rgba(255,150,40,${0.45 + 0.35 * erupt})`); g.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, base - hgt, wid * 0.45, 0, Math.PI * 2); ctx.fill();
  if (erupt > 0) {
    ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); let px = cx - wid * 0.1 + i * wid * 0.1, py = base - hgt; ctx.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (i - 1) * wid * 0.08 + Math.sin(k + i) * 6 * s; py += hgt * 0.1; ctx.lineTo(px, py); } ctx.stroke(); }
  }
  for (let i = 0; i < 7; i++) {
    const k = ((T * 22 + i * 37) % 220);
    const r = (14 + k * 0.22) * s;
    ctx.fillStyle = erupt > 0.5 ? `rgba(60,40,40,${0.5 * (1 - k / 220)})` : `rgba(110,110,120,${0.4 * (1 - k / 220)})`;
    ctx.beginPath(); ctx.arc(cx + Math.sin(T * 0.7 + i) * 14 * s + k * 0.25 * s, base - hgt - k * s, r, 0, Math.PI * 2); ctx.fill();
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
function palm(x, b, h, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, b); ctx.quadraticCurveTo(x + 18, b - h * 0.5, x + 6, b - h); ctx.stroke();
  for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(x + 6, b - h); ctx.rotate(-Math.PI / 2 + (i - 2.5) * 0.6 + Math.sin(T + x) * 0.04); ell(30, 0, 32, 8, (i < 3 ? -0.3 : 0.3), col); ctx.restore(); }
}
function pine(x, b, h, col, lights) {
  ctx.fillStyle = '#3a2a1e'; ctx.fillRect(x - 5, b - h * 0.18, 10, h * 0.18);
  for (let i = 0; i < 3; i++) {
    const base = b - h * 0.15 - i * h * 0.24, w = h * 0.42 * (1 - i * 0.22), top = base - h * 0.4;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w, base); ctx.lineTo(x, top); ctx.lineTo(x + w, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(x - w * 0.35, top + h * 0.14); ctx.lineTo(x, top); ctx.lineTo(x + w * 0.35, top + h * 0.14); ctx.lineTo(x, top + h * 0.1); ctx.closePath(); ctx.fill();
    if (lights) for (let k = 0; k < 4; k++) { const u = (k + 0.5) / 4; const on = Math.sin(T * 3 + k * 2 + i + x) > -0.3; circle(x - w * 0.8 + u * w * 1.6, base - 4 - Math.abs(u - 0.5) * 8, 3, on ? ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff'][k] : '#555'); }
  }
  if (lights) { ctx.fillStyle = '#ffd740'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rad = i % 2 ? 4 : 9; ctx.lineTo(x + Math.cos(a) * rad, b - h * 0.87 + Math.sin(a) * rad); } ctx.fill(); }
}
function cactus(x, b, h, col) {
  rr(x - 9, b - h, 18, h, 9); ctx.fillStyle = col; ctx.fill();
  rr(x - 28, b - h * 0.75, 12, h * 0.35, 6); ctx.fill(); rr(x - 28, b - h * 0.45, 28, 11, 5); ctx.fill();
  rr(x + 16, b - h * 0.6, 12, h * 0.3, 6); ctx.fill(); rr(x, b - h * 0.34, 28, 11, 5); ctx.fill();
}
function deadTree(x, b, h, col) {
  ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(x, b); ctx.lineTo(x + 4, b - h); ctx.stroke(); ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x + 2, b - h * 0.55); ctx.lineTo(x - 24, b - h * 0.8); ctx.moveTo(x + 3, b - h * 0.7); ctx.lineTo(x + 26, b - h * 0.95); ctx.moveTo(x + 4, b - h); ctx.lineTo(x - 8, b - h * 1.15); ctx.stroke();
}
function drawDecor(wi, off) {
  const th = WORLDS[wi], sp = 210;
  for (let k = Math.floor(off / sp) - 1; k < (off + W) / sp + 1; k++) {
    const x = k * sp - off + hash(k) * 110, hv = hash(k + 50), b = 428;
    if (wi === 0) { if (hv < 0.6) palm(x, b, 110 + hv * 90, th.deco); else { ell(x, b - 10, 40, 24, 0, th.deco); ell(x + 30, b - 6, 30, 18, 0, th.deco); } }
    else if (wi === 1) { if (hv < 0.55) cactus(x, b, 60 + hv * 60, th.deco); else { rr(x - 18, b - 90 - hv * 60, 36, 100 + hv * 60, 8); ctx.fillStyle = th.deco; ctx.fill(); } }
    else if (wi === 2) pine(x, b, 120 + hv * 80, th.deco, hv < 0.35);
    else { if (hv < 0.6) deadTree(x, b, 80 + hv * 70, th.deco); else { ell(x, b - 8, 30, 16, 0, th.deco); circle(x + 8, b - 14, 4, `rgba(255,110,30,${0.5 + 0.5 * Math.sin(T * 3 + k)})`); } }
  }
}
function drawBackground(wi, cam) {
  const th = WORLDS[wi];
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (th.stars) { for (let i = 0; i < 70; i++) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(T * 1.5 + i)); circle(hash(i) * W, hash(i + 99) * 240, 1.3, '#fff'); } ctx.globalAlpha = 1; circle(150, 90, 30, '#f4f1de'); circle(162, 82, 26, th.sky[0]); }
  if (wi === 2) { for (let b = 0; b < 3; b++) { ctx.strokeStyle = `rgba(${b ? '120,255,190' : '110,200,255'},${0.15 + 0.08 * Math.sin(T + b)})`; ctx.lineWidth = 26 - b * 6; ctx.beginPath(); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 80 + b * 26 + Math.sin(x * 0.01 + T * 0.6 + b) * 25); ctx.stroke(); } }
  if (wi === 0) circle(800, 110, 46, 'rgba(255,250,210,.55)');
  if (wi === 1) { circle(200, 130, 64, 'rgba(255,245,200,.85)'); }
  drawVolcano(740, 345, th.volcS, th.volcCol, wi === 3 ? 1 : 0);
  drawHills(cam * 0.12, th.far, 335, 55, 1 + wi, th.mesa);
  drawHills(cam * 0.28, th.mid, 385, 40, 5 + wi, th.mesa);
  drawDecor(wi, cam * 0.5);
}
function supported(L, x) { for (const p of L.pits) if (x - 35 > p.x && x + 35 < p.x + p.w) return false; return true; }
function drawGround(wi, L, cam) {
  const th = WORLDS[wi];
  ctx.fillStyle = th.ground; ctx.fillRect(0, GROUND, W, H - GROUND);
  for (let k = Math.floor(cam / 46) - 1; k < (cam + W) / 46 + 1; k++) { const h1 = hash(k); ctx.fillStyle = th.dots; ctx.globalAlpha = th.lava ? 0.35 + 0.35 * Math.sin(T * 2 + k) : 0.6; ctx.fillRect(k * 46 - cam + h1 * 30, GROUND + 22 + hash(k + 7) * 70, 6 + h1 * 10, 4); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = th.top; ctx.fillRect(0, GROUND - 4, W, wi === 2 ? 16 : 12);
  if (wi === 0) { ctx.fillStyle = '#2f7a2c'; for (let k = Math.floor(cam / 30) - 1; k < (cam + W) / 30 + 1; k++) { const x = k * 30 - cam + hash(k + 3) * 10; ctx.beginPath(); ctx.moveTo(x, GROUND - 2); ctx.lineTo(x + 5, GROUND - 12 - hash(k) * 6); ctx.lineTo(x + 10, GROUND - 2); ctx.fill(); } }
  if (wi === 2) { ctx.fillStyle = '#fff'; for (let k = Math.floor(cam / 60) - 1; k < (cam + W) / 60 + 1; k++) ell(k * 60 - cam, GROUND - 2, 34, 7, 0, '#fff'); }
  for (const p of L.pits) {
    const sx = p.x - cam; if (sx > W + 10 || sx + p.w < -10) continue;
    const pg = ctx.createLinearGradient(0, GROUND, 0, H); pg.addColorStop(0, th.lava ? '#120604' : '#0b0703'); pg.addColorStop(1, '#000');
    ctx.fillStyle = pg; ctx.fillRect(sx, GROUND - 6, p.w, H - GROUND + 6);
    if (th.lava) {
      const lg = ctx.createLinearGradient(0, GROUND + 40, 0, H); lg.addColorStop(0, '#ffcf3a'); lg.addColorStop(1, '#ff4a00');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(sx, H);
      for (let x = 0; x <= p.w; x += 10) ctx.lineTo(sx + x, GROUND + 48 + Math.sin(x * 0.08 + T * 4) * 5);
      ctx.lineTo(sx + p.w, H); ctx.fill();
      const gl = ctx.createLinearGradient(0, GROUND, 0, GROUND + 60); gl.addColorStop(0, 'rgba(255,120,0,0)'); gl.addColorStop(1, 'rgba(255,120,0,.35)'); ctx.fillStyle = gl; ctx.fillRect(sx, GROUND, p.w, 60);
    }
    ctx.fillStyle = th.edge; ctx.fillRect(sx - 6, GROUND - 4, 6, H); ctx.fillRect(sx + p.w, GROUND - 4, 6, H);
  }
}

// =====================================================================
// Level generation
// =====================================================================
function buildLevel(wi) {
  const th = WORLDS[wi], R = rng(777 + wi * 1013);
  const L = { wi, speed: th.speed, pits: [], obs: [], amb: [], plats: [], eggs: [], spots: [], tips: [], cps: [], coach: [], seen: {} };
  const amberRow = (x, n, y = GROUND - 45, dx = 48) => { for (let i = 0; i < n; i++) L.amb.push({ x: x + i * dx, y, got: false }); };
  const amberArc = (x, w, peak) => { const n = Math.max(3, Math.floor(w / 45)); for (let i = 0; i <= n; i++) { const u = i / n; L.amb.push({ x: x + u * w, y: GROUND - 60 - 4 * peak * u * (1 - u), got: false }); } };
  const firstTip = (type, x, text) => { if (!L.seen[type]) { L.seen[type] = 1; if (text) L.tips.push({ x, text }); } };
  const P = {
    rock: x => { L.obs.push({ type: 'rock', x: x + 30, w: 56, h: 44 }); amberArc(x - 60, 180, 110); return 120; },
    rock2: x => { L.obs.push({ type: 'rock', x: x + 30, w: 56, h: 44 }); L.obs.push({ type: 'rock', x: x + 340, w: 64, h: 52 }); return 400; },
    pit: x => { const w = 100 + Math.floor(R() * 40) + wi * 10; L.pits.push({ x, w }); amberArc(x - 40, w + 80, 120); return w; },
    amber: x => { amberRow(x, 6); return 300; },
    raptor: x => { firstTip('raptor', x - 650, wi === 0 ? null : 'Raptor! Drüber springen oder wegbrüllen!'); L.obs.push({ type: 'raptor', x: x + 60, spd: 140 + wi * 20, ph: 0, alpha: 1 }); return 140; },
    boulder: x => { L.obs.push({ type: 'boulder', x: x + 60, w: 110, h: 160 }); return 140; },
    plat: x => { const y = GROUND - 125; L.plats.push({ x, y, w: 240 }); amberRow(x + 30, 4, y - 40); if (R() < 0.5) L.obs.push({ type: 'rock', x: x + 120, w: 56, h: 44 }); return 260; },
    ptero: x => { firstTip('ptero', x - 700, 'Flugsaurier! Lieber unten bleiben – oder brüllen!'); const by = GROUND - 165; L.obs.push({ type: 'ptero', x: x + 80, y: by, baseY: by, spd: 160, ph: R() * 6, alpha: 1 }); amberRow(x - 40, 4); return 160; },
    icicle: x => { firstTip('icicle', x - 650, 'Eiszapfen! Spring über das Eis – oder brüll es kaputt!'); L.obs.push({ type: 'icicle', x: x + 60, y: 120, vy: 0, state: 'hang' }); return 140; },
    geyser: x => { firstTip('geyser', x - 700, 'Lava-Pfützen! Spring drüber, wenn es spritzt!'); L.obs.push({ type: 'geyser', x: x + 40, t: 0, fired: false }); return 100; },
  };
  let x = 900;
  if (wi === 0) {
    L.tips.push({ x: 260, text: 'Tippe auf den Bildschirm, um zu springen!' });
    L.obs.push({ type: 'rock', x: 1000, w: 56, h: 44 }); amberArc(940, 180, 110);
    amberRow(1300, 5);
    L.tips.push({ x: 1450, text: 'Zweimal schnell tippen = Doppelsprung!' });
    L.plats.push({ x: 2000, y: GROUND - 125, w: 240 }); L.plats.push({ x: 2300, y: GROUND - 230, w: 200 }); amberRow(2030, 4, GROUND - 165); amberRow(2330, 4, GROUND - 270);
    L.tips.push({ x: 2650, text: 'Drück auf BRÜLL, um Felsen zu zerschmettern!' });
    L.obs.push({ type: 'boulder', x: 3250, w: 110, h: 160 });
    L.tips.push({ x: 3500, text: 'Ein Raptor! Brüllen verjagt ihn!' });
    L.obs.push({ type: 'raptor', x: 4300, spd: 140, ph: 0, alpha: 1 });
    if (!save.tutorialDone) L.coach.push(
      { x: 870, type: 'jump', text: 'Jetzt tippen – springen!' },
      { x: 1930, type: 'jump', text: 'Tippen – rauf auf die Plattform!' },
      { x: 2200, type: 'jump', text: 'Nochmal tippen – ganz nach oben!' },
      { x: 3000, type: 'roar', text: 'Drück BRÜLL!' },
      { x: 3840, type: 'roar', text: 'Ein Raptor! Drück BRÜLL!' });
    x = 4600;
  } else L.tips.push({ x: 150, text: th.startTip });
  const n = th.segs, eggAt = [Math.floor(n * 0.25), Math.floor(n * 0.55), Math.floor(n * 0.85)], cpAt = [Math.floor(n * 0.4), Math.floor(n * 0.7)];
  for (let i = 0; i < n; i++) {
    if (cpAt.includes(i)) { L.cps.push({ x, on: false }); x += 160; }
    let w;
    if (i === eggAt[0]) {
      if (wi === 0) L.tips.push({ x: x - 700, text: 'Da oben glänzt ein Ei! Spring auf die Plattformen!' });
      L.plats.push({ x, y: GROUND - 120, w: 200 }); L.plats.push({ x: x + 240, y: GROUND - 235, w: 200 });
      amberRow(x + 30, 3, GROUND - 160);
      L.eggs.push({ k: 0, x: x + 360, y: GROUND - 282 }); w = 460;
    } else if (i === eggAt[1]) {
      L.spots.push({ x: x + 40, k: 1, state: 'idle' });
      L.eggs.push({ k: 1, x: x + 340, y: GROUND - 150, hidden: true }); w = 440;
    } else if (i === eggAt[2]) {
      L.pits.push({ x, w: 150 }); L.eggs.push({ k: 2, x: x + 75, y: GROUND - 195 }); w = 150;
    } else {
      w = P[th.patterns[Math.floor(R() * th.patterns.length)]](x);
    }
    x += w + 260 + R() * 200;
  }
  L.eggs.sort((a, b) => a.k - b.k);
  x += 300;
  if (wi === 3) { L.bossX = x + 200; L.gateX = L.bossX + 1300; } else L.gateX = x + 500;
  return L;
}

// =====================================================================
// Play state
// =====================================================================
let scene = 'title', G = null;
function go(s) { scene = s; parts = []; dialog = null; toasts = []; }

function startLevel(wi) {
  go('play');
  const L = buildLevel(wi);
  G = { L, wi, cam: 0, t: 0, startT: 1.6, stopped: false, overlay: null, shake: 0, tip: null, eggsGot: [false, false, false], amber: 0,
    p: { wx: 200, y: GROUND, vy: 0, onGround: true, jumps: 0, coyote: 0, inv: 0, roarT: 0, roarCd: 0, hearts: 3, ph: 0 },
    chili: { wx: 315, y: GROUND, ph: 0, dig: null, digT: 0 }, cp: 200, rings: [],
    boss: null, bossStarted: false, golden: null, gotGolden: false, atGate: false, gateT: 0, gateOpening: false, gateOpen: 0, finished: false,
    coach: null, flyEggs: [], slotPop: [0, 0, 0], hitFlash: 0 };
}

function jump() {
  const p = G.p; if (G.startT > 0.3) return;
  if (G.coach) { if (G.coach.type !== 'jump') return; G.coach = null; }
  if (p.onGround || p.coyote > 0) { p.vy = -900; p.jumps = 1; p.coyote = 0; p.onGround = false; SFX.jump(); burst(p.wx, GROUND, 6, ['#d8c3a5', '#b39b7a'], 120, 300, 5, 0.4); }
  else if (p.jumps < 2) { p.vy = -760; p.jumps = 2; SFX.jump2(); G.rings.push({ x: p.wx, y: p.y, r: 10, a: 0.8, c: '255,255,255' }); }
}
function roar() {
  const p = G.p;
  if (G.coach) { if (G.coach.type !== 'roar') return; G.coach = null; p.roarCd = 0; }
  if (p.roarCd > 0 || G.startT > 0.3) return;
  p.roarT = 0.55; p.roarCd = 0.85; SFX.roar(); G.shake = Math.max(G.shake, 0.3);
  G.rings.push({ x: p.wx + 80, y: p.y - 100, r: 20, a: 1, c: '255,220,120' });
  for (const o of G.L.obs) {
    if (o.dead || o.scared) continue;
    const d = o.x - p.wx; if (d < -40 || d > 360) continue;
    if (o.type === 'boulder' || o.type === 'rock' || (o.type === 'icicle' && o.state === 'stuck')) {
      o.dead = true; SFX.smash(); const th = WORLDS[G.wi];
      burst(o.x, GROUND - (o.h || 40) / 2, 22, o.type === 'icicle' ? ['#e0f4ff', '#9fd3ff', '#fff'] : [th.rock, '#5a4a3a', '#a89888'], 420, 1300, 10, 0.9);
      for (let i = 0; i < 3; i++) G.L.amb.push({ x: o.x + 40 + i * 40, y: GROUND - 60 - i * 20, got: false });
    } else if (o.type === 'raptor' || o.type === 'ptero') { o.scared = true; o.vx = 380; o.vy = -320; }
  }
}
function hurt(force) {
  const p = G.p; if (!force && p.inv > 0) return;
  p.hearts--; p.inv = 1.8; SFX.hurt(); G.shake = 0.35; G.hitFlash = 0.45;
  try { if (navigator.vibrate) navigator.vibrate(180); } catch (e) {}
  if (!force) p.vy = Math.min(p.vy, -450);
  if (p.hearts <= 0) { G.overlay = { type: 'retry' }; }
}
function pitFall() {
  const p = G.p, L = G.L;
  const pit = L.pits.find(q => p.wx > q.x - 60 && p.wx < q.x + q.w + 60);
  let nx = pit ? pit.x - 170 : p.wx - 200, guard = 0;
  while (!supported(L, nx) && guard++ < 30) nx -= 40;
  p.wx = nx; p.y = GROUND - 150; p.vy = 0; G.chili.wx = nx + 115;
  hurt(true);
}
function retry() {
  const p = G.p, L = G.L;
  G.overlay = null; p.hearts = 3; p.inv = 2; p.wx = G.cp; p.y = GROUND; p.vy = 0; p.roarCd = 0;
  G.chili.wx = p.wx + 115; G.chili.dig = null;
  for (const s of L.spots) if (s.state === 'dig') s.state = 'idle';
  for (const o of L.obs) if ((o.type === 'raptor' || o.type === 'ptero') && o.x > G.cp - 300 && o.x < G.cp + 700) o.dead = true;
  if (G.bossStarted && !G.golden) { p.wx = L.bossX; G.chili.wx = p.wx - 90; G.boss = newBoss(); G.stopped = true; }
  G.startT = 0.9;
}
function newBoss() { return { x: G.L.bossX + 1000, hp: 3, state: 'enter', t: 0, ph: 0, flash: 0 }; }
function revealEgg(s) {
  const e = G.L.eggs[s.k]; e.hidden = false; e.popping = true; e.ty = e.y; e.x0 = s.x; e.x = s.x; e.y = GROUND - 10; e.vy = -900; e.vx = (G.p.wx + 640 - s.x) / 1.1; SFX.pop();
  burst(s.x, GROUND - 5, 20, ['#8b5a2b', '#a0703a', '#ffe08a'], 260, 900, 7, 0.8);
}
function openRiddle() { toasts = []; const order = [0, 1, 2].sort(() => Math.random() - 0.5); G.overlay = { type: 'riddle', order, wrong: [], msg: '', shake: 0 }; }
function answer(i) {
  const r = WORLDS[G.wi].riddle, o = G.overlay;
  if (i === r.ok) { SFX.right(); G.overlay = null; G.gateOpening = true; toast('Richtig! Das Tor geht auf!', '#9cff8a'); burst(G.L.gateX - 10, GROUND - 200, 50, ['#ffd740', '#ff5252', '#69f0ae', '#40c4ff', '#fff'], 500, 700, 8, 1.4); }
  else { SFX.wrong(); if (!o.wrong.includes(i)) o.wrong.push(i); o.msg = (r.wrongMsg && r.wrongMsg[i]) || 'Fast! Versuch es nochmal.'; o.shake = 0.4; }
}
function finishLevel() {
  const wi = G.wi; G.newCards = [];
  for (let k = 0; k < 3; k++) if (G.eggsGot[k]) { if (!save.eggs[wi][k]) G.newCards.push(k); save.eggs[wi][k] = 1; }
  if (wi === 0) save.tutorialDone = true;
  save.amber += G.amber; save.unlocked = Math.max(save.unlocked, Math.min(3, wi + 1)); writeSave();
  if (wi === 3) startEnding(); else { G.overlay = { type: 'complete' }; SFX.right(); }
}

function updatePlay(dt) {
  const L = G.L, p = G.p, th = WORLDS[G.wi];
  for (const r of G.rings) { r.r += 500 * dt; r.a -= dt * 1.8; } G.rings = G.rings.filter(r => r.a > 0);
  if (G.overlay) return;
  for (const c of L.coach) if (!c.done && p.wx >= c.x) { c.done = true; G.coach = c; }
  if (G.coach) return; // freeze-frame until Oli does the move
  G.t += dt; G.shake = Math.max(0, G.shake - dt);
  if (G.tip) { G.tip.t -= dt; if (G.tip.t <= 0) G.tip = null; }
  if (G.startT > 0) G.startT -= dt;
  let spd = (G.startT > 0 || G.stopped) ? 0 : L.speed;
  if (p.y > GROUND + 5) spd = 0;
  p.wx += spd * dt; p.ph += dt * (spd > 0 ? 13 : 2);
  // physics
  const prevY = p.y; p.vy += GRAV * dt; p.y += p.vy * dt; p.onGround = false;
  if (p.vy >= 0) {
    for (const pl of L.plats) if (p.wx + 25 > pl.x && p.wx - 25 < pl.x + pl.w && prevY <= pl.y + 1 && p.y >= pl.y) { p.y = pl.y; p.vy = 0; p.onGround = true; break; }
    if (!p.onGround && supported(L, p.wx) && prevY <= GROUND + 4 && p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
  }
  if (p.onGround) { p.coyote = 0.1; p.jumps = 0; } else p.coyote -= dt;
  if (p.y > H + 120) pitFall();
  p.inv -= dt; p.roarT -= dt; p.roarCd -= dt;
  G.cam = p.wx - 230;
  // tips, checkpoints
  for (const t of L.tips) if (!t.shown && p.wx >= t.x) { t.shown = true; G.tip = { text: t.text, t: 4.5 }; }
  for (const c of L.cps) if (!c.on && p.wx >= c.x) { c.on = true; G.cp = c.x; SFX.flag(); toast('Fähnchen erreicht!', '#ffe08a'); }
  // amber
  for (const a of L.amb) if (!a.got && Math.abs(a.x - p.wx - 10) < 42 && Math.abs(a.y - (p.y - 50)) < 62) { a.got = true; G.amber++; SFX.amber(); burst(a.x, a.y, 6, ['#ffd166', '#ff9f1c'], 150, 200, 4, 0.4); }
  // eggs
  for (const e of L.eggs) {
    if (e.hidden || e.got) continue;
    if (e.popping) { e.vy += 1380 * dt; e.y += e.vy * dt; e.x += e.vx * dt; if (e.vy > 0 && e.y >= e.ty) { e.y = e.ty; e.popping = false; } }
    const ey = e.y + Math.sin(T * 3 + e.k) * 5;
    if (Math.hypot(e.x - (p.wx + 10), ey - (p.y - 50)) < 64) {
      e.got = true; G.eggsGot[e.k] = true; SFX.egg(); G.flyEggs.push({ x: e.x - G.cam, y: ey, k: e.k, t: 0 }); burst(e.x, ey, 30, ['#fff3b0', '#ffd740', th.egg, th.eggSpot], 360, 500, 7, 1);
      toast('Dino-Karte gefunden: ' + FACTS[G.wi * 3 + e.k].name + '!', '#ffe08a');
    }
  }
  // chili
  const c = G.chili; c.ph += dt * 12;
  for (const s of L.spots) if (s.state === 'idle' && c.wx >= s.x - 10) { s.state = 'dig'; c.dig = s; c.digT = 0.7; SFX.dig(); toast('Chili hat etwas erschnüffelt!', '#ffe08a'); }
  let target = G.bossStarted && !G.golden ? p.wx - 95 : p.wx + 115;
  if (c.dig) { target = c.dig.x; c.digT -= dt; if (Math.random() < 0.6) burst(c.dig.x + 10, GROUND - 4, 1, ['#8b5a2b', '#6b4226'], 160, 900, 5, 0.5); if (c.digT <= 0) { revealEgg(c.dig); c.dig.state = 'done'; c.dig = null; } }
  const mv = (L.speed + 260) * dt; c.wx += clamp(target - c.wx, -mv, mv);
  c.y = c.dig ? GROUND : GROUND - Math.abs(Math.sin(c.ph * 0.8)) * 14;
  for (const pit of L.pits) if (c.wx > pit.x - 30 && c.wx < pit.x + pit.w + 30) { const u = (c.wx - (pit.x - 30)) / (pit.w + 60); c.y = GROUND - 4 * 90 * u * (1 - u); }
  // obstacles
  const pb = { x: p.wx - 25, y: p.y - 92, w: 68, h: 88 };
  for (const o of L.obs) {
    if (o.dead) continue;
    const d = o.x - p.wx;
    if (d > 1200) continue;
    let hb = null;
    switch (o.type) {
      case 'rock': hb = { x: o.x - o.w / 2 + 6, y: GROUND - o.h + 6, w: o.w - 12, h: o.h - 6 }; break;
      case 'boulder': hb = { x: o.x - o.w / 2 + 8, y: GROUND - o.h + 10, w: o.w - 16, h: o.h - 10 }; break;
      case 'raptor': case 'ptero':
        if (o.scared) { o.x += o.vx * dt; o.vy += 900 * dt; if (o.type === 'raptor') o.yOff = (o.yOff || 0) + o.vy * dt; else o.y += (o.vy - 300) * dt; o.alpha -= dt * 1.3; o.ph += dt * 18; if (o.alpha <= 0) o.dead = true; break; }
        if (d < 760) { o.x -= o.spd * dt; o.ph += dt * (o.type === 'raptor' ? 15 : 9); }
        if (o.type === 'ptero') { o.y = o.baseY + Math.sin(T * 4 + o.x * 0.01) * 8; hb = { x: o.x - 28, y: o.y - 14, w: 56, h: 26 }; }
        else hb = { x: o.x - 26, y: GROUND - 62, w: 52, h: 60 };
        break;
      case 'icicle':
        if (o.state === 'hang' && d < 430) { o.state = 'fall'; }
        if (o.state === 'fall') { o.vy += 2400 * dt; o.y += o.vy * dt; hb = { x: o.x - 13, y: o.y - 70, w: 26, h: 70 }; if (o.y >= GROUND) { o.y = GROUND; o.state = 'stuck'; SFX.crack(); burst(o.x, GROUND - 10, 14, ['#e0f4ff', '#fff'], 260, 900, 6, 0.6); } }
        else if (o.state === 'stuck') hb = { x: o.x - 15, y: GROUND - 44, w: 30, h: 44 };
        break;
      case 'geyser':
        if (!o.fired && d < 470) { o.fired = true; o.t = 0.8; noise(0.8, 0.25, 600); }
        if (o.t > 0) { o.t -= dt; if (Math.random() < 0.7) burst(o.x, GROUND - 200 * Math.random(), 1, ['#ffcf3a', '#ff6a00'], 180, 600, 7, 0.7); hb = { x: o.x - 24, y: GROUND - 250, w: 48, h: 250 }; }
        else hb = { x: o.x - 36, y: GROUND - 8, w: 72, h: 10 };
        break;
    }
    if (hb && p.inv <= 0 && overlap(pb, hb)) hurt();
    if (o.x < G.cam - 300 && o.type !== 'icicle') o.dead = o.dead || (o.type === 'raptor' || o.type === 'ptero');
  }
  // boss
  if (L.bossX && !G.bossStarted && p.wx >= L.bossX) {
    G.bossStarted = true; G.stopped = true; p.wx = L.bossX; G.cp = L.bossX; G.boss = newBoss();
    G.tip = { text: 'Der Krallenkönig! Brülle genau dann, wenn er ganz nah ist!', t: 5 };
  }
  if (G.boss) updateBoss(dt);
  if (G.golden && !G.gotGolden) {
    const gd = G.golden;
    if (!gd.landed) { gd.vy += 900 * dt; gd.y += gd.vy * dt; if (gd.y >= GROUND - 70) { gd.y = GROUND - 70; gd.landed = true; G.stopped = false; burst(gd.x, gd.y, 30, ['#ffd700', '#fff3b0'], 300, 400, 7, 1); } }
    if (Math.hypot(gd.x - p.wx - 10, gd.y - (p.y - 50)) < 70) { G.gotGolden = true; SFX.egg(); setTimeout(SFX.right, 300); toast('Das goldene Ei!', '#ffd700'); burst(gd.x, gd.y, 50, ['#ffd700', '#fff3b0', '#ffae00'], 420, 400, 8, 1.3); }
  }
  // gate
  if (!G.atGate && p.wx >= L.gateX - 220) { G.atGate = true; G.stopped = true; p.wx = L.gateX - 220; G.gateT = 0.5; }
  if (G.atGate && !G.gateOpening && G.gateT > 0) { G.gateT -= dt; if (G.gateT <= 0) openRiddle(); }
  if (G.gateOpening) { G.gateOpen = Math.min(1, G.gateOpen + dt * 0.9); if (G.gateOpen >= 1) G.stopped = false; }
  if (G.gateOpen >= 1 && p.wx > L.gateX + 200 && !G.finished) { G.finished = true; finishLevel(); }
}

function updateBoss(dt) {
  const b = G.boss, p = G.p, home = G.L.bossX + 620;
  b.t += dt; b.ph += dt * 13; b.flash -= dt;
  switch (b.state) {
    case 'enter': b.x -= 230 * dt; if (b.x <= home) { b.state = 'taunt'; b.t = 0; SFX.roar(); G.shake = 0.4; } break;
    case 'taunt': if (b.t > 1.2) { b.state = 'charge'; b.t = 0; } break;
    case 'charge': {
      b.x -= (360 + (3 - b.hp) * 70) * dt;
      const d = b.x - p.wx;
      if (d < 390 && p.roarT > 0) {
        b.hp--; b.flash = 0.5; SFX.smash(); G.shake = 0.5; burst(b.x - 40, GROUND - 120, 30, ['#ffd740', '#fff', '#ff7043'], 400, 600, 8, 0.9);
        if (b.hp <= 0) { b.state = 'flee'; b.t = 0; toast('Der Krallenkönig rennt davon!', '#9cff8a'); }
        else { b.state = 'back'; toast(b.hp === 2 ? 'Treffer! Noch 2 Mal!' : 'Super! Noch 1 Mal!', '#9cff8a'); }
      } else if (d < 115) { hurt(); b.state = 'back'; }
      break;
    }
    case 'back': b.x += 650 * dt; if (b.x >= home) { b.x = home; b.state = 'taunt'; b.t = 0; } break;
    case 'flee': b.x += 520 * dt; if (b.t > 1.2 && !G.golden) { G.golden = { x: p.wx + 330, y: -60, vy: 0, landed: false }; SFX.pop(); } break;
  }
}

// ---------- play drawing ----------
function drawObstacle(o, cam, th) {
  const x = o.x - cam;
  if (x < -150 || x > W + 150) return;
  switch (o.type) {
    case 'rock': {
      ctx.fillStyle = th.rock; ctx.beginPath(); ctx.moveTo(x - o.w / 2, GROUND); ctx.lineTo(x - o.w / 2 + 6, GROUND - o.h * 0.6); ctx.lineTo(x - o.w / 6, GROUND - o.h); ctx.lineTo(x + o.w / 4, GROUND - o.h * 0.9); ctx.lineTo(x + o.w / 2, GROUND - o.h * 0.4); ctx.lineTo(x + o.w / 2, GROUND); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(x - o.w / 2 + 8, GROUND - o.h * 0.55); ctx.lineTo(x - o.w / 6, GROUND - o.h + 4); ctx.lineTo(x, GROUND - o.h * 0.7); ctx.fill();
      if (G.wi === 2) ell(x - 4, GROUND - o.h + 4, o.w * 0.3, 5, 0, '#fff');
      break;
    }
    case 'boulder': {
      ell(x, GROUND - o.h / 2 + 4, o.w / 2, o.h / 2, 0, G.wi === 3 ? '#2e2220' : '#7d7d86');
      ell(x - 14, GROUND - o.h * 0.66, o.w * 0.2, o.h * 0.14, -0.4, 'rgba(255,255,255,.18)');
      ctx.strokeStyle = G.wi === 3 ? `rgba(255,110,20,${0.6 + 0.4 * Math.sin(T * 4)})` : 'rgba(0,0,0,.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 10, GROUND - o.h + 14); ctx.lineTo(x + 4, GROUND - o.h * 0.6); ctx.lineTo(x - 6, GROUND - o.h * 0.4); ctx.lineTo(x + 12, GROUND - o.h * 0.15); ctx.stroke();
      if (G.wi === 2) ell(x, GROUND - o.h + 8, o.w * 0.35, 9, 0, '#fff');
      break;
    }
    case 'raptor': drawRaptor(x, GROUND + (o.yOff || 0), 1.05, o.ph, !o.scared, { alpha: o.alpha }); break;
    case 'ptero': drawPtero(x, o.y, 1.45, o.ph, !o.scared, { alpha: o.alpha }); break;
    case 'icicle': {
      ctx.fillStyle = '#5f7591'; rr(x - 75, -10, 150, 64, 20); ctx.fill(); ell(x, 50, 70, 10, 0, '#dfefff');
      ctx.fillStyle = 'rgba(200,235,255,.95)';
      if (o.state === 'hang') { ctx.beginPath(); ctx.moveTo(x - 14, 52); ctx.lineTo(x + 14, 52); ctx.lineTo(x + Math.sin(T * 30) * (o.x - G.p.wx < 600 ? 1.5 : 0), 120); ctx.fill(); }
      else if (o.state === 'fall') { ctx.beginPath(); ctx.moveTo(x - 14, o.y - 70); ctx.lineTo(x + 14, o.y - 70); ctx.lineTo(x, o.y); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(x - 17, GROUND); ctx.lineTo(x - 4, GROUND - 46); ctx.lineTo(x + 6, GROUND - 30); ctx.lineTo(x + 17, GROUND); ctx.fill(); }
      break;
    }
    case 'geyser': {
      const g = ctx.createRadialGradient(x, GROUND, 2, x, GROUND, 50); g.addColorStop(0, '#ffcf3a'); g.addColorStop(1, 'rgba(255,90,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, GROUND, 50, Math.PI, 0); ctx.fill();
      ell(x, GROUND + 1, 38, 8, 0, '#ff7a1a');
      for (let i = 0; i < 3; i++) circle(x - 20 + i * 20, GROUND - 2 - Math.abs(Math.sin(T * 5 + i)) * 6, 4, '#ffd166');
      if (o.t > 0) { const h = 260 * Math.min(1, (0.8 - o.t) * 6) * Math.min(1, o.t * 4); const lg = ctx.createLinearGradient(0, GROUND - h, 0, GROUND); lg.addColorStop(0, '#fff3a0'); lg.addColorStop(1, '#ff5a00'); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x - 22, GROUND); for (let y = 0; y <= h; y += 20) ctx.lineTo(x - 22 + Math.sin(y * 0.1 + T * 20) * 6, GROUND - y); for (let y = h; y >= 0; y -= 20) ctx.lineTo(x + 22 + Math.sin(y * 0.1 + T * 20 + 1) * 6, GROUND - y); ctx.fill(); }
      break;
    }
  }
}
function drawGate(L, cam) {
  const gx = L.gateX - cam; if (gx < -200 || gx > W + 200) return;
  const stone = G.wi === 3 ? '#3b2c28' : G.wi === 2 ? '#8fa3bb' : '#8a7a68';
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(gx - 50, GROUND - 210, 100, 210);
  const dy = G.gateOpen * 200;
  ctx.save(); ctx.beginPath(); ctx.rect(gx - 50, GROUND - 212, 100, 212); ctx.clip();
  rr(gx - 48, GROUND - 210 - dy, 96, 210, 6); ctx.fillStyle = '#6b4a2b'; ctx.fill();
  ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 4; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(gx - 48 + i * 24, GROUND - 210 - dy); ctx.lineTo(gx - 48 + i * 24, GROUND - dy); ctx.stroke(); }
  otxt('?', gx, GROUND - 110 - dy, 64, '#ffd34d', '#3b1d00', 8);
  ctx.restore();
  for (const px of [gx - 95, gx + 50]) { rr(px, GROUND - 230, 45, 230, 6); ctx.fillStyle = stone; ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 5; i++) ctx.fillRect(px, GROUND - 230 + i * 46, 45, 3); }
  rr(gx - 115, GROUND - 268, 230, 44, 8); ctx.fillStyle = stone; ctx.fill();
  drawEgg(gx, GROUND - 246, 16, WORLDS[G.wi].egg, WORLDS[G.wi].eggSpot);
  if (G.wi === 2) { ell(gx, GROUND - 268, 115, 9, 0, '#fff'); for (let i = 0; i < 7; i++) circle(gx - 100 + i * 33, GROUND - 222, 4, ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff'][(i + Math.floor(T * 3)) % 4]); }
}
function drawFamilyCliff(L, cam) {
  const x0 = L.bossX - 330 - cam; if (x0 > W + 50 || x0 + 560 < -50) return;
  ctx.fillStyle = '#1a0c0a'; ctx.beginPath(); ctx.moveTo(x0, GROUND); ctx.lineTo(x0 + 40, 300); ctx.lineTo(x0 + 500, 300); ctx.lineTo(x0 + 560, GROUND); ctx.fill();
  ctx.fillStyle = '#3a1a12'; ctx.fillRect(x0 + 40, 296, 460, 8);
  const cheer = G.boss && G.boss.state !== 'enter';
  const hop = i => cheer ? Math.abs(Math.sin(T * 7 + i)) * 10 : 0;
  drawLongneck(x0 + 200, 296 - hop(0), 0.62, '#b07cc6', T * 3, false);
  drawLongneck(x0 + 340, 296 - hop(1), 0.68, '#4f8fd6', T * 3 + 1, false);
  drawTrike(x0 + 450, 296 - hop(2), 0.9, '#f39c34', 0, false);
  const lbl = (s, x) => { setFont(16); const w = ctx.measureText(s).width + 14; rr(x - w / 2, 306, w, 22, 10); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); txt(s, x, 318, 16, '#3b2410'); };
  lbl('Mami', x0 + 180); lbl('Papi', x0 + 320); lbl('Fabio', x0 + 450);
  if (cheer) {
    const lines = [['Los, Oli!', x0 + 240, 180], [fmt('Du schaffst das, {rex}!'), x0 + 390, 160], ['Oli! Oli! Oli!', x0 + 480, 225]];
    lines.forEach(([s, x, y], i) => { if (Math.sin(T * 1.5 + i * 2.1) > -0.2) { setFont(18); const w = ctx.measureText(s).width + 20; rr(x - w / 2, y - 16, w, 32, 14); ctx.fillStyle = '#fff'; ctx.fill(); txt(s, x, y, 18, '#3b2410'); } });
  }
}
function drawPlay() {
  const L = G.L, p = G.p, th = WORLDS[G.wi], cam = G.cam;
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * 16 * G.shake, (Math.random() - 0.5) * 16 * G.shake);
  drawBackground(G.wi, cam);
  if (L.bossX) drawFamilyCliff(L, cam);
  drawGround(G.wi, L, cam);
  for (const pl of L.plats) { const x = pl.x - cam; if (x > W || x + pl.w < 0) continue; rr(x, pl.y, pl.w, 24, 10); ctx.fillStyle = th.plat; ctx.fill(); rr(x, pl.y - 2, pl.w, 10, 6); ctx.fillStyle = th.platTop; ctx.fill(); }
  for (const c of L.cps) { const x = c.x - cam; if (x < -50 || x > W + 50) continue; ctx.fillStyle = '#5b4636'; ctx.fillRect(x - 3, GROUND - 110, 6, 110); const fy = c.on ? GROUND - 108 : GROUND - 40; ctx.fillStyle = c.on ? '#ffd34d' : '#999'; ctx.beginPath(); ctx.moveTo(x + 3, fy); ctx.lineTo(x + 46 + Math.sin(T * 6) * 4, fy + 14); ctx.lineTo(x + 3, fy + 28); ctx.fill(); }
  for (const s of L.spots) { const x = s.x - cam; if (x < -50 || x > W + 50) continue; if (s.state === 'done') ell(x, GROUND + 2, 26, 7, 0, '#1a0f08'); else { ell(x, GROUND, 30, 14, 0, '#7a5230'); for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 6 + i * 2); circle(x - 14 + i * 14, GROUND - 22 - i * 5, 3, '#fff6b0'); } ctx.globalAlpha = 1; } }
  drawGate(L, cam);
  for (const a of L.amb) if (!a.got) { const x = a.x - cam; if (x > -20 && x < W + 20) drawAmber(x, a.y + Math.sin(T * 4 + a.x) * 3, 10); }
  for (const e of L.eggs) if (!e.hidden && !e.got) { const x = e.x - cam; if (x > -60 && x < W + 60) drawEgg(x, e.y + Math.sin(T * 3 + e.k) * 5, 24, th.egg, th.eggSpot, 0.8 + 0.2 * Math.sin(T * 5), Math.sin(T * 2) * 0.1); }
  for (const o of L.obs) if (!o.dead) drawObstacle(o, cam, th);
  if (G.golden && !G.gotGolden) drawEgg(G.golden.x - cam, G.golden.y + (G.golden.landed ? Math.sin(T * 3) * 5 : 0), 32, '#ffd700', '#e0a800', 1.2, Math.sin(T * 2) * 0.1);
  if (G.boss && G.boss.x - cam < W + 200) { const b = G.boss; const bx = b.x - cam; ctx.save(); if (b.flash > 0 && Math.sin(T * 40) > 0) ctx.globalAlpha = 0.4; drawRaptor(bx, GROUND, 2.3, b.state === 'taunt' ? 0 : b.ph, b.state !== 'flee', { col: '#8b1a1a', dark: '#4a0a0a', crown: true }); ctx.restore(); if (b.state === 'taunt') otxt('!', bx - 70, GROUND - 230, 60, '#ff5252', '#000', 8); for (let i = 0; i < 3; i++) drawHeart(bx - 40 + i * 30, GROUND - 260, 0.9, i < b.hp); }
  // chili
  const c = G.chili; drawChili(c.wx - cam, c.y, 1.25, c.ph, c.dig ? false : (G.bossStarted && !G.golden));
  if (c.dig) otxt('!', c.wx - cam + 20, c.y - 70 - Math.abs(Math.sin(T * 10)) * 6, 36, '#ffd34d', '#3b1d00', 6);
  // baby follower
  if (save.babyName) drawBaby(p.wx - cam - 150, GROUND - (G.startT > 0 || G.stopped ? 0 : Math.abs(Math.sin(p.ph * 0.6)) * 10), 0.85, p.ph);
  // player
  if (!(p.inv > 0 && Math.sin(T * 30) > 0.3)) drawRex(p.wx - cam, p.y, 0.92, p.ph, p.roarT > 0 ? 1 : 0.05, { rider: true, air: !p.onGround, hat: G.wi >= 2 });
  for (const r of G.rings) { ctx.strokeStyle = `rgba(${r.c},${r.a})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(r.x - cam, r.y, r.r, -0.9, 0.9); ctx.stroke(); }
  drawParts(cam);
  if (th.snow) drawSnow(0.8);
  if (th.lava) drawEmbers();
  ctx.restore();
  // boss prompt
  if (G.boss && G.boss.state === 'charge' && G.boss.x - p.wx < 390 && Math.sin(T * 20) > -0.5) otxt('JETZT BRÜLLEN!', W / 2, 250, 52, '#ff5252', '#000', 10);
  // incoming-danger badges at the right edge
  for (const o of L.obs) {
    if (o.dead || o.scared || (o.type !== 'raptor' && o.type !== 'ptero')) continue;
    if (o.x - G.cam > W + 10 && o.x - p.wx < 1150) {
      const y = o.type === 'ptero' ? o.y : GROUND - 110;
      ctx.globalAlpha = 0.65 + 0.35 * Math.sin(T * 14); circle(W - 36, y, 22, '#e53935'); ctx.globalAlpha = 1;
      ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(W - 6, y); ctx.lineTo(W - 16, y - 10); ctx.lineTo(W - 16, y + 10); ctx.fill();
      otxt('!', W - 36, y + 1, 30, '#fff', '#7a0000', 4);
    }
  }
  drawHUD();
  for (const f of G.flyEggs) {
    f.t += DT * 1.6; const u = Math.min(1, f.t), tx = W / 2 - 50 + f.k * 50, ty = 39;
    drawEgg(f.x + (tx - f.x) * u, f.y + (ty - f.y) * u - Math.sin(u * Math.PI) * 120, 24 - 7 * u, th.egg, th.eggSpot, 1 - u * 0.5, u * 6);
    if (u >= 1) { G.slotPop[f.k] = 0.6; SFX.amber(); }
  }
  G.flyEggs = G.flyEggs.filter(f => f.t < 1);
  for (let k = 0; k < 3; k++) G.slotPop[k] = Math.max(0, G.slotPop[k] - DT * 1.5);
  if (G.hitFlash > 0) { G.hitFlash -= DT; const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,0,0,${Math.max(0, G.hitFlash)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (G.coach && !G.overlay) drawCoach();
  // start banner
  if (G.startT > 0) { ctx.globalAlpha = clamp(G.startT * 2, 0, 1); otxt(`Welt ${G.wi + 1}: ${th.name}`, W / 2, 230, 58, '#ffd34d', '#3b1d00', 12); if (G.startT < 0.7) otxt('Los!', W / 2, 300, 46, '#fff', '#000', 10); ctx.globalAlpha = 1; }
  if (G.overlay) drawOverlay();
}
function drawHUD() {
  const p = G.p, th = WORLDS[G.wi];
  for (let i = 0; i < 3; i++) drawHeart(34 + i * 40, 38, 1.25, i < p.hearts);
  rr(W / 2 - 92, 12, 184, 54, 27); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
  for (let k = 0; k < 3; k++) { const got = G.eggsGot[k] && !G.flyEggs.some(f => f.k === k), before = save.eggs[G.wi][k]; drawEgg(W / 2 - 50 + k * 50, 39, 17 * (1 + G.slotPop[k]), got || before ? th.egg : 'rgba(255,255,255,.15)', got || before ? th.eggSpot : 'rgba(255,255,255,.1)', got ? 0.6 : 0, 0, got ? 1 : before ? 0.45 : 1); }
  drawAmber(170 + 20, 38, 12); otxt(String(G.amber), 212, 39, 26, '#ffe08a', 'rgba(0,0,0,.7)', 5, 'left');
  { // progress bar: how far to the gate, with flags, eggs, boss
    const L = G.L, x0 = W / 2 - 160, bw = 320, y0 = 74, span = L.gateX - 420;
    const fx = v => x0 + clamp((v - 200) / span, 0, 1) * bw;
    rr(x0 - 5, y0 - 5, bw + 10, 16, 8); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
    rr(x0, y0, Math.max(6, fx(p.wx) - x0), 6, 3); ctx.fillStyle = '#ffd34d'; ctx.fill();
    for (const c of L.cps) { const x = fx(c.x); ctx.fillStyle = c.on ? '#ffd34d' : '#eee'; ctx.fillRect(x - 1, y0 - 9, 2, 15); ctx.beginPath(); ctx.moveTo(x + 1, y0 - 9); ctx.lineTo(x + 10, y0 - 6); ctx.lineTo(x + 1, y0 - 3); ctx.fill(); }
    for (const e of L.eggs) if (!e.got) drawEgg(fx(e.x), y0 + 3, 6, e.hidden ? 'rgba(255,255,255,.55)' : th.egg, th.eggSpot);
    if (L.bossX) { circle(fx(L.bossX), y0 + 3, 7, '#c62828'); ctx.lineWidth = 2; ctx.strokeStyle = '#ffd700'; ctx.stroke(); }
    otxt('?', x0 + bw + 12, y0 + 3, 18, '#ffd34d', '#000', 4);
    circle(fx(p.wx), y0 + 3, 8, '#2e8b57'); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
  }
  if (G.tip) { ctx.globalAlpha = clamp(G.tip.t * 2, 0, 1); const lines = wrapLines(G.tip.text, 560, 24); const h = 22 + lines.length * 30; rr(W / 2 - 330, 94, 660, h, 18); ctx.fillStyle = 'rgba(255,247,224,.95)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke(); drawPortrait('goetti', W / 2 - 290, 94 + h / 2, 28); lines.forEach((l, i) => txt(l, W / 2 + 30, 94 + 26 + i * 30, 24, '#3b2410')); ctx.globalAlpha = 1; }
  if (G.overlay) return;
  // pause
  circle(W - 44, 40, 26, 'rgba(0,0,0,.4)'); ctx.fillStyle = '#fff'; ctx.fillRect(W - 53, 28, 7, 24); ctx.fillRect(W - 42, 28, 7, 24);
  buttons.push({ x: W - 74, y: 10, w: 60, h: 60, cb: () => { G.overlay = { type: 'pause' }; } });
  // roar button
  const rx = W - 92, ry = H - 92, ready = p.roarCd <= 0;
  const target = G.L.obs.some(o => !o.dead && !o.scared && (o.type === 'raptor' || o.type === 'ptero' || o.type === 'boulder') && o.x - p.wx > 0 && o.x - p.wx < 360) || (G.boss && G.boss.state === 'charge' && G.boss.x - p.wx < 390);
  if (ready && target) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T * 14); circle(rx, ry, 82 + 6 * Math.sin(T * 14), '#ffd34d'); ctx.globalAlpha = 1; }
  circle(rx, ry, 66, ready ? 'rgba(214,58,40,.85)' : 'rgba(80,80,80,.7)');
  if (!ready) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(rx, ry, 60, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.roarCd / 0.85)); ctx.stroke(); }
  ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(rx, ry, 66, 0, Math.PI * 2); ctx.stroke();
  otxt('BRÜLL!', rx, ry, 26, '#fff', 'rgba(0,0,0,.6)', 5);
  buttons.push({ x: rx - 80, y: ry - 80, w: 160, h: 160, cb: roar, silent: true });
}
function drawCoach() {
  const c = G.coach;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, 210); const s = 1 + 0.06 * Math.sin(T * 8); ctx.scale(s, s); otxt(c.text, 0, 0, 46, '#ffd34d', '#3b1d00', 10); ctx.restore();
  const u = (T * 1.4) % 1;
  if (c.type === 'jump') {
    ctx.strokeStyle = `rgba(255,255,255,${1 - u})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(W / 2, 300, 18 + u * 55, 0, Math.PI * 2); ctx.stroke();
    setFont(70, 'normal'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('👆', W / 2 + 8, 340 - Math.abs(Math.sin(T * 6)) * 16);
  } else {
    const rx = W - 92, ry = H - 92;
    ctx.strokeStyle = `rgba(255,220,80,${1 - u})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(rx, ry, 70 + u * 45, 0, Math.PI * 2); ctx.stroke();
    circle(rx, ry, 66, 'rgba(214,58,40,1)'); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(rx, ry, 66, 0, Math.PI * 2); ctx.stroke();
    otxt('BRÜLL!', rx, ry, 26, '#fff', 'rgba(0,0,0,.6)', 5);
    const bx = rx - 160 - Math.abs(Math.sin(T * 6)) * 18;
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(bx + 62, ry); ctx.lineTo(bx + 30, ry - 26); ctx.lineTo(bx + 30, ry - 11); ctx.lineTo(bx - 24, ry - 11); ctx.lineTo(bx - 24, ry + 11); ctx.lineTo(bx + 30, ry + 11); ctx.lineTo(bx + 30, ry + 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3b1d00'; ctx.lineWidth = 3; ctx.stroke();
  }
}
function panel(x, y, w, h) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H); rr(x, y + 8, w, h, 26); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill(); rr(x, y, w, h, 26); ctx.fillStyle = '#fff7e0'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#6b4a2b'; ctx.stroke(); }
function drawOverlay() {
  const o = G.overlay, th = WORLDS[G.wi];
  if (o.type === 'pause') {
    panel(280, 100, 400, 350); txt('Pause', W / 2, 155, 44, '#3b2410');
    button('Weiter spielen', 330, 200, 300, 64, () => { G.overlay = null; });
    button(save.muted ? 'Ton: aus' : 'Ton: an', 330, 284, 300, 56, () => { save.muted = !save.muted; writeSave(); }, { color: '#e0d2b0', size: 24 });
    button('Zur Karte', 330, 360, 300, 64, () => go('map'), { color: '#e0d2b0' });
  } else if (o.type === 'retry') {
    panel(220, 110, 520, 320); drawPortrait('chili', W / 2, 180, 50);
    txt('Oh nein! Nicht aufgeben!', W / 2, 262, 32, '#3b2410');
    txt('Chili meint: Nochmal ab dem letzten Fähnchen!', W / 2, 300, 22, '#6b4a2b', 'center', 'normal');
    button('Nochmal!', 290, 340, 200, 62, retry); button('Karte', 510, 340, 160, 62, () => go('map'), { color: '#e0d2b0' });
  } else if (o.type === 'riddle') {
    const r = th.riddle; o.shake = Math.max(0, o.shake - DT);
    ctx.save(); if (o.shake > 0) ctx.translate(Math.sin(T * 60) * 8 * o.shake, 0);
    panel(110, 40, 740, 460); drawPortrait('goetti', 180, 112, 46);
    button('🔊 Vorlesen', 660, 56, 170, 42, () => speak(r.q + ' ' + o.order.map(i => r.a[i]).join('? Oder ') + '?'), { size: 18, color: '#e0d2b0' });
    txt('Goettis Rätsel-Tor', 250, 86, 22, '#8a6a3a', 'left');
    wrapLines(r.q, 560, 28).forEach((l, i) => txt(l, 250, 122 + i * 34, 28, '#3b2410', 'left'));
    o.order.forEach((ai, j) => { const bad = o.wrong.includes(ai); button((bad ? '✗ ' : '') + r.a[ai], 230, 230 + j * 80, 500, 64, () => { if (!bad) answer(ai); }, { color: bad ? '#e8b4b4' : '#f4b400', size: 30 }); });
    if (o.msg) txt(o.msg, W / 2, 478, 22, '#b03a2e');
    ctx.restore();
  } else if (o.type === 'complete') {
    panel(150, 50, 660, 440);
    otxt('Welt geschafft!', W / 2, 105, 46, '#ffd34d', '#3b1d00', 10);
    for (let k = 0; k < 3; k++) { const has = save.eggs[G.wi][k]; const x = W / 2 - 180 + k * 180; drawEgg(x, 190, 36, has ? th.egg : '#ddd', has ? th.eggSpot : '#ccc', has ? 0.6 : 0, Math.sin(T * 3 + k) * 0.08); txt(has ? FACTS[G.wi * 3 + k].name : '???', x, 250, 22, has ? '#3b2410' : '#999'); if (G.newCards.includes(k)) txt('NEU!', x + 34, 160, 18, '#e53935'); }
    drawAmber(W / 2 - 70, 300, 14); txt(`+${G.amber} Bernstein`, W / 2 + 10, 301, 26, '#6b4a2b');
    const missing = 3 - save.eggs[G.wi].reduce((a, b) => a + b, 0);
    txt(missing ? 'Chili schnuppert: Hier sind noch Eier versteckt!' : 'Alle Eier gefunden! Super gemacht!', W / 2, 350, 22, '#6b4a2b', 'center', 'normal');
    button('Karte', 230, 400, 200, 64, () => go('map'), { color: '#e0d2b0' });
    button('Nächste Welt', 460, 400, 270, 64, () => startLevel(G.wi + 1));
  }
}

// =====================================================================
// Dialog & name entry
// =====================================================================
let dialog = null;
function startDialog(lines, done, top) { dialog = { lines, i: 0, t: 0, done, top }; }
function advanceDialog() {
  const l = dialog.lines[dialog.i];
  if (dialog.t * 40 < fmt(l.text).length) { dialog.t = 999; return; }
  SFX.click(); dialog.i++; dialog.t = 0;
  if (dialog.i >= dialog.lines.length) { const d = dialog.done; dialog = null; if (d) d(); }
}
function drawDialog() {
  if (!dialog) return;
  dialog.t += DT;
  const l = dialog.lines[dialog.i], s = fmt(l.text), n = Math.floor(dialog.t * 40);
  const bx = 40, bw = W - 80, bh = 150, by = dialog.top ? 20 : H - 170;
  rr(bx, by + 6, bw, bh, 22); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
  rr(bx, by, bw, bh, 22); ctx.fillStyle = '#fff7e0'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
  drawPortrait(l.who, bx + 78, by + bh / 2, 56);
  const nm = typeof WHO[l.who] === 'function' ? WHO[l.who]() : WHO[l.who];
  setFont(20); const nw = ctx.measureText(nm).width + 26; rr(bx + 150, by - 16, nw, 32, 14); ctx.fillStyle = '#6b4a2b'; ctx.fill(); txt(nm, bx + 150 + nw / 2, by, 20, '#fff7e0');
  const lines = wrapLines(s, bw - 200, 26); let left = n;
  lines.forEach((ln, i) => { if (left <= 0) return; txt(ln.slice(0, left), bx + 150, by + 42 + i * 34, 26, '#3b2410', 'left'); left -= ln.length + 1; });
  if (n >= s.length && Math.sin(T * 6) > 0) txt('weiter ▶', bx + bw - 70, by + bh - 22, 18, '#8a6a3a');
}
const nameBox = document.getElementById('nameBox'), nameInput = document.getElementById('nameInput'), nameOk = document.getElementById('nameOk'), nameLabel = document.getElementById('nameLabel');
function nameOpen() { return nameBox.style.display === 'flex'; }
function askName(label, def, cb) {
  nameLabel.textContent = label; nameInput.value = ''; nameInput.placeholder = def; nameBox.style.display = 'flex';
  setTimeout(() => nameInput.focus(), 60);
  const finish = () => {
    let v = nameInput.value.trim().slice(0, 14); if (!v) v = def; v = v.charAt(0).toUpperCase() + v.slice(1);
    nameBox.style.display = 'none'; nameInput.blur(); nameOk.onclick = null; nameInput.onkeydown = null; audio(); SFX.right(); cb(v);
  };
  nameOk.onclick = finish;
  nameInput.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') finish(); };
}

// =====================================================================
// Title, story, map, book
// =====================================================================
const EMPTY = { pits: [] };
function tryFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen && !window.matchMedia('(display-mode: standalone)').matches) el.requestFullscreen().catch(() => {});
}
function drawTitle() {
  const cam = T * 150;
  drawBackground(0, cam); drawGround(0, EMPTY, cam);
  drawChili(430, GROUND - Math.abs(Math.sin(T * 9)) * 14, 1.4, T * 9);
  drawRex(280, GROUND, 1.3, T * 13, 0.12 + 0.12 * Math.sin(T * 2), { rider: true });
  if (save.babyName) drawBaby(120, GROUND - Math.abs(Math.sin(T * 10)) * 9, 1, T * 10);
  ctx.save(); ctx.translate(W / 2, 110); ctx.rotate(-0.03); otxt('Olis Dino-Rettung', 0, 0, 76, '#ffd34d', '#3b1d00', 14); ctx.restore();
  otxt(save.rexName ? `Ein Abenteuer mit ${save.rexName} und Chili` : 'Ein Abenteuer mit Chili und einem T-Rex', W / 2, 178, 26, '#fff', 'rgba(0,0,0,.7)', 6);
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(T * 4); otxt('Tippe zum Starten', 700, 330, 36, '#fff', '#000', 8); ctx.globalAlpha = 1;
  txt('Ein Weihnachtsgeschenk von Goetti · 2026', W / 2, 515, 17, 'rgba(255,255,255,.75)');
}
function pressTitle() { tryFullscreen(); if (!save.rexName) startStory(); else go('map'); }

function startStory() {
  go('story');
  startDialog([
    { who: 'goetti', text: 'Hallo Oli! Hier ist Goetti, aus meiner Dino-Forschungsstation am grossen Vulkan.' },
    { who: 'goetti', text: 'Heute Nacht hat der Vulkan gebebt – und alle meine Dino-Eier sind davongerollt!' },
    { who: 'goetti', text: 'Ich brauche den mutigsten Dino-Forscher der Welt. Und das bist DU!' },
    { who: 'goetti', text: 'Zum Glück hast du einen starken Freund: einen jungen T-Rex! Aber er hat noch keinen Namen…' },
  ], () => askName('Wie soll dein T-Rex heissen?', 'Rexi', name => {
    save.rexName = name; writeSave();
    startDialog([
      { who: 'rex', text: 'ROOOAAARRR! ({rex} gefällt der Name!)' },
      { who: 'goetti', text: '{rex} – super Name! Und Chili kommt auch mit. Mit der Hasennase findet Chili jedes versteckte Ei!' },
      { who: 'chili', text: 'Schnupper, schnupper… Chili ist bereit!' },
      { who: 'goetti', text: 'Finde die Eier in allen vier Welten. Ganz hinten beim Vulkan wartet das goldene Ei… Los geht\'s!' },
    ], () => go('map'));
  }));
}
function drawStory() {
  drawBackground(0, 0); drawGround(0, EMPTY, 0);
  ctx.fillStyle = '#6b4a2b'; rr(560, 250, 260, 190, 10); ctx.fill();
  ctx.fillStyle = '#4a3020'; ctx.beginPath(); ctx.moveTo(540, 255); ctx.lineTo(690, 170); ctx.lineTo(840, 255); ctx.fill();
  rr(600, 290, 60, 50, 6); ctx.fillStyle = '#ffe08a'; ctx.fill();
  rr(720, 320, 60, 120, 6); ctx.fillStyle = '#3b2410'; ctx.fill();
  setFont(18); rr(610, 222, 160, 28, 8); ctx.fillStyle = '#f3dcc4'; ctx.fill(); txt('Dino-Station', 690, 236, 18, '#3b2410');
  drawGoetti(480, GROUND, 1.2, true);
  drawRex(240, GROUND, 1.15, T * 2, save.rexName ? 0.2 : 0, { rider: true });
  drawChili(380, GROUND, 1.4, T * 3);
}

const MAPNODES = [{ x: 165, y: 345 }, { x: 385, y: 265 }, { x: 600, y: 350 }, { x: 815, y: 245 }];
function drawMapIcon(i, x, y) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI * 2); ctx.clip();
  const th = WORLDS[i]; const g = ctx.createLinearGradient(0, y - 46, 0, y + 46); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); ctx.fillStyle = g; ctx.fillRect(x - 50, y - 50, 100, 100);
  ctx.fillStyle = th.top; ctx.fillRect(x - 50, y + 22, 100, 30);
  if (i === 0) palm(x, y + 24, 60, '#1f5a35'); else if (i === 1) cactus(x, y + 24, 46, '#5f7a2a'); else if (i === 2) pine(x, y + 26, 70, '#1d4a3f', true); else drawVolcano(x, y + 24, 0.22, '#2a0a08', 1);
  ctx.restore();
}
function drawMap() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d2b53'); g.addColorStop(0.7, '#e07a5f'); g.addColorStop(1, '#f2cc8f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(T + i)); circle(hash(i) * W, hash(i + 9) * 180, 1.3, '#fff'); } ctx.globalAlpha = 1;
  drawVolcano(830, 330, 1, '#3a1e1a', 0.6);
  drawHills(0, '#3d5a45', 380, 50, 2); drawHills(300, '#2a4535', 450, 40, 4);
  drawSnow(0.35);
  ctx.setLineDash([16, 14]); ctx.lineDashOffset = -T * 20; ctx.strokeStyle = 'rgba(255,240,200,.9)'; ctx.lineWidth = 7; ctx.beginPath();
  MAPNODES.forEach((n, i) => { if (!i) ctx.moveTo(n.x, n.y); else { const m = MAPNODES[i - 1]; ctx.quadraticCurveTo((m.x + n.x) / 2, Math.min(m.y, n.y) - 60, n.x, n.y); } });
  ctx.stroke(); ctx.setLineDash([]);
  MAPNODES.forEach((n, i) => {
    const open = i <= save.unlocked, th = WORLDS[i], pulse = i === save.unlocked && !save.finished ? 1 + 0.06 * Math.sin(T * 5) : 1;
    ctx.save(); ctx.translate(n.x, n.y); ctx.scale(pulse, pulse); ctx.translate(-n.x, -n.y);
    circle(n.x, n.y + 6, 52, 'rgba(0,0,0,.35)'); circle(n.x, n.y, 52, '#fff7e0'); drawMapIcon(i, n.x, n.y);
    if (!open) { circle(n.x, n.y, 46, 'rgba(40,40,40,.65)'); rr(n.x - 16, n.y - 4, 32, 26, 5); ctx.fillStyle = '#ddd'; ctx.fill(); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(n.x, n.y - 6, 10, Math.PI, 0); ctx.stroke(); }
    ctx.restore();
    otxt(`${i + 1}. ${th.name}`, n.x, n.y + 72, 24, open ? '#fff' : '#bbb', 'rgba(0,0,0,.7)', 6);
    for (let k = 0; k < 3; k++) drawEgg(n.x - 26 + k * 26, n.y - 70, 11, save.eggs[i][k] ? th.egg : 'rgba(255,255,255,.25)', save.eggs[i][k] ? th.eggSpot : 'rgba(255,255,255,.15)');
    buttons.push({ x: n.x - 60, y: n.y - 85, w: 120, h: 175, cb: () => { if (open) startLevel(i); else { SFX.wrong(); toast('Diese Welt ist noch gesperrt!', '#ffb4a8'); } } });
  });
  const cur = MAPNODES[Math.min(save.unlocked, 3)];
  drawRex(cur.x - 108, cur.y + 48 - Math.abs(Math.sin(T * 4)) * 6, 0.5, T * 4, 0, { rider: true });
  otxt('Welt-Karte', 30, 42, 40, '#ffd34d', '#3b1d00', 9, 'left');
  otxt(fmt('{rex} und Chili sind bereit!'), 32, 84, 22, '#fff', 'rgba(0,0,0,.7)', 5, 'left');
  drawAmber(W - 210, 40, 14); otxt(String(save.amber), W - 188, 41, 26, '#ffe08a', 'rgba(0,0,0,.7)', 5, 'left');
  button(save.muted ? 'Ton aus' : 'Ton an', W - 130, 18, 112, 46, () => { save.muted = !save.muted; writeSave(); }, { size: 20, color: '#e0d2b0' });
  button('Dino-Buch', 24, H - 82, 210, 60, () => { bookSel = -1; go('book'); });
  if (save.finished) button('Weihnachts-Ende', W - 274, H - 82, 250, 60, () => startEnding(), { color: '#e57373', textColor: '#fff' });
}

let bookSel = -1;
function drawBook() {
  ctx.fillStyle = '#5b3b22'; ctx.fillRect(0, 0, W, H);
  rr(16, 16, W - 32, H - 32, 20); ctx.fillStyle = '#f3e2bf'; ctx.fill();
  otxt('Goettis Dino-Buch', W / 2, 54, 40, '#ffd34d', '#3b1d00', 9);
  const found = save.eggs.flat().reduce((a, b) => a + b, 0);
  txt(`${found} von 12 Karten gefunden`, W / 2, 92, 20, '#6b4a2b', 'center', 'normal');
  for (let i = 0; i < 12; i++) {
    const wi = Math.floor(i / 3), k = i % 3, has = save.eggs[wi][k], th = WORLDS[wi];
    const x = 44 + wi * 222, y = 116 + k * 122;
    rr(x, y, 206, 108, 14); ctx.fillStyle = has ? th.sky[1] : '#d8c8a8'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = has ? '#6b4a2b' : '#b8a888'; ctx.stroke();
    if (has) { drawEgg(x + 36, y + 54, 22, th.egg, th.eggSpot); txt(FACTS[i].name, x + 128, y + 46, FACTS[i].name.length > 12 ? 17 : 21, '#2b1a00'); txt(th.name, x + 128, y + 74, 15, 'rgba(0,0,0,.6)', 'center', 'normal'); }
    else { txt('?', x + 103, y + 46, 44, '#a8987a'); txt(th.name, x + 103, y + 86, 15, '#a8987a', 'center', 'normal'); }
    if (bookSel < 0) buttons.push({ x, y, w: 206, h: 108, cb: () => { if (has) bookSel = i; else toast('Diese Karte hast du noch nicht gefunden.', '#fff'); } });
  }
  if (bookSel < 0) button('Zurück', W / 2 - 100, H - 64, 200, 52, () => go('map'), { size: 24 });
  else {
    const wi = Math.floor(bookSel / 3), th = WORLDS[wi];
    panel(130, 70, 700, 400);
    drawEgg(230, 200, 56, th.egg, th.eggSpot, 0.5, Math.sin(T * 2) * 0.08);
    txt(FACTS[bookSel].name, 320, 130, 36, '#3b2410', 'left');
    wrapLines(FACTS[bookSel].text, 460, 24).forEach((l, i) => txt(l, 320, 180 + i * 32, 24, '#3b2410', 'left', 'normal'));
    button('Schliessen', W / 2 - 110, 390, 220, 58, () => { bookSel = -1; });
    buttons.unshift({ x: 0, y: 0, w: W, h: H, cb: () => { bookSel = -1; } });
  }
}

// =====================================================================
// Christmas ending
// =====================================================================
let E = null;
function startEnding() {
  go('ending');
  E = { phase: 'talk', taps: 0, wob: 0, hatchT: 0, fw: 0, asked: false };
  startDialog([
    { who: 'goetti', text: 'Oli, {rex}, Chili – ihr habt es geschafft! Alle Eier sind wieder sicher in der Station.' },
    { who: 'goetti', text: 'Und schaut mal, wer zum Feiern gekommen ist: Mami, Papi und Fabio!' },
    { who: 'fabio', text: 'Oli! Oli! Das goldene Ei wackelt!!' },
    { who: 'goetti', text: 'Tatsächlich! Tippe ganz oft auf das Ei, Oli – hilf dem Baby beim Schlüpfen!' },
  ], () => { E.phase = 'tap'; }, true);
}
function tapEgg() {
  E.taps++; E.wob = 0.5; SFX.crack(); burst(480, 380, 10, ['#ffd700', '#fff3b0'], 250, 600, 5, 0.6);
  if (E.taps >= 6) { E.phase = 'hatch'; E.hatchT = 0; SFX.right(); burst(480, 380, 70, ['#ffd700', '#fff', '#ff5252', '#69f0ae'], 520, 500, 8, 1.6); }
}
function afterBabyName() {
  startDialog([
    { who: 'mami', text: '{baby}! Was für ein wunderschöner Name!' },
    { who: 'papi', text: 'Willkommen in der Familie, {baby}!' },
    { who: 'fabio', text: 'Darf ich {baby} auch mal streicheln? Bitte, bitte!' },
    { who: 'chili', text: 'Mümmel, mümmel! (Chili freut sich riesig.)' },
    { who: 'goetti', text: '{baby} kommt ab jetzt bei jedem Abenteuer mit. Und jetzt: Lasst uns Weihnachten feiern!' },
  ], () => { E.phase = 'party'; save.finished = true; writeSave(); jingle(); }, true);
}
function updateEnding(dt) {
  E.wob = Math.max(0, E.wob - dt);
  if (E.phase === 'hatch') {
    E.hatchT += dt;
    if (E.hatchT > 1.6 && !E.asked) {
      E.asked = true;
      if (!save.babyName) startDialog([{ who: 'goetti', text: 'Ein Dino-Baby – mit Weihnachtsmütze! Oli, du darfst ihm einen Namen geben.' }], () => askName('Wie soll das Dino-Baby heissen?', 'Krümel', n => { save.babyName = n; writeSave(); afterBabyName(); }), true);
      else afterBabyName();
    }
  }
  if (E.phase === 'party') { E.fw -= dt; if (E.fw <= 0) { E.fw = 0.45 + Math.random() * 0.4; const c = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#ea80fc', '#fff']; burst(120 + Math.random() * 720, 60 + Math.random() * 150, 40, [c[Math.floor(Math.random() * 6)], '#fff'], 300, 160, 5, 1.5); tone(200 + Math.random() * 200, 0.3, 'triangle', 0.04, 80); } }
}
function drawEnding() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#071630'); g.addColorStop(1, '#2c4f7c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 80; i++) { ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(T * 1.3 + i)); circle(hash(i) * W, hash(i + 40) * 300, 1.4, '#fff'); } ctx.globalAlpha = 1;
  circle(860, 80, 34, '#f4f1de');
  drawVolcano(700, 400, 0.7, '#1b2a44', 0);
  drawHills(0, '#c9dcf0', 420, 30, 3);
  ctx.fillStyle = '#eef5ff'; ctx.fillRect(0, 450, W, 90);
  // station hut
  ctx.fillStyle = '#6b4a2b'; ctx.fillRect(30, 300, 180, 150);
  ctx.fillStyle = '#4a3020'; ctx.beginPath(); ctx.moveTo(15, 305); ctx.lineTo(120, 235); ctx.lineTo(225, 305); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(15, 305); ctx.lineTo(120, 235); ctx.lineTo(225, 305); ctx.lineTo(210, 300); ctx.lineTo(120, 245); ctx.lineTo(30, 300); ctx.fill();
  rr(50, 330, 50, 42, 5); ctx.fillStyle = `rgba(255,224,138,${0.85 + 0.15 * Math.sin(T * 3)})`; ctx.fill();
  rr(140, 360, 50, 90, 5); ctx.fillStyle = '#3b2410'; ctx.fill();
  ctx.strokeStyle = '#2e8b57'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(165, 385, 12, 0, Math.PI * 2); ctx.stroke(); circle(165, 375, 3, '#d63a3a');
  for (let i = 0; i < 8; i++) circle(30 + i * 25, 302, 4, ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff'][(i + Math.floor(T * 3)) % 4]);
  pine(268, 452, 210, '#1f6b42', true);
  rr(230, 425, 30, 26, 3); ctx.fillStyle = '#d63a3a'; ctx.fill(); ctx.fillStyle = '#ffd740'; ctx.fillRect(243, 425, 5, 26);
  rr(280, 432, 26, 20, 3); ctx.fillStyle = '#40a4ff'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(291, 432, 4, 20);
  // family (right)
  drawLongneck(800, 452, 0.72, '#b07cc6', T * 2, true);
  drawLongneck(905, 452, 0.8, '#4f8fd6', T * 2 + 1, true);
  drawTrike(720, 455 - (E.phase === 'party' ? Math.abs(Math.sin(T * 6)) * 12 : 0), 1, '#f39c34', 0, true);
  drawGoetti(325, 452, 1.1, E.phase === 'party');
  drawRex(640, 452, 1.0, E.phase === 'party' ? T * 6 : 0, E.phase === 'party' ? 0.3 + 0.3 * Math.sin(T * 5) : 0.1, { rider: true, flip: true, hat: true });
  drawChili(395, 456 - (E.phase === 'party' ? Math.abs(Math.sin(T * 8)) * 18 : 0), 1.4, T * 6, false);
  // nest + egg
  ell(480, 445, 62, 16, 0, '#7a5230');
  ctx.strokeStyle = '#a0703a'; ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(424 + i * 13, 435 + (i % 2) * 6); ctx.lineTo(436 + i * 13, 452 - (i % 2) * 8); ctx.stroke(); }
  if (E.phase === 'talk' || E.phase === 'tap') {
    const rot = Math.sin(T * (E.phase === 'tap' ? 9 : 4)) * (0.06 + E.wob * 0.5);
    drawEgg(480, 395, 46, '#ffd700', '#e0a800', 0.9 + 0.3 * Math.sin(T * 4), rot);
    ctx.save(); ctx.translate(480, 395); ctx.rotate(rot); ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 3; ctx.beginPath(); let cx = -30, cy = -6; ctx.moveTo(cx, cy);
    for (let i = 0; i < E.taps * 2; i++) { cx += 6; cy += i % 2 ? 9 : -9; ctx.lineTo(cx, cy); } ctx.stroke(); ctx.restore();
    if (E.phase === 'tap') { otxt('Tippe auf das Ei!', 480, 290, 34, '#ffd34d', '#3b1d00', 8); buttons.push({ x: 0, y: 0, w: W, h: H, cb: tapEgg, silent: true }); }
  } else {
    const s = Math.min(1, E.hatchT * 2 + 0.01);
    ctx.save(); ctx.translate(480, 436); ctx.scale(s, s);
    drawEgg(-40, 0, 20, '#ffd700', '#e0a800', 0, -0.6); drawEgg(40, 0, 20, '#ffd700', '#e0a800', 0, 0.6);
    drawBaby(0, -Math.abs(Math.sin(T * 5)) * (E.phase === 'party' ? 14 : 4), 1.5, T * 5);
    ctx.restore();
  }
  drawParts(0);
  drawSnow(1);
  if (E.phase === 'party') {
    ctx.save(); ctx.translate(W / 2, 105); ctx.rotate(Math.sin(T * 2) * 0.02);
    otxt('Frohe Weihnachten, Oli!', 0, 0, 62, '#ffd34d', '#7a1010', 14); ctx.restore();
    otxt('Alles Liebe – dein Goetti', W / 2, 165, 30, '#fff', 'rgba(0,0,0,.7)', 6);
    button('Lied nochmal', 24, 20, 180, 50, () => jingle(), { size: 20, color: '#e0d2b0' });
    button('Zur Karte', W - 204, 20, 180, 50, () => go('map'), { size: 22 });
  }
}

// =====================================================================
// Input
// =====================================================================
function toLogical(e) { return { x: (e.clientX - OX) / SC, y: (e.clientY - OY) / SC }; }
canvas.addEventListener('pointerdown', e => {
  e.preventDefault(); audio();
  if (nameOpen()) return;
  const { x, y } = toLogical(e);
  if (dialog) { advanceDialog(); return; }
  if (hitButtons(x, y)) return;
  if (scene === 'title') pressTitle();
  else if (scene === 'play' && !G.overlay) jump();
});
window.addEventListener('keydown', e => {
  if (nameOpen() || e.repeat) return;
  audio();
  const k = e.key;
  if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') {
    e.preventDefault();
    if (dialog) advanceDialog();
    else if (scene === 'title') pressTitle();
    else if (scene === 'play' && !G.overlay) jump();
    else if (scene === 'ending' && E.phase === 'tap') tapEgg();
  } else if (k === 'r' || k === 'R' || k === 'x' || k === 'X' || k === 'ArrowRight' || k === 'Enter') {
    if (dialog) advanceDialog();
    else if (scene === 'play' && !G.overlay) roar();
  } else if ((k === 'Escape' || k === 'p') && scene === 'play') {
    G.overlay = G.overlay && G.overlay.type === 'pause' ? null : (G.overlay || { type: 'pause' });
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && scene === 'play' && G && !G.overlay) G.overlay = { type: 'pause' }; });

// =====================================================================
// Main loop
// =====================================================================
let last = performance.now();
function frame(now) {
  DT = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now; T += DT;
  const portrait = window.innerHeight > window.innerWidth * 1.05;
  if (!portrait) {
    // fixed sub-steps keep physics identical on slow and fast devices
    let rem = DT;
    while (rem > 1e-4) {
      const st = Math.min(rem, 1 / 60); rem -= st;
      if (scene === 'play') updatePlay(st);
      else if (scene === 'ending') updateEnding(st);
      updateParts(st);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * OX, DPR * OY);
  musicTick(save.muted || portrait ? null : scene === 'play' ? (G.overlay && G.overlay.type !== 'riddle' ? null : String(G.wi)) : scene === 'ending' ? null : 'map');
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  buttons = [];
  if (scene === 'title') drawTitle();
  else if (scene === 'story') drawStory();
  else if (scene === 'map') drawMap();
  else if (scene === 'book') drawBook();
  else if (scene === 'play') drawPlay();
  else if (scene === 'ending') drawEnding();
  drawDialog();
  if (!(scene === 'play' && G.overlay)) drawToasts();
  if (portrait) { buttons = []; ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(0, 0, W, H); otxt('Bitte das Tablet quer halten!', W / 2, H / 2, 44, '#ffd34d', '#000', 8); }
  ctx.restore();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// debug hook for testing in the browser console
window.__dino = { get scene() { return scene; }, get G() { return G; }, get E() { return E; }, save, startLevel, startEnding, go, jump, roar, updatePlay, updateEnding, answer, retry, tapEgg };
})();
