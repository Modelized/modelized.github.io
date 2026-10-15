import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (path) => readFile(new URL('../docs/' + path, import.meta.url), 'utf8');
const story = await read('assets/js/glyph-story.js');
const motion = await read('assets/js/modules/glyph-motion.js');
const scope = vm.createContext({});
vm.runInContext(motion.replace(/^export /gm, ''), scope);
for (const size of [80, 160, 400]) {
  const rect = scope.glyphTriggerRect({ querySelector: () => ({
    getBoundingClientRect: () => ({ left: 20, top: 30, width: size, height: size })
  }) });
  assert.equal(rect.left, 20 + size * 108 / 512);
  assert.equal(rect.top, 30 + size * 122 / 512);
  assert.equal(rect.width, size * 296 / 512);
  assert.equal(rect.height, size * 297 / 512);
}

for (const stacked of [true, false]) {
  const properties = {};
  const viewport = { left: 0, top: 0, right: 1200, bottom: 900 };
  const box = { left: 48, top: 60, right: stacked ? 1152 : 650, bottom: stacked ? 560 : 840 };
  const copyBox = { left: stacked ? 48 : 710, top: stacked ? 620 : 60 };
  const boundsScope = vm.createContext({
    root: { getBoundingClientRect: () => viewport },
    visual: { getBoundingClientRect: () => box, style: { setProperty: (k, v) => properties[k] = v } },
    copyRegion: { getBoundingClientRect: () => copyBox }, stackedLayout: { matches: stacked }
  });
  vm.runInContext('let visualInsets;\n' + story.match(/const syncVisualBounds = [\s\S]*?\n  \};/)[0]
    + '\nsyncVisualBounds();', boundsScope);
  const inset = (side) => parseFloat(properties['--glyph-viewport-' + side]);
  assert.equal(box.left - inset('left'), viewport.left);
  assert.equal(box.top - inset('top'), viewport.top);
  assert.equal(box.right + inset('right'), stacked ? viewport.right : 680);
  assert.equal(box.bottom + inset('bottom'), stacked ? 590 : viewport.bottom);
}

assert.doesNotMatch(story, /is-wheeling|railWheelTimer/);
assert.doesNotMatch(story.match(/const handleRailWheel = [\s\S]*?\n  \};/)[0], /scrollLeft\s*=|preventDefault|setTimeout/);
assert.doesNotMatch(story.match(/const performResponsiveReflow = [\s\S]*?\n  \};/)[0], /scrollLeft\s*=/);

for (const width of [320, 720]) {
  for (const progress of [0, .3, 1, 1.8, 2]) {
    const scope = vm.createContext({
      clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
      rail: { clientWidth: width + 80, getBoundingClientRect: () => ({ left: 0 }) },
      visualInsets: { left: 30, right: 50 },
      pieces: [0, 1, 2].map((index) => ({
        getBoundingClientRect: () => ({ left: 30 + (index - progress) * width, width })
      }))
    });
    vm.runInContext(story.match(/const measureRail = [\s\S]*?\n  \};/)[0] + '\n' +
      story.match(/const railProgress = [\s\S]*?\n  \};/)[0] + '\nthis.progress = railProgress();', scope);
    assert.ok(Math.abs(scope.progress - progress) < 1e-10);
  }
}

const css = await read('assets/css/components/glyph-story.css');
const textureCSS = await read('assets/css/components/texture-control.css');
const baseCSS = await read('assets/css/style.css');
assert.match(css, /scroll-snap-type: x mandatory/);
assert.match(css, /\.glyph-story\.is-transitioning \.glyph-piece\s*\{\s*overflow: visible;\s*opacity: 1;\s*transition: none;/);
assert.match(css, /\.glyph-story\[data-state="focus"\] \.glyph-story__mark\s*\{\s*display: contents;/);
assert.match(css, /-webkit-tap-highlight-color: transparent/);
assert.match(textureCSS, /-webkit-tap-highlight-color: transparent/);
assert.doesNotMatch(baseCSS, /\.nav-texture-control:active\s*\{/);
assert.match(await read('index.html'), /data-glyph-hint/);
assert.match(await read('assets/js/modules/glyph-copy-motion.js'), /closest\("\[data-glyph-hint\]"\)/);
console.log('Glyph crop continuity, internal region bounds, native wheel handling, tap backgrounds and unwarped hint checked');
