'use strict';
// Advent candles: on the four Advent Sundays Rex lights the next candle on the Adventskranz. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// =====================================================================
// Advent candles
// =====================================================================
// The 1st Advent (29 Nov 2026) falls before the calendar opens, so its candle is lit on day 1; the others on the Sundays 6, 13 and 20 Dec.
const CANDLE_DAYS = [1, 6, 13, 20];
const CANDLE_AMBER = [25, 25, 25, 50];
const CANDLE_GY = 452; // feet line of the scene
function candlesDue() { const d = adventDay(); return CANDLE_DAYS.filter(x => d >= x).length; }
const lerp = (a, b, t) => a + (b - a) * t, easeOut = u => 1 - Math.pow(1 - u, 3);
let C = null; // ceremony state: { k (candle to light), t, phase: in | wait | spark | lit | done, talked, wt, sp, litT, fw }

// ---------- trigger: every time the map opens and a candle is due (several missed ones come one after another) ----------
function queueCandle() {
  if (scene !== 'map' || save.candles >= candlesDue()) return;
  if (dialog) { const prev = dialog.done; dialog.done = () => { if (prev) prev(); queueCandle(); }; return; } // wait for the dialog that is already running
  startCandle();
}
function startCandle(replay) { // replay: the boys tap the wreath on the map and Rex lights the last candle again (no amber, nothing saved)
  const k = replay ? clamp(save.candles - 1, 0, 3) : clamp(save.candles, 0, 3);
  if (replay && save.candles < 1) return;
  go('candles');
  C = { k, t: 0, phase: 'in', talked: !!replay, wt: 0, chime: 0, sp: null, litT: 0, fw: 0, replay: !!replay };
  if (!replay) startDialog([
    { who: 'goetti', text: ['Es ist Advent! Am Adventskranz brennt noch keine Kerze. Wir zünden die erste an.', 'Der zweite Advent! Eine Kerze brennt schon – jetzt kommt die zweite dazu.', 'Der dritte Advent! Schon zwei Kerzen brennen. Jetzt kommt die dritte!', 'Der vierte Advent! Nur noch eine Kerze fehlt – dann ist bald Weihnachten!'][k] },
    { who: 'goetti', text: '{rex} darf sie anzünden! Tippt auf den Bildschirm, dann schickt {rex} einen Funken zur Kerze.' },
  ], () => { C.talked = true; }, true);
}
function candleSpark() { // Rex snorts a small spark towards the candle (tap, key or the auto timer)
  if (!C || C.phase !== 'wait') return;
  C.phase = 'spark'; C.sp = { t: 0 }; SFX.spark();
}
const WREATH = { cx: 700, cy: 382, s: 1.1 };
function candleLit() { return !C ? save.candles : C.replay ? (C.phase === 'lit' || C.phase === 'done' ? C.k + 1 : C.k) : save.candles; } // burning candles on show
function candleMouth() { return [C.rx + 118, CANDLE_GY - 92]; }
function candleIgnite() {
  const k = C.k, n = CANDLE_AMBER[k];
  if (!C.replay) { save.candles = k + 1; save.amber += n; writeSave(); } // saved the moment the flame appears
  C.phase = 'lit'; C.litT = 0; SFX.candle(); flashT = 0.3;
  const [wx, wy] = wreathWick(k, WREATH.cx, WREATH.cy, WREATH.s), f = fireOf(save.equip.fire);
  burst(wx, wy, 34, [`rgb(${f.a})`, `rgb(${f.b})`, '#fff'], 260, 300, 5, 1);
  if (k === 3) jingle();
  if (C.replay) return;
  startDialog([
    { who: 'goetti', text: [`Die erste Kerze brennt! Wie schön das leuchtet. Dafür gibt es ${n} Bernstein!`, `Zwei Kerzen brennen! Dafür gibt es ${n} Bernstein!`, `Drei Kerzen brennen! Dafür gibt es ${n} Bernstein!`, 'Alle vier Kerzen brennen! Frohe Adventszeit, {oli} und {fabio}! Dafür gibt es 50 Bernstein!'][k] },
    { who: 'fabio', text: k === 3 ? '{rex} hat alle Kerzen angezündet! Jetzt ist bald Weihnachten!' : 'Juhuu! Das war {rex}s Funke!' },
  ], () => { C.phase = 'done'; }, true);
}
function updateCandles(dt) {
  if (!C) return;
  C.t += dt;
  C.rx = lerp(-170, 330, easeOut(clamp(C.t / 2.3, 0, 1)));
  if (C.phase === 'in' && C.t > 2.4 && C.talked) { C.phase = 'wait'; C.wt = 0; C.chime = 0; }
  else if (C.phase === 'wait') {
    C.wt += dt; if (C.wt > 7) candleSpark(); // auto-light: a small child may not tap
    if ((C.chime -= dt) <= 0) { C.chime = 1.8; tone(1319, 0.5, 'sine', 0.04, null, 0, { att: 0.02 }); tone(1976, 0.6, 'sine', 0.02, null, 0.14, { att: 0.02 }); } // an audio cue as well: Fabio cannot read
  } else if (C.phase === 'spark') {
    C.sp.t += dt; const u = C.sp.t / 0.85, f = fireOf(save.equip.fire), p = sparkPos(u);
    if (Math.random() < 0.9) burst(p[0], p[1], 2, [`rgb(${f.a})`, `rgb(${f.b})`, '#fff'], 60, 80, 4, 0.45);
    if (u >= 1) candleIgnite();
  } else if (C.phase === 'lit' || C.phase === 'done') {
    C.litT += dt; if (C.replay && C.phase === 'lit' && C.litT > 2.2) C.phase = 'done';
    if (C.k === 3) { C.fw -= dt; if (C.fw <= 0) { C.fw = 0.5 + Math.random() * 0.4; const c = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#ea80fc', '#fff']; burst(120 + Math.random() * 720, 60 + Math.random() * 150, 36, [c[Math.floor(Math.random() * 6)], '#fff'], 300, 160, 5, 1.4); tone(300 + Math.random() * 300, 0.3, 'triangle', 0.04, 90); } }
  }
}
function sparkPos(u) { // a flat arc from Rex's mouth to the wick
  const [mx, my] = candleMouth(), [wx, wy] = wreathWick(C.k, WREATH.cx, WREATH.cy, WREATH.s), e = clamp(u, 0, 1);
  return [lerp(mx, wx, e), lerp(my, wy, e) - Math.sin(e * Math.PI) * 50];
}

// ---------- drawing ----------
const WR_RX = 150, WR_RY = 42, WR_H = 78; // ring radii and candle height at scale 1
function wreathCandle(i, cx, cy, s) { // base point of candle i (0..3, left to right) on the front arc of the ring
  const u = [-0.78, -0.27, 0.27, 0.78][i];
  return [cx + u * WR_RX * s, cy + WR_RY * s * Math.sqrt(1 - u * u) - 4 * s];
}
function wreathWick(i, cx, cy, s) { const [x, y] = wreathCandle(i, cx, cy, s); return [x, y - (WR_H + 7) * s]; }
function wreathLeaves(s, front) { // drawn around (0, 0); the back and the front half of the ring are separate layers so the candles can stand between them
  const n = 78, rx = WR_RX * s, ry = WR_RY * s;
  for (let j = 0; j < n; j++) {
    const a = j / n * Math.PI * 2, sn = Math.sin(a); if ((sn > 0.5) !== front) continue;
    const x = Math.cos(a) * rx + (hash(j + 3) - 0.5) * 8 * s, y = sn * ry + (hash(j + 9) - 0.5) * 7 * s, r = (13 + hash(j) * 6) * s, ang = a + Math.PI / 2 + (hash(j + 2) - 0.5) * 0.8;
    circle(x, y, r, '#0f4a2a'); circle(x - r * 0.1, y - r * 0.15, r * 0.82, hash(j + 5) > 0.5 ? '#1f7a43' : '#2a8c4e'); circle(x - r * 0.3, y - r * 0.4, r * 0.3, '#52b070');
    ctx.strokeStyle = '#0f4a2a'; ctx.lineWidth = Math.max(1, 1.6 * s); ctx.lineCap = 'round'; // a few needles sticking out
    for (let q = -1; q <= 1; q++) { const aa = ang + q * 0.7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(aa) * r * 1.5, y + Math.sin(aa) * r * 1.0); ctx.stroke(); }
    const d = hash(j + 20);
    if (d > 0.9) { circle(x + r * 0.3, y, 3.6 * s, '#b71c1c'); circle(x + r * 0.2, y - 1 * s, 1.3 * s, '#ff8a80'); }
    else if (d < 0.07) { circle(x, y, 5 * s, '#a67c10'); circle(x, y, 4 * s, '#ffd34d'); circle(x - 1.4 * s, y - 1.4 * s, 1.5 * s, '#fff6c0'); } // gold bauble
  }
}
const wreathCache = {};
function wreathLayer(s, front) { // the leaves never change, so each layer is drawn once into a sprite (2x for sharp edges)
  const key = s + (front ? 'f' : 'b');
  if (!wreathCache[key]) {
    const Q = 2, w = Math.ceil((2 * WR_RX + 70) * s), h = Math.ceil((2 * WR_RY + 70) * s), c = document.createElement('canvas'); c.width = w * Q; c.height = h * Q;
    const saved = ctx; ctx = c.getContext('2d'); ctx.scale(Q, Q); ctx.translate(w / 2, h / 2);
    try { wreathLeaves(s, front); } finally { ctx = saved; }
    wreathCache[key] = { c, w, h };
  }
  return wreathCache[key];
}
function blitWreath(cx, cy, s, front) { const l = wreathLayer(s, front); ctx.drawImage(l.c, cx - l.w / 2, cy - l.h / 2, l.w, l.h); }
function drawWreath(cx, cy, s, lit, pulse) { // the Adventskranz with `lit` burning candles (the first ones, left to right); pulse = index of the candle to highlight (or -1)
  const f = fireOf(save.equip.fire);
  blitWreath(cx, cy, s, false);
  for (let i = 0; i < 4; i++) {
    const [x, y] = wreathCandle(i, cx, cy, s), top = y - WR_H * s, w = 8.5 * s, on = i < lit;
    // gold holder cup and a drop of light
    ctx.beginPath(); ctx.moveTo(x - 14 * s, y - 1 * s); ctx.lineTo(x - 10 * s, y - 9 * s); ctx.lineTo(x + 10 * s, y - 9 * s); ctx.lineTo(x + 14 * s, y - 1 * s); ctx.closePath(); ctx.fillStyle = vgrad(y - 9 * s, y, '#ffe27a', '#b07a10'); ctx.fill(); ctx.lineWidth = Math.max(1, 1.6 * s); ctx.strokeStyle = '#6a4400'; ctx.stroke();
    // wax body: shaded cylinder with a shine and, on a burning candle, a drip
    rr(x - w, top, w * 2, WR_H * s - 8 * s, 3 * s); ctx.fillStyle = hgrad(x - w, x + w, '#ef6a62', '#d63a3a', '#9c1f1f'); ctx.fill(); ctx.lineWidth = Math.max(1, 2 * s); ctx.strokeStyle = '#5c1010'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,200,190,.55)'; ctx.fillRect(x - w + 2.5 * s, top + 5 * s, 2.6 * s, (WR_H - 22) * s);
    if (on) { ctx.fillStyle = '#ffd0c8'; ctx.beginPath(); ctx.ellipse(x, top + 1 * s, w - 1 * s, 2.4 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ef6a62'; rr(x + 2.5 * s, top + 1 * s, 3.4 * s, 13 * s, 1.7 * s); ctx.fill(); } // melted rim and a drip
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = Math.max(1, 2 * s); ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top - 7 * s); ctx.stroke();
    const wy = top - 7 * s;
    if (on) {
      const fl = 1 + 0.09 * Math.sin(T * 11 + i * 2) + 0.05 * Math.sin(T * 17 + i), k = 0.72 * s * fl;
      glow(x, wy - 12 * s, 90 * s, f.glow, 0.55 + 0.1 * Math.sin(T * 6 + i)); drawFlameIcon(f, x + Math.sin(T * 7 + i) * 0.8 * s, wy - 20 * k, k);
    } else if (i === pulse) {
      glow(x, wy, 40 * s, '255,230,150', 0.25 + 0.25 * Math.sin(T * 5)); drawStar(x, wy - 34 * s - Math.abs(Math.sin(T * 3)) * 9 * s, 9 * s, '#ffe08a');
    }
  }
  blitWreath(cx, cy, s, true);
  { const bx = cx, by = cy + WR_RY * s + 2 * s; // red bow with two ribbon tails on the front
    ctx.fillStyle = '#c62828'; ctx.strokeStyle = '#6b1414'; ctx.lineWidth = Math.max(1, 1.8 * s); ctx.lineJoin = 'round';
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(bx, by + 1 * s); ctx.lineTo(bx + d * 12 * s, by + 24 * s); ctx.lineTo(bx + d * 4 * s, by + 20 * s); ctx.lineTo(bx + d * 1 * s, by + 28 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + d * 30 * s, by - 24 * s, bx + d * 38 * s, by + 2 * s); ctx.quadraticCurveTo(bx + d * 26 * s, by + 15 * s, bx, by); ctx.fill(); ctx.stroke(); }
    circle(bx, by, 6.5 * s, '#e53935'); ctx.stroke(); circle(bx - 2 * s, by - 2 * s, 2 * s, '#ff8a80'); }
}
function drawCandles() {
  if (!C) { go('map'); return; } // can only happen if the scene was entered without startCandle
  const k = C.k, gy = CANDLE_GY, lit = candleLit();
  ctx.fillStyle = vgrad(0, H, '#071630', '#2c4f7c'); ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 80; i++) { ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(T * 1.3 + i)); circle(hash(i) * W, hash(i + 40) * 300, 1.4, '#fff'); } ctx.globalAlpha = 1;
  drawAurora();
  drawHills(0, '#c9dcf0', 420, 30, 3); pine(880, 456, 250, '#164f33', false); pine(950, 456, 190, '#1b5a3a', false); pine(40, 456, 200, '#164f33', false); drawHills(200, '#e8f0fa', 448, 20, 5);
  ctx.fillStyle = vgrad(448, H, '#e8f0fa', '#cfdcf0'); ctx.fillRect(0, 466, W, H - 466);
  glow(WREATH.cx, WREATH.cy - 30, 340, '255,190,90', Math.min(1, lit / 4) * 0.3); // warm light of the burning candles on the snow
  // the little table with a red runner
  const tx = WREATH.cx, ty = 436;
  for (const dx of [-170, 170]) { rr(tx + dx - 9, ty + 12, 18, 40, 3); ctx.fillStyle = '#6a4424'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2b1a0c'; ctx.stroke(); }
  rr(tx - 200, ty, 400, 16, 5); ctx.fillStyle = vgrad(ty, ty + 16, '#b07a42', '#7a5230'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx - 130, ty + 14); ctx.lineTo(tx + 130, ty + 14); ctx.lineTo(tx + 124, ty + 56); ctx.lineTo(tx - 124, ty + 56); ctx.closePath(); ctx.fillStyle = vgrad(ty, ty + 56, '#d63a3a', '#9c1f1f'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#5c1010'; ctx.stroke();
  ctx.fillStyle = '#ffd34d'; ctx.fillRect(tx - 127, ty + 48, 254, 4); for (let q = 0; q < 12; q++) circle(tx - 118 + q * 21.5, ty + 56, 3, '#ffd34d');
  drawWreath(WREATH.cx, WREATH.cy, WREATH.s, lit, C.phase === 'wait' || C.phase === 'in' ? k : -1);
  // Rex with the boys and Chili
  const walking = C.phase === 'in' && C.t < 2.4, hop = C.phase === 'lit' || C.phase === 'done' ? Math.abs(Math.sin(T * 7)) * 14 : 0;
  shadow(C.rx, gy + 2, 110, 0.2); shadow(C.rx - 190, gy + 4, 28, 0.18);
  oChili(C.rx - 190, gy + 4 - hop * 1.2, 1.4, walking ? T * 8 : (hop ? T * 8 : 0), false);
  const jaw = C.phase === 'spark' ? 0.85 : hop ? 0.3 + 0.3 * Math.sin(T * 5) : 0.08;
  oRex(C.rx, gy - hop, 1.0, walking ? T * 7 : hop ? T * 6 : 0, jaw, Object.assign(rexLook(4), { rider: true }));
  if (C.phase === 'spark') { const p = sparkPos(C.sp.t / 0.85), f = fireOf(save.equip.fire); glow(p[0], p[1], 36, f.glow, 0.9); circle(p[0], p[1], 5, `rgb(${f.a})`); circle(p[0], p[1], 2.5, '#fff'); }
  drawParts(0);
  drawSnow(0.5);
  otxt(`${k + 1}. Advent`, W / 2, 168, 54, '#ffd34d', '#3b1d00', 11);
  if (!C.replay && (C.phase === 'lit' || C.phase === 'done')) { const u = clamp(C.litT / 1.2, 0, 1); ctx.globalAlpha = 1 - clamp((C.litT - 2.5) / 1, 0, 1); drawAmber(W / 2 - 50, 232 - 24 * u, 15); otxt(`+${CANDLE_AMBER[k]}`, W / 2 - 26, 232 - 24 * u, 34, '#ffe08a', 'rgba(0,0,0,.8)', 7, 'left'); ctx.globalAlpha = 1; }
  if (C.phase === 'wait') buttons.push({ x: 0, y: 0, w: W, h: H, cb: candleSpark, silent: true });
  if (C.phase === 'done') button('Weiter', W / 2 - 100, 472, 200, 56, () => go('map'), { size: 28 });
}
