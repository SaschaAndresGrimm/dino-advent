'use strict';
// Play drawing. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// ---------- play drawing ----------
function rim() { // dark outline for ground hazards; warm rim on the dark lava world so it still reads
  ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = ART(G.wi) === 3 ? 'rgba(255,170,90,.9)' : '#1b120c'; ctx.stroke();
}
function rockTheme(x, o) { // each world's rocks get their own surface: moss, strata, lava cracks, shells, snow
  const A = ART(G.wi), b = GROUND, w = o.w, h = o.h;
  ctx.lineCap = 'round';
  if (A === 0) { ell(x - w * 0.1, b - h * 0.9, w * 0.3, 6, -0.12, '#4fae48'); ell(x - w * 0.18, b - h * 0.95, w * 0.14, 3, -0.1, '#86dc66'); ctx.strokeStyle = '#3f9b3a'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { const bx = x - w / 2 + 2 + i * w / 4.5; ctx.beginPath(); ctx.moveTo(bx, b); ctx.quadraticCurveTo(bx + 2, b - 8, bx + (i % 2 ? 6 : -4), b - 13); ctx.stroke(); } circle(x + w * 0.3, b - h * 0.55, 2.4, '#ff7aa8'); }
  else if (A === 1) { ctx.strokeStyle = 'rgba(255,220,170,.42)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - w / 2 + 3, b - h * 0.33); ctx.lineTo(x + w / 2 - 2, b - h * 0.28); ctx.moveTo(x - w / 2 + 8, b - h * 0.14); ctx.lineTo(x + w / 2 - 4, b - h * 0.12); ctx.stroke(); ctx.strokeStyle = 'rgba(120,50,20,.4)'; ctx.beginPath(); ctx.moveTo(x - w / 2 + 4, b - h * 0.24); ctx.lineTo(x + w / 2 - 3, b - h * 0.2); ctx.stroke(); }
  else if (A === 3) { ctx.save(); ctx.shadowColor = '#ff5a00'; ctx.shadowBlur = LOWFX ? 0 : (10); ctx.strokeStyle = `rgba(255,${120 + 40 * Math.sin(T * 4 + o.x) | 0},30,.9)`; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - w * 0.25, b - h * 0.5); ctx.lineTo(x - 2, b - h * 0.3); ctx.lineTo(x + w * 0.2, b - h * 0.45); ctx.moveTo(x - 2, b - h * 0.3); ctx.lineTo(x - 6, b - 5); ctx.stroke(); ctx.restore(); }
  else if (A === 5) { drawStar(x + w * 0.15, b - h * 0.32, 6, '#ff9a6a'); ctx.fillStyle = '#ffe0d0'; ctx.beginPath(); ctx.arc(x - w * 0.22, b - 3, 5, Math.PI, 0); ctx.fill(); }
  else if (A === 6) { for (let i = 0; i < 3; i++) { ctx.strokeStyle = ['#f0705a', '#b86ad0', '#f0c84a'][i]; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - w * 0.2 + i * 9, b - h * 0.85); ctx.quadraticCurveTo(x - w * 0.2 + i * 11 - 6, b - h - 8, x - w * 0.2 + i * 12 - 8, b - h - 14 - i * 3); ctx.stroke(); } }
  else if (A === 7) { ell(x - w * 0.05, b - h * 0.93, w * 0.34, 6, 0, '#fff'); ell(x - w * 0.2, b - h * 0.86, w * 0.12, 3, 0, '#dcecff'); }
}
// raptors and compys wear the colours of their world, so a snow raptor is not a jungle raptor
function worldRaptor() { return ({ 1: { col: '#c98a4a', dark: '#7a4a1e', fea: '#e8553a' }, 2: { col: '#8fa6bf', dark: '#4a5f78', fea: '#e8f4ff', belly: '#f4f8ff' }, 3: { col: '#6a3a30', dark: '#2a1410', fea: '#ff7a2a', belly: '#b8745a' }, 5: { col: '#d4a15a', dark: '#8a5a24', fea: '#3fb59a' }, 7: { col: '#8a7a6a', dark: '#4a3e34', fea: '#d8e4f0', belly: '#e8e0d0' } })[ART(G.wi)] || {}; }
function worldCompy() { return ({ 1: ['#f0cf6a', '#d9a232', '#8a6012', '#5a3e0a'], 2: ['#e4f2ff', '#9cc4e8', '#5f86b0', '#3a5a7a'], 3: ['#ffa468', '#d4541f', '#7a2a0f', '#4a1a0a'], 5: ['#8ae8cc', '#3fb59a', '#1f7a66', '#0f4a3e'], 7: ['#c4d2e0', '#8aa0b8', '#5a7088', '#3a4a5e'] })[ART(G.wi)]; }
function drawObstacle(o, cam, th) {
  const x = o.x - cam;
  if (x < -150 || x > W + 150) return;
  switch (o.type) {
    case 'rock': {
      const base = ART(G.wi) === 2 ? '#56657f' : th.rock;
      shadow(x, GROUND + 2, o.w * 0.75, 0.35);
      ctx.fillStyle = vgrad(GROUND - o.h, GROUND, shade(base, 1.35), base, shade(base, 0.6));
      ctx.beginPath(); ctx.moveTo(x - o.w / 2, GROUND); ctx.lineTo(x - o.w / 2 + 6, GROUND - o.h * 0.6); ctx.lineTo(x - o.w / 6, GROUND - o.h); ctx.lineTo(x + o.w / 4, GROUND - o.h * 0.9); ctx.lineTo(x + o.w / 2, GROUND - o.h * 0.4); ctx.lineTo(x + o.w / 2, GROUND); ctx.closePath(); ctx.fill(); rim();
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.moveTo(x - o.w / 2 + 8, GROUND - o.h * 0.55); ctx.lineTo(x - o.w / 6, GROUND - o.h + 4); ctx.lineTo(x, GROUND - o.h * 0.7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, GROUND - o.h * 0.8); ctx.lineTo(x + 10, GROUND - o.h * 0.4); ctx.lineTo(x + 2, GROUND - 6); ctx.stroke();
      if (ART(G.wi) === 2) { ell(x - 4, GROUND - o.h + 3, o.w * 0.28, 5, 0, '#fff'); }
      rockTheme(x, o);
      if (o.sec) { const pu = 0.7 + 0.3 * Math.sin(T * 3); ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for (const [w, a, c] of [[7, 0.35, '#ffb030'], [3, 1, '#fff3a0']]) { ctx.globalAlpha = pu * a; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x - 5, GROUND - o.h + 5); ctx.lineTo(x + 4, GROUND - o.h * 0.72); ctx.lineTo(x - 7, GROUND - o.h * 0.5); ctx.lineTo(x + 3, GROUND - o.h * 0.28); ctx.lineTo(x - 3, GROUND - 5); ctx.stroke(); } ctx.restore(); }
      break;
    }
    case 'boulder': { // a lumpy rock in the colours of its world (not an egg shape)
      const A = ART(G.wi), cy = GROUND - o.h / 2 + 4, seed = Math.floor(o.x) % 7;
      const bc = { 0: '#7d8076', 1: '#b8683c', 2: '#5a6a84', 3: '#3a2a26', 5: '#c9a874', 6: '#8a5f7a', 7: '#7f8896' }[A] || '#7d7d86';
      const bp = () => { ctx.beginPath(); for (let k = 0; k <= 28; k++) { const a = k / 28 * Math.PI * 2, r = 1 + 0.06 * Math.sin(k * 1.9 + seed) + 0.04 * Math.sin(k * 4.3 + seed * 2); ctx.lineTo(x + Math.cos(a) * o.w / 2 * r, cy + Math.sin(a) * o.h / 2 * r * (Math.sin(a) > 0 ? 0.98 : 1)); } ctx.closePath(); };
      shadow(x, GROUND + 2, o.w * 0.65, 0.35);
      bp(); ctx.fillStyle = bc; ctx.fill(); rim();
      ctx.save(); bp(); ctx.clip();
      const g = ctx.createRadialGradient(x - o.w * 0.18, cy - o.h * 0.25, 4, x, cy, o.h * 0.78); g.addColorStop(0, shade(bc, 1.5)); g.addColorStop(0.55, bc); g.addColorStop(1, shade(bc, 0.45)); ctx.fillStyle = g; ctx.fillRect(x - o.w, cy - o.h, o.w * 2, o.h * 2);
      ctx.fillStyle = 'rgba(0,0,0,.13)'; for (const [dx, dy, rx, ry] of [[0.18, 0.12, 0.2, 0.1], [-0.2, 0.28, 0.16, 0.08], [0.05, -0.25, 0.14, 0.07], [0.26, -0.1, 0.1, 0.12]]) { ctx.beginPath(); ctx.ellipse(x + o.w * dx, cy + o.h * dy, o.w * rx, o.h * ry, 0.4, 0, 7); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - o.w * 0.4, cy + o.h * 0.1); ctx.quadraticCurveTo(x, cy + o.h * 0.02, x + o.w * 0.4, cy + o.h * 0.12); ctx.stroke();
      if (A === 1) { ctx.strokeStyle = 'rgba(90,30,10,.28)'; ctx.lineWidth = 3; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x - o.w / 2, cy + k * o.h * 0.17); ctx.quadraticCurveTo(x, cy + k * o.h * 0.17 + 6, x + o.w / 2, cy + k * o.h * 0.17 - 2); ctx.stroke(); } } // sandstone strata
      if (A === 0) { ell(x + o.w * 0.12, cy - o.h * 0.44, o.w * 0.3, o.h * 0.1, -0.1, '#4fae48'); for (let i = 0; i < 4; i++) circle(x - o.w * 0.1 + i * o.w * 0.09, cy - o.h * 0.42 + (i % 2) * 3, 3, '#86dc66'); }
      else if (A === 5) { for (let i = 0; i < 6; i++) circle(x - o.w * 0.3 + i * o.w * 0.12, cy + o.h * (0.1 + (i % 3) * 0.12), 2.4, 'rgba(120,90,50,.5)'); }
      else if (A === 6) { for (let i = 0; i < 9; i++) { const bx = x - o.w * 0.36 + (i % 5) * o.w * 0.18, by = cy - o.h * 0.25 + Math.floor(i / 5) * o.h * 0.3 + (i % 2) * 6; circle(bx, by, 4.2, '#f0d8e4'); circle(bx, by, 1.8, 'rgba(80,30,60,.6)'); } }
      else if (A === 2 || A === 7) { ell(x, cy - o.h * 0.44, o.w * 0.38, o.h * 0.13, 0, '#fff'); }
      ctx.restore(); bp(); rim();
      if (A === 6) { ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { const bx = x - o.w * 0.25 + i * o.w * 0.17, sw = Math.sin(T * 2 + i) * 3; ctx.strokeStyle = i % 2 ? '#ff8a6a' : '#ffb347'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(bx, cy - o.h * 0.46); ctx.quadraticCurveTo(bx + sw, cy - o.h * 0.58, bx + sw * 1.5, cy - o.h * 0.68); ctx.stroke(); circle(bx + sw * 1.5, cy - o.h * 0.68, 3.4, '#ffe1c8'); } ctx.lineCap = 'butt'; }
      ell(x - 14, GROUND - o.h * 0.66, o.w * 0.2, o.h * 0.14, -0.4, 'rgba(255,255,255,.22)');
      ctx.strokeStyle = A === 3 ? `rgba(255,110,20,${0.6 + 0.4 * Math.sin(T * 4)})` : 'rgba(0,0,0,.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 10, GROUND - o.h + 14); ctx.lineTo(x + 4, GROUND - o.h * 0.6); ctx.lineTo(x - 6, GROUND - o.h * 0.4); ctx.lineTo(x + 12, GROUND - o.h * 0.15); ctx.stroke();
      break;
    }
    case 'low': drawLow(o, x); break;
    case 'hopper': {
      const hy = o.hy || 0, yo = o.yOff || 0, c = critterCol(), flat = o.flat > 0, by = GROUND - hy + yo;
      if (ART(G.wi) !== 0) { drawHopperAlt(o, x, hy, by, flat); break; }
      ctx.save(); if (o.alpha != null) ctx.globalAlpha = clamp(o.alpha, 0, 1);
      shadow(x, GROUND + 2, 26 - hy * 0.08, 0.3);
      if (flat) { ell(x, GROUND - 8, 34, 9, 0, c); ell(x, GROUND - 10, 20, 5, 0, shade(c, 1.4)); circle(x - 14, GROUND - 14, 5, '#fff'); circle(x + 14, GROUND - 14, 5, '#fff'); ctx.restore(); break; }
      const st = 1 + (hy < 12 ? 0.12 : 0) - hy * 0.0012;
      ctx.translate(x, by); ctx.scale(1 / st, st);
      ctx.strokeStyle = shade(c, 0.6); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-14, -12); ctx.lineTo(-30, hy > 12 ? 0 : -6); ctx.lineTo(-18, 0); ctx.moveTo(14, -12); ctx.lineTo(28, hy > 12 ? 0 : -6); ctx.lineTo(18, 0); ctx.stroke();
      ell(0, -26, 26, 22, 0, c); ell(0, -16, 16, 12, 0, shade(c, 1.5)); ctx.beginPath(); ctx.ellipse(0, -26, 26, 22, 0, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = '#1b2a14'; ctx.stroke();
      circle(-12, -44, 9, '#fff'); circle(12, -44, 9, '#fff'); ctx.lineWidth = 2.5; ctx.strokeStyle = '#1b2a14'; ctx.beginPath(); ctx.arc(-12, -44, 9, 0, 7); ctx.moveTo(21, -44); ctx.arc(12, -44, 9, 0, 7); ctx.stroke();
      circle(-10, -43, 4.5, '#1b2a14'); circle(14, -43, 4.5, '#1b2a14'); circle(-8.6, -44.6, 1.4, '#fff'); circle(15.4, -44.6, 1.4, '#fff');
      ctx.fillStyle = shade(c, 0.62); for (const [qx, qy, qr] of [[-12, -34, 3.2], [8, -36, 2.6], [-2, -30, 2], [14, -28, 2.2]]) circle(qx, qy, qr, ctx.fillStyle); circle(-3, -28, 1, '#1b2a14'); circle(3, -28, 1, '#1b2a14'); ell(-8, -34, 5, 2, -0.3, 'rgba(255,255,255,.3)'); ctx.fillStyle = shade(c, 0.7); for (const tx of [-34, -30, -26, 26, 30, 34]) circle(tx, hy > 12 ? 0 : -5, 2, ctx.fillStyle);
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -22, 11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.restore(); break;
    }
    case 'plant': {
      if (ART(G.wi) !== 0) { drawSpitter(o, x); break; }
      const pop = o.pop || 0, k = 1 + pop * 0.6;
      shadow(x, GROUND + 2, 34, 0.3);
      ctx.strokeStyle = '#2f7a2c'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 10, GROUND); ctx.quadraticCurveTo(x + 22, GROUND - 24, x + 4, GROUND - 40); ctx.stroke();
      ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(x + 24, GROUND - 8, 18, 7, -0.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x - 12, GROUND - 7, 16, 6, 0.5, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(x - 6, GROUND - 52); ctx.scale(k, 1 / k);
      circle(0, 0, 25, '#c0392b'); ctx.beginPath(); ctx.arc(0, 0, 25, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = '#4a1510'; ctx.stroke();
      ctx.fillStyle = '#2b0a08'; ctx.beginPath(); ctx.ellipse(-12, 2, 14, 11 + pop * 14, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-22 + i * 7, -6); ctx.lineTo(-18 + i * 7, 2); ctx.lineTo(-15 + i * 7, -6); ctx.fill(); }
      circle(6, -12, 6, '#fff'); circle(7, -12, 3, '#222'); circle(10, 4, 3.2, '#ff8a80'); circle(14, -4, 3.2, '#ff8a80'); ell(-4, -17, 9, 4, -0.5, 'rgba(255,255,255,.28)'); ctx.fillStyle = 'rgba(255,200,180,.4)'; for (const [qx, qy] of [[4, 8], [-4, 14], [14, 12]]) circle(qx, qy, 2.2, ctx.fillStyle); ctx.strokeStyle = '#7a1a10'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(-2, -10); ctx.moveTo(4, -22); ctx.lineTo(8, -18); ctx.stroke();
      ctx.restore(); break;
    }
    case 'seed': { // what the spitter shoots, per world
      const A = ART(G.wi); ctx.save(); ctx.translate(x, o.y); ctx.rotate(o.rot || 0);
      if (A === 1) { circle(0, 0, 10, '#7a2a1a'); ctx.fillStyle = '#d8b090'; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.3) * 9, Math.sin(a - 0.3) * 9); ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); ctx.lineTo(Math.cos(a + 0.3) * 9, Math.sin(a + 0.3) * 9); ctx.fill(); } ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.lineWidth = 2.4; ctx.strokeStyle = '#2a0e08'; ctx.stroke(); ell(-3, -3, 3, 2, 0, 'rgba(255,255,255,.4)'); }
      else if (A === 2 || A === 7) { circle(0, 0, 13, '#fff'); ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.lineWidth = 2.5; ctx.strokeStyle = '#6a8ab8'; ctx.stroke(); ctx.fillStyle = 'rgba(150,190,235,.55)'; ctx.beginPath(); ctx.ellipse(4, 4, 8, 6, 0.6, 0, 7); ctx.fill(); ell(-4, -5, 4, 2.4, 0, 'rgba(255,255,255,.9)'); }
      else if (A === 3) { ctx.save(); ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = LOWFX ? 0 : (16); const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, 14); g.addColorStop(0, '#fff3a0'); g.addColorStop(0.5, '#ff8a20'); g.addColorStop(1, '#8a1a08'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill(); ctx.restore(); ctx.fillStyle = 'rgba(40,16,10,.8)'; ctx.beginPath(); ctx.ellipse(4, -4, 5, 3, 0.5, 0, 7); ctx.fill(); }
      else if (A === 5) { const g = ctx.createRadialGradient(-3, -4, 2, 0, 0, 14); g.addColorStop(0, '#e8fbff'); g.addColorStop(0.6, '#5fd0ea'); g.addColorStop(1, '#1d78c0'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#0a4a80'; ctx.stroke(); ell(-4, -5, 4, 2.4, 0, 'rgba(255,255,255,.85)'); }
      else { circle(0, 0, 13, '#5a3a1a'); ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.lineWidth = 2.5; ctx.strokeStyle = '#1b0f06'; ctx.stroke(); ell(-4, -5, 5, 3, 0.5, 'rgba(255,255,255,.4)'); ctx.strokeStyle = '#2f7a2c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(16, -14); ctx.stroke(); }
      ctx.restore(); ctx.fillStyle = { 1: 'rgba(200,120,60,.35)', 2: 'rgba(200,225,255,.4)', 7: 'rgba(200,225,255,.4)', 3: 'rgba(255,140,40,.4)', 5: 'rgba(120,210,240,.4)' }[A] || 'rgba(95,191,74,.35)'; ctx.beginPath(); ctx.ellipse(x + 26, o.y, 18, 4, 0, 0, 7); ctx.fill(); break;
    }
    case 'meteor': {
      if (o.state === 'wait') { const a = 0.35 + 0.35 * Math.sin(T * 12); ctx.strokeStyle = `rgba(255,70,50,${a + 0.2})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, GROUND + 4, 36, 9, 0, 0, 7); ctx.stroke(); ctx.fillStyle = `rgba(255,70,50,${a * 0.5})`; ctx.fill(); otxt('!', x, GROUND - 30 + Math.sin(T * 10) * 4, 30, '#ff5a3a', '#fff', 5); break; }
      if (o.state === 'fall') { const yy = o.y; const tr = ctx.createLinearGradient(x, yy - 160, x, yy); tr.addColorStop(0, 'rgba(255,120,30,0)'); tr.addColorStop(1, 'rgba(255,170,50,.9)'); ctx.fillStyle = tr; ctx.beginPath(); ctx.moveTo(x - 24, yy); ctx.lineTo(x + 24, yy); ctx.lineTo(x + 6, yy - 170); ctx.lineTo(x - 6, yy - 170); ctx.fill();
        const fg = ctx.createRadialGradient(x, yy, 6, x, yy, 40); fg.addColorStop(0, 'rgba(255,240,170,.95)'); fg.addColorStop(0.5, 'rgba(255,140,40,.6)'); fg.addColorStop(1, 'rgba(255,90,20,0)'); circle(x, yy, 40, fg); // fiery halo
        meteorRock(x, yy, 0.8, 1); break; }
      shadow(x, GROUND + 2, 40, 0.35);
      ctx.fillStyle = 'rgba(30,18,12,.55)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 1, 46, 7, 0, 0, 7); ctx.fill(); // scorched crater rim
      meteorRock(x, GROUND - 22, 1, 0.55 + 0.35 * Math.sin(T * 5 + o.x));
      for (let i = 0; i < 2; i++) { const u = (T * 0.45 + i * 0.5 + o.x * 0.001) % 1; ctx.globalAlpha = 0.35 * (1 - u); circle(x - 6 + i * 12 + Math.sin(u * 6 + i) * 6, GROUND - 46 - u * 50, 8 + u * 14, '#8a8078'); } ctx.globalAlpha = 1; // smoke
      break;
    }
    case 'pad': {
      const sq = (o.sq || 0) / 0.35, k = 1 - Math.sin(clamp(sq, 0, 1) * Math.PI) * 0.35;
      if (ART(G.wi) === 2 || ART(G.wi) === 7) { // bouncy snowball with a face and a scarf
        shadow(x, GROUND + 2, 40, 0.3); ctx.save(); ctx.translate(x, GROUND); ctx.scale(1 + (1 - k) * 0.7, k);
        const g = ctx.createRadialGradient(-10, -42, 4, 0, -28, 34); g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#dcebfb'); g.addColorStop(1, '#9fc0e6'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -28, 28, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#3a5a8a'; ctx.stroke();
        ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(-26, -22); ctx.quadraticCurveTo(0, -12, 26, -22); ctx.lineTo(25, -13); ctx.quadraticCurveTo(0, -3, -25, -13); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7a1414'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) ctx.fillRect(-20 + i * 10, -18 + Math.sin(i) * 1, 4, 6);
        circle(-9, -38, 3.4, '#1a1a22'); circle(9, -38, 3.4, '#1a1a22'); circle(-8, -39.2, 1, '#fff'); circle(10, -39.2, 1, '#fff'); ctx.fillStyle = '#ff8a1c'; ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(15, -31); ctx.lineTo(0, -29); ctx.fill(); ctx.strokeStyle = '#8a4a08'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = '#1a1a22'; for (let i = -2; i <= 2; i++) circle(i * 5, -46 + (i * i) * 0.4 - 0.5, 1.5, '#1a1a22'); ell(-12, -46, 8, 4, -0.5, 'rgba(255,255,255,.7)');
        ctx.restore(); if (Math.sin(T * 5) > 0.2) otxt('↑', x, GROUND - 104, 24, '#ffd34d', '#000', 4); break;
      }
      if (ART(G.wi) === 3) { // bouncy lava bubble
        shadow(x, GROUND + 2, 40, 0.3); ctx.save(); ctx.translate(x, GROUND); ctx.scale(1 + (1 - k) * 0.7, k);
        ctx.save(); ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = LOWFX ? 0 : (20); const g = ctx.createRadialGradient(-8, -38, 3, 0, -26, 30); g.addColorStop(0, '#fff3a0'); g.addColorStop(0.45, '#ff9a24'); g.addColorStop(1, '#c0300a'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -26, 29, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); ctx.lineWidth = 3; ctx.strokeStyle = '#5a1a0a'; ctx.beginPath(); ctx.ellipse(0, -26, 29, 26, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-12, -40, 8, 4.6, -0.5, 0, 7); ctx.fill(); for (let i = 0; i < 4; i++) { const u = (T * 0.8 + i / 4) % 1; ctx.fillStyle = `rgba(255,230,140,${1 - u})`; ctx.beginPath(); ctx.arc(-14 + i * 9, -8 - u * 30, 2 + (1 - u) * 3, 0, 7); ctx.fill(); }
        ctx.fillStyle = 'rgba(70,24,14,.8)'; ctx.beginPath(); ctx.ellipse(0, -2, 24, 5, 0, 0, 7); ctx.fill(); ctx.restore(); ell(x - 30, GROUND - 2, 10, 3, 0, '#3a2018'); ell(x + 30, GROUND - 2, 10, 3, 0, '#3a2018');
        if (Math.sin(T * 5) > 0.2) otxt('↑', x, GROUND - 104, 24, '#ffd34d', '#000', 4); break;
      }
      if (ART(G.wi) === 1) { // springy barrel cactus with a pink flower on top
        shadow(x, GROUND + 2, 44, 0.3); ctx.save(); ctx.translate(x, GROUND); ctx.scale(1 + (1 - k) * 0.7, k);
        const g = vgrad(-54, 0, '#86cc62', '#4f9040', '#2a5a24'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -27, 28, 27, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1f3a18'; ctx.stroke();
        ctx.strokeStyle = 'rgba(20,60,20,.38)'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 5, -53); ctx.quadraticCurveTo(i * 15, -27, i * 9, -1); ctx.stroke(); }
        ctx.fillStyle = '#fff4cf'; for (let i = -2; i <= 2; i++) for (let j = 0; j < 4; j++) { const yy = -46 + j * 13 + (i % 2) * 5, xx = i * 10 * (1 - Math.abs(yy + 27) / 70); ctx.fillRect(xx - 1, yy, 2, 4); ctx.fillRect(xx - 3, yy + 1, 6, 1.4); }
        ell(-11, -38, 6, 12, 0.3, 'rgba(255,255,255,.22)');
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; circle(Math.cos(a) * 9, -54 + Math.sin(a) * 5.4, 6, i % 2 ? '#ff7aa0' : '#ff5a88'); } circle(0, -54, 5.4, '#ffd166'); circle(-1.6, -55.6, 1.8, '#fff3b0');
        ctx.restore(); ell(x - 30, GROUND - 3, 12, 4, 0, '#e8b070'); ell(x + 32, GROUND - 3, 12, 4, 0, '#e8b070');
        if (Math.sin(T * 5) > 0.2) otxt('↑', x, GROUND - 104, 24, '#ffd34d', '#000', 4); break;
      }
      if (ART(G.wi) === 5 || ART(G.wi) === 6) { // bouncy clam: the lid snaps shut when stepped on and springs open again
        const cy = GROUND - 22, open = 0.7 - Math.sin(clamp(sq, 0, 1) * Math.PI) * 0.6;
        shadow(x, GROUND + 2, 44, 0.3);
        ctx.fillStyle = vgrad(cy, GROUND, '#f6d2c4', '#d4907e'); ctx.beginPath(); ctx.ellipse(x, cy, 38, 22 * k, 0, 0, Math.PI); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#8a4a50'; ctx.stroke();
        ctx.strokeStyle = 'rgba(138,74,80,.4)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 1; i < 6; i++) { const a = Math.PI * i / 6; ctx.moveTo(x, cy + 2); ctx.lineTo(x + Math.cos(a) * 34, cy + Math.sin(a) * 19 * k); } ctx.stroke();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(x, cy - 2, 2, x, cy - 2, 36); gl.addColorStop(0, `rgba(255,255,255,${0.55 * open + 0.15})`); gl.addColorStop(1, 'rgba(255,220,240,0)'); ctx.fillStyle = gl; ctx.fillRect(x - 36, cy - 38, 72, 72); ctx.restore();
        circle(x, cy - 3, 9, '#fff'); circle(x - 2.6, cy - 6, 3, 'rgba(255,255,255,.95)'); ctx.strokeStyle = 'rgba(200,170,210,.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, cy - 3, 9, 0.3, 2.2); ctx.stroke();
        ctx.save(); ctx.translate(x + 36, cy); ctx.rotate(open); ctx.fillStyle = vgrad(-34, 0, '#ffe2d6', '#e8a090'); ctx.beginPath(); ctx.ellipse(-36, 0, 38, 26, 0, Math.PI, 0); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#8a4a50'; ctx.stroke();
        ctx.strokeStyle = 'rgba(138,74,80,.45)'; ctx.lineWidth = 1.8; ctx.beginPath(); for (let i = 1; i < 6; i++) { const a = Math.PI + Math.PI * i / 6; ctx.moveTo(-36, -2); ctx.lineTo(-36 + Math.cos(a) * 36, Math.sin(a) * 24); } ctx.stroke(); ell(-48, -16, 12, 4, -0.5, 'rgba(255,255,255,.4)'); ctx.restore();
        if (Math.sin(T * 5) > 0.2) otxt('↑', x, GROUND - 104, 24, '#ffd34d', '#000', 4); break;
      }
      shadow(x, GROUND + 2, 40, 0.3); rr(x - 11, GROUND - 38 * k, 22, 38 * k, 8); ctx.fillStyle = '#f3e7cf'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
      const cy = GROUND - 38 * k, cw = 46 + sq * 10; ctx.beginPath(); ctx.moveTo(x - cw, cy); ctx.bezierCurveTo(x - cw, cy - 62 * k, x + cw, cy - 62 * k, x + cw, cy); ctx.quadraticCurveTo(x, cy + 10, x - cw, cy); ctx.closePath(); ctx.fillStyle = vgrad(cy - 50, cy + 6, '#ff6a5a', '#c62828'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#4a1510'; ctx.stroke();
      ctx.fillStyle = '#fff'; for (const [dx, dy, r] of [[-24, -14, 7], [2, -34, 8], [26, -16, 6], [-4, -14, 5]]) { ctx.beginPath(); ctx.arc(x + dx, cy + dy * k, r, 0, 7); ctx.fill(); }
      if (Math.sin(T * 5) > 0.2) otxt('↑', x, GROUND - 100, 24, '#ffd34d', '#000', 4); break;
    }
    case 'wall': { // a tall wall that only the dash can break
      if (ART(G.wi) === 1) { canyonWall(x, o); if (Math.sin(T * 6) > 0) otxt('FLITZ!', x, GROUND - o.h - 62, 22, '#ffd34d', '#000', 5); break; }
      shadow(x, GROUND + 2, o.w * 0.8, 0.35); const sand = G.wi === 5, c = sand ? '#e8cf8a' : th.rock;
      ctx.fillStyle = vgrad(GROUND - o.h, GROUND, shade(c, 1.25), c, shade(c, 0.7)); ctx.beginPath(); ctx.rect(x - o.w / 2, GROUND - o.h, o.w, o.h); ctx.fill(); rim();
      ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 2; for (let yy = GROUND - o.h + 36; yy < GROUND; yy += 36) { ctx.beginPath(); ctx.moveTo(x - o.w / 2, yy); ctx.lineTo(x + o.w / 2, yy); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(x, GROUND - o.h); ctx.lineTo(x - 6, GROUND - o.h * 0.5); ctx.lineTo(x + 8, GROUND - o.h * 0.25); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(x - o.w / 2, GROUND - o.h, o.w, o.h); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2; for (let r = 0, yy = GROUND - o.h; yy < GROUND; yy += 36, r++) { for (const jx of [r % 2 ? -0.22 : 0.22, r % 2 ? 0.3 : -0.3]) { ctx.beginPath(); ctx.moveTo(x + o.w * jx, yy); ctx.lineTo(x + o.w * jx, yy + 36); ctx.stroke(); } }
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(x - o.w / 2, GROUND - o.h, 4, o.h); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + o.w / 2 - 5, GROUND - o.h, 5, o.h);
      ctx.fillStyle = 'rgba(0,0,0,.1)'; for (const [dx, dy] of [[-0.25, 0.3], [0.2, 0.55], [-0.1, 0.8], [0.28, 0.12]]) { ctx.beginPath(); ctx.ellipse(x + o.w * dx, GROUND - o.h + o.h * dy, 7, 4, 0.3, 0, 7); ctx.fill(); }
      if (G.wi === 0) { ctx.strokeStyle = '#3f9b3a'; ctx.lineWidth = 2.4; for (const vx of [-0.3, 0.1, 0.34]) { ctx.beginPath(); ctx.moveTo(x + o.w * vx, GROUND - o.h); ctx.quadraticCurveTo(x + o.w * vx + 6, GROUND - o.h + 30, x + o.w * vx - 2, GROUND - o.h + 50 + vx * 40); ctx.stroke(); } }
      ctx.restore();
      ctx.fillStyle = vgrad(GROUND - o.h - 18, GROUND - o.h, shade(c, 1.3), c); for (let i = 0; i < 3; i++) ctx.fillRect(x - o.w / 2 + i * (o.w / 3) + 2, GROUND - o.h - 16, o.w / 3 - 5, 16);
      if (sand) { ctx.fillStyle = '#e53935'; ctx.fillRect(x - 1.5, GROUND - o.h - 44, 3, 30); ctx.beginPath(); ctx.moveTo(x + 1, GROUND - o.h - 44); ctx.lineTo(x + 22, GROUND - o.h - 37); ctx.lineTo(x + 1, GROUND - o.h - 30); ctx.fill(); }
      if (Math.sin(T * 6) > 0) otxt('FLITZ!', x, GROUND - o.h - 62, 22, '#ffd34d', '#000', 5);
      break;
    }
    case 'tide': { shadow(x, GROUND + 2, 70, 0.2); const wv = ctx.createLinearGradient(0, GROUND - 130, 0, GROUND); wv.addColorStop(0, '#bff3ff'); wv.addColorStop(0.35, '#4ac0ea'); wv.addColorStop(1, '#1d78c0'); ctx.fillStyle = wv; ctx.beginPath(); ctx.moveTo(x + 50, GROUND); ctx.lineTo(x + 50, GROUND - 40); ctx.quadraticCurveTo(x + 44, GROUND - 130, x - 20, GROUND - 126); ctx.quadraticCurveTo(x - 66, GROUND - 126, x - 74, GROUND - 88); ctx.quadraticCurveTo(x - 40, GROUND - 100, x - 50, GROUND - 60); ctx.quadraticCurveTo(x - 70, GROUND - 20, x - 74, GROUND); ctx.closePath(); ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#0a4a80'; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 6; i++) circle(x - 62 + i * 20 + Math.sin(T * 8 + i) * 3, GROUND - 120 + (i % 2) * 8 + Math.sin(T * 6 + i) * 3, 7, '#fff'); break; }
    case 'rollrock': { shadow(x, GROUND + 2, 34, 0.3); ctx.save(); ctx.translate(x, GROUND - 32); ctx.rotate(o.rot || 0); circle(0, 0, 32, th.rock); ctx.beginPath(); ctx.arc(0, 0, 32, 0, 7); rim(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(0, 4); ctx.lineTo(14, -14); ctx.moveTo(0, 4); ctx.lineTo(6, 22); ctx.stroke(); ctx.restore(); break; }
    case 'urchin': { const rs = o.scared ? o.rise || 0 : 0; if (o.scared) ctx.globalAlpha = Math.max(0, o.alpha); else shadow(x, GROUND + 2, 26, 0.3); ctx.save(); ctx.translate(x, GROUND - 22 - rs); ctx.strokeStyle = '#2a1840'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); ctx.stroke(); } circle(0, 0, 14, '#5a2a8a'); ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.strokeStyle = '#1a0a30'; ctx.lineWidth = 3; ctx.stroke(); circle(-4, -5, 4, 'rgba(255,255,255,.3)'); ctx.fillStyle = '#c880f0'; for (let i = 0; i < 14; i += 2) { const a = i / 14 * Math.PI * 2; circle(Math.cos(a) * 24, Math.sin(a) * 24, 1.8, '#d9a0f8'); } if (o.scared) { ctx.fillStyle = 'rgba(200,240,255,.28)'; ctx.beginPath(); ctx.arc(0, 0, 33, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.stroke(); circle(-12, -13, 5, 'rgba(255,255,255,.8)'); } ctx.restore(); ctx.globalAlpha = 1; break; }
    case 'jelly': { const y = o.y || o.y0, pu = 1 + 0.1 * Math.sin(T * 5 + o.ph); ctx.save(); ctx.translate(x, y); ctx.scale(1 / pu, pu); ctx.fillStyle = 'rgba(255,150,200,.9)'; ctx.beginPath(); ctx.moveTo(-26, 4); ctx.bezierCurveTo(-28, -34, 28, -34, 26, 4); ctx.quadraticCurveTo(14, 10, 0, 4); ctx.quadraticCurveTo(-14, 10, -26, 4); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#8a2a6a'; ctx.stroke(); ctx.strokeStyle = 'rgba(255,190,225,.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 9, 6); ctx.quadraticCurveTo(i * 9 + Math.sin(T * 4 + i) * 6, 22, i * 9 - Math.sin(T * 3 + i) * 5, 38); ctx.stroke(); } circle(-8, -12, 4, 'rgba(255,255,255,.6)'); circle(-9, -6, 2.4, '#222'); circle(9, -6, 2.4, '#222'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const [qx, qy, qp] of [[-14, -18, 0], [4, -24, 1.4], [14, -12, 2.6], [-2, -8, 3.8]]) { ctx.globalAlpha = 0.45 + 0.35 * Math.sin(T * 3 + qp); circle(qx, qy, 3, '#ffe0f4'); } ctx.restore(); ctx.strokeStyle = 'rgba(138,42,106,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -4, 17, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.restore(); break; }
    case 'sword': { const y = o.y, al = o.alpha == null ? 1 : Math.max(0, o.alpha); ctx.globalAlpha = al; ctx.save(); ctx.translate(x, y); ctx.scale(o.scared ? 1 : -1, 1); ctx.fillStyle = vgrad(-14, 14, '#9ab8d8', '#4f78a8'); ctx.beginPath(); ctx.ellipse(0, 0, 34, 13, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#4f78a8'; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-46, -14); ctx.lineTo(-44, 0); ctx.lineTo(-46, 14); ctx.fill(); ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(0, -26); ctx.lineTo(10, -10); ctx.fill(); ctx.fillStyle = '#dfe8f4'; ctx.beginPath(); ctx.moveTo(32, -2); ctx.lineTo(84, 0); ctx.lineTo(32, 3); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#1b2a44'; ctx.beginPath(); ctx.ellipse(0, 0, 34, 13, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(27,42,68,.35)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-18 + i * 9, -11 + i * 0.8); ctx.quadraticCurveTo(-20 + i * 9, 0, -18 + i * 9, 11 - i * 0.8); ctx.stroke(); } ell(-4, 5, 18, 4, 0, 'rgba(235,245,255,.55)'); circle(20, -3, 5, '#fff'); circle(21.5, -3, 2.6, '#222'); ctx.strokeStyle = '#1b2a44'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(14, -10); ctx.lineTo(27, -6); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; break; }
    case 'cgate': { const seg = (y0, y1, up) => { // reef pillar: rocky column with coral ridges, barnacles and a living cap
        ctx.fillStyle = hgrad(x - 30, x + 30, '#6d4a56', '#b5788a', '#5a3a48'); ctx.beginPath(); ctx.moveTo(x - 27, y0); ctx.lineTo(x + 27, y0); ctx.lineTo(x + 31, (y0 + y1) / 2); ctx.lineTo(x + 27, y1); ctx.lineTo(x - 27, y1); ctx.lineTo(x - 31, (y0 + y1) / 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2f1a26'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 2; for (let yy = y0 + 18; yy < y1; yy += 34) { ctx.beginPath(); ctx.moveTo(x - 26, yy); ctx.quadraticCurveTo(x, yy + 8, x + 26, yy - 4); ctx.stroke(); }
        for (let yy = y0 + 22; yy < y1; yy += 38) { circle(x - 14 + ((yy * 7) % 24), yy, 4, 'rgba(255,214,200,.5)'); } };
      seg(-30, o.gapY); seg(o.gapY + o.gapH, GROUND + 20);
      for (const [yy, up] of [[o.gapY, 1], [o.gapY + o.gapH, -1]]) { // branching coral and anemone fingers at the lips of the gap
        for (let i = -2; i <= 2; i++) { const bx = x + i * 11, ln = 14 + ((i + 2) % 3) * 6, sw = Math.sin(T * 2 + i) * 3; ctx.strokeStyle = i % 2 ? '#ff8a6a' : '#ffb347'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, yy); ctx.quadraticCurveTo(bx + sw, yy + up * ln * 0.5, bx + sw * 1.6, yy + up * ln); ctx.stroke(); circle(bx + sw * 1.6, yy + up * ln, 4, '#ffe1c8'); }
        ctx.lineCap = 'butt'; }
      break; }
    case 'updraft': { ctx.save(); // a soft column of rising air: feathered at the sides and fading out towards the top, with chevrons that rise and fade
      const cg = ctx.createLinearGradient(x - o.w / 2, 0, x + o.w / 2, 0); cg.addColorStop(0, 'rgba(255,255,255,0)'); cg.addColorStop(0.5, 'rgba(255,255,255,1)'); cg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = cg;
      for (let b = 0; b < 22; b++) { ctx.globalAlpha = 0.46 * Math.pow(1 - b / 22, 1.2); ctx.fillRect(x - o.w / 2, GROUND - (b + 1) * 15, o.w, 15); }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < 9; i++) { const q = ((T * 1.7 + i / 9) % 1), yy = GROUND - q * 330, xx = x + Math.sin(q * 9 + i * 2) * (o.w * 0.34); ctx.globalAlpha = 0.8 * Math.sin(q * Math.PI); ctx.beginPath(); ctx.moveTo(xx - 7, yy + 9); ctx.lineTo(xx, yy); ctx.lineTo(xx + 7, yy + 9); ctx.stroke(); }
      ctx.restore(); break; }
    case 'geode': {
      ell(x, GROUND + 2, 40, 6, 0, 'rgba(0,0,0,.25)');
      ctx.fillStyle = vgrad(GROUND - 44, GROUND, '#a8a8b0', '#6e6e78', '#4a4a52'); ctx.beginPath(); ctx.moveTo(x - 38, GROUND); ctx.quadraticCurveTo(x - 40, GROUND - 40, x, GROUND - 44); ctx.quadraticCurveTo(x + 40, GROUND - 40, x + 38, GROUND); ctx.closePath(); ctx.fill(); rim();
      ctx.strokeStyle = 'rgba(30,30,35,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, GROUND - 44); ctx.lineTo(x + 4, GROUND - 28); ctx.lineTo(x - 6, GROUND - 18); ctx.lineTo(x + 2, GROUND - 4); ctx.moveTo(x + 4, GROUND - 28); ctx.lineTo(x + 20, GROUND - 22); ctx.stroke();
      for (const [ax, ay] of [[-16, -20], [14, -12], [-4, -30]]) { ctx.globalAlpha = 0.7 + 0.3 * Math.sin(T * 5 + ax); drawAmber(x + ax, GROUND + ay, 6); } ctx.globalAlpha = 1;
      const by = GROUND - 66 - Math.abs(Math.sin(T * 5)) * 8; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(x - 10, by - 10); ctx.lineTo(x + 10, by - 10); ctx.lineTo(x, by + 4); ctx.fill();
      break;
    }
    case 'compy': if (o.crab) { drawSmallCrab(x, GROUND + (o.yOff || 0), o); break; } if (!o.yOff) shadow(x, GROUND + 2, 22, 0.22); oCompy(x, GROUND + (o.yOff || 0), 1.3, o.ph, !o.scared && o.dir !== 1, { alpha: o.alpha, flat: o.flat > 0, tone: worldCompy() }); break;
    case 'raptor': if (!o.yOff) shadow(x, GROUND + 2, 34, 0.25 * (o.alpha == null ? 1 : Math.max(0, o.alpha))); oRaptor(x, GROUND + (o.yOff || 0), 1.05, o.ph, !o.scared && o.dir !== 1, Object.assign({ alpha: o.alpha }, worldRaptor())); break;
    case 'ptero': ell(x, GROUND + 2, 26, 5, 0, 'rgba(0,0,0,.15)'); oPtero(x, o.y, 1.45, o.ph, !o.scared, { alpha: o.alpha }); break;
    case 'icicle': {
      ctx.fillStyle = '#5f7591'; rr(x - 75, -10, 150, 64, 20); ctx.fill(); ell(x, 50, 70, 10, 0, '#dfefff');
      ctx.fillStyle = 'rgba(200,235,255,.95)';
      const ice = (pts) => { ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.fillStyle = '#c9ecff'; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = '#1d4a78'; ctx.stroke(); };
      if (o.state === 'hang') { const tipX = x + Math.sin(T * 30) * (o.x - G.p.wx < 600 ? 1.5 : 0); ice([[x - 16, 52], [x + 16, 52], [tipX, 122]]); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(x - 9, 56); ctx.lineTo(x - 3, 56); ctx.lineTo(tipX - 2, 100); ctx.fill(); }
      else if (o.state === 'fall') { ice([[x - 16, o.y - 74], [x + 16, o.y - 74], [x, o.y]]); }
      else { shadow(x, GROUND + 2, 30, 0.3); ice([[x - 22, GROUND], [x - 14, GROUND - 30], [x - 4, GROUND - 56], [x + 5, GROUND - 34], [x + 13, GROUND - 42], [x + 22, GROUND]]); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.moveTo(x - 12, GROUND - 6); ctx.lineTo(x - 9, GROUND - 28); ctx.lineTo(x - 4, GROUND - 48); ctx.lineTo(x - 3, GROUND - 6); ctx.fill(); }
      break;
    }
    case 'geyser': {
      const g = ctx.createRadialGradient(x, GROUND, 2, x, GROUND, 50); g.addColorStop(0, '#ffcf3a'); g.addColorStop(1, 'rgba(255,90,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, GROUND, 50, Math.PI, 0); ctx.fill();
      ell(x, GROUND + 1, 38, 8, 0, '#ff7a1a');
      for (let i = 0; i < 3; i++) circle(x - 20 + i * 20, GROUND - 2 - Math.abs(Math.sin(T * 5 + i)) * 6, 4, '#ffd166');
      if (o.t > 0) { const h = 260 * Math.min(1, (0.8 - o.t) * 6) * Math.min(1, o.t * 4); const lg = ctx.createLinearGradient(0, GROUND - h, 0, GROUND); lg.addColorStop(0, '#fff3a0'); lg.addColorStop(1, '#ff5a00'); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x - 22, GROUND); for (let y = 0; y <= h; y += 20) ctx.lineTo(x - 22 + Math.sin(y * 0.1 + T * 20) * 6, GROUND - y); for (let y = h; y >= 0; y -= 20) ctx.lineTo(x + 22 + Math.sin(y * 0.1 + T * 20 + 1) * 6, GROUND - y); ctx.fill(); }
      break;
    }
  }
}
function drawHopperAlt(o, x, hy, by, flat) { // the hopping enemy fits its world: desert jerboa, penguin, magma blob, crab, pika (the frog stays in the jungle)
  const A = ART(G.wi), f = hy > 12 ? 1 : 0;
  ctx.save(); if (o.alpha != null) ctx.globalAlpha = clamp(o.alpha, 0, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  shadow(x, GROUND + 2, 26 - hy * 0.08, 0.3);
  if (A === 5) { // crab
    if (flat) { drawSmallCrab(x, GROUND, { flat: 1, yOff: 1, ph: o.hp || 0 }); ctx.restore(); return; }
    ctx.translate(x, by); ctx.scale(0.8, 0.8 + (hy < 12 ? 0.06 : -hy * 0.0006)); drawSmallCrab(0, 0, { ph: o.hp || 0, yOff: 1 }); ctx.restore(); return;
  }
  const FL = { 1: ['#d9a56a', '#7a5230'], 2: ['#2a3550', '#141c2c'], 3: ['#ff7a24', '#5a1a0a'], 7: ['#a58a72', '#4a3a2c'] }[A] || ['#55b84a', '#1b2a14'];
  if (flat) { ell(x, GROUND - 8, 34, 9, 0, FL[0]); ell(x, GROUND - 10, 20, 5, 0, shade(FL[0], 1.4)); circle(x - 14, GROUND - 14, 5, '#fff'); circle(x + 14, GROUND - 14, 5, '#fff'); ctx.restore(); return; }
  const st = 1 + (hy < 12 ? 0.12 : 0) - hy * 0.0012; ctx.translate(x, by); ctx.scale(1 / st, st);
  const body = (cx, cy, rx, ry, rot, c1, c2) => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, 7); ctx.fillStyle = vgrad(cy - ry, cy + ry, c1, c2); ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = FL[1]; ctx.stroke(); };
  const eye = (ex, ey, r, ps) => { circle(ex, ey, r, '#fff'); ctx.lineWidth = 1.6; ctx.strokeStyle = FL[1]; ctx.beginPath(); ctx.arc(ex, ey, r, 0, 7); ctx.stroke(); circle(ex + ps, ey + 0.5, r * 0.55, '#14100c'); circle(ex + ps + 1.2, ey - 1.2, r * 0.22, '#fff'); };
  if (A === 1) { // jerboa: big ears, long tail with a tuft, very long hind legs
    ctx.strokeStyle = FL[1]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -18); ctx.quadraticCurveTo(-38, -8 - hy * 0.05, -46 + Math.sin(T * 8) * 2, -34); ctx.stroke(); circle(-46, -35, 5, '#3b2616'); circle(-45, -36.5, 2.8, '#fff');
    ctx.strokeStyle = FL[1]; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-4, -15); ctx.lineTo(-17, -7); ctx.lineTo(f ? -28 : -15, f ? -1 : 0); ctx.stroke(); ctx.strokeStyle = '#d9a56a'; ctx.lineWidth = 4.6; ctx.stroke();
    body(0, -24, 16, 13, -0.2, '#e8c08a', '#c9915a'); ell(5, -18, 10, 6.5, -0.2, '#f6e2bf');
    ell(8, -50, 4.6, 14, -0.2, '#d9a56a'); ell(18, -51, 4.6, 14, 0.18, '#d9a56a'); ell(8, -50, 2.2, 9.5, -0.2, '#f4a6b8'); ell(18, -51, 2.2, 9.5, 0.18, '#f4a6b8');
    body(14, -33, 10.5, 9.5, 0, '#e8c08a', '#c9915a'); eye(19, -35, 3.6, 1); circle(25, -31, 2, '#e88aa0'); ctx.strokeStyle = 'rgba(70,40,20,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(23, -30); ctx.lineTo(31, -33); ctx.moveTo(23, -29); ctx.lineTo(31, -27.5); ctx.stroke(); ell(15, -28, 3.4, 2, 0, 'rgba(255,150,130,.4)');
    ctx.strokeStyle = FL[1]; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(8, -22); ctx.lineTo(14, f ? -26 : -16); ctx.stroke();
  } else if (A === 2) { // rockhopper penguin
    ctx.fillStyle = '#ff9a2a'; ctx.strokeStyle = '#8a4a08'; ctx.lineWidth = 2; for (const fx of [-7, 8]) { ctx.beginPath(); ctx.ellipse(fx, f ? -5 : -2, 7, 3.2, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    body(0, -26, 16, 22, 0, '#3e4c70', '#1c2540'); ell(3, -23, 10.5, 16, 0, '#f4f8ff'); ell(0, -16, 9, 6, 0, '#e2ecf8');
    ctx.fillStyle = '#2a3550'; ctx.strokeStyle = FL[1]; ctx.lineWidth = 2.2; const fa = f ? -0.9 : -0.35; ctx.save(); ctx.translate(-14, -32); ctx.rotate(fa); ctx.beginPath(); ctx.ellipse(-3, 8, 5, 13, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
    body(2, -48, 11, 10.5, 0, '#3e4c70', '#1c2540');
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3; for (const [a, b2, c2, d2] of [[-3, -54, -15, -63], [3, -56, -9, -66], [-5, -50, -17, -54]]) { ctx.beginPath(); ctx.moveTo(a, b2); ctx.lineTo(c2, d2); ctx.stroke(); } ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(4, -55); ctx.lineTo(14, -52); ctx.stroke();
    eye(8, -49, 3.8, 1); circle(8.8, -49.5, 1.7, '#d63a2a'); ctx.fillStyle = '#ff9a2a'; ctx.strokeStyle = '#8a4a08'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(11, -46); ctx.quadraticCurveTo(20, -46, 23, -42.5); ctx.quadraticCurveTo(18, -41, 11, -41.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (A === 3) { // magma blob
    ctx.save(); ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = LOWFX ? 0 : (16); const g = ctx.createRadialGradient(-4, -30, 3, 0, -22, 28); g.addColorStop(0, '#ffe27a'); g.addColorStop(0.5, '#ff7a24'); g.addColorStop(1, '#b42a0a'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -21, 24, 20, 0, 0, 7); ctx.fill(); ctx.restore(); ctx.lineWidth = 2.6; ctx.strokeStyle = FL[1]; ctx.beginPath(); ctx.ellipse(0, -21, 24, 20, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(40,20,16,.9)'; for (const [cx2, cy2, rx2, ry2, r2] of [[-9, -34, 9, 4.6, -0.3], [10, -31, 7, 4, 0.3], [0, -39, 5, 2.6, 0]]) { ctx.beginPath(); ctx.ellipse(cx2, cy2, rx2, ry2, r2, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-18, -14); ctx.lineTo(-10, -18); ctx.lineTo(-13, -8); ctx.moveTo(15, -12); ctx.lineTo(9, -17); ctx.stroke();
    for (const [fx2, ph2] of [[-9, 0], [0, 1.7], [9, 3.1]]) { const fl = 0.6 + 0.4 * Math.sin(T * 9 + ph2); ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(fx2 - 4, -38); ctx.quadraticCurveTo(fx2 - 5, -44 * fl - 4, fx2, -48 * fl - 6); ctx.quadraticCurveTo(fx2 + 5, -42 * fl - 2, fx2 + 4, -38); ctx.fill(); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.moveTo(fx2 - 2, -38); ctx.quadraticCurveTo(fx2, -42 * fl, fx2 + 2, -38); ctx.fill(); }
    eye(-8, -22, 5.4, 1.4); eye(8, -22, 5.4, 1.4); ctx.strokeStyle = '#3a0f08'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-14, -31); ctx.lineTo(-3, -27); ctx.moveTo(14, -31); ctx.lineTo(3, -27); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-3, -13); ctx.lineTo(0, -10); ctx.lineTo(3, -13); ctx.lineTo(6, -10); ctx.stroke(); ctx.fillStyle = '#3a1a10'; for (const fx of [-10, 10]) { ctx.beginPath(); ctx.ellipse(fx, f ? -4 : -1, 7, 3.6, 0, 0, 7); ctx.fill(); }
  } else { // pika (mountains)
    ctx.fillStyle = '#8a7058'; ctx.strokeStyle = FL[1]; ctx.lineWidth = 2; for (const fx of [-8, 8]) { ctx.beginPath(); ctx.ellipse(fx, f ? -4 : -2, 7, 3.4, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    body(0, -20, 16, 14, 0, '#b8a08a', '#8a7058'); ell(4, -15, 10, 8, 0, '#e8d8c4');
    circle(4, -44, 5.8, '#a58a72'); circle(16, -46, 5.8, '#a58a72'); ctx.strokeStyle = FL[1]; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(4, -44, 5.8, 0, 7); ctx.arc(16, -46, 5.8, 0, 7); ctx.stroke(); circle(4, -44, 3, '#f4a6b8'); circle(16, -46, 3, '#f4a6b8');
    body(10, -32, 11.5, 10.5, 0, '#c4ac96', '#9a8068'); eye(15, -33, 3.4, 1); circle(21, -30, 1.9, '#3a2a22'); ell(14, -26.5, 4, 2.4, 0, 'rgba(255,150,140,.45)'); ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(19.5, -28, 3, 0.4, 1.8); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,40,30,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20, -29); ctx.lineTo(28, -31); ctx.moveTo(20, -28); ctx.lineTo(28, -26); ctx.stroke(); ctx.strokeStyle = FL[1]; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(13, f ? -24 : -16); ctx.stroke();
  }
  ctx.restore();
}
function canyonWall(x, o) { // a tall banded sandstone spire: cave paintings, a glowing crack that begs to be smashed, rubble and a dry bush on top
  const w = o.w + 26, h = o.h, b = GROUND, pul = 0.6 + 0.4 * Math.sin(T * 4);
  shadow(x, b + 2, w * 0.95, 0.35);
  const pts = [[-w / 2 - 8, 0], [-w / 2 + 2, -h * 0.35], [-w / 2 - 2, -h * 0.62], [-w / 2 + 6, -h * 0.9], [-w * 0.22, -h - 4], [w * 0.05, -h + 8], [w * 0.28, -h - 10], [w / 2 - 4, -h * 0.88], [w / 2 + 2, -h * 0.6], [w / 2 - 2, -h * 0.3], [w / 2 + 8, 0]];
  const path = () => { ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(x + px, b + py) : ctx.moveTo(x + px, b + py)); ctx.closePath(); };
  ctx.save(); path(); ctx.clip();
  const cols = ['#f0c898', '#dca36d', '#c97a48', '#e9b583', '#b96a3c', '#d6935c', '#a85a32', '#e2b27e'];
  for (let i = 0, yy = b - h - 20; yy < b + 6; i++, yy += 17 + (i % 3) * 5) { ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.moveTo(x - w, yy); for (let q = -w; q <= w; q += 12) ctx.lineTo(x + q, yy + Math.sin(q * 0.07 + i) * 2.4 + q * 0.02); ctx.lineTo(x + w, yy + 30); ctx.lineTo(x - w, yy + 30); ctx.closePath(); ctx.fill(); }
  const sh = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); sh.addColorStop(0, 'rgba(255,240,210,.35)'); sh.addColorStop(0.45, 'rgba(255,240,210,0)'); sh.addColorStop(1, 'rgba(60,20,10,.4)'); ctx.fillStyle = sh; ctx.fillRect(x - w, b - h - 20, w * 2, h + 30);
  // cave paintings: a sun, a little dino and handprints in red ochre
  ctx.strokeStyle = 'rgba(120,36,18,.8)'; ctx.fillStyle = 'rgba(120,36,18,.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const sy = b - h * 0.78; ctx.beginPath(); ctx.arc(x - 4, sy, 7, 0, 7); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x - 4 + Math.cos(a) * 10, sy + Math.sin(a) * 10); ctx.lineTo(x - 4 + Math.cos(a) * 15, sy + Math.sin(a) * 15); ctx.stroke(); }
  const dy = b - h * 0.6; ctx.beginPath(); ctx.ellipse(x - 2, dy, 10, 5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 7, dy - 2); ctx.lineTo(x + 15, dy - 11); ctx.lineTo(x + 20, dy - 10); ctx.stroke(); for (const lx of [-8, -2, 4]) { ctx.beginPath(); ctx.moveTo(x + lx, dy + 3); ctx.lineTo(x + lx - 1, dy + 11); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(x - 11, dy); ctx.lineTo(x - 22, dy + 4); ctx.stroke();
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - 6 + i * 4, b - h * 0.36); ctx.lineTo(x - 6 + i * 4, b - h * 0.36 - 9 - (i % 2) * 3); ctx.stroke(); } ctx.beginPath(); ctx.ellipse(x - 1, b - h * 0.36 + 3, 8, 5, 0, 0, 7); ctx.fill();
  // the glowing crack
  const crack = [[0, -h - 2], [-6, -h * 0.82], [4, -h * 0.66], [-5, -h * 0.5], [5, -h * 0.34], [-2, -h * 0.18], [0, 0]];
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const [lw2, a2] of [[16, 0.12], [9, 0.22]]) { ctx.strokeStyle = `rgba(255,170,60,${a2 * pul})`; ctx.lineWidth = lw2; ctx.beginPath(); crack.forEach(([cx2, cy2], i) => i ? ctx.lineTo(x + cx2, b + cy2) : ctx.moveTo(x + cx2, b + cy2)); ctx.stroke(); } ctx.restore();
  ctx.strokeStyle = '#2a1008'; ctx.lineWidth = 5; ctx.beginPath(); crack.forEach(([cx2, cy2], i) => i ? ctx.lineTo(x + cx2, b + cy2) : ctx.moveTo(x + cx2, b + cy2)); ctx.moveTo(x + 4, b - h * 0.66); ctx.lineTo(x + 15, b - h * 0.6); ctx.moveTo(x - 5, b - h * 0.5); ctx.lineTo(x - 16, b - h * 0.44); ctx.stroke();
  ctx.save(); ctx.shadowColor = '#ffb347'; ctx.shadowBlur = LOWFX ? 0 : (10 * pul); ctx.strokeStyle = `rgba(255,${200 + 40 * pul | 0},100,${0.7 + 0.3 * pul})`; ctx.lineWidth = 2.4; ctx.beginPath(); crack.forEach(([cx2, cy2], i) => i ? ctx.lineTo(x + cx2, b + cy2) : ctx.moveTo(x + cx2, b + cy2)); ctx.moveTo(x + 4, b - h * 0.66); ctx.lineTo(x + 15, b - h * 0.6); ctx.moveTo(x - 5, b - h * 0.5); ctx.lineTo(x - 16, b - h * 0.44); ctx.stroke(); ctx.restore();
  ctx.restore();
  path(); ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = '#4a1e0e'; ctx.stroke();
  // rubble at the foot, dust drifting up out of the crack, a dry bush and a little cactus on top
  for (const [rx, ry, rr2] of [[-w / 2 - 14, -4, 9], [-w / 2 - 2, -2, 6], [w / 2 + 12, -3, 8], [w / 2 + 24, -2, 5], [-w / 2 - 26, -2, 5]]) { ell(x + rx, b + ry, rr2, rr2 * 0.65, 0, '#b96a3c'); ell(x + rx - 2, b + ry - 2, rr2 * 0.5, rr2 * 0.3, 0, '#e2b27e'); }
  for (let i = 0; i < 6; i++) { const u = (T * 0.45 + i / 6) % 1; circle(x + (hash(i * 3.3) - 0.5) * 18, b - h * 0.2 - u * h * 0.5, 2 + u * 3, `rgba(255,225,180,${(1 - u) * 0.45})`); }
  cactus(x + w * 0.14, b - h + 2, 28, '#5f7a2a', 11);
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x - w * 0.22, b - h - 2); ctx.quadraticCurveTo(x - w * 0.22 + i * 5, b - h - 12, x - w * 0.22 + i * 8, b - h - 16 + Math.abs(i) * 3); ctx.stroke(); }
}
function drawSpitter(o, x) { // the world's spitting enemy: scorpion, snowman, yeti, mini volcano, anemone (the plant stays in the jungle)
  const A = ART(G.wi), pop = o.pop || 0, k = clamp(pop / 0.3, 0, 1);
  shadow(x, GROUND + 2, 34, 0.3); ctx.save(); ctx.translate(x, GROUND); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (A === 1) { // scorpion
    const C = '#cf8c4c', D = '#5a3014'; ctx.strokeStyle = D; ctx.lineWidth = 3.4; for (let i = 0; i < 4; i++) for (const o2 of [0, 5]) { ctx.beginPath(); ctx.moveTo(-10 + i * 9 + o2, -12); ctx.lineTo(-15 + i * 9 + o2 + Math.sin(T * 9 + i) * 2, -3); ctx.lineTo(-17 + i * 9 + o2, 0); ctx.stroke(); }
    ctx.strokeStyle = D; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(18, -14); ctx.bezierCurveTo(44, -22 - 8 * k, 40, -66 - 16 * k, 10, -62 - 14 * k); ctx.stroke(); ctx.strokeStyle = C; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = '#8a1a10'; ctx.beginPath(); ctx.moveTo(14, -66 - 14 * k); ctx.lineTo(0, -54 - 14 * k); ctx.lineTo(4, -64 - 14 * k); ctx.fill(); ctx.strokeStyle = D; ctx.lineWidth = 1.6; ctx.stroke(); circle(14, -62 - 14 * k, 6, C);
    ell(0, -16, 24, 11, 0, vgrad(-28, -4, '#e6a868', C, '#9a5a28')); ctx.strokeStyle = D; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, -16, 24, 11, 0, 0, 7); ctx.stroke(); ctx.lineWidth = 1.4; ctx.beginPath(); for (const bx of [-8, 0, 8, 16]) { ctx.moveTo(bx, -26); ctx.lineTo(bx - 1, -6); } ctx.stroke();
    ell(-23, -17, 10, 9, 0, C); ctx.beginPath(); ctx.ellipse(-23, -17, 10, 9, 0, 0, 7); ctx.stroke(); circle(-27, -21, 3, '#fff'); circle(-28, -21, 1.6, '#111'); ctx.strokeStyle = D; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-32, -26); ctx.lineTo(-23, -22); ctx.stroke();
    for (const sd of [-1, 1]) { const ay = -14 + sd * 5; ctx.strokeStyle = D; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-26, ay); ctx.lineTo(-38, ay - 8 - 6 * k * (sd < 0 ? 1 : 0.5)); ctx.stroke(); ctx.fillStyle = C; ctx.beginPath(); ctx.ellipse(-44, ay - 10 - 6 * k * (sd < 0 ? 1 : 0.5), 9, 5, -0.5 + sd * 0.45, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.stroke(); }
  } else if (A === 2 || A === 7) { // snowman (ice) or yeti (mountains)
    if (A === 2) {
      ctx.save(); ctx.rotate(-0.1 * k); const g = ctx.createRadialGradient(-8, -30, 3, 0, -26, 28); g.addColorStop(0, '#fff'); g.addColorStop(1, '#bcd6f0'); ctx.fillStyle = g; ctx.strokeStyle = '#6a8ab8'; ctx.lineWidth = 2.6;
      circle(0, -20, 21, g); ctx.beginPath(); ctx.arc(0, -20, 21, 0, 7); ctx.stroke(); circle(0, -50, 16, g); ctx.beginPath(); ctx.arc(0, -50, 16, 0, 7); ctx.stroke(); circle(-2, -73, 12, g); ctx.beginPath(); ctx.arc(-2, -73, 12, 0, 7); ctx.stroke();
      ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(-14, -62); ctx.quadraticCurveTo(-2, -56, 11, -62); ctx.lineTo(10, -56); ctx.quadraticCurveTo(-2, -50, -12, -56); ctx.fill(); ctx.strokeStyle = '#7a1414'; ctx.lineWidth = 1.6; ctx.stroke(); rr(8, -62, 6, 18, 3); ctx.fillStyle = '#d63a3a'; ctx.fill(); ctx.stroke();
      circle(-8, -76, 2.6, '#1a1a22'); circle(3, -76, 2.6, '#1a1a22'); ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-13, -82); ctx.lineTo(-5, -78); ctx.moveTo(8, -82); ctx.lineTo(1, -78); ctx.stroke(); ctx.fillStyle = '#ff8a1c'; ctx.beginPath(); ctx.moveTo(-8, -72); ctx.lineTo(-24, -69); ctx.lineTo(-8, -67); ctx.fill(); ctx.strokeStyle = '#8a4a08'; ctx.lineWidth = 1.4; ctx.stroke(); for (let i = -2; i <= 2; i++) circle(-3 + i * 3.4, -64 + (i * i) * 0.5, 1.2, '#1a1a22'); for (const by of [-26, -14]) circle(0, by, 2.4, '#1a1a22');
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-12, -54); ctx.lineTo(-34, -62 - 16 * k); ctx.moveTo(-34, -62 - 16 * k); ctx.lineTo(-42, -64 - 20 * k); ctx.moveTo(-34, -62 - 16 * k); ctx.lineTo(-40, -56 - 12 * k); ctx.moveTo(12, -50); ctx.lineTo(30, -40); ctx.stroke(); ctx.restore();
      if (k < 0.6) circle(-36, -66 - 16 * k, 8, '#fff');
    } else {
      ctx.fillStyle = vgrad(-62, 0, '#ffffff', '#dcebfb', '#a8c4e4'); ctx.strokeStyle = '#6a8ab8'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-24, -4); for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; ctx.lineTo(Math.cos(a) * 26 * -1 * -1, -34 + Math.sin(a) * 34 + (i % 2 ? 0 : 4)); } ctx.lineTo(24, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9ccdf0'; ctx.beginPath(); ctx.ellipse(-8, -48, 14, 12, 0, 0, 7); ctx.fill(); ctx.stroke(); circle(-14, -52, 4, '#fff'); circle(-3, -53, 4, '#fff'); circle(-15, -52, 2, '#d8a010'); circle(-4, -53, 2, '#d8a010'); circle(-15.4, -52, 1, '#111'); circle(-4.4, -53, 1, '#111'); ctx.strokeStyle = '#1a2a44'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-20, -60); ctx.lineTo(-11, -55); ctx.moveTo(4, -61); ctx.lineTo(-3, -56); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-15, -42); ctx.lineTo(-12, -35); ctx.lineTo(-9, -42); ctx.moveTo(-8, -42); ctx.lineTo(-5, -35); ctx.lineTo(-2, -42); ctx.fill(); ctx.strokeStyle = '#2a3a58'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#f0f6ff'; ctx.strokeStyle = '#6a8ab8'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(-26, -30 - 14 * k, 8, 15, 0.4 + 0.5 * k, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(22, -26, 8, 14, -0.3, 0, 7); ctx.fill(); ctx.stroke(); if (k < 0.6) circle(-30, -48 - 12 * k, 9, '#fff'); ctx.fillStyle = '#9ab8d8'; for (const fx of [-10, 12]) { ctx.beginPath(); ctx.ellipse(fx, -3, 10, 5, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    }
  } else if (A === 3) { // mini volcano
    const g = ctx.createLinearGradient(0, -60, 0, 0); g.addColorStop(0, '#5a3a34'); g.addColorStop(1, '#1a0e0c'); ctx.fillStyle = g; ctx.strokeStyle = '#ff9a40'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-14, -58); ctx.lineTo(14, -58); ctx.lineTo(34, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = LOWFX ? 0 : (12); ctx.fillStyle = '#ff9a24'; ctx.beginPath(); ctx.ellipse(0, -58, 15, 5.4, 0, 0, 7); ctx.fill(); ctx.restore(); ctx.strokeStyle = `rgba(255,${130 + 60 * Math.sin(T * 5) | 0},40,.9)`; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-6, -54); ctx.lineTo(-10, -34); ctx.lineTo(-6, -14); ctx.moveTo(8, -54); ctx.lineTo(13, -38); ctx.stroke();
    circle(-8, -36, 5, '#fff'); circle(8, -36, 5, '#fff'); circle(-9, -35.5, 2.4, '#111'); circle(7, -35.5, 2.4, '#111'); ctx.strokeStyle = '#1a0a06'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-15, -44); ctx.lineTo(-4, -40); ctx.moveTo(15, -44); ctx.lineTo(4, -40); ctx.stroke(); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-8, -22); ctx.lineTo(-4, -26); ctx.lineTo(0, -22); ctx.lineTo(4, -26); ctx.lineTo(8, -22); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fl = 0.4 + k * 0.9 + 0.1 * Math.sin(T * 12); const gr = ctx.createRadialGradient(0, -64, 2, 0, -64, 36 * fl + 10); gr.addColorStop(0, 'rgba(255,240,170,.9)'); gr.addColorStop(1, 'rgba(255,110,20,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -64, 36 * fl + 10, 0, 7); ctx.fill(); ctx.restore();
  } else { // anemone (beach)
    ell(0, -6, 24, 10, 0, '#b86ad0'); ctx.strokeStyle = '#5a2a78'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, -6, 24, 10, 0, 0, 7); ctx.stroke();
    for (let i = 0; i < 13; i++) { const a = -0.15 - i / 12 * (Math.PI - 0.3), len = 24 + 10 * k, wv = Math.sin(T * 5 + i) * 4; ctx.strokeStyle = i % 2 ? '#ff7aa8' : '#ffa05a'; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, -10 + Math.sin(a) * 6); ctx.quadraticCurveTo(Math.cos(a) * len + wv, -14 + Math.sin(a) * len * 0.8, Math.cos(a) * (len + 12) + wv * 1.4, -12 + Math.sin(a) * (len + 6)); ctx.stroke(); circle(Math.cos(a) * (len + 12) + wv * 1.4, -12 + Math.sin(a) * (len + 6), 3, '#ffe0f0'); }
    ell(0, -24, 15, 13, 0, vgrad(-38, -10, '#ff9ac0', '#d85a90')); ctx.strokeStyle = '#7a1a4a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, -24, 15, 13, 0, 0, 7); ctx.stroke(); circle(-6, -28, 4.6, '#fff'); circle(5, -28, 4.6, '#fff'); circle(-7, -27.6, 2.3, '#111'); circle(4, -27.6, 2.3, '#111'); ctx.strokeStyle = '#4a0a2a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-12, -35); ctx.lineTo(-3, -31); ctx.moveTo(11, -35); ctx.lineTo(3, -31); ctx.stroke(); ell(-7, -18 + 1, 5 + 4 * k, 3 + 4 * k, 0, '#4a0a2a');
  }
  ctx.restore();
}
function drawLow(o, x) {
  const wi = G.wi, b = GROUND - 84, w = o.w, x0 = x - w / 2;
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x0, GROUND - 2, w, 6);
  if (wi === 0) { // thick branch hanging on vines
    ctx.strokeStyle = '#3f6b2a'; ctx.lineWidth = 5; for (const vx of [x0 + 20, x0 + w - 20]) { ctx.beginPath(); ctx.moveTo(vx, -10); ctx.quadraticCurveTo(vx + 8, b / 2, vx, b - 30); ctx.stroke(); }
    rr(x0 - 20, b - 46, w + 40, 40, 20); ctx.fillStyle = vgrad(b - 46, b - 6, '#8a6038', '#6b4a2b', '#3e2a17'); ctx.fill();
    ell(x0 - 6, b - 26, 10, 18, 0, '#b88a55'); ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x0 - 6, b - 26, 5, 10, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 9; i++) { const tx = x0 - 10 + i * (w + 20) / 8; ctx.fillStyle = '#2f5a1e'; ctx.beginPath(); ctx.moveTo(tx - 6, b - 8); ctx.lineTo(tx, b + 6); ctx.lineTo(tx + 6, b - 8); ctx.fill(); }
    for (let i = 0; i < 5; i++) leaf(x0 + i * w / 4, b - 44, 26, -1.2 - i * 0.3, 0.3, 7, '#4caf50', '#2f7a2c');
  } else if (wi === 1) { // rock overhang
    ctx.fillStyle = hgrad(x0, x0 + w, '#d27a45', '#a5532f', '#6e2f17'); ctx.beginPath(); ctx.moveTo(x0 + 20, -10); ctx.lineTo(x0 + w - 10, -10); ctx.lineTo(x0 + w + 10, b - 70); ctx.lineTo(x0 + w + 20, b - 10); ctx.lineTo(x0 + w - 20, b + 4); ctx.lineTo(x0 + 30, b); ctx.lineTo(x0 - 20, b - 20); ctx.lineTo(x0, b - 90); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,30,10,.3)'; ctx.lineWidth = 2; for (let y = 30; y < b; y += 24) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w + 10, y + 3); ctx.stroke(); }
  } else if (wi === 2 || wi === 4) { // frozen rock hanging from above, ice slab with icicles (also in the Christmas night)
    ctx.fillStyle = hgrad(x0 + 30, x0 + w - 30, '#4d6a8f', '#33496a', '#22324a'); ctx.beginPath(); ctx.moveTo(x0 + 34, -10); ctx.lineTo(x0 + w - 30, -10); ctx.lineTo(x0 + w - 44, b - 70); ctx.lineTo(x0 + 48, b - 60); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let y = 40; y < b - 80; y += 70) ell(x0 + w / 2 - 8, y, 18, 5, 0.2, 'rgba(255,255,255,.7)');
    rr(x0 - 12, b - 52, w + 24, 46, 14); ctx.fillStyle = vgrad(b - 52, b - 6, '#ffffff', '#bfe0fa', '#7fb0dd'); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 10, b - 40); ctx.lineTo(x0 + 40, b - 20); ctx.moveTo(x0 + w - 40, b - 44); ctx.lineTo(x0 + w - 20, b - 24); ctx.stroke();
    ctx.fillStyle = 'rgba(210,235,255,.95)'; for (let i = 0; i < 8; i++) { const ix = x0 - 4 + i * (w + 8) / 7, len = 10 + (i % 3) * 7; ctx.beginPath(); ctx.moveTo(ix - 6, b - 10); ctx.lineTo(ix + 6, b - 10); ctx.lineTo(ix, b - 10 + len); ctx.fill(); }
  } else { // a hanging cluster of basalt columns: lit left faces, hexagonal caps underneath that glow from the lava below
    const n = Math.max(4, Math.round((w + 32) / 24)), cw = (w + 32) / n;
    for (let i = 0; i < n; i++) {
      const cx = x0 - 16 + i * cw, edge = Math.min(i, n - 1 - i), bot = b - (edge === 0 ? 22 : edge === 1 ? 8 : 0) - hash(o.x * 0.01 + i) * 6;
      ctx.fillStyle = vgrad(-10, bot, '#120a08', '#2c1d19', '#3f2c27'); ctx.fillRect(cx, -10, cw + 0.5, bot + 10);
      ctx.fillStyle = 'rgba(255,200,170,.07)'; ctx.fillRect(cx, -10, cw * 0.32, bot + 10); // lit facet
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(cx + cw - 2, -10, 2, bot + 10); // joint
      ctx.fillStyle = vgrad(bot - 8, bot + 4, '#5a2a18', '#ff7a2a'); ctx.beginPath(); // hexagonal cap seen from below
      ctx.moveTo(cx, bot - 6); ctx.lineTo(cx + cw * 0.25, bot); ctx.lineTo(cx + cw * 0.75, bot); ctx.lineTo(cx + cw, bot - 6); ctx.lineTo(cx + cw * 0.75, bot - 10); ctx.lineTo(cx + cw * 0.25, bot - 10); ctx.closePath(); ctx.fill();
      if (hash(o.x + i * 7) < 0.45) { ctx.strokeStyle = `rgba(255,${110 + 60 * Math.sin(T * 3 + i) | 0},30,.7)`; ctx.lineWidth = 1.6; ctx.beginPath(); let yy = bot - 14; ctx.moveTo(cx + cw * 0.5, yy); for (let s = 0; s < 4; s++) { yy -= 14 + hash(i + s) * 12; ctx.lineTo(cx + cw * (0.3 + hash(i * 3 + s) * 0.4), yy); } ctx.stroke(); }
    }
    ctx.fillStyle = vgrad(b - 4, b + 40, 'rgba(255,110,30,.28)', 'rgba(255,110,30,0)'); ctx.fillRect(x0 - 20, b - 4, w + 40, 44); // glow spilling below
    for (let i = 0; i < 4; i++) { const u = (T * 0.9 + i / 4) % 1, dx = x0 + 20 + i * (w - 40) / 3; circle(dx, b + u * 60, 4 * (1 - u) + 1, `rgba(255,${140 + 80 * (1 - u) | 0},40,${1 - u})`); }
  }
  // warning sign on the ground
  const sx = x0 - 70; if (sx > -40) { ctx.fillStyle = '#5b4636'; ctx.fillRect(sx - 2, GROUND - 44, 4, 44); rr(sx - 16, GROUND - 74, 32, 32, 6); ctx.fillStyle = '#ffd34d'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3b2410'; ctx.stroke(); ctx.fillStyle = '#3b2410'; ctx.beginPath(); ctx.moveTo(sx - 8, GROUND - 62); ctx.lineTo(sx + 8, GROUND - 62); ctx.lineTo(sx, GROUND - 50); ctx.fill(); ctx.fillRect(sx - 2, GROUND - 70, 4, 9); }
}
function drawGate(L, cam, front) {
  const gx = L.gateX - cam; if (gx < -260 || gx > W + 260) return;
  const stone = ART(G.wi) === 3 ? '#3b2c28' : ART(G.wi) === 2 ? '#8fa3bb' : '#8a7a68', hw = 62, open = G.gateOpen, ent = G.entering ? clamp(G.entering, 0, 1) : 0;
  const frame = () => { // pillars + lintel with the world's egg on top
    for (const px of [gx - hw - 46, gx + hw]) { rr(px, GROUND - 232, 46, 232, 6); ctx.fillStyle = stone; ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 5; i++) ctx.fillRect(px, GROUND - 232 + i * 46, 46, 3); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2.5; rr(px, GROUND - 232, 46, 232, 6); ctx.stroke(); }
    rr(gx - hw - 60, GROUND - 274, hw * 2 + 120, 46, 8); ctx.fillStyle = stone; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2.5; ctx.stroke();
    drawEgg(gx, GROUND - 251, 16, WORLDS[G.wi].egg, WORLDS[G.wi].eggSpot);
    for (const [pk, px] of [[0, gx - hw - 46], [1, gx + hw]]) { // glowing runes on the pillars (they light one by one before the riddle), stone footings
      const lit = open > 0 || (G.gateStep || 0) > pk ? 1 : 0, pulse = lit ? 0.5 + 0.5 * Math.sin(T * 5 + pk * 2) : 0, cx = px + 23, cy = GROUND - 130, gl = 0.35 + 0.65 * lit;
      if (lit) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const hg = ctx.createRadialGradient(cx, cy, 4, cx, cy, 70); hg.addColorStop(0, `rgba(255,214,110,${0.45 + 0.25 * pulse})`); hg.addColorStop(1, 'rgba(255,190,80,0)'); ctx.fillStyle = hg; ctx.fillRect(cx - 70, cy - 70, 140, 140); ctx.restore(); }
      ctx.save(); ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = LOWFX ? 0 : (8 + 10 * gl * (0.6 + 0.4 * pulse)); ctx.strokeStyle = `rgba(255,${lit ? 240 : 226},${lit ? 190 : 150},${0.35 + 0.65 * gl})`; ctx.lineWidth = 2.4 + lit; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 7); ctx.moveTo(cx - 8, cy + 4); ctx.lineTo(cx, cy - 9); ctx.lineTo(cx + 8, cy + 4); ctx.moveTo(cx - 5, cy + 1); ctx.lineTo(cx + 5, cy + 1); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = `rgba(255,230,170,${0.3 + 0.45 * lit})`; ctx.lineWidth = 2; for (const yy of [GROUND - 196, GROUND - 64]) { ctx.beginPath(); ctx.moveTo(px + 8, yy); ctx.lineTo(px + 38, yy); ctx.moveTo(px + 14, yy + 6); ctx.lineTo(px + 32, yy + 6); ctx.stroke(); }
      rr(px - 6, GROUND - 14, 58, 14, 4); ctx.fillStyle = shade(stone, 0.85); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.stroke();
    }
    for (const bx of [gx - hw - 40, gx + hw + 40]) { // braziers on the lintel
      const by = GROUND - 276, fl = 0.8 + 0.2 * Math.sin(T * 14 + bx);
      ctx.fillStyle = '#4a3a30'; ctx.beginPath(); ctx.moveTo(bx - 14, by - 12); ctx.lineTo(bx + 14, by - 12); ctx.lineTo(bx + 9, by); ctx.lineTo(bx - 9, by); ctx.fill(); ctx.strokeStyle = '#1e1410'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(bx, by - 26, 2, bx, by - 26, 46); g.addColorStop(0, 'rgba(255,200,90,.6)'); g.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = g; ctx.fillRect(bx - 46, by - 72, 92, 92); ctx.restore();
      ctx.fillStyle = '#ff8a20'; ctx.beginPath(); ctx.moveTo(bx - 9, by - 12); ctx.quadraticCurveTo(bx - 12, by - 28 * fl, bx + Math.sin(T * 9 + bx) * 3, by - 40 * fl); ctx.quadraticCurveTo(bx + 12, by - 26 * fl, bx + 9, by - 12); ctx.fill(); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.moveTo(bx - 5, by - 12); ctx.quadraticCurveTo(bx - 6, by - 22 * fl, bx, by - 28 * fl); ctx.quadraticCurveTo(bx + 6, by - 20 * fl, bx + 5, by - 12); ctx.fill();
    }
    if (ART(G.wi) === 2) { ell(gx, GROUND - 274, hw + 60, 9, 0, '#fff'); for (let i = 0; i < 7; i++) circle(gx - 108 + i * 36, GROUND - 226, 4, ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff'][(i + Math.floor(T * 3)) % 4]); }
  };
  if (front) { frame(); return; }
  // light spilling out of the opened gate
  if (open > 0) { const g = ctx.createRadialGradient(gx, GROUND - 100, 10, gx, GROUND - 100, 260); g.addColorStop(0, `rgba(255,232,150,${0.55 * open * (0.6 + 0.4 * ent)})`); g.addColorStop(1, 'rgba(255,232,150,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 260, GROUND - 360, 520, 360); }
  // the doorway: a dim passage that turns bright as the gate opens
  ctx.fillStyle = vgrad(GROUND - 212, GROUND, '#1d1526', '#3a2a40', '#6b4a52'); ctx.fillRect(gx - hw, GROUND - 212, hw * 2, 212);
  if (open > 0) { const g = ctx.createRadialGradient(gx, GROUND - 90, 4, gx, GROUND - 90, 120); g.addColorStop(0, `rgba(255,244,190,${(0.55 + 0.45 * ent) * open})`); g.addColorStop(1, 'rgba(255,200,110,0)'); ctx.save(); ctx.beginPath(); ctx.rect(gx - hw, GROUND - 212, hw * 2, 212); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(gx - hw, GROUND - 212, hw * 2, 212); ctx.restore(); }
  if (open > 0) { // fan of light and sparkles rising from the opened gate
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.28 + Math.sin(T * 0.5 + i) * 0.04; ctx.fillStyle = `rgba(255,236,160,${0.09 * open})`; ctx.beginPath(); ctx.moveTo(gx, GROUND - 110); ctx.lineTo(gx + Math.cos(a - 0.06) * 440, GROUND - 110 + Math.sin(a - 0.06) * 440); ctx.lineTo(gx + Math.cos(a + 0.06) * 440, GROUND - 110 + Math.sin(a + 0.06) * 440); ctx.fill(); }
    for (let i = 0; i < 9; i++) { const u = (T * 0.4 + i / 9) % 1; ctx.globalAlpha = (1 - u) * open; drawStar(gx + Math.sin(i * 2.3) * hw * 0.8, GROUND - 20 - u * 220, 3 + (1 - u) * 3, '#fff6b0'); }
    ctx.restore();
  }
  const dy = open * 214;
  ctx.save(); ctx.beginPath(); ctx.rect(gx - hw, GROUND - 214, hw * 2, 214); ctx.clip();
  rr(gx - hw + 2, GROUND - 212 - dy, hw * 2 - 4, 212, 6); ctx.fillStyle = '#6b4a2b'; ctx.fill();
  ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 4; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(gx - hw + i * (hw * 2 / 5), GROUND - 212 - dy); ctx.lineTo(gx - hw + i * (hw * 2 / 5), GROUND - dy); ctx.stroke(); }
  if (!open && (G.gateStep || 0) >= 3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const qg = ctx.createRadialGradient(gx, GROUND - 110, 6, gx, GROUND - 110, 80); qg.addColorStop(0, `rgba(255,220,120,${0.5 + 0.2 * Math.sin(T * 6)})`); qg.addColorStop(1, 'rgba(255,200,90,0)'); ctx.fillStyle = qg; ctx.fillRect(gx - 80, GROUND - 190, 160, 160); ctx.restore(); }
  otxt('?', gx, GROUND - 110 - dy, 64, '#ffd34d', '#3b1d00', 8);
  ctx.restore();
  for (const [sw, sy] of [[hw * 2 + 44, 10], [hw * 2 + 16, 17]]) { rr(gx - sw / 2, GROUND - sy, sw, sy, 3); ctx.fillStyle = vgrad(GROUND - sy, GROUND, shade(stone, 1.15), shade(stone, 0.8)); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.stroke(); }
  frame();
}
function drawFamilyCliff(L, cam) {
  const x0 = L.bossX - 330 - cam; if (x0 > W + 50 || x0 + 560 < -50) return;
  // a craggy rock tower: jagged outline, lit facets, cracks glowing from the volcano, a snow cap and string lights
  const edge = [[0, GROUND], [18, 380], [34, 300], [30, 252], [50, 236], [120, 232], [210, 238], [300, 230], [400, 236], [470, 232], [506, 246], [530, 300], [540, 380], [560, GROUND]];
  ctx.beginPath(); edge.forEach(([px, py], n) => n ? ctx.lineTo(x0 + px, py) : ctx.moveTo(x0 + px, py)); ctx.closePath();
  ctx.fillStyle = hgrad(x0, x0 + 560, '#4a2a22', '#2a1612', '#140806'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#0c0504'; ctx.stroke();
  ctx.save(); ctx.clip(); for (let n = 0; n < 16; n++) { const fx = x0 + 30 + hash(n + 5) * 500, fy = 250 + hash(n + 9) * 180, fw = 40 + hash(n + 13) * 60; ctx.fillStyle = n % 2 ? 'rgba(255,170,120,.07)' : 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + fw, fy + 14); ctx.lineTo(fx + fw * 0.6, fy + 60); ctx.lineTo(fx - 10, fy + 40); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = `rgba(255,100,30,${0.35 + 0.15 * Math.sin(T * 2)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 120, 270); ctx.lineTo(x0 + 140, 330); ctx.lineTo(x0 + 128, 420); ctx.moveTo(x0 + 400, 270); ctx.lineTo(x0 + 380, 350); ctx.lineTo(x0 + 392, 430); ctx.stroke(); ctx.restore();
  // snow cap with soft drips
  ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.moveTo(x0 + 28, 252); for (let px = 28; px <= 512; px += 28) ctx.quadraticCurveTo(x0 + px - 14, 224 - 4 * hash(px), x0 + px, 236 + 8 * hash(px + 1)); ctx.lineTo(x0 + 512, 244); for (let px = 512; px >= 40; px -= 34) ctx.lineTo(x0 + px, 244 + 10 * hash(px + 3)); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(120,150,200,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  // string lights along the ledge
  for (let n = 0; n < 12; n++) { const lx = x0 + 60 + n * 40, ly = 250 + Math.sin(n * 1.3) * 4, c = ['#ff5252', '#ffd34d', '#69f0ae', '#40c4ff'][n % 4], tw = 0.6 + 0.4 * Math.sin(T * 3 + n * 1.7); ctx.globalAlpha = 0.3 * tw; circle(lx, ly + 4, 9, c); ctx.globalAlpha = 1; circle(lx, ly + 3, 3.2, c); }
  ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let n = 0; n <= 12; n++) { const lx = x0 + 60 + n * 40, ly = 247 + Math.sin(n * 1.3) * 4; n ? ctx.lineTo(lx, ly) : ctx.moveTo(lx, ly); } ctx.stroke();
  const cheer = G.boss && G.boss.state !== 'enter';
  const hop = i => cheer ? Math.abs(Math.sin(T * 7 + i)) * 10 : 0;
  oLong(x0 + 200, 232 - hop(0), 0.62, '#b07cc6', T * 3, false);
  oLong(x0 + 340, 232 - hop(1), 0.68, '#4f8fd6', T * 3 + 1, false);
  const lbl = (s, x) => { setFont(14); const w = ctx.measureText(s).width + 14; rr(x - w / 2, 242, w, 20, 10); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); txt(s, x, 252, 14, '#3b2410'); };
  lbl('Mamasaurus', x0 + 180); lbl('Papasaurus', x0 + 320);
  if (cheer && !toasts.length && !G.banner) {
    const lines = [[fmt('Los, {oli}!'), x0 + 200, 92], [fmt('Du schaffst das, {rex}!'), x0 + 390, 88], [fmt('Brüll, {fabio}, brüll!'), x0 + 470, 94]];
    lines.forEach(([s, x, y], i) => { if (Math.floor(T / 3) % 3 === i && (T / 3) % 1 < 0.8) { setFont(18); const w = ctx.measureText(s).width + 20; rr(x - w / 2, y - 16, w, 32, 14); ctx.fillStyle = '#fff'; ctx.fill(); txt(s, x, y, 18, '#3b2410'); } });
  }
}
function drawAurora() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  [['60,255,170', 70, 0], ['150,90,255', 120, 2], ['60,200,255', 95, 4]].forEach(([c, y, ph]) => {
    const g = ctx.createLinearGradient(0, y - 40, 0, y + 80); g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(0.4, `rgba(${c},${0.22 + 0.08 * Math.sin(T * 0.8 + ph)})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, y - 40);
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, y + Math.sin(x * 0.012 + T * 0.5 + ph) * 26 - 20);
    ctx.lineTo(W, y + 90); ctx.lineTo(0, y + 90); ctx.closePath(); ctx.fill();
  });
  ctx.restore(); ctx.fillStyle = 'rgba(8,16,60,.28)'; ctx.fillRect(0, 0, W, GROUND);
}
function drawCheckpoint(c, x) { // stone post with a flag: grey and limp, then golden with the egg star and sparkles once reached
  const on = c.on; shadow(x, GROUND + 2, 24, 0.3);
  ell(x, GROUND - 2, 20, 7, 0, '#6e6254'); rr(x - 11, GROUND - 16, 22, 16, 4); ctx.fillStyle = vgrad(GROUND - 16, GROUND, '#a09080', '#7a6c5c'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke();
  ctx.fillStyle = vgrad(GROUND - 126, GROUND - 14, '#8a6038', '#5b3d22'); ctx.fillRect(x - 3.5, GROUND - 126, 7, 112); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - 3.5, GROUND - 126, 2, 112);
  if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x + 24, GROUND - 104, 4, x + 24, GROUND - 104, 70); g.addColorStop(0, `rgba(255,220,120,${0.5 + 0.15 * Math.sin(T * 5)})`); g.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = g; ctx.fillRect(x - 50, GROUND - 180, 150, 150); ctx.restore(); }
  circle(x, GROUND - 129, 6.5, on ? '#ffd34d' : '#9a9a9a'); circle(x - 2, GROUND - 131, 2, 'rgba(255,255,255,.7)');
  const fy = on ? GROUND - 120 : GROUND - 54, amp = on ? 1 : 0.35, top = [], bot = [];
  for (let u = 0; u <= 1.001; u += 0.1) { const wv = Math.sin(T * 6 - u * 5) * u * 6 * amp; top.push([x + 4 + u * 54, fy + wv]); bot.push([x + 4 + u * 54 - (u > 0.85 ? (u - 0.85) * 60 : 0), fy + 30 + wv * 1.1 + (on ? 0 : u * 6)]); }
  ctx.beginPath(); top.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.lineTo(x + 4 + 40, fy + 15 + Math.sin(T * 6 - 4) * 4 * amp); for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath();
  ctx.fillStyle = on ? vgrad(fy, fy + 30, '#ffe27a', '#ff9a3c') : vgrad(fy, fy + 30, '#b4b4be', '#80808c'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = on ? '#8a4a10' : '#55555f'; ctx.stroke();
  if (on) { drawStar(x + 24, fy + 15 + Math.sin(T * 6 - 1.2) * 1.5, 7, '#fff7c8'); for (let i = 0; i < 4; i++) { const u = (T * 0.7 + i / 4) % 1; ctx.globalAlpha = 1 - u; drawStar(x + 30 + Math.sin(i * 3 + T) * 18, fy + 10 - u * 50, 3 + (1 - u) * 2.5, '#fff3a0'); } ctx.globalAlpha = 1; }
  else { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 14, fy + 6); ctx.lineTo(x + 24, fy + 20); ctx.moveTo(x + 36, fy + 4); ctx.lineTo(x + 30, fy + 14); ctx.stroke(); }
}
function todU() { // 0..1 how far the light has turned toward sunset: late in a level, or slowly in endless runs
  if (G.L.endless) return 0.5 - 0.5 * Math.cos(T * 0.035);
  const p = clamp(G.p.wx / Math.max(1, G.L.gateX), 0, 1), u = clamp((p - 0.4) / 0.6, 0, 1); return u * u * (3 - 2 * u);
}
let TOD = 0;
function drawPlay() {
  const L = G.L, p = G.p, th = WORLDS[G.wi], cam = G.cam;
  perfWatch(); chiliFx.dive = ART(G.wi) === 6;
  TOD = [0, 1, 5, 7].includes(ART(G.wi)) ? todU() : 0;
  ctx.save();
  if (G.zoom > 0 && !save.calm) { const z = 1 + 0.05 * G.zoom * G.zoom; ctx.translate(W * 0.62, H * 0.62); ctx.scale(z, z); ctx.translate(-W * 0.62, -H * 0.62); }
  if (G.shake > 0 && !G.overlay && !save.calm) ctx.translate((Math.random() - 0.5) * 16 * G.shake, (Math.random() - 0.5) * 16 * G.shake);
  drawBackground(ART(G.wi), cam);
  desatBackdrop(G.wi); arenaBack(G.arena || 0);
  if (G.wi === 4) { drawAurora(); }
  if (L.bossKind === 'king') drawFamilyCliff(L, cam);
  drawGround(ART(G.wi), L, cam); arenaFloor(G.arena || 0, cam);
  for (const pl of L.plats) drawPlatform(pl, cam, ART(G.wi));
  for (const c of L.cps) { const x = c.x - cam; if (x < -50 || x > W + 80) continue; drawCheckpoint(c, x); }
  for (const s of L.spots) { const x = s.x - cam; if (x < -50 || x > W + 50) continue; if (s.state === 'done') ell(x, GROUND + 2, 26, 7, 0, '#1a0f08'); else { ell(x, GROUND, 30, 14, 0, '#7a5230'); for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 6 + i * 2); circle(x - 14 + i * 14, GROUND - 22 - i * 5, 3, '#fff6b0'); } ctx.globalAlpha = 1; } }
  drawGate(L, cam);
  for (const a of L.amb) if (!a.got) { const x = a.x - cam; if (x > -20 && x < W + 20) { const y = a.y + Math.sin(T * 4 + a.x) * 3; glow(x, y, 26, '255,190,70', 0.4 + 0.15 * Math.sin(T * 5 + a.x)); drawAmber(x, y, 10); } }
  for (const e of L.eggs) if (!e.hidden && !e.got) { const x = e.x - cam; if (x > -60 && x < W + 60) { const ey = e.y + Math.sin(T * 3 + e.k) * 5; glow(x, ey, 56, '255,240,170', 0.45 + 0.15 * Math.sin(T * 4)); drawEgg(x, ey, 24, th.egg, th.eggSpot, 0.8 + 0.2 * Math.sin(T * 5), Math.sin(T * 2) * 0.1); } }
  for (const o of L.obs) if (!o.dead && o.type !== 'low') drawObstacle(o, cam, th);
  drawSecret(L, cam);
  for (const h of L.hearts) if (!h.got) { const x = h.x - cam; if (x > -60 && x < W + 60) { const y = h.y + Math.sin(T * 3 + h.x) * 6, pu = 1 + 0.08 * Math.sin(T * 6); const g = ctx.createRadialGradient(x, y, 4, x, y, 52); g.addColorStop(0, 'rgba(255,120,150,.6)'); g.addColorStop(1, 'rgba(255,120,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 52, 0, Math.PI * 2); ctx.fill(); drawHeart(x, y, 1.9 * pu, true); for (let k = 0; k < 3; k++) { const a = T * 2 + k * 2.1; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 6 + k); drawStar(x + Math.cos(a) * 30, y + Math.sin(a) * 22, 4, '#fff6b0'); } ctx.globalAlpha = 1; } }
  for (const pp of L.peppers) if (!pp.got) { const x = pp.x - cam; if (x > -40 && x < W + 40) { const y = pp.y + Math.sin(T * 4 + pp.x) * 5; const g = ctx.createRadialGradient(x, y, 4, x, y, 44); g.addColorStop(0, 'rgba(255,150,40,.65)'); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI * 2); ctx.fill(); drawPepper(x, y, 1.1, 0.4 + Math.sin(T * 3) * 0.2); } }
  if (L.treasure && L.treasure.shown && !L.treasure.got) { const tr = L.treasure, x = tr.x - cam, y = tr.y + Math.sin(T * 3) * 6; if (x > -80 && x < W + 80) { const g = ctx.createRadialGradient(x, y, 5, x, y, 70); g.addColorStop(0, 'rgba(255,240,150,.7)'); g.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = save.treasures[tr.k] ? 0.6 : 1; drawTreasure(tr.k, x, y, 0.9); ctx.globalAlpha = 1; for (let i = 0; i < 4; i++) { const a = T * 2 + i * 1.57; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 6 + i); circle(x + Math.cos(a) * 44, y + Math.sin(a) * 30, 3, '#fff6b0'); } ctx.globalAlpha = 1; } }
  if (G.golden && !G.gotGolden) drawEgg(G.golden.x - cam, G.golden.y + (G.golden.landed ? Math.sin(T * 3) * 5 : 0), 32, '#ffd700', '#e0a800', 1.2, Math.sin(T * 2) * 0.1);
  if (G.boss && G.boss.x - cam < W + 260) {
    const b = G.boss, K = bossKind(b), bx = b.x - cam, hover = b.kind === 'queen' ? (b.state === 'tired' || b.state === 'stagger' ? 0 : b.state === 'leap' ? -150 * (1 - clamp(b.t / 0.7, 0, 1)) : -150 + Math.sin(T * 2) * 12) : 0, by = GROUND + b.y + hover, st = b.state, rage = b.kind === 'king' && b.phase === 3 && st !== 'flee';
    // hazards on the ground: shock waves and lava eruptions that warn first
    for (const h of b.hazards) {
      const hx = (h.x || 0) - cam;
      if (h.kind === 'lane') { const warn = h.t < h.warn; ctx.save(); if (warn) { ctx.globalAlpha = 0.25 + 0.2 * Math.sin(T * 16); ctx.fillStyle = '#ff2a2a'; ctx.fillRect(0, h.y - 44, W, 88); ctx.globalAlpha = 1; if (Math.sin(T * 14) > -0.3) otxt('!', W - 50, h.y, 46, '#ffd34d', '#7a0000', 7); } else if (h.t < h.warn + 0.5) { ctx.strokeStyle = '#9a4ad0'; ctx.lineWidth = 62; ctx.lineCap = 'round'; ctx.beginPath(); for (let x2 = W; x2 >= -10; x2 -= 14) ctx.lineTo(x2, h.y + Math.sin(x2 * 0.03 + T * 25) * 10); ctx.stroke(); ctx.strokeStyle = '#d6a0f0'; ctx.lineWidth = 34; ctx.stroke(); } ctx.restore(); continue; }
      if (h.kind === 'wave') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(hx, GROUND - 14, 4, hx, GROUND - 14, 46); g.addColorStop(0, 'rgba(255,240,170,.95)'); g.addColorStop(0.5, 'rgba(255,120,30,.6)'); g.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(hx, GROUND - 14, 46, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); ctx.strokeStyle = '#ff7a20'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(hx + 10, GROUND, 30, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
      else if (h.kind === 'erupt') {
        if (h.t < h.warn) { const u = h.t / h.warn, a = 0.45 + 0.35 * Math.sin(T * 18); ctx.globalAlpha = a; ell(hx, GROUND + 2, 40 + 20 * (1 - u), 9, 0, 'rgba(255,70,20,.8)'); ctx.strokeStyle = '#ffcf3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(hx, GROUND + 2, 70 * (1 - u) + 20, 14 * (1 - u) + 4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; if (h.t > h.warn - 0.55) { const sc = 1 + 0.1 * Math.sin(T * 20); ctx.save(); ctx.translate(hx, GROUND - 130); ctx.scale(sc, sc); otxt('SPRING!', 0, 0, 52, '#fff', '#c01800', 10); ctx.restore(); ctx.fillStyle = 'rgba(255,230,90,.9)'; ctx.beginPath(); ctx.moveTo(hx, GROUND - 64); ctx.lineTo(hx - 16, GROUND - 90); ctx.lineTo(hx + 16, GROUND - 90); ctx.fill(); } else if (Math.sin(T * 14) > -0.3) otxt('!', hx, GROUND - 40, 40, '#ffd34d', '#7a0000', 6); }
        else if (h.t < h.warn + 0.3) { const q = h.t - h.warn, hh = 280 * Math.min(1, q * 10) * Math.min(1, (0.3 - q) * 10); const lg = ctx.createLinearGradient(0, GROUND - hh, 0, GROUND); lg.addColorStop(0, '#fff3a0'); lg.addColorStop(1, '#ff5a00'); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(hx - 28, GROUND); for (let y = 0; y <= hh; y += 18) ctx.lineTo(hx - 24 + Math.sin(y * 0.1 + T * 30) * 6, GROUND - y); for (let y = hh; y >= 0; y -= 18) ctx.lineTo(hx + 24 + Math.sin(y * 0.1 + T * 30 + 1) * 6, GROUND - y); ctx.lineTo(hx + 28, GROUND); ctx.closePath(); ctx.fill(); }
      }
    }
    if (st === 'crouch' || st === 'leap') { const lx = b.landX - cam; ctx.globalAlpha = 0.45 + 0.3 * Math.sin(T * 16); ell(lx, GROUND + 2, 100, 16, 0, 'rgba(255,50,20,.7)'); ctx.globalAlpha = 1; otxt('!', lx, GROUND - 36, 44, '#ff5252', '#000', 7); }
    if (rage) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(bx, by - 120, 20, bx, by - 120, 260); g.addColorStop(0, `rgba(255,110,30,${0.35 + 0.15 * Math.sin(T * 9)})`); g.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = g; ctx.fillRect(bx - 270, by - 380, 540, 440); ctx.restore(); if (Math.random() < 0.35) burst(b.x - 60 + Math.random() * 140, GROUND - Math.random() * 200, 1, ['#ff9a3c', '#ffd34d', '#555'], 80, -160, 6, 0.9); }
    { const kg = { king: ['255,120,50', 0.34, 300], kraken: ['150,200,255', 0.2, 260], queen: ['255,210,160', 0.16, 280], crab: ['255,170,110', 0.14, 240] }[b.kind]; if (kg && st !== 'flee') glow(bx, by - 120, kg[2], kg[0], kg[1] * (0.85 + 0.15 * Math.sin(T * 2.4))); } // a backlight so even the dark bosses stand out from the arena
    ctx.save(); if (b.flash > 0 && Math.sin(T * 40) > 0) ctx.globalAlpha = 0.4;
    shadow(bx, GROUND + 2, 80 * (1 - clamp(-b.y / 300, 0, 0.6)), 0.3);
    ctx.translate(bx + ({ crab: -40, queen: -110, kraken: -20, king: -40 }[b.kind] || 0), by); let rot = 0, sy = 1, sx = 0;
    const ant = b.tele ? clamp(1 - b.tele.t / b.tele.max, 0, 1) : 0, br = Math.sin(T * 2.4); let bsx = 1;
    if (st !== 'flee' && st !== 'crouch') { sy = 1 + 0.014 * br - 0.1 * ant; bsx = 1 - 0.01 * br + 0.05 * ant; rot = -0.05 * ant; } // idle breathing, and a crouch-and-lean-back before every attack
    if (st === 'crouch') sy = 0.84 + 0.02 * Math.sin(T * 30); if (st === 'tired') rot = -0.13; if (st === 'stagger' || st === 'duel') sx = Math.sin(T * 60) * (st === 'duel' ? 4 : 2.5);
    if (st === 'leap') rot = -0.25 * Math.sin(clamp(b.t / 0.7, 0, 1) * Math.PI);
    ctx.translate(sx, 0); if (st === 'flee') { ctx.translate(0, -110); ctx.rotate(b.kind === 'king' ? Math.sin(b.t * 14) * 0.35 : b.t * 7); ctx.translate(0, 110); } // the king's outline cache is axis-aligned, so he wobbles instead of tumbling
    if (st !== 'flee') { ctx.rotate(b.kind === 'king' ? 0 : rot); ctx.scale(bsx, sy); }
    const BC = [['#8b1a1a', '#4a0a0a'], ['#7a3a1a', '#3d1a08'], ['#5a2a7a', '#2a0f40'], ['#b01c10', '#5a0a04']][b.phase] || ['#8b1a1a', '#4a0a0a'];
    const anim = st === 'taunt' || st === 'tired' ? (b.kind === 'king' ? 0 : b.ph * 0.5) : b.ph, face = st !== 'flee';
    const dmg = bossDmg(b), ko = st === 'flee'; if (b.kind === 'crab') drawCrabKing(0, 0, 1.5, anim, face, { dmg, ko }); else if (b.kind === 'kraken') drawKraken(0, 0, 1.45, anim, face, { dmg, ko }); else if (b.kind === 'queen') drawQueen(0, 0, 1.7, anim, face, { dmg, ko }); else oRaptor(0, 0, 2.05, anim, face, { col: BC[0], dark: BC[1], crown: true, dmg, ko });
    ctx.restore();
    if (b.tele) { const u = 1 - b.tele.t / b.tele.max, fl = save.calm || Math.sin(T * 40) > -0.2 ? 1 : 0.5; glow(bx - 60, GROUND - 130 + b.y, 240, '255,70,40', 0.55 * fl * (0.4 + 0.6 * u)); ctx.globalAlpha = fl; otxt('!', bx - 70, GROUND - 250 + b.y, 54 + 10 * u, '#ff5252', '#000', 8); ctx.globalAlpha = 1; }
    if (b.volley && b.volley.warned && b.state === 'volley') { const wy = b.volley.warnY, mx = clamp(bx - 170, 560, W - 130); ctx.globalAlpha = 0.65 + 0.35 * Math.sin(T * 30); circle(mx, wy, 20, '#e53935'); ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(mx - 34, wy); ctx.lineTo(mx - 20, wy - 11); ctx.lineTo(mx - 20, wy + 11); ctx.fill(); ctx.globalAlpha = 1; otxt('!', mx, wy + 1, 26, '#fff', '#7a0000', 4); } // where the next shot will fly
    if (st === 'tired' || st === 'stagger') for (let i = 0; i < 3; i++) { const a = T * 4 + i * 2.1; drawStar(bx - 70 + Math.cos(a) * 52, by - 250 + Math.sin(a) * 14, 9, '#ffd740'); }
    for (const r of b.rocks) { const rx2 = r.x - cam, ry2 = r.y; shadow(rx2, GROUND + 2, 24, 0.3); ctx.save(); ctx.translate(rx2, ry2); ctx.rotate(r.rot); ell(0, 0, 24, 21, 0, b.kind === 'kraken' ? '#2a1a50' : b.kind === 'queen' ? '#e8eefc' : b.kind === 'crab' ? '#7a4a22' : WORLDS[G.wi].rock); ell(-6, -6, 10, 7, 0, 'rgba(255,255,255,.18)'); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 24, 21, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    if (st === 'charge') { const lx = G.p.wx + 390 - cam, near = b.x - G.p.wx < 390; ctx.save(); ctx.setLineDash([10, 8]); ctx.lineWidth = 4; ctx.strokeStyle = near ? `rgba(255,82,82,${0.6 + 0.4 * Math.sin(T * 24)})` : 'rgba(255,211,77,.7)'; ctx.beginPath(); ctx.moveTo(lx, GROUND - 230); ctx.lineTo(lx, GROUND); ctx.stroke(); ctx.restore(); }
  }
  // chili
  if (G.entering) { const u = clamp(G.entering, 0, 1), gx = L.gateX - cam, k = 1 - 0.62 * u; ctx.save(); ctx.translate(gx, GROUND); ctx.scale(k, k); ctx.translate(-gx, -GROUND); ctx.globalAlpha = 1 - 0.7 * u * u; }
  const c = G.chili; shadow(c.wx - cam + 6, GROUND, 22 * clamp(1 - (GROUND - c.y) / 200, 0.4, 1), 0.25); chiliFx.vy = c.vy || 0; chiliFx.dig = !!c.dig; chiliFx.scared = G.p.hitT > 0 && !G.overlay ? G.p.hitT / 0.45 : 0; chiliFx.joy = c.joy > 0 ? c.joy / 0.9 : 0; squashed(c.wx - cam, c.y, (c.land || 0) / 0.14, 0, () => oChili(c.wx - cam, c.y, 1.25, c.ph, c.dig ? false : (G.bossStarted && !G.golden)));
  if (G.chiliSay && !G.overlay) { // speech bubble: wrapped, pinned to the left edge above the followers so it never covers Rex or the riders
    const cs = G.chiliSay, al = clamp(cs.t * 3, 0, 1) * clamp((2.6 - cs.t) * 6, 0, 1), lines = wrapLines(cs.text, 200, 19), lw = Math.max(...lines.map(l => ctx.measureText(l).width)), bw = lw + 28, bh = 14 + lines.length * 24;
    const bx0 = 14, bot = Math.max(c.y - (G.atGate ? 200 : 110), bh + 90), tx = clamp(c.wx - cam + 14, bx0 + 26, bx0 + bw - 26);
    ctx.save(); ctx.globalAlpha = al; rr(bx0, bot - bh, bw, bh, 17); ctx.fillStyle = '#fffdf6'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
    ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.moveTo(tx - 9, bot - 1); ctx.lineTo(tx + 3, bot + 17); ctx.lineTo(tx + 12, bot - 1); ctx.closePath(); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.beginPath(); ctx.moveTo(tx - 9, bot); ctx.lineTo(tx + 3, bot + 17); ctx.lineTo(tx + 12, bot); ctx.stroke(); ctx.fillStyle = '#fffdf6'; ctx.fillRect(tx - 8, bot - 3, 19, 4);
    lines.forEach((l, k) => txt(l, bx0 + bw / 2, bot - bh + 7 + 12 + k * 24, 19, '#3b2410')); ctx.restore(); }
  if (c.dig) otxt('!', c.wx - cam + 20, c.y - 70 - Math.abs(Math.sin(T * 10)) * 6, 36, '#ffd34d', '#3b1d00', 6);
  // baby + kiwi followers
  for (const [k, on, r] of [['kiwi', save.treasures[3], 16], ['baby', save.babyName, 18]]) if (on) { // they hop where Rex hopped (see updateFollowers)
    const f = G.fol[k], fx = p.wx - FOL[k], vis = 1 - (G.arena || 0); // in a boss arena Rex slides left and these two would be cut off at the screen edge, so they step out of the picture
    if (vis < 0.04) continue;
    ctx.globalAlpha = vis;
    if (supported(L, fx)) shadow(fx - cam + 4, GROUND, r * clamp(1 - (GROUND - f.y) / 200, 0.4, 1), 0.25);
    squashed(fx - cam, f.y, f.land / 0.14, f.tilt, () => { if (k === 'kiwi') oKiwi(fx - cam, f.y, 1.0, f.ph * 1.3); else oBaby(fx - cam, f.y, 0.8, f.ph); });
    ctx.globalAlpha = 1;
  }
  // player
  { let sy = GROUND; for (const pl of L.plats) if (p.wx + 20 > pl.x && p.wx - 20 < pl.x + pl.w && pl.y >= p.y - 2) sy = Math.min(sy, pl.y); if (sy < GROUND || supported(L, p.wx)) shadow(p.wx - cam + 4, sy + 2, 52 * clamp(1 - (sy - p.y) / 260, 0.35, 1), 0.3); }
  if (p.fireT > 0) { const g = ctx.createRadialGradient(p.wx - cam + 10, p.y - 60, 10, p.wx - cam + 10, p.y - 60, 120); g.addColorStop(0, `rgba(${fireOf(save.equip.fire || 0).glow},${0.3 + 0.12 * Math.sin(T * 10)})`); g.addColorStop(1, `rgba(${fireOf(save.equip.fire || 0).b},0)`); ctx.fillStyle = g; ctx.fillRect(p.wx - cam - 110, p.y - 180, 240, 240); }
  const spinA = p.stomp && p.spin < 1 ? (3 * p.spin * p.spin - 2 * p.spin * p.spin * p.spin) * Math.PI * 2 : 0, scx = p.wx - cam + 4, scy = p.y - 66;
  if (spinA) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(scx, scy, 104, spinA - Math.PI / 2 - 1.3, spinA - Math.PI / 2); ctx.stroke(); ctx.save(); ctx.translate(scx, scy); ctx.rotate(spinA); ctx.translate(-scx, -scy); }
  const dU = p.dashT > 0 ? 1 - p.dashT / 0.4 : 0, dOff = 0;
  if (p.dashT > 0) {
    const cxp = p.wx - cam + 4 + dOff, cyp = p.y - 55, fade = Math.sin(dU * Math.PI);
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const ly = 40 + hash(i * 13.7) * (H - 120), len = 110 + hash(i * 3.1) * 200, lx = (((hash(i * 7.7) * (W + 400) - T * 2800 * (0.7 + hash(i) * 0.6)) % (W + 400)) + W + 400) % (W + 400) - 200; ctx.strokeStyle = `rgba(255,255,255,${0.32 * fade})`; ctx.lineWidth = 2 + hash(i * 5) * 3; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + len, ly); ctx.stroke(); }
    const gc = ctx.createLinearGradient(cxp - 260, 0, cxp - 20, 0); gc.addColorStop(0, 'rgba(255,210,90,0)'); gc.addColorStop(1, `rgba(255,170,40,${0.6 * fade})`); ctx.fillStyle = gc; ctx.beginPath(); ctx.moveTo(cxp - 10, cyp - 78); ctx.quadraticCurveTo(cxp - 150, cyp - 40, cxp - 260, cyp + 4); ctx.quadraticCurveTo(cxp - 150, cyp + 30, cxp - 10, cyp + 56); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * fade})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cxp + 60, cyp, 30 + dU * 90, -1.1, 1.1); ctx.stroke();
    ctx.restore();
    if (p.onGround && Math.random() < 0.9) burst(p.wx - 30, GROUND, 1, ['#d8c3a5', '#fff', '#ffe08a'], 160, 200, 6, 0.4);
  }
  if (p.dashT > 0) for (let gi = 1; gi <= 3; gi++) { ctx.globalAlpha = 0.3 / gi; oRex(p.wx - cam + dOff - gi * 44, p.y, 0.92, p.ph, 0.05, Object.assign(rexLook(G.wi), { rider: true, air: !p.onGround })); ctx.globalAlpha = 1; }
  if (L.swim || p.gliding) { ctx.save(); const rcx = p.wx - cam + 4, rcy = p.y - 60; ctx.translate(rcx, rcy); ctx.rotate(L.swim ? clamp(p.vy / 900, -0.4, 0.4) : 0.05); ctx.translate(-rcx, -rcy); G._tilt = true; }
  if (p.gliding) { const gx2 = p.wx - cam + 4, gy2 = p.y - 205; ctx.fillStyle = vgrad(gy2 - 28, gy2 + 6, '#ff6a5a', '#c0302a'); ctx.beginPath(); ctx.moveTo(gx2 - 70, gy2 + 8); ctx.quadraticCurveTo(gx2, gy2 - 52, gx2 + 70, gy2 + 8); ctx.quadraticCurveTo(gx2, gy2 - 6, gx2 - 70, gy2 + 8); ctx.fill(); ctx.strokeStyle = '#4a0a08'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#fff'; for (const dx of [-42, -14, 14, 42]) { ctx.beginPath(); ctx.moveTo(gx2 + dx, gy2 + 1); ctx.quadraticCurveTo(gx2 + dx * 0.6, gy2 - 36, gx2 + dx * 0.4, gy2 - 40); ctx.quadraticCurveTo(gx2 + dx * 0.5, gy2 - 20, gx2 + dx + 12, gy2 + 3); ctx.fill(); } ctx.strokeStyle = 'rgba(40,20,10,.7)'; ctx.lineWidth = 2; for (const dx of [-60, -20, 20, 60]) { ctx.beginPath(); ctx.moveTo(gx2 + dx, gy2 + 6); ctx.lineTo(gx2 + 4 + dx * 0.05, p.y - 150); ctx.stroke(); } }
  if (p.dashT > 0) { ctx.save(); const px = p.wx - cam + 4; ctx.translate(px + dOff, p.y); ctx.rotate(0.1); ctx.scale(1.12, 0.92); ctx.translate(-px, -p.y); }
  glow(p.wx - cam + 10, p.y - 70, 170, REX_LIGHT[G.wi] || REX_LIGHT[0], 0.2);
  if (!(p.inv > 0 && Math.sin(T * 30) > 0.3)) oRex(p.wx - cam,  p.y, 0.92, p.ph, p.roarT > 0 || p.breathT > 0 ? 1 : 0.05, Object.assign(rexLook(G.wi), { rider: true, vy: p.vy, sq: p.anti > 0 ? p.anti / 0.09 * 0.13 : !p.onGround ? -clamp(Math.abs(p.vy) / 1400, 0, 1) * 0.1 : (p.land > 0 ? p.land / 0.16 * 0.14 : 0), hurt: p.hitT > 0 && !G.overlay ? p.hitT / 0.45 : 0, air: !p.onGround, duck: p.duck, stomp: p.stomp && p.spin >= 1, fire: p.fireT > 0, joy: G.chili.joy > 0 }));
  if (p.dashT > 0) ctx.restore();
  if (G.shield && !G.overlay) { const sx = p.wx - cam + 4, sy = p.y - 84, pu = 1 + 0.03 * Math.sin(T * 5); ctx.save(); ctx.translate(sx, sy); ctx.scale(pu, pu); const sg = ctx.createRadialGradient(0, 0, 36, 0, 0, 116); sg.addColorStop(0, 'rgba(150,220,255,.04)'); sg.addColorStop(1, 'rgba(150,220,255,.34)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(0, 0, 124, 102, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(210,240,255,.85)'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-64, -52, 18, 8, -0.7, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  if (spinA) ctx.restore();
  if (G._tilt) { ctx.restore(); G._tilt = false; }
  if (G.entering) ctx.restore(); // the heroes stay in front of the pillars as they walk into the light (Chili used to vanish behind the left pillar)
  for (const o of L.obs) if (!o.dead && o.type === 'low') drawObstacle(o, cam, th);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (p.breathT > 0) { // flame jet from the mouth
    const [mx0, my0] = rexMouth(p.duck), mx = p.wx - cam + mx0 * 0.92, my = p.y + my0 * 0.92, u = clamp(p.breathT / 0.3, 0, 1), len = 150 * (1.15 - u * 0.4);
    const g = ctx.createRadialGradient(mx, my, 2, mx, my, len); g.addColorStop(0, 'rgba(255,250,210,.95)'); g.addColorStop(0.25, `rgba(${fireOf(save.equip.fire || 0).a},.85)`); g.addColorStop(0.7, `rgba(${fireOf(save.equip.fire || 0).b},.45)`); g.addColorStop(1, `rgba(${fireOf(save.equip.fire || 0).c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(mx, my);
    for (let i = 0; i <= 10; i++) { const a = -0.28 + i * 0.056, r = len * (0.85 + 0.15 * Math.sin(T * 50 + i * 1.7)); ctx.lineTo(mx + Math.cos(a) * r, my + 10 + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    const g2 = ctx.createRadialGradient(mx, my, 1, mx, my, 50); g2.addColorStop(0, 'rgba(255,255,255,.9)'); g2.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(mx, my, 50, 0, Math.PI * 2); ctx.fill();
  }
  for (const f of G.flames) {
    const u = f.life / f.max, x = f.x - cam, r = f.r * (1.4 - u * 0.6);
    ctx.globalAlpha = Math.min(1, u * 1.4); { const fc = fireOf(save.equip.fire || 0).fl; ctx.fillStyle = u > 0.65 ? fc[0] : u > 0.35 ? fc[1] : fc[2]; }
    ctx.beginPath(); ctx.arc(x, f.y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of G.fireballs) {
    const x = f.x - cam, fl = 1 + 0.12 * Math.sin(T * 45);
    const g = ctx.createRadialGradient(x, f.y, 2, x, f.y, 40 * fl); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.3, `rgba(${fireOf(save.equip.fire || 0).a},.95)`); g.addColorStop(0.65, `rgba(${fireOf(save.equip.fire || 0).b},.5)`); g.addColorStop(1, `rgba(${fireOf(save.equip.fire || 0).c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, f.y, 40 * fl, 0, Math.PI * 2); ctx.fill();
    for (let k = 1; k <= 3; k++) { ctx.globalAlpha = 0.5 / k; circle(x - k * 16, f.y - k * 3 + Math.sin(T * 30 + k) * 3, 16 - k * 3, fireOf(save.equip.fire || 0).ball); }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (p.stomp && p.spin >= 1) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { const lx = p.wx - cam - 30 + i * 22; ctx.beginPath(); ctx.moveTo(lx, p.y - 150); ctx.lineTo(lx, p.y - 110); ctx.stroke(); } }
  for (const r of G.rings) { ctx.strokeStyle = `rgba(${r.c},${r.a})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(r.x - cam, r.y, r.r, -0.9, 0.9); ctx.stroke(); }
  for (const q of G.pops || []) { ctx.globalAlpha = clamp(q.t * 2, 0, 1); otxt(q.text, q.x - cam, q.y - (0.9 - q.t) * 50, 22, q.c, '#5a3a00', 5); } ctx.globalAlpha = 1;
  drawParts(cam);
  if (th.snow) drawSnow(0.8);
  if (th.lava) drawEmbers();
  drawAmbient(ART(G.wi));
  drawForeground(ART(G.wi), cam);
  drawFarForeground(G.wi, cam);
  if (TOD > 0.01) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgba(255,110,70,${0.1 * TOD})`); g.addColorStop(0.6, `rgba(255,150,70,${0.2 * TOD})`); g.addColorStop(1, `rgba(110,40,70,${0.16 * TOD})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  gradeVignette(G.wi, ART(G.wi), L.gateX > 0 ? clamp(p.wx / L.gateX, 0, 1) : 0.5);
  ctx.restore(); TOD = 0; chiliFx.dive = false;
  if (G.boss && G.boss.phase === 0 && (G.boss.state === 'enter' || (G.boss.state === 'taunt' && G.boss.t < 0.7))) { const bb = G.boss, u = bb.state === 'enter' ? clamp(bb.t / 0.6, 0, 1) : 1 - clamp(bb.t / 0.7, 0, 1), hh = 34 * u * u * (3 - 2 * u); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, hh); ctx.fillRect(0, H - hh, W, hh); } // cinematic bars for the boss entrance
  if (G.boss && G.boss.state === 'enter') { const wa = 0.18 + 0.14 * Math.sin(T * 12), wg = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 560); wg.addColorStop(0, 'rgba(255,40,20,0)'); wg.addColorStop(1, `rgba(255,40,20,${wa})`); ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H); }
  // boss prompt
  if (G.boss && ((G.boss.state === 'charge' && G.boss.x - p.wx < 390) || G.boss.state === 'tired') && Math.sin(T * 20) > -0.5) { otxt('JETZT BRÜLLEN!', W / 2, 200, 38, '#ff5252', '#000', 8); }
  // incoming-danger badges at the right edge
  for (const o of L.obs) {
    if (o.dead || o.scared || (o.type !== 'raptor' && o.type !== 'ptero')) continue;
    if (o.x - G.cam > W + 10 && o.x - p.wx < 1150) {
      const y = o.type === 'ptero' ? o.y : GROUND - 110;
      ctx.globalAlpha = 0.65 + 0.35 * Math.sin(T * 14); circle(W - 36, y, 22, '#e53935'); ctx.globalAlpha = 1;
      ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(W - 6, y); ctx.lineTo(W - 16, y - 10); ctx.lineTo(W - 16, y + 10); ctx.fill();
      otxt('!', W - 36, y + 1, 30, '#fff', '#7a0000', 4);
    }
  }
  if (G.entering) { const u = clamp(G.entering, 0, 1); ctx.fillStyle = `rgba(255,246,214,${clamp(u * 1.15 - 0.2, 0, 0.96)})`; ctx.fillRect(0, 0, W, H); }
  drawHUD();
  for (const f of G.flyEggs) {
    f.t += DT * 1.6; const u = Math.min(1, f.t), tx = W / 2 - 50 + f.k * 50, ty = 39;
    drawEgg(f.x + (tx - f.x) * u, f.y + (ty - f.y) * u - Math.sin(u * Math.PI) * 120, 24 - 7 * u, th.egg, th.eggSpot, 1 - u * 0.5, u * 6);
    if (u >= 1) { G.slotPop[f.k] = 0.6; SFX.amber(); }
  }
  G.flyEggs = G.flyEggs.filter(f => f.t < 1);
  if (G.flyAmb && G.flyAmb.length) { // amber arcs from where it was picked up into the HUD counter
    for (const f of G.flyAmb) { f.t += DT * 2.4; if (f.t < 0) continue; const u = Math.min(1, f.t), e = u * u * (3 - 2 * u); drawAmber(f.x + (190 - f.x) * e, f.y + (38 - f.y) * e - Math.sin(u * Math.PI) * 50, 11 - 3 * u); if (u >= 1) G.amberPop = 0.5; }
    G.flyAmb = G.flyAmb.filter(f => f.t < 1);
  }
  G.amberPop = Math.max(0, (G.amberPop || 0) - DT * 2.5);
  for (let k = 0; k < 3; k++) G.slotPop[k] = Math.max(0, G.slotPop[k] - DT * 1.5);
  if (G.hitFlash > 0 && save.calm) G.hitFlash = 0;
  if (G.hitFlash > 0) { G.hitFlash -= DT; const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,0,0,${Math.max(0, G.hitFlash)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (G.coach && !G.overlay) drawCoach();
  // start banner
  if (G.startT > 0) { ctx.globalAlpha = clamp(G.startT * 2, 0, 1); otxt(`Welt ${G.wi + 1}: ${th.name}`, W / 2, 230, 58, '#ffd34d', '#3b1d00', 12); { const ns = ['', 'Neue Fähigkeit: DUCKEN', 'Neue Fähigkeit: STAMPFER', 'Neu: FEUER-CHILI'][G.wi]; if (ns && G.startT >= 0.7) otxt(ns, W / 2, 296, 34, '#9fd3ff', '#0b2448', 8); } if (G.startT < 0.7) otxt('Los!', W / 2, 300, 46, '#fff', '#000', 10); ctx.globalAlpha = 1; }
  if (G.overlay) drawOverlay();
}
const actCache = {};
function actBtn(x, y, r, col, kind, label, fs, held) { // cached sprite of the button (it only changes with colour, label and pressed state)
  const k = Math.min(3, Math.max(1, Math.ceil(DPR * SC * 2) / 2)), R = Math.ceil(r + 12), key = `${kind}|${col}|${r}|${label}|${fs}|${held ? 1 : 0}|${k}`;
  let c = actCache[key];
  if (!c) {
    if (Object.keys(actCache).length > 40) for (const q in actCache) delete actCache[q];
    c = actCache[key] = document.createElement('canvas'); c.width = c.height = Math.ceil(R * 2 * k);
    const old = ctx; ctx = c.getContext('2d'); ctx.setTransform(k, 0, 0, k, 0, 0);
    try { actBtnDraw(R, R, r, col, kind, label, fs, held); } finally { ctx = old; }
  }
  ctx.drawImage(c, x - R, y - R, R * 2, R * 2);
}
function actBtnDraw(x, y, r, col, kind, label, fs, held) { // big round touch button: carved wooden ring with amber studs around a gem-coloured centre
  circle(x, y + 5, r + 3, 'rgba(0,0,0,.38)'); ctx.save(); ctx.globalAlpha = 0.96;
  const wg = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r + 4); wg.addColorStop(0, '#b98048'); wg.addColorStop(0.6, '#7a4f26'); wg.addColorStop(1, '#4a2c12');
  ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.clip(); ctx.strokeStyle = 'rgba(40,20,6,.28)'; ctx.lineWidth = 1.6; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x - r - 4, y + i * r * 0.27); ctx.quadraticCurveTo(x, y + i * r * 0.27 + (i % 2 ? 7 : -7), x + r + 4, y + i * r * 0.27); ctx.stroke(); } ctx.restore();
  ctx.lineWidth = 3; ctx.strokeStyle = '#e8b050'; ctx.beginPath(); ctx.arc(x, y, r + 1, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(30,14,4,.7)'; ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.stroke();
  const ir = r * 0.8, g = ctx.createRadialGradient(x - ir * 0.35, y - ir * 0.5, ir * 0.1, x, y, ir); g.addColorStop(0, shade(col, 1.4)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, 0.62));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, ir, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(30,14,4,.75)'; ctx.stroke(); ctx.restore();
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5; circle(x + Math.cos(a) * (r * 0.9), y + Math.sin(a) * (r * 0.9), Math.max(1.6, r * 0.045), '#f4c46a'); }
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, ir - 2, 0, Math.PI * 2); ctx.clip(); const hg = ctx.createLinearGradient(0, y - ir, 0, y); hg.addColorStop(0, 'rgba(255,255,255,.34)'); hg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(x, y - ir * 0.5, ir * 0.78, ir * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ico(kind, x, y - r * 0.2 + (held ? 2 : 0), r * 0.82); otxt(label, x, y + r * 0.56, fs, '#fff', 'rgba(40,16,0,.8)', 5);
}
// The touch buttons live in the soil band under the ground line (y > GROUND), so the followers running at the left edge stay visible on the grass.
function duckPos() { return [72, H - 51, 45]; }
function dashPos() { return G.sk.duck ? [180, H - 51, 42] : duckPos(); }
function scrollBox(x, y, w, h) { // parchment scroll with wooden rolls at both ends (hint bar)
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fff6dc'); g.addColorStop(1, '#f0dcaa');
  rr(x + 8, y, w - 16, h, 6); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
  ctx.strokeStyle = 'rgba(150,100,40,.14)'; ctx.lineWidth = 1.2; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 22, y + h * i / 3); ctx.lineTo(x + w - 22, y + h * i / 3 + 1.5); ctx.stroke(); }
  for (const rx of [x, x + w - 16]) { const rg = ctx.createLinearGradient(rx, 0, rx + 16, 0); rg.addColorStop(0, '#9a6a34'); rg.addColorStop(0.45, '#f0cf8e'); rg.addColorStop(1, '#8a5a2a'); rr(rx, y - 4, 16, h + 8, 8); ctx.fillStyle = rg; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#5a3a1a'; ctx.stroke(); }
}
let rexMarkerC = null, rexMarkerKey = '';
function rexMarker() { // the player's marker on the progress bar: Rex's face in a ring, painted once per skin and theme
  const key = save.equip.skin + '|' + G.wi; if (rexMarkerC && rexMarkerKey === key) return rexMarkerC;
  const R = 2, S = 30, c = document.createElement('canvas'), old = ctx; c.width = c.height = S * R; ctx = c.getContext('2d');
  try { ctx.scale(R, R); const r = S / 2 - 2, s = r / 42; ctx.beginPath(); ctx.arc(S / 2, S / 2, r, 0, Math.PI * 2); ctx.fillStyle = '#bfe6cf'; ctx.fill(); ctx.save(); ctx.clip(); drawRex(S / 2 - 88 * s, S / 2 + 104 * s, s * 0.95, 0, 0.25, rexLook(G.wi)); ctx.restore(); ctx.lineWidth = 2.4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(S / 2, S / 2, r, 0, Math.PI * 2); ctx.stroke(); } catch (e) { /* the marker is cosmetic */ } finally { ctx = old; }
  rexMarkerKey = key; return (rexMarkerC = c);
}
function drawHUD() {
  const p = G.p, th = WORLDS[G.wi];
  const bossBar = !!(G.boss && G.boss.state !== 'enter' && !G.golden && !G.bossDone); // boss health replaces the egg pill
  for (let i = 0; i < G.maxH; i++) drawHeart(34 + i * 40, 38, 1.25, i < p.hearts);
  if (G.endless) { rr(W / 2 - 110, 12, 220, 54, 27); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); otxt(String(G.score), W / 2, 36, 32, '#ffe08a', 'rgba(0,0,0,.7)', 6); txt('Rekord ' + Math.max(save.best[G.wi] || 0, G.score), W / 2, 58, 14, 'rgba(255,255,255,.8)', 'center', 'normal'); rr(W / 2 - 52, 72, 104, 24, 12); ctx.fillStyle = G.tier >= 4 ? 'rgba(200,50,30,.85)' : G.tier >= 2 ? 'rgba(230,140,30,.85)' : 'rgba(40,110,170,.85)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke(); txt('Stufe ' + G.tier, W / 2, 85, 16, '#fff'); }
  else if (!bossBar) { rr(W / 2 - 92, 12, 184, 54, 27); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); }
  if (!G.endless && !bossBar) for (let k = 0; k < 3; k++) { const got = G.eggsGot[k] && !G.flyEggs.some(f => f.k === k), before = G.li >= 0 && save.lvE[G.li][k]; drawEgg(W / 2 - 50 + k * 50, 39, 17 * (1 + G.slotPop[k]), got || before ? th.egg : 'rgba(255,255,255,.15)', got || before ? th.eggSpot : 'rgba(255,255,255,.1)', got ? 0.6 : 0, 0, got ? 1 : before ? 0.45 : 1); }
  drawAmber(190, 38, 12 * (1 + 0.45 * (G.amberPop || 0))); otxt(String(G.amber), 212, 39, 26, '#ffe08a', 'rgba(0,0,0,.7)', 5, 'left');
  if (!G.endless && !(G.bossStarted && !G.golden && !G.bossDone)) { // progress bar: how far to the gate, with flags, eggs, boss
    const L = G.L, x0 = W / 2 - 160, bw = 320, y0 = 74, span = L.gateX - 420;
    const fx = v => x0 + clamp((v - 200) / span, 0, 1) * bw;
    rr(x0 - 8, y0 - 9, bw + 16, 26, 13); ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.fill();
    rr(x0, y0 - 1, bw, 10, 5); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill(); // the track, so the way ahead is visible too
    rr(x0, y0 - 1, Math.max(10, fx(p.wx) - x0), 10, 5); ctx.fillStyle = vgrad(y0 - 1, y0 + 9, '#ffe27a', '#f0a81c'); ctx.fill();
    for (const c of L.cps) { const x = fx(c.x); ctx.fillStyle = c.on ? '#ffd34d' : '#eee'; ctx.fillRect(x - 1.5, y0 - 13, 3, 20); ctx.beginPath(); ctx.moveTo(x + 1.5, y0 - 13); ctx.lineTo(x + 13, y0 - 9); ctx.lineTo(x + 1.5, y0 - 5); ctx.fill(); }
    for (const e of L.eggs) if (!e.got) drawEgg(fx(e.x), y0 + 4, 8.5, e.hidden ? 'rgba(255,255,255,.55)' : th.egg, th.eggSpot);
    if (L.bossX) { circle(fx(L.bossX), y0 + 4, 9, '#c62828'); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffd700'; ctx.stroke(); }
    otxt('?', x0 + bw + 14, y0 + 4, 20, '#ffd34d', '#000', 4);
    { const m = rexMarker(), mx = clamp(fx(p.wx), x0, x0 + bw); ctx.drawImage(m, mx - 15, y0 + 4 - 15 + Math.sin(T * 6) * 0.8, 30, 30); } // Rex's own face rides along the bar
  }
  if (G.boss && G.boss.state !== 'enter' && !G.golden && !G.bossDone) { // boss health: four phase segments, or the duel meter
    const b = G.boss, x0 = W / 2 - 190, y0 = 34;
    rr(x0 - 10, y0 - 22, 400, 52, 16); ctx.fillStyle = 'rgba(20,6,6,.72)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d4a017'; ctx.stroke();
    txt(bossKind(b).name, x0 + 6, y0 - 8, 16, '#ffd34d', 'left'); txt(b.state === 'duel' ? 'BRÜLL-DUELL' : bossKind(b).phases[Math.min(bossKind(b).phases.length - 1, b.phase)].name, x0 + 380, y0 - 8, 14, b.kind === 'king' && b.phase === 3 ? '#ff9a5a' : '#fff', 'right', 'normal');
    if (b.state === 'duel') { rr(x0, y0 + 2, 380, 16, 8); ctx.fillStyle = '#400'; ctx.fill(); rr(x0, y0 + 2, Math.max(8, 380 * b.meter), 16, 8); ctx.fillStyle = vgrad(y0, y0 + 18, '#ffe27a', '#ff7a20'); ctx.fill(); }
    else for (let i = 0; i < bossKind(b).phases.length; i++) { const nP = bossKind(b).phases.length, sw = (380 - (nP - 1) * 8) / nP, sx = x0 + i * (sw + 8), frac = i < b.phase ? 0 : i === b.phase ? Math.max(0, b.hp) / 3 : 1; rr(sx, y0 + 2, sw, 16, 8); ctx.fillStyle = '#400'; ctx.fill(); if (frac > 0) { rr(sx, y0 + 2, Math.max(8, sw * frac), 16, 8); ctx.fillStyle = i === b.phase ? vgrad(y0, y0 + 18, '#ff6a5a', '#c01818') : '#8a2a2a'; ctx.fill(); } rr(sx, y0 + 2, sw, 16, 8); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.stroke(); }
  }
  if (G.banner) { const bn = G.banner, u = clamp(bn.t / 2.0, 0, 1), age = 2.0 - bn.t, pop = age < 0.18 ? 1 + 1.4 * (1 - age / 0.18) ** 2 : 1 + 0.07 * Math.max(0, 1 - (age - 0.18) / 0.3), al = clamp(bn.t * 2, 0, 1) * clamp((2.0 - bn.t) * 6, 0, 1); ctx.save(); ctx.globalAlpha = al; ctx.translate(W / 2, 134); ctx.scale(pop, pop); otxt(bn.text, 0, 0, 38, bn.col, '#000', 8); otxt(bn.sub, 0, 30, 20, '#fff', '#000', 6); ctx.restore(); }
  if (G.boss && G.boss.state === 'duel') { const b = G.boss; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(T * 18); otxt('BRÜLL! BRÜLL! BRÜLL!', W / 2, 330, 40, '#ffe27a', '#7a1000', 9); ctx.globalAlpha = 1; }
  if (G.tip && !G.overlay) { ctx.globalAlpha = clamp(G.tip.t * 2, 0, 1); const x0 = G.sk.dash && G.sk.duck && !G.L.swim ? 240 : 190, x1 = 790, lines = wrapLines(G.tip.text, x1 - x0 - 92, 17), h = 16 + lines.length * 22, tipY = H - h - 6; scrollBox(x0, tipY, x1 - x0, h); drawPortrait('goetti', x0 + 36, tipY + h / 2, 24); lines.forEach((l, i) => txt(l, (x0 + 68 + x1 - 12) / 2, tipY + 20 + i * 22, 17, '#3b2410')); ctx.globalAlpha = 1; }
  if (G.overlay) return;
  // pause
  circle(W - 44, 43, 26, 'rgba(0,0,0,.3)'); circle(W - 44, 40, 26, 'rgba(18,22,38,.7)'); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(W - 44, 40, 26, 0, Math.PI * 2); ctx.stroke(); ico('pause', W - 44, 40, 30);
  buttons.push({ x: W - 74, y: 10, w: 60, h: 60, cb: () => { G.overlay = { type: 'pause' }; } });
  if (G.sk.duck || (G.sk.dash && !G.L.swim)) { const dw = G.sk.duck && G.sk.dash && !G.L.swim ? 262 : 150, dg = ctx.createLinearGradient(0, 0, dw, 0); dg.addColorStop(0, 'rgba(0,0,0,.22)'); dg.addColorStop(0.7, 'rgba(0,0,0,.12)'); dg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = dg; ctx.fillRect(0, GROUND + 3, dw, H - GROUND - 3); } // a soft dock under the touch buttons
  // duck / stomp button
  if (G.sk.duck) { const [dx, dy] = duckPos(), held = G.duckHeld != null, air = !p.onGround && G.sk.stomp;
    const threat = G.L.obs.some(o => !o.dead && !o.scared && ((o.type === 'low') || (o.type === 'ptero' && o.low)) && o.x - p.wx > 0 && o.x - p.wx < 330) || (air && G.L.obs.some(o => !o.dead && !o.flat && (o.type === 'geode' || o.type === 'compy') && Math.abs(o.x - p.wx - 60) < 120));
    if (threat && !held) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T * 14); circle(dx, dy, 62 + 4 * Math.sin(T * 14), '#9fd3ff'); ctx.globalAlpha = 1; }
    actBtn(dx, dy, held ? 41 : 45, held ? '#1f5ab8' : '#3a7ee0', air && !G.L.swim ? 'stomp' : 'duck', G.L.swim ? 'TAUCHEN' : air ? 'STAMPF!' : 'DUCKEN', 17, held); }
  if (G.sk.dash && !G.L.swim) { const [fx, fy, fr] = dashPos(), cd = p.dashCd > 0, wallAhead = G.L.obs.some(o => !o.dead && o.type === 'wall' && o.x - p.wx > 0 && o.x - p.wx < 420);
    if (wallAhead && !cd) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T * 14); circle(fx, fy, fr + 10 + 4 * Math.sin(T * 14), '#ffd34d'); ctx.globalAlpha = 1; }
    actBtn(fx, fy, fr, cd ? '#6a6a6a' : '#ec8a18', 'dash', 'FLITZ', 17);
    if (cd) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(fx, fy, fr - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCd / 1.7)); ctx.stroke(); } }
  // roar / fire button
  const rx = W - 92, ry = H - 72, ready = p.roarCd <= 0 || (G.boss && G.boss.state === 'duel');
  if (p.fireT > 0 && !G.boss) {
    ctx.globalAlpha = 0.45 + 0.25 * Math.sin(T * 10); circle(rx, ry, 80, '#ffb030'); ctx.globalAlpha = 1;
    actBtn(rx, ry, 66, '#ff6a14', 'fire', 'FEUER!', 24);
    ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(rx, ry, 58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.fireT / 8)); ctx.stroke();
    buttons.push({ x: rx - 80, y: ry - 80, w: 160, h: 160, cb: roar, silent: true });
    return;
  }
  const target = G.L.obs.some(o => !o.dead && !o.scared && (o.type === 'raptor' || o.type === 'ptero' || o.type === 'boulder') && o.x - p.wx > 0 && o.x - p.wx < 360) || (G.boss && (G.boss.state === 'tired' || G.boss.state === 'duel' || (G.boss.state === 'charge' && G.boss.x - p.wx < 390)));
  if (ready && target) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T * 14); circle(rx, ry, 82 + 6 * Math.sin(T * 14), '#ffd34d'); ctx.globalAlpha = 1; }
  const arena = G.arena || 0, br = Math.round(66 - 12 * arena); // smaller in a boss arena so it covers less of the boss (the touch area stays the same)
  ctx.globalAlpha = 1 - 0.18 * arena * (target ? 0 : 1); actBtn(rx, ry, br, ready ? '#d63a28' : '#6a6a6a', 'roar', 'BRÜLL!', Math.round(24 - 3 * arena)); ctx.globalAlpha = 1;
  if (!ready) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(rx, ry, br - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.roarCd / (p.roarMax || 0.85))); ctx.stroke(); }
  buttons.push({ x: rx - 80, y: ry - 80, w: 160, h: 160, cb: roar, silent: true });
}
function drawCoach() {
  const c = G.coach;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, 210); const s = 1 + 0.06 * Math.sin(T * 8); ctx.scale(s, s); otxt(c.text, 0, 0, 46, '#ffd34d', '#3b1d00', 10); ctx.restore();
  const u = (T * 1.4) % 1;
  if (c.type === 'jump' || c.type === 'djump') {
    ctx.strokeStyle = `rgba(255,255,255,${1 - u})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(W / 2, 300, 18 + u * 55, 0, Math.PI * 2); ctx.stroke();
    if (c.type === 'djump') { ctx.strokeStyle = `rgba(255,211,77,${u})`; ctx.beginPath(); ctx.arc(W / 2, 300, 18 + (1 - u) * 55, 0, Math.PI * 2); ctx.stroke(); } // second ring: a second tap
    setFont(70, 'normal'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('👆', W / 2 + 8, 340 - Math.abs(Math.sin(T * 6)) * 16);
  } else if (c.type === 'glide') { // hold the finger down in the air
    const gy = 290; ctx.fillStyle = `rgba(255,255,255,${0.18 + 0.1 * Math.sin(T * 6)})`; ctx.beginPath(); ctx.arc(W / 2, gy, 44, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(W / 2, gy, 44, 0, Math.PI * 2); ctx.stroke();
    setFont(70, 'normal'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('👆', W / 2 + 8, gy + 30);
    rr(W / 2 - 100, gy + 78, 200, 16, 8); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fill(); rr(W / 2 - 98, gy + 80, Math.max(12, 196 * ((T * 0.7) % 1)), 12, 6); ctx.fillStyle = '#ffd34d'; ctx.fill(); otxt('HALTEN', W / 2, gy + 118, 24, '#fff', 'rgba(0,0,0,.6)', 5);
  } else if (c.type === 'dash') {
    const [dx, dy, dr] = dashPos();
    ctx.strokeStyle = `rgba(255,190,90,${1 - u})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(dx, dy, dr + 6 + u * 45, 0, Math.PI * 2); ctx.stroke();
    actBtn(dx, dy, dr + 2, '#ec8a18', 'dash', 'FLITZ', 17);
    const bx = dx + dr + 110 + Math.abs(Math.sin(T * 6)) * 18;
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(bx - 62, dy); ctx.lineTo(bx - 30, dy - 26); ctx.lineTo(bx - 30, dy - 11); ctx.lineTo(bx + 24, dy - 11); ctx.lineTo(bx + 24, dy + 11); ctx.lineTo(bx - 30, dy + 11); ctx.lineTo(bx - 30, dy + 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3b1d00'; ctx.lineWidth = 3; ctx.stroke();
  } else if (c.type === 'duck' || c.type === 'stomp') {
    const [dx, dy] = duckPos();
    ctx.strokeStyle = `rgba(160,210,255,${1 - u})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(dx, dy, 62 + u * 45, 0, Math.PI * 2); ctx.stroke();
    actBtn(dx, dy, 52, '#3a7ee0', c.type === 'stomp' ? 'stomp' : 'duck', c.type === 'stomp' ? 'STAMPF!' : 'DUCKEN', 17);
    const bx = dx + 150 + Math.abs(Math.sin(T * 6)) * 18;
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(bx - 62, dy); ctx.lineTo(bx - 30, dy - 26); ctx.lineTo(bx - 30, dy - 11); ctx.lineTo(bx + 24, dy - 11); ctx.lineTo(bx + 24, dy + 11); ctx.lineTo(bx - 30, dy + 11); ctx.lineTo(bx - 30, dy + 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3b1d00'; ctx.lineWidth = 3; ctx.stroke();
  } else {
    const rx = W - 92, ry = H - 72;
    ctx.strokeStyle = `rgba(255,220,80,${1 - u})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(rx, ry, 70 + u * 45, 0, Math.PI * 2); ctx.stroke();
    const fire = G.p.fireT > 0; actBtn(rx, ry, 66, fire ? '#ff6a14' : '#d63a28', fire ? 'fire' : 'roar', fire ? 'FEUER!' : 'BRÜLL!', 24);
    const bx = rx - 160 - Math.abs(Math.sin(T * 6)) * 18;
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(bx + 62, ry); ctx.lineTo(bx + 30, ry - 26); ctx.lineTo(bx + 30, ry - 11); ctx.lineTo(bx - 24, ry - 11); ctx.lineTo(bx - 24, ry + 11); ctx.lineTo(bx + 30, ry + 11); ctx.lineTo(bx + 30, ry + 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3b1d00'; ctx.lineWidth = 3; ctx.stroke();
  }
}
function woodFrame(x, y, w, h, r = 26, paper = '#fff3d6') {
  ctx.save(); rr(x, y + 8, w, h, r); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); ctx.restore();
  rr(x, y, w, h, r); ctx.fillStyle = vgrad(y, y + h, '#a06a3a', '#7b4f2b', '#4f3019'); ctx.fill();
  ctx.save(); rr(x, y, w, h, r); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2; for (let i = 0; i < h; i += 9) { ctx.beginPath(); ctx.moveTo(x, y + i); ctx.lineTo(x + w, y + i + (i % 18 ? 2 : -2)); ctx.stroke(); } ctx.restore();
  rr(x, y, w, h, r); ctx.lineWidth = 3.5; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
  const pad = 11; rr(x + pad, y + pad, w - pad * 2, h - pad * 2, Math.max(6, r - 8)); ctx.fillStyle = vgrad(y, y + h, shade(paper, 1.04), paper, shade(paper, 0.93)); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#3f2813'; ctx.stroke();
  ctx.save(); rr(x + pad, y + pad, w - pad * 2, h - pad * 2, Math.max(6, r - 8)); ctx.clip(); ctx.strokeStyle = 'rgba(120,80,30,.07)'; ctx.lineWidth = 1; for (let i = 0; i < h; i += 7) { ctx.beginPath(); ctx.moveTo(x, y + i); ctx.lineTo(x + w, y + i); ctx.stroke(); } ctx.restore();
  for (const [cx, cy] of [[x + 14, y + 14], [x + w - 14, y + 14], [x + 14, y + h - 14], [x + w - 14, y + h - 14]]) { circle(cx, cy, 4, '#d6b36a'); circle(cx - 1, cy - 1, 1.6, '#fff3c0'); }
}
function panel(x, y, w, h) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H); woodFrame(x, y, w, h); }
// ---------- the stone tablet (level gate and Götti-Quiz) ----------
// The slab itself (sediment layers, mottling, grain, pits, cracks, bevel, carved border, studs) never changes, so it is painted once into a cached canvas.
// Only the theme decoration on top (moss and vines, frost and icicles, glowing lava cracks, snow and holly, sand and shells, seaweed, ...) is drawn live.
const TABLET_M = 18, tabletCache = { c: null, rs: 0, w: 0, h: 0 }, crackMemo = {};
const TABLET_TINT = ['rgba(60,120,60,.10)', 'rgba(200,110,50,.16)', 'rgba(150,200,255,.14)', 'rgba(110,40,20,.2)', 'rgba(170,60,60,.08)', 'rgba(230,200,130,.14)', 'rgba(40,120,160,.18)', 'rgba(160,180,210,.12)'];
function crackLines(x, y, ang, len, seed, depth) { // a seeded, wandering crack with side branches: a list of polylines (memoised, the shapes never change)
  const key = [x, y, ang, len, seed, depth].join(); if (crackMemo[key]) return crackMemo[key];
  const pts = [[x, y]], out = [pts]; let k = 0;
  for (let d = 0; d < len; d += 9) {
    ang += (hash(seed + k++) - 0.5) * 0.9; x += Math.cos(ang) * 9; y += Math.sin(ang) * 9; pts.push([x, y]);
    if (depth > 0 && k % 3 === 0 && hash(seed + k * 7) > 0.35) out.push(...crackLines(x, y, ang + (hash(seed + k) > 0.5 ? 0.9 : -0.9), len * 0.4 - d * 0.3, seed + k * 13, depth - 1));
  }
  return crackMemo[key] = out.filter(l => l.length > 1);
}
function strokeLines(lines, dx = 0, dy = 0) { ctx.beginPath(); for (const l of lines) { ctx.moveTo(l[0][0] + dx, l[0][1] + dy); for (let i = 1; i < l.length; i++) ctx.lineTo(l[i][0] + dx, l[i][1] + dy); } ctx.stroke(); }
function paintStone(w, h) { // the slab in its own coordinates: 0,0 is its top left corner
  ctx.save(); rr(0, 10, w, h, 30); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fill(); ctx.restore();
  rr(0, 0, w, h, 30); ctx.fillStyle = vgrad(0, h, '#a4abb4', '#7b838d', '#555c66'); ctx.fill();
  ctx.save(); rr(0, 0, w, h, 30); ctx.clip();
  for (let i = 0; i < 16; i++) { // sediment layers: wavy bands, some lighter, some darker
    const y0 = hash(i * 3 + 1) * h, th = 6 + hash(i * 3 + 2) * 26;
    ctx.fillStyle = hash(i * 3 + 3) > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; ctx.beginPath(); ctx.moveTo(0, y0);
    for (let x = 0; x <= w; x += 25) ctx.lineTo(x, y0 + Math.sin(x * 0.013 + i * 2.1) * 7 + Math.sin(x * 0.041 + i) * 2.5);
    for (let x = w; x >= 0; x -= 25) ctx.lineTo(x, y0 + th + Math.sin(x * 0.011 + i * 1.3) * 7);
    ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 46; i++) { // soft mottling
    const bx = hash(i + 100) * w, by = hash(i + 200) * h, br = 30 + hash(i + 300) * 70, g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, hash(i + 400) > 0.5 ? 'rgba(20,24,32,.10)' : 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  for (let i = 0; i < 1500; i++) { ctx.globalAlpha = 0.04 + hash(i + 500) * 0.1; ctx.fillStyle = hash(i + 600) > 0.5 ? '#fff' : '#000'; const s = 0.6 + hash(i + 700) * 1.6; ctx.fillRect(hash(i) * w, hash(i + 9) * h, s, s); } ctx.globalAlpha = 1; // grain
  for (let i = 0; i < 36; i++) { const px = hash(i + 800) * w, py = hash(i + 900) * h, pr = 1.5 + hash(i + 1000) * 3.5; ell(px, py + 1, pr, pr * 0.75, 0, 'rgba(255,255,255,.22)'); ell(px, py, pr, pr * 0.75, 0, 'rgba(25,30,38,.45)'); } // pits
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [cx, cy, ca, cl, cs] of [[w - 92, 0, 1.9, 120, 3], [0, h - 124, 0.25, 110, 11], [w * 0.62, h, -1.7, 70, 21], [w, h * 0.58, 3.0, 60, 31], [34, 0, 1.3, 60, 41]]) { // cracks: a dark line with a light edge beside it
    const ls = crackLines(cx, cy, ca, cl, cs, 2);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.2; strokeLines(ls, 1, 1.6);
    ctx.strokeStyle = 'rgba(18,22,28,.6)'; ctx.lineWidth = 2.2; strokeLines(ls);
  }
  let g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.65); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,14,20,.4)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); // worn, darker edges
  g = ctx.createLinearGradient(0, 0, w * 0.55, h * 0.55); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); // light from the top left
  ctx.restore();
  // bevel: lit top and left edge, shaded bottom and right edge
  ctx.save(); rr(0, 0, w, h, 30); ctx.clip(); g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
  rr(2.5, 2.5, w - 5, h - 5, 28); ctx.lineWidth = 6; ctx.strokeStyle = g; ctx.stroke(); ctx.restore();
  rr(0, 0, w, h, 30); ctx.lineWidth = 4; ctx.strokeStyle = '#262b33'; ctx.stroke();
  // carved border: a row of small diamonds, then a double groove
  const dia = (px, py) => { ctx.beginPath(); ctx.moveTo(px, py - 4.5); ctx.lineTo(px + 3.5, py); ctx.lineTo(px, py + 4.5); ctx.lineTo(px - 3.5, py); ctx.closePath(); };
  for (const [px, py] of (() => { const o = []; for (let x = 50; x <= w - 50; x += 26) o.push([x, 7], [x, h - 7]); for (let y = 50; y <= h - 50; y += 26) o.push([7, y], [w - 7, y]); return o; })()) {
    dia(px, py + 1); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fill(); dia(px, py); ctx.fillStyle = 'rgba(25,30,38,.55)'; ctx.fill();
  }
  rr(14, 15.5, w - 28, h - 28, 22); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.stroke(); // groove: dark line, light edge below it
  rr(14, 14, w - 28, h - 28, 22); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,24,30,.6)'; ctx.stroke();
  rr(18, 18, w - 36, h - 36, 19); ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.stroke();
  for (const [sx, sy] of [[w - 26, 26], [26, h - 26], [w - 26, h - 26]]) { // carved studs in three corners (the rune medallion sits in the fourth)
    circle(sx, sy + 1.5, 10, 'rgba(255,255,255,.3)'); circle(sx, sy, 10, '#2a3038'); const sg = ctx.createRadialGradient(sx - 3, sy - 3, 1, sx, sy, 8); sg.addColorStop(0, '#c4cad2'); sg.addColorStop(1, '#6a727d'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20,24,30,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy + 4); ctx.stroke();
  }
}
function tabletAccent(wi, w, h) { // live theme decoration on the slab, in slab coordinates. The answers fill x 54..644, so the decoration lives in the side margins.
  const sway = k => Math.sin(T * 1.6 + k) * 3, moss = (mx, my, mr, a = 0.55) => { ctx.globalAlpha = a; ell(mx, my, mr, mr * 0.45, 0, '#5f8f46'); ell(mx + 8, my - 4, mr * 0.6, mr * 0.25, 0, '#86b85c'); ctx.globalAlpha = 1; };
  const snow = (n, hh) => { ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= w; x += 14) ctx.lineTo(x, hh * (0.55 + 0.45 * hash(x * 0.37 + n))); ctx.lineTo(w, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(150,175,215,.35)'; ctx.fillRect(0, hh * 0.9, w, 2); };
  const sand = () => { for (const [sx, sy, sr] of [[22, h - 10, 74], [w - 26, h - 8, 70], [w * 0.5, h + 6, 100]]) { ctx.globalAlpha = 0.9; ell(sx, sy, sr, sr * 0.34, 0, '#e3cf9a'); ell(sx + 6, sy - 5, sr * 0.6, sr * 0.16, 0, '#f2e2b6'); ctx.globalAlpha = 1; } };
  const vine = (vx, dir) => { ctx.strokeStyle = '#2f6a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(vx, 112); for (let y = 112; y <= 380; y += 12) ctx.lineTo(vx + dir * 6 * Math.sin(y * 0.09), y); ctx.stroke();
    for (let y = 124, i = 0; y <= 372; y += 19, i++) { const lx = vx + dir * 6 * Math.sin(y * 0.09), sd = i % 2 ? 1 : -1; ell(lx + sd * 10, y, 10, 4, sd * 0.5, '#4f9a45'); ell(lx + sd * 10, y - 1, 6, 1.8, sd * 0.5, '#7cc46a'); if (i % 4 === 1) { circle(lx - sd * 5, y + 7, 5, '#e8506a'); circle(lx - sd * 5, y + 7, 2.2, '#ffd34d'); } } };
  const sideFrost = () => { for (let y = 120; y < h - 30; y += 26) { ctx.globalAlpha = 0.4 + 0.2 * hash(y); ell(0, y, 12 + hash(y + 1) * 10, 11, 0, '#eef6ff'); ell(w, y + 13, 12 + hash(y + 2) * 10, 11, 0, '#eef6ff'); } ctx.globalAlpha = 1; };
  switch (wi) {
    case 0: // Dschungel: moss and flowering vines along both sides
      moss(22, h - 18, 50); moss(w - 30, h - 12, 42); moss(60, 6, 30); vine(12, 1); vine(w - 12, -1); break;
    case 1: // Canyon: red dust, rust lichen, a small cactus
      sand(); for (let i = 0; i < 18; i++) { ctx.globalAlpha = 0.5; circle(hash(i + 60) * w, hash(i + 70) < 0.5 ? 8 + hash(i + 80) * 30 : h - 10 - hash(i + 90) * 40, 3 + hash(i + 50) * 5, i % 2 ? '#d9802e' : '#e8a24a'); } ctx.globalAlpha = 1;
      ctx.fillStyle = '#4f9a55'; ctx.strokeStyle = '#2b5f33'; ctx.lineWidth = 2; for (const [ax, ay, aw, ah] of [[w - 36, h - 96, 14, 86], [w - 58, h - 70, 10, 30], [w - 22, h - 58, 10, 26]]) { rr(ax, ay, aw, ah, 6); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#f08a4a'; circle(w - 29, h - 98, 4, '#f08a4a'); break;
    case 2: // Eiszeit: snow cap, icicles, frost banks climbing the sides
      snow(2, 14); sideFrost();
      for (const [ix, il] of [[10, 52], [28, 30], [316, 30], [336, 18], [354, 38], [668, 28], [684, 54]]) { const g = ctx.createLinearGradient(0, 0, 0, il); g.addColorStop(0, 'rgba(240,250,255,.97)'); g.addColorStop(1, 'rgba(150,205,240,.6)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ix - 7, 8); ctx.lineTo(ix + 7, 8); ctx.lineTo(ix, 8 + il); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(ix - 3.5, 9, 2, il * 0.55); }
      for (const [fx, fy] of [[24, h - 14], [w - 26, h - 12]]) { ctx.globalAlpha = 0.75; ell(fx, fy, 64, 26, 0, '#eef6ff'); ctx.globalAlpha = 1; } break;
    case 3: { // Vulkan: soot and glowing lava cracks running down the sides
      ctx.globalAlpha = 0.4; ell(w / 2, h + 6, w * 0.45, 30, 0, '#1b1212'); ctx.globalAlpha = 1;
      const pulse = 0.65 + 0.35 * Math.sin(T * 2.4); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 36, h); ctx.rect(w - 56, 0, 56, h); ctx.clip(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [cx, cy, ca, cl, cs] of [[0, h - 30, -1.2, 230, 71], [w, 110, 1.75, 240, 81], [18, 124, 1.5, 150, 101], [w - 20, h, -1.7, 150, 91]]) { const ls = crackLines(cx, cy, ca, cl, cs, 2); if (!LOWFX) { ctx.shadowColor = '#ff6a10'; ctx.shadowBlur = 14 * pulse; } ctx.strokeStyle = `rgba(255,${110 + 70 * pulse | 0},30,${0.6 + 0.4 * pulse})`; ctx.lineWidth = 4; strokeLines(ls); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,235,160,.95)'; ctx.lineWidth = 1.6; strokeLines(ls); }
      ctx.restore(); break; }
    case 4: // Weihnacht: snow cap, snow banks and big holly sprigs
      snow(4, 16); for (const [fx, fy] of [[22, h - 12], [w - 24, h - 10]]) { ctx.globalAlpha = 0.9; ell(fx, fy, 66, 24, 0, '#f4f8ff'); ctx.globalAlpha = 1; }
      for (const [hx, hy, hs] of [[30, h - 70, 1], [w - 30, h - 84, -1], [w - 28, 150, -1]]) { for (const a of [-0.9, 0, 0.9]) { ctx.save(); ctx.translate(hx, hy); ctx.rotate(a * hs - 1.2 * hs); ell(15 * hs, 0, 17, 7, 0, '#2f7a3a'); ell(15 * hs, 0, 11, 2.4, 0, '#58b060'); ctx.restore(); } for (const [bx, by] of [[0, 0], [9 * hs, 4], [-4 * hs, 8]]) { circle(hx + bx, hy + by, 5.4, '#d8283a'); circle(hx + bx - 1.4, hy + by - 1.6, 1.8, '#ff9aa4'); } }
      break;
    case 5: // Strand: sand drifts, a scallop shell and a starfish, and a bit of rope
      sand(); ctx.save(); ctx.translate(w - 28, h - 62); ctx.scale(1.3, 1.3); ctx.fillStyle = '#f6c9b8'; ctx.strokeStyle = '#c98a78'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 8); ctx.arc(0, 8, 19, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(0, 8); ctx.lineTo(i * 8, -9 + Math.abs(i) * 2); } ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(30, h - 64); ctx.rotate(-0.2); ctx.scale(1.4, 1.4); ctx.fillStyle = '#f0884a'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5 : 14; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#b3501c'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
      for (const rx of [14, w - 14]) { ctx.strokeStyle = '#c9a56a'; ctx.lineWidth = 4; ctx.beginPath(); for (let y = 110; y < 320; y += 7) { ctx.moveTo(rx - 3, y); ctx.lineTo(rx + 3, y + 5); } ctx.stroke(); } break;
    case 6: // Unterwasser: tall swaying seaweed in the side margins, barnacles and rising bubbles
      ctx.lineCap = 'round'; for (const [sx, n, col] of [[20, 4, '#2f9a5a'], [44, 3, '#3fb870'], [w - 22, 4, '#2f9a5a'], [w - 46, 3, '#3fb870']]) for (let k = 0; k < n; k++) { const bx = sx + (k - 1) * 8, hh = 90 + 38 * k; ctx.strokeStyle = col; ctx.lineWidth = 6 - k; ctx.beginPath(); ctx.moveTo(bx, h - 6); ctx.bezierCurveTo(bx + sway(sx + k) * 2, h - 6 - hh * 0.35, bx + sway(sx + k + 2) * 3, h - 6 - hh * 0.7, bx + sway(sx + k + 4) * 3, h - 6 - hh); ctx.stroke(); }
      for (let i = 0; i < 12; i++) circle(w - 40 + hash(i + 3) * 30, 120 + hash(i + 4) * 70, 1.8 + hash(i) * 1.8, i % 3 ? '#d8d2c2' : '#bfb8a6'); // barnacles
      for (let i = 0; i < 5; i++) { const u = (T * 0.1 + i * 0.2) % 1; ctx.globalAlpha = 0.7 * Math.sin(u * Math.PI); ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(12 + i * 3 + sway(i * 2) * 1.5, h - 20 - u * (h - 60), 4 + i, 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = 1; break;
    case 7: // Berge: a snow cap, lichen, edelweiss
      snow(7, 12); for (const [lx, ly, lr] of [[24, h - 16, 38], [w - 28, h - 14, 34], [w - 38, 44, 20], [26, 150, 16]]) { ctx.globalAlpha = 0.65; ell(lx, ly, lr, lr * 0.5, 0, '#8aa070'); ell(lx + 5, ly - 3, lr * 0.55, lr * 0.25, 0, '#c4cf95'); ctx.globalAlpha = 1; }
      for (const [ex, ey] of [[26, h - 70], [w - 28, h - 100], [w - 30, 200]]) { ctx.strokeStyle = '#4f7a45'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex, ey + 30); ctx.lineTo(ex, ey + 4); ctx.stroke(); for (let i = 0; i < 8; i++) ell(ex + Math.cos(i * 0.785) * 9, ey + Math.sin(i * 0.785) * 9, 7, 3, i * 0.785, '#fbfbf2'); circle(ex, ey, 4.4, '#f0d050'); }
      break;
  }
}
function stoneTablet(x, y, w, h, wi = 0) {
  const M = TABLET_M, rs = Math.min(2, Math.max(1, DPR * SC)), t = tabletCache;
  if (!t.c || t.rs !== rs || t.w !== w || t.h !== h) { // (re)paint the slab when the screen scale changes
    const c = t.c || document.createElement('canvas'); c.width = Math.ceil((w + 2 * M) * rs); c.height = Math.ceil((h + 2 * M) * rs);
    const old = ctx; ctx = c.getContext('2d'); ctx.setTransform(rs, 0, 0, rs, M * rs, M * rs);
    try { paintStone(w, h); } finally { ctx = old; }
    t.c = c; t.rs = rs; t.w = w; t.h = h;
  }
  ctx.drawImage(t.c, x - M, y - M, w + 2 * M, h + 2 * M);
  ctx.save(); ctx.translate(x, y); rr(0, 0, w, h, 30); ctx.clip();
  ctx.fillStyle = TABLET_TINT[wi] || TABLET_TINT[0]; ctx.fillRect(0, 0, w, h); // each theme tints the stone a little
  tabletAccent(wi, w, h);
  ctx.restore();
}
// Text that has to fit on any device font (the fallback font of a tablet or a CI machine can be 15% wider than the one this was drawn with):
// fitText picks the largest [size, maxLines] step whose wrapped text stays within its line limit (else the last step); fitSize shrinks a single line to a width.
const RIDDLE_Q_STEPS = [[28, 3], [24, 4], [21, 4], [18, 4]], RIDDLE_WHY_STEPS = [[24, 2], [20, 3], [17, 3], [15, 3]]; // [font size, max lines] for a question (600 px wide) and its explanation (610 px)
function fitText(s, maxW, steps) { for (const [size, lines] of steps) { const l = wrapLines(s, maxW, size); if (l.length <= lines) return { size, lines: l }; } const size = steps[steps.length - 1][0]; return { size, lines: wrapLines(s, maxW, size) }; }
function fitSize(s, maxW, size, min = 12, weight = 'bold') { setFont(size, weight); while (size > min && ctx.measureText(s).width > maxW) { size--; setFont(size, weight); } return size; }
function txtFit(s, x, y, size, color, maxW, align = 'center', weight = 'bold') { txt(s, x, y, fitSize(s, maxW, size, 10, weight), color, align, weight); }
// Parchment-and-gold plate (answers, theme cards). state: 0 normal, 1 locked/dimmed, 2 wrong
function plateBody(x, y, w, h, r, state) {
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.34)'; rr(x, y + 5, w, h, r); ctx.fill(); ctx.restore();
  const c = state === 2 ? ['#dcb8b0', '#c4908a', '#9c6a64'] : state === 1 ? ['#e6dec8', '#d2c8aa', '#b3a780'] : ['#fcecb8', '#edcb6c', '#c99834'];
  rr(x, y, w, h, r); ctx.fillStyle = vgrad(y, y + h, c[0], c[1], c[2]); ctx.fill();
  ctx.save(); rr(x, y, w, h, r); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x, y, w, h * 0.42);
  for (let i = 0; i < 46; i++) { ctx.globalAlpha = 0.06 + hash(i + 7) * 0.07; ctx.fillStyle = hash(i + 200) > 0.5 ? '#fff' : '#5a3a10'; ctx.fillRect(x + hash(i) * w, y + hash(i + 9) * h, 1.6, 1.6); } ctx.globalAlpha = 1; // parchment grain
  ctx.restore();
  rr(x, y, w, h, r); ctx.lineWidth = 3; ctx.strokeStyle = state === 2 ? '#6a3a36' : '#5b3b14'; ctx.stroke(); rr(x + 4, y + 4, w - 8, h - 8, Math.max(4, r - 4)); ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.stroke();
}
const GEMS = [['#ff9aa6', '#c8203c', '#6e0c1e'], ['#9ad0ff', '#2a70d4', '#10407e'], ['#a4f4bc', '#2aae64', '#0e5c32']]; // ruby, sapphire, emerald for A, B and C
function answerPlate(x, y, w, h, label, j, state) {
  plateBody(x, y, w, h, 24, state);
  const gx = x + 38, gy = y + h / 2 + 1, gc = state === 2 ? ['#e2e2e2', '#8c8c8c', '#4a4a4a'] : GEMS[j]; // a cut gem on a gold bezel
  circle(gx, gy + 2.5, 23, 'rgba(0,0,0,.25)'); circle(gx, gy, 23, '#5b3b14'); circle(gx, gy, 20.5, state === 2 ? '#b8a89a' : '#f2cb62');
  const gg = ctx.createRadialGradient(gx - 6, gy - 7, 2, gx, gy, 17); gg.addColorStop(0, gc[0]); gg.addColorStop(0.55, gc[1]); gg.addColorStop(1, gc[2]); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gx, gy, 16.5, 0, Math.PI * 2); ctx.fill();
  ell(gx - 5.5, gy - 8, 6.5, 3, -0.6, 'rgba(255,255,255,.65)'); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(gx, gy, 11, 0.3, 2.6); ctx.stroke();
  const gl = state === 2 ? '✗' : 'ABC'[j]; txt(gl, gx + 1, gy + 2.5, 22, 'rgba(0,0,0,.45)'); txt(gl, gx, gy + 1, 22, '#fff');
  txt(label, x + w / 2 + 16, y + h / 2 + 1, fitSize(label, 440, 30, 18), state === 2 ? '#6a4a46' : '#2b1a00');
}
// The stone riddle tablet: Götti and Chili, the question, three answers, the hint and the solved panel. Used by the level gate (drawOverlay) and the quiz scene.
// ui: { title, wi (theme: tints the stone and picks its decoration), emblem? (theme emblem instead of the rune coin), dim? (backdrop darkening, default .55), doneLabel, onDone, pips?: ['gold'|'help'|'', ...], at?: index of the current question }
function drawRiddleTablet(o, ui) {
  const r = o.r, b0 = buttons.length; o.shake = Math.max(0, o.shake - DT); o.solvedT = o.solved ? (o.solvedT || 0) + DT : 0; o.t += DT;
  // entrance: the tablet drops in from above and bounces once on landing, Götti and Chili hop in from the left
  const u = clamp(o.t / 0.6, 0, 1), bn = u < 0.55 ? (u / 0.55) ** 2 : u < 0.8 ? 1 - 0.07 * Math.sin((u - 0.55) / 0.25 * Math.PI) : 1 - 0.015 * Math.sin((u - 0.8) / 0.2 * Math.PI), ty = -(1 - bn) * 560;
  ctx.fillStyle = `rgba(8,10,24,${(ui.dim == null ? 0.55 : ui.dim) * clamp(o.t / 0.35, 0, 1)})`; ctx.fillRect(0, 0, W, H);
  // Götti stands beside the tablet and points at it, Chili cheers next to him
  const hop = Math.abs(Math.sin(o.t * 9)) * 26 * (1 - u), gx0 = -(1 - u) * 220;
  shadow(130 + gx0, 508, 60, 0.35); oGoetti(130 + gx0, 504 - hop, 1.25, !o.solved || (o.solvedT || 0) < 1.5);
  { const cj = o.solved || (o.say && o.say.who === 'chili' && o.t - o.say.at < o.say.t) ? Math.abs(Math.sin(T * 9)) * 14 : 0; shadow(52 + gx0, 510, 24, 0.3); chiliFx.joy = cj > 0 ? 1 : 0; oChili(52 + gx0, 506 - cj - hop, 0.85, T * 12, false); chiliFx.joy = 0; }
  if (o.say) { // speech bubble above Götti / Chili
    const sy = o.t - o.say.at; if (sy > 0 && sy < o.say.t) {
      const al = clamp(sy * 5, 0, 1) * clamp((o.say.t - sy) * 5, 0, 1), tx = o.say.who === 'chili' ? 56 : 120, sf = fitSize(o.say.text, 168, 20, 12); const bw = Math.min(ctx.measureText(o.say.text).width + 30, 200), bx = clamp(tx, bw / 2 + 8, 226 - bw / 2), by = 262 - (o.say.who === 'chili' ? 0 : 0);
      ctx.save(); ctx.globalAlpha = al; rr(bx - bw / 2, by - 19, bw, 38, 17); ctx.fillStyle = '#fffdf6'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke(); ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.moveTo(tx - 10, by + 17); ctx.lineTo(tx, by + 34); ctx.lineTo(tx + 10, by + 17); ctx.fill(); txt(o.say.text, bx, by + 1, sf, '#3b2410'); ctx.restore();
    }
  }
  ctx.save(); ctx.translate(o.shake > 0 ? Math.sin(T * 60) * 8 * o.shake : 0, ty);
  stoneTablet(236, 30, 700, 480, ui.wi);
  // rune medallion: dim until the riddle is solved, then it glows gold
  const rx = 296, ry = 96, glow = o.solved ? Math.min(1, o.solvedT * 3) : 0;
  if (glow > 0) { const g = ctx.createRadialGradient(rx, ry, 10, rx, ry, 70); g.addColorStop(0, `rgba(255,224,120,${0.8 * glow})`); g.addColorStop(1, 'rgba(255,224,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(rx, ry, 70, 0, Math.PI * 2); ctx.fill(); }
  if (ui.emblem) drawEmblem(ui.wi, rx, ry - 4, 29); // quiz: the theme's emblem, ringed in gold
  else {
  circle(rx, ry, 34, '#4a525e'); circle(rx, ry, 29, glow > 0 ? '#ffd34d' : '#6a7380'); ctx.strokeStyle = glow > 0 ? '#7a5400' : '#2f353e'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(rx, ry - 17); ctx.lineTo(rx, ry + 17); ctx.moveTo(rx - 14, ry - 8); ctx.lineTo(rx, ry + 2); ctx.lineTo(rx + 14, ry - 8); ctx.moveTo(rx - 11, ry + 12); ctx.lineTo(rx + 11, ry + 12); ctx.stroke();
  }
  const carve = (t, x, y, sz, al = 'left', col = '#f4ecd4') => { txt(t, x + 1.5, y + 2, sz, 'rgba(0,0,0,.55)', al); txt(t, x, y, sz, col, al); };
  const tf = fitSize(ui.title, 236, 22, 14), tw = ctx.measureText(ui.title).width + 34; // title on an engraved plaque (shrinks to stay clear of the Tipp button)
  rr(338, 61.5, tw, 38, 14); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill(); rr(338, 60, tw, 38, 14); ctx.fillStyle = 'rgba(16,20,28,.5)'; ctx.fill();
  carve(ui.title, 355, 80, tf, 'left', '#f2de9c');
  if (ui.pips) ui.pips.forEach((st, i) => { // quiz: one dot per question (gold = right first time, silver = with help, ringed = this one)
    const px = 790 + i * 26, cur = i === ui.at, gold = st === 'gold', help = st === 'help'; circle(px, 77.5, 10, 'rgba(255,255,255,.22)'); circle(px, 76, 10, '#2a3038');
    const pg = ctx.createRadialGradient(px - 2.5, 73, 1, px, 76, 8); pg.addColorStop(0, gold ? '#fff3b8' : help ? '#ffffff' : '#7d8591'); pg.addColorStop(1, gold ? '#dc9a08' : help ? '#8f9cac' : '#3b424c'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, 76, 7.6, 0, Math.PI * 2); ctx.fill();
    if (cur) { ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px, 76, 12 + Math.sin(T * 6), 0, Math.PI * 2); ctx.stroke(); }
  });
  const qf = fitText(r.q, 600, RIDDLE_Q_STEPS), qs = qf.size, ql = qf.lines, by = Math.max(236, 150 + ql.length * (qs + 6) + 14);
  { // the question sits in an engraved panel: darker stone, shadow along its top edge, a light lip below
    const qy0 = 150 - qs / 2 - 10, qh = (ql.length - 1) * (qs + 6) + qs + 20;
    rr(264, qy0 + 2, 632, qh, 16); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill(); rr(264, qy0, 632, qh, 16); ctx.fillStyle = 'rgba(14,18,26,.4)'; ctx.fill();
    ctx.save(); rr(264, qy0, 632, qh, 16); ctx.clip(); const ig = ctx.createLinearGradient(0, qy0, 0, qy0 + 16); ig.addColorStop(0, 'rgba(0,0,0,.4)'); ig.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = ig; ctx.fillRect(264, qy0, 632, 16); ctx.restore();
  }
  ql.forEach((l, i) => carve(l, 276, 150 + i * (qs + 6), qs, 'left'));
  if (!o.solved) {
    o.lock = Math.max(0, (o.lock || 0) - DT); const locked = o.lock > 0;
    o.order.forEach((ai, j) => {
      const bad = o.wrong.includes(ai), y = by + j * 74, x = 290;
      buttons.push({ x, y, w: 590, h: 62, cb: () => { if (!bad && !locked) answer(ai, o); }, label: r.a[ai] });
      answerPlate(x, y, 590, 62, r.a[ai], j, bad ? 2 : locked ? 1 : 0);
    });
    if (!o.hinted && !o.wrong.length) button('💡 Tipp', 612, 52, 146, 40, () => {
      const bads = [0, 1, 2].filter(i => i !== r.ok); o.wrong.push(bads[Math.floor(Math.random() * 2)]); o.hinted = true;
      if (!o.quiz && save.amber >= 2) { save.amber -= 2; writeSave(); } o.msg = 'Chili schnuppert: Diese Antwort stimmt nicht!'; SFX.dig();
    }, { size: 17, color: '#ffe08a' });
    if (o.msg) carve(locked ? o.msg.replace(/ \(.*\)$/, '') + ' – warte kurz …' : o.msg, 586, 486, 20, 'center', '#ffb4a8');
  } else {
    const sy = Math.max(236, 150 + (ql.length - 1) * (qs + 6) + qs / 2 + 14); // a long question pushes the answer banner down instead of being covered by it
    rr(290, sy, 590, 64, 26); ctx.fillStyle = vgrad(sy, sy + 64, '#c6f4b0', '#8fd678', '#5fb85a'); ctx.fill();
    ctx.save(); rr(290, sy, 590, 64, 26); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.34)'; ctx.fillRect(290, sy, 590, 26); ctx.restore();
    ctx.lineWidth = 3; rr(290, sy, 590, 64, 26); ctx.strokeStyle = '#2e6a22'; ctx.stroke(); rr(294, sy + 4, 582, 56, 22); ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.stroke();
    for (const [sx, sy2, ss] of [[318, sy + 14, 9], [850, sy + 48, 8], [836, sy + 10, 6]]) { const tw2 = 0.5 + 0.5 * Math.sin(T * 5 + sx); ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * tw2})`; ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rd = k % 2 ? ss * 0.28 : ss * (0.7 + 0.5 * tw2); ctx.lineTo(sx + Math.cos(a) * rd, sy2 + Math.sin(a) * rd); } ctx.closePath(); ctx.fill(); }
    txtFit('✓ ' + r.a[r.ok], 585, sy + 33, 30, '#17420f', 540);
    const wf = fitText(r.why, 610, RIDDLE_WHY_STEPS), ws = wf.size, wy = Math.max(340, sy + 90);
    wf.lines.forEach((l, i) => carve(l, 585, wy + i * (ws + 6), ws, 'center'));
    button(ui.doneLabel, 585 - 140, 424, 280, 62, ui.onDone, { size: 28, icon: icon('play') });
    if (o.pts > 0) { ctx.globalAlpha = clamp(o.solvedT * 4, 0, 1); drawAmber(770, 456, 17); carve('+' + o.pts, 796, 457, 32, 'left', '#ffe08a'); ctx.globalAlpha = 1; } // quiz: the amber this answer paid
  }
  ctx.restore();
  if (o.t < 0.6) buttons.length = b0; // no taps while the tablet is still dropping in
}
function drawOverlay() {
  const o = G.overlay, th = WORLDS[G.wi];
  if (settingsOpen && o.type === 'pause') { drawSettings(); return; }
  if (o.type === 'pause') {
    panel(280, 100, 400, 350); txt('Pause', W / 2, 155, 44, '#3b2410');
    button('Weiter spielen', 330, 200, 300, 64, () => { G.overlay = null; }, { icon: icon('play') });
    button('Einstellungen', 330, 284, 300, 56, () => { settingsOpen = true; }, { color: '#e0d2b0', size: 24, icon: icon('gear') });
    button('Zum Kalender', 330, 360, 300, 64, () => go('map'), { color: '#e0d2b0', icon: icon('home') });
  } else if (o.type === 'endover') {
    o.t += DT; panel(220, 90, 520, 360); drawPortrait('chili', W / 2, 160, 46);
    txt('Endlos-Lauf zu Ende!', W / 2, 232, 32, '#3b2410');
    txt(`${G.score} Punkte`, W / 2, 284, 46, '#c0701a');
    txt(o.isNew ? 'Neuer Rekord!' : `Rekord: ${o.prev}`, W / 2, 322, 24, o.isNew ? '#2e7d32' : '#6b4a2b');
    if (o.bonus) txt(`Tages-Bonus: +${o.bonus} Bernstein · Serie: ${o.streak} ${o.streak === 1 ? 'Tag' : 'Tage'}`, W / 2, 346, 16, '#8a5a00');
    txt(`Bernstein: +${G.amber}` + (o.rank ? `  ·  Bestenliste: Platz ${o.rank}` : ''), W / 2, 368, 20, o.rank ? '#2e7d32' : '#6b4a2b', 'center', o.rank ? 'bold' : 'normal');
    button('Nochmal!', 236, 384, 150, 54, () => { if (G.daily) startDaily(); else startLevel(G.wi, true); }, { size: 24 }); button('Bestenliste', 394, 384, 190, 54, () => { boardTab = G.daily ? 8 : G.wi; go('board'); }, { size: 22, color: '#ffe08a', icon: icon('trophy') }); button('Kalender', 592, 384, 124, 54, () => go('map'), { color: '#e0d2b0', size: 24 });
  } else if (o.type === 'retry') {
    panel(220, 110, 520, 320); drawPortrait('chili', W / 2, 180, 50, true);
    txt('Oh nein! Nicht aufgeben!', W / 2, 262, 32, '#3b2410');
    txt('Chili meint: Nochmal ab dem letzten Fähnchen!', W / 2, 300, 22, '#6b4a2b', 'center', 'normal');
    button('Nochmal!', 290, 340, 200, 62, retry, { icon: icon('loop') }); button('Kalender', 510, 340, 160, 62, () => go('map'), { color: '#e0d2b0', icon: icon('home'), size: 24 });
  } else if (o.type === 'riddle') {
    drawRiddleTablet(o, { title: 'Göttis Rätsel-Tor', wi: G.wi, doneLabel: 'Tor öffnen!', onDone: openGate });
  } else if (o.type === 'complete') {
    o.t += DT; const lv = LEVELS[G.li];
    // the reveal runs in steps (title, eggs, card, medals, amber); a tap anywhere skips ahead, and the button waits until it is over
    const nNew = G.newMedals.length, revealEnd = Math.max(1.5, G.newCard ? 1.5 : 0, nNew ? 1.5 + 0.45 * (G.newMedals[nNew - 1]) + 0.5 : 0), ready = o.t >= revealEnd;
    if (!ready) buttons.push({ x: 0, y: 0, w: W, h: H, silent: true, cb: () => { o.t = revealEnd; } });
    panel(150, 24, 660, 492);
    { const tu = clamp(o.t * 4, 0, 1), tp = tu < 1 ? 0.5 + 0.6 * tu : 1 + 0.03 * Math.sin(T * 3); ctx.save(); ctx.translate(W / 2, 70); ctx.scale(tp, tp); ctx.globalAlpha = tu; otxt(`Tür ${lv.day} geschafft!`, 0, 0, 44, '#ffd34d', '#3b1d00', 10); ctx.restore(); }
    // the day's dino card pops in (first time), flanked by the three eggs and the amber haul
    const u = G.newCard ? clamp((o.t - 1.0) * 3, 0, 1) : 1;
    if (G.newCard && u > 0 && !o.cpopped.includes(0)) { o.cpopped.push(0); SFX.egg(); burst(G.cam + W / 2, 146, 34, ['#fff3b0', '#ffd740', th.egg, th.eggSpot], 340, 500, 6, 1); }
    for (let k = 0; k < 3; k++) { // the three eggs drop in one after the other; the ones found ring a little bell
      const got = G.eggsGot[k] || save.lvE[G.li][k], eu = clamp((o.t - 0.2 - k * 0.25) * 4, 0, 1); if (eu <= 0) continue;
      if (got && !o.epopped.includes(k)) { o.epopped.push(k); [660, 784, 988][k] && tone([660, 784, 988][k], 0.2, 'triangle', 0.1); burst(G.cam + W / 2 - 290 + k * 52, 150, 8, ['#fff3b0', th.egg], 160, 300, 4, 0.5); }
      ctx.save(); ctx.translate(W / 2 - 290 + k * 52, 150 - (1 - eu) * 24); ctx.globalAlpha = eu; const ep = eu < 1 ? 0.6 + 0.4 * eu : 1; ctx.scale(ep, ep); drawEgg(0, 0, 21, got ? th.egg : '#ddd', got ? th.eggSpot : '#ccc', got ? 0.4 : 0, Math.sin(T * 3 + k) * (got ? 0.1 : 0)); ctx.restore();
    }
    ctx.globalAlpha = clamp((o.t - 0.9) * 4, 0, 1); txt(`${save.lvE[G.li].filter(Boolean).length} von 3 Eiern`, W / 2 - 238, 198, 19, '#6b4a2b', 'center', 'normal'); ctx.globalAlpha = 1;
    if (u <= 0) drawEgg(W / 2, 148, 30, th.egg, th.eggSpot, 0.6, Math.sin(T * 14) * 0.2);
    else { const sc = G.newCard ? (u < 1 ? 0.3 + u * 0.95 : 1 + 0.03 * Math.sin(T * 6)) : 1; ctx.save(); ctx.translate(W / 2, 152); ctx.rotate((hash(G.li * 3 + 1) - 0.5) * 0.08); ctx.scale(sc * 1.3, sc * 1.3); rr(-62, -46, 124, 92, 12); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.save(); ctx.translate(2, 4); ctx.fill(); ctx.restore(); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#8a6a3a'; ctx.stroke(); rr(-56, -40, 112, 62, 8); ctx.fillStyle = th.sky[1]; ctx.fill(); drawCardArt(G.li, 0, -10, 104, false); txt(FACTS[G.li].name, 0, 36, FACTS[G.li].name.length > 11 ? 14 : 17, '#2b1a00'); if (G.newCard && u >= 1) { ctx.save(); ctx.translate(46, -42); ctx.rotate(0.35); rr(-20, -10, 40, 20, 5); ctx.fillStyle = '#e53935'; ctx.fill(); txt('NEU', 0, 1, 13, '#fff'); ctx.restore(); } ctx.restore(); }
    if (u >= 1) { // the card is a door into the Dino-Buch, and its headline fact is read out right here
      const pz = 1 + 0.06 * Math.sin(T * 5); ctx.save(); ctx.translate(W / 2 - 74, 106); ctx.rotate(-0.3); ctx.scale(pz, pz); rr(-28, -10, 56, 20, 6); ctx.fillStyle = '#ffc400'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#7a4a00'; ctx.stroke(); txt('Lesen', 0, 1, 13, '#3b1d00'); ctx.restore();
      buttons.push({ x: W / 2 - 80, y: 100, w: 160, h: 128, cb: () => openBookCard(G.li) });
    }
    { const au = clamp((o.t - 0.4) / 1.1, 0, 1), shown = Math.round(G.amber * au); if (shown !== o.amberShown) { if (shown % 3 === 0 || shown === G.amber) tone(900 + 600 * au, 0.04, 'square', 0.035); o.amberShown = shown; } // the haul counts up with ticks
      const ap = au < 1 ? 1 + 0.08 * Math.sin(T * 30) : 1; ctx.save(); ctx.translate(W / 2 + 232, 150); ctx.scale(ap, ap); drawAmber(0, 0, 22); ctx.restore(); txt('+' + shown, W / 2 + 232, 192, 26, '#8a5a00'); }
    for (let k = 0; k < 3; k++) {
      const x = W / 2 - 200 + k * 200, on = save.lvM[G.li][k], isNew = G.newMedals.includes(k);
      const uu = isNew ? clamp((o.t - 1.5 - k * 0.45) * 3, 0, 1) : 1;
      if (isNew && uu > 0 && !o.popped.includes(k)) { o.popped.push(k); [784, 988, 1175, 1568].forEach((f, j) => tone(f, 0.25, 'triangle', 0.12, null, j * 0.06)); burst(G.cam + x, 250, 25, ['#ffd34d', '#fff', '#e8a317'], 300, 400, 6, 0.9); }
      const sc = isNew ? (uu < 1 ? uu * 1.35 : 1 + 0.05 * Math.sin(T * 6)) : 1;
      ctx.save(); ctx.translate(x, 262); ctx.scale(sc, sc); drawMedal(0, 0, 26, k, on && uu > 0); ctx.restore();
      txt(MEDALS[k][0], x, 308, 22, on ? '#3b2410' : '#999');
      txt(G.earned[k] ? 'geschafft!' : k === 2 ? `${G.amber} von ${Math.ceil(G.L.ambTotal * 0.8)}` : MEDALS[k][1], x, 333, 18, G.earned[k] ? '#2e7d32' : '#8a6a3a', 'center', 'normal');
      if (isNew && uu >= 1) txt('NEU!', x + 32, 232, 16, '#e53935');
    }
    if (G.newTreasure) { drawTreasure(G.L.treasure.k, W / 2 - 200, 380, 0.8); txt(TREASURES[G.L.treasure.k].name + ' gefunden!', W / 2 + 20, 384, 26, '#2e7d32'); }
    else { const tk = lv.treasure; const nextOpen = lv.day < 24 && lv.day === adventDay(); const missing = 3 - save.lvE[G.li].filter(Boolean).length;
      const msg = nextOpen && TEASERS[lv.day] ? TEASERS[lv.day] : nextOpen ? `Morgen öffnet sich Tür ${lv.day + 1} – bis dann!` : tk >= 0 && !save.treasures[tk] ? TREASURES[tk].hint : missing ? 'Chili schnuppert: Hier sind noch Eier versteckt!' : 'Super gemacht!';
      ctx.globalAlpha = clamp((o.t - 2.0) * 3, 0, 1); const ml = wrapLines(msg, 540, 22); ml.slice(0, 2).forEach((l, i) => txt(l, W / 2, 384 + i * 26 - (ml.length > 1 ? 10 : 0), 22, '#6b4a2b', 'center', 'normal')); ctx.globalAlpha = 1; }
    { const hop = Math.abs(Math.sin(T * 7)) * 16, hop2 = Math.abs(Math.sin(T * 7 + 1.2)) * 14; shadow(240, 506, 52 - hop * 0.6, 0.25); shadow(752, 506, 22, 0.25);
      oRex(240, 502 - hop, 0.55, T * 8, 0.85, Object.assign(rexLook(G.wi), { rider: true, vy: -200 }));
      chiliFx.joy = 1; oChili(752, 504 - hop2, 1.0, T * 12, true); chiliFx.joy = 0;
      if (Math.sin(T * 7) > 0.9) burst(G.cam + 250, 440, 2, ['#ffd740', '#fff', '#ff8a9a'], 140, 300, 5, 0.6); }
    if (lv.boss) { // the beaten boss, bandaged and dizzy, next to the cheering heroes
      const kk = lv.boss, bo = { dmg: 1, ko: true, wid: 'res' }; shadow(668, 508, kk === 'king' ? 62 : 48, 0.25);
      if (kk === 'crab') drawCrabKing(668, 506, 0.45, T * 2, true, bo); else if (kk === 'kraken') drawKraken(668, 506, 0.3, T * 2, true, bo); else if (kk === 'queen') drawQueen(668, 506, 0.45, T * 2, true, bo); else oRaptor(668, 506, 0.6, T * 2, true, { col: '#b01c10', dark: '#4a0a0a', crown: true, dmg: 1, ko: true, wid: 'res' });
    }
    if (ready) { const bp = Math.min(1, (o.t - revealEnd) * 4); ctx.save(); ctx.globalAlpha = bp; ctx.translate(0, (1 - bp) * 14);
      if (lv.day === 24) button('Weiter!', W / 2 - 120, 422, 240, 62, () => startEnding(), { color: '#e57373', textColor: '#fff', icon: icon('play') });
      else button('Zum Kalender', W / 2 - 130, 422, 260, 62, () => go('map'), { icon: icon('home') });
      ctx.restore(); }
  }
}
