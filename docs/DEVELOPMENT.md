# Development guide

For people who want to run, test or change the game. How the code is laid out is in [ARCHITECTURE.md](ARCHITECTURE.md); how releases work is in [MAINTENANCE.md](MAINTENANCE.md).

## Principles
- **No build step, no bundler, no runtime dependencies, no external assets.** The game is `index.html` + `js/*.js` (classic scripts sharing one global scope, see ARCHITECTURE.md) + a service worker. Art is vector drawing on a canvas, sound is synthesised with Web Audio.
- **Player-facing text is German**, short and kid-friendly, Swiss spelling (`ss`, no `ß`). Code, comments, docs and commit messages are English.
- **Deterministic levels:** a level is generated from a seed, so a level is the same every time.
- **Never break saves** (see [Save compatibility](#save-compatibility)).

## Setup
Requirements: Node.js 20+ (tests only), Python 3 (static server), a Chromium that Playwright installs.

```bash
npm install
npx playwright install chromium     # once
npm run serve                       # http://localhost:8765
```
Open `http://localhost:8765/?day=12` to pretend it is 12 December without touching the save.

## Commands
| Command | What it does |
|---|---|
| `npm run serve` | Static server on port 8765 for manual play |
| `npm run check` | Syntax check of `js/*.js`, `sw.js` and scripts |
| `npm test` | Playwright suite (about 30 s). Starts its own server on port 8790 |
| `npm run screenshots` | Regenerates `docs/screenshots/*.png` for the README |

Run `check` and `test` before every commit. CI runs the same two commands on every push and pull request.

## Project layout
```
index.html               canvas, name-entry box, PWA and social meta tags
js/*.js                  the game, split by section (load order in index.html)
sw.js                    service worker: cache first, one atomic snapshot per release
manifest.webmanifest     installable-app metadata
icon-*.png              app icons (incl. maskable);  og-image.png = link preview image
tests/                   Playwright specs and helpers
scripts/screenshots.js   README screenshot generator
docs/                    architecture, development and maintenance docs, screenshots
.github/workflows/       CI and GitHub Pages deployment
```

## Debugging tools
- **`?day=N`** in the URL sets the calendar day (save untouched). Debug aids (`?day=`, `window.__dino`) only work on localhost or `file:` (`DEBUG` in `js/core.js`), not on the published site.
- **Parent mode:** hold the "Adventskalender" title for 1.5 s: set the day, open all doors, clear the high-score list, wipe everything (`wipeEverything`: removes all `olisDinoRettung*` keys and reloads, like a new install).
- **`window.__dino`** in the browser console exposes the internals: `startLevel(i)` (0 to 23), `go('shop')`, `save`, `G` (current play state), `sheet('rex' | 'hero' | 'cast' | 'react' | 'faces' | 'wounds')` for character sheets.
- **Reset progress:** `localStorage.removeItem('olisDinoRettung.v1')`.
- **Hold a frame still** for screenshots: set `G.freeze = 9`.

## Testing
Tests live in `tests/` and run in headless Chromium with service workers blocked.
- `game.spec.js`: scenes, shop, riddles, endless run, save migration, music engine.
- `levels.spec.js`: an autoplayer (`PLAY`) that must finish **every** level, plus bots for the four bosses.
- `calendar.spec.js`: door logic with a mocked clock.
- Use `game.open(saveOverrides)` from `tests/helpers.js` to start with a given save; set `G.startT = 0` and clear `G.coach` to skip intro and tutorial freezes.
- If the autoplayer fails with `done:false, steps:60000`, it is stuck: step it in small chunks and print position, nearby pits, platforms and obstacles. A new obstacle type usually needs a rule in the bot.

## Conventions
- Logical canvas 960×540, ground at `GROUND = 440`. Use `G.p.wx` for the player's world x; screen x = world x − `cam`.
- In `buildLevel` use the seeded `R()`, never `Math.random()`. Runtime effects may use `Math.random()`.
- **New obstacle type:** add it in three places (the `switch (o.type)` in `updatePlay`, `drawObstacle`, and the interactions `roar`, the fireball loop, `dashBreak`), then add a pattern to `P` in `buildLevel`, list it in `WORLDS[...].patterns`, classify it in `HARD`/`COMBO` if needed, and teach the bot.
- State a respawn can break (crumbling platforms, fallen meteors) must be reset in `retry()` and `pitFall()`.
- **Hints and tutorials** must come early (`firstTip` uses `x - 1200`) and must never mention a skill the player has not learned yet (`SKILL_DAYS`: dash 4, duck 7, swim 10, stomp 13, glide 16, fire 19).
- **Names in story text:** use `{oli}`, `{fabio}`, `{rex}`, `{baby}`, never hard-coded names.
- Do not draw over the top-centre HUD (eggs, progress bar, boss bar). Hint boxes go at the bottom, at most 3 lines.
- The remaining design rules (boss fights, shop tabs, story, milestones) are collected in [CLAUDE.md](../CLAUDE.md).

## Save compatibility
The save lives in `localStorage['olisDinoRettung.v1']`. The key keeps its old name on purpose: renaming it would wipe every player's progress.
- Never rename or remove save fields. Add new ones with defaults in `buildSave` in `js/core.js`; the save is merged over the defaults at load.
- Field reference: [ARCHITECTURE.md](ARCHITECTURE.md#save-format).

## Making a change
1. Branch from `main`, make the change, add or adjust tests.
2. `npm run check && npm test`.
3. If the look changed, run `npm run screenshots` and commit the updated images.
4. Open a pull request. CI must be green; merging to `main` deploys the game (see [MAINTENANCE.md](MAINTENANCE.md)).
