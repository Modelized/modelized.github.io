export function glyphFlight(progress) {
  const p = Math.max(0, Math.min(1, progress));
  return { position: p === 1 ? 1 : 1 - Math.exp(-7 * p) * (Math.cos(8 * p) + .875 * Math.sin(8 * p)),
    scale: 1 - Math.pow(1 - p, 3) };
}

export function glyphTriggerRect(trigger) {
  const image = trigger.querySelector(".hero-project-logo");
  const rect = image.getBoundingClientRect();
  // Glyph Story's pieces crop the source SVG at (108, 122), spanning 296 × 297.
  return { left: rect.left + rect.width * 108 / 512, top: rect.top + rect.height * 122 / 512,
    width: rect.width * 296 / 512, height: rect.height * 297 / 512 };
}
