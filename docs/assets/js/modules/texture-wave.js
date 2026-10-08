export function sampleTextureMotion(stage, progress) {
  const p = Math.max(0, Math.min(1, progress));
  if (stage < .5) return { position: p * p * (3 - 2 * p), speed: 4 * p * (1 - p) };
  const onset = Math.sqrt(.035);
  const root = Math.sqrt(p + .035);
  return { position: (root - onset) / (Math.sqrt(1.035) - onset), speed: onset / root };
}

export const TEXTURE_WAVE = `
uniform vec2 textureOrigin;
uniform vec2 textureViewport;
uniform vec2 texturePixels;
uniform vec2 textureMotion;
uniform float textureFocus;
uniform float textureStage;
uniform float textureStrength;
uniform float textureLightLimit;
vec2 texturePoint() {
  return vec2(gl_FragCoord.x / texturePixels.x, 1. - gl_FragCoord.y / texturePixels.y) * textureViewport;
}
float textureReach() {
  return length(max(textureOrigin, textureViewport - textureOrigin));
}
float textureGatherRadius(float phase) {
  return mix(textureReach() * 1.12, textureFocus * 5., phase);
}
float textureHandoff() {
  return smoothstep(0., .12, textureMotion.x);
}
float textureSwell() {
  float phase = textureMotion.x;
  return sqrt(textureMotion.y) * (1. - phase * .5)
    * (1. - smoothstep(.9, 1., phase)) * textureHandoff();
}
vec4 textureGatherLight(vec2 point, float phase) {
  float r = length(point - textureOrigin);
  float extent = textureGatherRadius(0.);
  float focus = exp(-pow(r / mix(extent * .40, textureFocus * 1.45, phase), 2.));
  float haze = exp(-pow(r / textureGatherRadius(phase), 2.) * 1.5);
  float shoulder = exp(-pow(r / mix(extent * .65, textureFocus * 2.6, phase), 2.));
  float alpha = (focus * mix(.08, .59, phase) + shoulder * .10 + haze * .13)
    * (1. - exp(-8. * phase));
  vec3 warm = mix(vec3(1., .79, .62), vec3(1., .98, .94), clamp(focus + shoulder * .30, 0., 1.));
  return vec4(warm * alpha, alpha);
}
vec3 textureWave(vec2 point) {
  float phase = textureMotion.x;
  float breadth = clamp(min(textureViewport.x, textureViewport.y) * .24, 92., 180.);
  float radius = mix(textureFocus, textureReach() + breadth * 2., phase);
  float width = breadth * mix(.65, 1.25, phase);
  float q = (length(point - textureOrigin) - radius) / width;
  return vec3(q, width, radius);
}
vec2 texturePull(vec2 point, float phase) {
  vec2 ray = point - textureOrigin;
  float r = length(ray);
  float influence = textureGatherRadius(0.);
  float field = exp(-pow(r / influence, 2.) * 1.8);
  float t = .22 * phase * field;
  // Inverse quadratic Bezier contraction; the two axes turn at different rates.
  vec2 contraction = vec2(1. - 1.5 * t + .5 * t * t, 1. - .8 * t - .2 * t * t);
  return ray * (1. / contraction - 1.);
}
vec2 textureDisplacement(vec2 point) {
  vec2 ray = point - textureOrigin;
  float r = length(ray);
  float phase = textureMotion.x;
  if (textureStage < .5) {
    return texturePull(point, phase) * textureStrength;
  }
  vec3 wave = textureWave(point);
  float lens = wave.x * exp(-wave.x * wave.x * 2.2);
  float wake = (wave.x + 1.4) * exp(-pow(wave.x + 1.4, 2.) * 4.) * .16;
  vec2 release = texturePull(point, 1.) * (1. - phase);
  return (release + ray / max(1., r) * (lens - wake) * wave.y * 1.65 * textureSwell()) * textureStrength;
}
float textureDefocus(vec2 point) {
  float r = length(point - textureOrigin);
  float phase = textureMotion.x;
  if (textureStage < .5) {
    float extent = textureGatherRadius(phase) * .65;
    return 2.6 * phase * exp(-pow(r / extent, 2.)) * textureStrength;
  }
  float q = textureWave(point).x;
  float release = 2.6 * exp(-pow(r / (textureGatherRadius(1.) * .65), 2.)) * (1. - phase);
  return (release + 3.4 * exp(-q * q * 2.) * textureSwell()) * textureStrength;
}
`;

export const TEXTURE_LIGHT = `
precision highp float;
${TEXTURE_WAVE}
void main() {
  vec2 point = texturePoint();
  float phase = textureMotion.x;
  if (textureStage < .5) {
    gl_FragColor = textureGatherLight(point, phase) * textureStrength;
    return;
  }
  vec3 wave = textureWave(point);
  float dispersal = phase;
  if (textureLightLimit > 0.) {
    float finish = max(textureFocus + 1., textureLightLimit - wave.y * 1.4);
    float start = max(textureFocus, finish - wave.y * 2.);
    dispersal = max(dispersal, smoothstep(start, finish, wave.z));
  }
  float spread = 1. + 2.4 * dispersal * dispersal;
  float q = wave.x / spread;
  float crest = exp(-pow(q + .18, 2.) * 7.);
  float face = exp(-pow(q + .50, 2.) * 1.6);
  float halo = exp(-q * q * .48);
  float trough = exp(-pow(q - .65, 2.) * 5.);
  float energy = sqrt(textureMotion.y) * pow(1. - dispersal, 2.) / spread;
  float alpha = (crest * .48 + face * .25 + halo * .12 + trough * .12) * energy;
  vec3 warm = mix(vec3(1., .74, .48), vec3(1., .985, .955), clamp(crest + face * .75, 0., 1.));
  warm *= 1. - trough * .72;
  gl_FragColor = mix(textureGatherLight(point, 1.), vec4(warm * alpha, alpha),
    textureHandoff()) * textureStrength;
}
`;

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
