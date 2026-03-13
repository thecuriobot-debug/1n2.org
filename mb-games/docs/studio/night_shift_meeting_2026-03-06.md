# MAD BITCOINS RETRO GAME LAB - Night Shift Meeting (March 6, 2026)

## Meeting Goal
Ship new browser-playable crypto arcade games overnight, keep iteration cycles tight, and checkpoint frequently so no progress is lost.

## Boss Orders (Execution Rules)
1. Build only games that are immediately playable in browser.
2. Keep game loops simple: move, shoot/dodge, score, restart fast.
3. Use more Mad Bitcoins and World Crypto Network references in names, enemies, and HUD text.
4. Save often: after each major change, update docs and package notes.
5. Keep everything linked from hub + homepage + sitemap.

## Research Notes Used
- World Crypto Network site positioning: long-running Bitcoin-focused video network and archive language.
- Mad Bitcoins site/video framing: commentary-first Bitcoin content and meme-centric tone.

## Agent Pitch Round (5 Concepts)

### Agent A - Arcade Shooter
- Title: `Whale Beam Convoy`
- Platform vibe: Genesis
- Loop: Escort miner ships, blast whale raiders, chain convoy bonus.

### Agent B - Platformer
- Title: `Citadel Stair Rush`
- Platform vibe: NES
- Loop: Climb collapsing exchange towers, recover seed shards, avoid tax bats.

### Agent C - Puzzle / Strategy
- Title: `Fee Market Switchboard`
- Platform vibe: NES puzzle
- Loop: Route transaction pipes before red-fee overflow triggers liquidation.

### Agent D - Meme / Comedy
- Title: `Mad Meme Blaster`
- Platform vibe: Coin-op shooter
- Loop: Clear paper-hands formations, charge and fire a full-screen Mad Rant blast.

### Agent E - Experimental
- Title: `WCN Signal Jam`
- Platform vibe: Genesis-action hybrid
- Loop: Defend a live broadcast signal from jammers and whale relays, spend full meter on burst clears.

## Selected Concepts (Top 2)
1. `WCN Signal Jam`
- Strong identity, fast readable loop, and explicit World Crypto Network thematic tie.

2. `Mad Meme Blaster`
- Immediate arcade feel, broad meme coverage, and very replayable wave progression.

## Build Decisions Executed
- Added both games to `play/` as fully playable canvas demos.
- Hooked both into shared arcade runtime (`pause`, `touch`, `meta tracking`, `random launcher`).
- Linked both from homepage, playable hub, docs index, and sitemap.

## Overnight Iteration Cycle
- Cycle A: Add mechanics and stabilize controls.
- Cycle B: Add UI clarity and score readability.
- Cycle C: Tune difficulty ramps and restart flow.
- Cycle D: Validate links, syntax, and package updates.

## Save Checkpoints
- New game files saved in `play/js/` and `play/`.
- Web index pages updated.
- Deliverables and package notes updated.
- ZIP package ready to rebuild after each sprint.

## Next Backlog
1. Add boss phases to both new games.
2. Add optional two-player hot-seat score mode.
3. Add more hand-drawn cartridge/poster variants for new titles.
