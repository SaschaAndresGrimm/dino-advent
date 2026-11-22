// Regenerates the README screenshots in docs/screenshots/.
// Usage: npm run screenshots   (needs `npx playwright install chromium` once)
const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'screenshots') + path.sep;
const PORT = 8791;
const SAVE_KEY = 'olisDinoRettung.v1'; // never rename: it is the players' save slot

// A mid-advent save: 11 doors finished, a few shop items owned.
const done = i => i < 11;
const SAVE = {
  rexName: 'Rexi', babyName: 'Mini', oliName: 'Oli', fabioName: 'Fabio',
  unlocked: 12, tutorialDone: true, finished: false, amber: 240,
  learned: { duck: 1, stomp: 1, fire: 1, dash: 1, swim: 1, glide: 1 },
  lvDone: Array.from({ length: 24 }, (_, i) => (done(i) ? 1 : 0)),
  lvE: Array.from({ length: 24 }, (_, i) => (done(i) ? [1, 1, 0] : [0, 0, 0])),
  lvM: Array.from({ length: 24 }, (_, i) => (done(i) ? [1, 1, i % 2] : [0, 0, 0])),
  gifts: Array.from({ length: 12 }, (_, i) => i + 1),
  storySeen: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i + 1, 1])),
  owned: { skin: [0, 1, 2], hat: [0, 1, 2, 3], fire: [0, 1] },
};

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1000));
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.error('page error:', e.message));
    await page.addInitScript(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SAVE_KEY, SAVE]);
    await page.goto(`http://localhost:${PORT}/?day=12`);
    await page.waitForFunction(() => window.__dino);
    await page.waitForTimeout(1500);

    const shot = async name => { await page.screenshot({ path: `${OUT}${name}.png` }); console.log('wrote', name); };
    const scene = async (name, wait = 1800) => { await page.evaluate(n => window.__dino.go(n), name); await page.waitForTimeout(wait); };
    // Short waits only: after a few seconds headless Chromium trips the low-power toast.
    const level = async (li, name, ms, pre) => {
      await page.evaluate(i => {
        const d = window.__dino; d.startLevel(i);
        d.G.startT = 0; d.G.coach = null; d.G.L.coach.forEach(c => { c.done = true; });
      }, li);
      if (pre) await page.evaluate(pre);
      await page.waitForTimeout(ms);
      await shot(name);
    };

    await scene('title'); await shot('title');
    await scene('map'); await shot('calendar');
    await level(1, 'jungle', 3500, () => { window.__dino.G.p.wx += 900; });
    await level(8, 'canyon', 3500, () => { window.__dino.G.p.wx += 700; });
    await level(10, 'underwater', 3500, () => { window.__dino.G.p.wx += 700; });
    await level(5, 'boss', 2600, () => { const d = window.__dino; d.G.p.wx = d.G.L.bossX; });
    await scene('shop', 1500); await shot('shop');
    await page.evaluate(() => window.__dino.bookOpen(-1));
    await scene('book', 1500); await shot('dino-book');
  } finally {
    await browser.close();
    server.kill();
  }
})();
