# Architecture

Overview of the game code in `js/`. For setup, tests and conventions see [DEVELOPMENT.md](DEVELOPMENT.md); for releases see [MAINTENANCE.md](MAINTENANCE.md).

The game is plain JavaScript in `js/*.js`, loaded by `index.html` (no modules, no build). Search for the section comments (`// ====` banners) to navigate; line numbers drift, use the names.

## Files and sections
| File (load order) | Sections |
|---|---|
| `js/core.js` | Setup (constants, canvas), save game (`buildSave`, `writeSave`, backup codes) |
| `js/audio.js` | Sound: `SFX`, song engine, audio graph, ambience |
| `js/helpers.js` | `clamp`, `rr`, `circle`, `ell`, `hash`, `rng`, UI kit (`woodFrame`, `panel`, `button`, `ico`) |
| `js/data.js` | `WORLDS`, `FACTS`, `SKINS`/`HATS`/`FIRES`, story texts, advent calendar (`ADVENT_START`, `adventDay()`, `LEVELS`, gifts) |
| `js/characters.js` | Rex, Oli and Fabio, Chili, Götti, raptors, compys, crab king… plus the dev character sheet |
| `js/scenery.js` | `GFX[]` palettes, `drawBackground`, `drawGround`, platforms, per-theme art (`ART(wi)`), outline/glow/low-power helpers |
| `js/levelgen.js` | `buildLevel(wi, endless, LV)` |
| `js/play.js` | `startLevel`, `updatePlay`, `hurt`, `pitFall`, `retry`, obstacles, boss engine (`BOSS_KINDS`, `updateBoss`), riddle gate, results |
| `js/bossart.js` | Drawing of the later bosses and their battle damage |
| `js/playdraw.js` | `drawObstacle`, `drawPlay` and the HUD |
| `js/screens.js` | Dialogs, name entry, splash, title, intro story, treasure chest |
| `js/menus.js` | Calendar doors, settings, parent mode, Bestenliste, daily run |
| `js/mapshop.js` | Schatzkarte, calendar map (`drawMap`), shop |
| `js/book.js` | Dino-Buch: card art, Steckbrief, size lineup |
| `js/ending.js` | `startEnding` cutscene |
| `js/candles.js` | Advent candle ceremony (scene `'candles'`), `drawWreath` |
| `js/quiz.js` | Götti-Quiz (scene `'quiz'`): picker, five-riddle round, result screen; plays the riddle pools through `drawRiddleTablet` |
| `js/main.js` | Input, main loop `frame(now)`, `window.__dino` test hook |

The files are classic scripts (no modules, no IIFE) that share one global scope; `index.html` loads them in the order above, and top-level code runs in that order. A new file must be added to `index.html`, to `FILES` in `sw.js` and (if outside `js/`) to the copy step in `ci.yml`; `tests/files.spec.js` checks this and also that no top-level name overwrites a browser built-in (`open`, `stop`, `print`, ...).

Section notes (what the pieces do):

| Section | What lives there |
|---|---|
| Setup | Constants (`W=960`, `H=540`, `GROUND=440`, `GRAV=2300`), canvas scaling (`resize`) |
| Save game | `save` object, `SAVE_KEY`, migrations, `writeSave()` |
| Sound | `SFX` (synthesised with Web Audio), `tone()`, `noise()` |
| Background music | Song engine: `SONGS`, `buildSong(key)`, `musicTick(key, level)`, `musicKey()` picks the song. Boss fights play `boss_<kind>` (epic layer, level 3 in the last round); world → boss runs a one-bar drum-roll transition through the `musicIn` gain node, boss → world plays a fanfare and fades the world song back in |
| Audio graph | `musicIn` (songs) and `fxIn` (SFX, fanfares) feed a shared generated reverb; `panAt(wx, fn)` pans a sound to its screen position; `musicOpts()` gives the song a fade target (pause/results duck, death fades out), a key lift before the gate and a one-heart heartbeat; `keyRun` plays pickups in the song's key |
| Audio mix and extras | Master chain: compressor + soft clipper (nothing exceeds full scale). `duck()` dips the music under big effects. `tone()` takes envelope/chorus/filter/vibrato options, drums are `kick`/`snare`/`hat`. `AMB` + `ambTick` = per-world ambience bed. `tests/audio.spec.js` renders everything offline and fails on clipping or silence |
| Helpers | `clamp`, `rr` (rounded rect), `circle`, `ell`, `hash`, `rng`, UI kit (`woodFrame`, `panel`, `button`, `ico`) |
| Game data | `WORLDS` (per-theme data: speed, obstacle patterns, riddles, colours), `FACTS` (dino cards), `SKINS`/`HATS`/`FIRES` |
| Advent calendar | `ADVENT_START`, `adventDay()`, `LEVEL_THEMES`, `LEVEL_TITLES`, `BOSS_DAYS`, `LEVELS`, `SKILL_DAYS`, `skillsFor`, gifts |
| Character drawing | Rex, Oli and Fabio (`drawOli`, `o.kid`), Chili, Götti, professor, raptors, compys, crab king… plus the dev character sheet |
| Scenery | `GFX[]` palettes, `drawBackground`, `drawGround`, platforms, per-theme art (`ART(wi)`) |
| Level generation | `buildLevel(wi, endless, LV)` |
| Play state | `startLevel`, `updatePlay`, `drawPlay`, `hurt`, `pitFall`, `retry`, obstacles, boss engine (`BOSS_KINDS`, `updateBoss`), riddle gate, results |
| Dialog & name entry | Dialog boxes, the HTML name input |
| Title, story, map, book | Title, intro story, calendar map (`drawMap`), Dino-Buch, shop, parent mode |
| Christmas ending | `startEnding` cutscene |
| Input | Pointer, keyboard, button hit-testing |
| Main loop | `frame(now)`: fixed 1/60 s sub-steps, then draw |

## Three indexes (easy to confuse)
- **Level index `li`** (0 to 23): the calendar day minus one. `LEVELS[li]` holds `day`, `wi`, `sub` (0 to 2 within a theme), `boss`, `treasure`, `segs`, `speedMul`, `maxTier`.
- **Theme index `wi`**: which entry of `WORLDS` the level uses: 0 jungle, 1 canyon, 2 ice, 3 volcano, 4 Christmas night, 5 beach, 6 underwater, 7 mountains. `LEVEL_THEMES` maps level to theme.
- **Art set `ART(wi)`**: which look to draw. Usually equal to `wi`; `WORLDS[wi].art` overrides it (the Christmas world reuses ice art 2).
- `startLevel(arg, endless)`: `arg` is a level index, or a theme index when `endless` is true.

## Frame loop
`frame(now)` advances time in fixed 1/60 s steps (`DT`, global time `T`), calls the scene's update and then `draw*`. The current scene is `scene` (`'title' | 'story' | 'map' | 'play' | 'shop' | 'book' | 'ending' | 'candles' | 'sheet'`); `go(scene)` switches with a fade. Buttons are re-registered in `buttons[]` every frame by `button(...)` during drawing; input hit-tests that list.

## Playing a level
1. `startLevel` calls `buildLevel`, which returns `L` (the level) and creates the play state `G`.
2. `updatePlay(dt)`: world scrolls with `p.wx`; physics; collisions with `L.obs`, `L.pits`, `L.plats`; pickups (`L.amb` amber, `L.hearts`, `L.eggs`, `L.peppers`); tips and coach; boss; gate.
3. The player is `G.p` (`wx` world x, `y` feet, `vy`, `onGround`, `jumps`, `inv` invulnerability, `dashT`, …). Skills in `G.sk` come from `skillsFor`.
4. **Hits:** `hurt()`; falling into a pit: `pitFall()` (respawns 480 px back with a pause); out of hearts: the retry overlay, `retry()` goes back to the last checkpoint `G.cp`.
5. **End:** at `L.gateX` the riddle gate opens, Rex walks in, `finishLevel()` saves progress and shows the results.

### Level generation (`buildLevel`)
- Seeded RNG per level, so a level is the same every time (endless runs use a random seed).
- A hand-made tutorial opens days 1, 4, 7, 10, 13, 16 and 19 (first level of a theme introduces the skill).
- Then `LV.segs` segments are laid out left to right. Each segment is a **pattern**: an entry of `P` (`rock`, `pit`, `raptor`, `hopper`, `crumble`, `meteors`, `wall`, `jellies`…) that pushes obstacles/platforms/amber into `L` and returns its width.
- `th.patterns` lists which patterns a theme uses (duplicates raise the odds). `NEEDS` hides patterns whose skill is not yet learned. `HARD`/`COMBO` plus the **tier** (`LV.maxTier`, rising with progress) decide how hard the pool is.
- Eggs, treasure, hearts, checkpoints and the stampede/lava-river specials are placed at fixed segment fractions.
- **Treasures** (days 3, 9, 15, 21) sit at 45% of the level, hidden: `L.secret = {kind: 'tree'|'rock'|'ice'|'ash', x, state: 'idle'|'open'}` plus `L.treasure` (`shown` false until found). `openSecret` reveals it and flies it to where Rex can grab it. Triggers: `roar()` (tree), the `o.dead` check in `updatePlay` (cracked rock: dash/fire/stomp), `stompLand` (ice), the fireball loop (ash). `secretCue` plays the proximity sound, `drawSecret` draws the hiding places.
- `firstTip(type, x, text)` adds the first-time hint for an enemy. Hints must appear early (about 1200 px before the obstacle).

### Obstacles
Each obstacle is `{ type, x, … }` in `L.obs`. Three places must know a type:
1. `updatePlay`, `switch (o.type)`: movement, state and hitbox `hb`.
2. `drawObstacle`: how it looks.
3. Interactions: `roar()` (what scares or smashes it), the fireball loop, `dashBreak()` (overhangs in `CEILING_HAZARDS` are only passed under by fire and dash, never destroyed).
Enemies that walk toward the player only move when `o.x - p.wx < ~760` (or `o.minion` in boss fights).

### Bosses
`BOSS_KINDS` (king, crab, kraken, queen) lists phases with a type (`charge`, `volley`, `summon`, `lane`, `leap`, `quake`) and a minion list. `updateBoss` is a state machine (`enter`, `taunt`, the phase state, `tired`, `back`, `stagger`, `flee`/`duel`). The player stands still (`G.stopped`) during a boss fight, so anything meant to be collected must come to Rex (pickups drift toward `p.wx` in `updatePlay`). Retry restarts at the phase in `G.bossCp`. Battle damage: `bossDmg(b)` (0 to 1) is passed as `o.dmg` to each boss draw function, which calls `drawWounds(kind, dmg)`; `WOUNDS[kind]` lists `[threshold, type, ...args]` (plasters, bandages, patches, shiners, cracks, sweat). View all stages with `__dino.sheet('wounds')`.

## Save format
`localStorage['olisDinoRettung.v1']`, JSON, merged over defaults at load (add new fields with defaults near the top of the file; never rename old ones).

| Field | Meaning |
|---|---|
| `rexName`, `babyName`, `oliName`, `fabioName` | Names the boys chose |
| `amber` | Currency |
| `lvDone[24]`, `lvE[24][3]`, `lvM[24][3]` | Per level: finished, eggs, medals |
| `gifts[]` | Days whose gift was opened |
| `dayOverride` | Parent-mode day (null = device date) |
| `owned`, `equip` | `{skin, hat, fire}` indexes into `SKINS`/`HATS`/`FIRES` |
| `learned` | Skills whose tutorial coach was completed |
| `riddleSeen[8]`, `best[8]` | Riddle rotation per theme, endless best score per theme |
| `quizSeen[8]`, `quizBest[9]`, `quizDay`, `quizAmber` | Götti-Quiz: riddle rotation per theme, best right-first-time count (0-5) per theme (9 = mixed round), amber the quiz paid on day `quizDay` (daily cap) |
| `candles` | Advent candles lit so far (0 to 4) |
| `treasures[4]`, `finished`, `tutorialDone`, `muted` | Misc progress |
| `tTries[4]` | Per treasure: finished runs without finding it (1 = tip text, 2 = brighter glint) |
Old 4-world saves keep names, amber and shop items but start the calendar fresh.

`buildSave(raw)` builds the save: defaults, stored fields, migrations. A stored field whose type does not match `SAVE_TYPES` is dropped (so it falls back to its default); add every new field there. An unreadable save is copied to `olisDinoRettung.v1.broken` before it is overwritten. `writeSave()` counts failures (`saveFail`) and toasts a warning. Parent mode can copy the save as a `DINO1.` text code and paste it back (`saveToCode`/`codeToSave`).

`frame()` requests the next frame first and runs `frameBody()` in a try/catch (`frameFailed`): a failed frame is dropped, three failures within 3 s send the player to the map, then the title, then reload the page (twice per session at most).

## Rendering notes
- Logical canvas 960×540, scaled to the window. Draw in logical coordinates.
- Backgrounds are layered parallax with cached layers; `drawGround` draws pits too.
- Characters use `o*` wrappers (`oRex`, `oCompy`, …) that add the outline pass; the draw functions are plain vector paths.
- Low-power mode: `LOWFX` reduces effects (`perfWatch`).

## Testing
`window.__dino` (`js/main.js`) exposes internals for tests: `startLevel`, `G`, `save`, `updatePlay`, `jump`, `roar`, `dash`, `go`, `buttons`, `pitFall`, `LEVELS`, `buildSong`, … `tests/helpers.js` provides `game.open(save)` (opens with a given save and collects page errors) and `FAKE_AUDIO`.

- `tests/levels.spec.js`: the autoplayer (`PLAY`) plays all 24 levels with 99 hearts and must reach the end; also checks the duration (60 to 330 s). Boss bots live in `tests/game.spec.js`.
- `tests/calendar.spec.js`: mocked `Date` for door logic, gifts, parent mode, ending, endless.
- `tests/game.spec.js`: shop, riddles, save migration, music, hazards, UI.
- `tests/quiz.spec.js`: riddle data integrity (layout, tiers, duplicates), Götti-Quiz flow, rewards and daily cap.
**When you add an obstacle or pattern, teach the bot in `PLAY` how to pass it**, otherwise the all-levels test fails (usually "stuck at x"). Debug stuck levels by stepping `PLAY` in small chunks and printing `p.wx`.
