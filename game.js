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
let save = { rexName: '', babyName: '', unlocked: 0, eggs: [[0,0,0],[0,0,0],[0,0,0],[0,0,0]], amber: 0, finished: false, muted: false, tutorialDone: false, learned: { duck: 0, stomp: 0, fire: 0, dash: 0, swim: 0, glide: 0 }, riddleSeen: [[], [], [], []],
  medals: [[0,0,0],[0,0,0],[0,0,0],[0,0,0]], treasures: [0,0,0,0], treasureNew: -1 };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) save = Object.assign(save, s); } catch (e) {}
// calendar progress: one entry per level (24 days). Old 4-world saves keep names, amber and shop items but start the calendar fresh.
if (!save.lvE) save.lvE = []; if (!save.lvM) save.lvM = []; if (!save.lvDone) save.lvDone = [];
while (save.lvE.length < 24) { save.lvE.push([0, 0, 0]); save.lvM.push([0, 0, 0]); save.lvDone.push(0); }
if (!save.gifts) save.gifts = []; if (save.dayOverride === undefined) save.dayOverride = null;
save.learned = Object.assign({ duck: 0, stomp: 0, fire: 0, dash: 0, swim: 0, glide: 0 }, save.learned);
while (save.riddleSeen.length < 8) save.riddleSeen.push([]);
if (!save.owned) save.owned = { skin: [0], hat: [0], fire: [0] };
if (!save.equip) save.equip = { skin: 0, hat: 0, fire: 0 };
if (!save.best) save.best = []; while (save.best.length < 8) save.best.push(0);
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
let noiseBuf = null;
function noise(dur, vol = 0.3, freq = 800, delay = 0) {
  if (save.muted || !AC) return;
  const t = AC.currentTime + delay;
  if (!noiseBuf) { const n = Math.floor(AC.sampleRate * 2), d = (noiseBuf = AC.createBuffer(1, n, AC.sampleRate)).getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
  const src = AC.createBufferSource(); src.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(AC.destination); src.start(t, Math.random() * 1.5, dur + 0.02);
}
const SFX = {
  jump() { tone(330, 0.16, 'square', 0.07, 660); },
  jump2() { tone(500, 0.16, 'square', 0.07, 950); },
  roar() { noise(0.7, 0.45, 450); tone(120, 0.65, 'sawtooth', 0.16, 50); tone(180, 0.5, 'sawtooth', 0.09, 70); },
  dash() { noise(0.28, 0.35, 2600); tone(300, 0.25, 'sawtooth', 0.07, 900); },
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

// Background music: a small song engine. Every world has a hook (the original loop) plus generated verses
// built from the same pentatonic scale, arranged into a ~1.5 minute song. Layers (arpeggio, hats, drums) fade in as the level gets tense.
const N_ = null;
const SONGS = {
  map: { bpm: 92, root: 261.6, wave: 'triangle', sc: 'maj', bass: 'calm', dens: 0.42, hook: { bass: [0,N_,7,N_, 5,N_,7,N_, 0,N_,7,N_, 9,N_,7,N_], lead: [12,N_,16,N_, 19,N_,16,N_, 14,N_,17,N_, 21,N_,19,N_] }, secs: [[0,0,5,5, 0,0,7,7], [9,9,5,5, 7,7,0,0]], order: [0, 1, 0] },
  0: { bpm: 118, root: 220, wave: 'triangle', sc: 'maj', bass: 'pulse', dens: 0.55, hook: { bass: [0,N_,0,12, 5,N_,5,17, 7,N_,7,19, 5,N_,4,N_], lead: [12,N_,16,19, N_,16,14,N_, 12,N_,9,12, 14,N_,N_,N_] }, secs: [[0,0,5,7, 0,0,9,7], [9,9,5,5, 7,7,0,0], [5,5,0,0, 7,7,0,0]], order: [0, 1, 0, 2, 1, 0] },
  1: { bpm: 112, root: 196, wave: 'square', sc: 'min', bass: 'pulse', dens: 0.55, hook: { bass: [0,N_,7,N_, 0,N_,7,N_, 5,N_,12,N_, 7,N_,2,N_], lead: [12,14,16,N_, 19,N_,16,14, 12,N_,N_,9, 7,N_,9,N_] }, secs: [[0,0,5,5, 0,0,7,7], [3,3,5,5, 7,7,0,0], [8,8,5,5, 7,7,0,0]], order: [0, 1, 0, 2, 1, 0] },
  2: { bpm: 104, root: 329.6, wave: 'sine', sc: 'maj', bass: 'calm', dens: 0.5, hook: { bass: [0,N_,N_,7, N_,N_,5,N_, 0,N_,N_,7, N_,N_,9,N_], lead: [24,N_,19,N_, 21,N_,16,N_, 19,N_,14,N_, 16,N_,12,N_] }, secs: [[0,0,9,9, 5,5,7,7], [5,5,0,0, 9,9,7,7], [7,7,5,5, 0,0,0,0]], order: [0, 1, 0, 2, 1, 0] },
  3: { bpm: 136, root: 174.6, wave: 'square', sc: 'min', bass: 'drive', dens: 0.68, hook: { bass: [0,0,12,0, 0,0,10,0, 0,0,12,0, 7,7,10,12], lead: [N_,N_,15,N_, 17,N_,15,12, N_,N_,10,N_, 12,N_,N_,N_] }, secs: [[0,0,0,3, 5,5,7,7], [8,8,7,7, 5,5,3,3], [0,3,5,7, 0,3,5,7]], order: [0, 1, 0, 2, 1, 0] },
  5: { bpm: 126, root: 293.7, wave: 'triangle', sc: 'maj', bass: 'pulse', dens: 0.62, secs: [[0, 0, 5, 7, 0, 0, 9, 7], [5, 5, 0, 0, 7, 7, 0, 0], [9, 9, 5, 7, 0, 0, 7, 0]], order: [0, 1, 0, 2, 1, 0] },
  6: { bpm: 98, root: 246.9, wave: 'sine', sc: 'maj', bass: 'calm', dens: 0.46, secs: [[0, 0, 9, 9, 5, 5, 7, 7], [5, 5, 0, 0, 9, 9, 7, 7], [7, 7, 5, 5, 0, 0, 0, 0]], order: [0, 1, 0, 2, 1, 0] },
  7: { bpm: 112, root: 220, wave: 'triangle', sc: 'min', bass: 'pulse', dens: 0.55, secs: [[0, 0, 5, 5, 3, 3, 7, 7], [8, 8, 7, 7, 5, 5, 3, 3], [0, 3, 5, 7, 0, 3, 5, 0]], order: [0, 1, 0, 2, 1, 0] },
  4: { bpm: 124, root: 261.6, wave: 'triangle', sc: 'maj', bass: 'pulse', dens: 0.6, bells: true, secs: [[0,0,5,5, 7,7,0,0], [9,9,5,5, 7,7,0,0], [5,5,7,7, 0,0,0,0]], order: [0, 1, 0, 2, 1, 0] },
};
const SCALES = { maj: [0, 2, 4, 7, 9], min: [0, 3, 5, 7, 10] };
const BASS_STYLES = { pulse: [0,N_,0,N_, 7,N_,0,N_, 0,N_,0,N_, 7,N_,12,N_], calm: [0,N_,N_,N_, N_,N_,7,N_, 0,N_,N_,N_, N_,N_,7,N_], drive: [0,0,12,0, 0,0,10,0, 0,0,12,0, 7,7,10,12] };
// singable one-bar rhythms: [start step, length in steps]
const RHYTHMS = [[[0,4],[4,4],[8,2],[10,2],[12,4]], [[0,6],[6,2],[8,4],[12,4]], [[0,2],[2,2],[4,4],[8,4],[12,2],[14,2]], [[0,4],[4,2],[6,2],[8,8]], [[0,8],[8,4],[12,4]], [[0,3],[3,3],[6,2],[8,4],[12,4]]];
const songCache = {};
function buildSong(key) { // -> array of bars {bass, lead, leadDur, arp, c}
  if (songCache[key]) return songCache[key];
  const m = SONGS[key], sc = SCALES[m.sc], bars = [], wk = Number.isNaN(parseInt(key)) ? 99 : parseInt(key);
  const pitch = idx => sc[((idx % 5) + 5) % 5] + 12 * Math.floor(idx / 5);
  const phrase = (R, rh, startIdx, dir) => { let idx = startIdx; return rh.map(([st, d], k) => { if (k > 0) { const up = k < rh.length / 2 ? dir : -dir; idx += R() < 0.75 ? up : (R() < 0.5 ? 0 : 2 * up); idx = clamp(idx, 0, 6); } return { st, d, idx }; }); };
  const secs = {};
  const section = si => { // 8 bars: A, A', A, cadence | B, B', A, final cadence. Repeated verses are identical, like a real song.
    if (secs[si]) return secs[si];
    const R = rng(7919 * (si + 1) + wk * 131), rhA = RHYTHMS[Math.floor(R() * RHYTHMS.length)]; let rhB; do rhB = RHYTHMS[Math.floor(R() * RHYTHMS.length)]; while (rhB === rhA);
    const A = phrase(R, rhA, 2 + Math.floor(R() * 3), 1), B = phrase(R, rhB, 3 + Math.floor(R() * 2), -1), copy = ph => ph.map(n => ({ ...n }));
    const answer = ph => { const c = copy(ph); c[c.length - 1].idx = clamp(c[c.length - 1].idx - 1, 0, 6); return c; };
    const half = ph => { const c = copy(ph); c[c.length - 1].idx = 2; return c; }, end = ph => { const c = copy(ph), l = c[c.length - 1]; l.idx = 0; l.d = 16 - l.st; return c; };
    return secs[si] = [A, answer(A), copy(A), half(A), B, answer(B), copy(A), end(A)];
  };
  m.order.forEach(si => {
    const chords = m.secs[si], ph = section(si);
    for (let bi = 0; bi < 8; bi++) {
      const c = chords[bi], bar = { bass: [], lead: new Array(16).fill(null), leadDur: new Array(16).fill(null), arp: [], c };
      if (m.hook && si === 0 && (bi < 2 || bi === 4 || bi === 5)) { bar.bass = m.hook.bass.slice(); bar.lead = m.hook.lead.slice(); }
      else {
        const bs = BASS_STYLES[m.bass]; for (let i = 0; i < 16; i++) bar.bass.push(bs[i] == null ? null : c + bs[i]);
        const lift = Math.max(...ph[bi].map(n => 12 + pitch(n.idx) + c)) > 28 ? 12 : 0; // keep the melody out of the shrill register
        for (const n of ph[bi]) { bar.lead[n.st] = 12 + pitch(n.idx) + c - lift; bar.leadDur[n.st] = n.d; }
      }
      const tones = m.sc === 'maj' ? [0, 4, 7, 12] : [0, 3, 7, 12]; for (let i = 0; i < 16; i++) bar.arp.push(i % 2 === 0 ? 12 + c + tones[(i / 2) % 4] : null);
      bars.push(bar);
    }
  });
  return songCache[key] = bars;
}
const mus = { key: null, bar: 0, step: 0, next: 0, saved: {} };
function musicLevel() { // how tense the music is: 0 calm, 1 busy, 2 full drums
  if (!G || scene !== 'play') return 0;
  if (G.boss && G.boss.state !== 'flee') return 2;
  if (G.endless) return G.tier >= 4 ? 2 : G.tier >= 2 ? 1 : 0;
  const pr = clamp((G.p.wx - 200) / Math.max(1, G.L.gateX - 200), 0, 1);
  return pr < 0.34 ? 0 : pr < 0.72 ? 1 : 2;
}
function musicTick(key, level = 0) {
  if (!AC || !key || !SONGS[key]) { if (mus.key != null) mus.saved[mus.key] = { bar: mus.bar, step: mus.step }; mus.key = null; return; }
  if (mus.key !== key) { if (mus.key != null) mus.saved[mus.key] = { bar: mus.bar, step: mus.step }; mus.key = key; const sv = mus.saved[key]; mus.bar = sv ? sv.bar : 0; mus.step = sv ? sv.step : 0; mus.next = AC.currentTime + 0.1; }
  if (mus.next < AC.currentTime - 0.05) mus.next = AC.currentTime + 0.05; // after a background pause
  const m = SONGS[key], bars = buildSong(key), st = 60 / m.bpm / 4;
  while (mus.next < AC.currentTime + 0.45) { // scheduling ahead keeps the music steady even when a frame is slow
    const bar = bars[mus.bar % bars.length], i = mus.step, d = mus.next - AC.currentTime, b = bar.bass[i], l = bar.lead[i], ld = bar.leadDur && bar.leadDur[i];
    if (b != null) tone(m.root / 2 * Math.pow(2, b / 12), st * 2.2, 'triangle', 0.055, null, d);
    if (l != null) { const nd = ld ? st * (ld - 0.25) : st * 0.9; tone(m.root * Math.pow(2, l / 12), nd, m.wave, m.wave === 'square' ? 0.02 : 0.034, null, d); if (level >= 2) tone(m.root * 2 * Math.pow(2, l / 12), Math.min(nd, st * 3), 'triangle', 0.012, null, d); }
    if (level >= 1 && bar.arp[i] != null) tone(m.root * 2 * Math.pow(2, bar.arp[i] / 12), st * 0.8, 'triangle', 0.011, null, d);
    if (level >= 1 && i % 4 === 2) noise(0.03, 0.035, 7000, d);                      // hats
    if (level >= 2 && (i === 0 || i === 8)) tone(150, 0.12, 'sine', 0.12, 45, d);    // kick
    if (level >= 2 && (i === 4 || i === 12)) noise(0.09, 0.09, 2600, d);              // snare
    if (m.bells && i % 4 === 0) { noise(0.05, 0.05, 9000, d); tone(3100, 0.08, 'triangle', 0.012, null, d); } // sleigh bells
    mus.next += st; mus.step++; if (mus.step >= 16) { mus.step = 0; mus.bar = (mus.bar + 1) % bars.length; }
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
function ico(kind, cx, cy, s) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s / 30, s / 30); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (kind === 'book') { rr(-13, -14, 26, 28, 3); ctx.fillStyle = '#7b3f1d'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3b1d0a'; ctx.stroke(); ctx.fillStyle = '#ffe9a8'; ctx.fillRect(-10, -11, 20, 22); ctx.fillStyle = '#2e8b57'; ctx.beginPath(); ctx.ellipse(0, -1, 6, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#7b3f1d'; ctx.fillRect(-13, -2, 4, 4); }
  else if (kind === 'amber') drawAmber(0, 0, 13);
  else if (kind === 'loop') { ctx.lineWidth = 5; ctx.strokeStyle = '#1d4a78'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(6, -12, 16, -12, 16, 0); ctx.bezierCurveTo(16, 12, 6, 12, 0, 0); ctx.bezierCurveTo(-6, -12, -16, -12, -16, 0); ctx.bezierCurveTo(-16, 12, -6, 12, 0, 0); ctx.stroke(); }
  else if (kind === 'star') drawStar(0, 1, 15, '#ffd34d');
  else if (kind === 'back') { ctx.lineWidth = 6; ctx.strokeStyle = '#2b1a00'; ctx.beginPath(); ctx.moveTo(8, -11); ctx.lineTo(-7, 0); ctx.lineTo(8, 11); ctx.stroke(); }
  else if (kind === 'lock') { ctx.lineWidth = 4.5; ctx.strokeStyle = '#e8e8e8'; ctx.beginPath(); ctx.arc(0, -5, 7, Math.PI, 0); ctx.stroke(); rr(-10, -4, 20, 16, 3); ctx.fillStyle = '#d8d8d8'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#6a6a6a'; ctx.stroke(); circle(0, 4, 2.4, '#6a6a6a'); }
  else if (kind === 'check') { ctx.lineWidth = 6; ctx.strokeStyle = '#2e7d32'; ctx.beginPath(); ctx.moveTo(-9, 1); ctx.lineTo(-3, 8); ctx.lineTo(10, -8); ctx.stroke(); }
  else if (kind === 'play') { ctx.fillStyle = '#2b1a00'; ctx.beginPath(); ctx.moveTo(-8, -11); ctx.lineTo(11, 0); ctx.lineTo(-8, 11); ctx.fill(); }
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
    riddles: [
      { q: 'Ein Velo und eine Glocke kosten zusammen 110 Franken. Das Velo kostet 100 Franken mehr. Was kostet die Glocke?', a: ['5 Franken', '10 Franken', '1 Franken'], ok: 0, why: 'Glocke 5 + Velo 105 = 110 – und 105 ist genau 100 mehr als 5!' },
      { q: 'Welche Zahl kommt als Nächstes? 1, 2, 4, 7, 11, …', a: ['16', '15', '14'], ok: 0, why: 'Es kommt jedes Mal eins mehr dazu: +1, +2, +3, +4 – und jetzt +5. 11 + 5 = 16!' },
      { q: 'Ein Seerosenblatt verdoppelt sich jeden Tag. Nach 10 Tagen ist der Teich voll. Wann war er halb voll?', a: ['Am 9. Tag', 'Am 5. Tag', 'Am 8. Tag'], ok: 0, why: 'Am 10. Tag verdoppelt es sich noch einmal – also war der Teich am 9. Tag halb voll!' },
      { q: 'Lia hat 3 Schwestern. Jede Schwester hat einen Bruder. Wie viele Kinder sind es insgesamt?', a: ['5', '7', '4'], ok: 0, why: 'Lia und ihre 3 Schwestern sind 4 Mädchen – und alle haben denselben Bruder. Also 5 Kinder!' },
      { q: 'Wie oft kannst du 10 von 100 abziehen?', a: ['Einmal', '10 Mal', '9 Mal'], ok: 0, why: 'Nach dem ersten Mal ziehst du von 90 ab – nicht mehr von 100!' },
      { q: 'Welcher passt nicht dazu: Triceratops, Stegosaurus, Pteranodon?', a: ['Pteranodon', 'Stegosaurus', 'Triceratops'], ok: 0, why: 'Der Pteranodon ist ein Flugsaurier – die anderen beiden sind echte Dinosaurier!' },
      { q: 'Ich bin eine Zahl. Verdoppelst du mich und zählst 4 dazu, kommt 20 heraus. Wer bin ich?', a: ['8', '12', '10'], ok: 0, why: '8 + 8 = 16, und 16 + 4 = 20!' },
      { q: 'Was kommt als Nächstes? M, D, M, D, F, S, …', a: ['S', 'M', 'D'], ok: 0, why: 'Das sind die Wochentage: Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag – und dann Sonntag!' },
      { q: 'Ein Dino-Ei braucht 3 Tage zum Schlüpfen. Wie lange brauchen 3 Eier, die zusammen im Nest liegen?', a: ['3 Tage', '9 Tage', '6 Tage'], ok: 0, why: 'Alle drei Eier brüten gleichzeitig – also schlüpfen sie alle nach 3 Tagen!' },
      { q: 'Wenn gestern Sonntag war: Welcher Tag ist übermorgen?', a: ['Mittwoch', 'Dienstag', 'Donnerstag'], ok: 0, why: 'Gestern Sonntag, heute Montag, morgen Dienstag – übermorgen Mittwoch!' },
    ],
    sky: ['#0f3b3a', '#8cc49b'], far: '#2f6a50', mid: '#1f4a38', ground: '#4a3020', top: '#3f9b3a', dots: '#3a2416', edge: '#2e1d12', plat: '#6b4a2b', platTop: '#4caf50',
    rock: '#7b6b5a', deco: '#173d2c', volcS: 0.45, volcCol: '#35544a', egg: '#f6e7b0', eggSpot: '#6aa84f' },
  { name: 'Canyon', speed: 295, segs: 30, patterns: ['rock', 'rock2', 'pit', 'pit', 'raptor', 'ptero', 'swoop', 'boulder', 'plat', 'amber', 'low', 'low', 'pitRock', 'lowRock', 'wall'],
    startTip: 'Der heisse Canyon! Neue Fähigkeit: Halte DUCKEN gedrückt – so kommst du unter tiefen Felsen und Flugsauriern durch.',
    riddles: [
      { q: 'Ein Flugsaurier fliegt 3 km nach Norden, dann 3 km nach Osten und dann 3 km nach Süden. Wie weit ist er vom Start weg?', a: ['3 km', '0 km', '9 km'], ok: 0, why: 'Norden und Süden heben sich auf – übrig bleiben die 3 km nach Osten!' },
      { q: 'Bei einem Rennen überholst du den Letzten. Auf welchem Platz bist du jetzt?', a: ['Das geht gar nicht!', 'Vorletzter', 'Letzter'], ok: 0, why: 'Hinter dem Letzten ist niemand – du kannst ihn gar nicht überholen!' },
      { q: 'Ein Elektrozug fährt nach Süden, der Wind weht nach Norden. In welche Richtung zieht der Rauch?', a: ['Es gibt keinen Rauch', 'Nach Norden', 'Nach Süden'], ok: 0, why: 'Ein Elektrozug macht gar keinen Rauch!' },
      { q: 'Welche Zahl kommt als Nächstes? 3, 6, 12, 24, …', a: ['48', '36', '30'], ok: 0, why: 'Jedes Mal wird verdoppelt: 24 + 24 = 48!' },
      { q: 'Eine Schnecke klettert eine 5 m hohe Wand hoch: tagsüber 3 m rauf, nachts 2 m runter. Wann ist sie oben?', a: ['Am 3. Tag', 'Am 5. Tag', 'Am 4. Tag'], ok: 0, why: 'Nach 2 Tagen und 2 Nächten ist sie auf 2 m. Am 3. Tag klettert sie 3 m – und ist oben!' },
      { q: 'Wie viele Monate haben 31 Tage?', a: ['7', '6', '5'], ok: 0, why: 'Januar, März, Mai, Juli, August, Oktober und Dezember – das sind 7!' },
      { q: 'Der Vater von Tim hat 4 Söhne. Drei heissen Nord, Süd und Ost. Wie heisst der vierte?', a: ['Tim', 'West', 'Mitte'], ok: 0, why: 'Es ist doch der Vater von Tim – der vierte Sohn heisst Tim!' },
      { q: 'Wie viele Minuten sind eine Viertelstunde plus eine halbe Stunde?', a: ['45', '40', '35'], ok: 0, why: '15 + 30 = 45 Minuten!' },
      { q: 'Welcher dieser Dinos hat am spätesten gelebt?', a: ['T-Rex', 'Stegosaurus', 'Brachiosaurus'], ok: 0, why: 'Der T-Rex lebte ganz am Ende der Dinozeit. Stegosaurus und Brachiosaurus lebten viele Millionen Jahre früher!' },
      { q: 'Was ist die Hälfte von doppelt so viel wie 7?', a: ['7', '14', '3,5'], ok: 0, why: 'Doppelt so viel wie 7 ist 14 – und die Hälfte davon ist wieder 7!' },
    ],
    sky: ['#d9702e', '#f7d08a'], far: '#c0643a', mid: '#9a4a2a', ground: '#b5603a', top: '#d98b4e', dots: '#8e4526', edge: '#6e2f17', plat: '#8b4a2b', platTop: '#e0a060',
    rock: '#8d5a3b', deco: '#7a3a1e', volcS: 0.65, volcCol: '#9c5a3c', mesa: true, egg: '#cfe8ff', eggSpot: '#e07b39' },
  { name: 'Eiszeit', speed: 315, segs: 34, patterns: ['rock', 'rock2', 'pit', 'icicle', 'icicle', 'raptor', 'ptero', 'boulder', 'plat', 'amber', 'low', 'compy', 'compy', 'geode', 'pitRock', 'lowRock', 'compyRun'],
    startTip: 'Brrr, die Eiszeit! Neue Fähigkeit: Spring hoch und drück STAMPF – das knackt Bernstein-Steine und plättet Kompsis!',
    riddles: [
      { q: 'Das Thermometer zeigt −3 Grad. Dann wird es 8 Grad wärmer. Wie warm ist es jetzt?', a: ['5 Grad', '11 Grad', '−11 Grad'], ok: 0, why: 'Von −3 sind es 3 Grad bis 0 – und dann noch 5 weiter: 5 Grad!' },
      { q: 'In einer Kiste liegen rote und blaue Socken. Wie viele musst du blind herausnehmen, damit sicher 2 gleiche dabei sind?', a: ['3', '2', '4'], ok: 0, why: 'Es gibt nur 2 Farben – bei 3 Socken sind darum sicher 2 gleich!' },
      { q: '8 Pinguine stehen in einer Reihe, zwischen je zwei ist 1 Meter Platz. Wie lang sind alle Lücken zusammen?', a: ['7 Meter', '8 Meter', '9 Meter'], ok: 0, why: 'Zwischen 8 Pinguinen gibt es nur 7 Lücken!' },
      { q: 'Ein Mammut ist doppelt so schwer wie ein Nashorn. Zusammen wiegen sie 9 Tonnen. Wie schwer ist das Mammut?', a: ['6 Tonnen', '4,5 Tonnen', '3 Tonnen'], ok: 0, why: 'Nashorn 3 Tonnen + Mammut 6 Tonnen = 9 Tonnen!' },
      { q: '4 Raptoren fangen in 4 Minuten 4 Käfer. Wie lange brauchen 8 Raptoren für 8 Käfer?', a: ['4 Minuten', '8 Minuten', '2 Minuten'], ok: 0, why: 'Jeder Raptor braucht 4 Minuten für seinen Käfer – egal wie viele mitmachen!' },
      { q: 'Welche Zahl kommt als Nächstes? 1, 1, 2, 3, 5, 8, …', a: ['13', '11', '10'], ok: 0, why: 'Jede Zahl ist die Summe der zwei davor: 5 + 8 = 13!' },
      { q: 'Ein Schneemann schmilzt jeden Tag auf die Hälfte. Am 4. Tag ist er 10 cm hoch. Wie hoch war er am 1. Tag?', a: ['80 cm', '40 cm', '160 cm'], ok: 0, why: 'Rückwärts verdoppeln: 10 → 20 → 40 → 80 cm!' },
      { q: 'Was ist schwerer: 1 Liter Wasser oder 1 Liter Eis?', a: ['1 Liter Wasser', '1 Liter Eis', 'Beide gleich'], ok: 0, why: 'Eis ist leichter als Wasser – darum schwimmen Eisberge oben!' },
      { q: 'Es ist 10 Uhr. Wie spät ist es in 100 Minuten?', a: ['11:40 Uhr', '11:00 Uhr', '12:00 Uhr'], ok: 0, why: '100 Minuten sind 1 Stunde und 40 Minuten: 11:40 Uhr!' },
      { q: 'Ein Eisbär steht genau auf dem Nordpol. In welche Richtung schaut er, egal wie er sich dreht?', a: ['Nach Süden', 'Nach Norden', 'Nach Osten'], ok: 0, why: 'Vom Nordpol aus geht jede Richtung nach Süden!' },
    ],
    sky: ['#0b1f3f', '#5d86b8'], far: '#c9dcf0', mid: '#8fb0d6', ground: '#5f7591', top: '#f4f8ff', dots: '#4b5f7a', edge: '#3c4f68', plat: '#9fc3e6', platTop: '#ffffff',
    rock: '#7f93ab', deco: '#1d3b4f', volcS: 0.85, volcCol: '#3a4f6e', stars: true, snow: true, egg: '#e8f4ff', eggSpot: '#5aa0e0' },
  { name: 'Vulkan', speed: 335, segs: 36, patterns: ['pit', 'pit', 'geyser', 'geyser', 'raptor', 'ptero', 'swoop', 'boulder', 'rock2', 'plat', 'low', 'compy', 'compy', 'geode', 'pitRock', 'lowRock', 'compyRun'],
    startTip: 'Der Vulkan! Neu: Feuer-Chilis! Damit kann {rex} Feuer spucken. Und irgendwo hier ist das goldene Ei…',
    riddles: [
      { q: 'Ben ist grösser als Ana. Ana ist kleiner als Max, aber grösser als Lou. Wer ist am kleinsten?', a: ['Lou', 'Ana', 'Max'], ok: 0, why: 'Ben und Max sind grösser als Ana, und Ana ist grösser als Lou – also ist Lou am kleinsten!' },
      { q: 'Vulkan A bricht alle 12 Jahre aus, Vulkan B alle 8 Jahre. Heute beide. In wie vielen Jahren wieder beide?', a: ['24 Jahre', '20 Jahre', '96 Jahre'], ok: 0, why: '24 kommt in beiden Reihen zuerst vor: 12, 24 … und 8, 16, 24!' },
      { q: 'Ich bin eine dreistellige Zahl. Alle meine Ziffern sind gleich und zusammen ergeben sie 3. Wer bin ich?', a: ['111', '300', '333'], ok: 0, why: '1 + 1 + 1 = 3 – und alle Ziffern sind gleich!' },
      { q: 'Welcher Dino hat NICHT zur gleichen Zeit gelebt wie der T-Rex?', a: ['Stegosaurus', 'Triceratops', 'Ankylosaurus'], ok: 0, why: 'Der Stegosaurus lebte viel früher. Zwischen ihm und dem T-Rex liegt mehr Zeit als zwischen dem T-Rex und uns!' },
      { q: 'Was kommt einmal in jeder Minute vor, zweimal in jedem Moment, aber nie in tausend Jahren?', a: ['Der Buchstabe M', 'Ein Meteorit', 'Ein Vulkanausbruch'], ok: 0, why: '„Minute“ hat ein M, „Moment“ hat zwei M – und in „tausend Jahren“ ist gar kein M!' },
      { q: 'Welches dieser Tiere ist am nächsten mit dem T-Rex verwandt?', a: ['Huhn', 'Krokodil', 'Eidechse'], ok: 0, why: 'Überraschung: Vögel stammen von den Dinos ab – das Huhn ist näher verwandt als Krokodil und Eidechse!' },
      { q: 'Ein voller Krug Lava wiegt 10 kg, halb voll wiegt er 6 kg. Wie schwer ist der leere Krug?', a: ['2 kg', '5 kg', '4 kg'], ok: 0, why: 'Die halbe Lava wiegt 10 − 6 = 4 kg, also die ganze 8 kg. Für den Krug bleiben 2 kg!' },
      { q: 'Welche Zahl kommt als Nächstes? 2, 3, 5, 7, 11, …', a: ['13', '15', '12'], ok: 0, why: 'Das sind Primzahlen – man kann sie nur durch 1 und sich selbst teilen. Die nächste ist 13!' },
      { q: 'Ein Brett ist 2 Meter lang. Du sägst es in Stücke von 50 cm. Wie oft musst du sägen?', a: ['3 Mal', '4 Mal', '2 Mal'], ok: 0, why: 'Es gibt 4 Stücke – dafür brauchst du nur 3 Schnitte!' },
      { q: 'Ein T-Rex-Zahn wächst jeden Monat 1 cm. Ein neuer ist 3 cm lang. Wie lang ist er in einem halben Jahr?', a: ['9 cm', '6 cm', '4 cm'], ok: 0, why: 'Ein halbes Jahr sind 6 Monate: 3 cm + 6 cm = 9 cm!' },
    ],
    sky: ['#1a0505', '#8a2a10'], far: '#3a0f0a', mid: '#250807', ground: '#2a1a16', top: '#4a2a20', dots: '#ff5a1f', edge: '#170c0a', plat: '#3a2722', platTop: '#ff7a2a',
    rock: '#4a3a36', deco: '#140404', volcS: 1.25, volcCol: '#1c0807', lava: true, egg: '#ffd9c2', eggSpot: '#c0392b' },
  { name: 'Weihnacht', art: 2, bonus: true, speed: 345, segs: 36, patterns: ['rock', 'rock2', 'pit', 'icicle', 'icicle', 'raptor', 'ptero', 'swoop', 'boulder', 'plat', 'amber', 'low', 'compy', 'geode', 'pitRock', 'lowRock', 'compyRun'],
    startTip: 'Bonus-Welt: die Weihnachtsnacht! Alles, was du gelernt hast, hilft dir hier. Findest du alle 3 Eier und die Feuer-Chilis?',
    riddles: [
      { q: 'Der Weihnachtsmann hat 24 Geschenke. Er gibt jedem Kind 3. Wie viele Kinder bekommen etwas?', a: ['8', '6', '12'], ok: 0, why: '24 geteilt durch 3 ist 8 – also 8 Kinder!' },
      { q: 'Welche Zahl kommt als Nächstes? 2, 4, 8, 16, …', a: ['32', '24', '20'], ok: 0, why: 'Jedes Mal wird verdoppelt: 16 + 16 = 32!' },
      { q: 'Am Baum hängen 3 rote Kugeln für jede goldene. Es sind 4 goldene. Wie viele Kugeln sind es zusammen?', a: ['16', '12', '7'], ok: 0, why: '4 goldene und 3 mal 4 = 12 rote – zusammen 16 Kugeln!' },
      { q: 'Am Adventskranz brennen 3 Kerzen. Du bläst eine aus. Wie viele Kerzen hast du noch?', a: ['3', '2', '1'], ok: 0, why: 'Eine ist nur ausgeblasen – alle 3 Kerzen sind noch da!' },
      { q: 'Welche Zahl kommt als Nächstes? 25, 24, 22, 19, …', a: ['15', '16', '17'], ok: 0, why: 'Es wird jedes Mal ein bisschen mehr abgezogen: −1, −2, −3 – und jetzt −4. 19 − 4 = 15!' },
      { q: 'Was ist schwerer: 1 kg Schnee oder 1 kg Lebkuchen?', a: ['Beide gleich schwer', 'Der Lebkuchen', 'Der Schnee'], ok: 0, why: '1 Kilogramm ist immer 1 Kilogramm – egal, woraus es besteht!' },
      { q: 'Chili isst jeden Tag doppelt so viele Karotten wie am Tag davor. Am 1. Tag eine. Wie viele am 5. Tag?', a: ['16', '10', '8'], ok: 0, why: '1, 2, 4, 8, 16 – am 5. Tag sind es 16 Karotten!' },
      { q: 'Ein Geschenk kostet 20 Franken. Es ist halb so teuer wie ein Schlitten. Was kosten beide zusammen?', a: ['60 Franken', '40 Franken', '30 Franken'], ok: 0, why: 'Der Schlitten kostet 40 Franken. 20 + 40 = 60 Franken!' },
      { q: 'Heute ist der 20. Dezember. Wie viele Tage sind es bis zum 24.?', a: ['4', '5', '3'], ok: 0, why: '24 − 20 = 4 Tage!' },
      { q: 'Ich habe Städte, aber keine Häuser. Berge, aber keine Bäume. Wasser, aber keine Fische. Was bin ich?', a: ['Eine Landkarte', 'Ein Traum', 'Ein Bild'], ok: 0, why: 'Auf einer Landkarte sind Städte, Berge und Seen nur eingezeichnet!' },
    ],
    sky: ['#050b24', '#1c3a6e'], far: '#9fb8dc', mid: '#6b8ab4', ground: '#4f6585', top: '#f4f8ff', dots: '#3c4f6a', edge: '#2c3c54', plat: '#8fb3d8', platTop: '#ffffff',
    rock: '#7088a2', deco: '#14303f', volcS: 0.85, volcCol: '#2c3f5e', stars: true, snow: true, egg: '#ffe9c2', eggSpot: '#d63a3a' },
];

function ART(wi) { return WORLDS[wi].art != null ? WORLDS[wi].art : wi; }

WORLDS.push(
  { name: 'Strand', art: 5, speed: 285, segs: 52, patterns: ['rock', 'rock2', 'pit', 'amber', 'raptor', 'plat', 'boulder', 'compy', 'wall', 'wall', 'tide', 'tide'],
    startTip: 'Ein Strand! Neue Fähigkeit: FLITZ! Damit rennst du durch Sandmauern und Wellen.',
    riddles: [
      { q: 'Am Strand liegen 12 Muscheln. Du sammelst 5 und lässt 2 wieder fallen. Wie viele hast du in der Hand?', a: ['3', '7', '10'], ok: 0, why: '5 gesammelt, 2 verloren: 5 − 2 = 3 Muscheln!' },
      { q: 'Welche Zahl kommt als Nächstes? 3, 6, 9, 12, …', a: ['15', '14', '18'], ok: 0, why: 'Jedes Mal kommt 3 dazu: 12 + 3 = 15!' },
      { q: 'Eine Krabbe hat 10 Beine. Wie viele Beine haben 3 Krabben zusammen?', a: ['30', '13', '20'], ok: 0, why: '3 mal 10 = 30 Beine!' },
      { q: 'Was wird nasser, je mehr es dich trocknet?', a: ['Ein Handtuch', 'Ein Schwamm', 'Die Sonne'], ok: 0, why: 'Ein Handtuch wird nasser, je mehr es dich trocknet!' },
      { q: 'Wenn 2 Möwen in 2 Minuten 2 Fische fangen: Wie lange brauchen 4 Möwen für 4 Fische?', a: ['2 Minuten', '4 Minuten', '1 Minute'], ok: 0, why: 'Jede Möwe fängt in 2 Minuten einen Fisch – alle zusammen brauchen wieder 2 Minuten!' },
      { q: 'Welcher Monat hat 28 Tage?', a: ['Alle Monate', 'Nur der Februar', 'Keiner'], ok: 0, why: 'Jeder Monat hat mindestens 28 Tage!' },
      { q: 'Ich habe ein Gesicht und zwei Hände, aber keine Arme und Beine. Was bin ich?', a: ['Eine Uhr', 'Ein Seestern', 'Ein Strandball'], ok: 0, why: 'Eine Uhr hat ein Zifferblatt (Gesicht) und zwei Zeiger (Hände)!' },
      { q: 'Du hast 5 Eis und isst alle bis auf 2. Wie viele hast du gegessen?', a: ['3', '2', '5'], ok: 0, why: 'Alle bis auf 2: 5 − 2 = 3 gegessen!' },
      { q: 'Welche Zahl kommt als Nächstes? 1, 4, 9, 16, …', a: ['25', '20', '24'], ok: 0, why: 'Das sind 1×1, 2×2, 3×3, 4×4 – als Nächstes 5×5 = 25!' },
      { q: 'Ein Schwimmbrett kostet 12 Franken, ein Ball die Hälfte. Was kosten beide zusammen?', a: ['18 Franken', '24 Franken', '6 Franken'], ok: 0, why: 'Der Ball kostet 6 Franken. 12 + 6 = 18!' },
    ],
    sky: ['#4fb6e8', '#bfe9ff'], far: '#7fd0e0', mid: '#e8d29a', ground: '#e8c985', top: '#f3dca0', dots: '#c9a95e', edge: '#a8883e', plat: '#b98a54', platTop: '#f3dca0', rock: '#b8a47a', deco: '#2f7d4a', volcS: 0.3, volcCol: '#6a8aa8', egg: '#fff0c8', eggSpot: '#ff7a5a' },
  { name: 'Unterwasser', art: 6, swim: true, speed: 270, segs: 52, patterns: ['coralgate', 'coralgate', 'jellies', 'jellies', 'urchins', 'sword', 'bubbles', 'rockwall'],
    startTip: 'Unter Wasser! Tippe, um nach oben zu schwimmen. DUCKEN taucht schneller ab.',
    riddles: [
      { q: 'Ein Wal taucht 20 m tief und kommt 8 m wieder hoch. Wie tief ist er jetzt?', a: ['12 m', '28 m', '8 m'], ok: 0, why: '20 − 8 = 12 Meter tief!' },
      { q: 'Ein Fisch schwimmt 3 Runden im Teich. Jede Runde dauert 4 Minuten. Wie lange insgesamt?', a: ['12 Minuten', '7 Minuten', '10 Minuten'], ok: 0, why: '3 mal 4 = 12 Minuten!' },
      { q: 'Welche Zahl kommt als Nächstes? 100, 90, 80, 70, …', a: ['60', '50', '65'], ok: 0, why: 'Jedes Mal minus 10: 70 − 10 = 60!' },
      { q: 'Ein Oktopus hat 8 Arme, ein Seestern 5. Wie viele Arme haben 2 Oktopusse und 1 Seestern?', a: ['21', '16', '13'], ok: 0, why: '8 + 8 + 5 = 21 Arme!' },
      { q: 'Je mehr man davon wegnimmt, desto grösser wird es. Was ist das?', a: ['Ein Loch', 'Ein Haufen', 'Ein Berg'], ok: 0, why: 'Ein Loch wird grösser, wenn man etwas wegnimmt!' },
      { q: 'Wie viele Beine haben 3 Delfine und 2 Krabben (jede Krabbe hat 10 Beine)?', a: ['20', '26', '30'], ok: 0, why: 'Delfine haben keine Beine – nur die Krabben: 2 mal 10 = 20!' },
      { q: 'Der Wasserstand steigt jeden Tag um 2 cm. Nach 5 Tagen ist er 14 cm hoch. Wie hoch war er am Anfang?', a: ['4 cm', '10 cm', '14 cm'], ok: 0, why: '5 mal 2 = 10 cm dazu. 14 − 10 = 4 cm am Anfang!' },
      { q: 'In einem Aquarium sind 6 Fische. Alle bis auf 4 sind blau. Wie viele sind blau?', a: ['2', '4', '6'], ok: 0, why: 'Alle bis auf 4 sind blau – also sind 6 − 4 = 2 blau!' },
      { q: 'Welche Zahl kommt als Nächstes? 2, 3, 5, 8, 12, …', a: ['17', '16', '15'], ok: 0, why: 'Es kommt +1, +2, +3, +4 dazu – jetzt +5: 12 + 5 = 17!' },
      { q: 'Eine Schildkröte läuft 1 Meter pro Minute. Wie lange braucht sie für 1000 Meter?', a: ['1000 Minuten', '100 Minuten', '10 Minuten'], ok: 0, why: '1000 Meter mit 1 Meter pro Minute: 1000 Minuten!' },
    ],
    sky: ['#0a4a7a', '#2fb0c8'], far: '#2a7a9a', mid: '#1d6a8a', ground: '#d8c48a', top: '#e8d8a0', dots: '#b8a468', edge: '#8a7a48', plat: '#2f9a8a', platTop: '#7fe0c8', rock: '#5a7a8a', deco: '#1a5a6a', volcS: 0.3, volcCol: '#1d4a6a', egg: '#d8f4ff', eggSpot: '#ff8a6a' },
  { name: 'Berge', art: 7, speed: 300, segs: 52, patterns: ['rock', 'rock2', 'widegap', 'widegap', 'updraft', 'raptor', 'ptero', 'boulder', 'plat', 'amber', 'avalanche', 'compy'],
    startTip: 'Hoch in den Bergen! Neue Fähigkeit: GLEITEN. Halte die Taste in der Luft gedrückt und schwebe über die Schluchten.',
    riddles: [
      { q: 'Ein Steinbock klettert 40 m hoch und rutscht dann 10 m ab. Wie hoch ist er?', a: ['30 m', '50 m', '40 m'], ok: 0, why: '40 − 10 = 30 Meter hoch!' },
      { q: 'Welche Zahl kommt als Nächstes? 5, 10, 20, 40, …', a: ['80', '60', '50'], ok: 0, why: 'Jedes Mal wird verdoppelt: 40 + 40 = 80!' },
      { q: 'Ein Berg ist 3000 m hoch, ein anderer 500 m höher. Wie hoch ist der zweite?', a: ['3500 m', '3050 m', '2500 m'], ok: 0, why: '3000 + 500 = 3500 Meter!' },
      { q: 'Er hat einen Fuss, aber keine Schuhe, und einen Gipfel, aber keinen Kopf. Was ist es?', a: ['Ein Berg', 'Ein Baum', 'Ein Turm'], ok: 0, why: 'Ein Berg hat einen Fuss (ganz unten) und einen Gipfel!' },
      { q: 'Auf dem Gipfel sind es −6 Grad, unten im Tal +4 Grad. Wie gross ist der Unterschied?', a: ['10 Grad', '2 Grad', '24 Grad'], ok: 0, why: 'Von −6 bis 0 sind es 6 Grad, dann noch 4: zusammen 10 Grad!' },
      { q: 'Ein Wanderweg ist 12 km lang. Du bist die Hälfte gelaufen und dann noch 2 km. Wie viele km sind es noch?', a: ['4 km', '6 km', '2 km'], ok: 0, why: 'Die Hälfte sind 6 km, dazu 2 km = 8 km gelaufen. 12 − 8 = 4 km!' },
      { q: 'Ein Adler fliegt 15 km in 3 Stunden. Wie weit fliegt er in einer Stunde (gleich schnell)?', a: ['5 km', '45 km', '3 km'], ok: 0, why: '15 geteilt durch 3 = 5 Kilometer pro Stunde!' },
      { q: 'Die Seilbahn fährt alle 20 Minuten. Um 10:15 Uhr ist sie gefahren. Wann fährt sie wieder?', a: ['10:35 Uhr', '10:20 Uhr', '10:40 Uhr'], ok: 0, why: '10:15 plus 20 Minuten ist 10:35 Uhr!' },
      { q: 'Welche Zahl kommt als Nächstes? 1, 2, 4, 7, 11, 16, …', a: ['22', '21', '20'], ok: 0, why: 'Es kommt +1, +2, +3, +4, +5 dazu – jetzt +6: 16 + 6 = 22!' },
      { q: 'Ein Bergsteiger braucht für 100 Höhenmeter 10 Minuten. Wie lange für 300 Höhenmeter?', a: ['30 Minuten', '13 Minuten', '100 Minuten'], ok: 0, why: '300 sind 3 mal 100 – also 3 mal 10 = 30 Minuten!' },
    ],
    sky: ['#3a6fb0', '#c9e0f5'], far: '#9db8d6', mid: '#6f8fb0', ground: '#7a7f88', top: '#9bb07a', dots: '#5a5f68', edge: '#40444c', plat: '#8a8f98', platTop: '#b8d09a', rock: '#7a8088', deco: '#2a5a3a', volcS: 0.5, volcCol: '#6f86a8', egg: '#eaf4ff', eggSpot: '#7a9ad6' },
);

const FACTS_OLD = [
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
  { name: 'Nadelbäume', text: 'Schon zur Dinozeit gab es Nadelbäume – dein Weihnachtsbaum hat also uralte Verwandte, die Dinos gesehen haben!' },
  { name: 'Polar-Dinos', text: 'Sogar in der Nähe vom Südpol lebten Dinosaurier. Dort wurde es im Winter wochenlang dunkel und kalt!' },
  { name: 'Federkleid', text: 'Viele Dinosaurier hatten Federn. Vielleicht hielten sie damit warm – wie eine kuschelige Winterjacke!' },
];

const FACTS_NEW = [
  { name: 'Ammonit', text: 'Ammoniten waren Verwandte der Tintenfische mit einem Haus in Spiralform. Ihre Muscheln findet man heute noch versteinert!' },
  { name: 'Archelon', text: 'Der Archelon war die grösste Meeresschildkröte aller Zeiten – so lang wie ein kleines Auto!' },
  { name: 'Fussspuren', text: 'Dinosaurier haben Fussspuren hinterlassen. Im Stein kann man sie heute noch finden – sogar in der Schweiz!' },
  { name: 'Ichthyosaurus', text: 'Der Ichthyosaurus sah aus wie ein Delfin, war aber ein Meeresreptil. Er konnte richtig schnell schwimmen!' },
  { name: 'Mosasaurus', text: 'Der Mosasaurus war ein riesiges Meeresreptil – bis zu 12 Meter lang. Er war mit Echsen und Schlangen verwandt.' },
  { name: 'Plesiosaurus', text: 'Der Plesiosaurus hatte einen langen Hals und vier Flossen. Er paddelte wie eine Schildkröte durchs Meer.' },
  { name: 'Quetzalcoatlus', text: 'Der Quetzalcoatlus war einer der grössten Flugsaurier – seine Flügel waren so breit wie ein kleines Flugzeug!' },
  { name: 'Archaeopteryx', text: 'Der Archaeopteryx war ein Urvogel mit Federn und Zähnen. Er war etwa so gross wie eine Elster.' },
  { name: 'Therizinosaurus', text: 'Der Therizinosaurus hatte die längsten Krallen aller Tiere – so lang wie ein Unterarm! Er frass aber nur Pflanzen.' },
];
// one card per level (24 days). Order follows the calendar: jungle, beach, canyon, underwater, ice age, mountains, volcano, Christmas.
const FACTS = [...FACTS_OLD.slice(0, 3), ...FACTS_NEW.slice(0, 3), ...FACTS_OLD.slice(3, 6), ...FACTS_NEW.slice(3, 6), ...FACTS_OLD.slice(6, 9), ...FACTS_NEW.slice(6, 9), ...FACTS_OLD.slice(9, 12), ...FACTS_OLD.slice(12, 15)];
const TREASURES = [
  { name: 'Goettis Gitarre', line: 'Meine Gitarre! Danke, Oli! Tipp sie in der Schatzkiste an – dann spiele ich dir was vor.', tap: 'Goetti spielt ein Lied!' },
  { name: 'Goettis Velo', line: 'Mein Velo! Das hat der Vulkan bis in den Canyon geschleudert. Damit machen wir zwei mal eine grosse Tour!', tap: 'Kling, kling!' },
  { name: 'Goettis Angel', line: 'Meine Angelrute! Weisst du was? Im Winter kann man sogar durch ein Loch im Eis fischen. Das machen wir mal zusammen!', tap: 'Platsch! Ein Fisch!' },
  { name: 'Kiwi', line: 'Kiwi! Mein kleiner Freund ist wieder da! Kiwis sind das Wahrzeichen von Neuseeland und können nicht fliegen – darum läuft Kiwi ab jetzt mit dir mit.', tap: 'Kiwi! Kiwi!' },
];
// =====================================================================
// Advent calendar: 24 levels, a new one opens every day from 1 December
// =====================================================================
const ADVENT_START = new Date(2026, 11, 1);
function adventDay() { // how many doors are open today (0 before 1 Dec, 24 from 24 Dec on)
  if (save.dayOverride != null) return clamp(save.dayOverride, 0, 24);
  let q = null; try { q = new URLSearchParams(location.search).get('day'); } catch (e) {}
  if (q != null && q !== '') return clamp(parseInt(q) || 0, 0, 24);
  const n = new Date(); return clamp(Math.floor((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - ADVENT_START) / 86400000) + 1, 0, 24);
}
const LEVEL_THEMES = [0, 0, 0, 5, 5, 5, 1, 1, 1, 6, 6, 6, 2, 2, 2, 7, 7, 7, 3, 3, 3, 4, 4, 4];
const LEVEL_TITLES = ['Erste Schritte', 'Hoch hinaus', 'Brüll-Training', 'Sandburgen-Rennen', 'Krabbenstrand', 'Der Krabbenkönig', 'Heisse Schlucht', 'Duck dich!', 'Raptor-Rudel', 'Tauchgang', 'Korallenlabyrinth', 'Das Seeungeheuer', 'Eiskalte Ebene', 'Stampf-Meister', 'Mammut-Pfad', 'Gipfelweg', 'Wolkensprung', 'Die Adlerkönigin', 'Vulkan-Aufstieg', 'Lavafluss', 'Feuer-Chili', 'Verschneite Nacht', 'Sternenwald', 'Der Krallenkönig'];
const BOSS_DAYS = { 6: 'crab', 12: 'kraken', 18: 'queen', 24: 'king' };
const TREASURE_DAY = { 3: 0, 9: 1, 15: 2, 21: 3 }; // Goetti's guitar, bike, rod and Kiwi
const LEVELS = LEVEL_THEMES.map((wi, li) => { const sub = li % 3, day = li + 1, boss = BOSS_DAYS[day] || null; return { li, day, wi, sub, title: LEVEL_TITLES[li], boss, treasure: TREASURE_DAY[day] != null ? TREASURE_DAY[day] : -1, segs: Math.round(46 + li * 0.9 - (boss ? 14 : 0)), speedMul: [0.93, 1, 1.06][sub], maxTier: [1, 2, 3][sub] }; });
// skills arrive with the calendar: dash on day 4, duck on 7, swim on 10, stomp on 13, glide on 16, fire on 19
const SKILL_DAYS = { dash: 4, duck: 7, swim: 10, stomp: 13, glide: 16, fire: 19 };
function skillsFor(li, wi) { const d = li == null ? 99 : li + 1; return { duck: d >= SKILL_DAYS.duck, stomp: d >= SKILL_DAYS.stomp, dash: d >= SKILL_DAYS.dash, glide: d >= SKILL_DAYS.glide, fire: d >= SKILL_DAYS.fire, swim: wi === 6 }; }
const THEME_LEARN = { 0: 'jump', 5: 'dash', 1: 'duck', 6: 'swim', 2: 'stomp', 7: 'glide', 3: 'fire' };
function giftFor(day) { // the cosmetic (or amber) hidden behind a door
  for (const [key, list] of [['skin', SKINS], ['hat', HATS], ['fire', FIRES]]) { const i = list.findIndex(it => it.gift === day); if (i >= 0) return { key, i, name: list[i].n }; }
  const a = { 5: 100, 11: 100, 21: 150 }[day]; return a ? { key: 'amber', n: a, name: a + ' Bernstein' } : null;
}
function openDoorGift(day) { // first opening of a door: add the gift to the player's collection
  if (save.gifts.includes(day)) return null; const g = giftFor(day); if (!g) return null;
  save.gifts.push(day); if (g.key === 'amber') save.amber += g.n; else if (!save.owned[g.key].includes(g.i)) save.owned[g.key].push(g.i); writeSave(); return g;
}
function hslHex(h, sat, l) { l /= 100; const a = sat / 100 * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12, c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(255 * c).toString(16).padStart(2, '0'); }; return `#${f(0)}${f(8)}${f(4)}`; }

const MEDALS = [['Eier-Profi', 'Alle 3 Eier'], ['Ohne Kratzer', 'Kein Treffer'], ['Bernstein-Sammler', '80% Bernstein']];
const SKINS = [
  { n: 'Grün', cost: 0 },
  { n: 'Blau', cost: 120, body: '#3f7fd0', dark: '#2a5aa0', belly: '#cfe6ff' },
  { n: 'Pink', cost: 250, body: '#e06aa8', dark: '#b04580', belly: '#ffd9ec' },
  { n: 'Gold', cost: 600, body: '#e0b030', dark: '#a67c10', belly: '#fff0b0' },
  { n: 'Rot', gift: 1, body: '#d8483a', dark: '#a02a20', belly: '#ffe0b0' },
  { n: 'Türkis', gift: 7, body: '#27b5b0', dark: '#16807c', belly: '#e0fff8' },
  { n: 'Lila', gift: 12, body: '#8a56d6', dark: '#5e34a0', belly: '#f0e0ff' },
  { n: 'Mint', gift: 17, body: '#7fd6a6', dark: '#4aa070', belly: '#f4ffe8' },
  { n: 'Nacht', gift: 20, body: '#2f3b6e', dark: '#1a2248', belly: '#9aa8e8' },
  { n: 'Regenbogen', gift: 23, rainbow: true, body: '#e84a6f', dark: '#8a2a4a', belly: '#fff0f8' },
];
const HATS = [{ n: 'Auto', cost: 0 }, { n: 'Mütze', cost: 150, k: 'santa' }, { n: 'Cowboy', cost: 300, k: 'cowboy' }, { n: 'Krone', cost: 700, k: 'crown' },
  { n: 'Strohhut', gift: 2, k: 'straw' }, { n: 'Pirat', gift: 4, k: 'pirate' }, { n: 'Taucherbrille', gift: 6, k: 'goggles' }, { n: 'Kochmütze', gift: 8, k: 'chef' }, { n: 'Zylinder', gift: 10, k: 'tophat' },
  { n: 'Bergmütze', gift: 13, k: 'beanie' }, { n: 'Zauberhut', gift: 14, k: 'wizard' }, { n: 'Propeller', gift: 16, k: 'propeller' }, { n: 'Rentier', gift: 18, k: 'antlers' }, { n: 'Heiligenschein', gift: 22, k: 'halo' }, { n: 'Goldkrone', gift: 24, k: 'goldcrown' }];
const FIRES = [
  { n: 'Orange', cost: 0, a: '255,190,60', b: '255,80,10', c: '255,40,0', fl: ['#fff3b0', '#ffa628', '#ff4a10'], ball: '#ff8a20', glow: '255,140,30' },
  { n: 'Blau', cost: 200, a: '130,200,255', b: '40,100,255', c: '0,30,200', fl: ['#e6f4ff', '#5fb0ff', '#2a50ff'], ball: '#4a90ff', glow: '80,150,255' },
  { n: 'Lila', cost: 450, a: '225,160,255', b: '150,50,230', c: '90,0,160', fl: ['#f6e6ff', '#c070ff', '#8a30e0'], ball: '#b060ff', glow: '170,90,255' },
  { n: 'Grün', gift: 3, a: '170,255,150', b: '60,200,60', c: '0,120,20', fl: ['#f0ffe6', '#7aff7a', '#2ab52a'], ball: '#4adf4a', glow: '90,230,90' },
  { n: 'Rosa', gift: 9, a: '255,190,225', b: '240,90,170', c: '170,20,100', fl: ['#fff0f8', '#ff9ad0', '#e0409a'], ball: '#ff70b8', glow: '255,120,190' },
  { n: 'Gold', gift: 15, a: '255,240,150', b: '255,190,30', c: '200,120,0', fl: ['#fffbe0', '#ffe066', '#e8a317'], ball: '#ffd034', glow: '255,215,80' },
  { n: 'Regenbogen', gift: 19, rainbow: true, a: '255,200,100', b: '255,80,80', c: '200,0,60', fl: ['#fff', '#ff9a3c', '#ff4a8a'], ball: '#ff8a20', glow: '255,160,80' },
];
function rgbStr(hex) { return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`; }
function fireOf(i) { const f = FIRES[i] || FIRES[0]; if (!f.rainbow) return f; const h = (T * 90) % 360, a = hslHex(h, 100, 78), b = hslHex(h, 100, 56), c = hslHex(h, 100, 36); return Object.assign({}, f, { a: rgbStr(a), b: rgbStr(b), c: rgbStr(c), fl: [hslHex(h, 100, 94), a, b], ball: b, glow: rgbStr(b) }); }
function rexLook(wi) { const sk = SKINS[save.equip.skin] || SKINS[0], h = HATS[save.equip.hat] || HATS[0], jungle = wi === 0 && !sk.body; return { rainbow: sk.rainbow, body: jungle ? '#22a98c' : sk.body, dark: jungle ? '#167a68' : sk.dark, belly: sk.belly, hat: h.k || (wi === 2 || wi === 4 || wi === 7 ? 'santa' : null) }; }
const WHO = { goetti: 'Goetti', chili: 'Chili', rex: () => save.rexName || 'T-Rex', mami: 'Mamasaurus', papi: 'Papasaurus', fabio: 'Fabiosaurus', kiwi: 'Kiwi' };

// =====================================================================
// Character drawing
// =====================================================================
function drawOli(x, y, ph, hat, o = {}) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const vy = clamp((o.vy || 0) / 900, -1, 1), flutter = Math.sin(ph - 1.3) * 3 - vy * 6;
  // legs: thigh, knee, shin, boot - the knee swings with the stride
  const kx = x + 9 + Math.sin(ph) * 2.5, ky = y + 6, fx = x + 5 + Math.sin(ph + 0.8) * 3, fy = y + 18;
  ctx.strokeStyle = '#2f5aa8'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - 1, y - 4); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  ell(fx + 2, fy + 1, 5.5, 3.2, 0.1, '#5a3416');
  // scarf tail streaming behind
  ctx.fillStyle = '#2e9e5b'; ctx.beginPath(); ctx.moveTo(x - 8, y - 30); ctx.quadraticCurveTo(x - 20, y - 31 + flutter * 0.5, x - 27, y - 26 + flutter); ctx.lineTo(x - 25, y - 21 + flutter); ctx.quadraticCurveTo(x - 17, y - 24 + flutter * 0.4, x - 8, y - 24); ctx.closePath(); ctx.fill();
  // torso
  rr(x - 10, y - 28, 20, 28, 7); ctx.fillStyle = hgrad(x - 10, x + 10, '#f26a5e', '#e0473c', '#a82e26'); ctx.fill();
  ctx.fillStyle = '#ffd34d'; ctx.fillRect(x - 1, y - 26, 2, 22);
  rr(x - 11, y - 32, 22, 7, 3.5); ctx.fillStyle = '#2e9e5b'; ctx.fill();
  // arm holding the rein
  const hy = y - 15 + Math.sin(ph) * 1.5, hx = x + 17;
  ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(hx + 1, hy); ctx.quadraticCurveTo(x + 28, y + 4 + Math.sin(ph) * 2, x + 40, y + 1); ctx.stroke();
  ctx.strokeStyle = '#e0473c'; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(x + 4, y - 21); ctx.lineTo(x + 12, y - 12 + Math.sin(ph) * 1.5); ctx.lineTo(hx, hy); ctx.stroke();
  circle(hx + 1, hy, 4, '#f4cfa6');
  // head: blond curls (back), face, ear, fringe curls, face details
  const cx = x + 2, cy = y - 40, hairD = '#c9972c', hair = '#e9c25e', hairL = '#f8e19a';
  const curl = (px, py, r) => { circle(px, py + 1.2, r, hairD); circle(px, py, r, hair); ctx.strokeStyle = hairL; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(px - r * 0.1, py - r * 0.1, r * 0.55, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke(); };
  const capped = ['santa', 'cowboy', 'straw', 'pirate', 'chef', 'tophat', 'beanie', 'wizard', 'propeller'].includes(hat) || hat === true; // these hats cover the top of the head
  [[-12, -1, 5.4], [-13, -9, 5.6], [-10, -17, 5.6], [-3, -22, 5.8], [6, -21, 5.6], [12, -14, 5.2], [-9, 6, 4.2]].forEach(([dx, dy, r]) => { if (capped && dy < -9) return; curl(cx + dx, cy + dy, r); });
  circle(cx, cy, 11, '#f6d3b0');
  circle(cx - 6, cy + 1, 3, '#eaba92'); circle(cx - 6, cy + 1, 1.4, '#d9a073');
  if (!capped) [[-4, -12, 4.6], [3, -14, 4.8], [10, -10, 4.2], [-10, -8, 4]].forEach(([dx, dy, r]) => curl(cx + dx, cy + dy, r));
  circle(cx + 5.5, cy + 0.5, 2.7, '#fff'); circle(cx + 6.1, cy + 0.6, 1.9, '#3b7fc4'); circle(cx + 6.3, cy + 0.6, 1, '#14283f'); circle(cx + 6.9, cy - 0.2, 0.7, '#fff');
  ctx.strokeStyle = '#b8862a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cx + 3, cy - 4.2); ctx.quadraticCurveTo(cx + 6, cy - 5.4, cx + 9, cy - 4); ctx.stroke();
  circle(cx + 10.6, cy + 3, 1.5, '#eeb893');
  ell(cx + 3, cy + 5, 2.4, 1.5, 0, 'rgba(255,120,110,.3)');
  ctx.fillStyle = '#d9a073'; for (const [dx, dy] of [[4, 3.6], [6.5, 4.6], [2.2, 5.2]]) circle(cx + dx, cy + dy, 0.5, '#d9a073');
  ctx.strokeStyle = '#b5483a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(cx + 5.5, cy + 6.4, 2.5, 0.4, Math.PI * 0.72); ctx.stroke();
  // hats sit on the hairline (brim just above the eyebrows) and cover the top curls
  const HY = y - 57;
  if (capped) { ell(x + 3, HY + 11, 13, 2.6, 0, 'rgba(60,30,10,.16)'); circle(x - 9, y - 41, 4.4, hairD); curl(x - 12, y - 41, 4.6); curl(x - 11, y - 34, 4); }
  drawHat(hat, x, HY);
}

function drawHat(hat, x, HY) {
  ctx.lineJoin = 'round';
  if (hat === 'crown') {
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(x - 12, HY + 8); ctx.lineTo(x - 13, HY - 7); ctx.lineTo(x - 6, HY - 1); ctx.lineTo(x + 1, HY - 11); ctx.lineTo(x + 8, HY - 1); ctx.lineTo(x + 15, HY - 7); ctx.lineTo(x + 14, HY + 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a67c10'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#e8b420'; ctx.fillRect(x - 12, HY + 4, 26, 4);
    circle(x + 1, HY + 2, 2, '#e53935'); circle(x - 6, HY + 3, 1.5, '#40c4ff'); circle(x + 8, HY + 3, 1.5, '#69f0ae');
  } else if (hat === 'cowboy') {
    ell(x + 1, HY + 7, 20, 4.8, -0.06, '#7a4a22'); ctx.fillStyle = '#9a6330'; ctx.beginPath(); ctx.moveTo(x - 13, HY + 7); ctx.quadraticCurveTo(x - 14, HY - 13, x + 1, HY - 12); ctx.quadraticCurveTo(x + 16, HY - 13, x + 15, HY + 7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a3416'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 2, HY - 11); ctx.quadraticCurveTo(x + 1, HY - 6, x + 4, HY - 11); ctx.stroke(); ctx.fillStyle = '#5a3416'; ctx.fillRect(x - 13, HY + 1, 28, 3);
  } else if (hat === 'goldcrown') {
    ctx.save(); ctx.translate(x + 1, HY + 8); ctx.scale(1.25, 1.25); ctx.translate(-(x + 1), -(HY + 8));
    ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(x - 13, HY + 8); ctx.lineTo(x - 14, HY - 8); ctx.lineTo(x - 7, HY - 1); ctx.lineTo(x + 1, HY - 13); ctx.lineTo(x + 9, HY - 1); ctx.lineTo(x + 16, HY - 8); ctx.lineTo(x + 15, HY + 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a67c10'; ctx.lineWidth = 1.6; ctx.stroke();
    circle(x + 1, HY + 2, 2.4, '#e53935'); circle(x - 7, HY + 3, 1.8, '#40c4ff'); circle(x + 9, HY + 3, 1.8, '#69f0ae'); drawStar(x + 1, HY - 15, 3.4, '#fff'); ctx.restore();
  } else if (hat === 'straw') {
    ell(x + 1, HY + 8, 23, 5.2, -0.05, '#e0b85c'); ctx.fillStyle = '#f2d98c'; ctx.beginPath(); ctx.moveTo(x - 12, HY + 7); ctx.quadraticCurveTo(x - 13, HY - 10, x + 1, HY - 9); ctx.quadraticCurveTo(x + 15, HY - 10, x + 14, HY + 7); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a6a20'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#d63a3a'; ctx.fillRect(x - 12, HY + 1, 26, 4); ctx.strokeStyle = 'rgba(150,110,40,.6)'; ctx.lineWidth = 1; for (let i = -9; i < 12; i += 4) { ctx.beginPath(); ctx.moveTo(x + i, HY - 8); ctx.lineTo(x + i, HY); ctx.stroke(); }
  } else if (hat === 'pirate') {
    ctx.fillStyle = '#23232e'; ctx.beginPath(); ctx.moveTo(x - 21, HY + 9); ctx.quadraticCurveTo(x - 17, HY - 13, x + 1, HY - 9); ctx.quadraticCurveTo(x + 19, HY - 13, x + 23, HY + 9); ctx.quadraticCurveTo(x + 1, HY + 3, x - 21, HY + 9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 1.6; ctx.stroke();
    circle(x + 1, HY - 2, 3.2, '#fff'); ctx.fillStyle = '#23232e'; circle(x, HY - 2.5, 0.8, '#23232e'); circle(x + 2.4, HY - 2.5, 0.8, '#23232e'); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - 5, HY + 2); ctx.lineTo(x + 7, HY + 6); ctx.moveTo(x + 7, HY + 2); ctx.lineTo(x - 5, HY + 6); ctx.stroke();
  } else if (hat === 'goggles') {
    rr(x - 15, HY + 3, 33, 5, 2.5); ctx.fillStyle = '#2a7fd0'; ctx.fill(); for (const dx of [-5, 8]) { circle(x + dx, HY + 5, 6.4, '#1a4a8a'); circle(x + dx, HY + 5, 4.8, '#bfeaff'); circle(x + dx - 1.2, HY + 3.8, 1.4, '#fff'); }
  } else if (hat === 'chef') {
    ctx.fillStyle = '#fff'; for (const [dx, dy, r] of [[-7, -10, 7], [1, -15, 8], [9, -10, 7]]) circle(x + dx, HY + dy, r, '#fff'); rr(x - 12, HY - 8, 26, 17, 3); ctx.fill(); ctx.strokeStyle = '#b8b8c0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 12, HY + 6); ctx.lineTo(x + 14, HY + 6); ctx.moveTo(x - 4, HY - 6); ctx.lineTo(x - 4, HY + 5); ctx.moveTo(x + 6, HY - 6); ctx.lineTo(x + 6, HY + 5); ctx.stroke();
  } else if (hat === 'tophat') {
    ell(x + 1, HY + 8, 17, 4.4, -0.03, '#15151c'); rr(x - 9, HY - 20, 21, 27, 2); ctx.fillStyle = '#23232e'; ctx.fill(); ctx.fillStyle = '#d63a3a'; ctx.fillRect(x - 9, HY + 1, 21, 4); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 6, HY - 18); ctx.lineTo(x - 6, HY); ctx.stroke();
  } else if (hat === 'beanie') {
    ctx.fillStyle = '#3a6fd0'; ctx.beginPath(); ctx.moveTo(x - 16, HY + 9); ctx.bezierCurveTo(x - 18, HY - 9, x - 6, HY - 17, x + 2, HY - 16); ctx.bezierCurveTo(x + 14, HY - 15, x + 18, HY - 2, x + 18, HY + 9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#1a3a80'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 10, HY - 8); ctx.quadraticCurveTo(x, HY - 14, x + 12, HY - 6); ctx.stroke(); rr(x - 17, HY + 4, 36, 8, 4); ctx.fillStyle = '#e8eefc'; ctx.fill(); ctx.stroke(); circle(x + 1, HY - 17, 5, '#fff');
  } else if (hat === 'wizard') {
    ell(x + 1, HY + 8, 21, 4.6, -0.04, '#4a2a8a'); ctx.fillStyle = '#5a35a8'; ctx.beginPath(); ctx.moveTo(x - 14, HY + 8); ctx.quadraticCurveTo(x - 4, HY - 8, x + 4, HY - 32); ctx.quadraticCurveTo(x + 8, HY - 8, x + 17, HY + 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2a1260'; ctx.lineWidth = 1.5; ctx.stroke();
    drawStar(x + 3, HY - 10, 4, '#ffd34d'); drawStar(x - 3, HY - 1, 2.8, '#ffd34d'); drawStar(x + 8, HY - 2, 2.4, '#fff3b0'); ctx.fillStyle = '#ffd34d'; ctx.fillRect(x - 13, HY + 4, 30, 2.6);
  } else if (hat === 'propeller') {
    ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(x - 14, HY + 8); ctx.quadraticCurveTo(x - 15, HY - 7, x + 1, HY - 8); ctx.quadraticCurveTo(x + 17, HY - 7, x + 16, HY + 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7a1210'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(x + 1, HY - 8); ctx.quadraticCurveTo(x - 6, HY - 6, x - 10, HY + 6); ctx.lineTo(x - 2, HY + 7); ctx.quadraticCurveTo(x - 1, HY - 2, x + 1, HY - 8); ctx.fill(); ctx.fillStyle = '#3a8ae0'; ctx.fillRect(x + 4, HY - 6, 8, 12);
    const bw = Math.sin(T * 26) * 15; circle(x + 1, HY - 9, 2.6, '#444'); ell(x + 1, HY - 10, Math.abs(bw) + 3, 2.2, 0, '#e8e8f0');
  } else if (hat === 'antlers') {
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (const sx of [-1, 1]) { const bx = x + 1 + sx * 8; ctx.beginPath(); ctx.moveTo(bx, HY + 4); ctx.quadraticCurveTo(bx + sx * 6, HY - 6, bx + sx * 6, HY - 18); ctx.moveTo(bx + sx * 3, HY - 4); ctx.lineTo(bx + sx * 11, HY - 9); ctx.moveTo(bx + sx * 6, HY - 12); ctx.lineTo(bx + sx * 12, HY - 16); ctx.stroke(); }
  } else if (hat === 'halo') {
    ctx.save(); const g = ctx.createRadialGradient(x + 1, HY - 8, 4, x + 1, HY - 8, 22); g.addColorStop(0, 'rgba(255,240,150,.7)'); g.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 1, HY - 8, 22, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.ellipse(x + 1, HY - 8 + Math.sin(T * 3) * 1.2, 13, 4.2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  } else if (hat) { // santa cap
    ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(x - 17, HY + 9); ctx.bezierCurveTo(x - 19, HY - 9, x - 5, HY - 18, x + 3, HY - 17); ctx.bezierCurveTo(x + 15, HY - 16, x + 19, HY - 2, x + 19, HY + 9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 3, HY - 15); ctx.quadraticCurveTo(x - 16, HY - 26, x - 22, HY - 12); ctx.lineTo(x - 15, HY - 8); ctx.quadraticCurveTo(x - 12, HY - 17, x + 2, HY - 11); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(x + 1, HY + 5); ctx.rotate(-0.06); rr(-20, -4, 41, 10, 5); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    circle(x - 22, HY - 12, 4.6, '#fff');
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
  const lx = 116, ly = -98;
  if (!duck) return [lx, ly];
  const c = Math.cos(DUCK_ROT), sn = Math.sin(DUCK_ROT);
  return [lx * c - ly * sn, lx * sn + ly * c + DUCK_DY];
}
function drawRex(x, y, s, ph, jaw, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(o.flip ? -s : s, s);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  const rbH = o.rainbow ? (T * 60) % 360 : 0, b0 = o.rainbow ? hslHex(rbH, 68, 52) : (o.body || '#2f9e5f'), d0 = o.rainbow ? hslHex(rbH, 68, 34) : (o.dark || '#1f7442'), belly0 = o.belly || '#f3e3a8', plate = o.spike || '#eaa43c';
  const vyn = clamp((o.vy || 0) / 900, -1, 1), hurt = o.hurt || 0;
  if (hurt > 0) { jaw = Math.max(jaw, 0.3 * hurt); ctx.rotate(Math.sin(T * 45) * 0.045 * hurt - 0.07 * hurt); } // ouch: wobble, open mouth
  const sq = (o.sq || 0) - 0.012 * Math.sin(T * 2.2); // + squash, - stretch, plus breathing
  ctx.scale(1 + sq * 0.8, 1 - sq);
  const body = vgrad(-125, -30, shade(b0, 1.32), b0, shade(b0, 0.66)), dark = vgrad(-80, 0, d0, shade(d0, 0.6)), belly = vgrad(-66, -40, shade(belly0, 1.08), shade(belly0, 0.92));
  ctx.translate(0, o.air ? 0 : -Math.abs(Math.sin(ph)) * 3);
  if (o.duck) { rexCrouchLeg(-12, dark, '#12482a'); ctx.translate(0, DUCK_DY); ctx.rotate(DUCK_ROT); }
  else { if (o.stomp) ctx.scale(0.95, 1.06); rexLeg(-6, ph + Math.PI, dark, '#12482a', o.air, true); }
  const tw = Math.sin(ph * 0.5 - 0.9) * 5 - vyn * 8; // tail lags the body and lifts when falling
  // tail: thick at the hips, tapering to a tip
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-14, -90); ctx.bezierCurveTo(-60, -92, -100, -80, -132, -58 + tw); ctx.bezierCurveTo(-100, -60, -60, -46, -14, -40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.moveTo(-14, -42); ctx.bezierCurveTo(-60, -48, -100, -60, -126, -57 + tw); ctx.bezierCurveTo(-100, -56, -60, -42, -14, -38); ctx.closePath(); ctx.fill();
  // dorsal plates: amber rounded fins that follow the spine
  ctx.fillStyle = plate; ctx.strokeStyle = shade(plate, 0.6); ctx.lineWidth = 1.5;
  [[30, -101, 8], [14, -99, 9.5], [-4, -96, 10.5], [-22, -92, 10], [-40, -87, 9], [-58, -82, 8], [-76, -76, 6.5], [-94, -69, 5]].forEach(([px, py, sz], i) => { const ty = py + (px < -50 ? tw * 0.4 : 0) + Math.sin(ph * 0.5 - 0.5 + i * 0.4) * 0.8; ctx.beginPath(); ctx.moveTo(px - sz * 0.9, ty + 5); ctx.quadraticCurveTo(px - sz * 0.5, ty - sz * 1.2, px + sz * 0.2, ty - sz * 1.45); ctx.quadraticCurveTo(px + sz * 0.8, ty - sz * 0.6, px + sz * 0.9, ty + 5); ctx.closePath(); ctx.fill(); ctx.stroke(); });
  // torso + chest + belly
  ell(4, -66, 46, 29, -0.18, body);
  ell(24, -68, 28, 28, 0, body);
  ctx.strokeStyle = 'rgba(255,255,225,.5)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(4, -66, 42, 26, -0.18, Math.PI * 1.12, Math.PI * 1.72); ctx.stroke();
  ell(16, -52, 33, 13, -0.22, belly);
  ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(4 + i * 9, -55 + i * 1.5); ctx.lineTo(8 + i * 9, -47 + i * 1.5); ctx.stroke(); }
  // back stripes
  ctx.strokeStyle = 'rgba(15,70,38,.35)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-26 + i * 15, -88 + i * 1.5); ctx.quadraticCurveTo(-24 + i * 15, -80, -28 + i * 15 + 4, -72); ctx.stroke(); }
  ell(-8, -84, 26, 6, -0.12, 'rgba(255,255,255,.16)');
  // neck
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(18, -92); ctx.bezierCurveTo(32, -112, 48, -116, 62, -108); ctx.lineTo(64, -80); ctx.bezierCurveTo(48, -66, 34, -58, 24, -54); ctx.closePath(); ctx.fill();
  // lower jaw, hinged at the cheek
  ctx.save(); ctx.translate(62, -92); ctx.rotate(jaw * 0.55);
  if (jaw > 0.05) { ctx.fillStyle = '#7d1c2c'; ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(28, -6, 50, 1); ctx.lineTo(44, 12); ctx.lineTo(0, 13); ctx.fill(); ell(24, 7, 13, 3.6, 0, '#e8627e'); }
  ctx.fillStyle = shade(b0, 0.82); ctx.beginPath(); ctx.moveTo(-2, 0); ctx.quadraticCurveTo(28, 1, 50, 3); ctx.quadraticCurveTo(54, 14, 40, 16); ctx.lineTo(4, 16); ctx.quadraticCurveTo(-6, 9, -2, 0); ctx.fill();
  ctx.fillStyle = shade(belly0, 0.96); ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(42, 12); ctx.quadraticCurveTo(40, 16, 34, 16); ctx.lineTo(4, 16); ctx.fill();
  if (jaw > 0.12) { ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(14 + i * 8, 2); ctx.lineTo(17 + i * 8, -4); ctx.lineTo(20 + i * 8, 2); ctx.fill(); } }
  ctx.restore();
  // head: rounded skull, brow bump, wedge snout
  ctx.fillStyle = vgrad(-130, -86, shade(b0, 1.42), b0, shade(b0, 0.82));
  ctx.beginPath(); ctx.moveTo(42, -104); ctx.bezierCurveTo(44, -126, 62, -134, 80, -128); ctx.bezierCurveTo(94, -124, 104, -118, 116, -110); ctx.bezierCurveTo(124, -105, 122, -96, 112, -93); ctx.lineTo(66, -90); ctx.bezierCurveTo(48, -90, 40, -96, 42, -104); ctx.closePath(); ctx.fill();
  ell(76, -121, 13, 2.6, -0.1, 'rgba(255,255,255,.28)');
  // upper teeth (always a few, fierce but cute)
  ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const tx = 70 + i * 8, ty = -92 - i * 0.5; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 3.2, ty + (jaw > 0.12 ? 7 : 5)); ctx.lineTo(tx + 6.4, ty); ctx.fill(); }
  // mouth line, nostril, cheek
  if (jaw <= 0.12) { ctx.strokeStyle = shade(d0, 0.5); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(62, -91); ctx.quadraticCurveTo(92, -88, 118, -99); ctx.stroke(); }
  circle(112, -108, 2.4, shade(d0, 0.55)); ell(80, -98, 8, 4.6, 0, 'rgba(255,120,130,.3)');
  // brow ridge + big eye
  ctx.fillStyle = shade(b0, 0.7); ctx.beginPath(); ctx.moveTo(56, -119); ctx.quadraticCurveTo(72, -128, 92, -118); ctx.quadraticCurveTo(76, -119, 58, -113); ctx.closePath(); ctx.fill();
  const blink = (T % 3.6) < 0.12 || jaw > 0.55 || hurt > 0.3;
  if (blink) { ctx.strokeStyle = '#17331f'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(74, -111, 7.5, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke(); }
  else { circle(74, -111, 9.5, '#fff'); circle(76, -110, 6.2, '#e8a317'); circle(77, -110, 3.8, '#17120c'); circle(78.8, -113, 2.1, '#fff'); circle(74.5, -106.5, 1, '#fff'); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(74, -111, 9.5, 0, Math.PI * 2); ctx.stroke(); }
  // little arm with claws
  ctx.strokeStyle = shade(b0, 0.82); ctx.lineWidth = 7.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(32, -68); ctx.lineTo(43, -57 + Math.sin(ph) * 2); ctx.lineTo(52, -62); ctx.stroke();
  ctx.fillStyle = '#f3ead2'; for (const d of [-3, 2]) { ctx.beginPath(); ctx.moveTo(51, -64 + d); ctx.lineTo(58, -61 + d); ctx.lineTo(51, -59 + d); ctx.fill(); }
  if (o.duck) { ctx.save(); ctx.rotate(-DUCK_ROT); ctx.translate(0, -DUCK_DY); rexCrouchLeg(10, body, dark); ctx.restore(); }
  else { rexLeg(6, ph, body, dark, o.air, true); ell(-2, -56, 7, 10, 0.25, 'rgba(255,255,255,.16)'); }
  if (o.fire) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fl = 0.55 + 0.35 * Math.sin(T * 17) + 0.1 * Math.sin(T * 41), fc = fireOf(save.equip.fire || 0); const g = ctx.createRadialGradient(108, -96, 2, 108, -96, 40); g.addColorStop(0, `rgba(255,255,255,${0.6 * fl})`); g.addColorStop(0.3, `rgba(${fc.a},${fl})`); g.addColorStop(1, `rgba(${fc.b},0)`); ctx.fillStyle = g; ctx.fillRect(68, -136, 80, 80); ell(104, -96, 22, 2.6 + jaw * 6, 0.02, `rgba(${fc.a},${fl})`); ctx.restore(); }
  if (o.rider) {
    rr(-24, -96, 38, 11, 5); ctx.fillStyle = '#c0392b'; ctx.fill(); ctx.fillStyle = '#f4c542'; ctx.fillRect(-22, -87, 34, 2.5);
    const lean = o.duck ? 0 : (o.lean || 0) + (o.air ? (vyn < 0 ? 0.12 : -0.08) : 0) - (jaw > 0.5 ? 0.16 : 0) - hurt * 0.3;
    ctx.save(); if (o.duck) { ctx.translate(-4, -86); ctx.rotate(0.9); } else { ctx.translate(-4, -92); ctx.rotate(lean); } ctx.scale(1.15, 1.15);
    drawOli(0, 0, ph, o.hat, { vy: o.vy }); ctx.restore();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawRaptor(x, y, s, ph, flip, o = {}) {
  const c0 = o.col || '#b0653a', dark = o.dark || '#6a3418', boss = !!o.crown, feather = boss ? '#ffb02e' : '#f2a43a', belly = boss ? '#e8b69a' : '#f2dcae';
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  if (o.alpha != null) ctx.globalAlpha = Math.max(0, o.alpha);
  const col = vgrad(-100, -20, shade(c0, 1.35), c0, shade(c0, 0.62));
  ctx.translate(0, -Math.abs(Math.sin(ph)) * 2);
  const tw = Math.sin(ph * 0.5 - 0.8) * 4;
  // legs: thick thigh, knee, shin, three-toed foot with a raised sickle claw
  const leg = (p, c, back) => {
    const sw = Math.sin(p), lift = Math.max(0, Math.cos(p)) * 7;
    const kx = 9 + sw * 8, ky = -22 - lift * 0.3, ax = -6 + sw * 13, ay = -7 - lift;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = c; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-2, -38); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(ax, ay); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 14, ay + 6); ctx.stroke();
    ctx.fillStyle = '#fff3d6'; for (const d of [0, 5]) { ctx.beginPath(); ctx.moveTo(ax + 12 + d * 0.4, ay + 3 + d * 0.3); ctx.lineTo(ax + 21 + d * 0.4, ay + 8 + d * 0.3); ctx.lineTo(ax + 12 + d * 0.4, ay + 9 + d * 0.3); ctx.fill(); }
    if (!back) { ctx.fillStyle = '#ffd9a0'; ctx.beginPath(); ctx.moveTo(ax + 1, ay - 1); ctx.quadraticCurveTo(ax + 10, ay - 4, ax + 9, ay + 6); ctx.lineTo(ax + 4, ay + 2); ctx.fill(); }
  };
  leg(ph + Math.PI, dark, true);
  // tail with a feather fan at the tip
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-12, -64); ctx.bezierCurveTo(-40, -68, -70, -62, -92, -64 + tw); ctx.bezierCurveTo(-70, -52, -40, -44, -12, -40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = feather; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-86, -64 + tw); ctx.quadraticCurveTo(-104, -64 + tw + i * 8, -112, -64 + tw + i * 15); ctx.quadraticCurveTo(-98, -61 + tw + i * 8, -86, -62 + tw); ctx.fill(); }
  // torso, belly, stripes
  ell(2, -49, 29, 18, -0.22, col); ell(9, -42, 20, 8, -0.22, belly);
  ctx.strokeStyle = dark; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-18 + i * 9, -62 + i * 1.2); ctx.lineTo(-14 + i * 9, -52 + i * 1.2); ctx.stroke(); }
  if (boss) { ctx.fillStyle = '#5a0e0e'; for (let i = 0; i < 6; i++) { const px = -30 + i * 11; ctx.beginPath(); ctx.moveTo(px - 5, -62 - i * 0.6); ctx.lineTo(px, -74 - i * 0.6); ctx.lineTo(px + 5, -62 - i * 0.6); ctx.fill(); } ctx.strokeStyle = 'rgba(255,230,200,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -58); ctx.lineTo(8, -40); ctx.moveTo(-1, -59); ctx.lineTo(13, -41); ctx.stroke(); }
  // neck and head: big wedge head with a real snout
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(14, -60); ctx.bezierCurveTo(20, -78, 30, -84, 40, -84); ctx.lineTo(46, -62); ctx.bezierCurveTo(36, -54, 26, -46, 18, -42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = vgrad(-100, -62, shade(c0, 1.4), c0, shade(c0, 0.75));
  ctx.beginPath(); ctx.moveTo(30, -86); ctx.bezierCurveTo(32, -99, 48, -103, 58, -96); ctx.bezierCurveTo(66, -91, 74, -86, 80, -79); ctx.bezierCurveTo(84, -74, 80, -67, 71, -67); ctx.lineTo(42, -66); ctx.bezierCurveTo(33, -68, 28, -77, 30, -86); ctx.closePath(); ctx.fill();
  ell(50, -62, 22, 5, 0.05, shade(c0, 0.8)); // lower jaw
  ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const tx = 50 + i * 5.6; ctx.beginPath(); ctx.moveTo(tx, -66.5); ctx.lineTo(tx + 2.6, -61.5); ctx.lineTo(tx + 5.2, -66.5); ctx.fill(); }
  circle(76, -79, 1.8, shade(dark, 0.7)); // nostril
  // crest feathers
  ctx.fillStyle = feather; for (const [dx, an, ln] of [[0, -0.4, 22], [5, -0.15, 26], [10, 0.1, 21]]) { ctx.save(); ctx.translate(38 + dx, -98); ctx.rotate(an - 0.35); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(-1, -ln * 0.6, 1, -ln); ctx.quadraticCurveTo(4, -ln * 0.5, 4, 0); ctx.fill(); ctx.restore(); }
  // eye: big, with a slit pupil, and an angry brow
  circle(52, -85, 6.4, '#fff'); circle(53, -85, 4.6, boss ? '#ff5a3a' : '#ffd23a'); ell(53.6, -85, 1.5, 3.6, 0, '#14100c'); circle(51.4, -87.4, 1.4, '#fff');
  ctx.strokeStyle = dark; ctx.lineWidth = boss ? 4 : 3.2; ctx.beginPath(); ctx.moveTo(43, -95); ctx.lineTo(60, -88); ctx.stroke();
  // little arms with claws
  ctx.strokeStyle = dark; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(24, -52); ctx.lineTo(33, -44); ctx.lineTo(41, -48); ctx.stroke();
  ctx.fillStyle = '#fff3d6'; for (const d of [-2, 2]) { ctx.beginPath(); ctx.moveTo(40, -50 + d); ctx.lineTo(46, -47 + d); ctx.lineTo(40, -45 + d); ctx.fill(); }
  leg(ph, col, false);
  if (boss) { // golden crown with gems
    ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(33, -100); ctx.lineTo(32, -116); ctx.lineTo(40, -108); ctx.lineTo(46, -120); ctx.lineTo(52, -108); ctx.lineTo(60, -116); ctx.lineTo(59, -99); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 1.6; ctx.stroke();
    circle(46, -105, 2.6, '#e53935'); circle(38, -104, 1.8, '#40c4ff'); circle(54, -104, 1.8, '#69f0ae');
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawPtero(x, y, s, ph, flip, o = {}) {
  const dark = '#4f2a63', mid = '#8e5aa8', light = '#c99be0';
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  if (o.alpha != null) ctx.globalAlpha = Math.max(0, o.alpha);
  const fl = c => c > 0 ? Math.pow(c, 0.75) : -Math.pow(-c, 1.5); // quick upstroke feel, long glide on the downstroke
  const tip = -50 * fl(Math.cos(ph)), tip2 = -46 * fl(Math.cos(ph - 0.7));
  ctx.translate(0, 3 * Math.cos(ph)); // body dips as the wings rise
  const wing = (t, c1, c2, back) => { // two-part arm (elbow bends), membrane with scalloped trailing edge, finger ribs
    const ex = 5 + t * 0.12, ey = t * 0.42 - 3, wx = -2 + t * 0.35, wy = t;
    ctx.fillStyle = vgrad(Math.min(0, t), Math.max(0, t) + 4, c1, c2); ctx.beginPath(); ctx.moveTo(12, -2); ctx.lineTo(ex, ey); ctx.lineTo(wx, wy);
    ctx.quadraticCurveTo(-8 + t * 0.2, t * 0.5, -11, t * 0.2 + 2); ctx.quadraticCurveTo(-14, 3, -19, 3); ctx.lineTo(-4, 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = back ? 2.2 : 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(ex, ey); ctx.lineTo(wx, wy); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(60,20,80,.5)'; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(-7 + t * 0.25, t * 0.78); ctx.moveTo(ex - 2, ey + 2); ctx.lineTo(-11 + t * 0.12, t * 0.4); ctx.stroke();
  };
  wing(tip2, shade(mid, 0.8), dark, true);
  ell(0, 0, 23, 9.5, 0, vgrad(-10, 10, light, mid, dark)); ell(3, 4, 14, 4.5, 0, '#e8d4f2');
  ctx.strokeStyle = dark; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(-30, 8); ctx.stroke(); // tail whip
  // head with a long beak and a swept-back crest
  ctx.fillStyle = '#f08a3c'; ctx.beginPath(); ctx.moveTo(24, -12); ctx.quadraticCurveTo(14, -26, -4, -26); ctx.quadraticCurveTo(10, -14, 22, -5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = vgrad(-14, 4, light, mid); ctx.beginPath(); ctx.moveTo(18, -9); ctx.bezierCurveTo(26, -17, 44, -15, 62, -4); ctx.bezierCurveTo(46, -2, 32, 3, 18, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(30, -1); ctx.quadraticCurveTo(46, -3, 60, -4); ctx.stroke();
  ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(40 + i * 6, -3); ctx.lineTo(42.4 + i * 6, 1.4); ctx.lineTo(44.8 + i * 6, -3.2); ctx.fill(); }
  circle(28, -6.5, 4.8, '#fff'); circle(29, -6.5, 3.4, '#ffd23a'); circle(29.8, -6.4, 1.8, '#17100a'); circle(30.2, -7.6, 0.8, '#fff');
  ctx.strokeStyle = dark; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(22, -13); ctx.lineTo(34, -10); ctx.stroke();
  wing(tip, light, mid, false);
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawCompy(x, y, s, ph, flip, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s * (o.flat ? 0.35 : 1));
  const col = vgrad(-36, 0, '#dcec62', '#9cbf2e', '#5f7f17'), dark = '#4a6312';
  const leg = (p, c) => { const sw = Math.sin(p); ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-2, -16); ctx.lineTo(-2 + sw * 7, -2 - Math.max(0, Math.cos(p)) * 4); ctx.lineTo(5 + sw * 7, 0); ctx.stroke(); };
  leg(ph + Math.PI, dark);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-6, -24); ctx.quadraticCurveTo(-26, -28, -42, -34 + Math.sin(ph) * 3); ctx.quadraticCurveTo(-24, -16, -6, -14); ctx.fill();
  ell(0, -20, 14, 10, -0.2, col); ell(4, -16, 9, 4.5, -0.2, '#f2f0b8');
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(4, -26); ctx.quadraticCurveTo(10, -36, 16, -38); ctx.lineTo(28, -35); ctx.quadraticCurveTo(30, -29, 24, -28); ctx.lineTo(12, -26); ctx.quadraticCurveTo(10, -20, 8, -16); ctx.fill();
  circle(18, -38, 8.2, col);
  ctx.strokeStyle = '#e07b39'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 6, -28); ctx.lineTo(-8 + i * 6, -22); ctx.stroke(); }
  ctx.fillStyle = '#f08a3c'; ctx.beginPath(); ctx.moveTo(14, -45); ctx.lineTo(16, -53); ctx.lineTo(20, -45); ctx.moveTo(19, -45); ctx.lineTo(23, -52); ctx.lineTo(24, -44); ctx.fill(); // little crest
  if (o.flat) { ctx.strokeStyle = '#222'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(17, -43); ctx.lineTo(24, -36); ctx.moveTo(24, -43); ctx.lineTo(17, -36); ctx.stroke(); }
  else {
    circle(21, -39.5, 5.2, '#fff'); circle(22.4, -39.5, 3, '#111'); circle(23.4, -40.8, 1.1, '#fff');
    ctx.strokeStyle = dark; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(15, -46); ctx.lineTo(26, -43); ctx.stroke(); // cheeky brow
    ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(17, -31); ctx.quadraticCurveTo(24, -28, 29, -33); ctx.stroke(); // grin
    ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(20 + i * 3.2, -31); ctx.lineTo(21.4 + i * 3.2, -28.5); ctx.lineTo(22.8 + i * 3.2, -31); ctx.fill(); }
  }
  ctx.strokeStyle = dark; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(14, -15); ctx.stroke();
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
const chiliFx = { vy: 0, dig: false, scared: 0, joy: 0 };
function drawChili(x, y, s, ph, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const fx = clamp(chiliFx.vy / 600, -1, 1);
  if (chiliFx.dig) { ctx.translate(2, -8); ctx.rotate(0.3 + Math.sin(T * 22) * 0.04); ctx.translate(-2, 8); } // sniffing pose
  if (chiliFx.scared > 0) { ctx.scale(1 + 0.1 * chiliFx.scared, 1 - 0.1 * chiliFx.scared); ctx.translate(Math.sin(T * 50) * 1.2 * chiliFx.scared, 0); } // startled: crouch and tremble
  const col = vgrad(-36, 0, '#e2a06a', '#c8814a', '#93582c'), light = '#f3dcc4';
  // fluffy pom tail
  { const wag = chiliFx.dig ? Math.sin(T * 30) * 3 : chiliFx.joy > 0 ? Math.sin(T * 26) * 4 : 0; circle(-17, -17 + wag * 0.5, 8, '#fff'); circle(-21 + wag * 0.3, -19, 4.5, '#fff'); circle(-15, -13, 4, '#e8eef5'); }
  ell(0, -15, 18, 13, 0, col);
  ell(8, -3, 9, 4, 0, light);
  const ear = (bx, by, len, w, ang, c, inner) => {
    ctx.save(); ctx.translate(bx, by); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(-w, 0); ctx.bezierCurveTo(-w * 1.5, -len * 0.45, -w * 0.9, -len * 0.95, w * 0.3, -len); ctx.bezierCurveTo(w * 1.6, -len * 0.9, w * 1.3, -len * 0.4, w, 0); ctx.closePath(); ctx.fillStyle = c; ctx.fill();
    if (inner) { ctx.beginPath(); ctx.moveTo(-w * 0.5, -2); ctx.bezierCurveTo(-w * 0.8, -len * 0.45, -w * 0.4, -len * 0.82, w * 0.3, -len * 0.86); ctx.bezierCurveTo(w * 0.95, -len * 0.75, w * 0.8, -len * 0.4, w * 0.5, -2); ctx.closePath(); ctx.fillStyle = inner; ctx.fill(); }
    ctx.restore();
  };
  const sw = chiliFx.scared > 0 ? -0.75 * chiliFx.scared : Math.sin(ph * 1.3 - 0.8) * 0.1 + fx * 0.45 + (chiliFx.joy > 0 ? 0.35 * chiliFx.joy : 0); // ears: flat when scared, perked when happy
  ear(6, -32, 27, 4.8, -0.5 + sw, '#a8693a', '#d98aa0');
  circle(15, -24, 12, col);
  ear(14, -34, 31, 5.4, -0.12 + sw * 0.8, col, '#f4a6b8');
  ell(4, -11, 9, 6, 0, light);
  ell(22, -19, 4, 2.4, 0, 'rgba(255,130,150,.45)'); ell(8, -31, 6, 3, -0.4, 'rgba(255,255,255,.2)');
  if (chiliFx.joy > 0) { ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(20, -24, 3.6, Math.PI + 0.3, Math.PI * 2 - 0.3); ctx.stroke(); } // happy ^ ^ eye
  else if (chiliFx.scared > 0) { circle(20, -26, 5.6, '#1b1210'); circle(21.8, -28.2, 2.2, '#fff'); circle(18.6, -24, 1, '#fff'); } // wide startled eye
  else if ((T % 3.1) < 0.1) { ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(20, -26, 3.4, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else { circle(20, -26, 4.6, '#1b1210'); circle(21.6, -27.8, 1.8, '#fff'); circle(18.8, -24.2, 0.9, '#fff'); }
  if (chiliFx.dig) { ctx.strokeStyle = col; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; for (const k of [0, 1.6]) { ctx.beginPath(); ctx.moveTo(12, -8); ctx.lineTo(22 + Math.sin(T * 34 + k) * 5, -1 + Math.cos(T * 34 + k) * 2); ctx.stroke(); } }
  circle(27, -21, 2.4, '#f48fb1');
  ctx.strokeStyle = 'rgba(255,245,235,.85)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(26, -20); ctx.lineTo(37, -24); ctx.moveTo(26, -20); ctx.lineTo(38, -19); ctx.moveTo(26, -19); ctx.lineTo(36, -14); ctx.stroke();
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
  ell(72 + Math.sin(ph) * 3, -146, 24, 15, 0.1, col);
  circle(77 + Math.sin(ph) * 3, -151, 6.2, '#fff'); circle(78.4 + Math.sin(ph) * 3, -151, 3.8, '#222');
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(80 + Math.sin(ph) * 3, -144, 5, 0.3, 1.6); ctx.stroke();
  for (let i = 0; i < 4; i++) ell(-25 + i * 16, -70 + (i % 2) * 8, 6, 4, 0, dark);
  ell(4, -40, 40, 10, 0, 'rgba(255,255,255,.14)'); ell(-6, -74, 34, 7, 0, 'rgba(255,255,255,.16)');
  circle(79.6 + Math.sin(ph) * 3, -153, 1.5, '#fff'); ell(84 + Math.sin(ph) * 3, -142, 4, 2, 0, 'rgba(255,120,140,.4)');
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
  circle(42, -36, 5, '#fff'); circle(43, -36, 3.2, '#222'); circle(44, -37.4, 1.1, '#fff');
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
  const skin = '#f0c49b', skinD = '#e0aa80', hairC = '#3a2b23', hairL = '#5d4a3e', grey = '#a29c94', TAU = Math.PI * 2;
  // ears and the back of the messy hair
  circle(cx - r * 0.97, cy + r * 0.12, r * 0.2, skinD); circle(cx + r * 0.97, cy + r * 0.12, r * 0.2, skinD);
  ell(cx, cy - r * 0.3, r * 1.03, r * 0.85, 0, hairC);
  // face (slightly broad jaw)
  ctx.fillStyle = vgrad(cy - r, cy + r * 1.05, '#f6d2ab', skin, '#e4b38a'); ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.06, r * 0.95, r * 1.0, 0, 0, TAU); ctx.fill();
  // stubble beard around the jaw and chin
  ctx.fillStyle = 'rgba(58,43,35,.5)'; ctx.beginPath(); ctx.moveTo(cx - r * 0.93, cy + r * 0.12); ctx.quadraticCurveTo(cx - r * 0.95, cy + r * 0.8, cx - r * 0.35, cy + r * 1.02); ctx.quadraticCurveTo(cx, cy + r * 1.08, cx + r * 0.35, cy + r * 1.02); ctx.quadraticCurveTo(cx + r * 0.95, cy + r * 0.8, cx + r * 0.93, cy + r * 0.12); ctx.quadraticCurveTo(cx + r * 0.78, cy + r * 0.36, cx + r * 0.5, cy + r * 0.36); ctx.lineTo(cx - r * 0.5, cy + r * 0.36); ctx.quadraticCurveTo(cx - r * 0.78, cy + r * 0.36, cx - r * 0.93, cy + r * 0.12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(150,140,130,.5)'; for (let i = 0; i < 9; i++) circle(cx - r * 0.6 + hash(i + 31) * r * 1.2, cy + r * 0.62 + hash(i + 41) * r * 0.36, r * 0.025, '#b8b0a6');
  // big open grin with teeth and a cheeky tongue
  ctx.fillStyle = '#6e2530'; ctx.beginPath(); ctx.moveTo(cx - r * 0.46, cy + r * 0.5); ctx.quadraticCurveTo(cx, cy + r * 0.62, cx + r * 0.46, cy + r * 0.5); ctx.quadraticCurveTo(cx + r * 0.4, cy + r * 0.98, cx, cy + r * 0.98); ctx.quadraticCurveTo(cx - r * 0.4, cy + r * 0.98, cx - r * 0.46, cy + r * 0.5); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(cx - r * 0.5, cy + r * 0.46, r * 1, r * 0.2); ctx.fillStyle = '#e8627e'; ctx.beginPath(); ctx.ellipse(cx + r * 0.08, cy + r * 0.95, r * 0.24, r * 0.17, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(140,40,60,.5)'; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.moveTo(cx + r * 0.08, cy + r * 0.82); ctx.lineTo(cx + r * 0.08, cy + r * 0.95); ctx.stroke(); ctx.restore();
  // moustache
  ctx.fillStyle = hairC; ctx.beginPath(); ctx.moveTo(cx - r * 0.55, cy + r * 0.34); ctx.quadraticCurveTo(cx - r * 0.28, cy + r * 0.2, cx, cy + r * 0.34); ctx.quadraticCurveTo(cx + r * 0.28, cy + r * 0.2, cx + r * 0.55, cy + r * 0.34); ctx.quadraticCurveTo(cx + r * 0.3, cy + r * 0.5, cx, cy + r * 0.44); ctx.quadraticCurveTo(cx - r * 0.3, cy + r * 0.5, cx - r * 0.55, cy + r * 0.34); ctx.closePath(); ctx.fill();
  // nose, smile lines
  ell(cx, cy + r * 0.17, r * 0.15, r * 0.12, 0, skinD); ctx.strokeStyle = 'rgba(150,90,60,.4)'; ctx.lineWidth = Math.max(1, r * 0.04); ctx.beginPath(); ctx.arc(cx - r * 0.62, cy + r * 0.3, r * 0.22, -0.6, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + r * 0.62, cy + r * 0.3, r * 0.22, Math.PI - 0.9, Math.PI + 0.6); ctx.stroke();
  // brown eyes with a playful sparkle, strong brows
  for (const sx of [-1, 1]) {
    const ex = cx + sx * r * 0.38, ey = cy - r * 0.1;
    ell(ex, ey, r * 0.19, r * 0.13, 0, '#fff'); circle(ex + sx * r * 0.02, ey, r * 0.1, '#5a3a22'); circle(ex + sx * r * 0.02, ey, r * 0.054, '#140c08'); circle(ex + r * 0.05, ey - r * 0.05, r * 0.04, '#fff');
    ctx.strokeStyle = hairC; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + sx * r * 0.6, cy - r * 0.24); ctx.quadraticCurveTo(cx + sx * r * 0.4, cy - r * 0.36, cx + sx * r * 0.16, cy - r * 0.31); ctx.stroke();
  }
  // messy spiky hair, a few grey strands at the temples
  ctx.fillStyle = hairC; ctx.beginPath(); ctx.arc(cx, cy + r * 0.05, r * 1.0, Math.PI * 1.04, Math.PI * 1.96); ctx.quadraticCurveTo(cx + r * 0.7, cy - r * 0.55, cx + r * 0.35, cy - r * 0.62); ctx.quadraticCurveTo(cx, cy - r * 0.4, cx - r * 0.4, cy - r * 0.62); ctx.quadraticCurveTo(cx - r * 0.75, cy - r * 0.55, cx - r * 0.97, cy - r * 0.02); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 9; k++) { const u = k / 8, a = Math.PI * (1.1 + u * 0.8), bx = cx + Math.cos(a) * r * 0.98, by = cy + r * 0.05 + Math.sin(a) * r * 0.98, tl = r * (0.2 + 0.18 * hash(k + 2)), ta = a + (u - 0.5) * 0.5 + 0.12; ctx.beginPath(); ctx.moveTo(bx - Math.cos(a + 1.57) * r * 0.16, by - Math.sin(a + 1.57) * r * 0.16); ctx.lineTo(bx + Math.cos(ta) * tl, by + Math.sin(ta) * tl); ctx.lineTo(bx + Math.cos(a + 1.57) * r * 0.16, by + Math.sin(a + 1.57) * r * 0.16); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = hairL; ctx.lineWidth = r * 0.05; ctx.lineCap = 'round'; for (let k = 0; k < 4; k++) { const a = Math.PI * (1.25 + k * 0.17); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.86, cy + r * 0.05 + Math.sin(a) * r * 0.86); ctx.lineTo(cx + Math.cos(a + 0.1) * r * 1.22, cy + r * 0.05 + Math.sin(a + 0.1) * r * 1.22); ctx.stroke(); }
  ctx.strokeStyle = grey; ctx.lineWidth = r * 0.045; for (const [aa, sx] of [[1.08, -1], [1.14, -1], [1.92, 1], [1.86, 1]]) { const a = Math.PI * aa; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.9, cy + r * 0.05 + Math.sin(a) * r * 0.9); ctx.lineTo(cx + Math.cos(a) * r * 1.12, cy + r * 0.05 + Math.sin(a) * r * 1.12 - r * 0.05); ctx.stroke(); }
}
function drawGoetti(x, y, s, wave) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#5b4636'; rr(-16, -50, 13, 50, 5); ctx.fill(); rr(3, -50, 13, 50, 5); ctx.fill();
  ctx.fillStyle = '#3b2a1e'; rr(-20, -8, 20, 8, 4); ctx.fill(); rr(1, -8, 20, 8, 4); ctx.fill();
  rr(-22, -105, 44, 60, 14); ctx.fillStyle = hgrad(-22, 22, '#93a85e', '#7a8f4a', '#56672f'); ctx.fill(); rr(-9, -104, 18, 58, 5); ctx.fillStyle = hgrad(-9, 9, '#ea6a58', '#d4503f', '#a93a2e'); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, -104); ctx.lineTo(-9, -48); ctx.moveTo(9, -104); ctx.lineTo(9, -48); ctx.stroke();
  rr(5, -92, 12, 12, 2); ctx.fillStyle = '#6a7d3c'; ctx.fill(); ctx.fillStyle = '#4a3020'; ctx.fillRect(-22, -52, 44, 6);
  ctx.strokeStyle = '#c8473a'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-18, -95); ctx.lineTo(-26, -58); ctx.stroke();
  const a = wave ? Math.sin(T * 6) * 0.4 : 0;
  ctx.beginPath(); ctx.moveTo(18, -95); ctx.lineTo(18 + Math.cos(-1.1 + a) * 36, -95 + Math.sin(-1.1 + a) * 36); ctx.stroke();
  circle(18 + Math.cos(-1.1 + a) * 40, -95 + Math.sin(-1.1 + a) * 40, 6, '#f0c49b');
  circle(-26, -54, 6, '#f0c49b');
  drawGoettiHead(0, -127, 26);
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
  else if (who === 'rex') { const s = r / 42; drawRex(cx - 88 * s, cy + 104 * s, s * 0.95, 0, 0.3 + 0.2 * Math.sin(T * 8)); }
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
  if (wi === 6) return;
  ctx.globalAlpha = wi === 3 ? 0.7 : wi === 2 ? 0.45 : 0.85;
  for (let i = 0; i < 5; i++) {
    const span = W + 320, x = mod(hash(i + wi * 9) * span - T * (6 + i * 2) - cam * 0.03 * (1 + i * 0.2), span) - 240, y = 40 + hash(i + 20) * 120, s = 0.6 + hash(i + 40) * 0.6;
    ctx.drawImage(cloudSprite(wi, i % 3), x, y, 220 * s, 90 * s);
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
    for (const x0 of [180, 760, 1500]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x0, 250); ctx.lineTo(x0, 292); ctx.lineTo(x0 + 24, 292); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.moveTo(x0 - 4, 252); ctx.lineTo(x0 - 4, 292); ctx.lineTo(x0 - 20, 292); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#8a5a3a'; ctx.fillRect(x0 - 22, 292, 48, 5); }
    hazeBand(330, 420, gx.haze, 0.35);
  } else if (wi === 6) { // deep blue: rock arches, a far reef and a whale
    ridgePath(330, 120, 2.2, 8, 0, [2, 5, 11, 23], [0.5, 0.28, 0.14, 0.08]); ctx.fillStyle = vgrad(180, 420, shade(gx.far1, 1.1), shade(gx.far1, 0.7)); ctx.fill();
    ctx.fillStyle = 'rgba(10,50,90,.5)'; ctx.beginPath(); ctx.ellipse(700, 200, 150, 34, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(840, 200); ctx.quadraticCurveTo(930, 170, 960, 150); ctx.quadraticCurveTo(930, 220, 840, 214); ctx.fill();
    for (let i = 0; i < 14; i++) { const x = R() * LP, h = 40 + R() * 90; ctx.strokeStyle = 'rgba(20,110,120,.55)'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, 420); ctx.quadraticCurveTo(x + 14, 420 - h * 0.5, x - 6, 420 - h); ctx.stroke(); }
    hazeBand(240, 440, gx.haze, 0.55);
  } else { // huge snowy peaks
    ridgePath(260, 150, 1.7, 8, 0, [2, 5, 9, 19], [0.6, 0.26, 0.1, 0.04]); ctx.fillStyle = vgrad(100, 340, '#ffffff', shade(gx.far1, 1.05), gx.far1); ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(80,110,160,.25)'; ctx.lineWidth = 6; for (let x = 0; x < LP; x += 38) { ctx.beginPath(); ctx.moveTo(x, 330); ctx.lineTo(x + 18 + hash(x) * 20, 190 + hash(x + 3) * 70); ctx.stroke(); } ctx.restore();
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
    ctx.fillStyle = vgrad(GROUND - 4, GROUND + 14, '#a8aeb8', '#6a707a'); ctx.fillRect(0, GROUND - 4, W, 18);
    for (let k = Math.floor(cam / 58) - 1; k < (cam + W) / 58 + 1; k++) { const x = k * 58 - cam + hash(k) * 30, q = hash(k + 4); if (q < 0.45) ell(x, GROUND - 3, 24 + q * 20, 6, 0, '#fff'); else if (q < 0.7) { ctx.strokeStyle = '#5a8a4a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 2, GROUND); ctx.lineTo(x + i * 3, GROUND - 9 - Math.abs(i)); ctx.stroke(); } } }
  }
}
function pitNew(wi, sx, p) {
  if (wi === 5) { // tide pool: bright water with ripples
    const wg = ctx.createLinearGradient(0, GROUND, 0, GROUND + 70); wg.addColorStop(0, '#5fd0ea'); wg.addColorStop(1, '#1d6aa8'); ctx.fillStyle = wg; ctx.fillRect(sx, GROUND + 8, p.w, H);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = 0; x <= p.w; x += 8) ctx.lineTo(sx + x, GROUND + 10 + Math.sin(x * 0.12 + T * 4) * 3); ctx.stroke();
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
    if (wi >= 5) { decorNew(wi, x, hv, b, k); continue; }
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
  if (wi < 5) drawVolcano(740, 345, th.volcS, th.volcCol, wi === 3 ? 1 : 0); else backdropNew(wi, cam);
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
  if (wi >= 5) groundTopNew(wi, cam);
  else if (wi === 0) {
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
function oRex(x, y, s, ph, jaw, o = {}) { const [bx, by, bw, bh] = obox(s, o.flip, -130, o.fire ? 152 : 118, o.rider ? (o.hat ? -182 : -174) : -142, 14); const a = o.alpha == null ? 1 : o.alpha; outlined('rex', x, y, bx, by, bw, bh, () => drawRex(x, y, s, ph, jaw, Object.assign({}, o, { alpha: null })), a); }
function oRaptor(x, y, s, ph, flip, o = {}) { const [bx, by, bw, bh] = obox(s, flip, -114, 86, o.crown ? -124 : -106, 4); const a = o.alpha == null ? 1 : Math.max(0, o.alpha); outlined(o.crown ? 'boss' : 'raptor', x, y, bx, by, bw, bh, () => drawRaptor(x, y, s, ph, flip, Object.assign({}, o, { alpha: null })), a); }
function oPtero(x, y, s, ph, flip, o = {}) { const [bx, by, bw, bh] = obox(s, flip, -34, 64, -58, 52); const a = o.alpha == null ? 1 : Math.max(0, o.alpha); outlined('ptero', x, y, bx, by, bw, bh, () => drawPtero(x, y, s, ph, flip, {}), a); }
function oCompy(x, y, s, ph, flip, o = {}) { const [bx, by, bw, bh] = obox(s, flip, -46, 38, -56, 4); const a = o.alpha == null ? 1 : Math.max(0, o.alpha); outlined('compy', x, y, bx, by, bw, bh, () => drawCompy(x, y, s, ph, flip, { flat: o.flat }), a); }
function oChili(x, y, s, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -26, 38, -62, 4); outlined('chili', x, y, bx, by, bw, bh, () => drawChili(x, y, s, ph, flip)); }
function oBaby(x, y, s, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -38, 32, -78, 4); outlined('baby', x, y, bx, by, bw, bh, () => drawBaby(x, y, s, ph, flip)); }
function oKiwi(x, y, s, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -22, 44, -34, 4); outlined('kiwi', x, y, bx, by, bw, bh, () => drawKiwi(x, y, s, ph, flip)); }
function oLong(x, y, s, col, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -120, 100, -165, 4); outlined('long', x, y, bx, by, bw, bh, () => drawLongneck(x, y, s, col, ph, flip)); }
function oTrike(x, y, s, col, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -60, 62, -64, 4); outlined('trike', x, y, bx, by, bw, bh, () => drawTrike(x, y, s, col, ph, flip)); }
function oGoetti(x, y, s, wave) { const [bx, by, bw, bh] = obox(s, false, -36, 64, -166, 4); outlined('goetti', x, y, bx, by, bw, bh, () => drawGoetti(x, y, s, wave)); }

// =====================================================================
// Level generation
// =====================================================================
function buildLevel(wi, endless, LV) { // LV = the calendar level spec (or undefined for endless runs)
  const th = WORLDS[wi], R = rng(endless ? (Date.now() & 0xffffff) + wi : (LV ? 777 + LV.li * 1013 + 91 : 777 + wi * 1013));
  const dayN = LV ? LV.day : 99, first = LV ? LV.sub === 0 : true, SK = skillsFor(LV ? LV.li : null, wi), bossKind = LV ? LV.boss : null;
  const L = { wi, li: LV ? LV.li : -1, speed: th.speed * (LV ? LV.speedMul : 1), swim: !!th.swim, bossKind, pits: [], obs: [], amb: [], plats: [], eggs: [], spots: [], tips: [], cps: [], coach: [], seen: {}, peppers: [], hearts: [] };
  const amberRow = (x, n, y = GROUND - 45, dx = 48) => { for (let i = 0; i < n; i++) L.amb.push({ x: x + i * dx, y, got: false }); };
  const amberArc = (x, w, peak) => { const n = Math.max(3, Math.floor(w / 45)); for (let i = 0; i <= n; i++) { const u = i / n; L.amb.push({ x: x + u * w, y: GROUND - 60 - 4 * peak * u * (1 - u), got: false }); } };
  const firstTip = (type, x, text) => { if (!L.seen[type]) { L.seen[type] = 1; if (text) L.tips.push({ x, text }); } };
  let curTier = 1; // endless: rises every 26 segments
  const P = {
    rock: x => { L.obs.push({ type: 'rock', x: x + 30, w: 56, h: 44 }); amberArc(x - 60, 180, 110); return 120; },
    rock2: x => { L.obs.push({ type: 'rock', x: x + 30, w: 56, h: 44 }); L.obs.push({ type: 'rock', x: x + 340, w: 64, h: 52 }); return 400; },
    pit: x => { const w = 100 + Math.floor(R() * 40) + wi * 10; L.pits.push({ x, w }); amberArc(x - 40, w + 80, 120); return w; },
    amber: x => { amberRow(x, 6); return 300; },
    raptor: x => { firstTip('raptor', x - 1200, wi === 0 ? null : 'Raptor! Drüber springen oder wegbrüllen!'); L.obs.push({ type: 'raptor', x: x + 60, spd: 140 + wi * 20 + (curTier - 1) * 10, ph: 0, alpha: 1 }); return 140; },
    boulder: x => { L.obs.push({ type: 'boulder', x: x + 60, w: 110, h: 160 }); return 140; },
    plat: x => { const y = GROUND - 125; L.plats.push({ x, y, w: 240 }); amberRow(x + 30, 4, y - 40); if (R() < 0.5) L.obs.push({ type: 'rock', x: x + 120, w: 56, h: 44 }); return 260; },
    ptero: x => { firstTip('ptero', x - 1200, 'Flugsaurier! Lieber unten bleiben – oder brüllen!'); const by = GROUND - 165; L.obs.push({ type: 'ptero', x: x + 80, y: by, baseY: by, spd: 160, ph: R() * 6, alpha: 1 }); amberRow(x - 40, 4); return 160; },
    icicle: x => { firstTip('icicle', x - 1200, 'Eiszapfen! Spring über das Eis – oder spuck Feuer, wenn du ein Chili hast!'); L.obs.push({ type: 'icicle', x: x + 60, y: 120, vy: 0, state: 'hang' }); return 140; },
    low: x => { firstTip('low', x - 1200, wi === 0 ? null : 'Da hängt etwas tief! DUCKEN gedrückt halten!'); L.obs.push({ type: 'low', x: x + 70, w: 150 }); amberRow(x - 10, 4, GROUND - 30, 45); return 180; },
    compy: x => { firstTip('compy', x - 1200, wi === 0 ? null : 'Kompsis! Die haben keine Angst vorm Brüllen – spring drauf!'); for (let i = 0; i < 3; i++) L.obs.push({ type: 'compy', x: x + 80 + i * 75, spd: 150 + wi * 15 + (curTier - 1) * 8, ph: i, alpha: 1 }); return 320; },
    geode: x => { firstTip('geode', x - 1200, 'Ein Bernstein-Stein! Spring hoch und drück STAMPF!'); L.obs.push({ type: 'geode', x: x + 60 }); return 140; },
    swoop: x => { firstTip('swoop', x - 1200, 'Ein Flugsaurier fliegt ganz tief! Ducken – oder brüllen!'); const by = GROUND - 88; L.obs.push({ type: 'ptero', x: x + 80, y: by, baseY: by, spd: 200, ph: R() * 6, alpha: 1, low: true }); return 160; },
    pitRock: x => { const w = 100 + Math.floor(R() * 30) + wi * 10; L.pits.push({ x, w }); L.obs.push({ type: 'rock', x: x + w + 270, w: 56, h: 44 }); amberArc(x - 40, w + 80, 120); return w + 320; },
    lowRock: x => { firstTip('lowRock', x - 1200, 'Erst ducken, dann hüpfen!'); L.obs.push({ type: 'low', x: x + 70, w: 150 }); L.obs.push({ type: 'rock', x: x + 430, w: 56, h: 44 }); amberRow(x - 10, 4, GROUND - 30, 45); return 480; },
    compyRun: x => { firstTip('compy', x - 1200, 'Kompsis! Hüpf von Kopf zu Kopf!'); for (let i = 0; i < 5; i++) L.obs.push({ type: 'compy', x: x + 80 + i * 78, spd: 150 + wi * 15 + (curTier - 1) * 8, ph: i, alpha: 1 }); return 480; },
    // ---- beach: dash ----
    wall: x => { firstTip('wall', x - 1200, 'Eine hohe Mauer! Drück FLITZ und renn durch!'); L.obs.push({ type: 'wall', x: x + 90, w: 60, h: 250 }); amberRow(x + 150, 4, GROUND - 90, 40); return 170; },
    tide: x => { firstTip('tide', x - 1200, 'Eine Welle! Spring drüber – oder FLITZ hindurch!'); L.obs.push({ type: 'tide', x: x + 420, w: 100, h: 118 }); amberArc(x + 60, 200, 100); return 240; },
    // ---- mountains: glide ----
    widegap: x => { firstTip('widegap', x - 1200, 'Ein breiter Abgrund! Spring und halte gedrückt – dann gleitest du!'); const w = 430 + Math.floor(R() * 70); L.pits.push({ x, w }); amberArc(x - 20, w + 40, 190); return w; },
    updraft: x => { firstTip('updraft', x - 1200, 'Aufwind! Er trägt dich hoch – halte gedrückt, dann trägt er noch mehr.'); const w = 400; L.pits.push({ x, w }); L.obs.push({ type: 'updraft', x: x + w / 2, w: 150 }); for (let i = 0; i < 5; i++) L.amb.push({ x: x + w / 2 + Math.sin(i) * 20, y: GROUND - 100 - i * 55, got: false }); return w; },
    avalanche: x => { firstTip('avalanche', x - 1200, 'Steinlawine! Spring drüber oder brüll sie kaputt!'); for (let i = 0; i < 2; i++) L.obs.push({ type: 'rollrock', x: x + 110 + i * 270, rot: 0 }); return 440; },
    // ---- underwater: swim ----
    coralgate: x => { const gh = 215, gy = 120 + Math.floor(R() * (GROUND - 120 - gh - 30)); L.obs.push({ type: 'cgate', x: x + 90, gapY: gy, gapH: gh }); for (let i = 0; i < 3; i++) L.amb.push({ x: x + 40 + i * 50, y: gy + gh / 2 + (i - 1) * 12, got: false }); return 190; },
    jellies: x => { firstTip('jelly', x - 1200, 'Quallen! Schwimm drumherum.'); for (let i = 0; i < 3; i++) L.obs.push({ type: 'jelly', x: x + 90 + i * 140, y0: 200 + (i % 2) * 110 + R() * 25, amp: 38 + R() * 28, ph: R() * 6, y: 220 }); return 440; },
    urchins: x => { firstTip('urchin', x - 1200, 'Seeigel am Boden! Schwimm drüber.'); for (let i = 0; i < 3; i++) L.obs.push({ type: 'urchin', x: x + 60 + i * 72 }); for (let i = 0; i < 4; i++) L.amb.push({ x: x + 30 + i * 60, y: 200 + Math.sin(i) * 20, got: false }); return 300; },
    sword: x => { firstTip('sword', x - 1200, 'Ein Schwertfisch! Schwimm aus dem Weg – oder brüll ihn weg!'); L.obs.push({ type: 'sword', x: x + 220, y: 230 + R() * 150, spd: 340, ph: 0, alpha: 1 }); return 260; },
    bubbles: x => { for (let i = 0; i < 9; i++) L.amb.push({ x: x + i * 50, y: 270 + Math.sin(i * 0.8) * 95, got: false }); return 440; },
    rockwall: x => { L.obs.push({ type: 'boulder', x: x + 90, w: 110, h: 270 }); for (let i = 0; i < 3; i++) L.amb.push({ x: x + 40 + i * 50, y: 150, got: false }); return 170; },
    geyser: x => { firstTip('geyser', x - 1200, 'Lava-Pfützen! Spring drüber, wenn es spritzt!'); L.obs.push({ type: 'geyser', x: x + 40, t: 0, fired: false }); return 100; },
  };
  let x = 900;
  if (endless) { L.endless = true; L.tierX = []; }
  else if (LV ? LV.li === 0 : wi === 0) {
    L.tips.push({ x: 260, text: 'Tippe auf den Bildschirm, um zu springen!' });
    L.obs.push({ type: 'rock', x: 1000, w: 56, h: 44 }); amberArc(940, 180, 110);
    amberRow(1300, 5);
    L.tips.push({ x: 1450, text: 'Zweimal schnell tippen = Doppelsprung!' });
    L.plats.push({ x: 2000, y: GROUND - 125, w: 240 }); L.plats.push({ x: 2300, y: GROUND - 230, w: 200 }); amberRow(2030, 4, GROUND - 165); amberRow(2330, 4, GROUND - 270);
    L.tips.push({ x: 2650, text: 'Drück auf BRÜLL, um den dicken Felsbrocken zu zerschmettern! (Kleine Steine überspringst du.)' });
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
  } else {
    L.tips.push({ x: 150, text: first ? fmt(th.startTip) : (LV && LV.boss ? 'Heute wartet am Ende ein Boss! Sammle Herzen und sei bereit.' : 'Los geht\'s – ' + (LV ? LV.title : th.name) + '!') });
    if (!first) { /* normal level, no tutorial */ }
    else if (wi === 1) { // new: duck
      L.seen.low = L.seen.swoop = 1;
      L.obs.push({ type: 'low', x: 1500, w: 150 }); amberRow(1420, 4, GROUND - 30, 45);
      L.tips.push({ x: 1700, text: 'Ein Flugsaurier fliegt ganz tief! Ducken – oder brüllen!' });
      const by = GROUND - 88; L.obs.push({ type: 'ptero', x: 2900, y: by, baseY: by, spd: 200, ph: 0, alpha: 1, low: true });
      if (!save.learned.duck) L.coach.push({ x: 1000, type: 'duck', text: 'DUCKEN gedrückt halten!' });
      x = 3300;
    } else if (wi === 2) { // new: stomp
      L.seen.geode = L.seen.compy = 1;
      L.obs.push({ type: 'geode', x: 1500 });
      L.tips.push({ x: 1600, text: 'Kompsis! Brüllen hilft nicht – spring ihnen auf den Kopf!' });
      for (let i = 0; i < 3; i++) L.obs.push({ type: 'compy', x: 2700 + i * 75, spd: 150, ph: i, alpha: 1 });
      if (!save.learned.stomp) L.coach.push({ x: 1000, type: 'jump', text: 'Spring hoch!' }, { x: 1180, type: 'stomp', text: 'Jetzt STAMPF drücken!' });
      x = 3300;
    } else if (wi === 5) { // new: dash
      L.seen.wall = 1; L.obs.push({ type: 'rock', x: 1100, w: 56, h: 44 }); amberArc(1040, 180, 110);
      L.tips.push({ x: 1000, text: 'Eine hohe Sandmauer! Drück FLITZ und renn mitten durch!' });
      L.obs.push({ type: 'wall', x: 1950, w: 60, h: 250 }); amberRow(2030, 4, GROUND - 90, 40);
      if (!save.learned.dash) L.coach.push({ x: 1450, type: 'dash', text: 'Drück FLITZ!' });
      x = 2600;
    } else if (wi === 6) { // new: swim
      L.seen.sword = L.seen.jelly = L.seen.urchin = 1;
      if (!save.learned.swim) L.coach.push({ x: 650, type: 'jump', text: 'Tippe – du schwimmst nach oben!' });
      L.obs.push({ type: 'cgate', x: 1500, gapY: 170, gapH: 235 }); for (let i = 0; i < 3; i++) L.amb.push({ x: 1440 + i * 50, y: 290, got: false });
      L.tips.push({ x: 700, text: 'Schwimm durch die Lücke im Korallentor!' });
      x = 2300;
    } else if (wi === 7) { // new: glide
      L.seen.widegap = 1; L.pits.push({ x: 1750, w: 470 }); amberArc(1710, 550, 200);
      if (!save.learned.glide) L.coach.push({ x: 1250, type: 'jump', text: 'Spring!' }, { x: 1400, type: 'glide', text: 'Jetzt GEDRÜCKT HALTEN – du gleitest!' });
      x = 2900;
    } else if (wi === 3) { // new: fire chili
      L.peppers.push({ x: 900, y: GROUND - 60, got: false });
      L.obs.push({ type: 'boulder', x: 1700, w: 110, h: 160 });
      if (!save.learned.fire) L.coach.push({ x: 1200, type: 'roar', text: 'Drück FEUER!' });
      x = 2200;
    }
  }
  const n = endless ? 300 : (LV ? LV.segs : th.segs), eggAt = endless ? [-1, -1, -1] : [Math.floor(n * 0.25), Math.floor(n * 0.55), Math.floor(n * 0.85)], cpAt = endless ? [] : [Math.floor(n * 0.35), Math.floor(n * 0.65)], tAt = endless ? -1 : (LV ? (LV.treasure >= 0 ? Math.floor(n * 0.45) : -1) : (wi === 4 ? -1 : Math.floor(n * 0.45)));
  let segI = 0;
  const HARD = ['raptor', 'ptero', 'swoop', 'compy', 'geyser', 'geode', 'pitRock', 'lowRock', 'compyRun', 'sword', 'jellies', 'avalanche'], COMBO = ['pitRock', 'lowRock', 'compyRun'];
  const NEEDS = { low: 'duck', lowRock: 'duck', swoop: 'duck', geode: 'stomp', wall: 'dash', widegap: 'glide', updraft: 'glide' };
  const pickPattern = () => { let pool = th.patterns.filter(k => !NEEDS[k] || SK[NEEDS[k]]); const tier = endless ? curTier : (LV ? Math.min(LV.maxTier, 1 + Math.floor(segI * 3 / n)) : 3); const easy = pool.filter(k => !HARD.includes(k)), mid = pool.filter(k => !COMBO.includes(k)); if (tier === 1 && easy.length) pool = easy; else if (tier === 2 && mid.length) pool = mid; return pool[Math.floor(R() * pool.length)]; };
  for (let i = 0; i < n; i++) {
    segI = i;
    if (endless && i > 0 && i % 26 === 0) { curTier++; L.tierX.push(x); }
    if (cpAt.includes(i)) { L.cps.push({ x, on: false }); x += 160; }
    if (endless ? (wi >= 3 && wi !== 5 && wi !== 6 && wi !== 7 && i % 14 === 7) : (SK.fire && (i === Math.floor(n * 0.33) || i === Math.floor(n * 0.78)))) { L.peppers.push({ x: x - 120, y: GROUND - 60, got: false }); }
    if (endless ? i % 18 === 11 : (i === Math.floor(n * 0.3) || i === Math.floor(n * 0.72))) { L.hearts.push({ x: x + 150, y: GROUND - 150 - 30 * (i % 2), got: false }); if (!L.heartTip) { L.heartTip = 1; L.tips.push({ x: x - 450, text: 'Ein Herz! Spring hoch und sammle es – dann bekommst du ein Leben zurück.' }); } }
    let w;
    if (i === eggAt[0]) {
      if (wi === 0) L.tips.push({ x: x - 1200, text: 'Da oben glänzt ein Ei! Spring auf die Plattformen!' });
      L.plats.push({ x, y: GROUND - 120, w: 200 }); L.plats.push({ x: x + 240, y: GROUND - 235, w: 200 });
      amberRow(x + 30, 3, GROUND - 160);
      L.eggs.push({ k: 0, x: x + 360, y: GROUND - 282 }); w = 460;
    } else if (i === eggAt[1]) {
      L.spots.push({ x: x + 40, k: 1, state: 'idle' });
      L.eggs.push({ k: 1, x: x + 340, y: GROUND - 150, hidden: true }); w = 440;
    } else if (i === tAt) {
      L.tips.push({ x: x - 1200, text: (LV ? LV.treasure === 3 : wi === 3) ? 'Da oben piepst etwas! Doppelsprung – zweimal schnell tippen!' : 'Da oben liegt etwas von Goetti! Doppelsprung – zweimal schnell tippen!' });
      L.plats.push({ x, y: GROUND - 250, w: 220 }); L.treasure = { k: LV ? LV.treasure : wi, x: x + 110, y: GROUND - 300, got: false }; w = 220;
    } else if (i === eggAt[2]) {
      L.pits.push({ x, w: 150 }); L.eggs.push({ k: 2, x: x + 75, y: GROUND - 195 }); w = 150;
    } else if (!endless && (wi === 2 || wi === 4) && i === Math.floor(n * 0.62)) { // stampede
      L.tips.push({ x: x - 1200, text: 'Eine Kompsi-Herde! Hüpf von Kopf zu Kopf!' });
      for (let k = 0; k < 4; k++) L.obs.push({ type: 'compy', x: x + 80 + k * 90, spd: 165, ph: k, alpha: 1 });
      for (let k = 0; k < 4; k++) L.obs.push({ type: 'compy', x: x + 560 + k * 90, spd: 175, ph: k, alpha: 1 });
      amberRow(x + 380, 4, GROUND - 110, 50); w = 960;
    } else if ((endless ? (wi === 3 && i % 17 === 9) : (wi === 3 && i === Math.floor(n * 0.15)))) { // lava river
      L.tips.push({ x: x - 1200, text: 'Ein Lava-Fluss! Hüpf über die Steine!' });
      L.pits.push({ x, w: 820 });
      [[40, 90], [250, 150], [460, 100], [650, 160]].forEach(([dx, h], k) => { L.plats.push({ x: x + dx, y: GROUND - h, w: 130 }); amberRow(x + dx + 20, 3, GROUND - h - 40, 40); });
      w = 820;
    } else {
      w = P[pickPattern()](x);
      if (endless && curTier >= 4 && R() < 0.4) { x += w + 170; w = P[pickPattern()](x); } // doubled-up dangers
    }
    x += w + (260 + R() * 200) * (endless ? Math.max(0.6, 1 - 0.07 * (curTier - 1)) : 1);
  }
  L.eggs.sort((a, b) => a.k - b.k);
  L.ambTotal = L.amb.length;
  x += 300;
  if (endless) L.gateX = 1e9; else if (bossKind) { L.bossX = x + 200; L.gateX = L.bossX + 1300; } else L.gateX = x + 500;
  return L;
}

// =====================================================================
// Play state
// =====================================================================
let scene = 'title', G = null, fadeT = 0;
function go(s) {
  scene = s; endlessPick = false; doorOverlay = null; parentMode = false; titlePress = 0; fadeT = 1; if (s === 'shop') { shopTab = 0; shopPage = 0; shopSel = save.equip.skin; shopTalk = { t: 4, text: 'Willkommen! Such dir etwas aus.' }; } parts = []; dialog = null; toasts = [];
  if (s === 'map' && save.treasureNew >= 0) { const k = save.treasureNew; save.treasureNew = -1; writeSave(); chestPop[k] = 1; startDialog([{ who: k === 3 ? 'kiwi' : 'goetti', text: k === 3 ? 'Kiwi! Kiwi! (Kiwi hüpft vor Freude.)' : TREASURES[k].line }].concat(k === 3 ? [{ who: 'goetti', text: TREASURES[3].line }] : [])); }
}

function startLevel(arg, endless) { // endless: arg = theme index. otherwise arg = calendar level index 0..23
  go('play');
  const LV = endless ? null : LEVELS[arg], wi = endless ? arg : LV.wi;
  const L = buildLevel(wi, !!endless, LV);
  G = { L, wi, li: endless ? -1 : arg, sk: skillsFor(endless ? null : arg, wi), cam: 0, t: 0, startT: 1.6, stopped: false, overlay: null, shake: 0, tip: null, eggsGot: [false, false, false], amber: 0,
    p: { wx: 200, y: GROUND, vy: 0, onGround: true, jumps: 0, coyote: 0, inv: 0, roarT: 0, roarCd: 0, hearts: 3, ph: 0, duck: false, stomp: false, spin: 1, fireT: 0, fireCd: 0, breathT: 0, roarMax: 3 },
    duckHeld: null, fireballs: [], flames: [],
    chili: { wx: 95, y: GROUND, ph: 0, dig: null, digT: 0 }, cp: 200, rings: [],
    boss: null, bossStarted: false, golden: null, gotGolden: false, atGate: false, gateT: 0, gateOpening: false, gateOpen: 0, finished: false,
    coach: null, flyEggs: [], slotPop: [0, 0, 0], hitFlash: 0, endless: !!endless, score: 0, heartAt: 500, tier: 1 };
  if (endless) { G.tip = { text: 'Endlos-Lauf! Es wird immer schneller und gefährlicher. Alle 500 Punkte gibt es ein Herz zurück.', t: 5 }; G.startT = 1.2; }
}

function jump() {
  const p = G.p; if (G.startT > 0.3) return;
  if (G.coach) { if (G.coach.type !== 'jump' && G.coach.type !== 'glide') return; G.coach = null; }
  if (G.L.swim) { p.vy = -380; p.jumps = 0; p.onGround = false; p.anti = 0.05; SFX.jump2(); burst(p.wx + 10, p.y - 40, 5, ['#e8ffff', '#fff'], 90, -60, 5, 0.6); return; }
  if (p.onGround || p.coyote > 0) { p.anti = 0.09; p.vy = -900; p.jumps = 1; p.coyote = 0; p.onGround = false; SFX.jump(); burst(p.wx, GROUND, 6, ['#d8c3a5', '#b39b7a'], 120, 300, 5, 0.4); }
  else if (p.jumps < 2) { p.vy = -760; p.jumps = 2; SFX.jump2(); G.rings.push({ x: p.wx, y: p.y, r: 10, a: 0.8, c: '255,255,255' }); }
}
function duckDown(id) {
  if (!G || scene !== 'play' || G.overlay || !G.sk.duck) return;
  const p = G.p; G.duckHeld = id;
  if (G.coach) { if (G.coach.type !== 'duck' && G.coach.type !== 'stomp') return; G.coach = null; }
  if (G.startT > 0.3) return;
  if (!p.onGround && !p.stomp && G.sk.stomp && !G.L.swim) { p.stomp = true; p.spin = 0; p.vy = Math.min(p.vy, -380); tone(300, 0.3, 'triangle', 0.08, 900); }
  else if (p.onGround) SFX.duck();
}
function dash() {
  const p = G.p; if (!G || scene !== 'play' || G.overlay || !G.sk.dash || G.L.swim || p.dashCd > 0 || G.startT > 0.3) return;
  if (G.coach) { if (G.coach.type !== 'dash') return; G.coach = null; }
  p.dashT = 0.4; p.dashCd = 1.7; SFX.dash(); G.rings.push({ x: p.wx + 20, y: p.y - 60, r: 12, a: 0.9, c: '255,255,255' });
}
function dashBreak(o) { // the dash smashes obstacles and sends enemies flying
  const th = WORLDS[G.wi];
  if (o.type === 'raptor' || o.type === 'ptero' || o.type === 'compy' || o.type === 'sword') { if (!o.scared) { o.scared = true; o.vx = 520; o.vy = -380; SFX.smash(); } return; }
  o.dead = true; SFX.smash(); burst(o.x, GROUND - (o.h || 60) / 2, 26, o.type === 'wall' && G.wi === 5 ? ['#f0dca0', '#d8b878', '#fff'] : [th.rock, '#5a4a3a', '#a89888'], 460, 1200, 9, 0.9);
  for (let i = 0; i < (o.type === 'wall' ? 5 : 2); i++) G.L.amb.push({ x: o.x + 40 + i * 36, y: GROUND - 60 - i * 18, got: false });
}
function duckUp(id) { if (G && (id == null || G.duckHeld === id)) G.duckHeld = null; }
function stompLand() {
  const p = G.p, th = WORLDS[G.wi];
  SFX.stomp(); G.shake = Math.max(G.shake, 0.45); G.freeze = 0.08;
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
  if (G.boss && G.boss.state === 'duel') { G.boss.meter = Math.min(1, G.boss.meter + 0.2); SFX.roar(); G.shake = Math.max(G.shake, 0.35); G.rings.push({ x: p.wx + 80, y: p.y - 100, r: 20, a: 1, c: '255,220,120' }); p.roarT = 0.3; return; }
  if (p.roarCd > 0 || G.startT > 0.3) return;
  p.roarT = 0.55; p.roarMax = G.boss ? 1.0 : 3.0; p.roarCd = p.roarMax; SFX.roar(); G.shake = Math.max(G.shake, 0.3);
  G.rings.push({ x: p.wx + 80, y: p.y - 100, r: 20, a: 1, c: '255,220,120' });
  for (const o of G.L.obs) {
    if (o.dead || o.scared) continue;
    const d = o.x - p.wx; if (d < -40 || d > 360) continue;
    if (o.type === 'boulder' || o.type === 'rollrock') {
      o.dead = true; SFX.smash(); const th = WORLDS[G.wi];
      burst(o.x, GROUND - (o.h || 40) / 2, 22, o.type === 'icicle' ? ['#e0f4ff', '#9fd3ff', '#fff'] : [th.rock, '#5a4a3a', '#a89888'], 420, 1300, 10, 0.9);
      for (let i = 0; i < 3; i++) G.L.amb.push({ x: o.x + 40 + i * 40, y: GROUND - 60 - i * 20, got: false });
    } else if (o.type === 'raptor' || o.type === 'ptero' || o.type === 'sword') { o.scared = true; o.vx = 380; o.vy = -320; }
    else if (o.type === 'compy' && d < 300 && !G.compyHint) { G.compyHint = true; toast('Kompsis sind zu frech – spring drauf!', '#ffe08a'); }
  }
}
function hurt(force) {
  const p = G.p; if (!force && (p.inv > 0 || p.dashT > 0)) return;
  p.hearts--; p.hitT = 0.45; G.hits = (G.hits || 0) + 1; p.inv = 1.8; SFX.hurt(); G.shake = p.hearts <= 0 ? 0 : 0.35; G.hitFlash = 0.45;
  try { if (navigator.vibrate) navigator.vibrate(180); } catch (e) {}
  if (!force) p.vy = Math.min(p.vy, -450);
  if (p.hearts <= 0) { if (G.endless) endRun(); else G.overlay = { type: 'retry' }; }
}
function endRun() {
  G.score = Math.max(G.score, Math.floor((G.p.wx - 200) / 25) + G.amber * 3);
  const prev = save.best[G.wi] || 0, isNew = G.score > prev;
  if (isNew) { save.best[G.wi] = G.score; } save.amber += G.amber; writeSave();
  G.overlay = { type: 'endover', isNew, prev, t: 0 }; SFX.wrong(); if (isNew) setTimeout(SFX.right, 350);
}
function pitFall() {
  const p = G.p, L = G.L;
  const pit = L.pits.find(q => p.wx > q.x - 60 && p.wx < q.x + q.w + 60);
  let nx = pit ? pit.x - 480 : p.wx - 480, guard = 0;
  while (!supported(L, nx) && guard++ < 30) nx -= 40;
  p.wx = nx; p.y = GROUND; p.vy = 0; G.chili.wx = nx - 105; G.startT = 1.4;
  hurt(true); p.inv = 3;
}
function retry() {
  const p = G.p, L = G.L;
  G.overlay = null; p.hearts = 3; p.inv = 2; p.wx = G.cp; p.y = GROUND; p.vy = 0; p.roarCd = 0; p.stomp = false; p.spin = 1; G.duckHeld = null; G.fireballs = []; G.flames = [];
  G.chili.wx = p.wx - 105; G.chili.dig = null;
  for (const s of L.spots) if (s.state === 'dig') s.state = 'idle';
  for (const o of L.obs) if ((o.type === 'raptor' || o.type === 'ptero' || o.type === 'compy') && o.x > G.cp - 300 && o.x < G.cp + 700) o.dead = true;
  if (G.bossStarted && !G.golden && !G.bossDone) { p.wx = L.bossX; G.chili.wx = p.wx - 90; G.boss = newBoss(G.bossCp || 0); G.stopped = true; for (const o of L.obs) if (o.minion) o.dead = true; if (G.boss.phase > 0) startBossPhase(G.boss); }
  G.startT = 0.9;
}
const BOSS_KINDS = {
  king: { name: 'Krallenkönig', duel: true, minions: ['raptor', 'compy', 'compy', 'compy'], phases: [
    { name: 'Sturmangriff', type: 'charge', say: 'Er stürmt los! Brülle genau dann, wenn er ganz nah ist!' },
    { name: 'Felsenhagel', type: 'volley', say: 'Felsen! Weich aus – und brüll, wenn er erschöpft ist!' },
    { name: 'Das Rudel', type: 'summon', say: 'Er ruft sein Rudel! Spring drauf, brüll sie weg – dann kommt er selbst!' },
    { name: 'Vulkanwut', type: 'leap', say: 'Die Lava kocht! Spring, wenn der Boden glüht!' }] },
  crab: { name: 'Krabbenkönig', duel: false, minions: ['compy', 'compy', 'compy', 'compy', 'compy'], phases: [
    { name: 'Kokosnuss-Hagel', type: 'volley', say: 'Kokosnüsse! Spring drüber oder dich ducken – und brüll, wenn er erschöpft ist!' },
    { name: 'Die Krabbenarmee', type: 'summon', say: 'Seine Krabben kommen! Hüpf auf ihre Köpfe – dann greift der König selbst an!' }] },
  kraken: { name: 'Das Seeungeheuer', duel: false, minions: ['sword', 'jelly', 'jelly', 'sword'], phases: [
    { name: 'Tintenkugeln', type: 'volley', say: 'Tintenkugeln! Schwimm hoch oder runter – und brüll, wenn er erschöpft ist!' },
    { name: 'Tentakel-Angriff', type: 'lane', say: 'Achtung, rote Streifen! Schwimm aus der Bahn, bevor es zuschlägt!' },
    { name: 'Das Tiefsee-Rudel', type: 'summon', say: 'Schwertfische und Quallen! Weich aus – dann kommt das Seeungeheuer selbst!' }] },
  queen: { name: 'Adlerkönigin', duel: false, minions: ['ptero', 'rollrock', 'compy'], phases: [
    { name: 'Federhagel', type: 'volley', say: 'Federn! Weich aus – und brüll, wenn sie erschöpft ist!' },
    { name: 'Sturzflug', type: 'leap', say: 'Sie stürzt herab! Spring über die Windwelle!' },
    { name: 'Sturmwolke', type: 'summon', say: 'Der Sturm ruft ihr Gefolge! Spring, gleite und brüll!' }] },
};
const bossKind = b => BOSS_KINDS[b.kind || 'king'];
function newBoss(phase = 0) {
  const home = G.L.bossX + 620;
  return { kind: G.L.bossKind || 'king', x: phase === 0 ? G.L.bossX + 1000 : home, y: 0, hp: 3, phase, state: phase === 0 ? 'enter' : 'taunt', t: 0, ph: 0, flash: 0, n: 0, rocks: [], hazards: [], volley: null, meter: 0.15, duelT: 0 };
}
function bossBanner(text, sub, col = '#ffd34d') { G.banner = { t: 2.6, text, sub, col }; }
function startBossPhase(b) {
  const ph = bossKind(b).phases[b.phase]; b.hp = 3; b.state = 'taunt'; b.t = 0; b.n = 0; b.rocks = []; b.hazards = []; G.bossCp = b.phase;
  bossBanner(`PHASE ${b.phase + 1}`, ph.name, b.phase === bossKind(b).phases.length - 1 && b.kind === 'king' ? '#ff6a3a' : '#ffd34d'); SFX.roar(); G.shake = Math.max(G.shake, 0.5);
  G.tip = { text: ph.say, t: 5 };
}
function bossHurt(b, bx) { // a successful roar: flash, shake, count down this phase's hp
  const p = G.p, K = bossKind(b); p.roarT = 0; b.hp--; b.flash = 0.5; SFX.smash(); G.shake = 0.5; G.hitFlash = 0;
  burst(bx - 40, GROUND - 120 + b.y, 34, ['#ffd740', '#fff', '#ff7043'], 420, 600, 8, 0.9);
  G.rings.push({ x: bx, y: GROUND - 120, r: 20, a: 1, c: '255,200,120' });
  if (b.hp > 0) { toast(b.hp === 2 ? 'Treffer! Noch 2 Mal!' : 'Super! Noch 1 Mal!', '#9cff8a'); b.state = 'back'; b.t = 0; return; }
  // phase cleared: the boss staggers, minions vanish, a heart falls down
  for (const o of G.L.obs) if (o.minion) o.dead = true;
  b.rocks = []; b.hazards = []; G.slowT = 0.5; G.L.hearts.push({ x: p.wx + 240, y: GROUND - 120, got: false });
  if (b.phase >= K.phases.length - 1) {
    if (K.duel) { b.state = 'duel'; b.t = 0; b.meter = 0.15; b.duelT = 0; bossBanner('LETZTES DUELL!', 'Brüll so oft du kannst!', '#ff5252'); SFX.roar(); }
    else { b.state = 'flee'; b.t = 0; G.slowT = 1.0; G.shake = 1; bossBanner('GESCHAFFT!', K.name + ' ist besiegt!', '#9cff8a'); SFX.roar(); burst(b.x, GROUND - 120, 70, ['#ffd740', '#fff', '#ff7043'], 600, 500, 9, 1.3); }
  } else { b.state = 'stagger'; b.t = 0; toast('Phase geschafft! Ein Herz fällt herunter!', '#ff8a9a'); }
}
function revealEgg(s) {
  G.chili.joy = 0.9;
  const e = G.L.eggs[s.k]; e.hidden = false; e.popping = true; e.ty = e.y; e.x0 = s.x; e.x = s.x; e.y = GROUND - 10; e.vy = -900; e.vx = (G.p.wx + 640 - s.x) / 1.1; SFX.pop();
  burst(s.x, GROUND - 5, 20, ['#8b5a2b', '#a0703a', '#ffe08a'], 260, 900, 7, 0.8);
}
const lastRiddle = {};
function openRiddle() {
  toasts = []; const pool = WORLDS[G.wi].riddles;
  if (!Array.isArray(save.riddleSeen) || save.riddleVer !== 2) { save.riddleSeen = [[], [], [], []]; save.riddleVer = 2; }
  let seen = (save.riddleSeen[G.wi] || []).filter(i => i < pool.length);
  const prev = seen[seen.length - 1];
  if (seen.length >= pool.length) seen = [];
  let free = pool.map((_, i) => i).filter(i => !seen.includes(i));
  if (free.length > 1) free = free.filter(i => i !== prev);
  const k = free[Math.floor(Math.random() * free.length)];
  seen.push(k); save.riddleSeen[G.wi] = seen; writeSave();
  const r = pool[k]; lastRiddle[G.wi] = r;
  G.overlay = { type: 'riddle', r, order: [0, 1, 2].sort(() => Math.random() - 0.5), wrong: [], msg: '', shake: 0, solved: false, lock: 0, hinted: false };
}
function answer(i) {
  const o = G.overlay, r = o.r;
  if (i === r.ok) { SFX.right(); o.solved = true; o.msg = ''; burst(G.cam + W / 2, 200, 40, ['#ffd740', '#ff5252', '#69f0ae', '#40c4ff', '#fff'], 450, 600, 7, 1.2); }
  else {
    SFX.wrong(); if (!o.wrong.includes(i)) o.wrong.push(i); o.msg = (r.wrongMsg && r.wrongMsg[i]) || 'Achtung, Trickfrage! Lies nochmal genau.'; o.shake = 0.4;
    o.lock = 2.5; if (save.amber > 0) { save.amber--; writeSave(); o.msg += ' (−1 Bernstein)'; }
  }
}
function openGate() { G.overlay = null; G.gateOpening = true; toast('Das Tor geht auf!', '#9cff8a'); burst(G.L.gateX - 10, GROUND - 200, 50, ['#ffd740', '#ff5252', '#69f0ae', '#40c4ff', '#fff'], 500, 700, 8, 1.4); }
function finishLevel() {
  const li = G.li, lv = LEVELS[li], wasDone = save.lvDone[li];
  for (let k = 0; k < 3; k++) if (G.eggsGot[k]) save.lvE[li][k] = 1;
  G.newCard = !wasDone; save.lvDone[li] = 1;
  if (li === 0) save.tutorialDone = true;
  for (const [sk, d] of Object.entries(SKILL_DAYS)) if (lv.day >= d) save.learned[sk] = 1;
  G.earned = [G.eggsGot.every(Boolean), !G.hits, G.amber >= Math.ceil(G.L.ambTotal * 0.8)];
  G.newMedals = []; G.earned.forEach((e, k) => { if (e && !save.lvM[li][k]) G.newMedals.push(k); if (e) save.lvM[li][k] = 1; });
  const tk = G.L.treasure ? G.L.treasure.k : -1;
  G.newTreasure = tk >= 0 && G.L.treasure.got && !save.treasures[tk];
  if (G.newTreasure) { save.treasures[tk] = 1; save.treasureNew = tk; }
  save.amber += G.amber; writeSave();
  G.overlay = { type: 'complete', t: 0, popped: [], cpopped: [] }; SFX.right();
}

function updatePlay(dt) {
  const L = G.L, p = G.p, th = WORLDS[G.wi];
  for (const r of G.rings) { r.r += 500 * dt; r.a -= dt * 1.8; } G.rings = G.rings.filter(r => r.a > 0);
  G.shake = Math.max(0, G.shake - dt * (G.overlay ? 4 : 1));
  if (G.overlay) return;
  for (const c of L.coach) if (!c.done && p.wx >= c.x) { c.done = true; G.coach = c; }
  if (G.coach) return; // freeze-frame until Oli does the move
  if (G.freeze > 0) { G.freeze -= dt; return; }
  G.t += dt; if (G.slowT > 0) { G.slowT -= dt; dt *= 0.3; } if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  if (G.tip) { G.tip.t -= dt; if (G.tip.t <= 0) G.tip = null; }
  if (G.startT > 0) G.startT -= dt;
  let spd = (G.startT > 0 || G.stopped) ? 0 : L.speed * (L.endless ? 1 + clamp((p.wx - 200) / 50000, 0, 0.7) : 1 + 0.1 * clamp(p.wx / L.gateX, 0, 1));
  if (p.y > GROUND + 5) spd = 0;
  p.dashCd = Math.max(0, (p.dashCd || 0) - dt); if (p.dashT > 0) { p.dashT -= dt; spd *= 2.4; if (Math.random() < 0.7) burst(p.wx - 20, p.y - 20 - Math.random() * 60, 1, ['#fff', '#ffe08a'], 80, -40, 5, 0.35); }
  p.gliding = !!(G.sk.glide && !L.swim && G.holdJump != null && !p.onGround && !p.stomp && p.vy > 40);
  p.wx += spd * dt; p.ph += dt * (spd > 0 ? 13 : 2);
  // physics
  const prevY = p.y, wasGround = p.onGround, vy0 = p.vy; p.vy += (L.swim ? 520 : p.dashT > 0 ? GRAV * 0.25 : GRAV) * dt; if (L.swim) { if (G.duckHeld != null) p.vy += 1700 * dt; p.vy = clamp(p.vy, -430, 400); if (Math.random() < 0.05) burst(p.wx + 40, p.y - 80, 1, ['#dff'], 40, -120, 6, 0.8); } if (p.gliding) p.vy = Math.min(p.vy, 140); if (p.stomp) { if (p.spin < 1) { p.spin = Math.min(1, p.spin + dt / 0.36); p.vy = Math.min(p.vy, 120); if (p.spin >= 1) { p.vy = 1500; SFX.duck(); } } else p.vy = Math.max(p.vy, 1500); } p.y += p.vy * dt; p.onGround = false;
  if (L.swim && p.y < 175) { p.y = 175; p.vy = Math.max(0, p.vy); }
  if (p.vy >= 0) {
    for (const pl of L.plats) if (p.wx + 25 > pl.x && p.wx - 25 < pl.x + pl.w && prevY <= pl.y + 1 && p.y >= pl.y) { p.y = pl.y; p.vy = 0; p.onGround = true; break; }
    if (!p.onGround && supported(L, p.wx) && prevY <= GROUND + 4 && p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
  }
  if (p.onGround && !wasGround && vy0 > 250) { p.land = 0.16; if (vy0 > 400 && !p.stomp) burst(p.wx, p.y, 9, ['#d8c3a5', '#b39b7a', '#fff'], 150, 260, 5, 0.45); }
  p.anti = Math.max(0, (p.anti || 0) - dt); p.hitT = Math.max(0, (p.hitT || 0) - dt); p.land = Math.max(0, (p.land || 0) - dt);
  if (p.onGround) { p.coyote = 0.1; p.jumps = 0; if (p.stomp) { p.stomp = false; p.spin = 1; stompLand(); } } else p.coyote -= dt;
  const wasDuck = p.duck; p.duck = G.duckHeld != null && p.onGround;
  if (p.duck && !wasDuck && wasGround) burst(p.wx + 20, GROUND, 4, ['#d8c3a5', '#b39b7a'], 120, 300, 4, 0.3);
  p.fireT -= dt; p.fireCd -= dt; p.breathT -= dt;
  for (const pp of L.peppers) if (!pp.got && Math.abs(pp.x - p.wx - 10) < 50 && Math.abs(pp.y - (p.y - 50)) < 70) {
    pp.got = true; p.fireT = 8; SFX.power(); burst(pp.x, pp.y, 26, ['#ff5a1f', '#ffd166', '#fff'], 320, 400, 7, 0.8);
    toast(fmt('Feuer-Chili! {rex} kann Feuer spucken!'), '#ffb030');
    if (!G.pepperHint) { G.pepperHint = true; G.tip = { text: 'Feuer-Chili! Drück FEUER! (Echte Dinos konnten kein Feuer spucken – aber {rex} schon!)'.replace('{rex}', save.rexName || 'Rexi'), t: 5 }; }
  }
  for (const h of L.hearts) if (!h.got && Math.abs(h.x - p.wx - 10) < 52 && Math.abs(h.y - (p.y - 50)) < 70) {
    h.got = true; SFX.power(); burst(h.x, h.y, 26, ['#ff5a7a', '#ffb4c4', '#fff'], 320, 300, 7, 0.9);
    if (p.hearts < 3) { p.hearts++; toast('Ein Herz zurück!', '#ff8a9a'); } else { G.amber += 5; toast('Alle Herzen voll – 5 Bernstein extra!', '#ffe08a'); }
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
      else { o.dead = true; SFX.smash(); for (let i = 0; i < 2; i++) L.amb.push({ x: o.x + 40 + i * 40, y: GROUND - 60 - i * 20, got: false }); if (o.type === 'low') burst(o.x, GROUND - 160, 30, ART(G.wi) === 2 ? ['#e0f4ff', '#fff'] : ['#ff9a3c', '#ffd166', '#555'], 400, 600, 9, 1); }
    }
  }
  G.fireballs = G.fireballs.filter(f => f.life > 0);
  if (p.fireT > 0 && Math.random() < 0.25) { const [mx, my] = rexMouth(p.duck); const l = 0.4 + Math.random() * 0.3; G.flames.push({ x: p.wx + mx * 0.88, y: p.y + my * 0.92 + 2, vx: L.speed * (G.stopped ? 0 : 1) + 30, vy: -50 - Math.random() * 40, life: l, max: l, r: 2.5 + Math.random() * 2.5 }); }
  for (const f of G.flames) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy -= 260 * dt; f.vx *= 1 - 2.2 * dt; f.life -= dt; }
  G.flames = G.flames.filter(f => f.life > 0);
  if (p.y > H + 120) pitFall();
  p.inv -= dt; p.roarT -= dt; p.roarCd -= dt;
  G.cam = p.wx - 270;
  if (G.endless) { let tr = 1; for (const tx of L.tierX) if (p.wx >= tx) tr++; if (tr > G.tier) { G.tier = tr; SFX.power(); G.shake = Math.max(G.shake, 0.3); toast(['', '', 'Stufe 2 – mehr Gegner!', 'Stufe 3 – neue Gefahren!', 'Stufe 4 – doppelte Gefahren!'][tr] || `Stufe ${tr} – nur für Profis!`, '#ff9a5a'); }
    G.score = Math.max(G.score, Math.floor((p.wx - 200) / 25) + G.amber * 3); if (G.score >= G.heartAt) { G.heartAt += 500; if (p.hearts < 3) { p.hearts++; SFX.power(); toast('Ein Herz zurück!', '#ff8a9a'); } else toast(G.score + ' Punkte!', '#ffe08a'); } }
  // tips, checkpoints
  for (const t of L.tips) if (!t.shown && p.wx >= t.x) { t.shown = true; G.tip = { text: t.text, t: 6.5 }; }
  for (const c of L.cps) if (!c.on && p.wx >= c.x) { c.on = true; G.cp = c.x; SFX.flag(); if (p.hearts < 3) { p.hearts++; toast('Fähnchen erreicht – ein Herz zurück!', '#ff8a9a'); } else toast('Fähnchen erreicht!', '#ffe08a'); }
  // amber
  for (const a of L.amb) if (!a.got && Math.abs(a.x - p.wx - 10) < 42 && Math.abs(a.y - (p.y - 50)) < 62) { a.got = true; G.amber++; G.combo = G.t - (G.lastAmb || -9) < 0.6 ? Math.min(G.combo + 1, 8) : 0; G.lastAmb = G.t; if (G.combo > 0) tone(880 * Math.pow(1.0595, G.combo * 2), 0.12, 'triangle', 0.1); else SFX.amber(); burst(a.x, a.y, 6, ['#ffd166', '#ff9f1c'], 150, 200, 4, 0.4); }
  // eggs
  for (const e of L.eggs) {
    if (e.hidden || e.got) continue;
    if (e.popping) { e.vy += 1380 * dt; e.y += e.vy * dt; e.x += e.vx * dt; if (e.vy > 0 && e.y >= e.ty) { e.y = e.ty; e.popping = false; } }
    const ey = e.y + Math.sin(T * 3 + e.k) * 5;
    if (Math.hypot(e.x - (p.wx + 10), ey - (p.y - 50)) < 80) {
      e.got = true; G.eggsGot[e.k] = true; G.chili.joy = 0.9; SFX.egg(); G.flyEggs.push({ x: e.x - G.cam, y: ey, k: e.k, t: 0 }); burst(e.x, ey, 30, ['#fff3b0', '#ffd740', th.egg, th.eggSpot], 360, 500, 7, 1);
      toast('Ei gefunden! (' + (G.eggsGot.filter(Boolean).length) + ' von 3)', '#ffe08a');
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
  let target = p.wx - 105;
  if (c.dig) { target = c.dig.x; c.digT -= dt; if (Math.random() < 0.6) burst(c.dig.x + 10, GROUND - 4, 1, ['#8b5a2b', '#6b4226'], 160, 900, 5, 0.5); if (c.digT <= 0) { revealEgg(c.dig); c.dig.state = 'done'; c.dig = null; } }
  const mv = (L.speed + 260) * dt; c.wx += clamp(target - c.wx, -mv, mv);
  if (L.swim) { c.sy = c.sy == null ? GROUND : c.sy; c.sy += (p.y - 10 + Math.sin(T * 3) * 10 - c.sy) * Math.min(1, dt * 3); }
  c.joy = Math.max(0, (c.joy || 0) - dt);
  c.y = c.dig ? GROUND : GROUND - Math.abs(Math.sin(c.ph * 0.8)) * 14 - (c.joy > 0 ? Math.abs(Math.sin(c.joy * 11)) * 12 : 0);
  if (L.swim && c.sy != null) c.y = c.sy;
  for (const pit of L.pits) if (c.wx > pit.x - 30 && c.wx < pit.x + pit.w + 30) { const u = (c.wx - (pit.x - 30)) / (pit.w + 60); c.y = GROUND - 4 * 90 * u * (1 - u); }
  c.vy = (c.y - (c.py == null ? c.y : c.py)) / Math.max(dt, 1e-3); c.py = c.y;
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
      case 'wall': hb = { x: o.x - o.w / 2, y: GROUND - o.h, w: o.w, h: o.h }; break;
      case 'tide': if (d < 720) o.moving = true; if (o.moving) o.x -= 210 * dt; hb = { x: o.x - 70, y: GROUND - 118, w: 110, h: 118 }; break;
      case 'rollrock': if (d < 760) { o.x -= 250 * dt; o.rot = (o.rot || 0) - dt * 7; } hb = { x: o.x - 30, y: GROUND - 64, w: 60, h: 64 }; break;
      case 'urchin': hb = { x: o.x - 20, y: GROUND - 40, w: 40, h: 40 }; break;
      case 'jelly': o.y = o.y0 + Math.sin(T * 2 + o.ph) * o.amp; hb = { x: o.x - 22, y: o.y - 24, w: 44, h: 48 }; break;
      case 'sword':
        if (o.scared) { o.x += o.vx * dt; o.vy += 600 * dt; o.y += o.vy * dt; o.alpha -= dt * 1.2; if (o.alpha <= 0) o.dead = true; break; }
        if (d < 800) o.x -= o.spd * dt; hb = { x: o.x - 40, y: o.y - 12, w: 80, h: 24 }; break;
      case 'cgate': { const r1 = { x: o.x - 30, y: -30, w: 60, h: o.gapY + 30 }, r2 = { x: o.x - 30, y: o.gapY + o.gapH, w: 60, h: GROUND - (o.gapY + o.gapH) + 20 }; if (p.inv <= 0 && overlap(pb, r1) || p.inv <= 0 && overlap(pb, r2)) hurt(); break; }
      case 'updraft': if (Math.abs(o.x - p.wx) < o.w / 2 && !p.onGround) { p.vy -= (p.gliding ? 2600 : 1300) * dt; p.vy = Math.max(p.vy, -460); if (Math.random() < 0.5) burst(o.x + (Math.random() - 0.5) * o.w, GROUND - Math.random() * 120, 1, ['#fff', '#cfe8ff'], 60, -260, 5, 0.7); } break;
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
    if (hb && p.dashT > 0 && overlap({ x: p.wx - 30, y: p.y - 100, w: 170, h: 100 }, hb)) { dashBreak(o); continue; }
    if (hb && p.inv <= 0 && overlap(pb, hb)) hurt();
    if (o.x < G.cam - 300 && o.type !== 'icicle') o.dead = o.dead || (o.type === 'raptor' || o.type === 'ptero' || o.type === 'compy');
  }
  // boss
  if (L.bossX && !G.bossStarted && p.wx >= L.bossX) {
    G.bossStarted = true; G.stopped = true; p.wx = L.bossX; G.cp = L.bossX; G.boss = newBoss(0); G.bossCp = 0;
    G.tip = { text: 'Der Krallenkönig! Er ist stark – in 4 Phasen musst du ihn besiegen!', t: 5 };
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
  if (G.gateOpening) { G.gateOpen = Math.min(1, G.gateOpen + dt * 0.9); if (G.gateOpen >= 1 && !G.entering) G.stopped = false; }
  if (G.gateOpen >= 1 && !G.entering && p.wx >= L.gateX - 4) { G.entering = 0.001; G.stopped = true; p.wx = L.gateX; SFX.flag(); burst(L.gateX, GROUND - 100, 36, ['#fff3b0', '#ffd740', '#fff'], 360, 200, 6, 1.1); }
  if (G.entering) { G.entering += dt / 1.25; p.ph += dt * 11; if (G.entering >= 1 && !G.finished) { G.finished = true; finishLevel(); } }
}

function updateBoss(dt) {
  const b = G.boss, p = G.p, home = G.L.bossX + 620, L = G.L, K = bossKind(b), swim = L.swim, ty = (K.phases[Math.min(b.phase, K.phases.length - 1)] || {}).type;
  b.t += dt; b.ph += dt * 13; b.flash -= dt;
  const pb = p.duck ? { x: p.wx - 30, y: p.y - 56, w: 80, h: 52 } : { x: p.wx - 25, y: p.y - 92, w: 68, h: 88 };
  const roarHits = () => p.roarT > 0 && b.x - p.wx < 400 && b.state !== 'enter';
  // thrown projectiles (rocks, coconuts, ink, feathers)
  for (const r of b.rocks) {
    r.x -= 520 * dt; r.rot += dt * 9;
    if (!r.dead && p.inv <= 0 && overlap(pb, { x: r.x - 22, y: r.y - 24, w: 44, h: 48 })) { r.dead = true; hurt(); burst(r.x, r.y, 14, ['#7b6b5a', '#a89888'], 300, 900, 8, 0.6); }
    if (r.x < G.cam - 80) r.dead = true;
  }
  b.rocks = b.rocks.filter(r => !r.dead);
  // hazards: shock waves, lava eruptions under the player, and lane strikes for the swimming fight
  for (const h of b.hazards) {
    h.t += dt;
    if (h.kind === 'wave') { h.x += h.vx * dt; if (!h.dead && p.inv <= 0 && overlap(pb, { x: h.x - 20, y: GROUND - 38, w: 40, h: 38 })) { h.dead = true; hurt(); } if (h.x < G.cam - 80 || h.x > G.cam + W + 200) h.dead = true; }
    else if (h.kind === 'erupt') { if (h.t > h.warn && !h.fired) { h.fired = true; SFX.crack(); noise(0.5, 0.3, 700); } if (h.fired && h.t < h.warn + 0.6) { if (Math.random() < 0.8) burst(h.x, GROUND - 160 * Math.random(), 1, ['#ffcf3a', '#ff6a00'], 200, 600, 7, 0.6); if (p.inv <= 0 && overlap(pb, { x: h.x - 26, y: GROUND - 120, w: 52, h: 120 })) { hurt(); } } if (h.t > h.warn + 0.6) h.dead = true; }
    else if (h.kind === 'lane') { if (h.t > h.warn && !h.fired) { h.fired = true; SFX.crack(); noise(0.4, 0.3, 900); G.shake = Math.max(G.shake, 0.3); } if (h.fired && h.t < h.warn + 0.5 && p.inv <= 0 && overlap(pb, { x: p.wx - 200, y: h.y - 44, w: 900, h: 88 })) hurt(); if (h.t > h.warn + 0.5) h.dead = true; }
  }
  b.hazards = b.hazards.filter(h => !h.dead);
  const goBack = () => { b.state = 'back'; b.t = 0; };
  const projY = lane => swim ? GROUND - 30 - lane * 95 : (lane ? GROUND - 95 : GROUND - 22);
  const mkMinion = (k, i) => {
    const x = b.x - 50 - i * (k === 'compy' ? 85 : 120);
    if (k === 'sword') return { type: 'sword', x, y: GROUND - 60 - Math.random() * 230, spd: 300, ph: 0, alpha: 1, minion: true };
    if (k === 'jelly') return { type: 'jelly', x, y0: 190 + Math.random() * 200, amp: 40, ph: Math.random() * 6, y: 220, minion: true };
    if (k === 'ptero') return { type: 'ptero', x, y: GROUND - 165, baseY: GROUND - 165, spd: 200, ph: i, alpha: 1, minion: true };
    if (k === 'rollrock') return { type: 'rollrock', x, rot: 0, minion: true };
    return { type: k, x, spd: (k === 'raptor' ? 175 : 190) + (3 - b.hp) * 12, ph: i, alpha: 1, minion: true };
  };
  switch (b.state) {
    case 'enter': b.x -= 230 * dt; if (b.x <= home) { b.x = home; SFX.roar(); G.shake = 0.5; startBossPhase(b); } break;
    case 'taunt':
      if (b.t > (b.phase === 0 ? 1.0 : 0.9)) {
        b.n++; b.t = 0;
        if (ty === 'charge') b.state = 'charge';
        else if (ty === 'volley') { b.state = 'volley'; const len = 3 + (3 - b.hp) + (b.phase > 0 ? 1 : 0); b.volley = { seq: Array.from({ length: Math.min(6, len) }, () => swim ? Math.floor(Math.random() * 4) : (Math.random() < 0.5 ? 0 : 1)), i: 0, next: 0.2 }; }
        else if (ty === 'summon') b.state = 'summon';
        else if (ty === 'lane') { b.state = 'lanes'; b.laneN = 0; b.laneNext = 0.2; }
        else { b.state = 'crouch'; b.landX = p.wx + 250; }
      } break;
    case 'charge': {
      b.x -= (b.phase === 2 && b.kind === 'king' ? 450 : 340 + (3 - b.hp) * 55) * dt;
      const d = b.x - p.wx;
      if (d < 390 && roarHits()) bossHurt(b, b.x); else if (d < 115) { hurt(); goBack(); }
      break;
    }
    case 'volley': { // projectiles come in sequence; afterwards the boss is out of breath
      const v = b.volley; v.next -= dt;
      if (v.i < v.seq.length && v.next <= 0) { const ln = v.seq[v.i]; b.rocks.push({ x: b.x - 60, y: projY(ln), rot: 0 }); SFX.smash(); v.i++; v.next = 0.85; if (v.i < v.seq.length) toast(swim ? (v.seq[v.i] >= 2 ? 'Weiter oben – RUNTER!' : 'Weiter unten – HOCH!') : (v.seq[v.i] ? 'DUCKEN!' : 'SPRING!'), '#ffe08a'); }
      if (v.i >= v.seq.length && v.next < -1.0 && b.rocks.length === 0) { b.state = 'tired'; b.t = 0; b.target = p.wx + 340; toast('Er ist erschöpft – BRÜLL!', '#9cff8a'); }
    } break;
    case 'lanes': { // swimming fight: red stripes warn, then a tentacle sweeps the lane
      b.laneNext -= dt;
      if (b.laneN < 3 + (3 - b.hp) && b.laneNext <= 0) { b.hazards.push({ kind: 'lane', y: clamp(p.y - 50 + (Math.random() - 0.5) * 120, 150, GROUND - 40), warn: 0.95, t: 0, fired: false }); b.laneN++; b.laneNext = 1.15; }
      if (b.laneN >= 3 + (3 - b.hp) && b.hazards.length === 0) { b.state = 'tired'; b.t = 0; b.target = p.wx + 340; toast('Er ist erschöpft – BRÜLL!', '#9cff8a'); }
    } break;
    case 'summon':
      if (!b.summoned) {
        b.summoned = true; b.t = 0; SFX.roar(); G.shake = 0.4; const base = K.minions, n = b.hp === 3 ? 4 : b.hp === 2 ? 5 : 6;
        for (let i = 0; i < n; i++) L.obs.push(mkMinion(base[i % base.length], i));
        toast('Seine Helfer kommen!', '#ffe08a');
      }
      if (b.t > 2.2 && (b.t > 7 || !L.obs.some(o => o.minion && !o.dead && !o.scared && !o.flat && o.x > G.cam))) { b.summoned = false; b.state = b.kind === 'kraken' ? 'lanes' : 'charge'; b.laneN = 0; b.laneNext = 0.2; b.t = 0; toast('Jetzt kommt der Boss selbst!', '#ffb4a8'); }
      break;
    case 'crouch': // leap: a shadow marks the landing spot, then he jumps
      if (b.t > 0.75) { b.state = 'leap'; b.t = 0; b.fromX = b.x; SFX.jump(); }
      break;
    case 'leap': {
      const u = clamp(b.t / 0.7, 0, 1); b.x = b.fromX + (b.landX - b.fromX) * u; b.y = -Math.sin(u * Math.PI) * 280;
      if (u >= 1) { b.y = 0; b.state = 'tired'; b.t = 0; b.target = b.landX; SFX.stomp(); G.shake = 0.7; burst(b.x, GROUND, 40, ['#ff9a3c', '#ffd34d', '#5a2a1a'], 500, 800, 9, 0.9);
        b.hazards.push({ kind: 'wave', x: b.x - 60, vx: -420, t: 0 }); // shockwave rolls toward the player
        if (b.kind === 'king') { for (let i = 0; i < 2; i++) b.hazards.push({ kind: 'erupt', x: p.wx + 5, warn: 1.0 + i * 1.5, t: 0, fired: false }); toast('Lava! Spring, wenn es glüht!', '#ff9a5a'); }
        else toast('Windwelle! Spring drüber!', '#ff9a5a'); }
    } break;
    case 'tired': { // out of breath and close: the roar window
      if (b.x > b.target) b.x = Math.max(b.target, b.x - 420 * dt); else if (b.x < b.target) b.x = Math.min(b.target, b.x + 420 * dt);
      if (roarHits()) bossHurt(b, b.x); else if (b.t > (ty === 'leap' ? 3.4 : 2.6)) { toast('Zu langsam!', '#ffb4a8'); goBack(); }
    } break;
    case 'back': b.x += 700 * dt; b.y = 0; if (b.x >= home) { b.x = home; b.state = 'taunt'; b.t = 0; } break;
    case 'stagger': // between phases: he roars, the heart drops, the next phase starts
      if (b.t > 2.2) { b.phase++; startBossPhase(b); } break;
    case 'duel': { // final roar duel (king only): tap BRÜLL to push him back
      b.duelT += dt; b.meter = clamp(b.meter - dt * 0.3, 0, 1); b.x = p.wx + 120 + 300 * b.meter; b.y = 0;
      if (Math.random() < 0.5) burst(b.x - 30, GROUND - 40 - Math.random() * 120, 1, ['#fff', '#ffd34d'], 200, 100, 5, 0.5);
      if (b.meter >= 0.97) { b.state = 'flee'; b.t = 0; G.slowT = 1.4; G.shake = 1; G.hitFlash = 0; bossBanner('K.O.!', 'Der Krallenkönig fliegt davon!', '#9cff8a'); SFX.smash(); setTimeout(SFX.roar, 150); burst(b.x, GROUND - 120, 80, ['#ffd740', '#fff', '#ff7043', '#ff5252'], 700, 500, 9, 1.4); toast('Der Krallenkönig rennt davon!', '#9cff8a'); }
      else if (b.meter < 0.06 && b.duelT > 3.5) { hurt(); b.meter = 0.35; b.duelT = 0; G.shake = 0.5; toast('Nicht aufgeben – brüll lauter!', '#ffb4a8'); }
    } break;
    case 'flee': b.x += 620 * dt; b.y -= 260 * dt;
      if (b.t > 1.2 && !G.golden && !G.bossDone) { if (b.kind === 'king') { G.golden = { x: p.wx + 330, y: -60, vy: 0, landed: false }; SFX.pop(); } else { G.bossDone = true; G.stopped = false; SFX.right(); } }
      break;
  }
}


// ---------- the three new bosses (drawn facing +x, feet at y = 0; the caller flips them to face the player) ----------
function drawCrabKing(x, y, s, ph, flip, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const col = vgrad(-120, 0, '#ff8a6a', '#e0402a', '#9a2418'), dark = '#6a1408', snap = Math.sin(ph * 0.6) * 0.5 + 0.5;
  for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const k = Math.sin(ph * 0.5 + i * 1.3 + sd) * 4; ctx.strokeStyle = dark; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(sd * (14 + i * 14), -34); ctx.lineTo(sd * (46 + i * 14), -52 + k); ctx.lineTo(sd * (62 + i * 16), -2); ctx.stroke(); ctx.strokeStyle = '#c03020'; ctx.lineWidth = 4; ctx.stroke(); }
  for (const sd of [-1, 1]) { // raised claws that snap
    ctx.strokeStyle = dark; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(sd * 48, -66); ctx.lineTo(sd * 86, -96); ctx.lineTo(sd * 96, -124); ctx.stroke(); ctx.strokeStyle = '#e0402a'; ctx.lineWidth = 7; ctx.stroke();
    ctx.save(); ctx.translate(sd * 96, -128); ctx.fillStyle = col; for (const sg of [-1, 1]) { ctx.save(); ctx.rotate(sg * (0.15 + snap * 0.5) * sd); ctx.beginPath(); ctx.moveTo(-sg * 4 * sd, 0); ctx.quadraticCurveTo(sg * 26 * sd, -26, sg * 8 * sd, -58); ctx.quadraticCurveTo(-sg * 18 * sd, -30, -sg * 4 * sd, 0); ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); } ctx.restore();
  }
  ell(0, -62, 70, 42, 0, col); ctx.strokeStyle = dark; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(0, -62, 70, 42, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = '#ffb090'; for (const [dx, dy, r] of [[-30, -78, 8], [-6, -86, 10], [24, -80, 8], [40, -64, 6], [-44, -60, 6], [8, -52, 6]]) circle(dx, dy, r, '#ffb090'); ell(-10, -84, 26, 6, -0.1, 'rgba(255,255,255,.22)');
  for (const sd of [-1, 1]) { ctx.strokeStyle = dark; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sd * 20, -96); ctx.lineTo(sd * 24, -126); ctx.stroke(); circle(sd * 24, -132, 11, '#fff'); circle(sd * 27 - (flip ? 0 : 0), -131, 6, '#111'); circle(sd * 28.5, -133.5, 2.2, '#fff'); ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sd * 24 - 12, -146 + (sd < 0 ? 4 : -4)); ctx.lineTo(sd * 24 + 12, -146 + (sd < 0 ? -4 : 4)); ctx.stroke(); }
  ctx.strokeStyle = dark; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, -52, 14, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(-18, -98); ctx.lineTo(-20, -116); ctx.lineTo(-10, -108); ctx.lineTo(0, -122); ctx.lineTo(10, -108); ctx.lineTo(20, -116); ctx.lineTo(18, -98); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 2; ctx.stroke(); circle(0, -106, 3, '#e53935');
  ctx.restore();
}
function drawKraken(x, y, s, ph, flip, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const col = vgrad(-170, 0, '#c07ae0', '#8a44b8', '#4a1a78'), dark = '#2a0a48';
  for (let i = 0; i < 8; i++) { const base = -64 + i * 18, wv = Math.sin(ph * 0.35 + i * 0.9); ctx.strokeStyle = dark; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(base, -50); ctx.bezierCurveTo(base + wv * 30, -20, base + (i - 3.5) * 14 + wv * 14, -6, base + (i - 3.5) * 22 + (i < 4 ? -50 : 50), 2); ctx.stroke(); ctx.strokeStyle = i % 2 ? '#a458d0' : '#b46ae0'; ctx.lineWidth = 15; ctx.stroke(); ctx.fillStyle = '#e8c0f8'; for (let k = 1; k <= 4; k++) circle(base + (k * 0.2) * ((i - 3.5) * 22 + (i < 4 ? -50 : 50)) + wv * 6 * (1 - k * 0.2), -50 + k * 12, 3, '#e8c0f8'); }
  ell(0, -110, 62, 74, 0, col); ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -110, 62, 74, 0, 0, 7); ctx.stroke(); ell(-14, -150, 22, 8, -0.4, 'rgba(255,255,255,.22)');
  for (const [dx, dy, r] of [[-28, -136, 7], [24, -146, 6], [38, -118, 5], [-40, -102, 6]]) circle(dx, dy, r, '#a458d0');
  for (const sd of [-1, 1]) { const ex = sd * 25; circle(ex, -108, 17, '#fff'); circle(ex + sd * 2, -108, 10, '#ffd23a'); ell(ex + sd * 3, -108, 3, 9, 0, '#14100c'); ctx.strokeStyle = dark; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(ex - sd * 18, -130 + (sd < 0 ? 5 : -2)); ctx.lineTo(ex + sd * 16, -127 + (sd < 0 ? -6 : 6)); ctx.stroke(); }
  ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(-26, -168); ctx.lineTo(-30, -192); ctx.lineTo(-14, -180); ctx.lineTo(0, -198); ctx.lineTo(14, -180); ctx.lineTo(30, -192); ctx.lineTo(26, -168); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 2; ctx.stroke(); circle(0, -178, 4, '#40c4ff');
  ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -72, 16, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 9, -66); ctx.lineTo(-11 + i * 9, -58); ctx.lineTo(-8 + i * 9, -66); ctx.fill(); }
  ctx.restore();
}
function drawQueen(x, y, s, ph, flip, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fl = Math.sin(ph * 0.45), wing = (a, c1, c2, back) => { ctx.save(); ctx.translate(-4, -104); ctx.rotate(a); for (let k = 0; k < 8; k++) { ctx.save(); ctx.rotate(-k * 0.13); ctx.fillStyle = k % 2 ? c1 : c2; ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(-60, -11, -112 + k * 2, -3 - k * 1); ctx.quadraticCurveTo(-60, 7, 0, 5); ctx.fill(); ctx.strokeStyle = '#102050'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); } ctx.restore(); };
  wing(-1.0 + fl * 0.8, '#2a4a9a', '#1d3678', true);
  for (let k = -2; k <= 2; k++) { ctx.save(); ctx.translate(-46, -82); ctx.rotate(Math.PI + k * 0.2); ctx.fillStyle = k % 2 ? '#e8eefc' : '#cfd8f0'; ctx.beginPath(); ctx.ellipse(-26, 0, 30, 6, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a3a70'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
  ctx.strokeStyle = '#f0b020'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(10, -66); ctx.lineTo(14, -42); ctx.moveTo(-8, -64); ctx.lineTo(-6, -42); ctx.stroke(); ctx.fillStyle = '#f0b020'; for (const dx of [10, -8]) for (const t2 of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(dx + t2 * 0.5, -44); ctx.quadraticCurveTo(dx + t2, -34, dx + t2 * 1.3, -32); ctx.lineTo(dx + t2 * 0.4, -42); ctx.fill(); }
  ell(0, -90, 48, 32, -0.2, vgrad(-122, -58, '#4a6ac0', '#2a4a9a', '#1d3678')); ell(10, -80, 32, 18, -0.2, '#f4f6ff'); ctx.strokeStyle = '#102050'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -90, 48, 32, -0.2, 0, 7); ctx.stroke();
  ell(46, -116, 25, 23, 0, '#ffffff'); ctx.strokeStyle = '#8a98c8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(46, -116, 25, 23, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = '#f2b81a'; ctx.beginPath(); ctx.moveTo(64, -124); ctx.quadraticCurveTo(96, -118, 90, -96); ctx.quadraticCurveTo(80, -108, 62, -106); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 2.6; ctx.stroke();
  circle(54, -124, 8, '#fff'); circle(56, -124, 5, '#ffd23a'); circle(57, -124, 2.6, '#111'); ctx.strokeStyle = '#2a3a70'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(44, -138); ctx.lineTo(64, -131); ctx.stroke();
  ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(32, -134); ctx.lineTo(30, -152); ctx.lineTo(40, -144); ctx.lineTo(48, -158); ctx.lineTo(56, -144); ctx.lineTo(64, -152); ctx.lineTo(62, -134); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 2; ctx.stroke(); circle(47, -140, 3, '#e53935');
  wing(-0.5 + fl * 0.8, '#3a62c0', '#2f54a8', false);
  ctx.restore();
}

// ---------- play drawing ----------
function rim() { // dark outline for ground hazards; warm rim on the dark lava world so it still reads
  ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = ART(G.wi) === 3 ? 'rgba(255,170,90,.9)' : '#1b120c'; ctx.stroke();
}
function drawObstacle(o, cam, th) {
  const x = o.x - cam;
  if (x < -150 || x > W + 150) return;
  switch (o.type) {
    case 'rock': {
      const base = ART(G.wi) === 2 ? '#56657f' : th.rock;
      shadow(x, GROUND + 2, o.w * 0.75, 0.35);
      ctx.fillStyle = vgrad(GROUND - o.h, GROUND, shade(base, 1.35), base, shade(base, 0.6));
      ctx.beginPath(); ctx.moveTo(x - o.w / 2, GROUND); ctx.lineTo(x - o.w / 2 + 6, GROUND - o.h * 0.6); ctx.lineTo(x - o.w / 6, GROUND - o.h); ctx.lineTo(x + o.w / 4, GROUND - o.h * 0.9); ctx.lineTo(x + o.w / 2, GROUND - o.h * 0.4); ctx.lineTo(x + o.w / 2, GROUND); ctx.closePath(); ctx.fill(); rim();
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.moveTo(x - o.w / 2 + 8, GROUND - o.h * 0.55); ctx.lineTo(x - o.w / 6, GROUND - o.h + 4); ctx.lineTo(x, GROUND - o.h * 0.7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, GROUND - o.h * 0.8); ctx.lineTo(x + 10, GROUND - o.h * 0.4); ctx.lineTo(x + 2, GROUND - 6); ctx.stroke();
      if (ART(G.wi) === 2) { ell(x - 4, GROUND - o.h + 3, o.w * 0.28, 5, 0, '#fff'); }
      break;
    }
    case 'boulder': {
      shadow(x, GROUND + 2, o.w * 0.65, 0.35);
      ell(x, GROUND - o.h / 2 + 4, o.w / 2, o.h / 2, 0, ART(G.wi) === 3 ? '#3a2a26' : ART(G.wi) === 2 ? '#5a6a84' : '#7d7d86'); ctx.beginPath(); ctx.ellipse(x, GROUND - o.h / 2 + 4, o.w / 2, o.h / 2, 0, 0, Math.PI * 2); rim();
      ell(x - 14, GROUND - o.h * 0.66, o.w * 0.2, o.h * 0.14, -0.4, 'rgba(255,255,255,.18)');
      ctx.strokeStyle = ART(G.wi) === 3 ? `rgba(255,110,20,${0.6 + 0.4 * Math.sin(T * 4)})` : 'rgba(0,0,0,.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 10, GROUND - o.h + 14); ctx.lineTo(x + 4, GROUND - o.h * 0.6); ctx.lineTo(x - 6, GROUND - o.h * 0.4); ctx.lineTo(x + 12, GROUND - o.h * 0.15); ctx.stroke();
      if (ART(G.wi) === 2) ell(x, GROUND - o.h + 8, o.w * 0.35, 9, 0, '#fff');
      break;
    }
    case 'low': drawLow(o, x); break;
    case 'wall': { // a tall wall that only the dash can break
      shadow(x, GROUND + 2, o.w * 0.8, 0.35); const sand = G.wi === 5, c = sand ? '#e8cf8a' : th.rock;
      ctx.fillStyle = vgrad(GROUND - o.h, GROUND, shade(c, 1.25), c, shade(c, 0.7)); ctx.beginPath(); ctx.rect(x - o.w / 2, GROUND - o.h, o.w, o.h); ctx.fill(); rim();
      ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 2; for (let yy = GROUND - o.h + 36; yy < GROUND; yy += 36) { ctx.beginPath(); ctx.moveTo(x - o.w / 2, yy); ctx.lineTo(x + o.w / 2, yy); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(x, GROUND - o.h); ctx.lineTo(x - 6, GROUND - o.h * 0.5); ctx.lineTo(x + 8, GROUND - o.h * 0.25); ctx.stroke();
      ctx.fillStyle = vgrad(GROUND - o.h - 18, GROUND - o.h, shade(c, 1.3), c); for (let i = 0; i < 3; i++) ctx.fillRect(x - o.w / 2 + i * (o.w / 3) + 2, GROUND - o.h - 16, o.w / 3 - 5, 16);
      if (sand) { ctx.fillStyle = '#e53935'; ctx.fillRect(x - 1.5, GROUND - o.h - 44, 3, 30); ctx.beginPath(); ctx.moveTo(x + 1, GROUND - o.h - 44); ctx.lineTo(x + 22, GROUND - o.h - 37); ctx.lineTo(x + 1, GROUND - o.h - 30); ctx.fill(); }
      if (Math.sin(T * 6) > 0) otxt('FLITZ!', x, GROUND - o.h - 62, 22, '#ffd34d', '#000', 5);
      break;
    }
    case 'tide': { shadow(x, GROUND + 2, 70, 0.2); const wv = ctx.createLinearGradient(0, GROUND - 130, 0, GROUND); wv.addColorStop(0, '#bff3ff'); wv.addColorStop(0.35, '#4ac0ea'); wv.addColorStop(1, '#1d78c0'); ctx.fillStyle = wv; ctx.beginPath(); ctx.moveTo(x + 50, GROUND); ctx.lineTo(x + 50, GROUND - 40); ctx.quadraticCurveTo(x + 44, GROUND - 130, x - 20, GROUND - 126); ctx.quadraticCurveTo(x - 66, GROUND - 126, x - 74, GROUND - 88); ctx.quadraticCurveTo(x - 40, GROUND - 100, x - 50, GROUND - 60); ctx.quadraticCurveTo(x - 70, GROUND - 20, x - 74, GROUND); ctx.closePath(); ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#0a4a80'; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 6; i++) circle(x - 62 + i * 20 + Math.sin(T * 8 + i) * 3, GROUND - 120 + (i % 2) * 8 + Math.sin(T * 6 + i) * 3, 7, '#fff'); break; }
    case 'rollrock': { shadow(x, GROUND + 2, 34, 0.3); ctx.save(); ctx.translate(x, GROUND - 32); ctx.rotate(o.rot || 0); circle(0, 0, 32, th.rock); ctx.beginPath(); ctx.arc(0, 0, 32, 0, 7); rim(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(0, 4); ctx.lineTo(14, -14); ctx.moveTo(0, 4); ctx.lineTo(6, 22); ctx.stroke(); ctx.restore(); break; }
    case 'urchin': { shadow(x, GROUND + 2, 26, 0.3); ctx.save(); ctx.translate(x, GROUND - 22); ctx.strokeStyle = '#2a1840'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); ctx.stroke(); } circle(0, 0, 14, '#5a2a8a'); ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.strokeStyle = '#1a0a30'; ctx.lineWidth = 3; ctx.stroke(); circle(-4, -5, 4, 'rgba(255,255,255,.3)'); ctx.restore(); break; }
    case 'jelly': { const y = o.y || o.y0, pu = 1 + 0.1 * Math.sin(T * 5 + o.ph); ctx.save(); ctx.translate(x, y); ctx.scale(1 / pu, pu); ctx.fillStyle = 'rgba(255,150,200,.9)'; ctx.beginPath(); ctx.moveTo(-26, 4); ctx.bezierCurveTo(-28, -34, 28, -34, 26, 4); ctx.quadraticCurveTo(14, 10, 0, 4); ctx.quadraticCurveTo(-14, 10, -26, 4); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#8a2a6a'; ctx.stroke(); ctx.strokeStyle = 'rgba(255,190,225,.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 9, 6); ctx.quadraticCurveTo(i * 9 + Math.sin(T * 4 + i) * 6, 22, i * 9 - Math.sin(T * 3 + i) * 5, 38); ctx.stroke(); } circle(-8, -12, 4, 'rgba(255,255,255,.6)'); circle(-9, -6, 2.4, '#222'); circle(9, -6, 2.4, '#222'); ctx.restore(); break; }
    case 'sword': { const y = o.y, al = o.alpha == null ? 1 : Math.max(0, o.alpha); ctx.globalAlpha = al; ctx.save(); ctx.translate(x, y); ctx.scale(o.scared ? 1 : -1, 1); ctx.fillStyle = vgrad(-14, 14, '#9ab8d8', '#4f78a8'); ctx.beginPath(); ctx.ellipse(0, 0, 34, 13, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#4f78a8'; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-46, -14); ctx.lineTo(-44, 0); ctx.lineTo(-46, 14); ctx.fill(); ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(0, -26); ctx.lineTo(10, -10); ctx.fill(); ctx.fillStyle = '#dfe8f4'; ctx.beginPath(); ctx.moveTo(32, -2); ctx.lineTo(84, 0); ctx.lineTo(32, 3); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#1b2a44'; ctx.beginPath(); ctx.ellipse(0, 0, 34, 13, 0, 0, 7); ctx.stroke(); circle(20, -3, 5, '#fff'); circle(21.5, -3, 2.6, '#222'); ctx.strokeStyle = '#1b2a44'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(14, -10); ctx.lineTo(27, -6); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; break; }
    case 'cgate': { const col = ['#f0705a', '#e0a040'], seg = (y0, y1) => { ctx.fillStyle = vgrad(y0, y1, col[0], col[1], '#a8402a'); ctx.fillRect(x - 28, y0, 56, y1 - y0); ctx.strokeStyle = '#4a1a10'; ctx.lineWidth = 3; ctx.strokeRect(x - 28, y0, 56, y1 - y0); ctx.fillStyle = 'rgba(255,255,255,.2)'; for (let yy = y0 + 14; yy < y1; yy += 30) { circle(x - 12 + (yy % 60 ? 8 : 0), yy, 5, 'rgba(255,255,255,.35)'); } }; seg(-30, o.gapY); seg(o.gapY + o.gapH, GROUND + 20); for (const [yy, up] of [[o.gapY, 1], [o.gapY + o.gapH, -1]]) { ctx.fillStyle = '#ff9a7a'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(x + i * 11, yy, 7, up > 0 ? 0 : Math.PI, up > 0 ? Math.PI : Math.PI * 2); ctx.fill(); } } break; }
    case 'updraft': { ctx.save(); ctx.globalAlpha = 0.18; const gr = ctx.createLinearGradient(0, GROUND, 0, GROUND - 330); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(x - o.w / 2, GROUND - 330, o.w, 330); ctx.globalAlpha = 0.7; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = 0; i < 5; i++) { const q = ((T * 0.8 + i / 5) % 1), yy = GROUND - q * 300, xx = x + Math.sin(q * 9 + i * 2) * (o.w * 0.3); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - 6, yy + 14); ctx.moveTo(xx, yy); ctx.lineTo(xx + 6, yy + 14); ctx.stroke(); } ctx.restore(); break; }
    case 'geode': {
      ell(x, GROUND + 2, 40, 6, 0, 'rgba(0,0,0,.25)');
      ctx.fillStyle = vgrad(GROUND - 44, GROUND, '#a8a8b0', '#6e6e78', '#4a4a52'); ctx.beginPath(); ctx.moveTo(x - 38, GROUND); ctx.quadraticCurveTo(x - 40, GROUND - 40, x, GROUND - 44); ctx.quadraticCurveTo(x + 40, GROUND - 40, x + 38, GROUND); ctx.closePath(); ctx.fill(); rim();
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
      const ice = (pts) => { ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.fillStyle = '#c9ecff'; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = '#1d4a78'; ctx.stroke(); };
      if (o.state === 'hang') { const tipX = x + Math.sin(T * 30) * (o.x - G.p.wx < 600 ? 1.5 : 0); ice([[x - 16, 52], [x + 16, 52], [tipX, 122]]); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(x - 9, 56); ctx.lineTo(x - 3, 56); ctx.lineTo(tipX - 2, 100); ctx.fill(); }
      else if (o.state === 'fall') { ice([[x - 16, o.y - 74], [x + 16, o.y - 74], [x, o.y]]); }
      else { shadow(x, GROUND + 2, 30, 0.3); ice([[x - 22, GROUND], [x - 14, GROUND - 30], [x - 4, GROUND - 56], [x + 5, GROUND - 34], [x + 13, GROUND - 42], [x + 22, GROUND]]); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.moveTo(x - 12, GROUND - 6); ctx.lineTo(x - 9, GROUND - 28); ctx.lineTo(x - 4, GROUND - 48); ctx.lineTo(x - 3, GROUND - 6); ctx.fill(); }
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
function drawGate(L, cam, front) {
  const gx = L.gateX - cam; if (gx < -260 || gx > W + 260) return;
  const stone = ART(G.wi) === 3 ? '#3b2c28' : ART(G.wi) === 2 ? '#8fa3bb' : '#8a7a68', hw = 62, open = G.gateOpen, ent = G.entering ? clamp(G.entering, 0, 1) : 0;
  const frame = () => { // pillars + lintel with the world's egg on top
    for (const px of [gx - hw - 46, gx + hw]) { rr(px, GROUND - 232, 46, 232, 6); ctx.fillStyle = stone; ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 5; i++) ctx.fillRect(px, GROUND - 232 + i * 46, 46, 3); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2.5; rr(px, GROUND - 232, 46, 232, 6); ctx.stroke(); }
    rr(gx - hw - 60, GROUND - 274, hw * 2 + 120, 46, 8); ctx.fillStyle = stone; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2.5; ctx.stroke();
    drawEgg(gx, GROUND - 251, 16, WORLDS[G.wi].egg, WORLDS[G.wi].eggSpot);
    if (ART(G.wi) === 2) { ell(gx, GROUND - 274, hw + 60, 9, 0, '#fff'); for (let i = 0; i < 7; i++) circle(gx - 108 + i * 36, GROUND - 226, 4, ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff'][(i + Math.floor(T * 3)) % 4]); }
  };
  if (front) { frame(); return; }
  // light spilling out of the opened gate
  if (open > 0) { const g = ctx.createRadialGradient(gx, GROUND - 100, 10, gx, GROUND - 100, 260); g.addColorStop(0, `rgba(255,232,150,${0.55 * open * (0.6 + 0.4 * ent)})`); g.addColorStop(1, 'rgba(255,232,150,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 260, GROUND - 360, 520, 360); }
  // the doorway: a dim passage that turns bright as the gate opens
  ctx.fillStyle = vgrad(GROUND - 212, GROUND, '#1d1526', '#3a2a40', '#6b4a52'); ctx.fillRect(gx - hw, GROUND - 212, hw * 2, 212);
  if (open > 0) { const g = ctx.createRadialGradient(gx, GROUND - 90, 4, gx, GROUND - 90, 120); g.addColorStop(0, `rgba(255,244,190,${(0.55 + 0.45 * ent) * open})`); g.addColorStop(1, 'rgba(255,200,110,0)'); ctx.save(); ctx.beginPath(); ctx.rect(gx - hw, GROUND - 212, hw * 2, 212); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(gx - hw, GROUND - 212, hw * 2, 212); ctx.restore(); }
  const dy = open * 214;
  ctx.save(); ctx.beginPath(); ctx.rect(gx - hw, GROUND - 214, hw * 2, 214); ctx.clip();
  rr(gx - hw + 2, GROUND - 212 - dy, hw * 2 - 4, 212, 6); ctx.fillStyle = '#6b4a2b'; ctx.fill();
  ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 4; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(gx - hw + i * (hw * 2 / 5), GROUND - 212 - dy); ctx.lineTo(gx - hw + i * (hw * 2 / 5), GROUND - dy); ctx.stroke(); }
  otxt('?', gx, GROUND - 110 - dy, 64, '#ffd34d', '#3b1d00', 8);
  ctx.restore();
  frame();
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
  lbl('Mamasaurus', x0 + 180); lbl('Papasaurus', x0 + 320); lbl('Fabiosaurus', x0 + 450);
  if (cheer) {
    const lines = [['Los, Oli!', x0 + 240, 180], [fmt('Du schaffst das, {rex}!'), x0 + 390, 160], ['Oli! Oli! Oli!', x0 + 480, 225]];
    lines.forEach(([s, x, y], i) => { if (Math.sin(T * 1.5 + i * 2.1) > -0.2) { setFont(18); const w = ctx.measureText(s).width + 20; rr(x - w / 2, y - 16, w, 32, 14); ctx.fillStyle = '#fff'; ctx.fill(); txt(s, x, y, 18, '#3b2410'); } });
  }
}
function drawAurora() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  [['60,255,170', 70, 0], ['150,90,255', 120, 2], ['60,200,255', 95, 4]].forEach(([c, y, ph]) => {
    const g = ctx.createLinearGradient(0, y - 40, 0, y + 80); g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(0.4, `rgba(${c},${0.22 + 0.08 * Math.sin(T * 0.8 + ph)})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, y - 40);
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, y + Math.sin(x * 0.012 + T * 0.5 + ph) * 26 - 20);
    ctx.lineTo(W, y + 90); ctx.lineTo(0, y + 90); ctx.closePath(); ctx.fill();
  });
  ctx.restore(); ctx.fillStyle = 'rgba(8,16,60,.28)'; ctx.fillRect(0, 0, W, GROUND);
}
function drawPlay() {
  const L = G.L, p = G.p, th = WORLDS[G.wi], cam = G.cam;
  perfWatch();
  ctx.save();
  if (G.shake > 0 && !G.overlay) ctx.translate((Math.random() - 0.5) * 16 * G.shake, (Math.random() - 0.5) * 16 * G.shake);
  drawBackground(ART(G.wi), cam);
  if (G.wi === 4) { drawAurora(); }
  if (L.bossKind === 'king') drawFamilyCliff(L, cam);
  drawGround(ART(G.wi), L, cam);
  for (const pl of L.plats) drawPlatform(pl, cam, ART(G.wi));
  for (const c of L.cps) { const x = c.x - cam; if (x < -50 || x > W + 50) continue; ctx.fillStyle = '#5b4636'; ctx.fillRect(x - 3, GROUND - 110, 6, 110); const fy = c.on ? GROUND - 108 : GROUND - 40; ctx.fillStyle = c.on ? '#ffd34d' : '#999'; ctx.beginPath(); ctx.moveTo(x + 3, fy); ctx.lineTo(x + 46 + Math.sin(T * 6) * 4, fy + 14); ctx.lineTo(x + 3, fy + 28); ctx.fill(); }
  for (const s of L.spots) { const x = s.x - cam; if (x < -50 || x > W + 50) continue; if (s.state === 'done') ell(x, GROUND + 2, 26, 7, 0, '#1a0f08'); else { ell(x, GROUND, 30, 14, 0, '#7a5230'); for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 6 + i * 2); circle(x - 14 + i * 14, GROUND - 22 - i * 5, 3, '#fff6b0'); } ctx.globalAlpha = 1; } }
  drawGate(L, cam);
  for (const a of L.amb) if (!a.got) { const x = a.x - cam; if (x > -20 && x < W + 20) drawAmber(x, a.y + Math.sin(T * 4 + a.x) * 3, 10); }
  for (const e of L.eggs) if (!e.hidden && !e.got) { const x = e.x - cam; if (x > -60 && x < W + 60) drawEgg(x, e.y + Math.sin(T * 3 + e.k) * 5, 24, th.egg, th.eggSpot, 0.8 + 0.2 * Math.sin(T * 5), Math.sin(T * 2) * 0.1); }
  for (const o of L.obs) if (!o.dead && o.type !== 'low') drawObstacle(o, cam, th);
  for (const h of L.hearts) if (!h.got) { const x = h.x - cam; if (x > -60 && x < W + 60) { const y = h.y + Math.sin(T * 3 + h.x) * 6, pu = 1 + 0.08 * Math.sin(T * 6); const g = ctx.createRadialGradient(x, y, 4, x, y, 52); g.addColorStop(0, 'rgba(255,120,150,.6)'); g.addColorStop(1, 'rgba(255,120,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 52, 0, Math.PI * 2); ctx.fill(); drawHeart(x, y, 1.9 * pu, true); for (let k = 0; k < 3; k++) { const a = T * 2 + k * 2.1; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 6 + k); drawStar(x + Math.cos(a) * 30, y + Math.sin(a) * 22, 4, '#fff6b0'); } ctx.globalAlpha = 1; } }
  for (const pp of L.peppers) if (!pp.got) { const x = pp.x - cam; if (x > -40 && x < W + 40) { const y = pp.y + Math.sin(T * 4 + pp.x) * 5; const g = ctx.createRadialGradient(x, y, 4, x, y, 44); g.addColorStop(0, 'rgba(255,150,40,.65)'); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI * 2); ctx.fill(); drawPepper(x, y, 1.1, 0.4 + Math.sin(T * 3) * 0.2); } }
  if (L.treasure && !L.treasure.got) { const tr = L.treasure, x = tr.x - cam, y = tr.y + Math.sin(T * 3) * 6; if (x > -80 && x < W + 80) { const g = ctx.createRadialGradient(x, y, 5, x, y, 70); g.addColorStop(0, 'rgba(255,240,150,.7)'); g.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = save.treasures[tr.k] ? 0.6 : 1; drawTreasure(tr.k, x, y, 0.9); ctx.globalAlpha = 1; for (let i = 0; i < 4; i++) { const a = T * 2 + i * 1.57; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 6 + i); circle(x + Math.cos(a) * 44, y + Math.sin(a) * 30, 3, '#fff6b0'); } ctx.globalAlpha = 1; } }
  if (G.golden && !G.gotGolden) drawEgg(G.golden.x - cam, G.golden.y + (G.golden.landed ? Math.sin(T * 3) * 5 : 0), 32, '#ffd700', '#e0a800', 1.2, Math.sin(T * 2) * 0.1);
  if (G.boss && G.boss.x - cam < W + 260) {
    const b = G.boss, K = bossKind(b), bx = b.x - cam, hover = b.kind === 'queen' ? (b.state === 'tired' || b.state === 'stagger' ? 0 : b.state === 'leap' ? -150 * (1 - clamp(b.t / 0.7, 0, 1)) : -150 + Math.sin(T * 2) * 12) : 0, by = GROUND + b.y + hover, st = b.state, rage = b.kind === 'king' && b.phase === 3 && st !== 'flee';
    // hazards on the ground: shock waves and lava eruptions that warn first
    for (const h of b.hazards) {
      const hx = (h.x || 0) - cam;
      if (h.kind === 'lane') { const warn = h.t < h.warn; ctx.save(); if (warn) { ctx.globalAlpha = 0.25 + 0.2 * Math.sin(T * 16); ctx.fillStyle = '#ff2a2a'; ctx.fillRect(0, h.y - 44, W, 88); ctx.globalAlpha = 1; if (Math.sin(T * 14) > -0.3) otxt('!', W - 50, h.y, 46, '#ffd34d', '#7a0000', 7); } else if (h.t < h.warn + 0.5) { ctx.strokeStyle = '#9a4ad0'; ctx.lineWidth = 62; ctx.lineCap = 'round'; ctx.beginPath(); for (let x2 = W; x2 >= -10; x2 -= 14) ctx.lineTo(x2, h.y + Math.sin(x2 * 0.03 + T * 25) * 10); ctx.stroke(); ctx.strokeStyle = '#d6a0f0'; ctx.lineWidth = 34; ctx.stroke(); } ctx.restore(); continue; }
      if (h.kind === 'wave') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(hx, GROUND - 14, 4, hx, GROUND - 14, 46); g.addColorStop(0, 'rgba(255,240,170,.95)'); g.addColorStop(0.5, 'rgba(255,120,30,.6)'); g.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(hx, GROUND - 14, 46, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); ctx.strokeStyle = '#ff7a20'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(hx + 10, GROUND, 30, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
      else if (h.kind === 'erupt') {
        if (h.t < h.warn) { const u = h.t / h.warn, a = 0.45 + 0.35 * Math.sin(T * 18); ctx.globalAlpha = a; ell(hx, GROUND + 2, 40 + 20 * (1 - u), 9, 0, 'rgba(255,70,20,.8)'); ctx.strokeStyle = '#ffcf3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(hx, GROUND + 2, 70 * (1 - u) + 20, 14 * (1 - u) + 4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; if (Math.sin(T * 14) > -0.3) otxt('!', hx, GROUND - 40, 40, '#ffd34d', '#7a0000', 6); }
        else if (h.t < h.warn + 0.6) { const q = h.t - h.warn, hh = 280 * Math.min(1, q * 8) * Math.min(1, (0.6 - q) * 5); const lg = ctx.createLinearGradient(0, GROUND - hh, 0, GROUND); lg.addColorStop(0, '#fff3a0'); lg.addColorStop(1, '#ff5a00'); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(hx - 28, GROUND); for (let y = 0; y <= hh; y += 18) ctx.lineTo(hx - 24 + Math.sin(y * 0.1 + T * 30) * 6, GROUND - y); for (let y = hh; y >= 0; y -= 18) ctx.lineTo(hx + 24 + Math.sin(y * 0.1 + T * 30 + 1) * 6, GROUND - y); ctx.lineTo(hx + 28, GROUND); ctx.closePath(); ctx.fill(); }
      }
    }
    if (st === 'crouch' || st === 'leap') { const lx = b.landX - cam; ctx.globalAlpha = 0.45 + 0.3 * Math.sin(T * 16); ell(lx, GROUND + 2, 100, 16, 0, 'rgba(255,50,20,.7)'); ctx.globalAlpha = 1; otxt('!', lx, GROUND - 36, 44, '#ff5252', '#000', 7); }
    if (rage) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(bx, by - 120, 20, bx, by - 120, 260); g.addColorStop(0, `rgba(255,110,30,${0.35 + 0.15 * Math.sin(T * 9)})`); g.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = g; ctx.fillRect(bx - 270, by - 380, 540, 440); ctx.restore(); if (Math.random() < 0.35) burst(b.x - 60 + Math.random() * 140, GROUND - Math.random() * 200, 1, ['#ff9a3c', '#ffd34d', '#555'], 80, -160, 6, 0.9); }
    ctx.save(); if (b.flash > 0 && Math.sin(T * 40) > 0) ctx.globalAlpha = 0.4;
    shadow(bx, GROUND + 2, 80 * (1 - clamp(-b.y / 300, 0, 0.6)), 0.3);
    ctx.translate(bx + ({ crab: -40, queen: -110, kraken: -20 }[b.kind] || 0), by); let rot = 0, sy = 1, sx = 0;
    if (st === 'crouch') sy = 0.84 + 0.02 * Math.sin(T * 30); if (st === 'tired') rot = -0.13; if (st === 'stagger' || st === 'duel') sx = Math.sin(T * 60) * (st === 'duel' ? 4 : 2.5);
    if (st === 'leap') rot = -0.25 * Math.sin(clamp(b.t / 0.7, 0, 1) * Math.PI);
    ctx.translate(sx, 0); ctx.rotate(rot); ctx.scale(1, sy);
    const BC = [['#8b1a1a', '#4a0a0a'], ['#7a3a1a', '#3d1a08'], ['#5a2a7a', '#2a0f40'], ['#b01c10', '#5a0a04']][b.phase] || ['#8b1a1a', '#4a0a0a'];
    const anim = st === 'taunt' || st === 'tired' ? (b.kind === 'king' ? 0 : b.ph * 0.5) : b.ph, face = st !== 'flee';
    if (b.kind === 'crab') drawCrabKing(0, 0, 1.5, anim, face); else if (b.kind === 'kraken') drawKraken(0, 0, 1.45, anim, face); else if (b.kind === 'queen') drawQueen(0, 0, 1.7, anim, face); else oRaptor(0, 0, 2.3, anim, face, { col: BC[0], dark: BC[1], crown: true });
    ctx.restore();
    if (st === 'taunt' && b.phase === 0 && b.kind === 'king') otxt('!', bx - 70, GROUND - 230, 60, '#ff5252', '#000', 8);
    if (st === 'tired' || st === 'stagger') for (let i = 0; i < 3; i++) { const a = T * 4 + i * 2.1; drawStar(bx - 70 + Math.cos(a) * 52, by - 250 + Math.sin(a) * 14, 9, '#ffd740'); }
    for (const r of b.rocks) { const rx2 = r.x - cam, ry2 = r.y; shadow(rx2, GROUND + 2, 24, 0.3); ctx.save(); ctx.translate(rx2, ry2); ctx.rotate(r.rot); ell(0, 0, 24, 21, 0, b.kind === 'kraken' ? '#2a1a50' : b.kind === 'queen' ? '#e8eefc' : b.kind === 'crab' ? '#7a4a22' : WORLDS[G.wi].rock); ell(-6, -6, 10, 7, 0, 'rgba(255,255,255,.18)'); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 24, 21, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    if (st === 'charge') { const lx = G.p.wx + 390 - cam, near = b.x - G.p.wx < 390; ctx.save(); ctx.setLineDash([10, 8]); ctx.lineWidth = 4; ctx.strokeStyle = near ? `rgba(255,82,82,${0.6 + 0.4 * Math.sin(T * 24)})` : 'rgba(255,211,77,.7)'; ctx.beginPath(); ctx.moveTo(lx, GROUND - 230); ctx.lineTo(lx, GROUND); ctx.stroke(); ctx.restore(); }
  }
  // chili
  if (G.entering) { const u = clamp(G.entering, 0, 1), gx = L.gateX - cam, k = 1 - 0.62 * u; ctx.save(); ctx.translate(gx, GROUND); ctx.scale(k, k); ctx.translate(-gx, -GROUND); ctx.globalAlpha = 1 - 0.7 * u * u; }
  const c = G.chili; shadow(c.wx - cam + 6, GROUND + 2, 22 * clamp(1 - (GROUND - c.y) / 200, 0.4, 1), 0.25); chiliFx.vy = c.vy || 0; chiliFx.dig = !!c.dig; chiliFx.scared = G.p.hitT > 0 && !G.overlay ? G.p.hitT / 0.45 : 0; chiliFx.joy = c.joy > 0 ? c.joy / 0.9 : 0; oChili(c.wx - cam, c.y, 1.25, c.ph, c.dig ? false : (G.bossStarted && !G.golden));
  if (c.dig) otxt('!', c.wx - cam + 20, c.y - 70 - Math.abs(Math.sin(T * 10)) * 6, 36, '#ffd34d', '#3b1d00', 6);
  // baby + kiwi followers
  if (save.treasures[3]) oKiwi(p.wx - cam - 225, GROUND - (G.startT > 0 || G.stopped ? 0 : Math.abs(Math.sin(p.ph * 0.7 + 1)) * 12), 1.1, p.ph * 1.3);
  if (save.babyName) oBaby(p.wx - cam - 168, GROUND - (G.startT > 0 || G.stopped ? 0 : Math.abs(Math.sin(p.ph * 0.6)) * 10), 0.85, p.ph);
  // player
  { let sy = GROUND; for (const pl of L.plats) if (p.wx + 20 > pl.x && p.wx - 20 < pl.x + pl.w && pl.y >= p.y - 2) sy = Math.min(sy, pl.y); if (sy < GROUND || supported(L, p.wx)) shadow(p.wx - cam + 4, sy + 2, 52 * clamp(1 - (sy - p.y) / 260, 0.35, 1), 0.3); }
  if (p.fireT > 0) { const g = ctx.createRadialGradient(p.wx - cam + 10, p.y - 60, 10, p.wx - cam + 10, p.y - 60, 120); g.addColorStop(0, `rgba(${fireOf(save.equip.fire || 0).glow},${0.3 + 0.12 * Math.sin(T * 10)})`); g.addColorStop(1, `rgba(${fireOf(save.equip.fire || 0).b},0)`); ctx.fillStyle = g; ctx.fillRect(p.wx - cam - 110, p.y - 180, 240, 240); }
  const spinA = p.stomp && p.spin < 1 ? (3 * p.spin * p.spin - 2 * p.spin * p.spin * p.spin) * Math.PI * 2 : 0, scx = p.wx - cam + 4, scy = p.y - 66;
  if (spinA) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(scx, scy, 104, spinA - Math.PI / 2 - 1.3, spinA - Math.PI / 2); ctx.stroke(); ctx.save(); ctx.translate(scx, scy); ctx.rotate(spinA); ctx.translate(-scx, -scy); }
  if (p.dashT > 0) for (let gi = 1; gi <= 3; gi++) { ctx.globalAlpha = 0.28 / gi; oRex(p.wx - cam - gi * 38, p.y, 0.92, p.ph, 0.05, Object.assign(rexLook(G.wi), { rider: true, air: !p.onGround })); ctx.globalAlpha = 1; }
  if (L.swim || p.gliding) { ctx.save(); const rcx = p.wx - cam + 4, rcy = p.y - 60; ctx.translate(rcx, rcy); ctx.rotate(L.swim ? clamp(p.vy / 900, -0.4, 0.4) : 0.05); ctx.translate(-rcx, -rcy); G._tilt = true; }
  if (p.gliding) { const gx2 = p.wx - cam + 4, gy2 = p.y - 205; ctx.fillStyle = vgrad(gy2 - 28, gy2 + 6, '#ff6a5a', '#c0302a'); ctx.beginPath(); ctx.moveTo(gx2 - 70, gy2 + 8); ctx.quadraticCurveTo(gx2, gy2 - 52, gx2 + 70, gy2 + 8); ctx.quadraticCurveTo(gx2, gy2 - 6, gx2 - 70, gy2 + 8); ctx.fill(); ctx.strokeStyle = '#4a0a08'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#fff'; for (const dx of [-42, -14, 14, 42]) { ctx.beginPath(); ctx.moveTo(gx2 + dx, gy2 + 1); ctx.quadraticCurveTo(gx2 + dx * 0.6, gy2 - 36, gx2 + dx * 0.4, gy2 - 40); ctx.quadraticCurveTo(gx2 + dx * 0.5, gy2 - 20, gx2 + dx + 12, gy2 + 3); ctx.fill(); } ctx.strokeStyle = 'rgba(40,20,10,.7)'; ctx.lineWidth = 2; for (const dx of [-60, -20, 20, 60]) { ctx.beginPath(); ctx.moveTo(gx2 + dx, gy2 + 6); ctx.lineTo(gx2 + 4 + dx * 0.05, p.y - 150); ctx.stroke(); } }
  if (!(p.inv > 0 && Math.sin(T * 30) > 0.3)) oRex(p.wx - cam, p.y, 0.92, p.ph, p.roarT > 0 || p.breathT > 0 ? 1 : 0.05, Object.assign(rexLook(G.wi), { rider: true, vy: p.vy, sq: p.anti > 0 ? p.anti / 0.09 * 0.13 : !p.onGround ? -clamp(Math.abs(p.vy) / 1400, 0, 1) * 0.1 : (p.land > 0 ? p.land / 0.16 * 0.14 : 0), hurt: p.hitT > 0 && !G.overlay ? p.hitT / 0.45 : 0, air: !p.onGround, duck: p.duck, stomp: p.stomp && p.spin >= 1, fire: p.fireT > 0 }));
  if (spinA) ctx.restore();
  if (G._tilt) { ctx.restore(); G._tilt = false; }
  if (G.entering) { ctx.restore(); drawGate(L, cam, true); } // the frame closes over the heroes as they walk in
  for (const o of L.obs) if (!o.dead && o.type === 'low') drawObstacle(o, cam, th);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (p.breathT > 0) { // flame jet from the mouth
    const [mx0, my0] = rexMouth(p.duck), mx = p.wx - cam + mx0 * 0.92, my = p.y + my0 * 0.92, u = clamp(p.breathT / 0.3, 0, 1), len = 150 * (1.15 - u * 0.4);
    const g = ctx.createRadialGradient(mx, my, 2, mx, my, len); g.addColorStop(0, 'rgba(255,250,210,.95)'); g.addColorStop(0.25, `rgba(${fireOf(save.equip.fire || 0).a},.85)`); g.addColorStop(0.7, `rgba(${fireOf(save.equip.fire || 0).b},.45)`); g.addColorStop(1, `rgba(${fireOf(save.equip.fire || 0).c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(mx, my);
    for (let i = 0; i <= 10; i++) { const a = -0.28 + i * 0.056, r = len * (0.85 + 0.15 * Math.sin(T * 50 + i * 1.7)); ctx.lineTo(mx + Math.cos(a) * r, my + 10 + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    const g2 = ctx.createRadialGradient(mx, my, 1, mx, my, 50); g2.addColorStop(0, 'rgba(255,255,255,.9)'); g2.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(mx, my, 50, 0, Math.PI * 2); ctx.fill();
  }
  for (const f of G.flames) {
    const u = f.life / f.max, x = f.x - cam, r = f.r * (1.4 - u * 0.6);
    ctx.globalAlpha = Math.min(1, u * 1.4); { const fc = fireOf(save.equip.fire || 0).fl; ctx.fillStyle = u > 0.65 ? fc[0] : u > 0.35 ? fc[1] : fc[2]; }
    ctx.beginPath(); ctx.arc(x, f.y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of G.fireballs) {
    const x = f.x - cam, fl = 1 + 0.12 * Math.sin(T * 45);
    const g = ctx.createRadialGradient(x, f.y, 2, x, f.y, 40 * fl); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.3, `rgba(${fireOf(save.equip.fire || 0).a},.95)`); g.addColorStop(0.65, `rgba(${fireOf(save.equip.fire || 0).b},.5)`); g.addColorStop(1, `rgba(${fireOf(save.equip.fire || 0).c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, f.y, 40 * fl, 0, Math.PI * 2); ctx.fill();
    for (let k = 1; k <= 3; k++) { ctx.globalAlpha = 0.5 / k; circle(x - k * 16, f.y - k * 3 + Math.sin(T * 30 + k) * 3, 16 - k * 3, fireOf(save.equip.fire || 0).ball); }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (p.stomp && p.spin >= 1) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { const lx = p.wx - cam - 30 + i * 22; ctx.beginPath(); ctx.moveTo(lx, p.y - 150); ctx.lineTo(lx, p.y - 110); ctx.stroke(); } }
  for (const r of G.rings) { ctx.strokeStyle = `rgba(${r.c},${r.a})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(r.x - cam, r.y, r.r, -0.9, 0.9); ctx.stroke(); }
  drawParts(cam);
  if (th.snow) drawSnow(0.8);
  if (th.lava) drawEmbers();
  drawAmbient(ART(G.wi));
  drawForeground(ART(G.wi), cam);
  vignette(ART(G.wi));
  ctx.restore();
  // boss prompt
  if (G.boss && ((G.boss.state === 'charge' && G.boss.x - p.wx < 390) || G.boss.state === 'tired') && Math.sin(T * 20) > -0.5) otxt('JETZT BRÜLLEN!', W / 2, 250, 52, '#ff5252', '#000', 10);
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
  if (G.entering) { const u = clamp(G.entering, 0, 1); ctx.fillStyle = `rgba(255,246,214,${clamp(u * 1.15 - 0.2, 0, 0.96)})`; ctx.fillRect(0, 0, W, H); }
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
  if (G.startT > 0) { ctx.globalAlpha = clamp(G.startT * 2, 0, 1); otxt(`Welt ${G.wi + 1}: ${th.name}`, W / 2, 230, 58, '#ffd34d', '#3b1d00', 12); { const ns = ['', 'Neue Fähigkeit: DUCKEN', 'Neue Fähigkeit: STAMPFER', 'Neu: FEUER-CHILI'][G.wi]; if (ns && G.startT >= 0.7) otxt(ns, W / 2, 296, 34, '#9fd3ff', '#0b2448', 8); } if (G.startT < 0.7) otxt('Los!', W / 2, 300, 46, '#fff', '#000', 10); ctx.globalAlpha = 1; }
  if (G.overlay) drawOverlay();
}
function dashPos() { return G.sk.duck ? [196, H - 58, 46] : [76, H - 78, 54]; }
function drawHUD() {
  const p = G.p, th = WORLDS[G.wi];
  for (let i = 0; i < 3; i++) drawHeart(34 + i * 40, 38, 1.25, i < p.hearts);
  if (G.endless) { rr(W / 2 - 110, 12, 220, 54, 27); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); otxt(String(G.score), W / 2, 36, 32, '#ffe08a', 'rgba(0,0,0,.7)', 6); txt('Rekord ' + Math.max(save.best[G.wi] || 0, G.score), W / 2, 58, 14, 'rgba(255,255,255,.8)', 'center', 'normal'); rr(W / 2 - 52, 72, 104, 24, 12); ctx.fillStyle = G.tier >= 4 ? 'rgba(200,50,30,.85)' : G.tier >= 2 ? 'rgba(230,140,30,.85)' : 'rgba(40,110,170,.85)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke(); txt('Stufe ' + G.tier, W / 2, 85, 16, '#fff'); }
  else { rr(W / 2 - 92, 12, 184, 54, 27); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); }
  if (!G.endless) for (let k = 0; k < 3; k++) { const got = G.eggsGot[k] && !G.flyEggs.some(f => f.k === k), before = G.li >= 0 && save.lvE[G.li][k]; drawEgg(W / 2 - 50 + k * 50, 39, 17 * (1 + G.slotPop[k]), got || before ? th.egg : 'rgba(255,255,255,.15)', got || before ? th.eggSpot : 'rgba(255,255,255,.1)', got ? 0.6 : 0, 0, got ? 1 : before ? 0.45 : 1); }
  drawAmber(170 + 20, 38, 12); otxt(String(G.amber), 212, 39, 26, '#ffe08a', 'rgba(0,0,0,.7)', 5, 'left');
  if (!G.endless && !(G.bossStarted && !G.golden && !G.bossDone)) { // progress bar: how far to the gate, with flags, eggs, boss
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
  if (G.boss && G.boss.state !== 'enter' && !G.golden && !G.bossDone) { // boss health: four phase segments, or the duel meter
    const b = G.boss, x0 = W / 2 - 190, y0 = 74;
    rr(x0 - 10, y0 - 22, 400, 52, 16); ctx.fillStyle = 'rgba(20,6,6,.72)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d4a017'; ctx.stroke();
    txt(bossKind(b).name, x0 + 6, y0 - 8, 16, '#ffd34d', 'left'); txt(b.state === 'duel' ? 'BRÜLL-DUELL' : bossKind(b).phases[Math.min(bossKind(b).phases.length - 1, b.phase)].name, x0 + 380, y0 - 8, 14, b.kind === 'king' && b.phase === 3 ? '#ff9a5a' : '#fff', 'right', 'normal');
    if (b.state === 'duel') { rr(x0, y0 + 2, 380, 16, 8); ctx.fillStyle = '#400'; ctx.fill(); rr(x0, y0 + 2, Math.max(8, 380 * b.meter), 16, 8); ctx.fillStyle = vgrad(y0, y0 + 18, '#ffe27a', '#ff7a20'); ctx.fill(); }
    else for (let i = 0; i < bossKind(b).phases.length; i++) { const nP = bossKind(b).phases.length, sw = (380 - (nP - 1) * 8) / nP, sx = x0 + i * (sw + 8), frac = i < b.phase ? 0 : i === b.phase ? Math.max(0, b.hp) / 3 : 1; rr(sx, y0 + 2, sw, 16, 8); ctx.fillStyle = '#400'; ctx.fill(); if (frac > 0) { rr(sx, y0 + 2, Math.max(8, sw * frac), 16, 8); ctx.fillStyle = i === b.phase ? vgrad(y0, y0 + 18, '#ff6a5a', '#c01818') : '#8a2a2a'; ctx.fill(); } rr(sx, y0 + 2, sw, 16, 8); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.stroke(); }
  }
  if (G.banner) { const bn = G.banner, u = clamp(bn.t / 2.6, 0, 1), pop = 1 + 0.35 * clamp((bn.t - 2.2) / 0.4, 0, 1), al = clamp(bn.t * 2, 0, 1) * clamp((2.6 - bn.t) * 6, 0, 1); ctx.save(); ctx.globalAlpha = al; ctx.translate(W / 2, 215); ctx.scale(pop, pop); otxt(bn.text, 0, 0, 64, bn.col, '#000', 12); otxt(bn.sub, 0, 52, 30, '#fff', '#000', 8); ctx.restore(); }
  if (G.boss && G.boss.state === 'duel') { const b = G.boss; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(T * 18); otxt('BRÜLL! BRÜLL! BRÜLL!', W / 2, 330, 40, '#ffe27a', '#7a1000', 9); ctx.globalAlpha = 1; }
  if (G.tip) { ctx.globalAlpha = clamp(G.tip.t * 2, 0, 1); const lines = wrapLines(G.tip.text, 480, 20), h = 18 + lines.length * 25, tipY = H - h - 8; rr(W / 2 - 290, tipY, 580, h, 16); ctx.fillStyle = 'rgba(255,247,224,.95)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke(); drawPortrait('goetti', W / 2 - 254, tipY + h / 2, 24); lines.forEach((l, i) => txt(l, W / 2 + 30, tipY + 22 + i * 25, 20, '#3b2410')); ctx.globalAlpha = 1; }
  if (G.overlay) return;
  // pause
  circle(W - 44, 40, 26, 'rgba(0,0,0,.4)'); ctx.fillStyle = '#fff'; ctx.fillRect(W - 53, 28, 7, 24); ctx.fillRect(W - 42, 28, 7, 24);
  buttons.push({ x: W - 74, y: 10, w: 60, h: 60, cb: () => { G.overlay = { type: 'pause' }; } });
  // duck / stomp button
  if (G.sk.duck) { const dx = 76, dy = H - 78, held = G.duckHeld != null, air = !p.onGround && G.sk.stomp;
    const threat = G.L.obs.some(o => !o.dead && !o.scared && ((o.type === 'low') || (o.type === 'ptero' && o.low)) && o.x - p.wx > 0 && o.x - p.wx < 330) || (air && G.L.obs.some(o => !o.dead && !o.flat && (o.type === 'geode' || o.type === 'compy') && Math.abs(o.x - p.wx - 60) < 120));
    if (threat && !held) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T * 14); circle(dx, dy, 74 + 6 * Math.sin(T * 14), '#9fd3ff'); ctx.globalAlpha = 1; }
    circle(dx, dy, held ? 50 : 54, held ? 'rgba(30,80,170,.9)' : 'rgba(46,111,214,.6)');
    ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(dx, dy, held ? 50 : 54, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(dx - 14, dy - 30); ctx.lineTo(dx + 14, dy - 30); ctx.lineTo(dx, dy - 14); ctx.fill();
    otxt(G.L.swim ? 'TAUCHEN' : air ? 'STAMPF!' : 'DUCKEN', dx, dy + 10, air || G.L.swim ? 20 : 20, '#fff', 'rgba(0,0,0,.6)', 5); }
  if (G.sk.dash && !G.L.swim) { const [fx, fy, fr] = dashPos(), cd = p.dashCd > 0, wallAhead = G.L.obs.some(o => !o.dead && o.type === 'wall' && o.x - p.wx > 0 && o.x - p.wx < 420);
    if (wallAhead && !cd) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T * 14); circle(fx, fy, fr + 16 + 5 * Math.sin(T * 14), '#ffd34d'); ctx.globalAlpha = 1; }
    circle(fx, fy, fr, cd ? 'rgba(80,80,80,.7)' : 'rgba(230,130,20,.88)'); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.stroke();
    if (cd) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(fx, fy, fr - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCd / 1.7)); ctx.stroke(); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (const [dy2, l] of [[-12, 18], [-2, 26], [8, 18]]) { ctx.beginPath(); ctx.moveTo(fx - 22, fy + dy2 - 8); ctx.lineTo(fx - 22 + l, fy + dy2 - 8); ctx.stroke(); }
    otxt('FLITZ', fx, fy + 18, 17, '#fff', 'rgba(0,0,0,.6)', 4); }
  // roar / fire button
  const rx = W - 92, ry = H - 92, ready = p.roarCd <= 0 || (G.boss && G.boss.state === 'duel');
  if (p.fireT > 0 && !G.boss) {
    ctx.globalAlpha = 0.45 + 0.25 * Math.sin(T * 10); circle(rx, ry, 80, '#ffb030'); ctx.globalAlpha = 1;
    circle(rx, ry, 66, 'rgba(255,110,20,.92)'); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(rx, ry, 66, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(rx, ry, 58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.fireT / 8)); ctx.stroke();
    otxt('FEUER!', rx, ry, 26, '#fff', 'rgba(120,20,0,.8)', 5);
    buttons.push({ x: rx - 80, y: ry - 80, w: 160, h: 160, cb: roar, silent: true });
    return;
  }
  const target = G.L.obs.some(o => !o.dead && !o.scared && (o.type === 'raptor' || o.type === 'ptero' || o.type === 'boulder') && o.x - p.wx > 0 && o.x - p.wx < 360) || (G.boss && (G.boss.state === 'tired' || G.boss.state === 'duel' || (G.boss.state === 'charge' && G.boss.x - p.wx < 390)));
  if (ready && target) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T * 14); circle(rx, ry, 82 + 6 * Math.sin(T * 14), '#ffd34d'); ctx.globalAlpha = 1; }
  circle(rx, ry, 66, ready ? 'rgba(214,58,40,.85)' : 'rgba(80,80,80,.7)');
  if (!ready) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(rx, ry, 60, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.roarCd / (p.roarMax || 0.85))); ctx.stroke(); }
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
    const dx = 76, dy = H - 78;
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
    const fire = G.p.fireT > 0; circle(rx, ry, 66, fire ? 'rgba(255,110,20,1)' : 'rgba(214,58,40,1)'); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(rx, ry, 66, 0, Math.PI * 2); ctx.stroke();
    otxt(fire ? 'FEUER!' : 'BRÜLL!', rx, ry, 26, '#fff', 'rgba(0,0,0,.6)', 5);
    const bx = rx - 160 - Math.abs(Math.sin(T * 6)) * 18;
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(bx + 62, ry); ctx.lineTo(bx + 30, ry - 26); ctx.lineTo(bx + 30, ry - 11); ctx.lineTo(bx - 24, ry - 11); ctx.lineTo(bx - 24, ry + 11); ctx.lineTo(bx + 30, ry + 11); ctx.lineTo(bx + 30, ry + 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3b1d00'; ctx.lineWidth = 3; ctx.stroke();
  }
}
function woodFrame(x, y, w, h, r = 26, paper = '#fff3d6') {
  ctx.save(); rr(x, y + 8, w, h, r); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); ctx.restore();
  rr(x, y, w, h, r); ctx.fillStyle = vgrad(y, y + h, '#a06a3a', '#7b4f2b', '#4f3019'); ctx.fill();
  ctx.save(); rr(x, y, w, h, r); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2; for (let i = 0; i < h; i += 9) { ctx.beginPath(); ctx.moveTo(x, y + i); ctx.lineTo(x + w, y + i + (i % 18 ? 2 : -2)); ctx.stroke(); } ctx.restore();
  rr(x, y, w, h, r); ctx.lineWidth = 3.5; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
  const pad = 11; rr(x + pad, y + pad, w - pad * 2, h - pad * 2, Math.max(6, r - 8)); ctx.fillStyle = vgrad(y, y + h, shade(paper, 1.04), paper, shade(paper, 0.93)); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#3f2813'; ctx.stroke();
  ctx.save(); rr(x + pad, y + pad, w - pad * 2, h - pad * 2, Math.max(6, r - 8)); ctx.clip(); ctx.strokeStyle = 'rgba(120,80,30,.07)'; ctx.lineWidth = 1; for (let i = 0; i < h; i += 7) { ctx.beginPath(); ctx.moveTo(x, y + i); ctx.lineTo(x + w, y + i); ctx.stroke(); } ctx.restore();
  for (const [cx, cy] of [[x + 14, y + 14], [x + w - 14, y + 14], [x + 14, y + h - 14], [x + w - 14, y + h - 14]]) { circle(cx, cy, 4, '#d6b36a'); circle(cx - 1, cy - 1, 1.6, '#fff3c0'); }
}
function panel(x, y, w, h) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H); woodFrame(x, y, w, h); }
function stoneTablet(x, y, w, h) {
  ctx.save(); rr(x, y + 10, w, h, 30); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fill(); ctx.restore();
  rr(x, y, w, h, 30); ctx.fillStyle = vgrad(y, y + h, '#a9b0b8', '#7f8791', '#5c636d'); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#262b33'; ctx.stroke();
  ctx.save(); rr(x, y, w, h, 30); ctx.clip();
  for (let i = 0; i < 160; i++) { ctx.globalAlpha = 0.05 + hash(i + 40) * 0.1; circle(x + hash(i) * w, y + hash(i + 9) * h, 1 + hash(i + 3) * 3, hash(i + 5) > 0.5 ? '#fff' : '#000'); } ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(30,34,40,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w - 90, y); ctx.lineTo(x + w - 104, y + 40); ctx.lineTo(x + w - 84, y + 70); ctx.moveTo(x, y + h - 120); ctx.lineTo(x + 40, y + h - 108); ctx.lineTo(x + 52, y + h - 70); ctx.stroke();
  for (const [mx, my, mr] of [[x + 20, y + h - 18, 46], [x + w - 30, y + h - 12, 38], [x + 60, y + 6, 30]]) { ctx.globalAlpha = 0.5; ell(mx, my, mr, mr * 0.45, 0, '#5f8f46'); ell(mx + 8, my - 4, mr * 0.6, mr * 0.25, 0, '#86b85c'); ctx.globalAlpha = 1; }
  ctx.restore();
  rr(x + 14, y + 14, w - 28, h - 28, 22); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,24,30,.55)'; ctx.stroke(); rr(x + 17, y + 17, w - 34, h - 34, 20); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
}
function drawOverlay() {
  const o = G.overlay, th = WORLDS[G.wi];
  if (o.type === 'pause') {
    panel(280, 100, 400, 350); txt('Pause', W / 2, 155, 44, '#3b2410');
    button('Weiter spielen', 330, 200, 300, 64, () => { G.overlay = null; });
    button(save.muted ? 'Ton: aus' : 'Ton: an', 330, 284, 300, 56, () => { save.muted = !save.muted; writeSave(); }, { color: '#e0d2b0', size: 24 });
    button('Zur Karte', 330, 360, 300, 64, () => go('map'), { color: '#e0d2b0' });
  } else if (o.type === 'endover') {
    o.t += DT; panel(220, 90, 520, 360); drawPortrait('chili', W / 2, 160, 46);
    txt('Endlos-Lauf zu Ende!', W / 2, 232, 32, '#3b2410');
    txt(`${G.score} Punkte`, W / 2, 284, 46, '#c0701a');
    txt(o.isNew ? 'Neuer Rekord!' : `Rekord: ${o.prev}`, W / 2, 330, 24, o.isNew ? '#2e7d32' : '#6b4a2b');
    txt(`Bernstein: +${G.amber}`, W / 2, 362, 20, '#6b4a2b', 'center', 'normal');
    button('Nochmal!', 250, 384, 220, 56, () => startLevel(G.wi, true)); button('Karte', 490, 384, 220, 56, () => go('map'), { color: '#e0d2b0' });
  } else if (o.type === 'retry') {
    panel(220, 110, 520, 320); drawPortrait('chili', W / 2, 180, 50);
    txt('Oh nein! Nicht aufgeben!', W / 2, 262, 32, '#3b2410');
    txt('Chili meint: Nochmal ab dem letzten Fähnchen!', W / 2, 300, 22, '#6b4a2b', 'center', 'normal');
    button('Nochmal!', 290, 340, 200, 62, retry); button('Karte', 510, 340, 160, 62, () => go('map'), { color: '#e0d2b0' });
  } else if (o.type === 'riddle') {
    const r = o.r; o.shake = Math.max(0, o.shake - DT); o.solvedT = o.solved ? (o.solvedT || 0) + DT : 0;
    ctx.fillStyle = 'rgba(8,10,24,.55)'; ctx.fillRect(0, 0, W, H);
    // Goetti stands beside the tablet and points at it
    shadow(120, 508, 60, 0.35); oGoetti(120, 504, 1.25, !o.solved || (o.solvedT || 0) < 1.5);
    ctx.save(); if (o.shake > 0) ctx.translate(Math.sin(T * 60) * 8 * o.shake, 0);
    stoneTablet(236, 30, 700, 480);
    // rune medallion: dim until the riddle is solved, then it glows gold
    const rx = 296, ry = 96, glow = o.solved ? Math.min(1, o.solvedT * 3) : 0;
    if (glow > 0) { const g = ctx.createRadialGradient(rx, ry, 10, rx, ry, 70); g.addColorStop(0, `rgba(255,224,120,${0.8 * glow})`); g.addColorStop(1, 'rgba(255,224,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(rx, ry, 70, 0, Math.PI * 2); ctx.fill(); }
    circle(rx, ry, 34, '#4a525e'); circle(rx, ry, 29, glow > 0 ? '#ffd34d' : '#6a7380'); ctx.strokeStyle = glow > 0 ? '#7a5400' : '#2f353e'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(rx, ry - 17); ctx.lineTo(rx, ry + 17); ctx.moveTo(rx - 14, ry - 8); ctx.lineTo(rx, ry + 2); ctx.lineTo(rx + 14, ry - 8); ctx.moveTo(rx - 11, ry + 12); ctx.lineTo(rx + 11, ry + 12); ctx.stroke();
    const carve = (t, x, y, sz, al = 'left', col = '#f4ecd4') => { txt(t, x + 1.5, y + 2, sz, 'rgba(0,0,0,.55)', al); txt(t, x, y, sz, col, al); };
    carve('Goettis Rätsel-Tor', 350, 80, 22, 'left', '#d9c58a');
    button('🔊 Vorlesen', 770, 52, 150, 40, () => speak(o.solved ? r.why : r.q + ' ' + o.order.map(i => r.a[i]).join('? Oder ') + '?'), { size: 17, color: '#d8c8a0' });
    const qs = wrapLines(r.q, 600, 28).length > 3 ? 24 : 28, ql = wrapLines(r.q, 600, qs), by = Math.max(236, 150 + ql.length * (qs + 6) + 14);
    ql.forEach((l, i) => carve(l, 276, 150 + i * (qs + 6), qs, 'left'));
    if (!o.solved) {
      o.lock = Math.max(0, (o.lock || 0) - DT); const locked = o.lock > 0;
      o.order.forEach((ai, j) => {
        const bad = o.wrong.includes(ai), y = by + j * 74, x = 290;
        button(r.a[ai], x, y, 590, 62, () => { if (!bad && !locked) answer(ai); }, { color: bad ? '#d99a9a' : locked ? '#cdbf9a' : '#e8c26a', size: 30, disabled: false });
        circle(x + 36, y + 31, 20, bad ? '#8a3b3b' : '#5b3b22'); circle(x + 36, y + 31, 16, bad ? '#b25a5a' : '#7a5230'); txt(bad ? '✗' : 'ABC'[j], x + 36, y + 32, 22, '#ffe9a8');
      });
      if (!o.hinted && !o.wrong.length) button('💡 Tipp', 612, 52, 146, 40, () => {
        const bads = [0, 1, 2].filter(i => i !== r.ok); o.wrong.push(bads[Math.floor(Math.random() * 2)]); o.hinted = true;
        if (save.amber >= 2) { save.amber -= 2; writeSave(); } o.msg = 'Chili schnuppert: Diese Antwort stimmt nicht!'; SFX.dig();
      }, { size: 17, color: '#ffe08a' });
      if (o.msg) carve(locked ? o.msg.replace(/ \(.*\)$/, '') + ' – warte kurz …' : o.msg, 586, 486, 20, 'center', '#ffb4a8');
    } else {
      rr(290, 236, 590, 64, 26); ctx.fillStyle = vgrad(236, 300, '#b9f0a2', '#8fd678'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2e6a22'; ctx.stroke();
      txt('✓ ' + r.a[r.ok], 585, 269, 30, '#17420f');
      const ws = wrapLines(r.why, 610, 24).length > 2 ? 20 : 24;
      wrapLines(r.why, 610, ws).forEach((l, i) => carve(l, 585, 340 + i * (ws + 6), ws, 'center'));
      button('Tor öffnen!', 585 - 140, 424, 280, 62, openGate, { size: 28, icon: icon('play') });
    }
    ctx.restore();
  } else if (o.type === 'complete') {
    o.t += DT; const lv = LEVELS[G.li];
    panel(150, 24, 660, 492);
    otxt(`Tür ${lv.day} geschafft!`, W / 2, 70, 44, '#ffd34d', '#3b1d00', 10);
    // the day's dino card pops in (first time), flanked by the three eggs and the amber haul
    const u = G.newCard ? clamp((o.t - 0.3) * 3, 0, 1) : 1;
    if (G.newCard && u > 0 && !o.cpopped.includes(0)) { o.cpopped.push(0); SFX.egg(); burst(G.cam + W / 2, 146, 34, ['#fff3b0', '#ffd740', th.egg, th.eggSpot], 340, 500, 6, 1); }
    for (let k = 0; k < 3; k++) { const got = G.eggsGot[k] || save.lvE[G.li][k]; drawEgg(W / 2 - 290 + k * 52, 150, 21, got ? th.egg : '#ddd', got ? th.eggSpot : '#ccc', got ? 0.4 : 0, Math.sin(T * 3 + k) * (got ? 0.1 : 0)); }
    txt(`${save.lvE[G.li].filter(Boolean).length} von 3 Eiern`, W / 2 - 238, 196, 16, '#6b4a2b', 'center', 'normal');
    if (u <= 0) drawEgg(W / 2, 148, 30, th.egg, th.eggSpot, 0.6, Math.sin(T * 14) * 0.2);
    else { const sc = G.newCard ? (u < 1 ? 0.3 + u * 0.95 : 1 + 0.03 * Math.sin(T * 6)) : 1; ctx.save(); ctx.translate(W / 2, 148); ctx.rotate((hash(G.li * 3 + 1) - 0.5) * 0.08); ctx.scale(sc, sc); rr(-62, -46, 124, 92, 12); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.save(); ctx.translate(2, 4); ctx.fill(); ctx.restore(); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#8a6a3a'; ctx.stroke(); rr(-56, -40, 112, 62, 8); ctx.fillStyle = th.sky[1]; ctx.fill(); drawCardArt(G.li, 0, -10, 104, false); txt(FACTS[G.li].name, 0, 36, FACTS[G.li].name.length > 11 ? 14 : 17, '#2b1a00'); if (G.newCard && u >= 1) { ctx.save(); ctx.translate(46, -42); ctx.rotate(0.35); rr(-20, -10, 40, 20, 5); ctx.fillStyle = '#e53935'; ctx.fill(); txt('NEU', 0, 1, 13, '#fff'); ctx.restore(); } ctx.restore(); }
    drawAmber(W / 2 + 232, 150, 20); txt('+' + G.amber, W / 2 + 232, 190, 22, '#8a5a00');
    for (let k = 0; k < 3; k++) {
      const x = W / 2 - 200 + k * 200, on = save.lvM[G.li][k], isNew = G.newMedals.includes(k);
      const uu = isNew ? clamp((o.t - 0.5 - k * 0.45) * 3, 0, 1) : 1;
      if (isNew && uu > 0 && !o.popped.includes(k)) { o.popped.push(k); [784, 988, 1175, 1568].forEach((f, j) => tone(f, 0.25, 'triangle', 0.12, null, j * 0.06)); burst(G.cam + x, 250, 25, ['#ffd34d', '#fff', '#e8a317'], 300, 400, 6, 0.9); }
      const sc = isNew ? (uu < 1 ? uu * 1.35 : 1 + 0.05 * Math.sin(T * 6)) : 1;
      ctx.save(); ctx.translate(x, 262); ctx.scale(sc, sc); drawMedal(0, 0, 26, k, on && uu > 0); ctx.restore();
      txt(MEDALS[k][0], x, 306, 19, on ? '#3b2410' : '#999');
      txt(G.earned[k] ? 'geschafft!' : k === 2 ? `${G.amber} von ${Math.ceil(G.L.ambTotal * 0.8)}` : MEDALS[k][1], x, 328, 15, G.earned[k] ? '#2e7d32' : '#8a6a3a', 'center', 'normal');
      if (isNew && uu >= 1) txt('NEU!', x + 32, 232, 16, '#e53935');
    }
    if (G.newTreasure) { drawTreasure(G.L.treasure.k, W / 2 - 200, 380, 0.8); txt(TREASURES[G.L.treasure.k].name + ' gefunden!', W / 2 + 20, 384, 26, '#2e7d32'); }
    else { const tk = lv.treasure; const nextOpen = lv.day < 24 && lv.day === adventDay(); const missing = 3 - save.lvE[G.li].filter(Boolean).length;
      txt(nextOpen ? `Morgen öffnet sich Tür ${lv.day + 1} – bis dann!` : tk >= 0 && !save.treasures[tk] ? 'Goetti vermisst hier noch etwas … Schau mal ganz weit oben!' : missing ? 'Chili schnuppert: Hier sind noch Eier versteckt!' : 'Super gemacht!', W / 2, 384, 19, '#6b4a2b', 'center', 'normal'); }
    if (lv.day === 24) button('Weiter!', W / 2 - 150, 422, 300, 62, () => startEnding(), { color: '#e57373', textColor: '#fff' });
    else button('Zur Karte', W / 2 - 150, 422, 300, 62, () => go('map'));
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
  woodFrame(bx, by, bw, bh, 22);
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
  oRex(280, GROUND, 1.3, T * 13, 0.12 + 0.12 * Math.sin(T * 2), Object.assign(rexLook(0), { rider: true }));
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
    { who: 'goetti', text: 'Hallo Oli! Hier ist Goetti, aus meiner Dino-Forschungsstation in Neuseeland – direkt am grossen Vulkan.' },
    { who: 'goetti', text: 'Bei uns am anderen Ende der Welt ist alles etwas anders – sogar die Vögel: Unsere Kiwis können nicht fliegen!' },
    { who: 'goetti', text: 'Heute Nacht hat der Vulkan gebebt – und alle meine Dino-Eier sind davongerollt!' },
    { who: 'goetti', text: 'Ich brauche den mutigsten Dino-Forscher der Welt. Und das bist DU!' },
    { who: 'goetti', text: 'Zum Glück hast du einen starken Freund: einen jungen T-Rex! Aber er hat noch keinen Namen…' },
  ], () => askName('Wie soll dein T-Rex heissen?', 'Rexi', name => {
    save.rexName = name; writeSave();
    startDialog([
      { who: 'rex', text: 'ROOOAAARRR! ({rex} gefällt der Name!)' },
      { who: 'goetti', text: '{rex} – super Name! Und Chili kommt auch mit. Mit der Hasennase findet Chili jedes versteckte Ei!' },
      { who: 'chili', text: 'Schnupper, schnupper… Chili ist bereit!' },
      { who: 'goetti', text: 'Jeden Tag bis Weihnachten öffnet sich eine neue Tür in meinem Adventskalender – hinter jeder wartet ein Abenteuer! Und am Schluss wartet das goldene Ei… Los geht\'s!' },
    ], () => go('map'));
  }));
}
function drawNZFlag(x, y, w, h, t, pole = 70) { // flag on a pole, waving a little
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#c9c9d2'; rr(-3, -6, 6, h + pole + 6, 3); ctx.fill(); circle(0, -8, 4, '#ffd34d');
  for (let i = 0; i < 12; i++) { // vertical slices give a cheap wave
    const sx = i * w / 12, off = Math.sin(t * 3 + i * 0.55) * (1 + i * 0.35); ctx.save(); ctx.beginPath(); ctx.rect(3 + sx, off - 1, w / 12 + 1, h + 2); ctx.clip(); ctx.translate(3, off);
    ctx.fillStyle = '#00247d'; ctx.fillRect(0, 0, w, h);
    const cw = w * 0.5, ch = h * 0.5; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, ch); ctx.clip();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = h * 0.13; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cw, ch); ctx.moveTo(cw, 0); ctx.lineTo(0, ch); ctx.stroke();
    ctx.strokeStyle = '#cc142b'; ctx.lineWidth = h * 0.05; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cw, ch); ctx.moveTo(cw, 0); ctx.lineTo(0, ch); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(cw * 0.5 - h * 0.09, 0, h * 0.18, ch); ctx.fillRect(0, ch * 0.5 - h * 0.09, cw, h * 0.18);
    ctx.fillStyle = '#cc142b'; ctx.fillRect(cw * 0.5 - h * 0.055, 0, h * 0.11, ch); ctx.fillRect(0, ch * 0.5 - h * 0.055, cw, h * 0.11); ctx.restore();
    for (const [fx, fy, r] of [[0.76, 0.2, 0.075], [0.63, 0.5, 0.07], [0.88, 0.45, 0.07], [0.76, 0.78, 0.085]]) { drawStar(fx * w, fy * h, h * r * 1.25, '#fff'); drawStar(fx * w, fy * h, h * r, '#cc142b'); }
    ctx.restore();
  }
  ctx.restore();
}
function treeFern(x, b, h) { // New Zealand tree fern: slim trunk with a crown of arching fronds
  ctx.strokeStyle = '#4a3322'; ctx.lineWidth = h * 0.09; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, b); ctx.quadraticCurveTo(x + h * 0.06, b - h * 0.5, x, b - h); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(x - h * 0.04, b - h * (0.15 + i * 0.11)); ctx.lineTo(x + h * 0.04, b - h * (0.19 + i * 0.11)); ctx.stroke(); }
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.4, len = h * 0.55, tx = x + Math.cos(a) * len, ty = b - h + Math.sin(a) * len * 0.55 + len * 0.45 * Math.abs(i - 4) / 4, cxp = x + Math.cos(a) * len * 0.55, cyp = b - h + Math.sin(a) * len * 0.9 - 6;
    ctx.strokeStyle = i % 2 ? '#2e7d3f' : '#3f9a4f'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x, b - h); ctx.quadraticCurveTo(cxp, cyp, tx, ty); ctx.stroke();
    ctx.lineWidth = 1.6; for (let k = 1; k <= 6; k++) { const u = k / 7, qx = (1 - u) * (1 - u) * x + 2 * (1 - u) * u * cxp + u * u * tx, qy = (1 - u) * (1 - u) * (b - h) + 2 * (1 - u) * u * cyp + u * u * ty; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(qx - 5, qy + 9 * (1 - u * 0.5)); ctx.moveTo(qx, qy); ctx.lineTo(qx + 5, qy + 9 * (1 - u * 0.5)); ctx.stroke(); }
  }
}
function drawStory() {
  drawBackground(0, 0); drawGround(0, EMPTY, 0);
  ctx.fillStyle = hgrad(560, 820, '#86603a', '#6b4a2b', '#4a3020'); rr(560, 250, 260, 190, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2; for (let yy = 270; yy < 440; yy += 20) { ctx.beginPath(); ctx.moveTo(562, yy); ctx.lineTo(818, yy); ctx.stroke(); }
  ctx.fillStyle = '#4a3020'; ctx.beginPath(); ctx.moveTo(540, 255); ctx.lineTo(690, 170); ctx.lineTo(840, 255); ctx.fill();
  rr(600, 290, 60, 50, 6); ctx.fillStyle = '#ffe08a'; ctx.fill();
  rr(720, 320, 60, 120, 6); ctx.fillStyle = '#3b2410'; ctx.fill();
  rr(600, 212, 180, 40, 8); ctx.fillStyle = '#f3dcc4'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#6b4a2b'; ctx.stroke(); txt('Dino-Station', 690, 226, 17, '#3b2410'); txt('Neuseeland', 690, 243, 14, '#2a5aa0');
  drawNZFlag(692, 112, 72, 46, T, 12);
  shadow(486, GROUND + 2, 34, 0.3); shadow(246, GROUND + 2, 64, 0.3); shadow(386, GROUND + 2, 26, 0.3);
  treeFern(70, GROUND + 4, 150); treeFern(905, GROUND + 4, 125);
  shadow(620, GROUND + 2, 26, 0.3); oKiwi(620, GROUND, 1.5, T * 3, true);
  oGoetti(480, GROUND, 1.2, true);
  oRex(240, GROUND, 1.15, T * 2, save.rexName ? 0.2 : 0, Object.assign(rexLook(0), { rider: true }));
  oChili(380, GROUND, 1.4, T * 3);
  vignette(0);
}

const chestPop = [0, 0, 0, 0];
function playTreasure(i) {
  if (!save.treasures[i]) { SFX.wrong(); toast(i === 3 ? 'Wo ist Kiwi nur? Vielleicht am Vulkan …' : 'Das hat Goetti noch verloren – hinter Tür ' + ([3, 9, 15, 21][i]) + '!', '#ffb4a8'); return; }
  chestPop[i] = 1; toast(TREASURES[i].tap, '#ffd34d');
  if (i === 0) { [[196, 247, 294, 392, 494], [262, 330, 392, 523, 659], [220, 262, 330, 440, 523], [196, 247, 294, 392, 494]].forEach((ch, c) => ch.forEach((f, j) => tone(f, 0.9, 'triangle', 0.07, null, c * 0.45 + j * 0.03))); }
  else if (i === 1) { for (const d of [0, 0.28]) { tone(2100, 0.35, 'sine', 0.12, null, d); tone(2650, 0.3, 'sine', 0.07, null, d + 0.02); } }
  else if (i === 2) { noise(0.4, 0.3, 1400); tone(500, 0.15, 'sine', 0.12, 1500, 0.3); }
  else { tone(1700, 0.2, 'square', 0.05, 2700); tone(1700, 0.2, 'square', 0.05, 2700, 0.28); }
}
function drawChest() {
  // Goetti's treasure chest: open lid, gold hoard, the four lost treasures sitting inside
  { const cx0 = 262, cw = 420, cy0 = H - 112, rim = cy0 + 56;
    shadow(cx0 + cw / 2, H - 8, cw * 0.55, 0.35);
    // open lid, seen from the inside (red velvet, wood rim, gold trim)
    ctx.beginPath(); ctx.moveTo(cx0 + 18, rim); ctx.lineTo(cx0 + 10, cy0 + 22); ctx.quadraticCurveTo(cx0 + cw / 2, cy0 - 18, cx0 + cw - 10, cy0 + 22); ctx.lineTo(cx0 + cw - 18, rim); ctx.closePath();
    ctx.fillStyle = '#7b4a28'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx0 + 30, rim - 2); ctx.lineTo(cx0 + 24, cy0 + 26); ctx.quadraticCurveTo(cx0 + cw / 2, cy0 - 6, cx0 + cw - 24, cy0 + 26); ctx.lineTo(cx0 + cw - 30, rim - 2); ctx.closePath();
    ctx.fillStyle = vgrad(cy0, rim, '#9b2a3a', '#6f1626', '#4a0e1a'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d4a017'; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; for (let i = 1; i < 9; i++) { ctx.beginPath(); ctx.moveTo(cx0 + 24 + i * (cw - 48) / 9, cy0 + 24 - Math.sin(i / 9 * Math.PI) * 18); ctx.lineTo(cx0 + 30 + i * (cw - 60) / 9, rim - 2); ctx.stroke(); }
    otxt('Goettis Schatzkiste', cx0 + cw / 2, cy0 - 8, 15, '#ffd34d', 'rgba(40,16,0,.85)', 5);
    // gold hoard filling the chest
    ctx.beginPath(); ctx.moveTo(cx0 + 12, rim + 6); ctx.quadraticCurveTo(cx0 + 40, rim - 14, cx0 + 90, rim - 6); ctx.quadraticCurveTo(cx0 + cw / 2, rim - 22, cx0 + cw - 90, rim - 6); ctx.quadraticCurveTo(cx0 + cw - 40, rim - 14, cx0 + cw - 12, rim + 6); ctx.closePath(); ctx.fillStyle = vgrad(rim - 18, rim + 6, '#ffe27a', '#e8a317'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#8a5a00'; ctx.stroke();
    for (let i = 0; i < 22; i++) { const gx = cx0 + 24 + hash(i + 70) * (cw - 48), gy = rim - 10 + hash(i + 80) * 12 - Math.abs(gx - cx0 - cw / 2) * 0.02; circle(gx, gy, 5, '#ffd34d'); circle(gx - 1, gy - 1, 3.2, '#fff0a0'); }
    for (const [gx, col] of [[cx0 + 60, '#e53935'], [cx0 + cw - 70, '#40c4ff'], [cx0 + cw / 2 + 4, '#69f0ae']]) { drawStar(gx, rim - 8, 7, col); }
    // the four treasure slots (found = the item itself, missing = a dim ?)
    for (let i = 0; i < 4; i++) {
      const x = 316 + i * 110, y = rim - 28, has = save.treasures[i];
      chestPop[i] = Math.max(0, chestPop[i] - DT * 2);
      if (has) { const gl = ctx.createRadialGradient(x, y, 4, x, y, 44); gl.addColorStop(0, 'rgba(255,240,170,.65)'); gl.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI * 2); ctx.fill(); ctx.save(); ctx.translate(x, y); const sc = 1 + chestPop[i] * 0.4; ctx.scale(sc, sc); ctx.rotate(Math.sin(T * 20) * chestPop[i] * 0.3); drawTreasure(i, 0, 0, 0.6, T * 6); ctx.restore(); }
      else { ctx.globalAlpha = 0.85; rr(x - 22, y - 22, 44, 44, 10); ctx.fillStyle = 'rgba(30,14,18,.8)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d4a017'; ctx.stroke(); ctx.globalAlpha = 1; txt('?', x, y + 2, 28, 'rgba(255,225,150,.7)'); }
      buttons.push({ x: x - 50, y: y - 40, w: 100, h: 80, silent: true, cb: () => playTreasure(i) });
    }
    // front of the chest: wooden planks, iron-gold bands, lock
    rr(cx0, rim + 4, cw, 50, 10); ctx.fillStyle = vgrad(rim, H - 10, '#a56a35', '#80501f', '#5a3416'); ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx0 + 4, rim + 4 + i * 16); ctx.lineTo(cx0 + cw - 4, rim + 4 + i * 16); ctx.stroke(); }
    ctx.fillStyle = vgrad(rim, H - 10, '#ffe27a', '#d4a017', '#8a5a00'); for (const bx of [cx0 + 26, cx0 + cw - 50, cx0 + cw / 2 - 90, cx0 + cw / 2 + 74]) { rr(bx, rim + 4, 24, 50, 4); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#6a4400'; ctx.stroke(); circle(bx + 12, rim + 14, 2.6, '#6a4400'); circle(bx + 12, rim + 44, 2.6, '#6a4400'); }
    rr(cx0 + cw / 2 - 22, rim - 2, 44, 40, 8); ctx.fillStyle = vgrad(rim, rim + 40, '#ffe27a', '#d4a017'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#6a4400'; ctx.stroke(); circle(cx0 + cw / 2, rim + 14, 5, '#3a2400'); rr(cx0 + cw / 2 - 2.5, rim + 16, 5, 12, 2); ctx.fillStyle = '#3a2400'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(cx0 + 6, rim + 8, cw - 12, 4); }
}
// ---------- thumbnails and doors of the advent calendar ----------
function drawThemeThumb(wi, x, y, w, h) { // a tiny painted scene for each theme
  const th = WORLDS[wi]; ctx.save(); rr(x, y, w, h, 8); ctx.clip();
  ctx.fillStyle = vgrad(y, y + h, th.sky[0], th.sky[1]); ctx.fillRect(x, y, w, h);
  const gy = y + h * 0.72;
  if (wi === 3) drawVolcano(x + w * 0.5, gy, 0.2, '#2a0a08', 1);
  else if (wi === 5) { ctx.fillStyle = '#2a9ad0'; ctx.fillRect(x, y + h * 0.5, w, h * 0.22); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + 12 + i * 22, y + h * 0.58, 6, Math.PI, 0); ctx.stroke(); } circle(x + w * 0.8, y + h * 0.22, 8, '#ffe06a'); palm(x + w * 0.3, gy, 36, '#2f7d4a'); }
  else if (wi === 6) { ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 10 + i * 28, y); ctx.lineTo(x + 24 + i * 28, y); ctx.lineTo(x + 40 + i * 28, y + h); ctx.lineTo(x + 20 + i * 28, y + h); ctx.fill(); } for (const [fx, fy] of [[0.3, 0.35], [0.65, 0.5]]) { ell(x + w * fx, y + h * fy, 7, 4, 0, '#ffb04a'); ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.moveTo(x + w * fx - 6, y + h * fy); ctx.lineTo(x + w * fx - 12, y + h * fy - 4); ctx.lineTo(x + w * fx - 12, y + h * fy + 4); ctx.fill(); } for (const [bx, by] of [[0.5, 0.2], [0.55, 0.32], [0.8, 0.3]]) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + w * bx, y + h * by, 3, 0, 6.3); ctx.stroke(); } }
  else if (wi === 7) { ctx.fillStyle = '#7f98b8'; ctx.beginPath(); ctx.moveTo(x - 6, gy); ctx.lineTo(x + w * 0.35, y + h * 0.2); ctx.lineTo(x + w * 0.62, gy); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + w * 0.35, y + h * 0.2); ctx.lineTo(x + w * 0.27, y + h * 0.38); ctx.lineTo(x + w * 0.43, y + h * 0.38); ctx.fill(); ctx.fillStyle = '#6a84a6'; ctx.beginPath(); ctx.moveTo(x + w * 0.4, gy); ctx.lineTo(x + w * 0.72, y + h * 0.3); ctx.lineTo(x + w + 6, gy); ctx.fill(); pine(x + w * 0.2, gy, 26, '#1d4a3f', false); }
  else if (wi === 0) { palm(x + w * 0.5, gy, 40, '#1f5a35'); }
  else if (wi === 1) cactus(x + w * 0.5, gy, 30, '#5f7a2a');
  else if (wi === 2 || wi === 4) pine(x + w * 0.5, gy + 2, 40, wi === 4 ? '#14303f' : '#1d4a3f', wi === 4);
  ctx.fillStyle = th.top || '#4a7a3a'; ctx.fillRect(x, gy, w, h - (gy - y));
  ctx.restore();
}
const DOORS = { cols: 8, w: 100, h: 80, gx: 12, gy: 8, x0: 34, y0: 96 };
function doorRect(i) { const c = i % DOORS.cols, r = Math.floor(i / DOORS.cols); return { x: DOORS.x0 + c * (DOORS.w + DOORS.gx), y: DOORS.y0 + r * (DOORS.h + DOORS.gy), w: DOORS.w, h: DOORS.h }; }
function drawDoor(i, today) {
  const { x, y, w, h } = doorRect(i), lv = LEVELS[i], day = i + 1, th = WORLDS[lv.wi], open = day <= today, opened = save.gifts.includes(day) || !giftFor(day) && save.lvDone[i], done = save.lvDone[i], isToday = day === today && !done;
  const pulse = isToday ? 1 + 0.04 * Math.sin(T * 5) : 1;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(pulse, pulse); ctx.translate(-w / 2, -h / 2);
  if (isToday) { const g = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 90); g.addColorStop(0, `rgba(255,230,140,${0.55 + 0.2 * Math.sin(T * 4)})`); g.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = g; ctx.fillRect(-40, -40, w + 80, h + 80); }
  // frame (arched top) in the colour of the theme
  const fr = open ? th.far : '#6a5a4a'; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, 22); ctx.quadraticCurveTo(0, 0, w / 2, 0); ctx.quadraticCurveTo(w, 0, w, 22); ctx.lineTo(w, h); ctx.closePath();
  ctx.fillStyle = vgrad(0, h, shade(fr, 1.2), shade(fr, 0.8)); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
  const ix = 7, iy = 8, iw = w - 14, ih = h - 8;
  if (done || (open && opened)) { // the door stands open: a view of the level's theme
    ctx.save(); ctx.beginPath(); ctx.moveTo(ix, h); ctx.lineTo(ix, iy + 18); ctx.quadraticCurveTo(ix, iy, w / 2, iy); ctx.quadraticCurveTo(ix + iw, iy, ix + iw, iy + 18); ctx.lineTo(ix + iw, h); ctx.closePath(); ctx.clip();
    drawThemeThumb(lv.wi, ix, iy, iw, ih); if (!done) { ctx.fillStyle = 'rgba(10,10,30,.35)'; ctx.fillRect(ix, iy, iw, ih); } ctx.restore();
    ctx.fillStyle = '#6a4a2b'; ctx.beginPath(); ctx.moveTo(ix, h); ctx.lineTo(ix, iy + 18); ctx.lineTo(ix + 12, iy + 24); ctx.lineTo(ix + 12, h); ctx.closePath(); ctx.fill(); // the opened door leaf
  } else { // closed wooden door
    ctx.beginPath(); ctx.moveTo(ix, h); ctx.lineTo(ix, iy + 18); ctx.quadraticCurveTo(ix, iy, w / 2, iy); ctx.quadraticCurveTo(ix + iw, iy, ix + iw, iy + 18); ctx.lineTo(ix + iw, h); ctx.closePath();
    ctx.fillStyle = vgrad(iy, h, open ? '#b07a42' : '#7a6a58', open ? '#7a4e24' : '#4f4438'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w / 2, iy + 2); ctx.lineTo(w / 2, h); ctx.moveTo(ix + 3, h * 0.58); ctx.lineTo(ix + iw - 3, h * 0.58); ctx.stroke();
    circle(w - 18, h * 0.6, 3.4, open ? '#ffd34d' : '#9a8a78');
  }
  // number tag
  if (!done) { circle(w / 2, h * 0.36, 16, open ? '#fff3c0' : 'rgba(255,255,255,.7)'); ctx.lineWidth = 2; ctx.strokeStyle = open ? '#a06a00' : '#6a5a4a'; ctx.stroke(); txt(String(day), w / 2, h * 0.36 + 1, 20, open ? '#7a3a00' : '#6a5a4a'); }
  else { circle(w - 14, 22, 13, '#fff7e0'); ctx.lineWidth = 2; ctx.strokeStyle = '#2b1a0c'; ctx.stroke(); txt(String(day), w - 14, 23, 15, '#3b2410'); }
  if (!open) ico('lock', w / 2, h * 0.72, 20);
  if (isToday) { ctx.save(); ctx.translate(14, 14); ctx.rotate(-0.35); rr(-24, -9, 48, 18, 5); ctx.fillStyle = '#e53935'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('HEUTE', 0, 1, 11, '#fff'); ctx.restore(); }
  if (done) for (let k = 0; k < 3; k++) drawMedal(w / 2 - 22 + k * 22, h - 13, 7, k, save.lvM[i][k]);
  if (lv.boss && open) { drawStar(14, h - 14, 9, '#ff6a3a'); }
  ctx.restore();
  buttons.push({ x, y, w, h, cb: () => clickDoor(i) });
}
let doorOverlay = null, parentMode = false, titlePress = 0;
function clickDoor(i) {
  const day = i + 1, today = adventDay();
  if (day > today) { SFX.wrong(); toast(today === 0 ? 'Der Kalender startet am 1. Dezember!' : `Diese Tür öffnet sich am ${day}. Dezember!`, '#ffb4a8'); return; }
  const g = save.gifts.includes(day) ? null : openDoorGift(day);
  if (g) { doorOverlay = { i, g, t: 0 }; SFX.right(); burst(W / 2, 250, 50, ['#ffd740', '#ff5252', '#69f0ae', '#40c4ff', '#fff'], 520, 500, 8, 1.4); return; }
  startLevel(i);
}
function drawGiftIcon(g, cx, cy, k) {
  if (g.key === 'hat') drawHatIcon(HATS[g.i].k, cx, cy, k * 1.5);
  else if (g.key === 'skin') { const sk = SKINS[g.i]; oRex(cx + 4, cy + 34 * k, 0.5 * k, 0.5, 0.05, { body: sk.body, dark: sk.dark, belly: sk.belly, rainbow: sk.rainbow }); }
  else if (g.key === 'fire') drawFlameIcon(fireOf(g.i), cx, cy, k * 1.6);
  else { drawAmber(cx, cy, 30 * k); otxt('+' + g.n, cx, cy + 50 * k, 28, '#ffe08a', 'rgba(0,0,0,.7)', 5); }
}
function drawDoorOverlay() {
  const o = doorOverlay, lv = LEVELS[o.i]; o.t += DT; const u = clamp(o.t / 0.9, 0, 1);
  ctx.fillStyle = 'rgba(8,10,24,.6)'; ctx.fillRect(0, 0, W, H);
  woodFrame(250, 50, 460, 440, 26);
  txt(`Tür ${lv.day}`, W / 2, 98, 40, '#3b2410'); txt(lv.title, W / 2, 132, 20, '#8a6a3a', 'center', 'normal');
  // the door swings open to reveal the gift
  ctx.save(); rr(380, 150, 200, 170, 14); ctx.clip(); ctx.fillStyle = vgrad(150, 320, '#fff6d0', '#ffd77a'); ctx.fillRect(380, 150, 200, 170);
  const gl = ctx.createRadialGradient(480, 235, 6, 480, 235, 110); gl.addColorStop(0, `rgba(255,255,220,${u})`); gl.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = gl; ctx.fillRect(380, 150, 200, 170);
  if (u > 0.5) { ctx.save(); ctx.translate(480, 238 + Math.sin(T * 3) * 4); const sc = clamp((u - 0.5) * 3, 0, 1) * 1.0; ctx.scale(sc, sc); drawGiftIcon(o.g, 0, 0, 1.4); ctx.restore(); }
  ctx.restore();
  const sw = 1 - u; ctx.save(); rr(380, 150, 200 * Math.max(0.02, sw), 170, 10); ctx.fillStyle = vgrad(150, 320, '#b07a42', '#7a4e24'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2b1a0c'; ctx.stroke(); ctx.restore();
  rr(380, 150, 200, 170, 14); ctx.lineWidth = 5; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
  const label = { hat: 'Neuer Hut', skin: 'Neue Farbe', fire: 'Neue Feuerfarbe', amber: 'Bernstein-Schatz' }[o.g.key];
  if (u >= 1) { txt(label + '!', W / 2, 352, 22, '#2e7d32'); txt(o.g.name, W / 2, 386, 32, '#3b2410'); txt('Du findest es im Laden.', W / 2, 418, 16, '#8a6a3a', 'center', 'normal'); }
  button('Zurück', 270, 432, 150, 44, () => { doorOverlay = null; }, { size: 22 });
  button('Los geht\'s!', 435, 432, 255, 44, () => { doorOverlay = null; startLevel(o.i); }, { size: 24, icon: icon('play'), disabled: u < 1 });
  buttons.unshift({ x: 0, y: 0, w: W, h: H, cb: () => {}, silent: true });
}
function drawParentPanel() {
  panel(240, 100, 480, 340); txt('Elternmodus', W / 2, 145, 34, '#3b2410'); txt(`Heute offen: ${adventDay()} von 24 Türen`, W / 2, 190, 22, '#6b4a2b', 'center', 'normal');
  txt(save.dayOverride == null ? 'Es gilt das Datum des Geräts.' : 'Das Datum ist manuell eingestellt.', W / 2, 220, 16, '#8a6a3a', 'center', 'normal');
  button('−', 300, 244, 110, 56, () => { save.dayOverride = clamp(adventDay() - 1, 0, 24); writeSave(); }, { size: 34 });
  button('+', 550, 244, 110, 56, () => { save.dayOverride = clamp(adventDay() + 1, 0, 24); writeSave(); }, { size: 34 });
  button('Alle Türen öffnen', 300, 316, 360, 46, () => { save.dayOverride = 24; writeSave(); }, { size: 22, color: '#ffe08a' });
  button('Datum des Geräts nutzen', 300, 372, 360, 46, () => { save.dayOverride = null; writeSave(); }, { size: 20, color: '#e0d2b0' });
  button('Schliessen', W / 2 - 80, 450, 160, 44, () => { parentMode = false; }, { size: 20 });
  buttons.unshift({ x: 0, y: 0, w: W, h: H, cb: () => {}, silent: true });
}
let endlessPick = false;
function themeOpenForEndless(wi) { return save.finished || LEVELS.some(l => l.wi === wi && save.lvDone[l.li]); }
function drawEndlessPicker() {
  buttons = [];
  panel(150, 40, 660, 460); txt('Endlos-Lauf', W / 2, 85, 38, '#3b2410'); txt('Wähle ein Thema – schlag deinen Rekord!', W / 2, 122, 20, '#6b4a2b', 'center', 'normal');
  WORLDS.forEach((th, i) => {
    const open = themeOpenForEndless(i), x = 180 + (i % 2) * 310, y = 146 + Math.floor(i / 2) * 62;
    button(`${th.name}${save.best[i] ? ' · ' + save.best[i] : ''}`, x, y, 290, 52, () => { if (open) { endlessPick = false; startLevel(i, true); } else { SFX.wrong(); toast('Erst ein Level dieses Themas schaffen!', '#ffb4a8'); } }, { size: 22, color: open ? '#f4b400' : '#c8c0a8', icon: open ? null : icon('lock') });
  });
  button('Zurück', W / 2 - 80, 146 + 4 * 62 + 8, 160, 42, () => { endlessPick = false; }, { size: 20, color: '#e0d2b0' });
}
function drawMap() { // the advent calendar
  const today = adventDay();
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0f1a3c'); g.addColorStop(0.55, '#33477a'); g.addColorStop(1, '#8aa0c8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 50; i++) { ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(T + i)); circle(hash(i) * W, hash(i + 9) * 200, 1.3, '#fff'); } ctx.globalAlpha = 1;
  drawHills(0, '#e8f0fa', 430, 40, 2); drawHills(300, '#cfdcf0', 470, 30, 4);
  drawSnow(0.45);
  // the wooden calendar board
  woodFrame(14, 84, W - 28, 3 * (DOORS.h + DOORS.gy) + 30, 22, '#3a2f55');
  ctx.save(); rr(25, 95, W - 50, 3 * (DOORS.h + DOORS.gy) + 8, 14); ctx.clip(); ctx.fillStyle = vgrad(95, 400, '#2a2250', '#1d1740'); ctx.fillRect(0, 0, W, H); for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.25 + 0.3 * Math.abs(Math.sin(T * 0.8 + i)); circle(30 + hash(i + 3) * (W - 60), 100 + hash(i + 11) * 290, 1.2, '#ffe9a8'); } ctx.globalAlpha = 1; ctx.restore();
  for (let i = 0; i < 24; i++) drawDoor(i, today);
  // header
  otxt('Adventskalender', 30, 38, 38, '#ffd34d', '#3b1d00', 9, 'left');
  const left = Math.ceil((ADVENT_START - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);
  otxt(today === 0 && save.dayOverride == null ? (left > 0 ? `Noch ${left} ${left === 1 ? 'Tag' : 'Tage'} bis zum 1. Dezember!` : 'Gleich geht es los!') : today >= 24 ? 'Alle Türen sind offen – frohe Weihnachten!' : fmt(`Heute: Tür ${today} – {rex} und Chili sind bereit!`), 32, 70, 19, '#fff', 'rgba(0,0,0,.7)', 5, 'left');
  buttons.push({ x: 20, y: 14, w: 330, h: 40, silent: true, cb: () => {} , hold: true });
  drawAmber(W - 210, 36, 14); otxt(String(save.amber), W - 188, 37, 24, '#ffe08a', 'rgba(0,0,0,.7)', 5, 'left');
  drawMedal(W - 318, 44, 12, 1, true); otxt(`${save.lvM.flat().reduce((a, b) => a + b, 0)}/72`, W - 298, 37, 24, '#ffe08a', 'rgba(0,0,0,.7)', 5, 'left');
  drawChest();
  button(save.muted ? 'Ton aus' : 'Ton an', W - 130, 16, 112, 42, () => { save.muted = !save.muted; writeSave(); }, { size: 18, color: '#e0d2b0' });
  button('Dino-Buch', 24, H - 82, 210, 60, () => { bookSel = -1; go('book'); }, { icon: icon('book') });
  button('Laden', 24, H - 150, 210, 56, () => go('shop'), { color: '#ffe08a', icon: icon('amber') });
  if (save.lvDone.some(Boolean) || save.finished) button('Endlos-Lauf', W - 274, H - 150, 250, 56, () => { endlessPick = true; }, { color: '#9fd3ff', icon: icon('loop') });
  if (save.finished) button('Weihnachts-Ende', W - 274, H - 82, 250, 60, () => startEnding(), { color: '#e57373', textColor: '#fff', icon: icon('star'), size: 21 });
  if (endlessPick) drawEndlessPicker();
  if (doorOverlay) drawDoorOverlay();
  if (parentMode) drawParentPanel();
  if (titlePress && T - titlePress > 1.4 && !parentMode) { parentMode = true; titlePress = 0; SFX.click(); }
}

function awning(h) { // striped market awning with a scalloped edge
  const n = 15, sw = W / n;
  for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#fff7e8' : '#d63a3a'; ctx.beginPath(); ctx.moveTo(i * sw, 0); ctx.lineTo((i + 1) * sw, 0); ctx.lineTo((i + 1) * sw, h); ctx.arc(i * sw + sw / 2, h, sw / 2, 0, Math.PI); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, h - 10, W, 10); ctx.strokeStyle = '#7a1f1f'; ctx.lineWidth = 2; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(i * sw + sw / 2, h, sw / 2, 0, Math.PI); ctx.stroke(); }
}
function drawHatIcon(kind, cx, cy, k) {
  ctx.save(); ctx.translate(cx, cy + 6); ctx.scale(k, k); if (kind) drawHat(kind, 0, 0); else ico('star', 0, -8, 34); ctx.restore();
}
function drawFlameIcon(it, cx, cy, k) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 40); g.addColorStop(0, `rgba(${it.a},.55)`); g.addColorStop(1, `rgba(${it.b},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 2, 40, 0, Math.PI * 2); ctx.fill();
  for (const [sc, col] of [[1, `rgb(${it.b})`], [0.72, `rgb(${it.a})`], [0.4, '#fff']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -30 * sc); ctx.bezierCurveTo(14 * sc, -12 * sc, 20 * sc, 4 * sc, 12 * sc, 16 * sc); ctx.bezierCurveTo(6 * sc, 26 * sc, -6 * sc, 26 * sc, -12 * sc, 16 * sc); ctx.bezierCurveTo(-20 * sc, 2 * sc, -8 * sc, -10 * sc, 0, -30 * sc); ctx.fill(); if (sc === 1) { ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke(); } }
  ctx.restore();
}
const SHOP_TABS = [['Farbe', 'skin', SKINS], ['Hut', 'hat', HATS], ['Feuer', 'fire', FIRES]];
let shopTab = 0, shopPage = 0, shopSel = 0, shopTalk = { t: 0, text: 'Willkommen! Such dir etwas aus.' };
function shopSay(text) { shopTalk = { t: 4, text }; }
function drawShop() {
  // wall, awning, counter
  ctx.fillStyle = vgrad(0, H, '#f6e7c4', '#f0d9a6', '#e2c488'); ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(120,80,30,.12)'; ctx.lineWidth = 2; for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 450); ctx.stroke(); }
  awning(52);
  ctx.fillStyle = vgrad(448, H, '#9a6a3a', '#6e4a28', '#4a301a'); ctx.fillRect(0, 448, W, H - 448); ctx.fillStyle = '#b98a54'; ctx.fillRect(0, 448, W, 8); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2; for (let y = 470; y < H; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  woodFrame(300, 54, 360, 54, 14); txt('Bernstein-Laden', 480, 83, 30, '#3b2410');
  rr(756, 70, 176, 44, 22); ctx.fillStyle = 'rgba(40,24,10,.85)'; ctx.fill(); drawAmber(782, 92, 14); otxt(String(save.amber), 806, 93, 26, '#ffe08a', 'rgba(0,0,0,.7)', 5, 'left');
  const [label, key, list] = SHOP_TABS[shopTab];
  // live preview: equip the selection temporarily
  const bak = Object.assign({}, save.equip); save.equip[key] = shopSel;
  shadow(260, 420, 90, 0.3);
  oRex(262, 414, 0.85, T * 3, 0.1, Object.assign(rexLook(2), { rider: true, hat: rexLook(2).hat || null, fire: key === 'fire' }));
  Object.assign(save.equip, bak);
  if (key === 'fire') { // Rex breathes the selected fire so the colour can be judged
    const f = fireOf(shopSel), cyc = (T % 2.6) / 2.6, mx = 262 + 116 * 0.85, my = 414 - 98 * 0.85;
    ctx.save();
    if (cyc < 0.3) { const u = cyc / 0.3, len = 80 * (0.5 + u * 0.7); const g = ctx.createRadialGradient(mx, my, 2, mx, my, len); g.addColorStop(0, 'rgba(255,255,240,.95)'); g.addColorStop(0.25, `rgba(${f.a},.95)`); g.addColorStop(0.7, `rgba(${f.b},.75)`); g.addColorStop(1, `rgba(${f.c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(mx, my); for (let i = 0; i <= 10; i++) { const a = -0.3 + i * 0.06, r = len * (0.85 + 0.15 * Math.sin(T * 50 + i * 1.7)); ctx.lineTo(mx + Math.cos(a) * r, my + 6 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
    if (cyc > 0.06 && cyc < 0.85) { const q = (cyc - 0.06) / 0.79, bx = mx + 14 + q * 150, by = my + 6 + q * 26, fa = 1 - q * q, fl = 1 + 0.12 * Math.sin(T * 45); ctx.globalAlpha = fa; const g = ctx.createRadialGradient(bx, by, 2, bx, by, 34 * fl); g.addColorStop(0, 'rgba(255,255,235,1)'); g.addColorStop(0.3, `rgba(${f.a},1)`); g.addColorStop(0.65, `rgba(${f.b},.85)`); g.addColorStop(1, `rgba(${f.c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 34 * fl, 0, Math.PI * 2); ctx.fill(); for (let k = 1; k <= 3; k++) { ctx.globalAlpha = fa * 0.5 / k; circle(bx - k * 14, by - k * 3 + Math.sin(T * 30 + k) * 3, 13 - k * 2.5, f.ball); } ctx.globalAlpha = 1; }
    ctx.restore();
  }
  oGoetti(70, 440, 0.85, shopTalk.t > 0);
  if (shopTalk.t > 0 || true) { shopTalk.t = Math.max(0, shopTalk.t - DT); const lines = wrapLines(shopTalk.text, 230, 18); const bh = 20 + lines.length * 22; rr(20, 215 - bh + 10, 262, bh, 14); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke(); ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.moveTo(52, 225); ctx.lineTo(76, 225); ctx.lineTo(70, 252); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillRect(54, 223, 20, 4); lines.forEach((l, i) => txt(l, 151, 215 - bh + 32 + i * 22, 18, '#3b2410', 'center', 'normal')); }
  // tabs
  SHOP_TABS.forEach(([lb], i) => button(lb, 440 + i * 168, 118, 160, 44, () => { shopTab = i; shopPage = 0; shopSel = save.equip[SHOP_TABS[i][1]]; shopSay(i === 0 ? 'Welche Farbe darf es sein?' : i === 1 ? 'Ein Hut für Oli?' : 'Feuer in allen Farben!'); }, { size: 22, color: i === shopTab ? '#ffd34d' : '#d9c9a0' }));
  // item cards: 8 per page (4 x 2), gifts from the calendar show the door they come from
  const PER = 8, pages = Math.ceil(list.length / PER); shopPage = clamp(shopPage, 0, pages - 1);
  list.forEach((it, i) => {
    if (Math.floor(i / PER) !== shopPage) return;
    const j = i % PER, x = 440 + (j % 4) * 126, y = 168 + Math.floor(j / 4) * 96, w = 118, h = 88, owned = save.owned[key].includes(i), eq = save.equip[key] === i, cost = it.cost || 0, can = !it.gift && save.amber >= cost, sel = shopSel === i;
    if (sel) { rr(x - 4, y - 4, w + 8, h + 8, 16); ctx.fillStyle = 'rgba(255,211,77,.55)'; ctx.fill(); }
    ctx.save(); rr(x, y + 3, w, h, 14); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill(); ctx.restore();
    rr(x, y, w, h, 14); ctx.fillStyle = eq ? '#d4f2bd' : owned ? '#fffaf0' : it.gift ? '#e8e0f4' : can ? '#ffeab8' : '#e2d8c2'; ctx.fill(); ctx.lineWidth = sel ? 4 : 3; ctx.strokeStyle = sel ? '#e8a317' : eq ? '#2e7d32' : '#8a6a3a'; ctx.stroke();
    ctx.save(); rr(x + 5, y + 5, w - 10, 46, 8); ctx.clip(); ctx.fillStyle = vgrad(y, y + 52, '#fffdf4', '#f0e2bf'); ctx.fillRect(x, y, w, 54);
    if (key === 'skin') { oRex(x + w / 2 + 2, y + 44, 0.2, 0.5, 0.05, { body: it.body, dark: it.dark, belly: it.belly, rainbow: it.rainbow }); }
    else if (key === 'hat') drawHatIcon(it.k, x + w / 2, y + 28, 0.95);
    else drawFlameIcon(fireOf(i), x + w / 2, y + 30, 0.62);
    if (!owned) { ctx.fillStyle = 'rgba(120,110,90,.35)'; ctx.fillRect(x, y, w, 54); }
    ctx.restore();
    if (!owned) ico('lock', x + w - 16, y + 16, 17);
    txt(it.n, x + w / 2, y + 62, it.n.length > 9 ? 12 : 14, '#3b2410');
    if (eq) txt('Angelegt', x + w / 2, y + 77, 12, '#2e7d32'); else if (owned) txt('Gekauft', x + w / 2, y + 77, 12, '#6b4a2b', 'center', 'normal'); else if (it.gift) txt(`Tür ${it.gift}`, x + w / 2, y + 77, 13, '#6a4aa8'); else { drawAmber(x + w / 2 - 18, y + 76, 6); txt(String(cost), x + w / 2 - 8, y + 77, 14, can ? '#8a5a00' : '#a09070', 'left'); }
    buttons.push({ x, y, w, h, cb: () => { shopSel = i; shopSay(owned ? (eq ? 'Das trägst du gerade.' : 'Das steht dir gut!') : it.gift ? `Das findest du hinter Tür ${it.gift} im Kalender!` : can ? `Das kostet ${cost} Bernstein.` : 'Sammle noch etwas Bernstein!'); } });
  });
  if (pages > 1) {
    button('‹', 440, 358, 56, 34, () => { shopPage = (shopPage + pages - 1) % pages; }, { size: 24, color: '#e0d2b0' });
    txt(`Seite ${shopPage + 1} von ${pages}`, 690, 375, 16, '#6b4a2b', 'center', 'normal');
    button('›', 880, 358, 56, 34, () => { shopPage = (shopPage + 1) % pages; }, { size: 24, color: '#e0d2b0' });
  }
  // buy / equip bar
  const it = list[shopSel], owned = save.owned[key].includes(shopSel), eq = save.equip[key] === shopSel, cost = it.cost || 0, can = !it.gift && save.amber >= cost, BY = 402;
  if (eq) button('Angelegt', 440, BY, 496, 56, () => {}, { disabled: true, icon: icon('check'), size: 26 });
  else if (owned) button('Anlegen', 440, BY, 496, 56, () => { save.equip[key] = shopSel; writeSave(); SFX.right(); shopSay('Sieht super aus!'); burst(262, 340, 18, ['#fff', '#ffe08a'], 250, 300, 5, 0.7); }, { color: '#9be38a', size: 26 });
  else if (it.gift) button(`Aus Tür ${it.gift} im Kalender`, 440, BY, 496, 56, () => { SFX.wrong(); shopSay(`Öffne am ${it.gift}. Dezember die Tür ${it.gift}!`); }, { disabled: true, size: 22 });
  else if (can) button(`Kaufen  ·  ${cost}`, 440, BY, 496, 56, () => { save.amber -= cost; save.owned[key].push(shopSel); save.equip[key] = shopSel; writeSave(); SFX.right(); shopSay('Viel Spass damit!'); burst(262, 330, 46, ['#ffd34d', '#fff', '#ff9f1c', '#69f0ae'], 420, 600, 7, 1.1); }, { size: 26, icon: icon('amber') });
  else button('Zu wenig Bernstein', 440, BY, 496, 56, () => { SFX.wrong(); toast('Noch zu wenig Bernstein!', '#ffb4a8'); shopSay('Sammle noch etwas Bernstein!'); }, { disabled: true, size: 24 });
  button('Zurück', W - 224, H - 66, 200, 50, () => go('map'), { size: 24, icon: icon('back') });
  drawParts(0);
}

// ---------- card illustrations for the Dino-Buch (chibi style, feet at y=0, facing +x) ----------
function drawStego(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const col = vgrad(-60, 0, '#9ccf7a', '#6fae58', '#457a3a');
  for (const lx of [-26, -8, 14, 30]) { rr(lx - 6, -22, 12, 22, 5); ctx.fillStyle = shade('#5a8f48', lx < 0 ? 0.8 : 1); ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-30, -36); ctx.quadraticCurveTo(-60, -34, -78, -22); ctx.quadraticCurveTo(-52, -26, -28, -20); ctx.fill();
  ctx.fillStyle = '#f2f0f0'; for (const [tx, ty, an] of [[-62, -30, -0.9], [-70, -26, -0.5], [-56, -24, 0.3], [-66, -22, 0.7]]) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(an); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0, -15); ctx.lineTo(3, 0); ctx.fill(); ctx.restore(); }
  ell(0, -36, 38, 22, 0, col); ell(8, -26, 26, 8, 0, '#d8f0b8');
  ctx.fillStyle = '#f2994a'; ctx.strokeStyle = '#a85a1c'; ctx.lineWidth = 1.5; [[-26, 12], [-12, 17], [4, 19], [20, 16], [32, 11]].forEach(([px, h], i) => { ctx.beginPath(); ctx.moveTo(px - 8, -52 + i * 0.5); ctx.lineTo(px, -52 - h); ctx.lineTo(px + 8, -52 + i * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); });
  ell(46, -28, 15, 11, 0.15, col); circle(50, -32, 4.6, '#fff'); circle(51, -32, 2.7, '#222'); circle(51.8, -33.2, 1, '#fff'); ctx.strokeStyle = '#2f5a2a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(54, -25, 4, 0.2, 1.5); ctx.stroke();
  ctx.restore();
}
function drawMammoth(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const fur = vgrad(-80, 0, '#b07a52', '#8d5b3a', '#5e3a22');
  for (const lx of [-26, -8, 14, 30]) { rr(lx - 8, -32, 16, 32, 6); ctx.fillStyle = shade('#7a4e30', lx < 0 ? 0.8 : 1); ctx.fill(); }
  ell(0, -44, 42, 30, 0, fur); ctx.strokeStyle = 'rgba(60,30,15,.5)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-34 + i * 11, -22); ctx.lineTo(-37 + i * 11, -8 + (i % 2) * 5); ctx.stroke(); }
  ell(36, -52, 24, 22, 0, fur); ell(24, -60, 9, 12, 0.3, '#7a4a2a');
  ctx.strokeStyle = '#a06a46'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(52, -50); ctx.quadraticCurveTo(66, -40, 58, -22); ctx.stroke();
  ctx.strokeStyle = '#fff1d0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(48, -40); ctx.quadraticCurveTo(66, -30, 70, -50); ctx.stroke();
  circle(44, -58, 5, '#fff'); circle(45, -58, 3, '#222'); circle(45.8, -59.2, 1, '#fff');
  ctx.fillStyle = '#a06a46'; ctx.beginPath(); ctx.moveTo(24, -70); ctx.quadraticCurveTo(34, -82, 46, -72); ctx.fill();
  ctx.restore();
}
function drawAnkylo(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const col = vgrad(-50, 0, '#c2a27a', '#9a7d58', '#64502f');
  for (const lx of [-28, -10, 14, 32]) { rr(lx - 7, -16, 14, 16, 5); ctx.fillStyle = shade('#7c6444', lx < 0 ? 0.8 : 1); ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-34, -26); ctx.quadraticCurveTo(-60, -26, -70, -20); ctx.quadraticCurveTo(-50, -18, -32, -14); ctx.fill();
  circle(-72, -20, 11, '#8a8a92'); ctx.fillStyle = '#d8d8de'; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(-72 + Math.cos(a - .2) * 10, -20 + Math.sin(a - .2) * 10); ctx.lineTo(-72 + Math.cos(a) * 17, -20 + Math.sin(a) * 17); ctx.lineTo(-72 + Math.cos(a + .2) * 10, -20 + Math.sin(a + .2) * 10); ctx.fill(); }
  ell(0, -30, 44, 22, 0, col);
  for (let i = 0; i < 6; i++) { const px = -32 + i * 12.5; ctx.fillStyle = '#7c6444'; ctx.beginPath(); ctx.ellipse(px, -46 + Math.abs(i - 2.5) * 1.5, 7, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e8d8b0'; ctx.beginPath(); ctx.moveTo(px - 3, -48); ctx.lineTo(px, -57); ctx.lineTo(px + 3, -48); ctx.fill(); }
  ell(48, -22, 14, 10, 0.1, '#b89a70'); circle(52, -26, 4.4, '#fff'); circle(53, -26, 2.6, '#222'); circle(53.8, -27, 0.9, '#fff'); ctx.strokeStyle = '#4a3a20'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(56, -19, 3.5, 0.2, 1.5); ctx.stroke();
  ctx.restore();
}
function drawSpino(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const col = vgrad(-70, 0, '#6fb8c8', '#3f8ea6', '#27596b');
  for (const lx of [-8, 12]) { rr(lx - 6, -34, 12, 34, 5); ctx.fillStyle = shade('#3a7a90', lx < 0 ? 0.8 : 1); ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-26, -50); ctx.quadraticCurveTo(-60, -48, -84, -30); ctx.quadraticCurveTo(-58, -36, -26, -30); ctx.fill();
  ctx.fillStyle = '#f2994a'; ctx.beginPath(); ctx.moveTo(-26, -58); ctx.bezierCurveTo(-24, -92, 6, -100, 22, -60); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a85a1c'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = 'rgba(120,50,10,.5)'; ctx.lineWidth = 2; for (const [dx, h] of [[-14, 28], [-4, 36], [6, 34], [15, 26]]) { ctx.beginPath(); ctx.moveTo(dx, -58); ctx.lineTo(dx + 1, -58 - h); ctx.stroke(); }
  ell(0, -46, 34, 20, -0.1, col); ell(8, -36, 22, 7, -0.1, '#d6eef2');
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(24, -58); ctx.quadraticCurveTo(34, -72, 50, -68); ctx.lineTo(78, -62); ctx.quadraticCurveTo(84, -58, 78, -54); ctx.lineTo(48, -48); ctx.quadraticCurveTo(34, -44, 28, -40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(52 + i * 6, -54); ctx.lineTo(54.5 + i * 6, -49); ctx.lineTo(57 + i * 6, -54); ctx.fill(); }
  circle(45, -63, 5, '#fff'); circle(46, -63, 3, '#e8a317'); circle(46.6, -63, 1.6, '#111'); circle(47.4, -64.4, 0.9, '#fff');
  ctx.restore();
}
function drawChicken(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#f2a43a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-4, -14); ctx.lineTo(-6, 0); ctx.lineTo(-12, 0); ctx.moveTo(8, -14); ctx.lineTo(8, 0); ctx.lineTo(2, 0); ctx.stroke();
  ctx.fillStyle = '#f4f4f4'; for (const [dx, dy, an] of [[-22, -34, -0.9], [-26, -26, -0.5], [-24, -18, -0.1]]) { ctx.save(); ctx.translate(dx, dy); ctx.rotate(an); ell(-6, 0, 12, 5, 0, '#e8e8f0'); ctx.restore(); }
  ell(0, -28, 24, 20, 0, vgrad(-48, -8, '#ffffff', '#f2f2f6', '#cfd2dc')); ell(2, -24, 13, 9, -0.3, '#e4e6ee');
  circle(20, -48, 14, '#fff'); ctx.fillStyle = '#e53935'; for (const [dx, r] of [[12, 5], [19, 6.5], [26, 5]]) circle(dx, -61, r, '#e53935');
  ctx.fillStyle = '#f2a43a'; ctx.beginPath(); ctx.moveTo(30, -50); ctx.lineTo(42, -46); ctx.lineTo(30, -42); ctx.closePath(); ctx.fill();
  ell(30, -38, 3.4, 5, 0, '#e53935'); circle(22, -51, 3.8, '#fff'); circle(23, -51, 2.4, '#222'); circle(23.8, -52, 0.8, '#fff'); ell(26, -44, 3.4, 2, 0, 'rgba(255,120,130,.4)');
  ctx.restore();
}
function drawMeteor(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const g = ctx.createLinearGradient(-90, -90, 0, -30); g.addColorStop(0, 'rgba(255,90,20,0)'); g.addColorStop(0.6, 'rgba(255,150,40,.7)'); g.addColorStop(1, 'rgba(255,230,140,.95)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-96, -96); ctx.lineTo(-8, -52); ctx.lineTo(-20, -10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,200,90,.8)'; ctx.beginPath(); ctx.moveTo(-70, -80); ctx.lineTo(-10, -44); ctx.lineTo(-22, -30); ctx.closePath(); ctx.fill();
  ell(0, -32, 30, 26, 0.3, vgrad(-60, -6, '#8a7a72', '#5a4a46', '#2e2220')); circle(-8, -40, 6, '#3a2c28'); circle(10, -26, 5, '#3a2c28'); circle(2, -18, 3.4, '#3a2c28');
  ell(-8, -48, 11, 5, 0.4, 'rgba(255,255,255,.2)'); ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, -32, 30, 26, 0.3, Math.PI * 0.9, Math.PI * 1.6); ctx.stroke();
  for (const [dx, dy] of [[-60, -20], [-76, -34], [-50, -6]]) drawStar(dx, dy, 6, '#ffd34d');
  ctx.restore();
}
function drawFeathered(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * 1.7, s * 1.7); ctx.translate(-4, 0);
  for (const [dx, an, c] of [[-14, -1.2, '#3fa9f5'], [-8, -0.95, '#f2a43a'], [-2, -0.7, '#e84a6f'], [4, -0.45, '#f2d03a']]) { ctx.save(); ctx.translate(dx, -26); ctx.rotate(an); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(-2, -26, 0, -32); ctx.quadraticCurveTo(4, -22, 4, 0); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
  drawCompy(0, 0, 1, 0.4, false, {}); ctx.restore();
}
function drawAmmonite(x, y, s) {
  ctx.save(); ctx.translate(x, y - 34 * s); ctx.scale(s, s);
  ctx.fillStyle = '#e8b878'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(24, 12 + i * 5); ctx.quadraticCurveTo(46, 14 + i * 7, 50, 28 + i * 3); ctx.lineWidth = 5; ctx.strokeStyle = '#d89850'; ctx.stroke(); }
  circle(0, 0, 32, vgrad(-32, 32, '#f6d9a0', '#e0a050')); ctx.lineWidth = 2.5; ctx.strokeStyle = '#8a5a20'; ctx.beginPath(); ctx.arc(0, 0, 32, 0, 7); ctx.stroke();
  ctx.strokeStyle = '#a8742c'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let a = 0; a < 12.6; a += 0.1) { const r = 3 + a * 2.2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke();
  ctx.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = i * 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); ctx.stroke(); }
  circle(36, 26, 5, '#fff'); circle(37, 26, 2.6, '#222'); ctx.restore();
}
function drawArchelon(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#5fa08a'; ctx.beginPath(); ctx.ellipse(-30, -12, 20, 7, -0.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(32, -10, 22, 7, 0.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-40, -30, 14, 6, 0.9, 0, 7); ctx.fill();
  ell(0, -30, 46, 28, 0, vgrad(-58, -2, '#a0d8b8', '#5aa078', '#2f6a4a')); ctx.strokeStyle = 'rgba(20,60,40,.55)'; ctx.lineWidth = 2.5; for (const [px, py, r] of [[-20, -34, 12], [0, -38, 14], [20, -34, 12], [-8, -20, 10], [12, -18, 10]]) { ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.stroke(); }
  ell(52, -34, 16, 12, 0, '#6fb090'); circle(58, -38, 5, '#fff'); circle(59, -38, 2.8, '#222'); ctx.strokeStyle = '#2f6a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(62, -30, 5, 0.2, 1.6); ctx.stroke();
  ctx.restore();
}
function drawFootprint(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ell(0, -22, 50, 22, 0, vgrad(-44, 0, '#b0a698', '#8a8070', '#5e564a')); ell(0, -26, 44, 17, 0, '#a89e90');
  ctx.fillStyle = '#4a4238'; for (const [tx, ty, an] of [[-17, -33, -0.5], [0, -38, 0], [17, -33, 0.5]]) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(an); ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 11, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(0, -19); ctx.lineTo(4, -10); ctx.fill(); ctx.restore(); }
  ctx.beginPath(); ctx.ellipse(0, -16, 12, 9, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#5a7a3a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-40, -8); ctx.quadraticCurveTo(-46, -22, -38, -32); ctx.moveTo(-40, -8); ctx.quadraticCurveTo(-30, -20, -28, -30); ctx.stroke();
  ctx.restore();
}
function drawIchthyo(x, y, s) {
  ctx.save(); ctx.translate(x, y - 30 * s); ctx.scale(s, s);
  ctx.fillStyle = '#4f7fa8'; ctx.beginPath(); ctx.moveTo(-50, 0); ctx.quadraticCurveTo(-64, -22, -52, -32); ctx.quadraticCurveTo(-48, -12, -40, -6); ctx.quadraticCurveTo(-48, 10, -52, 24); ctx.quadraticCurveTo(-58, 12, -50, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6, -18); ctx.quadraticCurveTo(0, -42, 14, -36); ctx.quadraticCurveTo(8, -26, 6, -16); ctx.fill();
  ell(-4, 0, 48, 19, 0.05, vgrad(-20, 20, '#8ac0e0', '#4f86b0', '#2e5a82')); ell(2, 8, 36, 8, 0.05, '#d8ecf8');
  ctx.fillStyle = '#4f86b0'; ctx.beginPath(); ctx.moveTo(34, -8); ctx.lineTo(84, -3); ctx.lineTo(34, 5); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(48 + i * 8, 2); ctx.lineTo(51 + i * 8, 7); ctx.lineTo(54 + i * 8, 1); ctx.fill(); }
  ctx.fillStyle = '#3a6a94'; ctx.beginPath(); ctx.moveTo(12, 10); ctx.quadraticCurveTo(14, 28, 28, 30); ctx.quadraticCurveTo(24, 18, 22, 8); ctx.fill();
  circle(34, -6, 7, '#fff'); circle(36, -6, 4, '#222'); circle(37.4, -7.6, 1.4, '#fff'); ctx.restore();
}
function drawMosa(x, y, s) {
  ctx.save(); ctx.translate(x, y - 28 * s); ctx.scale(s, s); ctx.lineCap = 'round';
  ctx.strokeStyle = '#2f7a6a'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(-70, 12); ctx.bezierCurveTo(-46, -22, -22, 26, 6, -4); ctx.bezierCurveTo(24, -22, 36, -8, 48, -10); ctx.stroke();
  ctx.strokeStyle = '#4fb09a'; ctx.lineWidth = 12; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#2f7a6a'; ctx.beginPath(); ctx.moveTo(-70, 12); ctx.lineTo(-90, 0); ctx.lineTo(-84, 22); ctx.fill();
  ctx.fillStyle = '#3a8f7e'; ctx.beginPath(); ctx.ellipse(-6, 14, 12, 5, 0.9, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(20, -2, 11, 5, 0.9, 0, 7); ctx.fill();
  ctx.fillStyle = '#4fb09a'; ctx.beginPath(); ctx.moveTo(40, -20); ctx.quadraticCurveTo(60, -26, 84, -14); ctx.quadraticCurveTo(88, -6, 80, -2); ctx.lineTo(44, 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(52 + i * 6, -2); ctx.lineTo(54.5 + i * 6, 4); ctx.lineTo(57 + i * 6, -2); ctx.fill(); }
  circle(54, -15, 5.4, '#fff'); circle(55.6, -15, 3.2, '#e8a317'); circle(56.2, -15, 1.6, '#111'); ctx.restore();
}
function drawPlesio(x, y, s) {
  ctx.save(); ctx.translate(x, y - 24 * s); ctx.scale(s, s); ctx.lineCap = 'round';
  ctx.fillStyle = '#3d8a6a'; for (const [fx, fy, an] of [[-20, 12, 0.7], [-26, -8, -0.5], [18, 14, 0.6], [24, -8, -0.6]]) { ctx.save(); ctx.translate(fx, fy); ctx.rotate(an); ctx.beginPath(); ctx.ellipse(0, 12, 8, 20, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#3d8a6a'; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.quadraticCurveTo(-58, 6, -70, 20); ctx.quadraticCurveTo(-48, 12, -30, 12); ctx.fill();
  ell(0, 0, 40, 22, 0, vgrad(-22, 22, '#8ad4a8', '#4fae82', '#2f7a5a')); ell(0, 10, 30, 8, 0, '#d8f4e4');
  ctx.strokeStyle = '#4fae82'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(30, -10); ctx.quadraticCurveTo(52, -36, 46, -66); ctx.stroke(); ctx.strokeStyle = '#8ad4a8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(30, -14); ctx.quadraticCurveTo(50, -38, 44, -66); ctx.stroke();
  ell(54, -72, 16, 11, 0.15, '#4fae82'); circle(59, -76, 4.8, '#fff'); circle(60, -76, 2.8, '#222'); ctx.strokeStyle = '#2f7a5a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(63, -68, 4, 0.2, 1.6); ctx.stroke(); ctx.restore();
}
function drawQuetzal(x, y, s) {
  ctx.save(); ctx.translate(x, y - 38 * s); ctx.scale(s, s);
  ctx.fillStyle = '#c28a6a'; ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(-30, -52); ctx.quadraticCurveTo(-20, -30, -66, -26); ctx.quadraticCurveTo(-30, -6, -46, 14); ctx.quadraticCurveTo(-14, 4, 8, 6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7a4a32'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = 'rgba(100,50,30,.5)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-52, -26); ctx.moveTo(-6, 0); ctx.lineTo(-40, 8); ctx.stroke();
  ell(8, 0, 26, 12, -0.1, vgrad(-12, 12, '#e8c0a0', '#c28a6a')); ctx.fillStyle = '#e8c0a0'; ctx.beginPath(); ctx.moveTo(26, -6); ctx.lineTo(96, -8); ctx.lineTo(28, 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7a4a32'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#e0553a'; ctx.beginPath(); ctx.moveTo(24, -10); ctx.quadraticCurveTo(10, -30, -8, -26); ctx.quadraticCurveTo(10, -14, 22, -4); ctx.fill();
  circle(30, -5, 5, '#fff'); circle(31, -5, 3, '#222'); circle(32, -6.4, 1.2, '#fff'); ctx.restore();
}
function drawArchaeo(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-4, -14); ctx.lineTo(-6, 0); ctx.lineTo(-12, 0); ctx.moveTo(8, -14); ctx.lineTo(8, 0); ctx.lineTo(2, 0); ctx.stroke();
  for (let i = 0; i < 7; i++) { ctx.save(); ctx.translate(-22, -26); ctx.rotate(-2.55 + i * 0.1); ctx.fillStyle = i % 2 ? '#3fa9a0' : '#e8873a'; ctx.beginPath(); ctx.ellipse(-26, 0, 28, 4.6, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ell(0, -28, 24, 17, -0.2, vgrad(-44, -10, '#52b8a8', '#2f8a7e')); ell(6, -22, 14, 8, -0.2, '#f6e0b0');
  for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(-2, -34); ctx.rotate(-0.4 + i * 0.28 - 2.2); ctx.fillStyle = ['#e8873a', '#f2c13a', '#3fa9a0'][i % 3]; ctx.beginPath(); ctx.ellipse(-16, 0, 20, 5.4, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ell(26, -42, 12, 11, 0, '#3fa9a0'); ctx.fillStyle = '#f2c13a'; ctx.beginPath(); ctx.moveTo(34, -46); ctx.lineTo(50, -42); ctx.lineTo(34, -37); ctx.fill(); ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(37 + i * 4, -40); ctx.lineTo(38.6 + i * 4, -37); ctx.lineTo(40.2 + i * 4, -40); ctx.fill(); }
  circle(28, -45, 4.4, '#fff'); circle(29, -45, 2.4, '#222'); ctx.strokeStyle = '#2f8a7e'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(12, -30); ctx.lineTo(24, -22); ctx.stroke(); ctx.restore();
}
function drawTheriz(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round';
  ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(-10, 0); ctx.moveTo(10, -20); ctx.lineTo(12, 0); ctx.stroke();
  ctx.fillStyle = '#b07a52'; ctx.beginPath(); ctx.moveTo(-26, -34); ctx.quadraticCurveTo(-58, -30, -66, -14); ctx.quadraticCurveTo(-40, -22, -22, -14); ctx.fill();
  ell(0, -36, 30, 26, -0.1, vgrad(-62, -10, '#e0a878', '#b07a52', '#7a4a2a')); ctx.strokeStyle = '#f0c898'; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-18 + i * 7, -52); ctx.lineTo(-22 + i * 7, -40); ctx.stroke(); }
  ctx.strokeStyle = '#b07a52'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(20, -50); ctx.quadraticCurveTo(34, -62, 36, -82); ctx.stroke();
  ell(40, -88, 11, 9, 0.2, '#b07a52'); ctx.fillStyle = '#f2c13a'; ctx.beginPath(); ctx.moveTo(48, -90); ctx.lineTo(58, -86); ctx.lineTo(48, -83); ctx.fill(); circle(41, -90, 3.6, '#fff'); circle(41.8, -90, 2, '#222');
  ctx.strokeStyle = '#b07a52'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(20, -42); ctx.lineTo(40, -34); ctx.stroke();
  ctx.strokeStyle = '#f6efe0'; ctx.lineWidth = 4.2; for (const [dx, dy] of [[0, 0], [5, 6], [10, 11]]) { ctx.beginPath(); ctx.moveTo(40 + dx, -34 + dy * 0.2); ctx.quadraticCurveTo(66 + dx, -20 + dy, 78 + dx * 0.5, -2 + dy); ctx.stroke(); }
  ctx.restore();
}
const CARD_ART = [
  // [draw(x, y, s), width, height, offset x of the visual centre]  (calendar order, one per level)
  [(x, y, s) => drawRex(x, y, s, 0.4, 0.05, { body: undefined }), 250, 150, -5],
  [(x, y, s) => drawTrike(x, y, s, '#c98f5a', 0.4, false), 120, 70, 2],
  [(x, y, s) => drawLongneck(x, y, s, '#7fb069', 0.4, false), 220, 168, -6],
  [drawAmmonite, 90, 70, 2],
  [drawArchelon, 130, 62, 4],
  [drawFootprint, 120, 52, 0],
  [(x, y, s) => drawRaptor(x, y, s, 0.4, false, {}), 205, 105, -14],
  [(x, y, s) => drawPtero(x, y - 22 * s, s, 1.0, false), 96, 66, 14],
  [drawStego, 160, 80, -12],
  [drawIchthyo, 150, 70, 8],
  [drawMosa, 190, 72, -8],
  [drawPlesio, 150, 100, -2],
  [drawMammoth, 130, 80, 8],
  [drawAnkylo, 150, 62, -10],
  [(x, y, s) => { drawEgg(x - 26 * s, y - 22 * s, 20 * s, '#f6e7b0', '#6aa84f'); drawEgg(x + 22 * s, y - 20 * s, 18 * s, '#cfe8ff', '#e07b39', 0, 0.2); drawEgg(x - 2 * s, y - 14 * s, 14 * s, '#ffe9c2', '#d63a3a', 0, -0.15); }, 100, 50, 0],
  [drawQuetzal, 160, 70, 14],
  [drawArchaeo, 120, 76, 2],
  [drawTheriz, 120, 106, 8],
  [drawSpino, 178, 100, -2],
  [drawChicken, 80, 66, 8],
  [drawMeteor, 120, 100, -34],
  [(x, y, s) => { pine(x - 26 * s, y, 90 * s, '#2f6a50', true); pine(x + 28 * s, y, 66 * s, '#3b7d5c', false); }, 100, 90, 0],
  [(x, y, s) => { drawBaby(x, y, s * 1.5, 0.3, false); ctx.strokeStyle = '#d63a3a'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 6 * s, y - 64 * s); ctx.quadraticCurveTo(x + 14 * s, y - 56 * s, x + 24 * s, y - 62 * s); ctx.stroke(); }, 80, 90, 0],
  [drawFeathered, 110, 80, 0],
];
const cardCache = {};
function cardSprite(i, silhouette) { // pre-rendered, outlined sticker art at 2x
  const key = i + (silhouette ? 's' : 'c'); if (cardCache[key]) return cardCache[key];
  const [fn, w, h, ox] = CARD_ART[i], R = 2, CW = 280, CH = 170, sc = Math.min(CW / (w + 14), CH / (h + 14));
  const c = document.createElement('canvas'); c.width = CW * R; c.height = CH * R;
  const art = document.createElement('canvas'); art.width = c.width; art.height = c.height;
  const old = ctx, oldT = T; ctx = art.getContext("2d"); ctx.setTransform(R, 0, 0, R, 0, 0); T = 1;
  try { fn(CW / 2 - ox * sc, CH / 2 + h * sc / 2, sc); } finally { ctx = old; T = oldT; }
  const sil = document.createElement('canvas'); sil.width = c.width; sil.height = c.height; const sx = sil.getContext('2d');
  sx.drawImage(art, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = silhouette ? 'rgba(90,70,45,.55)' : '#1b120c'; sx.fillRect(0, 0, sil.width, sil.height);
  const cx = c.getContext('2d'); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; cx.drawImage(sil, Math.cos(a) * 4, Math.sin(a) * 4); }
  if (silhouette) cx.drawImage(sil, 0, 0); else cx.drawImage(art, 0, 0);
  return cardCache[key] = c;
}
function drawCardArt(i, cx, cy, w, silhouette) { const c = cardSprite(i, silhouette), h = w * 170 / 280; ctx.drawImage(c, cx - w / 2, cy - h / 2, w, h); }

// dev-only character sheets: window.__dino.sheet('rex' | 'hero' | 'cast' | 'react' | 'faces')
let sheetPage = 'hero';
function drawSheet() {
  ctx.fillStyle = '#d8e6d6'; ctx.fillRect(0, 0, W, H);
  const row = (y, label) => { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, y, W, 2); txt(label, 14, y - 10, 14, '#3b2410', 'left'); };
  const t = T * 8, fx = o => Object.assign(chiliFx, { vy: 0, dig: false, scared: 0, joy: 0 }, o);
  if (sheetPage === 'rex') {
    oRex(250, 330, 2.2, t, 0.05, Object.assign(rexLook(0), { rider: true }));
    oRex(700, 330, 2.2, t, 1, Object.assign(rexLook(0), {}));
    oRex(130, 510, 0.9, 0.8, 0.05, Object.assign(rexLook(0), { rider: true, air: true, vy: -300, sq: -0.06 }));
    oRex(420, 510, 0.9, 0, 0.05, Object.assign(rexLook(0), { rider: true, duck: true }));
    oRex(700, 510, 0.9, t, 0.3, Object.assign(rexLook(0), { fire: true }));
  } else if (sheetPage === 'faces') {
    row(300, 'OLI hats: none / santa / cowboy / crown');
    [null, 'santa', 'cowboy', 'crown'].forEach((h, i) => { ctx.save(); ctx.translate(90 + i * 150, 250); ctx.scale(3.6, 3.6); drawOli(0, 0, 0.5, h, {}); ctx.restore(); });
    drawGoettiHead(790, 160, 90);
    row(520, 'PROFESSOR GOETTI portraits + full body');
    drawPortrait('goetti', 100, 440, 60); oGoetti(300, 530, 1.0, true); drawPortrait('goetti', 500, 450, 40);
  } else if (sheetPage === 'react') {
    row(200, 'CHILI  idle / scared / happy / digging');
    fx({}); oChili(120, 190, 2.6, t, false); fx({ scared: 1 }); oChili(330, 190, 2.6, t, false); fx({ joy: 1 }); oChili(540, 170, 2.6, t, false); fx({ dig: true }); oChili(760, 190, 2.6, t, false); fx({});
    row(450, 'PTERODACTYL  flap phases');
    [0, 1.2, 3.14, 4.4].forEach((ph, i) => oPtero(120 + i * 220, 340, 2.2, ph, false)); oPtero(900, 340, 1.4, t, false);
  } else if (sheetPage === 'hero') {
    row(235, 'REX  run / jump / roar / duck / fire');
    oRex(110, 225, 0.8, t, 0.05, Object.assign(rexLook(0), { rider: true }));
    oRex(300, 225, 0.8, 0.8, 0.05, Object.assign(rexLook(0), { rider: true, air: true, vy: -300, sq: -0.06 }));
    oRex(500, 225, 0.8, t, 1, Object.assign(rexLook(0), { rider: true }));
    oRex(690, 225, 0.8, 0, 0.05, Object.assign(rexLook(0), { rider: true, duck: true }));
    oRex(850, 225, 0.55, t, 0.3, Object.assign(rexLook(0), { fire: true }));
    row(500, 'OLI (plain / santa hat)   CHILI (run / jump / sniff)   BABY');
    ctx.save(); ctx.translate(70, 475); ctx.scale(2.2, 2.2); drawOli(0, 0, t, null, {}); ctx.restore();
    ctx.save(); ctx.translate(190, 475); ctx.scale(2.2, 2.2); drawOli(0, 0, t, 'santa', {}); ctx.restore();
    fx({}); oChili(330, 480, 1.9, t, false); fx({ vy: -500 }); oChili(480, 455, 1.9, t, false); fx({ dig: true }); oChili(630, 480, 1.9, t, false); fx({});
    oBaby(790, 480, 1.4, t, false);
  } else {
    row(215, 'RAPTOR / BOSS / PTERO / COMPY');
    oRaptor(150, 205, 1.3, t, false, {}); oRaptor(400, 205, 1.3, t, false, { col: '#8b1a1a', dark: '#4a0a0a', crown: true });
    oPtero(600, 120, 1.5, t, false); oCompy(760, 205, 1.9, t, false, {}); oBaby(900, 205, 1.3, t, false);
    row(385, 'GOETTI / KIWI / LONGNECK / TRIKE');
    oGoetti(70, 375, 0.8, true); oKiwi(200, 370, 1.6, t, false); oLong(470, 375, 0.8, '#7fb069', t, false); oTrike(730, 375, 1.3, '#c98f5a', t, false);
    row(430, 'PORTRAITS');
    ['goetti', 'chili', 'rex', 'mami', 'papi', 'fabio', 'kiwi'].forEach((w, i) => drawPortrait(w, 70 + i * 130, 485, 38));
  }
}
let bookSel = -1;
function leatherCover() {
  ctx.fillStyle = vgrad(0, H, '#6a4528', '#4f3119', '#33200f'); ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1; for (let i = 0; i < 260; i++) { const x = hash(i) * W, y = hash(i + 7) * H; ctx.beginPath(); ctx.arc(x, y, 1 + hash(i + 3) * 2, 0, 6.3); ctx.stroke(); } ctx.restore();
  ctx.setLineDash([9, 7]); ctx.lineWidth = 2.5; ctx.strokeStyle = '#d4a85a'; rr(9, 9, W - 18, H - 18, 18); ctx.stroke(); ctx.setLineDash([]);
  for (const [x, y] of [[9, 9], [W - 9, 9], [9, H - 9], [W - 9, H - 9]]) { circle(x, y, 9, '#d6b36a'); circle(x - 2, y - 2, 3, '#fff3c0'); }
  // page block with a visible page edge
  rr(24, 26, W - 44, H - 40, 14); ctx.fillStyle = '#d9c597'; ctx.fill();
  rr(20, 20, W - 40, H - 40, 14); ctx.fillStyle = vgrad(20, H, '#f8ebc8', '#f3e2bf', '#e8d4a4'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#a88a52'; ctx.stroke();
}
function foil(x, y, w, h, r, t) { // diagonal shimmer on found cards
  ctx.save(); rr(x, y, w, h, r); ctx.clip(); const u = ((t * 0.35) % 1.6) - 0.3, gx = x + u * (w + h);
  const g = ctx.createLinearGradient(gx - 30, y, gx + 30, y + h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}
function drawBook() {
  leatherCover();
  otxt('Olis Dino-Buch', W / 2, 46, 36, '#ffd34d', '#3b1d00', 9);
  const found = save.lvDone.filter(Boolean).length;
  txt(`${found} von ${FACTS.length} Karten gefunden – jeden Tag eine neue!`, W / 2, 80, 17, '#6b4a2b', 'center', 'normal');
  if (!save.bookSeen) save.bookSeen = [];
  for (let i = 0; i < FACTS.length; i++) {
    const lv = LEVELS[i], th = WORLDS[lv.wi], has = !!save.lvDone[i];
    const x = 28 + (i % 6) * 152, y = 94 + Math.floor(i / 6) * 96, w = 142, h = 90, isNew = has && !save.bookSeen[i];
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate((hash(i * 3 + 1) - 0.5) * 0.07); ctx.translate(-w / 2, -h / 2);
    rr(2, 4, w, h, 11); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
    rr(0, 0, w, h, 11); ctx.fillStyle = has ? '#fffaf0' : '#e6d8b8'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = has ? '#8a6a3a' : '#b8a888'; ctx.stroke();
    rr(5, 5, w - 10, h - 10, 7); ctx.fillStyle = has ? vgrad(5, h - 5, shade(th.sky[1], 1.15), th.sky[1]) : '#d8c8a8'; ctx.fill();
    if (has) { drawCardArt(i, w / 2, 36, 120, false); ctx.save(); rr(5, 5, w - 10, h - 10, 7); ctx.clip(); ctx.fillStyle = 'rgba(255,250,240,.88)'; ctx.fillRect(5, h - 27, w - 10, 22); ctx.restore(); txt(FACTS[i].name, w / 2, h - 16, FACTS[i].name.length > 12 ? 12 : FACTS[i].name.length > 9 ? 14 : 16, '#2b1a00'); foil(5, 5, w - 10, h - 10, 7, T + i); }
    else { drawCardArt(i, w / 2, 36, 120, true); txt(`Tür ${i + 1}`, w / 2, h - 16, 14, '#a8987a', 'center', 'normal'); txt('?', w - 18, 20, 22, 'rgba(120,90,50,.5)'); }
    if (isNew) { ctx.save(); ctx.translate(w - 24, 18); ctx.rotate(0.35); rr(-20, -9, 40, 18, 5); ctx.fillStyle = '#e53935'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('NEU', 0, 1, 13, '#fff'); ctx.restore(); }
    ctx.restore();
    if (bookSel < 0) buttons.push({ x, y, w, h, cb: () => { if (has) { bookSel = i; save.bookSeen[i] = true; writeSave(); } else toast(`Diese Karte findest du in Tür ${i + 1}.`, '#fff'); } });
  }
  if (bookSel < 0) button('Zurück', W / 2 - 100, H - 62, 200, 46, () => go('map'), { size: 24, icon: icon('back') });
  else {
    const th = WORLDS[LEVELS[bookSel].wi];
    panel(90, 56, 780, 420);
    ctx.save(); rr(120, 90, 340, 250, 18); ctx.clip(); ctx.fillStyle = vgrad(90, 340, shade(th.sky[1], 1.2), th.sky[1]); ctx.fillRect(120, 90, 340, 250); ctx.restore(); rr(120, 90, 340, 250, 18); ctx.lineWidth = 4; ctx.strokeStyle = '#fffaf0'; ctx.stroke(); rr(118, 88, 344, 254, 20); ctx.lineWidth = 2; ctx.strokeStyle = '#8a6a3a'; ctx.stroke();
    drawCardArt(bookSel, 290, 215, 320, false); foil(120, 90, 340, 250, 18, T);
    txt(FACTS[bookSel].name, 500, 126, FACTS[bookSel].name.length > 11 ? 32 : 38, '#3b2410', 'left'); txt(`Tür ${bookSel + 1} · ${LEVELS[bookSel].title}`, 500, 160, 18, '#8a6a3a', 'left', 'normal');
    wrapLines(FACTS[bookSel].text, 330, 22).forEach((l, i) => txt(l, 500, 200 + i * 30, 22, '#3b2410', 'left', 'normal'));
    button('Schliessen', W / 2 - 110, 392, 220, 56, () => { bookSel = -1; }, { icon: icon('check') });
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
    { who: 'goetti', text: 'Und schaut mal, wer zum Feiern gekommen ist: Mamasaurus, Papasaurus und Fabiosaurus!' },
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
  drawNZFlag(120, 168, 52, 33, T, 34);
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
  oRex(640, 452, 1.0, E.phase === 'party' ? T * 6 : 0, E.phase === 'party' ? 0.3 + 0.3 * Math.sin(T * 5) : 0.1, Object.assign(rexLook(2), { rider: true, flip: true, hat: rexLook(2).hat || 'santa' }));
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
  if (scene === 'play' && G && !G.overlay && G.sk.duck && Math.hypot(x - 76, y - (H - 78)) < 84) { duckDown(e.pointerId); return; }
  if (scene === 'play' && G && !G.overlay && G.sk.dash && !G.L.swim) { const [dx, dy, dr] = dashPos(); if (Math.hypot(x - dx, y - dy) < dr + 14) { dash(); return; } }
  if (scene === 'map' && !parentMode && !doorOverlay && x < 350 && y < 56) titlePress = T;
  if (hitButtons(x, y)) return;
  if (scene === 'title') pressTitle();
  else if (scene === 'play' && !G.overlay) { jump(); G.holdJump = e.pointerId; }
});
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, e => { titlePress = 0; duckUp(e.pointerId); if (G && G.holdJump === e.pointerId) G.holdJump = null; });
window.addEventListener('keyup', e => { if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') duckUp('key'); if (G && G.holdJump === 'key' && (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')) G.holdJump = null; });
window.addEventListener('keydown', e => {
  if (nameOpen() || e.repeat) return;
  audio();
  const k = e.key;
  if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') {
    e.preventDefault();
    if (dialog) advanceDialog();
    else if (scene === 'title') pressTitle();
    else if (scene === 'play' && !G.overlay) { jump(); G.holdJump = 'key'; }
    else if (scene === 'ending' && E.phase === 'tap') tapEgg();
  } else if (k === 'r' || k === 'R' || k === 'x' || k === 'X' || k === 'ArrowRight' || k === 'Enter') {
    if (dialog) advanceDialog();
    else if (scene === 'play' && !G.overlay) roar();
  } else if (k === 'f' || k === 'F' || k === 'Shift' || k === 'ArrowLeft') {
    if (scene === 'play' && !G.overlay) dash();
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
  musicTick(save.muted || portrait ? null : scene === 'play' ? (G.overlay && G.overlay.type !== 'riddle' ? null : String(G.wi)) : scene === 'ending' ? null : 'map', scene === 'play' ? musicLevel() : 0);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  buttons = [];
  if (scene === 'title') drawTitle();
  else if (scene === 'story') drawStory();
  else if (scene === 'map') drawMap();
  else if (scene === 'book') drawBook();
  else if (scene === 'shop') drawShop();
  else if (scene === 'sheet') drawSheet();
  else if (scene === 'play') drawPlay();
  else if (scene === 'ending') drawEnding();
  drawDialog();
  if (!(scene === 'play' && G.overlay)) drawToasts();
  if (fadeT > 0) { fadeT = Math.max(0, fadeT - DT * 4.5); ctx.fillStyle = `rgba(10,8,20,${fadeT})`; ctx.fillRect(0, 0, W, H); }
  if (portrait) { buttons = []; ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(0, 0, W, H); otxt('Bitte das Tablet quer halten!', W / 2, H / 2, 44, '#ffd34d', '#000', 8); }
  ctx.restore();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// debug hook for testing in the browser console
window.__dino = { get scene() { return scene; }, get doorOverlay() { return doorOverlay; }, get buttons() { return buttons; }, pitFall, get lowfx() { return LOWFX; }, set lowfx(v) { LOWFX = v; }, get G() { return G; }, get E() { return E; }, save, startLevel, startEnding, go, jump, roar, updatePlay, updateEnding, answer, retry, tapEgg, openGate, playTreasure, drawPlay, duckDown, duckUp, shootFire, drawShop, buildSong, dash, LEVELS, adventDay, openDoorGift, giftFor, clickDoor, skillsFor, bookOpen(i) { bookSel = i; }, sheet(p) { sheetPage = p || 'hero'; scene = 'sheet'; } };
})();
