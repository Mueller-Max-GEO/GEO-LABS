import sys, subprocess, os, re
S = sys.argv[1]; D = f'{S}/s3'
rd = lambda p: open(p, encoding='utf-8').read()
subprocess.run([sys.executable, f'{D}/mkui.py', S], check=True)
head = rd(f'{D}/head.html')
HYP = ['#6A9B58', '#93BC6E', '#C6D68E', '#EBDD9C', '#E2BC7C', '#C99460', '#A8744C', '#BDB2A8', '#EDEDEA']
assert head.count('/*@@HBAR@@*/') == 1
head = head.replace('/*@@HBAR@@*/', ''.join(f'<i style="background:{c}"></i>' for c in HYP))
extra = rd(f'{D}/extra.css')
assert head.count('</style>') == 1
head = head.replace('</style>', extra + '\n</style>')
code = ("import * as THREE from 'three';\nimport { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';\n"
        "import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';\n"
        + rd(f'{S}/src/model.js') + rd(f'{D}/scene.js') + rd(f'{D}/ui.js'))
os.makedirs(f'{D}/_entry', exist_ok=True)
open(f'{D}/_entry/main.js', 'w', encoding='utf-8').write(code)
subprocess.run([f'{S}/node_modules/.bin/esbuild', f'{D}/_entry/main.js', '--bundle', '--minify', '--format=iife',
                '--target=safari14,chrome90,firefox90', '--legal-comments=none', f'--outfile={D}/_entry/bundle.js',
                '--resolve-extensions=.js', '--log-level=warning'], check=True, cwd=S)
bundle = rd(f'{D}/_entry/bundle.js').replace('</script', '<\\/script')
guard = rd(f'{D}/guard.html')
out = head + guard + '<script>' + bundle + '</script>\n</body>\n</html>\n'
assert '@@' not in head
open(f'{S}/foehn-labor.html', 'w', encoding='utf-8').write(out)
print('built', len(out), 'bytes')
