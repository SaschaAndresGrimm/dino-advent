'use strict';
// Boss drawing. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// ---------- the three new bosses (drawn facing +x, feet at y = 0; the caller flips them to face the player) ----------
function drawSmallCrab(x, y, o) {
  const ph = o.ph || 0, flat = o.flat > 0, t = T * 14 + ph * 2;
  ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : clamp(o.alpha, 0, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (!o.yOff) shadow(x, y + 2, 30, 0.25);
  if (flat) { ell(x, y - 8, 36, 9, 0, '#e0402a'); ell(x, y - 10, 22, 5, 0, '#ff9a7a'); circle(x - 12, y - 14, 4, '#fff'); circle(x + 12, y - 14, 4, '#fff'); ctx.restore(); return; }
  ctx.translate(x, y); ctx.strokeStyle = '#8a2014'; ctx.lineWidth = 4;
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { const k = Math.sin(t + i * 1.6 + sd) * 5; ctx.beginPath(); ctx.moveTo(sd * (10 + i * 7), -12); ctx.lineTo(sd * (24 + i * 9), -8 + k); ctx.lineTo(sd * (28 + i * 9), 0); ctx.stroke(); }
  for (const sd of [-1, 1]) { const up = Math.sin(t * 0.5 + sd) * 6; ctx.strokeStyle = '#c0301c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sd * 20, -24); ctx.lineTo(sd * 32, -34 - up); ctx.stroke(); ctx.fillStyle = '#ee4a30'; ctx.beginPath(); ctx.arc(sd * 36, -40 - up, 11, 0.4, Math.PI * 2 - 0.4); ctx.lineTo(sd * 36, -40 - up); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#6a1408'; ctx.stroke(); }
  ell(0, -22, 28, 19, 0, vgrad(-42, -4, '#ff8a6a', '#e0402a', '#a82a1a')); ctx.beginPath(); ctx.ellipse(0, -22, 28, 19, 0, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = '#6a1408'; ctx.stroke();
  for (const sd of [-1, 1]) { ctx.strokeStyle = '#c0301c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sd * 8, -34); ctx.lineTo(sd * 9, -46); ctx.stroke(); circle(sd * 9, -48, 6, '#fff'); circle(sd * 9 - 1, -48, 3, '#222'); }
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#4a0e06'; ctx.beginPath(); ctx.arc(0, -22, 9, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  ctx.strokeStyle = 'rgba(106,20,8,.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(-18 + i * 3, -30 - i * 2); ctx.quadraticCurveTo(0, -36 - i * 2, 18 - i * 3, -30 - i * 2); } ctx.stroke(); ell(-9, -32, 10, 3.4, -0.25, 'rgba(255,255,255,.3)'); for (const [bx, by] of [[14, -24], [-16, -20], [4, -14]]) circle(bx, by, 1.8, '#ffc0a8');
  for (const sd of [-1, 1]) { ctx.strokeStyle = '#6a1408'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(sd * 36, -40 - Math.sin(t * 0.5 + sd) * 6); ctx.lineTo(sd * 28, -44 - Math.sin(t * 0.5 + sd) * 6); ctx.stroke(); circle(sd * 9 + 1, -49, 1.4, '#fff'); }
  ctx.restore();
}
// ---------- battle damage: plasters, bandages, patches, bruises and cracks pile up as a boss loses hearts ----------
function bossDmg(b) { // 0..1 across all phases; every single hit crosses at least one wound threshold
  if (b.state === 'flee' || b.state === 'duel') return 1;
  return clamp((b.phase + (3 - clamp(b.hp, 0, 3)) / 3) / bossKind(b).phases.length, 0, 1);
}
function woundPlaster(x, y, rot, sc = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  rr(-17, -7, 34, 14, 7); ctx.fillStyle = '#f3cfa4'; ctx.fill(); ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = 'rgba(138,90,52,.5)'; for (const dx of [-13, -10, 10, 13]) for (const dy of [-2.6, 2.6]) { ctx.beginPath(); ctx.arc(dx, dy, 0.9, 0, 7); ctx.fill(); }
  rr(-6.5, -6, 13, 12, 2); ctx.fillStyle = '#fff0d8'; ctx.fill(); ctx.strokeStyle = 'rgba(138,90,52,.55)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}
function woundBand(x1, y1, x2, y2, w) { // a wrapped bandage with diagonal weave and a loose flapping end
  const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
  ctx.save(); ctx.translate(x1, y1); ctx.rotate(a); ctx.lineJoin = 'round';
  ctx.fillStyle = '#f6efe0'; ctx.strokeStyle = '#6f604e'; ctx.lineWidth = 2;
  const fl = Math.sin(T * 4 + x1) * 2.5; ctx.beginPath(); ctx.moveTo(L - 4, w / 2 - 1); ctx.quadraticCurveTo(L + 4, w / 2 + 8, L - 2 + fl, w / 2 + 14); ctx.lineTo(L - 11 + fl, w / 2 + 11); ctx.quadraticCurveTo(L - 12, w / 2 + 5, L - 14, w / 2 - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  rr(-3, -w / 2, L + 6, w, w * 0.32); ctx.fill(); ctx.stroke();
  ctx.save(); rr(-3, -w / 2, L + 6, w, w * 0.32); ctx.clip();
  ctx.fillStyle = 'rgba(111,96,78,.16)'; ctx.fillRect(-3, w * 0.12, L + 6, w); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-3, -w / 2 + 1.5, L + 6, w * 0.16);
  ctx.strokeStyle = 'rgba(111,96,78,.4)'; ctx.lineWidth = 1.3; for (let k = 2; k < L + 4; k += 6) { ctx.beginPath(); ctx.moveTo(k - 3, -w / 2); ctx.lineTo(k + 3, w / 2); ctx.stroke(); }
  ctx.restore(); ctx.restore();
}
function woundPatch(x, y, rot, s, c1, c2) { // a stitched-on cloth patch
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  rr(-s, -s, s * 2, s * 2, s * 0.25); ctx.fillStyle = c1; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.setLineDash([3, 2.6]); rr(-s + 3.2, -s + 3.2, s * 2 - 6.4, s * 2 - 6.4, s * 0.15); ctx.strokeStyle = c2; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.35, s * 0.22, 0, 7); ctx.fill();
  ctx.restore();
}
function woundEye(x, y, r) { // a blue-purple shiner ringing the eye
  ctx.save(); const g = ctx.createRadialGradient(x, y, r * 0.78, x, y, r * 1.75);
  g.addColorStop(0, 'rgba(60,70,230,.0)'); g.addColorStop(0.22, 'rgba(60,70,230,.8)'); g.addColorStop(0.6, 'rgba(110,50,190,.6)'); g.addColorStop(1, 'rgba(140,60,160,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.75, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,120,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 1.02, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}
function woundShut(x, y, r) { // an eye swollen shut
  ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, r + 3, r + 2, 0, 0, 7); ctx.fillStyle = vgrad(y - r, y + r, '#9a60d0', '#6a30a0'); ctx.fill();
  ctx.strokeStyle = '#2a0a48'; ctx.lineWidth = 3; ctx.stroke();
  const g = ctx.createRadialGradient(x, y + 3, 2, x, y + 3, r + 4); g.addColorStop(0, 'rgba(60,70,230,.75)'); g.addColorStop(1, 'rgba(60,70,230,0)'); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#1a0630'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x - r + 2, y + 2); ctx.quadraticCurveTo(x, y + 9, x + r - 2, y + 2); ctx.stroke();
  for (const k of [-1, 0, 1]) { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + k * 7, y + 5); ctx.lineTo(x + k * 9, y + 11); ctx.stroke(); }
  ctx.restore();
}
function woundCrack(x, y, d) { // jagged crack, d = flat list of offsets
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const path = ox => { ctx.beginPath(); ctx.moveTo(x + ox, y); let px = x, py = y; for (let i = 0; i < d.length; i += 2) { px += d[i]; py += d[i + 1]; ctx.lineTo(px + ox, py); } };
  path(1.6); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.stroke();
  path(0); ctx.strokeStyle = 'rgba(30,8,4,.9)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}
function woundBump(x, y, r) { // a cartoon lump with impact lines
  ctx.save(); const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); g.addColorStop(0, '#ffc2a8'); g.addColorStop(0.6, '#f0806a'); g.addColorStop(1, '#c04a3a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#7a2418'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0.3, Math.PI * 1.1); ctx.stroke();
  ell(x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.18, -0.6, 'rgba(255,255,255,.7)');
  ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; for (const a of [-2.5, -1.9, -1.3]) { ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3)); ctx.lineTo(x + Math.cos(a) * (r + 9), y + Math.sin(a) * (r + 9)); ctx.stroke(); }
  ctx.restore();
}
function woundSweat(x, y) { // drops that slide down
  ctx.save(); for (let i = 0; i < 2; i++) { const u = (T * 0.8 + i * 0.5) % 1, px = x + i * 14 - 4, py = y + u * 30; ctx.globalAlpha = Math.min(1, (1 - u) * 2); ctx.fillStyle = '#c8efff'; ctx.strokeStyle = '#3f86b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py - 10); ctx.quadraticCurveTo(px + 7, py, px, py + 5); ctx.quadraticCurveTo(px - 7, py, px, py - 10); ctx.fill(); ctx.stroke(); } ctx.restore();
}
function woundTuft(x, y) { // ruffled, bent feathers
  ctx.save(); ctx.lineCap = 'round'; for (const [a, l] of [[-2.2, 26], [-1.75, 31], [-2.65, 22]]) {
    const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l; ctx.strokeStyle = '#2a3a70'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 - 6, ex, ey); ctx.stroke();
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a + 0.7); ell(0, 0, 10, 3.6, 0, '#e8eefc'); ctx.strokeStyle = '#2a3a70'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, 0, 10, 3.6, 0, 0, 7); ctx.stroke(); ctx.restore();
  } ctx.restore();
}
const WOUND_FN = { plaster: woundPlaster, cross: (x, y, r, s = 1) => { woundPlaster(x, y, r, s); woundPlaster(x, y, r + 1.5, s); }, band: woundBand, patch: woundPatch, eye: woundEye, shut: woundShut, crack: woundCrack, bump: woundBump, sweat: woundSweat, tuft: woundTuft };
// [threshold, kind, ...args]: drawn in the boss's own coordinates, in the order they were earned
const WOUNDS = {
  crab: [[0.12, 'cross', -42, -68, -0.5], [0.3, 'band', -31, -108, -14, -113, 10], [0.45, 'eye', 27, -132, 11], [0.5, 'sweat', -52, -118], [0.6, 'crack', 6, -102, [8, 11, -5, 10, 9, 12, -3, 13]], [0.75, 'band', 80, -110, 102, -106, 11], [0.9, 'patch', -52, -50, 0.25, 9, '#7fb7e8', '#fff'], [0.95, 'cross', 44, -46, 0.4]],
  kraken: [[0.12, 'cross', -30, -140, -0.5], [0.45, 'eye', 25, -106, 17], [0.5, 'sweat', -56, -150], [0.6, 'patch', 40, -62, 0.25, 11, '#ffd66a', '#a06a00'], [0.75, 'shut', -25, -106, 17], [0.9, 'cross', -44, -90, 0.7]],
  queen: [[0.12, 'cross', 40, -98, 0.6], [0.3, 'band', 22, -104, 42, -92, 10], [0.45, 'eye', 55, -124, 9], [0.5, 'sweat', 18, -136], [0.6, 'patch', -14, -88, 0.25, 8, '#ff9a6a', '#fff'], [0.75, 'cross', 78, -110, -0.5], [0.9, 'tuft', 26, -128]],
  king: [[0.12, 'cross', 66, -86, 0.3, 0.5], [0.3, 'band', 4, -70, 14, -38, 9], [0.45, 'eye', 52, -86, 7], [0.5, 'sweat', 30, -100], [0.6, 'crack', -18, -62, [5, 8, -4, 7, 5, 8]], [0.75, 'patch', -24, -50, 0.25, 7, '#7fb7e8', '#fff'], [0.9, 'bump', 38, -94, 6]],
};
const woundSeen = {};
const WOUND_EYES = { crab: [[-24, -132, 11], [24, -132, 11]], kraken: [[-25, -106, 15], [25, -106, 15]], queen: [[54, -124, 8]], king: [[52, -86, 7]] };
function woundSwirl(x, y, r) { // knocked-out spiral eye
  ctx.save(); ctx.translate(x, y); ctx.rotate(T * 5); circle(0, 0, r + 1.5, '#fff'); ctx.strokeStyle = '#2a1a4a'; ctx.lineWidth = Math.max(1.6, r * 0.18); ctx.lineCap = 'round'; ctx.beginPath();
  for (let a = 0; a < 12.5; a += 0.3) { const rr2 = a / 12.5 * r; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.stroke(); ctx.restore();
}
function woundPuff(x, y, u) { // ring and stars when a wound lands
  ctx.save(); ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 3 * (1 - u) + 1; ctx.beginPath(); ctx.arc(x, y, 6 + 34 * u, 0, 7); ctx.stroke();
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.5; drawStar(x + Math.cos(a) * (10 + 30 * u), y + Math.sin(a) * (10 + 30 * u), 7 * (1 - u * 0.5), '#ffd34d'); } ctx.restore();
}
function drawWounds(kind, d, wid = '', ko = false) { // a new wound pops in with a little overshoot
  const list = WOUNDS[kind];
  for (let i = 0; i < list.length; i++) {
    const w = list[i], key = kind + wid + i;
    if (d < w[0]) { delete woundSeen[key]; continue; }
    if (woundSeen[key] == null) woundSeen[key] = T;
    const u = clamp((T - woundSeen[key]) / 0.32, 0, 1), k = u >= 1 ? 1 : 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
    ctx.save(); ctx.translate(w[2], w[3]); ctx.scale(k * 1.2, k * 1.2); ctx.translate(-w[2], -w[3]); WOUND_FN[w[1]](...w.slice(2)); ctx.restore();
    if (u < 1) woundPuff(w[2], w[3], u);
  }
  if (ko) for (const [ex, ey, er] of WOUND_EYES[kind]) woundSwirl(ex, ey, er);
}
function drawCrabKing(x, y, s, ph, flip, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const col = vgrad(-120, 0, '#ff8a6a', '#e0402a', '#9a2418'), dark = '#6a1408', snap = Math.sin(ph * 0.6) * 0.5 + 0.5;
  for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const k = Math.sin(ph * 0.5 + i * 1.3 + sd) * 4; ctx.strokeStyle = dark; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(sd * (14 + i * 14), -34); ctx.lineTo(sd * (46 + i * 14), -52 + k); ctx.lineTo(sd * (62 + i * 16), -2); ctx.stroke(); ctx.strokeStyle = '#c03020'; ctx.lineWidth = 4; ctx.stroke(); }
  for (const sd of [-1, 1]) { // raised claws that snap
    ctx.strokeStyle = dark; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(sd * 48, -66); ctx.lineTo(sd * 86, -96); ctx.lineTo(sd * 96, -124); ctx.stroke(); ctx.strokeStyle = '#e0402a'; ctx.lineWidth = 7; ctx.stroke();
    ctx.save(); ctx.translate(sd * 96, -128); ctx.fillStyle = col; for (const sg of [-1, 1]) { ctx.save(); ctx.rotate(sg * (0.15 + snap * 0.5) * sd); ctx.beginPath(); ctx.moveTo(-sg * 4 * sd, 0); ctx.quadraticCurveTo(sg * 26 * sd, -26, sg * 8 * sd, -58); ctx.quadraticCurveTo(-sg * 18 * sd, -30, -sg * 4 * sd, 0); ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); } ctx.restore();
  }
  ell(0, -62, 70, 42, 0, col); ctx.strokeStyle = dark; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(0, -62, 70, 42, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = '#ffb090'; for (const [dx, dy, r] of [[-30, -78, 8], [-6, -86, 10], [24, -80, 8], [40, -64, 6], [-44, -60, 6], [8, -52, 6]]) circle(dx, dy, r, '#ffb090'); ell(-10, -84, 26, 6, -0.1, 'rgba(255,255,255,.22)');
  for (const sd of [-1, 1]) { ctx.strokeStyle = dark; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sd * 20, -96); ctx.lineTo(sd * 24, -126); ctx.stroke(); circle(sd * 24, -132, 11, '#fff'); circle(sd * 27 - (flip ? 0 : 0), -131, 6, '#111'); circle(sd * 28.5, -133.5, 2.2, '#fff'); ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sd * 24 - 12, -146 + (sd < 0 ? 4 : -4)); ctx.lineTo(sd * 24 + 12, -146 + (sd < 0 ? -4 : 4)); ctx.stroke(); }
  ctx.strokeStyle = dark; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, -52, 14, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.strokeStyle = 'rgba(106,20,8,.38)'; ctx.lineWidth = 2.4; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-60 + i * 4, -50 - i * 8); ctx.quadraticCurveTo(0, -112 - i * 4 + 40, 60 - i * 4, -50 - i * 8); } ctx.stroke();
  for (const [bx, by, br] of [[-52, -44, 5], [-38, -36, 4], [46, -40, 5], [54, -56, 4], [30, -34, 3.4], [-60, -62, 3.6]]) { ctx.fillStyle = '#ffe8d8'; ctx.beginPath(); ctx.moveTo(bx - br, by + br * 0.6); ctx.lineTo(bx, by - br * 1.2); ctx.lineTo(bx + br, by + br * 0.6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(106,20,8,.6)'; ctx.lineWidth = 1.2; ctx.stroke(); }
  ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 7, -50); ctx.lineTo(-10.5 + i * 7, -43); ctx.lineTo(-7 + i * 7, -50); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 3; i++) circle(-4 + i * 8 + Math.sin(T * 3 + i) * 2, -34 - ((T * 0.8 + i / 3) % 1) * 22, 2.6 - i * 0.4, ctx.fillStyle);
  ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(-18, -98); ctx.lineTo(-20, -116); ctx.lineTo(-10, -108); ctx.lineTo(0, -122); ctx.lineTo(10, -108); ctx.lineTo(20, -116); ctx.lineTo(18, -98); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 2; ctx.stroke(); circle(0, -106, 3, '#e53935');
  drawWounds('crab', o.dmg || 0, o.wid, o.ko);
  ctx.restore();
}
function drawKraken(x, y, s, ph, flip, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const col = vgrad(-180, 0, '#c882e8', '#8a44b8', '#4a1a78'), dark = '#2a0a48';
  // eight arms with two rows of suckers and a curled tip
  for (let i = 0; i < 8; i++) {
    const base = -64 + i * 18, wv = Math.sin(ph * 0.35 + i * 0.9), dir = i < 4 ? -1 : 1, ex = base + (i - 3.5) * 22 + dir * 50, c1x = base + wv * 30, c2x = base + (i - 3.5) * 14 + wv * 14;
    const pt = t => { const u = 1 - t; return [u * u * u * base + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex, u * u * u * -50 + 3 * u * u * t * -20 + 3 * u * t * t * -6 + t * t * t * 2]; };
    ctx.strokeStyle = dark; ctx.lineWidth = 23; ctx.beginPath(); ctx.moveTo(base, -50); ctx.bezierCurveTo(c1x, -20, c2x, -6, ex, 2); ctx.stroke();
    ctx.strokeStyle = i % 2 ? '#a458d0' : '#b46ae0'; ctx.lineWidth = 16; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(base - 3, -50); ctx.bezierCurveTo(c1x - 3, -20, c2x - 3, -6, ex - 3, 0); ctx.stroke();
    for (let k = 1; k <= 5; k++) { const [px, py] = pt(k / 5.6); circle(px + 1, py + 3, 3.6 - k * 0.3, '#f0cdf8'); circle(px + 1, py + 3, 1.6 - k * 0.1, '#c27ad8'); }
    ctx.strokeStyle = '#b46ae0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ex + dir * 5, 0, 6, dir < 0 ? 0.3 : Math.PI - 0.3, dir < 0 ? Math.PI * 1.4 : -Math.PI * 0.4, dir > 0); ctx.stroke();
    for (const [ai, thr, t0] of [[1, 0.3, 0.3], [6, 0.65, 0.35], [6, 0.8, 0.62]]) if (i === ai && (o.dmg || 0) >= thr) { const [px, py] = pt(t0), [qx, qy] = pt(t0 + 0.04), an = Math.atan2(qy - py, qx - px) + Math.PI / 2, c = Math.cos(an) * 15, sn = Math.sin(an) * 15; woundBand(px - c, py - sn, px + c, py + sn, 10); }
  }
  ctx.fillStyle = 'rgba(42,10,72,.55)'; ctx.beginPath(); ctx.moveTo(-70, -54); ctx.quadraticCurveTo(0, -22, 70, -54); ctx.lineTo(60, -62); ctx.quadraticCurveTo(0, -40, -60, -62); ctx.closePath(); ctx.fill(); // webbing between the arms
  // mantle with fins, mottling, bumps and barnacles
  for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * 50, -152); ctx.rotate(sd * 0.7); ctx.fillStyle = vgrad(-34, 4, '#e0a8f4', '#9a52c8'); ctx.beginPath(); ctx.ellipse(0, -14, 15, 30, 0, 0, 7); ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = 'rgba(42,10,72,.4)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, -40); ctx.moveTo(-6, 8); ctx.lineTo(-9, -30); ctx.moveTo(6, 8); ctx.lineTo(9, -30); ctx.stroke(); ctx.restore(); }
  ell(0, -110, 62, 74, 0, col); ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -110, 62, 74, 0, 0, 7); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, -110, 61, 73, 0, 0, 7); ctx.clip();
  ctx.fillStyle = 'rgba(40,8,70,.22)'; for (const [mx, my, mr] of [[-30, -138, 14], [26, -150, 11], [40, -112, 12], [-44, -100, 12], [-6, -168, 10], [14, -94, 8]]) { ctx.beginPath(); ctx.ellipse(mx, my, mr, mr * 0.7, 0.4, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,200,255,.2)'; ctx.beginPath(); ctx.ellipse(0, -52, 46, 20, 0, 0, 7); ctx.fill(); ell(-18, -158, 26, 9, -0.4, 'rgba(255,255,255,.24)');
  ctx.restore();
  for (const [bx, by, br] of [[-30, -136, 5], [24, -146, 4.4], [38, -118, 4], [-40, -102, 4.6], [-22, -88, 3.4], [30, -92, 3.4]]) { circle(bx, by, br, '#b868d8'); circle(bx - br * 0.3, by - br * 0.3, br * 0.4, 'rgba(255,255,255,.35)'); }
  ctx.fillStyle = '#d8c8b0'; for (const [bx, by] of [[-48, -122], [-52, -114], [-45, -112], [46, -134], [50, -126]]) { ctx.beginPath(); ctx.moveTo(bx - 3, by + 3); ctx.lineTo(bx, by - 5); ctx.lineTo(bx + 3, by + 3); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(60,40,30,.6)'; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const [bx, by, br, p0] of [[-34, -124, 4, 0], [30, -138, 3.4, 1.3], [44, -104, 3, 2.4], [-46, -96, 3.4, 3.1], [-8, -150, 3, 4.2], [8, -96, 2.6, 5.1]]) { const g = ctx.createRadialGradient(bx, by, 0.5, bx, by, br * 3.2); const a = 0.5 + 0.4 * Math.sin(T * 2.4 + p0); g.addColorStop(0, `rgba(160,255,240,${a})`); g.addColorStop(1, 'rgba(160,255,240,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br * 3.2, 0, 7); ctx.fill(); } ctx.restore();
  ctx.strokeStyle = 'rgba(30,5,60,.5)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-20, -168); ctx.lineTo(-12, -150); ctx.moveTo(-16, -170); ctx.lineTo(-8, -154); ctx.stroke();
  // eyes: big, ringed, with a slit pupil and a heavy angry lid
  for (const sd of [-1, 1]) {
    const ex = sd * 25, blink = (T % 4.2) < 0.12;
    circle(ex, -106, 20, '#6a2a98'); circle(ex, -106, 17, '#fff'); ctx.lineWidth = 2.4; ctx.strokeStyle = dark; ctx.beginPath(); ctx.arc(ex, -106, 17, 0, 7); ctx.stroke();
    circle(ex + sd * 2, -106, 10.5, '#ffd23a'); circle(ex + sd * 2, -106, 10.5, 'rgba(255,140,0,.25)'); ell(ex + sd * 3, -106, 3, 9.5, 0, '#14100c'); circle(ex + sd * 5.5, -111, 2.6, '#fff'); circle(ex + sd * 0.5, -100, 1.4, 'rgba(255,255,255,.8)');
    ctx.save(); ctx.beginPath(); ctx.arc(ex, -106, 17, 0, 7); ctx.clip(); ctx.fillStyle = '#6a2a98'; ctx.beginPath(); if (blink) { ctx.rect(ex - 20, -126, 40, 40); } else { ctx.moveTo(ex + sd * 20, -128); ctx.lineTo(ex - sd * 20, -128); ctx.lineTo(ex - sd * 20, -100); ctx.lineTo(ex + sd * 20, -114); ctx.closePath(); } ctx.fill(); ctx.restore();
    ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.beginPath(); if (blink) { ctx.moveTo(ex - 17, -106); ctx.lineTo(ex + 17, -106); } else { ctx.moveTo(ex - sd * 19, -100); ctx.lineTo(ex + sd * 19, -115); } ctx.stroke();
  }
  ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(-26, -168); ctx.lineTo(-30, -192); ctx.lineTo(-14, -180); ctx.lineTo(0, -198); ctx.lineTo(14, -180); ctx.lineTo(30, -192); ctx.lineTo(26, -168); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 2; ctx.stroke(); circle(0, -178, 4, '#40c4ff'); circle(-17, -176, 2.4, '#e53935'); circle(17, -176, 2.4, '#69f0ae');
  // a hooked beak between the arms, and a siphon on the side
  ctx.fillStyle = vgrad(-80, -56, '#7a5a3a', '#2a1a10'); ctx.strokeStyle = '#140a04'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-13, -76); ctx.quadraticCurveTo(0, -84, 13, -76); ctx.quadraticCurveTo(8, -62, 0, -54); ctx.quadraticCurveTo(-8, -62, -13, -76); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, -68); ctx.quadraticCurveTo(0, -62, 8, -68); ctx.stroke(); ell(-4, -76, 4, 2, -0.3, 'rgba(255,255,255,.3)');
  ctx.save(); ctx.translate(54, -70); ctx.rotate(0.6); rr(-5, -13, 11, 22, 5); ctx.fillStyle = '#9a52c8'; ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 2.4; ctx.stroke(); circle(0, -10, 3.4, '#2a0a48'); ctx.restore();
  drawWounds('kraken', o.dmg || 0, o.wid, o.ko);
  ctx.restore();
}
function drawQueen(x, y, s, ph, flip, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fl = Math.sin(ph * 0.45), wing = (a, c1, c2, back) => { ctx.save(); ctx.translate(-4, -104); ctx.rotate(a); for (let k = 0; k < 8; k++) { ctx.save(); ctx.rotate(-k * 0.13); ctx.fillStyle = k % 2 ? c1 : c2; ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(-60, -11, -112 + k * 2, -3 - k * 1); ctx.quadraticCurveTo(-60, 7, 0, 5); ctx.fill(); ctx.strokeStyle = '#102050'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); } ctx.restore(); };
  wing(-1.0 + fl * 0.8, '#2a4a9a', '#1d3678', true);
  for (let k = -2; k <= 2; k++) { ctx.save(); ctx.translate(-46, -82); ctx.rotate(Math.PI + k * 0.2); ctx.fillStyle = k % 2 ? '#e8eefc' : '#cfd8f0'; ctx.beginPath(); ctx.ellipse(-26, 0, 30, 6, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a3a70'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = '#d8e0f8'; ctx.beginPath(); ctx.ellipse(2, -68, 14, 12, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a3a70'; ctx.lineWidth = 1.4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-6 + i * 6, -62, 3.4, 0.2, Math.PI - 0.2); ctx.stroke(); }
  ctx.strokeStyle = '#f0b020'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(10, -66); ctx.lineTo(14, -42); ctx.moveTo(-8, -64); ctx.lineTo(-6, -42); ctx.stroke(); ctx.fillStyle = '#f0b020'; for (const dx of [10, -8]) for (const t2 of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(dx + t2 * 0.5, -44); ctx.quadraticCurveTo(dx + t2, -34, dx + t2 * 1.3, -32); ctx.lineTo(dx + t2 * 0.4, -42); ctx.fill(); }
  ell(0, -90, 48, 32, -0.2, vgrad(-122, -58, '#4a6ac0', '#2a4a9a', '#1d3678')); ell(10, -80, 32, 18, -0.2, '#f4f6ff'); ctx.strokeStyle = '#102050'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -90, 48, 32, -0.2, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(20,40,110,.4)'; ctx.lineWidth = 1.8; for (let r = 0; r < 3; r++) for (let q = 0; q < 5; q++) { ctx.beginPath(); ctx.arc(-30 + q * 14 + (r % 2) * 7, -92 + r * 9 - q * 1.2, 6, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
  ctx.fillStyle = '#f8faff'; ctx.strokeStyle = '#8a98c8'; ctx.lineWidth = 1.6; for (let i = 0; i < 7; i++) { const a = -2.6 + i * 0.55; ctx.beginPath(); ctx.moveTo(46 + Math.cos(a) * 18, -112 + Math.sin(a) * 18); ctx.lineTo(46 + Math.cos(a + 0.12) * 36, -112 + Math.sin(a + 0.12) * 34); ctx.lineTo(46 + Math.cos(a + 0.34) * 20, -112 + Math.sin(a + 0.34) * 19); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ell(46, -116, 25, 23, 0, '#ffffff'); ctx.strokeStyle = '#8a98c8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(46, -116, 25, 23, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = vgrad(-126, -96, '#ffd44a', '#d89a10'); ctx.beginPath(); ctx.moveTo(64, -124); ctx.quadraticCurveTo(96, -118, 90, -96); ctx.quadraticCurveTo(80, -108, 62, -106); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 2.6; ctx.stroke(); ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(64, -111); ctx.quadraticCurveTo(80, -112, 88, -104); ctx.stroke(); circle(76, -120, 1.8, '#8a5a00'); ctx.fillStyle = '#6a4200'; ctx.beginPath(); ctx.moveTo(88, -102); ctx.quadraticCurveTo(95, -98, 90, -92); ctx.lineTo(87, -98); ctx.fill();
  circle(54, -124, 8, '#fff'); circle(56, -124, 5, '#ffd23a'); circle(57, -124, 2.6, '#111'); ctx.strokeStyle = '#2a3a70'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(44, -138); ctx.lineTo(64, -131); ctx.stroke();
  ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(32, -134); ctx.lineTo(30, -152); ctx.lineTo(40, -144); ctx.lineTo(48, -158); ctx.lineTo(56, -144); ctx.lineTo(64, -152); ctx.lineTo(62, -134); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 2; ctx.stroke(); circle(47, -140, 3, '#e53935');
  wing(-0.5 + fl * 0.8, '#3a62c0', '#2f54a8', false);
  drawWounds('queen', o.dmg || 0, o.wid, o.ko);
  ctx.restore();
}
