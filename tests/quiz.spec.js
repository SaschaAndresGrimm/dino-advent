const { test, expect } = require('./helpers');

// Götti-Quiz (js/quiz.js) and the riddle pools it plays from (WORLDS[i].riddles).

test('riddle data: every riddle is well formed, fits the tablet and has enough of each difficulty', async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const bad = [], seenQ = new Set(), tiers = [];
    WORLDS.forEach((w, wi) => {
      const c = { 1: 0, 2: 0, 3: 0 };
      w.riddles.forEach((r, k) => {
        const id = `${w.name} #${k}`;
        if (typeof r.q !== 'string' || r.q.length < 10) bad.push(id + ': question');
        if (!Array.isArray(r.a) || r.a.length !== 3 || new Set(r.a).size !== 3 || r.a.some(a => typeof a !== 'string' || !a)) bad.push(id + ': answers');
        if (r.ok !== 0) bad.push(id + ': ok must be 0 (the game shuffles)');
        if (![1, 2, 3].includes(r.d)) bad.push(id + ': d');
        else c[r.d]++;
        if (!r.why || !/[.!)]$/.test(r.why)) bad.push(id + ': why');
        if (/ß/.test(r.q + r.a.join('') + r.why)) bad.push(id + ': Swiss spelling (no ß)');
        if (seenQ.has(r.q)) bad.push(id + ': duplicate question'); seenQ.add(r.q);
        // layout: the question takes at most 4 lines (24 px), a solved explanation at most 3 lines (20 px), an answer must fit its button
        if (wrapLines(r.q, 600, 24).length > 4) bad.push(id + ': question too long');
        if (wrapLines(r.why, 610, 20).length > 3) bad.push(id + ': explanation too long');
        setFont(30); if (r.a.some(a => ctx.measureText(a).width > 470)) bad.push(id + ': answer too wide');
        if (wrapLines('✓ ' + r.a[0], 560, 30).length > 1) bad.push(id + ': solved answer too wide');
      });
      tiers.push(c);
    });
    return { bad, tiers, counts: WORLDS.map(w => w.riddles.length) };
  });
  expect(r.bad).toEqual([]);
  for (const n of r.counts) expect(n).toBeGreaterThanOrEqual(25);
  for (const c of r.tiers) { expect(c[1]).toBeGreaterThanOrEqual(6); expect(c[2]).toBeGreaterThanOrEqual(6); expect(c[3]).toBeGreaterThanOrEqual(6); }
});

test('quiz: the map button opens the picker; locked themes stay closed', async ({ game }) => {
  await game.open({ finished: false, lvDone: [1] });
  const r = await game.eval(() => {
    const d = window.__dino; d.go('map');
    return new Promise(res => setTimeout(() => {
      const b = d.buttons.find(x => x.label === 'Quiz'); if (b) b.cb();
      setTimeout(() => res({ btn: !!b, scene: d.scene, phase: d.Q && d.Q.phase, open: d.quizThemes() }), 100);
    }, 200));
  });
  expect(r).toEqual({ btn: true, scene: 'quiz', phase: 'pick', open: [0] });
});

test('quiz: no button before the first level is done', async ({ game }) => {
  await game.open({ finished: false, lvDone: [] });
  const has = await game.eval(() => new Promise(res => { window.__dino.go('map'); setTimeout(() => res(window.__dino.buttons.some(x => x.label === 'Quiz')), 200); }));
  expect(has).toBe(false);
});

test('quiz: a round has five riddles that get harder and never repeat; the gate seen-list stays untouched', async ({ game }) => {
  await game.open({ riddleSeen: [[], [], [], [], [], [], [], []] });
  const r = await game.eval(() => {
    const d = window.__dino, out = [];
    for (let n = 0; n < 6; n++) { d.startQuiz(2); const qs = d.Q.qs, pool = WORLDS[2].riddles; out.push({ ds: qs.map(q => pool[q.k].d), uniq: new Set(qs.map(q => q.k)).size }); }
    return { out, gate: d.save.riddleSeen[2].length, quiz: d.save.quizSeen[2].length, scene: d.scene };
  });
  for (const o of r.out) { expect(o.ds).toEqual([1, 2, 2, 3, 3]); expect(o.uniq).toBe(5); }
  expect(r.gate).toBe(0);
  expect(r.quiz).toBeGreaterThan(0);
  expect(r.scene).toBe('quiz');
});

test('quiz: a mixed round draws from different themes', async ({ game }) => {
  await game.open();
  const r = await game.eval(() => { const d = window.__dino; d.startQuiz(-1); return d.Q.qs.map(q => q.wi); });
  expect(new Set(r).size).toBe(5);
});

test('quiz: amber for right-first-time, less with a miss, a bonus for a perfect round, never a deduction', async ({ game }) => {
  await game.open({ amber: 100 });
  const r = await game.eval(() => {
    const d = window.__dino, log = [];
    d.startQuiz(1);
    // question 1: miss twice (a plain game riddle would charge amber from the second miss), then solve: 1 amber
    let o = d.Q.o, bad = [0, 1, 2].filter(i => i !== o.r.ok);
    d.answer(bad[0], o); o.lock = 0; d.answer(bad[1], o); log.push(d.save.amber); o.lock = 0; d.answer(o.r.ok, o); log.push(d.save.amber);
    d.quizNext();
    // question 2: hint (free in the quiz), solve: 1 amber
    o = d.Q.o; o.wrong.push([0, 1, 2].find(i => i !== o.r.ok)); o.hinted = true; d.answer(o.r.ok, o); log.push(d.save.amber); d.quizNext();
    // questions 3-5: first time, 3 amber each
    for (let i = 2; i < 5; i++) { o = d.Q.o; d.answer(o.r.ok, o); log.push(d.save.amber); d.quizNext(); }
    return { log, phase: d.Q.phase, first: d.Q.first, perfect: d.Q.perfect, gained: d.Q.gained, res: d.Q.res, best: d.save.quizBest[1], today: d.save.quizAmber };
  });
  expect(r.log).toEqual([100, 101, 102, 105, 108, 111]);
  expect(r).toMatchObject({ phase: 'done', first: 3, perfect: false, gained: 11, res: ['help', 'help', 'gold', 'gold', 'gold'], best: 3, today: 11 });
});

test('quiz: a perfect round pays the bonus and sets the record; the daily cap stops the payout, not the game', async ({ game }) => {
  await game.open({ amber: 0 });
  const r = await game.eval(() => {
    const d = window.__dino, run = () => { d.startQuiz(0); for (let i = 0; i < 5; i++) { const o = d.Q.o; d.answer(o.r.ok, o); d.quizNext(); } return { amber: d.save.amber, gained: d.Q.gained, bonus: d.Q.bonus, capped: d.Q.capped, perfect: d.Q.perfect, newBest: d.Q.newBest }; };
    const a = run(), b = run(), c = run();
    return { a, b, c, left: d.quizLeft(), best: d.save.quizBest[0], day: d.save.quizDay === d.dayKey() };
  });
  expect(r.a).toEqual({ amber: 20, gained: 20, bonus: 5, capped: false, perfect: true, newBest: true });
  expect(r.b).toEqual({ amber: 40, gained: 20, bonus: 5, capped: false, perfect: true, newBest: false });
  expect(r.c).toMatchObject({ amber: 40, gained: 0, capped: true, perfect: true }); // 40 a day is the cap
  expect(r.left).toBe(0);
  expect(r.best).toBe(5);
  expect(r.day).toBe(true);
});

test('quiz: the cap resets on a new day', async ({ game }) => {
  await game.open({ quizDay: 20200101, quizAmber: 40, amber: 0 });
  const r = await game.eval(() => { const d = window.__dino; return { left: d.quizLeft() }; });
  expect(r.left).toBe(40);
});

test('quiz: every screen draws without errors, including the tablet drop-in and the result', async ({ game, page }) => {
  await game.open();
  await game.eval(() => window.__dino.openQuizPicker());
  await page.waitForTimeout(300);
  await game.eval(() => window.__dino.startQuiz(-1));
  await page.waitForTimeout(900);
  await game.eval(() => { const d = window.__dino, o = d.Q.o; d.answer([0, 1, 2].find(i => i !== o.r.ok), o); });
  await page.waitForTimeout(300);
  await game.eval(() => { const d = window.__dino; for (let i = 0; i < 5; i++) { const o = d.Q.o; if (!o.solved) d.answer(o.r.ok, o); d.quizNext(); } });
  await page.waitForTimeout(600);
  const ph = await game.eval(() => window.__dino.Q.phase);
  expect(ph).toBe('done');
  expect(game.errors).toEqual([]);
});

test('quiz: broken quiz fields in the save fall back to defaults', async ({ game }) => {
  await game.open({ quizSeen: 'x', quizBest: [null, 'a'], quizDay: 'now', quizAmber: {} });
  const r = await game.eval(() => { const s = window.__dino.save; return { seen: s.quizSeen.length, best: s.quizBest.length, ok: s.quizBest.every(Number.isFinite), day: s.quizDay, amber: s.quizAmber }; });
  expect(r).toEqual({ seen: 8, best: 9, ok: true, day: 0, amber: 0 });
});

test('quiz: Götti\'s lines fit his speech bubble', async ({ game }) => {
  await game.open();
  const wide = await game.eval(() => { setFont(20); return [QUIZ_SAY.first, ...QUIZ_SAY.hard, ...QUIZ_SAY.next].filter(t => ctx.measureText(t).width > 168); });
  expect(wide).toEqual([]);
  // the title plaque (x 338) must end before the Tipp button (x 612)
  const tw = await game.eval(() => { setFont(22); return Math.max(...['Göttis Quiz · 5 / 5', 'Göttis Rätsel-Tor'].map(t => 338 + ctx.measureText(t).width + 34)); });
  expect(tw).toBeLessThan(606);
});

test('quiz: a question pays once and cannot be skipped by a double tap', async ({ game }) => {
  await game.open({ amber: 0 });
  const r = await game.eval(() => {
    const d = window.__dino; d.startQuiz(3);
    const o = d.Q.o; d.quizNext(); const before = d.Q.i; // not solved yet: ignored
    d.answer(o.r.ok, o); d.answer(o.r.ok, o); // two taps in one frame
    const paid = d.save.amber; d.quizNext(); d.quizNext();
    return { before, paid, i: d.Q.i, res: d.Q.res.filter(Boolean).length };
  });
  expect(r).toEqual({ before: 0, paid: 3, i: 1, res: 1 });
});

test('quiz: the result screen ignores taps for a moment, and Beenden asks twice', async ({ game, page }) => {
  await game.open();
  await game.eval(() => { const d = window.__dino; d.startQuiz(0); });
  await page.waitForTimeout(800);
  // first tap on Beenden only arms it
  const quit = await game.eval(() => { const d = window.__dino, b = () => d.buttons.find(x => x.label === 'Beenden' || x.label === 'Sicher?'); b().cb(); return new Promise(res => setTimeout(() => { const s = b(); res({ label: s.label, phase: d.Q.phase }); }, 80)); });
  expect(quit).toEqual({ label: 'Sicher?', phase: 'ask' });
  const left = await game.eval(() => { const d = window.__dino; d.buttons.find(x => x.label === 'Sicher?').cb(); return d.Q.phase; });
  expect(left).toBe('pick');
  // a finished round: no result button for the first 0.7 s
  await game.eval(() => { const d = window.__dino; d.startQuiz(0); for (let i = 0; i < 5; i++) { const o = d.Q.o; d.answer(o.r.ok, o); d.quizNext(); } });
  await page.waitForTimeout(150);
  expect(await game.eval(() => window.__dino.buttons.length)).toBe(0);
  await page.waitForTimeout(800);
  expect(await game.eval(() => window.__dino.buttons.map(b => b.label))).toEqual(['Nochmal!', 'Anderes Thema', 'Kalender']);
});

test('quiz: every theme draws its question and its solved screen', async ({ game, page }) => {
  await game.open();
  for (let wi = 0; wi < 8; wi++) {
    await game.eval(w => { const d = window.__dino; d.startQuiz(w); }, wi);
    await page.waitForTimeout(700);
    await game.eval(() => { const d = window.__dino, o = d.Q.o; d.answer(o.r.ok, o); });
    await page.waitForTimeout(250);
  }
  expect(game.errors).toEqual([]);
});
