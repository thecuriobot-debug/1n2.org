#include <neslib.h>
#include <stdint.h>

#define MAX_ENEMIES 6
#define GROUND_Y 176

#pragma bss-name(push, "ZEROPAGE")
static uint8_t i;
#pragma bss-name(pop)

typedef struct
{
    int16_t x;
    int16_t y;
    int8_t vx;
    int8_t vy;
    uint8_t active;
} Actor;

static Actor player;
static Actor enemies[MAX_ENEMIES];

static uint16_t score = 0;
static uint8_t lives = 3;
static uint8_t words_collected = 0;
static uint8_t frame_clock = 0;

// Minimal 2x2 metasprite (placeholder tiles)
static const unsigned char player_meta[] = {
    0, 0, 0x00, 0,
    8, 0, 0x01, 0,
    0, 8, 0x10, 0,
    8, 8, 0x11, 0,
    128
};

static const unsigned char enemy_meta[] = {
    0, 0, 0x20, 0,
    8, 0, 0x21, 0,
    0, 8, 0x30, 0,
    8, 8, 0x31, 0,
    128
};

static uint8_t overlap(const Actor *a, const Actor *b)
{
    if (!a->active || !b->active) return 0;
    if (a->x + 12 < b->x) return 0;
    if (a->x > b->x + 12) return 0;
    if (a->y + 12 < b->y) return 0;
    if (a->y > b->y + 12) return 0;
    return 1;
}

static void reset_player(void)
{
    player.x = 32;
    player.y = GROUND_Y;
    player.vx = 0;
    player.vy = 0;
    player.active = 1;
}

static void spawn_enemy(void)
{
    for (i = 0; i < MAX_ENEMIES; i++)
    {
        if (!enemies[i].active)
        {
            enemies[i].active = 1;
            enemies[i].x = 248;
            enemies[i].y = GROUND_Y;
            enemies[i].vx = -1 - (frame_clock >> 6);
            enemies[i].vy = 0;
            return;
        }
    }
}

static void update_player(void)
{
    uint8_t pad = pad_poll(0);

    player.vx = 0;
    if (pad & PAD_LEFT) player.vx = -2;
    if (pad & PAD_RIGHT) player.vx = 2;

    if ((pad & PAD_A) && player.y >= GROUND_Y)
    {
        player.vy = -6;
    }

    player.vy += 1;
    if (player.vy > 4) player.vy = 4;

    player.x += player.vx;
    player.y += player.vy;

    if (player.x < 8) player.x = 8;
    if (player.x > 232) player.x = 232;

    if (player.y >= GROUND_Y)
    {
        player.y = GROUND_Y;
        player.vy = 0;
    }
}

static void update_enemies(void)
{
    for (i = 0; i < MAX_ENEMIES; i++)
    {
        if (!enemies[i].active) continue;

        enemies[i].x += enemies[i].vx;

        if (enemies[i].x < -16)
        {
            enemies[i].active = 0;
            continue;
        }

        if (overlap(&player, &enemies[i]))
        {
            enemies[i].active = 0;
            if (lives > 0) lives--;
            reset_player();
        }
    }
}

static void draw_sprites(void)
{
    uint8_t oam_id = 0;

    oam_clear();
    oam_id = oam_meta_spr((uint8_t)player.x, (uint8_t)player.y, oam_id, player_meta);

    for (i = 0; i < MAX_ENEMIES; i++)
    {
        if (!enemies[i].active) continue;
        oam_id = oam_meta_spr((uint8_t)enemies[i].x, (uint8_t)enemies[i].y, oam_id, enemy_meta);
    }
}

static void draw_hud(void)
{
    vram_adr(NAMETABLE_A);
    vram_write("SEED PHRASE SUBWAY", 17);

    vram_adr(NTADR_A(2, 2));
    vram_put(0x53); // S
    vram_put(0x3a); // :
    vram_adr(NTADR_A(4, 2));
    vram_put((score / 100) % 10 + 0x30);
    vram_put((score / 10) % 10 + 0x30);
    vram_put((score % 10) + 0x30);

    vram_adr(NTADR_A(12, 2));
    vram_put(0x4c); // L
    vram_put(0x3a); // :
    vram_put((lives % 10) + 0x30);

    vram_adr(NTADR_A(20, 2));
    vram_put(0x57); // W
    vram_put(0x3a); // :
    vram_put((words_collected % 10) + 0x30);
}

void main(void)
{
    ppu_off();

    pal_all((const unsigned char[]){
        0x0f,0x21,0x31,0x30,
        0x0f,0x16,0x27,0x38,
        0x0f,0x06,0x17,0x28,
        0x0f,0x09,0x19,0x29,
        0x0f,0x21,0x31,0x30,
        0x0f,0x16,0x27,0x38,
        0x0f,0x06,0x17,0x28,
        0x0f,0x09,0x19,0x29
    });

    // Placeholder nametable clear
    vram_adr(NAMETABLE_A);
    for (i = 0; i < 255; i++) vram_fill(0x24, 32);

    reset_player();
    for (i = 0; i < MAX_ENEMIES; i++) enemies[i].active = 0;

    draw_hud();
    ppu_on_all();

    while (1)
    {
        ppu_wait_nmi();

        if (lives == 0)
        {
            vram_adr(NTADR_A(10, 14));
            vram_write("GAME OVER", 9);
            if (pad_trigger(0) & PAD_START)
            {
                lives = 3;
                score = 0;
                words_collected = 0;
                reset_player();
                for (i = 0; i < MAX_ENEMIES; i++) enemies[i].active = 0;
                vram_adr(NTADR_A(10, 14));
                vram_write("         ", 9);
            }

            draw_sprites();
            continue;
        }

        frame_clock++;
        if ((frame_clock & 31) == 0) spawn_enemy();

        update_player();
        update_enemies();

        if ((frame_clock & 63) == 0)
        {
            words_collected++;
            score += 5;
        }
        else
        {
            score += 1;
        }

        draw_hud();
        draw_sprites();
    }
}
