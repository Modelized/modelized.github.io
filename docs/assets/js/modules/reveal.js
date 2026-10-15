import { createScrollReveal } from "../scroll-reveal.js?v=20261002a";
import { getScrollTop } from "./navigation.js?v=20261008k";
import { prefersReducedMotion, body } from "./context.js?v=20261002a";

// Section reveals

function applyRevealStagger() {
  const sections = Array.from(document.querySelectorAll(".section"));

  sections.forEach((section) => {
    const revealItems = Array.from(section.querySelectorAll("[data-reveal]"));

    revealItems.forEach((element, index) => {
      const rawDelay = Number(element.getAttribute("data-reveal-delay"));
      const delay = Number.isFinite(rawDelay) ? rawDelay : Math.min(index * 95, 520);

      element.style.setProperty("--reveal-delay", `${delay}ms`);
      element.style.setProperty("--reveal-distance", index === 0 ? "16px" : "24px");
    });
  });
}

function initReveal() {
  const revealElements = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!revealElements.length) {
    return;
  }

  applyRevealStagger();
  revealElements.forEach((element) => element.classList.add("reveal"));

  const heroRevealElements = revealElements.filter((element) => element.closest("#hero"));
  const shouldPrewarmHero = () => {
    return getScrollTop() > Math.max(64, window.innerHeight * 0.16);
  };
  const controller = createScrollReveal();
  revealElements.forEach((element) => {
    const stack = element.querySelector(".discipline-stack-viewport");
    controller.observe(element, {
      // Wait for the deck to load before its first viewport reveal.
      // Loading alone and later visits must not restart the animation.
      prepare: () => {
        if (!stack || stack.dataset.stackReady === "true") return;
        return new Promise((resolve) => stack.addEventListener("stack:ready", resolve, { once: true }));
      },
      reveal: () => element.classList.add("is-visible")
    });
  });
  const settleHeroReveal = () => {
    if (!shouldPrewarmHero()) {
      return;
    }

    heroRevealElements.forEach(controller.reveal);
  };
  // IntersectionObserver owns viewport entry. Address-bar resizes must not
  // run a second, competing reveal path while a touch scroll is in progress.
  settleHeroReveal();
  window.addEventListener("pageshow", settleHeroReveal);
}

// Hero intro

async function initHeroIntro({ waitForFonts = true } = {}) {
  const shouldSkipIntro =
    prefersReducedMotion ||
    getScrollTop() > 8 ||
    (window.location.hash && window.location.hash !== "#hero");

  if (shouldSkipIntro) {
    body.classList.add("hero-handoff", "hero-ready");
    window.dispatchEvent(new Event("hero:ready"));
    return;
  }

  if (waitForFonts && document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => window.setTimeout(resolve, 1400))
    ]);
  }

  requestAnimationFrame(() => {
    body.classList.add("hero-intro-running");
    window.dispatchEvent(new Event("hero:intro"));

    window.setTimeout(async () => {
      body.classList.add("hero-handoff");
      const arrivals = [new Promise((resolve) => window.setTimeout(resolve, 1620))];
      // Keep the handoff active until registered typography arrivals settle.
      window.dispatchEvent(new CustomEvent("hero:handoff", {
        detail: { waitUntil: (arrival) => arrivals.push(arrival) }
      }));
      await Promise.all(arrivals);
      body.classList.add("hero-ready");
      body.classList.remove("hero-intro-running", "hero-handoff");
      window.dispatchEvent(new Event("hero:ready"));
    }, 1480);
  });
}

export { initReveal, initHeroIntro };
