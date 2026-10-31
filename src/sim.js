// Glacier model — JS port of glac.py (runs in a Web Worker in the page, and in node for tests)
// 2D shallow-ice approximation + half-monthly degree-day mass balance with snow/firn/ice,
// debris transport and moraine deposition.
(function (root) {
  const SPY = 31556926.0, RHO = 900.0, G = 9.81;
  const A_GLEN = 2.4e-24, FS = 1.0e-20;
  const GAM = 2 * A_GLEN * Math.pow(RHO * G, 3) / 5 * SPY;
  const GAMS = FS * Math.pow(RHO * G, 3) * SPY;
  const NSUB = 24, DAYS = 365.25 / NSUB;
  const SQ2 = Math.SQRT2, ISQ2PI = 1 / Math.sqrt(2 * Math.PI);

  function phiCdf(x) {
    const s = x < 0 ? -1 : 1, ax = Math.abs(x) / SQ2;
    const t = 1 / (1 + 0.3275911 * ax);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
    return 0.5 * (1 + s * y);
  }
  // lookup tables x in [-10,10], 256 per unit (identical to glac.py)
  const PHI = new Float64Array(5121), PDD1 = new Float64Array(5121);
  for (let n = 0; n <= 5120; n++) { const x = (n - 2560) / 256; PHI[n] = phiCdf(x); PDD1[n] = Math.exp(-0.5 * x * x) * ISQ2PI + x * PHI[n]; }
  function lut(tab, x) {
    let u = (x + 10) * 256; if (u < 0) u = 0; else if (u > 5119.999999) u = 5119.999999;
    const i = u | 0, f = u - i; return tab[i] * (1 - f) + tab[i + 1] * f;
  }
  function phiL(x) { return lut(PHI, x); }
  function pdd(T, sig) { const x = T / sig; return sig * (x > 10 ? x : lut(PDD1, x)); }

  function Model(o) {
    const nx = o.nx, ny = o.ny, N = nx * ny;
    this.nx = nx; this.ny = ny; this.dx = o.dx || 125; this.zref = o.zref || 3160;
    this.P = Object.assign({
      lapse: -0.0065, sigma: 3.0, tsnow: 1.0, ddf_s: 0.0030, ddf_f: 0.0045, ddf_i: 0.0061,
      pgrad: 0.0004, pf: 1.6, tbias: 0.49, tau_firn: 6.0, aval_frac: 0.6, erosion: 1.2e-4, headwall: 0.006, kappa: 0.6
    }, o.P || {});
    const F = Float64Array;
    this.B = F.from(o.B); this.rad = F.from(o.rad);
    this.accf = new F(N); this.wall = new Uint8Array(N);
    for (let k = 0; k < N; k++) {
      const deg = o.slopeDeg[k];
      this.accf[k] = Math.min(1, Math.max(0.0, 1 - (deg - 22) / 12));
      this.wall[k] = deg > 35 ? 1 : 0;
    }
    for (const f of ['H', 'M', 'D', 'snow', 'firn', 'bacc', 'bann', 'usx', 'usy', 'S', 'lim', 'dH', 'dD', 'qxc', 'qyc'])
      this[f] = new F(N);
    this.tfree = new F(N).fill(9999);
    this.aval = o.aval ? Int32Array.from(o.aval) : null; this.tbx = o.tbx ? F.from(o.tbx) : new F(N); this.raw = new F(N); this.accA = new F(N);
    this.qx = new F(ny * (nx - 1)); this.qy = new F((ny - 1) * nx);
    this.t = 0; this.sub = 0; this.dtLast = 0; this.steps = 0;
    this.nact = 0;
  }

  // active cells: ice plus a 2-cell margin (ice cannot advance further within one half-month)
  Model.prototype.buildActive = function () {
    const { nx, ny, H } = this, N = nx * ny;
    const flag = this.flag || (this.flag = new Uint8Array(N));
    const act = this.act || (this.act = new Int32Array(N));
    flag.fill(0);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (H[j * nx + i] > 0) {
      const ja = Math.max(0, j - 2), jb = Math.min(ny - 1, j + 2), ia = Math.max(0, i - 2), ib = Math.min(nx - 1, i + 2);
      for (let jj = ja; jj <= jb; jj++) for (let ii = ia; ii <= ib; ii++) flag[jj * nx + ii] = 1;
    }
    let n = 0; for (let k = 0; k < N; k++) if (flag[k]) act[n++] = k;
    this.nact = n;
    this.qx.fill(0); this.qy.fill(0);
    const S = this.S, B = this.B, M = this.M;
    for (let k = 0; k < N; k++) S[k] = B[k] + M[k] + H[k];
  };

  Model.prototype.flow = function (dtmax) {
    const { nx, ny, dx, H, D, qx, qy, lim, dH, dD, qxc, qyc, act, flag, S, B, M } = this;
    const n = this.nact;
    if (!n) return dtmax;
    const nxf = nx - 1, i4dx = 1 / (4 * dx), idx = 1 / dx;
    let Dm = 1e-6;
    for (let a = 0; a < n; a++) {
      const k = act[a]; S[k] = B[k] + M[k] + H[k];
    }
    for (let a = 0; a < n; a++) {
      const k = act[a], j = (k / nx) | 0, i = k - j * nx;
      const Hk = H[k];
      // east face
      if (i < nx - 1 && flag[k + 1]) {
        const Hx = 0.5 * (Hk + H[k + 1]), f = j * nxf + i;
        if (Hx > 1e-3) {
          const jn = j > 0 ? k - nx : k, js = j < ny - 1 ? k + nx : k;
          const dsx = (S[k + 1] - S[k]) * idx;
          const dsy = ((S[js + 1] + S[js]) - (S[jn + 1] + S[jn])) * i4dx;
          const H2 = Hx * Hx, H3 = H2 * Hx;
          const Dd = (GAM * H3 * H2 + GAMS * H3) * (dsx * dsx + dsy * dsy);
          if (Dd > Dm) Dm = Dd;
          qx[f] = -Dd * dsx;
        } else qx[f] = 0;
      }
      // south face
      if (j < ny - 1 && flag[k + nx]) {
        const Hy = 0.5 * (Hk + H[k + nx]);
        if (Hy > 1e-3) {
          const ie = i < nx - 1 ? 1 : 0, iw = i > 0 ? 1 : 0;
          const dsy = (S[k + nx] - S[k]) * idx;
          const dsx = ((S[k + nx + ie] + S[k + ie]) - (S[k + nx - iw] + S[k - iw])) * i4dx;
          const H2 = Hy * Hy, H3 = H2 * Hy;
          const Dd = (GAM * H3 * H2 + GAMS * H3) * (dsx * dsx + dsy * dsy);
          if (Dd > Dm) Dm = Dd;
          qy[k] = -Dd * dsy;
        } else qy[k] = 0;
      }
    }
    const dt = Math.min(dtmax, 0.22 * dx * dx / Dm);
    const c = dt / dx;
    for (let a = 0; a < n; a++) {
      const k = act[a], j = (k / nx) | 0, i = k - j * nx; let out = 0;
      if (i < nx - 1) { const q = qx[j * nxf + i]; if (q > 0) out += q; }
      if (i > 0) { const q = qx[j * nxf + i - 1]; if (q < 0) out -= q; }
      if (j < ny - 1) { const q = qy[k]; if (q > 0) out += q; }
      if (j > 0) { const q = qy[k - nx]; if (q < 0) out -= q; }
      const o = out * c;
      lim[k] = o > H[k] ? H[k] / Math.max(o, 1e-12) : 1.0;
      dH[k] = 0; dD[k] = 0; qxc[k] = 0; qyc[k] = 0;
    }
    for (let a = 0; a < n; a++) {
      const k = act[a], j = (k / nx) | 0, i = k - j * nx;
      if (i < nx - 1) {
        let q = qx[j * nxf + i];
        if (q !== 0) {
          const ku = q > 0 ? k : k + 1;
          q *= lim[ku];
          const cu = H[ku] > 1 ? D[ku] / H[ku] : 0;
          dH[k] -= q; dH[k + 1] += q; dD[k] -= q * cu; dD[k + 1] += q * cu;
          qxc[k] += 0.5 * q; qxc[k + 1] += 0.5 * q;
        }
      }
      if (j < ny - 1) {
        let q = qy[k];
        if (q !== 0) {
          const ku = q > 0 ? k : k + nx;
          q *= lim[ku];
          const cu = H[ku] > 1 ? D[ku] / H[ku] : 0;
          dH[k] -= q; dH[k + nx] += q; dD[k] -= q * cu; dD[k + nx] += q * cu;
          qyc[k] += 0.5 * q; qyc[k + nx] += 0.5 * q;
        }
      }
    }
    const usx = this.usx, usy = this.usy;
    for (let a = 0; a < n; a++) {
      const k = act[a], j = (k / nx) | 0, i = k - j * nx;
      const Hc = H[k] > 1 ? H[k] : 1.0;
      usx[k] = 1.15 * qxc[k] / Hc; usy[k] = 1.15 * qyc[k] / Hc;
      const h = H[k] + dH[k] * c; H[k] = h > 0 ? h : 0;
      const d = D[k] + dD[k] * c; D[k] = d > 0 ? d : 0;
      if (j === 0 || i === 0 || j === ny - 1 || i === nx - 1) { H[k] = 0; D[k] = 0; }
    }
    this.steps++;
    return dt;
  };

  Model.prototype.debris = function (dt) {
    const { nx, ny, H, D, M, usx, usy, wall, P, act } = this;
    const n = this.nact, er0 = P.erosion * dt, hw = P.headwall * dt;
    for (let a = 0; a < n; a++) {
      const k = act[a], h = H[k];
      if (h > 2) {
        const j = (k / nx) | 0, i = k - j * nx;
        const sp = Math.min(Math.sqrt(usx[k] * usx[k] + usy[k] * usy[k]), 300);
        let nb = 0;
        if (j > 0 && wall[k - nx] && H[k - nx] < 2) nb++;
        if (j < ny - 1 && wall[k + nx] && H[k + nx] < 2) nb++;
        if (i > 0 && wall[k - 1] && H[k - 1] < 2) nb++;
        if (i < nx - 1 && wall[k + 1] && H[k + 1] < 2) nb++;
        D[k] += er0 * sp + hw * nb;
        if (h > 5 && M[k] > 0) { const er = M[k] * Math.min(1, sp * dt / this.dx); M[k] -= er; D[k] += er; }
      } else if (D[k] > 0) {
        M[k] += D[k]; D[k] = 0;
      }
    }
  };

  Model.prototype.diffuseMoraine = function (dt) {
    const { nx, ny, H, M, P } = this; const k0 = P.kappa * dt / (this.dx * this.dx);
    const L = this.dD; // scratch
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const k = j * nx + i;
      L[k] = H[k] < 1 ? k0 * (M[k + nx] + M[k - nx] + M[k + 1] + M[k - 1] - 4 * M[k]) : 0;
    }
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const k = j * nx + i; const m = M[k] + L[k]; M[k] = m > 0 ? m : 0; }
  };

  Model.prototype.smb = function (Tm, Pm, dT, dPfac) {
    const { P, B, M, H, rad, accf, snow, firn, bacc, zref, tbx } = this; const N = this.nx * this.ny;
    const dt = 1 / NSUB, sig = P.sigma, pfac = Pm * 1e-3 / 2 * P.pf * dPfac;
    const raw = this.raw, accA = this.accA, aval = this.aval;
    for (let k = 0; k < N; k++) {
      const S = B[k] + M[k] + H[k];
      const T = Tm + P.tbias + tbx[k] + dT + P.lapse * (S - zref);
      raw[k] = pfac * Math.max(0.2, 1 + P.pgrad * (S - zref)) * phiL((P.tsnow - T) / sig);
      accA[k] = raw[k] * accf[k];
    }
    if (aval) for (let k = 0; k < N; k++) { const t = aval[k]; if (t < 0) continue; const r = P.aval_frac * raw[k] * (1 - accf[k]); if (r > 0) accA[t] += r; }
    for (let k = 0; k < N; k++) {
      const S = B[k] + M[k] + H[k];
      const T = Tm + P.tbias + tbx[k] + dT + P.lapse * (S - zref);
      let e = DAYS * pdd(T, sig) * rad[k];
      const acc = accA[k];
      let sn = snow[k] + acc;
      const ms = Math.min(sn, P.ddf_s * e); sn -= ms; e -= ms / P.ddf_s;
      let fi = firn[k];
      const mf = Math.min(fi, P.ddf_f * e); fi -= mf; e -= mf / P.ddf_f;
      let h = H[k];
      const mi = Math.min(h * 0.9, P.ddf_i * e); h -= mi / 0.9; if (h < 0) h = 0;
      const conv = fi * dt / P.tau_firn; fi -= conv; h += conv / 0.9;
      snow[k] = sn; firn[k] = fi; H[k] = h;
      bacc[k] += acc - ms - mf - mi;
    }
  };

  // one half-month sub-step. Tmon/Pmon: 12 monthly values (Oct..Sep)
  Model.prototype.substep = function (Tmon, Pmon, dT, dP, doFlow = true) {
    const k = this.sub, N = this.nx * this.ny;
    if (k === 0) {
      for (let i = 0; i < N; i++) { this.firn[i] += this.snow[i]; this.snow[i] = 0; this.bann[i] = this.bacc[i]; this.bacc[i] = 0; }
    }
    const m = k >> 1;
    this.smb(Tmon[m], Pmon[m], dT, 1 + dP);
    if (doFlow) {
      this.usx.fill(0); this.usy.fill(0);
      this.buildActive();
      let tt = 0; const h = 1 / NSUB;
      while (tt < h - 1e-9) { const dt = this.flow(h - tt); this.debris(dt); tt += dt; }
      this.diffuseMoraine(h);
    }
    for (let i = 0; i < N; i++) this.tfree[i] = this.H[i] > 1 ? 0 : this.tfree[i] + 1 / NSUB;
    this.sub = (k + 1) % NSUB;
    if (this.sub === 0) this.t += 1;
  };

  // climatic ELA on a flat surface: altitude where the year's snow just melts out
  function elaFlat(P, Tmon, Pmon, dT, dP, zref) {
    function bal(z) {
      let snow = 0, ice = 0;
      for (let k = 0; k < NSUB; k++) {
        const m = k >> 1; const T = Tmon[m] + P.tbias + dT + P.lapse * (z - zref);
        let e = DAYS * pdd(T, P.sigma);
        const fs = phiL((P.tsnow - T) / P.sigma);
        snow += Pmon[m] * 1e-3 / 2 * P.pf * Math.max(0.2, 1 + P.pgrad * (z - zref)) * (1 + dP) * fs;
        const ms = Math.min(snow, P.ddf_s * e); snow -= ms; e -= ms / P.ddf_s;
        ice += P.ddf_i * e;
      }
      return snow - ice;
    }
    let lo = 1000, hi = 5500;
    for (let i = 0; i < 40; i++) { const mid = 0.5 * (lo + hi); if (bal(mid) > 0) hi = mid; else lo = mid; }
    return { ela: 0.5 * (lo + hi), bal };
  }

  const api = { Model, elaFlat, pdd, phiCdf, NSUB };
  if (typeof module !== 'undefined') module.exports = api; else root.GlacierSim = api;
})(typeof self !== 'undefined' ? self : this);
