const { test, expect } = require('./helpers');

// An autoplayer that plays a whole calendar level in simulated time (hearts are cheated to 99, so this checks that every level
// is *completable*: pits jumpable, walls dashable, gaps glideable, bosses beatable, riddle gate reachable).
const PLAY = `
  (maxSteps) => {
    const d = window.__dino, G = d.G, p = G.p, L = G.L; let ducking = false, wasWide = false, doubled = false;
    const dist = o => o.x - p.wx;
    for (let i = 0; i < maxSteps; i++) {
      if (G.overlay) {
        const o = G.overlay;
        if (o.type === 'riddle') { if (!o.solved) d.answer(o.r.ok); d.openGate(); }
        else if (o.type === 'complete') return { done: true, steps: i, t: G.t, hits: G.hits || 0 };
        else if (o.type === 'retry') d.retry();
        else G.overlay = null;
      }
      G.coach = null; for (const c of L.coach) c.done = true;
      p.hearts = 99;
      const b = G.boss;
      if (b) { const dd = b.x - p.wx; if ((b.state === 'charge' && dd < 380) || b.state === 'tired') d.roar(); if (b.state === 'duel' && i % 7 === 0) d.roar(); }
      let wantJump = false, wantDuck = false, wantDash = false, wantRoar = false;
      if (L.swim) {
        let want = 340; // desired body-centre height
        for (const o of L.obs) { if (o.dead) continue; const dx = dist(o); if (dx < -40 || dx > 360) continue;
          if (o.type === 'cgate') want = o.gapY + o.gapH / 2;
          else if (o.type === 'jelly' || o.type === 'sword') want = (o.y || o.y0) > 300 ? 190 : 400;
          else if (o.type === 'boulder') want = 130; }
        if (b) for (const r of b.rocks) { const dx = r.x - p.wx; if (dx > 0 && dx < 300) want = r.y > 330 ? 200 : 420; }
        if (b) for (const h of b.hazards) if (h.kind === 'lane') want = h.y > 300 ? 190 : 420;
        const c = p.y - 50; if (c > want + 30 && p.vy > -120) wantJump = true;
        if (c < want - 45) { if (!ducking) { d.duckDown('k'); ducking = true; } } else if (ducking) { d.duckUp('k'); ducking = false; }
      } else {
        for (const pit of L.pits) { const dx = pit.x - p.wx; if (dx > 0 && dx < 70 && p.onGround && !L.plats.some(pl => pl.x > pit.x - 20 && pl.x < pit.x + pit.w)) { wantJump = true; doubled = false; } }
        if (p.onGround) { const nxt = L.plats.filter(pl => pl.x > p.wx).sort((a1, b1) => a1.x - b1.x)[0]; if (nxt && L.pits.some(q => nxt.x >= q.x - 5 && nxt.x < q.x + q.w) && nxt.x - p.wx < 175 && nxt.x - p.wx > 60) { const cur = L.plats.find(pl => p.wx >= pl.x && p.wx <= pl.x + pl.w); if (!cur || cur.x + cur.w - p.wx < 45) wantJump = true; } } // hop across platforms that bridge a pit
        if (!p.onGround && p.jumps === 1 && p.vy > 0) { const np = L.plats.find(pl => pl.x + pl.w > p.wx + 10 && pl.x - p.wx < 140 && p.y > pl.y - 30 && p.y < pl.y + 60 && L.pits.some(q => pl.x >= q.x - 5 && pl.x < q.x + q.w)); if (np) d.jump(); } // rescue double jump onto a bridging platform
        const wide = L.pits.find(q => q.w > 330 && q.x - p.wx > -q.w * 0.8 && q.x - p.wx < 170 && !L.plats.some(pl => pl.x > q.x - 20 && pl.x < q.x + q.w));
        if (wide && !p.onGround) { if (p.jumps === 1 && p.vy > 0 && !doubled) { d.jump(); doubled = true; } G.holdJump = 'key'; } else if (p.onGround || !wide) G.holdJump = null;
        for (const o of L.obs) { if (o.dead || o.scared) continue; const dx = dist(o); if (dx < 0 || dx > 400) continue;
          if (o.type === 'rock' || o.type === 'urchin') { if (dx < 150) wantJump = true; }
          else if (o.type === 'boulder') { if (dx < 340) wantRoar = true; }
          else if (o.type === 'rollrock') { if (dx < 200) wantJump = true; }
          else if (o.type === 'low') { if (dx < 210) wantDuck = true; }
          else if (o.type === 'ptero' && o.low) { if (dx < 200) wantDuck = true; }
          else if (o.type === 'raptor') { if (dx < 300) wantRoar = true; }
          else if (o.type === 'compy') { if (dx < 130) wantJump = true; }
          else if (o.type === 'icicle' && o.state === 'stuck') { if (dx < 150) wantJump = true; }
          else if (o.type === 'geyser') { if (dx < 150) wantJump = true; }
          else if (o.type === 'hopper') { if (dx < 330) wantRoar = true; if (dx < 90) wantJump = true; }
          else if (o.type === 'plant') { if (dx < 150) wantJump = true; }
          else if (o.type === 'seed') { if (dx < 190) wantJump = true; }
          else if (o.type === 'meteor') { if (o.state === 'stuck' && dx < 150) wantJump = true; }
          else if (o.type === 'wall') { if (dx < 330) wantDash = true; }
          else if (o.type === 'tide') { if (dx < 250) wantJump = true; } }
        if (wantDuck && !ducking) { d.duckDown('k'); ducking = true; } else if (!wantDuck && ducking) { d.duckUp('k'); ducking = false; }
        if (wantDash) d.dash(); if (wantRoar) d.roar();
      }
      if (wantJump && (L.swim || p.onGround)) d.jump();
      d.updatePlay(1 / 60);
    }
    return { done: false, steps: maxSteps, wx: p.wx, gate: L.gateX, state: G.boss && G.boss.state, y: p.y };
  }`;

test('all 24 calendar levels can be completed by the autoplayer (and take about 2 minutes)', async ({ game, page }) => {
  test.setTimeout(240000);
  await game.open({ learned: { duck: 1, stomp: 1, fire: 1, dash: 1, swim: 1, glide: 1 } });
  const failures = [];
  for (let li = 0; li < 24; li++) {
    await game.eval(li => { window.__dino.startLevel(li); const G = window.__dino.G; G.startT = 0; }, li);
    const r = await page.evaluate(`(${PLAY})(60000)`);
    if (!r.done) failures.push(`day ${li + 1}: ${JSON.stringify(r)}`);
    else { expect(r.t, `day ${li + 1} duration`).toBeGreaterThan(60); expect(r.t, `day ${li + 1} duration`).toBeLessThan(330); }
  }
  expect(failures).toEqual([]);
  expect(game.errors).toEqual([]);
});
