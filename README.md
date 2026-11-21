# Olis Dino-Rettung

**An advent calendar game: a new level opens every day from 1 to 24 December 2026.** Each door hides a level (about 2 minutes), a daily cosmetic gift and one dino card. The last door (24 December) holds the boss fight, the golden egg and the Christmas ending.

## Advent calendar
- **Doors:** day N opens on December N (device date, `ADVENT_START` in `game.js`). Missed days stay playable. Before 1 December the calendar shows a countdown.
- **Parent mode:** press and hold the "Adventskalender" title for 1.5 s. Set the day with − / +, open all doors, or go back to the device date. For testing you can also open the game with `?day=12`.
- **Gifts:** the first time a door opens, its gift is added to the shop (11 hats, 6 skins, 4 fire colours, 3 amber bonuses). The shop shows unopened gifts as "Tür N".
- **Themes and skills** (`LEVELS`, `LEVEL_THEMES` and `SKILL_DAYS` in `game.js`):

| Days | Theme | New skill | Boss |
|---|---|---|---|
| 1–3 | Jungle | jump, double jump, roar | |
| 4–6 | Beach | **FLITZ** (dash through walls and waves) | Crab King (6) |
| 7–9 | Canyon | duck | |
| 10–12 | Underwater | **swim** (tap = up, TAUCHEN = down) | Sea monster (12) |
| 13–15 | Ice Age | stomp | |
| 16–18 | Mountains | **glide** (hold the screen in the air) | Eagle queen (18) |
| 19–21 | Volcano | fire chili | |
| 22–24 | Christmas night | everything | Krallenkönig (24) |


A Christmas runner game for Oli: a T-Rex he names himself, Chili the rabbit, Goetti's dino station, 4 worlds plus a bonus Christmas-night world, a boss, an endless run, an amber shop and a Christmas ending. The game text is in German. There's no build step and no external assets: plain HTML, Canvas and synthesised sound.

## Run locally
```bash
python3 -m http.server 8765
```
Then open http://localhost:8765. Controls:
- Tap or Space: jump (tap twice for a double jump; hold in the air to glide from day 16; tap to swim underwater)
- **FLITZ** button or F: dash (from day 4)
- **DUCKEN** button (bottom left) or ↓ / S: hold to duck under low branches, ledges and low-flying pterosaurs. Press it in the air to **STAMPF!** (ground pound): it cracks amber stones and flattens Kompsis.
- **BRÜLL!** button or R: roar (scares raptors and pterosaurs, smashes big boulders; 3 s cooldown, 1 s in the boss fight). Small rocks and icicles need a jump, a stomp or fire. After picking up a **Feuer-Chili** it becomes **FEUER!** for 8 seconds and shoots fireballs.
- Esc: pause

## More to do
- **Laden** (map): a market stall where Goetti sells Rex colours, hats and fire colours. Tap an item to preview it live on Rex, then buy or equip it.
- **Dino-Buch** (map): 15 sticker cards with illustrations; unfound cards show a silhouette, new ones carry a NEU stamp.
- **Endlos-Lauf** (map): a random run in any finished world that gets steadily harder: speed rises, spacing tightens and a new **Stufe** starts every ~26 segments (stage 1 is easy obstacles, stage 2 adds raptors, pterosaurs and Kompsis, stage 3 adds combos, stage 4+ doubles up dangers). Best score per world is saved; a heart comes back every 500 points.
- **Weihnacht** (map node 5): bonus world, unlocked after the Christmas ending.
- Riddle gate: a wrong answer locks the buttons for 2.5 s and costs 1 amber; **Tipp** crosses out one wrong answer before the first guess.

## The boss fight (world 4)
The Krallenkönig has four phases of 3 hits each, then a final duel:
1. **Sturmangriff**: he charges, roar when he is close.
2. **Felsenhagel**: rocks fly in sequences (jump the low ones, duck the high ones); afterwards he is out of breath and walks up - roar him.
3. **Das Rudel**: he calls raptors and Kompsis (jump on the small ones, roar the big ones), then charges himself.
4. **Vulkanwut**: he leaps (watch the red landing marker), a shock wave rolls in (jump) and lava erupts under you (be in the air when it glows).
5. **Brüll-Duell**: tap BRÜLL as fast as you can to push him back.
Each cleared phase drops a heart. If you lose, you restart at the phase you were in. Phases and names are in `BOSS_PHASES` and `updateBoss` in `game.js`.

## Put it on the tablet
1. Host the folder on any static HTTPS host, such as GitHub Pages, Netlify or Cloudflare Pages. The service worker needs HTTPS for offline play.
2. iPad: open it in Safari, then Share → "Zum Home-Bildschirm". Android: in Chrome, open the menu (⋮) and choose "App installieren".
3. It then runs fullscreen in landscape and works offline. Progress is saved on the device (`localStorage`).

## Files
- `game.js`: all of the game, in sections for data, drawing, levels, play, dialog, map, book, ending and input
- `index.html`: the canvas and the name-entry box
- `manifest.webmanifest`, `sw.js`, `icon*`: the installable PWA

## Easy tweaks (all in `game.js`)
- **Story and dialog text:** search for `startStory`, `startEnding` and `afterBabyName`
- **Riddles and start tips:** `WORLDS[i].riddles` (10 per world; each is asked once before any repeats, tracked in the save) and `startTip`
- **New skills per world:** world 1 teaches jump, double jump and roar; world 2 adds DUCKEN; world 3 adds STAMPF (Kompsis, amber stones); world 4 adds the Feuer-Chili
- **Dino fact cards:** `FACTS`
- **New obstacle combos:** `pitRock`, `lowRock`, `compyRun` in `buildLevel`; shop items in `SKINS`, `HATS`, `FIRES`
- **Difficulty:** `speed` and `segs` (level length) in `WORLDS`, and the pit widths in the `pit` pattern
- **Looks:** Oli's colours are in `drawOli` (red jacket, brown hair), Chili's in `drawChili`, Goetti's in `drawGoetti` / `drawGoettiHead`
- **Reset progress:** run `localStorage.removeItem('olisDinoRettung.v1')` in the browser console
- **Character sheets (dev):** in the browser console run `__dino.sheet('rex')`, `__dino.sheet('hero')` or `__dino.sheet('cast')` (or `'react'` for Chili's moods and the pterosaur flap, `'faces'` for Oli's hats and the professor) to see every character large.
- **Testing hook:** `window.__dino` exposes `startLevel(i)`, `startEnding()` and the save data

## Tests
Needs Node. One-time setup: `npm install && npx playwright install chromium`.
- `npm run check`: syntax check of `game.js` and `sw.js`
- `npm test`: headless browser tests in `tests/`: an autoplayer that completes all 24 levels, bots for all four boss fights, the calendar and date logic with a mocked clock, gifts, shop, riddles, endless run and save migration. It starts its own server on port 8790.
