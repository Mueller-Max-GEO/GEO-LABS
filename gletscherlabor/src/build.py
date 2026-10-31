import sys; sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import numpy as np, json, gzip, base64, io, shapefile
from scipy import ndimage as ndi

STATES = sys.argv[1]
TBIAS = float(sys.argv[2])
DL = sys.argv[3]
OUT = sys.argv[4]

b = np.load('base.npz'); t = np.load('terr100.npz'); bed = np.load('bed.npz'); st = np.load(STATES)
z = b['z100']; ny, nx = z.shape; dx = 125.0
LONW, LATN, kx, ky = float(b['LONW']), float(b['LATN']), float(b['kx']), float(b['ky'])
basehr = np.load('basehr.npy'); nyh, nxh = basehr.shape

def gz(arr): return base64.b64encode(gzip.compress(np.ascontiguousarray(arr).tobytes(), 9, mtime=0)).decode()
def f32(a): return gz(a.astype(np.float32))

enc = np.clip(np.round((basehr - 1000) * 8), 0, 65535).astype(np.uint16)
region = np.load('hefregion.npy')
seed = [int(st['seed'][1]), int(st['seed'][0])]

# flow direction of HEF: from highest to lowest outline cell, smoothed
hef = b['hef']
jj, ii = np.where(hef)
zz = z[hef]
hi = zz > np.percentile(zz, 85); lo = zz < np.percentile(zz, 10)
p0 = np.array([ii[hi].mean(), jj[hi].mean()]) * dx; p1 = np.array([ii[lo].mean(), jj[lo].mean()]) * dx
fd = (p1 - p0) / np.linalg.norm(p1 - p0)
cen = np.array([ii.mean() + 0.5, jj.mean() + 0.5]) * dx
tj, ti = np.unravel_index(np.argmin(np.where(hef, z, 1e9)), z.shape)
tongue = [(ti + 0.5) * dx, (tj + 0.5) * dx]
# long-section plane through the HEF centre line
nrm = np.array([-fd[1], fd[0]]);
if nrm[1] < 0: nrm = -nrm
Wm, Hm = nx * dx, ny * dx
cs = [c[0] * nrm[0] + c[1] * nrm[1] for c in ([0, 0], [Wm, 0], [Wm, Hm], [0, Hm])]
s = cen @ nrm + 60
cutLong = (s - min(cs)) / (max(cs) - min(cs))

# outline (RGI) in metres
r = shapefile.Reader(DL + '/hef', encoding='latin1'); shp = r.shapes()[0]
pts = shp.points[:shp.parts[1]]
outline = [[round((lon - LONW) * kx, 1), round((LATN - lat) * ky, 1)] for lon, lat in pts]

def geo(lon, lat): return (lon - LONW) * kx, (LATN - lat) * ky
labels = []
for n, lon, lat, h in [('Weißkugel', 10.7272, 46.7976, 3739), ('Similaun', 10.8792, 46.7647, 3606),
                       ('Fluchtkogel', 10.7735, 46.8470, 3497), ('Hochvernagtspitze', 10.7946, 46.8660, 3539),
                       ('Weißseespitze', 10.7232, 46.8536, 3518), ('Hintere Schwärze', 10.8946, 46.7853, 3628)]:
    x, y = geo(lon, lat); i, j = int(x // 25), int(y // 25)
    if not (0 <= i < nxh and 0 <= j < nyh): continue
    # snap to local DEM maximum within 400 m
    j0, j1, i0, i1 = max(0, j - 16), min(nyh, j + 17), max(0, i - 16), min(nxh, i + 17)
    sub = basehr[j0:j1, i0:i1]; a = np.unravel_index(np.argmax(sub), sub.shape)
    labels.append(dict(n=n, t='peak', z=h, x=round((i0 + a[1] + 0.5) * 25, 1), zz=round((j0 + a[0] + 0.5) * 25, 1)))
for n, lon, lat, tp in [('Hintereisferner', None, None, 'glacier'), ('Kesselwandferner', 10.7930, 46.8380, 'glacier'),
                        ('Gepatschferner', 10.7560, 46.8690, 'glacier'), ('Hochjochferner', 10.8300, 46.7800, 'glacier'),
                        ('Vernagtferner', 10.8250, 46.8720, 'glacier'), ('Rofental', 10.8700, 46.8280, 'place')]:
    if lon is None: x, y = cen
    else: x, y = geo(lon, lat)
    if 0 <= x < Wm and 0 <= y < Hm: labels.append(dict(n=n, t=tp, z=0, x=round(float(x), 1), zz=round(float(y), 1)))

ortho = base64.b64encode(open('ortho.jpg', 'rb').read()).decode()
T = b['T']; P = b['P']
D = dict(nx=nx, ny=ny, dx=dx, nxh=nxh, nyh=nyh, dxh=25.0, zref=float(b['zref']), hy0=1802,
         par=dict(pf=1.6, tbias=round(TBIAS, 3)),
         B=f32(bed['B']), tbx=f32(np.load('tbx_' + STATES.replace('.npz', '') + '.npy') if __import__('os').path.exists('tbx_' + STATES.replace('.npz', '') + '.npy') else np.zeros_like(z)), aval=gz(np.load('aval.npy').astype(np.int32)), rad=f32(t['rad']), slope=f32(np.degrees(t['slope'])), base=gz(enc), hef=gz(region.astype(np.uint8)),
         seed=seed, flowDir=[float(fd[0]), float(fd[1])], hefCenter=[float(cen[0]), float(cen[1])], tongue=tongue, cutLong=float(cutLong),
         outline=outline, labels=labels,
         T=[round(float(v), 2) for v in T], Pr=[round(float(v), 1) for v in P],
         ortho='data:image/jpeg;base64,' + ortho)
for key, pre, yr in (('s1850', 'a_', 1850), ('s2003', 'b_', 2003)):
    D[key] = dict(year=yr, **{f: f32(st[pre + f]) for f in ('H', 'M', 'D', 'firn', 'tfree')})

import glac
glac.P['pf'] = 1.6; glac.P['tbias'] = TBIAS
Ty = b['T'].reshape(-1, 12); Py_ = b['P'].reshape(-1, 12); sel = slice(1961 - 1802, 1991 - 1802)
e0 = glac.ela_profile(Ty[sel].mean(0), Py_[sel].mean(0), 0, 0)[0]; e1 = glac.ela_profile(Ty[sel].mean(0), Py_[sel].mean(0), 1, 0)[0]
print('ELA ref', e0, 'sens', e1 - e0)
page = open('page_template.html').read().replace('{{ELAREF}}', f"{round(e0):,}".replace(',', '.')).replace('{{SENS}}', f"+{round(e1 - e0)}")
sim = open('sim.js').read()
app = open('app.js').read()
page = page.replace('/*SIM*/', sim).replace('/*DATA*/', json.dumps(D, separators=(',', ':'))).replace('/*APP*/', app)
open(OUT, 'w').write(page)
print('written', OUT, len(page) / 1e6, 'MB; ortho', len(ortho) / 1e6, 'MB; base', len(D['base']) / 1e6)
