'use strict';
// Dino-Buch: card art, Steckbrief, book. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// ---------- card illustrations for the Dino-Buch (chibi style, feet at y=0, facing +x) ----------
function drawStego(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const col = vgrad(-60, 0, '#9ccf7a', '#6fae58', '#457a3a');
  for (const lx of [-26, -8, 14, 30]) { rr(lx - 6, -22, 12, 22, 5); ctx.fillStyle = shade('#5a8f48', lx < 0 ? 0.8 : 1); ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-30, -36); ctx.quadraticCurveTo(-60, -34, -78, -22); ctx.quadraticCurveTo(-52, -26, -28, -20); ctx.fill();
  ctx.fillStyle = '#f2f0f0'; for (const [tx, ty, an] of [[-62, -30, -0.9], [-70, -26, -0.5], [-56, -24, 0.3], [-66, -22, 0.7]]) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(an); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0, -15); ctx.lineTo(3, 0); ctx.fill(); ctx.restore(); }
  ell(0, -36, 38, 22, 0, col); ell(8, -26, 26, 8, 0, '#d8f0b8');
  ctx.fillStyle = '#f2994a'; ctx.strokeStyle = '#a85a1c'; ctx.lineWidth = 1.5; [[-26, 12], [-12, 17], [4, 19], [20, 16], [32, 11]].forEach(([px, h], i) => { ctx.beginPath(); ctx.moveTo(px - 8, -52 + i * 0.5); ctx.lineTo(px, -52 - h); ctx.lineTo(px + 8, -52 + i * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); });
  ell(46, -28, 15, 11, 0.15, col); circle(50, -32, 4.6, '#fff'); circle(51, -32, 2.7, '#222'); circle(51.8, -33.2, 1, '#fff'); ctx.strokeStyle = '#2f5a2a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(54, -25, 4, 0.2, 1.5); ctx.stroke();
  ctx.restore();
}
function drawMammoth(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fur = vgrad(-96, 0, '#c99562', '#94603a', '#5e3a22'), far = '#6e4528';
  for (const lx of [-34, 20]) { rr(lx - 9, -36, 18, 36, 8); ctx.fillStyle = far; ctx.fill(); ell(lx, -1, 10, 3.5, 0, '#e8d8c0'); } // far legs
  ctx.fillStyle = fur; ctx.beginPath(); ctx.moveTo(-52, -54); ctx.quadraticCurveTo(-66, -44, -60, -22); ctx.quadraticCurveTo(-52, -34, -46, -40); ctx.fill(); // tail
  ell(-60, -22, 5, 8, 0.1, '#4a2c18');
  ell(-2, -52, 52, 33, 0, fur); ell(18, -76, 28, 17, 0.15, fur); // body and the high head dome
  ctx.fillStyle = '#6e4528'; ctx.beginPath(); ctx.moveTo(-50, -34); for (let i = 0; i <= 9; i++) ctx.lineTo(-46 + i * 10, i % 2 ? -14 : -28); ctx.lineTo(44, -34); ctx.closePath(); ctx.fill(); // shaggy fringe
  ctx.strokeStyle = 'rgba(70,36,16,.45)'; ctx.lineWidth = 2; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(-40 + i * 10, -66 + (i % 3) * 3); ctx.quadraticCurveTo(-44 + i * 10, -52, -42 + i * 10, -42); ctx.stroke(); }
  for (const lx of [-14, 36]) { rr(lx - 10, -38, 20, 38, 9); ctx.fillStyle = fur; ctx.fill(); ctx.fillStyle = '#7a4a2c'; ctx.beginPath(); ctx.moveTo(lx - 10, -22); for (let i = 0; i < 4; i++) ctx.lineTo(lx - 10 + i * 6.7 + 3.3, -12); ctx.lineTo(lx + 10, -22); ctx.fill(); ell(lx, -1, 11, 3.8, 0, '#efe2c8'); }
  ell(46, -62, 22, 22, 0, fur); ell(32, -64, 10, 14, 0.3, '#7a4a2a'); // head and ear
  ctx.strokeStyle = '#a06a46'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(60, -58); ctx.quadraticCurveTo(76, -44, 70, -24); ctx.quadraticCurveTo(68, -14, 76, -12); ctx.stroke(); // trunk
  ctx.strokeStyle = 'rgba(60,30,15,.3)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(70 + i * 0.5, -46 + i * 8, 7, 0.4, 2.6); ctx.stroke(); }
  ctx.strokeStyle = '#fff1d0'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(52, -48); ctx.quadraticCurveTo(70, -22, 92, -34); ctx.quadraticCurveTo(98, -38, 98, -46); ctx.stroke(); // tusk
  ctx.strokeStyle = 'rgba(160,130,90,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(56, -44); ctx.quadraticCurveTo(72, -26, 90, -34); ctx.stroke();
  circle(51, -68, 5.4, '#fff'); circle(52.2, -68, 3.2, '#222'); circle(53, -69.4, 1.1, '#fff'); ctx.strokeStyle = '#4a2c18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(45, -76); ctx.quadraticCurveTo(51, -79, 56, -75); ctx.stroke();
  ctx.restore();
}
function drawAnkylo(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const col = vgrad(-50, 0, '#c2a27a', '#9a7d58', '#64502f');
  for (const lx of [-28, -10, 14, 32]) { rr(lx - 7, -16, 14, 16, 5); ctx.fillStyle = shade('#7c6444', lx < 0 ? 0.8 : 1); ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-34, -26); ctx.quadraticCurveTo(-60, -26, -70, -20); ctx.quadraticCurveTo(-50, -18, -32, -14); ctx.fill();
  circle(-72, -20, 11, '#8a8a92'); ctx.fillStyle = '#d8d8de'; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(-72 + Math.cos(a - .2) * 10, -20 + Math.sin(a - .2) * 10); ctx.lineTo(-72 + Math.cos(a) * 17, -20 + Math.sin(a) * 17); ctx.lineTo(-72 + Math.cos(a + .2) * 10, -20 + Math.sin(a + .2) * 10); ctx.fill(); }
  ell(0, -30, 44, 22, 0, col);
  for (let i = 0; i < 6; i++) { const px = -32 + i * 12.5; ctx.fillStyle = '#7c6444'; ctx.beginPath(); ctx.ellipse(px, -46 + Math.abs(i - 2.5) * 1.5, 7, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e8d8b0'; ctx.beginPath(); ctx.moveTo(px - 3, -48); ctx.lineTo(px, -57); ctx.lineTo(px + 3, -48); ctx.fill(); }
  ell(48, -22, 14, 10, 0.1, '#b89a70'); circle(52, -26, 4.4, '#fff'); circle(53, -26, 2.6, '#222'); circle(53.8, -27, 0.9, '#fff'); ctx.strokeStyle = '#4a3a20'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(56, -19, 3.5, 0.2, 1.5); ctx.stroke();
  ctx.restore();
}
function drawSpino(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const col = vgrad(-70, 0, '#6fb8c8', '#3f8ea6', '#27596b');
  for (const lx of [-8, 12]) { rr(lx - 6, -34, 12, 34, 5); ctx.fillStyle = shade('#3a7a90', lx < 0 ? 0.8 : 1); ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-26, -50); ctx.quadraticCurveTo(-60, -48, -84, -30); ctx.quadraticCurveTo(-58, -36, -26, -30); ctx.fill();
  ctx.fillStyle = '#f2994a'; ctx.beginPath(); ctx.moveTo(-26, -58); ctx.bezierCurveTo(-24, -92, 6, -100, 22, -60); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a85a1c'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = 'rgba(120,50,10,.5)'; ctx.lineWidth = 2; for (const [dx, h] of [[-14, 28], [-4, 36], [6, 34], [15, 26]]) { ctx.beginPath(); ctx.moveTo(dx, -58); ctx.lineTo(dx + 1, -58 - h); ctx.stroke(); }
  ell(0, -46, 34, 20, -0.1, col); ell(8, -36, 22, 7, -0.1, '#d6eef2');
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(24, -58); ctx.quadraticCurveTo(34, -72, 50, -68); ctx.lineTo(78, -62); ctx.quadraticCurveTo(84, -58, 78, -54); ctx.lineTo(48, -48); ctx.quadraticCurveTo(34, -44, 28, -40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(52 + i * 6, -54); ctx.lineTo(54.5 + i * 6, -49); ctx.lineTo(57 + i * 6, -54); ctx.fill(); }
  circle(45, -63, 5, '#fff'); circle(46, -63, 3, '#e8a317'); circle(46.6, -63, 1.6, '#111'); circle(47.4, -64.4, 0.9, '#fff');
  ctx.restore();
}
function drawChicken(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#f2a43a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-4, -14); ctx.lineTo(-6, 0); ctx.lineTo(-12, 0); ctx.moveTo(8, -14); ctx.lineTo(8, 0); ctx.lineTo(2, 0); ctx.stroke();
  ctx.fillStyle = '#f4f4f4'; for (const [dx, dy, an] of [[-22, -34, -0.9], [-26, -26, -0.5], [-24, -18, -0.1]]) { ctx.save(); ctx.translate(dx, dy); ctx.rotate(an); ell(-6, 0, 12, 5, 0, '#e8e8f0'); ctx.restore(); }
  ell(0, -28, 24, 20, 0, vgrad(-48, -8, '#ffffff', '#f2f2f6', '#cfd2dc')); ell(2, -24, 13, 9, -0.3, '#e4e6ee');
  circle(20, -48, 14, '#fff'); ctx.fillStyle = '#e53935'; for (const [dx, r] of [[12, 5], [19, 6.5], [26, 5]]) circle(dx, -61, r, '#e53935');
  ctx.fillStyle = '#f2a43a'; ctx.beginPath(); ctx.moveTo(30, -50); ctx.lineTo(42, -46); ctx.lineTo(30, -42); ctx.closePath(); ctx.fill();
  ell(30, -38, 3.4, 5, 0, '#e53935'); circle(22, -51, 3.8, '#fff'); circle(23, -51, 2.4, '#222'); circle(23.8, -52, 0.8, '#fff'); ell(26, -44, 3.4, 2, 0, 'rgba(255,120,130,.4)');
  ctx.restore();
}
function drawMeteor(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const g = ctx.createLinearGradient(-90, -90, 0, -30); g.addColorStop(0, 'rgba(255,90,20,0)'); g.addColorStop(0.6, 'rgba(255,150,40,.7)'); g.addColorStop(1, 'rgba(255,230,140,.95)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-96, -96); ctx.lineTo(-8, -52); ctx.lineTo(-20, -10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,200,90,.8)'; ctx.beginPath(); ctx.moveTo(-70, -80); ctx.lineTo(-10, -44); ctx.lineTo(-22, -30); ctx.closePath(); ctx.fill();
  ell(0, -32, 30, 26, 0.3, vgrad(-60, -6, '#8a7a72', '#5a4a46', '#2e2220')); circle(-8, -40, 6, '#3a2c28'); circle(10, -26, 5, '#3a2c28'); circle(2, -18, 3.4, '#3a2c28');
  ell(-8, -48, 11, 5, 0.4, 'rgba(255,255,255,.2)'); ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, -32, 30, 26, 0.3, Math.PI * 0.9, Math.PI * 1.6); ctx.stroke();
  for (const [dx, dy] of [[-60, -20], [-76, -34], [-50, -6]]) drawStar(dx, dy, 6, '#ffd34d');
  ctx.restore();
}
function drawFeathered(x, y, s) { // Sinosauropteryx: ginger fuzz all over, pale belly, very long tail with dark rings, short arms
  ctx.save(); ctx.translate(x, y); ctx.scale(s * 1.45, s * 1.45); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fur = vgrad(-60, 0, '#f0a550', '#d9822b', '#9a5416'), ring = '#fbead0';
  ctx.strokeStyle = '#7a4412'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(-8, -4); ctx.moveTo(10, -22); ctx.lineTo(13, -4); ctx.stroke();
  for (const fx of [-8, 13]) { ell(fx + 4, -2, 8, 3.4, 0, '#6a3a10'); }
  const tail = new Path2D(); tail.moveTo(-14, -42); tail.bezierCurveTo(-44, -46, -76, -38, -104, -20); tail.bezierCurveTo(-76, -28, -44, -24, -14, -22); tail.closePath(); // long tail
  ctx.fillStyle = fur; ctx.fill(tail); ctx.save(); ctx.clip(tail); ctx.fillStyle = ring; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(-26 - i * 10.5, -60); ctx.lineTo(-20 - i * 10.5, -60); ctx.lineTo(-14 - i * 10.5, -10); ctx.lineTo(-20 - i * 10.5, -10); ctx.fill(); } ctx.restore();
  ell(0, -34, 26, 17, -0.15, fur); ell(7, -28, 18, 8.5, -0.1, '#fbead0');
  ctx.strokeStyle = '#f3b970'; ctx.lineWidth = 1.8; for (let i = 0; i < 16; i++) { const a = -2.9 + i * 0.2, ex = Math.cos(a) * 25, ey = -34 + Math.sin(a) * 16; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a - 0.3) * 6, ey + Math.sin(a - 0.3) * 6); ctx.stroke(); } // fuzz
  ctx.strokeStyle = '#d9822b'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(18, -42); ctx.quadraticCurveTo(26, -52, 30, -60); ctx.stroke();
  ell(36, -63, 13, 9, 0.18, fur); ctx.fillStyle = '#d9822b'; ctx.beginPath(); ctx.moveTo(44, -69); ctx.quadraticCurveTo(56, -64, 58, -58); ctx.lineTo(44, -56); ctx.fill();
  ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(47 + i * 3.4, -57.6); ctx.lineTo(48.6 + i * 3.4, -54); ctx.lineTo(50.2 + i * 3.4, -57.4); ctx.fill(); }
  circle(40, -66, 4.4, '#fff'); circle(41, -66, 2.6, '#222'); circle(41.8, -67, 0.9, '#fff'); ctx.strokeStyle = '#7a4412'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(35, -72); ctx.quadraticCurveTo(40, -75, 45, -72); ctx.stroke();
  ctx.strokeStyle = '#a85e1a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(18, -34); ctx.lineTo(27, -24); ctx.stroke(); ctx.strokeStyle = '#fbead0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(27, -24); ctx.lineTo(31, -21); ctx.moveTo(27, -24); ctx.lineTo(30, -26); ctx.stroke(); // short arm
  ctx.restore();
}
function drawAmmonite(x, y, s) {
  ctx.save(); ctx.translate(x, y - 34 * s); ctx.scale(s, s);
  ctx.fillStyle = '#e8b878'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(24, 12 + i * 5); ctx.quadraticCurveTo(46, 14 + i * 7, 50, 28 + i * 3); ctx.lineWidth = 5; ctx.strokeStyle = '#d89850'; ctx.stroke(); }
  circle(0, 0, 32, vgrad(-32, 32, '#f6d9a0', '#e0a050')); ctx.lineWidth = 2.5; ctx.strokeStyle = '#8a5a20'; ctx.beginPath(); ctx.arc(0, 0, 32, 0, 7); ctx.stroke();
  ctx.strokeStyle = '#a8742c'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let a = 0; a < 12.6; a += 0.1) { const r = 3 + a * 2.2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke();
  ctx.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = i * 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); ctx.stroke(); }
  circle(36, 26, 5, '#fff'); circle(37, 26, 2.6, '#222'); ctx.restore();
}
function drawArchelon(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round';
  ctx.fillStyle = '#5fa08a'; ctx.beginPath(); ctx.ellipse(-34, -9, 22, 7, -0.45, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(34, -8, 26, 8, 0.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-48, -26, 14, 6, 0.9, 0, 7); ctx.fill(); // flippers
  ell(0, -32, 52, 30, 0, vgrad(-62, -2, '#a0d8b8', '#5aa078', '#2f6a4a'));
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, -32, 51, 29, 0, 0, 7); ctx.clip(); // leathery shell: seven long ridges and fine cross ribs, no hard plates
  ctx.strokeStyle = 'rgba(20,60,40,.55)'; ctx.lineWidth = 2.6; for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(-50, -32 + k * 7.5); ctx.quadraticCurveTo(0, -32 + k * 11, 50, -32 + k * 7.5); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(20,60,40,.28)'; ctx.lineWidth = 1.4; for (let u = -42; u <= 42; u += 9) { ctx.beginPath(); ctx.moveTo(u, -62); ctx.quadraticCurveTo(u + 3, -32, u, -2); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(30,80,56,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -30, 51, 27, 0, 0.1, Math.PI - 0.1); ctx.stroke(); // rim
  ctx.strokeStyle = '#6fb090'; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(44, -32); ctx.lineTo(56, -34); ctx.stroke();
  ell(62, -36, 16, 12, 0.05, '#6fb090'); ctx.fillStyle = '#3d7a5c'; ctx.beginPath(); ctx.moveTo(70, -40); ctx.quadraticCurveTo(82, -36, 76, -29); ctx.lineTo(66, -30); ctx.fill();
  circle(64, -41, 5, '#fff'); circle(65, -41, 2.8, '#222'); circle(65.8, -42, 1, '#fff'); ctx.strokeStyle = '#2f6a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(70, -32, 5, 0.2, 1.6); ctx.stroke();
  ctx.restore();
}
function drawFootprint(x, y, s) { // a sauropod track: big round hind foot with blunt toe pads, small crescent front foot
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ell(0, -22, 50, 22, 0, vgrad(-44, 0, '#b0a698', '#8a8070', '#5e564a')); ell(0, -26, 44, 17, 0, '#a89e90');
  ctx.fillStyle = '#4a4238'; ell(8, -24, 20, 12, -0.1, '#4a4238');
  for (const [tx, ty, an] of [[-12, -38, -0.5], [0, -42, -0.15], [13, -42, 0.2], [25, -36, 0.65]]) { ctx.save(); ctx.translate(tx + 6, ty); ctx.rotate(an); ctx.beginPath(); ctx.ellipse(0, 0, 5.4, 8, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2e2820'; ctx.beginPath(); ctx.ellipse(0, -6, 2.6, 2.6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#4a4238'; ctx.restore(); }
  ctx.beginPath(); ctx.ellipse(-30, -19, 7, 4.6, -0.2, 0.2, Math.PI * 1.2); ctx.fill();
  ctx.strokeStyle = '#5a7a3a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-40, -8); ctx.quadraticCurveTo(-46, -22, -38, -32); ctx.moveTo(-40, -8); ctx.quadraticCurveTo(-30, -20, -28, -30); ctx.stroke();
  ctx.restore();
}
function drawIchthyo(x, y, s) {
  ctx.save(); ctx.translate(x, y - 30 * s); ctx.scale(s, s);
  ctx.fillStyle = '#4f7fa8'; ctx.beginPath(); ctx.moveTo(-50, 0); ctx.quadraticCurveTo(-64, -22, -52, -32); ctx.quadraticCurveTo(-48, -12, -40, -6); ctx.quadraticCurveTo(-48, 10, -52, 24); ctx.quadraticCurveTo(-58, 12, -50, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6, -18); ctx.quadraticCurveTo(0, -42, 14, -36); ctx.quadraticCurveTo(8, -26, 6, -16); ctx.fill();
  ell(-4, 0, 48, 19, 0.05, vgrad(-20, 20, '#8ac0e0', '#4f86b0', '#2e5a82')); ell(2, 8, 36, 8, 0.05, '#d8ecf8');
  ctx.fillStyle = '#4f86b0'; ctx.beginPath(); ctx.moveTo(34, -8); ctx.lineTo(84, -3); ctx.lineTo(34, 5); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(48 + i * 8, 2); ctx.lineTo(51 + i * 8, 7); ctx.lineTo(54 + i * 8, 1); ctx.fill(); }
  ctx.fillStyle = '#3a6a94'; ctx.beginPath(); ctx.moveTo(12, 10); ctx.quadraticCurveTo(14, 28, 28, 30); ctx.quadraticCurveTo(24, 18, 22, 8); ctx.fill();
  circle(34, -6, 7, '#fff'); circle(36, -6, 4, '#222'); circle(37.4, -7.6, 1.4, '#fff'); ctx.restore();
}
function drawMosa(x, y, s) {
  ctx.save(); ctx.translate(x, y - 28 * s); ctx.scale(s, s); ctx.lineCap = 'round';
  ctx.strokeStyle = '#2f7a6a'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(-70, 12); ctx.bezierCurveTo(-46, -22, -22, 26, 6, -4); ctx.bezierCurveTo(24, -22, 36, -8, 48, -10); ctx.stroke();
  ctx.strokeStyle = '#4fb09a'; ctx.lineWidth = 12; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#2f7a6a'; ctx.beginPath(); ctx.moveTo(-70, 12); ctx.lineTo(-90, 0); ctx.lineTo(-84, 22); ctx.fill();
  ctx.fillStyle = '#3a8f7e'; ctx.beginPath(); ctx.ellipse(-6, 14, 12, 5, 0.9, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(20, -2, 11, 5, 0.9, 0, 7); ctx.fill();
  ctx.fillStyle = '#4fb09a'; ctx.beginPath(); ctx.moveTo(40, -20); ctx.quadraticCurveTo(60, -26, 84, -14); ctx.quadraticCurveTo(88, -6, 80, -2); ctx.lineTo(44, 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(52 + i * 6, -2); ctx.lineTo(54.5 + i * 6, 4); ctx.lineTo(57 + i * 6, -2); ctx.fill(); }
  circle(54, -15, 5.4, '#fff'); circle(55.6, -15, 3.2, '#e8a317'); circle(56.2, -15, 1.6, '#111'); ctx.restore();
}
function drawPlesio(x, y, s) {
  ctx.save(); ctx.translate(x, y - 24 * s); ctx.scale(s, s); ctx.lineCap = 'round';
  ctx.fillStyle = '#3d8a6a'; for (const [fx, fy, an] of [[-20, 12, 0.7], [-26, -8, -0.5], [18, 14, 0.6], [24, -8, -0.6]]) { ctx.save(); ctx.translate(fx, fy); ctx.rotate(an); ctx.beginPath(); ctx.ellipse(0, 12, 8, 20, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#3d8a6a'; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.quadraticCurveTo(-58, 6, -70, 20); ctx.quadraticCurveTo(-48, 12, -30, 12); ctx.fill();
  ell(0, 0, 40, 22, 0, vgrad(-22, 22, '#8ad4a8', '#4fae82', '#2f7a5a')); ell(0, 10, 30, 8, 0, '#d8f4e4');
  ctx.strokeStyle = '#4fae82'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(30, -10); ctx.quadraticCurveTo(52, -36, 46, -66); ctx.stroke(); ctx.strokeStyle = '#8ad4a8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(30, -14); ctx.quadraticCurveTo(50, -38, 44, -66); ctx.stroke();
  ell(54, -72, 16, 11, 0.15, '#4fae82'); circle(59, -76, 4.8, '#fff'); circle(60, -76, 2.8, '#222'); ctx.strokeStyle = '#2f7a5a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(63, -68, 4, 0.2, 1.6); ctx.stroke(); ctx.restore();
}
function drawQuetzal(x, y, s) {
  ctx.save(); ctx.translate(x, y - 38 * s); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = '#9a6048'; ctx.beginPath(); ctx.moveTo(16, -8); ctx.lineTo(24, -78); ctx.quadraticCurveTo(10, -58, -6, -74); ctx.quadraticCurveTo(0, -40, -16, -6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#5e3624'; ctx.lineWidth = 2; ctx.stroke(); // far wing
  ctx.strokeStyle = '#7a4a32'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-4, 14); ctx.lineTo(-26, 34); ctx.moveTo(6, 15); ctx.lineTo(-10, 38); ctx.stroke(); // trailing legs
  ctx.fillStyle = '#d49a78'; ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(-34, -64); ctx.quadraticCurveTo(-24, -36, -78, -32); ctx.quadraticCurveTo(-42, -8, -62, 16); ctx.quadraticCurveTo(-16, 6, 10, 10); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7a4a32'; ctx.lineWidth = 3; ctx.stroke(); // near wing
  ctx.fillStyle = 'rgba(120,60,36,.22)'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-40, -52); ctx.lineTo(-56, -30); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(-62, -28); ctx.lineTo(-52, 12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(100,50,30,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-62, -30); ctx.moveTo(-6, 0); ctx.lineTo(-48, 10); ctx.moveTo(-8, -4); ctx.lineTo(-34, -60); ctx.stroke();
  ell(10, 0, 28, 13, -0.1, vgrad(-13, 13, '#f0cdb0', '#c98f6c')); ell(14, 6, 18, 6, -0.1, '#f8e6d2');
  ctx.strokeStyle = '#e0aa88'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(28, -4); ctx.quadraticCurveTo(38, -8, 40, -10); ctx.stroke(); // neck
  ctx.fillStyle = '#e8b896'; ctx.beginPath(); ctx.moveTo(30, -14); ctx.lineTo(104, -12); ctx.lineTo(32, 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7a4a32'; ctx.lineWidth = 2.2; ctx.stroke(); // very long beak
  ctx.fillStyle = '#c9785c'; ctx.beginPath(); ctx.moveTo(34, 1); ctx.quadraticCurveTo(44, 12, 50, 2); ctx.fill(); // throat pouch
  ctx.fillStyle = '#e0553a'; ctx.beginPath(); ctx.moveTo(30, -18); ctx.quadraticCurveTo(14, -44, -14, -40); ctx.quadraticCurveTo(10, -26, 26, -8); ctx.fill(); ctx.strokeStyle = '#8a2a18'; ctx.lineWidth = 2; ctx.stroke(); // crest
  circle(38, -10, 5.4, '#fff'); circle(39.4, -10, 3.2, '#222'); circle(40.2, -11.4, 1.2, '#fff'); ctx.restore();
}
function drawArchaeo(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-58, 2); ctx.quadraticCurveTo(0, -4, 56, 0); ctx.stroke(); ctx.strokeStyle = '#8a6238'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-58, 0); ctx.quadraticCurveTo(0, -6, 56, -2); ctx.stroke(); // branch
  ctx.strokeStyle = '#7a8a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(34, -2); ctx.quadraticCurveTo(46, -14, 58, -12); ctx.stroke(); circle(60, -12, 4, '#6aa84f');
  for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(-20, -28); ctx.rotate(2.75 - i * 0.075); ctx.fillStyle = i % 2 ? '#3fa9a0' : '#e8873a'; ctx.beginPath(); ctx.ellipse(34, 0, 34, 5.2, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(40,20,10,.4)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); } // long tail feathers
  ctx.strokeStyle = '#d89a3a'; ctx.lineWidth = 4; for (const lx of [-6, 8]) { ctx.beginPath(); ctx.moveTo(lx, -22); ctx.lineTo(lx + 1, -6); ctx.moveTo(lx - 5, -2); ctx.lineTo(lx + 1, -6); ctx.lineTo(lx + 6, -2); ctx.stroke(); }
  ell(2, -34, 27, 19, -0.25, vgrad(-52, -14, '#5ccbb8', '#2f8a7e')); ell(10, -27, 15, 9, -0.25, '#f6e0b0');
  for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(-2, -42); ctx.rotate(-2.5 - i * 0.2); ctx.fillStyle = ['#e8873a', '#f2c13a', '#3fa9a0'][i % 3]; ctx.beginPath(); ctx.ellipse(-24, 0, 26, 6.2, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(40,20,10,.4)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); } // raised wing
  ctx.strokeStyle = '#3fa9a0'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(16, -44); ctx.quadraticCurveTo(26, -50, 28, -58); ctx.stroke();
  ell(30, -62, 14, 12, 0, '#3fa9a0'); ctx.fillStyle = '#f2c13a'; ctx.beginPath(); ctx.moveTo(38, -66); ctx.lineTo(56, -60); ctx.lineTo(38, -55); ctx.fill(); ctx.strokeStyle = '#a87a10'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(41 + i * 4.5, -58); ctx.lineTo(43 + i * 4.5, -54.5); ctx.lineTo(45 + i * 4.5, -58); ctx.fill(); }
  ctx.fillStyle = '#e8873a'; ctx.beginPath(); ctx.moveTo(22, -72); ctx.lineTo(18, -82); ctx.lineTo(28, -74); ctx.lineTo(28, -84); ctx.lineTo(34, -73); ctx.fill();
  circle(33, -65, 4.8, '#fff'); circle(34.2, -65, 2.8, '#222'); circle(35, -66.4, 1, '#fff'); ctx.restore();
}
function drawTheriz(x, y, s) { // upright pot-bellied biped: long neck, tiny beaked head, feathered body, arms hanging down with three huge claws
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const claw = (x0, y0, x1, y1, w, col) => { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, cx = (x0 + x1) / 2 + nx * L * 0.1, cy = (y0 + y1) / 2 + ny * L * 0.1;
    ctx.beginPath(); ctx.moveTo(x0 + nx * w, y0 + ny * w); ctx.quadraticCurveTo(cx + nx * w * 0.45, cy + ny * w * 0.45, x1, y1); ctx.quadraticCurveTo(cx - nx * w * 0.45, cy - ny * w * 0.45, x0 - nx * w, y0 - ny * w); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#7a6a48'; ctx.lineWidth = 1.8; ctx.stroke(); };
  const fur = vgrad(-90, -20, '#e3b184', '#b98258', '#8a5836');
  // far arm, hanging behind the belly
  ctx.strokeStyle = '#6f4528'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(8, -66); ctx.quadraticCurveTo(22, -52, 30, -38); ctx.stroke();
  claw(30, -38, 28, -8, 4.4, '#d8cdb6'); claw(36, -38, 42, -10, 4.2, '#d8cdb6');
  // short feathered tail with a tuft
  ctx.fillStyle = '#a8734c'; ctx.beginPath(); ctx.moveTo(-22, -50); ctx.quadraticCurveTo(-50, -48, -62, -32); ctx.quadraticCurveTo(-40, -34, -18, -28); ctx.fill();
  for (const [a, c] of [[-0.7, '#e8803a'], [-0.2, '#f2a63a'], [0.35, '#e8803a']]) { ctx.save(); ctx.translate(-60, -33); ctx.rotate(Math.PI + a); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(11, 0, 12, 4.2, 0, 0, 7); ctx.fill(); ctx.restore(); }
  // columnar hind legs with feathery trousers and four-toed feet
  ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(-10, -32); ctx.lineTo(-11, -7); ctx.moveTo(13, -32); ctx.lineTo(15, -7); ctx.stroke();
  ctx.fillStyle = '#c99062'; for (const lx of [-10, 13]) { ctx.beginPath(); ctx.ellipse(lx, -34, 12, 9, 0, 0, 7); ctx.fill(); }
  for (const fx of [-11, 15]) { ell(fx + 7, -3, 15, 5.5, 0, '#6a3d20'); ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 1.5; for (const tx of [4, 10, 16, 21]) { ctx.beginPath(); ctx.moveTo(fx + tx, -6); ctx.lineTo(fx + tx + 1, 0); ctx.stroke(); } }
  // torso leaning forward: heavy belly, scalloped feathers
  ctx.save(); ctx.translate(2, -54); ctx.rotate(-0.5); ell(0, 0, 33, 26, 0, fur);
  ctx.fillStyle = '#d29a6a'; for (let i = 0; i < 12; i++) { const a = -3.0 + i * 0.5, ex = Math.cos(a) * 32, ey = Math.sin(a) * 25; ctx.beginPath(); ctx.ellipse(ex, ey, 8, 5, a + 1.57, 0, 7); ctx.fill(); }
  ctx.restore();
  ell(12, -46, 20, 17, 0, '#f0d4ae'); ctx.strokeStyle = '#c99a6a'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(4 + (i % 3) * 12, -52 + Math.floor(i / 3) * 12, 5, 0.3, 2.8); ctx.stroke(); }
  // neck rising from the chest, small head with a horny beak
  ctx.strokeStyle = '#b98258'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(22, -70); ctx.quadraticCurveTo(38, -78, 40, -100); ctx.stroke();
  ctx.strokeStyle = '#d9a577'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(26, -72); ctx.quadraticCurveTo(39, -80, 41, -98); ctx.stroke();
  ell(46, -112, 12, 9.5, 0.2, '#b98258');
  ctx.fillStyle = '#f2c13a'; ctx.strokeStyle = '#a87a10'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(54, -116); ctx.lineTo(66, -110); ctx.lineTo(54, -105); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e8803a'; for (const [dx, dy, r] of [[-5, -13, -0.5], [0, -14, 0], [5, -12, 0.5]]) { ctx.save(); ctx.translate(44 + dx, -112 + dy); ctx.rotate(r); ctx.beginPath(); ctx.ellipse(0, -3, 2.4, 6.5, 0, 0, 7); ctx.fill(); ctx.restore(); }
  circle(50, -115, 3.8, '#fff'); circle(51, -115, 2.2, '#222'); circle(51.8, -116, 0.9, '#fff');
  // near arm: long, hanging down in front of the belly, ending in three huge sickle claws that point at the ground
  ctx.strokeStyle = '#8f5d3c'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(24, -68); ctx.quadraticCurveTo(50, -58, 56, -40); ctx.stroke();
  ctx.strokeStyle = '#b98258'; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(26, -67); ctx.quadraticCurveTo(49, -58, 54, -42); ctx.stroke();
  claw(52, -40, 48, -2, 6, '#fff8e6'); claw(58, -40, 62, -2, 6, '#fff8e6'); claw(64, -38, 76, -8, 5.4, '#fff8e6');
  ctx.restore();
}
const CARD_ART = [
  // [draw(x, y, s), width, height, offset x of the visual centre]  (calendar order, one per level)
  [(x, y, s) => drawRex(x, y, s, 0.4, 0.05, { noPlates: true }), 250, 150, -5],
  [(x, y, s) => drawTrike(x, y, s, '#c98f5a', 0.4, false), 120, 70, 2],
  [(x, y, s) => drawLongneck(x, y, s, '#7fb069', 0.4, false, { tall: true }), 220, 168, -6],
  [drawAmmonite, 90, 70, 2],
  [drawArchelon, 130, 62, 4],
  [drawFootprint, 120, 52, 0],
  [(x, y, s) => drawRaptor(x, y, s, 0.4, false, {}), 205, 105, -14],
  [(x, y, s) => drawPtero(x, y - 22 * s, s, 1.0, false, { noTeeth: true }), 96, 66, 14],
  [drawStego, 160, 80, -12],
  [drawIchthyo, 150, 70, 8],
  [drawMosa, 190, 72, -8],
  [drawPlesio, 150, 100, -2],
  [drawMammoth, 130, 80, 8],
  [drawAnkylo, 150, 62, -10],
  [(x, y, s) => { drawEgg(x - 26 * s, y - 22 * s, 20 * s, '#f6e7b0', '#6aa84f'); drawEgg(x + 22 * s, y - 20 * s, 18 * s, '#cfe8ff', '#e07b39', 0, 0.2); drawEgg(x - 2 * s, y - 14 * s, 14 * s, '#ffe9c2', '#d63a3a', 0, -0.15); }, 100, 50, 0],
  [drawQuetzal, 160, 70, 14],
  [drawArchaeo, 120, 76, 2],
  [drawTheriz, 120, 106, 8],
  [drawSpino, 178, 100, -2],
  [drawChicken, 80, 66, 8],
  [drawMeteor, 100, 80, -30],
  [(x, y, s) => { pine(x - 26 * s, y, 90 * s, '#2f6a50', true); pine(x + 28 * s, y, 66 * s, '#3b7d5c', false); }, 100, 90, 0],
  [(x, y, s) => { drawBaby(x, y, s * 1.5, 0.3, false); ctx.strokeStyle = '#d63a3a'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 6 * s, y - 64 * s); ctx.quadraticCurveTo(x + 14 * s, y - 56 * s, x + 24 * s, y - 62 * s); ctx.stroke(); }, 80, 90, 0],
  [drawFeathered, 110, 80, 0],
];
const cardCache = {};
const cardBox = [];
function cardSprite(i, silhouette) { // pre-rendered, outlined sticker art at 2x, auto-fitted to the card
  const key = i + (silhouette ? 's' : 'c'); if (cardCache[key]) return cardCache[key];
  const [fn, w, h, ox] = CARD_ART[i], R = 2, CW = 280, CH = 170, sc0 = Math.min(CW / (w + 14), CH / (h + 14)), old = ctx, oldT = T;
  // 1) probe: draw once on a big canvas and measure the real bounding box, so nothing is cropped or tiny
  const BW = CW * 3, BH = CH * 3, probe = document.createElement('canvas'); probe.width = BW; probe.height = BH;
  const fx0 = BW / 2 - ox * sc0, fy0 = BH / 2 + h * sc0 / 2;
  ctx = probe.getContext('2d'); T = 1; try { fn(fx0, fy0, sc0); } finally { ctx = old; T = oldT; }
  const d = probe.getContext('2d').getImageData(0, 0, BW, BH).data; let x0 = BW, y0 = BH, x1 = 0, y1 = 0;
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (d[(y * BW + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const bw = Math.max(1, x1 - x0 + 1), bh = Math.max(1, y1 - y0 + 1), f = Math.min((CW - 44) / bw, (CH - 56) / bh, 2.4), cx0 = CW / 2, cy0 = CH * 0.47;
  cardBox[i] = { w: bw * f, h: bh * f, cy: cy0 }; // the animal's real extent inside the 280 x 170 sprite (the size ruler and habitat scene use it)
  const fx = cx0 + (fx0 - (x0 + x1) / 2) * f, fy = cy0 + (fy0 - (y0 + y1) / 2) * f;
  // 2) final art at 2x
  const c = document.createElement('canvas'); c.width = CW * R; c.height = CH * R;
  const art = document.createElement('canvas'); art.width = c.width; art.height = c.height;
  ctx = art.getContext('2d'); ctx.setTransform(R, 0, 0, R, 0, 0); T = 1;
  try { fn(fx, fy, sc0 * f); } finally { ctx = old; T = oldT; }
  const sil = document.createElement('canvas'); sil.width = c.width; sil.height = c.height; const sx = sil.getContext('2d');
  sx.drawImage(art, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = silhouette ? 'rgba(90,70,45,.55)' : '#1b120c'; sx.fillRect(0, 0, sil.width, sil.height);
  const cx = c.getContext('2d');
  if (!silhouette) { // soft light behind the animal and a contact shadow, so it pops off any card colour
    cx.save(); cx.translate(cx0 * R, cy0 * R); cx.scale(1.7, 1); const g = cx.createRadialGradient(0, 0, 8, 0, 0, 80 * R); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g; cx.fillRect(-CW * R, -CH * R, CW * R * 2, CH * R * 2); cx.restore();
    cx.fillStyle = 'rgba(30,20,10,.2)'; cx.beginPath(); cx.ellipse(cx0 * R, (cy0 + bh * f / 2 + 3) * R, bw * f * 0.36 * R, 6 * R, 0, 0, Math.PI * 2); cx.fill();
  }
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; cx.drawImage(sil, Math.cos(a) * 4, Math.sin(a) * 4); }
  if (silhouette) cx.drawImage(sil, 0, 0); else cx.drawImage(art, 0, 0);
  return cardCache[key] = c;
}
function drawCardArt(i, cx, cy, w, silhouette) { const c = cardSprite(i, silhouette), h = w * 170 / 280; ctx.drawImage(c, cx - w / 2, cy - h / 2, w, h); }

// dev-only character sheets: window.__dino.sheet('rex' | 'hero' | 'cast' | 'react' | 'faces')
let sheetPage = 'hero';
function drawSheet() {
  ctx.fillStyle = '#d8e6d6'; ctx.fillRect(0, 0, W, H);
  const row = (y, label) => { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, y, W, 2); txt(label, 14, y - 10, 14, '#3b2410', 'left'); };
  const t = T * 8, fx = o => Object.assign(chiliFx, { vy: 0, dig: false, scared: 0, joy: 0 }, o);
  if (sheetPage === 'appicon') { // 256 x 256 logical px (screenshot at 4x gives the 1024 master). Everything important sits inside the central 80 % circle so the same art works as a maskable icon
    const S = 256, EX = 178, EY = 84;
    const sk = ctx.createLinearGradient(0, 0, 0, S); sk.addColorStop(0, '#071a44'); sk.addColorStop(0.42, '#17566e'); sk.addColorStop(0.78, '#3f9c84'); sk.addColorStop(1, '#8fd19a'); ctx.fillStyle = sk; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.35 + 0.6 * hash(i + 3); circle(hash(i) * S, hash(i + 50) * 120, hash(i + 9) < 0.15 ? 1.5 : 0.8, '#fff'); } ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(EX, EY); for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = 'rgba(255,230,140,.13)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-13, -300); ctx.lineTo(13, -300); ctx.fill(); } ctx.restore();
    const hg = ctx.createRadialGradient(EX, EY, 8, EX, EY, 120); hg.addColorStop(0, 'rgba(255,236,150,.85)'); hg.addColorStop(0.4, 'rgba(255,200,90,.35)'); hg.addColorStop(1, 'rgba(255,200,90,0)'); ctx.fillStyle = hg; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#1b5f63'; ctx.beginPath(); ctx.moveTo(0, 176); ctx.quadraticCurveTo(50, 118, 112, 160); ctx.quadraticCurveTo(170, 126, 256, 168); ctx.lineTo(256, S); ctx.lineTo(0, S); ctx.fill();
    ctx.fillStyle = '#0f4448'; ctx.beginPath(); ctx.moveTo(0, 196); ctx.quadraticCurveTo(70, 156, 140, 190); ctx.quadraticCurveTo(200, 168, 256, 192); ctx.lineTo(256, S); ctx.lineTo(0, S); ctx.fill();
    palm(22, 218, 128, '#0a3033'); palm(240, 218, 104, '#0a3033');
    ctx.fillStyle = vgrad(206, S, '#58b844', '#2f7d30'); ctx.fillRect(0, 206, S, 12); ctx.fillStyle = vgrad(216, S, '#6a4528', '#2e1c0e'); ctx.fillRect(0, 216, S, 40);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(0, 206, S, 2);
    circle(EX, EY, 46, 'rgba(255,236,150,.35)'); drawEgg(EX, EY, 39, '#ffd34a', '#fff3b0', 1.4, 0.1);
    for (const [sx, sy, sr] of [[EX - 52, EY - 34, 8], [EX + 50, EY - 18, 6], [EX + 36, EY + 50, 5], [EX - 36, EY + 44, 4]]) drawStar(sx, sy, sr, '#fff6c0');
    shadow(116, 216, 62, 0.3);
    oRex(116, 214, 0.68, 0.5, 0.3, Object.assign(rexLook(0), { rider: true, hat: null, hat2: null }));
    for (let i = 0; i < 18; i++) { const fx = hash(i + 80) * S, fy = 150 + hash(i + 95) * 56; const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 5); g.addColorStop(0, 'rgba(255,245,170,.9)'); g.addColorStop(1, 'rgba(255,245,170,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, 5, 0, 7); ctx.fill(); }
    const vg = ctx.createRadialGradient(S / 2, S / 2, 100, S / 2, S / 2, 190); vg.addColorStop(0, 'rgba(0,0,10,0)'); vg.addColorStop(1, 'rgba(0,0,10,.38)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, S, S);
    return;
  }
  if (sheetPage === 'icons') { // every UI icon, large
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(0, 0, W, H);
    ['book', 'amber', 'loop', 'trophy', 'scroll', 'star', 'back', 'lock', 'check', 'play', 'gear', 'sound', 'mute', 'pause', 'duck', 'stomp', 'dash', 'roar', 'fire'].forEach((k, i) => { const x = 60 + (i % 10) * 90, y = 60 + Math.floor(i / 10) * 100; ctx.fillStyle = ['duck', 'stomp', 'dash', 'roar', 'fire', 'pause'].includes(k) ? '#3a7ee0' : 'rgba(0,0,0,0)'; if (ctx.fillStyle !== 'rgba(0, 0, 0, 0)') { ctx.beginPath(); ctx.arc(x, y, 38, 0, 7); ctx.fill(); } ico(k, x, y, 56); txt(k, x, y + 46, 13, '#3b2410'); });
    [1, 0].forEach((f, i) => drawHeart(80 + i * 80, 330, 2.4, !!f)); drawAmber(260, 330, 34); [0, 1, 2].forEach(k => drawMedal(380 + k * 90, 345, 30, k, true)); drawMedal(660, 345, 30, 1, false);
    drawEgg(780, 330, 30, '#f6e7b0', '#6aa84f');
    if (G === null || scene === 'sheet') { actBtn(110, 450, 54, '#3a7ee0', 'duck', 'DUCKEN', 17); actBtn(260, 460, 46, '#ec8a18', 'dash', 'FLITZ', 17); actBtn(420, 450, 66, '#d63a28', 'roar', 'BRÜLL!', 24); actBtn(590, 450, 66, '#ff6a14', 'fire', 'FEUER!', 24); actBtn(760, 450, 54, '#3a7ee0', 'stomp', 'STAMPF!', 17); } return;
  }
  if (sheetPage === 'wardrobe') { // every hat on Oli (top) and Fabio (bottom), then the jackets
    const hs = HATS.filter(h => h.k);
    hs.forEach((h, i) => { const x = 60 + (i % 8) * 116, y = 190 + Math.floor(i / 8) * 190; ctx.save(); ctx.translate(x, y); ctx.scale(1.9, 1.9); drawOli(0, 0, 0.5, h.k, i % 2 ? { kid: 'fabio' } : {}); ctx.restore(); txt(h.n, x, y + 36, 12, '#3b2410', 'center'); });
    return;
  }
  if (sheetPage.startsWith('cards')) { // the collectible card art, 12 per page
    const pg = +sheetPage.slice(5) || 0; for (let k = 0; k < 12; k++) { const i = pg * 12 + k; if (i >= CARD_ART.length) break; const cx = 130 + (k % 4) * 233, cy = 90 + Math.floor(k / 4) * 170; rr(cx - 114, cy - 80, 228, 160, 10); ctx.fillStyle = '#f5ecd0'; ctx.fill(); drawCardArt(i, cx, cy, 220); txt(i + '', cx - 104, cy - 66, 11, '#3b2410', 'left'); }
    return;
  }
  if (sheetPage === 'chili') { // Chili with every accessory
    CHILI_ITEMS.forEach((it, i) => { fx({}); const x = 90 + i * 125; ctx.save(); ctx.translate(x, 200); ctx.scale(2.4, 2.4); drawChili(0, 0, 1, 0.3, false); drawChiliAcc(it.k); ctx.restore(); txt(it.n, x, 250, 12, '#3b2410', 'center'); });
    return;
  }
  if (sheetPage === 'rex') {
    oRex(250, 330, 2.2, t, 0.05, Object.assign(rexLook(0), { rider: true }));
    oRex(700, 330, 2.2, t, 1, Object.assign(rexLook(0), {}));
    oRex(130, 510, 0.9, 0.8, 0.05, Object.assign(rexLook(0), { rider: true, air: true, vy: -300, sq: -0.06 }));
    oRex(420, 510, 0.9, 0, 0.05, Object.assign(rexLook(0), { rider: true, duck: true }));
    oRex(700, 510, 0.9, t, 0.3, Object.assign(rexLook(0), { fire: true }));
  } else if (sheetPage === 'faces') {
    row(300, 'OLI hats: none / santa / cowboy / astro');
    [null, 'santa', 'cowboy', 'astro'].forEach((h, i) => { ctx.save(); ctx.translate(90 + i * 150, 250); ctx.scale(3.6, 3.6); drawOli(0, 0, 0.5, h, {}); ctx.restore(); });
    drawGoettiHead(790, 160, 90, true);
    row(520, 'PROFESSOR GOETTI portraits + full body');
    drawPortrait('goetti', 100, 440, 60); oGoetti(300, 530, 1.0, true); drawPortrait('goetti', 500, 450, 40);
  } else if (sheetPage === 'react') {
    row(200, 'CHILI  idle / scared / happy / digging');
    fx({}); oChili(120, 190, 2.6, t, false); fx({ scared: 1 }); oChili(330, 190, 2.6, t, false); fx({ joy: 1 }); oChili(540, 170, 2.6, t, false); fx({ dig: true }); oChili(760, 190, 2.6, t, false); fx({});
    row(450, 'PTERODACTYL  flap phases');
    [0, 1.2, 3.14, 4.4].forEach((ph, i) => oPtero(120 + i * 220, 340, 2.2, ph, false)); oPtero(900, 340, 1.4, t, false);
  } else if (sheetPage === 'hero') {
    row(235, 'REX  run / jump / roar / duck / fire');
    oRex(110, 225, 0.8, t, 0.05, Object.assign(rexLook(0), { rider: true }));
    oRex(300, 225, 0.8, 0.8, 0.05, Object.assign(rexLook(0), { rider: true, air: true, vy: -300, sq: -0.06 }));
    oRex(500, 225, 0.8, t, 1, Object.assign(rexLook(0), { rider: true }));
    oRex(690, 225, 0.8, 0, 0.05, Object.assign(rexLook(0), { rider: true, duck: true }));
    oRex(850, 225, 0.55, t, 0.3, Object.assign(rexLook(0), { fire: true }));
    row(500, 'OLI (plain / santa hat)   CHILI (run / jump / sniff)   BABY');
    ctx.save(); ctx.translate(70, 475); ctx.scale(2.2, 2.2); drawOli(0, 0, t, null, {}); ctx.restore();
    ctx.save(); ctx.translate(190, 475); ctx.scale(2.2, 2.2); drawOli(0, 0, t, 'santa', {}); ctx.restore();
    fx({}); oChili(330, 480, 1.9, t, false); fx({ vy: -500 }); oChili(480, 455, 1.9, t, false); fx({ dig: true }); oChili(630, 480, 1.9, t, false); fx({});
    oBaby(790, 480, 1.4, t, false);
  } else if (sheetPage === 'wounds') {
    [0, 0.4, 0.7, 1].forEach((d, c) => { const x = 120 + c * 240; txt('dmg ' + d + (d === 1 ? ' + K.O.' : ''), x, 22, 14, '#3b2410', 'center');
      drawCrabKing(x, 150, 0.8, T * 6, false, { dmg: d, ko: d === 1, wid: 'c' + c }); drawKraken(x, 290, 0.58, T * 6, false, { dmg: d, ko: d === 1, wid: 'k' + c }); drawQueen(x - 10, 395, 0.75, T * 6, false, { dmg: d, ko: d === 1, wid: 'q' + c }); oRaptor(x - 10, 520, 1.5, t, false, { col: ['#8b1a1a', '#7a3a1a', '#5a2a7a', '#b01c10'][c], dark: '#4a0a0a', crown: true, dmg: d, ko: d === 1, wid: 'r' + c }); });
  } else if (sheetPage === 'boss') {
    row(270, 'CRAB KING / KRAKEN / QUEEN / small crab');
    drawCrabKing(170, 262, 0.95, T * 6, false); drawKraken(480, 262, 0.8, T * 6, false); drawQueen(790, 262, 1.0, T * 6, false); drawSmallCrab(920, 262, { ph: T });
    row(520, 'RAPTOR BOSS / PTERO');
    oRaptor(200, 500, 2.4, t, false, { col: '#8b1a1a', dark: '#4a0a0a', crown: true }); oPtero(560, 420, 3.2, t * 0.5, false); oCompy(800, 500, 2.6, t, false, {});
  } else {
    row(215, 'RAPTOR / BOSS / PTERO / COMPY');
    oRaptor(150, 205, 1.3, t, false, {}); oRaptor(400, 205, 1.3, t, false, { col: '#8b1a1a', dark: '#4a0a0a', crown: true });
    oPtero(600, 120, 1.5, t, false); oCompy(760, 205, 1.9, t, false, {}); oBaby(900, 205, 1.3, t, false);
    row(385, 'GOETTI / KIWI / LONGNECK / TRIKE');
    oGoetti(70, 375, 0.8, true); oKiwi(200, 370, 1.6, t, false); oLong(470, 375, 0.8, '#7fb069', t, false); oTrike(730, 375, 1.3, '#c98f5a', t, false);
    row(430, 'PORTRAITS');
    ['goetti', 'chili', 'rex', 'mami', 'papi', 'fabio', 'kiwi'].forEach((w, i) => drawPortrait(w, 70 + i * 130, 485, 38));
  }
}
function openBookCard(i) { bookMode = 'grid'; bookSel = i; if (!save.bookSeen) save.bookSeen = []; save.bookSeen[i] = true; writeSave(); go('book'); }
let bookSel = -1, bookTapped = false, bookMode = 'grid', lineScroll = 0, lineTarget = 0, lineDrag = null, lineHits = [], lineLayout = null; const bookAnim = { sel: -1, t: 0 }, bookRoar = { t: -9, i: -1 };
function bookUnread() { const seen = save.bookSeen || []; return save.lvDone.reduce((n, d, i) => n + (d && !seen[i] ? 1 : 0), 0); } // found cards not yet opened in the Dino-Buch
function leatherCover() {
  ctx.fillStyle = vgrad(0, H, '#6a4528', '#4f3119', '#33200f'); ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1; for (let i = 0; i < 260; i++) { const x = hash(i) * W, y = hash(i + 7) * H; ctx.beginPath(); ctx.arc(x, y, 1 + hash(i + 3) * 2, 0, 6.3); ctx.stroke(); } ctx.restore();
  ctx.setLineDash([9, 7]); ctx.lineWidth = 2.5; ctx.strokeStyle = '#d4a85a'; rr(9, 9, W - 18, H - 18, 18); ctx.stroke(); ctx.setLineDash([]);
  for (const [x, y] of [[9, 9], [W - 9, 9], [9, H - 9], [W - 9, H - 9]]) { circle(x, y, 9, '#d6b36a'); circle(x - 2, y - 2, 3, '#fff3c0'); }
  // page block with a visible page edge
  rr(24, 26, W - 44, H - 40, 14); ctx.fillStyle = '#d9c597'; ctx.fill();
  rr(20, 20, W - 40, H - 40, 14); ctx.fillStyle = vgrad(20, H, '#f8ebc8', '#f3e2bf', '#e8d4a4'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#a88a52'; ctx.stroke();
}
// ---------- Dino-Buch "Steckbrief": era, diet and a size comparison with a child ----------
const STECK = [ // order = FACTS. nm/nl: the "Name bedeutet" chip (nl overrides its label); m: metres for the ruler (0 = custom comparison)
  { tl: [68, 66], l: 'Lebte vor', e: '68 Mio. Jahren', d: 'Fleisch', dk: 'meat', m: 12, nm: '«König der Tyrannen-Echsen»' },
  { tl: [68, 66], l: 'Lebte vor', e: '68 Mio. Jahren', d: 'Pflanzen', dk: 'leaf', m: 9, nm: '«Dreihorn-Gesicht»' },
  { tl: [154, 150], l: 'Lebte vor', e: '150 Mio. Jahren', d: 'Pflanzen', dk: 'leaf', m: 25, nm: '«Arm-Echse» (lange Vorderbeine)' },
  { tl: [400, 66], l: 'Lebte vor', e: '400–66 Mio. Jahren', d: 'Plankton', dk: 'fish', m: 0.3, ml: 'Meist', nm: '«Ammons Horn» (Gott Amun)' },
  { tl: [75, 66], l: 'Lebte vor', e: '75 Mio. Jahren', d: 'Quallen', dk: 'fish', m: 4.6, nm: '«Herrscher-Schildkröte»' },
  { tl: [152, 148], l: 'Spuren von vor', e: '150 Mio. Jahren', d: '–', dk: 'none', m: 0.5, ml: 'Abdruck', nl: 'Fachwort', nm: 'Spurenfossil' },
  { tl: [75, 71], l: 'Lebte vor', e: '75 Mio. Jahren', d: 'Fleisch', dk: 'meat', m: 2, nm: '«Schneller Räuber»' },
  { tl: [86, 84], l: 'Lebte vor', e: '85 Mio. Jahren', d: 'Fische', dk: 'fish', m: 6, ml: 'Spannweite', nm: '«Flügel ohne Zähne»' },
  { tl: [155, 150], l: 'Lebte vor', e: '150 Mio. Jahren', d: 'Pflanzen', dk: 'leaf', m: 9, nm: '«Dach-Echse»' },
  { tl: [200, 190], l: 'Lebte vor', e: '200 Mio. Jahren', d: 'Fische', dk: 'fish', m: 3, nm: '«Fisch-Echse»' },
  { tl: [82, 66], l: 'Lebte vor', e: '75 Mio. Jahren', d: 'Fleisch', dk: 'meat', m: 12, nm: '«Maas-Echse» (Fundort Maastricht)' },
  { tl: [200, 175], l: 'Lebte vor', e: '200 Mio. Jahren', d: 'Fische', dk: 'fish', m: 4, nm: '«Fast-Echse»' },
  { tl: [0.4, 0.004], l: 'Starb aus vor', e: '4000 Jahren', d: 'Pflanzen', dk: 'leaf', m: 4, nl: 'Fachname', nm: 'Mammuthus primigenius' },
  { tl: [68, 66], l: 'Lebte vor', e: '68 Mio. Jahren', d: 'Pflanzen', dk: 'leaf', m: 7, nm: '«Verwachsene Echse»' },
  { tl: [80, 66], l: 'Gelegt vor', e: '70 Mio. Jahren', d: '–', dk: 'none', m: 0.6, ml: 'Gelege', nl: 'Fachwort', nm: 'Oologie = Eier-Forschung' },
  { tl: [68, 66], l: 'Lebte vor', e: '68 Mio. Jahren', d: 'Fleisch', dk: 'meat', m: 10, ml: 'Spannweite', nm: '«Gefiederte Schlange» (Aztekengott)' },
  { tl: [150, 148], l: 'Lebte vor', e: '150 Mio. Jahren', d: 'Insekten', dk: 'meat', m: 0.5, nm: '«Alte Feder»' },
  { tl: [70, 66], l: 'Lebte vor', e: '70 Mio. Jahren', d: 'Pflanzen', dk: 'leaf', m: 10, nm: '«Sichel-Echse»' },
  { tl: [99, 93], l: 'Lebte vor', e: '95 Mio. Jahren', d: 'Fische', dk: 'fish', m: 14, nm: '«Dornen-Echse»' },
  { tl: [0, 0], l: 'Lebt', e: 'heute noch', d: 'Alles', dk: 'all', m: 0.5, nl: 'Fachname', nm: 'Gallus gallus' },
  { tl: [66, 66], l: 'Schlug ein vor', e: '66 Mio. Jahren', d: '–', dk: 'none', m: 0, cmp: 'everest', txt: 'Etwa 10 km breit – breiter, als der Mount Everest hoch ist!', nl: 'Einschlag bei', nm: 'Chicxulub in Mexiko' },
  { tl: [300, 0], l: 'Gibt es seit', e: '300 Mio. Jahren', d: 'Sonne', dk: 'sun', m: 30, ml: 'Höhe', fb: 1, nl: 'Fachwort', nm: 'Koniferen = Zapfenträger' },
  { tl: [118, 110], l: 'Lebte vor', e: '110 Mio. Jahren', d: 'Pflanzen', dk: 'leaf', m: 1, nl: 'Bekanntester Polar-Dino', nm: 'Leaellynasaura' },
  { tl: [125, 120], l: 'Lebte vor', e: '125 Mio. Jahren', d: 'Fleisch', dk: 'meat', m: 1, nl: 'Erster Feder-Dino', nm: 'Sinosauropteryx (China)' },
];
function drawKid(x, base, h) { // a child silhouette, h pixels tall, standing at x
  const u = h / 100; ctx.save(); ctx.translate(x, base); ctx.scale(u, u);
  ctx.fillStyle = '#2f4a78'; rr(-9, -42, 7, 42, 3); ctx.fill(); rr(2, -42, 7, 42, 3); ctx.fill();
  ctx.fillStyle = '#d8483a'; rr(-13, -72, 26, 34, 8); ctx.fill(); ctx.fillStyle = '#f0c9a0'; circle(0, -84, 13, '#f0c9a0'); ctx.fillStyle = '#e9c25e'; ctx.beginPath(); ctx.arc(0, -88, 13.5, Math.PI, 0); ctx.fill(); circle(-14, -82, 5, '#e9c25e'); circle(14, -82, 5, '#e9c25e');
  ctx.strokeStyle = '#d8483a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-13, -66); ctx.lineTo(-20, -44); ctx.moveTo(13, -66); ctx.lineTo(20, -44); ctx.stroke(); ctx.restore();
}
function drawSizeRuler(x, y, w, h, st, th, ci) {
  rr(x, y, w, h, 14); ctx.fillStyle = 'rgba(255,250,235,.9)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#b8a070'; ctx.stroke();
  if (st.cmp === 'everest') { // meteorite vs. mountain, 5 px per km
    txt('Grösse im Vergleich', x + 16, y + 17, 13, '#8a6a3a', 'left', 'normal');
    const k = 5, bs = y + h - 32, mx = x + w * 0.3, cx = x + w * 0.7;
    wrapLines(st.txt, w - 32, 14).forEach((l, i) => txt(l, x + w / 2, y + 40 + i * 17, 14, '#3b2410', 'center', 'normal'));
    ctx.fillStyle = '#8f98a6'; ctx.beginPath(); ctx.moveTo(mx - 40, bs); ctx.lineTo(mx, bs - 8.8 * k); ctx.lineTo(mx + 40, bs); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#4a525e'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    const ty = bs - 8.8 * k; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(mx - 9, ty + 14); ctx.lineTo(mx, ty); ctx.lineTo(mx + 9, ty + 14); ctx.lineTo(mx + 3, ty + 11); ctx.lineTo(mx - 2, ty + 15); ctx.closePath(); ctx.fill();
    circle(cx, bs - 5 * k, 5 * k, '#6b5a4a'); circle(cx - 8, bs - 5 * k - 8, 6, 'rgba(255,255,255,.14)'); ctx.strokeStyle = '#2b1a0c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, bs - 5 * k, 5 * k, 0, 7); ctx.stroke();
    txt('Mount Everest: 8,8 km', mx, y + h - 14, 12, '#3b2410', 'center'); txt('Meteorit: 10 km', cx, y + h - 14, 12, '#3b2410', 'center');
    return;
  }
  const m = st.m >= 10 ? Math.round(st.m) : String(st.m).replace('.', ','), kids = Math.max(1, Math.round(st.m / 1.4));
  txt(`${st.ml || 'Länge'}: ${m} m`, x + 16, y + 20, 20, '#3b2410', 'left');
  txt(st.m < 1 ? 'kleiner als ein Kind' : `so lang wie ${kids} ${kids === 1 ? 'Kind' : 'Kinder'}`, x + w - 16, y + 20, 14, '#6b4a2b', 'right', 'normal');
  const base = y + h - 26, kx = x + 30;
  ctx.strokeStyle = 'rgba(138,106,58,.35)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x + 14, base + 1); ctx.lineTo(x + w - 14, base + 1); ctx.stroke(); ctx.setLineDash([]);
  const box = !st.fb && cardBox[ci] ? cardBox[ci] : null;
  if (box) { // the real animal, drawn to scale next to a child, facing it
    const ppm = Math.min(48, (w - 76) / st.m, (base - (y + 34)) / (st.m * box.h / box.w)), dw = st.m * ppm, k = dw / box.w, dx = kx + 22;
    drawKid(kx, base, Math.max(11, 1.4 * ppm));
    ctx.save(); ctx.translate(dx + dw / 2, 0); ctx.scale(-1, 1); ctx.drawImage(cardSprite(ci, false), -140 * k, base - (box.cy + box.h / 2) * k + 2, 280 * k, 170 * k); ctx.restore();
    if (dw > 34) { ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(dx, base + 7); ctx.lineTo(dx, base + 13); ctx.moveTo(dx, base + 10); ctx.lineTo(dx + dw, base + 10); ctx.moveTo(dx + dw, base + 7); ctx.lineTo(dx + dw, base + 13); ctx.stroke(); if (dw > 70) { rr(dx + dw / 2 - 20, base + 3, 40, 14, 7); ctx.fillStyle = 'rgba(255,250,235,1)'; ctx.fill(); txt(`${m} m`, dx + dw / 2, base + 10.5, 11, '#6b4a2b'); } }
    return;
  }
  // fallback (a tree is taller than wide): bar with a chain of children
  const sc = Math.min(48, (w - 44) / st.m), len = st.m * sc, bx = x + 22, bh = Math.max(10, Math.min(26, sc * 0.9)), by = base - bh, bl = Math.max(8, len);
  rr(bx, by, bl, bh, bh / 2); ctx.fillStyle = vgrad(by, base, shade(th.sky[0], 1.3), shade(th.sky[0], 0.8)); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
  const step = st.m > 14 ? 5 : 1; ctx.save(); rr(bx, by, bl, bh, bh / 2); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; for (let u = step; u < st.m; u += step) { ctx.beginPath(); ctx.moveTo(bx + u * sc, by + bh * 0.55); ctx.lineTo(bx + u * sc, base); ctx.stroke(); } ctx.restore();
  const sp = bl / kids, hk = Math.max(16, Math.min(34, sp * 1.7)); for (let q = 0; q < kids; q++) drawKid(bx + sp * (q + 0.5), by - 3, hk);
  txt(st.m > 14 ? '1 Strich = 5 m' : '1 Strich = 1 m', x + w - 16, base + 14, 11, '#8a6a3a', 'right', 'normal');
}
function drawHourglass(x, y) { ctx.fillStyle = '#e8c070'; ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 8, y - 10); ctx.lineTo(x + 8, y - 10); ctx.lineTo(x + 1.5, y); ctx.lineTo(x + 8, y + 10); ctx.lineTo(x - 8, y + 10); ctx.lineTo(x - 1.5, y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#c98a3a'; ctx.beginPath(); ctx.moveTo(x - 5, y + 9); ctx.lineTo(x + 5, y + 9); ctx.lineTo(x, y + 3); ctx.fill(); }
function drawDietIcon(k, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (k === 'leaf' || k === 'all') { ctx.save(); if (k === 'all') ctx.translate(-5, 0); ctx.fillStyle = '#5cb85c'; ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, 8); ctx.quadraticCurveTo(-10, -8, 8, -9); ctx.quadraticCurveTo(10, 8, -8, 8); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(5, -5); ctx.stroke(); ctx.restore(); }
  if (k === 'meat' || k === 'all') { ctx.save(); if (k === 'all') ctx.translate(7, 2); ctx.fillStyle = '#c9603a'; ctx.strokeStyle = '#7a3418'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-2, -2, 8, 6, -0.6, 0, 7); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#f4ecd8'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(3, 3); ctx.lineTo(9, 9); ctx.stroke(); circle(10, 10, 2.6, '#f4ecd8'); ctx.restore(); }
  if (k === 'fish') { ctx.fillStyle = '#4f9ad8'; ctx.strokeStyle = '#2a5a8a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-1, 0, 9, 6, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(13, -6); ctx.lineTo(13, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); circle(-5, -1.5, 1.6, '#fff'); }
  if (k === 'sun') { ctx.strokeStyle = '#e8a317'; ctx.lineWidth = 2.5; for (let q = 0; q < 8; q++) { const a = q * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); ctx.stroke(); } circle(0, 0, 6.5, '#ffd34d'); ctx.strokeStyle = '#e8a317'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, 7); ctx.stroke(); }
  if (k === 'none') { ctx.strokeStyle = '#a09070'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke(); }
  ctx.restore();
}
function drawNameIcon(x, y) { circle(x, y, 11, '#f0d58a'); ctx.lineWidth = 2; ctx.strokeStyle = '#8a6a3a'; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.stroke(); txt('Aa', x, y + 1, 12, '#5a3a14', 'center'); }
function fitTxt(s, x, y, maxW, size, min, color, align = 'center') { let fs = size; setFont(fs); while (ctx.measureText(s).width > maxW && fs > min) { fs--; setFont(fs); } txt(s, x, y, fs, color, align); }
const TL_ERAS = [['Trias', 252, 201, '#e3b27a'], ['Jura', 201, 145, '#86c9a8'], ['Kreide', 145, 66, '#8ebaf0'], ['Heute', 66, 0, '#f5d870']];
function tlPos(ma) { for (let k = 0; k < 4; k++) { const [, a, b] = TL_ERAS[k]; if (ma >= b) return (k + clamp((a - ma) / (a - b), 0, 1)) / 4; } return 1; }
function timelineChip(x, y, w, st) { // era of life as a strip: Trias, Jura, Kreide, today; the animal's time span is marked in gold
  rr(x, y + 2, w, 50, 13); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill(); rr(x, y, w, 50, 13); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#b8a070'; ctx.stroke();
  ctx.save(); ctx.translate(x + 24, y + 16); ctx.scale(0.8, 0.8); drawHourglass(0, 0); ctx.restore(); txt(st.l, x + 42, y + 15, 12, '#8a6a3a', 'left', 'normal'); setFont(12, 'normal'); const lw = ctx.measureText(st.l).width; txt(st.e, x + 48 + lw, y + 15, 15, '#2b1a00', 'left');
  const bx = x + 14, bw = w - 28, by = y + 27, bh = 16, qw = bw / 4;
  ctx.save(); rr(bx, by, bw, bh, 8); ctx.clip(); TL_ERAS.forEach(([nm, , , col], k) => { ctx.fillStyle = col; ctx.fillRect(bx + k * qw, by, qw + 1, bh); if (k) { ctx.fillStyle = 'rgba(80,50,20,.35)'; ctx.fillRect(bx + k * qw, by, 1.5, bh); } txt(nm, bx + k * qw + qw / 2, by + bh / 2 + 1, 10, 'rgba(59,36,16,.8)'); }); ctx.restore();
  rr(bx, by, bw, bh, 8); ctx.lineWidth = 1.5; ctx.strokeStyle = '#8a6a3a'; ctx.stroke();
  const x1 = bx + bw * tlPos(st.tl[0]), x2 = bx + bw * tlPos(st.tl[1]), mw = Math.max(10, x2 - x1), mx = clamp((x1 + x2) / 2 - mw / 2, bx - 2, bx + bw - mw + 2);
  rr(mx, by - 3, mw, bh + 6, 6); ctx.fillStyle = 'rgba(255,196,0,.55)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#7a4a00'; ctx.stroke();
}
function steckChip(x, y, w, label, value, icon) {
  rr(x, y + 2, w, 50, 13); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill(); rr(x, y, w, 50, 13); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#b8a070'; ctx.stroke();
  icon(x + 26, y + 25); txt(label, x + 50, y + 15, 13, '#8a6a3a', 'left', 'normal');
  let fs = 19; setFont(fs); while (ctx.measureText(value).width > w - 62 && fs > 11) { fs--; setFont(fs); } txt(value, x + 50, y + 35, fs, '#2b1a00', 'left');
}
function foil(x, y, w, h, r, t) { // diagonal shimmer on found cards
  ctx.save(); rr(x, y, w, h, r); ctx.clip(); const u = ((t * 0.35) % 1.6) - 0.3, gx = x + u * (w + h);
  const g = ctx.createLinearGradient(gx - 30, y, gx + 30, y + h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}
function drawBulb(x, y) { circle(x, y - 2, 9, '#ffd34d'); ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 2, 9, 0, 7); ctx.stroke(); ctx.fillStyle = '#8a6a3a'; rr(x - 4, y + 7, 8, 5, 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - 2, y - 4, 4, 3.4, 4.6); ctx.stroke(); }
function drawHabitat(wi, x, y, w, h) { // a small painted scene of the animal's world; the ground line is y + h - 40
  const th = WORLDS[wi], gy = y + h - 40;
  ctx.save(); rr(x, y, w, h, 18); ctx.clip();
  ctx.fillStyle = vgrad(y, gy, th.sky[0], th.sky[1]); ctx.fillRect(x, y, w, h);
  { const g = ctx.createRadialGradient(x + w * 0.8, y + h * 0.28, 4, x + w * 0.8, y + h * 0.28, 110); g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  for (const [col, off, amp, hh] of [[th.far, 0, 16, 56], [th.mid, 2, 12, 38]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, gy + 2); for (let u = 0; u <= w; u += 10) ctx.lineTo(x + u, gy - hh + amp * Math.sin(u * 0.021 + off * 2.1) + amp * 0.5 * Math.sin(u * 0.057 + off)); ctx.lineTo(x + w, gy + 2); ctx.closePath(); ctx.fill(); }
  if (wi === 3) drawVolcano(x + w * 0.76, gy, 0.7, '#3a1410', 1);
  else if (wi === 7) { ctx.fillStyle = '#7f98b8'; ctx.beginPath(); ctx.moveTo(x + w * 0.52, gy); ctx.lineTo(x + w * 0.74, y + 38); ctx.lineTo(x + w * 0.98, gy); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + w * 0.74, y + 38); ctx.lineTo(x + w * 0.69, y + 66); ctx.lineTo(x + w * 0.79, y + 66); ctx.fill(); }
  else if (wi === 5) { ctx.fillStyle = '#2a9ad0'; ctx.fillRect(x, gy - 22, w, 22); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; for (let u = 0; u < 6; u++) { ctx.beginPath(); ctx.arc(x + 30 + u * 62, gy - 12, 8, Math.PI, 0); ctx.stroke(); } }
  else if (wi === 6) { ctx.fillStyle = 'rgba(255,255,255,.1)'; for (let u = 0; u < 4; u++) { ctx.beginPath(); ctx.moveTo(x + 20 + u * 90, y); ctx.lineTo(x + 50 + u * 90, y); ctx.lineTo(x + 100 + u * 90, gy); ctx.lineTo(x + 40 + u * 90, gy); ctx.fill(); } }
  if (wi === 0) { palm(x + 44, gy + 2, 130, '#1f5a35'); palm(x + w - 34, gy + 2, 100, '#2b6a40'); }
  else if (wi === 1) { cactus(x + 46, gy + 2, 84, '#5f7a2a', 3); cactus(x + w - 40, gy + 2, 62, '#6a8a30', 1); }
  else if (wi === 2 || wi === 4) { pine(x + 40, gy + 2, 120, wi === 4 ? '#14303f' : '#1d4a3f', wi === 4); pine(x + w - 36, gy + 2, 86, wi === 4 ? '#1a3a4c' : '#27594a', false); }
  else if (wi === 5) palm(x + 42, gy + 2, 120, '#2f7d4a');
  else if (wi === 7) pine(x + 38, gy + 2, 90, '#1d4a3f', false);
  ctx.fillStyle = th.ground; ctx.fillRect(x, gy, w, h - (gy - y)); ctx.fillStyle = th.top || th.ground; ctx.fillRect(x, gy, w, 7);
  ctx.fillStyle = th.dots || 'rgba(0,0,0,.12)'; for (let u = 0; u < 14; u++) circle(x + hash(u + 5) * w, gy + 14 + hash(u + 9) * (h - (gy - y) - 18), 2 + hash(u) * 2, th.dots || 'rgba(0,0,0,.12)');
  if (wi === 6) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; for (let u = 0; u < 9; u++) { const t = (T * 0.16 + hash(u * 3) ) % 1; ctx.beginPath(); ctx.arc(x + 20 + hash(u + 1) * (w - 40) + Math.sin(T * 2 + u) * 4, gy - t * (gy - y), 2 + hash(u + 2) * 3, 0, 7); ctx.stroke(); } }
  if (wi === 2 || wi === 4) { ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let u = 0; u < 26; u++) { const t = (T * 0.09 + hash(u)) % 1; ctx.beginPath(); ctx.arc(x + ((hash(u + 11) + Math.sin(T * 0.7 + u) * 0.02) % 1) * w, y + t * (gy - y), 1.6 + hash(u + 3) * 1.4, 0, 7); ctx.fill(); } }
  ctx.restore();
}
function drawHeroDino(i, x, y, w, h, animal) { // the animal standing on the habitat's ground; a tap makes it hop and roar
  const c = cardSprite(i, false), bx = cardBox[i], gy = y + h - 40, feet = gy + 8, cxm = x + w / 2;
  const k = Math.min(1.2, (w - 84) / bx.w, (feet - (y + 26)) / bx.h), ru = clamp((T - bookRoar.t) / 0.7, 0, 1), on = bookRoar.i === i && ru < 1;
  const hop = on ? Math.sin(ru * Math.PI) * 24 : 0, sq = on ? 1 + 0.07 * Math.sin(ru * Math.PI * 4) : 1 + 0.012 * Math.sin(T * 2.4 + i);
  ctx.save(); ctx.translate(cxm, feet - hop); ctx.scale(2 - sq, sq); ctx.drawImage(c, -140 * k, -(bx.cy + bx.h / 2) * k, 280 * k, 170 * k); ctx.restore();
  if (on && animal) { ctx.save(); ctx.lineCap = 'round'; for (let r = 0; r < 3; r++) { const q = clamp(ru * 1.3 - r * 0.15, 0, 1); if (q <= 0) continue; ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - q)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cxm + bx.w * k * 0.38, feet - bx.h * k * 0.72 - hop, 14 + q * 70, -0.7, 0.7); ctx.stroke(); } ctx.restore(); }
}
function lineBuild() { // every animal at one scale, smallest to largest
  const ids = STECK.map((st, i) => i).filter(i => !STECK[i].fb && STECK[i].cmp !== 'everest').sort((a, b) => STECK[a].m - STECK[b].m || a - b);
  for (const i of ids) cardSprite(i, !save.lvDone[i]); // measures cardBox
  let ppm = 40; for (const i of ids) ppm = Math.min(ppm, 290 / (STECK[i].m * cardBox[i].h / cardBox[i].w));
  const items = []; let x = 90; setFont(13);
  for (const i of ids) { const dw = Math.max(5, STECK[i].m * ppm), nw = ctx.measureText(save.lvDone[i] ? FACTS[i].name : '???').width + 16, sw = Math.max(dw + 40, nw); items.push({ i, x, dw, sw, k: dw / cardBox[i].w }); x += sw + 26; }
  return lineLayout = { items, ppm, total: x + 60 };
}
function drawLineup() {
  const L = lineLayout || lineBuild(), PX = 28, PY = 76, PW = 904, PH = 392, GY = 408, maxS = Math.max(0, L.total - PW);
  if (lineDrag) lineScroll = lineTarget; else lineScroll += (lineTarget - lineScroll) * Math.min(1, DT * 9);
  lineTarget = clamp(lineTarget, 0, maxS); lineScroll = clamp(lineScroll, 0, maxS);
  otxt('Grössenvergleich', W / 2, 38, 34, '#ffd34d', '#3b1d00', 9);
  txt('Alle Tiere im gleichen Mass – zieh nach links: von winzig bis riesig!', W / 2, 64, 15, '#6b4a2b', 'center', 'normal');
  ctx.save(); rr(PX, PY, PW, PH, 16); ctx.clip();
  ctx.fillStyle = vgrad(PY, GY, '#e8f4ff', '#fff6dc'); ctx.fillRect(PX, PY, PW, PH);
  ctx.fillStyle = '#d9c597'; ctx.fillRect(PX, GY, PW, PH - (GY - PY)); ctx.fillStyle = '#c4a96c'; ctx.fillRect(PX, GY, PW, 4);
  const kh = Math.max(12, 1.4 * L.ppm); ctx.strokeStyle = 'rgba(138,106,58,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(PX, GY - kh); ctx.lineTo(PX + PW, GY - kh); ctx.stroke(); ctx.setLineDash([]); // child-height guide line
  for (let hm = 5; hm * L.ppm < GY - PY - 10; hm += 5) { const ly = GY - hm * L.ppm; ctx.strokeStyle = 'rgba(138,106,58,.25)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.moveTo(PX, ly); ctx.lineTo(PX + PW, ly); ctx.stroke(); ctx.setLineDash([]); txt(`${hm} m`, PX + PW - 62, ly - 9, 12, '#a08a5a', 'right', 'normal'); } // height chart
  lineHits = [];
  for (const it of L.items) {
    const sx = it.x - lineScroll; if (sx > PX + PW + 20 || sx + it.sw < PX - 20) continue;
    const i = it.i, has = !!save.lvDone[i], st = STECK[i], bx = cardBox[i], cx = sx + it.sw / 2, dx = cx - it.dw / 2 + 8;
    drawKid(dx - 14, GY, kh);
    ctx.drawImage(cardSprite(i, !has), dx + it.dw / 2 - 140 * it.k, GY - (bx.cy + bx.h / 2) * it.k + 2, 280 * it.k, 170 * it.k);
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; if (it.dw > 20) { ctx.beginPath(); ctx.moveTo(dx, GY + 9); ctx.lineTo(dx + it.dw, GY + 9); ctx.moveTo(dx, GY + 6); ctx.lineTo(dx, GY + 12); ctx.moveTo(dx + it.dw, GY + 6); ctx.lineTo(dx + it.dw, GY + 12); ctx.stroke(); }
    txt(has ? FACTS[i].name : '???', cx, GY + 26, 13, has ? '#2b1a00' : '#8a7a5a'); txt(has ? `${st.m >= 10 ? Math.round(st.m) : String(st.m).replace('.', ',')} m` : '? m', cx, GY + 44, 12, '#6b4a2b', 'center', 'normal');
    if (st.m < 1.4 && has) txt('winzig!', cx, GY - kh - 10, 12, '#a0772a', 'center', 'normal');
    if (has && bookSel < 0) lineHits.push({ x: sx, y: GY - 300, w: it.sw, h: 350, i });
  }
  ctx.restore();
  rr(PX, PY, PW, PH, 16); ctx.lineWidth = 2.5; ctx.strokeStyle = '#a88a52'; ctx.stroke();
  drawKid(PX + 22, PY + 36, 26); txt('Gestrichelte Linie = ein Kind (1,4 m)', PX + 40, PY + 22, 12, '#6b4a2b', 'left', 'normal');
  if (maxS > 0) { const tx = 160, tw = 640; rr(tx, 484, tw, 8, 4); ctx.fillStyle = 'rgba(80,50,20,.22)'; ctx.fill(); const th2 = Math.max(40, tw * PW / L.total); rr(tx + (tw - th2) * lineScroll / maxS, 484, th2, 8, 4); ctx.fillStyle = '#c98a3a'; ctx.fill(); }
  if (bookSel < 0) {
    button('Zurück', 26, 14, 132, 42, () => { bookMode = 'grid'; }, { size: 20, icon: icon('back') });
    for (const dir of [-1, 1]) { if (dir < 0 ? lineTarget <= 0 : lineTarget >= maxS) continue; const ax = dir < 0 ? PX + 30 : PX + PW - 30, ay = 250, hov = 1 + 0.06 * Math.sin(T * 4 + dir);
      ctx.save(); ctx.translate(ax, ay); ctx.scale(hov, hov); circle(0, 4, 24, 'rgba(0,0,0,.3)'); circle(0, 0, 24, '#f4b400'); ctx.lineWidth = 3; ctx.strokeStyle = '#7a4a00'; ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.stroke(); ctx.strokeStyle = '#3b1d00'; ctx.lineWidth = 5.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-dir * 5, -10); ctx.lineTo(dir * 6, 0); ctx.lineTo(-dir * 5, 10); ctx.stroke(); ctx.restore();
      buttons.push({ x: ax - 30, y: ay - 30, w: 60, h: 60, cb: () => { lineTarget = clamp(lineTarget + dir * 560, 0, maxS); } }); }
  }
}
function lineDown(x, y) { if (x > 28 && x < 932 && y > 76 && y < 468) lineDrag = { x0: x, s0: lineTarget, moved: 0 }; }
function lineMove(x) { if (!lineDrag) return; lineDrag.moved = Math.max(lineDrag.moved, Math.abs(x - lineDrag.x0)); if (lineLayout) lineTarget = clamp(lineDrag.s0 - (x - lineDrag.x0), 0, Math.max(0, lineLayout.total - 904)); }
function lineUp(x, y) { const d = lineDrag; lineDrag = null; if (!d || d.moved > 8 || scene !== 'book' || bookMode !== 'lineup' || bookSel >= 0) return; const h = lineHits.find(q => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); if (h) { SFX.click(); bookSel = h.i; save.bookSeen[h.i] = true; writeSave(); } }
function drawBook() {
  leatherCover();
  if (!save.bookSeen) save.bookSeen = [];
  if (bookMode === 'lineup') drawLineup(); else drawBookGrid();
  if (bookSel >= 0) drawBookDetail();
}
function drawBookGrid() {
  const found = save.lvDone.filter(Boolean).length, day = adventDay();
  if (bookSel < 0) {
    otxt('Oli & Fabios Dino-Buch', W / 2, 38, 34, '#ffd34d', '#3b1d00', 9);
    const bw = 380, bx = (W - bw) / 2, by = 60, fr = found / FACTS.length; // progress pill
    rr(bx, by, bw, 20, 10); ctx.fillStyle = 'rgba(80,50,20,.22)'; ctx.fill();
    if (fr > 0) { ctx.save(); rr(bx, by, bw, 20, 10); ctx.clip(); ctx.fillStyle = vgrad(by, by + 20, '#ffe27a', '#f0b400'); ctx.fillRect(bx, by, Math.max(20, bw * fr), 20); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx, by + 2, Math.max(20, bw * fr), 5); ctx.restore(); }
    rr(bx, by, bw, 20, 10); ctx.lineWidth = 2; ctx.strokeStyle = '#8a6a3a'; ctx.stroke();
    txt(found >= FACTS.length ? 'Alle Karten gefunden – echte Dino-Forscher!' : `${found} von ${FACTS.length} Karten – jeden Tag eine neue!`, W / 2, by + 11, 13, '#3b1d00');
    for (let g = 0; g < 8; g++) { // one ribbon per world: name, picture and three stars
      const rx = 28 + (g % 2) * 456, ry = 88 + Math.floor(g / 2) * 104, rw = 446, wi = LEVEL_THEMES[g * 3], th = WORLDS[wi], got = [0, 1, 2].filter(k => save.lvDone[g * 3 + k]).length, full = got === 3;
      if (full) { ctx.save(); ctx.shadowColor = 'rgba(255,200,40,.8)'; ctx.shadowBlur = 10; rr(rx, ry, rw, 18, 9); ctx.fillStyle = '#ffe9a0'; ctx.fill(); ctx.restore(); }
      rr(rx, ry, rw, 18, 9); ctx.fillStyle = vgrad(ry, ry + 18, '#fffaf0', '#f0e2bf'); ctx.fill(); ctx.lineWidth = full ? 2.5 : 1.5; ctx.strokeStyle = full ? '#e8a317' : shade(th.sky[0], 0.9); ctx.stroke();
      ctx.save(); rr(rx + 5, ry + 2, 26, 14, 4); ctx.clip(); drawThemeThumb(wi, rx + 5, ry + 2, 26, 14); ctx.restore();
      txt(th.name, rx + 39, ry + 10, 13, '#3b2410', 'left');
      if (full) txt('Komplett!', rx + rw / 2 + 20, ry + 10, 12, '#9a6a00');
      for (let k = 0; k < 3; k++) drawStar(rx + rw - 16 - (2 - k) * 17, ry + 9.5, 7, k < got ? '#ffc400' : 'rgba(80,50,20,.25)');
    }
  }
  for (let i = 0; i < FACTS.length; i++) {
    const lv = LEVELS[i], th = WORLDS[lv.wi], has = !!save.lvDone[i], boss = !!BOSS_DAYS[i + 1], future = i + 1 > day;
    const x = 28 + (i % 6) * 152, y = 88 + Math.floor(i / 6) * 104 + 21, w = 142, h = 78, isNew = has && !save.bookSeen[i];
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate((hash(i * 3 + 1) - 0.5) * 0.07); ctx.translate(-w / 2, -h / 2);
    rr(2, 4, w, h, 11); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
    rr(0, 0, w, h, 11); ctx.fillStyle = has ? '#fffaf0' : '#e6d8b8'; ctx.fill(); ctx.lineWidth = boss ? 3.5 : 2; ctx.strokeStyle = boss ? (has ? '#e8a317' : '#cfae62') : has ? '#8a6a3a' : '#b8a888'; ctx.stroke();
    rr(5, 5, w - 10, h - 10, 7); ctx.fillStyle = has ? vgrad(5, h - 5, shade(th.sky[1], 1.15), th.sky[1]) : '#d8c8a8'; ctx.fill();
    if (has) { drawCardArt(i, w / 2, 30, 108, false); ctx.save(); rr(5, 5, w - 10, h - 10, 7); ctx.clip(); ctx.fillStyle = 'rgba(255,250,240,.9)'; ctx.fillRect(5, h - 25, w - 10, 20); ctx.restore(); fitTxt(FACTS[i].name, w / 2, h - 15, w - 22, 16, 11, '#2b1a00'); foil(5, 5, w - 10, h - 10, 7, T + i); }
    else { ctx.save(); rr(5, 5, w - 10, h - 10, 7); ctx.clip(); ctx.globalAlpha = 0.45; ctx.fillStyle = vgrad(5, h - 5, th.sky[0], th.sky[1]); ctx.fillRect(5, 5, w - 10, h - 10); ctx.globalAlpha = 1; ctx.restore(); drawCardArt(i, w / 2, 30, 108, true); txt(future ? `ab ${i + 1}. Dez.` : `Tür ${i + 1}`, w / 2, h - 15, 14, '#5e4a2a', 'center', 'normal'); txt('?', w - 18, 20, 22, 'rgba(120,90,50,.5)'); }
    if (boss) { ctx.save(); ctx.translate(15, 15); ctx.rotate(-0.2); drawStar(0, 0, 11, has ? '#ffc400' : '#cfae62'); ctx.lineWidth = 1.5; ctx.strokeStyle = '#7a4a00'; ctx.stroke(); ctx.restore(); }
    if (isNew) { ctx.save(); ctx.translate(w - 24, 18); ctx.rotate(0.35); rr(-20, -9, 40, 18, 5); ctx.fillStyle = '#e53935'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('NEU', 0, 1, 13, '#fff'); ctx.restore(); }
    ctx.restore();
    if (bookSel < 0) buttons.push({ x, y, w, h, cb: () => { if (has) { bookSel = i; save.bookSeen[i] = true; writeSave(); } else toast(future ? `Diese Karte gibt es ab dem ${i + 1}. Dezember.` : `Diese Karte findest du in Tür ${i + 1}.`, '#fff'); } });
  }
  if (bookSel < 0) { button('Zurück', 26, 14, 132, 42, () => go('map'), { size: 20, icon: icon('back') }); button('Grössen', W - 158, 14, 132, 42, () => { bookMode = 'lineup'; lineLayout = null; lineScroll = lineTarget = 0; }, { size: 20, color: '#8fd16a' }); }
}
function drawBookDetail() {
  {
    if (bookAnim.sel !== bookSel) { bookAnim.sel = bookSel; bookAnim.t = T; }
    const wi = LEVELS[bookSel].wi, th = WORLDS[wi], st = STECK[bookSel], f = FACTS[bookSel], pu = clamp((T - bookAnim.t) * 7, 0, 1), pop = 0.94 + 0.06 * (1 - Math.pow(1 - pu, 3)), animal = (st.dk !== 'none' && st.dk !== 'sun') || bookSel === 19;
    const [head, call = ''] = f.text.split('|'), RX = 470, RW = 412, HX = 78, HY = 44, HW = 360, HH = 186;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(pop, pop); ctx.translate(-W / 2, -H / 2); ctx.globalAlpha = 0.4 + 0.6 * pu;
    panel(46, 12, 868, 516);
    drawHabitat(wi, HX, HY, HW, HH); drawHeroDino(bookSel, HX, HY, HW, HH, animal); foil(HX, HY, HW, HH, 18, T);
    rr(HX, HY, HW, HH, 18); ctx.lineWidth = 4; ctx.strokeStyle = '#fffaf0'; ctx.stroke(); rr(HX - 2, HY - 2, HW + 4, HH + 4, 20); ctx.lineWidth = 2; ctx.strokeStyle = '#8a6a3a'; ctx.stroke();
    if (!bookTapped) { ctx.globalAlpha *= 0.65 + 0.35 * Math.sin(T * 4); otxt(animal ? 'Tippe – er meldet sich!' : 'Tippe aufs Bild!', HX + HW - 14, HY + HH - 21, 14, '#fff', 'rgba(0,0,0,.6)', 4, 'right'); ctx.globalAlpha = 0.4 + 0.6 * pu; }
    { const wl = th.name; setFont(13); const pw = ctx.measureText(wl).width + 50; rr(HX + 10, HY + HH - 34, pw, 26, 13); ctx.fillStyle = 'rgba(255,250,235,.93)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#b8a070'; ctx.stroke(); ctx.save(); rr(HX + 14, HY + HH - 30, 28, 18, 4); ctx.clip(); drawThemeThumb(wi, HX + 14, HY + HH - 30, 28, 18); ctx.restore(); txt(wl, HX + 50, HY + HH - 21, 13, '#3b2410', 'left'); }
    if (BOSS_DAYS[bookSel + 1]) { rr(HX + HW - 112, HY + 10, 102, 24, 12); ctx.fillStyle = '#ffc400'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#7a4a00'; ctx.stroke(); drawStar(HX + HW - 94, HY + 22, 8, '#fff3b0'); txt('Boss-Karte', HX + HW - 52, HY + 22, 12, '#3b1d00'); }
    drawSizeRuler(HX, 240, HW, 152, st, th, bookSel);
    fitTxt(f.name, RX, 68, RW, 40, 26, '#3b2410', 'left'); txt(`Tür ${bookSel + 1} · ${LEVELS[bookSel].title}`, RX, 104, 17, '#8a6a3a', 'left', 'normal');
    let hs = 24, hl; for (; hs > 17; hs--) { hl = wrapLines(head, RW, hs); if (hl.length <= 3) break; }
    hl.forEach((l, i) => txt(l, RX, 138 + i * hs * 1.25, hs, '#3b2410', 'left'));
    const cTop = 138 + (hl.length - 1) * hs * 1.25 + hs * 0.5 + 14; let cs = 20, cl; for (; cs > 14; cs--) { cl = wrapLines(call, RW - 34, cs); if (cTop + 38 + cl.length * cs * 1.3 + 8 <= 394) break; }
    const cH = Math.max(38 + cl.length * cs * 1.3 + 8, 392 - cTop); rr(RX, cTop, RW, cH, 14); ctx.fillStyle = '#fff2c4'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#e2b94d'; ctx.stroke();
    drawBulb(RX + 22, cTop + 20); txt('Wusstest du?', RX + 40, cTop + 20, 14, '#9a6a00', 'left');
    { const y0 = cTop + 36 + (cH - 36 - cl.length * cs * 1.3) / 2 + cs * 0.65; cl.forEach((l, i) => txt(l, RX + 16, y0 + i * cs * 1.3, cs, '#3b2410', 'left', 'normal')); }
    if (st.d !== '–') { setFont(13); const dw = ctx.measureText('Frisst: ' + st.d).width + 46; rr(HX + 10, HY + 10, dw, 26, 13); ctx.fillStyle = 'rgba(255,250,235,.93)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#b8a070'; ctx.stroke(); ctx.save(); ctx.translate(HX + 26, HY + 23); ctx.scale(0.8, 0.8); drawDietIcon(st.dk, 0, 0); ctx.restore(); txt('Frisst: ' + st.d, HX + 42, HY + 24, 13, '#3b2410', 'left'); }
    const cy = 402;
    timelineChip(HX, cy, 400, st);
    steckChip(490, cy, 392, st.nl || 'Name bedeutet', st.nm, drawNameIcon);
    button('Schliessen', W / 2 - 110, 464, 220, 44, () => { bookSel = -1; }, { icon: icon('check'), size: 24 });
    ctx.restore();
    buttons.unshift({ x: 0, y: 0, w: W, h: H, cb: () => { bookSel = -1; } });
    buttons.push({ x: HX, y: HY, w: HW, h: HH, silent: true, cb: () => { bookTapped = true; bookRoar.t = T; bookRoar.i = bookSel; SFX.voice(VOICE_OF[bookSel]); } });
    for (const dir of [-1, 1]) { // previous / next found card
      let j = bookSel; do { j = (j + dir + FACTS.length) % FACTS.length; } while (!save.lvDone[j] && j !== bookSel);
      if (j === bookSel) continue;
      const ax = dir < 0 ? 46 : W - 46, ay = 270, hov = 1 + 0.06 * Math.sin(T * 4 + dir);
      ctx.save(); ctx.translate(ax, ay); ctx.scale(hov, hov); circle(0, 4, 27, 'rgba(0,0,0,.3)'); circle(0, 0, 27, '#f4b400'); ctx.lineWidth = 3; ctx.strokeStyle = '#7a4a00'; ctx.beginPath(); ctx.arc(0, 0, 27, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#3b1d00'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-dir * 6, -12); ctx.lineTo(dir * 7, 0); ctx.lineTo(-dir * 6, 12); ctx.stroke(); ctx.restore();
      buttons.push({ x: ax - 34, y: ay - 34, w: 68, h: 68, cb: () => { bookSel = j; save.bookSeen[j] = true; writeSave(); } });
    }
  }
}
