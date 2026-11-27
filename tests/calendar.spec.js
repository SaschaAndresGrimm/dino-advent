const { test, expect } = require('./helpers');

// Freeze "now" in the page so the calendar logic can be tested for any date.
const mockDate = (page, iso) => page.addInitScript(iso => {
  const fixed = new Date(iso).getTime(), Real = Date;
  class Fake extends Real { constructor(...a) { if (a.length === 0) super(fixed); else super(...a); } static now() { return fixed; } }
  window.Date = Fake;
}, iso);
const click = (page, x, y) => page.mouse.click(x, y); // the viewport is 960x540 = logical size

for (const [iso, open] of [['2026-11-25T10:00:00', 0], ['2026-12-01T08:00:00', 1], ['2026-12-09T20:00:00', 9], ['2026-12-24T09:00:00', 24], ['2026-12-31T23:00:00', 24], ['2027-01-05T09:00:00', 24]]) {
  test(`calendar: on ${iso.slice(0, 10)} ${open} door(s) are open`, async ({ game, page }) => {
    await mockDate(page, iso); await game.open();
    expect(await game.eval(() => window.__dino.adventDay())).toBe(open);
  });
}

test('calendar: a closed door stays closed, an open door shows today\'s gift and then starts the level', async ({ game, page }) => {
  await mockDate(page, '2026-12-03T09:00:00'); await game.open();
  await game.eval(() => window.__dino.go('map')); await page.waitForTimeout(300);
  await click(page, 34 + 3 * 112 + 50, 96 + 40);                    // door 4: not yet
  expect(await game.eval(() => window.__dino.scene)).toBe('map');
  await click(page, 34 + 2 * 112 + 50, 96 + 40);                    // door 3: opens with a gift (fire colour green)
  await page.waitForTimeout(1300);
  expect(await game.eval(() => window.__dino.save.gifts)).toEqual([3]);
  expect(await game.eval(() => window.__dino.save.owned.fire.length)).toBe(2);
  expect(await game.eval(() => window.__dino.scene)).toBe('map');   // the reveal waits for the button
  await click(page, 609, 454);                                       // "Los geht's!"
  expect(await game.eval(() => [window.__dino.scene, window.__dino.G.li])).toEqual(['play', 2]);
  // days that were missed stay playable: door 1 starts right away (its gift is only shown the first time)
  await game.eval(() => window.__dino.go('map')); await page.waitForTimeout(300);
  await click(page, 34 + 50, 96 + 40); await page.waitForTimeout(1300); await click(page, 609, 454);
  expect(await game.eval(() => [window.__dino.scene, window.__dino.G.li])).toEqual(['play', 0]);
  await game.eval(() => window.__dino.go('map')); await page.waitForTimeout(300);
  await click(page, 34 + 50, 96 + 40);                               // second time: no overlay, straight into the level
  expect(await game.eval(() => window.__dino.scene)).toBe('play');
  expect(game.errors).toEqual([]);
});

test('gifts: every day has a different gift, opening twice gives nothing twice, amber gifts add up', async ({ game }) => {
  await game.open({ amber: 0 });
  const r = await game.eval(() => { const d = window.__dino, seen = new Set(); let none = 0; for (let day = 1; day <= 24; day++) { const g = d.giftFor(day); if (!g) none++; else seen.add(g.key + ':' + (g.i != null ? g.i : g.n + '-' + day)); } for (let day = 1; day <= 24; day++) d.openDoorGift(day); const once = JSON.stringify(d.save.owned) + d.save.amber; for (let day = 1; day <= 24; day++) d.openDoorGift(day); return { none, unique: seen.size, same: once === JSON.stringify(d.save.owned) + d.save.amber, amber: d.save.amber, skins: d.save.owned.skin.length, hats: d.save.owned.hat.length, fires: d.save.owned.fire.length }; });
  expect(r).toEqual({ none: 0, unique: 24, same: true, amber: 350, skins: 1 + 6, hats: 1 + 11, fires: 1 + 4 }); // the free starter item plus the gifts
});

test('parent mode: a long press on the title lets a parent set the day', async ({ game, page }) => {
  await mockDate(page, '2026-11-25T10:00:00'); await game.open();
  await game.eval(() => window.__dino.go('map')); await page.waitForTimeout(300);
  expect(await game.eval(() => window.__dino.adventDay())).toBe(0);
  await page.mouse.move(100, 30); await page.mouse.down(); await page.waitForTimeout(1700); await page.mouse.up();
  await page.waitForTimeout(200);
  await click(page, 605, 196); await click(page, 605, 196); await click(page, 605, 196);   // "+" three times
  expect(await game.eval(() => window.__dino.adventDay())).toBe(3);
  await click(page, 480, 252);                                                              // open all doors
  expect(await game.eval(() => window.__dino.adventDay())).toBe(24);
  await click(page, 480, 298);                                                              // back to the device date
  expect(await game.eval(() => window.__dino.adventDay())).toBe(0);
});

test('the URL parameter ?day=N opens N doors (handy for testing)', async ({ game, page }) => {
  await page.addInitScript(() => { try { history.replaceState(null, '', '/?day=11'); } catch (e) {} });
  await page.goto('/?day=11'); await page.waitForFunction(() => window.__dino);
  expect(await page.evaluate(() => window.__dino.adventDay())).toBe(11);
});

test('endless run works in all 8 themes', async ({ game, page }) => {
  await game.open();
  for (let wi = 0; wi < 8; wi++) { await game.eval(wi => { window.__dino.startLevel(wi, true); window.__dino.G.startT = 0; }, wi); await page.waitForTimeout(700); }
  expect(game.errors).toEqual([]);
});

test('finishing day 24 leads to the ending, which marks the game as finished', async ({ game, page }) => {
  await game.open({ finished: false });
  await game.start(23);
  await game.eval(() => { const G = window.__dino.G; G.atGate = true; G.gateOpening = true; G.gateOpen = 1; G.stopped = false; G.p.wx = G.L.gateX - 100; G.bossStarted = true; G.bossDone = true; });
  await page.waitForFunction(() => window.__dino.G.overlay && window.__dino.G.overlay.type === 'complete');
  await page.waitForTimeout(300);
  await click(page, 480, 453);   // the reveal is still running: this tap only skips ahead
  await page.waitForTimeout(500);
  await click(page, 480, 453);   // "Weiter!"
  expect(await game.eval(() => window.__dino.scene)).toBe('ending');
});

test('parent mode: "Alles löschen" needs two taps and then starts from scratch', async ({ game, page }) => {
  await game.open({ amber: 123 });
  await game.eval(() => window.__dino.go('map')); await page.waitForTimeout(300);
  await page.mouse.move(100, 30); await page.mouse.down(); await page.waitForTimeout(1700); await page.mouse.up();
  await page.waitForTimeout(200);
  await click(page, 400, 470);                                                              // first tap only arms it
  expect(await game.eval(() => window.__dino.save.amber)).toBe(123);
  await page.evaluate(() => window.addEventListener('beforeunload', () => sessionStorage.setItem('keysAtReload', JSON.stringify(Object.keys(localStorage)))));
  await Promise.all([page.waitForNavigation(), click(page, 400, 470)]);                     // second tap wipes and reloads
  await page.waitForFunction(() => window.__dino);
  // (the test helper re-seeds the save after the reload, so check what was left in storage at the moment of the reload)
  expect(JSON.parse(await page.evaluate(() => sessionStorage.getItem('keysAtReload'))).filter(k => k.indexOf('olisDinoRettung') === 0)).toEqual([]);
});
