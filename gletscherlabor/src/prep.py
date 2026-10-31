# Build metric grids from SRTM + HISTALP climatology
import tifffile,numpy as np,shapefile,netCDF4 as nc,sys,json
from scipy import ndimage as ndi
from matplotlib.path import Path
D=sys.argv[1]
a=tifffile.imread(D+'/hef_srtm.tif').astype(float)
lon0,lat0,d=10.60497758,46.91334568,0.00083333
LONW,LONE,LATS,LATN=10.665,10.915,46.738,46.885
latc=0.5*(LATS+LATN); kx=111320*np.cos(np.radians(latc)); ky=111132.0
W=(LONE-LONW)*kx; Hh=(LATN-LATS)*ky
def sample(dxm,order=3):
    nx=int(W//dxm); ny=int(Hh//dxm)
    x=(np.arange(nx)+0.5)*dxm; y=(np.arange(ny)+0.5)*dxm   # y from north
    lon=LONW+x/kx; lat=LATN-y/ky
    LON,LAT=np.meshgrid(lon,lat)
    # pixel-is-area: centre of pixel (r,c) at lon0+(c+.5)d
    c=(LON-lon0)/d-0.5; r=(lat0-LAT)/d-0.5
    z=ndi.map_coordinates(a,[r,c],order=order,mode='nearest')
    return z,LON,LAT
if __name__=='__main__':
    z100,LON,LAT=sample(125.0,order=3)
    print('grid100',z100.shape,z100.min(),z100.max(), W,Hh)
    r=shapefile.Reader(D+'/hef',encoding='latin1'); s=r.shapes()[0]
    p=Path(np.array(s.points[:1075]))
    holes=[Path(np.array(s.points[s.parts[k]:s.parts[k+1]])) for k in range(1,len(s.parts)-1)]+[Path(np.array(s.points[s.parts[-1]:]))]
    pts=np.c_[LON.ravel(),LAT.ravel()]
    m=p.contains_points(pts)
    for h in holes: m&=~h.contains_points(pts)
    m=m.reshape(z100.shape)
    print('HEF cells',m.sum(),'area km2',m.sum()*0.015625, 'zmin',z100[m].min(),'zmax',z100[m].max())
    ds=nc.Dataset(D+'/histalp.nc')
    T=ds['temp'][:,1,1].filled(np.nan); P=ds['prcp'][:,1,1].filled(np.nan)
    np.savez('base.npz',z100=z100,hef=m,T=T,P=P,zref=float(ds['hgt'][1,1]),W=W,H=Hh,
             LONW=LONW,LATN=LATN,kx=kx,ky=ky)
    # climatology 1961-1990 (hydro years starting Oct 1960)
    t=nc.num2date(ds['time'][:],ds['time'].units)
    yrs=np.array([x.year for x in t]); mos=np.array([x.month for x in t])
    print('first',t[0],'len',len(t))
    Ty=T.reshape(-1,12); Py=P.reshape(-1,12)  # hydro years Oct..Sep starting 1801-10
    hy=np.arange(1802,1802+Ty.shape[0])
    sel=(hy>=1961)&(hy<=1990)
    print('clim T',np.round(Ty[sel].mean(0),1)); print('clim P',np.round(Py[sel].mean(0)),Py[sel].sum(1).mean())
    for a_,b_ in [(1802,1850),(1851,1900),(1901,1950),(1951,1980),(1981,2003)]:
        s_=(hy>=a_)&(hy<=b_); print(a_,b_,'Tann %.2f JJA %.2f P %.0f'%(Ty[s_].mean(),Ty[s_][:,8:11].mean(),Py[s_].sum(1).mean()))
