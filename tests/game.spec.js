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

test('title screen shows a build label ("dev" locally)', async ({ game }) => {
  await game.open({});
  expect(await game.eval(() => BUILD_LABEL)).toBe('dev');
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
    const first = { lock: o.lock, amber: d.save.amber, wrong: o.wrong.length };   // the first miss is free and short
    const bad2 = [0, 1, 2].find(i => i !== o.r.ok && i !== bad); d.answer(bad2);
    return { first, amber2: d.save.amber, wrong: o.wrong.length };                // the second one costs one amber
  });
  expect(r).toEqual({ first: { lock: 1, amber: 10, wrong: 1 }, amber2: 9, wrong: 2 });
  expect(game.errors).toEqual([]);
});

test('riddle: the gate builds up (runes light, camera nudges, music thinks) before the tablet drops in', async ({ game, page }) => {
  await game.open();
  await game.start(0);
  await game.eval(() => { const G = window.__dino.G; G.p.wx = G.L.gateX - 215; });
  await page.waitForFunction(() => window.__dino.G.atGate);
  const early = await game.eval(() => { const G = window.__dino.G; return { overlay: G.overlay, stopped: G.stopped }; });
  expect(early).toEqual({ overlay: null, stopped: true });                           // build-up first, no instant popup
  await page.waitForFunction(() => window.__dino.G.overlay && window.__dino.G.overlay.type === 'riddle');
  const r = await game.eval(() => { const G = window.__dino.G; return { step: G.gateStep, glow: G.gateGlow > 0.5, nudge: G.nudge > 20 }; });
  expect(r).toEqual({ step: 3, glow: true, nudge: true });
  await page.waitForTimeout(800);
  expect(await game.eval(() => window.__dino.buttons.length > 3)).toBe(true);        // answers are tappable once the tablet has landed
  expect(game.errors).toEqual([]);
});

test('riddle: difficulty follows the day (first level easy, boss and treasure days hard)', async ({ game, page }) => {
  for (const [day, want] of [[1, [1]], [2, [1, 2]], [3, [3]], [6, [3]], [9, [3]]]) {
    await game.open({});
    await game.start(day - 1);
    const d = await game.eval(() => { const d = window.__dino; const out = []; for (let k = 0; k < 40; k++) { d.openRiddle(); out.push(d.G.overlay.r.d); } return out; });
    for (const x of d) expect(want, 'day ' + day).toContain(x);
  }
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

test('shop: Europa-Park voucher costs 2500 and opens its card', async ({ game, page }) => {
  await game.open({ amber: 2700 });
  const tap = async (x, y) => { await page.mouse.click(x, y); await page.waitForTimeout(80); };
  await game.eval(() => window.__dino.go('shop'));
  await page.waitForTimeout(300);
  await tap(440 + 5 * 84 + 40, 140); await tap(440 + 3 * 126 + 59, 166 + 50); await tap(688, 438); await tap(565, 353);
  const r = await game.eval(() => { const s = window.__dino.save; return { amber: s.amber, wish: s.owned.wish }; });
  expect(r).toEqual({ amber: 200, wish: [3] });
  await page.waitForTimeout(200);
  expect(game.errors).toEqual([]);
});

test('map: Dino-Buch badge counts unread cards and clears when opened', async ({ game, page }) => {
  await game.open({ lvDone: [1, 1, ...new Array(22).fill(0)] });
  expect(await game.eval(() => window.__dino.bookUnread())).toBe(2);
  await game.eval(() => window.__dino.go('book'));
  await page.waitForTimeout(300);
  await page.mouse.click(28 + 71, 94 + 45); // first card
  expect(await game.eval(() => window.__dino.bookUnread())).toBe(1);
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

test('walking enemies turn round at a pit instead of crossing it', async ({ game }) => {
  await game.open();
  await game.start(6);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p, out = {};
    G.L.obs.length = 0; G.L.pits.length = 0; G.L.pits.push({ x: p.wx + 400, w: 140 }); p.inv = 99; G.startT = 0;
    for (const type of ['raptor', 'compy', 'hopper']) G.L.obs.push({ type, x: p.wx + 700, w: 56, h: 60, spd: 120, ph: 0, hp: 0, alpha: 1 });
    let min = 1e9; for (let i = 0; i < 360; i++) { d.updatePlay(1 / 60); for (const o of G.L.obs) if (!o.dead) min = Math.min(min, o.x); }
    out.min = min - (p.wx + 540); out.dirs = G.L.obs.map(o => o.dir);
    return out;
  });
  expect(r.min).toBeGreaterThan(-4); // nobody got past the edge of the pit (right side at +540)
  expect(r.dirs).toEqual([1, 1, 1]);
});

test('roar: a press during the cooldown makes no sound and no shock wave', async ({ game }) => {
  await game.open();
  await game.start(6);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p; let n = 0; const orig = d.SFX.roar; d.SFX.roar = () => { n++; };
    G.startT = 0; p.roarCd = 0; d.roar(); const first = n; const cd = p.roarCd;
    d.roar(); d.roar(); d.SFX.roar = orig;
    return { first, after: n, same: p.roarCd === cd };
  });
  expect(r).toEqual({ first: 1, after: 1, same: true });
});

test('roar: forgiving timing (early press, late press, reach)', async ({ game }) => {
  await game.open();
  await game.start(6);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p, out = {};
    const setup = dx => { G.L.obs.length = 0; G.L.obs.push({ type: 'boulder', x: p.wx + dx, w: 110, h: 160 }); p.hearts = 4; p.inv = 0; p.roarCd = 0; p.roarT = 0; G.startT = 0; G.shield = false; };
    const run = n => { for (let i = 0; i < n; i++) d.updatePlay(1 / 60); return { dead: !!G.L.obs[0].dead, hearts: p.hearts }; };
    setup(500); d.roar(); out.early = run(40);        // pressed too early: the shock wave still catches the rock as it comes into reach
    setup(400); d.roar(); out.reach = G.L.obs[0].dead; // 400 px ahead is inside the longer reach
    setup(120); p.vy = 0; out.touch = run(4);           // touching the rock but not roaring yet: the hit is held back a moment
    setup(100); run(3); d.roar(); out.late = run(2);    // a roar just after touching still saves Rex
    setup(100); out.noRoar = run(30);                   // without a roar the rock still hurts
    setup(900); d.roar(); out.whiffCd = p.roarCd;       // nothing ahead: short cooldown, not 3 s
    setup(300); d.roar(); out.hitCd = p.roarCd;
    return out;
  });
  expect(r.whiffCd).toBeLessThan(1); expect(r.hitCd).toBe(3);
  expect(r.early.dead).toBe(true); expect(r.early.hearts).toBe(4);
  expect(r.reach).toBe(true);
  expect(r.touch.hearts).toBe(4);
  expect(r.late).toEqual({ dead: true, hearts: 4 });
  expect(r.noRoar.hearts).toBeLessThan(4);
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
  [5, 'crab', [0, 1, 2], ['volley', 'summon', 'charge', 'quake', 'tired', 'stagger', 'flee']],
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
  expect(await game.eval(() => ({ phase: window.__dino.G.boss.phase, hp: window.__dino.G.boss.hp, hearts: window.__dino.G.p.hearts }))).toEqual({ phase: 2, hp: 3, hearts: 4 });
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
  await page.mouse.click(480, 453);                      // the reveal is still running: the first tap only skips ahead ...
  expect(await game.eval(() => window.__dino.scene)).toBe('play');
  await page.waitForTimeout(500);
  await page.mouse.click(480, 453);                      // ... and now the button is there
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
    const h2 = L.hearts[1]; p.hearts = G.maxH; const a0 = G.amber; p.wx = h2.x - 10; p.y = h2.y + 50; d.updatePlay(1 / 60); out.full = [p.hearts, G.amber - a0];
    return out;
  });
  expect(r.hearts).toBeGreaterThanOrEqual(2);
  expect(r.afterPickup).toBe(2);
  expect(r.full).toEqual([4, 5]);
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

test('dash tutorial: the coach starts the dash close enough to smash the first wall, also after an early dash', async ({ game }) => {
  await game.open({});
  const r = await game.eval(() => {
    const d = window.__dino; const step = n => { for (let i = 0; i < n; i++) d.updatePlay(1 / 60); };
    const run = early => { d.startLevel(3); const G = d.G, p = G.p, L = G.L; G.startT = 0; G.coach = null; p.inv = 999; L.obs = L.obs.filter(o => o.type === 'wall'); const w = L.obs[0];
      L.coach.forEach(c => { if (c.type !== 'dash') c.done = true; });
      p.wx = early ? 1500 : 1650; p.y = 440; p.onGround = true; if (early) { d.dash(); step(30); }
      for (let i = 0; i < 400 && !w.dead; i++) { step(1); if (G.coach) d.dash(); }
      return { dead: !!w.dead, gap: w.x - L.coach.find(c => c.type === 'dash').x, hearts: p.hearts, max: G.p.hearts }; };
    return { normal: run(false), early: run(true) };
  });
  for (const k of ['normal', 'early']) { expect(r[k].dead).toBe(true); expect(r[k].gap).toBeGreaterThanOrEqual(150); expect(r[k].gap).toBeLessThanOrEqual(300); }
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
    G.stopped = false; L.pits.length = 0; L.plats.length = 0; p.wx = 6000; p.y = 440; p.vy = 0; p.onGround = true; for (let i = 0; i < 10; i++) d.updatePlay(1 / 60); L.obs.push({ type: 'pad', x: 6040, sq: 0 }); let walkTop = 440; for (let i = 0; i < 40; i++) { d.updatePlay(1 / 60); walkTop = Math.min(walkTop, p.y); }
    // ...but only when Rex comes down on it from a jump; just running over it gives a small hop
    L.obs.length = 0; for (let i = 0; i < 90; i++) d.updatePlay(1 / 60); p.wx = 6000; p.y = 300; p.vy = 300; p.onGround = false; L.obs.push({ type: 'pad', x: 6040, sq: 0 }); let top = 440; for (let i = 0; i < 40; i++) { d.updatePlay(1 / 60); top = Math.min(top, p.y); }
    // meteor falls when close and then stays as a rock
    L.obs.length = 0; p.wx = 7000; p.y = 440; p.vy = 0; const m = { type: 'meteor', x: 7300, state: 'wait', y: -80, vy: 0 }; L.obs.push(m); d.updatePlay(1 / 60); const falling = m.state === 'fall'; for (let i = 0; i < 90; i++) d.updatePlay(1 / 60);
    // spitting plant makes seeds; hopper hops
    L.obs.length = 0; p.wx = 9000; const pl = { type: 'plant', x: 9400, shoot: 0.05, pop: 0 }, hp = { type: 'hopper', x: 9300, hp: 0 }; L.obs.push(pl, hp); let maxHy = 0; for (let i = 0; i < 40; i++) { d.updatePlay(1 / 60); maxHy = Math.max(maxHy, hp.hy || 0); }
    return { landed, fell, top, walkTop, falling, metState: m.state, seeds: L.obs.filter(o => o.type === 'seed').length, maxHy };
  });
  expect(r.landed).toBe(true); expect(r.fell).toBe(true);
  expect(r.top).toBeLessThan(150); expect(r.walkTop).toBeGreaterThan(300);
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

test('safety net: the second retry at one checkpoint gives a shield that absorbs one hit; Chili speaks', async ({ game }) => {
  await game.open();
  await game.start(0);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p; const out = {};
    out.greeting = !!G.chiliSay;
    p.hearts = 1; p.inv = 0; d.retry(); out.afterTwo = !!G.shield;
    p.hearts = 1; p.inv = 0; d.retry(); out.afterThree = !!G.shield;
    p.hearts = 3; p.inv = 0; p.dashT = 0; G.chiliCd = 0; G.chiliSay = null; G.p.inv = 0;
    // a hit with the shield up costs no heart; the next one does and Chili comments
    const before = p.hearts; window.__dino.pitFall && 0;
    return Object.assign(out, { before });
  });
  expect(r.greeting).toBe(true);
  expect(r.afterTwo).toBe(false); // after one retry
  expect(r.afterThree).toBe(true); // after the second
  const h = await game.eval(() => { const d = window.__dino, G = d.G, p = G.p, L = G.L; p.hearts = 3; p.inv = 0; p.dashT = 0; const o = { type: 'rock', x: p.wx + 5, w: 40, h: 40 }; L.obs.push(o); for (let i = 0; i < 30; i++) d.updatePlay(1 / 60); return { hearts: p.hearts, shield: G.shield }; });
  expect(h.shield).toBe(false);
  expect(h.hearts).toBe(3);
  expect(game.errors).toEqual([]);
});

test('4 hearts in story levels, 3 in endless; the boss fight starts with a shield', async ({ game }) => {
  await game.open();
  await game.start(0);
  expect(await game.eval(() => ({ h: window.__dino.G.p.hearts, m: window.__dino.G.maxH }))).toEqual({ h: 4, m: 4 });
  await game.eval(() => { const G = window.__dino.G; G.p.hearts = 1; window.__dino.retry(); });
  expect(await game.eval(() => window.__dino.G.p.hearts)).toBe(4);
  await game.start(5);
  await game.eval(() => { const d = window.__dino, G = d.G; G.startT = 0; G.coach = null; G.L.obs.length = 0; G.L.pits.length = 0; for (let i = 0; i < 4000 && !G.bossStarted; i++) { G.p.hearts = 4; G.p.inv = 9; G.p.wx = Math.min(G.L.bossX + 5, G.p.wx + 40); d.updatePlay(1 / 60); } });
  expect(await game.eval(() => !!window.__dino.G.shield)).toBe(true);
  await game.start(0, true);
  expect(await game.eval(() => window.__dino.G.p.hearts)).toBe(3);
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

test('book: size lineup scrolls and opens a card, results card opens the book', async ({ game, page }) => {
  await game.open({ lvDone: new Array(24).fill(1), unlocked: 24 });
  await game.eval(() => { const d = window.__dino; d.go('book'); d.bookMode('lineup'); });
  await page.waitForTimeout(300);
  await game.eval(() => window.__dino.lineupScroll(900));
  await page.waitForTimeout(300);
  await game.eval(() => window.__dino.bookMode('grid'));
  // finishing a level for the first time shows the card; tapping it opens that card in the Dino-Buch
  await game.eval(() => { const d = window.__dino; d.save.lvDone[8] = 0; d.startLevel(8); const G = d.G; G.startT = 0; G.coach = null; G.L.coach.forEach(c => (c.done = true)); d.finishLevel(); });
  await page.waitForTimeout(1800);
  await page.mouse.click(480, 150);
  await page.waitForTimeout(300);
  expect(await game.eval(() => window.__dino.scene)).toBe('book');
  expect(await game.eval(() => window.__dino.save.bookSeen[8])).toBe(true);
  expect(game.errors).toEqual([]);
});

test('book data: every card has headline|detail text and a full STECK entry', async ({ game }) => {
  await game.open();
  const bad = await game.eval(() => { const d = window.__dino, out = []; if (d.FACTS.length !== 24 || d.STECK.length !== 24) out.push('length'); d.FACTS.forEach((f, i) => { const st = d.STECK[i], p = f.text.split('|'); if (p.length !== 2 || p[0].length < 20 || p[1].length < 10) out.push('text ' + i); if (!st || !st.tl || st.tl.length !== 2 || !st.nm || !st.l || !st.e || (st.m === 0 && !st.cmp)) out.push('steck ' + i); if (/ß/.test(f.text + st.nm)) out.push('ss ' + i); }); return out; });
  expect(bad).toEqual([]);
});

test('Goettis Schätze are hidden: each one needs its own move (Brüll, Flitz, Stampf, Feuer) and can only be grabbed once found', async ({ game }) => {
  await game.open();
  for (const [li, kind] of [[2, 'tree'], [8, 'rock'], [14, 'ice'], [20, 'ash']]) {
    await game.start(li);
    const r = await game.eval(([kind]) => {
      const d = window.__dino, G = d.G, p = G.p, L = G.L, sc = L.secret, tr = L.treasure, step = n => { for (let i = 0; i < n; i++) d.updatePlay(1 / 60); };
      L.obs = L.obs.filter(o => o.sec); L.pits.length = 0; L.plats.length = 0; p.inv = 999; p.hearts = 99;
      const out = { kind: sc.kind, hiddenAtStart: !tr.shown };
      p.wx = tr.x - 10; p.y = 440; step(2); out.grabbedWhileHidden = tr.got; // standing right on it does nothing
      p.wx = sc.x - 300; p.y = 440; p.vy = 0; p.onGround = true;
      if (kind === 'tree') d.roar();
      else if (kind === 'rock') { d.dash(); for (let i = 0; i < 150 && sc.state === 'idle'; i++) step(1); }
      else if (kind === 'ice') { p.wx = sc.x - 20; p.y = 380; p.vy = 600; p.onGround = false; p.stomp = true; p.spin = 0; for (let i = 0; i < 150 && sc.state === 'idle'; i++) step(1); }
      else { p.fireT = 5; d.shootFire(); for (let i = 0; i < 90 && sc.state === 'idle'; i++) step(1); }
      out.state = sc.state; out.shown = tr.shown;
      step(70); p.wx = tr.x - 10; p.y = 440; step(1); out.got = tr.got;
      return out;
    }, [kind]);
    expect(r, kind).toEqual({ kind, hiddenAtStart: true, grabbedWhileHidden: false, state: 'open', shown: true, got: true });
  }
});

test('fireballs and the dash pass under a ceiling overhang without destroying it', async ({ game }) => {
  await game.open({ learned: { duck: 1, stomp: 1, fire: 1, dash: 1, swim: 1, glide: 1 } });
  await game.start(20);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p, L = G.L, step = n => { for (let i = 0; i < n; i++) d.updatePlay(1 / 60); };
    G.startT = 0; G.coach = null; L.obs = []; L.pits.length = 0; L.plats.length = 0; p.hearts = 99;
    const low = { type: 'low', x: 0, w: 150 }; L.obs.push(low);
    const rock = { type: 'rock', x: 300, w: 56, h: 44 }; L.obs.push(rock); // control: fire still smashes a ground obstacle behind the overhang
    p.wx = -400; p.y = 440; p.vy = 0; p.onGround = true; p.inv = 0; p.fireT = 5; p.fireCd = 0; d.shootFire();
    const fb = G.fireballs[0];
    for (let i = 0; i < 60 && G.fireballs.length; i++) { p.wx = -400; step(1); }
    const out = { flewUnder: fb.under === low, afterFire: !low.dead, fireHurt: p.hearts < 99, rockSmashed: !!rock.dead };
    p.wx = -200; p.y = 440; p.fireT = 0; p.dashT = 0; p.dashCd = 0; d.dash();
    for (let i = 0; i < 20; i++) { p.wx = Math.min(p.wx + 12, 40); step(1); } // stays inside the 0.4 s dash
    out.afterDash = !low.dead; out.dashHurt = p.hearts < 99;
    return out;
  });
  expect(r).toEqual({ flewUnder: true, afterFire: true, fireHurt: false, rockSmashed: true, afterDash: true, dashHurt: false });
});

test('fire cannot reach icicles high up, a landed icicle can be shot, and a shot icicle leaves its ceiling stub', async ({ game }) => {
  await game.open({ learned: { duck: 1, stomp: 1, fire: 1, dash: 1, swim: 1, glide: 1 } });
  await game.start(2);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p, L = G.L, step = n => { for (let i = 0; i < n; i++) d.updatePlay(1 / 60); };
    L.obs = []; L.pits.length = 0; L.plats.length = 0; p.hearts = 99; p.inv = 999; p.fireT = 5;
    const fire = (fy, ice) => { L.obs = [ice]; G.fireballs = [{ x: ice.x - 100, y: fy, vx: 950, vy: 0, life: 1.1 }]; p.wx = ice.x - 700; for (let i = 0; i < 20; i++) { p.wx = ice.x - 700; step(1); } };
    const hang = { type: 'icicle', x: 600, y: 120, vy: 0, state: 'hang' }; fire(150, hang);
    const high = { type: 'icicle', x: 600, y: 140, vy: 0, state: 'fall' }; fire(400, high);         // a falling icicle far above the fireball
    const stuck = { type: 'icicle', x: 600, y: 440, vy: 0, state: 'stuck' }; fire(400, stuck);
    const out = { hangAlive: !hang.dead, highAlive: !high.dead, stuckShot: !!stuck.dead };
    // a shot icicle still draws its ceiling stub: the pixel under it differs from the same frame without the icicle
    G.freeze = 9; L.obs = [stuck]; stuck.dead = true; G.cam = stuck.x - 300; p.wx = G.cam + 270;
    const cv = document.querySelector('canvas'), c2 = cv.getContext('2d'), px = () => { d.drawPlay(); const k = cv.width / 960; return Array.from(c2.getImageData(Math.round(300 * k), Math.round(30 * k), 1, 1).data).join(); };
    const withStub = px(); L.obs = []; out.stub = withStub !== px();
    return out;
  });
  expect(r).toEqual({ hangAlive: true, highAlive: true, stuckShot: true, stub: true });
});

test('a stomp coming down on a raptor knocks it away and costs no heart', async ({ game }) => {
  await game.open({ learned: { duck: 1, stomp: 1, fire: 1, dash: 1, swim: 1, glide: 1 } });
  await game.start(0);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p, L = G.L, step = n => { for (let i = 0; i < n; i++) d.updatePlay(1 / 60); };
    G.startT = 0; G.coach = null; L.obs = []; L.pits.length = 0; L.plats.length = 0; p.hearts = 3; p.inv = 0;
    const rap = { type: 'raptor', x: 260, spd: 0, ph: 0, alpha: 1 }; L.obs.push(rap);
    p.wx = 250; p.y = 330; p.vy = 900; p.onGround = false; p.stomp = true; p.spin = 1;
    step(40);
    return { hearts: p.hearts, scared: !!rap.scared };
  });
  expect(r).toEqual({ hearts: 3, scared: true });
});

test('a missed treasure gets clearer hints: tip after one miss, glints after two; a found treasure stops the count', async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const d = window.__dino, out = [];
    for (const t of [0, 1, 2]) { d.save.tTries[0] = t; d.startLevel(2); out.push([d.G.L.tips.some(x => /klimpern/.test(x.text)), d.G.L.secret.strong]); }
    d.save.tTries[0] = 0; d.startLevel(2); d.finishLevel(); const miss = d.save.tTries[0]; // finished without the guitar
    d.startLevel(2); d.G.L.treasure.got = true; d.finishLevel();
    return { out, miss, found: d.save.treasures[0], tries: d.save.tTries[0] };
  });
  expect(r).toEqual({ out: [[false, false], [true, false], [true, true]], miss: 1, found: 1, tries: 1 });
});

test('the Kiwi pepper is back after a respawn, so the ash can always be burnt', async ({ game }) => {
  await game.open();
  await game.start(20);
  const r = await game.eval(() => {
    const d = window.__dino, L = d.G.L, pp = L.peppers.find(q => q.sec); pp.got = true; d.retry(); const a = pp.got;
    pp.got = true; L.secret.state = 'open'; d.retry(); return { a, afterOpen: pp.got };
  });
  expect(r).toEqual({ a: false, afterOpen: true });
});

test('the treasure cue sounds play near a hiding place without errors, and Chili notices it once', async ({ game, page }) => {
  await page.addInitScript(FAKE_AUDIO);
  await game.open();
  await page.mouse.click(10, 10);
  const r = [];
  for (const li of [2, 8, 14, 20]) {
    await game.start(li);
    r.push(await game.eval(() => {
      const d = window.__dino, G = d.G, p = G.p, sc = G.L.secret, t0 = window.__tones; G.L.pits.length = 0; p.inv = 999; G.chiliCd = 0;
      p.wx = sc.x - 700; p.y = 440; for (let i = 0; i < 150; i++) { d.updatePlay(1 / 60); p.wx = Math.min(p.wx, sc.x - 300); }
      return { tones: window.__tones - t0, noticed: sc.noticed };
    }));
  }
  expect(r.every(x => x.tones > 3 && x.noticed)).toBe(true);
  expect(game.errors).toEqual([]);
});

test('Chili, the baby and Kiwi hop where Rex hopped, in order, and never sink below the ground', async ({ game }) => {
  await game.open({ babyName: 'Babs', treasures: [0, 0, 0, 1] });
  await game.start(0);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p; G.L.pits.length = 0; G.L.obs.length = 0; G.L.plats.length = 0; p.inv = 999; G.L.coach.forEach(c => (c.done = true));
    const peak = { rex: [0, 0], chili: [0, 0], baby: [0, 0], kiwi: [0, 0] }, low = [];
    for (let i = 0; i < 400; i++) {
      if (i === 120) { p.vy = -900; p.onGround = false; p.jumps = 1; } // one jump
      d.updatePlay(1 / 60);
      const h = { rex: p.y, chili: G.chili.y, baby: G.fol.baby.y, kiwi: G.fol.kiwi.y };
      for (const k in h) { low.push(h[k] > 441); if (440 - h[k] > peak[k][0]) peak[k] = [440 - h[k], i]; }
    }
    return { peak, sunk: low.some(Boolean), end: [G.chili.y, G.fol.baby.y, G.fol.kiwi.y] };
  });
  expect(r.sunk).toBe(false);
  for (const k of ['chili', 'baby', 'kiwi']) expect(r.peak[k][0]).toBeGreaterThan(60);                // every follower really leaves the ground
  expect(r.peak.chili[1]).toBeGreaterThan(r.peak.rex[1]);                                              // ... later than Rex
  expect(r.peak.baby[1]).toBeGreaterThan(r.peak.chili[1]);                                             // ... and in order of distance
  expect(r.peak.kiwi[1]).toBeGreaterThan(r.peak.baby[1]);
  for (const y of r.end) expect(y).toBeGreaterThan(420);                                                // all back on the ground
});

test('followers climb onto a platform with Rex, stay clear of pits, and start fresh after a retry', async ({ game }) => {
  await game.open({ babyName: 'Babs', treasures: [0, 0, 0, 1] });
  await game.start(0);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p, L = G.L; L.pits.length = 0; L.obs.length = 0; L.plats.length = 0; p.inv = 999;
    L.plats.push({ x: p.wx + 400, y: 440 - 125, w: 1400 });
    const run = (n, fn) => { for (let i = 0; i < n; i++) { if (fn) fn(i); d.updatePlay(1 / 60); } };
    run(40, i => { if (i === 0) { p.vy = -1000; p.onGround = false; p.jumps = 1; p.wx = L.plats[0].x - 120; } }); // hop onto the platform
    run(200);
    const onPlat = { rex: p.y, kiwi: G.fol.kiwi.y, baby: G.fol.baby.y, chili: G.chili.y };
    L.plats.length = 0; L.pits.push({ x: p.wx + 300, w: 260 }); G.chili.wx = p.wx - 145; p.y = 440; p.vy = 0; p.onGround = true;
    let over = 0; for (let i = 0; i < 160; i++) { d.updatePlay(1 / 60); const fx = p.wx - 230; if (fx > L.pits[0].x + 20 && fx < L.pits[0].x + 240) over = Math.max(over, 440 - G.fol.kiwi.y); p.y = Math.min(p.y, 440); }
    d.retry();
    return { onPlat, over, trail: G.trail.x.length, after: [G.chili.y, G.fol.baby.y, G.fol.kiwi.y] };
  });
  for (const k of ['rex', 'kiwi', 'baby', 'chili']) expect(r.onPlat[k]).toBeLessThan(440 - 100);     // all four stand up on the platform (315 or a little higher with the run bounce)
  expect(r.over).toBeGreaterThan(20);                                                                  // Kiwi is lifted over the pit, not walking into it
  expect(r.trail).toBe(0);
  for (const y of r.after) expect(y).toBe(440);
});

test('followers ride a crumbled platform down, and absent followers make no dust', async ({ game }) => {
  await game.open({ treasures: [0, 0, 0, 0] }); // no baby, no Kiwi
  await game.start(0);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p, L = G.L; L.pits.length = 0; L.obs.length = 0; L.plats.length = 0; p.inv = 999;
    const pl = { x: p.wx + 300, y: 440 - 100, y0: 340, w: 1400, crumble: false, t: null }; L.plats.push(pl);
    for (let i = 0; i < 30; i++) d.updatePlay(1 / 60);
    p.wx = pl.x + 20; p.y = pl.y; p.vy = 0; p.onGround = true;
    for (let i = 0; i < 100; i++) d.updatePlay(1 / 60); // Rex runs along the step, the trail remembers it
    const before = G.chili.y;
    pl.gone = true; pl.fv = 0; p.vy = 0; p.y = 440; p.onGround = true; L.plats.length = 0; // it breaks away behind him
    G.chili.wx = p.wx - 120;
    let minY = 999; for (let i = 0; i < 20; i++) { pl.fv += 2200 / 60; pl.y += pl.fv / 60; d.updatePlay(1 / 60); minY = Math.min(minY, G.chili.y); }
    return { before, minY, after: G.chili.y, parts: d.G.fol.baby.pb };
  });
  expect(r.parts).toBe(null);          // the absent baby was never updated
  expect(r.before).toBeLessThan(360);   // Chili stood up on the step
  expect(r.after).toBeGreaterThan(r.before + 40); // ... and went down with it instead of hovering
});

test('underwater roar makes bubbles, shoves jellies, bubbles urchins and pulls amber', async ({ game }) => {
  await game.open({ unlocked: 12 });
  await game.eval(() => { const d = window.__dino; d.startLevel(9); d.G.startT = 0; d.G.coach = null; d.G.L.coach.forEach(c => (c.done = true)); }); // day 10: the first swimming level
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, L = G.L, p = G.p; p.roarCd = 0; G.startT = 0;
    const my = p.y - 50, jx = p.wx + 150, ux = p.wx + 250, ax = p.wx + 300;
    L.obs.push({ type: 'jelly', x: jx, y0: my, amp: 0, ph: 0, y: my }, { type: 'urchin', x: ux });
    const am = { x: ax, y: 200, got: false }; L.amb.push(am);
    const jelly = L.obs[L.obs.length - 2], urchin = L.obs[L.obs.length - 1];
    d.roar();
    const out = { rings: G.rings.some(x => x.c === '210,245,255'), flagged: jelly.ty != null && urchin.scared === true && am.pull > 0, a0: am.x };
    for (let i = 0; i < 40; i++) d.updatePlay(1 / 60);
    out.jellyMoved = Math.abs(jelly.y0 - my) > 60; out.urchinGone = urchin.dead === true || urchin.alpha < 1; out.amberCloser = am.got || am.x < out.a0; out.hearts = p.hearts;
    return out;
  });
  expect(r.rings).toBe(true); expect(r.flagged).toBe(true); expect(r.jellyMoved).toBe(true); expect(r.urchinGone).toBe(true); expect(r.amberCloser).toBe(true);
  expect(game.errors).toEqual([]);
});

// ---- game feel: variable jump, jump buffer, near miss, boss entrance, grade ----
const FLAT_SRC = `() => { const d = window.__dino, G = d.G, p = G.p; G.L.pits.length = 0; G.L.obs.length = 0; G.L.amb.length = 0; G.L.hearts.length = 0; G.L.plats.length = 0; G.L.coach.forEach(c => (c.done = true)); G.startT = 0; G.coach = null; return { d, G, p }; }`; // clean level for mechanics tests (runs in the page)

test('variable jump: releasing early gives a shorter hop, holding gives the full jump, a double jump is never cut', async ({ game }) => {
  await game.open();
  await game.start(0);
  const r = await game.eval((src) => {
    const { d, G, p } = new Function('return (' + src + ')')()(); p.inv = 999;
    const run = (release) => { for (let i = 0; i < 40; i++) d.updatePlay(1 / 60); let peak = 0; d.jump(); G.holdJump = 'key'; for (let i = 0; i < 120; i++) { if (release && i === 1) { G.holdJump = null; d.jumpRelease(); } d.updatePlay(1 / 60); peak = Math.max(peak, 440 - p.y); } return peak; };
    const full = run(false), short = run(true);
    for (let i = 0; i < 60; i++) d.updatePlay(1 / 60);
    d.jump(); d.updatePlay(1 / 60); d.jump(); const v2 = p.vy; G.holdJump = null; d.jumpRelease();
    return { full, short, cut: p.vy !== v2 };
  }, FLAT_SRC);
  expect(r.full).toBeGreaterThan(150);
  expect(r.short).toBeLessThan(r.full - 30);
  expect(r.short).toBeGreaterThan(80);                    // even a very short tap is a real hop
  expect(r.cut).toBe(false);
});

test('jump buffer: a press just before landing jumps on touchdown, an early press does not', async ({ game }) => {
  await game.open();
  await game.start(0);
  const r = await game.eval((src) => {
    const { d, G, p } = new Function('return (' + src + ')')()(); p.inv = 999; for (let i = 0; i < 40; i++) d.updatePlay(1 / 60);
    const trial = (h) => { // press again at h px above the ground, on the way down, with both jumps used up
      d.jump(); for (let i = 0; i < 4; i++) d.updatePlay(1 / 60); d.jump();
      let n = 0; while (p.vy < 0 && n++ < 200) d.updatePlay(1 / 60); while (440 - p.y > h && n++ < 400) d.updatePlay(1 / 60);
      const jumpsBefore = p.jumps; d.jump(); let hopped = false;
      for (let i = 0; i < 60; i++) { d.updatePlay(1 / 60); if (p.jumps === 1 && p.vy < -500) hopped = true; }
      for (let i = 0; i < 200; i++) d.updatePlay(1 / 60); return { jumpsBefore, hopped };
    };
    return { late: trial(20), early: trial(150) };
  }, FLAT_SRC);
  expect(r.late.jumpsBefore).toBe(2); expect(r.early.jumpsBefore).toBe(2);
  expect(r.late.hopped).toBe(true);                       // pressed ~0.03 s before touchdown: buffered
  expect(r.early.hopped).toBe(false);                     // pressed ~0.3 s before touchdown: forgotten
});

test('near miss: passing a rock by a hair pays 2 amber once, a hit pays nothing, and the payout is capped per level', async ({ game }) => {
  await game.open();
  await game.start(0);
  const r = await game.eval((src) => {
    const { d, G, p } = new Function('return (' + src + ')')()();
    // try several jump distances: whichever clears the rock tightly must pay exactly 2 once, whichever hits it must pay nothing
    const res = [];
    for (let dist = 60; dist <= 160; dist += 4) {
      const q = { type: 'rock', x: p.wx + 600, w: 60, h: 50 }; G.L.obs.length = 0; G.L.amb.length = 0; G.L.hearts.length = 0; G.L.obs.push(q); p.inv = 0; p.hearts = 4; G.nearN = 0;
      const a1 = G.amber; let hit = false;
      for (let i = 0; i < 400; i++) { if (q.x - p.wx < dist && p.onGround && !q.j) { q.j = 1; d.jump(); G.holdJump = 'key'; } d.updatePlay(1 / 60); if (p.hitT > 0) hit = true; }
      res.push({ dist, gained: G.amber - a1, hit }); p.inv = 0; for (let i = 0; i < 120; i++) d.updatePlay(1 / 60);
    }
    // cap: once NEAR_CAP payouts are used up, a tight clear pays nothing
    const win = res.find(x => !x.hit && x.gained === 2); let capped = null;
    if (win) { const q = { type: 'rock', x: p.wx + 600, w: 60, h: 50 }; G.L.obs.length = 0; G.L.obs.push(q); G.nearN = 99; p.inv = 0; const a1 = G.amber; for (let i = 0; i < 400; i++) { if (q.x - p.wx < win.dist && p.onGround && !q.j) { q.j = 1; d.jump(); } d.updatePlay(1 / 60); } capped = G.amber - a1; }
    return { res, capped };
  }, FLAT_SRC);
  expect(r.res.some(x => !x.hit && x.gained === 2)).toBe(true);        // at least one tight clear paid out
  for (const x of r.res) { if (x.hit) expect(x.gained).toBe(0); expect(x.gained === 0 || x.gained === 2).toBe(true); }
  expect(r.capped).toBe(0);
});

test('boss entrance: cinematic bars, arrival freeze and zoom, stamped banner; colour grade and far foreground draw in every world', async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const d = window.__dino, out = {};
    for (let wi = 0; wi < 8; wi++) { d.startLevel(wi, true); const G = d.G; G.startT = 0; G.coach = null; for (let i = 0; i < 30; i++) d.updatePlay(1 / 60); d.drawPlay(); d.lowfx = true; d.drawPlay(); d.lowfx = false; }
    d.startLevel(5, false); const G = d.G; G.startT = 0; G.coach = null; G.L.coach.forEach(c => (c.done = true)); G.p.inv = 999;
    G.p.wx = G.L.bossX - 400; let arrived = false, zoom = 0, bars = false;
    for (let i = 0; i < 1500 && !arrived; i++) { d.updatePlay(1 / 60); if (G.boss && G.boss.state === 'enter') { bars = true; d.drawPlay(); } if (G.boss && G.boss.state !== 'enter') { arrived = true; zoom = G.zoom; } }
    for (let i = 0; i < 30; i++) { d.updatePlay(1 / 60); d.drawPlay(); }
    return { arrived, zoom, bars, hit: G.banner ? !!G.banner.hit : 'gone' };
  });
  expect(r.arrived).toBe(true); expect(r.bars).toBe(true); expect(r.zoom).toBeGreaterThan(0.5); expect(r.hit).not.toBe(false); // the banner stamp landed (or already faded)
  expect(game.errors).toEqual([]);
});

test('juice: amber arcs into the HUD, eggs and treasures slow time and pulse, the boss arena fades in and out', async ({ game }) => {
  await game.open();
  await game.start(0);
  const r = await game.eval((src) => {
    const { d, G, p } = new Function('return (' + src + ')')()(); p.inv = 999;
    G.L.amb.push({ x: p.wx + 10, y: p.y - 50, got: false }); d.updatePlay(1 / 60); const spawned = (G.flyAmb || []).length;
    for (let i = 0; i < 60; i++) { d.updatePlay(1 / 60); d.drawPlay(); } const left = (G.flyAmb || []).length, popped = G.amberPop;
    G.L.eggs.push({ x: p.wx + 10, y: p.y - 50, k: 0, got: false, hidden: false }); G.slowT = 0; G.zoom = 0; d.updatePlay(1 / 60); const egg = { slow: G.slowT > 0, zoom: G.zoom > 0.5, got: G.eggsGot[0] };
    G.arena = 0; G.bossStarted = true; for (let i = 0; i < 90; i++) d.updatePlay(1 / 60); const on = G.arena; d.drawPlay();
    G.bossStarted = false; for (let i = 0; i < 90; i++) d.updatePlay(1 / 60);
    return { spawned, left, egg, on, off: G.arena };
  }, FLAT_SRC);
  expect(r.spawned).toBe(1); expect(r.left).toBe(0);
  expect(r.egg).toEqual({ slow: true, zoom: true, got: true });
  expect(r.on).toBeGreaterThan(0.9); expect(r.off).toBe(0);
  expect(game.errors).toEqual([]);
});

test('look: rim light, glows, backdrop desaturation and carved buttons render in every world, also in low-power mode', async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const d = window.__dino; let n = 0;
    for (const low of [false, true]) { d.lowfx = low; for (let wi = 0; wi < 8; wi++) { d.startLevel(wi, true); const G = d.G; G.startT = 0; G.coach = null; G.tip = { text: 'Hinweis', t: 5 }; for (let i = 0; i < 40; i++) d.updatePlay(1 / 60); d.drawPlay(); n++; } }
    d.lowfx = false; return n;
  });
  expect(r).toBe(16);
  expect(game.errors).toEqual([]);
});

test('boss telegraphs: every projectile, shock wave and charge is announced ~0.5 s ahead; the crab gets a third (stomping) phase', async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const d = window.__dino, out = {};
    for (const [li, name] of [[5, 'crab'], [11, 'kraken'], [17, 'queen'], [23, 'king']]) {
      d.startLevel(li, false); const G = d.G; G.startT = 0; G.coach = null; G.L.coach.forEach(c => (c.done = true)); G.p.inv = 999; G.p.wx = G.L.bossX - 400;
      let lastTele = -9, prevRocks = 0, prevWaves = 0, prevState = '', attacks = 0, unannounced = 0, quakes = 0;
      for (let i = 0; i < 6000; i++) {
        d.updatePlay(1 / 60); const b = G.boss; if (!b) continue;
        if (b.tele) lastTele = G.t;
        const rocks = b.rocks.length, waves = b.hazards.filter(h => h.kind === 'wave').length, st = b.state;
        const fired = (rocks > prevRocks) + (waves > prevWaves && st === 'quake') + (st === 'charge' && prevState !== 'charge') + (st === 'leap' && prevState !== 'leap');
        if (fired) { attacks++; if (G.t - lastTele > 0.9) unannounced++; }
        if (st === 'quake') quakes++; prevRocks = rocks; prevWaves = waves; prevState = st;
        if (st === 'tired' || (st === 'charge' && b.x - G.p.wx < 380)) d.roar();
        if (G.overlay) G.overlay = null;
      }
      out[name] = { attacks, unannounced, quakes, phases: G.boss.phase, n: G.L.bossKind };
    }
    return out;
  });
  expect(r.crab.quakes).toBeGreaterThan(0);                     // the new stomping phase ran
  for (const k of ['crab', 'kraken', 'queen', 'king']) { expect(r[k].attacks).toBeGreaterThan(2); expect(r[k].unannounced).toBe(0); }
  expect(game.errors).toEqual([]);
});

test('day 1 teaches the double jump: the high ledge needs two taps and the coach waits for the second one in the air', async ({ game }) => {
  await game.open({ tutorialDone: false });
  const r = await game.eval(() => {
    const d = window.__dino; const step = n => { for (let i = 0; i < n; i++) d.updatePlay(1 / 60); };
    const fresh = () => { d.startLevel(0); const G = d.G, p = G.p; G.startT = 0; G.coach = null; p.inv = 999; G.L.obs.length = 0; return { G, p, L: G.L }; };
    const reach = dbl => { const { G, p, L } = fresh(); L.coach.forEach(c => (c.done = true)); p.wx = 2080; p.y = L.plats[0].y; p.onGround = true; step(5); d.jump(); let did = false;
      for (let i = 0; i < 200; i++) { if (dbl && !did && p.vy > -50) { d.jump(); did = true; } step(1); if (p.onGround && p.y < 200 && p.wx > 2300) return true; } return false; };
    const { G, p, L } = fresh(); L.coach.forEach(c => { if (c.x < 2000) c.done = true; }); p.wx = 2000; p.y = L.plats[0].y; p.onGround = true; step(5);
    const seq = []; for (let i = 0; i < 300; i++) { const before = G.coach; step(1); if (G.coach && G.coach !== before) seq.push(G.coach.type); if (G.coach) d.jump(); }
    return { single: reach(false), dbl: reach(true), seq };
  });
  expect(r.single).toBe(false);
  expect(r.dbl).toBe(true);
  expect(r.seq.slice(0, 2)).toEqual(['jump', 'djump']);
});

test('toasts show one at a time: a waiting message takes over after about a second', async ({ game }) => {
  await game.open();
  await game.start(0);
  const r = await game.eval(() => {
    toasts = []; toast('eins'); toast('zwei'); toast('drei'); toast('zwei'); // a duplicate of a waiting toast is ignored
    const seen = [], len0 = toasts.length;
    for (let i = 0; i < 360; i++) { drawToasts(); const s = toasts[0] ? toasts[0].text : ''; if (seen[seen.length - 1] !== s) seen.push(s); }
    return { len0, seen };
  });
  expect(r.len0).toBe(3);
  expect(r.seen).toEqual(['eins', 'zwei', 'drei', '']); // never two at once, in order, and the queue empties by itself
});

test('boss arena: Rex slides left on screen so the boss is not cropped', async ({ game, page }) => {
  await game.open({ babyName: 'Mini', treasures: [0, 0, 0, 1] }); // baby and Kiwi follow, so their fade-out is drawn too
  await game.start(5);
  const r = await game.eval(() => {
    const G = window.__dino.G, p = G.p; p.wx = G.L.bossX; G.bossStarted = true; G.stopped = true; G.boss = G.boss || null;
    const before = (window.__dino.updatePlay(0.016), p.wx - G.cam);
    for (let i = 0; i < 120; i++) window.__dino.updatePlay(1 / 60);
    return { before, arena: G.arena, after: p.wx - G.cam };
  });
  expect(r.arena).toBeGreaterThan(0.95);
  expect(r.after).toBeLessThan(r.before - 60); // ARENA_SHIFT is 75
  expect(r.after).toBeGreaterThan(150);          // Chili at 145 px behind Rex must stay on screen
  await page.waitForTimeout(300);
  expect(game.errors).toEqual([]);
});

test('Oli and Fabio react: cheering and ouch faces draw without errors in every riding pose', async ({ game, page }) => {
  await game.open();
  await game.start(0);
  await game.eval(() => { const G = window.__dino.G; G.p.hitT = 0.4; G.chili.joy = 5; });
  await page.waitForTimeout(250);
  await game.eval(() => { const G = window.__dino.G; G.p.hitT = 0; G.chili.joy = 5; window.__dino.duckDown('k'); });
  await page.waitForTimeout(250);
  expect(game.errors).toEqual([]);
});

test('shop shows what you own and can buy, plus one door gift as a teaser (and the 72-medal prize)', async ({ game, page }) => {
  await game.open({ amber: 130 });
  await game.eval(() => window.__dino.go('shop'));
  await page.waitForTimeout(300);
  const r = await game.eval(() => { const d = window.__dino, tab = SHOP_TABS[2], v = shopVisible(tab); return { v, gifts: v.filter(i => tab.list[i].gift).map(i => tab.list[i].gift), c: d.shopCard(v[1]) }; });
  expect(r.v[0]).toBe(0);                                  // what you own comes first
  expect(r.gifts.filter(g => g !== 25).length).toBe(1);    // only one door gift on show ...
  expect(Math.min(...r.gifts.filter(g => g !== 25))).toBe(2); // ... the nearest one
  expect(r.gifts).toContain(25);                           // ... and the prize for 72 medals
  expect(r.v.length).toBeLessThan(10);
  await page.mouse.click(...r.c);
  expect(await game.eval(() => window.__dino.save.equip.hat)).toBe(0); // selecting previews, nothing is bought or worn yet
  expect(game.errors).toEqual([]);
});

test('dialogs with a picture dim the screen and draw the place or boss; the arrow advances', async ({ game, page }) => {
  await game.open({ storySeen: {} });
  await game.eval(() => { window.__dino.go('map'); window.__dino.launchLevel(5); });
  await page.waitForTimeout(700);
  expect(await game.eval(() => !!window.__dino.dialog && !!window.__dino.dialog.pic && window.__dino.dialog.pic.boss)).toBe('crab');
  await page.mouse.click(480, 300);                          // first tap completes the typewriter line
  await page.mouse.click(480, 300);                          // second tap goes on
  await page.waitForTimeout(200);
  expect(game.errors).toEqual([]);
});
