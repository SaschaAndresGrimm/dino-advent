# Maintenance guide

Everything needed to keep the game running: how it is deployed, what to do each year, and where things can go wrong.

## How deployment works
`.github/workflows/ci.yml` runs on every push and pull request:

1. **test:** `npm ci`, `npm run check`, install Chromium, `npm test`.
2. **deploy** (only on `main`, only if `test` passed): copies the shipped files (`index.html`, `js/`, `sw.js`, `manifest.webmanifest`, icons, `og-image.png`) into `_site/` and publishes it to GitHub Pages. Docs, tests and scripts are not published.

Live URL: <https://saschaandresgrimm.github.io/dino-advent/>

**You do not need to bump the service-worker cache by hand.** The deploy job replaces `dino-advent-dev` in `sw.js` with `dino-advent-<commit>`, so every release gets a fresh cache. The service worker is cache-first and precaches all files as one snapshot (all or nothing), so a launch never mixes old and new files. A new release installs in the background and the game reloads itself at the splash, title or map once it is ready.

The title screen shows the running build (short commit and UTC date, bottom right; `dev` on a local server). The deploy job stamps it by replacing the literal `dino-advent-build` in `js/core.js` and fails if that literal survives. Keep the literal as it is.

### One-time repository settings
- **Settings → Pages → Source: GitHub Actions** (not "Deploy from a branch").
- Optionally protect `main`: require the `test` check and a pull request.
- Repository description, website and topics: set the website to the live URL.

### Releasing
Merge to `main`. That is all. To redeploy without a change, run the workflow manually (Actions → CI and deploy → Run workflow).

If a release is broken, revert the commit on `main`; the pipeline redeploys the previous state.

## Yearly rollover
The calendar start is a constant, `ADVENT_START` in `js/data.js` (1 December 2026). For a new year:
1. Change `ADVENT_START` and any visible year (title screen footer "· 2026", voucher texts mentioning 2027).
2. Tests that mock the clock (`tests/calendar.spec.js`) use the date: update them.
3. Decide about saves: they hold `lvDone`, `gifts`, medals. Players keep progress by default; reset only if you want a fresh calendar.
4. Release as above.

## Content upkeep
| What | Where |
|---|---|
| Story and dialog text | `DAY_STORY`, `DAY_AFTER`, `TEASERS`, `startStory`, `startEnding` |
| Riddles | `WORLDS[i].riddles` (25 per theme, each with a difficulty `d` 1-3: levels pick by day, the Götti-Quiz asks one easy, two medium and two hard per round; append new ones at the end so `save.riddleSeen`/`save.quizSeen` indices stay valid; set `trick: true` only for real trick questions). Fact-check every answer (recompute numbers, make sure the two wrong options really are wrong) and keep Swiss spelling. The question must fit 4 lines, the explanation 3 lines, an answer one button: `tests/quiz.spec.js` checks the layout, tiers and duplicates |
| Dino cards and facts | `FACTS` (`text` = `headline|Wusstest-du detail`), `STECK` (same index; see CLAUDE.md for its fields) |
| Shop items, gifts | `SKINS`, `HATS`, `FIRES`, `JACKETS`, `WISHES` (real-life vouchers and prices) |
| Blocked nicknames | `BAD_WORDS` |

## Dependencies
- The game has **no runtime dependencies**. The only dev dependency is `@playwright/test`.
- Dependabot opens monthly grouped PRs for npm and for GitHub Actions. Merge them when CI is green. After a Playwright bump, the CI step `playwright install` fetches the matching browser.
- Locally, after upgrading Playwright: `npx playwright install chromium`.

## Screenshots
README screenshots are generated, not hand-made: `npm run screenshots` writes `docs/screenshots/*.png` from a prepared mid-advent save. Re-run it after visual changes and commit the result. `og-image.png` (link preview) is a copy of `docs/screenshots/title.png`.

## Privacy
There is no backend, analytics or network call. Progress and nicknames stay in the browser's `localStorage`. Any online feature (shared high scores, for example) needs a deliberate privacy decision first, because the players are children.

## Troubleshooting
| Symptom | Likely cause and fix |
|---|---|
| Players see an old version | Normal for one launch: the new release installs in the background and the game reloads itself at the next quiet moment (splash, title, map). Reload once. If it persists, check the deploy job ran and the `_site` `sw.js` has a commit-based cache name |
| Deploy job fails with "Pages not enabled" | Settings → Pages → Source must be GitHub Actions |
| Progress vanished | Different browser or cleared site data; saves are per browser and per origin. Never rename `olisDinoRettung.v1` |
| Autoplayer test hangs at `steps:60000` | A level change made it unbeatable for the bot; see [DEVELOPMENT.md](DEVELOPMENT.md#testing) |
| Audio silent on iOS | Browsers need a first tap before audio starts; the tap-to-start splash handles this |

## Renaming the repository
The repository was renamed from `olis-dino-rettung` to `dino-advent`. GitHub redirects git remotes, but **the Pages URL changes** (`/olis-dino-rettung/` → `/dino-advent/`), and the old path stops working. Devices that installed the game from the old address keep a dead app icon: reinstall from the new link. Browser saves are stored per origin (`saschaandresgrimm.github.io`) and the key is unchanged, so progress survives the move.
