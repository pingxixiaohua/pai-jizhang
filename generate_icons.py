#!/usr/bin/env python3
"""Generate app icons for 派记账 — modern style with ¥ symbol using PIL."""

import struct
import zlib
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ICON_DIR = Path(__file__).parent / "src-tauri" / "icons"

# --- Colors ---
BG_START = (249, 115, 22)   # orange-500 #f97316
BG_END   = (234, 88, 12)    # orange-700 #ea580c
WHITE    = (255, 255, 255)
WHITE_A  = (255, 255, 255, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def create_rounded_gradient_icon(size: int) -> Image.Image:
    """Create a single icon frame: rounded-rect gradient + ¥ symbol."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # --- Rounded rectangle mask ---
    margin = max(1, size // 20)
    r = max(2, size // 5)  # corner radius — fairly round, modern look
    box_w = size - 2 * margin
    box_h = size - 2 * margin

    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [margin, margin, margin + box_w, margin + box_h],
        radius=r, fill=255,
    )

    # --- Gradient background ---
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    for y in range(size):
        t = max(0, min(1, (y - margin) / max(1, box_h - 1)))
        color = lerp(BG_START, BG_END, t)
        for x in range(size):
            if mask.getpixel((x, y)):
                bg.putpixel((x, y), (*color, 255))

    # --- Inner shadow / highlight at top ---
    highlight = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    h_draw = ImageDraw.Draw(highlight)
    # Draw a soft white arc at top for glass effect
    h_margin = margin + max(1, size // 18)
    h_draw.rounded_rectangle(
        [h_margin, h_margin, size - h_margin, size // 2],
        radius=r - max(1, size // 16),
        fill=(255, 255, 255, 35),
    )

    # Composite
    bg = Image.alpha_composite(bg, highlight)

    # --- ¥ Symbol ---
    # Find a good font
    font_paths = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansSC-Bold.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]

    font = None
    font_size = int(size * 0.58)  # ¥ takes ~58% of icon height
    for fp in font_paths:
        if Path(fp).exists():
            try:
                font = ImageFont.truetype(fp, font_size)
                break
            except Exception:
                continue

    if font is None:
        font = ImageFont.load_default()

    # Draw ¥ centered
    txt_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    txt_draw = ImageDraw.Draw(txt_layer)

    # Measure text to center it
    bbox = txt_draw.textbbox((0, 0), "¥", font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = (size - th) // 2 - bbox[1]

    # Shadow
    txt_draw.text((tx + max(1, size // 48), ty + max(1, size // 48)), "¥",
                  fill=(0, 0, 0, 60), font=font)
    # White ¥
    txt_draw.text((tx, ty), "¥", fill=WHITE_A, font=font)

    # Composite text onto background
    bg = Image.alpha_composite(bg, txt_layer)

    # --- Subtle border ---
    border = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(border)
    b_draw.rounded_rectangle(
        [margin, margin, margin + box_w, margin + box_h],
        radius=r, fill=None, outline=(255, 255, 255, 40),
        width=max(1, size // 64),
    )
    bg = Image.alpha_composite(bg, border)

    return bg


def write_png(img: Image.Image, path: str):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG")
    print(f"  ✓ {Path(path).name} ({img.width}×{img.height})")


def create_ico(icon_32: Image.Image, path: str):
    """Create .ico with 32×32 embedded PNG."""
    import io
    buf = io.BytesIO()
    icon_32.save(buf, "PNG")
    png_bytes = buf.getvalue()

    with open(path, "wb") as f:
        # ICO header
        f.write(struct.pack("<HHH", 0, 1, 1))
        # Entry
        f.write(struct.pack("<BBBBHHII", 32, 32, 0, 0, 1, 32, len(png_bytes), 6 + 16))
        f.write(png_bytes)
    print(f"  ✓ icon.ico")


def main():
    sizes = {
        "32x32.png": 32,
        "128x128.png": 128,
        "128x128@2x.png": 256,
    }

    icon_32 = None
    for name, size in sizes.items():
        img = create_rounded_gradient_icon(size)
        write_png(img, str(ICON_DIR / name))
        if size == 32:
            icon_32 = img

    # Windows .ico
    create_ico(icon_32, str(ICON_DIR / "icon.ico"))

    # macOS .icns placeholder (copy largest PNG)
    largest = Image.open(str(ICON_DIR / "128x128@2x.png"))
    largest.save(str(ICON_DIR / "icon.icns"), "PNG")
    print(f"  ✓ icon.icns (PNG copy)")

    print("\n✅ All icons generated!")


if __name__ == "__main__":
    main()
