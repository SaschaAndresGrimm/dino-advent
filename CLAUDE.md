# CLAUDE.md

Oli & Fabios Dino-Advent (repo `dino-advent`): a German-language canvas runner, built as an advent calendar (24 daily levels from 1 Dec 2026) for two brothers, Oli (10) and Fabio (4). Both are heroes: Oli steers Rex, Fabio rides in front of him and is the "Brüll-Chef" (roar). Single file `game.js`, no build, no dependencies at runtime. Read `docs/ARCHITECTURE.md` before larger changes; `docs/DEVELOPMENT.md` and `docs/MAINTENANCE.md` cover workflow and releases.

## Commands
```bash
npm run check     # node --check game.js sw.js
npm test          # Playwright, about 30 s, starts its own server on port 8790
npm run serve     # manual play on http://localhost:8765 (add ?day=12 to open day 12)
npm run screenshots  # regenerate docs/screenshots after visual changes
```
Run both check and test before every commit. Playwright needs `npx playwright install chromium` once.

## Rules of this project
- **Language:** all text the player sees is German, short and kid-friendly. Code, comments, docs and commits are English.
- **No build step, no external assets, no new runtime dependencies.** Art is vector drawing in canvas; sound is synthesised.
- **Release:** merging to `main` deploys via GitHub Actions (tests first). The deploy job stamps the service-worker cache name (`dino-advent-dev` in `sw.js`) with the commit; never hand-edit it and keep the literal `dino-advent-dev` so the stamping works. New shipped files must be added to the copy step in `.github/workflows/ci.yml`.
- **Commits:** end the message with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Commit and push only when the user asks. Remote: `origin` (GitHub, branch `main`).
- **Save compatibility:** never rename or remove fields of the save (`olisDinoRettung.v1`). Add new ones with defaults near the top of `game.js`.

## Conventions
- Logical size 960×540; ground at `GROUND = 440`. Use `G.p.wx` for the world x of the player; screen x = world x − `cam`.
- Level generation is seeded and deterministic per level. Do not use `Math.random()` inside `buildLevel` (use `R()`); effects at runtime may use `Math.random()`.
- A new obstacle type needs three places: the `switch (o.type)` in `updatePlay`, `drawObstacle`, and the interactions (`roar`, fireball loop, `dashBreak`). Then add a pattern in `buildLevel`'s `P`, put it in the `WORLDS[...].patterns` lists, classify it in `HARD`/`COMBO` if needed, and teach the bot.
- Anything with state that a respawn can break (crumbling platforms, fallen meteors) must be reset in `retry()` and `pitFall()`.
- Hints must come early: `firstTip` uses `x - 1200`; tutorial coach points are 150 to 300 px before the obstacle. Hints and coach must never mention a skill the player has not learned yet (`SKILL_DAYS`: dash 4, duck 7, swim 10, stomp 13, glide 16, fire 19).
- Boss fights: Rex stands still (FLITZ lunges him forward and back). Collectibles must come to him (they drift and hearts are magnetic). The boss must walk back to `home` between phases. Enemy waves need wide spacing (200+ px) so a jump fits between them.
- Sound: every new SFX goes in the `SFX` table (synthesised). Screens decide the music in `musicKey()`/`musicOpts()`/`musicLevel()`; the finale uses `SONGS.ending`. Overlays never cut the song: use `vol` in `musicOpts()` (the song fades, 0 stops it after the fade).
- Sound checks: after any sound change run `AUDIO_REPORT=1 npx playwright test tests/audio.spec.js` for peak/loudness per song, effect and ambience bed (offline render of the real synthesis). New songs go in `ALL_SONGS`, new effects in `SFX_LIST` (`tests/audioRender.js`). Dialogue lines are read aloud by `speakLine` (setting `save.voice`).
- Boss music: every boss kind needs a `SONGS['boss_' + kind]` entry (same `root` as its world, `epic: true`, own `seed`); without one the world song just keeps playing. Notes with `bus === 'music'` go through `musicIn`; the fanfare and riser use `bus = 'fanfare'` so the fade does not mute them.
- Do not draw over the HUD area at the top centre (eggs, progress bar, boss bar). Hint boxes go at the bottom (max 3 lines, they must stay below the ground line); boss banners sit at y=134 (compact, 2 s), boss toasts at y=78 (one at a time; minor ones are filtered by BOSS_QUIET). Keep Chili at 145 px behind Rex so the two silhouettes do not merge.

- **Kid-friendliness helpers:** `chiliSay(text, force)` shows a rate-limited speech bubble from Chili; `cheer()` celebrates the first successful use of a taught move; the third retry at the same checkpoint sets `G.shield` (absorbs one hit, `hurt()` checks it). `save.newGifts` (`"key:index"`) drives the NEU badges on the map and in the shop and is cleared when the shop closes.
- **Bestenliste:** local per-device top 10 per theme in `save.board[wi]` (`{n, s, t}`), `boardAdd`/`boardQualifies`, scene `'board'`. Names go through `cleanNick` (profanity, leetspeak, e-mail/URL/number checks); add words to `BAD_WORDS`. Parent mode can clear the board. No network: an online backend would need a new design decision (privacy of children's names).

- **Story:** the Krallenkönig stole the dino family's golden egg; the bosses of days 6, 12 and 18 each hold a piece of his map. `DAY_STORY[day]` is a short Goetti dialog played once before a level (via `launchLevel`, tracked in `save.storySeen`), `DAY_AFTER` plays on the map after the first boss win (`save.afterNew`), `TEASERS` replace the results-screen line on days 5, 11, 17 and 23. Use `{oli}`, `{fabio}` (both asked in the intro, defaults Oli/Fabio; `save.fabioName`), `{rex}` and `{baby}` in texts, never a hard-coded name. Story lines speak to both boys ("ihr zwei"); gameplay hints stay singular (they address whoever holds the tablet). `who: 'fabio'` is the boy Fabio (portrait = his face); the dino family is only Mamasaurus and Papasaurus. Both boys are drawn by `drawOli` (`o.kid: 'fabio'` switches the outfit); Fabio is drawn through the `front` hook so Oli's rein arm wraps round him. Keep every new story line German, short and Swiss-spelled (ss, no ß).

- **Settings and daily run:** `save.volMusic`/`save.volSfx` (0-5, 4 = normal) scale `tone()`/`noise()` through `bus` (`musicTick` sets `bus = 'music'`); `save.calm` disables screen shake and the red hit flash. Tages-Lauf = an endless run seeded by `dayKey()` (`startDaily`), world chosen by `dailyWorld()`, +20 amber and a streak once per day, daily board is `save.board[8]` and resets each day. The iPad install hint shows once on the map (`save.installHint`).

- **Collection milestones:** all 72 medals (`medalTotal()`) set `save.master`, grant and equip the shop items with `gift: 25` (Dino-Meister skin, Meister-Krone) and start a map celebration (`mapFW`, dialog). A world's doors get a gold frame when `worldMedalsDone(wi)`. The 4th treasure triggers `chestParty()`; a full chest can be tapped to replay it. `gift: 25` in `SKINS`/`HATS` means "earned with 72 medals", never granted by a door.

- **Shop tabs (`SHOP_TABS`):** Rex, Feuer, Hüte, Jacken, Chili, Goetti. Each tab has an owned key and a list of equip slots: hats and jackets have one slot per boy (`hat`/`fabioHat`, `jacket`/`fabioJacket`, "Oli anziehen" / "Fabio anziehen"), Chili one (`chili`, drawn by `drawChiliAcc`), vouchers none. `JACKETS` index 0/1 are the boys' free default jackets. `WISHES` are real-life vouchers from Goetti (shared, bought once, shown by `drawVoucher`); change their texts or prices there. Door gifts show "Geschenk", never "Gekauft". A hat door gift equips on both boys.
- **Shop, Steckbrief, Schatzkarte:** the shop scene lives in `shopScene()`/`shopCounter()` and the 100 px item cards in `drawShop` (status pills: owned, Tür N, price). The Dino-Buch detail view reads `STECK[i]` (era, diet, size in metres; `m: 0` shows a text instead of the ruler) - add an entry whenever a card is added. `drawTMap` shows the three torn map pieces (days 6, 12, 18 via `tmHave`); after a boss follow-up dialog `tmapNew` triggers the reveal animation.

## Testing pitfalls
- `tests/levels.spec.js` has a bot (`PLAY`) that must be able to finish every level. New obstacles usually need a rule there. If it fails with `done:false, steps:60000` the bot is stuck: step it in small chunks and print position, nearby pits/platforms/obstacles.
- Tests run with service workers blocked and a fake clock only where they say so (`calendar.spec.js`).
- Use `game.open(saveOverrides)` from `tests/helpers.js`; set `G.startT = 0` and clear `G.coach` to skip intro and tutorial freezes.
- Screenshots for visual checks: `page.screenshot` in a temporary spec; set `G.freeze = 9` to hold a frame still. Delete temporary specs afterwards.
