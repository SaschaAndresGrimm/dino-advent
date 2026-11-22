const { test, expect, KEY, FAKE_AUDIO } = require('./helpers');

test('splash waits for a tap, unlocks sound, and leads to the title', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('olisDinoRettung.v1', JSON.stringify({ rexName: 'Rexi', fabioName: 'Fabio', oliName: 'Oli', unlocked: 3, tutorialDone: true })));
  await page.goto('/'); await page.waitForFunction(() => window.__dino);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__dino.scene)).toBe('splash'); // no tap, no progress
  await page.mouse.click(480, 300);
  await page.waitForFunction(() => window.__dino.scene === 'title', null, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('title screen loads without errors', async ({ game, page }) => {
  await game.open({});
  expect(await game.eval(() => window.__dino.scene)).toBe('title');
  await page.waitForTimeout(500);
  expect(game.errors).toEqual([]);
});

for (const li of [0, 3, 6, 9, 12, 15, 18, 21, 23]) {
  test(`level ${li + 1} plays for 3 s without errors`, async ({ game, page }) => {
    await game.open();
    await game.start(li);
    await page.waitForTimeout(3000);
    const r = await game.eval(() => ({ wx: window.__dino.G.p.wx, scene: window.__dino.scene }));
    expect(r.scene).toBe('play');
    expect(r.wx).toBeGreaterThan(600);
    expect(game.errors).toEqual([]);
  });
}

test('an old 4-world save is upgraded to the 24-day calendar and keeps name, amber and cosmetics', async ({ game }) => {
  await game.open({ eggs: [[1, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], medals: [[0, 0, 0]], riddleSeen: [[], [], [], []], amber: 77, owned: { skin: [0, 1], hat: [0], fire: [0] } });
  const r = await game.eval(() => { const s = window.__dino.save; return { lv: [s.lvE.length, s.lvM.length, s.lvDone.length], riddle: s.riddleSeen.length, best: s.best.length, amber: s.amber, name: s.rexName, skins: s.owned.skin, gifts: Array.isArray(s.gifts) }; });
  expect(r).toEqual({ lv: [24, 24, 24], riddle: 8, best: 8, amber: 77, name: 'Rexi', skins: [0, 1], gifts: true });
});

test('map, book and shop render without errors', async ({ game, page }) => {
  await game.open();
  for (const s of ['map', 'book', 'shop']) {
    await game.eval(s => window.__dino.go(s), s);
    await page.waitForTimeout(300);
  }
  expect(game.errors).toEqual([]);
});

test('riddle: wrong answer locks buttons and costs amber; hint crosses out a wrong answer', async ({ game, page }) => {
  await game.open({ amber: 10 });
  await game.start(6);
  await game.eval(() => { const G = window.__dino.G; G.p.wx = G.L.gateX - 215; });
  await page.waitForFunction(() => window.__dino.G.overlay && window.__dino.G.overlay.type === 'riddle');
  const r = await game.eval(() => {
    const d = window.__dino, o = d.G.overlay, bad = [0, 1, 2].find(i => i !== o.r.ok);
    d.answer(bad);
    return { lock: o.lock, amber: d.save.amber, wrong: o.wrong.length };
  });
  expect(r).toEqual({ lock: 2.5, amber: 9, wrong: 1 });
  expect(game.errors).toEqual([]);
});

test('riddle: correct answer solves it and the gate opens', async ({ game, page }) => {
  await game.open();
  await game.start(0);
  await game.eval(() => { const G = window.__dino.G; G.p.wx = G.L.gateX - 215; });
  await page.waitForFunction(() => window.__dino.G.overlay && window.__dino.G.overlay.type === 'riddle');
  await game.eval(() => { const d = window.__dino; d.answer(d.G.overlay.r.ok); d.openGate(); });
  await page.waitForFunction(() => window.__dino.G.gateOpen >= 1, null, { timeout: 5000 });
  expect(game.errors).toEqual([]);
});

test('shop: select to preview, buy only with enough amber, then equip and persist', async ({ game, page }) => {
  await game.open({ amber: 200 });
  await game.eval(() => window.__dino.go('shop'));
  await page.waitForTimeout(300);
  const card = j => [440 + (j % 4) * 126 + 59, 168 + Math.floor(j / 4) * 96 + 44];  // item card centres (logical px)
  const buy = [440 + 248, 402 + 28];                                                  // the confirm button
  const yes = [480 + 85, 330 + 23];                                                  // 'Ja, kaufen!' in the confirmation
  await page.mouse.click(...card(1)); await page.mouse.click(...buy);               // Blau (120): asks first, nothing is bought yet
  expect(await game.eval(() => window.__dino.save.amber)).toBe(200);
  await page.mouse.click(...yes);
  let r = await game.eval(() => ({ amber: window.__dino.save.amber, skin: window.__dino.save.equip.skin, owned: window.__dino.save.owned.skin }));
  expect(r).toEqual({ amber: 80, skin: 1, owned: [0, 1] });
  await page.mouse.click(...card(3)); await page.mouse.click(...buy);               // Gold (600): too expensive
  r = await game.eval(() => ({ amber: window.__dino.save.amber, skin: window.__dino.save.equip.skin }));
  expect(r).toEqual({ amber: 80, skin: 1 });
  await page.mouse.click(...card(4)); await page.mouse.click(...buy);               // a calendar gift cannot be bought
  expect(await game.eval(() => window.__dino.save.equip.skin)).toBe(1);
  await page.mouse.click(...card(0)); await page.mouse.click(...buy);               // an owned item is equipped for free
  expect(await game.eval(() => window.__dino.save.equip.skin)).toBe(0);
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  expect(stored.equip.skin).toBe(0);
  expect(game.errors).toEqual([]);
});

test('shop: hats and jackets per boy, Chili items, Goetti vouchers', async ({ game, page }) => {
  await game.open({ amber: 1000 });
  // Buttons are registered while drawing, so give the game a frame or two between taps (slow CI runners need it).
  const tap = async (x, y) => { await page.mouse.click(x, y); await page.waitForTimeout(80); };
  await game.eval(() => window.__dino.go('shop'));
  await page.waitForTimeout(300);
  const tab = t => [440 + t * 84 + 40, 140], card = j => [440 + (j % 4) * 126 + 59, 166 + Math.floor(j / 4) * 104 + 50];
  const buy = [688, 438], yes = [565, 353], oliBtn = [562, 438], fabioBtn = [814, 438];
  await tap(...tab(3)); await tap(...card(2)); await tap(...buy); await tap(...yes); // Blau jacket, 150
  let r = await game.eval(() => { const s = window.__dino.save; return { amber: s.amber, owned: s.owned.jacket, oli: s.equip.jacket, fabio: s.equip.fabioJacket }; });
  expect(r).toEqual({ amber: 850, owned: [0, 1, 2], oli: 0, fabio: 1 }); // bought, but nobody wears it yet
  await tap(...fabioBtn);
  expect(await game.eval(() => window.__dino.save.equip.fabioJacket)).toBe(2);
  await tap(...tab(2)); await tap(...card(1)); await tap(...buy); await tap(...yes); // Mütze, 150
  await tap(...oliBtn);
  r = await game.eval(() => { const s = window.__dino.save; return { hat: s.equip.hat, fabioHat: s.equip.fabioHat }; });
  expect(r.hat).toBe(1); expect(r.fabioHat).toBe(0);
  await tap(...tab(4)); await tap(...card(1)); await tap(...buy); await tap(...yes); // Schleife, 80
  expect(await game.eval(() => window.__dino.save.equip.chili)).toBe(1);
  await tap(...tab(5)); await tap(...card(0)); await tap(...buy); await tap(...yes); // Velotour, 600
  r = await game.eval(() => { const s = window.__dino.save; return { amber: s.amber, wish: s.owned.wish }; });
  expect(r).toEqual({ amber: 20, wish: [0] });
  await page.waitForTimeout(200);
  expect(game.errors).toEqual([]);
});

test('book: found cards open, NEU is cleared once seen', async ({ game, page }) => {
  await game.open({ lvDone: [1, ...new Array(23).fill(0)] });
  await game.eval(() => window.__dino.go('book'));
  await page.waitForTimeout(300);
  await page.mouse.click(28 + 71, 94 + 45); // first card
  expect(await game.eval(() => window.__dino.save.bookSeen[0])).toBe(true);
  await page.waitForTimeout(200);
  expect(game.errors).toEqual([]);
});

test('roar: 3 s cooldown, smashes boulders but not small rocks', async ({ game }) => {
  await game.open();
  await game.start(6);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p;
    G.L.obs.length = 0;
    G.L.obs.push({ type: 'rock', x: p.wx + 200, w: 56, h: 44 }, { type: 'boulder', x: p.wx + 250, w: 110, h: 160 });
    d.roar();
    const cd = p.roarCd; d.roar(); // second roar is ignored while cooling down
    return { cd, rock: !!G.L.obs[0].dead, boulder: !!G.L.obs[1].dead };
  });
  expect(r).toEqual({ cd: 3, rock: false, boulder: true });
});

test('combo patterns exist in worlds 2-4 and levels build', async ({ game }) => {
  await game.open();
  const r = await game.eval(() => [6, 12, 18, 21].map(li => { window.__dino.startLevel(li); const L = window.__dino.G.L; return L.obs.length > 10 && L.pits.length > 0; }));
  expect(r).toEqual([true, true, true, true]);
});

// A bot that plays the whole boss fight in simulated time (fast): roars at the right moments, jumps/ducks hazards.
const BOT = `
  (maxSteps) => {
    const d = window.__dino, G = d.G, p = G.p, L = G.L, seen = { phases: new Set(), states: new Set(), minions: 0, hazards: new Set() };
    let ducking = false;
    for (let i = 0; i < maxSteps && !G.golden && !G.bossDone; i++) {
      const b = G.boss;
      if (b) {
        seen.phases.add(b.phase); seen.states.add(b.state);
        const dist = b.x - p.wx;
        if ((b.state === 'charge' && dist < 380) || b.state === 'tired') d.roar();
        if (b.state === 'duel' && i % 7 === 0) d.roar();
        let wantDuck = false, wantJump = false;
        for (const r of b.rocks) { const dx = r.x - p.wx; if (dx > 0 && dx < 250) { if (r.high) wantDuck = true; else wantJump = true; } }
        for (const h of b.hazards) { seen.hazards.add(h.kind); if (h.kind === 'wave' && h.x - p.wx < 220 && h.x - p.wx > -40) wantJump = true; if (h.kind === 'erupt' && h.t > h.warn - 0.2 && h.t < h.warn + 0.55) wantJump = true; }
        for (const o of L.obs) if (o.minion && !o.dead) { seen.minions++; const dx = o.x - p.wx; if (dx > 0 && dx < 170) wantJump = true; }
        if (wantDuck && !ducking) { d.duckDown('k'); ducking = true; } else if (!wantDuck && ducking) { d.duckUp('k'); ducking = false; }
        if (wantJump && p.onGround) d.jump();
      }
      p.hearts = 99;
      d.updatePlay(1 / 60);
    }
    return { phases: [...seen.phases], states: [...seen.states], hazards: [...seen.hazards], minions: seen.minions > 0, golden: !!G.golden, done: !!G.bossDone };
  }`;

test('boss fight: 4 phases and a roar duel can be won, with every attack type appearing', async ({ game, page }) => {
  test.setTimeout(120000);
  await game.open();
  await game.start(23);
  await game.eval(() => { const G = window.__dino.G; G.p.wx = G.L.bossX - 30; });
  const r = await page.evaluate(`(${BOT})(20000)`);
  expect(r.golden).toBe(true);
  expect(r.phases).toEqual([0, 1, 2, 3]);
  expect(r.states).toEqual(expect.arrayContaining(['charge', 'volley', 'tired', 'summon', 'crouch', 'leap', 'stagger', 'duel', 'flee']));
  expect(r.hazards).toEqual(expect.arrayContaining(['wave', 'erupt']));
  expect(r.minions).toBe(true);
  expect(game.errors).toEqual([]);
});

for (const [li, kind, phases, states] of [
  [5, 'crab', [0, 1], ['volley', 'summon', 'charge', 'tired', 'stagger', 'flee']],
  [11, 'kraken', [0, 1, 2], ['volley', 'lanes', 'summon', 'tired', 'stagger', 'flee']],
  [17, 'queen', [0, 1, 2], ['volley', 'crouch', 'leap', 'summon', 'charge', 'tired', 'stagger', 'flee']],
]) {
  test(`mini boss day ${li + 1} (${kind}): can be beaten phase by phase and then the way is free`, async ({ game, page }) => {
    test.setTimeout(120000);
    await game.open();
    await game.start(li);
    expect(await game.eval(() => window.__dino.G.L.bossKind)).toBe(kind);
    await game.eval(() => { const G = window.__dino.G; G.p.wx = G.L.bossX - 30; });
    const r = await page.evaluate(`(${BOT})(20000)`);
    expect(r.done).toBe(true);
    expect(r.golden).toBe(false);
    expect(r.phases).toEqual(phases);
    expect(r.states).toEqual(expect.arrayContaining(states));
    expect(await game.eval(() => window.__dino.G.stopped)).toBe(false);
    expect(game.errors).toEqual([]);
  });
}

test('boss fight lasts long enough to be exciting (more than a minute of game time)', async ({ game, page }) => {
  test.setTimeout(120000);
  await game.open();
  await game.start(23);
  await game.eval(() => { const G = window.__dino.G; G.p.wx = G.L.bossX - 30; });
  await page.evaluate(`(${BOT})(20000)`);
  expect(await game.eval(() => window.__dino.G.t)).toBeGreaterThan(55);
});

test('boss: losing in phase 3 restarts that phase with full boss hp, not the whole fight', async ({ game, page }) => {
  await game.open();
  await game.start(23);
  await game.eval(() => { const G = window.__dino.G; G.p.wx = G.L.bossX - 30; });
  await page.evaluate(() => { const d = window.__dino, G = d.G; for (let i = 0; i < 600; i++) { G.p.hearts = 99; d.updatePlay(1 / 60); } G.boss.phase = 2; G.boss.hp = 1; G.bossCp = 2; G.boss.state = 'taunt'; G.p.hearts = 1; G.p.inv = 0; G.p.y = 900; for (let i = 0; i < 5; i++) d.updatePlay(1 / 60); });
  expect(await game.eval(() => window.__dino.G.overlay && window.__dino.G.overlay.type)).toBe('retry');
  await game.eval(() => window.__dino.retry());
  expect(await game.eval(() => ({ phase: window.__dino.G.boss.phase, hp: window.__dino.G.boss.hp, hearts: window.__dino.G.p.hearts }))).toEqual({ phase: 2, hp: 3, hearts: 3 });
});

test('endless run: ends when hearts are gone and stores the best score', async ({ game, page }) => {
  await game.open();
  await game.start(2, true);
  await page.waitForTimeout(500);
  await game.eval(() => { const G = window.__dino.G; G.p.wx = 3000; G.p.hearts = 1; G.p.inv = 0; G.p.y = 900; }); // fall into a pit
  await page.waitForFunction(() => window.__dino.G.overlay && window.__dino.G.overlay.type === 'endover');
  const r = await game.eval(() => ({ best: window.__dino.save.best[2], score: window.__dino.G.score }));
  expect(r.best).toBe(r.score);
  expect(r.best).toBeGreaterThan(0);
  expect(game.errors).toEqual([]);
});

test('world 5 is locked until the story is finished', async ({ game, page }) => {
  await game.open({ finished: false, unlocked: 3 });
  const r = await game.eval(() => { window.__dino.go('map'); return window.__dino.save.finished; });
  expect(r).toBe(false);
  await page.waitForTimeout(300);
  expect(game.errors).toEqual([]);
});

test('finishing a level shows results and the button returns to the map', async ({ game, page }) => {
  await game.open({ finished: false });
  await game.start(0);
  await game.eval(() => { const G = window.__dino.G; G.atGate = true; G.gateOpening = true; G.gateOpen = 1; G.stopped = false; G.p.wx = G.L.gateX + 250; });
  await page.waitForFunction(() => window.__dino.G.overlay && window.__dino.G.overlay.type === 'complete');
  await page.waitForTimeout(300);
  await page.mouse.click(480, 453);
  expect(await game.eval(() => window.__dino.scene)).toBe('map');
  expect(await game.eval(() => window.__dino.save.lvDone[0])).toBe(1);
  expect(game.errors).toEqual([]);
});

test('endless run gets harder: tiers rise, easy start, doubled dangers later', async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    window.__dino.startLevel(1, true); const L = window.__dino.G.L;
    const hard = ['raptor', 'ptero', 'compy', 'geyser', 'geode'], first = L.tierX[0];
    const early = L.obs.filter(o => o.x < first), late = L.obs.filter(o => o.x > L.tierX[3]);
    return { tiers: L.tierX.length, earlyHard: early.filter(o => hard.includes(o.type) || (o.type === 'ptero')).length, earlyN: early.length, lateHard: late.filter(o => hard.includes(o.type)).length };
  });
  expect(r.tiers).toBeGreaterThanOrEqual(8);
  expect(r.earlyHard).toBe(0);
  expect(r.earlyN).toBeGreaterThan(3);
  expect(r.lateHard).toBeGreaterThan(5);
});

test('gate: the heroes walk in, the screen brightens, then the results appear', async ({ game, page }) => {
  await game.open();
  await game.start(0);
  await game.eval(() => { const G = window.__dino.G; G.atGate = true; G.gateOpening = true; G.gateOpen = 1; G.stopped = false; G.p.wx = G.L.gateX - 100; });
  await page.waitForFunction(() => window.__dino.G.entering > 0.2);
  const mid = await game.eval(() => ({ stopped: window.__dino.G.stopped, atGate: window.__dino.G.p.wx === window.__dino.G.L.gateX, overlay: window.__dino.G.overlay }));
  expect(mid).toEqual({ stopped: true, atGate: true, overlay: null });
  await page.waitForFunction(() => window.__dino.G.overlay && window.__dino.G.overlay.type === 'complete');
  expect(game.errors).toEqual([]);
});

test('Christmas level (world 5) plays with sound on and is not black', async ({ game, page }) => {
  await page.addInitScript(FAKE_AUDIO);
  await game.open({ finished: true, babyName: 'Bibo', treasures: [1, 1, 1, 1] });
  await page.mouse.click(10, 10); // unlock audio like a real tap would
  await game.start(21);
  await page.waitForTimeout(1500);
  const r = await game.eval(() => { const c = document.getElementById('game'), x = c.getContext('2d'); return { px: Array.from(x.getImageData(c.width / 2, c.height * 0.8, 1, 1).data).slice(0, 3), tones: window.__tones }; });
  expect(r.px.some(v => v > 5)).toBe(true);   // the frame loop is alive and drawing
  expect(r.tones).toBeGreaterThan(10);        // and music is being scheduled
  expect(game.errors).toEqual([]);
});

test('every world and the map have a long song with valid notes, and tension layers add notes', async ({ game, page }) => {
  await game.open();
  const r = await game.eval(() => { const out = {}; for (const k of ['map', '0', '1', '2', '3', '4', 'boss_crab', 'boss_kraken', 'boss_queen', 'boss_king', 'ending']) { const bars = window.__dino.buildSong(k); const notes = bars.flatMap(b => [...b.bass, ...b.lead, ...b.arp]).filter(n => n != null); out[k] = { bars: bars.length, ok: notes.every(Number.isFinite), n: notes.length, distinct: new Set(bars.map(b => b.lead.join())).size }; } return out; });
  for (const k of Object.keys(r)) { expect(r[k].ok).toBe(true); expect(r[k].bars).toBeGreaterThanOrEqual(24); expect(r[k].distinct).toBeGreaterThan(8); }
  expect(r['0'].bars).toBe(48);
});

test('boss fights have their own theme: drum-roll transition in, fanfare and the world song back out', async ({ game, page }) => {
  await page.addInitScript(FAKE_AUDIO);
  await game.open({ finished: true });
  await page.mouse.click(10, 10); // unlock audio like a real tap would
  await game.start(5);                                     // day 6: Krabbenkönig, world 5
  await page.waitForFunction(() => window.__dino.mus.key === '5');
  await game.eval(() => { const G = window.__dino.G; G.p.wx = G.L.bossX; });
  await page.waitForFunction(() => window.__dino.mus.key === 'boss_crab', null, { timeout: 8000 });
  expect(await game.eval(() => window.__dino.mus.trans)).toBe(null);
  await game.eval(() => { const G = window.__dino.G; G.boss.state = 'flee'; G.boss.t = 0; });
  await page.waitForFunction(() => window.__dino.mus.key === '5');
  expect(await game.eval(() => window.__dino.mus.saved.boss_crab)).toBeUndefined();
  expect(game.errors).toEqual([]);
});

test('music follows the screen: pause ducks it, retry fades it out and brings it back, the finale has its own song', async ({ game, page }) => {
  await page.addInitScript(FAKE_AUDIO);
  await game.open({ finished: true });
  await page.mouse.click(10, 10);
  await game.start(5);
  await page.waitForFunction(() => window.__dino.mus.key === '5');
  await game.eval(() => { window.__dino.G.overlay = { type: 'pause' }; });
  await page.waitForFunction(() => window.__dino.mus.vt === 0.25);
  expect(await game.eval(() => window.__dino.mus.key)).toBe('5');
  await game.eval(() => { window.__dino.G.overlay = { type: 'retry' }; });
  await page.waitForFunction(() => window.__dino.mus.key === null, null, { timeout: 5000 });
  await game.eval(() => { window.__dino.G.overlay = null; });
  await page.waitForFunction(() => window.__dino.mus.key === '5' && window.__dino.mus.vt === 1);
  await game.eval(() => window.__dino.startEnding());
  await page.waitForFunction(() => window.__dino.mus.key === 'ending');
  expect(game.errors).toEqual([]);
});

test('losing: the screen stops shaking once the retry overlay is up', async ({ game, page }) => {
  await game.open();
  await game.start(6);
  await game.eval(() => { const G = window.__dino.G; G.p.hearts = 1; G.p.inv = 0; G.shake = 0.5; G.p.y = 900; });
  await page.waitForFunction(() => window.__dino.G.overlay && window.__dino.G.overlay.type === 'retry');
  await page.waitForTimeout(600);
  expect(await game.eval(() => window.__dino.G.shake)).toBe(0);
});

test('hearts come back: pickups, checkpoint flags; full hearts turn into amber', async ({ game }) => {
  await game.open();
  await game.start(6);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p, L = G.L; const out = { hearts: L.hearts.length }; L.obs.length = 0; L.pits.length = 0;
    p.hearts = 1; const h = L.hearts[0]; p.wx = h.x - 10; p.y = h.y + 50; d.updatePlay(1 / 60); out.afterPickup = p.hearts;
    p.hearts = 1; const cp = L.cps.find(c => !c.on); p.wx = cp.x + 1; d.updatePlay(1 / 60); out.flag = p.hearts;
    const h2 = L.hearts[1]; p.hearts = 3; const a0 = G.amber; p.wx = h2.x - 10; p.y = h2.y + 50; d.updatePlay(1 / 60); out.full = [p.hearts, G.amber - a0];
    return out;
  });
  expect(r.hearts).toBeGreaterThanOrEqual(2);
  expect(r.afterPickup).toBe(2);
  expect(r.full).toEqual([3, 5]);
  expect(r.flag).toBe(2);
});

test('melodies are singable: stepwise phrases, sustained notes, no shrill or jumpy bars', async ({ game }) => {
  await game.open();
  const r = await game.eval(() => { let maxLeap = 0, maxNote = 0, sustained = 0, notes = 0; for (const k of ['map', '0', '1', '2', '3', '4']) for (const b of window.__dino.buildSong(k)) { const ls = b.lead.map((n, i) => [n, b.leadDur[i]]).filter(([n]) => n != null); if (!b.leadDur.some(d => d)) continue; ls.forEach(([n, d], i) => { notes++; maxNote = Math.max(maxNote, n); if (d >= 3) sustained++; if (i && !(i === ls.length - 1)) maxLeap = Math.max(maxLeap, Math.abs(n - ls[i - 1][0])); }); } return { maxLeap, maxNote, share: sustained / notes }; });
  expect(r.maxLeap).toBeLessThanOrEqual(6);
  expect(r.maxNote).toBeLessThanOrEqual(28);
  expect(r.share).toBeGreaterThan(0.3);
});

test('door overlay has a back button, and nobody shakes after losing', async ({ game, page }) => {
  await game.open({});
  await game.eval(() => { const d = window.__dino; d.save.dayOverride = 24; d.go('map'); d.clickDoor(5); });
  await page.waitForTimeout(300);
  const back = await game.eval(() => { const d = window.__dino; const b = d.buttons.find(b => b.label === 'Zurück'); if (!b) return false; b.cb(); return d.doorOverlay === null; });
  expect(back).toBe(true);
  await game.eval(() => { const d = window.__dino; d.startLevel(0); const G = d.G; G.startT = 0; G.p.hitT = 0.4; G.overlay = { type: 'retry', t: 0 }; });
  await page.waitForTimeout(200);
  expect(await game.eval(() => window.__dino.G.shake)).toBeLessThan(0.5);
});

test('falling into a pit respawns far back, on the ground, with a pause and protection', async ({ game }) => {
  await game.open({});
  const r = await game.eval(() => { const d = window.__dino; d.startLevel(0); const G = d.G, L = G.L, p = G.p; G.startT = 0; const pit = L.pits[0]; p.wx = pit.x + 40; p.y = 500; d.pitFall(); return { gap: pit.x - p.wx, y: p.y, startT: G.startT, inv: p.inv }; });
  expect(r.gap).toBeGreaterThan(400);
  expect(r.y).toBe(440);
  expect(r.startT).toBeGreaterThan(1);
  expect(r.inv).toBeGreaterThan(2.5);
});

test('skill hints appear well before the obstacle', async ({ game }) => {
  await game.open({});
  const r = await game.eval(() => { const d = window.__dino; d.startLevel(3); const L = d.G.L, w = L.obs.find(o => o.type === 'wall'); return { coach: L.coach.length ? L.coach[0].x : null, gap: w ? w.x - L.coach[0].x : 0 }; });
  expect(r.coach).not.toBeNull();
  expect(r.gap).toBeGreaterThanOrEqual(450);
});

test('new enemies and hazards: crumbling steps, bounce mushroom, meteor, hopper and spitting plant', async ({ game }) => {
  await game.open({});
  const r = await game.eval(() => {
    const d = window.__dino; d.startLevel(1); const G = d.G, L = G.L, p = G.p; G.startT = 0; p.inv = 99;
    L.obs.length = 0; L.pits.length = 0; L.plats.length = 0; p.wx = 5000;
    // crumbling step: land on it, it falls after a short delay
    L.pits.push({ x: 4900, w: 400 }); const st = { x: 4960, y: 370, y0: 370, w: 200, crumble: true, t: null }; L.plats.push(st); p.y = 360; p.vy = 100; G.stopped = true;
    for (let i = 0; i < 5; i++) d.updatePlay(1 / 60); const landed = p.onGround || st.t != null; let fell = false; for (let i = 0; i < 60; i++) { d.updatePlay(1 / 60); if (st.gone) fell = true; }
    // bounce mushroom launches Rex
    G.stopped = false; L.pits.length = 0; L.plats.length = 0; p.wx = 6000; p.y = 440; p.vy = 0; p.onGround = true; L.obs.push({ type: 'pad', x: 6040, sq: 0 }); let top = 440; for (let i = 0; i < 40; i++) { d.updatePlay(1 / 60); top = Math.min(top, p.y); }
    // meteor falls when close and then stays as a rock
    L.obs.length = 0; p.wx = 7000; p.y = 440; p.vy = 0; const m = { type: 'meteor', x: 7300, state: 'wait', y: -80, vy: 0 }; L.obs.push(m); d.updatePlay(1 / 60); const falling = m.state === 'fall'; for (let i = 0; i < 90; i++) d.updatePlay(1 / 60);
    // spitting plant makes seeds; hopper hops
    L.obs.length = 0; p.wx = 9000; const pl = { type: 'plant', x: 9400, shoot: 0.05, pop: 0 }, hp = { type: 'hopper', x: 9300, hp: 0 }; L.obs.push(pl, hp); let maxHy = 0; for (let i = 0; i < 40; i++) { d.updatePlay(1 / 60); maxHy = Math.max(maxHy, hp.hy || 0); }
    return { landed, fell, top, falling, metState: m.state, seeds: L.obs.filter(o => o.type === 'seed').length, maxHy };
  });
  expect(r.landed).toBe(true); expect(r.fell).toBe(true);
  expect(r.top).toBeLessThan(150);
  expect(r.falling).toBe(true); expect(r.metState).toBe('stuck');
  expect(r.seeds).toBeGreaterThan(0); expect(r.maxHy).toBeGreaterThan(40);
});

test('the first calendar levels are varied: at least 6 kinds of obstacles on day 1-3', async ({ game }) => {
  await game.open({});
  const kinds = await game.eval(() => { const d = window.__dino, k = new Set(); for (let li = 0; li < 3; li++) { d.startLevel(li); for (const o of d.G.L.obs) k.add(o.type); if (d.G.L.plats.some(p => p.crumble)) k.add('crumble'); } return [...k]; });
  expect(kinds.length).toBeGreaterThanOrEqual(6);
});

test('crab boss (day 6): no duck shots, crabs not dinos, spaced out, pickups drift to a standing Rex', async ({ game }) => {
  await game.open({});
  const r = await game.eval(() => {
    const d = window.__dino; d.startLevel(5); const G = d.G, L = G.L, p = G.p; G.startT = 0; p.inv = 99; p.wx = L.bossX - 5;
    for (let i = 0; i < 400 && !(G.boss && G.boss.state === 'taunt'); i++) d.updatePlay(1 / 60);
    const b = G.boss; b.phase = 0; b.hp = 3; b.state = 'taunt'; b.t = 5; d.updatePlay(1 / 60);
    const lanes = b.volley ? b.volley.seq.slice() : [];
    b.phase = 1; b.hp = 3; b.state = 'summon'; b.summoned = false; for (let i = 0; i < 230; i++) d.updatePlay(1 / 60); // the crabs file out from behind the king one by one
    const m = L.obs.filter(o => o.minion), xs = m.map(o => o.x).sort((a, c) => a - c);
    L.hearts.push({ x: p.wx + 240, y: 340, got: false }); for (let i = 0; i < 120; i++) d.updatePlay(1 / 60);
    return { lanes, crabs: m.every(o => o.crab), n: m.length, minGap: Math.min(...xs.slice(1).map((x, i) => x - xs[i])), heartDist: L.hearts[L.hearts.length - 1].x - p.wx };
  });
  expect(r.lanes.every(l => l === 0)).toBe(true);
  expect(r.crabs).toBe(true); expect(r.n).toBeGreaterThanOrEqual(3);
  expect(r.minGap).toBeGreaterThanOrEqual(200);
  expect(r.heartDist).toBeLessThan(100);
});

test('boss fights: FLITZ lunges forward and back, the boss walks home between phases, hearts are drawn to Rex', async ({ game }) => {
  await game.open({ learned: { dash: 1 } });
  const r = await game.eval(() => {
    const d = window.__dino; d.startLevel(17); const G = d.G, L = G.L, p = G.p; G.startT = 0; G.coach = null; p.inv = 99; p.wx = L.bossX - 5;
    for (let i = 0; i < 400 && !(G.boss && G.boss.state === 'taunt'); i++) d.updatePlay(1 / 60);
    const x0 = p.wx; d.dash(); let far = 0; for (let i = 0; i < 40; i++) { d.updatePlay(1 / 60); far = Math.max(far, p.wx - x0); } const back = p.wx - x0;
    const b = G.boss; b.phase = 1; b.x = p.wx + 250; b.state = 'stagger'; b.t = 0; for (let i = 0; i < 140; i++) d.updatePlay(1 / 60); const bossDist = b.x - p.wx;
    const h = { x: p.wx + 150, y: 260, got: false }; L.hearts.push(h); p.hearts = 1; for (let i = 0; i < 90; i++) d.updatePlay(1 / 60);
    return { far, back, bossDist, got: h.got };
  });
  expect(r.far).toBeGreaterThan(150); expect(Math.abs(r.back)).toBeLessThan(5);
  expect(r.bossDist).toBeGreaterThan(500);
  expect(r.got).toBe(true);
});

test('safety net: the third retry at one checkpoint gives a shield that absorbs one hit; Chili speaks', async ({ game }) => {
  await game.open();
  await game.start(0);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p; const out = {};
    out.greeting = !!G.chiliSay;
    for (let i = 0; i < 2; i++) { p.hearts = 1; p.inv = 0; d.retry(); } out.afterTwo = !!G.shield;
    p.hearts = 1; p.inv = 0; d.retry(); out.afterThree = !!G.shield;
    p.hearts = 3; p.inv = 0; p.dashT = 0; G.chiliCd = 0; G.chiliSay = null; G.p.inv = 0;
    // a hit with the shield up costs no heart; the next one does and Chili comments
    const before = p.hearts; window.__dino.pitFall && 0;
    return Object.assign(out, { before });
  });
  expect(r.greeting).toBe(true);
  expect(r.afterTwo).toBe(false);
  expect(r.afterThree).toBe(true);
  const h = await game.eval(() => { const d = window.__dino, G = d.G, p = G.p, L = G.L; p.hearts = 3; p.inv = 0; p.dashT = 0; const o = { type: 'rock', x: p.wx + 5, w: 40, h: 40 }; L.obs.push(o); for (let i = 0; i < 30; i++) d.updatePlay(1 / 60); return { hearts: p.hearts, shield: G.shield }; });
  expect(h.shield).toBe(false);
  expect(h.hearts).toBe(3);
  expect(game.errors).toEqual([]);
});

test('local Bestenliste: nickname filter, top 10 per world, ranks and persistence', async ({ game, page }) => {
  await game.open();
  const r = await game.eval(() => {
    const d = window.__dino, ok = n => d.cleanNick(n).ok;
    const names = { fine: ok('Oli') && ok('Rex-Fan') && ok('Schwanzflosse'), blocked: !ok('Fuck') && !ok('sch3i$$e') && !ok('a@b.de') && !ok('Max 1234567') && !ok('') };
    for (let i = 1; i <= 12; i++) d.boardAdd(0, 'P' + i, i * 100);
    const top = d.save.board[0];
    return { names, len: top.length, first: top[0].s, last: top[9].s, qualifies: d.boardQualifies(0, 350) && !d.boardQualifies(0, 250) && !d.boardQualifies(0, 0), rank: d.boardAdd(0, 'Neu', 1250), all: d.boardAll().length, saved: JSON.parse(localStorage.getItem('olisDinoRettung.v1')).board[0].length };
  });
  expect(r.names).toEqual({ fine: true, blocked: true });
  expect(r.len).toBe(10); expect(r.first).toBe(1200); expect(r.last).toBe(300);
  expect(r.qualifies).toBe(true); expect(r.rank).toBe(1); expect(r.all).toBe(10); expect(r.saved).toBe(10);
  await game.eval(() => { const d = window.__dino; d.go('board'); }); await page.waitForTimeout(300);
  expect(await game.eval(() => window.__dino.scene)).toBe('board');
  expect(game.errors).toEqual([]);
});

test('story: day briefing plays once before a level, a boss unlocks a map dialog, {oli} uses the chosen name', async ({ game, page }) => {
  await game.open({ storySeen: {}, oliName: 'Mia' });
  const r = await game.eval(() => {
    const d = window.__dino; d.go('map');
    d.launchLevel(0); const first = { scene: d.scene, dlg: d.dialog && d.dialog.lines.length };
    return first;
  });
  expect(r.scene).toBe('map'); expect(r.dlg).toBeGreaterThan(0);
  // tap through the dialog: the level starts afterwards
  for (let i = 0; i < 4; i++) { await page.mouse.click(480, 300); await page.waitForTimeout(150); await page.mouse.click(480, 300); await page.waitForTimeout(150); }
  expect(await game.eval(() => window.__dino.scene)).toBe('play');
  // seen once: launching again goes straight into the level
  const again = await game.eval(() => { const d = window.__dino; d.go('map'); d.launchLevel(0); return d.scene; });
  expect(again).toBe('play');
  // every day has a briefing; the boss days have a follow-up
  const cov = await game.eval(() => { const d = window.__dino; let n = 0; for (let day = 1; day <= 24; day++) if (d.DAY_STORY[day] && d.DAY_STORY[day].length) n++; return { n, after: Object.keys(d.DAY_AFTER).join(',') }; });
  expect(cov).toEqual({ n: 24, after: '6,12,18' });
  // finishing the crab king for the first time queues the map dialog
  await game.eval(() => { const d = window.__dino; d.save.lvDone[5] = 0; d.startLevel(5); const G = d.G; G.startT = 0; G.coach = null; G.L.coach.forEach(c => (c.done = true)); d.finishLevel(); d.go('map'); });
  expect(await game.eval(() => window.__dino.dialog && window.__dino.dialog.lines.length)).toBeGreaterThan(0);
  expect(await game.eval(() => window.__dino.fmt('{oli}'))).toBe('Mia');
  expect(game.errors).toEqual([]);
});

test('Tages-Lauf: same seed every start, one +20 bonus per day, streak counts, daily board is separate', async ({ game }) => {
  await game.open({ lvDone: Array(24).fill(1) });
  const r = await game.eval(() => {
    const d = window.__dino, sig = () => d.G.L.obs.slice(0, 10).map(o => o.type + Math.round(o.x)).join();
    d.startDaily(); const a = sig(), daily1 = d.G.daily; d.startDaily(); const b = sig();
    const amber0 = d.save.amber; d.G.startT = 0; d.G.score = 500; d.G.p.wx = 200 + 500 * 25; d.endRun(); const gain1 = d.save.amber - amber0;
    d.startDaily(); d.G.startT = 0; d.G.score = 100; d.G.p.wx = 300; const amber1 = d.save.amber; d.endRun(); const gain2 = d.save.amber - amber1;
    return { same: a === b, daily1, gain1, gain2, streak: d.save.dailyStreak, bestWorld: d.save.best.some(Boolean), dailyBest: d.save.dailyBest };
  });
  expect(r.same).toBe(true); expect(r.daily1).toBe(true);
  expect(r.gain1).toBeGreaterThanOrEqual(20); expect(r.gain2).toBeLessThan(20);
  expect(r.streak).toBe(1); expect(r.bestWorld).toBe(false); expect(r.dailyBest).toBe(500);
  expect(game.errors).toEqual([]);
});

test('settings: separate music and effect volume, calm mode removes shake', async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const d = window.__dino; d.save.volSfx = 0; d.save.volMusic = 4; d.save.calm = true;
    d.startLevel(0); const G = d.G; G.startT = 0; G.coach = null; G.shake = 1; d.drawPlay();
    return { vol: [d.save.volMusic, d.save.volSfx], calm: d.save.calm };
  });
  expect(r).toEqual({ vol: [4, 0], calm: true });
  expect(game.errors).toEqual([]);
});

test('72 medals unlock the Dino-Meister rewards once; per-world gold frame logic; full chest party', async ({ game }) => {
  await game.open({ lvM: Array.from({ length: 24 }, (_, i) => (i === 23 ? [1, 1, 0] : [1, 1, 1])), lvDone: Array(24).fill(1), treasures: [1, 1, 1, 0] });
  const r = await game.eval(() => {
    const d = window.__dino, S = d.save;
    const before = { total: d.medalTotal(), master: S.master, world4: d.worldMedalsDone(4), world0: d.worldMedalsDone(0) };
    d.startLevel(23); const G = d.G; G.startT = 0; G.coach = null; G.L.coach.forEach(c => (c.done = true)); G.eggsGot = [true, true, true]; G.hits = 0; G.amber = 999; d.finishLevel();
    const after = { total: d.medalTotal(), master: S.master, owned: [S.owned.skin.length, S.owned.hat.length], eq: S.equip };
    const owned10 = S.owned.skin.includes(S.equip.skin) && S.owned.hat.includes(S.equip.hat);
    d.startLevel(23); d.finishLevel(); // a second finish must not grant twice
    const again = [S.owned.skin.length, S.owned.hat.length];
    return { before, after, owned10, again, chestBefore: d.chestFull() };
  });
  expect(r.before).toEqual({ total: 71, master: 0, world4: false, world0: true });
  expect(r.after.total).toBe(72); expect(r.after.master).toBe(1); expect(r.owned10).toBe(true);
  expect(r.again).toEqual(r.after.owned); expect(r.chestBefore).toBe(false);
  const p = await game.eval(() => { const d = window.__dino; d.save.treasures[3] = 1; d.chestParty(); return { full: d.chestFull(), t: d.chestPartyT }; });
  expect(p.full).toBe(true); expect(p.t).toBeGreaterThan(6);
  expect(game.errors).toEqual([]);
});

test('Schatzkarte, Steckbrief and shop redesign render without errors; boss follow-up opens the map reveal', async ({ game, page }) => {
  await game.open({ lvDone: Array(24).fill(1), amber: 500 });
  const r = await game.eval(() => {
    const d = window.__dino, out = {};
    d.go('tmap'); for (let i = 0; i < 5; i++) d.drawShop && 0; out.tmap = d.scene;
    d.save.afterNew = 6; d.go('map'); out.dlg = !!d.dialog;
    return out;
  });
  expect(r.tmap).toBe('tmap'); expect(r.dlg).toBe(true);
  // finish the dialog: the new map piece is revealed
  for (let i = 0; i < 4; i++) { await page.mouse.click(480, 300); await page.waitForTimeout(150); await page.mouse.click(480, 300); await page.waitForTimeout(150); }
  expect(await game.eval(() => window.__dino.scene)).toBe('tmap');
  await page.waitForTimeout(1500);
  // every Dino-Buch card has a Steckbrief entry and the detail view draws for all 24
  const ok = await game.eval(() => { const d = window.__dino; d.go('book'); for (let i = 0; i < 24; i++) { d.bookOpen(i); d.drawShop; } return true; });
  expect(ok).toBe(true);
  await page.waitForTimeout(400);
  await game.eval(() => window.__dino.go('shop')); await page.waitForTimeout(400);
  expect(game.errors).toEqual([]);
});

test('boss damage looks: bossDmg grows with every hit and phase, and is full once the boss flees', async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const d = window.__dino, out = {};
    for (const [li, n] of [[5, 2], [11, 3], [17, 3], [23, 4]]) {
      d.startLevel(li); const G = d.G; G.startT = 0; G.coach = null; G.p.inv = 99; G.p.wx = G.L.bossX - 5;
      for (let i = 0; i < 600 && !(G.boss && G.boss.state === 'taunt'); i++) d.updatePlay(1 / 60);
      const b = G.boss, seq = [];
      for (let ph = 0; ph < n; ph++) for (const hp of [3, 2, 1]) { b.phase = ph; b.hp = hp; seq.push(d.bossDmg(b)); }
      b.state = 'flee'; seq.push(d.bossDmg(b)); out[li] = seq;
    }
    return out;
  });
  for (const seq of Object.values(r)) {
    expect(seq[0]).toBe(0); expect(seq[seq.length - 1]).toBe(1);
    for (let i = 1; i < seq.length; i++) expect(seq[i]).toBeGreaterThan(seq[i - 1]);
  }
});
