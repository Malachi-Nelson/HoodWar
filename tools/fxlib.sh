#!/bin/bash
# Bundles the three.js r128 post-processing pieces the game uses (from node_modules/three/examples/js, which attach to the
# global THREE) into src/11-fxlib.js, minified. Run it again only if the list changes.
cd "$(dirname "$0")/.."
E=node_modules/three/examples/js
FILES="postprocessing/EffectComposer.js postprocessing/RenderPass.js postprocessing/ShaderPass.js shaders/CopyShader.js shaders/LuminosityHighPassShader.js postprocessing/UnrealBloomPass.js"
{ for f in $FILES; do cat "$E/$f"; echo; done; } > /tmp/fxlib.raw.js
/opt/npm-tools/node_modules/.bin/esbuild /tmp/fxlib.raw.js --minify --target=es2017 --log-level=warning > /tmp/fxlib.min.js
{ echo "/* three.js r128 post-processing (MIT, (c) three.js authors): EffectComposer, RenderPass, ShaderPass, CopyShader, LuminosityHighPassShader,"
  echo "   UnrealBloomPass. Bundled from node_modules/three/examples/js by tools/fxlib.sh. */"
  cat /tmp/fxlib.min.js; } > src/11-fxlib.js
wc -c src/11-fxlib.js
