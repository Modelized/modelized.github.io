import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const reveal = await readFile(new URL('../docs/assets/js/modules/reveal.js', import.meta.url), 'utf8');
const typography = await readFile(new URL('../docs/assets/js/modules/typography.js', import.meta.url), 'utf8');

async function arrivalScenario(completionTime, skip = false) {
  let now = 0, nextId = 0;
  const tasks = new Map(), events = [], classes = new Set();
  const later = (fn, delay) => { tasks.set(++nextId, { at: now + delay, fn }); return nextId; };
  const scope = vm.createContext({
    prefersReducedMotion: skip, getScrollTop: () => 0,
    body: { classList: { add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)) } },
    document: {}, requestAnimationFrame: fn => fn(),
    Event: class { constructor(type) { this.type = type; } },
    CustomEvent: class { constructor(type, { detail }) { this.type = type; this.detail = detail; } },
    window: { location: {}, setTimeout: later, dispatchEvent: event => {
      events.push({ type: event.type, at: now });
      if (event.type === 'hero:handoff') event.detail.waitUntil(new Promise(resolve => later(resolve, completionTime - now)));
    } }
  });
  vm.runInContext(reveal.slice(reveal.indexOf('async function initHeroIntro'), reveal.indexOf('\nexport {')), scope);
  await scope.initHeroIntro({ waitForFonts: false });
  while (tasks.size) {
    const [id, task] = [...tasks].sort((a, b) => a[1].at - b[1].at)[0];
    tasks.delete(id); now = task.at; task.fn();
    await new Promise(setImmediate);
    if (!skip && now < completionTime) assert.equal(classes.has('hero-ready'), false);
  }
  assert.ok(classes.has('hero-ready'));
  assert.equal(events.filter(e => e.type === 'hero:ready').length, 1);
  return events.find(e => e.type === 'hero:ready').at;
}
assert.equal(await arrivalScenario(3020), 3100);
assert.equal(await arrivalScenario(3900), 3900);
assert.equal(await arrivalScenario(8000), 8000);
assert.equal(await arrivalScenario(0, true), 0);

let resolved = 0;
const word = {}, active = new Map([[word, { timerId: 1, rafId: 2, resolve: () => resolved++ }]]);
const cancelScope = vm.createContext({ activeWeightAnimations: active, window: { clearTimeout() {} }, cancelAnimationFrame() {} });
vm.runInContext(typography.match(/const cancelWeightAnimation = [\s\S]*?\n  \};/)[0] + '\nthis.cancel = cancelWeightAnimation;', cancelScope);
cancelScope.cancel(word); cancelScope.cancel(word);
assert.equal(resolved, 1);
assert.equal(active.size, 0);
assert.match(typography, /event.detail\?\.waitUntil\(arrival\)/);
assert.match(typography, /const arrival = playArrival\(\s*"\.hero-brand-lockup \.hero-fit-word",\s*640,/);
assert.match(typography, /"\.hero-intro-cell \.hero-fit-word",\s*640,/);
console.log('Hero completion preserves nominal timing, waits for delayed arrivals, and resolves suspended/cancelled animations');
