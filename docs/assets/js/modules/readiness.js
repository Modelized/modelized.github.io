import { SITE_LOADER_REVEAL_DELAY, SITE_LOADER_SKIP_DELAY, prefersReducedMotion } from "./context.js?v=20261002a";
function createSiteBootGate() {
  const root = document.documentElement;
  const loader = document.querySelector("[data-site-loader]");
  const skipButton = document.querySelector("[data-site-loader-skip]");
  let released = false;
  let resolveSkip;

  const skipped = new Promise((resolve) => {
    resolveSkip = resolve;
  });

  const revealTimer = window.setTimeout(() => {
    if (!released) {
      root.classList.add("site-loader-visible");
      loader?.setAttribute("aria-hidden", "false");
    }
  }, SITE_LOADER_REVEAL_DELAY);

  const skipTimer = window.setTimeout(() => {
    if (!released) {
      root.classList.add("site-loader-skippable");
    }
  }, SITE_LOADER_SKIP_DELAY);

  const onSkip = () => {
    if (released) {
      return;
    }

    skipButton?.setAttribute("disabled", "");
    resolveSkip?.();
  };

  skipButton?.addEventListener("click", onSkip, { once: true });

  return {
    skipped,
    async release() {
      if (released) {
        return;
      }

      released = true;
      window.clearTimeout(revealTimer);
      window.clearTimeout(skipTimer);
      skipButton?.removeEventListener("click", onSkip);
      root.classList.remove("site-loader-skippable");

      const wasVisible = root.classList.contains("site-loader-visible");
      if (wasVisible && !prefersReducedMotion) {
        root.classList.add("site-loader-releasing");
        await new Promise((resolve) => window.setTimeout(resolve, 420));
      }

      root.classList.remove("site-boot-pending", "site-loader-visible", "site-loader-releasing");
      root.classList.add("site-boot-ready");
      loader?.setAttribute("aria-hidden", "true");
    }
  };
}

function waitForWindowLoad() {
  if (document.readyState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.addEventListener("load", resolve, { once: true });
  });
}

function waitForImage(image) {
  if (!image?.src && !image?.currentSrc) {
    return Promise.resolve();
  }

  image.loading = "eager";

  const decode = () => {
    if (typeof image.decode !== "function" || !image.naturalWidth) {
      return Promise.resolve();
    }

    return image.decode().catch(() => {});
  };

  if (image.complete) {
    return decode();
  }

  return new Promise((resolve) => {
    const settle = () => decode().finally(resolve);
    image.addEventListener("load", settle, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
}

function waitForStackReady(stackId) {
  const stack = document.getElementById(stackId);
  if (!stack || stack.dataset.stackReady === "true") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    stack.addEventListener("stack:ready", resolve, { once: true });
  });
}

async function waitForSiteReadiness() {
  const imagePromises = Array.from(document.images, waitForImage);
  const fontsReady = document.fonts?.ready || Promise.resolve();

  await Promise.allSettled([
    waitForWindowLoad(),
    fontsReady,
    ...imagePromises,
    waitForStackReady("discipline-stack"),
    waitForStackReady("project-stack")
  ]);

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}


const siteBootGate = createSiteBootGate();

export { waitForSiteReadiness, siteBootGate };
