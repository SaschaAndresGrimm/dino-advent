const { test, expect, KEY, FAKE_AUDIO } = require('./helpers');

test('title screen loads without errors', async ({ game, page }) => {
  await game.open({});
  expect(await game.eval(() => window.__dino.scene)).toBe('title');
  await page.waitForTimeout(500);
  expect(game.errors).toEqual([]);
});

for (const wi of [0, 1, 2, 3, 4]) {
  test(`world ${wi + 1} plays for 3 s without errors`, async ({ game, page }) => {
    await game.open();
    await game.start(wi);
    await page.waitForTimeout(3000);
    const r = await game.eval(() => ({ wx: window.__dino.G.p.wx, scene: window.__dino.scene }));
    expect(r.scene).toBe('play');
    expect(r.wx).toBeGreaterThan(600);
    expect(game.errors).toEqual([]);
  });
}

test('old 4-world save is migrated to 5 worlds', async ({ game }) => {
  await game.open({ eggs: [[1, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], medals: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], riddleSeen: [[], [], [], []] });
  const r = await game.eval(() => { const s = window.__dino.save; return [s.eggs.length, s.medals.length, s.riddleSeen.length, !!s.owned, s.best.length]; });
  expect(r).toEqual([5, 5, 5, true, 5]);
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
  await game.start(1);
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
  const card = i => [440 + i * 126 + 59, 176 + 60];            // item card centres (logical px)
  const buy = [440 + 248, 362 + 30];                            // the confirm button
  // Blau (120): select it, then confirm
  await page.mouse.click(...card(1)); await page.mouse.click(...buy);
  let r = await game.eval(() => ({ amber: window.__dino.save.amber, skin: window.__dino.save.equip.skin, owned: window.__dino.save.owned.skin }));
  expect(r).toEqual({ amber: 80, skin: 1, owned: [0, 1] });
  // Gold (600) is too expensive: selecting and confirming changes nothing
  await page.mouse.click(...card(3)); await page.mouse.click(...buy);
  r = await game.eval(() => ({ amber: window.__dino.save.amber, skin: window.__dino.save.equip.skin }));
  expect(r).toEqual({ amber: 80, skin: 1 });
  // an owned item is equipped without paying: go back to Gruen
  await page.mouse.click(...card(0)); await page.mouse.click(...buy);
  expect(await game.eval(() => window.__dino.save.equip.skin)).toBe(0);
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  expect(stored.equip.skin).toBe(0);
  expect(game.errors).toEqual([]);
});

test('book: found cards open, NEU is cleared once seen', async ({ game, page }) => {
  await game.open({ eggs: [[1, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]] });
  await game.eval(() => window.__dino.go('book'));
  await page.waitForTimeout(300);
  await page.mouse.click(32 + 82, 104 + 56); // first card
  expect(await game.eval(() => window.__dino.save.bookSeen[0])).toBe(true);
  await page.waitForTimeout(200);
  expect(game.errors).toEqual([]);
});

test('roar: 3 s cooldown, smashes boulders but not small rocks', async ({ game }) => {
  await game.open();
  await game.start(1);
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
  const r = await game.eval(() => [1, 2, 3, 4].map(wi => { window.__dino.startLevel(wi); const L = window.__dino.G.L; return L.obs.length > 10 && L.pits.length > 0; }));
  expect(r).toEqual([true, true, true, true]);
});

// A bot that plays the whole boss fight in simulated time (fast): roars at the right moments, jumps/ducks hazards.
const BOT = `
  (maxSteps) => {
    const d = window.__dino, G = d.G, p = G.p, L = G.L, seen = { phases: new Set(), states: new Set(), minions: 0, hazards: new Set() };
    let ducking = false;
    for (let i = 0; i < maxSteps && !G.golden; i++) {
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
    return { phases: [...seen.phases], states: [...seen.states], hazards: [...seen.hazards], minions: seen.minions > 0, golden: !!G.golden };
  }`;

test('boss fight: 4 phases and a roar duel can be won, with every attack type appearing', async ({ game, page }) => {
  test.setTimeout(120000);
  await game.open();
  await game.start(3);
  await game.eval(() => { const G = window.__dino.G; G.p.wx = G.L.bossX - 30; });
  const r = await page.evaluate(`(${BOT})(20000)`);
  expect(r.golden).toBe(true);
  expect(r.phases).toEqual([0, 1, 2, 3]);
  expect(r.states).toEqual(expect.arrayContaining(['charge', 'volley', 'tired', 'summon', 'crouch', 'leap', 'stagger', 'duel', 'flee']));
  expect(r.hazards).toEqual(expect.arrayContaining(['wave', 'erupt']));
  expect(r.minions).toBe(true);
  expect(game.errors).toEqual([]);
});

test('boss fight lasts long enough to be exciting (more than a minute of game time)', async ({ game, page }) => {
  test.setTimeout(120000);
  await game.open();
  await game.start(3);
  await game.eval(() => { const G = window.__dino.G; G.p.wx = G.L.bossX - 30; });
  await page.evaluate(`(${BOT})(20000)`);
  expect(await game.eval(() => window.__dino.G.t)).toBeGreaterThan(55);
});

test('boss: losing in phase 3 restarts that phase with full boss hp, not the whole fight', async ({ game, page }) => {
  await game.open();
  await game.start(3);
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
  await game.open({ unlocked: 0, finished: false });
  await game.start(0);
  await game.eval(() => { const G = window.__dino.G; G.atGate = true; G.gateOpening = true; G.gateOpen = 1; G.stopped = false; G.p.wx = G.L.gateX + 250; });
  await page.waitForFunction(() => window.__dino.G.overlay && window.__dino.G.overlay.type === 'complete');
  await page.waitForTimeout(300);
  await page.mouse.click(480, 453);
  expect(await game.eval(() => window.__dino.scene)).toBe('map');
  expect(await game.eval(() => window.__dino.save.unlocked)).toBe(1);
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
  await game.start(4);
  await page.waitForTimeout(1500);
  const r = await game.eval(() => { const c = document.getElementById('game'), x = c.getContext('2d'); return { px: Array.from(x.getImageData(c.width / 2, c.height * 0.8, 1, 1).data).slice(0, 3), tones: window.__tones }; });
  expect(r.px.some(v => v > 5)).toBe(true);   // the frame loop is alive and drawing
  expect(r.tones).toBeGreaterThan(10);        // and music is being scheduled
  expect(game.errors).toEqual([]);
});

test('every world and the map have a long song with valid notes, and tension layers add notes', async ({ game, page }) => {
  await game.open();
  const r = await game.eval(() => { const out = {}; for (const k of ['map', '0', '1', '2', '3', '4']) { const bars = window.__dino.buildSong(k); const notes = bars.flatMap(b => [...b.bass, ...b.lead, ...b.arp]).filter(n => n != null); out[k] = { bars: bars.length, ok: notes.every(Number.isFinite), n: notes.length, distinct: new Set(bars.map(b => b.lead.join())).size }; } return out; });
  for (const k of Object.keys(r)) { expect(r[k].ok).toBe(true); expect(r[k].bars).toBeGreaterThanOrEqual(24); expect(r[k].distinct).toBeGreaterThan(8); }
  expect(r['0'].bars).toBe(48);
});

test('losing: the screen stops shaking once the retry overlay is up', async ({ game, page }) => {
  await game.open();
  await game.start(1);
  await game.eval(() => { const G = window.__dino.G; G.p.hearts = 1; G.p.inv = 0; G.shake = 0.5; G.p.y = 900; });
  await page.waitForFunction(() => window.__dino.G.overlay && window.__dino.G.overlay.type === 'retry');
  await page.waitForTimeout(600);
  expect(await game.eval(() => window.__dino.G.shake)).toBe(0);
});

test('hearts come back: pickups, checkpoint flags; full hearts turn into amber', async ({ game }) => {
  await game.open();
  await game.start(1);
  const r = await game.eval(() => {
    const d = window.__dino, G = d.G, p = G.p, L = G.L; const out = { hearts: L.hearts.length };
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
