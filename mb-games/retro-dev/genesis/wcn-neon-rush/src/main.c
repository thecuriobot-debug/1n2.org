#include <genesis.h>
#include "resources.h"

#define MAX_ENEMIES 16
#define MAX_SHOTS 12
#define MAX_PICKUPS 8

typedef struct
{
    s16 x, y;
    s16 vx, vy;
    s16 hp;
    u16 active;
    Sprite *spr;
} Actor;

static Actor player;
static Actor enemies[MAX_ENEMIES];
static Actor shots[MAX_SHOTS];
static Actor pickups[MAX_PICKUPS];

static s32 score = 0;
static s16 lives = 3;
static u16 wave = 1;
static u16 spawnClock = 0;
static u16 fireClock = 0;
static u16 charge = 0;

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
            shots[i].x = player.x + 6;
            shots[i].y = player.y - 8;
            shots[i].vy = -5;
            SPR_setVisibility(shots[i].spr, VISIBLE);
            return;
        }
    }
}

static void spawnPickup(s16 x, s16 y)
{
    u16 i;

    for (i = 0; i < MAX_PICKUPS; i++)
    {
        if (!pickups[i].active)
        {
            pickups[i].active = TRUE;
            pickups[i].x = x;
            pickups[i].y = y;
            pickups[i].vy = 1;
            SPR_setVisibility(pickups[i].spr, VISIBLE);
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
            enemies[i].x = 12 + (random() % 286);
            enemies[i].y = -18;
            enemies[i].vy = 1 + (random() % 2) + (wave / 5);
            enemies[i].vx = (random() % 3) - 1;
            enemies[i].hp = (wave > 5 && (random() % 4) == 0) ? 2 : 1;
            SPR_setVisibility(enemies[i].spr, VISIBLE);
            return;
        }
    }
}

static void pulseBlast(void)
{
    u16 i;

    if (charge < 100) return;
    charge = 0;

    for (i = 0; i < MAX_ENEMIES; i++)
    {
        if (!enemies[i].active) continue;
        enemies[i].active = FALSE;
        SPR_setVisibility(enemies[i].spr, HIDDEN);
        score += 90;
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
    PAL_setPalette(PAL4, spr_pickup.palette->data, DMA);

    VDP_drawText("WCN NEON RUSH", 12, 1);
    VDP_drawText("SCORE", 1, 3);
    VDP_drawText("LIVES", 10, 3);
    VDP_drawText("WAVE", 20, 3);
    VDP_drawText("CHARGE", 30, 3);

    player.active = TRUE;
    player.x = 152;
    player.y = 198;
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

    for (i = 0; i < MAX_PICKUPS; i++)
    {
        pickups[i].active = FALSE;
        pickups[i].spr = SPR_addSprite(&spr_pickup, -32, -32, TILE_ATTR(PAL4, FALSE, FALSE, FALSE));
        SPR_setVisibility(pickups[i].spr, HIDDEN);
    }

    while (1)
    {
        u16 j;
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
            if ((pad & (BUTTON_B | BUTTON_C)) && fireClock == 0)
            {
                fireShot();
                fireClock = 4;
            }

            if (pad & BUTTON_A) pulseBlast();

            spawnClock++;
            if (spawnClock >= (38 - MIN(20, wave * 2)))
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
                if (!enemies[i].active) continue;

                enemies[i].y += enemies[i].vy;
                enemies[i].x += enemies[i].vx + (fix16ToInt(sinFix16((enemies[i].y + i * 15) << 2)) >> 6);

                if (enemies[i].x < 0) enemies[i].x = 0;
                if (enemies[i].x > 304) enemies[i].x = 304;

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
                    if (lives > 0) lives--;
                    continue;
                }

                for (j = 0; j < MAX_SHOTS; j++)
                {
                    if (!shots[j].active) continue;
                    if (!hitBox(&shots[j], &enemies[i], 10)) continue;

                    shots[j].active = FALSE;
                    SPR_setVisibility(shots[j].spr, HIDDEN);
                    enemies[i].hp--;
                    score += 25;

                    if (enemies[i].hp <= 0)
                    {
                        enemies[i].active = FALSE;
                        SPR_setVisibility(enemies[i].spr, HIDDEN);
                        score += 80;
                        charge = MIN(100, charge + 8);
                        if ((random() % 100) < 24) spawnPickup(enemies[i].x, enemies[i].y);
                    }
                    break;
                }
            }

            for (i = 0; i < MAX_PICKUPS; i++)
            {
                if (!pickups[i].active) continue;

                pickups[i].y += pickups[i].vy;
                if (pickups[i].y > 230)
                {
                    pickups[i].active = FALSE;
                    SPR_setVisibility(pickups[i].spr, HIDDEN);
                    continue;
                }

                if (hitBox(&player, &pickups[i], 10))
                {
                    pickups[i].active = FALSE;
                    SPR_setVisibility(pickups[i].spr, HIDDEN);
                    score += 40;
                    charge = MIN(100, charge + 14);
                }
            }

            if (score > 0 && (score % 2200) == 0) wave++;
        }
        else
        {
            VDP_drawText("GAME OVER", 15, 14);
            VDP_drawText("A: PULSE  B/C: FIRE", 9, 16);
        }

        SPR_setPosition(player.spr, player.x, player.y);

        for (i = 0; i < MAX_SHOTS; i++)
            if (shots[i].active) SPR_setPosition(shots[i].spr, shots[i].x, shots[i].y);

        for (i = 0; i < MAX_ENEMIES; i++)
            if (enemies[i].active) SPR_setPosition(enemies[i].spr, enemies[i].x, enemies[i].y);

        for (i = 0; i < MAX_PICKUPS; i++)
            if (pickups[i].active) SPR_setPosition(pickups[i].spr, pickups[i].x, pickups[i].y);

        VDP_drawInt(score, 7, 3, 5);
        VDP_drawInt(lives, 7, 16, 3);
        VDP_drawInt(wave, 7, 25, 3);
        VDP_drawInt(charge, 7, 35, 3);

        SPR_update();
        SYS_doVBlankProcess();
    }

    return 0;
}
