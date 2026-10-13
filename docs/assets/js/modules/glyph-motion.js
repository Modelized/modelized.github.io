export function glyphFlight(progress) {
  const p = Math.max(0, Math.min(1, progress));
  return { position: p === 1 ? 1 : 1 - Math.exp(-7 * p) * (Math.cos(8 * p) + .875 * Math.sin(8 * p)),
    scale: 1 - Math.pow(1 - p, 3) };
}
