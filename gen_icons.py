"""生成 PWA 图标：紫粉径向渐变 + 四角星芒"""
import math
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
os.makedirs(OUT, exist_ok=True)

C1 = (139, 124, 246)   # #8b7cf6
C2 = (231, 138, 210)   # #e78ad2


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make(size, path, rounded=False):
    img = Image.new("RGB", (size, size), C1)
    px = img.load()
    cx = cy = size / 2
    maxd = math.hypot(cx, cy)
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx * 0.7, y - cy * 0.7) / maxd
            px[x, y] = lerp(C1, C2, min(1.0, d))

    mask = Image.new("L", (size, size), 255)
    if rounded:
        m = Image.new("L", (size, size), 0)
        ImageDraw.Draw(m).rounded_rectangle(
            [0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255
        )
        mask = m

    draw = ImageDraw.Draw(img)

    def star(cx, cy, r_long, r_short, rot=0.0):
        pts = []
        for i in range(8):
            ang = rot + i * math.pi / 4
            r = r_long if i % 2 == 0 else r_short
            pts.append((cx + r * math.sin(ang), cy - r * math.cos(ang)))
        draw.polygon(pts, fill=(255, 255, 255))

    # 主星
    star(size * 0.5, size * 0.52, size * 0.30, size * 0.075)
    # 小星
    star(size * 0.74, size * 0.26, size * 0.09, size * 0.025)
    star(size * 0.24, size * 0.30, size * 0.055, size * 0.016)

    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    out.save(path)
    print("saved", path)


make(192, os.path.join(OUT, "icon-192.png"), rounded=True)
make(512, os.path.join(OUT, "icon-512.png"), rounded=True)
make(512, os.path.join(OUT, "icon-512-maskable.png"), rounded=False)
