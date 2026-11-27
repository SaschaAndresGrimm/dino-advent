'use strict';
// Input, main loop, debug hook. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// =====================================================================
// Input
// =====================================================================
function toLogical(e) { return { x: (e.clientX - OX) / SC, y: (e.clientY - OY) / SC }; }
canvas.addEventListener('pointerdown', e => {
  e.preventDefault(); audio();
  if (nameOpen()) return;
  const { x, y } = toLogical(e);
  if (dialog) { advanceDialog(); return; }
  if (scene === 'play' && G && !G.overlay && G.sk.dash && !G.L.swim) { const [dx, dy, dr] = dashPos(); if (Math.hypot(x - dx, y - dy) < dr + 14) { dash(); return; } }
  if (scene === 'play' && G && !G.overlay && G.sk.duck && Math.hypot(x - duckPos()[0], y - duckPos()[1]) < 84) { duckDown(e.pointerId); return; }
  if (scene === 'map' && !parentMode && !doorOverlay && x < 350 && y < 56) titlePress = T;
  if (scene === 'splash') { startSplash(); return; }
  if (hitButtons(x, y)) return;
  if (scene === 'title') pressTitle();
  else if (scene === 'book' && bookMode === 'lineup') lineDown(x, y);
  else if (scene === 'play' && !G.overlay) { jump(); G.holdJump = e.pointerId; }
});
window.addEventListener('pointermove', e => { if (lineDrag) lineMove(toLogical(e).x); });
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, e => { if (lineDrag) { const q = toLogical(e); lineUp(q.x, q.y); } });
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, e => { titlePress = 0; duckUp(e.pointerId); if (G && G.holdJump === e.pointerId) { G.holdJump = null; jumpRelease(); } });
window.addEventListener('keyup', e => { if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') duckUp('key'); if (G && G.holdJump === 'key' && (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')) { G.holdJump = null; jumpRelease(); } });
window.addEventListener('keydown', e => {
  if (nameOpen() || e.repeat) return;
  audio();
  const k = e.key;
  if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') {
    e.preventDefault();
    if (dialog) advanceDialog();
    else if (scene === 'splash') startSplash();
    else if (scene === 'title') pressTitle();
    else if (scene === 'play' && !G.overlay) { jump(); G.holdJump = 'key'; }
    else if (scene === 'ending' && E.phase === 'tap') tapEgg();
    else if (scene === 'candles') candleSpark();
  } else if (k === 'r' || k === 'R' || k === 'x' || k === 'X' || k === 'ArrowRight' || k === 'Enter') {
    if (dialog) advanceDialog();
    else if (scene === 'splash') startSplash();
    else if (scene === 'candles') candleSpark();
    else if (scene === 'play' && !G.overlay) roar();
  } else if (k === 'f' || k === 'F' || k === 'Shift' || k === 'ArrowLeft') {
    if (scene === 'play' && !G.overlay) dash();
  } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
    e.preventDefault(); if (scene === 'play') duckDown('key');
  } else if ((k === 'Escape' || k === 'p') && scene === 'play') {
    G.overlay = G.overlay && G.overlay.type === 'pause' ? null : (G.overlay || { type: 'pause' });
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && scene === 'play' && G && !G.overlay) G.overlay = { type: 'pause' }; });

// =====================================================================
// Main loop
// =====================================================================
let last = performance.now();
// One exception must never stop the loop (a frozen screen is the worst outcome for a small child).
// The next frame is requested first; a failed frame is dropped and the canvas state repaired. Repeated
// failures send the player back to the map, then to the title, and finally reload the page.
const mainCtx = ctx;
let frameErrs = [], recoveries = 0;
function frameFailed(e, goodT) {
  try { console.error('frame error', e); } catch (e2) {}
  ctx = mainCtx; T = goodT; canvas.width = canvas.width; // swap back from an offscreen context; resizing resets the state stack and transform
  const now = performance.now();
  frameErrs = frameErrs.filter(t => now - t < 3000); frameErrs.push(now);
  if (frameErrs.length < 3) return;
  frameErrs = []; recoveries++;
  try {
    if (recoveries > 2) throw e;
    if (G) { G.overlay = null; }
    go(recoveries === 1 && scene !== 'map' && scene !== 'title' ? 'map' : 'title');
    toast('Hoppla! Zurück zum Anfang.', '#ffe08a');
  } catch (e2) { // still failing: reload the page (progress is already in the save), at most twice per session
    let n = 0; try { n = +sessionStorage.getItem('dinoReloads') || 0; sessionStorage.setItem('dinoReloads', n + 1); } catch (e3) {}
    if (n < 2) location.reload();
  }
}
// High-refresh screens (120 Hz iPads and tablets) would double the drawing work for no visible gain, because physics already runs in
// fixed 1/60 steps. After a short measurement, a display at ~100 Hz or more draws every second frame (about 60 fps).
let rafPrev = 0, rafDeltas = [], rafSkip = 0, rafParity = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (rafPrev && rafSkip === 0) {
    const d = now - rafPrev; if (d > 0 && d < 100) rafDeltas.push(d);
    if (rafDeltas.length >= 40) { rafDeltas.sort((a, b) => a - b); rafSkip = rafDeltas[20] < 10 ? 2 : 1; rafDeltas = []; }
  }
  rafPrev = now;
  if (rafSkip === 2 && (rafParity ^= 1)) return;
  const goodT = T;
  try { frameBody(now); } catch (e) { frameFailed(e, goodT); }
}
// A new release has been installed in the background (index.html sets updateReady): reload at a moment when nothing is going on.
function maybeReloadForUpdate() {
  if (!window.updateReady || !['splash', 'title', 'map'].includes(scene)) return;
  if (dialog || nameOpen() || doorOverlay || parentMode || settingsOpen || fadeT > 0) return;
  window.updateReady = false; location.reload();
}
function frameBody(now) {
  maybeReloadForUpdate();
  DT = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now; T += DT;
  const portrait = window.innerHeight > window.innerWidth * 1.05;
  if (!portrait) {
    // fixed sub-steps keep physics identical on slow and fast devices
    let rem = DT;
    while (rem > 1e-4) {
      const st = Math.min(rem, 1 / 60); rem -= st;
      if (scene === 'play') updatePlay(st);
      else if (scene === 'ending') updateEnding(st);
      else if (scene === 'candles') updateCandles(st);
      updateParts(st);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * OX, DPR * OY);
  { const mo = musicOpts(); musicTick(musicKey(portrait), musicLevel(), mo); ambTick(scene === 'play' && G && !portrait ? G.wi : null, mo.vol); }
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  buttons = [];
  if (scene === 'splash') drawSplash();
  else if (scene === 'title') drawTitle();
  else if (scene === 'story') drawStory();
  else if (scene === 'map') drawMap();
  else if (scene === 'book') drawBook();
  else if (scene === 'board') drawBoard();
  else if (scene === 'tmap') drawTMap();
  else if (scene === 'shop') drawShop();
  else if (scene === 'sheet') drawSheet();
  else if (scene === 'play') drawPlay();
  else if (scene === 'ending') drawEnding();
  else if (scene === 'candles') drawCandles();
  else if (scene === 'quiz') drawQuiz();
  drawDialog();
  if (!(scene === 'play' && G.overlay)) drawToasts();
  if (flashT > 0) { flashT = Math.max(0, flashT - DT * 1.8); ctx.fillStyle = `rgba(255,248,215,${flashT})`; ctx.fillRect(0, 0, W, H); }
  if (fadeT > 0) { fadeT = Math.max(0, fadeT - DT * 4.5); ctx.fillStyle = `rgba(10,8,20,${fadeT})`; ctx.fillRect(0, 0, W, H); }
  if (portrait) { buttons = []; ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(0, 0, W, H); otxt('Bitte das Tablet quer halten!', W / 2, H / 2, 44, '#ffd34d', '#000', 8); }
  ctx.restore();
}
requestAnimationFrame(frame);

// debug hook for testing in the browser console
if (DEBUG) window.__dino = { shopCard(i) { const v = shopVisible(SHOP_TABS[shopTab]), vi = v.indexOf(i), j = vi % 8; return [440 + (j % 4) * 126 + 59, 166 + Math.floor(j / 4) * 104 + 50]; }, writeSave, saveToCode, codeToSave, buildSave, get saveFail() { return saveFail; }, openSecret, bookUnread, get mus() { return mus; }, useAudio(ctx) { AC = ctx; noiseBuf = null; buildAudioGraph(); mus.key = null; mus.trans = null; mus.saved = {}; mus.g = 1; mus.vt = 1; amb.wi = null; amb.node = null; amb.lvl = -1; }, musicTick, SFX, ambTick, ambEvent, AMB, SONGS, startSplash, get splash() { return splash; }, bossDmg, medalTotal, worldMedalsDone, chestFull, chestParty, get chestPartyT() { return chestPartyT; }, startDaily, dailyWorld, dayKey, get dialog() { return dialog; }, DAY_STORY, DAY_AFTER, launchLevel, finishLevel, fmt, cleanNick, boardAdd, boardQualifies, boardAll, endRun, get scene() { return scene; }, get doorOverlay() { return doorOverlay; }, get buttons() { return buttons; }, pitFall, get lowfx() { return LOWFX; }, set lowfx(v) { LOWFX = v; }, get G() { return G; }, get E() { return E; }, save, startLevel, startEnding, go, jump, jumpRelease, roar, updatePlay, updateEnding, answer, openRiddle, pickRiddle, startQuiz, openQuizPicker, quizNext, quizLeft, quizThemes, get Q() { return Q; }, retry, tapEgg, openGate, playTreasure, drawPlay, duckDown, duckUp, shootFire, drawShop, buildSong, dash, LEVELS, adventDay, openDoorGift, giftFor, clickDoor, skillsFor, FACTS, STECK, VOICE_OF, VOICES, cardSprite, bookOpen(i) { bookSel = i; }, bookMode(m) { bookMode = m; lineLayout = null; lineScroll = lineTarget = 0; }, lineupScroll(v) { lineTarget = lineScroll = v; }, openBookCard, sheet(p) { sheetPage = p || 'hero'; scene = 'sheet'; }, candlesDue, startCandle, candleSpark, updateCandles, get C() { return C; }, CANDLE_DAYS, drawWreath };
