# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Chikku Car Typing — a browser-based typing tutor for a kid learning to type. A car drives along a road as the
player types a drill's text correctly; a wrong keystroke makes the car brake (visual shake + red glow) and blocks
progress until the correct character is typed. Finishing every level transforms the car into a bumblebee and shows
a congratulations screen recapping the final lesson from every key set.

Plain HTML/CSS/JS, no framework, no build step, no dependencies — designed to be served as-is from GitHub Pages
(just point Pages at the repo root / `index.html`).

## Running locally

Any static file server works, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Opening `index.html` directly via `file://` also mostly works, but always test over `http://` before treating a
change as verified — some browsers restrict script/module behavior on `file://`.

There is no build, lint, or automated test command in this repo. To verify a change actually works, drive it in a
real (or headless) browser and watch the car/road/prompt respond to keystrokes — see the `/run` skill for a
Playwright-based headless-browser driving pattern if `chromium-cli` isn't available in the environment. Key things
to check after any change to typing logic: correct keystrokes advance the car and prompt highlighting; a wrong
keystroke adds `.brake` to `#vehicle` and does **not** advance `state.engine.index`; finishing the last drill of a
level unlocks the next level in `localStorage`; finishing the final level flips `#vehicle` to `.is-bee` and shows
`#overlay-congrats`.

## Architecture

Three JS files, loaded in this order from `index.html`, each with a distinct responsibility:

- **`js/lessons-data.js`** — pure data. `LEVELS` is an ordered array of levels; each has `id`, `title`, `keys`
  (badges shown on the level card), and `drills` (an array of plain strings to type, in order). **Cumulative key
  design**: each level's drill text only uses keys introduced by that level or earlier — level 2's drills reuse
  level 1's keys plus its own, etc. When editing curriculum content, preserve this invariant (don't put a `z` in an
  early home-row drill). The **last** drill in each level's `drills` array doubles as that level's "final lesson" —
  it's what gets shown in the end-game congratulations recap, so keep it a complete, presentable phrase/sentence
  rather than a raw drill pattern.

- **`js/game.js`** — `TypingEngine`, a small class with zero DOM/UI knowledge. Constructed with a target string and
  `{onProgress, onError, onComplete}` callbacks; fed one character at a time via `handleChar(char)`. It owns typed
  index, correct/error counts, timing, and derives WPM/accuracy in `getStats()`. Keep this UI-agnostic if you touch
  it — all rendering lives in `app.js`.

- **`js/app.js`** — everything else: screen switching (`.screen` divs toggled via `.active`), level-select
  rendering/unlock logic, keyboard capture, vehicle (car/bee) animation, synthesized WebAudio sound effects (no
  audio asset files — see the `tone()`/`sfx` helpers), and `localStorage` persistence under the key
  `chikkuCarTyping.progress` (shape: `{playerName, unlockedIndex, bestScores, completedAll, muted}`).

### Key mechanics worth knowing before changing behavior

- **Input capture**: a single `document` `keydown` listener (`onKeyDown`) is attached/detached as the game screen
  is entered/left. It relies on `e.key` already reflecting the shifted/typed character (so `Shift+1` arrives as
  `'!'`, `Shift+a` as `'A'`) and only forwards single-character keys to `TypingEngine.handleChar`; everything else
  (Backspace, arrows, modifiers, etc.) is ignored. There is deliberately no hidden `<input>` — don't reintroduce
  one without checking this listener still fires correctly.

- **Brake-on-error**: on a wrong key, `TypingEngine` does *not* advance `index` and fires `onError`, which adds a
  `.brake` class to `#vehicle` (CSS handles the shake/glow keyframe) and removes it on a timeout. The car's
  position is always derived from `stats.progress` (`index / targetText.length`), so a rejected keystroke simply
  never moves it — there's no separate "rewind" logic to keep in sync.

- **Level progression**: drills within a level advance via the drill-complete overlay's "Next Drill"/"Finish
  Level" button. Finishing a level's last drill calls `completeLevel()`, which unlocks the next level in
  `state.progress.unlockedIndex` and persists a best score. Finishing the *last level in `LEVELS`* instead calls
  `triggerFinalCongrats()` — this is the only place the car becomes a bee (`.is-bee` on `#vehicle`) and the recap
  list is built directly from each level's final drill string.

- **Vehicle markup**: `#vehicle` contains both the car `<svg>` and the bee `<svg>` at all times; CSS
  (`.vehicle.is-bee .svg-car`/`.svg-bee`) controls which is visible. There's no dynamic SVG swapping in JS beyond
  toggling classes.

## Deployment

Static site, no build artifacts to generate — GitHub Pages can serve this repo directly (root or `/docs`, per
whatever the repo's Pages settings point to). No CI/build step is required before pushing.
