"""Outline text with HarfBuzz shaping (kerning) into one SVG path. Y is flipped so the baseline is y=0 and up is negative."""
import json, sys
import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

def outline(fontfile, text, wght, size, letter_spacing_em=0.0, italic_axes=None, features=None):
    blob = hb.Blob.from_file_path(fontfile)
    face = hb.Face(blob); font = hb.Font(face)
    variations = {'wght': wght}
    if italic_axes: variations.update(italic_axes)
    font.set_variations(variations)
    upem = face.upem
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf, features or {'kern': True, 'liga': False})
    pen = SVGPathPen(None, ntos=lambda v: f'{v:.1f}')
    k = size / upem
    x = 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        tp = TransformPen(pen, (k, 0, 0, -k, x + pos.x_offset * k, -pos.y_offset * k))
        font.draw_glyph_with_pen(info.codepoint, tp)
        x += pos.x_advance * k + letter_spacing_em * size
    return pen.getCommands(), x - letter_spacing_em * size

if __name__ == '__main__':
    out = {}
    M = sys.argv[1]
    for w in (700, 800):
        d, width = outline(M, 'UGNAYA', w, 1000)
        out[f'u{w}'] = {'d': d, 'width': round(width, 1)}
    json.dump(out, open(sys.argv[2], 'w'))
    print({k: v['width'] for k, v in out.items()})
