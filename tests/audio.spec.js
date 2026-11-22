const { test, expect } = require('./helpers');
const { auditInPage, ALL_SONGS, SFX_LIST } = require('./audioRender');

// Renders the real synthesis offline and checks the mix: nothing clips, nothing is inaudible.
// Set AUDIO_REPORT=1 to print the full table (peak, loudness, clipping per song / effect / ambience bed).
test('audio audit: no song, effect, ambience bed or pile-up clips, and everything is audible', async ({ game, page }) => {
  test.setTimeout(240000);
  await game.open();
  const songs = [];
  for (const k of ALL_SONGS) { songs.push([k, 0]); songs.push([k, k.startsWith('boss_') ? 3 : 2]); }
  const rows = await page.evaluate(auditInPage, { songs, sfx: SFX_LIST, amb: [0, 1, 2, 3, 4, 5, 6, 7], stress: [['boss_king', 3], ['3', 2]], songSecs: 8 });
  if (process.env.AUDIO_REPORT) for (const r of rows) console.log(`${r.group.padEnd(9)} ${r.name.padEnd(36)} peak ${String(r.peak).padStart(6)} dB   rms ${String(r.rms).padStart(6)} dB   clipped ${(r.clip * 100).toFixed(3)}%`);
  for (const r of rows) {
    expect(r.peak, `${r.group} ${r.name} peaks above 0 dBFS`).toBeLessThanOrEqual(0);
    expect(r.clip, `${r.group} ${r.name} clips`).toBeLessThan(0.0005);
    if (r.group === 'song') expect(r.rms, `${r.name} is nearly silent`).toBeGreaterThan(-55);
    if (r.group === 'sfx') expect(r.peak, `${r.name} is inaudible`).toBeGreaterThan(-45);
  }
  expect(game.errors).toEqual([]);
});
