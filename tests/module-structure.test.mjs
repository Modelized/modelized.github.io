import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import vm from "node:vm";

const scriptRoot = new URL("../docs/assets/js/", import.meta.url);
const sources = new Map();
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) await collect(url);
    else if (entry.name.endsWith(".js")) sources.set(url.href, await readFile(url, "utf8"));
  }
}
await collect(scriptRoot);

const versions = new Map();
const graph = new Map();
for (const [file, source] of sources) {
  const dependencies = [];
  for (const match of source.matchAll(/^import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];/gm)) {
    const target = new URL(match[2], file);
    const version = target.search;
    target.search = "";
    assert.ok(sources.has(target.href), `Missing module: ${target.href}`);
    if (versions.has(target.href)) assert.equal(version, versions.get(target.href), `Mixed module versions: ${target.href}`);
    versions.set(target.href, version);
    const dependency = sources.get(target.href);
    const exported = new Set();
    for (const declaration of dependency.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)/gm)) exported.add(declaration[1]);
    for (const list of dependency.matchAll(/^export\s*\{([^}]+)\}/gm)) {
      for (const name of list[1].split(",")) exported.add(name.trim().split(/\s+as\s+/).at(-1));
    }
    for (const name of match[1].split(",")) {
      assert.ok(exported.has(name.trim().split(/\s+as\s+/)[0]), `Missing export ${name} in ${target.href}`);
    }
    dependencies.push(target.href);
  }
  graph.set(file, dependencies);
}
const visited = new Set();
function visit(file, active = new Set()) {
  assert.ok(!active.has(file), `Circular module dependency: ${file}`);
  if (visited.has(file)) return;
  active.add(file);
  for (const dependency of graph.get(file)) visit(dependency, active);
  active.delete(file);
  visited.add(file);
}
for (const file of sources.keys()) visit(file);

const htmlURL = new URL("../docs/index.html", import.meta.url);
const html = await readFile(htmlURL, "utf8");
for (const match of html.matchAll(/(?:src|href)="(assets\/[^"?]+)(?:\?[^" ]*)?"/g)) {
  await access(new URL(match[1], htmlURL));
}

// Scheduling must preserve cancellation and the existing settling passes.
const timers = new Map();
let nextId = 0;
const scope = vm.createContext({ window: {
  setTimeout(callback, delay) { const id = ++nextId; timers.set(id, { callback, delay }); return id; },
  clearTimeout(id) { timers.delete(id); }
} });
const scheduler = sources.get(new URL("modules/layout-scheduler.js", scriptRoot).href);
vm.runInContext(scheduler.replace(/^export \{[^}]+\};/gm, "") + "\nthis.create = createSettledScheduler;", scope);
let calls = 0;
const controller = scope.create(() => calls++);
controller.schedule(90);
assert.deepEqual([...timers.values()].map(timer => timer.delay), [90, 230, 410, 650]);
controller.schedule(140, () => assert.equal(timers.size, 0));
assert.deepEqual([...timers.values()].map(timer => timer.delay), [140, 280, 460, 700]);
for (const timer of timers.values()) timer.callback();
assert.equal(calls, 4);
controller.clear();
assert.equal(timers.size, 0);

console.log("Module imports, exports, versions, cycles, HTML asset paths and layout scheduling checked");
