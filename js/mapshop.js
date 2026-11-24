'use strict';
// Schatzkarte, map, shop. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// ---------- Schatzkarte: three torn pieces, one from each boss, lead to the golden egg ----------
let tmapNew = -1, tmapT = 0, tmapLast = '';
const TM_PATH = [[104, 396], [170, 332], [240, 388], [312, 298], [380, 372], [460, 302], [540, 362], [590, 252], [660, 332], [730, 262], [790, 362], [846, 226]];
const TM_X = [70, 344, 618], TM_W = 268, TM_TOP = 92, TM_BOT = 436;
const tmHave = k => !!save.lvDone[[5, 11, 17][k]];
function tmPiecePath(k) { // a torn rectangle: jagged left and right edges
  const x0 = TM_X[k], x1 = x0 + TM_W, pts = [], n = 12;
  for (let i = 0; i <= n; i++) pts.push([x0 + (k ? 6 : 0) + (hash(k * 31 + i) - 0.5) * 12, TM_TOP + (TM_BOT - TM_TOP) * i / n]);
  for (let i = n; i >= 0; i--) pts.push([x1 - (k < 2 ? 6 : 0) + (hash(k * 57 + i + 9) - 0.5) * 12, TM_TOP + (TM_BOT - TM_TOP) * i / n]);
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
}
function tmRoute(walk, done) { // the route: dino footprints, one dot per day, golden where the player has already been
  const L = []; let tot = 0; for (let i = 1; i < TM_PATH.length; i++) { const d = Math.hypot(TM_PATH[i][0] - TM_PATH[i - 1][0], TM_PATH[i][1] - TM_PATH[i - 1][1]); L.push(d); tot += d; }
  const at = d => { let acc = 0; for (let i = 1; i < TM_PATH.length; i++) { if (acc + L[i - 1] >= d || i === TM_PATH.length - 1) { const u = clamp((d - acc) / L[i - 1], 0, 1), a = TM_PATH[i - 1], b = TM_PATH[i]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0])]; } acc += L[i - 1]; } return TM_PATH[TM_PATH.length - 1]; };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // footprints (alternating left and right) along the whole way
  for (let d = 10, n = 0; d < tot; d += 17, n++) { const [x, y, an] = at(d), walked = d / tot <= walk; ctx.save(); ctx.translate(x, y); ctx.rotate(an); ctx.translate(0, n % 2 ? 4 : -4); ctx.fillStyle = walked ? 'rgba(210,150,10,.95)' : 'rgba(110,60,20,.55)'; ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 2.6, 0, 0, 7); ctx.fill(); for (const ty of [-2.6, 0, 2.6]) { ctx.beginPath(); ctx.ellipse(4.4, ty, 1.6, 1.1, 0, 0, 7); ctx.fill(); } ctx.restore(); }
  // one dot per day; the four boss days are red stars
  for (let i = 0; i < 24; i++) { const [x, y] = at(tot * (i + 0.5) / 24), isBoss = (i + 1) % 6 === 0, ok = i < done; if (isBoss) { drawStar(x, y, 9.5, ok ? '#ffd34d' : '#c0302a'); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(x, y, 9.5, 0, 7); ctx.globalAlpha = 0; ctx.stroke(); ctx.globalAlpha = 1; } else { circle(x, y, 5, ok ? '#ffd34d' : '#f2dfb0'); ctx.lineWidth = 1.6; ctx.strokeStyle = ok ? '#8a5a00' : '#6a3c14'; ctx.stroke(); } }
  const p = at(tot * walk); return [p[0], p[1]];
}
function tmInk(t, x, y, size = 17, col = '#5a2e0c') { // hand-lettered place names, slightly tilted, with a pale halo so they stay readable
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.045); ctx.font = `italic bold ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(246,230,188,.9)'; ctx.lineWidth = 4; ctx.strokeText(t, 0, 0); ctx.fillStyle = col; ctx.fillText(t, 0, 0); ctx.restore();
}
const TM_INK = '#4a2a0c';
function tmWave(x, y, w, n = 3) { ctx.strokeStyle = 'rgba(40,100,160,.75)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; for (let i = 0; i < n; i++) { const wx = x + i * w; ctx.beginPath(); ctx.moveTo(wx - w * 0.4, y); ctx.quadraticCurveTo(wx - w * 0.2, y - w * 0.35, wx, y); ctx.quadraticCurveTo(wx + w * 0.2, y - w * 0.35, wx + w * 0.4, y); ctx.stroke(); } }
function tmTree(x, y, s2 = 1, c = '#3f8a45') { ctx.save(); ctx.translate(x, y); ctx.scale(s2, s2); ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-2, -9, 4, 10); for (const [dx, dy, r] of [[-5, -16, 8], [5, -16, 8], [0, -23, 9]]) { circle(dx, dy, r, c); } ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.5; for (const [dx, dy, r] of [[-5, -16, 8], [5, -16, 8], [0, -23, 9]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, 7); ctx.stroke(); } circle(-2, -26, 3, 'rgba(255,255,255,.3)'); ctx.restore(); }
function tmMountain(x, base, w, h, snow = true) {
  ctx.fillStyle = vgrad(base - h, base, '#a6b4c8', '#6e7f98'); ctx.beginPath(); ctx.moveTo(x - w / 2, base); ctx.lineTo(x - w * 0.05, base - h); ctx.lineTo(x + w / 2, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(40,50,80,.3)'; ctx.beginPath(); ctx.moveTo(x - w * 0.05, base - h); ctx.lineTo(x + w / 2, base); ctx.lineTo(x + w * 0.08, base); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,50,80,.45)'; ctx.lineWidth = 1.2; for (let i = 0; i < 5; i++) { const yy = base - h * (0.12 + i * 0.12); ctx.beginPath(); ctx.moveTo(x + w * 0.02 + i * 2, yy); ctx.lineTo(x + w * (0.16 + i * 0.05), yy + h * 0.08); ctx.stroke(); }
  if (snow) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - w * 0.05, base - h); ctx.lineTo(x - w * 0.2, base - h * 0.68); ctx.lineTo(x - w * 0.1, base - h * 0.72); ctx.lineTo(x - w * 0.02, base - h * 0.62); ctx.lineTo(x + w * 0.08, base - h * 0.72); ctx.lineTo(x + w * 0.17, base - h * 0.66); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x - w / 2, base); ctx.lineTo(x - w * 0.05, base - h); ctx.lineTo(x + w / 2, base); ctx.stroke();
}
function tmMesa(x, base, w, h) { ctx.fillStyle = vgrad(base - h, base, '#e08a50', '#b4582e'); rr(x - w / 2, base - h, w, h, 4); ctx.fill(); ctx.fillStyle = '#f0a870'; ctx.fillRect(x - w / 2, base - h, w, 5); ctx.strokeStyle = 'rgba(110,40,15,.4)'; ctx.lineWidth = 1.4; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - w / 2, base - h + i * h / 5); ctx.lineTo(x + w / 2, base - h + i * h / 5 + 2); ctx.stroke(); } ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.8; rr(x - w / 2, base - h, w, h, 4); ctx.stroke(); }
function tmShip(x, y, k) { ctx.save(); ctx.translate(x, y + Math.sin(T * 1.6 + x) * 1.5); ctx.scale(k, k); ctx.fillStyle = '#8a5a2e'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(12, 9); ctx.lineTo(-12, 9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.6; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke(); ctx.fillStyle = '#fff8e8'; ctx.beginPath(); ctx.moveTo(1, -25); ctx.quadraticCurveTo(15, -14, 1, -3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e8d8b0'; ctx.beginPath(); ctx.moveTo(-1, -22); ctx.quadraticCurveTo(-11, -13, -1, -5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d63a3a'; ctx.fillRect(0, -30, 8, 5); ctx.restore(); }
function tmCompass(cx, cy, r) {
  ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = TM_INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, 7); ctx.stroke();
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.fillStyle = i === 0 ? '#c0302a' : '#5a2e0c'; ctx.beginPath(); ctx.moveTo(0, -r * 1.12); ctx.lineTo(r * 0.16, -r * 0.16); ctx.lineTo(0, 0); ctx.lineTo(-r * 0.16, -r * 0.16); ctx.closePath(); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.rotate(Math.PI / 4); ctx.fillStyle = 'rgba(90,46,12,.65)'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(r * 0.08, -r * 0.1); ctx.lineTo(-r * 0.08, -r * 0.1); ctx.closePath(); ctx.fill(); } ctx.restore();
  ctx.font = `italic bold ${Math.round(r * 0.42)}px ${FONT}`; ctx.fillStyle = '#5a2e0c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', 0, -r * 1.36); ctx.restore();
}
function tmScenery(k) {
  if (k === 0) {
    // jungle: dense little trees and palms
    ell(146, 214, 70, 56, 0, 'rgba(94,160,80,.45)'); for (const [tx, ty, ts] of [[110, 226, 1], [132, 244, 1.15], [160, 232, 1], [184, 250, 1.1], [120, 204, 0.9], [150, 208, 1], [178, 218, 0.9], [100, 250, 0.9]]) tmTree(tx, ty, ts, ty % 2 ? '#3f8a45' : '#4c9a4e'); palm(148, 232, 46, '#2f7a3a'); tmInk('Dschungel', 148, 150, 18);
    // beach with waves, a little crab, shells
    ctx.fillStyle = 'rgba(240,214,150,.95)'; ctx.beginPath(); ctx.moveTo(176, 410); ctx.quadraticCurveTo(210, 376, 252, 384); ctx.quadraticCurveTo(300, 392, 312, 414); ctx.lineTo(176, 414); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.6; ctx.stroke(); ctx.fillStyle = 'rgba(70,150,210,.55)'; ctx.fillRect(152, 414, 170, 20); tmWave(172, 424, 22, 6); circle(266, 400, 4, '#d63a3a'); ctx.fillStyle = '#e8a090'; ctx.beginPath(); ctx.arc(226, 398, 5, Math.PI, 0); ctx.fill(); tmInk('Strand', 240, 366, 16);
    // canyon: mesas and cactus
    tmMesa(288, 318, 40, 64); tmMesa(318, 318, 28, 40); cactus(262, 330, 26, '#5f7a2a', 2); tmInk('Canyon', 292, 236, 16);
    // start: station hut and flag
    ctx.fillStyle = '#8a5a2e'; ctx.fillRect(86, 380, 26, 18); ctx.fillStyle = '#6a2a24'; ctx.beginPath(); ctx.moveTo(82, 381); ctx.lineTo(99, 368); ctx.lineTo(116, 381); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.6; ctx.strokeRect(86, 380, 26, 18); ctx.stroke(); ctx.fillStyle = '#6b3a14'; ctx.fillRect(98, 346, 2.4, 24); ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(100, 346); ctx.lineTo(116, 351); ctx.lineTo(100, 357); ctx.fill(); tmInk('Start', 100, 412, 14);
    // river, palms, parrot, beach umbrella, footprints: the first piece should feel as rich as the volcano
    ctx.strokeStyle = 'rgba(80,160,220,.85)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(196, 176); ctx.quadraticCurveTo(170, 214, 196, 250); ctx.quadraticCurveTo(222, 286, 190, 330); ctx.stroke(); ctx.strokeStyle = 'rgba(210,240,255,.7)'; ctx.lineWidth = 1.6; ctx.stroke();
    for (const [px, py] of [[226, 392], [292, 400]]) { ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 6, py - 14, px + 2, py - 26); ctx.stroke(); ctx.strokeStyle = '#2f8a3a'; ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(px + 2, py - 26); ctx.quadraticCurveTo(px + 2 + i * 8, py - 36 + Math.abs(i) * 3, px + 2 + i * 12, py - 28 + Math.abs(i) * 6); ctx.stroke(); } }
    ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(252, 402); ctx.lineTo(252, 378); ctx.stroke(); ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(238, 380); ctx.quadraticCurveTo(252, 362, 266, 380); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(245, 372); ctx.quadraticCurveTo(252, 364, 259, 372); ctx.quadraticCurveTo(252, 378, 245, 372); ctx.fill();
    circle(168, 196 + Math.sin(T * 3) * 1.5, 5, '#e53935'); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(172, 196); ctx.lineTo(180, 198); ctx.lineTo(172, 200); ctx.fill(); ctx.strokeStyle = '#1f6fd0'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(164, 199); ctx.lineTo(154, 208); ctx.stroke();
    ctx.fillStyle = 'rgba(110,60,20,.4)'; for (let i = 0; i < 5; i++) { ell(126 + i * 14, 334 - i * 6 + (i % 2) * 4, 3, 1.8, 0.4, 'rgba(110,60,20,.4)'); }
  } else if (k === 1) {
    // the sea with waves, ships and a sea monster
    ctx.fillStyle = 'rgba(70,150,210,.5)'; ctx.beginPath(); ctx.moveTo(360, 330); ctx.quadraticCurveTo(380, 296, 430, 304); ctx.quadraticCurveTo(486, 312, 500, 360); ctx.quadraticCurveTo(504, 420, 440, 426); ctx.quadraticCurveTo(372, 428, 360, 380); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.6; ctx.stroke();
    for (const [wx, wy] of [[378, 340], [412, 322], [446, 336], [388, 392], [440, 402]]) tmWave(wx, wy, 14, 2); tmShip(470, 346, 0.8); tmShip(386, 372, 0.55);
    ctx.strokeStyle = '#7a3a8a'; ctx.lineWidth = 7; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(414 + i * 16, 410); ctx.quadraticCurveTo(404 + i * 20, 388 - i * 2, 424 + i * 15 + Math.sin(T * 2 + i) * 3, 368); ctx.stroke(); } circle(446, 410, 14, '#9a4aa8'); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(446, 410, 14, 0, 7); ctx.stroke(); circle(441, 407, 3, '#fff'); circle(452, 407, 3, '#fff'); circle(441, 407, 1.3, '#222'); circle(452, 407, 1.3, '#222'); tmInk('Meer', 412, 296, 18);
    // coral
    ctx.strokeStyle = '#ff8a6a'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(366 + i * 6, 424); ctx.lineTo(364 + i * 8, 410 - i * 3); ctx.stroke(); }
    // ice age: floes, pines, a mammoth-ish bump and a little igloo
    ctx.fillStyle = 'rgba(226,240,255,.95)'; ctx.beginPath(); ctx.moveTo(494, 232); ctx.lineTo(530, 196); ctx.lineTo(580, 202); ctx.lineTo(604, 238); ctx.lineTo(576, 272); ctx.lineTo(520, 268); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.6; ctx.stroke();
    for (const [px, py, ps] of [[516, 252, 30], [548, 258, 36], [576, 250, 28]]) pine(px, py, ps, '#2f6a50'); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(556, 232, 12, Math.PI, 0); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.stroke(); ctx.fillStyle = '#44506a'; ctx.fillRect(552, 230, 8, 5); tmInk('Eiszeit', 548, 184, 17);
    for (const [fx, fy, fw] of [[470, 296, 16], [492, 280, 11]]) { ctx.fillStyle = 'rgba(240,248,255,.95)'; ctx.beginPath(); ctx.ellipse(fx, fy, fw, fw * 0.45, 0, 0, 7); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 1.2; ctx.stroke(); }
  } else {
    // mountain range with snow caps, pine foothills
    tmMountain(654, 326, 96, 98); tmMountain(716, 326, 120, 130); tmMountain(768, 326, 84, 78); for (const [px, py, ps] of [[640, 332, 26], [668, 338, 22], [754, 334, 24]]) pine(px, py, ps, '#2f6a50'); tmInk('Berge', 706, 170, 18);
    // the volcano with lava streams and smoke
    drawVolcano(790, 420, 0.56, '#7a3a2a', 1); tmInk('Vulkan', 790, 428, 15);
    // the lair: a cave in a rocky hill, eyes glowing in the dark
    ctx.fillStyle = vgrad(150, 262, '#8a7a6a', '#5a4a3c'); ctx.beginPath(); ctx.moveTo(792, 262); ctx.quadraticCurveTo(800, 168, 846, 160); ctx.quadraticCurveTo(892, 168, 892, 262); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TM_INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#1c120c'; ctx.beginPath(); ctx.moveTo(814, 262); ctx.quadraticCurveTo(816, 192, 846, 190); ctx.quadraticCurveTo(876, 192, 876, 262); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(255,200,60,${0.7 + 0.3 * Math.sin(T * 3)})`; ctx.beginPath(); ctx.ellipse(832, 222, 4.4, 2.6, 0.3, 0, 7); ctx.ellipse(852, 222, 4.4, 2.6, -0.3, 0, 7); ctx.fill(); ctx.fillStyle = '#e8e0d0'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(828 + i * 8, 236); ctx.lineTo(832 + i * 8, 244); ctx.lineTo(836 + i * 8, 236); ctx.fill(); }
    for (const [bx, by] of [[800, 262], [880, 262], [790, 250]]) { ctx.fillStyle = '#7a6a5a'; ctx.beginPath(); ctx.ellipse(bx, by, 11, 7, 0, 0, 7); ctx.fill(); ctx.stroke(); } tmInk('Höhle', 846, 148, 17);
    tmCompass(662, 396, 22);
  }
}
function tmPieceFace(k) { // paper: fibres, stains, fold lines, scorched edges
  tmPiecePath(k); ctx.fillStyle = vgrad(TM_TOP, TM_BOT, '#f8e9c0', '#ebd29c', '#d6b57a'); ctx.fill();
  ctx.save(); tmPiecePath(k); ctx.clip();
  for (let i = 0; i < 9; i++) { ctx.globalAlpha = 0.06 + 0.05 * hash(i + k * 5); circle(TM_X[k] + hash(i + k * 11) * TM_W, TM_TOP + hash(i + k * 13 + 3) * (TM_BOT - TM_TOP), 16 + hash(i + 40) * 30, '#a86a28'); } ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(140,90,30,.10)'; ctx.lineWidth = 1; for (let i = 0; i < 70; i++) { const fx = TM_X[k] + hash(i * 2 + k) * TM_W, fy = TM_TOP + hash(i * 3 + k + 7) * (TM_BOT - TM_TOP), fl = 6 + hash(i + 90) * 16, fa = hash(i + 120) * 6.28; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(fa) * fl, fy + Math.sin(fa) * fl); ctx.stroke(); }
  // a faint coordinate grid like an old chart
  ctx.strokeStyle = 'rgba(120,70,20,.12)'; ctx.lineWidth = 1; for (let gx = TM_X[k] + 30; gx < TM_X[k] + TM_W; gx += 45) { ctx.beginPath(); ctx.moveTo(gx, TM_TOP); ctx.lineTo(gx, TM_BOT); ctx.stroke(); } for (let gy = TM_TOP + 30; gy < TM_BOT; gy += 45) { ctx.beginPath(); ctx.moveTo(TM_X[k], gy); ctx.lineTo(TM_X[k] + TM_W, gy); ctx.stroke(); }
  tmScenery(k);
  const cx = TM_X[k] + TM_W / 2, cy = (TM_TOP + TM_BOT) / 2; ctx.fillStyle = 'rgba(90,50,15,.16)'; ctx.fillRect(cx - 1.5, TM_TOP, 3, TM_BOT - TM_TOP); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(cx + 1.5, TM_TOP, 1.5, TM_BOT - TM_TOP); ctx.fillStyle = 'rgba(90,50,15,.14)'; ctx.fillRect(TM_X[k], cy - 1.5, TM_W, 3); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(TM_X[k], cy + 1.5, TM_W, 1.5);
  const vg = ctx.createRadialGradient(cx, cy, 90, cx, cy, 250); vg.addColorStop(0, 'rgba(120,60,10,0)'); vg.addColorStop(1, 'rgba(110,55,10,.34)'); ctx.fillStyle = vg; ctx.fillRect(TM_X[k] - 10, TM_TOP - 10, TM_W + 20, TM_BOT - TM_TOP + 20);
  ctx.restore();
  tmPiecePath(k); ctx.lineWidth = 3; ctx.strokeStyle = '#6a3c14'; ctx.stroke(); ctx.save(); tmPiecePath(k); ctx.clip(); ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(90,40,5,.28)'; tmPiecePath(k); ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,245,215,.55)'; ctx.translate(2.5, 0); tmPiecePath(k); ctx.stroke(); ctx.restore();
}
// The treasure map is expensive (paper fibres, scenery, shadows, clips), so each piece and the wooden table are drawn into an
// offscreen canvas and blitted. Pieces refresh at about 12 fps (staggered) to keep the little animations; the table never does.
const tmCache = {};
function tmCached(key, X, Y, w, h, every, stagger, draw) {
  const m = ctx.getTransform(), k = Math.min(2, Math.hypot(m.a, m.b) || 1), cw = Math.ceil(w * k), ch = Math.ceil(h * k);
  let c = tmCache[key]; if (!c) c = tmCache[key] = { cv: document.createElement('canvas'), next: -1 };
  if (c.cv.width !== cw || c.cv.height !== ch) { c.cv.width = cw; c.cv.height = ch; c.next = -1; }
  if (c.next < 0 || (every && T >= c.next)) {
    const old = ctx, cc = c.cv.getContext('2d'); cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, cw, ch); ctx = cc; ctx.setTransform(k, 0, 0, k, -X * k, -Y * k);
    try { draw(); } finally { ctx = old; }
    c.next = every ? T + every + (c.next < 0 ? stagger : 0) : 1e9;
  }
  ctx.drawImage(c.cv, 0, 0, cw, ch, X, Y, w, h);
}
function drawTMap() {
  if (tmapNew >= 0 || tmapLast !== 'x') tmapT += DT;
  tmCached('bg', 0, 0, W, H, 0, 0, () => {
  ctx.fillStyle = vgrad(0, H, '#5a3a22', '#35200f'); ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 54) { ctx.fillStyle = (y / 54) % 2 ? 'rgba(255,220,160,.05)' : 'rgba(0,0,0,.08)'; ctx.fillRect(0, y, W, 54); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); for (let i = 0; i < 10; i++) { ctx.strokeStyle = 'rgba(0,0,0,.09)'; ctx.lineWidth = 1; const gy = y + 6 + hash(i + y) * 42; ctx.beginPath(); ctx.moveTo(hash(i * 3 + y) * W, gy); ctx.bezierCurveTo(hash(i + 5) * W, gy - 4, hash(i + 8) * W, gy + 4, hash(i * 3 + y) * W + 140, gy); ctx.stroke(); } }
  const dg = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 620); dg.addColorStop(0, 'rgba(255,200,120,.10)'); dg.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
  });
  const got = [0, 1, 2].filter(tmHave).length, done = save.lvDone.filter(Boolean).length, walk = clamp((done - (save.lvDone[23] ? 0 : 0)) / 24, 0, 1), all = got === 3;
  rr(W / 2 - 200, 12, 400, 50, 14); ctx.fillStyle = vgrad(12, 62, '#8a5a2e', '#5a3818'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2b1a0c'; ctx.stroke(); rr(W / 2 - 192, 18, 384, 38, 10); ctx.lineWidth = 2; ctx.strokeStyle = '#d4a017'; ctx.stroke(); for (const sx of [W / 2 - 184, W / 2 + 184]) { circle(sx, 37, 4, '#d4a017'); circle(sx - 1, 36, 1.4, '#fff3c0'); }
  otxt('Die Schatzkarte', W / 2, 38, 32, '#ffe08a', '#2b1a0c', 8);
  txt(all ? 'Der Weg zum goldenen Ei ist frei!' : `${got} von 3 Kartenstücken gefunden`, W / 2, 76, 18, '#f2dfb0', 'center', 'normal');
  for (let k = 0; k < 3; k++) {
    const isNew = k === tmapNew, t = isNew ? tmapT : 9, fly = isNew ? clamp(t / 1.1, 0, 1) : 1, e = 1 + 2.70158 * Math.pow(fly - 1, 3) + 1.70158 * Math.pow(fly - 1, 2), cx = TM_X[k] + TM_W / 2, cy = (TM_TOP + TM_BOT) / 2, rot = (k - 1) * 0.012 + (isNew ? (1 - e) * 0.7 : 0), dy = isNew ? -(1 - e) * 460 : 0;
    ctx.save(); ctx.translate(cx, cy + dy); ctx.rotate(rot); ctx.translate(-cx, -cy);
    if (!tmHave(k)) { // an empty slot waiting for its piece
      tmPiecePath(k); ctx.fillStyle = 'rgba(15,8,2,.5)'; ctx.fill(); ctx.setLineDash([10, 8]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,211,77,.7)'; ctx.stroke(); ctx.setLineDash([]);
      otxt('?', cx, cy - 20, 90, 'rgba(255,225,150,.85)', '#3b1d00', 10); txt(`Kartenstück ${k + 1}`, cx, cy + 40, 22, '#f2dfb0'); txt(['Krabbenkönig · Tür 6', 'Seeungeheuer · Tür 12', 'Adlerkönigin · Tür 18'][k], cx, cy + 70, 16, '#d9bb80', 'center', 'normal');
    } else {
      tmCached('p' + k, TM_X[k] - 28, TM_TOP - 34, TM_W + 56, TM_BOT - TM_TOP + 68, 1 / 12, k * 0.03, () => {
        ctx.save(); tmPiecePath(k); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6; ctx.fillStyle = '#e9d09a'; ctx.fill(); ctx.restore();
        tmPieceFace(k);
        ctx.save(); tmPiecePath(k); ctx.clip(); const pos = tmRoute(walk, done); ctx.restore(); if (k === 0) tmMarker = pos;
      });
    }
    ctx.restore();
  }
  // the player's marker rides along the route; the golden egg waits at the X
  if (tmHave(0) && tmMarker) { const [mx, my] = tmMarker; shadow(mx, my + 14, 14, 0.3); circle(mx, my - 6, 15, '#2e8b57'); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); drawPortrait('rex', mx, my - 6, 13, true); }
  if (tmHave(2)) { const ex = 846, ey = 226 + 6 * Math.sin(T * 3); if (save.lvDone[23]) { circle(ex, ey, 15, '#69f0ae'); ctx.strokeStyle = '#17420f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ex - 7, ey); ctx.lineTo(ex - 2, ey + 6); ctx.lineTo(ex + 8, ey - 6); ctx.stroke(); } else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(ex, ey, 2, ex, ey, 46); g.addColorStop(0, `rgba(255,230,120,${0.7 + 0.2 * Math.sin(T * 4)})`); g.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = g; ctx.fillRect(ex - 50, ey - 50, 100, 100); ctx.restore(); drawEgg(ex, ey, 16, '#ffd700', '#fff3b0', 0.4, Math.sin(T * 5) * 0.08); ctx.strokeStyle = '#d63a3a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - 22, ey + 22); ctx.lineTo(ex - 8, ey + 36); ctx.moveTo(ex - 8, ey + 22); ctx.lineTo(ex - 22, ey + 36); ctx.stroke(); } }
  if (tmapNew >= 0 && tmapT > 1.0 && tmapT < 1.06) { SFX.right(); burst(TM_X[tmapNew] + TM_W / 2, 270, 46, ['#ffd740', '#fff', '#f2dfb0', '#ff8a9a'], 420, 500, 7, 1.2); }
  if (tmapNew >= 0 && tmapT > 1.1) { ctx.globalAlpha = 0.75 + 0.25 * Math.sin(T * 6); otxt('Neues Kartenstück!', W / 2, 462, 28, '#ffd34d', '#3b1d00', 8); ctx.globalAlpha = 1; }
  drawParts(0);
  button(tmapNew >= 0 ? 'Weiter' : 'Zurück', W / 2 - 90, H - 50, 180, 42, () => { tmapNew = -1; go('map'); }, { size: 22, icon: icon(tmapNew >= 0 ? 'play' : 'back') });
}
let tmMarker = null;
let endlessPick = false;
function themeOpenForEndless(wi) { return save.finished || LEVELS.some(l => l.wi === wi && save.lvDone[l.li]); }
function drawEndlessPicker() {
  buttons = [];
  panel(150, 24, 660, 492); txt('Endlos-Lauf', W / 2, 70, 38, '#3b2410'); txt('Wähle ein Thema – schlag deinen Rekord!', W / 2, 108, 20, '#6b4a2b', 'center', 'normal');
  WORLDS.forEach((th, i) => {
    const open = themeOpenForEndless(i), x = 180 + (i % 2) * 310, y = 128 + Math.floor(i / 2) * 58;
    button(`${th.name}${save.best[i] ? ' · ' + save.best[i] : ''}`, x, y, 290, 52, () => { if (open) { endlessPick = false; startLevel(i, true); } else { SFX.wrong(); toast('Erst ein Level dieses Themas schaffen!', '#ffb4a8'); } }, { size: 22, color: open ? '#f4b400' : '#c8c0a8', icon: open ? null : icon('lock') });
  });
  { const done = save.dailyLast === dayKey(), wi = dailyWorld(); button(`Tages-Lauf: ${WORLDS[wi].name}` + (save.dailyStreak && (done || save.dailyLast === prevDayKey()) ? ` · Serie ${save.dailyStreak}` : ''), 180, 372, 600, 46, () => { endlessPick = false; startDaily(); }, { size: 21, color: done ? '#d4f2bd' : '#ffb27a', icon: icon('star') }); if (!done) txt('Heute noch nicht gespielt: +20 Bernstein!', W / 2, 432, 15, '#8a5a00', 'center', 'normal'); else txt('Heute schon gespielt – morgen gibt es einen neuen Lauf.', W / 2, 432, 15, '#6b4a2b', 'center', 'normal'); }
  button('Zurück', W / 2 - 80, 456, 160, 40, () => { endlessPick = false; }, { size: 20, color: '#e0d2b0' });
}
function drawMap() { // the advent calendar
  const today = adventDay();
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0f1a3c'); g.addColorStop(0.55, '#33477a'); g.addColorStop(1, '#8aa0c8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 50; i++) { ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(T + i)); circle(hash(i) * W, hash(i + 9) * 200, 1.3, '#fff'); } ctx.globalAlpha = 1;
  drawHills(0, '#e8f0fa', 430, 40, 2); drawHills(300, '#cfdcf0', 470, 30, 4);
  drawSnow(0.45);
  // the wooden calendar board
  woodFrame(14, 84, W - 28, 3 * (DOORS.h + DOORS.gy) + 30, 22, '#3a2f55');
  ctx.save(); rr(25, 95, W - 50, 3 * (DOORS.h + DOORS.gy) + 8, 14); ctx.clip(); ctx.fillStyle = vgrad(95, 400, '#2a2250', '#1d1740'); ctx.fillRect(0, 0, W, H); for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.25 + 0.3 * Math.abs(Math.sin(T * 0.8 + i)); circle(30 + hash(i + 3) * (W - 60), 100 + hash(i + 11) * 290, 1.2, '#ffe9a8'); } ctx.globalAlpha = 1; ctx.restore();
  for (let i = 0; i < 24; i++) if (!(i + 1 === today && !save.lvDone[i])) drawDoor(i, today);
  if (today >= 1 && today <= 24 && !save.lvDone[today - 1]) drawDoor(today - 1, today); // today's door on top so its glow is never covered
  { const n = 4, seg = (W - 28) / n, cols = ['#ff5a5a', '#ffd34d', '#5ad07a', '#5ab4ff']; // string of fairy lights
    for (let q = 0; q < n; q++) {
      const x0 = 14 + q * seg; ctx.strokeStyle = '#141414'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, 86); ctx.quadraticCurveTo(x0 + seg / 2, 86 + 28, x0 + seg, 86); ctx.stroke();
      for (let b = 1; b < 9; b++) { const u = b / 9, bx = x0 + seg * u, by = 86 + 28 * 2 * u * (1 - u) * 0.5 * 2 / 2 + 0, c = cols[(q * 9 + b) % 4], tw = 0.55 + 0.45 * Math.sin(T * 3 + b * 1.3 + q);
        const yy = 86 + 28 * u * (1 - u) * 2; ctx.globalAlpha = 0.28 * tw; circle(bx, yy + 5, 9, c); ctx.globalAlpha = 1; ctx.fillStyle = '#141414'; ctx.fillRect(bx - 1.5, yy, 3, 3); circle(bx, yy + 6, 3.8, c); circle(bx - 1, yy + 5, 1.2, 'rgba(255,255,255,.8)'); }
    } }
  // header
  otxt('Adventskalender', 30, 38, 38, '#ffd34d', '#3b1d00', 9, 'left');
  const left = Math.ceil((ADVENT_START - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);
  otxt(today === 0 && save.dayOverride == null ? (left > 0 ? `Noch ${left} ${left === 1 ? 'Tag' : 'Tage'} bis zum 1. Dezember!` : 'Gleich geht es los!') : today >= 24 ? 'Alle Türen sind offen – frohe Weihnachten!' : fmt(`Heute: Tür ${today} – {rex} und Chili sind bereit!`), 32, 70, 22, today === 0 ? '#fff' : '#fff6b0', 'rgba(0,0,0,.75)', 6, 'left');
  buttons.push({ x: 20, y: 14, w: 330, h: 40, silent: true, cb: () => {} , hold: true });
  drawAmber(W - 210, 36, 14); otxt(String(save.amber), W - 188, 37, 24, '#ffe08a', 'rgba(0,0,0,.7)', 5, 'left');
  drawMedal(W - 318, 44, 12, 1, true); otxt(`${medalTotal()}/72`, W - 298, 37, 24, save.master ? '#fff6b0' : '#ffe08a', save.master ? '#8a5a00' : 'rgba(0,0,0,.7)', 5, 'left'); if (save.master) { drawStar(W - 336, 22, 9 + 1.5 * Math.sin(T * 5), '#ffd34d'); drawStar(W - 226 + 0, 20, 5 + Math.sin(T * 6 + 1), '#fff'); }
  drawChest();
  button(save.muted ? 'Aus' : 'Ton', W - 130, 16, 112, 42, () => { settingsOpen = true; }, { size: 20, color: '#e0d2b0', icon: icon(save.muted ? 'mute' : 'sound') });
  button('Dino-Buch', 24, H - 82, 210, 60, () => { bookSel = -1; go('book'); }, { icon: icon('book') });
  { const unread = bookUnread(); if (unread) { ctx.save(); ctx.translate(204, H - 80 + Math.sin(T * 6 + 1) * 2); ctx.rotate(0.22); rr(-32, -11, 64, 22, 6); ctx.fillStyle = '#e53935'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); txt(unread > 9 ? '9+ NEU' : unread > 1 ? `${unread} NEU` : 'NEU', 0, 1, 14, '#fff'); ctx.restore(); } }
  button('Laden', 24, H - 150, 210, 56, () => go('shop'), { color: '#ffe08a', icon: icon('amber') });
  if (save.newGifts.length) { ctx.save(); ctx.translate(214, H - 146 + Math.sin(T * 6) * 2); ctx.rotate(0.3); rr(-24, -11, 48, 22, 6); ctx.fillStyle = '#e53935'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('NEU', 0, 1, 14, '#fff'); ctx.restore(); }
  if (save.lvDone.some(Boolean) || save.finished) { button('Endlos', W - 262, H - 150, 150, 56, () => { endlessPick = true; }, { color: '#9fd3ff', icon: icon('loop'), size: 24 }); button('', W - 104, H - 150, 84, 56, () => { boardTab = -1; go('board'); }, { color: '#ffe08a' }); ico('trophy', W - 62, H - 130, 26); txt('Rekorde', W - 62, H - 105, 14, '#2b1a00'); }
  if (save.finished) button('Finale', W - 262, H - 82, 150, 60, () => startEnding(), { color: '#e57373', textColor: '#fff', icon: icon('star'), size: 22 });
  button('', W - 104, H - 82, 84, 60, () => { tmapNew = -1; go('tmap'); }, { color: '#f2dfb0' }); ico('scroll', W - 62, H - 61, 28); txt('Karte', W - 62, H - 34, 14, '#2b1a00');
  if (endlessPick) drawEndlessPicker();
  if (mapFW > 0) { mapFW -= DT; if (Math.random() < 0.09) { const c = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#ea80fc', '#fff']; burst(100 + Math.random() * 760, 70 + Math.random() * 280, 36, [c[Math.floor(Math.random() * 6)], '#fff'], 300, 160, 5, 1.4); tone(220 + Math.random() * 220, 0.3, 'triangle', 0.04, 80); } }
  drawParts(0);
  if (doorOverlay) drawDoorOverlay();
  if (parentMode) drawParentPanel();
  if (installHintVisible()) drawInstallHint();
  if (settingsOpen) drawSettings();
  if (titlePress && T - titlePress > 1.4 && !parentMode) { parentMode = true; titlePress = 0; SFX.click(); }
}

function awning(h) { // striped market awning with a scalloped edge
  const n = 15, sw = W / n;
  for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#fff7e8' : '#d63a3a'; ctx.beginPath(); ctx.moveTo(i * sw, 0); ctx.lineTo((i + 1) * sw, 0); ctx.lineTo((i + 1) * sw, h); ctx.arc(i * sw + sw / 2, h, sw / 2, 0, Math.PI); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, h - 10, W, 10); ctx.strokeStyle = '#7a1f1f'; ctx.lineWidth = 2; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(i * sw + sw / 2, h, sw / 2, 0, Math.PI); ctx.stroke(); }
}
const HAT_BOX = { santa: [-27, 21, -20, 11], cowboy: [-19, 20, -12, 11], astro: [-19, 23, -30, 40], straw: [-22, 23, -10, 13], pirate: [-22, 23, -11, 9], goggles: [-15, 17, -2, 11], chef: [-14, 15, -23, 8], tophat: [-16, 17, -20, 12], beanie: [-18, 19, -22, 12], wizard: [-20, 21, -33, 12], propeller: [-16, 17, -13, 8], antlers: [-21, 22, -20, 5], halo: [-17, 18, -21, -7], viking: [-21, 23, -22, 10], mastercrown: [-22, 23, -30, 9] }; // drawn extent of each hat around its brim line [x0, x1, y0, y1]
function drawHatIcon(kind, cx, cy, k, lim) { // lim: room above the brim; tall hats shrink to fit while the brim stays where it is
  const sc = kind && lim ? Math.min(k, lim / (-(HAT_BOX[kind] || [0, 0, -20])[2] + 8)) : k;
  ctx.save(); ctx.translate(cx, cy + 6 + 8 * (k - sc)); ctx.scale(sc, sc); if (kind === 'astro') ctx.translate(0, -9); /* the helmet wraps the head, so centre it on the card's head */ if (kind) drawHat(kind, 0, 0); else ico('star', 0, -8, 34); ctx.restore();
}
function drawFlameIcon(it, cx, cy, k) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 40); g.addColorStop(0, `rgba(${it.a},.55)`); g.addColorStop(1, `rgba(${it.b},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 2, 40, 0, Math.PI * 2); ctx.fill();
  for (const [sc, col] of [[1, `rgb(${it.b})`], [0.72, `rgb(${it.a})`], [0.4, '#fff']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -30 * sc); ctx.bezierCurveTo(14 * sc, -12 * sc, 20 * sc, 4 * sc, 12 * sc, 16 * sc); ctx.bezierCurveTo(6 * sc, 26 * sc, -6 * sc, 26 * sc, -12 * sc, 16 * sc); ctx.bezierCurveTo(-20 * sc, 2 * sc, -8 * sc, -10 * sc, 0, -30 * sc); ctx.fill(); if (sc === 1) { ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke(); } }
  ctx.restore();
}
// each tab: label, owned key, item list, equip slots (hats and jackets have one slot per boy, vouchers none), Götti's line
const SHOP_TABS = [
  { lb: 'Rex', key: 'skin', list: SKINS, eq: ['skin'], say: 'Welche Farbe darf es sein?' },
  { lb: 'Feuer', key: 'fire', list: FIRES, eq: ['fire'], say: 'Feuer in allen Farben!' },
  { lb: 'Hüte', key: 'hat', list: HATS, eq: ['hat', 'fabioHat'], say: 'Hüte für {oli} und {fabio}!' },
  { lb: 'Jacken', key: 'jacket', list: JACKETS, eq: ['jacket', 'fabioJacket'], say: 'Neue Jacken für euch zwei!' },
  { lb: 'Chili', key: 'chili', list: CHILI_ITEMS, eq: ['chili'], say: 'Etwas Schönes für Chili?' },
  { lb: 'Götti', key: 'wish', list: WISHES, eq: [], say: 'Meine Gutscheine! Die lösen wir zusammen ein – in echt!' },
];
const kidShort = n => n.length > 7 ? n.slice(0, 6) + '.' : n;
const kidNames = () => [kidShort(save.oliName || 'Oli'), kidShort(save.fabioName || 'Fabio')];
let wishShow = -1; // voucher card on screen (index into WISHES)
function drawVoucher(i) { // Götti's voucher: a ticket with a dashed border, the outing, both names and Götti's signature
  const wv = WISHES[i], x = 230, y = 34, w = 500, h = 330;
  ctx.fillStyle = 'rgba(8,10,24,.8)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, y + h / 2); ctx.rotate(-0.02); ctx.translate(-W / 2, -(y + h / 2));
  rr(x + 6, y + 8, w, h, 18); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
  rr(x, y, w, h, 18); ctx.fillStyle = vgrad(y, y + h, '#fffaf0', '#fbe9c4'); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#8a5a2e'; ctx.stroke();
  ctx.setLineDash([10, 7]); rr(x + 14, y + 14, w - 28, h - 28, 12); ctx.lineWidth = 2.5; ctx.strokeStyle = '#d9a23a'; ctx.stroke(); ctx.setLineDash([]);
  txt('GUTSCHEIN', W / 2, y + 52, 40, '#c62828');
  ctx.save(); ctx.beginPath(); ctx.arc(x + 110, y + 160, 62, 0, Math.PI * 2); ctx.fillStyle = '#fff3d6'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#d9a23a'; ctx.stroke(); ctx.clip(); wv.icon(x + 110, y + 150, 1.5); ctx.restore();
  const lines = wrapLines(fmt('Für {oli} und {fabio}: ' + wv.text + '!'), 270, 22);
  lines.forEach((l, k) => txt(l, x + 330, y + 120 + k * 30, 22, '#3b2410'));
  txt('Einzulösen bei Götti', x + 330, y + 130 + lines.length * 30, 17, '#8a6a3a', 'center', 'normal');
  ctx.save(); ctx.translate(x + 390, y + 270); ctx.rotate(-0.08); txt('Götti', 0, 0, 30, '#1f4fa0'); ctx.strokeStyle = '#1f4fa0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-54, 18); ctx.quadraticCurveTo(0, 26, 60, 12); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(x + 120, y + 268); ctx.rotate(-0.25); ctx.strokeStyle = 'rgba(198,40,40,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke(); txt('2027', 0, 1, 16, 'rgba(198,40,40,.8)'); ctx.restore();
  ctx.restore();
  buttons.length = 0; button('Super!', W / 2 - 90, y + h + 16, 180, 50, () => { wishShow = -1; SFX.click(); }, { color: '#9be38a', size: 24 });
}
let shopConfirm = null, shopTab = 0, shopPage = 0, shopSel = 0, shopTalk = { t: 0, text: 'Willkommen! Such dir etwas aus.' };
function shopSay(text) { shopTalk = { t: 4, text }; }
let shopBounce = 0;
function drawAutoHatIcon(cx, cy, k) { // "Automatik": the world decides - sun on one side, snow on the other
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  circle(-9, 0, 11, '#ffd34d'); ctx.strokeStyle = '#f0a020'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(-9 + Math.cos(a) * 14, Math.sin(a) * 14); ctx.lineTo(-9 + Math.cos(a) * 19, Math.sin(a) * 19); ctx.stroke(); }
  ctx.save(); ctx.beginPath(); ctx.moveTo(4, -24); ctx.lineTo(30, -24); ctx.lineTo(30, 24); ctx.lineTo(-6, 24); ctx.closePath(); ctx.clip(); circle(12, 0, 17, '#cfe8ff'); ctx.restore();
  ctx.strokeStyle = '#4a7ab0'; ctx.lineWidth = 2.5; for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; ctx.beginPath(); ctx.moveTo(15 + Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(15 - Math.cos(a) * 12, -Math.sin(a) * 12); ctx.stroke(); }
  ctx.restore();
}
function shopScene() {
  // wallpaper: soft stripes with small diamonds, a darker wooden wainscot
  ctx.fillStyle = vgrad(0, H, '#f9ecc9', '#f1dcaa', '#e2c488'); ctx.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 48) { ctx.fillStyle = (x / 48) % 2 ? 'rgba(255,255,255,.18)' : 'rgba(150,100,40,.06)'; ctx.fillRect(x, 60, 48, 330); }
  ctx.fillStyle = 'rgba(150,100,40,.14)'; for (let y = 90; y < 380; y += 44) for (let x = 24 + (y / 44 % 2) * 24; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 5, y); ctx.fill(); }
  ctx.fillStyle = vgrad(372, 450, '#a87644', '#7a5230'); ctx.fillRect(0, 372, W, 78); ctx.fillStyle = '#c99a62'; ctx.fillRect(0, 368, W, 8); ctx.strokeStyle = 'rgba(40,20,5,.3)'; ctx.lineWidth = 2; for (let x = 0; x <= W; x += 120) { ctx.beginPath(); ctx.moveTo(x, 376); ctx.lineTo(x, 450); ctx.stroke(); } ctx.strokeStyle = 'rgba(255,255,255,.12)'; for (let x = 8; x <= W; x += 120) { ctx.beginPath(); ctx.moveTo(x, 380); ctx.lineTo(x, 446); ctx.stroke(); }
  awning(52);
  // string lights under the awning
  for (let i = 0; i < 17; i++) { const x = 20 + i * 56, y = 70 + Math.sin(i * 1.1) * 3, c = ['#ff5252', '#ffd34d', '#69f0ae', '#40c4ff'][i % 4], tw = 0.55 + 0.45 * Math.sin(T * 3 + i * 1.7); ctx.globalAlpha = 0.3 * tw; circle(x, y + 8, 12, c); ctx.globalAlpha = 1; ctx.fillStyle = '#2a2018'; ctx.fillRect(x - 1.5, y - 2, 3, 5); circle(x, y + 7, 4.4, c); circle(x - 1.2, y + 5.6, 1.4, 'rgba(255,255,255,.85)'); }
  ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i <= 17; i++) { const x = 20 + i * 56, y = 68 + Math.sin(i * 1.1) * 3; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  // shelf with hats on stands, jars and a toy dino (left of the sign)
  rr(10, 150, 286, 9, 3); ctx.fillStyle = '#8a5a2e'; ctx.fill(); ctx.fillStyle = '#5a3a1c'; ctx.fillRect(22, 159, 6, 12); ctx.fillRect(278, 159, 6, 12);
  [['santa', 44], ['cowboy', 104], ['astro', 164], ['wizard', 224]].forEach(([k, x]) => { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 2, 136, 4, 14); circle(x, 134, 7, '#e8c9a0'); ctx.save(); ctx.translate(x, 150); drawHatIcon(k, 0, -34, 1.25); ctx.restore(); });
  rr(254, 120, 26, 30, 6); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill(); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.stroke(); drawAmber(267, 138, 7); ctx.fillStyle = '#6b4a2b'; ctx.fillRect(257, 116, 20, 6);
  // small shelf: lantern, egg, jar (beside the cards)
  rr(298, 258, 138, 9, 3); ctx.fillStyle = '#8a5a2e'; ctx.fill(); ctx.fillStyle = '#6b4a2b'; ctx.fillRect(310, 267, 6, 12); ctx.fillRect(418, 267, 6, 12);
  rr(308, 226, 24, 32, 6); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill(); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.stroke(); drawAmber(320, 244, 7); ctx.fillStyle = '#6b4a2b'; ctx.fillRect(310, 222, 20, 6);
  drawEgg(366, 244, 13, '#7ad0a8', '#3a9a70', 0, 0.1);
  rr(396, 230, 22, 28, 5); ctx.fillStyle = '#d9a23a'; ctx.fill(); ctx.stroke(); circle(407, 245, 6, '#fff3b0'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(407, 245, 2, 407, 245, 40); lg.addColorStop(0, `rgba(255,220,120,${0.55 + 0.1 * Math.sin(T * 3)})`); lg.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = lg; ctx.fillRect(367, 205, 80, 80); ctx.restore(); ctx.strokeStyle = '#6b4a2b'; ctx.beginPath(); ctx.arc(407, 230, 7, Math.PI, 0); ctx.stroke();
  // floor, rug and the spot-lit podium for Rex
  ctx.fillStyle = vgrad(448, H, '#9a6a3a', '#6e4a28', '#4a301a'); ctx.fillRect(0, 448, W, H - 448); ctx.fillStyle = '#b98a54'; ctx.fillRect(0, 448, W, 8); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2; for (let y = 470; y < H; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ell(262, 470, 178, 30, 0, '#8a2a32'); ell(262, 470, 160, 24, 0, '#a8404a'); ctx.strokeStyle = '#e8c070'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(262, 470, 168, 27, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sp = ctx.createLinearGradient(0, 100, 0, 440); sp.addColorStop(0, 'rgba(255,240,180,0)'); sp.addColorStop(1, `rgba(255,236,160,${0.34 + 0.06 * Math.sin(T * 2) + 0.2 * shopBounce})`); ctx.fillStyle = sp; ctx.beginPath(); ctx.moveTo(240, 96); ctx.lineTo(284, 96); ctx.lineTo(380, 436); ctx.lineTo(144, 436); ctx.closePath(); ctx.fill(); ctx.restore();
  ell(262, 436, 108, 15, 0, '#5a3a1c'); rr(154, 420, 216, 16, 8); ctx.fillStyle = vgrad(420, 436, '#c99a62', '#8a5a2e'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#3a2410'; ctx.stroke(); ell(262, 420, 108, 14, 0, '#d9aa72'); ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(262, 420, 100, 11, 0, 0, Math.PI * 2); ctx.stroke();
  shopBounce = Math.max(0, shopBounce - DT * 2.2);
}
function shopCounter() { // the counter Götti stands behind
  rr(0, 394, 142, 58, 6); ctx.fillStyle = vgrad(394, 452, '#b98250', '#8a5a2e', '#5e3a1c'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
  ctx.fillStyle = '#d9aa72'; ctx.fillRect(-4, 386, 152, 12); ctx.strokeStyle = '#2b1a0c'; ctx.lineWidth = 2.5; ctx.strokeRect(-4, 386, 152, 12);
  ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(48, 400); ctx.lineTo(48, 450); ctx.moveTo(96, 400); ctx.lineTo(96, 450); ctx.stroke();
  drawAmber(110, 377, 9); drawAmber(124, 381, 8); rr(10, 366, 20, 22, 5); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.stroke(); drawAmber(20, 380, 6);
}
function drawShop() {
  // wall, awning, counter
  shopScene();
  woodFrame(300, 54, 360, 54, 14); txt('Göttis Laden', 480, 83, 30, '#3b2410');
  rr(756, 70, 176, 44, 22); ctx.fillStyle = 'rgba(40,24,10,.85)'; ctx.fill(); drawAmber(782, 92, 14); otxt(String(save.amber), 806, 93, 26, '#ffe08a', 'rgba(0,0,0,.7)', 5, 'left');
  const tab = SHOP_TABS[shopTab], { key, list } = tab;
  // live preview: equip the selection temporarily (on both boys for hats and jackets)
  const bak = Object.assign({}, save.equip); for (const k of tab.eq) save.equip[k] = shopSel;
  const hopY = shopBounce > 0 ? -26 * Math.sin(Math.PI * (1 - shopBounce)) : 0;
  if (key === 'chili') { shadow(262, 422, 60, 0.3); oChili(250, 420 + hopY, 2.1, T * 3, false); }
  else if (key !== 'wish') oRex(262, 418 + hopY, 0.85, T * 3, 0.1, Object.assign(rexLook(2), { rider: true, hat: rexLook(2).hat || null, hat2: rexLook(2).hat2 || null, fire: key === 'fire' }));
  else { ctx.save(); ctx.translate(262, 330 + hopY * 0.5); ctx.rotate(-0.05); rr(-110, -70, 220, 140, 12); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#8a5a2e'; ctx.stroke(); ctx.setLineDash([6, 5]); rr(-100, -60, 200, 120, 8); ctx.strokeStyle = '#d9a23a'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); txt('GUTSCHEIN', 0, -38, 22, '#c62828'); WISHES[shopSel].icon(0, 4, 0.95); txt(WISHES[shopSel].n, 0, 46, 18, '#3b2410'); ctx.restore(); }
  Object.assign(save.equip, bak);
  if (key === 'fire') { // Rex breathes the selected fire so the colour can be judged
    const f = fireOf(shopSel), cyc = (T % 2.6) / 2.6, mx = 262 + 116 * 0.85, my = 418 - 98 * 0.85;
    ctx.save();
    if (cyc < 0.3) { const u = cyc / 0.3, len = 80 * (0.5 + u * 0.7); const g = ctx.createRadialGradient(mx, my, 2, mx, my, len); g.addColorStop(0, 'rgba(255,255,240,.95)'); g.addColorStop(0.25, `rgba(${f.a},.95)`); g.addColorStop(0.7, `rgba(${f.b},.75)`); g.addColorStop(1, `rgba(${f.c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(mx, my); for (let i = 0; i <= 10; i++) { const a = -0.3 + i * 0.06, r = len * (0.85 + 0.15 * Math.sin(T * 50 + i * 1.7)); ctx.lineTo(mx + Math.cos(a) * r, my + 6 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
    if (cyc > 0.06 && cyc < 0.85) { const q = (cyc - 0.06) / 0.79, bx = mx + 14 + q * 150, by = my + 6 + q * 26, fa = 1 - q * q, fl = 1 + 0.12 * Math.sin(T * 45); ctx.globalAlpha = fa; const g = ctx.createRadialGradient(bx, by, 2, bx, by, 34 * fl); g.addColorStop(0, 'rgba(255,255,235,1)'); g.addColorStop(0.3, `rgba(${f.a},1)`); g.addColorStop(0.65, `rgba(${f.b},.85)`); g.addColorStop(1, `rgba(${f.c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 34 * fl, 0, Math.PI * 2); ctx.fill(); for (let k = 1; k <= 3; k++) { ctx.globalAlpha = fa * 0.5 / k; circle(bx - k * 14, by - k * 3 + Math.sin(T * 30 + k) * 3, 13 - k * 2.5, f.ball); } ctx.globalAlpha = 1; }
    ctx.restore();
  }
  oGoetti(62, 420, 0.95, shopTalk.t > 0); shopCounter();
  if (shopTalk.t > 0 || true) { shopTalk.t = Math.max(0, shopTalk.t - DT); const lines = wrapLines(shopTalk.text, 230, 18); const bh = 20 + lines.length * 22; rr(20, 215 - bh + 10, 262, bh, 14); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke(); ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.moveTo(52, 225); ctx.lineTo(76, 225); ctx.lineTo(70, 252); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillRect(54, 223, 20, 4); lines.forEach((l, i) => txt(l, 151, 215 - bh + 32 + i * 22, 18, '#3b2410', 'center', 'normal')); }
  // tabs
  SHOP_TABS.forEach((tb, i) => button(tb.lb, 440 + i * 84, 118, 80, 44, () => { shopTab = i; shopPage = 0; shopSel = tb.eq.length ? save.equip[tb.eq[0]] : 0; shopSay(fmt(tb.say)); }, { size: 18, color: i === shopTab ? '#ffd34d' : '#d9c9a0' }));
  // item cards: 8 per page (4 x 2), gifts from the calendar show the door they come from
  const PER = 8, pages = Math.ceil(list.length / PER); shopPage = clamp(shopPage, 0, pages - 1);
  list.forEach((it, i) => {
    if (Math.floor(i / PER) !== shopPage) return;
    const j = i % PER, x = 440 + (j % 4) * 126, y = 166 + Math.floor(j / 4) * 104, w = 118, h = 100, owned = save.owned[key].includes(i), who = tab.eq.filter(k => save.equip[k] === i), eq = who.length > 0, cost = it.cost || 0, can = !it.gift && save.amber >= cost, sel = shopSel === i;
    if (sel) { rr(x - 4, y - 4, w + 8, h + 8, 16); ctx.fillStyle = `rgba(255,211,77,${0.5 + 0.15 * Math.sin(T * 5)})`; ctx.fill(); }
    ctx.save(); rr(x, y + 3, w, h, 14); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill(); ctx.restore();
    rr(x, y, w, h, 14); ctx.fillStyle = eq ? '#d4f2bd' : owned ? '#fffaf0' : it.gift ? (it.gift === 25 ? '#fff0b8' : '#ece4f6') : can ? '#fff0c8' : '#e8dec8'; ctx.fill(); ctx.lineWidth = sel ? 4 : 3; ctx.strokeStyle = sel ? '#e8a317' : eq ? '#2e7d32' : '#8a6a3a'; ctx.stroke();
    ctx.save(); rr(x + 5, y + 5, w - 10, 62, 9); ctx.clip(); ctx.fillStyle = vgrad(y, y + 68, '#fffdf4', '#f2e4c2'); ctx.fillRect(x, y, w, 70);
    ctx.fillStyle = 'rgba(120,80,30,.12)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 62, 34, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (key === 'skin') oRex(x + w / 2 + 6, y + 62, 0.3, 0.5 + T * 0.0, 0.05, { body: it.body, dark: it.dark, belly: it.belly, rainbow: it.rainbow, rider: true, hat: HATS[save.equip.hat] && HATS[save.equip.hat].k });
    else if (key === 'hat') { if (it.k) { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x + w / 2 - 2, y + 40, 4, 22); rr(x + w / 2 - 14, y + 60, 28, 5, 2); ctx.fillStyle = '#8a5a2e'; ctx.fill(); circle(x + w / 2, y + 40, 9, '#e8c9a0'); drawHatIcon(it.k, x + w / 2, y + 22, 1.55, 31); } else drawAutoHatIcon(x + w / 2, y + 34, 1.15); }
    else if (key === 'jacket') { ctx.save(); ctx.translate(x + w / 2 - 2, y + 66); ctx.scale(1.0, 1.0); drawOli(0, 0, 0.5, null, { kid: i === 1 ? 'fabio' : 'oli', jacket: i, hold: true }); ctx.restore(); }
    else if (key === 'chili') { chiliAcc = i; drawChili(x + w / 2 - 10, y + 64, 0.95, 0); chiliAcc = null; }
    else if (key === 'wish') it.icon(x + w / 2, y + 34, 0.8);
    else drawFlameIcon(fireOf(i), x + w / 2, y + 36, 0.98);
    if (!owned) { ctx.fillStyle = it.gift ? 'rgba(90,70,130,.30)' : 'rgba(120,110,90,.34)'; ctx.fillRect(x, y, w, 70); }
    ctx.restore();
    if (!owned) { circle(x + w - 18, y + 18, 13, 'rgba(40,30,20,.78)'); ico('lock', x + w - 18, y + 18, 16); }
    if (save.newGifts.includes(key + ':' + i)) { ctx.save(); ctx.translate(x + 24, y + 16); ctx.rotate(-0.3); rr(-18, -9, 36, 18, 5); ctx.fillStyle = '#e53935'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('NEU', 0, 1, 12, '#fff'); ctx.restore(); }
    const nm = it.n === 'Auto' ? 'Automatik' : it.n; txt(nm, x + w / 2, y + 77, nm.length > 9 ? 12 : 14, '#3b2410');
    const pill = (c0, c1, tc) => { rr(x + 12, y + 84, w - 24, 13, 6.5); ctx.fillStyle = vgrad(y + 84, y + 97, c0, c1); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.stroke(); return tc; };
    if (eq) txt(tab.eq.length > 1 ? (who.length > 1 ? '✓ Beide' : '✓ ' + kidNames()[tab.eq.indexOf(who[0])]) : '✓ Angelegt', x + w / 2, y + 91, 12, pill('#9be38a', '#5ebb5a', '#17420f')); else if (owned && key === 'wish') txt('✓ Gutschein', x + w / 2, y + 91, 12, pill('#ffe6a0', '#f4c24a', '#6a4800')); else if (owned) txt(it.gift ? 'Geschenk' : cost ? 'Gekauft' : 'Gratis', x + w / 2, y + 91, 12, pill('#f4ecd8', '#e2d6b8', '#6b4a2b'), 'center', 'normal'); else if (it.gift) txt(it.gift === 25 ? '72 Medaillen' : `Tür ${it.gift}`, x + w / 2, y + 91, 12, pill(it.gift === 25 ? '#ffe9a0' : '#d8c8f4', it.gift === 25 ? '#f0c040' : '#b9a0e6', it.gift === 25 ? '#6a4800' : '#3a2470')); else { const tc = pill(can ? '#ffe6a0' : '#e6dcc4', can ? '#f4c24a' : '#d4c8a8', can ? '#6a4800' : '#8a7a58'); drawAmber(x + w / 2 - 17, y + 91, 6); txt(String(cost), x + w / 2 - 7, y + 91, 13, tc, 'left'); }
    buttons.push({ x, y, w, h, cb: () => { shopSel = i; shopBounce = 1; SFX.click(); shopSay(key === 'wish' ? (owned ? 'Den habt ihr schon! Wann gehen wir?' : fmt(`Ein Gutschein für ${it.text}! Kostet ${cost} Bernstein.`)) : owned ? (eq ? 'Das ist gerade angezogen.' : 'Das steht euch gut!') : it.gift ? (it.gift === 25 ? 'Sammle alle 72 Medaillen – dann gehört das dir!' : `Das findest du hinter Tür ${it.gift} im Kalender!`) : can ? `Das kostet ${cost} Bernstein.` : 'Sammle noch etwas Bernstein!'); } });
  });
  if (pages > 1) {
    button('‹', 440, 376, 56, 32, () => { shopPage = (shopPage + pages - 1) % pages; }, { size: 24, color: '#e0d2b0' });
    otxt(`Seite ${shopPage + 1} von ${pages}`, 690, 392, 16, '#fff3d6', 'rgba(40,20,5,.8)', 4);
    button('›', 880, 376, 56, 32, () => { shopPage = (shopPage + 1) % pages; }, { size: 24, color: '#e0d2b0' });
  }
  // buy / equip bar
  const it = list[shopSel], owned = save.owned[key].includes(shopSel), eq = tab.eq.length > 0 && save.equip[tab.eq[0]] === shopSel, cost = it.cost || 0, can = !it.gift && save.amber >= cost, BY = 412;
  if (owned && key === 'wish') button('Gutschein ansehen', 440, BY, 496, 52, () => { wishShow = shopSel; SFX.click(); }, { color: '#ffe08a', size: 24 });
  else if (owned && tab.eq.length > 1) tab.eq.forEach((k, n) => { const on = save.equip[k] === shopSel, nm = kidNames()[n]; button(on ? nm + ' ✓' : nm + ' anziehen', 440 + n * 252, BY, 244, 52, () => { if (on) return; save.equip[k] = shopSel; writeSave(); SFX.right(); shopSay(fmt(n ? 'Sieht super aus, {fabio}!' : 'Sieht super aus, {oli}!')); shopBounce = 1; burst(262, 330, 26, ['#fff', '#ffe08a', '#ffd34d'], 280, 300, 5, 0.9); }, on ? { disabled: true, size: 20 } : { color: '#9be38a', size: 20 }); });
  else if (eq) button('Angelegt', 440, BY, 496, 52, () => {}, { disabled: true, icon: icon('check'), size: 26 });
  else if (owned) button('Anlegen', 440, BY, 496, 52, () => { save.equip[tab.eq[0]] = shopSel; writeSave(); SFX.right(); shopSay('Sieht super aus!'); shopBounce = 1; burst(262, 330, 26, ['#fff', '#ffe08a', '#ffd34d'], 280, 300, 5, 0.9); }, { color: '#9be38a', size: 26 });
  else if (it.gift) button(it.gift === 25 ? 'Mit allen 72 Medaillen' : `Aus Tür ${it.gift} im Kalender`, 440, BY, 496, 52, () => { SFX.wrong(); shopSay(it.gift === 25 ? `Du hast ${medalTotal()} von 72 Medaillen.` : `Öffne am ${it.gift}. Dezember die Tür ${it.gift}!`); }, { disabled: true, size: 22 });
  else if (can) button(`Kaufen  ·  ${cost}`, 440, BY, 496, 52, () => { shopConfirm = { key, sel: shopSel, cost, name: key === 'wish' ? 'Gutschein: ' + it.n : it.n, eq: tab.eq }; SFX.click(); }, { size: 26, icon: icon('amber') });
  else button('Zu wenig Bernstein', 440, BY, 496, 52, () => { SFX.wrong(); toast('Noch zu wenig Bernstein!', '#ffb4a8'); shopSay('Sammle noch etwas Bernstein!'); }, { disabled: true, size: 24 });
  button('Zurück', W - 224, H - 56, 200, 46, () => go('map'), { size: 24, icon: icon('back') });
  if (!owned && !it.gift && key !== 'wish') { ctx.font = 'bold 15px sans-serif'; const lbl = 'Vorschau – noch nicht gekauft', pw = 214; rr(262 - pw / 2, 462, pw, 28, 14); ctx.fillStyle = 'rgba(40,24,10,.78)'; ctx.fill(); txt(lbl, 262, 477, 15, '#ffe9b0'); }
  if (shopConfirm) { // are you sure? nothing is bought by accident
    buttons.length = 0; const sc = shopConfirm;
    ctx.fillStyle = 'rgba(8,10,24,.62)'; ctx.fillRect(0, 0, W, H); woodFrame(290, 150, 380, 240, 24);
    txt('Wirklich kaufen?', W / 2, 196, 32, '#3b2410'); txt(sc.name, W / 2, 238, 26, '#6b4a2b');
    drawAmber(W / 2 - 62, 280, 15); txt(`${sc.cost} Bernstein`, W / 2 - 40, 281, 24, '#8a5a00', 'left'); txt(`Danach hast du noch ${save.amber - sc.cost}.`, W / 2, 312, 15, '#8a6a3a', 'center', 'normal');
    button('Nein', 310, 330, 150, 46, () => { shopConfirm = null; shopSay('Überleg es dir in Ruhe!'); }, { size: 22 });
    button('Ja, kaufen!', 480, 330, 170, 46, () => { if (save.amber >= sc.cost && !save.owned[sc.key].includes(sc.sel)) { save.amber -= sc.cost; save.owned[sc.key].push(sc.sel); if (sc.eq.length === 1) save.equip[sc.eq[0]] = sc.sel; if (sc.key === 'wish') wishShow = sc.sel; writeSave(); SFX.buy(); shopSay(sc.key === 'wish' ? 'Abgemacht! Den lösen wir zusammen ein.' : sc.eq.length > 1 ? 'Gekauft! Wer zieht es an?' : 'Viel Spass damit!'); burst(262, 330, 46, ['#ffd34d', '#fff', '#ff9f1c', '#69f0ae'], 420, 600, 7, 1.1); } shopConfirm = null; }, { color: '#9be38a', size: 22, icon: icon('amber') });
  }
  if (wishShow >= 0) drawVoucher(wishShow);
  drawParts(0);
}
