"""Setzt Bildschirm-Kacheln (800×600, je 1024×768 CSS-Pixel) zu einem Foto zusammen."""
import sys,json
from PIL import Image
D='/root/.claude/projects/-home-claude/8911e1f5-a7a2-553e-adae-17c5ff6db27a/tool-results/'
def stitch(names,cols,rows,W,H,out,maxw=2400):
    k=800/1024; ow,oh=round(W*k),round(H*k); im=Image.new('RGB',(cols*800,rows*600))
    for i,n in enumerate(names): im.paste(Image.open(D+n).convert('RGB'),((i%cols)*800,(i//cols)*600))
    im=im.crop((0,0,ow,oh))
    if ow>maxw: im=im.resize((maxw,round(oh*maxw/ow)),Image.LANCZOS)
    im.save(out,quality=84,optimize=True,progressive=True); return im.size
if __name__=='__main__':
    a=json.loads(sys.argv[1]); print(stitch(**a))
