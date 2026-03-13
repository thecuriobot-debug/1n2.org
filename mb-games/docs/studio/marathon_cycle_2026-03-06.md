# MAD BITCOINS RETRO GAME LAB - Marathon Cycle Notes (March 6, 2026)

## Objective
Continue after the night-shift sprint and expand the browser arcade with more playable depth, more pages, and clearer long-run production cadence.

## Added In This Marathon Cycle
- New browser games:
  - `play/halving-havoc.html`
  - `play/citadel-climb.html`
  - `play/node-hopper-drift.html`
- New operations pages:
  - `ops-marathon.html`
  - `play/challenge-ladder.html`

## Cartridge Expansion (Atari Style)
- Generated Atari-style cartridge art for all 12 playable browser games in:
  - `assets/cartridges/`
- Generated custom hand-painted scene art for all 12 cartridge labels in:
  - `assets/cartridge_paintings/`
- Added cartridge launcher page:
  - `play/cartridge-select.html`
- Added selector logic:
  - `play/js/cartridge-select.js`

## Design Intent
### Halving Havoc
- Genre: arena survival shooter
- Core loop: survive waves, fill charge, trigger board wipe at full meter.
- Why it works: direct risk/reward with immediate recovery potential.

### Citadel Climb
- Genre: vertical platform climber
- Core loop: route platform bounces upward while collecting seed shards.
- Why it works: very readable controls with high-mastery route planning.

### Node Hopper Drift
- Genre: river survival dodger
- Core loop: avoid barriers, manage fuel, chain node pickups for combo score.
- Why it works: movement tension differs from shooters and platformers.

## Ops Cadence (Long Run)
1. Build new mechanic quickly.
2. Ship playable page immediately.
3. Integrate into hub/home/sitemap/docs.
4. Validate with syntax + links + HTTP checks.
5. Rebuild package ZIP.
6. Repeat.

## Next Iteration Targets
- Add mini-boss phases to Halving Havoc and Node Hopper Drift.
- Add seeded daily challenge presets to Challenge Ladder.
- Add dedicated artwork set for the three new marathon games.
