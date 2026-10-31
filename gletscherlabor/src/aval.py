"""Avalanche routing: snow falling on slopes steeper than 22 deg is moved (at most 4 cells
down the steepest descent) to the foot of the wall. -1 = snow is lost. Output: aval.npy"""
import numpy as np
b = np.load('base.npz'); t = np.load('terr100.npz'); z = b['z100']; deg = np.degrees(t['slope'])
ny, nx = z.shape; aval = np.arange(z.size, dtype=np.int32)
for j in range(ny):
    for i in range(nx):
        if deg[j, i] <= 22: continue
        jj, ii = j, i; ok = False
        for _ in range(4):
            best = None; bz = z[jj, ii]
            for dj in (-1, 0, 1):
                for di in (-1, 0, 1):
                    a, c = jj + dj, ii + di
                    if (dj or di) and 0 <= a < ny and 0 <= c < nx and z[a, c] < bz: bz = z[a, c]; best = (a, c)
            if best is None: break
            jj, ii = best
            if deg[jj, ii] <= 22: ok = True; break
        aval[j * nx + i] = jj * nx + ii if ok else -1
np.save('aval.npy', aval)
print('routed', ((aval >= 0) & (aval != np.arange(z.size))).sum(), 'lost', (aval < 0).sum())
