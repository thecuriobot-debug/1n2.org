Original prompt: let's make a new version of mad patrol.

start with zooming out.  More classic MOON PATROL controls and gameplay.  add in some pits to jump over.  Still easy to clear.

CREATE 3 RETRO GAME EXPERTS
 - have them compare the game to moon patrol, blaster master, ninja gaiden and make improvements
 - MOON PATROL
 - have a level where Mad Bitcoins gets out of the car and walks and shoots (MEGA MAN)
 - have a level where Mad Bitcoins gets out of the car but only has a sword (NINJAGAIDEN)
 - the EXPERTS will help you build the game.

Create a combination of MOON PATROL, MEGA MAN, NINJAGAIDEN - using the MAD BITCOINS (TOP HAT, PURPLE SASH, BITCOIN LOGO ON FRONT, BLACK RIMMED GOGGLES with FLY LENSES RED.  SUIT.  HERO)

include weapons and other fun ideas from Mad Patrol 1, but be clear -- this is MAD PATROL 2.  Improve graphics, weapons, controls, levels, everything.

GO

- Bootstrapped progress tracking for full MAD PATROL 2 redesign.

- Replaced `game.js` with MAD PATROL 2 architecture:
  - Stage 1 vehicle gameplay with Moon Patrol-style throttle and high/low jump.
  - Added pit generation and warning signs; tuned to stay easy.
  - Stage 2 on-foot blaster gameplay (Mega Man / Blaster Master influence).
  - Stage 3 on-foot sword-only gameplay (Ninja Gaiden influence).
  - Added 3 retro expert personas and surfaced their guidance in title/briefing flow.
  - Preserved Mad Patrol-style weapon pickups (spread/wave/giant/nuke) in non-sword stages.
  - Added deterministic hooks: `window.render_game_to_text` and `window.advanceTime(ms)`.
- Updated `index.html` title/aria/hint text and refreshed `README.md` for Mad Patrol 2.

- Fixed major gameplay bug discovered in automated test: ground collision used mixed center/bottom coordinates, causing fall-through and instant game-over.
- Added ease-of-clear tuning:
  - Vehicle stage pit auto-hop assist near edges.
  - Vehicle pit rescue (HP/score penalty instead of immediate life loss).
  - On-foot pit rescue (HP/score penalty; life loss only at 1 HP).
  - Reduced stage lengths and narrowed pit widths.
- HUD readability fix: moved HP/LIVES labels and resized progress bar to avoid overlap.

Playwright / visual test artifacts reviewed:
- Title experts panel: `output/web-game-title/shot-0.png`
- Stage 1 vehicle (Moon Patrol): `output/web-game-vehicle-hud/shot-0.png`
- Stage 2 blaster (Mega Man / Blaster Master): `output/web-game-stage2-hud/shot-0.png`
- Stage 3 sword (Ninja Gaiden): `output/web-game-run5/shot-0.png`
- Win screen: `output/web-game-run5/shot-1.png`
- End-to-end state progression to win verified in `output/web-game-run5/state-*.json`.
- No Playwright console/page error files generated in successful runs.

Environment notes for test harness:
- Installed `playwright` under `/Users/curiobot/.codex/skills/develop-web-game` so the skill script can import it.
- Used local server for testing: `python3 -m http.server 4173 --directory /Users/curiobot/Sites/1n2.org/madpatrol2`.

TODO / suggestions for next agent:
- Replace temporary action JSON files in project root (`actions_*.json`) with a single documented test script or move them to a dedicated `test-actions/` folder.
- Consider decoupling RAF loop from `window.advanceTime` stepping to avoid dual-update behavior during automation.
- Tune combat density in Stage 3 if you want a harder optional mode while keeping default "easy clear".

- Cleanup after verification:
  - Removed temporary `actions_*.json`, local npm files (`package.json`, `package-lock.json`, project `node_modules`), and `output/` screenshots/state artifacts from the project folder.
  - Core deliverable files kept: `game.js`, `index.html`, `README.md`, `progress.md`.

- Added user-provided soundtrack files to project at `audio/`:
  - `audio/afterburner.mp3`
  - `audio/afterburner-1.mp3`
  - `audio/afterburner-2.mp3`
  - `audio/afterburner-3.mp3`
- Integrated stage-aware background music playback in `game.js` with autoplay-safe unlock on first interaction.
- Added `M` key toggle for music on/off and surfaced status in HUD + title/help text.

- Validation:
  - Ran Playwright client against `http://127.0.0.1:4173/index.html` with movement/start actions; gameplay state advanced cleanly and no error dump files were produced.
  - Performed targeted browser check with direct Playwright script to confirm `M` toggle updates HUD from `MUSIC ON (M)` to `MUSIC OFF (M)`.

- Iteration pass requested by user completed:
  - Stage 1 (vehicle): increased pickup density/variety, added new enemies (`saucer`, `raider`), and added sector-based visual variation.
  - Stage 2 (blaster): added run button (`A`/`Shift`), lowered + densified platforms, increased jump-chain layout, and added Mario-style elements.
  - Stage 3 (sword): increased enemy pressure (including `elite_ninja`), higher jump potential, denser platforms, and richer sword combo animation.
  - Added Mario-like interactables in walking stages: blocks (`brick`, `qblock`), pipes, and coin lines.
  - Added “BIG RETRO MEETING” in title/briefing/win UI using the 3 expert decisions and reflected those decisions in mechanics.
  - Improved readability and sharpness: switched to clearer UI/title fonts, stronger HUD text contrast, and disabled canvas image smoothing.

- Additional polish pass (post-iteration):
  - Added Mario-style stomp mechanic on walking stages (descending-on-head damage + bounce + score bonus).
  - Moved controls helper text into a dedicated top callout bar to avoid overlap with bottom HUD elements.
  - Increased readability of page hint text by switching CSS body/hint typography to clearer sans-serif with stronger weight and spacing.

- Validation after polish pass:
  - `node --check game.js` passes.
  - Ran Playwright client with `/tmp/madpatrol2-actions-quick.json` against `http://127.0.0.1:4173/index.html`.
  - Reviewed screenshots from `/tmp/madpatrol2-quick-polish/shot-1.png`, `shot-3.png`, and `shot-6.png`.
  - State snapshots generated (`state-0.json`..`state-7.json`) with no console/page error files emitted.

- User-requested iteration pass applied (March 2026):
  - Removed pits/gaps from Stage 2 and Stage 3 (non-Moon-Patrol stages).
  - Stage 2 converted to ground-focused run-and-gun: no platforms/pipes/blocks; no pits.
  - Stage 2 character visuals changed to forward-facing Ninja-style stance (`visualMode: ninja`, lock forward facing).
  - Added new shooter stage types and progression:
    - Stage 4: `R-Type Void Front` (`kind: shooter`)
    - Stage 5: `Gradius Neon Corridor` (`kind: shooter`)
  - Added new bionic stage types and progression:
    - Stage 6: `Bionic Outpost Run` (`kind: bionic`)
    - Stage 7: `Bionic Sky Bridge` (`kind: bionic`)
  - Added bionic anchor/grapple system (`X`): anchor generation, grapple pull state, anchor rendering, hook-line rendering.
  - Kept Moon Patrol up-shot enabled (`X`) and verified projectile output in stage state.
  - Added stage-level music reuse controls via playback rate (`musicRate`) and per-stage track mapping (`musicTrack`) for faster/slower variants.
  - Generalized HUD/stage metadata from fixed 3 stages to dynamic `STAGES.length`.
  - Added `window.debug_set_stage(index, mode)` helper for deterministic stage QA.

- Validation performed:
  - Syntax check: `node --check game.js` (pass).
  - Playwright client run on localhost: `http://localhost:8000/madpatrol2/` with movement/fire actions.
    - Artifacts: `/tmp/madpatrol2-stage1/shot-*.png`, `state-*.json`
    - Confirmed transition to Stage 2 and `pits: []` in Stage 2 state.
    - No `errors-*.json` produced.
  - Targeted Playwright checks via direct script:
    - Shooter stage (index 3): `/tmp/madpatrol2-stage-new/shot-shooter.png`, `state-shooter.json`
    - Bionic stage (index 5): `/tmp/madpatrol2-stage-new/shot-bionic.png`, `state-bionic.json`
    - Moon up-shot check (index 0): `/tmp/madpatrol2-stage-new/state-moon-upshot.json` (player bullet count confirms up-fire path).
    - Stage-2 forward-facing check: `/tmp/madpatrol2-stage2-facing.png`.

- User-requested enemy/level/startup pass applied (March 12, 2026):
  - Moon Patrol up-shot enhanced:
    - Stage controls now advertise `X or FIRE+UP`.
    - Vehicle input now supports `UP + FIRE` as direct up-shot (without forcing forward shot).
  - Bionic stage traversal tuned for larger swing spaces:
    - Fewer/shorter platform chains.
    - Higher anchor mount placement.
    - Wider spacing between anchor/platform clusters.
  - Bionic ninja upgrade pass:
    - Spawn rate increased in bionic stages.
    - Added dash cadence + more aggressive close-range lunge behavior.
    - Enemy anchor targeting now favors higher anchors for clearer bionic-style movement.
  - Shooter enemy/powerup pass:
    - `ace_fighter` received vertical pursuit tuning + burst dash behavior.
    - Shooter enemy deaths now have a higher drop rate and biased advanced weapon drops (laser/burst/wave/giant/nuke/shield pools).
    - Bionic enemy deaths now bias toward useful bionic pickups (burst/laser/shield/etc).
  - Startup screen polish:
    - Mission text updated to describe FIRE+UP moon up-shot and the latest bionic/shooter enemy upgrades.

- Validation run results:
  - `node --check /Users/curiobot/Sites/1n2.org/madpatrol2/game.js` (pass).
  - Playwright skill client run:
    - Command used with `/tmp/madpatrol2-actions-main3.json`
    - Output: `/tmp/madpatrol2-main3`
    - No `errors-*.json` emitted.
  - Targeted Playwright verification:
    - Startup/title flow + hero startup screen: `/tmp/madpatrol2-target3/shot-startup.png`, `/tmp/madpatrol2-target3/shot-title.png`
    - Shooter check confirms `ace_fighter` + advanced pickup visibility (`laser`): `/tmp/madpatrol2-target3/check-shooter.json`, `/tmp/madpatrol2-target3/shot-shooter.png`
    - Bionic check confirms visible `bionic_ninja` + high anchors: `/tmp/madpatrol2-target3/check-bionic.json`
    - Extra targeted captures for clearer evidence:
      - Moon FIRE+UP up-shot active (`bullets.player: 1`): `/tmp/madpatrol2-target4/state-moon-upshot.json`, `/tmp/madpatrol2-target4/shot-moon-upshot.png`
      - On-screen `bionic_ninja` in bionic stage: `/tmp/madpatrol2-target4/state-bionic-ninja.json`, `/tmp/madpatrol2-target4/shot-bionic-ninja.png`

- TODO / follow-up suggestion:
  - If desired, add a dedicated bionic tutorial prompt in Stage 6 briefing to explicitly call out enemy grappling behavior and optimal counter-play.

- User-requested control simplification pass applied (March 12, 2026, follow-up):
  - Removed Moon Patrol low-jump (`DOWN`) behavior; stage 1 now has a single jump type (`UP`).
  - Removed dedicated up-shot button requirement; Stage 1 now fires forward + upward from main fire (`SPACE`) only.
  - Removed `X/C/Z/A/SHIFT` from active gameplay control paths to reduce button count.
  - Simplified control handling by stage:
    - Vehicle: `LEFT/RIGHT`, `UP` jump, `SPACE` fire (forward + up).
    - Blaster: `LEFT/RIGHT`, `UP` jump, `SPACE` shoot (vertical shot via holding `UP` while firing).
    - Sword: `LEFT/RIGHT`, `UP` jump, `SPACE` sword.
    - Shooter: `ARROWS` move, `SPACE` fire (vertical shot via hold `UP`).
    - Bionic: `LEFT/RIGHT`, `UP` jump, `SPACE` fire, grapple via `UP + tap SPACE`.
  - Kept requested utility controls unchanged: `ESC` pause, `M` music toggle, `F` fullscreen.
  - Updated startup mission copy to reflect one-button Moon Patrol firing.

- Validation after control pass:
  - Syntax check: `node --check /Users/curiobot/Sites/1n2.org/madpatrol2/game.js` (pass).
  - Playwright smoke run:
    - Command used with `/tmp/madpatrol2-actions-controls.json`
    - Output: `/tmp/madpatrol2-controls-smoke`
    - No `errors-*.json` generated.
  - Targeted Moon control probe:
    - Output: `/tmp/madpatrol2-controls-target/check.json`
    - Confirmed `SPACE` fire produces immediate player bullets (`deltaBullets: 3` over short burst).
    - Confirmed `DOWN` no longer causes low-jump behavior (`vyAfterDown: 0`; no jump impulse).
    - Screenshot: `/tmp/madpatrol2-controls-target/shot-moon-controls.png`.

- User-requested gameplay escalation pass applied (March 12, 2026, Level 1/2/R-Type follow-up):
  - Stage 1 (Moon Patrol) action + jump variety:
    - Increased stage-1 enemy/pickup cadence.
    - Increased pit count slightly and expanded moon bank generation into clustered patterns (single/double/triple banks).
    - Added taller mountain-bank variants and richer bank-top pickup placement.
    - Vehicle jump impulse now varies by pit width, slope, and speed for less repetitive jump arcs.
  - Stage 2 (Contra-style dirt run) speed + lane complexity:
    - Increased blaster movement acceleration/max speed and slightly stronger jump base.
    - Increased dirt elevation amplitude for stronger up/down terrain profile.
    - Added extra stacked ledge generation for multi-lane jump routes.
    - Increased stage-2 enemy/pickup cadence and mixed in cross-level enemy types (`raider`, `ninja`) alongside existing stage-2 enemies.
  - R-Type/Gradius shooter upgrades:
    - Increased shooter stage pacing and pickup frequency.
    - Buffed plasma forward spread in shooter stages.
    - Added new elite shooter enemy: `blade_spinner` (dash + spread-fire behavior, custom sprite, custom score value).
    - Raised shooter drop rates and biased advanced shooter pickups (including extra plasma weighting).

- UI/control-text consistency fix:
  - Updated `/Users/curiobot/Sites/1n2.org/madpatrol2/index.html` overlay controls hint to match simplified control scheme (Arrows + Up + Space, plus Esc/M/F and bionic grapple note).

- Validation run summary (post-pass):
  - Syntax: `node --check /Users/curiobot/Sites/1n2.org/madpatrol2/game.js` (pass).
  - Required Playwright skill-client run:
    - URL: `http://localhost:8000/madpatrol2/`
    - Actions: `/tmp/madpatrol2-actions-pass5.json`
    - Output: `/tmp/madpatrol2-pass5`
    - No `errors-*.json` artifacts generated.
  - Targeted stage probes (Playwright direct scripts):
    - Output dir: `/tmp/madpatrol2-targeted-pass5`
    - Stage snapshots: `shot-moon.png`, `shot-blaster.png`, `shot-shooter.png`
    - State snapshots: `state-moon.json`, `state-blaster.json`, `state-shooter.json`
    - Probe summary: `/tmp/madpatrol2-targeted-pass5/probe.json`
      - `shooterSeen` includes `blade_spinner`.
      - `shooterPickupSeen` includes advanced drops (`plasma`, `nuke`, `laser`, etc.).
      - `blasterSeen` includes mixed enemies including `raider`.
    - Explicit `blade_spinner` presence capture:
      - `/tmp/madpatrol2-targeted-pass5/state-blade-spinner.json`
      - `/tmp/madpatrol2-targeted-pass5/shot-blade-spinner.png`
      - `/tmp/madpatrol2-targeted-pass5/blade-spinner-check.json` (`found: true`).

- TODO / next suggestion:
  - If desired, add a stage-specific “speed mode” toggle in briefing for Stage 2+ shooter stages so players can switch between current fast default and an even faster challenge preset.

- User-requested pass applied (March 12, 2026, grapple + finale + panel polish):
  - Grapple control change:
    - Bionic grapple input moved off main fire combo to dedicated `G` key.
    - Updated bionic stage controls text and bottom controls hint accordingly.
    - Added `player.grapple_active` and `player.hook_cd` fields to `render_game_to_text` payload for deterministic grapple QA.
  - Stage replacement:
    - Replaced former second bionic final stage with new Stage 7 underwater finale:
      - `id: underwater`, `kind: shooter`, `theme: underwater`, renamed to `Underwater Bitcoin Trench`.
      - Added underwater-specific movement feel in shooter update loop (water drag/current style tuning).
      - Added underwater environment visuals (water gradient, bubbles, kelp silhouettes, seabed profile).
      - Added underwater enemy roster and behavior/sprites:
        - `jelly_mine`
        - `torpedo_eel`
        - `squid_striker`
        - `submarine`
      - Integrated new enemy scoring/drop behavior into death handling.
  - Meeting/panel small improvements:
    - Startup mission panel updated with grapple-key and underwater-finale messaging.
    - Title meeting bar now rotates through meeting decisions instead of showing a single fixed line.
    - Briefing text now has a dedicated underwater stage descriptor.
    - Title subtitle updated to include underwater theme.
    - Title expert-card copy sizing/line wrap tuned to avoid clipping.
    - Win summary line updated to mention underwater finale completion.

- Validation performed:
  - Syntax:
    - `node --check /Users/curiobot/Sites/1n2.org/madpatrol2/game.js` (pass after final edits).
  - Required Playwright skill-client run:
    - URL: `http://localhost:8000/madpatrol2/`
    - Actions: `/tmp/madpatrol2-actions-pass6.json`
    - Output: `/tmp/madpatrol2-pass6`
    - No `errors-*.json` emitted.
  - Targeted gameplay checks:
    - Output: `/tmp/madpatrol2-targeted-pass6`
    - Grapple verification (`G` key):
      - `check.json` shows `grappleSeen: true`.
      - `state-grapple-active.json`, `shot-grapple-active.png` capture active grapple state/line.
    - Underwater finale verification:
      - `check.json` shows stage id `underwater` at index `6`.
      - Enemy roster observed in run: `jelly_mine`, `torpedo_eel`, `squid_striker`, `submarine`.
      - Screens/state: `shot-underwater.png`, `state-underwater.json`.
  - Panel/meeting screenshots:
    - Output: `/tmp/madpatrol2-panels-pass6`
    - `shot-startup.png`
    - `shot-title.png`
    - `shot-title-rotated.png` (meeting line rotation)
    - `shot-title-updated.png` (post-fit typography)
    - `shot-briefing-stage1.png`
    - `shot-briefing-underwater.png`

- TODO / optional follow-up:
  - If desired, add an underwater miniboss event near the end of Stage 7 for a stronger finale capstone.

- User-requested pass applied (March 12, 2026, grapple direction + sword animation + duck system):
  - Directional bionic grapple:
    - Grapple now supports directional selection using movement + `G`:
      - `G + forward` selects forward-side anchor.
      - `G + backward` selects backward-side anchor.
    - Updated grapple anchor selection logic to respect direction and widened fallback range while keeping directional intent.
    - Added grapple telemetry fields in text state for QA (`grapple_target_x`).
  - Duck system for on-foot Mad Bitcoins stages:
    - Added `DOWN` duck on on-foot stages (blaster/sword/bionic).
    - Duck lowers collision height (from full height to ~58%) so player can duck under fire.
    - Added duck + shoot support (forward shots spawn from lower barrel height while ducking).
    - Added duck state to text output (`player.duck`, `player.collision_h`) and HUD indicator (`DUCK`).
    - Updated controls text in stage configs and page hint to include duck.
  - Sword animation polish:
    - Reworked sword pose with dynamic swing angle tied to combo/fx timing.
    - Added blade trail/smear strokes and improved slash arc rendering with life-based sweep + trailing streaks.
    - Added slash metadata (`maxLife`, `spin`) to support richer rendering.
  - Briefing/startup copy refresh:
    - Startup panel now calls out duck and directional grapple behavior.
    - Bionic briefing descriptor now mentions directional `G` grapples.

- Validation performed:
  - Syntax:
    - `node --check /Users/curiobot/Sites/1n2.org/madpatrol2/game.js` (pass after final edits).
  - Required Playwright skill-client runs:
    - `http://localhost:8000/madpatrol2/`
    - Output dirs: `/tmp/madpatrol2-pass7`, `/tmp/madpatrol2-pass7b`
    - No `errors-*.json` emitted.
  - Targeted deterministic checks:
    - `/tmp/madpatrol2-targeted-pass7c/check.json`
      - `grapple_forward_ok: true`
      - `grapple_backward_ok: true`
      - `duck_active: true`
      - `duck_shooting: true`
      - `duck_collision_h: 29` (reduced from standing 50)
    - Supporting captures:
      - Directional grapple: `/tmp/madpatrol2-targeted-pass7c/shot-forward.png`, `/tmp/madpatrol2-targeted-pass7c/shot-backward.png`
      - Duck + shoot: `/tmp/madpatrol2-targeted-pass7c/shot-duck.png`
      - Sword animation: `/tmp/madpatrol2-targeted-pass7b/shot-sword.png`

- TODO / optional follow-up:
  - If desired, add an explicit on-screen mini tutorial card at Stage 6 start for “`G + direction` grapple selection” and “`DOWN` duck under fire”.
