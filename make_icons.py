"""Generate anti-aliased Substack Inbox icons via supersampling."""

from pathlib import Path

from PIL import Image, ImageDraw

ORANGE = (255, 103, 25, 255)
WHITE = (255, 255, 255, 255)
MASTER = 1024
SIZES = (16, 32, 48, 128)


def draw_master() -> Image.Image:
    s = MASTER
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = 0
    radius = int(s * 0.22)
    draw.rounded_rectangle(
        [pad, pad, s - 1 - pad, s - 1 - pad],
        radius=radius,
        fill=ORANGE,
    )

    # Envelope body: rounded tray
    left, right = int(s * 0.22), int(s * 0.78)
    top, bottom = int(s * 0.42), int(s * 0.72)
    body_r = max(8, int(s * 0.04))
    stroke = max(12, int(s * 0.055))

    draw.rounded_rectangle(
        [left, top, right, bottom],
        radius=body_r,
        outline=WHITE,
        width=stroke,
    )

    # Inner slot
    slot_left, slot_right = int(s * 0.32), int(s * 0.68)
    slot_y0, slot_y1 = int(s * 0.54), int(s * 0.62)
    draw.rounded_rectangle(
        [slot_left, slot_y0, slot_right, slot_y1],
        radius=max(4, int(s * 0.02)),
        fill=WHITE,
    )

    # Flap: chevron that overlaps the tray so the joints stay closed after downsample
    peak_x, peak_y = s // 2, int(s * 0.28)
    flap_y = top + stroke // 2
    flap_left = (left + stroke // 3, flap_y)
    flap_right = (right - stroke // 3, flap_y)
    flap_w = max(12, int(s * 0.055))
    draw.line([flap_left, (peak_x, peak_y), flap_right], fill=WHITE, width=flap_w, joint="curve")

    return img


def main() -> None:
    out = Path(__file__).resolve().parent
    master = draw_master()
    for size in SIZES:
        icon = master.resize((size, size), Image.Resampling.LANCZOS)
        path = out / f"icon-{size}.png"
        icon.save(path, "PNG", optimize=True)
        print(f"{path.name} {size}x{size} {path.stat().st_size}B")


if __name__ == "__main__":
    main()
