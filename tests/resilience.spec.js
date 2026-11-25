const { test, expect, KEY } = require('./helpers');

test('a damaged save is repaired instead of crashing the game', async ({ game, page }) => {
  await game.open({ lvE: 5, lvM: 'x', lvDone: { a: 1 }, board: 'oops', learned: 3, owned: [], riddleSeen: 'a', equip: null, amber: 'lots', tTries: {}, eggs: [1], gifts: 7, dayOverride: 'x', oliName: 'Oli' });
  const s = await game.eval(() => { const d = window.__dino; return JSON.parse(JSON.stringify(d.save)); });
  expect(s.lvDone).toHaveLength(24); expect(s.lvE).toHaveLength(24); expect(s.lvM).toHaveLength(24);
  expect(s.amber).toBe(0); expect(s.dayOverride).toBeNull(); expect(Array.isArray(s.owned.skin)).toBe(true);
  expect(s.board).toHaveLength(9); expect(s.eggs[0]).toHaveLength(3);
  expect(s.oliName).toBe('Oli'); // valid fields survive
  await game.eval(() => window.__dino.go('map'));
  await game.start(0);
  await page.waitForTimeout(600);
  expect(game.errors).toEqual([]);
});

test('an unreadable save is kept as a copy before it is overwritten', async ({ game, page }) => {
  await page.addInitScript(k => localStorage.setItem(k, '{broken json'), KEY);
  await game.open();
  expect(await page.evaluate(k => localStorage.getItem(k + '.broken'), KEY)).toBe('{broken json');
  expect(await game.eval(() => window.__dino.save.lvDone.length)).toBe(24);
});

test('backup code round-trips and rejects garbage', async ({ game }) => {
  await game.open({ amber: 123, lvDone: Array(24).fill(0).map((_, i) => (i < 5 ? 1 : 0)) });
  const r = await game.eval(() => {
    const d = window.__dino, code = d.saveToCode(), back = d.codeToSave(code);
    return { prefix: code.slice(0, 6), amber: back.amber, done: back.lvDone.filter(Boolean).length, bad: [d.codeToSave('hello'), d.codeToSave('DINO1.!!!'), d.codeToSave('DINO1.' + btoa('[1,2]'))] };
  });
  expect(r).toEqual({ prefix: 'DINO1.', amber: 123, done: 5, bad: [null, null, null] });
});

test('a failing storage write is noticed but does not crash', async ({ game, page }) => {
  await game.open();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('quota'); }; window.__dino.writeSave(); });
  expect(await game.eval(() => window.__dino.saveFail)).toBe(1);
  await page.waitForTimeout(300);
  expect(game.errors).toEqual([]);
});

test('an exception in a frame does not stop the game loop', async ({ game, page }) => {
  await game.open();
  await game.start(0);
  await page.evaluate(() => { window.__frames = 0; const raf = window.requestAnimationFrame; window.requestAnimationFrame = f => raf(t => { window.__frames++; f(t); }); });
  await game.eval(() => { window.__dino.G.L = null; }); // every update and draw now throws
  await expect.poll(() => game.eval(() => window.__dino.scene), { timeout: 3000 }).toBe('map');
  const f1 = await page.evaluate(() => window.__frames);
  // liveness, not speed: under parallel load the software-rendered map can run well below 20 fps, so wait for the frames instead of counting them in a fixed window
  await expect.poll(() => page.evaluate(() => window.__frames), { timeout: 5000 }).toBeGreaterThan(f1 + 10);
  // the map is playable again
  await game.start(0);
  await page.waitForTimeout(500);
  expect(await game.eval(() => window.__dino.scene)).toBe('play');
});

test('yesterday\'s save is kept as a fallback and used when the main save is lost', async ({ game, page }) => {
  await game.open({ amber: 77 });
  await game.eval(() => { window.__dino.writeSave(); }); // first write of the day: stores the previous value as the .bak copy
  const bak = await page.evaluate(() => JSON.parse(localStorage.getItem('olisDinoRettung.v1.bak')));
  expect(JSON.parse(bak.text).amber).toBe(77);
  await page.evaluate(() => localStorage.setItem('olisDinoRettung.v1', '{broken'));
  await page.reload(); await page.waitForFunction(() => window.__dino);
  expect(await game.eval(() => window.__dino.save.amber)).toBe(77);
});

test('a freshly installed release reloads the game only at a quiet moment', async ({ game, page }) => {
  await game.open();
  await game.eval(() => { window.__marker = 1; window.__dino.go('map'); });
  await game.start(0); // in a level: must not reload
  await page.evaluate(() => { window.updateReady = true; });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__marker)).toBe(1);
  await game.eval(() => window.__dino.go('map')); // map, no overlay: reloads
  await page.waitForEvent('load', { timeout: 4000 });
  await page.waitForFunction(() => window.__dino);
  expect(await page.evaluate(() => window.__marker)).toBeUndefined();
});
