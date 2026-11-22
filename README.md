# Oli & Fabios Dino-Abenteuer

A Christmas **advent calendar game** for the brothers Oli and Fabio: a runner where both ride a T-Rex they name themselves (Oli steers, Fabio sits in front and roars), with Chili the rabbit and Goetti's dino station, to save dinosaurs. **A new level opens every day from 1 to 24 December 2026.** Each door hides a level (about 2 minutes), a daily cosmetic gift and a Dino-Buch card. Missed days stay playable. The last door holds the Krallenkönig boss fight, the golden egg and the Christmas ending.

The game text is in German. There is no build step and no external assets: plain HTML, Canvas 2D and synthesised sound.

Developers: see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). AI coding agents: see [CLAUDE.md](CLAUDE.md).

## Run locally
```bash
npm run serve        # python3 -m http.server 8765  ->  http://localhost:8765
```
Add `?day=12` to the URL to pretend it is 12 December (see "Testing the calendar").

### Controls
- **Tap / Space:** jump (twice for a double jump). Hold in the air to glide (from day 16). Tap to swim up underwater.
- **FLITZ / F:** dash through walls, waves and enemies (from day 4).
- **DUCKEN / ↓ / S:** hold to duck under low branches and flyers (from day 7). In the air it becomes **STAMPF** (ground pound, from day 13).
- **BRÜLL / R:** roar. Scares raptors, flyers and hoppers, smashes big boulders. 3 s cooldown (1 s in boss fights). With a Feuer-Chili it becomes **FEUER!** for 8 s.
- **Esc:** pause.

## The calendar
| Days | Theme | New skill | Boss |
|---|---|---|---|
| 1–3 | Jungle | jump, double jump, roar | |
| 4–6 | Beach | **FLITZ** (dash) | Crab King (6) |
| 7–9 | Canyon | duck | |
| 10–12 | Underwater | **swim** (tap = up, TAUCHEN = down) | Sea monster (12) |
| 13–15 | Ice Age | stomp | |
| 16–18 | Mountains | **glide** | Eagle queen (18) |
| 19–21 | Volcano | fire chili | |
| 22–24 | Christmas night | everything | Krallenkönig (24) |

- **Doors:** day N opens on December N (device date). Before 1 December the calendar shows a countdown.
- **Gifts:** the first time a door opens, its gift joins the shop (11 hats, 6 skins, 4 fire colours, 3 amber bonuses).
- **Difficulty:** the first level of each theme is the easiest, the third the hardest; levels start at medium tier and get denser through the level.
- **Enemies and hazards:** raptors, pterosaurs, Kompsis, hopper frogs, spitting plants, meteors, bounce mushrooms, crumbling steps, walls, waves, icicles, geysers, jellyfish and more. Each is introduced with a hint.
- **Bosses:** every boss has several phases. Each cleared phase drops a heart; a lost fight restarts at the phase you were in. The Krallenkönig ends with a roar duel.

### Testing the calendar
- **Parent mode:** press and hold the "Adventskalender" title for 1.5 s. Set the day with − / +, open all doors, or go back to the device date.
- **`?day=N`** in the URL sets the day without touching the save.
- **Browser console:** `__dino.startLevel(i)` starts level `i` (0 to 23).

## More to do in the game
- **Goettis Laden** (shop): Rex colours, fire colours, hats and jackets (each boy wears his own), accessories for Chili, and Goetti's vouchers for real outings (Velotour, Fischen, Dino-Museum). Tap an item to preview it live. Door gifts appear here too, marked "Geschenk".
- **Dino-Buch:** 15 sticker cards. Unfound ones are silhouettes.
- **Endlos-Lauf:** a random run in any finished theme that gets steadily harder (a new **Stufe** every ~26 segments). Best score per theme is saved.
- **Riddle gate** at the end of every level: a wrong answer costs 1 amber; **Tipp** crosses out one wrong answer.

## Put it on the tablet
1. Host the folder on any static HTTPS host (GitHub Pages, Netlify, Cloudflare Pages). The service worker needs HTTPS for offline play.
2. iPad: Safari → Share → "Zum Home-Bildschirm". Android: Chrome ⋮ → "App installieren".
3. It runs fullscreen in landscape and works offline. Progress is saved on the device (`localStorage`).

After every release, bump the cache name in `sw.js` (`olis-dino-vN`), otherwise installed copies keep the old game.

## Tests
One-time setup: `npm install && npx playwright install chromium`.
- `npm run check`: syntax check of `game.js` and `sw.js`.
- `npm test`: headless browser tests (about 30 s). Includes an autoplayer that completes all 24 levels, bots for the four boss fights, calendar logic with a mocked clock, gifts, shop, riddles, endless run, save migration and the music engine.

## Files
- `game.js`: the whole game (see the section map in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md))
- `index.html`: canvas and name-entry box
- `sw.js`, `manifest.webmanifest`, `icon*`: the installable PWA
- `tests/`: Playwright tests and helpers
- `docs/ARCHITECTURE.md`, `CLAUDE.md`: developer and agent documentation

## Quick tweaks
- **Story and dialog text:** search for `startStory`, `startEnding`, `afterBabyName`.
- **Riddles:** `WORLDS[i].riddles` (10 per theme, each asked once before repeats).
- **Dino cards:** `FACTS`. **Shop items:** `SKINS`, `HATS`, `FIRES`. **Gifts:** the `gift: <day>` field on those items.
- **Start date:** `ADVENT_START` in `game.js`.
- **Reset progress:** run `localStorage.removeItem('olisDinoRettung.v1')` in the browser console.
- **Character sheets:** `__dino.sheet('rex' | 'hero' | 'cast' | 'react' | 'faces')` shows every character large.
