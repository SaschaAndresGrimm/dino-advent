'use strict';
/* Oli & Fabios Dino-Advent – ein Weihnachtsgeschenk von Goetti */
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
  const w = window.innerWidth, h = window.innerHeight;
  // cap DPR at 2 and keep the backing store under ~3.2M pixels so large tablets stay smooth
  DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3.2e6 / Math.max(1, w * h))));
  canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  SC = Math.min(w / W, h / H); OX = (w - W * SC) / 2; OY = (h - H * SC) / 2;
}
window.addEventListener('resize', resize); resize();

// =====================================================================
// Save game
// =====================================================================
const SAVE_KEY = 'olisDinoRettung.v1';
let save = { rexName: '', babyName: '', fabioName: '', unlocked: 0, eggs: [[0,0,0],[0,0,0],[0,0,0],[0,0,0]], amber: 0, finished: false, muted: false, tutorialDone: false, learned: { duck: 0, stomp: 0, fire: 0, dash: 0, swim: 0, glide: 0 }, riddleSeen: [[], [], [], []],
  medals: [[0,0,0],[0,0,0],[0,0,0],[0,0,0]], treasures: [0,0,0,0], treasureNew: -1 };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) save = Object.assign(save, s); } catch (e) {}
// calendar progress: one entry per level (24 days). Old 4-world saves keep names, amber and shop items but start the calendar fresh.
if (!save.lvE) save.lvE = []; if (!save.lvM) save.lvM = []; if (!save.lvDone) save.lvDone = [];
while (save.lvE.length < 24) { save.lvE.push([0, 0, 0]); save.lvM.push([0, 0, 0]); save.lvDone.push(0); }
if (!save.gifts) save.gifts = []; if (!save.newGifts) save.newGifts = []; if (save.dayOverride === undefined) save.dayOverride = null;
save.learned = Object.assign({ duck: 0, stomp: 0, fire: 0, dash: 0, swim: 0, glide: 0 }, save.learned);
while (save.riddleSeen.length < 8) save.riddleSeen.push([]);
if (!save.owned) save.owned = { skin: [0], hat: [0], fire: [0] };
if (!save.equip) save.equip = { skin: 0, hat: 0, fire: 0 };
// shop extras: jackets for both boys, Fabio's own hat, Chili's accessories, Goetti's vouchers
for (const [k, v] of [['jacket', [0, 1]], ['chili', [0]], ['wish', []]]) if (!save.owned[k]) save.owned[k] = v;
if (save.equip.jacket == null) save.equip.jacket = 0;
if (save.equip.fabioJacket == null) save.equip.fabioJacket = 1;
if (save.equip.fabioHat == null) save.equip.fabioHat = save.equip.hat;
if (save.equip.chili == null) save.equip.chili = 0;
if (!save.best) save.best = []; while (save.best.length < 8) save.best.push(0);
if (save.volMusic == null) save.volMusic = 4; if (save.volSfx == null) save.volSfx = 4; if (!save.calm) save.calm = false;
if (!save.dailyLast) save.dailyLast = 0; if (!save.dailyStreak) save.dailyStreak = 0; if (!save.dailyBoardDay) save.dailyBoardDay = 0; if (!save.installHint) save.installHint = false;
if (!save.master) save.master = 0; if (!save.masterNew) save.masterNew = 0; if (!save.chestSeen) save.chestSeen = 0;
if (!save.storySeen) save.storySeen = {}; if (!save.afterNew) save.afterNew = 0; if (!save.oliName) save.oliName = '';
if (!save.board) save.board = []; while (save.board.length < 9) save.board.push([]); if (!save.nick) save.nick = '';
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// =====================================================================
// Sound (synthesised, no files needed)
// =====================================================================
let AC = null, musicIn = null, fxIn = null, ambIn = null, duckIn = null; // musicIn: every music note (fades the whole song); duckIn: dips the music under big effects; fxIn: sound effects and fanfares; ambIn: world ambience
function buildAudioGraph() {
  let master = AC.destination;
  try { // a gentle compressor/limiter on everything, so the roar, the music and the effects never add up to distortion
    const c = AC.createDynamicsCompressor(); c.threshold.value = -14; c.knee.value = 12; c.ratio.value = 6; c.attack.value = 0.003; c.release.value = 0.2; c.connect(AC.destination); master = c;
    // soft clipper after the compressor: about +4 dB of loudness for normal levels, and the ceiling (0.95) keeps the oversampling filter from overshooting full scale
    const sh = AC.createWaveShaper(), n = 2048, curve = new Float32Array(n); for (let i = 0; i < n; i++) curve[i] = 0.95 * Math.tanh((i / (n - 1) * 2 - 1) * 1.5) / Math.tanh(1.5);
    sh.curve = curve; sh.oversample = '2x'; c.disconnect(); c.connect(sh); sh.connect(AC.destination);
  } catch (e) {}
  musicIn = AC.createGain(); duckIn = AC.createGain(); fxIn = AC.createGain(); ambIn = AC.createGain();
  musicIn.connect(duckIn); duckIn.connect(master); fxIn.connect(master); ambIn.connect(master); fxIn.gain.value = 1.25; // effects sit a little above the music
  try { // a small shared room reverb (generated impulse response, no assets) gives the synthesised sounds some space
    const n = Math.floor(AC.sampleRate * 1.3), ir = AC.createBuffer(2, n, AC.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    const cv = AC.createConvolver(); cv.buffer = ir; const rev = AC.createGain(); rev.connect(cv); cv.connect(master);
    for (const [src, amt] of [[musicIn, 0.12], [fxIn, 0.26]]) { const send = AC.createGain(); send.gain.value = amt; src.connect(send); send.connect(rev); }
  } catch (e) {}
}
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); buildAudioGraph(); } catch (e) {} }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
let bus = 'sfx'; // musicTick switches this to 'music' so the two volumes are separate; 'fanfare' = music volume but not faded with the song; 'amb' = world ambience
const busGain = () => (bus === 'music' || bus === 'fanfare' ? save.volMusic : save.volSfx) / 4;
let curPan = 0; // stereo position for the next sounds (set by panAt)
function busOut() {
  let dest = (bus === 'music' ? musicIn : bus === 'amb' ? ambIn : fxIn) || AC.destination;
  if (curPan && bus === 'sfx' && AC.createStereoPanner) { const pn = AC.createStereoPanner(); pn.pan.value = curPan; pn.connect(dest); dest = pn; }
  return dest;
}
function panAt(wx, fn) { curPan = clamp((wx - (G ? G.cam : 0)) / (W / 2) - 1, -1, 1) * 0.65; try { fn(); } finally { curPan = 0; } } // play a sound from where it happens on screen
function duck(depth = 0.5, hold = 0.12) { // sidechain-style: the music dips for a moment under a big effect so the effect punches through
  if (!duckIn || save.muted || !AC) return; const t = AC.currentTime, g = duckIn.gain, cur = typeof g.value === 'number' ? g.value : 1;
  g.cancelScheduledValues(t); g.setValueAtTime(cur, t); g.linearRampToValueAtTime(depth, t + 0.015); g.setValueAtTime(depth, t + hold); g.linearRampToValueAtTime(1, t + hold + 0.3);
}
// tone options o: att (attack s), hold (sustain then release: pads), det (chorus detune in cents), lp/lpTo (lowpass sweep Hz), vib (vibrato on long notes)
function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0, o = null) {
  if (save.muted || !AC) return; vol *= busGain(); if (vol <= 0.0005) return;
  const t = AC.currentTime + delay, g = AC.createGain(), att = o && o.att != null ? o.att : Math.min(0.006, dur * 0.25), dets = o && o.det ? [-o.det, o.det] : [0];
  if (dets.length > 1) vol *= 0.65; // two detuned voices: keep the level
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); // a short attack: no clicks
  if (o && o.hold) { g.gain.setValueAtTime(vol, t + Math.max(att, dur * 0.6)); g.gain.linearRampToValueAtTime(0.0001, t + dur); } else g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  let out = g;
  if (o && o.lp) { const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t); f.frequency.exponentialRampToValueAtTime(o.lpTo || Math.max(120, o.lp * 0.2), t + dur); g.connect(f); out = f; }
  out.connect(busOut());
  for (const det of dets) {
    const osc = AC.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    if (det && osc.detune) osc.detune.value = det;
    if (o && o.vib && dur > 0.25 && osc.detune) { const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 7; lfo.connect(lg); lg.connect(osc.detune); lfo.start(t); lfo.stop(t + dur + 0.05); }
    osc.connect(g); osc.start(t); osc.stop(t + dur + 0.05);
  }
}
let noiseBuf = null;
function noise(dur, vol = 0.3, freq = 800, delay = 0, ftype = 'lowpass') {
  if (save.muted || !AC) return; vol *= busGain(); if (vol <= 0.0005) return;
  const t = AC.currentTime + delay;
  if (!noiseBuf) { const n = Math.floor(AC.sampleRate * 2), d = (noiseBuf = AC.createBuffer(1, n, AC.sampleRate)).getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
  const src = AC.createBufferSource(); src.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = ftype; f.frequency.value = freq;
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(busOut()); src.start(t, Math.random() * 1.5, dur + 0.02);
}
// drum kit (all synthesised): kick with a click, snare = tone + bright noise, hats = high-passed noise
const kick = (d, v = 0.13) => { tone(160, 0.16, 'sine', v, 42, d); noise(0.012, v * 0.5, 4500, d, 'highpass'); };
const snare = (d, v = 0.09) => { noise(0.11, v, 1800, d, 'highpass'); tone(190, 0.09, 'triangle', v * 0.55, 120, d); };
const hat = (d, v = 0.035, open = false) => noise(open ? 0.09 : 0.03, v, 7500, d, 'highpass');
const SFX = {
  jump() { tone(330, 0.16, 'square', 0.07, 660); },
  jump2() { tone(500, 0.16, 'square', 0.07, 950); },
  roar() { duck(0.4, 0.28); noise(0.7, 0.45, 450); tone(120, 0.65, 'sawtooth', 0.16, 50); tone(180, 0.5, 'sawtooth', 0.09, 70); },
  dash() { noise(0.28, 0.35, 2600); tone(300, 0.25, 'sawtooth', 0.07, 900); },
  amber() { tone(1250, 0.07, 'sine', 0.08); tone(1680, 0.1, 'sine', 0.07, null, 0.05); },
  amberNote(c) { // pickup chains climb the scale of the song that is playing, snapped to its 16th-note grid
    const m = SONGS[mus.key] || { root: 330, sc: 'maj', bpm: 120 }, sc = SCALES[m.sc], rt = m.root * Math.pow(2, (mus.lift || 0) / 12), k = Math.min(c, 8);
    let d = 0; if (c > 0 && mus.key && AC) { const st = 60 / m.bpm / 4; d = (((mus.next - AC.currentTime) % st) + st) % st; if (d > 0.09) d = 0; } // never wait more than a hair
    const f = rt * 2 * Math.pow(2, (sc[k % 5] + 12 * Math.floor(k / 5) + 12) / 12); tone(f, 0.16, 'triangle', 0.1, null, d); tone(f * 2, 0.1, 'sine', 0.035, null, d);
  },
  egg() { keyRun(5, 0.14, 0.07); }, // plays a run in the key of the song that is playing
  hurt() { duck(0.6, 0.15); tone(320, 0.35, 'sawtooth', 0.14, 90); noise(0.15, 0.22, 700); },
  lose() { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.28, 'triangle', 0.13, f * 0.96, i * 0.22)); tone(131, 0.9, 'sawtooth', 0.05, 98, 0.66); }, // sad "wah-wah" when the hearts are gone
  lowHeart() { tone(150, 0.14, 'sine', 0.2, 80); tone(150, 0.14, 'sine', 0.2, 80, 0.2); }, // only one heart left
  land(v) { const k = clamp((v - 250) / 900, 0, 1); noise(0.07 + 0.06 * k, 0.08 + 0.2 * k, 500); tone(95, 0.1, 'sine', 0.06 + 0.1 * k, 55); },
  heart() { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.35, 'sine', 0.1, null, i * 0.08)); tone(330, 0.5, 'triangle', 0.08); },
  bubble() { for (let i = 0; i < 3; i++) { const f = 500 + Math.random() * 500; tone(f, 0.07, 'sine', 0.06, f * 1.8, i * 0.045); } },
  whoosh() { noise(0.5, 0.18, 1400); tone(500, 0.4, 'sine', 0.03, 900); },
  buy() { tone(1568, 0.09, 'square', 0.06); tone(2093, 0.4, 'square', 0.06, null, 0.09); noise(0.25, 0.08, 9000, 0.09); },
  chirp(mood) { if (mood === 'worried') { tone(900, 0.12, 'sine', 0.07, 500); tone(800, 0.16, 'sine', 0.07, 420, 0.13); } else { const f = 1300 + Math.random() * 300; tone(f, 0.06, 'sine', 0.06, f * 1.4); tone(f * 1.2, 0.07, 'sine', 0.06, f * 1.7, 0.08); } }, // Chili's squeaks
  sparkle() { for (let i = 0; i < 12; i++) tone(1200 + i * 150, 0.25, 'sine', 0.06, null, i * 0.05); },
  victory(big) { // level complete: a short fanfare, bigger after a boss
    const r = 261.6; if (!big) { fanNotes(r, [[0, 0], [4, 0.13], [7, 0.26], [12, 0.4], [7, 0.62], [12, 0.76], [12, 1.0, 1.1], [16, 1.0, 1.1], [19, 1.0, 1.1]]); return; }
    for (let i = 0; i < 12; i++) noise(0.05, 0.05 + i * 0.012, 3000, i * 0.045);
    fanNotes(r, [[0, 0.5], [0, 0.64], [0, 0.78], [5, 0.92, 0.3], [4, 1.28], [7, 1.42, 0.3], [12, 1.8, 1.4], [16, 1.8, 1.4], [19, 1.8, 1.4], [24, 1.8, 1.4]]); noise(1.2, 0.2, 7000, 1.8); tone(70, 0.7, 'sine', 0.3, 32, 1.8);
  },
  wrong() { tone(220, 0.2, 'square', 0.09, 160); tone(160, 0.25, 'square', 0.09, 120, 0.15); },
  right() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.14, null, i * 0.1)); },
  dig() { noise(0.18, 0.15, 1800); noise(0.18, 0.15, 1800, 0.25); noise(0.18, 0.15, 1800, 0.5); },
  smash() { duck(0.55, 0.15); noise(0.35, 0.4, 350); tone(90, 0.3, 'square', 0.12, 40); },
  click() { tone(720, 0.05, 'square', 0.05); },
  crack() { noise(0.12, 0.35, 3500); tone(900, 0.08, 'triangle', 0.08, 500); },
  flag() { tone(660, 0.12, 'triangle', 0.12); tone(990, 0.2, 'triangle', 0.12, null, 0.12); },
  pop() { tone(400, 0.2, 'sine', 0.15, 1200); },
  stomp() { duck(0.55, 0.15); noise(0.3, 0.45, 260); tone(110, 0.25, 'square', 0.13, 45); },
  boing() { tone(260, 0.18, 'triangle', 0.13, 780); },
  fire() { noise(0.35, 0.3, 1600); tone(200, 0.3, 'sawtooth', 0.06, 90); },
  duck() { tone(420, 0.08, 'triangle', 0.06, 260); },
  power() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'square', 0.05, null, i * 0.06)); },
};
function fanNotes(root, seq) { // [semitones, start, length = 0.2]: a bright brass-like fanfare
  for (const [n, t, len = 0.2] of seq) { tone(root * 2 * Math.pow(2, n / 12), len, 'square', 0.04, null, t); tone(root * Math.pow(2, n / 12), len, 'triangle', 0.08, null, t); }
}
function keyRun(n, vol, step) { // rising run on the scale of the current song, so the pickup always fits the music
  const m = SONGS[mus.key] || { root: 330, sc: 'maj' }, sc = SCALES[m.sc], rt = m.root * Math.pow(2, (mus.lift || 0) / 12);
  for (let i = 0; i < n; i++) tone(rt * 2 * Math.pow(2, (sc[i % 5] + 12 * Math.floor(i / 5)) / 12), 0.28, 'triangle', vol, null, i * step);
}
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
  ending: { seed: 70, bpm: 104, root: 261.6, wave: 'triangle', sc: 'maj', bass: 'calm', bells: true, dens: 0.5, hook: { bass: [0,N_,7,N_, 0,N_,7,N_, 5,N_,7,N_, 0,N_,7,N_], lead: [16,N_,16,17, 19,N_,19,17, 16,N_,14,N_, 12,N_,12,14] }, secs: [[0,0,5,5, 0,0,7,7], [9,9,5,5, 7,7,0,0], [5,5,0,0, 7,7,0,0]], order: [0, 1, 0, 2, 1, 0] }, // finale: warm and bell-bright
  // Boss themes: same root as the world they live in, minor key, faster, always full drums (epic layer in musicTick). The hook is the boss's own motif.
  boss_crab: { seed: 61, bpm: 152, root: 293.7, wave: 'square', sc: 'min', bass: 'drive', epic: true, dens: 0.7, hook: { bass: [0,N_,0,0, 0,N_,0,0, 0,N_,0,0, 3,N_,5,7], lead: [12,N_,N_,12, 15,N_,12,N_, 17,N_,N_,15, 12,N_,10,N_] }, secs: [[0,0,8,8, 0,0,10,7], [8,8,10,10, 7,7,0,0], [5,5,3,3, 8,10,7,7]], order: [0, 1, 0, 2, 1, 0] },
  boss_kraken: { seed: 62, bpm: 132, root: 246.9, wave: 'sawtooth', sc: 'min', bass: 'gallop', epic: true, dens: 0.7, hook: { bass: [0,N_,N_,0, 0,N_,0,N_, 0,N_,N_,0, 1,N_,0,N_], lead: [19,N_,N_,17, N_,15,N_,N_, 12,N_,N_,15, N_,12,10,N_] }, secs: [[0,0,1,1, 0,0,8,7], [8,8,7,7, 5,5,3,1], [3,3,5,5, 1,1,0,0]], order: [0, 1, 0, 2, 1, 0] },
  boss_queen: { seed: 63, bpm: 144, root: 220, wave: 'sawtooth', sc: 'min', bass: 'pulse', epic: true, dens: 0.7, hook: { bass: [0,N_,0,N_, 0,N_,7,N_, 8,N_,8,N_, 7,N_,10,N_], lead: [19,N_,22,N_, 24,N_,22,19, 17,N_,19,N_, 22,N_,N_,N_] }, secs: [[0,0,10,10, 0,0,8,7], [8,8,7,7, 10,10,0,0], [3,3,5,5, 8,8,7,7]], order: [0, 1, 0, 2, 1, 0] },
  boss_king: { seed: 64, bpm: 156, root: 261.6, wave: 'square', sc: 'min', bass: 'gallop', epic: true, dens: 0.75, hook: { bass: [0,0,12,0, 0,0,12,0, 8,8,20,8, 7,7,19,7], lead: [12,N_,12,15, N_,N_,19,N_, 20,N_,19,N_, 15,N_,12,N_] }, secs: [[0,0,8,8, 0,0,7,7], [8,8,10,10, 7,7,0,0], [5,5,3,3, 8,10,7,7]], order: [0, 1, 0, 2, 1, 0, 2, 0] },
};
const SCALES = { maj: [0, 2, 4, 7, 9], min: [0, 3, 5, 7, 10] };
const BASS_STYLES = { pulse: [0,N_,0,N_, 7,N_,0,N_, 0,N_,0,N_, 7,N_,12,N_], calm: [0,N_,N_,N_, N_,N_,7,N_, 0,N_,N_,N_, N_,N_,7,N_], drive: [0,0,12,0, 0,0,10,0, 0,0,12,0, 7,7,10,12], gallop: [0,N_,0,0, 0,N_,0,0, 0,N_,0,0, 7,N_,12,N_] };
// singable one-bar rhythms: [start step, length in steps]
const RHYTHMS = [[[0,4],[4,4],[8,2],[10,2],[12,4]], [[0,6],[6,2],[8,4],[12,4]], [[0,2],[2,2],[4,4],[8,4],[12,2],[14,2]], [[0,4],[4,2],[6,2],[8,8]], [[0,8],[8,4],[12,4]], [[0,3],[3,3],[6,2],[8,4],[12,4]]];
const songCache = {};
function buildSong(key) { // -> array of bars {bass, lead, leadDur, arp, c}
  if (songCache[key]) return songCache[key];
  const m = SONGS[key], sc = SCALES[m.sc], bars = [], wk = m.seed != null ? m.seed : Number.isNaN(parseInt(key)) ? 99 : parseInt(key);
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
const mus = { key: null, bar: 0, step: 0, next: 0, saved: {}, trans: null, g: 1, vt: 1, fadeEnd: 0, lift: 0 };
const isBossKey = k => typeof k === 'string' && k.startsWith('boss_');
function musicLevel() { // how tense the music is: 0 calm, 1 busy, 2 full drums, 3 (boss final round and duel) everything
  if (scene === 'ending') return E ? { talk: 0, tap: 1, hatch: 2, party: 2 }[E.phase] || 0 : 0;
  if (!G || scene !== 'play') return 0;
  if (G.overlay && G.overlay.type !== 'riddle') return 0; // results, pause and retry screens get the calm version
  if (G.boss && G.boss.state !== 'flee') return G.boss.state === 'duel' || G.boss.phase >= bossKind(G.boss).phases.length - 1 ? 3 : 2;
  if (G.endless) return G.tier >= 4 ? 2 : G.tier >= 2 ? 1 : 0;
  const pr = clamp((G.p.wx - 200) / Math.max(1, G.L.gateX - 200), 0, 1);
  return pr < 0.34 ? 0 : pr < 0.72 ? 1 : 2;
}
function musicKey(portrait) { // which song should be playing right now (null = silence)
  if (save.muted || portrait) return null;
  if (scene === 'play') {
    if (G.boss && G.boss.state !== 'flee' && !G.bossDone && SONGS['boss_' + G.boss.kind]) return 'boss_' + G.boss.kind; // boss fight: the boss's own theme
    return String(G.wi);
  }
  return scene === 'ending' ? 'ending' : scene === 'splash' ? null : 'map';
}
function musicOpts() { // vol: fade target (pause and results duck the song, death and run end fade it out); lift: key change before the gate; danger: heartbeat at one heart
  const o = { vol: 1, lift: 0, danger: false };
  if (scene === 'ending') { if (E && E.phase === 'party') o.vol = 0.55; return o; } // the jingle plays on top
  if (scene !== 'play' || !G) return o;
  const ov = G.overlay;
  if (ov && ov.type !== 'riddle') { o.vol = ov.type === 'pause' || ov.type === 'complete' ? 0.25 : 0; return o; }
  if (!G.endless && !G.boss && G.L && G.p.wx > 200 + (G.L.gateX - 200) * 0.86) o.lift = 2;
  o.danger = G.p.hearts === 1;
  return o;
}
function bossFanfare(root) { // short victory fanfare when the boss theme ends
  bus = 'fanfare'; fanNotes(root / 2, [[0, 0], [4, 0.14], [7, 0.28], [12, 0.42], [16, 0.62, 1.0]]); noise(1.1, 0.14, 6500, 0.62); bus = 'music';
}
function epicLayer(m, rt, bar, i, d, st, level) { // brass stabs, toms, crashes, 16th hats: what makes a boss theme feel big
  const f = n => rt * Math.pow(2, n / 12);
  if (i === 0 || i === 8 || (level >= 3 && (i === 6 || i === 10))) for (const iv of [0, 7, 12]) tone(f(bar.c + iv), st * (i % 8 === 0 ? 3.2 : 1.6), 'sawtooth', 0.014, null, d);
  if (i === 6 || i === 14) tone(120, 0.18, 'sine', 0.11, 55, d);                                   // toms
  if (level >= 3 && (i === 3 || i === 10)) kick(d, 0.1);                                          // double kick
  if (i % 2 === 1) hat(d, level >= 3 ? 0.03 : 0.018);                                              // 16th hats
  if (level >= 3 && i % 2 === 1 && bar.arp[i - 1] != null) tone(rt * 2 * Math.pow(2, (bar.arp[i - 1] + 7) / 12), st * 0.6, 'triangle', 0.008, null, d);
  if (i === 0 && mus.bar % 8 === 0) { noise(0.9, 0.12, 5000, d, 'highpass'); tone(70, 0.6, 'sine', 0.3, 32, d); } // crash + boom at every verse
}
function setMusicGain(v, ramp = 0) { // fade the whole song to v over `ramp` seconds
  if (!musicIn) return; const t = AC.currentTime, g = musicIn.gain; g.cancelScheduledValues(0); g.setValueAtTime(mus.g, t);
  if (ramp > 0) g.linearRampToValueAtTime(v, t + ramp); else g.setValueAtTime(v, t);
  mus.g = v; mus.vt = v; mus.fadeEnd = t + ramp;
}
function musicTick(key, level = 0, o = { vol: 1, lift: 0, danger: false }) {
  const stop = () => { if (mus.key != null) mus.saved[mus.key] = { bar: mus.bar, step: mus.step }; mus.key = null; if (mus.trans) { mus.trans = null; if (AC) setMusicGain(1); } };
  if (!AC || !key || !SONGS[key]) { stop(); return; }
  if (o.vol <= 0 && mus.key == null) return; // faded out: stays silent until the screen changes
  const now = AC.currentTime;
  if (mus.trans && mus.trans.to !== key) { mus.trans = null; setMusicGain(1); } // the world changed its mind
  if (!mus.trans && mus.key !== key) {
    const from = mus.key; if (from != null) mus.saved[from] = { bar: mus.bar, step: mus.step };
    if (isBossKey(from) && !isBossKey(key)) delete mus.saved[from]; // a finished (or abandoned) fight starts from the top next time
    if (isBossKey(key) && from != null && !isBossKey(from) && o.vol === 1) { // world theme -> boss theme: finish the bar with a drum roll and a riser, then the boss theme hits on the downbeat
      const st0 = 60 / SONGS[from].bpm / 4; let left = 16 - mus.step; if (left < 6) left += 16;
      mus.trans = { to: key, left }; if (mus.next < now) mus.next = now + 0.05;
      const tEnd = mus.next + left * st0; setMusicGain(1); musicIn.gain.linearRampToValueAtTime(0.35, tEnd - 0.05);
      bus = 'fanfare'; tone(SONGS[from].root, left * st0, 'sawtooth', 0.05, SONGS[from].root * 8, mus.next - now); bus = 'sfx';
    } else {
      mus.key = key; const sv = mus.saved[key]; mus.bar = sv ? sv.bar : 0; mus.step = sv ? sv.step : 0; mus.next = now + 0.1; mus.g = 1; setMusicGain(o.vol);
      if (isBossKey(from) && !isBossKey(key)) { // boss beaten: fanfare, then the world theme fades back in where it left off
        mus.next = now + 1.5; musicIn.gain.setValueAtTime(0, now); musicIn.gain.setValueAtTime(0, now + 1.4); musicIn.gain.linearRampToValueAtTime(1, now + 3.2); mus.g = 1; mus.vt = 1; mus.fadeEnd = now + 3.2;
        bossFanfare(SONGS[from].root);
      }
    }
  }
  if (!mus.trans && o.vol !== mus.vt && now > mus.fadeEnd) setMusicGain(o.vol, 0.35);
  if (!mus.trans && mus.vt === 0 && now > mus.fadeEnd + 0.05) { stop(); return; }
  if (mus.next < now - 0.05) mus.next = now + 0.05; // after a background pause
  bus = 'music';
  while (mus.next < AC.currentTime + 0.45) { // scheduling ahead keeps the music steady even when a frame is slow
    const m = SONGS[mus.key], bars = buildSong(mus.key), st = 60 / m.bpm / 4, nb = bars.length, sc = SCALES[m.sc];
    if (mus.step === 0) mus.lift = isBossKey(mus.key) ? 0 : o.lift; // the key change happens on a bar line
    const rt = m.root * Math.pow(2, mus.lift / 12);
    const inBreak = !m.epic && nb >= 24 && mus.bar >= nb - 12 && mus.bar < nb - 8, lv = inBreak ? 0 : level; // breakdown: drums and arpeggio drop out for four bars before the last verse
    const bar = bars[mus.bar % nb], i = mus.step, d = mus.next - AC.currentTime, b = bar.bass[i], l = bar.lead[i], ld = bar.leadDur && bar.leadDur[i];
    if (b != null) tone(rt / 2 * Math.pow(2, b / 12), st * 2.2, 'triangle', 0.055, null, d, { lp: 1300, lpTo: 380 });
    if (l != null) {
      const nd = ld ? st * (ld - 0.25) : st * 0.9; tone(rt * Math.pow(2, l / 12), nd, m.wave, m.wave === 'square' || m.wave === 'sawtooth' ? 0.02 : 0.034, null, d, { det: 6, vib: ld >= 3, lp: m.wave === 'sine' || m.wave === 'triangle' ? 0 : 3400, lpTo: 900 });
      if (lv >= 2) tone(rt * 2 * Math.pow(2, l / 12), Math.min(nd, st * 3), 'triangle', 0.012, null, d);
      if (ld && lv >= 1 && mus.bar % 8 >= 4) { // second half of a verse: a harmony a third below the melody
        const r = l - bar.c, oc = Math.floor(r / 12), k = sc.indexOf(((r % 12) + 12) % 12);
        if (k >= 0) { const k2 = k - 2, h = bar.c + sc[(k2 + 5) % 5] + 12 * (oc + (k2 < 0 ? -1 : 0)); tone(rt * Math.pow(2, h / 12), nd, 'sine', 0.014, null, d, { att: 0.03 }); }
      }
    }
    if (i === 0 && !m.epic) for (const iv of [0, m.sc === 'maj' ? 4 : 3, 7]) tone(rt * Math.pow(2, (bar.c + iv) / 12), st * 15.5, 'triangle', 0.011, null, d, { att: 0.4, hold: true }); // slow pad chord
    if (lv >= 1 && bar.arp[i] != null) tone(rt * 2 * Math.pow(2, bar.arp[i] / 12), st * 0.8, 'triangle', 0.011, null, d);
    if (lv >= 1 && i % 4 === 2) hat(d, 0.035, i % 8 === 6);                                  // hats
    if (lv >= 2 && (i === 0 || i === 8)) kick(d);                                             // kick
    if (lv >= 2 && (i === 4 || i === 12)) snare(d);                                           // snare
    if (!m.epic && level >= 2 && mus.bar === nb - 9 && i >= 8) snare(d, 0.03 + (i - 8) * 0.012); // snare roll out of the breakdown
    if (!m.epic && level >= 2 && mus.bar === nb - 8 && i === 0) { noise(0.9, 0.1, 5000, d, 'highpass'); tone(70, 0.5, 'sine', 0.2, 32, d); } // crash into the last verse
    if (m.bells && i % 4 === 0) { noise(0.05, 0.05, 9000, d); tone(3100, 0.08, 'triangle', 0.012, null, d); } // sleigh bells
    if (m.epic) epicLayer(m, rt, bar, i, d, st, level);
    if (o.danger && (i % 8 === 0 || i % 8 === 3)) tone(65, 0.2, 'sine', 0.16, 40, d); // heartbeat when only one heart is left
    if (mus.trans && mus.trans.left <= 8) { bus = 'fanfare'; noise(0.07, 0.04 + 0.1 * (1 - mus.trans.left / 8), 3200, d); bus = 'music'; } // snare roll that speeds the build-up
    mus.next += st; mus.step++; if (mus.step >= 16) { mus.step = 0; mus.bar = (mus.bar + 1) % nb; }
    if (mus.trans && --mus.trans.left <= 0) { // the bar is over: the boss theme starts here, fully loud
      mus.saved[mus.key] = { bar: mus.bar, step: mus.step }; mus.key = mus.trans.to; mus.bar = 0; mus.step = 0; mus.trans = null; musicIn.gain.setValueAtTime(1, mus.next); mus.g = 1; mus.vt = 1;
    }
  }
  bus = 'sfx';
}
// World ambience: a quiet bed of filtered noise that slowly swells (waves, wind, rumble), plus rare small events (birds, bubbles, lava pops).
const AMB = {
  0: { type: 'bandpass', f: 1100, q: 0.6, vol: 0.05, lfo: 0.13, ev: 'bird' },     // jungle: rustling leaves
  1: { type: 'bandpass', f: 520, q: 0.5, vol: 0.05, lfo: 0.08, ev: null },        // canyon: dry wind
  2: { type: 'bandpass', f: 420, q: 0.5, vol: 0.06, lfo: 0.06, ev: null },        // ice age: cold wind
  3: { type: 'lowpass', f: 150, q: 0.7, vol: 0.1, lfo: 0.2, ev: 'pop' },          // volcano: low rumble
  4: { type: 'bandpass', f: 650, q: 0.5, vol: 0.03, lfo: 0.05, ev: null },        // Christmas: soft wind in the snow
  5: { type: 'lowpass', f: 520, q: 0.7, vol: 0.07, lfo: 0.13, ev: 'gull' },       // beach: waves rolling in
  6: { type: 'lowpass', f: 280, q: 0.7, vol: 0.06, lfo: 0.1, ev: 'bubble' },      // underwater: muffled deep
  7: { type: 'bandpass', f: 800, q: 0.5, vol: 0.06, lfo: 0.07, ev: null },        // mountains: high wind
};
const amb = { wi: null, node: null, lvl: -1, next: 0 };
function ambStart(wi) {
  const a = AMB[wi]; if (!a || !AC) return null;
  if (!noiseBuf) { const n = Math.floor(AC.sampleRate * 2), d = (noiseBuf = AC.createBuffer(1, n, AC.sampleRate)).getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
  const src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = AC.createBiquadFilter(); f.type = a.type; f.frequency.value = a.f; if (f.Q) f.Q.value = a.q;
  const g = AC.createGain(); g.gain.value = 0; const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = a.lfo; lg.gain.value = 0;
  lfo.connect(lg); lg.connect(g.gain); src.connect(f); f.connect(g); g.connect(ambIn); src.start(); lfo.start();
  return { src, lfo, lg, g };
}
function ambEvent(kind) { // rare small events on top of the bed
  bus = 'amb';
  if (kind === 'bird') for (let i = 0, f = 2600 + Math.random() * 800; i < 2 + Math.floor(Math.random() * 3); i++) tone(f, 0.07, 'sine', 0.035, f * 1.35, i * 0.1);
  else if (kind === 'gull') { tone(1700, 0.45, 'triangle', 0.03, 1150); tone(1600, 0.35, 'triangle', 0.025, 1100, 0.5); }
  else if (kind === 'bubble') for (let i = 0; i < 3; i++) { const f = 350 + Math.random() * 450; tone(f, 0.08, 'sine', 0.05, f * 1.8, i * 0.07); }
  else if (kind === 'pop') { noise(0.1, 0.12, 1100); tone(55, 0.5, 'sine', 0.08, 38); }
  bus = 'sfx';
}
function ambTick(wi, vol) {
  if (!AC || !ambIn || save.muted || wi == null || !AMB[wi] || vol <= 0) wi = null;
  const now = AC ? AC.currentTime : 0;
  if (amb.wi !== wi) { // crossfade to the new bed
    if (amb.node) { const n = amb.node; n.g.gain.cancelScheduledValues(0); n.g.gain.setValueAtTime(Math.max(amb.lvl, 0), now); n.g.gain.linearRampToValueAtTime(0, now + 1); n.src.stop(now + 1.1); n.lfo.stop(now + 1.1); }
    amb.node = wi != null ? ambStart(wi) : null; amb.wi = wi; amb.lvl = -1; amb.next = now + 2 + Math.random() * 3;
  }
  if (!amb.node) return;
  const lvl = AMB[wi].vol * save.volSfx / 4 * vol;
  if (Math.abs(lvl - amb.lvl) > 1e-4) { const g = amb.node.g.gain; g.cancelScheduledValues(0); g.setValueAtTime(Math.max(amb.lvl, 0), now); g.linearRampToValueAtTime(lvl, now + 0.8); amb.node.lg.gain.value = lvl * 0.6; amb.lvl = lvl; }
  if (AMB[wi].ev && now >= amb.next) { amb.next = now + 3 + Math.random() * 6; if (lvl > 0.0005) ambEvent(AMB[wi].ev); }
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

// =====================================================================
// Game data
// =====================================================================
const WORLDS = [
  { name: 'Dschungel', speed: 282, segs: 24, patterns: ['rock', 'rock2', 'pit', 'pit', 'raptor', 'raptor2', 'plat', 'boulder', 'hopper', 'hopper2', 'plant', 'meteor', 'meteors', 'bounce', 'bounceUp', 'crumble', 'ptero', 'compy', 'pitRock'],
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
    rock: '#7b6b5a', deco: '#173d2c', volcS: 0.8, volcCol: '#4f8478', egg: '#f6e7b0', eggSpot: '#6aa84f' },
  { name: 'Canyon', speed: 295, segs: 30, patterns: ['rock', 'rock2', 'pit', 'pit', 'raptor', 'ptero', 'swoop', 'boulder', 'plat', 'amber', 'low', 'low', 'pitRock', 'lowRock', 'wall', 'hopper', 'hopper2', 'plant', 'meteor', 'meteors', 'bounce', 'bounceUp', 'crumble', 'raptor2'],
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
  { name: 'Eiszeit', speed: 315, segs: 34, patterns: ['rock', 'rock2', 'pit', 'icicle', 'icicle', 'raptor', 'ptero', 'boulder', 'plat', 'amber', 'low', 'compy', 'compy', 'geode', 'pitRock', 'lowRock', 'compyRun', 'hopper', 'plant', 'meteor', 'bounce', 'bounceUp', 'crumble', 'raptor2'],
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
  { name: 'Vulkan', speed: 335, segs: 36, patterns: ['pit', 'pit', 'geyser', 'geyser', 'raptor', 'ptero', 'swoop', 'boulder', 'rock2', 'plat', 'low', 'compy', 'compy', 'geode', 'pitRock', 'lowRock', 'compyRun', 'hopper', 'plant', 'meteor', 'meteors', 'bounce', 'crumble', 'raptor2'],
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
    rock: '#4a3a36', deco: '#140404', volcS: 1.25, volcCol: '#43180f', lava: true, egg: '#ffd9c2', eggSpot: '#c0392b' },
  { name: 'Weihnacht', art: 2, bonus: true, speed: 345, segs: 36, patterns: ['rock', 'rock2', 'pit', 'icicle', 'icicle', 'raptor', 'ptero', 'swoop', 'boulder', 'plat', 'amber', 'low', 'compy', 'geode', 'pitRock', 'lowRock', 'compyRun', 'hopper', 'hopper2', 'plant', 'meteor', 'meteors', 'bounce', 'bounceUp', 'crumble', 'raptor2'],
    startTip: 'Bonus-Welt: die Weihnachtsnacht! Alles, was du gelernt hast, hilft dir hier. Findest du alle 3 Eier und die Feuer-Chilis?',
    riddles: [
      { q: 'Acht Elfen tragen Geschenke. Sieben Elfen tragen je 7 Geschenke, der kleinste Elf nur 2. Wie viele Geschenke sind es zusammen?', a: ['51', '58', '56'], ok: 0, why: '7 mal 7 sind 49, dazu die 2 vom kleinsten Elf: 51!' },
      { q: 'Welche Zahl kommt als Nächstes? 1, 3, 7, 15, 31, …', a: ['63', '47', '62'], ok: 0, why: 'Es kommt +2, +4, +8, +16 dazu – und jetzt +32: 31 + 32 = 63!' },
      { q: 'Am Baum hängen 3 rote Kugeln für jede goldene. Es sind 4 goldene. Wie viele Kugeln sind es zusammen?', a: ['16', '12', '7'], ok: 0, why: '4 goldene und 3 mal 4 = 12 rote – zusammen 16 Kugeln!' },
      { q: 'Am Adventskranz brennen 3 Kerzen. Du bläst eine aus. Wie viele Kerzen hast du noch?', a: ['3', '2', '1'], ok: 0, why: 'Eine ist nur ausgeblasen – alle 3 Kerzen sind noch da!' },
      { q: 'Welche Zahl kommt als Nächstes? 25, 24, 22, 19, …', a: ['15', '16', '17'], ok: 0, why: 'Es wird jedes Mal ein bisschen mehr abgezogen: −1, −2, −3 – und jetzt −4. 19 − 4 = 15!' },
      { q: 'Was ist schwerer: 1 kg Schnee oder 1 kg Lebkuchen?', a: ['Beide gleich schwer', 'Der Lebkuchen', 'Der Schnee'], ok: 0, why: '1 Kilogramm ist immer 1 Kilogramm – egal, woraus es besteht!' },
      { q: 'Chili isst jeden Tag doppelt so viele Karotten wie am Tag davor. Am 1. Tag eine. Wie viele am 5. Tag?', a: ['16', '10', '8'], ok: 0, why: '1, 2, 4, 8, 16 – am 5. Tag sind es 16 Karotten!' },
      { q: 'Ein Geschenk kostet 20 Franken. Es ist halb so teuer wie ein Schlitten. Was kosten beide zusammen?', a: ['60 Franken', '40 Franken', '30 Franken'], ok: 0, why: 'Der Schlitten kostet 40 Franken. 20 + 40 = 60 Franken!' },
      { q: 'Eine Adventskerze ist 24 cm lang und brennt jeden Tag 3 cm ab. Nach wie vielen Tagen ist sie nur noch 6 cm lang?', a: ['6 Tage', '8 Tage', '7 Tage'], ok: 0, why: '24 − 6 = 18 cm sind abgebrannt, und 18 geteilt durch 3 sind 6 Tage!' },
      { q: 'Ich habe Städte, aber keine Häuser. Berge, aber keine Bäume. Wasser, aber keine Fische. Was bin ich?', a: ['Eine Landkarte', 'Ein Traum', 'Ein Bild'], ok: 0, why: 'Auf einer Landkarte sind Städte, Berge und Seen nur eingezeichnet!' },
    ],
    sky: ['#050b24', '#1c3a6e'], far: '#9fb8dc', mid: '#6b8ab4', ground: '#4f6585', top: '#f4f8ff', dots: '#3c4f6a', edge: '#2c3c54', plat: '#8fb3d8', platTop: '#ffffff',
    rock: '#7088a2', deco: '#14303f', volcS: 0.85, volcCol: '#2c3f5e', stars: true, snow: true, egg: '#ffe9c2', eggSpot: '#d63a3a' },
];

function ART(wi) { return WORLDS[wi].art != null ? WORLDS[wi].art : wi; }

WORLDS.push(
  { name: 'Strand', art: 5, speed: 285, segs: 52, patterns: ['rock', 'rock2', 'pit', 'amber', 'raptor', 'plat', 'boulder', 'compy', 'wall', 'wall', 'tide', 'tide', 'hopper', 'plant', 'meteor', 'bounce', 'bounceUp', 'crumble', 'raptor2'],
    startTip: 'Ein Strand! Neue Fähigkeit: FLITZ! Damit rennst du durch Sandmauern und Wellen.',
    riddles: [
      { q: 'Am Strand bauen 3 Kinder je 4 Sandburgen. Jede Burg hat 3 Türme, aber 5 Burgen stürzen ein. Wie viele Türme stehen noch?', a: ['21', '36', '15'], ok: 0, why: '3 mal 4 sind 12 Burgen, 5 stürzen ein – es bleiben 7. Und 7 mal 3 sind 21 Türme!' },
      { q: 'Welche Zahl kommt als Nächstes? 2, 6, 12, 20, 30, …', a: ['42', '40', '36'], ok: 0, why: 'Es kommt +4, +6, +8, +10 dazu – und jetzt +12: 30 + 12 = 42!' },
      { q: 'Eine Krabbe hat 10 Beine, ein Seestern 5 Arme. Am Strand liegen 4 Tiere mit zusammen 30 Beinen und Armen. Wie viele davon sind Krabben?', a: ['2', '1', '3'], ok: 0, why: '2 Krabben (20) und 2 Seesterne (10): das sind 4 Tiere und zusammen 30!' },
      { q: 'Was wird nasser, je mehr es dich trocknet?', a: ['Ein Handtuch', 'Ein Schwamm', 'Die Sonne'], ok: 0, why: 'Ein Handtuch wird nasser, je mehr es dich trocknet!' },
      { q: 'Wenn 2 Möwen in 2 Minuten 2 Fische fangen: Wie lange brauchen 4 Möwen für 4 Fische?', a: ['2 Minuten', '4 Minuten', '1 Minute'], ok: 0, why: 'Jede Möwe fängt in 2 Minuten einen Fisch – alle zusammen brauchen wieder 2 Minuten!' },
      { q: 'Welcher Monat hat 28 Tage?', a: ['Alle Monate', 'Nur der Februar', 'Keiner'], ok: 0, why: 'Jeder Monat hat mindestens 28 Tage!' },
      { q: 'Ich habe ein Gesicht und zwei Hände, aber keine Arme und Beine. Was bin ich?', a: ['Eine Uhr', 'Ein Seestern', 'Ein Strandball'], ok: 0, why: 'Eine Uhr hat ein Zifferblatt (Gesicht) und zwei Zeiger (Hände)!' },
      { q: 'Du hast 5 Eis und isst alle bis auf 2. Wie viele hast du gegessen?', a: ['3', '2', '5'], ok: 0, why: 'Alle bis auf 2: 5 − 2 = 3 gegessen!' },
      { q: 'Welche Zahl kommt als Nächstes? 1, 4, 9, 16, …', a: ['25', '20', '24'], ok: 0, why: 'Das sind 1×1, 2×2, 3×3, 4×4 – als Nächstes 5×5 = 25!' },
      { q: 'Ein Eis kostet 3 Franken. Zu jedem 4. gekauften Eis gibt es 1 Eis gratis dazu. Du hast 12 Franken. Wie viele Eis bekommst du?', a: ['5', '4', '6'], ok: 0, why: '12 Franken sind 4 gekaufte Eis – dazu kommt 1 gratis. Also 5 Eis!' },
    ],
    sky: ['#4fb6e8', '#bfe9ff'], far: '#7fd0e0', mid: '#e8d29a', ground: '#e8c985', top: '#f3dca0', dots: '#c9a95e', edge: '#a8883e', plat: '#b98a54', platTop: '#f3dca0', rock: '#b8a47a', deco: '#2f7d4a', volcS: 0.3, volcCol: '#6a8aa8', egg: '#fff0c8', eggSpot: '#ff7a5a' },
  { name: 'Unterwasser', art: 6, swim: true, speed: 270, segs: 52, patterns: ['coralgate', 'coralgate', 'jellies', 'jellies', 'urchins', 'sword', 'bubbles', 'rockwall'],
    startTip: 'Unter Wasser! Tippe, um nach oben zu schwimmen. DUCKEN taucht schneller ab.',
    riddles: [
      { q: 'Ein Wal taucht alle 6 Minuten zum Atmen auf, ein Delfin alle 10 Minuten. Jetzt sind beide oben. Nach wie vielen Minuten sind sie wieder gleichzeitig oben?', a: ['30 Minuten', '60 Minuten', '16 Minuten'], ok: 0, why: 'Wal: 6, 12, 18, 24, 30 – Delfin: 10, 20, 30. Nach 30 Minuten treffen sie sich!' },
      { q: 'Welche Zahl kommt als Nächstes? 1, 2, 6, 24, 120, …', a: ['720', '240', '600'], ok: 0, why: 'Mal 2, mal 3, mal 4, mal 5 – und jetzt mal 6: 120 mal 6 = 720!' },
      { q: 'Die Krake denkt sich eine Zahl. Sie rechnet mal 3, zieht 5 ab und bekommt 25. Welche Zahl war es?', a: ['10', '8', '12'], ok: 0, why: 'Rückwärts: 25 + 5 = 30, und 30 geteilt durch 3 ist 10!' },
      { q: 'Welche Zahl passt nicht dazu? 4, 9, 16, 20, 25, 36', a: ['20', '25', '9'], ok: 0, why: 'Alle anderen sind Quadratzahlen (2×2, 3×3, 4×4, 5×5, 6×6) – nur die 20 nicht!' },
      { q: 'Je mehr man davon wegnimmt, desto grösser wird es. Was ist das?', a: ['Ein Loch', 'Ein Haufen', 'Ein Berg'], ok: 0, why: 'Ein Loch wird grösser, wenn man etwas wegnimmt!' },
      { q: 'Wie viele Beine haben 3 Delfine und 2 Krabben (jede Krabbe hat 10 Beine)?', a: ['20', '26', '30'], ok: 0, why: 'Delfine haben keine Beine – nur die Krabben: 2 mal 10 = 20!' },
      { q: 'Ein Becken fasst 600 Liter. Ein Hahn füllt 20 Liter pro Minute, ein Abfluss lässt 10 Liter pro Minute ab. Beide laufen. Wie lange dauert es, bis das leere Becken voll ist?', a: ['60 Minuten', '30 Minuten', '20 Minuten'], ok: 0, why: 'Pro Minute kommen 20 − 10 = 10 Liter dazu. 600 geteilt durch 10 sind 60 Minuten!' },
      { q: 'In einem Aquarium sind 6 Fische. Alle bis auf 4 sind blau. Wie viele sind blau?', a: ['2', '4', '6'], ok: 0, why: 'Alle bis auf 4 sind blau – also sind 6 − 4 = 2 blau!' },
      { q: 'Welche Zahl kommt als Nächstes? 2, 3, 5, 8, 12, …', a: ['17', '16', '15'], ok: 0, why: 'Es kommt +1, +2, +3, +4 dazu – jetzt +5: 12 + 5 = 17!' },
      { q: 'Fünf Fische haben je 2 Augen – aber ein Fisch hat nur ein Auge. Wie viele Augen sind es zusammen?', a: ['9', '10', '8'], ok: 0, why: '4 Fische mit je 2 Augen sind 8, dazu das 1 Auge des fünften: 9 Augen!' },
    ],
    sky: ['#0a4a7a', '#2fb0c8'], far: '#2a7a9a', mid: '#1d6a8a', ground: '#d8c48a', top: '#e8d8a0', dots: '#b8a468', edge: '#8a7a48', plat: '#2f9a8a', platTop: '#7fe0c8', rock: '#5a7a8a', deco: '#1a5a6a', volcS: 0.3, volcCol: '#1d4a6a', egg: '#d8f4ff', eggSpot: '#ff8a6a' },
  { name: 'Berge', art: 7, speed: 300, segs: 52, patterns: ['rock', 'rock2', 'widegap', 'widegap', 'updraft', 'raptor', 'ptero', 'boulder', 'plat', 'amber', 'avalanche', 'compy', 'hopper', 'plant', 'meteor', 'meteors', 'bounce', 'crumble', 'raptor2'],
    startTip: 'Hoch in den Bergen! Neue Fähigkeit: GLEITEN. Halte die Taste in der Luft gedrückt und schwebe über die Schluchten.',
    riddles: [
      { q: 'Eine Gämse springt jeden Tag 8 m höher, rutscht aber jede Nacht 3 m ab. Nach wie vielen Tagen erreicht sie die 28 m?', a: ['5 Tage', '4 Tage', '6 Tage'], ok: 0, why: 'Netto sind es 5 m pro Tag. Nach 4 Tagen ist sie bei 20 m, am 5. Tag springt sie auf 28 m!' },
      { q: 'Welche Zahl kommt als Nächstes? 1, 4, 10, 22, 46, …', a: ['94', '92', '70'], ok: 0, why: 'Jedes Mal mal 2 plus 2: 46 mal 2 sind 92, plus 2 ergibt 94!' },
      { q: 'Ein Berg ist 3000 m hoch. Pro 100 m Höhe wird es 0,6 Grad kälter. Unten sind es 20 Grad. Wie warm ist es oben?', a: ['2 Grad', '12 Grad', '−18 Grad'], ok: 0, why: '30 mal 0,6 sind 18 Grad kälter: 20 − 18 = 2 Grad!' },
      { q: 'Er hat einen Fuss, aber keine Schuhe, und einen Gipfel, aber keinen Kopf. Was ist es?', a: ['Ein Berg', 'Ein Baum', 'Ein Turm'], ok: 0, why: 'Ein Berg hat einen Fuss (ganz unten) und einen Gipfel!' },
      { q: 'Auf dem Gipfel sind es −6 Grad, unten im Tal +4 Grad. Wie gross ist der Unterschied?', a: ['10 Grad', '2 Grad', '24 Grad'], ok: 0, why: 'Von −6 bis 0 sind es 6 Grad, dann noch 4: zusammen 10 Grad!' },
      { q: 'Ein Wanderweg ist 12 km lang. Du bist die Hälfte gelaufen und dann noch 2 km. Wie viele km sind es noch?', a: ['4 km', '6 km', '2 km'], ok: 0, why: 'Die Hälfte sind 6 km, dazu 2 km = 8 km gelaufen. 12 − 8 = 4 km!' },
      { q: 'Ein Adler fliegt gegen den Wind 12 km in 2 Stunden. Mit dem Wind schafft er die 12 km in 1 Stunde. Wie viel schneller ist er mit dem Wind pro Stunde?', a: ['6 km mehr', '12 km mehr', '3 km mehr'], ok: 0, why: 'Gegen den Wind 6 km pro Stunde, mit dem Wind 12 km pro Stunde – also 6 km mehr!' },
      { q: 'Die Seilbahn fährt um 10:15 Uhr und dann alle 20 Minuten. Wie oft fährt sie bis 12:00 Uhr (die Fahrt um 10:15 mitgezählt)?', a: ['6 Mal', '5 Mal', '7 Mal'], ok: 0, why: '10:15, 10:35, 10:55, 11:15, 11:35 und 11:55 – das sind 6 Fahrten!' },
      { q: 'Welche Zahl kommt als Nächstes? 1, 2, 4, 7, 11, 16, …', a: ['22', '21', '20'], ok: 0, why: 'Es kommt +1, +2, +3, +4, +5 dazu – jetzt +6: 16 + 6 = 22!' },
      { q: 'Ein Rucksack wiegt am Anfang 12 kg. Die Gruppe isst jeden Tag 1,5 kg Proviant. Nach 4 Tagen kommen 2 kg Schokolade dazu. Wie schwer ist der Rucksack dann?', a: ['8 kg', '10 kg', '4 kg'], ok: 0, why: '4 mal 1,5 sind 6 kg gegessen: 12 − 6 = 6, dazu 2 kg ergibt 8 kg!' },
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
  { name: 'Goettis Gitarre', line: 'Meine Gitarre! Danke, ihr zwei! Tippt sie in der Schatzkiste an – dann spiele ich euch was vor.', tap: 'Goetti spielt ein Lied!' },
  { name: 'Goettis Velo', line: 'Mein Velo! Das hat der Vulkan bis in den Canyon geschleudert. Damit machen wir drei mal eine grosse Tour!', tap: 'Kling, kling!' },
  { name: 'Goettis Angel', line: 'Meine Angelrute! Weisst du was? Im Winter kann man sogar durch ein Loch im Eis fischen. Das machen wir mal zusammen!', tap: 'Platsch! Ein Fisch!' },
  { name: 'Kiwi', line: 'Kiwi! Mein kleiner Freund ist wieder da! Kiwis sind das Wahrzeichen von Neuseeland und können nicht fliegen – darum läuft Kiwi ab jetzt mit euch mit.', tap: 'Kiwi! Kiwi!' },
];
// =====================================================================
// Story: the Krallenkönig stole the dino family's golden egg. Three bosses each hold a piece of his map.
// DAY_STORY plays once before a level (first time), DAY_AFTER once on the map after a boss, TEASERS on the results screen.
// =====================================================================
const DAY_STORY = {
  1: [{ who: 'goetti', text: 'Tür 1! Hier im Dschungel hat der Vulkan die meisten Eier verloren. Und schaut mal: riesige Krallenspuren!' }, { who: 'fabio', text: 'Die sind ja grösser als ich!' }, { who: 'chili', text: 'Schnupper, schnupper … Das riecht nach dem Krallenkönig! Folgen wir der Spur!' }],
  2: [{ who: 'goetti', text: 'Die Spuren führen hoch hinauf. Der Räuber ist über die Baumwipfel geklettert – springt hinterher, ihr zwei!' }],
  3: [{ who: 'goetti', text: 'Heute lernt {rex} BRÜLLEN! {fabio}, das ist dein Job: Du bist ab heute unser Brüll-Chef. Drück BRÜLL, dann rennt jeder Raptor davon!' }, { who: 'fabio', text: 'ROOOAAARRR!' }, { who: 'goetti', text: 'Und irgendwo hier liegt meine Gitarre – der Vulkan hat sie weit weggeschleudert.' }],
  4: [{ who: 'goetti', text: 'Die Spuren enden am Strand! Ab heute könnt ihr FLITZEN – sogar mitten durch Sandmauern.' }, { who: 'chili', text: 'Mümmel! Hier riecht es nach Meer und nach Krallenkönig.' }],
  5: [{ who: 'goetti', text: 'Krabbenstrand! Passt auf die Krabben auf – sie benehmen sich, als würden sie etwas bewachen …' }],
  6: [{ who: 'goetti', text: 'Da vorne sitzt der Krabbenkönig! Und schaut: Um seinen Hals hängt ein Stück Pergament!' }, { who: 'papi', text: '(Funkspruch) Das ist ein Teil von der Schatzkarte des Krallenkönigs! Holt es euch, {oli} und {fabio}!' }],
  7: [{ who: 'goetti', text: 'Die heisse Schlucht! Der Räuber hat hier gelagert – die Asche ist noch warm. Ab heute könnt ihr DUCKEN: Halte den Knopf, dann kommt ihr unter tiefen Ästen durch.' }],
  8: [{ who: 'goetti', text: 'Duckt euch! Die Flugsaurier kreisen hier ständig. Sie kennen den Krallenkönig – und sie mögen keine Fremden.' }],
  9: [{ who: 'goetti', text: 'Ein Raptor-Rudel! Der Krallenkönig hat sie als Wachen zurückgelassen. {fabio}, Brüll-Chef – jetzt brauchen wir dich! Irgendwo hier liegt auch mein Velo …' }],
  10: [{ who: 'goetti', text: 'Tauchgang! Das Kartenstück zeigt: Der Weg geht unter Wasser weiter. Ab heute könnt ihr SCHWIMMEN – tippen heisst nach oben, TAUCHEN nach unten.' }, { who: 'fabio', text: 'Blubb, blubb!' }],
  11: [{ who: 'goetti', text: 'Das Korallenlabyrinth! Die Fische flüstern, dass hier ein Seeungeheuer wohnt. Es mag keine Besucher …' }],
  12: [{ who: 'goetti', text: 'Da ist es: das Seeungeheuer! Und es hält das zweite Kartenstück in seinen Tentakeln!' }, { who: 'fabio', text: 'Ich hab keine Angst. Gar keine! … Ein bisschen.' }, { who: 'mami', text: '(Funkspruch) Wir drücken euch die Daumen, ihr zwei! Bringt unser Ei zurück!' }],
  13: [{ who: 'goetti', text: 'Die Eiszeit! Alles ist gefroren. Ab heute könnt ihr STAMPFEN: Springt hoch und drückt STAMPF – das knackt sogar Bernstein-Steine.' }],
  14: [{ who: 'goetti', text: 'Die Krallenspuren sind im Schnee ganz frisch. Wir holen auf!' }],
  15: [{ who: 'goetti', text: 'Eiskalte Ebene! Und dort im Eis steckt meine Angelrute – seht ihr sie?' }],
  16: [{ who: 'goetti', text: 'Der Gipfelweg! Ab heute könnt ihr GLEITEN: Halte in der Luft die Taste gedrückt und schwebe über die Schluchten.' }, { who: 'fabio', text: 'Wir fliegen! {oli}, wir fliegen!' }],
  17: [{ who: 'goetti', text: 'Über den Wolken wohnt die Adlerkönigin. Sie hütet das letzte Kartenstück. Passt auf die Windwellen auf!' }],
  18: [{ who: 'goetti', text: 'Die Adlerkönigin! Das letzte Kartenstück liegt in ihrem Nest.' }, { who: 'papi', text: '(Funkspruch) Ihr seid so mutig, {oli} und {fabio}! Wir sind in Gedanken bei euch!' }],
  19: [{ who: 'goetti', text: 'Der Vulkan! Heiss, heiss, heiss. Sammelt die roten Feuer-Chilis, dann kann {rex} FEUER spucken!' }, { who: 'fabio', text: 'Feuer! Darf ich drücken? Bitte, bitte!' }],
  20: [{ who: 'goetti', text: 'Der Lavafluss! Hüpft von Stein zu Stein – und lasst euch nicht in die Lava fallen.' }],
  21: [{ who: 'goetti', text: 'Seine Krallenspuren glühen noch – der Räuber ist ganz nah! Und hört ihr das? Irgendwo ruft ein Kiwi …' }],
  22: [{ who: 'goetti', text: 'Wir haben den Vulkan hinter uns! Es schneit. Es ist Weihnachtsnacht – und der Krallenkönig ist ganz nah.' }, { who: 'fabio', text: 'Es schneit! {oli}, schau, es schneit!' }],
  23: [{ who: 'goetti', text: 'Der Sternenwald. Hört ihr das? Ein leises Klopfen … Das Dino-Baby im goldenen Ei ruft nach uns!' }, { who: 'mami', text: '(Funkspruch) Bitte beeilt euch! Unserem Baby ist so kalt!' }],
  24: [{ who: 'goetti', text: 'Das ist seine Höhle! Der Krallenkönig sitzt auf dem goldenen Ei – und er sieht gar nicht fröhlich aus.' }, { who: 'mami', text: 'Wir stehen hinter euch, {oli} und {fabio}!' }, { who: 'papi', text: 'Du schaffst das, {rex}! Und Chili auch!' }, { who: 'goetti', text: 'Das ist der letzte Kampf. {oli} lenkt, {fabio} brüllt – los, ihr zwei!' }],
};
const DAY_AFTER = {
  6: [{ who: 'fabio', text: 'Wir haben es! Wir haben das Kartenstück!' }, { who: 'goetti', text: 'Geschafft! Der Krabbenkönig hat ein Kartenstück verloren. Darauf ist das Meer gezeichnet – und ein goldenes Ei!' }, { who: 'chili', text: 'Mümmel! Noch zwei Stücke fehlen, dann kennen wir den Weg zum Versteck.' }],
  12: [{ who: 'goetti', text: 'Das zweite Stück! Jetzt sehen wir hohe Berge – und einen rauchenden Vulkan.' }, { who: 'chili', text: 'Mümmel! Nur noch ein Stück, ihr zwei!' }],
  18: [{ who: 'goetti', text: 'Alle drei Stücke! Zusammengelegt zeigen sie den Weg: über den Vulkan, und dahinter liegt die Höhle des Krallenkönigs.' }, { who: 'chili', text: 'Mümmel! Auf zum Vulkan!' }],
};
const TEASERS = { 5: 'Morgen wartet der Krabbenkönig mit dem ersten Kartenstück!', 11: 'Morgen taucht das Seeungeheuer auf …', 17: 'Morgen: die Adlerkönigin! Sie hütet das letzte Kartenstück.', 23: 'Morgen ist der grosse Tag – der Krallenkönig wartet!' };
const medalTotal = () => save.lvM.flat().reduce((a, b) => a + b, 0);
const worldMedalsDone = wi => LEVELS.filter(l => l.wi === wi).every(l => save.lvM[l.li].every(Boolean));
function launchLevel(i) { // first time a day starts, Goetti briefs the player (a short dialog on the map)
  const day = i + 1, lines = DAY_STORY[day];
  if (lines && !save.storySeen[day]) { save.storySeen[day] = 1; writeSave(); startDialog(lines, () => startLevel(i)); } else startLevel(i);
}
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
const LEVEL_TITLES = ['Erste Schritte', 'Hoch hinaus', 'Brüll-Training', 'Sandburgen-Rennen', 'Krabbenstrand', 'Der Krabbenkönig', 'Raptor-Rudel', 'Duck dich!', 'Heisse Schlucht', 'Tauchgang', 'Korallenlabyrinth', 'Das Seeungeheuer', 'Mammut-Pfad', 'Stampf-Meister', 'Eiskalte Ebene', 'Gipfelweg', 'Wolkensprung', 'Die Adlerkönigin', 'Vulkan-Aufstieg', 'Lavafluss', 'Feuer-Chili', 'Verschneite Nacht', 'Sternenwald', 'Der Krallenkönig'];
const BOSS_DAYS = { 6: 'crab', 12: 'kraken', 18: 'queen', 24: 'king' };
const TREASURE_DAY = { 3: 0, 9: 1, 15: 2, 21: 3 }; // Goetti's guitar, bike, rod and Kiwi
const MAX_HEARTS = 4; // story levels; endless and daily runs keep 3 (score challenge)
const LEVELS = LEVEL_THEMES.map((wi, li) => { const sub = li % 3, day = li + 1, boss = BOSS_DAYS[day] || null; return { li, day, wi, sub, title: LEVEL_TITLES[li], boss, treasure: TREASURE_DAY[day] != null ? TREASURE_DAY[day] : -1, segs: Math.round(46 + li * 0.9 - (boss ? 14 : 0)), speedMul: [0.98, 1.04, 1.1][sub], maxTier: [2, 3, 3][sub] }; });
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
  save.gifts.push(day); if (g.key !== 'amber') save.newGifts.push(g.key + ':' + g.i); if (g.key === 'amber') save.amber += g.n; else if (!save.owned[g.key].includes(g.i)) save.owned[g.key].push(g.i); writeSave(); return g;
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
  { n: 'Dino-Meister', gift: 25, rainbow: 'gold', body: '#ffd34d', dark: '#b07a10', belly: '#fff7c8' },
];
const HATS = [{ n: 'Auto', cost: 0 }, { n: 'Mütze', cost: 150, k: 'santa' }, { n: 'Cowboy', cost: 300, k: 'cowboy' }, { n: 'Krone', cost: 700, k: 'crown' },
  { n: 'Strohhut', gift: 2, k: 'straw' }, { n: 'Pirat', gift: 4, k: 'pirate' }, { n: 'Taucherbrille', gift: 6, k: 'goggles' }, { n: 'Kochmütze', gift: 8, k: 'chef' }, { n: 'Zylinder', gift: 10, k: 'tophat' },
  { n: 'Bergmütze', gift: 13, k: 'beanie' }, { n: 'Zauberhut', gift: 14, k: 'wizard' }, { n: 'Propeller', gift: 16, k: 'propeller' }, { n: 'Rentier', gift: 18, k: 'antlers' }, { n: 'Heiligenschein', gift: 22, k: 'halo' }, { n: 'Goldkrone', gift: 24, k: 'goldcrown' }, { n: 'Meister-Krone', gift: 25, k: 'mastercrown' }];
const FIRES = [
  { n: 'Orange', cost: 0, a: '255,190,60', b: '255,80,10', c: '255,40,0', fl: ['#fff3b0', '#ffa628', '#ff4a10'], ball: '#ff8a20', glow: '255,140,30' },
  { n: 'Blau', cost: 200, a: '130,200,255', b: '40,100,255', c: '0,30,200', fl: ['#e6f4ff', '#5fb0ff', '#2a50ff'], ball: '#4a90ff', glow: '80,150,255' },
  { n: 'Lila', cost: 450, a: '225,160,255', b: '150,50,230', c: '90,0,160', fl: ['#f6e6ff', '#c070ff', '#8a30e0'], ball: '#b060ff', glow: '170,90,255' },
  { n: 'Grün', gift: 3, a: '170,255,150', b: '60,200,60', c: '0,120,20', fl: ['#f0ffe6', '#7aff7a', '#2ab52a'], ball: '#4adf4a', glow: '90,230,90' },
  { n: 'Rosa', gift: 9, a: '255,190,225', b: '240,90,170', c: '170,20,100', fl: ['#fff0f8', '#ff9ad0', '#e0409a'], ball: '#ff70b8', glow: '255,120,190' },
  { n: 'Gold', gift: 15, a: '255,240,150', b: '255,190,30', c: '200,120,0', fl: ['#fffbe0', '#ffe066', '#e8a317'], ball: '#ffd034', glow: '255,215,80' },
  { n: 'Regenbogen', gift: 19, rainbow: true, a: '255,200,100', b: '255,80,80', c: '200,0,60', fl: ['#fff', '#ff9a3c', '#ff4a8a'], ball: '#ff8a20', glow: '255,160,80' },
];
// jackets: index 0 is Oli's red, 1 is Fabio's yellow (both free); a jacket comes with its scarf
const JACKETS = [
  { n: 'Rot', cost: 0, jac: ['#f26a5e', '#e0473c', '#a82e26'], scarf: '#2e9e5b', scarfD: 'rgba(15,70,35,.5)', zip: '#ffd34d', pocket: 'rgba(120,20,20,.55)' },
  { n: 'Gelb', cost: 0, jac: ['#ffd65c', '#f5b324', '#c2800e'], scarf: '#2f8fd6', scarfD: 'rgba(15,50,100,.5)', zip: '#fff4c8', pocket: 'rgba(140,80,0,.55)' },
  { n: 'Blau', cost: 150, jac: ['#6aa8f2', '#3a7ee0', '#22549e'], scarf: '#ffb02e', scarfD: 'rgba(120,70,0,.5)', zip: '#fff', pocket: 'rgba(20,40,100,.55)' },
  { n: 'Grün', cost: 150, jac: ['#7fd67a', '#46ad4a', '#2a7a30'], scarf: '#e53935', scarfD: 'rgba(110,10,10,.5)', zip: '#ffe08a', pocket: 'rgba(20,70,20,.55)' },
  { n: 'Lila', cost: 250, jac: ['#c49af0', '#9a5ed8', '#6a34a8'], scarf: '#ffd34d', scarfD: 'rgba(120,90,0,.5)', zip: '#fff', pocket: 'rgba(60,20,100,.55)' },
  { n: 'Nacht', cost: 300, jac: ['#5a6aa8', '#34407a', '#1c2450'], scarf: '#40c4ff', scarfD: 'rgba(0,60,100,.5)', zip: '#ffd34d', pocket: 'rgba(0,0,30,.55)' },
  { n: 'Weihnacht', cost: 400, jac: ['#e85a5a', '#c62828', '#8a1414'], scarf: '#ffffff', scarfD: 'rgba(160,160,170,.6)', zip: '#ffffff', pocket: 'rgba(255,255,255,.6)' },
  { n: 'Gold', cost: 600, jac: ['#ffe680', '#f0c030', '#b08010'], scarf: '#c62828', scarfD: 'rgba(100,10,10,.5)', zip: '#fff8d0', pocket: 'rgba(120,80,0,.55)' },
];
const CHILI_ITEMS = [{ n: 'Ohne', cost: 0 }, { n: 'Schleife', cost: 80, k: 'bow' }, { n: 'Halstuch', cost: 120, k: 'scarf' }, { n: 'Mini-Mütze', cost: 150, k: 'santa' }, { n: 'Sonnenbrille', cost: 200, k: 'glasses' }, { n: 'Rucksack', cost: 250, k: 'pack' }, { n: 'Blumenkranz', cost: 300, k: 'flowers' }];
// Goetti's vouchers: real outings, bought once with the shared amber and redeemed with Goetti
const WISHES = [
  { n: 'Velotour', cost: 600, text: 'eine grosse Velotour mit Goetti', icon: (x, y, k) => drawBike(x, y + 30 * k, 0.62 * k) },
  { n: 'Fischen', cost: 900, text: 'einen Tag Fischen mit Goetti', icon: (x, y, k) => drawRod(x, y + 8 * k, 0.8 * k, T * 3) },
  { n: 'Dino-Museum', cost: 1200, text: 'einen Ausflug ins Dino-Museum mit Goetti', icon: (x, y, k) => drawTrike(x - 2 * k, y + 22 * k, 0.62 * k, '#c98f5a', 0, false) },
];
function rgbStr(hex) { return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`; }
function fireOf(i) { const f = FIRES[i] || FIRES[0]; if (!f.rainbow) return f; const h = (T * 90) % 360, a = hslHex(h, 100, 78), b = hslHex(h, 100, 56), c = hslHex(h, 100, 36); return Object.assign({}, f, { a: rgbStr(a), b: rgbStr(b), c: rgbStr(c), fl: [hslHex(h, 100, 94), a, b], ball: b, glow: rgbStr(b) }); }
function rexLook(wi) { const sk = SKINS[save.equip.skin] || SKINS[0], h = HATS[save.equip.hat] || HATS[0], h2 = HATS[save.equip.fabioHat] || HATS[0], auto = wi === 2 || wi === 4 || wi === 7 ? 'santa' : null, jungle = wi === 0 && !sk.body; return { hat2: h2.k || auto, dive: wi === 6, rainbow: sk.rainbow, body: jungle ? '#22a98c' : sk.body, dark: jungle ? '#167a68' : sk.dark, belly: sk.belly, hat: h.k || (wi === 2 || wi === 4 || wi === 7 ? 'santa' : null) }; }
const WHO = { goetti: 'Goetti', chili: 'Chili', rex: () => save.rexName || 'T-Rex', mami: 'Mamasaurus', papi: 'Papasaurus', fabio: () => save.fabioName || 'Fabio', kiwi: 'Kiwi' };

// =====================================================================
// Character drawing
// =====================================================================
const KID = { // outfits: Oli in red with a green scarf, Fabio in yellow with a blue scarf
  oli: { pants: '#2f5aa8', knee: '#4f7ac2', scarf: '#2e9e5b', scarfD: 'rgba(15,70,35,.5)', jac: ['#f26a5e', '#e0473c', '#a82e26'], zip: '#ffd34d', pocket: 'rgba(120,20,20,.55)' },
  fabio: { pants: '#3b4f8f', knee: '#5a6eb0', scarf: '#2f8fd6', scarfD: 'rgba(15,50,100,.5)', jac: ['#ffd65c', '#f5b324', '#c2800e'], zip: '#fff4c8', pocket: 'rgba(140,80,0,.55)' },
};
function drawOli(x, y, ph, hat, o = {}) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fb = o.kid === 'fabio';
  const K = Object.assign({}, KID[o.kid || 'oli'], o.jacket != null ? JACKETS[o.jacket] : null);
  const vy = clamp((o.vy || 0) / 900, -1, 1), flutter = Math.sin(ph - 1.3) * 4.5 - vy * 8;
  // legs: thigh, knee, shin, boot - the knee swings with the stride
  const kx = x + 9 + Math.sin(ph) * 2.5, ky = y + 6, fx = x + 5 + Math.sin(ph + 0.8) * 3, fy = y + 18;
  ctx.strokeStyle = K.pants; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - 1, y - 4); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(kx - 3, ky - 1); ctx.lineTo(fx - 2, fy - 4); ctx.stroke();
  ell(kx + 0.5, ky, 3.4, 2.6, 0.3, K.knee); ctx.strokeStyle = 'rgba(20,40,90,.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(kx - 2, ky - 1); ctx.lineTo(kx + 3, ky + 1); ctx.stroke();
  ell(fx + 2, fy + 1, 5.8, 3.4, 0.1, '#5a3416'); ell(fx + 2, fy + 3.2, 6, 1.4, 0.1, '#efe6d2'); ell(fx + 0.5, fy - 0.5, 2.6, 1.2, 0.2, 'rgba(255,255,255,.28)'); ctx.strokeStyle = '#efe6d2'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(fx + 2, fy - 1.6); ctx.lineTo(fx + 4.5, fy - 0.8); ctx.moveTo(fx + 0.6, fy - 1.4); ctx.lineTo(fx + 3, fy - 0.4); ctx.stroke();
  // scarf tail streaming behind
  ctx.fillStyle = K.scarf; ctx.beginPath(); ctx.moveTo(x - 8, y - 30); ctx.quadraticCurveTo(x - 20, y - 31 + flutter * 0.5, x - 27, y - 26 + flutter); ctx.lineTo(x - 25, y - 21 + flutter); ctx.quadraticCurveTo(x - 17, y - 24 + flutter * 0.4, x - 8, y - 24); ctx.closePath(); ctx.fill();
  // torso
  rr(x - 10, y - 28, 20, 28, 7); ctx.fillStyle = hgrad(x - 10, x + 10, ...K.jac); ctx.fill();
  ctx.fillStyle = K.zip; ctx.fillRect(x - 1, y - 26, 2, 22);
  rr(x - 10, y - 6, 20, 5, 2); ctx.fillStyle = '#5a3416'; ctx.fill(); rr(x - 3, y - 6.6, 6, 6.2, 1.2); ctx.fillStyle = '#e8c04a'; ctx.fill(); ctx.strokeStyle = '#8a6a1a'; ctx.lineWidth = 0.7; ctx.stroke();
  rr(x + 3, y - 17, 6, 5, 1.4); ctx.strokeStyle = K.pocket; ctx.lineWidth = 1; ctx.stroke(); circle(x + 0.2, y - 23.5, 1.1, '#fff0b0');
  rr(x - 11, y - 32, 22, 7, 3.5); ctx.fillStyle = K.scarf; ctx.fill(); ctx.strokeStyle = K.scarfD; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - 8, y - 29.5); ctx.lineTo(x + 8, y - 29); ctx.moveTo(x - 7, y - 27.5); ctx.lineTo(x + 7, y - 27.2); ctx.stroke();
  ctx.strokeStyle = K.scarf; ctx.lineWidth = 1.4; for (let i = 0; i < 3; i++) { const py = y - 25.5 + flutter + i * 2.4; ctx.beginPath(); ctx.moveTo(x - 26 + i * 0.3, py); ctx.lineTo(x - 30 + i * 0.3, py + 1 + flutter * 0.1); ctx.stroke(); }
  if (o.front) o.front(); // whoever sits in front goes between the body and the arm, so the arm wraps round them
  // arm holding the rein (Fabio holds on to the saddle horn instead)
  const hy = y - 15 + Math.sin(ph) * 2.4 + (o.hold ? 5 : 0), hx = x + (o.hold ? 14 : 17);
  if (!o.hold) { ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(hx + 1, hy); ctx.quadraticCurveTo(x + 28, y + 4 + Math.sin(ph) * 2, x + 40, y + 1); ctx.stroke(); }
  ctx.strokeStyle = K.jac[1]; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(x + 4, y - 21); ctx.lineTo(x + 12, y - 12 + Math.sin(ph) * 1.5); ctx.lineTo(hx, hy); ctx.stroke();
  rr(hx - 4.5, hy - 4.4, 6, 5, 2); ctx.fillStyle = '#ffe9a8'; ctx.fill();
  circle(hx + 1, hy, 4, '#f4cfa6'); ell(hx + 3.4, hy - 2.4, 1.6, 1.1, 0.5, '#f4cfa6'); ctx.strokeStyle = 'rgba(160,100,60,.5)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(hx + 1, hy + 1); ctx.lineTo(hx + 4, hy + 1.4); ctx.stroke();
  // head: blond curls (back), face, ear, fringe curls, face details
  const cx = x + 2, cy = y - 40, hairD = fb ? '#d9a838' : '#c9972c', hair = fb ? '#f3d070' : '#e9c25e', hairL = fb ? '#fff0b8' : '#f8e19a';
  const curl = (px, py, r) => { circle(px, py + 1.2, r, hairD); circle(px, py, r, hair); ctx.strokeStyle = hairL; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(px - r * 0.1, py - r * 0.1, r * 0.55, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke(); };
  const capped = ['santa', 'cowboy', 'straw', 'pirate', 'chef', 'tophat', 'beanie', 'wizard', 'propeller'].includes(hat) || hat === true; // these hats cover the top of the head
  [[-12, -1, 5.4], [-13, -9, 5.6], [-10, -17, 5.6], [-3, -22, 5.8], [6, -21, 5.6], [12, -14, 5.2], [-9, 6, 4.2]].forEach(([dx, dy, r]) => { if (capped && dy < -9) return; curl(cx + dx, cy + dy, r); });
  circle(cx, cy, fb ? 12.6 : 11, '#f6d3b0'); if (fb) { ell(cx + 3, cy + 7, 7, 3, 0, 'rgba(255,255,255,.14)'); }
  circle(cx - 6, cy + 1, 3, '#eaba92'); circle(cx - 6, cy + 1, 1.4, '#d9a073');
  if (!capped) [[-4, -12, 4.6], [3, -14, 4.8], [10, -10, 4.2], [-10, -8, 4]].forEach(([dx, dy, r]) => curl(cx + dx, cy + dy, r));
  if (fb) { circle(cx + 5.6, cy + 1.2, 3.7, '#fff'); circle(cx + 6.3, cy + 1.4, 2.8, '#3b8fe0'); circle(cx + 6.6, cy + 1.4, 1.5, '#14283f'); circle(cx + 7.4, cy + 0.4, 1.1, '#fff'); circle(cx + 5.4, cy + 2.6, 0.6, '#fff'); } else { circle(cx + 5.5, cy + 0.5, 2.7, '#fff'); circle(cx + 6.1, cy + 0.6, 1.9, '#3b7fc4'); circle(cx + 6.3, cy + 0.6, 1, '#14283f'); circle(cx + 6.9, cy - 0.2, 0.7, '#fff'); }
  ctx.strokeStyle = '#b8862a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cx + 3, cy - 4.2); ctx.quadraticCurveTo(cx + 6, cy - 5.4, cx + 9, cy - 4); ctx.stroke();
  circle(cx + 10.6, cy + 3, 1.5, '#eeb893');
  ell(cx + 3, cy + 5, fb ? 3.6 : 2.4, fb ? 2.4 : 1.5, 0, fb ? 'rgba(255,110,110,.42)' : 'rgba(255,120,110,.3)');
  if (!fb) { ctx.fillStyle = '#d9a073'; for (const [dx, dy] of [[4, 3.6], [6.5, 4.6], [2.2, 5.2]]) circle(cx + dx, cy + dy, 0.5, '#d9a073'); }
  ctx.strokeStyle = '#b5483a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(cx + 5.5, cy + 6.4, fb ? 3.2 : 2.5, 0.3, Math.PI * 0.75); ctx.stroke();
  // hats sit on the hairline (brim just above the eyebrows) and cover the top curls
  const HY = y - 57;
  if (capped) { ell(x + 3, HY + 11, 13, 2.6, 0, 'rgba(60,30,10,.16)'); circle(x - 9, y - 41, 4.4, hairD); curl(x - 12, y - 41, 4.6); curl(x - 11, y - 34, 4); }
  drawHat(hat, x, HY);
  if (o.dive) { // diving mask with a strap round the head, and a snorkel
    ctx.strokeStyle = '#1f5f9a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(cx + 11, cy - 1.6); ctx.quadraticCurveTo(cx - 2, cy - 9, cx - 12, cy - 2); ctx.stroke();
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(cx - 4, cy - 3); ctx.quadraticCurveTo(cx - 14, cy - 12, cx - 12, cy - 30); ctx.stroke(); ctx.strokeStyle = '#e8a010'; ctx.lineWidth = 1.2; ctx.stroke(); rr(cx - 15.5, cy - 33.5, 6, 5, 2); ctx.fillStyle = '#e53935'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 6.8, cy + 0.6, 7.2, 5.8, 0.05, 0, 7); ctx.fillStyle = 'rgba(150,222,255,.5)'; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = '#2a8ad0'; ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = '#0f4a80'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx + 5.2, cy - 0.4, 3.4, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke(); circle(cx + 10, cy + 4, 1, 'rgba(255,255,255,.7)');
  }
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
  } else if (hat === 'mastercrown') {
    ctx.save(); ctx.translate(x + 1, HY + 8); ctx.scale(1.35, 1.35); ctx.translate(-(x + 1), -(HY + 8));
    const mg = ctx.createRadialGradient(x + 1, HY - 4, 2, x + 1, HY - 4, 26); mg.addColorStop(0, `rgba(255,240,150,${0.55 + 0.2 * Math.sin(T * 4)})`); mg.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(x + 1, HY - 4, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(x - 13, HY + 8); ctx.lineTo(x - 15, HY - 9); ctx.lineTo(x - 8, HY - 2); ctx.lineTo(x - 3, HY - 12); ctx.lineTo(x + 1, HY - 3); ctx.lineTo(x + 5, HY - 12); ctx.lineTo(x + 10, HY - 2); ctx.lineTo(x + 17, HY - 9); ctx.lineTo(x + 15, HY + 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#e8a317'; ctx.fillRect(x - 13, HY + 4, 29, 4);
    circle(x + 1, HY + 1, 2.6, '#40c4ff'); circle(x - 7, HY + 3, 1.8, '#e53935'); circle(x + 9, HY + 3, 1.8, '#69f0ae'); for (const [px, py] of [[x - 15, HY - 9], [x - 3, HY - 12], [x + 5, HY - 12], [x + 17, HY - 9]]) circle(px, py, 2.3, '#fff'); drawStar(x + 1, HY - 17, 3.8, '#fff'); ctx.restore();
  } else if (hat === 'goldcrown') {
    ctx.save(); ctx.translate(x + 1, HY + 8); ctx.scale(1.25, 1.25); ctx.translate(-(x + 1), -(HY + 8));
    ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(x - 13, HY + 8); ctx.lineTo(x - 14, HY - 8); ctx.lineTo(x - 7, HY - 1); ctx.lineTo(x + 1, HY - 13); ctx.lineTo(x + 9, HY - 1); ctx.lineTo(x + 16, HY - 8); ctx.lineTo(x + 15, HY + 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a67c10'; ctx.lineWidth = 1.6; ctx.stroke();
    circle(x + 1, HY + 2, 2.4, '#e53935'); circle(x - 7, HY + 3, 1.8, '#40c4ff'); circle(x + 9, HY + 3, 1.8, '#69f0ae'); drawStar(x + 1, HY - 15, 3.4, '#fff'); ctx.restore();
  } else if (hat === 'straw') {
    ell(x + 1, HY + 8, 23, 5.2, -0.05, '#e0b85c'); ctx.fillStyle = '#f2d98c'; ctx.beginPath(); ctx.moveTo(x - 12, HY + 7); ctx.quadraticCurveTo(x - 13, HY - 10, x + 1, HY - 9); ctx.quadraticCurveTo(x + 15, HY - 10, x + 14, HY + 7); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = '#d63a3a'; ctx.fillRect(x - 14, HY + 1, 30, 4); ctx.strokeStyle = 'rgba(150,110,40,.55)'; ctx.lineWidth = 1; for (let i = -9; i < 12; i += 4) { ctx.beginPath(); ctx.moveTo(x + i, HY - 9); ctx.lineTo(x + i, HY + 1); ctx.stroke(); } ctx.restore(); // weave and band stay inside the crown
    ctx.strokeStyle = '#8a6a20'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 12, HY + 7); ctx.quadraticCurveTo(x - 13, HY - 10, x + 1, HY - 9); ctx.quadraticCurveTo(x + 15, HY - 10, x + 14, HY + 7); ctx.closePath(); ctx.stroke();
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
    const dome = () => { ctx.beginPath(); ctx.moveTo(x - 14, HY + 8); ctx.quadraticCurveTo(x - 15, HY - 7, x + 1, HY - 8); ctx.quadraticCurveTo(x + 17, HY - 7, x + 16, HY + 8); ctx.closePath(); };
    ctx.fillStyle = '#e53935'; dome(); ctx.fill();
    ctx.save(); dome(); ctx.clip(); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(x + 1, HY - 9); ctx.quadraticCurveTo(x - 6, HY - 6, x - 10, HY + 9); ctx.lineTo(x - 2, HY + 9); ctx.quadraticCurveTo(x - 1, HY - 2, x + 1, HY - 9); ctx.fill(); ctx.fillStyle = '#3a8ae0'; ctx.fillRect(x + 4, HY - 10, 8, 20); ctx.restore(); // panels stay inside the dome
    dome(); ctx.strokeStyle = '#7a1210'; ctx.lineWidth = 1.5; ctx.stroke();
    const bw = Math.sin(T * 26) * 15; circle(x + 1, HY - 9, 2.6, '#444'); ell(x + 1, HY - 10, Math.abs(bw) + 3, 2.2, 0, '#e8e8f0');
  } else if (hat === 'antlers') {
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (const sx of [-1, 1]) { const bx = x + 1 + sx * 8; ctx.beginPath(); ctx.moveTo(bx, HY + 4); ctx.quadraticCurveTo(bx + sx * 6, HY - 6, bx + sx * 6, HY - 18); ctx.moveTo(bx + sx * 3, HY - 4); ctx.lineTo(bx + sx * 11, HY - 9); ctx.moveTo(bx + sx * 6, HY - 12); ctx.lineTo(bx + sx * 12, HY - 16); ctx.stroke(); }
  } else if (hat === 'halo') {
    ctx.save(); const g = ctx.createRadialGradient(x + 1, HY - 14, 4, x + 1, HY - 14, 22); g.addColorStop(0, 'rgba(255,240,150,.7)'); g.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 1, HY - 14, 22, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.ellipse(x + 1, HY - 14 + Math.sin(T * 3) * 1.2, 13, 4.2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
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
  const gold = o.rainbow === 'gold', rbH = gold ? 44 + 5 * Math.sin(T * 3) : o.rainbow ? (T * 60) % 360 : 0, b0 = gold ? hslHex(rbH, 95, 56 + 9 * Math.sin(T * 4)) : o.rainbow ? hslHex(rbH, 68, 52) : (o.body || '#2f9e5f'), d0 = gold ? hslHex(rbH, 85, 36) : o.rainbow ? hslHex(rbH, 68, 34) : (o.dark || '#1f7442'), belly0 = o.belly || '#f3e3a8', plate = o.spike || '#eaa43c';
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
  ctx.save(); ctx.beginPath(); ctx.moveTo(-14, -90); ctx.bezierCurveTo(-60, -92, -100, -80, -132, -58 + tw); ctx.bezierCurveTo(-100, -60, -60, -46, -14, -40); ctx.closePath(); ctx.clip(); ctx.fillStyle = 'rgba(15,70,38,.26)'; for (let i = 0; i < 4; i++) { const bx = -46 - i * 20; ctx.beginPath(); ctx.moveTo(bx, -100); ctx.lineTo(bx + 7, -100); ctx.lineTo(bx + 3 + i * 0.4, -36 + tw * 0.3); ctx.lineTo(bx - 4 + i * 0.4, -36 + tw * 0.3); ctx.fill(); } ctx.restore();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.moveTo(-14, -42); ctx.bezierCurveTo(-60, -48, -100, -60, -126, -57 + tw); ctx.bezierCurveTo(-100, -56, -60, -42, -14, -38); ctx.closePath(); ctx.fill();
  // dorsal plates: amber rounded fins that follow the spine
  ctx.fillStyle = plate; ctx.strokeStyle = shade(plate, 0.6); ctx.lineWidth = 1.5;
  const bz = t => { const u = 1 - t; return [u * u * u * -14 + 3 * u * u * t * -60 + 3 * u * t * t * -100 + t * t * t * -132, u * u * u * -90 + 3 * u * u * t * -92 + 3 * u * t * t * -80 + t * t * t * (-58 + tw)]; };
  [[30, -101, 8], [14, -99, 9.5], [-4, -96, 10.5], [-22, -92, 10], [-40, -87, 9], ...[[0.34, 8], [0.42, 7.4], [0.5, 6.8], [0.58, 6.1], [0.66, 5.4], [0.74, 4.7], [0.82, 4], [0.9, 3.2]].map(([t, z]) => { const [qx, qy] = bz(t); return [qx, qy + 5.5, z, true]; })].forEach(([px, py, sz, tl], i) => { const ty = py + (tl ? 0 : px < -50 ? tw * 0.4 : 0) + Math.sin(ph * 0.5 - 0.5 + i * 0.4) * 0.8; ctx.beginPath(); ctx.moveTo(px - sz * 0.9, ty + 5); ctx.quadraticCurveTo(px - sz * 0.5, ty - sz * 1.2, px + sz * 0.2, ty - sz * 1.45); ctx.quadraticCurveTo(px + sz * 0.8, ty - sz * 0.6, px + sz * 0.9, ty + 5); ctx.closePath(); ctx.fill(); ctx.stroke(); });
  // torso + chest + belly
  ell(4, -66, 46, 29, -0.18, body);
  ell(24, -68, 28, 28, 0, body);
  ctx.strokeStyle = 'rgba(255,255,225,.5)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(4, -66, 42, 26, -0.18, Math.PI * 1.12, Math.PI * 1.72); ctx.stroke();
  ell(16, -52, 33, 13, -0.22, belly);
  ctx.fillStyle = shade(d0, 0.8); ctx.globalAlpha = 0.3; for (const [qx, qy, qr] of [[-16, -78, 4.2], [-2, -84, 3.4], [10, -80, 3], [-26, -66, 3.6], [-8, -70, 2.6], [20, -72, 2.4], [38, -70, 2.8]]) circle(qx, qy, qr, ctx.fillStyle); ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,225,.18)'; ctx.lineWidth = 1.2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(46 + i * 4, -100 + i * 5, 4, Math.PI * 0.9, Math.PI * 1.9); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(4 + i * 9, -55 + i * 1.5); ctx.lineTo(8 + i * 9, -47 + i * 1.5); ctx.stroke(); }
  // back stripes
  ctx.strokeStyle = 'rgba(15,70,38,.35)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-26 + i * 15, -88 + i * 1.5); ctx.quadraticCurveTo(-24 + i * 15, -80, -28 + i * 15 + 4, -72); ctx.stroke(); }
  ell(-8, -84, 26, 6, -0.12, 'rgba(255,255,255,.16)');
  const ring = front => { ctx.save(); ctx.translate(40, -82); ctx.rotate(0.6); ctx.lineCap = 'butt'; const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : Math.PI * 2; ctx.strokeStyle = '#2a1c14'; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(0, 0, 21, 8, 0, a0, a1); ctx.stroke(); ctx.strokeStyle = front ? '#ff5a4a' : '#c0392b'; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.setLineDash([9, 12]); ctx.stroke(); ctx.setLineDash([]); if (front) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -1.5, 19, 6, 0, 0.5, 1.8); ctx.stroke(); } ctx.restore(); };
  if (o.dive) ring(false);
  // neck
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(18, -92); ctx.bezierCurveTo(32, -112, 48, -116, 62, -108); ctx.lineTo(64, -80); ctx.bezierCurveTo(48, -66, 34, -58, 24, -54); ctx.closePath(); ctx.fill();
  if (o.dive) ring(true);
  // lower jaw, hinged at the cheek
  ctx.save(); ctx.translate(62, jaw < 0.12 ? -94.5 : -92); ctx.rotate(jaw * 0.55);
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
  if (jaw <= 0.12) { ctx.strokeStyle = 'rgba(12,60,36,.38)'; ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(64, -92.5); ctx.quadraticCurveTo(92, -90, 111, -97.5); ctx.stroke(); }
  circle(112, -108, 2.4, shade(d0, 0.55)); ell(80, -98, 7.5, 4.2, 0, 'rgba(240,128,104,.8)'); ell(78, -99.5, 3, 1.4, 0, 'rgba(255,190,170,.6)'); ctx.fillStyle = 'rgba(255,255,255,.22)'; for (const [qx, qy] of [[96, -112], [102, -108], [90, -114], [100, -101], [106, -104]]) circle(qx, qy, 1.1, ctx.fillStyle);
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
    rr(-24, -96, 48, 11, 5); ctx.fillStyle = '#c0392b'; ctx.fill(); ctx.fillStyle = '#f4c542'; ctx.fillRect(-22, -87, 34, 2.5); ctx.strokeStyle = 'rgba(255,230,180,.6)'; ctx.lineWidth = 0.9; ctx.setLineDash([3, 2.5]); ctx.beginPath(); ctx.moveTo(-20, -93); ctx.lineTo(10, -93); ctx.stroke(); ctx.setLineDash([]);
    const lean = o.duck ? 0 : (o.lean || 0) + (o.air ? (vyn < 0 ? 0.12 : -0.08) : 0) - (jaw > 0.5 ? 0.16 : 0) - hurt * 0.3;
    ctx.save(); if (o.duck) { ctx.translate(-4, -86); ctx.rotate(0.9); } else { ctx.translate(-4, -92); ctx.rotate(lean); } ctx.scale(1.15, 1.15);
    // Fabio sits in front of Oli, smaller; Oli's rein arm wraps round him
    const fab = () => { ctx.save(); ctx.translate(27, 11); ctx.scale(0.72, 0.72); drawOli(0, 0, ph + 0.6, o.hat2 !== undefined ? o.hat2 : o.hat, { vy: o.vy, dive: o.dive, kid: 'fabio', hold: true, jacket: save.equip.fabioJacket }); ctx.restore(); };
    drawOli(0, 0, ph, o.hat, { vy: o.vy, dive: o.dive, front: fab, jacket: save.equip.jacket }); ctx.restore();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawRaptor(x, y, s, ph, flip, o = {}) {
  const c0 = o.col || '#b0653a', dark = o.dark || '#6a3418', boss = !!o.crown, feather = o.fea || (boss ? '#ffb02e' : '#f2a43a'), belly = o.belly || (boss ? '#e8b69a' : '#f2dcae');
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
  ctx.fillStyle = 'rgba(0,0,0,.16)'; for (const [qx, qy, qr] of [[-10, -46, 3.2], [-2, -52, 2.6], [-16, -54, 2.2], [6, -56, 2.4]]) circle(qx, qy, qr, ctx.fillStyle);
  ctx.strokeStyle = feather; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(16 + i * 5, -74 - i * 2.6); ctx.quadraticCurveTo(10 + i * 5, -82 - i * 2.6 - 4, 6 + i * 5, -80 - i * 2.6 - 7); ctx.stroke(); }
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
  ctx.strokeStyle = feather; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(26 + i * 4, -50 + i * 2.4); ctx.lineTo(19 + i * 3, -44 + i * 2.8); ctx.stroke(); }
  ctx.strokeStyle = shade(dark, 0.7); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(62, -74); ctx.quadraticCurveTo(66, -78, 70, -73); ctx.stroke();
  if (boss) { ctx.strokeStyle = 'rgba(255,235,210,.85)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(60, -95); ctx.lineTo(67, -80); ctx.moveTo(63, -96); ctx.lineTo(69, -83); ctx.stroke(); ctx.save(); ctx.translate(21, -55); ctx.scale(0.8, 0.8); ctx.fillStyle = vgrad(-10, 8, '#6a6a76', '#2c2c36'); ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, -0.3, 0, 7); ctx.fill(); ctx.strokeStyle = '#14141a'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.fillStyle = '#9a9aa8'; for (const [sx2, sy2, a2] of [[-6, -6, -0.9], [0, -9, -0.2], [7, -6, 0.5]]) { ctx.beginPath(); ctx.moveTo(sx2 - 2.4, sy2 + 2); ctx.lineTo(sx2 + a2 * 3, sy2 - 8); ctx.lineTo(sx2 + 2.4, sy2 + 2); ctx.fill(); } for (const rx of [-5, 0, 5]) circle(rx, 1, 1, '#d0d0dc'); ctx.restore(); }
  ctx.fillStyle = '#fff3d6'; for (const d of [-2, 2]) { ctx.beginPath(); ctx.moveTo(40, -50 + d); ctx.lineTo(46, -47 + d); ctx.lineTo(40, -45 + d); ctx.fill(); }
  leg(ph, col, false);
  if (boss) { // golden crown with gems
    ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(33, -100); ctx.lineTo(32, -116); ctx.lineTo(40, -108); ctx.lineTo(46, -120); ctx.lineTo(52, -108); ctx.lineTo(60, -116); ctx.lineTo(59, -99); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 1.6; ctx.stroke();
    circle(46, -105, 2.6, '#e53935'); circle(38, -104, 1.8, '#40c4ff'); circle(54, -104, 1.8, '#69f0ae');
  }
  if (boss && o.dmg) drawWounds('king', o.dmg, o.wid, o.ko);
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawPtero(x, y, s, ph, flip, o = {}) {
  const dark = '#4f2a63', mid = '#8e5aa8', light = '#c99be0';
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  if (o.alpha != null) ctx.globalAlpha = Math.max(0, o.alpha);
  const fl = c => c > 0 ? Math.pow(c, 0.75) : -Math.pow(-c, 1.5); // quick upstroke feel, long glide on the downstroke
  const tip = -50 * fl(Math.cos(ph)), tip2 = -46 * fl(Math.cos(ph - 0.7));
  ctx.translate(0, 3 * Math.cos(ph)); // body dips as the wings rise
  const wing = (t, c1, c2, back) => { // arm with elbow, membrane with scalloped trailing edge, three finger bones, wrist claw
    const ex = 5 + t * 0.12, ey = t * 0.42 - 3, wx = -2 + t * 0.35, wy = t, S = [12, -2];
    const f1 = [wx - 13 + t * 0.1, wy * 0.62 + 2], f2 = [wx - 22 + t * 0.05, wy * 0.3 + 3], f3 = [-19, 3];
    const bow = (a, b) => [(a[0] + b[0]) / 2 + (S[0] - (a[0] + b[0]) / 2) * 0.1, (a[1] + b[1]) / 2 + (S[1] - (a[1] + b[1]) / 2) * 0.1];
    const W = [wx, wy], b1 = bow(W, f1), b2 = bow(f1, f2), b3 = bow(f2, f3);
    ctx.fillStyle = vgrad(Math.min(0, t), Math.max(0, t) + 4, c1, c2); ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(ex, ey); ctx.lineTo(wx, wy);
    ctx.quadraticCurveTo(b1[0], b1[1], f1[0], f1[1]); ctx.quadraticCurveTo(b2[0], b2[1], f2[0], f2[1]); ctx.quadraticCurveTo(b3[0], b3[1], f3[0], f3[1]); ctx.lineTo(-4, 1); ctx.closePath(); ctx.fill();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(40,12,60,.55)'; ctx.lineWidth = back ? 1.2 : 1.7; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,20,80,.5)'; ctx.lineWidth = 1.3; ctx.beginPath(); for (const f of [f1, f2]) { ctx.moveTo(wx, wy); ctx.lineTo(f[0], f[1]); } ctx.moveTo(ex - 2, ey + 3); ctx.lineTo((f2[0] + f3[0]) / 2 + 2, (f2[1] + f3[1]) / 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(S[0] - 2, S[1] + (t < 0 ? 1.5 : -1.5)); ctx.lineTo(ex - 1, ey + (t < 0 ? 1.5 : -1.5)); ctx.stroke();
    ctx.strokeStyle = dark; ctx.lineWidth = back ? 2.2 : 3; ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(ex, ey); ctx.lineTo(wx, wy); ctx.stroke();
    ctx.fillStyle = '#f3ead2'; ctx.beginPath(); ctx.moveTo(wx + 1, wy); ctx.lineTo(wx + 5, wy + (t < 0 ? 4 : -4)); ctx.lineTo(wx - 2, wy + (t < 0 ? 1 : -1)); ctx.fill();
  };
  wing(tip2, shade(mid, 0.8), dark, true);
  ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (const [lx, ph2] of [[-5, 0], [2, 1.4]]) { const sw = Math.sin(ph + ph2) * 2; ctx.beginPath(); ctx.moveTo(lx, 6); ctx.lineTo(lx - 4 + sw, 14); ctx.lineTo(lx - 1 + sw, 17); ctx.moveTo(lx - 4 + sw, 14); ctx.lineTo(lx - 7 + sw, 16.5); ctx.stroke(); }
  ell(0, 0, 23, 9.5, 0, vgrad(-10, 10, light, mid, dark)); ell(3, 4, 14, 4.5, 0, '#e8d4f2');
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(12 + i * 1.2, -3 + i * 2.2); ctx.lineTo(16 + i * 1.2, -2 + i * 2.2); ctx.stroke(); } ell(-4, -5, 11, 2.6, -0.05, 'rgba(255,255,255,.18)');
  ctx.strokeStyle = dark; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(-30, 8); ctx.stroke(); // tail whip
  // head with a long beak and a swept-back crest
  ctx.fillStyle = '#f08a3c'; ctx.beginPath(); ctx.moveTo(24, -12); ctx.quadraticCurveTo(14, -26, -4, -26); ctx.quadraticCurveTo(10, -14, 22, -5); ctx.closePath(); ctx.fill();
  ell(33, 3.4, 8, 3.2, 0.15, '#d98aa8');
  ctx.fillStyle = vgrad(-14, 4, light, mid); ctx.beginPath(); ctx.moveTo(18, -9); ctx.bezierCurveTo(26, -17, 44, -15, 62, -4); ctx.bezierCurveTo(46, -2, 32, 3, 18, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(30, -1); ctx.quadraticCurveTo(46, -3, 60, -4); ctx.stroke();
  ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(40 + i * 6, -3); ctx.lineTo(42.4 + i * 6, 1.4); ctx.lineTo(44.8 + i * 6, -3.2); ctx.fill(); }
  circle(28, -6.5, 4.8, '#fff'); circle(29, -6.5, 3.4, '#ffd23a'); circle(29.8, -6.4, 1.8, '#17100a'); circle(30.2, -7.6, 0.8, '#fff');
  ctx.strokeStyle = dark; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(22, -13); ctx.lineTo(34, -10); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,50,10,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(20 - i * 5, -15 - i * 3.4); ctx.lineTo(8 - i * 3, -21 - i * 1.4); } ctx.stroke(); circle(55, -6, 0.9, 'rgba(0,0,0,.45)');
  wing(tip, light, mid, false);
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawCompy(x, y, s, ph, flip, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s * (o.flat ? 0.35 : 1));
  const tn = o.tone || ['#dcec62', '#9cbf2e', '#5f7f17', '#4a6312'], col = vgrad(-36, 0, tn[0], tn[1], tn[2]), dark = tn[3];
  const leg = (p, c) => { const sw = Math.sin(p); ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-2, -16); ctx.lineTo(-2 + sw * 7, -2 - Math.max(0, Math.cos(p)) * 4); ctx.lineTo(5 + sw * 7, 0); ctx.stroke(); };
  leg(ph + Math.PI, dark);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-6, -24); ctx.quadraticCurveTo(-26, -28, -42, -34 + Math.sin(ph) * 3); ctx.quadraticCurveTo(-24, -16, -6, -14); ctx.fill();
  ell(0, -20, 14, 10, -0.2, col); ell(4, -16, 9, 4.5, -0.2, '#f2f0b8');
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(4, -26); ctx.quadraticCurveTo(10, -36, 16, -38); ctx.lineTo(28, -35); ctx.quadraticCurveTo(30, -29, 24, -28); ctx.lineTo(12, -26); ctx.quadraticCurveTo(10, -20, 8, -16); ctx.fill();
  circle(18, -38, 8.2, col);
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, -20, 13.5, 9.5, -0.2, 0, 7); ctx.moveTo(-6, -24); ctx.quadraticCurveTo(-26, -28, -42, -34 + Math.sin(ph) * 3); ctx.quadraticCurveTo(-24, -16, -6, -14); ctx.closePath(); ctx.clip(); // markings stay inside the body and tail
  ctx.strokeStyle = '#e07b39'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 6, -29); ctx.lineTo(-8 + i * 6, -21); ctx.stroke(); }
  ctx.fillStyle = 'rgba(60,90,10,.3)'; for (const [qx, qy, qr] of [[-4, -25, 2], [3, -27, 1.6], [-12, -22, 1.5], [-22, -24, 1.6], [-30, -27, 1.2]]) circle(qx, qy, qr, ctx.fillStyle);
  ctx.strokeStyle = 'rgba(224,123,57,.85)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const sx = -22 - i * 5; ctx.beginPath(); ctx.moveTo(sx, -34); ctx.lineTo(sx + 1, -18); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = '#f08a3c'; ctx.lineWidth = 1.8; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(10 + i * 2.4, -19 + i * 1.6); ctx.lineTo(4 + i * 2, -12 + i * 2); } ctx.stroke(); 
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
const chiliFx = { vy: 0, dig: false, scared: 0, joy: 0, dive: false };
let chiliAcc = null; // shop cards draw Chili with a given accessory; null = what Chili wears
function drawChiliAcc(k) { // in Chili's coordinates: head at (15,-24) r12, ears from (6..14,-33), body centre (0,-15)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (k === 'bow') { ctx.save(); ctx.translate(10, -35); ctx.rotate(-0.3); ctx.fillStyle = '#e53935'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sx * 9, -8, sx * 10, 0); ctx.quadraticCurveTo(sx * 9, 8, 0, 0); ctx.fill(); } circle(0, 0, 2.6, '#b71c1c'); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-7, -3); ctx.lineTo(-4, -2); ctx.moveTo(7, -3); ctx.lineTo(4, -2); ctx.stroke(); ctx.restore(); }
  else if (k === 'scarf') { ctx.fillStyle = '#2f8fd6'; ctx.beginPath(); ctx.moveTo(4, -17); ctx.quadraticCurveTo(13, -11, 23, -15); ctx.lineTo(18, -4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#1c5a96'; ctx.lineWidth = 1; ctx.stroke(); for (const [dx, dy] of [[9, -13], [15, -12], [17, -8]]) circle(dx, dy, 1.1, '#fff'); }
  else if (k === 'santa') { ctx.save(); ctx.translate(19, -34); ctx.rotate(0.35); ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-2, -16, 9, -14); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill(); circle(10, -14, 3, '#fff'); rr(-9, -2, 19, 5, 2.5); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); }
  else if (k === 'glasses') { // two lenses on a bridge, so it reads as sunglasses and not as an eye patch
    ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(14, -27.5); ctx.lineTo(7, -31); ctx.stroke(); // temple towards the ear
    ell(26.6, -26.4, 3.2, 3.6, 0.1, '#ff8a2a'); ell(26.6, -26.4, 2.3, 2.8, 0.1, '#1b2430'); // far lens
    ell(20.5, -26, 6.6, 5.2, 0, '#ff8a2a'); ell(20.5, -26, 5.3, 4.1, 0, '#1b2430'); ell(18.6, -27.6, 2.4, 1.1, -0.35, 'rgba(255,255,255,.6)'); circle(22.6, -24.4, 0.8, 'rgba(255,255,255,.35)'); }
  else if (k === 'pack') { rr(-14, -27, 14, 15, 4); ctx.fillStyle = '#3a9a4a'; ctx.fill(); ctx.strokeStyle = '#1f5a28'; ctx.lineWidth = 1.4; ctx.stroke(); rr(-12, -19, 10, 6, 2); ctx.fillStyle = '#46ad4a'; ctx.fill(); ctx.stroke(); circle(-7, -16, 1, '#ffd34d'); ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-1, -25); ctx.quadraticCurveTo(5, -16, 1, -5); ctx.stroke(); }
  else if (k === 'flowers') { ctx.strokeStyle = '#4a8a3a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(15, -24, 12.5, Math.PI * 1.12, Math.PI * 1.85); ctx.stroke(); [[1.15, '#ff8ab0'], [1.3, '#ffd34d'], [1.45, '#fff'], [1.6, '#ff8ab0'], [1.75, '#b39ddb']].forEach(([a, c]) => { const fx = 15 + Math.cos(Math.PI * a) * 12.5, fy = -24 + Math.sin(Math.PI * a) * 12.5; for (let i = 0; i < 5; i++) circle(fx + Math.cos(i * 1.257) * 2.2, fy + Math.sin(i * 1.257) * 2.2, 1.6, c); circle(fx, fy, 1.3, '#f0a020'); }); }
}
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
  ctx.strokeStyle = 'rgba(255,240,225,.7)'; ctx.lineWidth = 1; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(6 + i * 3, -12 + i * 0.5); ctx.lineTo(8 + i * 3, -8 + i * 0.5); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(110,60,30,.35)'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 4, -22); ctx.lineTo(-6 + i * 4, -15); ctx.stroke(); }
  ell(22, -19, 4, 2.4, 0, 'rgba(255,130,150,.45)'); ell(8, -31, 6, 3, -0.4, 'rgba(255,255,255,.2)');
  if (chiliFx.joy > 0) { ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(20, -24, 3.6, Math.PI + 0.3, Math.PI * 2 - 0.3); ctx.stroke(); } // happy ^ ^ eye
  else if (chiliFx.scared > 0) { circle(20, -26, 5.6, '#1b1210'); circle(21.8, -28.2, 2.2, '#fff'); circle(18.6, -24, 1, '#fff'); } // wide startled eye
  else if ((T % 3.1) < 0.1) { ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(20, -26, 3.4, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else { circle(20, -26, 4.6, '#1b1210'); circle(21.6, -27.8, 1.8, '#fff'); circle(18.8, -24.2, 0.9, '#fff'); }
  if (chiliFx.dig) { ctx.strokeStyle = col; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; for (const k of [0, 1.6]) { ctx.beginPath(); ctx.moveTo(12, -8); ctx.lineTo(22 + Math.sin(T * 34 + k) * 5, -1 + Math.cos(T * 34 + k) * 2); ctx.stroke(); } }
  circle(27, -21, 2.4, '#f48fb1');
  { const acc = (CHILI_ITEMS[chiliAcc != null ? chiliAcc : save.equip.chili] || {}).k; if (acc) drawChiliAcc(acc); }
  if (chiliFx.dive) { // glass diving helmet with a golden collar
    ctx.save(); const g = ctx.createRadialGradient(8, -50, 3, 14, -38, 34); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.5, 'rgba(170,225,255,.22)'); g.addColorStop(1, 'rgba(120,200,255,.3)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(16, -38, 20, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(210,240,255,.9)'; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(16, -38, 15, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
    ctx.fillStyle = '#e8b030'; ctx.strokeStyle = '#7a5410'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(16, -10, 19, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); for (const bx of [3, 11, 21, 29]) circle(bx, -9.6, 1.2, '#7a5410'); ctx.restore();
    circle(16, -69, 2.6, '#e8b030'); ctx.strokeStyle = '#e8b030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, -67); ctx.lineTo(16, -63); ctx.stroke();
  }
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
  circle(90 + Math.sin(ph) * 3, -149, 1.3, 'rgba(0,0,0,.45)'); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(74 + Math.sin(ph) * 3, -159); ctx.quadraticCurveTo(79 + Math.sin(ph) * 3, -161.5, 83 + Math.sin(ph) * 3, -158.5); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; for (let i = 0; i < 6; i++) { const u = i / 5; circle(38 + (62 - 38) * u + Math.sin(u * 3) * 6, -72 - 70 * u, 2.2 - u * 0.5, ctx.fillStyle); }
  ctx.fillStyle = '#efe6d2'; for (const lx of [-38, -14, 14, 36]) { ctx.beginPath(); ctx.ellipse(lx, -2, 6, 2.6, 0, Math.PI, 0); ctx.fill(); }
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
  ctx.strokeStyle = 'rgba(160,90,30,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = Math.PI * (0.9 + i * 0.22); ctx.moveTo(26 + Math.cos(a) * 6, -40 + Math.sin(a) * 6); ctx.lineTo(26 + Math.cos(a) * 15, -40 + Math.sin(a) * 15); } ctx.stroke();
  ctx.strokeStyle = 'rgba(190,150,90,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(44, -44); ctx.lineTo(46, -46); ctx.moveTo(50, -48.5); ctx.lineTo(52, -50.5); ctx.stroke();
  circle(52, -31, 1.1, 'rgba(0,0,0,.4)'); ctx.fillStyle = '#efe6d2'; for (const lx of [-18, 14]) { ctx.beginPath(); ctx.ellipse(lx, -1, 6, 2.4, 0, Math.PI, 0); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ell(-4, -36, 22, 6, 0, ctx.fillStyle); ctx.fillStyle = 'rgba(0,0,0,.14)'; for (const [qx, qy] of [[-14, -30], [-2, -26], [8, -33]]) circle(qx, qy, 2.4, ctx.fillStyle);
  ctx.restore();
}

function drawBaby(x, y, s, ph, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const col = vgrad(-52, 0, '#a8e8a8', '#7fd08a', '#4ea35b'), dark = '#4ea35b';
  ctx.strokeStyle = dark; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(-4 + Math.sin(ph) * 5, 0); ctx.moveTo(6, -12); ctx.lineTo(6 - Math.sin(ph) * 5, 0); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-10, -22); ctx.quadraticCurveTo(-28, -20, -34, -10); ctx.quadraticCurveTo(-22, -12, -8, -12); ctx.fill();
  ell(0, -20, 16, 13, 0, col);
  ell(2, -14, 9, 6, 0, '#e8f6d0'); ctx.fillStyle = 'rgba(40,120,60,.25)'; for (const [qx, qy] of [[-6, -26], [0, -29], [-10, -19]]) circle(qx, qy, 2.2, ctx.fillStyle);
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
function drawGoettiHead(cx, cy, r, glasses) { // young, lean face, light stubble, dark cap worn backwards, sunglasses pushed up on top
  const skin = '#f2c6a0', skinD = '#e2ab82', hairC = '#2e231d', cap = '#26324a', capD = '#141b2c', capL = '#3d4f74', TAU = Math.PI * 2;
  const facePath = () => { ctx.beginPath(); ctx.moveTo(cx - r * 0.88, cy - r * 0.1); ctx.bezierCurveTo(cx - r * 0.92, cy + r * 0.55, cx - r * 0.46, cy + r * 1.02, cx, cy + r * 1.04); ctx.bezierCurveTo(cx + r * 0.46, cy + r * 1.02, cx + r * 0.92, cy + r * 0.55, cx + r * 0.88, cy - r * 0.1); ctx.bezierCurveTo(cx + r * 0.88, cy - r * 0.85, cx - r * 0.88, cy - r * 0.85, cx - r * 0.88, cy - r * 0.1); ctx.closePath(); };
  // ears and short hair at the sides
  circle(cx - r * 0.93, cy + r * 0.14, r * 0.19, skinD); circle(cx + r * 0.93, cy + r * 0.14, r * 0.19, skinD);
  ell(cx - r * 0.86, cy - r * 0.02, r * 0.1, r * 0.26, 0.1, hairC); ell(cx + r * 0.86, cy - r * 0.02, r * 0.1, r * 0.26, -0.1, hairC);
  // face
  facePath(); ctx.fillStyle = vgrad(cy - r, cy + r * 1.05, '#f7d3ae', skin, '#e6b48c'); ctx.fill();
  // light stubble: a soft shadow along jaw and chin, a faint one above the lip, a few specks
  ctx.save(); facePath(); ctx.clip(); ctx.fillStyle = vgrad(cy + r * 0.25, cy + r * 1.05, 'rgba(70,52,42,0)', 'rgba(70,52,42,.22)'); ctx.fillRect(cx - r, cy + r * 0.25, r * 2, r * 0.85);
  ctx.fillStyle = 'rgba(70,52,42,.13)'; ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.38, r * 0.4, r * 0.09, 0, 0, TAU); ctx.fill();
  ctx.restore();
  // nose
  ell(cx, cy + r * 0.16, r * 0.13, r * 0.11, 0, skinD); ell(cx - r * 0.04, cy + r * 0.12, r * 0.05, r * 0.035, 0, 'rgba(255,255,255,.35)');
  // big open grin with teeth and a hint of tongue
  ctx.fillStyle = '#6e2530'; ctx.beginPath(); ctx.moveTo(cx - r * 0.46, cy + r * 0.46); ctx.quadraticCurveTo(cx, cy + r * 0.58, cx + r * 0.46, cy + r * 0.46); ctx.quadraticCurveTo(cx + r * 0.4, cy + r * 0.88, cx, cy + r * 0.9); ctx.quadraticCurveTo(cx - r * 0.4, cy + r * 0.88, cx - r * 0.46, cy + r * 0.46); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(cx - r * 0.5, cy + r * 0.42, r, r * 0.2); ctx.fillStyle = '#e8627e'; ctx.beginPath(); ctx.ellipse(cx + r * 0.05, cy + r * 0.88, r * 0.22, r * 0.15, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy + r * 0.62); ctx.lineTo(cx + r * 0.5, cy + r * 0.62); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = 'rgba(120,50,50,.55)'; ctx.lineWidth = Math.max(1, r * 0.04); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - r * 0.46, cy + r * 0.46); ctx.quadraticCurveTo(cx, cy + r * 0.58, cx + r * 0.46, cy + r * 0.46); ctx.stroke();
  // wide-open brown eyes, thick straight raised brows, a little blush
  for (const sx of [-1, 1]) {
    const ex = cx + sx * r * 0.38, ey = cy - r * 0.08;
    ell(ex, ey, r * 0.2, r * 0.19, 0, '#fff'); ctx.strokeStyle = 'rgba(80,50,40,.35)'; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.2, r * 0.19, 0, 0, TAU); ctx.stroke();
    circle(ex - sx * r * 0.01, ey, r * 0.125, '#6a4428'); circle(ex - sx * r * 0.01, ey, r * 0.065, '#140c08'); circle(ex + r * 0.04, ey - r * 0.06, r * 0.05, '#fff'); circle(ex - r * 0.04, ey + r * 0.05, r * 0.025, '#fff');
    ctx.strokeStyle = hairC; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + sx * r * 0.62, cy - r * 0.27); ctx.quadraticCurveTo(cx + sx * r * 0.4, cy - r * 0.45, cx + sx * r * 0.14, cy - r * 0.37); ctx.stroke();
    ell(cx + sx * r * 0.6, cy + r * 0.34, r * 0.16, r * 0.09, 0, 'rgba(235,110,100,.25)');
  }
  // the cap, worn backwards and pushed back: mesh panel, seams, button, and the adjustment strap across the forehead
  const dome = () => { ctx.beginPath(); ctx.moveTo(cx - r * 0.96, cy - r * 0.1); ctx.bezierCurveTo(cx - r * 1.04, cy - r * 1.14, cx + r * 1.04, cy - r * 1.14, cx + r * 0.96, cy - r * 0.1); ctx.quadraticCurveTo(cx, cy - r * 0.98, cx - r * 0.96, cy - r * 0.1); ctx.closePath(); };
  dome(); ctx.fillStyle = vgrad(cy - r, cy - r * 0.3, capL, cap, capD); ctx.fill();
  ctx.save(); dome(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.1)'; for (let gy = -0.95; gy < -0.3; gy += 0.14) for (let gx = -1; gx < 1; gx += 0.14) circle(cx + (gx + ((gy * 100 | 0) % 2 ? 0.07 : 0)) * r, cy + gy * r, r * 0.022, ctx.fillStyle);
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = Math.max(1, r * 0.03); for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.97); ctx.quadraticCurveTo(cx + k * r * 1.1, cy - r * 0.8, cx + k * r * 1.5, cy - r * 0.3); ctx.stroke(); } ctx.restore();
  dome(); ctx.strokeStyle = capD; ctx.lineWidth = Math.max(1.4, r * 0.06); ctx.lineJoin = 'round'; ctx.stroke();
  circle(cx, cy - r * 0.97, r * 0.07, capL); ctx.strokeStyle = capD; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.arc(cx, cy - r * 0.97, r * 0.07, 0, TAU); ctx.stroke();
  const strap = () => { ctx.beginPath(); ctx.moveTo(cx - r * 0.95, cy - r * 0.1); ctx.quadraticCurveTo(cx, cy - r * 0.98, cx + r * 0.95, cy - r * 0.1); };
  strap(); ctx.strokeStyle = '#0c0f16'; ctx.lineWidth = r * 0.22; ctx.lineCap = 'butt'; ctx.stroke(); strap(); ctx.strokeStyle = '#3c424e'; ctx.lineWidth = r * 0.15; ctx.stroke(); // plastic adjustment strap
  for (let k = -3; k <= 3; k++) { const u = 0.5 + k * 0.085, y = (1 - u) * (1 - u) * (-0.1) + 2 * u * (1 - u) * (-0.98) + u * u * (-0.1), x = (1 - u) * (1 - u) * (-0.95) + u * u * 0.95; circle(cx + x * r, cy + y * r, r * 0.026, '#12151c'); } // strap holes
  if (glasses) { // sunglasses resting on top of the cap
    ctx.save(); ctx.translate(cx + r * 0.02, cy - r * 0.98); ctx.rotate(-0.08); ctx.lineJoin = 'round';
    for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * r * 0.32, 0); rr(-r * 0.27, -r * 0.16, r * 0.54, r * 0.32, r * 0.1); ctx.fillStyle = vgrad(-r * 0.16, r * 0.16, '#3a4256', '#0e121c'); ctx.fill(); ctx.strokeStyle = '#0a0d14'; ctx.lineWidth = r * 0.07; ctx.stroke(); ell(-r * 0.09, -r * 0.06, r * 0.1, r * 0.04, -0.4, 'rgba(255,255,255,.55)'); ctx.restore(); }
    ctx.strokeStyle = '#0a0d14'; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.moveTo(-r * 0.06, -r * 0.04); ctx.quadraticCurveTo(0, -r * 0.1, r * 0.06, -r * 0.04); ctx.stroke(); ctx.restore();
  }
}
function drawGoetti(x, y, s, wave) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#5b4636'; rr(-16, -50, 13, 50, 5); ctx.fill(); rr(3, -50, 13, 50, 5); ctx.fill();
  ctx.fillStyle = '#3b2a1e'; rr(-20, -8, 20, 8, 4); ctx.fill(); rr(1, -8, 20, 8, 4); ctx.fill();
  rr(-22, -105, 44, 60, 14); ctx.fillStyle = hgrad(-22, 22, '#93a85e', '#7a8f4a', '#56672f'); ctx.fill(); rr(-9, -104, 18, 58, 5); ctx.fillStyle = hgrad(-9, 9, '#ea6a58', '#d4503f', '#a93a2e'); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, -104); ctx.lineTo(-9, -48); ctx.moveTo(9, -104); ctx.lineTo(9, -48); ctx.stroke();
  rr(5, -92, 12, 12, 2); ctx.fillStyle = '#6a7d3c'; ctx.fill(); ctx.fillStyle = '#4a3020'; ctx.fillRect(-22, -52, 44, 6); rr(-5, -53, 10, 8, 1.5); ctx.fillStyle = '#e8c04a'; ctx.fill(); ctx.strokeStyle = '#8a6a1a'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#f4d58a'; for (let i = 0; i < 4; i++) circle(0, -96 + i * 11, 1.8, '#f4d58a'); ctx.strokeStyle = 'rgba(30,40,10,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(6, -86); ctx.lineTo(16, -86); ctx.stroke(); ctx.fillStyle = '#e8c04a'; ctx.fillRect(14, -92, 2, 4); rr(-21, -62, 6, 4, 1); ctx.fillStyle = '#5a6a30'; ctx.fill();
  ctx.strokeStyle = '#c8473a'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-18, -95); ctx.lineTo(-26, -58); ctx.stroke();
  const a = wave ? Math.sin(T * 6) * 0.4 : 0;
  ctx.beginPath(); ctx.moveTo(18, -95); ctx.lineTo(18 + Math.cos(-1.1 + a) * 36, -95 + Math.sin(-1.1 + a) * 36); ctx.stroke();
  circle(18 + Math.cos(-1.1 + a) * 40, -95 + Math.sin(-1.1 + a) * 40, 6, '#f0c49b');
  circle(-26, -54, 6, '#f0c49b');
  drawGoettiHead(0, -127, 26, true);
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
  ctx.fillStyle = full ? vgrad(-16, 9, '#ff8a96', '#ff4d5e', '#d02a40') : 'rgba(0,0,0,.35)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  if (full) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-7, -9, 3.6, 2.2, -0.6, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(120,10,30,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-12, -4); ctx.bezierCurveTo(-8, 3, -2, 6, 0, 7); ctx.stroke(); }
  ctx.restore();
}

function drawPortrait(who, cx, cy, r, still) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const bg = { kiwi: '#e8f5d0', goetti: '#cfe3b0', chili: '#ffe0c2', rex: '#bfe6cf', mami: '#ead7f5', papi: '#d3e6fb', fabio: '#ffe6c4' }[who] || '#eee';
  ctx.fillStyle = bg; ctx.fill(); ctx.clip();
  if (who === 'goetti') { drawGoettiHead(cx, cy + r * 0.25, r * 0.55); }
  else if (who === 'chili') { const s = r / 26; drawChili(cx - 10 * s, cy + 30 * s, s, still ? 0 : T * 3); }
  else if (who === 'rex') { const s = r / 42; drawRex(cx - 88 * s, cy + 104 * s, s * 0.95, 0, 0.3 + 0.2 * Math.sin(T * 8)); }
  else if (who === 'mami' || who === 'papi') { const s = r / 34; drawLongneck(cx - 72 * s, cy + 146 * s, s, who === 'mami' ? '#b07cc6' : '#4f8fd6', T * 2); }
  else if (who === 'kiwi') { const s = r / 22; drawKiwi(cx - 16 * s, cy + 22 * s, s, T * 6); }
  else if (who === 'fabio') { const k = r / 21; ctx.save(); ctx.translate(cx - 8 * k, cy + 44 * k); ctx.scale(k, k); drawOli(0, 0, 0.5, null, { kid: 'fabio', hold: true, jacket: save.equip.fabioJacket }); ctx.restore(); }
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
  const nO = bw * bh * k * k > 60000 ? 4 : 8, rO = nO === 4 ? lw * 1.2 : lw; // big sprites (the bosses) use fewer outline stamps: it is the costliest draw in a fight
  for (let i = 0; i < nO; i++) { const a = i / nO * Math.PI * 2 + (nO === 4 ? Math.PI / 4 : 0); ctx.drawImage(P.b, 0, 0, cw, ch, X + Math.cos(a) * rO, Y + Math.sin(a) * rO, cw / k, ch / k); }
  ctx.drawImage(P.a, 0, 0, cw, ch, X, Y, cw / k, ch / k);
  ctx.restore();
}
// bounding boxes are in unscaled character units; flip mirrors x
function obox(s, flip, x0, x1, y0, y1) { return flip ? [-x1 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s] : [x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s]; }
function oRex(x, y, s, ph, jaw, o = {}) { const [bx, by, bw, bh] = obox(s, o.flip, -134, o.fire ? 152 : 132, o.rider ? (o.hat || o.hat2 ? -214 : -186) : -142, 14); const a = o.alpha == null ? 1 : o.alpha; outlined('rex', x, y, bx, by, bw, bh, () => drawRex(x, y, s, ph, jaw, Object.assign({}, o, { alpha: null })), a); }
function oRaptor(x, y, s, ph, flip, o = {}) { const [bx, by, bw, bh] = obox(s, flip, -118, 90, o.crown ? -128 : -128, 6); const a = o.alpha == null ? 1 : Math.max(0, o.alpha); outlined(o.crown ? 'boss' : 'raptor', x, y, bx, by, bw, bh, () => drawRaptor(x, y, s, ph, flip, Object.assign({}, o, { alpha: null })), a); }
function oPtero(x, y, s, ph, flip, o = {}) { const [bx, by, bw, bh] = obox(s, flip, -52, 68, -64, 56); const a = o.alpha == null ? 1 : Math.max(0, o.alpha); outlined('ptero', x, y, bx, by, bw, bh, () => drawPtero(x, y, s, ph, flip, {}), a); }
function oCompy(x, y, s, ph, flip, o = {}) { const [bx, by, bw, bh] = obox(s, flip, -46, 38, -56, 4); const a = o.alpha == null ? 1 : Math.max(0, o.alpha); outlined('compy', x, y, bx, by, bw, bh, () => drawCompy(x, y, s, ph, flip, { flat: o.flat, tone: o.tone }), a); }
function oChili(x, y, s, ph, flip) { const [bx, by, bw, bh] = chiliFx.dive ? obox(s, flip, -34, 50, -78, 10) : obox(s, flip, -32, 46, -72, 10); outlined('chili', x, y, bx, by, bw, bh, () => drawChili(x, y, s, ph, flip)); }
function oBaby(x, y, s, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -38, 32, -78, 4); outlined('baby', x, y, bx, by, bw, bh, () => drawBaby(x, y, s, ph, flip)); }
function oKiwi(x, y, s, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -22, 44, -34, 4); outlined('kiwi', x, y, bx, by, bw, bh, () => drawKiwi(x, y, s, ph, flip)); }
function oLong(x, y, s, col, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -120, 100, -165, 4); outlined('long', x, y, bx, by, bw, bh, () => drawLongneck(x, y, s, col, ph, flip)); }
function oTrike(x, y, s, col, ph, flip) { const [bx, by, bw, bh] = obox(s, flip, -60, 62, -64, 4); outlined('trike', x, y, bx, by, bw, bh, () => drawTrike(x, y, s, col, ph, flip)); }
function oGoetti(x, y, s, wave) { const [bx, by, bw, bh] = obox(s, false, -36, 64, -166, 4); outlined('goetti', x, y, bx, by, bw, bh, () => drawGoetti(x, y, s, wave)); }

// =====================================================================
// Level generation
// =====================================================================
function buildLevel(wi, endless, LV) { // LV = the calendar level spec (or undefined for endless runs)
  const th = WORLDS[wi], R = rng(endless ? (dailySeed ? dailySeed * 8 + wi : (Date.now() & 0xffffff) + wi) : (LV ? 777 + LV.li * 1013 + 91 : 777 + wi * 1013));
  const dayN = LV ? LV.day : 99, first = LV ? LV.sub === 0 : true, SK = skillsFor(LV ? LV.li : null, wi), bossKind = LV ? LV.boss : null;
  const L = { wi, li: LV ? LV.li : -1, speed: th.speed * (LV ? LV.speedMul : 1), swim: !!th.swim, bossKind, pits: [], obs: [], amb: [], plats: [], eggs: [], spots: [], tips: [], cps: [], coach: [], seen: {}, peppers: [], hearts: [] };
  const amberRow = (x, n, y = GROUND - 45, dx = 48) => { for (let i = 0; i < n; i++) L.amb.push({ x: x + i * dx, y, got: false }); };
  const amberArc = (x, w, peak) => { const n = Math.max(3, Math.floor(w / 45)); for (let i = 0; i <= n; i++) { const u = i / n; L.amb.push({ x: x + u * w, y: GROUND - 60 - 4 * peak * u * (1 - u), got: false }); } };
  const firstTip = (type, x, text) => { if (!L.seen[type]) { L.seen[type] = 1; if (text) L.tips.push({ x, text }); } };
  let curTier = 1; // endless: rises every 26 segments
  const PAD = () => ({ 1: ['Ein Hüpf-Kaktus', 'er'], 2: ['Ein Hüpf-Schneeball', 'er'], 7: ['Ein Hüpf-Schneeball', 'er'], 3: ['Eine Lava-Blase', 'sie'], 5: ['Eine Hüpfmuschel', 'sie'], 6: ['Eine Hüpfmuschel', 'sie'] }[th.art == null ? wi : th.art] || ['Ein Hüpfpilz', 'er']);
  const HN = () => ({ 0: ['Ein Hüpf-Frosch', 'Hüpf-Frösche'], 1: ['Eine Wüstenspringmaus', 'Wüstenspringmäuse'], 2: ['Ein Hüpf-Pinguin', 'Hüpf-Pinguine'], 3: ['Ein Magma-Blob', 'Magma-Blobs'], 5: ['Eine Hüpf-Krabbe', 'Hüpf-Krabben'], 7: ['Ein Pfeifhase', 'Pfeifhasen'] }[th.art == null ? wi : th.art] || ['Ein Hüpf-Frosch', 'Hüpf-Frösche']); // names of the hopping enemy per world
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
    // ---- new for everybody: hoppers, spitting plants, meteors, bounce mushrooms, crumbling steps ----
    hopper: x => { firstTip('hopper', x - 1200, HN()[0] + '! Spring drüber, lande auf seinem Kopf – oder brüll ihn weg!'); L.obs.push({ type: 'hopper', x: x + 220, hp: R() * 3 }); return 280; },
    hopper2: x => { firstTip('hopper', x - 1200, HN()[1] + '! Spring drüber oder brüll sie weg!'); L.obs.push({ type: 'hopper', x: x + 200, hp: 0 }); L.obs.push({ type: 'hopper', x: x + 470, hp: 1.3 }); return 520; },
    plant: x => { firstTip('plant', x - 1200, { 1: 'Ein Skorpion! Spring über die Stachel, die er schiesst!', 2: 'Ein böser Schneemann! Spring über die Schneebälle, die er wirft!', 7: 'Ein Yeti! Spring über die Schneebälle, die er wirft!', 3: 'Ein Mini-Vulkan! Spring über die Lavabrocken, die er spuckt!', 5: 'Eine Spuck-Anemone! Spring über die Wasserkugeln, die sie spuckt!' }[th.art == null ? wi : th.art] || 'Eine Spuck-Pflanze! Spring über die Samen, die sie spuckt!'); L.obs.push({ type: 'plant', x: x + 280, shoot: 0.5, pop: 0 }); amberRow(x + 40, 3, GROUND - 120, 50); return 360; },
    meteor: x => { firstTip('meteor', x - 1200, 'Achtung, Meteor! Wo es rot blinkt, schlägt gleich einer ein!'); L.obs.push({ type: 'meteor', x: x + 300, state: 'wait', y: -80, vy: 0 }); return 340; },
    meteors: x => { firstTip('meteor', x - 1200, 'Meteoriten-Regen! Wo es rot blinkt, schlägt gleich einer ein!'); for (let i = 0; i < 3; i++) L.obs.push({ type: 'meteor', x: x + 260 + i * 270, state: 'wait', y: -80, vy: 0 }); return 760; },
    bounce: x => { firstTip('pad', x - 1200, PAD()[0] + '! Lauf drauf – ' + PAD()[1] + ' katapultiert dich hoch!'); L.obs.push({ type: 'pad', x: x + 60, sq: 0 }); amberArc(x + 80, 300, 320); return 400; },
    bounceUp: x => { firstTip('pad', x - 1200, PAD()[0] + '! ' + PAD()[1].replace(/^./, c => c.toUpperCase()) + ' katapultiert dich ganz hoch hinauf!'); L.obs.push({ type: 'pad', x: x + 60, sq: 0 }); const y = GROUND - 250; L.plats.push({ x: x + 190, y, w: 240 }); amberRow(x + 220, 4, y - 45, 45); amberArc(x + 70, 140, 280); return 440; },
    crumble: x => { firstTip('crumble', x - 1200, 'Wackelsteine! Sie fallen gleich runter – hüpf schnell weiter!'); const n = 3 + (curTier >= 3 || dayN > 12 ? 1 : 0), w = 120, gap = 80, tw = n * (w + gap); L.pits.push({ x, w: tw + 20 }); for (let i = 0; i < n; i++) { const y = GROUND - 70 - (i % 2) * 28; L.plats.push({ x: x + 30 + i * (w + gap), y, y0: y, w, crumble: true, t: null }); amberRow(x + 50 + i * (w + gap), 2, y - 45, 45); } return tw + 20; },
    raptor2: x => { L.seen.raptor = 1; L.obs.push({ type: 'raptor', x: x + 60, spd: 140 + wi * 20, ph: 0, alpha: 1 }); L.obs.push({ type: 'raptor', x: x + 420, spd: 200 + wi * 20, ph: 2, alpha: 1 }); return 480; },
    // ---- beach: dash ----
    wall: x => { firstTip('wall', x - 1200, 'Eine hohe Mauer! Drück FLITZ und renn durch!'); L.obs.push({ type: 'wall', x: x + 90, w: 60, h: 250 }); amberRow(x + 150, 4, GROUND - 90, 40); return 170; },
    tide: x => { firstTip('tide', x - 1200, 'Eine Welle! Spring drüber – oder FLITZ hindurch!'); L.obs.push({ type: 'tide', x: x + 420, w: 100, h: 118 }); amberArc(x + 60, 200, 100); return 240; },
    // ---- mountains: glide ----
    widegap: x => { firstTip('widegap', x - 1200, 'Ein breiter Abgrund! Spring und halte gedrückt – dann gleitest du!'); const w = 430 + Math.floor(R() * 70); L.pits.push({ x, w }); amberArc(x - 20, w + 40, 190); return w; },
    updraft: x => { firstTip('updraft', x - 1200, 'Aufwind! Er wirbelt dich hoch in die Luft – halte gedrückt, dann gleitest du weit!'); const w = 400; L.pits.push({ x, w }); L.obs.push({ type: 'updraft', x: x + w / 2, w: 210 }); for (let i = 0; i < 6; i++) L.amb.push({ x: x + w / 2 + Math.sin(i * 1.3) * 40, y: GROUND - 90 - i * 38, got: false }); return w; },
    avalanche: x => { firstTip('avalanche', x - 1200, 'Steinlawine! Spring drüber oder brüll sie kaputt!'); for (let i = 0; i < 2; i++) L.obs.push({ type: 'rollrock', x: x + 110 + i * 270, rot: 0 }); return 440; },
    // ---- underwater: swim ----
    coralgate: x => { const gh = 255, gy = 100 + Math.floor(R() * (GROUND - 100 - gh - 30)); L.obs.push({ type: 'cgate', x: x + 90, gapY: gy, gapH: gh }); for (let i = 0; i < 3; i++) L.amb.push({ x: x + 40 + i * 50, y: gy + gh / 2 + (i - 1) * 12, got: false }); return 190; },
    jellies: x => { firstTip('jelly', x - 1200, 'Quallen! Schwimm drumherum.'); for (let i = 0; i < 3; i++) L.obs.push({ type: 'jelly', x: x + 90 + i * 230, y0: 175 + (i % 2) * 155 + R() * 15, amp: 24 + R() * 16, ph: R() * 6, y: 220 }); return 700; },
    urchins: x => { firstTip('urchin', x - 1200, 'Seeigel am Boden! Schwimm drüber.'); for (let i = 0; i < 3; i++) L.obs.push({ type: 'urchin', x: x + 60 + i * 130 }); for (let i = 0; i < 4; i++) L.amb.push({ x: x + 40 + i * 90, y: 200 + Math.sin(i) * 20, got: false }); return 440; },
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
      L.obs.push({ type: 'cgate', x: 1500, gapY: 150, gapH: 275 }); for (let i = 0; i < 3; i++) L.amb.push({ x: 1440 + i * 50, y: 290, got: false });
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
  const HARD = ['raptor2', 'hopper2', 'plant', 'meteors', 'crumble', 'bounceUp', 'raptor', 'ptero', 'swoop', 'compy', 'geyser', 'geode', 'pitRock', 'lowRock', 'compyRun', 'sword', 'jellies', 'avalanche'], COMBO = ['pitRock', 'lowRock', 'compyRun', 'meteors', 'hopper2', 'raptor2', 'bounceUp'];
  const NEEDS = { low: 'duck', lowRock: 'duck', swoop: 'duck', geode: 'stomp', wall: 'dash', widegap: 'glide', updraft: 'glide' };
  const pickPattern = () => { let pool = th.patterns.filter(k => !NEEDS[k] || SK[NEEDS[k]]); const tier = endless ? curTier : (LV ? Math.min(LV.maxTier, 1 + Math.floor(segI * 3 / n)) : 3); const easy = pool.filter(k => !HARD.includes(k)), mid = pool.filter(k => !COMBO.includes(k)); if (tier === 1 && easy.length) pool = easy.filter(k => k !== 'amber').length ? easy.filter(k => k !== 'amber') : easy; else if (tier === 2 && mid.length) pool = mid; return pool[Math.floor(R() * pool.length)]; };
  // a smash-with-roar obstacle needs the roar to charge again (3 s): never put two of them closer than that allows
  const ROAR = ['boulder', 'rockwall'], ROARGAP = 3 * L.speed * 1.15 + 80;
  const placeSeg = x0 => {
    let pk = pickPattern();
    if (ROAR.includes(pk)) { let last = -1e9; for (const o of L.obs) if (o.type === 'boulder' && o.x < x0 + 200) last = Math.max(last, o.x); if (x0 + 60 - last < ROARGAP) { for (let t = 0; t < 12 && ROAR.includes(pk); t++) pk = pickPattern(); if (ROAR.includes(pk)) pk = th.patterns.find(k => !ROAR.includes(k) && (!NEEDS[k] || SK[NEEDS[k]])) || 'amber'; } }
    return P[pk](x0);
  };
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
      w = placeSeg(x);
      if (endless && curTier >= 4 && R() < 0.4) { x += w + 170; w = placeSeg(x); } // doubled-up dangers
    }
    x += w + (260 + R() * 200) * (endless ? Math.max(0.6, 1 - 0.07 * (curTier - 1)) : (LV ? 0.82 + 0.1 * Math.min(1, (dayN - 1) / 12) : 1));
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
let scene = 'splash', G = null, fadeT = 0, flashT = 0; // the game opens on a tap-to-start splash: browsers only allow sound after the first touch
function go(s) {
  if (s === 'tmap') tmapT = 0;
  settingsOpen = false;
  if (scene === 'shop' && s !== 'shop' && save.newGifts.length) { save.newGifts = []; writeSave(); }
  scene = s; shopConfirm = null; wishShow = -1; endlessPick = false; doorOverlay = null; parentMode = false; titlePress = 0; fadeT = 1; if (s === 'shop') { shopTab = 0; shopPage = 0; shopSel = save.equip.skin; shopTalk = { t: 4, text: 'Willkommen! Such dir etwas aus.' }; } parts = []; dialog = null; toasts = [];
  if (s === 'map' && save.masterNew && save.treasureNew < 0 && !save.afterNew) { save.masterNew = 0; writeSave(); mapFW = 9; SFX.right(); startDialog([
    { who: 'goetti', text: 'Unglaublich, {oli} und {fabio}! Alle 72 Medaillen! Ihr seid die grössten Dino-Meister der Welt!' },
    { who: 'fabio', text: 'Wir sind Meister! Wir sind Meister!' },
    { who: 'mami', text: 'Wir sind so stolz auf euch zwei!' },
    { who: 'papi', text: 'Und {rex} strahlt wie Gold!' },
    { who: 'goetti', text: 'Dafür habe ich etwas ganz Besonderes: den Dino-Meister-Anzug und die Meister-Krone. {rex} trägt sie schon – im Laden kannst du sie jederzeit wechseln!' },
  ]); }
  if (s === 'map' && save.afterNew > 0 && save.treasureNew < 0) { const d = save.afterNew; save.afterNew = 0; writeSave(); startDialog(DAY_AFTER[d] || [], () => { if (d === 6 || d === 12 || d === 18) { tmapNew = d / 6 - 1; go('tmap'); } }); }
  if (s === 'map' && save.treasureNew >= 0) { const k = save.treasureNew; save.treasureNew = -1; writeSave(); chestPop[k] = 1; startDialog([{ who: k === 3 ? 'kiwi' : 'goetti', text: k === 3 ? 'Kiwi! Kiwi! (Kiwi hüpft vor Freude.)' : TREASURES[k].line }].concat(k === 3 ? [{ who: 'goetti', text: TREASURES[3].line }] : []), () => { if (chestFull() && !save.chestSeen) { save.chestSeen = 1; writeSave(); startDialog([{ who: 'goetti', text: 'Meine Schatzkiste ist wieder voll! Gitarre, Velo, Angel und Kiwi – danke, ihr zwei!' }, { who: 'kiwi', text: 'Kiwi! Kiwi! (Kiwi macht einen Freudentanz.)' }], () => chestParty()); } }); }
}

function startLevel(arg, endless) { // endless: arg = theme index. otherwise arg = calendar level index 0..23
  go('play');
  const LV = endless ? null : LEVELS[arg], wi = endless ? arg : LV.wi;
  const L = buildLevel(wi, !!endless, LV);
  G = { L, wi, li: endless ? -1 : arg, sk: skillsFor(endless ? null : arg, wi), cam: 0, t: 0, startT: 1.6, stopped: false, overlay: null, shake: 0, tip: null, eggsGot: [false, false, false], amber: 0,
    p: { wx: 200, y: GROUND, vy: 0, onGround: true, jumps: 0, coyote: 0, inv: 0, roarT: 0, roarCd: 0, hearts: endless ? 3 : MAX_HEARTS, ph: 0, duck: false, stomp: false, spin: 1, fireT: 0, fireCd: 0, breathT: 0, roarMax: 3 },
    duckHeld: null, fireballs: [], flames: [],
    chili: { wx: 95, y: GROUND, ph: 0, dig: null, digT: 0 }, cp: 200, rings: [],
    boss: null, bossStarted: false, golden: null, gotGolden: false, atGate: false, gateT: 0, gateOpening: false, gateOpen: 0, finished: false,
    coach: null, flyEggs: [], slotPop: [0, 0, 0], hitFlash: 0, endless: !!endless, maxH: endless ? 3 : MAX_HEARTS, score: 0, heartAt: 500, tier: 1 };
  if (!endless) { G.chiliSay = { text: fmt('Los geht\'s, ihr zwei!'), t: 2.6 }; G.chiliCd = 4; }
  if (endless) { G.tip = { text: 'Endlos-Lauf! Es wird immer schneller und gefährlicher. Alle 500 Punkte gibt es ein Herz zurück.', t: 5 }; G.startT = 1.2; }
}

const pick = a => a[Math.floor(Math.random() * a.length)];
function chiliSay(text, force, mood) { // short speech bubble from Chili, rate-limited so it never nags
  text = fmt(text); if (!G || G.endless) return; if (!force && G.chiliCd > 0) return;
  G.chiliSay = { text, t: 2.6 }; G.chiliCd = 6; SFX.chirp(mood);
}
function cheer() { // the first time a new move works: a small celebration
  const p = G.p; SFX.right(); burst(p.wx + 20, p.y - 100, 30, ['#ffd740', '#fff', '#69f0ae', '#40c4ff', '#ff8a9a'], 380, 500, 7, 1);
  G.rings.push({ x: p.wx + 20, y: p.y - 90, r: 12, a: 1, c: '255,230,120' }); toast(pick(['Super!', 'Toll gemacht!', 'Genau so!', 'Perfekt!']), '#ffe08a'); chiliSay(pick(['Juhu, {oli}!', 'Das war klasse!']), true);
}
function jump() {
  const p = G.p; if (G.startT > 0.3) return;
  let learned = false; if (G.coach) { if (G.coach.type !== 'jump' && G.coach.type !== 'glide') return; learned = true; G.coach = null; }
  if (learned) setTimeout(() => { if (G && scene === 'play') cheer(); }, 260);
  if (G.L.swim) { p.vy = -380; p.jumps = 0; p.onGround = false; p.anti = 0.05; SFX.jump2(); SFX.bubble(); burst(p.wx + 10, p.y - 40, 5, ['#e8ffff', '#fff'], 90, -60, 5, 0.6); return; }
  if (p.onGround || p.coyote > 0) { p.anti = 0.09; p.vy = -900; p.jumps = 1; p.coyote = 0; p.onGround = false; SFX.jump(); burst(p.wx, GROUND, 6, ['#d8c3a5', '#b39b7a'], 120, 300, 5, 0.4); }
  else if (p.jumps < 2) { p.vy = -760; p.jumps = 2; SFX.jump2(); G.rings.push({ x: p.wx, y: p.y, r: 10, a: 0.8, c: '255,255,255' }); }
}
function duckDown(id) {
  if (!G || scene !== 'play' || G.overlay || !G.sk.duck) return;
  const p = G.p; G.duckHeld = id;
  if (G.coach) { if (G.coach.type !== 'duck' && G.coach.type !== 'stomp') return; G.coach = null; setTimeout(() => { if (G && scene === 'play') cheer(); }, 260); }
  if (G.startT > 0.3) return;
  if (!p.onGround && !p.stomp && G.sk.stomp && !G.L.swim) { p.stomp = true; p.spin = 0; p.vy = Math.min(p.vy, -380); tone(300, 0.3, 'triangle', 0.08, 900); }
  else if (p.onGround) SFX.duck();
}
function dash() {
  const p = G.p; if (!G || scene !== 'play' || G.overlay || !G.sk.dash || G.L.swim || p.dashCd > 0 || G.startT > 0.3) return;
  if (G.coach) { if (G.coach.type !== 'dash') return; G.coach = null; setTimeout(() => { if (G && scene === 'play') cheer(); }, 260); }
  p.dashT = 0.4; p.dashCd = 1.7; SFX.dash(); G.rings.push({ x: p.wx + 20, y: p.y - 60, r: 12, a: 0.9, c: '255,255,255' });
}
function dashBreak(o) { // the dash smashes obstacles and sends enemies flying
  const th = WORLDS[G.wi];
  if (o.type === 'raptor' || o.type === 'ptero' || o.type === 'compy' || o.type === 'sword' || o.type === 'hopper') { if (!o.scared) { o.scared = true; o.vx = 520; o.vy = -380; SFX.smash(); } return; }
  o.dead = true; panAt(o.x, SFX.smash); burst(o.x, GROUND - (o.h || 60) / 2, 26, o.type === 'wall' && G.wi === 5 ? ['#f0dca0', '#d8b878', '#fff'] : [th.rock, '#5a4a3a', '#a89888'], 460, 1200, 9, 0.9);
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
  o.dead = true; panAt(o.x, SFX.smash); setTimeout(SFX.amber, 120);
  burst(o.x, GROUND - 20, 26, ['#8a8a92', '#ffd166', '#ff9f1c', '#fff'], 420, 1100, 8, 0.9);
  for (let i = 0; i < 6; i++) G.L.amb.push({ x: o.x + 30 + i * 34, y: GROUND - 70 - Math.sin(i / 5 * Math.PI) * 70, got: false });
  toast('Bernstein-Schatz!', '#ffd166');
}
function squashCompy(o, bounce) {
  o.flat = 1.1; panAt(o.x, SFX.boing); burst(o.x, GROUND - 14, 10, ['#d8e85a', '#fff'], 220, 600, 6, 0.5);
  G.L.amb.push({ x: G.stopped ? G.p.wx + 10 : o.x + 60, y: GROUND - 110, got: false });
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
    } else if (o.type === 'raptor' || o.type === 'ptero' || o.type === 'sword' || o.type === 'hopper') { o.scared = true; o.vx = 380; o.vy = -320; }
    else if (o.type === 'plant') { o.dead = true; SFX.smash(); burst(o.x, GROUND - 30, 20, ['#5fbf4a', '#2f7a2c', '#fff'], 360, 700, 8, 0.8); }
    else if (o.type === 'compy' && d < 300 && !G.compyHint) { G.compyHint = true; toast('Kompsis sind zu frech – spring drauf!', '#ffe08a'); }
  }
}
function hurt(force) {
  const p = G.p; if (!force && (p.inv > 0 || p.dashT > 0)) return;
  if (!force && G.shield) { G.shield = false; p.inv = 1.2; SFX.smash(); G.rings.push({ x: p.wx, y: p.y - 70, r: 30, a: 1, c: '150,220,255' }); burst(p.wx, p.y - 70, 24, ['#bfe9ff', '#fff', '#7fd0ff'], 320, 200, 6, 0.8); toast('Der Schutzschild hat dich gerettet!', '#9fd3ff'); return; }
  p.hearts--; p.hitT = 0.45; G.hits = (G.hits || 0) + 1; p.inv = 1.8; SFX.hurt(); if (p.hearts === 1) setTimeout(SFX.lowHeart, 350); G.shake = p.hearts <= 0 ? 0 : 0.35; G.hitFlash = 0.45;
  try { if (navigator.vibrate) navigator.vibrate(180); } catch (e) {}
  if (!force) p.vy = Math.min(p.vy, -450);
  chiliSay(pick(['Aua! Nicht aufgeben!', 'Weiter geht\'s, ihr zwei!', 'Du schaffst das!']), true, 'worried');
  if (p.hearts <= 0) { if (G.endless) endRun(); else { G.overlay = { type: 'retry' }; setTimeout(SFX.lose, 250); } }
}
function endRun() {
  G.score = Math.max(G.score, Math.floor((G.p.wx - 200) / 25) + G.amber * 3);
  const prev = G.daily ? (save.dailyBest || 0) : (save.best[G.wi] || 0), isNew = G.score > prev;
  if (isNew) { if (G.daily) save.dailyBest = G.score; else save.best[G.wi] = G.score; } save.amber += G.amber;
  let bonus = 0; if (G.daily && save.dailyLast !== dayKey()) { save.dailyStreak = save.dailyLast === prevDayKey() ? save.dailyStreak + 1 : 1; save.dailyLast = dayKey(); bonus = 20; save.amber += bonus; }
  writeSave();
  G.overlay = { type: 'endover', isNew, prev, t: 0, bonus, streak: G.daily ? save.dailyStreak : 0 }; SFX.wrong(); if (isNew) setTimeout(SFX.right, 350);
  const wi = G.daily ? 8 : G.wi, sc = G.score; if (G.daily) dailyRefresh();
  if (boardQualifies(wi, sc)) setTimeout(() => {
    if (!G || !G.overlay || G.overlay.type !== 'endover') return;
    askName('In der Bestenliste! Wie heisst du?', save.nick || save.oliName || 'Oli', name => { const r = boardAdd(wi, cleanNick(name).name, sc); if (G && G.overlay && G.overlay.type === 'endover') G.overlay.rank = r; SFX.right(); }, v => { const c = cleanNick(v); return c.ok ? '' : c.msg; });
  }, 1300);
}
function resetCrumble(L) { for (const pl of L.plats) if (pl.crumble) { pl.gone = false; pl.t = null; pl.y = pl.y0; pl.fv = 0; } }
function safeSpawn(x) { // never respawn in or right next to a pit: step back until there is room to run
  const L = G.L, bad = q => L.pits.some(p => q + 450 > p.x && q - 120 < p.x + p.w); let g = 0;
  while (bad(x) && g++ < 120) x -= 40; return Math.max(x, 100);
}
function pitFall() {
  const p = G.p, L = G.L;
  const pit = L.pits.find(q => p.wx > q.x - 60 && p.wx < q.x + q.w + 60);
  let nx = pit ? pit.x - 480 : p.wx - 480, guard = 0;
  while (!supported(L, nx) && guard++ < 30) nx -= 40;
  nx = safeSpawn(nx);
  p.wx = nx; p.y = GROUND; p.vy = 0; G.chili.wx = nx - 145; G.startT = 1.4;
  resetCrumble(L); hurt(true); p.inv = 3;
}
function retry() {
  for (const k in mus.saved) if (isBossKey(k)) delete mus.saved[k]; // every boss attempt starts the theme from the top
  if (isBossKey(mus.key)) mus.key = null;
  const p = G.p, L = G.L;
  const fk = G.bossStarted ? 'b' + (G.bossCp || 0) : String(G.cp); G.fails = G.fails || {}; G.fails[fk] = (G.fails[fk] || 0) + 1;
  if (G.fails[fk] >= 2 && !G.endless && !G.shield) { G.shield = true; G.fails[fk] = 0; setTimeout(() => { if (G && scene === 'play') toast('Chili schenkt dir einen Schutzschild!', '#9fd3ff'); }, 700); }
  G.overlay = null; p.hearts = G.maxH; p.inv = 2; p.wx = G.bossStarted ? G.cp : safeSpawn(G.cp); p.y = GROUND; p.vy = 0; p.roarCd = 0; p.stomp = false; p.spin = 1; G.duckHeld = null; G.fireballs = []; G.flames = [];
  G.chili.wx = p.wx - 145; G.chili.dig = null; resetCrumble(L);
  for (const s of L.spots) if (s.state === 'dig') s.state = 'idle';
  for (const o of L.obs) if ((o.type === 'raptor' || o.type === 'ptero' || o.type === 'compy' || o.type === 'hopper' || o.type === 'seed') && o.x > G.cp - 300 && o.x < G.cp + 700) o.dead = true;
  if (G.bossStarted && !G.golden && !G.bossDone) { p.wx = L.bossX; G.chili.wx = p.wx - 90; G.boss = newBoss(G.bossCp || 0); G.stopped = true; for (const o of L.obs) if (o.minion) o.dead = true; if (G.boss.phase > 0) startBossPhase(G.boss); }
  G.startT = 0.9;
}
const BOSS_KINDS = {
  king: { name: 'Krallenkönig', duel: true, minions: ['raptor', 'compy', 'compy', 'compy'], phases: [
    { name: 'Sturmangriff', type: 'charge', say: 'Er stürmt los! Brülle genau dann, wenn er ganz nah ist!' },
    { name: 'Felsenhagel', type: 'volley', say: 'Felsen! Weich aus – und brüll, wenn er erschöpft ist!' },
    { name: 'Das Rudel', type: 'summon', say: 'Er ruft sein Rudel! Spring drauf, brüll sie weg – dann kommt er selbst!' },
    { name: 'Vulkanwut', type: 'leap', say: 'Die Lava kocht! Spring, wenn der Boden glüht!' }] },
  crab: { name: 'Krabbenkönig', duel: false, minions: ['crab', 'crab', 'crab', 'crab', 'crab'], phases: [
    { name: 'Kokosnuss-Hagel', type: 'volley', say: 'Kokosnüsse! Spring drüber – und brüll, wenn er erschöpft ist!' },
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
function bossBanner(text, sub, col = '#ffd34d') { G.banner = { t: 2.0, text, sub, col }; }
function startBossPhase(b) {
  const ph = bossKind(b).phases[b.phase]; b.hp = 3; b.state = 'taunt'; b.t = 0; b.n = 0; b.rocks = []; b.hazards = []; G.bossCp = b.phase;
  bossBanner(`PHASE ${b.phase + 1}`, ph.name, b.phase === bossKind(b).phases.length - 1 && b.kind === 'king' ? '#ff6a3a' : '#ffd34d'); SFX.roar(); G.shake = Math.max(G.shake, 0.5);
  G.tip = { text: ph.say, t: 4 };
}
function bossHurt(b, bx) { // a successful roar: flash, shake, count down this phase's hp
  const p = G.p, K = bossKind(b); p.roarT = 0; b.hp--; b.flash = 0.5; panAt(b.x, SFX.smash); G.shake = 0.5; G.hitFlash = 0;
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
  G.chili.joy = 0.9; chiliSay('Ein Ei! Ich hab es gerochen!', true);
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
  if (DAY_AFTER[lv.day] && !wasDone) save.afterNew = lv.day;
  if (!save.master && medalTotal() >= 72) { save.master = 1; save.masterNew = 1; const si = SKINS.findIndex(x => x.gift === 25), hi = HATS.findIndex(x => x.gift === 25); if (!save.owned.skin.includes(si)) save.owned.skin.push(si); if (!save.owned.hat.includes(hi)) save.owned.hat.push(hi); save.equip.skin = si; save.equip.hat = hi; save.newGifts.push('skin:' + si, 'hat:' + hi); }
  save.amber += G.amber; writeSave();
  G.overlay = { type: 'complete', t: 0, popped: [], cpopped: [] }; SFX.victory(!!lv.boss);
}

function updatePlay(dt) {
  const L = G.L, p = G.p, th = WORLDS[G.wi];
  for (const r of G.rings) { r.r += 500 * dt; r.a -= dt * 1.8; } G.rings = G.rings.filter(r => r.a > 0);
  G.shake = Math.max(0, G.shake - dt * (G.overlay ? 4 : 1));
  if (G.overlay) return;
  for (const c of L.coach) if (!c.done && p.wx >= c.x) { c.done = true; G.coach = c; }
  if (G.coach) return; // freeze-frame until Oli does the move
  if (G.freeze > 0) { G.freeze -= dt; return; }
  if (G.chiliSay) { G.chiliSay.t -= dt; if (G.chiliSay.t <= 0) G.chiliSay = null; } if (G.chiliCd > 0) G.chiliCd -= dt;
  G.t += dt; if (G.slowT > 0) { G.slowT -= dt; dt *= 0.3; } if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  if (G.tip) { G.tip.t -= dt; if (G.tip.t <= 0) G.tip = null; }
  if (G.startT > 0) G.startT -= dt;
  let spd = (G.startT > 0 || G.stopped) ? 0 : L.speed * (L.endless ? 1 + clamp((p.wx - 200) / 50000, 0, 0.7) : 1 + 0.1 * clamp(p.wx / L.gateX, 0, 1));
  if (p.y > GROUND + 5) spd = 0;
  p.dashCd = Math.max(0, (p.dashCd || 0) - dt); if (p.dashT > 0) { p.dashT -= dt; spd *= 2.4; if (Math.random() < 0.7) burst(p.wx - 20, p.y - 20 - Math.random() * 60, 1, ['#fff', '#ffe08a'], 80, -40, 5, 0.35); }
  if (G.stopped && G.bossStarted) { const off = p.dashT > 0 ? Math.sin(Math.PI * (1 - p.dashT / 0.4)) * 240 : 0; p.wx += off - (p.lungeOff || 0); p.lungeOff = off; } else p.lungeOff = 0; // in a boss fight FLITZ lunges forward and back
  const wasGliding = p.gliding; p.gliding = !!(G.sk.glide && !L.swim && G.holdJump != null && !p.onGround && !p.stomp && p.vy > 40); if (p.gliding && !wasGliding) SFX.whoosh();
  p.wx += spd * dt; p.ph += dt * (spd > 0 ? 13 : 2);
  // physics
  for (const pl of L.plats) if (pl.crumble) { if (pl.t != null && !pl.gone) { pl.t -= dt; if (pl.t <= 0) { pl.gone = true; pl.fv = 0; burst(pl.x + pl.w / 2, pl.y, 14, ['#b8a58a', '#7a6a58', '#fff'], 220, 300, 7, 0.7); } } if (pl.gone) { pl.fv += 2200 * dt; pl.y += pl.fv * dt; } }
  const prevY = p.y, wasGround = p.onGround, vy0 = p.vy; p.vy += (L.swim ? 520 : p.dashT > 0 ? GRAV * 0.25 : GRAV) * dt; if (L.swim) { if (G.duckHeld != null) p.vy += 1700 * dt; p.vy = clamp(p.vy, -430, 400); if (Math.random() < 0.05) burst(p.wx + 40, p.y - 80, 1, ['#dff'], 40, -120, 6, 0.8); } if (p.gliding) p.vy = Math.min(p.vy, 140); if (p.stomp) { if (p.spin < 1) { p.spin = Math.min(1, p.spin + dt / 0.36); p.vy = Math.min(p.vy, 120); if (p.spin >= 1) { p.vy = 1500; SFX.duck(); } } else p.vy = Math.max(p.vy, 1500); } p.y += p.vy * dt; p.onGround = false;
  if (L.swim && p.y < 175) { p.y = 175; p.vy = Math.max(0, p.vy); }
  if (p.vy >= 0) {
    for (const pl of L.plats) if (!pl.gone && p.wx + 25 > pl.x && p.wx - 25 < pl.x + pl.w && prevY <= pl.y + 1 && p.y >= pl.y) { p.y = pl.y; p.vy = 0; p.onGround = true; if (pl.crumble && pl.t == null) { pl.t = 0.5; SFX.crack(); } break; }
    if (!p.onGround && supported(L, p.wx) && prevY <= GROUND + 4 && p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
  }
  if (p.onGround && !wasGround && vy0 > 250) { p.land = 0.16; SFX.land(vy0); if (vy0 > 400 && !p.stomp) burst(p.wx, p.y, 9, ['#d8c3a5', '#b39b7a', '#fff'], 150, 260, 5, 0.45); }
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
  for (const h of L.hearts) if (!h.got) { const mx = p.wx + 10 - h.x, my = p.y - 50 - h.y; if (Math.abs(mx) < 170 && Math.abs(my) < 150) { h.x += mx * Math.min(1, dt * 5); h.y += my * Math.min(1, dt * 3); } } // hearts are drawn to Rex
  for (const h of L.hearts) if (!h.got && Math.abs(h.x - p.wx - 10) < 60 && Math.abs(h.y - (p.y - 50)) < 80) {
    h.got = true; SFX.heart(); burst(h.x, h.y, 26, ['#ff5a7a', '#ffb4c4', '#fff'], 320, 300, 7, 0.9);
    if (p.hearts < G.maxH) { p.hearts++; toast('Ein Herz zurück!', '#ff8a9a'); } else { G.amber += 5; toast('Alle Herzen voll – 5 Bernstein extra!', '#ffe08a'); }
  }
  if (G.stopped && G.bossStarted) for (const a of L.amb.concat(L.hearts)) if (!a.got && a.x > p.wx + 10) a.x = Math.max(p.wx + 10, a.x - 240 * dt); if (G.stopped && G.bossStarted) for (const a of L.amb) if (!a.got && Math.abs(a.x - p.wx - 10) < 90) a.y += (clamp(a.y, GROUND - 150, GROUND - 40) - a.y) * Math.min(1, dt * 6);
  for (const f of G.fireballs) {
    f.x += f.vx * dt; f.y = Math.min(GROUND - 38, f.y + f.vy * dt); f.life -= dt;
    for (let k = 0; k < 2; k++) { const l = 0.2 + Math.random() * 0.2; G.flames.push({ x: f.x - 8, y: f.y + (Math.random() - 0.5) * 14, vx: 120 + Math.random() * 120, vy: -60 - Math.random() * 60, life: l, max: l, r: 6 + Math.random() * 6 }); }
    for (const o of L.obs) {
      if (o.dead || o.scared || o.flat || f.life <= 0) continue;
      const dx = o.x - f.x; let hit = false;
      if (o.type === 'low') hit = Math.abs(dx) < o.w / 2 + 20;
      else if (o.type === 'ptero') hit = Math.abs(dx) < 40 && Math.abs(o.y - f.y) < 60;
      else if (o.type !== 'geyser' && o.type !== 'pad' && !(o.type === 'icicle' && o.state === 'hang')) hit = Math.abs(dx) < 40;
      if (!hit) continue;
      f.life = 0; burst(f.x, f.y, 18, ['#ffb030', '#ff5a1f', '#fff3a0', '#555'], 300, 400, 8, 0.7);
      if (o.type === 'raptor' || o.type === 'ptero' || o.type === 'compy' || o.type === 'hopper') { o.scared = true; o.vx = 420; o.vy = -360; }
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
  G.cam = p.wx - (p.lungeOff || 0) - 270;
  if (G.endless) { let tr = 1; for (const tx of L.tierX) if (p.wx >= tx) tr++; if (tr > G.tier) { G.tier = tr; SFX.power(); G.shake = Math.max(G.shake, 0.3); toast(['', '', 'Stufe 2 – mehr Gegner!', 'Stufe 3 – neue Gefahren!', 'Stufe 4 – doppelte Gefahren!'][tr] || `Stufe ${tr} – nur für Profis!`, '#ff9a5a'); }
    G.score = Math.max(G.score, Math.floor((p.wx - 200) / 25) + G.amber * 3); if (G.score >= G.heartAt) { G.heartAt += 500; if (p.hearts < G.maxH) { p.hearts++; SFX.heart(); toast('Ein Herz zurück!', '#ff8a9a'); } else toast(G.score + ' Punkte!', '#ffe08a'); } }
  // tips, checkpoints
  for (const t of L.tips) if (!t.shown && p.wx >= t.x) { t.shown = true; G.tip = { text: t.text, t: 6.5 }; }
  for (const c of L.cps) if (!c.on && p.wx >= c.x) { c.on = true; G.cp = c.x; SFX.flag(); chiliSay(pick(['Fähnchen! Weiter so!', 'Pfoten hoch, ihr zwei!', 'Prima, das war stark!'])); if (p.hearts < G.maxH) { p.hearts++; toast('Fähnchen erreicht – ein Herz zurück!', '#ff8a9a'); } else toast('Fähnchen erreicht!', '#ffe08a'); }
  // amber
  for (const a of L.amb) if (!a.got && Math.abs(a.x - p.wx - 10) < 42 && Math.abs(a.y - (p.y - 50)) < 62) { a.got = true; G.amber++; G.combo = G.t - (G.lastAmb || -9) < 0.6 ? Math.min(G.combo + 1, 8) : 0; G.lastAmb = G.t; SFX.amberNote(G.combo); burst(a.x, a.y, 6, ['#ffd166', '#ff9f1c'], 150, 200, 4, 0.4); }
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
  let target = p.wx - 145;
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
        if (d < 760 || o.minion) { o.x -= o.spd * dt; o.ph += dt * (o.type === 'ptero' ? 9 : o.type === 'compy' ? 20 : 15); }
        if (o.type === 'compy') {
          hb = { x: o.x - 20, y: GROUND - 46, w: 40, h: 44 };
          if (p.inv <= 0 && overlap(pb, hb) && p.vy > 0 && p.y <= hb.y + 30) { squashCompy(o, true); hb = null; }
          break;
        }
        if (o.type === 'ptero') { o.y = o.baseY + Math.sin(T * 4 + o.x * 0.01) * 8; hb = { x: o.x - 28, y: o.y - 14, w: 56, h: 26 }; }
        else hb = { x: o.x - 26, y: GROUND - 62, w: 52, h: 60 };
        break;
      case 'hopper':
        if (o.flat) { o.flat -= dt; if (o.flat <= 0) { o.flat = 0; o.scared = true; o.vx = 300; o.vy = -300; } break; }
        if (o.scared) { o.x += o.vx * dt; o.vy += 900 * dt; o.yOff = (o.yOff || 0) + o.vy * dt; o.alpha = (o.alpha == null ? 1 : o.alpha) - dt * 1.3; if (o.alpha <= 0) o.dead = true; break; }
        if (d < 800) { o.x -= 95 * dt; o.hp += dt; }
        o.hy = 120 * Math.abs(Math.sin(o.hp * 3.3));
        hb = { x: o.x - 22, y: GROUND - 46 - o.hy, w: 44, h: 44 };
        if (p.inv <= 0 && overlap(pb, hb) && p.vy > 0 && p.y <= hb.y + 28) { o.flat = 0.9; panAt(o.x, SFX.boing); burst(o.x, GROUND - o.hy - 20, 10, ['#9be26a', '#fff'], 220, 600, 6, 0.5); L.amb.push({ x: o.x + 60, y: GROUND - 110, got: false }); p.vy = -720; p.jumps = 1; p.stomp = false; p.spin = 1; hb = null; }
        break;
      case 'plant':
        if (d < 680 && d > -50) { o.shoot -= dt; if (o.shoot <= 0) { o.shoot = 1.55; o.pop = 0.3; L.obs.push({ type: 'seed', x: o.x - 28, y: GROUND - 30, rot: 0 }); SFX.boing(); } }
        o.pop = Math.max(0, (o.pop || 0) - dt); hb = { x: o.x - 20, y: GROUND - 54, w: 40, h: 54 }; break;
      case 'seed': o.x -= 330 * dt; o.rot = (o.rot || 0) - dt * 14; hb = { x: o.x - 12, y: o.y - 12, w: 24, h: 24 }; if (o.x < p.wx - 500) o.dead = true; break;
      case 'meteor':
        if (o.state === 'wait' && d < 440) { o.state = 'fall'; o.vy = 200; SFX.crack(); }
        if (o.state === 'fall') { o.vy += 2600 * dt; o.y += o.vy * dt; hb = { x: o.x - 26, y: o.y - 26, w: 52, h: 52 }; if (o.y >= GROUND - 26) { o.y = GROUND - 26; o.state = 'stuck'; SFX.smash(); G.shake = Math.max(G.shake, 0.4); burst(o.x, GROUND - 10, 26, ['#ffb030', '#ff5a1f', '#fff3a0', '#555'], 380, 600, 8, 0.8); } }
        else if (o.state === 'stuck') hb = { x: o.x - 26, y: GROUND - 46, w: 52, h: 46 };
        break;
      case 'pad':
        o.sq = Math.max(0, (o.sq || 0) - dt);
        if (Math.abs(p.wx + 10 - o.x) < 46 && p.vy >= 0 && p.y >= GROUND - 22 && o.sq <= 0) { o.sq = 0.35; p.vy = -1250; p.y = GROUND - 4; p.onGround = false; p.jumps = 1; p.coyote = 0; SFX.boing(); burst(o.x, GROUND - 20, 16, ['#ff6a6a', '#fff', '#ffd34d'], 260, 500, 7, 0.6); }
        break;
      case 'wall': hb = { x: o.x - o.w / 2, y: GROUND - o.h, w: o.w, h: o.h }; break;
      case 'tide': if (d < 720) o.moving = true; if (o.moving) o.x -= 210 * dt; hb = { x: o.x - 70, y: GROUND - 118, w: 110, h: 118 }; break;
      case 'rollrock': if (d < 760 || o.minion) { o.x -= 250 * dt; o.rot = (o.rot || 0) - dt * 7; } hb = { x: o.x - 30, y: GROUND - 64, w: 60, h: 64 }; break;
      case 'urchin': hb = { x: o.x - 17, y: GROUND - 38, w: 34, h: 38 }; break;
      case 'jelly': if (o.minion && o.spd) o.x -= o.spd * dt; o.y = o.y0 + Math.sin(T * 2 + o.ph) * o.amp; hb = { x: o.x - 22, y: o.y - 24, w: 44, h: 48 }; break;
      case 'sword':
        if (o.scared) { o.x += o.vx * dt; o.vy += 600 * dt; o.y += o.vy * dt; o.alpha -= dt * 1.2; if (o.alpha <= 0) o.dead = true; break; }
        if (d < 800 || o.minion) o.x -= o.spd * dt; hb = { x: o.x - 40, y: o.y - 12, w: 80, h: 24 }; break;
      case 'cgate': { const r1 = { x: o.x - 30, y: -30, w: 60, h: o.gapY + 30 }, r2 = { x: o.x - 30, y: o.gapY + o.gapH, w: 60, h: GROUND - (o.gapY + o.gapH) + 20 }; if (p.inv <= 0 && overlap(pb, r1) || p.inv <= 0 && overlap(pb, r2)) hurt(); break; }
      case 'updraft': if (Math.abs(o.x - p.wx) < o.w / 2 && !p.onGround) { p.vy -= (p.gliding ? 5600 : 4200) * dt; p.vy = Math.max(p.vy, p.gliding ? -760 : -980); if (p.y < 230) p.vy = Math.max(p.vy, 0); p.land = 0; for (let i = 0; i < 2; i++) if (Math.random() < 0.8) burst(o.x + (Math.random() - 0.5) * o.w, GROUND - Math.random() * 260, 1, ['#fff', '#cfe8ff', '#e8f4ff'], 80, -520, 6, 0.8); } break;
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
    G.bossStarted = true; if (!G.shield) { G.shield = true; setTimeout(() => { if (G && scene === 'play') toast('Chili schenkt dir einen Schutzschild!', '#9fd3ff'); }, 900); } G.stopped = true; p.wx = L.bossX; G.cp = L.bossX; G.boss = newBoss(0); G.bossCp = 0; bossBanner(bossKind(G.boss).name, 'taucht auf!', '#ff6a3a'); SFX.roar(); G.shake = Math.max(G.shake, 0.4);
    { const K = bossKind(G.boss), n = K.phases.length, w = ['', '', 'zwei', 'drei', 'vier'][n], pr = G.boss.kind === 'queen' ? 'sie' : 'ihn'; G.tip = { text: G.boss.kind === 'king' ? 'Der Krallenkönig hat das goldene Ei geklaut – hol es zurück! Besiege ihn in vier Runden.' : `${K.name} hält ein Stück der Schatzkarte! Besiege ${pr} in ${w} Runden.`, t: 6 }; }
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
    else if (h.kind === 'erupt') { if (h.t > h.warn && !h.fired) { h.fired = true; SFX.crack(); noise(0.5, 0.3, 700); } if (h.fired && h.t < h.warn + 0.3) { if (Math.random() < 0.8) burst(h.x, GROUND - 160 * Math.random(), 1, ['#ffcf3a', '#ff6a00'], 200, 600, 7, 0.6); if (p.inv <= 0 && overlap(pb, { x: h.x - 26, y: GROUND - 50, w: 52, h: 50 })) { hurt(); } } if (h.t > h.warn + 0.3) h.dead = true; }
    else if (h.kind === 'lane') { if (h.t > h.warn && !h.fired) { h.fired = true; SFX.crack(); noise(0.4, 0.3, 900); G.shake = Math.max(G.shake, 0.3); } if (h.fired && h.t < h.warn + 0.5 && p.inv <= 0 && overlap(pb, { x: p.wx - 200, y: h.y - 44, w: 900, h: 88 })) hurt(); if (h.t > h.warn + 0.5) h.dead = true; }
  }
  b.hazards = b.hazards.filter(h => !h.dead);
  const goBack = () => { b.state = 'back'; b.t = 0; };
  const projY = lane => swim ? GROUND - 30 - lane * 95 : (lane ? GROUND - 95 : GROUND - 22);
  const mkMinion = (k, i) => {
    const x = Math.max(b.x, home) - 50 - i * (k === 'compy' || k === 'crab' ? 235 : k === 'raptor' ? 300 : 200);
    if (k === 'crab') return { type: 'compy', crab: true, x, spd: 175 + (3 - b.hp) * 12, ph: i, alpha: 1, minion: true };
    if (k === 'sword') return { type: 'sword', x, y: GROUND - 60 - Math.random() * 230, spd: 300, ph: 0, alpha: 1, minion: true };
    if (k === 'jelly') return { type: 'jelly', x, y0: 190 + Math.random() * 200, amp: 40, ph: Math.random() * 6, y: 220, spd: 120, minion: true };
    if (k === 'ptero') return { type: 'ptero', x, y: GROUND - 165, baseY: GROUND - 165, spd: 200, ph: i, alpha: 1, minion: true };
    if (k === 'rollrock') return { type: 'rollrock', x, rot: 0, minion: true };
    return { type: k, x, spd: ((k === 'raptor' ? 175 : 190) + (3 - b.hp) * 12) * (b.kind === 'king' ? [1, 1.5, 0.78, 1.28, 0.9, 1.4][i % 6] : 1), ph: i, alpha: 1, minion: true };
  };
  switch (b.state) {
    case 'enter': b.x -= 230 * dt; G.shake = Math.max(G.shake, 0.16); if ((b.dust = (b.dust || 0) - dt) <= 0) { b.dust = 0.14; burst(b.x - 30, GROUND - 6, 5, ['#d8c9a6', '#efe5cc', '#b9a784'], 110, 60, 8, 0.7); } if (b.x <= home) { b.x = home; SFX.roar(); G.shake = 0.5; startBossPhase(b); } break;
    case 'taunt':
      if (b.t > (b.phase === 0 ? 1.0 : 0.9)) {
        b.n++; b.t = 0;
        if (ty === 'charge') b.state = 'charge';
        else if (ty === 'volley') { b.state = 'volley'; const len = 3 + (3 - b.hp) + (b.phase > 0 ? 1 : 0); b.volley = { seq: Array.from({ length: Math.min(6, len) }, () => swim ? Math.floor(Math.random() * 4) : (G.sk.duck && Math.random() < 0.5 ? 1 : 0)), i: 0, next: 0.2 }; }
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
      if (v.i < v.seq.length && v.next <= 0) { const ln = v.seq[v.i]; b.rocks.push({ x: b.x - 60, y: projY(ln), rot: 0 }); panAt(b.x, SFX.smash); v.i++; v.next = 0.85; if (v.i < v.seq.length) toast(swim ? (v.seq[v.i] >= 2 ? 'Weiter oben – RUNTER!' : 'Weiter unten – HOCH!') : (v.seq[v.i] ? 'DUCKEN!' : 'SPRING!'), '#ffe08a'); }
      if (v.i >= v.seq.length && v.next < -1.0 && b.rocks.length === 0) { b.state = 'tired'; b.t = 0; b.target = p.wx + 340; toast('Er ist erschöpft – BRÜLL!', '#9cff8a'); }
    } break;
    case 'lanes': { // swimming fight: red stripes warn, then a tentacle sweeps the lane
      b.laneNext -= dt;
      if (b.laneN < 3 + (3 - b.hp) && b.laneNext <= 0) { b.hazards.push({ kind: 'lane', y: clamp(p.y - 50 + (Math.random() - 0.5) * 120, 150, GROUND - 40), warn: 1.7, t: 0, fired: false }); b.laneN++; b.laneNext = 2.5; }
      if (b.laneN >= 3 + (3 - b.hp) && b.hazards.length === 0) { b.state = 'tired'; b.t = 0; b.target = p.wx + 340; toast('Er ist erschöpft – BRÜLL!', '#9cff8a'); }
    } break;
    case 'summon':
      if (!b.summoned) {
        b.summoned = true; b.spawnSorted = false; b.t = 0; SFX.roar(); G.shake = 0.4; const base = K.minions, n = (b.hp === 3 ? 3 : b.hp === 2 ? 4 : 5) + (b.kind === 'king' ? 1 : 0); b.spawnQ = [];
        for (let i = 0; i < n; i++) { const k = base[i % base.length]; if (k === 'rollrock') L.obs.push(mkMinion(k, i)); else b.spawnQ.push({ k, i, at: b.kind === 'king' ? Math.max(0.6, 2.4 + b.spawnQ.length * 1.35 - Math.max(0, home - p.wx) / mkMinion(k, i).spd) : 0.8 + b.spawnQ.length * (k === 'raptor' || k === 'jelly' ? 1.7 : 1.35) }); } // the helpers file out from behind the boss, one at a time
        toast('Seine Helfer kommen!', '#ffe08a');
      }
      if (b.spawnQ && b.spawnQ.length > 1 && !b.spawnSorted) { b.spawnQ.sort((a, c) => a.at - c.at); b.spawnSorted = true; }
      while (b.spawnQ && b.spawnQ.length && b.t >= b.spawnQ[0].at) { const q = b.spawnQ.shift(), m = mkMinion(q.k, q.i); m.x = Math.max(b.x, home) + 20; L.obs.push(m); burst(m.x, GROUND - 14, 6, ['#d8c3a5', '#fff'], 120, 90, 5, 0.4); SFX.pop(); }
      if (b.t > 2.2 && !(b.spawnQ && b.spawnQ.length) && (b.t > 16 || !L.obs.some(o => o.minion && !o.dead && !o.scared && !o.flat && o.x > G.cam))) { b.summoned = false; b.state = b.kind === 'kraken' ? 'lanes' : 'charge'; b.laneN = 0; b.laneNext = 0.2; b.t = 0; toast('Jetzt kommt der Boss selbst!', '#ffb4a8'); }
      break;
    case 'crouch': // leap: a shadow marks the landing spot, then he jumps
      if (b.t > 0.75) { b.state = 'leap'; b.t = 0; b.fromX = b.x; SFX.jump(); }
      break;
    case 'leap': {
      const u = clamp(b.t / 0.7, 0, 1); b.x = b.fromX + (b.landX - b.fromX) * u; b.y = -Math.sin(u * Math.PI) * 280;
      if (u >= 1) { b.y = 0; b.state = 'tired'; b.t = 0; b.target = b.landX; SFX.stomp(); G.shake = 0.7; burst(b.x, GROUND, 40, ['#ff9a3c', '#ffd34d', '#5a2a1a'], 500, 800, 9, 0.9);
        b.hazards.push({ kind: 'wave', x: b.x - 60, vx: -420, t: 0 }); // shockwave rolls toward the player
        if (b.kind === 'king') { for (let i = 0; i < 2; i++) b.hazards.push({ kind: 'erupt', x: p.wx + 5, warn: 1.6 + i * 1.7, t: 0, fired: false }); toast('Lava! Spring, wenn SPRING! erscheint!', '#ff9a5a'); }
        else toast('Windwelle! Spring drüber!', '#ff9a5a'); }
    } break;
    case 'tired': { // out of breath and close: the roar window
      if (b.x > b.target) b.x = Math.max(b.target, b.x - 420 * dt); else if (b.x < b.target) b.x = Math.min(b.target, b.x + 420 * dt);
      if (roarHits()) bossHurt(b, b.x); else if (b.t > (ty === 'leap' ? 3.4 : 2.6)) { toast('Zu langsam!', '#ffb4a8'); goBack(); }
    } break;
    case 'back': b.x += 700 * dt; b.y = 0; if (b.x >= home) { b.x = home; b.state = 'taunt'; b.t = 0; } break;
    case 'stagger': // between phases: he roars, the heart drops, he walks back home, the next phase starts
      b.x = Math.min(home, b.x + 500 * dt); b.y = 0;
      if (b.t > 2.2) { b.phase++; startBossPhase(b); } break;
    case 'duel': { // final roar duel (king only): tap BRÜLL to push him back
      b.duelT += dt; b.meter = clamp(b.meter - dt * 0.3, 0, 1); b.x = p.wx + 120 + 300 * b.meter; b.y = 0;
      if (Math.random() < 0.5) burst(b.x - 30, GROUND - 40 - Math.random() * 120, 1, ['#fff', '#ffd34d'], 200, 100, 5, 0.5);
      if (b.meter >= 0.97) { b.state = 'flee'; b.t = 0; G.slowT = 1.4; G.shake = 1; G.hitFlash = 0; bossBanner('K.O.!', 'Der Krallenkönig fliegt davon!', '#9cff8a'); SFX.smash(); setTimeout(SFX.roar, 150); burst(b.x, GROUND - 120, 80, ['#ffd740', '#fff', '#ff7043', '#ff5252'], 700, 500, 9, 1.4); toast('Der Krallenkönig rennt davon!', '#9cff8a'); }
      else if (b.meter < 0.06 && b.duelT > 3.5) { hurt(); b.meter = 0.35; b.duelT = 0; G.shake = 0.5; toast('Nicht aufgeben – brüll lauter!', '#ffb4a8'); }
    } break;
    case 'flee': b.x += 620 * dt; b.y -= 260 * dt; if ((b.trail = (b.trail || 0) - dt) <= 0) { b.trail = 0.05; burst(b.x - 40, GROUND + b.y - 110, 2, ['#ffd740', '#fff', '#ff8a65'], 140, 0, 9, 0.7); }
      if (b.t > 1.2 && !G.golden && !G.bossDone) { if (b.kind === 'king') { G.golden = { x: p.wx + 330, y: -60, vy: 0, landed: false }; SFX.pop(); } else { G.bossDone = true; G.stopped = false; SFX.right(); } }
      break;
  }
}


// ---------- the three new bosses (drawn facing +x, feet at y = 0; the caller flips them to face the player) ----------
function drawSmallCrab(x, y, o) {
  const ph = o.ph || 0, flat = o.flat > 0, t = T * 14 + ph * 2;
  ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : clamp(o.alpha, 0, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (!o.yOff) shadow(x, y + 2, 30, 0.25);
  if (flat) { ell(x, y - 8, 36, 9, 0, '#e0402a'); ell(x, y - 10, 22, 5, 0, '#ff9a7a'); circle(x - 12, y - 14, 4, '#fff'); circle(x + 12, y - 14, 4, '#fff'); ctx.restore(); return; }
  ctx.translate(x, y); ctx.strokeStyle = '#8a2014'; ctx.lineWidth = 4;
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { const k = Math.sin(t + i * 1.6 + sd) * 5; ctx.beginPath(); ctx.moveTo(sd * (10 + i * 7), -12); ctx.lineTo(sd * (24 + i * 9), -8 + k); ctx.lineTo(sd * (28 + i * 9), 0); ctx.stroke(); }
  for (const sd of [-1, 1]) { const up = Math.sin(t * 0.5 + sd) * 6; ctx.strokeStyle = '#c0301c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sd * 20, -24); ctx.lineTo(sd * 32, -34 - up); ctx.stroke(); ctx.fillStyle = '#ee4a30'; ctx.beginPath(); ctx.arc(sd * 36, -40 - up, 11, 0.4, Math.PI * 2 - 0.4); ctx.lineTo(sd * 36, -40 - up); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#6a1408'; ctx.stroke(); }
  ell(0, -22, 28, 19, 0, vgrad(-42, -4, '#ff8a6a', '#e0402a', '#a82a1a')); ctx.beginPath(); ctx.ellipse(0, -22, 28, 19, 0, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = '#6a1408'; ctx.stroke();
  for (const sd of [-1, 1]) { ctx.strokeStyle = '#c0301c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sd * 8, -34); ctx.lineTo(sd * 9, -46); ctx.stroke(); circle(sd * 9, -48, 6, '#fff'); circle(sd * 9 - 1, -48, 3, '#222'); }
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#4a0e06'; ctx.beginPath(); ctx.arc(0, -22, 9, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  ctx.strokeStyle = 'rgba(106,20,8,.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(-18 + i * 3, -30 - i * 2); ctx.quadraticCurveTo(0, -36 - i * 2, 18 - i * 3, -30 - i * 2); } ctx.stroke(); ell(-9, -32, 10, 3.4, -0.25, 'rgba(255,255,255,.3)'); for (const [bx, by] of [[14, -24], [-16, -20], [4, -14]]) circle(bx, by, 1.8, '#ffc0a8');
  for (const sd of [-1, 1]) { ctx.strokeStyle = '#6a1408'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(sd * 36, -40 - Math.sin(t * 0.5 + sd) * 6); ctx.lineTo(sd * 28, -44 - Math.sin(t * 0.5 + sd) * 6); ctx.stroke(); circle(sd * 9 + 1, -49, 1.4, '#fff'); }
  ctx.restore();
}
// ---------- battle damage: plasters, bandages, patches, bruises and cracks pile up as a boss loses hearts ----------
function bossDmg(b) { // 0..1 across all phases; every single hit crosses at least one wound threshold
  if (b.state === 'flee' || b.state === 'duel') return 1;
  return clamp((b.phase + (3 - clamp(b.hp, 0, 3)) / 3) / bossKind(b).phases.length, 0, 1);
}
function woundPlaster(x, y, rot, sc = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  rr(-17, -7, 34, 14, 7); ctx.fillStyle = '#f3cfa4'; ctx.fill(); ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = 'rgba(138,90,52,.5)'; for (const dx of [-13, -10, 10, 13]) for (const dy of [-2.6, 2.6]) { ctx.beginPath(); ctx.arc(dx, dy, 0.9, 0, 7); ctx.fill(); }
  rr(-6.5, -6, 13, 12, 2); ctx.fillStyle = '#fff0d8'; ctx.fill(); ctx.strokeStyle = 'rgba(138,90,52,.55)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}
function woundBand(x1, y1, x2, y2, w) { // a wrapped bandage with diagonal weave and a loose flapping end
  const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
  ctx.save(); ctx.translate(x1, y1); ctx.rotate(a); ctx.lineJoin = 'round';
  ctx.fillStyle = '#f6efe0'; ctx.strokeStyle = '#6f604e'; ctx.lineWidth = 2;
  const fl = Math.sin(T * 4 + x1) * 2.5; ctx.beginPath(); ctx.moveTo(L - 4, w / 2 - 1); ctx.quadraticCurveTo(L + 4, w / 2 + 8, L - 2 + fl, w / 2 + 14); ctx.lineTo(L - 11 + fl, w / 2 + 11); ctx.quadraticCurveTo(L - 12, w / 2 + 5, L - 14, w / 2 - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  rr(-3, -w / 2, L + 6, w, w * 0.32); ctx.fill(); ctx.stroke();
  ctx.save(); rr(-3, -w / 2, L + 6, w, w * 0.32); ctx.clip();
  ctx.fillStyle = 'rgba(111,96,78,.16)'; ctx.fillRect(-3, w * 0.12, L + 6, w); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-3, -w / 2 + 1.5, L + 6, w * 0.16);
  ctx.strokeStyle = 'rgba(111,96,78,.4)'; ctx.lineWidth = 1.3; for (let k = 2; k < L + 4; k += 6) { ctx.beginPath(); ctx.moveTo(k - 3, -w / 2); ctx.lineTo(k + 3, w / 2); ctx.stroke(); }
  ctx.restore(); ctx.restore();
}
function woundPatch(x, y, rot, s, c1, c2) { // a stitched-on cloth patch
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  rr(-s, -s, s * 2, s * 2, s * 0.25); ctx.fillStyle = c1; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.setLineDash([3, 2.6]); rr(-s + 3.2, -s + 3.2, s * 2 - 6.4, s * 2 - 6.4, s * 0.15); ctx.strokeStyle = c2; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.35, s * 0.22, 0, 7); ctx.fill();
  ctx.restore();
}
function woundEye(x, y, r) { // a blue-purple shiner ringing the eye
  ctx.save(); const g = ctx.createRadialGradient(x, y, r * 0.78, x, y, r * 1.75);
  g.addColorStop(0, 'rgba(60,70,230,.0)'); g.addColorStop(0.22, 'rgba(60,70,230,.8)'); g.addColorStop(0.6, 'rgba(110,50,190,.6)'); g.addColorStop(1, 'rgba(140,60,160,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.75, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,120,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 1.02, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}
function woundShut(x, y, r) { // an eye swollen shut
  ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, r + 3, r + 2, 0, 0, 7); ctx.fillStyle = vgrad(y - r, y + r, '#9a60d0', '#6a30a0'); ctx.fill();
  ctx.strokeStyle = '#2a0a48'; ctx.lineWidth = 3; ctx.stroke();
  const g = ctx.createRadialGradient(x, y + 3, 2, x, y + 3, r + 4); g.addColorStop(0, 'rgba(60,70,230,.75)'); g.addColorStop(1, 'rgba(60,70,230,0)'); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#1a0630'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x - r + 2, y + 2); ctx.quadraticCurveTo(x, y + 9, x + r - 2, y + 2); ctx.stroke();
  for (const k of [-1, 0, 1]) { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + k * 7, y + 5); ctx.lineTo(x + k * 9, y + 11); ctx.stroke(); }
  ctx.restore();
}
function woundCrack(x, y, d) { // jagged crack, d = flat list of offsets
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const path = ox => { ctx.beginPath(); ctx.moveTo(x + ox, y); let px = x, py = y; for (let i = 0; i < d.length; i += 2) { px += d[i]; py += d[i + 1]; ctx.lineTo(px + ox, py); } };
  path(1.6); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.stroke();
  path(0); ctx.strokeStyle = 'rgba(30,8,4,.9)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}
function woundBump(x, y, r) { // a cartoon lump with impact lines
  ctx.save(); const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); g.addColorStop(0, '#ffc2a8'); g.addColorStop(0.6, '#f0806a'); g.addColorStop(1, '#c04a3a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#7a2418'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0.3, Math.PI * 1.1); ctx.stroke();
  ell(x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.18, -0.6, 'rgba(255,255,255,.7)');
  ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; for (const a of [-2.5, -1.9, -1.3]) { ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3)); ctx.lineTo(x + Math.cos(a) * (r + 9), y + Math.sin(a) * (r + 9)); ctx.stroke(); }
  ctx.restore();
}
function woundSweat(x, y) { // drops that slide down
  ctx.save(); for (let i = 0; i < 2; i++) { const u = (T * 0.8 + i * 0.5) % 1, px = x + i * 14 - 4, py = y + u * 30; ctx.globalAlpha = Math.min(1, (1 - u) * 2); ctx.fillStyle = '#c8efff'; ctx.strokeStyle = '#3f86b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py - 10); ctx.quadraticCurveTo(px + 7, py, px, py + 5); ctx.quadraticCurveTo(px - 7, py, px, py - 10); ctx.fill(); ctx.stroke(); } ctx.restore();
}
function woundTuft(x, y) { // ruffled, bent feathers
  ctx.save(); ctx.lineCap = 'round'; for (const [a, l] of [[-2.2, 26], [-1.75, 31], [-2.65, 22]]) {
    const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l; ctx.strokeStyle = '#2a3a70'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 - 6, ex, ey); ctx.stroke();
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a + 0.7); ell(0, 0, 10, 3.6, 0, '#e8eefc'); ctx.strokeStyle = '#2a3a70'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, 0, 10, 3.6, 0, 0, 7); ctx.stroke(); ctx.restore();
  } ctx.restore();
}
const WOUND_FN = { plaster: woundPlaster, cross: (x, y, r, s = 1) => { woundPlaster(x, y, r, s); woundPlaster(x, y, r + 1.5, s); }, band: woundBand, patch: woundPatch, eye: woundEye, shut: woundShut, crack: woundCrack, bump: woundBump, sweat: woundSweat, tuft: woundTuft };
// [threshold, kind, ...args]: drawn in the boss's own coordinates, in the order they were earned
const WOUNDS = {
  crab: [[0.12, 'cross', -42, -68, -0.5], [0.3, 'band', -31, -108, -14, -113, 10], [0.45, 'eye', 27, -132, 11], [0.5, 'sweat', -52, -118], [0.6, 'crack', 6, -102, [8, 11, -5, 10, 9, 12, -3, 13]], [0.75, 'band', 80, -110, 102, -106, 11], [0.9, 'patch', -52, -50, 0.25, 9, '#7fb7e8', '#fff'], [0.95, 'cross', 44, -46, 0.4]],
  kraken: [[0.12, 'cross', -30, -140, -0.5], [0.45, 'eye', 25, -106, 17], [0.5, 'sweat', -56, -150], [0.6, 'patch', 40, -62, 0.25, 11, '#ffd66a', '#a06a00'], [0.75, 'shut', -25, -106, 17], [0.9, 'cross', -44, -90, 0.7]],
  queen: [[0.12, 'cross', 40, -98, 0.6], [0.3, 'band', 22, -104, 42, -92, 10], [0.45, 'eye', 55, -124, 9], [0.5, 'sweat', 18, -136], [0.6, 'patch', -14, -88, 0.25, 8, '#ff9a6a', '#fff'], [0.75, 'cross', 78, -110, -0.5], [0.9, 'tuft', 26, -128]],
  king: [[0.12, 'cross', 66, -86, 0.3, 0.5], [0.3, 'band', 4, -70, 14, -38, 9], [0.45, 'eye', 52, -86, 7], [0.5, 'sweat', 30, -100], [0.6, 'crack', -18, -62, [5, 8, -4, 7, 5, 8]], [0.75, 'patch', -24, -50, 0.25, 7, '#7fb7e8', '#fff'], [0.9, 'bump', 38, -94, 6]],
};
const woundSeen = {};
const WOUND_EYES = { crab: [[-24, -132, 11], [24, -132, 11]], kraken: [[-25, -106, 15], [25, -106, 15]], queen: [[54, -124, 8]], king: [[52, -86, 7]] };
function woundSwirl(x, y, r) { // knocked-out spiral eye
  ctx.save(); ctx.translate(x, y); ctx.rotate(T * 5); circle(0, 0, r + 1.5, '#fff'); ctx.strokeStyle = '#2a1a4a'; ctx.lineWidth = Math.max(1.6, r * 0.18); ctx.lineCap = 'round'; ctx.beginPath();
  for (let a = 0; a < 12.5; a += 0.3) { const rr2 = a / 12.5 * r; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.stroke(); ctx.restore();
}
function woundPuff(x, y, u) { // ring and stars when a wound lands
  ctx.save(); ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 3 * (1 - u) + 1; ctx.beginPath(); ctx.arc(x, y, 6 + 34 * u, 0, 7); ctx.stroke();
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.5; drawStar(x + Math.cos(a) * (10 + 30 * u), y + Math.sin(a) * (10 + 30 * u), 7 * (1 - u * 0.5), '#ffd34d'); } ctx.restore();
}
function drawWounds(kind, d, wid = '', ko = false) { // a new wound pops in with a little overshoot
  const list = WOUNDS[kind];
  for (let i = 0; i < list.length; i++) {
    const w = list[i], key = kind + wid + i;
    if (d < w[0]) { delete woundSeen[key]; continue; }
    if (woundSeen[key] == null) woundSeen[key] = T;
    const u = clamp((T - woundSeen[key]) / 0.32, 0, 1), k = u >= 1 ? 1 : 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
    ctx.save(); ctx.translate(w[2], w[3]); ctx.scale(k * 1.2, k * 1.2); ctx.translate(-w[2], -w[3]); WOUND_FN[w[1]](...w.slice(2)); ctx.restore();
    if (u < 1) woundPuff(w[2], w[3], u);
  }
  if (ko) for (const [ex, ey, er] of WOUND_EYES[kind]) woundSwirl(ex, ey, er);
}
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
  ctx.strokeStyle = 'rgba(106,20,8,.38)'; ctx.lineWidth = 2.4; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-60 + i * 4, -50 - i * 8); ctx.quadraticCurveTo(0, -112 - i * 4 + 40, 60 - i * 4, -50 - i * 8); } ctx.stroke();
  for (const [bx, by, br] of [[-52, -44, 5], [-38, -36, 4], [46, -40, 5], [54, -56, 4], [30, -34, 3.4], [-60, -62, 3.6]]) { ctx.fillStyle = '#ffe8d8'; ctx.beginPath(); ctx.moveTo(bx - br, by + br * 0.6); ctx.lineTo(bx, by - br * 1.2); ctx.lineTo(bx + br, by + br * 0.6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(106,20,8,.6)'; ctx.lineWidth = 1.2; ctx.stroke(); }
  ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 7, -50); ctx.lineTo(-10.5 + i * 7, -43); ctx.lineTo(-7 + i * 7, -50); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 3; i++) circle(-4 + i * 8 + Math.sin(T * 3 + i) * 2, -34 - ((T * 0.8 + i / 3) % 1) * 22, 2.6 - i * 0.4, ctx.fillStyle);
  ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(-18, -98); ctx.lineTo(-20, -116); ctx.lineTo(-10, -108); ctx.lineTo(0, -122); ctx.lineTo(10, -108); ctx.lineTo(20, -116); ctx.lineTo(18, -98); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 2; ctx.stroke(); circle(0, -106, 3, '#e53935');
  drawWounds('crab', o.dmg || 0, o.wid, o.ko);
  ctx.restore();
}
function drawKraken(x, y, s, ph, flip, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const col = vgrad(-180, 0, '#c882e8', '#8a44b8', '#4a1a78'), dark = '#2a0a48';
  // eight arms with two rows of suckers and a curled tip
  for (let i = 0; i < 8; i++) {
    const base = -64 + i * 18, wv = Math.sin(ph * 0.35 + i * 0.9), dir = i < 4 ? -1 : 1, ex = base + (i - 3.5) * 22 + dir * 50, c1x = base + wv * 30, c2x = base + (i - 3.5) * 14 + wv * 14;
    const pt = t => { const u = 1 - t; return [u * u * u * base + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex, u * u * u * -50 + 3 * u * u * t * -20 + 3 * u * t * t * -6 + t * t * t * 2]; };
    ctx.strokeStyle = dark; ctx.lineWidth = 23; ctx.beginPath(); ctx.moveTo(base, -50); ctx.bezierCurveTo(c1x, -20, c2x, -6, ex, 2); ctx.stroke();
    ctx.strokeStyle = i % 2 ? '#a458d0' : '#b46ae0'; ctx.lineWidth = 16; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(base - 3, -50); ctx.bezierCurveTo(c1x - 3, -20, c2x - 3, -6, ex - 3, 0); ctx.stroke();
    for (let k = 1; k <= 5; k++) { const [px, py] = pt(k / 5.6); circle(px + 1, py + 3, 3.6 - k * 0.3, '#f0cdf8'); circle(px + 1, py + 3, 1.6 - k * 0.1, '#c27ad8'); }
    ctx.strokeStyle = '#b46ae0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ex + dir * 5, 0, 6, dir < 0 ? 0.3 : Math.PI - 0.3, dir < 0 ? Math.PI * 1.4 : -Math.PI * 0.4, dir > 0); ctx.stroke();
    for (const [ai, thr, t0] of [[1, 0.3, 0.3], [6, 0.65, 0.35], [6, 0.8, 0.62]]) if (i === ai && (o.dmg || 0) >= thr) { const [px, py] = pt(t0), [qx, qy] = pt(t0 + 0.04), an = Math.atan2(qy - py, qx - px) + Math.PI / 2, c = Math.cos(an) * 15, sn = Math.sin(an) * 15; woundBand(px - c, py - sn, px + c, py + sn, 10); }
  }
  ctx.fillStyle = 'rgba(42,10,72,.55)'; ctx.beginPath(); ctx.moveTo(-70, -54); ctx.quadraticCurveTo(0, -22, 70, -54); ctx.lineTo(60, -62); ctx.quadraticCurveTo(0, -40, -60, -62); ctx.closePath(); ctx.fill(); // webbing between the arms
  // mantle with fins, mottling, bumps and barnacles
  for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * 50, -152); ctx.rotate(sd * 0.7); ctx.fillStyle = vgrad(-34, 4, '#e0a8f4', '#9a52c8'); ctx.beginPath(); ctx.ellipse(0, -14, 15, 30, 0, 0, 7); ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = 'rgba(42,10,72,.4)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, -40); ctx.moveTo(-6, 8); ctx.lineTo(-9, -30); ctx.moveTo(6, 8); ctx.lineTo(9, -30); ctx.stroke(); ctx.restore(); }
  ell(0, -110, 62, 74, 0, col); ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -110, 62, 74, 0, 0, 7); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, -110, 61, 73, 0, 0, 7); ctx.clip();
  ctx.fillStyle = 'rgba(40,8,70,.22)'; for (const [mx, my, mr] of [[-30, -138, 14], [26, -150, 11], [40, -112, 12], [-44, -100, 12], [-6, -168, 10], [14, -94, 8]]) { ctx.beginPath(); ctx.ellipse(mx, my, mr, mr * 0.7, 0.4, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,200,255,.2)'; ctx.beginPath(); ctx.ellipse(0, -52, 46, 20, 0, 0, 7); ctx.fill(); ell(-18, -158, 26, 9, -0.4, 'rgba(255,255,255,.24)');
  ctx.restore();
  for (const [bx, by, br] of [[-30, -136, 5], [24, -146, 4.4], [38, -118, 4], [-40, -102, 4.6], [-22, -88, 3.4], [30, -92, 3.4]]) { circle(bx, by, br, '#b868d8'); circle(bx - br * 0.3, by - br * 0.3, br * 0.4, 'rgba(255,255,255,.35)'); }
  ctx.fillStyle = '#d8c8b0'; for (const [bx, by] of [[-48, -122], [-52, -114], [-45, -112], [46, -134], [50, -126]]) { ctx.beginPath(); ctx.moveTo(bx - 3, by + 3); ctx.lineTo(bx, by - 5); ctx.lineTo(bx + 3, by + 3); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(60,40,30,.6)'; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const [bx, by, br, p0] of [[-34, -124, 4, 0], [30, -138, 3.4, 1.3], [44, -104, 3, 2.4], [-46, -96, 3.4, 3.1], [-8, -150, 3, 4.2], [8, -96, 2.6, 5.1]]) { const g = ctx.createRadialGradient(bx, by, 0.5, bx, by, br * 3.2); const a = 0.5 + 0.4 * Math.sin(T * 2.4 + p0); g.addColorStop(0, `rgba(160,255,240,${a})`); g.addColorStop(1, 'rgba(160,255,240,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br * 3.2, 0, 7); ctx.fill(); } ctx.restore();
  ctx.strokeStyle = 'rgba(30,5,60,.5)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-20, -168); ctx.lineTo(-12, -150); ctx.moveTo(-16, -170); ctx.lineTo(-8, -154); ctx.stroke();
  // eyes: big, ringed, with a slit pupil and a heavy angry lid
  for (const sd of [-1, 1]) {
    const ex = sd * 25, blink = (T % 4.2) < 0.12;
    circle(ex, -106, 20, '#6a2a98'); circle(ex, -106, 17, '#fff'); ctx.lineWidth = 2.4; ctx.strokeStyle = dark; ctx.beginPath(); ctx.arc(ex, -106, 17, 0, 7); ctx.stroke();
    circle(ex + sd * 2, -106, 10.5, '#ffd23a'); circle(ex + sd * 2, -106, 10.5, 'rgba(255,140,0,.25)'); ell(ex + sd * 3, -106, 3, 9.5, 0, '#14100c'); circle(ex + sd * 5.5, -111, 2.6, '#fff'); circle(ex + sd * 0.5, -100, 1.4, 'rgba(255,255,255,.8)');
    ctx.save(); ctx.beginPath(); ctx.arc(ex, -106, 17, 0, 7); ctx.clip(); ctx.fillStyle = '#6a2a98'; ctx.beginPath(); if (blink) { ctx.rect(ex - 20, -126, 40, 40); } else { ctx.moveTo(ex + sd * 20, -128); ctx.lineTo(ex - sd * 20, -128); ctx.lineTo(ex - sd * 20, -100); ctx.lineTo(ex + sd * 20, -114); ctx.closePath(); } ctx.fill(); ctx.restore();
    ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.beginPath(); if (blink) { ctx.moveTo(ex - 17, -106); ctx.lineTo(ex + 17, -106); } else { ctx.moveTo(ex - sd * 19, -100); ctx.lineTo(ex + sd * 19, -115); } ctx.stroke();
  }
  ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(-26, -168); ctx.lineTo(-30, -192); ctx.lineTo(-14, -180); ctx.lineTo(0, -198); ctx.lineTo(14, -180); ctx.lineTo(30, -192); ctx.lineTo(26, -168); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 2; ctx.stroke(); circle(0, -178, 4, '#40c4ff'); circle(-17, -176, 2.4, '#e53935'); circle(17, -176, 2.4, '#69f0ae');
  // a hooked beak between the arms, and a siphon on the side
  ctx.fillStyle = vgrad(-80, -56, '#7a5a3a', '#2a1a10'); ctx.strokeStyle = '#140a04'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-13, -76); ctx.quadraticCurveTo(0, -84, 13, -76); ctx.quadraticCurveTo(8, -62, 0, -54); ctx.quadraticCurveTo(-8, -62, -13, -76); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, -68); ctx.quadraticCurveTo(0, -62, 8, -68); ctx.stroke(); ell(-4, -76, 4, 2, -0.3, 'rgba(255,255,255,.3)');
  ctx.save(); ctx.translate(54, -70); ctx.rotate(0.6); rr(-5, -13, 11, 22, 5); ctx.fillStyle = '#9a52c8'; ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 2.4; ctx.stroke(); circle(0, -10, 3.4, '#2a0a48'); ctx.restore();
  drawWounds('kraken', o.dmg || 0, o.wid, o.ko);
  ctx.restore();
}
function drawQueen(x, y, s, ph, flip, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fl = Math.sin(ph * 0.45), wing = (a, c1, c2, back) => { ctx.save(); ctx.translate(-4, -104); ctx.rotate(a); for (let k = 0; k < 8; k++) { ctx.save(); ctx.rotate(-k * 0.13); ctx.fillStyle = k % 2 ? c1 : c2; ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(-60, -11, -112 + k * 2, -3 - k * 1); ctx.quadraticCurveTo(-60, 7, 0, 5); ctx.fill(); ctx.strokeStyle = '#102050'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); } ctx.restore(); };
  wing(-1.0 + fl * 0.8, '#2a4a9a', '#1d3678', true);
  for (let k = -2; k <= 2; k++) { ctx.save(); ctx.translate(-46, -82); ctx.rotate(Math.PI + k * 0.2); ctx.fillStyle = k % 2 ? '#e8eefc' : '#cfd8f0'; ctx.beginPath(); ctx.ellipse(-26, 0, 30, 6, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a3a70'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = '#d8e0f8'; ctx.beginPath(); ctx.ellipse(2, -68, 14, 12, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a3a70'; ctx.lineWidth = 1.4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-6 + i * 6, -62, 3.4, 0.2, Math.PI - 0.2); ctx.stroke(); }
  ctx.strokeStyle = '#f0b020'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(10, -66); ctx.lineTo(14, -42); ctx.moveTo(-8, -64); ctx.lineTo(-6, -42); ctx.stroke(); ctx.fillStyle = '#f0b020'; for (const dx of [10, -8]) for (const t2 of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(dx + t2 * 0.5, -44); ctx.quadraticCurveTo(dx + t2, -34, dx + t2 * 1.3, -32); ctx.lineTo(dx + t2 * 0.4, -42); ctx.fill(); }
  ell(0, -90, 48, 32, -0.2, vgrad(-122, -58, '#4a6ac0', '#2a4a9a', '#1d3678')); ell(10, -80, 32, 18, -0.2, '#f4f6ff'); ctx.strokeStyle = '#102050'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -90, 48, 32, -0.2, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(20,40,110,.4)'; ctx.lineWidth = 1.8; for (let r = 0; r < 3; r++) for (let q = 0; q < 5; q++) { ctx.beginPath(); ctx.arc(-30 + q * 14 + (r % 2) * 7, -92 + r * 9 - q * 1.2, 6, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
  ctx.fillStyle = '#f8faff'; ctx.strokeStyle = '#8a98c8'; ctx.lineWidth = 1.6; for (let i = 0; i < 7; i++) { const a = -2.6 + i * 0.55; ctx.beginPath(); ctx.moveTo(46 + Math.cos(a) * 18, -112 + Math.sin(a) * 18); ctx.lineTo(46 + Math.cos(a + 0.12) * 36, -112 + Math.sin(a + 0.12) * 34); ctx.lineTo(46 + Math.cos(a + 0.34) * 20, -112 + Math.sin(a + 0.34) * 19); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ell(46, -116, 25, 23, 0, '#ffffff'); ctx.strokeStyle = '#8a98c8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(46, -116, 25, 23, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = vgrad(-126, -96, '#ffd44a', '#d89a10'); ctx.beginPath(); ctx.moveTo(64, -124); ctx.quadraticCurveTo(96, -118, 90, -96); ctx.quadraticCurveTo(80, -108, 62, -106); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 2.6; ctx.stroke(); ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(64, -111); ctx.quadraticCurveTo(80, -112, 88, -104); ctx.stroke(); circle(76, -120, 1.8, '#8a5a00'); ctx.fillStyle = '#6a4200'; ctx.beginPath(); ctx.moveTo(88, -102); ctx.quadraticCurveTo(95, -98, 90, -92); ctx.lineTo(87, -98); ctx.fill();
  circle(54, -124, 8, '#fff'); circle(56, -124, 5, '#ffd23a'); circle(57, -124, 2.6, '#111'); ctx.strokeStyle = '#2a3a70'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(44, -138); ctx.lineTo(64, -131); ctx.stroke();
  ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(32, -134); ctx.lineTo(30, -152); ctx.lineTo(40, -144); ctx.lineTo(48, -158); ctx.lineTo(56, -144); ctx.lineTo(64, -152); ctx.lineTo(62, -134); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 2; ctx.stroke(); circle(47, -140, 3, '#e53935');
  wing(-0.5 + fl * 0.8, '#3a62c0', '#2f54a8', false);
  drawWounds('queen', o.dmg || 0, o.wid, o.ko);
  ctx.restore();
}

// ---------- play drawing ----------
function rim() { // dark outline for ground hazards; warm rim on the dark lava world so it still reads
  ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = ART(G.wi) === 3 ? 'rgba(255,170,90,.9)' : '#1b120c'; ctx.stroke();
}
function rockTheme(x, o) { // each world's rocks get their own surface: moss, strata, lava cracks, shells, snow
  const A = ART(G.wi), b = GROUND, w = o.w, h = o.h;
  ctx.lineCap = 'round';
  if (A === 0) { ell(x - w * 0.1, b - h * 0.9, w * 0.3, 6, -0.12, '#4fae48'); ell(x - w * 0.18, b - h * 0.95, w * 0.14, 3, -0.1, '#86dc66'); ctx.strokeStyle = '#3f9b3a'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { const bx = x - w / 2 + 2 + i * w / 4.5; ctx.beginPath(); ctx.moveTo(bx, b); ctx.quadraticCurveTo(bx + 2, b - 8, bx + (i % 2 ? 6 : -4), b - 13); ctx.stroke(); } circle(x + w * 0.3, b - h * 0.55, 2.4, '#ff7aa8'); }
  else if (A === 1) { ctx.strokeStyle = 'rgba(255,220,170,.42)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - w / 2 + 3, b - h * 0.33); ctx.lineTo(x + w / 2 - 2, b - h * 0.28); ctx.moveTo(x - w / 2 + 8, b - h * 0.14); ctx.lineTo(x + w / 2 - 4, b - h * 0.12); ctx.stroke(); ctx.strokeStyle = 'rgba(120,50,20,.4)'; ctx.beginPath(); ctx.moveTo(x - w / 2 + 4, b - h * 0.24); ctx.lineTo(x + w / 2 - 3, b - h * 0.2); ctx.stroke(); }
  else if (A === 3) { ctx.save(); ctx.shadowColor = '#ff5a00'; ctx.shadowBlur = 10; ctx.strokeStyle = `rgba(255,${120 + 40 * Math.sin(T * 4 + o.x) | 0},30,.9)`; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - w * 0.25, b - h * 0.5); ctx.lineTo(x - 2, b - h * 0.3); ctx.lineTo(x + w * 0.2, b - h * 0.45); ctx.moveTo(x - 2, b - h * 0.3); ctx.lineTo(x - 6, b - 5); ctx.stroke(); ctx.restore(); }
  else if (A === 5) { drawStar(x + w * 0.15, b - h * 0.32, 6, '#ff9a6a'); ctx.fillStyle = '#ffe0d0'; ctx.beginPath(); ctx.arc(x - w * 0.22, b - 3, 5, Math.PI, 0); ctx.fill(); }
  else if (A === 6) { for (let i = 0; i < 3; i++) { ctx.strokeStyle = ['#f0705a', '#b86ad0', '#f0c84a'][i]; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - w * 0.2 + i * 9, b - h * 0.85); ctx.quadraticCurveTo(x - w * 0.2 + i * 11 - 6, b - h - 8, x - w * 0.2 + i * 12 - 8, b - h - 14 - i * 3); ctx.stroke(); } }
  else if (A === 7) { ell(x - w * 0.05, b - h * 0.93, w * 0.34, 6, 0, '#fff'); ell(x - w * 0.2, b - h * 0.86, w * 0.12, 3, 0, '#dcecff'); }
}
// raptors and compys wear the colours of their world, so a snow raptor is not a jungle raptor
function worldRaptor() { return ({ 1: { col: '#c98a4a', dark: '#7a4a1e', fea: '#e8553a' }, 2: { col: '#8fa6bf', dark: '#4a5f78', fea: '#e8f4ff', belly: '#f4f8ff' }, 3: { col: '#6a3a30', dark: '#2a1410', fea: '#ff7a2a', belly: '#b8745a' }, 5: { col: '#d4a15a', dark: '#8a5a24', fea: '#3fb59a' }, 7: { col: '#8a7a6a', dark: '#4a3e34', fea: '#d8e4f0', belly: '#e8e0d0' } })[ART(G.wi)] || {}; }
function worldCompy() { return ({ 1: ['#f0cf6a', '#d9a232', '#8a6012', '#5a3e0a'], 2: ['#e4f2ff', '#9cc4e8', '#5f86b0', '#3a5a7a'], 3: ['#ffa468', '#d4541f', '#7a2a0f', '#4a1a0a'], 5: ['#8ae8cc', '#3fb59a', '#1f7a66', '#0f4a3e'], 7: ['#c4d2e0', '#8aa0b8', '#5a7088', '#3a4a5e'] })[ART(G.wi)]; }
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
      rockTheme(x, o);
      break;
    }
    case 'boulder': { // a lumpy rock in the colours of its world (not an egg shape)
      const A = ART(G.wi), cy = GROUND - o.h / 2 + 4, seed = Math.floor(o.x) % 7;
      const bc = { 0: '#7d8076', 1: '#b8683c', 2: '#5a6a84', 3: '#3a2a26', 5: '#c9a874', 6: '#8a5f7a', 7: '#7f8896' }[A] || '#7d7d86';
      const bp = () => { ctx.beginPath(); for (let k = 0; k <= 28; k++) { const a = k / 28 * Math.PI * 2, r = 1 + 0.06 * Math.sin(k * 1.9 + seed) + 0.04 * Math.sin(k * 4.3 + seed * 2); ctx.lineTo(x + Math.cos(a) * o.w / 2 * r, cy + Math.sin(a) * o.h / 2 * r * (Math.sin(a) > 0 ? 0.98 : 1)); } ctx.closePath(); };
      shadow(x, GROUND + 2, o.w * 0.65, 0.35);
      bp(); ctx.fillStyle = bc; ctx.fill(); rim();
      ctx.save(); bp(); ctx.clip();
      const g = ctx.createRadialGradient(x - o.w * 0.18, cy - o.h * 0.25, 4, x, cy, o.h * 0.78); g.addColorStop(0, shade(bc, 1.5)); g.addColorStop(0.55, bc); g.addColorStop(1, shade(bc, 0.45)); ctx.fillStyle = g; ctx.fillRect(x - o.w, cy - o.h, o.w * 2, o.h * 2);
      ctx.fillStyle = 'rgba(0,0,0,.13)'; for (const [dx, dy, rx, ry] of [[0.18, 0.12, 0.2, 0.1], [-0.2, 0.28, 0.16, 0.08], [0.05, -0.25, 0.14, 0.07], [0.26, -0.1, 0.1, 0.12]]) { ctx.beginPath(); ctx.ellipse(x + o.w * dx, cy + o.h * dy, o.w * rx, o.h * ry, 0.4, 0, 7); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - o.w * 0.4, cy + o.h * 0.1); ctx.quadraticCurveTo(x, cy + o.h * 0.02, x + o.w * 0.4, cy + o.h * 0.12); ctx.stroke();
      if (A === 1) { ctx.strokeStyle = 'rgba(90,30,10,.28)'; ctx.lineWidth = 3; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x - o.w / 2, cy + k * o.h * 0.17); ctx.quadraticCurveTo(x, cy + k * o.h * 0.17 + 6, x + o.w / 2, cy + k * o.h * 0.17 - 2); ctx.stroke(); } } // sandstone strata
      if (A === 0) { ell(x + o.w * 0.12, cy - o.h * 0.44, o.w * 0.3, o.h * 0.1, -0.1, '#4fae48'); for (let i = 0; i < 4; i++) circle(x - o.w * 0.1 + i * o.w * 0.09, cy - o.h * 0.42 + (i % 2) * 3, 3, '#86dc66'); }
      else if (A === 5) { for (let i = 0; i < 6; i++) circle(x - o.w * 0.3 + i * o.w * 0.12, cy + o.h * (0.1 + (i % 3) * 0.12), 2.4, 'rgba(120,90,50,.5)'); }
      else if (A === 6) { for (let i = 0; i < 9; i++) { const bx = x - o.w * 0.36 + (i % 5) * o.w * 0.18, by = cy - o.h * 0.25 + Math.floor(i / 5) * o.h * 0.3 + (i % 2) * 6; circle(bx, by, 4.2, '#f0d8e4'); circle(bx, by, 1.8, 'rgba(80,30,60,.6)'); } }
      else if (A === 2 || A === 7) { ell(x, cy - o.h * 0.44, o.w * 0.38, o.h * 0.13, 0, '#fff'); }
      ctx.restore(); bp(); rim();
      if (A === 6) { ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { const bx = x - o.w * 0.25 + i * o.w * 0.17, sw = Math.sin(T * 2 + i) * 3; ctx.strokeStyle = i % 2 ? '#ff8a6a' : '#ffb347'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(bx, cy - o.h * 0.46); ctx.quadraticCurveTo(bx + sw, cy - o.h * 0.58, bx + sw * 1.5, cy - o.h * 0.68); ctx.stroke(); circle(bx + sw * 1.5, cy - o.h * 0.68, 3.4, '#ffe1c8'); } ctx.lineCap = 'butt'; }
      ell(x - 14, GROUND - o.h * 0.66, o.w * 0.2, o.h * 0.14, -0.4, 'rgba(255,255,255,.22)');
      ctx.strokeStyle = A === 3 ? `rgba(255,110,20,${0.6 + 0.4 * Math.sin(T * 4)})` : 'rgba(0,0,0,.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 10, GROUND - o.h + 14); ctx.lineTo(x + 4, GROUND - o.h * 0.6); ctx.lineTo(x - 6, GROUND - o.h * 0.4); ctx.lineTo(x + 12, GROUND - o.h * 0.15); ctx.stroke();
      break;
    }
    case 'low': drawLow(o, x); break;
    case 'hopper': {
      const hy = o.hy || 0, yo = o.yOff || 0, c = critterCol(), flat = o.flat > 0, by = GROUND - hy + yo;
      if (ART(G.wi) !== 0) { drawHopperAlt(o, x, hy, by, flat); break; }
      ctx.save(); if (o.alpha != null) ctx.globalAlpha = clamp(o.alpha, 0, 1);
      shadow(x, GROUND + 2, 26 - hy * 0.08, 0.3);
      if (flat) { ell(x, GROUND - 8, 34, 9, 0, c); ell(x, GROUND - 10, 20, 5, 0, shade(c, 1.4)); circle(x - 14, GROUND - 14, 5, '#fff'); circle(x + 14, GROUND - 14, 5, '#fff'); ctx.restore(); break; }
      const st = 1 + (hy < 12 ? 0.12 : 0) - hy * 0.0012;
      ctx.translate(x, by); ctx.scale(1 / st, st);
      ctx.strokeStyle = shade(c, 0.6); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-14, -12); ctx.lineTo(-30, hy > 12 ? 0 : -6); ctx.lineTo(-18, 0); ctx.moveTo(14, -12); ctx.lineTo(28, hy > 12 ? 0 : -6); ctx.lineTo(18, 0); ctx.stroke();
      ell(0, -26, 26, 22, 0, c); ell(0, -16, 16, 12, 0, shade(c, 1.5)); ctx.beginPath(); ctx.ellipse(0, -26, 26, 22, 0, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = '#1b2a14'; ctx.stroke();
      circle(-12, -44, 9, '#fff'); circle(12, -44, 9, '#fff'); ctx.lineWidth = 2.5; ctx.strokeStyle = '#1b2a14'; ctx.beginPath(); ctx.arc(-12, -44, 9, 0, 7); ctx.moveTo(21, -44); ctx.arc(12, -44, 9, 0, 7); ctx.stroke();
      circle(-10, -43, 4.5, '#1b2a14'); circle(14, -43, 4.5, '#1b2a14'); circle(-8.6, -44.6, 1.4, '#fff'); circle(15.4, -44.6, 1.4, '#fff');
      ctx.fillStyle = shade(c, 0.62); for (const [qx, qy, qr] of [[-12, -34, 3.2], [8, -36, 2.6], [-2, -30, 2], [14, -28, 2.2]]) circle(qx, qy, qr, ctx.fillStyle); circle(-3, -28, 1, '#1b2a14'); circle(3, -28, 1, '#1b2a14'); ell(-8, -34, 5, 2, -0.3, 'rgba(255,255,255,.3)'); ctx.fillStyle = shade(c, 0.7); for (const tx of [-34, -30, -26, 26, 30, 34]) circle(tx, hy > 12 ? 0 : -5, 2, ctx.fillStyle);
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -22, 11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.restore(); break;
    }
    case 'plant': {
      if (ART(G.wi) !== 0) { drawSpitter(o, x); break; }
      const pop = o.pop || 0, k = 1 + pop * 0.6;
      shadow(x, GROUND + 2, 34, 0.3);
      ctx.strokeStyle = '#2f7a2c'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 10, GROUND); ctx.quadraticCurveTo(x + 22, GROUND - 24, x + 4, GROUND - 40); ctx.stroke();
      ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(x + 24, GROUND - 8, 18, 7, -0.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x - 12, GROUND - 7, 16, 6, 0.5, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(x - 6, GROUND - 52); ctx.scale(k, 1 / k);
      circle(0, 0, 25, '#c0392b'); ctx.beginPath(); ctx.arc(0, 0, 25, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = '#4a1510'; ctx.stroke();
      ctx.fillStyle = '#2b0a08'; ctx.beginPath(); ctx.ellipse(-12, 2, 14, 11 + pop * 14, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-22 + i * 7, -6); ctx.lineTo(-18 + i * 7, 2); ctx.lineTo(-15 + i * 7, -6); ctx.fill(); }
      circle(6, -12, 6, '#fff'); circle(7, -12, 3, '#222'); circle(10, 4, 3.2, '#ff8a80'); circle(14, -4, 3.2, '#ff8a80'); ell(-4, -17, 9, 4, -0.5, 'rgba(255,255,255,.28)'); ctx.fillStyle = 'rgba(255,200,180,.4)'; for (const [qx, qy] of [[4, 8], [-4, 14], [14, 12]]) circle(qx, qy, 2.2, ctx.fillStyle); ctx.strokeStyle = '#7a1a10'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(-2, -10); ctx.moveTo(4, -22); ctx.lineTo(8, -18); ctx.stroke();
      ctx.restore(); break;
    }
    case 'seed': { // what the spitter shoots, per world
      const A = ART(G.wi); ctx.save(); ctx.translate(x, o.y); ctx.rotate(o.rot || 0);
      if (A === 1) { circle(0, 0, 10, '#7a2a1a'); ctx.fillStyle = '#d8b090'; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.3) * 9, Math.sin(a - 0.3) * 9); ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); ctx.lineTo(Math.cos(a + 0.3) * 9, Math.sin(a + 0.3) * 9); ctx.fill(); } ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.lineWidth = 2.4; ctx.strokeStyle = '#2a0e08'; ctx.stroke(); ell(-3, -3, 3, 2, 0, 'rgba(255,255,255,.4)'); }
      else if (A === 2 || A === 7) { circle(0, 0, 13, '#fff'); ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.lineWidth = 2.5; ctx.strokeStyle = '#6a8ab8'; ctx.stroke(); ctx.fillStyle = 'rgba(150,190,235,.55)'; ctx.beginPath(); ctx.ellipse(4, 4, 8, 6, 0.6, 0, 7); ctx.fill(); ell(-4, -5, 4, 2.4, 0, 'rgba(255,255,255,.9)'); }
      else if (A === 3) { ctx.save(); ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 16; const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, 14); g.addColorStop(0, '#fff3a0'); g.addColorStop(0.5, '#ff8a20'); g.addColorStop(1, '#8a1a08'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill(); ctx.restore(); ctx.fillStyle = 'rgba(40,16,10,.8)'; ctx.beginPath(); ctx.ellipse(4, -4, 5, 3, 0.5, 0, 7); ctx.fill(); }
      else if (A === 5) { const g = ctx.createRadialGradient(-3, -4, 2, 0, 0, 14); g.addColorStop(0, '#e8fbff'); g.addColorStop(0.6, '#5fd0ea'); g.addColorStop(1, '#1d78c0'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#0a4a80'; ctx.stroke(); ell(-4, -5, 4, 2.4, 0, 'rgba(255,255,255,.85)'); }
      else { circle(0, 0, 13, '#5a3a1a'); ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.lineWidth = 2.5; ctx.strokeStyle = '#1b0f06'; ctx.stroke(); ell(-4, -5, 5, 3, 0.5, 'rgba(255,255,255,.4)'); ctx.strokeStyle = '#2f7a2c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(16, -14); ctx.stroke(); }
      ctx.restore(); ctx.fillStyle = { 1: 'rgba(200,120,60,.35)', 2: 'rgba(200,225,255,.4)', 7: 'rgba(200,225,255,.4)', 3: 'rgba(255,140,40,.4)', 5: 'rgba(120,210,240,.4)' }[A] || 'rgba(95,191,74,.35)'; ctx.beginPath(); ctx.ellipse(x + 26, o.y, 18, 4, 0, 0, 7); ctx.fill(); break;
    }
    case 'meteor': {
      if (o.state === 'wait') { const a = 0.35 + 0.35 * Math.sin(T * 12); ctx.strokeStyle = `rgba(255,70,50,${a + 0.2})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, GROUND + 4, 36, 9, 0, 0, 7); ctx.stroke(); ctx.fillStyle = `rgba(255,70,50,${a * 0.5})`; ctx.fill(); otxt('!', x, GROUND - 30 + Math.sin(T * 10) * 4, 30, '#ff5a3a', '#fff', 5); break; }
      if (o.state === 'fall') { const yy = o.y; const tr = ctx.createLinearGradient(x, yy - 160, x, yy); tr.addColorStop(0, 'rgba(255,120,30,0)'); tr.addColorStop(1, 'rgba(255,170,50,.9)'); ctx.fillStyle = tr; ctx.beginPath(); ctx.moveTo(x - 24, yy); ctx.lineTo(x + 24, yy); ctx.lineTo(x + 6, yy - 170); ctx.lineTo(x - 6, yy - 170); ctx.fill();
        const fg = ctx.createRadialGradient(x, yy, 6, x, yy, 40); fg.addColorStop(0, 'rgba(255,240,170,.95)'); fg.addColorStop(0.5, 'rgba(255,140,40,.6)'); fg.addColorStop(1, 'rgba(255,90,20,0)'); circle(x, yy, 40, fg); // fiery halo
        meteorRock(x, yy, 0.8, 1); break; }
      shadow(x, GROUND + 2, 40, 0.35);
      ctx.fillStyle = 'rgba(30,18,12,.55)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 1, 46, 7, 0, 0, 7); ctx.fill(); // scorched crater rim
      meteorRock(x, GROUND - 22, 1, 0.55 + 0.35 * Math.sin(T * 5 + o.x));
      for (let i = 0; i < 2; i++) { const u = (T * 0.45 + i * 0.5 + o.x * 0.001) % 1; ctx.globalAlpha = 0.35 * (1 - u); circle(x - 6 + i * 12 + Math.sin(u * 6 + i) * 6, GROUND - 46 - u * 50, 8 + u * 14, '#8a8078'); } ctx.globalAlpha = 1; // smoke
      break;
    }
    case 'pad': {
      const sq = (o.sq || 0) / 0.35, k = 1 - Math.sin(clamp(sq, 0, 1) * Math.PI) * 0.35;
      if (ART(G.wi) === 2 || ART(G.wi) === 7) { // bouncy snowball with a face and a scarf
        shadow(x, GROUND + 2, 40, 0.3); ctx.save(); ctx.translate(x, GROUND); ctx.scale(1 + (1 - k) * 0.7, k);
        const g = ctx.createRadialGradient(-10, -42, 4, 0, -28, 34); g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#dcebfb'); g.addColorStop(1, '#9fc0e6'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -28, 28, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#3a5a8a'; ctx.stroke();
        ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(-26, -22); ctx.quadraticCurveTo(0, -12, 26, -22); ctx.lineTo(25, -13); ctx.quadraticCurveTo(0, -3, -25, -13); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7a1414'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) ctx.fillRect(-20 + i * 10, -18 + Math.sin(i) * 1, 4, 6);
        circle(-9, -38, 3.4, '#1a1a22'); circle(9, -38, 3.4, '#1a1a22'); circle(-8, -39.2, 1, '#fff'); circle(10, -39.2, 1, '#fff'); ctx.fillStyle = '#ff8a1c'; ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(15, -31); ctx.lineTo(0, -29); ctx.fill(); ctx.strokeStyle = '#8a4a08'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = '#1a1a22'; for (let i = -2; i <= 2; i++) circle(i * 5, -46 + (i * i) * 0.4 - 0.5, 1.5, '#1a1a22'); ell(-12, -46, 8, 4, -0.5, 'rgba(255,255,255,.7)');
        ctx.restore(); if (Math.sin(T * 5) > 0.2) otxt('↑', x, GROUND - 104, 24, '#ffd34d', '#000', 4); break;
      }
      if (ART(G.wi) === 3) { // bouncy lava bubble
        shadow(x, GROUND + 2, 40, 0.3); ctx.save(); ctx.translate(x, GROUND); ctx.scale(1 + (1 - k) * 0.7, k);
        ctx.save(); ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 20; const g = ctx.createRadialGradient(-8, -38, 3, 0, -26, 30); g.addColorStop(0, '#fff3a0'); g.addColorStop(0.45, '#ff9a24'); g.addColorStop(1, '#c0300a'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -26, 29, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); ctx.lineWidth = 3; ctx.strokeStyle = '#5a1a0a'; ctx.beginPath(); ctx.ellipse(0, -26, 29, 26, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-12, -40, 8, 4.6, -0.5, 0, 7); ctx.fill(); for (let i = 0; i < 4; i++) { const u = (T * 0.8 + i / 4) % 1; ctx.fillStyle = `rgba(255,230,140,${1 - u})`; ctx.beginPath(); ctx.arc(-14 + i * 9, -8 - u * 30, 2 + (1 - u) * 3, 0, 7); ctx.fill(); }
        ctx.fillStyle = 'rgba(70,24,14,.8)'; ctx.beginPath(); ctx.ellipse(0, -2, 24, 5, 0, 0, 7); ctx.fill(); ctx.restore(); ell(x - 30, GROUND - 2, 10, 3, 0, '#3a2018'); ell(x + 30, GROUND - 2, 10, 3, 0, '#3a2018');
        if (Math.sin(T * 5) > 0.2) otxt('↑', x, GROUND - 104, 24, '#ffd34d', '#000', 4); break;
      }
      if (ART(G.wi) === 1) { // springy barrel cactus with a pink flower on top
        shadow(x, GROUND + 2, 44, 0.3); ctx.save(); ctx.translate(x, GROUND); ctx.scale(1 + (1 - k) * 0.7, k);
        const g = vgrad(-54, 0, '#86cc62', '#4f9040', '#2a5a24'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -27, 28, 27, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1f3a18'; ctx.stroke();
        ctx.strokeStyle = 'rgba(20,60,20,.38)'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 5, -53); ctx.quadraticCurveTo(i * 15, -27, i * 9, -1); ctx.stroke(); }
        ctx.fillStyle = '#fff4cf'; for (let i = -2; i <= 2; i++) for (let j = 0; j < 4; j++) { const yy = -46 + j * 13 + (i % 2) * 5, xx = i * 10 * (1 - Math.abs(yy + 27) / 70); ctx.fillRect(xx - 1, yy, 2, 4); ctx.fillRect(xx - 3, yy + 1, 6, 1.4); }
        ell(-11, -38, 6, 12, 0.3, 'rgba(255,255,255,.22)');
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; circle(Math.cos(a) * 9, -54 + Math.sin(a) * 5.4, 6, i % 2 ? '#ff7aa0' : '#ff5a88'); } circle(0, -54, 5.4, '#ffd166'); circle(-1.6, -55.6, 1.8, '#fff3b0');
        ctx.restore(); ell(x - 30, GROUND - 3, 12, 4, 0, '#e8b070'); ell(x + 32, GROUND - 3, 12, 4, 0, '#e8b070');
        if (Math.sin(T * 5) > 0.2) otxt('↑', x, GROUND - 104, 24, '#ffd34d', '#000', 4); break;
      }
      if (ART(G.wi) === 5 || ART(G.wi) === 6) { // bouncy clam: the lid snaps shut when stepped on and springs open again
        const cy = GROUND - 22, open = 0.7 - Math.sin(clamp(sq, 0, 1) * Math.PI) * 0.6;
        shadow(x, GROUND + 2, 44, 0.3);
        ctx.fillStyle = vgrad(cy, GROUND, '#f6d2c4', '#d4907e'); ctx.beginPath(); ctx.ellipse(x, cy, 38, 22 * k, 0, 0, Math.PI); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#8a4a50'; ctx.stroke();
        ctx.strokeStyle = 'rgba(138,74,80,.4)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 1; i < 6; i++) { const a = Math.PI * i / 6; ctx.moveTo(x, cy + 2); ctx.lineTo(x + Math.cos(a) * 34, cy + Math.sin(a) * 19 * k); } ctx.stroke();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(x, cy - 2, 2, x, cy - 2, 36); gl.addColorStop(0, `rgba(255,255,255,${0.55 * open + 0.15})`); gl.addColorStop(1, 'rgba(255,220,240,0)'); ctx.fillStyle = gl; ctx.fillRect(x - 36, cy - 38, 72, 72); ctx.restore();
        circle(x, cy - 3, 9, '#fff'); circle(x - 2.6, cy - 6, 3, 'rgba(255,255,255,.95)'); ctx.strokeStyle = 'rgba(200,170,210,.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, cy - 3, 9, 0.3, 2.2); ctx.stroke();
        ctx.save(); ctx.translate(x + 36, cy); ctx.rotate(open); ctx.fillStyle = vgrad(-34, 0, '#ffe2d6', '#e8a090'); ctx.beginPath(); ctx.ellipse(-36, 0, 38, 26, 0, Math.PI, 0); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#8a4a50'; ctx.stroke();
        ctx.strokeStyle = 'rgba(138,74,80,.45)'; ctx.lineWidth = 1.8; ctx.beginPath(); for (let i = 1; i < 6; i++) { const a = Math.PI + Math.PI * i / 6; ctx.moveTo(-36, -2); ctx.lineTo(-36 + Math.cos(a) * 36, Math.sin(a) * 24); } ctx.stroke(); ell(-48, -16, 12, 4, -0.5, 'rgba(255,255,255,.4)'); ctx.restore();
        if (Math.sin(T * 5) > 0.2) otxt('↑', x, GROUND - 104, 24, '#ffd34d', '#000', 4); break;
      }
      shadow(x, GROUND + 2, 40, 0.3); rr(x - 11, GROUND - 38 * k, 22, 38 * k, 8); ctx.fillStyle = '#f3e7cf'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
      const cy = GROUND - 38 * k, cw = 46 + sq * 10; ctx.beginPath(); ctx.moveTo(x - cw, cy); ctx.bezierCurveTo(x - cw, cy - 62 * k, x + cw, cy - 62 * k, x + cw, cy); ctx.quadraticCurveTo(x, cy + 10, x - cw, cy); ctx.closePath(); ctx.fillStyle = vgrad(cy - 50, cy + 6, '#ff6a5a', '#c62828'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#4a1510'; ctx.stroke();
      ctx.fillStyle = '#fff'; for (const [dx, dy, r] of [[-24, -14, 7], [2, -34, 8], [26, -16, 6], [-4, -14, 5]]) { ctx.beginPath(); ctx.arc(x + dx, cy + dy * k, r, 0, 7); ctx.fill(); }
      if (Math.sin(T * 5) > 0.2) otxt('↑', x, GROUND - 100, 24, '#ffd34d', '#000', 4); break;
    }
    case 'wall': { // a tall wall that only the dash can break
      if (ART(G.wi) === 1) { canyonWall(x, o); if (Math.sin(T * 6) > 0) otxt('FLITZ!', x, GROUND - o.h - 62, 22, '#ffd34d', '#000', 5); break; }
      shadow(x, GROUND + 2, o.w * 0.8, 0.35); const sand = G.wi === 5, c = sand ? '#e8cf8a' : th.rock;
      ctx.fillStyle = vgrad(GROUND - o.h, GROUND, shade(c, 1.25), c, shade(c, 0.7)); ctx.beginPath(); ctx.rect(x - o.w / 2, GROUND - o.h, o.w, o.h); ctx.fill(); rim();
      ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 2; for (let yy = GROUND - o.h + 36; yy < GROUND; yy += 36) { ctx.beginPath(); ctx.moveTo(x - o.w / 2, yy); ctx.lineTo(x + o.w / 2, yy); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(x, GROUND - o.h); ctx.lineTo(x - 6, GROUND - o.h * 0.5); ctx.lineTo(x + 8, GROUND - o.h * 0.25); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(x - o.w / 2, GROUND - o.h, o.w, o.h); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2; for (let r = 0, yy = GROUND - o.h; yy < GROUND; yy += 36, r++) { for (const jx of [r % 2 ? -0.22 : 0.22, r % 2 ? 0.3 : -0.3]) { ctx.beginPath(); ctx.moveTo(x + o.w * jx, yy); ctx.lineTo(x + o.w * jx, yy + 36); ctx.stroke(); } }
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(x - o.w / 2, GROUND - o.h, 4, o.h); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + o.w / 2 - 5, GROUND - o.h, 5, o.h);
      ctx.fillStyle = 'rgba(0,0,0,.1)'; for (const [dx, dy] of [[-0.25, 0.3], [0.2, 0.55], [-0.1, 0.8], [0.28, 0.12]]) { ctx.beginPath(); ctx.ellipse(x + o.w * dx, GROUND - o.h + o.h * dy, 7, 4, 0.3, 0, 7); ctx.fill(); }
      if (G.wi === 0) { ctx.strokeStyle = '#3f9b3a'; ctx.lineWidth = 2.4; for (const vx of [-0.3, 0.1, 0.34]) { ctx.beginPath(); ctx.moveTo(x + o.w * vx, GROUND - o.h); ctx.quadraticCurveTo(x + o.w * vx + 6, GROUND - o.h + 30, x + o.w * vx - 2, GROUND - o.h + 50 + vx * 40); ctx.stroke(); } }
      ctx.restore();
      ctx.fillStyle = vgrad(GROUND - o.h - 18, GROUND - o.h, shade(c, 1.3), c); for (let i = 0; i < 3; i++) ctx.fillRect(x - o.w / 2 + i * (o.w / 3) + 2, GROUND - o.h - 16, o.w / 3 - 5, 16);
      if (sand) { ctx.fillStyle = '#e53935'; ctx.fillRect(x - 1.5, GROUND - o.h - 44, 3, 30); ctx.beginPath(); ctx.moveTo(x + 1, GROUND - o.h - 44); ctx.lineTo(x + 22, GROUND - o.h - 37); ctx.lineTo(x + 1, GROUND - o.h - 30); ctx.fill(); }
      if (Math.sin(T * 6) > 0) otxt('FLITZ!', x, GROUND - o.h - 62, 22, '#ffd34d', '#000', 5);
      break;
    }
    case 'tide': { shadow(x, GROUND + 2, 70, 0.2); const wv = ctx.createLinearGradient(0, GROUND - 130, 0, GROUND); wv.addColorStop(0, '#bff3ff'); wv.addColorStop(0.35, '#4ac0ea'); wv.addColorStop(1, '#1d78c0'); ctx.fillStyle = wv; ctx.beginPath(); ctx.moveTo(x + 50, GROUND); ctx.lineTo(x + 50, GROUND - 40); ctx.quadraticCurveTo(x + 44, GROUND - 130, x - 20, GROUND - 126); ctx.quadraticCurveTo(x - 66, GROUND - 126, x - 74, GROUND - 88); ctx.quadraticCurveTo(x - 40, GROUND - 100, x - 50, GROUND - 60); ctx.quadraticCurveTo(x - 70, GROUND - 20, x - 74, GROUND); ctx.closePath(); ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#0a4a80'; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 6; i++) circle(x - 62 + i * 20 + Math.sin(T * 8 + i) * 3, GROUND - 120 + (i % 2) * 8 + Math.sin(T * 6 + i) * 3, 7, '#fff'); break; }
    case 'rollrock': { shadow(x, GROUND + 2, 34, 0.3); ctx.save(); ctx.translate(x, GROUND - 32); ctx.rotate(o.rot || 0); circle(0, 0, 32, th.rock); ctx.beginPath(); ctx.arc(0, 0, 32, 0, 7); rim(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(0, 4); ctx.lineTo(14, -14); ctx.moveTo(0, 4); ctx.lineTo(6, 22); ctx.stroke(); ctx.restore(); break; }
    case 'urchin': { shadow(x, GROUND + 2, 26, 0.3); ctx.save(); ctx.translate(x, GROUND - 22); ctx.strokeStyle = '#2a1840'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); ctx.stroke(); } circle(0, 0, 14, '#5a2a8a'); ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.strokeStyle = '#1a0a30'; ctx.lineWidth = 3; ctx.stroke(); circle(-4, -5, 4, 'rgba(255,255,255,.3)'); ctx.fillStyle = '#c880f0'; for (let i = 0; i < 14; i += 2) { const a = i / 14 * Math.PI * 2; circle(Math.cos(a) * 24, Math.sin(a) * 24, 1.8, '#d9a0f8'); } ctx.restore(); break; }
    case 'jelly': { const y = o.y || o.y0, pu = 1 + 0.1 * Math.sin(T * 5 + o.ph); ctx.save(); ctx.translate(x, y); ctx.scale(1 / pu, pu); ctx.fillStyle = 'rgba(255,150,200,.9)'; ctx.beginPath(); ctx.moveTo(-26, 4); ctx.bezierCurveTo(-28, -34, 28, -34, 26, 4); ctx.quadraticCurveTo(14, 10, 0, 4); ctx.quadraticCurveTo(-14, 10, -26, 4); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#8a2a6a'; ctx.stroke(); ctx.strokeStyle = 'rgba(255,190,225,.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 9, 6); ctx.quadraticCurveTo(i * 9 + Math.sin(T * 4 + i) * 6, 22, i * 9 - Math.sin(T * 3 + i) * 5, 38); ctx.stroke(); } circle(-8, -12, 4, 'rgba(255,255,255,.6)'); circle(-9, -6, 2.4, '#222'); circle(9, -6, 2.4, '#222'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const [qx, qy, qp] of [[-14, -18, 0], [4, -24, 1.4], [14, -12, 2.6], [-2, -8, 3.8]]) { ctx.globalAlpha = 0.45 + 0.35 * Math.sin(T * 3 + qp); circle(qx, qy, 3, '#ffe0f4'); } ctx.restore(); ctx.strokeStyle = 'rgba(138,42,106,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -4, 17, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.restore(); break; }
    case 'sword': { const y = o.y, al = o.alpha == null ? 1 : Math.max(0, o.alpha); ctx.globalAlpha = al; ctx.save(); ctx.translate(x, y); ctx.scale(o.scared ? 1 : -1, 1); ctx.fillStyle = vgrad(-14, 14, '#9ab8d8', '#4f78a8'); ctx.beginPath(); ctx.ellipse(0, 0, 34, 13, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#4f78a8'; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-46, -14); ctx.lineTo(-44, 0); ctx.lineTo(-46, 14); ctx.fill(); ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(0, -26); ctx.lineTo(10, -10); ctx.fill(); ctx.fillStyle = '#dfe8f4'; ctx.beginPath(); ctx.moveTo(32, -2); ctx.lineTo(84, 0); ctx.lineTo(32, 3); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#1b2a44'; ctx.beginPath(); ctx.ellipse(0, 0, 34, 13, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(27,42,68,.35)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-18 + i * 9, -11 + i * 0.8); ctx.quadraticCurveTo(-20 + i * 9, 0, -18 + i * 9, 11 - i * 0.8); ctx.stroke(); } ell(-4, 5, 18, 4, 0, 'rgba(235,245,255,.55)'); circle(20, -3, 5, '#fff'); circle(21.5, -3, 2.6, '#222'); ctx.strokeStyle = '#1b2a44'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(14, -10); ctx.lineTo(27, -6); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; break; }
    case 'cgate': { const seg = (y0, y1, up) => { // reef pillar: rocky column with coral ridges, barnacles and a living cap
        ctx.fillStyle = hgrad(x - 30, x + 30, '#6d4a56', '#b5788a', '#5a3a48'); ctx.beginPath(); ctx.moveTo(x - 27, y0); ctx.lineTo(x + 27, y0); ctx.lineTo(x + 31, (y0 + y1) / 2); ctx.lineTo(x + 27, y1); ctx.lineTo(x - 27, y1); ctx.lineTo(x - 31, (y0 + y1) / 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2f1a26'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 2; for (let yy = y0 + 18; yy < y1; yy += 34) { ctx.beginPath(); ctx.moveTo(x - 26, yy); ctx.quadraticCurveTo(x, yy + 8, x + 26, yy - 4); ctx.stroke(); }
        for (let yy = y0 + 22; yy < y1; yy += 38) { circle(x - 14 + ((yy * 7) % 24), yy, 4, 'rgba(255,214,200,.5)'); } };
      seg(-30, o.gapY); seg(o.gapY + o.gapH, GROUND + 20);
      for (const [yy, up] of [[o.gapY, 1], [o.gapY + o.gapH, -1]]) { // branching coral and anemone fingers at the lips of the gap
        for (let i = -2; i <= 2; i++) { const bx = x + i * 11, ln = 14 + ((i + 2) % 3) * 6, sw = Math.sin(T * 2 + i) * 3; ctx.strokeStyle = i % 2 ? '#ff8a6a' : '#ffb347'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, yy); ctx.quadraticCurveTo(bx + sw, yy + up * ln * 0.5, bx + sw * 1.6, yy + up * ln); ctx.stroke(); circle(bx + sw * 1.6, yy + up * ln, 4, '#ffe1c8'); }
        ctx.lineCap = 'butt'; }
      break; }
    case 'updraft': { ctx.save(); // a soft column of rising air: feathered at the sides and fading out towards the top, with chevrons that rise and fade
      const cg = ctx.createLinearGradient(x - o.w / 2, 0, x + o.w / 2, 0); cg.addColorStop(0, 'rgba(255,255,255,0)'); cg.addColorStop(0.5, 'rgba(255,255,255,1)'); cg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = cg;
      for (let b = 0; b < 22; b++) { ctx.globalAlpha = 0.46 * Math.pow(1 - b / 22, 1.2); ctx.fillRect(x - o.w / 2, GROUND - (b + 1) * 15, o.w, 15); }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < 9; i++) { const q = ((T * 1.7 + i / 9) % 1), yy = GROUND - q * 330, xx = x + Math.sin(q * 9 + i * 2) * (o.w * 0.34); ctx.globalAlpha = 0.8 * Math.sin(q * Math.PI); ctx.beginPath(); ctx.moveTo(xx - 7, yy + 9); ctx.lineTo(xx, yy); ctx.lineTo(xx + 7, yy + 9); ctx.stroke(); }
      ctx.restore(); break; }
    case 'geode': {
      ell(x, GROUND + 2, 40, 6, 0, 'rgba(0,0,0,.25)');
      ctx.fillStyle = vgrad(GROUND - 44, GROUND, '#a8a8b0', '#6e6e78', '#4a4a52'); ctx.beginPath(); ctx.moveTo(x - 38, GROUND); ctx.quadraticCurveTo(x - 40, GROUND - 40, x, GROUND - 44); ctx.quadraticCurveTo(x + 40, GROUND - 40, x + 38, GROUND); ctx.closePath(); ctx.fill(); rim();
      ctx.strokeStyle = 'rgba(30,30,35,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, GROUND - 44); ctx.lineTo(x + 4, GROUND - 28); ctx.lineTo(x - 6, GROUND - 18); ctx.lineTo(x + 2, GROUND - 4); ctx.moveTo(x + 4, GROUND - 28); ctx.lineTo(x + 20, GROUND - 22); ctx.stroke();
      for (const [ax, ay] of [[-16, -20], [14, -12], [-4, -30]]) { ctx.globalAlpha = 0.7 + 0.3 * Math.sin(T * 5 + ax); drawAmber(x + ax, GROUND + ay, 6); } ctx.globalAlpha = 1;
      const by = GROUND - 66 - Math.abs(Math.sin(T * 5)) * 8; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(x - 10, by - 10); ctx.lineTo(x + 10, by - 10); ctx.lineTo(x, by + 4); ctx.fill();
      break;
    }
    case 'compy': if (o.crab) { drawSmallCrab(x, GROUND + (o.yOff || 0), o); break; } if (!o.yOff) shadow(x, GROUND + 2, 22, 0.22); oCompy(x, GROUND + (o.yOff || 0), 1.3, o.ph, !o.scared, { alpha: o.alpha, flat: o.flat > 0, tone: worldCompy() }); break;
    case 'raptor': if (!o.yOff) shadow(x, GROUND + 2, 34, 0.25 * (o.alpha == null ? 1 : Math.max(0, o.alpha))); oRaptor(x, GROUND + (o.yOff || 0), 1.05, o.ph, !o.scared, Object.assign({ alpha: o.alpha }, worldRaptor())); break;
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
function drawHopperAlt(o, x, hy, by, flat) { // the hopping enemy fits its world: desert jerboa, penguin, magma blob, crab, pika (the frog stays in the jungle)
  const A = ART(G.wi), f = hy > 12 ? 1 : 0;
  ctx.save(); if (o.alpha != null) ctx.globalAlpha = clamp(o.alpha, 0, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  shadow(x, GROUND + 2, 26 - hy * 0.08, 0.3);
  if (A === 5) { // crab
    if (flat) { drawSmallCrab(x, GROUND, { flat: 1, yOff: 1, ph: o.hp || 0 }); ctx.restore(); return; }
    ctx.translate(x, by); ctx.scale(0.8, 0.8 + (hy < 12 ? 0.06 : -hy * 0.0006)); drawSmallCrab(0, 0, { ph: o.hp || 0, yOff: 1 }); ctx.restore(); return;
  }
  const FL = { 1: ['#d9a56a', '#7a5230'], 2: ['#2a3550', '#141c2c'], 3: ['#ff7a24', '#5a1a0a'], 7: ['#a58a72', '#4a3a2c'] }[A] || ['#55b84a', '#1b2a14'];
  if (flat) { ell(x, GROUND - 8, 34, 9, 0, FL[0]); ell(x, GROUND - 10, 20, 5, 0, shade(FL[0], 1.4)); circle(x - 14, GROUND - 14, 5, '#fff'); circle(x + 14, GROUND - 14, 5, '#fff'); ctx.restore(); return; }
  const st = 1 + (hy < 12 ? 0.12 : 0) - hy * 0.0012; ctx.translate(x, by); ctx.scale(1 / st, st);
  const body = (cx, cy, rx, ry, rot, c1, c2) => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, 7); ctx.fillStyle = vgrad(cy - ry, cy + ry, c1, c2); ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = FL[1]; ctx.stroke(); };
  const eye = (ex, ey, r, ps) => { circle(ex, ey, r, '#fff'); ctx.lineWidth = 1.6; ctx.strokeStyle = FL[1]; ctx.beginPath(); ctx.arc(ex, ey, r, 0, 7); ctx.stroke(); circle(ex + ps, ey + 0.5, r * 0.55, '#14100c'); circle(ex + ps + 1.2, ey - 1.2, r * 0.22, '#fff'); };
  if (A === 1) { // jerboa: big ears, long tail with a tuft, very long hind legs
    ctx.strokeStyle = FL[1]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -18); ctx.quadraticCurveTo(-38, -8 - hy * 0.05, -46 + Math.sin(T * 8) * 2, -34); ctx.stroke(); circle(-46, -35, 5, '#3b2616'); circle(-45, -36.5, 2.8, '#fff');
    ctx.strokeStyle = FL[1]; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-4, -15); ctx.lineTo(-17, -7); ctx.lineTo(f ? -28 : -15, f ? -1 : 0); ctx.stroke(); ctx.strokeStyle = '#d9a56a'; ctx.lineWidth = 4.6; ctx.stroke();
    body(0, -24, 16, 13, -0.2, '#e8c08a', '#c9915a'); ell(5, -18, 10, 6.5, -0.2, '#f6e2bf');
    ell(8, -50, 4.6, 14, -0.2, '#d9a56a'); ell(18, -51, 4.6, 14, 0.18, '#d9a56a'); ell(8, -50, 2.2, 9.5, -0.2, '#f4a6b8'); ell(18, -51, 2.2, 9.5, 0.18, '#f4a6b8');
    body(14, -33, 10.5, 9.5, 0, '#e8c08a', '#c9915a'); eye(19, -35, 3.6, 1); circle(25, -31, 2, '#e88aa0'); ctx.strokeStyle = 'rgba(70,40,20,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(23, -30); ctx.lineTo(31, -33); ctx.moveTo(23, -29); ctx.lineTo(31, -27.5); ctx.stroke(); ell(15, -28, 3.4, 2, 0, 'rgba(255,150,130,.4)');
    ctx.strokeStyle = FL[1]; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(8, -22); ctx.lineTo(14, f ? -26 : -16); ctx.stroke();
  } else if (A === 2) { // rockhopper penguin
    ctx.fillStyle = '#ff9a2a'; ctx.strokeStyle = '#8a4a08'; ctx.lineWidth = 2; for (const fx of [-7, 8]) { ctx.beginPath(); ctx.ellipse(fx, f ? -5 : -2, 7, 3.2, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    body(0, -26, 16, 22, 0, '#3e4c70', '#1c2540'); ell(3, -23, 10.5, 16, 0, '#f4f8ff'); ell(0, -16, 9, 6, 0, '#e2ecf8');
    ctx.fillStyle = '#2a3550'; ctx.strokeStyle = FL[1]; ctx.lineWidth = 2.2; const fa = f ? -0.9 : -0.35; ctx.save(); ctx.translate(-14, -32); ctx.rotate(fa); ctx.beginPath(); ctx.ellipse(-3, 8, 5, 13, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
    body(2, -48, 11, 10.5, 0, '#3e4c70', '#1c2540');
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3; for (const [a, b2, c2, d2] of [[-3, -54, -15, -63], [3, -56, -9, -66], [-5, -50, -17, -54]]) { ctx.beginPath(); ctx.moveTo(a, b2); ctx.lineTo(c2, d2); ctx.stroke(); } ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(4, -55); ctx.lineTo(14, -52); ctx.stroke();
    eye(8, -49, 3.8, 1); circle(8.8, -49.5, 1.7, '#d63a2a'); ctx.fillStyle = '#ff9a2a'; ctx.strokeStyle = '#8a4a08'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(11, -46); ctx.quadraticCurveTo(20, -46, 23, -42.5); ctx.quadraticCurveTo(18, -41, 11, -41.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (A === 3) { // magma blob
    ctx.save(); ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 16; const g = ctx.createRadialGradient(-4, -30, 3, 0, -22, 28); g.addColorStop(0, '#ffe27a'); g.addColorStop(0.5, '#ff7a24'); g.addColorStop(1, '#b42a0a'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -21, 24, 20, 0, 0, 7); ctx.fill(); ctx.restore(); ctx.lineWidth = 2.6; ctx.strokeStyle = FL[1]; ctx.beginPath(); ctx.ellipse(0, -21, 24, 20, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(40,20,16,.9)'; for (const [cx2, cy2, rx2, ry2, r2] of [[-9, -34, 9, 4.6, -0.3], [10, -31, 7, 4, 0.3], [0, -39, 5, 2.6, 0]]) { ctx.beginPath(); ctx.ellipse(cx2, cy2, rx2, ry2, r2, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-18, -14); ctx.lineTo(-10, -18); ctx.lineTo(-13, -8); ctx.moveTo(15, -12); ctx.lineTo(9, -17); ctx.stroke();
    for (const [fx2, ph2] of [[-9, 0], [0, 1.7], [9, 3.1]]) { const fl = 0.6 + 0.4 * Math.sin(T * 9 + ph2); ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(fx2 - 4, -38); ctx.quadraticCurveTo(fx2 - 5, -44 * fl - 4, fx2, -48 * fl - 6); ctx.quadraticCurveTo(fx2 + 5, -42 * fl - 2, fx2 + 4, -38); ctx.fill(); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.moveTo(fx2 - 2, -38); ctx.quadraticCurveTo(fx2, -42 * fl, fx2 + 2, -38); ctx.fill(); }
    eye(-8, -22, 5.4, 1.4); eye(8, -22, 5.4, 1.4); ctx.strokeStyle = '#3a0f08'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-14, -31); ctx.lineTo(-3, -27); ctx.moveTo(14, -31); ctx.lineTo(3, -27); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-3, -13); ctx.lineTo(0, -10); ctx.lineTo(3, -13); ctx.lineTo(6, -10); ctx.stroke(); ctx.fillStyle = '#3a1a10'; for (const fx of [-10, 10]) { ctx.beginPath(); ctx.ellipse(fx, f ? -4 : -1, 7, 3.6, 0, 0, 7); ctx.fill(); }
  } else { // pika (mountains)
    ctx.fillStyle = '#8a7058'; ctx.strokeStyle = FL[1]; ctx.lineWidth = 2; for (const fx of [-8, 8]) { ctx.beginPath(); ctx.ellipse(fx, f ? -4 : -2, 7, 3.4, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    body(0, -20, 16, 14, 0, '#b8a08a', '#8a7058'); ell(4, -15, 10, 8, 0, '#e8d8c4');
    circle(4, -44, 5.8, '#a58a72'); circle(16, -46, 5.8, '#a58a72'); ctx.strokeStyle = FL[1]; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(4, -44, 5.8, 0, 7); ctx.arc(16, -46, 5.8, 0, 7); ctx.stroke(); circle(4, -44, 3, '#f4a6b8'); circle(16, -46, 3, '#f4a6b8');
    body(10, -32, 11.5, 10.5, 0, '#c4ac96', '#9a8068'); eye(15, -33, 3.4, 1); circle(21, -30, 1.9, '#3a2a22'); ell(14, -26.5, 4, 2.4, 0, 'rgba(255,150,140,.45)'); ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(19.5, -28, 3, 0.4, 1.8); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,40,30,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20, -29); ctx.lineTo(28, -31); ctx.moveTo(20, -28); ctx.lineTo(28, -26); ctx.stroke(); ctx.strokeStyle = FL[1]; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(13, f ? -24 : -16); ctx.stroke();
  }
  ctx.restore();
}
function canyonWall(x, o) { // a tall banded sandstone spire: cave paintings, a glowing crack that begs to be smashed, rubble and a dry bush on top
  const w = o.w + 26, h = o.h, b = GROUND, pul = 0.6 + 0.4 * Math.sin(T * 4);
  shadow(x, b + 2, w * 0.95, 0.35);
  const pts = [[-w / 2 - 8, 0], [-w / 2 + 2, -h * 0.35], [-w / 2 - 2, -h * 0.62], [-w / 2 + 6, -h * 0.9], [-w * 0.22, -h - 4], [w * 0.05, -h + 8], [w * 0.28, -h - 10], [w / 2 - 4, -h * 0.88], [w / 2 + 2, -h * 0.6], [w / 2 - 2, -h * 0.3], [w / 2 + 8, 0]];
  const path = () => { ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(x + px, b + py) : ctx.moveTo(x + px, b + py)); ctx.closePath(); };
  ctx.save(); path(); ctx.clip();
  const cols = ['#f0c898', '#dca36d', '#c97a48', '#e9b583', '#b96a3c', '#d6935c', '#a85a32', '#e2b27e'];
  for (let i = 0, yy = b - h - 20; yy < b + 6; i++, yy += 17 + (i % 3) * 5) { ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.moveTo(x - w, yy); for (let q = -w; q <= w; q += 12) ctx.lineTo(x + q, yy + Math.sin(q * 0.07 + i) * 2.4 + q * 0.02); ctx.lineTo(x + w, yy + 30); ctx.lineTo(x - w, yy + 30); ctx.closePath(); ctx.fill(); }
  const sh = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); sh.addColorStop(0, 'rgba(255,240,210,.35)'); sh.addColorStop(0.45, 'rgba(255,240,210,0)'); sh.addColorStop(1, 'rgba(60,20,10,.4)'); ctx.fillStyle = sh; ctx.fillRect(x - w, b - h - 20, w * 2, h + 30);
  // cave paintings: a sun, a little dino and handprints in red ochre
  ctx.strokeStyle = 'rgba(120,36,18,.8)'; ctx.fillStyle = 'rgba(120,36,18,.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const sy = b - h * 0.78; ctx.beginPath(); ctx.arc(x - 4, sy, 7, 0, 7); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x - 4 + Math.cos(a) * 10, sy + Math.sin(a) * 10); ctx.lineTo(x - 4 + Math.cos(a) * 15, sy + Math.sin(a) * 15); ctx.stroke(); }
  const dy = b - h * 0.6; ctx.beginPath(); ctx.ellipse(x - 2, dy, 10, 5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 7, dy - 2); ctx.lineTo(x + 15, dy - 11); ctx.lineTo(x + 20, dy - 10); ctx.stroke(); for (const lx of [-8, -2, 4]) { ctx.beginPath(); ctx.moveTo(x + lx, dy + 3); ctx.lineTo(x + lx - 1, dy + 11); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(x - 11, dy); ctx.lineTo(x - 22, dy + 4); ctx.stroke();
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - 6 + i * 4, b - h * 0.36); ctx.lineTo(x - 6 + i * 4, b - h * 0.36 - 9 - (i % 2) * 3); ctx.stroke(); } ctx.beginPath(); ctx.ellipse(x - 1, b - h * 0.36 + 3, 8, 5, 0, 0, 7); ctx.fill();
  // the glowing crack
  const crack = [[0, -h - 2], [-6, -h * 0.82], [4, -h * 0.66], [-5, -h * 0.5], [5, -h * 0.34], [-2, -h * 0.18], [0, 0]];
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const [lw2, a2] of [[16, 0.12], [9, 0.22]]) { ctx.strokeStyle = `rgba(255,170,60,${a2 * pul})`; ctx.lineWidth = lw2; ctx.beginPath(); crack.forEach(([cx2, cy2], i) => i ? ctx.lineTo(x + cx2, b + cy2) : ctx.moveTo(x + cx2, b + cy2)); ctx.stroke(); } ctx.restore();
  ctx.strokeStyle = '#2a1008'; ctx.lineWidth = 5; ctx.beginPath(); crack.forEach(([cx2, cy2], i) => i ? ctx.lineTo(x + cx2, b + cy2) : ctx.moveTo(x + cx2, b + cy2)); ctx.moveTo(x + 4, b - h * 0.66); ctx.lineTo(x + 15, b - h * 0.6); ctx.moveTo(x - 5, b - h * 0.5); ctx.lineTo(x - 16, b - h * 0.44); ctx.stroke();
  ctx.save(); ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 10 * pul; ctx.strokeStyle = `rgba(255,${200 + 40 * pul | 0},100,${0.7 + 0.3 * pul})`; ctx.lineWidth = 2.4; ctx.beginPath(); crack.forEach(([cx2, cy2], i) => i ? ctx.lineTo(x + cx2, b + cy2) : ctx.moveTo(x + cx2, b + cy2)); ctx.moveTo(x + 4, b - h * 0.66); ctx.lineTo(x + 15, b - h * 0.6); ctx.moveTo(x - 5, b - h * 0.5); ctx.lineTo(x - 16, b - h * 0.44); ctx.stroke(); ctx.restore();
  ctx.restore();
  path(); ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = '#4a1e0e'; ctx.stroke();
  // rubble at the foot, dust drifting up out of the crack, a dry bush and a little cactus on top
  for (const [rx, ry, rr2] of [[-w / 2 - 14, -4, 9], [-w / 2 - 2, -2, 6], [w / 2 + 12, -3, 8], [w / 2 + 24, -2, 5], [-w / 2 - 26, -2, 5]]) { ell(x + rx, b + ry, rr2, rr2 * 0.65, 0, '#b96a3c'); ell(x + rx - 2, b + ry - 2, rr2 * 0.5, rr2 * 0.3, 0, '#e2b27e'); }
  for (let i = 0; i < 6; i++) { const u = (T * 0.45 + i / 6) % 1; circle(x + (hash(i * 3.3) - 0.5) * 18, b - h * 0.2 - u * h * 0.5, 2 + u * 3, `rgba(255,225,180,${(1 - u) * 0.45})`); }
  cactus(x + w * 0.14, b - h + 2, 28, '#5f7a2a', 11);
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x - w * 0.22, b - h - 2); ctx.quadraticCurveTo(x - w * 0.22 + i * 5, b - h - 12, x - w * 0.22 + i * 8, b - h - 16 + Math.abs(i) * 3); ctx.stroke(); }
}
function drawSpitter(o, x) { // the world's spitting enemy: scorpion, snowman, yeti, mini volcano, anemone (the plant stays in the jungle)
  const A = ART(G.wi), pop = o.pop || 0, k = clamp(pop / 0.3, 0, 1);
  shadow(x, GROUND + 2, 34, 0.3); ctx.save(); ctx.translate(x, GROUND); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (A === 1) { // scorpion
    const C = '#cf8c4c', D = '#5a3014'; ctx.strokeStyle = D; ctx.lineWidth = 3.4; for (let i = 0; i < 4; i++) for (const o2 of [0, 5]) { ctx.beginPath(); ctx.moveTo(-10 + i * 9 + o2, -12); ctx.lineTo(-15 + i * 9 + o2 + Math.sin(T * 9 + i) * 2, -3); ctx.lineTo(-17 + i * 9 + o2, 0); ctx.stroke(); }
    ctx.strokeStyle = D; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(18, -14); ctx.bezierCurveTo(44, -22 - 8 * k, 40, -66 - 16 * k, 10, -62 - 14 * k); ctx.stroke(); ctx.strokeStyle = C; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = '#8a1a10'; ctx.beginPath(); ctx.moveTo(14, -66 - 14 * k); ctx.lineTo(0, -54 - 14 * k); ctx.lineTo(4, -64 - 14 * k); ctx.fill(); ctx.strokeStyle = D; ctx.lineWidth = 1.6; ctx.stroke(); circle(14, -62 - 14 * k, 6, C);
    ell(0, -16, 24, 11, 0, vgrad(-28, -4, '#e6a868', C, '#9a5a28')); ctx.strokeStyle = D; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, -16, 24, 11, 0, 0, 7); ctx.stroke(); ctx.lineWidth = 1.4; ctx.beginPath(); for (const bx of [-8, 0, 8, 16]) { ctx.moveTo(bx, -26); ctx.lineTo(bx - 1, -6); } ctx.stroke();
    ell(-23, -17, 10, 9, 0, C); ctx.beginPath(); ctx.ellipse(-23, -17, 10, 9, 0, 0, 7); ctx.stroke(); circle(-27, -21, 3, '#fff'); circle(-28, -21, 1.6, '#111'); ctx.strokeStyle = D; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-32, -26); ctx.lineTo(-23, -22); ctx.stroke();
    for (const sd of [-1, 1]) { const ay = -14 + sd * 5; ctx.strokeStyle = D; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-26, ay); ctx.lineTo(-38, ay - 8 - 6 * k * (sd < 0 ? 1 : 0.5)); ctx.stroke(); ctx.fillStyle = C; ctx.beginPath(); ctx.ellipse(-44, ay - 10 - 6 * k * (sd < 0 ? 1 : 0.5), 9, 5, -0.5 + sd * 0.45, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.stroke(); }
  } else if (A === 2 || A === 7) { // snowman (ice) or yeti (mountains)
    if (A === 2) {
      ctx.save(); ctx.rotate(-0.1 * k); const g = ctx.createRadialGradient(-8, -30, 3, 0, -26, 28); g.addColorStop(0, '#fff'); g.addColorStop(1, '#bcd6f0'); ctx.fillStyle = g; ctx.strokeStyle = '#6a8ab8'; ctx.lineWidth = 2.6;
      circle(0, -20, 21, g); ctx.beginPath(); ctx.arc(0, -20, 21, 0, 7); ctx.stroke(); circle(0, -50, 16, g); ctx.beginPath(); ctx.arc(0, -50, 16, 0, 7); ctx.stroke(); circle(-2, -73, 12, g); ctx.beginPath(); ctx.arc(-2, -73, 12, 0, 7); ctx.stroke();
      ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(-14, -62); ctx.quadraticCurveTo(-2, -56, 11, -62); ctx.lineTo(10, -56); ctx.quadraticCurveTo(-2, -50, -12, -56); ctx.fill(); ctx.strokeStyle = '#7a1414'; ctx.lineWidth = 1.6; ctx.stroke(); rr(8, -62, 6, 18, 3); ctx.fillStyle = '#d63a3a'; ctx.fill(); ctx.stroke();
      circle(-8, -76, 2.6, '#1a1a22'); circle(3, -76, 2.6, '#1a1a22'); ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-13, -82); ctx.lineTo(-5, -78); ctx.moveTo(8, -82); ctx.lineTo(1, -78); ctx.stroke(); ctx.fillStyle = '#ff8a1c'; ctx.beginPath(); ctx.moveTo(-8, -72); ctx.lineTo(-24, -69); ctx.lineTo(-8, -67); ctx.fill(); ctx.strokeStyle = '#8a4a08'; ctx.lineWidth = 1.4; ctx.stroke(); for (let i = -2; i <= 2; i++) circle(-3 + i * 3.4, -64 + (i * i) * 0.5, 1.2, '#1a1a22'); for (const by of [-26, -14]) circle(0, by, 2.4, '#1a1a22');
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-12, -54); ctx.lineTo(-34, -62 - 16 * k); ctx.moveTo(-34, -62 - 16 * k); ctx.lineTo(-42, -64 - 20 * k); ctx.moveTo(-34, -62 - 16 * k); ctx.lineTo(-40, -56 - 12 * k); ctx.moveTo(12, -50); ctx.lineTo(30, -40); ctx.stroke(); ctx.restore();
      if (k < 0.6) circle(-36, -66 - 16 * k, 8, '#fff');
    } else {
      ctx.fillStyle = vgrad(-62, 0, '#ffffff', '#dcebfb', '#a8c4e4'); ctx.strokeStyle = '#6a8ab8'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-24, -4); for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; ctx.lineTo(Math.cos(a) * 26 * -1 * -1, -34 + Math.sin(a) * 34 + (i % 2 ? 0 : 4)); } ctx.lineTo(24, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9ccdf0'; ctx.beginPath(); ctx.ellipse(-8, -48, 14, 12, 0, 0, 7); ctx.fill(); ctx.stroke(); circle(-14, -52, 4, '#fff'); circle(-3, -53, 4, '#fff'); circle(-15, -52, 2, '#d8a010'); circle(-4, -53, 2, '#d8a010'); circle(-15.4, -52, 1, '#111'); circle(-4.4, -53, 1, '#111'); ctx.strokeStyle = '#1a2a44'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-20, -60); ctx.lineTo(-11, -55); ctx.moveTo(4, -61); ctx.lineTo(-3, -56); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-15, -42); ctx.lineTo(-12, -35); ctx.lineTo(-9, -42); ctx.moveTo(-8, -42); ctx.lineTo(-5, -35); ctx.lineTo(-2, -42); ctx.fill(); ctx.strokeStyle = '#2a3a58'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#f0f6ff'; ctx.strokeStyle = '#6a8ab8'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(-26, -30 - 14 * k, 8, 15, 0.4 + 0.5 * k, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(22, -26, 8, 14, -0.3, 0, 7); ctx.fill(); ctx.stroke(); if (k < 0.6) circle(-30, -48 - 12 * k, 9, '#fff'); ctx.fillStyle = '#9ab8d8'; for (const fx of [-10, 12]) { ctx.beginPath(); ctx.ellipse(fx, -3, 10, 5, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    }
  } else if (A === 3) { // mini volcano
    const g = ctx.createLinearGradient(0, -60, 0, 0); g.addColorStop(0, '#5a3a34'); g.addColorStop(1, '#1a0e0c'); ctx.fillStyle = g; ctx.strokeStyle = '#ff9a40'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-14, -58); ctx.lineTo(14, -58); ctx.lineTo(34, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 12; ctx.fillStyle = '#ff9a24'; ctx.beginPath(); ctx.ellipse(0, -58, 15, 5.4, 0, 0, 7); ctx.fill(); ctx.restore(); ctx.strokeStyle = `rgba(255,${130 + 60 * Math.sin(T * 5) | 0},40,.9)`; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-6, -54); ctx.lineTo(-10, -34); ctx.lineTo(-6, -14); ctx.moveTo(8, -54); ctx.lineTo(13, -38); ctx.stroke();
    circle(-8, -36, 5, '#fff'); circle(8, -36, 5, '#fff'); circle(-9, -35.5, 2.4, '#111'); circle(7, -35.5, 2.4, '#111'); ctx.strokeStyle = '#1a0a06'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-15, -44); ctx.lineTo(-4, -40); ctx.moveTo(15, -44); ctx.lineTo(4, -40); ctx.stroke(); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-8, -22); ctx.lineTo(-4, -26); ctx.lineTo(0, -22); ctx.lineTo(4, -26); ctx.lineTo(8, -22); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fl = 0.4 + k * 0.9 + 0.1 * Math.sin(T * 12); const gr = ctx.createRadialGradient(0, -64, 2, 0, -64, 36 * fl + 10); gr.addColorStop(0, 'rgba(255,240,170,.9)'); gr.addColorStop(1, 'rgba(255,110,20,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -64, 36 * fl + 10, 0, 7); ctx.fill(); ctx.restore();
  } else { // anemone (beach)
    ell(0, -6, 24, 10, 0, '#b86ad0'); ctx.strokeStyle = '#5a2a78'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, -6, 24, 10, 0, 0, 7); ctx.stroke();
    for (let i = 0; i < 13; i++) { const a = -0.15 - i / 12 * (Math.PI - 0.3), len = 24 + 10 * k, wv = Math.sin(T * 5 + i) * 4; ctx.strokeStyle = i % 2 ? '#ff7aa8' : '#ffa05a'; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, -10 + Math.sin(a) * 6); ctx.quadraticCurveTo(Math.cos(a) * len + wv, -14 + Math.sin(a) * len * 0.8, Math.cos(a) * (len + 12) + wv * 1.4, -12 + Math.sin(a) * (len + 6)); ctx.stroke(); circle(Math.cos(a) * (len + 12) + wv * 1.4, -12 + Math.sin(a) * (len + 6), 3, '#ffe0f0'); }
    ell(0, -24, 15, 13, 0, vgrad(-38, -10, '#ff9ac0', '#d85a90')); ctx.strokeStyle = '#7a1a4a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, -24, 15, 13, 0, 0, 7); ctx.stroke(); circle(-6, -28, 4.6, '#fff'); circle(5, -28, 4.6, '#fff'); circle(-7, -27.6, 2.3, '#111'); circle(4, -27.6, 2.3, '#111'); ctx.strokeStyle = '#4a0a2a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-12, -35); ctx.lineTo(-3, -31); ctx.moveTo(11, -35); ctx.lineTo(3, -31); ctx.stroke(); ell(-7, -18 + 1, 5 + 4 * k, 3 + 4 * k, 0, '#4a0a2a');
  }
  ctx.restore();
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
  } else if (wi === 2 || wi === 4) { // frozen rock hanging from above, ice slab with icicles (also in the Christmas night)
    ctx.fillStyle = hgrad(x0 + 30, x0 + w - 30, '#4d6a8f', '#33496a', '#22324a'); ctx.beginPath(); ctx.moveTo(x0 + 34, -10); ctx.lineTo(x0 + w - 30, -10); ctx.lineTo(x0 + w - 44, b - 70); ctx.lineTo(x0 + 48, b - 60); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let y = 40; y < b - 80; y += 70) ell(x0 + w / 2 - 8, y, 18, 5, 0.2, 'rgba(255,255,255,.7)');
    rr(x0 - 12, b - 52, w + 24, 46, 14); ctx.fillStyle = vgrad(b - 52, b - 6, '#ffffff', '#bfe0fa', '#7fb0dd'); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 10, b - 40); ctx.lineTo(x0 + 40, b - 20); ctx.moveTo(x0 + w - 40, b - 44); ctx.lineTo(x0 + w - 20, b - 24); ctx.stroke();
    ctx.fillStyle = 'rgba(210,235,255,.95)'; for (let i = 0; i < 8; i++) { const ix = x0 - 4 + i * (w + 8) / 7, len = 10 + (i % 3) * 7; ctx.beginPath(); ctx.moveTo(ix - 6, b - 10); ctx.lineTo(ix + 6, b - 10); ctx.lineTo(ix, b - 10 + len); ctx.fill(); }
  } else { // a hanging cluster of basalt columns: lit left faces, hexagonal caps underneath that glow from the lava below
    const n = Math.max(4, Math.round((w + 32) / 24)), cw = (w + 32) / n;
    for (let i = 0; i < n; i++) {
      const cx = x0 - 16 + i * cw, edge = Math.min(i, n - 1 - i), bot = b - (edge === 0 ? 22 : edge === 1 ? 8 : 0) - hash(o.x * 0.01 + i) * 6;
      ctx.fillStyle = vgrad(-10, bot, '#120a08', '#2c1d19', '#3f2c27'); ctx.fillRect(cx, -10, cw + 0.5, bot + 10);
      ctx.fillStyle = 'rgba(255,200,170,.07)'; ctx.fillRect(cx, -10, cw * 0.32, bot + 10); // lit facet
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(cx + cw - 2, -10, 2, bot + 10); // joint
      ctx.fillStyle = vgrad(bot - 8, bot + 4, '#5a2a18', '#ff7a2a'); ctx.beginPath(); // hexagonal cap seen from below
      ctx.moveTo(cx, bot - 6); ctx.lineTo(cx + cw * 0.25, bot); ctx.lineTo(cx + cw * 0.75, bot); ctx.lineTo(cx + cw, bot - 6); ctx.lineTo(cx + cw * 0.75, bot - 10); ctx.lineTo(cx + cw * 0.25, bot - 10); ctx.closePath(); ctx.fill();
      if (hash(o.x + i * 7) < 0.45) { ctx.strokeStyle = `rgba(255,${110 + 60 * Math.sin(T * 3 + i) | 0},30,.7)`; ctx.lineWidth = 1.6; ctx.beginPath(); let yy = bot - 14; ctx.moveTo(cx + cw * 0.5, yy); for (let s = 0; s < 4; s++) { yy -= 14 + hash(i + s) * 12; ctx.lineTo(cx + cw * (0.3 + hash(i * 3 + s) * 0.4), yy); } ctx.stroke(); }
    }
    ctx.fillStyle = vgrad(b - 4, b + 40, 'rgba(255,110,30,.28)', 'rgba(255,110,30,0)'); ctx.fillRect(x0 - 20, b - 4, w + 40, 44); // glow spilling below
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
    for (const px of [gx - hw - 46, gx + hw]) { // glowing runes on the pillars, stone footings
      const cx = px + 23, cy = GROUND - 130, gl = 0.35 + 0.65 * open; ctx.save(); ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 8 * gl; ctx.strokeStyle = `rgba(255,226,150,${0.35 + 0.5 * gl})`; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 7); ctx.moveTo(cx - 8, cy + 4); ctx.lineTo(cx, cy - 9); ctx.lineTo(cx + 8, cy + 4); ctx.moveTo(cx - 5, cy + 1); ctx.lineTo(cx + 5, cy + 1); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = 'rgba(255,230,170,.3)'; ctx.lineWidth = 2; for (const yy of [GROUND - 196, GROUND - 64]) { ctx.beginPath(); ctx.moveTo(px + 8, yy); ctx.lineTo(px + 38, yy); ctx.moveTo(px + 14, yy + 6); ctx.lineTo(px + 32, yy + 6); ctx.stroke(); }
      rr(px - 6, GROUND - 14, 58, 14, 4); ctx.fillStyle = shade(stone, 0.85); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.stroke();
    }
    for (const bx of [gx - hw - 40, gx + hw + 40]) { // braziers on the lintel
      const by = GROUND - 276, fl = 0.8 + 0.2 * Math.sin(T * 14 + bx);
      ctx.fillStyle = '#4a3a30'; ctx.beginPath(); ctx.moveTo(bx - 14, by - 12); ctx.lineTo(bx + 14, by - 12); ctx.lineTo(bx + 9, by); ctx.lineTo(bx - 9, by); ctx.fill(); ctx.strokeStyle = '#1e1410'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(bx, by - 26, 2, bx, by - 26, 46); g.addColorStop(0, 'rgba(255,200,90,.6)'); g.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = g; ctx.fillRect(bx - 46, by - 72, 92, 92); ctx.restore();
      ctx.fillStyle = '#ff8a20'; ctx.beginPath(); ctx.moveTo(bx - 9, by - 12); ctx.quadraticCurveTo(bx - 12, by - 28 * fl, bx + Math.sin(T * 9 + bx) * 3, by - 40 * fl); ctx.quadraticCurveTo(bx + 12, by - 26 * fl, bx + 9, by - 12); ctx.fill(); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.moveTo(bx - 5, by - 12); ctx.quadraticCurveTo(bx - 6, by - 22 * fl, bx, by - 28 * fl); ctx.quadraticCurveTo(bx + 6, by - 20 * fl, bx + 5, by - 12); ctx.fill();
    }
    if (ART(G.wi) === 2) { ell(gx, GROUND - 274, hw + 60, 9, 0, '#fff'); for (let i = 0; i < 7; i++) circle(gx - 108 + i * 36, GROUND - 226, 4, ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff'][(i + Math.floor(T * 3)) % 4]); }
  };
  if (front) { frame(); return; }
  // light spilling out of the opened gate
  if (open > 0) { const g = ctx.createRadialGradient(gx, GROUND - 100, 10, gx, GROUND - 100, 260); g.addColorStop(0, `rgba(255,232,150,${0.55 * open * (0.6 + 0.4 * ent)})`); g.addColorStop(1, 'rgba(255,232,150,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 260, GROUND - 360, 520, 360); }
  // the doorway: a dim passage that turns bright as the gate opens
  ctx.fillStyle = vgrad(GROUND - 212, GROUND, '#1d1526', '#3a2a40', '#6b4a52'); ctx.fillRect(gx - hw, GROUND - 212, hw * 2, 212);
  if (open > 0) { const g = ctx.createRadialGradient(gx, GROUND - 90, 4, gx, GROUND - 90, 120); g.addColorStop(0, `rgba(255,244,190,${(0.55 + 0.45 * ent) * open})`); g.addColorStop(1, 'rgba(255,200,110,0)'); ctx.save(); ctx.beginPath(); ctx.rect(gx - hw, GROUND - 212, hw * 2, 212); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(gx - hw, GROUND - 212, hw * 2, 212); ctx.restore(); }
  if (open > 0) { // fan of light and sparkles rising from the opened gate
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.28 + Math.sin(T * 0.5 + i) * 0.04; ctx.fillStyle = `rgba(255,236,160,${0.09 * open})`; ctx.beginPath(); ctx.moveTo(gx, GROUND - 110); ctx.lineTo(gx + Math.cos(a - 0.06) * 440, GROUND - 110 + Math.sin(a - 0.06) * 440); ctx.lineTo(gx + Math.cos(a + 0.06) * 440, GROUND - 110 + Math.sin(a + 0.06) * 440); ctx.fill(); }
    for (let i = 0; i < 9; i++) { const u = (T * 0.4 + i / 9) % 1; ctx.globalAlpha = (1 - u) * open; drawStar(gx + Math.sin(i * 2.3) * hw * 0.8, GROUND - 20 - u * 220, 3 + (1 - u) * 3, '#fff6b0'); }
    ctx.restore();
  }
  const dy = open * 214;
  ctx.save(); ctx.beginPath(); ctx.rect(gx - hw, GROUND - 214, hw * 2, 214); ctx.clip();
  rr(gx - hw + 2, GROUND - 212 - dy, hw * 2 - 4, 212, 6); ctx.fillStyle = '#6b4a2b'; ctx.fill();
  ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 4; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(gx - hw + i * (hw * 2 / 5), GROUND - 212 - dy); ctx.lineTo(gx - hw + i * (hw * 2 / 5), GROUND - dy); ctx.stroke(); }
  otxt('?', gx, GROUND - 110 - dy, 64, '#ffd34d', '#3b1d00', 8);
  ctx.restore();
  for (const [sw, sy] of [[hw * 2 + 44, 10], [hw * 2 + 16, 17]]) { rr(gx - sw / 2, GROUND - sy, sw, sy, 3); ctx.fillStyle = vgrad(GROUND - sy, GROUND, shade(stone, 1.15), shade(stone, 0.8)); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.stroke(); }
  frame();
}
function drawFamilyCliff(L, cam) {
  const x0 = L.bossX - 330 - cam; if (x0 > W + 50 || x0 + 560 < -50) return;
  // a craggy rock tower: jagged outline, lit facets, cracks glowing from the volcano, a snow cap and string lights
  const edge = [[0, GROUND], [18, 380], [34, 300], [30, 252], [50, 236], [120, 232], [210, 238], [300, 230], [400, 236], [470, 232], [506, 246], [530, 300], [540, 380], [560, GROUND]];
  ctx.beginPath(); edge.forEach(([px, py], n) => n ? ctx.lineTo(x0 + px, py) : ctx.moveTo(x0 + px, py)); ctx.closePath();
  ctx.fillStyle = hgrad(x0, x0 + 560, '#4a2a22', '#2a1612', '#140806'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#0c0504'; ctx.stroke();
  ctx.save(); ctx.clip(); for (let n = 0; n < 16; n++) { const fx = x0 + 30 + hash(n + 5) * 500, fy = 250 + hash(n + 9) * 180, fw = 40 + hash(n + 13) * 60; ctx.fillStyle = n % 2 ? 'rgba(255,170,120,.07)' : 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + fw, fy + 14); ctx.lineTo(fx + fw * 0.6, fy + 60); ctx.lineTo(fx - 10, fy + 40); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = `rgba(255,100,30,${0.35 + 0.15 * Math.sin(T * 2)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 120, 270); ctx.lineTo(x0 + 140, 330); ctx.lineTo(x0 + 128, 420); ctx.moveTo(x0 + 400, 270); ctx.lineTo(x0 + 380, 350); ctx.lineTo(x0 + 392, 430); ctx.stroke(); ctx.restore();
  // snow cap with soft drips
  ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.moveTo(x0 + 28, 252); for (let px = 28; px <= 512; px += 28) ctx.quadraticCurveTo(x0 + px - 14, 224 - 4 * hash(px), x0 + px, 236 + 8 * hash(px + 1)); ctx.lineTo(x0 + 512, 244); for (let px = 512; px >= 40; px -= 34) ctx.lineTo(x0 + px, 244 + 10 * hash(px + 3)); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(120,150,200,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  // string lights along the ledge
  for (let n = 0; n < 12; n++) { const lx = x0 + 60 + n * 40, ly = 250 + Math.sin(n * 1.3) * 4, c = ['#ff5252', '#ffd34d', '#69f0ae', '#40c4ff'][n % 4], tw = 0.6 + 0.4 * Math.sin(T * 3 + n * 1.7); ctx.globalAlpha = 0.3 * tw; circle(lx, ly + 4, 9, c); ctx.globalAlpha = 1; circle(lx, ly + 3, 3.2, c); }
  ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let n = 0; n <= 12; n++) { const lx = x0 + 60 + n * 40, ly = 247 + Math.sin(n * 1.3) * 4; n ? ctx.lineTo(lx, ly) : ctx.moveTo(lx, ly); } ctx.stroke();
  const cheer = G.boss && G.boss.state !== 'enter';
  const hop = i => cheer ? Math.abs(Math.sin(T * 7 + i)) * 10 : 0;
  oLong(x0 + 200, 232 - hop(0), 0.62, '#b07cc6', T * 3, false);
  oLong(x0 + 340, 232 - hop(1), 0.68, '#4f8fd6', T * 3 + 1, false);
  const lbl = (s, x) => { setFont(14); const w = ctx.measureText(s).width + 14; rr(x - w / 2, 242, w, 20, 10); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); txt(s, x, 252, 14, '#3b2410'); };
  lbl('Mamasaurus', x0 + 180); lbl('Papasaurus', x0 + 320);
  if (cheer && !toasts.length && !G.banner) {
    const lines = [[fmt('Los, {oli}!'), x0 + 200, 92], [fmt('Du schaffst das, {rex}!'), x0 + 390, 88], [fmt('Brüll, {fabio}, brüll!'), x0 + 470, 94]];
    lines.forEach(([s, x, y], i) => { if (Math.floor(T / 3) % 3 === i && (T / 3) % 1 < 0.8) { setFont(18); const w = ctx.measureText(s).width + 20; rr(x - w / 2, y - 16, w, 32, 14); ctx.fillStyle = '#fff'; ctx.fill(); txt(s, x, y, 18, '#3b2410'); } });
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
function drawCheckpoint(c, x) { // stone post with a flag: grey and limp, then golden with the egg star and sparkles once reached
  const on = c.on; shadow(x, GROUND + 2, 24, 0.3);
  ell(x, GROUND - 2, 20, 7, 0, '#6e6254'); rr(x - 11, GROUND - 16, 22, 16, 4); ctx.fillStyle = vgrad(GROUND - 16, GROUND, '#a09080', '#7a6c5c'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke();
  ctx.fillStyle = vgrad(GROUND - 126, GROUND - 14, '#8a6038', '#5b3d22'); ctx.fillRect(x - 3.5, GROUND - 126, 7, 112); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - 3.5, GROUND - 126, 2, 112);
  if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x + 24, GROUND - 104, 4, x + 24, GROUND - 104, 70); g.addColorStop(0, `rgba(255,220,120,${0.5 + 0.15 * Math.sin(T * 5)})`); g.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = g; ctx.fillRect(x - 50, GROUND - 180, 150, 150); ctx.restore(); }
  circle(x, GROUND - 129, 6.5, on ? '#ffd34d' : '#9a9a9a'); circle(x - 2, GROUND - 131, 2, 'rgba(255,255,255,.7)');
  const fy = on ? GROUND - 120 : GROUND - 54, amp = on ? 1 : 0.35, top = [], bot = [];
  for (let u = 0; u <= 1.001; u += 0.1) { const wv = Math.sin(T * 6 - u * 5) * u * 6 * amp; top.push([x + 4 + u * 54, fy + wv]); bot.push([x + 4 + u * 54 - (u > 0.85 ? (u - 0.85) * 60 : 0), fy + 30 + wv * 1.1 + (on ? 0 : u * 6)]); }
  ctx.beginPath(); top.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.lineTo(x + 4 + 40, fy + 15 + Math.sin(T * 6 - 4) * 4 * amp); for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath();
  ctx.fillStyle = on ? vgrad(fy, fy + 30, '#ffe27a', '#ff9a3c') : vgrad(fy, fy + 30, '#b4b4be', '#80808c'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = on ? '#8a4a10' : '#55555f'; ctx.stroke();
  if (on) { drawStar(x + 24, fy + 15 + Math.sin(T * 6 - 1.2) * 1.5, 7, '#fff7c8'); for (let i = 0; i < 4; i++) { const u = (T * 0.7 + i / 4) % 1; ctx.globalAlpha = 1 - u; drawStar(x + 30 + Math.sin(i * 3 + T) * 18, fy + 10 - u * 50, 3 + (1 - u) * 2.5, '#fff3a0'); } ctx.globalAlpha = 1; }
  else { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 14, fy + 6); ctx.lineTo(x + 24, fy + 20); ctx.moveTo(x + 36, fy + 4); ctx.lineTo(x + 30, fy + 14); ctx.stroke(); }
}
function todU() { // 0..1 how far the light has turned toward sunset: late in a level, or slowly in endless runs
  if (G.L.endless) return 0.5 - 0.5 * Math.cos(T * 0.035);
  const p = clamp(G.p.wx / Math.max(1, G.L.gateX), 0, 1), u = clamp((p - 0.4) / 0.6, 0, 1); return u * u * (3 - 2 * u);
}
let TOD = 0;
function drawPlay() {
  const L = G.L, p = G.p, th = WORLDS[G.wi], cam = G.cam;
  perfWatch(); chiliFx.dive = ART(G.wi) === 6;
  TOD = [0, 1, 5, 7].includes(ART(G.wi)) ? todU() : 0;
  ctx.save();
  if (G.shake > 0 && !G.overlay && !save.calm) ctx.translate((Math.random() - 0.5) * 16 * G.shake, (Math.random() - 0.5) * 16 * G.shake);
  drawBackground(ART(G.wi), cam);
  if (G.wi === 4) { drawAurora(); }
  if (L.bossKind === 'king') drawFamilyCliff(L, cam);
  drawGround(ART(G.wi), L, cam);
  for (const pl of L.plats) drawPlatform(pl, cam, ART(G.wi));
  for (const c of L.cps) { const x = c.x - cam; if (x < -50 || x > W + 80) continue; drawCheckpoint(c, x); }
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
        if (h.t < h.warn) { const u = h.t / h.warn, a = 0.45 + 0.35 * Math.sin(T * 18); ctx.globalAlpha = a; ell(hx, GROUND + 2, 40 + 20 * (1 - u), 9, 0, 'rgba(255,70,20,.8)'); ctx.strokeStyle = '#ffcf3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(hx, GROUND + 2, 70 * (1 - u) + 20, 14 * (1 - u) + 4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; if (h.t > h.warn - 0.55) { const sc = 1 + 0.1 * Math.sin(T * 20); ctx.save(); ctx.translate(hx, GROUND - 130); ctx.scale(sc, sc); otxt('SPRING!', 0, 0, 52, '#fff', '#c01800', 10); ctx.restore(); ctx.fillStyle = 'rgba(255,230,90,.9)'; ctx.beginPath(); ctx.moveTo(hx, GROUND - 64); ctx.lineTo(hx - 16, GROUND - 90); ctx.lineTo(hx + 16, GROUND - 90); ctx.fill(); } else if (Math.sin(T * 14) > -0.3) otxt('!', hx, GROUND - 40, 40, '#ffd34d', '#7a0000', 6); }
        else if (h.t < h.warn + 0.3) { const q = h.t - h.warn, hh = 280 * Math.min(1, q * 10) * Math.min(1, (0.3 - q) * 10); const lg = ctx.createLinearGradient(0, GROUND - hh, 0, GROUND); lg.addColorStop(0, '#fff3a0'); lg.addColorStop(1, '#ff5a00'); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(hx - 28, GROUND); for (let y = 0; y <= hh; y += 18) ctx.lineTo(hx - 24 + Math.sin(y * 0.1 + T * 30) * 6, GROUND - y); for (let y = hh; y >= 0; y -= 18) ctx.lineTo(hx + 24 + Math.sin(y * 0.1 + T * 30 + 1) * 6, GROUND - y); ctx.lineTo(hx + 28, GROUND); ctx.closePath(); ctx.fill(); }
      }
    }
    if (st === 'crouch' || st === 'leap') { const lx = b.landX - cam; ctx.globalAlpha = 0.45 + 0.3 * Math.sin(T * 16); ell(lx, GROUND + 2, 100, 16, 0, 'rgba(255,50,20,.7)'); ctx.globalAlpha = 1; otxt('!', lx, GROUND - 36, 44, '#ff5252', '#000', 7); }
    if (rage) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(bx, by - 120, 20, bx, by - 120, 260); g.addColorStop(0, `rgba(255,110,30,${0.35 + 0.15 * Math.sin(T * 9)})`); g.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = g; ctx.fillRect(bx - 270, by - 380, 540, 440); ctx.restore(); if (Math.random() < 0.35) burst(b.x - 60 + Math.random() * 140, GROUND - Math.random() * 200, 1, ['#ff9a3c', '#ffd34d', '#555'], 80, -160, 6, 0.9); }
    ctx.save(); if (b.flash > 0 && Math.sin(T * 40) > 0) ctx.globalAlpha = 0.4;
    shadow(bx, GROUND + 2, 80 * (1 - clamp(-b.y / 300, 0, 0.6)), 0.3);
    ctx.translate(bx + ({ crab: -40, queen: -110, kraken: -20 }[b.kind] || 0), by); let rot = 0, sy = 1, sx = 0;
    if (st === 'crouch') sy = 0.84 + 0.02 * Math.sin(T * 30); if (st === 'tired') rot = -0.13; if (st === 'stagger' || st === 'duel') sx = Math.sin(T * 60) * (st === 'duel' ? 4 : 2.5);
    if (st === 'leap') rot = -0.25 * Math.sin(clamp(b.t / 0.7, 0, 1) * Math.PI);
    ctx.translate(sx, 0); if (st === 'flee') { ctx.translate(0, -110); ctx.rotate(b.kind === 'king' ? Math.sin(b.t * 14) * 0.35 : b.t * 7); ctx.translate(0, 110); } // the king's outline cache is axis-aligned, so he wobbles instead of tumbling ctx.rotate(rot); ctx.scale(1, sy);
    const BC = [['#8b1a1a', '#4a0a0a'], ['#7a3a1a', '#3d1a08'], ['#5a2a7a', '#2a0f40'], ['#b01c10', '#5a0a04']][b.phase] || ['#8b1a1a', '#4a0a0a'];
    const anim = st === 'taunt' || st === 'tired' ? (b.kind === 'king' ? 0 : b.ph * 0.5) : b.ph, face = st !== 'flee';
    const dmg = bossDmg(b), ko = st === 'flee'; if (b.kind === 'crab') drawCrabKing(0, 0, 1.5, anim, face, { dmg, ko }); else if (b.kind === 'kraken') drawKraken(0, 0, 1.45, anim, face, { dmg, ko }); else if (b.kind === 'queen') drawQueen(0, 0, 1.7, anim, face, { dmg, ko }); else oRaptor(0, 0, 2.3, anim, face, { col: BC[0], dark: BC[1], crown: true, dmg, ko });
    ctx.restore();
    if (st === 'taunt' && b.phase === 0 && b.kind === 'king') otxt('!', bx - 70, GROUND - 230, 60, '#ff5252', '#000', 8);
    if (st === 'tired' || st === 'stagger') for (let i = 0; i < 3; i++) { const a = T * 4 + i * 2.1; drawStar(bx - 70 + Math.cos(a) * 52, by - 250 + Math.sin(a) * 14, 9, '#ffd740'); }
    for (const r of b.rocks) { const rx2 = r.x - cam, ry2 = r.y; shadow(rx2, GROUND + 2, 24, 0.3); ctx.save(); ctx.translate(rx2, ry2); ctx.rotate(r.rot); ell(0, 0, 24, 21, 0, b.kind === 'kraken' ? '#2a1a50' : b.kind === 'queen' ? '#e8eefc' : b.kind === 'crab' ? '#7a4a22' : WORLDS[G.wi].rock); ell(-6, -6, 10, 7, 0, 'rgba(255,255,255,.18)'); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 24, 21, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    if (st === 'charge') { const lx = G.p.wx + 390 - cam, near = b.x - G.p.wx < 390; ctx.save(); ctx.setLineDash([10, 8]); ctx.lineWidth = 4; ctx.strokeStyle = near ? `rgba(255,82,82,${0.6 + 0.4 * Math.sin(T * 24)})` : 'rgba(255,211,77,.7)'; ctx.beginPath(); ctx.moveTo(lx, GROUND - 230); ctx.lineTo(lx, GROUND); ctx.stroke(); ctx.restore(); }
  }
  // chili
  if (G.entering) { const u = clamp(G.entering, 0, 1), gx = L.gateX - cam, k = 1 - 0.62 * u; ctx.save(); ctx.translate(gx, GROUND); ctx.scale(k, k); ctx.translate(-gx, -GROUND); ctx.globalAlpha = 1 - 0.7 * u * u; }
  const c = G.chili; shadow(c.wx - cam + 6, GROUND + 2, 22 * clamp(1 - (GROUND - c.y) / 200, 0.4, 1), 0.25); chiliFx.vy = c.vy || 0; chiliFx.dig = !!c.dig; chiliFx.scared = G.p.hitT > 0 && !G.overlay ? G.p.hitT / 0.45 : 0; chiliFx.joy = c.joy > 0 ? c.joy / 0.9 : 0; oChili(c.wx - cam, c.y, 1.25, c.ph, c.dig ? false : (G.bossStarted && !G.golden));
  if (G.chiliSay && !G.overlay) { const cs = G.chiliSay, bx = clamp(c.wx - cam, 70, W - 200), by = c.y - 92, al = clamp(cs.t * 3, 0, 1) * clamp((2.6 - cs.t) * 6, 0, 1); setFont(19); const bw = ctx.measureText(cs.text).width + 30; ctx.save(); ctx.globalAlpha = al; rr(bx - bw / 2 + 30, by - 19, bw, 38, 17); ctx.fillStyle = '#fffdf6'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(bx - 4, by + 15); ctx.lineTo(bx + 4, by + 28); ctx.lineTo(bx + 16, by + 15); ctx.fill(); txt(cs.text, bx + 30, by, 19, '#3b2410'); ctx.restore(); }
  if (c.dig) otxt('!', c.wx - cam + 20, c.y - 70 - Math.abs(Math.sin(T * 10)) * 6, 36, '#ffd34d', '#3b1d00', 6);
  // baby + kiwi followers
  if (save.treasures[3]) oKiwi(p.wx - cam - 225, GROUND - (G.startT > 0 || G.stopped ? 0 : Math.abs(Math.sin(p.ph * 0.7 + 1)) * 12), 1.1, p.ph * 1.3);
  if (save.babyName) oBaby(p.wx - cam - 168, GROUND - (G.startT > 0 || G.stopped ? 0 : Math.abs(Math.sin(p.ph * 0.6)) * 10), 0.85, p.ph);
  // player
  { let sy = GROUND; for (const pl of L.plats) if (p.wx + 20 > pl.x && p.wx - 20 < pl.x + pl.w && pl.y >= p.y - 2) sy = Math.min(sy, pl.y); if (sy < GROUND || supported(L, p.wx)) shadow(p.wx - cam + 4, sy + 2, 52 * clamp(1 - (sy - p.y) / 260, 0.35, 1), 0.3); }
  if (p.fireT > 0) { const g = ctx.createRadialGradient(p.wx - cam + 10, p.y - 60, 10, p.wx - cam + 10, p.y - 60, 120); g.addColorStop(0, `rgba(${fireOf(save.equip.fire || 0).glow},${0.3 + 0.12 * Math.sin(T * 10)})`); g.addColorStop(1, `rgba(${fireOf(save.equip.fire || 0).b},0)`); ctx.fillStyle = g; ctx.fillRect(p.wx - cam - 110, p.y - 180, 240, 240); }
  const spinA = p.stomp && p.spin < 1 ? (3 * p.spin * p.spin - 2 * p.spin * p.spin * p.spin) * Math.PI * 2 : 0, scx = p.wx - cam + 4, scy = p.y - 66;
  if (spinA) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(scx, scy, 104, spinA - Math.PI / 2 - 1.3, spinA - Math.PI / 2); ctx.stroke(); ctx.save(); ctx.translate(scx, scy); ctx.rotate(spinA); ctx.translate(-scx, -scy); }
  const dU = p.dashT > 0 ? 1 - p.dashT / 0.4 : 0, dOff = 0;
  if (p.dashT > 0) {
    const cxp = p.wx - cam + 4 + dOff, cyp = p.y - 55, fade = Math.sin(dU * Math.PI);
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const ly = 40 + hash(i * 13.7) * (H - 120), len = 110 + hash(i * 3.1) * 200, lx = (((hash(i * 7.7) * (W + 400) - T * 2800 * (0.7 + hash(i) * 0.6)) % (W + 400)) + W + 400) % (W + 400) - 200; ctx.strokeStyle = `rgba(255,255,255,${0.32 * fade})`; ctx.lineWidth = 2 + hash(i * 5) * 3; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + len, ly); ctx.stroke(); }
    const gc = ctx.createLinearGradient(cxp - 260, 0, cxp - 20, 0); gc.addColorStop(0, 'rgba(255,210,90,0)'); gc.addColorStop(1, `rgba(255,170,40,${0.6 * fade})`); ctx.fillStyle = gc; ctx.beginPath(); ctx.moveTo(cxp - 10, cyp - 78); ctx.quadraticCurveTo(cxp - 150, cyp - 40, cxp - 260, cyp + 4); ctx.quadraticCurveTo(cxp - 150, cyp + 30, cxp - 10, cyp + 56); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * fade})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cxp + 60, cyp, 30 + dU * 90, -1.1, 1.1); ctx.stroke();
    ctx.restore();
    if (p.onGround && Math.random() < 0.9) burst(p.wx - 30, GROUND, 1, ['#d8c3a5', '#fff', '#ffe08a'], 160, 200, 6, 0.4);
  }
  if (p.dashT > 0) for (let gi = 1; gi <= 3; gi++) { ctx.globalAlpha = 0.3 / gi; oRex(p.wx - cam + dOff - gi * 44, p.y, 0.92, p.ph, 0.05, Object.assign(rexLook(G.wi), { rider: true, air: !p.onGround })); ctx.globalAlpha = 1; }
  if (L.swim || p.gliding) { ctx.save(); const rcx = p.wx - cam + 4, rcy = p.y - 60; ctx.translate(rcx, rcy); ctx.rotate(L.swim ? clamp(p.vy / 900, -0.4, 0.4) : 0.05); ctx.translate(-rcx, -rcy); G._tilt = true; }
  if (p.gliding) { const gx2 = p.wx - cam + 4, gy2 = p.y - 205; ctx.fillStyle = vgrad(gy2 - 28, gy2 + 6, '#ff6a5a', '#c0302a'); ctx.beginPath(); ctx.moveTo(gx2 - 70, gy2 + 8); ctx.quadraticCurveTo(gx2, gy2 - 52, gx2 + 70, gy2 + 8); ctx.quadraticCurveTo(gx2, gy2 - 6, gx2 - 70, gy2 + 8); ctx.fill(); ctx.strokeStyle = '#4a0a08'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#fff'; for (const dx of [-42, -14, 14, 42]) { ctx.beginPath(); ctx.moveTo(gx2 + dx, gy2 + 1); ctx.quadraticCurveTo(gx2 + dx * 0.6, gy2 - 36, gx2 + dx * 0.4, gy2 - 40); ctx.quadraticCurveTo(gx2 + dx * 0.5, gy2 - 20, gx2 + dx + 12, gy2 + 3); ctx.fill(); } ctx.strokeStyle = 'rgba(40,20,10,.7)'; ctx.lineWidth = 2; for (const dx of [-60, -20, 20, 60]) { ctx.beginPath(); ctx.moveTo(gx2 + dx, gy2 + 6); ctx.lineTo(gx2 + 4 + dx * 0.05, p.y - 150); ctx.stroke(); } }
  if (p.dashT > 0) { ctx.save(); const px = p.wx - cam + 4; ctx.translate(px + dOff, p.y); ctx.rotate(0.1); ctx.scale(1.12, 0.92); ctx.translate(-px, -p.y); }
  if (!(p.inv > 0 && Math.sin(T * 30) > 0.3)) oRex(p.wx - cam,  p.y, 0.92, p.ph, p.roarT > 0 || p.breathT > 0 ? 1 : 0.05, Object.assign(rexLook(G.wi), { rider: true, vy: p.vy, sq: p.anti > 0 ? p.anti / 0.09 * 0.13 : !p.onGround ? -clamp(Math.abs(p.vy) / 1400, 0, 1) * 0.1 : (p.land > 0 ? p.land / 0.16 * 0.14 : 0), hurt: p.hitT > 0 && !G.overlay ? p.hitT / 0.45 : 0, air: !p.onGround, duck: p.duck, stomp: p.stomp && p.spin >= 1, fire: p.fireT > 0 }));
  if (p.dashT > 0) ctx.restore();
  if (G.shield && !G.overlay) { const sx = p.wx - cam + 4, sy = p.y - 84, pu = 1 + 0.03 * Math.sin(T * 5); ctx.save(); ctx.translate(sx, sy); ctx.scale(pu, pu); const sg = ctx.createRadialGradient(0, 0, 36, 0, 0, 116); sg.addColorStop(0, 'rgba(150,220,255,.04)'); sg.addColorStop(1, 'rgba(150,220,255,.34)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(0, 0, 124, 102, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(210,240,255,.85)'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-64, -52, 18, 8, -0.7, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  if (spinA) ctx.restore();
  if (G._tilt) { ctx.restore(); G._tilt = false; }
  if (G.entering) ctx.restore(); // the heroes stay in front of the pillars as they walk into the light (Chili used to vanish behind the left pillar)
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
  if (TOD > 0.01) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgba(255,110,70,${0.1 * TOD})`); g.addColorStop(0.6, `rgba(255,150,70,${0.2 * TOD})`); g.addColorStop(1, `rgba(110,40,70,${0.16 * TOD})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  vignette(ART(G.wi));
  ctx.restore(); TOD = 0; chiliFx.dive = false;
  if (G.boss && G.boss.state === 'enter') { const wa = 0.18 + 0.14 * Math.sin(T * 12), wg = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 560); wg.addColorStop(0, 'rgba(255,40,20,0)'); wg.addColorStop(1, `rgba(255,40,20,${wa})`); ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H); }
  // boss prompt
  if (G.boss && ((G.boss.state === 'charge' && G.boss.x - p.wx < 390) || G.boss.state === 'tired') && Math.sin(T * 20) > -0.5) { otxt('JETZT BRÜLLEN!', W / 2, 200, 38, '#ff5252', '#000', 8); }
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
  if (G.hitFlash > 0 && save.calm) G.hitFlash = 0;
  if (G.hitFlash > 0) { G.hitFlash -= DT; const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,0,0,${Math.max(0, G.hitFlash)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (G.coach && !G.overlay) drawCoach();
  // start banner
  if (G.startT > 0) { ctx.globalAlpha = clamp(G.startT * 2, 0, 1); otxt(`Welt ${G.wi + 1}: ${th.name}`, W / 2, 230, 58, '#ffd34d', '#3b1d00', 12); { const ns = ['', 'Neue Fähigkeit: DUCKEN', 'Neue Fähigkeit: STAMPFER', 'Neu: FEUER-CHILI'][G.wi]; if (ns && G.startT >= 0.7) otxt(ns, W / 2, 296, 34, '#9fd3ff', '#0b2448', 8); } if (G.startT < 0.7) otxt('Los!', W / 2, 300, 46, '#fff', '#000', 10); ctx.globalAlpha = 1; }
  if (G.overlay) drawOverlay();
}
function actBtn(x, y, r, col, kind, label, fs, held) { // big round touch button: shadow, gradient, white ring, gloss, icon and label
  circle(x, y + 5, r, 'rgba(0,0,0,.35)'); ctx.save(); ctx.globalAlpha = 0.94; const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.5, r * 0.1, x, y, r); g.addColorStop(0, shade(col, 1.4)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, 0.62)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r - 8, 0, Math.PI * 2); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 3, 0, Math.PI * 2); ctx.clip(); const hg = ctx.createLinearGradient(0, y - r, 0, y); hg.addColorStop(0, 'rgba(255,255,255,.34)'); hg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(x, y - r * 0.5, r * 0.78, r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ico(kind, x, y - r * 0.2 + (held ? 2 : 0), r * 0.82); otxt(label, x, y + r * 0.56, fs, '#fff', 'rgba(0,0,0,.65)', 5);
}
function dashPos() { return G.sk.duck ? [196, H - 58, 46] : [76, H - 78, 54]; }
function drawHUD() {
  const p = G.p, th = WORLDS[G.wi];
  const bossBar = !!(G.boss && G.boss.state !== 'enter' && !G.golden && !G.bossDone); // boss health replaces the egg pill
  for (let i = 0; i < G.maxH; i++) drawHeart(34 + i * 40, 38, 1.25, i < p.hearts);
  if (G.endless) { rr(W / 2 - 110, 12, 220, 54, 27); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); otxt(String(G.score), W / 2, 36, 32, '#ffe08a', 'rgba(0,0,0,.7)', 6); txt('Rekord ' + Math.max(save.best[G.wi] || 0, G.score), W / 2, 58, 14, 'rgba(255,255,255,.8)', 'center', 'normal'); rr(W / 2 - 52, 72, 104, 24, 12); ctx.fillStyle = G.tier >= 4 ? 'rgba(200,50,30,.85)' : G.tier >= 2 ? 'rgba(230,140,30,.85)' : 'rgba(40,110,170,.85)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke(); txt('Stufe ' + G.tier, W / 2, 85, 16, '#fff'); }
  else if (!bossBar) { rr(W / 2 - 92, 12, 184, 54, 27); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); }
  if (!G.endless && !bossBar) for (let k = 0; k < 3; k++) { const got = G.eggsGot[k] && !G.flyEggs.some(f => f.k === k), before = G.li >= 0 && save.lvE[G.li][k]; drawEgg(W / 2 - 50 + k * 50, 39, 17 * (1 + G.slotPop[k]), got || before ? th.egg : 'rgba(255,255,255,.15)', got || before ? th.eggSpot : 'rgba(255,255,255,.1)', got ? 0.6 : 0, 0, got ? 1 : before ? 0.45 : 1); }
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
    const b = G.boss, x0 = W / 2 - 190, y0 = 34;
    rr(x0 - 10, y0 - 22, 400, 52, 16); ctx.fillStyle = 'rgba(20,6,6,.72)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d4a017'; ctx.stroke();
    txt(bossKind(b).name, x0 + 6, y0 - 8, 16, '#ffd34d', 'left'); txt(b.state === 'duel' ? 'BRÜLL-DUELL' : bossKind(b).phases[Math.min(bossKind(b).phases.length - 1, b.phase)].name, x0 + 380, y0 - 8, 14, b.kind === 'king' && b.phase === 3 ? '#ff9a5a' : '#fff', 'right', 'normal');
    if (b.state === 'duel') { rr(x0, y0 + 2, 380, 16, 8); ctx.fillStyle = '#400'; ctx.fill(); rr(x0, y0 + 2, Math.max(8, 380 * b.meter), 16, 8); ctx.fillStyle = vgrad(y0, y0 + 18, '#ffe27a', '#ff7a20'); ctx.fill(); }
    else for (let i = 0; i < bossKind(b).phases.length; i++) { const nP = bossKind(b).phases.length, sw = (380 - (nP - 1) * 8) / nP, sx = x0 + i * (sw + 8), frac = i < b.phase ? 0 : i === b.phase ? Math.max(0, b.hp) / 3 : 1; rr(sx, y0 + 2, sw, 16, 8); ctx.fillStyle = '#400'; ctx.fill(); if (frac > 0) { rr(sx, y0 + 2, Math.max(8, sw * frac), 16, 8); ctx.fillStyle = i === b.phase ? vgrad(y0, y0 + 18, '#ff6a5a', '#c01818') : '#8a2a2a'; ctx.fill(); } rr(sx, y0 + 2, sw, 16, 8); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.stroke(); }
  }
  if (G.banner) { const bn = G.banner, u = clamp(bn.t / 2.0, 0, 1), pop = 1 + 0.22 * clamp((bn.t - 1.7) / 0.3, 0, 1), al = clamp(bn.t * 2, 0, 1) * clamp((2.0 - bn.t) * 6, 0, 1); ctx.save(); ctx.globalAlpha = al; ctx.translate(W / 2, 134); ctx.scale(pop, pop); otxt(bn.text, 0, 0, 38, bn.col, '#000', 8); otxt(bn.sub, 0, 30, 20, '#fff', '#000', 6); ctx.restore(); }
  if (G.boss && G.boss.state === 'duel') { const b = G.boss; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(T * 18); otxt('BRÜLL! BRÜLL! BRÜLL!', W / 2, 330, 40, '#ffe27a', '#7a1000', 9); ctx.globalAlpha = 1; }
  if (G.tip && !G.overlay) { ctx.globalAlpha = clamp(G.tip.t * 2, 0, 1); const x0 = G.sk.dash && G.sk.duck && !G.L.swim ? 258 : 190, x1 = 790, lines = wrapLines(G.tip.text, x1 - x0 - 92, 17), h = 16 + lines.length * 22, tipY = H - h - 6; rr(x0, tipY, x1 - x0, h, 16); ctx.fillStyle = 'rgba(255,247,224,.95)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke(); drawPortrait('goetti', x0 + 36, tipY + h / 2, 24); lines.forEach((l, i) => txt(l, (x0 + 68 + x1 - 12) / 2, tipY + 20 + i * 22, 17, '#3b2410')); ctx.globalAlpha = 1; }
  if (G.overlay) return;
  // pause
  circle(W - 44, 43, 26, 'rgba(0,0,0,.3)'); circle(W - 44, 40, 26, 'rgba(18,22,38,.7)'); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(W - 44, 40, 26, 0, Math.PI * 2); ctx.stroke(); ico('pause', W - 44, 40, 30);
  buttons.push({ x: W - 74, y: 10, w: 60, h: 60, cb: () => { G.overlay = { type: 'pause' }; } });
  // duck / stomp button
  if (G.sk.duck) { const dx = 76, dy = H - 78, held = G.duckHeld != null, air = !p.onGround && G.sk.stomp;
    const threat = G.L.obs.some(o => !o.dead && !o.scared && ((o.type === 'low') || (o.type === 'ptero' && o.low)) && o.x - p.wx > 0 && o.x - p.wx < 330) || (air && G.L.obs.some(o => !o.dead && !o.flat && (o.type === 'geode' || o.type === 'compy') && Math.abs(o.x - p.wx - 60) < 120));
    if (threat && !held) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T * 14); circle(dx, dy, 74 + 6 * Math.sin(T * 14), '#9fd3ff'); ctx.globalAlpha = 1; }
    actBtn(dx, dy, held ? 50 : 54, held ? '#1f5ab8' : '#3a7ee0', air && !G.L.swim ? 'stomp' : 'duck', G.L.swim ? 'TAUCHEN' : air ? 'STAMPF!' : 'DUCKEN', 17, held); }
  if (G.sk.dash && !G.L.swim) { const [fx, fy, fr] = dashPos(), cd = p.dashCd > 0, wallAhead = G.L.obs.some(o => !o.dead && o.type === 'wall' && o.x - p.wx > 0 && o.x - p.wx < 420);
    if (wallAhead && !cd) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T * 14); circle(fx, fy, fr + 16 + 5 * Math.sin(T * 14), '#ffd34d'); ctx.globalAlpha = 1; }
    actBtn(fx, fy, fr, cd ? '#6a6a6a' : '#ec8a18', 'dash', 'FLITZ', 17);
    if (cd) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(fx, fy, fr - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCd / 1.7)); ctx.stroke(); } }
  // roar / fire button
  const rx = W - 92, ry = H - 92, ready = p.roarCd <= 0 || (G.boss && G.boss.state === 'duel');
  if (p.fireT > 0 && !G.boss) {
    ctx.globalAlpha = 0.45 + 0.25 * Math.sin(T * 10); circle(rx, ry, 80, '#ffb030'); ctx.globalAlpha = 1;
    actBtn(rx, ry, 66, '#ff6a14', 'fire', 'FEUER!', 24);
    ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(rx, ry, 58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.fireT / 8)); ctx.stroke();
    buttons.push({ x: rx - 80, y: ry - 80, w: 160, h: 160, cb: roar, silent: true });
    return;
  }
  const target = G.L.obs.some(o => !o.dead && !o.scared && (o.type === 'raptor' || o.type === 'ptero' || o.type === 'boulder') && o.x - p.wx > 0 && o.x - p.wx < 360) || (G.boss && (G.boss.state === 'tired' || G.boss.state === 'duel' || (G.boss.state === 'charge' && G.boss.x - p.wx < 390)));
  if (ready && target) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T * 14); circle(rx, ry, 82 + 6 * Math.sin(T * 14), '#ffd34d'); ctx.globalAlpha = 1; }
  actBtn(rx, ry, 66, ready ? '#d63a28' : '#6a6a6a', 'roar', 'BRÜLL!', 24);
  if (!ready) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(rx, ry, 60, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.roarCd / (p.roarMax || 0.85))); ctx.stroke(); }
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
  } else if (c.type === 'glide') { // hold the finger down in the air
    const gy = 290; ctx.fillStyle = `rgba(255,255,255,${0.18 + 0.1 * Math.sin(T * 6)})`; ctx.beginPath(); ctx.arc(W / 2, gy, 44, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(W / 2, gy, 44, 0, Math.PI * 2); ctx.stroke();
    setFont(70, 'normal'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('👆', W / 2 + 8, gy + 30);
    rr(W / 2 - 100, gy + 78, 200, 16, 8); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fill(); rr(W / 2 - 98, gy + 80, Math.max(12, 196 * ((T * 0.7) % 1)), 12, 6); ctx.fillStyle = '#ffd34d'; ctx.fill(); otxt('HALTEN', W / 2, gy + 118, 24, '#fff', 'rgba(0,0,0,.6)', 5);
  } else if (c.type === 'dash') {
    const [dx, dy, dr] = dashPos();
    ctx.strokeStyle = `rgba(255,190,90,${1 - u})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(dx, dy, dr + 6 + u * 45, 0, Math.PI * 2); ctx.stroke();
    actBtn(dx, dy, dr + 2, '#ec8a18', 'dash', 'FLITZ', 17);
    const bx = dx + dr + 110 + Math.abs(Math.sin(T * 6)) * 18;
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(bx - 62, dy); ctx.lineTo(bx - 30, dy - 26); ctx.lineTo(bx - 30, dy - 11); ctx.lineTo(bx + 24, dy - 11); ctx.lineTo(bx + 24, dy + 11); ctx.lineTo(bx - 30, dy + 11); ctx.lineTo(bx - 30, dy + 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3b1d00'; ctx.lineWidth = 3; ctx.stroke();
  } else if (c.type === 'duck' || c.type === 'stomp') {
    const dx = 76, dy = H - 78;
    ctx.strokeStyle = `rgba(160,210,255,${1 - u})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(dx, dy, 62 + u * 45, 0, Math.PI * 2); ctx.stroke();
    actBtn(dx, dy, 58, '#3a7ee0', c.type === 'stomp' ? 'stomp' : 'duck', c.type === 'stomp' ? 'STAMPF!' : 'DUCKEN', 17);
    const bx = dx + 150 + Math.abs(Math.sin(T * 6)) * 18;
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(bx - 62, dy); ctx.lineTo(bx - 30, dy - 26); ctx.lineTo(bx - 30, dy - 11); ctx.lineTo(bx + 24, dy - 11); ctx.lineTo(bx + 24, dy + 11); ctx.lineTo(bx - 30, dy + 11); ctx.lineTo(bx - 30, dy + 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3b1d00'; ctx.lineWidth = 3; ctx.stroke();
  } else {
    const rx = W - 92, ry = H - 92;
    ctx.strokeStyle = `rgba(255,220,80,${1 - u})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(rx, ry, 70 + u * 45, 0, Math.PI * 2); ctx.stroke();
    const fire = G.p.fireT > 0; actBtn(rx, ry, 66, fire ? '#ff6a14' : '#d63a28', fire ? 'fire' : 'roar', fire ? 'FEUER!' : 'BRÜLL!', 24);
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
  if (settingsOpen && o.type === 'pause') { drawSettings(); return; }
  if (o.type === 'pause') {
    panel(280, 100, 400, 350); txt('Pause', W / 2, 155, 44, '#3b2410');
    button('Weiter spielen', 330, 200, 300, 64, () => { G.overlay = null; });
    button('Einstellungen', 330, 284, 300, 56, () => { settingsOpen = true; }, { color: '#e0d2b0', size: 24, icon: icon('gear') });
    button('Zur Karte', 330, 360, 300, 64, () => go('map'), { color: '#e0d2b0' });
  } else if (o.type === 'endover') {
    o.t += DT; panel(220, 90, 520, 360); drawPortrait('chili', W / 2, 160, 46);
    txt('Endlos-Lauf zu Ende!', W / 2, 232, 32, '#3b2410');
    txt(`${G.score} Punkte`, W / 2, 284, 46, '#c0701a');
    txt(o.isNew ? 'Neuer Rekord!' : `Rekord: ${o.prev}`, W / 2, 322, 24, o.isNew ? '#2e7d32' : '#6b4a2b');
    if (o.bonus) txt(`Tages-Bonus: +${o.bonus} Bernstein · Serie: ${o.streak} ${o.streak === 1 ? 'Tag' : 'Tage'}`, W / 2, 346, 16, '#8a5a00');
    txt(`Bernstein: +${G.amber}` + (o.rank ? `  ·  Bestenliste: Platz ${o.rank}` : ''), W / 2, 368, 20, o.rank ? '#2e7d32' : '#6b4a2b', 'center', o.rank ? 'bold' : 'normal');
    button('Nochmal!', 236, 392, 150, 54, () => { if (G.daily) startDaily(); else startLevel(G.wi, true); }, { size: 24 }); button('Bestenliste', 394, 392, 190, 54, () => { boardTab = G.daily ? 8 : G.wi; go('board'); }, { size: 22, color: '#ffe08a', icon: icon('trophy') }); button('Karte', 592, 392, 124, 54, () => go('map'), { color: '#e0d2b0', size: 24 });
  } else if (o.type === 'retry') {
    panel(220, 110, 520, 320); drawPortrait('chili', W / 2, 180, 50, true);
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
    else { const sc = G.newCard ? (u < 1 ? 0.3 + u * 0.95 : 1 + 0.03 * Math.sin(T * 6)) : 1; ctx.save(); ctx.translate(W / 2, 152); ctx.rotate((hash(G.li * 3 + 1) - 0.5) * 0.08); ctx.scale(sc * 1.3, sc * 1.3); rr(-62, -46, 124, 92, 12); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.save(); ctx.translate(2, 4); ctx.fill(); ctx.restore(); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#8a6a3a'; ctx.stroke(); rr(-56, -40, 112, 62, 8); ctx.fillStyle = th.sky[1]; ctx.fill(); drawCardArt(G.li, 0, -10, 104, false); txt(FACTS[G.li].name, 0, 36, FACTS[G.li].name.length > 11 ? 14 : 17, '#2b1a00'); if (G.newCard && u >= 1) { ctx.save(); ctx.translate(46, -42); ctx.rotate(0.35); rr(-20, -10, 40, 20, 5); ctx.fillStyle = '#e53935'; ctx.fill(); txt('NEU', 0, 1, 13, '#fff'); ctx.restore(); } ctx.restore(); }
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
      txt(nextOpen && TEASERS[lv.day] ? TEASERS[lv.day] : nextOpen ? `Morgen öffnet sich Tür ${lv.day + 1} – bis dann!` : tk >= 0 && !save.treasures[tk] ? 'Goetti vermisst hier noch etwas … Schau mal ganz weit oben!' : missing ? 'Chili schnuppert: Hier sind noch Eier versteckt!' : 'Super gemacht!', W / 2, 384, 19, '#6b4a2b', 'center', 'normal'); }
    { const hop = Math.abs(Math.sin(T * 7)) * 16, hop2 = Math.abs(Math.sin(T * 7 + 1.2)) * 14; shadow(240, 506, 52 - hop * 0.6, 0.25); shadow(752, 506, 22, 0.25);
      oRex(240, 502 - hop, 0.55, T * 8, 0.85, Object.assign(rexLook(G.wi), { rider: true, vy: -200 }));
      chiliFx.joy = 1; oChili(752, 504 - hop2, 1.0, T * 12, true); chiliFx.joy = 0;
      if (Math.sin(T * 7) > 0.9) burst(G.cam + 250, 440, 2, ['#ffd740', '#fff', '#ff8a9a'], 140, 300, 5, 0.6); }
    if (lv.boss) { // the beaten boss, bandaged and dizzy, next to the cheering heroes
      const kk = lv.boss, bo = { dmg: 1, ko: true, wid: 'res' }; shadow(668, 508, kk === 'king' ? 62 : 48, 0.25);
      if (kk === 'crab') drawCrabKing(668, 506, 0.45, T * 2, true, bo); else if (kk === 'kraken') drawKraken(668, 506, 0.3, T * 2, true, bo); else if (kk === 'queen') drawQueen(668, 506, 0.45, T * 2, true, bo); else oRaptor(668, 506, 0.6, T * 2, true, { col: '#b01c10', dark: '#4a0a0a', crown: true, dmg: 1, ko: true, wid: 'res' });
    }
    if (lv.day === 24) button('Weiter!', W / 2 - 120, 422, 240, 62, () => startEnding(), { color: '#e57373', textColor: '#fff' });
    else button('Zur Karte', W / 2 - 120, 422, 240, 62, () => go('map'));
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
  let fs = 26, lines = wrapLines(s, bw - 200, fs); if (lines.length > 3) { fs = 22; lines = wrapLines(s, bw - 200, fs); } let left = n; const lh = lines.length > 3 ? 29 : 34;
  lines.forEach((ln, i) => { if (left <= 0) return; txt(ln.slice(0, left), bx + 150, by + 38 + i * lh, fs, '#3b2410', 'left'); left -= ln.length + 1; });
  if (n >= s.length && Math.sin(T * 6) > 0) txt('weiter ▶', bx + bw - 70, by + bh - 22, 18, '#8a6a3a');
}
const nameBox = document.getElementById('nameBox'), nameInput = document.getElementById('nameInput'), nameOk = document.getElementById('nameOk'), nameLabel = document.getElementById('nameLabel');
function nameOpen() { return nameBox.style.display === 'flex'; }
// The on-screen keyboard (Android especially) covers the fixed name card. Keep the card inside the part of the screen that is still visible
// (the visual viewport) and switch to a compact one-row layout when little room is left.
function fitNameBox() {
  const vv = window.visualViewport;
  if (!vv || nameBox.style.display === 'none') return;
  nameBox.style.inset = 'auto'; nameBox.style.left = vv.offsetLeft + 'px'; nameBox.style.top = vv.offsetTop + 'px'; nameBox.style.width = vv.width + 'px'; nameBox.style.height = vv.height + 'px';
  nameBox.classList.toggle('compact', vv.height < 460);
}
function unfitNameBox() { nameBox.style.inset = ''; nameBox.style.left = nameBox.style.top = nameBox.style.width = nameBox.style.height = ''; nameBox.classList.remove('compact'); }
if (window.visualViewport) for (const ev of ['resize', 'scroll']) window.visualViewport.addEventListener(ev, fitNameBox);
function askName(label, def, cb, validate, prefill) {
  nameLabel.textContent = label; nameLabel.style.color = ''; nameInput.value = prefill ? def : ''; nameInput.placeholder = def; nameBox.style.display = 'flex'; fitNameBox();
  setTimeout(() => { nameInput.focus(); if (prefill) nameInput.select(); }, 60);
  const finish = () => {
    let v = nameInput.value.trim().slice(0, 14); if (!v) v = def; v = v.charAt(0).toUpperCase() + v.slice(1);
    if (validate) { const msg = validate(v); if (msg) { nameLabel.textContent = msg; nameLabel.style.color = '#b3261e'; SFX.wrong(); return; } }
    nameBox.style.display = 'none'; unfitNameBox(); nameInput.blur(); nameOk.onclick = null; nameInput.onkeydown = null; audio(); SFX.right(); cb(v);
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
// ---------- splash: the first screen, waits for a tap (which also unlocks the sound) ----------
const splash = { go: -1, roared: false };
function startSplash() {
  if (splash.go >= 0) return;
  audio(); tryFullscreen(); splash.go = 0; splash.roared = false; SFX.egg();
}
function drawSplash() {
  const t = T, go = splash.go, p = go < 0 ? 0 : go, EX = W / 2, EY = 292 + Math.sin(t * 2) * 6 * (go < 0 ? 1 : 0.2);
  if (go >= 0) splash.go += DT;
  // night sky, aurora ribbons, stars
  const sk = ctx.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, '#07122e'); sk.addColorStop(0.5, '#1b4b63'); sk.addColorStop(1, '#2f7a62'); ctx.fillStyle = sk; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let b = 0; b < 2; b++) { ctx.strokeStyle = `rgba(${b ? '120,255,190' : '110,190,255'},${0.08 + 0.04 * Math.sin(t * 0.8 + b)})`; ctx.lineWidth = 46 - b * 14; ctx.lineCap = 'round'; ctx.beginPath(); for (let x = -20; x <= W + 20; x += 24) ctx.lineTo(x, 110 + b * 34 + Math.sin(x * 0.008 + t * 0.5 + b * 2) * 28); ctx.stroke(); }
  ctx.restore();
  for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(t * 1.3 + i * 1.7)); circle(hash(i) * W, hash(i + 40) * 300, hash(i + 9) < 0.12 ? 1.9 : 1.1, '#fff'); } ctx.globalAlpha = 1;
  // slowly turning light rays behind the egg
  ctx.save(); ctx.translate(EX, EY); ctx.rotate(t * 0.12); for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI / 7); ctx.fillStyle = `rgba(255,232,150,${0.07 + 0.08 * Math.min(1, p)})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, -620); ctx.lineTo(22, -620); ctx.fill(); } ctx.restore();
  // dark jungle silhouette: far hills, palms, near hills
  ctx.fillStyle = '#12403f'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 372 + Math.sin(x * 0.011 + 1) * 26 + Math.sin(x * 0.027) * 10); ctx.lineTo(W, H); ctx.fill();
  palm(90, 400, 170, '#0a2a2c'); palm(868, 396, 190, '#0a2a2c'); palm(200, 410, 110, '#0b3130'); palm(770, 408, 120, '#0b3130');
  ctx.fillStyle = '#0a2a2a'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 450 + Math.sin(x * 0.015 + 3) * 16 + Math.sin(x * 0.04) * 5); ctx.lineTo(W, H); ctx.fill();
  // fireflies
  for (let i = 0; i < 26; i++) { const fx = (hash(i + 70) * W + Math.sin(t * 0.6 + i) * 30 + W) % W, fy = 250 + hash(i + 90) * 200 + Math.sin(t * 0.9 + i * 2) * 14, a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.6 + i * 3)); const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 9); g.addColorStop(0, `rgba(255,245,160,${a})`); g.addColorStop(1, 'rgba(255,245,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, 9, 0, 7); ctx.fill(); }
  // nest and the golden egg
  ell(EX, EY + 78, 112, 26, 0, 'rgba(0,0,0,.35)'); ell(EX, EY + 70, 98, 24, 0, '#5a3a1c'); ell(EX, EY + 64, 90, 19, 0, '#7a5028');
  ctx.strokeStyle = '#a07038'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, bx = EX + Math.cos(a) * 84, by = EY + 64 + Math.sin(a) * 17; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + 0.9) * 16, by - 9 + Math.sin(a) * 4); ctx.stroke(); }
  const shake = go >= 0 ? Math.sin(t * 46) * 0.16 * Math.min(1, p / 0.9) : Math.sin(t * 1.6) * 0.025, glow = 0.7 + 0.25 * Math.sin(t * 3) + p * 2;
  const R = 64 * (1 + (go >= 0 ? 0.05 * Math.min(1, p / 0.9) : 0));
  drawEgg(EX, EY, R, '#ffd34a', '#fff3b0', glow, shake);
  if (go >= 0 && p > 0.25) { // cracks spread across the shell
    const k = clamp((p - 0.25) / 0.75, 0, 1); ctx.save(); ctx.translate(EX, EY); ctx.rotate(shake); ctx.strokeStyle = '#6a3a00'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const zz = [[-6, -R * 0.7], [4, -R * 0.45], [-8, -R * 0.2], [6, R * 0.05], [-4, R * 0.3]]; ctx.beginPath(); ctx.moveTo(zz[0][0], zz[0][1]); for (let i = 1; i < Math.ceil(zz.length * k) + 1 && i < zz.length; i++) ctx.lineTo(zz[i][0], zz[i][1]); ctx.stroke();
    if (k > 0.5) { ctx.beginPath(); ctx.moveTo(4, -R * 0.45); ctx.lineTo(R * 0.34, -R * 0.36); ctx.lineTo(R * 0.46, -R * 0.2); ctx.moveTo(-8, -R * 0.2); ctx.lineTo(-R * 0.36, -R * 0.1); ctx.stroke(); }
    ctx.restore();
  }
  // twinkles around the egg
  for (let i = 0; i < 6; i++) { const a = t * 0.5 + i * 1.05, rr2 = 98 + 14 * Math.sin(t * 2 + i); ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.3 + i * 2)); drawStar(EX + Math.cos(a) * rr2 * 1.25, EY + Math.sin(a) * rr2 * 0.8, 6 + 3 * (i % 2), '#fff6b8'); } ctx.globalAlpha = 1;
  // words and the big button
  const fade = go >= 0 ? clamp(1 - p / 0.5, 0, 1) : 1;
  if (fade > 0) {
    ctx.globalAlpha = fade;
    otxt('Seid ihr bereit', W / 2, 62, 46, '#fff6c0', '#1a0d00', 10); otxt('für ein Abenteuer?', W / 2, 114, 46, '#ffd34d', '#1a0d00', 10);
    if (go < 0) { const pu = 1 + 0.045 * Math.sin(t * 4); ctx.save(); ctx.translate(W / 2, 468); ctx.scale(pu, pu); button('Los geht\'s!', -150, -34, 300, 68, startSplash, { size: 30, icon: (x, y, sz) => ico('play', x, y, sz) }); ctx.restore(); buttons.pop(); } // any tap starts, the button is just the visual cue
    if (go < 0) { ico('sound', W / 2 - 66, 522, 18); txt('Mit Ton spielen', W / 2 + 8, 522, 15, 'rgba(255,255,255,.7)'); }
    ctx.globalAlpha = 1;
  }
  // the roar from far away, then a bright flash into the title
  if (go >= 0 && p > 0.7 && !splash.roared) { splash.roared = true; SFX.roar(); }
  if (go >= 0) { const f = clamp((p - 0.95) / 0.3, 0, 1); if (f > 0) { ctx.fillStyle = `rgba(255,248,215,${f})`; ctx.fillRect(0, 0, W, H); } if (p >= 1.28) { splash.go = -1; go2title(); } }
  // soft dark edges
  const vg = ctx.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 620); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,10,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}
function go2title() { go('title'); fadeT = 0; flashT = 1; }
function drawTitle() {
  const cam = T * 150;
  drawBackground(0, cam); drawGround(0, EMPTY, cam);
  shadow(436, GROUND + 2, 26, 0.3); shadow(286, GROUND + 2, 70, 0.3);
  oChili(430, GROUND - Math.abs(Math.sin(T * 9)) * 14, 1.4, T * 9);
  oRex(280, GROUND, 1.3, T * 13, 0.12 + 0.12 * Math.sin(T * 2), Object.assign(rexLook(0), { rider: true }));
  if (save.babyName) oBaby(120, GROUND - Math.abs(Math.sin(T * 10)) * 9, 1, T * 10);
  drawAmbient(0); drawForeground(0, cam); vignette(0);
  logo(W / 2, 96);
  otxt(save.rexName ? `Ein Abenteuer mit ${save.rexName} und Chili` : 'Ein Abenteuer mit Chili und einem T-Rex', W / 2, 178, 26, '#fff', 'rgba(0,0,0,.7)', 6);
  { const pu = 1 + 0.04 * Math.sin(T * 4); ctx.save(); ctx.translate(722, 312); ctx.scale(pu, pu); rr(-170, -34, 340, 68, 34); ctx.fillStyle = 'rgba(20,40,20,.35)'; ctx.fill(); rr(-174, -38, 340, 68, 34); ctx.fillStyle = vgrad(-38, 30, '#ffe27a', '#ff9a2a'); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#2a1200'; ctx.stroke(); ctx.fillStyle = '#3b1d00'; ctx.beginPath(); ctx.moveTo(-146, -13); ctx.lineTo(-146, 13); ctx.lineTo(-124, 0); ctx.fill(); txt('Tippe zum Starten', 20, -2, 26, '#3b1d00'); ctx.restore(); }
  txt('Ein Weihnachtsgeschenk von Goetti für Oli und Fabio · 2026', W / 2, 515, 17, 'rgba(255,255,255,.75)');
}
function logo(cx, cy) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.03);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const line = (t, sz, y) => { // two lines: the boys' names small on top, the title big below
    setFont(sz); const k = sz / 78;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillText(t, 4 * k, y + 9 * k);
    ctx.strokeStyle = '#2a1200'; ctx.lineWidth = 18 * k; ctx.strokeText(t, 0, y);
    ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = 8 * k; ctx.strokeText(t, 0, y);
    ctx.fillStyle = vgrad(y - 34 * k, y + 34 * k, '#fff6b0', '#ffd34d', '#f08a1a'); ctx.fillText(t, 0, y);
    ctx.save(); ctx.beginPath(); ctx.rect(-480, y - 40 * k, 960, 30 * k); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillText(t, 0, y); ctx.restore();
  };
  line('Oli & Fabios', 52, -38); line('Dino-Advent', 76, 18);
  for (let i = 0; i < 4; i++) { const a = 0.5 + 0.5 * Math.sin(T * 3 + i * 1.7), px = [-300, -90, 150, 320][i], py = [-38, 34, -40, 30][i]; ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.beginPath(); for (let k = 0; k < 8; k++) { const ang = k / 8 * Math.PI * 2, r = k % 2 ? 2.5 : 10; ctx.lineTo(px + Math.cos(ang) * r, py + Math.sin(ang) * r); } ctx.fill(); }
  ctx.globalAlpha = 1; ctx.restore();
}
function pressTitle() {
  tryFullscreen();
  if (!save.rexName) startStory();
  else if (!save.fabioName) { go('story'); startDialog([{ who: 'goetti', text: 'Neu im Team: Fabio! Ab jetzt reitet ihr zu zweit auf {rex}.' }], () => askName('Wie soll Fabios Forschername sein?', 'Fabio', name => { save.fabioName = name; writeSave(); go('map'); }, null, true), true); }
  else go('map');
}

function startStory() {
  go('story');
  const rexPart = () => startDialog([
    { who: 'goetti', text: 'Zum Glück habt ihr einen starken Freund: einen jungen T-Rex! Er ist so gross, dass ihr zu zweit auf ihm reiten könnt. Aber er hat noch keinen Namen…' },
  ], () => askName('Wie soll euer T-Rex heissen?', 'Rexi', name => {
    save.rexName = name; writeSave();
    startDialog([
      { who: 'rex', text: 'ROOOAAARRR! ({rex} gefällt der Name!)' },
      { who: 'goetti', text: '{rex} – super Name! {oli} sitzt hinten und hält die Zügel. {fabio} sitzt vorne und hält sich gut fest.' },
      { who: 'fabio', text: 'Hü, {rex}, hü!' },
      { who: 'goetti', text: 'Und Chili kommt auch mit. Mit der Hasennase findet Chili jedes versteckte Ei!' },
      { who: 'chili', text: 'Schnupper, schnupper… Chili ist bereit!' },
      { who: 'goetti', text: 'Jeden Tag bis Weihnachten öffnet sich eine neue Tür in meinem Adventskalender – hinter jeder wartet ein Abenteuer! Und am Schluss warten der Krallenkönig und das goldene Ei. Los geht\'s!' },
    ], () => go('map'), true);
  }), true);
  const missionPart = () => startDialog([
    { who: 'goetti', text: 'Willkommen im Team, {oli} und {fabio}! Heute Nacht hat der Vulkan gebebt – und alle meine Dino-Eier sind davongerollt!' },
    { who: 'goetti', text: 'Und das Schlimmste: Auch das goldene Ei meiner Nachbarn, der Dino-Familie, ist verschwunden!' },
    { who: 'mami', text: '(Funkspruch) Hilfe! Der Krallenkönig hat unser Ei geklaut! Er ist riesig und hat ganz scharfe Krallen!' },
    { who: 'goetti', text: 'Ich brauche die mutigsten Dino-Forscher der Welt. Und das seid IHR zwei!' },
  ], rexPart, true);
  const fabioPart = () => askName('Und wie soll Fabios Forschername sein?', 'Fabio', name => { save.fabioName = name; writeSave(); missionPart(); }, null, true);
  if (save.oliName) { if (!save.fabioName) fabioPart(); else if (save.rexName) go('map'); else missionPart(); return; }
  startDialog([
    { who: 'goetti', text: 'Hallo Oli, hallo Fabio! Hier ist Goetti, aus meiner Dino-Forschungsstation in Neuseeland – direkt am grossen Vulkan.' },
    { who: 'goetti', text: 'Bei uns am anderen Ende der Welt ist alles etwas anders – sogar die Vögel: Unsere Kiwis können nicht fliegen!' },
    { who: 'goetti', text: 'Ihr zwei werdet ab heute richtige Dino-Forscher! Dafür darf sich jeder einen Forschernamen aussuchen – ihr könnt Oli und Fabio bleiben oder euch etwas ganz Neues ausdenken.' },
  ], () => askName('Wie soll Olis Forschername sein?', 'Oli', name => { save.oliName = name; writeSave(); fabioPart(); }, null, true), true);
}
function drawNZFlag(x, y, w, h, t, pole = 70) { // flag on a pole, waving a little, with cloth shading and a gold finial
  ctx.save(); ctx.translate(x, y);
  const pg = ctx.createLinearGradient(-3, 0, 3, 0); pg.addColorStop(0, '#f4f4f8'); pg.addColorStop(0.5, '#c4c6d0'); pg.addColorStop(1, '#8a8c98'); ctx.fillStyle = pg; rr(-2.8, -4, 5.6, h + pole + 4, 2.8); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(30,30,50,.5)'; ctx.stroke();
  ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(0, -8, 5, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#8a5a00'; ctx.stroke(); circle(-1.5, -9.6, 1.6, '#fff8d0');
  for (let i = 0; i < 16; i++) { // vertical slices give a cheap wave; the slope of the wave lights or darkens the cloth
    const sx = i * w / 16, ph = t * 3 + i * 0.42, off = Math.sin(ph) * (0.8 + i * 0.3), sl = Math.cos(ph); ctx.save(); ctx.beginPath(); ctx.rect(3 + sx, off - 1, w / 16 + 1, h + 2); ctx.clip(); ctx.translate(3, off);
    ctx.fillStyle = '#00247d'; ctx.fillRect(0, 0, w, h);
    const cw = w * 0.5, ch = h * 0.5; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, ch); ctx.clip();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = h * 0.13; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cw, ch); ctx.moveTo(cw, 0); ctx.lineTo(0, ch); ctx.stroke();
    ctx.strokeStyle = '#cc142b'; ctx.lineWidth = h * 0.05; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cw, ch); ctx.moveTo(cw, 0); ctx.lineTo(0, ch); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(cw * 0.5 - h * 0.09, 0, h * 0.18, ch); ctx.fillRect(0, ch * 0.5 - h * 0.09, cw, h * 0.18);
    ctx.fillStyle = '#cc142b'; ctx.fillRect(cw * 0.5 - h * 0.055, 0, h * 0.11, ch); ctx.fillRect(0, ch * 0.5 - h * 0.055, cw, h * 0.11); ctx.restore();
    for (const [fx, fy, r] of [[0.76, 0.2, 0.075], [0.63, 0.5, 0.07], [0.88, 0.45, 0.07], [0.76, 0.78, 0.085]]) { drawStar(fx * w, fy * h, h * r * 1.25, '#fff'); drawStar(fx * w, fy * h, h * r, '#cc142b'); }
    ctx.fillStyle = sl > 0 ? `rgba(255,255,255,${0.16 * sl})` : `rgba(0,0,30,${-0.22 * sl})`; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0, h - 2.5, w, 2.5); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(0, 0, w, 1.5);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([2.5, 2.5]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(6, 3); ctx.lineTo(6, h - 3); ctx.stroke(); ctx.setLineDash([]); // stitching along the hoist
  ctx.fillStyle = '#c9a050'; for (const yy of [h * 0.2, h * 0.8]) { rr(-3.4, yy - 2, 6.8, 4, 1.5); ctx.fill(); } // rope clips
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
function drawStation(cx, base, k) { // Goetti's dino station: stone foundation, log walls, shingle roof, radio mast, flag, glowing window
  ctx.save(); ctx.translate(cx, base); ctx.scale(k, k); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const INK = '#2b1a0c';
  ell(6, 4, 168, 12, 0, 'rgba(0,0,0,.28)');
  // flag on its mast, behind the roof
  drawNZFlag(0, -312, 76, 48, T, 66);
  // radio mast beside the chimney: the Funkspruch comes in here
  ctx.strokeStyle = '#4a4a52'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-70, -196); ctx.lineTo(-70, -262); ctx.stroke(); ctx.lineWidth = 2; for (const [yy, hw] of [[-236, 14], [-250, 10], [-262, 6]]) { ctx.beginPath(); ctx.moveTo(-70 - hw, yy); ctx.lineTo(-70 + hw, yy); ctx.stroke(); }
  circle(-70, -264, 3, '#e53935'); ctx.globalAlpha = 0.45 + 0.4 * Math.sin(T * 4); circle(-70, -264, 7, 'rgba(255,80,60,.5)'); ctx.globalAlpha = 1;
  // chimney with smoke
  rr(60, -236, 34, 66, 3); ctx.fillStyle = vgrad(-236, -170, '#8d8d96', '#6a6a74'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5; for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.moveTo(60, -226 + r * 15); ctx.lineTo(94, -226 + r * 15); ctx.stroke(); } rr(56, -244, 42, 10, 3); ctx.fillStyle = '#55555e'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
  for (let i = 0; i < 6; i++) { const u = (T * 0.22 + i / 6) % 1; circle(77 + Math.sin(u * 6 + i) * 9 + u * 26, -250 - u * 70, 7 + u * 17, `rgba(225,228,236,${0.55 * (1 - u)})`); }
  // walls: log planks with round log ends at the corners
  rr(-132, -152, 264, 128, 4); ctx.fillStyle = vgrad(-152, -24, '#b07a48', '#8a5a2e', '#6a431f'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  for (let r = 0; r < 8; r++) { const yy = -152 + r * 16 + 8; ctx.strokeStyle = 'rgba(40,20,5,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-130, yy + 8); ctx.lineTo(130, yy + 8); ctx.stroke(); ctx.strokeStyle = 'rgba(255,225,170,.14)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-130, yy - 5); ctx.lineTo(130, yy - 5); ctx.stroke(); for (const sx of [-132, 132]) { circle(sx, yy, 7.5, r % 2 ? '#c99660' : '#b88450'); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(sx, yy, 7.5, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(90,50,15,.55)'; ctx.beginPath(); ctx.arc(sx, yy, 3.6, 0, 7); ctx.stroke(); } }
  for (let i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(60,30,8,.14)'; ctx.fillRect(-124 + hash(i * 3) * 248, -150 + hash(i * 5 + 2) * 124, 8 + hash(i) * 14, 1.6); }
  // stone foundation
  rr(-140, -26, 280, 26, 3); ctx.fillStyle = '#8d8d96'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); for (let r = 0; r < 2; r++) for (let c = 0; c < 9; c++) { const bx = -140 + c * 31 + (r % 2) * 15, by = -26 + r * 13; rr(bx + 1, by + 1, 29, 11, 3); ctx.fillStyle = (c + r) % 3 ? '#a2a2ac' : '#8a8a94'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(30,30,40,.45)'; ctx.stroke(); }
  // roof: shingles in two tones, trim boards, attic window
  ctx.save(); ctx.beginPath(); ctx.moveTo(-166, -148); ctx.lineTo(0, -252); ctx.lineTo(166, -148); ctx.closePath(); ctx.fillStyle = '#6a2a24'; ctx.fill(); ctx.clip();
  for (let r = 0; r < 8; r++) for (let c = -9; c <= 9; c++) { const sx = c * 20 + (r % 2) * 10, sy = -150 - r * 13.5; ctx.fillStyle = (c + r) % 2 ? '#8a3a30' : '#a24a38'; ctx.beginPath(); ctx.moveTo(sx - 10, sy); ctx.lineTo(sx + 10, sy); ctx.arc(sx, sy, 10, 0, Math.PI); ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(40,10,5,.55)'; ctx.stroke(); }
  const rg = ctx.createLinearGradient(-166, 0, 166, 0); rg.addColorStop(0, 'rgba(255,255,255,.12)'); rg.addColorStop(0.5, 'rgba(255,255,255,0)'); rg.addColorStop(1, 'rgba(0,0,0,.22)'); ctx.fillStyle = rg; ctx.fillRect(-170, -260, 340, 120);
  ctx.fillStyle = 'rgba(90,140,60,.55)'; for (const [mx, my, mr] of [[-96, -164, 9], [-84, -160, 6], [110, -172, 7]]) { ctx.beginPath(); ctx.ellipse(mx, my, mr * 1.6, mr * 0.7, 0, 0, 7); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = '#d9aa72'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-170, -146); ctx.lineTo(0, -255); ctx.lineTo(170, -146); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-170, -151); ctx.lineTo(0, -260); ctx.lineTo(170, -151); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-170, -141); ctx.lineTo(0, -250); ctx.lineTo(170, -141); ctx.stroke();
  rr(-172, -150, 344, 8, 3); ctx.fillStyle = '#c99660'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
  circle(0, -192, 18, '#d9aa72'); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); circle(0, -192, 13, `rgba(255,${200 + Math.floor(20 * Math.sin(T * 3))},110,1)`); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-13, -192); ctx.lineTo(13, -192); ctx.moveTo(0, -205); ctx.lineTo(0, -179); ctx.stroke(); drawStar(0, -192, 4, 'rgba(255,255,255,.6)');
  // window with shutters, glow and a flower box
  const wx = -92, wy = -112; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const wg = ctx.createRadialGradient(wx + 30, wy + 28, 4, wx + 30, wy + 28, 70); wg.addColorStop(0, `rgba(255,210,110,${0.45 + 0.08 * Math.sin(T * 3)})`); wg.addColorStop(1, 'rgba(255,190,80,0)'); ctx.fillStyle = wg; ctx.fillRect(wx - 40, wy - 40, 140, 140); ctx.restore();
  rr(wx, wy, 60, 54, 4); ctx.fillStyle = vgrad(wy, wy + 54, '#fff0b8', '#ffd878'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#5a3416'; ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx + 30, wy); ctx.lineTo(wx + 30, wy + 54); ctx.moveTo(wx, wy + 27); ctx.lineTo(wx + 60, wy + 27); ctx.stroke();
  ctx.fillStyle = 'rgba(200,70,60,.55)'; ctx.beginPath(); ctx.moveTo(wx + 3, wy + 3); ctx.quadraticCurveTo(wx + 12, wy + 22, wx + 3, wy + 24); ctx.fill(); ctx.beginPath(); ctx.moveTo(wx + 57, wy + 3); ctx.quadraticCurveTo(wx + 48, wy + 22, wx + 57, wy + 24); ctx.fill();
  for (const sd of [-1, 1]) { const sx = sd < 0 ? wx - 17 : wx + 60; rr(sx, wy - 2, 17, 58, 3); ctx.fillStyle = '#3e8a4a'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5; for (let q = 1; q < 6; q++) { ctx.beginPath(); ctx.moveTo(sx + 2, wy - 2 + q * 9.5); ctx.lineTo(sx + 15, wy - 2 + q * 9.5); ctx.stroke(); } }
  rr(wx - 6, wy + 56, 72, 12, 3); ctx.fillStyle = '#6b4a2b'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke(); for (let q = 0; q < 6; q++) { const fx = wx + 2 + q * 11.5; circle(fx, wy + 54 + Math.sin(q) * 2, 4.6, ['#ff5a6a', '#ffd34d', '#ff8ad0'][q % 3]); circle(fx, wy + 54 + Math.sin(q) * 2, 1.6, '#fff3b0'); }
  // door with round window, knob, steps and a footprint doormat
  const dx = 40; rr(dx, -108, 62, 84, 6); ctx.fillStyle = vgrad(-108, -24, '#7a4a28', '#4e2d14'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.strokeRect(dx + 8, -74, 18, 22); ctx.strokeRect(dx + 36, -74, 18, 22); ctx.strokeRect(dx + 8, -46, 18, 18); ctx.strokeRect(dx + 36, -46, 18, 18);
  circle(dx + 31, -92, 11, '#ffe08a'); ctx.lineWidth = 3; ctx.strokeStyle = '#d9aa72'; ctx.beginPath(); ctx.arc(dx + 31, -92, 11, 0, 7); ctx.stroke(); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(dx + 31, -103); ctx.lineTo(dx + 31, -81); ctx.moveTo(dx + 20, -92); ctx.lineTo(dx + 42, -92); ctx.stroke(); circle(dx + 51, -62, 3.4, '#ffd34d'); circle(dx + 50, -63, 1.2, '#fff8d0');
  rr(dx - 8, -24, 78, 8, 2); ctx.fillStyle = '#9a9aa4'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); rr(dx - 14, -16, 90, 8, 2); ctx.fillStyle = '#b0b0ba'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a8a4a'; rr(dx + 6, -9, 50, 8, 3); ctx.fill(); ctx.fillStyle = '#c8f0b8'; for (const [fx, fy] of [[dx + 22, -5], [dx + 30, -5], [dx + 38, -5]]) circle(fx, fy, 1.8, '#c8f0b8');
  // lantern by the door
  ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(116, -118); ctx.lineTo(116, -104); ctx.stroke(); rr(108, -104, 16, 22, 4); ctx.fillStyle = '#d9a23a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); circle(116, -93, 5, '#fff3b0'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(116, -93, 2, 116, -93, 38); lg.addColorStop(0, `rgba(255,220,120,${0.55 + 0.1 * Math.sin(T * 7)})`); lg.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = lg; ctx.fillRect(78, -131, 76, 76); ctx.restore();
  // hanging sign on chains
  ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 2; for (const sx of [-118, -22]) { ctx.beginPath(); ctx.moveTo(sx, -146); ctx.lineTo(sx, -134); ctx.stroke(); } rr(-128, -134, 116, 22, 5); ctx.fillStyle = vgrad(-134, -112, '#f6e6c4', '#e0c898'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#5a3416'; ctx.stroke(); txt('Dino-Station', -70, -126, 12, '#3b2410'); txt('Neuseeland', -70, -116, 8.5, '#2a5aa0');
  // crates, a barrel and an egg basket at the foot of the wall
  rr(-166, -34, 24, 34, 4); ctx.fillStyle = vgrad(-34, 0, '#a66a35', '#6a4220'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 2.5; for (const yy of [-26, -8]) { ctx.beginPath(); ctx.moveTo(-166, yy); ctx.lineTo(-142, yy); ctx.stroke(); }
  rr(110, -22, 30, 22, 3); ctx.fillStyle = '#b88450'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); drawEgg(118, -26, 6.5, '#f6e7b0', '#6aa84f'); drawEgg(129, -25, 6, '#cfe8ff', '#e07b39'); drawEgg(137, -24, 5.5, '#ffe9c2', '#d63a3a'); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(125, -22, 15, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.restore();
}
function stationWinter(cx, base, k) { // snow on the roof, a string of lights under the eaves, a wreath on the door
  ctx.save(); ctx.translate(cx, base); ctx.scale(k, k);
  ctx.beginPath(); ctx.moveTo(-178, -146); ctx.lineTo(0, -266); ctx.lineTo(178, -146);
  for (let i = 0; i <= 12; i++) { const t = 1 - i / 12, x = -178 + 356 * t, top = -146 - 120 * (1 - Math.abs(t * 2 - 1)), sag = 12 + hash(i * 2.3) * 10; ctx.quadraticCurveTo(x + 14, top + sag + 6, x, top + 10); }
  ctx.closePath(); ctx.fillStyle = vgrad(-266, -140, '#ffffff', '#d4e2f4'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(60,80,120,.45)'; ctx.stroke();
  for (const [ix, len] of [[-150, 14], [-120, 22], [-80, 12], [90, 18], [130, 24], [156, 12]]) { const top = -146 - 120 * (1 - Math.abs((ix + 178) / 356 * 2 - 1)) + 14; ctx.fillStyle = 'rgba(215,238,255,.95)'; ctx.beginPath(); ctx.moveTo(ix - 4, top); ctx.lineTo(ix + 4, top); ctx.lineTo(ix, top + len); ctx.fill(); } // icicles
  ctx.lineWidth = 2; ctx.strokeStyle = '#2a2a2a'; ctx.beginPath(); ctx.moveTo(-170, -140); for (let i = 1; i <= 10; i++) ctx.quadraticCurveTo(-170 + (i - 0.5) * 34, -132, -170 + i * 34, -140); ctx.stroke();
  for (let i = 0; i < 10; i++) { const on = (i + Math.floor(T * 3)) % 4, c = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff'][on]; const bx = -170 + (i + 0.5) * 34, by = -135; ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = LOWFX ? 0 : 10; ell(bx, by + 4, 4.5, 6.5, 0, c); ctx.restore(); }
  ctx.strokeStyle = '#2e8b57'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(71, -58, 15, 0, Math.PI * 2); ctx.stroke(); // wreath
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; circle(71 + Math.cos(a) * 15, -58 + Math.sin(a) * 15, 2.6, '#d63a3a'); }
  ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(71, -44); ctx.lineTo(62, -30); ctx.lineTo(71, -38); ctx.lineTo(80, -30); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function endingSnow() { // snowy ground: soft drifts lit by the moon, blue shadows, the window's warm light pooling on the snow
  ctx.fillStyle = vgrad(440, H, '#f2f7ff', '#a9bfe0'); ctx.fillRect(0, 446, W, H - 446);
  for (const [x, w, h] of [[60, 230, 62], [420, 260, 48], [800, 280, 66]]) { // big banks in the foreground, rising out of the bottom edge
    ctx.fillStyle = 'rgba(80,110,170,.18)'; ctx.beginPath(); ctx.ellipse(x - 14, H + 14, w + 10, h + 6, 0, Math.PI, 0); ctx.fill(); // blue shadow behind the crest
    ctx.fillStyle = vgrad(H + 10 - h, H, '#ffffff', '#cfdcf0'); ctx.beginPath(); ctx.ellipse(x, H + 10, w, h, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, H + 10, w * 0.9, h * 0.94, 0, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
  }
  ctx.fillStyle = vgrad(444, 458, '#ffffff', 'rgba(255,255,255,0)'); ctx.fillRect(0, 444, W, 14);
  const pg = ctx.createRadialGradient(85, 470, 10, 85, 470, 150); pg.addColorStop(0, 'rgba(255,200,110,.35)'); pg.addColorStop(1, 'rgba(255,200,110,0)'); ctx.fillStyle = pg; ctx.fillRect(-65, 420, 300, 120);
  for (let k = 0; k < 40; k++) { const tw = Math.sin(T * 2.5 + k * 1.9); if (tw > 0.7) { const x = hash(k + 70) * W, y = 452 + hash(k + 71) * 80, s = (tw - 0.7) * 14; ctx.fillStyle = '#fff'; ctx.fillRect(x - s / 2, y - 0.6, s, 1.2); ctx.fillRect(x - 0.6, y - s / 2, 1.2, s); } }
}
function drawStory() {
  const bi = dialog ? dialog.i : 0, phA = !save.oliName, phB = !!save.oliName && !save.rexName, ph2 = !!save.rexName, quake = phB && !!dialog && dialog.lines.length === 4 && bi <= 2, roar = ph2 && bi === 0;
  ctx.save(); if (quake || roar) ctx.translate(Math.sin(T * 47) * (quake ? 3 : 2), Math.cos(T * 39) * 2);
  drawBackground(0, 0); drawGround(0, EMPTY, 0);
  drawStation(690, GROUND, 0.74);
  shadow(486, GROUND + 2, 34, 0.3); shadow(246, GROUND + 2, 64, 0.3); shadow(386, GROUND + 2, 26, 0.3);
  treeFern(70, GROUND + 4, 150); treeFern(905, GROUND + 4, 125);
  const hop = phA && bi === 1 ? Math.abs(Math.sin(T * 6)) * 26 : 0; // the kiwi hops but cannot fly
  shadow(548, GROUND + 2, 26 - hop * 0.3, 0.3); oKiwi(548, GROUND - hop, 1.5, T * 3, true);
  if (phA && bi === 1) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let k = 0; k < 3; k++) { const a = 0.4 + k * 0.5; ctx.beginPath(); ctx.arc(548, GROUND - 30 - hop, 54 + k * 8, Math.PI + a, Math.PI + a + 0.3); ctx.stroke(); } ctx.restore(); }
  oGoetti(480, GROUND, 1.2, true);
  if (phB && dialog && dialog.lines.length === 4 && bi === 3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, 40, 0, GROUND); g.addColorStop(0, 'rgba(255,230,140,0)'); g.addColorStop(1, 'rgba(255,230,140,.35)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(220, 40); ctx.lineTo(290, 40); ctx.lineTo(340, GROUND); ctx.lineTo(170, GROUND); ctx.fill(); ctx.restore(); for (let k = 0; k < 5; k++) { const a = T * 2 + k * 1.26, r = 70 + 8 * Math.sin(T * 5 + k); drawStar(255 + Math.cos(a) * r, 310 + Math.sin(a) * r * 0.9, 7 + 3 * Math.sin(T * 6 + k), '#ffe27a'); } }
  oRex(240, GROUND, 1.15, T * 2, roar ? 0.9 : save.rexName ? 0.2 : 0, Object.assign(rexLook(0), { rider: true }));
  if (phB && (!dialog || dialog.lines.length === 1)) otxt('?', 300, 214 + Math.sin(T * 4) * 8, 58, '#ffd34d', '#3b1d00', 10);
  if (roar) for (let k = 0; k < 3; k++) { const u = ((T * 1.6 + k / 3) % 1); ctx.strokeStyle = `rgba(255,240,200,${0.8 * (1 - u)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(330, 372, 30 + u * 110, -0.9, 0.9); ctx.stroke(); }
  if (ph2 && bi === 2) chiliFx.dig = true; oChili(380, GROUND, 1.4, T * 3); chiliFx.dig = false;
  if (quake) { // the volcano shook: eggs roll away across the ground
    for (let k = 0; k < 5; k++) { const x = W + 40 - ((T * 150 + k * 210) % (W + 240)), pal = [['#f6e7b0', '#6aa84f'], ['#cfe8ff', '#e07b39'], ['#ffe9c2', '#d63a3a']][k % 3]; shadow(x, GROUND + 4, 14, 0.25); drawEgg(x, GROUND - 14, 15, pal[0], pal[1], 0, -x * 0.04); }
    for (let k = 0; k < 14; k++) { const u = (T * 0.8 + k * 0.173) % 1; ctx.globalAlpha = 1 - u; circle(760 + Math.sin(k * 7) * 40, 230 - u * 160, 3 + k % 3, k % 2 ? '#ff9a3a' : '#ffd34d'); } ctx.globalAlpha = 1;
  }
  ctx.restore();
  vignette(0);
}

const chestPop = [0, 0, 0, 0];
const chestFull = () => save.treasures.every(Boolean);
let chestPartyT = 0, mapFW = 0;
function chestParty() { // all four treasures are back: the chest glows, the treasures dance and Goetti's song plays
  chestPartyT = 7; SFX.right();
  [[0, 523], [0.18, 659], [0.36, 784], [0.54, 1047], [0.9, 988], [1.08, 784], [1.26, 659], [1.44, 784], [1.8, 1047], [2.0, 1319], [2.2, 1047], [2.4, 784]].forEach(([d, f]) => tone(f, 0.28, 'triangle', 0.09, null, d));
  [[0, 262], [0.9, 196], [1.8, 262], [2.4, 330]].forEach(([d, f]) => tone(f, 0.7, 'sine', 0.06, null, d));
  for (const [d, f] of [[2.9, 2100], [3.1, 2650]]) { tone(f, 0.3, 'sine', 0.1, null, d); }
}
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
  { const cx0 = 262, cw = 420, cy0 = H - 122, rim = cy0 + 56;
    if (chestFull()) buttons.push({ x: cx0, y: cy0 - 10, w: cw, h: 130, silent: true, cb: () => chestParty() }); // tap the full chest to celebrate again
    shadow(cx0 + cw / 2, H - 8, cw * 0.55, 0.35);
    if (chestPartyT > 0) { chestPartyT -= DT; const u = clamp(chestPartyT / 7, 0, 1), gl = ctx.createRadialGradient(cx0 + cw / 2, rim - 10, 10, cx0 + cw / 2, rim - 10, 260); gl.addColorStop(0, `rgba(255,236,150,${0.55 * Math.min(1, u * 4)})`); gl.addColorStop(1, 'rgba(255,236,150,0)'); ctx.fillStyle = gl; ctx.fillRect(cx0 - 120, rim - 250, cw + 240, 330);
      for (let i = 0; i < 4; i++) chestPop[i] = Math.max(chestPop[i], 0.5 + 0.5 * Math.sin(T * 9 + i * 1.6));
      if (Math.random() < 0.35) burst(cx0 + 40 + Math.random() * (cw - 80), rim - 30, 4, ['#ffd740', '#fff', '#ff8a9a', '#69f0ae', '#40c4ff'], 260, 380, 5, 1); }
    // open lid, seen from the inside (red velvet, wood rim, gold trim)
    ctx.beginPath(); ctx.moveTo(cx0 + 18, rim); ctx.lineTo(cx0 + 10, cy0 + 22); ctx.quadraticCurveTo(cx0 + cw / 2, cy0 - 18, cx0 + cw - 10, cy0 + 22); ctx.lineTo(cx0 + cw - 18, rim); ctx.closePath();
    ctx.fillStyle = '#7b4a28'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx0 + 30, rim - 2); ctx.lineTo(cx0 + 24, cy0 + 26); ctx.quadraticCurveTo(cx0 + cw / 2, cy0 - 6, cx0 + cw - 24, cy0 + 26); ctx.lineTo(cx0 + cw - 30, rim - 2); ctx.closePath();
    ctx.fillStyle = vgrad(cy0, rim, '#9b2a3a', '#6f1626', '#4a0e1a'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d4a017'; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; for (let i = 1; i < 9; i++) { ctx.beginPath(); ctx.moveTo(cx0 + 24 + i * (cw - 48) / 9, cy0 + 24 - Math.sin(i / 9 * Math.PI) * 18); ctx.lineTo(cx0 + 30 + i * (cw - 60) / 9, rim - 2); ctx.stroke(); }
    otxt('Goettis Schatzkiste', cx0 + cw / 2, cy0 - 10, 17, '#ffd34d', 'rgba(40,16,0,.85)', 5);
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
  else if (wi === 1) cactus(x + w * 0.5, gy, 30, '#5f7a2a', 3);
  else if (wi === 2 || wi === 4) pine(x + w * 0.5, gy + 2, 40, wi === 4 ? '#14303f' : '#1d4a3f', wi === 4);
  ctx.fillStyle = th.top || '#4a7a3a'; ctx.fillRect(x, gy, w, h - (gy - y));
  ctx.restore();
}
const doorScenes = {};
function doorScene(i, rex) { // the real level backdrop, pre-rendered small: what the door opens onto
  const key = i + (rex ? 'r' : 'p'); if (doorScenes[key]) return doorScenes[key];
  const lv = LEVELS[i], R = 2, DW = 86, DH = 72, k = DH / 400, old = ctx, oldT = T, c = document.createElement('canvas'); c.width = DW * R; c.height = DH * R;
  ctx = c.getContext('2d'); T = 1;
  try {
    ctx.setTransform(R * k, 0, 0, R * k, -R * k * 140, -R * k * 140); // crop: world x 140.., y 140..540
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    const cam = 400 + lv.sub * 1300 + (lv.boss ? 700 : 0);
    drawBackground(lv.wi, cam); drawGround(lv.wi, EMPTY, cam);
    if (rex) { const sh = (x, y, rx) => ell(x, y, rx, 9, 0, 'rgba(0,0,0,.3)'); sh(300, GROUND + 4, 90); oRex(300, GROUND, 1.25, 0.5, 0.08, Object.assign(rexLook(lv.wi), { rider: true })); }
    ctx.restore();
  } catch (e) { return null; } finally { ctx = old; T = oldT; }
  return doorScenes[key] = c;
}
function drawDoorScene(i, x, y, w, h, rex) {
  const c = doorScene(i, rex); if (!c) { drawThemeThumb(LEVELS[i].wi, x, y, w, h); return; }
  ctx.drawImage(c, x, y, w, h);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.22)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
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
  ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.beginPath(); ctx.moveTo(-3, 25); ctx.quadraticCurveTo(-3, -4, w / 2, -4); ctx.quadraticCurveTo(w + 3, -4, w + 3, 25); ctx.quadraticCurveTo(w * 0.9, 13, w * 0.78, 20); ctx.quadraticCurveTo(w * 0.62, 9, w * 0.5, 18); ctx.quadraticCurveTo(w * 0.34, 8, w * 0.22, 17); ctx.quadraticCurveTo(w * 0.08, 10, -3, 25); ctx.fill(); ctx.strokeStyle = 'rgba(150,180,220,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  if (done || (open && opened)) { // the door stands open: a view of the level's theme
    ctx.save(); ctx.beginPath(); ctx.moveTo(ix, h); ctx.lineTo(ix, iy + 18); ctx.quadraticCurveTo(ix, iy, w / 2, iy); ctx.quadraticCurveTo(ix + iw, iy, ix + iw, iy + 18); ctx.lineTo(ix + iw, h); ctx.closePath(); ctx.clip();
    drawDoorScene(i, ix, iy, iw, ih, !done); if (!done) { ctx.fillStyle = 'rgba(10,10,30,.18)'; ctx.fillRect(ix, iy, iw, ih); } ctx.restore();
    if (done) { drawCardArt(i, w / 2, h * 0.47, 66, false); }
    ctx.fillStyle = '#6a4a2b'; ctx.beginPath(); ctx.moveTo(ix, h); ctx.lineTo(ix, iy + 18); ctx.lineTo(ix + 12, iy + 24); ctx.lineTo(ix + 12, h); ctx.closePath(); ctx.fill(); // the opened door leaf
  } else { // closed wooden door
    ctx.beginPath(); ctx.moveTo(ix, h); ctx.lineTo(ix, iy + 18); ctx.quadraticCurveTo(ix, iy, w / 2, iy); ctx.quadraticCurveTo(ix + iw, iy, ix + iw, iy + 18); ctx.lineTo(ix + iw, h); ctx.closePath();
    ctx.fillStyle = vgrad(iy, h, open ? '#b07a42' : '#7a6a58', open ? '#7a4e24' : '#4f4438'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w / 2, iy + 2); ctx.lineTo(w / 2, h); ctx.moveTo(ix + 3, h * 0.58); ctx.lineTo(ix + iw - 3, h * 0.58); ctx.stroke();
    if (open) { ctx.save(); ctx.beginPath(); ctx.moveTo(ix, h); ctx.lineTo(ix, iy + 18); ctx.quadraticCurveTo(ix, iy, w / 2, iy); ctx.quadraticCurveTo(ix + iw, iy, ix + iw, iy + 18); ctx.lineTo(ix + iw, h); ctx.closePath(); ctx.clip(); ctx.globalAlpha = 0.32; ctx.fillStyle = th.far; ctx.fillRect(ix, iy, iw, ih); ctx.restore(); // theme tint
      ctx.save(); rr(w / 2 - 22, h * 0.56, 44, 26, 8); ctx.clip(); ctx.drawImage(doorScene(i, false) || doorScene(i, true), w / 2 - 22, h * 0.56, 44, 26); ctx.restore(); rr(w / 2 - 22, h * 0.56, 44, 26, 8); ctx.lineWidth = 2; ctx.strokeStyle = '#2b1a0c'; ctx.stroke(); }
    circle(w - 14, h * 0.5, 3.4, open ? '#ffd34d' : '#9a8a78');
  }
  // number tag
  if (!done) { circle(w / 2, h * 0.36, 16, open ? '#fff3c0' : 'rgba(255,255,255,.7)'); ctx.lineWidth = 2; ctx.strokeStyle = open ? '#a06a00' : '#6a5a4a'; ctx.stroke(); txt(String(day), w / 2, h * 0.36 + 1, 20, open ? '#7a3a00' : '#6a5a4a'); }
  else { circle(w - 14, 22, 13, '#fff7e0'); ctx.lineWidth = 2; ctx.strokeStyle = '#2b1a0c'; ctx.stroke(); txt(String(day), w - 14, 23, 15, '#3b2410'); }
  if (!open) ico('lock', w / 2, h * 0.72, 20);
  if (isToday) { ctx.save(); ctx.translate(14, 14); ctx.rotate(-0.35); rr(-24, -9, 48, 18, 5); ctx.fillStyle = '#e53935'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('HEUTE', 0, 1, 11, '#fff'); ctx.restore(); }
  if (done) { rr(w / 2 - 36, h - 23, 72, 20, 10); ctx.fillStyle = 'rgba(30,18,8,.6)'; ctx.fill(); for (let k = 0; k < 3; k++) drawMedal(w / 2 - 22 + k * 22, h - 13, 7, k, save.lvM[i][k]); }
  if (lv.boss && open) { drawStar(14, h - 14, 9, '#ff6a3a'); }
  if (open && worldMedalsDone(lv.wi)) { ctx.save(); ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 8 + 4 * Math.sin(T * 3 + i); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, 22); ctx.quadraticCurveTo(0, 0, w / 2, 0); ctx.quadraticCurveTo(w, 0, w, 22); ctx.lineTo(w, h); ctx.stroke(); ctx.restore(); }
  ctx.restore();
  buttons.push({ x, y, w, h, cb: () => clickDoor(i) });
}
let doorOverlay = null, parentMode = false, titlePress = 0;
function clickDoor(i) {
  const day = i + 1, today = adventDay();
  if (day > today) { SFX.wrong(); toast(today === 0 ? 'Der Kalender startet am 1. Dezember!' : `Diese Tür öffnet sich am ${day}. Dezember!`, '#ffb4a8'); return; }
  const g = save.gifts.includes(day) ? null : openDoorGift(day);
  if (g) { doorOverlay = { i, g, t: 0 }; SFX.right(); burst(W / 2, 250, 50, ['#ffd740', '#ff5252', '#69f0ae', '#40c4ff', '#fff'], 520, 500, 8, 1.4); return; }
  launchLevel(i);
}
function drawGiftIcon(g, cx, cy, k) {
  if (g.key === 'hat') { const kind = HATS[g.i].k, b = HAT_BOX[kind] || [-20, 20, -20, 10], sc = Math.min(4.2, 150 * k / 1.4 / Math.max(b[1] - b[0], b[3] - b[2])); ctx.save(); ctx.translate(cx - (b[0] + b[1]) / 2 * sc, cy - (b[2] + b[3]) / 2 * sc); ctx.scale(sc, sc); drawHat(kind, 0, 0); ctx.restore(); } // the hat fills the gift window, centred
  else if (g.key === 'skin') { const sk = SKINS[g.i]; oRex(cx + 4, cy + 34 * k, 0.5 * k, 0.5, 0.05, { body: sk.body, dark: sk.dark, belly: sk.belly, rainbow: sk.rainbow }); }
  else if (g.key === 'fire') drawFlameIcon(fireOf(g.i), cx, cy, k * 1.6);
  else { drawAmber(cx, cy, 30 * k); otxt('+' + g.n, cx, cy + 50 * k, 28, '#ffe08a', 'rgba(0,0,0,.7)', 5); }
}
function drawDoorOverlay() { // the door shakes, glows at the seam, swings open on two leaves, and the gift pops out in a burst of light and confetti
  const o = doorOverlay, lv = LEVELS[o.i]; o.t += DT; const t = o.t, u = clamp(t / 1.6, 0, 1);
  const open = clamp((t - 0.45) / 0.65, 0, 1), eo = open * open * (3 - 2 * open), pop = clamp((t - 0.95) / 0.55, 0, 1), tt = Math.max(0, t - 0.95);
  const back = x => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
  if (!o.a && t > 0.45) { o.a = 1; SFX.click(); }
  if (!o.b && t > 0.95) { o.b = 1; SFX.amber(); burst(W / 2, 235, 46, ['#ffd740', '#fff6b0', '#ff8a65', '#69f0ae', '#40c4ff'], 520, 420, 7, 1.2); }
  ctx.fillStyle = 'rgba(8,10,24,.6)'; ctx.fillRect(0, 0, W, H);
  woodFrame(250, 50, 460, 440, 26);
  txt(`Tür ${lv.day}`, W / 2, 98, 40, '#3b2410'); txt(lv.title, W / 2, 132, 20, '#8a6a3a', 'center', 'normal');
  const fx = 380, fy = 150, fw = 200, fh = 170, cx = fx + fw / 2, cy = fy + fh / 2 + 2;
  // behind the door: a dark room that floods with light
  ctx.save(); rr(fx, fy, fw, fh, 14); ctx.clip(); ctx.fillStyle = '#241810'; ctx.fillRect(fx, fy, fw, fh);
  ctx.globalAlpha = eo; ctx.fillStyle = vgrad(fy, fy + fh, '#fff6d0', '#ffd77a'); ctx.fillRect(fx, fy, fw, fh); ctx.globalAlpha = 1;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(cx, cy); ctx.rotate(T * 0.5);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.fillStyle = `rgba(255,240,170,${0.2 * eo})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - 0.09) * 260, Math.sin(a - 0.09) * 260); ctx.lineTo(Math.cos(a + 0.09) * 260, Math.sin(a + 0.09) * 260); ctx.fill(); }
  ctx.restore();
  const gl = ctx.createRadialGradient(cx, cy, 6, cx, cy, 110); gl.addColorStop(0, `rgba(255,255,220,${eo})`); gl.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = gl; ctx.fillRect(fx, fy, fw, fh);
  if (pop > 0) { ctx.strokeStyle = `rgba(255,247,192,${0.85 * (1 - pop)})`; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, 20 + pop * 120, 0, Math.PI * 2); ctx.stroke(); ctx.save(); ctx.translate(cx, cy + 3 + Math.sin(T * 3) * 4 - (1 - pop) * 34); const sc = Math.max(0.01, back(pop)); ctx.scale(sc, sc); drawGiftIcon(o.g, 0, 0, 1.4); ctx.restore(); }
  ctx.restore();
  // the seam glows and the door trembles, then both leaves swing open towards the viewer
  const pre = clamp(t / 0.45, 0, 1), ox = t < 0.45 ? Math.sin(t * 90) * 2.2 * pre : 0;
  const lw = fw / 2 * (1 - 0.88 * eo), ex = 15 * eo;
  for (const sd of [-1, 1]) {
    const hx = sd < 0 ? fx : fx + fw, fr = hx - sd * lw + ox;
    ctx.save(); ctx.beginPath(); ctx.moveTo(hx + ox, fy); ctx.lineTo(fr, fy - ex); ctx.lineTo(fr, fy + fh + ex); ctx.lineTo(hx + ox, fy + fh); ctx.closePath();
    const g = ctx.createLinearGradient(hx, 0, fr, 0); g.addColorStop(0, '#b88650'); g.addColorStop(1, eo > 0 ? '#5a381a' : '#8a5a2c'); ctx.fillStyle = g; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
    ctx.clip(); ctx.strokeStyle = 'rgba(40,22,8,.35)'; ctx.lineWidth = 1.6; for (let i = 1; i < 4; i++) { const px = hx - sd * lw * i / 4 + ox; ctx.beginPath(); ctx.moveTo(px, fy - 20); ctx.lineTo(px, fy + fh + 20); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(Math.min(hx, hx - sd * lw) + ox, fy, lw, 5); ctx.restore();
    if (lw > 22) { circle(fr + sd * 11, cy, 5, '#ffd34d'); circle(fr + sd * 12, cy - 1.4, 1.8, '#fff3b0'); }
  }
  if (t < 0.6) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0); g.addColorStop(0, 'rgba(255,230,140,0)'); g.addColorStop(0.5, `rgba(255,236,150,${0.9 * pre})`); g.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 14, fy, 28, fh); ctx.restore(); }
  rr(fx, fy, fw, fh, 14); ctx.lineWidth = 5; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
  // sparkles drift out of the opened door, confetti rains down
  if (eo > 0) for (let i = 0; i < 16; i++) { const a = hash(i * 1.7) * Math.PI * 2, r = 100 + ((T * 36 + i * 23) % 70), al = eo * (0.4 + 0.6 * Math.sin(T * 5 + i)) * (1 - ((T * 36 + i * 23) % 70) / 90); if (al > 0.05) { ctx.globalAlpha = clamp(al, 0, 1); drawStar(cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 0.8, 3 + hash(i) * 4, '#fff3a0'); } } ctx.globalAlpha = 1;
  if (tt > 0 && tt < 3) { ctx.save(); ctx.beginPath(); ctx.rect(262, 62, 436, 416); ctx.clip(); const cols = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb', '#fff']; for (let i = 0; i < 44; i++) { const vx = (hash(i * 2.3) - 0.5) * 460, vy = -300 - hash(i * 5.1) * 240, x = cx + vx * tt, y = cy + vy * tt + 560 * tt * tt; ctx.globalAlpha = clamp((3 - tt) * 1.2, 0, 1); ctx.save(); ctx.translate(x, y); ctx.rotate(tt * (4 + hash(i) * 8) + i); ctx.fillStyle = cols[i % 6]; ctx.fillRect(-4, -2.2, 8, 4.4); ctx.restore(); } ctx.restore(); ctx.globalAlpha = 1; }
  const label = { hat: 'Neuer Hut', skin: 'Neue Farbe', fire: 'Neue Feuerfarbe', amber: 'Bernstein-Schatz' }[o.g.key];
  if (u >= 1) { txt(label + '!', W / 2, 352, 22, '#2e7d32'); txt(o.g.name, W / 2, 386, 32, '#3b2410'); txt('Du findest es im Laden.', W / 2, 418, 16, '#8a6a3a', 'center', 'normal'); }
  const cosm = o.g.key !== 'amber', worn = cosm && save.equip[o.g.key] === o.g.i;
  if (cosm) {
    button('Zurück', 268, 432, 100, 44, () => { doorOverlay = null; }, { size: 19 });
    button(worn ? 'Angelegt ✓' : 'Anziehen', 376, 432, 140, 44, () => { save.equip[o.g.key] = o.g.i; if (o.g.key === 'hat') save.equip.fabioHat = o.g.i; save.newGifts = save.newGifts.filter(k => k !== o.g.key + ':' + o.g.i); writeSave(); SFX.right(); }, { size: 19, color: worn ? '#d4f2bd' : '#9fd3ff', disabled: u < 1 || worn });
    button('Los geht\'s!', 524, 432, 170, 44, () => { doorOverlay = null; launchLevel(o.i); }, { size: 20, icon: icon('play'), disabled: u < 1 });
  } else {
    button('Zurück', 270, 432, 150, 44, () => { doorOverlay = null; }, { size: 22 });
    button('Los geht\'s!', 435, 432, 255, 44, () => { doorOverlay = null; launchLevel(o.i); }, { size: 24, icon: icon('play'), disabled: u < 1 });
  }
  buttons.unshift({ x: 0, y: 0, w: W, h: H, cb: () => {}, silent: true });
}
function installHintVisible() { try { const ua = navigator.userAgent || '', ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); return ios && !navigator.standalone && !window.matchMedia('(display-mode: standalone)').matches && !save.installHint && scene === 'map' && !dialog && !endlessPick && !doorOverlay && !parentMode && !settingsOpen; } catch (e) { return false; } }
function drawInstallHint() {
  const y = H - 74; rr(150, y, 660, 64, 16); ctx.fillStyle = 'rgba(255,247,224,.97)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
  txt('Tipp: Teilen-Knopf → „Zum Home-Bildschirm“.', 450, y + 21, 19, '#3b2410'); txt('So bleibt dein Spielstand sicher und das Spiel läuft auch ohne Internet.', 450, y + 46, 15, '#6b4a2b', 'center', 'normal');
  button('OK', 740, y + 6, 60, 50, () => { save.installHint = true; writeSave(); }, { size: 20 });
}
let settingsOpen = false;
function segBar(label, y, get, set) { // five tappable segments, 0 = silent
  txt(label, 270, y + 22, 24, '#3b2410', 'left');
  for (let k = 0; k <= 5; k++) { const x = 440 + k * 46, on = get() >= k && k > 0, cur = get() === k; rr(x, y, 40, 44, 10); ctx.fillStyle = k === 0 ? (get() === 0 ? '#e57373' : '#e0d2b0') : on ? '#ffd34d' : '#e6dcc4'; ctx.fill(); ctx.lineWidth = cur ? 4 : 2.5; ctx.strokeStyle = cur ? '#8a5a00' : '#8a6a3a'; ctx.stroke(); if (k === 0) txt('0', x + 20, y + 23, 20, '#6b4a2b'); else { rr(x + 11, y + 22 - k * 2.2, 18, k * 4.4 + 6, 4); ctx.fillStyle = on ? '#8a5a00' : '#b8a888'; ctx.fill(); } buttons.push({ x, y, w: 40, h: 44, cb: () => { set(k); writeSave(); if (k) { if (label === 'Effekte') SFX.right(); } } }); }
}
function drawSettings() {
  panel(230, 90, 500, 360); txt('Einstellungen', W / 2, 135, 36, '#3b2410');
  segBar('Musik', 170, () => save.volMusic, v => { save.volMusic = v; });
  segBar('Effekte', 232, () => save.volSfx, v => { save.volSfx = v; });
  button(save.calm ? 'Ruhiger Modus: an' : 'Ruhiger Modus: aus', 270, 300, 420, 50, () => { save.calm = !save.calm; writeSave(); }, { size: 20, color: save.calm ? '#d4f2bd' : '#e0d2b0' });
  txt('Ruhig = kein Wackeln und kein rotes Aufblitzen.', W / 2, 372, 15, '#8a6a3a', 'center', 'normal');
  button(save.muted ? 'Ton ganz aus ✓' : 'Ton ganz ausschalten', 270, 392, 250, 44, () => { save.muted = !save.muted; writeSave(); }, { size: 18, color: save.muted ? '#e57373' : '#e0d2b0', textColor: save.muted ? '#fff' : undefined });
  button('Fertig', 540, 392, 150, 44, () => { settingsOpen = false; }, { size: 22 });
  buttons.unshift({ x: 0, y: 0, w: W, h: H, cb: () => {}, silent: true });
}
let parentClearT = -99;
function drawParentPanel() {
  panel(240, 92, 480, 392); txt('Elternmodus', W / 2, 145, 34, '#3b2410'); txt(`Heute offen: ${adventDay()} von 24 Türen`, W / 2, 190, 22, '#6b4a2b', 'center', 'normal');
  txt(save.dayOverride == null ? 'Es gilt das Datum des Geräts.' : 'Das Datum ist manuell eingestellt.', W / 2, 220, 16, '#8a6a3a', 'center', 'normal');
  button('−', 300, 244, 110, 56, () => { save.dayOverride = clamp(adventDay() - 1, 0, 24); writeSave(); }, { size: 34 });
  button('+', 550, 244, 110, 56, () => { save.dayOverride = clamp(adventDay() + 1, 0, 24); writeSave(); }, { size: 34 });
  button('Alle Türen öffnen', 300, 316, 360, 46, () => { save.dayOverride = 24; writeSave(); }, { size: 22, color: '#ffe08a' });
  button('Datum des Geräts nutzen', 300, 372, 360, 46, () => { save.dayOverride = null; writeSave(); }, { size: 20, color: '#e0d2b0' });
  const armed = T - parentClearT < 4;
  button(armed ? 'Wirklich leeren? Nochmal tippen' : 'Bestenliste leeren', 300, 428, 360, 42, () => { if (armed) { save.board = save.board.map(() => []); boardNewT = 0; writeSave(); parentClearT = -99; toast('Bestenliste geleert.', '#ffe08a'); } else parentClearT = T; }, { size: 18, color: armed ? '#e57373' : '#e0d2b0', textColor: armed ? '#fff' : undefined });
  button('Schliessen', W / 2 - 80, 488, 160, 40, () => { parentMode = false; }, { size: 20 });
  buttons.unshift({ x: 0, y: 0, w: W, h: H, cb: () => {}, silent: true });
}
// ---------- local Bestenliste (per device) ----------
const BAD_WORDS = ['scheiss', 'schei\u00dfe', 'scheisse', 'arsch', 'fotze', 'votze', 'wichs', 'hurensohn', 'hure', 'nutte', 'schlampe', 'fick', 'titten', 'pimmel', 'nazi', 'hitler', 'neger', 'spast', 'mongo', 'kacke', 'pisse', 'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'whore', 'slut', 'rape', 'nigg', 'fag', 'porn', 'sex', 'penis', 'vagina', 'dildo', 'asshole'];
function cleanNick(raw) { // returns { ok, name, msg }
  let name = String(raw || '').replace(/[^A-Za-z0-9\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df _.\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
  if (!name) return { ok: false, name, msg: 'Bitte gib einen Spitznamen ein.' };
  const low = String(raw).toLowerCase();
  if (/@|https?:|www\.|\.(com|de|ch|at|net|org)\b|\d{4,}/.test(low)) return { ok: false, name, msg: 'Bitte nur einen Spitznamen – keinen echten Namen, keine Adresse und keine Nummer.' };
  const norm = String(raw).slice(0, 40).toLowerCase().replace(/[0134578@$!]/g, c => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i' })[c]).replace(/[^a-z\u00e4\u00f6\u00fc\u00df]/g, '').replace(/(.)\1+/g, '$1');
  const bad = BAD_WORDS.some(w => norm.includes(w.replace(/(.)\1+/g, '$1')));
  if (bad) return { ok: false, name, msg: 'Dieser Name geht leider nicht – such dir einen anderen Spitznamen!' };
  return { ok: true, name };
}
function boardQualifies(wi, sc) { const b = save.board[wi]; return sc > 0 && (b.length < 10 || sc > b[b.length - 1].s); }
let boardNewT = 0;
function boardAdd(wi, name, sc) { // returns the rank (1-based) or 0 when it did not make the top 10
  const e = { n: name, s: sc, t: Date.now() }, b = save.board[wi]; b.push(e); b.sort((x, y) => y.s - x.s || x.t - y.t); if (b.length > 10) b.length = 10;
  save.nick = name; writeSave(); boardNewT = e.t; return b.indexOf(e) + 1;
}
function boardAll() { const all = []; save.board.slice(0, 8).forEach((b, wi) => b.forEach(e => all.push(Object.assign({ wi }, e)))); return all.sort((x, y) => y.s - x.s || x.t - y.t).slice(0, 10); }
let boardTab = -1; // -1 = all worlds together
function drawBoard() {
  leatherCover();
  const px = 70, py = 66, pw = W - 140, ph = 396; rr(px, py, pw, ph, 22); ctx.fillStyle = '#fff3d6'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#8a6a3a'; ctx.stroke();
  otxt('Bestenliste', W / 2, 40, 38, '#ffd34d', '#3b1d00', 9);
  const nTabs = WORLDS.length + 2, title = boardTab < 0 ? 'Alle Welten' : boardTab === 8 ? 'Tages-Lauf heute' : WORLDS[boardTab].name; if (boardTab === 8) dailyRefresh();
  button('‹', px + 14, py + 12, 60, 46, () => { boardTab = (boardTab + 1 + nTabs - 1) % nTabs - 1; SFX.click && SFX.click(); }, { size: 34, color: '#e0d2b0' });
  button('›', px + pw - 74, py + 12, 60, 46, () => { boardTab = (boardTab + 1 + 1) % nTabs - 1; SFX.click && SFX.click(); }, { size: 34, color: '#e0d2b0' });
  txt(title, W / 2, py + 35, 30, '#3b2410'); txt(boardTab === 8 ? `Heute: ${WORLDS[dailyWorld()].name} · neuer Lauf jeden Tag` : 'Auf diesem Gerät · Endlos-Lauf', W / 2, py + 62, 15, '#8a6a3a', 'center', 'normal');
  const rows = boardTab < 0 ? boardAll() : save.board[boardTab].map(e => Object.assign({ wi: boardTab }, e));
  const stBar = boardTab === 8 && save.dailyStreak ? `Deine Serie: ${save.dailyStreak} ${save.dailyStreak === 1 ? 'Tag' : 'Tage'}` : '';
  if (!rows.length) { txt('Noch kein Eintrag.', W / 2, 250, 26, '#6b4a2b'); txt('Starte einen Endlos-Lauf und sei der Erste!', W / 2, 288, 20, '#8a6a3a', 'center', 'normal'); }
  const pulse = 0.5 + 0.5 * Math.sin(T * 5);
  rows.forEach((e, i) => {
    const y = 156 + i * 29.5, mine = e.t === boardNewT;
    rr(px + 24, y - 13, pw - 48, 27, 10); ctx.fillStyle = mine ? `rgba(255,211,77,${0.45 + 0.3 * pulse})` : i % 2 ? 'rgba(138,106,58,.08)' : 'rgba(138,106,58,.15)'; ctx.fill();
    if (i < 3) { circle(px + 52, y, 11, ['#ffd34d', '#d7dbe0', '#d89a5a'][i]); ctx.lineWidth = 2; ctx.strokeStyle = ['#a8780a', '#7a8088', '#8a5424'][i]; ctx.stroke(); txt(String(i + 1), px + 52, y + 1, 15, '#3b2410'); }
    else txt(String(i + 1), px + 52, y + 1, 16, '#6b4a2b');
    txt(e.n, px + 82, y + 1, 20, '#2b1a00', 'left');
    if (boardTab < 0) txt(WORLDS[e.wi].name, px + 330, y + 1, 14, '#8a6a3a', 'left', 'normal');
    txt(String(e.s), px + pw - 48, y + 1, 21, '#c0701a', 'right');
  });
  if (stBar) txt(stBar, W / 2, H - 45, 20, '#ffd34d');
  button('Zurück', 80, H - 70, 180, 50, () => go('map'), { size: 22, icon: icon('back') });
  button('Endlos-Lauf', W - 280, H - 70, 200, 50, () => { go('map'); endlessPick = true; }, { size: 22, color: '#9fd3ff', icon: icon('loop') });
}
// ---------- Tages-Lauf: one endless run per day with the same seed for everybody ----------
const dayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
const prevDayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
function dailyWorld() { const open = WORLDS.map((_, i) => i).filter(themeOpenForEndless); const d = new Date(); const n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); return open.length ? open[n % open.length] : 0; }
function dailyRefresh() { if (save.dailyBoardDay !== dayKey()) { save.board[8] = []; save.dailyBoardDay = dayKey(); writeSave(); } }
let dailySeed = 0;
function startDaily() { dailyRefresh(); dailySeed = dayKey(); const wi = dailyWorld(); startLevel(wi, true); dailySeed = 0; if (G) G.daily = true; }
// ---------- Schatzkarte: three torn pieces, one from each boss, lead to the golden egg ----------
let tmapNew = -1, tmapT = 0, tmapLast = '';
const TM_PATH = [[104, 396], [170, 332], [240, 388], [312, 298], [380, 372], [460, 302], [540, 362], [590, 252], [660, 332], [730, 262], [790, 362], [846, 226]];
const TM_X = [70, 344, 618], TM_W = 268, TM_TOP = 92, TM_BOT = 436;
const tmHave = k => !!save.lvDone[[5, 11, 17][k]];
function tmPiecePath(k) { // a torn rectangle: jagged left and right edges
  const x0 = TM_X[k], x1 = x0 + TM_W, pts = [], n = 12;
  for (let i = 0; i <= n; i++) pts.push([x0 + (k ? 6 : 0) + (hash(k * 31 + i) - 0.5) * 12, TM_TOP + (TM_BOT - TM_TOP) * i / n]);
  for (let i = n; i >= 0; i--) pts.push([x1 - (k < 2 ? 6 : 0) + (hash(k * 57 + i + 9) - 0.5) * 12, TM_TOP + (TM_BOT - TM_TOP) * i / n]);
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
}
function tmRoute(walk, done) { // the route: dino footprints, one dot per day, golden where the player has already been
  const L = []; let tot = 0; for (let i = 1; i < TM_PATH.length; i++) { const d = Math.hypot(TM_PATH[i][0] - TM_PATH[i - 1][0], TM_PATH[i][1] - TM_PATH[i - 1][1]); L.push(d); tot += d; }
  const at = d => { let acc = 0; for (let i = 1; i < TM_PATH.length; i++) { if (acc + L[i - 1] >= d || i === TM_PATH.length - 1) { const u = clamp((d - acc) / L[i - 1], 0, 1), a = TM_PATH[i - 1], b = TM_PATH[i]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0])]; } acc += L[i - 1]; } return TM_PATH[TM_PATH.length - 1]; };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // footprints (alternating left and right) along the whole way
  for (let d = 10, n = 0; d < tot; d += 17, n++) { const [x, y, an] = at(d), walked = d / tot <= walk; ctx.save(); ctx.translate(x, y); ctx.rotate(an); ctx.translate(0, n % 2 ? 4 : -4); ctx.fillStyle = walked ? 'rgba(210,150,10,.95)' : 'rgba(110,60,20,.55)'; ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 2.6, 0, 0, 7); ctx.fill(); for (const ty of [-2.6, 0, 2.6]) { ctx.beginPath(); ctx.ellipse(4.4, ty, 1.6, 1.1, 0, 0, 7); ctx.fill(); } ctx.restore(); }
  // one dot per day; the four boss days are red stars
  for (let i = 0; i < 24; i++) { const [x, y] = at(tot * (i + 0.5) / 24), isBoss = (i + 1) % 6 === 0, ok = i < done; if (isBoss) { drawStar(x, y, 9.5, ok ? '#ffd34d' : '#c0302a'); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(x, y, 9.5, 0, 7); ctx.globalAlpha = 0; ctx.stroke(); ctx.globalAlpha = 1; } else { circle(x, y, 5, ok ? '#ffd34d' : '#f2dfb0'); ctx.lineWidth = 1.6; ctx.strokeStyle = ok ? '#8a5a00' : '#6a3c14'; ctx.stroke(); } }
  const p = at(tot * walk); return [p[0], p[1]];
}
function tmInk(t, x, y, size = 17, col = '#5a2e0c') { // hand-lettered place names, slightly tilted, with a pale halo so they stay readable
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.045); ctx.font = `italic bold ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(246,230,188,.9)'; ctx.lineWidth = 4; ctx.strokeText(t, 0, 0); ctx.fillStyle = col; ctx.fillText(t, 0, 0); ctx.restore();
}
const TM_INK = '#4a2a0c';
function tmWave(x, y, w, n = 3) { ctx.strokeStyle = 'rgba(40,100,160,.75)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; for (let i = 0; i < n; i++) { const wx = x + i * w; ctx.beginPath(); ctx.moveTo(wx - w * 0.4, y); ctx.quadraticCurveTo(wx - w * 0.2, y - w * 0.35, wx, y); ctx.quadraticCurveTo(wx + w * 0.2, y - w * 0.35, wx + w * 0.4, y); ctx.stroke(); } }
function tmTree(x, y, s2 = 1, c = '#3f8a45') { ctx.save(); ctx.translate(x, y); ctx.scale(s2, s2); ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-2, -9, 4, 10); for (const [dx, dy, r] of [[-5, -16, 8], [5, -16, 8], [0, -23, 9]]) { circle(dx, dy, r, c); } ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.5; for (const [dx, dy, r] of [[-5, -16, 8], [5, -16, 8], [0, -23, 9]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, 7); ctx.stroke(); } circle(-2, -26, 3, 'rgba(255,255,255,.3)'); ctx.restore(); }
function tmMountain(x, base, w, h, snow = true) {
  ctx.fillStyle = vgrad(base - h, base, '#a6b4c8', '#6e7f98'); ctx.beginPath(); ctx.moveTo(x - w / 2, base); ctx.lineTo(x - w * 0.05, base - h); ctx.lineTo(x + w / 2, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(40,50,80,.3)'; ctx.beginPath(); ctx.moveTo(x - w * 0.05, base - h); ctx.lineTo(x + w / 2, base); ctx.lineTo(x + w * 0.08, base); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,50,80,.45)'; ctx.lineWidth = 1.2; for (let i = 0; i < 5; i++) { const yy = base - h * (0.12 + i * 0.12); ctx.beginPath(); ctx.moveTo(x + w * 0.02 + i * 2, yy); ctx.lineTo(x + w * (0.16 + i * 0.05), yy + h * 0.08); ctx.stroke(); }
  if (snow) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - w * 0.05, base - h); ctx.lineTo(x - w * 0.2, base - h * 0.68); ctx.lineTo(x - w * 0.1, base - h * 0.72); ctx.lineTo(x - w * 0.02, base - h * 0.62); ctx.lineTo(x + w * 0.08, base - h * 0.72); ctx.lineTo(x + w * 0.17, base - h * 0.66); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x - w / 2, base); ctx.lineTo(x - w * 0.05, base - h); ctx.lineTo(x + w / 2, base); ctx.stroke();
}
function tmMesa(x, base, w, h) { ctx.fillStyle = vgrad(base - h, base, '#e08a50', '#b4582e'); rr(x - w / 2, base - h, w, h, 4); ctx.fill(); ctx.fillStyle = '#f0a870'; ctx.fillRect(x - w / 2, base - h, w, 5); ctx.strokeStyle = 'rgba(110,40,15,.4)'; ctx.lineWidth = 1.4; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - w / 2, base - h + i * h / 5); ctx.lineTo(x + w / 2, base - h + i * h / 5 + 2); ctx.stroke(); } ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.8; rr(x - w / 2, base - h, w, h, 4); ctx.stroke(); }
function tmShip(x, y, k) { ctx.save(); ctx.translate(x, y + Math.sin(T * 1.6 + x) * 1.5); ctx.scale(k, k); ctx.fillStyle = '#8a5a2e'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(12, 9); ctx.lineTo(-12, 9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.6; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke(); ctx.fillStyle = '#fff8e8'; ctx.beginPath(); ctx.moveTo(1, -25); ctx.quadraticCurveTo(15, -14, 1, -3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e8d8b0'; ctx.beginPath(); ctx.moveTo(-1, -22); ctx.quadraticCurveTo(-11, -13, -1, -5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d63a3a'; ctx.fillRect(0, -30, 8, 5); ctx.restore(); }
function tmCompass(cx, cy, r) {
  ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = TM_INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, 7); ctx.stroke();
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.fillStyle = i === 0 ? '#c0302a' : '#5a2e0c'; ctx.beginPath(); ctx.moveTo(0, -r * 1.12); ctx.lineTo(r * 0.16, -r * 0.16); ctx.lineTo(0, 0); ctx.lineTo(-r * 0.16, -r * 0.16); ctx.closePath(); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.rotate(Math.PI / 4); ctx.fillStyle = 'rgba(90,46,12,.65)'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(r * 0.08, -r * 0.1); ctx.lineTo(-r * 0.08, -r * 0.1); ctx.closePath(); ctx.fill(); } ctx.restore();
  ctx.font = `italic bold ${Math.round(r * 0.42)}px ${FONT}`; ctx.fillStyle = '#5a2e0c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', 0, -r * 1.36); ctx.restore();
}
function tmScenery(k) {
  if (k === 0) {
    // jungle: dense little trees and palms
    ell(146, 214, 70, 56, 0, 'rgba(94,160,80,.45)'); for (const [tx, ty, ts] of [[110, 226, 1], [132, 244, 1.15], [160, 232, 1], [184, 250, 1.1], [120, 204, 0.9], [150, 208, 1], [178, 218, 0.9], [100, 250, 0.9]]) tmTree(tx, ty, ts, ty % 2 ? '#3f8a45' : '#4c9a4e'); palm(148, 232, 46, '#2f7a3a'); tmInk('Dschungel', 148, 150, 18);
    // beach with waves, a little crab, shells
    ctx.fillStyle = 'rgba(240,214,150,.95)'; ctx.beginPath(); ctx.moveTo(176, 410); ctx.quadraticCurveTo(210, 376, 252, 384); ctx.quadraticCurveTo(300, 392, 312, 414); ctx.lineTo(176, 414); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.6; ctx.stroke(); ctx.fillStyle = 'rgba(70,150,210,.55)'; ctx.fillRect(152, 414, 170, 20); tmWave(172, 424, 22, 6); circle(266, 400, 4, '#d63a3a'); ctx.fillStyle = '#e8a090'; ctx.beginPath(); ctx.arc(226, 398, 5, Math.PI, 0); ctx.fill(); tmInk('Strand', 240, 366, 16);
    // canyon: mesas and cactus
    tmMesa(288, 318, 40, 64); tmMesa(318, 318, 28, 40); cactus(262, 330, 26, '#5f7a2a', 2); tmInk('Canyon', 292, 236, 16);
    // start: station hut and flag
    ctx.fillStyle = '#8a5a2e'; ctx.fillRect(86, 380, 26, 18); ctx.fillStyle = '#6a2a24'; ctx.beginPath(); ctx.moveTo(82, 381); ctx.lineTo(99, 368); ctx.lineTo(116, 381); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.6; ctx.strokeRect(86, 380, 26, 18); ctx.stroke(); ctx.fillStyle = '#6b3a14'; ctx.fillRect(98, 346, 2.4, 24); ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(100, 346); ctx.lineTo(116, 351); ctx.lineTo(100, 357); ctx.fill(); tmInk('Start', 100, 412, 14);
    // river, palms, parrot, beach umbrella, footprints: the first piece should feel as rich as the volcano
    ctx.strokeStyle = 'rgba(80,160,220,.85)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(196, 176); ctx.quadraticCurveTo(170, 214, 196, 250); ctx.quadraticCurveTo(222, 286, 190, 330); ctx.stroke(); ctx.strokeStyle = 'rgba(210,240,255,.7)'; ctx.lineWidth = 1.6; ctx.stroke();
    for (const [px, py] of [[226, 392], [292, 400]]) { ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 6, py - 14, px + 2, py - 26); ctx.stroke(); ctx.strokeStyle = '#2f8a3a'; ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(px + 2, py - 26); ctx.quadraticCurveTo(px + 2 + i * 8, py - 36 + Math.abs(i) * 3, px + 2 + i * 12, py - 28 + Math.abs(i) * 6); ctx.stroke(); } }
    ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(252, 402); ctx.lineTo(252, 378); ctx.stroke(); ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(238, 380); ctx.quadraticCurveTo(252, 362, 266, 380); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(245, 372); ctx.quadraticCurveTo(252, 364, 259, 372); ctx.quadraticCurveTo(252, 378, 245, 372); ctx.fill();
    circle(168, 196 + Math.sin(T * 3) * 1.5, 5, '#e53935'); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(172, 196); ctx.lineTo(180, 198); ctx.lineTo(172, 200); ctx.fill(); ctx.strokeStyle = '#1f6fd0'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(164, 199); ctx.lineTo(154, 208); ctx.stroke();
    ctx.fillStyle = 'rgba(110,60,20,.4)'; for (let i = 0; i < 5; i++) { ell(126 + i * 14, 334 - i * 6 + (i % 2) * 4, 3, 1.8, 0.4, 'rgba(110,60,20,.4)'); }
  } else if (k === 1) {
    // the sea with waves, ships and a sea monster
    ctx.fillStyle = 'rgba(70,150,210,.5)'; ctx.beginPath(); ctx.moveTo(360, 330); ctx.quadraticCurveTo(380, 296, 430, 304); ctx.quadraticCurveTo(486, 312, 500, 360); ctx.quadraticCurveTo(504, 420, 440, 426); ctx.quadraticCurveTo(372, 428, 360, 380); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.6; ctx.stroke();
    for (const [wx, wy] of [[378, 340], [412, 322], [446, 336], [388, 392], [440, 402]]) tmWave(wx, wy, 14, 2); tmShip(470, 346, 0.8); tmShip(386, 372, 0.55);
    ctx.strokeStyle = '#7a3a8a'; ctx.lineWidth = 7; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(414 + i * 16, 410); ctx.quadraticCurveTo(404 + i * 20, 388 - i * 2, 424 + i * 15 + Math.sin(T * 2 + i) * 3, 368); ctx.stroke(); } circle(446, 410, 14, '#9a4aa8'); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(446, 410, 14, 0, 7); ctx.stroke(); circle(441, 407, 3, '#fff'); circle(452, 407, 3, '#fff'); circle(441, 407, 1.3, '#222'); circle(452, 407, 1.3, '#222'); tmInk('Meer', 412, 296, 18);
    // coral
    ctx.strokeStyle = '#ff8a6a'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(366 + i * 6, 424); ctx.lineTo(364 + i * 8, 410 - i * 3); ctx.stroke(); }
    // ice age: floes, pines, a mammoth-ish bump and a little igloo
    ctx.fillStyle = 'rgba(226,240,255,.95)'; ctx.beginPath(); ctx.moveTo(494, 232); ctx.lineTo(530, 196); ctx.lineTo(580, 202); ctx.lineTo(604, 238); ctx.lineTo(576, 272); ctx.lineTo(520, 268); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.6; ctx.stroke();
    for (const [px, py, ps] of [[516, 252, 30], [548, 258, 36], [576, 250, 28]]) pine(px, py, ps, '#2f6a50'); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(556, 232, 12, Math.PI, 0); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.stroke(); ctx.fillStyle = '#44506a'; ctx.fillRect(552, 230, 8, 5); tmInk('Eiszeit', 548, 184, 17);
    for (const [fx, fy, fw] of [[470, 296, 16], [492, 280, 11]]) { ctx.fillStyle = 'rgba(240,248,255,.95)'; ctx.beginPath(); ctx.ellipse(fx, fy, fw, fw * 0.45, 0, 0, 7); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.2; ctx.stroke(); }
  } else {
    // mountain range with snow caps, pine foothills
    tmMountain(654, 326, 96, 98); tmMountain(716, 326, 120, 130); tmMountain(768, 326, 84, 78); for (const [px, py, ps] of [[640, 332, 26], [668, 338, 22], [754, 334, 24]]) pine(px, py, ps, '#2f6a50'); tmInk('Berge', 706, 170, 18);
    // the volcano with lava streams and smoke
    drawVolcano(790, 420, 0.56, '#7a3a2a', 1); tmInk('Vulkan', 790, 428, 15);
    // the lair: a cave in a rocky hill, eyes glowing in the dark
    ctx.fillStyle = vgrad(150, 262, '#8a7a6a', '#5a4a3c'); ctx.beginPath(); ctx.moveTo(792, 262); ctx.quadraticCurveTo(800, 168, 846, 160); ctx.quadraticCurveTo(892, 168, 892, 262); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#1c120c'; ctx.beginPath(); ctx.moveTo(814, 262); ctx.quadraticCurveTo(816, 192, 846, 190); ctx.quadraticCurveTo(876, 192, 876, 262); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(255,200,60,${0.7 + 0.3 * Math.sin(T * 3)})`; ctx.beginPath(); ctx.ellipse(832, 222, 4.4, 2.6, 0.3, 0, 7); ctx.ellipse(852, 222, 4.4, 2.6, -0.3, 0, 7); ctx.fill(); ctx.fillStyle = '#e8e0d0'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(828 + i * 8, 236); ctx.lineTo(832 + i * 8, 244); ctx.lineTo(836 + i * 8, 236); ctx.fill(); }
    for (const [bx, by] of [[800, 262], [880, 262], [790, 250]]) { ctx.fillStyle = '#7a6a5a'; ctx.beginPath(); ctx.ellipse(bx, by, 11, 7, 0, 0, 7); ctx.fill(); ctx.stroke(); } tmInk('Höhle', 846, 148, 17);
    tmCompass(662, 396, 22);
  }
}
function tmPieceFace(k) { // paper: fibres, stains, fold lines, scorched edges
  tmPiecePath(k); ctx.fillStyle = vgrad(TM_TOP, TM_BOT, '#f8e9c0', '#ebd29c', '#d6b57a'); ctx.fill();
  ctx.save(); tmPiecePath(k); ctx.clip();
  for (let i = 0; i < 9; i++) { ctx.globalAlpha = 0.06 + 0.05 * hash(i + k * 5); circle(TM_X[k] + hash(i + k * 11) * TM_W, TM_TOP + hash(i + k * 13 + 3) * (TM_BOT - TM_TOP), 16 + hash(i + 40) * 30, '#a86a28'); } ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(140,90,30,.10)'; ctx.lineWidth = 1; for (let i = 0; i < 70; i++) { const fx = TM_X[k] + hash(i * 2 + k) * TM_W, fy = TM_TOP + hash(i * 3 + k + 7) * (TM_BOT - TM_TOP), fl = 6 + hash(i + 90) * 16, fa = hash(i + 120) * 6.28; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(fa) * fl, fy + Math.sin(fa) * fl); ctx.stroke(); }
  // a faint coordinate grid like an old chart
  ctx.strokeStyle = 'rgba(120,70,20,.12)'; ctx.lineWidth = 1; for (let gx = TM_X[k] + 30; gx < TM_X[k] + TM_W; gx += 45) { ctx.beginPath(); ctx.moveTo(gx, TM_TOP); ctx.lineTo(gx, TM_BOT); ctx.stroke(); } for (let gy = TM_TOP + 30; gy < TM_BOT; gy += 45) { ctx.beginPath(); ctx.moveTo(TM_X[k], gy); ctx.lineTo(TM_X[k] + TM_W, gy); ctx.stroke(); }
  tmScenery(k);
  const cx = TM_X[k] + TM_W / 2, cy = (TM_TOP + TM_BOT) / 2; ctx.fillStyle = 'rgba(90,50,15,.16)'; ctx.fillRect(cx - 1.5, TM_TOP, 3, TM_BOT - TM_TOP); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(cx + 1.5, TM_TOP, 1.5, TM_BOT - TM_TOP); ctx.fillStyle = 'rgba(90,50,15,.14)'; ctx.fillRect(TM_X[k], cy - 1.5, TM_W, 3); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(TM_X[k], cy + 1.5, TM_W, 1.5);
  const vg = ctx.createRadialGradient(cx, cy, 90, cx, cy, 250); vg.addColorStop(0, 'rgba(120,60,10,0)'); vg.addColorStop(1, 'rgba(110,55,10,.34)'); ctx.fillStyle = vg; ctx.fillRect(TM_X[k] - 10, TM_TOP - 10, TM_W + 20, TM_BOT - TM_TOP + 20);
  ctx.restore();
  tmPiecePath(k); ctx.lineWidth = 3; ctx.strokeStyle = '#6a3c14'; ctx.stroke(); ctx.save(); tmPiecePath(k); ctx.clip(); ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(90,40,5,.28)'; tmPiecePath(k); ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,245,215,.55)'; ctx.translate(2.5, 0); tmPiecePath(k); ctx.stroke(); ctx.restore();
}
// The treasure map is expensive (paper fibres, scenery, shadows, clips), so each piece and the wooden table are drawn into an
// offscreen canvas and blitted. Pieces refresh at about 12 fps (staggered) to keep the little animations; the table never does.
const tmCache = {};
function tmCached(key, X, Y, w, h, every, stagger, draw) {
  const m = ctx.getTransform(), k = Math.min(2, Math.hypot(m.a, m.b) || 1), cw = Math.ceil(w * k), ch = Math.ceil(h * k);
  let c = tmCache[key]; if (!c) c = tmCache[key] = { cv: document.createElement('canvas'), next: -1 };
  if (c.cv.width !== cw || c.cv.height !== ch) { c.cv.width = cw; c.cv.height = ch; c.next = -1; }
  if (c.next < 0 || (every && T >= c.next)) {
    const old = ctx, cc = c.cv.getContext('2d'); cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, cw, ch); ctx = cc; ctx.setTransform(k, 0, 0, k, -X * k, -Y * k);
    try { draw(); } finally { ctx = old; }
    c.next = every ? T + every + (c.next < 0 ? stagger : 0) : 1e9;
  }
  ctx.drawImage(c.cv, 0, 0, cw, ch, X, Y, w, h);
}
function drawTMap() {
  if (tmapNew >= 0 || tmapLast !== 'x') tmapT += DT;
  tmCached('bg', 0, 0, W, H, 0, 0, () => {
  ctx.fillStyle = vgrad(0, H, '#5a3a22', '#35200f'); ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 54) { ctx.fillStyle = (y / 54) % 2 ? 'rgba(255,220,160,.05)' : 'rgba(0,0,0,.08)'; ctx.fillRect(0, y, W, 54); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); for (let i = 0; i < 10; i++) { ctx.strokeStyle = 'rgba(0,0,0,.09)'; ctx.lineWidth = 1; const gy = y + 6 + hash(i + y) * 42; ctx.beginPath(); ctx.moveTo(hash(i * 3 + y) * W, gy); ctx.bezierCurveTo(hash(i + 5) * W, gy - 4, hash(i + 8) * W, gy + 4, hash(i * 3 + y) * W + 140, gy); ctx.stroke(); } }
  const dg = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 620); dg.addColorStop(0, 'rgba(255,200,120,.10)'); dg.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
  });
  const got = [0, 1, 2].filter(tmHave).length, done = save.lvDone.filter(Boolean).length, walk = clamp((done - (save.lvDone[23] ? 0 : 0)) / 24, 0, 1), all = got === 3;
  rr(W / 2 - 200, 12, 400, 50, 14); ctx.fillStyle = vgrad(12, 62, '#8a5a2e', '#5a3818'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2b1a0c'; ctx.stroke(); rr(W / 2 - 192, 18, 384, 38, 10); ctx.lineWidth = 2; ctx.strokeStyle = '#d4a017'; ctx.stroke(); for (const sx of [W / 2 - 184, W / 2 + 184]) { circle(sx, 37, 4, '#d4a017'); circle(sx - 1, 36, 1.4, '#fff3c0'); }
  otxt('Die Schatzkarte', W / 2, 38, 32, '#ffe08a', '#2b1a0c', 8);
  txt(all ? 'Der Weg zum goldenen Ei ist frei!' : `${got} von 3 Kartenstücken gefunden`, W / 2, 76, 18, '#f2dfb0', 'center', 'normal');
  for (let k = 0; k < 3; k++) {
    const isNew = k === tmapNew, t = isNew ? tmapT : 9, fly = isNew ? clamp(t / 1.1, 0, 1) : 1, e = 1 + 2.70158 * Math.pow(fly - 1, 3) + 1.70158 * Math.pow(fly - 1, 2), cx = TM_X[k] + TM_W / 2, cy = (TM_TOP + TM_BOT) / 2, rot = (k - 1) * 0.012 + (isNew ? (1 - e) * 0.7 : 0), dy = isNew ? -(1 - e) * 460 : 0;
    ctx.save(); ctx.translate(cx, cy + dy); ctx.rotate(rot); ctx.translate(-cx, -cy);
    if (!tmHave(k)) { // an empty slot waiting for its piece
      tmPiecePath(k); ctx.fillStyle = 'rgba(15,8,2,.5)'; ctx.fill(); ctx.setLineDash([10, 8]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,211,77,.7)'; ctx.stroke(); ctx.setLineDash([]);
      otxt('?', cx, cy - 20, 90, 'rgba(255,225,150,.85)', '#3b1d00', 10); txt(`Kartenstück ${k + 1}`, cx, cy + 40, 22, '#f2dfb0'); txt(['Krabbenkönig · Tür 6', 'Seeungeheuer · Tür 12', 'Adlerkönigin · Tür 18'][k], cx, cy + 70, 16, '#d9bb80', 'center', 'normal');
    } else {
      tmCached('p' + k, TM_X[k] - 28, TM_TOP - 34, TM_W + 56, TM_BOT - TM_TOP + 68, 1 / 12, k * 0.03, () => {
        ctx.save(); tmPiecePath(k); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6; ctx.fillStyle = '#e9d09a'; ctx.fill(); ctx.restore();
        tmPieceFace(k);
        ctx.save(); tmPiecePath(k); ctx.clip(); const pos = tmRoute(walk, done); ctx.restore(); if (k === 0) tmMarker = pos;
      });
    }
    ctx.restore();
  }
  // the player's marker rides along the route; the golden egg waits at the X
  if (tmHave(0) && tmMarker) { const [mx, my] = tmMarker; shadow(mx, my + 14, 14, 0.3); circle(mx, my - 6, 15, '#2e8b57'); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); drawPortrait('rex', mx, my - 6, 13, true); }
  if (tmHave(2)) { const ex = 846, ey = 226 + 6 * Math.sin(T * 3); if (save.lvDone[23]) { circle(ex, ey, 15, '#69f0ae'); ctx.strokeStyle = '#17420f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ex - 7, ey); ctx.lineTo(ex - 2, ey + 6); ctx.lineTo(ex + 8, ey - 6); ctx.stroke(); } else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(ex, ey, 2, ex, ey, 46); g.addColorStop(0, `rgba(255,230,120,${0.7 + 0.2 * Math.sin(T * 4)})`); g.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = g; ctx.fillRect(ex - 50, ey - 50, 100, 100); ctx.restore(); drawEgg(ex, ey, 16, '#ffd700', '#fff3b0', 0.4, Math.sin(T * 5) * 0.08); ctx.strokeStyle = '#d63a3a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - 22, ey + 22); ctx.lineTo(ex - 8, ey + 36); ctx.moveTo(ex - 8, ey + 22); ctx.lineTo(ex - 22, ey + 36); ctx.stroke(); } }
  if (tmapNew >= 0 && tmapT > 1.0 && tmapT < 1.06) { SFX.right(); burst(TM_X[tmapNew] + TM_W / 2, 270, 46, ['#ffd740', '#fff', '#f2dfb0', '#ff8a9a'], 420, 500, 7, 1.2); }
  if (tmapNew >= 0 && tmapT > 1.1) { ctx.globalAlpha = 0.75 + 0.25 * Math.sin(T * 6); otxt('Neues Kartenstück!', W / 2, 462, 28, '#ffd34d', '#3b1d00', 8); ctx.globalAlpha = 1; }
  drawParts(0);
  button(tmapNew >= 0 ? 'Weiter' : 'Zurück', W / 2 - 90, H - 50, 180, 42, () => { tmapNew = -1; go('map'); }, { size: 22, icon: icon(tmapNew >= 0 ? 'play' : 'back') });
}
let tmMarker = null;
let endlessPick = false;
function themeOpenForEndless(wi) { return save.finished || LEVELS.some(l => l.wi === wi && save.lvDone[l.li]); }
function drawEndlessPicker() {
  buttons = [];
  panel(150, 24, 660, 492); txt('Endlos-Lauf', W / 2, 70, 38, '#3b2410'); txt('Wähle ein Thema – schlag deinen Rekord!', W / 2, 108, 20, '#6b4a2b', 'center', 'normal');
  WORLDS.forEach((th, i) => {
    const open = themeOpenForEndless(i), x = 180 + (i % 2) * 310, y = 128 + Math.floor(i / 2) * 58;
    button(`${th.name}${save.best[i] ? ' · ' + save.best[i] : ''}`, x, y, 290, 52, () => { if (open) { endlessPick = false; startLevel(i, true); } else { SFX.wrong(); toast('Erst ein Level dieses Themas schaffen!', '#ffb4a8'); } }, { size: 22, color: open ? '#f4b400' : '#c8c0a8', icon: open ? null : icon('lock') });
  });
  { const done = save.dailyLast === dayKey(), wi = dailyWorld(); button(`Tages-Lauf: ${WORLDS[wi].name}` + (save.dailyStreak && (done || save.dailyLast === prevDayKey()) ? ` · Serie ${save.dailyStreak}` : ''), 180, 372, 600, 46, () => { endlessPick = false; startDaily(); }, { size: 21, color: done ? '#d4f2bd' : '#ffb27a', icon: icon('star') }); if (!done) txt('Heute noch nicht gespielt: +20 Bernstein!', W / 2, 432, 15, '#8a5a00', 'center', 'normal'); else txt('Heute schon gespielt – morgen gibt es einen neuen Lauf.', W / 2, 432, 15, '#6b4a2b', 'center', 'normal'); }
  button('Zurück', W / 2 - 80, 456, 160, 40, () => { endlessPick = false; }, { size: 20, color: '#e0d2b0' });
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
  { const n = 4, seg = (W - 28) / n, cols = ['#ff5a5a', '#ffd34d', '#5ad07a', '#5ab4ff']; // string of fairy lights
    for (let q = 0; q < n; q++) {
      const x0 = 14 + q * seg; ctx.strokeStyle = '#141414'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, 86); ctx.quadraticCurveTo(x0 + seg / 2, 86 + 28, x0 + seg, 86); ctx.stroke();
      for (let b = 1; b < 9; b++) { const u = b / 9, bx = x0 + seg * u, by = 86 + 28 * 2 * u * (1 - u) * 0.5 * 2 / 2 + 0, c = cols[(q * 9 + b) % 4], tw = 0.55 + 0.45 * Math.sin(T * 3 + b * 1.3 + q);
        const yy = 86 + 28 * u * (1 - u) * 2; ctx.globalAlpha = 0.28 * tw; circle(bx, yy + 5, 9, c); ctx.globalAlpha = 1; ctx.fillStyle = '#141414'; ctx.fillRect(bx - 1.5, yy, 3, 3); circle(bx, yy + 6, 3.8, c); circle(bx - 1, yy + 5, 1.2, 'rgba(255,255,255,.8)'); }
    } }
  // header
  otxt('Adventskalender', 30, 38, 38, '#ffd34d', '#3b1d00', 9, 'left');
  const left = Math.ceil((ADVENT_START - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);
  otxt(today === 0 && save.dayOverride == null ? (left > 0 ? `Noch ${left} ${left === 1 ? 'Tag' : 'Tage'} bis zum 1. Dezember!` : 'Gleich geht es los!') : today >= 24 ? 'Alle Türen sind offen – frohe Weihnachten!' : fmt(`Heute: Tür ${today} – {rex} und Chili sind bereit!`), 32, 70, 19, '#fff', 'rgba(0,0,0,.7)', 5, 'left');
  buttons.push({ x: 20, y: 14, w: 330, h: 40, silent: true, cb: () => {} , hold: true });
  drawAmber(W - 210, 36, 14); otxt(String(save.amber), W - 188, 37, 24, '#ffe08a', 'rgba(0,0,0,.7)', 5, 'left');
  drawMedal(W - 318, 44, 12, 1, true); otxt(`${medalTotal()}/72`, W - 298, 37, 24, save.master ? '#fff6b0' : '#ffe08a', save.master ? '#8a5a00' : 'rgba(0,0,0,.7)', 5, 'left'); if (save.master) { drawStar(W - 336, 22, 9 + 1.5 * Math.sin(T * 5), '#ffd34d'); drawStar(W - 226 + 0, 20, 5 + Math.sin(T * 6 + 1), '#fff'); }
  drawChest();
  button(save.muted ? 'Aus' : 'Ton', W - 130, 16, 112, 42, () => { settingsOpen = true; }, { size: 20, color: '#e0d2b0', icon: icon(save.muted ? 'mute' : 'sound') });
  button('Dino-Buch', 24, H - 82, 210, 60, () => { bookSel = -1; go('book'); }, { icon: icon('book') });
  button('Laden', 24, H - 150, 210, 56, () => go('shop'), { color: '#ffe08a', icon: icon('amber') });
  if (save.newGifts.length) { ctx.save(); ctx.translate(214, H - 146 + Math.sin(T * 6) * 2); ctx.rotate(0.3); rr(-24, -11, 48, 22, 6); ctx.fillStyle = '#e53935'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('NEU', 0, 1, 14, '#fff'); ctx.restore(); }
  if (save.lvDone.some(Boolean) || save.finished) { button('Endlos', W - 274, H - 150, 176, 56, () => { endlessPick = true; }, { color: '#9fd3ff', icon: icon('loop'), size: 24 }); button('', W - 92, H - 150, 68, 56, () => { boardTab = -1; go('board'); }, { color: '#ffe08a', icon: icon('trophy') }); }
  if (save.finished) button('Finale', W - 274, H - 82, 176, 60, () => startEnding(), { color: '#e57373', textColor: '#fff', icon: icon('star'), size: 22 });
  button('', W - 92, H - 82, 68, 60, () => { tmapNew = -1; go('tmap'); }, { color: '#f2dfb0', icon: icon('scroll') });
  if (endlessPick) drawEndlessPicker();
  if (mapFW > 0) { mapFW -= DT; if (Math.random() < 0.09) { const c = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#ea80fc', '#fff']; burst(100 + Math.random() * 760, 70 + Math.random() * 280, 36, [c[Math.floor(Math.random() * 6)], '#fff'], 300, 160, 5, 1.4); tone(220 + Math.random() * 220, 0.3, 'triangle', 0.04, 80); } }
  drawParts(0);
  if (doorOverlay) drawDoorOverlay();
  if (parentMode) drawParentPanel();
  if (installHintVisible()) drawInstallHint();
  if (settingsOpen) drawSettings();
  if (titlePress && T - titlePress > 1.4 && !parentMode) { parentMode = true; titlePress = 0; SFX.click(); }
}

function awning(h) { // striped market awning with a scalloped edge
  const n = 15, sw = W / n;
  for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#fff7e8' : '#d63a3a'; ctx.beginPath(); ctx.moveTo(i * sw, 0); ctx.lineTo((i + 1) * sw, 0); ctx.lineTo((i + 1) * sw, h); ctx.arc(i * sw + sw / 2, h, sw / 2, 0, Math.PI); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, h - 10, W, 10); ctx.strokeStyle = '#7a1f1f'; ctx.lineWidth = 2; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(i * sw + sw / 2, h, sw / 2, 0, Math.PI); ctx.stroke(); }
}
const HAT_BOX = { santa: [-27, 21, -20, 11], cowboy: [-19, 20, -12, 11], crown: [-14, 15, -12, 8], straw: [-22, 23, -10, 13], pirate: [-22, 23, -11, 9], goggles: [-15, 17, -2, 11], chef: [-14, 15, -23, 8], tophat: [-16, 17, -20, 12], beanie: [-18, 19, -22, 12], wizard: [-20, 21, -33, 12], propeller: [-16, 17, -13, 8], antlers: [-21, 22, -20, 5], halo: [-17, 18, -21, -7], goldcrown: [-19, 20, -25, 8], mastercrown: [-22, 23, -30, 9] }; // drawn extent of each hat around its brim line [x0, x1, y0, y1]
function drawHatIcon(kind, cx, cy, k, lim) { // lim: room above the brim; tall hats shrink to fit while the brim stays where it is
  const sc = kind && lim ? Math.min(k, lim / (-(HAT_BOX[kind] || [0, 0, -20])[2] + 8)) : k;
  ctx.save(); ctx.translate(cx, cy + 6 + 8 * (k - sc)); ctx.scale(sc, sc); if (kind) drawHat(kind, 0, 0); else ico('star', 0, -8, 34); ctx.restore();
}
function drawFlameIcon(it, cx, cy, k) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 40); g.addColorStop(0, `rgba(${it.a},.55)`); g.addColorStop(1, `rgba(${it.b},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 2, 40, 0, Math.PI * 2); ctx.fill();
  for (const [sc, col] of [[1, `rgb(${it.b})`], [0.72, `rgb(${it.a})`], [0.4, '#fff']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -30 * sc); ctx.bezierCurveTo(14 * sc, -12 * sc, 20 * sc, 4 * sc, 12 * sc, 16 * sc); ctx.bezierCurveTo(6 * sc, 26 * sc, -6 * sc, 26 * sc, -12 * sc, 16 * sc); ctx.bezierCurveTo(-20 * sc, 2 * sc, -8 * sc, -10 * sc, 0, -30 * sc); ctx.fill(); if (sc === 1) { ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke(); } }
  ctx.restore();
}
// each tab: label, owned key, item list, equip slots (hats and jackets have one slot per boy, vouchers none), Goetti's line
const SHOP_TABS = [
  { lb: 'Rex', key: 'skin', list: SKINS, eq: ['skin'], say: 'Welche Farbe darf es sein?' },
  { lb: 'Feuer', key: 'fire', list: FIRES, eq: ['fire'], say: 'Feuer in allen Farben!' },
  { lb: 'Hüte', key: 'hat', list: HATS, eq: ['hat', 'fabioHat'], say: 'Hüte für {oli} und {fabio}!' },
  { lb: 'Jacken', key: 'jacket', list: JACKETS, eq: ['jacket', 'fabioJacket'], say: 'Neue Jacken für euch zwei!' },
  { lb: 'Chili', key: 'chili', list: CHILI_ITEMS, eq: ['chili'], say: 'Etwas Schönes für Chili?' },
  { lb: 'Goetti', key: 'wish', list: WISHES, eq: [], say: 'Meine Gutscheine! Die lösen wir zusammen ein – in echt!' },
];
const kidShort = n => n.length > 7 ? n.slice(0, 6) + '.' : n;
const kidNames = () => [kidShort(save.oliName || 'Oli'), kidShort(save.fabioName || 'Fabio')];
let wishShow = -1; // voucher card on screen (index into WISHES)
function drawVoucher(i) { // Goetti's voucher: a ticket with a dashed border, the outing, both names and Goetti's signature
  const wv = WISHES[i], x = 230, y = 34, w = 500, h = 330;
  ctx.fillStyle = 'rgba(8,10,24,.8)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, y + h / 2); ctx.rotate(-0.02); ctx.translate(-W / 2, -(y + h / 2));
  rr(x + 6, y + 8, w, h, 18); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
  rr(x, y, w, h, 18); ctx.fillStyle = vgrad(y, y + h, '#fffaf0', '#fbe9c4'); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#8a5a2e'; ctx.stroke();
  ctx.setLineDash([10, 7]); rr(x + 14, y + 14, w - 28, h - 28, 12); ctx.lineWidth = 2.5; ctx.strokeStyle = '#d9a23a'; ctx.stroke(); ctx.setLineDash([]);
  txt('GUTSCHEIN', W / 2, y + 52, 40, '#c62828');
  ctx.save(); ctx.beginPath(); ctx.arc(x + 110, y + 160, 62, 0, Math.PI * 2); ctx.fillStyle = '#fff3d6'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#d9a23a'; ctx.stroke(); ctx.clip(); wv.icon(x + 110, y + 150, 1.5); ctx.restore();
  const lines = wrapLines(fmt('Für {oli} und {fabio}: ' + wv.text + '!'), 270, 22);
  lines.forEach((l, k) => txt(l, x + 330, y + 120 + k * 30, 22, '#3b2410'));
  txt('Einzulösen bei Goetti', x + 330, y + 130 + lines.length * 30, 17, '#8a6a3a', 'center', 'normal');
  ctx.save(); ctx.translate(x + 390, y + 270); ctx.rotate(-0.08); txt('Goetti', 0, 0, 30, '#1f4fa0'); ctx.strokeStyle = '#1f4fa0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-54, 18); ctx.quadraticCurveTo(0, 26, 60, 12); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(x + 120, y + 268); ctx.rotate(-0.25); ctx.strokeStyle = 'rgba(198,40,40,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke(); txt('2027', 0, 1, 16, 'rgba(198,40,40,.8)'); ctx.restore();
  ctx.restore();
  buttons.length = 0; button('Super!', W / 2 - 90, y + h + 16, 180, 50, () => { wishShow = -1; SFX.click(); }, { color: '#9be38a', size: 24 });
}
let shopConfirm = null, shopTab = 0, shopPage = 0, shopSel = 0, shopTalk = { t: 0, text: 'Willkommen! Such dir etwas aus.' };
function shopSay(text) { shopTalk = { t: 4, text }; }
let shopBounce = 0;
function drawAutoHatIcon(cx, cy, k) { // "Automatik": the world decides - sun on one side, snow on the other
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  circle(-9, 0, 11, '#ffd34d'); ctx.strokeStyle = '#f0a020'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(-9 + Math.cos(a) * 14, Math.sin(a) * 14); ctx.lineTo(-9 + Math.cos(a) * 19, Math.sin(a) * 19); ctx.stroke(); }
  ctx.save(); ctx.beginPath(); ctx.moveTo(4, -24); ctx.lineTo(30, -24); ctx.lineTo(30, 24); ctx.lineTo(-6, 24); ctx.closePath(); ctx.clip(); circle(12, 0, 17, '#cfe8ff'); ctx.restore();
  ctx.strokeStyle = '#4a7ab0'; ctx.lineWidth = 2.5; for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; ctx.beginPath(); ctx.moveTo(15 + Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(15 - Math.cos(a) * 12, -Math.sin(a) * 12); ctx.stroke(); }
  ctx.restore();
}
function shopScene() {
  // wallpaper: soft stripes with small diamonds, a darker wooden wainscot
  ctx.fillStyle = vgrad(0, H, '#f9ecc9', '#f1dcaa', '#e2c488'); ctx.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 48) { ctx.fillStyle = (x / 48) % 2 ? 'rgba(255,255,255,.18)' : 'rgba(150,100,40,.06)'; ctx.fillRect(x, 60, 48, 330); }
  ctx.fillStyle = 'rgba(150,100,40,.14)'; for (let y = 90; y < 380; y += 44) for (let x = 24 + (y / 44 % 2) * 24; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 5, y); ctx.fill(); }
  ctx.fillStyle = vgrad(372, 450, '#a87644', '#7a5230'); ctx.fillRect(0, 372, W, 78); ctx.fillStyle = '#c99a62'; ctx.fillRect(0, 368, W, 8); ctx.strokeStyle = 'rgba(40,20,5,.3)'; ctx.lineWidth = 2; for (let x = 0; x <= W; x += 120) { ctx.beginPath(); ctx.moveTo(x, 376); ctx.lineTo(x, 450); ctx.stroke(); } ctx.strokeStyle = 'rgba(255,255,255,.12)'; for (let x = 8; x <= W; x += 120) { ctx.beginPath(); ctx.moveTo(x, 380); ctx.lineTo(x, 446); ctx.stroke(); }
  awning(52);
  // string lights under the awning
  for (let i = 0; i < 17; i++) { const x = 20 + i * 56, y = 70 + Math.sin(i * 1.1) * 3, c = ['#ff5252', '#ffd34d', '#69f0ae', '#40c4ff'][i % 4], tw = 0.55 + 0.45 * Math.sin(T * 3 + i * 1.7); ctx.globalAlpha = 0.3 * tw; circle(x, y + 8, 12, c); ctx.globalAlpha = 1; ctx.fillStyle = '#2a2018'; ctx.fillRect(x - 1.5, y - 2, 3, 5); circle(x, y + 7, 4.4, c); circle(x - 1.2, y + 5.6, 1.4, 'rgba(255,255,255,.85)'); }
  ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i <= 17; i++) { const x = 20 + i * 56, y = 68 + Math.sin(i * 1.1) * 3; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  // shelf with hats on stands, jars and a toy dino (left of the sign)
  rr(10, 150, 286, 9, 3); ctx.fillStyle = '#8a5a2e'; ctx.fill(); ctx.fillStyle = '#5a3a1c'; ctx.fillRect(22, 159, 6, 12); ctx.fillRect(278, 159, 6, 12);
  [['santa', 44], ['cowboy', 104], ['crown', 164], ['wizard', 224]].forEach(([k, x]) => { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 2, 136, 4, 14); circle(x, 134, 7, '#e8c9a0'); ctx.save(); ctx.translate(x, 150); drawHatIcon(k, 0, -34, 1.25); ctx.restore(); });
  rr(254, 120, 26, 30, 6); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill(); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.stroke(); drawAmber(267, 138, 7); ctx.fillStyle = '#6b4a2b'; ctx.fillRect(257, 116, 20, 6);
  // small shelf: lantern, egg, jar (beside the cards)
  rr(298, 258, 138, 9, 3); ctx.fillStyle = '#8a5a2e'; ctx.fill(); ctx.fillStyle = '#6b4a2b'; ctx.fillRect(310, 267, 6, 12); ctx.fillRect(418, 267, 6, 12);
  rr(308, 226, 24, 32, 6); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill(); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.stroke(); drawAmber(320, 244, 7); ctx.fillStyle = '#6b4a2b'; ctx.fillRect(310, 222, 20, 6);
  drawEgg(366, 244, 13, '#7ad0a8', '#3a9a70', 0, 0.1);
  rr(396, 230, 22, 28, 5); ctx.fillStyle = '#d9a23a'; ctx.fill(); ctx.stroke(); circle(407, 245, 6, '#fff3b0'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(407, 245, 2, 407, 245, 40); lg.addColorStop(0, `rgba(255,220,120,${0.55 + 0.1 * Math.sin(T * 3)})`); lg.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = lg; ctx.fillRect(367, 205, 80, 80); ctx.restore(); ctx.strokeStyle = '#6b4a2b'; ctx.beginPath(); ctx.arc(407, 230, 7, Math.PI, 0); ctx.stroke();
  // floor, rug and the spot-lit podium for Rex
  ctx.fillStyle = vgrad(448, H, '#9a6a3a', '#6e4a28', '#4a301a'); ctx.fillRect(0, 448, W, H - 448); ctx.fillStyle = '#b98a54'; ctx.fillRect(0, 448, W, 8); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2; for (let y = 470; y < H; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ell(262, 470, 178, 30, 0, '#8a2a32'); ell(262, 470, 160, 24, 0, '#a8404a'); ctx.strokeStyle = '#e8c070'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(262, 470, 168, 27, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sp = ctx.createLinearGradient(0, 100, 0, 440); sp.addColorStop(0, 'rgba(255,240,180,0)'); sp.addColorStop(1, `rgba(255,236,160,${0.34 + 0.06 * Math.sin(T * 2) + 0.2 * shopBounce})`); ctx.fillStyle = sp; ctx.beginPath(); ctx.moveTo(240, 96); ctx.lineTo(284, 96); ctx.lineTo(380, 436); ctx.lineTo(144, 436); ctx.closePath(); ctx.fill(); ctx.restore();
  ell(262, 436, 108, 15, 0, '#5a3a1c'); rr(154, 420, 216, 16, 8); ctx.fillStyle = vgrad(420, 436, '#c99a62', '#8a5a2e'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#3a2410'; ctx.stroke(); ell(262, 420, 108, 14, 0, '#d9aa72'); ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(262, 420, 100, 11, 0, 0, Math.PI * 2); ctx.stroke();
  shopBounce = Math.max(0, shopBounce - DT * 2.2);
}
function shopCounter() { // the counter Goetti stands behind
  rr(0, 394, 142, 58, 6); ctx.fillStyle = vgrad(394, 452, '#b98250', '#8a5a2e', '#5e3a1c'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
  ctx.fillStyle = '#d9aa72'; ctx.fillRect(-4, 386, 152, 12); ctx.strokeStyle = '#2b1a0c'; ctx.lineWidth = 2.5; ctx.strokeRect(-4, 386, 152, 12);
  ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(48, 400); ctx.lineTo(48, 450); ctx.moveTo(96, 400); ctx.lineTo(96, 450); ctx.stroke();
  drawAmber(110, 377, 9); drawAmber(124, 381, 8); rr(10, 366, 20, 22, 5); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.stroke(); drawAmber(20, 380, 6);
}
function drawShop() {
  // wall, awning, counter
  shopScene();
  woodFrame(300, 54, 360, 54, 14); txt('Goettis Laden', 480, 83, 30, '#3b2410');
  rr(756, 70, 176, 44, 22); ctx.fillStyle = 'rgba(40,24,10,.85)'; ctx.fill(); drawAmber(782, 92, 14); otxt(String(save.amber), 806, 93, 26, '#ffe08a', 'rgba(0,0,0,.7)', 5, 'left');
  const tab = SHOP_TABS[shopTab], { key, list } = tab;
  // live preview: equip the selection temporarily (on both boys for hats and jackets)
  const bak = Object.assign({}, save.equip); for (const k of tab.eq) save.equip[k] = shopSel;
  const hopY = shopBounce > 0 ? -26 * Math.sin(Math.PI * (1 - shopBounce)) : 0;
  if (key === 'chili') { shadow(262, 422, 60, 0.3); oChili(250, 420 + hopY, 2.1, T * 3, false); }
  else if (key !== 'wish') oRex(262, 418 + hopY, 0.85, T * 3, 0.1, Object.assign(rexLook(2), { rider: true, hat: rexLook(2).hat || null, hat2: rexLook(2).hat2 || null, fire: key === 'fire' }));
  else { ctx.save(); ctx.translate(262, 330 + hopY * 0.5); ctx.rotate(-0.05); rr(-110, -70, 220, 140, 12); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#8a5a2e'; ctx.stroke(); ctx.setLineDash([6, 5]); rr(-100, -60, 200, 120, 8); ctx.strokeStyle = '#d9a23a'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); txt('GUTSCHEIN', 0, -38, 22, '#c62828'); WISHES[shopSel].icon(0, 4, 0.95); txt(WISHES[shopSel].n, 0, 46, 18, '#3b2410'); ctx.restore(); }
  Object.assign(save.equip, bak);
  if (key === 'fire') { // Rex breathes the selected fire so the colour can be judged
    const f = fireOf(shopSel), cyc = (T % 2.6) / 2.6, mx = 262 + 116 * 0.85, my = 418 - 98 * 0.85;
    ctx.save();
    if (cyc < 0.3) { const u = cyc / 0.3, len = 80 * (0.5 + u * 0.7); const g = ctx.createRadialGradient(mx, my, 2, mx, my, len); g.addColorStop(0, 'rgba(255,255,240,.95)'); g.addColorStop(0.25, `rgba(${f.a},.95)`); g.addColorStop(0.7, `rgba(${f.b},.75)`); g.addColorStop(1, `rgba(${f.c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(mx, my); for (let i = 0; i <= 10; i++) { const a = -0.3 + i * 0.06, r = len * (0.85 + 0.15 * Math.sin(T * 50 + i * 1.7)); ctx.lineTo(mx + Math.cos(a) * r, my + 6 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
    if (cyc > 0.06 && cyc < 0.85) { const q = (cyc - 0.06) / 0.79, bx = mx + 14 + q * 150, by = my + 6 + q * 26, fa = 1 - q * q, fl = 1 + 0.12 * Math.sin(T * 45); ctx.globalAlpha = fa; const g = ctx.createRadialGradient(bx, by, 2, bx, by, 34 * fl); g.addColorStop(0, 'rgba(255,255,235,1)'); g.addColorStop(0.3, `rgba(${f.a},1)`); g.addColorStop(0.65, `rgba(${f.b},.85)`); g.addColorStop(1, `rgba(${f.c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 34 * fl, 0, Math.PI * 2); ctx.fill(); for (let k = 1; k <= 3; k++) { ctx.globalAlpha = fa * 0.5 / k; circle(bx - k * 14, by - k * 3 + Math.sin(T * 30 + k) * 3, 13 - k * 2.5, f.ball); } ctx.globalAlpha = 1; }
    ctx.restore();
  }
  oGoetti(62, 420, 0.95, shopTalk.t > 0); shopCounter();
  if (shopTalk.t > 0 || true) { shopTalk.t = Math.max(0, shopTalk.t - DT); const lines = wrapLines(shopTalk.text, 230, 18); const bh = 20 + lines.length * 22; rr(20, 215 - bh + 10, 262, bh, 14); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke(); ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.moveTo(52, 225); ctx.lineTo(76, 225); ctx.lineTo(70, 252); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillRect(54, 223, 20, 4); lines.forEach((l, i) => txt(l, 151, 215 - bh + 32 + i * 22, 18, '#3b2410', 'center', 'normal')); }
  // tabs
  SHOP_TABS.forEach((tb, i) => button(tb.lb, 440 + i * 84, 118, 80, 44, () => { shopTab = i; shopPage = 0; shopSel = tb.eq.length ? save.equip[tb.eq[0]] : 0; shopSay(fmt(tb.say)); }, { size: 18, color: i === shopTab ? '#ffd34d' : '#d9c9a0' }));
  // item cards: 8 per page (4 x 2), gifts from the calendar show the door they come from
  const PER = 8, pages = Math.ceil(list.length / PER); shopPage = clamp(shopPage, 0, pages - 1);
  list.forEach((it, i) => {
    if (Math.floor(i / PER) !== shopPage) return;
    const j = i % PER, x = 440 + (j % 4) * 126, y = 166 + Math.floor(j / 4) * 104, w = 118, h = 100, owned = save.owned[key].includes(i), who = tab.eq.filter(k => save.equip[k] === i), eq = who.length > 0, cost = it.cost || 0, can = !it.gift && save.amber >= cost, sel = shopSel === i;
    if (sel) { rr(x - 4, y - 4, w + 8, h + 8, 16); ctx.fillStyle = `rgba(255,211,77,${0.5 + 0.15 * Math.sin(T * 5)})`; ctx.fill(); }
    ctx.save(); rr(x, y + 3, w, h, 14); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill(); ctx.restore();
    rr(x, y, w, h, 14); ctx.fillStyle = eq ? '#d4f2bd' : owned ? '#fffaf0' : it.gift ? (it.gift === 25 ? '#fff0b8' : '#ece4f6') : can ? '#fff0c8' : '#e8dec8'; ctx.fill(); ctx.lineWidth = sel ? 4 : 3; ctx.strokeStyle = sel ? '#e8a317' : eq ? '#2e7d32' : '#8a6a3a'; ctx.stroke();
    ctx.save(); rr(x + 5, y + 5, w - 10, 62, 9); ctx.clip(); ctx.fillStyle = vgrad(y, y + 68, '#fffdf4', '#f2e4c2'); ctx.fillRect(x, y, w, 70);
    ctx.fillStyle = 'rgba(120,80,30,.12)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 62, 34, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (key === 'skin') oRex(x + w / 2 + 6, y + 62, 0.3, 0.5 + T * 0.0, 0.05, { body: it.body, dark: it.dark, belly: it.belly, rainbow: it.rainbow, rider: true, hat: HATS[save.equip.hat] && HATS[save.equip.hat].k });
    else if (key === 'hat') { if (it.k) { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x + w / 2 - 2, y + 40, 4, 22); rr(x + w / 2 - 14, y + 60, 28, 5, 2); ctx.fillStyle = '#8a5a2e'; ctx.fill(); circle(x + w / 2, y + 40, 9, '#e8c9a0'); drawHatIcon(it.k, x + w / 2, y + 22, 1.55, 31); } else drawAutoHatIcon(x + w / 2, y + 34, 1.15); }
    else if (key === 'jacket') { ctx.save(); ctx.translate(x + w / 2 - 2, y + 66); ctx.scale(1.0, 1.0); drawOli(0, 0, 0.5, null, { kid: i === 1 ? 'fabio' : 'oli', jacket: i, hold: true }); ctx.restore(); }
    else if (key === 'chili') { chiliAcc = i; drawChili(x + w / 2 - 10, y + 64, 0.95, 0); chiliAcc = null; }
    else if (key === 'wish') it.icon(x + w / 2, y + 34, 0.8);
    else drawFlameIcon(fireOf(i), x + w / 2, y + 36, 0.98);
    if (!owned) { ctx.fillStyle = it.gift ? 'rgba(90,70,130,.30)' : 'rgba(120,110,90,.34)'; ctx.fillRect(x, y, w, 70); }
    ctx.restore();
    if (!owned) { circle(x + w - 18, y + 18, 13, 'rgba(40,30,20,.78)'); ico('lock', x + w - 18, y + 18, 16); }
    if (save.newGifts.includes(key + ':' + i)) { ctx.save(); ctx.translate(x + 24, y + 16); ctx.rotate(-0.3); rr(-18, -9, 36, 18, 5); ctx.fillStyle = '#e53935'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('NEU', 0, 1, 12, '#fff'); ctx.restore(); }
    const nm = it.n === 'Auto' ? 'Automatik' : it.n; txt(nm, x + w / 2, y + 77, nm.length > 9 ? 12 : 14, '#3b2410');
    const pill = (c0, c1, tc) => { rr(x + 12, y + 84, w - 24, 13, 6.5); ctx.fillStyle = vgrad(y + 84, y + 97, c0, c1); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.stroke(); return tc; };
    if (eq) txt(tab.eq.length > 1 ? (who.length > 1 ? '✓ Beide' : '✓ ' + kidNames()[tab.eq.indexOf(who[0])]) : '✓ Angelegt', x + w / 2, y + 91, 12, pill('#9be38a', '#5ebb5a', '#17420f')); else if (owned && key === 'wish') txt('✓ Gutschein', x + w / 2, y + 91, 12, pill('#ffe6a0', '#f4c24a', '#6a4800')); else if (owned) txt(it.gift ? 'Geschenk' : cost ? 'Gekauft' : 'Gratis', x + w / 2, y + 91, 12, pill('#f4ecd8', '#e2d6b8', '#6b4a2b'), 'center', 'normal'); else if (it.gift) txt(it.gift === 25 ? '72 Medaillen' : `Tür ${it.gift}`, x + w / 2, y + 91, 12, pill(it.gift === 25 ? '#ffe9a0' : '#d8c8f4', it.gift === 25 ? '#f0c040' : '#b9a0e6', it.gift === 25 ? '#6a4800' : '#3a2470')); else { const tc = pill(can ? '#ffe6a0' : '#e6dcc4', can ? '#f4c24a' : '#d4c8a8', can ? '#6a4800' : '#8a7a58'); drawAmber(x + w / 2 - 17, y + 91, 6); txt(String(cost), x + w / 2 - 7, y + 91, 13, tc, 'left'); }
    buttons.push({ x, y, w, h, cb: () => { shopSel = i; shopBounce = 1; SFX.click(); shopSay(key === 'wish' ? (owned ? 'Den habt ihr schon! Wann gehen wir?' : fmt(`Ein Gutschein für ${it.text}! Kostet ${cost} Bernstein.`)) : owned ? (eq ? 'Das ist gerade angezogen.' : 'Das steht euch gut!') : it.gift ? (it.gift === 25 ? 'Sammle alle 72 Medaillen – dann gehört das dir!' : `Das findest du hinter Tür ${it.gift} im Kalender!`) : can ? `Das kostet ${cost} Bernstein.` : 'Sammle noch etwas Bernstein!'); } });
  });
  if (pages > 1) {
    button('‹', 440, 376, 56, 32, () => { shopPage = (shopPage + pages - 1) % pages; }, { size: 24, color: '#e0d2b0' });
    otxt(`Seite ${shopPage + 1} von ${pages}`, 690, 392, 16, '#fff3d6', 'rgba(40,20,5,.8)', 4);
    button('›', 880, 376, 56, 32, () => { shopPage = (shopPage + 1) % pages; }, { size: 24, color: '#e0d2b0' });
  }
  // buy / equip bar
  const it = list[shopSel], owned = save.owned[key].includes(shopSel), eq = tab.eq.length > 0 && save.equip[tab.eq[0]] === shopSel, cost = it.cost || 0, can = !it.gift && save.amber >= cost, BY = 412;
  if (owned && key === 'wish') button('Gutschein ansehen', 440, BY, 496, 52, () => { wishShow = shopSel; SFX.click(); }, { color: '#ffe08a', size: 24 });
  else if (owned && tab.eq.length > 1) tab.eq.forEach((k, n) => { const on = save.equip[k] === shopSel, nm = kidNames()[n]; button(on ? nm + ' ✓' : nm + ' anziehen', 440 + n * 252, BY, 244, 52, () => { if (on) return; save.equip[k] = shopSel; writeSave(); SFX.right(); shopSay(fmt(n ? 'Sieht super aus, {fabio}!' : 'Sieht super aus, {oli}!')); shopBounce = 1; burst(262, 330, 26, ['#fff', '#ffe08a', '#ffd34d'], 280, 300, 5, 0.9); }, on ? { disabled: true, size: 20 } : { color: '#9be38a', size: 20 }); });
  else if (eq) button('Angelegt', 440, BY, 496, 52, () => {}, { disabled: true, icon: icon('check'), size: 26 });
  else if (owned) button('Anlegen', 440, BY, 496, 52, () => { save.equip[tab.eq[0]] = shopSel; writeSave(); SFX.right(); shopSay('Sieht super aus!'); shopBounce = 1; burst(262, 330, 26, ['#fff', '#ffe08a', '#ffd34d'], 280, 300, 5, 0.9); }, { color: '#9be38a', size: 26 });
  else if (it.gift) button(it.gift === 25 ? 'Mit allen 72 Medaillen' : `Aus Tür ${it.gift} im Kalender`, 440, BY, 496, 52, () => { SFX.wrong(); shopSay(it.gift === 25 ? `Du hast ${medalTotal()} von 72 Medaillen.` : `Öffne am ${it.gift}. Dezember die Tür ${it.gift}!`); }, { disabled: true, size: 22 });
  else if (can) button(`Kaufen  ·  ${cost}`, 440, BY, 496, 52, () => { shopConfirm = { key, sel: shopSel, cost, name: key === 'wish' ? 'Gutschein: ' + it.n : it.n, eq: tab.eq }; SFX.click(); }, { size: 26, icon: icon('amber') });
  else button('Zu wenig Bernstein', 440, BY, 496, 52, () => { SFX.wrong(); toast('Noch zu wenig Bernstein!', '#ffb4a8'); shopSay('Sammle noch etwas Bernstein!'); }, { disabled: true, size: 24 });
  button('Zurück', W - 224, H - 56, 200, 46, () => go('map'), { size: 24, icon: icon('back') });
  if (!owned && !it.gift && key !== 'wish') { ctx.font = 'bold 15px sans-serif'; const lbl = 'Vorschau – noch nicht gekauft', pw = 214; rr(262 - pw / 2, 462, pw, 28, 14); ctx.fillStyle = 'rgba(40,24,10,.78)'; ctx.fill(); txt(lbl, 262, 477, 15, '#ffe9b0'); }
  if (shopConfirm) { // are you sure? nothing is bought by accident
    buttons.length = 0; const sc = shopConfirm;
    ctx.fillStyle = 'rgba(8,10,24,.62)'; ctx.fillRect(0, 0, W, H); woodFrame(290, 150, 380, 240, 24);
    txt('Wirklich kaufen?', W / 2, 196, 32, '#3b2410'); txt(sc.name, W / 2, 238, 26, '#6b4a2b');
    drawAmber(W / 2 - 62, 280, 15); txt(`${sc.cost} Bernstein`, W / 2 - 40, 281, 24, '#8a5a00', 'left'); txt(`Danach hast du noch ${save.amber - sc.cost}.`, W / 2, 312, 15, '#8a6a3a', 'center', 'normal');
    button('Nein', 310, 330, 150, 46, () => { shopConfirm = null; shopSay('Überleg es dir in Ruhe!'); }, { size: 22 });
    button('Ja, kaufen!', 480, 330, 170, 46, () => { if (save.amber >= sc.cost && !save.owned[sc.key].includes(sc.sel)) { save.amber -= sc.cost; save.owned[sc.key].push(sc.sel); if (sc.eq.length === 1) save.equip[sc.eq[0]] = sc.sel; if (sc.key === 'wish') wishShow = sc.sel; writeSave(); SFX.buy(); shopSay(sc.key === 'wish' ? 'Abgemacht! Den lösen wir zusammen ein.' : sc.eq.length > 1 ? 'Gekauft! Wer zieht es an?' : 'Viel Spass damit!'); burst(262, 330, 46, ['#ffd34d', '#fff', '#ff9f1c', '#69f0ae'], 420, 600, 7, 1.1); } shopConfirm = null; }, { color: '#9be38a', size: 22, icon: icon('amber') });
  }
  if (wishShow >= 0) drawVoucher(wishShow);
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
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fur = vgrad(-96, 0, '#c99562', '#94603a', '#5e3a22'), far = '#6e4528';
  for (const lx of [-34, 20]) { rr(lx - 9, -36, 18, 36, 8); ctx.fillStyle = far; ctx.fill(); ell(lx, -1, 10, 3.5, 0, '#e8d8c0'); } // far legs
  ctx.fillStyle = fur; ctx.beginPath(); ctx.moveTo(-52, -54); ctx.quadraticCurveTo(-66, -44, -60, -22); ctx.quadraticCurveTo(-52, -34, -46, -40); ctx.fill(); // tail
  ell(-60, -22, 5, 8, 0.1, '#4a2c18');
  ell(-2, -52, 52, 33, 0, fur); ell(18, -76, 28, 17, 0.15, fur); // body and the high head dome
  ctx.fillStyle = '#6e4528'; ctx.beginPath(); ctx.moveTo(-50, -34); for (let i = 0; i <= 9; i++) ctx.lineTo(-46 + i * 10, i % 2 ? -14 : -28); ctx.lineTo(44, -34); ctx.closePath(); ctx.fill(); // shaggy fringe
  ctx.strokeStyle = 'rgba(70,36,16,.45)'; ctx.lineWidth = 2; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(-40 + i * 10, -66 + (i % 3) * 3); ctx.quadraticCurveTo(-44 + i * 10, -52, -42 + i * 10, -42); ctx.stroke(); }
  for (const lx of [-14, 36]) { rr(lx - 10, -38, 20, 38, 9); ctx.fillStyle = fur; ctx.fill(); ctx.fillStyle = '#7a4a2c'; ctx.beginPath(); ctx.moveTo(lx - 10, -22); for (let i = 0; i < 4; i++) ctx.lineTo(lx - 10 + i * 6.7 + 3.3, -12); ctx.lineTo(lx + 10, -22); ctx.fill(); ell(lx, -1, 11, 3.8, 0, '#efe2c8'); }
  ell(46, -62, 22, 22, 0, fur); ell(32, -64, 10, 14, 0.3, '#7a4a2a'); // head and ear
  ctx.strokeStyle = '#a06a46'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(60, -58); ctx.quadraticCurveTo(76, -44, 70, -24); ctx.quadraticCurveTo(68, -14, 76, -12); ctx.stroke(); // trunk
  ctx.strokeStyle = 'rgba(60,30,15,.3)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(70 + i * 0.5, -46 + i * 8, 7, 0.4, 2.6); ctx.stroke(); }
  ctx.strokeStyle = '#fff1d0'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(52, -48); ctx.quadraticCurveTo(70, -22, 92, -34); ctx.quadraticCurveTo(98, -38, 98, -46); ctx.stroke(); // tusk
  ctx.strokeStyle = 'rgba(160,130,90,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(56, -44); ctx.quadraticCurveTo(72, -26, 90, -34); ctx.stroke();
  circle(51, -68, 5.4, '#fff'); circle(52.2, -68, 3.2, '#222'); circle(53, -69.4, 1.1, '#fff'); ctx.strokeStyle = '#4a2c18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(45, -76); ctx.quadraticCurveTo(51, -79, 56, -75); ctx.stroke();
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
function drawFeathered(x, y, s) { // a small feathered dinosaur: tail fan, wing feathers on the arm and a crest
  ctx.save(); ctx.translate(x, y); ctx.scale(s * 1.7, s * 1.7); ctx.translate(-4, 0); ctx.lineCap = 'round';
  const cols = ['#3fa9f5', '#f2a43a', '#e84a6f', '#f2d03a', '#6bd16b'];
  const fea = (px, py, an, len, wd, c) => { ctx.save(); ctx.translate(px, py); ctx.rotate(an); ctx.fillStyle = vgrad(-wd, wd, shade(c, 1.25), c); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -wd, len, 0); ctx.quadraticCurveTo(len * 0.5, wd, 0, 0); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(len * 0.92, 0); ctx.stroke(); ctx.restore(); };
  for (let i = 0; i < 5; i++) fea(-38, -31, Math.PI - 0.62 + i * 0.3, 46, 8, cols[i]); // tail fan
  drawCompy(0, 0, 1, 0.4, false, { tone: ['#8aeed0', '#3fb59a', '#1f7a66', '#0f4a3e'] });
  for (let i = 0; i < 5; i++) fea(9, -23, Math.PI - 0.05 - i * 0.2, 34 - i * 2, 6, cols[(i + 2) % 5]); // wing feathers
  for (let i = 0; i < 3; i++) fea(16, -45, -2.15 + i * 0.4, 20, 4.5, cols[(i * 2) % 5]); // crest
  ctx.restore();
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
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round';
  ctx.fillStyle = '#5fa08a'; ctx.beginPath(); ctx.ellipse(-34, -9, 22, 7, -0.45, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(34, -8, 26, 8, 0.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-48, -26, 14, 6, 0.9, 0, 7); ctx.fill(); // flippers
  ell(0, -32, 52, 30, 0, vgrad(-62, -2, '#a0d8b8', '#5aa078', '#2f6a4a'));
  ctx.strokeStyle = 'rgba(20,60,40,.6)'; ctx.lineWidth = 2.4; ctx.fillStyle = 'rgba(255,255,255,.12)';
  const hex = (cx, cy, r) => { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.52; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.82); } ctx.closePath(); ctx.fill(); ctx.stroke(); };
  for (const [px, py, r] of [[-26, -42, 11], [-4, -48, 13], [20, -44, 12], [-16, -26, 11], [8, -28, 12], [30, -26, 9]]) hex(px, py, r); // scutes
  ctx.strokeStyle = 'rgba(30,80,56,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -30, 51, 27, 0, 0.1, Math.PI - 0.1); ctx.stroke(); // rim
  ctx.strokeStyle = '#6fb090'; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(44, -32); ctx.lineTo(56, -34); ctx.stroke();
  ell(62, -36, 16, 12, 0.05, '#6fb090'); ctx.fillStyle = '#3d7a5c'; ctx.beginPath(); ctx.moveTo(70, -40); ctx.quadraticCurveTo(82, -36, 76, -29); ctx.lineTo(66, -30); ctx.fill();
  circle(64, -41, 5, '#fff'); circle(65, -41, 2.8, '#222'); circle(65.8, -42, 1, '#fff'); ctx.strokeStyle = '#2f6a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(70, -32, 5, 0.2, 1.6); ctx.stroke();
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
  ctx.save(); ctx.translate(x, y - 38 * s); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = '#9a6048'; ctx.beginPath(); ctx.moveTo(16, -8); ctx.lineTo(24, -78); ctx.quadraticCurveTo(10, -58, -6, -74); ctx.quadraticCurveTo(0, -40, -16, -6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#5e3624'; ctx.lineWidth = 2; ctx.stroke(); // far wing
  ctx.strokeStyle = '#7a4a32'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-4, 14); ctx.lineTo(-26, 34); ctx.moveTo(6, 15); ctx.lineTo(-10, 38); ctx.stroke(); // trailing legs
  ctx.fillStyle = '#d49a78'; ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(-34, -64); ctx.quadraticCurveTo(-24, -36, -78, -32); ctx.quadraticCurveTo(-42, -8, -62, 16); ctx.quadraticCurveTo(-16, 6, 10, 10); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7a4a32'; ctx.lineWidth = 3; ctx.stroke(); // near wing
  ctx.fillStyle = 'rgba(120,60,36,.22)'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-40, -52); ctx.lineTo(-56, -30); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(-62, -28); ctx.lineTo(-52, 12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(100,50,30,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-62, -30); ctx.moveTo(-6, 0); ctx.lineTo(-48, 10); ctx.moveTo(-8, -4); ctx.lineTo(-34, -60); ctx.stroke();
  ell(10, 0, 28, 13, -0.1, vgrad(-13, 13, '#f0cdb0', '#c98f6c')); ell(14, 6, 18, 6, -0.1, '#f8e6d2');
  ctx.strokeStyle = '#e0aa88'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(28, -4); ctx.quadraticCurveTo(38, -8, 40, -10); ctx.stroke(); // neck
  ctx.fillStyle = '#e8b896'; ctx.beginPath(); ctx.moveTo(30, -14); ctx.lineTo(104, -12); ctx.lineTo(32, 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7a4a32'; ctx.lineWidth = 2.2; ctx.stroke(); // very long beak
  ctx.fillStyle = '#c9785c'; ctx.beginPath(); ctx.moveTo(34, 1); ctx.quadraticCurveTo(44, 12, 50, 2); ctx.fill(); // throat pouch
  ctx.fillStyle = '#e0553a'; ctx.beginPath(); ctx.moveTo(30, -18); ctx.quadraticCurveTo(14, -44, -14, -40); ctx.quadraticCurveTo(10, -26, 26, -8); ctx.fill(); ctx.strokeStyle = '#8a2a18'; ctx.lineWidth = 2; ctx.stroke(); // crest
  circle(38, -10, 5.4, '#fff'); circle(39.4, -10, 3.2, '#222'); circle(40.2, -11.4, 1.2, '#fff'); ctx.restore();
}
function drawArchaeo(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-58, 2); ctx.quadraticCurveTo(0, -4, 56, 0); ctx.stroke(); ctx.strokeStyle = '#8a6238'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-58, 0); ctx.quadraticCurveTo(0, -6, 56, -2); ctx.stroke(); // branch
  ctx.strokeStyle = '#7a8a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(34, -2); ctx.quadraticCurveTo(46, -14, 58, -12); ctx.stroke(); circle(60, -12, 4, '#6aa84f');
  for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(-20, -28); ctx.rotate(2.75 - i * 0.075); ctx.fillStyle = i % 2 ? '#3fa9a0' : '#e8873a'; ctx.beginPath(); ctx.ellipse(34, 0, 34, 5.2, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(40,20,10,.4)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); } // long tail feathers
  ctx.strokeStyle = '#d89a3a'; ctx.lineWidth = 4; for (const lx of [-6, 8]) { ctx.beginPath(); ctx.moveTo(lx, -22); ctx.lineTo(lx + 1, -6); ctx.moveTo(lx - 5, -2); ctx.lineTo(lx + 1, -6); ctx.lineTo(lx + 6, -2); ctx.stroke(); }
  ell(2, -34, 27, 19, -0.25, vgrad(-52, -14, '#5ccbb8', '#2f8a7e')); ell(10, -27, 15, 9, -0.25, '#f6e0b0');
  for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(-2, -42); ctx.rotate(-2.5 - i * 0.2); ctx.fillStyle = ['#e8873a', '#f2c13a', '#3fa9a0'][i % 3]; ctx.beginPath(); ctx.ellipse(-24, 0, 26, 6.2, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(40,20,10,.4)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); } // raised wing
  ctx.strokeStyle = '#3fa9a0'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(16, -44); ctx.quadraticCurveTo(26, -50, 28, -58); ctx.stroke();
  ell(30, -62, 14, 12, 0, '#3fa9a0'); ctx.fillStyle = '#f2c13a'; ctx.beginPath(); ctx.moveTo(38, -66); ctx.lineTo(56, -60); ctx.lineTo(38, -55); ctx.fill(); ctx.strokeStyle = '#a87a10'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(41 + i * 4.5, -58); ctx.lineTo(43 + i * 4.5, -54.5); ctx.lineTo(45 + i * 4.5, -58); ctx.fill(); }
  ctx.fillStyle = '#e8873a'; ctx.beginPath(); ctx.moveTo(22, -72); ctx.lineTo(18, -82); ctx.lineTo(28, -74); ctx.lineTo(28, -84); ctx.lineTo(34, -73); ctx.fill();
  circle(33, -65, 4.8, '#fff'); circle(34.2, -65, 2.8, '#222'); circle(35, -66.4, 1, '#fff'); ctx.restore();
}
function drawTheriz(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round';
  ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-10, -22); ctx.lineTo(-12, -4); ctx.moveTo(12, -22); ctx.lineTo(14, -4); ctx.stroke(); ctx.lineWidth = 6; for (const fx of [-12, 14]) { ctx.beginPath(); ctx.moveTo(fx - 8, 0); ctx.lineTo(fx + 8, 0); ctx.stroke(); }
  ctx.fillStyle = '#b07a52'; ctx.beginPath(); ctx.moveTo(-26, -34); ctx.quadraticCurveTo(-58, -30, -66, -14); ctx.quadraticCurveTo(-40, -22, -22, -14); ctx.fill();
  ell(0, -36, 34, 29, -0.1, vgrad(-62, -10, '#e0a878', '#b07a52', '#7a4a2a')); ctx.fillStyle = '#c99062'; for (let i = 0; i < 8; i++) { const a = -2.9 + i * 0.36; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 34, -36 + Math.sin(a) * 29, 9, 5.5, a + 1.57, 0, 7); ctx.fill(); } ell(2, -26, 22, 12, 0, 'rgba(255,236,210,.28)'); ctx.strokeStyle = '#f0c898'; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-18 + i * 7, -52); ctx.lineTo(-22 + i * 7, -40); ctx.stroke(); }
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
  [drawMeteor, 100, 80, -30],
  [(x, y, s) => { pine(x - 26 * s, y, 90 * s, '#2f6a50', true); pine(x + 28 * s, y, 66 * s, '#3b7d5c', false); }, 100, 90, 0],
  [(x, y, s) => { drawBaby(x, y, s * 1.5, 0.3, false); ctx.strokeStyle = '#d63a3a'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 6 * s, y - 64 * s); ctx.quadraticCurveTo(x + 14 * s, y - 56 * s, x + 24 * s, y - 62 * s); ctx.stroke(); }, 80, 90, 0],
  [drawFeathered, 110, 80, 0],
];
const cardCache = {};
function cardSprite(i, silhouette) { // pre-rendered, outlined sticker art at 2x, auto-fitted to the card
  const key = i + (silhouette ? 's' : 'c'); if (cardCache[key]) return cardCache[key];
  const [fn, w, h, ox] = CARD_ART[i], R = 2, CW = 280, CH = 170, sc0 = Math.min(CW / (w + 14), CH / (h + 14)), old = ctx, oldT = T;
  // 1) probe: draw once on a big canvas and measure the real bounding box, so nothing is cropped or tiny
  const BW = CW * 3, BH = CH * 3, probe = document.createElement('canvas'); probe.width = BW; probe.height = BH;
  const fx0 = BW / 2 - ox * sc0, fy0 = BH / 2 + h * sc0 / 2;
  ctx = probe.getContext('2d'); T = 1; try { fn(fx0, fy0, sc0); } finally { ctx = old; T = oldT; }
  const d = probe.getContext('2d').getImageData(0, 0, BW, BH).data; let x0 = BW, y0 = BH, x1 = 0, y1 = 0;
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (d[(y * BW + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const bw = Math.max(1, x1 - x0 + 1), bh = Math.max(1, y1 - y0 + 1), f = Math.min((CW - 44) / bw, (CH - 56) / bh, 2.4), cx0 = CW / 2, cy0 = CH * 0.47;
  const fx = cx0 + (fx0 - (x0 + x1) / 2) * f, fy = cy0 + (fy0 - (y0 + y1) / 2) * f;
  // 2) final art at 2x
  const c = document.createElement('canvas'); c.width = CW * R; c.height = CH * R;
  const art = document.createElement('canvas'); art.width = c.width; art.height = c.height;
  ctx = art.getContext('2d'); ctx.setTransform(R, 0, 0, R, 0, 0); T = 1;
  try { fn(fx, fy, sc0 * f); } finally { ctx = old; T = oldT; }
  const sil = document.createElement('canvas'); sil.width = c.width; sil.height = c.height; const sx = sil.getContext('2d');
  sx.drawImage(art, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = silhouette ? 'rgba(90,70,45,.55)' : '#1b120c'; sx.fillRect(0, 0, sil.width, sil.height);
  const cx = c.getContext('2d');
  if (!silhouette) { // soft light behind the animal and a contact shadow, so it pops off any card colour
    cx.save(); cx.translate(cx0 * R, cy0 * R); cx.scale(1.7, 1); const g = cx.createRadialGradient(0, 0, 8, 0, 0, 80 * R); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g; cx.fillRect(-CW * R, -CH * R, CW * R * 2, CH * R * 2); cx.restore();
    cx.fillStyle = 'rgba(30,20,10,.2)'; cx.beginPath(); cx.ellipse(cx0 * R, (cy0 + bh * f / 2 + 3) * R, bw * f * 0.36 * R, 6 * R, 0, 0, Math.PI * 2); cx.fill();
  }
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; cx.drawImage(sil, Math.cos(a) * 4, Math.sin(a) * 4); }
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
  if (sheetPage === 'appicon') { // 256 x 256 logical px (screenshot at 4x gives the 1024 master). Everything important sits inside the central 80 % circle so the same art works as a maskable icon
    const S = 256, EX = 178, EY = 84;
    const sk = ctx.createLinearGradient(0, 0, 0, S); sk.addColorStop(0, '#071a44'); sk.addColorStop(0.42, '#17566e'); sk.addColorStop(0.78, '#3f9c84'); sk.addColorStop(1, '#8fd19a'); ctx.fillStyle = sk; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.35 + 0.6 * hash(i + 3); circle(hash(i) * S, hash(i + 50) * 120, hash(i + 9) < 0.15 ? 1.5 : 0.8, '#fff'); } ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(EX, EY); for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = 'rgba(255,230,140,.13)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-13, -300); ctx.lineTo(13, -300); ctx.fill(); } ctx.restore();
    const hg = ctx.createRadialGradient(EX, EY, 8, EX, EY, 120); hg.addColorStop(0, 'rgba(255,236,150,.85)'); hg.addColorStop(0.4, 'rgba(255,200,90,.35)'); hg.addColorStop(1, 'rgba(255,200,90,0)'); ctx.fillStyle = hg; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#1b5f63'; ctx.beginPath(); ctx.moveTo(0, 176); ctx.quadraticCurveTo(50, 118, 112, 160); ctx.quadraticCurveTo(170, 126, 256, 168); ctx.lineTo(256, S); ctx.lineTo(0, S); ctx.fill();
    ctx.fillStyle = '#0f4448'; ctx.beginPath(); ctx.moveTo(0, 196); ctx.quadraticCurveTo(70, 156, 140, 190); ctx.quadraticCurveTo(200, 168, 256, 192); ctx.lineTo(256, S); ctx.lineTo(0, S); ctx.fill();
    palm(22, 218, 128, '#0a3033'); palm(240, 218, 104, '#0a3033');
    ctx.fillStyle = vgrad(206, S, '#58b844', '#2f7d30'); ctx.fillRect(0, 206, S, 12); ctx.fillStyle = vgrad(216, S, '#6a4528', '#2e1c0e'); ctx.fillRect(0, 216, S, 40);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(0, 206, S, 2);
    circle(EX, EY, 46, 'rgba(255,236,150,.35)'); drawEgg(EX, EY, 39, '#ffd34a', '#fff3b0', 1.4, 0.1);
    for (const [sx, sy, sr] of [[EX - 52, EY - 34, 8], [EX + 50, EY - 18, 6], [EX + 36, EY + 50, 5], [EX - 36, EY + 44, 4]]) drawStar(sx, sy, sr, '#fff6c0');
    shadow(116, 216, 62, 0.3);
    oRex(116, 214, 0.68, 0.5, 0.3, Object.assign(rexLook(0), { rider: true, hat: null, hat2: null }));
    for (let i = 0; i < 18; i++) { const fx = hash(i + 80) * S, fy = 150 + hash(i + 95) * 56; const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 5); g.addColorStop(0, 'rgba(255,245,170,.9)'); g.addColorStop(1, 'rgba(255,245,170,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, 5, 0, 7); ctx.fill(); }
    const vg = ctx.createRadialGradient(S / 2, S / 2, 100, S / 2, S / 2, 190); vg.addColorStop(0, 'rgba(0,0,10,0)'); vg.addColorStop(1, 'rgba(0,0,10,.38)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, S, S);
    return;
  }
  if (sheetPage === 'icons') { // every UI icon, large
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(0, 0, W, H);
    ['book', 'amber', 'loop', 'trophy', 'scroll', 'star', 'back', 'lock', 'check', 'play', 'gear', 'sound', 'mute', 'pause', 'duck', 'stomp', 'dash', 'roar', 'fire'].forEach((k, i) => { const x = 60 + (i % 10) * 90, y = 60 + Math.floor(i / 10) * 100; ctx.fillStyle = ['duck', 'stomp', 'dash', 'roar', 'fire', 'pause'].includes(k) ? '#3a7ee0' : 'rgba(0,0,0,0)'; if (ctx.fillStyle !== 'rgba(0, 0, 0, 0)') { ctx.beginPath(); ctx.arc(x, y, 38, 0, 7); ctx.fill(); } ico(k, x, y, 56); txt(k, x, y + 46, 13, '#3b2410'); });
    [1, 0].forEach((f, i) => drawHeart(80 + i * 80, 330, 2.4, !!f)); drawAmber(260, 330, 34); [0, 1, 2].forEach(k => drawMedal(380 + k * 90, 345, 30, k, true)); drawMedal(660, 345, 30, 1, false);
    drawEgg(780, 330, 30, '#f6e7b0', '#6aa84f');
    if (G === null || scene === 'sheet') { actBtn(110, 450, 54, '#3a7ee0', 'duck', 'DUCKEN', 17); actBtn(260, 460, 46, '#ec8a18', 'dash', 'FLITZ', 17); actBtn(420, 450, 66, '#d63a28', 'roar', 'BRÜLL!', 24); actBtn(590, 450, 66, '#ff6a14', 'fire', 'FEUER!', 24); actBtn(760, 450, 54, '#3a7ee0', 'stomp', 'STAMPF!', 17); } return;
  }
  if (sheetPage === 'wardrobe') { // every hat on Oli (top) and Fabio (bottom), then the jackets
    const hs = HATS.filter(h => h.k);
    hs.forEach((h, i) => { const x = 60 + (i % 8) * 116, y = 190 + Math.floor(i / 8) * 190; ctx.save(); ctx.translate(x, y); ctx.scale(1.9, 1.9); drawOli(0, 0, 0.5, h.k, i % 2 ? { kid: 'fabio' } : {}); ctx.restore(); txt(h.n, x, y + 36, 12, '#3b2410', 'center'); });
    return;
  }
  if (sheetPage.startsWith('cards')) { // the collectible card art, 12 per page
    const pg = +sheetPage.slice(5) || 0; for (let k = 0; k < 12; k++) { const i = pg * 12 + k; if (i >= CARD_ART.length) break; const cx = 130 + (k % 4) * 233, cy = 90 + Math.floor(k / 4) * 170; rr(cx - 114, cy - 80, 228, 160, 10); ctx.fillStyle = '#f5ecd0'; ctx.fill(); drawCardArt(i, cx, cy, 220); txt(i + '', cx - 104, cy - 66, 11, '#3b2410', 'left'); }
    return;
  }
  if (sheetPage === 'chili') { // Chili with every accessory
    CHILI_ITEMS.forEach((it, i) => { fx({}); const x = 90 + i * 125; ctx.save(); ctx.translate(x, 200); ctx.scale(2.4, 2.4); drawChili(0, 0, 1, 0.3, false); drawChiliAcc(it.k); ctx.restore(); txt(it.n, x, 250, 12, '#3b2410', 'center'); });
    return;
  }
  if (sheetPage === 'rex') {
    oRex(250, 330, 2.2, t, 0.05, Object.assign(rexLook(0), { rider: true }));
    oRex(700, 330, 2.2, t, 1, Object.assign(rexLook(0), {}));
    oRex(130, 510, 0.9, 0.8, 0.05, Object.assign(rexLook(0), { rider: true, air: true, vy: -300, sq: -0.06 }));
    oRex(420, 510, 0.9, 0, 0.05, Object.assign(rexLook(0), { rider: true, duck: true }));
    oRex(700, 510, 0.9, t, 0.3, Object.assign(rexLook(0), { fire: true }));
  } else if (sheetPage === 'faces') {
    row(300, 'OLI hats: none / santa / cowboy / crown');
    [null, 'santa', 'cowboy', 'crown'].forEach((h, i) => { ctx.save(); ctx.translate(90 + i * 150, 250); ctx.scale(3.6, 3.6); drawOli(0, 0, 0.5, h, {}); ctx.restore(); });
    drawGoettiHead(790, 160, 90, true);
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
  } else if (sheetPage === 'wounds') {
    [0, 0.4, 0.7, 1].forEach((d, c) => { const x = 120 + c * 240; txt('dmg ' + d + (d === 1 ? ' + K.O.' : ''), x, 22, 14, '#3b2410', 'center');
      drawCrabKing(x, 150, 0.8, T * 6, false, { dmg: d, ko: d === 1, wid: 'c' + c }); drawKraken(x, 290, 0.58, T * 6, false, { dmg: d, ko: d === 1, wid: 'k' + c }); drawQueen(x - 10, 395, 0.75, T * 6, false, { dmg: d, ko: d === 1, wid: 'q' + c }); oRaptor(x - 10, 520, 1.5, t, false, { col: ['#8b1a1a', '#7a3a1a', '#5a2a7a', '#b01c10'][c], dark: '#4a0a0a', crown: true, dmg: d, ko: d === 1, wid: 'r' + c }); });
  } else if (sheetPage === 'boss') {
    row(270, 'CRAB KING / KRAKEN / QUEEN / small crab');
    drawCrabKing(170, 262, 0.95, T * 6, false); drawKraken(480, 262, 0.8, T * 6, false); drawQueen(790, 262, 1.0, T * 6, false); drawSmallCrab(920, 262, { ph: T });
    row(520, 'RAPTOR BOSS / PTERO');
    oRaptor(200, 500, 2.4, t, false, { col: '#8b1a1a', dark: '#4a0a0a', crown: true }); oPtero(560, 420, 3.2, t * 0.5, false); oCompy(800, 500, 2.6, t, false, {});
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
// ---------- Dino-Buch "Steckbrief": era, diet and a size comparison with a child ----------
const STECK = [
  { l: 'Lebte vor', e: '68 Mio. Jahren', d: 'Fleisch', dk: 'meat', m: 12 }, { l: 'Lebte vor', e: '68 Mio. Jahren', d: 'Pflanzen', dk: 'leaf', m: 9 }, { l: 'Lebte vor', e: '150 Mio. Jahren', d: 'Pflanzen', dk: 'leaf', m: 25 },
  { l: 'Lebte vor', e: '200 Mio. Jahren', d: 'Plankton', dk: 'fish', m: 0.3 }, { l: 'Lebte vor', e: '75 Mio. Jahren', d: 'Quallen', dk: 'fish', m: 4 }, { l: 'Entstanden vor', e: '100 Mio. Jahren', d: '–', dk: 'none', m: 0.5 },
  { l: 'Lebte vor', e: '75 Mio. Jahren', d: 'Fleisch', dk: 'meat', m: 2 }, { l: 'Lebte vor', e: '85 Mio. Jahren', d: 'Fische', dk: 'fish', m: 6, ml: 'Spannweite' }, { l: 'Lebte vor', e: '150 Mio. Jahren', d: 'Pflanzen', dk: 'leaf', m: 9 },
  { l: 'Lebte vor', e: '200 Mio. Jahren', d: 'Fische', dk: 'fish', m: 3 }, { l: 'Lebte vor', e: '75 Mio. Jahren', d: 'Fleisch', dk: 'meat', m: 12 }, { l: 'Lebte vor', e: '200 Mio. Jahren', d: 'Fische', dk: 'fish', m: 4 },
  { l: 'Lebte vor', e: '10 000 Jahren', d: 'Pflanzen', dk: 'leaf', m: 4 }, { l: 'Lebte vor', e: '68 Mio. Jahren', d: 'Pflanzen', dk: 'leaf', m: 7 }, { l: 'Gelegt vor', e: '70 Mio. Jahren', d: '–', dk: 'none', m: 0.3, ml: 'Grösse' },
  { l: 'Lebte vor', e: '68 Mio. Jahren', d: 'Fleisch', dk: 'meat', m: 10, ml: 'Spannweite' }, { l: 'Lebte vor', e: '150 Mio. Jahren', d: 'Insekten', dk: 'meat', m: 0.5 }, { l: 'Lebte vor', e: '70 Mio. Jahren', d: 'Pflanzen', dk: 'leaf', m: 10 },
  { l: 'Lebte vor', e: '95 Mio. Jahren', d: 'Fische', dk: 'fish', m: 14 }, { l: 'Lebt', e: 'heute noch', d: 'Alles', dk: 'all', m: 0.5 }, { l: 'Schlug ein vor', e: '66 Mio. Jahren', d: '–', dk: 'none', m: 0, txt: 'Etwa 10 km breit – so hoch wie der Mount Everest!' },
  { l: 'Gibt es seit', e: '300 Mio. Jahren', d: 'Sonne', dk: 'none', m: 30, ml: 'Höhe' }, { l: 'Lebte vor', e: '110 Mio. Jahren', d: 'Pflanzen', dk: 'leaf', m: 1 }, { l: 'Lebte vor', e: '130 Mio. Jahren', d: 'Fleisch', dk: 'meat', m: 1 },
];
function drawKid(x, base, h) { // a child silhouette, h pixels tall, standing at x
  const u = h / 100; ctx.save(); ctx.translate(x, base); ctx.scale(u, u);
  ctx.fillStyle = '#2f4a78'; rr(-9, -42, 7, 42, 3); ctx.fill(); rr(2, -42, 7, 42, 3); ctx.fill();
  ctx.fillStyle = '#d8483a'; rr(-13, -72, 26, 34, 8); ctx.fill(); ctx.fillStyle = '#f0c9a0'; circle(0, -84, 13, '#f0c9a0'); ctx.fillStyle = '#e9c25e'; ctx.beginPath(); ctx.arc(0, -88, 13.5, Math.PI, 0); ctx.fill(); circle(-14, -82, 5, '#e9c25e'); circle(14, -82, 5, '#e9c25e');
  ctx.strokeStyle = '#d8483a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-13, -66); ctx.lineTo(-20, -44); ctx.moveTo(13, -66); ctx.lineTo(20, -44); ctx.stroke(); ctx.restore();
}
function drawSizeRuler(x, y, w, h, st, th) {
  rr(x, y, w, h, 14); ctx.fillStyle = 'rgba(255,250,235,.9)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#b8a070'; ctx.stroke();
  if (!st.m) { txt('Grösse im Vergleich', x + w / 2, y + 14, 14, '#8a6a3a', 'center', 'normal'); wrapLines(st.txt || '', w - 40, 17).forEach((l, i, a) => txt(l, x + w / 2, y + h / 2 + 6 + (i - (a.length - 1) / 2) * 22, 17, '#3b2410', 'center', 'normal')); return; }
  const base = y + h - 12, sc = Math.min(36, (w - 70) / st.m), kidH = 1.4 * sc, len = st.m * sc, kx = x + 34;
  txt('Grösse im Vergleich', x + w / 2, y + 14, 14, '#8a6a3a', 'center', 'normal');
  ctx.strokeStyle = 'rgba(138,106,58,.35)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x + 14, base); ctx.lineTo(x + w - 14, base); ctx.stroke(); ctx.setLineDash([]);
  drawKid(kx, base, Math.max(14, kidH));
  const bx = kx + 20, by = base - 20; rr(bx, by, Math.max(8, len), 18, 9); ctx.fillStyle = vgrad(by, by + 18, shade(th.sky[0], 1.25), shade(th.sky[0], 0.8)); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
  const m = st.m >= 10 ? Math.round(st.m) : String(st.m).replace('.', ','), kids = Math.max(1, Math.round(st.m / 1.4));
  txt(`${st.ml || 'Länge'}: ${m} m`, x + w - 16, y + 31, 18, '#3b2410', 'right'); txt(st.m < 1 ? 'kleiner als ein Kind' : `so lang wie ${kids} ${kids === 1 ? 'Kind' : 'Kinder'}`, x + w - 16, y + 50, 14, '#6b4a2b', 'right', 'normal');
}
function drawHourglass(x, y) { ctx.fillStyle = '#e8c070'; ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 8, y - 10); ctx.lineTo(x + 8, y - 10); ctx.lineTo(x + 1.5, y); ctx.lineTo(x + 8, y + 10); ctx.lineTo(x - 8, y + 10); ctx.lineTo(x - 1.5, y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#c98a3a'; ctx.beginPath(); ctx.moveTo(x - 5, y + 9); ctx.lineTo(x + 5, y + 9); ctx.lineTo(x, y + 3); ctx.fill(); }
function drawDietIcon(k, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (k === 'leaf' || k === 'all') { ctx.save(); if (k === 'all') ctx.translate(-5, 0); ctx.fillStyle = '#5cb85c'; ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, 8); ctx.quadraticCurveTo(-10, -8, 8, -9); ctx.quadraticCurveTo(10, 8, -8, 8); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(5, -5); ctx.stroke(); ctx.restore(); }
  if (k === 'meat' || k === 'all') { ctx.save(); if (k === 'all') ctx.translate(7, 2); ctx.fillStyle = '#c9603a'; ctx.strokeStyle = '#7a3418'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-2, -2, 8, 6, -0.6, 0, 7); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#f4ecd8'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(3, 3); ctx.lineTo(9, 9); ctx.stroke(); circle(10, 10, 2.6, '#f4ecd8'); ctx.restore(); }
  if (k === 'fish') { ctx.fillStyle = '#4f9ad8'; ctx.strokeStyle = '#2a5a8a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-1, 0, 9, 6, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(13, -6); ctx.lineTo(13, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); circle(-5, -1.5, 1.6, '#fff'); }
  if (k === 'none') { ctx.strokeStyle = '#a09070'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke(); }
  ctx.restore();
}
function steckChip(x, y, w, label, value, icon) {
  rr(x, y + 2, w, 42, 12); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill(); rr(x, y, w, 42, 12); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#b8a070'; ctx.stroke();
  icon(x + 22, y + 21); txt(label, x + 42, y + 13, 12, '#8a6a3a', 'left', 'normal');
  let fs = 16; setFont(fs); while (ctx.measureText(value).width > w - 50 && fs > 10) { fs--; setFont(fs); } txt(value, x + 42, y + 30, fs, '#2b1a00', 'left');
}
function foil(x, y, w, h, r, t) { // diagonal shimmer on found cards
  ctx.save(); rr(x, y, w, h, r); ctx.clip(); const u = ((t * 0.35) % 1.6) - 0.3, gx = x + u * (w + h);
  const g = ctx.createLinearGradient(gx - 30, y, gx + 30, y + h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}
function drawBook() {
  leatherCover();
  otxt('Oli & Fabios Dino-Buch', W / 2, 46, 34, '#ffd34d', '#3b1d00', 9);
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
    else { ctx.save(); rr(5, 5, w - 10, h - 10, 7); ctx.clip(); ctx.globalAlpha = 0.45; ctx.fillStyle = vgrad(5, h - 5, th.sky[0], th.sky[1]); ctx.fillRect(5, 5, w - 10, h - 10); ctx.globalAlpha = 1; ctx.restore(); drawCardArt(i, w / 2, 36, 120, true); txt(`Tür ${i + 1}`, w / 2, h - 16, 14, '#a8987a', 'center', 'normal'); txt('?', w - 18, 20, 22, 'rgba(120,90,50,.5)'); }
    if (isNew) { ctx.save(); ctx.translate(w - 24, 18); ctx.rotate(0.35); rr(-20, -9, 40, 18, 5); ctx.fillStyle = '#e53935'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('NEU', 0, 1, 13, '#fff'); ctx.restore(); }
    ctx.restore();
    if (bookSel < 0) buttons.push({ x, y, w, h, cb: () => { if (has) { bookSel = i; save.bookSeen[i] = true; writeSave(); } else toast(`Diese Karte findest du in Tür ${i + 1}.`, '#fff'); } });
  }
  if (bookSel < 0) button('Zurück', W / 2 - 100, H - 62, 200, 46, () => go('map'), { size: 24, icon: icon('back') });
  else {
    const th = WORLDS[LEVELS[bookSel].wi], st = STECK[bookSel];
    panel(90, 56, 780, 420);
    ctx.save(); rr(120, 88, 340, 186, 18); ctx.clip(); ctx.fillStyle = vgrad(88, 274, shade(th.sky[1], 1.2), th.sky[1]); ctx.fillRect(120, 88, 340, 186); ctx.restore(); rr(120, 88, 340, 186, 18); ctx.lineWidth = 4; ctx.strokeStyle = '#fffaf0'; ctx.stroke(); rr(118, 86, 344, 190, 20); ctx.lineWidth = 2; ctx.strokeStyle = '#8a6a3a'; ctx.stroke();
    drawCardArt(bookSel, 290, 181, 262, false); foil(120, 88, 340, 186, 18, T);
    drawSizeRuler(120, 284, 340, 96, st, th);
    txt(FACTS[bookSel].name, 500, 118, FACTS[bookSel].name.length > 11 ? 32 : 38, '#3b2410', 'left'); txt(`Tür ${bookSel + 1} · ${LEVELS[bookSel].title}`, 500, 150, 18, '#8a6a3a', 'left', 'normal');
    wrapLines(FACTS[bookSel].text, 340, 21).forEach((l, i) => txt(l, 500, 184 + i * 27, 21, '#3b2410', 'left', 'normal'));
    if (st.d === '–') steckChip(500, 314, 350, st.l, st.e, (x, y) => drawHourglass(x, y)); else { steckChip(500, 314, 172, st.l, st.e, (x, y) => drawHourglass(x, y)); steckChip(678, 314, 172, 'Frisst', st.d, (x, y) => drawDietIcon(st.dk, x, y)); } steckChip(500, 362, 350, 'Zuhause in der Welt', th.name, (x, y) => { ctx.save(); rr(x - 13, y - 9, 26, 18, 4); ctx.clip(); drawThemeThumb(LEVELS[bookSel].wi, x - 13, y - 9, 26, 18); ctx.restore(); });
    button('Schliessen', W / 2 - 110, 420, 220, 46, () => { bookSel = -1; }, { icon: icon('check'), size: 24 });
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
    { who: 'goetti', text: '{oli}, {fabio}, {rex}, Chili – ihr habt es geschafft! Alle Eier sind wieder sicher in der Station.' },
    { who: 'goetti', text: 'Der Krallenkönig ist weit weggeflogen. Ich glaube, er wollte das Ei nur wärmen – in seiner Höhle war es so kalt.' },
    { who: 'goetti', text: 'Und schaut mal, wer zum Feiern gekommen ist: Mamasaurus und Papasaurus!' },
    { who: 'fabio', text: '{oli}! {oli}! Das goldene Ei wackelt!!' },
    { who: 'goetti', text: 'Tatsächlich! Tippt ganz oft auf das Ei – helft dem Baby beim Schlüpfen!' },
  ], () => { E.phase = 'tap'; }, true);
}
function tapEgg() {
  E.taps++; E.wob = 0.5; SFX.crack(); burst(480, 380, 10, ['#ffd700', '#fff3b0'], 250, 600, 5, 0.6);
  if (E.taps >= 6) { E.phase = 'hatch'; E.hatchT = 0; SFX.right(); SFX.sparkle(); burst(480, 380, 70, ['#ffd700', '#fff', '#ff5252', '#69f0ae'], 520, 500, 8, 1.6); }
}
function treasureLines() {
  const n = save.treasures.reduce((a, b) => a + b, 0), L = [];
  if (save.treasures[3]) L.push({ who: 'kiwi', text: 'Kiwi! Kiwi! (Kiwi will auch mitfeiern.)' });
  if (n === 4) L.push({ who: 'goetti', text: 'Und dank euch habe ich meine Gitarre, mein Velo, meine Angel – und Kiwi wieder! Das beste Weihnachten überhaupt!' });
  else if (n > 0) L.push({ who: 'goetti', text: 'Ein paar meiner verlorenen Sachen habt ihr auch gefunden – danke! Vielleicht entdeckt ihr ja noch den Rest …' });
  else L.push({ who: 'goetti', text: 'Meine Gitarre, mein Velo, meine Angel und mein Kiwi sind leider noch irgendwo da draussen … Vielleicht findet ihr sie ja!' });
  return L;
}
function afterBabyName() {
  startDialog([
    { who: 'mami', text: '{baby}! Was für ein wunderschöner Name!' },
    { who: 'papi', text: 'Willkommen in der Familie, {baby}!' },
    { who: 'fabio', text: 'Hallo {baby}! Ich bin {fabio}. Ich pass auf dich auf!' },
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
      if (!save.babyName) startDialog([{ who: 'goetti', text: 'Ein Dino-Baby – mit Weihnachtsmütze! {fabio}, du hast das Ei als Erster wackeln sehen. Du darfst ihm einen Namen geben!' }], () => askName('Wie soll das Dino-Baby heissen?', 'Krümel', n => { save.babyName = n; writeSave(); afterBabyName(); }), true);
      else startDialog([{ who: 'goetti', text: 'Möchtest du dem Dino-Baby einen neuen Namen geben? Wenn nicht, tippe einfach auf OK.' }], () => askName('Wie soll das Dino-Baby heissen?', save.babyName, n => { save.babyName = n; writeSave(); afterBabyName(); }, null, true), true);
    }
  }
  if (E.phase === 'party') { E.fw -= dt; if (E.fw <= 0) { E.fw = 0.45 + Math.random() * 0.4; const c = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#ea80fc', '#fff']; burst(120 + Math.random() * 720, 60 + Math.random() * 150, 40, [c[Math.floor(Math.random() * 6)], '#fff'], 300, 160, 5, 1.5); tone(200 + Math.random() * 200, 0.3, 'triangle', 0.04, 80); } }
}
function drawEnding() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#071630'); g.addColorStop(1, '#2c4f7c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 80; i++) { ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(T * 1.3 + i)); circle(hash(i) * W, hash(i + 40) * 300, 1.4, '#fff'); } ctx.globalAlpha = 1;
  drawAurora();
  { const mg = ctx.createRadialGradient(860, 80, 20, 860, 80, 130); mg.addColorStop(0, 'rgba(240,240,220,.35)'); mg.addColorStop(1, 'rgba(240,240,220,0)'); ctx.fillStyle = mg; ctx.fillRect(730, 0, 230, 210); }
  circle(860, 80, 34, '#f4f1de'); circle(850, 72, 6, 'rgba(0,0,0,.06)'); circle(868, 92, 4.5, 'rgba(0,0,0,.06)');
  drawVolcano(700, 448, 0.82, '#2a3c5c', 0);
  drawHills(0, '#c9dcf0', 420, 30, 3);
  endingSnow();
  // Goetti's station, the same hut as in the story, in its winter dress
  drawStation(120, 452, 0.6); stationWinter(120, 452, 0.6);
  pine(268, 452, 210, '#1f6b42', true);
  if (save.treasures[1]) drawBike(95, 452, 0.95);
  if (save.treasures[2]) drawRod(222, 418, 1, T * 3);
  rr(230, 425, 30, 26, 3); ctx.fillStyle = '#d63a3a'; ctx.fill(); ctx.fillStyle = '#ffd740'; ctx.fillRect(243, 425, 5, 26);
  rr(280, 432, 26, 20, 3); ctx.fillStyle = '#40a4ff'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(291, 432, 4, 20);
  // family (right)
  for (const [sx, sw] of [[790, 50], [895, 56], [640, 52], [395, 24], [325, 30], [570, 20]]) shadow(sx, 454, sw, 0.18);
  oLong(800, 452, 0.72, '#b07cc6', T * 2, true);
  oLong(905, 452, 0.8, '#4f8fd6', T * 2 + 1, true);
  oGoetti(325, 452, 1.1, E.phase === 'party' && !save.treasures[0]);
  if (save.treasures[0]) drawGuitar(332, 372 + (E.phase === 'party' ? Math.sin(T * 8) * 2 : 0), 0.85, -1.05);
  if (save.treasures[3]) oKiwi(572, 454 - (E.phase === 'party' ? Math.abs(Math.sin(T * 9 + 1)) * 16 : 0), 1.25, T * 8, true);
  oRex(640, 452, 1.0, E.phase === 'party' ? T * 6 : 0, E.phase === 'party' ? 0.3 + 0.3 * Math.sin(T * 5) : 0.1, Object.assign(rexLook(2), { rider: true, flip: true, hat: rexLook(2).hat || 'santa', hat2: rexLook(2).hat2 || 'santa' }));
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
    ctx.save(); ctx.translate(W / 2, 82); ctx.rotate(Math.sin(T * 2) * 0.02);
    otxt('Frohe Weihnachten,', 0, 0, 56, '#ffd34d', '#7a1010', 13); otxt(fmt('{oli} und {fabio}!'), 0, 58, 50, '#ffd34d', '#7a1010', 12); ctx.restore();
    otxt('Alles Liebe – euer Goetti', W / 2, 190, 28, '#fff', 'rgba(0,0,0,.7)', 6);
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
  if (scene === 'splash') { startSplash(); return; }
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
    else if (scene === 'splash') startSplash();
    else if (scene === 'title') pressTitle();
    else if (scene === 'play' && !G.overlay) { jump(); G.holdJump = 'key'; }
    else if (scene === 'ending' && E.phase === 'tap') tapEgg();
  } else if (k === 'r' || k === 'R' || k === 'x' || k === 'X' || k === 'ArrowRight' || k === 'Enter') {
    if (dialog) advanceDialog();
    else if (scene === 'splash') startSplash();
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
  { const mo = musicOpts(); musicTick(musicKey(portrait), musicLevel(), mo); ambTick(scene === 'play' && G && !portrait ? G.wi : null, mo.vol); }
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  buttons = [];
  if (scene === 'splash') drawSplash();
  else if (scene === 'title') drawTitle();
  else if (scene === 'story') drawStory();
  else if (scene === 'map') drawMap();
  else if (scene === 'book') drawBook();
  else if (scene === 'board') drawBoard();
  else if (scene === 'tmap') drawTMap();
  else if (scene === 'shop') drawShop();
  else if (scene === 'sheet') drawSheet();
  else if (scene === 'play') drawPlay();
  else if (scene === 'ending') drawEnding();
  drawDialog();
  if (!(scene === 'play' && G.overlay)) drawToasts();
  if (flashT > 0) { flashT = Math.max(0, flashT - DT * 1.8); ctx.fillStyle = `rgba(255,248,215,${flashT})`; ctx.fillRect(0, 0, W, H); }
  if (fadeT > 0) { fadeT = Math.max(0, fadeT - DT * 4.5); ctx.fillStyle = `rgba(10,8,20,${fadeT})`; ctx.fillRect(0, 0, W, H); }
  if (portrait) { buttons = []; ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(0, 0, W, H); otxt('Bitte das Tablet quer halten!', W / 2, H / 2, 44, '#ffd34d', '#000', 8); }
  ctx.restore();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// debug hook for testing in the browser console
window.__dino = { get mus() { return mus; }, useAudio(ctx) { AC = ctx; noiseBuf = null; buildAudioGraph(); mus.key = null; mus.trans = null; mus.saved = {}; mus.g = 1; mus.vt = 1; amb.wi = null; amb.node = null; amb.lvl = -1; }, musicTick, SFX, ambTick, ambEvent, AMB, SONGS, startSplash, get splash() { return splash; }, bossDmg, medalTotal, worldMedalsDone, chestFull, chestParty, get chestPartyT() { return chestPartyT; }, startDaily, dailyWorld, dayKey, get dialog() { return dialog; }, DAY_STORY, DAY_AFTER, launchLevel, finishLevel, fmt, cleanNick, boardAdd, boardQualifies, boardAll, endRun, get scene() { return scene; }, get doorOverlay() { return doorOverlay; }, get buttons() { return buttons; }, pitFall, get lowfx() { return LOWFX; }, set lowfx(v) { LOWFX = v; }, get G() { return G; }, get E() { return E; }, save, startLevel, startEnding, go, jump, roar, updatePlay, updateEnding, answer, retry, tapEgg, openGate, playTreasure, drawPlay, duckDown, duckUp, shootFire, drawShop, buildSong, dash, LEVELS, adventDay, openDoorGift, giftFor, clickDoor, skillsFor, bookOpen(i) { bookSel = i; }, sheet(p) { sheetPage = p || 'hero'; scene = 'sheet'; } };
})();
