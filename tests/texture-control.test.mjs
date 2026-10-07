// Dependency-free controller checks; actual shader rendering is tested in-browser.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../docs/assets/js/modules/texture-control.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/, '').replace('export function', 'function');

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

async function setup({ preference = 'liquid', available = true, delayed = false } = {}) {
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
    document, window, innerWidth: 440, AbortController, console: { warn() {}, debug() {} },
    performance: { now: () => time },
    requestAnimationFrame: (fn) => schedule(fn, 16), cancelAnimationFrame: (key) => jobs.delete(key),
    setTimeout: (fn, delay) => schedule(fn, delay), clearTimeout: (key) => jobs.delete(key),
    matchMedia: () => Object.assign(new Element(), { matches: false }),
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
  assert.equal(t.body.classList.contains('texture-scroll-lock'), false);
  assert.equal(t.otherControl.inert, false);
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
console.log('Texture controller: 12 scenarios passed; preference persistence: 5 scenarios passed');
