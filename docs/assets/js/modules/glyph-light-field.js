import { TEXTURE_WAVE, TEXTURE_SPREAD_LIGHT } from "./texture-wave.js?v=20261013q";
import { glyphFlight } from "./glyph-motion.js?v=20261013q";

export const GLYPH_SYNTHESIS_MS = 1600;
export const GLYPH_ASSEMBLY_MS = 980;
export function sampleGlyphSynthesis(progress) {
  const p = Math.max(0, Math.min(1, progress));
  const position = p ** 3 * (20 + p * (-45 + p * (36 - 10 * p)));
  const speed = 60 * p * p * (1 - p) ** 3;
  return { position: p === 0 || p === 1 ? p : position, speed, recoil: 0 };
}

function sampleGlyphFinishScale(elapsed) {
  const duration = GLYPH_ASSEMBLY_MS + GLYPH_SYNTHESIS_MS;
  const turn = GLYPH_ASSEMBLY_MS + GLYPH_SYNTHESIS_MS * .15;
  const minimum = .60;
  const time = Math.max(0, Math.min(duration, elapsed));
  if (time <= turn) return minimum + (1 - minimum) * (1 + Math.cos(Math.PI * time / turn)) / 2;
  const t = (time - turn) / (duration - turn);
  return minimum + (1 - minimum) * glyphFlight(t).position;
}

export function sampleGlyphAssemblyScale(progress) {
  return sampleGlyphFinishScale(Math.max(0, Math.min(1, progress)) * GLYPH_ASSEMBLY_MS);
}

export function sampleGlyphSynthesisScale(progress) {
  return sampleGlyphFinishScale(GLYPH_ASSEMBLY_MS + Math.max(0, Math.min(1, progress)) * GLYPH_SYNTHESIS_MS);
}

export function signedGlyphDistance(alpha, width, height) {
  const inside = new Float32Array(alpha.length), outside = new Float32Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) {
    const solid = alpha[i] >= 128;
    inside[i] = solid ? 1e6 : 0;
    outside[i] = solid ? 0 : 1e6;
  }
  for (const field of [inside, outside]) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x) field[i] = Math.min(field[i], field[i - 1] + 1);
      if (y) field[i] = Math.min(field[i], field[i - width] + 1);
      if (x && y) field[i] = Math.min(field[i], field[i - width - 1] + Math.SQRT2);
      if (x + 1 < width && y) field[i] = Math.min(field[i], field[i - width + 1] + Math.SQRT2);
    }
    for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (x + 1 < width) field[i] = Math.min(field[i], field[i + 1] + 1);
      if (y + 1 < height) field[i] = Math.min(field[i], field[i + width] + 1);
      if (x + 1 < width && y + 1 < height) field[i] = Math.min(field[i], field[i + width + 1] + Math.SQRT2);
      if (x && y + 1 < height) field[i] = Math.min(field[i], field[i + width - 1] + Math.SQRT2);
    }
  }
  const pixels = new Uint8Array(alpha.length * 4);
  for (let i = 0; i < alpha.length; i++) {
    const distance = outside[i] - inside[i];
    const encoded = Math.max(0, Math.min(65535, Math.round(32768 + distance * 16)));
    pixels.set([encoded >> 8, encoded & 255, alpha[i], 255], i * 4);
  }
  return pixels;
}

export function captureGlyphField(mark) {
  const box = mark.getBoundingClientRect();
  const padding = Math.max(box.width, box.height) * .4;
  const rect = { x: box.left - padding, y: box.top - padding,
    width: box.width + padding * 2, height: box.height + padding * 2 };
  const density = Math.min(2, 640 / Math.max(rect.width, rect.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(rect.width * density); canvas.height = Math.ceil(rect.height * density);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Glyph field unavailable");
  context.fillStyle = "white";
  for (const path of mark.querySelectorAll(".glyph-piece__art .glyph-piece__fill")) {
    const m = path.getScreenCTM();
    context.setTransform(m.a * density, m.b * density, m.c * density, m.d * density,
      (m.e - rect.x) * density, (m.f - rect.y) * density);
    context.fill(new Path2D(path.getAttribute("d")), path.getAttribute("fill-rule") || "nonzero");
  }
  const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const alpha = Uint8Array.from({ length: canvas.width * canvas.height }, (_, i) => rgba[i * 4 + 3]);
  return { rect, density,
    width: canvas.width, height: canvas.height,
    pixels: signedGlyphDistance(alpha, canvas.width, canvas.height) };
}

export const GLYPH_FOCUS_LIGHT = `
precision highp float;
${TEXTURE_WAVE}
${TEXTURE_SPREAD_LIGHT}
uniform sampler2D glyphField;
uniform vec4 glyphBox;
uniform float glyphDensity;
uniform float glyphScale;
float distanceAt(vec2 point) {
  vec2 uv = (point - glyphBox.xy) / glyphBox.zw;
  vec2 bounded = clamp(uv, 0., 1.);
  vec4 value = texture2D(glyphField, bounded);
  return (value.r * 65280. + value.g * 255. - 32768.) / (16. * glyphDensity)
    + length((uv - bounded) * glyphBox.zw);
}
void main() {
  vec2 point = texturePoint();
  float size = min(glyphBox.z, glyphBox.w) / 1.8;
  float phase = textureMotion.x;
  float q = textureWave(point).x;
  float revealed = (1. - smoothstep(-.45, .45, q)) * smoothstep(0., .10, phase);
  vec2 glyphPoint = textureOrigin + (point - textureOrigin) / glyphScale;
  float d = distanceAt(glyphPoint) * glyphScale;
  float softness = mix(size * .025, .4, textureMotion.x);
  float focused = 1. - smoothstep(-softness, softness, d);
  vec2 uv = (glyphPoint - glyphBox.xy) / glyphBox.zw;
  float coverage = texture2D(glyphField, clamp(uv, 0., 1.)).b
    * step(0., uv.x) * step(uv.x, 1.) * step(0., uv.y) * step(uv.y, 1.);
  float defocus = exp(-q * q * 3.) * 4. * phase * (1. - phase) * .45;
  float core = mix(coverage, focused, defocus) * revealed;
  vec4 innerLight = vec4(vec3(1., .913725, .815686) * core, core);
  vec4 lens = textureSpreadLight(point);
  gl_FragColor = lens + innerLight * (1. - lens.a);
}
`;
