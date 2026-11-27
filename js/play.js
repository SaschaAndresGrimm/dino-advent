'use strict';
// Play state: update, obstacles, bosses, riddle gate, results. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// =====================================================================
// Play state
// =====================================================================
let scene = 'splash', G = null, fadeT = 0, flashT = 0; // the game opens on a tap-to-start splash: browsers only allow sound after the first touch
function go(s) {
  if (s === 'tmap') tmapT = 0;
  settingsOpen = false;
  if (scene === 'shop' && s !== 'shop' && save.newGifts.length) { save.newGifts = []; writeSave(); }
  scene = s; shopConfirm = null; wishShow = -1; endlessPick = false; doorOverlay = null; parentMode = false; titlePress = 0; fadeT = 1; if (s === 'shop') { shopTab = 0; shopSel = save.equip.skin; shopPage = Math.floor(shopSel / 8); shopTalk = { t: 4, text: 'Willkommen! Such dir etwas aus.' }; } parts = []; dialog = null; toasts = [];
  if (s === 'map' && save.masterNew && save.treasureNew < 0 && !save.afterNew) { save.masterNew = 0; writeSave(); mapFW = 9; SFX.right(); startDialog([
    { who: 'goetti', text: 'Unglaublich, {oli} und {fabio}! Alle 72 Medaillen! Ihr seid die grössten Dino-Meister der Welt!' },
    { who: 'fabio', text: 'Wir sind Meister! Wir sind Meister!' },
    { who: 'mami', text: 'Wir sind so stolz auf euch zwei!' },
    { who: 'papi', text: 'Und {rex} strahlt wie Gold!' },
    { who: 'goetti', text: 'Dafür habe ich etwas ganz Besonderes: den Dino-Meister-Anzug und die Meister-Krone. {rex} trägt sie schon – im Laden kannst du sie jederzeit wechseln!' },
  ]); }
  if (s === 'map' && save.afterNew > 0 && save.treasureNew < 0) { const d = save.afterNew; save.afterNew = 0; writeSave(); startDialog(DAY_AFTER[d] || [], () => { if (d === 6 || d === 12 || d === 18) { tmapNew = d / 6 - 1; go('tmap'); } }); }
  if (s === 'map' && save.treasureNew >= 0) { const k = save.treasureNew; save.treasureNew = -1; writeSave(); chestPop[k] = 1; startDialog([{ who: k === 3 ? 'kiwi' : 'goetti', text: k === 3 ? 'Kiwi! Kiwi! (Kiwi hüpft vor Freude.)' : TREASURES[k].line }].concat(k === 3 ? [{ who: 'goetti', text: TREASURES[3].line }] : []), () => { if (chestFull() && !save.chestSeen) { save.chestSeen = 1; writeSave(); startDialog([{ who: 'goetti', text: 'Meine Schatzkiste ist wieder voll! Gitarre, Velo, Angel und Kiwi – danke, ihr zwei!' }, { who: 'kiwi', text: 'Kiwi! Kiwi! (Kiwi macht einen Freudentanz.)' }], () => chestParty()); } }); }
  if (s === 'map') queueCandle(); // an Advent candle is due: Rex lights it (after any dialog that is already running)
}

function startLevel(arg, endless) { // endless: arg = theme index. otherwise arg = calendar level index 0..23
  go('play');
  const LV = endless ? null : LEVELS[arg], wi = endless ? arg : LV.wi;
  const L = buildLevel(wi, !!endless, LV);
  G = { L, wi, li: endless ? -1 : arg, sk: skillsFor(endless ? null : arg, wi), cam: 0, t: 0, startT: 1.6, stopped: false, overlay: null, shake: 0, tip: null, eggsGot: [false, false, false], amber: 0,
    p: { wx: 200, y: GROUND, vy: 0, onGround: true, jumps: 0, coyote: 0, inv: 0, roarT: 0, roarCd: 0, hearts: endless ? 3 : MAX_HEARTS, ph: 0, duck: false, stomp: false, spin: 1, fireT: 0, fireCd: 0, breathT: 0, roarMax: 3 },
    duckHeld: null, fireballs: [], flames: [],
    chili: { wx: 95, y: GROUND, ph: 0, dig: null, digT: 0 }, cp: 200, rings: [], trail: { x: [], y: [], pl: [] }, fol: newFollowers(),
    boss: null, bossStarted: false, golden: null, gotGolden: false, atGate: false, gateT: 0, gateStep: 0, gateGlow: 0, nudge: 0, gateOpening: false, gateOpen: 0, finished: false,
    coach: null, flyEggs: [], slotPop: [0, 0, 0], hitFlash: 0, endless: !!endless, maxH: endless ? 3 : MAX_HEARTS, score: 0, heartAt: 500, tier: 1 };
  if (!endless) { G.chiliSay = { text: fmt('Los geht\'s, ihr zwei!'), t: 2.6 }; G.chiliCd = 4; }
  if (endless) { G.tip = { text: 'Endlos-Lauf! Es wird immer schneller und gefährlicher. Alle 500 Punkte gibt es ein Herz zurück.', t: 5 }; G.startT = 1.2; }
}

const pick = a => a[Math.floor(Math.random() * a.length)];
function chiliSay(text, force, mood) { // short speech bubble from Chili, rate-limited so it never nags
  text = fmt(text); if (!G || G.endless) return; if (!force && G.chiliCd > 0) return;
  G.chiliSay = { text, t: 2.6 }; G.chiliCd = 6; SFX.chirp(mood);
}
function cheer() { // the first time a new move works: a small celebration
  const p = G.p; SFX.right(); burst(p.wx + 20, p.y - 100, 30, ['#ffd740', '#fff', '#69f0ae', '#40c4ff', '#ff8a9a'], 380, 500, 7, 1);
  G.rings.push({ x: p.wx + 20, y: p.y - 90, r: 12, a: 1, c: '255,230,120' }); toast(pick(['Super!', 'Toll gemacht!', 'Genau so!', 'Perfekt!']), '#ffe08a'); chiliSay(pick(['Juhu, {oli}!', 'Das war klasse!']), true);
}
const JUMP_V = 900, HOP_V = 640, JUMP_BUF = 0.12, NEAR_PX = 30, NEAR_CAP = 12; // HOP_V: speed an early release cuts the jump to; NEAR_CAP: paid near misses per level (shop economy)
function jump() {
  const p = G.p; if (G.startT > 0.3) return;
  let learned = false; if (G.coach) { if (G.coach.type !== 'jump' && G.coach.type !== 'glide' && G.coach.type !== 'djump') return; learned = true; G.coach = null; }
  if (learned) setTimeout(() => { if (G && scene === 'play') cheer(); }, 260);
  if (G.L.swim) { p.vy = -380; p.jumps = 0; p.onGround = false; p.anti = 0.05; SFX.jump2(); SFX.bubble(); burst(p.wx + 10, p.y - 40, 5, ['#e8ffff', '#fff'], 90, -60, 5, 0.6); return; }
  if (p.onGround || p.coyote > 0) { p.anti = 0.09; p.vy = -JUMP_V; p.jumps = 1; p.jh = true; p.coyote = 0; p.onGround = false; SFX.jump(); burst(p.wx, GROUND, 6, ['#d8c3a5', '#b39b7a'], 120, 300, 5, 0.4); }
  else if (p.jumps < 2) { p.vy = -760; p.jumps = 2; p.jh = false; SFX.jump2(); G.rings.push({ x: p.wx, y: p.y, r: 10, a: 0.8, c: '255,255,255' }); }
  else if (p.vy > 0) G.jbuf = JUMP_BUF; // jump buffer: a press just before landing fires on touchdown
}
function jumpRelease() { // letting go early gives a short hop; a quick tap still jumps almost fully (kids tap briefly)
  if (!G || scene !== 'play' || !G.p) return; const p = G.p;
  if (p.jh && p.vy < -HOP_V && !G.L.swim) p.vy = -HOP_V; p.jh = false;
}
function duckDown(id) {
  if (!G || scene !== 'play' || G.overlay || !G.sk.duck) return;
  const p = G.p; G.duckHeld = id;
  if (G.coach) { if (G.coach.type !== 'duck' && G.coach.type !== 'stomp') return; G.coach = null; setTimeout(() => { if (G && scene === 'play') cheer(); }, 260); }
  if (G.startT > 0.3) return;
  if (!p.onGround && !p.stomp && G.sk.stomp && !G.L.swim) { p.stomp = true; p.spin = 0; p.vy = Math.min(p.vy, -380); tone(300, 0.3, 'triangle', 0.08, 900); }
  else if (p.onGround) SFX.duck();
}
function dash() {
  const p = G.p; if (!G || scene !== 'play' || G.overlay || !G.sk.dash || G.L.swim || (p.dashCd > 0 && !(G.coach && G.coach.type === 'dash')) || G.startT > 0.3) return; // the coach frame is frozen, so its cooldown could never run out
  if (G.coach) { if (G.coach.type !== 'dash') return; G.coach = null; setTimeout(() => { if (G && scene === 'play') cheer(); }, 260); }
  p.dashT = 0.4; p.dashCd = 1.7; SFX.dash(); G.rings.push({ x: p.wx + 20, y: p.y - 60, r: 12, a: 0.9, c: '255,255,255' });
}
function dashBreak(o) { // the dash smashes obstacles and sends enemies flying
  const th = WORLDS[G.wi];
  if (o.type === 'raptor' || o.type === 'ptero' || o.type === 'compy' || o.type === 'sword' || o.type === 'hopper') { if (!o.scared) { o.scared = true; o.vx = 520; o.vy = -380; SFX.smash(); } return; }
  o.dead = true; panAt(o.x, SFX.smash); burst(o.x, GROUND - (o.h || 60) / 2, 26, o.type === 'wall' && G.wi === 5 ? ['#f0dca0', '#d8b878', '#fff'] : [th.rock, '#5a4a3a', '#a89888'], 460, 1200, 9, 0.9);
  for (let i = 0; i < (o.type === 'wall' ? 5 : 2); i++) G.L.amb.push({ x: o.x + 40 + i * 36, y: GROUND - 60 - i * 18, got: false });
}
function duckUp(id) { if (G && (id == null || G.duckHeld === id)) G.duckHeld = null; }
function stompLand() {
  const p = G.p, th = WORLDS[G.wi];
  SFX.stomp(); G.shake = Math.max(G.shake, 0.45); G.freeze = 0.08;
  burst(p.wx, p.y, 26, ['#d8c3a5', '#b39b7a', '#fff'], 380, 900, 7, 0.6);
  G.rings.push({ x: p.wx + 10, y: p.y - 10, r: 20, a: 1, c: '255,240,200' });
  const sc = G.L.secret; if (sc && sc.kind === 'ice' && sc.state === 'idle' && Math.abs(sc.x - (p.wx + 10)) < 130) openSecret(sc);
  for (const o of G.L.obs) {
    if (o.dead || o.scared || o.flat) continue;
    const d = o.x - p.wx; if (d < -110 || d > 190) continue;
    if (o.type === 'geode') breakGeode(o);
    else if (o.type === 'compy') squashCompy(o, false);
    else if (o.type === 'rock') { o.dead = true; SFX.smash(); burst(o.x, GROUND - 20, 18, [th.rock, '#5a4a3a', '#a89888'], 380, 1300, 9, 0.8); for (let i = 0; i < 2; i++) G.L.amb.push({ x: o.x + 40 + i * 40, y: GROUND - 60 - i * 20, got: false }); }
    else if (o.type === 'raptor') { o.scared = true; o.vx = 380; o.vy = -320; }
  }
}
function breakGeode(o) {
  o.dead = true; panAt(o.x, SFX.smash); setTimeout(SFX.amber, 120);
  burst(o.x, GROUND - 20, 26, ['#8a8a92', '#ffd166', '#ff9f1c', '#fff'], 420, 1100, 8, 0.9);
  for (let i = 0; i < 6; i++) G.L.amb.push({ x: o.x + 30 + i * 34, y: GROUND - 70 - Math.sin(i / 5 * Math.PI) * 70, got: false });
  toast('Bernstein-Schatz!', '#ffd166');
}
function squashCompy(o, bounce) {
  o.flat = 1.1; panAt(o.x, SFX.boing); burst(o.x, GROUND - 14, 10, ['#d8e85a', '#fff'], 220, 600, 6, 0.5);
  G.L.amb.push({ x: G.stopped ? G.p.wx + 10 : o.x + 60, y: GROUND - 110, got: false });
  if (bounce) { const p = G.p; p.vy = -720; p.jumps = 1; p.stomp = false; p.spin = 1; }
}
function shootFire() {
  const p = G.p; if (p.fireCd > 0 || G.startT > 0.3) return;
  p.fireCd = 0.28; p.breathT = 0.3; SFX.fire();
  const [mx, my] = rexMouth(p.duck), ox = p.wx + mx * 0.92, oy = p.y + my * 0.92;
  G.fireballs.push({ x: ox + 14, y: oy, vx: 950, vy: 200, life: 1.1 });
  for (let i = 0; i < 22; i++) { const l = 0.25 + Math.random() * 0.25; G.flames.push({ x: ox, y: oy, vx: 350 + Math.random() * 600, vy: (Math.random() - 0.5) * 200 - 30, life: l, max: l, r: 5 + Math.random() * 7 }); }
}
const CEILING_HAZARDS = ['low']; // overhangs: fireballs and the dash pass underneath instead of destroying them
const ROAR_BREAKS = ['boulder', 'rollrock', 'plant'], ROAR_REACH = 420, ROAR_GRACE = 0.22, ROAR_WHIFF = 0.7, ROAR_TARGETS = ['raptor', 'ptero', 'sword', 'hopper', 'jelly', 'urchin']; // what a roar smashes, how far ahead it reaches, how long a touching rock waits for a late roar, the short cooldown after a roar that hit nothing
function cliffStep(o, step) { // walking enemies never walk into an abyss: at the edge of a pit they turn round (o.dir: -1 = towards Rex, 1 = away)
  const dir = o.dir || -1, nx = o.x + dir * step, edge = nx + dir * 34, inPit = x => G.L.pits.some(q => x > q.x && x < q.x + q.w);
  if (inPit(edge) && !inPit(o.x)) { o.dir = -dir; return o.x; }
  return nx;
}
function roarSmash(o) {
  o.dead = true; SFX.smash();
  if (o.type === 'plant') { burst(o.x, GROUND - 30, 20, ['#5fbf4a', '#2f7a2c', '#fff'], 360, 700, 8, 0.8); return; }
  const th = WORLDS[G.wi];
  burst(o.x, GROUND - (o.h || 40) / 2, 22, [th.rock, '#5a4a3a', '#a89888'], 420, 1300, 10, 0.9);
  for (let i = 0; i < 3; i++) G.L.amb.push({ x: o.x + 40 + i * 40, y: GROUND - 60 - i * 20, got: false });
}
function roarWave() { // the roar is a shock wave, not a single instant: while it lasts it also smashes rocks that come into reach (an early press is not wasted)
  const p = G.p; for (const o of G.L.obs) if (!o.dead && ROAR_BREAKS.includes(o.type)) { const d = o.x - p.wx; if (d > -40 && d < ROAR_REACH) roarSmash(o); }
}
function roarSound(water) { audio(); if (water) SFX.roarWater(); else SFX.roar(); } // audio() wakes a context the browser suspended, so the roar can never be mute
function roar() {
  const p = G.p;
  if (G.coach) { if (G.coach.type !== 'roar') return; G.coach = null; p.roarCd = 0; }
  if (p.fireT > 0 && !G.boss) { shootFire(); return; }
  if (G.boss && G.boss.state === 'duel') { G.boss.meter = Math.min(1, G.boss.meter + 0.2); roarSound(); G.shake = Math.max(G.shake, 0.35); G.rings.push({ x: p.wx + 80, y: p.y - 100, r: 20, a: 1, c: '255,220,120' }); p.roarT = 0.3; return; }
  if (p.roarCd > 0 || G.startT > 0.3) return; // cooling down (the button is grey): no roar, no sound
  const sw = G.L.swim;
  const sc0 = G.L.secret, ahead = Math.max(...[-1e9, ...G.L.obs.filter(o => !o.dead && !o.scared).map(o => { const d = o.x - p.wx; return d < -40 ? -1e9 : ROAR_BREAKS.includes(o.type) ? (d < ROAR_REACH + G.L.speed * 0.55 ? 1 : -1e9) : ROAR_TARGETS.includes(o.type) && d < ROAR_REACH ? 1 : -1e9; })]) > 0 || (sc0 && sc0.kind === 'tree' && sc0.state === 'idle' && sc0.x - p.wx > -80 && sc0.x - p.wx < 640);
  p.roarT = 0.55; p.roarMax = G.boss ? 1.0 : ahead ? 3.0 : ROAR_WHIFF; p.roarCd = p.roarMax; // a roar that hit nothing (pressed far too early) only cools down briefly, so it can be repeated in time
  roarSound(sw); G.shake = Math.max(G.shake, sw ? 0.15 : 0.3); // water dampens the shake
  const sc = G.L.secret; if (sc && sc.kind === 'tree' && sc.state === 'idle' && sc.x - p.wx > -80 && sc.x - p.wx < 640) openSecret(sc); // the roar shakes the big tree
  if (sw) swimRoar(); else G.rings.push({ x: p.wx + 80, y: p.y - 100, r: 20, a: 1, c: '255,220,120' });
  for (const o of G.L.obs) {
    if (o.dead || o.scared) continue;
    const d = o.x - p.wx; if (d < -40 || d > ROAR_REACH) continue;
    if (sw && o.type === 'jelly') { // the bubble wave shoves jellies out of Rex's lane (they float up or down, never pop)
      const my = p.y - 50; o.ty = my < 270 ? 350 : 150; burst(o.x, o.y || o.y0, 7, ['#ffd6ec', '#fff', '#e8ffff'], 130, -90, 5, 0.8);
    } else if (sw && o.type === 'urchin') { // an urchin gets wrapped in a bubble and drifts up, harmless; it leaves a little amber
      o.scared = true; o.rise = 0; o.alpha = 1; SFX.bubble(); if (!o.minion) for (let i = 0; i < 3; i++) G.L.amb.push({ x: o.x - 30 + i * 30, y: GROUND - 85 - i * 25, got: false });
    } else if (ROAR_BREAKS.includes(o.type)) roarSmash(o);
    else if (o.type === 'raptor' || o.type === 'ptero' || o.type === 'sword' || o.type === 'hopper') { o.scared = true; o.vx = 380; o.vy = -320; }
    else if (o.type === 'compy' && d < 300 && !G.compyHint) { G.compyHint = true; toast('Kompsis sind zu frech – spring drauf!', '#ffe08a'); }
  }
  if (sw) for (const a of G.L.amb) { const d = a.x - p.wx; if (!a.got && d > -40 && d < 360) a.pull = 0.9; } // the bubble wave carries nearby amber to Rex
}
function swimRoar() { // bubbles instead of sound rings: a burst from the mouth, a wave that travels ahead, and a few from Chili
  const p = G.p, c = G.chili;
  G.rings.push({ x: p.wx + 80, y: p.y - 100, r: 14, a: 1, c: '210,245,255' }); // pale blue instead of gold
  burst(p.wx + 80, p.y - 95, 16, ['#e8ffff', '#bfeaff', '#fff'], 170, -150, 8, 1.2);
  p.bubT = 0.5;
  if (c) burst(c.wx + 20, (c.y || p.y) - 50, 4, ['#e8ffff', '#fff'], 90, -140, 5, 0.9);
}
function hurt(force) {
  const p = G.p; if (!force && (p.inv > 0 || p.dashT > 0)) return;
  if (!force && G.shield) { G.shield = false; p.inv = 1.2; SFX.smash(); G.rings.push({ x: p.wx, y: p.y - 70, r: 30, a: 1, c: '150,220,255' }); burst(p.wx, p.y - 70, 24, ['#bfe9ff', '#fff', '#7fd0ff'], 320, 200, 6, 0.8); toast('Der Schutzschild hat dich gerettet!', '#9fd3ff'); return; }
  p.hearts--; p.hitT = 0.45; G.hits = (G.hits || 0) + 1; p.inv = 1.8; SFX.hurt(); if (p.hearts === 1) setTimeout(() => { if (scene === 'play' && G && !G.overlay) SFX.lowHeart(); }, 350); G.shake = p.hearts <= 0 ? 0 : 0.35; G.hitFlash = 0.45;
  try { if (!save.calm && navigator.vibrate) navigator.vibrate(180); } catch (e) {}
  if (!force) p.vy = Math.min(p.vy, -450);
  chiliSay(pick(['Aua! Nicht aufgeben!', 'Weiter geht\'s, ihr zwei!', 'Du schaffst das!']), true, 'worried');
  if (p.hearts <= 0) { if (G.endless) endRun(); else { G.overlay = { type: 'retry' }; setTimeout(() => { if (scene === 'play') SFX.lose(); }, 250); } }
}
function endRun() {
  G.score = Math.max(G.score, Math.floor((G.p.wx - 200) / 25) + G.amber * 3);
  const prev = G.daily ? (save.dailyBest || 0) : (save.best[G.wi] || 0), isNew = G.score > prev;
  if (isNew) { if (G.daily) save.dailyBest = G.score; else save.best[G.wi] = G.score; } save.amber += G.amber;
  let bonus = 0; if (G.daily && save.dailyLast !== dayKey()) { save.dailyStreak = save.dailyLast === prevDayKey() ? save.dailyStreak + 1 : 1; save.dailyLast = dayKey(); bonus = 20; save.amber += bonus; }
  writeSave();
  G.overlay = { type: 'endover', isNew, prev, t: 0, bonus, streak: G.daily ? save.dailyStreak : 0 }; SFX.wrong(); if (isNew) setTimeout(SFX.right, 350);
  const wi = G.daily ? 8 : G.wi, sc = G.score; if (G.daily) dailyRefresh();
  if (boardQualifies(wi, sc)) setTimeout(() => {
    if (!G || !G.overlay || G.overlay.type !== 'endover') return;
    askName('In der Bestenliste! Wie heisst du?', save.nick || save.oliName || 'Oli', name => { const r = boardAdd(wi, cleanNick(name).name, sc); if (G && G.overlay && G.overlay.type === 'endover') G.overlay.rank = r; SFX.right(); }, v => { const c = cleanNick(v); return c.ok ? '' : c.msg; });
  }, 1300);
}
function resetSecretPepper(L) { for (const pp of L.peppers) if (pp.sec && L.secret && L.secret.state === 'idle') pp.got = false; } // the Kiwi pepper must be there again after a respawn
function openSecret(sc) { // a treasure's hiding place was found: it pops out and flies to where Rex can grab it
  const gs = G, L = gs.L, p = gs.p, tr = L.treasure; if (!sc || sc.state !== 'idle' || !tr) return;
  sc.state = 'open'; sc.shake = 0.9;
  const ahead = Math.max(sc.x + 50, p.wx + 250); let f;
  if (sc.kind === 'tree') { f = { x0: sc.x + 50, y0: GROUND - 255, x1: ahead, y1: GROUND - 100, h: 40 }; burst(sc.x, GROUND - 230, 44, ['#5fbf4a', '#2f7a2c', '#9be26a', '#fff'], 360, 500, 9, 1.3); gs.shake = Math.max(gs.shake, 0.5); panAt(sc.x, SFX.smash); }
  else if (sc.kind === 'rock') { f = { x0: sc.x, y0: GROUND - 50, x1: Math.max(sc.x + 120, p.wx + 260), y1: GROUND - 100, h: 150 }; burst(sc.x, GROUND - 30, 30, [WORLDS[gs.wi].rock, '#5a4a3a', '#ffe08a', '#fff'], 460, 1200, 9, 0.9); }
  else if (sc.kind === 'ice') { f = { x0: sc.x, y0: GROUND - 20, x1: Math.max(sc.x + 60, p.wx + 250), y1: GROUND - 105, h: 190 }; burst(sc.x, GROUND, 34, ['#e0f4ff', '#9fd3ff', '#fff'], 420, 900, 8, 1); panAt(sc.x, SFX.crack); }
  else { f = { x0: sc.x, y0: GROUND - 40, x1: Math.max(sc.x + 70, p.wx + 260), y1: GROUND - 90, h: 130 }; burst(sc.x, GROUND - 40, 40, ['#8a8484', '#4a4546', '#ffb030', '#fff'], 380, 500, 9, 1.2); }
  tr.shown = true; tr.fly = { t: 0, d: 0.85, ...f }; tr.x = f.x0; tr.y = f.y0;
  SFX.power(); setTimeout(() => { if (G === gs && scene === 'play') SFX.sparkle(); }, 300);
  toast(['Hui! Da fällt etwas heraus!', 'Der Fels ist kaputt – da war etwas drin!', 'Das Eis bricht – da war etwas drin!', 'Die Asche fliegt weg – da war etwas drin!'][tr.k], '#ffd740');
}
function secretCue(sc, dt) { // a sound that grows louder as Rex gets close, and Chili notices it once
  const d = sc.x - G.p.wx; if (d < -60 || d > 1100) return;
  if (!sc.noticed && d < 700 && d > 150) { sc.noticed = true; chiliSay(TREASURES[G.L.treasure.k].notice, true); } // once per level, so it may cut in on the rate limit
  sc.cue -= dt; if (sc.cue > 0) return;
  sc.cue = 1.2 + Math.max(0, d) / 1100 * 1.3; const v = clamp(1.1 - Math.max(0, d) / 1100, 0.2, 1) * 0.11, n = (sc.n = (sc.n || 0) + 1);
  panAt(sc.x, () => {
    if (sc.kind === 'tree') { const f = [392, 523, 659, 523][n % 4]; tone(f, 0.55, 'triangle', v); tone(f * 2, 0.3, 'sine', v * 0.35); }
    else if (sc.kind === 'rock') { tone(1568, 0.3, 'sine', v); tone(2093, 0.4, 'sine', v * 0.8, null, 0.14); }
    else if (sc.kind === 'ice') { tone(2637, 0.22, 'sine', v * 0.8); tone(3520, 0.3, 'sine', v * 0.55, null, 0.09); tone(1200, 0.12, 'sine', v * 0.6, 1900, 0.2); }
    else { tone(1900, 0.08, 'triangle', v, 2500); tone(2100, 0.08, 'triangle', v * 0.9, 2700, 0.14); tone(2000, 0.07, 'triangle', v * 0.7, 2500, 0.26); }
  });
}
function resetCrumble(L) { for (const pl of L.plats) if (pl.crumble) { pl.gone = false; pl.t = null; pl.y = pl.y0; pl.fv = 0; } }
function safeSpawn(x) { // never respawn in or right next to a pit: step back until there is room to run
  const L = G.L, bad = q => L.pits.some(p => q + 450 > p.x && q - 120 < p.x + p.w); let g = 0;
  while (bad(x) && g++ < 120) x -= 40; return Math.max(x, 100);
}
// Followers (Chili, baby, Kiwi) replay Rex's path: the trail stores his height by world x, so every follower hops exactly where Rex hopped
// (obstacles, pits, platforms, swimming) without any per-obstacle rules. Screen offsets stay inside the view (Rex sits at screen x 270; Kiwi at 230 is still fully visible).
const FOL = { baby: 190, kiwi: 235 };
function newFollowers() { return { baby: { ph: 0, y: GROUND, pb: null, land: 0, tilt: 0 }, kiwi: { ph: 0, y: GROUND, pb: null, land: 0, tilt: 0 } }; }
function squashed(x, y, land, tilt, fn) { // landing squash about the feet (land 0..1) and a swim tilt about the body, like Rex
  if (!land && !tilt) { fn(); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(1 + 0.14 * land, 1 - 0.18 * land); ctx.translate(0, -30); ctx.rotate(tilt); ctx.translate(-x, -(y - 30)); fn(); ctx.restore();
}
function resetTrail() { G.trail = { x: [], y: [], pl: [] }; G.fol = newFollowers(); Object.assign(G.chili, { pb: null, py: null, sy: null, wasAir: false, land: 0, y: GROUND, joy: 0 }); }
function trailPush(x, y, pl) { // pl: the platform Rex stands on (or null), so followers can tell when it has crumbled away
  const t = G.trail;
  while (t.x.length && t.x[t.x.length - 1] > x + 1.5) { t.x.pop(); t.y.pop(); t.pl.pop(); } // the player moved back (boss lunge, gate clamp): forget the way ahead
  const m = t.x.length - 1;
  if (m >= 0 && x - t.x[m] < 1.5) { t.y[m] = y; t.pl[m] = pl; return; } // standing still: keep only the latest height
  t.x.push(x); t.y.push(y); t.pl.push(pl);
  while (t.x.length > 2 && t.x[1] < x - 900) { t.x.shift(); t.y.shift(); t.pl.shift(); }
}
function trailLo(x) { // index of the last sample at or before x (-1 before the first one)
  const t = G.trail, n = t.x.length;
  if (!n || x < t.x[0]) return -1;
  if (x >= t.x[n - 1]) return n - 1;
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t.x[m] <= x) lo = m; else hi = m; }
  return lo;
}
function trailY(x) {
  const t = G.trail, lo = trailLo(x);
  if (lo < 0) return GROUND;
  if (lo === t.x.length - 1) return t.y[lo];
  return t.y[lo] + (t.y[lo + 1] - t.y[lo]) * ((x - t.x[lo]) / (t.x[lo + 1] - t.x[lo] || 1));
}
function followY(x) { // where a follower stands at world x: Rex's trail (never below the ground), plus a safety hop so nobody ever floats or walks into a pit
  const lo = trailLo(x), pl = lo >= 0 ? G.trail.pl[lo] : null; let y = trailY(x);
  if (pl && pl.gone) y = Math.max(y, pl.y); // the crumbling step Rex stood on is falling away: ride it down instead of hovering
  y = Math.min(y, GROUND);
  for (const pit of G.L.pits) if (x > pit.x - 30 && x < pit.x + pit.w + 30) { const u = (x - (pit.x - 30)) / (pit.w + 60); y = Math.min(y, GROUND - 4 * 90 * u * (1 - u)); }
  return y;
}
function updateFollowers(dt) { // baby and Kiwi (Chili has his own update because he digs)
  const p = G.p, moving = !(G.startT > 0 || G.stopped), swim = G.L.swim;
  trailPush(p.wx, p.y, p.onGround && p.y < GROUND - 1 ? G.L.plats.find(q => !q.gone && p.wx + 25 > q.x && p.wx - 25 < q.x + q.w && Math.abs(q.y - p.y) < 4) || null : null);
  for (const k of ['baby', 'kiwi']) {
    if (!(k === 'kiwi' ? save.treasures[3] : save.babyName)) continue; // not part of the family yet: nothing is drawn, so no dust or bubbles either
    const f = G.fol[k], base = followY(p.wx - FOL[k]), vb = f.pb == null ? 0 : (base - f.pb) / Math.max(dt, 1e-3);
    f.pb = base; const wasAir = f.air; f.air = Math.abs(vb) > 40;
    if (wasAir && !f.air && !swim) { f.land = 0.14; burst(p.wx - FOL[k], base, 3, ['#d8c3a5', '#fff'], 90, 200, 4, 0.35); } // a little thump and dust, like Rex
    f.land = Math.max(0, f.land - dt); f.tilt = swim ? clamp(vb / 900, -0.4, 0.4) : 0;
    if (swim && Math.random() < 0.03) burst(p.wx - FOL[k] + 10, f.y - 40, 1, ['#dff'], 40, -120, 6, 0.8);
    if (!f.air && moving) f.ph += dt * 13; // feet only run on the ground: they freeze while hopping
    const bob = f.air || !moving ? 0 : k === 'kiwi' ? Math.abs(Math.sin(f.ph * 0.7 + 1)) * 12 : Math.abs(Math.sin(f.ph * 0.6)) * 10;
    f.y = base - bob + (swim ? Math.sin(G.t * 3 + (k === 'kiwi' ? 1 : 0)) * 5 : 0);
  }
}
function pitFall() {
  const p = G.p, L = G.L;
  const pit = L.pits.find(q => p.wx > q.x - 60 && p.wx < q.x + q.w + 60);
  let nx = pit ? pit.x - 480 : p.wx - 480, guard = 0;
  while (!supported(L, nx) && guard++ < 30) nx -= 40;
  nx = safeSpawn(nx);
  p.wx = nx; p.y = GROUND; p.vy = 0; G.chili.wx = nx - 145; resetTrail(); G.startT = 1.4;
  resetCrumble(L); resetSecretPepper(L); hurt(true); p.inv = 3;
}
function retry() {
  for (const k in mus.saved) if (isBossKey(k)) delete mus.saved[k]; // every boss attempt starts the theme from the top
  if (isBossKey(mus.key)) mus.key = null;
  const p = G.p, L = G.L;
  const fk = G.bossStarted ? 'b' + (G.bossCp || 0) : String(G.cp); G.fails = G.fails || {}; G.fails[fk] = (G.fails[fk] || 0) + 1;
  if (G.fails[fk] >= 2 && !G.endless && !G.shield) { G.shield = true; G.fails[fk] = 0; setTimeout(() => { if (G && scene === 'play') toast('Chili schenkt dir einen Schutzschild!', '#9fd3ff'); }, 700); }
  G.overlay = null; p.hearts = G.maxH; p.inv = 2; p.wx = G.bossStarted ? G.cp : safeSpawn(G.cp); p.y = GROUND; p.vy = 0; p.roarCd = 0; p.stomp = false; p.spin = 1; G.duckHeld = null; G.fireballs = []; G.flames = [];
  G.chili.wx = p.wx - 145; G.chili.dig = null; resetTrail(); resetCrumble(L); resetSecretPepper(L);
  for (const s of L.spots) if (s.state === 'dig') s.state = 'idle';
  for (const o of L.obs) if ((o.type === 'raptor' || o.type === 'ptero' || o.type === 'compy' || o.type === 'hopper' || o.type === 'seed') && o.x > G.cp - 300 && o.x < G.cp + 700) o.dead = true;
  if (G.bossStarted && !G.golden && !G.bossDone) { p.wx = L.bossX; G.chili.wx = p.wx - 90; resetTrail(); G.boss = newBoss(G.bossCp || 0); G.stopped = true; for (const o of L.obs) if (o.minion) o.dead = true; if (G.boss.phase > 0) startBossPhase(G.boss); }
  G.startT = 0.9;
}
const BOSS_KINDS = {
  king: { name: 'Krallenkönig', duel: true, minions: ['raptor', 'compy', 'compy', 'compy'], phases: [
    { name: 'Sturmangriff', type: 'charge', say: 'Er stürmt los! Brülle genau dann, wenn er ganz nah ist!' },
    { name: 'Felsenhagel', type: 'volley', say: 'Felsen! Weich aus – und brüll, wenn er erschöpft ist!' },
    { name: 'Das Rudel', type: 'summon', say: 'Er ruft sein Rudel! Spring drauf, brüll sie weg – dann kommt er selbst!' },
    { name: 'Vulkanwut', type: 'leap', say: 'Die Lava kocht! Spring, wenn der Boden glüht!' }] },
  crab: { name: 'Krabbenkönig', duel: false, minions: ['crab', 'crab', 'crab', 'crab', 'crab'], phases: [
    { name: 'Kokosnuss-Hagel', type: 'volley', say: 'Kokosnüsse! Spring drüber – und brüll, wenn er erschöpft ist!' },
    { name: 'Die Krabbenarmee', type: 'summon', say: 'Seine Krabben kommen! Hüpf auf ihre Köpfe – dann greift der König selbst an!' },
    { name: 'Erdbeben', type: 'quake', say: 'Er stampft auf den Boden! Spring über jede Welle – und brüll, wenn er erschöpft ist!' }] },
  kraken: { name: 'Das Seeungeheuer', duel: false, minions: ['sword', 'jelly', 'jelly', 'sword'], phases: [
    { name: 'Tintenkugeln', type: 'volley', say: 'Tintenkugeln! Schwimm hoch oder runter – und brüll, wenn er erschöpft ist!' },
    { name: 'Tentakel-Angriff', type: 'lane', say: 'Achtung, rote Streifen! Schwimm aus der Bahn, bevor es zuschlägt!' },
    { name: 'Das Tiefsee-Rudel', type: 'summon', say: 'Schwertfische und Quallen! Weich aus – dann kommt das Seeungeheuer selbst!' }] },
  queen: { name: 'Adlerkönigin', duel: false, minions: ['ptero', 'rollrock', 'compy'], phases: [
    { name: 'Federhagel', type: 'volley', say: 'Federn! Weich aus – und brüll, wenn sie erschöpft ist!' },
    { name: 'Sturzflug', type: 'leap', say: 'Sie stürzt herab! Spring über die Windwelle!' },
    { name: 'Sturmwolke', type: 'summon', say: 'Der Sturm ruft ihr Gefolge! Spring, gleite und brüll!' }] },
};
const bossKind = b => BOSS_KINDS[b.kind || 'king'];
function newBoss(phase = 0) {
  const home = G.L.bossX + 620;
  return { kind: G.L.bossKind || 'king', x: phase === 0 ? G.L.bossX + 1000 : home, y: 0, hp: 3, phase, state: phase === 0 ? 'enter' : 'taunt', t: 0, ph: 0, flash: 0, n: 0, rocks: [], hazards: [], volley: null, meter: 0.15, duelT: 0 };
}
function bossTele(b, dur = 0.5) { b.tele = { t: dur, max: dur }; SFX.warn(); } // every attack is announced ~0.5 s ahead: flash, '!' badge, wind-up pose and a warning beep
function bossBanner(text, sub, col = '#ffd34d') { G.banner = { t: 2.0, text, sub, col }; }
function startBossPhase(b) {
  const ph = bossKind(b).phases[b.phase]; b.hp = 3; b.state = 'taunt'; b.t = 0; b.n = 0; b.rocks = []; b.hazards = []; G.bossCp = b.phase;
  bossBanner(`PHASE ${b.phase + 1}`, ph.name, b.phase === bossKind(b).phases.length - 1 && b.kind === 'king' ? '#ff6a3a' : '#ffd34d'); SFX.roar(); G.shake = Math.max(G.shake, 0.5);
  G.tip = { text: ph.say, t: 4 };
}
function bossHurt(b, bx) { // a successful roar: flash, shake, count down this phase's hp
  const p = G.p, K = bossKind(b); p.roarT = 0; b.hp--; b.flash = 0.5; panAt(b.x, SFX.smash); G.shake = 0.5; G.hitFlash = 0;
  burst(bx - 40, GROUND - 120 + b.y, 34, ['#ffd740', '#fff', '#ff7043'], 420, 600, 8, 0.9);
  G.rings.push({ x: bx, y: GROUND - 120, r: 20, a: 1, c: '255,200,120' });
  if (b.hp > 0) { toast(b.hp === 2 ? 'Treffer! Noch 2 Mal!' : 'Super! Noch 1 Mal!', '#9cff8a'); b.state = 'back'; b.t = 0; return; }
  // phase cleared: the boss staggers, minions vanish, a heart falls down
  for (const o of G.L.obs) if (o.minion) o.dead = true;
  b.rocks = []; b.hazards = []; G.slowT = 0.5; G.L.hearts.push({ x: p.wx + 240, y: GROUND - 120, got: false });
  if (b.phase >= K.phases.length - 1) {
    if (K.duel) { b.state = 'duel'; b.t = 0; b.meter = 0.15; b.duelT = 0; bossBanner('LETZTES DUELL!', 'Brüll so oft du kannst!', '#ff5252'); SFX.roar(); }
    else { b.state = 'flee'; b.t = 0; G.slowT = 1.0; G.shake = 1; bossBanner('GESCHAFFT!', K.name + ' ist besiegt!', '#9cff8a'); SFX.roar(); burst(b.x, GROUND - 120, 70, ['#ffd740', '#fff', '#ff7043'], 600, 500, 9, 1.3); }
  } else { b.state = 'stagger'; b.t = 0; toast('Phase geschafft! Ein Herz fällt herunter!', '#ff8a9a'); }
}
function revealEgg(s) {
  G.chili.joy = 0.9; chiliSay('Ein Ei! Ich hab es gerochen!', true);
  const e = G.L.eggs[s.k]; e.hidden = false; e.popping = true; e.ty = e.y; e.x0 = s.x; e.x = s.x; e.y = GROUND - 10; e.vy = -900; e.vx = (G.p.wx + 640 - s.x) / 1.1; SFX.pop();
  burst(s.x, GROUND - 5, 20, ['#8b5a2b', '#a0703a', '#ffe08a'], 260, 900, 7, 0.8);
}
const lastRiddle = {}, GATE_INTRO = 1.8, GATE_RUNES = [0.4, 0.85, 1.3]; // seconds of build-up before the riddle appears; when each rune lights
// Picks a riddle index: among the pool's riddles of the wanted difficulty tiers (the whole pool if a tier is empty) it prefers ones not in `seen`
// (the oldest repeats come back once all were seen), never the one asked last and never one in `skip`. Returns the pick and the updated seen list.
function pickRiddle(pool, tiers, seen, skip = []) {
  const all = pool.map((_, i) => i).filter(i => !skip.includes(i));
  let cands = all.filter(i => tiers.includes(pool[i].d || 2)); if (!cands.length) cands = all;
  seen = seen.filter(i => i < pool.length);
  const prev = seen[seen.length - 1];
  if (cands.every(i => seen.includes(i))) seen = seen.filter(i => !cands.includes(i));
  let free = cands.filter(i => !seen.includes(i));
  if (free.length > 1) free = free.filter(i => i !== prev);
  const k = free[Math.floor(Math.random() * free.length)];
  seen = seen.filter(i => i !== k); seen.push(k);
  return { k, seen };
}
function openRiddle() {
  toasts = []; const pool = WORLDS[G.wi].riddles;
  if (!Array.isArray(save.riddleSeen) || save.riddleVer !== 2) { save.riddleSeen = [[], [], [], []]; save.riddleVer = 2; }
  // difficulty `d` (1 easy, 2 medium, 3 hard): the world's first level asks easy ones, the second easy or medium, special days (boss or treasure door) hard ones
  const lv = LEVELS[G.li], special = !!lv && (!!lv.boss || lv.treasure >= 0 || lv.sub === 2), tiers = special ? [3] : lv && lv.sub === 0 ? [1] : [1, 2];
  const pk = pickRiddle(pool, tiers, save.riddleSeen[G.wi] || []);
  save.riddleSeen[G.wi] = pk.seen; writeSave();
  const r = pool[pk.k]; lastRiddle[G.wi] = r;
  G.overlay = { type: 'riddle', r, order: [0, 1, 2].sort(() => Math.random() - 0.5), wrong: [], msg: '', shake: 0, solved: false, lock: 0, hinted: false, t: 0, tries: 0, say: { who: 'goetti', text: 'Rätsel-Zeit!', at: 0.55, t: 2.2 } };
}
// `o` is the riddle state: the gate's overlay (G.overlay) or a quiz question (o.quiz). In the quiz a miss never costs amber and the burst is drawn in screen space.
function answer(i, o = G.overlay) {
  const r = o.r, bx = (o.quiz ? 0 : G.cam) + W / 2;
  if (i === r.ok) { SFX.right(); SFX.riddleWin(); o.solved = true; o.msg = ''; o.say = { who: 'chili', text: pick(['Juhu, geschafft!', 'Du bist so schlau!', 'Hoppla, richtig!']), at: o.t + 0.2, t: 2.4 }; burst(bx, 200, 40, ['#ffd740', '#ff5252', '#69f0ae', '#40c4ff', '#fff'], 450, 600, 7, 1.2); if (o.quiz) quizSolved(o); }
  else {
    // gentle on kids: the first miss is free and short, only repeated misses cost one amber (not in the quiz)
    SFX.wrong(); if (!o.wrong.includes(i)) o.wrong.push(i); o.msg = (r.wrongMsg && r.wrongMsg[i]) || (r.trick ? 'Achtung, Trickfrage! Lies nochmal genau.' : 'Nicht ganz – denk nochmal nach!'); o.shake = 0.4;
    o.lock = 1; o.tries++; o.say = { who: 'chili', text: pick(['Nicht schlimm!', 'Du schaffst das!', 'Probier nochmal!', 'Fast! Weiter so!']), at: o.t, t: 2 }; setTimeout(() => SFX.chirp(), 250);
    if (!o.quiz && o.tries > 1 && save.amber > 0) { save.amber--; writeSave(); o.msg += ' (−1 Bernstein)'; }
  }
}
function openGate() { G.overlay = null; G.gateOpening = true; SFX.gateRumble(); G.shake = Math.max(G.shake, 0.35); toast('Das Tor geht auf!', '#9cff8a'); burst(G.L.gateX - 10, GROUND - 200, 50, ['#ffd740', '#ff5252', '#69f0ae', '#40c4ff', '#fff'], 500, 700, 8, 1.4); }
function finishLevel() {
  const li = G.li, lv = LEVELS[li], wasDone = save.lvDone[li];
  protectStorage();
  for (let k = 0; k < 3; k++) if (G.eggsGot[k]) save.lvE[li][k] = 1;
  G.newCard = !wasDone; save.lvDone[li] = 1;
  if (li === 0) save.tutorialDone = true;
  for (const [sk, d] of Object.entries(SKILL_DAYS)) if (lv.day >= d) save.learned[sk] = 1;
  G.earned = [G.eggsGot.every(Boolean), !G.hits, G.amber >= Math.ceil(G.L.ambTotal * 0.8)];
  G.newMedals = []; G.earned.forEach((e, k) => { if (e && !save.lvM[li][k]) G.newMedals.push(k); if (e) save.lvM[li][k] = 1; });
  const tk = G.L.treasure ? G.L.treasure.k : -1;
  G.newTreasure = tk >= 0 && G.L.treasure.got && !save.treasures[tk];
  if (G.newTreasure) { save.treasures[tk] = 1; save.treasureNew = tk; }
  else if (tk >= 0 && !save.treasures[tk]) save.tTries[tk] = (save.tTries[tk] || 0) + 1; // missed again: the next try gets a clearer hint
  if (DAY_AFTER[lv.day] && !wasDone) save.afterNew = lv.day;
  if (!save.master && medalTotal() >= 72) { save.master = 1; save.masterNew = 1; const si = SKINS.findIndex(x => x.gift === 25), hi = HATS.findIndex(x => x.gift === 25); if (!save.owned.skin.includes(si)) save.owned.skin.push(si); if (!save.owned.hat.includes(hi)) save.owned.hat.push(hi); save.equip.skin = si; save.equip.hat = hi; save.newGifts.push('skin:' + si, 'hat:' + hi); }
  save.amber += G.amber; writeSave();
  G.overlay = { type: 'complete', t: 0, popped: [], cpopped: [] }; SFX.victory(!!lv.boss);
}

function nearMiss(o, hb, pb, p) { // clearing a hazard by a hair pays 2 amber
  if (pb.x > hb.x + hb.w) {
    if (!o.near) return; o.nm = true; if ((G.nearN || 0) >= NEAR_CAP) return; G.nearN = (G.nearN || 0) + 1; G.amber += 2; for (let i = 0; i < 2; i++) (G.flyAmb || (G.flyAmb = [])).push({ x: p.wx - G.cam + 30, y: p.y - 90 - i * 18, t: -i * 0.12 }); SFX.nearMiss();
    (G.pops || (G.pops = [])).push({ x: p.wx + 30, y: p.y - 130, t: 0.9, text: 'Knapp! +2', c: '#ffe08a' }); G.rings.push({ x: p.wx + 20, y: p.y - 60, r: 10, a: 0.7, c: '255,224,138' });
    return;
  }
  if (!o.near && hb.y >= 0 && overlap(pb, { x: hb.x - NEAR_PX, y: hb.y - NEAR_PX, w: hb.w + 2 * NEAR_PX, h: hb.h + 2 * NEAR_PX })) o.near = true; // hb.y < 0: ceiling hazards (duck under them) are not near misses
}
function updatePlay(dt) {
  const L = G.L, p = G.p, th = WORLDS[G.wi];
  for (const r of G.rings) { r.r += 500 * dt; r.a -= dt * 1.8; } G.rings = G.rings.filter(r => r.a > 0);
  if (G.pops) { for (const q of G.pops) q.t -= dt; G.pops = G.pops.filter(q => q.t > 0); }
  G.arena = clamp((G.arena || 0) + (G.bossStarted && !G.bossDone && !G.golden ? dt * 0.8 : -dt * 0.8), 0, 1);
  if (G.zoom > 0) G.zoom = Math.max(0, G.zoom - dt * 2.4); G.jbuf = Math.max(0, (G.jbuf || 0) - dt); if (p.vy >= 0) p.jh = false;
  G.shake = Math.max(0, G.shake - dt * (G.overlay ? 4 : 1));
  if (G.overlay) return;
  for (const c of L.coach) if (!c.done && p.wx >= c.x && (!c.air || (!p.onGround && p.jumps === 1 && p.vy > -200))) { c.done = true; G.coach = c; break; } // air coaches wait for the top of the first jump
  if (G.coach) return; // freeze-frame until Oli does the move
  if (G.freeze > 0) { G.freeze -= dt; return; }
  if (G.chiliSay) { G.chiliSay.t -= dt; if (G.chiliSay.t <= 0) G.chiliSay = null; } if (G.chiliCd > 0) G.chiliCd -= dt;
  G.t += dt; if (G.slowT > 0) { G.slowT -= dt; dt *= 0.3; } if (G.banner) { G.banner.t -= dt; if (!G.banner.hit && G.banner.t <= 1.82) { G.banner.hit = true; SFX.stamp(); G.shake = Math.max(G.shake, 0.3); G.zoom = Math.max(G.zoom || 0, 0.5); } if (G.banner.t <= 0) G.banner = null; }
  if (G.tip) { G.tip.t -= dt; if (G.tip.t <= 0) G.tip = null; }
  if (G.startT > 0) G.startT -= dt;
  let spd = (G.startT > 0 || G.stopped) ? 0 : L.speed * (L.endless ? 1 + clamp((p.wx - 200) / 50000, 0, 0.7) : 1 + 0.1 * clamp(p.wx / L.gateX, 0, 1));
  if (p.y > GROUND + 5) spd = 0;
  p.dashCd = Math.max(0, (p.dashCd || 0) - dt); if (L.dashWall && p.dashCd > 0 && !(p.dashT > 0) && p.wx > L.dashWall - 450 && p.wx < L.dashWall) p.dashCd = 0; // tutorial wall: an early or wasted dash never leaves the boy without FLITZ
  if (p.dashT > 0) { p.dashT -= dt; spd *= 2.4; if (Math.random() < 0.7) burst(p.wx - 20, p.y - 20 - Math.random() * 60, 1, ['#fff', '#ffe08a'], 80, -40, 5, 0.35); }
  if (G.stopped && G.bossStarted) { const off = p.dashT > 0 ? Math.sin(Math.PI * (1 - p.dashT / 0.4)) * 240 : 0; p.wx += off - (p.lungeOff || 0); p.lungeOff = off; } else p.lungeOff = 0; // in a boss fight FLITZ lunges forward and back
  const wasGliding = p.gliding; p.gliding = !!(G.sk.glide && !L.swim && G.holdJump != null && !p.onGround && !p.stomp && p.vy > 40); if (p.gliding && !wasGliding) SFX.whoosh();
  p.wx += spd * dt; p.ph += dt * (spd > 0 ? 13 : 2);
  // physics
  for (const pl of L.plats) if (pl.crumble) { if (pl.t != null && !pl.gone) { pl.t -= dt; if (pl.t <= 0) { pl.gone = true; pl.fv = 0; burst(pl.x + pl.w / 2, pl.y, 14, ['#b8a58a', '#7a6a58', '#fff'], 220, 300, 7, 0.7); } } if (pl.gone) { pl.fv += 2200 * dt; pl.y += pl.fv * dt; } }
  const prevY = p.y, wasGround = p.onGround, vy0 = p.vy; p.vy += (L.swim ? 520 : p.dashT > 0 ? GRAV * 0.25 : GRAV) * dt; if (L.swim) { if (G.duckHeld != null) p.vy += 1700 * dt; p.vy = clamp(p.vy, -430, 400); if (Math.random() < 0.05) burst(p.wx + 40, p.y - 80, 1, ['#dff'], 40, -120, 6, 0.8); } if (p.gliding) p.vy = Math.min(p.vy, 140); if (p.stomp) { if (p.spin < 1) { p.spin = Math.min(1, p.spin + dt / 0.36); p.vy = Math.min(p.vy, 120); if (p.spin >= 1) { p.vy = 1500; SFX.duck(); } } else p.vy = Math.max(p.vy, 1500); } p.y += p.vy * dt; p.onGround = false;
  if (L.swim && p.y < 175) { p.y = 175; p.vy = Math.max(0, p.vy); }
  if (p.vy >= 0) {
    for (const pl of L.plats) if (!pl.gone && p.wx + 25 > pl.x && p.wx - 25 < pl.x + pl.w && prevY <= pl.y + 1 && p.y >= pl.y) { p.y = pl.y; p.vy = 0; p.onGround = true; if (pl.crumble && pl.t == null) { pl.t = 0.5; SFX.crack(); } break; }
    if (!p.onGround && supported(L, p.wx) && prevY <= GROUND + 4 && p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
  }
  if (p.onGround && !wasGround && vy0 > 250) { p.land = 0.16; SFX.land(vy0); if (vy0 > 400 && !p.stomp) burst(p.wx, p.y, 9, ['#d8c3a5', '#b39b7a', '#fff'], 150, 260, 5, 0.45); }
  p.anti = Math.max(0, (p.anti || 0) - dt); p.hitT = Math.max(0, (p.hitT || 0) - dt); p.land = Math.max(0, (p.land || 0) - dt);
  if (!p.onGround) p.lastAir = G.t; // bounce pads only launch Rex when he comes down on them
  if (p.onGround) { p.coyote = 0.1; p.jumps = 0; if (p.stomp) { p.stomp = false; p.spin = 1; stompLand(); } if (G.jbuf > 0 && !wasGround) { G.jbuf = 0; jump(); } } else p.coyote -= dt;
  const wasDuck = p.duck; p.duck = G.duckHeld != null && p.onGround;
  if (p.duck && !wasDuck && wasGround) burst(p.wx + 20, GROUND, 4, ['#d8c3a5', '#b39b7a'], 120, 300, 4, 0.3);
  p.fireT -= dt; p.fireCd -= dt; p.breathT -= dt;
  for (const pp of L.peppers) if (!pp.got && Math.abs(pp.x - p.wx - 10) < 50 && Math.abs(pp.y - (p.y - 50)) < 70) {
    pp.got = true; p.fireT = 8; SFX.power(); burst(pp.x, pp.y, 26, ['#ff5a1f', '#ffd166', '#fff'], 320, 400, 7, 0.8);
    toast(fmt('Feuer-Chili! {rex} kann Feuer spucken!'), '#ffb030');
    if (!G.pepperHint) { G.pepperHint = true; G.tip = { text: 'Feuer-Chili! Drück FEUER! (Echte Dinos konnten kein Feuer spucken – aber {rex} schon!)'.replace('{rex}', save.rexName || 'Rexi'), t: 5 }; }
  }
  for (const h of L.hearts) if (!h.got) { const mx = p.wx + 10 - h.x, my = p.y - 50 - h.y; if (Math.abs(mx) < 170 && Math.abs(my) < 150) { h.x += mx * Math.min(1, dt * 5); h.y += my * Math.min(1, dt * 3); } } // hearts are drawn to Rex
  for (const h of L.hearts) if (!h.got && Math.abs(h.x - p.wx - 10) < 60 && Math.abs(h.y - (p.y - 50)) < 80) {
    h.got = true; SFX.heart(); burst(h.x, h.y, 26, ['#ff5a7a', '#ffb4c4', '#fff'], 320, 300, 7, 0.9);
    if (p.hearts < G.maxH) { p.hearts++; toast('Ein Herz zurück!', '#ff8a9a'); } else { G.amber += 5; toast('Alle Herzen voll – 5 Bernstein extra!', '#ffe08a'); }
  }
  if (G.stopped && G.bossStarted) for (const a of L.amb.concat(L.hearts)) if (!a.got && a.x > p.wx + 10) a.x = Math.max(p.wx + 10, a.x - 240 * dt); if (G.stopped && G.bossStarted) for (const a of L.amb) if (!a.got && Math.abs(a.x - p.wx - 10) < 90) a.y += (clamp(a.y, GROUND - 150, GROUND - 40) - a.y) * Math.min(1, dt * 6);
  for (const f of G.fireballs) {
    f.x += f.vx * dt; f.y = Math.min(GROUND - 38, f.y + f.vy * dt); f.life -= dt;
    for (let k = 0; k < 2; k++) { const l = 0.2 + Math.random() * 0.2; G.flames.push({ x: f.x - 8, y: f.y + (Math.random() - 0.5) * 14, vx: 120 + Math.random() * 120, vy: -60 - Math.random() * 60, life: l, max: l, r: 6 + Math.random() * 6 }); }
    const sc = L.secret; if (sc && sc.kind === 'ash' && sc.state === 'idle' && Math.abs(sc.x - f.x) < 70 && f.y > GROUND - 150) { f.life = 0; burst(f.x, f.y, 18, ['#ffb030', '#ff5a1f', '#fff3a0', '#555'], 300, 400, 8, 0.7); openSecret(sc); }
    for (const o of L.obs) {
      if (o.dead || o.scared || o.flat || f.life <= 0) continue;
      const dx = o.x - f.x; let hit = false;
      if (CEILING_HAZARDS.includes(o.type)) { if (f.under !== o && Math.abs(dx) < o.w / 2) { f.under = o; noise(0.18, 0.07, 1800); for (let k = 0; k < 6; k++) { const l = 0.25 + Math.random() * 0.2; G.flames.push({ x: f.x, y: f.y + (Math.random() - 0.5) * 16, vx: 150 + Math.random() * 150, vy: 20 + Math.random() * 60, life: l, max: l, r: 3 + Math.random() * 3 }); } } continue; } // the fireball flies under the overhang
      if (o.type === 'ptero') hit = Math.abs(dx) < 40 && Math.abs(o.y - f.y) < 60;
      else if (o.type !== 'geyser' && o.type !== 'pad' && !(o.type === 'icicle' && o.state === 'hang')) hit = Math.abs(dx) < 40;
      if (!hit) continue;
      f.life = 0; burst(f.x, f.y, 18, ['#ffb030', '#ff5a1f', '#fff3a0', '#555'], 300, 400, 8, 0.7);
      if (o.type === 'raptor' || o.type === 'ptero' || o.type === 'compy' || o.type === 'hopper') { o.scared = true; o.vx = 420; o.vy = -360; }
      else if (o.type === 'geode') breakGeode(o);
      else { o.dead = true; SFX.smash(); for (let i = 0; i < 2; i++) L.amb.push({ x: o.x + 40 + i * 40, y: GROUND - 60 - i * 20, got: false }); }
    }
  }
  G.fireballs = G.fireballs.filter(f => f.life > 0);
  if (p.fireT > 0 && Math.random() < 0.25) { const [mx, my] = rexMouth(p.duck); const l = 0.4 + Math.random() * 0.3; G.flames.push({ x: p.wx + mx * 0.88, y: p.y + my * 0.92 + 2, vx: L.speed * (G.stopped ? 0 : 1) + 30, vy: -50 - Math.random() * 40, life: l, max: l, r: 2.5 + Math.random() * 2.5 }); }
  for (const f of G.flames) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy -= 260 * dt; f.vx *= 1 - 2.2 * dt; f.life -= dt; }
  G.flames = G.flames.filter(f => f.life > 0);
  if (p.y > H + 120) pitFall();
  p.inv -= dt; p.roarT -= dt; p.roarCd -= dt;
  if (p.roarT > 0 && !G.boss && !L.swim) roarWave();
  if (p.bubT > 0) { p.bubT -= dt; const wx = p.wx + 80 + (1 - p.bubT / 0.5) * 280; burst(wx, p.y - 100 + (Math.random() - 0.5) * 170, 2, ['#e8ffff', '#bfeaff', '#fff'], 60, -170, 6, 0.9); } // the wave front travels about 280 px ahead
  G.cam = p.wx - (p.lungeOff || 0) - 270 + G.nudge;
  if (G.endless) { let tr = 1; for (const tx of L.tierX) if (p.wx >= tx) tr++; if (tr > G.tier) { G.tier = tr; SFX.power(); G.shake = Math.max(G.shake, 0.3); toast(['', '', 'Stufe 2 – mehr Gegner!', 'Stufe 3 – neue Gefahren!', 'Stufe 4 – doppelte Gefahren!'][tr] || `Stufe ${tr} – nur für Profis!`, '#ff9a5a'); }
    G.score = Math.max(G.score, Math.floor((p.wx - 200) / 25) + G.amber * 3); if (G.score >= G.heartAt) { G.heartAt += 500; if (p.hearts < G.maxH) { p.hearts++; SFX.heart(); toast('Ein Herz zurück!', '#ff8a9a'); } else toast(G.score + ' Punkte!', '#ffe08a'); } }
  // tips, checkpoints
  for (const t of L.tips) if (!t.shown && p.wx >= t.x) { t.shown = true; G.tip = { text: t.text, t: 6.5 }; }
  for (const c of L.cps) if (!c.on && p.wx >= c.x) { c.on = true; G.cp = c.x; SFX.flag(); chiliSay(pick(['Fähnchen! Weiter so!', 'Pfoten hoch, ihr zwei!', 'Prima, das war stark!'])); if (p.hearts < G.maxH) { p.hearts++; toast('Fähnchen erreicht – ein Herz zurück!', '#ff8a9a'); } else toast('Fähnchen erreicht!', '#ffe08a'); }
  // amber
  if (L.swim) for (const a of L.amb) if (!a.got && a.pull > 0) { a.pull -= dt; const k = Math.min(1, dt * 4); a.x += (p.wx + 10 - a.x) * k; a.y += (p.y - 50 - a.y) * k; }
  for (const a of L.amb) if (!a.got && Math.abs(a.x - p.wx - 10) < 42 && Math.abs(a.y - (p.y - 50)) < 62) { a.got = true; G.amber++; (G.flyAmb || (G.flyAmb = [])).length < 30 && G.flyAmb.push({ x: a.x - G.cam, y: a.y, t: 0 }); G.combo = G.t - (G.lastAmb || -9) < 0.6 ? Math.min(G.combo + 1, 8) : 0; G.lastAmb = G.t; SFX.amberNote(G.combo); burst(a.x, a.y, 6, ['#ffd166', '#ff9f1c'], 150, 200, 4, 0.4); }
  // eggs
  for (const e of L.eggs) {
    if (e.hidden || e.got) continue;
    if (e.popping) { e.vy += 1380 * dt; e.y += e.vy * dt; e.x += e.vx * dt; if (e.vy > 0 && e.y >= e.ty) { e.y = e.ty; e.popping = false; } }
    const ey = e.y + Math.sin(T * 3 + e.k) * 5;
    if (Math.hypot(e.x - (p.wx + 10), ey - (p.y - 50)) < 80) {
      e.got = true; G.eggsGot[e.k] = true; G.chili.joy = 0.9; SFX.egg(); SFX.rise(); G.slowT = Math.max(G.slowT || 0, 0.4); G.zoom = Math.max(G.zoom || 0, 0.7); G.rings.push({ x: e.x, y: ey, r: 16, a: 1, c: '255,240,170' }); G.flyEggs.push({ x: e.x - G.cam, y: ey, k: e.k, t: 0 }); burst(e.x, ey, 30, ['#fff3b0', '#ffd740', th.egg, th.eggSpot], 360, 500, 7, 1);
      toast('Ei gefunden! (' + (G.eggsGot.filter(Boolean).length) + ' von 3)', '#ffe08a');
    }
  }
  const tr = L.treasure, sc = L.secret;
  if (sc && sc.state === 'idle') secretCue(sc, dt);
  if (tr && tr.fly) { const f = tr.fly; f.t += dt; const u = Math.min(1, f.t / f.d); tr.x = f.x0 + (f.x1 - f.x0) * u; tr.y = f.y0 + (f.y1 - f.y0) * u - f.h * Math.sin(Math.PI * u); if (u >= 1) tr.fly = null; }
  if (sc && sc.shake > 0) sc.shake -= dt;
  if (tr && tr.shown && !tr.got && Math.hypot(tr.x - (p.wx + 10), tr.y - (p.y - 50)) < 78) {
    tr.got = true; SFX.egg(); SFX.rise(); G.slowT = Math.max(G.slowT || 0, 0.6); G.zoom = Math.max(G.zoom || 0, 0.9); G.rings.push({ x: tr.x, y: tr.y, r: 20, a: 1, c: '255,240,150' }); setTimeout(SFX.right, 250); burst(tr.x, tr.y, 40, ['#ffd740', '#fff', '#69f0ae'], 400, 500, 7, 1.2);
    toast(TREASURES[tr.k].name + (save.treasures[tr.k] ? '!' : ' gefunden!'), '#ffd740');
  }
  // chili
  updateFollowers(dt);
  const c = G.chili; c.ph += dt * 12;
  for (const s of L.spots) if (s.state === 'idle' && c.wx >= s.x - 10) { s.state = 'dig'; c.dig = s; c.digT = 0.7; SFX.dig(); toast('Chili hat etwas erschnüffelt!', '#ffe08a'); }
  let target = p.wx - 145;
  if (c.dig) { target = c.dig.x; c.digT -= dt; if (Math.random() < 0.6) burst(c.dig.x + 10, GROUND - 4, 1, ['#8b5a2b', '#6b4226'], 160, 900, 5, 0.5); if (c.digT <= 0) { revealEgg(c.dig); c.dig.state = 'done'; c.dig = null; } }
  const mv = (L.speed + 260) * dt; c.wx += clamp(target - c.wx, -mv, mv);
  if (L.swim) { c.sy = c.sy == null ? GROUND : c.sy; c.sy += (p.y - 10 + Math.sin(T * 3) * 10 - c.sy) * Math.min(1, dt * 3); }
  c.joy = Math.max(0, (c.joy || 0) - dt);
  const cb = c.dig ? GROUND : followY(c.wx), cair = !c.dig && c.pb != null && Math.abs((cb - c.pb) / Math.max(dt, 1e-3)) > 40; c.pb = cb;
  if (c.wasAir && !cair && !L.swim) { c.land = 0.14; burst(c.wx, cb, 3, ['#d8c3a5', '#fff'], 90, 200, 4, 0.35); } c.wasAir = cair; c.land = Math.max(0, (c.land || 0) - dt);
  if (L.swim && Math.random() < 0.03) burst(c.wx + 10, c.y - 50, 1, ['#dff'], 40, -120, 6, 0.8);
  c.y = cb - (c.dig || cair ? 0 : Math.abs(Math.sin(c.ph * 0.8)) * 14) - (c.joy > 0 ? Math.abs(Math.sin(c.joy * 11)) * 12 : 0);
  if (L.swim && c.sy != null) c.y = c.sy;
  c.vy = (c.y - (c.py == null ? c.y : c.py)) / Math.max(dt, 1e-3); c.py = c.y;
  // obstacles
  const pb = p.duck ? { x: p.wx - 30, y: p.y - 56, w: 80, h: 52 } : { x: p.wx - 25, y: p.y - 92, w: 68, h: 88 };
  for (const o of L.obs) {
    if (o.dead) { if (o.sec && !o.secDone) { o.secDone = true; openSecret(L.secret); } continue; } // the cracked rock was smashed (dash, stomp or fire)
    const d = o.x - p.wx;
    if (d > 1200) continue;
    let hb = null;
    switch (o.type) {
      case 'rock': hb = { x: o.x - o.w / 2 + 6, y: GROUND - o.h + 6, w: o.w - 12, h: o.h - 6 }; break;
      case 'boulder': hb = { x: o.x - o.w / 2 + 8, y: GROUND - o.h + 10, w: o.w - 16, h: o.h - 10 }; break;
      case 'low': hb = { x: o.x - o.w / 2, y: -200, w: o.w, h: GROUND - 84 + 200 }; break;
      case 'geode': break;
      case 'raptor': case 'ptero': case 'compy':
        if (o.flat) { o.flat -= dt; if (o.flat <= 0) { o.flat = 0; o.scared = true; o.vx = 300; o.vy = -300; } break; }
        if (o.scared) { o.x += o.vx * dt; o.vy += 900 * dt; if (o.type !== 'ptero') o.yOff = (o.yOff || 0) + o.vy * dt; else o.y += (o.vy - 300) * dt; o.alpha -= dt * 1.3; o.ph += dt * 18; if (o.alpha <= 0) o.dead = true; break; }
        if (d < 760 || o.minion) { if (o.type === 'ptero') o.x -= o.spd * dt; else o.x = cliffStep(o, o.spd * dt); o.ph += dt * (o.type === 'ptero' ? 9 : o.type === 'compy' ? 20 : 15); }
        if (o.type === 'compy') {
          hb = { x: o.x - 20, y: GROUND - 46, w: 40, h: 44 };
          if (p.inv <= 0 && overlap(pb, hb) && p.vy > 0 && p.y <= hb.y + 30) { squashCompy(o, true); hb = null; }
          break;
        }
        if (o.type === 'ptero') { o.y = o.baseY + Math.sin(T * 4 + o.x * 0.01) * 8; hb = { x: o.x - 28, y: o.y - 14, w: 56, h: 26 }; }
        else hb = { x: o.x - 26, y: GROUND - 62, w: 52, h: 60 };
        break;
      case 'hopper':
        if (o.flat) { o.flat -= dt; if (o.flat <= 0) { o.flat = 0; o.scared = true; o.vx = 300; o.vy = -300; } break; }
        if (o.scared) { o.x += o.vx * dt; o.vy += 900 * dt; o.yOff = (o.yOff || 0) + o.vy * dt; o.alpha = (o.alpha == null ? 1 : o.alpha) - dt * 1.3; if (o.alpha <= 0) o.dead = true; break; }
        if (d < 800) { o.x = cliffStep(o, 95 * dt); o.hp += dt; }
        o.hy = 120 * Math.abs(Math.sin(o.hp * 3.3));
        hb = { x: o.x - 22, y: GROUND - 46 - o.hy, w: 44, h: 44 };
        if (p.inv <= 0 && overlap(pb, hb) && p.vy > 0 && p.y <= hb.y + 28) { o.flat = 0.9; panAt(o.x, SFX.boing); burst(o.x, GROUND - o.hy - 20, 10, ['#9be26a', '#fff'], 220, 600, 6, 0.5); L.amb.push({ x: o.x + 60, y: GROUND - 110, got: false }); p.vy = -720; p.jumps = 1; p.stomp = false; p.spin = 1; hb = null; }
        break;
      case 'plant':
        if (d < 680 && d > -50) { o.shoot -= dt; if (o.shoot <= 0) { o.shoot = 1.55; o.pop = 0.3; L.obs.push({ type: 'seed', x: o.x - 28, y: GROUND - 30, rot: 0 }); SFX.boing(); } }
        o.pop = Math.max(0, (o.pop || 0) - dt); hb = { x: o.x - 20, y: GROUND - 54, w: 40, h: 54 }; break;
      case 'seed': o.x -= 330 * dt; o.rot = (o.rot || 0) - dt * 14; hb = { x: o.x - 12, y: o.y - 12, w: 24, h: 24 }; if (o.x < p.wx - 500) o.dead = true; break;
      case 'meteor':
        if (o.state === 'wait' && d < 440) { o.state = 'fall'; o.vy = 200; SFX.crack(); }
        if (o.state === 'fall') { o.vy += 2600 * dt; o.y += o.vy * dt; hb = { x: o.x - 26, y: o.y - 26, w: 52, h: 52 }; if (o.y >= GROUND - 26) { o.y = GROUND - 26; o.state = 'stuck'; SFX.smash(); G.shake = Math.max(G.shake, 0.4); burst(o.x, GROUND - 10, 26, ['#ffb030', '#ff5a1f', '#fff3a0', '#555'], 380, 600, 8, 0.8); } }
        else if (o.state === 'stuck') hb = { x: o.x - 26, y: GROUND - 46, w: 52, h: 46 };
        break;
      case 'pad':
        o.sq = Math.max(0, (o.sq || 0) - dt);
        if (Math.abs(p.wx + 10 - o.x) < 70 && p.vy >= 0 && p.y >= GROUND - 22 && o.sq <= 0) {
          if (G.t - (p.lastAir ?? -9) > 0.1) { if (Math.abs(p.wx + 10 - o.x) < 46) { o.sq = 0.5; p.vy = -450; p.y = GROUND - 4; p.onGround = false; SFX.boing(); } break; } // just running over it: only a small hop
          o.sq = 0.35; p.vy = -1250; p.y = GROUND - 4; p.onGround = false; p.jumps = 1; p.coyote = 0; SFX.boing(); burst(o.x, GROUND - 20, 16, ['#ff6a6a', '#fff', '#ffd34d'], 260, 500, 7, 0.6); }
        break;
      case 'wall': hb = { x: o.x - o.w / 2, y: GROUND - o.h, w: o.w, h: o.h }; break;
      case 'tide': if (d < 720) o.moving = true; if (o.moving) o.x -= 210 * dt; hb = { x: o.x - 70, y: GROUND - 118, w: 110, h: 118 }; break;
      case 'rollrock': if (d < 760 || o.minion) { o.x -= 250 * dt; o.rot = (o.rot || 0) - dt * 7; } hb = { x: o.x - 30, y: GROUND - 64, w: 60, h: 64 }; break;
      case 'urchin': if (o.scared) { o.rise += (110 + o.rise) * dt; o.alpha -= dt * 0.7; if (o.alpha <= 0) o.dead = true; break; } hb = { x: o.x - 17, y: GROUND - 38, w: 34, h: 38 }; break; // bubble-wrapped by a roar: no hitbox, floats away
      case 'jelly': if (o.minion && o.spd) o.x -= o.spd * dt; if (o.ty != null) o.y0 += (o.ty - o.y0) * Math.min(1, dt * 4); o.y = o.y0 + Math.sin(T * 2 + o.ph) * o.amp; hb = { x: o.x - 22, y: o.y - 24, w: 44, h: 48 }; break;
      case 'sword':
        if (o.scared) { o.x += o.vx * dt; o.vy += 600 * dt; o.y += o.vy * dt; o.alpha -= dt * 1.2; if (o.alpha <= 0) o.dead = true; break; }
        if (d < 800 || o.minion) o.x -= o.spd * dt; hb = { x: o.x - 40, y: o.y - 12, w: 80, h: 24 }; break;
      case 'cgate': { const r1 = { x: o.x - 30, y: -30, w: 60, h: o.gapY + 30 }, r2 = { x: o.x - 30, y: o.gapY + o.gapH, w: 60, h: GROUND - (o.gapY + o.gapH) + 20 }; if (p.inv <= 0 && overlap(pb, r1) || p.inv <= 0 && overlap(pb, r2)) hurt(); break; }
      case 'updraft': if (Math.abs(o.x - p.wx) < o.w / 2 && !p.onGround) { p.vy -= (p.gliding ? 5600 : 4200) * dt; p.vy = Math.max(p.vy, p.gliding ? -760 : -980); if (p.y < 230) p.vy = Math.max(p.vy, 0); p.land = 0; for (let i = 0; i < 2; i++) if (Math.random() < 0.8) burst(o.x + (Math.random() - 0.5) * o.w, GROUND - Math.random() * 260, 1, ['#fff', '#cfe8ff', '#e8f4ff'], 80, -520, 6, 0.8); } break;
      case 'icicle':
        if (o.state === 'hang' && d < 430) { o.state = 'fall'; }
        if (o.state === 'fall') { o.vy += 2400 * dt; o.y += o.vy * dt; hb = { x: o.x - 13, y: o.y - 70, w: 26, h: 70 }; if (o.y >= GROUND) { o.y = GROUND; o.state = 'stuck'; SFX.crack(); burst(o.x, GROUND - 10, 14, ['#e0f4ff', '#fff'], 260, 900, 6, 0.6); } }
        else if (o.state === 'stuck') hb = { x: o.x - 15, y: GROUND - 44, w: 30, h: 44 };
        break;
      case 'geyser':
        if (!o.fired && d < 470) { o.fired = true; o.t = 0.8; noise(0.8, 0.25, 600); }
        if (o.t > 0) { o.t -= dt; if (Math.random() < 0.7) burst(o.x, GROUND - 200 * Math.random(), 1, ['#ffcf3a', '#ff6a00'], 180, 600, 7, 0.7); hb = { x: o.x - 24, y: GROUND - 250, w: 48, h: 250 }; }
        else hb = { x: o.x - 36, y: GROUND - 8, w: 72, h: 10 };
        break;
    }
    if (hb && p.dashT > 0 && overlap({ x: p.wx - 30, y: p.y - 100, w: 170, h: 100 }, hb)) { if (!CEILING_HAZARDS.includes(o.type)) dashBreak(o); continue; } // the dash is a safe pass under an overhang, it does not smash it
    if (hb && p.inv <= 0 && overlap(pb, hb)) {
      if (ROAR_BREAKS.includes(o.type) && p.roarCd <= 0 && !(p.fireT > 0) && !G.coach && G.startT <= 0.3 && (o.grace = (o.grace || 0) + dt) < ROAR_GRACE) continue; // a late roar still saves Rex: the rock waits a moment before it hurts
      o.nm = true; hurt();
    } else if (hb && !o.nm && !G.stopped && p.inv <= 0 && !(p.dashT > 0)) nearMiss(o, hb, pb, p);
    if (o.x < G.cam - 300 && o.type !== 'icicle') o.dead = o.dead || (o.type === 'raptor' || o.type === 'ptero' || o.type === 'compy');
  }
  // boss
  if (L.bossX && !G.bossStarted && p.wx >= L.bossX) {
    G.bossStarted = true; if (!G.shield) { G.shield = true; setTimeout(() => { if (G && scene === 'play') toast('Chili schenkt dir einen Schutzschild!', '#9fd3ff'); }, 900); } G.stopped = true; p.wx = L.bossX; G.cp = L.bossX; G.boss = newBoss(0); G.bossCp = 0; bossBanner(bossKind(G.boss).name, 'taucht auf!', '#ff6a3a'); SFX.roar(); G.shake = Math.max(G.shake, 0.4);
    { const K = bossKind(G.boss), n = K.phases.length, w = ['', '', 'zwei', 'drei', 'vier'][n], pr = G.boss.kind === 'queen' ? 'sie' : 'ihn'; G.tip = { text: G.boss.kind === 'king' ? 'Der Krallenkönig hat das goldene Ei geklaut – hol es zurück! Besiege ihn in vier Runden.' : `${K.name} hält ein Stück der Schatzkarte! Besiege ${pr} in ${w} Runden.`, t: 6 }; }
  }
  if (G.boss) updateBoss(dt);
  if (G.golden && !G.gotGolden) {
    const gd = G.golden;
    if (!gd.landed) { gd.vy += 900 * dt; gd.y += gd.vy * dt; if (gd.y >= GROUND - 70) { gd.y = GROUND - 70; gd.landed = true; G.stopped = false; burst(gd.x, gd.y, 30, ['#ffd700', '#fff3b0'], 300, 400, 7, 1); } }
    if (Math.hypot(gd.x - p.wx - 10, gd.y - (p.y - 50)) < 70) { G.gotGolden = true; SFX.egg(); setTimeout(SFX.right, 300); toast('Das goldene Ei!', '#ffd700'); burst(gd.x, gd.y, 50, ['#ffd700', '#fff3b0', '#ffae00'], 420, 400, 8, 1.3); }
  }
  // gate
  if (!G.atGate && p.wx >= L.gateX - 220) { G.atGate = true; G.stopped = true; p.wx = L.gateX - 220; G.gateT = GATE_INTRO; G.gateStep = 0; toasts = []; G.tip = null; chiliSay(pick(['Hier stimmt was nicht …', 'Das Tor leuchtet!', 'Hoppla! Ein Geheimnis!']), true, 'worried'); }
  if (G.atGate && !G.gateOpening && G.gateT > 0) { // anticipation: the runes light up one by one, then the riddle tablet drops in
    G.gateT -= dt; const e = GATE_INTRO - G.gateT;
    while (G.gateStep < 3 && e >= GATE_RUNES[G.gateStep]) { const k = G.gateStep++, rx = L.gateX + (k === 0 ? -85 : k === 1 ? 85 : 0), ry = GROUND - (k === 2 ? 110 : 130); SFX.runeChime(k); burst(rx, ry, 16, ['#ffd34d', '#fff3b0', '#fff'], 220, -60, 5, 0.9); G.rings.push({ x: rx, y: ry, r: 10, a: 1, c: '255,226,120' }); }
    if (G.gateT <= 0) { SFX.tabletThud(); burst(G.cam + W / 2, 470, 22, ['#c9c2b4', '#9a9488', '#e8e2d4'], 300, 500, 8, 0.8); openRiddle(); }
  }
  G.gateGlow += ((G.atGate ? G.gateStep / 3 : 0) - G.gateGlow) * Math.min(1, dt * 6); G.nudge += ((G.atGate && !G.gateOpening ? 60 : 0) - G.nudge) * Math.min(1, dt * 3);
  if (G.gateOpening) { G.gateOpen = Math.min(1, G.gateOpen + dt * 0.9); if (G.gateOpen >= 1 && !G.entering) G.stopped = false; }
  if (G.gateOpen >= 1 && !G.entering && p.wx >= L.gateX - 4) { G.entering = 0.001; G.stopped = true; p.wx = L.gateX; SFX.flag(); burst(L.gateX, GROUND - 100, 36, ['#fff3b0', '#ffd740', '#fff'], 360, 200, 6, 1.1); }
  if (G.entering) { G.entering += dt / 1.25; p.ph += dt * 11; if (G.entering >= 1 && !G.finished) { G.finished = true; finishLevel(); } }
}

function updateBoss(dt) {
  const b = G.boss, p = G.p, home = G.L.bossX + 620, L = G.L, K = bossKind(b), swim = L.swim, ty = (K.phases[Math.min(b.phase, K.phases.length - 1)] || {}).type;
  b.t += dt; b.ph += dt * 13; b.flash -= dt; if (b.tele) { b.tele.t -= dt; if (b.tele.t <= 0) b.tele = null; }
  const pb = p.duck ? { x: p.wx - 30, y: p.y - 56, w: 80, h: 52 } : { x: p.wx - 25, y: p.y - 92, w: 68, h: 88 };
  const roarHits = () => p.roarT > 0 && b.x - p.wx < 400 && b.state !== 'enter';
  // thrown projectiles (rocks, coconuts, ink, feathers)
  for (const r of b.rocks) {
    r.x -= 520 * dt; r.rot += dt * 9;
    if (!r.dead && p.inv <= 0 && overlap(pb, { x: r.x - 22, y: r.y - 24, w: 44, h: 48 })) { r.dead = true; hurt(); burst(r.x, r.y, 14, ['#7b6b5a', '#a89888'], 300, 900, 8, 0.6); }
    if (r.x < G.cam - 80) r.dead = true;
  }
  b.rocks = b.rocks.filter(r => !r.dead);
  // hazards: shock waves, lava eruptions under the player, and lane strikes for the swimming fight
  for (const h of b.hazards) {
    h.t += dt;
    if (h.kind === 'wave') { h.x += h.vx * dt; if (!h.dead && p.inv <= 0 && overlap(pb, { x: h.x - 20, y: GROUND - 38, w: 40, h: 38 })) { h.dead = true; hurt(); } if (h.x < G.cam - 80 || h.x > G.cam + W + 200) h.dead = true; }
    else if (h.kind === 'erupt') { if (h.t > h.warn && !h.fired) { h.fired = true; SFX.crack(); noise(0.5, 0.3, 700); } if (h.fired && h.t < h.warn + 0.3) { if (Math.random() < 0.8) burst(h.x, GROUND - 160 * Math.random(), 1, ['#ffcf3a', '#ff6a00'], 200, 600, 7, 0.6); if (p.inv <= 0 && overlap(pb, { x: h.x - 26, y: GROUND - 50, w: 52, h: 50 })) { hurt(); } } if (h.t > h.warn + 0.3) h.dead = true; }
    else if (h.kind === 'lane') { if (h.t > h.warn && !h.fired) { h.fired = true; SFX.crack(); noise(0.4, 0.3, 900); G.shake = Math.max(G.shake, 0.3); } if (h.fired && h.t < h.warn + 0.5 && p.inv <= 0 && overlap(pb, { x: p.wx - 200, y: h.y - 44, w: 900, h: 88 })) hurt(); if (h.t > h.warn + 0.5) h.dead = true; }
  }
  b.hazards = b.hazards.filter(h => !h.dead);
  const goBack = () => { b.state = 'back'; b.t = 0; };
  const projY = lane => swim ? GROUND - 30 - lane * 95 : (lane ? GROUND - 95 : GROUND - 22);
  const mkMinion = (k, i) => {
    const x = Math.max(b.x, home) - 50 - i * (k === 'compy' || k === 'crab' ? 235 : k === 'raptor' ? 300 : 200);
    if (k === 'crab') return { type: 'compy', crab: true, x, spd: 175 + (3 - b.hp) * 12, ph: i, alpha: 1, minion: true };
    if (k === 'sword') return { type: 'sword', x, y: GROUND - 60 - Math.random() * 230, spd: 300, ph: 0, alpha: 1, minion: true };
    if (k === 'jelly') return { type: 'jelly', x, y0: 190 + Math.random() * 200, amp: 40, ph: Math.random() * 6, y: 220, spd: 120, minion: true };
    if (k === 'ptero') return { type: 'ptero', x, y: GROUND - 165, baseY: GROUND - 165, spd: 200, ph: i, alpha: 1, minion: true };
    if (k === 'rollrock') return { type: 'rollrock', x, rot: 0, minion: true };
    return { type: k, x, spd: ((k === 'raptor' ? 175 : 190) + (3 - b.hp) * 12) * (b.kind === 'king' ? [1, 1.5, 0.78, 1.28, 0.9, 1.4][i % 6] : 1), ph: i, alpha: 1, minion: true };
  };
  switch (b.state) {
    case 'enter': b.x -= 230 * dt; G.shake = Math.max(G.shake, 0.16); if ((b.dust = (b.dust || 0) - dt) <= 0) { b.dust = 0.14; burst(b.x - 30, GROUND - 6, 5, ['#d8c9a6', '#efe5cc', '#b9a784'], 110, 60, 8, 0.7); } if (b.x <= home) { b.x = home; SFX.roar(); G.shake = 0.5; G.zoom = 1; G.freeze = 0.1; SFX.bossSting(); startBossPhase(b); } break;
    case 'taunt': {
      const lim = b.phase === 0 ? 1.0 : 0.9;
      if (!b.teled && ty !== 'lane' && ty !== 'leap' && ty !== 'volley' && b.t > lim - 0.5) { b.teled = true; bossTele(b, 0.5); } // leap announces itself with the crouch, lanes with their red stripes, a volley winds up before every shot
      if (b.t > lim) {
        b.n++; b.t = 0; b.teled = false;
        if (ty === 'charge') b.state = 'charge';
        else if (ty === 'volley') { b.state = 'volley'; const len = 3 + (3 - b.hp) + (b.phase > 0 ? 1 : 0); b.volley = { seq: Array.from({ length: Math.min(6, len) }, () => swim ? Math.floor(Math.random() * 4) : (G.sk.duck && Math.random() < 0.5 ? 1 : 0)), i: 0, next: 0.5, warned: false }; }
        else if (ty === 'summon') b.state = 'summon';
        else if (ty === 'quake') { b.state = 'quake'; b.q = { n: 0, next: 1.0, total: 3 + (3 - b.hp), warned: false }; }
        else if (ty === 'lane') { b.state = 'lanes'; b.laneN = 0; b.laneNext = 0.2; }
        else { b.state = 'crouch'; b.landX = p.wx + 250; bossTele(b, 0.75); }
      } } break;
    case 'charge': {
      b.x -= (b.phase === 2 && b.kind === 'king' ? 450 : 340 + (3 - b.hp) * 55) * dt;
      const d = b.x - p.wx;
      if (d < 390 && roarHits()) bossHurt(b, b.x); else if (d < 115) { hurt(); goBack(); }
      break;
    }
    case 'volley': { // projectiles come in sequence; afterwards the boss is out of breath
      const v = b.volley; v.next -= dt;
      if (v.i < v.seq.length && !v.warned && v.next <= 0.5) { v.warned = true; v.warnY = projY(v.seq[v.i]); bossTele(b, 0.5); } // wind-up, and a marker where the next shot will fly
      if (v.i < v.seq.length && v.next <= 0) { const ln = v.seq[v.i]; b.rocks.push({ x: b.x - 60, y: projY(ln), rot: 0 }); v.warned = false; panAt(b.x, SFX.smash); v.i++; v.next = 0.95; if (v.i < v.seq.length) toast(swim ? (v.seq[v.i] >= 2 ? 'Weiter oben – RUNTER!' : 'Weiter unten – HOCH!') : (v.seq[v.i] ? 'DUCKEN!' : 'SPRING!'), '#ffe08a'); }
      if (v.i >= v.seq.length && v.next < -1.0 && b.rocks.length === 0) { b.state = 'tired'; b.t = 0; b.target = p.wx + 340; toast('Er ist erschöpft – BRÜLL!', '#9cff8a'); }
    } break;
    case 'lanes': { // swimming fight: red stripes warn, then a tentacle sweeps the lane
      b.laneNext -= dt;
      if (b.laneN < 3 + (3 - b.hp) && b.laneNext <= 0) { b.hazards.push({ kind: 'lane', y: clamp(p.y - 50 + (Math.random() - 0.5) * 120, 150, GROUND - 40), warn: 1.7, t: 0, fired: false }); b.laneN++; b.laneNext = 2.5; }
      if (b.laneN >= 3 + (3 - b.hp) && b.hazards.length === 0) { b.state = 'tired'; b.t = 0; b.target = p.wx + 340; toast('Er ist erschöpft – BRÜLL!', '#9cff8a'); }
    } break;
    case 'summon':
      if (!b.summoned) {
        b.summoned = true; b.spawnSorted = false; b.t = 0; SFX.roar(); G.shake = 0.4; const base = K.minions, n = (b.hp === 3 ? 3 : b.hp === 2 ? 4 : 5) + (b.kind === 'king' ? 1 : 0); b.spawnQ = [];
        for (let i = 0; i < n; i++) { const k = base[i % base.length]; if (k === 'rollrock') L.obs.push(mkMinion(k, i)); else b.spawnQ.push({ k, i, at: b.kind === 'king' ? Math.max(0.6, 2.4 + b.spawnQ.length * 1.35 - Math.max(0, home - p.wx) / mkMinion(k, i).spd) : 0.8 + b.spawnQ.length * (k === 'raptor' || k === 'jelly' ? 1.7 : 1.35) }); } // the helpers file out from behind the boss, one at a time
        toast('Seine Helfer kommen!', '#ffe08a');
      }
      if (b.spawnQ && b.spawnQ.length > 1 && !b.spawnSorted) { b.spawnQ.sort((a, c) => a.at - c.at); b.spawnSorted = true; }
      while (b.spawnQ && b.spawnQ.length && b.t >= b.spawnQ[0].at) { const q = b.spawnQ.shift(), m = mkMinion(q.k, q.i); m.x = Math.max(b.x, home) + 20; L.obs.push(m); burst(m.x, GROUND - 14, 6, ['#d8c3a5', '#fff'], 120, 90, 5, 0.4); SFX.pop(); }
      if (b.t > 2.2 && !(b.spawnQ && b.spawnQ.length) && (b.t > 16 || !L.obs.some(o => o.minion && !o.dead && !o.scared && !o.flat && o.x > G.cam))) { b.summoned = false; b.laneN = 0; b.laneNext = 0.2; b.t = 0; toast('Jetzt kommt der Boss selbst!', '#ffb4a8'); if (b.kind === 'kraken') b.state = 'lanes'; else { b.state = 'windup'; bossTele(b, 0.6); } }
      break;
    case 'windup': if (b.t > 0.6) { b.state = 'charge'; b.t = 0; } break; // the boss himself charges after his helpers: announced first
    case 'quake': { // stomping fight: wind-up, then a shock wave rolls along the ground (jump it); afterwards he is out of breath
      const q = b.q; q.next -= dt;
      if (q.n < q.total && !q.warned && q.next <= 0.55) { q.warned = true; bossTele(b, 0.55); }
      if (q.n < q.total && q.next <= 0) {
        q.n++; q.warned = false; q.next = 1.55 - Math.min(0.25, (3 - b.hp) * 0.1); SFX.stomp(); G.shake = Math.max(G.shake, 0.6); b.y = 0;
        burst(b.x - 40, GROUND, 24, ['#d8c3a5', '#b39b7a', '#fff'], 380, 500, 8, 0.7); b.hazards.push({ kind: 'wave', x: b.x - 60, vx: -420 - (q.n % 2) * 60, t: 0 });
      }
      if (q.n >= q.total && q.next < -0.8 && b.hazards.length === 0) { b.state = 'tired'; b.t = 0; b.target = p.wx + 340; toast('Er ist erschöpft – BRÜLL!', '#9cff8a'); }
    } break;
    case 'crouch': // leap: a shadow marks the landing spot, then he jumps
      if (b.t > 0.75) { b.state = 'leap'; b.t = 0; b.fromX = b.x; SFX.jump(); }
      break;
    case 'leap': {
      const u = clamp(b.t / 0.7, 0, 1); b.x = b.fromX + (b.landX - b.fromX) * u; b.y = -Math.sin(u * Math.PI) * 280;
      if (u >= 1) { b.y = 0; b.state = 'tired'; b.t = 0; b.target = b.landX; SFX.stomp(); G.shake = 0.7; burst(b.x, GROUND, 40, ['#ff9a3c', '#ffd34d', '#5a2a1a'], 500, 800, 9, 0.9);
        b.hazards.push({ kind: 'wave', x: b.x - 60, vx: -420, t: 0 }); // shockwave rolls toward the player
        if (b.kind === 'king') { for (let i = 0; i < 2; i++) b.hazards.push({ kind: 'erupt', x: p.wx + 5, warn: 1.6 + i * 1.7, t: 0, fired: false }); toast('Lava! Spring, wenn SPRING! erscheint!', '#ff9a5a'); }
        else toast('Windwelle! Spring drüber!', '#ff9a5a'); }
    } break;
    case 'tired': { // out of breath and close: the roar window
      if (b.x > b.target) b.x = Math.max(b.target, b.x - 420 * dt); else if (b.x < b.target) b.x = Math.min(b.target, b.x + 420 * dt);
      if (roarHits()) bossHurt(b, b.x); else if (b.t > (ty === 'leap' ? 3.4 : 2.6)) { toast('Zu langsam!', '#ffb4a8'); goBack(); }
    } break;
    case 'back': b.x += 700 * dt; b.y = 0; if (b.x >= home) { b.x = home; b.state = 'taunt'; b.t = 0; } break;
    case 'stagger': // between phases: he roars, the heart drops, he walks back home, the next phase starts
      b.x = Math.min(home, b.x + 500 * dt); b.y = 0;
      if (b.t > 2.2) { b.phase++; startBossPhase(b); } break;
    case 'duel': { // final roar duel (king only): tap BRÜLL to push him back
      b.duelT += dt; b.meter = clamp(b.meter - dt * 0.3, 0, 1); b.x = p.wx + 120 + 300 * b.meter; b.y = 0;
      if (Math.random() < 0.5) burst(b.x - 30, GROUND - 40 - Math.random() * 120, 1, ['#fff', '#ffd34d'], 200, 100, 5, 0.5);
      if (b.meter >= 0.97) { b.state = 'flee'; b.t = 0; G.slowT = 1.4; G.shake = 1; G.hitFlash = 0; bossBanner('K.O.!', 'Der Krallenkönig fliegt davon!', '#9cff8a'); SFX.smash(); setTimeout(SFX.roar, 150); burst(b.x, GROUND - 120, 80, ['#ffd740', '#fff', '#ff7043', '#ff5252'], 700, 500, 9, 1.4); toast('Der Krallenkönig rennt davon!', '#9cff8a'); }
      else if (b.meter < 0.06 && b.duelT > 3.5) { hurt(); b.meter = 0.35; b.duelT = 0; G.shake = 0.5; toast('Nicht aufgeben – brüll lauter!', '#ffb4a8'); }
    } break;
    case 'flee': b.x += 620 * dt; b.y -= 260 * dt; if ((b.trail = (b.trail || 0) - dt) <= 0) { b.trail = 0.05; burst(b.x - 40, GROUND + b.y - 110, 2, ['#ffd740', '#fff', '#ff8a65'], 140, 0, 9, 0.7); }
      if (b.t > 1.2 && !G.golden && !G.bossDone) { if (b.kind === 'king') { G.golden = { x: p.wx + 330, y: -60, vy: 0, landed: false }; SFX.pop(); } else { G.bossDone = true; G.stopped = false; SFX.right(); } }
      break;
  }
}
