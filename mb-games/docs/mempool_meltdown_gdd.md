# Mempool Meltdown
Platform: NES
Genre: Falling-block puzzle strategy
Studio: MAD BITCOINS RETRO GAME LAB

## Core Fantasy
You are a node operator racing to keep the chain alive as transaction chaos floods the mempool. Speed and pattern reading decide whether the network survives.

## Core Loop
1. Place falling transaction blocks into a 10x20 grid.
2. Match fee tiers into valid block groups to clear rows/clusters.
3. Prevent mempool meter from maxing out.
4. Survive difficulty ramps and boss rounds.

## Controls (NES Pad)
- Left/Right: Move piece
- Down: Soft drop
- A/B: Rotate clockwise / counter-clockwise
- Start: Pause
- Select (menu): Switch mode

## Mechanics
- Piece types: 7 tetromino-like transaction sets, each with fee color coding.
- Clear rules:
  - Full row clear = standard block confirmation
  - Same-color 4+ cluster = fee-batch clear bonus
- Mempool pressure:
  - Rises over time and with inefficient placement
  - Drops after combo clears
- Special actions (meter based):
  - `SegWit Compress`: remove one random partial row
  - `Lightning Burst`: instant clear of bottom 2 rows, limited uses

## Boss Rounds
Every 5 rounds, a short "Fork Panic" event applies temporary modifiers:
- Reverse controls for 10 seconds
- Spawn junk blocks from top corners
- Increase gravity speed by one tier

## Modes
- Marathon: endless survival with escalating speed
- Challenge: 20 curated puzzles with strict move limits
- Versus CPU (optional stretch): race a bot mempool meter

## Scoring
- Single clear: 100 points
- Double clear: 250 points
- Triple clear: 500 points
- Quad clear: 900 points
- Chain multiplier: +20% per consecutive clear window
- End-round bonus: based on low mempool and time efficiency

## Visual Direction
- Clean readable 8-bit blocks with strong tile outlines
- Cool blue UI with red alert meter for overflow danger
- Meme callouts: `NOT YOUR KEYS, NOT YOUR COINS`, `BUY BITCOIN`

## Audio Direction
- Pulse-wave rhythmic loop with high BPM increase per speed tier
- Distinct per-clear tones with stacked harmony for chains
- Alarm sweep when mempool > 80%

## Difficulty Curve
- Rounds 1-3: onboarding pace
- Rounds 4-8: increasing gravity and junk chance
- Rounds 9+: aggressive pace with frequent Fork Panic events
