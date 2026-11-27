'use strict';
// Character drawing. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// =====================================================================
// Character drawing
// =====================================================================
const KID = { // outfits: Oli in red with a green scarf, Fabio in yellow with a blue scarf
  oli: { pants: '#2f5aa8', knee: '#4f7ac2', scarf: '#2e9e5b', scarfD: 'rgba(15,70,35,.5)', jac: ['#f26a5e', '#e0473c', '#a82e26'], zip: '#ffd34d', pocket: 'rgba(120,20,20,.55)' },
  fabio: { pants: '#3b4f8f', knee: '#5a6eb0', scarf: '#2f8fd6', scarfD: 'rgba(15,50,100,.5)', jac: ['#ffd65c', '#f5b324', '#c2800e'], zip: '#fff4c8', pocket: 'rgba(140,80,0,.55)' },
};
function drawOli(x, y, ph, hat, o = {}) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fb = o.kid === 'fabio';
  const K = Object.assign({}, KID[o.kid || 'oli'], o.jacket != null ? JACKETS[o.jacket] : null);
  const vy = clamp((o.vy || 0) / 900, -1, 1), flutter = Math.sin(ph - 1.3) * 4.5 - vy * 8;
  // legs: thigh, knee, shin, boot - the knee swings with the stride
  const kx = x + 9 + Math.sin(ph) * 2.5, ky = y + 6, fx = x + 5 + Math.sin(ph + 0.8) * 3, fy = y + 18;
  ctx.strokeStyle = K.pants; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - 1, y - 4); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(kx - 3, ky - 1); ctx.lineTo(fx - 2, fy - 4); ctx.stroke();
  ell(kx + 0.5, ky, 3.4, 2.6, 0.3, K.knee); ctx.strokeStyle = 'rgba(20,40,90,.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(kx - 2, ky - 1); ctx.lineTo(kx + 3, ky + 1); ctx.stroke();
  ell(fx + 2, fy + 1, 5.8, 3.4, 0.1, '#5a3416'); ell(fx + 2, fy + 3.2, 6, 1.4, 0.1, '#efe6d2'); ell(fx + 0.5, fy - 0.5, 2.6, 1.2, 0.2, 'rgba(255,255,255,.28)'); ctx.strokeStyle = '#efe6d2'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(fx + 2, fy - 1.6); ctx.lineTo(fx + 4.5, fy - 0.8); ctx.moveTo(fx + 0.6, fy - 1.4); ctx.lineTo(fx + 3, fy - 0.4); ctx.stroke();
  // scarf tail streaming behind
  ctx.fillStyle = K.scarf; ctx.beginPath(); ctx.moveTo(x - 8, y - 30); ctx.quadraticCurveTo(x - 20, y - 31 + flutter * 0.5, x - 27, y - 26 + flutter); ctx.lineTo(x - 25, y - 21 + flutter); ctx.quadraticCurveTo(x - 17, y - 24 + flutter * 0.4, x - 8, y - 24); ctx.closePath(); ctx.fill();
  // torso
  rr(x - 10, y - 28, 20, 28, 7); ctx.fillStyle = hgrad(x - 10, x + 10, ...K.jac); ctx.fill();
  ctx.fillStyle = K.zip; ctx.fillRect(x - 1, y - 26, 2, 22);
  rr(x - 10, y - 6, 20, 5, 2); ctx.fillStyle = '#5a3416'; ctx.fill(); rr(x - 3, y - 6.6, 6, 6.2, 1.2); ctx.fillStyle = '#e8c04a'; ctx.fill(); ctx.strokeStyle = '#8a6a1a'; ctx.lineWidth = 0.7; ctx.stroke();
  rr(x + 3, y - 17, 6, 5, 1.4); ctx.strokeStyle = K.pocket; ctx.lineWidth = 1; ctx.stroke(); circle(x + 0.2, y - 23.5, 1.1, '#fff0b0');
  rr(x - 11, y - 32, 22, 7, 3.5); ctx.fillStyle = K.scarf; ctx.fill(); ctx.strokeStyle = K.scarfD; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - 8, y - 29.5); ctx.lineTo(x + 8, y - 29); ctx.moveTo(x - 7, y - 27.5); ctx.lineTo(x + 7, y - 27.2); ctx.stroke();
  ctx.strokeStyle = K.scarf; ctx.lineWidth = 1.4; for (let i = 0; i < 3; i++) { const py = y - 25.5 + flutter + i * 2.4; ctx.beginPath(); ctx.moveTo(x - 26 + i * 0.3, py); ctx.lineTo(x - 30 + i * 0.3, py + 1 + flutter * 0.1); ctx.stroke(); }
  if (o.front) o.front(); // whoever sits in front goes between the body and the arm, so the arm wraps round them
  // arm holding the rein (Fabio holds on to the saddle horn instead)
  const hy = y - 15 + Math.sin(ph) * 2.4 + (o.hold ? 5 : 0), hx = x + (o.hold ? 14 : 17);
  if (!o.hold) { ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(hx + 1, hy); ctx.quadraticCurveTo(x + 28, y + 4 + Math.sin(ph) * 2, x + 40, y + 1); ctx.stroke(); }
  ctx.strokeStyle = K.jac[1]; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(x + 4, y - 21); ctx.lineTo(x + 12, y - 12 + Math.sin(ph) * 1.5); ctx.lineTo(hx, hy); ctx.stroke();
  rr(hx - 4.5, hy - 4.4, 6, 5, 2); ctx.fillStyle = '#ffe9a8'; ctx.fill();
  circle(hx + 1, hy, 4, '#f4cfa6'); ell(hx + 3.4, hy - 2.4, 1.6, 1.1, 0.5, '#f4cfa6'); ctx.strokeStyle = 'rgba(160,100,60,.5)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(hx + 1, hy + 1); ctx.lineTo(hx + 4, hy + 1.4); ctx.stroke();
  // head: blond curls (back), face, ear, fringe curls, face details
  const cx = x + 2, cy = y - 40, hairD = fb ? '#d9a838' : '#c9972c', hair = fb ? '#f3d070' : '#e9c25e', hairL = fb ? '#fff0b8' : '#f8e19a';
  const curl = (px, py, r) => { circle(px, py + 1.2, r, hairD); circle(px, py, r, hair); ctx.strokeStyle = hairL; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(px - r * 0.1, py - r * 0.1, r * 0.55, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke(); };
  const capped = ['santa', 'cowboy', 'straw', 'pirate', 'chef', 'tophat', 'beanie', 'wizard', 'propeller', 'viking', 'astro'].includes(hat) || hat === true; // these hats cover the top of the head
  [[-12, -1, 5.4], [-13, -9, 5.6], [-10, -17, 5.6], [-3, -22, 5.8], [6, -21, 5.6], [12, -14, 5.2], [-9, 6, 4.2]].forEach(([dx, dy, r]) => { if (capped && dy < -9) return; curl(cx + dx, cy + dy, r); });
  circle(cx, cy, fb ? 12.6 : 11, '#f6d3b0'); if (fb) { ell(cx + 3, cy + 7, 7, 3, 0, 'rgba(255,255,255,.14)'); }
  circle(cx - 6, cy + 1, 3, '#eaba92'); circle(cx - 6, cy + 1, 1.4, '#d9a073');
  if (!capped || hat === 'astro') [[-4, -12, 4.6], [3, -14, 4.8], [10, -10, 4.2], [-10, -8, 4]].forEach(([dx, dy, r]) => curl(cx + dx, cy + dy, r));
  if (fb) { circle(cx + 5.6, cy + 1.2, 3.7, '#fff'); circle(cx + 6.3, cy + 1.4, 2.8, '#3b8fe0'); circle(cx + 6.6, cy + 1.4, 1.5, '#14283f'); circle(cx + 7.4, cy + 0.4, 1.1, '#fff'); circle(cx + 5.4, cy + 2.6, 0.6, '#fff'); } else { circle(cx + 5.5, cy + 0.5, 2.7, '#fff'); circle(cx + 6.1, cy + 0.6, 1.9, '#3b7fc4'); circle(cx + 6.3, cy + 0.6, 1, '#14283f'); circle(cx + 6.9, cy - 0.2, 0.7, '#fff'); }
  ctx.strokeStyle = '#b8862a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cx + 3, cy - 4.2); ctx.quadraticCurveTo(cx + 6, cy - 5.4, cx + 9, cy - 4); ctx.stroke();
  circle(cx + 10.6, cy + 3, 1.5, '#eeb893');
  ell(cx + 3, cy + 5, fb ? 3.6 : 2.4, fb ? 2.4 : 1.5, 0, fb ? 'rgba(255,110,110,.42)' : 'rgba(255,120,110,.3)');
  if (!fb) { ctx.fillStyle = '#d9a073'; for (const [dx, dy] of [[4, 3.6], [6.5, 4.6], [2.2, 5.2]]) circle(cx + dx, cy + dy, 0.5, '#d9a073'); }
  ctx.strokeStyle = '#b5483a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(cx + 5.5, cy + 6.4, fb ? 3.2 : 2.5, 0.3, Math.PI * 0.75); ctx.stroke();
  if (o.mood === 'cheer') { ctx.fillStyle = '#7a2018'; ctx.beginPath(); ctx.arc(cx + 5.5, cy + 5.4, fb ? 3.8 : 3.1, 0, Math.PI); ctx.closePath(); ctx.fill(); ell(cx + 5.5, cy + 7.6, fb ? 2 : 1.6, 1, 0, '#ff8f8f'); ctx.strokeStyle = '#b8862a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cx + 3, cy - 5.6); ctx.quadraticCurveTo(cx + 6, cy - 7.4, cx + 9, cy - 5.6); ctx.stroke(); } // expression pop: laughing, brows up
  else if (o.mood === 'ouch') { ell(cx + 5.5, cy + 7.2, fb ? 2.3 : 1.9, fb ? 3 : 2.5, 0, '#7a2018'); ctx.strokeStyle = '#b8862a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cx + 3, cy - 5.8); ctx.quadraticCurveTo(cx + 6, cy - 7.8, cx + 9, cy - 6.4); ctx.stroke(); circle(cx + 6.4, cy + 1.2, fb ? 2.1 : 1.6, '#fff'); circle(cx + 6.8, cy + 1.2, 0.9, '#14283f'); } // ouch: round mouth, startled eye
  // hats sit on the hairline (brim just above the eyebrows) and cover the top curls
  const HY = y - 57;
  if (capped && hat !== 'astro') { ell(x + 3, HY + 11, 13, 2.6, 0, 'rgba(60,30,10,.16)'); circle(x - 9, y - 41, 4.4, hairD); curl(x - 12, y - 41, 4.6); curl(x - 11, y - 34, 4); }
  drawHat(hat, x, HY);
  if (o.dive) { // diving mask with a strap round the head, and a snorkel
    ctx.strokeStyle = '#1f5f9a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(cx + 11, cy - 1.6); ctx.quadraticCurveTo(cx - 2, cy - 9, cx - 12, cy - 2); ctx.stroke();
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(cx - 4, cy - 3); ctx.quadraticCurveTo(cx - 14, cy - 12, cx - 12, cy - 30); ctx.stroke(); ctx.strokeStyle = '#e8a010'; ctx.lineWidth = 1.2; ctx.stroke(); rr(cx - 15.5, cy - 33.5, 6, 5, 2); ctx.fillStyle = '#e53935'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 6.8, cy + 0.6, 7.2, 5.8, 0.05, 0, 7); ctx.fillStyle = 'rgba(150,222,255,.5)'; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = '#2a8ad0'; ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = '#0f4a80'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx + 5.2, cy - 0.4, 3.4, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke(); circle(cx + 10, cy + 4, 1, 'rgba(255,255,255,.7)');
  }
}

function drawHat(hat, x, HY) {
  ctx.lineJoin = 'round';
  if (hat === 'astro') { // astronaut helmet: full bubble round the head (face shows through the visor), flag patch, blinking antenna
    const hx = x + 2, hy = HY + 16; // helmet centre = head centre
    ctx.strokeStyle = '#8a8a96'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(hx - 9, hy - 19); ctx.lineTo(hx - 12, hy - 28); ctx.stroke(); circle(hx - 12, hy - 29, 2.4, Math.sin(T * 6) > 0 ? '#ff4a3a' : '#a02820');
    ell(hx - 20, hy + 2, 3, 6, 0, '#3a6fd0'); // ear cap
    const sg = ctx.createRadialGradient(hx - 7, hy - 10, 3, hx, hy, 23); sg.addColorStop(0, '#fff'); sg.addColorStop(1, '#c3cbdd');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(hx, hy, 21, 0, Math.PI * 2); ctx.moveTo(hx + 16, hy + 1); ctx.ellipse(hx + 2.5, hy + 1, 13.5, 12.5, 0, 0, Math.PI * 2); ctx.fill('evenodd'); // shell with the visor cut out
    ctx.strokeStyle = '#8d96aa'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(hx, hy, 21, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e53935'; ctx.fillRect(hx - 18, hy - 11, 8, 2.4); ctx.fillStyle = '#fff'; ctx.fillRect(hx - 18, hy - 8.6, 8, 2.4); ctx.fillStyle = '#3a6fd0'; ctx.fillRect(hx - 18, hy - 6.2, 8, 2.4); // flag patch
    rr(hx - 15, hy + 17, 32, 6.5, 3); ctx.fillStyle = '#3a6fd0'; ctx.fill(); ctx.strokeStyle = '#1a3a80'; ctx.lineWidth = 1.2; ctx.stroke(); // neck ring
    const vg = ctx.createLinearGradient(hx - 8, hy - 12, hx + 14, hy + 14); vg.addColorStop(0, 'rgba(170,215,255,.2)'); vg.addColorStop(1, 'rgba(40,90,170,.16)'); ctx.beginPath(); ctx.ellipse(hx + 2.5, hy + 1, 13.5, 12.5, 0, 0, Math.PI * 2); ctx.fillStyle = vg; ctx.fill(); ctx.strokeStyle = '#ffc400'; ctx.lineWidth = 2.2; ctx.stroke(); // glass + gold rim
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(hx + 2.5, hy + 1, 9.6, Math.PI * 1.08, Math.PI * 1.45); ctx.stroke();
  } else if (hat === 'cowboy') {
    ell(x + 1, HY + 7, 20, 4.8, -0.06, '#7a4a22'); ctx.fillStyle = '#9a6330'; ctx.beginPath(); ctx.moveTo(x - 13, HY + 7); ctx.quadraticCurveTo(x - 14, HY - 13, x + 1, HY - 12); ctx.quadraticCurveTo(x + 16, HY - 13, x + 15, HY + 7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a3416'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 2, HY - 11); ctx.quadraticCurveTo(x + 1, HY - 6, x + 4, HY - 11); ctx.stroke(); ctx.fillStyle = '#5a3416'; ctx.fillRect(x - 13, HY + 1, 28, 3);
  } else if (hat === 'mastercrown') {
    ctx.save(); ctx.translate(x + 1, HY + 8); ctx.scale(1.35, 1.35); ctx.translate(-(x + 1), -(HY + 8));
    const mg = ctx.createRadialGradient(x + 1, HY - 4, 2, x + 1, HY - 4, 26); mg.addColorStop(0, `rgba(255,240,150,${0.55 + 0.2 * Math.sin(T * 4)})`); mg.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(x + 1, HY - 4, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(x - 13, HY + 8); ctx.lineTo(x - 15, HY - 9); ctx.lineTo(x - 8, HY - 2); ctx.lineTo(x - 3, HY - 12); ctx.lineTo(x + 1, HY - 3); ctx.lineTo(x + 5, HY - 12); ctx.lineTo(x + 10, HY - 2); ctx.lineTo(x + 17, HY - 9); ctx.lineTo(x + 15, HY + 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#e8a317'; ctx.fillRect(x - 13, HY + 4, 29, 4);
    circle(x + 1, HY + 1, 2.6, '#40c4ff'); circle(x - 7, HY + 3, 1.8, '#e53935'); circle(x + 9, HY + 3, 1.8, '#69f0ae'); for (const [px, py] of [[x - 15, HY - 9], [x - 3, HY - 12], [x + 5, HY - 12], [x + 17, HY - 9]]) circle(px, py, 2.3, '#fff'); drawStar(x + 1, HY - 17, 3.8, '#fff'); ctx.restore();
  } else if (hat === 'viking') { // viking helmet: steel dome, riveted band, two curved horns
    for (const sx of [-1, 1]) { ctx.fillStyle = '#efe0b0'; ctx.beginPath(); ctx.moveTo(x + 1 + sx * 8, HY - 4); ctx.lineTo(x + 1 + sx * 14, HY + 5); ctx.quadraticCurveTo(x + 1 + sx * 24, HY + 1, x + 1 + sx * 19, HY - 21); ctx.quadraticCurveTo(x + 1 + sx * 15, HY - 8, x + 1 + sx * 8, HY - 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a89868'; ctx.lineWidth = 1.3; ctx.stroke(); }
    ctx.fillStyle = '#aab3c4'; ctx.beginPath(); ctx.moveTo(x - 15, HY + 9); ctx.bezierCurveTo(x - 17, HY - 8, x - 6, HY - 14, x + 2, HY - 13); ctx.bezierCurveTo(x + 14, HY - 13, x + 18, HY - 3, x + 17, HY + 9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#5a6478'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 8, HY - 4); ctx.quadraticCurveTo(x - 6, HY - 10, x + 1, HY - 10); ctx.stroke();
    rr(x - 16, HY + 3, 34, 7, 3); ctx.fillStyle = '#7a8296'; ctx.fill(); ctx.strokeStyle = '#4a5266'; ctx.lineWidth = 1.2; ctx.stroke(); for (const dx of [-11, -4, 3, 10, 16]) circle(x + dx, HY + 6.5, 1.1, '#e8c860');
  } else if (hat === 'straw') {
    ell(x + 1, HY + 8, 23, 5.2, -0.05, '#e0b85c'); ctx.fillStyle = '#f2d98c'; ctx.beginPath(); ctx.moveTo(x - 12, HY + 7); ctx.quadraticCurveTo(x - 13, HY - 10, x + 1, HY - 9); ctx.quadraticCurveTo(x + 15, HY - 10, x + 14, HY + 7); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = '#d63a3a'; ctx.fillRect(x - 14, HY + 1, 30, 4); ctx.strokeStyle = 'rgba(150,110,40,.55)'; ctx.lineWidth = 1; for (let i = -9; i < 12; i += 4) { ctx.beginPath(); ctx.moveTo(x + i, HY - 9); ctx.lineTo(x + i, HY + 1); ctx.stroke(); } ctx.restore(); // weave and band stay inside the crown
    ctx.strokeStyle = '#8a6a20'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 12, HY + 7); ctx.quadraticCurveTo(x - 13, HY - 10, x + 1, HY - 9); ctx.quadraticCurveTo(x + 15, HY - 10, x + 14, HY + 7); ctx.closePath(); ctx.stroke();
  } else if (hat === 'pirate') {
    ctx.fillStyle = '#23232e'; ctx.beginPath(); ctx.moveTo(x - 21, HY + 9); ctx.quadraticCurveTo(x - 17, HY - 13, x + 1, HY - 9); ctx.quadraticCurveTo(x + 19, HY - 13, x + 23, HY + 9); ctx.quadraticCurveTo(x + 1, HY + 3, x - 21, HY + 9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 1.6; ctx.stroke();
    circle(x + 1, HY - 2, 3.2, '#fff'); ctx.fillStyle = '#23232e'; circle(x, HY - 2.5, 0.8, '#23232e'); circle(x + 2.4, HY - 2.5, 0.8, '#23232e'); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - 5, HY + 2); ctx.lineTo(x + 7, HY + 6); ctx.moveTo(x + 7, HY + 2); ctx.lineTo(x - 5, HY + 6); ctx.stroke();
  } else if (hat === 'goggles') {
    rr(x - 15, HY + 3, 33, 5, 2.5); ctx.fillStyle = '#2a7fd0'; ctx.fill(); for (const dx of [-5, 8]) { circle(x + dx, HY + 5, 6.4, '#1a4a8a'); circle(x + dx, HY + 5, 4.8, '#bfeaff'); circle(x + dx - 1.2, HY + 3.8, 1.4, '#fff'); }
  } else if (hat === 'chef') {
    ctx.fillStyle = '#fff'; for (const [dx, dy, r] of [[-7, -10, 7], [1, -15, 8], [9, -10, 7]]) circle(x + dx, HY + dy, r, '#fff'); rr(x - 12, HY - 8, 26, 17, 3); ctx.fill(); ctx.strokeStyle = '#b8b8c0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 12, HY + 6); ctx.lineTo(x + 14, HY + 6); ctx.moveTo(x - 4, HY - 6); ctx.lineTo(x - 4, HY + 5); ctx.moveTo(x + 6, HY - 6); ctx.lineTo(x + 6, HY + 5); ctx.stroke();
  } else if (hat === 'tophat') {
    ell(x + 1, HY + 8, 17, 4.4, -0.03, '#15151c'); rr(x - 9, HY - 20, 21, 27, 2); ctx.fillStyle = '#23232e'; ctx.fill(); ctx.fillStyle = '#d63a3a'; ctx.fillRect(x - 9, HY + 1, 21, 4); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 6, HY - 18); ctx.lineTo(x - 6, HY); ctx.stroke();
  } else if (hat === 'beanie') {
    ctx.fillStyle = '#3a6fd0'; ctx.beginPath(); ctx.moveTo(x - 16, HY + 9); ctx.bezierCurveTo(x - 18, HY - 9, x - 6, HY - 17, x + 2, HY - 16); ctx.bezierCurveTo(x + 14, HY - 15, x + 18, HY - 2, x + 18, HY + 9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#1a3a80'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 10, HY - 8); ctx.quadraticCurveTo(x, HY - 14, x + 12, HY - 6); ctx.stroke(); rr(x - 17, HY + 4, 36, 8, 4); ctx.fillStyle = '#e8eefc'; ctx.fill(); ctx.stroke(); circle(x + 1, HY - 17, 5, '#fff');
  } else if (hat === 'wizard') {
    ell(x + 1, HY + 8, 21, 4.6, -0.04, '#4a2a8a'); ctx.fillStyle = '#5a35a8'; ctx.beginPath(); ctx.moveTo(x - 14, HY + 8); ctx.quadraticCurveTo(x - 4, HY - 8, x + 4, HY - 32); ctx.quadraticCurveTo(x + 8, HY - 8, x + 17, HY + 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2a1260'; ctx.lineWidth = 1.5; ctx.stroke();
    drawStar(x + 3, HY - 10, 4, '#ffd34d'); drawStar(x - 3, HY - 1, 2.8, '#ffd34d'); drawStar(x + 8, HY - 2, 2.4, '#fff3b0'); ctx.fillStyle = '#ffd34d'; ctx.fillRect(x - 13, HY + 4, 30, 2.6);
  } else if (hat === 'propeller') {
    const dome = () => { ctx.beginPath(); ctx.moveTo(x - 14, HY + 8); ctx.quadraticCurveTo(x - 15, HY - 7, x + 1, HY - 8); ctx.quadraticCurveTo(x + 17, HY - 7, x + 16, HY + 8); ctx.closePath(); };
    ctx.fillStyle = '#e53935'; dome(); ctx.fill();
    ctx.save(); dome(); ctx.clip(); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(x + 1, HY - 9); ctx.quadraticCurveTo(x - 6, HY - 6, x - 10, HY + 9); ctx.lineTo(x - 2, HY + 9); ctx.quadraticCurveTo(x - 1, HY - 2, x + 1, HY - 9); ctx.fill(); ctx.fillStyle = '#3a8ae0'; ctx.fillRect(x + 4, HY - 10, 8, 20); ctx.restore(); // panels stay inside the dome
    dome(); ctx.strokeStyle = '#7a1210'; ctx.lineWidth = 1.5; ctx.stroke();
    const bw = Math.sin(T * 26) * 15; circle(x + 1, HY - 9, 2.6, '#444'); ell(x + 1, HY - 10, Math.abs(bw) + 3, 2.2, 0, '#e8e8f0');
  } else if (hat === 'antlers') {
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (const sx of [-1, 1]) { const bx = x + 1 + sx * 8; ctx.beginPath(); ctx.moveTo(bx, HY + 4); ctx.quadraticCurveTo(bx + sx * 6, HY - 6, bx + sx * 6, HY - 18); ctx.moveTo(bx + sx * 3, HY - 4); ctx.lineTo(bx + sx * 11, HY - 9); ctx.moveTo(bx + sx * 6, HY - 12); ctx.lineTo(bx + sx * 12, HY - 16); ctx.stroke(); }
  } else if (hat === 'halo') {
    ctx.save(); const g = ctx.createRadialGradient(x + 1, HY - 14, 4, x + 1, HY - 14, 22); g.addColorStop(0, 'rgba(255,240,150,.7)'); g.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 1, HY - 14, 22, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.ellipse(x + 1, HY - 14 + Math.sin(T * 3) * 1.2, 13, 4.2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  } else if (hat) { // santa cap
    ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(x - 17, HY + 9); ctx.bezierCurveTo(x - 19, HY - 9, x - 5, HY - 18, x + 3, HY - 17); ctx.bezierCurveTo(x + 15, HY - 16, x + 19, HY - 2, x + 19, HY + 9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 3, HY - 15); ctx.quadraticCurveTo(x - 16, HY - 26, x - 22, HY - 12); ctx.lineTo(x - 15, HY - 8); ctx.quadraticCurveTo(x - 12, HY - 17, x + 2, HY - 11); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(x + 1, HY + 5); ctx.rotate(-0.06); rr(-20, -4, 41, 10, 5); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    circle(x - 22, HY - 12, 4.6, '#fff');
  }
}

function rexLeg(x, ph, col, dark, air, claw) {
  const sw = air ? 0.7 : Math.sin(ph), lift = air ? 6 : Math.max(0, Math.cos(ph)) * 10;
  ell(x - 4, -48, 17, 24, 0.25, col);
  const ax = x + sw * 14, ay = -10 - lift;
  ctx.lineCap = 'round';
  ctx.strokeStyle = col; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x + 4, -32); ctx.lineTo(ax, ay); ctx.stroke();
  ctx.strokeStyle = dark; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 16, ay + 8); ctx.stroke();
  if (claw) { ctx.fillStyle = '#f3ead2'; for (const d of [0, 4]) { ctx.beginPath(); ctx.moveTo(ax + 15 - d, ay + 4 + d * 0.5); ctx.lineTo(ax + 24 - d, ay + 10 + d * 0.5); ctx.lineTo(ax + 14 - d, ay + 10 + d * 0.5); ctx.fill(); } }
}
function rexCrouchLeg(x, col, dark) {
  ell(x - 6, -17, 21, 13, 0.12, col);
  ctx.lineCap = 'round'; ctx.strokeStyle = dark; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x + 2, -6); ctx.lineTo(x + 22, -3); ctx.stroke();
  ctx.fillStyle = '#f3ead2'; for (const d of [0, 4]) { ctx.beginPath(); ctx.moveTo(x + 21 - d, -6 + d * 0.3); ctx.lineTo(x + 30 - d, -1 + d * 0.3); ctx.lineTo(x + 20 - d, 0); ctx.fill(); }
}
const DUCK_DY = 36, DUCK_ROT = 0.1;
// mouth tip relative to the rex's feet (unscaled), honouring the crouch
function rexMouth(duck) {
  const lx = 116, ly = -98;
  if (!duck) return [lx, ly];
  const c = Math.cos(DUCK_ROT), sn = Math.sin(DUCK_ROT);
  return [lx * c - ly * sn, lx * sn + ly * c + DUCK_DY];
}
const RIDER_SCALE_DUCK = 1.2; // the crouched pose is rotated forward, so the boys stay smaller there or their heads poke out past Rex's snout
const RIDER_SCALE = 1.42; // Oli and Fabio on Rex's back (was 1.15): faces and reactions have to read on a tablet
function drawRex(x, y, s, ph, jaw, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(o.flip ? -s : s, s);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  const gold = o.rainbow === 'gold', rbH = gold ? 44 + 5 * Math.sin(T * 3) : o.rainbow ? (T * 60) % 360 : 0, b0 = gold ? hslHex(rbH, 95, 56 + 9 * Math.sin(T * 4)) : o.rainbow ? hslHex(rbH, 68, 52) : (o.body || '#2f9e5f'), d0 = gold ? hslHex(rbH, 85, 36) : o.rainbow ? hslHex(rbH, 68, 34) : (o.dark || '#1f7442'), belly0 = o.belly || '#f3e3a8', plate = o.spike || '#eaa43c';
  const vyn = clamp((o.vy || 0) / 900, -1, 1), hurt = o.hurt || 0;
  if (hurt > 0) { jaw = Math.max(jaw, 0.3 * hurt); ctx.rotate(Math.sin(T * 45) * 0.045 * hurt - 0.07 * hurt); } // ouch: wobble, open mouth
  const sq = (o.sq || 0) - 0.012 * Math.sin(T * 2.2); // + squash, - stretch, plus breathing
  ctx.scale(1 + sq * 0.8, 1 - sq);
  const body = vgrad(-125, -30, shade(b0, 1.32), b0, shade(b0, 0.66)), dark = vgrad(-80, 0, d0, shade(d0, 0.6)), belly = vgrad(-66, -40, shade(belly0, 1.08), shade(belly0, 0.92));
  ctx.translate(0, o.air ? 0 : -Math.abs(Math.sin(ph)) * 3);
  if (o.duck) { rexCrouchLeg(-12, dark, '#12482a'); ctx.translate(0, DUCK_DY); ctx.rotate(DUCK_ROT); }
  else { if (o.stomp) ctx.scale(0.95, 1.06); rexLeg(-6, ph + Math.PI, dark, '#12482a', o.air, true); }
  const tw = Math.sin(ph * 0.5 - 0.9) * 5 - vyn * 8; // tail lags the body and lifts when falling
  // tail: thick at the hips, tapering to a tip
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-14, -90); ctx.bezierCurveTo(-60, -92, -100, -80, -132, -58 + tw); ctx.bezierCurveTo(-100, -60, -60, -46, -14, -40); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.moveTo(-14, -90); ctx.bezierCurveTo(-60, -92, -100, -80, -132, -58 + tw); ctx.bezierCurveTo(-100, -60, -60, -46, -14, -40); ctx.closePath(); ctx.clip(); ctx.fillStyle = 'rgba(15,70,38,.26)'; for (let i = 0; i < 4; i++) { const bx = -46 - i * 20; ctx.beginPath(); ctx.moveTo(bx, -100); ctx.lineTo(bx + 7, -100); ctx.lineTo(bx + 3 + i * 0.4, -36 + tw * 0.3); ctx.lineTo(bx - 4 + i * 0.4, -36 + tw * 0.3); ctx.fill(); } ctx.restore();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.moveTo(-14, -42); ctx.bezierCurveTo(-60, -48, -100, -60, -126, -57 + tw); ctx.bezierCurveTo(-100, -56, -60, -42, -14, -38); ctx.closePath(); ctx.fill();
  // dorsal plates: amber rounded fins that follow the spine
  ctx.fillStyle = plate; ctx.strokeStyle = shade(plate, 0.6); ctx.lineWidth = 1.5;
  const bz = t => { const u = 1 - t; return [u * u * u * -14 + 3 * u * u * t * -60 + 3 * u * t * t * -100 + t * t * t * -132, u * u * u * -90 + 3 * u * u * t * -92 + 3 * u * t * t * -80 + t * t * t * (-58 + tw)]; };
  (o.noPlates ? [] : [[30, -101, 8], [14, -99, 9.5], [-4, -96, 10.5], [-22, -92, 10], [-40, -87, 9], ...[[0.34, 8], [0.42, 7.4], [0.5, 6.8], [0.58, 6.1], [0.66, 5.4], [0.74, 4.7], [0.82, 4], [0.9, 3.2]].map(([t, z]) => { const [qx, qy] = bz(t); return [qx, qy + 5.5, z, true]; })]).forEach(([px, py, sz, tl], i) => { const ty = py + (tl ? 0 : px < -50 ? tw * 0.4 : 0) + Math.sin(ph * 0.5 - 0.5 + i * 0.4) * 0.8; ctx.beginPath(); ctx.moveTo(px - sz * 0.9, ty + 5); ctx.quadraticCurveTo(px - sz * 0.5, ty - sz * 1.2, px + sz * 0.2, ty - sz * 1.45); ctx.quadraticCurveTo(px + sz * 0.8, ty - sz * 0.6, px + sz * 0.9, ty + 5); ctx.closePath(); ctx.fill(); ctx.stroke(); });
  // torso + chest + belly
  ell(4, -66, 46, 29, -0.18, body);
  ell(24, -68, 28, 28, 0, body);
  ctx.strokeStyle = 'rgba(255,255,225,.5)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(4, -66, 42, 26, -0.18, Math.PI * 1.12, Math.PI * 1.72); ctx.stroke();
  ell(16, -52, 33, 13, -0.22, belly);
  ctx.fillStyle = shade(d0, 0.8); ctx.globalAlpha = 0.3; for (const [qx, qy, qr] of [[-16, -78, 4.2], [-2, -84, 3.4], [10, -80, 3], [-26, -66, 3.6], [-8, -70, 2.6], [20, -72, 2.4], [38, -70, 2.8]]) circle(qx, qy, qr, ctx.fillStyle); ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,225,.18)'; ctx.lineWidth = 1.2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(46 + i * 4, -100 + i * 5, 4, Math.PI * 0.9, Math.PI * 1.9); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(4 + i * 9, -55 + i * 1.5); ctx.lineTo(8 + i * 9, -47 + i * 1.5); ctx.stroke(); }
  // back stripes
  ctx.strokeStyle = 'rgba(15,70,38,.35)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-26 + i * 15, -88 + i * 1.5); ctx.quadraticCurveTo(-24 + i * 15, -80, -28 + i * 15 + 4, -72); ctx.stroke(); }
  ell(-8, -84, 26, 6, -0.12, 'rgba(255,255,255,.16)');
  const ring = front => { ctx.save(); ctx.translate(40, -82); ctx.rotate(0.6); ctx.lineCap = 'butt'; const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : Math.PI * 2; ctx.strokeStyle = '#2a1c14'; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(0, 0, 21, 8, 0, a0, a1); ctx.stroke(); ctx.strokeStyle = front ? '#ff5a4a' : '#c0392b'; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.setLineDash([9, 12]); ctx.stroke(); ctx.setLineDash([]); if (front) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -1.5, 19, 6, 0, 0.5, 1.8); ctx.stroke(); } ctx.restore(); };
  if (o.dive) ring(false);
  // neck
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(18, -92); ctx.bezierCurveTo(32, -112, 48, -116, 62, -108); ctx.lineTo(64, -80); ctx.bezierCurveTo(48, -66, 34, -58, 24, -54); ctx.closePath(); ctx.fill();
  if (o.dive) ring(true);
  // lower jaw, hinged at the cheek
  ctx.save(); ctx.translate(62, jaw < 0.12 ? -94.5 : -92); ctx.rotate(jaw * 0.55);
  if (jaw > 0.05) { ctx.fillStyle = '#7d1c2c'; ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(28, -6, 50, 1); ctx.lineTo(44, 12); ctx.lineTo(0, 13); ctx.fill(); ell(24, 7, 13, 3.6, 0, '#e8627e'); }
  ctx.fillStyle = shade(b0, 0.82); ctx.beginPath(); ctx.moveTo(-2, 0); ctx.quadraticCurveTo(28, 1, 50, 3); ctx.quadraticCurveTo(54, 14, 40, 16); ctx.lineTo(4, 16); ctx.quadraticCurveTo(-6, 9, -2, 0); ctx.fill();
  ctx.fillStyle = shade(belly0, 0.96); ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(42, 12); ctx.quadraticCurveTo(40, 16, 34, 16); ctx.lineTo(4, 16); ctx.fill();
  if (jaw > 0.12) { ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(14 + i * 8, 2); ctx.lineTo(17 + i * 8, -4); ctx.lineTo(20 + i * 8, 2); ctx.fill(); } }
  ctx.restore();
  // head: rounded skull, brow bump, wedge snout
  ctx.fillStyle = vgrad(-130, -86, shade(b0, 1.42), b0, shade(b0, 0.82));
  ctx.beginPath(); ctx.moveTo(42, -104); ctx.bezierCurveTo(44, -126, 62, -134, 80, -128); ctx.bezierCurveTo(94, -124, 104, -118, 116, -110); ctx.bezierCurveTo(124, -105, 122, -96, 112, -93); ctx.lineTo(66, -90); ctx.bezierCurveTo(48, -90, 40, -96, 42, -104); ctx.closePath(); ctx.fill();
  ell(76, -121, 13, 2.6, -0.1, 'rgba(255,255,255,.28)');
  // upper teeth (always a few, fierce but cute)
  ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const tx = 70 + i * 8, ty = -92 - i * 0.5; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 3.2, ty + (jaw > 0.12 ? 7 : 5)); ctx.lineTo(tx + 6.4, ty); ctx.fill(); }
  // mouth line, nostril, cheek
  if (jaw <= 0.12) { ctx.strokeStyle = 'rgba(12,60,36,.38)'; ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(64, -92.5); ctx.quadraticCurveTo(92, -90, 111, -97.5); ctx.stroke(); }
  circle(112, -108, 2.4, shade(d0, 0.55)); ell(80, -98, 7.5, 4.2, 0, 'rgba(240,128,104,.8)'); ell(78, -99.5, 3, 1.4, 0, 'rgba(255,190,170,.6)'); ctx.fillStyle = 'rgba(255,255,255,.22)'; for (const [qx, qy] of [[96, -112], [102, -108], [90, -114], [100, -101], [106, -104]]) circle(qx, qy, 1.1, ctx.fillStyle);
  // brow ridge + big eye
  ctx.fillStyle = shade(b0, 0.7); ctx.beginPath(); ctx.moveTo(56, -119); ctx.quadraticCurveTo(72, -128, 92, -118); ctx.quadraticCurveTo(76, -119, 58, -113); ctx.closePath(); ctx.fill();
  const blink = (T % 3.6) < 0.12 || jaw > 0.55 || hurt > 0.3;
  if (blink) { ctx.strokeStyle = '#17331f'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(74, -111, 7.5, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke(); }
  else { circle(74, -111, 9.5, '#fff'); circle(76, -110, 6.2, '#e8a317'); circle(77, -110, 3.8, '#17120c'); circle(78.8, -113, 2.1, '#fff'); circle(74.5, -106.5, 1, '#fff'); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(74, -111, 9.5, 0, Math.PI * 2); ctx.stroke(); }
  // little arm with claws
  ctx.strokeStyle = shade(b0, 0.82); ctx.lineWidth = 7.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(32, -68); ctx.lineTo(43, -57 + Math.sin(ph) * 2); ctx.lineTo(52, -62); ctx.stroke();
  ctx.fillStyle = '#f3ead2'; for (const d of [-3, 2]) { ctx.beginPath(); ctx.moveTo(51, -64 + d); ctx.lineTo(58, -61 + d); ctx.lineTo(51, -59 + d); ctx.fill(); }
  if (o.duck) { ctx.save(); ctx.rotate(-DUCK_ROT); ctx.translate(0, -DUCK_DY); rexCrouchLeg(10, body, dark); ctx.restore(); }
  else { rexLeg(6, ph, body, dark, o.air, true); ell(-2, -56, 7, 10, 0.25, 'rgba(255,255,255,.16)'); }
  if (o.fire) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fl = 0.55 + 0.35 * Math.sin(T * 17) + 0.1 * Math.sin(T * 41), fc = fireOf(save.equip.fire || 0); const g = ctx.createRadialGradient(108, -96, 2, 108, -96, 40); g.addColorStop(0, `rgba(255,255,255,${0.6 * fl})`); g.addColorStop(0.3, `rgba(${fc.a},${fl})`); g.addColorStop(1, `rgba(${fc.b},0)`); ctx.fillStyle = g; ctx.fillRect(68, -136, 80, 80); ell(104, -96, 22, 2.6 + jaw * 6, 0.02, `rgba(${fc.a},${fl})`); ctx.restore(); }
  if (o.rider) {
    rr(-24, -96, 48, 11, 5); ctx.fillStyle = '#c0392b'; ctx.fill(); ctx.fillStyle = '#f4c542'; ctx.fillRect(-22, -87, 34, 2.5); ctx.strokeStyle = 'rgba(255,230,180,.6)'; ctx.lineWidth = 0.9; ctx.setLineDash([3, 2.5]); ctx.beginPath(); ctx.moveTo(-20, -93); ctx.lineTo(10, -93); ctx.stroke(); ctx.setLineDash([]);
    const lean = o.duck ? 0 : (o.lean || 0) + (o.air ? (vyn < 0 ? 0.12 : -0.08) : 0) - (jaw > 0.5 ? 0.16 : 0) - hurt * 0.3;
    ctx.save(); if (o.duck) { ctx.translate(-4, -86); ctx.rotate(0.9); } else { ctx.translate(-4, -92); ctx.rotate(lean); } const rs = o.duck ? RIDER_SCALE_DUCK : RIDER_SCALE; ctx.scale(rs, rs);
    // Fabio sits in front of Oli, smaller; Oli's rein arm wraps round him
    const mood = hurt > 0.3 ? 'ouch' : (jaw > 0.5 || o.joy) ? 'cheer' : null; // the boys react: ouch on a hit, laughing on a roar or a find
    const fab = () => { ctx.save(); ctx.translate(27, 11); ctx.scale(0.72, 0.72); drawOli(0, 0, ph + 0.6, o.hat2 !== undefined ? o.hat2 : o.hat, { vy: o.vy, dive: o.dive, kid: 'fabio', hold: true, mood, jacket: save.equip.fabioJacket }); ctx.restore(); };
    drawOli(0, 0, ph, o.hat, { vy: o.vy, dive: o.dive, mood, front: fab, jacket: save.equip.jacket }); ctx.restore();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawRaptor(x, y, s, ph, flip, o = {}) {
  const c0 = o.col || '#b0653a', dark = o.dark || '#6a3418', boss = !!o.crown, feather = o.fea || (boss ? '#ffb02e' : '#f2a43a'), belly = o.belly || (boss ? '#e8b69a' : '#f2dcae');
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  if (o.alpha != null) ctx.globalAlpha = Math.max(0, o.alpha);
  const col = vgrad(-100, -20, shade(c0, 1.35), c0, shade(c0, 0.62));
  ctx.translate(0, -Math.abs(Math.sin(ph)) * 2);
  const tw = Math.sin(ph * 0.5 - 0.8) * 4;
  // legs: thick thigh, knee, shin, three-toed foot with a raised sickle claw
  const leg = (p, c, back) => {
    const sw = Math.sin(p), lift = Math.max(0, Math.cos(p)) * 7;
    const kx = 9 + sw * 8, ky = -22 - lift * 0.3, ax = -6 + sw * 13, ay = -7 - lift;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = c; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-2, -38); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(ax, ay); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 14, ay + 6); ctx.stroke();
    ctx.fillStyle = '#fff3d6'; for (const d of [0, 5]) { ctx.beginPath(); ctx.moveTo(ax + 12 + d * 0.4, ay + 3 + d * 0.3); ctx.lineTo(ax + 21 + d * 0.4, ay + 8 + d * 0.3); ctx.lineTo(ax + 12 + d * 0.4, ay + 9 + d * 0.3); ctx.fill(); }
    if (!back) { ctx.fillStyle = '#ffd9a0'; ctx.beginPath(); ctx.moveTo(ax + 1, ay - 1); ctx.quadraticCurveTo(ax + 10, ay - 4, ax + 9, ay + 6); ctx.lineTo(ax + 4, ay + 2); ctx.fill(); }
  };
  leg(ph + Math.PI, dark, true);
  // tail with a feather fan at the tip
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-12, -64); ctx.bezierCurveTo(-40, -68, -70, -62, -92, -64 + tw); ctx.bezierCurveTo(-70, -52, -40, -44, -12, -40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = feather; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-86, -64 + tw); ctx.quadraticCurveTo(-104, -64 + tw + i * 8, -112, -64 + tw + i * 15); ctx.quadraticCurveTo(-98, -61 + tw + i * 8, -86, -62 + tw); ctx.fill(); }
  // torso, belly, stripes
  ell(2, -49, 29, 18, -0.22, col); ell(9, -42, 20, 8, -0.22, belly);
  ctx.strokeStyle = dark; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-18 + i * 9, -62 + i * 1.2); ctx.lineTo(-14 + i * 9, -52 + i * 1.2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,.16)'; for (const [qx, qy, qr] of [[-10, -46, 3.2], [-2, -52, 2.6], [-16, -54, 2.2], [6, -56, 2.4]]) circle(qx, qy, qr, ctx.fillStyle);
  ctx.strokeStyle = feather; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(16 + i * 5, -74 - i * 2.6); ctx.quadraticCurveTo(10 + i * 5, -82 - i * 2.6 - 4, 6 + i * 5, -80 - i * 2.6 - 7); ctx.stroke(); }
  if (boss) { ctx.fillStyle = '#5a0e0e'; for (let i = 0; i < 6; i++) { const px = -30 + i * 11; ctx.beginPath(); ctx.moveTo(px - 5, -62 - i * 0.6); ctx.lineTo(px, -74 - i * 0.6); ctx.lineTo(px + 5, -62 - i * 0.6); ctx.fill(); } ctx.strokeStyle = 'rgba(255,230,200,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -58); ctx.lineTo(8, -40); ctx.moveTo(-1, -59); ctx.lineTo(13, -41); ctx.stroke(); }
  // neck and head: big wedge head with a real snout
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(14, -60); ctx.bezierCurveTo(20, -78, 30, -84, 40, -84); ctx.lineTo(46, -62); ctx.bezierCurveTo(36, -54, 26, -46, 18, -42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = vgrad(-100, -62, shade(c0, 1.4), c0, shade(c0, 0.75));
  ctx.beginPath(); ctx.moveTo(30, -86); ctx.bezierCurveTo(32, -99, 48, -103, 58, -96); ctx.bezierCurveTo(66, -91, 74, -86, 80, -79); ctx.bezierCurveTo(84, -74, 80, -67, 71, -67); ctx.lineTo(42, -66); ctx.bezierCurveTo(33, -68, 28, -77, 30, -86); ctx.closePath(); ctx.fill();
  ell(50, -62, 22, 5, 0.05, shade(c0, 0.8)); // lower jaw
  ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const tx = 50 + i * 5.6; ctx.beginPath(); ctx.moveTo(tx, -66.5); ctx.lineTo(tx + 2.6, -61.5); ctx.lineTo(tx + 5.2, -66.5); ctx.fill(); }
  circle(76, -79, 1.8, shade(dark, 0.7)); // nostril
  // crest feathers
  ctx.fillStyle = feather; for (const [dx, an, ln] of [[0, -0.4, 22], [5, -0.15, 26], [10, 0.1, 21]]) { ctx.save(); ctx.translate(38 + dx, -98); ctx.rotate(an - 0.35); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(-1, -ln * 0.6, 1, -ln); ctx.quadraticCurveTo(4, -ln * 0.5, 4, 0); ctx.fill(); ctx.restore(); }
  // eye: big, with a slit pupil, and an angry brow
  circle(52, -85, 6.4, '#fff'); circle(53, -85, 4.6, boss ? '#ff5a3a' : '#ffd23a'); ell(53.6, -85, 1.5, 3.6, 0, '#14100c'); circle(51.4, -87.4, 1.4, '#fff');
  ctx.strokeStyle = dark; ctx.lineWidth = boss ? 4 : 3.2; ctx.beginPath(); ctx.moveTo(43, -95); ctx.lineTo(60, -88); ctx.stroke();
  // little arms with claws
  ctx.strokeStyle = dark; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(24, -52); ctx.lineTo(33, -44); ctx.lineTo(41, -48); ctx.stroke();
  ctx.strokeStyle = feather; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(26 + i * 4, -50 + i * 2.4); ctx.lineTo(19 + i * 3, -44 + i * 2.8); ctx.stroke(); }
  ctx.strokeStyle = shade(dark, 0.7); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(62, -74); ctx.quadraticCurveTo(66, -78, 70, -73); ctx.stroke();
  if (boss) { ctx.strokeStyle = 'rgba(255,235,210,.85)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(60, -95); ctx.lineTo(67, -80); ctx.moveTo(63, -96); ctx.lineTo(69, -83); ctx.stroke(); ctx.save(); ctx.translate(21, -55); ctx.scale(0.8, 0.8); ctx.fillStyle = vgrad(-10, 8, '#6a6a76', '#2c2c36'); ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, -0.3, 0, 7); ctx.fill(); ctx.strokeStyle = '#14141a'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.fillStyle = '#9a9aa8'; for (const [sx2, sy2, a2] of [[-6, -6, -0.9], [0, -9, -0.2], [7, -6, 0.5]]) { ctx.beginPath(); ctx.moveTo(sx2 - 2.4, sy2 + 2); ctx.lineTo(sx2 + a2 * 3, sy2 - 8); ctx.lineTo(sx2 + 2.4, sy2 + 2); ctx.fill(); } for (const rx of [-5, 0, 5]) circle(rx, 1, 1, '#d0d0dc'); ctx.restore(); }
  ctx.fillStyle = '#fff3d6'; for (const d of [-2, 2]) { ctx.beginPath(); ctx.moveTo(40, -50 + d); ctx.lineTo(46, -47 + d); ctx.lineTo(40, -45 + d); ctx.fill(); }
  leg(ph, col, false);
  if (boss) { // golden crown with gems
    ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(33, -100); ctx.lineTo(32, -116); ctx.lineTo(40, -108); ctx.lineTo(46, -120); ctx.lineTo(52, -108); ctx.lineTo(60, -116); ctx.lineTo(59, -99); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07800'; ctx.lineWidth = 1.6; ctx.stroke();
    circle(46, -105, 2.6, '#e53935'); circle(38, -104, 1.8, '#40c4ff'); circle(54, -104, 1.8, '#69f0ae');
  }
  if (boss && o.dmg) drawWounds('king', o.dmg, o.wid, o.ko);
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawPtero(x, y, s, ph, flip, o = {}) {
  const dark = '#4f2a63', mid = '#8e5aa8', light = '#c99be0';
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  if (o.alpha != null) ctx.globalAlpha = Math.max(0, o.alpha);
  const fl = c => c > 0 ? Math.pow(c, 0.75) : -Math.pow(-c, 1.5); // quick upstroke feel, long glide on the downstroke
  const tip = -50 * fl(Math.cos(ph)), tip2 = -46 * fl(Math.cos(ph - 0.7));
  ctx.translate(0, 3 * Math.cos(ph)); // body dips as the wings rise
  const wing = (t, c1, c2, back) => { // arm with elbow, membrane with scalloped trailing edge, three finger bones, wrist claw
    const ex = 5 + t * 0.12, ey = t * 0.42 - 3, wx = -2 + t * 0.35, wy = t, S = [12, -2];
    const f1 = [wx - 13 + t * 0.1, wy * 0.62 + 2], f2 = [wx - 22 + t * 0.05, wy * 0.3 + 3], f3 = [-19, 3];
    const bow = (a, b) => [(a[0] + b[0]) / 2 + (S[0] - (a[0] + b[0]) / 2) * 0.1, (a[1] + b[1]) / 2 + (S[1] - (a[1] + b[1]) / 2) * 0.1];
    const W = [wx, wy], b1 = bow(W, f1), b2 = bow(f1, f2), b3 = bow(f2, f3);
    ctx.fillStyle = vgrad(Math.min(0, t), Math.max(0, t) + 4, c1, c2); ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(ex, ey); ctx.lineTo(wx, wy);
    ctx.quadraticCurveTo(b1[0], b1[1], f1[0], f1[1]); ctx.quadraticCurveTo(b2[0], b2[1], f2[0], f2[1]); ctx.quadraticCurveTo(b3[0], b3[1], f3[0], f3[1]); ctx.lineTo(-4, 1); ctx.closePath(); ctx.fill();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(40,12,60,.55)'; ctx.lineWidth = back ? 1.2 : 1.7; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,20,80,.5)'; ctx.lineWidth = 1.3; ctx.beginPath(); for (const f of [f1, f2]) { ctx.moveTo(wx, wy); ctx.lineTo(f[0], f[1]); } ctx.moveTo(ex - 2, ey + 3); ctx.lineTo((f2[0] + f3[0]) / 2 + 2, (f2[1] + f3[1]) / 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(S[0] - 2, S[1] + (t < 0 ? 1.5 : -1.5)); ctx.lineTo(ex - 1, ey + (t < 0 ? 1.5 : -1.5)); ctx.stroke();
    ctx.strokeStyle = dark; ctx.lineWidth = back ? 2.2 : 3; ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(ex, ey); ctx.lineTo(wx, wy); ctx.stroke();
    ctx.fillStyle = '#f3ead2'; ctx.beginPath(); ctx.moveTo(wx + 1, wy); ctx.lineTo(wx + 5, wy + (t < 0 ? 4 : -4)); ctx.lineTo(wx - 2, wy + (t < 0 ? 1 : -1)); ctx.fill();
  };
  wing(tip2, shade(mid, 0.8), dark, true);
  ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (const [lx, ph2] of [[-5, 0], [2, 1.4]]) { const sw = Math.sin(ph + ph2) * 2; ctx.beginPath(); ctx.moveTo(lx, 6); ctx.lineTo(lx - 4 + sw, 14); ctx.lineTo(lx - 1 + sw, 17); ctx.moveTo(lx - 4 + sw, 14); ctx.lineTo(lx - 7 + sw, 16.5); ctx.stroke(); }
  ell(0, 0, 23, 9.5, 0, vgrad(-10, 10, light, mid, dark)); ell(3, 4, 14, 4.5, 0, '#e8d4f2');
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(12 + i * 1.2, -3 + i * 2.2); ctx.lineTo(16 + i * 1.2, -2 + i * 2.2); ctx.stroke(); } ell(-4, -5, 11, 2.6, -0.05, 'rgba(255,255,255,.18)');
  ctx.strokeStyle = dark; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(-30, 8); ctx.stroke(); // tail whip
  // head with a long beak and a swept-back crest
  ctx.fillStyle = '#f08a3c'; ctx.beginPath(); ctx.moveTo(24, -12); ctx.quadraticCurveTo(14, -26, -4, -26); ctx.quadraticCurveTo(10, -14, 22, -5); ctx.closePath(); ctx.fill();
  ell(33, 3.4, 8, 3.2, 0.15, '#d98aa8');
  ctx.fillStyle = vgrad(-14, 4, light, mid); ctx.beginPath(); ctx.moveTo(18, -9); ctx.bezierCurveTo(26, -17, 44, -15, 62, -4); ctx.bezierCurveTo(46, -2, 32, 3, 18, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(30, -1); ctx.quadraticCurveTo(46, -3, 60, -4); ctx.stroke();
  if (!o.noTeeth) { ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(40 + i * 6, -3); ctx.lineTo(42.4 + i * 6, 1.4); ctx.lineTo(44.8 + i * 6, -3.2); ctx.fill(); } }
  circle(28, -6.5, 4.8, '#fff'); circle(29, -6.5, 3.4, '#ffd23a'); circle(29.8, -6.4, 1.8, '#17100a'); circle(30.2, -7.6, 0.8, '#fff');
  ctx.strokeStyle = dark; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(22, -13); ctx.lineTo(34, -10); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,50,10,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(20 - i * 5, -15 - i * 3.4); ctx.lineTo(8 - i * 3, -21 - i * 1.4); } ctx.stroke(); circle(55, -6, 0.9, 'rgba(0,0,0,.45)');
  wing(tip, light, mid, false);
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawCompy(x, y, s, ph, flip, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s * (o.flat ? 0.35 : 1));
  const tn = o.tone || ['#dcec62', '#9cbf2e', '#5f7f17', '#4a6312'], col = vgrad(-36, 0, tn[0], tn[1], tn[2]), dark = tn[3];
  const leg = (p, c) => { const sw = Math.sin(p); ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-2, -16); ctx.lineTo(-2 + sw * 7, -2 - Math.max(0, Math.cos(p)) * 4); ctx.lineTo(5 + sw * 7, 0); ctx.stroke(); };
  leg(ph + Math.PI, dark);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-6, -24); ctx.quadraticCurveTo(-26, -28, -42, -34 + Math.sin(ph) * 3); ctx.quadraticCurveTo(-24, -16, -6, -14); ctx.fill();
  ell(0, -20, 14, 10, -0.2, col); ell(4, -16, 9, 4.5, -0.2, '#f2f0b8');
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(4, -26); ctx.quadraticCurveTo(10, -36, 16, -38); ctx.lineTo(28, -35); ctx.quadraticCurveTo(30, -29, 24, -28); ctx.lineTo(12, -26); ctx.quadraticCurveTo(10, -20, 8, -16); ctx.fill();
  circle(18, -38, 8.2, col);
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, -20, 13.5, 9.5, -0.2, 0, 7); ctx.moveTo(-6, -24); ctx.quadraticCurveTo(-26, -28, -42, -34 + Math.sin(ph) * 3); ctx.quadraticCurveTo(-24, -16, -6, -14); ctx.closePath(); ctx.clip(); // markings stay inside the body and tail
  ctx.strokeStyle = '#e07b39'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 6, -29); ctx.lineTo(-8 + i * 6, -21); ctx.stroke(); }
  ctx.fillStyle = 'rgba(60,90,10,.3)'; for (const [qx, qy, qr] of [[-4, -25, 2], [3, -27, 1.6], [-12, -22, 1.5], [-22, -24, 1.6], [-30, -27, 1.2]]) circle(qx, qy, qr, ctx.fillStyle);
  ctx.strokeStyle = 'rgba(224,123,57,.85)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const sx = -22 - i * 5; ctx.beginPath(); ctx.moveTo(sx, -34); ctx.lineTo(sx + 1, -18); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = '#f08a3c'; ctx.lineWidth = 1.8; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(10 + i * 2.4, -19 + i * 1.6); ctx.lineTo(4 + i * 2, -12 + i * 2); } ctx.stroke(); 
  ctx.fillStyle = '#f08a3c'; ctx.beginPath(); ctx.moveTo(14, -45); ctx.lineTo(16, -53); ctx.lineTo(20, -45); ctx.moveTo(19, -45); ctx.lineTo(23, -52); ctx.lineTo(24, -44); ctx.fill(); // little crest
  if (o.flat) { ctx.strokeStyle = '#222'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(17, -43); ctx.lineTo(24, -36); ctx.moveTo(24, -43); ctx.lineTo(17, -36); ctx.stroke(); }
  else {
    circle(21, -39.5, 5.2, '#fff'); circle(22.4, -39.5, 3, '#111'); circle(23.4, -40.8, 1.1, '#fff');
    ctx.strokeStyle = dark; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(15, -46); ctx.lineTo(26, -43); ctx.stroke(); // cheeky brow
    ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(17, -31); ctx.quadraticCurveTo(24, -28, 29, -33); ctx.stroke(); // grin
    ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(20 + i * 3.2, -31); ctx.lineTo(21.4 + i * 3.2, -28.5); ctx.lineTo(22.8 + i * 3.2, -31); ctx.fill(); }
  }
  ctx.strokeStyle = dark; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(14, -15); ctx.stroke();
  leg(ph, '#7f9f22');
  ctx.restore();
  if (o.flat) for (let i = 0; i < 3; i++) { const a = T * 6 + i * 2.1; drawStar(x + Math.cos(a) * 18 * s, y - 22 * s + Math.sin(a) * 6 * s, 5 * s, '#ffd740'); }
}
function drawStar(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, rr2 = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } ctx.fill(); }
function drawPepper(x, y, s = 1, rot = 0.5) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = vgrad(-20, 20, '#ff6a4a', '#e0201a', '#9a0a08'); ctx.beginPath(); ctx.moveTo(-6, -16); ctx.quadraticCurveTo(12, -18, 11, 0); ctx.quadraticCurveTo(9, 14, -2, 24); ctx.quadraticCurveTo(-4, 14, -10, 2); ctx.quadraticCurveTo(-14, -12, -6, -16); ctx.fill();
  ell(-4, -6, 3, 8, 0.2, 'rgba(255,255,255,.45)');
  ctx.fillStyle = '#3f9b3a'; ctx.beginPath(); ctx.moveTo(-9, -15); ctx.quadraticCurveTo(0, -22, 10, -15); ctx.quadraticCurveTo(0, -12, -9, -15); ctx.fill();
  ctx.strokeStyle = '#2f7a2c'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -17); ctx.quadraticCurveTo(2, -26, 8, -28); ctx.stroke();
  ctx.restore();
}
const chiliFx = { vy: 0, dig: false, scared: 0, joy: 0, dive: false };
let chiliAcc = null; // shop cards draw Chili with a given accessory; null = what Chili wears
function drawChiliAcc(k) { // in Chili's coordinates: head at (15,-24) r12, ears from (6..14,-33), body centre (0,-15)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (k === 'bow') { ctx.save(); ctx.translate(10, -35); ctx.rotate(-0.3); ctx.fillStyle = '#e53935'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sx * 9, -8, sx * 10, 0); ctx.quadraticCurveTo(sx * 9, 8, 0, 0); ctx.fill(); } circle(0, 0, 2.6, '#b71c1c'); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-7, -3); ctx.lineTo(-4, -2); ctx.moveTo(7, -3); ctx.lineTo(4, -2); ctx.stroke(); ctx.restore(); }
  else if (k === 'scarf') { ctx.fillStyle = '#2f8fd6'; ctx.beginPath(); ctx.moveTo(4, -17); ctx.quadraticCurveTo(13, -11, 23, -15); ctx.lineTo(18, -4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#1c5a96'; ctx.lineWidth = 1; ctx.stroke(); for (const [dx, dy] of [[9, -13], [15, -12], [17, -8]]) circle(dx, dy, 1.1, '#fff'); }
  else if (k === 'santa') { ctx.save(); ctx.translate(19, -34); ctx.rotate(0.35); ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-2, -16, 9, -14); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill(); circle(10, -14, 3, '#fff'); rr(-9, -2, 19, 5, 2.5); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); }
  else if (k === 'glasses') { // two lenses on a bridge, so it reads as sunglasses and not as an eye patch
    ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(14, -27.5); ctx.lineTo(7, -31); ctx.stroke(); // temple towards the ear
    ell(26.6, -26.4, 3.2, 3.6, 0.1, '#ff8a2a'); ell(26.6, -26.4, 2.3, 2.8, 0.1, '#1b2430'); // far lens
    ell(20.5, -26, 6.6, 5.2, 0, '#ff8a2a'); ell(20.5, -26, 5.3, 4.1, 0, '#1b2430'); ell(18.6, -27.6, 2.4, 1.1, -0.35, 'rgba(255,255,255,.6)'); circle(22.6, -24.4, 0.8, 'rgba(255,255,255,.35)'); }
  else if (k === 'pack') { rr(-14, -27, 14, 15, 4); ctx.fillStyle = '#3a9a4a'; ctx.fill(); ctx.strokeStyle = '#1f5a28'; ctx.lineWidth = 1.4; ctx.stroke(); rr(-12, -19, 10, 6, 2); ctx.fillStyle = '#46ad4a'; ctx.fill(); ctx.stroke(); circle(-7, -16, 1, '#ffd34d'); ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-1, -25); ctx.quadraticCurveTo(5, -16, 1, -5); ctx.stroke(); }
  else if (k === 'flowers') { ctx.strokeStyle = '#4a8a3a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(15, -24, 12.5, Math.PI * 1.12, Math.PI * 1.85); ctx.stroke(); [[1.15, '#ff8ab0'], [1.3, '#ffd34d'], [1.45, '#fff'], [1.6, '#ff8ab0'], [1.75, '#b39ddb']].forEach(([a, c]) => { const fx = 15 + Math.cos(Math.PI * a) * 12.5, fy = -24 + Math.sin(Math.PI * a) * 12.5; for (let i = 0; i < 5; i++) circle(fx + Math.cos(i * 1.257) * 2.2, fy + Math.sin(i * 1.257) * 2.2, 1.6, c); circle(fx, fy, 1.3, '#f0a020'); }); }
}
function drawChili(x, y, s, ph, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const fx = clamp(chiliFx.vy / 600, -1, 1);
  if (chiliFx.dig) { ctx.translate(2, -8); ctx.rotate(0.3 + Math.sin(T * 22) * 0.04); ctx.translate(-2, 8); } // sniffing pose
  if (chiliFx.scared > 0) { ctx.scale(1 + 0.1 * chiliFx.scared, 1 - 0.1 * chiliFx.scared); ctx.translate(Math.sin(T * 50) * 1.2 * chiliFx.scared, 0); } // startled: crouch and tremble
  const col = vgrad(-36, 0, '#e2a06a', '#c8814a', '#93582c'), light = '#f3dcc4';
  // fluffy pom tail
  { const wag = chiliFx.dig ? Math.sin(T * 30) * 3 : chiliFx.joy > 0 ? Math.sin(T * 26) * 4 : 0; circle(-17, -17 + wag * 0.5, 8, '#fff'); circle(-21 + wag * 0.3, -19, 4.5, '#fff'); circle(-15, -13, 4, '#e8eef5'); }
  ell(0, -15, 18, 13, 0, col);
  ell(8, -3, 9, 4, 0, light);
  const ear = (bx, by, len, w, ang, c, inner) => {
    ctx.save(); ctx.translate(bx, by); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(-w, 0); ctx.bezierCurveTo(-w * 1.5, -len * 0.45, -w * 0.9, -len * 0.95, w * 0.3, -len); ctx.bezierCurveTo(w * 1.6, -len * 0.9, w * 1.3, -len * 0.4, w, 0); ctx.closePath(); ctx.fillStyle = c; ctx.fill();
    if (inner) { ctx.beginPath(); ctx.moveTo(-w * 0.5, -2); ctx.bezierCurveTo(-w * 0.8, -len * 0.45, -w * 0.4, -len * 0.82, w * 0.3, -len * 0.86); ctx.bezierCurveTo(w * 0.95, -len * 0.75, w * 0.8, -len * 0.4, w * 0.5, -2); ctx.closePath(); ctx.fillStyle = inner; ctx.fill(); }
    ctx.restore();
  };
  const sw = chiliFx.scared > 0 ? -0.75 * chiliFx.scared : Math.sin(ph * 1.3 - 0.8) * 0.1 + fx * 0.45 + (chiliFx.joy > 0 ? 0.35 * chiliFx.joy : 0); // ears: flat when scared, perked when happy
  ear(6, -32, 27, 4.8, -0.5 + sw, '#a8693a', '#d98aa0');
  circle(15, -24, 12, col);
  ear(14, -34, 31, 5.4, -0.12 + sw * 0.8, col, '#f4a6b8');
  ell(4, -11, 9, 6, 0, light);
  ctx.strokeStyle = 'rgba(255,240,225,.7)'; ctx.lineWidth = 1; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(6 + i * 3, -12 + i * 0.5); ctx.lineTo(8 + i * 3, -8 + i * 0.5); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(110,60,30,.35)'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 4, -22); ctx.lineTo(-6 + i * 4, -15); ctx.stroke(); }
  ell(22, -19, 4, 2.4, 0, 'rgba(255,130,150,.45)'); ell(8, -31, 6, 3, -0.4, 'rgba(255,255,255,.2)');
  if (chiliFx.joy > 0) { ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(20, -24, 3.6, Math.PI + 0.3, Math.PI * 2 - 0.3); ctx.stroke(); } // happy ^ ^ eye
  else if (chiliFx.scared > 0) { circle(20, -26, 5.6, '#1b1210'); circle(21.8, -28.2, 2.2, '#fff'); circle(18.6, -24, 1, '#fff'); } // wide startled eye
  else if ((T % 3.1) < 0.1) { ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(20, -26, 3.4, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else { circle(20, -26, 4.6, '#1b1210'); circle(21.6, -27.8, 1.8, '#fff'); circle(18.8, -24.2, 0.9, '#fff'); }
  if (chiliFx.dig) { ctx.strokeStyle = col; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; for (const k of [0, 1.6]) { ctx.beginPath(); ctx.moveTo(12, -8); ctx.lineTo(22 + Math.sin(T * 34 + k) * 5, -1 + Math.cos(T * 34 + k) * 2); ctx.stroke(); } }
  circle(27, -21, 2.4, '#f48fb1');
  { const acc = (CHILI_ITEMS[chiliAcc != null ? chiliAcc : save.equip.chili] || {}).k; if (acc) drawChiliAcc(acc); }
  if (chiliFx.dive) { // glass diving helmet with a golden collar
    ctx.save(); const g = ctx.createRadialGradient(8, -50, 3, 14, -38, 34); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.5, 'rgba(170,225,255,.22)'); g.addColorStop(1, 'rgba(120,200,255,.3)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(16, -38, 20, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(210,240,255,.9)'; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(16, -38, 15, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
    ctx.fillStyle = '#e8b030'; ctx.strokeStyle = '#7a5410'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(16, -10, 19, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); for (const bx of [3, 11, 21, 29]) circle(bx, -9.6, 1.2, '#7a5410'); ctx.restore();
    circle(16, -69, 2.6, '#e8b030'); ctx.strokeStyle = '#e8b030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, -67); ctx.lineTo(16, -63); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,245,235,.85)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(26, -20); ctx.lineTo(37, -24); ctx.moveTo(26, -20); ctx.lineTo(38, -19); ctx.moveTo(26, -19); ctx.lineTo(36, -14); ctx.stroke();
  ctx.restore();
}
function drawLongneck(x, y, s, c0, ph, flip, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const col = vgrad(-160, 0, shade(c0, 1.3), c0, shade(c0, 0.68));
  const dark = 'rgba(0,0,0,.22)';
  for (const lx of [-38, -14, 14, 36]) { const ext = o.tall && lx > 0 ? 14 : 0; rr(lx - 7, -45 - ext, 15, 45 + ext, 6); ctx.fillStyle = col; ctx.fill(); rr(lx - 7, -45 - ext, 15, 45 + ext, 6); ctx.fillStyle = (lx === -14 || lx === 36) ? dark : 'rgba(0,0,0,0)'; ctx.fill(); }
  if (o.tall) { ctx.save(); ctx.translate(-8, -52); ctx.rotate(-0.1); ctx.translate(8, 52); } // front legs longer than the hind legs: the back slopes down to the tail
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-45, -60); ctx.quadraticCurveTo(-90, -50, -115, -28); ctx.quadraticCurveTo(-80, -40, -45, -40); ctx.fill();
  ell(0, -56, 55, 30, 0, col);
  ctx.strokeStyle = col; ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(35, -66); ctx.quadraticCurveTo(58, -110, 62 + Math.sin(ph) * 3, -140); ctx.stroke();
  ell(72 + Math.sin(ph) * 3, -146, 24, 15, 0.1, col);
  circle(77 + Math.sin(ph) * 3, -151, 6.2, '#fff'); circle(78.4 + Math.sin(ph) * 3, -151, 3.8, '#222');
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(80 + Math.sin(ph) * 3, -144, 5, 0.3, 1.6); ctx.stroke();
  for (let i = 0; i < 4; i++) ell(-25 + i * 16, -70 + (i % 2) * 8, 6, 4, 0, dark);
  ell(4, -40, 40, 10, 0, 'rgba(255,255,255,.14)'); ell(-6, -74, 34, 7, 0, 'rgba(255,255,255,.16)');
  circle(79.6 + Math.sin(ph) * 3, -153, 1.5, '#fff'); ell(84 + Math.sin(ph) * 3, -142, 4, 2, 0, 'rgba(255,120,140,.4)');
  circle(90 + Math.sin(ph) * 3, -149, 1.3, 'rgba(0,0,0,.45)'); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(74 + Math.sin(ph) * 3, -159); ctx.quadraticCurveTo(79 + Math.sin(ph) * 3, -161.5, 83 + Math.sin(ph) * 3, -158.5); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; for (let i = 0; i < 6; i++) { const u = i / 5; circle(38 + (62 - 38) * u + Math.sin(u * 3) * 6, -72 - 70 * u, 2.2 - u * 0.5, ctx.fillStyle); }
  if (o.tall) ctx.restore();
  ctx.fillStyle = '#efe6d2'; for (const lx of [-38, -14, 14, 36]) { ctx.beginPath(); ctx.ellipse(lx, -2, 6, 2.6, 0, Math.PI, 0); ctx.fill(); }
  ctx.restore();
}

function drawTrike(x, y, s, c0, ph, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const col = vgrad(-50, 0, shade(c0, 1.3), c0, shade(c0, 0.68));
  for (const lx of [-18, 14]) { rr(lx - 6, -22, 12, 22, 5); ctx.fillStyle = col; ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-28, -30); ctx.quadraticCurveTo(-50, -24, -56, -12); ctx.quadraticCurveTo(-40, -18, -26, -18); ctx.fill();
  ell(0, -30, 32, 19, 0, col);
  ctx.fillStyle = '#ffc86b'; ctx.beginPath(); ctx.arc(26, -40, 20, Math.PI * 0.75, Math.PI * 1.95); ctx.fill();
  for (let i = 0; i < 6; i++) { const a = Math.PI * (0.8 + i * 0.22); circle(26 + Math.cos(a) * 17, -40 + Math.sin(a) * 17, 2.4, '#e8963a'); }
  ell(38, -32, 15, 11, 0, col);
  ctx.strokeStyle = '#fff4dc'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(38, -40); ctx.lineTo(54, -52); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(46, -34); ctx.lineTo(56, -38); ctx.stroke();
  circle(42, -36, 5, '#fff'); circle(43, -36, 3.2, '#222'); circle(44, -37.4, 1.1, '#fff');
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(46, -28, 4, 0.2, 1.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(160,90,30,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = Math.PI * (0.9 + i * 0.22); ctx.moveTo(26 + Math.cos(a) * 6, -40 + Math.sin(a) * 6); ctx.lineTo(26 + Math.cos(a) * 15, -40 + Math.sin(a) * 15); } ctx.stroke();
  ctx.strokeStyle = 'rgba(190,150,90,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(44, -44); ctx.lineTo(46, -46); ctx.moveTo(50, -48.5); ctx.lineTo(52, -50.5); ctx.stroke();
  circle(52, -31, 1.1, 'rgba(0,0,0,.4)'); ctx.fillStyle = '#efe6d2'; for (const lx of [-18, 14]) { ctx.beginPath(); ctx.ellipse(lx, -1, 6, 2.4, 0, Math.PI, 0); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ell(-4, -36, 22, 6, 0, ctx.fillStyle); ctx.fillStyle = 'rgba(0,0,0,.14)'; for (const [qx, qy] of [[-14, -30], [-2, -26], [8, -33]]) circle(qx, qy, 2.4, ctx.fillStyle);
  ctx.restore();
}

function drawBaby(x, y, s, ph, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const col = vgrad(-52, 0, '#a8e8a8', '#7fd08a', '#4ea35b'), dark = '#4ea35b';
  ctx.strokeStyle = dark; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(-4 + Math.sin(ph) * 5, 0); ctx.moveTo(6, -12); ctx.lineTo(6 - Math.sin(ph) * 5, 0); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-10, -22); ctx.quadraticCurveTo(-28, -20, -34, -10); ctx.quadraticCurveTo(-22, -12, -8, -12); ctx.fill();
  ell(0, -20, 16, 13, 0, col);
  ell(2, -14, 9, 6, 0, '#e8f6d0'); ctx.fillStyle = 'rgba(40,120,60,.25)'; for (const [qx, qy] of [[-6, -26], [0, -29], [-10, -19]]) circle(qx, qy, 2.2, ctx.fillStyle);
  ell(14, -38, 15, 13, 0, col);
  circle(19, -41, 4, '#fff'); circle(20, -41, 2.2, '#222'); circle(20.8, -42, 0.8, '#fff'); ell(24, -33, 3, 2, 0, 'rgba(255,120,140,.45)');
  ctx.strokeStyle = '#2d6b36'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(20, -34, 5, 0.2, 1.4); ctx.stroke();
  // santa hat
  ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(2, -48); ctx.quadraticCurveTo(10, -72, -8, -70); ctx.lineTo(26, -48); ctx.closePath(); ctx.fill();
  rr(0, -52, 28, 7, 3.5); ctx.fillStyle = '#fff'; ctx.fill();
  circle(-8, -70, 5, '#fff');
  if (chiliFx.dive) { // diving mask with a strap round the head, and a snorkel with a red mouthpiece
    ctx.strokeStyle = '#1f5f9a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(14, -42); ctx.quadraticCurveTo(2, -45, -1, -36); ctx.stroke();
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(25, -43); ctx.quadraticCurveTo(36, -48, 32, -64); ctx.stroke(); ctx.strokeStyle = '#e8a010'; ctx.lineWidth = 1; ctx.stroke(); rr(28.5, -68, 6, 5, 2); ctx.fillStyle = '#e53935'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(21, -40.5, 8.2, 6.6, 0.05, 0, 7); ctx.fillStyle = 'rgba(150,222,255,.5)'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = '#2a8ad0'; ctx.stroke(); ctx.lineWidth = 0.9; ctx.strokeStyle = '#0f4a80'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(19, -41.5, 3.8, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke();
  }
  ctx.restore();
}

function drawGuitar(x, y, s, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rr(-4, -64, 8, 52, 3); ctx.fillStyle = '#6b4a2b'; ctx.fill();
  rr(-7, -78, 14, 16, 4); ctx.fillStyle = '#3b2410'; ctx.fill();
  for (let i = 0; i < 3; i++) { circle(-9, -74 + i * 5, 1.8, '#ddd'); circle(9, -74 + i * 5, 1.8, '#ddd'); }
  circle(0, 20, 24, '#d9822b'); circle(0, -6, 17, '#d9822b'); ell(0, 8, 14, 22, 0, '#d9822b');
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#8a4b14'; ctx.beginPath(); ctx.arc(0, 20, 24, 0.2, Math.PI - 0.2); ctx.stroke();
  circle(0, 6, 7, '#3b2410'); rr(-9, 26, 18, 4, 2); ctx.fillStyle = '#3b2410'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.8; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 2, -64); ctx.lineTo(i * 2, 28); ctx.stroke(); }
  ctx.restore();
}
function drawBike(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const wx of [-30, 30]) { ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(wx, -19, 18, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#999'; ctx.lineWidth = 1; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4 + T; ctx.beginPath(); ctx.moveTo(wx + Math.cos(a) * 16, -19 + Math.sin(a) * 16); ctx.lineTo(wx - Math.cos(a) * 16, -19 - Math.sin(a) * 16); ctx.stroke(); } }
  ctx.strokeStyle = '#d63a3a'; ctx.lineWidth = 4.5; ctx.beginPath();
  ctx.moveTo(-30, -19); ctx.lineTo(-8, -46); ctx.lineTo(0, -19); ctx.lineTo(-30, -19); ctx.moveTo(-8, -46); ctx.lineTo(20, -46); ctx.lineTo(0, -19); ctx.moveTo(20, -46); ctx.lineTo(30, -19); ctx.stroke();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(20, -46); ctx.lineTo(17, -56); ctx.lineTo(27, -58); ctx.stroke();
  rr(-18, -52, 18, 6, 3); ctx.fillStyle = '#222'; ctx.fill();
  circle(26, -60, 3, '#ffd740');
  ctx.restore();
}
function drawRod(x, y, s, ph = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round';
  ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-30, 18); ctx.lineTo(-6, -12); ctx.stroke();
  ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(28, -56); ctx.stroke();
  circle(-16, 4, 6, '#9aa4ad'); circle(-16, 4, 2.5, '#555');
  const fx = 36 + Math.sin(ph) * 3, fy = 2;
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(28, -56); ctx.lineTo(fx, fy - 8); ctx.stroke();
  ell(fx, fy, 10, 5.5, Math.sin(ph) * 0.3, '#ff8f3a'); ctx.fillStyle = '#ff8f3a'; ctx.beginPath(); ctx.moveTo(fx - 8, fy); ctx.lineTo(fx - 15, fy - 6); ctx.lineTo(fx - 15, fy + 6); ctx.fill(); circle(fx + 5, fy - 1, 1.3, '#222');
  ctx.restore();
}
function drawCoaster(x, y, s) { // roller coaster: a looping track on stilts with a little red car, for the Europa-Park voucher
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const trk = () => { ctx.beginPath(); ctx.moveTo(-46, 6); ctx.lineTo(-30, 6); ctx.quadraticCurveTo(-18, 6, -10, -22); ctx.quadraticCurveTo(-4, -44, 6, -44); ctx.quadraticCurveTo(18, -44, 20, -22); ctx.quadraticCurveTo(22, 2, 34, 2); ctx.lineTo(46, -8); };
  ctx.strokeStyle = '#8a7a68'; ctx.lineWidth = 2.5; for (const sx of [-30, -14, 6, 20, 34]) { const ty = sx < -20 ? 6 : sx < 0 ? -14 : sx < 14 ? -42 : sx < 28 ? -24 : 2; ctx.beginPath(); ctx.moveTo(sx, ty + 3); ctx.lineTo(sx, 26); ctx.stroke(); }
  ctx.strokeStyle = '#8a7a68'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-34, 26); ctx.lineTo(40, 26); ctx.stroke();
  trk(); ctx.strokeStyle = '#7a1c1c'; ctx.lineWidth = 7; ctx.stroke(); trk(); ctx.strokeStyle = '#e8453c'; ctx.lineWidth = 4.5; ctx.stroke();
  ctx.save(); ctx.translate(-4, -32); ctx.rotate(-0.9); rr(-9, -5, 18, 9, 3); ctx.fillStyle = '#ffd34d'; ctx.fill(); ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 1.5; ctx.stroke(); circle(-3, -6, 3, '#f6d3b0'); circle(3, -6, 3, '#f6d3b0'); ctx.restore();
  ctx.restore();
}
function drawKiwi(x, y, s, ph = 0, flip = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.lineCap = 'round';
  ctx.strokeStyle = '#c9a56b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(-4 + Math.sin(ph) * 4, 0); ctx.moveTo(4, -5); ctx.lineTo(4 - Math.sin(ph) * 4, 0); ctx.stroke();
  ell(0, -16, 18, 13, 0, vgrad(-29, -3, '#a98658', '#8b6a43', '#5e4528'));
  ctx.strokeStyle = 'rgba(60,40,20,.5)'; ctx.lineWidth = 1.2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-12 + i * 5, -24); ctx.lineTo(-14 + i * 5, -14); ctx.stroke(); }
  circle(14, -22, 7.5, '#8b6a43');
  ctx.strokeStyle = '#e8cf9a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(20, -21); ctx.quadraticCurveTo(32, -16, 40, -6); ctx.stroke();
  circle(16, -24, 1.6, '#111');
  ctx.restore();
}
function kiwiBubble(x, y, s, flip) { // soap-bubble helmet round the kiwi's head and beak (drawn after the outlined sprite so the glass stays see-through)
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const wob = 1 + Math.sin(T * 4 + 1) * 0.035; ctx.save(); ctx.translate(23, -18); ctx.rotate(0.3); ctx.scale(wob, 2 - wob);
  const g = ctx.createRadialGradient(-8, -6, 2, 0, 0, 24); g.addColorStop(0, 'rgba(255,255,255,.3)'); g.addColorStop(0.75, 'rgba(200,238,255,.1)'); g.addColorStop(1, 'rgba(255,175,230,.28)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 24, 16, 0, 0, Math.PI * 2); ctx.fill();
  const rim = ctx.createLinearGradient(-24, -16, 24, 16); rim.addColorStop(0, 'rgba(255,150,220,.95)'); rim.addColorStop(0.35, 'rgba(150,230,255,.95)'); rim.addColorStop(0.7, 'rgba(255,240,150,.95)'); rim.addColorStop(1, 'rgba(190,160,255,.95)');
  ctx.lineWidth = 1.8; ctx.strokeStyle = rim; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 19.5, 12, 0, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
  circle(13, 6, 1.3, 'rgba(255,255,255,.8)'); ctx.restore();
  for (let i = 0; i < 2; i++) { const u = (T * 0.7 + i * 0.5) % 1; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(16 + i * 8 + Math.sin(T * 3 + i) * 2, -38 - u * 16, 1.6 + i * 0.8, 0, 7); ctx.stroke(); }
  ctx.restore();
}
function babyBubble(x, y, s, flip) { // a bubble now and then from the snorkel
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); const u = (T * 0.8) % 1;
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(33 + Math.sin(T * 4) * 2, -72 - u * 14, 1.8, 0, 7); ctx.stroke(); ctx.restore();
}
function drawTreasure(k, x, y, s, ph = T * 4) {
  if (k === 0) drawGuitar(x, y + 4 * s, s * 0.85, -0.35);
  else if (k === 1) drawBike(x, y + 30 * s, s);
  else if (k === 2) drawRod(x, y + 10 * s, s, ph);
  else drawKiwi(x - 8 * s, y + 18 * s, s * 1.4, ph);
}
// ---- Götti's hidden treasures: the hiding places (tree, cracked rock, iced rod, ash heap) ----
function glint(x, y, r, a) { // a four-point twinkle
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a; ctx.fillStyle = '#fff8c4'; ctx.beginPath(); ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0); ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r); ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0); ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r); ctx.fill(); ctx.restore();
}
function twinkles(sc, x, y, spread) { // a faint glint now and then; after two misses it is brighter and has a soft halo
  const n = sc.strong ? 3 : 1;
  if (sc.strong) { const a = 0.18 + 0.1 * Math.sin(T * 4); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, spread + 18 + Math.sin(T * 4) * 4, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  for (let i = 0; i < n; i++) {
    const ph = (T * 0.7 + i / n + sc.x * 0.013) % 1, a = Math.pow(Math.max(0, Math.sin(ph * Math.PI)), 2);
    if (a > 0.03) glint(x + Math.sin(i * 2.4 + sc.x) * spread, y + Math.cos(i * 1.7 + sc.x) * spread * 0.6, (sc.strong ? 12 : 8) * (0.5 + a * 0.5), a);
  }
}
function drawBruellBaum(x, sc) { // the big sleepy tree: it hides Götti's guitar and wakes up when Rex roars
  const awake = sc.state === 'open', sk = sc.shake > 0 ? Math.min(1, sc.shake) : 0, sw = sk > 0 ? Math.sin(T * 40) * 7 * sk : Math.sin(T * 1.1) * 1.5, b = GROUND;
  shadow(x, b + 2, 130, 0.3);
  ctx.save(); ctx.translate(x, b); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-50, 4); ctx.bezierCurveTo(-30, -60, -26, -150, -24, -235); ctx.lineTo(26, -235); ctx.bezierCurveTo(28, -150, 34, -60, 56, 4); ctx.quadraticCurveTo(0, -10, -50, 4);
  ctx.fillStyle = vgrad(-235, 0, '#7b5634', '#5e3f24', '#3c2815'); ctx.fill(); ctx.strokeStyle = 'rgba(30,16,4,.55)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = 'rgba(30,16,4,.3)'; ctx.lineWidth = 2; for (const [a, c, d] of [[-14, -40, -170], [12, -30, -150], [22, -120, -200], [-18, -190, -225]]) { ctx.beginPath(); ctx.moveTo(a, c); ctx.quadraticCurveTo(a + 5, (c + d) / 2, a - 2, d); ctx.stroke(); }
  // the face on the trunk: asleep, then wide awake
  if (!awake) {
    ctx.strokeStyle = '#2a1608'; ctx.lineWidth = 3.5; for (const ex of [-12, 14]) { ctx.beginPath(); ctx.arc(ex, -126, 7, 0.2, Math.PI - 0.2); ctx.stroke(); }
    ell(1, -100, 7, 5 + Math.sin(T * 2) * 1.5, 0, '#2a1608');
    const zy = Math.sin(T * 1.6) * 5; txt('z', 44, -152 + zy, 20, 'rgba(255,255,255,.85)'); txt('Z', 60, -176 + zy * 1.3, 26, 'rgba(255,255,255,.7)');
  } else {
    for (const ex of [-13, 15]) { circle(ex, -126, 9, '#fff'); circle(ex + 1, -125, 4, '#2a1608'); }
    ell(1, -97, 9, 11, 0, '#2a1608'); ell(1, -91, 6, 5, 0, '#a8442c');
  }
  // canopy sways; the guitar sticks out of the leaves (neck and head only, the body is hidden)
  ctx.translate(sw, 0);
  const blob = (list, c0, c1) => { for (const [dx, dy, r] of list) { circle(dx, dy, r, c0); ell(dx - r * 0.2, dy - r * 0.25, r * 0.65, r * 0.55, 0, c1); } };
  blob([[-92, -262, 62], [-30, -304, 68], [42, -296, 70], [98, -258, 58], [0, -250, 68]], '#2c6f2a', '#3a8a34');
  if (!awake) drawGuitar(54, -262, 0.8, 0.55);
  blob([[-58, -232, 48], [62, -224, 50], [100, -240, 34], [20, -218, 44]], '#3c9a38', '#63bd52');
  ctx.strokeStyle = '#2c6f2a'; ctx.lineWidth = 3; for (const vx of [-100, -40, 70, 112]) { ctx.beginPath(); ctx.moveTo(vx, -215); ctx.quadraticCurveTo(vx + 6, -190, vx - 2, -168 + Math.sin(T * 2 + vx) * 3); ctx.stroke(); }
  ctx.restore();
  if (!awake) twinkles(sc, x + 72, b - 290, 28);
}
function drawIceHole(x, sc) { // a frozen fishing hole with a rod stuck in it: STAMPF breaks the ice
  const b = GROUND, open = sc.state === 'open';
  ctx.save(); ctx.lineCap = 'round';
  if (!open) {
    ell(x, b + 7, 96, 12, 0, 'rgba(0,0,0,.25)');
    ell(x, b + 5, 92, 11, 0, vgrad(b - 6, b + 16, '#e4f6ff', '#b6dcf2', '#8fc2e2')); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, b + 5, 92, 11, 0, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(70,130,180,.65)'; ctx.lineWidth = 1.8; for (const [a, c] of [[-70, 4], [-40, 12], [-8, 14], [30, 12], [64, 5], [80, 9]]) { ctx.beginPath(); ctx.moveTo(x + 4, b + 4); ctx.lineTo(x + (a + 4) * 0.5, b + 5 + (c - 5) * 0.4); ctx.lineTo(x + a, b + c * 0.7); ctx.stroke(); }
    ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - 20, b + 4); ctx.lineTo(x + 2, b - 50); ctx.stroke();
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x + 2, b - 50); ctx.lineTo(x + 44, b - 116); ctx.stroke();
    circle(x - 9, b - 22, 7, '#9aa4ad'); circle(x - 9, b - 22, 3, '#555');
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x + 44, b - 116); ctx.lineTo(x + 52 + Math.sin(T * 2) * 1.5, b + 2); ctx.stroke();
    circle(x + 52, b - 3, 5, '#e8453c'); ell(x + 52, b - 6, 5, 2.6, 0, '#fff');
    ctx.fillStyle = 'rgba(255,255,255,.9)'; for (const [fx, fy] of [[x - 12, b - 34], [x + 20, b - 82], [x - 2, b - 6]]) { ctx.beginPath(); ctx.arc(fx, fy, 2.2, 0, 7); ctx.fill(); }
    twinkles(sc, x + 22, b - 60, 40);
  } else {
    ell(x, b + 6, 70, 9, 0, '#173a55'); ell(x, b + 5, 56, 5, 0, '#245a80');
    ctx.fillStyle = '#d8f0ff'; for (const [a, c, r] of [[-84, 6, 14], [-64, 14, 9], [66, 12, 12], [84, 4, 10]]) { ctx.beginPath(); ctx.moveTo(x + a - r, b + c + 3); ctx.lineTo(x + a, b + c - r * 0.5); ctx.lineTo(x + a + r, b + c + 3); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}
function drawAshHeap(x, sc) { // a smoking heap of ash with a long beak poking out: FEUER blows it away
  const b = GROUND, open = sc.state === 'open';
  ctx.save(); ctx.lineCap = 'round';
  if (!open) {
    shadow(x, b + 2, 110, 0.35);
    ctx.beginPath(); ctx.moveTo(x - 108, b); ctx.bezierCurveTo(x - 92, b - 70, x - 52, b - 106, x, b - 106); ctx.bezierCurveTo(x + 52, b - 106, x + 94, b - 66, x + 112, b); ctx.closePath();
    ctx.fillStyle = vgrad(b - 106, b, '#7a7475', '#514b4c', '#2e2a2b'); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3; ctx.stroke();
    for (const [a, c, r] of [[-50, -70, 16], [-8, -88, 12], [34, -66, 18], [60, -34, 12], [-76, -30, 11]]) ell(x + a, b + c, r, r * 0.55, -0.3, 'rgba(255,255,255,.12)');
    for (const [a, c, k] of [[-62, -52, 0], [-20, -36, 1.7], [22, -78, 3.1], [56, -52, 4.4], [8, -20, 5.6], [-38, -90, 2.3]]) { ctx.globalAlpha = 0.45 + 0.4 * Math.sin(T * 3.4 + k); circle(x + a, b + c, 3.4, '#ff8a2a'); ctx.globalAlpha = 1; }
    const bob = Math.sin(T * 3) * 2;
    ctx.strokeStyle = '#e8cf9a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 94, b - 26 + bob); ctx.quadraticCurveTo(x - 118, b - 24 + bob, x - 134, b - 12 + bob); ctx.stroke();
    circle(x - 135, b - 12 + bob, 3, '#6b4a2b');
    for (let i = 0; i < 3; i++) { const u = (T * 0.35 + i / 3) % 1; ctx.globalAlpha = 0.35 * (1 - u); circle(x + 10 + Math.sin(u * 5 + i) * 14, b - 108 - u * 90, 12 + u * 16, '#8a8485'); ctx.globalAlpha = 1; }
    twinkles(sc, x - 124, b - 34, 22);
  } else {
    ell(x, b + 1, 78, 9, 0, '#4a4546'); ell(x - 10, b - 2, 46, 5, 0, '#6a6465');
  }
  ctx.restore();
}
function drawSecret(L, cam) {
  const sc = L.secret; if (!sc) return; const x = sc.x - cam; if (x < -300 || x > W + 300) return;
  if (sc.kind === 'tree') drawBruellBaum(x, sc);
  else if (sc.kind === 'ice') drawIceHole(x, sc);
  else if (sc.kind === 'ash') drawAshHeap(x, sc);
  else if (sc.state === 'idle') twinkles(sc, x + 6, GROUND - 52, 26); // the cracked rock is drawn as an obstacle
}
function drawMedal(x, y, r, kind, on) {
  ctx.save(); if (!on) ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(x - r * 0.9, y - r * 1.9); ctx.lineTo(x - r * 0.2, y - r * 1.9); ctx.lineTo(x + r * 0.3, y - r * 0.6); ctx.lineTo(x - r * 0.4, y - r * 0.6); ctx.fill();
  ctx.fillStyle = '#2e6fd6'; ctx.beginPath(); ctx.moveTo(x + r * 0.9, y - r * 1.9); ctx.lineTo(x + r * 0.2, y - r * 1.9); ctx.lineTo(x - r * 0.3, y - r * 0.6); ctx.lineTo(x + r * 0.4, y - r * 0.6); ctx.fill();
  circle(x, y, r, on ? '#e8a317' : '#999'); circle(x, y, r * 0.82, on ? '#ffd34d' : '#ccc');
  if (kind === 0) drawEgg(x, y, r * 0.5, '#fff7e0', '#6aa84f');
  else if (kind === 1) drawHeart(x, y + r * 0.05, r / 22, true);
  else drawAmber(x, y, r * 0.45);
  ctx.restore();
}
function drawGoettiHead(cx, cy, r, glasses) { // young, lean face, light stubble, dark cap worn backwards, sunglasses pushed up on top
  const skin = '#f2c6a0', skinD = '#e2ab82', hairC = '#2e231d', cap = '#26324a', capD = '#141b2c', capL = '#3d4f74', TAU = Math.PI * 2;
  const facePath = () => { ctx.beginPath(); ctx.moveTo(cx - r * 0.88, cy - r * 0.1); ctx.bezierCurveTo(cx - r * 0.92, cy + r * 0.55, cx - r * 0.46, cy + r * 1.02, cx, cy + r * 1.04); ctx.bezierCurveTo(cx + r * 0.46, cy + r * 1.02, cx + r * 0.92, cy + r * 0.55, cx + r * 0.88, cy - r * 0.1); ctx.bezierCurveTo(cx + r * 0.88, cy - r * 0.85, cx - r * 0.88, cy - r * 0.85, cx - r * 0.88, cy - r * 0.1); ctx.closePath(); };
  // ears and short hair at the sides
  circle(cx - r * 0.93, cy + r * 0.14, r * 0.19, skinD); circle(cx + r * 0.93, cy + r * 0.14, r * 0.19, skinD);
  ell(cx - r * 0.86, cy - r * 0.02, r * 0.1, r * 0.26, 0.1, hairC); ell(cx + r * 0.86, cy - r * 0.02, r * 0.1, r * 0.26, -0.1, hairC);
  // face
  facePath(); ctx.fillStyle = vgrad(cy - r, cy + r * 1.05, '#f7d3ae', skin, '#e6b48c'); ctx.fill();
  // light stubble: a soft shadow along jaw and chin, a faint one above the lip, a few specks
  ctx.save(); facePath(); ctx.clip(); ctx.fillStyle = vgrad(cy + r * 0.25, cy + r * 1.05, 'rgba(70,52,42,0)', 'rgba(70,52,42,.22)'); ctx.fillRect(cx - r, cy + r * 0.25, r * 2, r * 0.85);
  ctx.fillStyle = 'rgba(70,52,42,.13)'; ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.38, r * 0.4, r * 0.09, 0, 0, TAU); ctx.fill();
  ctx.restore();
  // nose
  ell(cx, cy + r * 0.16, r * 0.13, r * 0.11, 0, skinD); ell(cx - r * 0.04, cy + r * 0.12, r * 0.05, r * 0.035, 0, 'rgba(255,255,255,.35)');
  // big open grin with teeth and a hint of tongue
  ctx.fillStyle = '#6e2530'; ctx.beginPath(); ctx.moveTo(cx - r * 0.46, cy + r * 0.46); ctx.quadraticCurveTo(cx, cy + r * 0.58, cx + r * 0.46, cy + r * 0.46); ctx.quadraticCurveTo(cx + r * 0.4, cy + r * 0.88, cx, cy + r * 0.9); ctx.quadraticCurveTo(cx - r * 0.4, cy + r * 0.88, cx - r * 0.46, cy + r * 0.46); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(cx - r * 0.5, cy + r * 0.42, r, r * 0.2); ctx.fillStyle = '#e8627e'; ctx.beginPath(); ctx.ellipse(cx + r * 0.05, cy + r * 0.88, r * 0.22, r * 0.15, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy + r * 0.62); ctx.lineTo(cx + r * 0.5, cy + r * 0.62); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = 'rgba(120,50,50,.55)'; ctx.lineWidth = Math.max(1, r * 0.04); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - r * 0.46, cy + r * 0.46); ctx.quadraticCurveTo(cx, cy + r * 0.58, cx + r * 0.46, cy + r * 0.46); ctx.stroke();
  // wide-open brown eyes, thick straight raised brows, a little blush
  for (const sx of [-1, 1]) {
    const ex = cx + sx * r * 0.38, ey = cy - r * 0.08;
    ell(ex, ey, r * 0.2, r * 0.19, 0, '#fff'); ctx.strokeStyle = 'rgba(80,50,40,.35)'; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.2, r * 0.19, 0, 0, TAU); ctx.stroke();
    circle(ex - sx * r * 0.01, ey, r * 0.125, '#6a4428'); circle(ex - sx * r * 0.01, ey, r * 0.065, '#140c08'); circle(ex + r * 0.04, ey - r * 0.06, r * 0.05, '#fff'); circle(ex - r * 0.04, ey + r * 0.05, r * 0.025, '#fff');
    ctx.strokeStyle = hairC; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + sx * r * 0.62, cy - r * 0.27); ctx.quadraticCurveTo(cx + sx * r * 0.4, cy - r * 0.45, cx + sx * r * 0.14, cy - r * 0.37); ctx.stroke();
    ell(cx + sx * r * 0.6, cy + r * 0.34, r * 0.16, r * 0.09, 0, 'rgba(235,110,100,.25)');
  }
  // the cap, worn backwards and pushed back: mesh panel, seams, button, and the adjustment strap across the forehead
  const dome = () => { ctx.beginPath(); ctx.moveTo(cx - r * 0.96, cy - r * 0.1); ctx.bezierCurveTo(cx - r * 1.04, cy - r * 1.14, cx + r * 1.04, cy - r * 1.14, cx + r * 0.96, cy - r * 0.1); ctx.quadraticCurveTo(cx, cy - r * 0.98, cx - r * 0.96, cy - r * 0.1); ctx.closePath(); };
  dome(); ctx.fillStyle = vgrad(cy - r, cy - r * 0.3, capL, cap, capD); ctx.fill();
  ctx.save(); dome(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.1)'; for (let gy = -0.95; gy < -0.3; gy += 0.14) for (let gx = -1; gx < 1; gx += 0.14) circle(cx + (gx + ((gy * 100 | 0) % 2 ? 0.07 : 0)) * r, cy + gy * r, r * 0.022, ctx.fillStyle);
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = Math.max(1, r * 0.03); for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.97); ctx.quadraticCurveTo(cx + k * r * 1.1, cy - r * 0.8, cx + k * r * 1.5, cy - r * 0.3); ctx.stroke(); } ctx.restore();
  dome(); ctx.strokeStyle = capD; ctx.lineWidth = Math.max(1.4, r * 0.06); ctx.lineJoin = 'round'; ctx.stroke();
  circle(cx, cy - r * 0.97, r * 0.07, capL); ctx.strokeStyle = capD; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.arc(cx, cy - r * 0.97, r * 0.07, 0, TAU); ctx.stroke();
  const strap = () => { ctx.beginPath(); ctx.moveTo(cx - r * 0.95, cy - r * 0.1); ctx.quadraticCurveTo(cx, cy - r * 0.98, cx + r * 0.95, cy - r * 0.1); };
  strap(); ctx.strokeStyle = '#0c0f16'; ctx.lineWidth = r * 0.22; ctx.lineCap = 'butt'; ctx.stroke(); strap(); ctx.strokeStyle = '#3c424e'; ctx.lineWidth = r * 0.15; ctx.stroke(); // plastic adjustment strap
  for (let k = -3; k <= 3; k++) { const u = 0.5 + k * 0.085, y = (1 - u) * (1 - u) * (-0.1) + 2 * u * (1 - u) * (-0.98) + u * u * (-0.1), x = (1 - u) * (1 - u) * (-0.95) + u * u * 0.95; circle(cx + x * r, cy + y * r, r * 0.026, '#12151c'); } // strap holes
  if (glasses) { // sunglasses resting on top of the cap
    ctx.save(); ctx.translate(cx + r * 0.02, cy - r * 0.98); ctx.rotate(-0.08); ctx.lineJoin = 'round';
    for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * r * 0.32, 0); rr(-r * 0.27, -r * 0.16, r * 0.54, r * 0.32, r * 0.1); ctx.fillStyle = vgrad(-r * 0.16, r * 0.16, '#3a4256', '#0e121c'); ctx.fill(); ctx.strokeStyle = '#0a0d14'; ctx.lineWidth = r * 0.07; ctx.stroke(); ell(-r * 0.09, -r * 0.06, r * 0.1, r * 0.04, -0.4, 'rgba(255,255,255,.55)'); ctx.restore(); }
    ctx.strokeStyle = '#0a0d14'; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.moveTo(-r * 0.06, -r * 0.04); ctx.quadraticCurveTo(0, -r * 0.1, r * 0.06, -r * 0.04); ctx.stroke(); ctx.restore();
  }
}
function drawGoetti(x, y, s, wave) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#5b4636'; rr(-16, -50, 13, 50, 5); ctx.fill(); rr(3, -50, 13, 50, 5); ctx.fill();
  ctx.fillStyle = '#3b2a1e'; rr(-20, -8, 20, 8, 4); ctx.fill(); rr(1, -8, 20, 8, 4); ctx.fill();
  rr(-22, -105, 44, 60, 14); ctx.fillStyle = hgrad(-22, 22, '#93a85e', '#7a8f4a', '#56672f'); ctx.fill(); rr(-9, -104, 18, 58, 5); ctx.fillStyle = hgrad(-9, 9, '#ea6a58', '#d4503f', '#a93a2e'); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, -104); ctx.lineTo(-9, -48); ctx.moveTo(9, -104); ctx.lineTo(9, -48); ctx.stroke();
  rr(5, -92, 12, 12, 2); ctx.fillStyle = '#6a7d3c'; ctx.fill(); ctx.fillStyle = '#4a3020'; ctx.fillRect(-22, -52, 44, 6); rr(-5, -53, 10, 8, 1.5); ctx.fillStyle = '#e8c04a'; ctx.fill(); ctx.strokeStyle = '#8a6a1a'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#f4d58a'; for (let i = 0; i < 4; i++) circle(0, -96 + i * 11, 1.8, '#f4d58a'); ctx.strokeStyle = 'rgba(30,40,10,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(6, -86); ctx.lineTo(16, -86); ctx.stroke(); ctx.fillStyle = '#e8c04a'; ctx.fillRect(14, -92, 2, 4); rr(-21, -62, 6, 4, 1); ctx.fillStyle = '#5a6a30'; ctx.fill();
  ctx.strokeStyle = '#c8473a'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-18, -95); ctx.lineTo(-26, -58); ctx.stroke();
  const a = wave ? Math.sin(T * 6) * 0.4 : 0;
  ctx.beginPath(); ctx.moveTo(18, -95); ctx.lineTo(18 + Math.cos(-1.1 + a) * 36, -95 + Math.sin(-1.1 + a) * 36); ctx.stroke();
  circle(18 + Math.cos(-1.1 + a) * 40, -95 + Math.sin(-1.1 + a) * 40, 6, '#f0c49b');
  circle(-26, -54, 6, '#f0c49b');
  drawGoettiHead(0, -127, 26, true);
  ctx.restore();
}

function drawEgg(x, y, r, col, spot, glow = 0, rot = 0, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
  if (glow > 0) { const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.2); g.addColorStop(0, `rgba(255,240,150,${0.55 * glow})`); g.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.62, -r, r * 0.85, -r * 0.1, r * 0.8, r * 0.3);
  ctx.bezierCurveTo(r * 0.72, r * 0.85, r * 0.3, r, 0, r);
  ctx.bezierCurveTo(-r * 0.3, r, -r * 0.72, r * 0.85, -r * 0.8, r * 0.3);
  ctx.bezierCurveTo(-r * 0.85, -r * 0.1, -r * 0.62, -r, 0, -r);
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.stroke();
  circle(-r * 0.3, -r * 0.15, r * 0.16, spot); circle(r * 0.3, r * 0.2, r * 0.2, spot); circle(-r * 0.12, r * 0.55, r * 0.12, spot);
  ctx.globalAlpha = alpha * 0.5; ell(-r * 0.3, -r * 0.5, r * 0.13, r * 0.24, 0.3, '#fff');
  ctx.restore();
}
function drawAmber(x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  g.addColorStop(0, '#ffe08a'); g.addColorStop(0.6, '#ffa520'); g.addColorStop(1, '#c0601a');
  ctx.fillStyle = g; ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(120,50,0,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  circle(x - r * 0.3, y - r * 0.3, r * 0.2, 'rgba(255,255,255,.7)');
}
function drawHeart(x, y, s, full) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath();
  ctx.moveTo(0, 8); ctx.bezierCurveTo(-2, 6, -14, -1, -14, -8); ctx.bezierCurveTo(-14, -15, -5, -17, 0, -10);
  ctx.bezierCurveTo(5, -17, 14, -15, 14, -8); ctx.bezierCurveTo(14, -1, 2, 6, 0, 8);
  ctx.fillStyle = full ? vgrad(-16, 9, '#ff8a96', '#ff4d5e', '#d02a40') : 'rgba(0,0,0,.35)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  if (full) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-7, -9, 3.6, 2.2, -0.6, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(120,10,30,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-12, -4); ctx.bezierCurveTo(-8, 3, -2, 6, 0, 7); ctx.stroke(); }
  ctx.restore();
}

function drawPortrait(who, cx, cy, r, still) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const bg = { oli: '#d3e6fb', kiwi: '#e8f5d0', goetti: '#cfe3b0', chili: '#ffe0c2', rex: '#bfe6cf', mami: '#ead7f5', papi: '#d3e6fb', fabio: '#ffe6c4' }[who] || '#eee';
  ctx.fillStyle = bg; ctx.fill(); ctx.clip();
  if (who === 'goetti') { drawGoettiHead(cx, cy + r * 0.03, r * 0.58); }
  else if (who === 'chili') { const s = r / 26; drawChili(cx - 10 * s, cy + 30 * s, s, still ? 0 : T * 3); }
  else if (who === 'rex') { const s = r / 42; drawRex(cx - 88 * s, cy + 104 * s, s * 0.95, 0, 0.3 + 0.2 * Math.sin(T * 8)); }
  else if (who === 'mami' || who === 'papi') { const s = r / 34; drawLongneck(cx - 72 * s, cy + 146 * s, s, who === 'mami' ? '#b07cc6' : '#4f8fd6', T * 2); }
  else if (who === 'kiwi') { const s = r / 22; drawKiwi(cx - 16 * s, cy + 22 * s, s, T * 6); }
  else if (who === 'oli') { const k = r / 21; ctx.save(); ctx.translate(cx - 8 * k, cy + 44 * k); ctx.scale(k, k); drawOli(0, 0, 0.5, null, { kid: 'oli', hold: true, jacket: save.equip.jacket }); ctx.restore(); }
  else if (who === 'fabio') { const k = r / 21; ctx.save(); ctx.translate(cx - 8 * k, cy + 44 * k); ctx.scale(k, k); drawOli(0, 0, 0.5, null, { kid: 'fabio', hold: true, jacket: save.equip.fabioJacket }); ctx.restore(); }
  ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = '#6b4a2b'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}
