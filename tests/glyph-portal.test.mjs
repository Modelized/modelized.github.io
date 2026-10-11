import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (name) => readFile(new URL('../docs/assets/js/' + name, import.meta.url), 'utf8');
const source = await read('modules/glyph-portal.js');
const scope = vm.createContext({});
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
const travel = (length, scale) => scope.glyphLoadingPhase(100, length, scale, 16) * length * scale;
assert.ok(Math.abs(travel(1200, .1) - travel(600, .4)) < 1e-10);
assert.ok(Math.abs(travel(1200, .1) - 100 / 1800 * Math.PI * 32 * .98) < 1e-10);
for (const length of [20, 40, 80]) {
  assert.equal(scope.glyphLoadingPhase(900, length, 1, 16), .5);
}
assert.match(source, /glyphLoadingPhase\(elapsed, travelLength, press/);
assert.match(source, /--glyph-ink-rgb.*248 - 15 \* flight.scale/);
assert.match(source, /length \* \.48/);
assert.match(source, /logoFrame\(s, 1, 0, performance.now\(\) - s.started\)/);
assert.match(source, /s\.layout = prepare\(keyboard\)/);
assert.match(source, /restoreLogo\(s\);\s*if \(opened\) complete/);
assert.match(source, /if \(opened\) complete\(s.keyboard\);\s*material\?\.finishTexture\(\);/);
const story = await read('glyph-story.js');
assert.doesNotMatch(story, /applyEntryVisual|openStory|activateBloom|gridCanvas/);
assert.match(story, /cancelStory\(\); setScrollLocked\(false\)/);
assert.match(story, /createTextureLightLayer\(root, mark\)/);
assert.match(story, /fillOpacity = progress === 1 \? "1" : "0"/);
const fieldSource = await read('modules/glyph-light-field.js');
const waveSource = await read('modules/texture-wave.js');
vm.runInContext(waveSource.replace(/^export /gm, ''), scope);
vm.runInContext(fieldSource.replace(/^import .*;\n/gm, '').replace(/^export /gm, ''), scope);
assert.match(fieldSource, /vec3 wave = textureWave\(point\)/);
assert.match(fieldSource, /vec4 lens = textureSpreadLight\(point\)/);
assert.match(fieldSource, /waveSize: \[Math.hypot\(box.width, box.height\) \/ 2/);
const phase = scope.sampleTextureMotion(1, .15).position;
const reach = Math.hypot(320, 320) / 2, breadth = 320 * .13;
const radius = 32 + (reach + breadth * 1.1 - 32) * phase;
assert.ok(radius < 160, 'The wave must not clear a 320px logo in the first 15% of synthesis');
const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const fillAt = (time, distance) => {
  const p = scope.sampleGlyphSynthesis(time).position;
  const width = 320 * .30;
  const radius = -reach * .45 + (reach * 1.45 + width * 1.3) * p;
  const q = (distance - radius) / (width * (.8 + .4 * p));
  return (1 - smoothstep(-1, 1, q)) * smoothstep(0, .12, p);
};
assert.equal(scope.sampleGlyphSynthesis(0).position, 0);
assert.equal(scope.sampleGlyphSynthesis(1).position, 1);
let previous = 0;
for (let i = 0; i <= 100; i++) {
  const value = fillAt(i / 100, reach * .7);
  assert.ok(value >= previous && value <= 1);
  previous = value;
}
assert.ok(fillAt(.2, reach * .7) < .25, 'Outer glyphs must remain mostly unfilled at 330ms');
assert.ok(fillAt(.5, reach * .7) > .5 && fillAt(.5, reach * .7) < .95);
assert.equal(fillAt(1, reach), 1);
assert.match(waveSource, /float ring = smoothstep\(\.42, \.78, phase\)/);
assert.match(source, /item.opacity = Math.min\(item.opacity \?\? 1/);
assert.doesNotMatch(fieldSource, /haloDistance|float front/);
const css = await readFile(new URL('../docs/assets/css/components/glyph-story.css', import.meta.url), 'utf8');
assert.match(css, /\.glyph-piece__fill \{\s*fill: rgb\(var\(--glyph-ink-rgb\)\);\s*fill-opacity: 0;/);
assert.match(css, /translate3d\(0, 10px, 0\)/);
assert.match(css, /body.glyph-story-active \.site-nav \{\s*animation: none !important;\s*transition: none !important;\s*visibility: hidden;/);
assert.match(css, /color: #f3f2ee;/);
assert.match(css, /color: rgba\(243, 242, 238, 0.8\);/);
const mask = new Uint8Array(49);
for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++) mask[y * 7 + x] = 255;
const field = scope.signedGlyphDistance(mask, 7, 7);
const distance = (i) => (field[i * 4] * 256 + field[i * 4 + 1] - 32768) / 16;
assert.ok(distance(24) < distance(16) && distance(16) < 0);
assert.ok(distance(0) > distance(8) && distance(8) > 0);
for (let i = 0; i < mask.length; i++) assert.equal(field[i * 4 + 2], mask[i]);
console.log('Glyph flight endpoints, overshoot, shared renderer gate, and retired entry path checked');
console.log('Screen-space loader speed, stable unfilled handoff, radial fill and shared optics checked');
