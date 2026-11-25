const { test: base, expect } = require('@playwright/test');

const KEY = 'olisDinoRettung.v1';
// Everything learned, so the tutorial coach never freezes the game.
const BASE_SAVE = { rexName: 'Rexi', unlocked: 3, tutorialDone: true, learned: { duck: 1, stomp: 1, fire: 1 }, finished: true, candles: 4, storySeen: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i + 1, 1])), oliName: 'Oli', fabioName: 'Fabio' };

const test = base.extend({
  // opens the game with a given save and collects page errors
  game: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const game = {
      errors,
      async open(save = {}) {
        await page.addInitScript(([k, s]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(s)); }, [KEY, { ...BASE_SAVE, ...save }]);
        await page.goto('/');
        await page.waitForFunction(() => window.__dino);
        await page.evaluate(() => window.__dino.go('title')); // tests skip the tap-to-start splash
      },
      // start a level with the coach and intro countdown skipped
      async start(wi, endless = false) {
        await page.evaluate(([wi, endless]) => {
          const d = window.__dino; d.startLevel(wi, endless);
          const G = d.G; G.startT = 0; G.coach = null; G.L.coach.forEach(c => (c.done = true));
        }, [wi, endless]);
      },
      eval: (fn, arg) => page.evaluate(fn, arg),
    };
    await use(game);
  },
});

// A fake Web Audio API so tests can run the music engine and count the notes it schedules.
const FAKE_AUDIO = () => {
  window.__tones = 0; window.__noises = 0;
  const P = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
  window.AudioContext = class {
    constructor() { this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; this.state = 'running'; setInterval(() => { this.currentTime += 0.05; }, 50); }
    createOscillator() { window.__tones++; return { type: '', frequency: P(), detune: { value: 0 }, connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: P(), connect() {} }; }
    createDynamicsCompressor() { const v = () => ({ value: 0 }); return { threshold: v(), knee: v(), ratio: v(), attack: v(), release: v(), connect() {}, disconnect() {} }; }
    createBuffer(c, n) { window.__noises++; return { getChannelData() { return new Float32Array(n); } }; }
    createWaveShaper() { return { curve: null, oversample: '', connect() {} }; }
    createConvolver() { return { buffer: null, connect() {} }; }
    createStereoPanner() { return { pan: { value: 0 }, connect() {} }; }
    createBufferSource() { return { connect() {}, start() {}, stop() {}, buffer: null, loop: false }; }
    createBiquadFilter() { return { type: '', frequency: Object.assign(P(), { value: 0 }), Q: { value: 0 }, connect() {} }; }
    resume() { return Promise.resolve(); }
  };
  window.webkitAudioContext = window.AudioContext;
};
module.exports = { test, expect, KEY, FAKE_AUDIO };
