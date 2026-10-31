"""High-resolution terrain (25 m mesh) + 'orthophoto' texture (~8 m).
Inputs: SRTM (3"), inverted bed (100 m). Outputs: base_hr (bed incl. detail), texture JPEG.
"""
import sys; sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import numpy as np
from scipy import ndimage as ndi
from PIL import Image, ImageFilter
import prep

DL = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else '.'
prep.a = prep.tifffile.imread(DL + '/hef_srtm.tif').astype(float)
rng = np.random.default_rng(7)

inv = np.load('bed.npz'); B100 = inv['B']; Hinv = inv['H']
base = np.load('base.npz'); z100 = base['z100']
ny100, nx100 = z100.shape
F = 5                                   # mesh = 25 m (coarse 125 m)
nyh, nxh = ny100 * F, nx100 * F

def up(a, f, order=1):
    # sample cell-centred coarse grid at cell-centred fine grid
    n0, n1 = a.shape
    j = (np.arange(n0 * f) + 0.5) / f - 0.5
    i = (np.arange(n1 * f) + 0.5) / f - 0.5
    J, I = np.meshgrid(j, i, indexing='ij')
    return ndi.map_coordinates(a, [J, I], order=order, mode='nearest')

def vnoise(shape, cell, seed):
    r = np.random.default_rng(seed)
    g = r.standard_normal((shape[0] // cell + 3, shape[1] // cell + 3))
    j = np.arange(shape[0]) / cell + 1; i = np.arange(shape[1]) / cell + 1
    J, I = np.meshgrid(j, i, indexing='ij')
    return ndi.map_coordinates(g, [J, I], order=3, mode='wrap')

def fbm(shape, cell, octaves, seed, ridged=False):
    out = np.zeros(shape); amp = 1.0; tot = 0
    for o in range(octaves):
        n = vnoise(shape, max(1, cell >> o), seed + o)
        if ridged: n = 1 - np.abs(n)
        out += amp * n; tot += amp; amp *= 0.5
    return out / tot

# ---------- high-res surface (SRTM bicubic at 25 m) ----------
zs, _, _ = prep.sample(25.0, order=3)
zs = zs[:nyh, :nxh]
# ice thickness removed -> bed
Hhr = ndi.gaussian_filter(up(Hinv, F, 3), 2.0); Bc = up(B100, F, 1)
bed = zs - ndi.gaussian_filter(np.maximum(0, up(z100 - B100, F, 3)), 2.5)
gy, gx = np.gradient(bed, 25.0)
slope = np.degrees(np.arctan(np.hypot(gx, gy)))
rock = np.clip((slope - 22) / 18, 0, 1)
# detail: ridged rock structure on steep slopes, gentle roughness elsewhere,
# smooth (glacially polished) where ice was present
ridged = fbm(bed.shape, 16, 4, 11, ridged=True) - 0.55
soft = fbm(bed.shape, 8, 3, 21)
under = np.clip(Hhr / 30, 0, 1)
detail = (rock * 14 * ridged + 3.0 * soft) * (1 - 0.7 * under)
basehr = bed + detail

# ---------- hydrology: flow accumulation (D8) on filled DEM ----------
def fill(z):
    # simple priority-flood
    import heapq
    ny, nx = z.shape; zf = z.copy(); done = np.zeros(z.shape, bool); h = []
    for j in range(ny):
        for i in (0, nx - 1):
            heapq.heappush(h, (zf[j, i], j, i)); done[j, i] = True
    for i in range(nx):
        for j in (0, ny - 1):
            if not done[j, i]:
                heapq.heappush(h, (zf[j, i], j, i)); done[j, i] = True
    while h:
        v, j, i = heapq.heappop(h)
        for dj, di in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
            jj, ii = j + dj, i + di
            if 0 <= jj < ny and 0 <= ii < nx and not done[jj, ii]:
                done[jj, ii] = True
                zf[jj, ii] = max(zf[jj, ii], v + 1e-3)
                heapq.heappush(h, (zf[jj, ii], jj, ii))
    return zf

zf = fill(ndi.gaussian_filter(bed, 1.0))
ny, nx = zf.shape
order = np.argsort(zf, axis=None)[::-1]
acc = np.ones(ny * nx)
zflat = zf.ravel()
nb = []
for dj, di in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
    nb.append((dj, di, np.hypot(dj, di)))
# steepest descent receiver
rec = np.full(ny * nx, -1)
best = np.zeros(ny * nx)
Jj, Ii = np.divmod(np.arange(ny * nx), nx)
for dj, di, dd in nb:
    jj = Jj + dj; ii = Ii + di
    ok = (jj >= 0) & (jj < ny) & (ii >= 0) & (ii < nx)
    k = np.where(ok, jj * nx + ii, 0)
    s = np.where(ok, (zflat - zflat[k]) / dd, -1)
    m = s > best
    best[m] = s[m]; rec[m] = k[m]
for k in order:
    r = rec[k]
    if r >= 0: acc[r] += acc[k]
acc = acc.reshape(ny, nx) * 625 / 1e6      # km2
stream = np.clip((np.log10(acc + 1e-9) - np.log10(0.6)) / 1.2, 0, 1)
basehr -= 4 * stream                      # incise channels a little

np.save('basehr.npy', basehr.astype(np.float32))
np.save('acc.npy', acc.astype(np.float32))
print('basehr', basehr.shape, basehr.min(), basehr.max())

# ---------- orthophoto texture at 8.33 m (3 x mesh) ----------
T = 3
def upt(a, order=1): return up(a, T, order)
zt = upt(basehr)
gy, gx = np.gradient(zt, 25.0 / T)
sl = np.degrees(np.arctan(np.hypot(gx, gy)))
# insolation proxy (south-facing = warm)
asp_s = np.clip(-gy / np.maximum(np.hypot(gx, gy), 1e-6), -1, 1) * np.clip(sl / 30, 0, 1)
cv = ndi.laplace(ndi.gaussian_filter(bed, 3.0)); cv = cv / cv.std()
cvn = upt(cv)
strm = upt(stream)
under_t = upt(under)
shp = zt.shape
r2 = np.random.default_rng(5)
# line-integral convolution of white noise along the fall line -> gullies / debris streaks
gl = np.hypot(gx, gy) + 1e-6; ux, uy = gx / gl, gy / gl
ux = ndi.gaussian_filter(ux, 3); uy = ndi.gaussian_filter(uy, 3)
wn = ndi.gaussian_filter(r2.random(shp), 1.3); wn = (wn - wn.mean()) / wn.std() * 0.29 + 0.5
J, I = np.meshgrid(np.arange(shp[0], dtype=np.float32), np.arange(shp[1], dtype=np.float32), indexing='ij')
lic = np.zeros(shp); L = 9
for k in range(-L, L + 1):
    lic += ndi.map_coordinates(wn, [J + uy * k * 1.2, I + ux * k * 1.2], order=1, mode='reflect')
lic = (lic / (2 * L + 1) - 0.5) * np.sqrt(2 * L + 1) * 2   # ~unit variance
lic = np.clip(lic, -2.5, 2.5)
grain = ndi.gaussian_filter(r2.random(shp), 0.7) - 0.5
lith = fbm(shp, 220, 3, 61)          # lithology patches (~600 m)
patch = fbm(shp, 18, 4, 71)          # 50-150 m patches
fine = fbm(shp, 4, 3, 81)
def col(h): return np.array([int(h[i:i+2], 16) for i in (1, 3, 5)], float) / 255
C = dict(rock=col('#6e6860'), rock_b=col('#5d5c59'), rock_lt=col('#8f887d'), scree=col('#9d988f'), scree_dk=col('#827d75'),
         meadow=col('#6c7a40'), meadow_dry=col('#8a8650'), shrub=col('#4f5530'), forest=col('#2c3a24'),
         till=col('#8d887f'), water=col('#8aa3a6'), soil=col('#7a7258'))
asp_s = np.clip(-gy / gl, -1, 1) * np.clip(sl / 25, 0, 1)        # +1 south facing
rockf = np.clip((sl - 31 + 3 * patch) / 9, 0, 1)
screef = (1 - rockf) * np.clip((sl - 17 + 4 * patch) / 7, 0, 1) * np.clip(0.8 - 0.25 * cvn, 0, 1)
tl = 2560 + 200 * asp_s + 90 * lith
veg = np.clip((tl - zt) / 220 + 0.25 * patch, 0, 1) * np.clip((36 - sl) / 9, 0, 1)
veg = np.clip(veg * 1.25 - 0.08 * np.clip(cvn, -2, 2), 0, 1)
forest = np.clip((2080 + 60 * asp_s - zt) / 120, 0, 1) * np.clip((38 - sl) / 10, 0, 1) * (fine > 0.3)
rk = C['rock'] * (1 - lith[..., None] * 0.25) + C['rock_b'] * (lith[..., None] * 0.25)
rk = rk * (0.88 + 0.05 * lic[..., None] + 0.10 * grain[..., None])
rk = rk + (C['rock_lt'] - rk) * np.clip(-cvn * 0.35, 0, 0.6)[..., None] - 0.05 * np.clip(cvn, 0, 2)[..., None]
sc = C['scree'] * (1 - np.clip(patch, 0, 1)[..., None] * 0.2) + C['scree_dk'] * np.clip(patch, 0, 1)[..., None] * 0.2
sc = sc * (0.93 + 0.035 * lic[..., None] + 0.12 * grain[..., None])
bare = rk * rockf[..., None] + sc * screef[..., None] + (C['soil'] * (0.9 + 0.1 * patch[..., None] + 0.1 * grain[..., None])) * (1 - rockf - screef)[..., None]
under_c = C['till'] * (0.92 + 0.12 * grain[..., None] + 0.05 * lic[..., None])
bare = bare * (1 - under_t[..., None]) + under_c * under_t[..., None]
dry = np.clip(asp_s * 0.8 + 0.2 * patch, 0, 1)[..., None]
grass = C['meadow'] * (1 - dry) + C['meadow_dry'] * dry
grass = grass * (0.9 + 0.12 * fine[..., None] + 0.08 * grain[..., None])
grass = grass + (C['shrub'] - grass) * np.clip((2350 - zt) / 250, 0, 0.7)[..., None]
img = bare * (1 - veg[..., None]) + grass * veg[..., None]
img = img * (1 - forest[..., None]) + C['forest'] * (0.85 + 0.3 * fine[..., None]) * forest[..., None]
w = np.clip(strm * 1.5 - 0.3, 0, 1) * (zt < 3000)
img = img * (1 - w[..., None]) + C['water'] * w[..., None]
img *= np.clip(1 - 0.05 * np.clip(cvn, -2, 3), 0.85, 1.08)[..., None]
img = np.clip(img, 0, 1)
im = Image.fromarray((img ** (1 / 1.0) * 255).astype(np.uint8))
im = im.filter(ImageFilter.UnsharpMask(radius=1.0, percent=40, threshold=2))
im.save(OUT + '/ortho.jpg', quality=86, optimize=True, progressive=True)
im.resize((im.width // 4, im.height // 4)).save(OUT + '/ortho_small.png')
print('texture', im.size)
