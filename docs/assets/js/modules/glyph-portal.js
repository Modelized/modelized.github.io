import { sampleTextureMotion, sampleTextureCharge, sampleTexturePress } from "./texture-wave.js?v=20261012b";
import { getTexturePreference } from "./texture-state.js?v=20261008k";

export const GLYPH_HOLD_MS = 900;
export const GLYPH_OPEN_MS = 1180;
export function glyphLoadingPhase(elapsed, length, scale, referenceRadius) {
  const referenceLength = 2 * Math.PI * referenceRadius * .98;
  return (elapsed / (1800 * Math.max(1, length * scale / referenceLength))) % 1;
}

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
    const host = root.querySelector("[data-glyph-rail]");
    const mark = root.querySelector("[data-glyph-mark]");
    const fills = [...mark.querySelectorAll(".glyph-piece__fill")];
    const outlines = [...mark.querySelectorAll(".glyph-piece__outline")];
    const tails = [];
    outlines.forEach((path, index) => {
      const svg = path.ownerSVGElement, length = path.getTotalLength();
      const defs = document.createElementNS(ns, "defs");
      const gradient = document.createElementNS(ns, "linearGradient");
      gradient.id = `glyph-loading-${index}`;
      gradient.setAttribute("gradientUnits", "userSpaceOnUse");
      for (const [offset, opacity] of [[0, 0], [.65, .5], [1, 1]]) {
        const stop = document.createElementNS(ns, "stop");
        stop.setAttribute("offset", offset); stop.setAttribute("stop-color", "#fff8ef");
        stop.setAttribute("stop-opacity", opacity); gradient.append(stop);
      }
      defs.append(gradient); svg.append(defs);
      const tail = path.cloneNode(true);
      tail.removeAttribute("class"); tail.removeAttribute("style");
      tail.setAttribute("class", "glyph-portal-tail");
      tail.style.stroke = `url(#${gradient.id})`;
      tail.style.strokeDasharray = `${length * .48} ${length * .52}`;
      svg.append(tail);
      tails.push({ path: tail, base: path, gradient, defs, length,
        points: Array.from({ length: 128 }, (_, i) => path.getPointAtLength(length * i / 128)) });
    });
    const stroke = parseFloat(getComputedStyle(outlines.find((path) => path.closest(".glyph-piece__art"))).strokeWidth) || 2.6;
    root.classList.add("is-portal-flying");
    host.classList.add("glyph-portal-logo");
    host.style.left = `${box.left}px`; host.style.top = `${box.top}px`;
    host.style.width = `${box.width}px`; host.style.height = `${box.height}px`;
    mark.style.opacity = "1";
    tails.forEach((tail) => {
      const matrix = tail.base.getScreenCTM();
      tail.scale = Math.hypot(matrix.a, matrix.b);
    });
    tails.forEach((tail) => {
      const piece = tail.base.closest(".glyph-piece");
      tail.travelLength = Math.max(...tails.filter((other) => other.base.closest(".glyph-piece") === piece)
        .map((other) => other.length * other.scale));
    });
    root.style.setProperty("--glyph-ink-rgb", "255, 248, 239");
    root.style.setProperty("--glyph-glow-rgb", "255, 229, 197");
    return { host, fills, outlines, tails, stroke };
  };
  const logoFrame = (s, progress, loading, elapsed) => {
    if (!s.logo) return;
    const press = sampleTexturePress(0, progress);
    s.logo.host.style.width = `${s.box.width * press}px`;
    s.logo.host.style.height = `${s.box.height * press}px`;
    s.logo.host.style.left = `${s.box.left + s.box.width * (1 - press) / 2}px`;
    s.logo.host.style.top = `${s.box.top + s.box.height * (1 - press) / 2}px`;
    const blur = Math.sin(Math.PI * progress) * s.box.width * .045;
    s.logo.fills.forEach((path) => {
      path.style.fill = "#fff8ef"; path.style.fillOpacity = String(1 - progress);
      path.style.filter = blur > .01 ? `blur(${blur}px)` : "none";
    });
    s.logo.outlines.forEach((path) => {
      path.style.opacity = String(progress * (1 - loading));
      path.style.filter = blur > .01 ? `blur(${blur * .7}px)` : "none";
    });
    const ratio = s.box.width * press / s.target.width;
    root.style.setProperty("--glyph-stroke", `${Math.max(.65, s.logo.stroke * ratio)}px`);
    root.style.setProperty("--glyph-glow-blur", `${Math.max(1.5, 9 * ratio)}px`);
    s.logo.tails.forEach(({ path, base, gradient, length, points, travelLength, scale: baseScale }) => {
      path.style.opacity = String(loading);
      if (!loading) return;
      const scale = baseScale * press;
      const phase = glyphLoadingPhase(elapsed, travelLength, press, s.loadingRadius);
      const pointAt = (fraction) => {
        const sample = (fraction % 1) * points.length, index = Math.floor(sample), blend = sample - index;
        const a = points[index], b = points[(index + 1) % points.length];
        return { x: a.x + (b.x - a.x) * blend, y: a.y + (b.y - a.y) * blend };
      };
      const start = pointAt(phase), end = pointAt(phase + .48);
      gradient.setAttribute("x1", start.x); gradient.setAttribute("y1", start.y);
      gradient.setAttribute("x2", end.x); gradient.setAttribute("y2", end.y);
      path.style.strokeDashoffset = String(-phase * length);
      path.style.strokeWidth = String((base.closest(".glyph-piece__glow") ? 3.7 : 1) * Math.max(.65, s.logo.stroke * ratio) / scale);
    });
  };
  const restoreLogo = (s) => {
    if (!s.logo) return;
    s.logo.tails.forEach(({ path, defs }) => { path.remove(); defs.remove(); });
    for (const path of [...s.logo.fills, ...s.logo.outlines]) {
      for (const name of ["opacity", "filter", "fill", "fill-opacity"]) path.style.removeProperty(name);
    }
    for (const name of ["left", "top", "width", "height"]) s.logo.host.style.removeProperty(name);
    s.logo.host.classList.remove("glyph-portal-logo");
    root.classList.remove("is-portal-flying");
    for (const name of ["--glyph-stroke", "--glyph-glow-blur", "--glyph-emission", "--glyph-ink-rgb", "--glyph-glow-rgb"]) root.style.removeProperty(name);
  };
  const restoreBackground = () => body.style.removeProperty("--glyph-home-fade");
  const finish = (opened = false) => {
    const s = session;
    if (!s) return;
    session = null; s.abort.abort(); cancelAnimationFrame(frame); frame = 0;
    restoreLogo(s);
    if (opened) complete(s.keyboard);
    material?.finishTexture();
    body.classList.remove("glyph-portal-active", "glyph-portal-spreading");
    s.navigation.forEach(({ element }) => element.style.removeProperty("--glyph-nav-fade"));
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
      glyph: true, origin: s.lightOrigin || s.origin, target: getTexturePreference(), stage, progress, motion, strength,
      elapsed: elapsed / 1000, loading: s.loading || 0, charge: charge.energy * settle,
      jitter: { x: charge.x * settle, y: charge.y * settle }
    });
    if (stage) {
      body.style.setProperty("--glyph-home-fade", String(Math.max(0, 1 - motion.position)));
      const origin = s.lightOrigin || s.origin;
      const reach = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
      const breadth = Math.min(innerWidth, innerHeight) * .30 + reach * .035;
      const radius = origin.radius + (reach + breadth * 1.1 - origin.radius) * motion.position;
      s.navigation.forEach(({ element, x, y }) => {
        const q = (Math.hypot(x - origin.x, y - origin.y) - radius) / (breadth * (.8 + .4 * motion.position));
        const t = Math.max(0, Math.min(1, (q + .45) / .9));
        element.style.setProperty("--glyph-nav-fade", String(t * t * (3 - 2 * t)));
      });
    }
  };
  const spread = async (s) => {
    s.phase = "layout";
    try {
      await s.layout;
      if (session !== s) return;
      s.loading = 0;
      logoFrame(s, 1, 0, performance.now() - s.started);
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
      const flight = glyphFlight(p), start = s.box, end = s.target;
      const press = sampleTexturePress(1, sampleTextureMotion(1, p).position);
      const dx = end.left + end.width / 2 - start.left - start.width / 2;
      const dy = end.top + end.height / 2 - start.top - start.height / 2;
      const width = (start.width + (end.width - start.width) * flight.scale) * press;
      const height = (start.height + (end.height - start.height) * flight.scale) * press;
      const x = start.left + start.width / 2 + dx * flight.position;
      const y = start.top + start.height / 2 + dy * flight.position;
      s.logo.host.style.left = `${x - width / 2}px`; s.logo.host.style.top = `${y - height / 2}px`;
      s.logo.host.style.width = `${width}px`; s.logo.host.style.height = `${height}px`;
      root.style.setProperty("--glyph-stroke", `${Math.max(.65, s.logo.stroke * width / end.width)}px`);
      root.style.setProperty("--glyph-glow-blur", `${Math.max(1.5, 9 * width / end.width)}px`);
      root.style.setProperty("--glyph-float-strength", String(flight.scale));
      root.style.setProperty("--glyph-emission", String(1 + Math.sin(Math.PI * Math.min(1, p / .55)) * .85));
      root.style.setProperty("--glyph-ink-rgb", `255, ${248 - 15 * flight.scale}, ${239 - 31 * flight.scale}`);
      root.style.setProperty("--glyph-glow-rgb", `255, ${229 - 21 * flight.scale}, ${197 - 27 * flight.scale}`);
      s.lightOrigin = { x, y, radius: s.origin.radius + (end.width * .18 - s.origin.radius) * flight.scale };
      draw(s, 1, p, now);
      if (p === 1) { finish(true); return; }
    } else if (s.phase === "layout") {
      draw(s, 0, 1, now);
    } else if (s.phase === "cancel") {
      const p = Math.min(1, (now - s.phaseStart) / 180);
      logoFrame(s, s.cancelProgress * (1 - p), 0, now - s.started);
      draw(s, 0, s.cancelProgress, now, 1 - p);
      if (p === 1) { finish(); return; }
    }
    if (session === s) scheduleFrame();
  };
  const scheduleFrame = () => {
    frame = requestAnimationFrame((now) => {
      try { tick(now); } catch (error) { console.warn("Glyph transition failed", error); finish(); }
    });
  };
  const start = (auto = false, keyboard = false) => {
    if (!enabled()) return;
    lock(true);
    window.scrollTo({ top: 0, behavior: "instant" });
    const rect = trigger.getBoundingClientRect(), size = Math.min(rect.width, rect.height);
    const textureButton = document.querySelector("[data-texture-control]")?.getBoundingClientRect();
    const box = { left: rect.left + (rect.width - size) / 2, top: rect.top + (rect.height - size) / 2,
      width: size, height: size };
    const s = { started: performance.now(), abort: new AbortController(), phase: "hold", box,
      origin: { x: box.left + box.width / 2, y: box.top + box.height / 2, radius: box.width / 2 },
      ready: false, visualReady: false, released: false, auto, keyboard,
      loadingRadius: textureButton ? Math.min(textureButton.width, textureButton.height) / 2 : 16,
      navigation: [...document.querySelectorAll(".site-nav .brand, .site-nav .menu.desktop, .site-nav .nav-right")].map((element) => {
        const rect = element.getBoundingClientRect();
        return { element, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }) };
    session = s;
    s.layout = prepare(keyboard).then((target) => {
      if (session !== s) return;
      s.target = target; s.logo = createLogo(box);
      logoFrame(s, Math.min(1, (performance.now() - s.started) / GLYPH_HOLD_MS), 0, 0);
      body.classList.add("glyph-portal-active");
    });
    announce("Hold the logo, then release to explore"); update();
    scheduleFrame();
    Promise.all([s.layout, material.prepareTexture(s.abort.signal, () => {
      if (session === s) s.visualReady = true;
    }, { exclude: trigger })]).then(() => {
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
