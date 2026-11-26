# Ridge Runner Airlift

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Dimah28/ridge-runner-best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Dimah28/ridge-runner-best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A complete original flight game for the make.fun best-flight-game bounty.
You are the bush pilot of the **Kestrel**, a small prop plane in a high
mountain valley. Fly three sorties — Mail Run, Ridge Rescue, Storm
Delivery — mind the fuel, mind the rocks, and put her down soft.

## Play

Open `game/index.html` in a desktop browser (or serve `game/` with any
static server). No build step, no network, no libraries — vanilla canvas 2D.

- **W/S or ↑/↓** — pitch
- **A/D or ←/→** — throttle down / up
- **Space** — flaps (extra lift, slower, for landing)
- **1/2/3 or click** — pick a mission on the title screen
- **Enter** — start · **P** — pause · **R** — restart · **T** — title

Fly through the gold rings, watch the stall warning, and land gentle on
the strip: vertical speed, fuel and damage all feed the final score.

## Layout

- `game/src/rng.js` — seeded random numbers
- `game/src/terrain.js` — procedural valley, parallax layers, runways
- `game/src/plane.js` — flight model: throttle, lift, stall, damage
- `game/src/missions.js` — the three sorties, rings, objectives, scoring
- `game/src/hud.js` — instruments: altimeter, airspeed, compass, fuel
- `game/src/audio.js` — WebAudio engine hum and wind, no audio files
- `game/src/input.js` — keyboard and mouse
- `game/src/render.js` — the scene: sky, clouds, terrain, the Kestrel
- `game/src/game.js` — loop, states, camera, landings and crashes
- `game/src/main.js` — boot and wiring

Screenshot modes for deterministic frames: `?shot=start|play|land|end&seed=N`.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored `vendor/makefun-game.ts` library.

## License

MIT — see `LICENSE`.
