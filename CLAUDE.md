# CLAUDE.md

Olis Dino-Rettung: a German-language canvas runner, built as an advent calendar (24 daily levels from 1 Dec 2026) for a 10-year-old. Single file `game.js`, no build, no dependencies at runtime. Read `docs/ARCHITECTURE.md` before larger changes.

## Commands
```bash
npm run check     # node --check game.js sw.js
npm test          # Playwright, about 30 s, starts its own server on port 8790
npm run serve     # manual play on http://localhost:8765 (add ?day=12 to open day 12)
```
Run both check and test before every commit. Playwright needs `npx playwright install chromium` once.

## Rules of this project
- **Language:** all text the player sees is German, short and kid-friendly. Code, comments, docs and commits are English.
- **No build step, no external assets, no new runtime dependencies.** Art is vector drawing in canvas; sound is synthesised.
- **Release:** bump the cache name in `sw.js` (`olis-dino-vN`) whenever shipped files change, or installed copies keep the old game.
- **Commits:** end the message with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Commit and push only when the user asks. Remote: `origin` (GitHub, branch `main`).
- **Save compatibility:** never rename or remove fields of the save (`olisDinoRettung.v1`). Add new ones with defaults near the top of `game.js`.

## Conventions
- Logical size 960×540; ground at `GROUND = 440`. Use `G.p.wx` for the world x of the player; screen x = world x − `cam`.
- Level generation is seeded and deterministic per level. Do not use `Math.random()` inside `buildLevel` (use `R()`); effects at runtime may use `Math.random()`.
- A new obstacle type needs three places: the `switch (o.type)` in `updatePlay`, `drawObstacle`, and the interactions (`roar`, fireball loop, `dashBreak`). Then add a pattern in `buildLevel`'s `P`, put it in the `WORLDS[...].patterns` lists, classify it in `HARD`/`COMBO` if needed, and teach the bot.
- Anything with state that a respawn can break (crumbling platforms, fallen meteors) must be reset in `retry()` and `pitFall()`.
- Hints must come early: `firstTip` uses `x - 1200`; tutorial coach points are 150 to 300 px before the obstacle. Hints and coach must never mention a skill the player has not learned yet (`SKILL_DAYS`: dash 4, duck 7, swim 10, stomp 13, glide 16, fire 19).
- Boss fights: Rex stands still (FLITZ lunges him forward and back). Collectibles must come to him (they drift and hearts are magnetic). The boss must walk back to `home` between phases. Enemy waves need wide spacing (200+ px) so a jump fits between them.
- Do not draw over the HUD area at the top centre (eggs, progress bar, boss bar). Hint boxes go at the bottom (max 3 lines, they must stay below the ground line); boss banners sit at y=128, boss toasts at y=300. Keep Chili at 145 px behind Rex so the two silhouettes do not merge.

- **Kid-friendliness helpers:** `chiliSay(text, force)` shows a rate-limited speech bubble from Chili; `cheer()` celebrates the first successful use of a taught move; the third retry at the same checkpoint sets `G.shield` (absorbs one hit, `hurt()` checks it). `save.newGifts` (`"key:index"`) drives the NEU badges on the map and in the shop and is cleared when the shop closes.
- **Bestenliste:** local per-device top 10 per theme in `save.board[wi]` (`{n, s, t}`), `boardAdd`/`boardQualifies`, scene `'board'`. Names go through `cleanNick` (profanity, leetspeak, e-mail/URL/number checks); add words to `BAD_WORDS`. Parent mode can clear the board. No network: an online backend would need a new design decision (privacy of children's names).

## Testing pitfalls
- `tests/levels.spec.js` has a bot (`PLAY`) that must be able to finish every level. New obstacles usually need a rule there. If it fails with `done:false, steps:60000` the bot is stuck: step it in small chunks and print position, nearby pits/platforms/obstacles.
- Tests run with service workers blocked and a fake clock only where they say so (`calendar.spec.js`).
- Use `game.open(saveOverrides)` from `tests/helpers.js`; set `G.startT = 0` and clear `G.coach` to skip intro and tutorial freezes.
- Screenshots for visual checks: `page.screenshot` in a temporary spec; set `G.freeze = 9` to hold a frame still. Delete temporary specs afterwards.
