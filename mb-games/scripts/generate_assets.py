from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]


def load_font(size: int):
    candidates = [
        "/System/Library/Fonts/Supplemental/Courier New Bold.ttf",
        "/System/Library/Fonts/Supplemental/Andale Mono.ttf",
        "/System/Library/Fonts/Menlo.ttc",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT_XL = load_font(52)
FONT_L = load_font(36)
FONT_M = load_font(24)
FONT_S = load_font(16)


def text_with_shadow(draw, pos, text, font, fill, shadow=(0, 0, 0)):
    x, y = pos
    draw.text((x + 2, y + 2), text, font=font, fill=shadow)
    draw.text((x, y), text, font=font, fill=fill)


def save(img: Image.Image, rel: str):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return path


def draw_coin(draw, center, r=10, color=(255, 194, 46)):
    cx, cy = center
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color, outline=(120, 80, 0), width=2)
    text_with_shadow(draw, (cx - r // 2, cy - r // 2), "B", FONT_S, fill=(70, 40, 0), shadow=(255, 225, 170))


def make_bear_gameplay():
    w, h = 640, 480
    img = Image.new("RGB", (w, h), (6, 16, 38))
    draw = ImageDraw.Draw(img)

    # Starfield
    for i in range(160):
        x = (i * 37) % w
        y = (i * 91) % h
        c = 120 + (i % 90)
        draw.rectangle((x, y, x + 1, y + 1), fill=(c, c, c))

    # HUD
    draw.rectangle((0, 0, w, 44), fill=(20, 28, 52))
    text_with_shadow(draw, (14, 10), "BEAR MARKET BREAKOUT", FONT_M, (255, 197, 79))
    text_with_shadow(draw, (380, 10), "SCORE 001280", FONT_S, (195, 220, 255))

    # Bricks
    cols, rows = 10, 6
    bw, bh = 56, 20
    start_x, start_y = 24, 68
    for r in range(rows):
        for c in range(cols):
            x = start_x + c * (bw + 4)
            y = start_y + r * (bh + 4)
            red = 180 + r * 10
            draw.rectangle((x, y, x + bw, y + bh), fill=(red, 40 + c * 3, 45), outline=(255, 110, 110))
            if (r + c) % 3 == 0:
                draw.rectangle((x + 22, y + 4, x + 34, y + 16), fill=(255, 205, 60), outline=(120, 80, 0))
                draw.text((x + 25, y + 5), "B", font=FONT_S, fill=(70, 45, 0))

    # Paddle as hardware wallet
    paddle_x, paddle_y = 250, 430
    draw.rounded_rectangle((paddle_x, paddle_y, paddle_x + 140, paddle_y + 22), radius=8, fill=(140, 154, 164), outline=(45, 52, 62), width=3)
    draw.rectangle((paddle_x + 50, paddle_y + 6, paddle_x + 90, paddle_y + 16), fill=(40, 60, 40), outline=(18, 22, 18))

    # Ball coin
    draw_coin(draw, (320, 395), r=12)

    # Bear icon
    draw.ellipse((520, 365, 620, 455), fill=(92, 52, 38), outline=(30, 18, 12), width=3)
    draw.ellipse((540, 345, 560, 365), fill=(92, 52, 38), outline=(30, 18, 12), width=3)
    draw.ellipse((580, 345, 600, 365), fill=(92, 52, 38), outline=(30, 18, 12), width=3)
    draw.ellipse((550, 390, 565, 405), fill=(255, 255, 255))
    draw.ellipse((575, 390, 590, 405), fill=(255, 255, 255))
    draw.ellipse((555, 395, 562, 402), fill=(0, 0, 0))
    draw.ellipse((580, 395, 587, 402), fill=(0, 0, 0))

    text_with_shadow(draw, (20, 448), "HODL x3", FONT_S, (150, 245, 165))
    text_with_shadow(draw, (110, 448), "BALL x2", FONT_S, (195, 220, 255))
    text_with_shadow(draw, (210, 448), "TO THE MOON BONUS READY", FONT_S, (255, 224, 112))

    save(img, "assets/bear_market_breakout/gameplay_mockup.png")


def make_bear_cartridge_label():
    w, h = 700, 900
    img = Image.new("RGB", (w, h), (10, 10, 12))
    draw = ImageDraw.Draw(img)

    # Retro stripe
    stripe_colors = [(228, 64, 64), (236, 120, 48), (240, 193, 64), (86, 196, 104), (96, 164, 242)]
    for i, col in enumerate(stripe_colors):
        draw.rectangle((40 + i * 28, 80, 80 + i * 28, 820), fill=col)

    draw.rectangle((220, 90, 660, 810), fill=(22, 26, 40), outline=(230, 190, 80), width=4)
    text_with_shadow(draw, (240, 130), "BEAR MARKET", FONT_L, (255, 209, 88))
    text_with_shadow(draw, (240, 175), "BREAKOUT", FONT_L, (255, 209, 88))
    text_with_shadow(draw, (240, 220), "ATARI 2600", FONT_M, (177, 208, 255))

    # Center art
    draw.rounded_rectangle((270, 520, 610, 560), radius=10, fill=(138, 150, 160), outline=(35, 42, 52), width=4)
    draw.rectangle((410, 532, 470, 548), fill=(40, 56, 40), outline=(20, 24, 18))
    draw_coin(draw, (450, 470), r=20)
    draw.rectangle((286, 390, 594, 430), fill=(176, 52, 60), outline=(245, 102, 102), width=3)

    text_with_shadow(draw, (240, 730), "HODL. BREAK FUD.", FONT_M, (152, 245, 160))
    text_with_shadow(draw, (240, 770), "MAD BITCOINS RETRO GAME LAB", FONT_S, (210, 210, 220))

    save(img, "assets/bear_market_breakout/cartridge_label.png")


def make_bear_cartridge_mock():
    w, h = 900, 1200
    img = Image.new("RGB", (w, h), (20, 22, 30))
    draw = ImageDraw.Draw(img)

    # Cartridge body
    draw.rounded_rectangle((160, 90, 740, 1110), radius=24, fill=(38, 40, 48), outline=(85, 90, 105), width=6)
    draw.rectangle((220, 180, 680, 930), fill=(16, 16, 20), outline=(120, 120, 132), width=4)

    # Grooves
    for i in range(8):
        y = 960 + i * 18
        draw.rectangle((240, y, 660, y + 8), fill=(22, 24, 32))

    # Label inset from generated label
    label = Image.open(ROOT / "assets/bear_market_breakout/cartridge_label.png").resize((420, 540))
    img.paste(label, (240, 250))

    text_with_shadow(draw, (240, 1030), "ATARI 2600 CARTRIDGE MOCK", FONT_S, (180, 188, 210))
    save(img, "assets/bear_market_breakout/cartridge_mockup.png")


def make_mempool_gameplay():
    w, h = 512, 480
    img = Image.new("RGB", (w, h), (10, 8, 24))
    draw = ImageDraw.Draw(img)

    draw.rectangle((0, 0, w, 36), fill=(32, 30, 58))
    text_with_shadow(draw, (10, 9), "MEMPOOL MELTDOWN", FONT_M, (146, 208, 255))
    text_with_shadow(draw, (315, 10), "ROUND 07", FONT_S, (255, 231, 140))

    gx, gy = 40, 52
    cell = 20
    cols, rows = 10, 20
    draw.rectangle((gx - 2, gy - 2, gx + cols * cell + 2, gy + rows * cell + 2), fill=(30, 36, 60), outline=(130, 156, 220), width=3)

    colors = [
        (90, 185, 255),
        (255, 120, 100),
        (130, 250, 120),
        (250, 225, 110),
        (194, 140, 255),
    ]

    # Grid fill with staged blocks
    for r in range(rows):
        for c in range(cols):
            x = gx + c * cell
            y = gy + r * cell
            draw.rectangle((x, y, x + cell - 1, y + cell - 1), outline=(45, 55, 85))
            if r > 11 and (r + c) % 3 != 0:
                col = colors[(r + c) % len(colors)]
                draw.rectangle((x + 2, y + 2, x + cell - 3, y + cell - 3), fill=col, outline=(255, 255, 255))

    # Falling pair
    fx, fy = gx + 4 * cell, gy + 5 * cell
    draw.rectangle((fx + 2, fy + 2, fx + cell - 3, fy + cell - 3), fill=(255, 120, 100), outline=(255, 255, 255))
    draw.rectangle((fx + 2, fy - cell + 2, fx + cell - 3, fy - 3), fill=(90, 185, 255), outline=(255, 255, 255))

    # Side panel
    panel_x = 290
    draw.rectangle((panel_x, 52, 490, 452), fill=(24, 30, 50), outline=(112, 142, 200), width=3)
    text_with_shadow(draw, (305, 70), "NEXT", FONT_S, (174, 232, 255))
    draw.rectangle((305, 92, 375, 162), fill=(40, 50, 80), outline=(120, 140, 200))
    draw.rectangle((316, 106, 338, 128), fill=(130, 250, 120), outline=(255, 255, 255))
    draw.rectangle((342, 106, 364, 128), fill=(194, 140, 255), outline=(255, 255, 255))

    text_with_shadow(draw, (305, 188), "MEMPOOL", FONT_S, (255, 231, 140))
    draw.rectangle((305, 210, 475, 230), fill=(45, 45, 58), outline=(180, 180, 200))
    draw.rectangle((307, 212, 452, 228), fill=(255, 90, 90))

    text_with_shadow(draw, (305, 258), "CHAIN x4", FONT_S, (140, 248, 165))
    text_with_shadow(draw, (305, 285), "SATS 004920", FONT_S, (178, 214, 255))
    text_with_shadow(draw, (305, 350), "NOT YOUR KEYS", FONT_S, (255, 180, 126))
    text_with_shadow(draw, (305, 372), "NOT YOUR COINS", FONT_S, (255, 180, 126))

    save(img, "assets/mempool_meltdown/gameplay_mockup.png")


def make_mempool_box_art():
    w, h = 900, 1200
    img = Image.new("RGB", (w, h), (14, 16, 34))
    draw = ImageDraw.Draw(img)

    # NES style frame
    draw.rectangle((50, 50, 850, 1150), fill=(225, 225, 225), outline=(60, 60, 70), width=5)
    draw.rectangle((95, 95, 805, 1030), fill=(20, 24, 42), outline=(120, 130, 180), width=4)
    draw.rectangle((95, 1035, 805, 1090), fill=(185, 35, 35))

    text_with_shadow(draw, (110, 1052), "NINTENDO ENTERTAINMENT SYSTEM", FONT_S, (255, 255, 255), shadow=(60, 0, 0))
    text_with_shadow(draw, (120, 130), "MEMPOOL", FONT_XL, (120, 206, 255))
    text_with_shadow(draw, (120, 188), "MELTDOWN", FONT_XL, (120, 206, 255))

    # Central puzzle motif
    gx, gy = 170, 320
    for r in range(8):
        for c in range(6):
            x = gx + c * 82
            y = gy + r * 68
            col = [(90, 185, 255), (255, 120, 100), (130, 250, 120), (250, 225, 110)][(r + c) % 4]
            draw.rectangle((x, y, x + 64, y + 50), fill=col, outline=(240, 240, 255), width=3)

    text_with_shadow(draw, (120, 930), "SORT TX. CLEAR BLOCKS. SAVE THE CHAIN.", FONT_M, (255, 226, 140))
    text_with_shadow(draw, (120, 975), "MAD BITCOINS RETRO GAME LAB", FONT_S, (200, 210, 235))

    save(img, "assets/mempool_meltdown/box_art_front.png")


def make_mempool_cartridge_label():
    w, h = 700, 900
    img = Image.new("RGB", (w, h), (22, 24, 42))
    draw = ImageDraw.Draw(img)

    draw.rectangle((40, 40, 660, 860), fill=(235, 235, 238), outline=(50, 50, 60), width=5)
    draw.rectangle((78, 78, 622, 742), fill=(18, 24, 46), outline=(112, 128, 186), width=4)

    text_with_shadow(draw, (100, 105), "MEMPOOL", FONT_L, (120, 206, 255))
    text_with_shadow(draw, (100, 150), "MELTDOWN", FONT_L, (120, 206, 255))

    # mini block motif
    for i in range(5):
        x = 110 + i * 96
        draw.rectangle((x, 310, x + 74, 374), fill=(255, 120, 100), outline=(255, 255, 255), width=3)
        draw.rectangle((x, 390, x + 74, 454), fill=(90, 185, 255), outline=(255, 255, 255), width=3)

    draw.rectangle((78, 760, 622, 820), fill=(185, 35, 35))
    text_with_shadow(draw, (96, 780), "NES CART LABEL MOCK", FONT_S, (255, 255, 255), shadow=(50, 0, 0))

    save(img, "assets/mempool_meltdown/cartridge_label.png")


def make_mempool_cartridge_mock():
    w, h = 900, 1200
    img = Image.new("RGB", (w, h), (30, 32, 46))
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle((180, 80, 720, 1120), radius=22, fill=(86, 90, 102), outline=(140, 146, 162), width=5)
    draw.rectangle((220, 170, 680, 980), fill=(120, 126, 144), outline=(168, 174, 186), width=4)
    draw.rectangle((250, 1010, 650, 1065), fill=(64, 68, 80))

    label = Image.open(ROOT / "assets/mempool_meltdown/cartridge_label.png").resize((420, 540))
    img.paste(label, (240, 260))

    text_with_shadow(draw, (250, 1088), "NES CARTRIDGE MOCKUP", FONT_S, (220, 226, 240))
    save(img, "assets/mempool_meltdown/cartridge_mockup.png")


def make_marketing_posters():
    # Poster 1
    w, h = 1080, 1350
    img1 = Image.new("RGB", (w, h), (10, 10, 18))
    d1 = ImageDraw.Draw(img1)
    for y in range(h):
        t = y / h
        col = (int(24 + 80 * t), int(18 + 30 * t), int(20 + 10 * t))
        d1.line((0, y, w, y), fill=col)
    text_with_shadow(d1, (90, 100), "BEAR MARKET BREAKOUT", FONT_XL, (255, 210, 90))
    text_with_shadow(d1, (90, 170), "SMASH FUD. STACK SATS.", FONT_L, (180, 245, 165))
    d1.rectangle((80, 250, 1000, 980), fill=(22, 24, 36), outline=(210, 150, 90), width=4)
    gp = Image.open(ROOT / "assets/bear_market_breakout/gameplay_mockup.png").resize((860, 620))
    img1.paste(gp, (110, 300))
    text_with_shadow(d1, (90, 1040), "ATARI 2600 STYLE | COMING SOON", FONT_M, (210, 220, 245))
    text_with_shadow(d1, (90, 1084), "#HODL #MADBITCOINS #RETROGAMES", FONT_M, (255, 176, 110))
    save(img1, "marketing/poster_bear_market_breakout.png")

    # Poster 2
    img2 = Image.new("RGB", (w, h), (8, 12, 28))
    d2 = ImageDraw.Draw(img2)
    for y in range(h):
        t = y / h
        col = (int(12 + 20 * t), int(18 + 40 * t), int(35 + 80 * t))
        d2.line((0, y, w, y), fill=col)
    text_with_shadow(d2, (80, 100), "MEMPOOL MELTDOWN", FONT_XL, (130, 215, 255))
    text_with_shadow(d2, (80, 170), "CLEAR CHAINS BEFORE PANIC", FONT_L, (255, 230, 130))
    d2.rectangle((70, 250, 1010, 980), fill=(18, 28, 50), outline=(110, 170, 240), width=4)
    gp2 = Image.open(ROOT / "assets/mempool_meltdown/gameplay_mockup.png").resize((860, 620))
    img2.paste(gp2, (110, 300))
    text_with_shadow(d2, (80, 1040), "NES STYLE | ARCADE PUZZLE CHAOS", FONT_M, (216, 226, 250))
    text_with_shadow(d2, (80, 1084), "#BUYBITCOIN #NES #PIXELART", FONT_M, (255, 188, 120))
    save(img2, "marketing/poster_mempool_meltdown.png")


def main():
    make_bear_gameplay()
    make_bear_cartridge_label()
    make_bear_cartridge_mock()

    make_mempool_gameplay()
    make_mempool_box_art()
    make_mempool_cartridge_label()
    make_mempool_cartridge_mock()

    make_marketing_posters()


if __name__ == "__main__":
    main()
