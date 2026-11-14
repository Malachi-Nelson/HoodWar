/* three.js r128 post-processing (MIT, (c) three.js authors): EffectComposer, RenderPass, ShaderPass, CopyShader, LuminosityHighPassShader,
   UnrealBloomPass. Bundled from node_modules/three/examples/js by tools/fxlib.sh. */
(function(){class n{constructor(t,i){if(this.renderer=t,i===void 0){const s={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat},r=t.getSize(new THREE.Vector2);this._pixelRatio=t.getPixelRatio(),this._width=r.width,this._height=r.height,i=new THREE.WebGLRenderTarget(this._width*this._pixelRatio,this._height*this._pixelRatio,s),i.texture.name="EffectComposer.rt1"}else this._pixelRatio=1,this._width=i.width,this._height=i.height;this.renderTarget1=i,this.renderTarget2=i.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],THREE.CopyShader===void 0&&console.error("THREE.EffectComposer relies on THREE.CopyShader"),THREE.ShaderPass===void 0&&console.error("THREE.EffectComposer relies on THREE.ShaderPass"),this.copyPass=new THREE.ShaderPass(THREE.CopyShader),this.clock=new THREE.Clock}swapBuffers(){const t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,i){this.passes.splice(i,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){const i=this.passes.indexOf(t);i!==-1&&this.passes.splice(i,1)}isLastEnabledPass(t){for(let i=t+1;i<this.passes.length;i++)if(this.passes[i].enabled)return!1;return!0}render(t){t===void 0&&(t=this.clock.getDelta());const i=this.renderer.getRenderTarget();let s=!1;for(let r=0,f=this.passes.length;r<f;r++){const u=this.passes[r];if(u.enabled!==!1){if(u.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(r),u.render(this.renderer,this.writeBuffer,this.readBuffer,t,s),u.needsSwap){if(s){const d=this.renderer.getContext(),h=this.renderer.state.buffers.stencil;h.setFunc(d.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),h.setFunc(d.EQUAL,1,4294967295)}this.swapBuffers()}THREE.MaskPass!==void 0&&(u instanceof THREE.MaskPass?s=!0:u instanceof THREE.ClearMaskPass&&(s=!1))}}this.renderer.setRenderTarget(i)}reset(t){if(t===void 0){const i=this.renderer.getSize(new THREE.Vector2);this._pixelRatio=this.renderer.getPixelRatio(),this._width=i.width,this._height=i.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,i){this._width=t,this._height=i;const s=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(s,r),this.renderTarget2.setSize(s,r);for(let f=0;f<this.passes.length;f++)this.passes[f].setSize(s,r)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}}class c{constructor(){this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}}const e=new THREE.OrthographicCamera(-1,1,1,-1,0,1),o=new THREE.BufferGeometry;o.setAttribute("position",new THREE.Float32BufferAttribute([-1,3,0,-1,-1,0,3,-1,0],3)),o.setAttribute("uv",new THREE.Float32BufferAttribute([0,2,0,0,2,0],2));class a{constructor(t){this._mesh=new THREE.Mesh(o,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,e)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}}THREE.EffectComposer=n,THREE.FullScreenQuad=a,THREE.Pass=c})(),(function(){class n extends THREE.Pass{constructor(e,o,a,l,t){super(),this.scene=e,this.camera=o,this.overrideMaterial=a,this.clearColor=l,this.clearAlpha=t!==void 0?t:0,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new THREE.Color}render(e,o,a){const l=e.autoClear;e.autoClear=!1;let t,i;this.overrideMaterial!==void 0&&(i=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor&&(e.getClearColor(this._oldClearColor),t=e.getClearAlpha(),e.setClearColor(this.clearColor,this.clearAlpha)),this.clearDepth&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:a),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor&&e.setClearColor(this._oldClearColor,t),this.overrideMaterial!==void 0&&(this.scene.overrideMaterial=i),e.autoClear=l}}THREE.RenderPass=n})(),(function(){class n extends THREE.Pass{constructor(e,o){super(),this.textureID=o!==void 0?o:"tDiffuse",e instanceof THREE.ShaderMaterial?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=THREE.UniformsUtils.clone(e.uniforms),this.material=new THREE.ShaderMaterial({defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new THREE.FullScreenQuad(this.material)}render(e,o,a){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=a.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(o),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}}THREE.ShaderPass=n})(),(function(){var n={uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;

		}`};THREE.CopyShader=n})(),(function(){const n={shaderID:"luminosityHighPass",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new THREE.Color(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			vec3 luma = vec3( 0.299, 0.587, 0.114 );

			float v = dot( texel.xyz, luma );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};THREE.LuminosityHighPassShader=n})(),(function(){class n extends THREE.Pass{constructor(e,o,a,l){super(),this.strength=o!==void 0?o:1,this.radius=a,this.threshold=l,this.resolution=e!==void 0?new THREE.Vector2(e.x,e.y):new THREE.Vector2(256,256),this.clearColor=new THREE.Color(0,0,0);const t={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat};this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let i=Math.round(this.resolution.x/2),s=Math.round(this.resolution.y/2);this.renderTargetBright=new THREE.WebGLRenderTarget(i,s,t),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){const m=new THREE.WebGLRenderTarget(i,s,t);m.texture.name="UnrealBloomPass.h"+h,m.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(m);const T=new THREE.WebGLRenderTarget(i,s,t);T.texture.name="UnrealBloomPass.v"+h,T.texture.generateMipmaps=!1,this.renderTargetsVertical.push(T),i=Math.round(i/2),s=Math.round(s/2)}THREE.LuminosityHighPassShader===void 0&&console.error("THREE.UnrealBloomPass relies on THREE.LuminosityHighPassShader");const r=THREE.LuminosityHighPassShader;this.highPassUniforms=THREE.UniformsUtils.clone(r.uniforms),this.highPassUniforms.luminosityThreshold.value=l,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new THREE.ShaderMaterial({uniforms:this.highPassUniforms,vertexShader:r.vertexShader,fragmentShader:r.fragmentShader,defines:{}}),this.separableBlurMaterials=[];const f=[3,5,7,9,11];i=Math.round(this.resolution.x/2),s=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(f[h])),this.separableBlurMaterials[h].uniforms.texSize.value=new THREE.Vector2(i,s),i=Math.round(i/2),s=Math.round(s/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=o,this.compositeMaterial.uniforms.bloomRadius.value=.1,this.compositeMaterial.needsUpdate=!0;const u=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=u,this.bloomTintColors=[new THREE.Vector3(1,1,1),new THREE.Vector3(1,1,1),new THREE.Vector3(1,1,1),new THREE.Vector3(1,1,1),new THREE.Vector3(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,THREE.CopyShader===void 0&&console.error("THREE.UnrealBloomPass relies on THREE.CopyShader");const d=THREE.CopyShader;this.copyUniforms=THREE.UniformsUtils.clone(d.uniforms),this.copyUniforms.opacity.value=1,this.materialCopy=new THREE.ShaderMaterial({uniforms:this.copyUniforms,vertexShader:d.vertexShader,fragmentShader:d.fragmentShader,blending:THREE.AdditiveBlending,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new THREE.Color,this.oldClearAlpha=1,this.basic=new THREE.MeshBasicMaterial,this.fsQuad=new THREE.FullScreenQuad(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose()}setSize(e,o){let a=Math.round(e/2),l=Math.round(o/2);this.renderTargetBright.setSize(a,l);for(let t=0;t<this.nMips;t++)this.renderTargetsHorizontal[t].setSize(a,l),this.renderTargetsVertical[t].setSize(a,l),this.separableBlurMaterials[t].uniforms.texSize.value=new THREE.Vector2(a,l),a=Math.round(a/2),l=Math.round(l/2)}render(e,o,a,l,t){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const i=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),t&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=a.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=a.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let s=this.renderTargetBright;for(let r=0;r<this.nMips;r++)this.fsQuad.material=this.separableBlurMaterials[r],this.separableBlurMaterials[r].uniforms.colorTexture.value=s.texture,this.separableBlurMaterials[r].uniforms.direction.value=n.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[r]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[r].uniforms.colorTexture.value=this.renderTargetsHorizontal[r].texture,this.separableBlurMaterials[r].uniforms.direction.value=n.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[r]),e.clear(),this.fsQuad.render(e),s=this.renderTargetsVertical[r];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.materialCopy,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,t&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(a),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=i}getSeperableBlurMaterial(e){return new THREE.ShaderMaterial({defines:{KERNEL_RADIUS:e,SIGMA:e},uniforms:{colorTexture:{value:null},texSize:{value:new THREE.Vector2(.5,.5)},direction:{value:new THREE.Vector2(.5,.5)}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 texSize;
				uniform vec2 direction;

				float gaussianPdf(in float x, in float sigma) {
					return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;
				}
				void main() {
					vec2 invSize = 1.0 / texSize;
					float fSigma = float(SIGMA);
					float weightSum = gaussianPdf(0.0, fSigma);
					vec3 diffuseSum = texture2D( colorTexture, vUv).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianPdf(x, fSigma);
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(e){return new THREE.ShaderMaterial({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},dirtTexture:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform sampler2D dirtTexture;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}n.BlurDirectionX=new THREE.Vector2(1,0),n.BlurDirectionY=new THREE.Vector2(0,1),THREE.UnrealBloomPass=n})();
