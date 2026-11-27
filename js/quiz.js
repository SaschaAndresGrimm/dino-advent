'use strict';
// Götti-Quiz: a standalone round of five riddles (scene 'quiz'), playable without running a level. It reuses the stone tablet of the level gates
// (drawRiddleTablet, answer) and the riddle pools in WORLDS[i].riddles. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// =====================================================================
// Götti-Quiz
// =====================================================================
const QUIZ_LEN = 5, QUIZ_TIERS = [1, 2, 2, 3, 3]; // a round warms up with an easy riddle and ends with two hard ones (difficulty `d` of the riddle)
const QUIZ_PTS = 3, QUIZ_HELP_PTS = 1, QUIZ_PERFECT = 5, QUIZ_DAILY_CAP = 40; // amber: right first time / right after a miss or the hint / all five first time / most the quiz pays per day
const QUIZ_SAY = { first: 'Quiz-Zeit!', hard: ['Jetzt knifflig!', 'Harter Brocken!'], next: ['Nächstes Rätsel!', 'Weiter geht’s!'] }; // Götti's lines: they must fit his speech bubble (tests check the width)
let Q = null; // { phase: 'pick' | 'ask' | 'done', wi (-1 = mixed), qs: [{ wi, k }], i, o (the question being asked), res: ['gold' | 'help' | ''], gained, ... }

function quizThemes() { return WORLDS.map((_, i) => i).filter(themeOpenForEndless); } // themes whose riddles the boys have already met
function quizLeft() { return Math.max(0, QUIZ_DAILY_CAP - (save.quizDay === dayKey() ? save.quizAmber : 0)); } // amber the quiz can still pay today
function openQuizPicker() { go('quiz'); Q = { phase: 'pick' }; }
function startQuiz(wi) { // wi: a theme, or -1 for a mixed round over every open theme
  if (scene !== 'quiz') go('quiz');
  let themes = wi >= 0 ? [wi] : quizThemes(); if (!themes.length) themes = [0];
  if (wi < 0) themes = themes.slice().sort(() => Math.random() - 0.5); // mixed: every open theme once before one comes twice
  const qs = [], seen = save.quizSeen;
  for (let i = 0; i < QUIZ_LEN; i++) {
    const t = themes[i % themes.length], pool = WORLDS[t].riddles;
    const pk = pickRiddle(pool, [QUIZ_TIERS[i]], seen[t] || [], qs.filter(q => q.wi === t).map(q => q.k));
    seen[t] = pk.seen; qs.push({ wi: t, k: pk.k });
  }
  writeSave();
  Q = { phase: 'ask', wi, qs, i: 0, o: null, res: ['', '', '', '', ''], gained: 0, bonus: 0, capped: false };
  quizAsk(0);
}
function quizAsk(i) {
  const q = Q.qs[i], r = WORLDS[q.wi].riddles[q.k];
  const line = i === 0 ? QUIZ_SAY.first : pick(i >= 3 ? QUIZ_SAY.hard : QUIZ_SAY.next);
  Q.i = i; toasts = [];
  Q.o = { type: 'riddle', quiz: true, wi: q.wi, r, order: [0, 1, 2].sort(() => Math.random() - 0.5), wrong: [], msg: '', shake: 0, solved: false, lock: 0, hinted: false, t: 0, tries: 0, say: { who: 'goetti', text: line, at: 0.55, t: 2.2 } };
  SFX.tabletThud();
}
function quizPay(n) { // pays amber and respects the daily cap (a kind limit: it stops the quiz from being an amber press, never the playing)
  if (save.quizDay !== dayKey()) { save.quizDay = dayKey(); save.quizAmber = 0; }
  const give = Math.max(0, Math.min(n, QUIZ_DAILY_CAP - save.quizAmber));
  save.quizAmber += give; save.amber += give; Q.gained += give; if (give < n) Q.capped = true; writeSave();
  return give;
}
function quizSolved(o) { // called by answer() when the right answer was tapped; pays once per question even if two taps arrive in the same frame
  if (o.pts != null) return;
  const first = o.tries === 0 && !o.hinted;
  Q.res[Q.i] = first ? 'gold' : 'help';
  o.pts = quizPay(first ? QUIZ_PTS : QUIZ_HELP_PTS); // shown next to the Weiter button
}
function quizNext() { // only after the question was solved, so a double tap cannot skip one
  if (!Q || Q.phase !== 'ask' || !Q.o || !Q.o.solved) return;
  if (Q.i < QUIZ_LEN - 1) quizAsk(Q.i + 1); else quizFinish();
}
function quizFinish() {
  const first = Q.res.filter(r => r === 'gold').length, bi = Q.wi < 0 ? 8 : Q.wi;
  Q.first = first; Q.perfect = first === QUIZ_LEN;
  if (Q.perfect) Q.bonus = quizPay(QUIZ_PERFECT);
  Q.prevBest = save.quizBest[bi] || 0; Q.newBest = first > Q.prevBest; if (Q.newBest) save.quizBest[bi] = first;
  Q.phase = 'done'; Q.o = null; Q.t = 0; Q.popped = []; writeSave(); toasts = []; SFX.victory(Q.perfect);
}

// ---------- art: theme emblems, landmarks and the backdrop ----------
function emblemProp(wi) { // a landmark in a 100 x 100 box, standing on y = 84 (emblems draw it small, the quiz backdrop scales it up behind Götti)
  const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (wi) {
    case 0: // palm tree with coconuts
      ctx.strokeStyle = '#5b3b22'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(40, 86); ctx.quadraticCurveTo(52, 66, 47, 38); ctx.stroke();
      for (const a of [-2.7, -2.0, -1.3, -0.6, 0.15]) { ctx.save(); ctx.translate(47, 38); ctx.rotate(a); ell(14, 0, 16, 4.6, 0, '#2c8a3a'); ell(14, -1, 11, 1.8, 0, '#62c45e'); ctx.restore(); }
      circle(45, 42, 3.2, '#6b4a2b'); circle(51, 43, 3.2, '#5b3b22'); poly([[62, 86], [66, 66], [70, 86]], '#3f9a3a'); poly([[72, 86], [76, 70], [80, 86]], '#2f7a30'); break;
    case 1: // red mesas with layers
      poly([[22, 86], [27, 56], [36, 50], [58, 50], [66, 56], [70, 86]], '#c4622d'); poly([[50, 86], [56, 64], [66, 58], [84, 60], [90, 86]], '#a84a24');
      ctx.fillStyle = 'rgba(255,215,160,.38)'; ctx.fillRect(28, 60, 36, 3); ctx.fillRect(26, 70, 42, 3); ctx.fillStyle = 'rgba(80,30,10,.3)'; ctx.fillRect(55, 72, 34, 3); break;
    case 2: // ice peaks with snow caps
      poly([[8, 86], [36, 32], [64, 86]], '#8fb4d4'); poly([[36, 32], [27, 52], [33, 47], [38, 55], [43, 47], [46, 52]], '#f6faff'); poly([[48, 86], [68, 48], [90, 86]], '#a8c8e2'); poly([[68, 48], [61, 60], [66, 56], [70, 62], [75, 57]], '#f6faff'); break;
    case 3: // volcano with a glowing crater, lava and smoke
      poly([[16, 86], [40, 42], [62, 42], [86, 86]], '#4a2a24'); poly([[40, 42], [62, 42], [57, 47], [45, 47]], '#ff8a20'); poly([[48, 46], [56, 46], [58, 62], [54, 76], [50, 64]], '#ff6a10'); poly([[51, 47], [54, 47], [54, 58], [52, 56]], '#ffd060');
      for (const [sx, sy, sr] of [[50, 33, 7], [57, 25, 6], [49, 18, 5]]) { ctx.globalAlpha = 0.55; circle(sx, sy, sr, '#7a6a6a'); } ctx.globalAlpha = 1; break;
    case 4: // snowy Christmas tree with a star
      ctx.fillStyle = '#5b3b22'; ctx.fillRect(46, 78, 8, 8); poly([[50, 24], [35, 50], [65, 50]], '#2c7a3a'); poly([[50, 38], [30, 66], [70, 66]], '#2f8a40'); poly([[50, 54], [25, 84], [75, 84]], '#34984a');
      poly([[50, 24], [44, 34], [57, 34]], '#f6faff'); poly([[50, 38], [40, 52], [60, 52]], 'rgba(246,250,255,.7)'); drawStar(50, 22, 6, '#ffd34d'); for (const [bx, by, bc] of [[42, 60, '#e83a4a'], [58, 62, '#ffd34d'], [50, 72, '#e83a4a'], [37, 76, '#5ab0ff'], [63, 77, '#ffd34d'], [48, 46, '#e83a4a']]) circle(bx, by, 2.6, bc); break;
    case 5: // striped beach parasol and a sandcastle
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(40, 86); ctx.lineTo(40, 38); ctx.stroke();
      for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#ffffff' : '#e8505a'; ctx.beginPath(); ctx.moveTo(40, 40); ctx.arc(40, 40, 27, Math.PI + k * Math.PI / 4, Math.PI + (k + 1) * Math.PI / 4); ctx.closePath(); ctx.fill(); }
      poly([[60, 86], [60, 70], [64, 70], [64, 66], [68, 66], [68, 70], [72, 70], [72, 66], [76, 66], [76, 70], [80, 70], [80, 86]], '#e8cf94'); poly([[68, 66], [72, 60], [72, 66]], '#e85a4a'); break;
    case 6: // coral and a fish
      ctx.strokeStyle = '#e8588a'; ctx.lineWidth = 4; for (const [cx2, ch] of [[26, 32], [36, 44], [46, 28]]) { ctx.beginPath(); ctx.moveTo(cx2, 86); ctx.lineTo(cx2, 86 - ch); ctx.moveTo(cx2, 86 - ch * 0.5); ctx.lineTo(cx2 + 8, 86 - ch * 0.75); ctx.moveTo(cx2, 86 - ch * 0.35); ctx.lineTo(cx2 - 7, 86 - ch * 0.6); ctx.stroke(); }
      ell(80, 24, 11, 7, 0, '#ff9a3a'); poly([[69, 24], [60, 17], [60, 31]], '#ff7a20'); circle(85, 22, 2, '#fff'); circle(85.6, 22, 0.9, '#222'); ell(80, 28, 7, 2.2, 0, 'rgba(255,255,255,.4)');
      for (const [bx, by, br] of [[88, 12, 2.6], [84, 6, 2], [90, 4, 1.6]]) { ctx.strokeStyle = 'rgba(235,252,255,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke(); } break;
    case 7: // grey peaks, snow caps and a pine
      poly([[6, 86], [34, 34], [62, 86]], '#7f8aa0'); poly([[34, 34], [26, 50], [32, 46], [36, 53], [41, 46], [44, 50]], '#f6faff'); poly([[44, 86], [66, 46], [92, 86]], '#98a4b8'); poly([[66, 46], [59, 58], [65, 54], [69, 60], [74, 55]], '#f6faff');
      ctx.fillStyle = '#5b3b22'; ctx.fillRect(18, 78, 3, 8); poly([[19.5, 56], [12, 70], [27, 70]], '#2f6a3a'); poly([[19.5, 64], [10, 80], [29, 80]], '#2c5e34'); break;
  }
}
function drawEmblem(wi, cx, cy, r) { // a round badge of the theme's landscape: sky, hills, ground and its landmark, in a gold ring
  const th = WORLDS[wi];
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip(); ctx.translate(cx - r, cy - r); ctx.scale(r / 50, r / 50);
  const g = ctx.createLinearGradient(0, 0, 0, 90); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, 100, 100);
  if (wi !== 6) { const sg = ctx.createRadialGradient(74, 26, 1, 74, 26, 22); sg.addColorStop(0, 'rgba(255,244,200,.95)'); sg.addColorStop(0.4, 'rgba(255,244,200,.4)'); sg.addColorStop(1, 'rgba(255,244,200,0)'); ctx.fillStyle = sg; ctx.fillRect(40, 0, 60, 60); }
  for (const [col, base, amp, ph] of [[th.far, 66, 9, 0.8], [th.mid, 74, 6, 2.2]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 100); for (let x = 0; x <= 100; x += 5) ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(x * 0.07 + ph))); ctx.lineTo(100, 100); ctx.closePath(); ctx.fill(); }
  emblemProp(wi);
  ctx.fillStyle = th.ground; ctx.fillRect(0, 84, 100, 20); ctx.fillStyle = th.top; ctx.fillRect(0, 84, 100, 3.5);
  ctx.restore();
  ctx.lineWidth = Math.max(2.5, r * 0.11); ctx.strokeStyle = '#5b3b14'; ctx.beginPath(); ctx.arc(cx, cy, r + 0.5, 0, Math.PI * 2); ctx.stroke();
  const rg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); rg.addColorStop(0, '#fff0b0'); rg.addColorStop(0.5, '#e0a82a'); rg.addColorStop(1, '#8a5a10'); ctx.lineWidth = Math.max(1.6, r * 0.06); ctx.strokeStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, r + 0.5, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = Math.max(1.2, r * 0.05); ctx.beginPath(); ctx.arc(cx, cy, r - r * 0.12, 3.5, 4.8); ctx.stroke(); // gloss on the glass
}
const QUIZ_FX = [['drift', '#fff3a0'], ['drift', '#e8b878'], ['fall', '#ffffff'], ['rise', '#ff9a40'], ['fall', '#ffffff'], ['twinkle', '#ffffff'], ['bubble', '#e8fbff'], ['fall', '#ffffff']]; // what floats through each theme's air
function drawQuizBackdrop(wi) { // the theme's landscape behind Götti: sky, a glowing sun, hills, the big landmark, a textured ground and floating particles; the mixed round and the menus get a night sky
  const th = wi >= 0 ? WORLDS[wi] : null, g = ctx.createLinearGradient(0, 0, 0, H);
  if (th) { g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); } else { g.addColorStop(0, '#0a1230'); g.addColorStop(0.6, '#2a3d74'); g.addColorStop(1, '#6f86b8'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const sg = ctx.createRadialGradient(150, 130, 10, 150, 130, 320); sg.addColorStop(0, th ? 'rgba(255,240,190,.5)' : 'rgba(190,210,255,.28)'); sg.addColorStop(1, 'rgba(255,240,190,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  if (!th) { circle(790, 90, 34, 'rgba(240,244,255,.9)'); circle(778, 82, 30, '#c9d4ee'); for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(T * 0.9 + i)); circle(hash(i + 3) * W, hash(i + 11) * 300, 1 + hash(i) * 1.4, '#fff'); } ctx.globalAlpha = 1; }
  for (const [col, amp, base, ph, f] of [[th ? th.far : '#1c2a54', 64, 408, 0.7, 0.011], [th ? th.mid : '#141f42', 46, 446, 2.1, 0.017]]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(x * f + ph)) - amp * 0.4 * Math.sin(x * f * 2.3 + ph * 3));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  if (th) {
    ctx.save(); ctx.translate(-36, 482 - 84 * 2.7); ctx.scale(2.7, 2.7); emblemProp(wi); ctx.restore(); // the landmark towers behind Götti
    ctx.fillStyle = th.ground; ctx.fillRect(0, 480, W, H - 480); ctx.fillStyle = th.top; ctx.fillRect(0, 480, W, 9); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 489, W, 3);
    for (let x = 6; x < W; x += 26) { ctx.fillStyle = th.dots; ctx.globalAlpha = 0.5; ctx.fillRect(x + hash(x) * 10, 498 + hash(x + 5) * 28, 3 + hash(x + 2) * 4, 2); ctx.globalAlpha = 1; ctx.fillStyle = th.top; ctx.beginPath(); ctx.moveTo(x, 480); ctx.lineTo(x + 4, 473 - hash(x + 1) * 5); ctx.lineTo(x + 8, 480); ctx.fill(); }
  }
  const [mode, col] = th ? QUIZ_FX[wi] : ['twinkle', '#fff'];
  for (let i = 0; i < 24; i++) {
    const x0 = hash(i * 7 + 1) * W, y0 = hash(i * 5 + 3) * 470, sp = 18 + hash(i + 40) * 26, sz = 1.6 + hash(i) * 2.2;
    let x = x0, y = y0, al = 0.75;
    if (mode === 'fall') { y = (y0 + T * sp) % 470; x = x0 + Math.sin(T * 0.9 + i) * 14; } else if (mode === 'rise' || mode === 'bubble') { y = (((y0 - T * sp) % 470) + 470) % 470; x = x0 + Math.sin(T * 1.3 + i) * 8; al = 0.35 + 0.5 * (y / 470); }
    else if (mode === 'drift') { x = (x0 + T * sp * 0.6) % W; y = y0 * 0.8 + 40 + Math.sin(T * 0.8 + i) * 16; al = 0.35 + 0.5 * Math.abs(Math.sin(T * 1.7 + i)); } else al = 0.2 + 0.7 * Math.abs(Math.sin(T * 1.8 + i));
    ctx.globalAlpha = al; if (mode === 'bubble') { ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, sz + 1.5, 0, Math.PI * 2); ctx.stroke(); } else circle(x, y, sz, col);
  }
  ctx.globalAlpha = 1;
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); // soft vignette
}
function quizHeroes() { // Götti and Chili stand at the sides of the menus
  shadow(68, 508, 56, 0.35); oGoetti(68, 504, 1.15, true);
  shadow(892, 510, 24, 0.3); oChili(892, 506 - Math.abs(Math.sin(T * 5)) * 4, 0.85, T * 12, true);
}
function quizCard(i, x, y, w, h) { // a theme card: the emblem, the name and the record as five stars
  const th = WORLDS[i], open = themeOpenForEndless(i), best = save.quizBest[i] || 0, cx = x + w / 2;
  buttons.push({ x, y, w, h, label: th.name, cb: () => { if (open) startQuiz(i); else { SFX.wrong(); toast('Erst ein Level dieses Themas schaffen!', '#ffb4a8'); } } });
  plateBody(x, y, w, h, 20, open ? 0 : 1);
  ctx.globalAlpha = open ? 1 : 0.4; drawEmblem(i, cx, y + 41, 32); ctx.globalAlpha = 1;
  if (!open) ico('lock', cx, y + 41, 28);
  txt(th.name, cx, y + 87, 20, open ? '#2b1a00' : '#7a705a');
  for (let k = 0; k < QUIZ_LEN; k++) drawStar(cx - 32 + k * 16, y + 106, 6.5, k < best ? '#e8a010' : 'rgba(90,60,20,.25)');
}
function drawQuizPicker() {
  drawQuizBackdrop(-1); quizHeroes();
  panel(150, 24, 660, 492); txt('Götti-Quiz', W / 2, 62, 40, '#3b2410'); txt('Fünf Rätsel pro Runde – schaffst du alle gleich beim ersten Mal?', W / 2, 96, 17, '#6b4a2b', 'center', 'normal');
  WORLDS.forEach((th, i) => quizCard(i, 169 + (i % 4) * 158, 112 + Math.floor(i / 4) * 136, 148, 126));
  { const b = save.quizBest[8] || 0; button('Alle Themen gemischt' + (b ? ' · ' + b + ' von 5' : ''), 180, 384, 600, 44, () => startQuiz(-1), { size: 21, color: '#ffb27a', icon: icon('star') }); }
  const left = quizLeft();
  txt(left > 0 ? `3 Bernstein für jede Antwort, die du gleich weisst. Heute noch bis zu ${left} zu holen!` : 'Für heute ist der Quiz-Bernstein aufgebraucht – spielen darfst du trotzdem!', W / 2, 446, 15, '#8a5a00', 'center', 'normal');
  button('Zurück', W / 2 - 80, 458, 160, 40, () => go('map'), { size: 20, color: '#e0d2b0', icon: icon('back') });
}
function drawQuizAsk() {
  const o = Q.o;
  drawQuizBackdrop(o.wi);
  Q.quitT = Math.max(0, (Q.quitT || 0) - DT); // a stray tap must not throw the round away: the first tap asks, the second one (within 3 s) leaves
  button(Q.quitT > 0 ? 'Sicher?' : 'Beenden', 16, 14, 140, 42, () => { if (Q.quitT > 0) openQuizPicker(); else { Q.quitT = 3; SFX.click(); } }, { size: 19, color: Q.quitT > 0 ? '#ffb4a8' : '#e0d2b0', icon: icon('back') });
  drawAmber(34, 86, 13); otxt(String(save.amber), 54, 85, 24, '#ffe08a', '#3b1d00', 6, 'left');
  if (Q.gained > 0) otxt(`+${Q.gained} im Quiz`, 24, 120, 17, '#fff3c4', '#3b1d00', 5, 'left');
  drawRiddleTablet(o, { title: `Göttis Quiz · ${Q.i + 1} / ${QUIZ_LEN}`, wi: o.wi, emblem: true, dim: 0.22, doneLabel: Q.i < QUIZ_LEN - 1 ? 'Weiter' : 'Fertig!', onDone: quizNext, pips: Q.res, at: Q.i });
  drawParts(0);
}
function drawQuizDone() {
  drawQuizBackdrop(Q.wi); quizHeroes();
  const b0 = buttons.length; Q.t += DT;
  panel(150, 24, 660, 492);
  otxt(Q.perfect ? 'Alle gleich richtig!' : 'Quiz geschafft!', W / 2, 70, 44, '#ffd34d', '#3b1d00', 10);
  { const nm = Q.wi >= 0 ? WORLDS[Q.wi].name : 'Alle Themen gemischt'; setFont(20, 'normal'); const nw = ctx.measureText(nm).width; txt(nm, W / 2 + 22, 114, 20, '#6b4a2b', 'center', 'normal'); if (Q.wi >= 0) drawEmblem(Q.wi, W / 2 - nw / 2 - 2, 114, 18); else drawStar(W / 2 - nw / 2 - 2, 114, 17, '#e8a010'); }
  Q.res.forEach((st, i) => { // the five medals pop in one after the other
    const x = W / 2 - 128 + i * 64, u = Q.t - 0.3 - i * 0.24, sc = u < 0 ? 0 : u < 0.22 ? u / 0.22 * 1.3 : u < 0.36 ? 1.3 - (u - 0.22) / 0.14 * 0.3 : 1, gold = st === 'gold';
    if (u > 0 && !Q.popped[i]) { Q.popped[i] = 1; tone([523, 659, 784, 988, 1175][i], 0.25, 'triangle', 0.12); burst(x, 172, gold ? 20 : 10, gold ? ['#ffd34d', '#fff', '#e8a317'] : ['#dfe6ee', '#fff'], 260, 420, 5, 0.8); }
    if (sc <= 0) { circle(x, 172, 25, 'rgba(90,60,20,.18)'); return; }
    ctx.save(); ctx.translate(x, 172); ctx.scale(sc, sc); circle(0, 3, 27, 'rgba(0,0,0,.2)'); circle(0, 0, 27, '#5b3b22');
    const mg = ctx.createRadialGradient(-7, -8, 2, 0, 0, 22); mg.addColorStop(0, gold ? '#fff3b8' : '#ffffff'); mg.addColorStop(1, gold ? '#dc9a08' : '#8f9cac'); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 17, 3.4, 4.9); ctx.stroke(); txt(gold ? '★' : '✓', 0, 1, 26, gold ? '#7a4a00' : '#4a525e'); ctx.restore();
  });
  if (Q.perfect && Q.t > 1.6 && !Q.conf) { Q.conf = 1; burst(W / 2, 110, 70, ['#ffd740', '#ff5252', '#69f0ae', '#40c4ff', '#fff'], 520, 640, 7, 1.5); SFX.right(); }
  ctx.globalAlpha = clamp((Q.t - 0.9) * 2, 0, 1);
  txt(`${Q.first} von ${QUIZ_LEN} gleich beim ersten Mal richtig`, W / 2, 230, 26, '#3b2410');
  txt(Q.newBest ? 'Neuer Rekord!' : `Rekord: ${Math.max(Q.prevBest, Q.first)} von ${QUIZ_LEN}`, W / 2, 266, 22, Q.newBest ? '#2e7d32' : '#6b4a2b');
  drawAmber(W / 2 - 52, 320, 20); txt(`+${Q.gained}`, W / 2 + 4, 320, 34, '#8a5a00', 'left');
  if (Q.bonus > 0) txt(`Bonus für alle fünf: +${Q.bonus}`, W / 2, 360, 17, '#2e7d32');
  if (Q.capped) txt('Für heute ist der Quiz-Bernstein aufgebraucht – spielen darfst du trotzdem!', W / 2, 390, 15, '#8a5a00', 'center', 'normal');
  else if (!Q.perfect) txt('Silber heisst: mit Tipp oder zweitem Versuch. Mach es gleich richtig für den vollen Bernstein!', W / 2, 390, 14, '#6b4a2b', 'center', 'normal');
  ctx.globalAlpha = 1;
  button('Nochmal!', 190, 424, 190, 58, () => startQuiz(Q.wi), { size: 24 });
  button('Anderes Thema', 392, 424, 230, 58, () => openQuizPicker(), { size: 20, color: '#ffe08a' });
  button('Kalender', 634, 424, 150, 58, () => go('map'), { size: 22, color: '#e0d2b0' });
  if (Q.t < 0.7) buttons.length = b0; // the last Weiter tap must not hit a result button underneath
  drawParts(0);
}
function drawQuiz() {
  if (!Q) Q = { phase: 'pick' };
  if (Q.phase === 'ask') drawQuizAsk(); else if (Q.phase === 'done') drawQuizDone(); else drawQuizPicker();
}
