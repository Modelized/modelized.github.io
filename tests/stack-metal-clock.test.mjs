import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const typography = await readFile(new URL("../docs/assets/js/modules/typography.js", import.meta.url), "utf8");
const stacks = await readFile(new URL("../docs/assets/js/modules/card-stacks.js", import.meta.url), "utf8");
const syncSource = typography.slice(
  typography.indexOf("  const syncMetalClockGroups ="),
  typography.indexOf("  const setMetalPlaybackRate =")
);
const target = (card = false) => ({ closest: () => card ? {} : null });
const metalRoot = target();
const animation = (element, name, paused = false) => ({
  animationName: name, effect: { target: element }, pending: false,
  playState: paused ? "paused" : "running", playbackRate: 1,
  startTime: paused ? null : 400, currentTime: 750
});
const names = ["hero-metal-model-stream", "hero-metal-story-stream"];
const clocks = names.map((name) => ({ ...animation(metalRoot, name), startTime: 10, currentTime: 8000 }));
const cards = names.flatMap((name) => [animation(target(true), name), animation(target(true), name, true)]);
const text = names.map((name) => animation(target(), name));
metalRoot.getAnimations = () => [...clocks, ...cards, ...text];
const metalClockGroups = new Map(names.map((name) => [name, new Set()]));
const context = vm.createContext({ metalRoot, introMetalRoot: null, metalClockGroups });
vm.runInContext(syncSource + "\nsyncMetalClockGroups();", context);
for (const item of text) assert.equal(item.startTime, 10);
for (const item of cards) {
  assert.equal(item.currentTime, 750);
  assert.equal(item.startTime, item.playState === "paused" ? null : 400);
  assert.equal(metalClockGroups.get(item.animationName).has(item), false);
}
cards.forEach((item) => { item.currentTime = 950; item.playState = "running"; item.startTime = 7050; });
clocks.forEach((item) => { item.currentTime = 20000; item.startTime = -11990; });
vm.runInContext("syncMetalClockGroups();", context);
for (const item of cards) {
  assert.equal(item.currentTime, 950);
  assert.equal(item.startTime, 7050);
  assert.equal(item.playbackRate, 1);
}
assert.doesNotMatch(typography + stacks, /stack:decoration/);
const css = await readFile(new URL("../docs/assets/css/components/typography.css", import.meta.url), "utf8");
assert.match(css, /--metal-duration: 30s/);
assert.match(css, /\.discipline-stack-card__surface::before\s*\{\s*animation-play-state: paused/);
assert.match(css, /data-stack-decorating="true"[\s\S]*?animation-play-state: running/);
console.log("Stack metal clocks: pause/resume phase retained, shared typography clocks preserved, 30s duration unchanged");
