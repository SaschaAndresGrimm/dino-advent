// Offline audio audit. `auditInPage` runs inside the game page: it renders songs, sound effects, ambience and a worst-case
// pile-up through an OfflineAudioContext (the real synthesis code, fake clock) and reports peak, loudness and clipping.
// Used by tests/audio.spec.js; run `AUDIO_REPORT=1 npx playwright test tests/audio.spec.js` to print the full table.
async function auditInPage(cfg) {
  const d = window.__dino, SR = 22050;
  d.save.muted = false; d.save.volMusic = 4; d.save.volSfx = 4;
  const stats = buf => {
    let peak = 0, sum = 0, clip = 0, n = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) { const x = buf.getChannelData(c); for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; if (a >= 0.945) clip++; /* 0.95 = the soft clipper ceiling */ sum += x[i] * x[i]; n++; } }
    return { peak: +(20 * Math.log10(peak + 1e-9)).toFixed(1), rms: +(10 * Math.log10(sum / n + 1e-12)).toFixed(1), clip: +(clip / n).toFixed(5) };
  };
  const render = async (secs, drive) => {
    const ctx = new OfflineAudioContext(2, Math.floor(SR * secs), SR); let clock = 0;
    const px = new Proxy(ctx, { get(t, k) { if (k === 'currentTime') return clock; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; }, set(t, k, v) { t[k] = v; return true; } });
    d.useAudio(px); await drive(c => { clock = c; }); return stats(await ctx.startRendering());
  };
  const music = (key, level, secs, extra) => render(secs, async set => { for (let t = 0; t < secs; t += 0.1) { set(t); if (extra) extra(t); d.musicTick(key, level, { vol: 1, lift: 0, danger: false }); } });
  const out = [];
  for (const [key, level] of cfg.songs || []) out.push({ group: 'song', name: `${key} (level ${level})`, ...(await music(key, level, cfg.songSecs || 8)) });
  for (const [name, args] of cfg.sfx || []) out.push({ group: 'sfx', name, ...(await render(3, set => { set(0); d.SFX[name](...(args || [])); })) });
  for (const wi of cfg.amb || []) out.push({ group: 'ambience', name: `world ${wi}`, ...(await render(5, set => { for (let t = 0; t < 5; t += 0.2) { set(t); d.ambTick(wi, 1); } if (d.AMB[wi].ev) d.ambEvent(d.AMB[wi].ev); })) });
  for (const [key, level] of cfg.stress || []) out.push({ group: 'pile-up', name: `${key} + roar + smash + stomp`, ...(await music(key, level, 6, t => { if (Math.abs(t - 2) < 0.05) { d.SFX.roar(); d.SFX.smash(); d.SFX.stomp(); } })) });
  return out;
}
const ALL_SONGS = ['map', '0', '1', '2', '3', '4', '5', '6', '7', 'ending', 'boss_crab', 'boss_kraken', 'boss_queen', 'boss_king'];
const SFX_LIST = [['jump'], ['dash'], ['amber'], ['amberNote', [3]], ['egg'], ['hurt'], ['lose'], ['lowHeart'], ['right'], ['smash'], ['roar'], ['roarWater'], ['stomp'], ['stamp'], ['nearMiss'], ['rise'], ['bossSting'], ['warn'], ['land', [900]], ['heart'], ['bubble'], ['whoosh'], ['buy'], ['chirp'], ['sparkle'], ['victory', [false]], ['victory', [true]], ['power'], ['fire'], ['runeChime', [0]], ['runeChime', [2]], ['tabletThud'], ['riddleWin'], ['gateRumble'], ...['rex', 'spino', 'trike', 'sauro', 'raptor', 'ptero', 'quetz', 'stego', 'mammoth', 'anky', 'ichthyo', 'mosa', 'plesio', 'archelon', 'ammonite', 'archaeo', 'theriz', 'chicken', 'polar', 'feather', 'steps', 'eggs', 'meteor', 'trees'].map(k => ['voice', [k]])];
module.exports = { auditInPage, ALL_SONGS, SFX_LIST };
