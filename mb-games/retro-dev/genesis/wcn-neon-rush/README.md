# WCN Neon Rush (Genesis / SGDK Starter)

Fast vertical shooter prototype themed around World Crypto Network signal defense.

## Files
- `src/main.c` - game loop, player movement, enemy spawn, shot/enemy collision, sprite updates.
- `res/resources.res` - SGDK sprite resource declarations.
- `res/*.png` - sprite sources for player, enemy, shot, and pickup.

## Build
```bash
export GDK=/path/to/sgdk
make -f $GDK/makefile.gen
```

## Output
- `out/rom.bin`

## Emulator Test
```bash
blastem out/rom.bin
# or
retroarch -L genesis_plus_gx_libretro.dylib out/rom.bin
```
