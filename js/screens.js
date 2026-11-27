'use strict';
// Dialogs, name entry, splash, title, story. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// =====================================================================
// Dialog & name entry
// =====================================================================
let dialog = null;
function startDialog(lines, done, top, pic) { dialog = { lines, i: 0, t: 0, age: 0, done, top, pic }; } // pic: { wi, boss?, ko? } puts a picture of the place (or the boss) above the box and dims the screen behind it
function advanceDialog() {
  const l = dialog.lines[dialog.i];
  if (dialog.t * 40 < fmt(l.text).length) { dialog.t = 999; return; }
  SFX.click(); dialog.i++; dialog.t = 0;
  if (dialog.i >= dialog.lines.length) { const d = dialog.done; dialog = null; if (d) d(); }
}
function drawDialogPic(pic, age) { // a round window onto the place Götti is talking about; the boss steps out in front of it
  const u = clamp(age * 3.2, 0, 1), e = 1 - (1 - u) * (1 - u), s = 0.55 + 0.45 * e;
  ctx.save(); ctx.globalAlpha = u; ctx.translate(W / 2, 168 + Math.sin(T * 1.7) * 3); ctx.scale(s, s);
  glow(0, 0, 190, '255,236,190', 0.35);
  drawEmblem(pic.wi, 0, 0, 104);
  if (pic.boss) {
    const k = pic.boss, bo = { dmg: pic.ko ? 1 : 0, ko: !!pic.ko, wid: 'dlg' }; ctx.save(); ctx.translate(0, 112); shadow(0, 0, k === 'king' ? 84 : 70, 0.35);
    if (k === 'crab') drawCrabKing(-8, 0, 0.78, T * 2, true, bo); else if (k === 'kraken') drawKraken(0, 0, 0.66, T * 2, true, bo); else if (k === 'queen') drawQueen(10, 0, 0.78, T * 2, true, bo); else oRaptor(0, 0, 1.05, T * 2, true, { col: '#8b1a1a', dark: '#4a0a0a', crown: true, dmg: pic.ko ? 1 : 0, ko: !!pic.ko, wid: 'dlg' });
    ctx.restore();
  }
  ctx.restore();
}
function drawDialog() {
  if (!dialog) return;
  dialog.t += DT; dialog.age += DT;
  if (dialog.pic && !dialog.top) { ctx.fillStyle = `rgba(8,10,30,${0.5 * clamp(dialog.age * 3, 0, 1)})`; ctx.fillRect(0, 0, W, H); drawDialogPic(dialog.pic, dialog.age - 0.1); }
  const l = dialog.lines[dialog.i], s = fmt(l.text), n = Math.floor(dialog.t * 40);
  const bx = 40, bw = W - 80, bh = 150, by = dialog.top ? 20 : H - 170, done = n >= s.length;
  woodFrame(bx, by, bw, bh, 22);
  drawPortrait(l.who, bx + 78, by + bh / 2 + (done ? 0 : Math.sin(T * 14) * 1.5), 60);
  const nm = typeof WHO[l.who] === 'function' ? WHO[l.who]() : WHO[l.who];
  setFont(22); const nw = ctx.measureText(nm).width + 28; rr(bx + 150, by - 17, nw, 34, 15); ctx.fillStyle = '#6b4a2b'; ctx.fill(); txt(nm, bx + 150 + nw / 2, by, 22, '#fff7e0');
  let fs = 28, lines = wrapLines(s, bw - 250, fs); if (lines.length > 3) { fs = 24; lines = wrapLines(s, bw - 250, fs); } if (lines.length > 3) { fs = 21; lines = wrapLines(s, bw - 250, fs); } let left = n; const lh = fs + 7;
  lines.forEach((ln, i) => { if (left <= 0) return; txt(ln.slice(0, left), bx + 150, by + 40 + i * lh, fs, '#3b2410', 'left'); left -= ln.length + 1; });
  { const ax = bx + bw - 44, ay = by + bh - 40, pz = done ? 1 + 0.08 * Math.sin(T * 6) : 0.9; ctx.save(); ctx.translate(ax, ay); ctx.scale(pz, pz); ctx.globalAlpha = done ? 1 : 0.55; circle(0, 0, 24, '#f4b400'); ctx.lineWidth = 3; ctx.strokeStyle = '#7a4a00'; ctx.stroke(); ctx.fillStyle = '#3b1d00'; ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(11, 0); ctx.lineTo(-6, 10); ctx.closePath(); ctx.fill(); ctx.restore(); } // a big "go on" arrow: no reading needed
}
const nameBox = document.getElementById('nameBox'), nameInput = document.getElementById('nameInput'), nameOk = document.getElementById('nameOk'), nameLabel = document.getElementById('nameLabel');
function nameOpen() { return nameBox.style.display === 'flex'; }
// The on-screen keyboard (Android especially) covers the fixed name card. Keep the card inside the part of the screen that is still visible
// (the visual viewport) and switch to a compact one-row layout when little room is left.
function fitNameBox() {
  const vv = window.visualViewport;
  if (!vv || nameBox.style.display === 'none') return;
  nameBox.style.inset = 'auto'; nameBox.style.left = vv.offsetLeft + 'px'; nameBox.style.top = vv.offsetTop + 'px'; nameBox.style.width = vv.width + 'px'; nameBox.style.height = vv.height + 'px';
  nameBox.classList.toggle('compact', vv.height < 460);
}
function unfitNameBox() { nameBox.style.inset = ''; nameBox.style.left = nameBox.style.top = nameBox.style.width = nameBox.style.height = ''; nameBox.classList.remove('compact'); }
if (window.visualViewport) for (const ev of ['resize', 'scroll']) window.visualViewport.addEventListener(ev, fitNameBox);
function askName(label, def, cb, validate, prefill) {
  nameLabel.textContent = label; nameLabel.style.color = ''; nameInput.value = prefill ? def : ''; nameInput.placeholder = def; nameBox.style.display = 'flex'; fitNameBox();
  setTimeout(() => { nameInput.focus(); if (prefill) nameInput.select(); }, 60);
  const finish = () => {
    let v = nameInput.value.trim().slice(0, 14); if (!v) v = def; v = v.charAt(0).toUpperCase() + v.slice(1);
    if (validate) { const msg = validate(v); if (msg) { nameLabel.textContent = msg; nameLabel.style.color = '#b3261e'; SFX.wrong(); return; } }
    nameBox.style.display = 'none'; unfitNameBox(); nameInput.blur(); nameOk.onclick = null; nameInput.onkeydown = null; audio(); SFX.right(); cb(v);
  };
  nameOk.onclick = finish;
  nameInput.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') finish(); };
}

// =====================================================================
// Title, story, map, book
// =====================================================================
const EMPTY = { pits: [] };
function tryFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen && !window.matchMedia('(display-mode: standalone)').matches) el.requestFullscreen().catch(() => {});
}
// ---------- splash: the first screen, waits for a tap (which also unlocks the sound) ----------
const splash = { go: -1, roared: false };
function startSplash() {
  if (splash.go >= 0) return;
  audio(); tryFullscreen(); splash.go = 0; splash.roared = false; SFX.egg();
}
function drawSplash() {
  const t = T, go = splash.go, p = go < 0 ? 0 : go, EX = W / 2, EY = 292 + Math.sin(t * 2) * 6 * (go < 0 ? 1 : 0.2);
  if (go >= 0) splash.go += DT;
  // night sky, aurora ribbons, stars
  const sk = ctx.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, '#07122e'); sk.addColorStop(0.5, '#1b4b63'); sk.addColorStop(1, '#2f7a62'); ctx.fillStyle = sk; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let b = 0; b < 2; b++) { ctx.strokeStyle = `rgba(${b ? '120,255,190' : '110,190,255'},${0.08 + 0.04 * Math.sin(t * 0.8 + b)})`; ctx.lineWidth = 46 - b * 14; ctx.lineCap = 'round'; ctx.beginPath(); for (let x = -20; x <= W + 20; x += 24) ctx.lineTo(x, 110 + b * 34 + Math.sin(x * 0.008 + t * 0.5 + b * 2) * 28); ctx.stroke(); }
  ctx.restore();
  for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(t * 1.3 + i * 1.7)); circle(hash(i) * W, hash(i + 40) * 300, hash(i + 9) < 0.12 ? 1.9 : 1.1, '#fff'); } ctx.globalAlpha = 1;
  // slowly turning light rays behind the egg
  ctx.save(); ctx.translate(EX, EY); ctx.rotate(t * 0.12); for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI / 7); ctx.fillStyle = `rgba(255,232,150,${0.07 + 0.08 * Math.min(1, p)})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, -620); ctx.lineTo(22, -620); ctx.fill(); } ctx.restore();
  // dark jungle silhouette: far hills, palms, near hills
  ctx.fillStyle = '#12403f'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 372 + Math.sin(x * 0.011 + 1) * 26 + Math.sin(x * 0.027) * 10); ctx.lineTo(W, H); ctx.fill();
  palm(90, 400, 170, '#0a2a2c'); palm(868, 396, 190, '#0a2a2c'); palm(200, 410, 110, '#0b3130'); palm(770, 408, 120, '#0b3130');
  ctx.fillStyle = '#0a2a2a'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 450 + Math.sin(x * 0.015 + 3) * 16 + Math.sin(x * 0.04) * 5); ctx.lineTo(W, H); ctx.fill();
  // fireflies
  for (let i = 0; i < 26; i++) { const fx = (hash(i + 70) * W + Math.sin(t * 0.6 + i) * 30 + W) % W, fy = 250 + hash(i + 90) * 200 + Math.sin(t * 0.9 + i * 2) * 14, a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.6 + i * 3)); const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 9); g.addColorStop(0, `rgba(255,245,160,${a})`); g.addColorStop(1, 'rgba(255,245,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, 9, 0, 7); ctx.fill(); }
  // nest and the golden egg
  ell(EX, EY + 78, 112, 26, 0, 'rgba(0,0,0,.35)'); ell(EX, EY + 70, 98, 24, 0, '#5a3a1c'); ell(EX, EY + 64, 90, 19, 0, '#7a5028');
  ctx.strokeStyle = '#a07038'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, bx = EX + Math.cos(a) * 84, by = EY + 64 + Math.sin(a) * 17; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + 0.9) * 16, by - 9 + Math.sin(a) * 4); ctx.stroke(); }
  const shake = go >= 0 ? Math.sin(t * 46) * 0.16 * Math.min(1, p / 0.9) : Math.sin(t * 1.6) * 0.025, glow = 0.7 + 0.25 * Math.sin(t * 3) + p * 2;
  const R = 64 * (1 + (go >= 0 ? 0.05 * Math.min(1, p / 0.9) : 0));
  drawEgg(EX, EY, R, '#ffd34a', '#fff3b0', glow, shake);
  if (go >= 0 && p > 0.25) { // cracks spread across the shell
    const k = clamp((p - 0.25) / 0.75, 0, 1); ctx.save(); ctx.translate(EX, EY); ctx.rotate(shake); ctx.strokeStyle = '#6a3a00'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const zz = [[-6, -R * 0.7], [4, -R * 0.45], [-8, -R * 0.2], [6, R * 0.05], [-4, R * 0.3]]; ctx.beginPath(); ctx.moveTo(zz[0][0], zz[0][1]); for (let i = 1; i < Math.ceil(zz.length * k) + 1 && i < zz.length; i++) ctx.lineTo(zz[i][0], zz[i][1]); ctx.stroke();
    if (k > 0.5) { ctx.beginPath(); ctx.moveTo(4, -R * 0.45); ctx.lineTo(R * 0.34, -R * 0.36); ctx.lineTo(R * 0.46, -R * 0.2); ctx.moveTo(-8, -R * 0.2); ctx.lineTo(-R * 0.36, -R * 0.1); ctx.stroke(); }
    ctx.restore();
  }
  // twinkles around the egg
  for (let i = 0; i < 6; i++) { const a = t * 0.5 + i * 1.05, rr2 = 98 + 14 * Math.sin(t * 2 + i); ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.3 + i * 2)); drawStar(EX + Math.cos(a) * rr2 * 1.25, EY + Math.sin(a) * rr2 * 0.8, 6 + 3 * (i % 2), '#fff6b8'); } ctx.globalAlpha = 1;
  // words and the big button
  const fade = go >= 0 ? clamp(1 - p / 0.5, 0, 1) : 1;
  if (fade > 0) {
    ctx.globalAlpha = fade;
    otxt('Seid ihr bereit', W / 2, 62, 46, '#fff6c0', '#1a0d00', 10); otxt('für ein Abenteuer?', W / 2, 114, 46, '#ffd34d', '#1a0d00', 10);
    if (go < 0) { const pu = 1 + 0.045 * Math.sin(t * 4); ctx.save(); ctx.translate(W / 2, 468); ctx.scale(pu, pu); button('Los geht\'s!', -150, -34, 300, 68, startSplash, { size: 30, icon: (x, y, sz) => ico('play', x, y, sz) }); ctx.restore(); buttons.pop(); } // any tap starts, the button is just the visual cue
    if (go < 0) { ico('sound', W / 2 - 66, 522, 18); txt('Mit Ton spielen', W / 2 + 8, 522, 15, 'rgba(255,255,255,.7)'); }
    ctx.globalAlpha = 1;
  }
  // the roar from far away, then a bright flash into the title
  if (go >= 0 && p > 0.7 && !splash.roared) { splash.roared = true; SFX.roar(); }
  if (go >= 0) { const f = clamp((p - 0.95) / 0.3, 0, 1); if (f > 0) { ctx.fillStyle = `rgba(255,248,215,${f})`; ctx.fillRect(0, 0, W, H); } if (p >= 1.28) { splash.go = -1; go2title(); } }
  // soft dark edges
  const vg = ctx.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 620); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,10,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}
function go2title() { go('title'); fadeT = 0; flashT = 1; }
function drawTitle() {
  const cam = T * 150;
  drawBackground(0, cam); drawGround(0, EMPTY, cam);
  shadow(436, GROUND + 2, 26, 0.3); shadow(286, GROUND + 2, 70, 0.3);
  oChili(430, GROUND - Math.abs(Math.sin(T * 9)) * 14, 1.4, T * 9);
  oRex(280, GROUND, 1.2, T * 13, 0.12 + 0.12 * Math.sin(T * 2), Object.assign(rexLook(0), { rider: true }));
  if (save.babyName) oBaby(120, GROUND - Math.abs(Math.sin(T * 10)) * 9, 1, T * 10);
  drawAmbient(0); drawForeground(0, cam); vignette(0);
  logo(W / 2, 96);
  otxt(save.rexName ? `Ein Abenteuer mit ${save.rexName} und Chili` : 'Ein Abenteuer mit Chili und einem T-Rex', W / 2, 178, 26, '#fff', 'rgba(0,0,0,.7)', 6);
  { const pu = 1 + 0.04 * Math.sin(T * 4); ctx.save(); ctx.translate(722, 312); ctx.scale(pu, pu); rr(-170, -34, 340, 68, 34); ctx.fillStyle = 'rgba(20,40,20,.35)'; ctx.fill(); rr(-174, -38, 340, 68, 34); ctx.fillStyle = vgrad(-38, 30, '#ffe27a', '#ff9a2a'); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#2a1200'; ctx.stroke(); ctx.fillStyle = '#3b1d00'; ctx.beginPath(); ctx.moveTo(-146, -13); ctx.lineTo(-146, 13); ctx.lineTo(-124, 0); ctx.fill(); txt('Tippe zum Starten', 20, -2, 26, '#3b1d00'); ctx.restore(); }
  txt('Ein Weihnachtsgeschenk von Götti für Oli und Fabio · 2026', W / 2, 515, 17, 'rgba(255,255,255,.75)');
  otxt(BUILD_LABEL, W - 12, 14, 13, 'rgba(255,255,255,.8)', 'rgba(0,0,0,.55)', 4, 'right'); // deployed build: commit and date, outlined to stay readable on any backdrop
}
function logo(cx, cy) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.03);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const line = (t, sz, y) => { // two lines: the boys' names small on top, the title big below
    setFont(sz); const k = sz / 78;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillText(t, 4 * k, y + 9 * k);
    ctx.strokeStyle = '#2a1200'; ctx.lineWidth = 18 * k; ctx.strokeText(t, 0, y);
    ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = 8 * k; ctx.strokeText(t, 0, y);
    ctx.fillStyle = vgrad(y - 34 * k, y + 34 * k, '#fff6b0', '#ffd34d', '#f08a1a'); ctx.fillText(t, 0, y);
    ctx.save(); ctx.beginPath(); ctx.rect(-480, y - 40 * k, 960, 30 * k); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillText(t, 0, y); ctx.restore();
  };
  line('Oli & Fabios', 52, -38); line('Dino-Advent', 76, 18);
  for (let i = 0; i < 4; i++) { const a = 0.5 + 0.5 * Math.sin(T * 3 + i * 1.7), px = [-300, -90, 150, 320][i], py = [-38, 34, -40, 30][i]; ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.beginPath(); for (let k = 0; k < 8; k++) { const ang = k / 8 * Math.PI * 2, r = k % 2 ? 2.5 : 10; ctx.lineTo(px + Math.cos(ang) * r, py + Math.sin(ang) * r); } ctx.fill(); }
  ctx.globalAlpha = 1; ctx.restore();
}
function pressTitle() {
  tryFullscreen();
  if (!save.rexName) startStory();
  else if (!save.oliName || !save.fabioName) { // older save: ask whichever researcher names are still missing
    const fabioAsk = () => save.fabioName ? go('map') : askName('Wie soll Fabios Forschername sein?', 'Fabio', name => { save.fabioName = name; writeSave(); go('map'); }, null, true);
    const oliAsk = () => save.oliName ? fabioAsk() : askName('Wie soll Olis Forschername sein?', 'Oli', name => { save.oliName = name; writeSave(); fabioAsk(); }, null, true);
    go('story'); startDialog([{ who: 'goetti', text: save.fabioName ? 'Ihr dürft euch einen neuen Forschernamen aussuchen!' : 'Neu im Team: Fabio! Ab jetzt reitet ihr zu zweit auf {rex}.' }], oliAsk, true);
  }
  else go('map');
}

function startStory() {
  go('story');
  const rexPart = () => startDialog([
    { who: 'goetti', text: 'Zum Glück habt ihr einen starken Freund: einen jungen T-Rex! Er ist so gross, dass ihr zu zweit auf ihm reiten könnt. Aber er hat noch keinen Namen…' },
  ], () => askName('Wie soll euer T-Rex heissen?', 'Rexi', name => {
    save.rexName = name; writeSave();
    startDialog([
      { who: 'rex', text: 'ROOOAAARRR! ({rex} gefällt der Name!)' },
      { who: 'goetti', text: '{rex} – super Name! {oli} sitzt hinten und hält die Zügel. {fabio} sitzt vorne und hält sich gut fest.' },
      { who: 'fabio', text: 'Hü, {rex}, hü!' },
      { who: 'goetti', text: 'Und Chili kommt auch mit. Mit der Hasennase findet Chili jedes versteckte Ei!' },
      { who: 'chili', text: 'Schnupper, schnupper… Chili ist bereit!' },
      { who: 'goetti', text: 'Jeden Tag bis Weihnachten öffnet sich eine neue Tür in meinem Adventskalender – hinter jeder wartet ein Abenteuer! Und am Schluss warten der Krallenkönig und das goldene Ei. Los geht\'s!' },
    ], () => go('map'), true);
  }), true);
  const missionPart = () => startDialog([
    { who: 'goetti', text: 'Willkommen im Team, {oli} und {fabio}! Heute Nacht hat der Vulkan gebebt – und alle meine Dino-Eier sind davongerollt!' },
    { who: 'goetti', text: 'Und das Schlimmste: Auch das goldene Ei meiner Nachbarn, der Dino-Familie, ist verschwunden!' },
    { who: 'mami', text: '(Funkspruch) Hilfe! Der Krallenkönig hat unser Ei geklaut! Er ist riesig und hat ganz scharfe Krallen!' },
    { who: 'goetti', text: 'Ich brauche die mutigsten Dino-Forscher der Welt. Und das seid IHR zwei!' },
  ], rexPart, true);
  const fabioPart = () => askName('Und wie soll Fabios Forschername sein?', 'Fabio', name => { save.fabioName = name; writeSave(); missionPart(); }, null, true);
  if (save.oliName) { if (!save.fabioName) fabioPart(); else if (save.rexName) go('map'); else missionPart(); return; }
  startDialog([
    { who: 'goetti', text: 'Hallo Oli, hallo Fabio! Hier ist Götti, aus meiner Dino-Forschungsstation in Neuseeland – direkt am grossen Vulkan.' },
    { who: 'goetti', text: 'Bei uns am anderen Ende der Welt ist alles etwas anders – sogar die Vögel: Unsere Kiwis können nicht fliegen!' },
    { who: 'goetti', text: 'Ihr zwei werdet ab heute richtige Dino-Forscher! Dafür darf sich jeder einen Forschernamen aussuchen – ihr könnt Oli und Fabio bleiben oder euch etwas ganz Neues ausdenken.' },
  ], () => askName('Wie soll Olis Forschername sein?', 'Oli', name => { save.oliName = name; writeSave(); fabioPart(); }, null, true), true);
}
function drawNZFlag(x, y, w, h, t, pole = 70) { // flag on a pole, waving a little, with cloth shading and a gold finial
  ctx.save(); ctx.translate(x, y);
  const pg = ctx.createLinearGradient(-3, 0, 3, 0); pg.addColorStop(0, '#f4f4f8'); pg.addColorStop(0.5, '#c4c6d0'); pg.addColorStop(1, '#8a8c98'); ctx.fillStyle = pg; rr(-2.8, -4, 5.6, h + pole + 4, 2.8); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(30,30,50,.5)'; ctx.stroke();
  ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(0, -8, 5, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#8a5a00'; ctx.stroke(); circle(-1.5, -9.6, 1.6, '#fff8d0');
  for (let i = 0; i < 16; i++) { // vertical slices give a cheap wave; the slope of the wave lights or darkens the cloth
    const sx = i * w / 16, ph = t * 3 + i * 0.42, off = Math.sin(ph) * (0.8 + i * 0.3), sl = Math.cos(ph); ctx.save(); ctx.beginPath(); ctx.rect(3 + sx, off - 1, w / 16 + 1, h + 2); ctx.clip(); ctx.translate(3, off);
    ctx.fillStyle = '#00247d'; ctx.fillRect(0, 0, w, h);
    const cw = w * 0.5, ch = h * 0.5; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, ch); ctx.clip();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = h * 0.13; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cw, ch); ctx.moveTo(cw, 0); ctx.lineTo(0, ch); ctx.stroke();
    ctx.strokeStyle = '#cc142b'; ctx.lineWidth = h * 0.05; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cw, ch); ctx.moveTo(cw, 0); ctx.lineTo(0, ch); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(cw * 0.5 - h * 0.09, 0, h * 0.18, ch); ctx.fillRect(0, ch * 0.5 - h * 0.09, cw, h * 0.18);
    ctx.fillStyle = '#cc142b'; ctx.fillRect(cw * 0.5 - h * 0.055, 0, h * 0.11, ch); ctx.fillRect(0, ch * 0.5 - h * 0.055, cw, h * 0.11); ctx.restore();
    for (const [fx, fy, r] of [[0.76, 0.2, 0.075], [0.63, 0.5, 0.07], [0.88, 0.45, 0.07], [0.76, 0.78, 0.085]]) { drawStar(fx * w, fy * h, h * r * 1.25, '#fff'); drawStar(fx * w, fy * h, h * r, '#cc142b'); }
    ctx.fillStyle = sl > 0 ? `rgba(255,255,255,${0.16 * sl})` : `rgba(0,0,30,${-0.22 * sl})`; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0, h - 2.5, w, 2.5); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(0, 0, w, 1.5);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([2.5, 2.5]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(6, 3); ctx.lineTo(6, h - 3); ctx.stroke(); ctx.setLineDash([]); // stitching along the hoist
  ctx.fillStyle = '#c9a050'; for (const yy of [h * 0.2, h * 0.8]) { rr(-3.4, yy - 2, 6.8, 4, 1.5); ctx.fill(); } // rope clips
  ctx.restore();
}
function treeFern(x, b, h) { // New Zealand tree fern: slim trunk with a crown of arching fronds
  ctx.strokeStyle = '#4a3322'; ctx.lineWidth = h * 0.09; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, b); ctx.quadraticCurveTo(x + h * 0.06, b - h * 0.5, x, b - h); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(x - h * 0.04, b - h * (0.15 + i * 0.11)); ctx.lineTo(x + h * 0.04, b - h * (0.19 + i * 0.11)); ctx.stroke(); }
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.4, len = h * 0.55, tx = x + Math.cos(a) * len, ty = b - h + Math.sin(a) * len * 0.55 + len * 0.45 * Math.abs(i - 4) / 4, cxp = x + Math.cos(a) * len * 0.55, cyp = b - h + Math.sin(a) * len * 0.9 - 6;
    ctx.strokeStyle = i % 2 ? '#2e7d3f' : '#3f9a4f'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x, b - h); ctx.quadraticCurveTo(cxp, cyp, tx, ty); ctx.stroke();
    ctx.lineWidth = 1.6; for (let k = 1; k <= 6; k++) { const u = k / 7, qx = (1 - u) * (1 - u) * x + 2 * (1 - u) * u * cxp + u * u * tx, qy = (1 - u) * (1 - u) * (b - h) + 2 * (1 - u) * u * cyp + u * u * ty; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(qx - 5, qy + 9 * (1 - u * 0.5)); ctx.moveTo(qx, qy); ctx.lineTo(qx + 5, qy + 9 * (1 - u * 0.5)); ctx.stroke(); }
  }
}
function drawStation(cx, base, k) { // Götti's dino station: stone foundation, log walls, shingle roof, radio mast, flag, glowing window
  ctx.save(); ctx.translate(cx, base); ctx.scale(k, k); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const INK = '#2b1a0c';
  ell(6, 4, 168, 12, 0, 'rgba(0,0,0,.28)');
  // flag on its mast, behind the roof
  drawNZFlag(0, -312, 76, 48, T, 66);
  // radio mast beside the chimney: the Funkspruch comes in here
  ctx.strokeStyle = '#4a4a52'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-70, -196); ctx.lineTo(-70, -262); ctx.stroke(); ctx.lineWidth = 2; for (const [yy, hw] of [[-236, 14], [-250, 10], [-262, 6]]) { ctx.beginPath(); ctx.moveTo(-70 - hw, yy); ctx.lineTo(-70 + hw, yy); ctx.stroke(); }
  circle(-70, -264, 3, '#e53935'); ctx.globalAlpha = 0.45 + 0.4 * Math.sin(T * 4); circle(-70, -264, 7, 'rgba(255,80,60,.5)'); ctx.globalAlpha = 1;
  // chimney with smoke
  rr(60, -236, 34, 66, 3); ctx.fillStyle = vgrad(-236, -170, '#8d8d96', '#6a6a74'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5; for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.moveTo(60, -226 + r * 15); ctx.lineTo(94, -226 + r * 15); ctx.stroke(); } rr(56, -244, 42, 10, 3); ctx.fillStyle = '#55555e'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
  for (let i = 0; i < 6; i++) { const u = (T * 0.22 + i / 6) % 1; circle(77 + Math.sin(u * 6 + i) * 9 + u * 26, -250 - u * 70, 7 + u * 17, `rgba(225,228,236,${0.55 * (1 - u)})`); }
  // walls: log planks with round log ends at the corners
  rr(-132, -152, 264, 128, 4); ctx.fillStyle = vgrad(-152, -24, '#b07a48', '#8a5a2e', '#6a431f'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  for (let r = 0; r < 8; r++) { const yy = -152 + r * 16 + 8; ctx.strokeStyle = 'rgba(40,20,5,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-130, yy + 8); ctx.lineTo(130, yy + 8); ctx.stroke(); ctx.strokeStyle = 'rgba(255,225,170,.14)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-130, yy - 5); ctx.lineTo(130, yy - 5); ctx.stroke(); for (const sx of [-132, 132]) { circle(sx, yy, 7.5, r % 2 ? '#c99660' : '#b88450'); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(sx, yy, 7.5, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(90,50,15,.55)'; ctx.beginPath(); ctx.arc(sx, yy, 3.6, 0, 7); ctx.stroke(); } }
  for (let i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(60,30,8,.14)'; ctx.fillRect(-124 + hash(i * 3) * 248, -150 + hash(i * 5 + 2) * 124, 8 + hash(i) * 14, 1.6); }
  // stone foundation
  rr(-140, -26, 280, 26, 3); ctx.fillStyle = '#8d8d96'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); for (let r = 0; r < 2; r++) for (let c = 0; c < 9; c++) { const bx = -140 + c * 31 + (r % 2) * 15, by = -26 + r * 13; rr(bx + 1, by + 1, 29, 11, 3); ctx.fillStyle = (c + r) % 3 ? '#a2a2ac' : '#8a8a94'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(30,30,40,.45)'; ctx.stroke(); }
  // roof: shingles in two tones, trim boards, attic window
  ctx.save(); ctx.beginPath(); ctx.moveTo(-166, -148); ctx.lineTo(0, -252); ctx.lineTo(166, -148); ctx.closePath(); ctx.fillStyle = '#6a2a24'; ctx.fill(); ctx.clip();
  for (let r = 0; r < 8; r++) for (let c = -9; c <= 9; c++) { const sx = c * 20 + (r % 2) * 10, sy = -150 - r * 13.5; ctx.fillStyle = (c + r) % 2 ? '#8a3a30' : '#a24a38'; ctx.beginPath(); ctx.moveTo(sx - 10, sy); ctx.lineTo(sx + 10, sy); ctx.arc(sx, sy, 10, 0, Math.PI); ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(40,10,5,.55)'; ctx.stroke(); }
  const rg = ctx.createLinearGradient(-166, 0, 166, 0); rg.addColorStop(0, 'rgba(255,255,255,.12)'); rg.addColorStop(0.5, 'rgba(255,255,255,0)'); rg.addColorStop(1, 'rgba(0,0,0,.22)'); ctx.fillStyle = rg; ctx.fillRect(-170, -260, 340, 120);
  ctx.fillStyle = 'rgba(90,140,60,.55)'; for (const [mx, my, mr] of [[-96, -164, 9], [-84, -160, 6], [110, -172, 7]]) { ctx.beginPath(); ctx.ellipse(mx, my, mr * 1.6, mr * 0.7, 0, 0, 7); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = '#d9aa72'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-170, -146); ctx.lineTo(0, -255); ctx.lineTo(170, -146); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-170, -151); ctx.lineTo(0, -260); ctx.lineTo(170, -151); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-170, -141); ctx.lineTo(0, -250); ctx.lineTo(170, -141); ctx.stroke();
  rr(-172, -150, 344, 8, 3); ctx.fillStyle = '#c99660'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
  circle(0, -192, 18, '#d9aa72'); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); circle(0, -192, 13, `rgba(255,${200 + Math.floor(20 * Math.sin(T * 3))},110,1)`); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-13, -192); ctx.lineTo(13, -192); ctx.moveTo(0, -205); ctx.lineTo(0, -179); ctx.stroke(); drawStar(0, -192, 4, 'rgba(255,255,255,.6)');
  // window with shutters, glow and a flower box
  const wx = -92, wy = -112; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const wg = ctx.createRadialGradient(wx + 30, wy + 28, 4, wx + 30, wy + 28, 70); wg.addColorStop(0, `rgba(255,210,110,${0.45 + 0.08 * Math.sin(T * 3)})`); wg.addColorStop(1, 'rgba(255,190,80,0)'); ctx.fillStyle = wg; ctx.fillRect(wx - 40, wy - 40, 140, 140); ctx.restore();
  rr(wx, wy, 60, 54, 4); ctx.fillStyle = vgrad(wy, wy + 54, '#fff0b8', '#ffd878'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#5a3416'; ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx + 30, wy); ctx.lineTo(wx + 30, wy + 54); ctx.moveTo(wx, wy + 27); ctx.lineTo(wx + 60, wy + 27); ctx.stroke();
  ctx.fillStyle = 'rgba(200,70,60,.55)'; ctx.beginPath(); ctx.moveTo(wx + 3, wy + 3); ctx.quadraticCurveTo(wx + 12, wy + 22, wx + 3, wy + 24); ctx.fill(); ctx.beginPath(); ctx.moveTo(wx + 57, wy + 3); ctx.quadraticCurveTo(wx + 48, wy + 22, wx + 57, wy + 24); ctx.fill();
  for (const sd of [-1, 1]) { const sx = sd < 0 ? wx - 17 : wx + 60; rr(sx, wy - 2, 17, 58, 3); ctx.fillStyle = '#3e8a4a'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5; for (let q = 1; q < 6; q++) { ctx.beginPath(); ctx.moveTo(sx + 2, wy - 2 + q * 9.5); ctx.lineTo(sx + 15, wy - 2 + q * 9.5); ctx.stroke(); } }
  rr(wx - 6, wy + 56, 72, 12, 3); ctx.fillStyle = '#6b4a2b'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke(); for (let q = 0; q < 6; q++) { const fx = wx + 2 + q * 11.5; circle(fx, wy + 54 + Math.sin(q) * 2, 4.6, ['#ff5a6a', '#ffd34d', '#ff8ad0'][q % 3]); circle(fx, wy + 54 + Math.sin(q) * 2, 1.6, '#fff3b0'); }
  // door with round window, knob, steps and a footprint doormat
  const dx = 40; rr(dx, -108, 62, 84, 6); ctx.fillStyle = vgrad(-108, -24, '#7a4a28', '#4e2d14'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.strokeRect(dx + 8, -74, 18, 22); ctx.strokeRect(dx + 36, -74, 18, 22); ctx.strokeRect(dx + 8, -46, 18, 18); ctx.strokeRect(dx + 36, -46, 18, 18);
  circle(dx + 31, -92, 11, '#ffe08a'); ctx.lineWidth = 3; ctx.strokeStyle = '#d9aa72'; ctx.beginPath(); ctx.arc(dx + 31, -92, 11, 0, 7); ctx.stroke(); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(dx + 31, -103); ctx.lineTo(dx + 31, -81); ctx.moveTo(dx + 20, -92); ctx.lineTo(dx + 42, -92); ctx.stroke(); circle(dx + 51, -62, 3.4, '#ffd34d'); circle(dx + 50, -63, 1.2, '#fff8d0');
  rr(dx - 8, -24, 78, 8, 2); ctx.fillStyle = '#9a9aa4'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); rr(dx - 14, -16, 90, 8, 2); ctx.fillStyle = '#b0b0ba'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a8a4a'; rr(dx + 6, -9, 50, 8, 3); ctx.fill(); ctx.fillStyle = '#c8f0b8'; for (const [fx, fy] of [[dx + 22, -5], [dx + 30, -5], [dx + 38, -5]]) circle(fx, fy, 1.8, '#c8f0b8');
  // lantern by the door
  ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(116, -118); ctx.lineTo(116, -104); ctx.stroke(); rr(108, -104, 16, 22, 4); ctx.fillStyle = '#d9a23a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); circle(116, -93, 5, '#fff3b0'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(116, -93, 2, 116, -93, 38); lg.addColorStop(0, `rgba(255,220,120,${0.55 + 0.1 * Math.sin(T * 7)})`); lg.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = lg; ctx.fillRect(78, -131, 76, 76); ctx.restore();
  // hanging sign on chains
  ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 2; for (const sx of [-118, -22]) { ctx.beginPath(); ctx.moveTo(sx, -146); ctx.lineTo(sx, -134); ctx.stroke(); } rr(-128, -134, 116, 22, 5); ctx.fillStyle = vgrad(-134, -112, '#f6e6c4', '#e0c898'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#5a3416'; ctx.stroke(); txt('Dino-Station', -70, -126, 12, '#3b2410'); txt('Neuseeland', -70, -116, 8.5, '#2a5aa0');
  // crates, a barrel and an egg basket at the foot of the wall
  rr(-166, -34, 24, 34, 4); ctx.fillStyle = vgrad(-34, 0, '#a66a35', '#6a4220'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 2.5; for (const yy of [-26, -8]) { ctx.beginPath(); ctx.moveTo(-166, yy); ctx.lineTo(-142, yy); ctx.stroke(); }
  rr(110, -22, 30, 22, 3); ctx.fillStyle = '#b88450'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); drawEgg(118, -26, 6.5, '#f6e7b0', '#6aa84f'); drawEgg(129, -25, 6, '#cfe8ff', '#e07b39'); drawEgg(137, -24, 5.5, '#ffe9c2', '#d63a3a'); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(125, -22, 15, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.restore();
}
function stationWinter(cx, base, k) { // snow on the roof, a string of lights under the eaves, a wreath on the door
  ctx.save(); ctx.translate(cx, base); ctx.scale(k, k);
  ctx.beginPath(); ctx.moveTo(-178, -146); ctx.lineTo(0, -266); ctx.lineTo(178, -146);
  for (let i = 0; i <= 12; i++) { const t = 1 - i / 12, x = -178 + 356 * t, top = -146 - 120 * (1 - Math.abs(t * 2 - 1)), sag = 12 + hash(i * 2.3) * 10; ctx.quadraticCurveTo(x + 14, top + sag + 6, x, top + 10); }
  ctx.closePath(); ctx.fillStyle = vgrad(-266, -140, '#ffffff', '#d4e2f4'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(60,80,120,.45)'; ctx.stroke();
  for (const [ix, len] of [[-150, 14], [-120, 22], [-80, 12], [90, 18], [130, 24], [156, 12]]) { const top = -146 - 120 * (1 - Math.abs((ix + 178) / 356 * 2 - 1)) + 14; ctx.fillStyle = 'rgba(215,238,255,.95)'; ctx.beginPath(); ctx.moveTo(ix - 4, top); ctx.lineTo(ix + 4, top); ctx.lineTo(ix, top + len); ctx.fill(); } // icicles
  ctx.lineWidth = 2; ctx.strokeStyle = '#2a2a2a'; ctx.beginPath(); ctx.moveTo(-170, -140); for (let i = 1; i <= 10; i++) ctx.quadraticCurveTo(-170 + (i - 0.5) * 34, -132, -170 + i * 34, -140); ctx.stroke();
  for (let i = 0; i < 10; i++) { const on = (i + Math.floor(T * 3)) % 4, c = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff'][on]; const bx = -170 + (i + 0.5) * 34, by = -135; ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = LOWFX ? 0 : 10; ell(bx, by + 4, 4.5, 6.5, 0, c); ctx.restore(); }
  ctx.strokeStyle = '#2e8b57'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(71, -58, 15, 0, Math.PI * 2); ctx.stroke(); // wreath
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; circle(71 + Math.cos(a) * 15, -58 + Math.sin(a) * 15, 2.6, '#d63a3a'); }
  ctx.fillStyle = '#d63a3a'; ctx.beginPath(); ctx.moveTo(71, -44); ctx.lineTo(62, -30); ctx.lineTo(71, -38); ctx.lineTo(80, -30); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function endingSnow() { // snowy ground: soft drifts lit by the moon, blue shadows, the window's warm light pooling on the snow
  ctx.fillStyle = vgrad(440, H, '#f2f7ff', '#a9bfe0'); ctx.fillRect(0, 446, W, H - 446);
  for (const [x, w, h] of [[60, 230, 62], [420, 260, 48], [800, 280, 66]]) { // big banks in the foreground, rising out of the bottom edge
    ctx.fillStyle = 'rgba(80,110,170,.18)'; ctx.beginPath(); ctx.ellipse(x - 14, H + 14, w + 10, h + 6, 0, Math.PI, 0); ctx.fill(); // blue shadow behind the crest
    ctx.fillStyle = vgrad(H + 10 - h, H, '#ffffff', '#cfdcf0'); ctx.beginPath(); ctx.ellipse(x, H + 10, w, h, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, H + 10, w * 0.9, h * 0.94, 0, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
  }
  ctx.fillStyle = vgrad(444, 458, '#ffffff', 'rgba(255,255,255,0)'); ctx.fillRect(0, 444, W, 14);
  const pg = ctx.createRadialGradient(85, 470, 10, 85, 470, 150); pg.addColorStop(0, 'rgba(255,200,110,.35)'); pg.addColorStop(1, 'rgba(255,200,110,0)'); ctx.fillStyle = pg; ctx.fillRect(-65, 420, 300, 120);
  for (let k = 0; k < 40; k++) { const tw = Math.sin(T * 2.5 + k * 1.9); if (tw > 0.7) { const x = hash(k + 70) * W, y = 452 + hash(k + 71) * 80, s = (tw - 0.7) * 14; ctx.fillStyle = '#fff'; ctx.fillRect(x - s / 2, y - 0.6, s, 1.2); ctx.fillRect(x - 0.6, y - s / 2, 1.2, s); } }
}
function drawStory() {
  const bi = dialog ? dialog.i : 0, phA = !save.oliName, phB = !!save.oliName && !save.rexName, ph2 = !!save.rexName, quake = phB && !!dialog && dialog.lines.length === 4 && bi <= 2, roar = ph2 && bi === 0;
  ctx.save(); if (quake || roar) ctx.translate(Math.sin(T * 47) * (quake ? 3 : 2), Math.cos(T * 39) * 2);
  drawBackground(0, 0); drawGround(0, EMPTY, 0);
  drawStation(690, GROUND, 0.74);
  shadow(486, GROUND + 2, 34, 0.3); shadow(246, GROUND + 2, 64, 0.3); shadow(386, GROUND + 2, 26, 0.3);
  treeFern(70, GROUND + 4, 150); treeFern(905, GROUND + 4, 125);
  const hop = phA && bi === 1 ? Math.abs(Math.sin(T * 6)) * 26 : 0; // the kiwi hops but cannot fly
  shadow(548, GROUND + 2, 26 - hop * 0.3, 0.3); oKiwi(548, GROUND - hop, 1.5, T * 3, true);
  if (phA && bi === 1) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let k = 0; k < 3; k++) { const a = 0.4 + k * 0.5; ctx.beginPath(); ctx.arc(548, GROUND - 30 - hop, 54 + k * 8, Math.PI + a, Math.PI + a + 0.3); ctx.stroke(); } ctx.restore(); }
  oGoetti(480, GROUND, 1.2, true);
  if (phB && dialog && dialog.lines.length === 4 && bi === 3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, 40, 0, GROUND); g.addColorStop(0, 'rgba(255,230,140,0)'); g.addColorStop(1, 'rgba(255,230,140,.35)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(220, 40); ctx.lineTo(290, 40); ctx.lineTo(340, GROUND); ctx.lineTo(170, GROUND); ctx.fill(); ctx.restore(); for (let k = 0; k < 5; k++) { const a = T * 2 + k * 1.26, r = 70 + 8 * Math.sin(T * 5 + k); drawStar(255 + Math.cos(a) * r, 310 + Math.sin(a) * r * 0.9, 7 + 3 * Math.sin(T * 6 + k), '#ffe27a'); } }
  oRex(240, GROUND, 1.15, T * 2, roar ? 0.9 : save.rexName ? 0.2 : 0, Object.assign(rexLook(0), { rider: true }));
  if (phB && (!dialog || dialog.lines.length === 1)) otxt('?', 300, 214 + Math.sin(T * 4) * 8, 58, '#ffd34d', '#3b1d00', 10);
  if (roar) for (let k = 0; k < 3; k++) { const u = ((T * 1.6 + k / 3) % 1); ctx.strokeStyle = `rgba(255,240,200,${0.8 * (1 - u)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(330, 372, 30 + u * 110, -0.9, 0.9); ctx.stroke(); }
  if (ph2 && bi === 2) chiliFx.dig = true; oChili(380, GROUND, 1.4, T * 3); chiliFx.dig = false;
  if (quake) { // the volcano shook: eggs roll away across the ground
    for (let k = 0; k < 5; k++) { const x = W + 40 - ((T * 150 + k * 210) % (W + 240)), pal = [['#f6e7b0', '#6aa84f'], ['#cfe8ff', '#e07b39'], ['#ffe9c2', '#d63a3a']][k % 3]; shadow(x, GROUND + 4, 14, 0.25); drawEgg(x, GROUND - 14, 15, pal[0], pal[1], 0, -x * 0.04); }
    for (let k = 0; k < 14; k++) { const u = (T * 0.8 + k * 0.173) % 1; ctx.globalAlpha = 1 - u; circle(760 + Math.sin(k * 7) * 40, 230 - u * 160, 3 + k % 3, k % 2 ? '#ff9a3a' : '#ffd34d'); } ctx.globalAlpha = 1;
  }
  ctx.restore();
  vignette(0);
}

const chestPop = [0, 0, 0, 0];
const chestFull = () => save.treasures.every(Boolean);
let chestPartyT = 0, mapFW = 0;
function chestParty() { // all four treasures are back: the chest glows, the treasures dance and Götti's song plays
  chestPartyT = 7; SFX.right();
  [[0, 523], [0.18, 659], [0.36, 784], [0.54, 1047], [0.9, 988], [1.08, 784], [1.26, 659], [1.44, 784], [1.8, 1047], [2.0, 1319], [2.2, 1047], [2.4, 784]].forEach(([d, f]) => tone(f, 0.28, 'triangle', 0.09, null, d));
  [[0, 262], [0.9, 196], [1.8, 262], [2.4, 330]].forEach(([d, f]) => tone(f, 0.7, 'sine', 0.06, null, d));
  for (const [d, f] of [[2.9, 2100], [3.1, 2650]]) { tone(f, 0.3, 'sine', 0.1, null, d); }
}
function playTreasure(i) {
  if (!save.treasures[i]) { SFX.wrong(); toast(i === 3 ? 'Wo ist Kiwi nur? Vielleicht am Vulkan …' : 'Das hat Götti noch verloren – hinter Tür ' + ([3, 9, 15, 21][i]) + '!', '#ffb4a8'); return; }
  chestPop[i] = 1; toast(TREASURES[i].tap, '#ffd34d');
  if (i === 0) { [[196, 247, 294, 392, 494], [262, 330, 392, 523, 659], [220, 262, 330, 440, 523], [196, 247, 294, 392, 494]].forEach((ch, c) => ch.forEach((f, j) => tone(f, 0.9, 'triangle', 0.07, null, c * 0.45 + j * 0.03))); }
  else if (i === 1) { for (const d of [0, 0.28]) { tone(2100, 0.35, 'sine', 0.12, null, d); tone(2650, 0.3, 'sine', 0.07, null, d + 0.02); } }
  else if (i === 2) { noise(0.4, 0.3, 1400); tone(500, 0.15, 'sine', 0.12, 1500, 0.3); }
  else { tone(1700, 0.2, 'square', 0.05, 2700); tone(1700, 0.2, 'square', 0.05, 2700, 0.28); }
}
function drawChest() {
  // Götti's treasure chest: open lid, gold hoard, the four lost treasures sitting inside
  { const cx0 = 300, cw = 360, cy0 = H - 122, rim = cy0 + 56;
    if (chestFull()) buttons.push({ x: cx0, y: cy0 - 10, w: cw, h: 130, silent: true, cb: () => chestParty() }); // tap the full chest to celebrate again
    shadow(cx0 + cw / 2, H - 8, cw * 0.55, 0.35);
    if (chestPartyT > 0) { chestPartyT -= DT; const u = clamp(chestPartyT / 7, 0, 1), gl = ctx.createRadialGradient(cx0 + cw / 2, rim - 10, 10, cx0 + cw / 2, rim - 10, 260); gl.addColorStop(0, `rgba(255,236,150,${0.55 * Math.min(1, u * 4)})`); gl.addColorStop(1, 'rgba(255,236,150,0)'); ctx.fillStyle = gl; ctx.fillRect(cx0 - 120, rim - 250, cw + 240, 330);
      for (let i = 0; i < 4; i++) chestPop[i] = Math.max(chestPop[i], 0.5 + 0.5 * Math.sin(T * 9 + i * 1.6));
      if (Math.random() < 0.35) burst(cx0 + 40 + Math.random() * (cw - 80), rim - 30, 4, ['#ffd740', '#fff', '#ff8a9a', '#69f0ae', '#40c4ff'], 260, 380, 5, 1); }
    // open lid, seen from the inside (red velvet, wood rim, gold trim)
    ctx.beginPath(); ctx.moveTo(cx0 + 18, rim); ctx.lineTo(cx0 + 10, cy0 + 22); ctx.quadraticCurveTo(cx0 + cw / 2, cy0 - 18, cx0 + cw - 10, cy0 + 22); ctx.lineTo(cx0 + cw - 18, rim); ctx.closePath();
    ctx.fillStyle = '#7b4a28'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx0 + 30, rim - 2); ctx.lineTo(cx0 + 24, cy0 + 26); ctx.quadraticCurveTo(cx0 + cw / 2, cy0 - 6, cx0 + cw - 24, cy0 + 26); ctx.lineTo(cx0 + cw - 30, rim - 2); ctx.closePath();
    ctx.fillStyle = vgrad(cy0, rim, '#9b2a3a', '#6f1626', '#4a0e1a'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d4a017'; ctx.stroke();
    { ctx.save(); ctx.beginPath(); ctx.moveTo(cx0 + 30, rim - 2); ctx.lineTo(cx0 + 24, cy0 + 26); ctx.quadraticCurveTo(cx0 + cw / 2, cy0 - 6, cx0 + cw - 24, cy0 + 26); ctx.lineTo(cx0 + cw - 30, rim - 2); ctx.closePath(); ctx.clip(); const sh = ctx.createRadialGradient(cx0 + cw / 2, cy0 + 40, 10, cx0 + cw / 2, cy0 + 40, cw * 0.5); sh.addColorStop(0, 'rgba(255,170,150,.28)'); sh.addColorStop(1, 'rgba(255,170,150,0)'); ctx.fillStyle = sh; ctx.fillRect(cx0, cy0 - 20, cw, 90); ctx.restore(); }
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; for (let i = 1; i < 9; i++) { ctx.beginPath(); ctx.moveTo(cx0 + 24 + i * (cw - 48) / 9, cy0 + 24 - Math.sin(i / 9 * Math.PI) * 18); ctx.lineTo(cx0 + 30 + i * (cw - 60) / 9, rim - 2); ctx.stroke(); }
    otxt(`Göttis Schatzkiste  ${save.treasures.filter(Boolean).length}/4`, cx0 + cw / 2, cy0 - 12, 17, chestFull() ? '#fff6b0' : '#ffd34d', 'rgba(40,16,0,.85)', 5);
    // gold hoard filling the chest
    ctx.beginPath(); ctx.moveTo(cx0 + 12, rim + 6); ctx.quadraticCurveTo(cx0 + 40, rim - 14, cx0 + 90, rim - 6); ctx.quadraticCurveTo(cx0 + cw / 2, rim - 22, cx0 + cw - 90, rim - 6); ctx.quadraticCurveTo(cx0 + cw - 40, rim - 14, cx0 + cw - 12, rim + 6); ctx.closePath(); ctx.fillStyle = vgrad(rim - 18, rim + 6, '#ffe27a', '#e8a317'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#8a5a00'; ctx.stroke();
    for (let i = 0; i < 22; i++) { const gx = cx0 + 24 + hash(i + 70) * (cw - 48), gy = rim - 10 + hash(i + 80) * 12 - Math.abs(gx - cx0 - cw / 2) * 0.02; circle(gx, gy, 5, '#ffd34d'); circle(gx - 1, gy - 1, 3.2, '#fff0a0'); }
    for (const [gx, col] of [[cx0 + 60, '#e53935'], [cx0 + cw - 70, '#40c4ff'], [cx0 + cw / 2 + 4, '#69f0ae']]) { drawStar(gx, rim - 8, 7, col); }
    // the four treasure slots (found = the item itself, missing = a dim ?)
    for (let i = 0; i < 4; i++) {
      const x = cx0 + 45 + i * 90, y = rim - 28, has = save.treasures[i];
      chestPop[i] = Math.max(0, chestPop[i] - DT * 2);
      if (has) { const gl = ctx.createRadialGradient(x, y, 4, x, y, 44); gl.addColorStop(0, 'rgba(255,240,170,.65)'); gl.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI * 2); ctx.fill(); ctx.save(); ctx.translate(x, y); const sc = 1 + chestPop[i] * 0.4; ctx.scale(sc, sc); ctx.rotate(Math.sin(T * 20) * chestPop[i] * 0.3); drawTreasure(i, 0, 0, 0.6, T * 6); ctx.restore(); }
      else { const pu = 0.5 + 0.5 * Math.sin(T * 2.4 + i * 1.3); const gl = ctx.createRadialGradient(x, y, 6, x, y, 38); gl.addColorStop(0, `rgba(255,226,122,${0.22 + 0.2 * pu})`); gl.addColorStop(1, 'rgba(255,226,122,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.fill(); rr(x - 22, y - 22, 44, 44, 11); ctx.fillStyle = vgrad(y - 22, y + 22, '#6f3a52', '#3d1830'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = `rgba(255,214,90,${0.7 + 0.3 * pu})`; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]); otxt('?', x, y + 2, 28, '#ffe27a', 'rgba(40,10,30,.9)', 4); }
      buttons.push({ x: x - 45, y: y - 40, w: 90, h: 80, silent: true, cb: () => playTreasure(i) });
    }
    // front of the chest: wooden planks, iron-gold bands, lock
    rr(cx0, rim + 4, cw, 50, 10); ctx.fillStyle = vgrad(rim, H - 10, '#a56a35', '#80501f', '#5a3416'); ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#2b1a0c'; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx0 + 4, rim + 4 + i * 16); ctx.lineTo(cx0 + cw - 4, rim + 4 + i * 16); ctx.stroke(); }
    ctx.fillStyle = vgrad(rim, H - 10, '#ffe27a', '#d4a017', '#8a5a00'); for (const bx of [cx0 + 26, cx0 + cw - 50, cx0 + cw / 2 - 90, cx0 + cw / 2 + 74]) { rr(bx, rim + 4, 24, 50, 4); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#6a4400'; ctx.stroke(); circle(bx + 12, rim + 14, 2.6, '#6a4400'); circle(bx + 12, rim + 44, 2.6, '#6a4400'); }
    rr(cx0 + cw / 2 - 22, rim - 2, 44, 40, 8); ctx.fillStyle = vgrad(rim, rim + 40, '#ffe27a', '#d4a017'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#6a4400'; ctx.stroke(); circle(cx0 + cw / 2, rim + 14, 5, '#3a2400'); rr(cx0 + cw / 2 - 2.5, rim + 16, 5, 12, 2); ctx.fillStyle = '#3a2400'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(cx0 + 6, rim + 8, cw - 12, 4); }
}
