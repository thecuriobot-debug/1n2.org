# Bear Market Breakout
Platform: Atari 2600 (4K-friendly design target)
Genre: Arcade brick-breaker
Studio: MAD BITCOINS RETRO GAME LAB

## Core Fantasy
You are a hardcore HODL trader smashing a wall of red-candle FUD. Every bounce that survives the panic builds momentum toward a "To The Moon" bonus round.

## Core Loop
1. Launch bitcoin-ball from hardware-wallet paddle.
2. Break bear bricks while keeping the ball alive.
3. Collect meme drops (`HODL`, `LASER`, `MOON`) for short boosts.
4. Clear wave, survive speed increase, repeat.

## Controls (Atari Joystick)
- Left/Right: Move paddle
- Fire: Launch ball / trigger held powerup
- Game Select: Difficulty / speed mode
- Reset: New run

## Mechanics
- Paddle movement: horizontal only, responsive 1:1 joystick feel.
- Ball physics: simple angle variation based on impact zone on paddle.
- Brick tiers:
  - Red FUD bricks: 10 points
  - Whale bricks: 20 points, require 2 hits
  - ETF bricks: 50 points, chance to drop powerup
- Powerups:
  - `HODL`: paddle widens for 8 seconds
  - `LASER`: one straight beam every 1 second for 6 seconds
  - `MOON`: x2 score multiplier until ball loss
- Lives: 3 by default.

## Difficulty Progression
- Wave 1-2: standard speed
- Wave 3-4: +15% ball speed, more Whale bricks
- Wave 5+: +25% speed, mixed hard layouts and narrow paddle base

## Scoring
- Brick value + combo streak bonus
- 1000 point wave clear bonus
- 5000 point perfect wave (no ball lost)
- Extra life every 20,000 points

## Visual Direction
- High-contrast Atari palette with red-dominant danger tiles
- Chunky one-screen visuals and flashing warning colors
- Signature HUD text: `HODL`, `STACK SATS`, `TO THE MOON`

## Audio Direction
- Fast pulse square-wave loop
- Distinct hits for basic vs heavy bricks
- Rising pitch stinger on combo chain
- Sharp fail sound on ball loss

## Shipping Modes
- Mode A: Classic
- Mode B: Chaos (faster spawn rates for powerups + increased ball speed)
- Score attack focus, no story interruptions
