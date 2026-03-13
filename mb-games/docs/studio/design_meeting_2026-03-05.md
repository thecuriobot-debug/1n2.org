# MAD BITCOINS RETRO GAME LAB - Design Meeting (March 5, 2026)

## Step 1 - Internal Game Design Teams

### Agent A - Arcade Shooter Designer
- Game Title: `Bull Signal Barrage`
- Platform: `Sega Genesis`
- Genre: `Vertical Shooter`
- Gameplay Loop: Fly up market lanes, destroy FUD fleets, collect sat-chips, survive boss waves.
- Main Character: `Captain Laser Eyes` in a hardware-wallet fighter ship.
- Enemies: Panic drones, scam bombers, whale gunships, bot swarms.
- Powerups: HODL shield, triple-shot, chain lightning, moon bomb.
- Bosses: Bear Market Engine, Mega Whale Carrier, Final Boss `Custody Core`.
- Meme Elements: HODL, To the Moon, Buy Bitcoin, laser eyes, whales.
- Level Structure: 6 stages, each with miniboss + full boss.
- Visual Style: `Truxton/R-Type` inspired, dense projectile fields, heavy parallax.
- Why Fun: Immediate arcade feel, high skill ceiling, score-chaining reward loop.

### Agent B - Platformer Designer
- Game Title: `Seed Phrase Subway Escape`
- Platform: `NES`
- Genre: `Action Platformer`
- Gameplay Loop: Sprint through collapsing exchange stations, recover seed words, clear boss gates.
- Main Character: `Node Runner Nia` with wallet gauntlet.
- Enemies: Bear troopers, rug-pull thieves, fake guru drones, tax bats.
- Powerups: Cold storage armor, bull dash, miner boots, sat magnet.
- Bosses: Captain FUD, Margin Kraken, KYC Sentinel.
- Meme Elements: Not your keys, not your coins; Mad Bitcoins billboards; mining rigs.
- Level Structure: 5 worlds, 3 acts each, hidden vault rooms.
- Visual Style: `Mega Man + Contra` pacing, sharp silhouettes, high readability.
- Why Fun: Tight controls + speed routes + collectible mastery.

### Agent C - Puzzle / Strategy Designer
- Game Title: `Forkline Commander`
- Platform: `NES`
- Genre: `Puzzle Strategy`
- Gameplay Loop: Route transaction blocks into valid chains before mempool overflow.
- Main Character: `Operator Satoshi-9`.
- Enemies: Spam packets, fork gremlins, fee spikes.
- Powerups: SegWit sweep, lightning relay, mempool freeze.
- Bosses: Fork Hydra every 5 rounds.
- Meme Elements: 1 BTC = 1 BTC, Buy Bitcoin, whale dumps.
- Level Structure: Marathon + 24 challenge maps.
- Visual Style: clean 8-bit board readability.
- Why Fun: easy learning curve, very deep optimization.

### Agent D - Meme / Comedy Designer
- Game Title: `Not Your Keys, Not Your Kart`
- Platform: `Atari 2600`
- Genre: `Lane Dodge Comedy Racer`
- Gameplay Loop: dodge hacks, collect keys, bank points before paper-hands crash.
- Main Character: `Uncle Bit`.
- Enemies: Hack packets, clown influencers, exchange outage cars.
- Powerups: Coffee overclock, vault lock, laser-eye horn.
- Bosses: Every 4 rounds, giant `Custodian Blob`.
- Meme Elements: NYKNYC, HODL, paper hands penalties.
- Level Structure: endless escalating rounds.
- Visual Style: chunky Atari blocks, color-swap hazards.
- Why Fun: ultra-simple inputs + chaotic meme comedy.

### Agent E - Experimental Retro Designer
- Game Title: `Proof-of-Beat 1993`
- Platform: `Sega Genesis`
- Genre: `Rhythm Runner Shooter`
- Gameplay Loop: lane-switch to beat pulses while mining blocks and blasting noise mobs.
- Main Character: `DJ Nakamoto`.
- Enemies: Latency ghosts, sync jammers, bearish shockwaves.
- Powerups: BPM slow, overclock pulse, chain amplifier.
- Bosses: 3-phase track bosses tied to music transitions.
- Meme Elements: World Crypto Network chants, moon drops, whales as bass hits.
- Level Structure: 8 tracks with branching remixes.
- Visual Style: neon CRT scanline atmosphere with fake depth lanes.
- Why Fun: hybrid rhythm + shooter loop with strong replay identity.

## Step 2 - Pitch Session Summary
All five agents pitched complete arcade-ready concepts with Bitcoin meme integration and era-authentic constraints.

## Step 3 - Studio Selection (Top 2)

### Selected 1: `Bull Signal Barrage` (Genesis)
Reason:
- Strongest arcade intensity for instant replay.
- Best fit for Genesis sprite throughput and parallax scroll style.
- Clear path from prototype to shippable score-attack game.

### Selected 2: `Seed Phrase Subway Escape` (NES)
Reason:
- Best onboarding for broad players while retaining mastery depth.
- Excellent NES-era readability for hazards and movement.
- Meme narrative naturally supports level variety and bosses.

## Step 4 - Full GDD

### A) Bull Signal Barrage (Genesis)
- Complete gameplay description:
  - Vertical shooter with 8-12 minute complete runs.
  - Destroy enemy waves, build chain multiplier, spend pickups on temporary boosts between stages.
- Controls:
  - D-pad move, `B` fire, `A` bomb, `C` focus mode, `Start` pause.
- Player mechanics:
  - 3 lives, 2 bombs, invuln frames on hit, weapon tiers (single, spread, laser).
- Enemy behaviors:
  - Drones dive straight.
  - Scam bombers arc and drop slow explosives.
  - Whale gunships anchor at screen top and fire fan patterns.
- Level progression:
  - Stage 1 Exchange Outskirts
  - Stage 2 Mempool Storm
  - Stage 3 Mining Core
  - Stage 4 Whale Ocean
  - Stage 5 Citadel of FUD
  - Stage 6 Lunar Breakout
- Scoring system:
  - Base kill score + chain multiplier + no-hit wave bonus + boss phase bonus.
- Sound design:
  - FM bass riffs + PSG arpeggio leads; warning sirens before boss phase changes.
- Pixel art style guide:
  - 16x16 enemies, 32x32 elite ships, 64x64 modular bosses.
  - Strong warm pickups against cool backgrounds.
- Example screen layouts:
  - Top HUD: score/lives/bombs/chain.
  - Center: dense scrolling combat lane.
  - Bottom: alert strip for phase warnings.
- UI layout:
  - Bitmap all-caps font; left score, right lives/bombs, center chain meter.
- Boss fight mechanics:
  - 3 phases per boss.
  - Weak-point windows after signature attack patterns.

### B) Seed Phrase Subway Escape (NES)
- Complete gameplay description:
  - Side-scrolling action platformer across collapsing stations and tunnel hazards.
  - Recover seed words in each act, reach gate, defeat act boss.
- Controls:
  - D-pad move/crouch, `A` jump, `B` throw shard, `Start` pause.
- Player mechanics:
  - Variable jump height.
  - Dash momentum burst.
  - 3-hit HP with short invulnerability.
  - Wall-kick only on marked tiles.
- Enemy behaviors:
  - Bear troopers patrol and jump-chase.
  - Rug thieves steal nearby pickups and flee.
  - Drones oscillate on fixed wave paths.
- Level progression:
  - World 1 Street Grid
  - World 2 Data Depot
  - World 3 Deep Mine
  - World 4 Tax Tunnel
  - World 5 Moon Station
- Scoring system:
  - Time bonus + enemy clears + seed-word collection + no-hit room bonus.
- Sound design:
  - Pulse-wave lead themes, short SFX for jump/hit/pickup, boss warning sweep.
- Pixel art style guide:
  - 16x24 hero sprites.
  - Tiles in high-contrast 4-color groups for CRT readability.
- Example screen layouts:
  - Top HUD: HP/WORDS/TIME.
  - Main lane + elevated route + danger strip.
- UI layout:
  - Minimal icon HUD to preserve playfield width.
- Boss fight mechanics:
  - Arena lock-in.
  - Phase shift every ~33% HP.
  - Exposed weak point after telegraphed move.

## Step 5 - Code Development

Implemented starter code in this workspace:
- Genesis (SGDK):
  - `retro-dev/genesis/bull-signal-barrage/src/main.c`
  - `retro-dev/genesis/bull-signal-barrage/res/resources.res`
- NES-style architecture (cc65 + neslib):
  - `retro-dev/nes/seed-phrase-subway/src/main.c`

Included in code:
- Game loop
- Player movement
- Enemy spawning
- Collision detection
- Basic sprite system

## Step 6 - Asset Generation Plan

### Bull Signal Barrage
- Sprite sheets:
  - Player ship frames (idle/fire/damage)
  - 10+ enemy sets
  - Boss modules and projectile atlas
- Tile maps:
  - 6 stage tile sets + hazard overlays
- Background layers:
  - 2-3 parallax layers per stage
- Music style:
  - FM-driven high-tempo arcade tracks (150-175 BPM)
- Sound effects:
  - shot, hit, explosion, pickup, bomb, alert siren

### Seed Phrase Subway Escape
- Sprite sheets:
  - Player run/jump/dash/hit frames
  - Enemy sets + 5 bosses
  - collectible seed words and HUD icons
- Tile maps:
  - station/tunnel/mine/moon tiles with collision variants
- Background layers:
  - NES-style repeating pattern strips + animated signage
- Music style:
  - pulse-driven chiptune with short loop cadence
- Sound effects:
  - jump, dash, throw, hit, pickup, boss intro

## Step 7 - Build Plan

### Genesis (SGDK)
```bash
cd retro-dev/genesis/bull-signal-barrage
export GDK=/path/to/sgdk
make -f $GDK/makefile.gen
# ROM output in out/rom.bin
blastem out/rom.bin
```

### NES (cc65 + neslib workflow)
```bash
cd retro-dev/nes/seed-phrase-subway
# compile with cc65/ca65/ld65 toolchain according to project makefile or script
# expected output: seedphrase_subway.nes
mesen seedphrase_subway.nes
```

## Final Goal Status
- Studio process completed end-to-end.
- Two strongest concepts selected with detailed production documents.
- Starter code established for both selected systems.
- Asset and build plans ready for team production.

## Follow-Up Sprint (March 6, 2026)
- Night shift meeting notes: `docs/studio/night_shift_meeting_2026-03-06.md`
- New browser games added to playable arcade:
  - `play/wcn-signal-jam.html`
  - `play/mad-meme-blaster.html`

## Marathon Cycle (March 6, 2026 - later run)
- Marathon notes: `docs/studio/marathon_cycle_2026-03-06.md`
- Additional browser games:
  - `play/halving-havoc.html`
  - `play/citadel-climb.html`
  - `play/node-hopper-drift.html`
- Additional web pages:
  - `ops-marathon.html`
  - `play/challenge-ladder.html`
- Atari cartridge launch flow:
  - `play/cartridge-select.html`
  - `assets/cartridges/` (12-cart Atari-style set)
