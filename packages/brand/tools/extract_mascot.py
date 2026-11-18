"""Cuts each pose of Ugi, the UGNAYA Assistant, out of the owner's mascot board as a separate transparent PNG,
and writes src/mascot.ts (names and pixel sizes). Pillow only:

  python3 packages/brand/tools/extract_mascot.py "documents/UGI Mascot Board.png" packages/brand/assets/mascot

The board is the source of truth; nothing is redrawn. Method (for smooth, not stepped, edges):
  1. each pose is enlarged 4x with Lanczos filtering, so its outline becomes a smooth gradient;
  2. the background is found at that size by filling inward from the crop's edges through near-white pixels
     (Ugi's white face and suit are enclosed by darker edges, so they stay opaque), plus the soft floor shadow;
  3. small fragments touching the crop edge are dropped (bits of neighbouring art);
  4. the mask is pulled in slightly (no pale rim), softened, and scaled down to the export size, which gives
     anti-aliased edges; the board's white is then removed from half-transparent edge pixels (no halo on dark).
"""
import json
import os
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

BOARD, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
WORK = 4      # working enlargement
EXPORT = 2    # exported at twice the board's pixel size
ERODE = int(os.environ.get('UGI_ERODE', '11'))     # 9 at 4x = about one board pixel
BLUR = float(os.environ.get('UGI_BLUR', '2.6'))
ONLY = os.environ.get('UGI_ONLY')

# (left, top, right, bottom) on the 1536 x 1024 board. Labels under the expressions are left out; the hero's crop
# stops just short of the speech bubble but leaves room for the whole raised hand.
POSES = {
    'default':     (22, 22, 559, 690),
    'front':       (895, 270, 1100, 590),
    'side':        (1110, 270, 1300, 590),
    'back':        (1300, 270, 1510, 590),
    'happy':       (28, 690, 262, 932),
    'wink':        (290, 690, 512, 932),
    'thinking':    (515, 680, 728, 932),
    'excited':     (745, 680, 1005, 932),
    'helpful':     (1020, 690, 1262, 932),
    'celebrating': (1285, 690, 1515, 932),
}

board = Image.open(BOARD).convert('RGB')

# Neighbouring art painted out before cutting (board coordinates): the speech bubble's tail beside the hero pose.
ERASE = {'default': [(528, 396, 560, 458)]}
paint = ImageDraw.Draw(board)
for boxes in ERASE.values():
    for erase_box in boxes:
        paint.rectangle(erase_box, fill=(254, 254, 254))


def background_candidates(im: Image.Image) -> Image.Image:
    """255 where a pixel could be background: near-white, or (near the bottom) the light grey floor shadow."""
    r, g, b = im.split()
    lo = ImageChops.darker(ImageChops.darker(r, g), b)
    hi = ImageChops.lighter(ImageChops.lighter(r, g), b)
    spread = ImageChops.subtract(hi, lo)
    # The board's paper is almost pure white (254-255, untinted); Ugi's white suit is never brighter than ~250 and is
    # slightly tinted. A looser rule leaked into his sleeves and ate part of the forearm.
    white = ImageChops.multiply(lo.point(lambda v: 255 if v >= 249 else 0), spread.point(lambda v: 255 if v <= 6 else 0))
    shadow = ImageChops.multiply(lo.point(lambda v: 255 if v >= 196 else 0), spread.point(lambda v: 255 if v <= 26 else 0))
    floor = Image.new('L', im.size, 0)
    ImageDraw.Draw(floor).rectangle((0, int(im.height * 0.86), im.width, im.height), fill=255)
    return ImageChops.lighter(white, ImageChops.multiply(shadow, floor))


def fill_from_edges(mask: Image.Image, value: int) -> None:
    """Flood-fills (in place) every 255-region of `mask` that touches the border with `value`."""
    w, h = mask.size
    px = mask.load()
    for x in range(w):
        for y in (0, h - 1):
            if px[x, y] == 255: ImageDraw.floodfill(mask, (x, y), value, thresh=0)
    for y in range(h):
        for x in (0, w - 1):
            if px[x, y] == 255: ImageDraw.floodfill(mask, (x, y), value, thresh=0)


sizes = {}
for name, box in POSES.items():
    if ONLY and name != ONLY:
        continue
    crop = board.crop(box)
    w, h = crop.size
    big = crop.resize((w * WORK, h * WORK), Image.LANCZOS)
    W, H = big.size

    # Background = candidate pixels connected to the crop's edges.
    cand = background_candidates(big)
    fill_from_edges(cand, 128)
    fg = cand.point(lambda v: 0 if v == 128 else 255)          # 255 = Ugi (and his sparkles)

    # Drop small foreground fragments touching the edge (neighbouring art), keep everything else.
    probe = fg.copy()
    fill_from_edges(probe, 100)
    edge_parts = probe.point(lambda v: 255 if v == 100 else 0)
    if edge_parts.getbbox():
        labels = edge_parts.copy()
        lp = labels.load()
        next_id, small = 1, []
        for y in range(H):
            for x in range(W):
                if lp[x, y] == 255:
                    ImageDraw.floodfill(labels, (x, y), next_id, thresh=0)
                    next_id += 1
                    if next_id > 250: break
            if next_id > 250: break
        hist = labels.histogram()
        small = [i for i in range(1, next_id) if hist[i] < 400 * WORK * WORK]
        if small:
            drop = labels.point(lambda v: 255 if v in small else 0)
            fg = ImageChops.subtract(fg, drop)

    # Pull the edge in a little (no pale rim), soften, and scale down: smooth, anti-aliased alpha.
    # Trim the board's anti-aliased rim (half Ugi, half white paper, which reads as light jagged specks on dark), then
    # soften: the edge comes from the smoothed mask, not from the raster's rim.
    fg = fg.filter(ImageFilter.MinFilter(ERODE)).filter(ImageFilter.GaussianBlur(BLUR))
    size = (w * EXPORT, h * EXPORT)
    alpha = fg.resize(size, Image.LANCZOS)
    rgb = big.resize(size, Image.LANCZOS)

    # Remove the board's white from half-transparent edge pixels so no light halo shows on dark backgrounds.
    paper = (250, 250, 252)
    rp, ap = rgb.load(), alpha.load()
    for y in range(size[1]):
        for x in range(size[0]):
            a = ap[x, y]
            if 0 < a < 250:
                f = a / 255
                rp[x, y] = tuple(max(0, min(255, round((c - (1 - f) * pc) / f))) for c, pc in zip(rp[x, y], paper))
    out = rgb.convert('RGBA')
    out.putalpha(alpha)
    out = out.crop(out.getbbox())
    out.save(os.path.join(OUT, f'{name}.png'), optimize=True)
    sizes[name] = out.size
    print(name, out.size)

if ONLY:
    sys.exit(0)
here = os.path.dirname(os.path.abspath(__file__))
ts = """// Generated by tools/extract_mascot.py from the owner's mascot board. Do not edit by hand.
// Ugi, the UGNAYA Assistant. Each pose is a separate transparent PNG in assets/mascot (pixel sizes below).
// The board shows these ten; the brief's other expressions (confused, sad, surprised, welcoming, pointing,
// explaining, thumbs up) are not on it and are not drawn here: they need new artwork from the illustrator.

export const UGI_POSES = %s as const;

export type UgiPose = keyof typeof UGI_POSES;
""" % json.dumps({k: {'width': v[0], 'height': v[1]} for k, v in sizes.items()}, indent=2)
open(os.path.join(here, '..', 'src', 'mascot.ts'), 'w').write(ts)
print('wrote src/mascot.ts')
