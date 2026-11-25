'use strict';
// Level generation. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// =====================================================================
// Level generation
// =====================================================================
function buildLevel(wi, endless, LV) { // LV = the calendar level spec (or undefined for endless runs)
  const th = WORLDS[wi], R = rng(endless ? (dailySeed ? dailySeed * 8 + wi : (Date.now() & 0xffffff) + wi) : (LV ? 777 + LV.li * 1013 + 91 : 777 + wi * 1013));
  const dayN = LV ? LV.day : 99, first = LV ? LV.sub === 0 : true, SK = skillsFor(LV ? LV.li : null, wi), bossKind = LV ? LV.boss : null;
  const L = { wi, li: LV ? LV.li : -1, speed: th.speed * (LV ? LV.speedMul : 1), swim: !!th.swim, bossKind, pits: [], obs: [], amb: [], plats: [], eggs: [], spots: [], tips: [], cps: [], coach: [], seen: {}, peppers: [], hearts: [] };
  const amberRow = (x, n, y = GROUND - 45, dx = 48) => { for (let i = 0; i < n; i++) L.amb.push({ x: x + i * dx, y, got: false }); };
  const amberArc = (x, w, peak) => { const n = Math.max(3, Math.floor(w / 45)); for (let i = 0; i <= n; i++) { const u = i / n; L.amb.push({ x: x + u * w, y: GROUND - 60 - 4 * peak * u * (1 - u), got: false }); } };
  const firstTip = (type, x, text) => { if (!L.seen[type]) { L.seen[type] = 1; if (text) L.tips.push({ x, text }); } };
  let curTier = 1; // endless: rises every 26 segments
  const PAD = () => ({ 1: ['Ein Hüpf-Kaktus', 'er'], 2: ['Ein Hüpf-Schneeball', 'er'], 7: ['Ein Hüpf-Schneeball', 'er'], 3: ['Eine Lava-Blase', 'sie'], 5: ['Eine Hüpfmuschel', 'sie'], 6: ['Eine Hüpfmuschel', 'sie'] }[th.art == null ? wi : th.art] || ['Ein Hüpfpilz', 'er']);
  const HN = () => ({ 0: ['Ein Hüpf-Frosch', 'Hüpf-Frösche'], 1: ['Eine Wüstenspringmaus', 'Wüstenspringmäuse'], 2: ['Ein Hüpf-Pinguin', 'Hüpf-Pinguine'], 3: ['Ein Magma-Blob', 'Magma-Blobs'], 5: ['Eine Hüpf-Krabbe', 'Hüpf-Krabben'], 7: ['Ein Pfeifhase', 'Pfeifhasen'] }[th.art == null ? wi : th.art] || ['Ein Hüpf-Frosch', 'Hüpf-Frösche']); // names of the hopping enemy per world
  const P = {
    rock: x => { L.obs.push({ type: 'rock', x: x + 30, w: 56, h: 44 }); amberArc(x - 60, 180, 110); return 120; },
    rock2: x => { L.obs.push({ type: 'rock', x: x + 30, w: 56, h: 44 }); L.obs.push({ type: 'rock', x: x + 340, w: 64, h: 52 }); return 400; },
    pit: x => { const w = 100 + Math.floor(R() * 40) + wi * 10; L.pits.push({ x, w }); amberArc(x - 40, w + 80, 120); return w; },
    amber: x => { amberRow(x, 6); return 300; },
    raptor: x => { firstTip('raptor', x - 1200, wi === 0 ? null : 'Raptor! Drüber springen oder wegbrüllen!'); L.obs.push({ type: 'raptor', x: x + 60, spd: 140 + wi * 20 + (curTier - 1) * 10, ph: 0, alpha: 1 }); return 140; },
    boulder: x => { L.obs.push({ type: 'boulder', x: x + 60, w: 110, h: 160 }); return 140; },
    plat: x => { const y = GROUND - 125; L.plats.push({ x, y, w: 240 }); amberRow(x + 30, 4, y - 40); if (R() < 0.5) L.obs.push({ type: 'rock', x: x + 120, w: 56, h: 44 }); return 260; },
    ptero: x => { firstTip('ptero', x - 1200, 'Flugsaurier! Lieber unten bleiben – oder brüllen!'); const by = GROUND - 165; L.obs.push({ type: 'ptero', x: x + 80, y: by, baseY: by, spd: 160, ph: R() * 6, alpha: 1 }); amberRow(x - 40, 4); return 160; },
    icicle: x => { firstTip('icicle', x - 1200, 'Eiszapfen! Spring über das Eis – oder spuck Feuer, wenn du ein Chili hast!'); L.obs.push({ type: 'icicle', x: x + 60, y: 120, vy: 0, state: 'hang' }); return 140; },
    low: x => { firstTip('low', x - 1200, wi === 0 ? null : 'Da hängt etwas tief! DUCKEN gedrückt halten!'); L.obs.push({ type: 'low', x: x + 70, w: 150 }); amberRow(x - 10, 4, GROUND - 30, 45); return 180; },
    compy: x => { firstTip('compy', x - 1200, wi === 0 ? null : 'Kompsis! Die haben keine Angst vorm Brüllen – spring drauf!'); for (let i = 0; i < 3; i++) L.obs.push({ type: 'compy', x: x + 80 + i * 75, spd: 150 + wi * 15 + (curTier - 1) * 8, ph: i, alpha: 1 }); return 320; },
    geode: x => { firstTip('geode', x - 1200, 'Ein Bernstein-Stein! Spring hoch und drück STAMPF!'); L.obs.push({ type: 'geode', x: x + 60 }); return 140; },
    swoop: x => { firstTip('swoop', x - 1200, 'Ein Flugsaurier fliegt ganz tief! Ducken – oder brüllen!'); const by = GROUND - 88; L.obs.push({ type: 'ptero', x: x + 80, y: by, baseY: by, spd: 200, ph: R() * 6, alpha: 1, low: true }); return 160; },
    pitRock: x => { const w = 100 + Math.floor(R() * 30) + wi * 10; L.pits.push({ x, w }); L.obs.push({ type: 'rock', x: x + w + 270, w: 56, h: 44 }); amberArc(x - 40, w + 80, 120); return w + 320; },
    lowRock: x => { firstTip('lowRock', x - 1200, 'Erst ducken, dann hüpfen!'); L.obs.push({ type: 'low', x: x + 70, w: 150 }); L.obs.push({ type: 'rock', x: x + 430, w: 56, h: 44 }); amberRow(x - 10, 4, GROUND - 30, 45); return 480; },
    compyRun: x => { firstTip('compy', x - 1200, 'Kompsis! Hüpf von Kopf zu Kopf!'); for (let i = 0; i < 5; i++) L.obs.push({ type: 'compy', x: x + 80 + i * 78, spd: 150 + wi * 15 + (curTier - 1) * 8, ph: i, alpha: 1 }); return 480; },
    // ---- new for everybody: hoppers, spitting plants, meteors, bounce mushrooms, crumbling steps ----
    hopper: x => { firstTip('hopper', x - 1200, HN()[0] + '! Spring drüber, lande auf seinem Kopf – oder brüll ihn weg!'); L.obs.push({ type: 'hopper', x: x + 220, hp: R() * 3 }); return 280; },
    hopper2: x => { firstTip('hopper', x - 1200, HN()[1] + '! Spring drüber oder brüll sie weg!'); L.obs.push({ type: 'hopper', x: x + 200, hp: 0 }); L.obs.push({ type: 'hopper', x: x + 470, hp: 1.3 }); return 520; },
    plant: x => { firstTip('plant', x - 1200, { 1: 'Ein Skorpion! Spring über die Stachel, die er schiesst!', 2: 'Ein böser Schneemann! Spring über die Schneebälle, die er wirft!', 7: 'Ein Yeti! Spring über die Schneebälle, die er wirft!', 3: 'Ein Mini-Vulkan! Spring über die Lavabrocken, die er spuckt!', 5: 'Eine Spuck-Anemone! Spring über die Wasserkugeln, die sie spuckt!' }[th.art == null ? wi : th.art] || 'Eine Spuck-Pflanze! Spring über die Samen, die sie spuckt!'); L.obs.push({ type: 'plant', x: x + 280, shoot: 0.5, pop: 0 }); amberRow(x + 40, 3, GROUND - 120, 50); return 360; },
    meteor: x => { firstTip('meteor', x - 1200, 'Achtung, Meteor! Wo es rot blinkt, schlägt gleich einer ein!'); L.obs.push({ type: 'meteor', x: x + 300, state: 'wait', y: -80, vy: 0 }); return 340; },
    meteors: x => { firstTip('meteor', x - 1200, 'Meteoriten-Regen! Wo es rot blinkt, schlägt gleich einer ein!'); for (let i = 0; i < 3; i++) L.obs.push({ type: 'meteor', x: x + 260 + i * 270, state: 'wait', y: -80, vy: 0 }); return 760; },
    bounce: x => { firstTip('pad', x - 1200, PAD()[0] + '! Spring drauf – ' + PAD()[1] + ' katapultiert dich hoch!'); L.obs.push({ type: 'pad', x: x + 60, sq: 0 }); amberArc(x + 80, 300, 320); return 400; },
    bounceUp: x => { firstTip('pad', x - 1200, PAD()[0] + '! ' + PAD()[1].replace(/^./, c => c.toUpperCase()) + ' katapultiert dich ganz hoch hinauf – wenn du von oben draufspringst!'); L.obs.push({ type: 'pad', x: x + 60, sq: 0 }); const y = GROUND - 250; L.plats.push({ x: x + 190, y, w: 240 }); amberRow(x + 220, 4, y - 45, 45); amberArc(x + 70, 140, 280); return 440; },
    crumble: x => { firstTip('crumble', x - 1200, 'Wackelsteine! Sie fallen gleich runter – hüpf schnell weiter!'); const n = 3 + (curTier >= 3 || dayN > 12 ? 1 : 0), w = 120, gap = 80, tw = n * (w + gap); L.pits.push({ x, w: tw + 20 }); for (let i = 0; i < n; i++) { const y = GROUND - 70 - (i % 2) * 28; L.plats.push({ x: x + 30 + i * (w + gap), y, y0: y, w, crumble: true, t: null }); amberRow(x + 50 + i * (w + gap), 2, y - 45, 45); } return tw + 20; },
    raptor2: x => { L.seen.raptor = 1; L.obs.push({ type: 'raptor', x: x + 60, spd: 140 + wi * 20, ph: 0, alpha: 1 }); L.obs.push({ type: 'raptor', x: x + 420, spd: 200 + wi * 20, ph: 2, alpha: 1 }); return 480; },
    // ---- beach: dash ----
    wall: x => { firstTip('wall', x - 1200, 'Eine hohe Mauer! Drück FLITZ und renn durch!'); L.obs.push({ type: 'wall', x: x + 90, w: 60, h: 250 }); amberRow(x + 150, 4, GROUND - 90, 40); return 170; },
    tide: x => { firstTip('tide', x - 1200, 'Eine Welle! Spring drüber – oder FLITZ hindurch!'); L.obs.push({ type: 'tide', x: x + 420, w: 100, h: 118 }); amberArc(x + 60, 200, 100); return 240; },
    // ---- mountains: glide ----
    widegap: x => { firstTip('widegap', x - 1200, 'Ein breiter Abgrund! Spring und halte gedrückt – dann gleitest du!'); const w = 430 + Math.floor(R() * 70); L.pits.push({ x, w }); amberArc(x - 20, w + 40, 190); return w; },
    updraft: x => { firstTip('updraft', x - 1200, 'Aufwind! Er wirbelt dich hoch in die Luft – halte gedrückt, dann gleitest du weit!'); const w = 400; L.pits.push({ x, w }); L.obs.push({ type: 'updraft', x: x + w / 2, w: 210 }); for (let i = 0; i < 6; i++) L.amb.push({ x: x + w / 2 + Math.sin(i * 1.3) * 40, y: GROUND - 90 - i * 38, got: false }); return w; },
    avalanche: x => { firstTip('avalanche', x - 1200, 'Steinlawine! Spring drüber oder brüll sie kaputt!'); for (let i = 0; i < 2; i++) L.obs.push({ type: 'rollrock', x: x + 110 + i * 270, rot: 0 }); return 440; },
    // ---- underwater: swim ----
    coralgate: x => { const gh = 255, gy = 100 + Math.floor(R() * (GROUND - 100 - gh - 30)); L.obs.push({ type: 'cgate', x: x + 90, gapY: gy, gapH: gh }); for (let i = 0; i < 3; i++) L.amb.push({ x: x + 40 + i * 50, y: gy + gh / 2 + (i - 1) * 12, got: false }); return 190; },
    jellies: x => { firstTip('jelly', x - 1200, 'Quallen! Schwimm drumherum – oder brüll Blasen, dann schwimmen sie weg!'); for (let i = 0; i < 3; i++) L.obs.push({ type: 'jelly', x: x + 90 + i * 230, y0: 175 + (i % 2) * 155 + R() * 15, amp: 24 + R() * 16, ph: R() * 6, y: 220 }); return 700; },
    urchins: x => { firstTip('urchin', x - 1200, 'Seeigel am Boden! Schwimm drüber – oder brüll sie in eine Blase!'); for (let i = 0; i < 3; i++) L.obs.push({ type: 'urchin', x: x + 60 + i * 130 }); for (let i = 0; i < 4; i++) L.amb.push({ x: x + 40 + i * 90, y: 200 + Math.sin(i) * 20, got: false }); return 440; },
    sword: x => { firstTip('sword', x - 1200, 'Ein Schwertfisch! Schwimm aus dem Weg – oder brüll ihn weg!'); L.obs.push({ type: 'sword', x: x + 220, y: 230 + R() * 150, spd: 340, ph: 0, alpha: 1 }); return 260; },
    bubbles: x => { for (let i = 0; i < 9; i++) L.amb.push({ x: x + i * 50, y: 270 + Math.sin(i * 0.8) * 95, got: false }); return 440; },
    rockwall: x => { L.obs.push({ type: 'boulder', x: x + 90, w: 110, h: 270 }); for (let i = 0; i < 3; i++) L.amb.push({ x: x + 40 + i * 50, y: 150, got: false }); return 170; },
    geyser: x => { firstTip('geyser', x - 1200, 'Lava-Pfützen! Spring drüber, wenn es spritzt!'); L.obs.push({ type: 'geyser', x: x + 40, t: 0, fired: false }); return 100; },
  };
  let x = 900;
  if (endless) { L.endless = true; L.tierX = []; }
  else if (LV ? LV.li === 0 : wi === 0) {
    L.tips.push({ x: 260, text: 'Tippe auf den Bildschirm, um zu springen!' });
    L.obs.push({ type: 'rock', x: 1000, w: 56, h: 44 }); amberArc(940, 180, 110);
    amberRow(1300, 5);
    L.tips.push({ x: 1450, text: 'Zweimal schnell tippen = Doppelsprung!' });
    L.plats.push({ x: 2000, y: GROUND - 125, w: 240 }); L.plats.push({ x: 2300, y: GROUND - 230, w: 200 }); amberRow(2030, 4, GROUND - 165); amberRow(2330, 4, GROUND - 270);
    L.tips.push({ x: 2650, text: 'Drück auf BRÜLL, um den dicken Felsbrocken zu zerschmettern! (Kleine Steine überspringst du.)' });
    L.obs.push({ type: 'boulder', x: 3250, w: 110, h: 160 });
    L.tips.push({ x: 3500, text: 'Ein Raptor! Brüllen verjagt ihn!' });
    L.obs.push({ type: 'raptor', x: 4300, spd: 140, ph: 0, alpha: 1 });
    if (!save.tutorialDone) L.coach.push(
      { x: 870, type: 'jump', text: 'Jetzt tippen – springen!' },
      { x: 1930, type: 'jump', text: 'Tippen – rauf auf die Plattform!' },
      { x: 2200, type: 'jump', text: 'Nochmal tippen – ganz nach oben!' },
      { x: 3000, type: 'roar', text: 'Drück BRÜLL!' },
      { x: 3840, type: 'roar', text: 'Ein Raptor! Drück BRÜLL!' });
    x = 4600;
  } else {
    L.tips.push({ x: 150, text: first ? fmt(th.startTip) : (LV && LV.boss ? 'Heute wartet am Ende ein Boss! Sammle Herzen und sei bereit.' : 'Los geht\'s – ' + (LV ? LV.title : th.name) + '!') });
    if (!first) { /* normal level, no tutorial */ }
    else if (wi === 1) { // new: duck
      L.seen.low = L.seen.swoop = 1;
      L.obs.push({ type: 'low', x: 1500, w: 150 }); amberRow(1420, 4, GROUND - 30, 45);
      L.tips.push({ x: 1700, text: 'Ein Flugsaurier fliegt ganz tief! Ducken – oder brüllen!' });
      const by = GROUND - 88; L.obs.push({ type: 'ptero', x: 2900, y: by, baseY: by, spd: 200, ph: 0, alpha: 1, low: true });
      if (!save.learned.duck) L.coach.push({ x: 1000, type: 'duck', text: 'DUCKEN gedrückt halten!' });
      x = 3300;
    } else if (wi === 2) { // new: stomp
      L.seen.geode = L.seen.compy = 1;
      L.obs.push({ type: 'geode', x: 1500 });
      L.tips.push({ x: 1600, text: 'Kompsis! Brüllen hilft nicht – spring ihnen auf den Kopf!' });
      for (let i = 0; i < 3; i++) L.obs.push({ type: 'compy', x: 2700 + i * 75, spd: 150, ph: i, alpha: 1 });
      if (!save.learned.stomp) L.coach.push({ x: 1000, type: 'jump', text: 'Spring hoch!' }, { x: 1180, type: 'stomp', text: 'Jetzt STAMPF drücken!' });
      x = 3300;
    } else if (wi === 5) { // new: dash
      L.seen.wall = 1; L.obs.push({ type: 'rock', x: 1100, w: 56, h: 44 }); amberArc(1040, 180, 110);
      L.tips.push({ x: 1000, text: 'Eine hohe Sandmauer! Drück FLITZ und renn mitten durch!' });
      L.obs.push({ type: 'wall', x: 1950, w: 60, h: 250 }); amberRow(2030, 4, GROUND - 90, 40);
      if (!save.learned.dash) L.coach.push({ x: 1450, type: 'dash', text: 'Drück FLITZ!' });
      x = 2600;
    } else if (wi === 6) { // new: swim
      L.seen.sword = L.seen.jelly = L.seen.urchin = 1;
      if (!save.learned.swim) L.coach.push({ x: 650, type: 'jump', text: 'Tippe – du schwimmst nach oben!' });
      L.obs.push({ type: 'cgate', x: 1500, gapY: 150, gapH: 275 }); for (let i = 0; i < 3; i++) L.amb.push({ x: 1440 + i * 50, y: 290, got: false });
      L.tips.push({ x: 700, text: 'Schwimm durch die Lücke im Korallentor!' });
      x = 2300;
    } else if (wi === 7) { // new: glide
      L.seen.widegap = 1; L.pits.push({ x: 1750, w: 470 }); amberArc(1710, 550, 200);
      if (!save.learned.glide) L.coach.push({ x: 1250, type: 'jump', text: 'Spring!' }, { x: 1400, type: 'glide', text: 'Jetzt GEDRÜCKT HALTEN – du gleitest!' });
      x = 2900;
    } else if (wi === 3) { // new: fire chili
      L.peppers.push({ x: 900, y: GROUND - 60, got: false });
      L.obs.push({ type: 'boulder', x: 1700, w: 110, h: 160 });
      if (!save.learned.fire) L.coach.push({ x: 1200, type: 'roar', text: 'Drück FEUER!' });
      x = 2200;
    }
  }
  const n = endless ? 300 : (LV ? LV.segs : th.segs), eggAt = endless ? [-1, -1, -1] : [Math.floor(n * 0.25), Math.floor(n * 0.55), Math.floor(n * 0.85)], cpAt = endless ? [] : [Math.floor(n * 0.35), Math.floor(n * 0.65)], tAt = endless ? -1 : (LV ? (LV.treasure >= 0 ? Math.floor(n * 0.45) : -1) : (wi === 4 ? -1 : Math.floor(n * 0.45)));
  let segI = 0;
  const HARD = ['raptor2', 'hopper2', 'plant', 'meteors', 'crumble', 'bounceUp', 'raptor', 'ptero', 'swoop', 'compy', 'geyser', 'geode', 'pitRock', 'lowRock', 'compyRun', 'sword', 'jellies', 'avalanche'], COMBO = ['pitRock', 'lowRock', 'compyRun', 'meteors', 'hopper2', 'raptor2', 'bounceUp'];
  const NEEDS = { low: 'duck', lowRock: 'duck', swoop: 'duck', geode: 'stomp', wall: 'dash', widegap: 'glide', updraft: 'glide' };
  const pickPattern = () => { let pool = th.patterns.filter(k => !NEEDS[k] || SK[NEEDS[k]]); const tier = endless ? curTier : (LV ? Math.min(LV.maxTier, 1 + Math.floor(segI * 3 / n)) : 3); const easy = pool.filter(k => !HARD.includes(k)), mid = pool.filter(k => !COMBO.includes(k)); if (tier === 1 && easy.length) pool = easy.filter(k => k !== 'amber').length ? easy.filter(k => k !== 'amber') : easy; else if (tier === 2 && mid.length) pool = mid; return pool[Math.floor(R() * pool.length)]; };
  // a smash-with-roar obstacle needs the roar to charge again (3 s): never put two of them closer than that allows
  const ROAR = ['boulder', 'rockwall'], ROARGAP = 3 * L.speed * 1.15 + 80;
  const placeSeg = x0 => {
    let pk = pickPattern();
    if (ROAR.includes(pk)) { let last = -1e9; for (const o of L.obs) if (o.type === 'boulder' && o.x < x0 + 200) last = Math.max(last, o.x); if (x0 + 60 - last < ROARGAP) { for (let t = 0; t < 12 && ROAR.includes(pk); t++) pk = pickPattern(); if (ROAR.includes(pk)) pk = th.patterns.find(k => !ROAR.includes(k) && (!NEEDS[k] || SK[NEEDS[k]])) || 'amber'; } }
    return P[pk](x0);
  };
  for (let i = 0; i < n; i++) {
    segI = i;
    if (endless && i > 0 && i % 26 === 0) { curTier++; L.tierX.push(x); }
    if (cpAt.includes(i)) { L.cps.push({ x, on: false }); x += 160; }
    if (endless ? (wi >= 3 && wi !== 5 && wi !== 6 && wi !== 7 && i % 14 === 7) : (SK.fire && (i === Math.floor(n * 0.33) || i === Math.floor(n * 0.78)))) { L.peppers.push({ x: x - 120, y: GROUND - 60, got: false }); }
    if (endless ? i % 18 === 11 : (i === Math.floor(n * 0.3) || i === Math.floor(n * 0.72))) { L.hearts.push({ x: x + 150, y: GROUND - 150 - 30 * (i % 2), got: false }); if (!L.heartTip) { L.heartTip = 1; L.tips.push({ x: x - 450, text: 'Ein Herz! Spring hoch und sammle es – dann bekommst du ein Leben zurück.' }); } }
    let w;
    if (i === eggAt[0]) {
      if (wi === 0) L.tips.push({ x: x - 1200, text: 'Da oben glänzt ein Ei! Spring auf die Plattformen!' });
      L.plats.push({ x, y: GROUND - 120, w: 200 }); L.plats.push({ x: x + 240, y: GROUND - 235, w: 200 });
      amberRow(x + 30, 3, GROUND - 160);
      L.eggs.push({ k: 0, x: x + 360, y: GROUND - 282 }); w = 460;
    } else if (i === eggAt[1]) {
      L.spots.push({ x: x + 40, k: 1, state: 'idle' });
      L.eggs.push({ k: 1, x: x + 340, y: GROUND - 150, hidden: true }); w = 440;
    } else if (i === tAt) { // Götti's treasure: never on show, each one hides behind a different move (see openSecret)
      const tk = LV ? LV.treasure : Math.min(wi, 3), miss = save.tTries[tk] || 0, kind = ['tree', 'rock', 'ice', 'ash'][tk];
      if (miss >= 1) L.tips.push({ x: x - 700, text: TREASURES[tk].tip }); // after one miss the hint says what to do
      L.treasure = { k: tk, x: x + 600, y: GROUND - 100, got: false, shown: false };
      L.secret = { kind, x: x + 600, state: 'idle', cue: 0.4, noticed: false, strong: miss >= 2 };
      if (kind === 'tree') { L.secret.x = x + 760; w = 1100; }
      else if (kind === 'rock') { L.secret.x = x + 560; L.obs.push({ type: 'rock', x: x + 560, w: 70, h: 56, sec: true }); w = 900; }
      else if (kind === 'ice') { L.secret.x = x + 560; w = 900; }
      else { L.peppers.push({ x: x + 80, y: GROUND - 60, got: false, sec: true }); L.secret.x = x + 760; w = 1100; }
    } else if (i === eggAt[2]) {
      L.pits.push({ x, w: 150 }); L.eggs.push({ k: 2, x: x + 75, y: GROUND - 195 }); w = 150;
    } else if (!endless && (wi === 2 || wi === 4) && i === Math.floor(n * 0.62)) { // stampede
      L.tips.push({ x: x - 1200, text: 'Eine Kompsi-Herde! Hüpf von Kopf zu Kopf!' });
      for (let k = 0; k < 4; k++) L.obs.push({ type: 'compy', x: x + 80 + k * 90, spd: 165, ph: k, alpha: 1 });
      for (let k = 0; k < 4; k++) L.obs.push({ type: 'compy', x: x + 560 + k * 90, spd: 175, ph: k, alpha: 1 });
      amberRow(x + 380, 4, GROUND - 110, 50); w = 960;
    } else if ((endless ? (wi === 3 && i % 17 === 9) : (wi === 3 && i === Math.floor(n * 0.15)))) { // lava river
      L.tips.push({ x: x - 1200, text: 'Ein Lava-Fluss! Hüpf über die Steine!' });
      L.pits.push({ x, w: 820 });
      [[40, 90], [250, 150], [460, 100], [650, 160]].forEach(([dx, h], k) => { L.plats.push({ x: x + dx, y: GROUND - h, w: 130 }); amberRow(x + dx + 20, 3, GROUND - h - 40, 40); });
      w = 820;
    } else {
      w = placeSeg(x);
      if (endless && curTier >= 4 && R() < 0.4) { x += w + 170; w = placeSeg(x); } // doubled-up dangers
    }
    x += w + (260 + R() * 200) * (endless ? Math.max(0.6, 1 - 0.07 * (curTier - 1)) : (LV ? 0.82 + 0.1 * Math.min(1, (dayN - 1) / 12) : 1));
  }
  L.eggs.sort((a, b) => a.k - b.k);
  L.ambTotal = L.amb.length;
  x += 300;
  if (endless) L.gateX = 1e9; else if (bossKind) { L.bossX = x + 200; L.gateX = L.bossX + 1300; } else L.gateX = x + 500;
  return L;
}
