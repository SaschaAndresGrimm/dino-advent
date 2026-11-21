# Olis Dino-Rettung

A Christmas runner game for Oli: a T-Rex he names himself, Chili the rabbit, Goetti's dino station, 4 worlds, a boss and a Christmas ending. The game text is in German. There's no build step and no external assets: plain HTML, Canvas and synthesised sound.

## Run locally
```bash
python3 -m http.server 8765
```
Then open http://localhost:8765. Controls:
- Tap or Space: jump (tap twice for a double jump)
- **DUCKEN** button (bottom left) or ↓ / S: hold to duck under low branches, ledges and low-flying pterosaurs. Press it in the air to **STAMPF!** (ground pound): it cracks amber stones and flattens Kompsis.
- **BRÜLL!** button or R: roar (scares raptors and pterosaurs, smashes rocks). After picking up a **Feuer-Chili** it becomes **FEUER!** for 8 seconds and shoots fireballs.
- Esc: pause

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
- **Difficulty:** `speed` and `segs` (level length) in `WORLDS`, and the pit widths in the `pit` pattern
- **Looks:** Oli's colours are in `drawOli` (red jacket, brown hair), Chili's in `drawChili`, Goetti's in `drawGoetti` / `drawGoettiHead`
- **Reset progress:** run `localStorage.removeItem('olisDinoRettung.v1')` in the browser console
- **Testing hook:** `window.__dino` exposes `startLevel(i)`, `startEnding()` and the save data
