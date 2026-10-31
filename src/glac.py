"""Glacier model (numpy reference; mirrored 1:1 in the JS worker).
Grid: 100 m, arrays [j,i], j from north to south.
Ice dynamics: 2D shallow-ice approximation (Glen n=3) + Weertman-type sliding.
Surface mass balance: half-monthly degree-day model with snow / firn / ice layers.
Debris: transported with ice flux, deposited where ice vanishes -> moraines.
"""
import numpy as np
from math import erf, sqrt, pi

SPY = 31556926.0
RHO, G = 900.0, 9.81
A_GLEN = 2.4e-24          # Pa^-3 s^-1, temperate ice (Cuffey & Paterson 2010)
FS = 1.0e-20              # reduced sliding parameter (Oerlemans 1997 uses 5.7e-20)
GAM = 2*A_GLEN*(RHO*G)**3/5*SPY
GAMS = FS*(RHO*G)**3*SPY
P = dict(
    lapse=-0.0065,        # K/m
    sigma=3.0,            # daily temperature SD around monthly mean (K)
    tsnow=1.0,            # 50 % solid precipitation threshold (degC)
    ddf_s=0.0030, ddf_f=0.0045, ddf_i=0.0061,   # m w.e. / K / d (Six & Vincent 2014)
    pgrad=0.0004,         # +4 % precipitation per 100 m
    pf=1.0, tbias=0.0,    # calibrated
    tau_firn=6.0,         # yr, firn -> ice
    aval_frac=0.6,        # share of snow from steep walls that ends up at the wall foot
    erosion=1.2e-4,       # till production per (m/yr) ice speed -> ~2-5 mm/yr erosion
    headwall=0.006,       # m/yr debris from steep rock walls into marginal ice
)
NSUB = 24
DAYS = 365.25/NSUB

def Phi(x):  # normal CDF (vectorized)
    return 0.5*(1+np.vectorize(erf)(x/sqrt(2))) if np.ndim(x) else 0.5*(1+erf(x/sqrt(2)))

def phi_cdf(x):
    # fast erf approximation (Abramowitz-Stegun 7.1.26) - identical in JS
    s = np.sign(x); ax = np.abs(x)/sqrt(2)
    t = 1/(1+0.3275911*ax)
    y = 1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*np.exp(-ax*ax)
    return 0.5*(1+s*y)

# lookup tables (identical in JS): x in [-10,10], 256 per unit
_XS=np.arange(-2560,2561)/256.0
_PHI=phi_cdf(_XS)
_PDD1=np.exp(-0.5*_XS**2)/np.sqrt(2*pi)+_XS*_PHI
def _lut(tab,x):
    u=np.clip((np.asarray(x,float)+10.0)*256.0,0,5119.999999)
    i=np.floor(u).astype(int); f=u-i
    return tab[i]*(1-f)+tab[i+1]*f
def phi_l(x): return _lut(_PHI,x)
def pdd(T, sig):
    x=np.asarray(T,float)/sig
    return sig*np.where(x>10,x,_lut(_PDD1,x))

class Model:
    def __init__(s, B, rad, slope, dx=125.0, zref=3160.0, aval=None, tbx=None):
        s.B=B.copy(); s.ny,s.nx=B.shape; s.dx=dx; s.zref=zref
        s.rad=rad; s.slope=slope
        s.H=np.zeros_like(B); s.M=np.zeros_like(B); s.D=np.zeros_like(B)
        s.snow=np.zeros_like(B); s.firn=np.zeros_like(B)
        s.tfree=np.full_like(B,9999.0)
        s.bacc=np.zeros_like(B); s.bann=np.zeros_like(B)
        # steep-slope accumulation factor (avalanching/wind removal)
        deg=np.degrees(slope)
        s.accf=np.clip(1-(deg-22)/12,0.0,1.0)
        s.wall=(deg>35).astype(float)
        s.us=np.zeros((2,)+B.shape)
        s.aval=np.load('aval.npy') if aval is None else aval
        s.tbx=np.zeros_like(B) if tbx is None else tbx
        s.t=0.0

    # ---------------- ice flow ----------------
    def flow(s, dtmax):
        dx=s.dx; H=s.H; S=s.B+s.M+H
        # x-faces (between i and i+1)
        Hx=0.5*(H[:,1:]+H[:,:-1]); Hx=np.where(Hx>1e-3,Hx,0.0); dsx=(S[:,1:]-S[:,:-1])/dx
        Sp=np.pad(S,1,mode='edge')
        dsy_x=((Sp[2:,2:-1]+Sp[2:,1:-2])-(Sp[:-2,2:-1]+Sp[:-2,1:-2]))/(4*dx)
        g2x=dsx**2+dsy_x**2
        Dx=(GAM*Hx**5+GAMS*Hx**3)*g2x
        # y-faces
        Hy=0.5*(H[1:,:]+H[:-1,:]); Hy=np.where(Hy>1e-3,Hy,0.0); dsy=(S[1:,:]-S[:-1,:])/dx
        dsx_y=((Sp[2:-1,2:]+Sp[1:-2,2:])-(Sp[2:-1,:-2]+Sp[1:-2,:-2]))/(4*dx)
        g2y=dsy**2+dsx_y**2
        Dy=(GAM*Hy**5+GAMS*Hy**3)*g2y
        Dm=max(Dx.max(),Dy.max(),1e-6)
        dt=min(dtmax,0.22*dx*dx/Dm)
        qx=-Dx*dsx; qy=-Dy*dsy
        # limit outflux so a cell cannot go negative (mass-conserving)
        div=np.zeros_like(H)
        div[:,:-1]+=qx; div[:,1:]-=qx
        div[:-1,:]+=qy; div[1:,:]-=qy
        out=np.zeros_like(H)
        out[:,:-1]+=np.maximum(qx,0); out[:,1:]+=np.maximum(-qx,0)
        out[:-1,:]+=np.maximum(qy,0); out[1:,:]+=np.maximum(-qy,0)
        lim=np.where(out*dt/dx>H, H/np.maximum(out*dt/dx,1e-12), 1.0)
        # apply limiter to faces by upstream cell
        fx=np.where(qx>0, lim[:,:-1], lim[:,1:]); qx=qx*fx
        fy=np.where(qy>0, lim[:-1,:], lim[1:,:]); qy=qy*fy
        dH=np.zeros_like(H)
        dH[:,:-1]-=qx; dH[:,1:]+=qx
        dH[:-1,:]-=qy; dH[1:,:]+=qy
        # debris advected with the ice (upwind concentration)
        c=np.where(H>1, s.D/np.maximum(H,1), 0.0)
        cx=np.where(qx>0, c[:,:-1], c[:,1:]); cy=np.where(qy>0, c[:-1,:], c[1:,:])
        dD=np.zeros_like(H)
        dD[:,:-1]-=qx*cx; dD[:,1:]+=qx*cx
        dD[:-1,:]-=qy*cy; dD[1:,:]+=qy*cy
        s.H=np.maximum(H+dH*dt/dx,0.0)
        s.D=np.maximum(s.D+dD*dt/dx,0.0)
        # boundary: ice leaves domain
        for A_ in (s.H,s.D):
            A_[0,:]=A_[-1,:]=A_[:,0]=A_[:,-1]=0
        # velocities at cell centres (surface): deformation 1.25*mean + sliding
        qxc=np.zeros_like(H); qyc=np.zeros_like(H)
        qxc[:,:-1]+=0.5*qx; qxc[:,1:]+=0.5*qx
        qyc[:-1,:]+=0.5*qy; qyc[1:,:]+=0.5*qy
        Hc=np.maximum(H,1.0)
        s.us[0]=1.15*qxc/Hc; s.us[1]=1.15*qyc/Hc
        # basal sliding speed (for erosion) ~ GAMS*H^2*|grad s|^3
        return dt

    # ---------------- debris / moraines ----------------
    def debris(s, dt):
        H=s.H
        ice=H>2
        # basal erosion -> till carried in ice
        sp=np.hypot(s.us[0],s.us[1])
        s.D+=np.where(ice, P['erosion']*np.minimum(sp,300)*dt, 0)
        # rockfall from steep walls adjacent to ice
        w=s.wall*(H<2)
        nb=np.zeros_like(H)
        nb[1:,:]+=w[:-1,:]; nb[:-1,:]+=w[1:,:]; nb[:,1:]+=w[:,:-1]; nb[:,:-1]+=w[:,1:]
        s.D+=np.where(ice, P['headwall']*nb*dt, 0)
        # ice re-advancing over moraine reworks it
        er=np.where(H>5, s.M*np.minimum(1.0, np.minimum(sp,300)*dt/s.dx), 0)   # advancing ice bulldozes moraine
        s.M-=er; s.D+=er
        # deposition where ice is (nearly) gone
        dep=H<2.0
        s.M+=np.where(dep, s.D, 0); s.D=np.where(dep,0,s.D)
    def diffuse(s, dt):
        # slow hillslope relaxation of ice-free moraine (kappa 0.6 m2/yr)
        M=s.M; k=0.6*dt/(s.dx*s.dx)
        L=np.zeros_like(M)
        L[1:-1,1:-1]=M[2:,1:-1]+M[:-2,1:-1]+M[1:-1,2:]+M[1:-1,:-2]-4*M[1:-1,1:-1]
        s.M=np.maximum(M+np.where(s.H<1,k*L,0),0)

    # ---------------- mass balance ----------------
    def smb(s, Tm, Pm, dT, dPfac, dt=1.0/NSUB):
        S=s.B+s.M+s.H
        T=Tm+P['tbias']+s.tbx+dT+P['lapse']*(S-s.zref)
        e=DAYS*pdd(T,P['sigma'])*s.rad          # degree days, radiation-weighted
        fsol=phi_l((P['tsnow']-T)/P['sigma'])
        raw=Pm*1e-3/2*P['pf']*np.maximum(0.2,1+P['pgrad']*(S-s.zref))*dPfac*fsol
        acc=raw*s.accf
        av=s.aval>=0
        np.add.at(acc.ravel(), s.aval[av], (P['aval_frac']*raw*(1-s.accf)).ravel()[av])   # avalanches: part of the snow from steep walls lands at the wall foot
        s.snow+=acc
        ms=np.minimum(s.snow,P['ddf_s']*e); s.snow-=ms; e=e-ms/P['ddf_s']
        mf=np.minimum(s.firn,P['ddf_f']*e); s.firn-=mf; e=e-mf/P['ddf_f']
        mi=np.minimum(s.H*0.9,P['ddf_i']*e); s.H=np.maximum(s.H-mi/0.9,0.0)
        conv=s.firn*dt/P['tau_firn']; s.firn-=conv; s.H+=conv/0.9
        s.bacc+=acc-ms-mf-mi
        return acc

    def year(s, Tmon, Pmon, dT=0.0, dP=0.0, flow=True):
        """one hydrological year Oct..Sep; Tmon,Pmon 12 values."""
        for k in range(NSUB):
            m=k//2
            if k==0:
                s.firn+=s.snow; s.snow[:]=0
                s.bann=s.bacc.copy(); s.bacc[:]=0
            s.smb(Tmon[m],Pmon[m],dT,1+dP)
            if flow:
                tt=0.0; h=1.0/NSUB
                while tt<h-1e-9:
                    dt=s.flow(h-tt); s.debris(dt); tt+=dt
                s.diffuse(h)
            s.tfree=np.where(s.H>1,0,s.tfree+1.0/NSUB)
        s.t+=1

def ela_profile(Tmon,Pmon,dT,dP,zref=3160.0,rad=1.0):
    """altitude where end-of-year snow just melts out (flat surface)."""
    def bal(z):
        snow=0.0; ice=0.0
        for k in range(NSUB):
            m=k//2
            T=Tmon[m]+P['tbias']+dT+P['lapse']*(z-zref)
            e=DAYS*float(pdd(np.array(T),P['sigma']))*rad
            fs=float(phi_l((P['tsnow']-T)/P['sigma']))
            snow+=Pmon[m]*1e-3/2*P['pf']*max(0.2,1+P['pgrad']*(z-zref))*(1+dP)*fs
            ms=min(snow,P['ddf_s']*e); snow-=ms; e-=ms/P['ddf_s']
            ice+=P['ddf_i']*e
        return snow-ice
    lo,hi=1500.0,5000.0
    for _ in range(40):
        mid=0.5*(lo+hi)
        if bal(mid)>0: hi=mid
        else: lo=mid
    return 0.5*(lo+hi), bal
