# Copper Coast Air Rally

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/PrivatePope/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/PrivatePope/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A complete, original chase-view flight game that runs offline in a desktop browser from static files. Fly the little prop tourer *Kestrel* along a sunlit coastline: thread glowing rings, mind your fuel, and — on the sunset sortie — bring her home onto runway 27.

## How to play

Open `game/index.html` (or serve the repo with `node serve.ts` and visit http://localhost:8080) and pick a sortie — click a card or press **1**, **2** or **3**.

- **← → / A D** — bank and turn (mouse steers too)
- **↑ ↓ / W S** — pitch (climb / descend)
- **SHIFT / CTRL** (or mouse wheel) — throttle
- **P** pause · **R** restart · **M** sound on/off

## The three sorties

1. **Harbour Rings** — ten rings over the harbour and old town. Generous fuel, gentle wind: the sortie to learn on.
2. **Mountain Pass** — twelve rings through the ridge pass. Thin fuel, gusting crosswind: throttle discipline wins.
3. **Sunset Landing** — eight rings at dusk, then land on runway 27. Slow below 110 knots, line up on the centreline, flare gently — a soft landing pays up to 500 points.

## Scoring

- Ring flown through: **+100**; dead-centre perfect pass: **+150**
- Green fuel rings top the tanks up **+35%** — flying through one is a decision, not a detour
- Soft landing: up to **+500**, graded on descent rate, speed and alignment
- Time bonus for beating par, plus a point per percent of fuel left

Crash into terrain, ditch in the sea, stall, or run out of fuel over the ridge and the sortie ends — the flight log breaks down exactly what the flight earned.

## What is in the game

- A living procedural coastline: sea, beach, fields, forest, a little town, a mountain wall, and runway 27 — no image files, all drawn in code
- Lit instruments: artificial horizon, airspeed and altitude tapes, compass, throttle, fuel gauge, vertical-speed readout
- Synthesised sound: prop drone, wind, ring chimes and touchdown thuds (WebAudio, generated live — no audio files)
- Three missions with different courses, fuel and wind; deterministic screenshot states (`?shot=start|play|rings|end`) so every screenshot is a real render of the running game

## Layout

- `game/index.html` — the page; `game/src/` holds one job per file: `config.js` (tuning, missions, palette), `audio.js` (synth sound), `input.js` (keyboard + mouse), `terrain.js` (coast, sky, runway), `plane.js` (flight model + the Kestrel), `rings.js` (the course), `hud.js` (instruments and screens), `shots.js` (screenshot states), `main.js` (states, loop, collisions, scoring)
- `main.ts` — copies `game/` and `screenshots/` to the output directory and writes `dossier.json`
- `serve.ts` — local static server for play-testing; `shots.json` — the screenshot states
- `screenshots/` — four real renders of the game in a browser

Built for the make.fun bounty **best-flight-game-20261126-0057** ("Make the best flight game"). Original idea, art, sounds and names; no commercial game is copied.
