import { getTexturePreference, saveTexturePreference } from "./texture-state.js?v=20261008d";

const TEXTURE_HOLD_MS = 900;
const TEXTURE_SPREAD_MS = 1050;
const TEXTURE_ICON_MS = 90;

export function initTextureControl({ materialReady }) {
  const button = document.querySelector("[data-texture-control]");
  if (!button) return;
  const icon = button.querySelector(".texture-control__icon");
  const status = document.querySelector("[data-texture-status]");
  const body = document.body;
  const html = document.documentElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let material = null;
  let action = "top";
  let desiredIcon = "";
  let iconRevision = 0;
  let iconTimer = 0;
  let session = null;
  let frame = 0;
  let suppressClick = false;
  let heldPointer = null;
  let heldKey = null;
  let unlockRevision = 0;
  const inertBeforeLock = new Map();

  const scrollTop = () => Math.max(0, window.scrollY || 0, document.scrollingElement?.scrollTop || 0);
  const zoomed = () => Math.abs((window.visualViewport?.scale || 1) - 1) > .01;
  const blocked = () => !body.classList.contains("hero-ready") ||
    body.classList.contains("glyph-story-lock") || body.classList.contains("nav-menu-open") ||
    body.classList.contains("nav-menu-closing") || body.classList.contains("hero-refitting");
  const canTexture = () => action === "texture" && scrollTop() === 0 &&
    !!material?.available && !zoomed() && !blocked() && !session;
  const announce = (message) => { if (status) status.textContent = message; };
  const updateButton = () => {
    const disabled = !!session || (action === "texture" && (zoomed() || !material?.available || blocked()));
    button.setAttribute("aria-disabled", String(disabled));
    button.dataset.action = action;
    button.dataset.texture = getTexturePreference();
    button.dataset.zoomed = String(zoomed());
    const label = action === "top" ? "Back to top" :
      `Hold, then release to switch to ${getTexturePreference() === "liquid" ? "flat" : "liquid metal"} texture`;
    button.setAttribute("aria-label", label);
    button.title = action === "texture" && zoomed() ? "Reset page zoom to switch texture" :
      action === "texture" && !material?.available ? "Texture switching is unavailable" : label;
  };
  const syncScroll = () => {
    if (session) {
      if (scrollTop() > 0) window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const next = scrollTop() > 0 ? "top" : "texture";
    // Scrolling down changes the action immediately. Returning to the top
    // retains Back to top until BOTH halves of the icon fade have completed.
    if (next === "top") action = "top";
    if (desiredIcon === next) { updateButton(); return; }
    desiredIcon = next;
    action = "top";
    const revision = ++iconRevision;
    clearTimeout(iconTimer);
    icon.style.opacity = "0";
    updateButton();
    iconTimer = setTimeout(() => {
      if (revision !== iconRevision) return;
      button.dataset.icon = next;
      icon.style.opacity = "1";
      iconTimer = setTimeout(() => {
        if (revision !== iconRevision) return;
        if (next === "texture" && scrollTop() === 0) action = "texture";
        updateButton();
      }, reducedMotion.matches ? 0 : TEXTURE_ICON_MS);
    }, reducedMotion.matches ? 0 : TEXTURE_ICON_MS);
  };
  const setLocked = (locked) => {
    html.classList.toggle("texture-scroll-lock", locked);
    body.classList.toggle("texture-scroll-lock", locked);
    if (locked) {
      for (const element of document.querySelectorAll(".page-wrap, #footer-slot, .nav .brand, .nav .menu, .nav-toggle, #mobile-sheet")) {
        if (!inertBeforeLock.has(element)) inertBeforeLock.set(element, element.inert);
        element.inert = true;
      }
    } else {
      for (const [element, inert] of inertBeforeLock) element.inert = inert;
      inertBeforeLock.clear();
    }
  };
  const releaseLock = () => {
    const revision = ++unlockRevision;
    // As in Glyph Story, retire temporary drawing before unlocking Safari.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (revision !== unlockRevision || session) return;
      setLocked(false);
      syncScroll();
    }));
  };
  const finish = (commit = false, message = "", immediate = false) => {
    const current = session;
    if (!current) return;
    session = null;
    current.abort.abort();
    cancelAnimationFrame(frame);
    frame = 0;
    if (commit) saveTexturePreference(current.target);
    material?.finishTexture();
    delete button.dataset.phase;
    delete button.dataset.preparing;
    button.style.removeProperty("--texture-charge");
    body.classList.remove("texture-transition-active");
    if (message) announce(message);
    updateButton();
    if (immediate) {
      ++unlockRevision;
      setLocked(false);
      syncScroll();
    } else releaseLock();
  };
  const draw = (current, stage, progress, strength = 1) => {
    if (reducedMotion.matches || !current.ready) return;
    material.updateTexture({ origin: current.origin, target: current.target, stage, progress, strength });
  };
  const tick = (now) => {
    frame = 0;
    const current = session;
    if (!current) return;
    if (!material?.available || document.hidden || zoomed()) {
      finish(false, "Texture transition cancelled", true);
      return;
    }
    if (current.phase === "charge") {
      const progress = Math.min(1, (now - current.started) / TEXTURE_HOLD_MS);
      button.style.setProperty("--texture-charge", String(progress));
      draw(current, 0, progress);
      if (progress === 1) {
        current.released = current.autoRelease;
        current.phase = current.ready ? (current.released ? "spread" : "armed") : "waiting";
        current.phaseStart = now;
        button.dataset.phase = current.phase;
        announce(current.ready ? "Release to change texture" : "Preparing texture");
      }
    } else if (current.phase === "armed") {
      draw(current, 0, 1);
    } else if (current.phase === "waiting") {
      if (now - current.started > 12000) {
        finish(false, "Texture could not be prepared. Please try again.");
        return;
      }
      if (current.ready) {
        current.phase = "resume";
        current.phaseStart = now;
        button.dataset.phase = current.phase;
      }
    } else if (current.phase === "resume") {
      // A short handoff from the circular loading cue back into the warm wave.
      const progress = Math.min(1, (now - current.phaseStart) / 160);
      draw(current, 0, 1, progress);
      if (progress === 1) {
        current.phase = current.released ? "spread" : "armed";
        current.phaseStart = now;
        button.dataset.phase = current.phase;
      }
    } else if (current.phase === "spread") {
      const progress = Math.min(1, (now - current.phaseStart) / (reducedMotion.matches ? 80 : TEXTURE_SPREAD_MS));
      draw(current, 1, progress);
      if (progress === 1) {
        finish(true, `${current.target === "liquid" ? "Liquid metal" : "Flat"} texture selected`);
        return;
      }
    } else if (current.phase === "cancel") {
      const progress = Math.min(1, (now - current.phaseStart) / 180);
      draw(current, 0, current.cancelProgress, 1 - progress);
      button.style.setProperty("--texture-charge", String(current.cancelProgress * (1 - progress)));
      if (progress === 1) { finish(); return; }
    }
    frame = requestAnimationFrame(tick);
  };
  const start = (autoRelease = false) => {
    if (!canTexture()) return;
    ++unlockRevision;
    // canTexture already requires scrollTop === 0. Reissuing scrollTo here can
    // disturb Safari's visual viewport while its browser chrome is settling.
    setLocked(true);
    const rect = button.getBoundingClientRect();
    const current = {
      abort: new AbortController(), started: performance.now(), phaseStart: 0,
      phase: "charge", ready: false, released: false, autoRelease,
      target: getTexturePreference() === "liquid" ? "flat" : "liquid",
      origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    };
    session = current;
    button.dataset.phase = "charge";
    button.dataset.preparing = "true";
    body.classList.add("texture-transition-active");
    announce("Hold to change texture");
    updateButton();
    frame = requestAnimationFrame(tick);
    material.prepareTexture(current.abort.signal).then(() => {
      if (session === current && !current.abort.signal.aborted) {
        current.ready = true;
        delete button.dataset.preparing;
      }
    }).catch((error) => {
      if (session !== current || error.name === "AbortError") return;
      console.warn("Texture preparation failed", error);
      finish(false, "Texture is unavailable. Your selection has not changed.");
    });
  };
  const cancelHold = () => {
    if (!session || session.released || session.phase === "cancel") return;
    session.cancelProgress = Math.min(1, (performance.now() - session.started) / TEXTURE_HOLD_MS);
    session.phase = "cancel";
    session.phaseStart = performance.now();
    session.abort.abort();
    button.dataset.phase = "cancel";
  };
  const releaseHold = () => {
    if (!session || session.phase === "cancel" || session.released) return;
    if (performance.now() - session.started < TEXTURE_HOLD_MS) { cancelHold(); return; }
    const wasWaiting = session.phase === "waiting";
    session.released = true;
    if (session.phase === "resume") return;
    session.phase = session.ready ? (wasWaiting ? "resume" : "spread") : "waiting";
    session.phaseStart = performance.now();
    button.dataset.phase = session.phase;
  };
  button.addEventListener("contextmenu", (event) => event.preventDefault());
  // Also guard delegated document handlers and any focus retained before lock.
  for (const type of ["click", "pointerdown", "keydown"]) {
    document.addEventListener(type, (event) => {
      if (!session || button.contains(event.target)) return;
      if (type === "keydown" && event.key === "Escape") finish(false, "Texture transition cancelled");
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }
  button.addEventListener("dragstart", (event) => event.preventDefault());
  button.addEventListener("pointerdown", (event) => {
    suppressClick = false;
    if (!event.isPrimary || event.button !== 0 || !canTexture()) return;
    event.preventDefault();
    heldPointer = event.pointerId;
    suppressClick = true;
    button.setPointerCapture(event.pointerId);
    start();
  });
  button.addEventListener("pointerup", (event) => {
    if (heldPointer !== event.pointerId) return;
    heldPointer = null;
    releaseHold();
  });
  button.addEventListener("pointercancel", () => {
    heldPointer = null;
    if (session && session.phase !== "spread") finish(false, "Texture transition cancelled");
  });
  button.addEventListener("lostpointercapture", () => { heldPointer = null; cancelHold(); });
  button.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { finish(false, "Texture transition cancelled"); return; }
    if (![" ", "Enter"].includes(event.key) || action !== "texture") return;
    event.preventDefault();
    if (event.repeat || heldKey) return;
    heldKey = event.key;
    suppressClick = true;
    start();
  });
  button.addEventListener("keyup", (event) => {
    if (event.key !== heldKey) return;
    event.preventDefault();
    heldKey = null;
    releaseHold();
  });
  button.addEventListener("blur", () => {
    heldKey = null;
    cancelHold();
  });
  button.addEventListener("click", (event) => {
    if (session || suppressClick) {
      suppressClick = false;
      event.preventDefault();
      return;
    }
    if (action === "top") {
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "instant" : "smooth" });
    } else if (event.detail === 0) {
      // Assistive activation has no hold/release stream; run the same sequence.
      start(true);
    }
  });
  window.addEventListener("scroll", syncScroll, { passive: true });
  window.addEventListener("texture:availability", () => {
    if (session && !material?.available) finish(false, "Texture renderer is unavailable", true);
    updateButton();
  });
  const interrupt = () => {
    heldKey = heldPointer = null;
    suppressClick = false;
    finish(false, "", true);
  };
  window.visualViewport?.addEventListener("resize", () => {
    // Pinch changes the visual viewport without necessarily resizing the page.
    // Cancel before further drawing/scroll locking, and gate every input too.
    if (zoomed()) interrupt();
    updateButton();
  }, { passive: true });
  document.addEventListener("visibilitychange", () => { if (document.hidden) interrupt(); });
  window.addEventListener("pagehide", interrupt);
  window.addEventListener("pageshow", syncScroll);
  window.addEventListener("orientationchange", interrupt);
  let viewportWidth = innerWidth;
  window.addEventListener("resize", () => {
    // Browser chrome height changes are not an orientation/layout change.
    if (innerWidth !== viewportWidth) { viewportWidth = innerWidth; interrupt(); }
    if (!session) syncScroll();
  });
  reducedMotion.addEventListener("change", interrupt);
  new MutationObserver(() => {
    if (session && blocked()) finish(false, "", true);
    updateButton();
  }).observe(body, { attributes: true, attributeFilter: ["class"] });
  Promise.resolve(materialReady).then((api) => { material = api; updateButton(); })
    .catch(() => { material = null; updateButton(); });
  syncScroll();
}
