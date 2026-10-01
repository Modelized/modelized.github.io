const body = document.body;
const base = (body?.getAttribute("data-base") || ".").trim();
const assetVersion = "20260831c";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SETTLE_PASS_DELAYS = [0, 140, 320, 560];
const SITE_LOADER_REVEAL_DELAY = 220;
const SITE_LOADER_SKIP_DELAY = 4200;
const mobileMenuMotion = { revision: 0, frame: 0, closing: false };
const portraitBrandShifts = new WeakMap();
const simpleIcon = (name) => `https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${name}.svg`;

export { simpleIcon, base, assetVersion, SETTLE_PASS_DELAYS, portraitBrandShifts, mobileMenuMotion, body, prefersReducedMotion, SITE_LOADER_REVEAL_DELAY, SITE_LOADER_SKIP_DELAY };
