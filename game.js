'use strict';
/* Olis Dino-Rettung – ein Weihnachtsgeschenk von Goetti */
(() => {
// =====================================================================
// Setup
// =====================================================================
const W = 960, H = 540, GROUND = 440, GRAV = 2300;
const FONT = '"Trebuchet MS","Segoe UI",system-ui,sans-serif';
const canvas = document.getElementById('game');
let ctx = canvas.getContext('2d');
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
let save = { rexName: '', babyName: '', unlocked: 0, eggs: [[0,0,0],[0,0,0],[0,0,0],[0,0,0]], amber: 0, finished: false, muted: false, tutorialDone: false, movesDone: false,
  medals: [[0,0,0],[0,0,0],[0,0,0],[0,0,0]], treasures: [0,0,0,0], treasureNew: -1 };
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
  stomp() { noise(0.3, 0.45, 260); tone(110, 0.25, 'square', 0.13, 45); },
  boing() { tone(260, 0.18, 'triangle', 0.13, 780); },
  fire() { noise(0.35, 0.3, 1600); tone(200, 0.3, 'sawtooth', 0.06, 90); },
  duck() { tone(420, 0.08, 'triangle', 0.06, 260); },
  power() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'square', 0.05, null, i * 0.06)); },
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
  { name: 'Dschungel', speed: 270, segs: 24, patterns: ['rock', 'rock', 'pit', 'pit', 'amber', 'raptor', 'plat', 'boulder', 'low', 'compy', 'geode'],
    startTip: 'Willkommen im Dschungel! Sammle Bernstein und finde die 3 Dino-Eier.',
    riddles: [
      { q: 'Ein Bauer hat 10 Schafe. Alle bis auf 7 laufen weg. Wie viele Schafe hat er noch?', a: ['7', '3', '10'], ok: 0, why: '„Alle bis auf 7“ heisst: 7 Schafe bleiben da!' },
      { q: 'Was ist schwerer: ein Kilo Federn oder ein Kilo Steine?', a: ['Beide gleich schwer', 'Die Steine', 'Die Federn'], ok: 0, why: 'Ein Kilo ist ein Kilo – egal ob Federn oder Steine!' },
      { q: 'Fabios Mami hat zwei Kinder. Eines heisst Fabio. Wie heisst das andere?', a: ['Oli', 'Chili', 'Goetti'], ok: 0, why: 'Na klar – das bist DU!' },
      { q: 'Ich habe drei Hörner, aber ich bin kein Nashorn. Wer bin ich?', a: ['Triceratops', 'Stegosaurus', 'T-Rex'], ok: 0, why: '„Tri“ heisst drei – Triceratops heisst „Drei-Horn-Gesicht“!' },
    ],
    sky: ['#0f3b3a', '#8cc49b'], far: '#2f6a50', mid: '#1f4a38', ground: '#4a3020', top: '#3f9b3a', dots: '#3a2416', edge: '#2e1d12', plat: '#6b4a2b', platTop: '#4caf50',
    rock: '#7b6b5a', deco: '#173d2c', volcS: 0.45, volcCol: '#35544a', egg: '#f6e7b0', eggSpot: '#6aa84f' },
  { name: 'Canyon', speed: 295, segs: 30, patterns: ['rock', 'rock2', 'pit', 'pit', 'raptor', 'ptero', 'swoop', 'boulder', 'plat', 'amber', 'low', 'compy', 'geode'],
    startTip: 'Der heisse Canyon! Hier fliegen Flugsaurier herum.',
    riddles: [
      { q: 'Ein Hahn legt ein Ei genau auf die Spitze vom Dach. Auf welche Seite rollt es?', a: ['Hähne legen keine Eier!', 'Nach links', 'Nach rechts'], ok: 0, why: 'Eier legen nur Hennen. Ein Hahn legt gar keine Eier!' },
      { q: 'Du rennst um die Wette und überholst den Zweiten. Auf welchem Platz bist du jetzt?', a: ['Zweiter', 'Erster', 'Dritter'], ok: 0, why: 'Du nimmst seinen Platz ein – also bist du jetzt Zweiter!' },
      { q: 'Was hat ganz viele Zähne, kann aber nicht beissen?', a: ['Ein Kamm', 'Ein Hai', 'Ein T-Rex'], ok: 0, why: 'Ein Kamm hat viele Zähne – aber er beisst nie!' },
      { q: 'Ich kann fliegen und lebte bei den Dinos – aber ich bin gar kein Dinosaurier. Wer bin ich?', a: ['Pteranodon', 'Velociraptor', 'Stegosaurus'], ok: 0, why: 'Der Pteranodon war ein Flugsaurier – das ist kein Dinosaurier!' },
    ],
    sky: ['#d9702e', '#f7d08a'], far: '#c0643a', mid: '#9a4a2a', ground: '#b5603a', top: '#d98b4e', dots: '#8e4526', edge: '#6e2f17', plat: '#8b4a2b', platTop: '#e0a060',
    rock: '#8d5a3b', deco: '#7a3a1e', volcS: 0.65, volcCol: '#9c5a3c', mesa: true, egg: '#cfe8ff', eggSpot: '#e07b39' },
  { name: 'Eiszeit', speed: 315, segs: 34, patterns: ['rock', 'rock2', 'pit', 'icicle', 'icicle', 'raptor', 'ptero', 'boulder', 'plat', 'amber', 'low', 'low', 'compy', 'geode'],
    startTip: 'Brrr, die Eiszeit! Hier riecht es schon ein bisschen nach Weihnachten…',
    riddles: [
      { q: 'Wie viele Monate im Jahr haben 28 Tage?', a: ['Alle 12', 'Nur einer', 'Zwei'], ok: 0, why: 'Jeder Monat hat mindestens 28 Tage – also alle 12!' },
      { q: 'Je mehr du davon wegnimmst, desto grösser wird es. Was ist es?', a: ['Ein Loch', 'Ein Schneemann', 'Ein Berg'], ok: 0, why: 'Je mehr Erde du wegschaufelst, desto grösser wird das Loch!' },
      { q: 'Was wird immer nasser, je mehr es trocknet?', a: ['Ein Handtuch', 'Die Sonne', 'Ein Eiszapfen'], ok: 0, why: 'Das Handtuch trocknet dich ab – und wird dabei selbst nass!' },
      { q: 'Chili frisst jeden Tag 2 Karotten. Wie viele Karotten sind das in einer ganzen Woche?', a: ['14', '12', '9'], ok: 0, why: 'Eine Woche hat 7 Tage: 7 mal 2 = 14 Karotten!' },
    ],
    sky: ['#0b1f3f', '#5d86b8'], far: '#c9dcf0', mid: '#8fb0d6', ground: '#5f7591', top: '#f4f8ff', dots: '#4b5f7a', edge: '#3c4f68', plat: '#9fc3e6', platTop: '#ffffff',
    rock: '#7f93ab', deco: '#1d3b4f', volcS: 0.85, volcCol: '#3a4f6e', stars: true, snow: true, egg: '#e8f4ff', eggSpot: '#5aa0e0' },
  { name: 'Vulkan', speed: 335, segs: 36, patterns: ['pit', 'pit', 'geyser', 'geyser', 'raptor', 'ptero', 'swoop', 'boulder', 'rock2', 'plat', 'low', 'compy', 'compy', 'geode'],
    startTip: 'Der Vulkan! Irgendwo hier ist das goldene Ei…',
    riddles: [
      { q: 'Ein T-Rex wiegt 7 Tonnen. Wie viel wiegt er, wenn er auf einem Bein steht?', a: ['7 Tonnen', '3,5 Tonnen', '14 Tonnen'], ok: 0, why: 'Er wird doch nicht leichter, nur weil er ein Bein hebt!' },
      { q: 'Welcher Dino hat NICHT zur gleichen Zeit gelebt wie der T-Rex?', a: ['Stegosaurus', 'Triceratops', 'Ankylosaurus'], ok: 0, why: 'Der Stegosaurus lebte viel früher. Zwischen ihm und dem T-Rex liegt mehr Zeit als zwischen dem T-Rex und uns!' },
      { q: 'Was kommt einmal in jeder Minute vor, zweimal in jedem Moment, aber nie in tausend Jahren?', a: ['Der Buchstabe M', 'Ein Meteorit', 'Ein Vulkanausbruch'], ok: 0, why: '„Minute“ hat ein M, „Moment“ hat zwei M – und in „tausend Jahren“ ist gar kein M!' },
      { q: 'Welches Tier von heute ist ein Verwandter der Dinosaurier?', a: ['Huhn', 'Hase', 'Goldfisch'], ok: 0, wrongMsg: { 1: 'Chili: Hey! Ich bin doch kein Dino!' }, why: 'Vögel stammen von den Dinosauriern ab – auch das Huhn!' },
      { q: 'Der Kiwi ist ein Vogel. Was kann er aber NICHT?', a: ['Fliegen', 'Laufen', 'Eier legen'], ok: 0, why: 'Kiwis haben nur winzige Flügel – fliegen können sie nicht!' },
    ],
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

const TREASURES = [
  { name: 'Goettis Gitarre', line: 'Meine Gitarre! Danke, Oli! Tipp sie in der Schatzkiste an – dann spiele ich dir was vor.', tap: 'Goetti spielt ein Lied!' },
  { name: 'Goettis Velo', line: 'Mein Velo! Das hat der Vulkan bis in den Canyon geschleudert. Damit machen wir zwei mal eine grosse Tour!', tap: 'Kling, kling!' },
  { name: 'Goettis Angel', line: 'Meine Angelrute! Weisst du was? Im Winter kann man sogar durch ein Loch im Eis fischen. Das machen wir mal zusammen!', tap: 'Platsch! Ein Fisch!' },
  { name: 'Kiwi', line: 'Kiwi! Mein kleiner Freund aus Neuseeland ist wieder da! Kiwis können nicht fliegen – darum läuft Kiwi ab jetzt mit dir mit.', tap: 'Kiwi! Kiwi!' },
];
const MEDALS = [['Eier-Profi', 'Alle 3 Eier'], ['Ohne Kratzer', 'Kein Treffer'], ['Bernstein-Sammler', '80% Bernstein']];
const WHO = { goetti: 'Goetti', chili: 'Chili', rex: () => save.rexName || 'T-Rex', mami: 'Mami', papi: 'Papi', fabio: 'Fabio', kiwi: 'Kiwi' };

// =====================================================================
// Character drawing
// =====================================================================
function drawOli(x, y, ph, hat) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2f5aa8'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 10, y + 12); ctx.stroke();
  rr(x - 10, y - 28, 20, 28, 7); ctx.fillStyle = hgrad(x - 10, x + 10, '#f26a5e', '#e0473c', '#a82e26'); ctx.fill();
  ctx.fillStyle = '#ffd34d'; ctx.fillRect(x - 1, y - 26, 2, 22);
  rr(x - 10, y - 31, 20, 6, 3); ctx.fillStyle = '#2e9e5b'; ctx.fill(); ctx.fillStyle = '#2e9e5b'; ctx.fillRect(x - 12, y - 28, 5, 12 + Math.sin(ph) * 2);
  const hy = y - 14 + Math.sin(ph) * 2;
  ctx.strokeStyle = '#e0473c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + 4, y - 21); ctx.lineTo(x + 18, hy); ctx.stroke();
  circle(x + 19, hy, 3.5, '#f2c9a0');
  circle(x + 2, y - 40, 11, '#f2c9a0'); ell(x + 9, y - 36, 3, 2, 0, 'rgba(255,120,110,.45)');
  ctx.fillStyle = '#6b4226'; ctx.beginPath(); ctx.arc(x + 1, y - 43, 11, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
  circle(x + 7, y - 41, 1.7, '#222');
  ctx.strokeStyle = '#8a3b2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + 6, y - 37, 3, 0.2, Math.PI * 0.8); ctx.stroke();
  if (hat) {
    ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.arc(x + 1, y - 45, 11, Math.PI, Math.PI * 2); ctx.fill();
    rr(x - 11, y - 47, 24, 6, 3); ctx.fillStyle = '#fff'; ctx.fill();
    circle(x + 1, y - 58, 5, '#fff');
  }
}

function rexLeg(x, ph, col, dark, air, claw) {
  const sw = air ? 0.7 : Math.sin(ph), lift = air ? 6 : Math.max(0, Math.cos(ph)) * 10;
  ell(x - 4, -48, 17, 24, 0.25, col);
  const ax = x + sw * 14, ay = -10 - lift;
  ctx.lineCap = 'round';
  ctx.strokeStyle = col; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x + 4, -32); ctx.lineTo(ax, ay); ctx.stroke();
  ctx.strokeStyle = dark; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 16, ay + 8); ctx.stroke();
  if (claw) { ctx.fillStyle = '#f3ead2'; for (const d of [0, 4]) { ctx.beginPath(); ctx.moveTo(ax + 15 - d, ay + 4 + d * 0.5); ctx.lineTo(ax + 24 - d, ay + 10 + d * 0.5); ctx.lineTo(ax + 14 - d, ay + 10 + d * 0.5); ctx.fill(); } }
}
function rexCrouchLeg(x, col, dark) {
  ell(x - 6, -17, 21, 13, 0.12, col);
  ctx.lineCap = 'round'; ctx.strokeStyle = dark; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x + 2, -6); ctx.lineTo(x + 22, -3); ctx.stroke();
  ctx.fillStyle = '#f3ead2'; for (const d of [0, 4]) { ctx.beginPath(); ctx.moveTo(x + 21 - d, -6 + d * 0.3); ctx.lineTo(x + 30 - d, -1 + d * 0.3); ctx.lineTo(x + 20 - d, 0); ctx.fill(); }
}
const DUCK_DY = 36, DUCK_ROT = 0.1;
// mouth tip relative to the rex's feet (unscaled), honouring the crouch
function rexMouth(duck) {
  const lx = 94, ly = -84;
  if (!duck) return [lx, ly];
  const c = Math.cos(DUCK_ROT), sn = Math.sin(DUCK_ROT);
  return [lx * c - ly * sn, lx * sn + ly * c + DUCK_DY];
}
function drawRex(x, y, s, ph, jaw, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(o.flip ? -s : s, s);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  const b0 = o.body || '#2e8b57', d0 = o.dark || '#1d6a40', belly0 = o.belly || '#b7d98b';
  const body = vgrad(-125, -30, shade(b0, 1.35), b0, shade(b0, 0.62)), dark = vgrad(-80, 0, d0, shade(d0, 0.6)), belly = vgrad(-66, -40, shade(belly0, 1.15), belly0);
  ctx.translate(0, o.air ? 0 : -Math.abs(Math.sin(ph)) * 3);
  if (o.duck) { rexCrouchLeg(-12, dark, '#0f4528'); ctx.translate(0, DUCK_DY); ctx.rotate(DUCK_ROT); }
  else { if (o.stomp) ctx.scale(0.95, 1.06); rexLeg(-6, ph + Math.PI, dark, '#0f4528', o.air, true); }
  const tw = Math.sin(ph * 0.5) * 5;
  // back spikes
  ctx.fillStyle = shade(d0, 0.8);
  for (const [sx, sy, sz] of [[-92, -71, 5], [-74, -77, 6], [-55, -82, 7], [-36, -86, 8], [-16, -91, 8], [3, -95, 8], [20, -97, 7], [34, -103, 6]]) { const ty = sy + (sx < -60 ? tw * 0.4 : 0); ctx.beginPath(); ctx.moveTo(sx - sz, ty + 6); ctx.lineTo(sx + sz * 0.3, ty - sz - 2); ctx.lineTo(sx + sz, ty + 6); ctx.fill(); }
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-15, -84); ctx.quadraticCurveTo(-70, -82, -120, -62 + tw); ctx.quadraticCurveTo(-70, -56, -15, -46); ctx.closePath(); ctx.fill();
  ell(5, -66, 46, 28, -0.18, body);
  ell(14, -53, 32, 13, -0.25, belly);
  ctx.strokeStyle = 'rgba(90,120,40,.35)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-4 + i * 10, -62 + i * 2.5); ctx.lineTo(2 + i * 10, -44 + i * 2); ctx.stroke(); }
  ell(-8, -80, 26, 7, -0.12, 'rgba(255,255,255,.13)');
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(22, -88); ctx.quadraticCurveTo(42, -102, 52, -96); ctx.lineTo(52, -72); ctx.quadraticCurveTo(38, -60, 28, -58); ctx.closePath(); ctx.fill();
  // lower jaw
  ctx.save(); ctx.translate(46, -92); ctx.rotate(jaw * 0.5);
  if (jaw > 0.05) { ctx.fillStyle = '#8b1e1e'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(46, -2); ctx.lineTo(40, 8); ctx.lineTo(0, 8); ctx.fill(); ell(22, 4, 12, 3, 0, '#e0607a'); }
  ctx.fillStyle = shade(d0, 1.05); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(44, 2); ctx.quadraticCurveTo(47, 10, 38, 12); ctx.lineTo(0, 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(belly0, 0.95); ctx.beginPath(); ctx.moveTo(4, 9); ctx.lineTo(38, 9); ctx.quadraticCurveTo(36, 12, 30, 12); ctx.lineTo(4, 12); ctx.fill();
  ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(12 + i * 7, 2); ctx.lineTo(15 + i * 7, -4); ctx.lineTo(18 + i * 7, 2); ctx.fill(); }
  ctx.restore();
  // upper head
  ctx.fillStyle = vgrad(-122, -88, shade(b0, 1.4), b0, shade(b0, 0.8)); ctx.beginPath(); ctx.moveTo(38, -86); ctx.lineTo(40, -108); ctx.quadraticCurveTo(52, -125, 80, -119); ctx.quadraticCurveTo(99, -113, 97, -100); ctx.lineTo(95, -92); ctx.lineTo(46, -89); ctx.closePath(); ctx.fill();
  ell(74, -116, 15, 3.2, -0.12, 'rgba(255,255,255,.28)');
  ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(56 + i * 6.5, -91); ctx.lineTo(59 + i * 6.5, -84); ctx.lineTo(62 + i * 6.5, -91); ctx.fill(); }
  ell(80, -98, 6, 3, 0, 'rgba(255,120,120,.35)');
  ell(65, -114, 11, 4, -0.2, d0);
  circle(66, -107, 5.4, '#fff'); circle(67.5, -107, 3.4, '#e8a317'); circle(68, -107, 2.1, '#1a1a1a'); circle(69, -108.5, 1.1, '#fff');
  circle(91, -108, 1.8, d0);
  ctx.strokeStyle = d0; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-34 + i * 15, -90 + i); ctx.lineTo(-28 + i * 15, -78); ctx.stroke(); }
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-90 + i * 16, -70 + i * 2 + tw * 0.4); ctx.lineTo(-86 + i * 16, -62 + i + tw * 0.4); ctx.stroke(); }
  ctx.strokeStyle = shade(b0, 0.8); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(33, -62); ctx.lineTo(44, -54 + Math.sin(ph) * 2); ctx.lineTo(50, -58); ctx.stroke();
  ctx.strokeStyle = '#f3ead2'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(50, -58); ctx.lineTo(54, -56); ctx.stroke();
  if (o.duck) { ctx.save(); ctx.rotate(-DUCK_ROT); ctx.translate(0, -DUCK_DY); rexCrouchLeg(10, body, dark); ctx.restore(); }
  else { rexLeg(6, ph, body, dark, o.air, true); ell(-2, -56, 7, 10, 0.25, 'rgba(255,255,255,.14)'); }
  if (o.fire) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fl = 0.55 + 0.35 * Math.sin(T * 17) + 0.1 * Math.sin(T * 41); const g = ctx.createRadialGradient(80, -88, 2, 80, -88, 34); g.addColorStop(0, `rgba(255,200,80,${fl})`); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.fillRect(46, -122, 68, 68); ell(76, -88, 20, 2.2 + jaw * 6, 0.02, `rgba(255,235,150,${fl})`); ctx.restore(); }
  if (o.rider) { if (o.duck) { ctx.save(); ctx.translate(-4, -84); ctx.rotate(0.9); drawOli(0, 0, ph, o.hat); ctx.restore(); } else drawOli(-4, -90, ph, o.hat); }
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawRaptor(x, y, s, ph, flip, o = {}) {
  const c0 = o.col || '#a0522d', dark = o.dark || '#5a2d12';
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  if (o.alpha != null) ctx.globalAlpha = Math.max(0, o.alpha);
  const col = vgrad(-75, -30, shade(c0, 1.35), c0, shade(c0, 0.65));
  ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-74 + i * 4, -62 + Math.sin(ph) * 3); ctx.lineTo(-90 + i * 3, -72 + i * 4 + Math.sin(ph) * 3); ctx.stroke(); }
  const leg = (p, c) => { const sw = Math.sin(p); ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-4, -36); ctx.lineTo(-2 + sw * 10, -18); ctx.lineTo(-6 + sw * 12, -2 - Math.max(0, Math.cos(p)) * 5); ctx.lineTo(5 + sw * 12, 0); ctx.stroke(); };
  leg(ph + Math.PI, dark);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-12, -50); ctx.quadraticCurveTo(-50, -56, -80, -64 + Math.sin(ph) * 3); ctx.quadraticCurveTo(-50, -44, -12, -36); ctx.closePath(); ctx.fill();
  ell(0, -44, 26, 13, -0.25, col);
  ell(4, -38, 18, 6, -0.25, 'rgba(255,230,190,.35)');
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(10, -54); ctx.quadraticCurveTo(22, -70, 30, -73); ctx.lineTo(54, -68); ctx.quadraticCurveTo(57, -62, 50, -60); ctx.lineTo(32, -60); ctx.quadraticCurveTo(24, -48, 16, -38); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f39c34'; ctx.beginPath(); ctx.moveTo(26, -72); ctx.lineTo(16, -82); ctx.lineTo(32, -74); ctx.fill(); ctx.beginPath(); ctx.moveTo(22, -70); ctx.lineTo(10, -76); ctx.lineTo(26, -71); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-18 + i * 9, -55); ctx.lineTo(-14 + i * 9, -46); ctx.stroke(); }
  circle(38, -67, 3.3, '#ffde59'); circle(39, -67, 1.6, '#111'); circle(39.6, -67.8, 0.7, '#fff');
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(32, -71); ctx.lineTo(44, -71); ctx.lineTo(42, -69); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(40, -61); ctx.lineTo(52, -62); ctx.stroke();
  ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(14, -44); ctx.lineTo(24, -36); ctx.stroke();
  ctx.fillStyle = '#f39c34'; ctx.beginPath(); ctx.moveTo(12, -46); ctx.lineTo(28, -38); ctx.lineTo(16, -33); ctx.fill();
  leg(ph, col);
  if (o.crown) { ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(26, -74); ctx.lineTo(27, -88); ctx.lineTo(32, -80); ctx.lineTo(37, -92); ctx.lineTo(41, -80); ctx.lineTo(46, -88); ctx.lineTo(46, -72); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawPtero(x, y, s, ph, flip, o = {}) {
  const dark = '#5d3470';
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  if (o.alpha != null) ctx.globalAlpha = Math.max(0, o.alpha);
  const col = vgrad(-10, 8, '#b98ad0', '#8e5aa8', '#5d3470');
  const tip = -48 * Math.cos(ph);
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(4 + tip * 0.2, tip * 0.9 - 4); ctx.lineTo(12, -2); ctx.fill();
  ell(0, 0, 24, 8, 0, col);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(14, -6); ctx.lineTo(50, 0); ctx.lineTo(16, 3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(18, -5); ctx.lineTo(-6, -18); ctx.lineTo(14, -9); ctx.fill();
  circle(21, -3, 2.5, '#ffde59');
  ctx.fillStyle = vgrad(Math.min(0, tip), Math.max(0, tip), '#c99be0', '#9a64b4'); ctx.beginPath(); ctx.moveTo(-16, 0); ctx.quadraticCurveTo(-14 + tip * 0.1, tip * 0.6, -2 + tip * 0.3, tip); ctx.lineTo(14, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(70,30,90,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-2 + tip * 0.3, tip); ctx.moveTo(-6, 0); ctx.lineTo(-4 + tip * 0.25, tip * 0.7); ctx.stroke();
  circle(21.6, -3.6, 0.9, '#111');
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawCompy(x, y, s, ph, flip, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s * (o.flat ? 0.35 : 1));
  const col = vgrad(-34, 0, '#d8e85a', '#9cbf2e', '#5f7f17'), dark = '#4a6312';
  const leg = (p, c) => { const sw = Math.sin(p); ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-2, -16); ctx.lineTo(-2 + sw * 7, -2 - Math.max(0, Math.cos(p)) * 4); ctx.lineTo(4 + sw * 7, 0); ctx.stroke(); };
  leg(ph + Math.PI, dark);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-6, -24); ctx.quadraticCurveTo(-26, -28, -40, -34 + Math.sin(ph) * 3); ctx.quadraticCurveTo(-24, -16, -6, -14); ctx.fill();
  ell(0, -20, 13, 9, -0.2, col);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(4, -26); ctx.quadraticCurveTo(10, -36, 16, -38); ctx.lineTo(28, -35); ctx.quadraticCurveTo(30, -29, 24, -28); ctx.lineTo(12, -26); ctx.quadraticCurveTo(10, -20, 8, -16); ctx.fill();
  circle(18, -38, 7, col);
  ctx.strokeStyle = '#e07b39'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 6, -28); ctx.lineTo(-8 + i * 6, -22); ctx.stroke(); }
  if (o.flat) { ctx.strokeStyle = '#222'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(17, -42); ctx.lineTo(23, -36); ctx.moveTo(23, -42); ctx.lineTo(17, -36); ctx.stroke(); }
  else { circle(20, -39, 4.2, '#fff'); circle(21.5, -39, 2.4, '#111'); circle(22.3, -40, 0.9, '#fff'); }
  ctx.strokeStyle = dark; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(24, -31, 3, 0.2, 1.4); ctx.stroke();
  ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(14, -15); ctx.stroke();
  leg(ph, '#7f9f22');
  ctx.restore();
  if (o.flat) for (let i = 0; i < 3; i++) { const a = T * 6 + i * 2.1; drawStar(x + Math.cos(a) * 18 * s, y - 22 * s + Math.sin(a) * 6 * s, 5 * s, '#ffd740'); }
}
function drawStar(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, rr2 = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } ctx.fill(); }
function drawPepper(x, y, s = 1, rot = 0.5) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = vgrad(-20, 20, '#ff6a4a', '#e0201a', '#9a0a08'); ctx.beginPath(); ctx.moveTo(-6, -16); ctx.quadraticCurveTo(12, -18, 11, 0); ctx.quadraticCurveTo(9, 14, -2, 24); ctx.quadraticCurveTo(-4, 14, -10, 2); ctx.quadraticCurveTo(-14, -12, -6, -16); ctx.fill();
  ell(-4, -6, 3, 8, 0.2, 'rgba(255,255,255,.45)');
  ctx.fillStyle = '#3f9b3a'; ctx.beginPath(); ctx.moveTo(-9, -15); ctx.quadraticCurveTo(0, -22, 10, -15); ctx.quadraticCurveTo(0, -12, -9, -15); ctx.fill();
  ctx.strokeStyle = '#2f7a2c'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -17); ctx.quadraticCurveTo(2, -26, 8, -28); ctx.stroke();
  ctx.restore();
}
function drawChili(x, y, s, ph, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const col = vgrad(-36, 0, '#e2a06a', '#c8814a', '#93582c'), light = '#f3dcc4';
  ell(-4, -26, 5, 15, -0.35 + Math.sin(ph) * 0.1, '#a8693a');
  ell(-16, -17, 7, 7, 0, '#fff');
  ell(0, -15, 18, 13, 0, col);
  ell(8, -3, 9, 4, 0, light);
  circle(15, -24, 11, col);
  ell(10, -42, 5, 15, -0.15 + Math.sin(ph * 1.3) * 0.08, col);
  ell(10, -42, 2.5, 11, -0.15 + Math.sin(ph * 1.3) * 0.08, '#f4a6b8');
  ell(4, -11, 9, 6, 0, light);
  circle(19, -26, 2.6, '#222'); circle(20, -27, 0.9, '#fff');
  ell(22, -19, 3.5, 2, 0, 'rgba(255,130,150,.45)'); ell(8, -30, 6, 3, -0.4, 'rgba(255,255,255,.18)');
  circle(26, -21, 2.2, '#f48fb1');
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(26, -20); ctx.lineTo(34, -22); ctx.moveTo(26, -20); ctx.lineTo(33, -17); ctx.stroke();
  ctx.restore();
}

function drawLongneck(x, y, s, c0, ph, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const col = vgrad(-160, 0, shade(c0, 1.3), c0, shade(c0, 0.68));
  const dark = 'rgba(0,0,0,.22)';
  for (const lx of [-38, -14, 14, 36]) { rr(lx - 7, -45, 15, 45, 6); ctx.fillStyle = col; ctx.fill(); rr(lx - 7, -45, 15, 45, 6); ctx.fillStyle = (lx === -14 || lx === 36) ? dark : 'rgba(0,0,0,0)'; ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-45, -60); ctx.quadraticCurveTo(-90, -50, -115, -28); ctx.quadraticCurveTo(-80, -40, -45, -40); ctx.fill();
  ell(0, -56, 55, 30, 0, col);
  ctx.strokeStyle = col; ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(35, -66); ctx.quadraticCurveTo(58, -110, 62 + Math.sin(ph) * 3, -140); ctx.stroke();
  ell(72 + Math.sin(ph) * 3, -146, 20, 12, 0.1, col);
  circle(76 + Math.sin(ph) * 3, -151, 3, '#222');
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(80 + Math.sin(ph) * 3, -144, 5, 0.3, 1.6); ctx.stroke();
  for (let i = 0; i < 4; i++) ell(-25 + i * 16, -70 + (i % 2) * 8, 6, 4, 0, dark);
  ell(4, -40, 40, 10, 0, 'rgba(255,255,255,.14)'); ell(-6, -74, 34, 7, 0, 'rgba(255,255,255,.16)');
  circle(77 + Math.sin(ph) * 3, -152, 1, '#fff'); ell(84 + Math.sin(ph) * 3, -142, 4, 2, 0, 'rgba(255,120,140,.4)');
  ctx.restore();
}

function drawTrike(x, y, s, c0, ph, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const col = vgrad(-50, 0, shade(c0, 1.3), c0, shade(c0, 0.68));
  for (const lx of [-18, 14]) { rr(lx - 6, -22, 12, 22, 5); ctx.fillStyle = col; ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-28, -30); ctx.quadraticCurveTo(-50, -24, -56, -12); ctx.quadraticCurveTo(-40, -18, -26, -18); ctx.fill();
  ell(0, -30, 32, 19, 0, col);
  ctx.fillStyle = '#ffc86b'; ctx.beginPath(); ctx.arc(26, -40, 20, Math.PI * 0.75, Math.PI * 1.95); ctx.fill();
  for (let i = 0; i < 6; i++) { const a = Math.PI * (0.8 + i * 0.22); circle(26 + Math.cos(a) * 17, -40 + Math.sin(a) * 17, 2.4, '#e8963a'); }
  ell(38, -32, 15, 11, 0, col);
  ctx.strokeStyle = '#fff4dc'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(38, -40); ctx.lineTo(54, -52); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(46, -34); ctx.lineTo(56, -38); ctx.stroke();
  circle(42, -35, 2.4, '#222'); circle(42.7, -35.8, 0.8, '#fff');
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(46, -28, 4, 0.2, 1.5); ctx.stroke();
  ctx.restore();
}

function drawBaby(x, y, s, ph, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const col = vgrad(-52, 0, '#a8e8a8', '#7fd08a', '#4ea35b'), dark = '#4ea35b';
  ctx.strokeStyle = dark; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(-4 + Math.sin(ph) * 5, 0); ctx.moveTo(6, -12); ctx.lineTo(6 - Math.sin(ph) * 5, 0); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-10, -22); ctx.quadraticCurveTo(-28, -20, -34, -10); ctx.quadraticCurveTo(-22, -12, -8, -12); ctx.fill();
  ell(0, -20, 16, 13, 0, col);
  ell(14, -38, 15, 13, 0, col);
  circle(19, -41, 4, '#fff'); circle(20, -41, 2.2, '#222'); circle(20.8, -42, 0.8, '#fff'); ell(24, -33, 3, 2, 0, 'rgba(255,120,140,.45)');
  ctx.strokeStyle = '#2d6b36'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(20, -34, 5, 0.2, 1.4); ctx.stroke();
  // santa hat
  ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(2, -48); ctx.quadraticCurveTo(10, -72, -8, -70); ctx.lineTo(26, -48); ctx.closePath(); ctx.fill();
  rr(0, -52, 28, 7, 3.5); ctx.fillStyle = '#fff'; ctx.fill();
  circle(-8, -70, 5, '#fff');
  ctx.restore();
}

function drawGuitar(x, y, s, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rr(-4, -64, 8, 52, 3); ctx.fillStyle = '#6b4a2b'; ctx.fill();
  rr(-7, -78, 14, 16, 4); ctx.fillStyle = '#3b2410'; ctx.fill();
  for (let i = 0; i < 3; i++) { circle(-9, -74 + i * 5, 1.8, '#ddd'); circle(9, -74 + i * 5, 1.8, '#ddd'); }
  circle(0, 20, 24, '#d9822b'); circle(0, -6, 17, '#d9822b'); ell(0, 8, 14, 22, 0, '#d9822b');
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#8a4b14'; ctx.beginPath(); ctx.arc(0, 20, 24, 0.2, Math.PI - 0.2); ctx.stroke();
  circle(0, 6, 7, '#3b2410'); rr(-9, 26, 18, 4, 2); ctx.fillStyle = '#3b2410'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.8; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 2, -64); ctx.lineTo(i * 2, 28); ctx.stroke(); }
  ctx.restore();
}
function drawBike(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const wx of [-30, 30]) { ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(wx, -19, 18, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#999'; ctx.lineWidth = 1; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4 + T; ctx.beginPath(); ctx.moveTo(wx + Math.cos(a) * 16, -19 + Math.sin(a) * 16); ctx.lineTo(wx - Math.cos(a) * 16, -19 - Math.sin(a) * 16); ctx.stroke(); } }
  ctx.strokeStyle = '#d63a3a'; ctx.lineWidth = 4.5; ctx.beginPath();
  ctx.moveTo(-30, -19); ctx.lineTo(-8, -46); ctx.lineTo(0, -19); ctx.lineTo(-30, -19); ctx.moveTo(-8, -46); ctx.lineTo(20, -46); ctx.lineTo(0, -19); ctx.moveTo(20, -46); ctx.lineTo(30, -19); ctx.stroke();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(20, -46); ctx.lineTo(17, -56); ctx.lineTo(27, -58); ctx.stroke();
  rr(-18, -52, 18, 6, 3); ctx.fillStyle = '#222'; ctx.fill();
  circle(26, -60, 3, '#ffd740');
  ctx.restore();
}
function drawRod(x, y, s, ph = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round';
  ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-30, 18); ctx.lineTo(-6, -12); ctx.stroke();
  ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(28, -56); ctx.stroke();
  circle(-16, 4, 6, '#9aa4ad'); circle(-16, 4, 2.5, '#555');
  const fx = 36 + Math.sin(ph) * 3, fy = 2;
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(28, -56); ctx.lineTo(fx, fy - 8); ctx.stroke();
  ell(fx, fy, 10, 5.5, Math.sin(ph) * 0.3, '#ff8f3a'); ctx.fillStyle = '#ff8f3a'; ctx.beginPath(); ctx.moveTo(fx - 8, fy); ctx.lineTo(fx - 15, fy - 6); ctx.lineTo(fx - 15, fy + 6); ctx.fill(); circle(fx + 5, fy - 1, 1.3, '#222');
  ctx.restore();
}
function drawKiwi(x, y, s, ph = 0, flip = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.lineCap = 'round';
  ctx.strokeStyle = '#c9a56b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(-4 + Math.sin(ph) * 4, 0); ctx.moveTo(4, -5); ctx.lineTo(4 - Math.sin(ph) * 4, 0); ctx.stroke();
  ell(0, -16, 18, 13, 0, vgrad(-29, -3, '#a98658', '#8b6a43', '#5e4528'));
  ctx.strokeStyle = 'rgba(60,40,20,.5)'; ctx.lineWidth = 1.2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-12 + i * 5, -24); ctx.lineTo(-14 + i * 5, -14); ctx.stroke(); }
  circle(14, -22, 7.5, '#8b6a43');
  ctx.strokeStyle = '#e8cf9a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(20, -21); ctx.quadraticCurveTo(32, -16, 40, -6); ctx.stroke();
  circle(16, -24, 1.6, '#111');
  ctx.restore();
}
function drawTreasure(k, x, y, s, ph = T * 4) {
  if (k === 0) drawGuitar(x, y + 4 * s, s * 0.85, -0.35);
  else if (k === 1) drawBike(x, y + 30 * s, s);
  else if (k === 2) drawRod(x, y + 10 * s, s, ph);
  else drawKiwi(x - 8 * s, y + 18 * s, s * 1.4, ph);
}
function drawMedal(x, y, r, kind, on) {
  ctx.save(); if (!on) ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(x - r * 0.9, y - r * 1.9); ctx.lineTo(x - r * 0.2, y - r * 1.9); ctx.lineTo(x + r * 0.3, y - r * 0.6); ctx.lineTo(x - r * 0.4, y - r * 0.6); ctx.fill();
  ctx.fillStyle = '#2e6fd6'; ctx.beginPath(); ctx.moveTo(x + r * 0.9, y - r * 1.9); ctx.lineTo(x + r * 0.2, y - r * 1.9); ctx.lineTo(x - r * 0.3, y - r * 0.6); ctx.lineTo(x + r * 0.4, y - r * 0.6); ctx.fill();
  circle(x, y, r, on ? '#e8a317' : '#999'); circle(x, y, r * 0.82, on ? '#ffd34d' : '#ccc');
  if (kind === 0) drawEgg(x, y, r * 0.5, '#fff7e0', '#6aa84f');
  else if (kind === 1) drawHeart(x, y + r * 0.05, r / 22, true);
  else drawAmber(x, y, r * 0.45);
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
  rr(-22, -105, 44, 60, 14); ctx.fillStyle = hgrad(-22, 22, '#93a85e', '#7a8f4a', '#56672f'); ctx.fill();
  rr(5, -92, 12, 12, 2); ctx.fillStyle = '#6a7d3c'; ctx.fill(); ctx.fillStyle = '#4a3020'; ctx.fillRect(-22, -52, 44, 6);
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
  const bg = { kiwi: '#e8f5d0', goetti: '#cfe3b0', chili: '#ffe0c2', rex: '#bfe6cf', mami: '#ead7f5', papi: '#d3e6fb', fabio: '#ffe6c4' }[who] || '#eee';
  ctx.fillStyle = bg; ctx.fill(); ctx.clip();
  if (who === 'goetti') { drawGoettiHead(cx, cy + r * 0.25, r * 0.55); }
  else if (who === 'chili') { const s = r / 26; drawChili(cx - 10 * s, cy + 30 * s, s, T * 3); }
  else if (who === 'rex') { const s = r / 42; drawRex(cx - 68 * s, cy + 104 * s, s, 0, 0.3 + 0.2 * Math.sin(T * 8)); }
  else if (who === 'mami' || who === 'papi') { const s = r / 34; drawLongneck(cx - 72 * s, cy + 146 * s, s, who === 'mami' ? '#b07cc6' : '#4f8fd6', T * 2); }
  else if (who === 'kiwi') { const s = r / 22; drawKiwi(cx - 16 * s, cy + 22 * s, s, T * 6); }
  else if (who === 'fabio') { const s = r / 26; drawTrike(cx - 36 * s, cy + 36 * s, s, '#f39c34', 0); }
  ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = '#6b4a2b'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}

// =====================================================================
// Scenery (layered, cached parallax + live details)
// =====================================================================
const GFX = [
  { sky: ['#0c3440', '#3e8f86', '#d8efc0'], far1: '#7fb3a0', far2: '#5c977f', mid: '#2f6b4a', midHi: '#4f9a5a', near: '#173d2c', haze: '210,245,215', sun: [800, 105], sunCol: '255,250,215', cloud: ['#ffffff', '#cfe6dc'], g: ['#5a3a22', '#2a1a10'], stone: '#8a6a4a' },
  { sky: ['#3d6fb3', '#f0a868', '#ffe0a8'], far1: '#e0a27a', far2: '#cc8358', mid: '#a5532f', midHi: '#d27a45', near: '#6e2f17', haze: '255,220,175', sun: [200, 125], sunCol: '255,245,205', cloud: ['#fff4e4', '#f2c6a0'], g: ['#c0703f', '#6e3418'], stone: '#e0a070' },
  { sky: ['#06142c', '#1f4677', '#86aed6'], far1: '#b4cbe4', far2: '#8eaacc', mid: '#5a7aa2', midHi: '#e8f1fb', near: '#14313f', haze: '205,228,255', sun: null, cloud: ['#dce9fb', '#9fb6d6'], g: ['#5f7591', '#2c3b52'], stone: '#8fa3bb' },
  { sky: ['#0d0202', '#4a1206', '#c2410f'], far1: '#4a1810', far2: '#33100b', mid: '#200706', midHi: '#3a120c', near: '#120303', haze: '255,110,40', sun: null, cloud: ['#5a3632', '#2a1614'], g: ['#2e1c18', '#100806'], stone: '#4a3a36' },
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
    layerCache = { wi, rs, far: layerCanvas(60, 445, rs, () => paintFar(wi)), mid: layerCanvas(170, 445, rs, () => paintMid(wi)) };
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
function cloudSprite(wi, v) {
  const key = wi + ':' + v; if (cloudSprites[key]) return cloudSprites[key];
  const gx = GFX[wi], rs = 1.5, w = 220, h = 90, c = document.createElement('canvas'); c.width = w * rs; c.height = h * rs;
  const old = ctx; ctx = c.getContext('2d'); ctx.scale(rs, rs);
  const R = rng(17 + v * 5 + wi * 31), puffs = [];
  for (let i = 0; i < 8; i++) puffs.push([30 + R() * 160, 50 + (R() - 0.5) * 16, 16 + R() * 20]);
  for (const [x, y, r] of puffs) circle(x, y + 8, r, gx.cloud[1]);
  for (const [x, y, r] of puffs) { const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.5, 2, x, y, r); g.addColorStop(0, gx.cloud[0]); g.addColorStop(1, gx.cloud[1]); circle(x, y, r * 0.92, g); }
  ctx = old; return (cloudSprites[key] = c);
}
function drawClouds(wi, cam) {
  ctx.globalAlpha = wi === 3 ? 0.7 : wi === 2 ? 0.45 : 0.85;
  for (let i = 0; i < 5; i++) {
    const span = W + 320, x = mod(hash(i + wi * 9) * span - T * (6 + i * 2) - cam * 0.03 * (1 + i * 0.2), span) - 240, y = 40 + hash(i + 20) * 120, s = 0.6 + hash(i + 40) * 0.6;
    ctx.drawImage(cloudSprite(wi, i % 3), x, y, 220 * s, 90 * s);
  }
  ctx.globalAlpha = 1;
}
function drawSun(gx) {
  if (!gx.sun) return;
  const [sx, sy] = gx.sun, c = gx.sunCol;
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
  ell(cx, top + 2 * s, wid * 0.16, 6 * s, 0, erupt > 0 ? '#ffb347' : 'rgba(255,140,60,.6)');
  if (erupt > 0) {
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      for (const [lw, c] of [[7 * s, 'rgba(200,40,0,.8)'], [3 * s, '#ffb030']]) {
        ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); let px = cx - wid * 0.1 + i * wid * 0.1, py = top; ctx.moveTo(px, py);
        for (let k = 0; k < 6; k++) { px += (i - 1) * wid * 0.08 + Math.sin(k + i) * 6 * s; py += hgt * 0.1; ctx.lineTo(px, py); } ctx.stroke();
      }
    }
  }
  for (let i = 0; i < 9; i++) {
    const k = ((T * 22 + i * 27) % 240), r = (14 + k * 0.24) * s, a = 0.45 * (1 - k / 240);
    const x = cx + Math.sin(T * 0.7 + i) * 14 * s + k * 0.3 * s, y = top - k * s;
    circle(x, y, r, erupt > 0.5 ? `rgba(50,32,32,${a})` : `rgba(120,120,130,${a})`);
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
function cactus(x, b, h, col) {
  const sh = col[0] === '#' && col.length === 7;
  const fill = (x0, w) => sh ? hgrad(x0, x0 + w, shade(col, 1.35), col, shade(col, 0.7)) : col;
  rr(x - 28, b - h * 0.75, 12, h * 0.35, 6); ctx.fillStyle = fill(x - 28, 12); ctx.fill(); rr(x - 28, b - h * 0.45, 28, 11, 5); ctx.fill();
  rr(x + 16, b - h * 0.6, 12, h * 0.3, 6); ctx.fillStyle = fill(x + 16, 12); ctx.fill(); rr(x, b - h * 0.34, 28, 11, 5); ctx.fill();
  rr(x - 9, b - h, 18, h, 9); ctx.fillStyle = fill(x - 9, 18); ctx.fill();
  if (sh) {
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 3, b - h + 6); ctx.lineTo(x - 3, b); ctx.moveTo(x + 3, b - h + 6); ctx.lineTo(x + 3, b); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,230,.7)'; for (let k = 0; k < 6; k++) ctx.fillRect(x - 8 + (k % 2) * 15, b - h + 10 + k * h * 0.14, 2, 2);
    if (hash(x) > 0.5) { circle(x, b - h - 1, 5, '#ff6f91'); circle(x, b - h - 1, 2, '#ffd166'); }
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
    if (wi === 0) { if (hv < 0.55) palm(x, b, 110 + hv * 90, th.deco); else { bush(x, b, 1, shade(th.deco, 1.2), shade(th.deco, 1.5)); if (hv > 0.85) { circle(x - 12, b - 30, 4, '#ff5a8a'); circle(x + 10, b - 36, 4, '#ffd166'); } } }
    else if (wi === 1) { if (hv < 0.5) cactus(x, b, 60 + hv * 60, '#5f7a2a'); else if (hv < 0.8) { const h = 90 + hv * 60; ctx.fillStyle = hgrad(x - 20, x + 20, gx.midHi, th.deco, shade(th.deco, 0.7)); rr(x - 18, b - h, 36, h + 10, 8); ctx.fill(); ell(x, b - h, 22, 7, 0, shade(th.deco, 0.8)); ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 2; for (let y = b - h + 14; y < b; y += 16) { ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y); ctx.stroke(); } } else { ell(x, b - 8, 34, 16, 0, shade(th.deco, 1.2)); fossil(x, b - 4); } }
    else if (wi === 2) { if (hv > 0.88) snowman(x, b); else pine(x, b, 120 + hv * 80, th.deco, hv < 0.35); }
    else { if (hv < 0.55) deadTree(x, b, 80 + hv * 70, '#1a0808'); else vent(x, b, k); }
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
  drawVolcano(740, 345, th.volcS, th.volcCol, wi === 3 ? 1 : 0);
  const Ls = getLayers(wi);
  drawLayer(Ls.far, cam * 0.1);
  if (wi <= 1) godRays(gx);
  drawLayer(Ls.mid, cam * 0.25);
  ctx.fillStyle = vgrad(330, 440, `rgba(${gx.haze},0)`, `rgba(${gx.haze},${wi === 3 ? 0.12 : 0.22})`); ctx.fillRect(0, 330, W, 110);
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
    else { ell(x, y, r * 1.3, r, 0, shade(gx.stone, 0.75)); ell(x - r * 0.3, y - r * 0.35, r * 0.7, r * 0.45, 0, shade(gx.stone, 1.15)); }
    if (wi === 1 && h1 > 0.8) fossilBone(x + 12, y + 8);
  }
  // top surface
  if (wi === 0) {
    ctx.fillStyle = vgrad(GROUND - 4, GROUND + 14, '#5cc94a', '#2f7a2c'); ctx.fillRect(0, GROUND - 4, W, 16);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0, GROUND + 12, W, 4);
    for (let k = Math.floor(cam / 13) - 1; k < (cam + W) / 13 + 1; k++) {
      const x = k * 13 - cam + hash(k + 3) * 6, hh = 8 + hash(k) * 12, c = hash(k + 9) < 0.5 ? '#3f9b3a' : '#6ad155';
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.quadraticCurveTo(x + 2, GROUND - hh * 0.6, x + 4 + hash(k + 1) * 4, GROUND - hh); ctx.lineTo(x + 6, GROUND); ctx.fill();
      if (hash(k + 17) < 0.06) { circle(x + 4, GROUND - hh - 2, 3.5, ['#ff5a8a', '#ffd166', '#fff'][k & 1 ? 0 : (k & 2 ? 1 : 2)]); circle(x + 4, GROUND - hh - 2, 1.4, '#ffeb6b'); }
    }
  } else if (wi === 1) {
    ctx.fillStyle = vgrad(GROUND - 4, GROUND + 12, '#f2c088', '#cf8650'); ctx.fillRect(0, GROUND - 4, W, 14);
    ctx.strokeStyle = 'rgba(160,80,30,.3)'; ctx.lineWidth = 1.5;
    for (let k = Math.floor(cam / 70) - 1; k < (cam + W) / 70 + 1; k++) { const x = k * 70 - cam; ctx.beginPath(); ctx.arc(x + 30, GROUND + 14, 22, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    for (let k = Math.floor(cam / 37) - 1; k < (cam + W) / 37 + 1; k++) { const x = k * 37 - cam + hash(k) * 20; ell(x, GROUND - 2, 3 + hash(k + 2) * 3, 2.5, 0, '#a5623a'); }
  } else if (wi === 2) {
    ctx.fillStyle = vgrad(GROUND - 6, GROUND + 16, '#ffffff', '#cfe0f5'); ctx.fillRect(0, GROUND - 6, W, 22);
    for (let k = Math.floor(cam / 60) - 1; k < (cam + W) / 60 + 1; k++) { const x = k * 60 - cam; ell(x, GROUND - 4, 34, 8, 0, '#fff'); ell(x + 6, GROUND + 14, 30, 6, 0, 'rgba(120,150,200,.25)'); }
    for (let k = Math.floor(cam / 29) - 1; k < (cam + W) / 29 + 1; k++) { const tw = Math.sin(T * 3 + k * 1.7); if (tw > 0.75) { const x = k * 29 - cam + hash(k) * 20, y = GROUND - 2 + hash(k + 4) * 12, s = (tw - 0.75) * 16; ctx.fillStyle = '#fff'; ctx.fillRect(x - s / 2, y - 0.6, s, 1.2); ctx.fillRect(x - 0.6, y - s / 2, 1.2, s); } }
  } else {
    ctx.fillStyle = vgrad(GROUND - 4, GROUND + 12, '#4a2c24', '#2a1814'); ctx.fillRect(0, GROUND - 4, W, 14);
    ctx.strokeStyle = `rgba(255,110,30,${0.55 + 0.25 * Math.sin(T * 2.5)})`; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 16) { const wx = x + cam; ctx.lineTo(x, GROUND + 9 + Math.sin(wx * 0.09) * 2); } ctx.stroke();
    for (let k = Math.floor(cam / 50) - 1; k < (cam + W) / 50 + 1; k++) { const x = k * 50 - cam + hash(k) * 20; ctx.fillStyle = '#1a0e0b'; ctx.beginPath(); ctx.moveTo(x - 8, GROUND); ctx.lineTo(x - 2, GROUND - 6 - hash(k + 1) * 6); ctx.lineTo(x + 6, GROUND); ctx.fill(); }
  }
  // pits
  for (const p of L.pits) {
    const sx = p.x - cam; if (sx > W + 20 || sx + p.w < -20) continue;
    const pg = ctx.createLinearGradient(0, GROUND, 0, H); pg.addColorStop(0, th.lava ? '#200a06' : '#120a05'); pg.addColorStop(1, '#000');
    ctx.fillStyle = pg; ctx.fillRect(sx, GROUND - 6, p.w, H - GROUND + 6);
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
      ctx.fillStyle = wi === 0 ? '#4fb53f' : wi === 1 ? '#e0a46a' : wi === 2 ? '#ffffff' : '#4a2c24';
      rr(ex - (dir > 0 ? 10 : 2), GROUND - 7, 12, 16, 6); ctx.fill();
    }
  }
}
function fossilBone(x, y) { ctx.strokeStyle = 'rgba(255,240,215,.45)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y - 3); ctx.stroke(); circle(x - 8, y - 2, 2.5, 'rgba(255,240,215,.45)'); circle(x - 8, y + 2, 2.5, 'rgba(255,240,215,.45)'); circle(x + 8, y - 5, 2.5, 'rgba(255,240,215,.45)'); circle(x + 8, y - 1, 2.5, 'rgba(255,240,215,.45)'); }

function drawPlatform(pl, cam, wi) {
  const x = pl.x - cam, y = pl.y, w = pl.w;
  if (x > W + 20 || x + w < -20) return;
  ell(x + w / 2, GROUND + 2, w * 0.4, 6, 0, 'rgba(0,0,0,.18)');
  if (wi === 0) { // mossy log with vines
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
    if (wi === 0) { for (let i = 0; i < 6; i++) leaf(x, b, 70 + hv * 30, -1.57 + (i - 2.5) * 0.38, 0.35, 12, '#0d2a1d', '#174a30'); }
    else if (wi === 1) { ell(x, b - 6, 70, 34, 0, '#4a1e0e'); ell(x - 20, b - 24, 30, 14, -0.2, 'rgba(255,200,150,.15)'); }
    else if (wi === 2) { ell(x, b, 90, 40, 0, '#e6f0fb'); ell(x - 20, b - 22, 50, 14, 0, '#ffffff'); }
    else { ctx.fillStyle = '#0a0302'; ctx.beginPath(); ctx.moveTo(x - 70, b); ctx.lineTo(x - 30, b - 50 - hv * 20); ctx.lineTo(x + 10, b - 36); ctx.lineTo(x + 60, b); ctx.fill(); ctx.strokeStyle = `rgba(255,90,20,${0.4 + 0.3 * Math.sin(T * 2 + k)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 30, b - 40); ctx.lineTo(x - 10, b - 10); ctx.stroke(); }
  }
}
const motes = []; for (let i = 0; i < 26; i++) motes.push({ x: Math.random() * W, y: Math.random() * H, v: 20 + Math.random() * 30, ph: Math.random() * 6, r: Math.random() });
function drawAmbient(wi) {
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
let vignetteG = null;
function vignette(wi) {
  if (!vignetteG) { vignetteG = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.45, W / 2, H * 0.55, H * 1.05); vignetteG.addColorStop(0, 'rgba(0,0,0,0)'); vignetteG.addColorStop(1, 'rgba(0,0,0,.42)'); }
  ctx.fillStyle = vignetteG; ctx.fillRect(0, 0, W, H);
  if (wi === 3) { const g = ctx.createLinearGradient(0, H - 120, 0, H); g.addColorStop(0, 'rgba(255,80,0,0)'); g.addColorStop(1, `rgba(255,80,0,${0.12 + 0.05 * Math.sin(T * 2)})`); ctx.fillStyle = g; ctx.fillRect(0, H - 120, W, 120); }
}

// ---------- cartoon outlines via offscreen silhouette ----------
let LOWFX = false; const perf = { avg: 1 / 60, bad: 0 };
function perfWatch() {
  if (LOWFX || DT <= 0 || DT > 0.25) return;
  perf.avg += (DT - perf.avg) * 0.05;
  perf.bad = perf.avg > 1 / 36 ? perf.bad + DT : 0;
  if (perf.bad > 4) { LOWFX = true; }
}
const outlinePool = {};
function outlined(key, x, y, bx, by, bw, bh, fn, alpha = 1, lw = 2.6) {
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
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.drawImage(P.b, 0, 0, cw, ch, X + Math.cos(a) * lw, Y + Math.sin(a) * lw, cw / k, ch / k); }
  ctx.drawImage(P.a, 0, 0, cw, ch, X, Y, cw / k, ch / k);
  ctx.restore();
}
// bounding boxes are in unscaled character units; flip mirrors x
function obox(s, flip, x0, x1, y0, y1) { return flip ? [-x1 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s] : [x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s]; }
function oRex(x, y, s, ph, jaw, o = {}) { const [bx, by, bw, bh] = obox(s, o.flip, -130, 110, o.rider ? (o.hat ? -170 : -160) : -132, 14); const a = o.alpha == null ? 1 : o.alpha; outlined('rex', x, y, bx, by, bw, bh, () => drawRex(x, y, s, ph, jaw, Object.assign({}, o, { alpha: null })), a); }
function oRaptor(x, y, s, ph, flip, o = {}) { const [bx, by, bw, bh] = obox(s, flip, -86, 60, o.crown ? -98 : -88, 4); const a = o.alpha == null ? 1 : Math.max(0, o.alpha); outlined(o.crown ? 'boss' : 'raptor', x, y, bx, by, bw, bh, () => drawRaptor(x, y, s, ph, flip, Object.assign({}, o, { alpha: null })), a); }
function oPtero(x, y, s, ph, flip, o = {}) { const [bx, by, bw, bh] = obox(s, flip, -22, 54, -58, 52); const a = o.alpha == null ? 1 : Math.max(0, o.alpha); outlined('ptero', x, y, bx, by, bw, bh, () => drawPtero(x, y, s, ph, flip, {}), a); }
function oCompy(x, y, s, ph, flip, o = {}) { const [bx, by, bw, bh] = obox(s, flip, -44, 36, -52, 4); const a = o.alpha == null ? 1 : Math.max(0, o.alpha); outlined('compy', x, y, bx, by, bw, bh, () => drawCompy(x, y, s, ph, flip, { flat: o.flat }), a); }
function oChili(x, y, s, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -26, 38, -62, 4); outlined('chili', x, y, bx, by, bw, bh, () => drawChili(x, y, s, ph, flip)); }
function oBaby(x, y, s, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -38, 32, -78, 4); outlined('baby', x, y, bx, by, bw, bh, () => drawBaby(x, y, s, ph, flip)); }
function oKiwi(x, y, s, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -22, 44, -34, 4); outlined('kiwi', x, y, bx, by, bw, bh, () => drawKiwi(x, y, s, ph, flip)); }
function oLong(x, y, s, col, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -120, 100, -165, 4); outlined('long', x, y, bx, by, bw, bh, () => drawLongneck(x, y, s, col, ph, flip)); }
function oTrike(x, y, s, col, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -60, 62, -64, 4); outlined('trike', x, y, bx, by, bw, bh, () => drawTrike(x, y, s, col, ph, flip)); }
function oGoetti(x, y, s, wave) { const [bx, by, bw, bh] = obox(s, false, -36, 64, -166, 4); outlined('goetti', x, y, bx, by, bw, bh, () => drawGoetti(x, y, s, wave)); }

// =====================================================================
// Level generation
// =====================================================================
function buildLevel(wi) {
  const th = WORLDS[wi], R = rng(777 + wi * 1013);
  const L = { wi, speed: th.speed, pits: [], obs: [], amb: [], plats: [], eggs: [], spots: [], tips: [], cps: [], coach: [], seen: {}, peppers: [] };
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
    low: x => { firstTip('low', x - 700, wi === 0 ? null : 'Da hängt etwas tief! DUCKEN gedrückt halten!'); L.obs.push({ type: 'low', x: x + 70, w: 150 }); amberRow(x - 10, 4, GROUND - 30, 45); return 180; },
    compy: x => { firstTip('compy', x - 700, wi === 0 ? null : 'Kompsis! Die haben keine Angst vorm Brüllen – spring drauf!'); for (let i = 0; i < 3; i++) L.obs.push({ type: 'compy', x: x + 80 + i * 75, spd: 150 + wi * 15, ph: i, alpha: 1 }); return 320; },
    geode: x => { firstTip('geode', x - 650, 'Ein Bernstein-Stein! Spring hoch und drück STAMPF!'); L.obs.push({ type: 'geode', x: x + 60 }); return 140; },
    swoop: x => { firstTip('swoop', x - 700, 'Ein Flugsaurier fliegt ganz tief! Ducken – oder brüllen!'); const by = GROUND - 88; L.obs.push({ type: 'ptero', x: x + 80, y: by, baseY: by, spd: 200, ph: R() * 6, alpha: 1, low: true }); return 160; },
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
    L.tips.push({ x: 4700, text: 'Ein tiefer Ast! Halte DUCKEN gedrückt!' });
    L.obs.push({ type: 'low', x: 5400, w: 150 }); amberRow(5320, 4, GROUND - 30, 45);
    L.tips.push({ x: 5800, text: 'Springen und dann DUCKEN drücken = STAMPFER! Damit knackst du Bernstein-Steine.' });
    L.obs.push({ type: 'geode', x: 6540 });
    L.tips.push({ x: 6900, text: 'Kompsis! Spring ihnen auf den Kopf!' });
    for (let i = 0; i < 3; i++) L.obs.push({ type: 'compy', x: 7700 + i * 75, spd: 150, ph: i, alpha: 1 });
    L.peppers.push({ x: 8500, y: GROUND - 60, got: false });
    if (!save.movesDone) L.coach.push(
      { x: 5160, type: 'duck', text: 'DUCKEN gedrückt halten!' },
      { x: 6280, type: 'jump', text: 'Spring hoch!' },
      { x: 6400, type: 'stomp', text: 'Jetzt STAMPF drücken!' });
    x = 8900;
  } else L.tips.push({ x: 150, text: th.startTip });
  const n = th.segs, eggAt = [Math.floor(n * 0.25), Math.floor(n * 0.55), Math.floor(n * 0.85)], cpAt = [Math.floor(n * 0.4), Math.floor(n * 0.7)], tAt = Math.floor(n * 0.45);
  for (let i = 0; i < n; i++) {
    if (cpAt.includes(i)) { L.cps.push({ x, on: false }); x += 160; }
    if (i === Math.floor(n * 0.33) || i === Math.floor(n * 0.78)) { L.peppers.push({ x: x - 120, y: GROUND - 60, got: false }); }
    let w;
    if (i === eggAt[0]) {
      if (wi === 0) L.tips.push({ x: x - 700, text: 'Da oben glänzt ein Ei! Spring auf die Plattformen!' });
      L.plats.push({ x, y: GROUND - 120, w: 200 }); L.plats.push({ x: x + 240, y: GROUND - 235, w: 200 });
      amberRow(x + 30, 3, GROUND - 160);
      L.eggs.push({ k: 0, x: x + 360, y: GROUND - 282 }); w = 460;
    } else if (i === eggAt[1]) {
      L.spots.push({ x: x + 40, k: 1, state: 'idle' });
      L.eggs.push({ k: 1, x: x + 340, y: GROUND - 150, hidden: true }); w = 440;
    } else if (i === tAt) {
      L.tips.push({ x: x - 750, text: wi === 3 ? 'Da oben piepst etwas! Doppelsprung – zweimal schnell tippen!' : 'Da oben liegt etwas von Goetti! Doppelsprung – zweimal schnell tippen!' });
      L.plats.push({ x, y: GROUND - 250, w: 220 }); L.treasure = { k: wi, x: x + 110, y: GROUND - 300, got: false }; w = 220;
    } else if (i === eggAt[2]) {
      L.pits.push({ x, w: 150 }); L.eggs.push({ k: 2, x: x + 75, y: GROUND - 195 }); w = 150;
    } else {
      w = P[th.patterns[Math.floor(R() * th.patterns.length)]](x);
    }
    x += w + 260 + R() * 200;
  }
  L.eggs.sort((a, b) => a.k - b.k);
  L.ambTotal = L.amb.length;
  x += 300;
  if (wi === 3) { L.bossX = x + 200; L.gateX = L.bossX + 1300; } else L.gateX = x + 500;
  return L;
}

// =====================================================================
// Play state
// =====================================================================
let scene = 'title', G = null;
function go(s) {
  scene = s; parts = []; dialog = null; toasts = [];
  if (s === 'map' && save.treasureNew >= 0) { const k = save.treasureNew; save.treasureNew = -1; writeSave(); chestPop[k] = 1; startDialog([{ who: k === 3 ? 'kiwi' : 'goetti', text: k === 3 ? 'Kiwi! Kiwi! (Kiwi hüpft vor Freude.)' : TREASURES[k].line }].concat(k === 3 ? [{ who: 'goetti', text: TREASURES[3].line }] : [])); }
}

function startLevel(wi) {
  go('play');
  const L = buildLevel(wi);
  G = { L, wi, cam: 0, t: 0, startT: 1.6, stopped: false, overlay: null, shake: 0, tip: null, eggsGot: [false, false, false], amber: 0,
    p: { wx: 200, y: GROUND, vy: 0, onGround: true, jumps: 0, coyote: 0, inv: 0, roarT: 0, roarCd: 0, hearts: 3, ph: 0, duck: false, stomp: false, spin: 1, fireT: 0, fireCd: 0, breathT: 0 },
    duckHeld: null, fireballs: [], flames: [],
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
function duckDown(id) {
  if (!G || scene !== 'play' || G.overlay) return;
  const p = G.p; G.duckHeld = id;
  if (G.coach) { if (G.coach.type !== 'duck' && G.coach.type !== 'stomp') return; G.coach = null; }
  if (G.startT > 0.3) return;
  if (!p.onGround && !p.stomp) { p.stomp = true; p.spin = 0; p.vy = Math.min(p.vy, -380); tone(300, 0.3, 'triangle', 0.08, 900); }
  else if (p.onGround) SFX.duck();
}
function duckUp(id) { if (G && (id == null || G.duckHeld === id)) G.duckHeld = null; }
function stompLand() {
  const p = G.p, th = WORLDS[G.wi];
  SFX.stomp(); G.shake = Math.max(G.shake, 0.45);
  burst(p.wx, p.y, 26, ['#d8c3a5', '#b39b7a', '#fff'], 380, 900, 7, 0.6);
  G.rings.push({ x: p.wx + 10, y: p.y - 10, r: 20, a: 1, c: '255,240,200' });
  for (const o of G.L.obs) {
    if (o.dead || o.scared || o.flat) continue;
    const d = o.x - p.wx; if (d < -110 || d > 190) continue;
    if (o.type === 'geode') breakGeode(o);
    else if (o.type === 'compy') squashCompy(o, false);
    else if (o.type === 'rock') { o.dead = true; SFX.smash(); burst(o.x, GROUND - 20, 18, [th.rock, '#5a4a3a', '#a89888'], 380, 1300, 9, 0.8); for (let i = 0; i < 2; i++) G.L.amb.push({ x: o.x + 40 + i * 40, y: GROUND - 60 - i * 20, got: false }); }
    else if (o.type === 'raptor') { o.scared = true; o.vx = 380; o.vy = -320; }
  }
}
function breakGeode(o) {
  o.dead = true; SFX.smash(); setTimeout(SFX.amber, 120);
  burst(o.x, GROUND - 20, 26, ['#8a8a92', '#ffd166', '#ff9f1c', '#fff'], 420, 1100, 8, 0.9);
  for (let i = 0; i < 6; i++) G.L.amb.push({ x: o.x + 30 + i * 34, y: GROUND - 70 - Math.sin(i / 5 * Math.PI) * 70, got: false });
  toast('Bernstein-Schatz!', '#ffd166');
}
function squashCompy(o, bounce) {
  o.flat = 1.1; SFX.boing(); burst(o.x, GROUND - 14, 10, ['#d8e85a', '#fff'], 220, 600, 6, 0.5);
  G.L.amb.push({ x: o.x + 60, y: GROUND - 110, got: false });
  if (bounce) { const p = G.p; p.vy = -720; p.jumps = 1; p.stomp = false; p.spin = 1; }
}
function shootFire() {
  const p = G.p; if (p.fireCd > 0 || G.startT > 0.3) return;
  p.fireCd = 0.28; p.breathT = 0.3; SFX.fire();
  const [mx, my] = rexMouth(p.duck), ox = p.wx + mx * 0.92, oy = p.y + my * 0.92;
  G.fireballs.push({ x: ox + 14, y: oy, vx: 950, vy: 200, life: 1.1 });
  for (let i = 0; i < 22; i++) { const l = 0.25 + Math.random() * 0.25; G.flames.push({ x: ox, y: oy, vx: 350 + Math.random() * 600, vy: (Math.random() - 0.5) * 200 - 30, life: l, max: l, r: 5 + Math.random() * 7 }); }
}
function roar() {
  const p = G.p;
  if (G.coach) { if (G.coach.type !== 'roar') return; G.coach = null; p.roarCd = 0; }
  if (p.fireT > 0 && !G.boss) { shootFire(); return; }
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
    else if (o.type === 'compy' && d < 300 && !G.compyHint) { G.compyHint = true; toast('Kompsis sind zu frech – spring drauf!', '#ffe08a'); }
  }
}
function hurt(force) {
  const p = G.p; if (!force && p.inv > 0) return;
  p.hearts--; G.hits = (G.hits || 0) + 1; p.inv = 1.8; SFX.hurt(); G.shake = 0.35; G.hitFlash = 0.45;
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
  G.overlay = null; p.hearts = 3; p.inv = 2; p.wx = G.cp; p.y = GROUND; p.vy = 0; p.roarCd = 0; p.stomp = false; p.spin = 1; G.duckHeld = null; G.fireballs = []; G.flames = [];
  G.chili.wx = p.wx + 115; G.chili.dig = null;
  for (const s of L.spots) if (s.state === 'dig') s.state = 'idle';
  for (const o of L.obs) if ((o.type === 'raptor' || o.type === 'ptero' || o.type === 'compy') && o.x > G.cp - 300 && o.x < G.cp + 700) o.dead = true;
  if (G.bossStarted && !G.golden) { p.wx = L.bossX; G.chili.wx = p.wx - 90; G.boss = newBoss(); G.stopped = true; }
  G.startT = 0.9;
}
function newBoss() { return { x: G.L.bossX + 1000, hp: 3, state: 'enter', t: 0, ph: 0, flash: 0 }; }
function revealEgg(s) {
  const e = G.L.eggs[s.k]; e.hidden = false; e.popping = true; e.ty = e.y; e.x0 = s.x; e.x = s.x; e.y = GROUND - 10; e.vy = -900; e.vx = (G.p.wx + 640 - s.x) / 1.1; SFX.pop();
  burst(s.x, GROUND - 5, 20, ['#8b5a2b', '#a0703a', '#ffe08a'], 260, 900, 7, 0.8);
}
const lastRiddle = {};
function openRiddle() {
  toasts = []; const pool = WORLDS[G.wi].riddles; let r;
  do r = pool[Math.floor(Math.random() * pool.length)]; while (pool.length > 1 && r === lastRiddle[G.wi]);
  lastRiddle[G.wi] = r;
  G.overlay = { type: 'riddle', r, order: [0, 1, 2].sort(() => Math.random() - 0.5), wrong: [], msg: '', shake: 0, solved: false };
}
function answer(i) {
  const o = G.overlay, r = o.r;
  if (i === r.ok) { SFX.right(); o.solved = true; o.msg = ''; burst(G.cam + W / 2, 200, 40, ['#ffd740', '#ff5252', '#69f0ae', '#40c4ff', '#fff'], 450, 600, 7, 1.2); }
  else { SFX.wrong(); if (!o.wrong.includes(i)) o.wrong.push(i); o.msg = (r.wrongMsg && r.wrongMsg[i]) || 'Achtung, Trickfrage! Lies nochmal genau.'; o.shake = 0.4; }
}
function openGate() { G.overlay = null; G.gateOpening = true; toast('Das Tor geht auf!', '#9cff8a'); burst(G.L.gateX - 10, GROUND - 200, 50, ['#ffd740', '#ff5252', '#69f0ae', '#40c4ff', '#fff'], 500, 700, 8, 1.4); }
function finishLevel() {
  const wi = G.wi; G.newCards = [];
  for (let k = 0; k < 3; k++) if (G.eggsGot[k]) { if (!save.eggs[wi][k]) G.newCards.push(k); save.eggs[wi][k] = 1; }
  if (wi === 0) { save.tutorialDone = true; save.movesDone = true; }
  G.earned = [G.eggsGot.every(Boolean), !G.hits, G.amber >= Math.ceil(G.L.ambTotal * 0.8)];
  G.newMedals = []; G.earned.forEach((e, k) => { if (e && !save.medals[wi][k]) G.newMedals.push(k); if (e) save.medals[wi][k] = 1; });
  G.newTreasure = G.L.treasure && G.L.treasure.got && !save.treasures[wi];
  if (G.newTreasure) { save.treasures[wi] = 1; save.treasureNew = wi; }
  save.amber += G.amber; save.unlocked = Math.max(save.unlocked, Math.min(3, wi + 1)); writeSave();
  G.overlay = { type: 'complete', t: 0, popped: [] }; SFX.right();
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
  const prevY = p.y, wasGround = p.onGround; p.vy += GRAV * dt; if (p.stomp) { if (p.spin < 1) { p.spin = Math.min(1, p.spin + dt / 0.36); p.vy = Math.min(p.vy, 120); if (p.spin >= 1) { p.vy = 1500; SFX.duck(); } } else p.vy = Math.max(p.vy, 1500); } p.y += p.vy * dt; p.onGround = false;
  if (p.vy >= 0) {
    for (const pl of L.plats) if (p.wx + 25 > pl.x && p.wx - 25 < pl.x + pl.w && prevY <= pl.y + 1 && p.y >= pl.y) { p.y = pl.y; p.vy = 0; p.onGround = true; break; }
    if (!p.onGround && supported(L, p.wx) && prevY <= GROUND + 4 && p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
  }
  if (p.onGround) { p.coyote = 0.1; p.jumps = 0; if (p.stomp) { p.stomp = false; p.spin = 1; stompLand(); } } else p.coyote -= dt;
  const wasDuck = p.duck; p.duck = G.duckHeld != null && p.onGround;
  if (p.duck && !wasDuck && wasGround) burst(p.wx + 20, GROUND, 4, ['#d8c3a5', '#b39b7a'], 120, 300, 4, 0.3);
  p.fireT -= dt; p.fireCd -= dt; p.breathT -= dt;
  for (const pp of L.peppers) if (!pp.got && Math.abs(pp.x - p.wx - 10) < 50 && Math.abs(pp.y - (p.y - 50)) < 70) {
    pp.got = true; p.fireT = 8; SFX.power(); burst(pp.x, pp.y, 26, ['#ff5a1f', '#ffd166', '#fff'], 320, 400, 7, 0.8);
    toast(fmt('Feuer-Chili! {rex} kann Feuer spucken!'), '#ffb030');
    if (!G.pepperHint) { G.pepperHint = true; G.tip = { text: 'Feuer-Chili! Drück FEUER! (Echte Dinos konnten kein Feuer spucken – aber {rex} schon!)'.replace('{rex}', save.rexName || 'Rexi'), t: 5 }; }
  }
  for (const f of G.fireballs) {
    f.x += f.vx * dt; f.y = Math.min(GROUND - 38, f.y + f.vy * dt); f.life -= dt;
    for (let k = 0; k < 2; k++) { const l = 0.2 + Math.random() * 0.2; G.flames.push({ x: f.x - 8, y: f.y + (Math.random() - 0.5) * 14, vx: 120 + Math.random() * 120, vy: -60 - Math.random() * 60, life: l, max: l, r: 6 + Math.random() * 6 }); }
    for (const o of L.obs) {
      if (o.dead || o.scared || o.flat || f.life <= 0) continue;
      const dx = o.x - f.x; let hit = false;
      if (o.type === 'low') hit = Math.abs(dx) < o.w / 2 + 20;
      else if (o.type === 'ptero') hit = Math.abs(dx) < 40 && Math.abs(o.y - f.y) < 60;
      else if (o.type !== 'geyser' && !(o.type === 'icicle' && o.state === 'hang')) hit = Math.abs(dx) < 40;
      if (!hit) continue;
      f.life = 0; burst(f.x, f.y, 18, ['#ffb030', '#ff5a1f', '#fff3a0', '#555'], 300, 400, 8, 0.7);
      if (o.type === 'raptor' || o.type === 'ptero' || o.type === 'compy') { o.scared = true; o.vx = 420; o.vy = -360; }
      else if (o.type === 'geode') breakGeode(o);
      else { o.dead = true; SFX.smash(); for (let i = 0; i < 2; i++) L.amb.push({ x: o.x + 40 + i * 40, y: GROUND - 60 - i * 20, got: false }); if (o.type === 'low') burst(o.x, GROUND - 160, 30, G.wi === 2 ? ['#e0f4ff', '#fff'] : ['#ff9a3c', '#ffd166', '#555'], 400, 600, 9, 1); }
    }
  }
  G.fireballs = G.fireballs.filter(f => f.life > 0);
  if (p.fireT > 0 && Math.random() < 0.25) { const [mx, my] = rexMouth(p.duck); const l = 0.4 + Math.random() * 0.3; G.flames.push({ x: p.wx + mx * 0.88, y: p.y + my * 0.92 + 2, vx: L.speed * (G.stopped ? 0 : 1) + 30, vy: -50 - Math.random() * 40, life: l, max: l, r: 2.5 + Math.random() * 2.5 }); }
  for (const f of G.flames) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy -= 260 * dt; f.vx *= 1 - 2.2 * dt; f.life -= dt; }
  G.flames = G.flames.filter(f => f.life > 0);
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
    if (Math.hypot(e.x - (p.wx + 10), ey - (p.y - 50)) < 80) {
      e.got = true; G.eggsGot[e.k] = true; SFX.egg(); G.flyEggs.push({ x: e.x - G.cam, y: ey, k: e.k, t: 0 }); burst(e.x, ey, 30, ['#fff3b0', '#ffd740', th.egg, th.eggSpot], 360, 500, 7, 1);
      toast('Dino-Karte gefunden: ' + FACTS[G.wi * 3 + e.k].name + '!', '#ffe08a');
    }
  }
  const tr = L.treasure;
  if (tr && !tr.got && Math.hypot(tr.x - (p.wx + 10), tr.y - (p.y - 50)) < 78) {
    tr.got = true; SFX.egg(); setTimeout(SFX.right, 250); burst(tr.x, tr.y, 40, ['#ffd740', '#fff', '#69f0ae'], 400, 500, 7, 1.2);
    toast(TREASURES[tr.k].name + (save.treasures[tr.k] ? '!' : ' gefunden!'), '#ffd740');
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
  const pb = p.duck ? { x: p.wx - 30, y: p.y - 56, w: 80, h: 52 } : { x: p.wx - 25, y: p.y - 92, w: 68, h: 88 };
  for (const o of L.obs) {
    if (o.dead) continue;
    const d = o.x - p.wx;
    if (d > 1200) continue;
    let hb = null;
    switch (o.type) {
      case 'rock': hb = { x: o.x - o.w / 2 + 6, y: GROUND - o.h + 6, w: o.w - 12, h: o.h - 6 }; break;
      case 'boulder': hb = { x: o.x - o.w / 2 + 8, y: GROUND - o.h + 10, w: o.w - 16, h: o.h - 10 }; break;
      case 'low': hb = { x: o.x - o.w / 2, y: -200, w: o.w, h: GROUND - 84 + 200 }; break;
      case 'geode': break;
      case 'raptor': case 'ptero': case 'compy':
        if (o.flat) { o.flat -= dt; if (o.flat <= 0) { o.flat = 0; o.scared = true; o.vx = 300; o.vy = -300; } break; }
        if (o.scared) { o.x += o.vx * dt; o.vy += 900 * dt; if (o.type !== 'ptero') o.yOff = (o.yOff || 0) + o.vy * dt; else o.y += (o.vy - 300) * dt; o.alpha -= dt * 1.3; o.ph += dt * 18; if (o.alpha <= 0) o.dead = true; break; }
        if (d < 760) { o.x -= o.spd * dt; o.ph += dt * (o.type === 'ptero' ? 9 : o.type === 'compy' ? 20 : 15); }
        if (o.type === 'compy') {
          hb = { x: o.x - 20, y: GROUND - 46, w: 40, h: 44 };
          if (p.inv <= 0 && overlap(pb, hb) && p.vy > 0 && p.y <= hb.y + 30) { squashCompy(o, true); hb = null; }
          break;
        }
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
    if (o.x < G.cam - 300 && o.type !== 'icicle') o.dead = o.dead || (o.type === 'raptor' || o.type === 'ptero' || o.type === 'compy');
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
    case 'low': drawLow(o, x); break;
    case 'geode': {
      ell(x, GROUND + 2, 40, 6, 0, 'rgba(0,0,0,.25)');
      ctx.fillStyle = vgrad(GROUND - 44, GROUND, '#a8a8b0', '#6e6e78', '#4a4a52'); ctx.beginPath(); ctx.moveTo(x - 38, GROUND); ctx.quadraticCurveTo(x - 40, GROUND - 40, x, GROUND - 44); ctx.quadraticCurveTo(x + 40, GROUND - 40, x + 38, GROUND); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(30,30,35,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, GROUND - 44); ctx.lineTo(x + 4, GROUND - 28); ctx.lineTo(x - 6, GROUND - 18); ctx.lineTo(x + 2, GROUND - 4); ctx.moveTo(x + 4, GROUND - 28); ctx.lineTo(x + 20, GROUND - 22); ctx.stroke();
      for (const [ax, ay] of [[-16, -20], [14, -12], [-4, -30]]) { ctx.globalAlpha = 0.7 + 0.3 * Math.sin(T * 5 + ax); drawAmber(x + ax, GROUND + ay, 6); } ctx.globalAlpha = 1;
      const by = GROUND - 66 - Math.abs(Math.sin(T * 5)) * 8; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(x - 10, by - 10); ctx.lineTo(x + 10, by - 10); ctx.lineTo(x, by + 4); ctx.fill();
      break;
    }
    case 'compy': if (!o.yOff) shadow(x, GROUND + 2, 22, 0.22); oCompy(x, GROUND + (o.yOff || 0), 1.3, o.ph, !o.scared, { alpha: o.alpha, flat: o.flat > 0 }); break;
    case 'raptor': if (!o.yOff) shadow(x, GROUND + 2, 34, 0.25 * (o.alpha == null ? 1 : Math.max(0, o.alpha))); oRaptor(x, GROUND + (o.yOff || 0), 1.05, o.ph, !o.scared, { alpha: o.alpha }); break;
    case 'ptero': ell(x, GROUND + 2, 26, 5, 0, 'rgba(0,0,0,.15)'); oPtero(x, o.y, 1.45, o.ph, !o.scared, { alpha: o.alpha }); break;
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
function drawLow(o, x) {
  const wi = G.wi, b = GROUND - 84, w = o.w, x0 = x - w / 2;
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x0, GROUND - 2, w, 6);
  if (wi === 0) { // thick branch hanging on vines
    ctx.strokeStyle = '#3f6b2a'; ctx.lineWidth = 5; for (const vx of [x0 + 20, x0 + w - 20]) { ctx.beginPath(); ctx.moveTo(vx, -10); ctx.quadraticCurveTo(vx + 8, b / 2, vx, b - 30); ctx.stroke(); }
    rr(x0 - 20, b - 46, w + 40, 40, 20); ctx.fillStyle = vgrad(b - 46, b - 6, '#8a6038', '#6b4a2b', '#3e2a17'); ctx.fill();
    ell(x0 - 6, b - 26, 10, 18, 0, '#b88a55'); ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x0 - 6, b - 26, 5, 10, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 9; i++) { const tx = x0 - 10 + i * (w + 20) / 8; ctx.fillStyle = '#2f5a1e'; ctx.beginPath(); ctx.moveTo(tx - 6, b - 8); ctx.lineTo(tx, b + 6); ctx.lineTo(tx + 6, b - 8); ctx.fill(); }
    for (let i = 0; i < 5; i++) leaf(x0 + i * w / 4, b - 44, 26, -1.2 - i * 0.3, 0.3, 7, '#4caf50', '#2f7a2c');
  } else if (wi === 1) { // rock overhang
    ctx.fillStyle = hgrad(x0, x0 + w, '#d27a45', '#a5532f', '#6e2f17'); ctx.beginPath(); ctx.moveTo(x0 + 20, -10); ctx.lineTo(x0 + w - 10, -10); ctx.lineTo(x0 + w + 10, b - 70); ctx.lineTo(x0 + w + 20, b - 10); ctx.lineTo(x0 + w - 20, b + 4); ctx.lineTo(x0 + 30, b); ctx.lineTo(x0 - 20, b - 20); ctx.lineTo(x0, b - 90); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,30,10,.3)'; ctx.lineWidth = 2; for (let y = 30; y < b; y += 24) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w + 10, y + 3); ctx.stroke(); }
  } else if (wi === 2) { // frozen rock hanging from above, ice slab with icicles
    ctx.fillStyle = hgrad(x0 + 30, x0 + w - 30, '#4d6a8f', '#33496a', '#22324a'); ctx.beginPath(); ctx.moveTo(x0 + 34, -10); ctx.lineTo(x0 + w - 30, -10); ctx.lineTo(x0 + w - 44, b - 70); ctx.lineTo(x0 + 48, b - 60); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let y = 40; y < b - 80; y += 70) ell(x0 + w / 2 - 8, y, 18, 5, 0.2, 'rgba(255,255,255,.7)');
    rr(x0 - 12, b - 52, w + 24, 46, 14); ctx.fillStyle = vgrad(b - 52, b - 6, '#ffffff', '#bfe0fa', '#7fb0dd'); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 10, b - 40); ctx.lineTo(x0 + 40, b - 20); ctx.moveTo(x0 + w - 40, b - 44); ctx.lineTo(x0 + w - 20, b - 24); ctx.stroke();
    ctx.fillStyle = 'rgba(210,235,255,.95)'; for (let i = 0; i < 8; i++) { const ix = x0 - 4 + i * (w + 8) / 7, len = 10 + (i % 3) * 7; ctx.beginPath(); ctx.moveTo(ix - 6, b - 10); ctx.lineTo(ix + 6, b - 10); ctx.lineTo(ix, b - 10 + len); ctx.fill(); }
  } else { // basalt ledge with glowing drips
    ctx.fillStyle = vgrad(-10, b, '#140c0a', '#2a1c18', '#4a3530'); ctx.beginPath(); ctx.moveTo(x0, -10); ctx.lineTo(x0 + w, -10); ctx.lineTo(x0 + w + 16, b - 10); ctx.lineTo(x0 + w - 10, b); ctx.lineTo(x0 + 10, b); ctx.lineTo(x0 - 16, b - 14); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.shadowColor = '#ff5a00'; ctx.shadowBlur = 12; ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 - 10, b - 6); ctx.lineTo(x0 + w + 10, b - 6); ctx.stroke(); ctx.restore();
    for (let i = 0; i < 4; i++) { const u = (T * 0.9 + i / 4) % 1, dx = x0 + 20 + i * (w - 40) / 3; circle(dx, b + u * 60, 4 * (1 - u) + 1, `rgba(255,${140 + 80 * (1 - u) | 0},40,${1 - u})`); }
  }
  // warning sign on the ground
  const sx = x0 - 70; if (sx > -40) { ctx.fillStyle = '#5b4636'; ctx.fillRect(sx - 2, GROUND - 44, 4, 44); rr(sx - 16, GROUND - 74, 32, 32, 6); ctx.fillStyle = '#ffd34d'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3b2410'; ctx.stroke(); ctx.fillStyle = '#3b2410'; ctx.beginPath(); ctx.moveTo(sx - 8, GROUND - 62); ctx.lineTo(sx + 8, GROUND - 62); ctx.lineTo(sx, GROUND - 50); ctx.fill(); ctx.fillRect(sx - 2, GROUND - 70, 4, 9); }
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
  ctx.fillStyle = hgrad(x0, x0 + 560, '#3a1a12', '#1a0c0a', '#0c0504'); ctx.beginPath(); ctx.moveTo(x0, GROUND); ctx.lineTo(x0 + 40, 300); ctx.lineTo(x0 + 500, 300); ctx.lineTo(x0 + 560, GROUND); ctx.fill();
  ctx.strokeStyle = 'rgba(255,90,20,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 120, 304); ctx.lineTo(x0 + 140, 360); ctx.lineTo(x0 + 128, 420); ctx.moveTo(x0 + 400, 304); ctx.lineTo(x0 + 380, 370); ctx.stroke();
  rr(x0 + 36, 294, 468, 10, 5); ctx.fillStyle = '#4a2c24'; ctx.fill();
  const cheer = G.boss && G.boss.state !== 'enter';
  const hop = i => cheer ? Math.abs(Math.sin(T * 7 + i)) * 10 : 0;
  oLong(x0 + 200, 296 - hop(0), 0.62, '#b07cc6', T * 3, false);
  oLong(x0 + 340, 296 - hop(1), 0.68, '#4f8fd6', T * 3 + 1, false);
  oTrike(x0 + 450, 296 - hop(2), 0.9, '#f39c34', 0, false);
  const lbl = (s, x) => { setFont(16); const w = ctx.measureText(s).width + 14; rr(x - w / 2, 306, w, 22, 10); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); txt(s, x, 318, 16, '#3b2410'); };
  lbl('Mami', x0 + 180); lbl('Papi', x0 + 320); lbl('Fabio', x0 + 450);
  if (cheer) {
    const lines = [['Los, Oli!', x0 + 240, 180], [fmt('Du schaffst das, {rex}!'), x0 + 390, 160], ['Oli! Oli! Oli!', x0 + 480, 225]];
    lines.forEach(([s, x, y], i) => { if (Math.sin(T * 1.5 + i * 2.1) > -0.2) { setFont(18); const w = ctx.measureText(s).width + 20; rr(x - w / 2, y - 16, w, 32, 14); ctx.fillStyle = '#fff'; ctx.fill(); txt(s, x, y, 18, '#3b2410'); } });
  }
}
function drawPlay() {
  const L = G.L, p = G.p, th = WORLDS[G.wi], cam = G.cam;
  perfWatch();
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * 16 * G.shake, (Math.random() - 0.5) * 16 * G.shake);
  drawBackground(G.wi, cam);
  if (L.bossX) drawFamilyCliff(L, cam);
  drawGround(G.wi, L, cam);
  for (const pl of L.plats) drawPlatform(pl, cam, G.wi);
  for (const c of L.cps) { const x = c.x - cam; if (x < -50 || x > W + 50) continue; ctx.fillStyle = '#5b4636'; ctx.fillRect(x - 3, GROUND - 110, 6, 110); const fy = c.on ? GROUND - 108 : GROUND - 40; ctx.fillStyle = c.on ? '#ffd34d' : '#999'; ctx.beginPath(); ctx.moveTo(x + 3, fy); ctx.lineTo(x + 46 + Math.sin(T * 6) * 4, fy + 14); ctx.lineTo(x + 3, fy + 28); ctx.fill(); }
  for (const s of L.spots) { const x = s.x - cam; if (x < -50 || x > W + 50) continue; if (s.state === 'done') ell(x, GROUND + 2, 26, 7, 0, '#1a0f08'); else { ell(x, GROUND, 30, 14, 0, '#7a5230'); for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 6 + i * 2); circle(x - 14 + i * 14, GROUND - 22 - i * 5, 3, '#fff6b0'); } ctx.globalAlpha = 1; } }
  drawGate(L, cam);
  for (const a of L.amb) if (!a.got) { const x = a.x - cam; if (x > -20 && x < W + 20) drawAmber(x, a.y + Math.sin(T * 4 + a.x) * 3, 10); }
  for (const e of L.eggs) if (!e.hidden && !e.got) { const x = e.x - cam; if (x > -60 && x < W + 60) drawEgg(x, e.y + Math.sin(T * 3 + e.k) * 5, 24, th.egg, th.eggSpot, 0.8 + 0.2 * Math.sin(T * 5), Math.sin(T * 2) * 0.1); }
  for (const o of L.obs) if (!o.dead && o.type !== 'low') drawObstacle(o, cam, th);
  for (const pp of L.peppers) if (!pp.got) { const x = pp.x - cam; if (x > -40 && x < W + 40) { const y = pp.y + Math.sin(T * 4 + pp.x) * 5; const g = ctx.createRadialGradient(x, y, 4, x, y, 44); g.addColorStop(0, 'rgba(255,150,40,.65)'); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI * 2); ctx.fill(); drawPepper(x, y, 1.1, 0.4 + Math.sin(T * 3) * 0.2); } }
  if (L.treasure && !L.treasure.got) { const tr = L.treasure, x = tr.x - cam, y = tr.y + Math.sin(T * 3) * 6; if (x > -80 && x < W + 80) { const g = ctx.createRadialGradient(x, y, 5, x, y, 70); g.addColorStop(0, 'rgba(255,240,150,.7)'); g.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = save.treasures[tr.k] ? 0.6 : 1; drawTreasure(tr.k, x, y, 0.9); ctx.globalAlpha = 1; for (let i = 0; i < 4; i++) { const a = T * 2 + i * 1.57; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 6 + i); circle(x + Math.cos(a) * 44, y + Math.sin(a) * 30, 3, '#fff6b0'); } ctx.globalAlpha = 1; } }
  if (G.golden && !G.gotGolden) drawEgg(G.golden.x - cam, G.golden.y + (G.golden.landed ? Math.sin(T * 3) * 5 : 0), 32, '#ffd700', '#e0a800', 1.2, Math.sin(T * 2) * 0.1);
  if (G.boss && G.boss.x - cam < W + 200) { const b = G.boss; const bx = b.x - cam; ctx.save(); if (b.flash > 0 && Math.sin(T * 40) > 0) ctx.globalAlpha = 0.4; shadow(bx, GROUND + 2, 80, 0.3); oRaptor(bx, GROUND, 2.3, b.state === 'taunt' ? 0 : b.ph, b.state !== 'flee', { col: '#8b1a1a', dark: '#4a0a0a', crown: true }); ctx.restore(); if (b.state === 'taunt') otxt('!', bx - 70, GROUND - 230, 60, '#ff5252', '#000', 8); for (let i = 0; i < 3; i++) drawHeart(bx - 40 + i * 30, GROUND - 260, 0.9, i < b.hp); }
  // chili
  const c = G.chili; shadow(c.wx - cam + 6, GROUND + 2, 22 * clamp(1 - (GROUND - c.y) / 200, 0.4, 1), 0.25); oChili(c.wx - cam, c.y, 1.25, c.ph, c.dig ? false : (G.bossStarted && !G.golden));
  if (c.dig) otxt('!', c.wx - cam + 20, c.y - 70 - Math.abs(Math.sin(T * 10)) * 6, 36, '#ffd34d', '#3b1d00', 6);
  // baby + kiwi followers
  if (save.treasures[3]) oKiwi(p.wx - cam - 215, GROUND - (G.startT > 0 || G.stopped ? 0 : Math.abs(Math.sin(p.ph * 0.7 + 1)) * 12), 1.1, p.ph * 1.3);
  if (save.babyName) oBaby(p.wx - cam - 150, GROUND - (G.startT > 0 || G.stopped ? 0 : Math.abs(Math.sin(p.ph * 0.6)) * 10), 0.85, p.ph);
  // player
  { let sy = GROUND; for (const pl of L.plats) if (p.wx + 20 > pl.x && p.wx - 20 < pl.x + pl.w && pl.y >= p.y - 2) sy = Math.min(sy, pl.y); if (sy < GROUND || supported(L, p.wx)) shadow(p.wx - cam + 4, sy + 2, 52 * clamp(1 - (sy - p.y) / 260, 0.35, 1), 0.3); }
  if (p.fireT > 0) { const g = ctx.createRadialGradient(p.wx - cam + 10, p.y - 60, 10, p.wx - cam + 10, p.y - 60, 120); g.addColorStop(0, `rgba(255,140,30,${0.3 + 0.12 * Math.sin(T * 10)})`); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.fillRect(p.wx - cam - 110, p.y - 180, 240, 240); }
  const spinA = p.stomp && p.spin < 1 ? (3 * p.spin * p.spin - 2 * p.spin * p.spin * p.spin) * Math.PI * 2 : 0, scx = p.wx - cam + 4, scy = p.y - 66;
  if (spinA) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(scx, scy, 104, spinA - Math.PI / 2 - 1.3, spinA - Math.PI / 2); ctx.stroke(); ctx.save(); ctx.translate(scx, scy); ctx.rotate(spinA); ctx.translate(-scx, -scy); }
  if (!(p.inv > 0 && Math.sin(T * 30) > 0.3)) oRex(p.wx - cam, p.y, 0.92, p.ph, p.roarT > 0 || p.breathT > 0 ? 1 : 0.05, { rider: true, air: !p.onGround, hat: G.wi >= 2, duck: p.duck, stomp: p.stomp && p.spin >= 1, fire: p.fireT > 0 });
  if (spinA) ctx.restore();
  for (const o of L.obs) if (!o.dead && o.type === 'low') drawObstacle(o, cam, th);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (p.breathT > 0) { // flame jet from the mouth
    const [mx0, my0] = rexMouth(p.duck), mx = p.wx - cam + mx0 * 0.92, my = p.y + my0 * 0.92, u = clamp(p.breathT / 0.3, 0, 1), len = 150 * (1.15 - u * 0.4);
    const g = ctx.createRadialGradient(mx, my, 2, mx, my, len); g.addColorStop(0, 'rgba(255,250,210,.95)'); g.addColorStop(0.25, 'rgba(255,190,60,.85)'); g.addColorStop(0.7, 'rgba(255,90,20,.45)'); g.addColorStop(1, 'rgba(200,30,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(mx, my);
    for (let i = 0; i <= 10; i++) { const a = -0.28 + i * 0.056, r = len * (0.85 + 0.15 * Math.sin(T * 50 + i * 1.7)); ctx.lineTo(mx + Math.cos(a) * r, my + 10 + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    const g2 = ctx.createRadialGradient(mx, my, 1, mx, my, 50); g2.addColorStop(0, 'rgba(255,255,255,.9)'); g2.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(mx, my, 50, 0, Math.PI * 2); ctx.fill();
  }
  for (const f of G.flames) {
    const u = f.life / f.max, x = f.x - cam, r = f.r * (1.4 - u * 0.6);
    ctx.globalAlpha = Math.min(1, u * 1.4); ctx.fillStyle = u > 0.65 ? '#fff3b0' : u > 0.35 ? '#ffa628' : '#ff4a10';
    ctx.beginPath(); ctx.arc(x, f.y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of G.fireballs) {
    const x = f.x - cam, fl = 1 + 0.12 * Math.sin(T * 45);
    const g = ctx.createRadialGradient(x, f.y, 2, x, f.y, 40 * fl); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.3, 'rgba(255,190,60,.95)'); g.addColorStop(0.65, 'rgba(255,80,10,.5)'); g.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, f.y, 40 * fl, 0, Math.PI * 2); ctx.fill();
    for (let k = 1; k <= 3; k++) { ctx.globalAlpha = 0.5 / k; circle(x - k * 16, f.y - k * 3 + Math.sin(T * 30 + k) * 3, 16 - k * 3, '#ff8a20'); }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (p.stomp && p.spin >= 1) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { const lx = p.wx - cam - 30 + i * 22; ctx.beginPath(); ctx.moveTo(lx, p.y - 150); ctx.lineTo(lx, p.y - 110); ctx.stroke(); } }
  for (const r of G.rings) { ctx.strokeStyle = `rgba(${r.c},${r.a})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(r.x - cam, r.y, r.r, -0.9, 0.9); ctx.stroke(); }
  drawParts(cam);
  if (th.snow) drawSnow(0.8);
  if (th.lava) drawEmbers();
  drawAmbient(G.wi);
  drawForeground(G.wi, cam);
  vignette(G.wi);
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
  // duck / stomp button
  { const dx = 92, dy = H - 92, held = G.duckHeld != null, air = !p.onGround;
    const threat = G.L.obs.some(o => !o.dead && !o.scared && ((o.type === 'low') || (o.type === 'ptero' && o.low)) && o.x - p.wx > 0 && o.x - p.wx < 330) || (air && G.L.obs.some(o => !o.dead && !o.flat && (o.type === 'geode' || o.type === 'compy') && Math.abs(o.x - p.wx - 60) < 120));
    if (threat && !held) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T * 14); circle(dx, dy, 74 + 6 * Math.sin(T * 14), '#9fd3ff'); ctx.globalAlpha = 1; }
    circle(dx, dy, held ? 54 : 58, held ? 'rgba(30,80,170,.95)' : 'rgba(46,111,214,.85)');
    ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(dx, dy, held ? 54 : 58, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(dx - 14, dy - 30); ctx.lineTo(dx + 14, dy - 30); ctx.lineTo(dx, dy - 14); ctx.fill();
    otxt(air ? 'STAMPF!' : 'DUCKEN', dx, dy + 10, air ? 21 : 20, '#fff', 'rgba(0,0,0,.6)', 5); }
  // roar / fire button
  const rx = W - 92, ry = H - 92, ready = p.roarCd <= 0;
  if (p.fireT > 0 && !G.boss) {
    ctx.globalAlpha = 0.45 + 0.25 * Math.sin(T * 10); circle(rx, ry, 80, '#ffb030'); ctx.globalAlpha = 1;
    circle(rx, ry, 66, 'rgba(255,110,20,.92)'); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(rx, ry, 66, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(rx, ry, 58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.fireT / 8)); ctx.stroke();
    otxt('FEUER!', rx, ry, 26, '#fff', 'rgba(120,20,0,.8)', 5);
    buttons.push({ x: rx - 80, y: ry - 80, w: 160, h: 160, cb: roar, silent: true });
    return;
  }
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
  } else if (c.type === 'duck' || c.type === 'stomp') {
    const dx = 92, dy = H - 92;
    ctx.strokeStyle = `rgba(160,210,255,${1 - u})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(dx, dy, 62 + u * 45, 0, Math.PI * 2); ctx.stroke();
    circle(dx, dy, 58, 'rgba(46,111,214,1)'); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(dx, dy, 58, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(dx - 14, dy - 30); ctx.lineTo(dx + 14, dy - 30); ctx.lineTo(dx, dy - 14); ctx.fill();
    otxt(c.type === 'stomp' ? 'STAMPF!' : 'DUCKEN', dx, dy + 10, 20, '#fff', 'rgba(0,0,0,.6)', 5);
    const bx = dx + 150 + Math.abs(Math.sin(T * 6)) * 18;
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(bx - 62, dy); ctx.lineTo(bx - 30, dy - 26); ctx.lineTo(bx - 30, dy - 11); ctx.lineTo(bx + 24, dy - 11); ctx.lineTo(bx + 24, dy + 11); ctx.lineTo(bx - 30, dy + 11); ctx.lineTo(bx - 30, dy + 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3b1d00'; ctx.lineWidth = 3; ctx.stroke();
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
    const r = o.r; o.shake = Math.max(0, o.shake - DT);
    ctx.save(); if (o.shake > 0) ctx.translate(Math.sin(T * 60) * 8 * o.shake, 0);
    panel(110, 40, 740, 460); drawPortrait('goetti', 180, 112, 46);
    button('🔊 Vorlesen', 660, 56, 170, 42, () => speak(o.solved ? r.why : r.q + ' ' + o.order.map(i => r.a[i]).join('? Oder ') + '?'), { size: 18, color: '#e0d2b0' });
    txt('Goettis Rätsel-Tor', 250, 86, 22, '#8a6a3a', 'left');
    wrapLines(r.q, 560, 28).forEach((l, i) => txt(l, 250, 122 + i * 34, 28, '#3b2410', 'left'));
    if (!o.solved) {
      o.order.forEach((ai, j) => { const bad = o.wrong.includes(ai); button((bad ? '✗ ' : '') + r.a[ai], 230, 230 + j * 80, 500, 64, () => { if (!bad) answer(ai); }, { color: bad ? '#e8b4b4' : '#f4b400', size: 30 }); });
      if (o.msg) txt(o.msg, W / 2, 478, 22, '#b03a2e');
    } else {
      rr(230, 228, 500, 64, 26); ctx.fillStyle = '#9be38a'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.stroke();
      txt('✓ ' + r.a[r.ok], W / 2, 261, 30, '#17420f');
      wrapLines(r.why, 600, 24).forEach((l, i) => txt(l, W / 2, 330 + i * 32, 24, '#3b2410', 'center', 'normal'));
      button('Tor öffnen!', W / 2 - 140, 418, 280, 62, openGate, { size: 28 });
    }
    ctx.restore();
  } else if (o.type === 'complete') {
    o.t += DT;
    panel(150, 24, 660, 492);
    otxt('Welt geschafft!', W / 2, 70, 44, '#ffd34d', '#3b1d00', 10);
    for (let k = 0; k < 3; k++) { const has = save.eggs[G.wi][k]; const x = W / 2 - 180 + k * 180; drawEgg(x, 132, 28, has ? th.egg : '#ddd', has ? th.eggSpot : '#ccc', has ? 0.6 : 0, Math.sin(T * 3 + k) * 0.08); txt(has ? FACTS[G.wi * 3 + k].name : '???', x, 176, 20, has ? '#3b2410' : '#999'); if (G.newCards.includes(k)) txt('NEU!', x + 30, 108, 16, '#e53935'); }
    for (let k = 0; k < 3; k++) {
      const x = W / 2 - 200 + k * 200, on = save.medals[G.wi][k], isNew = G.newMedals.includes(k);
      const u = isNew ? clamp((o.t - 0.5 - k * 0.45) * 3, 0, 1) : 1;
      if (isNew && u > 0 && !o.popped.includes(k)) { o.popped.push(k); [784, 988, 1175, 1568].forEach((f, j) => tone(f, 0.25, 'triangle', 0.12, null, j * 0.06)); burst(G.cam + x, 250, 25, ['#ffd34d', '#fff', '#e8a317'], 300, 400, 6, 0.9); }
      const sc = isNew ? (u < 1 ? u * 1.35 : 1 + 0.05 * Math.sin(T * 6)) : 1;
      ctx.save(); ctx.translate(x, 252); ctx.scale(sc, sc); drawMedal(0, 0, 26, k, on && u > 0); ctx.restore();
      txt(MEDALS[k][0], x, 296, 19, on ? '#3b2410' : '#999');
      txt(G.earned[k] ? 'geschafft!' : k === 2 ? `${G.amber} von ${Math.ceil(G.L.ambTotal * 0.8)}` : MEDALS[k][1], x, 318, 15, G.earned[k] ? '#2e7d32' : '#8a6a3a', 'center', 'normal');
      if (isNew && u >= 1) txt('NEU!', x + 32, 222, 16, '#e53935');
    }
    if (G.newTreasure) { drawTreasure(G.wi, W / 2 - 200, 362, 0.85); txt(TREASURES[G.wi].name + ' gefunden!', W / 2 + 20, 368, 26, '#2e7d32'); }
    else if (!save.treasures[G.wi]) txt('Goetti vermisst hier noch etwas … Schau mal ganz weit oben!', W / 2, 368, 19, '#6b4a2b', 'center', 'normal');
    else { const missing = 3 - save.eggs[G.wi].reduce((a, b) => a + b, 0); txt(missing ? 'Chili schnuppert: Hier sind noch Eier versteckt!' : 'Super gemacht!', W / 2, 368, 20, '#6b4a2b', 'center', 'normal'); }
    button('Karte', 230, 422, 200, 62, () => go('map'), { color: '#e0d2b0' });
    if (G.wi < 3) button('Nächste Welt', 460, 422, 270, 62, () => startLevel(G.wi + 1));
    else button('Weiter!', 460, 422, 270, 62, () => startEnding(), { color: '#e57373', textColor: '#fff' });
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
  shadow(436, GROUND + 2, 26, 0.3); shadow(286, GROUND + 2, 70, 0.3);
  oChili(430, GROUND - Math.abs(Math.sin(T * 9)) * 14, 1.4, T * 9);
  oRex(280, GROUND, 1.3, T * 13, 0.12 + 0.12 * Math.sin(T * 2), { rider: true });
  if (save.babyName) oBaby(120, GROUND - Math.abs(Math.sin(T * 10)) * 9, 1, T * 10);
  drawAmbient(0); drawForeground(0, cam); vignette(0);
  logo(W / 2, 110);
  otxt(save.rexName ? `Ein Abenteuer mit ${save.rexName} und Chili` : 'Ein Abenteuer mit Chili und einem T-Rex', W / 2, 178, 26, '#fff', 'rgba(0,0,0,.7)', 6);
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(T * 4); otxt('Tippe zum Starten', 700, 330, 36, '#fff', '#000', 8); ctx.globalAlpha = 1;
  txt('Ein Weihnachtsgeschenk von Goetti · 2026', W / 2, 515, 17, 'rgba(255,255,255,.75)');
}
function logo(cx, cy) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.03);
  const t = 'Olis Dino-Rettung'; setFont(78); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillText(t, 4, 9);
  ctx.strokeStyle = '#2a1200'; ctx.lineWidth = 18; ctx.strokeText(t, 0, 0);
  ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = 8; ctx.strokeText(t, 0, 0);
  ctx.fillStyle = vgrad(-34, 34, '#fff6b0', '#ffd34d', '#f08a1a'); ctx.fillText(t, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(-400, -40, 800, 30); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillText(t, 0, 0); ctx.restore();
  for (let i = 0; i < 4; i++) { const a = 0.5 + 0.5 * Math.sin(T * 3 + i * 1.7), px = [-300, -90, 150, 320][i], py = [-38, 34, -40, 30][i]; ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.beginPath(); for (let k = 0; k < 8; k++) { const ang = k / 8 * Math.PI * 2, r = k % 2 ? 2.5 : 10; ctx.lineTo(px + Math.cos(ang) * r, py + Math.sin(ang) * r); } ctx.fill(); }
  ctx.globalAlpha = 1; ctx.restore();
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
  ctx.fillStyle = hgrad(560, 820, '#86603a', '#6b4a2b', '#4a3020'); rr(560, 250, 260, 190, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2; for (let yy = 270; yy < 440; yy += 20) { ctx.beginPath(); ctx.moveTo(562, yy); ctx.lineTo(818, yy); ctx.stroke(); }
  ctx.fillStyle = '#4a3020'; ctx.beginPath(); ctx.moveTo(540, 255); ctx.lineTo(690, 170); ctx.lineTo(840, 255); ctx.fill();
  rr(600, 290, 60, 50, 6); ctx.fillStyle = '#ffe08a'; ctx.fill();
  rr(720, 320, 60, 120, 6); ctx.fillStyle = '#3b2410'; ctx.fill();
  setFont(18); rr(610, 222, 160, 28, 8); ctx.fillStyle = '#f3dcc4'; ctx.fill(); txt('Dino-Station', 690, 236, 18, '#3b2410');
  shadow(486, GROUND + 2, 34, 0.3); shadow(246, GROUND + 2, 64, 0.3); shadow(386, GROUND + 2, 26, 0.3);
  oGoetti(480, GROUND, 1.2, true);
  oRex(240, GROUND, 1.15, T * 2, save.rexName ? 0.2 : 0, { rider: true });
  oChili(380, GROUND, 1.4, T * 3);
  vignette(0);
}

const MAPNODES = [{ x: 165, y: 338 }, { x: 385, y: 258 }, { x: 600, y: 322 }, { x: 815, y: 238 }];
const chestPop = [0, 0, 0, 0];
function drawMapIcon(i, x, y) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI * 2); ctx.clip();
  const th = WORLDS[i]; const g = ctx.createLinearGradient(0, y - 46, 0, y + 46); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); ctx.fillStyle = g; ctx.fillRect(x - 50, y - 50, 100, 100);
  ctx.fillStyle = th.top; ctx.fillRect(x - 50, y + 22, 100, 30);
  if (i === 0) palm(x, y + 24, 60, '#1f5a35'); else if (i === 1) cactus(x, y + 24, 46, '#5f7a2a'); else if (i === 2) pine(x, y + 26, 70, '#1d4a3f', true); else drawVolcano(x, y + 24, 0.22, '#2a0a08', 1);
  ctx.restore();
}
function playTreasure(i) {
  if (!save.treasures[i]) { SFX.wrong(); toast(i === 3 ? 'Wo ist Kiwi nur? Vielleicht beim Vulkan …' : 'Das hat Goetti noch verloren – in Welt ' + (i + 1) + '!', '#ffb4a8'); return; }
  chestPop[i] = 1; toast(TREASURES[i].tap, '#ffd34d');
  if (i === 0) { [[196, 247, 294, 392, 494], [262, 330, 392, 523, 659], [220, 262, 330, 440, 523], [196, 247, 294, 392, 494]].forEach((ch, c) => ch.forEach((f, j) => tone(f, 0.9, 'triangle', 0.07, null, c * 0.45 + j * 0.03))); }
  else if (i === 1) { for (const d of [0, 0.28]) { tone(2100, 0.35, 'sine', 0.12, null, d); tone(2650, 0.3, 'sine', 0.07, null, d + 0.02); } }
  else if (i === 2) { noise(0.4, 0.3, 1400); tone(500, 0.15, 'sine', 0.12, 1500, 0.3); }
  else { tone(1700, 0.2, 'square', 0.05, 2700); tone(1700, 0.2, 'square', 0.05, 2700, 0.28); }
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
    for (let k = 0; k < 3; k++) drawMedal(n.x - 30 + k * 30, n.y + 106, 10, k, save.medals[i][k]);
    buttons.push({ x: n.x - 60, y: n.y - 85, w: 120, h: 175, cb: () => { if (open) startLevel(i); else { SFX.wrong(); toast('Diese Welt ist noch gesperrt!', '#ffb4a8'); } } });
  });
  const cur = MAPNODES[Math.min(save.unlocked, 3)];
  oRex(cur.x - 108, cur.y + 48 - Math.abs(Math.sin(T * 4)) * 6, 0.5, T * 4, 0, { rider: true });
  otxt('Welt-Karte', 30, 42, 40, '#ffd34d', '#3b1d00', 9, 'left');
  otxt(fmt('{rex} und Chili sind bereit!'), 32, 84, 22, '#fff', 'rgba(0,0,0,.7)', 5, 'left');
  drawAmber(W - 210, 40, 14); otxt(String(save.amber), W - 188, 41, 26, '#ffe08a', 'rgba(0,0,0,.7)', 5, 'left');
  drawMedal(W - 318, 48, 13, 1, true); otxt(`${save.medals.flat().reduce((a, b) => a + b, 0)}/12`, W - 298, 41, 26, '#ffe08a', 'rgba(0,0,0,.7)', 5, 'left');
  // Goetti's treasure chest
  rr(256, H - 100, 448, 88, 16); ctx.fillStyle = 'rgba(60,35,15,.88)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#e8a317'; ctx.stroke();
  txt('Goettis Schatzkiste', 272, H - 86, 15, '#ffd34d', 'left');
  for (let i = 0; i < 4; i++) {
    const x = 316 + i * 110, y = H - 44, has = save.treasures[i];
    chestPop[i] = Math.max(0, chestPop[i] - DT * 2);
    circle(x, y, 30, has ? 'rgba(255,240,180,.18)' : 'rgba(0,0,0,.3)');
    if (has) { ctx.save(); ctx.translate(x, y); const sc = 1 + chestPop[i] * 0.4; ctx.scale(sc, sc); ctx.rotate(Math.sin(T * 20) * chestPop[i] * 0.3); drawTreasure(i, 0, 0, 0.58, T * 6); ctx.restore(); }
    else txt('?', x, y + 2, 30, 'rgba(255,255,255,.4)');
    buttons.push({ x: x - 50, y: y - 40, w: 100, h: 80, silent: true, cb: () => playTreasure(i) });
  }
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
function treasureLines() {
  const n = save.treasures.reduce((a, b) => a + b, 0), L = [];
  if (save.treasures[3]) L.push({ who: 'kiwi', text: 'Kiwi! Kiwi! (Kiwi will auch mitfeiern.)' });
  if (n === 4) L.push({ who: 'goetti', text: 'Und dank dir habe ich meine Gitarre, mein Velo, meine Angel – und Kiwi wieder! Das beste Weihnachten überhaupt!' });
  else if (n > 0) L.push({ who: 'goetti', text: 'Ein paar meiner verlorenen Sachen hast du auch gefunden – danke! Vielleicht entdeckst du ja noch den Rest …' });
  else L.push({ who: 'goetti', text: 'Meine Gitarre, mein Velo, meine Angel und mein Kiwi sind leider noch irgendwo da draussen … Vielleicht findest du sie ja!' });
  return L;
}
function afterBabyName() {
  startDialog([
    { who: 'mami', text: '{baby}! Was für ein wunderschöner Name!' },
    { who: 'papi', text: 'Willkommen in der Familie, {baby}!' },
    { who: 'fabio', text: 'Darf ich {baby} auch mal streicheln? Bitte, bitte!' },
    { who: 'chili', text: 'Mümmel, mümmel! (Chili freut sich riesig.)' },
    ...treasureLines(),
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
  ctx.fillStyle = vgrad(450, H, '#ffffff', '#c9dcf0'); ctx.fillRect(0, 450, W, 90);
  for (let k = 0; k < 16; k++) ell(k * 64 + 20, 452, 36, 6, 0, '#fff');
  // station hut
  ctx.fillStyle = '#4a3020'; ctx.fillRect(160, 240, 24, 50); ctx.fillStyle = '#fff'; ctx.fillRect(157, 236, 30, 7);
  for (let i = 0; i < 6; i++) { const u = (T * 0.25 + i / 6) % 1; circle(172 + Math.sin(u * 7 + i) * 10 + u * 30, 232 - u * 120, 6 + u * 16, `rgba(220,225,235,${0.45 * (1 - u)})`); }
  { const g = ctx.createRadialGradient(75, 351, 10, 75, 351, 120); g.addColorStop(0, 'rgba(255,200,90,.45)'); g.addColorStop(1, 'rgba(255,200,90,0)'); ctx.fillStyle = g; ctx.fillRect(-45, 231, 240, 240); }
  ctx.fillStyle = hgrad(30, 210, '#86603a', '#6b4a2b', '#4a3020'); ctx.fillRect(30, 300, 180, 150);
  ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2; for (let yy = 318; yy < 450; yy += 18) { ctx.beginPath(); ctx.moveTo(30, yy); ctx.lineTo(210, yy); ctx.stroke(); }
  ctx.fillStyle = '#4a3020'; ctx.beginPath(); ctx.moveTo(15, 305); ctx.lineTo(120, 235); ctx.lineTo(225, 305); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(15, 305); ctx.lineTo(120, 235); ctx.lineTo(225, 305); ctx.lineTo(210, 300); ctx.lineTo(120, 245); ctx.lineTo(30, 300); ctx.fill();
  rr(50, 330, 50, 42, 5); ctx.fillStyle = `rgba(255,224,138,${0.85 + 0.15 * Math.sin(T * 3)})`; ctx.fill();
  ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(75, 330); ctx.lineTo(75, 372); ctx.moveTo(50, 351); ctx.lineTo(100, 351); ctx.stroke(); ell(75, 330, 30, 5, 0, '#fff');
  rr(140, 360, 50, 90, 5); ctx.fillStyle = '#3b2410'; ctx.fill();
  ctx.strokeStyle = '#2e8b57'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(165, 385, 12, 0, Math.PI * 2); ctx.stroke(); circle(165, 375, 3, '#d63a3a');
  for (let i = 0; i < 8; i++) circle(30 + i * 25, 302, 4, ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff'][(i + Math.floor(T * 3)) % 4]);
  pine(268, 452, 210, '#1f6b42', true);
  if (save.treasures[1]) drawBike(95, 452, 0.95);
  if (save.treasures[2]) drawRod(222, 418, 1, T * 3);
  rr(230, 425, 30, 26, 3); ctx.fillStyle = '#d63a3a'; ctx.fill(); ctx.fillStyle = '#ffd740'; ctx.fillRect(243, 425, 5, 26);
  rr(280, 432, 26, 20, 3); ctx.fillStyle = '#40a4ff'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(291, 432, 4, 20);
  // family (right)
  for (const [sx, sw] of [[790, 50], [895, 56], [714, 34], [640, 52], [395, 24], [325, 30], [570, 20]]) shadow(sx, 454, sw, 0.18);
  oLong(800, 452, 0.72, '#b07cc6', T * 2, true);
  oLong(905, 452, 0.8, '#4f8fd6', T * 2 + 1, true);
  oTrike(720, 455 - (E.phase === 'party' ? Math.abs(Math.sin(T * 6)) * 12 : 0), 1, '#f39c34', 0, true);
  oGoetti(325, 452, 1.1, E.phase === 'party' && !save.treasures[0]);
  if (save.treasures[0]) drawGuitar(332, 372 + (E.phase === 'party' ? Math.sin(T * 8) * 2 : 0), 0.85, -1.05);
  if (save.treasures[3]) oKiwi(572, 454 - (E.phase === 'party' ? Math.abs(Math.sin(T * 9 + 1)) * 16 : 0), 1.25, T * 8, true);
  oRex(640, 452, 1.0, E.phase === 'party' ? T * 6 : 0, E.phase === 'party' ? 0.3 + 0.3 * Math.sin(T * 5) : 0.1, { rider: true, flip: true, hat: true });
  oChili(395, 456 - (E.phase === 'party' ? Math.abs(Math.sin(T * 8)) * 18 : 0), 1.4, T * 6, false);
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
  if (scene === 'play' && G && !G.overlay && Math.hypot(x - 92, y - (H - 92)) < 84) { duckDown(e.pointerId); return; }
  if (hitButtons(x, y)) return;
  if (scene === 'title') pressTitle();
  else if (scene === 'play' && !G.overlay) jump();
});
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, e => duckUp(e.pointerId));
window.addEventListener('keyup', e => { if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') duckUp('key'); });
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
  } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
    e.preventDefault(); if (scene === 'play') duckDown('key');
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
window.__dino = { get scene() { return scene; }, get lowfx() { return LOWFX; }, set lowfx(v) { LOWFX = v; }, get G() { return G; }, get E() { return E; }, save, startLevel, startEnding, go, jump, roar, updatePlay, updateEnding, answer, retry, tapEgg, openGate, playTreasure, drawPlay, duckDown, duckUp, shootFire };
})();
