import { base, assetVersion, SETTLE_PASS_DELAYS, portraitBrandShifts, mobileMenuMotion, body, prefersReducedMotion } from "./context.js?v=20261002a";
function getPartialUrl(file) {
  const version = file === "nav.html" ? "20261008k" : assetVersion;
  if (!base || base === ".") {
    return `assets/partials/${file}?v=${version}`;
  }

  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalized}/assets/partials/${file}?v=${version}`;
}

async function injectPartial(selector, file) {
  const slot = document.querySelector(selector);
  if (!slot) {
    return;
  }

  try {
    const response = await fetch(getPartialUrl(file));
    if (!response.ok) {
      throw new Error(`${file} fetch failed: ${response.status}`);
    }
    slot.innerHTML = await response.text();
  } catch (error) {
    console.error("Partial load failed", error);
  }
}

function getScrollTop() {
  const scrollEl = document.scrollingElement || document.documentElement || document.body;
  return Math.max(window.scrollY || 0, window.pageYOffset || 0, scrollEl?.scrollTop || 0);
}

function createSettledScheduler(callback) {
  const timers = [];

  const clear = () => {
    while (timers.length) {
      window.clearTimeout(timers.pop());
    }
  };

  const schedule = (baseDelay = 0, beforeSchedule) => {
    clear();
    beforeSchedule?.();

    SETTLE_PASS_DELAYS.forEach((offset) => {
      timers.push(window.setTimeout(callback, baseDelay + offset));
    });
  };

  return { clear, schedule };
}

function getNavOffset() {
  const nav = document.querySelector(".nav");
  if (!nav) return 24;

  const row = nav.querySelector(".row");
  const rect = row ? row.getBoundingClientRect() : nav.getBoundingClientRect();
  return Math.ceil(rect.bottom + 18);
}

function isPortraitMobile() {
  return window.matchMedia("(max-width:900px) and (orientation:portrait)").matches;
}

function isNavMenuOpen(nav) {
  return !!nav?.classList.contains("nav--open");
}

function isPortraitMenuActive(nav) {
  return isPortraitMobile() && isNavMenuOpen(nav);
}

function clearPortraitMenuLayoutVars() {
  const root = document.documentElement;
  root.style.removeProperty("--menu-blur-top");
  root.style.removeProperty("--menu-blur-height");
  root.style.removeProperty("--mobile-row-inline");
  root.style.removeProperty("--mobile-menu-inline");
  root.style.removeProperty("--mobile-menu-top");
  root.style.removeProperty("--mobile-brand-shift-x");
  root.style.removeProperty("--mobile-brand-shift-y");
  root.style.removeProperty("--mobile-wordmark-font-size");
  root.style.removeProperty("--mobile-wordmark-right");
  root.style.removeProperty("--mobile-wordmark-bottom");
}

function clearPortraitBrandLock(nav) {
  if (!nav) return;
  portraitBrandShifts.delete(nav);
}

function setPortraitBrandShift(nav, shiftX, shiftY) {
  if (!nav) return;
  const root = document.documentElement;
  const normalizedX = Math.round(shiftX);
  const normalizedY = Math.round(shiftY);

  root.style.setProperty("--mobile-brand-shift-x", `${normalizedX}px`);
  root.style.setProperty("--mobile-brand-shift-y", `${normalizedY}px`);
  portraitBrandShifts.set(nav, { x: normalizedX, y: normalizedY });
}

function syncPortraitMenuBlurViewport() {
  const root = document.documentElement;
  if (!isPortraitMobile()) return null;

  const scrollTop = Math.round(window.scrollY || window.pageYOffset || 0);
  const viewportTop = 0;
  const viewportHeight = Math.round(
    window.innerHeight || document.documentElement.clientHeight || 0
  );
  const viewportWidth = Math.round(
    window.innerWidth || document.documentElement.clientWidth || 0
  );
  const viewportBottom = viewportTop + viewportHeight;

  root.style.setProperty("--menu-blur-top", `${scrollTop + viewportTop}px`);
  root.style.setProperty("--menu-blur-height", `${Math.max(0, viewportHeight)}px`);

  return { viewportHeight, viewportWidth, viewportBottom };
}

function syncPortraitMobileMenuLayout(nav) {
  const root = document.documentElement;
  if (!nav || !isPortraitMobile()) {
    clearPortraitMenuLayoutVars();
    return;
  }

  const viewport = syncPortraitMenuBlurViewport();
  if (!viewport) return;
  const { viewportHeight, viewportWidth, viewportBottom } = viewport;

  const menuInline = Math.round(Math.min(Math.max(viewportWidth * 0.084, 36), 46));
  root.style.setProperty("--mobile-menu-inline", `${menuInline}px`);

  const row = nav.querySelector(".row");
  const rowRect = row ? row.getBoundingClientRect() : null;
  const compositionLift = rowRect
    ? Math.round(Math.min(Math.max(rowRect.height * 0.15, 6), 8))
    : 0;
  const sheetContent = nav.querySelector(".sheet-content");
  if (rowRect && sheetContent) {
    const sheetContentRect = sheetContent.getBoundingClientRect();
    const menuGap = Math.round(Math.min(Math.max(viewportHeight * 0.154, 92), 126));
    const menuTop = Math.round(
      Math.max(72, rowRect.bottom + menuGap - sheetContentRect.top) - compositionLift
    );
    root.style.setProperty("--mobile-menu-top", `${menuTop}px`);
  }

  const shouldAlignBrand = isNavMenuOpen(nav);

  const hasBrandShift =
    root.style.getPropertyValue("--mobile-brand-shift-x").trim() !== "" &&
    root.style.getPropertyValue("--mobile-brand-shift-y").trim() !== "";
  const lockedShift = portraitBrandShifts.get(nav);

  if (shouldAlignBrand && lockedShift) {
    if (!hasBrandShift) {
      setPortraitBrandShift(nav, lockedShift.x, lockedShift.y);
    }
  } else if (shouldAlignBrand) {
    const brand = nav.querySelector(".brand");
    const logo = nav.querySelector(".brand-logo");
    const firstLink = nav.querySelector(".mobile-menu a");
    if (brand && firstLink && rowRect) {
      const logoRect = (logo || brand).getBoundingClientRect();
      const firstLinkRect = firstLink.getBoundingClientRect();
      const firstLinkStyle = window.getComputedStyle(firstLink);
      const textLeft = firstLinkRect.left +
        (Number.parseFloat(firstLinkStyle.borderLeftWidth) || 0) +
        (Number.parseFloat(firstLinkStyle.paddingLeft) || 0);
      const gapAbove = Math.round(Math.min(Math.max(viewportHeight * 0.01, 4), 8));
      const alignedTop = firstLinkRect.top - logoRect.height - gapAbove;
      const minLogoTop = Math.round(rowRect.top + 6);
      const targetTop = Math.max(alignedTop, minLogoTop) - compositionLift;
      const visualLeftInset = logoRect.width * (115 / 512);
      const shiftX = Math.round(textLeft - (logoRect.left + visualLeftInset));
      const shiftY = Math.round(targetTop - logoRect.top);

      setPortraitBrandShift(nav, shiftX, shiftY);
    }
  } else {
    root.style.removeProperty("--mobile-brand-shift-x");
    root.style.removeProperty("--mobile-brand-shift-y");
    clearPortraitBrandLock(nav);
  }

  const wordmark = document.querySelector(".mobile-menu-wordmark");
  if (!wordmark) return;

  const baseRight = Math.round(Math.min(Math.max(viewportWidth * 0.03, 14), 24));
  const baseBottom = Math.round(Math.min(Math.max(viewportHeight * 0.12, 76), 108));
  let fontSize = Math.round(Math.min(Math.max(viewportHeight * 0.108, 88), 124));

  root.style.setProperty("--mobile-wordmark-right", `${baseRight}px`);
  root.style.setProperty("--mobile-wordmark-bottom", `${baseBottom}px`);
  root.style.setProperty("--mobile-wordmark-font-size", `${fontSize}px`);

  let wordmarkRect = wordmark.getBoundingClientRect();
  if (wordmarkRect.height > 0) {
    const desiredHeight = viewportHeight * 0.72;
    fontSize = Math.round(
      Math.min(Math.max(fontSize * (desiredHeight / wordmarkRect.height), 92), 144)
    );
    root.style.setProperty("--mobile-wordmark-font-size", `${fontSize}px`);

    wordmarkRect = wordmark.getBoundingClientRect();
    const overflowBottom = Math.max(0, wordmarkRect.bottom - (viewportBottom - 18));
    const overflowRight = Math.max(0, wordmarkRect.right - (viewportWidth - 12));
    const correctedBottom = baseBottom + Math.ceil(overflowBottom) + 4;
    const correctedRight = baseRight + Math.ceil(overflowRight);

    root.style.setProperty("--mobile-wordmark-bottom", `${correctedBottom}px`);
    root.style.setProperty("--mobile-wordmark-right", `${correctedRight}px`);
  }
}

function clearTransientMobileMenuState(nav) {
  if (isNavMenuOpen(nav)) return;
  cancelMobileMenuWork();
  mobileMenuMotion.closing = false;
  const sheet = nav?.querySelector("#mobile-sheet");
  body.classList.remove("nav-menu-open");
  body.classList.remove("nav-menu-closing");
  body.classList.remove("no-scroll");
  if (sheet) {
    sheet.setAttribute("aria-hidden", "true");
    sheet.setAttribute("inert", "");
    sheet.hidden = true;
  }
  clearPortraitBrandLock(nav);
  clearPortraitMenuLayoutVars();
}

function cancelMobileMenuWork() {
  cancelAnimationFrame(mobileMenuMotion.frame);
  mobileMenuMotion.frame = 0;
  return ++mobileMenuMotion.revision;
}

function finishMobileMenuClose(nav, revision) {
  // Observe the existing CSS transitions; do not replace or replay their motion.
  const elements = [
    nav.querySelector(".brand"),
    nav.querySelector(".sheet"),
    nav.querySelector(".sheet-content"),
    ...nav.querySelectorAll(".mobile-menu li"),
    document.querySelector(".mobile-menu-wordmark"),
    document.querySelector(".nav-menu-blur")
  ].filter(Boolean);
  const transitions = elements.flatMap((element) => element.getAnimations());
  Promise.allSettled(transitions.map((transition) => transition.finished)).then(() => {
    if (revision !== mobileMenuMotion.revision || isNavMenuOpen(nav)) return;
    clearTransientMobileMenuState(nav);
  });
}

function setNavOpenState(nav, open) {
  const toggle = nav?.querySelector(".nav-toggle");
  const sheet = nav?.querySelector("#mobile-sheet");

  if (!nav || !toggle) return;

  if (open === isNavMenuOpen(nav)) return;
  const revision = cancelMobileMenuWork();
  mobileMenuMotion.closing = !open;

  if (open) {
    if (sheet) {
      sheet.hidden = false;
      sheet.removeAttribute("inert");
      sheet.setAttribute("aria-hidden", "false");
    }
    nav.classList.add("nav--open");
    body.classList.remove("nav-menu-closing");

    mobileMenuMotion.frame = requestAnimationFrame(() => {
      mobileMenuMotion.frame = 0;
      if (revision !== mobileMenuMotion.revision || !isNavMenuOpen(nav)) return;
      syncPortraitMobileMenuLayout(nav);
      body.classList.add("nav-menu-open");
      body.classList.add("no-scroll");
    });
  } else {
    nav.classList.remove("nav--open");
    body.classList.remove("nav-menu-open");
    body.classList.add("nav-menu-closing");
    body.classList.remove("no-scroll");
    if (sheet) {
      sheet.setAttribute("aria-hidden", "true");
      sheet.setAttribute("inert", "");
    }
    mobileMenuMotion.frame = requestAnimationFrame(() => {
      mobileMenuMotion.frame = 0;
      if (revision !== mobileMenuMotion.revision) return;
      finishMobileMenuClose(nav, revision);
    });
  }

  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");

}

function closeMobileNav() {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  setNavOpenState(nav, false);
}

function syncMobileNavState() {
  const nav = document.querySelector(".nav");
  if (!nav) return;

  if (!isPortraitMobile()) {
    if (isNavMenuOpen(nav)) setNavOpenState(nav, false);
    clearTransientMobileMenuState(nav);
    return;
  }

  // Safari's viewport resize events must not cut a closing transition short.
  if (mobileMenuMotion.closing) return;

  if (!isPortraitMenuActive(nav)) {
    clearTransientMobileMenuState(nav);
    return;
  }

  syncPortraitMobileMenuLayout(nav);
}

function initMobileMenuDelays() {
  const items = Array.from(document.querySelectorAll(".mobile-menu li"));
  if (!items.length) return;

  const fallbackDelays = [0.0, 0.04, 0.08, 0.12, 0.16, 0.2, 0.25, 0.31];

  items.forEach((item, index) => {
    const existing = item.style.getPropertyValue("--menu-delay").trim();
    if (existing) return;
    const delay = fallbackDelays[index] ?? 0.31 + (index - fallbackDelays.length + 1) * 0.06;
    item.style.setProperty("--menu-delay", `${delay}s`);
  });
}

function initNavBackdrop() {
  if (document.body.dataset.backdropInit === "1") return;
  document.body.dataset.backdropInit = "1";

  let backdrop = document.querySelector(".nav-backdrop");
  let last = null;
  let ticking = false;
  const isHomeBackdropSuppressed = () => document.body.dataset.homeBackdropSuppressed === "1";

  const getScrolled = () => {
    return getScrollTop() > 4 && !isHomeBackdropSuppressed();
  };

  const resetBackdropState = () => {
    if (!backdrop) backdrop = document.querySelector(".nav-backdrop");
    backdrop?.classList.remove("is-visible");
    document.body.classList.remove("nav--scrolled");
    last = null;
  };

  const compute = () => {
    ticking = false;
    const scrolled = getScrolled();

    if (scrolled !== last) {
      if (!backdrop) backdrop = document.querySelector(".nav-backdrop");
      if (backdrop) backdrop.classList.toggle("is-visible", scrolled);

      document.body.classList.toggle("nav--scrolled", scrolled);
      last = scrolled;
    }
  };

  const onChange = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(compute);
  };

  const settledChange = createSettledScheduler(onChange);
  const scheduleSettledChange = (baseDelay = 0) => {
    settledChange.schedule(baseDelay, resetBackdropState);
  };

  compute();
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", () => scheduleSettledChange(80));
  window.addEventListener("orientationchange", () => scheduleSettledChange(140));
  window.addEventListener("pageshow", () => scheduleSettledChange(80));
}

function initMenuThumb() {
  const menu = document.querySelector("ul.menu");
  if (!menu) return;

  if (menu.dataset.thumbInit === "1") return;
  menu.dataset.thumbInit = "1";

  const allLinks = [...menu.querySelectorAll("a")];
  const links = allLinks.filter((a) => a.matches("[data-nav-link]"));
  if (!links.length) return;

  const normHash = (h) => {
    if (!h || h === "#hero") return "";
    return h;
  };

  allLinks.forEach((a) => a.classList.remove("is-current"));

  const currentHash = normHash(location.hash);
  let current = null;

  for (const a of links) {
    const href = normHash(a.getAttribute("href"));
    if (href === currentHash) {
      current = a;
      break;
    }
  }

  if (!current) current = links[0];
  if (current) current.classList.add("is-current");

  const setThumbTo = (a, show = true) => {
    // The desktop menu has no geometry in portrait mode.
    if (!menu.getClientRects().length) return;
    if (!a) {
      menu.style.setProperty("--menu-thumb-o", "0");
      return;
    }

    const mr = menu.getBoundingClientRect();
    const r = a.getBoundingClientRect();
    const ms = getComputedStyle(menu);

    const padStr = ms.getPropertyValue("--menu-thumb-pad").trim();
    const padNum = parseFloat(padStr);
    const pad = Number.isFinite(padNum) ? padNum : 10;

    const borderLeftNum = parseFloat(ms.borderLeftWidth);
    const borderLeft = Number.isFinite(borderLeftNum) ? borderLeftNum : 0;

    const x = r.left - mr.left - borderLeft - pad;
    const w = r.width + pad * 2;

    menu.style.setProperty("--menu-thumb-x", `${x}px`);
    menu.style.setProperty("--menu-thumb-w", `${w}px`);
    menu.style.setProperty("--menu-thumb-o", show ? "1" : "0");
  };

  const setTargetClass = (targetEl) => {
    for (const a of allLinks) a.classList.remove("is-target");
    if (targetEl) targetEl.classList.add("is-target");
  };

  const snapToCurrent = () => {
    const cur = menu.querySelector("a.is-current");
    if (cur) {
      setThumbTo(cur, true);
      setTargetClass(cur);
    } else {
      setThumbTo(null, false);
      setTargetClass(null);
    }
  };

  menu.classList.add("thumb-init");
  snapToCurrent();
  requestAnimationFrame(() => menu.classList.remove("thumb-init"));

  const realign = () => {
    if (menu.dataset.thumbHovering) return;
    snapToCurrent();
  };

  window.addEventListener("resize", realign);
  window.addEventListener("orientationchange", realign);
  window.addEventListener("modelized:navcurrentchange", realign);
  if (document.fonts?.ready) document.fonts.ready.then(realign);

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(realign);
    ro.observe(menu);
  }

  let raf = 0;
  let pointerX = 0;
  let leaveTimer = 0;

  const isHoverPointer = (e) => {
    return e && (e.pointerType === "mouse" || e.pointerType === "pen");
  };

  const nearestLinkByX = (clientX) => {
    let best = links[0];
    let bestD = Infinity;
    for (const a of links) {
      const r = a.getBoundingClientRect();
      const cx = (r.left + r.right) / 2;
      const d = Math.abs(clientX - cx);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  };

  const tick = () => {
    raf = 0;
    if (!menu.dataset.thumbHovering || !menu.getClientRects().length) return;
    const target = nearestLinkByX(pointerX);
    setThumbTo(target, true);
    setTargetClass(target);
  };

  const cancelLeave = () => {
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = 0;
    }
  };

  const scheduleLeave = () => {
    cancelLeave();
    leaveTimer = setTimeout(() => {
      delete menu.dataset.thumbHovering;
      snapToCurrent();
    }, 180);
  };

  menu.addEventListener("pointerenter", (e) => {
    if (!isHoverPointer(e)) return;
    cancelLeave();
    menu.dataset.thumbHovering = "1";
  });

  menu.addEventListener("pointermove", (e) => {
    if (!isHoverPointer(e)) return;
    cancelLeave();
    menu.dataset.thumbHovering = "1";

    pointerX = e.clientX;
    if (!raf) raf = requestAnimationFrame(tick);
  });

  menu.addEventListener("pointerleave", (e) => {
    if (!isHoverPointer(e)) {
      delete menu.dataset.thumbHovering;
      snapToCurrent();
      return;
    }
    scheduleLeave();
  });

  if (!("PointerEvent" in window)) {
    menu.addEventListener("mousemove", (e) => {
      menu.dataset.thumbHovering = "1";
      pointerX = e.clientX;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    menu.addEventListener("mouseleave", () => {
      delete menu.dataset.thumbHovering;
      snapToCurrent();
    });
  }
}

function scrollToTarget(hash) {
  if (!hash || hash === "#") {
    return null;
  }

  const target = document.querySelector(hash);
  if (!target) {
    return null;
  }

  if (hash === "#hero") {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
    return 0;
  }

  const destination = Math.max(
    0,
    target.getBoundingClientRect().top + window.scrollY - getNavOffset()
  );

  window.scrollTo({
    top: destination,
    behavior: prefersReducedMotion ? "auto" : "smooth"
  });

  return destination;
}

function initAnchorScroll() {
  document.addEventListener("click", (event) => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;

    const hash = anchor.getAttribute("href");
    if (!hash || hash === "#") return;

    const target = document.querySelector(hash);
    if (!target) return;

    event.preventDefault();
    scrollToTarget(hash);

    const nav = document.querySelector(".nav");
    if (nav?.classList.contains("nav--open")) {
      closeMobileNav();
    }
  });
}

function initNav() {
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav-toggle");
  const sheet = document.getElementById("mobile-sheet");

  if (toggle && sheet && nav) {
    toggle.addEventListener("click", () => {
      const open = !nav.classList.contains("nav--open");
      setNavOpenState(nav, open);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("nav--open")) {
        setNavOpenState(nav, false);
      }
    });

    window.addEventListener("resize", syncMobileNavState);
    window.addEventListener("orientationchange", syncMobileNavState);
    window.addEventListener("pageshow", syncMobileNavState);
  }

  const brand = document.querySelector(".brand");
  const logo = document.querySelector(".brand-logo");

  function update() {
    if (brand && logo && logo.naturalWidth > 0) {
      brand.classList.add("has-logo");
    }
  }

  if (logo) {
    if (logo.complete) update();
    logo.addEventListener("load", update);
    logo.addEventListener("error", () => {
      if (brand) brand.classList.remove("has-logo");
    });
  }

  initMenuThumb();
  initMobileMenuDelays();
  initNavBackdrop();
  syncMobileNavState();
}

function initSectionSpy() {
  const links = Array.from(document.querySelectorAll("[data-nav-link]"));
  if (!links.length) {
    return;
  }

  const map = new Map();
  links.forEach((link) => {
    const hash = link.getAttribute("href");
    if (!hash || !hash.startsWith("#")) {
      return;
    }
    const section = document.querySelector(hash);
    if (section) {
      const group = map.get(section) || [];
      group.push(link);
      map.set(section, group);
    }
  });

  const sectionsInOrder = Array.from(map.keys()).sort((a, b) => {
    const rectA = a.getBoundingClientRect();
    const rectB = b.getBoundingClientRect();
    return rectA.top + window.scrollY - (rectB.top + window.scrollY);
  });

  const setActive = (targetLinks) => {
    links.forEach((item) => {
      item.classList.remove("is-active");
      item.classList.remove("is-current");
    });
    if (!targetLinks) {
      window.dispatchEvent(new Event("modelized:navcurrentchange"));
      return;
    }

    targetLinks.forEach((item) => {
      item.classList.add("is-active");
      item.classList.add("is-current");
    });
    window.dispatchEvent(new Event("modelized:navcurrentchange"));
  };

  const firstLinkForHash = (hash) => {
    if (!hash) {
      return links[0];
    }
    return links.find((item) => item.getAttribute("href") === hash) || links[0];
  };

  const setActiveByHash = (hash) => {
    if (!hash) {
      const homeLinks = links.filter((item) => item.getAttribute("href") === "#hero");
      setActive(homeLinks.length ? homeLinks : [links[0]]);
      return;
    }
    const matching = links.filter((item) => item.getAttribute("href") === hash);
    setActive(matching.length ? matching : [firstLinkForHash(hash)]);
  };

  const homeSection = document.querySelector("#hero");
  let lockedHash = "";
  let lockTimer = 0;

  const clearScrollLock = () => {
    if (lockTimer) {
      clearTimeout(lockTimer);
      lockTimer = 0;
    }
    lockedHash = "";
  };

  const releaseScrollLock = () => {
    clearScrollLock();
    syncFromViewport();
  };

  const scheduleScrollLockRelease = (delay = 140) => {
    if (!lockedHash) return;
    if (lockTimer) {
      clearTimeout(lockTimer);
    }
    lockTimer = window.setTimeout(releaseScrollLock, delay);
  };

  setActiveByHash(location.hash);

  if (!("IntersectionObserver" in window)) {
    return;
  }

  const syncFromViewport = () => {
    if (lockedHash) {
      setActiveByHash(lockedHash);
      return;
    }

    const footer = document.querySelector(".site-footer");
    const lastSection = sectionsInOrder[sectionsInOrder.length - 1] || null;

    if (footer && lastSection) {
      const footerRect = footer.getBoundingClientRect();
      const footerVisible = footerRect.top < window.innerHeight && footerRect.bottom > 0;

      if (footerVisible) {
        const lastHash = lastSection.id ? `#${lastSection.id}` : "";
        setActiveByHash(lastHash);
        return;
      }
    }

    const focusLine = Math.max(getNavOffset() + 18, Math.round(window.innerHeight * 0.34));

    let currentSection = homeSection || sectionsInOrder[0] || null;

    sectionsInOrder.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= focusLine) {
        currentSection = section;
      }
    });

    if (!currentSection) {
      return;
    }

    const currentHash = currentSection.id ? `#${currentSection.id}` : "";
    setActiveByHash(currentHash);
  };

  const observer = new IntersectionObserver(
    () => {
      syncFromViewport();
    },
    {
      rootMargin: "-18% 0px -58% 0px",
      threshold: [0, 0.01, 0.1, 0.25, 0.5]
    }
  );

  map.forEach((_link, section) => observer.observe(section));
  requestAnimationFrame(syncFromViewport);

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const nextHash = link.getAttribute("href");
      if (!nextHash || !nextHash.startsWith("#")) return;

      clearScrollLock();
      lockedHash = nextHash;
      setActiveByHash(lockedHash);
      scheduleScrollLockRelease(prefersReducedMotion ? 0 : 180);
    });
  });

  let scrollSyncRaf = 0;
  window.addEventListener(
    "scroll",
    () => {
      scheduleScrollLockRelease(140);
      if (scrollSyncRaf) {
        return;
      }
      scrollSyncRaf = requestAnimationFrame(() => {
        scrollSyncRaf = 0;
        syncFromViewport();
      });
    },
    { passive: true }
  );

  window.addEventListener("orientationchange", clearScrollLock);
  window.addEventListener("resize", releaseScrollLock);
}

export { getScrollTop, createSettledScheduler, injectPartial, initNav, syncMobileNavState, initAnchorScroll, initSectionSpy };
