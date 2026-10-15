import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (name) => readFile(new URL('../docs/assets/js/' + name, import.meta.url), 'utf8');
const source = await read('modules/glyph-portal.js');
const scope = vm.createContext({});
const motionSource = await read('modules/glyph-motion.js');
vm.runInContext(motionSource.replace(/^export /gm, ''), scope);
vm.runInContext(source.replace(/^import .*;\n/gm, '').replace(/^export /gm, ''), scope);
const flight = scope.glyphFlight;
assert.equal(flight(0).position, 0);
assert.equal(flight(1).position, 1);
assert.equal(flight(0).scale, 0);
assert.equal(flight(1).scale, 1);
let scale = 0, overshoot = false;
for (let i = 0; i <= 100; i++) {
  const frame = flight(i / 100);
  assert.ok(frame.scale >= scale && frame.scale <= 1);
  assert.ok(frame.position >= 0 && frame.position < 1.1);
  overshoot ||= frame.position > 1;
  scale = frame.scale;
}
assert.ok(overshoot);
assert.match(source, /available = .*material\?\.available/);
assert.match(source, /if \(!enabled\(\)\) return;/);
assert.match(source, /exclude: trigger/);
assert.doesNotMatch(source, /glyph-portal-fill|surrounding-x|scale\(\$\{scale\}\)/);
assert.equal(scope.glyphLoadingPhase(0), 0);
assert.equal(scope.glyphLoadingPhase(1000), .5);
assert.equal(scope.glyphLoadingPhase(2000), 0);
assert.equal(scope.glyphLoadingPhase(5000), .5);
assert.match(source, /const phase = glyphLoadingPhase\(elapsed\)/);
assert.doesNotMatch(source, /linearGradient|pointAt|travelLength|loadingRadius|referenceRadius|textureButton/);
assert.match(source, /segment.style.strokeDashoffset/);
assert.match(source, /--glyph-ink-rgb.*248 - 15 \* flight.scale/);
assert.match(source, /length \* \.48/);
assert.match(source, /logoFrame\(s, 1, 0, performance.now\(\) - s.started\)/);
assert.match(source, /s\.layout = prepare\(keyboard\)/);
assert.match(source, /restoreLogo\(s\);\s*if \(opened\) complete/);
assert.match(source, /if \(opened\) complete\(s.keyboard\);\s*clearGlyphCopy\(copy\);\s*s.copyLayer\?\.dispose\(\);\s*material\?\.finishTexture\(\);/);
const story = await read('glyph-story.js');
assert.match(story, /export function initGlyphStory\(\{ heroMaterialReady \}\)/);
assert.doesNotMatch(story, /from ["']\.\/shell\.js/);
const shell = await read('shell.js');
assert.equal((shell.match(/initGlyphStory\(\{/g) || []).length, 1);
const home = await readFile(new URL('../docs/index.html', import.meta.url), 'utf8');
assert.equal((home.match(/<script type="module" src=/g) || []).length, 1);
assert.doesNotMatch(story, /applyEntryVisual|openStory|activateBloom|gridCanvas/);
assert.match(story, /cancelStory\(\); setScrollLocked\(false\)/);
assert.match(story, /createTextureLightLayer\(root, mark, epilogue\)/);
assert.match(story, /fillOpacity = progress === 1 \? "1" : "0"/);
const fieldSource = await read('modules/glyph-light-field.js');
const waveSource = await read('modules/texture-wave.js');
vm.runInContext(waveSource.replace(/^export /gm, ''), scope);
vm.runInContext(fieldSource.replace(/^import .*;\n/gm, '').replace(/^export /gm, ''), scope);
assert.match(fieldSource, /float q = textureWave\(point\).x/);
assert.match(fieldSource, /float revealed = \(1\. - smoothstep\(-\.45, \.45, q\)\) \* smoothstep\(0\., \.10, phase\)/);
assert.doesNotMatch(fieldSource, /glyphWaveSize|waveSize:|float radius/);
assert.match(fieldSource, /vec4 lens = textureSpreadLight\(point\)/);
const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
assert.equal(scope.sampleGlyphSynthesis(0).position, 0);
assert.equal(scope.sampleGlyphSynthesis(1).position, 1);
const spreadLight = waveSource.split('vec4 textureSpreadLight(vec2 point) {')[1].split('export const TEXTURE_LIGHT')[0];
assert.equal((spreadLight.match(/float energy =/g) || []).length, 1);
assert.match(spreadLight, /float q = wave.x \/ spread/);
assert.match(spreadLight, /if \(textureBloom > \.5\) return vec4\(warm \* alpha, alpha\)/);
assert.doesNotMatch(spreadLight, /textureBloomEnergy/);
assert.match(fieldSource, /4\. \* phase \* \(1\. - phase\)/);
assert.doesNotMatch(waveSource, /textureBurst|textureBloomEnvelope/);
assert.doesNotMatch(story, /burst:/);
assert.match(waveSource, /particleStretch = mix\(1.3, 3.8, travel\)/);
assert.match(waveSource, /gl_PointSize = \(8\. \+ fract\(seed \* \.37\) \* 5\. \+ travel \* 7\.\)/);
for (const [width, height, x, y] of [[440, 956, 220, 300], [1440, 900, 430, 440], [956, 440, 280, 210]]) {
  const edge = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
  const breadth = Math.min(width, height) * .30 + edge * .035;
  for (const distance of [0, 80, 160, 240]) {
    let previous = 0;
    for (let frame = 0; frame <= 100; frame++) {
      const phase = scope.sampleGlyphSynthesis(frame / 100).position;
      const radius = (edge + breadth * 3) * phase;
      const q = (distance - radius) / (breadth * (.8 + .6 * phase));
      const fill = (1 - smoothstep(-.45, .45, q)) * smoothstep(0, .1, phase);
      assert.ok(fill >= previous && fill <= 1);
      if (!frame) assert.equal(fill, 0);
      if (q <= -.45 && phase >= .1) assert.equal(fill, 1, 'Fill must follow the light, not a second local wave');
      previous = fill;
    }
    assert.equal(previous, 1);
  }
  const edgePhase = edge / (edge + breadth * 3);
  const energy = (p) => {
    const dispersal = smoothstep(.3, 1, p);
    return smoothstep(0, .1, p) * (1 - p * .35) * (1 - dispersal) / Math.sqrt(1 + 1.8 * dispersal ** 2);
  };
  assert.ok(energy(edgePhase) > .1, 'Light must survive until the farthest viewport corner');
  assert.equal(energy(0), 0);
  assert.equal(energy(1), 0);
  assert.ok(energy(.999) < .00002, 'Light must settle before the canvas is removed');
  const finalQ = (edge - (edge + breadth * 3)) / (breadth * 1.4);
  assert.equal(smoothstep(-.45, .45, finalQ), 0, 'Copy must be fully revealed at handoff');
}
assert.doesNotMatch(fieldSource, /if \(p >= 1\.\)|uniform float glyphProgress/);
let previousSpeed = 0, previousPosition = 0;
for (let i = 0; i <= 100; i++) {
  const { position, speed } = scope.sampleGlyphSynthesis(i / 100);
  assert.ok(speed >= 0);
  assert.ok(i <= 40 ? speed >= previousSpeed : speed <= previousSpeed);
  assert.ok(position >= previousPosition && position <= 1);
  const p = i / 100;
  if (i > 0 && i < 100) {
    const step = .00001;
    const derivative = (scope.sampleGlyphSynthesis(p + step).position - scope.sampleGlyphSynthesis(p - step).position) / (step * 2);
    assert.ok(Math.abs(derivative - speed) < .000001);
  }
  previousSpeed = speed;
  previousPosition = position;
}
assert.equal(scope.sampleGlyphSynthesis(0).speed, 0);
assert.equal(scope.sampleGlyphSynthesis(1).speed, 0);
assert.ok(scope.sampleGlyphSynthesis(.15).position > .04 && scope.sampleGlyphSynthesis(.15).position < .06);
assert.ok(scope.sampleGlyphSynthesis(.25).position < .18);
assert.ok(scope.sampleGlyphSynthesis(.4).position > .4 && scope.sampleGlyphSynthesis(.4).position < .5);
assert.ok(scope.sampleGlyphSynthesis(.75).position > .88);
assert.ok(scope.sampleGlyphSynthesis(.4).speed > 4 * scope.sampleGlyphSynthesis(.1).speed);
assert.match(fieldSource, /GLYPH_SYNTHESIS_MS = 1600/);
assert.equal((story.match(/assemblyScale: sampleGlyphAssemblyScale/g) || []).length, 1);
const synthesisScale = scope.sampleGlyphSynthesisScale;
const assemblyScale = scope.sampleGlyphAssemblyScale;
assert.equal(assemblyScale(0), 1);
assert.equal(synthesisScale(0), assemblyScale(1));
assert.ok(synthesisScale(0) > .63 && synthesisScale(0) < .65);
assert.equal(synthesisScale(.15), .60);
assert.equal(vm.runInContext('GLYPH_CONTRACTION_MS', scope), 1220);
assert.match(story, /motionDuration: GLYPH_CONTRACTION_MS/);
assert.match(story, /duration: motionDuration,\s*easing: settleEase/);
assert.equal((source.match(/sampleTexturePress\([^;]+, 1\.4\)/g) || []).length, 2);
assert.equal(synthesisScale(1), 1);
for (let i = 1; i <= 1000; i++) assert.ok(assemblyScale(i / 1000) < assemblyScale((i - 1) / 1000));
for (let i = 1; i <= 150; i++) assert.ok(synthesisScale(i / 1000) < synthesisScale((i - 1) / 1000));
const scaleStep = 1e-6;
assert.ok(Math.abs((synthesisScale(scaleStep) - synthesisScale(0)) / (scaleStep * 1600)
  - (assemblyScale(1) - assemblyScale(1 - scaleStep)) / (scaleStep * 980)) < 1e-7);
assert.ok(Math.abs((synthesisScale(.15 + scaleStep) - synthesisScale(.15 - scaleStep)) / (2 * scaleStep)) < .001);
assert.match(source, /import \{ glyphFlight, glyphTriggerRect \} from "\.\/glyph-motion\.js\?v=/);
assert.match(fieldSource, /import \{ glyphFlight \} from "\.\/glyph-motion\.js\?v=/);
for (let i = 0; i <= 100; i++) {
  const t = i / 100;
  assert.ok(Math.abs(synthesisScale(.15 + .85 * t) - (.60 + .40 * flight(t).position)) < 1e-12);
}
assert.notEqual(synthesisScale(.99), 1);
assert.match(story, /duration: GLYPH_ASSEMBLY_MS,\s*assemblyScale: sampleGlyphAssemblyScale/);
assert.match(story, /duration, easing: "linear", fill: "both"/);
const scaleFrames = [];
const synthesisScope = vm.createContext({
  sampleGlyphSynthesis: scope.sampleGlyphSynthesis, sampleGlyphSynthesisScale: synthesisScale,
  reducedMotion: { matches: false },
  synthesisBox: { left: 100, top: 100, width: 320, height: 320 },
  rectCenter: (box) => ({ x: box.left + box.width / 2, y: box.top + box.height / 2 }),
  mix: (a, b, p) => a + (b - a) * p,
  mark: { style: {} }, fillPaths: [], glowLayers: [], GLYPH_SYNTHESIS_MS: 1600,
  synthesisLight: { render: (state) => scaleFrames.push(state) },
});
vm.runInContext(story.match(/const applyAssemblyVisual = [\s\S]*?\n  \};/)[0] + '\nthis.renderFrame = applyAssemblyVisual;', synthesisScope);
for (let i = 0; i <= 100; i++) {
  synthesisScope.renderFrame(i / 100);
  const scale = scaleFrames.at(-1).glyphScale;
  assert.equal(synthesisScope.mark.style.transform, `scale(${scale})`);
  assert.ok(scale >= .60 && scale < 1.04);
}
assert.equal(scaleFrames[0].glyphScale, assemblyScale(1));
assert.equal(scaleFrames.at(-1).glyphScale, 1);
assert.ok(scaleFrames.some(frame => frame.glyphScale > 1.02));
synthesisScope.reducedMotion.matches = true;
synthesisScope.renderFrame(.2);
assert.equal(scaleFrames.at(-1).glyphScale, 1);
assert.match(fieldSource, /vec2 glyphPoint = textureOrigin \+ \(point - textureOrigin\) \/ glyphScale/);
assert.match(fieldSource, /vec2 uv = \(glyphPoint - glyphBox.xy\) \/ glyphBox.zw/);
assert.match(source, /item.opacity = Math.min\(item.opacity \?\? 1/);
assert.doesNotMatch(fieldSource, /haloDistance|float front/);
const css = await readFile(new URL('../docs/assets/css/components/glyph-story.css', import.meta.url), 'utf8');
assert.doesNotMatch(css, /clip-path: inset\(0 -100vw\)/);
assert.match(css, /scroll-padding-inline: var\(--glyph-viewport-left\) var\(--glyph-viewport-right\)/);
assert.match(css, /radial-gradient\(ellipse at var\(--glyph-edge-origin\)/);
assert.doesNotMatch(css, /background: linear-gradient\((90|270)deg/);
assert.match(story, /syncVisualBounds\(\)/);
assert.doesNotMatch(story, /drawGlyphGrid/);
assert.match(story, /rail.scrollLeft \+ box.left \+ box.width \/ 2 - metrics.center/);
assert.match(css, /\.glyph-piece__fill \{\s*fill: rgb\(var\(--glyph-ink-rgb\)\);\s*fill-opacity: 0;/);
assert.match(css, /\.glyph-piece__outline \{\s*fill: none;\s*stroke-dasharray: none;/);
assert.doesNotMatch(story, /setPathDash|dashLengthFor|renderedScale|style\.strokeDash(array|offset)\s*=/);
const closingScope = vm.createContext({
  fillPaths: Array.from({ length: 3 }, () => ({ style: {} })),
  artPaths: Array.from({ length: 3 }, () => ({ style: {} })),
  glowLayers: Array.from({ length: 3 }, () => ({ style: {} })),
  mix: (a, b, p) => a + (b - a) * p,
});
vm.runInContext(story.match(/const applyClosingVisual = [\s\S]*?\n  \};/)[0] + '\nthis.closeFrame = applyClosingVisual;', closingScope);
for (const filled of [false, true]) for (const progress of [0, .1, .5, 1]) {
  closingScope.closeFrame(progress, filled, progress);
  for (const path of closingScope.artPaths) {
    assert.equal(path.style.strokeDasharray, undefined);
    assert.equal(path.style.strokeDashoffset, undefined);
    assert.ok(path.style.stroke.endsWith(`${.96 * (1 - progress)})`));
  }
}
assert.match(css, /translate3d\(0, 10px, 0\)/);
assert.match(css, /body.glyph-story-active \.site-nav \{\s*animation: none !important;\s*transition: none !important;\s*visibility: hidden;/);
assert.match(css, /color: #f3f2ee;/);
assert.match(css, /color: rgba\(243, 242, 238, 0.8\);/);
assert.doesNotMatch(css, /opacity 180ms linear/);
assert.doesNotMatch(story, /overlap|alongside|lightStart/);
assert.match(story, /prepare: \(\) => \{[\s\S]*createTextureLightLayer/);
assert.match(story, /if \(!changed \|\| root.hidden \|\| state !== "synthesis"\)[\s\S]*await runFrameTimeline\(reducedMotion.matches \? 180 : GLYPH_SYNTHESIS_MS, applyAssemblyVisual\)/);
assert.match(source, /sampleTextureMotion\(0, s.cancelProgress \* \(1 - p\)\)/);
const copySource = await read('modules/glyph-copy-motion.js');
assert.match(copySource, /createTreeWalker/);
assert.match(copySource, /range.getBoundingClientRect/);
assert.match(copySource, /style.letterSpacing === "normal" \? "0px"/);
assert.doesNotMatch(copySource, /skew|sampleGlyphCopy|style.transform = `.*scale/);
assert.match(copySource, /element.classList.add\("glyph-copy-settled"\)/);
assert.match(css, /\.glyph-story \.glyph-copy-settled \{\s*transition: none;/);
const lightLayer = await read('modules/texture-light-layer.js');
assert.match(source, /createTextureLightLayer\(root, null, copy, \{ copyOnly: true \}\)/);
assert.match(source, /copyLift: .*1 - flight.position/);
assert.match(lightLayer, /copyProgram = copy \? program\(vertex, TEXTURE_SURFACE\)/);
assert.doesNotMatch(lightLayer, /glyphWaveSize|textureWaveSize/);
assert.doesNotMatch(waveSource, /textureWaveSize/);
assert.match(waveSource, /float reach = textureReach\(\);\s*float breadth = min\(textureViewport.x, textureViewport.y\) \* \.30 \+ reach \* \.035;/);
assert.match(lightLayer, /glyphScale: state.glyphScale \?\? 1/);
assert.doesNotMatch(lightLayer, /TEXTURE_PARTICLE|particles|seeds|gl.POINTS|state.burst/);
const material = await read('modules/hero-material.js');
assert.match(material, /createProgram\(gl, TEXTURE_PARTICLE_FRAGMENT, TEXTURE_PARTICLE_VERTEX\)/);
assert.match(lightLayer, /surfaceIncoming"\), 1/);
assert.match(waveSource, /mix\(textureVisibility\(point\), 1. - textureVisibility\(point\), surfaceIncoming\)/);
const mask = new Uint8Array(49);
for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++) mask[y * 7 + x] = 255;
const field = scope.signedGlyphDistance(mask, 7, 7);
const distance = (i) => (field[i * 4] * 256 + field[i * 4 + 1] - 32768) / 16;
assert.ok(distance(24) < distance(16) && distance(16) < 0);
assert.ok(distance(0) > distance(8) && distance(8) > 0);
for (let i = 0; i < mask.length; i++) assert.equal(field[i * 4 + 2], mask[i]);
console.log('Glyph flight endpoints, overshoot, shared renderer gate, and retired entry path checked');
console.log('Shared loader cadence, assembly-before-fill, shader-masked copy and shared optics checked');
