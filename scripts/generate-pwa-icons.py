"""Regenerate the checked-in PWA raster assets from the Healthy mark.

Requires Pillow: python -m pip install Pillow
"""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "public" / "icons"
SCALE = 4
SIZE = 512 * SCALE
BACKGROUND = "#101010"
FOREGROUND = "#f7f7f7"


def point(x: int, y: int) -> tuple[int, int]:
    return x * SCALE, y * SCALE


def round_line(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], width: int) -> None:
    scaled = [point(x, y) for x, y in points]
    radius = width * SCALE / 2
    draw.line(scaled, fill=FOREGROUND, width=width * SCALE, joint="curve")
    for x, y in scaled:
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=FOREGROUND)


def render(maskable: bool) -> Image.Image:
    image = Image.new("RGB", (SIZE, SIZE), BACKGROUND)
    draw = ImageDraw.Draw(image)

    if not maskable:
        draw.rounded_rectangle(
            (14 * SCALE, 14 * SCALE, 498 * SCALE, 498 * SCALE),
            radius=108 * SCALE,
            outline="#404040",
            width=8 * SCALE,
        )

    round_line(draw, [(143, 160), (143, 352)], 38)
    round_line(draw, [(369, 160), (369, 352)], 38)
    round_line(draw, [(143, 267), (215, 267), (241, 213), (276, 312), (301, 267), (369, 267)], 34)
    return image


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    regular = render(maskable=False)
    maskable = render(maskable=True)

    for size in (192, 512):
        regular.resize((size, size), Image.Resampling.LANCZOS).save(ICONS / f"icon-{size}.png", optimize=True)
        maskable.resize((size, size), Image.Resampling.LANCZOS).save(ICONS / f"icon-maskable-{size}.png", optimize=True)

    regular.resize((180, 180), Image.Resampling.LANCZOS).save(ROOT / "public" / "apple-touch-icon.png", optimize=True)
    regular.save(ROOT / "public" / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])


if __name__ == "__main__":
    main()
