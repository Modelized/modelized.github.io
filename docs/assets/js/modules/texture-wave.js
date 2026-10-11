export function sampleTextureMotion(stage, progress) {
  const p = Math.max(0, Math.min(1, progress));
  if (stage < .5) return { position: p * p * (3 - 2 * p), speed: 4 * p * (1 - p), recoil: 1 };
  const settle = p === 1 ? 0 : 1 - Math.pow(Math.max(0, (p - .8) / .2), 2);
  const recoil = p === 1 ? 0 : Math.exp(-8 * p) * (Math.cos(11 * p) + 8 / 11 * Math.sin(11 * p)) * settle;
  const rate = 2.7, normalizer = 1 - Math.exp(-rate);
  let position = (1 - Math.exp(-rate * p)) / normalizer;
  let speed = rate * Math.exp(-rate * p) / normalizer;
  if (p > .6) {
    const t = (p - .6) / .4;
    const start = (1 - Math.exp(-rate * .6)) / normalizer;
    const tangent = .4 * rate * Math.exp(-rate * .6) / normalizer;
    position = (2 * t ** 3 - 3 * t * t + 1) * start + (t ** 3 - 2 * t * t + t) * tangent
      + (-2 * t ** 3 + 3 * t * t);
    speed = ((6 * t * t - 6 * t) * start + (3 * t * t - 4 * t + 1) * tangent
      - 6 * t * t + 6 * t) / .4;
  }
  return { position, speed: Math.max(0, speed), recoil };
}

export function sampleTexturePress(stage, position, strength = 1) {
  return 1 - .1 * (stage < .5 ? position : 1 - position) * strength;
}

export function sampleTextureCharge(elapsed) {
  const t = Math.max(0, Math.min(1, (elapsed - 1300) / 1200));
  const sustained = Math.max(0, Math.min(1, (elapsed - 2500) / 3000));
  const gain = t * t * (3 - 2 * t) + .6 * sustained * sustained * (3 - 2 * sustained);
  return {
    energy: gain,
    x: gain * (1.1 * Math.sin(elapsed * .049) + .45 * Math.sin(elapsed * .083)),
    y: gain * (.85 * Math.sin(elapsed * .061) + .35 * Math.sin(elapsed * .097))
  };
}

export const TEXTURE_WAVE = `
uniform vec2 textureOrigin;
uniform vec2 textureViewport;
uniform vec2 texturePixels;
uniform vec2 textureMotion;
uniform vec2 textureWaveSize;
uniform float textureBloom;
uniform float textureRecoil;
uniform float textureFocus;
uniform float textureStage;
uniform float textureStrength;
uniform float textureLightLimit;
uniform vec2 textureJitter;
uniform float textureCharge;
uniform float textureLoading;
uniform float textureElapsed;
uniform float textureGlyphMode;
vec2 texturePoint() {
  return vec2(gl_FragCoord.x / texturePixels.x, 1. - gl_FragCoord.y / texturePixels.y) * textureViewport;
}
float textureReach() {
  return length(max(textureOrigin, textureViewport - textureOrigin));
}
float textureGatherRadius(float phase) {
  return mix(textureReach() * .78, textureFocus * 2.8, phase);
}
float textureHandoff() {
  return smoothstep(0., .065, textureMotion.x);
}
float textureSwell() {
  float phase = textureMotion.x;
  return (1. - phase * .72) * (1. - smoothstep(.82, 1., phase)) * textureHandoff();
}
vec4 textureGatherLight(vec2 point, float phase) {
  float loading = textureGlyphMode > .5 ? 0. : textureLoading;
  float r = length(point - textureOrigin);
  float extent = textureGatherRadius(0.);
  float radius = mix(textureGatherRadius(phase), textureFocus * .98 / .72, loading);
  float width = mix(mix(extent * .36, textureFocus * 1.5, phase), textureFocus * .29, loading);
  float q = (r - radius * .72) / width;
  float focus = exp(-pow(r / mix(extent * .30, textureFocus * 1.15, phase), 2.));
  float shoulder = exp(-q * q * 1.7);
  float haze = exp(-pow(r / (radius + width), 2.));
  vec2 ray = point - textureOrigin;
  float angle = fract(atan(ray.y, ray.x) / 6.2831853 - textureElapsed / 1.8);
  float arc = smoothstep(.08, .85, angle) * (1. - smoothstep(.85, 1., angle));
  float alpha = (focus * mix(.025, .72, phase) * (1. - loading)
    + shoulder * mix(mix(.035, .19, phase), .9 * arc, loading)
    + haze * .045)
    * smoothstep(0., .12, phase);
  if (textureGlyphMode > .5) alpha = mix(alpha, shoulder * .045 + haze * .065, textureLoading);
  vec3 warm = mix(vec3(1., .76, .53), vec3(1., .985, .96), clamp(focus + shoulder * .8, 0., 1.));
  return vec4(warm * alpha, alpha);
}
vec3 textureWave(vec2 point) {
  float phase = textureMotion.x;
  float reach = textureWaveSize.x > 0. ? textureWaveSize.x : textureReach();
  float breadth = textureWaveSize.y > 0. ? textureWaveSize.y : min(textureViewport.x, textureViewport.y) * .30 + reach * .035;
  float radius = textureBloom > .5
    ? mix(-reach * .45, reach + breadth * 1.3, phase)
    : mix(textureFocus, reach + breadth * 1.1, phase);
  float width = breadth * mix(.8, 1.2, phase);
  float q = (length(point - textureOrigin) - radius) / width;
  return vec3(q, width, radius);
}
float textureVisibility(vec2 point) {
  if (textureGlyphMode < .5 || textureStage < .5) return 1.;
  return smoothstep(-.45, .45, textureWave(point).x);
}
vec2 texturePull(vec2 point, float phase) {
  vec2 ray = point - textureOrigin;
  float r = length(ray);
  float influence = textureReach() * .68;
  float field = exp(-pow(r / influence, 2.) * 1.8);
  float t = .20 * phase * field;
  // Inverse quadratic Bezier contraction; the two axes turn at different rates.
  vec2 contraction = vec2(1. - 1.5 * t + .5 * t * t, 1. - .8 * t - .2 * t * t);
  return ray * (1. / contraction - 1.);
}
vec2 textureDisplacement(vec2 point) {
  vec2 ray = point - textureOrigin;
  float r = length(ray);
  float phase = textureMotion.x;
  if (textureStage < .5) {
    return (texturePull(point, phase) + textureJitter) * textureStrength;
  }
  vec3 wave = textureWave(point);
  float crest = exp(-pow(wave.x + .15, 2.) * 1.35);
  float wake = exp(-pow(wave.x + 1.85, 2.) * 2.) * .13;
  vec2 release = texturePull(point, 1.) * textureRecoil;
  return (release + textureJitter - ray / max(1., r) * (crest - wake) * wave.y * .32 * textureSwell()) * textureStrength;
}
float textureChromatic(vec2 point) {
  float field = exp(-pow(length(point - textureOrigin) / (textureReach() * .6), 2.));
  return min(.72, textureCharge * .45) * field * textureStrength;
}
vec4 textureComposite(vec4 center, vec4 inward, vec4 outward, float chromatic) {
  vec4 soft = center * .5 + inward * .25 + outward * .25;
  vec3 split = vec3(outward.r, mix(center.g, outward.g, .65), mix(center.b, inward.b, .55));
  float coverage = max(center.a, max(inward.a, outward.a));
  return mix(soft, vec4(split, coverage), chromatic);
}
float textureDefocus(vec2 point) {
  float r = length(point - textureOrigin);
  float phase = textureMotion.x;
  if (textureStage < .5) {
    float extent = mix(textureGatherRadius(0.) * .6, textureGatherRadius(0.) * .28, phase);
    return 5.2 * phase * exp(-pow(r / extent, 2.)) * textureStrength;
  }
  float q = textureWave(point).x;
  float release = 5.2 * exp(-pow(r / (textureGatherRadius(0.) * .28), 2.)) * max(0., textureRecoil);
  return (release + 4.2 * exp(-pow(q + .15, 2.) * 1.35) * textureSwell()) * textureStrength;
}
`;

export const TEXTURE_PARTICLE_VERTEX = `
attribute vec2 position;
uniform vec2 textureOrigin;
uniform vec2 textureViewport;
uniform vec2 texturePixels;
uniform vec2 textureMotion;
uniform float textureElapsed;
uniform float textureStage;
uniform float textureStrength;
uniform float textureRadial;
uniform float textureBurst;
varying mediump float particleAlpha;
varying mediump vec2 particleAxis;
varying mediump float particleStretch;
varying mediump float particleFocus;
void main() {
  float seed = position.x;
  float life = fract(textureElapsed * mix(.42, .68, fract(seed * .173)) + position.y);
  float travel = pow(life, 1.7);
  float remaining = 1. - travel;
  float reach = min(textureViewport.x, textureViewport.y) * .85;
  vec2 start = vec2((seed + .5) / 16. * textureViewport.x,
    min(textureViewport.y - 12., textureOrigin.y + reach * mix(.3, 1., fract(seed * .317))));
  float angle = seed * 2.399963;
  if (textureRadial > .5) start = textureOrigin + vec2(cos(angle), sin(angle)) * reach * mix(.35, 1., fract(seed * .317));
  vec2 offset = start - textureOrigin;
  vec2 end = textureOrigin + vec2(sign(offset.x) * 7., 9.);
  if (textureRadial > .5) end = textureOrigin + normalize(offset) * 9.;
  vec2 control = textureOrigin + offset * vec2(.18, .72);
  vec2 point = remaining * remaining * start + 2. * remaining * travel * control + travel * travel * end;
  float fade = textureStage < .5 ? smoothstep(0., .25, textureMotion.x)
    : 1. - smoothstep(0., .22, textureMotion.x);
  particleFocus = smoothstep(.05, .7, life);
  particleStretch = mix(1.3, 3.8, travel);
  vec2 tangent = remaining * (control - start) + travel * (end - control);
  particleAxis = tangent / max(1., length(tangent));
  particleAlpha = smoothstep(0., .18, life) * (1. - smoothstep(.82, 1., life))
    * mix(.24, .62, particleFocus) * fade * textureStrength;
  if (textureBurst > .5) {
    float delay = .05 + fract(seed * .413) * .28;
    float age = max(0., textureElapsed - delay);
    float duration = mix(.55, 1.15, fract(seed * .217));
    float burst = 1. - exp(-age * 3.2);
    vec2 direction = vec2(cos(angle), sin(angle));
    point = textureOrigin + direction * reach * burst * mix(.18, .58, fract(seed * .317));
    point.y += age * age * 24.;
    particleAxis = normalize(direction + vec2(0., age * .1));
    particleFocus = 1.;
    particleStretch = mix(4., 1.5, min(1., age / duration));
    particleAlpha = smoothstep(0., .05, age) * (1. - smoothstep(duration * .2, duration, age))
      * mix(.3, .8, fract(seed * .619)) * textureStrength;
  }
  gl_Position = vec4(point / textureViewport * vec2(2., -2.) + vec2(-1., 1.), 0., 1.);
  gl_PointSize = (8. + fract(seed * .37) * 5. + travel * 7.) * texturePixels.x / textureViewport.x;
}
`;

export const TEXTURE_PARTICLE_FRAGMENT = `
precision mediump float;
varying mediump float particleAlpha;
varying mediump vec2 particleAxis;
varying mediump float particleStretch;
varying mediump float particleFocus;
void main() {
  vec2 p = (gl_PointCoord - .5) * 2.;
  float along = dot(p, particleAxis);
  float across = dot(p, vec2(-particleAxis.y, particleAxis.x));
  across -= along * along * .20 * particleFocus;
  float shape = along * along * 4. + across * across * particleStretch * particleStretch * 5.;
  float halo = exp(-dot(p, p) * 5.) * (1. - particleFocus) * .15;
  float alpha = (exp(-shape) + halo) * (1. - smoothstep(.75, 1., length(p))) * particleAlpha;
  vec3 color = mix(vec3(1., .72, .42), vec3(1., .98, .88), smoothstep(-.12, .12, across));
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export const TEXTURE_SPREAD_LIGHT = `
vec4 textureSpreadLight(vec2 point) {
  float phase = textureMotion.x;
  vec3 wave = textureWave(point);
  float dispersal = smoothstep(textureBloom > .5 ? .55 : .3, 1., phase);
  if (textureLightLimit > 0.) {
    float finish = max(textureFocus + 1., textureLightLimit * .85);
    float start = mix(textureFocus, finish, .42);
    dispersal = max(dispersal, smoothstep(start, finish, wave.z));
  }
  float spread = 1. + 1.8 * dispersal * dispersal;
  float q = wave.x / spread;
  float crest = exp(-pow(q + .15, 2.) * 4.);
  float face = exp(-pow(q + .55, 2.) * 1.4);
  float halo = exp(-q * q * .38);
  float fringe = exp(-pow(q - .48, 2.) * 9.);
  float cap = (1. - smoothstep(-.85, -.1, q)) * (1. - smoothstep(.08, .32, phase));
  if (textureGlyphMode > .5) {
    float core = exp(-pow(length(point - textureOrigin) / max(1., textureFocus * 2.8), 2.));
    cap += core * .38 * (1. - smoothstep(.1, .98, phase));
  }
  if (textureBloom > .5) {
    float ring = smoothstep(.42, .78, phase);
    float radialDistance = length(point - textureOrigin);
    float focusRadius = max(wave.y * .8, wave.z + wave.y * .65);
    float core = exp(-pow(radialDistance / focusRadius, 2.) * 1.35);
    crest *= ring;
    fringe *= ring;
    face *= mix(.3, 1., ring);
    cap = core * (1. - smoothstep(.35, .85, phase));
  }
  float energy = (1. - phase * .35) * (1. - dispersal) / sqrt(spread);
  float alpha = min(.96, (crest * .83 + face * .32 + halo * .075 + fringe * .16 + cap * .88) * energy);
  vec3 warm = mix(vec3(1., .69, .43), vec3(1., .99, .97), clamp(crest + face + cap, 0., 1.));
  if (textureBloom > .5) return vec4(warm * alpha, alpha) * smoothstep(0., .12, phase) * textureStrength;
  return mix(textureGatherLight(point, 1.), vec4(warm * alpha, alpha), textureHandoff()) * textureStrength;
}
`;

export const TEXTURE_LIGHT = `
precision highp float;
${TEXTURE_WAVE}
${TEXTURE_SPREAD_LIGHT}
void main() {
  vec2 point = texturePoint();
  gl_FragColor = textureStage < .5
    ? textureGatherLight(point, textureMotion.x) * textureStrength
    : textureSpreadLight(point);
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
  float chromatic = textureChromatic(point);
  vec2 delta = ray / max(1., length(ray)) * (textureDefocus(point) * (1. - chromatic * .5) + chromatic * 2.);
  gl_FragColor = textureComposite(readSurface(displaced), readSurface(displaced - delta),
    readSurface(displaced + delta), chromatic) * textureVisibility(point);
}
`;
