import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../docs/assets/js/modules/stack-diagnostics.js", import.meta.url), "utf8");
const context = vm.createContext({});
vm.runInContext(source.replace(/^export /gm, ""), context);
const summarize = context.summarizeStackTrace;
const frame = (t, top, height, stackTop, scrollY = 0) => ({
  t, scroll: [0, scrollY], stack: [0, stackTop, 400, 500],
  cards: [{ box: [0, top, 400, height], size: [400, 500] }]
});
assert.equal(summarize([]).frames, 0);
assert.equal(summarize([frame(0, 100, 500, 100)]).maxFrameGapMs, 0);
const scaling = summarize([frame(0, 150, 400, 100), frame(16, 100, 500, 100)]);
assert.equal(scaling.cards[0].centerRelativeToStackRange, 0);
const scrolling = summarize([frame(0, 100, 500, 100), frame(20, 80, 500, 80, 20)]);
assert.equal(scrolling.cards[0].centerRelativeToStackRange, 0);
assert.equal(scrolling.scrollYRange, 20);
const wobble = summarize([frame(0, 100, 500, 100), frame(32, 102, 500, 100), frame(48, 99, 500, 100)]);
assert.equal(wobble.cards[0].centerRelativeToStackRange, 3);
assert.equal(wobble.cards[0].layoutHeightRange, 0);
assert.equal(wobble.maxFrameGapMs, 32);
const shell = await readFile(new URL("../docs/assets/js/shell.js", import.meta.url), "utf8");
assert.match(shell, /if \(new URLSearchParams\(location.search\).get\("stackDebug"\) === "1"\)\s*\{\s*import\("\.\/modules\/stack-diagnostics/);
assert.doesNotMatch(source, /\bfetch\s*\(|sendBeacon|localStorage/);
console.log("Stack diagnostics: scale/scroll separation, wobble summary, opt-in loading and local-only export passed");
