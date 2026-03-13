#include <genesis.h>
#include "resources.h"

#define MAX_ENEMIES 14
#define MAX_SHOTS 12

typedef struct
{
    s16 x, y;
    s16 vx, vy;
    u16 active;
    Sprite *spr;
} Actor;

static Actor player;
static Actor enemies[MAX_ENEMIES];
static Actor shots[MAX_SHOTS];

static s32 score = 0;
static s16 lives = 3;
static u16 wave = 1;
static u16 spawnClock = 0;
static u16 fireClock = 0;

static u16 hitBox(const Actor *a, const Actor *b, s16 size)
{
    if (!a->active || !b->active) return FALSE;
    if (a->x + size < b->x) return FALSE;
    if (a->x > b->x + size) return FALSE;
    if (a->y + size < b->y) return FALSE;
    if (a->y > b->y + size) return FALSE;
    return TRUE;
}

static void fireShot(void)
{
    u16 i;

    for (i = 0; i < MAX_SHOTS; i++)
    {
        if (!shots[i].active)
        {
            shots[i].active = TRUE;
            shots[i].x = player.x + 10;
            shots[i].y = player.y - 6;
            shots[i].vy = -5;
            SPR_setVisibility(shots[i].spr, VISIBLE);
            return;
        }
    }
}

static void spawnEnemy(void)
{
    u16 i;

    for (i = 0; i < MAX_ENEMIES; i++)
    {
        if (!enemies[i].active)
        {
            enemies[i].active = TRUE;
            enemies[i].x = 16 + (random() % 286);
            enemies[i].y = -18;
            enemies[i].vy = 1 + (random() % 2) + (wave / 4);
            SPR_setVisibility(enemies[i].spr, VISIBLE);
            return;
        }
    }
}

int main(void)
{
    u16 i;

    JOY_init();
    SPR_init();

    PAL_setPalette(PAL1, spr_player.palette->data, DMA);
    PAL_setPalette(PAL2, spr_enemy.palette->data, DMA);
    PAL_setPalette(PAL3, spr_shot.palette->data, DMA);

    player.active = TRUE;
    player.x = 152;
    player.y = 196;
    player.spr = SPR_addSprite(&spr_player, player.x, player.y, TILE_ATTR(PAL1, FALSE, FALSE, FALSE));

    for (i = 0; i < MAX_ENEMIES; i++)
    {
        enemies[i].active = FALSE;
        enemies[i].spr = SPR_addSprite(&spr_enemy, -32, -32, TILE_ATTR(PAL2, FALSE, FALSE, FALSE));
        SPR_setVisibility(enemies[i].spr, HIDDEN);
    }

    for (i = 0; i < MAX_SHOTS; i++)
    {
        shots[i].active = FALSE;
        shots[i].spr = SPR_addSprite(&spr_shot, -32, -32, TILE_ATTR(PAL3, FALSE, FALSE, FALSE));
        SPR_setVisibility(shots[i].spr, HIDDEN);
    }

    VDP_drawText("BULL SIGNAL BARRAGE", 8, 1);

    while (1)
    {
        u16 pad = JOY_readJoypad(JOY_1);

        if (lives > 0)
        {
            if (pad & BUTTON_LEFT) player.x -= 2;
            if (pad & BUTTON_RIGHT) player.x += 2;
            if (pad & BUTTON_UP) player.y -= 2;
            if (pad & BUTTON_DOWN) player.y += 2;

            if (player.x < 0) player.x = 0;
            if (player.x > 304) player.x = 304;
            if (player.y < 24) player.y = 24;
            if (player.y > 208) player.y = 208;

            if (fireClock > 0) fireClock--;
            if ((pad & BUTTON_B) && fireClock == 0)
            {
                fireShot();
                fireClock = 5;
            }

            spawnClock++;
            if (spawnClock >= (40 - MIN(20, wave * 2)))
            {
                spawnClock = 0;
                spawnEnemy();
            }

            for (i = 0; i < MAX_SHOTS; i++)
            {
                if (!shots[i].active) continue;

                shots[i].y += shots[i].vy;
                if (shots[i].y < -10)
                {
                    shots[i].active = FALSE;
                    SPR_setVisibility(shots[i].spr, HIDDEN);
                }
            }

            for (i = 0; i < MAX_ENEMIES; i++)
            {
                u16 j;

                if (!enemies[i].active) continue;

                enemies[i].y += enemies[i].vy;
                enemies[i].x += (fix16ToInt(sinFix16((enemies[i].y + i * 17) << 2)) >> 5);

                if (enemies[i].y > 230)
                {
                    enemies[i].active = FALSE;
                    SPR_setVisibility(enemies[i].spr, HIDDEN);
                    continue;
                }

                if (hitBox(&player, &enemies[i], 14))
                {
                    enemies[i].active = FALSE;
                    SPR_setVisibility(enemies[i].spr, HIDDEN);
                    lives--;
                    continue;
                }

                for (j = 0; j < MAX_SHOTS; j++)
                {
                    if (hitBox(&shots[j], &enemies[i], 10))
                    {
                        shots[j].active = FALSE;
                        enemies[i].active = FALSE;
                        SPR_setVisibility(shots[j].spr, HIDDEN);
                        SPR_setVisibility(enemies[i].spr, HIDDEN);
                        score += 100;

                        if ((score % 2000) == 0) wave++;
                        break;
                    }
                }
            }
        }
        else
        {
            VDP_drawText("GAME OVER", 14, 13);
        }

        SPR_setPosition(player.spr, player.x, player.y);

        for (i = 0; i < MAX_SHOTS; i++)
            if (shots[i].active) SPR_setPosition(shots[i].spr, shots[i].x, shots[i].y);

        for (i = 0; i < MAX_ENEMIES; i++)
            if (enemies[i].active) SPR_setPosition(enemies[i].spr, enemies[i].x, enemies[i].y);

        VDP_drawInt(score, 6, 2, 3);
        VDP_drawInt(lives, 6, 12, 3);
        VDP_drawInt(wave, 6, 21, 3);

        SPR_update();
        SYS_doVBlankProcess();
    }

    return 0;
}
