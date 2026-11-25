'use strict';
// Christmas ending. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// =====================================================================
// Christmas ending
// =====================================================================
let E = null;
function startEnding() {
  go('ending');
  E = { phase: 'talk', taps: 0, wob: 0, hatchT: 0, fw: 0, asked: false };
  startDialog([
    { who: 'goetti', text: '{oli}, {fabio}, {rex}, Chili – ihr habt es geschafft! Alle Eier sind wieder sicher in der Station.' },
    { who: 'goetti', text: 'Der Krallenkönig ist weit weggeflogen. Ich glaube, er wollte das Ei nur wärmen – in seiner Höhle war es so kalt.' },
    { who: 'goetti', text: 'Und schaut mal, wer zum Feiern gekommen ist: Mamasaurus und Papasaurus!' },
    { who: 'fabio', text: '{oli}! {oli}! Das goldene Ei wackelt!!' },
    { who: 'goetti', text: 'Tatsächlich! Tippt ganz oft auf das Ei – helft dem Baby beim Schlüpfen!' },
  ], () => { E.phase = 'tap'; }, true);
}
function tapEgg() {
  E.taps++; E.wob = 0.5; SFX.crack(); burst(480, 380, 10, ['#ffd700', '#fff3b0'], 250, 600, 5, 0.6);
  if (E.taps >= 6) { E.phase = 'hatch'; E.hatchT = 0; SFX.right(); SFX.sparkle(); burst(480, 380, 70, ['#ffd700', '#fff', '#ff5252', '#69f0ae'], 520, 500, 8, 1.6); }
}
function treasureLines() {
  const n = save.treasures.reduce((a, b) => a + b, 0), L = [];
  if (save.treasures[3]) L.push({ who: 'kiwi', text: 'Kiwi! Kiwi! (Kiwi will auch mitfeiern.)' });
  if (n === 4) L.push({ who: 'goetti', text: 'Und dank euch habe ich meine Gitarre, mein Velo, meine Angel – und Kiwi wieder! Das beste Weihnachten überhaupt!' });
  else if (n > 0) L.push({ who: 'goetti', text: 'Ein paar meiner verlorenen Sachen habt ihr auch gefunden – danke! Vielleicht entdeckt ihr ja noch den Rest …' });
  else L.push({ who: 'goetti', text: 'Meine Gitarre, mein Velo, meine Angel und mein Kiwi sind leider noch irgendwo da draussen … Vielleicht findet ihr sie ja!' });
  return L;
}
function afterBabyName() {
  startDialog([
    { who: 'mami', text: '{baby}! Was für ein wunderschöner Name!' },
    { who: 'papi', text: 'Willkommen in der Familie, {baby}!' },
    { who: 'fabio', text: 'Hallo {baby}! Ich bin {fabio}. Ich pass auf dich auf!' },
    { who: 'chili', text: 'Mümmel, mümmel! (Chili freut sich riesig.)' },
    ...treasureLines(),
    { who: 'goetti', text: '{baby} kommt ab jetzt bei jedem Abenteuer mit. Und jetzt: Lasst uns Weihnachten feiern!' },
  ], () => { E.phase = 'party'; save.finished = true; writeSave(); jingle(); }, true);
}
function updateEnding(dt) {
  E.wob = Math.max(0, E.wob - dt);
  if (E.phase === 'hatch') {
    E.hatchT += dt;
    if (E.hatchT > 1.6 && !E.asked) {
      E.asked = true;
      if (!save.babyName) startDialog([{ who: 'goetti', text: 'Ein Dino-Baby – mit Weihnachtsmütze! {fabio}, du hast das Ei als Erster wackeln sehen. Du darfst ihm einen Namen geben!' }], () => askName('Wie soll das Dino-Baby heissen?', 'Krümel', n => { save.babyName = n; writeSave(); afterBabyName(); }), true);
      else startDialog([{ who: 'goetti', text: 'Möchtest du dem Dino-Baby einen neuen Namen geben? Wenn nicht, tippe einfach auf OK.' }], () => askName('Wie soll das Dino-Baby heissen?', save.babyName, n => { save.babyName = n; writeSave(); afterBabyName(); }, null, true), true);
    }
  }
  if (E.phase === 'party') { E.fw -= dt; if (E.fw <= 0) { E.fw = 0.45 + Math.random() * 0.4; const c = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#ea80fc', '#fff']; burst(120 + Math.random() * 720, 60 + Math.random() * 150, 40, [c[Math.floor(Math.random() * 6)], '#fff'], 300, 160, 5, 1.5); tone(200 + Math.random() * 200, 0.3, 'triangle', 0.04, 80); } }
}
function drawEnding() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#071630'); g.addColorStop(1, '#2c4f7c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 80; i++) { ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(T * 1.3 + i)); circle(hash(i) * W, hash(i + 40) * 300, 1.4, '#fff'); } ctx.globalAlpha = 1;
  drawAurora();
  { const mg = ctx.createRadialGradient(860, 80, 20, 860, 80, 130); mg.addColorStop(0, 'rgba(240,240,220,.35)'); mg.addColorStop(1, 'rgba(240,240,220,0)'); ctx.fillStyle = mg; ctx.fillRect(730, 0, 230, 210); }
  circle(860, 80, 34, '#f4f1de'); circle(850, 72, 6, 'rgba(0,0,0,.06)'); circle(868, 92, 4.5, 'rgba(0,0,0,.06)');
  drawVolcano(700, 448, 0.82, '#2a3c5c', 0);
  drawHills(0, '#c9dcf0', 420, 30, 3);
  endingSnow();
  // Götti's station, the same hut as in the story, in its winter dress
  drawStation(120, 452, 0.6); stationWinter(120, 452, 0.6);
  pine(268, 452, 210, '#1f6b42', true);
  if (save.treasures[1]) drawBike(95, 452, 0.95);
  if (save.treasures[2]) drawRod(222, 418, 1, T * 3);
  rr(230, 425, 30, 26, 3); ctx.fillStyle = '#d63a3a'; ctx.fill(); ctx.fillStyle = '#ffd740'; ctx.fillRect(243, 425, 5, 26);
  rr(280, 432, 26, 20, 3); ctx.fillStyle = '#40a4ff'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(291, 432, 4, 20);
  // family (right)
  for (const [sx, sw] of [[790, 50], [895, 56], [640, 52], [395, 24], [325, 30], [570, 20]]) shadow(sx, 454, sw, 0.18);
  oLong(800, 452, 0.72, '#b07cc6', T * 2, true);
  oLong(905, 452, 0.8, '#4f8fd6', T * 2 + 1, true);
  oGoetti(325, 452, 1.1, E.phase === 'party' && !save.treasures[0]);
  if (save.treasures[0]) drawGuitar(332, 372 + (E.phase === 'party' ? Math.sin(T * 8) * 2 : 0), 0.85, -1.05);
  if (save.treasures[3]) oKiwi(572, 454 - (E.phase === 'party' ? Math.abs(Math.sin(T * 9 + 1)) * 16 : 0), 1.25, T * 8, true);
  oRex(640, 452, 1.0, E.phase === 'party' ? T * 6 : 0, E.phase === 'party' ? 0.3 + 0.3 * Math.sin(T * 5) : 0.1, Object.assign(rexLook(2), { rider: true, flip: true, hat: rexLook(2).hat || 'santa', hat2: rexLook(2).hat2 || 'santa' }));
  oChili(395, 456 - (E.phase === 'party' ? Math.abs(Math.sin(T * 8)) * 18 : 0), 1.4, T * 6, false);
  // nest + egg
  ell(480, 445, 62, 16, 0, '#7a5230');
  ctx.strokeStyle = '#a0703a'; ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(424 + i * 13, 435 + (i % 2) * 6); ctx.lineTo(436 + i * 13, 452 - (i % 2) * 8); ctx.stroke(); }
  if (E.phase === 'talk' || E.phase === 'tap') {
    const rot = Math.sin(T * (E.phase === 'tap' ? 9 : 4)) * (0.06 + E.wob * 0.5);
    drawEgg(480, 395, 46, '#ffd700', '#e0a800', 0.9 + 0.3 * Math.sin(T * 4), rot);
    ctx.save(); ctx.translate(480, 395); ctx.rotate(rot); ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 3; ctx.beginPath(); let cx = -30, cy = -6; ctx.moveTo(cx, cy);
    for (let i = 0; i < E.taps * 2; i++) { cx += 6; cy += i % 2 ? 9 : -9; ctx.lineTo(cx, cy); } ctx.stroke(); ctx.restore();
    if (E.phase === 'tap') { otxt('Tippe auf das Ei!', 480, 290, 34, '#ffd34d', '#3b1d00', 8); buttons.push({ x: 0, y: 0, w: W, h: H, cb: tapEgg, silent: true }); }
  } else {
    const s = Math.min(1, E.hatchT * 2 + 0.01);
    ctx.save(); ctx.translate(480, 436); ctx.scale(s, s);
    drawEgg(-40, 0, 20, '#ffd700', '#e0a800', 0, -0.6); drawEgg(40, 0, 20, '#ffd700', '#e0a800', 0, 0.6);
    drawBaby(0, -Math.abs(Math.sin(T * 5)) * (E.phase === 'party' ? 14 : 4), 1.5, T * 5);
    ctx.restore();
  }
  drawParts(0);
  drawSnow(1);
  if (E.phase === 'party') {
    ctx.save(); ctx.translate(W / 2, 82); ctx.rotate(Math.sin(T * 2) * 0.02);
    otxt('Frohe Weihnachten,', 0, 0, 56, '#ffd34d', '#7a1010', 13); otxt(fmt('{oli} und {fabio}!'), 0, 58, 50, '#ffd34d', '#7a1010', 12); ctx.restore();
    otxt('Alles Liebe – euer Götti', W / 2, 190, 28, '#fff', 'rgba(0,0,0,.7)', 6);
    button('Lied nochmal', 24, 20, 180, 50, () => jingle(), { size: 20, color: '#e0d2b0' });
    button('Zum Kalender', W - 204, 20, 180, 50, () => go('map'), { size: 22 });
  }
}
