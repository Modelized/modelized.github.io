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
assert.match(source, /if \(opened\) complete\(s.keyboard\);\s*material\?\.finishTexture\(\);/);
const story = await read('glyph-story.js');
assert.doesNotMatch(story, /applyEntryVisual|openStory|activateBloom|gridCanvas/);
assert.match(story, /cancelStory\(\); setScrollLocked\(false\)/);
console.log('Glyph flight endpoints, overshoot, shared renderer gate, and retired entry path checked');
