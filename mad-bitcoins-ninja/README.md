# Mad Bitcoins: Shadow of the Blockchain

Second and third pass browser prototype for an NES-style action platformer with an authored NES pixel-art rendering pass.

## Run
From the `mad-bitcoins-ninja` directory:

```bash
python3 -m http.server 8080
```

Open: `http://localhost:8080/`

Load any stage with:
- `http://localhost:8080/?stage=1`
- `http://localhost:8080/?stage=2`
- `http://localhost:8080/?stage=3`
- `http://localhost:8080/?stage=4`
- `http://localhost:8080/?stage=5`
- `http://localhost:8080/?stage=6`

## Controls
- Move: Arrow keys or `A`/`D`
- Run: `Shift`
- Jump: `Space` or `Z`
- Cane Sword: `X`
- Heavy Slash: `V`
- Sub Weapon: `C`
- Cycle sub weapon: `Q`
- Cutscene demo: `Enter`

## Implemented in this pass
- Integer-scaled 256x240 canvas for crisp pixel output
- Offscreen backbuffer render pipeline for true nearest-neighbor scaling on high-DPI displays
- Custom bitmap text renderer for HUD and cutscenes
- Enhanced retro visuals: skyline parallax, moon/rain atmosphere, stage-specific tile textures, CRT scanlines
- Authored sprite maps for Mad Bitcoins and enemy archetypes
- Side-scrolling stage camera
- Player movement: walk, run, jump, wall slide, wall jump, climb
- Health, knockback, lives, sats, extra life at 1000 sats
- Phase 2 enemy AI pass: archetype-specific behavior and enemy projectiles
- Fear debuff system from FUD Ghost attacks
- Phase 3 combat pass:
  - 3-hit cane sword combo chain
  - Heavy slash attack (`V`)
  - Improved melee hitboxes and knockback tuning
- Sub-weapons:
  - Throwing Bitcoins
  - Blockchain Bomb
  - Lightning Wallet
  - Ledger Laser
- Items/powerups:
  - Hardware Wallet
  - HODL Mode
  - Satoshi Spirit
  - Lightning Mode
- Stage JSON pipeline for 6 stages
- Boss and cutscene framework stubs for next phases

## Next production targets
1. Stage-specific miniboss scripts and full boss attack phases
2. Secret doors and Private Key Scroll routing
3. Sprite sheets, tilesets, and chiptune/audio pipeline
4. Full stage transition cutscene sequencing
