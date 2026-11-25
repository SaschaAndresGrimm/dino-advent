'use strict';
// Calendar doors, settings, parent mode, Bestenliste, daily run. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// ---------- thumbnails and doors of the advent calendar ----------
function drawThemeThumb(wi, x, y, w, h) { // a tiny painted scene for each theme
  const th = WORLDS[wi]; ctx.save(); rr(x, y, w, h, 8); ctx.clip();
  ctx.fillStyle = vgrad(y, y + h, th.sky[0], th.sky[1]); ctx.fillRect(x, y, w, h);
  const gy = y + h * 0.72;
  if (wi === 3) drawVolcano(x + w * 0.5, gy, 0.2, '#2a0a08', 1);
  else if (wi === 5) { ctx.fillStyle = '#2a9ad0'; ctx.fillRect(x, y + h * 0.5, w, h * 0.22); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + 12 + i * 22, y + h * 0.58, 6, Math.PI, 0); ctx.stroke(); } circle(x + w * 0.8, y + h * 0.22, 8, '#ffe06a'); palm(x + w * 0.3, gy, 36, '#2f7d4a'); }
  else if (wi === 6) { ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 10 + i * 28, y); ctx.lineTo(x + 24 + i * 28, y); ctx.lineTo(x + 40 + i * 28, y + h); ctx.lineTo(x + 20 + i * 28, y + h); ctx.fill(); } for (const [fx, fy] of [[0.3, 0.35], [0.65, 0.5]]) { ell(x + w * fx, y + h * fy, 7, 4, 0, '#ffb04a'); ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.moveTo(x + w * fx - 6, y + h * fy); ctx.lineTo(x + w * fx - 12, y + h * fy - 4); ctx.lineTo(x + w * fx - 12, y + h * fy + 4); ctx.fill(); } for (const [bx, by] of [[0.5, 0.2], [0.55, 0.32], [0.8, 0.3]]) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + w * bx, y + h * by, 3, 0, 6.3); ctx.stroke(); } }
  else if (wi === 7) { ctx.fillStyle = '#7f98b8'; ctx.beginPath(); ctx.moveTo(x - 6, gy); ctx.lineTo(x + w * 0.35, y + h * 0.2); ctx.lineTo(x + w * 0.62, gy); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + w * 0.35, y + h * 0.2); ctx.lineTo(x + w * 0.27, y + h * 0.38); ctx.lineTo(x + w * 0.43, y + h * 0.38); ctx.fill(); ctx.fillStyle = '#6a84a6'; ctx.beginPath(); ctx.moveTo(x + w * 0.4, gy); ctx.lineTo(x + w * 0.72, y + h * 0.3); ctx.lineTo(x + w + 6, gy); ctx.fill(); pine(x + w * 0.2, gy, 26, '#1d4a3f', false); }
  else if (wi === 0) { palm(x + w * 0.5, gy, 40, '#1f5a35'); }
  else if (wi === 1) cactus(x + w * 0.5, gy, 30, '#5f7a2a', 3);
  else if (wi === 2 || wi === 4) pine(x + w * 0.5, gy + 2, 40, wi === 4 ? '#14303f' : '#1d4a3f', wi === 4);
  ctx.fillStyle = th.top || '#4a7a3a'; ctx.fillRect(x, gy, w, h - (gy - y));
  ctx.restore();
}
const doorScenes = {};
function doorScene(i, rex) { // the real level backdrop, pre-rendered small: what the door opens onto
  const key = i + (rex ? 'r' : 'p'); if (doorScenes[key]) return doorScenes[key];
  const lv = LEVELS[i], R = 2, DW = 86, DH = 72, k = DH / 400, old = ctx, oldT = T, c = document.createElement('canvas'); c.width = DW * R; c.height = DH * R;
  ctx = c.getContext('2d'); T = 1;
  try {
    ctx.setTransform(R * k, 0, 0, R * k, -R * k * 140, -R * k * 140); // crop: world x 140.., y 140..540
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    const cam = 400 + lv.sub * 1300 + (lv.boss ? 700 : 0);
    drawBackground(lv.wi, cam); drawGround(lv.wi, EMPTY, cam);
    if (rex) { const sh = (x, y, rx) => ell(x, y, rx, 9, 0, 'rgba(0,0,0,.3)'); sh(300, GROUND + 4, 90); oRex(300, GROUND, 1.25, 0.5, 0.08, Object.assign(rexLook(lv.wi), { rider: true })); }
    ctx.restore();
  } catch (e) { return null; } finally { ctx = old; T = oldT; }
  return doorScenes[key] = c;
}
function drawDoorScene(i, x, y, w, h, rex) {
  const c = doorScene(i, rex); if (!c) { drawThemeThumb(LEVELS[i].wi, x, y, w, h); return; }
  ctx.drawImage(c, x, y, w, h);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.22)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
const DOORS = { cols: 8, w: 100, h: 80, gx: 12, gy: 8, x0: 34, y0: 96 };
function doorRect(i) { const c = i % DOORS.cols, r = Math.floor(i / DOORS.cols); return { x: DOORS.x0 + c * (DOORS.w + DOORS.gx), y: DOORS.y0 + r * (DOORS.h + DOORS.gy), w: DOORS.w, h: DOORS.h }; }
function drawDoor(i, today) {
  const { x, y, w, h } = doorRect(i), lv = LEVELS[i], day = i + 1, th = WORLDS[lv.wi], open = day <= today, opened = save.gifts.includes(day) || !giftFor(day) && save.lvDone[i], done = save.lvDone[i], isToday = day === today && !done;
  const pulse = isToday ? 1.1 + 0.04 * Math.sin(T * 5) : 1;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(pulse, pulse); ctx.translate(-w / 2, -h / 2);
  if (isToday) { const g = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 100); g.addColorStop(0, `rgba(255,230,140,${0.8 + 0.2 * Math.sin(T * 4)})`); g.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = g; ctx.fillRect(-60, -60, w + 120, h + 120); for (let k = 0; k < 5; k++) { const a = T * 1.6 + k * 1.2566, sx = w / 2 + Math.cos(a) * (w * 0.62), sy = h / 2 + Math.sin(a) * (h * 0.7); drawStar(sx, sy, 4.5 + 2 * Math.sin(T * 7 + k), k % 2 ? '#fff' : '#ffe27a'); } }
  // frame (arched top) in the colour of the theme
  const fr = open ? th.far : '#6a5a4a'; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, 22); ctx.quadraticCurveTo(0, 0, w / 2, 0); ctx.quadraticCurveTo(w, 0, w, 22); ctx.lineTo(w, h); ctx.closePath();
  ctx.fillStyle = vgrad(0, h, shade(fr, 1.2), shade(fr, 0.8)); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
  const ix = 7, iy = 8, iw = w - 14, ih = h - 8;
  ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.beginPath(); ctx.moveTo(-3, 25); ctx.quadraticCurveTo(-3, -4, w / 2, -4); ctx.quadraticCurveTo(w + 3, -4, w + 3, 25); ctx.quadraticCurveTo(w * 0.9, 13, w * 0.78, 20); ctx.quadraticCurveTo(w * 0.62, 9, w * 0.5, 18); ctx.quadraticCurveTo(w * 0.34, 8, w * 0.22, 17); ctx.quadraticCurveTo(w * 0.08, 10, -3, 25); ctx.fill(); ctx.strokeStyle = 'rgba(150,180,220,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  if (done || (open && opened)) { // the door stands open: a view of the level's theme
    ctx.save(); ctx.beginPath(); ctx.moveTo(ix, h); ctx.lineTo(ix, iy + 18); ctx.quadraticCurveTo(ix, iy, w / 2, iy); ctx.quadraticCurveTo(ix + iw, iy, ix + iw, iy + 18); ctx.lineTo(ix + iw, h); ctx.closePath(); ctx.clip();
    drawDoorScene(i, ix, iy, iw, ih, !done); if (!done) { ctx.fillStyle = 'rgba(10,10,30,.18)'; ctx.fillRect(ix, iy, iw, ih); } ctx.restore();
    if (done) { drawCardArt(i, w / 2, h * 0.47, 66, false); }
    ctx.fillStyle = '#6a4a2b'; ctx.beginPath(); ctx.moveTo(ix, h); ctx.lineTo(ix, iy + 18); ctx.lineTo(ix + 12, iy + 24); ctx.lineTo(ix + 12, h); ctx.closePath(); ctx.fill(); // the opened door leaf
  } else { // closed wooden door
    ctx.beginPath(); ctx.moveTo(ix, h); ctx.lineTo(ix, iy + 18); ctx.quadraticCurveTo(ix, iy, w / 2, iy); ctx.quadraticCurveTo(ix + iw, iy, ix + iw, iy + 18); ctx.lineTo(ix + iw, h); ctx.closePath();
    ctx.fillStyle = vgrad(iy, h, open ? '#b07a42' : '#7a6a58', open ? '#7a4e24' : '#4f4438'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w / 2, iy + 2); ctx.lineTo(w / 2, h); ctx.moveTo(ix + 3, h * 0.58); ctx.lineTo(ix + iw - 3, h * 0.58); ctx.stroke();
    if (open) { ctx.save(); ctx.beginPath(); ctx.moveTo(ix, h); ctx.lineTo(ix, iy + 18); ctx.quadraticCurveTo(ix, iy, w / 2, iy); ctx.quadraticCurveTo(ix + iw, iy, ix + iw, iy + 18); ctx.lineTo(ix + iw, h); ctx.closePath(); ctx.clip(); ctx.globalAlpha = 0.32; ctx.fillStyle = th.far; ctx.fillRect(ix, iy, iw, ih); ctx.restore(); // theme tint
      const pw = isToday ? 70 : 44, ph = isToday ? 30 : 26, py = isToday ? h * 0.57 : h * 0.56, sc2 = doorScene(i, false) || doorScene(i, true); ctx.save(); rr(w / 2 - pw / 2, py, pw, ph, 8); ctx.clip(); if (isToday) ctx.drawImage(sc2, 0, 14, sc2.width, sc2.height - 28, w / 2 - pw / 2, py, pw, ph); else ctx.drawImage(sc2, w / 2 - pw / 2, py, pw, ph); ctx.restore(); rr(w / 2 - pw / 2, py, pw, ph, 8); ctx.lineWidth = isToday ? 3 : 2; ctx.strokeStyle = isToday ? '#ffd34d' : '#2b1a0c'; ctx.stroke(); }
    circle(w - 14, h * 0.5, 3.4, open ? '#ffd34d' : '#9a8a78');
  }
  // number tag
  if (!done) { const ny = isToday ? h * 0.36 : h * 0.36; circle(w / 2, ny, isToday ? 14 : 16, open ? '#fff3c0' : 'rgba(255,255,255,.7)'); ctx.lineWidth = 2; ctx.strokeStyle = open ? '#a06a00' : '#6a5a4a'; ctx.stroke(); txt(String(day), w / 2, ny + 1, isToday ? 19 : 20, open ? '#7a3a00' : '#6a5a4a'); }
  else { circle(w - 14, 22, 13, '#fff7e0'); ctx.lineWidth = 2; ctx.strokeStyle = '#2b1a0c'; ctx.stroke(); txt(String(day), w - 14, 23, 15, '#3b2410'); }
  if (!open) ico('lock', w / 2, h * 0.72, 20);
  if (isToday) { ctx.save(); ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 10 + 6 * Math.sin(T * 5); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, 22); ctx.quadraticCurveTo(0, 0, w / 2, 0); ctx.quadraticCurveTo(w, 0, w, 22); ctx.lineTo(w, h); ctx.stroke(); ctx.restore(); ctx.save(); ctx.translate(w / 2, 1 + Math.sin(T * 5) * 1.2); rr(-32, -12, 64, 24, 7); ctx.fillStyle = '#e53935'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('HEUTE', 0, 1, 15, '#fff'); ctx.restore(); }
  if (done) { rr(w / 2 - 44, h - 30, 88, 27, 13); ctx.fillStyle = 'rgba(30,18,8,.68)'; ctx.fill(); for (let k = 0; k < 3; k++) drawMedal(w / 2 - 26 + k * 26, h - 16.5, 10, k, save.lvM[i][k]); }
  if (lv.boss && open) { drawStar(14, h - 14, 9, '#ff6a3a'); }
  if (open && worldMedalsDone(lv.wi)) { ctx.save(); ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 8 + 4 * Math.sin(T * 3 + i); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, 22); ctx.quadraticCurveTo(0, 0, w / 2, 0); ctx.quadraticCurveTo(w, 0, w, 22); ctx.lineTo(w, h); ctx.stroke(); ctx.restore(); }
  ctx.restore();
  buttons.push({ x, y, w, h, cb: () => clickDoor(i) });
}
let doorOverlay = null, parentMode = false, titlePress = 0;
function clickDoor(i) {
  const day = i + 1, today = adventDay();
  if (day > today) { SFX.wrong(); toast(today === 0 ? 'Der Kalender startet am 1. Dezember!' : `Diese Tür öffnet sich am ${day}. Dezember!`, '#ffb4a8'); return; }
  const g = save.gifts.includes(day) ? null : openDoorGift(day);
  if (g) { doorOverlay = { i, g, t: 0 }; SFX.right(); burst(W / 2, 250, 50, ['#ffd740', '#ff5252', '#69f0ae', '#40c4ff', '#fff'], 520, 500, 8, 1.4); return; }
  launchLevel(i);
}
function drawGiftIcon(g, cx, cy, k) {
  if (g.key === 'hat') { const kind = HATS[g.i].k, b = HAT_BOX[kind] || [-20, 20, -20, 10], sc = Math.min(4.2, 150 * k / 1.4 / Math.max(b[1] - b[0], b[3] - b[2])); ctx.save(); ctx.translate(cx - (b[0] + b[1]) / 2 * sc, cy - (b[2] + b[3]) / 2 * sc); ctx.scale(sc, sc); drawHat(kind, 0, 0); ctx.restore(); } // the hat fills the gift window, centred
  else if (g.key === 'skin') { const sk = SKINS[g.i]; oRex(cx + 4, cy + 34 * k, 0.5 * k, 0.5, 0.05, { body: sk.body, dark: sk.dark, belly: sk.belly, rainbow: sk.rainbow }); }
  else if (g.key === 'fire') drawFlameIcon(fireOf(g.i), cx, cy, k * 1.6);
  else { drawAmber(cx, cy, 30 * k); otxt('+' + g.n, cx, cy + 50 * k, 28, '#ffe08a', 'rgba(0,0,0,.7)', 5); }
}
function drawDoorOverlay() { // the door shakes, glows at the seam, swings open on two leaves, and the gift pops out in a burst of light and confetti
  const o = doorOverlay, lv = LEVELS[o.i]; o.t += DT; const t = o.t, u = clamp(t / 1.6, 0, 1);
  const open = clamp((t - 0.45) / 0.65, 0, 1), eo = open * open * (3 - 2 * open), pop = clamp((t - 0.95) / 0.55, 0, 1), tt = Math.max(0, t - 0.95);
  const back = x => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
  if (!o.a && t > 0.45) { o.a = 1; SFX.click(); }
  if (!o.b && t > 0.95) { o.b = 1; SFX.amber(); burst(W / 2, 235, 46, ['#ffd740', '#fff6b0', '#ff8a65', '#69f0ae', '#40c4ff'], 520, 420, 7, 1.2); }
  ctx.fillStyle = 'rgba(8,10,24,.6)'; ctx.fillRect(0, 0, W, H);
  woodFrame(250, 50, 460, 440, 26);
  txt(`Tür ${lv.day}`, W / 2, 98, 40, '#3b2410'); txt(lv.title, W / 2, 132, 20, '#8a6a3a', 'center', 'normal');
  const fx = 380, fy = 150, fw = 200, fh = 170, cx = fx + fw / 2, cy = fy + fh / 2 + 2;
  // behind the door: a dark room that floods with light
  ctx.save(); rr(fx, fy, fw, fh, 14); ctx.clip(); ctx.fillStyle = '#241810'; ctx.fillRect(fx, fy, fw, fh);
  ctx.globalAlpha = eo; ctx.fillStyle = vgrad(fy, fy + fh, '#fff6d0', '#ffd77a'); ctx.fillRect(fx, fy, fw, fh); ctx.globalAlpha = 1;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(cx, cy); ctx.rotate(T * 0.5);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.fillStyle = `rgba(255,240,170,${0.2 * eo})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - 0.09) * 260, Math.sin(a - 0.09) * 260); ctx.lineTo(Math.cos(a + 0.09) * 260, Math.sin(a + 0.09) * 260); ctx.fill(); }
  ctx.restore();
  const gl = ctx.createRadialGradient(cx, cy, 6, cx, cy, 110); gl.addColorStop(0, `rgba(255,255,220,${eo})`); gl.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = gl; ctx.fillRect(fx, fy, fw, fh);
  if (pop > 0) { ctx.strokeStyle = `rgba(255,247,192,${0.85 * (1 - pop)})`; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, 20 + pop * 120, 0, Math.PI * 2); ctx.stroke(); ctx.save(); ctx.translate(cx, cy + 3 + Math.sin(T * 3) * 4 - (1 - pop) * 34); const sc = Math.max(0.01, back(pop)); ctx.scale(sc, sc); drawGiftIcon(o.g, 0, 0, 1.4); ctx.restore(); }
  ctx.restore();
  // the seam glows and the door trembles, then both leaves swing open towards the viewer
  const pre = clamp(t / 0.45, 0, 1), ox = t < 0.45 ? Math.sin(t * 90) * 2.2 * pre : 0;
  const lw = fw / 2 * (1 - 0.88 * eo), ex = 15 * eo;
  for (const sd of [-1, 1]) {
    const hx = sd < 0 ? fx : fx + fw, fr = hx - sd * lw + ox;
    ctx.save(); ctx.beginPath(); ctx.moveTo(hx + ox, fy); ctx.lineTo(fr, fy - ex); ctx.lineTo(fr, fy + fh + ex); ctx.lineTo(hx + ox, fy + fh); ctx.closePath();
    const g = ctx.createLinearGradient(hx, 0, fr, 0); g.addColorStop(0, '#b88650'); g.addColorStop(1, eo > 0 ? '#5a381a' : '#8a5a2c'); ctx.fillStyle = g; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
    ctx.clip(); ctx.strokeStyle = 'rgba(40,22,8,.35)'; ctx.lineWidth = 1.6; for (let i = 1; i < 4; i++) { const px = hx - sd * lw * i / 4 + ox; ctx.beginPath(); ctx.moveTo(px, fy - 20); ctx.lineTo(px, fy + fh + 20); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(Math.min(hx, hx - sd * lw) + ox, fy, lw, 5); ctx.restore();
    if (lw > 22) { circle(fr + sd * 11, cy, 5, '#ffd34d'); circle(fr + sd * 12, cy - 1.4, 1.8, '#fff3b0'); }
  }
  if (t < 0.6) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0); g.addColorStop(0, 'rgba(255,230,140,0)'); g.addColorStop(0.5, `rgba(255,236,150,${0.9 * pre})`); g.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 14, fy, 28, fh); ctx.restore(); }
  rr(fx, fy, fw, fh, 14); ctx.lineWidth = 5; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
  // sparkles drift out of the opened door, confetti rains down
  if (eo > 0) for (let i = 0; i < 16; i++) { const a = hash(i * 1.7) * Math.PI * 2, r = 100 + ((T * 36 + i * 23) % 70), al = eo * (0.4 + 0.6 * Math.sin(T * 5 + i)) * (1 - ((T * 36 + i * 23) % 70) / 90); if (al > 0.05) { ctx.globalAlpha = clamp(al, 0, 1); drawStar(cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 0.8, 3 + hash(i) * 4, '#fff3a0'); } } ctx.globalAlpha = 1;
  if (tt > 0 && tt < 3) { ctx.save(); ctx.beginPath(); ctx.rect(262, 62, 436, 416); ctx.clip(); const cols = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb', '#fff']; for (let i = 0; i < 44; i++) { const vx = (hash(i * 2.3) - 0.5) * 460, vy = -300 - hash(i * 5.1) * 240, x = cx + vx * tt, y = cy + vy * tt + 560 * tt * tt; ctx.globalAlpha = clamp((3 - tt) * 1.2, 0, 1); ctx.save(); ctx.translate(x, y); ctx.rotate(tt * (4 + hash(i) * 8) + i); ctx.fillStyle = cols[i % 6]; ctx.fillRect(-4, -2.2, 8, 4.4); ctx.restore(); } ctx.restore(); ctx.globalAlpha = 1; }
  const label = { hat: 'Neuer Hut', skin: 'Neue Farbe', fire: 'Neue Feuerfarbe', amber: 'Bernstein-Schatz' }[o.g.key];
  if (u >= 1) { txt(label + '!', W / 2, 352, 22, '#2e7d32'); txt(o.g.name, W / 2, 386, 32, '#3b2410'); txt('Du findest es im Laden.', W / 2, 418, 16, '#8a6a3a', 'center', 'normal'); }
  const cosm = o.g.key !== 'amber', worn = cosm && save.equip[o.g.key] === o.g.i;
  if (cosm) {
    button('Zurück', 268, 432, 100, 44, () => { doorOverlay = null; }, { size: 19 });
    button(worn ? 'Angelegt ✓' : 'Anziehen', 376, 432, 140, 44, () => { save.equip[o.g.key] = o.g.i; if (o.g.key === 'hat') save.equip.fabioHat = o.g.i; save.newGifts = save.newGifts.filter(k => k !== o.g.key + ':' + o.g.i); writeSave(); SFX.right(); }, { size: 19, color: worn ? '#d4f2bd' : '#9fd3ff', disabled: u < 1 || worn });
    button('Los geht\'s!', 524, 432, 170, 44, () => { doorOverlay = null; launchLevel(o.i); }, { size: 20, icon: icon('play'), disabled: u < 1 });
  } else {
    button('Zurück', 270, 432, 150, 44, () => { doorOverlay = null; }, { size: 22 });
    button('Los geht\'s!', 435, 432, 255, 44, () => { doorOverlay = null; launchLevel(o.i); }, { size: 24, icon: icon('play'), disabled: u < 1 });
  }
  buttons.unshift({ x: 0, y: 0, w: W, h: H, cb: () => {}, silent: true });
}
function installHintVisible() { try { const ua = navigator.userAgent || '', ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); return ios && !navigator.standalone && !window.matchMedia('(display-mode: standalone)').matches && !save.installHint && scene === 'map' && !dialog && !endlessPick && !doorOverlay && !parentMode && !settingsOpen; } catch (e) { return false; } }
function drawInstallHint() {
  const y = H - 74; rr(150, y, 660, 64, 16); ctx.fillStyle = 'rgba(255,247,224,.97)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
  txt('Tipp: Teilen-Knopf → „Zum Home-Bildschirm“.', 450, y + 21, 19, '#3b2410'); txt('So bleibt dein Spielstand sicher und das Spiel läuft auch ohne Internet.', 450, y + 46, 15, '#6b4a2b', 'center', 'normal');
  button('OK', 740, y + 6, 60, 50, () => { save.installHint = true; writeSave(); }, { size: 20 });
}
let settingsOpen = false;
function segBar(label, y, get, set) { // five tappable segments, 0 = silent
  txt(label, 270, y + 22, 24, '#3b2410', 'left');
  for (let k = 0; k <= 5; k++) { const x = 440 + k * 46, on = get() >= k && k > 0, cur = get() === k; rr(x, y, 40, 44, 10); ctx.fillStyle = k === 0 ? (get() === 0 ? '#e57373' : '#e0d2b0') : on ? '#ffd34d' : '#e6dcc4'; ctx.fill(); ctx.lineWidth = cur ? 4 : 2.5; ctx.strokeStyle = cur ? '#8a5a00' : '#8a6a3a'; ctx.stroke(); if (k === 0) txt('0', x + 20, y + 23, 20, '#6b4a2b'); else { rr(x + 11, y + 22 - k * 2.2, 18, k * 4.4 + 6, 4); ctx.fillStyle = on ? '#8a5a00' : '#b8a888'; ctx.fill(); } buttons.push({ x, y, w: 40, h: 44, cb: () => { set(k); writeSave(); if (k) { if (label === 'Effekte') SFX.right(); } } }); }
}
function drawSettings() {
  panel(230, 90, 500, 360); txt('Einstellungen', W / 2, 135, 36, '#3b2410');
  segBar('Musik', 170, () => save.volMusic, v => { save.volMusic = v; });
  segBar('Effekte', 232, () => save.volSfx, v => { save.volSfx = v; });
  button(save.calm ? 'Ruhiger Modus: an' : 'Ruhiger Modus: aus', 270, 300, 420, 50, () => { save.calm = !save.calm; writeSave(); }, { size: 20, color: save.calm ? '#d4f2bd' : '#e0d2b0' });
  txt('Ruhig = kein Wackeln und kein rotes Aufblitzen.', W / 2, 372, 15, '#8a6a3a', 'center', 'normal');
  button(save.muted ? 'Ton ganz aus ✓' : 'Ton ganz ausschalten', 270, 392, 250, 44, () => { save.muted = !save.muted; writeSave(); }, { size: 18, color: save.muted ? '#e57373' : '#e0d2b0', textColor: save.muted ? '#fff' : undefined });
  button('Fertig', 540, 392, 150, 44, () => { settingsOpen = false; }, { size: 22 });
  buttons.unshift({ x: 0, y: 0, w: W, h: H, cb: () => {}, silent: true });
}
let parentClearT = -99;
function backupSave() { // copy the save as a text code; if the clipboard is blocked, show it in a box that can be selected
  const code = saveToCode(), fallback = () => { try { window.prompt('Diesen Code ganz kopieren und sicher aufbewahren:', code); } catch (e) {} };
  try { navigator.clipboard.writeText(code).then(() => toast('Code kopiert. Jetzt irgendwo einfügen und aufbewahren.', '#ffe08a'), fallback); } catch (e) { fallback(); }
}
function restoreSave() {
  let code = null; try { code = window.prompt('Gesicherten Code hier einfügen:'); } catch (e) {}
  if (!code) return;
  const s = codeToSave(code);
  if (!s) { toast('Dieser Code funktioniert nicht.', '#ff9d9d'); return; }
  let ok = false; try { ok = window.confirm('Den aktuellen Spielstand durch den gesicherten ersetzen?'); } catch (e) {}
  if (!ok) return;
  for (const k of Object.keys(save)) delete save[k];
  Object.assign(save, s); writeSave();
  if (saveFail) { toast('Speichern klappt gerade nicht.', '#ff9d9d'); return; }
  location.reload(); // simplest way to reset every cached screen and thumbnail
}
let parentWipeT = -99;
function wipeEverything() { // like a fresh install: drop the save, its fallback copies and every other stored key of the game, then reload
  saveLocked = true;
  try { for (const k of Object.keys(localStorage)) if (k.indexOf('olisDinoRettung') === 0) localStorage.removeItem(k); } catch (e) {}
  location.reload();
}
function drawParentPanel() {
  panel(240, 40, 480, 480); txt('Elternmodus', W / 2, 88, 34, '#3b2410'); txt(`Heute offen: ${adventDay()} von 24 Türen`, W / 2, 128, 22, '#6b4a2b', 'center', 'normal');
  txt(save.dayOverride == null ? 'Es gilt das Datum des Geräts.' : 'Das Datum ist manuell eingestellt.', W / 2, 154, 16, '#8a6a3a', 'center', 'normal');
  button('−', 300, 170, 110, 52, () => { save.dayOverride = clamp(adventDay() - 1, 0, 24); writeSave(); }, { size: 34 });
  button('+', 550, 170, 110, 52, () => { save.dayOverride = clamp(adventDay() + 1, 0, 24); writeSave(); }, { size: 34 });
  button('Alle Türen öffnen', 300, 232, 360, 40, () => { save.dayOverride = 24; writeSave(); }, { size: 21, color: '#ffe08a' });
  button('Datum des Geräts nutzen', 300, 278, 360, 40, () => { save.dayOverride = null; writeSave(); }, { size: 19, color: '#e0d2b0' });
  const armed = T - parentClearT < 4;
  button(armed ? 'Wirklich leeren? Nochmal tippen' : 'Bestenliste leeren', 300, 324, 360, 40, () => { if (armed) { save.board = save.board.map(() => []); boardNewT = 0; writeSave(); parentClearT = -99; toast('Bestenliste geleert.', '#ffe08a'); } else parentClearT = T; }, { size: 18, color: armed ? '#e57373' : '#e0d2b0', textColor: armed ? '#fff' : undefined });
  if (saveFail) txt('Achtung: Dieses Gerät kann nicht speichern!', W / 2, 386, 17, '#c0392b', 'center'); else txt('Spielstand sichern', W / 2, 386, 17, '#6b4a2b', 'center', 'normal');
  button('Code kopieren', 300, 398, 175, 40, backupSave, { size: 18, color: '#d4f2bd' });
  button('Code einfügen', 485, 398, 175, 40, restoreSave, { size: 18, color: '#e0d2b0' });
  const wipeArmed = T - parentWipeT < 4;
  button(wipeArmed ? 'Ja, alles löschen!' : 'Alles löschen', 300, 450, 200, 40, () => { if (wipeArmed) wipeEverything(); else parentWipeT = T; }, { size: 18, color: wipeArmed ? '#e57373' : '#e0d2b0', textColor: wipeArmed ? '#fff' : undefined });
  button('Schliessen', 510, 450, 150, 40, () => { parentMode = false; }, { size: 20 });
  buttons.unshift({ x: 0, y: 0, w: W, h: H, cb: () => {}, silent: true });
}
// ---------- local Bestenliste (per device) ----------
const BAD_WORDS = ['scheiss', 'schei\u00dfe', 'scheisse', 'arsch', 'fotze', 'votze', 'wichs', 'hurensohn', 'hure', 'nutte', 'schlampe', 'fick', 'titten', 'pimmel', 'nazi', 'hitler', 'neger', 'spast', 'mongo', 'kacke', 'pisse', 'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'whore', 'slut', 'rape', 'nigg', 'fag', 'porn', 'sex', 'penis', 'vagina', 'dildo', 'asshole'];
function cleanNick(raw) { // returns { ok, name, msg }
  let name = String(raw || '').replace(/[^A-Za-z0-9\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df _.\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
  if (!name) return { ok: false, name, msg: 'Bitte gib einen Spitznamen ein.' };
  const low = String(raw).toLowerCase();
  if (/@|https?:|www\.|\.(com|de|ch|at|net|org)\b|\d{4,}/.test(low)) return { ok: false, name, msg: 'Bitte nur einen Spitznamen – keinen echten Namen, keine Adresse und keine Nummer.' };
  const norm = String(raw).slice(0, 40).toLowerCase().replace(/[0134578@$!]/g, c => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i' })[c]).replace(/[^a-z\u00e4\u00f6\u00fc\u00df]/g, '').replace(/(.)\1+/g, '$1');
  const bad = BAD_WORDS.some(w => norm.includes(w.replace(/(.)\1+/g, '$1')));
  if (bad) return { ok: false, name, msg: 'Dieser Name geht leider nicht – such dir einen anderen Spitznamen!' };
  return { ok: true, name };
}
function boardQualifies(wi, sc) { const b = save.board[wi]; return sc > 0 && (b.length < 10 || sc > b[b.length - 1].s); }
let boardNewT = 0;
function boardAdd(wi, name, sc) { // returns the rank (1-based) or 0 when it did not make the top 10
  const e = { n: name, s: sc, t: Date.now() }, b = save.board[wi]; b.push(e); b.sort((x, y) => y.s - x.s || x.t - y.t); if (b.length > 10) b.length = 10;
  save.nick = name; writeSave(); boardNewT = e.t; return b.indexOf(e) + 1;
}
function boardAll() { const all = []; save.board.slice(0, 8).forEach((b, wi) => b.forEach(e => all.push(Object.assign({ wi }, e)))); return all.sort((x, y) => y.s - x.s || x.t - y.t).slice(0, 10); }
let boardTab = -1; // -1 = all worlds together
function drawBoard() {
  leatherCover();
  const px = 70, py = 66, pw = W - 140, ph = 396; rr(px, py, pw, ph, 22); ctx.fillStyle = '#fff3d6'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#8a6a3a'; ctx.stroke();
  otxt('Bestenliste', W / 2, 40, 38, '#ffd34d', '#3b1d00', 9);
  const nTabs = WORLDS.length + 2, title = boardTab < 0 ? 'Alle Welten' : boardTab === 8 ? 'Tages-Lauf heute' : WORLDS[boardTab].name; if (boardTab === 8) dailyRefresh();
  button('‹', px + 14, py + 12, 60, 46, () => { boardTab = (boardTab + 1 + nTabs - 1) % nTabs - 1; SFX.click && SFX.click(); }, { size: 34, color: '#e0d2b0' });
  button('›', px + pw - 74, py + 12, 60, 46, () => { boardTab = (boardTab + 1 + 1) % nTabs - 1; SFX.click && SFX.click(); }, { size: 34, color: '#e0d2b0' });
  txt(title, W / 2, py + 35, 30, '#3b2410'); txt(boardTab === 8 ? `Heute: ${WORLDS[dailyWorld()].name} · neuer Lauf jeden Tag` : 'Auf diesem Gerät · Endlos-Lauf', W / 2, py + 62, 15, '#8a6a3a', 'center', 'normal');
  const rows = boardTab < 0 ? boardAll() : save.board[boardTab].map(e => Object.assign({ wi: boardTab }, e));
  const stBar = boardTab === 8 && save.dailyStreak ? `Deine Serie: ${save.dailyStreak} ${save.dailyStreak === 1 ? 'Tag' : 'Tage'}` : '';
  if (!rows.length) { txt('Noch kein Eintrag.', W / 2, 250, 26, '#6b4a2b'); txt('Starte einen Endlos-Lauf und sei der Erste!', W / 2, 288, 20, '#8a6a3a', 'center', 'normal'); }
  const pulse = 0.5 + 0.5 * Math.sin(T * 5);
  rows.forEach((e, i) => {
    const y = 156 + i * 29.5, mine = e.t === boardNewT;
    rr(px + 24, y - 13, pw - 48, 27, 10); ctx.fillStyle = mine ? `rgba(255,211,77,${0.45 + 0.3 * pulse})` : i % 2 ? 'rgba(138,106,58,.08)' : 'rgba(138,106,58,.15)'; ctx.fill();
    if (i < 3) { circle(px + 52, y, 11, ['#ffd34d', '#d7dbe0', '#d89a5a'][i]); ctx.lineWidth = 2; ctx.strokeStyle = ['#a8780a', '#7a8088', '#8a5424'][i]; ctx.stroke(); txt(String(i + 1), px + 52, y + 1, 15, '#3b2410'); }
    else txt(String(i + 1), px + 52, y + 1, 16, '#6b4a2b');
    txt(e.n, px + 82, y + 1, 20, '#2b1a00', 'left');
    if (boardTab < 0) txt(WORLDS[e.wi].name, px + 330, y + 1, 14, '#8a6a3a', 'left', 'normal');
    txt(String(e.s), px + pw - 48, y + 1, 21, '#c0701a', 'right');
  });
  if (stBar) txt(stBar, W / 2, H - 45, 20, '#ffd34d');
  button('Zurück', 80, H - 70, 180, 50, () => go('map'), { size: 22, icon: icon('back') });
  button('Endlos-Lauf', W - 280, H - 70, 200, 50, () => { go('map'); endlessPick = true; }, { size: 22, color: '#9fd3ff', icon: icon('loop') });
}
// ---------- Tages-Lauf: one endless run per day with the same seed for everybody ----------
const dayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
const prevDayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
function dailyWorld() { const open = WORLDS.map((_, i) => i).filter(themeOpenForEndless); const d = new Date(); const n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); return open.length ? open[n % open.length] : 0; }
function dailyRefresh() { if (save.dailyBoardDay !== dayKey()) { save.board[8] = []; save.dailyBoardDay = dayKey(); writeSave(); } }
let dailySeed = 0;
function startDaily() { dailyRefresh(); dailySeed = dayKey(); const wi = dailyWorld(); startLevel(wi, true); dailySeed = 0; if (G) G.daily = true; }
