// Dependency-free controller and motion checks; no GPU rendering.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../docs/assets/js/modules/texture-control.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '').replace('export function', 'function');
const waveSource = (await readFile(new URL('../docs/assets/js/modules/texture-wave.js', import.meta.url), 'utf8'))
  .replace(/^export /gm, '');
const motionContext = vm.createContext({});
vm.runInContext(waveSource, motionContext);
const sampleTextureMotion = motionContext.sampleTextureMotion;
const sampleTextureCharge = motionContext.sampleTextureCharge;

for (const stage of [0, 1]) {
  assert.equal(sampleTextureMotion(stage, 0).position, 0);
  assert.equal(sampleTextureMotion(stage, 1).position, 1);
  let previous = sampleTextureMotion(stage, 0);
  let increment = Infinity;
  for (let i = 1; i <= 100; i++) {
    const next = sampleTextureMotion(stage, i / 100);
    assert.ok(Number.isFinite(next.speed) && next.speed >= 0);
    assert.ok(next.position >= previous.position && next.position <= 1);
    if (stage === 1) {
      assert.ok(next.speed <= previous.speed);
      assert.ok(next.position - previous.position <= increment + 1e-12);
    }
    increment = next.position - previous.position;
    previous = next;
  }
}
console.log('Motion profiles: bounded, continuous endpoints and decelerating expansion');
assert.ok(sampleTextureMotion(1, .25).position > .5);
assert.ok(sampleTextureMotion(1, .5).position > .79);
assert.ok(sampleTextureMotion(1, .5).position < .81);
assert.equal(sampleTextureMotion(1, 1).speed, 0);
for (const elapsed of [0, 900, 1300]) {
  const jitter = sampleTextureCharge(elapsed);
  assert.equal(Math.abs(jitter.x) + Math.abs(jitter.y), 0);
}
for (let elapsed = 1300; elapsed < 30000; elapsed += 16) {
  const jitter = sampleTextureCharge(elapsed);
  assert.ok(Math.abs(jitter.x) <= 2.48 && Math.abs(jitter.y) <= 1.92);
  assert.ok(jitter.energy >= 0 && jitter.energy <= 1.6);
}
assert.equal(sampleTextureCharge(1300).energy, 0);
assert.equal(sampleTextureCharge(2500).energy, 1);
assert.ok(sampleTextureCharge(4000).energy > 1);
assert.equal(sampleTextureCharge(5500).energy, 1.6);
assert.equal(sampleTextureCharge(30000).energy, 1.6);
assert.equal(sampleTextureMotion(1, 0).recoil, 1);
assert.equal(sampleTextureMotion(1, 1).recoil, 0);
assert.ok(Math.abs(sampleTextureMotion(1, .2).recoil) < .02);
assert.ok(sampleTextureMotion(1, .3).recoil < -.08);
assert.ok(sampleTextureMotion(1, .3).recoil > -.12);
assert.ok(sampleTextureMotion(1, .6).recoil > 0);
for (let i = 50; i <= 100; i++) assert.ok(Math.abs(sampleTextureMotion(1, i / 100).recoil) < .012);
console.log('Recoil: early return, one primary overshoot and a subdued settling response');

class Element {
  constructor() {
    this.events = new Map(); this.dataset = {}; this.attrs = {};
    this.classes = new Set();
    this.classList = {
      contains: (name) => this.classes.has(name),
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      toggle: (name, yes) => yes ? this.classes.add(name) : this.classes.delete(name)
    };
    this.style = { setProperty() {}, removeProperty() {} };
  }
  addEventListener(name, fn) {
    this.events.set(name, [...(this.events.get(name) || []), fn]);
  }
  emit(name, values = {}) {
    const event = { preventDefault() {}, ...values };
    for (const fn of this.events.get(name) || []) fn(event);
  }
  setAttribute(name, value) { this.attrs[name] = value; }
  setPointerCapture() {}
  contains(node) { return node === this; }
  getBoundingClientRect() { return { left: 340, top: 16, width: 32, height: 32 }; }
}

async function setup({ preference = 'liquid', available = true, delayed = false, scale, reduced = false } = {}) {
  let time = 0, id = 0, resolvePreparation, rejectPreparation;
  const jobs = new Map(), saved = [], draws = [];
  const body = new Element(), html = new Element(), button = new Element(), icon = new Element();
  body.classList.add('hero-ready');
  button.querySelector = () => icon;
  const document = new Element();
  Object.assign(document, { body, documentElement: html, hidden: false, scrollingElement: { scrollTop: 0 } });
  document.querySelector = (selector) => selector === '[data-texture-control]' ? button : new Element();
  const otherControl = new Element();
  otherControl.inert = false;
  document.querySelectorAll = () => [otherControl];
  const window = new Element();
  Object.assign(window, { scrollY: 0, scrollTo: ({ top }) => { window.scrollY = top; window.emit('scroll'); } });
  if (scale !== undefined) window.visualViewport = Object.assign(new Element(), { scale });
  const schedule = (fn, delay) => { jobs.set(++id, { due: time + delay, fn }); return id; };
  const material = {
    available, finishes: 0,
    prepareTexture: () => delayed ? new Promise((resolve, reject) => {
      resolvePreparation = resolve; rejectPreparation = reject;
    }) : Promise.resolve(),
    updateTexture: (frame) => draws.push(frame),
    finishTexture: () => material.finishes++
  };
  const context = vm.createContext({
    document, window, innerWidth: 440, AbortController, sampleTextureMotion, sampleTextureCharge, console: { warn() {}, debug() {} },
    performance: { now: () => time },
    requestAnimationFrame: (fn) => schedule(fn, 16), cancelAnimationFrame: (key) => jobs.delete(key),
    setTimeout: (fn, delay) => schedule(fn, delay), clearTimeout: (key) => jobs.delete(key),
    matchMedia: () => Object.assign(new Element(), { matches: reduced }),
    MutationObserver: class { observe() {} },
    getTexturePreference: () => preference,
    saveTexturePreference: (value) => { preference = value; saved.push(value); }
  });
  vm.runInContext(source + '\nthis.init = initTextureControl;', context);
  context.init({ materialReady: Promise.resolve(material) });
  const microtasks = async () => { await Promise.resolve(); await Promise.resolve(); };
  const advance = async (ms) => {
    const end = time + ms;
    await microtasks();
    while (true) {
      const next = [...jobs].filter(([, job]) => job.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      jobs.delete(next[0]); time = next[1].due; next[1].fn(time); await microtasks();
    }
    time = end; await microtasks();
  };
  const press = () => button.emit('pointerdown', { isPrimary: true, button: 0, pointerId: 1 });
  const release = () => {
    button.emit('pointerup', { pointerId: 1 });
    button.emit('click', { detail: 1 });
  };
  await advance(200);
  return { body, html, button, otherControl, window, document, material, saved, draws, advance, press, release,
    resolve: () => resolvePreparation(), reject: () => rejectPreparation(new Error('test failure')) };
}

for (const preference of ['flat', 'liquid']) {
  const t = await setup({ preference });
  t.press(); await t.advance(1800);
  assert.equal(t.otherControl.inert, true);
  let blocked = false;
  t.document.emit('click', { target: t.otherControl, preventDefault() { blocked = true; }, stopImmediatePropagation() {} });
  assert.equal(blocked, true);
  assert.deepEqual(t.saved, []); // A completed hold must NOT activate by itself.
  assert.equal(t.button.dataset.phase, 'armed');
  t.release(); await t.advance(1200);
  assert.deepEqual(t.saved, [preference === 'flat' ? 'liquid' : 'flat']);
  assert.ok(t.draws.some((frame) => frame.stage === 1));
  for (const frame of t.draws) {
    assert.equal(frame.origin.radius, 16);
    assert.deepEqual(frame.motion, sampleTextureMotion(frame.stage, frame.progress));
  }
  assert.equal(t.body.classList.contains('texture-scroll-lock'), false);
  assert.equal(t.otherControl.inert, false);
}
{
  const t = await setup();
  t.press(); await t.advance(1200);
  assert.ok(t.draws.every(({ jitter }) => Math.abs(jitter.x) + Math.abs(jitter.y) === 0));
  await t.advance(1800);
  assert.ok(t.draws.some(({ jitter }) => Math.abs(jitter.x) > .5));
  t.release(); await t.advance(350);
  const last = t.draws.at(-1);
  assert.equal(last.stage, 1);
  assert.ok(Math.abs(last.jitter.x) + Math.abs(last.jitter.y) < .001);
  assert.ok(last.charge < .001);
  assert.equal(last.strength, 1);
  await t.advance(900);
  assert.deepEqual(t.saved, ['flat']);
}
{
  const t = await setup({ reduced: true });
  t.press(); await t.advance(3000); t.release(); await t.advance(300);
  assert.equal(t.draws.length, 0);
  assert.deepEqual(t.saved, ['flat']);
  assert.equal(t.body.classList.contains('texture-scroll-lock'), false);
}
{
  const t = await setup();
  t.press(); await t.advance(200); t.release(); await t.advance(300);
  assert.deepEqual(t.saved, []);
  assert.equal(t.body.classList.contains('texture-scroll-lock'), false);
}
{
  const t = await setup({ delayed: true });
  t.press(); await t.advance(950); t.release();
  assert.equal(t.button.dataset.phase, 'waiting');
  assert.deepEqual(t.saved, []);
  t.resolve(); await t.advance(1400);
  assert.deepEqual(t.saved, ['flat']);
}
{
  const t = await setup({ delayed: true });
  t.press(); await t.advance(950); t.resolve(); await t.advance(300);
  assert.equal(t.button.dataset.phase, 'armed');
  assert.deepEqual(t.saved, []);
  t.release(); await t.advance(1200);
  assert.deepEqual(t.saved, ['flat']);
}
{
  const t = await setup({ delayed: true });
  t.press(); await t.advance(950); t.release(); await t.advance(13000);
  assert.deepEqual(t.saved, []);
  assert.equal(t.body.classList.contains('texture-scroll-lock'), false);
  t.resolve(); await t.advance(100);
  assert.deepEqual(t.saved, []);
}
{
  const t = await setup();
  t.window.scrollY = 1; t.window.emit('scroll');
  assert.equal(t.button.dataset.action, 'top');
  t.press(); assert.equal(t.button.dataset.phase, undefined);
  await t.advance(200);
  t.button.emit('click', { detail: 1 });
  assert.equal(t.window.scrollY, 0);
  assert.equal(t.button.dataset.action, 'top');
  await t.advance(179); assert.equal(t.button.dataset.action, 'top');
  await t.advance(1); assert.equal(t.button.dataset.action, 'texture');
}
for (const interrupt of ['hidden', 'renderer']) {
  const t = await setup();
  t.press(); await t.advance(1000);
  t.release(); await t.advance(100);
  if (interrupt === 'hidden') {
    t.document.hidden = true; t.document.emit('visibilitychange');
  } else {
    t.material.available = false; t.window.emit('texture:availability');
  }
  await t.advance(1000);
  assert.deepEqual(t.saved, []);
  assert.equal(t.body.classList.contains('texture-scroll-lock'), false);
  assert.equal(t.button.dataset.phase, undefined);
}
{
  const t = await setup({ available: false });
  t.press(); await t.advance(2000);
  assert.equal(t.button.attrs['aria-disabled'], 'true');
  assert.deepEqual(t.saved, []);
  assert.equal(t.draws.length, 0);
}
{
  const t = await setup({ delayed: true });
  t.press(); t.reject(); await t.advance(100);
  assert.deepEqual(t.saved, []);
  assert.equal(t.body.classList.contains('texture-scroll-lock'), false);
  assert.equal(t.button.dataset.phase, undefined);
}
{
  const t = await setup();
  t.button.emit('keydown', { key: ' ', repeat: false });
  await t.advance(200); t.button.emit('blur'); await t.advance(250);
  assert.deepEqual(t.saved, []);
  assert.equal(t.body.classList.contains('texture-scroll-lock'), false);
}
{
  const t = await setup({ scale: 2 });
  assert.equal(t.button.attrs['aria-disabled'], 'true');
  t.press(); t.button.emit('click', { detail: 0 }); await t.advance(2000);
  assert.equal(t.button.dataset.phase, undefined);
  assert.equal(t.body.classList.contains('texture-scroll-lock'), false);
  assert.deepEqual(t.saved, []);
  assert.equal(t.draws.length, 0);
}
for (const phase of ['charge', 'spread']) {
  const t = await setup({ scale: 1 });
  t.press(); await t.advance(phase === 'charge' ? 300 : 1000);
  if (phase === 'spread') t.release();
  t.window.visualViewport.scale = 1.5;
  t.window.visualViewport.emit('resize');
  assert.equal(t.button.attrs['aria-disabled'], 'true');
  assert.equal(t.button.dataset.phase, undefined);
  assert.equal(t.body.classList.contains('texture-scroll-lock'), false);
  assert.equal(t.otherControl.inert, false);
  await t.advance(1200);
  assert.deepEqual(t.saved, []);
  t.window.visualViewport.scale = 1;
  t.window.visualViewport.emit('resize');
  assert.equal(t.button.attrs['aria-disabled'], 'false');
  t.press(); await t.advance(1000); t.release(); await t.advance(1200);
  assert.deepEqual(t.saved, ['flat']);
}
// The full label wraps naturally at phone width even without an explicit <br>.
{
  const draws = [];
  const node = { nodeType: 3, textContent: 'View Projects' };
  const label = { childNodes: [node], getBoundingClientRect: () => ({ width: 80 }) };
  const rect = { left: 100, top: 200, width: 120, height: 50 };
  const ctx = {
    scale() {}, beginPath() {}, roundRect() {}, fill() {}, stroke() {},
    measureText: () => ({ fontBoundingBoxAscent: 8, fontBoundingBoxDescent: 2 }),
    fillText: (text, x, y) => draws.push({ text, x, y }),
    getImageData: () => ({ data: new Uint8ClampedArray(120 * 50 * 4) })
  };
  const element = {
    getBoundingClientRect: () => rect, matches: () => false,
    querySelector: () => null, querySelectorAll: () => [label]
  };
  const context = vm.createContext({
    Node: { TEXT_NODE: 3 },
    getComputedStyle: () => ({ fontSize: '14px', fontWeight: '600', fontFamily: 'sans-serif', textTransform: 'uppercase' }),
    document: {
      createElement: () => ({ getContext: () => ctx }),
      createRange: () => ({
        setStart(_, index) { this.start = index; }, setEnd(_, index) { this.end = index; },
        getBoundingClientRect() {
          return { left: 110, top: this.start === 0 ? 210 : 224, width: 70, height: 14 };
        }
      })
    }
  });
  const surfaceSource = (await readFile(new URL('../docs/assets/js/modules/texture-surfaces.js', import.meta.url), 'utf8'))
    .replace('export function', 'function');
  vm.runInContext(surfaceSource + '\nthis.capture = captureTextureSurface;', context);
  context.capture(element, 1, 'srgb');
  assert.deepEqual(draws, [{ text: 'VIEW', x: 10, y: 20 }, { text: 'PROJECTS', x: 10, y: 34 }]);
}
const preferenceSource = (await readFile(new URL('../docs/assets/js/modules/texture-state.js', import.meta.url), 'utf8'))
  .replace(/^export /gm, '');
for (const initial of [null, 'flat', 'liquid', 'invalid']) {
  let stored = initial;
  const context = vm.createContext({ localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } } });
  vm.runInContext(preferenceSource, context);
  assert.equal(vm.runInContext('getTexturePreference()', context), initial === 'flat' ? 'flat' : 'liquid');
  vm.runInContext('saveTexturePreference("flat")', context);
  assert.equal(stored, 'flat');
}
{
  const context = vm.createContext({ localStorage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } });
  vm.runInContext(preferenceSource, context);
  vm.runInContext('saveTexturePreference("flat")', context);
  assert.equal(vm.runInContext('getTexturePreference()', context), 'flat');
}
console.log('Texture controller: 17 scenarios passed; wrapped label: passed; preference persistence: 5 scenarios passed');
