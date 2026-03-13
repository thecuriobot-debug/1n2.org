# Seed Phrase Subway Escape (NES-style starter)

## Files
- `src/main.c` - NES-style game loop with:
  - player movement/jump
  - enemy spawning
  - collision detection
  - metasprite drawing via OAM

## Expected toolchain
- `cc65` (ca65/ld65)
- `neslib` headers/libraries (common homebrew setup)

## Build outline
```bash
cd retro-dev/nes/seed-phrase-subway
# compile (example)
cc65 -Oirs src/main.c --add-source
ca65 main.s
ld65 -C nes.cfg -o seedphrase_subway.nes main.o nes.lib
```

## Test
```bash
mesen seedphrase_subway.nes
# or
fceux seedphrase_subway.nes
```

Note: This is a starter architecture file intended for integration with your existing NES build config and CHR assets.
