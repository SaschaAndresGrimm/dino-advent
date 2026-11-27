const { test, expect } = require('./helpers');

// Advent candles: Rex lights one candle on day 1 (the 1st Advent fell before the calendar opens) and on the Sundays 6, 13 and 20 Dec.
const state = game => game.eval(() => { const d = window.__dino; return { scene: d.scene, phase: d.C && d.C.phase, k: d.C && d.C.k, talk: !!d.dialog, candles: d.save.candles, amber: d.save.amber }; });
// plays one ceremony from its first frame to the map (taps through Götti's lines, taps for the spark, presses "Weiter")
async function ceremony(game, page, k) { // k: stop as soon as another candle's ceremony has taken over (missed Sundays chain)
  for (let i = 0; i < 80; i++) {
    const s = await state(game);
    if (s.scene !== 'candles' || (k != null && s.k !== k)) return;
    if (s.talk) await page.mouse.click(480, 270);
    else if (s.phase === 'wait') await page.mouse.click(480, 300);
    else if (s.phase === 'done') await page.mouse.click(480, 500);
    await page.waitForTimeout(150);
  }
  throw new Error('ceremony did not finish: ' + JSON.stringify(await state(game)));
}
const due = (game, day) => game.eval(d => { window.__dino.save.dayOverride = d; return window.__dino.candlesDue(); }, day);

test('candles: due on day 1 and the Sundays 6, 13 and 20, nothing before the calendar starts', async ({ game }) => {
  await game.open();
  const got = []; for (const d of [0, 1, 5, 6, 12, 13, 19, 20, 24]) got.push(await due(game, d));
  expect(got).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
});

test('candles: Rex lights the first candle on day 1, it pays amber and a second map visit does not repeat it', async ({ game, page }) => {
  await game.open({ candles: 0, dayOverride: 1 });
  await game.eval(() => window.__dino.go('map'));
  expect(await state(game)).toMatchObject({ scene: 'candles', k: 0, candles: 0 });
  await ceremony(game, page);
  expect(await state(game)).toMatchObject({ scene: 'map', candles: 1, amber: 25 });
  await game.eval(() => window.__dino.go('title')); await game.eval(() => window.__dino.go('map'));
  expect(await state(game)).toMatchObject({ scene: 'map', candles: 1, amber: 25 });
  expect(await game.eval(() => JSON.parse(localStorage.getItem('olisDinoRettung.v1')).candles)).toBe(1);
  expect(game.errors).toEqual([]);
});

test('candles: the lighting is saved the moment the flame appears; the 4th candle pays 50', async ({ game, page }) => {
  await game.open({ candles: 3, dayOverride: 20, amber: 100 });
  await game.eval(() => window.__dino.go('map'));
  expect(await state(game)).toMatchObject({ scene: 'candles', k: 3 });
  for (let i = 0; i < 60 && (await state(game)).phase !== 'wait'; i++) { if ((await state(game)).talk) await page.mouse.click(480, 270); await page.waitForTimeout(150); }
  await page.mouse.click(480, 300);
  await page.waitForFunction(() => window.__dino.C.phase === 'lit', null, { timeout: 4000 });
  expect(await game.eval(() => JSON.parse(localStorage.getItem('olisDinoRettung.v1')).candles)).toBe(4);
  expect((await state(game)).amber).toBe(150);
  await ceremony(game, page);
  expect(await state(game)).toMatchObject({ scene: 'map', candles: 4 });
});

test('candles: missed Sundays are caught up one candle at a time, never more than are due', async ({ game, page }) => {
  await game.open({ candles: 0, dayOverride: 13 });
  await game.eval(() => window.__dino.go('map'));
  for (const k of [0, 1, 2]) { expect(await state(game)).toMatchObject({ scene: 'candles', k }); await ceremony(game, page, k); }
  expect(await state(game)).toMatchObject({ scene: 'map', candles: 3, amber: 75 });
});

test('candles: no ceremony when every due candle already burns, and a bad saved value is repaired', async ({ game }) => {
  await game.open({ candles: 2, dayOverride: 9 });
  await game.eval(() => window.__dino.go('map'));
  expect(await state(game)).toMatchObject({ scene: 'map', candles: 2 });
  expect(await game.eval(() => [undefined, 'x', -3, 9, 2.7].map(c => window.__dino.buildSave({ lvDone: [], candles: c }).candles))).toEqual([0, 0, 0, 4, 2]);
});

test('candles: the spark also comes by itself when nobody taps, and it waits for a running dialog', async ({ game, page }) => {
  await game.open({ candles: 0, dayOverride: 6, afterNew: 6 }); // day 6: Götti's boss follow-up dialog plays first
  await game.eval(() => window.__dino.go('map'));
  expect((await state(game)).scene).toBe('map'); expect((await state(game)).talk).toBe(true);
  for (let i = 0; i < 40 && (await state(game)).scene === 'map'; i++) { await page.mouse.click(480, 270); await page.waitForTimeout(150); }
  expect((await state(game)).scene).toBe('tmap'); // the map-piece reveal comes before the candle
  await game.eval(() => window.__dino.go('map'));
  expect(await state(game)).toMatchObject({ scene: 'candles', k: 0 });
  for (let i = 0; i < 60 && (await state(game)).phase !== 'wait'; i++) { if ((await state(game)).talk) await page.mouse.click(480, 270); await page.waitForTimeout(150); }
  await game.eval(() => { const d = window.__dino; d.C.wt = 7; d.updateCandles(0.02); });
  expect((await state(game)).phase).toBe('spark');
  await ceremony(game, page, 0);
  expect(await state(game)).toMatchObject({ scene: 'candles', k: 1, candles: 1 }); // day 6 owes two candles: the second ceremony follows
  expect(game.errors).toEqual([]);
});

test('candles: tapping the wreath on the map replays the last candle without paying or saving anything', async ({ game, page }) => {
  await game.open({ candles: 2, dayOverride: 9, amber: 10 });
  await game.eval(() => window.__dino.go('map'));
  expect((await state(game)).scene).toBe('map');
  await page.waitForFunction(() => window.__dino.buttons.length > 0); // the buttons exist after the first drawn frame; a click before that misses the wreath
  await page.mouse.click(570, 50);
  expect(await state(game)).toMatchObject({ scene: 'candles', k: 1, candles: 2 });
  await page.waitForFunction(() => window.__dino.C.phase === 'wait', null, { timeout: 6000 }); // no dialog in a replay
  await page.mouse.click(480, 300);
  await page.waitForFunction(() => window.__dino.C.phase === 'done', null, { timeout: 8000 });
  await page.mouse.click(480, 500);
  expect(await state(game)).toMatchObject({ scene: 'map', candles: 2, amber: 10 });
  expect(game.errors).toEqual([]);
});

test('candles: the scene survives being entered without a ceremony', async ({ game, page }) => {
  await game.open();
  await game.eval(() => window.__dino.go('candles')); await page.waitForTimeout(300);
  expect((await state(game)).scene).toBe('map'); // drawCandles sends the player back instead of failing
  expect(game.errors).toEqual([]);
});
