// Shared by the glyph and light passes: one wave, in CSS viewport coordinates.
export const TEXTURE_WAVE = `
uniform vec2 textureOrigin;
uniform vec2 textureViewport;
uniform vec2 texturePixels;
uniform float textureProgress;
uniform float textureStage;
uniform float textureStrength;
uniform float textureLightLimit;
vec2 texturePoint() {
  return vec2(gl_FragCoord.x / texturePixels.x, 1. - gl_FragCoord.y / texturePixels.y) * textureViewport;
}
float textureReach() {
  return length(max(textureOrigin, textureViewport - textureOrigin));
}
float textureTravel(float p) {
  // The released pressure travels fastest immediately, then steadily settles.
  return 1. - pow(1. - clamp(p, 0., 1.), 2.4);
}
float textureGatherProgress(float p) {
  p = clamp(p, 0., 1.);
  return p * (2. - p);
}
float textureGatherRadius(float p) {
  // A wide, faint wash concentrates with the pull, without an incoming ring.
  float extent = min(textureReach() * 1.08, 1200.);
  return extent * mix(1., .48, textureGatherProgress(p));
}
float textureSwell(float p) {
  return mix(1., .28, smoothstep(.10, .88, p)) * (1. - smoothstep(.80, 1., p));
}
vec4 textureGatherLight(vec2 point, float p) {
  float r = length(point - textureOrigin);
  float pressure = textureGatherProgress(p);
  float focus = exp(-pow(r / mix(100., 46., pressure), 2.));
  float haze = exp(-pow(r / textureGatherRadius(p), 2.) * 1.5);
  float shoulder = exp(-pow(r / (textureGatherRadius(p) * .43), 2.));
  float alpha = (focus * .59 + shoulder * .10 + haze * .13)
    * pressure;
  vec3 warm = mix(vec3(1., .79, .62), vec3(1., .98, .94), clamp(focus + shoulder * .30, 0., 1.));
  return vec4(warm * alpha, alpha);
}
vec3 textureWave(vec2 point) {
  float p = clamp(textureProgress, 0., 1.);
  float breadth = clamp(min(textureViewport.x, textureViewport.y) * .24, 92., 180.);
  float radius = mix(22., textureReach() + breadth * 2., textureTravel(p));
  float width = breadth * mix(.65, 1.25, smoothstep(0., .55, p));
  float q = (length(point - textureOrigin) - radius) / width;
  return vec3(q, width, radius);
}
vec2 texturePull(vec2 point, float p) {
  vec2 ray = point - textureOrigin;
  float r = length(ray);
  // Accumulate the pull over the initial wide field. Contracting its falloff
  // each frame would let distant features spring back while still gathering.
  float influence = textureGatherRadius(0.);
  float field = exp(-pow(r / influence, 2.) * 1.8);
  float pull = min(r * .40, 112.) * field * textureGatherProgress(p);
  return ray / max(1., r) * pull;
}
vec2 textureDisplacement(vec2 point) {
  vec2 ray = point - textureOrigin;
  float r = length(ray);
  float p = clamp(textureProgress, 0., 1.);
  if (textureStage < .5) {
    // Pull the sampled image outward so its visible features move INWARD.
    // Light contraction and inward movement share the same pressure curve.
    return texturePull(point, p) * textureStrength;
  }
  vec3 wave = textureWave(point);
  float envelope = textureSwell(p) * smoothstep(0., .12, p);
  // A broad convex lens followed by a smaller recovery trough, not a thin ripple.
  float lens = wave.x * exp(-wave.x * wave.x * 2.2);
  float wake = (wave.x + 1.4) * exp(-pow(wave.x + 1.4, 2.) * 4.) * .16;
  vec2 release = texturePull(point, 1.) * (1. - smoothstep(0., .35, p));
  return (release + ray / max(1., r) * (lens - wake) * wave.y * 1.35 * envelope) * textureStrength;
}
float textureDefocus(vec2 point) {
  float r = length(point - textureOrigin);
  if (textureStage < .5) {
    float extent = textureGatherRadius(textureProgress) * .65;
    return 2.6 * smoothstep(0., .8, textureProgress) * exp(-pow(r / extent, 2.)) * textureStrength;
  }
  float q = textureWave(point).x;
  float release = 2.6 * exp(-pow(r / (textureGatherRadius(1.) * .65), 2.)) * (1. - smoothstep(0., .3, textureProgress));
  return (release + 3.4 * exp(-q * q * 2.) * textureSwell(textureProgress)
    * smoothstep(0., .12, textureProgress)) * textureStrength;
}
`;

export const TEXTURE_LIGHT = `
precision highp float;
${TEXTURE_WAVE}
void main() {
  vec2 point = texturePoint();
  float p = textureProgress;
  if (textureStage < .5) {
    gl_FragColor = textureGatherLight(point, p) * textureStrength;
    return;
  }
  vec3 wave = textureWave(point);
  float envelope = mix(1., .55, smoothstep(.18, .85, p)) * (1. - smoothstep(.72, 1., p));
  float crest = exp(-pow(wave.x + .18, 2.) * 7.);
  float face = exp(-pow(wave.x + .50, 2.) * 1.6);
  float halo = exp(-wave.x * wave.x * .48);
  float trough = exp(-pow(wave.x - .65, 2.) * 5.);
  float alpha = (crest * .48 + face * .25 + halo * .12 + trough * .12) * envelope;
  vec3 warm = mix(vec3(1., .74, .48), vec3(1., .985, .955), clamp(crest + face * .75, 0., 1.));
  warm *= 1. - trough * .72;
  // Fade the light independently of the refraction/replacement front, before
  // the leading halo reaches the bottom. Zero means the short-viewport case.
  float lightFade = 1.;
  if (textureLightLimit > 0.) {
    float finish = max(23., textureLightLimit - wave.y * 1.4);
    float start = max(22., finish - wave.y * 1.6);
    lightFade = 1. - smoothstep(start, finish, wave.z);
  }
  gl_FragColor = mix(textureGatherLight(point, 1.), vec4(warm * alpha, alpha),
    smoothstep(0., .16, p)) * textureStrength * lightFade;
}
`;

// Logos/CTA use the identical displacement and local defocus as the typography.
export const TEXTURE_SURFACE = `
precision highp float;
${TEXTURE_WAVE}
uniform sampler2D surface;
uniform vec4 surfaceBox;
vec4 readSurface(vec2 point) {
  vec2 uv = (point - surfaceBox.xy) / surfaceBox.zw;
  vec4 color = texture2D(surface, uv);
  color.a *= step(0., uv.x) * step(uv.x, 1.) * step(0., uv.y) * step(uv.y, 1.);
  return vec4(color.rgb * color.a, color.a);
}
void main() {
  vec2 point = texturePoint();
  vec2 displaced = point + textureDisplacement(point);
  vec2 ray = point - textureOrigin;
  vec2 delta = ray / max(1., length(ray)) * textureDefocus(point);
  gl_FragColor = readSurface(displaced) * .5 + readSurface(displaced - delta) * .25
    + readSurface(displaced + delta) * .25;
}
`;
