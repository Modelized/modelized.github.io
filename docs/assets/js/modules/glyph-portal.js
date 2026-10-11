import { sampleTextureMotion, sampleTextureCharge } from "./texture-wave.js?v=20261011a";
import { getTexturePreference } from "./texture-state.js?v=20261008k";

export const GLYPH_HOLD_MS = 900;
export const GLYPH_OPEN_MS = 1180;
export function glyphFlight(progress) {
  const p = Math.max(0, Math.min(1, progress));
  return { position: p === 1 ? 1 : 1 - Math.exp(-7 * p) * (Math.cos(8 * p) + .875 * Math.sin(8 * p)),
    scale: 1 - Math.pow(1 - p, 3) };
}

export function initGlyphPortal({ trigger, root, materialReady, lock, prepare, complete, cancel }) {
  let material, session, frame = 0, pointer = null, key = null, suppressClick = false;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const body = document.body;
  const zoomed = () => Math.abs((visualViewport?.scale || 1) - 1) > .01;
  const available = () => !!material?.available && body.classList.contains("hero-ready") && !zoomed();
  const enabled = () => available() && !session && root.hidden &&
    !body.classList.contains("texture-transition-active") && !body.classList.contains("nav-menu-open") &&
    !body.classList.contains("hero-refitting") && !body.classList.contains("glyph-story-lock");
  const update = () => {
    trigger.disabled = !session && !enabled();
    trigger.setAttribute("aria-disabled", String(!enabled()));
    trigger.setAttribute("aria-label", available() ? "Hold, then release to explore the Modelized glyph" : "Glyph story unavailable");
  };
  const announce = (text) => { const status = document.querySelector("[data-texture-status]"); if (status) status.textContent = text; };
  const createLogo = (box) => {
    const ns = "http://www.w3.org/2000/svg";
    const host = document.createElement("div");
    host.className = "glyph-portal-logo";
    host.setAttribute("aria-hidden", "true");
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "108 122 296 297");
    const fills = [], outlines = [], tails = [];
    root.querySelectorAll(".glyph-piece__art").forEach((art, index) => {
      const fill = art.querySelector(".glyph-piece__fill").cloneNode(true);
      fill.removeAttribute("class"); fill.setAttribute("class", "glyph-portal-fill");
      svg.append(fill); fills.push(fill);
      art.querySelectorAll(".glyph-piece__outline").forEach((path) => {
        const base = path.cloneNode(true);
        base.removeAttribute("style"); base.setAttribute("class", "glyph-portal-outline");
        svg.append(base); outlines.push(base);
        for (let i = 0; i < 7; i++) {
          const tail = base.cloneNode(true);
          tail.setAttribute("class", "glyph-portal-tail");
          tail.setAttribute("pathLength", "100");
          tail.setAttribute("stroke-dasharray", "8 92");
          svg.append(tail); tails.push({ path: tail, i, index });
        }
      });
    });
    host.append(svg); body.append(host);
    host.style.left = `${box.left}px`; host.style.top = `${box.top}px`;
    host.style.width = `${box.width}px`; host.style.height = `${box.height}px`;
    return { host, fills, outlines, tails };
  };
  const logoFrame = (s, progress, loading, elapsed) => {
    s.logo.fills.forEach((path) => { path.style.opacity = String(1 - progress); });
    s.logo.outlines.forEach((path) => { path.style.opacity = String(progress * (1 - loading)); });
    s.logo.tails.forEach(({ path, i, index }) => {
      path.style.opacity = String(loading * (i + 1) / 7);
      path.style.strokeDashoffset = String(-elapsed / 24 - index * 23 + (6 - i) * 6);
    });
    s.logo.host.style.setProperty("--glyph-charge", String(progress));
  };
  const restoreBackground = () => body.style.removeProperty("--glyph-home-fade");
  const finish = (opened = false) => {
    const s = session;
    if (!s) return;
    session = null; s.abort.abort(); cancelAnimationFrame(frame); frame = 0;
    if (opened) complete(s.keyboard);
    material?.finishTexture();
    s.logo.host.remove();
    body.classList.remove("glyph-portal-active", "glyph-portal-spreading");
    body.style.removeProperty("--glyph-surrounding-x"); body.style.removeProperty("--glyph-surrounding-y");
    restoreBackground();
    if (!opened) { cancel(); lock(false); announce("Glyph story cancelled"); }
    update();
  };
  const draw = (s, stage, progress, now, strength = 1) => {
    const motion = sampleTextureMotion(stage, progress);
    const elapsed = now - s.started;
    if (!s.released) s.charge = sampleTextureCharge(elapsed);
    const charge = s.charge || { x: 0, y: 0, energy: 0 };
    const settle = stage ? Math.exp(-progress * 35) : strength;
    if (s.visualReady && !reduced.matches) material.updateTexture({
      glyph: true, origin: s.origin, target: getTexturePreference(), stage, progress, motion, strength,
      elapsed: elapsed / 1000, loading: 0, charge: charge.energy * settle,
      jitter: { x: charge.x * settle, y: charge.y * settle }
    });
    body.style.setProperty("--glyph-surrounding-x", `${reduced.matches ? 0 : charge.x * settle}px`);
    body.style.setProperty("--glyph-surrounding-y", `${reduced.matches ? 0 : charge.y * settle}px`);
    if (stage) body.style.setProperty("--glyph-home-fade", String(Math.max(0, 1 - motion.position)));
  };
  const spread = async (s) => {
    s.phase = "layout";
    try {
      s.target = await prepare(s.keyboard);
      if (session !== s) return;
      s.phase = "spread"; s.phaseStart = performance.now();
      body.classList.add("glyph-portal-spreading");
    } catch (error) { if (session === s) { console.warn(error); finish(); } }
  };
  const tick = (now) => {
    const s = session;
    if (!s) return;
    if (!available() || document.hidden) { finish(); return; }
    if (!s.ready && now - s.started > 12000) { finish(); return; }
    if (s.phase === "hold") {
      const p = Math.min(1, (now - s.started) / GLYPH_HOLD_MS);
      logoFrame(s, sampleTextureMotion(0, p).position, 0, now - s.started);
      draw(s, 0, p, now);
      if (p === 1 && s.auto) release();
    } else if (s.phase === "waiting" || s.phase === "resume") {
      const p = Math.min(1, (now - s.phaseStart) / 200);
      s.loading = s.phase === "waiting" ? p : s.resumeLoading * (1 - p);
      logoFrame(s, 1, s.loading, now - s.started); draw(s, 0, 1, now);
      if (s.phase === "waiting" && s.ready) {
        s.resumeLoading = s.loading; s.phase = "resume"; s.phaseStart = now;
      } else if (s.phase === "resume" && p === 1) spread(s);
    } else if (s.phase === "spread") {
      const p = Math.min(1, (now - s.phaseStart) / (reduced.matches ? 180 : GLYPH_OPEN_MS));
      draw(s, 1, p, now);
      const flight = glyphFlight(p), start = s.box, end = s.target;
      const dx = end.left + end.width / 2 - start.left - start.width / 2;
      const dy = end.top + end.height / 2 - start.top - start.height / 2;
      const scale = 1 + (end.width / start.width - 1) * flight.scale;
      s.logo.host.style.setProperty("--glyph-portal-stroke", `${2.8 / scale}px`);
      s.logo.host.style.transform = `translate(${dx * flight.position}px, ${dy * flight.position}px) scale(${scale})`;
      if (p === 1) { finish(true); return; }
    } else if (s.phase === "layout") {
      draw(s, 0, 1, now);
    } else if (s.phase === "cancel") {
      const p = Math.min(1, (now - s.phaseStart) / 180);
      logoFrame(s, s.cancelProgress * (1 - p), 0, now - s.started);
      draw(s, 0, s.cancelProgress, now, 1 - p);
      if (p === 1) { finish(); return; }
    }
    if (session === s) frame = requestAnimationFrame(tick);
  };
  const start = (auto = false, keyboard = false) => {
    if (!enabled()) return;
    lock(true);
    window.scrollTo({ top: 0, behavior: "instant" });
    const box = trigger.getBoundingClientRect();
    const s = { started: performance.now(), abort: new AbortController(), phase: "hold", box,
      origin: { x: box.left + box.width / 2, y: box.top + box.height / 2, radius: box.width / 2 },
      ready: false, visualReady: false, released: false, auto, keyboard, logo: createLogo(box) };
    session = s; logoFrame(s, 0, 0, 0); body.classList.add("glyph-portal-active");
    announce("Hold the logo, then release to explore"); update();
    frame = requestAnimationFrame(tick);
    material.prepareTexture(s.abort.signal, () => {
      if (session === s) s.visualReady = true;
    }, { exclude: trigger }).then(() => {
      if (session === s) s.ready = s.visualReady = true;
    }).catch((error) => {
      if (session !== s || error.name === "AbortError") return;
      console.warn("Glyph preparation failed", error); finish();
    });
  };
  const release = () => {
    const s = session;
    if (!s || s.released || s.phase !== "hold") return;
    s.released = true;
    if (performance.now() - s.started < GLYPH_HOLD_MS) {
      s.cancelProgress = Math.min(1, (performance.now() - s.started) / GLYPH_HOLD_MS);
      s.phase = "cancel"; s.phaseStart = performance.now(); return;
    }
    if (s.ready) spread(s);
    else { s.phase = "waiting"; s.phaseStart = performance.now(); announce("Preparing glyph story"); }
  };
  trigger.addEventListener("contextmenu", (e) => e.preventDefault());
  trigger.addEventListener("dragstart", (e) => e.preventDefault());
  trigger.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary || e.button !== 0 || !enabled()) return;
    e.preventDefault(); pointer = e.pointerId; suppressClick = true;
    trigger.setPointerCapture(pointer); start();
  });
  trigger.addEventListener("pointerup", (e) => { if (e.pointerId === pointer) { pointer = null; release(); } });
  trigger.addEventListener("pointercancel", () => { pointer = null; finish(); });
  trigger.addEventListener("lostpointercapture", () => { if (pointer !== null) { pointer = null; finish(); } });
  trigger.addEventListener("keydown", (e) => {
    if (![" ", "Enter"].includes(e.key)) return;
    e.preventDefault(); if (e.repeat || key) return;
    key = e.key; suppressClick = true; start(false, true);
  });
  trigger.addEventListener("keyup", (e) => { if (key === e.key) { e.preventDefault(); key = null; release(); } });
  trigger.addEventListener("blur", () => { if (key) { key = null; finish(); } });
  trigger.addEventListener("click", (e) => {
    e.preventDefault(); if (!suppressClick && e.detail === 0) start(true, true);
    suppressClick = false;
  });
  for (const type of ["click", "pointerdown", "keydown", "touchmove", "wheel"]) {
    document.addEventListener(type, (e) => {
      if (!session || trigger.contains(e.target)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.key === "Escape") finish();
    }, { capture: true, passive: false });
  }
  const interrupt = () => {
    pointer = key = null;
    if (session) finish();
    else if (!root.hidden && !material?.available) { cancel(); lock(false); }
    update();
  };
  document.addEventListener("visibilitychange", () => { if (document.hidden) interrupt(); });
  window.addEventListener("pagehide", interrupt);
  window.addEventListener("orientationchange", interrupt);
  let viewportWidth = innerWidth;
  window.addEventListener("resize", () => {
    if (innerWidth !== viewportWidth) { viewportWidth = innerWidth; interrupt(); }
  });
  reduced.addEventListener("change", interrupt);
  visualViewport?.addEventListener("resize", () => { if (zoomed()) interrupt(); update(); });
  window.addEventListener("texture:availability", () => { if (!material?.available) interrupt(); update(); });
  window.addEventListener("hero:ready", update);
  window.addEventListener("glyph-story:closed", update);
  new MutationObserver(update).observe(body, { attributes: true, attributeFilter: ["class"] });
  Promise.resolve(materialReady).then((api) => { material = api; update(); });
  update();
}
