// Shared page context

const body = document.body;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { body, prefersReducedMotion };
