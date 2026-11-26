'use strict';
// Sound: synthesised effects, music, ambience. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
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
  if (AC && AC.state !== 'running' && AC.state !== 'closed') { try { const r = AC.resume(); if (r && r.catch) r.catch(() => {}); } catch (e) {} } // 'suspended' or Safari's 'interrupted'
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
// tone options o: att (attack s), hold (sustain then release: pads), det (chorus detune in cents), lp/lpTo (lowpass sweep Hz), vib (vibrato on long notes), path ([[time s, Hz], ...] extra pitch glide points), am ([Hz, depth 0-1] amplitude flutter: the rasp of a growl)
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
    if (o && o.path) for (const [pt, pf] of o.path) osc.frequency.exponentialRampToValueAtTime(pf, t + pt); else if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    if (det && osc.detune) osc.detune.value = det;
    if (o && o.vib && dur > 0.25 && osc.detune) { const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 7; lfo.connect(lg); lg.connect(osc.detune); lfo.start(t); lfo.stop(t + dur + 0.05); }
    if (o && o.am) { // growl: the voice is chopped by a fast low oscillator
      const ag = AC.createGain(), lfo = AC.createOscillator(), lg = AC.createGain(); ag.gain.value = 1 - o.am[1] / 2; lfo.type = 'sine'; lfo.frequency.setValueAtTime(o.am[0], t); lfo.frequency.linearRampToValueAtTime(o.am[0] * 0.6, t + dur); lg.gain.value = o.am[1] / 2;
      lfo.connect(lg); lg.connect(ag.gain); osc.connect(ag); ag.connect(g); lfo.start(t); lfo.stop(t + dur + 0.05);
    } else osc.connect(g);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
}
let noiseBuf = null;
function noise(dur, vol = 0.3, freq = 800, delay = 0, ftype = 'lowpass', att = 0) {
  if (save.muted || !AC) return; vol *= busGain(); if (vol <= 0.0005) return;
  const t = AC.currentTime + delay;
  if (!noiseBuf) { const n = Math.floor(AC.sampleRate * 2), d = (noiseBuf = AC.createBuffer(1, n, AC.sampleRate)).getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
  const src = AC.createBufferSource(); src.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = ftype; f.frequency.value = freq;
  const g = AC.createGain(); if (att > 0) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); } else g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(busOut()); src.start(t, Math.random() * 1.5, dur + 0.02);
}
// drum kit (all synthesised): kick with a click, snare = tone + bright noise, hats = high-passed noise
const kick = (d, v = 0.13) => { tone(160, 0.16, 'sine', v, 42, d); noise(0.012, v * 0.5, 4500, d, 'highpass'); };
const snare = (d, v = 0.09) => { noise(0.11, v, 1800, d, 'highpass'); tone(190, 0.09, 'triangle', v * 0.55, 120, d); };
const hat = (d, v = 0.035, open = false) => noise(open ? 0.09 : 0.03, v, 7500, d, 'highpass');
const SFX = {
  jump() { tone(330, 0.16, 'square', 0.07, 660); },
  jump2() { tone(500, 0.16, 'square', 0.07, 950); },
  roar() { // a real roar: a sharp breath, a chopped (growling) throat that swells up and falls away, a bright rasp, a sub boom and a rumbling tail
    bus = 'sfx'; duck(0.25, 0.9); // never on the music bus (a stray bus would make it as quiet as a faded song) noise(0.16, 0.55, 2600, 0, 'bandpass'); noise(1.2, 0.5, 1100, 0.03, 'lowpass', 0.12); noise(0.9, 0.22, 2400, 0.1, 'bandpass', 0.15);
    tone(85, 1.3, 'sawtooth', 0.3, null, 0, { att: 0.07, hold: 1, det: 14, lp: 1100, lpTo: 260, path: [[0.22, 190], [0.7, 150], [1.3, 52]], am: [34, 0.65] });
    tone(170, 1.2, 'square', 0.1, null, 0.02, { att: 0.07, hold: 1, lp: 3000, lpTo: 600, path: [[0.22, 380], [0.7, 300], [1.2, 105]], am: [58, 0.8] });
    tone(58, 1.15, 'sine', 0.32, 36, 0, { att: 0.04 }); noise(0.6, 0.2, 260, 0.85); },
  roarWater() { // the roar underwater: muffled and bubbly, but as big as the land roar (a deep chopped growl, a sub boom, a surge of water, bubbles on top)
    bus = 'sfx'; duck(0.3, 0.8); noise(0.14, 0.45, 1800, 0, 'bandpass'); noise(1.0, 0.6, 420, 0.02, 'lowpass', 0.1);
    tone(80, 1.1, 'sawtooth', 0.34, null, 0, { att: 0.06, hold: 1, det: 14, lp: 700, lpTo: 200, path: [[0.2, 170], [0.6, 135], [1.1, 50]], am: [30, 0.6] });
    tone(160, 0.9, 'square', 0.1, null, 0.02, { att: 0.06, hold: 1, lp: 1200, lpTo: 400, path: [[0.2, 340], [0.9, 100]], am: [52, 0.7] });
    tone(55, 1.0, 'sine', 0.34, 34, 0, { att: 0.04 }); noise(0.5, 0.2, 200, 0.7);
    for (let i = 0; i < 6; i++) { const f = 420 + Math.random() * 520; tone(f, 0.08, 'sine', 0.06, f * 1.8, 0.06 + i * 0.07); } },
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
  runeChime(k) { // a gate rune lights up: a bell on the song's scale, climbing with each rune
    const m = SONGS[mus.key] || { root: 330, sc: 'maj' }, sc = SCALES[m.sc], rt = m.root * Math.pow(2, (mus.lift || 0) / 12), f = rt * 2 * Math.pow(2, (sc[[0, 2, 4][k % 3]] + 12) / 12);
    tone(f, 0.9, 'sine', 0.1, null, 0, { att: 0.01 }); tone(f * 2, 0.5, 'sine', 0.04); tone(f * 3, 0.25, 'sine', 0.015); for (let i = 0; i < 4; i++) tone(f * 2 * Math.pow(1.122, i * 2), 0.18, 'sine', 0.02, null, 0.05 * i);
  },
  tabletThud() { duck(0.5, 0.25); tone(70, 0.5, 'sine', 0.26, 36); noise(0.4, 0.3, 380); noise(0.25, 0.1, 5000, 0.04, 'highpass'); tone(523, 1.1, 'sine', 0.05, null, 0.12, { att: 0.02 }); tone(784, 1.0, 'sine', 0.035, null, 0.2, { att: 0.02 }); },
  riddleWin() { fanNotes(261.6, [[0, 0], [7, 0.12], [12, 0.24], [16, 0.38, 0.7], [19, 0.38, 0.7]]); [1568, 2093, 2637].forEach((f, i) => tone(f, 0.3, 'sine', 0.03, null, 0.5 + i * 0.07)); },
  gateRumble() { duck(0.6, 0.6); noise(1.6, 0.22, 240); tone(58, 1.4, 'sawtooth', 0.07, 40, 0, { lp: 220 }); tone(88, 1.2, 'triangle', 0.08, 55); for (let i = 0; i < 5; i++) noise(0.08, 0.1, 700, 0.2 + i * 0.22); },
  dig() { noise(0.18, 0.15, 1800); noise(0.18, 0.15, 1800, 0.25); noise(0.18, 0.15, 1800, 0.5); },
  smash() { duck(0.55, 0.15); noise(0.35, 0.4, 350); tone(90, 0.3, 'square', 0.12, 40); },
  click() { tone(720, 0.05, 'square', 0.05); },
  crack() { noise(0.12, 0.35, 3500); tone(900, 0.08, 'triangle', 0.08, 500); },
  flag() { tone(660, 0.12, 'triangle', 0.12); tone(990, 0.2, 'triangle', 0.12, null, 0.12); },
  pop() { tone(400, 0.2, 'sine', 0.15, 1200); },
  stamp() { duck(0.4, 0.12); tone(95, 0.3, 'sine', 0.2, 40); noise(0.15, 0.25, 500); },
  rise() { [523, 659, 784, 1047].forEach((q, i) => tone(q, 0.28, 'sine', 0.08, null, i * 0.07, { att: 0.01 })); tone(2093, 0.5, 'sine', 0.03, null, 0.3, { att: 0.02 }); },
  warn() { tone(660, 0.09, 'square', 0.06); tone(880, 0.12, 'square', 0.06, null, 0.1); },
  bossSting() { duck(0.6, 0.4); tone(65, 0.9, 'sawtooth', 0.12, 46); tone(98, 0.8, 'square', 0.06, 70, 0.02); noise(0.5, 0.25, 220); },
  nearMiss() { tone(880, 0.12, 'triangle', 0.07, 1320); tone(1320, 0.2, 'sine', 0.05, null, 0.06); },
  stomp() { duck(0.55, 0.15); noise(0.3, 0.45, 260); tone(110, 0.25, 'square', 0.13, 45); },
  boing() { tone(260, 0.18, 'triangle', 0.13, 780); },
  spark() { noise(0.4, 0.12, 2600, 0, 'bandpass'); tone(900, 0.4, 'sine', 0.05, 1800); },
  candle() { noise(0.3, 0.14, 1400); tone(180, 0.3, 'sine', 0.12, 90); [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.5, 'sine', 0.08, null, 0.12 + i * 0.09, { att: 0.01 })); tone(2349, 0.7, 'sine', 0.03, null, 0.5, { att: 0.02 }); },
  fire() { noise(0.35, 0.3, 1600); tone(200, 0.3, 'sawtooth', 0.06, 90); },
  duck() { tone(420, 0.08, 'triangle', 0.06, 260); },
  power() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'square', 0.05, null, i * 0.06)); },
  voice(kind) { (VOICES[kind] || VOICES.rex)(); }, // the Dino-Buch: tap a picture and the animal answers in its own voice
};
const VOICES = { // every card has its own synthesised voice (or sound for things that are not animals)
  rex() { duck(0.4, 0.45); noise(0.8, 0.4, 420); tone(95, 0.85, 'sawtooth', 0.15, 48, 0, { lp: 650, lpTo: 150, vib: 1 }); tone(140, 0.6, 'sawtooth', 0.08, 70, 0.05, { lp: 900 }); },
  spino() { duck(0.5, 0.4); noise(0.7, 0.26, 2200, 0, 'bandpass'); tone(150, 0.7, 'sawtooth', 0.12, 85, 0, { lp: 1500, lpTo: 300 }); tone(210, 0.35, 'sawtooth', 0.07, 120, 0.4, { lp: 1800 }); },
  trike() { tone(190, 0.55, 'sawtooth', 0.13, 135, 0, { lp: 900, vib: 1 }); tone(95, 0.55, 'triangle', 0.11, 78); tone(175, 0.5, 'sawtooth', 0.12, 120, 0.4, { lp: 800, vib: 1 }); tone(88, 0.5, 'triangle', 0.1, 70, 0.4); },
  sauro() { tone(70, 1.5, 'sine', 0.1, 112, 0, { vib: 1, att: 0.25 }); tone(140, 1.3, 'triangle', 0.045, 100, 0.1, { vib: 1, lp: 520, att: 0.25 }); tone(210, 1.1, 'sine', 0.02, 150, 0.2, { att: 0.3 }); tone(112, 0.7, 'sine', 0.08, 60, 1.0); },
  raptor() { for (let i = 0; i < 3; i++) tone(900 + i * 170, 0.1, 'square', 0.055, 1700 + i * 170, i * 0.11, { lp: 3600 }); noise(0.35, 0.12, 4800, 0, 'highpass'); tone(1300, 0.28, 'sawtooth', 0.05, 700, 0.38, { lp: 3000 }); },
  ptero() { tone(1100, 0.38, 'sawtooth', 0.075, 2500, 0, { lp: 4200, vib: 1 }); tone(1500, 0.3, 'sawtooth', 0.04, 3000, 0.04); tone(1250, 0.26, 'sawtooth', 0.06, 2200, 0.46, { lp: 4000 }); noise(0.15, 0.08, 5000, 0.02, 'highpass'); },
  quetz() { duck(0.6, 0.3); tone(560, 0.7, 'sawtooth', 0.1, 1500, 0, { lp: 2600, vib: 1 }); tone(280, 0.7, 'sawtooth', 0.06, 700, 0, { lp: 1500 }); noise(0.4, 0.14, 3000, 0.05, 'bandpass'); tone(900, 0.3, 'sawtooth', 0.06, 500, 0.7, { lp: 2400 }); },
  stego() { tone(85, 0.26, 'square', 0.12, 55, 0, { lp: 320 }); noise(0.2, 0.22, 520); tone(78, 0.28, 'square', 0.11, 50, 0.34, { lp: 300 }); noise(0.22, 0.2, 480, 0.34); },
  mammoth() { duck(0.55, 0.5); tone(380, 0.95, 'sawtooth', 0.12, 640, 0, { att: 0.07, lp: 2300, vib: 1 }); tone(380, 0.95, 'square', 0.04, 640, 0, { lp: 1500 }); noise(0.5, 0.12, 1300); tone(520, 0.45, 'sawtooth', 0.1, 300, 0.75, { lp: 2000 }); },
  anky() { noise(0.28, 0.32, 760); tone(100, 0.22, 'sine', 0.15, 58); tone(70, 0.28, 'square', 0.13, 38, 0.4); noise(0.22, 0.3, 320, 0.4); for (let i = 0; i < 4; i++) noise(0.03, 0.12, 3800, 0.62 + i * 0.05, 'highpass'); },
  ichthyo() { tone(2200, 0.26, 'sine', 0.07, 3300); tone(3100, 0.22, 'sine', 0.06, 2000, 0.28); for (let i = 0; i < 5; i++) noise(0.015, 0.13, 4600, 0.58 + i * 0.05, 'highpass'); },
  mosa() { duck(0.6, 0.3); tone(75, 0.75, 'sawtooth', 0.12, 52, 0, { lp: 320, vib: 1 }); noise(0.5, 0.2, 420); for (let i = 0; i < 4; i++) { const f = 300 + (i * 190) % 400; tone(f, 0.08, 'sine', 0.07, f * 1.8, 0.35 + i * 0.07); } },
  plesio() { tone(260, 1.15, 'sine', 0.08, 430, 0, { vib: 1, att: 0.15 }); tone(410, 0.95, 'sine', 0.06, 230, 0.22, { att: 0.1, vib: 1 }); for (let i = 0; i < 3; i++) { const f = 500 + i * 180; tone(f, 0.07, 'sine', 0.06, f * 1.8, 0.9 + i * 0.06); } },
  archelon() { noise(0.55, 0.2, 950); tone(130, 0.5, 'triangle', 0.1, 95, 0.05, { lp: 520 }); noise(0.4, 0.14, 700, 0.5); tone(110, 0.3, 'triangle', 0.09, 80, 0.55, { lp: 400 }); },
  ammonite() { for (let i = 0; i < 6; i++) { const f = 450 + (i * 173) % 500; tone(f, 0.07, 'sine', 0.07, f * 1.8, i * 0.07); } tone(300, 0.06, 'square', 0.06, 150, 0.55); tone(260, 0.06, 'square', 0.06, 130, 0.65); },
  archaeo() { for (let i = 0; i < 4; i++) tone(2300 + i * 120, 0.07, 'sine', 0.075, 3500, i * 0.11); noise(0.2, 0.07, 6000, 0.5, 'highpass'); tone(1900, 0.2, 'sawtooth', 0.04, 1500, 0.5, { lp: 3000 }); },
  theriz() { tone(150, 0.75, 'triangle', 0.13, 104, 0, { vib: 1, lp: 720 }); tone(110, 0.55, 'sawtooth', 0.07, 78, 0.15, { lp: 420 }); for (let i = 0; i < 3; i++) noise(0.025, 0.2, 4200, 0.75 + i * 0.09, 'highpass'); },
  chicken() { for (let i = 0; i < 3; i++) { tone(540 - i * 40, 0.09, 'square', 0.07, 380, i * 0.15, { lp: 1900 }); noise(0.04, 0.06, 2000, i * 0.15, 'highpass'); } tone(430, 0.34, 'sawtooth', 0.08, 780, 0.55, { lp: 2300, vib: 1 }); },
  polar() { tone(540, 0.3, 'sawtooth', 0.09, 300, 0, { lp: 2100 }); tone(800, 0.2, 'triangle', 0.05, 420, 0.04); tone(480, 0.2, 'sawtooth', 0.08, 280, 0.34, { lp: 1900 }); },
  feather() { for (let i = 0; i < 6; i++) tone(1900 + (i % 2) * 450, 0.05, 'sine', 0.065, 2700, i * 0.065); noise(0.3, 0.09, 6500, 0, 'highpass'); },
  steps() { for (let i = 0; i < 3; i++) { tone(95, 0.24, 'sine', 0.22, 42, i * 0.34); noise(0.2, 0.32, 270, i * 0.34); } },
  eggs() { noise(0.05, 0.3, 3600, 0, 'highpass'); tone(900, 0.07, 'triangle', 0.09, 500); noise(0.05, 0.3, 3600, 0.22, 'highpass'); tone(840, 0.07, 'triangle', 0.09, 460, 0.22); tone(1500, 0.14, 'sine', 0.1, 2300, 0.6); tone(1700, 0.12, 'sine', 0.08, 2500, 0.78); },
  meteor() { noise(0.7, 0.2, 3200); tone(900, 0.6, 'sawtooth', 0.04, 120, 0, { lp: 2600 }); duck(0.4, 0.7); tone(70, 0.7, 'sine', 0.2, 28, 0.58); noise(0.55, 0.26, 300, 0.58); },
  trees() { noise(1.0, 0.15, 900); noise(1.0, 0.1, 1700, 0.15); tone(160, 0.5, 'triangle', 0.05, 140, 0.1, { lp: 400 }); [1568, 1976, 2349, 1976].forEach((f, i) => tone(f, 0.3, 'sine', 0.05, null, 0.5 + i * 0.1)); },
};
const VOICE_OF = ['rex', 'trike', 'sauro', 'ammonite', 'archelon', 'steps', 'raptor', 'ptero', 'stego', 'ichthyo', 'mosa', 'plesio', 'mammoth', 'anky', 'eggs', 'quetz', 'archaeo', 'theriz', 'spino', 'chicken', 'meteor', 'trees', 'polar', 'feather']; // FACTS order
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
  if (G.overlay) return 0; // riddle, results, pause and retry screens get the calm version
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
  if (scene === 'candles') { o.vol = 0.5; return o; } // the song steps back for the candle chimes
  if (scene !== 'play' || !G) return o;
  const ov = G.overlay;
  if (ov && ov.type !== 'riddle') { o.vol = ov.type === 'pause' || ov.type === 'complete' ? 0.25 : 0; return o; }
  if (!G.endless && !G.boss && G.L && G.p.wx > 200 + (G.L.gateX - 200) * 0.86) o.lift = 2;
  o.danger = G.p.hearts === 1;
  if (ov) { o.vol = ov.solved ? 0.7 : 0.4; o.think = !ov.solved; o.danger = false; } // riddle: the song steps back, soft celesta notes carry the thinking
  else if (G.atGate && !G.gateOpening) o.vol = 0.65; // the build-up to the riddle
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
    if (o.think && !m.epic && i % 4 === 0 && (mus.bar * 4 + i / 4) % 3 !== 2) { // riddle: sparse celesta, a slow wandering line on the song's scale
      const k = [0, 2, 1, 3, 2, 4, 3, 1][(mus.bar * 4 + i / 4) % 8], f = rt * 2 * Math.pow(2, (sc[k % 5] + 12) / 12);
      tone(f, st * 5, 'sine', 0.07, null, d, { att: 0.008 }); tone(f * 2, st * 2.5, 'sine', 0.022, null, d); tone(f * 3, st, 'sine', 0.008, null, d);
    }
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
