'use strict';
// Setup and save game. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// =====================================================================
// Setup
// =====================================================================
const W = 960, H = 540, GROUND = 440, GRAV = 2300;
const FONT = '"Trebuchet MS","Segoe UI",system-ui,sans-serif';
// Shown on the title screen. The deploy workflow replaces the literal with '<commit> · <date>'; locally it reads 'dev'.
const BUILD = 'dino-advent-build';
const BUILD_LABEL = BUILD === 'dino-advent' + '-build' ? 'dev' : BUILD;
const canvas = document.getElementById('game');
let ctx = canvas.getContext('2d');
let DPR = 1, SC = 1, OX = 0, OY = 0, T = 0, DT = 0;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  // cap DPR at 2 and keep the backing store under ~3.2M pixels so large tablets stay smooth
  DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3.2e6 / Math.max(1, w * h))));
  canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  SC = Math.min(w / W, h / H); OX = (w - W * SC) / 2; OY = (h - H * SC) / 2;
}
window.addEventListener('resize', resize); resize();

// =====================================================================
// Save game
// =====================================================================
// Debug aids (?day=N, window.__dino) exist only on a local server or file, never on the published site.
const DEBUG = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
const SAVE_KEY = 'olisDinoRettung.v1';
// Expected JSON type of each save field (s string, n number, f flag = boolean or 0/1, a array, o object).
// A stored field of the wrong type is dropped so it falls back to its default: a damaged, hand-edited or
// imported save must not be able to crash the game later.
const SAVE_TYPES = { rexName: 's', babyName: 's', fabioName: 's', oliName: 's', nick: 's',
  unlocked: 'n', amber: 'n', treasureNew: 'n', volMusic: 'n', volSfx: 'n', dailyLast: 'n', dailyStreak: 'n', dailyBoardDay: 'n', dailyBest: 'n', master: 'n', masterNew: 'n', chestSeen: 'n', afterNew: 'n', riddleVer: 'n', candles: 'n', quizDay: 'n', quizAmber: 'n',
  finished: 'f', muted: 'f', tutorialDone: 'f', calm: 'f', installHint: 'f',
  eggs: 'a', medals: 'a', treasures: 'a', tTries: 'a', riddleSeen: 'a', quizSeen: 'a', quizBest: 'a', lvE: 'a', lvM: 'a', lvDone: 'a', gifts: 'a', newGifts: 'a', best: 'a', board: 'a', bookSeen: 'a',
  learned: 'o', owned: 'o', equip: 'o', storySeen: 'o' };
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function saveFieldOk(kind, v) {
  return kind === 's' ? typeof v === 'string' : kind === 'n' ? Number.isFinite(v) : kind === 'f' ? typeof v === 'boolean' || v === 0 || v === 1
    : kind === 'a' ? Array.isArray(v) : kind === 'o' ? isObj(v) : true;
}
function buildSave(raw) { // defaults + stored fields + migrations
  const s = { rexName: '', babyName: '', fabioName: '', unlocked: 0, eggs: [[0,0,0],[0,0,0],[0,0,0],[0,0,0]], amber: 0, finished: false, muted: false, tutorialDone: false, learned: { duck: 0, stomp: 0, fire: 0, dash: 0, swim: 0, glide: 0 }, riddleSeen: [[], [], [], []],
    medals: [[0,0,0],[0,0,0],[0,0,0],[0,0,0]], treasures: [0,0,0,0], treasureNew: -1, tTries: [0,0,0,0] };
  if (isObj(raw)) for (const k of Object.keys(raw)) {
    if (k === '__proto__') continue;
    if (k === 'dayOverride' ? raw[k] === null || Number.isFinite(raw[k]) : saveFieldOk(SAVE_TYPES[k], raw[k])) s[k] = raw[k];
  }
  // calendar progress: one entry per level (24 days). Old 4-world saves keep names, amber and shop items but start the calendar fresh.
  if (!s.lvE) s.lvE = []; if (!s.lvM) s.lvM = []; if (!s.lvDone) s.lvDone = [];
  while (s.lvE.length < 24) { s.lvE.push([0, 0, 0]); s.lvM.push([0, 0, 0]); s.lvDone.push(0); }
  while (s.lvM.length < 24) s.lvM.push([0, 0, 0]);
  if (!s.gifts) s.gifts = []; if (!s.newGifts) s.newGifts = []; if (s.dayOverride === undefined) s.dayOverride = null;
  s.learned = Object.assign({ duck: 0, stomp: 0, fire: 0, dash: 0, swim: 0, glide: 0 }, s.learned);
  while (s.riddleSeen.length < 8) s.riddleSeen.push([]);
  if (!s.quizSeen) s.quizSeen = []; while (s.quizSeen.length < 8) s.quizSeen.push([]); // Götti-Quiz: riddles asked per theme (kept apart from the level gates' riddleSeen)
  if (!s.quizBest) s.quizBest = []; while (s.quizBest.length < 9) s.quizBest.push(0); // best 'right first time' count (0-5) per theme, index 8 = mixed round
  if (!s.quizDay) s.quizDay = 0; if (!s.quizAmber) s.quizAmber = 0; // amber earned by the quiz on day quizDay (dayKey), capped per day
  while (s.tTries.length < 4) s.tTries.push(0); // per treasure: how often its level was finished without finding it (drives the hints)
  if (!s.owned) s.owned = { skin: [0], hat: [0], fire: [0] };
  if (!s.equip) s.equip = { skin: 0, hat: 0, fire: 0 };
  // shop extras: jackets for both boys, Fabio's own hat, Chili's accessories, Götti's vouchers
  for (const [k, v] of [['jacket', [0, 1]], ['chili', [0]], ['wish', []]]) if (!s.owned[k]) s.owned[k] = v;
  for (const k of Object.keys(s.owned)) if (!Array.isArray(s.owned[k])) s.owned[k] = [0];
  for (const k of ['skin', 'hat', 'fire']) if (!s.owned[k]) s.owned[k] = [0];
  if (s.equip.jacket == null) s.equip.jacket = 0;
  if (s.equip.fabioJacket == null) s.equip.fabioJacket = 1;
  if (s.equip.fabioHat == null) s.equip.fabioHat = s.equip.hat;
  if (s.equip.chili == null) s.equip.chili = 0;
  for (const k of Object.keys(s.equip)) if (!Number.isFinite(s.equip[k])) s.equip[k] = k === 'fabioJacket' ? 1 : 0;
  if (!s.best) s.best = []; while (s.best.length < 8) s.best.push(0);
  if (s.volMusic == null) s.volMusic = 4; if (s.volSfx == null) s.volSfx = 4; if (!s.calm) s.calm = false;
  if (!s.dailyLast) s.dailyLast = 0; if (!s.dailyStreak) s.dailyStreak = 0; if (!s.dailyBoardDay) s.dailyBoardDay = 0; if (!s.installHint) s.installHint = false;
  s.candles = Number.isFinite(s.candles) ? Math.min(4, Math.max(0, Math.floor(s.candles))) : 0; // Advent candles lit so far (0 to 4)
  if (!s.master) s.master = 0; if (!s.masterNew) s.masterNew = 0; if (!s.chestSeen) s.chestSeen = 0;
  if (!s.storySeen) s.storySeen = {}; if (!s.afterNew) s.afterNew = 0; if (!s.oliName) s.oliName = '';
  if (!s.board) s.board = []; while (s.board.length < 9) s.board.push([]); if (!s.nick) s.nick = '';
  // rows of the per-level / per-theme tables must be arrays of the right shape
  for (const t of [s.lvE, s.lvM, s.eggs, s.medals]) for (let i = 0; i < t.length; i++) { if (!Array.isArray(t[i])) t[i] = []; while (t[i].length < 3) t[i].push(0); }
  for (const t of [s.riddleSeen, s.quizSeen]) for (let i = 0; i < t.length; i++) if (!Array.isArray(t[i])) t[i] = [];
  s.quizBest = s.quizBest.map(v => Number.isFinite(v) ? v : 0);
  s.board = s.board.map(row => Array.isArray(row) ? row.filter(e => isObj(e) && typeof e.n === 'string' && Number.isFinite(e.s)) : []);
  return s;
}
let save;
const BAK_KEY = SAVE_KEY + '.bak'; // yesterday's save, kept as a fallback: { day, text } (rewritten before the first write of each day)
let bakDay = '';
{
  let raw = null, text = null, bad = false;
  try { text = localStorage.getItem(SAVE_KEY); raw = text ? JSON.parse(text) : null; }
  catch (e) { bad = true; try { if (text && !localStorage.getItem(SAVE_KEY + '.broken')) localStorage.setItem(SAVE_KEY + '.broken', text); } catch (e2) {} } // unreadable save: keep a copy before it gets overwritten
  try {
    const bak = JSON.parse(localStorage.getItem(BAK_KEY));
    if (bak && typeof bak.day === 'string') bakDay = bak.day;
    if ((bad || !text) && bak && typeof bak.text === 'string') raw = JSON.parse(bak.text); // main save lost or unreadable: fall back to yesterday's
  } catch (e) {}
  save = buildSave(raw);
}
let saveLocked = false; // set while the parent panel wipes everything: no write may bring the old save back before the reload
let saveFail = 0, saveFailToast = 0; // saveFail: how many writes in a row failed (private mode, full quota, blocked storage)
function writeSave() {
  if (saveLocked) return;
  try {
    const day = new Date().toDateString();
    if (day !== bakDay) { // first write of the day: keep what was stored before as the fallback copy (a failing copy must not block the real save)
      bakDay = day;
      try { const prev = localStorage.getItem(SAVE_KEY); if (prev) localStorage.setItem(BAK_KEY, JSON.stringify({ day, text: prev })); } catch (e) {}
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(save)); saveFail = 0;
  }
  catch (e) {
    saveFail++;
    if (Date.now() - saveFailToast > 60000) { saveFailToast = Date.now(); try { toast('Speichern klappt gerade nicht. Bitte Mami oder Papi fragen!', '#ff9d9d'); } catch (e2) {} }
  }
}
// Ask the browser not to evict the save when storage runs low. Chrome decides silently; Firefox would show a
// permission prompt, so it is only requested there from the parent panel (force).
function protectStorage(force) {
  try {
    if (!navigator.storage || !navigator.storage.persist) return;
    if (!force && /Firefox/.test(navigator.userAgent)) return;
    navigator.storage.persisted().then(p => { if (!p) navigator.storage.persist(); }).catch(() => {});
  } catch (e) {}
}
// Backup code for moving the save to another device: "DINO1." + base64 of the JSON.
function saveToCode() { return 'DINO1.' + btoa(unescape(encodeURIComponent(JSON.stringify(save)))); }
function codeToSave(code) { // returns a fresh save object, or null when the code is not a valid backup
  try {
    const m = /^DINO1\.([A-Za-z0-9+/=]+)$/.exec(String(code).replace(/\s+/g, ''));
    if (!m) return null;
    const o = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    return isObj(o) && Array.isArray(o.lvDone) ? buildSave(o) : null;
  } catch (e) { return null; }
}
