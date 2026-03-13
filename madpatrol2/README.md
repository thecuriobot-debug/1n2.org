# Mad Patrol 2

Retro browser game remixing Moon Patrol, Mega Man, and Ninja Gaiden with the Mad Bitcoins hero.

## Run

1. Open `/Users/curiobot/Sites/1n2.org/madpatrol2/index.html` in a browser.
2. No install required, no paid APIs, no external libraries.

## Controls

- `Arrow Left/Right`: Run or throttle (vehicle stage)
- `A` or `Shift`: Run button for walking stages
- `Arrow Up` or `C`: Jump
- `Arrow Down`: Low jump in vehicle stage
- `Z` or `Space`: Attack (guns or sword, depending on stage)
- `X`: Up-shot (vehicle + blaster stages)
- `M`: Toggle music on/off
- `Esc`: Pause/unpause
- `F`: Toggle fullscreen

## Included

- 7 connected hybrid stages:
  - Stage 1: Moon Patrol-style car combat with classic speed control, denser powerups, and upgraded enemies.
  - Stage 2: Ground-only run-and-gun (no pits) with forward-facing Ninja Gaiden style stance.
  - Stage 3: Sword-only Ninja Gaiden style combat (no pits), combo slashes, and ninja swarms.
  - Stage 4-5: R-Type / Gradius inspired flight-shooter stages.
  - Stage 6-7: Bionic Commando inspired grapple-arm combat stages.
- Moon Patrol stages support upward fire (`X`) in addition to forward fire.
- Mario-inspired elements remain available in platform-heavy walking stages.
- Stage-aware music reuses the included Afterburner tracks at slower/faster playback rates per stage.
- Three in-game retro experts compare design against Moon Patrol, Blaster Master, and Ninja Gaiden; a “big meeting” panel shows the applied improvements.
- Mad Patrol legacy weapon pickups included (spread, wave, giant, nuke), plus shield/health/bitcoin bonuses.
- Included soundtrack files (Afterburner variants) now play in-game with stage-aware track switching.
- Deterministic hooks for automated testing:
  - `window.render_game_to_text()`
  - `window.advanceTime(ms)`
