# Bull Signal Barrage (Genesis / SGDK Starter)

## Files
- `src/main.c` - game loop, player movement, spawn, collision, sprite updates.
- `res/resources.res` - sprite resource declarations.

## Build
```bash
export GDK=/path/to/sgdk
make -f $GDK/makefile.gen
```

## Output
- `out/rom.bin`

## Test
```bash
blastem out/rom.bin
# or
retroarch -L genesis_plus_gx_libretro.dylib out/rom.bin
```
