"""Trace the UGNAYA symbol from the brand board into clean vector pieces (python3 trace_mark.py <board.png> <outdir>).
Needs Pillow only. The board is a raster, so this rebuilds the artwork as four gradient-filled ribbon pieces.
Output: pieces.json (path d + gradient per piece, in a 1000-wide viewBox) and debug label map."""
import json, math, sys
from PIL import Image, ImageFilter, ImageChops

BOARD = sys.argv[1]   # the brand board image (documents/UGNAYA Brand Identity Showcase.png)
OUT = sys.argv[2]     # a folder for pieces.json and labels.png
S = 4                      # upscale factor
CX0, CY0, CX1, CY1 = 40, 65, 310, 325    # crop with margin (board px)
src = Image.open(BOARD).convert('RGB').crop((CX0, CY0, CX1, CY1))
W, H = src.width * S, src.height * S
big = src.resize((W, H), Image.BICUBIC)

# ---- ink mask (non-white) -------------------------------------------------
r, g, b = big.split()
minc = ImageChops.darker(ImageChops.darker(r, g), b)
ink = minc.point(lambda v: 255 if v < 168 else 0).filter(ImageFilter.GaussianBlur(2)).point(lambda v: 255 if v > 127 else 0)

# ---- label by hue, then fix with position rules ---------------------------
hsv = big.convert('HSV')
hh, ss, vv = hsv.split()
hp, ip = hh.load(), ink.load()
sp = ss.load()
lab = Image.new('L', (W, H), 0)
lp = lab.load()
# local board coords of the old study map: x_local = (px/S + CX0) - 50 ; y_local = (py/S + CY0) - 75
def local(px, py): return px / S + CX0 - 50, py / S + CY0 - 75
for y in range(H):
    for x in range(W):
        if not ip[x, y]: continue
        h = hp[x, y] * 360 / 255
        if 255 <= h <= 305 or h >= 305: c = 1            # P
        elif 195 <= h < 255: c = 3                       # B
        elif h < 35 or h > 335: c = 2                    # O
        else: c = 4                                      # Y
        lx, ly = local(x, y)
        if c == 4 and ly < 130: c = 2                    # yellow end of the orange arch
        if c == 1 and lx >= 96 and ly >= 138: c = 3      # dark violet start of the blue ribbon
        if c == 2 and ly >= 140: c = 4 if lx < 100 else 3
        lp[x, y] = c
lab = lab.filter(ImageFilter.ModeFilter(13))
lab.point(lambda v: v * 60).save(OUT + '/labels.png')

# ---- per-piece masks, overlapped into neighbours inside the silhouette -----
names = {1: 'purple', 2: 'orange', 3: 'blue', 4: 'yellow'}
order = [1, 3, 4, 2]       # bottom to top: purple, blue, yellow foot, orange stem
masks = {}
for k in names:
    m = lab.point(lambda v, k=k: 255 if v == k else 0)
    grown = m.filter(ImageFilter.MaxFilter(11)) # ~1.4 board px of overlap into neighbours
    grown = ImageChops.multiply(grown, ink)
    masks[k] = ImageChops.lighter(m, grown).filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v > 127 else 0)

# ---- Moore-neighbour contour tracing ---------------------------------------
def trace(mask):
    px = mask.load()
    w, h = mask.size
    start = None
    for y in range(h):
        for x in range(w):
            if px[x, y]:
                start = (x, y); break
        if start: break
    dirs = [(-1,0),(-1,-1),(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1)]   # clockwise from W
    def inside(x, y): return 0 <= x < w and 0 <= y < h and px[x, y]
    pts = [start]
    cur = start
    back = 0   # came from west
    first_move = None
    while True:
        found = False
        for i in range(8):
            d = (back + 1 + i) % 8
            nx, ny = cur[0] + dirs[d][0], cur[1] + dirs[d][1]
            if inside(nx, ny):
                back = (d + 4 + 0) % 8   # direction pointing back to the previous pixel
                # start search from the neighbour after the backtrack position
                back = (d + 5) % 8 - 1
                back %= 8
                cur = (nx, ny); found = True; break
        if not found: break
        if cur == start and len(pts) > 2: break
        pts.append(cur)
        if len(pts) > 200000: break
    return pts

def smooth(pts, win):
    n = len(pts); out = []
    for i in range(n):
        sx = sy = 0.0
        for j in range(-win, win + 1):
            p = pts[(i + j) % n]; sx += p[0]; sy += p[1]
        out.append((sx / (2 * win + 1), sy / (2 * win + 1)))
    return out

# ---- corner detection ------------------------------------------------------
def corners(pts, k=16, thresh=62):
    n = len(pts); res = []
    ang = []
    for i in range(n):
        a = pts[(i - k) % n]; p = pts[i]; c = pts[(i + k) % n]
        v1 = (p[0]-a[0], p[1]-a[1]); v2 = (c[0]-p[0], c[1]-p[1])
        d = math.degrees(abs(math.atan2(v1[0]*v2[1]-v1[1]*v2[0], v1[0]*v2[0]+v1[1]*v2[1])))
        ang.append(d)
    for i in range(n):
        if ang[i] >= thresh and ang[i] == max(ang[(i + j) % n] for j in range(-k, k + 1)):
            if not res or i - res[-1] > k: res.append(i)
    return res

# ---- Schneider cubic Bezier fitting ---------------------------------------
def v_sub(a,b): return (a[0]-b[0], a[1]-b[1])
def v_add(a,b): return (a[0]+b[0], a[1]+b[1])
def v_mul(a,s): return (a[0]*s, a[1]*s)
def dot(a,b): return a[0]*b[0]+a[1]*b[1]
def norm(a): return math.hypot(a[0], a[1])
def unit(a):
    n = norm(a); return (a[0]/n, a[1]/n) if n else (0.0, 0.0)
def bez(c, t):
    mt = 1 - t
    return (mt**3*c[0][0]+3*mt*mt*t*c[1][0]+3*mt*t*t*c[2][0]+t**3*c[3][0],
            mt**3*c[0][1]+3*mt*mt*t*c[1][1]+3*mt*t*t*c[2][1]+t**3*c[3][1])
def bez1(c, t):
    mt = 1 - t
    return tuple(3*mt*mt*(c[1][i]-c[0][i])+6*mt*t*(c[2][i]-c[1][i])+3*t*t*(c[3][i]-c[2][i]) for i in (0,1))
def bez2(c, t):
    mt = 1 - t
    return tuple(6*mt*(c[2][i]-2*c[1][i]+c[0][i])+6*t*(c[3][i]-2*c[2][i]+c[1][i]) for i in (0,1))
def chord(pts):
    u = [0.0]
    for i in range(1, len(pts)): u.append(u[-1] + norm(v_sub(pts[i], pts[i-1])))
    return [x / u[-1] for x in u]
def gen(pts, u, t1, t2):
    p0, p3 = pts[0], pts[-1]
    A = [(v_mul(t1, 3*(1-x)**2*x), v_mul(t2, 3*(1-x)*x*x)) for x in u]
    C = [[0,0],[0,0]]; X = [0,0]
    for i, x in enumerate(u):
        C[0][0] += dot(A[i][0],A[i][0]); C[0][1] += dot(A[i][0],A[i][1]); C[1][1] += dot(A[i][1],A[i][1])
        tmp = v_sub(pts[i], v_add(v_mul(p0, (1-x)**3+3*(1-x)**2*x), v_mul(p3, 3*(1-x)*x*x+x**3)))
        X[0] += dot(A[i][0], tmp); X[1] += dot(A[i][1], tmp)
    C[1][0] = C[0][1]
    det = C[0][0]*C[1][1]-C[1][0]*C[0][1]
    seg = norm(v_sub(p3, p0))
    if abs(det) > 1e-12:
        a1 = (X[0]*C[1][1]-X[1]*C[0][1])/det; a2 = (C[0][0]*X[1]-C[1][0]*X[0])/det
    else: a1 = a2 = 0
    eps = 1e-6*seg
    if a1 < eps or a2 < eps: a1 = a2 = seg/3
    return [p0, v_add(p0, v_mul(t1, a1)), v_add(p3, v_mul(t2, a2)), p3]
def reparam(c, pts, u):
    out = []
    for p, x in zip(pts, u):
        d = v_sub(bez(c, x), p); d1 = bez1(c, x); d2 = bez2(c, x)
        num = dot(d, d1); den = dot(d1, d1) + dot(d, d2)
        out.append(x - num/den if den else x)
    return out
def maxerr(c, pts, u):
    m, idx = 0.0, len(pts)//2
    for i, (p, x) in enumerate(zip(pts, u)):
        e = norm(v_sub(bez(c, x), p))**2
        if e > m: m, idx = e, i
    return m, idx
def fit(pts, t1, t2, err):
    if len(pts) == 2:
        d = norm(v_sub(pts[1], pts[0]))/3
        return [[pts[0], v_add(pts[0], v_mul(t1, d)), v_add(pts[1], v_mul(t2, d)), pts[1]]]
    u = chord(pts); c = gen(pts, u, t1, t2)
    m, idx = maxerr(c, pts, u)
    if m < err: return [c]
    if m < err*16:
        for _ in range(6):
            u = reparam(c, pts, u); c = gen(pts, u, t1, t2)
            m, idx = maxerr(c, pts, u)
            if m < err: return [c]
    idx = min(max(idx, 1), len(pts)-2)
    tc = unit(v_sub(pts[idx-1], pts[idx+1]))
    return fit(pts[:idx+1], t1, tc, err) + fit(pts[idx:], v_mul(tc, -1), t2, err)

def fit_closed(pts, err):
    n = len(pts)
    cs = corners(pts)
    if not cs:   # smooth loop: split into two halves at far-apart points
        cs = [0, n // 2]
    cs = sorted(cs)
    segs = []
    k = 6
    for a, bidx in zip(cs, cs[1:] + [cs[0] + n]):
        section = [pts[i % n] for i in range(a, bidx + 1)]
        t1 = unit(v_sub(section[min(k, len(section)-1)], section[0]))
        t2 = unit(v_sub(section[max(-k-1, -len(section))], section[-1]))
        segs += fit(section, t1, t2, err)
    return segs

def to_path(segs, sx, sy, ox, oy):
    f = lambda p: f"{(p[0]-ox)*sx:.1f} {(p[1]-oy)*sy:.1f}"
    d = 'M' + f(segs[0][0])
    for c in segs: d += 'C' + f(c[1]) + ' ' + f(c[2]) + ' ' + f(c[3])
    return d + 'Z'

# ---- run -------------------------------------------------------------------
allpts = {}
for k in names:
    raw = trace(masks[k])
    B = smooth(smooth(smooth(raw, 12), 12), 12)
    A = smooth(smooth(smooth(raw, 40), 40), 40)   # very straight where the outline is straight
    n = len(B); L = 45
    alpha = []
    for i in range(n):
        p0, p1, p2 = B[(i - L) % n], B[i], B[(i + L) % n]
        v1 = (p1[0]-p0[0], p1[1]-p0[1]); v2 = (p2[0]-p1[0], p2[1]-p1[1])
        th = math.degrees(abs(math.atan2(v1[0]*v2[1]-v1[1]*v2[0], v1[0]*v2[0]+v1[1]*v2[1])))
        alpha.append(min(1.0, max(0.0, (22 - th) / 14)))      # 1 when nearly straight, 0 when turning
    alpha = [sum(alpha[(i + j) % n] for j in range(-25, 26)) / 51 for i in range(n)]
    pts = [(alpha[i]*A[i][0] + (1-alpha[i])*B[i][0], alpha[i]*A[i][1] + (1-alpha[i])*B[i][1]) for i in range(n)]
    pts = smooth(pts, 6)
    pts = pts[::3]
    allpts[k] = pts
xs = [p[0] for k in allpts for p in allpts[k]]; ys = [p[1] for k in allpts for p in allpts[k]]
ox, oy = min(xs), min(ys); width = max(xs) - ox; height = max(ys) - oy
VB = 1000.0; sc = VB / width
res = {'viewBox': [0, 0, VB, round(height * sc, 1)], 'pieces': {}}
bigpx = big.load()
for k in order:
    segs = fit_closed(allpts[k], 20.0)
    path = to_path(segs, sc, sc, ox, oy)
    # gradient fit on the eroded core of the unexpanded label
    core = lab.point(lambda v, k=k: 255 if v == k else 0).filter(ImageFilter.MinFilter(9))
    cp = core.load(); samples = []
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            if cp[x, y]: samples.append((x, y, bigpx[x, y]))
    best = None
    for ang in range(0, 180, 10):
        a = math.radians(ang); dx, dy = math.cos(a), math.sin(a)
        proj = [x*dx + y*dy for x, y, _ in samples]
        lo, hi = min(proj), max(proj)
        bins = [[0,0,0,0] for _ in range(10)]
        for (x, y, c), pj in zip(samples, proj):
            bi = min(9, int((pj-lo)/(hi-lo+1e-9)*10)); bins[bi][0]+=c[0]; bins[bi][1]+=c[1]; bins[bi][2]+=c[2]; bins[bi][3]+=1
        means = [tuple(bb[i]/bb[3] for i in range(3)) if bb[3] else None for bb in bins]
        var = 0.0
        for (x, y, c), pj in zip(samples, proj):
            bi = min(9, int((pj-lo)/(hi-lo+1e-9)*10)); m = means[bi]
            var += sum((c[i]-m[i])**2 for i in range(3))
        if best is None or var < best[0]: best = (var, ang, lo, hi, means, dx, dy)
    var, ang, lo, hi, means, dx, dy = best
    means = [m for m in means]
    # five stops
    stops = []
    for t in (0.05, 0.27, 0.5, 0.73, 0.95):
        m = means[min(9, int(t*10))]
        if m is None: continue
        stops.append([round(t, 2), '#%02X%02X%02X' % tuple(int(round(v)) for v in m)])
    # endpoints in output coordinates
    def out(px_, py_): return ((px_ - ox) * sc, (py_ - oy) * sc)
    x1, y1 = out(dx*lo, dy*lo) if False else (0, 0)
    # points on the projection axis through the piece centre
    cx = sum(x for x, y, _ in samples)/len(samples); cy = sum(y for x, y, _ in samples)/len(samples)
    cproj = cx*dx + cy*dy
    p1 = (cx + dx*(lo-cproj), cy + dy*(lo-cproj)); p2 = (cx + dx*(hi-cproj), cy + dy*(hi-cproj))
    (gx1, gy1), (gx2, gy2) = out(*p1), out(*p2)
    res['pieces'][names[k]] = {'d': path, 'angle': ang, 'grad': {'x1': round(gx1,1), 'y1': round(gy1,1), 'x2': round(gx2,1), 'y2': round(gy2,1), 'stops': stops}, 'nodes': len(segs)}
json.dump(res, open(OUT + '/pieces.json', 'w'), indent=1)
print({k: (v['nodes'], v['angle']) for k, v in res['pieces'].items()}, res['viewBox'])
